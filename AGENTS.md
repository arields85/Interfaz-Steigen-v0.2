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
│   └── assistant.types.ts
├── adapters/               # Transforman datos externos al modelo de dominio
│   ├── equipment.adapter.ts
│   └── alert.adapter.ts
├── services/               # Acceso a datos (HTTP, localStorage, mocks)
│   ├── equipment.service.ts
│   ├── alert.service.ts
│   ├── DashboardStorageService.ts
│   ├── HierarchyStorageService.ts
│   └── TemplateStorageService.ts
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
│   └── template.mock.ts
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
├── index.css               # @theme {} de Tailwind v4 — tokens del sistema de diseño
├── App.tsx
└── main.tsx
```

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

**Widgets con color dinámico**
- Todo widget nuevo que represente estado, severidad o umbrales debe usar exclusivamente los tokens semánticos definidos en `hmi-app/src/index.css`.
- Para colorizado dinámico usar:
  - `--color-dynamic-normal-from`
  - `--color-dynamic-normal-to`
  - `--color-dynamic-warning-from`
  - `--color-dynamic-warning-to`
  - `--color-dynamic-critical-from`
  - `--color-dynamic-critical-to`
- Para íconos, acentos y subtexto usar:
  - `--color-widget-icon`
  - `--color-status-normal`
  - `--color-status-warning`
  - `--color-status-critical`
  - `--color-widget-gradient-from`
  - `--color-widget-gradient-to`
- Para UI estructural del modo admin usar:
  - `--color-admin-accent`
  - `--color-admin-selection-from`
  - `--color-admin-selection-to`

**Prohibido**
- Hardcodear colores hex en renderers, componentes o SVGs de widgets.
- Inventar una lógica cromática paralela por fuera de los tokens semánticos.
- Usar colores visualmente correctos pero semánticamente inconsistentes con el sistema.

**Criterio**
- Si el widget no usa estado dinámico, usar el degradado base de widget.
- Si el widget responde a umbrales o severidad, usar los tokens `--color-dynamic-*`.
- Si el widget muestra estado puntual, usar `--color-status-*`.

### Convención estructural para widgets nuevos

- Todo widget nuevo debe apoyarse en primitives compartidos del sistema y NO reinventar estructura base.
- Shell visual base: `glass-panel`.
- Header canónico: `hmi-app/src/components/ui/WidgetHeader.tsx`.
- Acciones hover: `hmi-app/src/components/ui/WidgetHoverActions.tsx`.
- Foco/selección:
  - grid → `hmi-app/src/components/ui/GridSelectionFrame.tsx`
  - header → `hmi-app/src/components/ui/HeaderSelectionFrame.tsx`
- Registro obligatorio del renderer en `hmi-app/src/widgets/WidgetRenderer.tsx`.
- Si el widget agrega configuración nueva, tipar `displayOptions` en `hmi-app/src/domain/admin.types.ts`.
- `subtitle` = contexto de header. `subtext` = texto inferior/footer. Nunca mezclar.
- Template base para widgets nuevos: `.agent/skills/interfaz-widget/assets/NewWidgetTemplate.tsx`.
- Guía detallada: `hmi-app/src/widgets/WIDGET_AUTHORING.md`.

### Fuentes

| Token           | Familia                | Uso                       |
|-----------------|------------------------|---------------------------|
| `--font-sans`   | Plus Jakarta Sans      | Texto de interfaz         |
| `--font-mono`   | Roboto Mono            | Datos, números, telemetría|

> Las fuentes también serán configurables dinámicamente desde el panel admin en el futuro.

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
- **Almacenamiento**: `localStorage` como capa mock. `DashboardStorageService`, `HierarchyStorageService` y `TemplateStorageService` abstraen el acceso. No asumir backend real todavía.
- **Theming futuro**: el panel admin incluirá configuración de colores y fuentes via el `@theme {}` de `index.css`.

---

## 9. Reglas para Agentes IA

### Antes de escribir código, verificá:

1. ¿El archivo que voy a modificar existe realmente? (no inventar rutas)
2. ¿Los tipos que uso están definidos en `domain/`?
3. ¿Estoy respetando el flujo de datos: service → adapter → domain → query/store → UI?
4. ¿Estoy usando tokens CSS del `@theme {}` en lugar de valores hardcodeados?
5. ¿Pregunta de control: **"¿Esto refuerza una interfaz observadora, premium, industrial, clara y escalable?"**

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
