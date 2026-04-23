## Exploration: node-red-binding

### Current State
El código ya tiene una base clara para bindings semánticos, pero TODAVÍA no existe una integración real con Node-RED ni un cliente HTTP dedicado. Hoy el sistema mezcla dos caminos de dato: (1) mocks consultados por services/query hooks para páginas generales y (2) resolución local de widgets mediante `equipmentMap` armado desde mocks dentro de `Dashboard.tsx` y `DashboardBuilderPage.tsx`.

#### 1. Widget Configuration Model
- Archivo principal: `hmi-app/src/domain/admin.types.ts`
- El modelo canónico del widget vive en `WidgetConfig` y `WidgetBinding`.
- Ya existe una noción explícita de origen de dato vía `binding.mode`.

```ts
export type BindingMode = 'real_variable' | 'simulated_value';

export interface WidgetBinding {
    mode: BindingMode;
    assetId?: string;
    variableKey?: string;
    formatter?: string;
    unit?: string;
    catalogVariableId?: string;
    lastKnownValueAllowed?: boolean;
    staleTimeout?: number;
    simulatedValue?: number | string | boolean;
}
```

```ts
interface WidgetConfigBase {
    id: string;
    title?: string;
    position: { x: number; y: number };
    size: { w: number; h: number };
    styleVariant?: string;
    binding?: WidgetBinding;
    thresholds?: ThresholdRule[];
    fallbackMode?: 'last-known' | 'empty' | 'error';
    simulatedValue?: number | string | boolean;
    hierarchyMode?: boolean;
    aggregation?: AggregationMode;
    deadbandPercent?: number;
}
```

```ts
export type WidgetConfig =
    | KpiWidgetConfig
    | MetricCardWidgetConfig
    | TrendChartWidgetConfig
    | OeeProductionTrendWidgetConfig
    | ProdHistoryWidgetConfig
    | AlertHistoryWidgetConfig
    | ConnectionStatusWidgetConfig
    | ConnectionIndicatorWidgetConfig
    | StatusWidgetConfig
    | GenericWidgetConfig;
```

- `binding.mode` YA separa “simulado” vs “variable real”.
- `variableKey` hoy es la clave efectiva para resolver una métrica dentro de `equipment.primaryMetrics`.
- `catalogVariableId` YA existe como identidad semántica canónica, pero hoy se usa sobre todo para matching jerárquico, no para buscar un valor real en una fuente externa.
- No existe campo tipo `dataSourceId`, `provider`, `endpoint`, `topic`, `nodeRedPath` o equivalente.

#### 2. Property Panel / Widget Editor
- Archivos principales:
  - `hmi-app/src/components/admin/PropertyDock.tsx`
  - `hmi-app/src/components/admin/AdminSelect.tsx`
  - `hmi-app/src/components/admin/CatalogVariableSelector.tsx`
  - `hmi-app/src/pages/admin/DashboardBuilderPage.tsx`
- El builder mantiene un `draft: Dashboard` local y pasa `selectedWidget` + callbacks a `PropertyDock`.
- La edición es controlada: cada cambio hace `onUpdateWidget({ ...selectedWidget, ... })` y el page actualiza `draft.widgets`.
- Sí, YA existe una sección **Datos**.

Patrón actual en `PropertyDock`:
- `AdminSelect` para selects custom con overlay.
- `AdminNumberInput` para números.
- `CatalogVariableSelector` para variable semántica con create/delete inline.
- Campos siempre visibles; cuando no aplican, se deshabilitan.

Orden canónico documentado en `hmi-app/src/components/admin/ADMIN_CONVENTIONS.md`:
- `Fuente → Unidad → Variable → Operación → Origen → Valor`

Fragmentos clave de la sección Datos:

```tsx
<DockFieldRow label="Fuente">
    <AdminSelect
        value={isHierarchyModeEnabled ? 'hierarchy' : 'own'}
        ...
        options={[
            { value: 'own', label: 'Usa valor propio' },
            { value: 'hierarchy', label: 'Calcula desde jerarquía' },
        ]}
    />
</DockFieldRow>
```

```tsx
<DockFieldRow label="Origen">
    <AdminSelect
        value={binding.mode}
        ...
        options={[
            { value: 'simulated_value', label: 'Simulado' },
            { value: 'real_variable', label: 'Variable Real' },
        ]}
    />
</DockFieldRow>
```

