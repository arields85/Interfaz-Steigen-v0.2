# Design: produccion-historica-fix

## 1. Technical Approach

Corrective refactor of `ProduccionHistoricaWidget.tsx` that ports `BarsModeSvg` from `OeeProductionTrendWidget.tsx` as a local `ProduccionHistoricaBarsSvg` (conscious duplication, never imported), replaces the rewinding `setInterval` simulation with a one-shot `generateHistoricalSeries(bucket, now)` helper colocated in the widget file, adds `animate-ping` last-point indicators to both production and OEE following the `TrendChartWidget` pattern, extends `ProduccionHistoricaDisplayOptions` with the dock-only fields (`subtitle`, manual axis bounds, and reserved real-variable keys) under a documented factor semantic for `productionBarWidth`, and adds a full `produccion-historica` branch in `PropertyDock.tsx` using the same exclusion pattern that already exists for `oee-production-trend`. Recharts is removed entirely from this widget; the chart core becomes a `ResizeObserver`-measured raw SVG container with one render branch per production mode.

## 2. Architecture Decisions

| # | Decisión | Alternativa descartada | Rationale |
|---|----------|------------------------|-----------|
| 1 | Portar `BarsModeSvg` como componente local `ProduccionHistoricaBarsSvg` dentro del propio archivo del widget. | (a) Importar desde `oee-production-trend`. (b) Extraer un módulo compartido en `widgets/_shared/`. | (a) violaría la inmutabilidad de `oee-production-trend` y crearía acoplamiento entre widgets. (b) introduce un primitive nuevo cuyo contrato aún no está validado por dos consumidores reales. La duplicación consciente respeta la decisión vinculante de spec, queda contenida en un solo archivo y deja la puerta abierta a una extracción posterior (deuda documentada). |
| 2 | Un único componente SVG (`ProduccionHistoricaBarsSvg`) maneja `bars` y `area`, conmutando solo el branch de producción (rect por punto vs. path suave) y dejando OEE, ejes, grid y ping idénticos. | Dos componentes hermanos (`ProduccionHistoricaBarsSvg` + `ProduccionHistoricaAreaSvg`). | Garantiza paridad visual exacta entre modos —el defecto 4 vino justamente de tener dos pipelines distintos para OEE—, evita duplicar cálculo de dominios y reduce superficie de bug. |
| 3 | `generateHistoricalSeries(bucket, now)` vive como helper local del widget, no como utilidad reutilizable. | Mover a `hmi-app/src/utils/historicalSeriesGenerator.ts`. | El widget es el único consumidor; la generación incluye constantes específicas (`WINDOW_SIZE`, fórmulas correlacionadas) que no son aún un concepto de dominio. Documentado como "extract-if-reused" en la sección de deuda. |
| 4 | `useEffect` con dependencias `[bucket]` exclusivamente; `rawSeries` es `useState<TemporalTrendPoint[]>` que se setea una sola vez por bucket. | Mantener `useMemo([bucket])` o usar un timer. | El timer fue la causa raíz del rewind. `useMemo` cambiaría sincrónicamente y forzaría dependencias frágiles aguas abajo. `useState` + `useEffect` deja la regeneración explícita y predecible, sin cleanup más allá del default de React. |
| 5 | `animate-ping` mediante `<circle className="animate-ping" />` SVG con `style={{ transformOrigin: ${cx}px ${cy}px }}`. | (a) `setInterval` que mueve un radio. (b) Animación CSS keyframes custom. | El patrón está verificado funcionando en `TrendChartWidget.tsx` líneas 240–247 con `transformOrigin` explícito. Reutiliza la utility de Tailwind, no agrega keyframes nuevos al `index.css`, y mantiene el ping detenido en el SVG sin afectar layout. |
| 6 | `productionBarWidth` es un factor en `[0.5, 1.5]`; el clamp ocurre **dos veces**: en el renderer al resolver `barW = naturalBarW * clamp(factor, 0.5, 1.5)` y en el slider del dock con los mismos límites. | Confiar solo en el clamp del renderer. | Defensa en profundidad: el dock previene valores fuera de rango y el renderer protege contra dashboards persistidos antiguos o configuraciones manipuladas. Garantiza layout estable bajo cualquier entrada. |
| 7 | Fallback silencioso por eje cuando los manual scales son inválidos (`min` o `max` no numéricos, o `min >= max`). El otro eje no se ve afectado. | Mostrar UI de error o resaltar el campo en rojo. | Mínima sorpresa: el chart sigue visible y útil. La validación visible se puede agregar en un cambio futuro sin romper datos guardados. Cumple el contrato del spec (`Manual Scales with Silent Autoscale Fallback`). |
| 8 | `productionVariableKey` y `oeeVariableKey` se tipan en `displayOptions` y se editan en el dock cuando `binding.mode === 'real_variable'`, pero el renderer NO los consume en esta fase. | Posponer los campos hasta que exista cableado real. | El dock que pidió el usuario los necesita ahora; tipar ahora evita una migración futura del shape persistido. La deuda queda documentada como "renderer no consumer". |
| 9 | Las secciones de PropertyDock reutilizan `DockSection` existente; los campos específicos del widget se inyectan como sub-bloques type-guarded dentro de las secciones General y Visual ya existentes (Subtítulo bajo Título; Producción/OEE/Ancho dentro de Visual), y se agregan **nuevas** `DockSection`s solo para `Series`, `Escalas` y `Layout` que no tienen hogar natural. | Crear seis secciones nuevas independientes y/o reescribir el switch del dock. | Maximiza reutilización del primitive `DockSection`, minimiza la diferencia visual con otros tipos de widget, y mantiene el dock ordenado bajo el patrón actual de "branchear adentro de la sección" en vez de duplicar contenedores. |
| 10 | Excluir `produccion-historica` de las secciones genéricas `Ícono`, `Unidad` y del fallback `Datos` (incluyendo el `Valor` simulado) usando exactamente el mismo patrón que ya excluye `oee-production-trend` (lines 325, 369, 548). | Crear un mecanismo de exclusión centralizado. | Sigue el precedente literal del archivo. Centralizar las exclusiones excede el alcance de este cambio correctivo. |
| 11 | El slider de `Ancho de barra` es un `<input type="range">` nativo estilizado con clases utilitarias y tokens del `@theme {}`. | Crear un componente reutilizable `AdminSlider` en `components/admin/`. | No existe `AdminSlider` hoy y el correctivo no debe abrir un primitive nuevo. Usar el input nativo mantiene la superficie del cambio acotada y respeta los tokens via clases. |
| 12 | IDs de SVG únicos por instancia con prefijos exclusivos del widget: `prod-bar-grad-${id}`, `prod-area-grad-${id}`, `oee-grad-${id}`, `oee-clip-${id}`, `oee-glow-${id}`. | Reusar los prefijos de `oee-production-trend` (`bar-body-grad-${id}`, etc.). | Previene colisiones entre múltiples instancias del mismo widget Y entre `produccion-historica` y `oee-production-trend` cuando coexisten en el mismo dashboard (ambos `<defs>` viven en el DOM global). El prefijo `prod-bar-grad` no choca con `bar-body-grad`. |
| 13 | Eliminar Recharts (`ComposedChart`, `Bar`, `Line`, `Area`) por completo del widget. Toda la geometría se renderiza como SVG raw dentro del contenedor `ResizeObserver`. | Mantener Recharts y solo "tunear" estilos. | Recharts era la causa raíz de la apariencia plana: no permite cap luminoso, glow filter ni clip path consistente, y recalcula geometría con su propia heurística. SVG raw da control total y es exactamente lo que ya validó visualmente `oee-production-trend`. |

