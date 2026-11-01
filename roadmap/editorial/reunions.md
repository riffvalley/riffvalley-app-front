# R-5 — Cierre definitivo de Reunions y Points

## Estado

**Reunions y Points: CERRADO el 2026-11-01.** R-1-BE, R-2-BE, R-3-BE, R-3b-BE, R-4-FE y R-5 están completadas. El usuario confirmó que el SSE funciona correctamente en su validación manual y acepta la sincronización en tiempo real. Esta aceptación no atribuye comprobación individual de cada escenario funcional.

| Fase | Estado | Alcance |
|---|---|---|
| R-1-BE | COMPLETADA | Auditoría de contratos, modelo y permisos. |
| R-2-BE | COMPLETADA | Caracterización/refactor localizado sin cambiar rutas HTTP. |
| R-3-BE | COMPLETADA | Infraestructura SSE autenticada y acotada a Reunions. |
| R-3b-BE | COMPLETADA | Contrato SSE descriptivo definitivo v1. |
| R-4-FE | COMPLETADA | Módulo, contratos tipados, TanStack Query, mutaciones, borradores, SSE y Vue Sonner. |
| R-5 | COMPLETADA | Verificaciones integradas registradas y cierre aceptado por el usuario. |

El detalle histórico y los contratos del backend están en el [roadmap backend de Reunions](../../../riffvalley-app-back/roadmap/editorial/reunions.md) y su [contrato TypeScript R-3b](../../../riffvalley-app-back/src/editorial/reunions/realtime/contracts/reunions-event.contract.ts). El backend se consultó en modo lectura y no se modificó en esta ejecución.

## Aceptación y evidencia de cierre

- **Aceptación manual comunicada por el usuario:** el SSE funciona correctamente y se acepta la sincronización en tiempo real de Reunions. No se documenta una comprobación individual de todas las acciones ni se atribuyen pruebas de navegador al agente.
- **Evidencia técnica backend previa (R-3b-BE):** `pnpm run verify` aprobó 275 suites y 2.695 tests (31 suites y 165 tests omitidos por configuración), typecheck, build y gates técnicos sin nuevas infracciones. Las suites focalizadas de Reunions, Contents, Content Calendar y CORS aprobaron 16 suites y 146 casos; Prettier y `git diff --check` también pasaron.
- **Evidencia técnica frontend previa (R-4-FE):** las pruebas focalizadas aprobaron 106 tests en 13 archivos con `TZ=UTC` y, por separado, 106 tests en los mismos 13 archivos con `TZ=Europe/Madrid`. Typecheck, build, ESLint y Prettier focalizados y `git diff --check` pasaron. `pnpm run cycles` no encontró edges locales sin resolver; `pnpm run identity:boundaries` no encontró infracciones actuales.
- Los resultados anteriores pertenecen a R-3b-BE y R-4-FE, no a esta actualización documental R-5. Las dos ejecuciones de zona horaria son validaciones del mismo conjunto, no 212 tests distintos.

## Arquitectura frontend final

La capacidad vive en `src/modules/editorial/reunions/`:

- `api/reunionsApi.ts` conserva los endpoints, aplica los mappers HTTP y concentra las cabeceras de origen.
- `application/reunionsQueries.ts` posee la raíz, listado y detalle de TanStack Query. Sus identidades contienen usuario, generación de sesión y rol.
- `application/useReunionsMutations.ts` centraliza CRUD y la coordinación de invalidaciones. La creación desde la lista continúa pasando por `POST /api/contents` con tipo `reunion`; se invalidan las queries de Reunions y Content Calendar.
- `application/reunionsEventsParser.ts`, `reunionsEventsClient.ts`, `useReunionsRealtime.ts` y `reunionsRealtime.ts` validan, consumen y coordinan el stream, comparan los datos visibles y formatean toasts.
- `presentation/views/ReunionsListView.vue` compone la lista, creación y filtros locales. `ReunionDetailView.vue` conserva la ruta de detalle.
- `presentation/components/ReunionTable.vue` mantiene las filas actuales, puntos, contadores y vistas previas. `ReunionEditor.vue` comparte el editor para detalle y diálogo.
- `presentation/composables/useReunionEditor.ts` posee exclusivamente borradores y estado efímero del editor.
- `types/reunions.ts` contiene modelos de presentación, contratos HTTP, DTOs y unión de eventos.
- `src/shared/realtime/` posee el parser SSE genérico, el transporte autenticado reutilizado, el backoff y el UUID efímero de pestaña.

`ReunionLayout.vue` es dueño de una única suscripción por instancia activa de la sección. Las rutas existentes `/reunions/list` y `/reunions/:id`, sus nombres, permisos y guards se conservan. Router apunta a las vistas del módulo. La conexión se abre solo con sesión autenticada y rol mínimo `riffvalley`; cambiar usuario, generación, rol o token la limpia y evalúa el nuevo contexto. Navegar entre rutas hijas no crea otra conexión. Se cierra al abandonar/desmontar la sección o cerrar sesión.

## Contratos HTTP, tipos y mappers

Se conservan las rutas implementadas por backend:

