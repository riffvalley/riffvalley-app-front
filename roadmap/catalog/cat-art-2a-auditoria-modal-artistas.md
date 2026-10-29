# CAT-ART-2a — Auditoría del modal de artistas

**Estado: completada documentalmente el 2026-10-29.** No se modificaron código, tests ni contratos; no se consultó Spotify ni Last.fm, no se accedió a producción y no se ejecutaron pruebas de aplicación. El análisis describe el frontend local y contratos de backend ya documentados en CAT-ART-1 y D-ART-7/7d; no se inspeccionó en esta tarea el checkout backend ni el comportamiento de un servicio desplegado.

Esta auditoría prepara la navegación A–Z y una ficha común de artista. No inicia CAT-ART-2b, 2c ni 2d.

## Hallazgos principales

- El modal reutilizable es [DashboardFavoriteArtistModal.vue](../../src/modules/dashboard/widgets/artists/components/DashboardFavoriteArtistModal.vue), no el legacy [ArtistDetail.vue](../../src/components/ArtistDetail.vue). El primero recibe un artista del catálogo por ID y muestra datos Rates, Last.fm y discos valorados; el segundo resuelve un álbum en Spotify a partir de nombres y no es una ficha de Catalog.
- La lógica remota de Favoritos ya está aislada en [useFavoriteArtistDetails.ts](../../src/modules/dashboard/widgets/artists/composables/useFavoriteArtistDetails.ts), con adaptadores y DTOs en [rates.ts](../../src/services/rates/rates.ts). Es la base a reutilizar, conservando el ranking y su interacción.
- La ficha no es aún una vista general de discografía: `GET /rates/artists/:artistId/summary` devuelve las valoraciones personales del usuario, paginadas por actividad. La sección actual se titula «Discos valorados» y el vacío significa que todavía no hay valoraciones.
- Los discos similares que llegan desde Last.fm incluyen un ID de Catalog nullable en el contrato, pero el modal actual expande tarjetas de discos y no abre otra ficha. El ID debe ser la única llave de navegación interna; el nombre Last.fm no prueba identidad.
- El contrato de `/discs` del frontend no admite `artistId`; `query` es búsqueda textual y no sirve para atribuir discos por artista. El endpoint por ID `GET /artists/:id/details` está inventariado en CAT-ART-1, pero no tiene adaptador frontend ni aquí se revalidó que su payload ofrezca toda la discografía con los campos y orden requeridos.
- El directorio `/artists` colisiona con la ruta actual de gestión, que requiere rol `riffvalley`. Antes de integrarlo hay que decidir dónde queda la gestión y cuál es el permiso del directorio.

## Flujo actual de Favoritos

### Vista, selección y contratos

[DashboardFavoriteArtistsWidget.vue](../../src/modules/dashboard/widgets/artists/components/DashboardFavoriteArtistsWidget.vue) consulta `getRatesTopArtists(signal, period)` al montar, cambiar de sesión o período. El selector ofrece `month`, `year` y `all`; renderiza las siete filas recibidas y guarda la selección localmente. Al seleccionar una tarjeta, pasa el `RatesTopArtistDto` (`id`, `name`, `image`, `ratingCount`, `averageRate`) al modal. No consulta detalle hasta abrirlo.

El modal recibe `artist: RatesTopArtistDto` y emite `close`. `useFavoriteArtistDetails` carga en paralelo el resumen personal y Last.fm cuando el modal se monta; el resumen inicial usa `{ page: 1, limit: 100 }`. «Cargar más discos» pide la página siguiente bajo demanda, conserva el orden recibido y deduplica por ID. Al cambiar el artista o la sesión, cancela e invalida las peticiones anteriores y limpia el estado.

Servicios frontend y rutas observadas:

| Operación | Endpoint | Datos/uso | Permiso conocido |
|---|---|---|---|
| Ranking | `GET /rates/artists/top?period=...` | Hasta siete artistas con ID, nombre, imagen y agregados de valoración. | D-ART-7c documenta endpoints Rates autenticados; Dashboard requiere sesión. |
| Resumen Rates | `GET /rates/artists/:artistId/summary?page=1&limit=100` | Artista/país/géneros, estadísticas personales y discos valorados del usuario autenticado. | Autenticado; respuesta privada, ligada al usuario. |
| Last.fm | `GET /rates/artists/:artistId/lastfm` | Datos externos normalizados y similares, más IDs/discos de Catalog relacionados según el contrato D-ART-7d. | Autenticado según D-ART-7c. |
| Detalle de disco | Sin endpoint de Catalog desde el modal | `DiscDetail.vue` recibe `{id,name,image,artist:{name}}`, pero resuelve álbum y pistas mediante `resolveSpotifyAlbum(name, artist)` y `getSpotifyAlbumDetails(...)`. | Sigue las reglas del adaptador Spotify existente. |

