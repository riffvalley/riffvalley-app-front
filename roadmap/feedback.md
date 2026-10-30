# Feedback — FB-1 auditoría y FB-2 modularización

## Estado

**Feedback: COMPLETADO Y CERRADO. FB-1 — auditoría completada. FB-2 — modularización, tests y cierre completados.** El inventario y los hallazgos FB-1 que siguen a continuación describen el estado previo a la migración. FB-2 registra la implementación final al final del documento. Los contratos y permisos del backend no se verificaron.

Feedback es la capacidad de bugs y sugerencias de usuarios. No es Requests, que gestiona solicitudes para añadir discos y tiene su propio módulo en `src/modules/requests/`.

## Inventario funcional confirmado

### Usuario autenticado

La pantalla `src/views/suggestions/SuggestionsPage.vue` ofrece:

- Envío de una **sugerencia** o un **bug**, con título (máximo 200 caracteres) y descripción obligatorios. La interfaz valida que ambos valores tengan contenido tras recortar espacios; no declara límite de longitud para descripción.
- Lista de aportaciones propias con tipo, título, descripción, estado, fecha, motivo de rechazo si existe y descripción del item de versión cuando se vinculó.
- Contadores de pendientes (`in_progress`), hechos (`done`) y rechazados (`rejected`), recibidos en la respuesta de `/suggestions/my`.
- Mensaje de éxito/error al crear. Tras crear vuelve a cargar la lista propia.

No se observan adjuntos, comentarios o respuestas, filtros de usuario, ni acciones de editar o eliminar aportaciones propias. El formulario de usuario no ofrece prioridad; solo envía título, descripción y tipo. No hay una vista pública de detalle.

### Administración

`src/views/suggestions/SuggestionsManagement.vue` ofrece, para el rol frontend `superadmin`:

- Listado con filtros por tipo (todas, bugs, sugerencias) y estado (pendientes, hechas, rechazadas, todas); ambos filtros se envían como parámetros a la consulta. Los contadores de estado se calculan sobre la lista cargada, por lo que reflejan los filtros activos.
- Alta administrativa con título, descripción, tipo y prioridad (baja, media, alta).
- Cambio cíclico de prioridad baja → media → alta → baja, con actualización optimista y reversión local si falla.
- Transición de rechazado a pendiente (“Volver a pendiente”), rechazo con motivo obligatorio, y marcado como hecho mediante selección de un item de versión o la opción de mejora interna.
- Eliminación tras confirmación de SweetAlert. Las mutaciones de alta, rechazo, hecho, reapertura y eliminación actualizan la lista local o vuelven a cargarla, según el flujo.
- Acción “Marcar como leído” para entradas pendientes, usada por el indicador del Sidebar.

No hay comentarios/respuestas administrativas ni edición de título/descripción en la interfaz observada. La API sí declara un `UpdateSuggestionDto` con título y descripción, pero la pantalla solo lo usa para cambiar prioridad. Las llamadas de carga de items de versión alimentan el modal de “hecho”.

## Rutas frontend y permisos

| Path | Nombre | Vista/destino | Autenticación / mínimo frontend | Redirección y navegación |
|---|---|---|---|---|
| `/feedback` | `Feedback` | `SuggestionsPage.vue` | Sí; no declara `requiresRole`, el guard global exige mínimo `user`. | Enlace Sidebar `/feedback`; ruta canónica. |
| `/suggestions` | `LegacySuggestions` | Sin vista; redirect a `Feedback` conservando query y hash. | El destino requiere autenticación y mínimo global `user`. | Compatibilidad de navegación; test de rutas comprueba redirección. |
| `/suggestions/management` | `SuggestionsManagement` | `SuggestionsManagement.vue` | Sí; `requiresRole: superadmin`. | Enlace “Soporte” de Sidebar para `superadmin`; muestra contador de pendientes no leídos. |

La comprobación de Router en `src/modules/requests/presentation/views/requestsRoutes.test.ts` incluye Feedback y verifica que `/feedback` conserve el requisito de autenticación sin rol explícito. `src/layouts/default/components/SidebarMenuPermissions.test.ts` verifica que el enlace administrativo y el contador respeten el rol.

No aparecen otras rutas frontend de Feedback. La búsqueda de navegación programática por nombre/ruta no encontró consumidores productivos adicionales: Sidebar declara destinos en `src/layouts/default/components/routes.json`; el test de Requests comparte assertions del redirect legacy.

