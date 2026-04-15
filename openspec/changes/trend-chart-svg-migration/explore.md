## Exploration: trend-chart-svg-migration

### Current State

#### 1. Feature inventory of current `TrendChartWidget`

| Recharts Feature | What it does | SVG Equivalent | Exists in produccion-historica? |
|---|---|---|---|
| `ResponsiveContainer` | Resizes chart to container | `ResizeObserver` container pattern | Yes |
| `CartesianGrid` | Horizontal dashed grid lines | Manual `<line>` elements | Yes |
| `XAxis` | Time labels on bottom | Manual `<text>` elements | Yes |
| `YAxis` | Value labels on left | Manual `<text>` elements | Yes |
| `ComposedChart.onMouseMove/Leave` | Hover detection | `ChartHoverLayer` hit areas | Yes |
| `ReferenceLine` (thresholds) | Horizontal dashed lines at threshold values | Manual `<line>` + `<text>` label | No — new for trend-chart |
| `ReferenceLine` (hover indicator) | Vertical dashed line at hovered point | `ChartHoverLayer` indicator | Yes |
| `Area` with horizontal gradient + vertical mask | Filled area under the curve with left→right color + top→bottom fade | SVG `<path>` + `<linearGradient>` + `<mask>` | Partial |
| `Line` with horizontal gradient + glow | Main trend stroke with gradient and glow | SVG `<path>` + gradient stroke + glow filter/drop-shadow | Partial |
| `Line.dot` (animate-ping last) | Pulsing last point marker | SVG `<circle className="animate-ping">` | Yes |
| `Line.activeDot` | Highlight dot on hovered point | `ChartHoverLayer` highlights | Yes |

#### 2. Key differences vs `ProduccionHistoricaWidget`
- `trend-chart` has a **horizontal gradient stroke** (`gradientFrom → gradientTo`); `produccion-historica` uses a solid OEE stroke.
- `trend-chart` area fill is a **two-layer composition**: horizontal color gradient + vertical fade mask; `produccion-historica` only uses a vertical gradient.
- `trend-chart` renders **threshold reference lines** with severity labels; `produccion-historica` has no threshold layer.
- `trend-chart` is **single-series** (`value`), so the SVG port is simpler than `produccion-historica`.
- `trend-chart` data comes from `generateTrendData(baseValue, undefined, 24)` with `{ time, timestamp, value }`; rendering can stay fully agnostic to the source.

#### 3. Reusable code/patterns from `produccion-historica`
- `smoothPath(points)` — reusable as-is.
- `buildAreaPath(path, points, baselineY)` — reusable as-is.
- `formatTick(value)` — reusable as-is for Y labels.
- `clamp(value, min, max)` — reusable as-is.
- `ResizeObserver` container pattern (`ProduccionHistoricaBarsContainer`) — directly reusable.
- `ChartHoverLayer` integration pattern — directly reusable.
- `ChartTooltip` integration pattern — directly reusable.

**Extraction recommendation**: move `smoothPath`, `buildAreaPath`, `formatTick`, and `clamp` into `hmi-app/src/utils/chartHelpers.ts`. Keeping them duplicated would institutionalize drift between the two SVG widgets, justo lo contrario a la unificación buscada.

#### 4. Token inventory verification
Verified in `hmi-app/src/index.css`:
- `TOKEN.lineColor` → `var(--color-widget-gradient-from)` ✓
- `TOKEN.gradientFrom` → `var(--color-widget-gradient-from)` ✓
- `TOKEN.gradientTo` → `var(--color-widget-gradient-to)` ✓
- `TOKEN.statusCritical` → `var(--color-status-critical)` ✓
- `TOKEN.statusWarning` → `var(--color-status-warning)` ✓
- `TOKEN.industrialBg` → `var(--color-industrial-bg)` ✓
- `TOKEN.industrialBorder` → `var(--color-industrial-border)` ✓
- `TOKEN.industrialMuted` → `var(--color-industrial-muted)` ✓

#### 5. Type and data contract snapshot
- `TrendChartWidgetConfig` lives in `hmi-app/src/domain/admin.types.ts` and stays valid as-is.
- `TrendChartDisplayOptions` is intentionally empty/reserved; no type changes are needed for this migration.
- `trendDataGenerator.ts` is pure and already returns the full shape needed by an SVG renderer; no data-layer work is required.

### Affected Areas
- `hmi-app/src/widgets/renderers/TrendChartWidget.tsx` — full rewrite from Recharts to raw SVG while preserving widget behavior and tokens.
- `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` — replace local duplicated helpers with shared imports.
- `hmi-app/src/utils/chartHelpers.ts` — new shared SVG helper module (`smoothPath`, `buildAreaPath`, `formatTick`, `clamp`).
- `hmi-app/src/components/ui/ChartHoverLayer.tsx` — consumed as-is; no changes required unless a real gap appears during apply.
- `hmi-app/src/components/ui/ChartTooltip.tsx` — already compatible and reused as-is.

### Approaches
1. **Direct SVG migration with shared helper extraction** — rewrite `TrendChartWidget` to the same SVG/container/hover architecture used by `produccion-historica`, and extract common math helpers.
   - Pros: removes the Recharts/primitive split, unifies hover behavior, keeps changes localized, reduces future drift.
   - Cons: requires careful recreation of threshold labels and the masked area fill.
   - Effort: Medium

2. **Keep Recharts and emulate hover through adapters/parches** — continue using Recharts for drawing and try to bridge hover/tooltip behavior.
   - Pros: lower immediate rewrite effort.
   - Cons: violates the approved decision, keeps the current architectural inconsistency, and doubles maintenance when primitives evolve.
   - Effort: Low now / High later

### Recommendation
Take **Approach 1**.

The approved architectural move is correct: `trend-chart` should consume `ChartTooltip` **and** `ChartHoverLayer` from the same SVG foundation as `produccion-historica`. The right implementation is not to patch Recharts around the edges, but to move the renderer to the same primitive stack and extract the shared helper math into `hmi-app/src/utils/chartHelpers.ts`.

### Risks
- SVG `stroke="url(#gradientId)"` on `<path>` is supported in modern browsers, but it should still be visually verified after apply.
- The area fill needs a gradient + mask combo; this is more complex than the current `produccion-historica` fill.
- Threshold labels currently get auto-positioning from Recharts; in SVG their right-edge placement must be computed manually.
- `ChartHoverLayer` uses per-column hit rects; with `step = 0` or very narrow widths, hover math must guard against collapsed geometry.
- `openspec/config.yaml` does not exist in this repo, so the change continues under the repo’s existing lightweight `openspec/changes/*/explore.md` convention.

### Ready for Proposal
Yes — listo para `sdd-propose`.

Implementation guidance for the next phase:
- preserve `WidgetHeader`, loading state, token usage, and `generateTrendData(...)`
- replace `ResponsiveContainer` with a `ResizeObserver` wrapper
- render manual grid, axes, thresholds, line, area, and last-point ping in SVG
- wire hover exclusively through `ChartHoverLayer`
- extract `smoothPath`, `buildAreaPath`, `formatTick`, `clamp` to `hmi-app/src/utils/chartHelpers.ts`
