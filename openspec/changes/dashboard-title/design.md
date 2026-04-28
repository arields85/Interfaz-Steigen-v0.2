# Design: dashboard-title widget

## 1. Component Architecture

### DashboardTitleWidget renderer

**File:** `hmi-app/src/widgets/renderers/DashboardTitleWidget.tsx` (new)

```tsx
interface DashboardTitleWidgetProps {
    widget: DashboardTitleWidgetConfig;
    className?: string;
}
```

**Structure:**
- Single `<div>` wrapper with `w-full h-full flex items-center` — no `glass-panel`, no `WidgetHeader`, no border, no background, no `border-radius`.
- One `<span>` (or direct text node) rendering `widget.title ?? ''`.
- Typography via **inline `style` object** reading CSS custom properties for family, weight, and tracking, with `fontSize` from `displayOptions.fontSize`.

**Styling approach — inline style object:**
```tsx
const options = widget.displayOptions as DashboardTitleDisplayOptions | undefined;
const fontSize = options?.fontSize ?? DEFAULT_DASHBOARD_TITLE_FONT_SIZE;

const style: React.CSSProperties = {
    fontFamily: 'var(--font-dashboard-title)',
    fontWeight: 'var(--font-weight-dashboard-title)' as unknown as number,
    letterSpacing: 'var(--tracking-dashboard-title)',
    fontSize: `${fontSize}px`,
    lineHeight: 1.1,
    color: 'inherit',
};
```

**Why inline styles instead of a CSS class:**
- `fontSize` is per-widget-instance (from `displayOptions`), not a global token — a static class can't express it.
- Family, weight, and tracking ARE global tokens (CSS vars), but mixing them in the same `style` object keeps all typography co-located and readable.
- No new CSS class needed; avoids polluting `index.css` with a one-off rule.

**Why no `glass-panel`:**
- `glass-panel` adds background gradient, backdrop-filter blur, 1px border, 1.5rem border-radius, overflow hidden, and hover border animation (see `index.css:398-417`).
- All of these conflict with the requirement: the widget must be invisible except for the text itself, floating freely over the dashboard grid.

**Default font size constant:**
```tsx
export const DEFAULT_DASHBOARD_TITLE_FONT_SIZE = 48;
```
Exported from the renderer file so PropertyDock can import it for its placeholder/default.

---

## 2. Type Changes

**File:** `hmi-app/src/domain/admin.types.ts`

### 2a. WidgetType union (line 169)

Add `'dashboard-title'` to the union:

```ts
export type WidgetType =
    | 'kpi'
    | 'metric-card'
    // ...existing...
    | 'section-title'
    | 'dashboard-title'    // ← NEW
    | 'machine-activity';
```

### 2b. DashboardTitleDisplayOptions (new interface, after BaseDisplayOptions at line 424)

```ts
/**
 * Opciones de visualización para widgets de tipo 'dashboard-title'.
 *
 * - `fontSize`: tamaño de fuente en píxeles, propio de esta instancia.
 *   La familia, peso y tracking se heredan de las CSS vars globales
 *   `--font-dashboard-title`, `--font-weight-dashboard-title`,
 *   `--tracking-dashboard-title` (configuradas en DesignSettingsTab).
 *   Default: 48.
 */
export interface DashboardTitleDisplayOptions {
    fontSize?: number;
}
```

### 2c. DashboardTitleWidgetConfig (new interface, after MachineActivityWidgetConfig at line 518)

```ts
export interface DashboardTitleWidgetConfig extends WidgetConfigBase {
    type: 'dashboard-title';
    displayOptions?: DashboardTitleDisplayOptions;
}
```

### 2d. WidgetConfig union (line 530)

Add the new config variant:

```ts
export type WidgetConfig =
    | KpiWidgetConfig
    // ...existing...
    | MachineActivityWidgetConfig
    | DashboardTitleWidgetConfig    // ← NEW
    | GenericWidgetConfig;
```

### 2e. GenericWidgetConfig Exclude (line 522)

Add `'dashboard-title'` to the Exclude list so it doesn't fall into the generic bucket:

```ts
export interface GenericWidgetConfig extends WidgetConfigBase {
    type: Exclude<WidgetType, 'kpi' | 'metric-card' | 'trend-chart' | 'prod-history' | 'alert-history' | 'connection-status' | 'status' | 'machine-activity' | 'dashboard-title'>;
    displayOptions?: BaseDisplayOptions;
}
```

---

## 3. Integration Points

### 3a. WidgetRenderer.tsx (line 66 switch)

**Import** (after line 12):
```tsx
import DashboardTitleWidget from './renderers/DashboardTitleWidget';
```

**Case** (before the `default` at line 158):
```tsx
case 'dashboard-title':
    return (
        <DashboardTitleWidget
            widget={widget}
            className={className}
        />
    );
```

