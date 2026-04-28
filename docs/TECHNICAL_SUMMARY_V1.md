# Interfaz-Laboratorio — Resumen Tecnico-Funcional v1

---

## 1. Nombre y proposito del sistema

**Interfaz-Laboratorio** es una HMI (Human-Machine Interface) industrial de visualizacion de datos en tiempo real. Esta disenada como base escalable y reutilizable para multiples laboratorios de distintas firmas — no es una interfaz cerrada para un unico cliente o proceso.

- **Que es**: Una aplicacion web SPA que renderiza dashboards configurables con widgets de telemetria, metricas, estados de equipos, alertas e historicos.
- **Para que proceso**: Generica. No esta atada a una maquina especifica. El modelo de datos soporta multiples maquinas (`machines[]`) con variables arbitrarias definidas en un catalogo configurable.
- **Interaccion**: **Estrictamente de solo lectura**. No envia comandos, setpoints ni escrituras hacia el proceso industrial. La unica interaccion es navegacion entre vistas, login para acceso admin, y configuracion de la propia interfaz (dashboards, jerarquia, diseno visual).

---

## 2. Stack tecnico actual

### Framework y librerias principales

| Tecnologia | Version | Rol |
|---|---|---|
| React | 19.2 | UI framework |
| TypeScript | 5.9 | Tipado estricto |
| Vite | 7.3 | Build tool y dev server |
| Tailwind CSS | 4.2 | Estilos utilitarios, sistema de tokens sin `tailwind.config.js` |
| Zustand | 5.0 | Estado global del cliente (auth, UI, shader params) |
| TanStack Query | 5.90 | Estado async / datos del servidor con polling |
| React Router | 7.13 | Enrutamiento SPA |
| Recharts | 3.8 | Charts (usado en pagina legacy `EquipmentDetail`) |
| Lucide React | 1.8 | Iconografia |
| Vitest | 4.1 | Testing |

### Como se ejecuta

- `npm run dev` — servidor de desarrollo Vite
- `npm run build` — `tsc -b && vite build` genera `dist/`
- `npm run test` — `vitest run`
- La app se sirve como SPA estatica; no tiene backend propio

### Estructura general de carpetas

```
interfaz-laboratorio/
├── hmi-app/                    # App principal (proyecto Vite independiente)
│   └── src/
│       ├── adapters/           # Anti-corruption layer (raw -> dominio)
│       ├── app/                # Bootstrap, router
│       ├── assets/             # SVGs, fuentes locales
│       ├── components/
│       │   ├── admin/          # Primitives y UI del modo administrador
│       │   ├── auth/           # Login overlay, guard de permisos
│       │   ├── charts/         # Chart legacy
│       │   ├── layout/         # Topbar, Sidebar, ShaderSettingsPanel
│       │   ├── ui/             # Primitives reutilizables + fondo WebGL
│       │   └── viewer/         # Renderer de dashboards publicos
│       ├── config/             # Config de conexion de datos
│       ├── domain/             # Tipos canonicos (incluye auth/)
│       ├── hooks/              # Hooks de UI/comportamiento
│       ├── layouts/            # Shells de viewer y admin
│       ├── mocks/              # Fixtures y datos simulados
│       ├── pages/              # Pantallas (incluye admin/)
│       ├── queries/            # Hooks TanStack Query
│       ├── services/           # Acceso HTTP y persistencia local
│       ├── store/              # Stores Zustand
│       ├── test/               # Setup y fixtures de test
│       ├── utils/              # Helpers transversales
│       └── widgets/            # Sistema de widgets (renderers, resolvers)
├── docs/                       # Documentacion tecnica operativa
├── Directrices/                # Documentacion fuente formal del producto
├── openspec/                   # Artefactos SDD (specs, tasks, verify reports)
└── AGENTS.md                   # Guia de contexto para agentes IA
```

### Archivos principales y responsabilidad

