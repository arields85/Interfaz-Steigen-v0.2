# Design: dynamic-grid-columns

## Overview

Architecture for replacing the hardcoded 4-column dashboard grid with a dynamic column system computed from container width. Single source of truth for grid math shared between builder and viewer. Render-time migration for legacy dashboards — no storage mutation.

## Module Structure

```
hmi-app/src/
├── utils/
│   └── gridConfig.ts          ← NEW: pure functions + constants (no React)
├── hooks/
│   └── useGridCols.ts         ← NEW: ResizeObserver hook returning { cols, containerWidth }
├── components/
│   ├── admin/
│   │   └── BuilderCanvas.tsx  ← MODIFIED: dynamic grid + resize from measured cellWidth
│   └── viewer/
│       └── DashboardViewer.tsx ← MODIFIED: dynamic grid + parameterized row calc
├── domain/
│   └── admin.types.ts         ← MODIFIED: gridVersion on Dashboard & PublishedSnapshot
└── services/
    └── DashboardStorageService.ts ← UNCHANGED (migration is render-time, not storage-time)
```

## 1. New Module: `hmi-app/src/utils/gridConfig.ts`

Pure functions and constants. Zero React imports. Fully testable in isolation.

### Constants

```ts
export const MIN_COL_WIDTH = 220;   // px — minimum width per column
export const MAX_COLS = 8;
export const MIN_COLS = 1;
export const VIEWER_GAP = 16;       // px — gap-4 equivalent (viewer)
export const BUILDER_GAP = 24;      // px — gap-6 equivalent (builder)
export const LEGACY_COLS = 4;       // column count assumed by legacy dashboards
export const CURRENT_GRID_VERSION = 2;
```

### Functions

```ts
/** Core column formula: clamp(floor(width / MIN_COL_WIDTH), MIN_COLS, MAX_COLS) */
export function computeGridCols(containerWidth: number): number;

/** Returns inline style object for the grid container */
export function getGridTemplateStyle(cols: number, gap: number): React.CSSProperties;
// → { display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: `${gap}px` }

/** Returns inline style for a widget's horizontal span */
export function getWidgetSpanStyle(w: number, cols: number): React.CSSProperties;
// → { gridColumn: `span ${clampedW} / span ${clampedW}` }
// where clampedW = Math.min(w, cols)

/** Scale a legacy widget width from LEGACY_COLS to current cols */
export function migrateWidgetWidth(w: number, currentCols: number): number;
// → Math.max(1, Math.round(w * (currentCols / LEGACY_COLS)))
// Special case: w === LEGACY_COLS → currentCols (full-width stays full-width)

/** Compute pixel width of a single cell given container width and cols */
export function computeCellWidth(containerWidth: number, cols: number, gap: number): number;
// → (containerWidth - (cols - 1) * gap) / cols
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Pure module, no React | Testable without DOM; reusable by any consumer |
| `React.CSSProperties` return type | Type-safe inline styles; avoids string concatenation in components |
| `migrateWidgetWidth` as separate function | Composable — caller decides when to apply; no side effects |
| Full-width special case in migration | `w=4` in legacy always meant "full width"; must map to `cols`, not `Math.round(4 * cols/4)` which is the same numerically but the intent is explicit |

## 2. Custom Hook: `hmi-app/src/hooks/useGridCols.ts`

```ts
import { useRef, useState, useEffect } from 'react';
import { computeGridCols } from '../utils/gridConfig';

interface UseGridColsResult {
  ref: React.RefObject<HTMLDivElement>;
  cols: number;
  containerWidth: number;
}

export function useGridCols(): UseGridColsResult;
```

### Behavior

1. Creates a `ref` to attach to the grid container `<div>`.
2. Sets up a `ResizeObserver` on mount that reads `contentRect.width`.
3. Calls `computeGridCols(width)` and stores `{ cols, containerWidth }` in state.
4. Cleans up observer on unmount.
5. Initial state: `cols = 4, containerWidth = 0` (safe fallback before first measurement).

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Returns `ref` instead of accepting one | Simpler API; consumer just spreads `ref` onto the container div |
| `containerWidth` exposed | Builder needs it for `computeCellWidth`; viewer needs it for nothing but it's free |
| No debounce | ResizeObserver already batches to animation frames; adding debounce would delay visual updates |
| Initial `cols=4` | Matches legacy value — prevents layout flash on first render |

## 3. DashboardViewer.tsx Changes

### Current State (what exists)

- `GRID_COLS = 4` constant (line 7)
- `grid-cols-4` Tailwind class (line 108)
- `col-span-*` Tailwind classes for widget spans (lines 118-121)
- `maxRows` calculation hardcoded to `GRID_COLS` (lines 61, 64, 70)
- ResizeObserver for **row height** already exists (line 92) — measures height

### Target State

```
┌─────────────────────────────────────────────────┐
│ DashboardViewer                                  │
│  ref ← useGridCols() → { cols, containerWidth } │
│                                                  │
│  ┌─ grid container ────────────────────────────┐ │
│  │ style={getGridTemplateStyle(cols, VIEWER_GAP)}│
│  │ style+={gridAutoRows: `${rowHeight}px`}     │ │
│  │                                              │ │
│  │  ┌──widget──┐  ┌──widget──┐  ┌──widget──┐  │ │
│  │  │ style=   │  │ style=   │  │ style=   │  │ │
│  │  │ getWidget│  │ getWidget│  │ getWidget│  │ │
│  │  │ SpanStyle│  │ SpanStyle│  │ SpanStyle│  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  │ │
│  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Changes

