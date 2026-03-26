# 🖥️ Wireframes Detallados: Pantallas Principales HMI

Este documento describe la disposición estructural y funcional de las dos pantallas más representativas de la plataforma HMI, reflejando el modelo conceptual actualizado y manteniendo la estética de **"Tecnología premium moderna"** (Dark Industrial UI).

---

## 1. Dashboard General de Planta (Vista Centro de Control)

Esta pantalla actúa como el punto de entrada principal (Dashboard Global). Está diseñada para brindar consciencia situacional inmediata sobre el macro-estado de la planta sin abrumar con datos hiper-técnicos superficiales.

```text
+-------------------------------------------------------------------------------------------------+
| [🛡️ LOGO] Plataforma | 🔍 Buscar equipo, variable o tag... (Ctrl+K)    | ⏱️ 14:32:05 | 👤 Admin ⚙️ |
+-------------------------------------------------------------------------------------------------+
| 🏠 Dashboards   | BREADCRUMB: Planta Pharma Norte > Dashboards Globales > Visión General Sólidos|
|   ↳ Globales    +-------------------------------------------------------------------------------+
|   ↳ Por Rol     | [📊 WIDGET: KPIs Globales de Planta ]                                         |
|   ↳ Mis Dash.   |  +----------------+ +----------------+ +----------------+ +----------------+  |
|                 |  | OEE Global     | | Unidades Prod. | | Alarmas Crític | | Consumo Energ. |  |
| 🗂️ Explorador   |  |     78.4 %     | |     142,500    | |      🔴 3      | |    4.2 MW/h    |  |
|                 |  |  +2% vs ayer   | |  Lote: PROD-99 | |  Revisar ahora | |   Estable      |  |
| 📈 Tendencias   |  +----------------+ +----------------+ +----------------+ +----------------+  |
|                 |                                                                               |
| 🚨 Alarmas      | [🏭 WIDGET: Mapa/Estado de Áreas Principales ]                                |
|        (3)      |  +-------------------------+ +-------------------------+                      |
|                 |  | ÁREA: COMPRESIÓN        | | ÁREA: RECUBRIMIENTO     |                      |
| 📦 Trazabilidad |  | Estado: 🟢 PRODUCIENDO  | | Estado: 🟡 ALARMA BAJA  | ... [+] Añadir Widget|
|                 |  | Equipos Activos: 4/5    | | Equipos Activos: 2/2    |                      |
|                 |  | Lote Actual: BCTX-109   | | Lote Actual: ---        |                      |
| ⚙️ Config       |  +-------------------------+ +-------------------------+                      |
|                 |                                                                               |
|                 | [📈 WIDGET: Tendencia de Producción vs Target ]                               |
|                 |  +-------------------------------------------------------------------------+  |
|                 |  |  |       /                                                              |  |
|                 |  |  |      / ------ (Target)                                               |  |
|                 |  |  |   /\/                                    [ Leyenda: 🟢 Prod ⚪ Obj ] |  |
| [🟢 Edge OK]    |  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------------------------+
```

### 🧠 Detalles Funcionales (Dashboard General)
- **Barra de Búsqueda Global (Omnibar):** Centrada en el Topbar. Presionando `Ctrl+K` se despliega e indexa (gracias a los ID internos e Indexación Ágil) equipos, tags huérfanos, dashboards compartidos y alias reconocidos. 
- **Modos Visuales (Top Right):** El ícono `⚙️` indica que el usuario actual tiene permisos administrativos y puede alternar la inferfaz hacia el Modo Configuración (habilitando arrastrar widgets o editar layouts).
- **Widgets Agnósticos:** El concepto de separación Variable/Widget brilla aquí. El "Consumo Energético" se visualiza como un *KPI Text* simplificado en el primer nivel de widgets, aunque por debajo provenga de la misma entidad de datos compleja de la planta.
- **Diseño de Tarjetas Magnéticas:** Los widgets residen sobre contenedores flotantes sutiles con bordes minimalistas (glassmorphism oscuro) que asientan un flujo visual limpio, evitando divisiones rígidas con líneas gruesas.

---

