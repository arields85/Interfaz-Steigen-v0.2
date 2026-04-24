# machine-activity Specification

## Purpose

Definir un widget read-only que traduzca potencia en estado productivo con un gauge compartido con KPI.

## Requirements

### Requirement: Shared Gauge Primitive

The system MUST expose `GaugeDisplay` in `hmi-app/src/components/ui/GaugeDisplay.tsx` with `type GaugeMode = 'circular' | 'bar'` and `interface GaugeDisplayProps { normalizedValue: number; color: { primary: string; gradient: [string, string] }; mode?: GaugeMode; animation?: { enabled: boolean; intensity: 'none' | 'subtle' | 'active'; durationMs?: number }; size?: 'sm' | 'md' | 'lg' | number; }`. KPI and `machine-activity` SHALL both consume it; KPI visuals MUST stay unchanged.

#### Scenario: KPI refactor without drift
- GIVEN an existing KPI in `circular` or `bar`
- WHEN it renders through `GaugeDisplay`
- THEN geometry and transitions remain equivalent

### Requirement: Machine Activity Widget Contract

The system MUST add `WidgetType = 'machine-activity'` and `MachineActivityDisplayOptions` with title, `icon?`, `kpiMode='circular'`; KPI `binding/unit`; `thresholdStopped=0.15`, `thresholdProducing=0.25`, `hysteresis=0.05`, `confirmationTime=2000`, `smoothingWindow=5`; `powerMin=0`, `powerMax=1.0`; `showStateSubtitle=true`, `showPowerSubtext=true`, `showDynamicColor=true`, `showStateAnimation=true`; `labelStopped='Detenida'`, `labelCalibrating='Calibrando'`, `labelProducing='Produciendo'`.

#### Scenario: Default widget creation
- GIVEN the builder adds `machine-activity`
- WHEN no overrides exist
- THEN the widget is created with defaults

### Requirement: Productive State Resolution

The system MUST expose pure helpers: `type ProductiveState = 'stopped' | 'calibrating' | 'producing'` and `determineProductiveState(power, thresholds, hysteresis, previousState)`. Rising transitions SHALL occur at threshold equality; falling transitions at `threshold - hysteresis`.

#### Scenario: Hysteresis avoids flicker
- GIVEN previous state `producing`, `thresholdProducing=0.25`, and `hysteresis=0.05`
- WHEN power falls to `0.23`
- THEN the result remains `producing` until power is `<= 0.20`

### Requirement: Smoothing and Confirmation

The system MUST expose `smoothValue(values: number[], window: number): number` as moving average over the latest window and MUST isolate confirmation timing in a testable helper or hook.

#### Scenario: Candidate state requires dwell time
- GIVEN a candidate transition lasts less than `confirmationTime`
- WHEN confirmation is evaluated
- THEN the effective state remains the previously confirmed state

### Requirement: Activity Index and Invalid Data

The system MUST expose `calculateActivityIndex(power, powerMin, powerMax): number` with linear interpolation, 0-100 clamping, and safe handling for `powerMax <= powerMin`. Invalid `null | undefined | NaN` SHALL render index `0`, subtitle `Sin datos`, subtext `-- kW`, and gauge `0`.

#### Scenario: Invalid power is safe
- GIVEN the resolved value is invalid
- WHEN the widget renders
- THEN it shows the no-data presentation and never throws

### Requirement: State Color and Motion

The system MUST expose `getStateColor(state)` returning CSS-token values only: stopped uses gray/blue, calibrating blue/purple, producing purple/cyan/green. Animation SHALL use CSS transitions on opacity, glow, and transform intensity: stopped=`none`, calibrating=`subtle`, producing=`active`; it MUST be disableable by `showStateAnimation`.

#### Scenario: Dynamic state styling
- GIVEN dynamic color and animation are enabled
- WHEN the state changes from `calibrating` to `producing`
- THEN the widget updates token colors and increases animation intensity

### Requirement: Renderer Composition

The system MUST create `hmi-app/src/widgets/renderers/MachineActivityWidget.tsx` using `glass-panel group`, `WidgetHeader`, and `WidgetCenteredContentLayout`. It SHALL show title, state subtitle, activity index, and footer power text.

#### Scenario: Centered machine activity layout
- GIVEN a configured widget with valid power
- WHEN it renders
- THEN header, centered gauge/index, and footer power text follow canonical layout

### Requirement: Admin Registration and Editing

The system MUST register `machine-activity` in `WidgetRenderer.tsx`, `WidgetCatalogRail.tsx`, and `DashboardBuilderPage.tsx`; default size SHALL match KPI (`1x2`). `PropertyDock.tsx` MUST clone KPI General + Datos exactly, then add `Estados Productivos`, `Escala Visual`, `Visualización`, and `Textos`. `widgetCapabilities.ts` SHALL set `catalogVariable=false` and `hierarchy=false`.

#### Scenario: Builder support is complete
- GIVEN an admin selects the widget
- WHEN editing properties
- THEN all required sections appear and the widget is available in catalog and registry

### Requirement: Test Coverage

The system MUST add co-located tests with strict TDD for `determineProductiveState`, `smoothValue`, and `calculateActivityIndex`, plus a smoke test for `GaugeDisplay` and render test for `MachineActivityWidget`.

#### Scenario: Regression safety
- GIVEN changes to thresholds, smoothing, or gauge rendering
- WHEN the test suite runs
- THEN logic and widget rendering regressions are detected automatically
