# Technical Design: Node-RED Binding

## 1. File Structure

### New Files

| File | Purpose |
|------|---------|
| `src/domain/nodeRed.types.ts` | Raw API response types + adapted domain types |
| `src/services/nodeRedOverview.service.ts` | HTTP fetch from Node-RED `/api/hmi/overview` |
| `src/adapters/nodeRedOverview.adapter.ts` | Raw response → domain types (pure function) |
| `src/queries/useNodeRedOverview.ts` | TanStack Query hook with polling |
| `src/config/nodeRed.config.ts` | Centralized env reading + defaults |
| `.env.example` | Documents `VITE_NODE_RED_BASE_URL` |

### Modified Files

| File | Change |
|------|--------|
| `src/domain/admin.types.ts` | Add `machineId`, `bindingVersion` to `WidgetBinding` |
| `src/widgets/resolvers/bindingResolver.ts` | Add Node-RED resolution path in `resolveReal` |
| `src/components/admin/PropertyDock.tsx` | Replace `equipmentMap` selects with Node-RED selects for real mode |
| `src/pages/Dashboard.tsx` | Call `useNodeRedOverview`, pass data to viewer |
| `src/pages/admin/DashboardBuilderPage.tsx` | Call `useNodeRedOverview`, pass to PropertyDock and preview |

---

## 2. Domain Types

### `src/domain/nodeRed.types.ts`

```typescript
// =============================================================================
// DOMAIN: Node-RED
// Types for the Node-RED HMI overview endpoint.
//
// Two layers:
//   1. Raw API shape (NodeRedOverviewResponse) — matches /api/hmi/overview JSON
//   2. Adapted domain types (NodeRedMachine) — clean internal contracts
//
// The adapter transforms 1 → 2. UI code ONLY touches layer 2.
// =============================================================================

// --- RAW API SHAPE (matches /api/hmi/overview response) ---

/**
 * Raw value entry from Node-RED overview.
 * Shape: { "value": 1500, "unit": "RPM", "timestamp": "2026-04-21T..." }
 */
export interface NodeRedRawValue {
    value: number | string | null;
    unit?: string;
    timestamp?: string;
}

/**
 * Raw machine entry from Node-RED overview.
 * Shape: { "unitId": 1, "name": "Comprimidora 01", "values": { "rotorSpeed": {...}, ... } }
 */
export interface NodeRedRawMachine {
    unitId: number;
    name: string;
    values: Record<string, NodeRedRawValue>;
}

/**
 * Full raw response from GET /api/hmi/overview.
 * Shape: { "machines": [...], "timestamp": "..." }
 */
export interface NodeRedOverviewResponse {
    machines: NodeRedRawMachine[];
    timestamp?: string;
}

// --- ADAPTED DOMAIN TYPES ---

/**
 * A single variable reading from a Node-RED machine.
 * Adapted from the raw `values` record entries.
 */
export interface NodeRedVariable {
    key: string;           // e.g. 'rotorSpeed', 'temperature'
    value: number | string | null;
    unit?: string;
    timestamp?: string;
}

/**
 * Adapted machine with its variables as a flat array.
 * This is what UI components and the resolver consume.
 */
export interface NodeRedMachine {
    unitId: number;        // stable machine identity
    name: string;          // display name
    variables: NodeRedVariable[];
}
```

### Updated `WidgetBinding` in `src/domain/admin.types.ts`

```typescript
export interface WidgetBinding {
    mode: BindingMode;
    assetId?: string;                    // legacy — kept for backward compat
    variableKey?: string;                // semantic key (e.g. 'rotorSpeed')
    formatter?: string;
    unit?: string;
    catalogVariableId?: string;
    lastKnownValueAllowed?: boolean;
    staleTimeout?: number;
    simulatedValue?: number | string | boolean;
    // --- NEW: Node-RED binding identity ---
    /** Node-RED machine unitId. Present when bindingVersion = 'node-red-v1'. */
    machineId?: number;
    /**
     * Binding version discriminator.
     * - undefined / absent → legacy binding (resolved via equipmentMap/assetId)
     * - 'node-red-v1'      → resolved via Node-RED overview by machineId + variableKey
     */
    bindingVersion?: 'node-red-v1';
}
```