## 2. Pantalla de Detalle de Equipo (Ej: Comprimidora 2)

Esta vista se auto-genera derivando de la funcionalidad de las **Plantillas de Activos**. Permite al operador hacer *Drill-Down* y enfocarse en micro-detalles, diagnósticos o comportamiento a corto plazo de un equipo individual.

```text
+-------------------------------------------------------------------------------------------------+
| [🛡️ LOGO] Plataforma | 🔍 Buscar equipo, variable o tag... (Ctrl+K)    | ⏱️ 14:35:12 | 👤 Admin ⚙️ |
+-------------------------------------------------------------------------------------------------+
| 🏠 Dashboards   | BREADCRUMB: Planta Pharma Norte > Compresión > Línea 1 > ⚙️ Comprimidora 2    |
|                 +-------------------------------------------------------------------------------+
| 🗂️ Explorador   | HEADER DEL INSTANCIA (De Plantilla: Comprimidora) [⭐ Favorito] [📈 Ver Trend]|
|  ↳ Línea 1      |  [ 🟢 PRODUCIENDO ] | Receta: ASRP-500mg | Último Mantenimiento: Hace 14 días |
|    ↳ ⚙️ Comp 1  +-------------------------------------------------------------------------------+
|    ↳ ⚙️ Comp 2  | [📊 VARIABLES DE PROCESO (Widgets Gauges) ]   | [⚙️ DIAGNÓSTICO ESTADO EQUIPO]    |
|    ↳ ⚙️ Comp 3  |  +--------------+  +--------------+           |  +------------------------------|
|                 |  | Veloc. Rotor |  | Fuerz. Comp. |           |  | 🌡️ Temp. Motor Prin: 52°C  |
| 📈 Tendencias   |  |   45.0 RPM   |  |    12.4 kN   |           |  | ⚡ Consumo Eléctrico: 4.5 kW|
|                 |  |  [||||||  ]  |  |  [||||||| ]  |           |  | 📳 Vibración Eje: OK       |
| 🚨 Alarmas      |  +--------------+  +--------------+           |  +------------------------------|
|                 |  +--------------+  +--------------+           |                                 |
| 📦 Trazabilidad |  | Prod. Actual |  | Humedad Sala |           | [🚨 ALARMAS (Instancia Local)]  |
|                 |  | 1,200 uds/m  |  |    42.1 %    |           |  +------------------------------|
|                 |  |              |  |              |           |  | 🟡 14:10 | Nivel tolva bajo |
| ⚙️ Config       |  +--------------+  +--------------+           |  +------------------------------|
|                 |-----------------------------------------------+---------------------------------|
|                 | [📈 MINI-TENDENCIAS: Últimos 60 minutos ]          [⏱️ 1h] [⏱️ 8h] [⏱️ 24h]   |
|                 |  +-------------------------------------------------------------------------+  |
|                 |  | (Gráfico incrustado de alta performance temporal)                       |  |
|                 |  |  --- 🟢 Veloc.    --- 🔵 Fuerza    ........... 🔴 Límite Alarma         |  |
| [🟢 Edge OK]    |  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------------------------+
```

### 🧠 Detalles Funcionales (Pantalla de Equipo)
- **Header del Activo:** Consolida el estado operativo primario mediante semántica de color masiva. Esto permite ver a la distancia si la salud general del "Activo X" es verde (produciendo), ámbar (bloqueada/limpieza) o roja (falla).
- **Bloque Variables de Proceso:** Muestra representaciones visuales que definen la plantilla del activo. La variable "Velocidad de Rotor" fue configurada para visualizarse mediante un `Widget Linear Bar`, dándole una escala rápida (Ej. 0 a 100) al ojo humano.
- **Bloque Diagnóstico Rápido:** Lista sencilla (List Widget) para variables o sensores secundarios en los que la información analógica detallada no aporta gran valor per sé, sino saber su valor numérico específico.
- **Gráfico de Área Incrustado (Mini-Tendencia):** Proporciona un visor temporal directamente pre-vinculado a las variables críticas de la máquina para diagnósticos de nivel de piso en tiempo real sin salir al explorador pesado de tendencias general. Limitado típicamente a 24 horas.
