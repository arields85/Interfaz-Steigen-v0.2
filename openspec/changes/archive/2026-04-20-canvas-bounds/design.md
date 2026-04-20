# Design: canvas-bounds

## 1. Overview

`canvas-bounds` replaces the current partial-WYSIWYG, array-order-driven layout system with a
bounded, aspect-aware canvas where builder and viewer produce pixel-identical output. Every widget
occupies an explicit `(x, y)` position on a `20 × 12` logical grid; the canvas size is derived at
runtime from the measured viewport and a per-dashboard aspect ratio (`16:9`, `21:9`, `4:3`). Legacy
storage is hard-reset on first boot of the new version; dead code (`gridVersion`, `migrateLayoutWidth`)
is removed.

**Closed decisions driving this design (do not re-litigate):**

1. Viewport measurement — no `transform: scale()`.
2. `x/y` are canonical; array order is irrelevant to rendering.
3. Grid: `MAX_COLS = 20`, default `rows = 12`.
4. Aspect ratio per dashboard: `'16:9' | '21:9' | '4:3'`.
5. `rows` is editable per dashboard; default 12.
6. Templates carry `aspect` + `rows`.
7. Hard reset: coordinated key bump in all three storages + one-shot cleanup at bootstrap.
8. Overflow during interaction; clamp on pointer release (resize AND move).
9. Grid overlay: Option B — major lines every 2 cells + minor lines tenues; CSS `background-image`.
10. Grid toggle: Zustand + `persist` → localStorage.
11. Remove `gridVersion` / `migrateLayoutWidth`.
12. Template aspect mismatch → BLOCK with actionable message.

---

## 2. Module / file layout

| File | Action | Responsibility |
|------|--------|----------------|
| `hmi-app/src/utils/gridConfig.ts` | MODIFY | Add `MAX_COLS=20`, recalibrate `MIN_COL_WIDTH=60`; add `fitToAspect`, `computeCanvasReference`, `getRowHeight`, `clampWidgetBounds`, `isTemplateApplicable`; remove `LEGACY_COLS`, dead `migrateLayoutWidth`, `computeViewerReferenceWidth`, `getWidgetSpanStyle`; keep `computeGridCols` (updated signature — gap removed), `computeCellWidth` |
| `hmi-app/src/utils/useGridCols.ts` | MODIFY → rename to `useCanvasReference.ts` | Evolve into `useCanvasReference`: observes container + chrome heights via ResizeObserver and ref callbacks; exposes `{ canvasRef, canvas: { width, height, offsetX, offsetY, cols, rows, rowHeight, cellWidth } }` |
| `hmi-app/src/utils/legacyStorageCleanup.ts` | NEW | Defines `DASHBOARDS_STORAGE_KEY`, `TEMPLATES_STORAGE_KEY`, `VARIABLE_CATALOG_STORAGE_KEY`, `HIERARCHY_STORAGE_KEY`, `HIERARCHY_EXPANDED_STORAGE_KEY`, `NODE_TYPES_STORAGE_KEY`, `LEGACY_KEYS_TO_PURGE`, and exports `cleanupLegacyStorage(): void` |
| `hmi-app/src/components/admin/BuilderCanvas.tsx` | MODIFY | Renders widgets at explicit CSS Grid `(x+1, y+1)`; grid overlay via `background-image` CSS variables; pointer-events drag-to-move + resize; overflow allowed during interaction, clamp on `pointerup` |
| `hmi-app/src/components/viewer/DashboardViewer.tsx` | MODIFY | Renders widgets at explicit `(x, y)` from shared canvas reference; removes auto-placement sim and dynamic `rowHeight` calculation; consumes `useCanvasReference` |
| `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` | MODIFY | Wires aspect/rows editor (`DashboardSettingsPanel`); removes forced `gridVersion: 2` on save; passes `aspect`/`rows` through save and publish flows |
| `hmi-app/src/domain/admin.types.ts` | MODIFY | Add `DashboardAspect` type; add required `aspect` and `rows` to `Dashboard`, `PublishedSnapshot`, `Template`; `WidgetLayout.x/y/w/h` become semantically required and canonical; remove `gridVersion?` from `Dashboard` and `PublishedSnapshot` |
| `hmi-app/src/services/DashboardStorageService.ts` | MODIFY | Import `DASHBOARDS_STORAGE_KEY` (`laboratorio_hmi_dashboards_v1`) from `legacyStorageCleanup.ts`; add `aspect`/`rows` to `createEmptyDashboard` and `createFromTemplate`; `publishDashboard` copies `aspect`/`rows` into snapshot; remove migration block for widget-type renames (new key = clean start from mocks) |
| `hmi-app/src/services/TemplateStorageService.ts` | MODIFY | Import `TEMPLATES_STORAGE_KEY` (`laboratorio_hmi_templates_v1`) from `legacyStorageCleanup.ts`; update seed `layoutPreset` shape to include `aspect`/`rows` on each template |
| `hmi-app/src/services/VariableCatalogStorageService.ts` | MODIFY | Import `VARIABLE_CATALOG_STORAGE_KEY` (`laboratorio_hmi_variable_catalog_v1`) from `legacyStorageCleanup.ts`; also replace hardcoded `'steigen_hmi_dashboards_v2'` (line 4–5) with import of `DASHBOARDS_STORAGE_KEY` from `legacyStorageCleanup.ts` |
| `hmi-app/src/services/HierarchyStorageService.ts` | MODIFY | Rename `STORAGE_KEY` from `steigen_hmi_hierarchy_v1` to `laboratorio_hmi_hierarchy_v1`; import `HIERARCHY_STORAGE_KEY` from `legacyStorageCleanup.ts` |
| `hmi-app/src/services/NodeTypeStorageService.ts` | MODIFY | Rename `STORAGE_KEY` from `steigen_hmi_node_types_v1` to `laboratorio_hmi_node_types_v1`; import `NODE_TYPES_STORAGE_KEY` from `legacyStorageCleanup.ts` |
| `hmi-app/src/pages/admin/HierarchyPage.tsx` | MODIFY | Rename `EXPANDED_STORAGE_KEY` from `steigen_hmi_hierarchy_expanded_v1` to `laboratorio_hmi_hierarchy_expanded_v1`; import `HIERARCHY_EXPANDED_STORAGE_KEY` from `legacyStorageCleanup.ts` |
| `hmi-app/index.html` | MODIFY | Change `<title>Steigen HMI Platform</title>` to `<title>Interfaz Laboratorio</title>` |
| `hmi-app/src/mocks/hierarchy.mock.ts` | MODIFY | Rename `name: 'Planta Steigen'` to `name: 'Planta Demo'` |
| `AGENTS.md` | MODIFY | Rewrite Section 1 (Identidad del Proyecto) opening paragraph; remove "Steigen" reference; underscore reusable multi-firm base (see §2b for exact wording); preserve the three existing bullet lines unchanged |
| `implementation_plan.md` | MODIFY | Replace "Planta Steigen" → "Planta Demo" at lines 157 and 236 |
| `hmi-app/src/main.tsx` | MODIFY | Call `cleanupLegacyStorage()` before `createRoot(...).render(...)` |
| `hmi-app/src/store/ui.store.ts` | MODIFY | Add `isGridVisible: boolean` and `toggleGrid: () => void`; wrap store with `persist` middleware; strict `partialize` to `{ isGridVisible }` only |
| `hmi-app/src/index.css` | MODIFY | Add `--color-canvas-grid-major` and `--color-canvas-grid-minor` inside the existing `@theme {}` block alongside admin tokens |
| `hmi-app/src/components/admin/DashboardSettingsPanel.tsx` | NEW | Inline popover/panel for aspect and rows editor; triggered from `contextBarPanel` via a settings button next to `← Volver` and the grid toggle |
| `hmi-app/src/test/fixtures/dashboard.fixture.ts` | NEW | `makeDashboard`, `makeWidget`, `makeLayout`, `makeTemplate` factory functions with typed overrides; zero `any`; used by all canvas/grid tests |

