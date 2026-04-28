# dashboard-title Specification

## Purpose

Definir un widget read-only de texto libre para titular sectores del dashboard sin usar el shell visual estándar.

## Requirements

### Requirement: Viewer and Admin Behavior

The system MUST render `dashboard-title` as standalone text in viewer mode. It SHALL NOT render header, frame, background, border, or border radius. In admin mode, the widget MUST keep the same text-only content and SHALL show selection affordances only through the builder selection frame.

#### Scenario: Viewer sees only text
- GIVEN a `dashboard-title` widget is present in a dashboard
- WHEN the dashboard is rendered in viewer mode
- THEN only the title text is visible with no widget chrome

#### Scenario: Admin sees selection affordance
- GIVEN the widget is rendered inside BuilderCanvas and is selected
- WHEN admin mode is active
- THEN the text remains unchanged and the selection frame is visible around it

### Requirement: Widget Contract and Typing

The system MUST add `DashboardTitleDisplayOptions` in `hmi-app/src/domain/admin.types.ts` with `fontSize: number`. It MUST add `DashboardTitleWidgetConfig` using `type: 'dashboard-title'`, standard `title`, and typed `displayOptions: DashboardTitleDisplayOptions`. `WidgetType` and `WidgetConfig` SHALL include `dashboard-title` without moving domain types outside `hmi-app/src/domain/`.

#### Scenario: Default config is valid
- GIVEN an admin creates a new `dashboard-title` widget
- WHEN no custom options are provided
- THEN the config is valid with a default numeric `fontSize` and standard `title`

### Requirement: Typography Rendering Rules

The system MUST render the visible text from `widget.title`. Typography family, weight, and tracking SHALL come from `--font-dashboard-title`, `--font-weight-dashboard-title`, and `--tracking-dashboard-title`. `fontSize` MUST come only from `displayOptions.fontSize` and SHALL have a widget-owned default value. The widget MUST NOT hardcode colors, fonts, or non-system hover/focus styles.

#### Scenario: CSS typography variables drive text styling
- GIVEN the CSS variables for dashboard-title typography are defined
- WHEN the widget renders
- THEN family, weight, and tracking come from those variables and size comes from `displayOptions.fontSize`

### Requirement: Admin Editing Integration

The system MUST register the widget renderer in `hmi-app/src/widgets/WidgetRenderer.tsx`. `PropertyDock` MUST expose a `fontSize` control for `dashboard-title` and persist changes through typed `displayOptions`. `BuilderCanvas` MUST render the admin selection frame with `0px` radius for `dashboard-title`; other framed widgets MAY keep their existing radius.

#### Scenario: Admin updates font size
- GIVEN a selected `dashboard-title` widget in PropertyDock
- WHEN the admin changes `fontSize`
- THEN the widget config updates and the rendered text size changes accordingly

#### Scenario: Square selection frame
- GIVEN a selected `dashboard-title` widget in BuilderCanvas
- WHEN the selection frame is drawn
- THEN its border radius is `0px`

### Requirement: Edge-Case Safety

The system MUST safely render empty, long, and extreme-size titles without adding control behavior. Empty titles SHOULD preserve widget presence for admin editing even if visible text is blank. Very long titles SHOULD remain readable within normal text flow without injecting widget chrome. Extreme `fontSize` values MUST remain numeric and MUST NOT crash rendering or typing flows.

#### Scenario: Empty title remains editable
- GIVEN `widget.title` is an empty string
- WHEN the widget renders in admin mode
- THEN the widget remains selectable and editable

#### Scenario: Long title does not introduce chrome
- GIVEN `widget.title` contains a very long string
- WHEN the widget renders
- THEN the content stays text-only and does not add header, frame, or background

#### Scenario: Extreme font size stays safe
- GIVEN `displayOptions.fontSize` is set to a very small or very large numeric value
- WHEN the widget renders or is edited
- THEN the app keeps a valid render path and does not throw
