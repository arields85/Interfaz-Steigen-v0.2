## Exploration: produccion-historica

### Current State

#### 1. Current state inventory
- `hmi-app/src/widgets/renderers/OeeProductionTrendWidget.tsx` — renderer existente base para clonar. Usa `MOCK_DATA` fijo de 7 puntos, `AreaChart` para modo área y un SVG custom para modo barras.
- `hmi-app/src/widgets/renderers/TrendChartWidget.tsx` — referencia conductual del `trend-chart`. Hoy genera una serie simulada local de 24 puntos alrededor del valor actual del binding usando `generateTrendData(...)`; no comparte util con `oee-production-trend`.
- `hmi-app/src/domain/admin.types.ts` — define `WidgetType`, `OeeProductionTrendDisplayOptions`, `OeeProductionTrendWidgetConfig`, unión `WidgetConfig` y guards.
- `hmi-app/src/widgets/WidgetRenderer.tsx` — dispatcher central con casos para `trend-chart`, `oee-production-trend`, etc.
- `hmi-app/src/widgets/WIDGET_AUTHORING.md` — convención vigente: `glass-panel`, `WidgetHeader`, tipado en `domain/`, registro en `WidgetRenderer`, y sin parches ad-hoc.
- `hmi-app/src/index.css` — `@theme {}` con los tokens consumibles por el widget.
- `hmi-app/src/utils/` — contenidos actuales:
  - `adminNavigation.ts`
  - `connectionWidget.ts`
  - `dashboardHeader.ts`
  - `headerWidgets.ts`
  - `hierarchyTree.ts`
  - `idGenerator.ts`
  - `statusWidget.ts`
  - `trendDataGenerator.ts`

#### 2. Relevant implementation details already present
- `OeeProductionTrendWidget.tsx` ya resuelve:
  - IDs únicos de gradientes por instancia (`widget.id`)
  - producción en `area | bars`
  - dos ejes Y en el modo área
  - estética industrial basada en tokens, sin hex hardcodeados
- `WidgetCatalogRail.tsx` hoy expone `trend-chart` y `oee-production-trend`; para coexistencia visible del nuevo widget habrá que sumar `produccion-historica` ahí.
- `DashboardBuilderPage.tsx` construye widgets nuevos con defaults por tipo. Hoy sólo `trend-chart` recibe ancho 2 y config específica; `oee-production-trend` cae en el branch genérico. Si `produccion-historica` debe nacer usable desde el builder, también necesita alta ahí.

### Affected Areas
- `hmi-app/src/domain/admin.types.ts` — agregar `WidgetType = 'produccion-historica'`, display options y config tipado.
- `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` — nuevo renderer derivado de `OeeProductionTrendWidget.tsx` con simulación local, selectores y agrupación temporal.
- `hmi-app/src/widgets/WidgetRenderer.tsx` — registrar el caso nuevo.
- `hmi-app/src/utils/temporalGrouping.ts` — nueva utilidad pura para bucketización por hora/turno/día/mes.
- `hmi-app/src/components/admin/WidgetCatalogRail.tsx` — exponer el nuevo tipo en el catálogo del builder.
- `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` — defaults iniciales y tamaño base del nuevo widget al insertarlo.
- `openspec/changes/produccion-historica/explore.md` — artefacto de exploración híbrido.

### Reference Image Context
- Sí existe un antecedente visual similar: `hmi-app/src/pages/TrendsPage.tsx` líneas ~160-174.
- Ese selector de rango usa:
  - contenedor: `flex gap-1 glass-panel p-1`
  - botón activo: `bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20`
  - botón inactivo: `text-industrial-muted hover:text-industrial-text`
  - forma: `rounded-2xl`
- Conclusión: NO hace falta inventar un token nuevo. El criterio visual del pill selector ya existe, pero hoy no está extraído a una primitive compartida. Para este cambio conviene reusar ese lenguaje visual localmente; si aparece un tercer uso, recién ahí justificar una primitive.

### Temporal Grouping Logic

#### Operational rules from the prompt
- Turno 1: `06:00 <= t < 14:00`
- Turno 2: `14:00 <= t < 22:00`
- Turno 3: `22:00 <= t < 06:00` (cruza medianoche)
- Día operacional: `06:00 -> 06:00`
- Semana operacional: empieza el lunes, coherente con el día operacional (recomendación: lunes 06:00, no lunes 00:00)

#### Edge cases
- **Lunes 05:59**:
  - NO pertenece al lunes operacional.
  - Pertenece al **domingo operacional**.
  - Pertenece al **Turno 3 del domingo**.
  - Si la semana operacional empieza lunes 06:00, también pertenece a la **semana operacional anterior**.
