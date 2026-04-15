# Proposal: dynamic-grid-columns

## Intent
Eliminar el grid fijo de 4 columnas del dashboard para aprovechar mejor el ancho disponible, aumentar densidad horizontal y mantener compatibilidad con dashboards legacy guardados en `localStorage`.

## Scope

### In Scope
- Calcular `cols` en runtime desde el ancho real del contenedor usando `MIN_COL_WIDTH = 220` y `MAX_COLS = 8`.
- Compartir una utilidad de grid entre builder y viewer para `cols`, `cellWidth` y gaps.
- Reemplazar `grid-cols-4` y `col-span-*` por estilos inline dinámicos.
- Migrar dashboards legacy al cargar: si no tienen `gridVersion`, escalar `w` relativo a 4 columnas y mapear `w = 4` a ancho completo.
- Ajustar resize del builder para medir `cellWidth` real y clampear `w` a `1..cols`.

### Out of Scope
- Posicionamiento explícito por `x/y` o drag-and-drop basado en coordenadas.
- Breakpoints por dispositivo o columnas configurables por dashboard.
- Refactors ajenos al sistema builder/viewer de dashboards.

## Capabilities

### New Capabilities
- `dynamic-dashboard-grid`: grid responsive para dashboards con columnas calculadas por ancho disponible y compatibilidad legacy.

### Modified Capabilities
- None.

## Approach
Implementar el approach validado en exploración: runtime responsive + migración mínima. Builder y viewer medirán su contenedor con `ResizeObserver` y usarán un helper compartido para resolver columnas y spans. El grid se renderizará con `gridTemplateColumns: repeat(cols, minmax(0, 1fr))` y `gridColumn: span n / span n`. `Dashboard` incorporará `gridVersion: 2`; `DashboardStorageService` migrará layouts sin versión al modelo nuevo en carga/persistencia.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `hmi-app/src/components/admin/BuilderCanvas.tsx` | Modified | Medición de ancho, grid dinámico y resize basado en `cellWidth` real |
| `hmi-app/src/components/viewer/DashboardViewer.tsx` | Modified | Grid dinámico y cálculo de filas parametrizado por `cols` |
| `hmi-app/src/domain/admin.types.ts` | Modified | Agregar `gridVersion: 2` y contratos asociados |
| `hmi-app/src/services/DashboardStorageService.ts` | Modified | Migración de dashboards legacy al cargar/guardar |
| `hmi-app/src/utils/dashboardGrid.ts` | New | Helper compartido de configuración/métricas del grid |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Layout legacy cambie de significado | Med | Migración proporcional y caso especial para full width legacy |
| Desalineación entre builder y viewer | Med | Helper único para columnas, gaps y spans |
| Row height no coincida con auto-placement real | Med | Parametrizar cálculo por `cols` y validar contra CSS grid actual |

## Rollback Plan
Revertir helper, migración y `gridVersion`, y restaurar `grid-cols-4`/clamps actuales en builder y viewer.

## Dependencies
- `ResizeObserver` disponible en navegador objetivo.

## Success Criteria
- [ ] Builder y viewer muestran más de 4 columnas cuando el ancho lo permite, sin clases Tailwind hardcodeadas.
- [ ] Dashboards legacy sin `gridVersion` preservan razonablemente el significado visual de spans previos.
- [ ] El resize horizontal del builder usa el ancho real de celda y nunca supera `cols`.
