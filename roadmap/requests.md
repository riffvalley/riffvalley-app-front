# Solicitudes de discos — SD-1 y SD-2

## Estado

**Solicitudes de discos: COMPLETADAS Y CERRADAS** para el alcance frontend acordado. SD-1 (auditoría) y SD-2 (modularización) están completadas en este checkout. No se crean fases adicionales.

La auditoría SD-1 identificó `/suggest` como creación y consulta de solicitudes propias, `/petitions` como administración, y `/suggestions` como una capacidad diferente para bugs y sugerencias que queda fuera de alcance. Antes de SD-2, las siete operaciones HTTP estaban centralizadas en `src/services/requests/requests.ts` y las dos vistas las consumían directamente.

## Estructura modular final

`src/modules/requests/` posee la capacidad y organiza las responsabilidades necesarias:

- `api/requests.ts`: siete operaciones HTTP sobre el Axios autenticado compartido.
- `types/requests.ts`: `CreateRequestDto`, `DiscRequest` y `UpdateRequestDto`.
- `application/useRequests.ts`: consultas propias/administrativas, claves por ámbito, usuario y generación de sesión, cancelación y mutaciones con invalidación.
- `application/requestErrorMessage.ts`: lectura tipada del mensaje de error Axios para conservar los fallbacks actuales.
- `presentation/views/SuggestPage.vue`: formulario y solicitudes propias.
- `presentation/views/PetitionsPage.vue`: administración y acciones existentes.

Las rutas dinámicas de `/suggest` y `/petitions` ahora importan las vistas del módulo. Conservan autenticación y roles mínimos `user` y `riffvalley`, respectivamente. Los payloads, rutas, métodos HTTP, validaciones del formulario, mensajes, acciones administrativas y confirmaciones existentes se mantienen. `/suggestions` y su servicio no se modificaron.

## Contratos, hallazgos y decisiones

Se migraron las siete operaciones existentes sin cambiar endpoints: `POST /requests`, `GET /requests/my`, `GET /requests`, `PATCH /requests/:id`, `POST /requests/:id/approve`, `POST /requests/:id/reopen` y `DELETE /requests/:id` con `{ adminNotes }`. La API devuelve `response.data` como antes y deja propagar los errores; las consultas añaden únicamente `AbortSignal`.

`DiscRequest` no declara `user` y el checkout no contiene otro DTO documentado de respuesta administrativa. El tipo permanece intacto. Para conservar la presentación legacy si el backend incluye ese dato, la vista inspecciona `user` como `unknown` y muestra únicamente una cadena presente en `username`, `name`, `email` o `id`; si falta, no inventa información. La verificación de ese campo con backend queda limitada porque esta iniciativa no modifica backend.

Los `any` de Requests en los formularios se reemplazaron por los DTOs existentes. `UpdateRequestDto` acepta `null` en `genreId`/`countryId` porque el flujo administrativo ya enviaba esos valores cuando se limpiaban los selectores; no se alteró ese payload. Los usos de `any` de otras vistas de importación quedan fuera del alcance.

La consulta de solicitudes propias antes capturaba todos los errores y dejaba la pantalla con apariencia de lista vacía. Ahora Query conserva el error, la vista muestra un estado separado y ofrece reintento. Ambas listas se aíslan por `userId` y `authSessionGeneration`, reciben cancelación de Query y no copian respuestas a Pinia. Las mutaciones invalidan las claves de Requests; creación/aprobación/reapertura/rechazo conservan además la invalidación del resumen lateral donde ya existía.

## Legacy eliminado

La inspección de consumidores encontró exactamente las dos vistas migradas para `src/services/requests/requests.ts`. Tras cambiar ambas y comprobar referencias, se eliminó ese servicio. No se creó un bridge o barrel legacy. No se eliminaron componentes de `/suggestions`.

## Tests y verificaciones SD-2

Tests focalizados añadidos para las siete operaciones, propagación de error, consultas, claves por sesión, autorización de la query administrativa, invalidaciones de las cinco mutaciones, carga/errores/reintento del formulario, validación y limpieza tras éxito, ausencia de imports legacy, filtros/acciones administrativas y presentación tolerante del remitente sin ampliar DTOs, y permisos de Router.