Dashboard (`/`) requiere autenticación. Los endpoints de Rates se consumen con la sesión Axios vigente. El ranking trata carga, error/reintento, cambio de sesión y ausencia de sesión; el modal además diferencia 404 de resumen, artista ya no disponible, cero discos valorados y estado de sesión. El error de Last.fm es independiente del resumen y tiene reintento aislado.

### Last.fm: transporte, caché y estados

El navegador no consulta a Last.fm directamente ni contiene la clave del proveedor. `getRatesArtistLastfm(artistId, signal)` llama al backend Riff Valley por ID interno. El contrato actual incluye `artistId`, estados `available | not_found | unavailable | not_configured | invalid_response`, biografía nullable, tags, similares, oyentes, reproducciones y URL. La vista presenta la biografía como texto, limita a cinco tags/similares, valida enlaces permitidos y expone carga, error HTTP/red y estados de proveedor por separado.

La llamada se inicia al abrir el modal, en paralelo con Rates; no se ejecuta al cargar el widget. El composable aborta al cerrar/cambiar artista/cambiar sesión/desmontar, descarta respuestas tardías y verifica que el `artistId` devuelto corresponda al solicitado. `not_found` informa ausencia sin error HTTP; `unavailable` e `invalid_response` permiten reintentar; `not_configured` indica indisponibilidad de configuración; fallos HTTP/red muestran error y reintento.

No hay caché de Last.fm en el estado del widget, composable, Query ni servicio frontend: cada apertura vuelve a pedirlo. La documentación D-ART-7b/7c no registra una caché del backend Last.fm, por lo que su existencia y TTL quedan sin verificar. La caché de credenciales Spotify descrita en CAT-ART-1 no aplica a esta ruta de Last.fm.

## Artistas relacionados

`similarArtists` procede del adaptador backend de Last.fm según D-ART-7b/7d; cada elemento expone `name`, `url`, `catalogArtistId: string | null`, `catalogDiscCount` y `catalogDiscs`. La UI deduplica los enlaces externos por nombre normalizado y muestra hasta cinco. Si `catalogArtistId` es UUID válido, hoy puede expandir las tarjetas informativas de los discos incluidos en el payload; no hace consultas extra ni abre la ficha del artista relacionado ni `DiscDetail`. Sin ID, ofrece el enlace de Last.fm seguro o texto.

Para la ficha compartida, un similar se podrá abrir dentro del mismo diálogo únicamente cuando el backend proporcione un `catalogArtistId` fiable. El clic debe transportar ese ID, cargar los datos por ID y usar el nombre canónico devuelto para el título. Si no hay ID, conservar enlace externo como alternativa; no llamar a `searchArtistsByName` para decidir identidad, no crear asociaciones y no seleccionar el primer homónimo. El contrato nullable permite dejar sin vínculo interno los casos ambiguos.

El frontend confirma la presencia del campo ID y valida UUID antes de usarlo; no demuestra cómo el backend asignó `catalogArtistId` a partir del nombre de Last.fm, ni que el emparejamiento sea inequívoco. Antes de automatizar esos vínculos debe revisarse en backend su regla de resolución y asegurar que homónimos/ambigüedad producen `null`.

## Discografía de Catalog y apertura de `DiscDetail`

El endpoint Rates summary no basta: incluye solo discos con valoración personal, carece de género y formato y pagina por actividad. `GET /discs` tampoco acepta ID de artista en el adaptador observado; buscar por `query` usaría texto y está expresamente descartado para esta relación. `GET /artists/:id/details` es el candidato existente más seguro por identidad, según el inventario de CAT-ART-1, pero hay que confirmar en el backend su respuesta completa, permisos y orden antes de basar la pantalla en él. El frontend no tiene hoy una función `getArtistDetails(id)` tipada.

