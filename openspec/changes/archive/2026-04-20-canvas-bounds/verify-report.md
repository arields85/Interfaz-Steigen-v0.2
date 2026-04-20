# Verify Report: canvas-bounds

## Summary
PARTIAL — 5 PASS / 1 PARTIAL / 0 FAIL / 3 SUPERSEDED.

Behaviorally, the change is mostly in place: widget positioning, clamp-on-release interactions, grid toggle persistence, template mismatch blocking, storage cleanup, `npm run test` (84/84), `npx tsc --noEmit`, and the dead-code grep checks all pass. The verification is still PARTIAL because `tasks.md` keeps 2 unchecked items (`1.2`, `16.1`), global coverage remains below the enforced 70/70 minimum, and the strict-TDD apply-progress artifact does not expose the required "TDD Cycle Evidence" table.

## Spec Requirement Verification

### Requirement: Shared canvas reference
- Status: SUPERSEDED
- Implementation: canvas-sizing-v2 decision `sdd/canvas-bounds/decisions/canvas-sizing-v2` + Phases 8–10 (`useCanvasReference`, builder/viewer measured-mode adoption)
- Test coverage: `hmi-app/src/utils/useCanvasReference.test.tsx`, `hmi-app/src/components/viewer/DashboardViewer.test.tsx`, `hmi-app/src/components/admin/BuilderCanvas.test.tsx`
- Notes: Original spec required aspect-fit + letterboxing from usable viewport. This was intentionally superseded by canvas-sizing-v2: builder and viewer now fill 100% of the measured local container, both via `ResizeObserver`, and keep the centering shell only as future-ready structure.

### Requirement: Grid resolution
- Status: SUPERSEDED
- Implementation: Phase 2 domain typing + Phase 3 grid helpers + Phase 5 storage defaults + Phase 13 dashboard settings panel + canvas-sizing-v2 decision
- Test coverage: `hmi-app/src/utils/gridConfig.test.ts`, `hmi-app/src/services/DashboardStorageService.test.ts`, `hmi-app/src/components/admin/DashboardSettingsPanel.test.tsx`, `hmi-app/src/pages/admin/DashboardBuilderPage.test.tsx`
- Notes: `MAX_COLS = 20` and default `rows = 12` hold, but the original "compute cols from MIN_COL_WIDTH" contract was intentionally superseded. `cols` is now persisted/configurable per dashboard instead of derived from width at render time.

### Requirement: Logical widget positioning
- Status: PASS
- Implementation: Phases 8–10 (`useCanvasReference` + `DashboardViewer` + `BuilderCanvas`), plus published-viewer cols fix in `sdd/canvas-bounds` follow-up bugfix (`Fix: cols not reaching viewer after publish`)
- Test coverage: `hmi-app/src/components/viewer/DashboardViewer.test.tsx`, `hmi-app/src/components/admin/BuilderCanvas.test.tsx`, `hmi-app/src/services/DashboardStorageService.test.ts`
- Notes: Viewer and builder place widgets from persisted `x/y/w/h`, not layout array order. Published snapshots now also carry `cols/rows`, so viewer parity survives publish.

### Requirement: Aspect metadata
- Status: SUPERSEDED
- Implementation: Phase 2 domain typing + Phase 5 storage/template persistence + Phase 13 settings panel + canvas-sizing-v2 decision
- Test coverage: `hmi-app/src/services/DashboardStorageService.test.ts`, `hmi-app/src/services/TemplateStorageService.test.ts`, `hmi-app/src/components/admin/DashboardSettingsPanel.test.tsx`
- Notes: `Dashboard.aspect` and template `aspect/rows` are persisted and editable, but aspect no longer drives runtime canvas sizing/clamping. Under canvas-sizing-v2 it is metadata for future multi-resolution support, so the original "aspect change recomputes canvas size on next render" behavior is intentionally superseded.

### Requirement: Drag and resize commit rules
- Status: PASS
- Implementation: Phase 11 + apply-progress/bugfix batch `Implemented BuilderCanvas clamp-on-release interactions`
- Test coverage: `hmi-app/src/components/admin/BuilderCanvas.test.tsx`, `hmi-app/src/utils/widgetInteraction.test.ts`, `hmi-app/src/utils/gridConfig.test.ts`
- Notes: During interaction, widgets can visually overflow; on release they clamp back into bounds. Move and resize paths are both covered.

### Requirement: Visible grid toggle
- Status: PASS
- Implementation: Phase 6 (`ui.store` persist) + Phase 10 (overlay) + Phase 12 (context bar toggle)
- Test coverage: `hmi-app/src/store/ui.store.test.ts`, `hmi-app/src/components/admin/BuilderCanvas.test.tsx`, `hmi-app/src/pages/admin/DashboardBuilderPage.test.tsx`
- Notes: Toggle is exposed in the context bar, immediately updates the overlay, persists to `localStorage`, and restores across reloads.