| Archivo | Responsabilidad |
|---|---|
| `app/router.tsx` | Define rutas viewer (`/`) y admin (`/admin`) con guard de permisos |
| `layouts/MainLayout.tsx` | Shell del viewer: fondo WebGL + Topbar + contenido |
| `layouts/AdminLayout.tsx` | Shell admin: sidebar con navegacion + logout |
| `components/ui/EventHorizonBackground.tsx` | Fondo animado WebGL con shaders GLSL |
| `components/layout/Topbar.tsx` | Barra superior: navegacion, login, acceso admin, shader settings |
| `widgets/WidgetRenderer.tsx` | Dispatcher central que renderiza cualquier widget por tipo |
| `components/viewer/DashboardViewer.tsx` | Renderiza dashboards publicados con grid de widgets |
| `config/dataConnection.config.ts` | Construccion de URLs para endpoints de datos |
| `store/auth.store.ts` | Estado de autenticacion con persistencia y sync cross-tab |
| `store/ui.store.ts` | Estado UI (grid, sidebar, seleccion jerarquica, filtros) |
| `store/shaderParams.store.ts` | Parametros del shader WebGL persistidos |
| `domain/admin.types.ts` | Tipos de dashboards, widgets, bindings, thresholds, templates |
| `domain/dataContract.types.ts` | Contrato de datos: overview snapshot + historico |
| `services/dataOverview.service.ts` | Fetch HTTP del snapshot de datos en tiempo real |
| `services/dataHistory.service.ts` | Fetch HTTP de datos historicos |
| `src/index.css` | Sistema de tokens `@theme {}` (colores, fuentes, animaciones) |

---

## 3. Pantallas o secciones existentes

### Viewer (modo publico)

| Pantalla | Ruta | Objetivo | Que muestra | Componentes principales | Datos |
|---|---|---|---|---|---|
| **Dashboard** | `/` | Vista principal de operacion | Dashboards publicados con header configurable + grid de widgets | `DashboardHeader`, `DashboardViewer`, `HeaderWidgetRenderer`, `WidgetRenderer` | **Reales** (overview polling 5s) + mock equipment para previews |
| **Detalle de equipo** | `/equipment/:id` | Detalle individual de un equipo | Cards de metricas, chart Recharts, estados | Cards estaticos, `TrendWidget` legacy | **Simulados** (datos hardcodeados locales, no usa el route param) |
| **Alertas** | `/alerts` | Lista de alertas/eventos | Tabla filtrable de alertas con severidad | `AlertsPage` con filtros | **Simulados** (mock polling 20s) |
| **Tendencias** | `/trends` | Exploracion de tendencias por equipo | Selector equipo/rango + trend chart + metric widgets | `TrendsPage`, widgets dinamicos | **Mixto** (mock equipment list + widgets con binding real o simulado) |
| **Explorador** | `/explorer` | Futuro explorador de datos | Placeholder "Proximamente" | — | Sin datos |
| **Trazabilidad** | `/traceability` | Futuro modulo de trazabilidad | Placeholder "Proximamente" | — | Sin datos |
| **Overview** | `/overview` | Futuro resumen general | Placeholder "Proximamente" | — | Sin datos |
| **Diagnosticos** | `/diagnostics` | Futuro modulo de diagnostico | Placeholder "Proximamente" | — | Sin datos |
| **Logs** | `/logs` | Futuro visor de logs | Placeholder "Proximamente" | — | Sin datos |

### Admin (modo administrador, requiere login con permiso `admin:access`)

| Pantalla | Ruta | Objetivo | Que muestra | Componentes principales | Datos |
|---|---|---|---|---|---|
| **Gestor de Dashboards** | `/admin/dashboards` | CRUD de dashboards y templates | Lista de dashboards, acciones (crear, duplicar, borrar, reordenar), templates | `DashboardManagerPage`, `AdminWorkspaceLayout` | localStorage |
| **Builder Visual** | `/admin/builder/:id` | Constructor visual de dashboards | Canvas con grid, catalogo de widgets, dock de propiedades, preview con datos | `DashboardBuilderPage`, `BuilderCanvas`, `PropertyDock`, `WidgetCatalogRail` | localStorage + preview con overview real/mock |
| **Jerarquia** | `/admin/hierarchy` | Editor de estructura organizacional | Arbol recursivo de nodos (planta -> area -> equipo), vinculos a dashboards | `HierarchyPage`, `HierarchyTree`, `HierarchyActionsRail` | localStorage |

---

## 4. Componentes / widgets reutilizables

