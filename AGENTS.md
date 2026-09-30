# AGENTS.md

## Context

Riff Valley frontend.

Stack:

- Vue 3
- TypeScript
- Vite
- Pinia
- Yarn 4.10.1
- Vitest
- Vue Test Utils
- Playwright

The frontend is being migrated incrementally toward a modular, domain-oriented architecture.

Before architectural work, read:

- `ROADMAP.md`
- `docs/architecture-baseline.md`

Do not treat the migration as a rewrite.

---

## Architecture

Target dependency direction:

```text
presentation → application → domain
infrastructure → implements application/domain ports
```

`domain` and `application` must remain framework-independent TypeScript.

They must not depend on:

- Vue / `@vue/*`
- Pinia
- Vue Router
- Axios / HTTP clients
- browser APIs
- infrastructure
- provider SDKs

Presentation contains Vue pages/components/composables/stores.

Presentation must not perform HTTP directly.

Pinia is for presentation state, cache and UI coordination, not business rules or HTTP.

---

## Modules

Product capabilities live under `src/modules/`.

Current target modules:

```text
identity
catalog
community
releases
editorial
workspace
product-ops
analytics
```

`workspace` is provisional.

External providers belong under `src/integrations/`, e.g. Spotify, WordPress, Last.fm, Telegram or LanguageTool.

Modules must not import arbitrary internals of other modules. Prefer a small explicit public API.

---

## Shared

Keep `shared` small.

Code belongs there only when it is genuinely transversal, stable and has no clear domain owner.

Do not move code to `shared` merely because two modules use it.

Business-specific composables remain inside their owning module.

---

## DDD style

Use pragmatic DDD.

Do not create:

- rich entities without business behaviour;
- value objects for every primitive;
- one use-case class per trivial GET;
- empty layer directories;
- duplicate types purely for ceremony;
- generic abstractions before real reuse exists.

Architecture should reduce coupling and improve testability.

---

## Legacy policy

Current legacy paths are temporarily tolerated as documented in `docs/architecture-baseline.md`.

Do not:

- expand legacy exceptions casually;
- move new code into legacy paths to bypass architecture checks;
- perform mass folder moves.

Migrate vertically, one behavior at a time.

Temporary facades/adapters are allowed when they enable incremental migration.

---

## Types and DTOs

Do not introduce new explicit `any` in new or migrated code.

Prefer `unknown` at uncertain boundaries and narrow it explicitly.

API/provider DTOs live beside their adapter.

Do not create a global DTO folder.

Use mappers only when transport and application/domain models actually differ.

---

## Composables

Business-specific composables belong to their module, for example:

```text
modules/catalog/presentation/composables/
modules/editorial/presentation/composables/
```

Only genuinely transversal composables belong in shared.

Do not move logic from a component into a composable if the composable then becomes a new god-object.

---

## Compatibility

Unless explicitly requested otherwise, preserve:

- URLs and route names;
- query params;
- API contracts;
- permissions;
- localStorage/session keys;
- lazy loading;
- responsive behavior;
- visible product behavior.

Do not mix architectural refactoring with unrelated product changes.

---

## Package manager

Use Yarn 4.10.1.

Do not migrate to pnpm or npm as part of this refactor.

---

## Quality gates

Use:

```bash
yarn lint
yarn architecture
yarn typecheck
yarn test
yarn build
```

Aggregate:

```bash
yarn verify
```

For architectural work, run `yarn verify` before completion.

Run relevant Playwright tests when touching critical routes or session behavior.

Do not weaken architecture checks or add ignore paths just to make a task pass.

---

## Testing

Before changing an important legacy flow, add characterization tests for the behavior that must remain stable.

Preferred levels:

```text
domain/application → unit tests
presentation       → focused component tests
critical flows     → Playwright
```

Do not chase arbitrary global coverage.

---

## Migration order

Follow `ROADMAP.md`.

Current sequence:

```text
0. Tooling and architecture safety net
1. Catalog pilot: genres + countries
2. HTTP composition + identity/session
3. Catalog
4. Community
5. Integrations
6. Editorial
7. Releases
8. Workspace + Product Ops + Analytics
9. Consolidation and legacy removal
```

Do not continue automatically into the next iteration.

---

## Scope discipline

Before editing:

1. Read the requested roadmap section.
2. Inspect the current implementation.
3. Identify affected consumers and boundaries.
4. Preserve existing behavior.
5. Make the smallest coherent change.

Do not touch unrelated code.

At completion, report:

- files changed;
- architecture decisions;
- tests added/updated;
- compatibility retained;
- quality-gate results;
- unresolved or pre-existing issues.
