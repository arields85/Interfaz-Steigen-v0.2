## Verification Report

**Change**: produccion-historica
**Mode**: Standard
**Date**: 2026-04-08

### 1. Overall verdict

**PASS WITH WARNINGS**

La implementación cumple el alcance funcional acordado en código y pasó verificación estática con `npx tsc --noEmit`. Quedan advertencias de confianza: no encontré `apply-progress`, no hay tests automatizados para este cambio, y la verificación manual/visual sigue pendiente en `tasks.md`.

### 2. Requirement coverage

| Requirement | Status | Evidence |
|---|---|---|
| Widget type registration | ✅ | `hmi-app/src/domain/admin.types.ts` agrega `produccion-historica` a `WidgetType`, lo excluye de `GenericWidgetConfig` y lo incluye en `WidgetConfig`; `hmi-app/src/widgets/WidgetRenderer.tsx`, `hmi-app/src/components/admin/WidgetCatalogRail.tsx` y `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` lo registran en dispatcher/catálogo/builder. |
| Default presentation | ✅ | `DashboardBuilderPage.tsx:429-451` crea el widget con título `Producción Histórica`, `Simulado`, `bars`, OEE visible, eje secundario, autoscale/grid ON, fill/points OFF y `hour`. `ProduccionHistoricaWidget.tsx:206-220` resuelve los mismos defaults al render. |
| In-widget temporal range selector | ✅ | `ProduccionHistoricaWidget.tsx:219, 288-303` usa `useState` local para `bucket`, renderiza pills `Hora/Turno/Día/Mes`, resalta activo con clases `accent-cyan`, y el `useEffect` dependiente de `bucket` reinicia la simulación. |
| In-widget OEE toggle | ✅ | `ProduccionHistoricaWidget.tsx:220, 305-315` usa `useState` local para `showOee`, inicializado desde `displayOptions.defaultShowOee`. |
| Hide OEE only / production remains visible | ✅ | `ProduccionHistoricaWidget.tsx:325-330, 367-377, 416-440` condiciona leyenda, eje secundario, área/línea OEE y tooltip OEE a `showOee`; la serie de producción siempre se renderiza en `390-414`. |
| Temporal grouping logic | ✅ | `hmi-app/src/utils/temporalGrouping.ts` es util pura; codifica T1/T2/T3 en `59-81`, día operacional `06:00-06:00` en `36-47`, semana operacional lunes en `49-57`, y labels `Lun / Turno 3` por día de inicio en `121-159`. |
| Local simulation stream | ✅ | `ProduccionHistoricaWidget.tsx:223-246` implementa `setInterval` local, regenera relativo a `now` vía `buildSimulatedSeries`, limpia en unmount y reinicia al cambiar `bucket`. |
| Dual axis rendering | ✅ | `ProduccionHistoricaWidget.tsx:152-196` calcula dominios por serie visible; `358-377` renderiza eje primario para producción y secundario opcional para OEE. |
| Production chart mode | ✅ | `ProduccionHistoricaWidget.tsx:211, 390-414` soporta `bars | area`; `DashboardBuilderPage.tsx:442` crea nuevas instancias en `bars`. |
| OEE chart mode | ✅ | `ProduccionHistoricaWidget.tsx:215-216, 416-440` deja OEE como línea, con área y puntos opcionales default OFF. |
| Visual system compliance | ✅ | `ProduccionHistoricaWidget.tsx` usa `glass-panel`, iconos Lucide (`History`, `Eye`, `EyeOff`), tokens `var(--color-...)`, sin hex ni nombres de fuente hardcodeados, y gradientes únicos `prod-grad-${widget.id}` / `oee-grad-${widget.id}` en `258-259, 337-344`. |
| Isolation from base widget | ✅ | `ProduccionHistoricaWidget.tsx` no importa `oee-production-trend` ni `trend-chart`; `WidgetRenderer.tsx:114-132` mantiene ambos casos coexistiendo. |
| Read-only contract | ✅ | No hay servicios, mutaciones HTTP ni acciones de planta en los archivos modificados; el widget sólo modifica estado local React (`bucket`, `showOee`, `rawSeries`). |
| Calendar month vs operational month consistency | ✅ | `temporalGrouping.ts:89-92` implementa mes calendario anclado al día operacional. Esto está documentado explícitamente como deuda/decisión en `openspec/changes/produccion-historica/design.md:108-110`. |

### 3. Task checklist coverage

