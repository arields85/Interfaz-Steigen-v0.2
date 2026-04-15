## Verification Report

**Change**: `produccion-historica-fix`  
**Mode**: Standard (Strict TDD disabled; no test runner detected in testing capabilities memory #84)  
**Type check**: Trusted from apply-progress memory #314 (`npx tsc --noEmit` clean; not re-run per verification input)  

---

### 1. Overall verdict

**FAIL**

The scoped widget implementation is mostly aligned with the spec, but acceptance is blocked by two objective issues: (1) the explicit OEE-tooltip teardown requirement cannot be proven because the renderer contains no tooltip implementation at all, and (2) the change is **not isolated** to the agreed file set — multiple baseline files declared “NOT touched” are modified/untracked in git status.

---

### 2. Requirement coverage

#### 2.1 Local Simulation Stream (modified)
- **PASS** — `generateHistoricalSeries(bucket, reference)` exists as a local helper at `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:104-123`.
- **PASS** — window sizes are `hour=24`, `shift=15`, `day=14`, `month=12` at `.../ProduccionHistoricaWidget.tsx:31-36`.
- **PASS** — regeneration effect depends only on `[bucket]` at `.../ProduccionHistoricaWidget.tsx:516-518`.
- **PASS** — `groupByTemporalBucket(rawSeries, bucket)` remains downstream of the one-shot raw series state at `.../ProduccionHistoricaWidget.tsx:514-520`.
- **PASS** — no `setInterval` usage was found in the widget file after full-file scan/search (`ProduccionHistoricaWidget.tsx`, lines `1-633`; search returned no matches).
- **PASS** — last-point ping markers with explicit `transformOrigin` exist for production and OEE at `.../ProduccionHistoricaWidget.tsx:371-413`.

#### 2.2 Production Chart Mode (modified)
- **PASS** — local `ProduccionHistoricaBarsSvg` exists at `.../ProduccionHistoricaWidget.tsx:197-463`.
- **PASS** — both `bars` and `area` production branches are present at `.../ProduccionHistoricaWidget.tsx:321-346`.
- **PASS** — unique SVG IDs derived from `widgetId` exist for `prod-bar-grad`, `prod-area-grad`, `oee-grad`, `oee-clip`, `oee-glow` at `.../ProduccionHistoricaWidget.tsx:272-276`.

#### 2.3 OEE Line Visual Consistency (added)
- **PASS** — smooth spline technique uses shared `smoothPath()` at `.../ProduccionHistoricaWidget.tsx:125-137`, then OEE path generation at `.../ProduccionHistoricaWidget.tsx:253-254`.
- **PASS** — Gaussian blur glow filter is defined at `.../ProduccionHistoricaWidget.tsx:296-302` and applied to the OEE line at `.../ProduccionHistoricaWidget.tsx:348-356`.
- **PASS** — clipPath is defined at `.../ProduccionHistoricaWidget.tsx:293-295` and applied to OEE area/line at `.../ProduccionHistoricaWidget.tsx:317-319, 348-356`.
- **PASS** — the OEE rendering path is shared outside the production-mode branch, so the same treatment runs in both `bars` and `area` modes (`.../ProduccionHistoricaWidget.tsx:317-356` vs production branch `321-346`).
- **PASS** — secondary-axis scaling is gated with `showOee && useSecondaryAxis` at `.../ProduccionHistoricaWidget.tsx:216, 228`.

#### 2.4 Last-Point Liveness Indicator (added)
- **PASS** — production ping `<circle className="animate-ping" />` exists at `.../ProduccionHistoricaWidget.tsx:373-381`.
- **PASS** — OEE ping `<circle className="animate-ping" />` exists behind `showOee` at `.../ProduccionHistoricaWidget.tsx:393-403`.
- **PASS** — explicit `transformOrigin` is set for both at `.../ProduccionHistoricaWidget.tsx:380, 402`, matching the baseline pattern in `hmi-app/src/widgets/renderers/TrendChartWidget.tsx:237-247`.

#### 2.5 PropertyDock Full Branch (added)
- **PASS** — generic `Ícono` exclusion includes `produccion-historica` at `hmi-app/src/components/admin/PropertyDock.tsx:348-350`.
- **PASS** — generic `Unidad` exclusion includes `produccion-historica` at `.../PropertyDock.tsx:392-393`.
- **PASS** — generic `Datos` / simulated `Valor` exclusion includes `produccion-historica` at `.../PropertyDock.tsx:810-811`.
- **PASS** — dedicated `General > Subtítulo` exists at `.../PropertyDock.tsx:253-264`.
- **PASS** — dedicated `Datos` section exists at `.../PropertyDock.tsx:635-699` with `Origen` at `638-646` and real-variable fields at `649-695`.
- **PASS** — dedicated `Series` section exists at `.../PropertyDock.tsx:701-733`.
- **PASS** — dedicated `Visual` sub-block exists at `.../PropertyDock.tsx:463-525`.
- **PASS** — dedicated `Escalas` section exists at `.../PropertyDock.tsx:735-788` with manual inputs disabled while `autoScale !== false` at `754-785`.
- **PASS** — dedicated `Layout` section exists at `.../PropertyDock.tsx:791-807`.

#### 2.6 ProductionBarWidth Factor Semantics (added)
- **PASS** — renderer clamps with `clamp(displayOptions?.productionBarWidth ?? 1, 0.5, 1.5)` at `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:510`.
- **PASS** — the factor multiplies the natural bar width at `.../ProduccionHistoricaWidget.tsx:220-221`.
- **PASS** — dock slider also clamps `0.5–1.5` at `hmi-app/src/components/admin/PropertyDock.tsx:510-518`.

#### 2.7 Manual Scales with Silent Autoscale Fallback (added)
- **PASS** — validity is checked per axis with finite-number + `min < max` logic in `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:171-173`.
- **PASS** — production and OEE domains fall back independently to autoscale at `.../ProduccionHistoricaWidget.tsx:181-194`.

#### 2.8 Real Variables Typed but Not Consumed (added)
- **PASS** — `productionVariableKey?` and `oeeVariableKey?` exist in the type at `hmi-app/src/domain/admin.types.ts:353-354`.
- **PASS** — both are editable in PropertyDock when `binding.mode === 'real_variable'` at `hmi-app/src/components/admin/PropertyDock.tsx:649-695`.
- **PASS** — renderer does not consume these keys; it only generates simulated series via `generateHistoricalSeries()` and local state at `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:104-123, 514-520`.

#### 2.9 Subtitle Display (added)
- **PASS** — `subtitle?` exists in the type at `hmi-app/src/domain/admin.types.ts:340`.
- **PASS** — subtitle is rendered below the title in the widget header at `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:554-566`.

#### 2.10 In-Widget OEE Toggle Full Visual Teardown (modified)
- **PASS** — local `showOee` state is initialized from `defaultShowOee` at `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:513` and toggled locally at `586-596`.
- **PASS** — OEE area is gated by `showOee && oeeShowArea` at `.../ProduccionHistoricaWidget.tsx:317-319`.
- **PASS** — OEE line/glow are gated by `showOee` at `.../ProduccionHistoricaWidget.tsx:348-356`.
- **PASS** — OEE ping is gated by `showOee` at `.../ProduccionHistoricaWidget.tsx:393-413`.
- **PASS** — right-axis labels are gated by `showRightAxis = showOee && useSecondaryAxis` at `.../ProduccionHistoricaWidget.tsx:216, 446-460`.
- **FAIL** — the explicit “tooltip OEE row gated by `showOee`” requirement is **not satisfied/provable**. The renderer contains no tooltip implementation at all; file scan of `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:1-633` and symbol search returned no tooltip branch to gate.

#### 2.11 Isolation from Base Widget (preserved)
- **PASS** — no import from `OeeProductionTrendWidget.tsx` or `TrendChartWidget.tsx` exists in `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:1-14`.
- **PASS** — SVG IDs use non-colliding prefixes `prod-bar-grad-*`, `prod-area-grad-*`, `oee-grad-*`, `oee-clip-*`, `oee-glow-*` at `.../ProduccionHistoricaWidget.tsx:272-276`.

#### 2.12 Read-Only Contract (preserved)
- **PASS** — no fetch/POST/PUT/DELETE/write-side calls were found in `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:1-633` or `hmi-app/src/components/admin/PropertyDock.tsx:1-997`.
- **PASS** — all interactive controls are local UI/configuration toggles/buttons only (`ProduccionHistoricaWidget.tsx:569-596`, `PropertyDock.tsx:229-924`). No plant-control buttons are present.

---

### 3. Task checklist coverage

**Artifact status**: `openspec/changes/produccion-historica-fix/tasks.md` still has every checkbox unchecked (`tasks.md:5-28`), so the checklist artifact itself is stale.

**Objectively complete in code / evidence present**
- **1.1** complete — domain fields added (`admin.types.ts:335-356`).
- **1.2** complete — `productionBarWidth` docstring updated (`admin.types.ts:324-333`).
- **2.1** complete — local helpers + window sizes + no Recharts in widget (`ProduccionHistoricaWidget.tsx:1-14, 31-123`).
- **2.2** complete — interval replaced by `[bucket]` one-shot effect (`ProduccionHistoricaWidget.tsx:516-520`).
- **2.3** complete — per-axis domain resolution (`ProduccionHistoricaWidget.tsx:171-195`).
- **2.4** complete — local SVG port + unique IDs (`ProduccionHistoricaWidget.tsx:197-303`).
- **2.5** complete — `bars | area` production modes + clamped factor (`ProduccionHistoricaWidget.tsx:220-221, 321-346, 510`).
- **2.6** mostly complete — OEE area/line/glow/clip/right-axis gating implemented (`ProduccionHistoricaWidget.tsx:216, 228, 293-302, 317-319, 348-369, 446-460`).
- **2.7** complete — production/OEE ping markers with explicit `transformOrigin` (`ProduccionHistoricaWidget.tsx:371-413`).
- **2.8** complete — subtitle, grid gating, local `ResizeObserver` container (`ProduccionHistoricaWidget.tsx:305-315, 465-490, 554-566`).
- **3.1** complete — exclusion guards added (`PropertyDock.tsx:348-350, 392-393, 810-811`).
- **3.2** complete — subtitle + visual controls + live `×N.N` label (`PropertyDock.tsx:253-264, 463-525`).
- **3.3** complete — dedicated `Datos`, `Series`, `Escalas`, `Layout` sections (`PropertyDock.tsx:635-807`).
- **4.1** complete by recorded evidence — apply-progress memory #314 says `npx tsc --noEmit` was clean.

**Pending / not complete**
- **4.2** pending — manual builder verification was explicitly left pending in apply-progress memory #314 and is not statically verifiable here.

**Not fully accepted despite code presence**
- **2.6 / In-widget teardown** cannot be fully accepted because the spec explicitly mentions tooltip OEE-row teardown and no tooltip implementation exists to validate.

---

### 4. Findings categorized

#### CRITICAL
1. **Spec mismatch on OEE tooltip teardown** — `ProduccionHistoricaWidget.tsx` has no tooltip implementation, so the modified requirement “tooltip OEE row is gated by `showOee`” is not satisfied/provable. Evidence: full renderer file `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:1-633` contains no tooltip branch; OEE gating only covers legend/area/line/ping/axis labels (`317-319`, `348-356`, `393-413`, `446-460`).
2. **Scope isolation violated** — files explicitly declared “NOT touched” are in fact modified/untracked in git status: `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` (`M`), `hmi-app/src/widgets/WidgetRenderer.tsx` (`M`), `hmi-app/src/widgets/renderers/TrendChartWidget.tsx` (`M`), `hmi-app/src/components/admin/WidgetCatalogRail.tsx` (`??`), `hmi-app/src/utils/temporalGrouping.ts` (`??`), `hmi-app/src/widgets/renderers/OeeProductionTrendWidget.tsx` (`??`). Repository evidence: `git status --short -- <listed files>`.

#### WARNING
1. **Manual visual verification missing** — builder UX checks from task 4.2 remain unexecuted. Evidence: apply-progress memory #314 explicitly says manual builder verification is pending.
2. **Tasks artifact not updated** — every checkbox remains unchecked in `openspec/changes/produccion-historica-fix/tasks.md:5-28`, even though most implementation tasks are objectively complete.

#### SUGGESTION
1. **Audit `as any` in changed file** — `hmi-app/src/components/admin/PropertyDock.tsx:139` still uses `(binding as any).unit`; it is outside this widget branch but appears in a changed file and is not justified inline at that exact site.
2. **If tooltip behavior is intentionally removed**, the spec should be amended; if tooltip behavior is still required, implement an explicit tooltip branch and gate the OEE row with `showOee`.

---

### 5. Evidence

- Spec source: `openspec/changes/produccion-historica-fix/spec.md:5-113`
- Design source: `openspec/changes/produccion-historica-fix/design.md:5-313`
- Tasks source: `openspec/changes/produccion-historica-fix/tasks.md:5-28`
- Apply progress source: Engram memory #314
- Domain contract: `hmi-app/src/domain/admin.types.ts:324-356`
- Widget renderer core: `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:31-123, 171-195, 197-463, 493-633`
- PropertyDock branch: `hmi-app/src/components/admin/PropertyDock.tsx:188-195, 229-264, 346-527, 635-811`
- Baseline bars SVG reference: `hmi-app/src/widgets/renderers/OeeProductionTrendWidget.tsx:42-235`
- Baseline animate-ping reference: `hmi-app/src/widgets/renderers/TrendChartWidget.tsx:237-247`

---

### 6. Files NOT touched verification

Result against repository status:

| File | Expected | Observed | Result |
|------|----------|----------|--------|
| `hmi-app/src/widgets/renderers/OeeProductionTrendWidget.tsx` | not touched | `??` in scoped `git status` | **FAIL** |
| `hmi-app/src/widgets/renderers/TrendChartWidget.tsx` | not touched | `M` in scoped `git status` | **FAIL** |
| `hmi-app/src/utils/trendDataGenerator.ts` | not touched | no scoped status entry | **PASS** |
| `hmi-app/src/utils/temporalGrouping.ts` | not touched | `??` in scoped `git status` | **FAIL** |
| `hmi-app/src/widgets/WidgetRenderer.tsx` | not touched | `M` in scoped `git status` | **FAIL** |
| `hmi-app/src/components/admin/WidgetCatalogRail.tsx` | not touched | `??` in scoped `git status` | **FAIL** |
| `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` | not touched | `M` in scoped `git status` | **FAIL** |

**Conclusion**: the “NO se tocan otros archivos” design claim is not true in the current working tree.

---

### 7. Anti-hardcode and anti-parches audit

- **Hex color literals**: none found in the verified changed widget/type surface. Renderer uses tokens via `TOKEN` and `var(--color-*)` (`ProduccionHistoricaWidget.tsx:15-22, 281-292, 338-339`).
- **Font-family literals**: renderer axis labels use `fontFamily="var(--font-chart)"` only (`ProduccionHistoricaWidget.tsx:423, 439, 455`).
- **`// @ts-ignore`**: none found in the verified changed files.
- **`as any` casts**: one found at `PropertyDock.tsx:139` in `handleUnitChange`; not part of the new widget branch, but present in a changed file.
- **Wrong-layer patching**: within the scoped implementation, the widget-specific fixes are placed in the correct layers (type extension in `domain/`, renderer behavior in widget SVG/container, widget-specific dock branch in `PropertyDock`). I did **not** find an obvious layout workaround inside the new `produccion-historica` branch itself. The broader repo status, however, shows scope drift into unrelated files.

---

### Verdict

**FAIL**

The renderer/dock implementation is largely there, but acceptance is blocked by the missing/provably-unsatisfied tooltip teardown requirement and by objective scope drift into files that were explicitly supposed to remain untouched.
