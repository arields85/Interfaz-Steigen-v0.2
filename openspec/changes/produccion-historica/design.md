# Design: produccion-historica widget

## Technical Approach

Implementación **clone + local evolution**. Se copia `hmi-app/src/widgets/renderers/OeeProductionTrendWidget.tsx` a `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` y se evoluciona localmente: selector `Hora | Turno | Día | Mes`, toggle OEE, simulación propia con `setInterval` y regrouping puro en `hmi-app/src/utils/temporalGrouping.ts`. `oee-production-trend` queda intacto y coexistente.

## Architecture Decisions

| # | Decisión | Alternativa descartada | Rationale |
|---|---|---|---|
| 1 | Clonar + coexistir | Rename in-place / alias | Evita regresión y preserva dashboards con `oee-production-trend`. |
| 2 | Selectores con `useState` local | Persistir en dashboard config | Son estado efímero; `defaultTemporalGrouping` y `defaultShowOee` solo inicializan. |
| 3 | `utils/temporalGrouping.ts` puro | Lógica inline / colocalizada | La semántica operacional merece contrato testeable y reusable. |
| 4 | Simulación local en/near renderer | Shared util / reusar `trend-chart` | El cambio exige aislamiento, dos series y reset por bucket. |
| 5 | Pill selector inline | Primitive compartida ya | Solo hay antecedente visual en `TrendsPage.tsx`; extraer ahora sería prematuro. |
| 6 | Defaults al crear widget en `DashboardBuilderPage.tsx` | Resolver solo al render | Sigue `handleAddWidget`, hace insertable el widget desde catálogo. |
| 7 | Duplicar bar shape local | Compartir desde base widget | Se prioriza aislamiento explícito sobre DRY. |
| 8 | Gradientes SVG por instancia (`prod-grad-${widget.id}`, `oee-grad-${widget.id}`) | IDs fijos | Previene colisiones de `<defs>` con múltiples widgets. |
| 9 | OEE OFF remueve serie + eje + tooltip + leyenda | Dejar eje secundario vacío | El spec pide desaparición total de elementos OEE. |
| 10 | Header manual documentado | Forzar `WidgetHeader` | La primitive actual no resuelve título + leyenda + controles en una misma banda sin deformarla. |

## Data Flow

```text
Dashboard.widgets[]
  -> DashboardBuilderPage defaults
  -> WidgetRenderer(case 'produccion-historica')
  -> ProduccionHistoricaWidget
     -> displayOptions resolve persisted defaults
     -> useState(bucket, showOee)
     -> useEffect(setInterval) => TrendPoint[] live window
     -> groupByBucket(rawPoints, bucket) => GroupedPoint[]
     -> Recharts (production primary axis, OEE secondary axis optional)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `hmi-app/src/domain/admin.types.ts` | Modify | Add `produccion-historica`, typed config, union updates. |
| `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` | Create | New isolated renderer cloned from OEE base and locally evolved. |
| `hmi-app/src/utils/temporalGrouping.ts` | Create | Pure helpers for hour/shift/day/month grouping. |
| `hmi-app/src/widgets/WidgetRenderer.tsx` | Modify | Register renderer dispatch. |
| `hmi-app/src/components/admin/WidgetCatalogRail.tsx` | Modify | Add catalog entry so widget is insertable. |
| `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` | Modify | Add creation branch and defaults. |
| `openspec/changes/produccion-historica/design.md` | Modify | Persist this design artifact. |

## Interfaces / Contracts

```ts
export type TemporalBucket = 'hora' | 'turno' | 'dia' | 'mes';
export type ProductionChartMode = 'bars' | 'area';

export interface ProduccionHistoricaDisplayOptions {
  sourceLabel?: string; // 'Simulado'
  productionLabel?: string; // 'Producción'
  oeeLabel?: string; // 'OEE (%)'
  chartTitle?: string; // 'PRODUCCIÓN HISTÓRICA'
  productionChartMode?: ProductionChartMode; // 'bars'
  oeeChartMode?: 'line'; // 'line'
  useSecondaryAxis?: boolean; // true
  autoScale?: boolean; // true
  showGrid?: boolean; // true
  oeeShowArea?: boolean; // false
  oeeShowPoints?: boolean; // false
  productionBarWidth?: number;
  defaultTemporalGrouping?: TemporalBucket; // 'hora', initial only
  defaultShowOee?: boolean; // true, initial only
}

export interface ProduccionHistoricaWidgetConfig extends WidgetConfigBase {
  type: 'produccion-historica';
  title?: string; // default 'Producción Histórica'
  displayOptions?: ProduccionHistoricaDisplayOptions;
}

export interface TrendPoint { timestamp: string; production: number; oee: number; }
export interface GroupedPoint {
  bucketKey: string; label: string; startAt: string; endAt: string;
  production: number; oee: number; sampleCount: number;
}

export function groupByBucket(points: TrendPoint[], bucket: TemporalBucket): GroupedPoint[];
export function resolveOperationalDayAnchor(date: Date): Date;
export function resolveShiftAnchor(date: Date): { anchor: Date; shift: 1 | 2 | 3 };
export function formatBucketLabel(anchor: Date, bucket: TemporalBucket, shift?: 1 | 2 | 3): string;
```

## Patterns Used

- Discriminated union en `WidgetConfig`
- Dispatcher central en `WidgetRenderer.tsx`
- `glass-panel` + tokens `@theme`
- Estado estructural persistido vs estado efímero local
- Renderer aislado por clon consciente

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Type | Unión discriminada y defaults | `tsc --noEmit` |
| Unit | `temporalGrouping.ts` edge cases | Casos `05:59`, `06:00`, `22:00`, `Lun / Turno 3` |
| Integration | Alta desde catálogo y dispatch | Crear widget desde builder y renderizarlo |
| Visual | Toggle OEE, reset por bucket, gradientes únicos | Verificación manual con 2 instancias |

## Technical Debt

- Duplicación consciente respecto de `oee-production-trend`.
- Sin primitive compartida para pills.
- Si `mes` usa mes calendario del anchor operacional, no “mes operacional” formal; documentado como deuda hasta definición de negocio.

## Migration / Rollout

Sin migración. Cambio aditivo. Dashboards con `oee-production-trend` no cambian; ambos widgets pueden convivir.

## Open Questions

- [ ] ¿Negocio necesita mes operacional formal o alcanza mes calendario anclado al día operacional?
- [ ] ¿`Producción`/`OEE (%)` quedan como labels definitivos o deben exponerse desde PropertyDock en otra change?
