## Exploration: dynamic-grid-columns

### Current State
- `BuilderCanvas` y `DashboardViewer` están acoplados a un grid fijo de **4 columnas**.
- El layout persistido guarda `x`, `y`, `w`, `h`, pero hoy el grid usa **solo `w` y `h`**; `x/y` no participan en el render ni en el auto-placement.
- El builder resuelve resize con medidas aproximadas (`CELL_WIDTH = 280`, `CELL_HEIGHT = 160`) y clamp duro a `w <= 4`, `h <= 6`.
- El viewer de Fase 2 calcula altura dinámica de fila con `ResizeObserver`, pero su cálculo de `maxRows` está parametrizado por `GRID_COLS = 4`.
- No existe `openspec/config.yaml`; este repo viene usando la convención liviana `openspec/changes/<change>/explore.md`.

### Affected Areas
- `hmi-app/src/components/admin/BuilderCanvas.tsx` — grid fijo, spans hardcodeados y resize atado a 4 columnas.
- `hmi-app/src/components/viewer/DashboardViewer.tsx` — grid fijo, cálculo de `maxRows` y row height atados a 4 columnas.
- `hmi-app/src/domain/admin.types.ts` — el modelo no guarda `cols`, `gridVersion` ni semántica de “full width”.
- `hmi-app/src/pages/Dashboard.tsx` — define la cadena de altura del viewer y el contenedor que recibe el grid.
- `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` — pasa `layout`/callbacks al canvas; no define columnas, pero depende del resize actual.
- `hmi-app/src/components/admin/AdminWorkspaceLayout.tsx` — el ancho del canvas se obtiene por CSS (`minmax(0,1fr)`), no por medición explícita.
- `hmi-app/src/mocks/admin.mock.ts` — muestra layouts existentes del repo; no hay ejemplos `w = 4`.

### Findings by File

#### 1. `hmi-app/src/components/admin/BuilderCanvas.tsx`
- El grid se crea con `className="grid grid-cols-4 gap-6 auto-rows-[140px]"`.
- El resize usa:
  - `CELL_WIDTH = 280`
  - `CELL_HEIGHT = 160`
  - `newW = Math.max(1, Math.min(newW, 4))`
  - `newH = Math.max(1, Math.min(newH, 6))`
- `CELL_WIDTH` se usa para convertir `deltaX` del puntero en columnas; `CELL_HEIGHT` hace lo mismo para filas.
- Los widgets no usan `item.x`/`item.y`. La ubicación depende del **orden del array `layout`** y del auto-placement de CSS Grid.
- El span horizontal está hardcodeado con un mapeo manual `1..4` → `col-span-1..4`.
- El span vertical está hardcodeado con un array `row-span-1..6`.
- El empty state usa `col-span-4`, otro acople directo a 4 columnas.
- Ancho disponible del canvas:
  - `AdminWorkspaceLayout` deja la tercera columna como `minmax(0,1fr)`.
  - `BuilderCanvas` agrega `p-8`, así que el grid real pierde **64 px horizontales** antes de calcular celdas.
  - No hay medición JS del ancho; todo está asumido por CSS.

#### 2. `hmi-app/src/components/viewer/DashboardViewer.tsx`
- Configuración actual:
  - `const GRID_COLS = 4`
  - `className="grid grid-cols-4 gap-4 w-full"`
  - `style={{ gridAutoRows: `${rowHeight}px` }}`
- Fase 2 implementó row height dinámico así:
  - `containerRef` mide el alto disponible del contenedor con `ResizeObserver`.
  - `available = entry.contentRect.height`
  - `computed = (available - (maxRows - 1) * GAP) / maxRows`
  - `rowHeight = max(computed, MIN_ROW_H)` con `MIN_ROW_H = 60`.
- `maxRows` intenta simular auto-placement usando `colTops` de longitud `GRID_COLS`.
- Para cada widget:
  - `w = Math.min(item.w || 1, GRID_COLS)`
  - busca la mejor ventana horizontal de `w` columnas
  - acumula `h` en `colTops`
- Igual que en el builder, `x/y` no se usan.
- `col-span` está hardcodeado a `1..4`; `row-span` a `1..6`.
- **Hallazgo importante**: el comentario dice “dense packing”, pero el grid no usa `grid-flow-dense`. O sea, el cálculo de `maxRows` NO coincide exactamente con el comportamiento CSS actual cuando hay huecos.
- Para soportar N columnas hay que cambiar, como mínimo:
  - `GRID_COLS` → valor medido/calculado
  - el algoritmo de `maxRows` para recibir `cols`
  - el `grid-template-columns`
  - los spans horizontales para que no dependan de clases Tailwind fijas