## 3. Data Flow Diagram

```
DashboardConfig (localStorage)
    │
    ▼
WidgetRenderer — case 'produccion-historica'
    │
    ▼
ProduccionHistoricaWidget
    │
    ├── useState<bucket>              ← in-widget pill selector
    ├── useState<showOee>             ← in-widget OEE eye toggle
    ├── useEffect([bucket])           ← generateHistoricalSeries(bucket, now)
    │     └── setRawSeries             (one shot, no interval, no append)
    │
    ├── groupByTemporalBucket(rawSeries, bucket)   ← utils/temporalGrouping.ts (UNCHANGED)
    │
    ├── resolveDomains(grouped, autoScale, manualBounds, showOee)
    │     └── silent per-axis fallback when manual is invalid
    │
    └── ProduccionHistoricaBarsContainer  (ResizeObserver wrapper)
          │
          └── ProduccionHistoricaBarsSvg   (raw SVG, single component)
                ├── <defs>
                │     ├── prod-bar-grad-${id}      (cuerpo de barra)
                │     ├── prod-area-grad-${id}     (relleno de área de producción)
                │     ├── oee-grad-${id}           (área OEE)
                │     ├── oee-clip-${id}           (clipPath del rect de plot)
                │     └── oee-glow-${id}           (filter Gaussian blur + merge)
                │
                ├── grid lines                       (only if showGrid)
                │
                ├── PRODUCTION BRANCH
                │     ├── productionMode === 'bars':
                │     │     ├── <rect> body por punto      (fill prod-bar-grad)
                │     │     ├── <rect> luminous top cap    (drop-shadow filter)
                │     │     └── <circle animate-ping> en bar top del último punto
                │     │
                │     └── productionMode === 'area':
                │           ├── <path d="..." fill="prod-area-grad"/>  (smooth filled)
                │           └── <circle animate-ping> en último punto del path
                │
                ├── OEE BRANCH                       (only if showOee)
                │     ├── <path> area con gradiente + clip          (oeeShowArea)
                │     ├── <path> línea spline con glow filter + clip
                │     ├── <circle> opcionales por punto              (oeeShowPoints)
                │     └── <circle animate-ping> en último punto OEE
                │
                ├── X labels (siempre)
                ├── Y left labels  (producción)
                └── Y right labels (solo si showOee && useSecondaryAxis)
```

