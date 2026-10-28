# CAT-DISC-2f — Auditoría de concurrencia y cancelación

**Estado:** auditoría documental completada; no se implementan recomendaciones.
**Alcance:** página `/disc-list`, servicios HTTP que alimentan sus seis modos y código backend disponible en el checkout hermano `../riffvalley-app-back`.
**Fecha de inspección:** 28 de octubre de 2026.
**Método:** lectura estática de código y documentación. No se ejecutaron pruebas, llamadas HTTP, navegador, benchmarks, migraciones ni consultas a bases de datos. El backend observado es el checkout local disponible; no acredita código desplegado ni comportamiento de producción.

**Actualización CAT-DISC-3e (28 de octubre de 2026):** la brecha local de sesión descrita en esta auditoría quedó corregida en `useDiscListCoordinator`: la identidad y la guarda de sesión cubren los seis modos. Las pruebas diferidas cubren cambio de usuario, logout/login, respuestas y errores tardíos y paginación pendiente. No se añadió `AbortSignal`; la cancelación de transporte sigue siendo una mejora separada.

## 1. Resumen ejecutivo

CAT-DISC-2d evita que resultados, errores y `loading` de una generación obsoleta alteren la lista actual. El coordinador también impide dos cargas simultáneas de la misma página. No aborta solicitudes HTTP: el wrapper `getDiscs` ya permite recibir `AbortSignal`, pero `loadDiscList` no lo pasa; los wrappers de rates, comments, favorites y pendings usados por los modos personales todavía no aceptan señal.

La mejora de menor coste razonable es conservar el coordinador y transmitir un `AbortSignal` opcional a Axios en las cinco rutas de listado. Abortarlo libera trabajo/transferencia en el navegador y puede cerrar el transporte HTTP, pero el código backend observado no propaga la desconexión al handler, TypeORM ni PostgreSQL. Por tanto, no se debe contar como reducción de consultas o CPU de PostgreSQL sin una comprobación específica.

Se identificó una brecha de sesión que merece prioridad antes de cualquier migración a Query: el modo `all` usa `GET /api/discs`, que requiere usuario autenticado y adjunta `userRate`, favoritos y pendientes del usuario. Sin embargo, la identidad de consulta de CAT-DISC-2d incluye contexto de sesión solo en modos personales. Si una transición de cuenta conserva la vista y el estado montados, el coordinador puede aceptar una respuesta de `/discs` de la sesión anterior. El guard de la ruta y el logout suelen redirigir o desmontar la vista; no se reprodujo exposición ni se atribuye una vulnerabilidad, pero la clave actual no prueba aislamiento de sesión para ese endpoint.

No hay evidencia suficiente para introducir TanStack Query ni cancelación PostgreSQL ahora. Se recomienda hacer explícita la sesión en la identidad de todos los endpoints autenticados, pasar señal opcional por coordinador/adaptador/servicios y añadir regresiones deterministas. Medir primero las consultas antes de plantear cambios backend.

## 2. Arquitectura y flujo actual

```text
Interacción (filtros, modo, orden, observer)
        ↓
DiscListView.vue
        ↓
useDiscListCoordinator
  criterios · identidad/generación · páginas · resultados · loading/error
        ↓
loadDiscList
  selección de modo · adaptación de DTO a DiscListResult
        ↓
Servicio de Catalog o Community
        ↓
cliente Axios `api`
  Authorization · renovación 401 · notificación 403
        ↓
NestJS sobre Express
  Controller → Service/QueryBuilder de TypeORM
        ↓
PostgreSQL
```

