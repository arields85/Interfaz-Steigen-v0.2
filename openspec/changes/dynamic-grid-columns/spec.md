# dynamic-dashboard-grid Specification

## Purpose

Definir el comportamiento del dashboard grid responsive para builder y viewer, preservando compatibilidad transparente con dashboards legacy de 4 columnas.

## Requirements

### Requirement: Dynamic column calculation

The system MUST calculate dashboard columns as `clamp(floor(containerWidth / 220), 1, 8)` and SHALL recalculate when the measured container width changes.

#### Scenario: Standard width column count
- GIVEN a measured container width of 1100 px
- WHEN the grid resolves its configuration
- THEN the grid uses 5 columns

#### Scenario: Narrow and wide edge cases
- GIVEN a measured width below 220 px or above 1760 px
- WHEN the grid resolves its configuration
- THEN the grid uses 1 column for narrow widths and 8 columns for wide widths

#### Scenario: Window resize updates columns
- GIVEN a rendered dashboard grid
- WHEN the container width changes after a viewport resize
- THEN the column count is recalculated and the grid re-renders with the new value

### Requirement: Viewer grid rendering

The viewer MUST use the shared dynamic column calculation and SHALL render columns with inline grid styles. Row height MUST continue using the existing dynamic calculation with a minimum of 60 px.

#### Scenario: Viewer renders computed columns
- GIVEN a dashboard with widgets and a measured container width
- WHEN the viewer renders
- THEN it uses `gridTemplateColumns: repeat(cols, minmax(0, 1fr))`
- AND it keeps dynamic row height behavior with a 60 px minimum

### Requirement: Builder grid rendering and resize

The builder MUST use the same column calculation as the viewer. The builder MAY use a different grid gap, but resize behavior SHALL derive cell width from the builder container and current column count. Widget width MUST be clamped to `1..cols`; widget height MUST remain clamped to `1..6`.

#### Scenario: Builder uses shared columns
- GIVEN the builder canvas is rendered
- WHEN grid configuration is resolved
- THEN the builder uses the same computed `cols` as the viewer for the same container width
- AND any builder-specific gap does not change the column formula

#### Scenario: Builder resize uses dynamic cell width
- GIVEN a widget is being resized horizontally in the builder
- WHEN drag distance is converted into grid span
- THEN cell width is derived from current builder container width divided by current columns
- AND the resulting `w` is clamped between 1 and `cols`

### Requirement: Widget span rendering

The system MUST render widget horizontal spans with inline `gridColumn` styles and SHALL prevent any widget span from exceeding current columns.

#### Scenario: Render explicit span
- GIVEN a widget layout with `w = 3`
- WHEN the widget renders in builder or viewer
- THEN it uses `gridColumn: span 3 / span 3`

#### Scenario: Clamp oversize span
- GIVEN a widget layout with `w` greater than current columns
- WHEN the widget renders
- THEN the rendered span is clamped to the current column count

### Requirement: Legacy dashboard migration

The system MUST transparently migrate dashboards without `gridVersion` to grid version 2 on load. Migrated widget widths SHALL use `Math.round(w * (currentCols / 4))` with a minimum of 1. Dashboards already marked `gridVersion: 2` MUST NOT be migrated again.

#### Scenario: Migrate legacy dashboard
- GIVEN a stored dashboard without `gridVersion`
- WHEN it is loaded into a grid with current columns
- THEN each widget width is scaled from the legacy 4-column model with a minimum result of 1
- AND the user does not see a separate migration step

#### Scenario: Skip current-version migration
- GIVEN a stored dashboard with `gridVersion: 2`
- WHEN it is loaded
- THEN its widget widths are used without legacy migration

### Requirement: Empty builder state

The builder empty state MUST span the full available grid width.

#### Scenario: Empty state fills grid
- GIVEN a builder dashboard with no widgets
- WHEN the builder renders
- THEN the empty state spans all current columns
