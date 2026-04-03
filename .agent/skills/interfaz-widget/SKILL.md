---
name: interfaz-widget
description: >
  Crea widgets nuevos para Interfaz-Laboratorio reutilizando el sistema visual y estructural existente.
  Trigger: cuando se agregue un widget nuevo, un renderer nuevo, un widget del dashboard o una variante de widget.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Cuando se cree un widget nuevo en `hmi-app/src/widgets/renderers/`
- Cuando se agregue un tipo nuevo al dashboard builder
- Cuando un widget deba soportar grid, header o ambos

## Critical Patterns

- Usar `glass-panel` como shell visual base.
- Si el widget tiene encabezado, usar `hmi-app/src/components/ui/WidgetHeader.tsx`.
- `subtitle` = header, `subtext` = footer. Nunca mezclar.
- No crear focus rings ni hover actions custom; reutilizar primitives del sistema.
- Registrar el renderer en `hmi-app/src/widgets/WidgetRenderer.tsx`.
- Tipar `displayOptions` en `hmi-app/src/domain/admin.types.ts`.
- Exponer configuración en admin solo si tiene sentido para ese tipo de widget.
- No hardcodear colores ni fuentes; usar tokens de `hmi-app/src/index.css`.
- Solo Lucide React para íconos.

## Decision Table

| Necesidad | Patrón correcto |
|---|---|
| Header de widget | `WidgetHeader` |
| Acciones hover en grid/header | `WidgetHoverActions` |
| Foco en grid | `GridSelectionFrame` |
| Foco en header | `HeaderSelectionFrame` |
| Dispatcher del renderer | `WidgetRenderer.tsx` |
| Template base | `assets/NewWidgetTemplate.tsx` |

## Code Examples

```tsx
import WidgetHeader from '../../../hmi-app/src/components/ui/WidgetHeader';

// El widget real debe seguir el template del asset.
```

## Commands

```bash
# Registrar el renderer nuevo
# 1. Crear archivo en hmi-app/src/widgets/renderers/
# 2. Actualizar hmi-app/src/widgets/WidgetRenderer.tsx
# 3. Actualizar hmi-app/src/domain/admin.types.ts
```

## Resources

- **Template**: See [assets/NewWidgetTemplate.tsx](assets/NewWidgetTemplate.tsx)
- **Documentation**: See [references/widget-authoring.md](references/widget-authoring.md)