**Backward compatibility**: `assetId` stays. Legacy dashboards without `bindingVersion` keep resolving via the existing `equipmentMap` path. No migration needed.

---

## 3. Service Layer

### `src/services/nodeRedOverview.service.ts`

```typescript
import type { NodeRedOverviewResponse } from '../domain/nodeRed.types';
import { getNodeRedBaseUrl } from '../config/nodeRed.config';

// =============================================================================
// SERVICE: Node-RED Overview
// Fetches the HMI overview snapshot from Node-RED.
// READ-ONLY — no writes to plant systems.
//
// Error contract: throws NodeRedServiceError on any failure.
// The query layer catches and exposes isError to the UI.
// =============================================================================

export class NodeRedServiceError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
    ) {
        super(message);
        this.name = 'NodeRedServiceError';
    }
}

/**
 * Fetches the overview snapshot from Node-RED.
 * Returns the raw API response — the adapter transforms it.
 *
 * @throws NodeRedServiceError on network or HTTP errors.
 */
export async function fetchNodeRedOverview(): Promise<NodeRedOverviewResponse> {
    const baseUrl = getNodeRedBaseUrl();

    if (!baseUrl) {
        throw new NodeRedServiceError(
            'VITE_NODE_RED_BASE_URL is not configured',
        );
    }

    const url = `${baseUrl}/api/hmi/overview`;

    let response: Response;
    try {
        response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });
    } catch (err) {
        throw new NodeRedServiceError(
            `Network error fetching Node-RED overview: ${(err as Error).message}`,
        );
    }

    if (!response.ok) {
        throw new NodeRedServiceError(
            `Node-RED overview returned ${response.status}: ${response.statusText}`,
            response.status,
        );
    }

    return response.json() as Promise<NodeRedOverviewResponse>;
}
```

### `src/config/nodeRed.config.ts`

```typescript
// =============================================================================
// CONFIG: Node-RED
// Centralized env reading for Node-RED integration.
// All Node-RED service/query code reads from here — never from import.meta.env directly.
// =============================================================================

/** Default polling interval in ms for Node-RED overview. */
export const NODE_RED_DEFAULT_REFETCH_INTERVAL = 5_000;

/** Stale time in ms — data considered fresh for this duration. */
export const NODE_RED_DEFAULT_STALE_TIME = 4_000;

/**
 * Returns the configured Node-RED base URL, or null if not set.
 * Reads from `VITE_NODE_RED_BASE_URL` env variable.
 *
 * Example: 'https://192.168.50.250:51880'
 * Trailing slash is stripped if present.
 */
export function getNodeRedBaseUrl(): string | null {
    const raw = import.meta.env.VITE_NODE_RED_BASE_URL as string | undefined;
    if (!raw || raw.trim() === '') return null;
    return raw.replace(/\/+$/, '');
}

/**
 * Whether Node-RED integration is enabled (base URL is configured).
 */
export function isNodeRedEnabled(): boolean {
    return getNodeRedBaseUrl() !== null;
}
```

---

## 4. Adapter Layer

### `src/adapters/nodeRedOverview.adapter.ts`

```typescript
import type {
    NodeRedOverviewResponse,
    NodeRedMachine,
    NodeRedVariable,
} from '../domain/nodeRed.types';

// =============================================================================
// ADAPTER: Node-RED Overview
// Pure function — transforms the raw /api/hmi/overview response into
// clean domain types. No side effects, no network calls, easily testable.
// =============================================================================

/**
 * Adapts the raw Node-RED overview response to an array of NodeRedMachine.
 *
 * Guarantees:
 * - Always returns an array (empty if input is invalid).
 * - Each machine has a flat `variables` array derived from the `values` record.
 * - Filters out machines with no unitId or no name.
 */
export function adaptOverview(raw: NodeRedOverviewResponse): NodeRedMachine[] {
    if (!raw?.machines || !Array.isArray(raw.machines)) {
        return [];
    }

    return raw.machines
        .filter((m) => m.unitId != null && m.name)
        .map((m) => ({
            unitId: m.unitId,
            name: m.name,
            variables: adaptVariables(m.values),
        }));
}

/**
 * Converts a Record<string, NodeRedRawValue> to a flat NodeRedVariable[].
 */
function adaptVariables(
    values: Record<string, { value: number | string | null; unit?: string; timestamp?: string }> | undefined,
): NodeRedVariable[] {
    if (!values || typeof values !== 'object') {
        return [];
    }

    return Object.entries(values).map(([key, raw]) => ({
        key,
        value: raw.value ?? null,
        unit: raw.unit,
        timestamp: raw.timestamp,
    }));
}
```

