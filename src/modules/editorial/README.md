# Editorial

Mapa del estado actual del módulo. Las páginas y componentes siguen ubicados
principalmente en `src/views`; aquí viven contratos, adaptadores y algunos
tokens de inyección. `src/app/dependencies/editorial.ts` conecta adaptadores y
operaciones, y `src/app/bootstrap/index.ts` provee las dependencias que usan
`inject`. El barrel `src/modules/editorial/index.ts` expone tipos, operaciones,
constantes y algunos tokens. Las vistas de playlists consumen la composición
mediante tokens de presentación exportados por el módulo.

## Capacidades

### Asignaciones

- **Responsabilidad:** actualizar el texto asociado a una asignación editorial.
- **Estructura:** `asignations/domain` define `AsignationTextUpdate`;
  `application` define `AsignationTextUpdatePort`;
  `infrastructure/asignationTextUpdateApi.ts` adapta HTTP;
  `presentation/asignationTextUpdateKey.ts` define el token. La UI sigue en
  `views/list/components/`.
- **Consumidores y rutas:** `AsignationList` está dentro de `EditList`
  (`/list/edit/:id`); `MejoresAsignationList` está dentro de `MejoresDetalle`
  (`/discos/mejores/:id`). No son rutas independientes.
- **Operaciones expuestas:** `updateAsignationText(asignationId, data)`.
- **Dependencias externas:** cliente HTTP compartido compuesto desde `app`.
- **Legacy relacionado:** `services/asignation/asignation.ts` conserva la
  creación, carga, borrado y otras
  operaciones no migradas; el guardado migrado consume el token Editorial.
- **Deuda:** migrar las demás operaciones editoriales de asignaciones y retirar
  el servicio solo cuando no queden consumidores.

### Lists

- **Responsabilidad:** detalle/actualización, listas especiales, creación
  semanal o mensual y publicación de listas a WordPress.
- **Estructura:** `lists/domain` separa `listDetails` y `specialLists`;
  `application` contiene los puertos de detalle, creación, listas especiales y
  publicación; `infrastructure` contiene adaptadores por operación;
  `presentation` define tokens. Los consumidores siguen en `views/list/`,
  `views/list/components/` y `views/discos/`.
- **Consumidores y rutas:** `ListsList` (`/list/lists`), `CreateList`
  (`/list/create`), `EditList` (`/list/edit/:id`), `AsignationList` y
  `MejoresDetalle` (`/discos/mejores/:id`). `/list` redirige a `/list/lists`.
- **Operaciones expuestas:** consulta/actualización de detalle; consulta,
  creación y borrado de listas especiales; creación de listas; publicación de
  posts de radar y de la lista de mejores discos a WordPress.
- **Dependencias externas:** cliente HTTP compartido y contrato de WordPress.
- **Legacy relacionado:** `services/list/list.ts` conserva operaciones/consumidores
  ajenos a los recorridos migrados; `services/contents` sigue usado por el
  calendario y la creación de contenido de reuniones.
- **Deuda:** la construcción actual de HTML para WordPress queda como riesgo
  conocido, junto con los consumidores legacy del servicio.

### Reuniones

- **Responsabilidad:** lectura y cambios de reuniones y sus puntos.
- **Estructura:** `reunions/domain` define reuniones, puntos y cambios;
  `application/reunionsPort.ts` declara operaciones;
  `infrastructure/reunionsApi.ts` adapta HTTP; `presentation/reunionsKey.ts`
  aporta el token. Las vistas permanecen en `views/reunions/`.
- **Consumidores y rutas:** `ListReunion`, `ReunionTable`, `ReunionEditModal`
  y `EditReunion`, bajo `/reunions/list` y `/reunions/:id`.
- **Operaciones expuestas:** listar y consultar detalle, actualizar/borrar una
  reunión y crear, actualizar o borrar puntos.
- **Dependencias externas:** cliente HTTP compartido. `ListReunion` aún usa
  `services/contents` para añadir contenido al calendario.
- **Legacy relacionado:** `services/reunions/reunions.ts` se eliminó tras
  confirmar que no tenía consumidores; `services/contents/contents.ts` sigue
  atendiendo el recurso `Content` del calendario.