| Task | Status | Notes |
|---|---|---|
| 1.1 Domain defaults/contracts | ✅ | `admin.types.ts` actualizado. |
| 1.2 Union registration | ✅ | `WidgetType`, `GenericWidgetConfig`, `WidgetConfig` actualizados. |
| 2.1 Temporal utility created | ✅ | `utils/temporalGrouping.ts` creado. |
| 2.2 Operational anchors | ✅ | Turnos, día operacional y lunes operacional implementados. |
| 2.3 Label formatting | ✅ | Labels de turno/día/mes implementados. |
| 3.1 Isolated renderer created | ✅ | `ProduccionHistoricaWidget.tsx` separado. |
| 3.2 Header strategy resolved | ✅ | Header manual documentado inline en `273-274`. |
| 3.3 Local ephemeral state | ✅ | `bucket` y `showOee` con `useState`. |
| 3.4 Pill selector | ✅ | Selector inline con token accent-cyan. |
| 3.5 Isolated simulation loop | ✅ | `setInterval` local con cleanup/reset por bucket. |
| 3.6 Production/OEE render modes | ✅ | Producción `bars|area`; OEE line-only + flags. |
| 3.7 OEE OFF removes all OEE visuals | ✅ | Serie/eje/leyenda/tooltip condicionados por `showOee`. |
| 3.8 Instance-safe SVG IDs | ✅ | IDs por `widget.id`. |
| 4.1 Renderer registration | ✅ | `WidgetRenderer.tsx`. |
| 4.2 Catalog registration | ✅ | `WidgetCatalogRail.tsx`. |
| 4.3 Builder defaults | ✅ | `DashboardBuilderPage.tsx`. |
| 4.4 Manual verification | ⚠️ Pending | Sigue sin marcarse en `openspec/changes/produccion-historica/tasks.md:30`. |

### 4. Findings

#### CRITICAL

None.

#### WARNING

- No encontré el artefacto `sdd/produccion-historica/apply-progress` solicitado. La verificación se basó en spec/design/tasks, inspección del código y ejecución local de `npx tsc --noEmit`.
- La verificación manual/visual sigue pendiente (`openspec/changes/produccion-historica/tasks.md:30`). Por eso no puedo afirmar con certeza observacional en navegador el rebucketing visible, el reset perceptible de la simulación, la desaparición visual del eje/tooltip/leyenda OEE ni la no colisión de gradientes entre dos instancias.
- No existe runner de tests ni tests automatizados para este cambio. En `hmi-app/package.json` no hay script `test`, y no encontré archivos `*.test.*`/`*.spec.*` en `hmi-app/src`.

#### SUGGESTION

- Agregar tests unitarios para `hmi-app/src/utils/temporalGrouping.ts` con bordes `05:59`, `06:00`, `21:59`, `22:00` y caso `Lun / Turno 3`.
- Cuando el proyecto incorpore runner de tests, sumar una prueba de integración para alta desde catálogo + dispatch en `WidgetRenderer`.
- Si negocio define “mes operacional” formal, reemplazar o explicitar mejor la semántica actual de mes calendario anclado al día operacional.

### 5. Evidence

- `hmi-app/src/domain/admin.types.ts:115-123, 311-345, 396-441` — nuevo tipo, contratos tipados y unión discriminada.
- `hmi-app/src/utils/temporalGrouping.ts:36-57, 59-81, 121-159, 181-231` — lógica pura de bucketización operacional y labels.
- `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:219-246` — estado local y simulación/reset por bucket.
- `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:288-315` — selector temporal y toggle OEE dentro del widget, no en `PropertyDock`.
- `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:325-440` — ocultamiento total de elementos OEE y persistencia de producción.
- `hmi-app/src/widgets/renderers/ProduccionHistoricaWidget.tsx:258-259, 337-344` — gradientes únicos por instancia.
- `hmi-app/src/widgets/WidgetRenderer.tsx:124-132` — dispatcher dedicado.
- `hmi-app/src/components/admin/WidgetCatalogRail.tsx:15-25` — catálogo insertable con icono Lucide.
- `hmi-app/src/pages/admin/DashboardBuilderPage.tsx:401-452` — creación desde builder con defaults del spec.
- `openspec/changes/produccion-historica/design.md:108-110` — documentación consistente de la deuda sobre mes calendario vs mes operacional.
- `hmi-app/package.json:6-11` — sin script de tests.

### Execution notes

- Type check ejecutado: `npx tsc --noEmit` en `hmi-app/` → **Passed**.