- **Lunes 06:00**:
  - primer instante del lunes operacional
  - inicio de Turno 1
  - inicio de nueva semana operacional cuando además es lunes
- **Domingo 23:30**:
  - pertenece al domingo operacional
  - Turno 3 del domingo
  - si sigue hasta lunes 05:59, sigue siendo domingo operacional

#### Labeling ambiguity: “Lun / Turno 3”
Hay dos interpretaciones posibles:

1. **Label by shift start day** (RECOMENDADA)
   - `Lun / Turno 3` = el turno que arranca lunes 22:00 y termina martes 06:00.
   - Ventaja: consistente con el día operacional 06:00-06:00.
   - Ventaja: evita que `05:59` del lunes caiga en `Lun / Turno 3`, lo cual contradice la definición operacional.

2. **Label by calendar day where sample is observed**
   - `05:59` del lunes sería `Lun / Turno 3`.
   - Problema: rompe la semántica del día operacional y genera ambigüedad entre “turno que termina el lunes” vs “turno que empieza el lunes”.

**Recomendación firme**: etiquetar por **día de inicio del turno / día operacional ancla**. Entonces:
- `Dom / Turno 3` = domingo 22:00 -> lunes 05:59
- `Lun / Turno 3` = lunes 22:00 -> martes 05:59

#### Shape of the utility
- `groupByBucket(points, 'hora')` — conserva granularidad horaria.
- `groupByBucket(points, 'turno')` — agrupa por turno operacional usando día ancla + turno.
- `groupByBucket(points, 'dia')` — agrupa por día operacional 06:00-06:00.
- `groupByBucket(points, 'mes')` — agrupa por mes operacional/ancla calendario; conviene documentar que el mes se etiqueta por la fecha ancla del bucket.
- Salida recomendada: buckets con label listo para UI (`"Lun / Turno 1"`, `"Mar 14"`, `"Abr 2026"`) y métricas agregadas por bucket.

### Simulation Reference
- `TrendChartWidget.tsx` hoy usa una simulación **local y desacoplada del backend**:
  - resuelve un valor base desde el binding
  - llama `generateTrendData(baseValue, undefined, 24)`
  - la utilidad usa `Date.now()` como ancla temporal y genera 24 puntos espaciados uniformemente (por defecto 1 min)
  - sólo maneja **una serie** (`value`)
  - marca visualmente el último punto con `animate-ping`
- Importante: en código actual **no hay streaming con `setInterval`** dentro de `TrendChartWidget.tsx`; es una foto simulada memoizada por `baseValue`, no una ventana deslizante viva.
- Para `produccion-historica`, el patrón reusable a nivel conceptual es:
  - simulación local
  - referencia temporal basada en “ahora”
  - datos mock calculados dentro del renderer/helper local
  - sin servicios/queries compartidas
- Lo que habrá que agregar NUEVO en `produccion-historica`:
  - dos series (`production`, `oee`)
  - ventana progresiva local por bucket
  - regrouping dinámico según selector `Hora | Turno | Día | Mes`

### Token Inventory
Tokens existentes suficientes; no aparece necesidad de nuevos tokens.

#### Base surface / text
- `--color-industrial-bg`
- `--color-industrial-surface`
- `--color-industrial-border`
- `--color-industrial-text`
- `--color-industrial-muted`
- `--color-chart-grid`

#### Accent / chart
- `--color-accent-cyan` (estado activo del selector)
- `--color-widget-gradient-from` (serie OEE / gradientes)
- `--color-widget-gradient-to` (serie producción / gradientes)
- `--color-widget-icon`

#### Semantic support if needed
- `--color-status-normal`
- `--color-status-warning`
- `--color-status-critical`

#### Typography
- `--font-sans`
- `--font-chart`

Conclusión: el selector pill puede seguir el patrón de `TrendsPage.tsx` usando clases derivadas de `accent-cyan` + `glass-panel`; el gráfico puede heredar exactamente la misma base tokenizada del widget OEE existente.

### Defaults Mapping

#### Recommended split between persisted config and local UI state
Hay una tensión real acá:
- el usuario pidió **selectores con `useState` local, no persistidos**
- pero también pidió mapear defaults a `ProduccionHistoricaDisplayOptions`

Para mantener consistencia con el requerimiento, recomiendo esta división:

