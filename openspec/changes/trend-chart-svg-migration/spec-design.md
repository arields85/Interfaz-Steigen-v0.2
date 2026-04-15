# trend-chart-svg-migration — Combined Proposal + Spec + Design

## PROPOSAL

This change rewrites `TrendChartWidget.tsx` from Recharts to pure SVG, removing the last renderer-level Recharts dependency once the legacy `oee-production-trend` path is deleted, unifying hover and tooltip behavior through the shared `ChartHoverLayer` and `ChartTooltip` primitives, and extracting shared chart math into `hmi-app/src/utils/chartHelpers.ts` so `TrendChartWidget` and `ProduccionHistoricaWidget` stop drifting in parallel.

## SPEC

### Requirements

#### R1: Pure SVG Rendering
The widget MUST render its chart as raw SVG inside a `ResizeObserver` container. It MUST NOT use Recharts components, including `ResponsiveContainer`, `ComposedChart`, `Area`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `ReferenceLine`, or `Tooltip`.

##### Scenario: Widget renders without Recharts
- GIVEN the widget has data and a measured container
- WHEN the chart mounts
- THEN it renders an `<svg>` with the expected dimensions/viewBox
- AND no Recharts DOM nodes or imports remain in `TrendChartWidget.tsx`

#### R2: Horizontal Gradient Line with Glow
The main trend line MUST use a horizontal linear gradient from `gradientFrom` to `gradientTo` and MUST include a glow filter equivalent to the current Recharts rendering.

##### Scenario: Gradient line is preserved
- GIVEN the widget renders chart data
- WHEN the trend path is drawn
- THEN the stroke transitions left-to-right from blue to purple
- AND the line keeps a visible glow matching the current widget

#### R3: Masked Area Fill
The area under the curve MUST use a horizontal color gradient masked by a vertical opacity fade from `0.7` to `0`, preserving the current two-layer visual treatment.

##### Scenario: Area fill matches current visual
- GIVEN the widget renders the area under the line
- WHEN the fill is painted
- THEN the color gradient runs left-to-right under the series
- AND opacity fades toward transparent at the bottom edge

#### R4: Threshold Reference Lines
The chart MUST render manual horizontal dashed threshold lines for configured Y values and MUST place severity labels (`CRIT`, `WARN`) on the right edge using severity token colors.

##### Scenario: Thresholds are visible and positioned correctly
- GIVEN the widget has warning and critical thresholds configured
- WHEN the chart renders
- THEN dashed horizontal reference lines appear at the mapped Y positions
- AND severity labels are shown at the right edge in the correct token colors

#### R5: ChartHoverLayer Integration
Hover detection, vertical indicator line, and highlight dot MUST come from the shared `ChartHoverLayer` primitive. The widget MUST NOT use Recharts hover handlers, active dots, or hover reference lines.

##### Scenario: Shared hover behavior is used
- GIVEN the user moves the pointer across the plot area
- WHEN a data column is hovered
- THEN `ChartHoverLayer` drives the active index, indicator line, and highlight dot
- AND no Recharts hover behavior is involved

#### R6: ChartTooltip Integration
The tooltip panel MUST continue using the shared `ChartTooltip` primitive without modifying that primitive.

##### Scenario: Shared tooltip remains intact
- GIVEN a point is hovered
- WHEN the tooltip is shown
- THEN it displays the time label and formatted value with unit
- AND the widget reuses `ChartTooltip` as-is

#### R7: Animate-Ping Last Point
The last data point MUST preserve the pulsing `animate-ping` circle from the current widget.

##### Scenario: Latest point remains emphasized
- GIVEN the chart renders a full series
- WHEN the last data point is displayed
- THEN a pulsing marker appears on that final point

#### R8: Grid Lines
The chart MUST render horizontal dashed grid lines visually matching the current `CartesianGrid` appearance.

##### Scenario: Grid lines are preserved
- GIVEN the chart renders its plot area
- WHEN the background grid is drawn
- THEN horizontal dashed grid lines are visible at the expected tick intervals

#### R9: Axes
The chart MUST render a left Y-axis with value ticks and a bottom X-axis with time labels using existing theme tokens.

##### Scenario: Axes remain readable
- GIVEN the chart renders in its measured container
- WHEN axes are painted
- THEN value ticks are visible on the left and time labels on the bottom
- AND text styling comes from tokens rather than hardcoded colors