#### 3. `hmi-app/src/domain/admin.types.ts`
- `WidgetLayout` es:

```ts
export interface WidgetLayout {
    widgetId: string;
    x: number;
    y: number;
    w: number;
    h: number;
}
```

- No hay constantes de grid, ni `cols`, ni `minColWidth`, ni `gridVersion`.
- `Dashboard` guarda `layout`, `widgets`, `headerConfig`, `publishedSnapshot`, etc., pero **no guarda configuración de columnas**.
- `PublishedSnapshot` tampoco guarda `cols`.

#### 4. `hmi-app/src/pages/Dashboard.tsx`
- El viewer vive dentro de una cadena de altura bien definida:
  - `MainLayout`: `h-screen`
  - `main`: `flex-1 overflow-y-auto ...`
  - `Dashboard`: `flex flex-col h-full overflow-hidden`
  - grid wrapper: `flex-1 ... overflow-hidden`
  - `DashboardViewer`: `w-full h-full p-4 overflow-hidden`
- Esto explica por qué Fase 2 pudo medir altura disponible correctamente: el contenedor del viewer efectivamente recibe un alto cerrado.
- En ancho, no hay max-width ni medición explícita: ocupa todo el espacio restante del layout público.

#### 5. `hmi-app/src/pages/admin/DashboardBuilderPage.tsx`
- Pasa `draft.layout` y `draft.widgets` directo a `BuilderCanvas`.
- `onResize` actualiza solo `w/h` del `WidgetLayout`.
- `onReorder` reordena el array `layout`; eso impacta la posición visual porque el render depende del orden.
- No encontré una suposición directa de “4 columnas” en esta página, salvo dependencia indirecta del resize actual en `BuilderCanvas`.
- Hallazgo relevante: helpers como `buildGridLayoutForWidget` y `handleDuplicateWidget` siguen manipulando `x/y`, pero el canvas actual no los usa para posicionar.

#### 6. `hmi-app/src/components/admin/AdminWorkspaceLayout.tsx`
- La estructura principal es:

```tsx
grid-cols-[var(--admin-workspace-rail-width)_var(--admin-workspace-panel-width)_minmax(0,1fr)]
```

- Defaults:
  - rail = `52px`
  - side panel = `280px`
  - main = resto del ancho
- El main area del builder **no se mide**; simplemente hereda el ancho restante por CSS.
- Entonces, el canvas disponible es aproximadamente:
  - viewport admin
  - menos rail (`52px`)
  - menos side panel (`280px`)
  - menos bordes de columnas
  - menos padding interno del contenido (`px-8` del header preview y `p-8` del canvas)

#### 7. `hmi-app/src/mocks/admin.mock.ts`
- Los mocks del repo usan `w: 1` solamente.
- No hay ejemplos `w: 4` en los mocks versionados.
- O sea: **en el repo actual no hay evidencia de layouts full-width persistidos**.
- Pero `DashboardStorageService` persiste en `localStorage`, así que usuarios locales sí podrían tener dashboards viejos con `w = 4`.

### Other Hardcoded 4-column Couplings
- `BuilderCanvas.tsx`
  - `grid-cols-4`
  - clamp `Math.min(newW, 4)`
  - `col-span-4`
  - empty state `col-span-4`
- `DashboardViewer.tsx`
  - `GRID_COLS = 4`
  - `grid-cols-4`
  - `col-span-4`
- No encontré otros hardcodes de “4 columnas” dentro del flujo dashboard builder/viewer.
- Hay otros `grid-cols-4` en páginas públicas (`EquipmentDetail`, `TrendsPage`), pero son independientes de este sistema.

### Approaches
1. **Responsive columns only (sin metadata nueva)** — calcular `cols` desde el ancho medido del contenedor y tratar `w` como span literal.
   - Pros: cambio simple, bajo impacto de modelo, cumple el objetivo de “más widgets horizontales”.
   - Cons: layouts legacy con `w = 4` dejan de significar “full width”; no resuelve la ambigüedad histórica.
   - Effort: Medium

2. **Responsive columns + metadata de migración mínima** — calcular `cols` desde el ancho, pero introducir un `gridVersion`/`layoutVersion` para distinguir dashboards legacy de 4 columnas y tratar `w = 4` legacy como caso especial de ancho completo durante migración.
   - Pros: mantiene la UI responsive y resuelve el único caso ambiguo real del modelo actual.
   - Cons: agrega una pequeña migración de storage/tipos.
   - Effort: Medium

3. **Column count almacenado por dashboard** — guardar `cols` en `Dashboard` y usarlo tanto en builder como en viewer.
   - Pros: preserva exactamente la composición diseñada por dashboard.
   - Cons: contradice el objetivo principal (adaptarse al ancho disponible), complica preview/viewer y obliga a decidir qué pasa cuando cambia el viewport.
   - Effort: Medium/High