---

## 5. Query Layer

### `src/queries/useNodeRedOverview.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchNodeRedOverview } from '../services/nodeRedOverview.service';
import { adaptOverview } from '../adapters/nodeRedOverview.adapter';
import {
    isNodeRedEnabled,
    NODE_RED_DEFAULT_REFETCH_INTERVAL,
    NODE_RED_DEFAULT_STALE_TIME,
} from '../config/nodeRed.config';
import type { NodeRedMachine } from '../domain/nodeRed.types';

// =============================================================================
// QUERY: useNodeRedOverview
// TanStack Query hook that polls /api/hmi/overview at a fixed interval.
//
// Query key: ['node-red', 'overview']
// Enabled: only when VITE_NODE_RED_BASE_URL is configured.
//
// Returns adapted NodeRedMachine[] — never raw API shapes.
// =============================================================================

export const NODE_RED_OVERVIEW_QUERY_KEY = ['node-red', 'overview'] as const;

export interface UseNodeRedOverviewResult {
    machines: NodeRedMachine[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    dataUpdatedAt: number;
}

export function useNodeRedOverview(): UseNodeRedOverviewResult {
    const enabled = isNodeRedEnabled();

    const query = useQuery<NodeRedMachine[]>({
        queryKey: NODE_RED_OVERVIEW_QUERY_KEY,
        queryFn: async () => {
            const raw = await fetchNodeRedOverview();
            return adaptOverview(raw);
        },
        enabled,
        refetchInterval: NODE_RED_DEFAULT_REFETCH_INTERVAL,
        staleTime: NODE_RED_DEFAULT_STALE_TIME,
        retry: 2,
        refetchOnWindowFocus: true,
    });

    return {
        machines: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        dataUpdatedAt: query.dataUpdatedAt,
    };
}
```

---

## 6. PropertyDock Changes

### Modified: `src/components/admin/PropertyDock.tsx`

#### New prop

```typescript
interface PropertyDockProps {
    // ... existing props ...
    equipmentMap: Map<string, EquipmentSummary>;
    /** Node-RED machines for real_variable binding. Empty = not configured. */
    nodeRedMachines: NodeRedMachine[];
    nodeRedLoading?: boolean;
    nodeRedError?: boolean;
    // ... rest unchanged ...
}
```

#### New handler: `handleMachineChange`

```typescript
const handleMachineChange = (machineIdStr: string) => {
    if (!selectedWidget) return;
    const machineId = Number(machineIdStr);
    onUpdateWidget({
        ...selectedWidget,
        binding: {
            ...binding,
            machineId,
            variableKey: undefined,  // reset — previous key may not exist on new machine
            bindingVersion: 'node-red-v1',
        },
    });
};
```

#### Modified handler: `handleVariableChange`

Existing handler stays the same — already writes `variableKey` into binding.

#### Modified handler: `handleAssetChange`

Remains for legacy dashboards. New Node-RED bindings use `handleMachineChange` instead.

#### UI replacement in the `real_variable` block (lines 731-759)

The current code at `PropertyDock.tsx:731-759` renders Equipo/Variable selects from `equipmentMap`. Replace with:

```tsx
{binding.mode === 'real_variable' && (
    <>
        {/* Machine select — fed by Node-RED overview */}
        <DockFieldRow label="Equipo">
            {props.nodeRedLoading ? (
                <div className={`${INPUT_CLS} flex items-center gap-2 text-industrial-muted`}>
                    <Loader2 size={12} className="animate-spin" />
                    <span className="text-[10px]">Cargando equipos...</span>
                </div>
            ) : props.nodeRedError || props.nodeRedMachines.length === 0 ? (
                <div className={`${INPUT_CLS} text-[10px] text-industrial-muted`}>
                    {props.nodeRedError
                        ? 'Error cargando equipos'
                        : 'No configurado'}
                </div>
            ) : (
                <AdminSelect
                    disabled={isBindingSourceDisabled}
                    value={String(binding.machineId ?? '')}
                    onChange={val => handleMachineChange(val)}
                    placeholder="Seleccione..."
                    options={props.nodeRedMachines.map(m => ({
                        value: String(m.unitId),
                        label: m.name,
                    }))}
                />
            )}
        </DockFieldRow>

        {/* Variable select — filtered by selected machine */}
        {selectedNodeRedMachine && selectedWidget.type !== 'connection-status'
            && selectedWidget.type !== 'connection-indicator'
            && selectedWidget.type !== 'status' && (
            <DockFieldRow label="Variable">
                <AdminSelect
                    disabled={isBindingSourceDisabled}
                    value={binding.variableKey || ''}
                    onChange={val => handleVariableChange(val)}
                    placeholder="Seleccione..."
                    options={selectedNodeRedMachine.variables.map(v => ({
                        value: v.key,
                        label: `${v.key}${v.unit ? ` (${v.unit})` : ''}`,
                    }))}
                />
            </DockFieldRow>
        )}
    </>
)}
```

Where `selectedNodeRedMachine` is derived above the JSX:

```typescript
const selectedNodeRedMachine = binding.machineId != null
    ? props.nodeRedMachines.find(m => m.unitId === binding.machineId)
    : undefined;
```

**Key behavior**:
- When `nodeRedMachines` is empty and no error → shows "No configurado" (env not set)
- When loading → spinner
- When error → "Error cargando equipos"
- Machine change → resets `variableKey` to prevent stale key from different machine
- Always writes `bindingVersion: 'node-red-v1'` on machine change

---

## 7. bindingResolver Changes

### Modified: `src/widgets/resolvers/bindingResolver.ts`

#### New import

```typescript
import type { NodeRedMachine } from '../../domain/nodeRed.types';
```

#### Expanded function signature

```typescript
export interface BindingResolverOptions {
    equipmentMap: EquipmentMap;
    /** Node-RED machine data. When present, used for node-red-v1 bindings. */
    nodeRedMachines?: NodeRedMachine[];
}

export function resolveBinding(
    widget: WidgetConfig,
    options: BindingResolverOptions,
): ResolvedBinding {
    const binding = widget.binding;

    // CASO 1: Sin binding
    if (!binding) {
        if (widget.simulatedValue !== undefined) {
            return resolveSimulated(widget.simulatedValue, undefined, widget.thresholds);
        }
        return noDataResult();
    }

    // CASO 2: Simulated value
    if (binding.mode === 'simulated_value') {
        return resolveSimulated(binding.simulatedValue, binding.unit, widget.thresholds);
    }

    // CASO 3: Real variable — Node-RED first, legacy fallback
    return resolveReal(binding, options, widget);
}
```

#### Modified `resolveReal`

```typescript
function resolveReal(
    binding: WidgetBinding,
    options: BindingResolverOptions,
    widget: WidgetConfig,
): ResolvedBinding {
    // --- Node-RED v1 resolution (new path) ---
    if (binding.bindingVersion === 'node-red-v1' && options.nodeRedMachines) {
        return resolveNodeRed(binding, options.nodeRedMachines, widget);
    }

    // --- Legacy resolution via equipmentMap (unchanged) ---
    if (!binding.assetId) {
        return noDataResult();
    }

    const equipment = options.equipmentMap.get(binding.assetId);
    if (!equipment) {
        return errorResult();
    }

    // ... rest of existing legacy logic unchanged ...
}
```

#### New `resolveNodeRed` helper

```typescript
/**
 * Resolves a node-red-v1 binding by looking up machineId + variableKey
 * in the Node-RED overview data.
 */
function resolveNodeRed(
    binding: WidgetBinding,
    machines: NodeRedMachine[],
    widget: WidgetConfig,
): ResolvedBinding {
    if (binding.machineId == null) {
        return noDataResult();
    }

    const machine = machines.find(m => m.unitId === binding.machineId);
    if (!machine) {
        return errorResult();
    }

    // For status/connection widgets, machine existence is enough
    if (!binding.variableKey) {
        return noDataResult();
    }

    const variable = machine.variables.find(
        v => v.key === binding.variableKey,
    );

    if (!variable || variable.value === null || variable.value === undefined) {
        return {
            value: null,
            status: 'no-data',
            source: 'real',
        };
    }

    const numericValue = typeof variable.value === 'number' ? variable.value : null;
    const status = evaluateThresholds(numericValue, widget.thresholds);

    return {
        value: variable.value,
        unit: variable.unit ?? binding.unit,
        status,
        source: 'real',
        lastUpdateAt: variable.timestamp,
    };
}
```

---

## 8. Integration Points

### `src/pages/Dashboard.tsx` (viewer)

```diff
+ import { useNodeRedOverview } from '../queries/useNodeRedOverview';

