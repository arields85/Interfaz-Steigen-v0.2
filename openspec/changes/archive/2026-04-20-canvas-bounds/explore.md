# Exploration: canvas-bounds

## TL;DR
- La base actual NO tiene un canvas acotado: el viewer usa grid responsive por ancho + altura de fila dinámica, mientras el builder usa las mismas columnas por referencia de viewport pero con `gap` distinto y `auto-rows-[140px]`, así que hoy NO hay WYSIWYG real (`hmi-app/src/utils/gridConfig.ts:10-75`, `hmi-app/src/utils/useGridCols.ts:32-65`, `hmi-app/src/components/viewer/DashboardViewer.tsx:58-130`, `hmi-app/src/components/admin/BuilderCanvas.tsx:156-244`).
- `WidgetLayout.x`/`y` existen en dominio pero el render actual no los usa; la ubicación real surge del orden del array + `w/h`. Eso cambia completamente cómo introducir “bounds”, “clamp” y “logical coordinates” (`hmi-app/src/components/viewer/DashboardViewer.tsx:67-100`, `hmi-app/src/pages/admin/DashboardBuilderPage.tsx:1045-1057`).
- `gridVersion` ya existe en dominio, pero está a medio cablear: se guarda hardcodeado como `2` al guardar draft, el snapshot publicado no preserva `gridVersion`, el viewer ni siquiera recibe/pasa ese dato, y la supuesta migración legacy con `migrateLayoutWidth()` NO se usa (`hmi-app/src/domain/admin.types.ts:80-90,103-133`, `hmi-app/src/pages/admin/DashboardBuilderPage.tsx:931-1023`, `hmi-app/src/services/DashboardStorageService.ts:250-267`, `hmi-app/src/pages/Dashboard.tsx:91-100,159-165`, `hmi-app/src/utils/gridConfig.ts:50-52`).
- El mejor punto para el hard reset/cleanup es bootstrap de app (`hmi-app/src/main.tsx:1-23`), no dentro de un componente. OJO: `TemplateStorageService` sí persiste `layoutPreset` con coordenadas/sizes y `VariableCatalogStorageService` hardcodea la key actual de dashboards, así que el bump toca más de un servicio (`hmi-app/src/services/TemplateStorageService.ts:113-141`, `hmi-app/src/services/VariableCatalogStorageService.ts:4-5,121-139`).
- No hay persistencia Zustand hoy. El toggle de grid entra limpio en `ui.store.ts` con `zustand/middleware/persist`, y el botón encaja mejor en `contextBarPanel` junto a “Volver” que en el header principal del canvas (`hmi-app/src/store/ui.store.ts:1-58`, `hmi-app/src/pages/admin/DashboardBuilderPage.tsx:207-216,1222-1229`, `hmi-app/src/components/admin/AdminContextBar.tsx:19-34`).

## 1. Current grid architecture (baseline)

### `hmi-app/src/utils/gridConfig.ts`
- Constantes actuales:
  - `MIN_COL_WIDTH = 220` (`gridConfig.ts:10`)
  - `MAX_COLS = 8` (`gridConfig.ts:11`)
  - `MIN_COLS = 1` (`gridConfig.ts:12`)
  - `VIEWER_GAP = 16` (`gridConfig.ts:13`)
  - `BUILDER_GAP = 24` (`gridConfig.ts:14`)
  - `LEGACY_COLS = 4` (`gridConfig.ts:15`)
