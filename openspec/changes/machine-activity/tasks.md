# Tasks: Actividad de Máquina

## Phase 1: Foundation — Types & Pure Logic

### T-01 — Add machine-activity domain types
- **Description**: Add `ProductiveState`, `MachineActivityDisplayOptions`, `MachineActivityWidgetConfig`, and `'machine-activity'` to `WidgetType`/`WidgetConfig` without breaking existing widget unions.
- **Files**: `hmi-app/src/domain/admin.types.ts`
- **Dependencies**: None
- **Testing**: Type coverage only; validated later by `npx tsc -b`
- **Status**: completed

### T-02 — RED: write pure logic tests first
- **Description**: Create failing TDD tests for `calculateActivityIndex`, `determineProductiveState`, and `smoothValue`, covering clamps, invalid input, threshold equality, hysteresis, and moving-average windows.
- **Files**: `hmi-app/src/widgets/utils/machineActivity.test.ts`
- **Dependencies**: T-01
- **Testing**: `npm run test -- machineActivity.test.ts`
- **Status**: completed

### T-03 — GREEN: implement index and smoothing helpers
- **Description**: Implement `calculateActivityIndex(power, min, max)` and `smoothValue(values, window)` in a widget-local pure module, matching spec defaults and safe invalid-data behavior.
- **Files**: `hmi-app/src/widgets/utils/machineActivity.ts`
- **Dependencies**: T-02
- **Testing**: Make T-02 pass for interpolation, clamp, invalid, and window cases
- **Status**: completed

### T-04 — GREEN: implement productive-state resolver
- **Description**: Implement `determineProductiveState(power, thresholds, hysteresis, previousState)` with upward equality and downward hysteresis thresholds, preserving stable states around flicker zones.
- **Files**: `hmi-app/src/widgets/utils/machineActivity.ts`
- **Dependencies**: T-02
- **Testing**: Make T-02 pass for stopped/calibrating/producing and hysteresis scenarios
- **Status**: completed

## Phase 2: Gauge Extraction — Shared Primitive

### T-05 — Add GaugeDisplay smoke test
- **Description**: Add a smoke test for circular and bar rendering, value/unit output, and transition classes before refactoring KPI.
- **Files**: `hmi-app/src/components/ui/GaugeDisplay.test.tsx`
- **Dependencies**: None
- **Testing**: `npm run test -- GaugeDisplay.test.tsx`
- **Status**: completed

### T-06 — Extract GaugeDisplay primitive
- **Description**: Create presentational `GaugeDisplay` for circular/bar modes using shared geometry, color, gradient, and animation props only.
- **Files**: `hmi-app/src/components/ui/GaugeDisplay.tsx`
- **Dependencies**: T-05
- **Testing**: Make T-05 pass
- **Status**: completed

### T-07 — Refactor KPI to consume GaugeDisplay
- **Description**: Replace inline KPI gauge implementations with `GaugeDisplay` while preserving current layout, gradients, glow, typography, and transitions.
- **Files**: `hmi-app/src/widgets/renderers/KpiWidget.tsx`
- **Dependencies**: T-06
- **Testing**: Re-run `GaugeDisplay.test.tsx`; manual KPI regression check in circular and bar modes
- **Status**: completed

## Phase 3: Widget Hook & Color Logic

### T-08 — Add state visuals and animation mapping
- **Description**: Add CSS-token-only color mapping and animation intensity presets per productive state, keeping labels and visuals centralized for the widget.
- **Files**: `hmi-app/src/widgets/utils/machineActivity.ts`
- **Dependencies**: T-04
- **Testing**: Extend `machineActivity.test.ts` only if pure visual mapping helpers are exported
- **Status**: completed

### T-09 — Implement useMachineActivity hook
- **Description**: Build `useMachineActivity` to orchestrate smoothing, confirmation timing, productive state, activity index, invalid-data fallback, and dynamic/static visual selection.
- **Files**: `hmi-app/src/hooks/useMachineActivity.ts`
- **Dependencies**: T-03, T-04, T-08
- **Testing**: Covered through renderer test unless hook-specific edge cases require `useMachineActivity.test.ts`
- **Status**: completed

## Phase 4: Widget Renderer

### T-10 — RED: add machine-activity render test
- **Description**: Add a renderer test with mock binding data for valid and invalid power states, asserting header/subtitle, index, footer power text, and safe no-data UI.
- **Files**: `hmi-app/src/widgets/renderers/MachineActivityWidget.test.tsx`
- **Dependencies**: T-01, T-06
- **Testing**: `npm run test -- MachineActivityWidget.test.tsx`
- **Status**: completed

### T-11 — Implement MachineActivityWidget renderer
- **Description**: Create the renderer with `glass-panel`, `WidgetHeader`, `WidgetCenteredContentLayout`, `GaugeDisplay`, activity index overlay, and footer/subtitle behavior per spec.
- **Files**: `hmi-app/src/widgets/renderers/MachineActivityWidget.tsx`
- **Dependencies**: T-06, T-09, T-10
- **Testing**: Make T-10 pass
- **Status**: completed

## Phase 5: Widget Registration & Defaults

### T-12 — Register widget across builder flow
- **Description**: Wire renderer dispatch, catalog entry, builder defaults, and non-hierarchical/non-catalog capabilities for `machine-activity`.
- **Files**: `hmi-app/src/widgets/WidgetRenderer.tsx`, `hmi-app/src/components/admin/WidgetCatalogRail.tsx`, `hmi-app/src/pages/admin/DashboardBuilderPage.tsx`, `hmi-app/src/utils/widgetCapabilities.ts`
- **Dependencies**: T-01, T-11
- **Testing**: Renderer test still passes; verify builder creates default `machine-activity` config shape
- **Status**: completed

## Phase 6: Properties Panel

### T-13 — Extend PropertyDock for machine-activity editing
- **Description**: Clone KPI General + Datos flows, then add `Estados Productivos`, `Escala Visual`, `Visualización`, and `Textos` sections with typed fields and toggles.
- **Files**: `hmi-app/src/components/admin/PropertyDock.tsx`
- **Dependencies**: T-01, T-12
- **Testing**: Manual admin smoke check; add co-located tests only if existing dock coverage patterns already exist
- **Status**: completed

## Phase 7: Theme Tokens

### T-14 — Add productive-state theme tokens if missing
- **Description**: Add semantic `@theme` color tokens for stopped, calibrating, and producing gradients used by machine-activity state visuals.
- **Files**: `hmi-app/src/index.css`
- **Dependencies**: T-08
- **Testing**: Visual verification through widget renderer and KPI regression pass
- **Status**: completed

## Phase 8: Verification

### T-15 — Run verification suite and regression checks
- **Description**: Run widget-focused tests, full `npm run test`, and `npx tsc -b` from `hmi-app/`, then manually confirm KPI visuals did not drift after gauge extraction.
- **Files**: `hmi-app/src/widgets/utils/machineActivity.test.ts`, `hmi-app/src/components/ui/GaugeDisplay.test.tsx`, `hmi-app/src/widgets/renderers/MachineActivityWidget.test.tsx`, `hmi-app/src/widgets/renderers/KpiWidget.tsx`
- **Dependencies**: T-07, T-13, T-14
- **Testing**: `npm run test`; `npx tsc -b`; manual KPI circular/bar regression check
- **Status**: pending