**Merge vs. new file for canvas math:** A separate `canvasReference.ts` file is not recommended.
All grid arithmetic belongs in `gridConfig.ts`. The file is currently 75 lines; after additions it
will be ~200 lines — well within the one-file threshold. Rename to `canvasReference.ts` only if
it exceeds ~300 lines after implementation.

**`useGridCols.ts` → `useCanvasReference.ts`:** Rename signals the semantic shift from "how many
cols fit" to "full canvas reference". The old export is removed; both current consumers
(`BuilderCanvas.tsx`, `DashboardViewer.tsx`) are updated in the same PR.

---

## 2b. Rebrand scope (steigen → laboratorio)

All customer-specific `steigen_*` strings are eliminated in this change. This section is the single authoritative reference for the full rebrand surface.

### Storage keys

| File | Old key | New key | Exported constant |
|------|---------|---------|-------------------|
| `hmi-app/src/services/DashboardStorageService.ts` | `steigen_hmi_dashboards_v2` | `laboratorio_hmi_dashboards_v1` | `DASHBOARDS_STORAGE_KEY` |
| `hmi-app/src/services/TemplateStorageService.ts` | `steigen_hmi_templates_v1` | `laboratorio_hmi_templates_v1` | `TEMPLATES_STORAGE_KEY` |
| `hmi-app/src/services/VariableCatalogStorageService.ts` | `steigen_hmi_variable_catalog_v1` | `laboratorio_hmi_variable_catalog_v1` | `VARIABLE_CATALOG_STORAGE_KEY` |
| `hmi-app/src/services/HierarchyStorageService.ts` | `steigen_hmi_hierarchy_v1` | `laboratorio_hmi_hierarchy_v1` | `HIERARCHY_STORAGE_KEY` |
| `hmi-app/src/services/NodeTypeStorageService.ts` | `steigen_hmi_node_types_v1` | `laboratorio_hmi_node_types_v1` | `NODE_TYPES_STORAGE_KEY` |
| `hmi-app/src/pages/admin/HierarchyPage.tsx` | `steigen_hmi_hierarchy_expanded_v1` | `laboratorio_hmi_hierarchy_expanded_v1` | `HIERARCHY_EXPANDED_STORAGE_KEY` |

All six new constants live in `utils/legacyStorageCleanup.ts`. Every service and page imports its constant from there — no hardcoded key strings in service files.

### Legacy keys purged at bootstrap

`cleanupLegacyStorage()` removes all seven old `steigen_*` keys on first boot (see §7 for the full constant block):

- `steigen_hmi_dashboards_v1`
- `steigen_hmi_dashboards_v2`
- `steigen_hmi_templates_v1`
- `steigen_hmi_variable_catalog_v1`
- `steigen_hmi_hierarchy_v1`
- `steigen_hmi_hierarchy_expanded_v1`
- `steigen_hmi_node_types_v1`

### UI / branding

| File | Change |
|------|--------|
| `hmi-app/index.html` | `<title>Steigen HMI Platform</title>` → `<title>Interfaz Laboratorio</title>` |
| `hmi-app/src/mocks/hierarchy.mock.ts` | `name: 'Planta Steigen'` → `name: 'Planta Demo'` |

### Docs

| File | Change |
|------|--------|
| `AGENTS.md` | Section 1 (Identidad del Proyecto): rewrite opening paragraph — remove "Steigen" lab name; emphasize reusable multi-firm base |
| `implementation_plan.md` | Replace "Planta Steigen" → "Planta Demo" at lines 157 and 236 |

**AGENTS.md Section 1 replacement wording (opening paragraph only; the three bullet lines are preserved unchanged):**

> **Interfaz-Laboratorio** es una interfaz HMI (Human-Machine Interface) industrial de visualización de datos en tiempo real. Está pensada como una base escalable y reutilizable para múltiples laboratorios de distintas firmas. No es una interfaz cerrada para un único caso o cliente.

