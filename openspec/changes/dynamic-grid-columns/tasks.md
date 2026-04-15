# Tasks: Dynamic Grid Columns

## Phase 1: Foundation

- [ ] 1.1 Create `hmi-app/src/utils/gridConfig.ts` with `MIN_COL_WIDTH`, `MAX_COLS`, `MIN_COLS`, `VIEWER_GAP`, `BUILDER_GAP`, `LEGACY_COLS`, `CURRENT_GRID_VERSION`, plus `computeGridCols`, `getGridTemplateStyle`, `getWidgetSpanStyle`, `migrateWidgetWidth`, and `computeCellWidth`. Files: `hmi-app/src/utils/gridConfig.ts`. Depends on: none.
- [ ] 1.2 Create `hmi-app/src/hooks/useGridCols.ts` with a `ResizeObserver` hook that exposes `{ ref, cols, containerWidth }`, uses `computeGridCols`, starts at `cols=4`, and cleans up on unmount. Files: `hmi-app/src/hooks/useGridCols.ts`. Depends on: 1.1.
- [ ] 1.3 Add optional `gridVersion?: number` to `Dashboard` and `PublishedSnapshot` so legacy `localStorage` data stays compatible. Files: `hmi-app/src/domain/admin.types.ts`. Depends on: none.

## Phase 2: Viewer Integration

- [ ] 2.1 Replace the fixed 4-column viewer grid with `useGridCols` and inline grid styles, wiring `gridTemplateColumns`, `gridColumn`, `gridRow`, and `maxRows`/row-height calculations to the current `cols`. Files: `hmi-app/src/components/viewer/DashboardViewer.tsx`. Depends on: 1.1, 1.2.
- [ ] 2.2 Add render-time legacy span migration in the viewer: when `dashboard.gridVersion` is missing, derive `effectiveW` with `migrateWidgetWidth`; otherwise use stored spans unchanged. Files: `hmi-app/src/components/viewer/DashboardViewer.tsx`. Depends on: 1.1, 1.3.

## Phase 3: Builder Integration

- [ ] 3.1 Replace `grid-cols-4`/`col-span-*`/`row-span-*` usage in the builder with `useGridCols`, `getGridTemplateStyle`, and inline span styles; make the empty state span the current column count. Files: `hmi-app/src/components/admin/BuilderCanvas.tsx`. Depends on: 1.1, 1.2.
- [ ] 3.2 Remove the hardcoded `CELL_WIDTH=280` path by computing `cellWidth` from `containerWidth`, `cols`, and `BUILDER_GAP`, passing it into the resize handle, and clamping widget width to `1..cols` while keeping height clamped to `1..6`. Files: `hmi-app/src/components/admin/BuilderCanvas.tsx`. Depends on: 1.1, 1.2, 3.1.

## Phase 4: Verification

- [ ] 4.1 Run `npx tsc --noEmit` from `hmi-app/` and fix any type regressions introduced by the new utility, hook, and `gridVersion` typing. Files: `hmi-app/src/utils/gridConfig.ts`, `hmi-app/src/hooks/useGridCols.ts`, `hmi-app/src/domain/admin.types.ts`, `hmi-app/src/components/viewer/DashboardViewer.tsx`, `hmi-app/src/components/admin/BuilderCanvas.tsx`. Depends on: 2.1, 2.2, 3.1, 3.2.
- [ ] 4.2 Manually verify builder and viewer behavior with narrow, standard, and wide container widths: shared `cols` formula, inline spans, legacy migration, resize clamping, and full-width empty builder state. Files: `hmi-app/src/components/viewer/DashboardViewer.tsx`, `hmi-app/src/components/admin/BuilderCanvas.tsx`. Depends on: 4.1.
