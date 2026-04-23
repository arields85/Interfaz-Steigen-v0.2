# node-red-binding Specification

## Purpose

Enable read-only real bindings backed by Node-RED while preserving legacy simulated and asset-based dashboards.

## Domain Types

```ts
export interface NodeRedOverviewResponse { machines: NodeRedMachineRaw[]; fetchedAt?: string }
export interface NodeRedMachineRaw { unitId: number; name: string; values?: Record<string, NodeRedMetricRaw | null | undefined> }
export interface NodeRedMetricRaw { value: number | string | boolean | null; unit?: string; timestamp?: string; quality?: 'good' | 'bad' | 'unknown' }

export interface NodeRedMachineOption { machineId: number; name: string; variableKeys: string[] }
export interface NodeRedMetricSnapshot { machineId: number; variableKey: string; value: number | string | boolean | null; unit?: string; timestamp?: string; quality: 'good' | 'bad' | 'unknown' }
export interface NodeRedOverview { machines: NodeRedMachineOption[]; metrics: Record<string, NodeRedMetricSnapshot> }

export type BindingVersion = 'legacy-asset' | 'node-red-v1'
export interface WidgetBinding {
  mode: 'real_variable' | 'simulated_value';
  assetId?: string; machineId?: number; variableKey?: string; bindingVersion?: BindingVersion;
  formatter?: string; unit?: string; catalogVariableId?: string; lastKnownValueAllowed?: boolean;
  staleTimeout?: number; simulatedValue?: number | string | boolean;
}
```

## Data Flow

- Admin/builder: Node-RED GET overview -> service -> adapter -> query hook -> PropertyDock machine/variable selects.
- Viewer/runtime: Node-RED GET overview -> service -> adapter -> query hook -> bindingResolver -> widget render.
- URL MUST come from env/config (`VITE_NODE_RED_BASE_URL`); browser code MUST NOT hardcode hostnames or bypass TLS checks.

## Requirements

### Requirement: FR1 Machine selector for real origin
The system MUST, when `origin = Variable Real`, populate the machine selector from adapted Node-RED machines.

#### Scenario: Real origin loads machines
- GIVEN the overview query returns machines
- WHEN the user selects `Variable Real`
- THEN the machine selector lists Node-RED machine names/ids

### Requirement: FR2 Variable selector depends on machine
The system MUST populate the variable selector only from the selected machine's available variable keys.

#### Scenario: Machine-scoped variables
- GIVEN a selected machine with values
- WHEN the variable selector opens
- THEN only that machine's keys are shown

### Requirement: FR3 Invalid variable resets on machine change
The system MUST clear `variableKey` when a machine change makes the current variable unavailable.

#### Scenario: Variable becomes invalid
- GIVEN a saved variable not present on the new machine
- WHEN the machine changes
- THEN the binding clears `variableKey`

### Requirement: FR4 Real binding persistence
The system MUST persist real bindings as `machineId + variableKey + bindingVersion: 'node-red-v1'` and MUST keep legacy `assetId` bindings readable.

#### Scenario: Save mixed dashboards
- GIVEN a dashboard with legacy and Node-RED widgets
- WHEN it is persisted and reloaded
- THEN each widget keeps its original binding shape and mode

### Requirement: FR5 Runtime real value rendering
The system MUST render the latest adapted Node-RED value for `node-red-v1` real bindings.

#### Scenario: Value resolves from Node-RED
- GIVEN a widget bound to an existing machine/key
- WHEN overview data contains that metric
- THEN the widget shows the real value and unit if present

### Requirement: FR6 Safe fallback
The system MUST show `--` when Node-RED is unavailable, returns no data, or the bound variable is missing, and MUST NOT break rendering.

#### Scenario: Upstream failure or miss
- GIVEN query failure, empty machines, empty values, or missing machine/key
- WHEN the widget renders
- THEN it shows `--` and remains interactive

### Requirement: FR7 Zero regression for simulated mode
The system SHALL preserve existing simulated behavior exactly for `simulated_value` bindings.

#### Scenario: Simulated dashboard unchanged
- GIVEN a simulated widget before the change
- WHEN the dashboard renders after the change
- THEN the rendered value and interactions are unchanged

### Requirement: FR8 Configured read-only endpoint
The system MUST read the Node-RED base URL from environment configuration, use GET requests only, and MUST NOT introduce POST/PUT/DELETE flows.

#### Scenario: Config-driven endpoint
- GIVEN `VITE_NODE_RED_BASE_URL` is set
- WHEN overview is requested
- THEN the client issues only GET calls against that configured base URL

### Requirement: NFR1-NFR4 Robust polling and typing
Polling SHOULD be configurable with a default near 5 seconds; network errors MUST NOT freeze UI; graceful degradation MAY expose stale state but MUST still show `--`; all contracts MUST remain strict TypeScript-safe.

#### Scenario: Polling and failure tolerance
- GIVEN the default polling config and a transient network error
- WHEN refetch occurs
- THEN the UI stays responsive, fallback output is stable, and types compile without `any`

## Edge Cases

- Empty `machines`: machine selector shows empty state; widgets show `--`.
- Machine with no `values`: variable selector empty; existing invalid key clears on edit.
- Previously bound machine/key removed upstream: persisted binding remains but resolves to `--`.
- Multiple widgets may share the same `machineId/variableKey` without duplication errors.
- Mixed simulated/legacy/Node-RED dashboards MUST coexist in one layout.
