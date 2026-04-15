## Exploration: produccion-historica-fix

### Current State

#### 1. Current state snapshot
- `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` exists and is the defective renderer to correct.
- `hmi-app/src/widgets/renderers/OeeProductionTrendWidget.tsx` contains the visual reference, specifically `BarsModeSvg` at lines 72-236 and `BarsModeContainer` at 241-269.
- `hmi-app/src/components/admin/PropertyDock.tsx` has no `produccion-historica` branch; it only special-cases `oee-production-trend` in the Visual section at 426-438 and excludes that type from generic Visual/Datos fallbacks at 324-325, 368-369, and 547-548.
- `openspec/config.yaml` does not exist in this repository; the active OpenSpec footprint is `openspec/changes/...`.

#### 2. Current `ProduccionHistoricaDisplayOptions` shape
Current definition in `hmi-app/src/domain/admin.types.ts:331-346`:

```ts
export interface ProduccionHistoricaDisplayOptions {
    sourceLabel?: string;
    productionLabel?: string;
    oeeLabel?: string;
    chartTitle?: string;
    productionChartMode?: ProductionChartMode;
    oeeChartMode?: 'line';
    useSecondaryAxis?: boolean;
    autoScale?: boolean;
    showGrid?: boolean;
    oeeShowArea?: boolean;
    oeeShowPoints?: boolean;
    productionBarWidth?: number;
    defaultTemporalGrouping?: TemporalBucket;
    defaultShowOee?: boolean;
}
```

Already present and reusable:
- `productionChartMode`
- `useSecondaryAxis`
- `autoScale`
- `showGrid`
- `oeeShowArea`
- `oeeShowPoints`
- `productionBarWidth`
- `defaultTemporalGrouping`
- `defaultShowOee`
- `sourceLabel`, `productionLabel`, `oeeLabel`, `chartTitle`

#### 3. Current `oee-production-trend` PropertyDock pattern
Pattern source in `hmi-app/src/components/admin/PropertyDock.tsx`:
- Visual section hides generic `Ícono` for `oee-production-trend` via `style={{ display: selectedWidget.type === 'oee-production-trend' ? 'none' : undefined }}` at 324-367.
- Visual section hides generic `Unidad` for `oee-production-trend` via condition at 368-412.
- Visual section adds dedicated `Volumen` select for `volumeChartMode` at 426-438.
- Datos section is entirely skipped for `oee-production-trend` via condition at 547-548.

### Affected Areas
- `hmi-app/src/domain/admin.types.ts` — extend `ProduccionHistoricaDisplayOptions` with dock-only configuration fields missing today.
- `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` — replace Recharts mixed implementation with SVG-driven chart core, static historical simulation, and live ping markers.
- `hmi-app/src/components/admin/PropertyDock.tsx` — add full widget-specific editing branch and exclude generic fallbacks.
- `hmi-app/src/utils/temporalGrouping.ts` — read-only reference; no change required.

### Defect-by-defect analysis

#### Defect 1 — Bars look plain
**What is wrong today**
- `ProduccionHistoricaWidget.tsx:390-401` renders production with Recharts `<Bar>`.
- `ProduccionHistoricaWidget.tsx:337-344` defines only a simple vertical gradient.
- Result: no bright top cap, no manual layout, no OEE background area/line layering, no clip path, no glow, and generic Recharts geometry.

**Reference pattern**
- `OeeProductionTrendWidget.tsx:72-236` `BarsModeSvg` is the target.
- Bar body gradient: 152-155.
- Bright top cap with drop shadow: 193-200.
- OEE background area behind bars: 177-180.
- OEE glowing line: 181-184.
- Clip path: 156-159.
- Glow filter: 160-167.
- Symmetric horizontal padding and bar width formula: 101-105.
- Manual X and Y labels: 205-233.

**Minimal delta required**
- Remove the `Bar`-based rendering path from `ProduccionHistoricaWidget.tsx`.
- Duplicate `BarsModeSvg` locally as `ProduccionHistoricaBarsSvg` and `BarsModeContainer` as a local measuring wrapper.
- Parameterize the duplicated SVG for:
  - `productionChartMode: 'bars' | 'area'`
  - `showOee`
  - `showGrid`
  - `oeeShowArea`
  - `oeeShowPoints`
  - `useSecondaryAxis`
  - `autoScale/manual domains`
  - `productionBarWidth`
- Keep all production/OEE drawing inside raw SVG so bars mode and area mode share the same OEE line treatment.

**Edge cases**
- `data.length < 2` must render null or safe empty state inside SVG helper.
- Very narrow widgets need a minimum bar width/fallback spacing to avoid overlap.
- When `showOee === false`, the SVG must also hide OEE area, line, ping, and right-axis labels.
- Manual domains must not invert when min/max are missing or invalid; implementation should fall back safely.

