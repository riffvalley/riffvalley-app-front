# CON-F12a — Auditoría y arquitectura de importación masiva

**Estado:** auditoría y diseño; no autoriza implementación.

**Alcance:** conciertos y festivales importados por el editor JSON CON-F11. El mismo flujo frontend también admite giras, pero esta iniciativa no amplía el alcance funcional a otras capacidades.

**Repositorios revisados:** `riffvalley-app-front` y `riffvalley-app-back`, checkouts locales disponibles el 2026-11-04.

**Método:** lectura estática de código, contratos, migraciones y configuración; consulta Heroku en modo lectura. No se inspeccionaron navegador, capturas, tráfico real ni planes SQL sobre datos de producción.

## Resumen ejecutivo

CON-F11 admite archivos JSON de hasta 2 MiB, pero no impone un máximo de eventos. CON-F12 ya agrupa la resolución de referencias únicas en lotes de hasta 100, con concurrencia limitada a tres y caché por sesión. El frontend registra mediciones sintéticas previas: 500 eventos con referencias únicas generaron 15 peticiones de resolución; 1.000 generaron 30. Son mediciones con HTTP simulado, no tráfico ni pruebas de producción.

La persistencia actual es síncrona: el navegador envía POST secuenciales de 50 filas a `POST /api/events/import-batch`; el backend admite 100. Cada fila creada se confirma en su propia transacción y tiene recibo idempotente. El batch completo no es atómico. Esto evita una transacción global larga y permite repetir la misma operación con seguridad, pero el trabajo se detiene cuando desaparece el proceso web que atiende el POST. No hay trabajo persistente que el backend pueda continuar tras cerrar la pestaña o reiniciar el dyno.

El principal cuello de botella restante está en el coste de base de datos por evento y la comprobación de conflictos, no en el número de llamadas de resolución desde el navegador:

- El preflight batch de conflictos ejecuta una consulta SQL para traer candidatos y analiza en memoria todas las parejas de filas importadas; la lógica interna tiene bucles anidados sobre las filas.
- Antes de insertar cada evento se revalidan conflictos para esa fila, lo que vuelve a ejecutar una consulta de candidatos por evento.
- La ruta de persistencia procesa eventos secuencialmente. Para cada fila abre una transacción, reclama el recibo, toma bloqueos advisory, vuelve a materializar locality/artistas/venue y guarda Event y EventArtist.
- Los resolvers de escritura por fila siguen consultando o materializando entidades individualmente aunque la inspección pública sea batch. Las transacciones pequeñas son una fortaleza de integridad, pero el volumen de SQL crece aproximadamente con filas × lineup y no constituye escritura masiva SQL.

Heroku confirma un dyno Basic `web` y no tiene proceso `worker`; PostgreSQL es `essential-0`, PostgreSQL 16.14, 1 GB, 20 conexiones máximas, 29,9 MB usados y 1 conexión observada al consultar. Hay un add-on Scheduler, pero su ejecución periódica de one-off dynos no es una cola fiable para continuar trabajos de larga duración. La arquitectura recomendada es híbrida: conservar el frontend como editor/revisor y usar trabajos persistentes en PostgreSQL con un worker backend dedicado. No introducir Redis.

## 1. Inventario frontend y mapa HTTP

### Flujo inspeccionado

El contrato v1/v2 de CON-F11 y el parser están en `src/modules/events-festivals/application/scrapedEventJson.ts`; la vista de importación es `presentation/views/EventsFestivalsImportView.vue`; la tabla editable es `presentation/components/EventImportTable.vue`; la preparación y los snapshots inmutables están en `application/eventImportPreparation.ts`. La resolución vive en `useEventImportRows.ts`, `useEventEntityResolution.ts`, `useEventGeographyResolution.ts`, `useEventTourResolution.ts` y `entityResolutionQueries.ts`. El borrador local se guarda con IndexedDB desde `infrastructure/eventImportSessionStorage.ts` y `useEventImportSession.ts`.

El JSON se valida en cliente, se transforma en filas editables y cada identidad única se resuelve antes de confirmar. La identidad de Locality considera país, nombre, región administrativa y provincia; Venue considera localityId y nombre; Artist y Tour normalizan nombre. Los resultados conservan estado individual (existente/nueva, ambigua, inválida o error) y las selecciones ambiguas requieren acción del editor. Las consultas de resolución son de solo lectura: no crean entidades.

### Solicitudes por operación

