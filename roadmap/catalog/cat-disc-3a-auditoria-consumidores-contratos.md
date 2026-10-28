# CAT-DISC-3a — Auditoría de consumidores y contratos de Discos

**Estado:** auditoría documental completada; CAT-DISC-3b y posteriores no iniciadas.
**Inspección:** 2026-10-28. Backend revisado en el checkout hermano disponible; sin llamadas a base de datos ni migraciones.
**Alcance:** consumidores observables de /api/discs y los seis modos de /disc-list; propuesta de servicio y contratos, sin cambios productivos.

Complementa la [auditoría de la vista](../catalog-discs-audit.md), la [auditoría CAT-DISC-2f de concurrencia/cancelación](../catalog-discs-concurrency-audit.md) y el [roadmap de TopDiscs](../catalog-top-discs.md). Las conclusiones describen código y documentos locales inspeccionados; no acreditan configuración desplegada ni consumidores en producción.

## 1. Resumen ejecutivo

- GET /api/discs es un contrato autenticado compartido. Lo consume /disc-list, pero también otros lectores; no debe declararse obsoleto ni cambiarse como efecto lateral de CAT-DISC-3.
- Consumidores frontend confirmados fuera de /disc-list: Dashboard RandomDiscWidget (búsqueda por lotes mediante getDiscs, distinta de /discs/random) y DiscListError. Los calendarios usan GET /discs/date, no GET /discs.
- El código fuente del sitio WordPress no está disponible. El checkout de bloques editoriales no llama a /api/discs; el backend tiene un publicador de listas hacia WordPress, pero no identifica el origen ni el transporte del artículo mensual indicado. El HTML no prueba qué API lo alimenta.
- all no es una lectura pública genérica: filtra fechas futuras y proyecta userRate, favoriteId y pendingId del usuario autenticado, además de agregados. Su comportamiento y payload deben permanecer estables.
- Los modos personales tienen semánticas y owners Community distintos: Rate, Comment, Favorite y Pending. Catalog puede componer su lectura, pero las reglas de elegibilidad y las escrituras permanecen en sus owners.
- Recomendación: alternativa C, fachada en Catalog que delega lecturas especializadas a métodos acotados de sus owners. Las opciones dinámicas deben reutilizar los mismos predicados de elegibilidad con colaboración del owner que consulta Community; no copiar reglas de TopDiscs.
- Antes de cambiar el transporte frontend debe corregirse la identidad de sesión de all identificada en CAT-DISC-2f. Es un requisito de aislamiento local; no requiere modificar Identity.

## 2. Alcance, método y límites

Se inspeccionaron imports y llamadas Axios frontend, wrappers, vista y pruebas; controller, DTO, DiscsService, DiscCatalogService, entidad/mappers y pruebas backend; endpoints y entidades Community; índices y roadmaps; código de integración/publicación WordPress disponible; y el repositorio local de bloques editoriales.

No se ejecutaron tests, typecheck, build, SQL, migraciones ni peticiones contra APIs. No se comprobó el backend desplegado. La auditoría externa se limita a los checkouts disponibles y a la página indicada. El HTML describe contenido publicado, no prueba su fuente de datos.

## 3. Consumidores

### 3.1 Confirmados en el código disponible

