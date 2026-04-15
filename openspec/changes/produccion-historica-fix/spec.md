# Delta for produccion-historica-widget

## MODIFIED Requirements

### Requirement: Local Simulation Stream
The widget MUST generate a fixed historical window once per selected bucket through a pure `generateHistoricalSeries(bucket, reference)` call. Window sizes MUST be `hour=24`, `shift=15`, `day=14`, and `month=12`; the renderer MUST NOT use `setInterval`, MUST run its regeneration effect with `[bucket]` only, MUST replace the full window instantly on bucket change, and MUST emphasize the last production and OEE points with `animate-ping` plus explicit `transformOrigin`. (Previously: the widget appended points progressively with an interval and rewound on bucket changes.)

#### Scenario: Static regeneration per bucket
- GIVEN the widget mounts with its default bucket
- WHEN the renderer initializes or the bucket changes
- THEN it SHALL generate one full fixed window for that bucket immediately
- AND no progressive rewind animation or interval loop SHALL occur

### Requirement: Production Chart Mode
The widget MUST support `bars` and `area` production modes with the same premium SVG language. Bars mode MUST render one bar body plus luminous top per point, symmetric horizontal padding, and `productionBarWidth` factor application; area mode MUST render production as a smooth filled area using the same production token gradient pair. Unique SVG IDs MUST be derived from `widget.id` for `prod-bar-grad`, `prod-area-grad`, `oee-grad`, `oee-clip`, and `oee-glow`. (Previously: production mode was configurable, but bars and area did not share the premium SVG treatment or the expanded ID contract.)

#### Scenario: Visual parity across modes
- GIVEN the widget renders in `bars`, `area`, or beside another instance
- WHEN the SVG output is inspected
- THEN bars SHALL include body and luminous cap elements, area SHALL include a filled production path
- AND all widget-scoped SVG IDs SHALL remain collision-free

### Requirement: In-Widget OEE Toggle
The widget MUST keep the local OEE toggle defaulted from `displayOptions.defaultShowOee`, and toggling OEE OFF MUST remove the OEE area, line, glow usage, last-point ping, secondary Y axis ticks and labels, and the OEE tooltip row while leaving production unchanged. The toggle state MUST remain local `useState` and MUST NOT be exposed in the PropertyDock. (Previously: the toggle hid OEE series, axis, legend entry, and tooltip row, but full SVG teardown and axis-label removal were not required.)

#### Scenario: Full OEE teardown
- GIVEN OEE is visible in the widget
- WHEN the user turns OEE off from the in-widget eye control
- THEN every OEE-only SVG element and right-axis label SHALL disappear from the DOM
- AND production data, production axis, and the local toggle behavior SHALL remain intact

## ADDED Requirements

### Requirement: OEE Line Visual Consistency
When `showOee=true`, the OEE line MUST use the same smooth monotone spline, clip path, glow filter, stroke width `2.5`, and tokenized color in both production modes. It MUST scale with the secondary axis only when `useSecondaryAxis=true`.

#### Scenario: Matching OEE treatment
- GIVEN OEE is visible in either production mode
- WHEN the chart renders
- THEN the OEE line SHALL use the same clipped glowing path in both modes

### Requirement: Last-Point Liveness Indicator
The widget MUST render a pulsing SVG ping on the last production point and, only when `showOee=true`, on the last OEE point. Each ping MUST use explicit `transformOrigin` and the token color of its series.

#### Scenario: Persistent production ping
- GIVEN the widget renders any production mode
- WHEN the last points are drawn
- THEN production SHALL always keep its ping marker
- AND the OEE ping SHALL appear only while OEE is visible

### Requirement: PropertyDock Full Branch
For `type === 'produccion-historica'`, the PropertyDock MUST show only these dedicated sections: General (`Título`, `Subtítulo`), Datos (`Origen` and, in real mode, `Variable de Producción` plus `Variable de OEE`), Series (`Mostrar OEE`, `Usar eje secundario para OEE`), Visualización (`Producción Barras/Área`, `Mostrar relleno bajo línea OEE`, `Mostrar puntos en OEE`, `Ancho de barra` factor slider `0.5–1.5`), Escalas (`Autoescala`, production min/max, OEE min/max), and Layout (`Mostrar grilla`). Generic `Ícono`, `Unidad`, and simulated `Valor` sections MUST NOT appear. Manual scale inputs MUST be disabled while `autoScale=true`.

#### Scenario: Specialized dock only
- GIVEN a `produccion-historica` widget is selected in the builder
- WHEN the PropertyDock renders and the user changes `Origen` or `Autoescala`
- THEN only the dedicated sections above SHALL appear
- AND real-variable fields or manual scale inputs SHALL appear enabled only when their governing state allows it

### Requirement: ProductionBarWidth Factor Semantics
`displayOptions.productionBarWidth` MUST be a factor clamped to `[0.5, 1.5]`, default to `1.0`, and multiply the naturally computed `barW` instead of replacing it.

#### Scenario: Factor clamping
- GIVEN `productionBarWidth` is unset, valid, or invalid
- WHEN the bar width is resolved
- THEN the renderer SHALL apply `naturalBarW * factor`
- AND invalid values SHALL clamp silently to the nearest boundary

### Requirement: Manual Scales with Silent Autoscale Fallback
When `autoScale=false`, each axis MUST use its manual min/max only if both bounds are numeric and `min < max`; otherwise that axis alone MUST fall back silently to autoscale behavior.

#### Scenario: Partial manual validity
- GIVEN `autoScale=false` and only one axis has valid bounds
- WHEN domains are resolved
- THEN the valid axis SHALL use manual bounds
- AND the invalid axis SHALL autoscale without warning UI

### Requirement: Real Variables Typed but Not Consumed
`productionVariableKey` and `oeeVariableKey` MUST exist in `ProduccionHistoricaDisplayOptions` and be editable in the dock for `binding.mode === 'real_variable'`, but the renderer MUST continue using simulated historical series in this phase.

#### Scenario: Editable but ignored real variables
- GIVEN the widget is configured for real-variable mode with both variable keys set
- WHEN the dashboard saves and the widget renders
- THEN the configuration SHALL persist those keys
- AND the renderer SHALL still visualize simulated historical data

### Requirement: Subtitle Display
`displayOptions.subtitle` MAY be omitted; when present, it MUST render below the main title in muted header styling.

#### Scenario: Optional subtitle
- GIVEN the widget header renders with or without `subtitle`
- WHEN the field is absent or defined
- THEN only the title SHALL appear when absent
- AND a muted subtitle SHALL appear below it when defined

## PRESERVED Requirements

### Requirement: Isolation from Base Widget
The widget MUST NOT import from `OeeProductionTrendWidget.tsx` or `TrendChartWidget.tsx`. Local duplication of `BarsModeSvg` as `ProduccionHistoricaBarsSvg` is intentional, and `oee-production-trend` MUST continue to coexist without visual or SVG ID collisions.

#### Scenario: Side-by-side isolation
- GIVEN a dashboard contains `oee-production-trend` and `produccion-historica`
- WHEN both render simultaneously
- THEN each widget SHALL resolve independently with no shared imports or ID collisions

### Requirement: Read-Only Contract
The widget MUST remain strictly read-only. It MUST NOT expose write operations, plant-control actions, or any POST/PUT/DELETE behavior.

#### Scenario: Visualization-only interaction
- GIVEN the user changes widget-local selectors or dock configuration
- WHEN the interaction completes
- THEN only visualization state SHALL change
- AND no write-side operation SHALL occur