Decisión ejecutada en FB-2: `/admin/feedback` es la ruta administrativa canónica y `/suggestions/management` redirige a ella conservando query y hash. La ruta antigua no monta una vista ni permite eludir el guard `superadmin`.

## Operaciones HTTP y contratos frontend

Las operaciones de Feedback se concentran en `src/services/suggestions/suggestions.ts`, sobre el Axios autenticado compartido `@services/api/api`. Las rutas de esta tabla son **endpoints HTTP del backend**, no rutas de Vue Router.

| Método y endpoint HTTP | Servicio | Entrada/tipos declarados | Respuesta declarada | Consumidores |
|---|---|---|---|---|
| `POST /suggestions` | `createSuggestion` | `CreateSuggestionDto`: `title`, `description`, `type?`, `priority?` | `Suggestion` | Formulario usuario y alta admin. |
| `GET /suggestions` | `getSuggestions` | Query `type?`, `status?` | `Suggestion[]` | Listado admin. |
| `GET /suggestions/my` | `getMySuggestions` | Query `type?`, `status?` | `MySuggestionsResponse`: `data` y conteos por estado | Lista propia. |
| `PATCH /suggestions/:id` | `updateSuggestion` | `UpdateSuggestionDto`: campos opcionales title, description, type, priority | `Suggestion` | Prioridad admin (optimista en la vista). |
| `PATCH /suggestions/:id/progress` | `progressSuggestion` | Sin payload | `Suggestion` | Reapertura de rechazado. |
| `PATCH /suggestions/:id/reject` | `rejectSuggestion` | `{ rejectionReason: string }` | `Suggestion` | Rechazo admin. |
| `PATCH /suggestions/:id/done` | `doneSuggestion` | `{ versionItemId?: string }` | `Suggestion` | Cierre admin con item o mejora interna. |
| `DELETE /suggestions/:id` | `deleteSuggestion` | Sin DTO de entrada | `void` | Eliminación admin. |

La administración también usa `getCurrentVersionItems`, definido en ese mismo servicio legacy, para `GET /versions/current/items`; su respuesta se tipa con `VersionItem` de `@services/versions/versions`. Es una dependencia de la capacidad de Versiones, no un endpoint de Feedback. Las vistas no reciben `AbortSignal`; los servicios dejan propagar errores Axios salvo que el llamador los capture.

El contador lateral es otra operación compartida, `GET /app/sidebar-summary`, definida en `src/app/sidebarSummary.ts`. Su DTO local declara `suggestions.inProgressIds`; Sidebar cruza esos IDs con el estado local “leído”. No es un endpoint de la API de Feedback ni aparece en `suggestions.ts`.

Los tipos `Suggestion`, `SuggestionUser`, `SuggestionType`, `SuggestionStatus`, `SuggestionPriority`, `CreateSuggestionDto`, `UpdateSuggestionDto` y `MySuggestionsResponse` viven junto al servicio legacy. No se encontró una segunda declaración de esos DTOs en `src/` ni tests unitarios del servicio de Suggestions.

## Estado arquitectónico actual

| Responsabilidad | Ubicación y estado |
|---|---|
| API/transporte | `src/services/suggestions/suggestions.ts`; centraliza las ocho operaciones HTTP de Feedback y además la consulta auxiliar de Versiones. Usa Axios compartido. |
| Tipos | En el mismo servicio legacy; contratos de dominio y DTOs sin carpeta/owner modular propio. `VersionItem` se importa de Versiones. |
| Application | No hay capa de aplicación de Feedback. Las vistas hacen llamadas, capturan errores, coordinan carga y mutaciones, y gestionan estado remoto de forma local. |
| Presentation | Dos vistas en `src/views/suggestions/`, aún no trasladadas a `src/modules/`. Cada vista contiene formulario/lista y lógica de interacción. |
| Estado remoto | Datos de usuario/admin en `ref` locales y peticiones en `onMounted`; no usan Query para Feedback. Query se usa únicamente para invalidar el resumen compartido del Sidebar tras algunas mutaciones. |
| Estado cliente de “leído” | `src/stores/support/support.ts`, Pinia con IDs en `localStorage` (`rv_support_read_ids`). No guarda una copia de la respuesta remota. El Sidebar usa la misma store para derivar el contador no leído. |
| Contrato Sidebar | `src/app/sidebarSummary.ts` posee una query por usuario, rol y generación de sesión; ambas vistas invalidan su caché con `mutateAndInvalidateSidebarSummary` tras crear y tras algunas acciones admin. La prioridad no cambia el resumen. |

