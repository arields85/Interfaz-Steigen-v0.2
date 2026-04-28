# Tasks: dashboard-title widget

## Phase 1: Types

- [x] 1.1 Add dashboard-title domain contract  
  Files: `hmi-app/src/domain/admin.types.ts` — Add `DashboardTitleDisplayOptions`, `DashboardTitleWidgetConfig`, update `WidgetType`, `WidgetConfig`, and `GenericWidgetConfig` exclusions so `displayOptions.fontSize` is typed end-to-end. Dependencies: none.

## Phase 2: Renderer

- [x] 2.1 Write RED renderer tests first  
  Files: `hmi-app/src/widgets/renderers/DashboardTitleWidget.test.tsx` — Before implementation, add failing tests for text-only rendering, default/custom `fontSize`, CSS-variable typography, no shell/header, empty title safety, and `className` forwarding. Dependencies: 1.1. TDD: RED first.

- [x] 2.2 Implement DashboardTitleWidget renderer  
  Files: `hmi-app/src/widgets/renderers/DashboardTitleWidget.tsx` — Create the renderer with only text content, export the default font-size constant, read typography from CSS vars, and keep the widget fully read-only with no `glass-panel` chrome. Dependencies: 2.1. TDD: GREEN to satisfy 2.1, then small refactor only if tests stay green.

## Phase 3: Integration

- [x] 3.1 Register the renderer in the widget dispatcher  
  Files: `hmi-app/src/widgets/WidgetRenderer.tsx` — Import `DashboardTitleWidget` and add the `dashboard-title` case so the typed config resolves to the new renderer without data-binding props. Dependencies: 2.2.

- [x] 3.2 Expose font-size editing in admin properties  
  Files: `hmi-app/src/components/admin/PropertyDock.tsx` — Add the `fontSize` numeric control for `dashboard-title`, persist changes through typed `displayOptions`, and keep it out of data-binding UI because the widget is text-only. Dependencies: 1.1, 2.2.

- [x] 3.3 Make the selection frame square for dashboard-title  
  Files: `hmi-app/src/components/admin/BuilderCanvas.tsx` — Add conditional radius handling so `dashboard-title` uses `0px`/`rounded-none` while other widgets preserve their current rounded selection frame. Dependencies: 3.1.

- [x] 3.4 Add explicit no-data capabilities entry if the team keeps the convention  
  Files: `hmi-app/src/utils/widgetCapabilities.ts` — Register `dashboard-title` with `{ catalogVariable: false, hierarchy: false }` only if explicit per-widget entries are preferred over the current default-false fallback. Dependencies: 1.1.

## Phase 4: Tests

- [x] 4.1 Complete renderer coverage after wiring  
  Files: `hmi-app/src/widgets/renderers/DashboardTitleWidget.test.tsx` — Extend/adjust the co-located suite for final edge cases seen during integration, keeping empty, long, and extreme-size titles safe without adding widget chrome. Dependencies: 3.1, 3.2, 3.3.

- [x] 4.2 Run the widget test suite and confirm GREEN  
  Files: `hmi-app/src/widgets/renderers/DashboardTitleWidget.test.tsx` — Run `npm run test` and verify the new renderer scenarios pass under strict TDD before handing off to implementation/verification. Dependencies: 4.1.