## 4. File Changes

| File | Action | Description |
|------|--------|-------------|
| `hmi-app/src/domain/admin.types.ts` | Modify | Extender `ProduccionHistoricaDisplayOptions` con `subtitle?`, `productionAxisMin?`, `productionAxisMax?`, `oeeAxisMin?`, `oeeAxisMax?`, `productionVariableKey?`, `oeeVariableKey?`. Actualizar el docstring de `productionBarWidth` para describir el factor `[0.5, 1.5]` con default `1.0`. |
| `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx` | Rewrite | Eliminar imports y JSX de Recharts (`ComposedChart`, `Bar`, `Line`, `Area`). Agregar `ProduccionHistoricaBarsContainer` (wrapper `ResizeObserver`) y `ProduccionHistoricaBarsSvg` (port local de `BarsModeSvg` parametrizado por modo). Agregar `generateHistoricalSeries(bucket, now)` y `stepBackByBucket` como helpers locales. Reemplazar el `useEffect` con `setInterval` por uno con dependencias `[bucket]` que setea `rawSeries` una vez. Agregar `<circle className="animate-ping">` en el último punto de producción y, condicional a `showOee`, en el último punto OEE, ambos con `transformOrigin` explícito. Sub-render del subtítulo en el header. Aplicar `productionAxisMin/Max` y `oeeAxisMin/Max` con fallback silencioso. Clamp de `productionBarWidth` factor en el cómputo de `barW`. |
| `hmi-app/src/components/admin/PropertyDock.tsx` | Modify | Agregar `produccion-historica` a las exclusiones genéricas de `Ícono` (≈ línea 325), `Unidad` (≈ línea 369) y `Datos`/`Valor` (≈ línea 548) usando el patrón que ya excluye `oee-production-trend`. Inyectar dentro de la sección General el campo Subtítulo type-guarded por `type === 'produccion-historica'`. Inyectar dentro de la sección Visual los campos Producción Barras/Área, Mostrar relleno OEE, Mostrar puntos OEE y el slider Ancho de barra. Agregar tres `DockSection` nuevas type-guarded: Series (Mostrar OEE, Eje secundario), Escalas (Autoescala + cuatro inputs `AdminNumberInput` deshabilitados cuando `autoScale=true`) y Layout (Mostrar grilla). |

NO se tocan otros archivos. Específicamente NO se modifican: `OeeProductionTrendWidget.tsx`, `TrendChartWidget.tsx`, `trendDataGenerator.ts`, `temporalGrouping.ts`, `WidgetRenderer.tsx`, `WidgetCatalogRail.tsx`, `DashboardBuilderPage.tsx`, `index.css`, ni nada bajo `Directrices/`.

## 5. Interfaces / Contracts

### 5.1 Domain — `ProduccionHistoricaDisplayOptions` extendida