```tsx
{binding.mode === 'real_variable' && (
    <>
        <DockFieldRow label="Equipo">
            <AdminSelect value={binding.assetId || ''} ... />
        </DockFieldRow>
        <DockFieldRow label="Variable">
            <AdminSelect value={binding.variableKey || ''} ... />
        </DockFieldRow>
    </>
)}
```

Conclusión importante: el panel ya tiene una UX de binding, pero está pensada para **elegir un equipo mock + una métrica dentro de `primaryMetrics`**. Es un excelente punto de extensión para Node-RED, pero el texto/flujo actual asume “Equipo/Variable”, no “fuente externa/variable semántica”.

#### 3. Services & Adapters Layer
- Services encontrados:
  - `hmi-app/src/services/equipment.service.ts`
  - `hmi-app/src/services/alert.service.ts`
  - `hmi-app/src/services/DashboardStorageService.ts`
  - `hmi-app/src/services/HierarchyStorageService.ts`
  - `hmi-app/src/services/TemplateStorageService.ts`
  - `hmi-app/src/services/VariableCatalogStorageService.ts`
  - `hmi-app/src/services/AlertHistoryStorageService.ts`
- Adapters encontrados:
  - `hmi-app/src/adapters/equipment.adapter.ts`
  - `hmi-app/src/adapters/alert.adapter.ts`

Estado real:
- `equipment.service.ts` y `alert.service.ts` usan mocks y `setTimeout`.
- Los adapters existen como anti-corruption layer, pero los services actuales NI LOS USAN porque los mocks ya vienen tipados.
- No encontré `fetch`, `axios`, `ky`, `graphql`, wrapper HTTP, ni cliente genérico.
- No encontré ningún código de Node-RED.

Ejemplo actual:

```ts
export async function getEquipmentList(
    filters?: EquipmentListFilters
): Promise<EquipmentSummary[]> {
    await delay(MOCK_DELAY);
    let list = [...mockEquipmentList];
    ...
    return list;
}
```

```ts
export function adaptEquipmentSummary(rawSource: any): EquipmentSummary {
    return {
        id: String(rawSource.id ?? ''),
        name: String(rawSource.name ?? 'Sin nombre'),
        type: rawSource.type ?? 'unknown',
        status: rawSource.status ?? 'unknown',
        connectionState: rawSource.connectionState ?? 'unknown',
        lastUpdateAt: rawSource.lastUpdateAt ?? undefined,
        alertCount: Number(rawSource.alertCount ?? 0),
        primaryMetrics: Array.isArray(rawSource.primaryMetrics)
            ? rawSource.primaryMetrics
            : [],
    };
}
```

#### 4. Widget Value Resolution
- Archivos clave:
  - `hmi-app/src/widgets/WidgetRenderer.tsx`
  - `hmi-app/src/widgets/resolvers/bindingResolver.ts`
  - `hmi-app/src/widgets/resolvers/hierarchyResolver.ts`
  - `hmi-app/src/widgets/renderers/MetricWidget.tsx`
  - `hmi-app/src/widgets/renderers/KpiWidget.tsx`
  - `hmi-app/src/widgets/renderers/TrendChartWidget.tsx`

Patrón actual:
- `DashboardViewer`/`BuilderCanvas` renderizan `WidgetRenderer`.
- `WidgetRenderer` despacha por `widget.type`.
- Cada renderer decide si usa `resolveBinding(...)` o, para métricas jerárquicas, `resolveHierarchyBinding(...)`.

Contrato resuelto:

```ts
export interface ResolvedBinding {
    value: number | string | null;
    unit?: string;
    status: MetricStatus;
    lastUpdateAt?: string;
    connectionState?: ConnectionState;
    source: 'real' | 'simulated' | 'fallback' | 'error';
}
```

Regla actual de resolución:
- `binding.mode === 'simulated_value'` → usa `binding.simulatedValue`.
- `binding.mode === 'real_variable'` → busca `binding.assetId` en `equipmentMap`, luego busca `binding.variableKey` en `equipment.primaryMetrics`.
- Si no hay `variableKey`, cae en la primera métrica disponible.

Fragmento clave:

```ts
if (binding.mode === 'simulated_value') {
    return resolveSimulated(
        binding.simulatedValue,
        binding.unit,
        widget.thresholds,
    );
}

return resolveReal(binding, equipmentMap, widget);
```

```ts
const metric = findMetric(equipment, binding.variableKey);
```