| Capa | Responsabilidad observada | Cancelación posible y dueño sugerido |
|---|---|---|
| `DiscListView.vue` | Vincula controles al coordinador, invoca `loadNextPage` desde el observer y desconecta los observers al desmontar. | No debería crear señales por evento visual. El coordinador posee el ciclo de vida de la consulta; al desmontar deja de aceptar trabajo y puede abortarlo. |
| `useDiscListCoordinator.ts` | Crea `queryIdentity`, incrementa generación, limpia resultados, deduplica por generación/offset y acepta solo resultado/error vigente. | Crear controlador por generación de consulta; abortar el previo al cambiar identidad/sesión y al disponer el scope. Mantener generación para corrección aunque el abort sea tardío/no efectivo. |
| `loadDiscList.ts` | Despacha uno de los seis modos, llama el wrapper y transforma respuestas. | Aceptar `signal` opcional y transmitirlo al wrapper seleccionado. No capturar ni convertir errores HTTP/cancelación en éxito. |
| Wrappers HTTP | Construyen parámetros y ejecutan `api.get`. | Añadir señal opcional compatible en los cinco wrappers invocados por `loadDiscList`; pasarla en la configuración Axios. |
| Cliente Axios | Inyecta token/sesión; en 401 renueva una vez y reintenta, y en 403 programa aviso si la vista no lo gestionó. | No necesita un interceptor global de aborto. Un `ERR_CANCELED` debe llegar al coordinador; este lo ignora solo si su controlador fue abortado o Axios reporta cancelación. |
| Backend | Controller obtiene usuario y pasa DTO al servicio; servicio compone una consulta de página y otra de total. | Express puede observar cierre/aborto de request/response, pero no existe conexión observada entre esos eventos y la ejecución de handler/TypeORM/driver. PostgreSQL requiere cancelación separada y explícita. |

### 2.1 Modos y endpoints reales

| Modo UI | Servicio | Ruta HTTP efectiva | Parámetro distintivo |
|---|---|---|---|
| Todos (`all`) | `getDiscs` | `GET /api/discs` | Filtros y orden; puede añadir `voted`/`votedType`. |
| Mis votos (`rates`) | `getRatesByUser` | `GET /api/rates` | `type=rate`. |
| Mis portadas (`covers`) | `getRatesByUser` | `GET /api/rates` | `type=cover`. |
| Mis comentarios (`comments`) | `getCommentsByUser` | `GET /api/comments` | El wrapper envía `type=comment`. |
| Favoritos (`favorites`) | `getFavoritesByUser` | `GET /api/favorites` | Filtros comunes; el wrapper admite también type/orden. |
| Pendientes (`pendientes`) | `getPendingsByUser` | `GET /api/pendings` | Filtros comunes; sin orden enviado por este wrapper. |

Los cinco endpoints de lista llevan `@Auth()` en sus controllers backend. La lista `all` no es anónima y su carga incluye datos asociados al usuario actual.

## 3. Hallazgos frontend

### 3.1 Concurrencia, paginación y observer

- El coordinador cambia generación ante cambios de `queryIdentity`, borra resultados/contadores, reinicia `offset` y lanza la primera página. Compara generación e identidad antes de aplicar éxito, error o limpiar `loading`; una respuesta vieja no añade datos ni reemplaza el error activo.
- `inFlightPages` deduplica la misma combinación generación/offset. `loadNextPage` además comprueba `loading`, `hasMore` y error. La carga de páginas es secuencial; el sentinel puede permanecer visible y provocar cargas sucesivas mientras haya espacio por llenar, pero no se observa una segunda carga simultánea de la página actual.
- El observer se desconecta en `onUnmounted`; el coordinador incrementa generación y marca el scope como disposed con `onScopeDispose`. Eso protege el estado y los efectos de la vista, no detiene Axios ni el trabajo remoto.
- No hay caché de resultados de Discos ni coalescencia entre visitas posteriores a una misma identidad. Volver a un filtro/mode vuelve a pedir página 0. La paginación incremental usa `limit=20`, `offset` y `totalItems`; no tiene carga inversa ni cursor estable.
- Un fallo vigente se guarda en `error` y se registra en consola; `loadNextPage` no reintenta mientras exista error y la vista no ofrece una acción de retry. Los fallos obsoletos se descartan. Agregar cancelación requiere no convertir un aborto esperado en error visible/bloqueante, pero conservar errores HTTP reales, incluido 401/403.
- `getDiscs` tiene un `AbortSignal?` opcional final y ya lo envía a Axios. No se invoca con señal desde `loadDiscList`. Los wrappers `getRatesByUser`, `getCommentsByUser`, `getFavoritesByUser` y `getPendingsByUser` no reciben señal. En todos, añadir un argumento opcional final conserva las llamadas existentes; para evitar extender más las firmas posicionales, una opción `{ signal?: AbortSignal }` añadida al final también sería compatible.

