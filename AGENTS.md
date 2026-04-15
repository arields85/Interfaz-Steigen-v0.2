# AGENTS.md — Interfaz-Laboratorio

> Guía de contexto para agentes de IA y desarrolladores. Leela completa antes de tocar código.

---

## 1. Identidad del Proyecto

**Interfaz-Laboratorio** es una interfaz HMI (Human-Machine Interface) industrial de visualización de datos en tiempo real. Está pensada como una base escalable para laboratorios en general, no como una interfaz cerrada para un único caso como Steigen.

- La aplicación vive en `hmi-app/` (es un proyecto Vite independiente dentro del monorepo).
- El código fuente está en `hmi-app/src/`.
- La raíz del repositorio contiene solo configuración, documentación y el subdirectorio `hmi-app/`.

---

## 2. Restricciones Críticas — SISTEMA DE SOLO LECTURA

> ⚠️ **ESTA APLICACIÓN ES ESTRICTAMENTE DE SOLO LECTURA.**

**Prohibido absolutamente:**
- Botones de acción que envíen comandos a la planta
- Setpoints, actuadores o cualquier escritura hacia el proceso industrial
- Formularios de control operativo
- Llamadas HTTP de tipo POST/PUT/DELETE hacia sistemas de control

**Permitido:**
- Visualización de telemetría, métricas y estados
- Navegación entre vistas
- Configuración de la propia interfaz (admin mode — ver sección 8)

Si un stakeholder pide "agregar un botón para arrancar el motor", la respuesta es **NO**. Ese requerimiento está fuera del alcance por diseño.

---

## 3. Stack Técnico

| Tecnología       | Versión | Rol                                      |
|------------------|---------|------------------------------------------|
| React            | 19      | UI framework                             |
| TypeScript       | 5.9     | Tipado estricto                          |
| Vite             | 7       | Build tool y dev server                  |
| Tailwind CSS     | v4      | Estilos utilitarios + sistema de tokens  |
| Zustand          | 5       | Estado global del cliente                |
| TanStack Query   | 5       | Estado async / datos del servidor        |

---

## 4. Arquitectura

### Flujo de datos

```
Fuente externa → service → adapter → domain model → query/store → componente UI
```

1. **`services/`** — acceso a datos (HTTP, localStorage, mocks)
2. **`adapters/`** — transforman datos crudos al modelo de dominio
3. **`domain/`** — tipos canónicos del negocio (la única fuente de verdad de tipos)
4. **`queries/`** — hooks TanStack Query (datos async y caché)
5. **`store/`** — Zustand (estado UI puramente del cliente)
6. **`components/` / `pages/`** — consumen el estado, no lo producen

### Separación de estado

| Tipo                  | Herramienta      | Ejemplos                                  |
|-----------------------|------------------|-------------------------------------------|
| Datos del servidor    | TanStack Query   | Lista de equipos, telemetría, alertas     |
| Estado UI del cliente | Zustand          | Panel abierto/cerrado, selección activa   |

### Tres tipos de estado ortogonales

- **`EquipmentStatus`** — estado operativo del equipo (running, stopped, maintenance…)
- **`ConnectionState`** — estado del enlace de datos (connected, disconnected, degraded…)
- **`MetricStatus`** — umbral de la métrica (normal, warning, critical)

Estos tres tipos son **independientes** y no deben mezclarse ni colapsarse en uno solo.

### Catálogo de Variables

- El catálogo de variables centraliza identidades semánticas compartidas via `CatalogVariable { id, name, unit, description? }`.
- Su objetivo es que la agregación jerárquica matchee por identidad de variable y no solo por coincidencia de unidad.
- En `WidgetBinding`, `catalogVariableId` reemplaza a `variableKey` como identidad canónica para matching jerárquico.
- Flujo de referencia: `VariableCatalogStorageService → PropertyDock → widget.binding.catalogVariableId → hierarchyResolver`.
- La variable es **obligatoria** cuando el catálogo ya tiene entradas para esa unidad; esto evita errores de configuración a escala.
- La variable es independiente del modo jerárquico: también debe definirse correctamente en widgets hijos para que el matching del padre sea confiable.