Esto marca el principal cuello de botella para Node-RED: **el resolver real depende estructuralmente de `EquipmentSummary.primaryMetrics`**. No hay todavía un provider abstraction para “resolver valor real desde otra fuente”.

#### 5. TanStack Query Usage
- Archivos:
  - `hmi-app/src/app/providers.tsx`
  - `hmi-app/src/queries/useEquipmentList.ts`
  - `hmi-app/src/queries/useEquipmentDetail.ts`
  - `hmi-app/src/queries/useAlerts.ts`
- QueryClient global con defaults:
  - `retry: 2`
  - `refetchOnWindowFocus: false`
- Los hooks viven en `src/queries/`.
- Convención de query keys encontrada:
  - `['equipment-list', filters]`
  - `['equipment-detail', id]`
  - `['alerts', filters]`
- Convención operativa: polling con `refetchInterval` y `staleTime` explícitos por hook.

No encontré hooks query para:
- dashboards admin
- catálogo de variables
- jerarquía
- bindings/widget values
- Node-RED

O sea: TanStack Query hoy se usa SOLO en páginas de datos generales, no en la resolución del dashboard builder/viewer.

#### 6. Zustand Stores
- Store encontrado: `hmi-app/src/store/ui.store.ts`
- NO existe un store de dashboards/widgets.
- El dashboard builder maneja su estado con `useState` local en `DashboardBuilderPage.tsx`.

`ui.store.ts` guarda solo estado UI:

```ts
interface UIStore {
    isGridVisible: boolean;
    sidebarCollapsed: boolean;
    selectedPlantId: string | null;
    selectedAreaId: string | null;
    selectedEquipmentId: string | null;
    globalStatusFilter: string | null;
    isAdminMode: boolean;
}
```

Conclusión: si aparece un binding runtime de Node-RED, hoy NO hay una store central preparada para cachear valores de widgets. El lugar natural sería TanStack Query o un service/provider de lectura inyectado al resolver.

#### 7. Existing Variable / Catalog System
- Tipos y archivos:
  - `hmi-app/src/domain/variableCatalog.types.ts`
  - `hmi-app/src/services/VariableCatalogStorageService.ts`
  - `hmi-app/src/utils/catalogMigration.ts`
  - `hmi-app/src/utils/widgetCapabilities.ts`
  - `hmi-app/src/widgets/resolvers/hierarchyResolver.ts`

Tipo canónico:

```ts
export interface CatalogVariable {
    id: string;
    name: string;
    unit: string;
    description?: string;
}
```

Cómo funciona hoy:
- El catálogo vive en localStorage vía `VariableCatalogStorageService`.
- `PropertyDock` filtra variables por `binding.unit`.
- Para widgets con capability `catalogVariable`, la variable puede elegirse/crearse inline.
- `DashboardBuilderPage` valida que no se repita la misma `catalogVariableId` en un mismo dashboard.
- `migrateLegacyBindings()` migra widgets jerárquicos viejos desde `variableKey + unit` hacia `catalogVariableId`.
- `hierarchyResolver` usa `binding.catalogVariableId` para buscar widgets hijos equivalentes y agregar sus valores.

Fragmento crítico del resolver jerárquico:

```ts
const targetCatalogVariableId = widget.binding?.catalogVariableId;
...
if (childWidget.binding?.catalogVariableId !== targetCatalogVariableId) continue;
const resolved = resolveBinding(childWidget, equipmentMap);
```

Capacidades actuales:

```ts
const WIDGET_CAPABILITIES: Partial<Record<WidgetType, WidgetCapabilities>> = {
    'metric-card': { catalogVariable: true, hierarchy: true },
    'kpi': { catalogVariable: false, hierarchy: false },
    ...
};
```

Hallazgo clave: `catalogVariableId` YA es el ancla semántica correcta para integrar Node-RED, porque desacopla identidad de variable de la métrica cruda. Pero hoy el valor real sigue saliendo de `assetId + variableKey`, no de `catalogVariableId`.

