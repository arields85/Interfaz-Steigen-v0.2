# Skill Registry

**Delegator use only.** Generated for Interfaz-Laboratorio on 2026-04-16.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When creating a pull request, opening a PR, or preparing changes for review. | `branch-pr` | `C:\Users\Ariel\.config\opencode\skills\branch-pr\SKILL.md` |
| When creating a GitHub issue, reporting a bug, or requesting a feature. | `issue-creation` | `C:\Users\Ariel\.config\opencode\skills\issue-creation\SKILL.md` |
| When writing Go tests, using teatest, or adding test coverage. | `go-testing` | `C:\Users\Ariel\.config\opencode\skills\go-testing\SKILL.md` |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", or "que lo juzguen". | `judgment-day` | `C:\Users\Ariel\.config\opencode\skills\judgment-day\SKILL.md` |
| When user asks to create a new skill, add agent instructions, or document patterns for AI. | `skill-creator` | `C:\Users\Ariel\.config\opencode\skills\skill-creator\SKILL.md` |
| Creating a new widget, renderer, dashboard widget, or widget variant. | `interfaz-widget` | `D:\interfaz-laboratorio\.agent\skills\interfaz-widget\SKILL.md` |

## Compact Rules

### branch-pr
- Every PR MUST link an approved issue before review.
- Use branch names `type/description` with conventional commit-compatible types.
- Add exactly one `type:*` label to the PR.
- Use the PR template with linked issue, summary, changes table, and test plan.
- Do not skip automated checks; PR validation and shell-related checks must pass.
- Never add `Co-Authored-By` trailers.

### issue-creation
- Always search for duplicates before opening a new issue.
- Use the correct GitHub issue template; blank issues are disabled.
- New issues enter `status:needs-review`; PRs wait for `status:approved`.
- Questions belong in Discussions, not Issues.
- Bug reports need repro steps + expected vs actual behavior.
- Feature requests must state the problem, proposed solution, and affected area.

### go-testing
- Prefer table-driven tests for pure logic and multiple cases.
- Test Bubbletea state transitions via `Model.Update()` before broader flows.
- Use `teatest` for interactive TUI flows and golden files for stable visual output.
- Mock side effects behind interfaces; use `t.TempDir()` for file operations.
- Cover both success and error paths explicitly.

### judgment-day
- Run only when the user explicitly asks for adversarial or dual review.
- Resolve project skills from the registry BEFORE launching judges.
- Use two blind parallel judges on the same target; never sequential review.
- Synthesize confirmed vs suspect findings before asking to fix anything.
- Re-judge only for confirmed critical issues after fixes.
- If no registry exists, warn and proceed with generic review only.

### skill-creator
- Create a skill only for reusable patterns or complex workflows.
- Follow `skills/{skill-name}/SKILL.md` structure with complete frontmatter.
- Put templates/examples in `assets/`; local documentation pointers in `references/`.
- Keep examples minimal and front-load critical patterns.
- Register new skills in the project instruction index after creation.

### interfaz-widget
- Start every new widget from `glass-panel` and reuse shared focus/hover primitives.
- Use `WidgetHeader`; `subtitle` stays in the header and `subtext` in the footer.
- Register renderers in `hmi-app/src/widgets/WidgetRenderer.tsx`.
- Type `displayOptions` in `hmi-app/src/domain/admin.types.ts`.
- Use chart primitives (`ChartTooltip`, `ChartHoverLayer`, shared helpers) instead of ad-hoc chart behavior.
- Never hardcode colors, fonts, or non-system hover/focus styles.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| `AGENTS.md` | `D:\interfaz-laboratorio\AGENTS.md` | Index + canonical convention source; includes Section 11 Testing |
| `Directiva_maestra_v3.1.md` | `D:\interfaz-laboratorio\Directrices\Directiva_maestra_v3.1.md` | Referenced by `AGENTS.md` |
| `Arquitectura Técnica de Implementación HMI v1.3.md` | `D:\interfaz-laboratorio\Directrices\Arquitectura Técnica de Implementación HMI v1.3.md` | Referenced by `AGENTS.md` |
| `Especificación funcional_Modo Administrador.md` | `D:\interfaz-laboratorio\Directrices\Especificación funcional_Modo Administrador.md` | Referenced by `AGENTS.md` |
| `UI_Style_Guide_Design_System_Base_v1.md` | `D:\interfaz-laboratorio\Directrices\UI_Style_Guide_Design_System_Base_v1.md` | Referenced by `AGENTS.md` |
| `WIDGET_AUTHORING.md` | `D:\interfaz-laboratorio\hmi-app\src\widgets\WIDGET_AUTHORING.md` | Referenced by `AGENTS.md` |
| `ADMIN_CONVENTIONS.md` | `D:\interfaz-laboratorio\hmi-app\src\components\admin\ADMIN_CONVENTIONS.md` | Referenced by `AGENTS.md` |

### Project Standards
- This HMI is STRICTLY read-only: no process-control writes, no setpoints, no actuators, no POST/PUT/DELETE to plant systems.
- The real app lives in `hmi-app/`; the repo root mainly holds docs, config, and SDD artifacts.
- Respect the data flow: `services/` → `adapters/` → `domain/` → `queries`/`store` → UI.
- Business/domain types live only in `hmi-app/src/domain/`; do not duplicate them inline.
- React Query owns async/server state; Zustand is only for client/UI state.
- Keep `EquipmentStatus`, `ConnectionState`, and `MetricStatus` orthogonal.
- Never hardcode colors, fonts, or content-dependent dimensions; use `@theme`, typed display options, and runtime measurement when needed.
- Use `hmi-scrollbar` for every scrollable container and Lucide React for icons.
- No ad-hoc layout patches; fix the responsible layer instead.
- Never build after changes.
- `AGENTS.md` Section 11 is authoritative for testing: co-located `*.test.ts(x)`, no `*.spec.*`, strict TS in tests, useful coverage over filler tests, and mandatory TDD for `utils`, `adapters`, `services`, `widgets/resolvers`, and bug fixes.