- **Deuda y riesgos:** `/reunions` y `Content(type="reunion")` no se unifican.
  `ReunionTable` mantiene el uso existente de `v-html` para puntos.

### Articles

- **Responsabilidad:** datos y operaciones del Kanban/formularios de artículos,
  incluidas operaciones iniciadas desde calendario.
- **Estructura:** `articles/domain` contiene tipos/constantes;
  `application/articlesPort.ts` define operaciones;
  `infrastructure/articlesApi.ts` implementa HTTP; `presentation/articlesKey.ts`
  define el token. Los consumidores están en `views/articles/` y
  `views/contentCalendar/`.
- **Consumidores y rutas:** `ArticlesKanban` (`/articles`), `ContentCalendar`
  (`/content-calendar`) y sus modales `ArticleActionsModal` y
  `CreateContentModal`.
- **Operaciones expuestas:** lectura, creación, edición y borrado de artículos,
  creación de contenido de calendario y de contenido para artículo.
- **Dependencias externas:** cliente HTTP compartido; `getUsersRv` de
  `services/auth` sirve la selección de usuarios en UI.
- **Legacy relacionado:** `ArticlesKanban` usa el puerto Editorial también para
  crear contenido de calendario. `ArticleActionsModal` aún importa
  tipos/constantes reexportados por `services/articles/articles.ts`, pero no
  ejecuta transporte. `services/contents/contents.ts` atiende las operaciones
  generales del calendario.
- **Deuda:** retirar las reexportaciones legacy de tipos/constantes cuando
  deje de haber consumidores ajenos a Editorial.

### Videos

- **Responsabilidad:** datos y operaciones del Kanban, formularios, listas y
  calendario de vídeos.
- **Estructura:** `videos/domain`, `application/videosPort.ts`,
  `infrastructure/videosApi.ts` y `presentation/videosKey.ts` cubren las cuatro
  capas. Las pantallas siguen bajo `views/videos/` y `views/contentCalendar/`.
- **Consumidores y rutas:** `VideosKanban` (`/videos`), `VideoListDetalle`
  (`/videos/list/:id`), `ContentCalendar` y `VideoActionsModal`.
- **Operaciones expuestas:** consulta, alta, edición, borrado, creación de
  listas vinculadas y creación de contenido de calendario.
- **Dependencias externas:** cliente HTTP compartido y `getUsersRv` de
  `services/auth`.
- **Legacy relacionado:** `services/videos/videos.ts` aún proporciona `toISO`
  a `VideosKanban`; el modal de calendario importa tipos/constantes de esa
  fachada. `services/contents/contents.ts` atiende el calendario genérico.
- **Deuda:** separar el helper de fecha de la fachada HTTP y retirar imports
  legacy cuando queden sin uso.

### Calendar

- **Responsabilidad:** reprogramar una entrada editorial existente tras
  `eventDrop`.
- **Estructura:** `calendar/domain/rescheduleContent.ts` contiene la conversión
  de fecha y el tipo de entrada; `application` expone el puerto/operación;
  `infrastructure/editorialCalendarApi.ts` implementa el PATCH;
  `presentation/rescheduleEditorialContentKey.ts` define la clave. La vista
  permanece en `views/contentCalendar/`.
- **Consumidores y rutas:** `ContentCalendar` (`/content-calendar`).
- **Operaciones expuestas:** `rescheduleContent` a través de
  `rescheduleEditorialContent` y su clave de inyección.
- **Dependencias externas:** cliente HTTP compartido y FullCalendar en la vista.
- **Legacy relacionado:** `services/contents/contents.ts` conserva carga,
  consultas por mes y otras altas/ediciones/borrados fuera del corte `eventDrop`.
- **Deuda:** completar otras migraciones verticales en cortes posteriores;
  las reglas UTC/local de esos flujos aún viven en la presentación legacy.

### Festival-playlists

- **Responsabilidad:** registros de festivales, playlists asociadas, metadatos,
  imagen y gestión de artistas/pistas.
