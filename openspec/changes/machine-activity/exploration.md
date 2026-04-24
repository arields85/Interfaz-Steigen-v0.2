## Exploration: Widget "Actividad de Máquina"

### Current State
1. **KPI Widget Anatomy**
   - `hmi-app/src/widgets/renderers/KpiWidget.tsx` is the full KPI renderer; there is **no KPI-specific resolver**. It calls the shared `resolveBinding()` from `hmi-app/src/widgets/resolvers/bindingResolver.ts` and then does local numeric normalization.
   - Visual shell: root `div` uses `glass-panel group relative p-5 w-full h-full` and centers content with `WidgetCenteredContentLayout`.
   - Header: `WidgetHeader` with `title`, optional `subtitle`, optional Lucide icon, and dynamic `iconColor`. KPI keeps `subtitle` in the header and `subtext` as an absolutely positioned footer label.
   - Main body has two local render paths:
     - `CircularKpi()` — inline SVG radial arc with local `<defs>` gradients, glow filter, center value, unit, and `transition-all duration-500 ease-out`.
     - `BarKpi()` — horizontal bar fill with the same value/unit typography and 500ms transitions.
   - KPI-specific logic living inside the renderer:
     - string/number → numeric conversion
     - dynamic threshold color selection via local `getDynamicColors()`
     - icon mapping from displayOptions string to Lucide icon
     - radial/bar rendering
   - Shared primitives actually reused today:
     - `hmi-app/src/components/ui/WidgetHeader.tsx`
     - `hmi-app/src/components/ui/WidgetCenteredContentLayout.tsx`
     - `glass-panel` from `hmi-app/src/index.css`
   - Important finding: the **radial gauge is NOT a shared primitive yet**; it is embedded inside `KpiWidget.tsx`.

2. **Widget System**
   - Widget dispatch is centralized in `hmi-app/src/widgets/WidgetRenderer.tsx`. Pages and builder import only this dispatcher (also re-exported by `hmi-app/src/widgets/index.ts`).
   - `WidgetType` is defined in `hmi-app/src/domain/admin.types.ts`. To add a new widget you must extend the union and create a discriminated config variant with typed `displayOptions`.
   - Builder catalog entry is currently the rail in `hmi-app/src/components/admin/WidgetCatalogRail.tsx`; it is a static `ACTIONS` array of `{ type, label, icon }`.
   - Builder creation defaults live in `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` inside `handleAddWidget()`, which sets default size/binding/displayOptions by widget type.
   - Header compatibility is separate: `hmi-app/src/utils/headerWidgets.ts` currently allows only `status` and `connection-status` in header slots.

3. **Properties System**
   - `displayOptions` are strictly typed in `hmi-app/src/domain/admin.types.ts` (`KpiDisplayOptions`, etc.).
   - Actual admin editing is done in `hmi-app/src/components/admin/PropertyDock.tsx`; there is **no current `PropertiesPanel.tsx`** in the codebase even though older docs mention it.
   - `PropertyDock` is the single write point for `displayOptions` through `handleDisplayOptionChange()`.
   - KPI-specific PropertyDock fields:
     - General: `title`, `subtitle`, `subtext`, `icon`, `kpiMode`
     - Range: `min`, `max`, `dynamicColor`
     - Thresholds: warning/critical values and `deadbandPercent`
     - Data: binding mode, unit, machine, variable, simulated value
   - Capability-gated data UI comes from `hmi-app/src/utils/widgetCapabilities.ts`. Today:
     - `kpi`: `catalogVariable: false`, `hierarchy: false`
     - `metric-card`: `catalogVariable: true`, `hierarchy: true`

4. **Data Resolution**
   - Renderer flow is `WidgetConfig -> resolveBinding() -> ResolvedBinding -> renderer-specific presentation`.
   - `resolveBinding()` supports:
     - no binding -> `no-data`
     - `simulated_value` -> direct config value
     - `real_variable` -> either Node-RED/contract machine path (`machineId + variableKey + bindingVersion`) or legacy `equipmentMap` path (`assetId + variableKey`)
   - Threshold status comes from `evaluateThresholds()` in `thresholdEvaluator.ts` and returns `MetricStatus` (`normal | warning | critical | stale | no-data`).
   - KPI gets its numeric value by resolving `resolved.value` and then locally converting:
     - `number` -> as is
     - numeric string -> `parseFloat`
     - invalid string -> `0`
     - `null` -> `null`
   - Catalog variables exist in `hmi-app/src/domain/variableCatalog.types.ts` and are used mainly for semantic binding / hierarchy aggregation. KPI does **not** participate today because its capabilities are disabled.
   - Hierarchy aggregation is implemented generically in `hmi-app/src/widgets/resolvers/hierarchyResolver.ts`, but KPI does not consume it.

5. **Visual Primitives Available**
   - Theme tokens live in `hmi-app/src/index.css` `@theme` block.
   - Relevant semantic widget tokens:
     - Base metric gradient: `--color-widget-gradient-from`, `--color-widget-gradient-to`
     - Dynamic threshold gradients: `--color-dynamic-normal-*`, `--color-dynamic-warning-*`, `--color-dynamic-critical-*`
     - Status colors: `--color-status-normal`, `--color-status-warning`, `--color-status-critical`
     - Neutral icon color: `--color-widget-icon`
     - Typography token: `--font-widget-value`, `--font-weight-widget-value`
   - Base surface primitive: `.glass-panel` in `index.css` with blur, radius, border, hover lightening, and `isolation: isolate`.
   - Shared layout/header primitives:
     - `WidgetHeader`
     - `WidgetCenteredContentLayout`
   - Shared chart primitives available for other widget families:
     - `hmi-app/src/components/ui/ChartTooltip.tsx`
     - `hmi-app/src/components/ui/ChartHoverLayer.tsx`
   - Existing animation patterns:
     - KPI arc/bar transitions: `transition-all duration-500 ease-out`
     - chart pulse markers: `animate-ping`
     - hover handling in chart widgets via local `useState` + `ResizeObserver`

