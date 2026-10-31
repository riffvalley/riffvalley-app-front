# Editorial — Content Calendar (E-CC)

## Estado y alcance

**Estado:** auditoría inicial completada; roadmap actualizado el **2026-10-31** con seis decisiones de producto. **E-CC-1 a E-CC-6 y E-CC-11 completadas**; E-CC-7 a E-CC-10 siguen pendientes. `DEC-CC-1`, `DEC-CC-5` y `DEC-CC-6` están confirmadas; `DEC-CC-2` y `DEC-CC-3` ordenan investigación antes de decidir una política final. Para Content Calendar, DEC-CC-4 se concreta como consistencia del día programado; la hora no tiene relevancia funcional.

**Capacidad auditada:** ruta `/content-calendar` y su vista `src/views/contentCalendar/ContentCalendar.vue`, los componentes importados desde `src/views/contentCalendar/components/`, sus servicios y dependencias reales. Se inspeccionaron en solo lectura los módulos backend Contents y sus relaciones de escritura relevantes.

**Exclusiones:** calendario de lanzamientos de discos (`/calendar`, `/calendar-baby` y `src/modules/catalog/calendar/`), así como su consulta, filtros y presentación. E-CC-1 solo añade tests y fixtures frontend; no modifica código funcional, endpoints, migraciones, permisos ni UI. No se hicieron comprobaciones visuales.

**Base:** checkout frontend al 2026-10-31. `roadmap.md` ya tenía un cambio local de Cloudflare y `roadmap/cloudflare-migration.md` era nuevo; se conservaron ambos. El checkout backend estaba limpio al inspeccionarlo. Esta actualización amplía la auditoría previa; no la reinicia ni modifica el estado completado de backend-cleanup.

## Resumen ejecutivo

Content Calendar es una pantalla editorial de planificación que combina eventos fechados y un backlog en una vista FullCalendar. Permite crear, consultar por mes y backlog, editar y borrar registros `Content`, moverlos entre backlog y fechas mediante drag-and-drop, filtrar visualmente por autor actual, y abrir operaciones específicas para Radar/Best, fotos, reuniones, artículos y vídeos.

La auditoría inicial observó la vista legacy en `src/views/contentCalendar/ContentCalendar.vue`, con 1.251 líneas de estado, transporte, FullCalendar y operaciones. E-CC-6 ya la trasladó a `src/modules/editorial/content-calendar/`, separó coordinación de calendario y operaciones editoriales, y retiró esa ubicación legacy. La ruta y el sidebar conservan `/content-calendar` y «Calendario RV».

En backend, Contents ya está organizado en controller, fachada de servicio y servicios de aplicación para consultas, creación y ciclo de vida. El backend tiene una auditoría propia completada, `riffvalley-app-back/roadmap/backend-cleanup/editorial/videos-contents.md` (BC-CNT-0 y BC-CNT-1–12). Sus decisiones/correcciones no se duplican aquí. No se identificó evidencia para reabrir esa reorganización.

## Funcionalidades y flujos observados

| Flujo | Comportamiento implementado | Estado observado |
|---|---|---|
| Entrada y permisos | `/content-calendar` requiere autenticación y rol mínimo `riffvalley` en Router; la navegación aplica el mismo rol. | Frontend conserva ese guard. En backend los tres GET de Contents aún son públicos; DEC-CC-1 confirma que deben exigir `riffvalley`. La modificación queda pendiente de implementación cross-repo. |
| Carga inicial | La vista dispara `GET /contents?backlog=true`, `GET /contents/by-month?year=&month=` y `GET /auth/usersRv`. | Implementado: dos consultas de Contents en TanStack Query y una carga de usuarios manual desde `onMounted`; se combinan Contents por ID. |
| Navegación de fechas | FullCalendar en vista mensual, locale español, lunes como primer día. `datesSet` actualiza año/mes y solicita el nuevo periodo. | E-CC-4 conserva la vista mensual y eventos `allDay: true`. FullCalendar y sus getters locales identifican el mes que el propio calendario presenta; los límites backend incluyen siete días a ambos lados. La hora no interviene en la identidad del día. |
| Creación | Modal acepta tipo, nombre, notas, autor y fechas; los tipos reunión, Radar y Best requieren fecha en UI. Se envía `POST /contents`; la API crea contenido asociado según el tipo. | Implementado. El backend vuelve a validar invariantes; el formulario frontend no expone todos los IDs de asociación disponibles en el DTO backend. |
| Edición | Modal genérico envía `PATCH /contents/:id`; acciones especializadas actualizan campos de Article/Video/List y fechas/autor de Content. | Parcialmente distribuido entre Content y entidades relacionadas; errores de Article/Video son gestionados en handlers distintos. |
| Programación y backlog | Drag desde backlog a calendario y entre fechas actualiza `publicationDate`/`backlog`; arrastrar al backlog elimina fecha. Radar con asignaciones no se puede mover; reunión/Radar/Best no pueden ir al backlog. | E-CC-4 conserva el `18:00Z` date-only del drag, que mantiene el día al extraer la fecha y es compatible con la API. Backlog conserva `publicationDate: null`; eventos programados son `allDay: true`. Tests frontend invocan callbacks FullCalendar simulados, no el motor real ni el backend. |
| Consulta y detalle | Click en evento abre modal por tipo; Radar/Best carga detalles de List. Los enlaces permiten navegar a Reuniones, Artículos, Vídeos y detalle de Radar/Best. | Implementado con consultas puntuales acopladas a la vista. |
| Eliminación | Confirmación y `DELETE /contents/:id`; el backend elimina también List/Reunion asociadas en los casos coordinados. Article/Video/Playlist asociados sobreviven a la eliminación de Content por diseño backend documentado. | Comportamiento actual confirmado por código, pero no política final: DEC-CC-3 exige estudiar ownership, cascadas, reutilización y huérfanos antes de aprobar cambios. |
| Publicación y estado editorial | Calendario muestra fecha y colores por tipo. Los estados Article/Video y estado de List se editan desde modales, mediante APIs de esos módulos. | No hay un estado unificado de publicación de Content. `ready` existe en el backend, pero esta vista no lo consulta ni lo presenta; estado de entidad asociada y `Content.ready` son conceptos separados. |
| Filtro «mis eventos» | Atenúa eventos/backlog ajenos y resalta los propios comparando `author.id` con Identity. | El comportamiento aprobado por DEC-CC-5 será ocultar los que no sean del usuario, tanto en calendario como backlog; autor nulo nunca cuenta como propio. Implementación pendiente. |

## Arquitectura y contratos existentes

### Frontend

- **Ruta y owner efectivo:** `src/router/index.ts` registra `ContentCalendar` y carga `src/modules/editorial/content-calendar/presentation/views/ContentCalendar.vue`. El sidebar conserva «Calendario RV» en `src/layouts/default/components/routes.json`.
- **Composición actual:** la vista modular compone FullCalendar, backlog, formularios y modales. `presentation/composables/useContentCalendarFullCalendar.ts` posee opciones, render de eventos, navegación mensual, selección, external drop, drag entre fechas y vuelta al backlog. `application/useContentCalendarOperations.ts` coordina consultas puntuales de detalle y operaciones editoriales. `application/contentCalendarQueries.ts` conserva las queries remotas de E-CC-5.
- **Estado:** `ref`/`computed` local para selección, modales, filtro, mes/año y detalles; `application/contentCalendarQueries.ts` mantiene en TanStack Query los datos remotos de mes y backlog. Identity se consume mediante las entradas públicas `@/modules/identity/auth` y `@/modules/identity/users`.
- **Transporte:** `src/services/contents/contents.ts` conserva interfaces y Axios para CRUD y consultas; `useContentCalendarOperations` coordina sus operaciones junto con las APIs existentes de asignaciones, Lists, Articles y Videos. La vista y los modales no invocan transporte directo.
- **Dependencias de otros dominios realmente usadas:** Identity (sesión/rol/usuarios), Editorial Contents (registros y fechas), Lists (Radar/Best y asignaciones), Articles, Videos, Reunions y helper transversal `dateConstants` en el formulario de creación. No se observa dependencia de la API del calendario de lanzamientos.
- **Contratos:** E-CC-2 alineó los tipos frontend de Contents y los DTOs con sus nulls, relaciones y payloads existentes; la API sigue siendo el owner del transporte. `types/contentCalendar.types.ts` contiene tipos de formulario/edición del calendario sin duplicar el contrato Content.
- **Queries:** `contentCalendarQueries.ts` mantiene claves aisladas por usuario, generación y rol; ventana mensual y backlog independientes; deduplicación derivada por ID; `AbortSignal`; caché de 30 segundos; estados de carga/error/reintento e invalidación desde la coordinación de operaciones. Estas son las únicas consultas TanStack Query de la vista; usuarios y detalle de List usan llamadas manuales.

### Backend Contents

La implementación está en el otro repositorio, bajo `src/editorial/contents/`: `ContentsController`, `ContentsService` como fachada, `application/content-query.service.ts`, `content-creation.service.ts`, `content-lifecycle.service.ts`, DTOs, entidad y `ContentSchedulerService`. `ContentsModule` conecta TypeORM, Lists, Disc y Authorization. El scheduler semanal crea Content/Reunion los lunes con cron en `Europe/Madrid`.

La entidad `Content` incluye `type` (`article`, `photos`, `riff_valley_playlist`, `radar`, `best`, `video`, `reunion`), `name`, `notes`, fechas `publicationDate`/`closeDate`/`listDate`, autor nullable, relaciones a Reunion, List, playlist, Article y Video, y booleanos `ready`/`backlog`. Las fechas son columnas `timestamp` sin zona horaria declarada. List y tipos editoriales asociados tienen sus propias entidades/estados; borrar Content conserva Article/Video/Playlist, mientras que puede borrar List/Reunion según su asociación.