La verificación local final registró **27 tests en 5 archivos aprobados**, typecheck aprobado, ESLint focalizado aprobado, build aprobado y `git diff --check` aprobado. El escaneo completo de enlaces Markdown terminó con código 0 como reporte informativo y reportó ocho enlaces rotos que pertenecen a otros documentos preexistentes; no se encontraron enlaces rotos en `roadmap/requests.md`, `roadmap.md` ni `docs/frontend/architecture.md`. El repositorio no tiene un control arquitectónico focalizado de Requests; los scripts disponibles se limitan a Identity o al grafo global. Un resultado local no acredita ejecución de GitHub Actions.

## Límites

- No se verificaron DTOs contra el backend ni se modificó backend.
- La presencia y forma de `user` en la respuesta administrativa siguen sin contrato verificable; el modelo no declara el campo y la vista solo lo representa de manera defensiva si está presente.
- La ubicación previa de `roadmap/requests.md` no existía en el checkout al inicio; este documento registra SD-1 según el contexto proporcionado y la evidencia SD-2 local.
- Build completado con avisos de Browserslist desactualizado y CSS/minificación existentes; no bloquean la compilación. El escaneo global conserva los ocho enlaces rotos enumerados en su salida, fuera de los documentos modificados.

## SD-3 — Normalización de URLs (mejora posterior)

**Estado: completada.** Requests permanece cerrada desde SD-2; SD-3 fue una mejora posterior limitada a la navegación frontend.

| Capacidad | Ruta canónica | Redirección de compatibilidad | Permiso conservado |
|---|---|---|---|
| Solicitudes propias | `/disc-requests` | `/suggest` | Autenticación y mínimo `user` |
| Administración de solicitudes | `/admin/disc-requests` | `/petitions` | Autenticación y mínimo `riffvalley` |
| Feedback (bugs y sugerencias) | `/feedback` | `/suggestions` | Autenticación; sin rol mínimo explícito |

Las rutas legacy realizan una sola redirección Vue Router a su destino canónico y conservan query y hash. No montan vistas propias; los destinos conservan sus guards. Sidebar, el enlace interno del editor de Noticias, el contador de solicitudes y tests de navegación usan las rutas canónicas. Las etiquetas de navegación son **Solicitar discos**, **Solicitudes de discos** y **Feedback**.

No se cambiaron endpoints HTTP, payloads, DTOs, Axios, Query, servicios, roles ni vistas. Permanecen referencias históricas a URLs anteriores en roadmaps de auditoría, inventarios de roles y changelog. Las referencias activas `/suggestions` corresponden al servicio HTTP de Feedback y a `/suggestions/management`, una pantalla administrativa distinta; no forman parte de esta normalización.

### Verificación SD-3

- Vitest focalizado de rutas, las dos vistas de Requests y Sidebar: **4 archivos y 31 tests aprobados**.
- Typecheck: aprobado.
- ESLint focalizado: Router y tests de rutas/sidebar aprobados. La pasada que incluyó `SidebarMenu.vue` y `NewsModal.vue` reportó 14 errores de accesibilidad/tipado en líneas preexistentes, ninguna en las líneas cambiadas por SD-3; no se corrigió deuda ajena.
- Build: aprobado. Se mantienen avisos existentes de Browserslist, sintaxis CSS `.flex-[2]` y tamaño de chunks.
- `git diff --check`: aprobado.
- Revisión de referencias: en `src/`, las rutas antiguas aparecen solo en las tres declaraciones de redirección y en sus tests (incluidos tests que verifican que no hay enlaces legacy). `/suggestions/management` conserva su función separada y los usos de `/suggestions` en servicios siguen siendo endpoints HTTP de Feedback. La búsqueda de nombres antiguos de ruta no encontró consumidores activos.
- Enlaces Markdown: los enlaces de `roadmap.md`, este roadmap y `docs/frontend/architecture.md` no figuran entre los errores del análisis global. El chequeo delta es informativo porque el checkout modificado no dispone de un par base/head completo; el reporte global lista ocho enlaces rotos en otros documentos preexistentes.
- Limitaciones: no se realizaron comprobaciones visuales o manuales de navegador, de acuerdo con el alcance; no se ejecutó GitHub Actions.
