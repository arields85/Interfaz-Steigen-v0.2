# Design System — HMI Industrial Platform
## Guía de Estilo Visual Oficial · Baseline v1.0

> **Estado:** Activo — Baseline visual oficial del proyecto.
> Esta guía documenta el lenguaje visual ya implementado en la UI.
> Cualquier cambio debe respetar estos fundamentos antes de introducir variantes.

---

## 1. Paleta de Colores

### 1.1 Fondos y Superficies

| Token | Valor | Uso |
|---|---|---|
| `--color-industrial-bg` | `#05070a` | Fondo global de la aplicación. El negro más profundo. |
| `--color-industrial-surface` | `#0e1117` | Superficie base de paneles y cards. |
| `--color-industrial-hover` | `#161b22` | Superficie en estado hover interactivo. |
| `--color-industrial-border` | `rgba(255,255,255,0.08)` | Bordes sutiles entre elementos. |

### 1.2 Tipografía y Texto

| Token | Valor | Uso |
|---|---|---|
| `--color-industrial-text` | `#f1f5f9` | Texto principal y valores primarios. |
| `--color-industrial-muted` | `#94a3b8` | Labels, subtítulos, valores secundarios. |
| Texto técnico auxiliar | `#8F9BB3` | Ejes de gráficos, timestamps, metadata. |
| Texto crítico desactivado | `#4a5568` | Placeholders, inputs no activos. |

### 1.3 Acentos Funcionales

| Token | Valor hex | Semántica de uso |
|---|---|---|
| `--color-accent-cyan` | `#22d3ee` | Acento primario, estado normal/running, métricas principales |
| `--color-accent-purple` | `#a855f7` | Acento secundario, producción, tendencias secundarias |
| `--color-accent-pink` | `#ec4899` | Acento terciario, decorativo controlado |
| `--color-accent-blue` | `#3b82f6` | Interactivo, acción y foco |
| `--color-accent-blue-glow` | `#60a5fa` | Variante glow del azul |
| `--color-accent-green` | `#10b981` | Estado online/produciendo/normal |
| `--color-accent-amber` | `#f59e0b` | Estado warning/advertencia/alerta media |
| `--color-accent-ruby` | `#ef4444` | Estado critical/alarma/error |

### 1.4 Regla cromática semántica

Los colores de acento siempre indican semántica operativa, **nunca decoración**:

- 🟢 Cyan/Verde → Normal, Online, Produciendo
- 🟡 Amber → Advertencia, Umbral próximo, Degradado
- 🔴 Ruby/Rojo → Crítico, Alarma, Offline, Error
- 🔵 Azul/Purple → Información contextual, Acciones, Producción

---

## 2. Tipografía

### 2.1 Fuentes del sistema

| Token | Fuente | Uso |
|---|---|---|
| `--font-sans` | `"Plus Jakarta Sans"` | Tipografía principal de UI |
| `--font-mono` | `"Roboto Mono"` | Valores numéricos técnicos (cuando aplique) |

### 2.2 Jerarquía de texto

| Nivel | Clase Tailwind | Uso en contexto |
|---|---|---|
| **H1 / Título de página** | `text-5xl font-black tracking-tight` | "Visión General de Planta", "Comprimidora FETTE-2090" |
| **KPI Principal** | `text-5xl font-black tracking-tighter` | Valores numéricos grandes (78.4%, 1,250 RPM) |
| **KPI Unidad** | `text-lg font-bold text-slate-400` | "%", "RPM", "kN", "°C" (inline con KPI) |
| **H2 / Subtítulo de sección** | `text-xs font-black text-slate-400 uppercase tracking-[0.3em]` | "Estado por Áreas", "Critical Events", "Live Analytics Stream" |
| **Label de card** | `text-[10px] font-black uppercase tracking-[0.2em] text-slate-400` | "OEE Global", "Velocidad de Rotor", "Alarmas Activas" |
| **Label de dato secundario** | `text-[9px] font-bold uppercase tracking-widest text-slate-400` | "Límite: 45.0 °C", "Promedio Turno", timestamps |
| **Nav link activo** | `text-xs font-bold tracking-widest uppercase text-white` | "OVERVIEW" en Topbar |
| **Nav link inactivo** | `text-xs font-bold tracking-widest uppercase text-slate-500` | "Diagnostics", "Logs" |
| **Branding** | `text-xl font-extrabold tracking-tight uppercase` | "CORE Analytics" |

---

## 3. Superficies y Paneles

### 3.1 Glass Panel (clase utilitaria)

```css
.glass-panel {
  background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1.5rem;   /* = 24px = rounded-3xl */
  overflow: hidden;
  transition: all 0.3s ease;
}
```

