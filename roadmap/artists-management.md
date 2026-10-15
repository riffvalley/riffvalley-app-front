# Artists Management

## BC-ART-4.F — Recuperar páginas fuera de rango

- **Estado:** implementada en frontend el 2026-10-15.
- **Comportamiento:** si `currentPage > totalPages` y `totalPages >= 1`, la vista ofrece volver directamente a la última página válida. La paginación normal conserva sus controles; con `totalPages === 0`, permanece el estado vacío sin navegación.
- **Solicitudes:** la recuperación ocurre tras una acción explícita. Se ignoran destinos inválidos, la página actual y nuevas navegaciones mientras hay una petición en curso.
- **Alcance:** solo frontend. No cambia el endpoint ni su respuesta.
- **Estado de BC-ART-4:** pendiente. Esta adaptación prepara al frontend para el contrato de conteos acordado, pero no implementa ni completa el cambio backend.
