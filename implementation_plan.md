# Fase 5 — Interactividad del Dashboard Builder

## Objetivo

Transformar el esqueleto estático del `DashboardBuilderPage` (Fase 4) en un editor interactivo y funcional. El administrador debe poder agregar widgets desde el catálogo al canvas, moverlos en una grilla estructurada, y configurar sus propiedades y bindings reales/simulados desde el panel lateral, viendo los cambios reflejados instantáneamente gracias a `WidgetRenderer`.

Esta fase es crítica para cumplir con el alcance de "Libertad gobernada" y "Separación entre dashboard y binding" de la Especificación del Modo Administrador.

---

## Documentos rectores consultados

| Documento | Secciones aplicadas |
|---|---|
| `Especificación funcional_Modo Administrador.md` | §8 (Editor visual de dashboard), §9 (Biblioteca de widgets), §10 (Configuración de widget), §11 (Gestor de bindings) |
| `Arquitectura Técnica v1.3` | Estado local en React sobre mutabilidad, uso de componentes base. |

---

## Alcance de la Fase 5

### 1. Grilla y Layout Estructurado
El canvas actualmente usa CSS Grid básico. Se migrará a un sistema interactivo manejable:
- Implementaremos lógica de **Drag and Drop interactiva** estándar, o un sistema de grilla más pulido basado en `react-grid-layout` (o en su defecto un sistema drag & drop propio simple con HTML5 nativo o `dnd-kit`) para organizar `WidgetLayout`.
- Para mantener la complejidad acotada inicialmente y asegurar funcionalidad "governada", la primera iteración de esta grilla puede funcionar reordenando el array `layout` y ajustando el span (ancho) del widget seleccionado.

### 2. Catálogo Interactivo (Drag/Add to canvas)
- El **Sidebar izquierdo** se volverá activo.
- Hacer click (o arrastrar) en un ítem del catálogo (ej. "Métrica", "Estado") instanciará un nuevo `WidgetConfig` con valores por defecto y lo empujará al `draft.layout` en el canvas.
- Nuevos IDs únicos serán generados para los widgets.

### 3. Panel de Propiedades y Edición en Vivo
- El **Sidebar derecho** permitirá editar todas las propiedades del `selectedWidget`:
  - **Identidad**: Título, variante visual.
  - **Layout**: Opciones para ajustar el tamaño/ancho (`col-span`) dentro del canvas.
- La edición mutará el estado `draft` (local de la página) y `WidgetRenderer` re-renderizará instantáneamente en el canvas.

### 4. Gestor de Bindings
- El corazón del panel derecho será la configuración de `WidgetBinding`.
- **Modos soportados**: Alternar entre `Simulado` (input de un número o texto) y `Real` (selector de equipo y métrica).
- **Selector de Activo Real**: Dropdown poblado por el `equipmentMap` mockeado (Fase 4). Al elegir la Comprimidora, un segundo dropdown mostrará las métricas disponibles (*Velocidad*, *Fuerza*).
- **Thresholds**: Permitir agregar/editar rangos `Warning` y `Critical`. Al editarlos, el `thresholdEvaluator` de la Fase 3 mostrará los colores reflejados en el widget del canvas si está apuntando a un dato real en ese rango o simulado.

### 5. Botones de Acción
- **Guardar**: Hará un console.log de la estructura final y marcará el draft como limpio. (Simula guardado a backend).
- **Eliminar Widget**: Botón en panel derecho para remover el widget seleccionado del dashboard.

---

## Árbol de cambios propuesto

```
src/
├── pages/admin/
│   └── DashboardBuilderPage.tsx      ← Integración de DnD o lógica de adición/remoción. Actualización de estado `draft`.
│
├── components/admin/
│   ├── BuilderCanvas.tsx             ← Render interactivo de la grilla que reacciona a redimensionamientos y reordenamientos.
│   ├── PropertiesPanel.tsx           ← [NUEVO] Separado del page complex para manejar forms de título, size y thresholds.
│   ├── BindingEditor.tsx             ← [NUEVO] Sub-panel especializado en modo Simulado vs. Real y selectores de variables.
│   └── CatalogSidebar.tsx            ← [NUEVO] Componentizado para listas de templates de widgets.
│
└── utils/
    └── idGenerator.ts                ← Utilidad simple para nuevos UUIDs o identificadores cortos para widgets.
```