- **Estructura:** `festival-playlists/domain`, `application` e
  `infrastructure` separan tipos, puertos y adaptadores; `presentation/`
  define las claves de inyección. Las vistas siguen en `views/spotify/` y
  consumen la composición mediante la API pública del módulo.
- **Consumidores y rutas:** `SpotifyFestivalsKanban` (`/spotify/festivales`) y
  `FestivalPlaylistManager`, abierto desde ese Kanban.
- **Operaciones expuestas:** puertos de registros, datos, ciclo de vida,
  búsqueda de artistas y gestión/selección de pistas. Los adaptadores cubren
  lectura/actualización de registros, crear/enlazar/borrar, leer/editar playlist,
  imagen y operaciones de artistas/pistas.
- **Dependencias externas:** API HTTP de Editorial; Spotify/OAuth siguen en
  servicios legacy. `axios` también se usa para reconocer errores y
  `services/auth` para usuarios.
- **Legacy relacionado:** `services/spotify/spotify.ts` sigue aportando datos
  y creación de contenido del Kanban; `services/spotify/festivalPlaylists.ts`
  conserva conexión OAuth y operaciones de Spotify fuera del alcance de esta
  iteración. El manager consume registros, datos, ciclo de vida, búsqueda de
  artistas y operaciones de artistas/pistas mediante inyección. La validación
  de imagen y axios para reconocer errores siguen en presentación.
- **Deuda:** completar el traslado de operaciones seleccionadas y retirar
  imports HTTP legacy ya reemplazados. Mantener separados el registro local y la
  playlist de Spotify. Los adaptadores usan tipos de dominio directamente
  cuando la respuesta no difiere; no quedan DTO aliases ceremoniales en esta
  infraestructura.

### Genre-playlists

- **Responsabilidad:** Kanban de registros de playlists de género, ciclo de
  vida, metadatos, artistas/pistas y limpieza/mezcla.
- **Estructura:** `genre-playlists/domain`, `application` e `infrastructure`
  contienen contratos/adaptadores separados de festivales; `presentation`
  define tokens. La UI sigue en `views/spotify/`.
- **Consumidores y rutas:** `SpotifyGenresKanban` (`/spotify/generos`, pestañas
  de playlists y Kanban) y `GenrePlaylistManager`, modal de esa vista.
- **Operaciones expuestas:** puertos separados para búsqueda de artistas,
  registros, ciclo de vida, datos/metadatos/imagen, artistas/pistas y limpieza
  o mezcla.
- **Dependencias externas:** cliente HTTP compartido; servicios Spotify legacy
  para OAuth/validación de imagen; `services/auth` para usuarios y store legacy
  de Catalog para algunos datos de artistas.
- **Legacy relacionado:** `services/spotify/spotify.ts` aún actualiza registros,
  crea contenido de calendario y convierte fechas desde `SpotifyGenresKanban`;
  `services/spotify/festivalPlaylists.ts` se reutiliza para OAuth y validación
  de imagen; `services/spotify/genrePlaylists.ts` aún aporta tipos/datos
  sincronizados al Kanban. `GenrePlaylistManager` consume Editorial para
  consultar/actualizar metadatos e imagen, borrar el registro local y gestionar
  artistas, pistas y mantenimiento. La validación de imagen y la conexión OAuth
  siguen en el servicio Spotify.
- **Deuda:** migrar las llamadas HTTP restantes del Kanban a contratos
  apropiados y preservar permisos actuales.
  No inferir que los contratos de género son los de festivales.

## Composición y límites actuales

Los adaptadores usan `shared/infrastructure/http/client`.
`app/dependencies/editorial.ts` construye la composición; bootstrap provee
tokens de asignaciones, listas, reuniones, artículos, vídeos, calendario y
playlists de género y festivales. Las vistas de playlists consumen los puertos
mediante `inject` y claves exportadas por la API pública de Editorial. La
presentación ya no importa directamente `app/dependencies/editorial.ts`.

`domain` y `application` están organizados por capacidad y no tienen
directorios genéricos en la raíz. El código del módulo concentra contratos y
transportes; la presentación Vue permanece en `views/`. Los dominios de
festivales y géneros permanecen separados. `services/contents` y los helpers de
Spotify continúan como fronteras legacy con consumidores identificables.