No se detectaron imports desde Feedback hacia internals de `src/modules/requests/`, dependencias circulares dentro de Feedback ni DTOs duplicados. Requests comparte el router test que comprueba rutas de Feedback, sin depender de sus internals. Las dependencias transversales confirmadas son Axios, QueryClient para el resumen lateral, SweetAlert y, en administración, store de soporte y servicio/tipo de Versiones.

### Dependencias legacy que permanecen

- Router aún importa las dos vistas desde `@views/suggestions/`.
- Ambas vistas importan directamente `@services/suggestions/suggestions` y tipos declarados en ese servicio.
- La vista admin importa `@stores/support/support`, y ambas vistas importan `@/app/sidebarSummary`.
- La vista admin importa un tipo y una consulta de Versiones desde `@services/versions/versions`.
- No existe entrada pública del módulo Feedback, API separada, tipos propios de módulo, coordinador de aplicación o tests focalizados del dominio.
- El registro del Sidebar usa la URL administrativa legacy en `routes.json` y `SidebarMenu.vue` la reconoce literalmente al pintar el contador.

No se propone borrar ni trasladar la store global de “leído” automáticamente: su persistencia local puede seguir siendo estado de cliente si FB-2 conserva ese comportamiento y owner. La consulta Sidebar y sus tipos pertenecen a la composición compartida de App, no deben duplicarse dentro de Feedback.

## Hallazgos FB-1

Los siguientes son observaciones del código frontend; no se atribuyen a un cambio reciente ni se verificaron contra el backend.

### Defectos de UX/errores funcionales observables

| Archivo | Comportamiento y problema | Impacto / bloquea | Propuesta para FB-2 |
|---|---|---|---|
| `src/views/suggestions/SuggestionsPage.vue` | `fetchMine` captura el fallo sin exponer error ni reintento. El `finally` termina la carga y la pantalla muestra el mismo empty state que para cero resultados. | El usuario no distingue fallo de ausencia de aportaciones; sí conviene corregir al migrar. | Exponer estado de error y acción de reintento; conservar lista vacía solo para respuesta exitosa vacía. |
| `src/views/suggestions/SuggestionsManagement.vue` | `fetchAll` usa `try/finally` pero no captura ni representa error; fallos de la carga inicial o al cambiar filtros pueden dejar la vista vacía o conservar datos anteriores, y la promesa puede quedar rechazada sin mensaje. | Administración no puede diferenciar una lista vacía de fallo; sí conviene corregir al migrar. | Modelar error de query/carga y ofrecer reintento, sin borrar datos existentes al fallar una recarga. |

No se identificó en el código inspeccionado otro defecto funcional confirmado que requiera intervenir en FB-1.

### Arquitectura, tipado y legacy