---

## Qué NO está en alcance para esta fase

- **Guardado en backend persistente**: Como siempre, usamos `mockDashboards` al vuelo.
- **Widgets IA/Complejos**: Solo se soportan los iterados en Fase 3 y 4 (`metric-card`, `status`, `connection-indicator`). Los gráficos (`trend-chart`) se insertarán pero renderizarán el fallback `UnsupportedWidget` hasta que sean implementados.
- **Múltiples páginas/Paginación**: Se asume 1 solo layout fluido hacia abajo por ahora.
- **Selector arbóreo avanzado de Planta**: El selector de `asset` será un dropdown plano por ahora en base al mock, la validación contra jerarquía de planta será en una fase posterior.

---

## Fase 6 — Persistencia de la Configuración y Ciclo de Vida del Draft

### Objetivo
Sustituir la lectura en memoria de los mocks por un mecanismo de persistencia simulado y persistente en el navegador (Local Storage / IndexedDB). Esto permitirá consolidar el flujo real de Edición: Cargar (Load), Editar en Borrador (Draft) y Guardar (Save/Commit) los dashboards, asegurando que la estructura JSON de bindings y thresholds sea serializable y recuperable.

### 1. Mecanismo de Almacenamiento (Storage Service)
- Crearemos `src/services/DashboardStorageService.ts` (o similar) que exponga métodos asíncronos (`getDashboards`, `getDashboard`, `saveDashboard`) para simular la latencia de un backend real.
- Usará `localStorage` bajo el capó. Si el storage está vacío, se auto-inicializará (seed) con la data de `admin.mock.ts`.

### 2. Ciclo de Vida en el Dashboard Manager
- `DashboardManagerPage` dejará de importar el array estático.
- En su montaje, solicitará los dashboards al servicio.
- Permitirá, opcionalmente, la acción de crear un "Nuevo Dashboard" vacío, guardándolo en la capa persistente.

### 3. Ciclo de Vida en el Dashboard Builder
- **Load**: Al entrar a `/admin/builder/:id`, montará un efecto para pedir el dashboard por ID al Storage. Mientras carga, mostrará un estado de Skeleton o Spinner en el layout de `AdminLayout`.
- **Draft**: Se cargará en el estado `draft` (como se hace actualmente). Las iteraciones de Properties e interacciones mutan *únicamente* este draft.
- **Dirty State**: Añadiremos un indicador visual de "Cambios sin guardar" si `draft` diverge del `originalConfig`.
- **Save**: Al presionar "Guardar Cambios", se enviará la mutación al `StorageService` persistiendo el JSON en `localStorage`. Modificará la firma `lastUpdateAt` y mostrará feedback de éxito.

### Verificación esperada
1. Ingresar al `DashboardManager` y ver los dashboards precargados.
2. Ingresar a uno en particular en el Builder.
3. Hacer modificaciones (añadir un widget, cambiar un threshold).
4. Hacer refresh `(F5)` de la página *sin guardar*. Verificar que los cambios se perdieron (se respeta el flujo de Draft).
5. Rehacer una modificación y darle al botón "Guardar Cambios".
6. Hacer refresh `(F5)`. Verificar que la configuración persiste exactamente como se guardó.
7. Al navegar al Home real (`/` o pantalla del equipo simulada), verificar que los dashboards productivos reflejen este cambio si decidiéramos leerlos desde este StorageService (por ahora la lectura en `/trends` es independiente, pero sentaremos las bases para que consuman la misma fuente).

---

## Fase 7 — Reordenamiento Drag & Drop en Grilla (Simple & Robusto)

### Objetivo
Habilitar a los administradores para que puedan reordenar (y por ende posicionar bidimensionalmente) los widgets dentro del lienzo del constructor. La solución priorizará la estabilidad estructural, aprovechando el CSS Grid nativo de Tailwind, donde alterar el índice de los elementos en el arreglo de layout produce un *snap* automático, fluido y seguro a la grilla sin lidiar con cálculos absolutos `(x, y)` frágiles en esta primera instancia.

