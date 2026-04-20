# Testing — Interfaz-Laboratorio

> **TL;DR**: vitest + RTL + jest-dom + user-event + jsdom. Tests co-locados como `*.test.ts(x)`. TDD obligatorio para lógica pura (`utils`, `adapters`, `services`, `resolvers`) y bugs. Cobertura mínima 70/70 enforced. Coverage es señal, no objetivo — priorizar tests útiles sobre relleno.

> ← Volver a [`AGENTS.md`](../AGENTS.md)

---

## Stack

| Herramienta | Rol |
|-------------|-----|
| vitest | Runner + coverage |
| @testing-library/react | Renderizado de componentes |
| @testing-library/jest-dom | Matchers semánticos (`toBeInTheDocument`, etc.) |
| @testing-library/user-event | Simulación de interacción de usuario |
| jsdom | Entorno DOM (elegido sobre happy-dom por compatibilidad) |

## Comandos

| Script | Uso |
|--------|-----|
| `npm run test` | Corre todos los tests una vez (CI) |
| `npm run test:watch` | Modo watch para desarrollo |
| `npm run test:ui` | UI visual de vitest en el browser |
| `npm run test:coverage` | Reporte de cobertura completo |

## Ubicación de archivos

- **Co-location obligatoria**: cada test vive junto al archivo que testea, como `*.test.ts(x)`.
- `*.spec.*` está **prohibido**.
- Utilidades de test compartidas (fixtures, factories, helpers) en `src/test/`.
- Tests específicos de módulo en `__tests__/` dentro del módulo.

## Targets de cobertura

| Capa | Lines | Branches |
|------|-------|----------|
| `utils/` | 100% | 100% |
| `adapters/` | 100% | 100% |
| `services/` | ≥90% | ≥90% |
| `widgets/resolvers/` | ≥90% | ≥90% |
| `queries/`, `store/` | ≥80% | ≥80% |
| `components/ui/` | ≥70% | ≥70% |
| `components/viewer/`, `components/admin/` | ≥60% | ≥60% |
| `widgets/renderers/` | smoke + casos de estado | — |
| `pages/` | smoke + happy path | — |
| **Global mínimo (enforced)** | **70%** | **70%** |

> Coverage es señal, no objetivo. Priorizar tests útiles sobre tests de relleno para inflar números.

## Qué se testea / qué NO

**Se testea:**
- Lógica pura: funciones en `utils/`, `adapters/`, `services/`, `widgets/resolvers/`
- Comportamiento observable de componentes (renderizado, interacción, estados)
- Bugs: test que reproduce el bug **antes** del fix (TDD retroactivo obligatorio)

**NO se testea:**
- Estilos Tailwind puros (clases CSS aplicadas)
- Implementación interna (detalles privados de componentes)
- Librerías externas (recharts, tanstack-query, zustand)
- Snapshots por defecto — prohibido salvo justificación explícita

## TDD

| Contexto | TDD |
|----------|-----|
| `utils/`, `adapters/`, `services/`, `widgets/resolvers/` | **Obligatorio** — test primero |
| Bugs (cualquier capa) | **Obligatorio** — test que reproduce antes del fix |
| `components/ui/`, `widgets/renderers/` | Opcional, recomendado para comportamiento testable |
| `pages/` | Opcional — smoke + happy path |

**Legacy**: no retrotestear todo. Cuando se toca código existente en `utils/`, `adapters/` o `services/` por bug o feature, agregar tests antes (TDD retroactivo).

## Mocks

- **Fixtures y factories** en `src/test/fixtures/` — preferidos para datos de test.
- **`vi.mock()`** solo para boundaries externos: `localStorage`, HTTP, módulos del sistema.
- Mockear código propio: excepcionalmente permitido cuando hay razón clara; documentar el motivo inline en el test.

## Tipado

- TypeScript estricto en tests. **Cero `any`** sin justificación documentada.
- Tipos desde `domain/` — nunca tipos inline ad-hoc en tests.

## Accesibilidad en queries

Preferir queries semánticas: `getByRole`, `getByLabelText`, `getByText`. Si faltan roles en un componente, arreglar el componente — no el test.