### Widgets (sistema configurable via Builder)

| Widget | Funcion | Datos |
|---|---|---|
| `metric-card` | Tarjeta de metrica con valor, unidad, estado y badge de conexion | Real o simulado via `resolveBinding` |
| `kpi` | Gauge circular o barra con umbrales dinamicos (normal/warning/critical) | Real o simulado |
| `machine-activity` | Indice de actividad con estados `stopped`/`calibrating`/`producing` | Real o simulado |
| `status` | Estado operativo del equipo con `StatusBadge` | Real o simulado |
| `connection-status` | Estado de conexion global o por maquina, con frescura temporal | Real o simulado |
| `trend-chart` | Grafico temporal SVG con tooltip, hover y selector de rango | Real via `useDataHistory` o simulado con `generateTrendData` |
| `prod-history` | Produccion historica + OEE por hora/turno/dia/mes | Simulado (genera serie local) |
| `alert-history` | Historico de alertas derivado de widgets hermanos del dashboard | Derivado/local, persiste en localStorage |
| `text-title` | Titulo tipografico configurable, sin datos | Sin datos |

Todos los widgets se renderizan a traves del dispatcher central `WidgetRenderer.tsx` y se usan tanto en el viewer publico como en el preview del builder admin.

### Componentes UI reutilizables

| Componente | Funcion | Uso principal |
|---|---|---|
| `HmiButton` | Boton con 3 variantes (primary/secondary/danger), 2 tamanos | Login, logout, acciones admin |
| `AnchoredOverlay` | Overlay flotante con portal, click outside, Escape | Login, selects admin, menus |
| `MetricCard` | Card de metrica con estados loading/warning/critical/error | Widget `metric-card` |
| `StatusBadge` | Badge de estado operativo con colores semanticos | Widget `status` |
| `ConnectionBadge` | Badge de conectividad y frescura temporal | Widget `metric-card` |
| `GaugeDisplay` | Gauge reusable (circular o barra) | Widgets `kpi` y `machine-activity` |
| `WidgetHeader` | Header estandar de todos los widgets | Todos los widgets |
| `WidgetSegmentedControl` | Selector segmentado para cambio de rango/modo | Widgets `trend-chart` y `prod-history` |
| `ChartTooltip` / `ChartHoverLayer` | Tooltip y capa SVG de hover compartida para charts | Widgets `trend-chart` y `prod-history` |
| `HoverTooltip` / `CursorTooltip` | Tooltips contextuales | Topbar, builder, catalogos |
| `EmptyState` / `ErrorState` / `LoadingSkeleton` | Estados vacio, error y carga genericos | Paginas viewer |
| `AdminDialog` / `AdminDestructiveDialog` | Modales base y confirmaciones destructivas | Todas las paginas admin |
| `AdminSelect` / `AdminNumberInput` / `AdminTag` | Inputs especializados del admin | Builder, hierarchy, settings |
| `AdminWorkspaceLayout` | Shell admin de 4 bloques (context bar, rail, panel, main) | Todas las paginas admin |
| `CatalogVariableSelector` | Selector/creador de variables del catalogo | Builder (property dock) |

---

## 5. Modelo de datos actual

### Fuentes de datos que usa hoy

| Fuente | Tipo | Estado |
|---|---|---|
| **HTTP snapshot endpoint** | GET polling cada 5s | **Implementado** — consume contrato JSON estable |
| **HTTP history endpoint** | GET bajo demanda | **Implementado** — query por machineId + variableKey + rango |
| **Mock local (equipment)** | Datos hardcodeados en `mocks/` | **Activo** — usado por paginas equipment y alerts |
| **localStorage** | Persistencia de configuracion admin | **Activo** — dashboards, templates, jerarquia, catalogo de variables, theme |

### Que NO consume directamente

- **WebSocket**: no identificado
- **MQTT**: no identificado
- **InfluxDB**: no identificado (aunque el endpoint historico podria consultarlo internamente, la HMI no lo sabe)
- **Node-RED**: la HMI se declara desacoplada del origen; consume un contrato JSON estable. La config/admin todavia usa naming "Node-RED" en claves de configuracion, pero la HMI no se conecta directamente a Node-RED

### Como se actualizan los datos