| Line/Area | Before | After |
|-----------|--------|-------|
| Imports | `—` | `+ useGridCols`, `+ getGridTemplateStyle, getWidgetSpanStyle, migrateWidgetWidth, VIEWER_GAP, CURRENT_GRID_VERSION` |
| `GRID_COLS` constant | `const GRID_COLS = 4` | **Removed** — replaced by `cols` from hook |
| `GAP` constant | `const GAP = 16` | **Removed** — use `VIEWER_GAP` from gridConfig |
| Container ref | `containerRef` for height observer | **Reuse** the hook's `ref` for both width (hook) and height (existing observer) |
| Grid container | `className="grid grid-cols-4 gap-4"` | `style={getGridTemplateStyle(cols, VIEWER_GAP)}` — remove Tailwind grid classes |
| Widget span | `col-span-*` Tailwind class | `style={getWidgetSpanStyle(effectiveW, cols)}` |
| `effectiveW` | `item.w` directly | If no `gridVersion`: `migrateWidgetWidth(item.w, cols)`, else `item.w` |
| `maxRows` calc | Uses `GRID_COLS` | Uses `cols` from hook |
| Row height observer | Standalone `ResizeObserver` | Remains — observes **height** of same container. Hook observes **width**. Two observers on same element is fine. |
| `rowSpan` | Tailwind `row-span-*` classes | `style={{ gridRow: \`span ${h} / span ${h}\` }}` for consistency (inline everywhere) |

### Ref Merging Strategy

The hook returns its own `ref`. The existing height observer also needs a ref to the same container. Solution: the hook's `ref` is used as the single container ref. The height `ResizeObserver` effect reads from `ref.current` directly (same pattern as today with `containerRef`).

## 4. BuilderCanvas.tsx Changes

### Current State

- `grid-cols-4` Tailwind class (line 215)
- `CELL_WIDTH = 280` hardcoded in `ResizeHandle` (line 80)
- `col-span-*` Tailwind classes (lines 229-232)
- `row-span-*` Tailwind classes (line 234)
- Width clamp `Math.min(newW, 4)` in resize (line 93)
- Empty state `col-span-4` (line 310)

### Target State