### Answers to Key Questions

#### 1. ¿Qué pasa con layouts existentes donde `w = 4` significa full width?
- En el repo versionado: no hay ejemplos `w = 4`.
- En datos persistidos de usuarios (localStorage): puede pasar.
- Si se cambia a N columnas sin migración, `w = 4` pasa a significar “span 4”, NO “full width”.
- **Conclusión**: no hace falta migración para los mocks del repo, pero sí conviene una **migración mínima para dashboards legacy reales** si querés preservar el significado de full width.
- La ambigüedad afecta principalmente a `w = 4`; `w = 1..3` pueden mantenerse literales si el objetivo es ganar densidad horizontal.

#### 2. ¿Conviene guardar column count por dashboard o calcularlo siempre desde viewport?
- Recomiendo **calcularlo siempre desde el ancho real del contenedor**.
- Guardar `cols` por dashboard rigidiza el layout y va contra el objetivo de aprovechar pantallas más anchas.
- Lo único que sí conviene guardar, si se quiere compatibilidad fuerte, es una metadata de versión (`gridVersion`) para migración legacy.

#### 3. ¿Qué mínimo de ancho de columna conviene usar?
- Recomiendo arrancar con **`MIN_COL_WIDTH = 220px`** y revisar visualmente widgets complejos.
- Tradeoff:
  - `200px` → más columnas, pero widgets 1x1 pueden quedar apretados.
  - `240px` → más cómodo, pero reduce bastante la ganancia horizontal.
- Con `220px`, widgets `w=2` mantienen ~440px mínimos, que sigue siendo razonable para charts/cards medianos.
- Fórmula sugerida:

```ts
cols = clamp(
  Math.floor((availableWidth + gap) / (MIN_COL_WIDTH + gap)),
  1,
  MAX_COLS,
)
```

- También conviene fijar `MAX_COLS` (por ejemplo `8`) para evitar densidad absurda en ultrawide.

#### 4. ¿Cómo debe cambiar la lógica de resize del builder?
- Dejar de usar `CELL_WIDTH = 280` hardcodeado.
- Medir el ancho real del grid con `ResizeObserver`.
- Calcular `cellWidth` desde `availableWidth`, `cols` y `gap` reales.
- Clamp horizontal debe pasar de `1..4` a `1..cols`.
- Idealmente, render y resize deberían compartir un helper tipo `resolveGridMetrics({ width, gap, minColWidth })` para evitar drift entre builder y viewer.

#### 5. ¿Hay otros archivos que hardcodeen “4 columnas”?
- Sí, pero dentro del sistema dashboard solamente los relevantes son:
  - `hmi-app/src/components/admin/BuilderCanvas.tsx`
  - `hmi-app/src/components/viewer/DashboardViewer.tsx`
- Fuera de ese flujo hay `grid-cols-4` en otras páginas (`EquipmentDetail`, `TrendsPage`) que no participan del builder/viewer del dashboard.

### Recommendation
Tomar **Approach 2**: columnas responsive calculadas desde el ancho medido + una compatibilidad legacy mínima.

Implementación recomendada para la próxima fase:
- Crear un helper/hook compartido para calcular:
  - `cols`
  - `cellWidth`
  - `gap`
- Medir ancho del contenedor en builder y viewer con `ResizeObserver`.
- Reemplazar clases `grid-cols-4` por estilo inline:

```tsx
style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
```

- Reemplazar `col-span-*` fijos por:

```tsx
style={{ gridColumn: `span ${spanW} / span ${spanW}` }}
```

- Hacer lo mismo con el empty state usando `gridColumn: '1 / -1'`.
- Parametrizar `maxRows` con `cols` y revisar su algoritmo para que coincida con el comportamiento real del grid.
- Agregar metadata de migración (`gridVersion` o similar) solo para dashboards legacy; no guardar `cols` como configuración normal del dashboard.

### Risks
- Dashboards legacy en `localStorage` con `w = 4` pueden romper su semántica de full width si no hay migración.
- Tailwind no resuelve bien `grid-cols-${cols}` / `col-span-${span}` dinámicos en runtime; esto empuja a inline styles o clases safelisteadas.
- El cálculo actual de `maxRows` asume dense packing, pero el CSS grid real no usa `grid-flow-dense`; si eso no se corrige, el row height puede desalinearse en layouts complejos.
- Como `x/y` hoy están ignorados, cualquier expectativa futura de posicionamiento explícito sigue sin resolverse con este cambio.

### Ready for Proposal
Yes — listo para `sdd-propose`.
