# Skill Registry — Interfaz-Laboratorio

Generated: 2026-03-31
Project: Interfaz-Laboratorio
Stack: React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand + TanStack Query

---

## User Skills

| Skill | Trigger | Source |
|-------|---------|--------|
| issue-creation | Creating a GitHub issue, reporting a bug, or requesting a feature | user-level |
| branch-pr | Creating a pull request, opening a PR, or preparing changes for review | user-level |
| skill-creator | User asks to create a new skill, add agent instructions, or document patterns for AI | user-level |
| go-testing | Writing Go tests, using teatest, or adding test coverage | user-level |
| judgment-day | User says "judgment day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | user-level |

## Project Conventions

- Project-level convention file detected: `AGENTS.md` in project root.
- User-level agent config also present in the local environment.

## Compact Rules

### issue-creation
- Follow issue-first enforcement: create issue BEFORE any branch or PR
- Use structured templates for bug reports and feature requests
- Always include labels, assignees, and milestone if available

### branch-pr
- Require an associated issue for every PR (issue-first enforcement)
- Branch naming: `type/issue-number-short-description`
- PR body must reference the issue and include a summary

### skill-creator
- Follow the Agent Skills spec for skill file structure
- Skills must have frontmatter with name, description, trigger, metadata
- Include When to Use section, rules, and examples

### judgment-day
- Launch two independent blind judge sub-agents in parallel
- Synthesize findings, apply fixes, re-judge until both pass
- Escalate after 2 iterations if issues persist

### go-testing (not applicable to this project — Go skill, project is React/TS)
- N/A for this TypeScript/React project