### 1. Sistema HTML5 de Drag & Drop (Nativo)
- Implementaremos los eventos nativos `draggable`, `onDragStart`, `onDragOver`, `onDragEnter`, y `onDrop` directamente en los contenedores iterados dentro de `BuilderCanvas`.
- Evitaremos agregar librerías pesadas de terceros inicialmente para mantener el absoluto control de los bugs visuales y conservar el *Dark Industrial Theme*.

### 2. Estado Efímero de Arrastre
- El canvas manejará un estado transitorio `draggedItemIndex` y `hoveredItemIndex`.
- **Feedback visual (Drop Indicator)**: Mientras se arrastra sobre otro widget, este último recibirá una clase temporal (ej. margen o borde *cyan*) indicando que al soltar allí se realizará el intercambio (o inserción lateral).
- El widget arrastrado reducirá su opacidad (efecto ghosting).

### 3. Persistencia Unificada
- Cuando el evento `onDrop` se concreta de forma exitosa, manipularemos puramente el arreglo `draft.layout` en el padre (`DashboardBuilderPage`).
- Extraeremos el elemento de su índice de origen y lo insertaremos en el índice de destino mediante operaciones inmutables de arreglos.
- Al modificar `draft.layout`, la dependencia de React de la Fase 6 automáticamente encenderá el **Dirty State** (*Cambios sin guardar*).
- El botón de *Guardar Cambios* persistirá el nuevo orden (y anchos) de la grilla en `DashboardStorageService` sin requerir lógica de persistencia extra.

### Verificación esperada
1. Entrar al Builder.
2. El lienzo debe tener múltiples widgets (agregar 2 o 3 si es necesario, de diferentes tamaños como `w=1` y `w=2`).
3. Hacer *click sostenido* sobre un widget y ver cómo baja su opacidad confirmando el modo arrastre.
4. Moverlo encima de otro widget; el widget destino debe resaltar indicando la posible zona de impacto.
5. Soltar el ratón. Los widgets deben reordenarse fluidamente respetando el sistema de columnas autocompensado del CSS Grid.
6. El indicador superior debe informar "Cambios sin guardar".
7. Pulsar "Guardar", hacer F5 verificando que el orden ha sobrevivido intacto, confirmando el circuito cerrado Builder -> Storage -> D&D.

---

## Fase 8 — Módulo de Jerarquía de Planta en el Admin

### Objetivo
Materializar el primer módulo funcional del Editor de Jerarquía (§6 de la Especificación Funcional), de modo que el Modo Admin cuente con un árbol navegable real, tipado y persistido. Esta base estructural debe quedar preparada para la edición completa en fases posteriores.

---

### 1. Ajustes de dominio (`admin.types.ts`)
El tipo `HierarchyNode` ya existe y está alineado con la spec. Solo añadiremos el campo opcional `children` computado del cliente para facilitar renderizado del árbol.
- **No** se modifica la forma de almacenamiento (lista plana con `parentId`), que es el modelo correcto.
- Sí añadimos una utilidad auxiliar `buildTree()` que transforma la lista plana en árbol para renderizado.

---

### 2. Mock de jerarquía (`mocks/hierarchy.mock.ts`) [NUEVO]
Crearemos un mock estructurado que represente la planta de ejemplo del sistema:
```
Planta Steigen
  ├─ Área Compresión
  │   ├─ Sector Sur
  │       ├─ Línea 1
  │           ├─ Box A
  │               └─ Comprimidora FETTE-2090 [equipo] → linked: dash-comp-01
  ├─ Área Packaging
  │   └─ Sector Empaque Norte
  └─ Carpeta: Dashboards Globales [folder] → linked: dash-global
```
Esta mock incluye 10–12 nodos con diferentes `type`, `parentId`, `order`, `linkedDashboardId`.

---

### 3. HierarchyStorageService (`services/HierarchyStorageService.ts`) [NUEVO]
Espejando la arquitectura asíncrona del `DashboardStorageService`:
- `getNodes(): Promise<HierarchyNode[]>` — retorna todos los nodos.
- `saveNode(node): Promise<void>` — inserta o actualiza un nodo.
- `deleteNode(id): Promise<void>` — elimina nodo (sin validar hüed en esta fase).
- Se auto-inicializa desde el mock si `localStorage` está vacío.