The renderer only needs `widget` and `className`. No `equipmentMap`, `machines`, `connection`, or `hierarchyContext` — this widget has no data binding.

### 3b. BuilderCanvas.tsx (line 173, 507-510)

**Conditional corner radius.** Change line 173 from a flat constant to a helper or inline expression:

```tsx
// line 173 — replace:
const widgetCornerRadius = '1.5rem';

// with:
const getWidgetCornerRadius = (type: string) =>
    type === 'dashboard-title' ? '0px' : '1.5rem';
```

**Usage at line 510** — change:
```tsx
<GridSelectionFrame
    isSelected={isSelected}
    isHighlighted={false}
    radius={getWidgetCornerRadius(widget.type)}
/>
```

Also update the `rounded-xl` class on the wrapper `<div>` at line 503 to be conditional:

```tsx
className={`relative group cursor-grab transition-opacity duration-200 ${
    widget.type === 'dashboard-title' ? 'rounded-none' : 'rounded-xl'
}`}
```

This ensures admin mode shows a rectangular selection frame with sharp corners, matching the widget's frameless nature.

### 3c. PropertyDock.tsx

**Add a `dashboard-title`-specific section** inside the General `<DockSection>` (after the existing subtitle/subtext blocks, around line 571):

```tsx
{selectedWidget.type === 'dashboard-title' && (
    <DockFieldRow label="Tamaño de fuente">
        <AdminNumberInput
            value={
                (selectedWidget.displayOptions as DashboardTitleDisplayOptions | undefined)
                    ?.fontSize ?? DEFAULT_DASHBOARD_TITLE_FONT_SIZE
            }
            onChange={(value) => handleDisplayOptionChange('fontSize', value)}
            min={12}
            max={200}
            step={1}
            unit="px"
        />
    </DockFieldRow>
)}
```

**Import** at the top:
```tsx
import type { DashboardTitleDisplayOptions } from '../../domain/admin.types';
import { DEFAULT_DASHBOARD_TITLE_FONT_SIZE } from '../../widgets/renderers/DashboardTitleWidget';
```

**Datos section exclusion** (line 712): add `dashboard-title` to the types excluded from the "Datos" section, since this widget has no data binding:

```tsx
{selectedWidget.type !== 'alert-history'
 && selectedWidget.type !== 'prod-history'
 && selectedWidget.type !== 'dashboard-title' && (
```

### 3d. widgetCapabilities.ts (line 16)

Add explicit entry (even though default is already `false/false`, being explicit is the project convention — every typed widget has an entry):

```ts
const WIDGET_CAPABILITIES: Partial<Record<WidgetType, WidgetCapabilities>> = {
    'metric-card': { catalogVariable: true, hierarchy: true },
    'kpi': { catalogVariable: false, hierarchy: false },
    'dashboard-title': { catalogVariable: false, hierarchy: false },  // ← NEW
    // ...rest
};
```

---

## 4. Styling Strategy

| Property | Source | Mechanism |
|----------|--------|-----------|
| `font-family` | `--font-dashboard-title` CSS var | Inline style: `fontFamily: 'var(--font-dashboard-title)'` |
| `font-weight` | `--font-weight-dashboard-title` CSS var | Inline style: `fontWeight: 'var(--font-weight-dashboard-title)'` |
| `letter-spacing` | `--tracking-dashboard-title` CSS var | Inline style: `letterSpacing: 'var(--tracking-dashboard-title)'` |
| `font-size` | `displayOptions.fontSize` (per-instance) | Inline style: `fontSize: '{value}px'` |
| Background | None | No `glass-panel` class applied |
| Border | None | No `glass-panel` class, no explicit border |
| Border-radius | None (viewer) / `0px` (admin frame) | Renderer has no radius; BuilderCanvas passes `0px` to GridSelectionFrame |
| Color | Inherited from parent | `color: 'inherit'` — follows dashboard text color token |

**Why `fontSize` is NOT the global `--font-size-dashboard-title` var:**
- The global var (`--font-size-dashboard-title: 48px`) controls a system-wide design setting from `DesignSettingsTab`.
- The widget's `displayOptions.fontSize` is per-instance — the admin can place multiple dashboard-title widgets with different sizes.
- They share the same default value (48) but are semantically independent.

**No new CSS file or class needed.** All styling is inline via the `style` prop.

---

## 5. Testing Strategy

All tests co-located as `*.test.tsx` next to their source file. Test runner: `npm run test` (vitest).

### 5a. DashboardTitleWidget.test.tsx

**File:** `hmi-app/src/widgets/renderers/DashboardTitleWidget.test.tsx` (new)