| Método | Endpoint | Acceso | Contrato observado |
|---|---|---|---|
| POST | `/api/contents` | mínimo `riffvalley` | Crea Content y, según tipo, entidades asociadas; se conserva la transacción local existente. |
| GET | `/api/contents` | público | Acepta `ready` y `backlog` literales `true`/`false`; orden de publicación descendente; incluye relaciones asociadas. |
| GET | `/api/contents/:id` | público | Devuelve Content con relaciones; ID no tiene `ParseUUIDPipe`. |
| GET | `/api/contents/by-month?year=&month=` | público | DTO valida enteros/rango mensual; ventana actual incluye siete días antes y después; orden descendente. |
| PATCH | `/api/contents/:id` | mínimo `riffvalley` | Actualiza campos admitidos; fecha obligatoria para Radar/Best/Reunion; sincroniza fechas/title con List/Reunion en los casos existentes. |
| DELETE | `/api/contents/:id` | mínimo `riffvalley` | Borra Content y las entidades asociadas según las reglas documentadas; Article/Video/Playlist no se eliminan. |

La auditoría backend original registró como decisión de entonces que GET fuera público; DEC-CC-1 del 2026-10-31 reemplaza esa política para los tres GET de Contents. No se modifican ni reabren BC-CNT-0–12; una nueva tarea de autorización se planifica abajo por decisión de producto y evidencia de consumidores.

### DEC-CC-1 — Consumidores y exposición de lecturas

| Superficie | Consumidores encontrados en los repositorios revisados | Consecuencia de restringir GET Contents |
|---|---|---|
| `GET /contents` | `getContents()` se llama desde Content Calendar para cargar backlog. `getContentById()` está exportado, pero no se encontró caller productivo. `ListReunion.vue` solo usa el POST de creación. | No se encontró una pantalla pública frontend que necesite el GET general. |
| `GET /contents/by-month` | `getContentsByMonth()` se llama únicamente desde Content Calendar. | El caller tiene token de sesión vía cliente HTTP y la ruta ya exige mínimo `riffvalley`; añadir guard backend alinea autorización. |
| `GET /contents/:id` | No se encontró caller de runtime en el frontend. El archivo `.http` backend es una herramienta de desarrollo; no es cliente de producción. | No se identificó dependencia interna de la ruta pública. |
| Servicios internos backend | Articles/Videos/Playlists consultan `ContentsService.findOneBy…` para impedir eliminar una entidad asociada; Reunions y Lists coordinan escrituras/entidad directamente. No llaman los endpoints HTTP GET. | Los métodos internos no dependen del guard del controller. |
| Respuestas públicas relacionadas | GET de Articles, Videos y Riff Valley Playlists son públicos y actualmente cargan/serializan `content`. No se halló en los repositorios frontend/wiki/plugin una llamada pública de producción a `/contents`; esos GET editoriales podrían, sin embargo, exponer Content embebido. | Guardar solo los tres endpoints no elimina la exposición transitiva de `Content` en esos recursos. Se requiere decidir y probar una proyección pública segura sin interrumpir clientes reales. |

**Evidencia y límite:** búsqueda de usos HTTP y servicios en los repositorios `riffvalley-app-front`, `riffvalley-app-back`, `riff-valley-wiki` y `riffvalley-editorial-blocks`; no se encontraron consumidores públicos directos. No se consultaron logs, API gateways, apps de terceros ni clientes desplegados, así que su ausencia no puede inferirse del código local.

**Alternativa si se confirma consumo público legítimo:** no conservar las rutas generales públicas. Ofrecer, si producto la necesita, una consulta pública separada con proyección allowlist y datos ya publicables; no incluir `notes`, `backlog`, autor/editor, relaciones de asignaciones, IDs internos o estado de preparación. Los GET públicos de Article/Video/Playlist deben separar su proyección pública de la relación completa usada por Editorial; los consumidores administrativos autenticados pueden usar una respuesta protegida. La forma concreta requiere inventariar clientes y sus campos antes de cambiar contratos.

**Roles:** `@Auth(ValidRoles.riffvalley)` usa la jerarquía backend existente `user < collaborator < riffvalley < superadmin`, por lo que admite `riffvalley` y `superadmin` y rechaza niveles inferiores; no se debe reimplementar ni alterar esa jerarquía. El guard frontend ya exige `riffvalley` para la ruta.

### DEC-CC-2 — Investigación de `Content.ready`

- **Definición/persistencia:** columna `content.ready`, boolean no-null default false en `Content`; creada por migración `1767807955655-AddReadyToContent.ts`. No se consultó la base de datos, por lo que no se conocen valores históricos reales.
- **Escrituras:** el DTO acepta `ready` tanto en POST como en PATCH. Creation respeta el valor entrante solo si no hay fecha resuelta y fuerza `false` cuando hay fecha; lifecycle aplica campos restantes y vuelve a `false` cuando se establece `publicationDate`. No se encontró cron ni transición interna que lo establezca en `true`.
- **Lecturas/filtros:** `GET /contents?ready=true|false` filtra en `ContentQueryService.findAll`; Content Calendar no envía este filtro ni representa ese campo. `ContentRef.ready` también está declarado opcionalmente en el contrato frontend, y Contents embebido se incluye en GET públicos de Articles/Videos/Playlists. Por lo tanto el dato puede aparecer en respuestas indirectas aunque el frontend no lo use.
- **Comparación:** Article, Video y RiffValleyPlaylist tienen estados enum independientes; List también tiene `status`. Existe un `ready` distinto por entidad. No se encontró sincronización que convierta un estado de esas entidades en `Content.ready`.
- **Conclusión provisional:** la utilidad funcional independiente no está demostrada y el estado parece subutilizado/ambiguo en los consumidores locales; no se puede afirmar que sea redundante sin revisar clientes externos y los valores existentes. Recomendación para E-CC-9a: investigar primero y, si no aparece consumidor/semántica independiente, recomendar deprecarlo progresivamente; no aprobar ni ejecutar su eliminación.

**Secuencia condicional si después se aprueba deprecar/eliminar:** inventariar usos externos y exportaciones anidadas → dejar de aceptar escrituras y de ofrecer filtro con compatibilidad/deprecación acordada → actualizar frontend, DTOs, ContentRef y tests → observar uso y decidir cómo preservar/archivar valores históricos → migración backend que retire columna solo cuando el campo ya no sea leído ni escrito → eliminar el filtro, fixtures y código residual. La migración y toda escritura quedan fuera de este roadmap hasta decisión posterior.

### DEC-CC-3 — Matriz inicial de eliminación

La tabla describe el comportamiento actual según entidades, ciclo de vida y APIs. «Entrada de calendario» es el registro `Content`; no equivale a borrar automáticamente la pieza editorial. `Content` puede asociarse a entidades existentes por IDs o crear algunas desde cero. El backend permite reutilizar Article, Video, Playlist y Reunion en sus flujos documentados; Radar/Best crea List WEEK/MONTH transaccionalmente. `photos` no tiene entidad compañera.

| Tipo | Asociación/creación actual | `DELETE /contents/:id` actual | Riesgo/efecto observado |
|---|---|---|---|
| article | Auto-crea Article `editing` o enlaza `articleId`. | Borra solo Content; Article permanece. Article asociado no se puede borrar hasta quitar la relación. | La planificación desaparece; el Article queda disponible para enlazar a otro Content. No es huérfano relacional, aunque puede quedar como pieza editorial sin agenda. |
| photos | Solo Content. | Borra Content. | No hay entidad editorial compañera ni contenido remoto que borrar. |
| riff_valley_playlist | Auto-crea playlist `editing` o enlaza `riffValleyPlaylistId`. | Borra Content; playlist permanece. El endpoint de playlist impide borrarla si conserva Content asociado. | Planificación removida, playlist real conservada. |
| radar | Creation crea List WEEK y asignaciones asociadas. | Borra Content y List dentro de una transacción; List lleva asignaciones con cascade ORM. | Puede perder listas/asignaciones y tracking local de WordPress. El borrado no llama a WordPress; no hay evidencia de que borre posts externos. |
| best | Creation crea List MONTH y asignaciones asociadas. | Igual que Radar: borra Content y List con su estado/asignaciones/tracking local. | Mismos riesgos; borrar planificación puede retirar la entidad de lista ya publicada. |
| video | Auto-crea Video `editing` o enlaza `videoId`; el flujo Videos también permite crear Content para un Video existente. | Borra Content; Video permanece y puede conservar su List propia. El endpoint Videos bloquea borrar Video mientras haya Content enlazado. | Pieza real se mantiene separada del calendario; al borrar Content se permite después borrar Video. |
| reunion | Crea Reunion y dos Points por defecto o reutiliza `reunionId`. | Borra Content y Reunion; los Points se eliminan por FK `ON DELETE CASCADE`. | `Content.reunionId` es ManyToOne (varios Content pueden apuntar a una Reunion) y FK es `NO ACTION`: al borrar un Content asociado, el servicio intenta borrar Reunion; si otro Content la referencia, la FK impide el borrado y revierte la transacción. Es una ruta de inconsistencia demostrada por el modelo/flujo, aunque no se inspeccionaron datos que confirmen que haya filas compartidas. |

La eliminación de List desde Lists también busca un Content asociado y lo elimina antes de List; el flujo es coordinado en ambos sentidos. Article/Video/Playlist protegen su borrado cuando existe Content asociado, y dichos módulos permiten crear la relación de Content de forma manual. Se documenta así una diferencia real de ownership/ciclo de vida que no debe cambiarse sin revisar contratos y consumers.

Para la política futura se deben distinguir tres comandos/intenciones: **desprogramar** (quitar fecha y pasar a backlog cuando las reglas del tipo lo permitan), **eliminar entrada de calendario** (retirar solo el vínculo/planificación) y **eliminar la entidad editorial** (borrar Article/Video/Playlist/List/Reunion y sus relaciones). Hoy `DELETE /contents/:id` no es solo “quitar de calendario” en Radar/Best/Reunion; para Article/Video/Playlist retira la relación y conserva la entidad. Para tipos con fecha obligatoria, desprogramar con fecha nula es rechazado; la UI ya prohíbe mover Reunion/Radar/Best al backlog. La política final sigue pendiente de E-CC-8.