---

### 4. Utilidad `buildTree()` (`utils/hierarchyTree.ts`) [NUEVO]
Función pura que convierte `HierarchyNode[]` en `HierarchyNodeWithChildren[]`, respetando el orden de cada nivel. Esto facilita el render recursivo del árbol.

---

### 5. Componente `HierarchyTree` (`components/admin/HierarchyTree.tsx`) [NUEVO]
Componente visual del árbol navegable:
- render recursivo de nodos con indentación visual;
- ícono por `NodeType` (Folder, Settings, Box, Cpu, etc.) usando `lucide-react`;
- ítems colapsables por nivel (estado de expandión local);
- nodo seleccionado resaltado con el azul `accent-cyan`;
- emit `onSelect(node)` al padre;
- mantiene el Dark Industrial Theme sin modificar styles globales.

---

### 6. Página `HierarchyPage` (`pages/admin/HierarchyPage.tsx`) [NUEVO]
Pantalla de dos paneles:
- **Izquierdo (300px)**: `HierarchyTree` completo, cargado asíncronamente con spinner.
- **Derecho (flex-1)**: Panel de detalle del nodo seleccionado (`NodeDetailPanel`).

#### `NodeDetailPanel` (inline o subcomponente)
Muestra, dado el nodo:
- nombre, tipo y ruta (`breadcrumbs` calculados por ID);
- badge de tipo de nodo (plant, area, equipment, etc.);
- si tiene `linkedDashboardId`: nombre del dashboard + botón "Abrir en Builder";
- si tiene `linkedAssetId`: ID del activo asociado;
- metadata futura: vacía por ahora con label "Sin propiedades adicionales";
- placeholder explícito "Edición de árbol — próxima fase".

---

### 7. Ruta y Navegación (`router.tsx` + `AdminLayout.tsx`)
- Agregar ruta `/admin/hierarchy` apuntando a `HierarchyPage`.
- Activar el link de "Jerarquía de Planta" en el sidebar del `AdminLayout` (actualmente `disabled`).
- Cambiar el label de sección de "Estructura (Próximamente)" a "Estructura".

---

### Lo que queda preparado pero fuera de alcance en esta fase
- Edición inline del nombre del nodo (renombrar).
- Crear / mover / eliminar nodos desde la UI.
- D&D para reordenar jerarquía.
- Asignación de dashboards desde la UI de jerarquía.
- Restricciones de ciclos / validaciones de árbol.

Esas operaciones tendrán la base tipo y de servicio lista para ser implementadas.

---

### Verificación esperada
1. Navegar a `/admin/hierarchy` desde el sidebar del Admin.
2. Ver el árbol con todos los nodos jerárquicos y sus íconos.
3. Expandir y colapsar ramas.
4. Seleccionar "Comprimidora FETTE-2090"; el panel derecho muestra su detalle y el link al dashboard.
5. Hacer click en "Abrir en Builder" y confirmar que navega al builder correcto.
6. Seleccionar el nodo raíz "Planta Steigen" y ver el detalle sin dashboard.
7. Refrescar la página (F5) y verificar que el árbol carga correctamente desde el ServicioStorage.
8. Sin impacto visual en el resto de la aplicación (Visor, Gestor de Dashboards, Builder).

---

## Fase 9 — Trend Chart Funcional (Expansión de Catálogo)

### Objetivo
Implementar un widget de gráfico de tendencia (`trend-chart`) completamente funcional usando **Recharts v3** (ya instalado). El widget debe renderizar una serie temporal con estética industrial, soportar binding real/simulado, y ser insertable y configurable desde el Builder.

---

### 1. Generador de datos temporales (`utils/trendDataGenerator.ts`) [NUEVO]
Función pura que genera un array de puntos `{ time: string, value: number }` para simular una serie temporal:
- Acepta parámetros: `baseValue`, `variance`, `pointCount` (por defecto 20).
- Genera timestamps con intervalos de 1 minuto hacia atrás desde "ahora".
- Se usa tanto para el modo simulado como para el modo real cuando falte historial.

---