- **No existe** `CURRENT_GRID_VERSION` en el código actual.
- Funciones puras actuales:
  - `computeGridCols(containerWidth, gap)` → `floor((containerWidth + gap) / (MIN_COL_WIDTH + gap))`, clamp `[MIN_COLS, MAX_COLS]` (`gridConfig.ts:17-24`).
  - `getGridTemplateStyle(cols)` → `gridTemplateColumns: repeat(cols, minmax(0, 1fr))` (`gridConfig.ts:26-31`).
  - `getWidgetSpanStyle(w, h, cols)` → clamp de `w` a `[1, cols]` y `h` a `[1, 6]` (`gridConfig.ts:33-44`).
  - `migrateLayoutWidth(w, fromCols, toCols)` existe pero NO se consume en ningún lado (`gridConfig.ts:46-52`).
  - `computeCellWidth(containerWidth, cols, gap)` (`gridConfig.ts:54-60`).
  - `computeViewerReferenceWidth()` → `window.innerWidth - mainPadding`, con padding asumido fijo: `48` desktop / `32` mobile (`gridConfig.ts:62-75`).

### `hmi-app/src/utils/useGridCols.ts`
- Devuelve `{ containerRef, cols, containerWidth }` (`useGridCols.ts:16-20`).
- Modo normal: observa `containerRef.current` con `ResizeObserver`, lee `entry.contentRect.width`, actualiza `containerWidth` y `cols` con `computeGridCols(width, gap)` (`useGridCols.ts:49-61`).
- Modo `useViewerReference = true`: ignora el ancho real del contenedor, usa `computeViewerReferenceWidth()` en `window.resize`, y SIEMPRE calcula columnas con `VIEWER_GAP` para matchear el viewer (`useGridCols.ts:37-47`).

### `DashboardViewer.tsx`
- Consume `useGridCols(VIEWER_GAP)` sobre el contenedor real (`DashboardViewer.tsx:58-60`).
- Calcula `maxRows` con una simulación de auto-placement “dense” basada SOLO en `layout[]` order + `w/h`; `x/y` no participan (`DashboardViewer.tsx:67-100`).
- Luego observa altura del mismo contenedor con otro `ResizeObserver` y calcula `rowHeight = (available - gaps) / maxRows`, mínimo `60px` (`DashboardViewer.tsx:102-121`).
- Render final: grid `gap-4`, `gridAutoRows: rowHeight`, y cada widget usa `getWidgetSpanStyle(effectiveW, h, cols)` (`DashboardViewer.tsx:124-161`).
- La prop `gridVersion` existe en la interfaz pero NO se usa en la implementación (`DashboardViewer.tsx:15-32,50-56`).

### `BuilderCanvas.tsx`
- Consume `useGridCols(BUILDER_GAP, true)`, o sea: columnas del viewer por referencia de viewport, no del canvas admin real (`BuilderCanvas.tsx:156-158`).
- Pero el `cellWidth` para resize se calcula con `computeCellWidth(containerWidth, cols, BUILDER_GAP)` (`BuilderCanvas.tsx:160-164`). Resultado: misma cantidad de columnas que viewer, pero métrica horizontal distinta porque el builder usa `gap-6` y el viewer `gap-4`.
- Grid actual: `className="grid gap-6 auto-rows-[140px]"`, ancho explícito al `containerWidth` de referencia (`BuilderCanvas.tsx:232-243`).
- `getWidgetSpanStyle()` decide spans; otra vez `x/y` no se usan (`BuilderCanvas.tsx:257-263`).
- Drag = reordenamiento HTML5 por índice (`dragstart/dragenter/drop`), no posicionamiento espacial (`BuilderCanvas.tsx:179-230`).
- Resize = pointer events custom; actualiza layout EN VIVO en cada `pointermove` (`BuilderCanvas.tsx:66-133`).

### `DashboardBuilderPage.tsx`
- Guarda/publíca vía `prepareDashboardForSave()` + `dashboardStorage.saveDashboard()` + `dashboardStorage.publishDashboard()` (`DashboardBuilderPage.tsx:381-445,931-1023`).
- `prepareDashboardForSave()` fuerza `gridVersion: 2` en la working copy (`DashboardBuilderPage.tsx:969`).
- `handleResizeLayout()` persiste `w/h` directo en `draft.layout`; `handleReorderLayout()` solo reordena el array (`DashboardBuilderPage.tsx:1035-1057`).
- No hay persistencia/cálculo de bounds; el builder actual trabaja con layout fluido, no con canvas lógico.