  export default function Dashboard() {
+     const { machines: nodeRedMachines } = useNodeRedOverview();

      // ... existing code ...

      // Replace direct equipmentMap usage with options object in DashboardViewer
      <DashboardViewer
          widgets={activeDashboard.widgets}
          layout={activeDashboard.layout}
-         equipmentMap={equipmentMap}
+         equipmentMap={equipmentMap}
+         nodeRedMachines={nodeRedMachines}
          headerWidgetIds={headerWidgetIds}
          hierarchyContext={hierarchyContext}
          cols={activeDashboard.cols}
          rows={activeDashboard.rows}
      />
```

DashboardViewer (and DashboardHeader) pass `nodeRedMachines` through to the renderers, which call `resolveBinding(widget, { equipmentMap, nodeRedMachines })`.

### `src/pages/admin/DashboardBuilderPage.tsx` (builder)

```diff
+ import { useNodeRedOverview } from '../../queries/useNodeRedOverview';

  export default function DashboardBuilderPage() {
+     const {
+         machines: nodeRedMachines,
+         isLoading: nodeRedLoading,
+         isError: nodeRedError,
+     } = useNodeRedOverview();

      // ... existing code ...

      <PropertyDock
          selectedWidget={selectedWidget}
          selectedLayout={selectedWidgetLayout}
          equipmentMap={equipmentMap}
+         nodeRedMachines={nodeRedMachines}
+         nodeRedLoading={nodeRedLoading}
+         nodeRedError={nodeRedError}
          catalogVariables={allCatalogVariables}
          // ... rest unchanged ...
      />
```

### Data Flow Diagram

```
                        ┌──────────────────────┐
                        │   Node-RED Server     │
                        │  /api/hmi/overview    │
                        └──────────┬───────────┘
                                   │ HTTP GET (polled)
                        ┌──────────▼───────────┐
                        │  nodeRedOverview      │
                        │  .service.ts          │
                        │  (fetch, error wrap)  │
                        └──────────┬───────────┘
                                   │ NodeRedOverviewResponse
                        ┌──────────▼───────────┐
                        │  nodeRedOverview      │
                        │  .adapter.ts          │
                        │  adaptOverview()      │
                        └──────────┬───────────┘
                                   │ NodeRedMachine[]
                        ┌──────────▼───────────┐
                        │  useNodeRedOverview   │
                        │  (TanStack Query)     │
                        │  polls every 5s       │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
           ┌────────▼──┐   ┌──────▼──────┐  ┌───▼──────────┐
           │ Dashboard  │   │ Builder     │  │ PropertyDock │
           │ (viewer)   │   │ Page        │  │ (admin)      │
           └────────┬──┘   └──────┬──────┘  └───┬──────────┘
                    │              │              │
                    │    nodeRedMachines          │ populates
                    │    + equipmentMap           │ Machine/Variable
                    │              │              │ selects
           ┌────────▼──────────────▼──┐          │
           │  resolveBinding(widget,  │          │ persists
           │    { equipmentMap,       │          │ machineId +
           │      nodeRedMachines })  │          │ variableKey +
           └──────────┬──────────────┘          │ bindingVersion
                      │                          │
             ResolvedBinding                     │
              { value, status,                   ▼
                source, unit }          WidgetBinding
                      │                 { machineId, variableKey,
                      ▼                   bindingVersion: 'node-red-v1' }
              Widget Renderers
              (KPI, MetricCard, etc.)
              Display value or "--"
```

---

## 9. Environment Configuration

### `.env.example` (new)

```env
# Node-RED HMI Overview endpoint
# Set this to enable real-variable binding from Node-RED.
# Must be reachable from the browser (proxy/trusted environment).
# Example: https://192.168.50.250:51880
VITE_NODE_RED_BASE_URL=
```

### Access pattern

All code reads via `src/config/nodeRed.config.ts` — never `import.meta.env` directly.

```
import.meta.env.VITE_NODE_RED_BASE_URL
         ↓
    nodeRed.config.ts → getNodeRedBaseUrl()
         ↓
    service / query / PropertyDock
```

### When not configured

- `getNodeRedBaseUrl()` returns `null`
- `isNodeRedEnabled()` returns `false`
- `useNodeRedOverview` has `enabled: false` → no fetch, `machines: []`
- PropertyDock shows "No configurado" in the select
- `resolveReal` falls through to legacy `equipmentMap` path (no `nodeRedMachines` available)

---

## 10. Error Boundaries

### Layer-by-layer error handling

| Layer | Error Case | Behavior |
|-------|-----------|----------|
| **Config** | `VITE_NODE_RED_BASE_URL` empty | `isNodeRedEnabled()` returns false; query disabled; selects show "No configurado" |
| **Service** | Network timeout / DNS failure | Throws `NodeRedServiceError`; query catches it |
| **Service** | HTTP 4xx/5xx | Throws `NodeRedServiceError` with `statusCode` |
| **Query** | Any error from service | `retry: 2`; after exhaustion: `isError: true`, `machines: []` |
| **PropertyDock** | `isError: true` | Shows "Error cargando equipos" in place of select |
| **PropertyDock** | `isLoading: true` | Shows spinner + "Cargando equipos..." |
| **Resolver** | `nodeRedMachines` undefined/empty | Falls through to legacy `equipmentMap` path |
| **Resolver** | Machine not found in `nodeRedMachines` | Returns `{ value: null, source: 'error', status: 'no-data' }` |
| **Resolver** | Variable not found on machine | Returns `{ value: null, source: 'real', status: 'no-data' }` |
| **Renderer** | `value: null` | Displays "--" (existing behavior) |

### No crash guarantee

- Service errors are caught and typed — never bubble to React tree
- Query layer wraps with retry + `isError` flag
- Resolver returns safe `ResolvedBinding` for every code path — no throws
- Renderers already handle `null` value → "--" display

---

## 11. Migration & Backward Compatibility

### Legacy dashboards (no `bindingVersion`)

- `WidgetBinding` without `machineId` or `bindingVersion` → resolver enters legacy `equipmentMap` path
- No migration script needed — old dashboards keep working as-is
- `assetId` field stays in the type and in persisted data

### New dashboards with Node-RED binding

- PropertyDock writes `machineId`, `variableKey`, `bindingVersion: 'node-red-v1'`
- `assetId` is NOT written for new Node-RED bindings (irrelevant)
- Resolver checks `bindingVersion === 'node-red-v1'` → enters Node-RED path

### Mixed dashboards

- A single dashboard can have some widgets with legacy bindings and some with `node-red-v1`
- Each widget resolves independently based on its own `bindingVersion`

---

## 12. Breaking Change Analysis

### `resolveBinding` signature change

**Before**: `resolveBinding(widget, equipmentMap)`
**After**: `resolveBinding(widget, { equipmentMap, nodeRedMachines? })`

This is a **breaking change** to the function signature. All call sites must be updated:

| Call site | Update |
|-----------|--------|
| `DashboardViewer` (or wherever renderers call resolver) | Pass `{ equipmentMap, nodeRedMachines }` |
| `DashboardHeader` (renders header widgets) | Same |
| Tests for `bindingResolver` | Update mock calls |

The `nodeRedMachines` parameter is optional — passing `undefined` preserves 100% backward behavior.

### `PropertyDock` prop addition

Non-breaking — new optional props with safe defaults. Existing callers that don't pass `nodeRedMachines` get "No configurado" UI state.
