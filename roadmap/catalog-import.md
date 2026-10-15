# Catalog Import

**Estado del módulo:** en cleanup.

## BC-IMP-2.5 — Adaptar el frontend al contrato único de importación

- **Estado:** completada en frontend el 2026-10-15.
- **Contrato:** Manual consume `{ message, data: { results } }`; Excel consume `{ data: { results } }`. No se interpreta ningún shape legacy.
- **Resultados:** ambas vistas presentan resultados en orden, con estados diferenciados para importados, duplicados omitidos y fallidos. Manual muestra la línea original disponible; Excel muestra hoja y fila física.
- **Errores globales:** los dos mensajes sistémicos seguros del backend se muestran con una advertencia de posibles escrituras anteriores. Los demás errores usan un fallback genérico y no muestran detalles del driver/base de datos.
- **Exclusiones:** no se cambiaron endpoints, formularios, validaciones de fechas ni backend. BC-IMP-3 y BC-IMP-4 siguen pendientes.
- **Despliegue:** coordinar la activación con el backend, ya que el contrato nuevo elimina campos legacy.