### 2. Renderer `TrendChartWidget` (`widgets/renderers/TrendChartWidget.tsx`) [NUEVO]
Componente renderer que:
- Usa `resolveBinding()` para obtener el valor actual (como referencia de base).
- Genera una serie temporal con `generateTrendData(baseValue)`.
- Renderiza un `<ResponsiveContainer>` + `<LineChart>` de Recharts con:
  - Línea principal con color `accent-cyan` y stroke suave.
  - Área bajo la curva con gradiente transparente.
  - Grid oscuro coherente con el Dark Industrial Theme.
  - Ejes X (tiempo) e Y (valor) con font y colores del sistema.
  - Tooltip estilizado con glassmorphism.
  - Si hay thresholds, líneas horizontales `<ReferenceLine>` roja/naranja.
- Panel glass con título del widget y unidad.
- Altura mínima mayor que las metric cards (ej. `min-h-[220px]`).

---

### 3. Registro en `WidgetRenderer` dispatcher
Añadir el caso `'trend-chart'` en el `switch` del `WidgetRenderer.tsx` que delegue al nuevo `TrendChartWidget`.

---

### 4. Configuración del Builder (sin cambios en CatalogSidebar)
El catálogo ya incluye el entry `{ type: 'trend-chart', label: 'Gráfico de Tendencia' }`. Al insertar este tipo:
- Se creará con `w: 2` por defecto (ocupa 2 columnas) para que el gráfico se vea cómodo.
- El `PropertiesPanel` existente ya permite editar título, binding y thresholds.

---

### 5. Ajuste de ancho por defecto en `DashboardBuilderPage`
Actualizar `handleAddWidget` para asignar `w: 2` cuando el `type === 'trend-chart'`, en lugar del `w: 1` genérico.

---

### Verificación esperada
1. Abrir el Builder de un Dashboard.
2. Agregar un "Gráfico de Tendencia" desde el catálogo.
3. Verificar que aparece un LineChart con datos simulados, estilo dark industrial, y ocupa 2 columnas.
4. Cambiar el binding a una variable real (ej: Velocidad de eq-001) y ver la serie generada alrededor de ese valor base.
5. Agregar un threshold y ver la `ReferenceLine` horizontal.
6. Guardar, hacer F5 y verificar persistencia del trend-chart.
7. Sin regresión visual en otros widgets ni el Visor.

---

## Fase 10 — Duplicación de Dashboards y Templates

### Objetivo
Volver el builder reutilizable a escala. Un administrador debe poder clonar dashboards existentes, guardar la estructura de un dashboard como template, y crear nuevos dashboards a partir de un template — cambiando solo los bindings necesarios.

---

### 1. Duplicación de Dashboard (`DashboardStorageService`) [MODIFICAR]
Añadir el método `duplicateDashboard(id, newName)`:
- Carga el dashboard original.
- Genera nuevo `id` y reasigna IDs internos de widgets/layout.
- Asigna `status: 'draft'`, `version: 1`, `isTemplate: false`.
- Opcionalmente permite elegir si conservar o resetear los bindings.
- El dashboard duplicado se guarda y se retorna.

---

### 2. TemplateStorageService (`services/TemplateStorageService.ts`) [NUEVO]
Servicio async con localStorage, misma arquitectura que DashboardStorageService:
- `getTemplates(): Promise<Template[]>`
- `saveTemplate(template): Promise<void>`
- `deleteTemplate(id): Promise<void>`
- `createFromDashboard(dashboard, templateName): Promise<Template>` — extrae widgets y layout como presets.

---

### 3. Mock de templates (`mocks/template.mock.ts`) [NUEVO]
Un template inicial de ejemplo:
- "Comprimidora Estándar" — con presets de widgets de velocidad, fuerza y estado.

---

### 4. DashboardManagerPage [MODIFICAR]
- Conectar el botón de Duplicar (ya existe pero sin handler) al nuevo método `duplicateDashboard`.
- Añadir botón "Guardar como Template" en las acciones de cada dashboard.
- Añadir sección de Templates debajo del listado de dashboards (tabla similar, con acciones: "Crear Dashboard desde Template" y "Eliminar").

---

### 5. Crear Dashboard desde Template
Nuevo método en `DashboardStorageService`:
- `createFromTemplate(template, name): Promise<Dashboard>` — toma los `widgetPresets` y `layoutPreset` del template, genera IDs nuevos, crea el dashboard como `draft` y lo guarda.

