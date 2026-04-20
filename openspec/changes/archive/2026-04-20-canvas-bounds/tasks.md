# Tasks: canvas-bounds

## Phase 0 — Rebrand (steigen → laboratorio)
- [x] 0.1 Rename storage keys in `hmi-app/src/services/DashboardStorageService.ts`, `TemplateStorageService.ts`, `VariableCatalogStorageService.ts`, `HierarchyStorageService.ts`, `NodeTypeStorageService.ts`, and `hmi-app/src/pages/admin/HierarchyPage.tsx` to the `laboratorio_*_v1` constants design requires.
- [x] 0.2 Rewrite `hmi-app/index.html` `<title>`, rename `Planta Steigen` to `Planta Demo` in `hmi-app/src/mocks/hierarchy.mock.ts`, rewrite AGENTS.md Section 1, and replace `Planta Steigen` in `implementation_plan.md`.
- [x] 0.3 Add a post-rebrand assertion test/grep guard that fails if `steigen` remains in `hmi-app/src/**`, `hmi-app/index.html`, `AGENTS.md`, or `implementation_plan.md`, exempting `openspec/changes/canvas-bounds/explore.md`.

## Phase 1 — Testing fixtures and factories
- [x] 1.1 Create `hmi-app/src/test/fixtures/dashboard.fixture.ts` with strict typed `makeDashboard`, `makeWidget`, `makeLayout`, and `makeTemplate` factories using override inputs instead of `any`.
- [ ] 1.2 Add any shared test helpers needed for canvas viewport, localStorage, and ResizeObserver-driven builder/viewer tests under `hmi-app/src/test/fixtures/` or `hmi-app/src/test/`.

## Phase 2 — Domain types
- [x] 2.1 Update `hmi-app/src/domain/admin.types.ts` with `DashboardAspect`, required `Dashboard.aspect`, `Dashboard.rows`, `Template.aspect`, `Template.rows`, and canonical required `WidgetLayout.x/y`.
- [x] 2.2 Deprecate `WidgetConfigBase.position/size` in `hmi-app/src/domain/admin.types.ts` with the design’s TODO strategy while keeping compatibility explicit.
- [x] 2.3 Update `hmi-app/src/mocks/admin.mock.ts` so every dashboard/template compile path includes valid `aspect` and `rows` defaults.
- [x] 2.4 Run `npx tsc --noEmit` from `hmi-app/` and fix any type fallout before service work starts.

## Phase 3 — Grid math and canvas reference (utils) — TDD STRICT
- [x] 3.1 Write tests for `fitToAspect` in `hmi-app/src/utils/gridConfig.test.ts` covering 16:9, 21:9, 4:3 across wide, tall, and square viewports.
- [x] 3.2 Implement `fitToAspect` in `hmi-app/src/utils/gridConfig.ts`.
- [x] 3.3 Write boundary tests for `computeGridCols(width)` with the new `MAX_COLS=20` and updated `MIN_COL_WIDTH`.
- [x] 3.4 Implement the new `computeGridCols(width)` and related constants in `hmi-app/src/utils/gridConfig.ts`.
- [x] 3.5 Write tests for `getRowHeight(canvasHeight, rows)` including fractional heights and minimum valid rows.
- [x] 3.6 Implement `getRowHeight` in `hmi-app/src/utils/gridConfig.ts`.
- [x] 3.7 Write exhaustive edge/corner tests for `clampWidgetBounds({x,y,w,h}, cols, rows)`.
- [x] 3.8 Implement `clampWidgetBounds` in `hmi-app/src/utils/gridConfig.ts`.
- [x] 3.9 Write tests for `computeCanvasReference({viewport, topbarHeight, headerHeight, paddings, aspect})` using measured offsets and letterboxing expectations.
- [x] 3.10 Implement `computeCanvasReference` in `hmi-app/src/utils/gridConfig.ts`.
- [x] 3.11 Write tests for `isTemplateApplicable(template, dashboard)` covering matching and mismatched aspects.
- [x] 3.12 Implement `isTemplateApplicable` and remove dead `migrateLayoutWidth`, `gridVersion`, and `LEGACY_COLS` code from `hmi-app/src/utils/gridConfig.ts`.

## Phase 4 — Storage reset utility
- [x] 4.1 Write TDD-first tests for `hmi-app/src/utils/legacyStorageCleanup.ts` covering all six new keys, full `LEGACY_KEYS_TO_PURGE`, and idempotent cleanup behavior.
- [x] 4.2 Implement `legacyStorageCleanup.ts` constants plus `cleanupLegacyStorage()` and call it in `hmi-app/src/main.tsx` before `ReactDOM.createRoot(...).render(...)`.

## Phase 5 — Storage services (TDD STRICT)
- [x] 5.1 Write service tests for `hmi-app/src/services/DashboardStorageService.ts` covering new storage key usage, default `aspect/rows`, template-derived creation, and publish snapshot regression.
- [x] 5.2 Implement the `DashboardStorageService.ts` changes, including `DASHBOARDS_STORAGE_KEY`, required `aspect/rows`, and publish/discard parity.
- [x] 5.3 Write service tests for `hmi-app/src/services/TemplateStorageService.ts` covering `layoutPreset.aspect/rows` and read-side aspect compatibility enforcement.
- [x] 5.4 Implement the `TemplateStorageService.ts` changes with `TEMPLATES_STORAGE_KEY` and updated seed shape.
- [x] 5.5 Write service tests for `VariableCatalogStorageService.ts`, `HierarchyStorageService.ts`, and `NodeTypeStorageService.ts` covering imported key constants instead of hardcoded strings.
- [x] 5.6 Implement the storage-key imports in those three services and switch `hmi-app/src/pages/admin/HierarchyPage.tsx` to `HIERARCHY_EXPANDED_STORAGE_KEY`.