### Modelo de fechas

La UI interpreta eventos como fechas de día completo: toma `publicationDate.split('T')[0]`; convierte `closeDate` a fin exclusivo añadiendo un día en UTC; al mover una fecha crea `T18:00:00.000Z`; al guardar campos `datetime-local` llama `new Date(value).toISOString()`. Estas decisiones evitan algunos desplazamientos, pero mezclan fecha civil y instante UTC, y la creación depende de la zona del navegador. La consulta mensual usa hora local tanto para construir el mes en backend como para derivar el mes de FullCalendar. Europe/Madrid está configurada en el cron backend, pero no se encontró una zona explícita común para fechas editoriales/agenda.

Las reglas no son iguales por tipo: backend exige fecha para Reunion, Radar y Best; Article, Photos, Playlist y Video pueden estar sin fecha/en backlog. Si al enlazar Article/Video/Playlist existente ya publicado y no se entrega fecha, backend deriva `publicationDate` de `updateDate`. Radar/Best también comparten fechas con List; Reunion sincroniza título y fecha de reunión. `closeDate` y `listDate` son opcionales, y los campos de fecha de Content/List son `timestamp` sin zona.

DEC-CC-4 confirma que la persona usuaria programa por **hora civil de Europe/Madrid**, mientras el API debe transportar instantes inequívocos. La hora se conserva en datos y formularios, pero FullCalendar representa intencionadamente cada contenido como evento de día completo (`allDay: true`) y lo muestra en el día de publicación de Madrid, sin franjas horarias. E-CC-4 debe preservar la vista mensual y esta representación; la normalización temporal no autoriza una vista horaria ni eventos temporizados. El valor local `datetime-local` se interpretará en `Europe/Madrid` y la API intercambiará instantes RFC 3339 con offset/UTC normalizado; el backlog permanece sin instante. Rechazar horas locales inexistentes en el salto de primavera. En la repetición otoñal una hora local corresponde a dos instantes; debe pedirse escoger una ocurrencia/offset o acordarse un default antes de implementación. Queda pendiente aprobar la regla del drag-and-drop: al mover una publicación fechada, preservar su hora Madrid o sustituirla según una regla explícita; al programar desde backlog, definir la hora inicial. No inferir ninguna de forma silenciosa.

**Almacenamiento:** `Content` y `List` declaran `timestamp` (sin TZ), con `synchronize: false`; la migración `1767750000000-ChangeDatesToTimestamp.ts` convirtió las columnas desde `date` a `timestamp` sin zona. El origen histórico date-only pudo transformarse en medianoche; no se inspeccionaron filas ni ledgers de entornos y no se puede afirmar su valor actual. PostgreSQL `timestamp` puede mantenerse solo si pruebas de contrato y configuración demuestran una normalización UTC consistente de ida/vuelta con TypeORM en todos los entornos. Si depende de TZ de proceso/driver o no conserva el instante de forma demostrable, evaluar una migración a `timestamptz` con lectura/backfill aprobados; no cambiar columnas por preferencia.