## 2. Height / usable area

- **Topbar viewer**: no se mide en runtime. `MainLayout` renderiza `<Topbar />` + `<main className="... p-4 pb-20 md:p-6 md:pb-6">` (`hmi-app/src/layouts/MainLayout.tsx:6-10`).
- El `Topbar` viewer usa clases Tailwind fijas (`px-6 lg:px-10 py-4 sticky top-0 z-50`) y NO expone ref/medición (`hmi-app/src/components/layout/Topbar.tsx:37-83`).
- `computeViewerReferenceWidth()` solo contempla padding horizontal de `MainLayout`; no contempla altura de topbar, header ni paddings verticales (`gridConfig.ts:62-75`).
- **Header viewer**: `DashboardHeader` tiene altura variable. No hay `h-*` fijo; depende de título, subtítulo y widgets de header (`hmi-app/src/components/viewer/DashboardHeader.tsx:199-262`).
- En `Dashboard.tsx` el viewer agrega otra capa: wrapper `flex flex-col h-full space-y-4 px-2 overflow-hidden`, luego `DashboardHeader`, luego contenedor del grid (`hmi-app/src/pages/Dashboard.tsx:147-166`). Eso agrega separación vertical y padding horizontal adicionales que hoy NO se miden.
- **AdminLayout**: topbar admin fija `h-14` (`hmi-app/src/layouts/AdminLayout.tsx:22-23`).
- **AdminContextBar**: barra contextual fija `h-12 min-h-12` (`hmi-app/src/components/admin/AdminContextBar.tsx:19-24`).
- **Builder content**: preview header con `px-8 pb-4 pt-6` + borde inferior (`DashboardBuilderPage.tsx:1161-1192`), y canvas con `p-8 overflow-x-auto` (`BuilderCanvas.tsx:234`).
- **Primitiva existente de usable viewport area**: NO existe. Solo existe una primitiva parcial de ancho (`computeViewerReferenceWidth()`), no de área útil completa.

## 3. Widget / dashboard domain

### Shape actual
- `Dashboard` actual: `id`, `name`, `description?`, `dashboardType`, `layout`, `widgets`, `lastUpdateAt?`, `ownerNodeId?`, `templateId?`, `isTemplate`, `version`, `status`, `headerConfig?`, `gridVersion?`, `publishedSnapshot?` (`hmi-app/src/domain/admin.types.ts:103-133`).
- `PublishedSnapshot`: `widgets`, `layout`, `headerConfig?`, `publishedAt`, `gridVersion?` (`admin.types.ts:80-90`).
- `WidgetLayout`: `widgetId`, `x`, `y`, `w`, `h` (`admin.types.ts:135-141`).
- `WidgetConfigBase`: además tiene `position { x, y }` y `size { w, h }` (`admin.types.ts:435-469`). O sea: hoy hay duplicación conceptual entre `widget.size` y `layout.w/h`.

### Qué haría falta agregar
- En `Dashboard`: `aspect: '16:9' | '21:9' | '4:3'` y `rows: number` (o `maxRows`, pero si el valor es persistido y editable por dashboard, conviene un nombre de dominio directo como `rows`) para no esconder intención.
- En `PublishedSnapshot`: replicar `aspect` y `rows`, igual que hoy se replica `layout/headerConfig`, porque el viewer consume snapshot congelado.
- Si querés que “crear desde template” conserve estas preferencias, `Template` también debería extenderse con algo como `aspect?` y `rows?`; si no, los dashboards creados desde template caerán al default aunque el layout haya sido diseñado para otro canvas (`admin.types.ts:567-576`, `DashboardStorageService.ts:199-243`, `TemplateStorageService.ts:113-141`).

### Validación actual
- No hay schema validator central (`zod`, etc.) para dashboard/layout.
- La única validación relevante hoy vive en `prepareDashboardForSave()` y está enfocada en catálogo/hierarchy, NO en bounds, rows, aspect ni grid (`DashboardBuilderPage.tsx:931-1023`).
- Tampoco hay validación de `WidgetLayout` en servicios. `saveDashboard()` persiste lo que recibe (`DashboardStorageService.ts:95-109`).