---

### 6. Indicador visual de template en Builder
Si el dashboard fue creado desde un template (`templateId` presente), mostrar un badge sutil "Basado en template: X" en el header del Builder.

---

### Lo que queda fuera de esta fase
- Editar templates directamente (se editan recreándolos desde un dashboard).
- Template de widget individual.
- Herencia de templates (cambios propagados).

---

### Verificación esperada
1. En el Gestor, duplicar un dashboard existente → verificar que aparece la copia como draft.
2. Abrir la copia en el Builder → verificar que tiene los mismos widgets y layout.
3. Guardar un dashboard como template → verificar que aparece en la sección de Templates.
4. Crear un nuevo dashboard desde el template → verificar que se genera con los widgets preconfigurados.
5. El dashboard creado desde template muestra badge "Basado en template".
6. Eliminar un template → verificar que desaparece sin afectar dashboards existentes.
7. F5 → todo persiste.

---

## Fase 11 — Sistema de Publicación (Draft vs Published)

### Objetivo
Establecer un ciclo de vida real para los dashboards. El Builder permitirá trabajar en modo "Borrador" (`draft`) y, una vez listo, "Publicar" (`published`). El Visor principal de la planta (la pantalla de inicio del operario) dejará de ser estático y pasará a consumir únicamente los dashboards publicados desde el storage.

---

### 1. Acciones del Builder (`DashboardBuilderPage`) [MODIFICAR]
- Reemplazar el botón único "Guardar Cambios" por dos acciones:
  - **Guardar Draft**: Guarda los cambios asegurando `status: 'draft'`. Si el dashboard estaba publicado, hacer un cambio y guardar lo devuelve a estado `draft`.
  - **Publicar**: Guarda los cambios (si los hay) y establece `status: 'published'`, incrementando la `version`.
- Añadir un badge visual claro en el header que indique si se está viendo la versión pública o si hay cambios no publicados.

---

### 2. DashboardStorageService [MODIFICAR]
- `publishDashboard(id)`: Busca el dashboard, cambia status a `published`, hace `version++`, y guarda.

---

### 3. Visor Dinámico (`pages/Dashboard.tsx`) [RECHAZAR HARDCODE → DINÁMICO]
Actualmente, `Dashboard.tsx` es la ruta `/` y contiene un mockup estático (cards cableadas de OEE, Producción, etc.).
- **Refactorizar** el archivo para que cargue asíncronamente los dashboards desde `DashboardStorageService`.
- **Filtrar**: Obtener solo los que tienen `status === 'published'`.
- Si **no hay** publicados: Mostrar un *empty state* elegante "No hay vistas operativas publicadas. Contacte a un administrador."
- Si **hay** publicados: Tomar el primero (o permitir tabs si hay múltiples) y renderizar su contenido utilizando el mismo grid del builder pero estático (`isDraggable={false}`, `isResizable={false}`).
- Reutilizar el componente `WidgetRenderer` actual para asegurar paridad visual 1:1 entre Builder y Visor.

---

### 4. Componentización del Canvas de Lectura (`components/viewer/DashboardViewer.tsx`) [NUEVO]
- Extraer la lógica de renderizado del grid de react-grid-layout en modo lectura puro, para usar en el Visor. Similar a `BuilderCanvas` pero sin handlers de drop ni drag.

---

### Verificación esperada
1. Entrar al Admin, crear un dashboard (queda en estado Draft).
2. Ir a la ruta raíz `/` (Visor) → ver el empty state porque no hay nada publicado.
3. Volver al Builder, apretar "Publicar".
4. Ir al Visor `/` → comprobar que el dashboard aparece igual que en el builder, interactivo (thresholds reactivos) pero bloqueado en su estructura (no se puede arrastrar).
5. Editar un widget en el builder y Guardar Draft → El Visor sigue viendo la versión vieja? (En este MVP, `localStorage` muta el mismo objeto, así que al guardar borrador, el visor no lo verá si filtramos por "published", pero al guardar draft pasará a status "draft" y *desaparecerá* del visor público hasta ser republicado. Es el comportamiento intencionado para V1: no hay control de doble versión paralela en la misma base de datos local).

---

