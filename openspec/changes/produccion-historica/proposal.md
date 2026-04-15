# Proposal: produccion-historica

## What
Agregar el widget `produccion-historica` como variante nueva y aditiva del actual `oee-production-trend`, manteniendo ese widget intacto. El nuevo widget mostrará producción histórica simulada con selector local de rango (`Hora`, `Turno`, `Día`, `Mes`), toggle local de OEE, agrupación temporal operacional y registro completo en el builder para poder insertarlo desde catálogo.

## Why
Hoy el proyecto tiene un widget base de tendencia OEE/producción, pero no cubre la exploración histórica operacional pedida para producción por hora, turno, día y mes. Falta una lectura más útil para análisis industrial rápido dentro del dashboard, sin recargar la página y sin introducir servicios reales ni persistencia de estado efímero.

## Scope

### In Scope
- Nuevo tipo `produccion-historica` como copia exacta de base `oee-production-trend` + extensiones locales.
- Dominio: `ProduccionHistoricaWidgetConfig`, `ProduccionHistoricaDisplayOptions`, extensión de `WidgetType`.
- Renderer nuevo: `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx`.
- Helper local de simulación progresiva, colocalizado con el renderer.
- Util pura `hmi-app/src/utils/temporalGrouping.ts` con lógica de hora/turno/día/mes y Turno 3 etiquetado por día de inicio.
- Selector pill de rango y toggle OEE en esquina superior derecha con `useState` local; `displayOptions` sólo define defaults iniciales.
- Registro en `WidgetRenderer.tsx`, `WidgetCatalogRail.tsx` y `DashboardBuilderPage.tsx`.
- Defaults del prompt expresados en los defaults del widget/display options.

### Out of Scope
- `PropertyDock.tsx`.
- Modificar/eliminar `oee-production-trend`.
- Tocar `trend-chart`.
- Servicios, adapters, queries o backend reales.
- Tests automáticos.
- Cambios en `Directrices/`.

## Capabilities

### New Capabilities
- `produccion-historica-widget`: visualización histórica simulada con agrupación temporal operacional y visibilidad opcional de OEE.

### Modified Capabilities
- None.

## High-level approach
Seguir el approach validado en exploración: clone + local evolution. Se clona la base visual/tokenizada del widget existente, se agrega simulación progresiva local con reset por cambio de bucket, se centraliza la bucketización en `temporalGrouping.ts`, y se registra el nuevo tipo en dominio, renderer y catálogo. Ver exploración para inventario, tokens, edge cases y tradeoffs.

## Success criteria
- El usuario puede agregar `Producción Histórica` desde el catálogo del dashboard.
- Cambiar `Hora/Turno/Día/Mes` actualiza el gráfico sin recargar la página.
- El toggle OEE muestra/oculta serie y eje OEE sin afectar producción.
- `Lun / Turno 3` representa el turno iniciado el lunes 22:00.
- Dashboards existentes con `oee-production-trend` siguen funcionando sin cambios.

## Risks
- Abierto: normalizar o no el header al primitive `WidgetHeader` sin romper la premisa de copia base.
- Abierto: densidad de labels/tooltips en `Turno` y `Mes` puede exigir truncado o spacing específico.
- Abierto: la simulación progresiva local duplica lógica respecto de otros widgets y deja deuda técnica consciente.
- Resolved: `bucket` y `showOee` quedan como estado efímero local; `displayOptions` sólo aporta defaults iniciales.
- Resolved: builder/catalog quedan en scope para insertar el widget.
- Resolved: Turno 3 se etiqueta por día operacional de inicio.
- Resolved: no se toca `trend-chart` ni `oee-production-trend`.

## Migration / compatibility
El cambio es puramente aditivo. No altera contratos existentes ni migra dashboards; cualquier dashboard con `oee-production-trend` permanece funcional e inalterado.

## Rollback plan
Eliminar el tipo `produccion-historica`, su renderer, su util temporal y su registro en builder/catálogo restaura el estado previo sin impacto sobre widgets existentes.

## Links
- Engram: `sdd/produccion-historica/explore`
- File: `openspec/changes/produccion-historica/explore.md`