## 4. Storage

### `DashboardStorageService.ts`
- Key actual: `steigen_hmi_dashboards_v2` (`DashboardStorageService.ts:4-6`).
- `initStorage()` seed con mocks si no hay data y además hace migraciones puntuales de widget type + snapshot faltante (`DashboardStorageService.ts:18-75`).
- `saveDashboard()` hace upsert simple y pisa el array (`DashboardStorageService.ts:95-109`).
- `publishDashboard()` congela `widgets/layout/headerConfig` pero NO copia `gridVersion` al snapshot pese a que el tipo lo prevé (`DashboardStorageService.ts:250-267`).
- `discardChanges()` restaura `widgets/layout/headerConfig`; tampoco restaura `gridVersion` (`DashboardStorageService.ts:269-287`).

### Otros storages
- `TemplateStorageService` NO guarda dashboards publicados, pero SÍ guarda `layoutPreset` con `x/y/w/h` y `widgetPresets` con `size` (`TemplateStorageService.ts:113-141`). Si el cambio invalida supuestos de grid, este storage entra en la discusión del hard reset.
- `HierarchyStorageService` solo persiste nodos y `linkedDashboardId`; no guarda coordenadas ni grid assumptions (`HierarchyStorageService.ts:1-124`).
- `VariableCatalogStorageService` no guarda coordenadas, PERO hardcodea `DASHBOARDS_STORAGE_KEY = 'steigen_hmi_dashboards_v2'` para analizar dashboards afectados (`VariableCatalogStorageService.ts:4-5,121-139`). Si bumpás dashboards, esta constante también debe cambiar.

### Bootstrap / cleanup location
- Bootstrap real de la app: `hmi-app/src/main.tsx` (`main.tsx:1-23`).
- También podría vivir en un pequeño bootstrap module importado desde `main.tsx` o `App.tsx`, pero `main.tsx` es el punto más limpio para una limpieza one-shot antes de que las pantallas pidan servicios.
- No hay un bootstrap central hoy para storages; cada service hace lazy init en `readStorage()`. Si la limpieza se deja dentro de un servicio, puede ejecutarse demasiado tarde o de forma parcial.

## 5. Resize / drag mechanics

- No hay `@dnd-kit`. Todo es custom.
- Reordenamiento de widgets del grid: HTML5 drag-and-drop por índice (`BuilderCanvas.tsx:179-230`).
- Resize: pointer events custom en `ResizeHandle` (`BuilderCanvas.tsx:66-133`).
- Clamp actual durante resize:
  - `newW = clamp(startW + round(deltaX / cellWidth), 1, maxCols)` (`BuilderCanvas.tsx:100-104`)
  - `newH = clamp(startH + round(deltaY / 160), 1, 6)` (`BuilderCanvas.tsx:100-105`)
  - además `getWidgetSpanStyle()` vuelve a clamppear `h` a `6` y `w` a `cols` (`gridConfig.ts:37-44`).
- O sea: hoy el sistema NO permite overflow visual durante interacción; clamp inmediato + persistencia inmediata en `draft`.
- Para introducir “allow visual overflow, clamp on release” hay que separar:
  1. estado efímero visual de resize/drag,
  2. commit validado al soltar,
  3. layout persistido.
- OJO mayor: hoy NO existe drag de posición espacial, solo reorder de array. Entonces “last valid position” requiere primero definir si el cambio agrega coordenadas reales (`x/y`) o si solo aplica a resize dentro del orden actual.

## 6. Visible grid (builder)