| Operación | Endpoint | Solicitudes en el flujo actual | Coste que no debe confundirse |
|---|---|---:|---|
| Cargar países | `GET /api/countries` (catálogo de venues) | Una carga paginada si QueryCache está vencida; la vista usa `staleTime` de 5 min | Catálogo, no por fila. |
| Cargar regiones administrativas | `GET /api/administrative-regions?countryId&limit&offset` | Una consulta por página, solo cuando se abre/solicita el selector; QueryCache de 5 min | No hay resolver batch dedicado por nombre. Las opciones se cargan por catálogo. |
| Resolver artistas al editar | `POST /api/artists/resolve-batch` | 1 por lote de hasta 100 nombres únicos; en edición se agrupan cambios durante 450 ms | Caché de consultas 15 s más resultados/peticiones pendientes compartidos durante la sesión de la tabla. |
| Resolver localidades | `POST /api/localities/inspect-batch` | 1 por lote de hasta 100 identidades únicas | Clave compuesta geográfica; una respuesta indexada por entrada. |
| Resolver recintos | `POST /api/venues/resolve-batch` | 1 por lote de hasta 100 pares localityId/nombre únicos, después de localidad | Una localidad ambigua o nueva impide resolver Venue hasta que se seleccione/cree durante persistencia. |
| Resolver giras | `POST /api/tours/resolve-batch` | 1 por lote de hasta 100 nombres únicos | Mencionado por compatibilidad del editor actual; queda fuera del alcance CON-F12a. |
| Analizar conflictos en preview/confirmación | No se encontró POST batch de análisis desde el frontend | 0 | `POST /api/events/import-batch` realiza el preflight batch en backend al guardar; cada fila también se revalida justo antes de persistir. |
| Persistir eventos | `POST /api/events/import-batch` | 1 por lote frontend de hasta 50 filas, secuencial | Es una llamada de escritura que incluye preflight, transacciones e inserciones backend. Para N filas completamente preparadas son `ceil(N/50)` POST: 2, 10, 20, 40 y 100 para 100, 500, 1.000, 2.000 y 5.000. |
| Consultas al cerrar lote | invalidaciones de Query tras resultados `created` | Puede reconsultar queries activas de eventos, artistas y recintos | Coste pos-escritura dependiente de observers/cache; no está ligado a cada fila. |

La caché de catálogos es TanStack Query (5 min); las consultas de resolución usan QueryCache de 15 s y el coordinador mantiene resultados/solicitudes pendientes durante la instancia de tabla. No hay Pinia para este estado. La edición invalida referencias dependientes y los coordinadores reconstruyen claves/resoluciones; venue se invalida si cambia locality. La resolución batch inicial deduplica filas y asocia respuesta a cada fila mediante referencias locales.

El parser limita el archivo a 2 MiB, no el total de eventos. La API batch actual limita 100 filas, lineup hasta 100 artistas por evento, los campos aplican límites de longitud y Express admite cuerpos de 10 MiB. El frontend persiste autosave local IndexedDB y snapshots inciertos antes del POST. El resultado completado y conflictos se guardan después de recibir la respuesta. Si el usuario cierra la página, no se conserva un proceso activo: queda un borrador y, si había un POST de resultado incierto, su snapshot idempotente para retry explícito.

### Riesgo de escalabilidad del editor

- `EventImportTable.vue` renderiza todas las filas con `v-for`; no hay virtualización ni paginación local.
- `EventsFestivalsImportView.vue` tiene watchers profundos sobre filas/estados para autosave y preparación. `refreshPreparation` valida filas y recompone el snapshot derivado; las ediciones sucesivas pueden repetir trabajo sobre miles de filas.
- El parser busca el primer índice duplicado usando `events.findIndex(...)` dentro de cada duplicado; un archivo con muchos duplicados puede degradar hacia O(n²).
- El estado se distribuye entre filas, lineup, geografía, giras, referencias, conflictos y sesiones. IndexedDB guarda el borrador completo; no existe medición de heap/render en 1.000+ filas.
- No se recomienda virtualizar por anticipado: primero medir interacción y heap con el editor real en 500/1.000 filas. Si supera los límites de aceptación indicados abajo, priorizar virtualización de la tabla y validación/repreparación incremental.

## 2. Auditoría backend: endpoints, consultas SQL y transacciones

### Resolución de solo lectura