| Método | Ruta | Uso frontend |
|---|---|---|
| GET | `/api/reunions` | Lista completa con los Points asociados; conserva paginación local y no finge `limit/offset` de servidor. |
| GET | `/api/reunions/:id` | Detalle cuando hace falta; usa datos recientes del listado como `initialData` si están en caché. |
| POST/PATCH/DELETE | `/api/reunions[/:id]` | Crear, editar y eliminar vía mutaciones. |
| GET | `/api/points` y `/api/points/:id` | No se consultan desde la UI porque no hay consumidor independiente: el listado/detalle de Reunion ya incluye Points. |
| POST/PATCH/DELETE | `/api/points[/:id]` | Crear, editar título/contenido/estado, completar/reabrir y eliminar. El DTO PATCH conserva `reunionId` para la reasignación HTTP existente si una UI la consume. |

`ReunionHttpResponse` y `PointHttpResponse` reflejan los nombres de entidad del backend (`titulo`, `fecha`, `done: boolean | null`, campos nullable y relaciones opcionales por carga). `mapReunion` y `mapPoint` transforman una sola vez al modelo de presentación (`title`, `date`). El dominio ya no usa `any`. Se retiró el helper legacy que llamaba a `/reunions/:id/points`; sus consumidores eran exclusivamente los editores sustituidos y no existe ese endpoint.

## TanStack Query y mutaciones

Las query keys son:

- `['editorial', 'reunions', userId, generation, role]` como raíz privada.
- La raíz seguida por `list` para el listado HTTP completo.
- La raíz seguida por `detail`, `id` para un detalle requerido.

Los detalles pueden inicializarse con una fila fresca del listado, que ya contiene todos los Points. No se hacen GET por reunión al recorrer la lista. El stream invalida la raíz de la sesión capturada: listados/detalles activos recuperan HTTP y los detalles inactivos quedan stale. No se copia el payload SSE a caché.

Las mutaciones centralizadas cubren CRUD de Reunions y Points. Cada éxito invalida la raíz de Reunions; la creación vía Content también invalida Content Calendar. Los errores no invalidan como si hubieran confirmado una escritura. No se añade paginación de servidor, orden de Points, operación nueva ni caché remota paralela.

## Borradores

El resultado remoto permanece en Query. El formulario de reunión se inicializa al abrirlo; cada formulario de Point al comenzar su edición. El refetch actualiza títulos, fechas y Points no editados, pero no sincroniza props remotas sobre campos locales. Guardar descarta el borrador al confirmar la mutación; cancelar/descartar lo elimina; cambiar la reunión desmonta y descarta sus borradores locales. Si un Point editado desaparece o se mueve mientras sigue abierto, el editor mantiene visible su borrador y permite descartarlo o intentar guardar bajo la semántica HTTP existente. Si la reunión se elimina durante su edición, el último detalle visible conserva el formulario; el refetch informa del error sin cerrar el diálogo ni borrar el texto. No hay locks, edición por carácter, ni control de versiones.

## SSE descriptivo v1

El cliente consume `GET /api/reunions/events`, evento `reunions.invalidate`, versión `1`. La validación está basada en la unión discriminada definitiva de R-3b-BE, no en ejemplos ni en el envelope genérico reemplazado:

- `reason: initial` es solo señal de sincronización; invalida HTTP y nunca genera toast.
- `reason: change` puede ser el fallback genérico sin actor/entidades, que invalida sin toast.
- Las variantes descriptivas requieren `action`, actor (`user` con id/nombre o `system` con su nombre) y las referencias exactas `reunion`, `point` y `previousReunion` cuando corresponde.
- Se soportan `reunion.created|updated|deleted` y `point.created|updated|completed|reopened|moved|deleted`. El formateador produce texto español plano; no se inyecta HTML ni se inventan nombres.

El framing SSE incremental, `TextDecoder`, fetch Bearer, AbortController, recuperación de sesión Identity, backoff con jitter, reconexión tras EOF y espera de conectividad se comparten en `src/shared/realtime/`. Los validadores y contratos permanecen separados. Content Calendar conserva `contents.invalidate` v2, su parser de dominio y su cabecera de stream histórica.

Una ventana determinista de 180 ms agrupa invalidaciones. Cada lote ejecuta HTTP; un toast solo aparece para acciones descriptivas ajenas a esta pestaña, tras un refetch exitoso y cuando una comparación de valores visibles confirma cambios reales. Se comparan títulos, fechas, descripciones, contenido/estado de Points, relaciones y eliminaciones. Si coinciden varios cambios se muestra un mensaje neutro agregado. Heartbeats, sincronización inicial, reconexión, fallback, evento propio, refetch fallido y datos equivalentes no generan toast. La UI usa el `Toaster` global de Vue Sonner, posición superior derecha y duración de 3 s; SweetAlert2 sigue gestionando las confirmaciones/feedback de operaciones.

## Identificador de origen