### Sistema de Capacidades por Widget

- `utils/widgetCapabilities.ts` es el registro central de qué soporta cada tipo de widget.
- Capacidades actuales:
  - `catalogVariable` — el widget puede asociarse a una variable del catálogo.
  - `hierarchy` — el widget puede agregar valores desde hijos jerárquicos.
- `PropertyDock` y `DashboardBuilderPage` consumen este registro para decidir qué campos mostrar, habilitar y validar.
- Para habilitar capacidades en un widget nuevo, cambiar **una sola línea** en `widgetCapabilities.ts`.

---

## 5. Estructura de Archivos

```
hmi-app/src/
├── app/                    # Providers globales y configuración de router
│   ├── providers.tsx
│   └── router.tsx
├── domain/                 # Tipos canónicos del dominio (fuente de verdad)
│   ├── equipment.types.ts
│   ├── alert.types.ts
│   ├── telemetry.types.ts
│   ├── widget.types.ts
│   ├── admin.types.ts
│   ├── assistant.types.ts
│   └── variableCatalog.types.ts
├── adapters/               # Transforman datos externos al modelo de dominio
│   ├── equipment.adapter.ts
│   └── alert.adapter.ts
├── services/               # Acceso a datos (HTTP, localStorage, mocks)
│   ├── equipment.service.ts
│   ├── alert.service.ts
│   ├── DashboardStorageService.ts
│   ├── HierarchyStorageService.ts
│   ├── TemplateStorageService.ts
│   └── VariableCatalogStorageService.ts
├── queries/                # Hooks TanStack Query
│   ├── useEquipmentList.ts
│   ├── useEquipmentDetail.ts
│   └── useAlerts.ts
├── store/                  # Estado global Zustand
│   └── ui.store.ts
├── mocks/                  # Datos mock para desarrollo
│   ├── equipment.mock.ts
│   ├── alerts.mock.ts
│   ├── telemetry.mock.ts
│   ├── admin.mock.ts
│   ├── hierarchy.mock.ts
│   ├── template.mock.ts
│   └── variableCatalog.mock.ts
├── pages/                  # Composiciones de página (viewer + admin)
│   ├── Dashboard.tsx
│   ├── EquipmentDetail.tsx
│   ├── AlertsPage.tsx
│   ├── TrendsPage.tsx
│   └── admin/
├── components/             # Componentes reutilizables
│   ├── ui/                 # Base UI (átomos)
│   ├── layout/             # Componentes de layout
│   ├── charts/             # Visualizaciones
│   ├── viewer/             # Componentes específicos del viewer
│   ├── admin/              # Componentes del modo admin
│   │   ├── CatalogVariableSelector.tsx
│   │   └── DockInfoBox.tsx
│   ├── Sidebar.tsx
│   └── Topbar.tsx
├── widgets/                # Sistema de widgets del dashboard builder
│   ├── renderers/          # Componentes de renderizado por tipo de widget
│   ├── resolvers/          # Lógica de resolución de datos por widget
│   └── WidgetRenderer.tsx
├── layouts/                # Layouts de página
│   ├── MainLayout.tsx      # Viewer principal
│   └── AdminLayout.tsx     # Modo administrador
├── styles/                 # Estilos globales adicionales
├── assets/                 # Recursos estáticos
├── utils/                  # Utilidades puras
│   ├── catalogMigration.ts
│   └── widgetCapabilities.ts
├── index.css               # @theme {} de Tailwind v4 — tokens del sistema de diseño
├── App.tsx
└── main.tsx
```

> Nota: `components/admin/TemplateBadge.tsx` fue eliminado. El badge canónico de template vive en `AdminTag`.

---

