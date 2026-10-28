# Convenciones de desarrollo del frontend

Esta página reúne los comandos y prácticas de desarrollo comprobados en el checkout. Para ownership, dependencias y responsabilidades de capas, consulta [Arquitectura del frontend](architecture.md); el estado actual de Identity está en su [guía de módulo](modules/identity.md).

## Entorno e instalación

- Node.js **24.22.1** es la versión fijada en [.nvmrc](../../.nvmrc); `package.json` declara `>=24 <25`.
- pnpm **11.28.8** es la versión exacta de `packageManager` en [`package.json`](../../package.json), seleccionada por Corepack. El checkout tiene `pnpm-workspace.yaml` con `pmOnFail: error`.
- Instala dependencias desde el lockfile sin reescribirlo:

  ```sh
  nvm use 24.22.1
  corepack enable
  pnpm install --frozen-lockfile
  ```

## Comandos del proyecto

Los nombres y comandos corresponden a los scripts actuales de `package.json`.

| Comando | Uso | Tratamiento actual |
|---|---|---|
| `pnpm dev` | Servidor de desarrollo Vite; normalmente `http://localhost:5173/`. | Desarrollo local. |
| `pnpm run typecheck` | `vue-tsc --noEmit` sobre la aplicación TypeScript/Vue. | Bloqueante en el workflow de calidad. |
| `pnpm test` | `vitest run`. | Bloqueante en el workflow de calidad. |
| `pnpm build` | Ejecuta typecheck y luego `vite build`. | Bloqueante en el workflow de calidad. |
| `pnpm preview` | Sirve localmente el contenido de `dist/` después de una build. | Comprobación manual local. |

`pnpm build` repite el typecheck si ya ejecutaste `pnpm run typecheck` por separado; ambos comandos están disponibles para diagnóstico y CI.

## Lint y formato

- `pnpm lint` ejecuta ESLint sobre `src/**/*.{ts,vue}` con las reglas recomendadas de JavaScript, TypeScript, Vue y accesibilidad estática. En CI, el informe global es informativo y continúa aunque encuentre errores.
- `pnpm format:check` comprueba con Prettier los archivos fuente, scripts `.mjs` y `eslint.config.js`; no modifica archivos. Su informe global en CI también es informativo.
- `pnpm run lint:identity` y `pnpm run format:check:identity` comprueban todos los `.ts`/`.vue` de `src/modules/identity/`, incluidos archivos nuevos, sin depender de Git. Son pasos bloqueantes en CI. No se reformatea el legado como parte de esta política.
- `pnpm run lint:identity:changed` y `pnpm run format:check:identity:changed` se conservan como diagnósticos incrementales locales. En local recogen cambios tracked, staged y untracked; en CI usan el diff base/head para seleccionar archivos. Si faltan los SHA o no se puede comparar Git, hacen un escaneo informativo y pueden terminar con código 0 aunque haya hallazgos. No sustituyen los gates completos de Identity.

La configuración está en [`eslint.config.js`](../../eslint.config.js), [`.prettierrc.json`](../../.prettierrc.json) y [`.prettierignore`](../../.prettierignore). Para código nuevo usa los aliases existentes en Vite y TypeScript (`@/`, `@stores/`, `@views/`, `@components/`, `@services/`, `@interfaces/`, `@helpers/`). El alias `@assets/` todavía resuelve a `src/helpers/`; es una referencia legacy y no debe usarse para assets nuevos.

Reutiliza los colores y utilidades de marca definidos en [`tailwind.config.js`](../../tailwind.config.js), como `rv-pink`, `bg-rv-gradient`, `shadow-rv` y `font-brand`, en vez de duplicar sus valores. Para avisos de éxito/error y confirmaciones usa el servicio compartido [`SwalService`](../../src/services/swal/SwalService.ts) cuando corresponda. Los textos dirigidos a usuarios se escriben en español.

## Ciclos y fronteras de Identity

- `pnpm run cycles:fixtures` ejecuta los fixtures del detector de ciclos.
- `pnpm run cycles` ejecuta el diagnóstico local y usa `HEAD` como base implícita cuando puede. `pnpm run cycles:required` es el modo obligatorio de CI: exige `FQ_QUALITY_BASE_SHA` y `FQ_QUALITY_HEAD_SHA`, merge-base válido y grafos completos. Un ciclo nuevo runtime/mixto de producción termina con código 1; referencia ausente, grafo incompleto, error Git o fallo del analizador terminan con código 2. Los ciclos type-only, de tests y composition roots conservan su severidad no bloqueante. En modo diagnóstico local, una comparación incompleta se informa y termina con código 0.
- `pnpm run identity:boundaries:fixtures` verifica los casos del checker de fronteras.
- `pnpm run identity:boundaries` ejecuta el diagnóstico local y usa `HEAD` como base implícita cuando puede. `pnpm run identity:boundaries:required` es el modo obligatorio de CI y exige las mismas referencias, merge-base y grafos completos. Una nueva violación productiva termina con código 1; referencia ausente, grafo incompleto, error Git o fallo del analizador terminan con código 2. El diagnóstico local informa comparaciones incompletas y termina con código 0. El gate no establece ownership para el resto del código legacy.