**Hover interactivo:** `hover:border-accent-cyan` (o la variante de color correspondiente). El borde cambia de `rgba(255,255,255,0.08)` al acento de la card.

### 3.2 Card de Estado Semántico (sin glass-panel)

Para cards con estado crítico/warning que necesitan fondo tintado:

```
bg-[#1a0b0f]  → Crítico: tinte rojo muy oscuro
bg-[#15100a]  → Warning: tinte amber muy oscuro
bg-[#05130e]  → Normal: tinte verde muy oscuro
bg-[#0e1117]  → Neutral/Standby: idéntico al surface base
```

Todos usan `border rounded-3xl backdrop-blur-md` más el color semántico del borde.

### 3.3 Indicador lateral de estado

Barra izquierda de 1.5px o 5px que refuerza el color semántico:

```html
<!-- Para cards de sección de área -->
<div class="absolute left-0 top-0 bottom-0 w-1.5 bg-accent-green"></div>

<!-- Para cards de alarmas -->
<div class="absolute left-0 top-0 bottom-0 w-[5px] bg-accent-ruby"></div>
```

---

## 4. Spacing y Radios

### 4.1 Padding interno de panels/cards

| Contexto | Padding |
|---|---|
| Cards KPI principales | `p-5` (20px) |
| Header de equipo (glass-panel grande) | `p-6` (24px) |
| Cards de área pequeños | `p-4` (16px) |
| Topbar | `px-6 lg:px-10 py-5` |
| Sidebar items nav | `px-3 py-2.5` |

### 4.2 Border radius

| Uso | Clase | Valor |
|---|---|---|
| Cards y paneles principales | `rounded-3xl` | 24px |
| Panel de gráficos (glass-panel) | `rounded-3xl` | 24px |
| Badges de nav, inputs | `rounded-2xl` | 16px |
| Items de Sidebar nav | `rounded-lg` | 8px |
| Indicadores de alarma inline | `rounded-lg` | 8px |
| Puntos de estado (dot) | `rounded-full` | 50% |
| Logo Topbar | `rounded-xl` | 12px |

### 4.3 Gap y spacing entre secciones

- Entre cards de la misma fila: `gap-5` (20px)
- Entre filas de secciones: `space-y-8` (32px)
- Entre secciones del dashboard: `pt-4` (16px)

---

## 5. Sombras, Glows y Elevaciones

### 5.1 Glows de componentes

```css
/* Logo en Topbar */
shadow-[0_0_20px_rgba(34,211,238,0.3)]

/* Dot de notificación en campana */
shadow-[0_0_8px_rgba(239,68,68,0.8)]

/* Punto rojo de alarma activa */
shadow-[0_0_10px_rgba(239,68,68,0.5)]

/* Ícono sidebar activo (drop-shadow) */
drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]
```

### 5.2 Glow de charts (filter CSS custom)

```css
.neon-cyan-glow  { filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.5)); }
.neon-violet-glow { filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.5)); }
.rotor-glow      { filter: drop-shadow(0 0 15px rgba(168, 85, 247, 0.4)); }
```

### 5.3 Regla de uso de glow

- Usar solo en íconos activos, puntos de estado activo, y líneas de gráficos.
- Nunca aplicar glow a texto de cuerpo ni a fondos completos.
- Mantener opacidad de shadow entre 0.3 y 0.6 como máximo.

---

## 6. Topbar

```
Posición:       fixed top-0 left-0 right-0 z-50
Altura:         ~81px (py-5 = 20px padding vertical + contenido 41px)
Fondo:          backdrop-blur-xl bg-black/40
Borde inferior: border-b border-white/5
```

**Elementos izquierda:**
- Logo: cuadrado 40px, gradiente `from-[#A78BFA] to-[#22d3ee]`, `rounded-xl`
- Nombre: `CORE` bold white + `Analytics` gradient text (cyan→purple), uppercase
- Búsqueda: contenedor `bg-white/5 border border-white/5 rounded-2xl`, input transparent

**Elementos derecha:**
- NavLinks: `text-xs font-bold tracking-widest uppercase`, activo con underline gradient
- Campana: `bg-white/5 border border-white/10 rounded-2xl size-11`
- Avatar: `bg-slate-800 border border-white/10 rounded-2xl size-11`

---

## 7. Sidebar

```
Ancho:         w-64 (256px) — fijo, no colapsable en la versión actual
Fondo:         bg-industrial-bg (#05070a)
Borde derecho: border-r border-[rgba(255,255,255,0.08)]
```