| Test case | What it asserts |
|-----------|-----------------|
| Renders title text | `widget.title` appears in the DOM |
| Applies fontSize from displayOptions | `style.fontSize` equals `'{value}px'` |
| Uses default fontSize when displayOptions is undefined | `style.fontSize` equals `'48px'` |
| Uses default fontSize when displayOptions.fontSize is undefined | `style.fontSize` equals `'48px'` |
| Applies CSS var for font-family | `style.fontFamily` equals `'var(--font-dashboard-title)'` |
| Applies CSS var for font-weight | `style.fontWeight` equals `'var(--font-weight-dashboard-title)'` |
| Applies CSS var for letter-spacing | `style.letterSpacing` equals `'var(--tracking-dashboard-title)'` |
| Does NOT have glass-panel class | Container element does not have `glass-panel` in classList |
| Does NOT render WidgetHeader | No element with `WidgetHeader` test-id or role |
| Renders empty string when title is undefined | No text content, no crash |
| Forwards className prop | Container has the passed className |

### 5b. BuilderCanvas — corner radius (existing test file or new cases)

| Test case | What it asserts |
|-----------|-----------------|
| dashboard-title widget gets `radius="0px"` on GridSelectionFrame | GridSelectionFrame rendered with `radius` prop `"0px"` |
| Non-dashboard-title widget keeps `radius="1.5rem"` | GridSelectionFrame rendered with `radius` prop `"1.5rem"` |
| dashboard-title widget wrapper has `rounded-none` | The item div does NOT have `rounded-xl` |

### 5c. PropertyDock — fontSize control

| Test case | What it asserts |
|-----------|-----------------|
| Shows fontSize input for dashboard-title widget | AdminNumberInput rendered with default value 48 |
| Does not show fontSize input for other widget types | AdminNumberInput for fontSize absent |
| Changing fontSize calls handleDisplayOptionChange | onUpdateWidget called with updated displayOptions.fontSize |

### 5d. widgetCapabilities

| Test case | What it asserts |
|-----------|-----------------|
| dashboard-title has catalogVariable: false | `getWidgetCapabilities('dashboard-title').catalogVariable === false` |
| dashboard-title has hierarchy: false | `getWidgetCapabilities('dashboard-title').hierarchy === false` |

---

## 6. File Map

| File | Action | Description |
|------|--------|-------------|
| `hmi-app/src/domain/admin.types.ts` | MODIFY | Add `'dashboard-title'` to `WidgetType`; add `DashboardTitleDisplayOptions` interface; add `DashboardTitleWidgetConfig` interface; add to `WidgetConfig` union; update `GenericWidgetConfig` Exclude |
| `hmi-app/src/widgets/renderers/DashboardTitleWidget.tsx` | CREATE | Renderer component — text-only, inline CSS var styles, `fontSize` from displayOptions |
| `hmi-app/src/widgets/renderers/DashboardTitleWidget.test.tsx` | CREATE | Unit tests for renderer (title, fontSize, CSS vars, no glass-panel) |
| `hmi-app/src/widgets/WidgetRenderer.tsx` | MODIFY | Import + `case 'dashboard-title'` in switch |
| `hmi-app/src/components/admin/BuilderCanvas.tsx` | MODIFY | Conditional corner radius: `0px` for dashboard-title, `1.5rem` for others; conditional `rounded-none` class |
| `hmi-app/src/components/admin/PropertyDock.tsx` | MODIFY | Import types + default; add fontSize `AdminNumberInput` for dashboard-title; exclude from Datos section |
| `hmi-app/src/utils/widgetCapabilities.ts` | MODIFY | Add `'dashboard-title': { catalogVariable: false, hierarchy: false }` entry |

### Files NOT modified (and why)
- `hmi-app/src/index.css` — No new CSS classes needed; all styling is inline.
- `hmi-app/src/components/admin/DesignSettingsTab.tsx` — The global `--font-dashboard-title` tokens already exist; no new tokens required.
- `hmi-app/src/components/ui/GridSelectionFrame.tsx` — Already supports `radius` prop; `0px` works without changes.

---

## Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Inline styles over CSS class for typography | `fontSize` is per-instance; CSS vars used for family/weight/tracking are co-located in same style object for clarity |
| D2 | Dedicated typed config, not GenericWidgetConfig | Consistent with project pattern; enables typed `displayOptions.fontSize` without casting |
| D3 | `fontSize` independent of `--font-size-dashboard-title` | Global var is system-wide design token; widget fontSize is per-instance admin override; same default (48) but different lifecycle |
| D4 | `0px` radius via helper function, not CSS override | Follows existing `GridSelectionFrame.radius` prop API; keeps logic in JS, not CSS |
| D5 | Explicit capabilities entry despite matching default | Project convention: every typed widget with a dedicated config has an explicit entry |
| D6 | Exclude dashboard-title from Datos section | Widget has no data binding; showing an empty Datos section would confuse admins |