## Phase 6 — UI store with persist middleware
- [x] 6.1 Add `isGridVisible`, `toggleGrid()`, and `persist` with strict `partialize` to `hmi-app/src/store/ui.store.ts`, persisting only `isGridVisible` under `interfaz-laboratorio-ui`.
- [x] 6.2 Add an integration test for `hmi-app/src/store/ui.store.ts` proving toggle → unmount/remount → restored localStorage state.

## Phase 7 — Design system tokens
- [x] 7.1 Add `--color-canvas-grid-major` and `--color-canvas-grid-minor` to the `@theme {}` block in `hmi-app/src/index.css` without hardcoded component-level colors.

## Phase 8 — `useCanvasReference` hook
- [x] 8.1 Rename/evolve `hmi-app/src/utils/useGridCols.ts` into `useCanvasReference.ts`, returning `width`, `height`, `cols`, `rows`, `rowHeight`, `offsetX`, and `offsetY` from shared canvas math.
- [x] 8.2 Add tests for extracted pure helpers plus a ResizeObserver-backed hook test proving builder/viewer measurements update the shared canvas reference correctly.

> Architectural revision note (2026-04-20): canvas sizing v2 made measured-container sizing authoritative. `useCanvasReference` now always observes the local container and derives `cellWidth`/`rowHeight` from measured `width`/`height` plus persisted `cols`/`rows`; viewer-reference mode is retired.

## Phase 9 — Viewer rendering
- [x] 9.1 Update `hmi-app/src/components/viewer/DashboardViewer.tsx` to consume `useCanvasReference` and place widgets with `grid-column-start` / `grid-row-start` from persisted `x/y`.
- [x] 9.2 Add an integration test with reversed widget array order proving viewer placement follows coordinates, not array order.

## Phase 10 — Builder rendering
- [x] 10.1 Update `hmi-app/src/components/admin/BuilderCanvas.tsx` to consume the same canvas reference, render widgets from `x/y`, and keep builder/viewer WYSIWYG parity.
- [x] 10.2 Add the visible grid overlay using `repeating-linear-gradient()` and the new canvas tokens, driven by `ui.store.isGridVisible`, with an integration test for show/hide behavior.

## Phase 11 — Drag/resize clamp-on-release
- [x] 11.1 Refactor `hmi-app/src/components/admin/BuilderCanvas.tsx` interaction state to track tentative pixel bounds during drag and resize without committing invalid layout mid-gesture.
- [x] 11.2 On `pointerup`, convert pixels to grid units, run `clampWidgetBounds`, and commit the clamped result for both move and resize paths.
- [x] 11.3 Add `user-event` integration tests covering overflow during interaction and bounded commit on release for both move and resize.

## Phase 12 — Grid toggle icon in contextBarPanel
- [x] 12.1 Add a Lucide grid toggle beside `← Volver` in the `contextBarPanel`, wire it to `toggleGrid()`, and expose an accessible aria-label.
- [x] 12.2 Add an integration test proving the button toggles state and that the persisted preference survives reload.

## Phase 13 — Aspect/rows editor in admin
- [x] 13.1 Add `hmi-app/src/components/admin/DashboardSettingsPanel.tsx` (or the design-approved extension point) with segmented aspect control and numeric rows input constrained to 4–24.
- [x] 13.2 Wire the panel into `hmi-app/src/pages/admin/DashboardBuilderPage.tsx`, including confirm-before-clamp flow when aspect/rows changes would push widgets out of bounds.
- [x] 13.3 Add an integration test covering the happy path and the confirmation dialog before clamping existing widgets.

## Phase 14 — Template aspect compatibility UI
- [x] 14.1 Update template-selection/apply flows so mismatched templates render disabled with tooltip guidance before copy begins.
- [x] 14.2 Guard `applyTemplate()` (or the design-pinned equivalent) with `isTemplateApplicable()` so mismatch throws/returns the approved actionable error before any widget copy.
- [x] 14.3 Add integration tests proving matching templates preserve `x/y/w/h` and mismatched templates are blocked with the two-remedy message.

## Phase 15 — Post-rebrand assertion + coverage check
- [x] 15.1 Add/verify the automated test that fails if `steigen` remains in live surfaces after the rebrand batch.
- [x] 15.2 Run `npm run test:coverage` in `hmi-app/`, confirm the global 70/70 minimum, and record actual coverage numbers with per-layer expectations for new code.

## Phase 16 — Verify + archive prep
- [ ] 16.1 Execute a manual smoke checklist for builder/viewer parity, grid toggle persistence, drag/resize clamping, aspect editing, and template apply behavior.
- [x] 16.2 Run `npm run test` and confirm all tests pass cleanly.
- [x] 16.3 Run `npx tsc --noEmit` and confirm a clean typecheck.
- [x] 16.4 Verify no `steigen`, `gridVersion`, or `migrateLayoutWidth` references remain in live code and no console errors appear during smoke testing.
- [x] 16.5 Inspect `localStorage` after bootstrap and confirm only `laboratorio_*_v1` keys remain after legacy cleanup.