| Entidad | Contrato existente | Consultas SQL observadas por llamada batch | Observaciones |
|---|---|---:|---|
| Artist | `POST /api/artists/resolve-batch`, máximo 100 nombres | Una consulta de candidatos por conjunto de claves normalizadas | Respuesta conserva orden/entrada y distingue existente, nueva, ambigua e inválida. No materializa artistas. |
| Locality | `POST /api/localities/inspect-batch`, máximo 100 | Hasta 3: países por IDs únicos, regiones por IDs únicos si presentes, y una búsqueda conjunta de localidades/alias | No consulta individualmente cada entrada. La búsqueda agrupa las claves de nombre, limita por países y aplica el contexto por entrada en memoria. Solo inspecciona. |
| Venue | `POST /api/venues/resolve-batch`, máximo 100 | Una búsqueda conjunta filtrada por localityId y nombre normalizado | La implementación mapea por entrada y señala ambigüedad. Solo inspecciona. |
| AdministrativeRegion | `GET /api/administrative-regions` paginado, límite máximo 100 | Una consulta por página | No existe `resolve-batch` por código/nombre; no hace falta en la edición si se carga catálogo una vez, pero es brecha para el contrato de resolución completo. |
| Tour (fuera de alcance) | `POST /api/tours/resolve-batch`, hasta 100 según el cliente | Batch existente | Se registra solo por ser parte del mismo editor técnico. |

Los resolvers Artist/Locality/Venue sí reducen consultas de inspección frente a loops HTTP/SQL por entidad. La resolución no crea registros. La API `POST /api/localities/resolve` sí puede geocodificar/materializar y no se debe usar para una consulta de inspección.

### Importación y conflictos

`POST /api/events/import-batch` acepta hasta 100 filas; la interfaz limita a 50 para mantener margen. El servicio valida cada fila, busca recibos existentes con una consulta `ANY(uuid[])`, inspecciona artistas en una consulta batch, prepara localidades agrupadas y analiza conflictos conjuntamente. Las inspecciones de Tour hacen consultas individuales por identidad única dentro de `Promise.all`; giras no forman parte del alcance de esta iniciativa.

El análisis inicial de conflictos carga candidatos con una consulta SQL por batch: cruza `events`, `venues` y `event_artists`, filtra por localities y rango de fechas, y por artistas conocidos cuando corresponde. El análisis en memoria compara filas dentro del propio lote con bucles anidados. Con 50 filas es acotado por la API actual; a 100/2.000 necesita caracterización para detectar crecimiento cuadrático. Hay una consulta SQL adicional de conflictos por cada evento que alcanza persistencia, porque `persistRow` vuelve a llamar a `ImportConflictsService.inspect` con una única fila bajo advisory lock de locality. La revalidación es correcta para evitar carreras, pero no es costo batch.

La persistencia se procesa secuencialmente por fila. Para una fila que crea un evento, el flujo incluye una transacción y operaciones de recibo (INSERT/SELECT FOR UPDATE/UPDATE), materialización/revalidación de Locality, lock advisory de localidad, inspección/materialización de cada Artist con lock advisory por identidad, eventual Tour, Venue con lock advisory por identidad, una consulta de revalidación de conflictos, INSERT/UPDATE de Event y escritura de los EventArtist del lineup. Algunas ramas hacen lecturas/creaciones adicionales (por ejemplo localidad/venue nuevos, alias del geocoder, tour nuevo, venue genérico). Por ello no existe un conteo SQL fijo pequeño por evento: el costo es dependiente de estado de catálogo y longitud de lineup, con varias consultas secuenciales por artista y por evento.

El bloqueo advisory sobre localidad serializa importaciones concurrentes de eventos en la misma localidad; es una garantía de carrera deliberada. La operación por fila da atomicidad local a recibo + creación de entidades/evento/lineup; si falla, la transacción revierte. El lote es parcialmente exitoso: resultados `created`, `conflict`, `invalid` o `failed` por fila. El cliente detiene los lotes siguientes ante error de transporte y conserva snapshot incierto para retry; dentro de una respuesta parcial no reenvía automáticamente las filas con conflicto/fallo.

### Índices y restricciones observados

