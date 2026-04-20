# Archive Report: canvas-bounds

## Change Summary
`canvas-bounds` closed the long-standing builder/viewer parity gap by making widget coordinates (`x/y/w/h`) canonical, moving both surfaces onto a shared measured-canvas model, and hardening the admin experience around bounded interactions instead of array-order auto-placement. The change also introduced persisted dashboard metadata (`aspect`, `rows`, configurable `cols`), template compatibility enforcement, grid-visibility persistence, and a bootstrap-level storage reset that removed incompatible legacy keys while completing the `steigen` → `laboratorio` rebrand.

During implementation, the change evolved through one architectural redesign (`canvas-sizing-v2`). The original aspect-fit/letterboxing runtime contract was intentionally superseded in favor of a measured-container model where builder and viewer fill 100% of the local observed shell via `ResizeObserver`, while `aspect` remains persisted metadata for future multi-resolution support. Verification finished PARTIAL rather than FAIL: the delivered behavior is largely correct and regression-tested, but global coverage still sits below the project threshold and two non-blocking checklist items remained deferred.

## Verify Result
PASS: 5 | PARTIAL: 1 | FAIL: 0 | SUPERSEDED: 3

## Spec Deviations
- **Shared canvas reference / aspect-fit sizing** — superseded by `canvas-sizing-v2`: runtime letterboxing and aspect-fit are no longer the sizing source of truth; builder and viewer now fill the measured local container to preserve real WYSIWYG parity.
- **Grid resolution dynamic width contract** — superseded by `canvas-sizing-v2`: `MAX_COLS = 20` and default `rows = 12` remain, but `cols` is no longer derived at render time from `MIN_COL_WIDTH`; it is now a persisted/configurable dashboard property.
- **Aspect metadata drives runtime clamping/sizing** — superseded by `canvas-sizing-v2`: `aspect` is still persisted on dashboards/templates, but no longer recomputes runtime canvas size on each render; it remains metadata for future multi-resolution deployment support.

## Key Decisions
- Canonical layout moved from array order to persisted logical coordinates (`x/y/w/h`).
- Builder and viewer share a measured canvas contract via `useCanvasReference` instead of viewer-width approximation.
- Storage rollout used a hard reset plus bootstrap cleanup rather than legacy migration.
- Templates persist `aspect` and `rows`, and mismatched templates are blocked before copy with an actionable message.
- Grid visibility is UI state, so it lives in Zustand `persist` rather than domain storage.
- Overflow during drag/resize is allowed visually, but clamp-on-release is the only committed state.
- `canvas-sizing-v2` intentionally retired runtime letterboxing and width-derived columns to protect parity in real containers.
- Published snapshots must preserve `aspect/rows/cols` to keep viewer parity after publish/discard flows.

## Implementation Stats
- Phases: 16 planned; implementation lifecycle completed with deferred checklist items `1.2` and `16.1`
- Regression fixes: 8 (per apply-progress history)
- Architectural redesigns: 1 (`canvas-sizing-v2`)
- New features beyond original scope: space-pan, configurable cols
- Tests: 84 passing
- Files touched: ~30+

## Artifacts
- Exploration — Engram `sdd/canvas-bounds/explore` (observation #517) | `openspec/changes/archive/2026-04-20-canvas-bounds/explore.md`
- Proposal — Engram `sdd/canvas-bounds/proposal` (observation #519) | `openspec/changes/archive/2026-04-20-canvas-bounds/proposal.md`
- Spec — Engram `sdd/canvas-bounds/spec` (observation #522) | `openspec/specs/canvas-bounds/spec.md` and archived source `openspec/changes/archive/2026-04-20-canvas-bounds/spec.md`
- Design — Engram `sdd/canvas-bounds/design` (observation #524) | `openspec/changes/archive/2026-04-20-canvas-bounds/design.md`
- Tasks — Engram `sdd/canvas-bounds/tasks` (observation #526) | `openspec/changes/archive/2026-04-20-canvas-bounds/tasks.md`
- Apply progress — Engram `sdd/canvas-bounds/apply-progress` (observation #528) | no OpenSpec file persisted for this artifact in the current project convention
- Verify report — Engram `sdd/canvas-bounds/verify-report` (observation #574) | `openspec/changes/archive/2026-04-20-canvas-bounds/verify-report.md`
- Archive report — Engram `sdd/canvas-bounds/archive-report` | `openspec/changes/archive/2026-04-20-canvas-bounds/archive-report.md`
- Final state marker — Engram `sdd/canvas-bounds/state` | Engram-only state marker
- Decisions trace — search `sdd/canvas-bounds/decisions` returned only embedded references (not standalone archived files), notably `canvas-sizing-v2`, template mismatch blocking, and the publish/viewer `cols` parity regression fix

## Deferred Items
- Legacy cleanup: `useGridCols.ts` / `computeViewerReferenceWidth()` (dead code, not blocking)
- Global test coverage improvement (50% baseline from legacy code)
- `Dashboard.aspect` activation for multi-resolution deployment preview
- Task 1.2 (shared test helpers) — absorbed by inline helpers
- Task 16.1 (manual smoke checklist) — still unchecked at archive time

## Lessons Learned
- WYSIWYG parity in this HMI required measuring the real container, not approximating viewport width from layout chrome.
- Persisting metadata is not enough; publish/discard snapshots have to carry the same canvas contract or the viewer drifts immediately.
- Strict-TDD process artifacts matter: passing tests alone were not enough to make verification fully clean because the saved apply-progress artifact lacked the required TDD evidence table.
- Hybrid SDD traceability worked well for core artifacts, but decisions were easier to reference than to recover because they were embedded across design/tasks/verify instead of stored as standalone decision artifacts.
- Archiving with a partial verify result is acceptable only because the open items are explicitly non-blocking and documented as deferred follow-up work, not hidden debt.