| Requirement default | Recommended home | Proposed field / initializer | Note |
|---|---|---|---|
| Título `Producción Histórica` | `WidgetConfig` | `widget.title = 'Producción Histórica'` | No debería vivir en `displayOptions` si es el nombre del widget en builder. |
| Origen `Simulado` | `displayOptions` | `sourceLabel?: string` default `'Simulado'` | Texto visible en header/legend/contexto. |
| Producción = Bars | `displayOptions` | `productionChartMode?: 'bars' | 'area'` default `'bars'` | Persistible. |
| OEE = Line | `displayOptions` | `oeeChartMode?: 'line'` default `'line'` | Aunque hoy solo exista line, tiparlo deja explícito el contrato. |
| OEE visible ON | local UI state | `const [showOee, setShowOee] = useState(true)` | Si va en `displayOptions`, deja de ser local/no persistido. |
| Secondary axis ON | `displayOptions` | `showSecondaryAxis?: boolean` default `true` | Persistible. |
| Autoscale ON | `displayOptions` | `autoScale?: boolean` default `true` | Persistible. |
| Grid ON | `displayOptions` | `showGrid?: boolean` default `true` | Persistible. |
| Fill under OEE OFF | `displayOptions` | `showOeeFill?: boolean` default `false` | Persistible. |
| OEE points OFF | `displayOptions` | `showOeePoints?: boolean` default `false` | Persistible. |
| Temporal grouping `Hora` | local UI state | `const [bucket, setBucket] = useState<'hora'|'turno'|'dia'|'mes'>('hora')` | Mismo conflicto que OEE ON/OFF: por requerimiento NO debería persistirse. |

Si se quiere que TODO esté dentro de `displayOptions`, entonces hay que aceptar explícitamente que `bucket` y `showOee` pasarían a ser configuración persistida. Hoy eso contradice el plan aprobado.

### Approaches
1. **Exact clone + local evolution** — copiar `OeeProductionTrendWidget` a `ProduccionHistoricaWidget` y extender sólo ahí.
   - Pros: respeta el pedido del usuario, minimiza riesgo de regresión sobre `oee-production-trend`, deja la referencia intacta, esfuerzo bajo.
   - Cons: duplica parte del renderer base, puede generar drift futuro entre widgets hermanos.
   - Effort: Medium

2. **Refactor shared chart core first** — extraer base común para ambos widgets y luego derivar variantes.
   - Pros: menos duplicación estructural a largo plazo.
   - Cons: contradice el plan aprobado, toca el widget existente, aumenta riesgo de regresión y ensancha el scope.
   - Effort: High

### Recommendation
Seguir **Approach 1: exact clone + local evolution**.

Es el approach correcto por tres razones: 
1. ya está aprobado por el usuario,
2. preserva `oee-production-trend` como baseline intacta,
3. permite encapsular la simulación, la agrupación temporal y los selectores sin contaminar otros widgets.

Implementación recomendada para la próxima fase:
- clonar la estructura visual del renderer OEE actual
- reemplazar el header custom por `WidgetHeader` + trailing actions/selectors si el layout lo permite; si no, documentar por qué se conserva un header compuesto local
- generar datos locales base (timestamp + production + oee)
- agrupar con `temporalGrouping.ts`
- usar `useState` local para `bucket` y `showOee`
- mantener defaults persistibles en `displayOptions` y defaults efímeros como inicializadores locales

### Risks
- **Conflicto de contrato**: `temporalGrouping` y toggle OEE fueron pedidos como estado local no persistido, pero el entregable también pide mapear defaults a `ProduccionHistoricaDisplayOptions`.
- **Alta en builder**: si no se modifica `WidgetCatalogRail.tsx` y `DashboardBuilderPage.tsx`, el nuevo tipo quedará tipado/renderizable pero no insertable fácilmente desde la UI admin.
- **Header conventions**: `OeeProductionTrendWidget.tsx` no usa `WidgetHeader`; si se hace copia literal, el nuevo widget también nacerá fuera de la convención. Hay que decidir si preservamos la copia exacta como baseline o si la normalizamos en la primera implementación.
- **Grouping semantics**: si no se fija explícitamente que Turno 3 se etiqueta por día de inicio, habrá ambigüedad en labels y en week-boundaries.
- **Simulation expectation**: el `trend-chart` actual no implementa streaming progresivo real con intervalos; si la UX esperada es “ventana viva”, habrá que diseñarla de cero localmente.
- **Tooltip/axis density**: `Mes` y `Turno` pueden requerir distinto spacing y truncado de labels para no romper el ancho del widget.

### Ready for Proposal
Yes — listo para `sdd-propose`.

Antes de proponer conviene fijar explícitamente estas dos decisiones en el proposal/spec:
1. `Turno 3` se etiqueta por **día de inicio** (`Lun / Turno 3` = lunes 22:00 -> martes 06:00).
2. `bucket` y `showOee` quedan como **estado efímero local**, no persistido en dashboard config.
