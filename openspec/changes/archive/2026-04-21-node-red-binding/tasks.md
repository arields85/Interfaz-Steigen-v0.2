# Tasks: Node-RED Binding

## Stage 1: Foundation

### [x] T1
- **Stage**: 1
- **Title**: Definir tipos Node-RED base
- **Description**: Crear tipos raw/adaptados en `hmi-app/src/domain/nodeRed.types.ts` y exportarlos donde haga falta, manteniendo `variables: NodeRedVariable[]` como contrato limpio para UI/adapters.
- **Depends on**: None
- **Test requirement**: No aplica
- **Acceptance**: Existen tipos strict para response, machine y variable sin `any`.
- **Files**: `hmi-app/src/domain/nodeRed.types.ts`, `hmi-app/src/domain/index.ts`

### [x] T2
- **Stage**: 1
- **Title**: Escribir tests RED de config y service
- **Description**: Crear tests con mocks para env/fetch de `getNodeRedBaseUrl`, `isNodeRedEnabled` y `fetchNodeRedOverview`, verificando URL configurada, GET-only, error tipado y sin hostname hardcodeado.
- **Depends on**: T1
- **Test requirement**: `nodeRed.config` y `nodeRedOverview.service` primero en rojo.
- **Acceptance**: Los tests fallan antes de implementar y cubren endpoint, disabled mode y errores.
- **Files**: `hmi-app/src/config/nodeRed.config.test.ts`, `hmi-app/src/services/nodeRedOverview.service.test.ts`

### [x] T3
- **Stage**: 1
- **Title**: Implementar config y service Node-RED
- **Description**: Implementar lectura de `VITE_NODE_RED_BASE_URL`, defaults de polling y servicio HTTP GET `/api/hmi/overview` con error propio reutilizable por query.
- **Depends on**: T2
- **Test requirement**: Hacer pasar T2 sin relajar tipado.
- **Acceptance**: Service usa solo GET, centraliza env en config y pasa tests.
- **Files**: `hmi-app/src/config/nodeRed.config.ts`, `hmi-app/src/services/nodeRedOverview.service.ts`

### [x] T4
- **Stage**: 1
- **Title**: Escribir tests RED del adapter
- **Description**: Crear tests puros para adaptación raw → dominio: filtrar máquinas inválidas, aplanar `values` a `variables`, conservar unit/timestamp/quality y tolerar `values` vacíos.
- **Depends on**: T1
- **Test requirement**: Adapter tests antes de la implementación.
- **Acceptance**: Los tests documentan que PropertyDock consumirá `machine.variables`, no `Object.keys(values)`.
- **Files**: `hmi-app/src/adapters/nodeRedOverview.adapter.test.ts`

### [x] T5
- **Stage**: 1
- **Title**: Implementar adapter Node-RED
- **Description**: Implementar `adaptNodeRedOverview` devolviendo tipos limpios y estables para query/UI, sin lógica de presentación ni fallback ad-hoc.
- **Depends on**: T4
- **Test requirement**: Hacer pasar T4.
- **Acceptance**: Adapter devuelve `NodeRedMachine[]` con `variables: NodeRedVariable[]` y cobertura del caso vacío.
- **Files**: `hmi-app/src/adapters/nodeRedOverview.adapter.ts`

## Stage 2: Data Pipeline

### T6
- **Stage**: 2
- **Title**: Crear hook único `useNodeRedOverview`
- **Description**: Implementar query TanStack `['node-red','overview']` usando service+adapter, `enabled` por config y polling configurable; será la única fuente consumida por `Dashboard.tsx` y `DashboardBuilderPage.tsx`.
- **Depends on**: T3, T5
- **Test requirement**: Opcional; priorizar tipado estricto y defaults seguros.
- **Acceptance**: El hook retorna `machines`, flags de carga/error y evita fetches duplicados por hooks paralelos distintos.
- **Files**: `hmi-app/src/queries/useNodeRedOverview.ts`

### T7
- **Stage**: 2
- **Title**: Extender `WidgetBinding` sin romper legado
- **Description**: Agregar `machineId?: number` y `bindingVersion?: 'node-red-v1'` en `WidgetBinding`, preservando `assetId` para dashboards legacy y serialización existente.
- **Depends on**: T1
- **Test requirement**: No aplica
- **Acceptance**: El tipo acepta bindings legacy y Node-RED en el mismo dashboard.
- **Files**: `hmi-app/src/domain/admin.types.ts`

