# Proposal: produccion-historica-fix

## What
Corrective change for `produccion-historica`: fixes three rejected defects (flat bars, rewinding simulation, wrong PropertyDock) and adds a fourth enhancement (premium OEE glow in both modes). It is additive at the domain level and modifies only `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx`, `hmi-app/src/domain/admin.types.ts`, and `hmi-app/src/components/admin/PropertyDock.tsx`.

## Why
The widget was user-rejected: bars looked flat, simulated history visibly rewound, and the builder exposed generic sections that do not apply. Also, the OEE line in area mode looks weaker than `oee-production-trend`. This closes that gap and completes the property panel expected by the original prompt reference `D:\Descargas\prompt_produccion_historica.md` without importing it into the project.

## Scope
### In Scope
- Rewrite `ProduccionHistoricaWidget.tsx` with local `ProduccionHistoricaBarsSvg`: premium bars, smooth production area mode, identical glowing OEE path in both modes, unique SVG IDs, manual ticks, symmetric padding.
- Replace interval streaming with one-shot `generateHistoricalSeries(bucket, now)` in `useEffect([bucket])`; keep liveness only through `animate-ping` on the last OEE point and production top.
- Apply `showGrid`, `useSecondaryAxis`, `oeeShowArea`, `oeeShowPoints`, `productionBarWidth` as factor `0.5–1.5`, `autoScale`, manual axis min/max fallback, `subtitle`, and OEE hide behavior.
- Extend `ProduccionHistoricaDisplayOptions` with `subtitle`, manual scales, real-mode variable keys, and documented `productionBarWidth` factor semantics.
- Add full `produccion-historica` PropertyDock branch: General, Datos, Series, Visualización, Escalas, Layout; exclude generic `Ícono/Unidad/Datos` fallback sections.

### Out of Scope
- Changes to `OeeProductionTrendWidget.tsx`, `TrendChartWidget.tsx`, `trendDataGenerator.ts`, `temporalGrouping.ts`, registrations already in place, tests, shared slider/pill primitives, real-variable consumption, `Directrices/`, or prompt-file ingestion.

## Capabilities
### New Capabilities
- None.

### Modified Capabilities
- `produccion-historica-widget`: correct rendering parity, static historical simulation, dock-specific editing, additive display options, and silent autoscale fallback for invalid manual domains.

## High-level approach
Conscious local duplication of the accepted premium SVG language from `oee-production-trend`, removal of the incorrect streaming loop, and completion of the widget-specific PropertyDock branch. These land together because the renderer, dock, and display-option contract are tightly coupled.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` | Modified | Heavy rewrite to SVG renderer + static simulation |
| `hmi-app/src/domain/admin.types.ts` | Modified | Additive display-option fields; `productionBarWidth` factor semantics |
| `hmi-app/src/components/admin/PropertyDock.tsx` | Modified | Dedicated branch and generic-fallback exclusions |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Local SVG duplication diverges over time | Med | Keep `oee-production-trend` untouched; document debt |
| `productionBarWidth` meaning changes | Low | Safe: field not exposed/consumed by saved dashboards yet |
| Real variable keys editable but unused | Med | Type now, document renderer debt |
| Silent manual-scale fallback may surprise users | Med | Document behavior in spec/design |

## Migration / compatibility
Additive for `ProduccionHistoricaDisplayOptions`; existing instances remain valid because new fields are optional. Only behavioral shift is `productionBarWidth` moving from absolute pixels to factor, which is safe in current usage.

## Rollback Plan
Revert the three modified files and restore the previous renderer/dock behavior; no data migration is required.

## Dependencies
- Exploration artifact: Engram `sdd/produccion-historica-fix/explore`, `openspec/changes/produccion-historica-fix/explore.md`.
- Previous spec baseline: Engram `sdd/produccion-historica/spec`.

## Success Criteria
- [ ] Bars mode visually matches `oee-production-trend`; area mode is smooth and premium.
- [ ] OEE glow/spline matches in both modes.
- [ ] Bucket change regenerates once with no visible rewind.
- [ ] Last OEE point and production top pulse with `animate-ping`.
- [ ] PropertyDock shows full specialized sections and hides generic fallback fields.
- [ ] Autoscale disables manual inputs; invalid manual scales silently fall back.
- [ ] `oee-production-trend` still coexists unchanged.

## Links
- Exploration: Engram `sdd/produccion-historica-fix/explore`; file `openspec/changes/produccion-historica-fix/explore.md`.
- Previous change spec: Engram `sdd/produccion-historica/spec`.
