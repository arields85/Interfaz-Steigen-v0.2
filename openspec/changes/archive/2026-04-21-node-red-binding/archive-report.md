# Archive Report: node-red-binding

## Status
- **Archive status**: ARCHIVED
- **Archive mode**: hybrid
- **Archive date**: 2026-04-21
- **Closure mode**: FORCE CLOSE by explicit user override
- **Change status**: COMPLETED with known PARTIAL items

## Override Rationale
The latest verification artifact (`sdd/node-red-binding/verify-report`, obs. **#609**) reports **FAIL**, but the failure is due to strict-TDD traceability drift and missing evidence tables, not a functional regression. The user explicitly requested archive despite that audit gap. This archive therefore preserves the known PARTIAL items instead of treating them as blockers.

## Traceability
- Proposal: Engram obs. **#585** (`sdd/node-red-binding/proposal`)
- Spec: Engram obs. **#587** (`sdd/node-red-binding/spec`)
- Design: Engram obs. **#589** (`sdd/node-red-binding/design`)
- Tasks: Engram obs. **#590** (`sdd/node-red-binding/tasks`)
- Apply progress: Engram obs. **#595** (`sdd/node-red-binding/apply-progress`)
- Verify report: Engram obs. **#609** (`sdd/node-red-binding/verify-report`)
- Superseded archive report: Engram obs. **#613** (`sdd/node-red-binding/archive-report`)

## Implemented Scope
- Real variable binding from Node-RED `/api/hmi/overview`.
- Domain/config/service/adapter/query pipeline with TDD-covered foundation layers.
- TanStack Query hook `useNodeRedOverview` with 5s polling default.
- Admin `PropertyDock` machine/variable selectors backed by live Node-RED data.
- Backward-compatible resolver path preserving legacy and simulated dashboards.
- Runtime wiring across `Dashboard` → `DashboardViewer` → `WidgetRenderer` → renderers.
- Settings dialog (`NodeRedSettingsDialog`) with localStorage + env fallback.
- Admin top-bar gear entry point and sidebar hint style standardization.
- Null/missing runtime values now render as `--` in KPI, trend, and metric widgets.

## Known PARTIAL Items (archived as non-blocking)
| ID | Status | Notes |
|---|---|---|
| FR4 | PARTIAL | Missing save/reload roundtrip test for mixed legacy + Node-RED dashboards. |
| FR5 | PARTIAL | Missing renderer-level DOM assertion for positive real-value rendering. |
| NFR1 | PARTIAL | Polling is centralized at 5s default but not externally configurable. |
| NFR2 | PARTIAL | No dedicated responsiveness test for transient network failure. |
| NFR4 | PARTIAL | `npx tsc -b` still fails because of pre-existing repo issues; not introduced by this change. |
| TDD Traceability | PARTIAL | Apply-progress artifact lacks the required evidence tables, so strict audit traceability is incomplete. |

## Archive Checks
| Check | Result | Notes |
|---|---|---|
| Required Engram artifacts retrieved | ✅ | Proposal, spec, design, tasks, apply-progress, and verify report were retrieved in full. |
| Main spec synced | ✅ | Created `openspec/specs/node-red-binding/spec.md` from the approved change spec because no main spec existed yet. |
| Change folder archived | ✅ | Change moved to `openspec/changes/archive/2026-04-21-node-red-binding/`. |
| Archive contents preserved | ✅ | Proposal, spec, design, tasks, verify report, explore note, and archive report remain in archived folder. |
| Active change removed | ✅ | `openspec/changes/node-red-binding/` no longer remains as an active change. |

## Source of Truth Updated
- `openspec/specs/node-red-binding/spec.md`

## Archive Contents
- `proposal.md` ✅
- `spec.md` ✅
- `design.md` ✅
- `tasks.md` ✅
- `verify-report.md` ✅
- `archive-report.md` ✅
- `explore.md` ✅

## Notes for Future Follow-up
- If strict audit completeness is needed later, the team should publish a corrected apply-progress artifact and optionally rerun verification for a non-force-closed paper trail.
- The archived spec is now the source of truth for Node-RED real-binding behavior.

## Conclusion
`node-red-binding` is archived. Functional behavior is accepted, the spec has been promoted to the main source of truth, and the remaining gaps are documented as known PARTIAL audit/test items rather than release-blocking defects.
