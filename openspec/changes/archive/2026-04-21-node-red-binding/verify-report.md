## Verify Report: node-red-binding

**Change**: node-red-binding  
**Mode**: Strict TDD

### Summary
- Total requirements: 12
- PASS: 7
- PARTIAL: 5
- FAIL: 0
- Overall: FAIL

### Completeness
- OpenSpec tasks artifact (`openspec/changes/node-red-binding/tasks.md`) shows **12/12** complete.
- Engram tasks artifact (`sdd/node-red-binding/tasks`, obs. #590) still shows **11/12** complete because `T12` remains unchecked there.
- Result: implementation appears complete, but there is still **artifact drift** between OpenSpec and Engram.

### Build & Tests Execution

**Tests**: ✅ 126 passed / ❌ 0 failed / ⚠️ 0 skipped
```text
npm run test -- --run

Test Files  26 passed (26)
Tests       126 passed (126)
```

**Coverage**: ⚠️ 48.71% lines / 46.32% statements / 42.31% functions / 36.72% branches
```text
npm run test:coverage

Test Files  26 passed (26)
Tests       126 passed (126)
ERROR: Coverage for lines (48.71%) does not meet global threshold (70%)
ERROR: Coverage for functions (42.31%) does not meet global threshold (70%)
ERROR: Coverage for statements (46.32%) does not meet global threshold (70%)
ERROR: Coverage for branches (36.72%) does not meet global threshold (70%)
```

**Type Check**: ❌ Failed (whole project)
```text
npx tsc -b

Fails with pre-existing repo errors, including examples in:
- src/components/admin/BuilderCanvas.test.tsx
- src/components/admin/PropertyDock.tsx
- src/pages/Dashboard.tsx
- src/pages/admin/DashboardBuilderPage.tsx
- src/widgets/resolvers/bindingResolver.test.ts
- src/widgets/renderers/AlertHistoryWidget.tsx
- src/widgets/renderers/ProduccionHistoricaWidget.tsx
- src/utils/useGridCols.ts
```

### Functional Requirements
| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| FR1 | Machine selector for real origin | PASS | `PropertyDock.tsx` renders Node-RED machine options from `nodeRedMachines` and tests prove names are listed (`PropertyDock.test.tsx` → `renders Node-RED machine names when machines are available`). |
| FR2 | Variable selector depends on selected machine | PASS | `PropertyDock.tsx` maps `(selectedNodeRedMachine?.variables ?? [])`; test proves only machine-scoped keys are shown (`shows variables from machine.variables when a machine is selected`). |
| FR3 | Invalid variable resets on machine change | PASS | `handleMachineChange()` clears `variableKey`; test proves reset when switching to a machine without that key. |
| FR4 | Real binding persistence | PARTIAL | Binding shape persists `machineId + variableKey + bindingVersion` in `PropertyDock.tsx` and `admin.types.ts`; tests prove save shape and legacy readability. Missing explicit persisted mixed-dashboard save+reload roundtrip test from the spec scenario. |
| FR5 | Runtime real value rendering | PARTIAL | Runtime wiring exists (`Dashboard.tsx` → `DashboardViewer.tsx` → `WidgetRenderer.tsx` → `bindingResolver.ts`) and resolver test proves Node-RED values resolve. Still missing a positive renderer-level DOM assertion that a real Node-RED value/unit is actually shown by the widget. |
| FR6 | Safe fallback shows `--` | PASS | `KpiWidget.tsx`, `TrendChartWidget.tsx`, and `MetricCard.tsx` now preserve `null` and render `--`; regression tests in `nodeRedNullDisplay.test.tsx` prove KPI, Metric, and Trend widgets no longer coerce null to `0`/`50`. |
| FR7 | Zero regression for simulated mode | PASS | `bindingResolver.test.ts` proves simulated mode remains unchanged; `nodeRedNullDisplay.test.tsx` also verifies simulated KPI values still render numerically. |
| FR8 | Configured read-only endpoint | PASS | `nodeRed.config.ts` centralizes URL/endpoints, `nodeRedOverview.service.ts` issues GET-only fetches, and tests verify env/storage-driven URL composition and GET-only behavior. |

### Non-Functional Requirements
| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| NFR1 | Polling configurable with default near 5 seconds | PARTIAL | Default polling is 5000 ms and stale time 4000 ms (`nodeRed.config.ts`, `useNodeRedOverview.ts`), covered by `nodeRed.config.test.ts`. Polling interval is centralized but not externally configurable beyond code changes. |
| NFR2 | Network errors MUST NOT freeze UI | PARTIAL | Query path is async TanStack Query with retries and admin UI has explicit loading/error/not-configured/empty states (`PropertyDock.tsx`, tests covering all four states). No dedicated behavioral test proves continued interactivity during transient refetch failure. |
| NFR3 | Graceful degradation | PASS | Resolver returns no-data, and the fixed renderers now show `--` instead of synthetic values. `nodeRedNullDisplay.test.tsx` directly validates graceful degradation at renderer level. |
| NFR4 | Strict TypeScript safety throughout | PARTIAL | Whole-project `npx tsc -b` still fails, so the requirement is not fully satisfied. Per apply-progress artifact (#595), these errors are pre-existing and not introduced by this change, so this is downgraded from FAIL to PARTIAL. Additional static gap remains: `src/domain/nodeRed.types.ts` still does not fully match the approved spec shape (`boolean`, `quality`, optional `values`, `fetchedAt`), and `Dashboard.tsx` still contains `any`. |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ❌ | Engram apply-progress artifact `sdd/node-red-binding/apply-progress` (obs. #595) is a summary memory, not the required artifact with `TDD Cycle Evidence` / `Files Changed` tables. |
| All tasks have tests | ⚠️ | Relevant tests exist for config, service, adapter, resolver, PropertyDock, Dashboard, DashboardViewer, DashboardBuilderPage, and null-renderer regression, but task-by-task verification is incomplete without the required table. |
| RED confirmed (tests exist) | ✅ | Related test files exist across all major change areas. |
| GREEN confirmed (tests pass) | ✅ | Full suite now passes: **126/126**. |
| Triangulation adequate | ⚠️ | Fallback behavior is now triangulated by renderer tests, but mixed-dashboard persistence and positive renderer rendering still lack full scenario-level evidence. |
| Safety Net for modified files | ⚠️ | Cannot verify from the required apply-progress table because it is missing. |

**TDD Compliance**: 2/6 checks fully passed

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 27 | 4 | Vitest |
| Integration | 26 | 5 | Vitest + Testing Library + jsdom |
| E2E | 0 | 0 | not installed |
| **Total** | **53** | **9** | |

### Changed File Coverage
| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| `src/config/nodeRed.config.ts` | 94.87% | 90.00% | 55, 88 | ✅ Excellent |
| `src/services/nodeRedOverview.service.ts` | 81.81% | 50.00% | 28, 43 | ⚠️ Acceptable |
| `src/adapters/nodeRedOverview.adapter.ts` | 100.00% | 91.66% | 29 | ✅ Excellent |
| `src/widgets/resolvers/bindingResolver.ts` | 68.33% | 56.16% | multiple | ⚠️ Low |
| `src/components/admin/PropertyDock.tsx` | 38.98% | 43.04% | multiple | ⚠️ Low |
| `src/pages/Dashboard.tsx` | 89.79% | 80.00% | 68, 85, 123, 145, 149 | ✅ Excellent |
| `src/components/viewer/DashboardViewer.tsx` | 100.00% | 66.66% | 76-79 | ⚠️ Acceptable |
| `src/pages/admin/DashboardBuilderPage.tsx` | 36.81% | 29.72% | multiple | ⚠️ Low |
| `src/domain/admin.types.ts` | 8.33% | 9.09% | multiple | ⚠️ Low |
| `src/components/ui/MetricCard.tsx` | 77.77% | 55.55% | 68, 78 | ⚠️ Acceptable |
| `src/widgets/renderers/KpiWidget.tsx` | 64.00% | 39.17% | multiple | ⚠️ Low |
| `src/widgets/renderers/TrendChartWidget.tsx` | 20.00% | 17.72% | multiple | ⚠️ Low |

**Average reported changed-file line coverage**: 65.64%

### Assertion Quality
| File | Line | Assertion | Issue | Severity |
|------|------|-----------|-------|----------|
| `hmi-app/src/pages/Dashboard.test.tsx` | 129-133 | `expect(dashboardViewerMock).toHaveBeenCalledWith(...)` | Mock-based wiring assertion rather than user-visible behavior | WARNING |
| `hmi-app/src/components/viewer/DashboardViewer.test.tsx` | 203-207 | `expect(widgetRendererMock).toHaveBeenCalledWith(...)` | Implementation-detail coupling to renderer props | WARNING |
| `hmi-app/src/pages/admin/DashboardBuilderPage.test.tsx` | 382-387 | `expect(propertyDockMock.mock.calls.at(-1)?.[0]).toMatchObject(...)` | Mock-based prop assertion, not DOM behavior | WARNING |

**Assertion quality**: 0 CRITICAL, 3 WARNING

### Quality Metrics
- **Linter**: ❌ 9 errors, 2 warnings on change-related files (`PropertyDock.tsx`, `admin.types.ts`, `Dashboard.tsx`, `DashboardBuilderPage.tsx`, `bindingResolver.test.ts`, `hierarchyResolver.ts`, plus ignored `.env.example` warning)
- **Type Checker**: ❌ whole-project `npx tsc -b` fails; user-provided context and apply-progress say these are pre-existing, so this remains non-regression evidence rather than a newly introduced blocker in the implementation itself.

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| FR1 | Real origin loads machines | `src/components/admin/PropertyDock.test.tsx > renders Node-RED machine names when machines are available` | ✅ COMPLIANT |
| FR2 | Machine-scoped variables | `src/components/admin/PropertyDock.test.tsx > shows variables from machine.variables when a machine is selected` | ✅ COMPLIANT |
| FR3 | Variable becomes invalid | `src/components/admin/PropertyDock.test.tsx > resets variableKey when the selected machine changes to one that does not contain it` | ✅ COMPLIANT |
| FR4 | Save mixed dashboards | `src/components/admin/PropertyDock.test.tsx > persists machineId, variableKey and bindingVersion when saving a Node-RED binding`; `src/widgets/resolvers/bindingResolver.test.ts > keeps legacy real bindings on the equipmentMap path even when node-red machines are provided` | ⚠️ PARTIAL |
| FR5 | Value resolves from Node-RED | `src/widgets/resolvers/bindingResolver.test.ts > resolves node-red-v1 bindings from nodeRedMachines` | ⚠️ PARTIAL |
| FR6 | Upstream failure or miss | `src/widgets/renderers/nodeRedNullDisplay.test.tsx > renders -- in KpiWidget when the resolved Node-RED value is null`; `... > renders -- in MetricWidget when the resolved Node-RED value is null`; `... > renders -- in TrendChartWidget when the resolved Node-RED value is null` | ✅ COMPLIANT |
| FR7 | Simulated dashboard unchanged | `src/widgets/resolvers/bindingResolver.test.ts > keeps simulated mode unchanged when node-red machines are also provided`; `src/widgets/renderers/nodeRedNullDisplay.test.tsx > keeps simulated KPI values rendering as numbers` | ✅ COMPLIANT |
| FR8 | Config-driven endpoint | `src/config/nodeRed.config.test.ts > joins base url and endpoint into the full url`; `src/services/nodeRedOverview.service.test.ts > fetches the overview from the configured endpoint using GET only` | ✅ COMPLIANT |
| NFR1-NFR4 | Polling and failure tolerance | `src/config/nodeRed.config.test.ts > exports polling defaults tuned for frequent overview refreshes`; `src/components/admin/PropertyDock.test.tsx > shows an error state when Node-RED loading fails`; `src/widgets/renderers/nodeRedNullDisplay.test.tsx > renders -- ... when the resolved Node-RED value is null` | ⚠️ PARTIAL |

**Compliance summary**: 6/9 scenarios compliant

### Correctness (Static — Structural Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| FR1 | ✅ Implemented | PropertyDock consumes adapted `nodeRedMachines` and surfaces machine options. |
| FR2 | ✅ Implemented | Variable select is driven by `selectedNodeRedMachine.variables`. |
| FR3 | ✅ Implemented | Machine switch clears invalid `variableKey`. |
| FR4 | ⚠️ Partial | Persistence shape is correct, but scenario-level mixed save/reload evidence is incomplete. |
| FR5 | ⚠️ Partial | Node-RED value resolution is implemented end-to-end, but widget-level positive render proof is incomplete. |
| FR6 | ✅ Implemented | Null stays null through renderers and now displays `--`. |
| FR7 | ✅ Implemented | Simulated and legacy paths are preserved. |
| FR8 | ✅ Implemented | URL/config/service design is read-only and GET-only. |
| NFR1 | ⚠️ Partial | Good default exists; external configurability is limited. |
| NFR2 | ⚠️ Partial | Failure states are represented, but runtime responsiveness under transient refetch failure is not directly tested. |
| NFR3 | ✅ Implemented | Graceful degradation now works in actual widgets. |
| NFR4 | ⚠️ Partial | Type safety is not fully green project-wide; no evidence the current change introduced those failures. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Service → adapter → query → UI pipeline | ✅ Yes | `nodeRedOverview.service.ts`, `nodeRedOverview.adapter.ts`, `useNodeRedOverview.ts`, `PropertyDock.tsx`, `Dashboard.tsx`. |
| PropertyDock uses adapted machine variables, not raw `Object.keys(values)` | ✅ Yes | Variable options come from `selectedNodeRedMachine.variables`. |
| Persist `machineId + variableKey + bindingVersion` while keeping legacy bindings readable | ✅ Yes | Implemented in `admin.types.ts`, `PropertyDock.tsx`, and `bindingResolver.ts`. |
| Node-RED-first resolution with legacy fallback | ✅ Yes | `bindingResolver.ts` checks `bindingVersion === 'node-red-v1'` then falls back to legacy equipment map path. |
| Domain contracts match approved spec | ⚠️ Deviated | `src/domain/nodeRed.types.ts` still omits spec-declared `boolean`, `quality`, optional `values`, and `fetchedAt`. |

### Issues Found

**CRITICAL**
- Strict TDD traceability still fails: the Engram `apply-progress` artifact does not contain the required `TDD Cycle Evidence` and `Files Changed` tables, so full strict-TDD verification cannot be completed.

**WARNING**
- Engram/OpenSpec task artifacts still drift (`11/12` vs `12/12`).
- FR4 remains only partially evidenced because the spec asks for mixed-dashboard save/reload roundtrip behavior.
- FR5 remains only partially evidenced because there is still no positive renderer-level DOM assertion for a real Node-RED value + unit.
- NFR1/NFR2/NFR4 remain partial.
- Coverage remains below the enforced global threshold and several changed files are still low-coverage.
- Lint and typecheck are not green project-wide.

**SUGGESTION**
- Add a mixed-dashboard persistence roundtrip test that saves and reloads legacy + Node-RED widgets together.
- Add positive renderer DOM tests for real Node-RED values/units in `MetricWidget`, `KpiWidget`, and `TrendChartWidget`.
- Align `src/domain/nodeRed.types.ts` with the approved spec contract.

### Verdict
FAIL

FR6 and NFR3 are now PASS with real runtime evidence, but the change still cannot be fully approved under Strict TDD because the required apply-progress traceability artifact is incomplete, and several requirements remain only PARTIAL.