#### Defect 2 — Simulation runs too fast and rewinds
**What is wrong today**
- `ProduccionHistoricaWidget.tsx:223-246` uses `setInterval(900)`.
- `ProduccionHistoricaWidget.tsx:227, 233, 240` progressively appends data and resets to the first point.
- This creates artificial rewind/fast-forward behavior the user explicitly rejected.

**Reference pattern**
- `TrendChartWidget.tsx:105-109` generates the full series once with `useMemo`.
- `TrendChartWidget.tsx:228-258` gives the live feel only through an `animate-ping` marker on the last point.
- `trendDataGenerator.ts:23-53` is pure generation with no timer or append loop.

**Minimal delta required**
- Replace `buildSimulatedSeries` with `generateHistoricalSeries(bucket, reference)`.
- Replace the interval effect with a single-shot effect depending on `[bucket]` only.
- On mount/bucket change, compute the full window and `setRawSeries(fullWindow)` once.
- Add a last-point `animate-ping` marker to the final OEE point and final production point/bar top.

**Edge cases**
- Bucket changes must regenerate from a fresh `reference` date.
- The generator must be deterministic for a given `(bucket, reference)` during one render cycle.
- No accidental dependency on `displayOptions` or `showOee`; otherwise the series would regenerate unnecessarily.

#### Defect 3 — PropertyDock shows generic sections
**What is wrong today**
- General section only exposes `Subtítulo` for `kpi`/`metric-card` at `PropertyDock.tsx:228-252`.
- Visual generic `Ícono` fallback is only excluded for `oee-production-trend` at `324-367`.
- Visual generic `Unidad` fallback is only excluded for `alert-history` and `oee-production-trend` at `368-412`.
- Datos fallback still applies to `produccion-historica` because exclusion only covers `alert-history` and `oee-production-trend` at `547-661`.
- The generic simulated `Valor` field at `562-629` is wrong for this widget because there is no single scalar value.

**Reference pattern**
- `PropertyDock.tsx:426-438` shows the existing dedicated `oee-production-trend` block inside Visual.
- `PropertyDock.tsx:547-548` shows the exclusion style for generic Datos.

**Minimal delta required**
- Add `produccion-historica` to all relevant exclusions for generic `Ícono`, `Unidad`, generic Datos, and generic simulated `Valor` handling.
- Add a full widget-specific branch with these sections:
  - General
  - Datos
  - Series
  - Visualización
  - Escalas
  - Layout
- Reuse existing `DockSection` and render dedicated sections only when `selectedWidget.type === 'produccion-historica'`.

**Edge cases**
- Real-mode variable selectors for production/OEE should appear only when binding mode is `real_variable`.
- If no equipment is selected, variable selectors must remain hidden or empty safely.
- Scale min/max inputs must be disabled while `autoScale === true`.

#### Enhancement 4 — OEE line in AREA mode must match bars-mode SVG treatment
**What is wrong today**
- `ProduccionHistoricaWidget.tsx:416-440` uses Recharts `<Area>` + `<Line>` for OEE.
- The line is simple stroke only, without SVG glow filter, manual clip path, or guaranteed visual parity with bars mode.
- In area mode, production also stays inside Recharts area rendering, so the chart language diverges from bars mode.

**Reference pattern**
- `OeeProductionTrendWidget.tsx:116-125` builds smooth SVG paths.
- `OeeProductionTrendWidget.tsx:156-167` defines clip and glow.
- `OeeProductionTrendWidget.tsx:177-184` renders area + glowing line.

**Minimal delta required**
- Use the same raw-SVG path pipeline for OEE in both production modes.
- In `productionChartMode === 'area'`, draw production as its own smooth filled SVG area path instead of Recharts `<Area>`.
- Keep OEE path generation identical in both modes.

**Edge cases**
- OEE fill respects `oeeShowArea`; line stays visible when `showOee === true`.
- `oeeShowPoints` should add optional point markers on the OEE path, but the last-point ping stays regardless when OEE is visible.

### Extraction strategy for `BarsModeSvg`

#### Recommended duplication target
- New local component name: `ProduccionHistoricaBarsSvg`.
- Wrapper: `ProduccionHistoricaSvgContainer` (or equivalent local ResizeObserver wrapper).

#### Required props / parameters
- `width`, `height`
- `data: TemporalGroupedPoint[]`
- `widgetId: string`
- `productionChartMode`
- `showOee`
- `showGrid`
- `oeeShowArea`
- `oeeShowPoints`
- `useSecondaryAxis`
- `productionBarWidth`
- `productionDomain`
- `oeeDomain`
- `productionLabel`
- `oeeLabel`