**Items de navegación:**
- Inactivo: `text-industrial-muted hover:bg-industrial-hover hover:text-industrial-text`
- Activo: `bg-[rgba(255,255,255,0.03)] border border-industrial-border` + ícono con glow cyan
- Ícono activo: stroke gradiente SVG + `drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]`

---

## 8. Cards / Widgets — Anatomía

### KPI Card estándar (glass-panel)

```
┌──────────────────────────────┐
│ [LABEL 10px uppercase]  [🔵] │  ← header: label + ícono acento
│                              │
│ 78.4  %                      │  ← valor principal (text-4xl/5xl black)
│                              │
│ +2.1% vs ayer     Estable    │  ← footer: contexto secundario
└──────────────────────────────┘
padding: p-5 | radius: rounded-3xl
```

### Card de área de estado

```
│◼  [STATUS 10px]          🟢 │  ← barra izquierda color + label + dot animado
│   ÁREA                      │  ← nombre (text-xl black uppercase)
│   Equipos: 4/5    Lote: BCTX│  ← metadata (text-9px)
padding: p-4 | radius: rounded-3xl
```

---

## 9. Estados Visuales Semánticos

| Estado | Color principal | Fondo tintado | Borde | Uso típico |
|---|---|---|---|---|
| `running` / Normal | `accent-green` | `#05130e` | `accent-green/30` | Área produciendo OK |
| `warning` / Advertencia | `accent-amber` | `#15100a` | `accent-amber/30` | Temperatura alta, nivel bajo |
| `critical` / Crítico | `accent-ruby` | `#1a0b0f` | `accent-ruby/30` | Alarma activa, presión inestable |
| `offline` / Desconectado | `industrial-muted` | `#0e1117` | `muted/30` | Equipo sin señal |
| `idle` / Standby | `industrial-muted` | `#0e1117` | `industrial-border` | Equipo detenido/espera |

**Animación de estado activo:** `animate-pulse-slow` (3s cubic-bezier) en el dot indicador cuando el estado requiere atención.

---

## 10. Gráficos (Recharts)

### Configuración estándar de TrendChart

```
CartesianGrid: strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}
XAxis:    tick fill="#8F9BB3" fontSize 11, tickLine=false, axisLine=false
YAxis:    tick fill="#8F9BB3" fontSize 11, tickLine=false, axisLine=false
Tooltip:  bg "#0e1117", border rgba(255,255,255,0.08), radius 8px
```

### Colores de series

| Serie | Stroke | Fill gradient stop (5%) | Clase glow |
|---|---|---|---|
| Principal (OEE) | `#00BEFF` / `#22d3ee` | `rgba(0,190,255,0.3→0)` | `neon-cyan-glow` |
| Secundaria (Producción) | `#B258FF` / `#a855f7` | `rgba(178,88,255,0.3→0)` | `neon-violet-glow` |

- `strokeWidth: 3`
- `activeDot: r=6, stroke="#0e1117", strokeWidth=2`

---

## 11. Iconografía

- **Librería:** Lucide React (única fuente de íconos)
- **Tamaño estándar en cards:** `size={24}` con `strokeWidth={1.5}` para apariencia liviana
- **Tamaño en sidebar:** `size={20}`
- **Tamaño en topbar acciones:** `size={20}`
- **Opacidad de ícono decorativo:** `opacity-80`
- **Ícono activo:** opacidad 100%, color acento, con glow CSS

---

## 12. Hover / Active / Selected

| Superficie | Hover | Active / Selected |
|---|---|---|
| Card KPI | `hover:border-accent-cyan` (o variante) | No aplica (no seleccionable) |
| Card de área | `hover:bg-industrial-hover` | Borde semántico siempre visible |
| Nav link Sidebar | `hover:bg-industrial-hover hover:text-white` | `bg-white/3 border-industrial-border` + glow ícono |
| Nav link Topbar | `hover:text-white` | Gradient underline (`::after` pseudo) |
| Botón acción | `hover:scale-105 active:scale-95` | transition-transform |

---

## 13. Principios de Composición Visual para Dashboards

1. **Jerarquía de 3 niveles:** KPIs/Estado global (L1) → Variables/alertas clave (L2) → Contexto/histórico (L3).
2. **Grid primario:** 4 cols para KPIs en XL, 2 cols en MD, 1 col en SM.
3. **Grid secundario:** 4 cols para áreas, 3 cols para layout de detalle+tendencia (2+1).
4. **Densidad media-alta:** Padding generoso pero sin espacio vacío improductivo.
5. **Respiración visual:** `space-y-8` entre secciones, `gap-5` entre cards del mismo nivel.
6. **Color solo para semántica:** No usar acentos por razones estéticas sin significado operativo.
7. **Sin elementos mudos:** Todo componente debe comunicar su estado incluso cuando no hay dato.
