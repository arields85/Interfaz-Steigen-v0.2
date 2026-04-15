# Tasks: produccion-historica widget

## Phase 1: Domain and contracts

- [x] 1.1 Update `hmi-app/src/domain/admin.types.ts` to add `TemporalBucket`, `ProductionChartMode`, `ProduccionHistoricaDisplayOptions`, and `ProduccionHistoricaWidgetConfig` with defaults aligned to the spec (`Hora`, OEE visible, bars, line, autoscale/grid ON).
- [x] 1.2 Extend `WidgetType`, exclude `produccion-historica` from `GenericWidgetConfig`, and include the new config in the `WidgetConfig` discriminated union so builder/viewer code narrows it safely.

## Phase 2: Temporal grouping foundation

- [x] 2.1 Create `hmi-app/src/utils/temporalGrouping.ts` with pure helpers for hour, shift, day, and month buckets plus shared types for raw/grouped points.
- [x] 2.2 Implement operational anchors in `hmi-app/src/utils/temporalGrouping.ts` for T1 `06:00-14:00`, T2 `14:00-22:00`, T3 `22:00-06:00`, operational day `06:00-06:00`, and Monday operational week alignment.
- [x] 2.3 Implement label formatting in `hmi-app/src/utils/temporalGrouping.ts` so overnight samples group as `Lun / Turno 3` by shift start day and month labels use the bucket anchor date.

## Phase 3: Renderer implementation

- [x] 3.1 Create `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` by cloning the visual baseline of `OeeProductionTrendWidget.tsx` without importing from `oee-production-trend` or `trend-chart`.
- [x] 3.2 Resolve the header strategy inside `ProduccionHistoricaWidget.tsx`: attempt `WidgetHeader`; if it cannot host title, legend, and controls without distortion, keep a manual local header and document why in code comments.
- [x] 3.3 Add local ephemeral state in `ProduccionHistoricaWidget.tsx` for `bucket` and `showOee`, initializing from `displayOptions.defaultTemporalGrouping` and `displayOptions.defaultShowOee` only.
- [x] 3.4 Add the top-right pill selector in `ProduccionHistoricaWidget.tsx` using the existing `TrendsPage.tsx` accent-cyan pattern and no new hardcoded visual values.
- [x] 3.5 Implement an isolated local simulation loop in `ProduccionHistoricaWidget.tsx` with `setInterval`, relative-to-now regeneration, cleanup on unmount, and full reset whenever `bucket` changes.
- [x] 3.6 Render production conditionally as bars or area from `displayOptions.productionChartMode`, and render OEE conditionally as line-only with optional fill/points flags.
- [x] 3.7 When OEE is OFF in `ProduccionHistoricaWidget.tsx`, remove the OEE series, secondary axis, legend item, and tooltip row together while keeping production visible.
- [x] 3.8 Generate instance-safe SVG IDs in `ProduccionHistoricaWidget.tsx` (`prod-grad-${widget.id}`, `oee-grad-${widget.id}` and related defs) so multiple widgets never collide.

## Phase 4: Integration and manual verification

- [x] 4.1 Register `ProduccionHistoricaWidget` in `hmi-app/src/widgets/WidgetRenderer.tsx` with a dedicated `produccion-historica` dispatcher case.
- [x] 4.2 Add `produccion-historica` to `hmi-app/src/components/admin/WidgetCatalogRail.tsx` with a Lucide icon and label so the widget is insertable from the catalog.
- [x] 4.3 Update `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` so `handleAddWidget()` creates a usable `produccion-historica` instance with title `Producción Histórica`, simulated binding, and spec-default `displayOptions`.
- [ ] 4.4 Manual verification: from the builder, add the widget from catalog, confirm default render, switch `Hora/Turno/Día/Mes` and verify rebucketing plus simulation reset, toggle OEE and confirm axis/legend/tooltip row disappear, place two instances and confirm gradients stay isolated, then confirm existing `oee-production-trend` dashboards still render unchanged.
