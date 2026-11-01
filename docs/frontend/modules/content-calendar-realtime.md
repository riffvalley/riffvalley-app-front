# Tiempo real de Content Calendar

El módulo consume `GET /api/contents/events` mientras `ContentCalendar.vue` está montado. El contrato fuente es el SSE v2 de `riffvalley-app-back/roadmap/editorial/content-calendar-realtime.md`; el frontend solo lo consume y no cambia backend ni Identity.

## Arquitectura y ciclo de vida

- `application/contentsEventsClient.ts` posee un único Fetch `ReadableStream` por vista/sesión, Bearer en cabecera, `credentials: omit`, renovación a través de `authStore.renewSession`, backoff con jitter, recuperación tras EOF y respuesta 401/403.
- `application/contentsInvalidateParser.ts` procesa frames parciales y UTF-8 incremental. Acepta únicamente `event: contents.invalidate` con `type: "contents.invalidate"`, `version: 2` y `reason: "initial" | "change"`; valida acción, actor, descriptor de Content, fechas civiles, campos y `sourceId`. Un envelope v1, JSON malformado, evento desconocido o heartbeat no llega al coordinador.
- `application/useContentCalendarRealtime.ts` enlaza el stream al montaje, Identity, rol/generación, Query, cambios pendientes y Sonner. Logout, cambio de identidad/rol/generación o desmontaje abortan y limpian stream, listener y timer. La pérdida de red aborta; reconectar invalida de nuevo para recuperar por HTTP.
- `application/contentCalendarRealtime.ts` contiene comparación de proyección, comparación de IDs visibles cambiados, deduplicación del lote, backoff y el formateador editorial puro.
- `application/useContentCalendarOperations.ts` envía `X-Content-Calendar-Client-Id` en las mutaciones editoriales pertinentes; `services/contents/contents.ts`, Articles, Videos y Lists admiten el header de forma optativa. Sin `sourceId`, esos servicios conservan sus llamadas HTTP anteriores.
- `DefaultLayout.vue` mantiene el único `Toaster` compartido de Vue Sonner. Su tema sigue a `useTheme`; los diálogos SweetAlert2 existentes no se alteran.

El ID se genera mediante `crypto.randomUUID()` una vez por pestaña, se envía como cabecera en el stream y en las mutaciones iniciadas desde el calendario, y se compara con `event.sourceId`. No se pone en URL, no autoriza acciones ni implementa tracking general. Por tanto, dos pestañas del mismo usuario tienen IDs diferentes: se omiten los avisos propios de esta pestaña y se pueden mostrar cambios de la otra.

## Contrato v2

El evento inicial es `{"type":"contents.invalidate","version":2,"reason":"initial"}`. Se invalida la consulta, pero nunca produce toast. Los cambios tienen `reason: "change"`, `action`, `actor`, `content`, `changes` y `sourceId` opcional. Acciones admitidas: `created`, `updated`, `scheduled`, `moved`, `unscheduled`, `deleted`. Las fechas son días civiles `YYYY-MM-DD`; `fields` contiene nombres de campos sin sus valores.

La validez estructural no exige todos los metadatos editoriales: un cambio v2 genérico o incompleto se acepta y recibe el fallback de texto genérico. Los valores presentes sí deben tener el tipo/formato admitido. No hay negociación, coerción ni tipos, validaciones o adaptadores legacy.

## TanStack Query y avisos

Cada evento agrupa la invalidación de `contentCalendarQueryKeys.root(userId, generation, role)` durante 180 ms. La invalidación/refetch de consultas activas se mantiene incluso para conexión inicial, reconexión, eventos originados localmente o lotes cuyo toast se suprime. La respuesta HTTP es la autoridad: el payload SSE nunca parchea Query.

Solo un refetch activo exitoso permite comprobar el toast. Se compara el valor anterior y posterior de la proyección que ya recibe el calendario, incluyendo mes y backlog, y se correlacionan los IDs modificados con `event.content.id`. No hay aviso si el valor visible no cambió, Query falla, el Content queda oculto por «Mis eventos» o la mutación se originó en esta pestaña. Un evento sin ID no permite atribución fiable: puede usar el fallback genérico cuando «Mis eventos» está apagado; si el filtro está activado, se omite.

La operación local pendiente no se interrumpe: Query se invalida al quedar libre, sin sustituir la caché con SSE ni escribir sobre borradores. Se mantiene la supresión prudente del lote recibido durante una operación para proteger drag-and-drop optimista, rollback, reconciliación, guardados parciales y formularios.

## Mensajes

El formateador recibe un evento v2 validado y solo devuelve texto:

| Acción        | Presentación                                           |
| ------------- | ------------------------------------------------------ |
| `created`     | «María ha creado Radar semanal»                        |
| `scheduled`   | «María ha programado Radar semanal para el 01/11/2026» |
| `moved`       | «María ha movido Radar semanal al 01/11/2026»          |
| `unscheduled` | «María ha enviado Radar semanal al backlog»            |
| `updated`     | «María ha actualizado Radar semanal»                   |
| `deleted`     | «María ha eliminado Radar semanal»                     |

Para `moved`, si ambas fechas existen, se presenta «del 30/10 al 01/11» y se incluyen los años si no coinciden. Las fechas se formatean desde su cadena civil, sin construir una fecha UTC que desplace el día. Títulos y nombres se interpolan como texto, nunca mediante `v-html` ni HTML del stream. Datos incompletos producen un fallback como «Hay cambios editoriales en el calendario», sin nombres, títulos o fechas inventados.

## Agrupación y presentación

Se deduplican payloads idénticos dentro de 180 ms y se ejecuta un refetch por lote. Un solo descriptor visible produce toast descriptivo; varios descriptores visibles generan uno agregado que nombra al actor único o a los editores distintos, sin atribuir sus acciones a una sola persona. La política agrega como máximo un mensaje por ventana. Ningún evento del lote se pierde para invalidación.

Se reutiliza Vue Sonner 2.0.9: arriba a la derecha, uno visible, 3 segundos, icono por acción, superficie neutral de Sonner, tema claro/oscuro, sin sonido, modal, botón ni captura del foco. No se crea otro componente de notificación.

## Tests y evidencia

Las pruebas enfocadas conservan los casos de SSE-4 y verifican parser exclusivo v2/rechazo v1, flujo inicial, transporte Bearer, refresh, 401/403, EOF/backoff, cancelación/sesión/rol, cada acción, actor de sistema, metadatos incompletos, días civiles, cambios de año, backlog, comparación visible, filtro «Mis eventos», refetch exitoso/sin cambios/fallido, origen igual/ajeno y dos pestañas del mismo usuario, eventos duplicados/agrupados, protección de operaciones pendientes y encabezado de mutaciones.

Las pruebas y gates locales realizados para SSE-6b-FE están registrados en `roadmap/editorial/content-calendar-realtime.md`. No equivalen a Actions de GitHub ni a la validación integrada final SSE-5. No se hizo inspección visual manual de toasts, conforme a la petición; la verificación visual queda para la persona solicitante.

## Limitaciones

`sourceId` es opcional y efímero. Si backend o una ruta de mutación no lo propaga, no se puede confirmar el origen de forma fiable; se conserva la supresión durante mutaciones locales pendientes y no se ocultan indiscriminadamente los eventos del mismo usuario. El canal no guarda ni reproduce eventos: la reconexión recupera el estado actual por HTTP. Un toast confirma cambio visible tras refetch, no evita conflictos concurrentes. Consultas de meses no activos quedan stale hasta reactivarse.