`editorialClientId` genera `crypto.randomUUID()` una vez por pestaña. SSE de Reunions y sus mutaciones envían `X-Riff-Valley-Client-Id`; las escrituras de creación de Content tipo `reunion` envían esa cabecera junto a la cabecera histórica de Content Calendar. El stream de Content Calendar conserva su cabecera histórica y usa el mismo UUID compartido. El identificador solo permite reconocer origen y nunca autoriza.

Eventos con ese `sourceId` invalidan Query y suprimen toast; eventos de otra pestaña del mismo usuario no se suprimen. Si falta el origen, la supresión solo ocurre mientras hay una mutación local de Reunions pendiente.

## Componentes legacy retirados

Tras comprobar las rutas activas y todos los imports, Router dejó de consumir `src/views/reunions/ListReunion.vue`, `EditReunion.vue`, `components/ReunionTable.vue` y `components/ReunionEditModal.vue`; se retiraron esas implementaciones duplicadas y se migraron sus capacidades a las vistas/componentes del módulo. También se eliminaron `src/services/reunions/reunions.ts` y `src/services/points/point.ts`, incluidos los `any` y el helper de ruta inexistente. `ContentReunion` dejó de depender del tipo del servicio borrado y conserva la referencia `{ id }` de Contents.

## Pruebas y verificaciones locales

Cobertura focalizada añadida para contratos/mappers/endpoints, keys y aislamiento de sesión, detalle inicializado desde lista, cancelación de GET, creación vía Content e invalidaciones, guards/rutas, framing/validación SSE v1, acciones y actor de sistema, comparación visible, conexión única, origen propio/ajeno, invalidación/refetch/toasts, protección de borradores y foco del diálogo. Se ejecutaron también las suites de regresión de Content Calendar y Contents.

- Vitest focalizado `TZ=UTC`: **13 archivos, 106 pruebas aprobadas**.
- Vitest focalizado `TZ=Europe/Madrid`: **13 archivos, 106 pruebas aprobadas**.
- `pnpm run typecheck`: aprobado.
- ESLint focalizado: aprobado.
- Prettier focalizado en código migrado y pruebas nuevas: aprobado. El servicio legacy `src/services/contents/contents.ts` se mantuvo sin reformateo global para evitar churn no relacionado.
- `pnpm run build`: aprobado. Vite informa advertencias existentes de CSS/chunks y datos Browserslist antiguos; no se tocaron esas reglas/fuentes.
- `pnpm run cycles`: cero edges locales sin resolver; reporta un ciclo de tipos del código preexistente Contents/Articles/Videos/Playlists. La comparación es informativa porque el checker no pudo resolver una base local.
- `pnpm run identity:boundaries`: cero infracciones actuales. La comparación es informativa por falta de base local resoluble.
- `pnpm run cycles:required` y `pnpm run identity:boundaries:required`: no pueden validar el delta en este checkout porque no se proporcionaron referencias base/head.
- `pnpm run markdown:links`: detecta seis enlaces rotos o fuera del repositorio en roadmaps existentes y marca los dos enlaces al backend hermano como externos; ambos se incluyen deliberadamente como referencias de fuente.
- Detector Impeccable estático: sin hallazgos.
- `git diff --check`: aprobado.

Los gates estructurales locales no equivalen a comparar una ejecución de GitHub Actions. No se hicieron pruebas visuales manuales en navegador, conforme a la validación reservada al usuario.

## Limitaciones conocidas no bloqueantes

- El backend devuelve el conjunto completo; no pagina en servidor. La vista conserva filtros/paginación local existente.
- Points no tiene una consulta independiente porque la vista no necesita una; todos sus datos se recuperan con Reunion.
- Dos editores siguen sujetos a la semántica HTTP existente para conflictos simultáneos; no hay bloqueo o versionado.
- Los publishers SSE se mantienen en memoria y solo distribuyen eventos dentro de una misma instancia de proceso. No hay distribución entre dynos o réplicas; si el despliegue adopta ese modelo será necesaria infraestructura adicional. No se añade Redis ni otro broker como parte del cierre.
- SSE no mantiene historial ni replay; la reconexión recupera estado mediante HTTP y TanStack Query.
- El ciclo de vida de diez minutos/reconexión y la disponibilidad entre instancias conservan las limitaciones documentadas por backend; no se añadió WebSocket ni historial.
- Deuda preexistente ajena a Reunions: ciclo de tipos entre Contents/Articles/Videos/Playlists; advertencias de CSS, chunks y Browserslist; enlaces Markdown históricos o externos; y modos `required` de los gates que no pudieron calcular el delta al faltar referencias base/head. No son bloqueos ni nuevas tareas de Reunions.

## Cierre documental coordinado

Este roadmap frontend registra R-5 como COMPLETADA y el estado global de Reunions como CERRADO. El roadmap backend citado arriba se mantuvo intacto por el límite de repositorio. En una actualización documental separada allí hay que cambiar su resumen, tabla de estado y párrafos finales que aún marcan R-4-FE y R-5 pendientes; las propuestas antiguas quedan superadas por la arquitectura y el contrato efectivamente implementados en R-3b-BE/R-4-FE. La limitación multi-instancia debe permanecer como conocida, no como fase pendiente.
