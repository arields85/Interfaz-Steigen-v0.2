# Convención de creación de widgets

> Esta guía existe para que **todo widget nuevo** salga consistente con el sistema actual desde el día 1.

## Objetivo

Todo widget nuevo debe:
- verse consistente en grid y header
- reutilizar primitives compartidos
- respetar `subtitle` vs `subtext`
- integrarse al builder sin affordances paralelas

## Checklist obligatorio

### Shell visual
- Usar `glass-panel` como superficie base del widget.
- No inventar otro radio ni otra materialidad.
- No hardcodear colores ni fuentes.

### Header
- Si el widget tiene encabezado, usar `components/ui/WidgetHeader.tsx`.
- `subtitle` = texto secundario del header.
- `subtext` = texto inferior/footer del widget.
- Usar `WidgetHeader` con alineación estándar (default). No pasar `alignment` salvo excepción justificada.
- No usar wrappers con `-translate-y-*` alrededor del header ni offsets ad-hoc por renderer.
- No duplicar la lógica de header dentro del renderer.

### Layout (elegir patrón explícito)
- **Patrón A — flujo natural (`header + body + footer`)**:
  - Usar cuando el contenido debe empezar debajo del header.
  - Ejemplo: listas, tablas, charts con eje temporal, layouts con footer fijo.
- **Patrón B — centrado óptico en superficie completa**:
  - Usar cuando el contenido principal debe quedar centrado respecto de TODO el widget (alto/ancho completos), no del espacio restante bajo el header.
  - Usar `components/ui/WidgetCenteredContentLayout.tsx`.
  - Ejemplo típico: indicador central (badge/estado/gauge puntual) con header informativo arriba.

### Acciones y selección
- El widget en grid debe convivir con:
  - `GridSelectionFrame`
  - `WidgetHoverActions`
- Si el widget puede ir al header, debe convivir con:
  - `HeaderSelectionFrame`
  - `HeaderWidgetCanvas`
- No crear overlays, focus rings ni botones hover propios.

### Integración
- Registrar el renderer en `widgets/WidgetRenderer.tsx`.
- Tipar `displayOptions` en `domain/admin.types.ts`.
- Si el widget tiene propiedades configurables, exponerlas en:
  - `components/admin/PropertiesPanel.tsx`
  - `components/admin/PropertyDock.tsx`
- Si aplica al header, declarar explícitamente su compatibilidad con las reglas del header.

### Diseño y semántica
- Usar tokens de `index.css`.
- Usar solo íconos de Lucide React.
- Mantener separados:
  - `EquipmentStatus`
  - `ConnectionState`
  - `MetricStatus`

## Prohibido

- Inventar un header custom si `WidgetHeader` resuelve el caso.
- Crear un focus frame específico del widget.
- Crear acciones hover específicas del widget si `WidgetHoverActions` cubre el patrón.
- Mezclar `subtitle` con `subtext`.
- Duplicar tipos fuera de `domain/`.
- Resolver centrado óptico con hacks ad-hoc por widget cuando existe `WidgetCenteredContentLayout`.
- Resolver alineación vertical de header no-KPI con wrappers locales u offsets mágicos.
- Aplicar parches globales para corregir un problema local del widget.
- Hardcodear copy de estados cuando ese copy deba ser configurable vía `displayOptions`.

## Regla de ownership de layout (anti-parche)

- Si un ajuste visual afecta solo un bloque (ej. título+estado), centrar/espaciar **ese bloque interno**, no todo el contenedor del card.
- Si el problema es de jerarquía de composición, resolverlo en la primitive responsable (`WidgetHeader`, `WidgetCenteredContentLayout`, `HeaderWidgetCanvas`, etc.), no con offsets arbitrarios en capas superiores.
- Priorizar cambios locales, semánticos y reversibles sobre workarounds globales.

## Flujo recomendado

1. Copiar el template base `/.agent/skills/interfaz-widget/assets/NewWidgetTemplate.tsx`
2. Adaptar el contenido del renderer
3. Tipar `displayOptions`
4. Registrar el renderer en `WidgetRenderer.tsx`
5. Exponer propiedades en admin si corresponde
6. Verificar visualmente grid + header si aplica

## Primitives canónicas

- `hmi-app/src/components/ui/WidgetHeader.tsx`
- `hmi-app/src/components/ui/WidgetCenteredContentLayout.tsx`
- `hmi-app/src/components/ui/WidgetHoverActions.tsx`
- `hmi-app/src/components/ui/GridSelectionFrame.tsx`
- `hmi-app/src/components/ui/HeaderSelectionFrame.tsx`
- `hmi-app/src/components/ui/AnchoredOverlay.tsx` — menús flotantes / dropdowns / popovers
- `hmi-app/src/widgets/WidgetRenderer.tsx`

## Menús flotantes / overlays contextuales

**Regla**: Todo menú desplegable, dropdown o popover anclado a un elemento debe usar `AnchoredOverlay`.

`AnchoredOverlay` encapsula:
- `createPortal` → escapa cualquier `overflow:hidden` o stacking context
- Posicionamiento `fixed` inteligente (arriba/abajo según espacio disponible)
- Cierre por click afuera y por `Escape`

**Prohibido** reimplementar portal + posicionamiento ad-hoc fuera de esta primitive.

```tsx
// Uso canónico:
<AnchoredOverlay
    triggerRef={myButtonRef}   // RefObject<HTMLElement>
    isOpen={open}
    onClose={() => setOpen(false)}
    estimatedHeight={180}      // altura estimada del contenido
    minWidth={200}             // o 'trigger' para heredar ancho del anchor
    align="start"              // 'start' | 'end' | 'center'
    gap={4}
>
    <div style={{ background: 'var(--color-industrial-surface)' }}>
        {/* contenido del overlay */}
    </div>
</AnchoredOverlay>
```

Componentes que ya usan esta primitive:
- `AdminSelect` — dropdown de opciones en panel admin
- `HeaderSlotContextMenu` — menú del `+` en el canvas de header