| Query | Frecuencia | Mecanismo |
|---|---|---|
| Overview (snapshot real) | 5 segundos | React Query polling |
| Historico | Bajo demanda | React Query con staleTime 30s |
| Alertas (mock) | 20 segundos | React Query polling |
| Equipment list (mock) | 30 segundos | React Query polling |
| Alert history (widget) | 10 segundos | Polling interno del widget |

### Datos historicos

- Existe un endpoint y contrato dedicado para historico (`DataHistoryResponse`)
- El widget `trend-chart` usa `useDataHistory()` cuando el binding es real y hay endpoint configurado
- Si no hay historico real, el widget genera datos simulados con `generateTrendData`
- El widget `prod-history` genera series historicas simuladas localmente en esta version

---

## 6. Estado de comunicacion y resiliencia

### Deteccion de conexion/desconexion

- El contrato de datos incluye `connection.globalStatus` y `machines[].status` con estados: `online`, `degradado`, `offline`, `unknown`
- El widget `connection-status` puede operar en scope **global** o **por maquina**
- `useDataOverview()` expone `connection`, `machines`, `isError`, `dataUpdatedAt`, `isEnabled`

### Latencia y ultimo dato

- El contrato incluye `lastSuccess` (timestamp) y `ageMs` (antiguedad en ms) tanto global como por maquina
- `ConnectionStatusWidget` muestra frescura relativa con `formatConnectionFreshness(ageMs, lastSuccess)`
- El sistema de bindings marca datos como `stale` si se supera un `staleTimeout` configurable o si `connectionState === 'stale'`

### Que pasa si una fuente falla

- Los servicios HTTP lanzan `DataServiceError` en config faltante, error de red o HTTP error
- React Query tiene retry 2 configurado globalmente
- Si no hay base URL configurada, la integracion queda **deshabilitada** sin romper la UI — los widgets muestran estados fallback
- `TrendChartWidget` muestra "Error al cargar datos" o "Sin datos" segun el caso
- **Gap identificado**: el Dashboard principal no tiene una pantalla explicita de error para el overview; consume `connection/machines` directamente y sigue renderizando

### Separacion por maquina

- **Si**: el contrato soporta `machines[]`, los widgets de conexion filtran por `machineId`, los bindings resuelven por `machineId + variableKey`
- **Multiples fuentes independientes**: no identificado — actualmente hay una unica conexion base con un endpoint snapshot y uno historico

---

## 7. Funcionalidades ya implementadas

### Viewer
- Dashboard dinamico con grid de widgets configurables y header con slots
- 9 tipos de widgets con resolucion de bindings (real o simulado)
- Resolucion de umbrales dinamicos (normal/warning/critical) por widget
- Deteccion de estado de conexion global y por maquina con frescura temporal
- Datos en tiempo real via polling HTTP cada 5 segundos
- Datos historicos bajo demanda con selector de rango
- Fondo animado WebGL con shader GLSL (nebulosa, estrellas, lensing gravitacional, aberracion cromatica, interaccion con cursor)
- Parametros del shader configurables y persistidos

### Auth
- Login con overlay anclado (2 usuarios hardcodeados: viewer y admin)
- Guard de rutas por permisos (`viewer:access`, `admin:access`)
- Persistencia de sesion en localStorage
- Sincronizacion de auth entre pestanas via evento `storage`

### Admin
- CRUD completo de dashboards (crear, duplicar, borrar, reordenar, buscar)
- Builder visual con canvas grid, catalogo de widgets drag-and-drop, dock de propiedades
- Configuracion de bindings: variable del catalogo, maquina, modo (real/simulado), umbrales
- Sistema de templates (guardar dashboard como template, crear desde template)
- Editor de jerarquia organizacional (planta -> area -> equipo) con vinculos a dashboards
- Configuracion de tipos de nodo con icono y color
- Configuracion de conexion (URL base, endpoint snapshot, endpoint historico)
- Configuracion de diseno (fuentes, tamanos, tracking, paleta de colores)
- Header configurable por dashboard con slots para widgets de status y conexion
- Catalogo de variables gestionable desde el builder