### Affected Areas
- `hmi-app/src/domain/admin.types.ts` — contrato actual de widgets, bindings, dashboards y snapshots.
- `hmi-app/src/domain/variableCatalog.types.ts` — identidad semántica canónica reutilizable para bindings reales.
- `hmi-app/src/components/admin/PropertyDock.tsx` — UI actual de edición de bindings; principal punto de extensión del panel.
- `hmi-app/src/components/admin/CatalogVariableSelector.tsx` — selector reutilizable si la variable semántica pasa a ser eje central del binding real.
- `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` — carga catálogo/jerarquía/dashboards y mantiene `draft.widgets`.
- `hmi-app/src/widgets/resolvers/bindingResolver.ts` — choke point principal; hoy asume `equipmentMap`.
- `hmi-app/src/widgets/resolvers/hierarchyResolver.ts` — ya depende de `catalogVariableId`; muy relevante para mantener compatibilidad semántica.
- `hmi-app/src/widgets/WidgetRenderer.tsx` — dispatcher estable; probablemente no necesite cambios grandes.
- `hmi-app/src/pages/Dashboard.tsx` — hoy arma `equipmentMap` desde mocks y lo pasa al viewer.
- `hmi-app/src/services/equipment.service.ts` / `hmi-app/src/adapters/equipment.adapter.ts` — patrón actual para introducir una fuente externa real.
- `hmi-app/src/queries/*.ts` — referencia de convenciones si Node-RED se integra vía polling query hooks.

### Approaches
1. **Extender `bindingResolver` con provider de lectura real** — mantener `WidgetBinding` casi intacto y resolver `real_variable` vía una capa nueva que lea Node-RED usando `catalogVariableId` y/o `assetId + variableKey`.
   - Pros: respeta la arquitectura actual; toca el choke point correcto; preserva renderers.
   - Cons: exige introducir una abstracción nueva para no acoplar `bindingResolver` a HTTP/Node-RED directamente.
   - Effort: Medium

2. **Modelar Node-RED como nuevo service/query y seguir alimentando `equipmentMap`** — convertir respuestas Node-RED a `EquipmentSummary.primaryMetrics` y dejar `bindingResolver` casi igual.
   - Pros: cambio menos invasivo en renderers/resolvers; reutiliza el contrato actual.
   - Cons: fuerza a mapear Node-RED a un modelo centrado en “equipos con primaryMetrics”, que puede ser artificial; mantiene dependencia fuerte de `variableKey` textual.
   - Effort: Medium

3. **Recentrar el binding real en `catalogVariableId` como identidad primaria** — el valor real se resuelve por variable semántica y contexto, dejando `variableKey` como compat legacy.
   - Pros: mejor alineado con la arquitectura semántica y con agregación jerárquica; mejor base para múltiples fuentes reales futuras.
   - Cons: implica migración conceptual del editor y posiblemente cambios de validación/UI.
   - Effort: High

### Recommendation
Recomiendo una mezcla de **1 + 3 gradual**: introducir una capa nueva de lectura real para `bindingResolver`, pero diseñarla desde el inicio para que la identidad principal sea `catalogVariableId` y dejar `assetId + variableKey` como compatibilidad/transición. Es la opción más sana arquitectónicamente porque evita meter Node-RED en renderers, evita atar todo al shape `EquipmentSummary.primaryMetrics`, y aprovecha el sistema semántico que el proyecto YA tiene.

### Risks
- `binding.mode = 'real_variable'` hoy significa “leer desde `equipmentMap`”, no “leer desde una fuente externa configurable”; cambiar su semántica sin transición puede romper widgets existentes.
- `PropertyDock` asume el flujo `Equipo -> Variable`; si Node-RED no sigue ese modelo, la UX actual queda semánticamente engañosa.
- `hierarchyResolver` depende de `catalogVariableId`; cualquier solución nueva NO debe degradar esa identidad canónica.
- `Dashboard.tsx` y `DashboardBuilderPage.tsx` fabrican `equipmentMap` desde mocks locales; eso bypasséa services/query hooks y hoy sería un conflicto con una integración runtime real.
- No existe cliente HTTP ni política de errores/reintentos específica para Node-RED; eso hay que diseñarlo, no improvisarlo.
- Algunos widgets especiales (`status`, `connection-*`) resuelven parte del dato sin pasar por `bindingResolver`, usando `assetId` + `equipmentMap` directamente; esos caminos también hay que revisar.

### Ready for Proposal
Yes — el código ya muestra claramente dónde enchufar la integración y qué contratos están en juego. Para la propuesta siguiente conviene definir explícitamente: (1) contrato de lectura Node-RED, (2) si el binding real se resuelve por `catalogVariableId`, `variableKey`, o ambos, y (3) cómo evolucionará la UX del `PropertyDock` sin romper dashboards existentes.