## 6. Convenciones de Código

- **TypeScript estricto**: `strict: true` en tsconfig. **Cero `any`** sin justificación documentada.
- **Tipos en `domain/`**: Los tipos de negocio viven exclusivamente ahí. Nunca duplicar tipos inline en componentes.
- **Niveles de componentes** (de más genérico a más específico):
  1. `components/ui/` — Base UI reutilizable (átomos sin lógica de dominio)
  2. `components/viewer/` o `components/admin/` — Componentes industriales de dominio compartido
  3. `widgets/` — Composites de métricas y datos
  4. `pages/` — Composiciones de página, no reutilizables
- **Exports de barrel** via `index.ts` en los módulos que lo requieran.
- **Hooks custom** para lógica compleja en componentes. No lógica async directa en componentes.
- Los servicios de almacenamiento admin usan `localStorage` como capa mock; no asumir persistencia real.
- Para matching jerárquico, `catalogVariableId` reemplaza a `variableKey` como identidad canónica del binding.
- Las capacidades por tipo de widget se registran en `hmi-app/src/utils/widgetCapabilities.ts`; no hardcodear reglas dispersas por widget.

### Política anti-parches (obligatoria)

- **CERO parches ad-hoc**: no aplicar fixes globales para resolver un problema local si existe un bloque/primitive responsable de ese layout o comportamiento.
- **Resolver en la capa correcta**:
  - layout general → contenedor/layout
  - composición del widget → bloque interno del widget
  - estilo semántico → token del sistema
- Antes de tocar código visual: identificar **causa raíz** y dejar el ajuste en el nodo responsable (no en un wrapper genérico por conveniencia).
- Si por compatibilidad temporal se requiere workaround, debe quedar **documentado con TODO + motivo + plan de remoción**.

### Política de hardcode (obligatoria)

- No hardcodear valores visuales/semánticos cuando exista token, primitive o contrato de dominio.
- Colores y fuentes: siempre vía `@theme` (`hmi-app/src/index.css`).
- Labels de estado y copy configurable: siempre vía `displayOptions` tipadas (no strings mágicos dispersos).
- Scrollbars: usar siempre `hmi-scrollbar` en cualquier contenedor scrolleable. Prohibido usar scrollbars genéricos o `custom-scrollbar`.

### Política anti-hardcode dimensional (obligatoria)

- **CERO valores hardcodeados** para dimensiones, anchos, posiciones o cálculos que dependan del contenido o del contexto de renderizado.
- Si un valor depende del **contenido** (ej. ancho de un texto, alto de un bloque dinámico): medirlo en runtime (`canvas.measureText()`, `getBoundingClientRect()`, `ResizeObserver`, `translateX(-100%)`, etc.).
- Si un valor depende del **container** (ej. cuántas labels caben en el eje X): calcularlo a partir del ancho real disponible, no de una estimación fija.
- Los únicos hardcodes dimensionales permitidos son:
  - **Tokens del sistema de diseño** (`p-5`, `gap-2`, `text-[10px]`) — son constantes de diseño intencionadas.
  - **Valores estructurales fijos por definición** (ej. `radius = 60` de un SVG con `viewBox` fijo, `margin = { top: 10, ... }` de un chart).
  - **Valores temporales de testing** documentados con `// TODO: reemplazar por medición dinámica`.
- **Casos de referencia que violan esta regla y cómo se resolvieron:**
  - `tooltipWidth = 160` → reemplazado por `transform: translateX(-100%)` que usa el ancho real renderizado.
  - `estimatedLabelWidth = 38` → reemplazado por `canvas.measureText()` que mide el ancho exacto de cada string.
  - `.glass-panel > * { position: relative }` → reemplazado por `isolation: isolate` que crea stacking context sin pisar propiedades de los hijos.
- **Regla mental**: si el valor que estás hardcodeando *podría ser distinto* con otro contenido, otro idioma, o otro tamaño de container, entonces **no lo hardcodees — medilo o calculalo**.