### Exempt from rebrand

`openspec/changes/canvas-bounds/explore.md` is a historical SDD artifact that documents findings as they were at exploration time. Do NOT rewrite it.

---

## 3. Types

```ts
// hmi-app/src/domain/admin.types.ts

/** NEW: Aspect ratio options for a dashboard canvas. */
export type DashboardAspect = '16:9' | '21:9' | '4:3';

export interface Dashboard {
  id: string;                              // unchanged
  name: string;                            // unchanged
  description?: string;                    // unchanged
  dashboardType: DashboardType;            // unchanged
  layout: WidgetLayout[];                  // unchanged field; semantics change — x/y now canonical
  widgets: WidgetConfig[];                 // unchanged
  lastUpdateAt?: string;                   // unchanged
  ownerNodeId?: string;                    // unchanged
  templateId?: string;                     // unchanged
  isTemplate: boolean;                     // unchanged
  version: number;                         // unchanged
  status: DashboardStatus;                 // unchanged
  headerConfig?: DashboardHeaderConfig;    // unchanged
  aspect: DashboardAspect;                 // NEW — required; default '16:9' on creation
  rows: number;                            // NEW — required; default 12 on creation
  publishedSnapshot?: PublishedSnapshot;   // unchanged
  // REMOVED: gridVersion? — dead field, eliminated
}

export interface PublishedSnapshot {
  widgets: WidgetConfig[];                 // unchanged
  layout: WidgetLayout[];                  // unchanged
  headerConfig?: DashboardHeaderConfig;    // unchanged
  publishedAt: string;                     // unchanged
  aspect: DashboardAspect;                 // NEW — copied from Dashboard at publish time
  rows: number;                            // NEW — copied from Dashboard at publish time
  // REMOVED: gridVersion? — dead field, eliminated
}

/**
 * WidgetLayout: now carries CANONICAL, REQUIRED x/y/w/h.
 * `widgetId` is unchanged — it references WidgetConfig.id.
 * x/y/w/h were always present in the domain type but were ignored by renderers.
 * After this change renderers MUST read them for placement; array order is irrelevant.
 */
export interface WidgetLayout {
  widgetId: string;  // unchanged — references WidgetConfig.id
  x: number;         // canonical grid column (0-indexed); required
  y: number;         // canonical grid row (0-indexed); required
  w: number;         // column span; required, minimum 1
  h: number;         // row span; required, minimum 1
}

export interface Template {
  id: string;                              // unchanged
  name: string;                            // unchanged
  type: TemplateType;                      // unchanged
  dashboardType?: DashboardType;           // unchanged
  sourceDashboardId?: string;              // unchanged
  widgetPresets?: Partial<WidgetConfig>[]; // unchanged
  layoutPreset?: WidgetLayout[];           // unchanged field; now carries meaningful x/y
  status: TemplateStatus;                  // unchanged
  aspect: DashboardAspect;                 // NEW — required; canvas context this template targets
  rows: number;                            // NEW — required; row count the template was designed for
}
```

**Note on `WidgetConfigBase.position` / `.size`:** `WidgetConfigBase` currently has
`position: { x, y }` and `size: { w, h }` which duplicate `WidgetLayout`. After this change
`WidgetLayout.x/y/w/h` are the canonical source; `position`/`size` on `WidgetConfigBase` become
dead fields. They are **not removed in this iteration** (scope control). Add
`// @deprecated: use WidgetLayout — will be removed in a follow-up change` to each field during
this PR. Renderers read from `WidgetLayout`, not from `WidgetConfigBase.position/size`.

---

## 4. Key pure functions and their signatures

All functions live in `hmi-app/src/utils/gridConfig.ts`. All are pure — no side effects, no React.

```ts
/**
 * Fits a usable area to an aspect ratio with letterboxing.
 * Returns the largest { width, height } that fits within (usableW × usableH)
 * while preserving the given aspect.
 *
 * Invariants:
 *   - width  ≤ usableW, height ≤ usableH
 *   - width / height equals the exact numeric ratio of `aspect`
 *   - if usableW ≤ 0 or usableH ≤ 0, returns { width: 0, height: 0 }
 */
export function fitToAspect(
  usableW: number,
  usableH: number,
  aspect: DashboardAspect,
): { width: number; height: number }
```

```ts
/**
 * Computes the full bounded canvas reference for builder and viewer.
 * Subtracts chrome (topbar, header, paddings) from the viewport,
 * then delegates to fitToAspect for the final dimensions.
 *
 * Invariants:
 *   - offsetX = (usableW - width) / 2  (letterbox horizontal margin, ≥ 0)
 *   - offsetY = (usableH - height) / 2  (letterbox vertical margin, ≥ 0)
 *   - width + 2 * offsetX ≤ viewport.width  - paddings.left - paddings.right
 *   - height + 2 * offsetY ≤ viewport.height - topbarHeight - headerHeight - paddings.top - paddings.bottom
 *   - width / height matches the exact ratio of `aspect`
 */
export function computeCanvasReference(input: {
  viewport: { width: number; height: number };
  topbarHeight: number;
  headerHeight: number;
  paddings: { top: number; right: number; bottom: number; left: number };
  aspect: DashboardAspect;
}): { width: number; height: number; offsetX: number; offsetY: number }
```

```ts
/**
 * Returns the number of grid columns for a given canvas width.
 * Formula: floor(width / MIN_COL_WIDTH), clamped to [MIN_COLS, MAX_COLS].
 *
 * Gap is not a parameter in the bounded model: gap = 0 by design,
 * so the formula simplifies to floor(width / MIN_COL_WIDTH).
 *
 * Invariants:
 *   - result ∈ [MIN_COLS, MAX_COLS] = [1, 20]
 *   - if width ≤ 0, returns MIN_COLS (= 1)
 */
export function computeGridCols(width: number): number
```

