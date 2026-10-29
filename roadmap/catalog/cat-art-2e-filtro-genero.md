# CAT-ART-2e — Filtro por género en Artistas

**Estado:** completada localmente el 2026-10-29 en frontend y backend. Sin migraciones, acceso a producción, commit ni push.

## Implementación

- `GET /api/artists/directory` acepta `genreId` opcional validado como UUID. El servicio filtra con `EXISTS` sobre las relaciones `disc.artistId` y `disc.genreId`, antes del conteo y la paginación. La condición no multiplica artistas; letra y búsqueda textual conservan sus reglas existentes.
- La proyección del directorio sigue obteniendo el género y color del disco más reciente, aunque la pertenencia al género seleccionado venga de un disco anterior. La respuesta y el comportamiento sin `genreId` se conservan.
- El frontend carga todas las páginas del catálogo mediante el servicio existente `getGenres`, muestra «Todos los géneros» junto a la búsqueda y envía `genreId` en la consulta. La clave de TanStack Query incluye letra, búsqueda y género; cada cambio de criterios inicia el listado en offset cero. Las respuestas de otra clave no reemplazan el estado visible.
- El selector cambia el filtro sin desmontar la vista ni el modal compartido. No se modificaron Discos, el modal ni «Rellenar imágenes».

## Verificación local

- Frontend: 14 tests focalizados aprobados; typecheck, build, ESLint focalizado y `git diff --check` aprobados.
- Backend: 34 tests focalizados aprobados; typecheck, build, ESLint focalizado y `git diff --check` aprobados. Incluye validación UUID, combinación con letra/búsqueda, parámetros idénticos de conteo/página y ausencia de predicado cuando se omite `genreId`.
- La prueba de PostgreSQL aislado cubre discos con géneros distintos, coincidencias múltiples sin duplicación, conteo/paginación y color del disco más reciente. Quedó omitida porque este entorno no proporciona las variables de la base de pruebas aislada; no se conectó a otra base.
- El escaneo Markdown del repositorio encontró dos enlaces preexistentes fuera del checkout, en `roadmap/catalog-discs-audit.md` y `roadmap/roles.md`. No señaló enlaces de los documentos de CAT-ART-2e.

## Alcance preservado

CAT-ART-3 (autocompletado) queda descartada. CAT-ART-5 no se inició.
