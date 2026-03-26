# 🏭 Plataforma HMI/SCADA Web Industrial: Arquitectura y Diseño UI (v2)

**Visión de Producto:** Una plataforma que combina la solidez y confiabilidad de sistemas como Ignition o AVEVA con la estética de **"Tecnología premium moderna"**. La interfaz actúa como un puente entre la innovación de un laboratorio de alta tecnología y la robustez requerida en una planta industrial.

**Identidad Estética ("Dark Industrial UI"):** 
- **Fondo base:** Tonos oscuros profundos (Ej. Carbón/Azul Noche) para reducir la fatiga visual en centros de control operativos 24/7.
- **Acentos:** Colores vibrantes y precisos (Neón cian para funcionamiento normal, Ámbar para advertencias, Rojo Rubí para alarmas críticas).
- **Materialidad:** Uso sutil de "glassmorphism" en paneles flotantes para dar sensación de profundidad y tecnología avanzada, bordes nítidos y sin exceso de adornos.
- **Tipografía:** Sans-serif técnica y altamente legible (Ej. *Inter*, *Roboto Mono* para datos numéricos).

---

## 1. Modos de la Plataforma

La plataforma contempla dos modos principales de uso, separados por un estricto control de acceso (RBAC):

- **👁️ Modo Operación (Visualización y Control):** Orientado a operadores, supervisores y gerencia. Permite navegar por la planta, visualizar dashboards, tendencias, reconocer alarmas y operar equipos si los permisos lo permiten.
- **⚙️ Modo Configuración (Administración):** Entorno exclusivo para administradores e ingenieros de sistema. Habilita la creación de activos, edición de plantillas, binding de variables con el Edge, gestión de usuarios y publicación de dashboards globales.

---

## 2. Arquitectura Conceptual de la Plataforma

La arquitectura es **agnóstica a los datos** (data-agnostic) y se basa en una separación estricta de responsabilidades entre el hardware de borde, la estructuración semántica y la visualización.

```mermaid
graph TD
    %% Capa Edge
    subgraph Capa 3: Edge Computing
        PLC1[PLCs / Sensores] --> EdgeGateway[Edge Node / Gateway IoT]
        PLC2[Sistemas Soporte] --> EdgeGateway
        EdgeGateway -.->|Raw Data Tags: edge.tag.value| MQTT_Kafka((Broker MQTT / Eventos))
    end

    %% Capa Logica
    subgraph Capa 2: Motor de Plataforma (Backend)
        MQTT_Kafka --> TagEngine[Motor de Tag Binding]
        TagEngine <--> TypeLibrary[(Biblioteca Tipos Variables)]
        TagEngine <--> AssetModel[(Modelo de Activos)]
        AssetModel --> ContextAPI[API de Contexto Operativo]
        ContextAPI --> TimeSeriesDB[(Time-Series DB / Historian)]
    end

    %% Capa UI
    subgraph Capa 1: UI Premium Moderna (Frontend Web)
        ContextAPI --> WebGraph[GraphQL / REST / WebSockets]
        WebGraph --> DashboardUI[Dashboards / Tendencias]
        WebGraph --> AlarmsUI[Gestión de Alarmas]
        WebGraph --> AssetUI[Explorador de Activos]
    end

    %% Vinculacion
    Admin(Administrador) -.-> |Mapeo Visual| TagEngine
```

---

## 3. Modelo de Activos, Variables y Tags

### A. Identidad Única de Activos y Variables
Para garantizar la robustez del sistema frente a cambios de nomenclatura en planta, se implementa una separación estricta entre identificadores internos y nombres de visualización:
- **Activo:** `ID Interno Único` (UUID, inmutable), `Nombre Visible` (Editable), `Tipo de Activo`, `Posición Jerárquica`, `Estado` (Activo/Inactivo).
- **Variable:** `ID Interno Único` (UUID), `Nombre Visible` (Editable), `Tipo de Variable`, `Activo Asociado`.