```ts
// hmi-app/src/domain/admin.types.ts
export interface ProduccionHistoricaDisplayOptions {
    // ── existentes ────────────────────────────────────────────────────────────
    sourceLabel?: string;
    productionLabel?: string;
    oeeLabel?: string;
    chartTitle?: string;
    productionChartMode?: ProductionChartMode;     // 'bars' | 'area'
    oeeChartMode?: 'line';
    useSecondaryAxis?: boolean;
    autoScale?: boolean;
    showGrid?: boolean;
    oeeShowArea?: boolean;
    oeeShowPoints?: boolean;
    /**
     * Factor multiplier in [0.5, 1.5], default 1.0.
     * Applied to the naturally computed bar width inside the SVG renderer.
     * Both the renderer and the dock slider clamp out-of-range values silently.
     * NOTE: previously used as an absolute pixel width — semantic changed in
     * `produccion-historica-fix`. Safe because no persisted dashboard exposed it.
     */
    productionBarWidth?: number;
    defaultTemporalGrouping?: TemporalBucket;
    defaultShowOee?: boolean;

    // ── nuevos en produccion-historica-fix ────────────────────────────────────
    /** Optional subtitle rendered below the title in muted header styling. */
    subtitle?: string;

    /** Manual lower bound for the production Y axis when autoScale=false. */
    productionAxisMin?: number;
    /** Manual upper bound for the production Y axis when autoScale=false. */
    productionAxisMax?: number;
    /** Manual lower bound for the OEE Y axis when autoScale=false. */
    oeeAxisMin?: number;
    /** Manual upper bound for the OEE Y axis when autoScale=false. */
    oeeAxisMax?: number;

    /**
     * Reserved: editable in the dock when binding.mode === 'real_variable',
     * but NOT consumed by the renderer in this phase. Renderer keeps using
     * the simulated historical series.
     */
    productionVariableKey?: string;
    /** Reserved: same contract as productionVariableKey. */
    oeeVariableKey?: string;
}
```

### 5.2 Local helper — `generateHistoricalSeries`

```ts
// Local inside ProduccionHistoricaWidget.tsx — NOT exported, NOT moved to utils.
const WINDOW_SIZE: Record<TemporalBucket, number> = {
    hour: 24,
    shift: 15,
    day: 14,
    month: 12,
};

function generateHistoricalSeries(
    bucket: TemporalBucket,
    reference: Date,
): TemporalTrendPoint[] {
    const total = WINDOW_SIZE[bucket];

    return Array.from({ length: total }, (_, index) => {
        const stepsFromNow = total - 1 - index;
        const timestamp    = stepBackByBucket(reference, bucket, stepsFromNow);

        const seasonal     = Math.sin((index / Math.max(total - 1, 1)) * Math.PI * 2);
        const microNoise   = Math.sin(index * 0.61) * 1.9;
        const trendDrift   = Math.cos(index * 0.27) * 0.8;

        const oee          = clamp(74 + seasonal * 8 + microNoise + trendDrift, 58, 93);
        const production   = Math.max(
            90,
            oee * 2.15 + 32 + seasonal * 9 + Math.cos(index * 0.35) * 11,
        );

        return {
            timestamp:  timestamp.toISOString(),
            production: round2(production),
            oee:        round2(oee),
        };
    });
}

function stepBackByBucket(now: Date, bucket: TemporalBucket, steps: number): Date {
    const date = new Date(now.getTime());
    switch (bucket) {
        case 'hour':  date.setHours(date.getHours() - steps); return date;
        case 'shift': date.setHours(date.getHours() - steps * 8); return date;
        case 'day':   date.setDate(date.getDate() - steps); return date;
        case 'month': date.setMonth(date.getMonth() - steps); return date;
    }
}

const clamp  = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round2 = (n: number) => Number(n.toFixed(2));
```

Effect contract:

```ts
useEffect(() => {
    setRawSeries(generateHistoricalSeries(bucket, new Date()));
}, [bucket]);
```

No `setInterval`, no append, no rewind, no cleanup beyond React defaults.

### 5.3 Container + SVG ports — structural signature

