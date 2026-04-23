# Proposal: Node-RED Binding

## Executive Summary

Add a tactical Node-RED provider beneath `bindingResolver` so real bindings read from `/api/hmi/overview` while simulated widgets and legacy dashboards keep working. Persist bindings with stable identity (`machineId`/`unitId` + `variableKey`) and prepare a later move to `catalogVariableId`-centric resolution.

## Intent

Replace mock-based real-variable resolution with read-only Node-RED telemetry without rewriting the widget pipeline.

## Scope

### In Scope
- Node-RED overview service, adapter, query hook, and domain types.
- Admin selectors fed by live machine/value metadata.
- Resolver fallback: Node-RED first, legacy `equipmentMap` second.

### Out of Scope
- Any write/control capability to plant systems.
- Full resolver rewrite or immediate `catalogVariableId` migration.

## Capabilities

### New Capabilities
- `node-red-binding`: Read-only widget binding against Node-RED machine variables.

### Modified Capabilities
- None.

## Approach

1. **Service/Adapter**: create `services/nodeRedOverview.service.ts` + `adapters/nodeRedOverview.adapter.ts`; fetch `https://192.168.50.250:51880/api/hmi/overview` with env-configurable base URL. For likely self-signed TLS, terminate trust in the proxy/dev server layer; browser code MUST NOT bypass certificate validation. Poll with TanStack Query (`refetchInterval` 5–10s, `staleTime` < interval). New sketches: `NodeRedOverviewResponse`, `NodeRedMachineSnapshot`, `NodeRedMetricSnapshot`, `NodeRedMachineOption`.
2. **PropertyDock population**: builder/admin page loads `useNodeRedOverview()`. Machine select lists `machines[].unitId/name`; variable select depends on chosen machine and lists `Object.keys(values)`. Show disabled select + spinner while loading, inline error copy on query failure, and empty-state text when no machines/values exist.
3. **Binding persistence**: extend `WidgetBinding` with `machineId?: number` and optional `bindingVersion?: 'legacy-asset' | 'node-red-v1'`; keep `assetId` for old dashboards. Save Node-RED bindings with `machineId + variableKey`; names remain display-only. Keep `catalogVariableId` optional as future semantic anchor.
4. **Resolver flow**: add optional `realProvider?: NodeRedBindingProvider` input to `resolveBinding`. `resolveReal()` tries Node-RED by `machineId/variableKey`; if unavailable or missing, falls back to current `equipmentMap` lookup. `ResolvedBinding` shape stays unchanged.
5. **Fallback/error**: on request failure, widgets return `value: null`, `status: 'no-data'`, `source: 'error'`; if cached last value exists and `lastKnownValueAllowed`, return it with `status: 'stale'`, `source: 'fallback'`. Never crash UI.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `hmi-app/src/domain/admin.types.ts` | Modified | `machineId` and binding version |
| `hmi-app/src/domain/nodeRed*.ts` | New | Node-RED raw/domain contracts |
| `hmi-app/src/services/adapters/queries` | New | Fetch, adapt, poll overview |
| `hmi-app/src/components/admin/PropertyDock.tsx` | Modified | Live machine/value selects |
| `hmi-app/src/pages/Dashboard.tsx`, `pages/admin/DashboardBuilderPage.tsx` | Modified | Provide query data to resolver |
| `hmi-app/src/widgets/resolvers/bindingResolver.ts` | Modified | Node-RED-first resolution |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Self-signed HTTPS blocks browser fetch | High | Use trusted proxy/env gateway |
| `variableKey` drift from upstream | Med | Bind to raw key, not label |
| Polling load/staleness tuning | Med | Centralize query defaults |

## Rollback Plan

Disable Node-RED query/provider and keep resolver on legacy `equipmentMap`; existing dashboards continue via `assetId`/`variableKey` and simulated mode.

## Dependencies

- Reachable trusted gateway for `192.168.50.250:51880`.

## Success Criteria

- [ ] Admin can bind using live Node-RED machines and variable keys.
- [ ] Viewer resolves Node-RED values without breaking simulated or legacy dashboards.
- [ ] Node-RED outages degrade gracefully with error/stale signaling.
