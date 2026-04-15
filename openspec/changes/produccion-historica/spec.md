# Delta for produccion-historica-widget

## ADDED Requirements

### Requirement: Widget Type Registration
The system MUST add `produccion-historica` to the typed widget model, exclude its config from `GenericWidgetConfig`, include it in `WidgetConfig`, and register it in `WidgetRenderer.tsx`, `WidgetCatalogRail.tsx`, and `DashboardBuilderPage.tsx`.

#### Scenario: Builder insertion path
- GIVEN the admin builder supports widget insertion
- WHEN the catalog is opened and `Producción Histórica` is added
- THEN the dashboard SHALL create and render a valid `produccion-historica` widget instance

### Requirement: Default Presentation
The widget MUST default to title `Producción Histórica`, source `Simulado`, production as Bars, OEE visible as Line on a secondary axis, autoscale ON, grid ON, OEE fill OFF, OEE points OFF, and temporal grouping `Hora`.

#### Scenario: Render with defaults
- GIVEN a new widget instance without custom overrides
- WHEN it renders for the first time
- THEN it SHALL present the default labels, modes, and visibility defined above

### Requirement: In-Widget Temporal Range Selector
The widget MUST expose a top-right pill selector with `Hora | Turno | Día | Mes`, highlight the active option with the accent-cyan token, keep selection in local ephemeral state, and reset simulation after selection changes.

#### Scenario: Change grouping locally
- GIVEN the widget is showing `Hora`
- WHEN the user selects `Turno`
- THEN the chart SHALL re-bucket locally and restart its simulated stream without persisting the choice

### Requirement: In-Widget OEE Toggle
The widget MUST provide a local toggle for OEE visibility, default it from `displayOptions.defaultShowOee`, and hide the OEE series, axis, legend entry, and tooltip row together when disabled; production MUST remain visible.

#### Scenario: Hide OEE only
- GIVEN OEE is visible
- WHEN the user turns OEE off
- THEN production SHALL remain plotted while every OEE-specific visual element disappears

### Requirement: Temporal Grouping Logic
The system MUST provide `hmi-app/src/utils/temporalGrouping.ts` as a pure utility for `hour | shift | day | month`, using T1 `06:00-14:00`, T2 `14:00-22:00`, T3 `22:00-06:00`, operational day `06:00-06:00`, Monday operational week start, and Spanish abbreviated shift labels anchored to the shift start day.

#### Scenario: Label overnight shift
- GIVEN points from Monday 22:00 through Tuesday 05:59
- WHEN they are grouped by shift
- THEN they SHALL belong to `Lun / Turno 3`

### Requirement: Local Simulation Stream
The widget MUST simulate progressive history locally with `setInterval`, append points over time, regenerate relative to `now`, and reset the stream whenever the selected bucket changes; it MUST NOT reuse simulation code from other widgets.

#### Scenario: Reset on bucket change
- GIVEN a live local stream is appending hourly buckets
- WHEN the user changes to `Día`
- THEN the prior stream SHALL stop and a new daily stream SHALL start from a fresh bucket window

### Requirement: Dual Axis Rendering
The widget MUST render production on the primary axis and OEE on the secondary axis, keep the secondary axis enabled by default, and when autoscale is ON it SHALL derive visible ranges from the current plotted series.

#### Scenario: Autoscaled dual axis
- GIVEN production and OEE are both visible with autoscale ON
- WHEN the chart renders a new bucket set
- THEN each visible axis SHALL scale from its own current series values

### Requirement: Production Chart Mode
The widget MUST support `bars | area` for production through `displayOptions.productionChartMode`; the first iteration SHALL instantiate new widgets with `bars`, and no in-widget mode switch is required.

#### Scenario: Default production mode
- GIVEN a widget created from the builder defaults
- WHEN it is rendered
- THEN production SHALL use Bars unless persisted config explicitly requests Area

### Requirement: OEE Chart Mode
The widget MUST render OEE as Line only, with optional `displayOptions.oeeShowArea` and `displayOptions.oeeShowPoints`, both defaulting to OFF.

#### Scenario: OEE line options
- GIVEN default display options
- WHEN OEE is visible
- THEN the chart SHALL draw a line without area fill and without point markers

### Requirement: Visual System Compliance
The widget MUST use `glass-panel`, Lucide React icons, `@theme` tokens, `hmi-scrollbar` on any scrollable container, and unique SVG gradient IDs `prod-grad-${widget.id}` and `oee-grad-${widget.id}`; hardcoded colors or fonts MUST NOT be used.

#### Scenario: Multiple widget instances
- GIVEN two `produccion-historica` widgets share one dashboard
- WHEN both render gradients and chrome
- THEN each SHALL resolve unique gradient IDs and design-system styling without collisions

### Requirement: Isolation from Base Widget
The widget MUST NOT import from `oee-production-trend` or `trend-chart`; duplicated code is allowed by design, and both widget types SHALL coexist in the same dashboard.

#### Scenario: Parallel coexistence
- GIVEN a dashboard contains `oee-production-trend` and `produccion-historica`
- WHEN the dashboard renders
- THEN each widget SHALL resolve independently without shared imports or regressions

### Requirement: Read-Only Contract
The widget MUST remain strictly read-only and MUST NOT issue POST, PUT, or DELETE requests, send commands, expose setpoints, or provide plant-control actions.

#### Scenario: Operational safety
- GIVEN a user interacts with selectors and toggles inside the widget
- WHEN the interaction completes
- THEN only local visualization state SHALL change and no write-side plant action SHALL occur