```
┌──────────────────────────────────────────────────────┐
│ BuilderCanvas                                         │
│  ref ← useGridCols() → { cols, containerWidth }      │
│  cellWidth = computeCellWidth(containerWidth,         │
│                               cols, BUILDER_GAP)      │
│                                                       │
│  ┌─ grid container ─────────────────────────────────┐ │
│  │ style={getGridTemplateStyle(cols, BUILDER_GAP)}  │ │
│  │ + className="auto-rows-[140px]"                  │ │
│  │                                                   │ │
│  │  ┌──widget──────────────┐  ┌──widget──┐          │ │
│  │  │ style=getWidgetSpan  │  │ style=.. │          │ │
│  │  │ + rowSpan inline     │  │          │          │ │
│  │  │                      │  │          │          │ │
│  │  │  ResizeHandle        │  │          │          │ │
│  │  │   cellWidth={cW}     │  │          │          │ │
│  │  │   maxCols={cols}     │  │          │          │ │
│  │  └──────────────────────┘  └──────────┘          │ │
│  └───────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Changes

| Line/Area | Before | After |
|-----------|--------|-------|
| Imports | `—` | `+ useGridCols`, `+ getGridTemplateStyle, getWidgetSpanStyle, computeCellWidth, BUILDER_GAP` |
| Grid container | `className="grid grid-cols-4 gap-6 auto-rows-[140px]"` | `style={getGridTemplateStyle(cols, BUILDER_GAP)}` + `className="auto-rows-[140px]"` |
| `ResizeHandle` props | `currentW, currentH` | `+ cellWidth: number, maxCols: number` |
| `CELL_WIDTH` constant | `const CELL_WIDTH = 280` inside ResizeHandle | **Removed** — `cellWidth` received as prop from parent |
| Width clamp in resize | `Math.min(newW, 4)` | `Math.min(newW, maxCols)` |
| Widget col span | `col-span-*` Tailwind class | `style={getWidgetSpanStyle(item.w, cols)}` |
| Widget row span | `row-span-*` Tailwind class | `style={{ gridRow: \`span ${h} / span ${h}\` }}` |
| Empty state | `col-span-4` | `style={{ gridColumn: \`span ${cols} / span ${cols}\` }}` |

### ResizeHandle Signature Change

```ts
// Before
function ResizeHandle({ widgetId, currentW, currentH, onResize }: {
    widgetId: string; currentW: number; currentH: number;
    onResize?: (id: string, w: number, h: number) => void;
})

// After
function ResizeHandle({ widgetId, currentW, currentH, cellWidth, maxCols, onResize }: {
    widgetId: string; currentW: number; currentH: number;
    cellWidth: number; maxCols: number;
    onResize?: (id: string, w: number, h: number) => void;
})
```

The `cellWidth` is computed once in `BuilderCanvas` via `computeCellWidth(containerWidth, cols, BUILDER_GAP)` and passed down. This avoids ResizeHandle needing to know about the grid system.

## 5. admin.types.ts Changes

### Dashboard Interface

Add `gridVersion` field:

```ts
export interface Dashboard {
    // ... existing fields ...
    /**
     * Grid version for layout migration.
     * - undefined / absent: legacy 4-column layout (pre-dynamic grid)
     * - 2: dynamic grid layout (widths are absolute grid spans)
     * New dashboards created after this change SHOULD set gridVersion: 2.
     */
    gridVersion?: number;
}
```

### PublishedSnapshot Interface

Add same field for consistency (snapshots are frozen copies of Dashboard state):

```ts
export interface PublishedSnapshot {
    widgets: WidgetConfig[];
    layout: WidgetLayout[];
    headerConfig?: DashboardHeaderConfig;
    publishedAt: string;
    /** Grid version at time of publishing. Matches Dashboard.gridVersion semantics. */
    gridVersion?: number;
}
```

### Design Decision: Optional, Not Required

`gridVersion` is optional (`number | undefined`) so ALL existing dashboards in localStorage continue to deserialize without error. The absence of the field IS the migration signal.

## 6. Migration Strategy

### Approach: Render-Time, Read-Only

Migration happens at **render time** in the grid components, NOT in `DashboardStorageService`. This is a deliberate decision.

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ localStorage │────▶│ Storage Service   │────▶│ Component        │
│ (raw JSON)   │     │ (no grid changes)│     │ (applies migration│
│              │     │                  │     │  if !gridVersion) │
└──────────────┘     └──────────────────┘     └──────────────────┘
```

| Aspect | Render-time migration | Storage migration (rejected) |
|--------|----------------------|------------------------------|
| Data mutation | None — original data preserved | Rewrites localStorage |
| Reversibility | 100% — just remove code | Requires rollback migration |
| Column-dependent | Yes — scales to CURRENT cols | Would need to pick a target cols at save time |
| Complexity | Low — one function call per widget | Medium — service changes + version bumping |

### Migration Logic (in components)

```ts
// In DashboardViewer and BuilderCanvas, when iterating layout items:
const effectiveW = dashboard.gridVersion
    ? item.w                                        // v2: use as-is
    : migrateWidgetWidth(item.w, cols);             // legacy: scale from 4 → cols
```

### When gridVersion Gets Written

- **New dashboards**: `createEmptyDashboard` sets `gridVersion: CURRENT_GRID_VERSION`.
- **Save after edit**: When the user saves in the builder (which now operates with dynamic cols), the saved `w` values are already in the dynamic-grid coordinate space. The builder sets `gridVersion: CURRENT_GRID_VERSION` on save.
- **Publish**: `publishDashboard` copies `gridVersion` into the snapshot.

This means legacy dashboards get "upgraded" to v2 on first save in the new builder, naturally.

## 7. Data Flow Diagram

```
                    ┌─────────────────────────┐
                    │   ResizeObserver         │
                    │   (browser native)       │
                    └────────┬────────────────┘
                             │ contentRect.width
                             ▼
                    ┌─────────────────────────┐
                    │   useGridCols()          │
                    │   hook                   │
                    │                          │
                    │ computeGridCols(width)   │
                    │ → { cols, containerWidth}│
                    └────┬───────────┬────────┘
                         │           │
            ┌────────────┘           └────────────┐
            ▼                                      ▼
   ┌────────────────────┐               ┌─────────────────────┐
   │  DashboardViewer   │               │  BuilderCanvas      │
   │                    │               │                     │
   │  gridVersion?      │               │  gridVersion?       │
   │  ├─ no → migrate   │               │  ├─ no → migrate   │
   │  └─ yes → use w    │               │  └─ yes → use w    │
   │                    │               │                     │
   │  getGridTemplate   │               │  getGridTemplate    │
   │  Style(cols,16)    │               │  Style(cols,24)     │
   │                    │               │                     │
   │  getWidgetSpan     │               │  getWidgetSpan      │
   │  Style(w, cols)    │               │  Style(w, cols)     │
   │                    │               │                     │
   │  maxRows uses cols │               │  computeCellWidth   │
   │                    │               │  → ResizeHandle     │
   └────────────────────┘               └─────────────────────┘
            │                                      │
            ▼                                      ▼
   ┌────────────────────┐               ┌─────────────────────┐
   │  Inline CSS Grid   │               │  Inline CSS Grid    │
   │  repeat(cols,       │               │  repeat(cols,       │
   │    minmax(0,1fr))  │               │    minmax(0,1fr))   │
   │  gridColumn:        │               │  gridColumn:        │
   │    span n / span n │               │    span n / span n  │
   └────────────────────┘               └─────────────────────┘
```

## 8. File-by-File Change Plan

| # | File | Action | Key Changes |
|---|------|--------|-------------|
| 1 | `utils/gridConfig.ts` | **Create** | Constants + 5 pure functions |
| 2 | `hooks/useGridCols.ts` | **Create** | ResizeObserver hook, returns ref+cols+width |
| 3 | `domain/admin.types.ts` | **Modify** | Add `gridVersion?: number` to `Dashboard` and `PublishedSnapshot` |
| 4 | `components/viewer/DashboardViewer.tsx` | **Modify** | Hook, inline grid styles, migration, parameterized maxRows |
| 5 | `components/admin/BuilderCanvas.tsx` | **Modify** | Hook, inline grid styles, dynamic cellWidth, resize clamp to cols |
| 6 | `services/DashboardStorageService.ts` | **Modify** (minimal) | Set `gridVersion: CURRENT_GRID_VERSION` in `createEmptyDashboard` |

### Recommended Implementation Order

1. `gridConfig.ts` — foundation, no dependencies
2. `useGridCols.ts` — depends on gridConfig
3. `admin.types.ts` — type change, no runtime impact
4. `DashboardViewer.tsx` — simpler consumer (no resize logic)
5. `BuilderCanvas.tsx` — most complex (resize + cellWidth)
6. `DashboardStorageService.ts` — set gridVersion on new dashboards

## 9. Key Architectural Decisions

| # | Decision | Alternatives Considered | Rationale |
|---|----------|------------------------|-----------|
| D1 | Render-time migration, not storage migration | Mutate in DashboardStorageService on load | Reversible, column-dependent scaling, zero data risk |
| D2 | Single `useGridCols` hook for both components | Inline ResizeObserver in each component | DRY, guarantees identical formula |
| D3 | Inline CSS for grid, not Tailwind classes | Dynamic Tailwind classes like `grid-cols-${n}` | Tailwind purges dynamic classes; inline is safe and explicit |
| D4 | `gridVersion` as optional number, not boolean | `isLegacy: boolean`, `gridVersion: 1 | 2` | Extensible — future grid changes bump to 3, 4, etc. |
| D5 | `cellWidth` passed as prop to ResizeHandle | ResizeHandle measures its own parent | Simpler, single measurement point, avoids extra observer |
| D6 | `hooks/` directory as new top-level folder | Put hook in `utils/` | Follows React convention; hooks are not pure utilities |
| D7 | Two ResizeObservers on viewer container (width + height) | Merge into one | Separation of concerns — hook owns width, existing effect owns height. Merging couples them unnecessarily. |

## 10. Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Tailwind purges `auto-rows-[140px]` | Keep as Tailwind class (bracket notation is JIT-safe); only grid-cols/col-span/row-span move to inline |
| Legacy dashboard looks wrong after migration | `migrateWidgetWidth` preserves proportions; full-width special case prevents `w=3` for what was `w=4` |
| ResizeObserver not available | All target browsers support it (Chrome 64+, Firefox 69+, Safari 13.1+); industrial HMI runs on known browsers |
| Flash of 4-column layout on first render | Hook initializes with `cols=4` — matches legacy, so no visual jump even before measurement |