#### R10: Shared Chart Helpers
`smoothPath`, `buildAreaPath`, `formatTick`, and `clamp` MUST be extracted to `hmi-app/src/utils/chartHelpers.ts` and MUST be consumed by both `TrendChartWidget` and `ProduccionHistoricaWidget`.

##### Scenario: Helper duplication is removed
- GIVEN both widgets compile after the migration
- WHEN their imports are reviewed
- THEN both import shared helper functions from `chartHelpers.ts`
- AND neither file keeps local duplicates of those functions

#### R11: Visual Parity
The SVG renderer MUST remain visually equivalent to the current Recharts widget for gradients, glow, area treatment, grid, axes, thresholds, loading state, header, and latest-point emphasis.

##### Scenario: Before/after comparison
- GIVEN the same input data and widget config
- WHEN the old and new versions are compared side by side
- THEN the chart appears visually identical to the user for the supported elements

#### R12: Isolation from Other Widgets
`ProduccionHistoricaWidget` MUST keep the same rendering behavior, and `trendDataGenerator.ts`, `admin.types.ts`, `ChartTooltip.tsx`, `ChartHoverLayer.tsx`, and `WidgetHeader.tsx` MUST remain untouched.

##### Scenario: Migration stays isolated
- GIVEN the change is implemented
- WHEN affected files are reviewed
- THEN `ProduccionHistoricaWidget` only changes helper imports
- AND the protected files remain unmodified

## DESIGN

### Technical Approach

Reuse the `ResizeObserver` + raw SVG architecture already proven in `ProduccionHistoricaWidget`, but adapt it to the single-series trend widget and preserve its unique visuals: horizontal gradient line stroke, masked area fill, manual threshold lines, shared hover primitive, shared tooltip primitive, loading shell, `WidgetHeader`, token usage, and the pulsing last-point marker.

### Architecture Decisions

| # | Decision | Alternative | Rationale |
|---|---|---|---|
| 1 | Remove Recharts and render pure SVG | Keep Recharts with adapters/parches | Eliminates the inconsistent renderer stack and aligns trend-chart with shared primitives |
| 2 | Extract shared helpers to `chartHelpers.ts` | Keep duplicated helpers per widget | Prevents math drift and centralizes chart path/tick utilities |
| 3 | Use `ResizeObserver` container sizing | Keep `ResponsiveContainer` | Matches the existing SVG widget pattern and removes Recharts dependence |
| 4 | Render line with SVG gradient stroke | Replace with solid stroke or CSS trick | Preserves the current horizontal blue→purple visual exactly |
| 5 | Render area with gradient + mask | Use a single fill gradient | Preserves the current two-layer fill treatment rather than approximating it |
| 6 | Implement threshold lines inline in SVG | Extract a new threshold primitive now | One consumer does not justify a new primitive yet; extract later if reuse appears |

### File Changes

| File | Action | Description |
|---|---|---|
| `hmi-app/src/utils/chartHelpers.ts` | Create | Shared `smoothPath`, `buildAreaPath`, `formatTick`, `clamp`, and `round2` helpers |
| `hmi-app/src/widgets/renderers/TrendChartWidget.tsx` | Rewrite | Remove Recharts and render the chart with raw SVG plus shared primitives |
| `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` | Modify | Replace local helper copies with imports from `chartHelpers.ts` |

### Data Flow

```text
widget.binding → resolveBinding → baseValue
    → generateTrendData(baseValue, 24) → trendData[]
    → chart domain computation (yMin, yMax, padding)
    → SVG coordinate mapping (toY, x0, step)
    → TrendChartSvg
        ├── <defs>: line gradient, area gradient, fade mask, glow filter
        ├── horizontal grid lines
        ├── threshold lines + labels
        ├── masked area path
        ├── gradient line path
        ├── animate-ping last point
        ├── ChartHoverLayer
        └── ChartTooltip
```

### Constraints and Risks

- The widget remains STRICTLY read-only; this change affects rendering only.
- Theme fidelity depends on existing tokens; no hardcoded colors or fonts are allowed.
- SVG gradient stroke and masked fill must be visually verified during apply.
- Threshold label placement and narrow-width hover geometry are the main implementation risks.