```ts
/**
 * Returns the pixel height of a single grid row.
 *
 * Invariants:
 *   - result = canvasHeight / rows
 *   - if rows ≤ 0, returns canvasHeight (defensive: treats as 1 row)
 *   - result is a float; callers floor/round for pixel rendering as needed
 */
export function getRowHeight(canvasHeight: number, rows: number): number
```

```ts
/**
 * Clamps a widget's grid bounds so it fits entirely within the canvas.
 *
 * Invariants:
 *   - w is clamped to [1, cols]; h is clamped to [1, rows] — BEFORE clamping x/y
 *   - x ∈ [0, cols - w]; y ∈ [0, rows - h] — using the already-clamped w/h
 *   - valid input is returned unchanged (identity for in-bounds widgets)
 *   - never returns negative x or y
 *   - a zero-size widget (w=0 or h=0) is promoted to w=1 / h=1
 */
export function clampWidgetBounds(
  layout: { x: number; y: number; w: number; h: number },
  cols: number,
  rows: number,
): { x: number; y: number; w: number; h: number }
```

```ts
/**
 * Returns true iff the template's aspect matches the dashboard's aspect.
 * A mismatch means applying the template MUST be blocked.
 *
 * Invariants:
 *   - Pure string equality; no coercion or normalization.
 *   - Does NOT check rows compatibility — rows mismatch is recoverable via clamp.
 *   - Caller is responsible for blocking and showing the error message on false.
 */
export function isTemplateApplicable(
  template: Template,
  dashboard: Dashboard,
): boolean
```

---

## 5. Rendering strategy

### Coordinate mapping (0-indexed logical → 1-indexed CSS Grid)

CSS Grid is 1-indexed; widget coordinates are 0-indexed. The mapping:

```
grid-column-start: x + 1
grid-column-end:   span w      (equivalently: x + w + 1)
grid-row-start:    y + 1
grid-row-end:      span h
```

A widget at `x=0, y=0, w=4, h=3` maps to:
`grid-column: 1 / span 4; grid-row: 1 / span 3`.

A widget at `x=5, y=2, w=3, h=2` maps to:
`grid-column: 6 / span 3; grid-row: 3 / span 2`.

### Canvas container

The canvas element uses explicit CSS Grid with dimensions and cell metrics passed as inline CSS
variables:

```css
/* Applied inline to the canvas element via style prop */
display: grid;
grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
grid-template-rows:    repeat(var(--rows), var(--row-height-px));
width:  var(--canvas-width-px);
height: var(--canvas-height-px);
gap: 0;
position: relative;
```

Gap is **zero** in the bounded model. Visual separation between widgets is provided by widget-level
padding/margin. This guarantees `cellWidth = canvasWidth / cols` exactly, making overlay math
trivial and eliminating the builder/viewer gap discrepancy that exists today (`BUILDER_GAP=24` vs
`VIEWER_GAP=16`).

### Letterboxing

The canvas's parent wrapper is a flex container that centers the fixed-size canvas child:

```css
/* Parent wrapper — fills the chrome-subtracted area */
display: flex;
align-items: center;
justify-content: center;
width: 100%;
height: 100%;
```

The canvas child has explicit `width` and `height` from `computeCanvasReference`. Letterbox margins
(`offsetX`, `offsetY`) appear as neutral space automatically via flex centering — no extra padding
or margin needed.

### Grid overlay (builder only)

When `isGridVisible` is true, a sibling `div` with
`pointer-events: none; position: absolute; inset: 0` renders the overlay using `background-image`.
The four-layer approach:

```css
background-image:
  /* Major lines — every 2 cells, horizontal */
  repeating-linear-gradient(
    to right,
    var(--color-canvas-grid-major) 0px,
    var(--color-canvas-grid-major) 1px,
    transparent 1px,
    transparent calc(var(--cell-width-px) * 2)
  ),
  /* Major lines — every 2 cells, vertical */
  repeating-linear-gradient(
    to bottom,
    var(--color-canvas-grid-major) 0px,
    var(--color-canvas-grid-major) 1px,
    transparent 1px,
    transparent calc(var(--row-height-px) * 2)
  ),
  /* Minor lines — every 1 cell, horizontal */
  repeating-linear-gradient(
    to right,
    var(--color-canvas-grid-minor) 0px,
    var(--color-canvas-grid-minor) 1px,
    transparent 1px,
    transparent var(--cell-width-px)
  ),
  /* Minor lines — every 1 cell, vertical */
  repeating-linear-gradient(
    to bottom,
    var(--color-canvas-grid-minor) 0px,
    var(--color-canvas-grid-minor) 1px,
    transparent 1px,
    transparent var(--row-height-px)
  );
```

`--cell-width-px` is computed as `canvasWidth / cols` (integer pixels, floored).
`--row-height-px` is `getRowHeight(canvasHeight, rows)`. Both are set as inline CSS variables on
the canvas element by `BuilderCanvas`.

Because `gap = 0`, the pitch of the overlay lines equals the cell/row dimensions exactly — no
offset correction needed. If gap is introduced later, see Section 12 (Risk 3).

The overlay `div` sits above the grid container but below widget content via `z-index: 0` on
widgets vs. `z-index: 1` on the overlay (inverted from default), or simpler: overlay is a
`::before` pseudo-element on the canvas wrapper.

**Remove existing decorative backgrounds:** The `bg-[url('/grid.svg')]` backgrounds on
`DashboardBuilderPage` and `Dashboard.tsx` are unrelated to the cell grid and must be removed in
this change.

---

## 6. Drag and resize mechanics

### Current state (baseline — confirmed from exploration)

- **Resize**: custom pointer events on `ResizeHandle` (`BuilderCanvas.tsx:66–133`). Clamps
  immediately on every `pointermove` — no deferred commit exists today.
- **Move**: HTML5 drag-and-drop by array index (`BuilderCanvas.tsx:179–230`). Not spatial;
  reorders the `layout[]` array.
