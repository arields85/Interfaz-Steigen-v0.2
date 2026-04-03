# Skill Registry — Interfaz-Laboratorio

Generated: 2026-04-01
Project: Interfaz-Laboratorio
Stack: React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS v4 + Zustand 5 + TanStack Query 5

---

## User Skills

| Skill | Trigger | Source |
|-------|---------|--------|
| branch-pr | Creating a pull request, opening a PR, or preparing changes for review | user-level (`~/.config/opencode/skills/branch-pr/SKILL.md`) |
| issue-creation | Creating a GitHub issue, reporting a bug, or requesting a feature | user-level (`~/.config/opencode/skills/issue-creation/SKILL.md`) |
| go-testing | Writing Go tests, using teatest, or adding test coverage | user-level (`~/.config/opencode/skills/go-testing/SKILL.md`) |
| judgment-day | User says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", or "que lo juzguen" | user-level (`~/.config/opencode/skills/judgment-day/SKILL.md`) |
| skill-creator | User asks to create a new skill, add agent instructions, or document patterns for AI | user-level (`~/.config/opencode/skills/skill-creator/SKILL.md`) |
| interfaz-widget | Creating a new widget, renderer, dashboard widget, or widget variant | project-level (`.agent/skills/interfaz-widget/SKILL.md`) |

## Project Conventions

### Convention Files
- `AGENTS.md` — project operating rules, architecture, design-system constraints, and HMI read-only policy.

### Referenced Project Docs
- `Directrices/Directiva_maestra_v3.1.md` — visión, principios y restricciones fundacionales.
- `Directrices/Arquitectura Técnica de Implementación HMI v1.3.md` — flujo service → adapter → domain → query/store → UI.
- `Directrices/Especificación funcional_Modo Administrador.md` — builder/admin mode y persistencia mock.
- `Directrices/UI_Style_Guide_Design_System_Base_v1.md` — tokens, theming y reglas visuales.

## Compact Rules

### Project Standards
- HMI STRICTLY read-only: no POST/PUT/DELETE hacia sistemas de control, no setpoints, no actuadores, no botones operativos.
- La app real vive en `hmi-app/`; la raíz contiene documentación y configuración.
- Respetar el flujo: `services/` → `adapters/` → `domain/` → `queries/`/`store/` → UI.
- Tipos de negocio SOLO en `hmi-app/src/domain/`; no duplicar tipos inline en componentes.
- React Query para datos remotos; Zustand solo para estado UI del cliente.
- Mantener separados `EquipmentStatus`, `ConnectionState` y `MetricStatus`.
- NO hardcodear colores hex ni fuentes en componentes; usar tokens `@theme` de `hmi-app/src/index.css`.
- NO aplicar parches ad-hoc/globales para problemas locales de layout; resolver en la capa responsable (layout, bloque interno o primitive).
- NO hardcodear copy de estado cuando el contrato del widget permita `displayOptions` tipadas.
- Solo Lucide React para íconos.
- No modificar `Directrices/`; son documentos fuente.
- Regla operativa explícita: NEVER build after changes.

### branch-pr
- Cada PR debe estar ligado a un issue aprobado.
- Seguir naming de branch y PR con resumen claro y trazable.
- No push ni operaciones destructivas salvo pedido explícito.

### issue-creation
- Usar templates estructurados y flujo issue-first.
- No abrir PR sin issue aprobado.

### judgment-day
- Resolver skills y estándares del proyecto antes de revisión adversarial.
- Ejecutar doble review ciega solo cuando el usuario lo pida explícitamente.

### skill-creator
- Crear skills solo para patrones repetibles o flujos complejos.
- Estructura esperada: `skills/{skill-name}/SKILL.md` con frontmatter y reglas.

### interfaz-widget
- Todo widget nuevo debe salir desde `glass-panel` + `WidgetHeader` + primitives compartidos de foco/hover.
- `subtitle` pertenece al header; `subtext` pertenece al footer del widget.
- Registrar renderers nuevos en `hmi-app/src/widgets/WidgetRenderer.tsx` y tipar `displayOptions` en `hmi-app/src/domain/admin.types.ts`.

### go-testing
- Skill disponible en el entorno, pero no aplica al stack actual React/TypeScript salvo código Go futuro.