- `events`: índices en `start_date`, `(type,start_date)`, `(venue_id,start_date)` y `(tour_id,start_date)`; checks de fechas y de relación tour/concierto.
- `event_artists`: índice único `(event_id,position)`, índice en `artist_id` e índice parcial `(tour_id,event_id,position)`.
- `venues`: índice único parcial `(locality_id,name_normalized)` para venues físicos, índice único de venue genérico por locality e índices de nombre normalizado y `(type,status)`.
- `localities`: índice único `(administrative_region_id,province_normalized,name_normalized)` y referencia OSM única; AdministrativeRegion tiene unicidad por `(country_id,name_normalized)` y `(country_id,code)`.
- `catalog_import_row_receipts`: unicidad `(editor_id,batch_id,row_id,operation)` y checks de hash, estado y resultado. Event no tiene clave natural única para detectar duplicados; la detección actual es lógica de conflictos + lock por locality.

No se ejecutó `EXPLAIN ANALYZE` ni se revisó la distribución real de eventos/lineups. No se recomienda agregar índices en esta fase: el plan de trabajo incluye benchmark con dataset aislado, capturas `EXPLAIN (ANALYZE, BUFFERS)` y verificación del tamaño/uso de índices antes de proponer migraciones.

### Semántica de integridad actual

La tabla de recibos hace idempotente la identidad editorId + batchId + rowId + operación y hash canónico del payload. El mismo payload devuelve el resultado previo; cambiar el payload manteniendo identidad produce conflicto. El recibo y el evento se confirman dentro de la misma transacción; un proceso interrumpido antes del commit revierte ambos. Una respuesta perdida después del commit se recupera repitiendo el mismo snapshot. Los UUID y el contenido cambian al editar, por lo que se genera nueva revisión/identidad.

Esto protege el retry de una fila, pero no modela un job importador durable: no existen entidades de import job/item, estados consultables ni un worker que recupere el conjunto restante después de reiniciar Heroku.

## 3. Infraestructura observada y límites operativos

Consulta Heroku de solo lectura del 2026-11-04:

- Formación: un `web.1`, tipo Basic, ejecutando `pnpm run start:prod`; no se encontró process type `worker`.
- Add-ons: Heroku Postgres `essential-0` y Scheduler `standard`.
- PostgreSQL: versión 16.14, 1 GB de almacenamiento máximo, 29,9 MB ocupados, límite de 20 conexiones y una conexión en uso en el instante de consulta. La consulta no midió CPU, memoria, latencia o carga de producción.
- Configuración local: el backend instala `express.json` y `urlencoded` con límite 10 MiB; TypeORM `synchronize: false`; Nest aplica throttling global 300 req/min; Procfile solo define `web`.
- Heroku permite 30 s para la primera respuesta HTTP del router. Una operación síncrona larga puede responder H12 aunque el proceso siga trabajando; no se debe esperar a que la petición HTTP abarque una importación completa.
- Scheduler lanza one-off dynos a intervalos definidos; no garantiza ejecución y está documentado para tareas cortas o para encolar trabajos largos. No sustituye a un worker continuo.

La formación Basic ofrece 0,5 GB de RAM según la ficha técnica de Heroku. PostgreSQL essential-0 no ofrece fork/follow ni rollback administrado según `pg:info`; para el job se requieren migraciones compatibles, recuperación lógica de filas y backup previo a cualquier cambio operativo. No se consultaron credenciales ni se inspeccionaron filas de producción.