### B. Plantillas de Activos (Templates)
Para escalar la plataforma rápidamente a nuevas líneas o plantas, el **Modo Configuración** permite crear y utilizar plantillas.
- **Ejemplo - Plantilla "Comprimidora Estándar":**
  - Define una estructura base de variables (Temperatura de rotor, Velocidad, Estado).
  - Define las alarmas o límites por defecto.
  - Al instanciar un nuevo equipo basado en la plantilla, el sistema genera de forma automática la estructura y el layout de detalle; solo resta hacer el *Tag Binding* con el Edge.

### C. Separación Estratégica: Tipo de Variable vs Visualización (Widget)
El motor de datos está puramente enfocado en la naturaleza semántica de la variable, desvinculado por completo de cómo se dibuja en pantalla.
- **El Tipo de Variable (Data Type) define:**
  - Unidad (Ej. `°C`, `RPM`, `%`).
  - Precisión (Ej. `2 decimales`).
  - Tipo de dato (Numérico, Booleano, Cadena).
  - Rangos de ingeniería posibles (Límite Mínimo / Máximo).
- **El Componente Visual (Widget) define:**
  - Si esta variable se mostrará en pantalla como un *Gauge circular*, un *KPI de texto*, un *Gráfico de tendencia* o un *Indicador de estado (Semáforo)*.
  - *Ventaja:* Una misma variable de temperatura puede renderizarse simultáneamente como un texto simple en el dashboard de planta y como un termómetro animado en la pantalla de detalle del equipo.

---

## 4. Estructura de Navegación y Búsqueda Global

### A. Buscador Global Avanzado (Omnibar)
Un componente central en el *Topbar* (tipo Spotlight de macOS) que permite localizar instantáneamente información en plantas masivas:
- **Criterios de búsqueda:** Nombre de equipo, ID de variable (Alias), Tipo de activo, Área, o estado de alarma.
- **Acciones rápidas:** Saltar directo a la "Pantalla de Equipo", abrir la "Tendencia Histórica" de una variable, o navegar al "Dashboard" interrelacionado.

### B. Navegación Principal
Un sistema lateral colapsable (Sidebar) apoyado por rastros de migas (*Breadcrumbs*) para máxima orientación espacial:
1. 🏠 **Visión General (Home)** - Dashboards configurables.
2. 🗂️ **Explorador de Activos** - Árbol jerárquico.
3. 📈 **Análisis y Tendencias**
4. 🚨 **Gestión de Alarmas**
5. 📦 **Trazabilidad y Producción**
6. ⚙️ **Administración (Solo Modo Config)**

---

## 5. Modelo Multiusuario de Dashboards

El sistema de dashboards es flexible y jerárquico, permitiendo distintos niveles de colaboración e impacto:

1. **Dashboards Personales:** 
   - Creados por cualquier usuario para su propio seguimiento diario (Ej. Un operador armando un panel con sus 5 KPIs favoritos). Son privados por defecto.
2. **Dashboards Compartidos por Rol:** 
   - Tableros específicos para áreas operativas (Ej. "Mantenimiento Mecánico", "Supervisión HVAC").
   - Pueden ser compartidos y consultados por todos los miembros que heredan ese perfil de permisos.
3. **Dashboards Globales de Planta:**
   - Tableros "oficiales" y de solo lectura para la mayoría de los usuarios.
   - Solo los usuarios con rol de **Administrador** o **Ingeniería** (Modo Config) pueden crearlos, modificarlos y publicarlos a nivel general (Ej. La pantalla principal proyectada en un gran monitor en el Centro de Control).

---

## 6. Flow de Administración: Tag Binding & Modelo de Datos

Proceso "Agnóstico a los Datos" para asociar la conceptualización visual con los datos en bruto (*raw data*) provenientes del Edge.