### Testing
- 54 archivos de test, suite 303/303 pasando
- Cobertura minima enforced: 70% lines/branches/functions/statements
- Stack: Vitest + Testing Library + jsdom

---

## 8. Funcionalidades pendientes o limitaciones actuales

### Pendiente / Placeholder
- **Explorer** (`/explorer`): placeholder "Proximamente"
- **Trazabilidad** (`/traceability`): placeholder "Proximamente"
- **Overview** (`/overview`): placeholder "Proximamente"
- **Diagnosticos** (`/diagnostics`): placeholder "Proximamente"
- **Logs** (`/logs`): placeholder "Proximamente"

### Simulado (requiere integracion real)
- **Pagina Equipment Detail** (`/equipment/:id`): datos completamente hardcodeados, no usa el parametro de ruta ni queries reales
- **Lista de equipos**: mock local con polling, no conectada a fuente real
- **Alertas**: mock local con polling, no conectada a fuente real
- **Widget `prod-history`**: genera series historicas simuladas localmente
- **Widget `alert-history`**: evalua widgets hermanos del dashboard, no consume fuente externa de alertas

### Limitaciones conocidas
- **Auth hardcodeado**: 2 usuarios fijos en codigo (`usuario`/`admin`), sin backend de autenticacion
- **Persistencia admin en localStorage**: dashboards, templates, jerarquia y catalogo viven solo en el navegador. No hay backend para persistir ni compartir entre usuarios/dispositivos
- **Fuente de datos unica**: solo soporta un par de endpoints (snapshot + historico). No hay multi-fuente ni multi-servidor
- **Sin WebSocket/streaming**: la actualizacion es polling HTTP, no push en tiempo real
- **Sin light mode**: solo tema dark industrial
- **Sin lazy loading**: no hay `React.lazy` ni code splitting por ruta
- **Sin virtualizacion**: listas largas no usan `react-window` ni similar
- **Sin PWA / offline**: no hay service worker ni modo offline
- **Sin internacionalizacion**: textos en espanol hardcodeados
- **Sidebar legacy**: existe `Sidebar.tsx` pero no se usa activamente en el layout actual
- **White flash en hard reload**: investigado — es un problema de compositing de Chromium en teardown de WebGL, no tiene fix definitivo del lado de la app

---

## 9. Decisiones de diseno relevantes

### Estilo visual
- **Dark Industrial Theme**: fondo `#05070a`, superficie `#0e1117`, texto `#f1f5f9`
- Estetica premium industrial con glassmorphism (`glass-panel` con blur y transparencia)
- Fondo WebGL animado con shader GLSL: nebulosa volumetrica, starfield parallax, lensing gravitacional, interaccion con cursor
- Toda la interfaz esta pensada para funcionar sobre este fondo sin perder legibilidad

### Colores por estado

| Estado | Color | Token |
|---|---|---|
| Normal | `#10b981` (verde) | `--color-status-normal` |
| Warning | `#f59e0b` (ambar) | `--color-status-warning` |
| Critical | `#ef4444` (rojo) | `--color-status-critical` |
| Stopped | Rojo con gradiente | `--color-state-stopped` |
| Calibrating | Ambar con gradiente | `--color-state-calibrating` |
| Producing | Verde con gradiente | `--color-state-producing` |
| Admin accent | `#a48dff` (purpura) | `--color-admin-accent` |

### Tipografia
- UI general / sistema: **JetBrains Mono** (monoespaciada industrial)
- Mono / charts: **IBM Plex Mono**
- Titulos de dashboard y valores de widgets: **Magistral** (display font)
- 11 fuentes cargadas como `@font-face` para flexibilidad de configuracion admin

### Legibilidad
- Tamanos grandes por defecto: titulos de dashboard 48px, valores de gauge 60px, valores de metrica 35px
- Fuentes, tamanos, pesos y tracking configurables desde admin
- Tokens CSS via `@theme {}` — cero valores hardcodeados en componentes
- Scrollbars custom con clase `hmi-scrollbar`

### Adaptacion a pantalla grande / 4K
- Layout full-viewport sin scroll en el viewer
- Tamanos tipograficos grandes configurables
- Grid de widgets responsivo
- DPR del canvas WebGL limitado a 1.5 para performance en pantallas de alta densidad
- No hay politica explicita documentada para distancia de visualizacion, pero la implementacion prioriza escalado tipografico y full-screen