Fuentes del proveedor: [timeout HTTP de Heroku](https://devcenter.heroku.com/articles/request-timeout), [límites de plataforma](https://devcenter.heroku.com/articles/limits), [tamaños de dyno](https://devcenter.heroku.com/articles/dyno-sizes) y [Scheduler](https://devcenter.heroku.com/articles/scheduler). La disponibilidad/coste de dynos y add-ons debe verificarse de nuevo al aprobar la implementación.

## 4. Comparación de arquitecturas

| Opción | Fiabilidad y recuperación | Complejidad/coste | Ajuste al estado observado |
|---|---|---|---|
| Frontend coordina los POST batch actuales | Conserva borrador en IndexedDB y puede repetir snapshot incierto. Al cerrar la pestaña, perder sesión o reiniciar el dyno, el proceso se para; requiere que el usuario vuelva y reanude. | Menor cambio; sin infraestructura nueva. Muchas rondas HTTP y el usuario debe mantener la sesión activa. | Ya existe, suficiente para importar manualmente mientras la pestaña sigue abierta, pero incumple recuperación autónoma. |
| Trabajo persistente gestionado por backend | Estado, entradas y resultados quedan en PostgreSQL. Worker puede retomar items pendientes tras reinicio; progreso disponible aunque se cierre el navegador. | Requiere tablas/migraciones, endpoints, worker, observabilidad/retención y un dyno worker dedicado. Añade uso de conexiones/almacenamiento; no requiere Redis. | Satisface mejor los requisitos. El dyno worker aún no existe y debe presupuestarse/configurarse. |
| Híbrida: frontend prepara/revisa; backend ejecuta job persistente | La revisión sigue en editor; al confirmar, frontend entrega snapshot. Backend devuelve jobId y ejecuta con checkpoints; frontend consulta progreso y puede cerrarse. Los recibos por fila conservan compatibilidad idempotente. | Cambios en ambos repos, acotados por contrato. Añade un worker y modelo Postgres; no necesita una cola externa. | Recomendada. Divide dominio UI de ejecución larga y permite reanudar sin una conexión HTTP abierta. |

### Recomendación

Implementar la opción híbrida en una fase posterior: conservar parser, normalización, resolución batch y revisión en frontend. Al confirmar, crear un job backend con payload validado y hash, luego devolver `202 Accepted` y `jobId`. Un process type `worker` consulta PostgreSQL mediante lease/claim con `FOR UPDATE SKIP LOCKED`, toma lotes pequeños y procesa cada evento con la transacción/recibo actual. El endpoint de progreso lee el estado guardado. PostgreSQL es suficiente como cola inicial y evita operar Redis. No hacer trabajo largo en una petición HTTP ni usar Scheduler como mecanismo de entrega garantizada.

El primer corte puede usar un único worker con concurrencia 1. Esta limitación evita ampliar la contención en bloqueos advisory y protege el plan PostgreSQL de 20 conexiones. Se revisará el pool TypeORM del worker y web para que su suma quede acotada (propuesta inicial: máximo 4 conexiones para worker, sin exceder el presupuesto total acordado). Si la disponibilidad de un worker dedicado no se aprueba, la alternativa temporal es frontend por lotes con recuperación manual explícita; no debe presentarse como procesamiento durable.

## 5. Contratos propuestos de resolución batch

Se conservan los endpoints adecuados; no añadir endpoints duplicados. Todos los resolvers son solo lectura, aceptan como máximo 100 identidades, deduplican por clave normalizada/contexto, devuelven un resultado por entrada en orden y modelan `existing`, `new`, `ambiguous`, `invalid`. Los fallos HTTP son por batch y los errores funcionales por resultado. Los inputs no llevan UUIDs internos salvo los IDs de contexto necesarios. Ningún endpoint de resolución crea entidades.

| Dominio | Contrato propuesto / decisión |
|---|---|
| Artist | Reutilizar `POST /api/artists/resolve-batch` con `{ names: string[] }` y resultado indexado con `status`, entidad o `candidates[]`. Mantener equivalencia musical del backend como autoridad; no volver a resolver nombres en cliente. |
| Locality | Reutilizar `POST /api/localities/inspect-batch` con `{ localities: [{ name, countryId, administrativeRegionId?, province? }] }`. Identidad de request: país + nombre + región ID + provincia; resultado por entrada incluye coincidencias/ambiguas e indicación de contexto requerido para creación. |
| Venue | Reutilizar `POST /api/venues/resolve-batch` con `{ venues: [{ name, localityId }] }`; clave localityId + nombre normalizado; candidatos ambiguos explícitos. El recinto vacío conserva su flujo de recinto genérico solo en escritura. |
| AdministrativeRegion | Añadir `POST /api/administrative-regions/resolve-batch` si el benchmark confirma valor frente a catálogo completo: `{ regions: [{ countryId, name, code? }] }`; resultados `existing|ambiguous|not_found|invalid`, coincidencia única por país y nombre normalizado/código. El catálogo GET actual sigue siendo aceptable para un catálogo pequeño y cargado una vez. No crear región. |

Concurrencia global de resolución por cliente: 3 requests simultáneas como máximo; chunk de 100 (o menor si payload/perfil lo aconseja); preservar fallos por lote y reintentar solo red/5xx una vez, sin retry de errores de protocolo ni escrituras. Cachear resultados correctos en memoria de sesión/QueryCache durante 15 s como mínimo y compartir promesas en vuelo. Incluir countryId y todos los componentes de identidad en clave. Editar nombre/contexto invalida la entrada anterior de esa fila; un cambio de ciudad invalida localidad, Venue y selecciones dependientes; edición unrelated conserva lo resuelto. La persistencia valida de nuevo IDs, país, contexto y conflictos.

## 6. Persistencia durable, idempotencia y resultados

### Modelo lógico

- `event_import_jobs`: `id`, propietario/editor, país, versión de contrato, hash del snapshot, estado, totales por estado, timestamps, cancelación solicitada y versión.
- `event_import_job_items`: jobId, orden, rowId/operationRowId, payload JSON validado, hash, estado, intentos, `nextAttemptAt`, código/mensaje, resultado JSON/eventId y timestamps. Unicidad `(jobId,rowId)`.
- No copiar campos no soportados del contrato JSON a Event. Procedencia `source`, `url` y `externalId` permanecen fuera del modelo persistido hasta aprobar un contrato de dominio específico.

El POST de creación confirma de una vez el snapshot revisado (hash/version/total) y crea job + items en una transacción acotada. Se comprueba el límite de tamaño en bytes, cantidad total acordada y dueño autenticado. Aceptar la importación es el punto de compromiso: a partir de ahí el backend puede continuar aunque se cierre el editor. No hay creación global atómica de los eventos.

### Worker y transacciones

El worker reclama un conjunto pequeño de items elegibles con lease y `FOR UPDATE SKIP LOCKED`, libera la transacción de claim y ejecuta cada item con su recibo idempotente y una transacción de dominio por evento. Ninguna transacción engloba miles de eventos. Tras completar/recuperar un item, guarda estado/resultado; el lease caducado permite recuperar items tras caída. El diseño debe definir y probar si el item y el recibo pueden actualizarse en una única transacción o si se reconcilian de forma determinista.

Reutilizar reglas actuales: solo resolver referencias confirmadas, aplicar país/contexto, no aceptar un candidate ambiguo sin selección explícita, revalidar conflicto bajo bloqueo de localidad, guardar Event y relaciones EventArtist juntas y usar FK/checks/índice único de posición. La creación de Artist/Locality/Venue/Tour sigue las políticas actuales y ocurre solo dentro del commit de escritura. Los errores de conflictos/validación no crean Event. Un fallo transitorio revierte todos los cambios del item.

### Estados y semántica

| Estado | Significado |
|---|---|
| `queued` | Confirmado, aún no reclamado. |
| `running` | En lease por worker; intento iniciado. |
| `succeeded` | Event y lineup confirmados y resultado guardado. Repetición devuelve el mismo resultado. |
| `failed_retryable` | Error transitorio agotó el intento actual; puede reintentarse con backoff. |
| `failed_final` | Error de validación o interno no recuperable; requiere edición/decisión. |
| `conflict` | Conflicto de datos o identidad que necesita revisión; no se reintenta automáticamente. |
| `skipped` | Usuario excluyó explícitamente una fila antes de procesarla. |
| `cancelled` | No quedan items activos; filas ya completadas se conservan y pendientes pasan a omitidas/canceladas según la acción confirmada. |

Estados terminales del job: `completed` si todos los items terminaron exitosos/omitidos, `partially_completed` si hay éxito junto con errores/conflictos/cancelación, `failed` si no se creó ningún evento y ya no hay trabajo recuperable, `cancelled` si cancelado sin filas exitosas. Cancelar es cooperativo: detiene nuevas claims y termina/rollback de la fila actual. No borra eventos ya confirmados.

Retry explícito solo para `failed_retryable`, reusando identity/hash si el contenido no cambió. `failed_final` o `conflict` requieren corrección/nueva revisión y nueva operaciónRowId; `succeeded` y `skipped` no se reenvían. Un timeout HTTP al crear job se resuelve repitiendo la clave de idempotencia del request y devolviendo el mismo job, nunca creando dos importaciones.

### Progreso, cierre de pestaña y reinicios

`GET /api/event-import-jobs/:jobId` devuelve estado, contadores, porcentaje determinista, `created`, `failedRetryable`, `failedFinal`, `conflicts`, `skipped`, `total`, timestamps y una página acotada de resultados. Añadir endpoints de retry selectivo y cancelación. La API valida propietario/rol; UUID no sustituye autorización.

El frontend puede cerrar la pestaña después de recibir jobId: backend sigue con el worker. Al volver, consulta los jobs del editor y retoma polling con backoff (p.ej. 1–3 s activo, hasta 15 s en reposo; ajustable con métricas). Si se pierde la conexión, el job no cambia; el cliente vuelve a consultar. Si se reinicia web/worker, las filas sin commit siguen reclamables al vencer lease; las filas confirmadas conservan recibo/resultado. Retener jobs/resultados 30 días inicialmente y borrar por tarea controlada después de validar obligaciones de soporte/backup. El borrador sin confirmar continúa local IndexedDB.

## 7. Pruebas, benchmark y métricas

### Banco reproducible

Crear fixtures deterministas 100, 500, 1.000, 2.000 y 5.000 eventos, con dos distribuciones: (A) referencias muy repetidas, (B) artista/localidad/recinto únicos. Añadir mezcla (C) 80 % repetidas + 20 % únicas. Casos de error: ambiguas, inválidas, duplicados dentro del documento, conflictos existentes, conflicto entre filas, error SQL temporal, timeout de proceso después de commit y antes de respuesta, reinicio con items claimed, caída durante transacción, cancelación y retry.

Ejecutar únicamente contra PostgreSQL local desechable con esquema migrado y carga sintética; no mandar cargas a Heroku ni a producción. Instrumentar HTTP con adaptador local/fakes en frontend y contar consultas SQL con logger/interceptor TypeORM de test. No depender de logs globales verbosos de producción. Guardar seed, versión de commit, Node/pnpm, hardware, parámetros y CSV/JSON de resultados.

### Medidas y gates propuestos

| Medida | Umbral inicial de aceptación |
|---|---|
| Requests de resolución con referencias únicas, 100..5.000 | Máximo `ceil(U_artist/100)+ceil(U_locality/100)+ceil(U_venue/100)` más páginas de catálogos; requests de tipos se ejecutan con concurrencia global ≤3. Variantes con repeated refs deben bajar según el número de identidades únicas, no el número de filas. |
| Escritura frontend tras migrar al job | 1 POST crear job + polling acotado; cero POST de persistencia por fila. Resolver y monitor son métricas separadas. |
| Tamaño | Cada POST de lectura ≤100 entradas; job payload limitado por configuración medida (comenzar con máximo 5.000 eventos y bytes ≤10 MiB o menor, nunca aceptar sin límite). |
| Conflictos en batch de 100 | Tiempo y número de SQL registrados; ningún query SQL de conflicto por fila dentro del preflight. Sí se permite revalidación SQL por evento al persistir bajo lock. |
| Carga total de 1.000 eventos | Sin pérdida/duplicidad; todo item tiene un resultado terminal/recuperable y recibo; no hay transacción que abarque más de un evento. Objetivo no es tiempo máximo estricto, pero job completo debe ser medible bajo carga local. |
| Conexiones | Concurrencia worker inicial 1 y pool configurado; pico agregado web+worker ≤10/20 conexiones en ensayo. |
| Memoria | Registrar heap frontend/backend por escala. Gate editor: heap frontend <300 MiB tras resolver 2.000 filas y sin crecimiento sostenido al editar 100 filas; revisar virtualización si excede o interacción p95 >100 ms en equipo de referencia documentado. |
| Recuperación | Simular proceso caído en al menos 3 puntos; resultados finales coinciden exactamente con una ejecución limpia y no duplican Event/EventArtist. Reconciliar respuesta perdida tras commit usando misma identidad. |
| Reintentos | Solo errores clasificados transitorios; máximo de intentos y backoff configurados; conflictos/invalid/skipped nunca se reenvían automáticamente. |
| Errores parciales/cancelación | Conteos y detalle por fila coinciden con fixtures; cancelar no elimina eventos ya confirmados ni permite nuevas claims después de la confirmación de cancelado. |

Además registrar número de queries SQL por fase, filas de conflicto leídas, filas de lineup escritas, query plans para query de conflicto, tiempo p50/p95 de resolución/conflicto/persistencia por fila, duración total job, reintentos, heap y recuperación.

## 8. Roadmap CON-F12

Todas las tareas de abajo son propuestas y requieren aprobación antes de tocar arquitectura. Los archivos mencionados son puntos de partida previstos, no alcance cerrado.

### Backend

| ID | Tarea y repo | Dependencias | Contratos/módulos previstos | Pruebas y aceptación | Riesgos |
|---|---|---|---|---|---|
| CON-F12-BE1 | Medir y optimizar el pipeline de import batch — `riffvalley-app-back` | Aprobación CON-F12a | `catalog/events/import-batch`, `catalog/import/conflicts`, `catalog/import/resolution`, entidades/migraciones actuales | Benchmark SQL repetible 100/500; separar SQL de preflight, revalidación, recibos y escritura; demostrar candidatos de índices con EXPLAIN; no agregar índice sin plan medido. | Datos de producción no disponibles en entorno local; cambios inadvertidos en reglas de colisión. |
| CON-F12-BE2 | Trabajo persistente PostgreSQL — backend | BE1; contrato frontend aprobado | Nuevo módulo de jobs, tablas `event_import_jobs`/`event_import_job_items`, migración, DTOs y endpoints create/status/cancel/retry | Idempotencia de creación job; dueño/roles; límites de bytes/filas; estados/errores parciales; migración reversible compatible; recibos reutilizados. | Retención/PII, compatibilidad de payload y crecimiento de tablas. |
| CON-F12-BE3 | Worker y recuperación — backend | BE2; decisión de proceso Heroku | Nuevo process type `worker`, claim con lease/`SKIP LOCKED`, concurrencia 1 inicial, límites del pool y backoff | Tests de integración PostgreSQL aislado para caída/lease, rollback, retry, cancel y mismo resultado; reinicio sin duplicados; no job largo en request web. | Coste/operación del worker, contención advisory y connection budget. |
| CON-F12-BE4 | Región batch opcional — backend | Benchmark de catálogo en BE1 | Reutilizar GET si catálogo pequeño; solo si hace falta, `administrative-regions.resolve-batch` y DTO/service/controller | Orden, normalización por país, ambiguous/not_found, límites ≤100 y 0 writes; comparar 1 consulta por página vs resolver. | Duplicar semántica de catálogo sin beneficio demostrable. |

### Frontend

| ID | Tarea y repo | Dependencias | Contratos/módulos previstos | Pruebas y aceptación | Riesgos |
|---|---|---|---|---|---|
| CON-F12-FE1 | Conservar resolución/revisión y generar snapshot confirmado — `riffvalley-app-front` | Contrato de job de BE2 | `events-festivals/api`, `application/eventImportPreparation`, `EventsFestivalsImportView.vue` | Snapshot exacto/hash estable, validación previa, identidad de usuario/país; no pierde datos por edición; reutiliza resolvers actuales. | Divergencia entre revisión cliente y validación backend al confirmar. |
| CON-F12-FE2 | Cliente de job/progreso/recovery — frontend | BE2/BE3 | `api` + coordinador de aplicación; persistir jobId, polling, cancel y retry selectivo | Cierre/reapertura y desconexión; permisos; retry solo recuperables; resume por jobId; resultados correlacionados por fila. | Polling excesivo; no duplicar la autoridad de estado del backend. |
| CON-F12-FE3 | Editor para volúmenes grandes basado en métricas — frontend | Banco de FE1/benchmark; no bloquear job | `EventImportTable.vue`, preparer y autosave/session infra | 100–5.000 fixtures; heap e interacción medidos; conservar edición/selección/accesibilidad al virtualizar o paginar si gate excedido. | Virtualización complica navegación, pegado tabular y foco. |
| CON-F12-FE4 | Validación incremental y caché geográfica — frontend | F12-FE3 sólo si perfil indica coste; contratos de resolución aprobados | `useEventImportRows`, `eventImportPreparation`, `scrapedEventJson`, `entityResolutionQueries` | Editar una identidad invalida solo esa referencia y Venue dependiente; parser duplicate detection O(n); fixtures con referencias repetidas/únicas. | Invalidación incompleta puede conservar UUID obsoleto. |

Orden: BE1 y banco común primero; BE2 y FE1 en paralelo tras cerrar contratos; BE3 y FE2 coordinadas; BE4 solo si la medición justifica; FE3/FE4 solo si los límites reproducibles se superan. Mantener PRs y cambios separados entre repositorios.

## 9. Límites de evidencia

- La auditoría describe los checkouts locales, no certifica qué versión está desplegada en Heroku.
- El backend tenía cambios locales sin commit antes de esta auditoría (event import service/DTO/geocoder y prueba, entre otros). Se leyeron como estado de trabajo disponible y no se editaron. Antes de implementar, hay que identificar base/head y revisar esos cambios para atribución fiable.
- El frontend también tenía cambios locales extensos preexistentes; no se modificaron archivos rastreados existentes.
- Las cifras de 500/1.000 solicitudes de resolución proceden de documentación CON-F12 y fixtures con transporte simulado. No hay conteo SQL por escala ni perfiles de heap, duración o fallo para esta auditoría.
- Heroku `pg:info` es una observación puntual. No se consultaron logs, APM, CPU, memoria ni datos de filas; tampoco se ejecutó SQL en la base remota.
- No se ejecutaron tests ni verificaciones visuales. Este documento no propone cambiar aún el código, schema, despliegue ni configuración remota.