La cancelación esperada debe clasificarse en el coordinador, no mediante un interceptor que silencie errores globalmente. Axios cancela con código `ERR_CANCELED`; se puede comprobar con `axios.isCancel(error)` o contra `signal.aborted`. El catch debe ignorar solo la cancelación de la generación abortada; los errores HTTP/red no cancelados siguen al camino de error existente. El interceptor actual rechaza errores Axios que no sean 401/403 sin manejarlos como éxito.

### 3.2 Qué solicitudes tendría sentido abortar

Un controlador del coordinador debería cubrir la consulta de una identidad y sus páginas activas. Si cambia filtro, modo, orden, usuario/generación de Auth, se hace logout o se desmonta la vista, se aborta ese controlador y se crea otro solo si la identidad actual puede consultar. La página siguiente comparte el mismo contexto de señal; no se deben crear controladores separados que sobrevivan al cambio de identidad.

El abort del navegador puede detener el envío/lectura restante y cerrar la conexión o stream HTTP según el momento. Si el servidor ya recibió la consulta, no hay garantía de que el navegador logre detener el handler o la query. Tampoco se debe abortar una consulta nueva con señal vieja al volver rápidamente a una identidad igual: generación distinta y controlador por generación evitan esa mezcla.

### 3.3 Sesión, logout y datos privados

En el estado auditado por CAT-DISC-2f, los modos personales incorporaban `authenticated`, `userId` y `authSessionGeneration` en `sessionContext`. CAT-DISC-3e extendió esa misma fuente de Identity a los seis modos, incluido `all`, sin duplicar estado de autenticación. El store Auth incrementa generación al limpiar sesión y al restaurar/renovar un perfil; logout limpia estado local antes de intentar revocación remota. El cliente Axios añade el token vigente al despachar; sus 401 renuevan sesión de forma deduplicada y un 403 no renueva ni cierra sesión.

La excepción era `all`: en el código auditado, la clave usaba `sessionContext=null` aunque `GET /discs` tiene `@Auth()` y consulta datos personales. CAT-DISC-3e corrigió la identidad y añadió guardia para no emitir solicitudes si no existe usuario autenticado. Cada cambio de sesión dispara la invalidación de generación y estado del watcher; las guardas existentes hacen que resultados, errores y `finally` tardíos sean inocuos, incluidas páginas pendientes. Las pruebas controladas reproducen estas transiciones; no se clasifica como exposición de datos backend.

La corrección de identidad propuesta quedó aplicada en CAT-DISC-3e. Una petición de una sesión anterior todavía puede continuar en transporte y acabar en 401/403, pero su generación ya no es vigente y no altera el estado local; los errores HTTP vigentes se conservan. Query añadiría requisitos equivalentes de query keys/limpieza, pero no se introduce en esta tarea y la limpieza de `QueryClient` no administra las refs locales de DiscList.

## 4. Auditoría de backend y PostgreSQL

### 4.1 Controllers, servicios y SQL observado

| Ruta | Controller → servicio | Consulta de página | Filtros y ordenación | Total/auth |
|---|---|---|---|---|
| `GET /api/discs` | `DiscsController.findAll` → `DiscsService.findAll` → `DiscCatalogService.findAll` | QueryBuilder sobre `disc`, joins a artista/país/género y relaciones del usuario; subselects correlacionados de AVG/COUNT para rates y comentarios; `getRawAndEntities()`. | Texto con `ILIKE` en disco/artista; género, país, rango de releaseDate y voted; allowlist de campos de orden. `take(limit).skip(offset)`. | Ejecuta después `totalItemsQueryBuilder.getCount()` con filtros equivalentes; requiere Auth y lee userId de la sesión. |
| `GET /api/rates` (`type=rate|cover`) | `RatesController.findAll` → `RatesService.findAllByUser` | Rate con joins a disco/artista/género/país; joins de favorite/pending del mismo user; subselects correlacionados para medias y contadores; `getRawAndEntities()`. | Rate propio, fecha disco, texto `ILIKE`, género/país; `parseOrdersRaw` con allowlist. `take/skip`. | Query de count separada y posterior; userId de Auth y tipo limita rate/cover. |
| `GET /api/comments` | `CommentsController.findAll` → `CommentsService.findAllByUser` | Comment con joins a disco/artista/género; `getMany()`. | Tipo comment, fecha, texto `ILIKE`, género/país; orden releaseDate DESC, artist.name ASC; `take/skip`. | Count separada; `@Auth()` y filtro `comment.userId`. |
| `GET /api/favorites` | `FavoritesController.findAll` → `FavoritesService.findAllByUser` | Favorite con joins disco/artista/género/país y rate/pending del usuario; subselects de medias y contadores; `getRawAndEntities()`. | Fecha, texto `ILIKE`, género/país; allowlist de orden; `take/skip`. | Count separada posterior; `favorite.userId` y Auth. |
| `GET /api/pendings` | `PendingsController.findAll` → `PendingsService.findAllByUser` | Pending con joins disco/artista/género/país, rate y favorite; subselects de medias/contadores; `getRawAndEntities()`. | Fecha, texto `ILIKE`, género/país; releaseDate DESC, artist.name ASC; `take/skip`. | Count separada posterior; `pending.userId` y Auth. |

