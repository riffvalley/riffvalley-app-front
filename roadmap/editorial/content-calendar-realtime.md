# Content Calendar en tiempo real — frontend

## Estado final

**Primera fase SSE de Editorial → Content Calendar: COMPLETADA Y CERRADA el 2026-11-01.** El propietario del proyecto confirmó personalmente que SSE v2 funciona correctamente en Heroku, incluyendo sincronización entre editores y toasts descriptivos. Esta es una aceptación funcional integrada observada por el propietario; no es un benchmark ni una certificación de capacidad.

| Tarea                                          | Estado                                                      |
| ---------------------------------------------- | ----------------------------------------------------------- |
| SSE-1 — Auditoría y arquitectura               | Completada y documentada en el roadmap backend.             |
| SSE-2 — Infraestructura SSE                    | Completada en backend.                                      |
| SSE-3 — Publicación tras commit                | Completada en backend.                                      |
| SSE-4 — Cliente SSE y TanStack Query           | Completada en frontend.                                     |
| SSE-6a-BE — Contrato descriptivo               | Completada en backend.                                      |
| SSE-6b-FE — Toasts descriptivos                | Completada en frontend.                                     |
| SSE-5 — Aceptación funcional integrada del MVP | Cerrada por aceptación funcional del propietario en Heroku. |

El contrato vigente es exclusivamente `contents.invalidate` v2. No hay negociación ni compatibilidad activa con v1. Esta aceptación cierra la fase funcional; no acredita pruebas formales de carga o escalabilidad. E-CC permanece cerrada y no se reabre.

## Validación integrada confirmada

El propietario confirmó que el sistema desplegado en Heroku funciona correctamente. La confirmación cubre el funcionamiento general observado de Content Calendar con conexión SSE autenticada, recepción de eventos, actualización mediante TanStack Query y presentación de toasts descriptivos con Vue Sonner. No se atribuye a esta confirmación la ejecución individual de escenarios no mencionados, una inspección visual del agente ni una medición de carga.

## Arquitectura y comportamiento final

- El backend expone `GET /api/contents/events`, autenticado con Bearer JWT y autorizado para `riffvalley` y `superadmin`. Usa un publisher RxJS en memoria y publica `contents.invalidate` v2 después del commit, una vez por operación lógica. Contents cubre creación, edición y eliminación; Lists publica cuando su sincronización cambia o elimina Content.
- El stream usa heartbeat de 25 segundos y termina como máximo a los 10 minutos. No hay Redis ni persistencia de eventos. La desconexión no mantiene historial ni garantiza entrega a usuarios que no están conectados.
- El frontend usa `fetch` y `ReadableStream`, reutiliza renovación de Identity, reconecta con backoff e invalida TanStack Query; HTTP es la fuente de verdad y el payload SSE no parchea la caché.
- Una pestaña genera un `sourceId` efímero con `crypto.randomUUID()` y lo envía mediante `X-Content-Calendar-Client-Id`. El frontend silencia los toasts de esa misma pestaña, respeta «Mis eventos» y agrupa invalidaciones durante 180 ms. La conexión existe solo mientras Content Calendar está montado.
- Vue Sonner muestra toasts discretos con actor, acción, Content y fecha cuando corresponde, después de un refetch exitoso que confirma cambios visibles.

## Alcance funcional cerrado

La fase sincroniza creación y edición de eventos, programación desde backlog, movimientos entre fechas, retirada al backlog, eliminación y cambios indirectos de Lists que modifican Content. Los usuarios con el calendario abierto y permisos vigentes reciben los avisos descriptivos pertinentes. No se implementa historial de actividad, notificaciones personales ni entrega diferida para usuarios desconectados.

## Limitaciones y seguimiento operativo

La primera fase se acepta funcionalmente sin afirmar capacidad cuantitativa. No constan como ejecutados un benchmark formal de 12, 50, 100 y 500 conexiones, mediciones cuantitativas de memoria/CPU/latencia, pruebas de estrés ni reconexión masiva.

El proyecto aplaza conscientemente esos ensayos fuera de SSE-5. Se conserva el seguimiento separado **SSE-OPS-1 — Benchmark operativo** para decidir si hacen falta según crecimiento y configuración de dynos; no bloquea el cierre funcional del MVP.

Como evoluciones posteriores independientes pueden evaluarse SSE para cambios internos de Lists, notificaciones personales, persistencia/historial, Web Push, ámbitos de suscripción, distribución entre varios dynos y Redis Pub/Sub si la infraestructura lo requiere. Los futuros ajustes pequeños de interfaz del calendario también se tratarán como tareas independientes; no reabren E-CC ni SSE.

## Verificación frontend registrada

Vitest focalizado pasó en `TZ=UTC` y `TZ=Europe/Madrid` (5 archivos, 105 pruebas por ejecución). Typecheck, build, ESLint focalizado, Prettier focalizado y `git diff --check` pasaron. El lint de servicios legacy reportó hallazgos preexistentes fuera de las líneas modificadas; los gates estructurales locales tuvieron limitaciones de comparación ya registradas. No se hizo inspección visual manual por parte del agente. Estos checks locales se distinguen de la aceptación funcional de Heroku confirmada por el propietario.