#### Unique SVG IDs per widget instance
- `prod-bar-grad-${widget.id}`
- `oee-grad-${widget.id}`
- `oee-clip-${widget.id}`
- `oee-glow-${widget.id}`
- If production area gets its own gradient/mask, use a widget-scoped ID too (for example `prod-area-grad-${widget.id}`) to avoid collisions.

#### Visibility rules
- `showOee === false` must hide:
  - OEE background area
  - OEE line
  - OEE point markers
  - OEE ping marker
  - right Y-axis labels
- `showGrid === false` must suppress horizontal grid lines only.

#### Production mode at SVG level
- `'bars'` → render bars exactly like `BarsModeSvg`: body gradient + luminous cap.
- `'area'` → render production as a smooth filled SVG area path using the same manual coordinate system; no Recharts `<Area>`.
- In both modes, OEE line uses the same smooth path + glow + clip pipeline.

#### Layout / scale strategy
- Preserve the reference horizontal layout math from `OeeProductionTrendWidget.tsx:101-105`:
  - `barW = max((plotWidth / data.length) * 0.35, 8)` as base formula
  - `padX = barW * 1.0`
- For this widget, `productionBarWidth` should override or cap the computed bar width consciously. Recommended rule: use the display option as the desired pixel width, but clamp it so it never exceeds the available step bandwidth.

### Simulation strategy

#### New function
```ts
generateHistoricalSeries(bucket: TemporalBucket, reference: Date): TemporalTrendPoint[]
```

#### Window sizes
Keep current `WINDOW_SIZE` from `ProduccionHistoricaWidget.tsx:42-47` unchanged unless design finds a concrete UX issue:
- `hour = 24`
- `shift = 15`
- `day = 14`
- `month = 12`

#### Date stepping
- Reuse the current local helper behavior from `moveDateByBucket` at `110-127`.
- It can stay local and be renamed to better reflect the pure generation role, but no `temporalGrouping.ts` change is needed.

#### Values generation
- Reuse the existing correlated formulas from `buildSimulatedSeries` at `137-148`:
  - seasonal `Math.sin(...)`
  - micro noise `Math.sin(index * 0.61)`
  - drift `Math.cos(index * 0.27)`
  - correlated production formula using OEE
- Only behavioral change: run once per bucket/reference instead of incrementally.

#### Effect contract
- `useEffect(..., [bucket])` only.
- No `setInterval`, no append, no rewind.
- Inside effect:
  - create `reference = new Date()`
  - `setRawSeries(generateHistoricalSeries(bucket, reference))`

#### Last-point liveness
- Add `animate-ping` SVG circles on:
  - the final OEE point, when OEE is visible
  - the final production point/top (bar top in bars mode, final path point in area mode)
- This mirrors the `TrendChartWidget.tsx:228-258` pattern and keeps the history static while still feeling alive.

### Domain type extensions required

#### New fields that must be added to `ProduccionHistoricaDisplayOptions`
- `subtitle?: string`
- `productionAxisMin?: number`
- `productionAxisMax?: number`
- `oeeAxisMin?: number`
- `oeeAxisMax?: number`
- `productionVariableKey?: string`
- `oeeVariableKey?: string`

#### Why each is needed
- `subtitle` — required by PropertyDock General section.
- `productionAxisMin/Max` and `oeeAxisMin/Max` — required by Escalas manual fields.
- `productionVariableKey/oeeVariableKey` — required because widget-wide `binding.variableKey` can only represent one real variable, while this widget needs two.

#### Fields already present and confirmed usable
- `productionChartMode`
- `useSecondaryAxis`
- `autoScale`
- `showGrid`
- `oeeShowArea`
- `oeeShowPoints`
- `productionBarWidth`
- `defaultTemporalGrouping`
- `defaultShowOee`
- `sourceLabel`, `productionLabel`, `oeeLabel`, `chartTitle`

#### Binding decision
- Reuse `widget.binding.mode` for `Origen` (`real_variable | simulated_value`).
- Do **not** invent a separate widget-specific origin enum.
- Store the two real-data variable selections in `displayOptions.productionVariableKey` and `displayOptions.oeeVariableKey`.
- Renderer can continue using simulated visuals only in this corrective phase; real-mode selectors are configuration debt intentionally typed ahead of backend wiring.

### PropertyDock branch plan

#### Recommended structure
Use the existing `DockSection` primitive and add dedicated sections rendered only for `selectedWidget.type === 'produccion-historica'`.

Why this is cleaner:
- keeps the generic sections intact for other widget types,
- matches the file’s current type-guarded style,
- avoids forcing large generic branches to understand a highly specialized dual-series widget.

#### Exclusions to add
- Exclude `produccion-historica` from generic `Ícono` fallback.
- Exclude `produccion-historica` from generic `Unidad` fallback.
- Exclude `produccion-historica` from generic `Datos` fallback block.
- Exclude `produccion-historica` from the generic single simulated `Valor` concept.