| Clasificación | Ubicación | Endpoint y parámetros observados | Campos/uso | Auth y dependencias | Riesgo |
|---|---|---|---|---|---|
| Frontend principal | src/modules/catalog/discs/application/loadDiscList.ts y src/services/discs/discs.ts | GET /api/discs: limit, offset, query, dateRange, genre, country, countryId (alias duplicado), orderBy, voted, votedType. La página usa 20 resultados. | data y metadata; DiscCard consume datos de disco, agregados y estado personal. | Ruta /disc-list protegida; Axios añade credencial. Backend @Auth() y @GetUser(). | Alto: filtros, orden personal, agregados y datos por usuario. |
| Aplicación interna independiente | src/modules/dashboard/widgets/random-disc/components/RandomDiscWidget.vue | getDiscs (GET /api/discs) para búsqueda/lotes; no usa GET /discs/random. | Selección de discos y paginación por totalItems/data. | Transporte autenticado; wrapper compartido. | Alto si se cambia elegibilidad, orden, total o forma del payload. |
| Consumidor histórico/no confirmado en uso | src/views/discsList/DiscListError.vue | Importa getDiscs con búsqueda/filtros. | Lista para flujo de errores/editorial; reutiliza DiscFilters y DiscCardComponent. | Ruta con restricción de rol; API autenticada. | Medio/alto: depende de firma y response legacy. |
| App interna: ArtistManagement | src/views/artists/ArtistManagement.vue | No llama getDiscs; representa discos mediante DiscCardComponent. | Depende de props/eventos y operaciones de la tarjeta. | API de artista no forma parte de GET /api/discs. | Medio para cambios de la proyección o de DiscCard; bajo para ruta nueva aislada. |
| Catalog: TopDiscs | src/modules/catalog/top-discs/ | No llama GET /api/discs; consulta /api/discs/topDiscs y /options. | Comparte tipo Disc y DiscCard, con contrato/elegibilidad propios. | Endpoints TopDiscs autenticados. | Medio si se cambia type compartido/Card; mantener DiscTopService y filtros propios. |
| Frontend relacionado, ruta diferente | DiscCalendar.vue, DiscCalendarBaby.vue y DiscByDate.vue | getDiscsDated → GET /api/discs/date. | Listados por fecha/calendario. | Endpoint autenticado. | No es consumidor de GET /discs; no migrar aquí. |
| Tests/documentación | tests de servicios, Dashboard y DiscList; roadmaps | Caracterizan URLs, parámetros, mapeos, paginación y lotes. | Evidencia local, no consumo runtime. | Mocks; no prueban despliegue. | Conservar como regresión legacy y añadir contratos nuevos aparte. |

getDiscs es solo una función de un wrapper compartido que también exporta operaciones de fecha, random, opciones, Spotify, escritura y TopDiscs. Cambiar getDiscs no equivale a migrar esos contratos.

Identity no consume GET /api/discs directamente; provee sesión/usuario y guards que condicionan estas llamadas. No se propone modificarlo. DiscCardComponent realiza escrituras Community de Rate/Favorite/Pending y lo comparten Dashboard, TopDiscs y ArtistManagement: la migración solo sustituye lectura de DiscList y conserva esas props/acciones.

### 3.2 WordPress e integraciones