Contrato necesario para la ficha: discos asociados por FK/ID interno de artista, `id`, `name`, `image`, `releaseDate`, género (`id`, `name`, `color`) y formato (`ep`/`debut` o la representación canónica vigente). Orden recomendado: fecha descendente, fechas nulas al final y `id` como desempate estable. La respuesta debe venir de una sola consulta/set de consultas acotado en backend, no de una petición por disco ni de coincidencias de nombre. No usar la lista de gestión, que trae relaciones/campos administrativos y tiene paginación propia.

Si `/artists/:id/details` ya satisface ese contrato, basta un adaptador frontend tipado y no hace falta ampliar backend. Si no, CAT-ART-2b debe incluir una extensión mínima de lectura por ID o una proyección de directorio que incluya este dato con un límite claro. No se recomienda cambiar `/discs` global para introducir un filtro específico sin confirmar ownership/consumidores.

Para abrir un disco, el modal puede conservar el patrón actual: guardar el payload mínimo `{id, name, image, artist:{name}}` y renderizar `<DiscDetail :disc="selectedDisc" @close="..." />`. Esto reutiliza la lógica y UI existentes, sin duplicarlas. Límite actual: `DiscDetail` no usa el ID ni la portada de Catalog para recuperar el disco; busca el álbum en Spotify por título y nombre de artista. La entrada desde Catalog no convierte esa resolución textual en identidad garantizada. La apertura anidada mantiene dos diálogos/focus traps y ambos escuchan Escape en `document`; su convivencia debe caracterizarse durante CAT-ART-2d, sin cambiar el detalle de discos en esta auditoría.

## Propuesta de ficha compartida

### Responsabilidades y contrato público

Mantener una sola ficha de artista con ID interno como identidad. El padre decide qué ID abrir y controla su ciclo de vida; la ficha concentra carga, presentación, errores, navegación interna relacionada y selección de disco. La API pública propuesta es:

| Superficie | Propuesta |
|---|---|
| Prop requerida | `artistId: string` (UUID de Catalog). |
| Prop opcional | Datos iniciales ligeros `{ name, image }` para pintar cabecera mientras llega el detalle; nunca sustituyen la carga ni identifican al artista. |
| Evento | `close` para solicitar cierre al padre. |
| Evento | `open-related-artist({ artistId })` solo para un ID de Catalog resuelto; alternativamente el padre puede sustituir `artistId` manteniendo abierto el modal. Elegir una única forma en 2d. |
| Evento | No hace falta evento de salida para disco si `DiscDetail` permanece compuesto dentro de la ficha; si se decide que el padre gestione overlays, publicar `open-disc` con el payload mínimo tipado. |

Los consumidores serían Dashboard Favoritos (ya tiene un ID en `RatesTopArtistDto`), el futuro directorio y las sugerencias CAT-ART-3 (su selección también conserva ID). Este contrato no debe aceptar nombre como identidad ni exigir que el consumidor pertenezca a Dashboard.

### Carga, caché y estados

Separar datos compartidos del contexto personal. La ficha puede pedir por ID los datos de Catalog/Last.fm y mantener el resumen Rates bajo el usuario y su generación de sesión. La experiencia actual de Favoritos debe conservar título «Tu historia con…», imagen de ranking como fallback, métricas y discos valorados paginados; el directorio añade discografía completa de Catalog sin sustituir ni reinterpretar el bloque personal.

Al montar/abrir, lanzar en paralelo la carga de identidad/estadísticas existentes, Last.fm y discografía de Catalog; cada sección debe poder terminar, fallar y reintentarse de forma independiente. Mostrar skeleton solo en la sección en carga, vacíos explícitos (sin información externa, sin discos de Catalog, sin valoraciones) y errores con reintento. 404 de ID es artista inexistente; 401/403 se deja al manejo de sesión/permisos, no se transforma en vacío. AbortSignal y protección contra respuestas antiguas deben cubrir cambio de ID, cierre y sesión.

Mantener inicialmente el comportamiento de caché visible actual: sin caché global nueva en frontend; nueva apertura vuelve a cargar. No almacenar datos Rates privados fuera de la identidad/sesión. Antes de introducir caché Last.fm compartida, verificar si backend ya cachea y qué TTL/invalidation aplica. Un posible cacheo Query posterior necesitaría claves por ID para datos de Catalog y por usuario/sesión para Rates; no es requisito de extracción.

### Apertura, cierre, foco y navegación