Los modos rates y covers comparten ruta/consulta y se distinguen por el parámetro type. No hay evidencia en estos métodos de una consulta SQL por cada tarjeta en un bucle (N+1 de roundtrips); sí hay subconsultas correlacionadas COUNT/AVG incluidas en las consultas de página y joins que pueden tener coste significativo. `getRawAndEntities` más mapeo de filas es trabajo adicional del proceso Node. `all`, rates, comments, favorites y pendings ejecutan page y count como operaciones separadas; no se observa transacción de lectura que garantice snapshot común entre ambas. Una mutación concurrente puede hacer que `totalItems` y esa página reflejen instantes distintos.

La ordenación no usa cursor. En código hay orden por `disc.releaseDate` y `artist.name` para el orden predeterminado de `all` y para comentarios/favoritos/pendientes; ese par no es único. En rates/favorites se aplica allowlist y fallback por esas columnas, pero un `orderBy` puede terminar en un campo no único. Sin desempate estable por ID, filas iguales pueden cambiar de posición entre requests y generar duplicados o saltos al usar offset, sobre todo si también se insertan/actualizan registros. No se declara que haya ocurrido en producción. La precisión de `releaseDate` es `date`, así que ties son posibles.

### 4.2 Índices y coste: límites de la evidencia

El checkout backend contiene la migración `AddDiscQueryIndexes` con índices `rate(discId)`, `comment(discId)`, `rate(userId,discId)`, `favorite(userId,discId)` y `pending(userId,discId)`. El repositorio frontend no puede confirmar que esas migraciones estén aplicadas a una base concreta. Las entidades de Disc/Rate/Comment/Favorite/Pending revisadas no declaran índices de ordenación de esta lista. Existe un índice trigram sobre `artist.name_normalized`, pero las consultas observadas hacen `ILIKE '%texto%'` sobre `disc.name` y `artist.name`; no se puede inferir que ese índice aplique a esas expresiones.

No se inspeccionaron `EXPLAIN (ANALYZE, BUFFERS)`, cardinalidad, planes, datos representativos ni configuración de PostgreSQL. No proponer nuevos índices o reescritura hasta benchmark en una base local aislada. La cancelación efectiva podría liberar capacidad si una query larga es realmente cancelada, pero emitir la solicitud de cancelación también tiene coste y la query puede terminar antes de llegar el cancel.

### 4.3 Desconexión HTTP no es cancelación SQL

Separar cuatro niveles:

1. **Abort en navegador:** Axios detiene la operación del cliente y rechaza la promesa como cancelada.
2. **Cierre/desconexión HTTP:** Express puede observar eventos de cierre/aborto en request/response. El handler puede haber recibido ya toda la petición.
3. **Fin del handler NestJS:** no sucede automáticamente por cerrar el socket. En los controllers/servicios inspeccionados no se pasa `Request`/`AbortSignal`, ni hay listener que interrumpa el trabajo o evite que el servicio continúe tras desconexión.
4. **Cancelación de SQL PostgreSQL:** PostgreSQL admite cancel request y el `pg` instalado implementa una ruta `Client.cancel(client, query)`. TypeORM 0.3 usa `PostgresQueryRunner` y su método `query()` observado no recibe señal ni expone un método público de cancelación conectado al controller. El handler Nest/TypeORM actual no puede convertir el cierre HTTP en cancelación del query solo con un `AbortSignal` de Axios.