6. **Reuse Opportunities**
   - Safe to reuse directly from KPI:
     - `glass-panel` shell
     - `WidgetHeader`
     - `WidgetCenteredContentLayout`
     - icon selection pattern
     - threshold color token language
     - value typography tokens
   - Safe to reuse logically from the widget system:
     - shared `resolveBinding()`
     - `MetricStatus` / threshold evaluation
     - PropertyDock editing pattern
     - WidgetRenderer registration path
   - Likely needs to be **new**, not copied 1:1:
     - widget type and domain config (`machine-activity`)
     - dedicated `displayOptions` contract
     - dedicated renderer identity and behavior
     - machine-activity-specific visual/state logic
   - Best extraction candidate if implementation goes forward:
     - split KPI internals into reusable low-level primitives/helpers (icon mapping, dynamic color resolver, maybe radial surface/value typography), while keeping `machine-activity` as a distinct renderer.

7. **Risks & Considerations**
   - Biggest architectural risk: copying `KpiWidget.tsx` wholesale will duplicate gauge math, gradients, icon mapping, and threshold color logic because there is no shared radial primitive yet.
   - KPI currently has disabled catalog/hierarchy capabilities. If `Actividad de Máquina` needs semantic catalog binding or hierarchy aggregation, that must be explicitly enabled in `widgetCapabilities.ts` and supported in its PropertyDock UX.
   - KPI performs local numeric coercion and converts invalid strings to `0`; for machine activity this may be wrong if non-numeric/unknown states must stay distinct.
   - Existing hysteresis/deadband is only used by `alertHistoryEvaluator.ts` for historical event recording, **not** for widget visual state. If machine activity needs smoothing/hysteresis/state memory, that logic will be new.
   - Header support is not automatic; new widgets are grid-only unless explicitly added to `headerWidgets.ts`.
   - Docs mention `PropertiesPanel.tsx`, but current implementation uses `PropertyDock.tsx`; proposal/design should target the real code path, not the old doc wording.

### Affected Areas
- `hmi-app/src/widgets/renderers/KpiWidget.tsx` — technical/visual baseline to study and partially reuse.
- `hmi-app/src/widgets/WidgetRenderer.tsx` — central renderer dispatch; must register the new widget.
- `hmi-app/src/domain/admin.types.ts` — new `WidgetType`, widget config, and `displayOptions` typing.
- `hmi-app/src/components/admin/WidgetCatalogRail.tsx` — widget catalog entry in the admin rail.
- `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` — default widget creation and default size/binding.
- `hmi-app/src/components/admin/PropertyDock.tsx` — widget-specific admin fields and displayOptions editing.
- `hmi-app/src/utils/widgetCapabilities.ts` — opt-in for catalog/hierarchy support if needed.
- `hmi-app/src/widgets/resolvers/bindingResolver.ts` — shared data resolution path the new widget will likely reuse.
- `hmi-app/src/index.css` — semantic tokens and surface primitives; source of truth for color/typography.

### Approaches
1. **Dedicated renderer built on shared shell primitives** — create `MachineActivityWidget.tsx` as a new renderer, reuse `glass-panel`, `WidgetHeader`, `WidgetCenteredContentLayout`, `resolveBinding()`, and only extract tiny helpers if duplication becomes obvious.
   - Pros: preserves widget identity, low coupling with KPI, minimal risk to existing KPI behavior, easiest to evolve custom activity logic.
   - Cons: some duplicate gauge/value logic may remain at first.
   - Effort: Medium.

2. **Extract KPI internals into shared radial/activity primitives first** — refactor KPI before creating the new widget, then compose both renderers from shared gauge/color helpers.
   - Pros: cleaner long-term reuse, less duplication, better primitive architecture.
   - Cons: higher upfront risk because it touches working KPI code before the new widget exists; broader test surface.
   - Effort: High.

### Recommendation
Use **Approach 1** first: build `Actividad de Máquina` as a brand-new widget type and renderer, but reuse the existing shell/data primitives (`glass-panel`, `WidgetHeader`, `WidgetCenteredContentLayout`, `resolveBinding()`, threshold tokens). If repeated internals become obvious during implementation, extract only the stable low-level pieces afterward. That keeps identity and behavior separate without destabilizing current KPI code.

### Risks
- No shared radial primitive exists today, so naive reuse can turn into copy-paste duplication.
- KPI currently ignores catalog/hierarchy capabilities; requirements must clarify whether machine-activity should stay simple like KPI or become catalog-aware like metric-card.
- Any stateful behavior (hysteresis, smoothing, machine-state memory) will be net-new logic; there is no existing widget-side state machine to plug into.
- Older docs reference `PropertiesPanel`, but the live admin path is `PropertyDock`.

### Ready for Proposal
Yes — the codebase is clear enough to write a proposal. The next phase should define the exact behavior contract for `machine-activity`: source shape (numeric vs categorical), whether it uses thresholds, whether it needs hysteresis/smoothing, and whether it should support catalog variable / hierarchy modes.