**FullCalendar:** el proyecto está en `@fullcalendar/* 6.1.19`, usa DayGrid e Interaction y fija cada Content a `allDay: true`; no declara `timeZone`, timeGrid ni handler `eventResize`. Esa representación de día completo y la vista mensual se deben conservar. Hoy `eventDrop` persiste `T18:00Z` y la caída desde backlog solo entrega día; todavía no está acordado si el movimiento debe conservar o cambiar la hora almacenada. E-CC-4 debe probar cómo derivar el día `Europe/Madrid` sin cambiar la presentación y escoger la integración FullCalendar v6 mínima que lo soporte; configurar la zona nombrada sin plugin puede aplicar UTC-coercion e ignorar offsets ([guía oficial de timeZone v6](https://legacy.fullcalendar.io/v6/timeZone)). No se propone timeGrid ni convertir eventos a temporizados. Solo se añadirá gestión de resize si una regla aprobada de fechas/cierre la requiere, conservando eventos all-day y usando `revert()` ante error ([eventResize](https://fullcalendar.io/docs/eventResize)). No se instaló ni actualizó ninguna dependencia.

## Hallazgos demostrados y mejoras propuestas

Los hallazgos enumerados aquí son observables en código. Las decisiones de producto y cambios recomendados se identifican como propuestas, no como defectos confirmados.

### Hallazgos demostrados

1. **Responsabilidad concentrada en la vista.** `ContentCalendar.vue` tiene 1.251 líneas y gestiona transporte, queries, merge, formularios/drafts, transformaciones de calendario, drag/drop y coordinación de tres tipos de entidades editoriales además de Content. Las responsabilidades se pueden seguir con dificultad en un solo coordinador.
2. **No existe ownership modular de la capacidad.** La ruta conecta directamente una vista legacy y el acceso a Contents vive en `src/services/`; no hay API/tipos/estado/application propios de Content Calendar ni entrada pública del dominio.
3. **Tipos frontend no reflejan el uso/contrato backend.** Falta `video` en `Content`, DTOs incompletos y uso de `any` en la vista y componentes, incluido payload de eventos. `VideoActionsModal.vue` consulta `(content as any).video` y define emits con `data: any`.
4. **Errores y solicitudes remotas poco observables.** Las funciones de carga no exponen estado de loading/error/retry; los errores se capturan y escriben a consola. Cambios rápidos de mes pueden dejar respuestas fuera de orden porque no se propaga cancelación ni se comprueba cuál periodo sigue vigente.
5. **Cobertura de baseline sin integración real.** E-CC-1 añadió 39 tests focalizados (15 del servicio y 24 de la vista) para contratos Axios, operaciones y reglas actuales. Las pruebas simulan FullCalendar y no ejercitan red/servidor/PostgreSQL; tampoco cubren carreras de consultas ni el motor real de drag. Estas limitaciones no invalidan la baseline frontend y quedan para las tareas que necesiten integración.
6. **Estados de distinta entidad conviven en la pantalla.** `Content.ready` no se consulta aquí; Article/Video/List mantienen estados propios y las mutaciones de Article/Video se lanzan como operaciones independientes del PATCH de Content.
7. **Diferencias de borrado por tipo.** Backend borra List/Reunion asociadas desde el ciclo de vida de Content, pero deja Article/Video/Playlist asociados. Es un hecho de código/backend ya documentado; si la interfaz no diferencia este efecto es una cuestión funcional a confirmar, no un defecto de integridad afirmado.
8. **Fechas mezclan fecha civil e instante.** El frontend usa fecha local, UTC y timestamp con estrategias distintas; el backend no fija Europe/Madrid para consultas/fechas. E-CC-1 reprodujo la dependencia de TZ local en `datetime-local` y navegación, pero no hay pruebas de contrato temporal frontend-backend ni almacenamiento. La visualización `allDay: true` es intencionada, no parte de este hallazgo como defecto.

Referencias principales para contrastar los hallazgos: `ContentCalendar.vue` (`calendarEvents`, `calendarOptions`, `toCalendarDate`, `handleCreateContent`, `handleUpdateContent`, `executeDeleteContent`, `handleUpdateArticle`, `handleUpdateVideo`, `loadContentsByMonth`, `loadBacklogContents`); `services/contents/contents.ts` (`Content`, `CreateContentDto`, `UpdateContentDto`, `getContentsByMonth`); `VideoActionsModal.vue` (lectura `content.video` y emits); `router/index.ts` (ruta y rol); backend `editorial/contents/contents.controller.ts` (métodos/guards) y `editorial/contents/entities/content.entity.ts` (columnas y relaciones). Las líneas exactas pueden variar con cambios posteriores.

### Mejoras propuestas, sujetas a criterio

- Aislar la coordinación de agenda de los flujos de publicación de Articles, Videos, Lists y Reunions, consumiendo sus APIs existentes y preservando contratos.
- Adoptar TanStack Query para las consultas remotas por mes/backlog y sus mutaciones cuando la separación permita estados de carga/error, cancelación, claves de query e invalidaciones comprobables. Mantener filtros, modales y drafts locales; no duplicar resultados en Pinia.
- Tipar exactamente `Content`, DTOs y eventos según las respuestas/payloads existentes. Esta tarea debe ser compatible y no ampliar endpoints.
- Definir con producto la semántica de `ready`, estado editorial, eliminación de Content y fechas, antes de crear un estado unificado o modificar efectos.
- Ampliar la baseline solo donde E-CC-4 necesite probar un contrato temporal real o donde E-CC-5/6/7 añadan comportamiento que las pruebas actuales no cubren.

## Arquitectura objetivo propuesta

### Límites

- **Content Calendar** posee la experiencia de agenda: selección de periodo, filtros locales, representación de eventos, backlog visual y acciones de planificación de Content.
- **Contents** continúa siendo el owner backend de registro, fechas editoriales compartidas, backlog, validaciones y relaciones de Content.
- **Articles, Videos, Lists, Reunions y Playlists** conservan propiedad de su entidad, estado de publicación, operaciones de dominio y contratos. El calendario usa sus APIs para acciones específicas; no replica sus reglas.
- **Identity** provee usuario/rol a través de su API pública. La autorización real sigue en backend. Catalog/discos y su calendario no forman parte de estas dependencias.

### Frontend

Una adopción gradual bajo `src/modules/editorial/content-calendar/` es razonable después de caracterizar contratos: `api/` para el transporte Contents; `types/` para DTO/respuesta observados; `application/` para claves/query y coordinación de periodo/merge si su complejidad persiste; `presentation/views/` para una vista de composición y `presentation/components/` para la UI existente por tipo. Un `index.ts` solo se añade si hay consumidores externos reales. La ruta y sidebar permanecen composition roots y conservan paths/roles.

TanStack Query posee resultados remotos, loading/error, cancellation e invalidation; estado de modales, filtros de visualización y formularios permanece local. Pinia no se justifica para este estado. APIs de Articles/Videos/Lists siguen bajo sus owners; la UI editorial no importa internals de vecinos.

### Backend

Mantener el límite existente `editorial/contents` y la fachada pública `ContentsService`; el código actual ya separa query, creation y lifecycle, con DTOs y entidad propios. No crear otro servicio ni capa por anticipado. Content Calendar es una capacidad frontend; no hace falta un módulo backend espejo. Cualquier cambio futuro backend se planifica solo ante evidencia nueva y conserva los contratos actuales por defecto. El scheduler semanal pertenece a Contents; el mantenimiento de enlaces de Disc está ya bajo Catalog por BC-CNT-8.

### Modelo y API

Conservar primero el modelo `Content` y los endpoints actuales. Los contratos frontend deben describir relaciones nullable/opcionales, campos de fecha y `ready/backlog` como existen realmente. No se propone cambiar esquema ni respuesta. Una eventual semántica de fecha civil en `Europe/Madrid` requiere decisión explícita; no convertir `timestamp` a `date` ni cambiar la serialización en esta fase de planificación.

### Tests

Caracterizar primero APIs y respuestas con fixtures; añadir tests unitarios de funciones puras (merge, filtros y conversión de fechas), tests de composables/query con cliente aislado y `AbortSignal`, tests de componentes para eventos/emits accesibles, tests de interacción para crear/editar/eliminar y reglas de backlog, y mantener pruebas backend ya existentes como contrato. La combinación de llamadas Content + Article/Video debe probar errores parciales si se decide modificarla. No se considera necesaria una prueba E2E hasta contar con infraestructura autorizada y fixtures aislados.

## Decisiones de producto

Las decisiones se incorporaron el **31 de octubre de 2026**. Esta tabla distingue políticas aprobadas de investigaciones, implementación y aprobaciones posteriores.

| ID | Decisión/tema | Estado | Registro |
|---|---|---|---|
| DEC-CC-1 | Los tres GET de Contents requieren mínimo `riffvalley`. | **Confirmada; implementación pendiente.** | E-CC-3, autorización backend cross-repo y revisión de respuestas públicas transitivas. |
| DEC-CC-2 | Evaluar utilidad, consumidores y eventual retirada de `Content.ready`. | **Investigación pendiente; política final abierta.** No está aprobada su eliminación. | E-CC-9a; retirada condicional solo tras aprobación posterior. |
| DEC-CC-3 | Revisar reglas de eliminación antes de mantenerlas o cambiarlas. | **Investigación pendiente; política final abierta.** | Matriz inicial arriba; E-CC-8a/8b y eventual E-CC-8c. |
| DEC-CC-4 | Cada Content programado pertenece a un día civil de referencia (`Europe/Madrid`) y se representa como evento de día completo. La hora no tiene relevancia funcional. | **Confirmada e implementada en frontend.** Vista mensual y `allDay: true` se conservan. | E-CC-4 verifica estabilidad del día en creación, edición, drag/drop, backlog y navegación, sin introducir política horaria ni cambiar el contrato HTTP. |
| DEC-CC-5 | «Mis eventos» oculta los ajenos en calendario y backlog; autor nulo nunca cuenta como propio. | **Confirmada; implementación pendiente.** | E-CC-9b; filtrado frontend derivado, sin mutar registros. |
| DEC-CC-6 | Si una operación compuesta falla, dejar modal abierto, conservar datos y reintentar solo operaciones fallidas. | **Confirmada; implementación pendiente.** | E-CC-7, sin transacción distribuida. |

### Decisiones técnicas todavía necesarias

- Ningún consumidor público directo de GET Contents apareció en repositorios locales. Confirmar clientes desplegados por logs/configuración; separar una proyección pública allowlist si se acredita consumo legítimo. Los GET públicos de Articles/Videos/Playlists embeben `Content` y requieren revisión de sus campos.
- Resolver política final de `ready` tras revisar clientes externos y valores históricos con acceso controlado; la auditoría no leyó filas PostgreSQL.
- Resolver por tipo si desprogramar, eliminar entrada y borrar entidad editorial son comandos distintos; revisar relaciones compartidas y tracking de WordPress.
- La columna backend sigue siendo `timestamp` y las consultas mensuales construyen límites con `Date` local del proceso. La inspección estática no demuestra un desplazamiento residual en el día servido por el backend; cualquier incidencia reproducible allí requiere una tarea backend separada. No se propone migración.

**Estado de implementación:** E-CC-4 aplica la prioridad de consistencia del día de DEC-CC-4 y E-CC-5 migra las consultas principales de agenda a TanStack Query. DEC-CC-1, `ready`, política de eliminación, filtros y el resto de UI mantienen su estado previo.

## Roadmap propuesto

Se mantienen E-CC-1–10. Las subtareas separan investigación, decisión e implementación. El orden define primero contratos/acceso, después fechas y ownership, y finalmente Query e interacciones para minimizar migraciones repetidas.

### Fase 1 — Baseline y contratos

#### E-CC-1 — Caracterizar los contratos y flujos vigentes

- **Objetivo:** fijar el baseline observable de frontend/backend antes de mover responsabilidades o permisos.
- **Problema que resuelve:** no hay cobertura frontend localizada de CRUD/agenda; el cambio de permiso puede afectar consumidores fuera de la vista.
- **Alcance técnico:** caracterizar métodos, URLs, parámetros, payloads, omitido/null, relaciones y respuestas de los tres GET y mutaciones; flujos de carga/merge, fechas actuales, drag/backlog, borrado y operaciones Content + Article/Video. Inventariar fixtures/callers; no cambiar runtime.
- **Dependencias:** —.
- **Prioridad:** P0.
- **Criterios de aceptación:** los tests describen endpoints/payloads actuales y Content anidado; consumidores de repo quedan clasificados por ruta; reglas observadas quedan fijadas sin cambiar API ni rol.
- **Tests necesarios:** tests frontend de service y flujos puros/de UI; tests backend de contrato/autorización aplicables; typecheck frontend y quality gates backend si se añade TS.
- **Estado:** **Completada.** Añade `src/services/contents/contents.test.ts` (15 tests), `src/views/contentCalendar/contentFixtures.ts` (siete tipos con programados/backlog, autor asignado/nulo, relaciones y null/omisión) y `src/views/contentCalendar/ContentCalendar.characterization.test.ts` (24 tests). Los fixtures reproducen datos anidados y nullables del backend; el cast de compatibilidad está localizado en el archivo de fixtures y sus diferencias se enumeran abajo para E-CC-2.
- **Contratos caracterizados:** GET `/contents` con/sin `backlog`, GET por ID, GET `/by-month` con año/mes numéricos, POST, PATCH conservando fechas explícitamente nulas y campos omitidos, DELETE sin body/retorno, respuestas de `data` y propagación de errores.
- **Flujos protegidos:** carga y combinación mensual/backlog por ID, navegación de mes, creación/edición y validación de fechas obligatorias, handlers Article/Video, detalle para los siete tipos, confirmación/cancelación de borrado, filtro legacy que atenúa ajenos (incluido autor nulo), programación desde backlog, movimiento de fecha, retorno a backlog, limitación de reunión/Radar/Best y bloqueo de Radar con asignaciones.
- **Límites:** callbacks FullCalendar se invocan mediante un componente simulado y no se valida el motor de drag real. Confirmación/edición se caracterizan por los eventos públicos de los modales simulados; se renderiza el BacklogPanel real para comprobar el estilo del filtro. Las pruebas de service inspeccionan la configuración Axios (`params`), no una petición de red serializada. No se modifica ni ejecuta backend; por tanto, el contrato servidor, auth y efectos de DELETE siguen basados en la auditoría estática y no en integración HTTP/DB.
- **Hallazgos para E-CC-2:** `Content.author` y `publicationDate` están tipados como no-null, aunque fixtures/backend admiten null/ausencia; la interfaz no declara `video`, y tampoco todo el contrato anidado/relacional. `notes` puede faltar o ser null. El test de fixtures contiene el único `as unknown as Content` para aislar la diferencia, sin introducir `any`.
- **Hallazgos para E-CC-4:** `datetime-local` se convierte con `new Date(valor).toISOString()`, así que interpreta hora del huso local del navegador/runtime. En pruebas con UTC y Europe/Madrid, ambos recorridos pasan al comparar la salida real de Date; en Europe/Madrid, `2026-03-29T02:30` se normaliza durante el hueco DST en vez de rechazarse. Eventos eliminan la hora al tomar la parte de fecha, se renderizan `allDay: true`, `closeDate` se vuelve fin exclusivo mediante aritmética UTC a mediodía y el drag date-only se serializa como `T18:00:00.000Z`. `datesSet` usa getters locales de Date: `2026-10-31T23:00Z` puede ser octubre en UTC y noviembre en Europe/Madrid. Estos comportamientos se conservan para definir E-CC-4; no se aplica la semántica futura.
- **Hallazgos para tareas posteriores:** E-CC-5/9 debe reemplazar opacidad por ocultación únicamente al implementar la decisión; E-CC-7 aún debe coordinar fallos parciales. Los tests de frontend no demuestran autorización backend ni las cascadas reales de E-CC-8.
- **Verificación de E-CC-1:** Vitest focalizado: 39 tests pasan bajo `TZ=UTC` y `TZ=Europe/Madrid`; `pnpm run typecheck`, ESLint focalizado, Prettier `--check` y `git diff --check` pasan. No se ejecutó build porque solo se añadieron tests/fixtures y documentación, sin cambiar código funcional ni configuración.

#### E-CC-2 — Alinear tipos frontend con el contrato existente

- **Objetivo:** modelar con tipos la respuesta actual sin cambiar HTTP.
- **Problema que resuelve:** `Content` omite relaciones/campos usados y los DTOs difieren del backend; `any` oculta qué operación cambia Content o una entidad asociada.
- **Alcance técnico:** tipar relaciones Article/Video/List/Reunion/Playlist, opcionalidad de fecha/backlog y payloads. `ready` se conserva modelado mientras el contrato lo acepte. No agregar endpoints ni ampliar DTOs del servidor.
- **Dependencias:** E-CC-1.
- **Prioridad:** P1.
- **Criterios de aceptación:** respuestas directas/anidadas compilan contra fixtures; tipos expresan null/ausencia tal como se serializan; cambiar tipos no manda campos nuevos por HTTP.
- **Tests necesarios:** fixtures contractuales y tests de componentes afectados; typecheck.
- **Diferencias corregidas (2026-10-31):** `Content.publicationDate`, `closeDate` y `listDate` ahora reflejan nulabilidad/omisión del entity; `author` admite `null` y ausencia; `ready` y `backlog` son booleanos de respuesta. `notes`, `reunionId` y `riffValleyPlaylistId` conservan null/omisión cuando corresponden. Las relaciones `article`, `video`, `list`, `reunion` y `riffValleyPlaylist` admiten tanto relación cargada vacía (`null`) como relación no cargada (omitida). `reunion` no forma parte de los `findAll`/`findOne`/`findByMonth` actuales; `reunionId` sí puede aparecer.
- **DTOs:** creación incorpora `articleId`, `videoId`, `reunionId`, `listDate`, `ready` y `backlog`, además de `riffValleyPlaylistId`; la fecha de publicación es requerida por tipo para `radar`, `best` y `reunion` y opcional para los tipos restantes. Actualización permite fechas `null` para limpiar las fechas, `reunionId: null` para desvincular, `notes: null`, y mantiene `ready`/`backlog` como booleanos no nulos. No se cambió la serialización HTTP ni la lógica de los servicios.
- **Relaciones tipadas:** Article, Video, Riff Valley Playlist, Reunion e Identity reutilizan sus contratos públicos mediante proyecciones mínimas de los campos usados. La proyección de List recoge los valores del enum backend; asignaciones reflejan `done`/`position` nullables. La respuesta de detalle de List, actualmente `any` en el servicio legacy, se valida antes de entrar al estado del calendario.
- **Casts y consumidores:** se eliminó el cast provisional `as unknown as Content` de fixtures, los casts de `video`/`authorId` y los emits `any` de los modales del calendario, los callbacks `any` de FullCalendar y accesos abiertos a asignaciones. Se usan los tipos oficiales de FullCalendar 6.1.19. El typecheck completo confirma que los consumidores de Contents fuera de Content Calendar siguen compilando; ninguno necesitó cambios.
- **Tests y verificación:** los fixtures contractuales compilan directamente como `Content` y cubren autor/fecha nulos, relaciones presentes, nulas y omitidas. Contents conserva el payload exacto en HTTP y cubre los campos DTO adicionales, incluidas pruebas estáticas de fechas obligatorias por tipo. Contents + Content Calendar + VideoActionsModal: **47 tests pasan** con `TZ=UTC` y `TZ=Europe/Madrid`; el baseline de 39 pruebas de E-CC-1 se conserva y se amplía. Typecheck, build y `git diff --check` pasan. ESLint focalizado informa 112 hallazgos de accesibilidad, uno de mutación de prop en plantillas legacy y un `no-empty-object-type` ya presente en `ContentsByMonthResponse`; esos hallazgos están en líneas no cambiadas. Los nuevos tipos, fixtures y pruebas no tienen hallazgos. Prettier focalizado sigue fallando en 11 archivos preexistentes; el mismo resultado se comprobó en sus versiones de `HEAD`, mientras que los nuevos tipos, fixtures y tests de Contents pasan. La build termina correctamente con avisos preexistentes de CSS, Browserslist y tamaño de chunks. La implementación no cambia el comportamiento temporal ni la vista mensual `allDay: true`.
- **Limitaciones:** los contratos DTO reflejan la validación y reglas de aplicación observadas en el backend, que permanece sin cambios. Relaciones fuera de los campos consumidos por esta vista siguen siendo proyecciones mínimas; `reunion` no se carga en las consultas actuales. Los `any` preexistentes de otros servicios legacy, fuera de Content Calendar y Contents, no se abordaron.
- **Estado:** **Completada**. No se inicia E-CC-3 ni la modularización de E-CC-6.

### Fase 2 — Permisos y semántica funcional

#### E-CC-3 — Restringir y proteger lecturas de Contents

- **Objetivo:** aplicar DEC-CC-1 sin romper la jerarquía ni dejar exposiciones equivalentes.
- **Problema que resuelve:** los tres GET de Contents son públicos; Articles/Videos/Playlists también incluyen Content en GET públicos.
- **Alcance técnico:** cross-repo. **3a**, confirmar consumidores desplegados con logs/configuración antes del rollout (búsqueda local no encontró clientes públicos directos). Si hay consumidor legítimo, definir allowlist pública sin notas, backlog, asignaciones, responsables ni estados internos. **3b**, proteger los tres GET con mínimo `riffvalley`; conservar el guard frontend y mutaciones actuales. **3c**, separar proyección pública de la relación Content en GET de Articles/Videos/Playlists, preservando solo campos públicos confirmados. No modificar permisos de otras APIs fuera de esa serialización.
- **Dependencias:** E-CC-1; E-CC-3a antes de desplegar 3b/3c.
- **Prioridad:** P0.
- **Criterios de aceptación:** anónimo/user/collaborator rechazados; `riffvalley` y `superadmin` permitidos por jerarquía existente; Content Calendar sigue leyendo con sesión; GET públicos no serializan campos internos de agenda; ningún consumidor público confirmado se rompe.
- **Tests necesarios:** matriz backend de los tres endpoints para cada rol, cliente frontend autenticado, y tests de shape pública de Article/Video/Playlist sin Content interno; conservar test del guard de ruta.
- **Dependencia cross-repo:** `riffvalley-app-front` + `riffvalley-app-back`; 3c toca Articles, Videos y Riff Valley Playlists por nueva evidencia, sin reabrir sus roadmaps backend de cleanup.

#### E-CC-4 — Consistencia del día programado

- **Objetivo:** garantizar que cada contenido programado aparece y permanece en el día seleccionado, con FullCalendar mensual y `allDay: true`. La hora no tiene relevancia funcional; `Europe/Madrid` es la referencia editorial, no una regla de conversión horaria que deba añadir complejidad.
- **Problema demostrado:** creación y edición convertían `datetime-local` con `new Date(value).toISOString()`. En Europe/Madrid una selección como `2026-10-31T00:30` se enviaba como el día UTC anterior, y el calendario interpreta el prefijo de fecha como día civil. Los modales también reconstruían el valor con getters locales y podían mostrar otra fecha según TZ. Cálculos de fechas generadas para Radar/Best usaban `toISOString()` sobre medianoche local y podían cambiar el día.
- **Correcciones frontend:** formularios de publicación usan controles de fecha sin hora; serialización de creación/edición conserva `YYYY-MM-DD`, compatible con los campos string actuales y el `new Date(...)` del backend; formularios muestran el prefijo recibido sin convertirlo por TZ. La generación de `listDate`, `publicationDate` y `closeDate` derivados usa aritmética/partes de fecha civil y Best ya no asigna una hora automática. Drag sigue usando `18:00Z`; `closeDate` se convierte a fin exclusivo con aritmética UTC a mediodía; backlog elimina publicationDate; todos los eventos siguen `allDay: true`.
- **Navegación y límites:** FullCalendar conserva la vista mensual y `datesSet` consulta el mes de `currentStart` con getters de la zona local en que FullCalendar presenta el calendario. El backend sigue ampliando la consulta siete días antes/después; no se cambió este contrato ni se tocó su lógica.
- **Dependencias:** E-CC-1 y E-CC-2.
- **Tests necesarios:** creación/edición en un día concreto, serialización estable bajo `TZ=UTC` y `TZ=Europe/Madrid`, fecha de eventos incluyendo borde de mes/fin exclusivo, programación desde backlog, drag entre días, vuelta al backlog, navegación mensual y `allDay: true`.
- **Verificación (2026-10-31):** service Contents, caracterización Content Calendar y `VideoActionsModal`: **47 tests pasan** bajo `TZ=UTC` y **47** bajo `TZ=Europe/Madrid`. Typecheck y build pasan; `git diff --check` pasa. ESLint focalizado devuelve **100 errores legacy** y el mismo resultado se reproduce ejecutándolo sobre las siete SFC en `HEAD`; el helper y el test TS nuevos pasan ESLint. Prettier focalizado marca las mismas siete SFC y también falla en sus versiones de `HEAD`; el helper y el test TS nuevos pasan Prettier. La build avisa por datos Browserslist antiguos, un selector CSS existente y tamaño de chunks. Los tests no conectan con backend/DB ni instancian el motor real de FullCalendar. No se hicieron comprobaciones visuales.
- **Backend:** lectura estática confirma columnas `timestamp`, conversión de strings con `new Date` y límites de mes locales ampliados siete días. No se modificó el repo backend. Sin consulta a DB ni ejecución integrada, no se puede atribuir ni descartar una particularidad del timezone del proceso/driver; no apareció defecto backend demostrado ni se requiere migración para el cambio frontend. Si una respuesta HTTP real cambia el día, queda como incidencia backend independiente.
- **Estado:** **Completada.** No modifica alcance posterior.

### Fase 3 — Modularización y estado remoto

#### E-CC-6 — Separar composición de vista y coordinación de aplicación

- **Objetivo:** reducir el acoplamiento de la vista sin imponer estructura genérica.
- **Problema que resuelve:** el componente de ruta reunía UI, side effects, transformación de evento, drag/drop y mutaciones de varios owners.
- **Alcance técnico:** crear owner modular `src/modules/editorial/content-calendar/`; trasladar vista, componentes, tipos, utilidades, queries, fixtures y pruebas; extraer FullCalendar y operaciones editoriales. Mantener las APIs de Contents, Lists, asignaciones, Articles, Videos e Identity en sus owners existentes.
- **Dependencias:** E-CC-1, E-CC-2 y conclusión contractual de E-CC-4a; coordinar con E-CC-8a para no fijar semántica de borrado.
- **Prioridad:** P2.
- **Estructura final:**

  ```text
  src/modules/editorial/content-calendar/
  ├── application/
  │   ├── contentCalendarQueries.ts
  │   ├── contentCalendarQueries.test.ts
  │   └── useContentCalendarOperations.ts
  ├── presentation/
  │   ├── composables/useContentCalendarFullCalendar.ts
  │   ├── views/ContentCalendar.vue
  │   ├── views/ContentCalendar.characterization.test.ts
  │   └── components/ (backlog y modales específicos)
  ├── types/contentCalendar.types.ts
  └── utils/ (fechas civiles, eventos FullCalendar y fixtures)
  ```

- **Responsabilidades y dependencias:** la vista conserva estado visual y composición. El composable de presentación usa tipos oficiales FullCalendar 6.1.19 y convierte Content en eventos `allDay: true`; mantiene month view, locale `es`, lunes, filtro actual, límites de movimiento, reversiones y fecha civil. La aplicación usa `contentCalendarQueries` para invalidar las claves de usuario/sesión/rol y conserva los GET de Contents bajo TanStack Query. `useContentCalendarOperations` consume servicios públicos existentes de Contents, Lists, asignaciones, Articles y Videos, e Identity Users continúa ofreciendo los autores asignables. No se añaden stores, transporte HTTP, API pública de calendario ni reglas de dominio de Articles/Videos/Lists.
- **Router:** la carga diferida apunta al nuevo `presentation/views/ContentCalendar.vue`; path, nombre, guards, roles, metadata y entrada del sidebar permanecen sin cambios.
- **Archivos legacy retirados:** se eliminó por completo `src/views/contentCalendar/`, incluidas vista, componentes, tipos, fechas, queries, fixtures y tests. Sus consumidores internos se trasladaron; la prueba contractual de Contents ahora importa el fixture modular. No quedan referencias de producción a esa ruta.
- **Tests adaptados:** caracterización de la vista y tests de `VideoActionsModal` están junto a presentación; tests de Query y fixtures/fechas quedan dentro del módulo. Se mantienen clientes Query aislados. La caracterización trasladada conserva contratos de CRUD, fechas, all-day, queries, drag/drop, restricciones, filtro, modales y navegación.
- **Verificación (2026-10-31):** 61 tests focalizados pasan en UTC y 61 en Europe/Madrid (58 baseline E-CC-5 más 3 pruebas de permisos/ruta). `pnpm run typecheck` y `pnpm run build` pasan; build mantiene avisos existentes de Browserslist, selector CSS y tamaño de chunks. ESLint de los nuevos archivos TypeScript pasa; la vista conserva 4 errores legacy de accesibilidad en sus dos handlers de click y el chequeo ampliado muestra 119 hallazgos de accesibilidad en los SFC migrados. Prettier pasa en nuevos archivos de aplicación, FullCalendar, eventos, queries, fechas, tipos y fixtures, y en los tests trasladados; los SFC legacy y algunos archivos/documentos preexistentes aún marcan formato. `git diff --check` pasa. `pnpm run cycles` encuentra un ciclo type-only entre servicios legacy Contents/Articles/Videos/Playlists, sin nodos del nuevo módulo. `pnpm run cycles:required` no puede comparar la delta porque este checkout no proporciona referencias base/head; no se declara evidencia incremental de ciclos. No se usó backend real ni navegador.
- **Riesgos/deuda pendiente:** la lista de usuarios asignables y las APIs de Lists/asignaciones/Articles/Videos mantienen servicios legacy actuales; no se migra su transporte. Los componentes migrados conservan hallazgos de accesibilidad anteriores. Fallos parciales y reintentos siguen en E-CC-7; políticas de borrado en E-CC-8; filtro «mis eventos» y mejoras futuras mantienen sus tareas asignadas. No se implementaron errores parciales, cambios de permisos, filtros ni política de borrado.
- **Estado:** **Completada**. E-CC-7 no se inicia.

#### E-CC-5 — Migrar Content Calendar a TanStack Query

- **Objetivo:** sustituir la gestión manual de consultas remotas principales por TanStack Query, con caché por periodo, cancelación y estados consistentes de carga/error/reintento.
- **Problema que resuelve:** fetches manuales concurrentes, merge en estado local, sin cancelación ni señal visible de error.
- **Alcance técnico:** query mensual identificada por año/mes y query independiente de backlog; transporte de `AbortSignal`; invalidación de las claves de Contents afectadas tras operaciones editoriales. La unión/deduplicación por ID es derivada y no muta la caché. Identidad, generación de sesión y rol forman parte de las claves privadas. Consultas puntuales de Lists, asignaciones, usuarios, Articles y Videos conservan sus servicios/owners actuales. E-CC-5 no mueve la vista ni reorganiza componentes.
- **Dependencias:** E-CC-1, E-CC-2, E-CC-3 y E-CC-4.
- **Prioridad:** P1.
- **Criterios de aceptación:** cambiar de mes rápidamente no mezcla resultados; se cancela el trabajo obsoleto; caché se reutiliza al volver al periodo; backlog no depende del mes; carga/error/reintento y ausencia de resultados son distinguibles; mutaciones invalidan la agenda/backlog de la sesión actual; otra identidad/generación no reutiliza su caché; no hay estado remoto duplicado en Pinia; HTTP y comportamiento funcional se conservan.
- **Queries y claves:** `contentCalendarQueryKeys.month(userId, sessionGeneration, role, year, month)` identifica cada periodo; `contentCalendarQueryKeys.backlog(userId, sessionGeneration, role)` no incluye el periodo. `useContentCalendarQueries` pasa la señal de TanStack Query a los dos GET de Contents. `staleTime` es 30 segundos y la política global de Query controla el retry de red/servidor.
- **Invalidaciones:** tras creación, edición, borrado, programación/desprogramación, movimiento de fechas o cambios de Content se invalida el prefijo de Content Calendar acotado a usuario y generación; esto refresca backlog y los periodos mensuales cacheados. Cambios exitosos de Article, Video, List y asignaciones también invalidan esas consultas porque su proyección está embebida en Contents, sin migrar sus transportes ni mutaciones.
- **Gestión de errores:** agenda y backlog mantienen estados separados. La vista muestra carga inicial, actualización, error con reintento y ausencia real de agenda vacía; si una fuente falla, la otra conserva sus datos disponibles. Las consultas puntuales de detalle de List continúan con el manejo del owner legacy.
- **Cobertura añadida:** tests de claves por periodo/identidad/generación/rol, independencia de backlog, reutilización de caché al volver a un mes, datos disponibles durante la actualización, señal/cancelación de consulta obsoleta, respuestas fuera de orden, loading/error/reintento, deduplicación no mutante, invalidación en CRUD/movimientos y forwarding de `AbortSignal` en los servicios. Se verifica que los resultados viven en Query sin plugin Pinia. La caracterización existente conserva fechas civiles, `allDay`, drag/drop, permisos, enlaces y filtro legacy.
- **Verificación (2026-10-31):** Vitest focalizado: **58 tests pasan** con `TZ=UTC` y **58** con `TZ=Europe/Madrid`; no se usa backend/DB real. `pnpm run typecheck`, `pnpm build` y `git diff --check` pasan. ESLint de los archivos nuevos y tests pasa; el gate focalizado completo mantiene los mismos **5 hallazgos legacy** que HEAD: `ContentsByMonthResponse` vacío en `contents.ts` y dos pares de handlers de click accesibles ya existentes en `ContentCalendar.vue`. Prettier de los archivos nuevos y tests pasa; el chequeo focalizado completo marca los mismos tres archivos que HEAD (`contents.ts`, `ContentCalendar.vue` y este roadmap). Build muestra avisos ya existentes de Browserslist desactualizado, selector CSS y chunks grandes. No se hicieron comprobaciones visuales.
- **Limitaciones identificadas antes de E-CC-6 y resueltas por esa tarea:** la vista legacy aún reunía UI, FullCalendar y coordinación, y las operaciones no tenían owner modular. Las consultas puntuales de Lists y asignaciones conservan sus mecanismos existentes; los autores asignables ahora se cargan desde el coordinador de aplicación mediante la entrada pública de Identity Users.
- **Estado:** **Completada**. No inicia E-CC-6.

### Fase 4 — Operaciones editoriales y cleanup

#### E-CC-11 — Optimización de carga inicial y consultas bajo demanda

- **Objetivo:** reducir peticiones, bytes transferidos y trabajo de procesamiento al abrir Content Calendar, preservando el conjunto de datos necesario para representar agenda mensual y backlog.
- **Prioridad:** P1, condicionada a que esta auditoría confirme oportunidades reales. La primera medida confirma una petición inicial claramente diferible (usuarios asignables) y lecturas repetidas de detalle List al reabrir modal (candidatas a caché). Las respuestas de Contents siguen siendo necesarias para la agenda y backlog; no se presupone que sus relaciones actuales puedan reducirse desde frontend.
- **Estado:** completada el **2026-10-31**.
- **Dependencias:** E-CC-5 y E-CC-6 completadas. Debe preceder a E-CC-7 en la secuencia recomendada; no adelanta sus mejoras funcionales ni las de E-CC-8/9.
- **Alcance:** mantener las consultas mensuales y de backlog necesarias para representar todos los eventos y elementos del backlog. Consultar datos propios de una interacción cuando se abra el modal que los necesita, usando TanStack Query con claves estables, `enabled`, caché reutilizable, estados de carga/error/reintento propios, invalidación tras las mutaciones relacionadas y cancelación cuando el servicio admita `AbortSignal`. Mantener cada transporte en el dominio propietario y consumir sus contratos públicos. No cambiar fechas, FullCalendar, permisos, reglas editoriales, endpoints ni contratos HTTP; no añadir stores Pinia.

**Auditoría del código actual (solo lectura, 2026-10-31):**

| Petición / endpoint | Dominio propietario y momento | Datos y consumidores | ¿Necesaria al inicio? / ¿diferible? | Repetición y TanStack Query |
|---|---|---|---|---|
| `GET /contents/by-month?year=&month=` (`getContentsByMonth`) | Editorial Contents; `useContentCalendarQueries` lo activa al montar y al cambiar el mes, si hay identidad. | `Content[]` de la ventana mensual con relaciones serializadas. `ContentCalendar.vue` deriva eventos que pinta FullCalendar y entrega los registros a los modales; la ventana ampliada del servidor puede incluir bordes de mes. | Sí: aporta los eventos del periodo. No diferir a un modal. | Una query por clave de usuario/sesión/rol/año/mes; TanStack Query, clave estable, `AbortSignal`, `staleTime` 30 s e invalidación existentes. Sin GET idéntico adicional en el montaje.
| `GET /contents?backlog=true` (`getContents(true)`) | Editorial Contents; query independiente activada al montar, si hay identidad. | `Content[]` del backlog. `ContentCalendar.vue` combina por ID con el mes y `BacklogPanel.vue` muestra título, tipo, autor/editor y permite abrir edición/acciones. | Sí: alimenta el backlog inicial. No diferir a un modal. | Una query por usuario/sesión/rol; TanStack Query, clave estable, cancelación, `staleTime` 30 s e invalidación existentes. El backlog no depende del mes.
| `GET /auth/usersRv` (`getRvUsers`) | Identity / Users; se ejecuta incondicionalmente en `onMounted` mediante `loadAssignableUsers()`. No es una consulta de sesión ni reemplaza la identidad actual del módulo Auth. | Lista de usuarios RV; `CreateContentModal`, `EditContentModal` y acciones de Radar/Best, Photos, Reunion, Article y Video la usan para asignar autor. El handler también establece el autor actual por defecto si aún no hay uno. | No: no interviene en el render de agenda/backlog. Diferible hasta que se abra una vista/formulario que permita elegir autor. | Hoy llamada manual; no está en TanStack Query. Una petición por montaje de la vista, aunque los usuarios no cambien entre sus distintos modales; remontar la ruta vuelve a pedirla. No hay caché compartida en esta capacidad.
| `GET /lists/:id` (`getListDetails`) | Lists; se ejecuta al hacer click en un evento Radar/Best y `loadRadarDetails` encuentra `content.list.id`. | Detalle de List, estado/fechas y `asignations`; `RadarActionsModal` los muestra y permite cambiar estado/campos/fechas, marcar asignaciones y borrar la List. | No para agenda/backlog, cuyos datos vienen de Contents. Ya es bajo demanda al abrir acciones Radar/Best. | Llamada manual sin caché; al reabrir/clicar de nuevo el mismo List se repite. No usa TanStack Query. El handler también se invoca para otros tipos, pero retorna sin petición.
| `GET /asignations/list/:listId` (`getAsignationsByListService`) | Asignaciones; la función existe, pero no tiene caller en Content Calendar. | Devolvería asignaciones para una List. | No; no se ejecuta al montar ni al abrir estos modales. No añadir una llamada paralela: la lectura que usa el modal hoy es `GET /lists/:id`. | No se repite en esta capacidad ni está en su caché Query.
| `GET /articles/:id`, `GET /videos/:id`, `GET /articles`, `GET /videos` | Articles y Videos; funciones de servicio disponibles en sus dominios, sin caller GET desde Content Calendar. | La respuesta de Contents incluye la proyección Article/Video usada por los modales (tipo, estado, editor/usuario e IDs/campos asociados declarados en `ContentArticle`/`ContentVideo`). | No hacen falta como cargas separadas con la respuesta actual; los modales leen las relaciones incluidas en `Content`. No hay consulta adicional que mover. Si en el futuro faltara un campo, el dueño debe exponerlo mediante su API pública. | Ninguna repetición GET en Content Calendar; no están en TanStack Query de esta vista. Las mutaciones PATCH de Article/Video son interacciones posteriores y ya invalidan Contents.
| Consultas auxiliares de formularios (`Lists`, catálogo/artistas, opciones Article/Video, etc.) | Varios dominios; no se encontraron llamadas GET en componentes ni coordinador de Content Calendar. | Selectores de fecha/tipo/estado usan constantes y cálculo local; los formularios de Content comparten `rvUsers`. | Ninguna consulta auxiliar se ejecuta al montar ni al abrir los formularios revisados. | Sin petición/caché que optimizar.
| Identidad de sesión (`authStore`) | Identity / Auth; la vista lee `userId`, `authSessionGeneration` y `role` para habilitar/particionar queries, además de datos de presentación. | Identidad ya inicializada por el ciclo de sesión de la aplicación. | La vista necesita la identidad del owner, pero no inicia un GET de perfil al montarse. No duplicar ni trasladar su carga. | Estado de Pinia de Identity; no forma parte de las llamadas propias de Contents/modales aquí inventariadas.

Las mutaciones `POST/PATCH/DELETE` de Contents, Lists, Asignaciones, Articles y Videos son posteriores a acciones del usuario; no son peticiones de carga inicial. Tampoco se encontraron llamadas GET iniciales a Articles, Videos, listas generales o asignaciones por separado. La inspección no mide tamaños reales de respuestas backend; no se atribuye ahorro de bytes a una relación concreta sin medir payloads.

**Implementación realizada:**

1. `ContentCalendar.vue` ya no carga usuarios en `onMounted`. `useAssignableUsersQuery` se habilita con `showCreateModal`, `showEditModal` o una acción especializada abierta que ofrece selector de autor. Una query compartida alimenta Create, Edit, Radar/Best, Photos, Reunion, Article y Video; leyenda, borrado y acciones genéricas no la activan. Identity conserva el transporte público `getRvUsers` y ahora acepta `AbortSignal`. La carga/error/reintento se presenta dentro del campo de usuario; las acciones que requieren opciones quedan deshabilitadas sin usuarios. FullCalendar y el draggable del backlog inicializan sin esperar.
2. `useRadarListDetailsQuery` se habilita solo para Radar/Best con modal abierto e ID de List. Usa el `getListDetails` existente del servicio Lists, ahora tipado en su owner y con soporte de `AbortSignal`. El detalle no conserva datos de una List distinta; cada ID recibe su propia clave y los datos frescos se reutilizan. El modal diferencia carga inicial, actualización con datos guardados, error con reintento y estado disponible.
3. Claves privadas: usuarios `['identity','users','rv-assignable',userId,generation,role]`; detalle `['editorial','content-calendar','deferred',userId,generation,role,'list',listId]`. Usuarios usan `staleTime: 60 s`; Lists, `staleTime: 30 s`; la caché global conserva `gcTime: 5 min`, reintento de red/servidor una vez y cancelación/limpieza por Identity al cambiar sesión/permisos. Query posee los resultados; no se guardan en Pinia ni en refs locales.
4. Las mutaciones de Content mantienen la invalidación del prefijo Content Calendar de E-CC-5. Cambios de fechas/edición de Radar/Best invalidan también el detalle de su List. Actualizaciones de estado/campos y asignaciones invalidan la clave exacta de List además de Contents; al borrar List, su clave se elimina solo después de confirmar el éxito. Las asignaciones conservan actualización optimista y rollback. Si una mutación falla, el detalle válido permanece en caché. No se implementa el retry avanzado de E-CC-7.
5. No se añadieron GET de Articles/Videos ni `GET /asignations/list/:id`: la proyección Article/Video sigue viniendo en Contents y List es la lectura única de asignaciones. Las queries mensuales/backlog, sus contratos y FullCalendar permanecen sin cambios.

**Medición, resultados y aceptación:**

- **Baseline automatizada anterior al cambio:** con sesión válida y caché vacía, los spies de la prueba de caracterización registraron 1 GET mensual, 1 GET backlog, 1 GET `/auth/usersRv` en montaje y 0 GET de Lists, Articles, Videos o asignaciones. El conjunto focalizado previo pasó 37 tests en UTC y 37 en Europe/Madrid.
- **Resultado de carga inicial:** con la misma configuración, se mantienen 1 GET mensual y 1 GET backlog; `/auth/usersRv`, `/lists/:id`, Articles, Videos y asignaciones hacen 0 GET. La prueba también comprueba que se conservan los eventos y elementos del backlog.
- **Resultado modal/caché:** el primer modal con selector activa 1 GET de usuarios; otro modal reutiliza esa respuesta fresca. Radar/Best activa un GET por ID sin caché, reabrir una List fresca no repite la petición, y un ID distinto consulta su propio detalle. Invalidación explícita vuelve a consultar solo el detalle activo correspondiente; errores de usuarios/List no afectan los datos del calendario.
- **Datos procesados/bytes:** no se instrumentaron cantidades reales de payload ni bytes de red; los tests usan fixtures y mocks, no respuestas reales. No se afirman ahorros de transferencia ni porcentajes. No se añadió instrumentación permanente.
- **Tests añadidos:** queries diferidas (habilitación, deduplicación de observadores, caché, IDs, sesión, invalidación, retry); estados de carga/error/retry de usuarios y Lists; caracterización de cargas iniciales y modales; invalidación/rollback de mutaciones; y forwarding de `AbortSignal` en Identity. El modal no altera el detalle cacheado al seleccionar un estado.
- **Verificación de E-CC-11:** 61 tests focalizados pasan con `TZ=UTC` y 61 con `TZ=Europe/Madrid` (Content Calendar, transporte de Identity Users y permisos de ruta). Typecheck, build y `git diff --check` pasan. ESLint mantiene solo hallazgos preexistentes en SFCs legacy y en los servicios legacy Contents/Lists; no hay errores nuevos en los archivos de aplicación/queries/pruebas añadidos. Prettier pasa en archivos nuevos; los SFC legacy y algunos archivos ya existentes continúan sin pasar el check integral. `pnpm run cycles` conserva un único ciclo type-only previo entre servicios Articles/Contents/Videos/Playlists; no aparece un ciclo nuevo con el módulo de Content Calendar. No se usó backend real ni navegador.
- No se hicieron comprobaciones visuales manuales. Los valores de bytes reales y procesamiento backend quedan sin medir; si reducir el payload requiere cambiar proyección/respuestas Contents, debe abrirse una tarea backend independiente antes de implementarlo.

- **Dependencia backend condicional:** una tarea separada solo si se demuestra con medición que reducir bytes exige omitir relaciones/campos de las respuestas Contents y se puede definir una proyección compatible. No es requisito de esta planificación y no autoriza modificar contratos.

#### E-CC-7 — Reintentar operaciones compuestas sin duplicar éxitos

- **Objetivo:** implementar DEC-CC-6 en Content + Article/Video y otras entidades que compartan el flujo modal.
- **Problema que resuelve:** operaciones independientes notifican error mientras Content puede cerrar el modal; no hay estado de éxito/fallo por operación.
- **Alcance técnico:** resultado tipado por operación; ante fallo mantener modal/datos; reintentar solo las fallidas con ID/payload estable; mostrar estado parcial; invalidar solo queries de éxitos. Sin transacción distribuida ni endpoint agregado.
- **Dependencias:** E-CC-2, E-CC-5 y E-CC-6; reglas de fecha de E-CC-4b.
- **Prioridad:** P1.
- **Criterios de aceptación:** operaciones pueden completar independientemente; retries no repiten éxitos; fallas pueden reintentarse conservando datos; el modal cierra solo al completar todo o acción explícita; resultado parcial se comunica correctamente.
- **Tests necesarios:** éxito mixto, fallo parcial, retries selectivos, doble click, invalidación por dominio y tests de interacción/modal.
- **Dependencia cross-repo:** frontend; backend solo si nueva evidencia demuestra que endpoint actual no permite una mutación idempotente y se aprueba tarea aparte.

#### E-CC-8 — Revisar política de eliminación antes de cambiarla

- **Objetivo:** distinguir desprogramar, retirar entrada de agenda y eliminar entidad editorial.
- **Problema que resuelve:** DELETE Content tiene efectos distintos por tipo; Reunion reutilizable puede tener varias referencias, y List guarda tracking local de WordPress.
- **Alcance técnico:** **8a**, revisar ownership, FKs/cascades, consumidores, referencias compartidas, tests y efectos WordPress; confirmar matriz y filas históricas con lectura controlada. **8b**, proponer y dejar pendiente de aprobación una política por tipo y por cada una de las tres intenciones. **8c**, implementar solo tras aprobación explícita; cambiar backend/frontend únicamente según alcance aprobado y no crear endpoints por defecto.
- **Dependencias:** 8a depende de E-CC-1; 8c de 8b y E-CC-2. 8a puede adelantarse antes de modularizar.
- **Prioridad:** P1 investigación/decisión; P1 implementación condicional.
- **Criterios de aceptación:** matriz aprobada para los siete tipos; borrar Content con relaciones compartidas conserva integridad; no se elimina contenido remoto de WordPress accidentalmente; copy refleja el efecto real.
- **Tests necesarios:** matriz lifecycle/List coordinator, rollback Reunion compartida, cascada Points/asignaciones, delete-blocking Article/Video/Playlist y tests UI por comando elegido.
- **Dependencia cross-repo:** análisis frontend/backend; implementación cross-repo condicional y puede implicar WordPress.

#### E-CC-9 — Investigar `ready` y aplicar filtro «Mis eventos»

- **Objetivo:** mantener abierta la política de `ready` e implementar por separado el filtro confirmado.
- **Alcance técnico:** **9a**, inventario de `ready` ya registrado en auditoría; verificar clientes desplegados y datos históricos, recomendar mantener/definir/deprecar, sin tocar campo ni DB. **9b**, filtrar `author.id === authStore.userId` en calendario y backlog; autor nulo no es propio; toggle off muestra todos los accesibles; persistir toggle mientras vista viva; no mutar/eliminar ocultos. **9c**, deprecación y eventual borrado de columna únicamente tras aprobación posterior, migrando consumers/DTOs/tests y retirando storage al final.
- **Dependencias:** 9a depende E-CC-1; 9b depende E-CC-1 y E-CC-5; 9c depende 9a, E-CC-3c y decisión expresa.
- **Prioridad:** 9a P1, 9b P1, 9c P2 condicional.
- **Criterios de aceptación:** 9a entrega recomendación basada en consumidores/datos sin cambiar runtime; 9b oculta ajenos en ambos paneles y meses, excluye autor nulo y recupera resultados al desactivar, sin afectar acciones de registros ocultos; 9c solo después de aprobación con columna al final.
- **Tests necesarios:** 9a revisión de tests/query contracts; 9b selector puro y UI filtro/backlog/navegación/acciones; 9c contrato cross-repo/deprecación y migración PostgreSQL aislada si aprobada.
- **Dependencia cross-repo:** 9a/9c frontend y backend; 9b frontend.

#### E-CC-10 — Retirar deuda local verificada

- **Objetivo:** dejar los límites y tipos del módulo legibles tras estabilizar comportamiento.
- **Problema que resuelve:** restos comentados, tipos abiertos y responsabilidades residuales observados en la vista legacy.
- **Alcance técnico:** revisar y eliminar solo código muerto confirmado en `ContentCalendar.vue` (por ejemplo, helper comentado de drag-start), reemplazar `any` restante en la capacidad y actualizar imports/formatting; no migrar servicios compartidos ni tocar código ajeno.
- **Dependencias:** E-CC-2, E-CC-4b, E-CC-5, E-CC-6, E-CC-7, E-CC-8b y E-CC-9b.
- **Prioridad:** P3.
- **Criterios de aceptación:** no hay `any` ni código comentado obsoleto nuevo/preexistente dentro del scope acordado; no cambian los contratos y pasan los gates aplicables.
- **Tests necesarios:** suite focalizada de Content Calendar, typecheck, lint focalizado y build.

## Secuencia recomendada de ejecución

La auditoría inicial permanece completada. Esta secuencia ordena el trabajo futuro; no autoriza ninguna implementación ni cierra las decisiones abiertas.

1. **Baseline:** E-CC-1 → E-CC-2.
2. **Seguridad y exposición:** E-CC-3a (confirmar clientes desplegados) → E-CC-3b (GET autenticados) y E-CC-3c (proyección pública segura), coordinadas para no dejar una ruta indirecta equivalente.
3. **Investigaciones que condicionan diseño:** E-CC-8a/8b (matriz y propuesta de borrado) y E-CC-9a (`ready`) pueden avanzar tras E-CC-1. La política de borrado y de `ready` requiere decisión posterior antes de ejecutar cambios condicionales.
4. **Consistencia del día y consultas:** E-CC-4 y E-CC-5 están completadas, con pruebas de fecha en UTC/Europe-Madrid y consultas en ambas zonas. E-CC-5 se implementó en la vista legacy, sin esperar a la reorganización estructural.
5. **Estructura y optimización de carga:** E-CC-6 y E-CC-11 están completadas. E-CC-11 se ejecutó después de E-CC-6 y antes de E-CC-7; no es una dependencia funcional de las mutaciones de E-CC-7.
6. **Operaciones compuestas:** E-CC-7 utiliza la invalidación de E-CC-5. No usar transacción distribuida.
7. **Filtro confirmado:** E-CC-9b después de E-CC-5; puede implementarse frontend una vez estén disponibles las consultas autenticadas y la composición acordada.
8. **Cambios sujetos a aprobación:** E-CC-8c y E-CC-9c únicamente después de aprobación expresa de sus políticas. E-CC-10 al final, tras los cambios aceptados.

**Dependencias cross-repo:** E-CC-3 afecta frontend y backend; 3c también toca las proyecciones públicas de Articles, Videos y Riff Valley Playlists. E-CC-4 queda en frontend mientras no exista evidencia integrada de desplazamiento del lado backend; cualquier corrección de storage/consulta sería una tarea independiente. E-CC-8a analiza ambos, y 8c puede cambiar backend/frontend si se aprueba. E-CC-9a/9c involucran frontend/backend; E-CC-11 y E-CC-7 son frontend. Una posible reducción de proyección/payload en Contents se evaluaría en tarea backend independiente solo con evidencia y definición de contrato aprobada.

## Verificaciones de la auditoría inicial

- Lectura estática de ruta, Sidebar, vista completa, componentes importados, APIs frontend, tipos, tests presentes y referencias a Content Calendar.
- Revisión de arquitectura/convensiones frontend y de la exclusión explícita de `/content-calendar` en `roadmap/catalog/calendar.md`.
- Lectura solo de backend: controller, módulo, fachada, servicios de aplicación, DTOs, entidades, migraciones y tests existentes; contraste con la auditoría backend Editorial ya publicada. También se buscaron consumidores en repositorios locales frontend, backend, wiki y plugin editorial.
- Se revisaron dependencias instaladas y documentación oficial de FullCalendar v6 para semántica de zona horaria y resize: [timeZone](https://fullcalendar.io/docs/v6/timeZone), [eventResize](https://fullcalendar.io/docs/eventResize). Un named timezone requiere elegir una integración compatible; no se instaló nada.
- En la auditoría inicial no se ejecutaron tests, typecheck, build, lint ni navegador. No se consultaron datos PostgreSQL, logs de producción, API gateway, clientes externos desplegados ni CI; esos puntos quedan como investigación de las tareas correspondientes.
- No se modificó código funcional ni se tocó la auditoría backend-cleanup. La validación visual queda pendiente del usuario, según la restricción de alcance.

La ejecución de E-CC-1 y sus gates está registrada en su tarea arriba. Las comprobaciones de ese cierre no alteran el alcance ni el estado de E-CC-2–E-CC-10.