Una solución backend real requeriría propagar cancelación desde request lifecycle y conectar cuidadosamente la query activa/QueryRunner al mecanismo del driver; también manejar errores de cancelación, queries ya terminadas, liberación segura de conexiones y cancelación de page/count si están en curso. No equivale a abortar el fetch ni a terminar la respuesta HTTP. No está recomendada sin evidencia de queries largas y un prototipo medido.

## 5. Duplicación, reintentos y caché

- Duplicación simultánea de la misma página queda acotada en el coordinador actual; no hay cache/coalescing por identidad después de que termina la solicitud.
- Observer y llamada de `checkIfNeedsMore` coinciden con la protección `loading`; al terminar puede solicitar el siguiente bloque si el sentinel sigue visible. Eso puede crear una secuencia de páginas intencional hasta llenar viewport, no duplicar la página activa.
- El coordinador no reintenta automáticamente y bloquea nuevas páginas tras un error. TanStack Query reintenta por defecto según configuración si no se cambia política; para estas consultas privadas habría que fijar retry/staleTime/refetch y evitar retries para cancelación/401/403.
- Las mutaciones que cambian rate, favorite o pending pueden afectar datos ya mostrados en esta lista. El estado local de tarjeta actualiza algunos campos, pero no existe invalidación compartida de listado. Query requeriría diseñar invalidaciones para rates/covers/favorites/pendings/comments/all o aceptar refetch por stale time; esa complejidad no tiene beneficio probado hoy.
- No existe caché de respuestas privadas de DiscList que pueda reaparecer tras logout. Migrarla a Query crea esa posibilidad y debe incluir userId + `authSessionGeneration` en keys, cancelación y limpieza en el observer privado existente.

## 6. Comparación de alternativas

Valoración cualitativa desde el código inspeccionado: **alto/medio/bajo** indica efecto o coste relativo. La reducción backend se refiere al trabajo SQL realmente evitado, no a cerrar el cliente.

| Alternativa | Corrección funcional | Menos tráfico HTTP | Menos trabajo backend/PG | Complejidad / regresión | Compatibilidad | Testabilidad / mantenimiento | Coste |
|---|---|---|---|---|---|---|---|
| **A. Mantener coordinación actual** | Alta para obsolescencia; falta identidad de sesión en `all`. | Ninguna. | Ninguna. | Baja; conserva código actual. | Total. | Las generaciones ya se prueban con promesas diferidas; buen mantenimiento incremental. | XS. |
| **B. Añadir AbortSignal frontend** | Alta si se conserva generation guard y cancelación esperada no tapa errores reales; también resuelve la brecha de sesión si la identidad se amplía. | Media: reduce respuestas/carga de red cliente en requests que aún transferían datos. No siempre evita request ya enviado. | Incierta/baja con backend actual; no asumir ahorro SQL. | Baja-media: controlador, propagación en cinco wrappers y tratamiento de cancelación. | Alta con parámetro opcional final y Axios existente. | Alta con pruebas de signal, aborto y errores HTTP. | S–M. |
| **C. Introducir TanStack Query** | Potencialmente alta; deduplica por query key, cancellation, retry y `useInfiniteQuery`, con configuración correcta de sesión/errores. | Media por cancelación/dedup; caching puede bajar repeticiones. | Incierta: sigue usando mismo SQL; cache evita solo requests repetidas. | Alta por doble coordinación si se combina; invalidaciones tras mutaciones y limpieza privada. | Media; la app ya usa Vue Query, pero DiscList local no. | Buenas herramientas de prueba, más políticas que mantener. | M–L. |
| **D. Cancelación backend** | Puede terminar trabajo vigente tras desconexión si cubre lifecycle y SQL activo. | No reduce requests que ya llegaron al servidor; reduce respuesta/ocupación solo si abort efectivo. | Potencial alto para query larga cancelada; no medido y puede ser nulo si termina antes. | Muy alta: Express/Nest lifecycle, QueryRunner/driver, errores y pool. Riesgo regresión de disponibilidad. | Baja-media; requiere cambio interno de backend, sin cambiar necesariamente contrato HTTP. | Requiere integración PostgreSQL reproducible; difícil aislar races. | L–XL. |
| **E. Selección recomendada** | Mantener generaciones; completar identidad de sesión para `all`; señal opcional desde coordinador a Axios; probar contratos/session/paginación. | Beneficio cliente medible; no prometer ahorro de red si abort ocurre tarde. | Sin ahorro atribuido al backend hasta medir/probar cancel SQL. | Baja-media, incremental y sin segunda fuente de datos. | Alta; servicios opcionales y sin cambio HTTP. | Alta; pruebas focalizadas y revisión de consumidores compartidos. | M total en pasos S + M. |

