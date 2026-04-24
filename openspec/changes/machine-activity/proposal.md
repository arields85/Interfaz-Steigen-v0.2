# Proposal: Actividad de Máquina

## Problem Statement

El HMI hoy puede mostrar potencia como KPI, pero no traducirla a un estado productivo legible. Operación necesita un widget read-only que infiera Detenida/Calibrando/Produciendo desde kW, estabilice ruido y conserve identidad propia.

## Proposed Solution

Crear `machine-activity` como widget nuevo, reutilizando shell KPI (`glass-panel`, `WidgetHeader`, binding Node-RED/simulado) y extrayendo un primitive compartido de gauge para radial/bar. El widget resolverá potencia, aplicará promedio móvil + confirmación mínima + histéresis, calculará índice 0-100 y renderizará gauge radial, estado actual y potencia real.

## Scope

### In Scope
- Nuevo tipo `machine-activity` con renderer propio y defaults de builder.
- Clonado completo de secciones General + Datos del KPI.
- Nuevas secciones: Estados Productivos, Escala Visual, Visualización, Textos.
- Primitive compartido de gauge consumido por KPI y machine-activity.
- Lógica read-only para smoothing, histéresis, invalid data y activity index.

### Out of Scope
- Control de planta, acciones write o setpoints.
- Soporte header widget.
- Nuevos modos de binding, jerarquía o catálogo variable.

## Capabilities

### New Capabilities
- `machine-activity-widget`: inferir estado productivo desde potencia y mostrar índice/estado estabilizados.

### Modified Capabilities
- None.

## Architecture

Jerarquía: `MachineActivityWidget -> resolveBinding -> machineActivity resolver/helpers -> GaugeDisplay -> WidgetHeader/footer`.

## Key Decisions

- **Gauge extraction**: mover gauge radial y barra de KPI a un primitive compartido (`mode`, `value`, `color`, `animation`) antes de implementar el widget.
- **State machine**: estados Detenida/Calibrando/Produciendo con umbrales editables y retorno con histéresis para evitar flicker.
- **Smoothing**: promedio móvil configurable sobre potencia numérica; cambio de estado confirmado solo tras tiempo mínimo continuo.

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Regresión visual en KPI por extracción | Med | Refactor mínimo + tests del primitive/gauge math |
| Flicker o estados inconsistentes | Med | Resolver puro con tests TDD para thresholds/histéresis/tiempos |
| Duplicar UX de propiedades | Low | Reusar ramas KPI existentes para General y Datos |

## Dependencies

- Extraer `GaugeDisplay` antes de crear `MachineActivityWidget`.
- Definir contrato tipado en `admin.types.ts` antes de tocar renderer y PropertyDock.

## Rollback Plan

Revertir `machine-activity` del catálogo/renderer/types y restaurar `KpiWidget` al gauge inline previo si la extracción rompe compatibilidad visual.

## Success Criteria

- [ ] El builder permite crear/configurar `machine-activity` con General+Datos idénticos a KPI.
- [ ] El widget muestra Sin datos seguro ante valores inválidos y nunca rompe render.
- [ ] KPI y machine-activity comparten el primitive de gauge sin duplicación mayor.

## Affected Files

| File | Action | Description |
|------|--------|-------------|
| `openspec/changes/machine-activity/proposal.md` | Create | Propuesta del cambio |
| `hmi-app/src/domain/admin.types.ts` | Modify | Nuevo `WidgetType`, config y `displayOptions` |
| `hmi-app/src/widgets/WidgetRenderer.tsx` | Modify | Registrar renderer |
| `hmi-app/src/widgets/renderers/KpiWidget.tsx` | Modify | Consumir primitive compartido |
| `hmi-app/src/widgets/renderers/MachineActivityWidget.tsx` | Create | Renderer específico |
| `hmi-app/src/widgets/components/GaugeDisplay.tsx` | Create | Primitive radial/bar compartido |
| `hmi-app/src/widgets/utils/machineActivity.ts` | Create | Índice, smoothing e histéresis |
| `hmi-app/src/widgets/utils/machineActivity.test.ts` | Create | TDD lógica pura |
| `hmi-app/src/components/admin/PropertyDock.tsx` | Modify | Secciones KPI clonadas + nuevas secciones |
| `hmi-app/src/components/admin/WidgetCatalogRail.tsx` | Modify | Entrada del catálogo |
| `hmi-app/src/pages/admin/DashboardBuilderPage.tsx` | Modify | Defaults de creación/tamaño |
| `hmi-app/src/utils/widgetCapabilities.ts` | Modify | `catalogVariable: false`, `hierarchy: false` |