```ts
// Local inside ProduccionHistoricaWidget.tsx
interface ProduccionHistoricaBarsSvgProps {
    widgetId:           string;
    data:               TemporalGroupedPoint[];
    productionMode:     ProductionChartMode;        // 'bars' | 'area'
    showOee:            boolean;
    useSecondaryAxis:   boolean;
    showGrid:           boolean;
    oeeShowArea:        boolean;
    oeeShowPoints:      boolean;
    /** Already clamped to [0.5, 1.5] by the parent. */
    barWidthFactor:     number;
    productionDomain:   [number, number];
    oeeDomain:          [number, number];
    productionLabel:    string;
    oeeLabel:           string;
    width:              number;
    height:             number;
}

interface ProduccionHistoricaBarsContainerProps {
    data:             TemporalGroupedPoint[];
    widgetId:         string;
    productionMode:   ProductionChartMode;
    showOee:          boolean;
    useSecondaryAxis: boolean;
    showGrid:         boolean;
    oeeShowArea:      boolean;
    oeeShowPoints:    boolean;
    barWidthFactor:   number;
    productionDomain: [number, number];
    oeeDomain:        [number, number];
    productionLabel:  string;
    oeeLabel:         string;
}
```

The container measures via `ResizeObserver` (same shape as `BarsModeContainer` lines 247-269 in `OeeProductionTrendWidget.tsx`) and forwards `width`/`height` plus all props to the SVG component.

### 5.4 Renderer-level domain resolution

```ts
function resolveDomains(
    points: TemporalGroupedPoint[],
    autoScale: boolean,
    showOee: boolean,
    manualProdMin: number | undefined,
    manualProdMax: number | undefined,
    manualOeeMin:  number | undefined,
    manualOeeMax:  number | undefined,
): { productionDomain: [number, number]; oeeDomain: [number, number] } {
    // Each axis resolved independently:
    // 1. If autoScale === true → autoscale that axis.
    // 2. If autoScale === false AND both manual bounds are finite numbers
    //    AND min < max → use manual.
    // 3. Otherwise (any check fails) → silent fallback to autoscale for THAT
    //    axis only. The other axis is unaffected.
    // ...
}
```

## 6. Patterns Used

- **Discriminated union por `type`** sobre `WidgetConfig`, sin necesidad de tocar el dispatcher (`WidgetRenderer.tsx` ya tiene el `case` desde el cambio anterior).
- **Dispatcher centralizado** en `WidgetRenderer.tsx` (no se modifica).
- **Tokens CSS via `var(--color-*)` y `var(--font-chart)`** — cero hex, cero familias hardcodeadas; objeto `TOKEN` local sigue el patrón de `OeeProductionTrendWidget`.
- **SVG raw para visuales premium** — mismo lenguaje que `BarsModeSvg`: gradientes en `<defs>`, `clipPath` para recortar al rectángulo de plot, `<filter>` Gaussian blur + merge para el glow OEE, `drop-shadow` CSS sobre el cap luminoso.
- **`ResizeObserver` container pattern** — wrapper `<div>` con `useRef` + `ResizeObserver` que setea `dims` y dispara el re-render del SVG.
- **IDs de SVG únicos por instancia** derivados de `widget.id` para evitar colisiones globales en `<defs>`.
- **Conscious local duplication** con deuda documentada en sección 8.
- **Exclusion-based PropertyDock branching** siguiendo el precedente de `oee-production-trend` (lines 325, 369, 548).
- **Sub-bloques type-guarded dentro de `DockSection` reutilizable** en lugar de crear secciones nuevas para todo.
- **`animate-ping` SVG con `transformOrigin` explícito** copiado del patrón verificado en `TrendChartWidget.tsx` (lines 240-247).

## 7. Testing Strategy

| Layer | Qué se valida | Cómo |
|-------|---------------|------|
| Strict typing | Tipado del nuevo shape de `ProduccionHistoricaDisplayOptions`, props del SVG y narrowing del dock | `tsc --noEmit` (no `npm run build` per project rule) |
| Visual parity | Bars mode visualmente equivalente al de `oee-production-trend`; area mode comparte glow y spline OEE | Comparación lado a lado en el dashboard builder con un widget de cada tipo |
| Bucket switching | El cambio de bucket regenera la ventana completa una vez, sin rewind ni interval | Manual: alternar Hora/Turno/Día/Mes y observar |
| OEE toggle | Hide completo: línea, área, glow, ping, eje derecho, labels | Manual: clic en el botón Eye/EyeOff dentro del widget |
| PropertyDock controls | Cada sección dedicada renderiza, los manual scales se deshabilitan con `autoScale=true`, los variable keys aparecen solo en `real_variable` mode | Manual: seleccionar el widget en el builder y recorrer todos los controles |
| Multi-instance ID isolation | Dos instancias del mismo widget en el mismo dashboard renderizan sus gradientes sin colisión | Manual: agregar dos `produccion-historica` y verificar visualmente |
| Coexistencia con `oee-production-trend` | Ambos widgets renderizan correctamente en el mismo dashboard | Manual: agregar uno de cada tipo y verificar |