---

## 10. Performance y operacion

### Frecuencia de actualizacion

| Dato | Frecuencia |
|---|---|
| Overview snapshot | 5 segundos |
| Historico | Bajo demanda (staleTime 30s) |
| Alertas mock | 20 segundos |
| Equipment list mock | 30 segundos |
| Alert history widget | 10 segundos |
| Shader background | ~60 FPS (requestAnimationFrame) |

### Optimizaciones realizadas
- `useMemo` / `useCallback` extensivo en paginas y widgets
- DPR del canvas WebGL capeado a 1.5
- WebGL context con `powerPreference: 'high-performance'`
- Manejo de `webglcontextlost` / `webglcontextrestored` para recuperacion
- First draw sincronico del shader para evitar blank frame inicial
- `ResizeObserver` para sizing responsive de canvas, charts y widgets
- React Query con retry 2 y staleTime configurado por query
- Degradacion graceful: si WebGL falla, queda fondo base industrial sin romper la app

### Problemas resueltos
- **White flash en hard reload**: investigado a fondo — es un problema de compositing de Chromium durante el teardown de la pagina con canvas WebGL. Se mitigo parcialmente con first draw sincronico y estilos de canvas. No tiene fix completo del lado de la app
- **21 tests rotos preexistentes**: corregidos (assertions desactualizadas vs implementacion actual). Suite 303/303 green
- **Codigo residual de iteraciones WebGL**: auditado y limpiado

### Requisitos recomendados
- Navegador con soporte WebGL 2.0 (Chrome, Edge, Firefox modernos)
- GPU dedicada o integrada reciente (para shader de fondo)
- Resolucion recomendada: 1920x1080 minimo, optimizado para 4K
- Conexion de red estable al endpoint de datos (polling cada 5s)

---

## 11. Que deberia destacarse en una presentacion

1. **Sistema de dashboards configurables sin codigo**: el admin puede crear, organizar y configurar dashboards completos con 9 tipos de widgets, bindings a variables reales, umbrales dinamicos y header personalizable — todo desde una interfaz visual.

2. **Arquitectura desacoplada del origen de datos**: la HMI consume un contrato JSON estable, no una tecnologia concreta. Se puede conectar a Node-RED, un API gateway, o cualquier middleware que cumpla el contrato — sin tocar codigo.

3. **Fondo WebGL con shader GLSL propio**: efecto visual de nebulosa interactiva con estrellas, lensing gravitacional y aberracion cromatica. No es una libreria de terceros — es un shader custom que corre a 60 FPS con optimizaciones de DPR y recuperacion de contexto.

4. **Modelo jerarquico flexible**: planta -> area -> equipo con tipos de nodo configurables, vinculacion a dashboards y catalogo de variables. Permite modelar cualquier estructura organizacional.

5. **Sistema de estados ortogonales**: separacion limpia entre estado operativo del equipo (`EquipmentStatus`), estado de conexion (`ConnectionState`) y estado de metricas (`MetricStatus`). Cada uno se resuelve, visualiza y alerta de forma independiente.

6. **Resiliencia y visibilidad de conexion**: deteccion de desconexion global y por maquina, frescura temporal de datos, deteccion de stale data con timeouts configurables, y degradacion graceful sin romper la interfaz.

7. **Design system con tokens**: todo el lenguaje visual (colores, fuentes, tamanos, animaciones) esta tokenizado en CSS custom properties, configurable desde admin sin tocar codigo.

8. **Testing con cobertura enforced**: 54 archivos de test, 303 tests pasando, cobertura minima 70% enforced en CI. Stack moderno con Vitest + Testing Library.

9. **Auth extensible**: modelo de permisos por rol con guard de rutas, sync cross-tab y estructura preparada para backend real — hoy funciona con auth local pero la arquitectura (service -> adapter -> store) permite reemplazar sin refactorear UI.

10. **Base escalable**: la arquitectura de capas (domain -> service -> adapter -> query/store -> UI) y el sistema de widgets extensible (con guia de authoring documentada) permiten agregar nuevos tipos de widgets, fuentes de datos y pantallas sin modificar el core.