| Clasificación | Evidencia | Estado del contrato | Riesgo |
|---|---|---|---|
| WordPress o bloque personalizado | riffvalley-editorial-blocks contiene bloques Gutenberg y no aparecen llamadas a API de Discs. El backend src/editorial/lists/wordpress/ y WordpressService publican listas/asignaciones vía WordPress REST. | No se confirmó que el artículo de octubre consuma la API de discos ni que su contenido se cargue al leer la página. La integración de escritura backend no prueba el origen de lectura. | Alto si se cambia el legacy y ese consumidor existe; no hay incompatibilidad probada. |
| Integración externa | No se encontró cliente externo de GET /api/discs en los repositorios disponibles. No se revisaron logs, API keys ni config desplegada. | Endpoint, parámetros, auth y campos desconocidos. En el checkout, GET /api/discs sí tiene @Auth(). | Alto por desconocimiento; preservar endpoint y payload. |
| Artículo no confirmado | La página [Discos de metal, rock y hardcore de 2026 – Octubre](https://www.riffvalley.es/articulos/discos-metal-rock-hardcore-2026-octubre) muestra lanzamientos por semana y cifras por semana; no está disponible el código del sitio. | El HTML no permite saber si es contenido estático, renderizado en publicación, bloque o API. No atribuirlo a /api/discs. | Mantener incógnita y verificar código fuente/request autorizado antes de alterar contratos. |

No deducir consumidor HTTP por la presencia de títulos, bandas, banderas o géneros en el HTML. Esos elementos describen el formato editorial.

### 3.3 Endpoints de modos y wrappers

| Wrapper | Endpoint | Otros consumidores locales conocidos | Modo |
|---|---|---|---|
| getDiscs | GET /api/discs | DiscList, Dashboard RandomDiscWidget, DiscListError | all |
| getRatesByUser | GET /api/rates | DiscList y vistas de actividad/votos | rates, covers |
| getCommentsByUser | GET /api/comments | DiscList | comments |
| getFavoritesByUser | GET /api/favorites | DiscList; CRUD Community separado | favorites |
| getPendingsByUser | GET /api/pendings | DiscList; CRUD Community separado | pendientes |

Los endpoints raíz Community también tienen usos más amplios de lectura/escritura; migrar la pantalla no permite retirarlos.

## 4. Contrato legacy GET /api/discs

### 4.1 Controller y autenticación

El prefijo global es /api. DiscsController.findAll recibe DiscsListQueryDto y el usuario mediante @GetUser(); delega a DiscsService.findAll y DiscCatalogService.findAll. @Auth() exige sesión válida y no especifica rol particular. El ValidationPipe global transforma DTO, quita campos desconocidos mediante whitelist y rechaza campos no permitidos.

### 4.2 Parámetros y semántica

DiscsListQueryDto extiende PaginationDto:

- limit positivo, default 10; offset numérico, default 0. No se observó máximo en DTO.
- query: nombre Disc o artist.name_normalized con ILIKE y comodines.
- dateRange: dos fechas transformadas, BETWEEN inclusivo.
- genre: compara con disc.genreId.
- country o countryId: country prevalece; si parece UUID compara ID, si no nombre exacto.
- voted/votedType: filtra la Rate del usuario autenticado; true/false sobre rate por defecto o cover si votedType=cover.
- orderBy: expresiones legacy campo:dirección separadas por coma; se usa una allowlist. Ordenar por disc.averageRate excluye además los discos sin average rate del resultado y total.
- Orden default: releaseDate DESC y artista ASC; las ordenaciones solicitadas no añaden siempre desempate por ID.
- Excluye lanzamientos con releaseDate posterior a hoy.

El frontend manda dateRange como array y ambos aliases de país. Sus sort actuales incluyen releaseDate, rate, cover, promedio y sentinel cliente UNVOTED:rate/cover, que convierte en voted=false y orden reciente antes de HTTP.

### 4.3 Query, payload y errores

DiscCatalogService une Artist/Country/Genre y las filas Rate/Favorite/Pending del userId autenticado; calcula promedio de nota, promedio de portada, votos con nota y commentCount. Hace consulta paginada y total aparte. El mapper extiende Disc y conserva escalares, artist.country, genre, userRate, favoriteId, pendingId, averageRate, averageCover, voteCount y commentCount. Las asociaciones personales unidas explícitamente filtran por el usuario. No incluye comments[] en este listado. La respuesta es { totalItems, totalPages, currentPage, limit, data }.

Disc declara relaciones eager con Artist, Genre y colecciones Community; el listado usa QueryBuilder y mapper. No asumir que comparte forma con GET /discs/:id. El controller propaga excepciones; auth/validación usa Nest y los errores de query mantienen su manejo actual. No se propone cambiar status/mensajes legacy.

**Contrato que permanece estable:** ruta, @Auth, identidad derivada del JWT, parámetros/semánticas, default/metadata, filtros, orden y nulos, exclusión de futuro, campos observables y errores. No marcar GET /api/discs como deprecated globalmente ni cambiarlo al agregar una ruta para DiscList.

### Contract finding

**Current behavior:** endpoint autenticado que devuelve catálogo con estado personal y agregados.

**Problem:** nombre genérico, response personalizado y varios consumidores fuera de /disc-list, incluidos externos no inventariados.

**Impact:** backend + frontend + consumidores no confirmados.

**Options:** mantener; refactor interno sin cambio contractual; o ruta nueva para DiscList.

**Recommendation:** mantener GET /api/discs estable y crear API específica, delegable a lectores existentes.

**Blocks the current task:** No. Sí bloquea retirar o cambiar el contrato legacy sin inventario externo.

## 5. Reglas de los seis modos

Todos los listados raíz llevan @Auth(); usuario sale de @GetUser(), nunca de userId enviado por frontend. Los DTO Community aceptan parámetros comunes, pero los servicios aplican subconjuntos distintos.

| Modo | Elegibilidad/relación de usuario | Filtros y orden | Total, duplicados y transformación |
|---|---|---|---|
| all | Disc con releaseDate <= hoy. Estado personal unido por usuario; no exige participación. | query álbum/artista normalizado, fecha, genre, country; filtro voted; orden allowlist. Default fecha DESC/artista ASC. | Total de discos. Disc con agregados y userRate/favoriteId/pendingId. Los empates no tienen desempate global por ID. |
| rates | Rate del usuario con rate no nulo (type=rate). | Fecha, query, genre, country; orden allowlist de Rates y fallback fecha DESC/artista ASC. | Total de Rate; no se deduplica por Disc. Entidad e índices vistos no prueban UNIQUE usuario-disc. withRate normaliza rate/cover y expone estado de tarjeta. |
| covers | Rate del usuario con cover no nulo (type=cover). | Mismos filtros/orden que rates, incluido fallback fecha DESC/artista ASC. | Total de Rate de portada; misma incertidumbre de unicidad. |
| comments | Comment del usuario; type=comment filtra comentario no nulo (la columna ya es not null). No aplica explícitamente filtro isDeleted. | Fecha, query, genre, country. Acepta orderBy, pero el servicio ordena por fecha DESC/artista ASC. | Total de comentarios. Varios comentarios sobre un disco son filas distintas. Frontend muestra texto, fecha y datos de Disc. |
| favorites | Favorite del usuario. | Fecha, query, genre, country y orden allowlist por fecha, campos de Favorite/Rate o agregados. | Total de Favorite; mapeo añade favoriteId, pendingId, userRate y agregados. No se constató constraint unique en entidad/migration revisada. |
| pendientes | Pending del usuario. | Fecha, query, genre, country; default fecha DESC/artista ASC. | Total de Pending; mapeo añade pendingId, userRate, favoriteId y agregados. No se constató constraint unique en entidad/migration revisada. |

rates/covers filtran por columnas diferentes. comments es lista de comentarios y no de discos únicos. Favorites/Pendings y Rates devuelven objetos distintos que el frontend adapta. No reducir todos los modos a una única regla de elegibilidad.

### 5.1 Community conserva

- Crear, editar y borrar Rate, Comment, Favorite y Pending; ownership y validación de escritura.
- Elegibilidad por participación personal: rate/cover no nulo, Comment del usuario, Favorite o Pending.
- Reglas reales de unicidad/idempotencia y soft-delete. El modo comments actual no excluye isDeleted en la consulta inspeccionada; cambiarlo requiere decisión independiente.
- Identidad personal derivada del principal autenticado y proyecciones propias del dominio.

Catalog puede poseer la composición de lectura de DiscList. Para no duplicar reglas, los módulos Community deben ofrecer métodos de lectura/options acotados bajo sus owners; no exportar servicios completos como atajo sin revisar DI.

## 6. Arquitectura de DiscListService

NestJS del backend usa módulos clásicos, DTOs y servicios; permite subcarpetas cohesivas y loaders concretos, sin imponer CQRS/repositorios abstractos. Propuesta mínima: servicio DiscListService y DTOs propios en responsabilidad list dentro de catalog/discs; controller existente o controller de lista según la decisión de rutas. Servicio significa política de lectura de la página /disc-list, no CRUD, reemplazo de DiscsService, Community ni DiscTopService.

| Alternativa | Complejidad/rendimiento | Ownership y riesgos | Evaluación |
|---|---|---|---|
| A. Nuevo servicio solo para all | Baja. Puede especializar una query, pero beneficio no medido. | Community sigue en endpoints separados; API y opciones siguen fragmentadas. | Posible como corte transitorio, insuficiente para opciones dinámicas por modo y contrato unificado. |
| B. SQL especializado para los seis modos dentro de Catalog | Alta. Potencial de optimizar query/aggregation, sin benchmark. | Catalog replica reglas Rate/Comment/Favorite/Pending, acopla módulos y permisos, alto riesgo de drift. | No recomendada sin evidencia de rendimiento y decisión explícita de trasladar ownership de lecturas. |
| C. Fachada que delega lecturas a los owners | Media. Conserva consultas existentes; options requieren lecturas especializadas por owner. | Catalog controla ruta/contrato/mapeo; Community posee elegibilidad y queries sobre sus entidades. Requiere exports e imports Nest acíclicos. | Recomendada. Evita duplicar reglas y permite una API de pantalla. |

### Recomendación

Elegir C. La fachada de Catalog selecciona el modo, valida el contrato de pantalla y adapta response. Reutiliza DiscCatalogService para all tras caracterizar qué se delega, y métodos de listado/options específicos expuestos por Community para modos personales. Mantener queries y escrituras bajo su owner; cambiar su respuesta pública solo sería una fase separada. La nueva ruta no modifica el handler legacy.

DiscModule ya importa RatesModule. Antes de implementación hay que revisar el grafo real, exports de Rates/Comments/Favorites/Pendings y evitar dependencias circulares o acoplamiento a servicios de escritura. El contrato interno debe ser pequeño y explícito.

## 7. Contrato de listado propuesto

### Ruta y parámetros

Ruta sugerida siguiendo el namespace de Catalog: GET /api/discs/list. No sustituye GET /api/discs. Opciones: GET /api/discs/list/options, registrada antes de rutas dinámicas si comparte controller.

~~~text
GET /api/discs/list
  ?mode=all|rates|covers|comments|favorites|pendientes
  &query=<texto>
  &dateRange[]=YYYY-MM-DD&dateRange[]=YYYY-MM-DD
  &countryId=<uuid>&genreId=<uuid>
  &sort=<clave-semántica>
  &offset=0&limit=20
~~~

- mode enum requerido; desconocido → 400.
- query mantiene búsqueda álbum/artista inicial; equivalencia por owner debe fijarse.
- dateRange: dos fechas calendario inclusivas para paridad; validar rango completo/fecha.
- countryId/genreId UUID evitan alias ambiguos nuevos. El alias country por nombre queda solo en legacy salvo decisión de compatibilidad explícita.
- sort utiliza claves semánticas allowlisted, por ejemplo releaseDateDesc/Asc, myRateDesc/Asc, myCoverDesc/Asc, averageRateDesc/Asc, habilitadas por modo. No enviar expresiones SQL-ish.
- Filtro no votado es distinto de orden: para all, publicar una clave/filtro explícito como eligibility=unvotedRate|unvotedCover, validar y traducir en backend.
- offset entero >=0; limit positivo, default 20 para mantener la carga actual. El máximo necesita aprobación: el endpoint legacy no documenta máximo observado.
- El usuario siempre se obtiene del token mediante @GetUser(); nunca confiar en userId de query.

El legacy usa orderBy con campo:dirección y default backend 10. La ruta nueva no necesita exponer esa gramática; wrapper legacy conserva firma, parámetros y valores.

### Respuesta tipada

~~~json
{
  "totalItems": 87,
  "totalPages": 5,
  "currentPage": 1,
  "limit": 20,
  "offset": 0,
  "data": []
}
~~~

Para DiscCard se requiere: id, name, image, releaseDate, link, ep, debut; artist { name, country { id, name, isoCode } }; genre { id, name, color }; averageRate, averageCover, voteCount, commentCount; userRate { id, rate, cover } o null; favoriteId y pendingId. No se necesitan arrays completos de rates/favorites/pendings/comments ni objetos User. Reflejar nullabilidad real.

comments precisa Comment.id, comment, createdAt y el subconjunto de Disc/Artist/Country/Genre. Se propone item discriminado para comments dentro de data, sin incrustar arrays de comentarios en Disc. Mantener IDs/estado necesarios para que Card continúe votando, editando, alternando Favorite/Pending y abriendo detalle/Spotify; autorización de escritura continúa en Community.

totalItems cuenta la unidad propia del modo: Disc en all, entidad Rate/Comment/Favorite/Pending en vistas personales. Comentarios repetidos de un disco son filas legítimas. No prometer unicidad de Rate/Favorite/Pending hasta comprobar constraint y write behavior.

### Paginación

- Offset + limit; mantener 20 como default de DiscList.
- Orden total y determinista: añadir Disc.id al orden; para filas evento, desempate estable por createdAt/ID de entidad, luego Disc ID según semántica. Definirlo por modo.
- totalPages=ceil(totalItems/limit), currentPage=floor(offset/limit)+1. Página fuera de rango: data vacía y total vigente; cero resultados: totalPages 0.
- Offset no es snapshot: inserciones/borrados entre llamadas pueden desplazar filas. El cliente puede deduplicar por ID de item cuando sea correcto; resetear offset con todo cambio de criterios. No prometer cursor ni snapshot.
- Page y count son queries aparte y pueden diferir bajo mutación concurrente. No añadir transacción serializable por defecto.

## 8. Contrato de opciones dinámicas

Ruta sugerida GET /api/discs/list/options, autenticada y sin contadores:

~~~json
{
  "countries": [{ "id": "uuid", "name": "Norway", "isoCode": "NO" }],
  "genres": [{ "id": "uuid", "name": "Black Metal", "color": "#000000" }]
}
~~~

En entidades reales IDs son strings UUID; Country.isoCode y Genre.color admiten null, por tanto los tipos deben ser string | null. Orden estable por nombre e ID; ningún resultado se representa por arrays vacíos. No fallback silencioso al catálogo global.

### Universo y filtros cruzados

Parámetros de options: mode, query, dateRange, genreId, countryId y eligibility para all. No offset ni limit. Personalización por usuario del token. País omite countryId y respeta género; género omite genreId y respeta país. Ambas dimensiones aplican sobre todo el universo elegible, no la primera página.

- all: discos hasta hoy y mismos filtros/eligibilidad del listado. No usar predicados estadísticos de TopDiscs.
- rates/covers: discos de Rate del usuario con columna rate/cover no nula, respectivamente.
- comments: discos de Comment del usuario según la regla actual; revisar soft-delete como decisión aparte.
- favorites/pendientes: discos asociados a la entidad del usuario.
- Mismo query/periodo/modo/usuario en options y page; aplicar selección propia omitida, sin derivar opciones de data paginada.

Con alternativa C, cada owner Community expone una lectura de opciones o predicado reutilizable sobre sus propios datos. No leer tablas de Community desde Catalog sin decisión de ownership. TopDiscs aporta precedente para forma de respuesta, universo completo y crossfilter, pero sus reglas de elegibilidad son estadísticas y no se copian.

### Consistencia y rendimiento

Options y resultados son solicitudes separadas y pueden observar cambios en tiempos distintos. Tienen identidad de filtros/sesión coincidente; se descartan respuestas obsoletas. Conservar selección si sigue válida; si desaparece, limpiarla coherentemente antes de cargar página nueva. Error vigente 401/403 no se convierte a array vacío. Recalcular con cambio relevante, no por cada página; mantener debounce existente. Medir antes de introducir cache.

## 9. Identity y seguridad

CAT-DISC-2f identificó que useDiscListCoordinator incorpora userId/authSessionGeneration a query identity para modos personales, pero all usa sessionContext=null. GET /api/discs requiere auth y devuelve datos personales. Si la vista sobrevive a cambio/logout, un resultado tardío podría aceptarse. Riesgo local demostrado estáticamente, reproducción no realizada; DiscList usa refs y no la caché privada de Vue Query.

**Precondición de migración frontend:** incluir usuario/generación de sesión también en all; descartar éxito/error tardío y limpiar resultados personales/contadores al logout/cambio de identidad. Caracterizar A→B, logout, renovación/cambio de sesión y 401/403. Se puede hacer sin cambiar Identity si su contrato público vigente basta.

Ambos endpoints nuevos usan @Auth() y @GetUser(); options personales usan mismo principal. No aceptar userId enviado por frontend. Cache de resultados/opciones es privada y debe incluir identidad de sesión o limpiarse en transición. Nunca usar cache compartida/CDN de datos autenticados. 401/403 siguen el manejo HTTP vigente, no retornan lista vacía.

## 10. Concurrencia, cancelación y caché

El coordinador actual usa identidad/generación, deduplica misma página y carga en secuencia. CAT-DISC-2f señala wrappers personales sin AbortSignal; getDiscs lo acepta, pero loadDiscList no lo propaga. AbortSignal sería opcional: el navegador no garantiza cancelar trabajo SQL ya recibido.

1. Conservar guardas de generación aunque se agregue señal opcional.
2. Resultado y options tienen requests/caché independientes, pero comparten criterios y contexto de sesión. Cambiar modo/filtro/sesión invalida ambos; cargar página adicional no exige recalcular options.
3. Cancelar/ignorar solo generaciones obsoletas; no ocultar fallos actuales 401/403/5xx.
4. Validar opciones antes de mantener selección que ya no pertenece al universo.
5. El coordinador puede seguir poseyendo refs/paginación. No introducir TanStack Query automáticamente; reconsiderarlo si hay necesidad de cache, dedupe compartida, retry/invalidation y ownership privado claro.
6. No prometer cancelación SQL backend ni cambiar contrato HTTP por ello.

## 11. Migración

La migración retira dependencias frontend de /disc-list, no endpoints públicos.

1. Aprobar arquitectura/contratos y resolver ownership de consultas Community.
2. Mantener GET /api/discs, /rates, /comments, /favorites y /pendings con DTOs/responses actuales.
3. Implementar nuevo read service/rutas autenticadas, delegando por modo y sin writes.
4. Validar cada modo contra baseline legacy: criterios, filas/IDs, orden, metadata y valores; documentar proyección mínima nueva.
5. Implementar options por modo/usuario y filtros cruzados en conjunto completo.
6. Corregir identidad de sesión all antes de conectar frontend.
7. Adaptar resultado y options por etapas, conservando caracterización, interacciones Card y carga de 20.
8. Retirar únicamente dependencia de /disc-list cuando regresión apruebe. Mantener servicios/wrappers para Dashboard, DiscListError, Community y externos.
9. Retirar endpoint público solo con inventario, periodo de compatibilidad y autorización expresa. Sin fecha en esta auditoría.

## 12. Pruebas futuras y reutilización

Reutilizar: DiscListView.characterization, loadDiscList/useDiscListCoordinator, wrappers de discs/rates/comments/favorites/pendings; backend discs.controller/service, DiscCatalogService helpers y controller/service/module suites Community. TopDiscs options/PostgreSQL sirve como precedente técnico, no como fixture/predicado copiable.

Cobertura propuesta:

- HTTP: rutas, DTO, arrays/fechas, sort allowlist, route order, @Auth, usuario @GetUser y 400/401/403.
- Cada modo: elegibilidad, filtros, búsqueda, orden, offset/limit, count, vacío/final, unidad y duplicados.
- Options: crossfilter, modo, usuario, query/periodo, universo superior a 20, null metadata, arrays vacíos.
- Frontend: sesión A→B/logout/renovación, responses tardías, modo/filtros rápidos, options concurrentes, paginación y cancelación solo si se incorpora.
- Compatibilidad legacy: contratos y consumidores Dashboard/DiscListError/Community sin cambios de wrappers.
- PostgreSQL aislado cuando query compleja lo justifique: Docker local, base dedicada, fixtures sintéticos, comprobar identidad DB/usuario/puerto, synchronize=false y migrationsRun=false, garantías como C-TOP-11. Sin producción ni migraciones en CAT-DISC-3a.

## 13. Riesgos

| Riesgo/clase | Impacto | Evidencia | Mitigación |
|---|---|---|---|
| Consumidores externos — hipótesis | Alto | No hay inventario/logs/config ni fuente WP del sitio. | Preservar legacy; localizar plugins/tema/bundles antes de cambios. |
| WP usa /api/discs — no confirmado | Alto si cierto | HTML semanal; plugin local sin API Disc; publicador backend es de escritura. | No inferir endpoint; confirmar fuente/request autorizada. |
| Cambio de contrato legacy — riesgo de alcance demostrado | Alto | getDiscs compartido por Dashboard y DiscListError; payload personal. | Ruta paralela y regresión de consumidores. |
| Duplicación de lógica Community | Alto | Cuatro servicios aplican reglas y respuestas distintas. | Alternativa C; lectores estrechos bajo owner. |
| Acoplamiento Catalog/Community | Medio/alto | DiscModule ya importa Rates; dependencias de módulos deben verificarse. | Revisar grafo Nest; exports mínimos, sin ciclos. |
| Diferencias de modo | Alto | Reglas de elegibilidad, filtros, orden y unidad difieren. | Matriz y pruebas modo×filtro; preservar semantics. |
| Privacidad de all | Alto | Endpoint autenticado/personalizado; sessionContext ausente en key local (CAT-DISC-2f). | Corregir identidad antes de integrar nueva API. |
| Options distintas de results | Medio/alto, futuro | Hoy países/géneros salen de catálogo global. | Mismos predicados, owner y pruebas sobre conjunto completo. |
| Rendimiento SQL | Medio/alto, no medido aquí | Options universo completo y counts; evidencia histórica en backend, sin nueva medición. | PostgreSQL local aislado y EXPLAIN antes de índices/cache. |
| Offset duplicates/skips | Medio, conocido | Empates no siempre tienen tie-break; datos pueden mutar entre requests. | Orden por ID, dedupe de UI por item, sin promesa snapshot. |
| Totales/duplicados | Medio | Comments legítimamente repite Disc; constraints de unicidad no confirmados. | Total por entidad y revisar migrations/write behavior. |
| TopDiscs | Medio | Mismo dominio Disc, elegibilidad estadística distinta. | Mantener DiscTopService/rutas/predicados separados. |
| Dashboard | Alto | getDiscs confirmado para batches. | No cambiar legacy; regresión dedicada al implementar. |
| Escrituras Community | Alto | Card hace mutaciones Rate/Favorite/Pending. | Migrar solo lecturas; conservar servicios write y permisos. |

## 14. Roadmap propuesto, no iniciado

| ID | Objetivo/aceptación | Dependencias | Verificación | Tamaño/riesgo |
|---|---|---|---|---|
| CAT-DISC-3b — Contrato y ownership Nest | Aprobar C, rutas/DTO, enums, comments discriminado, max limit, total por modo y exports/imports. Sin cambio legacy. | Aprobación 3a. | Revisar DTOs, grafo Nest, contratos y pruebas. | S; riesgo ambigüedad. |
| CAT-DISC-3c — Lectura backend | DiscListService fachada + GET /discs/list; delegación seis modos, filtros y sort determinista; default 20, metadata. Sin escritura ni cambio /discs. | 3b. | Controller/DTO/unit/owner/HTTP contract. | M; riesgo parity y DI. |
| CAT-DISC-3d — Options backend | GET /discs/list/options; opciones de todo universo por modo/periodo/search/session; omitir dimensión propia, sin counts. | 3b y elegibilidad 3c/owners. | Crossfilter unitario; PostgreSQL Docker aislado si justificado. | M; riesgo SQL/carga. |
| CAT-DISC-3e — Sesión e integración resultados | Corregir query identity de all antes de cambiar transporte; seis modos, páginas de 20, sin respuesta obsoleta. | 3c y CAT-DISC-2f; contrato Identity vigente. | Front tests A→B/logout/401/403, orden/paging y modos. | M; riesgo privacidad/concurrencia. |
| CAT-DISC-3f — Options frontend | Desacoplar DiscList del catálogo global; criterios/sesión comunes; conservar selección válida y limpiar inválida. Sin rediseño visual. | 3d, 3e. | Options vacías, tardías, filtros cruzados, periodo y modo. | S–M; riesgo consistencia UX. |
| CAT-DISC-3g — Regresión/limpieza | Retirar dependencias legacy solo de DiscList cuando seguro; conservar wrappers compartidos. | 3c–3f. | DiscList, Card, Dashboard, DiscListError, Community; diff-check. | M; riesgo consumidores transversales. |

Los IDs son propuesta, no aprobación. No incluyen reorganización visual de filtros.

## 15. Decisiones pendientes de aprobación

1. Aprobar alternativa C o pedir alternativa explícita.
2. Confirmar /api/discs/list y /options, controller y orden de rutas.
3. Confirmar formatos de dateRange, countryId/genreId, sort, eligibility y máximo limit.
4. Aprobar response de comments y significado de totalItems; verificar unicidad por entidad antes de prometer Disc único.
5. Acordar exports/ownership de lecturas y options Community.
6. Aprobar en tarea posterior la corrección de identidad de all previa a la integración frontend.
7. Conseguir fuente WP o trazas autorizadas para resolver consumidor del artículo. Mientras tanto, conservar legacy.
8. Aprobar cobertura y, si SQL lo justifica, pruebas PostgreSQL local Docker aisladas; no usar producción.

## 16. Índices y estado

Índices frontend: [roadmap.md](../../roadmap.md) y [registro CAT-DISC](../catalog-discs-audit.md). El índice backend inspeccionado es riffvalley-app-back/roadmap/catalog/README.md. Ese checkout no es raíz de escritura de esta tarea, por lo que no se modificó; al incorporar el trabajo en backend, añadir allí el enlace a este informe y CAT-DISC-3b.

**CAT-DISC-3a completada como análisis/documentación, sujeta a aprobación de la sección 15. No se implementó CAT-DISC-3b ni endpoint alguno.**

## 17. Fuentes inspeccionadas

Frontend: src/modules/catalog/discs/application y presentation; wrappers src/services/discs, rates, comments, favorites, pendings y catalog; src/components/DiscCardComponent.vue y DiscFilters.vue; Dashboard RandomDiscWidget; DiscListError; roadmaps CAT-DISC-1/2f y TopDiscs.

Backend hermano riffvalley-app-back: src/main.ts; catalog/discs controller/service/catalog service/DTO/entity/mapper/module; community rates/comments/favorites/pendings controllers/services/DTO/entities/modules/tests; catalog/discs/top options; migration 1791127430930-AddDiscQueryIndexes; roadmaps catalog, community e integrations. Solo lectura estática.

riffvalley-editorial-blocks: búsqueda de fuentes, sin consumidor de API Disc. Backend Wordpress publisher crea/actualiza contenido WordPress; eso no demuestra cómo se sirve el artículo externo.