## Fase 12 — Edición Operativa de la Jerarquía

### Objetivo
Volver dinámica la jerarquía de planta. Completar el placeholder actual en `NodeDetailPanel` para permitir crear hijos, borrar nodos, renombrarlos y reubicarlos en el árbol, manteniendo la consistencia de los parentescos y previniendo ciclos.

---

### 1. Extensión de HierarchyStorageService [MODIFICAR]
- Añadir validación en `deleteNode(id)`: verificar si tiene hijos (`parentId === id`). Si los tiene, lanzar error local simulado o retornar _false_.
- Añadir método `updateNodeParent(id, newParentId)`: validar que `newParentId` no sea un descendiente del `id` (para evitar referencias circulares infinitas) antes de actualizar y guardar.
- Retornar un ID seguro en la creación de nodos nuevoss (`hier-${Date.now().toString(36)}`).

---

### 2. NodeDetailPanel interactivo (`pages/admin/HierarchyPage.tsx`) [MODIFICAR]
- **Renombrar**: Cambiar el `<h1>` por un `input` o doble clic a `input` que despache un `onUpdateNode`.
- **Añadir Hijo**: Botón primario "+ Añadir Nodo Hijo" que abra un pequeño popup/modal o expanda un sub-panel para pedir `Nombre` y `Tipo` (usando `NODE_TYPE_LABELS`). Llama a `onCreateChild(name, type)`.
- **Mover**: Botón "Cambiar Ubicación" que permita elegir el nuevo padre mediante un modal con un `<select>` o mini-árbol de nodos válidos. Llama a `onMoveNode(newParentId)`.
- **Eliminar**: Botón rojo "Eliminar Nodo". Si tiene hijos, se deshabilita con un tooltip o muestra un alert avisando que no se puede. Llama a `onDeleteNode()`.

---

### 3. Asignación de Dashboards [MODIFICAR]
- En la sección "Dashboard vinculado", en vez de solo mostrar el label estático, agregar un botón de "Cambiar" que abra un simple Select con la lista de dashboards `(dashboards.map(...))` fetched de `DashboardStorageService` para asignar rápidamente qué vista representa ese nodo.

---

### 4. Layout Izquierdo (Catálogo/Nav) [MODIFICAR]
- Añadir un botón flotante pequeño o icono `+` en la cabecera ("Estructura de Planta") para añadir **Nodos Raíz** directamente (plantas o locaciones principales que no tengan `#parentId`).

---

### Verificación esperada
1. Poder crear un nodo raíz "Planta B" y un hijo "Sector 1".
2. Intentar borrar "Planta B" → Bloqueado (tiene a Sector 1).
3. Seleccionar "Sector 1", darle a "Mover" y mandarlo como hijo a la "Planta Principal" original.
4. Borrar "Planta B" vacía → Éxito.
5. Cambiar el nombre a un nodo y enlazarle un Dashboard. F5 y que todo siga ahí.

---

## Fase 13 — Panel de Propiedades Enriquecido

### Objetivo
Fortalecer la capacidad configurativa del Builder permitiendo editar las opciones visuales y de formato de los widgets seleccionados directamente desde el panel de propiedades. Esto permite instanciar el mismo "Metrics Card" crudo, pero convertirlo visualmente en un medidor de temperatura, presión o velocidad puramente con configuración de UI.

---

### 1. Extensión en Tipado (`domain/admin.types.ts`) [MODIFICAR]
- Emplear el campo existente `displayOptions?: Record<string, unknown>` en `WidgetConfig` (o asegurar un tipado equivalente) para almacenar información puramente visual:
  - `icon` (string) — nombre del ícono Lucide.
  - `subtext` (string) — pequeña bajada de línea bajo el valor.
- Usar el campo `unit` ya existente en `WidgetBinding` para concatenación de magnitud.

---

### 2. Ampliación del Panel Derecho (`PropertiesPanel.tsx`) [MODIFICAR]
- Agregar una nueva sección "Visualización & Formato" entre "Identidad / Layout" y "Binding".
- Controles a añadir:
  - **Ícono**: Un `<select>` con un diccionario predefinido de íconos representativos en la industria (ej: `Activity`, `Thermometer`, `Zap`, `Droplet`, `Gauge`, `Wind`, `Settings`).
  - **Unidad**: Un `<input>` de texto (ej. `°C`, `bar`, `RPM`, `%`). Mutea `widget.binding.unit`.
  - **Subtexto**: Un `<input>` de texto para texto aclaratorio (ej. "Rotor Principal"). Mutea `widget.displayOptions.subtext`.