```mermaid
sequenceDiagram
    autonumber
    participant Admin as 👩‍💻 Administrador
    participant UI as 🖥️ Interfaz Admin
    participant Modelo as 🧠 Modelo de Activos
    participant Bridge as 🌉 Motor Tag Binding
    participant Edge as 🏭 Edge / MQTT
    
    Admin->>UI: 1. Instancia equipo desde Plantilla "Comprimidora"
    UI->>Modelo: Crea Entidad Lógica (Variables en blanco)
    Admin->>UI: 2. Abre "Panel de Tag Binding"
    UI->>Bridge: Solicita lista de Tags huérfanos del Edge
    Bridge->>Edge: Query Live Tags
    Edge-->>UI: Devuelve [edge.c2.t1, edge.c2.p1, ...]
    Admin->>UI: 3. Arrastra `edge.c2.t1` sobre la variable "Temp. Rotor"
    UI->>Bridge: Crea enlace definitivo (Binding)
    Bridge-->>UI: Visualización en verde (Binding Activo: 24.5 °C)

---

## 7. Escalabilidad (200+ Equipos) y Preparación para IA

Para asegurar que la plataforma mantenga un rendimiento óptimo al escalar a cientos de equipos (ej. 200 comprimidoras, mezcladoras, etc.) y esté lista para integrarse con Inteligencia Artificial, la arquitectura combina principios de diseño agnóstico con implementaciones técnicas pragmáticas.

### A. Estrategia de Escalabilidad (Front-end y Datos)
Actualmente, la UI está conceptualizada de forma modular. Para operar a nivel de producción masiva, se requiere la siguiente pila técnica:

1. **Gestión de Estado Global y Caché:** 
   - Transición de datos locales a manejadores de estado robustos como **Zustand** o **React Query**. Esto asegura que la UI solo se actualice cuando los datos del equipo específico cambien, sincronizando la vista sin re-renderizar toda la aplicación.
2. **Virtualización de Componentes:** 
   - Para grillas con 200+ equipos o historiales de 10,000+ alarmas, se utiliza **virtualización** (ej. `react-virtual`). El navegador solo mantiene en memoria y renderiza los elementos DOM estrictamente visibles en pantalla.
3. **Flujo de Datos en Tiempo Real (Gateway):** 
   - El Frontend se desvincula de las máquinas físicas conectándose a un **Gateway Central de Datos** (ej. OPC-UA/MQTT Broker). Las actualizaciones fluyen hacia la UI mediante **WebSockets** o **Server-Sent Events (SSE)**, consumiendo un ancho de banda mínimo.
4. **Enrutamiento y Componentes Dinámicos:** 
   - El sistema de rutas (`/equipment/:id`) permite instanciar infinitos equipos. Los widgets principales (`EquipmentDetail`, `TrendWidget`, tarjetas de estado) son moldes vacíos que se llenan inyectando el ID del equipo en la API.

### B. Arquitectura "AI-Friendly" (Integración de Agentes)
Gracias a la naturaleza de Single Page Application (SPA), el enfoque *API-First* y la separación estricta de responsabilidades, la plataforma es ideal para incorporar Inteligencia Artificial:

1. **Interoperabilidad en la Capa de Datos:** 
   - Como la UI es "tonta" (solo dibuja datos) y no tiene lógica de control dura embebida, la IA puede conectarse al mismo bus de datos (API) que alimenta el HMI.
   - Los contratos de datos rígidos garantizan que los agentes puedan suscribirse a tópicos y emitir comandos de forma predecible.
2. **Topología de Casos de Uso Acelerados para IA:**
   - **Detección de Anomalías / Mantenimiento Predictivo:** Un agente ML (Machine Learning) corre en backend consumiendo telemetría. Al detectar una posible falla, inyecta su predicción en la base de datos; la UI simplemente reacciona dibujando una alerta visual en el panel correspondiente.
   - **Copiloto LLM Contextualizado:** Un Chat Widget para el operador, cuyo `<system_prompt>` es inyectado constantemente con el fragmento del estado global (*store*) del equipo que el usuario está viendo, permitiéndole diagnosticar problemas en lenguaje natural sobre datos en vivo.
   - **Optimización de Procesos (Human-in-the-loop):** Un agente evalúa el OEE y sugiere una receta óptica. La UI recibe el evento y presenta la sugerencia al operador humano, quien realiza el click final de aprobación antes de que el evento de control baje a la red industrial.
```