Montar condicionalmente con ID presente y cerrar mediante `close`; conservar Teleport, fondo bloqueado, Escape, botón accesible, foco inicial, focus trap y restauración al elemento que abrió la ficha. Dar un único dueño al listener Escape. Al sustituir el ID por navegación relacionada, conservar el diálogo y el foco, cancelar y limpiar cargas del ID anterior y cambiar a la identidad canónica nueva. No apilar un segundo modal de artista.

Al abrir `DiscDetail`, el foco debe entrar al diálogo superior y volver al control de disco al cerrarlo. Comprobar la interacción de Escape y los dos traps existentes; si el diseño actual cierra también la ficha de artista o pierde foco, ajustar composición en 2d conservando el aspecto/acciones existentes en Favoritos. Enlace externo de Last.fm sigue siendo navegación nueva con `noopener noreferrer`.

## Directorio y pills A–Z

Cada pill muestra el nombre real y selecciona por `artist.id`, nunca por nombre. Su fondo usa el color del género del disco de Catalog con mayor `releaseDate`; si no hay disco/género/color, usar el neutro que establezca el sistema de diseño. Definir desempate de fechas y tratar fechas nulas en backend de forma estable.

No pedir discografía individualmente para calcular colores. La respuesta A–Z debe incluir un campo proyectado pequeño como `latestDisc.genre.color` (y opcionalmente datos de presentación mínimos) en el mismo endpoint paginado que entrega artistas. El backend debe resolver el disco más reciente por FK de artista y devolver una fila por artista usando join/subconsulta/consulta agrupada; no N+1. Evitar usar `/artists/management` como directorio: su owner/permiso, paginación de 30 y proyección administrativa no corresponden a las pills.

Contrato tentativo de fila: `{ id, name, latestDisc: { releaseDate, genre: { name, color } | null } | null }`. Si se usa endpoint dedicado, la respuesta debe incluir `totalItems`, `limit`, `offset`/paginación y orden estable. La búsqueda CAT-ART-3 podrá compartir filas ligeras y seleccionar por ID, sin convertir una coincidencia textual en vínculo.

La ruta actual `/artists` pertenece a `ArtistManagement.vue` y exige `riffvalley`; CAT-ART-2d debe resolver la convivencia del directorio allí con la gestión existente (propuesta: `/artists` para directorio y ruta de gestión separada protegida con `riffvalley`). La protección efectiva siempre debe confirmarse en backend; un guard frontend no autoriza lecturas.

## Propuesta de tareas y dependencias

| Tarea | Estado | Alcance y dependencia |
|---|---|---|
| **CAT-ART-2a — Auditoría del modal** | **Completada** | Esta documentación; sin implementación. |
| **CAT-ART-2b — Backend del directorio A–Z** | Completada en backend | Endpoint paginado `/api/artists/directory`, búsqueda global y género del último disco; detalles en el roadmap CAT-ART-2b del checkout backend. |
| **CAT-ART-2c — Directorio A–Z frontend** | Completada en frontend | Directorio, pills, búsqueda, carga progresiva y gestión legacy conservada. La selección es por ID; la ficha aún no se abre. |
| **CAT-ART-2d — Ficha compartida e integración** | **Completada** | Adaptación de la ficha de Favoritos a un modal compartido de Catalog, apertura desde Directorio por ID y discografía completa; ver seguimiento posterior. |

CAT-ART-3 (autocompletado), CAT-ART-4 (evolución de «Rellenar imágenes») y CAT-ART-5 (revisión/cierre) siguen pendientes. CAT-ART-3 podrá reutilizar la ficha abriéndola por el ID de sugerencia; no se inicia aquí.

## Decisiones y comprobaciones pendientes

1. Revisar backend para confirmar el payload, permiso y orden de `GET /artists/:id/details`; usarlo si cumple los campos de discografía. Si no, definir extensión mínima por ID.
2. Verificar si el backend cachea Last.fm y con qué TTL; no se deduce del frontend ni se ha consultado proveedor.
3. Auditar cómo D-ART-7d asigna `catalogArtistId` a similares y qué hace ante homónimos/ambigüedad; dejar el ID nullable cuando no haya identidad segura.
4. Elegir evento de navegación de artista relacionado versus sustitución controlada de prop; conservar un solo modal y foco.
5. La coexistencia de directorio y gestión en `/artists` se resolvió en CAT-ART-2c mediante pestañas; la ruta y el guard actual se conservaron. Este cambio frontend no altera ni certifica permisos backend.
6. CAT-ART-2b define el último disco y los colores nullable; CAT-ART-2c usa un tratamiento neutro cuando no hay color.
7. CAT-ART-2b/2c cerraron la clasificación de `#`, la ubicación de «The» en T y la precedencia de la búsqueda global.