### TanStack Query: decisión

**Opción A (mantener coordinador + señal) es preferible como siguiente paso.** La app ya usa Vue Query y su API demuestra patrón real de pasar `AbortSignal`; eso reduce incertidumbre técnica. Pero Discos ya tiene coordinador correcto, dedupe de páginas, generación y paginación que funciona sin cache. Integrar Query y mantener coordinador (opción B) duplicaría generación/loading/error/cache ownership. Sustituir parte de coordinación (opción C) puede ser razonable si se requiere cache compartida, coalescing entre pantallas, invalidación uniforme o retries explícitos; hoy no se observa esa necesidad y hay que resolver mutaciones de tarjeta y aislamiento privado primero.

## 7. Recomendación incremental

1. **Completado en CAT-DISC-3e:** extender `queryIdentity` con autenticación, userId y generación de sesión en `all` y los otros cinco modos; añadir regresiones de cambio de usuario/logout con solicitudes pendientes.
2. **Recomendable:** añadir `AbortSignal` opcional en `loadDiscList` y los cinco wrappers de lista (`getDiscs` ya lo admite), y crear/abortar controladores por generación en el coordinador. Abort por cambio de query/sesión y dispose. Conservar checks de generación aunque AbortSignal esté presente.
3. **Recomendable como parte del mismo cambio:** clasificar solo cancelaciones iniciadas/esperadas; que cancelación vieja no modifique error/loading y que 401/403/5xx vigentes sigan rechazándose normalmente. No intervenir el interceptor global.
4. **Opcional, condicionado a necesidades de producto:** Query para cache/deduplicación entre componentes, stale/refetch e invalidaciones; tratarlo como reemplazo de ownership de datos remotos, no como capa añadida encima del coordinador.
5. **No priorizar ahora:** cancelación SQL backend. Primero medir query duration/planes y mostrar que consultas obsoletas consumen recursos relevantes; después prototipo local de cierre HTTP → abort SQL y comparar carga/cancelaciones efectivas.

## 8. Roadmap de cancelación propuesto (sin iniciar)

Los IDs `CAT-DISC-CON-*` son propuesta; confirmar colisión y ubicación definitiva al aprobar el trabajo. Nada de esta tabla se marca iniciado/completado.

| ID propuesto | Alcance | Dependencias | Riesgos | Pruebas / aceptación | Tamaño |
|---|---|---|---|---|---|
| CAT-DISC-CON-1 | Aceptar señal opcional en `loadDiscList` y transmitirla a `getDiscs`, rates, comments, favorites y pendings; no cambiar parámetros/endpoints ni consumidores no relacionados. | Aprobación de Opción E; inventario de consumidores de los wrappers. | Firmas posicionales; no filtrar cancelación como éxito; consumidores que cambian parámetros. | Tests wrapper confirman `signal` en Axios y llamadas antiguas siguen idénticas; solo cancelación esperada se clasifica como cancelación. | S |
| CAT-DISC-CON-2 | Coordinador crea controlador por generación; aborta al cambiar criterio/modo/sesión y dispose. Conserva guardas de identidad/generación ya activas. | CON-1; revisar con Owner Identity solo la lectura pública de estado ya usada. | Errores/loading atascados, carrera señal vieja/nueva, cambios de modo durante logout. | Pruebas diferidas para filtro/modo/usuario/logout/unmount, cancel vieja, respuesta/error obsoleto; 401/403 vigentes siguen error. | M |
| CAT-DISC-CON-3 | Regresión de dedupe, observer, páginas sucesivas, fallos y sesión para seis modos; documentar política de retry (actualmente ninguna). | CON-2. | Exceso de escenarios combinatorios; errores de fixture que no reflejan señal de Axios. | Mismo modo/offset solo una petición en vuelo; transición no mezcla páginas; observer no duplica; página cancelada no bloquea siguiente; progreso secuencial y `hasMore` conservados. | M |
| CAT-DISC-CON-4 | Benchmark aislado PostgreSQL local Docker de endpoints/modos y candidatos de cancelación, sin tocar SQL productivo. Implementar backend solo en fase aparte si el benchmark justifica prototipo. | Métricas objetivo acordadas; fixture/dataset reproducible. | Datos no representativos y medir duración del cancel como ahorro. | Script describe imagen/versión, dataset y semilla, warmup, concurrencia, filtros, p50/p95, `EXPLAIN (ANALYZE, BUFFERS)`; evidencia que request desconectado cancela SQL antes de considerar cambio. | M para benchmark; L/XL aparte para implementación |