| Archivo/área | Hallazgo | Impacto / bloquea | Propuesta para FB-2 |
|---|---|---|---|
| `src/views/suggestions/SuggestionsPage.vue`, `SuggestionsManagement.vue` | Las vistas poseen transporte, estado remoto, validación/interacción y renderizado; las dos mantienen arrays/loading locales y no separan coordinación de presentación. | Acopla reglas y dificulta pruebas focalizadas; es el principal objetivo de modularización. | Añadir solo capa de aplicación necesaria para queries/mutaciones y conservar vistas como composición. Extraer componentes si reduce responsabilidades reales. |
| `src/services/suggestions/suggestions.ts` y ambas vistas | Contratos HTTP y DTOs conviven en un servicio global legacy; las llamadas no aceptan `AbortSignal` ni se aíslan explícitamente por usuario/generación de sesión. | Riesgo de respuesta tardía que escriba datos de una sesión anterior; no impide mover el owner, pero debe cubrirse por el carácter privado de “mis envíos” y admin. | Crear `api/` y `types/` de Feedback; decidir consultas por caso con Query, claves con usuario/generación y cancelación. No cambiar endpoints/payloads. |
| `src/views/suggestions/SuggestionsManagement.vue` | `fetchAll` construye params como `any`; además acepta forma `Suggestion[]` o `.data` mediante `as any`, aunque `getSuggestions` declara únicamente `Suggestion[]`. | Pierde comprobación de contrato y encubre divergencia potencial entre vista y API. No hay evidencia de que la respuesta real sea la forma alternativa. | Alinear consumidor con el tipo ya declarado y eliminar fallback no sustentado; si el contrato confirmado difiere, tiparlo solo con evidencia. |
| Ambas vistas | La validación trim de título/descripción está duplicada en presentación; la vista admin la repite para su formulario de creación. | Mantenimiento duplicado acotado; no bloquea. | Compartir una regla dentro del owner solo si la capa de aplicación o un formulario compartido la necesita; no añadir abstracción genérica. |
| `src/stores/support/support.ts`, Sidebar | Los IDs leídos se persisten globalmente en `localStorage`, fuera de ámbito de usuario; no se limpian al cambiar sesión y el Sidebar resta esos IDs de la lista del resumen. | Un mismo navegador comparte el estado de lectura al cambiar de cuenta; el efecto visible depende de si los IDs del backend se comparten. Contrato backend no comprobado; riesgo, no defecto confirmado. | Inspeccionar durante FB-2 el alcance esperado y conservar persistencia/semántica salvo decisión explícita; no mezclar el indicador en caché de Feedback. |

No se encontraron archivos huérfanos atribuibles a Feedback mediante búsqueda de imports; el servicio es consumido por ambas vistas y la store por Sidebar/admin. Tampoco hay evidencia frontend para declarar endpoints, campos o permisos backend inválidos.

## Comparación con Requests

`src/modules/requests/` aporta patrones aplicables, no una plantilla obligatoria:

- Axios compartido en un módulo `api/` y DTOs en `types/`, manteniendo endpoints y payloads.
- `application/` para queries/mutaciones, `AbortSignal`, claves privadas por usuario/generación e invalidación específica.
- Vistas de presentación con estado explícito de carga/error/vacío y reintento; errores Axios se mantienen distinguibles.
- Tests focalizados de API, aplicación, permisos/rutas y flujos de vista.

Feedback puede necesitar Query para listas privadas y mutaciones porque hay lectura, filtros, refetch e identidad de sesión. No necesita replicar las siete operaciones, contratos, roles ni estructura exacta de Requests. El contador de Sidebar sigue siendo un contrato de aplicación compartido; se invalida solo donde cambia su contenido. No se recomienda duplicar ese resumen ni moverlo a Feedback.

## Plan mínimo recomendado en FB-1 (ejecutado en FB-2)

### FB-2 — Modularización, tests y cierre (M)

**Objetivo:** trasladar el ownership de Feedback a `src/modules/feedback/`, preservar los flujos observados y cerrar los fallos de estado de error y las debilidades de sesión/tipado confirmadas.

**Áreas previstas:** `src/modules/feedback/{api,types,application,presentation}` según responsabilidades que realmente resulten necesarias; `src/router/index.ts`; las dos vistas actuales y sus importadores; `src/layouts/default/components/` para navegación solo si se aprueba normalizar la ruta; `src/stores/support/support.ts` y `src/app/sidebarSummary.ts` solo si se requiere ajustar el límite compartido del contador. Revisar referencias antes de retirar los archivos legacy.

**Criterios de aceptación:**

1. Crear/listar aportaciones propias y todas las acciones administrativas conservan formularios, validaciones, textos, filtros, confirmación, prioridad, vinculación a versión, estados y permisos actuales.
2. Los fallos de listado propio y administrativo tienen estado visible distinto de vacío y reintento; las mutaciones comunican fallo y reflejan/invalidadan los datos afectados.
3. Los datos privados no se muestran entre sesiones: las consultas consideran identidad/generación, pueden cancelarse cuando proceda y no aceptan resultados obsoletos.
4. API y DTOs quedan bajo ownership Feedback; las vistas no importan directamente transporte. No cambian métodos, endpoints ni payloads backend.
5. La invalidación del resumen lateral ocurre para las mutaciones que cambian sus IDs; el estado “leído” conserva semántica comprobada, con cualquier decisión de scope documentada.
6. No quedan consumidores funcionales del servicio legacy; no quedan imports de Feedback a internals de Requests ni ciclos nuevos.
7. Tests focalizados cubren contratos API, claves/cancelación/invalidación de aplicación, estados de formulario/listado/errores y permisos/redirecciones. `git diff --check` y typecheck; pruebas/build adicionales según el alcance funcional y las convenciones vigentes.

