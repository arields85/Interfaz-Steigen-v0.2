# Tasks: produccion-historica-fix

## Phase 1: Domain type extension

- [ ] 1.1 Update `hmi-app/src/domain/admin.types.ts` to extend `ProduccionHistoricaDisplayOptions` with `subtitle?`, `productionAxisMin?`, `productionAxisMax?`, `oeeAxisMin?`, `oeeAxisMax?`, `productionVariableKey?`, and `oeeVariableKey?`.
- [ ] 1.2 Update the `productionBarWidth` docstring in `hmi-app/src/domain/admin.types.ts` so it documents factor semantics: clamp to `[0.5, 1.5]`, default `1.0`, multiplied over natural bar width, silently clamped in renderer and dock.

## Phase 2: Widget renderer rewrite

- [ ] 2.1 Rewrite imports and local helpers in `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx`: remove Recharts chart primitives, add `stepBackByBucket(now, bucket, steps)` (`shift = steps * 8h`) and `generateHistoricalSeries(bucket, reference)` with windows `24/15/14/12` and current sin/cos formulas.
- [ ] 2.2 Replace the interval simulation in `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` with `useEffect(() => setRawSeries(generateHistoricalSeries(bucket, new Date())), [bucket])`; keep `groupByTemporalBucket(rawSeries, bucket)` unchanged.
- [ ] 2.3 Add renderer-level domain helpers in `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` to resolve production/OEE domains with per-axis silent autoscale fallback when manual bounds are missing, non-numeric, or `min >= max`.
- [ ] 2.4 Port `BarsModeSvg` locally inside `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` as `ProduccionHistoricaBarsSvg`, using only local duplication and unique IDs `prod-bar-grad-${id}`, `prod-area-grad-${id}`, `oee-grad-${id}`, `oee-clip-${id}`, `oee-glow-${id}`.
- [ ] 2.5 Extend `ProduccionHistoricaBarsSvg` in `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` so production supports `bars | area`: bars keep luminous caps, area renders a smooth filled spline, both use clamped `barWidthFactor = clamp(displayOptions.productionBarWidth ?? 1, 0.5, 1.5)`.
- [ ] 2.6 Render OEE consistently in `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx`: area + smooth line + glow filter + clip path in both production modes, gated by `showOee`, `oeeShowArea`, `oeeShowPoints`, and `showOee && useSecondaryAxis` for right-axis labels.
- [ ] 2.7 Add `animate-ping` circles in `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` on the last production top and last OEE vertex, using explicit `transformOrigin`; in area mode, production ping sits on the last spline vertex.
- [ ] 2.8 Finish the widget shell in `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx`: render `subtitle` under `chartTitle`, gate grid lines with `showGrid`, and mount `ProduccionHistoricaBarsContainer` through a local `ResizeObserver` wrapper.

## Phase 3: PropertyDock branch

- [ ] 3.1 Update exclusion guards in `hmi-app/src/components/admin/PropertyDock.tsx` so `produccion-historica` is hidden from generic `Ícono`, `Unidad`, and generic `Datos`/simulated `Valor`, mirroring the existing `oee-production-trend` pattern.
- [ ] 3.2 Extend the General and Visual sections in `hmi-app/src/components/admin/PropertyDock.tsx` with a `produccion-historica` branch for `Subtítulo`, production mode select, OEE fill switch, OEE points switch, and a token-styled native range slider showing live `×N.N` next to `Ancho de barra`.
- [ ] 3.3 Add dedicated `produccion-historica` `DockSection`s in `hmi-app/src/components/admin/PropertyDock.tsx`: `Datos` (`Origen`, plus `Variable de Producción`/`Variable de OEE` only in `binding.mode === 'real_variable'`), `Series` (`defaultShowOee`, `useSecondaryAxis`), `Escalas` (`autoScale`, four disabled-able manual inputs), and `Layout` (`showGrid`).

## Phase 4: Integration and manual verification

- [ ] 4.1 Run `npx tsc --noEmit` in `hmi-app/` and confirm zero TypeScript errors; do not run build.
- [ ] 4.2 Manually verify in the builder: bars/area parity, OEE glow in both modes, instant bucket regeneration, both pings, full OEE teardown, specialized dock-only sections, autoescala enable/disable behavior, silent invalid-bound fallback, live `×N.N` slider label, multi-instance SVG ID isolation, and coexistence with `oee-production-trend`.
