# Proposal: canvas-bounds

## Intent
`canvas-bounds` exists to turn the admin builder and viewer into a true shared canvas instead of today's partial WYSIWYG, where viewport width is approximated, `x/y` are ignored, and layout depends on array order. Success means every dashboard renders from real logical coordinates inside a bounded aspect-driven canvas, with predictable resize/drag behavior and clean storage after a hard reset.

## Goals
- Pixel-parity builder/viewer from the same dashboard data.
- Per-dashboard aspect: `16:9 | 21:9 | 4:3`.
- Real `x/y` on a `20 x 12` grid for finer placement.
- Persistent builder grid toggle.
- Remove dead grid versioning/migration code.

## Non-goals
- No mobile/touch optimization.
- No template-library UI redesign.
- No legacy dashboard migration; old data is wiped.
- No backend work or plant-control behavior.

## Scope
### In Scope
- Shared `computeCanvasReference()` and pure `fitToAspect()` in `hmi-app/src/utils/gridConfig.ts`.
- `Dashboard.aspect` / `Dashboard.rows`; templates also persist `aspect` / `rows`.
- Builder + viewer render real `x/y`; CSS auto-placement is removed.
- Grid recalibration to `MAX_COLS = 20`, default `rows = 12`; provisional `MIN_COL_WIDTH = 96px`, new-widget default `w=5 h=4` pending design validation.
- Hard reset: coordinated key bump + bootstrap cleanup in dashboard/template/catalog storages.
- Remove dead `gridVersion` / `migrateLayoutWidth()`.
- Overflow during drag/resize, clamp on release for move and resize.
- Builder grid overlay via CSS background, plus Lucide toggle beside `← Volver` using Zustand `persist`.
- New `--color-canvas-grid-major` / `--color-canvas-grid-minor` tokens in `hmi-app/src/index.css`.

### Out of Scope
- Mobile/touch UX.
- Backend integration; storage remains `localStorage`.
- Template conflict-resolution UX across aspect mismatch.
- New widget types.
- Full accessibility audit.

## Capabilities
### New Capabilities
- `canvas-bounds`: bounded aspect-aware dashboard canvas with real grid coordinates and builder/viewer parity.

### Modified Capabilities
- None.

## Approach
Use viewport measurements, not `transform: scale()`, to compute usable canvas area; derive a shared reference canvas for builder and viewer, then render widgets from persisted `x/y/w/h`. Storage is intentionally reset to avoid legacy branches.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `hmi-app/src/utils/gridConfig.ts` | Modified | Canvas math, aspect fit, grid math |
| `hmi-app/src/components/admin/BuilderCanvas.tsx` | Modified | Real-position builder, overlay, overflow/clamp |
| `hmi-app/src/components/viewer/DashboardViewer.tsx` | Modified | Real-position viewer rendering |
| `hmi-app/src/domain/admin.types.ts` | Modified | `aspect`, `rows`, real layout contract |
| `hmi-app/src/services/*StorageService.ts` | Modified | Key bump + cleanup |
| `hmi-app/src/store/ui.store.ts` | Modified | Persistent grid toggle |

## User impact
Users get sharper widget placement, configurable dashboard aspect, visible builder grid, and drag-to-move behavior. IMPORTANT: all existing dashboards, templates, and catalog references are deleted during the reset; users start fresh with new defaults (`16:9`, 20 cols, 12 rows).

## Risks and mitigations
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hard reset removes real state | Low | User confirmed dev/test-only data |
| Drag-to-move changes builder UX | Medium | TDD on clamp helpers + staged replacement |
| `20 x 12` exposes small-viewport issues | Medium | Define min viewport / allow scroll fallback |

## Open design decisions deferred to `sdd-design`
- Confirm final `MIN_COL_WIDTH` and new-widget default spans.
- Define template/dashboard aspect mismatch behavior.
- Place aspect/rows editor in admin UI.
- Finalize persisted UI-store key name.
- Verify `contextBarPanel` horizontal space.

## Testing implications
- TDD required for `fitToAspect`, `computeCanvasReference`, `computeGridCols`, `clampWidgetBounds`, and move helpers.
- Integration tests for toggle persistence, overflow-then-clamp on resize/move, and viewer honoring `x/y` over array order.

## Success criteria
- `npm run test` passes with new grid/canvas tests.
- Builder and viewer render the same layout from the same dashboard.
- Builder grid toggle is visible and survives reload.
- `localStorage` only keeps new-version keys.
- New dashboards default to `16:9`, 20 cols, 12 rows.
- No code references remain to `gridVersion` or `migrateLayoutWidth()`.

## Rollback Plan
Revert the change set and restore previous storage keys/mocks before release; because rollout uses a hard reset, rollback is code-only, not data migration.

## Dependencies
- Prior exploration decisions in `sdd/canvas-bounds/explore` and `sdd/canvas-bounds/decisions`.
