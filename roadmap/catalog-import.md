# Catalog Import

**Estado del módulo:** en cleanup.

## BC-IMP-2.5 — Adaptar el frontend al contrato único de importación

- **Estado:** completada en frontend el 2026-10-15.
- **Contrato:** Manual consume `{ message, data: { results } }`; Excel consume `{ data: { results } }`. No se interpreta ningún shape legacy.
- **Resultados:** ambas vistas presentan resultados en orden, con estados diferenciados para importados, duplicados omitidos y fallidos. Manual muestra la línea original disponible; Excel muestra hoja y fila física.
- **Errores globales:** los dos mensajes sistémicos seguros del backend se muestran con una advertencia de posibles escrituras anteriores. Los demás errores usan un fallback genérico y no muestran detalles del driver/base de datos.
- **Exclusiones:** no se cambiaron endpoints, formularios, validaciones de fechas ni backend. BC-IMP-3 y BC-IMP-4 siguen pendientes.
- **Despliegue:** coordinar la activación con el backend, ya que el contrato nuevo elimina campos legacy.

## BC-CAT-RELEASE-3 — Alinear permisos de importación Manual

- **Estado:** completada en frontend el 2026-10-15.
- **Contrato de roles verificado en backend:** Manual (`POST /api/catalog/import/manual`) exige `superadmin`; Excel (`POST /api/catalog/import/excel` y plantilla) exige `riffvalley`. La jerarquía frontend permite a `superadmin` heredar el acceso de `riffvalley`.
- **Modificaciones:** `/import` y su opción de navegación requieren `superadmin`. `/import-discs` conserva `riffvalley`. Se reutiliza el guard del router y `hasMinimumRole`; no se modificaron endpoints ni peticiones HTTP.
- **Pruebas:** cobertura focalizada de navegación sin sesión y con roles `user`, `collaborator`, `riffvalley` y `superadmin`; representación de opciones del menú por rol. Las pruebas existentes de servicios siguen verificando las llamadas Manual y Excel.
- **Verificación:** tests focalizados, build/typecheck, Prettier limitado a los archivos modificados y `git diff --check`.
- **Informe backend:** disponible en `roadmap/catalog-regression-2026-10-15.md` del repositorio backend. Confirma esos mínimos de rol y que `data.results` queda alineado; la validación HTTP entre procesos sigue pendiente y el estado de publicación global continúa bloqueado por el esquema/migraciones de producción y esa integración real.

## BC-CAT-RELEASE-6 — Preparar cambios frontend para integración

- **Estado:** cambios frontend de Catalog confirmados; integración en `main` detenida por protección de cambios locales y avance remoto durante la tarea.
- **Commits propios de Catalog incluidos en esta rama:** `92cd5ed` (búsqueda de artistas sin filtro de país no soportado), `c9f6ffc` (recuperación de páginas fuera de rango) y `1d129e9` (contratos de importación y tipos del catálogo). Este release añade `f81a2d4` (Manual requiere `superadmin`; Excel conserva mínimo `riffvalley`).
- **Cobertura:** Artists y Countries; Manual y Excel leen exclusivamente `data.results`; `Genre.color` y `Country.isoCode` admiten `null`; permisos y pruebas de catálogo, importación, paginación, router y menú. No se añadió compatibilidad legacy ni se cambiaron endpoints.
- **Commits remotos analizados inicialmente:** `f5fe5b4` (release 1.45.0) y `cef0373` (merge PR #183). Tras actualizar refs, `origin/main` también contenía `205e72d` (fix de NewsFeed) y `dfcfad4` (release 1.45.1), por lo que los dos commits ya no eran el delta remoto completo.
- **Integración:** no se integró ningún commit de `main`. La simulación de merge identificó cambios de `origin/main` en `.impeccable/config.json`, que conserva modificaciones locales expresamente protegidas; se evitó sobrescribir o absorber ese archivo. También se conservan `.aws` y cualquier otro cambio ajeno.
- **Verificaciones:** 6 suites focalizadas, 27 tests; `yarn build` (incluye `vue-tsc --noEmit`); Prettier 3.5.3 en documentos, JSON y pruebas nuevas; `git diff --check`. Build con avisos preexistentes de Browserslist, CSS `.flex-[2]` y tamaño de chunk. `package.json` no ofrece scripts de lint ni arquitectura.
- **Estado para integración:** los cambios de Catalog están confirmados y verificados. La rama requiere revisar e integrar el delta actualizado de `origin/main` preservando `.impeccable/config.json`; no se hizo push, merge a `main` ni despliegue. La comprobación HTTP backend/frontend y el esquema de producción siguen fuera de estas verificaciones.

## BC-CAT-RELEASE-7 — Actualizar la rama frontend con main

- **Fecha:** 2026-10-15. **Rama:** `chore/refactor-integration-dev`.
- **Merge:** `f595c2d` (`Merge remote-tracking branch 'origin/main' into chore/refactor-integration-dev`). Incorpora `f5fe5b4`, `cef0373`, `205e72d` y `dfcfad4`. `origin/main` es ancestro del HEAD resultante.
- **Alcance remoto:** release 1.45.0/1.45.1 (`CHANGELOG.md`, versión en `package.json`), merge de PR #183 y fix #184 para decodificar títulos de WordPress en `NewsFeed.vue` junto con su regla de `.impeccable/config.json`. El delta neto no añade cambios de Catalog.
- **Conflictos y resolución:** Git integró con estrategia `ort` sin conflictos; `package.json` se auto-unió. Antes del merge se guardó el contenido local de `.impeccable/config.json` en un stash limitado a ese archivo y en una copia temporal. Después se restauró desde esa copia y `cmp` confirmó identidad byte por byte; no se incluyó la edición local en el merge. No se necesitó resolución manual de código.
- **Archivos protegidos:** `.impeccable/config.json` mantiene el SHA-256 previo `cab08d974fc04151d40a0f6f218f4097236f9e5a601504785fe98626302e796d`; `.aws` sigue siendo el archivo local vacío (0 bytes, modo 600); `.env`, `.impeccable/hook.cache.json` y `.yarn/install-state.gz` conservaron sus hashes previos. `.aws` y `.env` no aparecen en el árbol versionado entrante.
- **Verificaciones posteriores al merge:** 6 suites focalizadas, 27 tests aprobados; `yarn build` pasó con `vue-tsc --noEmit`. `git diff --check` y `git diff --check HEAD^1 HEAD` pasaron; no hay entradas sin resolver. El build mantiene los avisos conocidos de Browserslist, `.flex-[2]` y tamaño de chunk.
- **Prettier:** `package.json` y la sección de release añadida a `CHANGELOG.md` pasan formato localizado. El `--check` de archivo completo marca formato histórico en `CHANGELOG.md` y `NewsFeed.vue`; se evitó reformatarlos completos para no introducir cambios ajenos. `NewsFeed.vue` quedó idéntico al contenido del merge commit.
- **Estado final:** merge confirmado en `f595c2d`; el único cambio tracked local pendiente es la copia protegida de `.impeccable/config.json`, y `.aws` sigue sin seguimiento. El stash de protección se conserva como recuperación. No se hizo push, merge a `main` ni despliegue.
- **Bloqueos de publicación:** siguen pendientes la integración HTTP real del contrato frontend/backend y la validación del esquema/migraciones de producción descritas en `roadmap/catalog-regression-2026-10-15.md` del backend.
