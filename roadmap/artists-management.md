# Artists Management

## BC-ART-4.F — Recuperar páginas fuera de rango

- **Estado:** implementada en frontend el 2026-10-15.
- **Comportamiento:** si `currentPage > totalPages` y `totalPages >= 1`, la vista ofrece volver directamente a la última página válida. La paginación normal conserva sus controles; con `totalPages === 0`, permanece el estado vacío sin navegación.
- **Solicitudes:** la recuperación ocurre tras una acción explícita. Se ignoran destinos inválidos, la página actual y nuevas navegaciones mientras hay una petición en curso.
- **Alcance:** solo frontend. No cambia el endpoint ni su respuesta.
- **Estado de BC-ART-4:** pendiente. Esta adaptación prepara al frontend para el contrato de conteos acordado, pero no implementa ni completa el cambio backend.

## BC-CAT-RELEASE-6 — Preparación de integración

- **Commits incluidos:** `92cd5ed` elimina el filtro de país no soportado en la búsqueda de artistas; `c9f6ffc` recupera páginas fuera de rango y añade su prueba.
- **Verificación:** la suite focalizada de paginación pasó junto con los tests de Catalog/importación; `yarn build` y `git diff --check` también pasaron. Ver el detalle en `roadmap/catalog-import.md`.
- **Integración:** no se incorporó `origin/main`; las refs remotas avanzaron durante la tarea y el merge modificaría `.impeccable/config.json`, que debe conservar sus cambios locales. Estado pendiente de integrar después de revisar el nuevo delta remoto.