---

### 3. Ajuste de Renderers (`widgets/renderers/*`) [MODIFICAR]
- Refactorizar los widgets para que lean y expongan las nuevas configuraciones:
  - **`MetricsCardWidget`**: Fallbackeando a íconos definidos (y usando un helper para mapear nombre a componente Lucide). Usar `binding?.unit` y mostrar `displayOptions?.subtext` en el layout.
  - **`StatusBadgeWidget`** (opcional si aplica subtexto).

---

### Verificación esperada
1. Seleccionar un Metrics Card nuevo.
2. Añadir en el panel: Ícono "Termómetro", Unidad "°C", Subtexto "Temperatura del sistema".
4. Validar persistencia tras "Guardar Draft".

---

## Fase 14 — Resize Dinámico de Widgets

### Objetivo
Permitir a los administradores ajustar bidimensionalmente (Ancho y Alto) el tamaño de cada widget en el dashboard, arrastrando una "manija" visual (handle) desde la interfaz del Canvas. Esto reemplaza/complementa la dependencia exclusiva del panel de propiedades para setear el tamaño y habilita interfaces más ricas (como gráficos que requieran mayor altura).

---

### 1. Sistema de Filas (Row-Span) en el Canvas (`BuilderCanvas.tsx`) [MODIFICAR]
- La propiedad `h` (height) ya existe en `WidgetLayout`. 
- Actualmente la grilla usa `col-span-[w]` pero la altura está atada al contenido o a un `min-h-[140px]`.
- Mapear `item.h` explícitamente a clases `row-span-1`, `row-span-2`, etc.
- Definir un alto de fila base consistente para el grid, usando `auto-rows-[140px]` o un valor nominal coherente con el estilo industrial, para que `h=2` duplique visualmente la altura.

---

### 2. Controladores de Resize (`ResizeHandle`) [NUEVO / MODIFICAR]
- En `BuilderCanvas.tsx`, cuando un widget esté seleccionado o en *hover* (modo edición), renderizar un pequeño componente visual `ResizeHandle` en la esquina inferior derecha `(↘)`.
- Implementar eventos puros o semi-puros de React (`onPointerDown`, `onPointerMove`, `onPointerUp`) de la forma más resiliente posible, para detectar cuántas columnas/filas nos hemos desplazado:
  - Calcular el delta de Pixeles X e Y.
  - Dividir el delta por el ancho/alto promedio de una celda.
  - Transformar el delta en `+1`, `-1` columna/fila.
- Disparar `onResize(widgetId, newW, newH)` asegurando topes (ej. `w` mín. 1, máx. 4; `h` mín. 1).

---

### 3. Actualización de Opciones en Panel Derecho (`PropertiesPanel.tsx`) [MODIFICAR]
- Como el resize también debe ser controlable por teclado o menús precisos, agregar al lado del select actual de "Ancho" un select idéntico de "Alto en Grilla (Filas)" que modifique `selectedLayout.h`.
- Esto garantiza accesibilidad y recuperación en caso de malfuncionamiento del arrastre.

---

### 4. Ajustes Finos en Componentes de Renderizado [MODIFICAR]
- Asegurarse de que `MetricCard`, `TrendChartWidget`, etc., tengan `h-full` para expandirse y llenar completamente el `row-span-X` asignado por la nueva grilla flexible, sin desbordarse ni dejar espacios vacíos.

---

### Verificación esperada
1. Entrar al Builder con un o varios widgets.
2. Desde el panel derecho, cambiar el alto de 1 a 2. El widget debe verse el doble de alto.
3. Arrastrar la manija de la esquina inferior derecha del widget y redimensionar interactivamente a 3 de ancho y 2 de alto.
4. Soltar y ver cómo la grilla se ajusta mediante CSS Grid.
5. El estado del Dashboard cambia a "Draft". Guardar y recargar con `F5` certificando que todo persiste.