## Stage 3: Admin UI

### T8
- **Stage**: 3
- **Title**: Escribir tests RED de PropertyDock
- **Description**: Cubrir con RTL que `PropertyDock` recibe `nodeRedMachines`, lista máquinas/variables por dominio adaptado, resetea `variableKey` al cambiar de máquina y persiste `bindingVersion: 'node-red-v1'`.
- **Depends on**: T5, T7
- **Test requirement**: Tests antes del cambio UI.
- **Acceptance**: Los tests fallan sin la nueva UI y cubren loading/error/empty state básico.
- **Files**: `hmi-app/src/components/admin/PropertyDock.test.tsx`

### T9
- **Stage**: 3
- **Title**: Implementar selects Node-RED en PropertyDock
- **Description**: Reemplazar el flujo `equipmentMap` para `real_variable` por props `nodeRedMachines/nodeRedLoading/nodeRedError`, usando `machine.variables` para el selector y guardando `machineId + variableKey + bindingVersion`.
- **Depends on**: T6, T7, T8
- **Test requirement**: Hacer pasar T8.
- **Acceptance**: No usa `Object.keys(values)`; limpiar variable inválida al cambiar máquina; simulated mode sigue intacto.
- **Files**: `hmi-app/src/components/admin/PropertyDock.tsx`, `hmi-app/src/pages/admin/DashboardBuilderPage.tsx`

## Stage 4: Runtime Resolution

### T10
- **Stage**: 4
- **Title**: Escribir tests RED del resolver backward-compatible
- **Description**: Crear tests para `resolveBinding(widget, equipmentMap, nodeRedMachines?)` cubriendo ruta Node-RED, fallback `--` por machine/key faltante y 100% compatibilidad cuando no se pasa el tercer parámetro.
- **Depends on**: T5, T7
- **Test requirement**: Resolver tests antes de modificar el resolver.
- **Acceptance**: Los tests prueban que ningún call site legacy necesita cambios obligatorios.
- **Files**: `hmi-app/src/widgets/resolvers/bindingResolver.test.ts`

### T11
- **Stage**: 4
- **Title**: Implementar resolución Node-RED y wiring de páginas
- **Description**: Actualizar `bindingResolver` con tercer parámetro opcional y propagar `nodeRedMachines` solo donde haga falta en resolver call sites/renderers; integrar `useNodeRedOverview` en `Dashboard.tsx` y `DashboardBuilderPage.tsx` como fuente única para viewer y builder preview.
- **Depends on**: T6, T9, T10
- **Test requirement**: Hacer pasar T10 y ajustar tests impactados por nuevas props opcionales.
- **Acceptance**: Call sites actuales siguen compilando; Node-RED resuelve valores en runtime y el camino legacy queda intacto.
- **Files**: `hmi-app/src/widgets/resolvers/bindingResolver.ts`, `hmi-app/src/widgets/resolvers/alertHistoryEvaluator.ts`, `hmi-app/src/widgets/resolvers/hierarchyResolver.ts`, `hmi-app/src/widgets/renderers/KpiWidget.tsx`, `hmi-app/src/widgets/renderers/MetricWidget.tsx`, `hmi-app/src/widgets/renderers/TrendChartWidget.tsx`, `hmi-app/src/widgets/WidgetRenderer.tsx`, `hmi-app/src/components/viewer/DashboardViewer.tsx`, `hmi-app/src/components/admin/BuilderCanvas.tsx`, `hmi-app/src/pages/Dashboard.tsx`, `hmi-app/src/pages/admin/DashboardBuilderPage.tsx`

## Stage 5: Polish

### [x] T12
- **Stage**: 5
- **Title**: Documentar env, cerrar edge cases y verificar
- **Description**: Documentar `VITE_NODE_RED_BASE_URL`, revisar estados “no configurado / sin máquinas / variable removida / upstream caído” y ejecutar verificación final.
- **Depends on**: T11
- **Test requirement**: Correr suite relevante + typecheck final.
- **Acceptance**: `.env.example` actualizado; fallback visible es `--`; `npm run test` y `npx tsc -b` quedan verdes.
- **Files**: `.env.example`, `hmi-app/src/components/admin/PropertyDock.tsx`, `hmi-app/src/pages/Dashboard.tsx`, `hmi-app/src/pages/admin/DashboardBuilderPage.tsx`