**Decisión de URL:** incorporada en FB-2 junto a la modularización; no se creó una tarea separada. El Sidebar enlaza a `/admin/feedback` y conserva el contador.

**Tests focalizados previstos:** nuevos tests del servicio/API (método, endpoint, parámetros/payload y propagación de error), aplicación (aislamiento usuario/generación, cancelación, invalidación), vistas (validación, éxito, carga/error/vacío/reintento y mutaciones), y Router/Sidebar (permisos y URL canónica/legacy según decisión). No se ejecutan ni se crean en FB-1.

No se recomienda dividir FB-2 en subtareas: API, aplicación y dos vistas forman una migración acotada y validable como una sola capacidad, sin dependencia real entre fases.

## Riesgos y límites

- No se inspeccionó backend; forma real de respuesta de `/suggestions`, defaults de prioridad, autorización de endpoints y semántica de los IDs de resumen no se verifican desde este checkout.
- Cambiar la ruta de administración puede afectar bookmarks/enlaces externos; conservar redirect evita romper el path observado, pero la nueva URL requiere decisión de producto.
- Las pruebas actuales de Requests prueban Feedback en el mismo archivo por compartir Router; no son tests de los flujos funcionales de Feedback.
- La auditoría no hizo pruebas visuales, manuales en navegador, tests, build ni typecheck; no se acredita validación de GitHub Actions.

## FB-2 — ejecución y cierre

**Estado: COMPLETADA. Feedback queda COMPLETADO Y CERRADO para el alcance frontend acordado.** No se abre FB-3.

### Estructura modular final

- `src/modules/feedback/api/feedback.ts`: ocho operaciones HTTP del dominio usando el Axios autenticado compartido.
- `src/modules/feedback/types/feedback.ts`: entidad y DTOs de Feedback; `VersionItem` se importa del servicio dueño de Versions.
- `src/modules/feedback/application/useFeedback.ts`: queries propias/admin y de items de versión, claves por usuario y generación de sesión, guardas antes/después de fetch, mutaciones e invalidación.
- `src/modules/feedback/application/feedbackErrorMessage.ts`: lectura segura del mensaje Axios para conservar el feedback de creación existente.
- `src/modules/feedback/presentation/views/FeedbackView.vue`: envío y lista propia.
- `src/modules/feedback/presentation/views/FeedbackManagementView.vue`: filtros, lista, modales y acciones administrativas.

No se añadieron stores. Las dos vistas consumen Query y no importan Axios ni el servicio legacy. No se creó un barrel público sin consumidores externos ni componentes/capas vacíos.

### API y contratos migrados

Las ocho operaciones conservan métodos, rutas HTTP bajo `/suggestions`, payloads y tipos de respuesta declarados en el servicio previo: crear, listar todas, listar propias, actualizar, reabrir, rechazar, completar y eliminar. Los GET aceptan la señal de cancelación de Query; las APIs de mutación y los errores Axios mantienen su comportamiento. La vista admin ya consume el tipo declarado `Suggestion[]`; no se conservó la forma alternativa `.data` porque no hay evidencia del contrato.

El GET `/versions/current/items` quedó en `src/services/versions/currentVersionItems.ts`, dentro del owner legacy de Versions (no existe un módulo ni entrypoint público de Versions). Feedback lo consume mediante una query con clave propia de usuario/generación y cancelación; no se trasladaron más servicios ni se refactorizó Versions. Su contrato también permanece basado en el tipo frontend existente `VersionItem`, sin verificación backend.

### Queries, mutaciones y sesión

- Lista propia: `GET /suggestions/my`, clave `feedback/mine/userId/generation`, conserva respuesta `data` y conteos.
- Lista admin: `GET /suggestions?type&status`, clave con `userId`, generación, tipo y estado; filtros siguen enviándose como parámetros.
- Los fetch verifican sesión/rol antes y después de la operación, entregan `AbortSignal` al API y no devuelven `[]` ante errores.
- Crear, actualización de prioridad, reapertura, rechazo, completado y eliminación invalidan la raíz de Feedback tras éxito. Alta y cambios de pertenencia invalidan además el resumen Sidebar; prioridad no lo hace.
- No se duplica estado remoto en Pinia. La store existente de IDs leídos sigue en su ubicación y conserva su persistencia/comportamiento; Sidebar usa el endpoint y contador compartidos existentes.