El workflow ejecuta los dos comandos `:required`. La base histórica de `dev` conserva un import local sin resolver en la ubicación anterior de Rankings, `src/views/homePage/HomePage.vue`; C-TOP-12 mueve esa vista en este checkout, pero no cambia la base Git ni resuelve la limitación FQ-5.2 mediante integración normal. CI bloqueará ambos comparadores cuando detecte el grafo base incompleto. No se debe cambiar la referencia para evitar ese bloqueo.

Los detalles de las reglas y excepciones de Identity están en su [documentación canónica](modules/identity.md); los principios generales y el estado de adopción gradual, en [Arquitectura](architecture.md).

## Enlaces Markdown

- `pnpm run markdown:links:fixtures` valida los fixtures del parser y el criterio de comparación.
- `pnpm run markdown:links` informa los enlaces relativos rotos o anchors inexistentes del repositorio completo; en CI es un reporte informativo.
- `pnpm run markdown:links:delta` comprueba enlaces locales nuevos en Markdown modificado. Solo puede bloquear con base/head disponibles y un checkout limpio. Si Git no ofrece una comparación completa —o hay cambios locales sin incluir en los snapshots— el resultado es informativo.

## Commits y hooks

Los mensajes siguen [Conventional Commits](https://www.conventionalcommits.org) y la configuración de [`commitlint.config.cjs`](../../commitlint.config.cjs), que extiende `@commitlint/config-conventional`. Formato: `tipo(scope): descripción`; para cambios incompatibles se admite `!` o el footer `BREAKING CHANGE:`. Tipos habituales reconocidos por la configuración: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` y `revert`.

El hook [`commit-msg`](../../.husky/commit-msg) ejecuta `pnpm exec commitlint --edit "$1"` y rechaza mensajes no conformes. [`pre-commit`](../../.husky/pre-commit) solo imprime un mensaje; no ejecuta lint, tests, build ni typecheck.

## Calidad, Git y adopción

El workflow local [.github/workflows/quality.yml](../../.github/workflows/quality.yml) declara typecheck, tests, build, fixtures, gates completos de Identity y comparadores obligatorios de ciclos/fronteras como pasos bloqueantes; los reportes globales de lint, formato y enlaces son informativos. En CI, los comparadores reciben `FQ_QUALITY_BASE_SHA` y `FQ_QUALITY_HEAD_SHA`; referencias ausentes o grafos incompletos fallan explícitamente con código 2. Los diagnósticos locales conservan un resultado informativo ante una comparación incompleta.

El comportamiento local depende del checker: los gates de lint/formato de Identity inspeccionan el módulo entero; sus scripts `*:changed` recogen archivos Identity modificados, staged y nuevos, sin comparar la deuda de cada archivo con un baseline. En CI, esos scripts incrementales usan el diff base/head y degradan a informativos si no pueden comparar, pero no participan en la decisión de lint/formato de Identity. Ciclos y fronteras usan `HEAD` como base si no reciben SHA; `markdown:links:delta` exige ambos SHA y un checkout limpio, y si falta algo solo informa. Un resultado informativo por comparación incompleta no equivale a que el delta esté aprobado.

La configuración del workflow y sus comandos todavía requieren una ejecución real en GitHub Actions; tampoco se ha confirmado allí la selección del required check. La existencia del archivo local no demuestra validación remota. Consulta el [roadmap de calidad](../../roadmap/frontend-quality.md) para el estado de esa validación.

La adopción es gradual: Identity tiene ESLint y Prettier completos y bloqueantes, además de límites automatizados; los dominios legacy siguen migrándose por capacidad, con reportes globales informativos, y sus hallazgos preexistentes no se limpian automáticamente. Para cada módulo nuevo o migrado, sigue la [arquitectura vigente](architecture.md) y amplía los controles solo cuando sus owners y excepciones estén clasificados.

Spotify se consume a través del backend; no incluyas secretos de Spotify en el bundle frontend. El README conserva la referencia del callback de playlists.