- No external DnD library (`@dnd-kit` etc.) — all interaction is custom.

### New behavior

Both resize and move use pointer events exclusively. HTML5 DnD for array reordering is removed
(array order is irrelevant once `x/y` are canonical; the entire concept of "reorder" disappears).

#### Ephemeral interaction state

Each active interaction is tracked in a local React state (or ref) in `BuilderCanvas`:

```ts
interface InteractionState {
  widgetId: string;
  type: 'move' | 'resize';
  startPointer: { x: number; y: number };              // pointer px at pointerdown
  startLayout: { x: number; y: number; w: number; h: number }; // grid units at start
  tentative: { x: number; y: number; w: number; h: number };   // live units (may overflow)
}
```

`tentative` is updated on every `pointermove` by converting the pointer delta to grid units. The
affected widget renders at `tentative` coordinates via inline style updates — no write to the
dashboard store occurs during interaction.

#### Pointer delta → grid unit conversion

```
cellWidth  = canvasWidth  / cols          (from useCanvasReference)
rowHeight  = canvasHeight / rows

deltaGridX = round(deltaPointerX / cellWidth)
deltaGridY = round(deltaPointerY / rowHeight)
```

For **move**: `tentative = { x: start.x + deltaGridX, y: start.y + deltaGridY, w: start.w, h: start.h }`

For **resize**: `tentative = { x: start.x, y: start.y, w: start.w + deltaGridX, h: start.h + deltaGridY }`

Overflow is **allowed** during interaction — no clamp on `pointermove`.

#### Commit on release

On `pointerup`:

1. `committed = clampWidgetBounds(tentative, cols, rows)`
2. Dispatch `committed` to the dashboard state (replaces the `WidgetLayout` entry for this
   `widgetId`).
3. Clear `interactionState`.

#### Move affordance

The **entire widget body** is the drag handle (recommended — simpler UX, no extra grip chrome). A
**3 px** move threshold distinguishes click (select widget) from drag (move widget): a `pointerdown`
followed by a pointer movement ≤ 3 px total is treated as a click; > 3 px promotes to drag.

The `ResizeHandle` component calls `event.stopPropagation()` on `pointerdown` to prevent
accidentally triggering a move when the user intends a resize.

#### A11y

Keyboard navigation for widget placement is out of scope for this iteration.

---

## 7. Storage reset strategy

### New key constants — `hmi-app/src/utils/legacyStorageCleanup.ts`

```ts
/**
 * Authoritative storage key constants — single source of truth for all services.
 * Import from here; never hardcode these strings in service files.
 */
export const DASHBOARDS_STORAGE_KEY        = 'laboratorio_hmi_dashboards_v1';
export const TEMPLATES_STORAGE_KEY         = 'laboratorio_hmi_templates_v1';
export const VARIABLE_CATALOG_STORAGE_KEY  = 'laboratorio_hmi_variable_catalog_v1';
export const HIERARCHY_STORAGE_KEY         = 'laboratorio_hmi_hierarchy_v1';
export const HIERARCHY_EXPANDED_STORAGE_KEY = 'laboratorio_hmi_hierarchy_expanded_v1';
export const NODE_TYPES_STORAGE_KEY        = 'laboratorio_hmi_node_types_v1';

/**
 * All legacy keys that must be purged on first boot of the new version.
 * Idempotent: removing a non-existent key is a no-op in localStorage.
 */
export const LEGACY_KEYS_TO_PURGE: readonly string[] = [
  'steigen_hmi_dashboards_v1',
  'steigen_hmi_dashboards_v2',
  'steigen_hmi_templates_v1',
  'steigen_hmi_variable_catalog_v1',
  'steigen_hmi_hierarchy_v1',
  'steigen_hmi_hierarchy_expanded_v1',
  'steigen_hmi_node_types_v1',
];

/**
 * One-shot cleanup: removes all legacy localStorage entries.
 *
 * - Idempotent: safe to call multiple times.
 * - SSR-safe: guards on typeof window.
 * - Synchronous: no Promise, no async.
 */
export function cleanupLegacyStorage(): void {
  if (typeof window === 'undefined') return;
  for (const key of LEGACY_KEYS_TO_PURGE) {
    localStorage.removeItem(key);
  }
}
```

### Invocation in `hmi-app/src/main.tsx`