#### Dedicated sections and controls
- **General**
  - `Título` → `selectedWidget.title`
  - `Subtítulo` → `displayOptions.subtitle`
- **Datos**
  - `Origen` → `widget.binding.mode`
  - if `real_variable`:
    - `Equipo` → `binding.assetId`
    - `Variable de Producción` → `displayOptions.productionVariableKey`
    - `Variable de OEE` → `displayOptions.oeeVariableKey`
  - if `simulated_value`: no single `Valor` field
- **Series**
  - `Mostrar OEE` switch → `displayOptions.defaultShowOee` as structural default
  - `Usar eje secundario para OEE` switch → `displayOptions.useSecondaryAxis`
- **Visualización**
  - `Visualización Producción` select → `productionChartMode`
  - `Mostrar relleno bajo línea OEE` switch → `oeeShowArea`
  - `Mostrar puntos en OEE` switch → `oeeShowPoints`
  - `Ancho de barra Producción` slider/range → `productionBarWidth`
- **Escalas**
  - `Autoescala` switch → `autoScale`
  - `Eje Producción MIN/MAX` → `productionAxisMin` / `productionAxisMax`
  - `Eje OEE MIN/MAX` → `oeeAxisMin` / `oeeAxisMax`
  - four inputs disabled while `autoScale === true`
- **Layout**
  - `Mostrar grilla` switch → `showGrid`

#### Control component viability
- `AdminNumberInput` **does support** `disabled` (`AdminNumberInput.tsx:11-19, 71-83`). So Escalas manual fields can use it directly.
- There is **no** `AdminSlider` under `hmi-app/src/components/admin/`.
- Recommendation: use a local native `<input type="range">` styled with existing tokens/classes instead of creating a new component in this corrective change.

### Approaches
1. **Full local SVG port in `ProduccionHistoricaWidget`** — duplicate `BarsModeSvg` and adapt it for both production modes.
   - Pros: matches binding decisions, isolates corrective work, preserves `oee-production-trend` untouched, guarantees visual parity.
   - Cons: intentional duplication.
   - Effort: Medium

2. **Refactor shared SVG primitive first** — extract common chart engine and retrofit both widgets.
   - Pros: less duplication long-term.
   - Cons: violates bound decision, widens scope, risks regressions in accepted widget.
   - Effort: High

### Recommendation
Proceed with **Approach 1: full local SVG port in `ProduccionHistoricaWidget`**.

That is the correct layer. It fixes the rejected widget without reopening the accepted one, preserves the orchestrator’s binding decisions, and eliminates the current visual split between bars mode and area mode by moving both through one SVG pipeline.

### File inventory
- **Modify** `hmi-app/src/domain/admin.types.ts`
  - extend `ProduccionHistoricaDisplayOptions`
- **Modify** `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx`
  - major rewrite: SVG renderer, static history generation, ping markers, manual domains
- **Modify** `hmi-app/src/components/admin/PropertyDock.tsx`
  - dedicated branch + exclusions + specialized sections
- **No change expected** `hmi-app/src/utils/temporalGrouping.ts`
  - current helper contracts are sufficient

Do **not** touch:
- `hmi-app/src/widgets/renderers/OeeProductionTrendWidget.tsx`
- `hmi-app/src/widgets/renderers/TrendChartWidget.tsx`
- `hmi-app/src/utils/trendDataGenerator.ts`
- `hmi-app/src/widgets/WidgetRenderer.tsx`
- `hmi-app/src/components/admin/WidgetCatalogRail.tsx`
- `hmi-app/src/pages/admin/DashboardBuilderPage.tsx`

### Risks
- `productionBarWidth` must be reconciled with the reference `barW` formula so the slider cannot break spacing.
- `animate-ping` inside raw SVG should work, but the implementation must set `transformOrigin` the same way `TrendChartWidget` does if needed for stable animation.
- Real-mode variable selectors will be typed and editable before the renderer consumes them; that debt must be explicit in spec/design.
- Manual domain validation needs a clear fallback when min/max are absent, inverted, or partially filled.
- If OEE is hidden while `useSecondaryAxis === false`, left-axis scaling must still reflect production only.

### Token inventory
Confirmed present in `hmi-app/src/index.css`:
- `--color-widget-gradient-from` at 140
- `--color-widget-gradient-to` at 141
- `--color-widget-icon` at 155
- `--color-industrial-bg` at 108
- `--color-industrial-border` at 111
- `--color-industrial-muted` at 114
- `--color-industrial-text` at 113
- `--color-chart-grid` at 115
- `--color-accent-cyan` at 117
- `--font-chart` at 164

No missing token was found for the requested corrective plan.

### Ready for Proposal
Yes — ready for `sdd-propose`.