### Requirement: Template aspect enforcement
- Status: PASS
- Implementation: Phase 5 template/dashboard storage support + Phase 14 apply/selection flow + decision `Canvas-bounds Q2: template aspect mismatch = block with message`
- Test coverage: `hmi-app/src/services/DashboardStorageService.test.ts`, `hmi-app/src/pages/admin/DashboardBuilderPage.test.tsx`, `hmi-app/src/utils/gridConfig.test.ts`
- Notes: Mismatched templates are disabled with a tooltip, `applyTemplate()` blocks before copying, the message names both aspects and both remedies, and matching templates preserve coordinates.

### Requirement: Storage reset and cleanup
- Status: PASS
- Implementation: Phase 0 rebrand + Phase 4 bootstrap cleanup + Phase 5 storage-key adoption + closure batch (phases 15–16)
- Test coverage: `hmi-app/src/utils/legacyStorageCleanup.test.ts`, `hmi-app/src/test/rebrand.test.ts`, service tests under `hmi-app/src/services/*.test.ts`
- Notes: `cleanupLegacyStorage()` runs in `hmi-app/src/main.tsx`, all canonical `laboratorio_*_v1` keys are exported, `steigen` grep is clean in live surfaces, and `gridVersion` / `migrateLayoutWidth` grep is clean in `hmi-app/src`.

### Requirement: Non-interference
- Status: PARTIAL
- Implementation: Phases 8–10 measured-container rendering + Phase 12 grid toggle wiring
- Test coverage: `hmi-app/src/components/viewer/DashboardViewer.test.tsx`, `hmi-app/src/components/admin/BuilderCanvas.test.tsx`, `hmi-app/src/pages/admin/DashboardBuilderPage.test.tsx`
- Notes: Structural evidence is good: viewer fills the measured container without overflow math hacks, and grid toggle only changes overlay styles. But there is no explicit passing test proving "no vertical scroll for a well-formed dashboard" in the real dashboard page, and no test proving widget content avoids re-render on grid toggle. Also manual smoke task `16.1` is still unchecked.

## Task Completion
- `openspec/changes/canvas-bounds/tasks.md`: 56 tasks total
- Completed: 54
- Incomplete: 2
  - `1.2` Add shared test helpers for viewport/localStorage/ResizeObserver tests
  - `16.1` Execute manual smoke checklist
- Superseded notes already present in file: Phase 8 includes the 2026-04-20 canvas-sizing-v2 revision note; no additional unchecked item is explicitly marked superseded.

## Strict TDD Verification Notes
- Mode: Strict TDD (`openspec/config.yaml` → `strict_tdd: true`)
- Test runner: `npm run test` ✅ 84/84
- Coverage: `npm run test:coverage` ❌ 48.5% statements / 34.38% branches / 45.72% functions / 50.72% lines (below global 70/70)
- Type check: `npx tsc --noEmit` ✅ clean
- TDD evidence artifact: PARTIAL / WARNING-CRITICAL
  - The retrieved `sdd/canvas-bounds/apply-progress` artifact is only a closure summary and does **not** include the required `TDD Cycle Evidence` table mandated by strict-TDD verify.
  - Runtime tests exist and pass, and the relevant test files are present, but the process evidence in the artifact is incomplete.

### Test Layer Distribution
- Unit-like: 49 tests across 8 files
  - `gridConfig.test.ts`, `widgetInteraction.test.ts`, `dashboardBoundsSettings.test.ts`, `legacyStorageCleanup.test.ts`, `ui.store.test.ts`, `DashboardStorageService.test.ts`, `TemplateStorageService.test.ts`, `rebrand.test.ts`
- Integration: 26 tests across 5 files
  - `useCanvasReference.test.tsx`, `DashboardViewer.test.tsx`, `BuilderCanvas.test.tsx`, `DashboardBuilderPage.test.tsx`, `DashboardSettingsPanel.test.tsx`
- E2E: 0

### Assertion Quality
- Result: ✅ No trivial/tautological assertions found in the change-related test files inspected.

## Deviations from Original Spec
1. **Aspect-fit canvas sizing** — SUPERSEDED by canvas-sizing-v2. Canvas now fills 100% of the measured container; `Dashboard.aspect` remains metadata.
2. **Letterboxing requirement** — SUPERSEDED. No runtime letterboxing is needed because the canvas is no longer reduced to fit an aspect box.
3. **Dynamic `computeGridCols(width)` as runtime source of truth** — SUPERSEDED. `cols` is now a configurable persisted dashboard property, like `rows`.

## Risks
- Global coverage is still below the project minimum (70/70), so archive readiness is not clean from a quality-gate perspective.
- `tasks.md` still contains 2 unchecked items, including the manual smoke checklist.
- Strict-TDD process evidence is incomplete because the saved apply-progress artifact does not include the required TDD evidence table.
- Low-risk cleanup remains: `hmi-app/src/utils/useGridCols.ts` and `computeViewerReferenceWidth()` still exist as stale, apparently unused legacy helpers/comments even though live code now uses `useCanvasReference`.