```ts
import { cleanupLegacyStorage } from './utils/legacyStorageCleanup';

// Purge legacy keys BEFORE React mounts — guarantees services start clean.
cleanupLegacyStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

Placement before `createRoot` guarantees cleanup runs before any service's lazy `readStorage()` is
called. Order of events: `cleanupLegacyStorage()` → React mounts → components render → React Query
fires → services read new-version keys (empty → seed from mocks with `aspect`/`rows`).

### Service-level changes

**`DashboardStorageService.ts`:**
- Import `DASHBOARDS_STORAGE_KEY` (`laboratorio_hmi_dashboards_v1`) from `legacyStorageCleanup.ts`
  to replace the old hardcoded `'steigen_hmi_dashboards_v2'`.
- Remove the `initStorage` migration block (widget-type renames, snapshot backfill) — clean start
  from mocks makes migrations unnecessary.
- `createEmptyDashboard`: add `aspect: '16:9', rows: 12` to the new dashboard literal.
- `createFromTemplate`: propagate `template.aspect` and `template.rows` to the created dashboard.
- `publishDashboard`: copy `aspect` and `rows` from `dashboard` into `publishedSnapshot`.
- `discardChanges`: restore `aspect` and `rows` from `publishedSnapshot` alongside
  `widgets`/`layout`/`headerConfig`.

**`TemplateStorageService.ts`:** Import `TEMPLATES_STORAGE_KEY` (`laboratorio_hmi_templates_v1`)
from `legacyStorageCleanup.ts`. Update seed templates to include `aspect` and `rows`.

**`VariableCatalogStorageService.ts`:** Import `VARIABLE_CATALOG_STORAGE_KEY`
(`laboratorio_hmi_variable_catalog_v1`) from `legacyStorageCleanup.ts`. Also replace the hardcoded
string `'steigen_hmi_dashboards_v2'` at line 4–5 with an import of `DASHBOARDS_STORAGE_KEY` from
`legacyStorageCleanup.ts`.

**`HierarchyStorageService.ts`:** Import `HIERARCHY_STORAGE_KEY` (`laboratorio_hmi_hierarchy_v1`)
from `legacyStorageCleanup.ts` to replace the old hardcoded `'steigen_hmi_hierarchy_v1'`.

**`NodeTypeStorageService.ts`:** Import `NODE_TYPES_STORAGE_KEY` (`laboratorio_hmi_node_types_v1`)
from `legacyStorageCleanup.ts` to replace the old hardcoded `'steigen_hmi_node_types_v1'`.

**`HierarchyPage.tsx`:** Import `HIERARCHY_EXPANDED_STORAGE_KEY`
(`laboratorio_hmi_hierarchy_expanded_v1`) from `legacyStorageCleanup.ts` to replace the old
hardcoded `'steigen_hmi_hierarchy_expanded_v1'`.

---

## 8. State and persistence

```ts
// hmi-app/src/store/ui.store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UIStore {
  // --- Sidebar ---
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  // --- Selección jerárquica activa ---
  selectedPlantId: string | null;
  selectedAreaId: string | null;
  selectedEquipmentId: string | null;
  setSelectedPlant: (id: string | null) => void;
  setSelectedArea: (id: string | null) => void;
  setSelectedEquipment: (id: string | null) => void;

  // --- Filtros globales de sesión ---
  globalStatusFilter: string | null;
  setGlobalStatusFilter: (status: string | null) => void;

  // --- Modo Admin ---
  isAdminMode: boolean;
  setAdminMode: (v: boolean) => void;

  // --- Canvas grid (NEW) ---
  isGridVisible: boolean;
  toggleGrid: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      // Selección jerárquica
      selectedPlantId: null,
      selectedAreaId: null,
      selectedEquipmentId: null,
      setSelectedPlant: (id) => set({ selectedPlantId: id }),
      setSelectedArea: (id) => set({ selectedAreaId: id }),
      setSelectedEquipment: (id) => set({ selectedEquipmentId: id }),

      // Filtros
      globalStatusFilter: null,
      setGlobalStatusFilter: (status) => set({ globalStatusFilter: status }),

      // Modo Admin
      isAdminMode: false,
      setAdminMode: (v) => set({ isAdminMode: v }),

      // Canvas grid
      isGridVisible: true,
      toggleGrid: () => set((s) => ({ isGridVisible: !s.isGridVisible })),
    }),
    {
      name: 'interfaz-laboratorio-ui',
      storage: createJSONStorage(() => localStorage),
      // Strict partialize: ONLY isGridVisible persists.
      // All other UI state is transient and must not survive reload.
      partialize: (state) => ({ isGridVisible: state.isGridVisible }),
    },
  ),
);
```

**Design notes:**

- `partialize` is strict: only `isGridVisible` persists. Transient session state (selections,
  sidebar, filters) remains in-memory only. This is intentional.
- Default `isGridVisible: true` — grid visible on first load is the discoverability-friendly choice.
- `name: 'interfaz-laboratorio-ui'` is the localStorage key for this store's persisted slice.
- **Hydration timing:** Zustand `persist` hydrates asynchronously. On first render `isGridVisible`
  may show the default before the stored value is read. For the grid overlay this is acceptable
  (minor flicker from visible to hidden). If unacceptable, gate the overlay render on
  `useUIStore.persist.hasHydrated()`.

---

## 9. Aspect / rows editor (admin UI)

### Location

A new `DashboardSettingsPanel` component
(`hmi-app/src/components/admin/DashboardSettingsPanel.tsx`) surfaces as an inline popover or
slide-in right panel triggered by a settings button in `contextBarPanel`, placed beside `← Volver`
and the grid toggle icon.

**Rationale for panel over modal:** A modal interrupts layout review. An inline panel keeps the
canvas visible while the user adjusts settings, so the aspect/rows change is immediately reflected
in the canvas preview without dismissing the editor.

### Form fields

| Field | Control | Constraints |
|-------|---------|-------------|
| `aspect` | Segmented control / radio group — `16:9`, `21:9`, `4:3` | Required; no empty state |
| `rows` | Numeric input with `+`/`−` steppers | Integer; `min = 4`, `max = 24` |

### Change confirmation flow

Before committing new `aspect` or `rows` values:

1. Compute new `cols` from `computeGridCols(newCanvasWidth)` where `newCanvasWidth` comes from
   `fitToAspect(usableW, usableH, newAspect).width`.
2. For each widget in `dashboard.layout`, compute `clamped = clampWidgetBounds(widget, newCols, newRows)`.
3. Count widgets where `clamped ≠ original` → `N`.
4. If `N > 0`: show a confirm dialog:
   `"${N} widget${N > 1 ? 's' : ''} se ajustarán al nuevo área. ¿Continuar?"` — Cancel / Confirmar.
   - On Confirmar: apply new `aspect`/`rows` and the clamped layouts.
   - On Cancel: revert to previous values.
5. If `N === 0`: apply immediately, no dialog.

### `contextBarPanel` integration

`DashboardBuilderPage.tsx` currently passes a single `backButton` node to `AdminWorkspaceLayout`.
After this change the slot becomes a horizontal group:

```tsx
<div className="flex items-center gap-2">
  {/* ← Volver */}
  <Button variant="ghost" size="sm" onClick={handleBack}>
    ← Volver
  </Button>

  {/* Grid visibility toggle */}
  <Button
    variant="ghost"
    size="icon"
    onClick={toggleGrid}
    title={isGridVisible ? 'Ocultar grilla' : 'Mostrar grilla'}
  >
    <LayoutGrid
      size={16}
      className={isGridVisible ? 'text-admin-accent' : 'text-muted-foreground'}
    />
  </Button>

  {/* Dashboard settings */}
  <Button variant="ghost" size="icon" onClick={openSettings} title="Configuración del dashboard">
    <SlidersHorizontal size={16} />
  </Button>