No hay infraestructura de tests automatizados para renderers en esta iteración del proyecto.

## 8. Technical Debt

- **Duplicación SVG**: `BarsModeSvg` (en `OeeProductionTrendWidget.tsx`) y `ProduccionHistoricaBarsSvg` (en `ProduccionHistoricaWidget.tsx`) son hermanos casi idénticos. Cuando aparezca un tercer consumidor, extraer a `widgets/_shared/HistoricalBarsSvg.tsx` con un contrato genérico.
- **`generateHistoricalSeries` colocado**: el helper vive dentro del archivo del widget porque hoy es su único consumidor. Reglamentar como "extract-if-reused" en el momento que aparezca un segundo consumidor.
- **Variables reales tipadas pero no consumidas**: `productionVariableKey` y `oeeVariableKey` se persisten desde el dock pero el renderer sigue mostrando datos simulados. Cuando exista backend de time-series, conectar via `services/` → `queries/`.
- **Fallback silencioso de manual scales**: la UX no avisa al usuario cuando un manual scale fue ignorado por inválido. Un cambio futuro puede agregar feedback visible (tooltip o borde de input warning).
- **Cambio de semántica de `productionBarWidth`** (de píxeles absolutos a factor): seguro hoy porque el campo no estaba expuesto en el dock anterior, pero rompería cualquier dashboard hipotético que lo hubiera persistido como pixel value (no existen).
- **Slider nativo**: el `Ancho de barra` es un `<input type="range">` sin envolver en un componente reutilizable. Cuando aparezca un segundo control de slider en el admin, abstraer como `AdminSlider`.
- **Colocación del helper de stepping**: `stepBackByBucket` es esencialmente lo mismo que `moveDateByBucket` actual. Se reutiliza la misma fórmula con un nombre más descriptivo, pero no se mueve a `temporalGrouping.ts` porque es una decisión vinculante del cambio.

## 9. Migration / Rollout

- **Cambio aditivo al tipo de dominio**: todos los nuevos campos de `ProduccionHistoricaDisplayOptions` son opcionales (`?`). Dashboards existentes rehidratan sin error.
- **Cambio semántico de `productionBarWidth`**: pasa de pixels absolutos (default `16`) a factor `[0.5, 1.5]` (default `1.0`). Es seguro porque ningún dashboard hoy tiene este campo expuesto en el dock — el campo existía en el tipo pero no era editable. Si por alguna razón un dashboard persistió un valor numérico antiguo (ej. `16`), el clamp en el renderer lo trataría como factor `1.5` (el máximo), lo cual produce barras anchas pero válidas. No requiere migración de datos.
- **`oee-production-trend` no se toca**: dashboards con instancias de ese widget siguen funcionando idénticamente.
- **PropertyDock**: las exclusiones genéricas no afectan a otros tipos de widget; solo agregan a `produccion-historica` al mismo conjunto que ya excluye `oee-production-trend`.
- **Sin feature flag**: el rollout es directo via merge.

## 10. Open Questions

- [ ] ¿El `Ancho de barra` debe mostrar el valor numérico actual al lado del slider, o solo el slider? Default razonable: mostrar el factor con dos decimales (ej. `1.00`).
- [ ] ¿`stepBackByBucket` debería ser `case 'shift'` con `steps * 8` horas o con un cambio de fecha más sofisticado (ej. truncar a inicio de turno)? La fórmula actual hereda el comportamiento del archivo broken; el spec no exige más.
- [ ] ¿El último punto de producción en modo `area` debe pulsar sobre el path final o sobre un círculo dibujado en el último vértice? Recomendación de implementación: dibujar `<circle>` en el último vértice del path (consistente con bars mode y con `TrendChartWidget`).
