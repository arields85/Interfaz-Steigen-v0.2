# Design: Widget "Actividad de Maquina" (`machine-activity`)

> Architectural design for the `machine-activity` widget. Derived from exploration (#764) and proposal (#766).

---

## 1. Component Architecture

### 1.1 Component Tree

```
MachineActivityWidget (renderer)
├── glass-panel group relative p-5 w-full h-full (shell)
├── WidgetCenteredContentLayout
│   ├── header: WidgetHeader
│   │   ├── title = widget.title ?? 'Actividad'
│   │   ├── subtitle = productiveState label (dynamic)
│   │   ├── icon = Activity (Lucide)
│   │   └── iconColor = stateColor (dynamic per productive state)
│   └── children: GaugeDisplay (shared primitive)
│       ├── normalizedValue = activityIndex / 100
│       ├── color/gradient = per productive state
│       ├── mode = displayOptions.gaugeMode ?? 'circular'
│       └── center overlay: activity index number + "%"
└── footer (absolute): smoothed power in kW
```

### 1.2 File Locations

| File | Role | New/Modified |
|------|------|--------------|
| `hmi-app/src/components/ui/GaugeDisplay.tsx` | Shared gauge primitive (circular + bar) | **New** |
| `hmi-app/src/components/ui/GaugeDisplay.test.tsx` | Gauge primitive unit tests | **New** |
| `hmi-app/src/widgets/renderers/MachineActivityWidget.tsx` | Widget renderer | **New** |
| `hmi-app/src/widgets/utils/machineActivity.ts` | Pure logic: state machine, smoothing, activity index | **New** |
| `hmi-app/src/widgets/utils/machineActivity.test.ts` | TDD tests for pure logic | **New** |
| `hmi-app/src/hooks/useMachineActivity.ts` | React hook orchestrating pure functions + state | **New** |
| `hmi-app/src/domain/admin.types.ts` | `MachineActivityDisplayOptions`, `MachineActivityWidgetConfig`, `WidgetType` union | **Modified** |
| `hmi-app/src/widgets/WidgetRenderer.tsx` | Register `machine-activity` case | **Modified** |
| `hmi-app/src/widgets/renderers/KpiWidget.tsx` | Consume `GaugeDisplay` instead of inline SVG | **Modified** |
| `hmi-app/src/components/admin/PropertyDock.tsx` | Add machine-activity sections | **Modified** |
| `hmi-app/src/utils/widgetCapabilities.ts` | Add `machine-activity` entry | **Modified** |
| `hmi-app/src/components/admin/WidgetCatalogRail.tsx` | Add catalog entry | **Modified** |
| `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` | Add creation defaults | **Modified** |

### 1.3 Dependency Order (build sequence)

```
1. GaugeDisplay primitive (no deps on machine-activity)
2. Refactor KpiWidget to consume GaugeDisplay (validate no visual regression)
3. Pure logic module (machineActivity.ts) — zero React deps
4. Types in admin.types.ts
5. useMachineActivity hook
6. MachineActivityWidget renderer
7. Integration: WidgetRenderer, PropertyDock, widgetCapabilities, catalog, builder defaults
```

---

## 2. Data Flow

```
┌───────���──────────────────────────────��──────────────────────────────┐
│ WidgetRenderer receives MachineActivityWidgetConfig                 │
│   ↓                                                                │
│ MachineActivityWidget (renderer)                                    │
│   │                                                                │
│   ├─ resolveBinding(widget, equipmentMap, machines)                 │
│   │   → ResolvedBinding { value, unit, status, source }            │
│   │                                                                │
│   ├─ Extract raw numeric power:                                     │
│   │   rawPower = typeof value === 'number' ? value                 │
│   │            : typeof value === 'string' ? parseFloat(value)     │
│   │            : null                                              │
│   ���                                                                │
│   ├─ useMachineActivity(config, rawPower)                          │
│   │   │                                                            │
│   │   ├─ smoothValue(rawPower, buffer)                             │
│   │   │   → smoothedPower (moving average)                         │
│   │   │                                                            │
│   │   ├─ determineRawState(smoothedPower, thresholds)              │
│   │   │   → candidate ProductiveState                              │
│   │   │                                                            │
│   │   ├─ confirmStateTransition(candidate, current, timer)         │
│   │   │   → confirmedState (with hysteresis + min confirmation)    │
│   │   │                                                            │
│   │   ├─ calculateActivityIndex(smoothedPower, scale)              │
│   │   │   → activityIndex: 0-100                                   │
│   │   │                                                            │
│   │   └─ resolveStateVisuals(confirmedState, themeTokens)          │
│   │       → { stateLabel, stateColor, gradientColors }             │
│   │                                                                │
│   │   Returns: {                                                   │
│   │     activityIndex, productiveState, stateLabel,                │
│   │     stateColor, gradientColors, smoothedPower, isValid         │
│   │   }                                                            │
│   │                                                                │
│   └─ Render:                                                       │
│       ├─ WidgetHeader(title, subtitle=stateLabel, iconColor=…)     │
│       ├─ GaugeDisplay(value=index/100, color, gradient, mode)      │
│       │   └─ center: activityIndex + "%"                           │
│       └─ footer: smoothedPower + " kW"                             │
└────────────��────────────────────────────────────────────────────────┘
```

---

## 3. State Management

### 3.1 State Machine — Productive States

```
                    ┌──────────────────┐
                    │    STOPPED       │
                    │  (Detenida)      │
                    │  power < idle    │
                    └─���────┬───────────┘
                           │ power >= idle
                           │ (confirmed after minTime)
                           ▼
                    ┌──────────────���───┐
                    │   CALIBRATING    │
                    │  (Calibrando)    │
                    │  idle <= power   │
                    │        < prod    │
                    └──────┬───────────┘
                           │ power >= prod
                           │ (confirmed after minTime)
                           ▼
                    ┌──────────────────��
                    │   PRODUCING      │
                    │  (Produciendo)   │
                    │  power >= prod   │
                    └���─────────────────┘
```

**Transitions with hysteresis:**
- Upward transitions: trigger at threshold value exactly
- Downward transitions: trigger at `threshold - (threshold * hysteresisPercent / 100)`
- This prevents flicker when power oscillates around a threshold

### 3.2 State Persistence Strategy

State is maintained in a **React ref** inside `useMachineActivity`, NOT in Zustand:

- **Why ref, not useState**: State transitions are derived from smoothed power on every render. The ref holds the *confirmed* state and confirmation timer without triggering extra renders.
- **Why not Zustand**: This is widget-instance-local state. Each widget instance has its own independent state machine. Global store would add unnecessary coupling.

```typescript
// Inside useMachineActivity hook
const stateRef = useRef<MachineActivityState>({
  confirmedState: 'stopped',
  candidateState: null,
  candidateStartTime: null,
  valueBuffer: [],        // circular buffer for moving average
});
```

### 3.3 Smoothing Implementation

**Moving average** with configurable window:

```
smoothValue(newValue, buffer, windowSize) → smoothedValue
```

- `windowSize` defaults to `5` (configurable via displayOptions)
- Buffer implemented as a simple array with `.push()` + `.slice(-windowSize)` (not a true circular buffer — the window is small enough that slice is cheaper than managing head/tail pointers)
- When buffer has fewer values than windowSize, average uses available values
- `null` values are excluded from the average; if buffer is all null → return null

### 3.4 Confirmation Timer

State transitions require **minimum continuous time** before confirming:

```
confirmStateTransition(candidateState, currentState, stateRef, now) → confirmedState
```

- `confirmationMs` defaults to `3000` (configurable via displayOptions)
- If candidate differs from current: record `candidateStartTime = now`
- If candidate has been stable for >= `confirmationMs`: transition confirmed
- If candidate flips back before confirmation: reset timer, keep current state
- Pure function receives `now` as parameter (testable, no Date.now() inside)

---

## 4. Interface Definitions

### 4.1 ProductiveState Enum

```typescript
// In machineActivity.ts (pure logic module)

export type ProductiveState = 'stopped' | 'calibrating' | 'producing';
```

### 4.2 MachineActivityConfig (pure logic input)

```typescript
// In machineActivity.ts

export interface MachineActivityThresholds {
  /** Power threshold for idle/calibrating state (kW). Default: 5 */
  readonly idleThreshold: number;
  /** Power threshold for producing state (kW). Default: 50 */
  readonly productionThreshold: number;
  /** Hysteresis percentage for downward transitions. Default: 10 */
  readonly hysteresisPercent: number;
}

export interface MachineActivityScale {
  /** Minimum power for activity index mapping. Default: 0 */
  readonly minPower: number;
  /** Maximum power for activity index mapping. Default: 100 */
  readonly maxPower: number;
}

export interface MachineActivityConfig {
  readonly thresholds: MachineActivityThresholds;
  readonly scale: MachineActivityScale;
  /** Moving average window size. Default: 5 */
  readonly smoothingWindow: number;
  /** Minimum ms a candidate state must hold before confirming. Default: 3000 */
  readonly confirmationMs: number;
}
```

### 4.3 MachineActivityState (internal ref state)

```typescript
// In machineActivity.ts

export interface MachineActivityState {
  confirmedState: ProductiveState;
  candidateState: ProductiveState | null;
  candidateStartTime: number | null;
  valueBuffer: number[];
}
```

### 4.4 MachineActivityResult (hook output)

```typescript
// In useMachineActivity.ts

export interface MachineActivityResult {
  /** Activity index 0-100 derived from smoothed power mapped to scale */
  readonly activityIndex: number;
  /** Current confirmed productive state */
  readonly productiveState: ProductiveState;
  /** Localized label for the current state */
  readonly stateLabel: string;
  /** CSS color token for the current state */
  readonly stateColor: string;
  /** Gradient pair [from, to] for gauge rendering */
  readonly gradientColors: readonly [string, string];
  /** Moving-average smoothed power value */
  readonly smoothedPower: number | null;
  /** Whether the input data is valid (non-null, numeric) */
  readonly isValid: boolean;
}
```

### 4.5 DisplayOptions (domain type)

```typescript
// In admin.types.ts

export interface MachineActivityDisplayOptions {
  /** Subtitle text override for header. If omitted, uses dynamic state label */
  subtitle?: string;
  /** Footer subtext override. If omitted, shows smoothed power */
  subtext?: string;
  /** Lucide icon name. undefined=pending, null=none, string=icon name */
  icon?: string | null;
  /** Gauge display mode */
  gaugeMode?: 'circular' | 'bar';
  /** Power threshold for idle/calibrating boundary (kW) */
  idleThreshold?: number;
  /** Power threshold for calibrating/producing boundary (kW) */
  productionThreshold?: number;
  /** Hysteresis percentage for downward transitions (0-50) */
  hysteresisPercent?: number;
  /** Min power for activity index scale */
  minPower?: number;
  /** Max power for activity index scale */
  maxPower?: number;
  /** Moving average window size (2-20) */
  smoothingWindow?: number;
  /** Confirmation time in ms before state transition (500-10000) */
  confirmationMs?: number;
  /** Custom label for stopped state */
  stoppedLabel?: string;
  /** Custom label for calibrating state */
  calibratingLabel?: string;
  /** Custom label for producing state */
  producingLabel?: string;
}
```

### 4.6 WidgetConfig Variant

```typescript
// In admin.types.ts

export interface MachineActivityWidgetConfig extends WidgetConfigBase {
  type: 'machine-activity';
  displayOptions?: MachineActivityDisplayOptions;
}

// Add to WidgetType union:
export type WidgetType =
  | 'kpi'
  | 'metric-card'
  // ... existing types ...
  | 'machine-activity';

// Add to WidgetConfig union:
export type WidgetConfig =
  | KpiWidgetConfig
  // ... existing variants ...
  | MachineActivityWidgetConfig
  | GenericWidgetConfig;

// Type guard:
export function isMachineActivityWidget(w: WidgetConfig): w is MachineActivityWidgetConfig {
  return w.type === 'machine-activity';
}
```

### 4.7 GaugeDisplay Props (shared primitive)

```typescript
// In GaugeDisplay.tsx

export interface GaugeDisplayProps {
  /** Normalized value 0-1 controlling fill percentage */
  normalizedValue: number;
  /** Display mode */
  mode: 'circular' | 'bar';
  /** Primary display value (shown in center for circular, left for bar) */
  displayValue: string;
  /** Unit label shown below value */
  unit?: string;
  /** SVG gradient ID or solid color for the gauge stroke/fill */
  strokeColor: string;
  /** CSS background for bar mode fill */
  cssGradient: string;
  /** Drop-shadow filter for glow effect */
  glowShadow: string;
  /** SVG gradient definitions to inject into <defs> */
  gradientDefs?: React.ReactNode;
  /** Min/max labels for bar mode */
  min?: number;
  max?: number;
  /** Additional class names */
  className?: string;
}
```

**Design rationale**: The primitive receives pre-computed visual props (colors, gradients, glow) rather than raw data. This keeps the primitive purely presentational — all logic (threshold evaluation, dynamic color selection) stays in the consuming widget. This is critical because KPI and machine-activity compute colors differently (KPI uses threshold-based dynamic color; machine-activity uses productive-state-based color).

---

## 5. Token Strategy

### 5.1 New CSS Tokens

Add to `@theme` block in `hmi-app/src/index.css`:

```css
/* ── Machine Activity: productive state gradients ── */
/* Stopped: muted/gray — machine is off */
--color-activity-stopped-from: #64748b;
--color-activity-stopped-to: #475569;
/* Calibrating: amber/cyan — machine warming up */
--color-activity-calibrating-from: #f59e0b;
--color-activity-calibrating-to: #22d3ee;
/* Producing: green/cyan — machine in production */
--color-activity-producing-from: #10b981;
--color-activity-producing-to: #22d3ee;
```

### 5.2 State-to-Token Map (pure function)

```typescript
// In machineActivity.ts

export const STATE_VISUALS: Record<ProductiveState, {
  defaultLabel: string;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
}> = {
  stopped: {
    defaultLabel: 'Detenida',
    iconColor: 'var(--color-industrial-muted)',
    gradientFrom: 'var(--color-activity-stopped-from)',
    gradientTo: 'var(--color-activity-stopped-to)',
    glowColor: 'color-mix(in srgb, var(--color-industrial-muted) 30%, transparent)',
  },
  calibrating: {
    defaultLabel: 'Calibrando',
    iconColor: 'var(--color-status-warning)',
    gradientFrom: 'var(--color-activity-calibrating-from)',
    gradientTo: 'var(--color-activity-calibrating-to)',
    glowColor: 'color-mix(in srgb, var(--color-accent-amber) 50%, transparent)',
  },
  producing: {
    defaultLabel: 'Produciendo',
    iconColor: 'var(--color-status-normal)',
    gradientFrom: 'var(--color-activity-producing-from)',
    gradientTo: 'var(--color-activity-producing-to)',
    glowColor: 'color-mix(in srgb, var(--color-accent-green) 50%, transparent)',
  },
};
```

### 5.3 Reused Tokens

- `glass-panel` surface — as-is from `index.css`
- `--font-widget-value` / `--font-weight-widget-value` — for activity index number
- `--color-industrial-muted` — for footer text, disabled states
- `--color-widget-icon` — fallback icon color (not used; each state has its own)
- `--color-industrial-border` — glass-panel border

### 5.4 No Hardcoded Colors

All colors referenced via CSS custom properties. The `STATE_VISUALS` map uses `var(--color-*)` references exclusively. This allows theme changes to propagate automatically.

---

## 6. Animation Design

### 6.1 Gauge Fill Transition

```css
/* Applied via Tailwind classes on GaugeDisplay */
transition: all 500ms ease-out;
/* Matches existing KPI arc/bar transition: "transition-all duration-500 ease-out" */
```

Both circular (SVG `strokeDashoffset`) and bar (`width` percentage) use the same 500ms ease-out. This is the established system pattern.

### 6.2 State Transition Animation

When `productiveState` changes (already confirmed via timer):

- **Color transition**: gradient colors and glow transition via CSS `transition` on the SVG gradient stops and filter. Duration: `300ms ease-in-out` — faster than the fill transition to feel snappy.
- **Subtitle color**: WidgetHeader subtitle inherits `iconColor`, which changes per state. The header already applies `transition-colors` on the subtitle span.
- **No flash/blink**: Because the state machine requires confirmation time, the visual transition happens once and stays. No oscillation.

### 6.3 Invalid Data State

When `isValid === false`:
- Display value shows `'--'`
- Gauge shows 0% fill
- Subtitle shows `'Sin datos'`
- Icon color falls back to `var(--color-industrial-muted)`
- No animation — static empty state

### 6.4 Loading State

When `isLoadingData === true`:
- Same skeleton pattern as KPI: `animate-pulse` with `bg-industrial-hover` placeholders
- Matches existing system language

---

## 7. Integration Points

### 7.1 WidgetRenderer Registration

```typescript
// In WidgetRenderer.tsx — add case before default
case 'machine-activity':
  return (
    <MachineActivityWidget
      widget={widget}
      equipmentMap={equipmentMap}
      machines={machines}
      isLoadingData={isLoadingData}
      className={className}
    />
  );
```

Same prop signature as KpiWidget. No hierarchy support needed.

### 7.2 Widget Capabilities

```typescript
// In widgetCapabilities.ts
'machine-activity': { catalogVariable: false, hierarchy: false },
```

Machine-activity reads a single power binding, like KPI. No catalog or hierarchy aggregation.

### 7.3 Catalog Rail Entry

```typescript
// In WidgetCatalogRail.tsx — add to ACTIONS array
{ type: 'machine-activity', label: 'Actividad', icon: Activity }
```

### 7.4 Builder Defaults

```typescript
// In DashboardBuilderPage.tsx — handleAddWidget
case 'machine-activity':
  return {
    ...baseWidget,
    type: 'machine-activity',
    size: { w: 2, h: 2 },     // same as KPI default
    displayOptions: {
      icon: 'Activity',
      gaugeMode: 'circular',
      idleThreshold: 5,
      productionThreshold: 50,
      minPower: 0,
      maxPower: 100,
    },
  };
```

### 7.5 PropertyDock Sections

Machine-activity will have these sections in PropertyDock:

| Section | Fields | Pattern |
|---------|--------|---------|
| **General** | title, subtitle, subtext, icon, gaugeMode | Clone KPI General pattern |
| **Datos** | binding mode, unit, machine, variable | Clone KPI Datos pattern (reuse existing binding UI) |
| **Estados Productivos** | idleThreshold, productionThreshold, hysteresisPercent | New — `AdminNumberInput` per field |
| **Escala Visual** | minPower, maxPower | New — mirrors KPI "Rango" section |
| **Suavizado** | smoothingWindow, confirmationMs | New — `AdminNumberInput` per field |
| **Textos** | stoppedLabel, calibratingLabel, producingLabel | New — mirrors ConnectionStatus "Textos" section |

**Guard**: Sections gated by `selectedWidget.type === 'machine-activity'`.

### 7.6 Header Support

Machine-activity is **NOT** header-compatible. No changes to `headerWidgets.ts`.

---

## 8. GaugeDisplay Extraction Strategy

### 8.1 Extraction from KPI — Step by Step

The current KPI has `CircularKpi()` and `BarKpi()` as local functions with:
- SVG viewBox, circle geometry, strokeDasharray math (circular)
- Percentage bar, width-based fill (bar)
- Gradient `<defs>`, glow filter
- Center value/unit typography
- `transition-all duration-500 ease-out`

**Extraction plan:**

1. Create `GaugeDisplay.tsx` as a pure presentational component that receives:
   - `normalizedValue` (0-1) — caller does the min/max normalization
   - `displayValue` (string) — caller formats the number
   - `unit` (optional string)
   - `strokeColor` / `cssGradient` / `glowShadow` — caller resolves colors
   - `gradientDefs` (ReactNode) — caller provides SVG `<defs>` content
   - `mode` ('circular' | 'bar')
   - `min` / `max` (for bar labels only)

2. Refactor `KpiWidget.tsx`:
   - Remove inline `CircularKpi()` and `BarKpi()` functions
   - Compute `normalizedValue`, `displayValue`, colors inline
   - Build gradient `<defs>` JSX inline (4 gradient definitions)
   - Pass everything to `<GaugeDisplay />`
   - **Visual result must be pixel-identical** — same viewBox, same radii, same offsets

3. Verify KPI visual regression with manual inspection (no visual regression test infra exists).

### 8.2 Why Not a "Smart" Gauge

The primitive does NOT handle:
- Color logic (threshold evaluation, state-based colors)
- Value normalization (min/max clamping)
- Number formatting (decimal places, null → '--')

Each consumer (KPI, machine-activity) has different color/formatting rules. Pushing this into the primitive would create a God Component. The primitive is a **rendering surface only**.

---

## 9. Testing Strategy

### 9.1 Pure Logic (TDD — highest priority)

**File:** `hmi-app/src/widgets/utils/machineActivity.test.ts`

| Test Group | Cases |
|-----------|-------|
| `smoothValue` | Empty buffer returns value; partial buffer averages correctly; full window slides; null values excluded; all-null returns null |
| `determineRawState` | Below idle → stopped; between idle and prod → calibrating; above prod → producing; exactly at threshold → correct state |
| `confirmStateTransition` | New candidate starts timer; candidate held long enough → confirms; candidate flips before confirmation → resets; same state → no change |
| `calculateActivityIndex` | Min power → 0; max power → 100; mid-range → proportional; below min → clamps to 0; above max → clamps to 100 |
| `hysteresis` | Downward transition uses threshold minus hysteresis%; upward transition uses exact threshold; oscillation around threshold with hysteresis stays stable |

### 9.2 Hook Integration

**File:** `hmi-app/src/hooks/useMachineActivity.test.ts` (if needed)

- Verify hook returns correct initial state
- Verify state transitions after multiple renders with changing values
- Use `@testing-library/react` `renderHook` + `act`

### 9.3 GaugeDisplay

**File:** `hmi-app/src/components/ui/GaugeDisplay.test.tsx`

- Renders circular mode with correct SVG structure
- Renders bar mode with correct DOM structure
- Displays value and unit
- Applies transition classes

### 9.4 What Does NOT Get Unit Tested

- `MachineActivityWidget.tsx` renderer — integration tested via manual visual QA
- PropertyDock sections — covered by existing PropertyDock patterns
- WidgetRenderer dispatch — trivial switch case

---

## 10. Rejected Alternatives

### 10.1 Zustand for State Machine

**Rejected**: Each widget instance needs independent state. A global store would require keying by widget ID with cleanup on unmount — more complex than a ref, for no benefit.

### 10.2 True Circular Buffer (ring buffer)

**Rejected**: Window size is 5-20 values. Array `.push()` + `.slice(-n)` is simpler, GC-friendly at this scale, and more readable. Ring buffer is overkill.

### 10.3 Smart GaugeDisplay with Built-in Color Logic

**Rejected**: KPI and machine-activity have fundamentally different color determination (threshold-based vs. state-based). Merging both into the primitive creates coupling. Dumb primitive + smart consumers is cleaner.

### 10.4 CSS Animation for State Transitions (keyframes)

**Rejected**: CSS transitions on existing properties (`stroke`, `color`, `width`) are sufficient. Keyframe animations would add complexity for marginal visual improvement.

### 10.5 Placing Pure Logic in `hmi-app/src/utils/`

**Rejected**: The logic is widget-specific, not app-wide. `hmi-app/src/widgets/utils/` keeps it co-located with the widget system following the data flow convention: `resolvers/` for binding, `utils/` for widget-specific computation, `renderers/` for presentation.

---

## Appendix: Default Values Summary

| Parameter | Default | Range |
|-----------|---------|-------|
| `idleThreshold` | 5 kW | 0+ |
| `productionThreshold` | 50 kW | > idleThreshold |
| `hysteresisPercent` | 10% | 0-50 |
| `minPower` | 0 kW | 0+ |
| `maxPower` | 100 kW | > minPower |
| `smoothingWindow` | 5 | 2-20 |
| `confirmationMs` | 3000 ms | 500-10000 |
| `gaugeMode` | 'circular' | 'circular' \| 'bar' |
| `stoppedLabel` | 'Detenida' | any string |
| `calibratingLabel` | 'Calibrando' | any string |
| `producingLabel` | 'Produciendo' | any string |