</div>
```

Lucide icons: `LayoutGrid` for grid toggle, `SlidersHorizontal` for dashboard settings. Final icon
choice is at implementer's discretion within the Lucide set — do not introduce non-Lucide icons.

---

## 10. Testing strategy

Strict TDD mode is active. Tests are written BEFORE implementation for all **TDD required** items.
File location: co-located `*.test.ts(x)` next to the source. No `*.spec.*`. No snapshots. No `any`.

### Pure function unit tests (TDD required — `gridConfig.test.ts`)

Coverage target: 100%.

| Function | Test cases |
|----------|-----------|
| `fitToAspect` | Wide viewport 16:9 (wider than 16:9 ratio) → width-constrained result; tall viewport 16:9 (taller than 16:9) → width-constrained; square viewport with 4:3; 21:9 ultra-wide; `usableW=0` → `{0,0}`; `usableH=0` → `{0,0}`; result never exceeds usable bounds |
| `computeCanvasReference` | Standard desktop (1440×900, topbar 56px, header 48px, paddings 32px each) with 16:9 → verify offsetX/offsetY ≥ 0; compact 1024×768 with 4:3; verify `width + 2*offsetX ≤ usableW` invariant; symmetry of letterbox margins |
| `computeGridCols` | `width=0` → 1 (MIN_COLS); `width=59` → 0 floored → clamped to 1; `width=60` → 1; `width=1200` → 20 (clamped to MAX_COLS); `width=1440` → 20 (clamped); `width=720` → 12 |
| `getRowHeight` | `(600, 12)` → 50; `(600, 1)` → 600; `rows=0` → returns `canvasHeight` (defensive); result is float, not rounded |
| `clampWidgetBounds` | Widget at `x=18, y=10, w=4, h=4` (overflows all edges) → fully clamped; widget at `x=0, y=0, w=4, h=3` (valid, 20×12) → unchanged; `w > cols` → w clamped first, then x; `h > rows` → h clamped first, then y; `w=0` → promoted to 1; `x < 0` → clamped to 0 |
| `isTemplateApplicable` | Same aspect → true for all three aspects; every mismatch pair → false (6 false cases: 3×2 directed pairs) |

### Cleanup utility tests (TDD required — `legacyStorageCleanup.test.ts`)

Coverage target: 100%.

| Function | Test cases |
|----------|-----------|
| `cleanupLegacyStorage` | Mock `localStorage`; verify `removeItem` called once per key in `LEGACY_KEYS_TO_PURGE`; verify idempotent (call twice, no error, no extra calls after second); SSR guard — simulate `typeof window === 'undefined'` and verify no error thrown |

### Component / integration tests (vitest + RTL)

| Scenario | What to assert |
|----------|---------------|
| Grid toggle persistence | Render builder with mocked `localStorage`; toggle grid off; unmount; remount; assert `isGridVisible === false` is restored from store |
| Resize overflow then clamp | `pointerdown` on resize handle; `pointermove` past canvas edge by 5+ cells; `pointerup`; assert committed `WidgetLayout` satisfies `clampWidgetBounds` invariants; assert no intermediate state written to dashboard |
| Drag-to-move overflow then clamp | Same pattern via widget body (move interaction); assert committed position is clamped and `w`/`h` unchanged |
| Viewer honors `x/y` not array order | Fixture: two widgets — widget A at `(10, 8)`, widget B at `(0, 0)`; array order `[A, B]`; render `DashboardViewer`; assert widget B's DOM element has `grid-column-start: 1` and widget A has `grid-column-start: 11` |
| Template aspect mismatch is blocked | Mock template `aspect='21:9'`; dashboard `aspect='16:9'`; trigger apply; assert zero widgets added to dashboard; assert error message visible containing both aspect values |
| Template match copies coords intact | Mock template and dashboard with matching `aspect='16:9'`; apply template; assert each resulting `WidgetLayout` entry has `x/y/w/h` identical to the template's `layoutPreset` |
| Aspect change triggers confirm dialog when widgets would be clamped | Dashboard with widget at `(19, 0, 1, 1)`; change to `4:3` (fewer effective cols); assert confirm dialog appears mentioning 1 widget; cancel → layout unchanged; confirm → widget clamped |
| Aspect change with no clamping needs no dialog | All widgets within new bounds; assert dialog NOT shown; new aspect applied immediately |

**Post-rebrand assertion:** Run a grep-like check in CI or as a test that ensures no `steigen` string remains in `hmi-app/src/**`, `hmi-app/index.html`, `AGENTS.md`, or `implementation_plan.md`. Historical files in `openspec/changes/canvas-bounds/explore.md` are EXEMPT (historical artifact).

**Fixture file — `hmi-app/src/test/fixtures/dashboard.fixture.ts`:**

```ts
import type {
  Dashboard,
  DashboardAspect,
  Template,
  WidgetLayout,
  WidgetConfig,
} from '../../domain/admin.types';

export function makeDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    id: 'dash-test',
    name: 'Test Dashboard',
    dashboardType: 'global',
    isTemplate: false,
    version: 1,
    status: 'draft',
    aspect: '16:9',
    rows: 12,
    layout: [],
    widgets: [],
    ...overrides,
  };
}

export function makeLayout(overrides: Partial<WidgetLayout> = {}): WidgetLayout {
  return {
    widgetId: 'w-test',
    x: 0,
    y: 0,
    w: 4,
    h: 3,
    ...overrides,
  };
}

export function makeWidget(overrides: Partial<WidgetConfig> = {}): WidgetConfig {
  return {
    id: 'w-test',
    type: 'kpi',
    title: 'Test Widget',
    position: { x: 0, y: 0 },
    size: { w: 4, h: 3 },
    ...overrides,
  } as WidgetConfig;
}

export function makeTemplate(overrides: Partial<Template> = {}): Template {
  return {
    id: 'tpl-test',
    name: 'Test Template',
    type: 'dashboard',
    status: 'active',
    aspect: '16:9',
    rows: 12,
    widgetPresets: [],
    layoutPreset: [],
    ...overrides,
  };
}
```

---

## 11. Open implementation questions

The following questions are left open for the implementer. Each includes a recommended default to
unblock work; verify with visual testing before committing.

1. **Drag-to-move handle**: whole widget body with 3 px threshold (recommended — simpler UX, no
   extra grip chrome) vs. dedicated drag grip (more explicit but adds visible UI element). Use
   whole-body unless interaction testing reveals confusion with click-to-select.

2. **`MIN_COL_WIDTH` final value**: `60 px` is this design's recommendation. At 1440 px canvas
   width this yields 24 raw cols, clamped to 20. At 1024 px it yields 17 cols. Verify visually at
   1024 / 1440 / 1920 px before committing. Alternatives: `70 px` (≈20 at 1440, more conservative);
   `80 px` (≈18 at 1440 — unlikely to reach MAX_COLS on typical desktops; avoid).

3. **Default new widget span**: `w: 4, h: 3` recommended (20 % width × 25 % height at 20×12,
   roughly equivalent to today's `w:2, h:2` visual footprint at 8×6). Alternative: `w: 5, h: 4`
   (25 % × 33 %). Confirm with a side-by-side visual check.

4. **`gridConfig.ts` rename threshold**: currently 75 lines. After additions (~6 new functions +
   constants) it will be ~200 lines — no rename needed. Rename to `canvasReference.ts` only if the
   file exceeds ~300 lines after implementation.

5. **Storage key names — RESOLVED**: All six constants are now canonical in §7 and §2b. Implementer
   should verify these match the actual strings in each service file before committing, but no
   guesswork is required — the values are pinned by the rebrand decision.

6. **`WidgetConfigBase.position` / `.size` deprecation**: leave in place for this PR; add
   `// @deprecated` comments. Target for removal in a dedicated follow-up change to avoid scope
   creep.

7. **Canvas gap**: this design proposes `gap: 0`. If visual testing reveals widgets need breathing
   room, a small uniform gap (e.g. `4 px`) can be added provided it is **identical** in both
   builder and viewer. If gap > 0, the grid overlay pitch formula must be adjusted (see Section 12,
   Risk 3) and `computeCellWidth` must account for it.

8. **`useCanvasReference` chrome measurement**: AdminLayout topbar is `h-14` (56 px, confirmed from
   exploration). AdminContextBar is `h-12` (48 px). Builder content padding is `px-8 pb-4 pt-6`
   header + `p-8` canvas. These are the concrete measurements to wire into
   `computeCanvasReference`'s `topbarHeight` / `headerHeight` / `paddings` parameters. Implementer
   should verify these match the current layout by measuring with `getBoundingClientRect()` in
   development rather than hardcoding Tailwind-derived values.

---

## 12. Risks and mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| **`ResizeObserver` over-fire** in `useCanvasReference` causes excessive canvas re-renders | Medium | Wrap the ResizeObserver callback with `requestAnimationFrame` throttle or a 50 ms debounce. The canvas reference changes only on window resize; a small delay is unnoticeable. |
| **Zustand `persist` hydration race** — first render shows default `isGridVisible=true` before localStorage value is read | Low | Accept the minor flicker for the grid overlay (visible → hidden on first load if user toggled off). If unacceptable, gate only the overlay layer on `useUIStore.persist.hasHydrated()`. Never gate the entire builder. |
| **CSS Grid gap vs. `background-image` overlay misalignment** | Medium if gap > 0 | With `gap = 0` (this design's recommendation) the pitch is `canvasWidth / cols` exactly — no correction needed. If gap is added later, the overlay tile width must be `(canvasWidth - (cols-1) * gap) / cols + gap`. Prototype this formula in a standalone test before wiring to `--cell-width-px`. |
| **Drag-to-move click vs. drag disambiguation** | Medium | Enforce the 3 px movement threshold strictly. Without it, fast taps register as accidental moves. |
| **`MIN_COL_WIDTH` wrong for viewport range** | Medium | Test matrix: 1024 / 1440 / 1920 px canvas widths. At `MIN_COL_WIDTH=60`: 1024→17 cols, 1440→24→clamped 20, 1920→32→clamped 20. All reasonable. If 17 cols at 1024 px feels too dense, raise to 70 (1024→14, 1440→20, 1920→27→20). |
| **`publishDashboard` does not copy `aspect`/`rows` to snapshot** (same bug as the current `gridVersion` omission, confirmed by exploration) | High probability of regression if not checked | Add explicit assertions in integration tests AND in the `sdd-verify` checklist: `snapshot.aspect === dashboard.aspect` and `snapshot.rows === dashboard.rows`. |
| **Mock seed data (`admin.mock.ts`) not updated** with `aspect`/`rows` | Certain | Every mock dashboard and template must include `aspect: '16:9', rows: 12`. TypeScript will enforce this once the fields are required; treat TS errors in mocks as a required pre-merge fix. |
| **Template `rows` mismatch** (same aspect, different rows) not blocked | Low — recoverable | `isTemplateApplicable` checks aspect only; rows mismatch is handled gracefully by `clampWidgetBounds` after applying the template. No separate block needed. |
| **Existing `bg-[url('/grid.svg')]` decorative backgrounds not removed** | Low | Easy miss during implementation. Add it explicitly to the `sdd-verify` checklist: assert no `bg-[url(` referencing `grid.svg` remains in `DashboardBuilderPage.tsx` or `Dashboard.tsx`. |
| **Missed `steigen` reference during rebrand** | Medium | Mitigated by the greppable post-rebrand assertion in §10 (testing strategy); also documented as a pre-merge check in the `sdd-verify` checklist. |