## Fuentes revisadas

- Frontend: `src/modules/dashboard/widgets/artists/components/DashboardFavoriteArtistsWidget.vue`, `DashboardFavoriteArtistModal.vue`, `DashboardSimilarArtistDiscCard.vue`, `src/modules/dashboard/widgets/artists/composables/useFavoriteArtistDetails.ts`, sus tests, `src/services/rates/rates.ts` y su test, `src/services/artist/artist.ts`, `src/services/discs/discs.ts`, `src/components/DiscDetail.vue`, `src/components/ArtistDetail.vue`, `src/router/index.ts`.
- Documentación de contratos/historial: [CAT-ART-1](cat-art-1-auditoria-artistas.md), [D-ART-7a–7d](../dashboard.md#d-art-7a--simplificaci%C3%B3n-del-modal-de-artistas-favoritos) y [CAT-DISC-3a](cat-disc-3a-auditoria-consumidores-contratos.md).
- Tests localizados, no ejecutados: `DashboardFavoriteArtistsWidget.test.ts`, `DashboardFavoriteArtistModal.test.ts`, `useFavoriteArtistDetails.test.ts`, `src/services/rates/rates.test.ts`, `src/components/DiscDetail.test.ts`.

## Seguimiento posterior — CAT-ART-2c

**Estado:** completada en frontend el 2026-10-29. La ruta `/artists` conserva su componente y permisos; se añadió navegación A–Z y `#`, cuadrícula responsive de pills, color de género nullable y búsqueda global con debounce de 400 ms. Usa `GET /api/artists/directory` con `limit=100`, páginas sucesivas, deduplicación por ID y cierre al alcanzar `totalItems`.

La gestión legacy sigue disponible en una pestaña para el rol existente; sus filtros, edición, borrado, revisión, Last.fm y «Rellenar imágenes» permanecen en el panel previo. El botón de imágenes no se modificó. La selección local conserva `artist.id` sin resolver identidad mediante nombre.

Se añadieron pruebas focalizadas del adaptador API, paginación/IDs y vista: letra inicial, `#`, colores y fallback, homónimos, búsqueda global, retorno a letra, páginas de 100, reinicio/fin, vacío/error y respuestas obsoletas. Las verificaciones locales de esa entrega constan en el historial correspondiente.

## Seguimiento posterior — CAT-ART-2d

**Estado:** completada en frontend el 2026-10-29. La ficha común vive en `src/modules/catalog/artists/presentation/components/ArtistDetailsModal.vue`; Favoritos la consume mediante un adaptador delgado y el Directorio la abre directamente con `artist.id`. La navegación a relacionados sustituye el ID dentro de la misma ficha y no apila diálogos. Rates personal solo se consulta y presenta desde Favoritos.

El adaptador de Catalog consulta `GET /artists/:id/details` por ID y el servicio backend inspeccionado en el checkout hermano devuelve artista, país, descripción y la discografía completa. No entrega géneros del artista por separado; la UI muestra los géneros distintos de los discos asociados. Deduplica discos por ID y ordena las fechas descendentes, colocando fechas nulas al final. El backend sigue sin definir orden para fechas nulas ni desempate de fechas iguales; no se modificó.

Last.fm conserva su consulta backend por ID, biografía, tags, métricas, perfiles y relacionados. Si falta o falla, Catalog permanece visible; solo los relacionados con `catalogArtistId` UUID abren otra ficha. El detalle de disco sigue siendo el `DiscDetail` existente y conserva su resolución actual en Spotify por título/artista.

El Directorio conserva su instancia, letra, texto de búsqueda, filas y scroll al cerrar; cerrar la ficha no invalida ni repite la consulta de directorio. El diálogo mantiene Escape, trampa/restauración de foco y bloqueo del scroll; el diálogo anidado de `DiscDetail` retiene Escape para que no cierre también la ficha. Pruebas focalizadas cubren ID/homónimos, discos completos/vacíos, integración desde ambas entradas, relacionados y `DiscDetail`; el composable existente mantiene las pruebas de cancelación/estado Rates y Last.fm.

CAT-ART-3 (autocompletado), CAT-ART-4 («Rellenar imágenes») y CAT-ART-5 siguen pendientes y no se iniciaron.