---

## 7. Sistema de Diseño

### Tailwind v4 — Sin `tailwind.config.js`

Tailwind v4 **no usa `tailwind.config.js`**. La configuración se hace con el bloque `@theme {}` en `hmi-app/src/index.css`. Tailwind expone cada variable como clase utilitaria y como variable CSS nativa.

### 🔴 Regla de Oro

> **NUNCA hardcodear colores hex ni nombres de fuente en los componentes.**
> **SIEMPRE usar las variables CSS del `@theme {}`.**

Esta regla es arquitectural: el panel de administración incluirá un ícono de configuración (⚙️) para que el usuario cambie colores y fuentes dinámicamente, reasignando valores de variables. Si un componente usa `#ef4444` en lugar de `text-status-critical`, el theming dinámico se rompe.

### Categorías de tokens

| Categoría               | Prefijo CSS                | Tokens principales                               | Uso                                      |
|-------------------------|----------------------------|--------------------------------------------------|------------------------------------------|
| Industrial base         | `--color-industrial-*`     | `bg`, `surface`, `hover`, `border`, `text`, `muted` | Superficies y texto base de la app     |
| Colores de acento       | `--color-accent-*`         | `cyan`, `purple`, `pink`, `blue`, `green`, `amber`, `ruby` | Acentos de UI, indicadores            |
| Modo admin              | `--color-admin-*`          | `accent`, `selection-from`, `selection-to`       | Acento estructural del panel admin       |
| Gradientes de widget    | `--color-widget-*`         | `gradient-from`, `gradient-to`, `icon`           | Degradados base de métricas sin umbral   |
| Colorización dinámica   | `--color-dynamic-*`        | `normal-from/to`, `warning-from/to`, `critical-from/to` | Degradados según umbral de métrica  |
| Estado operativo        | `--color-status-*`         | `normal`, `warning`, `critical`                  | Indicadores de estado de equipos        |

### Convención para widgets nuevos

Ver guía completa: [`hmi-app/src/widgets/WIDGET_AUTHORING.md`](hmi-app/src/widgets/WIDGET_AUTHORING.md)

### Convenciones del modo admin (paneles, context bar, rails, widgets)

Ver guía completa: [`hmi-app/src/components/admin/ADMIN_CONVENTIONS.md`](hmi-app/src/components/admin/ADMIN_CONVENTIONS.md)

### Fuentes

| Token           | Uso                                              |
|-----------------|--------------------------------------------------|
| `--font-sans`   | Texto de interfaz, labels, tags, UI general      |
| `--font-mono`   | Datos, números, telemetría, IDs técnicos         |
| `--font-chart`  | Texto dentro de charts SVG (ejes, ticks, labels) |

> La familia tipográfica concreta de cada token se define en `@font-face` + `@theme {}` de `hmi-app/src/index.css`.
> Nunca referenciar nombres de fuente directamente en componentes — usar siempre los tokens via clases Tailwind (`font-sans`, `font-mono`).
> Las fuentes serán configurables dinámicamente desde el panel admin en el futuro.

### Íconos

**Solo Lucide React.** No importar de otras librerías de íconos.

---

## 8. Modo Administrador

El modo admin es una **interfaz de configuración de la propia HMI**, no un panel de control de la planta. La restricción de solo lectura aplica también aquí.

- **Layout**: `AdminLayout.tsx` — usar siempre en lugar de `MainLayout.tsx` para rutas admin.
- **Rutas**: bajo el prefijo `/admin` (ver `app/router.tsx`).
- **Dashboard builder**: sistema de widgets configurables.
  - `widgets/renderers/` — un componente de renderizado por tipo de widget.
  - `widgets/resolvers/` — lógica que resuelve qué datos muestra cada widget.
  - Los layouts de dashboard se persisten via `DashboardStorageService`.