- Hoy el builder ya tiene un fondo decorativo `bg-[url('/grid.svg')]` en el wrapper de página (`DashboardBuilderPage.tsx:1161`) y el viewer también (`Dashboard.tsx:158`). Esa grilla NO está acoplada a las celdas reales.
- Sí, un overlay CSS es viable y probablemente sea la mejor opción para esta iteración:
  - wrapper `relative`
  - overlay absoluto `pointer-events-none`
  - `background-image` con `repeating-linear-gradient()` para vertical/horizontal minor + major lines
  - inline CSS vars para `cellWidth`, `rowHeight`, `gap`, `majorEvery=2`
- Como la grilla real usa CSS Grid + `gap`, el overlay tiene que modelar **celda + gap**; si no, las líneas van a correrse. En el builder actual esto ya exige números calculados porque `cellWidth` viene de JS y `rowHeight` hoy es fijo `140`.
- Alternativa SVG/canvas overlay:
  - **Pros**: control total, fácil dibujar major/minor y letterboxing futuro.
  - **Cons**: más plumbing, resizes manuales, más complejidad para sincronizar DPR/pointer/measurements.
- Recomendación: arrancar con overlay DOM/CSS, no `<canvas>`, salvo que el diseño final del bounded canvas necesite marcas más complejas.

## 7. Toggle state

- Store actual: `hmi-app/src/store/ui.store.ts` (`ui.store.ts:1-58`).
- Hoy NO usa `zustand/middleware/persist`; tampoco hay persistencia manual en ese store.
- Sí hay patrones manuales de `localStorage` en otras pantallas (ej. `HierarchyPage`), pero para este caso el lugar limpio es agregar persist al store UI, porque es preferencia de interfaz transversal, no dato de dominio.
- Ubicación de botón:
  - “Volver” hoy vive en `backButton` (`DashboardBuilderPage.tsx:207-216`).
  - Ese nodo se pasa como `contextBarPanel` a `AdminWorkspaceLayout` (`DashboardBuilderPage.tsx:1222-1229`).
  - `AdminContextBar` renderiza `panel` en la segunda columna fija de la barra (`AdminContextBar.tsx:19-34`).
- Entonces, si la decisión es “al lado de ← Volver”, el cambio más limpio es convertir `backButton` en un contenedor con ambos controles; NO hace falta meterlo en el header de canvas ni tocar el rail principal.

## 8. Tokens + styling

- `hmi-app/src/index.css` usa `@theme {}` Tailwind v4 (`index.css:107-167`).
- Categorías presentes hoy:
  - `--color-industrial-*`
  - `--color-accent-*`
  - `--color-admin-*`
  - `--color-widget-*`
  - `--color-dynamic-*`
  - `--color-status-*`
  - `--font-*`
  - `--animate-*`
- Los nuevos tokens `--color-canvas-grid-major` / `--color-canvas-grid-minor` encajan naturalmente junto a tokens admin/canvas dentro del mismo `@theme`.
- Gotcha Tailwind v4: no hay `tailwind.config.js`; la clase utilitaria nace del token. Si el color se usa solo vía CSS inline/var, alcanza con definir la variable. Si querés utilities como `text-canvas-grid-major`, el token igual debe vivir en `@theme`.

## 9. Testing surface

### Funciones puras candidatas a TDD obligatorio
- `fitToAspect(usableW, usableH, aspect)`
- `computeCanvasReference(...)` / `computeUsableViewport(...)`
- `computeGridCols(...)` actualizado si cambia la fórmula/resolución
- `computeCanvasRowHeight(canvasHeight, rows)`
- `computeOverlayMetrics(cellW, rowH, gap, majorEvery)` si separan la matemática del overlay
- `clampLayoutToBounds(...)` o equivalente de commit-on-release
- `cleanupLegacyStorageKeys(...)` si se implementa como helper puro/testeable

### Componentes / hooks para integración
- `useGridCols` si se extiende para nueva referencia de canvas
- `BuilderCanvas`
  - render bounded canvas / letterboxing
  - overlay visible/invisible según toggle
  - resize visual overflow + clamp al soltar
- `DashboardViewer`
  - uso del mismo canvas reference/aspect/rows que builder
