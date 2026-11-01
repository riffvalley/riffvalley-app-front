# Content Calendar en tiempo real — frontend

## Estado

- **SSE-4:** completada localmente el 2026-11-01. Consumidor frontend de `GET /api/contents/events` integrado con Identity y TanStack Query.
- **SSE-6b-FE:** adaptación descriptiva al contrato v2 completada localmente el 2026-11-01. Contrato exclusivo v2; sin negociación, conversión ni compatibilidad anterior.
- **SSE-5 / validación integrada:** pendiente. No se cierra la primera fase hasta superar la validación integrada final entre frontend y backend. No hay evidencia de GitHub Actions ni de validación contra producción en este cambio.

SSE-1, SSE-2, SSE-3 y SSE-6a-BE pertenecen al roadmap backend y se consultan en `riffvalley-app-back/roadmap/editorial/content-calendar-realtime.md`. Este trabajo modifica únicamente `riffvalley-app-front`.

## Contrato frontend v2

- Fetch con `ReadableStream`, Bearer en cabecera, `credentials: omit`, renovación compartida de Identity y reconexión con backoff/jitter. El stream se monta solo con la vista Content Calendar y se cierra al desmontar o al cambiar identidad, generación, rol o sesión.
- El parser incremental valida exclusivamente `event: contents.invalidate` y JSON `type: contents.invalidate`, `version: 2`, `reason: initial|change`. `initial` invalida Query pero nunca es visible como toast. `change` admite las seis acciones (`created`, `scheduled`, `moved`, `unscheduled`, `updated`, `deleted`) y metadatos opcionales validados (`actor`, `content`, `changes`, `sourceId`). No se adaptan envelopes anteriores.
- `sourceId` se genera con `crypto.randomUUID()` una vez por pestaña. Se envía en cabecera al stream y únicamente en mutaciones editoriales de Content Calendar que pueden generar una invalidación. No se añade a URLs ni se utiliza para permisos. Una mutación originada por la misma pestaña invalida Query y suprime su toast; otra pestaña del mismo usuario conserva su aviso.
- Cada evento, incluido el inicial, agrupa su invalidación de `contentCalendarQueryKeys.root(userId, generation, role)` durante 180 ms. TanStack Query vuelve a consultar los endpoints HTTP actuales; el payload no se aplica a la caché. Un error de refetch suprime el toast y no altera las operaciones locales, su rollback, reconciliación, borradores o formularios.

## Mensajes y visibilidad

El formateador puro recibe el evento v2 validado y produce texto plano:

| Acción        | Mensaje                                              |
| ------------- | ---------------------------------------------------- |
| `created`     | María ha creado Radar semanal                        |
| `scheduled`   | María ha programado Radar semanal para el 01/11/2026 |
| `moved`       | María ha movido Radar semanal al 01/11/2026          |
| `unscheduled` | María ha enviado Radar semanal al backlog            |
| `updated`     | María ha actualizado Radar semanal                   |
| `deleted`     | María ha eliminado Radar semanal                     |

Si `moved` trae las dos fechas, se muestra el rango (`del 30/10 al 01/11`; se incluyen años si difieren). Las fechas civiles `YYYY-MM-DD` se presentan con orden español sin conversión UTC. Títulos y nombres se interpolan como texto; nunca se renderiza HTML recibido por SSE. Si faltan título, actor o acción se usa el fallback genérico disponible, sin inventar metadatos.

Después del refetch activo exitoso se compara la proyección visible anterior y nueva, incluidos Content, cambios de mes y backlog. Solo los IDs de Content presentes en `event.content.id` y cambiados en esa proyección pueden producir un toast descriptivo. Con «Mis eventos» activo, la proyección filtrada es la referencia; un evento ajeno oculto no notifica. Si un evento v2 no trae ID, solo puede usar el fallback genérico cuando el filtro está desactivado y hubo cambio visible. Equivalencia de datos, cambios filtrados y refetch fallido no notifican.

No se avisa por conexión, reconexión, heartbeat, evento inválido/desconocido ni cambio de la pestaña de origen. Si una operación local está pendiente, se conserva la invalidación pero se suprime la notificación del lote para no interferir con drag-and-drop optimista, rollback, reconciliación o formularios abiertos.

## Toasts y agrupación

Se reutiliza Vue Sonner 2.0.9 y el `Toaster` compartido existente: posición superior derecha, un toast visible, duración de 3 s, temas claro/oscuro, icono de acción, sin sonido, modal ni captura de foco. SweetAlert2 conserva su uso actual.

Los eventos se deduplican por payload dentro de la ventana de 180 ms. Tras una única invalidación/refetch se muestran los descriptores que corresponden a IDs visibles cambiados. Un descriptor muestra un mensaje editorial completo; varios descriptores producen un único mensaje agregado («María y Lucía han realizado varios cambios visibles en el calendario» o «Varios editores…»), sin atribuir a un actor cambios de otro. Eventos sin Content correlacionable no entran en el agregado cuando «Mis eventos» está activo. Agrupar toasts nunca omite la invalidación.

## Cobertura y verificaciones

Los tests mantienen los casos útiles de SSE-4 y cubren el parser v2 (incluido rechazo v1), inicialización, UTF-8/frames parciales, acciones, actor sistema, metadatos ausentes, fechas civiles, cambio de año, backlog, filtros, IDs visibles tras refetch, ausencia de diferencias, fallo HTTP, origen local/remoto y entre pestañas, deduplicación, agrupación, sesión, rol, reconexión y operaciones locales pendientes. También verifican que el ID de origen se envía solo como cabecera de mutaciones.

**Verificación local SSE-6b-FE:** Vitest focalizado pasó en `TZ=UTC` y `TZ=Europe/Madrid` (5 archivos, 105 pruebas por ejecución); `pnpm run typecheck`, `pnpm build`, ESLint focalizado de la lógica del módulo y Prettier focalizado pasaron; `git diff --check` pasó. El lint incluyendo los servicios legacy reporta 25 problemas `no-explicit-any`/`no-empty-object-type` en código preexistente fuera de las líneas modificadas; no se amplió el alcance para corregirlos. El reporte Markdown conserva seis enlaces rotos/fuera del checkout en documentos distintos a los editados. `pnpm run cycles` generó un grafo completo pero la comparación quedó informativa porque el checker no resolvió un `HEAD` local como base. Build muestra advertencias preexistentes de CSS `.flex-[2]`, datos Browserslist antiguos y tamaño de bundle.

Estos son resultados locales; no acreditan GitHub Actions ni la validación integrada SSE-5. La limitación de comparación del gate estructural queda registrada y no se atribuyen los ciclos listados al cambio sin una comparación base/head fiable.

## Límites

- El servidor puede omitir `sourceId` en despliegues o rutas que aún no lo propaguen. En ese caso se conserva la supresión prudente por operaciones locales pendientes, sin silenciar globalmente los eventos del mismo usuario. No hay garantía de identificar una operación local si la mutación no transmite el ID.
- Eventos SSE son efímeros y no tienen replay. Conexión y reconexión recuperan la proyección actual por HTTP; meses sin observadores quedan stale hasta que vuelven a estar activos.
- El toast confirma un cambio visible en la respuesta HTTP posterior al evento, no el estado completo del dominio ni resuelve conflictos de edición concurrente.