## 9. Riesgos y límites

- **Privacidad local de `all` (resuelto en CAT-DISC-3e):** la identidad incluye sesión y las pruebas diferidas descartan estado de sesiones anteriores. No se añadió cancelación de transporte.
- **Aborto confundido con error:** puede mostrar error o bloquear retry si `ERR_CANCELED` se guarda en el estado activo. Solo omitir la cancelación correspondiente a una generación abortada.
- **Promesa de ahorro PostgreSQL:** falsa con la implementación actual; no existe puente de desconexión a TypeORM/pg cancel. Medir antes de invertir en ello.
- **Paging offset:** orden parcial y mutaciones entre páginas pueden producir filas repetidas/omitidas; no está relacionado con AbortSignal. Requiere criterio de desempate o snapshot/cursor solo tras caracterización y decisión de contrato.
- **Count y página incoherentes:** consultas separadas y sin snapshot común; filtro dinámico/mutaciones concurrentes pueden cambiar el total. La interfaz actual se apoya en `totalItems` para hasMore.
- **Consultas potencialmente costosas:** búsquedas substring, subqueries correlacionadas y operaciones count; falta benchmark representativo. No atribuir causa a falta de índices sin planes de PostgreSQL.
- **401/403:** se mantienen como errores reales del transporte. Cancelar puede evitar solicitudes futuras pero no cambia autorización backend ni el resultado de una solicitud ya recibida.

## 10. Decisiones pendientes

1. La corrección de identidad de sesión quedó completada en CAT-DISC-3e; no se inicia aquí CAT-DISC-3f.
2. Elegir forma API para la señal (parámetro opcional final versus objeto de opciones al final); ambas preservan llamadas existentes.
3. Aprobar primero CON-1–3 como cambio frontend o pedir medición de volumen/cancelación antes de implementarlos.
4. Definir umbral de rendimiento que justificaría benchmarking y prototipo backend; no hay mediciones disponibles en esta auditoría.
5. Si se plantea Query, decidir política de stale time, retries y invalidaciones para acciones de tarjeta y ownership único del server state.
6. No se decide ni aprueba cambios de SQL, índices, endpoints, backend, Identity, Community o migración a TanStack Query.

## 11. Evidencia consultada

Frontend:

- `src/modules/catalog/discs/application/useDiscListCoordinator.ts`, `loadDiscList.ts` y tests asociados.
- `src/modules/catalog/discs/presentation/views/DiscListView.vue`.
- `src/services/api/api.ts`; servicios `discs`, `rates`, `comments`, `favorites`, `pendings`, `catalog`.
- `src/app/privateQueryCache.ts`, `src/app/queryClient.ts`, API y composables de Activity como precedentes locales de `AbortSignal` con TanStack Query.
- `src/modules/identity/auth/stores/auth.ts`, `src/router/index.ts`, `src/App.vue` y `docs/frontend/modules/identity.md` para sesión, logout y ruta protegida.

Backend checkout hermano:

- `src/main.ts` (NestJS Express adapter), `src/catalog/discs/discs.controller.ts`, `src/catalog/discs/discs.service.ts`, `src/catalog/discs/catalog/disc-catalog.service.ts` y DTOs de lista.
- Controllers/servicios/DTO de `src/community/rates`, `comments`, `favorites`, `pendings` y `common`.
- Entidades de Disc y Community y migraciones `AddDiscQueryIndexes` y del índice trigram de artista.
- Dependencias locales declaradas `typeorm ^0.3.20`, `pg ^8.12.0`, `@nestjs/platform-express ^10.0.0`; el driver instalado contiene `Client.cancel`, pero TypeORM QueryRunner/servicios/controller observados no lo conectan con el cierre HTTP.

No se inspeccionó base de datos en ejecución, configuración desplegada, logs, métricas, CI ni producción. La auditoría no altera estados de tareas backend.
