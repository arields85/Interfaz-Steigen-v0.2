# Tasks: trend-chart-svg-migration

## Phase 1: Extract shared chart helpers

- [ ] 1.1 Create `hmi-app/src/utils/chartHelpers.ts` and move `smoothPath`, `buildAreaPath`, `formatTick`, `clamp`, and `round2` out of `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` without changing their behavior.
- [ ] 1.2 Update `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` to remove the local helper implementations and import the shared helpers from `hmi-app/src/utils/chartHelpers.ts` only.
- [ ] 1.3 Run `npx tsc --noEmit` from `hmi-app/` to verify the helper extraction compiles with zero TypeScript errors before touching `TrendChartWidget.tsx`.

## Phase 2: Rewrite TrendChartWidget to pure SVG

- [ ] 2.1 Refactor `hmi-app/src/widgets/renderers/TrendChartWidget.tsx` imports: remove every Recharts import, keep React hooks, Lucide icons, `WidgetHeader`, domain types, `trendDataGenerator`, `ChartTooltip`, `ChartHoverLayer`, and add imports from `hmi-app/src/utils/chartHelpers.ts`.
- [ ] 2.2 Reorganize the local `TOKEN` constant in `hmi-app/src/widgets/renderers/TrendChartWidget.tsx` so the SVG renderer still uses existing theme tokens for gradients, thresholds, grid, axes, and tooltip-adjacent colors.
- [ ] 2.3 Add an internal `TrendChartSvg` component in `hmi-app/src/widgets/renderers/TrendChartWidget.tsx` with props `widgetId`, `width`, `height`, `data`, `domainMin`, `domainMax`, `thresholds`, `hoveredIndex`, and `onHoverChange`.
- [ ] 2.4 Inside `TrendChartSvg`, implement chart math and defs in dependency order: margins/padding, `toY`/`x0`/`step`, unique SVG ids, line gradient, area gradient, vertical fade mask, glow filter, and horizontal dashed grid lines.
- [ ] 2.5 Finish `TrendChartSvg` rendering with manual threshold lines + `CRIT`/`WARN` labels, smooth masked area path, smooth gradient line path with glow, animate-ping last point, `ChartHoverLayer`, bottom time labels, and left value ticks.
- [ ] 2.6 Add a `TrendChartContainer` ResizeObserver wrapper in `hmi-app/src/widgets/renderers/TrendChartWidget.tsx` that owns `hoverInfo`, exposes `handleHoverChange`, and renders `ChartTooltip` around `TrendChartSvg`.
- [ ] 2.7 Replace the main widget’s `ResponsiveContainer` + `ComposedChart` flow with `TrendChartContainer`, preserving loading state, `WidgetHeader`, data generation, and read-only behavior.
- [ ] 2.8 Run `npx tsc --noEmit` from `hmi-app/` after the rewrite to confirm the pure-SVG migration compiles cleanly.

## Phase 3: Visual verification checklist

- [ ] 3.1 Verify in `hmi-app/src/widgets/renderers/TrendChartWidget.tsx` that the SVG output preserves the blue→purple gradient line, glow, masked area fill, dashed horizontal grid, left Y-axis, bottom X-axis, threshold lines, and `CRIT`/`WARN` labels from the approved spec.
- [ ] 3.2 Verify interactive parity: last-point `animate-ping`, `ChartHoverLayer` vertical indicator + highlight dot, and `ChartTooltip` content all behave correctly across hover states and narrow widths.
- [ ] 3.3 Verify isolation/regression constraints: multiple `TrendChartWidget` instances do not collide on gradient/filter ids, and `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` still renders the same after the helper-import-only change.