- `DashboardBuilderPage`
  - persistencia de toggle
  - save/publish preservando `aspect/rows/gridVersion`
- `DashboardStorageService`
  - hard reset key bump / cleanup
  - snapshot incluyendo nuevos campos

### Estado actual de tests
- No hay tests específicos hoy para grid/builder/viewer/storage de admin; solo smokes globales (`hmi-app/src/utils/__tests__/setup.test.ts`, `hmi-app/src/components/ui/__tests__/smoke.test.tsx`).

## 10. Risks, unknowns, gotchas

- **`gridVersion` ya está roto/incompleto hoy**:
  - se guarda como `2` hardcodeado (`DashboardBuilderPage.tsx:969`)
  - no existe `CURRENT_GRID_VERSION`
  - `PublishedSnapshot.gridVersion` existe pero `publishDashboard()` no lo copia (`DashboardStorageService.ts:256-263`)
  - `Dashboard.tsx` no pasa `gridVersion` al viewer (`Dashboard.tsx:159-165`)
  - `DashboardViewer` no usa la prop y la migración legacy prometida no ocurre (`DashboardViewer.tsx:27-31`, `gridConfig.ts:46-52`)
- **La resolución actual no matchea la narrativa “10x6 → 20x12”**: el código real hoy limita a `MAX_COLS = 8` y `h <= 6`. Si solo se “parte al medio `MIN_COL_WIDTH`” pero no se toca `MAX_COLS`, jamás se duplica la grilla (`gridConfig.ts:10-23,37-44`).
- **Builder/viewer no son WYSIWYG hoy** por `gap` diferente (`16` vs `24`) y altura de fila diferente (dinámica vs fija `140`). El cambio de bounded canvas tiene que atacar eso de raíz.
- **`x/y` hoy son datos muertos** para render. Si el diseño futuro realmente depende de logical coordinates, hay que decidir si el grid deja de ser auto-placement y pasa a usar positioning explícito.
- **Mobile/touch**: hoy resize usa pointer events, pero reorder/header DnD usan HTML5 drag-and-drop desktop-centric. No hay soporte touch explícito. Para esta iteración parece razonable dejarlo fuera de scope, especialmente porque el builder es admin desktop.
- **Coupling con altura del viewer**: no hay tabs visibles ni search operando en `Dashboard.tsx`, pero sí hay una composición vertical fija (`space-y-4`, `px-2`, header variable, contenedor final `flex-1`). Si el cálculo de canvas ignora cualquiera de esas capas, podés romper el fill vertical o generar scroll.
- **Templates**: si aspect/rows no se modelan también en templates, “crear desde template” puede reconstruir un layout incompatible con el canvas esperado.
- **PropertyDock** ya recibe `selectedLayout` y `onUpdateLayout`, pero hoy ignora `selectedLayout` (`PropertyDock.tsx:105-117`). Si después querés edición manual de rows/span/coords, hay espacio contractual pero no implementación.

## Recommendation

- Basear la propuesta en una **shared canvas reference model** consumida por builder + viewer.
- Aprovechar el cambio para cerrar deuda existente: unificar gap/reference/row model, formalizar `CURRENT_GRID_VERSION`, y hacer que snapshot/viewer/templates respeten los nuevos metadatos.
- Mantener el overlay de grid como capa visual DOM/CSS y el toggle en Zustand persistido.
- Declarar explícitamente en propuesta/diseño si esta iteración introduce o no posicionamiento lógico real con `x/y`; hoy el código NO lo tiene.

## Ready for Proposal

Sí. Hay suficiente evidencia de código para lanzar propuesta, pero la propuesta debería fijar explícitamente tres decisiones operativas que el código actual no responde por sí solo:
1. si la nueva arquitectura usa `x/y` reales o mantiene auto-placement,
2. cómo se versionan/resetéan templates además de dashboards,
3. cuál es el valor canónico de resolución (`MAX_COLS`, rows default, spans default) bajo el canvas acotado.