### Vistas, errores y permisos

Las vistas preservan campos, límites, validaciones, textos, estados, filtros, prioridad cíclica optimista, motivos, confirmación de borrado, mejora interna y vínculo con item de versión. El fallo de lista propia ya no parece lista vacía: muestra error y reintento. La administración distingue carga, error, vacío y datos; mantiene los datos previos ante fallo de refetch y ofrece reintento. Los errores de mutaciones se presentan con los mensajes existentes.

| Ruta | Nombre | Vista | Guard conservado |
|---|---|---|---|
| `/feedback` | `Feedback` | `FeedbackView.vue` | Autenticación; mínimo global `user`, sin rol explícito. |
| `/admin/feedback` | `AdminFeedback` | `FeedbackManagementView.vue` | Autenticación y mínimo `superadmin`. |
| `/suggestions` | `LegacySuggestions` | Redirect a `Feedback` | El destino conserva su guard. Query/hash preservados. |
| `/suggestions/management` | `LegacySuggestionsManagement` | Redirect a `AdminFeedback` | El destino conserva `superadmin`; query/hash preservados. |

Sidebar enlaza a las rutas canónicas. El badge administrativo y “Marcar como leído” se conservan sin mover ni duplicar su estado. Los tests comprueban que ningún alias legacy evita el guard.

### Legacy eliminado y límites de contrato

La búsqueda de imports confirmó que las dos vistas eran los consumidores de `src/services/suggestions/suggestions.ts`; al migrarlas, se eliminó ese servicio. Las vistas legacy se movieron a `src/modules/feedback/presentation/views/`; no queda una segunda copia. Las menciones a esas rutas/servicios en los apartados FB-1 y roadmaps históricos son contexto, no imports activos.

No se encontró el backend en este alcance frontend ni se afirmaron DTOs reales. Permanecen sin verificar contra backend la forma de respuesta de `/suggestions`, defaults de prioridad, autorización de endpoints, campos opcionales de usuario y semántica de IDs del resumen. No se cambió contrato HTTP. La lista administrativa usa exclusivamente `Suggestion[]`, que era la respuesta declarada antes de FB-2.

### Tests y verificaciones FB-2

Tests focalizados añadidos para métodos/payloads/errores de API, cancelación, clave y sesión, filtros, mutaciones e invalidación, formulario/lista/reintento, acciones admin, vínculo e integración de versiones, navegación, guards, redirecciones y Sidebar. No se usaron mocks para afirmar contratos backend reales.

### Verificación local

- Vitest focalizado de Feedback, Router compartido y Sidebar: **9 archivos, 48 tests aprobados**. Tras el ajuste final de labels/markup, el test de administración se repitió por separado: **1 archivo, 6 tests aprobados**.
- Typecheck: aprobado.
- ESLint focalizado de todo `src/modules/feedback/`, Router, test de Sidebar y API auxiliar de Versions: aprobado.
- ESLint de `SidebarMenu.vue`: reporta dos errores preexistentes en líneas no modificadas (imagen sin `alt` y label sin control asociado, líneas 9 y 253). La única línea cambiada para Feedback es la condición del badge; no se corrigió deuda ajena.
- Build: aprobado. Salida mantiene avisos del proyecto de Browserslist desactualizado, minificación CSS de `.flex-[2]` y tamaño de chunk superior a 500 kB; no bloquean el build y no corresponden a FB-2.
- `git diff --check`: aprobado.
- Búsqueda de imports productivos `@services/suggestions/suggestions` y `@views/suggestions/` en `src/`: sin resultados. El test de arquitectura conserva strings para comprobar que esos imports/rutas legacy no reaparecen.
- Enlaces Markdown locales modificados: destino `roadmap/feedback.md` desde `roadmap.md` y desde `docs/frontend/architecture.md` comprobado. `markdown:links:delta` terminó informativo porque faltan base/head completos y checkout limpio; no se presenta como validación del delta.

No se hicieron comprobaciones visuales ni manuales; no se ejecutó GitHub Actions. Los endpoints/DTOs reales siguen sin contrastarse con backend.