- El catálogo de variables se gestiona inline desde `PropertyDock` con create/delete dentro del selector.
- **Almacenamiento**: `localStorage` como capa mock. `DashboardStorageService`, `HierarchyStorageService`, `TemplateStorageService` y `VariableCatalogStorageService` abstraen el acceso. No asumir backend real todavía.
- El dashboard builder valida que la variable sea obligatoria cuando el catálogo tiene entradas para la unidad seleccionada.
- **Theming futuro**: el panel admin incluirá configuración de colores y fuentes via el `@theme {}` de `index.css`.

### Esqueleto obligatorio de toda página admin

Toda página nueva bajo `/admin` DEBE usar `AdminWorkspaceLayout` como shell y seguir los 4 bloques fundamentales (context bar, rail, panel, main).

Ver convenciones completas: [`hmi-app/src/components/admin/ADMIN_CONVENTIONS.md`](hmi-app/src/components/admin/ADMIN_CONVENTIONS.md)

---

## 9. Reglas para Agentes IA

### Antes de escribir código, verificá:

1. ¿El archivo que voy a modificar existe realmente? (no inventar rutas)
2. ¿Los tipos que uso están definidos en `domain/`?
3. ¿Estoy respetando el flujo de datos: service → adapter → domain → query/store → UI?
4. ¿Estoy usando tokens CSS del `@theme {}` en lugar de valores hardcodeados?
5. ¿Todo contenedor con scroll usa `hmi-scrollbar`?
6. ¿Estoy usando `widgetCapabilities.ts` para chequear capacidades en vez de hardcodear `widget.type === 'xxx'`?
7. ¿Pregunta de control: **"¿Esto refuerza una interfaz observadora, premium, industrial, clara y escalable?"**

### Prohibido:

- Agregar cualquier funcionalidad de escritura o control hacia el proceso industrial
- Hardcodear colores hex o nombres de fuente en componentes
- Modificar archivos en `Directrices/` (son documentación fuente, no código)
- Crear tipos de dominio fuera de `hmi-app/src/domain/`
- Referenciar `tailwind.config.js` (no existe en este proyecto con Tailwind v4)
- Ignorar los tres tipos de estado ortogonales (mezclar `EquipmentStatus` con `MetricStatus`, por ejemplo)

### Ante la duda:

Consultá los documentos en `Directrices/` antes de tomar una decisión arquitectural.

---

## 10. Referencias a Documentos

| Documento | Descripción |
|-----------|-------------|
| [`Directrices/Directiva_maestra_v3.1.md`](Directrices/Directiva_maestra_v3.1.md) | Directiva maestra del proyecto: visión, principios, restricciones globales y decisiones fundacionales |
| [`Directrices/Arquitectura Técnica de Implementación HMI v1.3.md`](Directrices/Arquitectura%20Técnica%20de%20Implementación%20HMI%20v1.3.md) | Arquitectura técnica detallada: flujos de datos, capas, patrones y convenciones de implementación |
| [`Directrices/Especificación funcional_Modo Administrador.md`](Directrices/Especificación%20funcional_Modo%20Administrador.md) | Especificación funcional completa del modo administrador: dashboard builder, widgets y almacenamiento |
| [`Directrices/UI_Style_Guide_Design_System_Base_v1.md`](Directrices/UI_Style_Guide_Design_System_Base_v1.md) | Guía de estilo y sistema de diseño: tokens visuales, componentes, patrones de UI y sistema de colores |
| [`hmi-app/src/widgets/WIDGET_AUTHORING.md`](hmi-app/src/widgets/WIDGET_AUTHORING.md) | Convención operativa para crear widgets nuevos reutilizando header, focus, hover actions y template base |
| [`hmi-app/src/components/admin/ADMIN_CONVENTIONS.md`](hmi-app/src/components/admin/ADMIN_CONVENTIONS.md) | Convenciones del modo admin: esqueleto de página, rails, paneles, context bar y widgets |
