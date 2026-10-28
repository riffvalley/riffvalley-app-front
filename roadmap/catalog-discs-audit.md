# CAT-DISC-1 — Auditoría de Discos

**Estado:** CAT-DISC-1, CAT-DISC-2a–2d, CAT-DISC-2f, CAT-DISC-3a documental y CAT-DISC-3e completadas; CAT-DISC-3b–3d corresponden al backend, CAT-DISC-3f no iniciada y fases visuales posteriores pendientes.
**Alcance:** frontend de `/disc-list`, sus consumidores y contratos backend observables.
**Fecha de inspección:** 28 de octubre de 2026.
**Evidencia CAT-DISC-1:** código frontend del checkout y checkout hermano `../riffvalley-app-back`; no se hicieron llamadas HTTP ni se ejecutaron pruebas durante esa auditoría. El backend consultado es evidencia del checkout disponible, no una comprobación de producción. **Evidencia CAT-DISC-2a–2d:** pruebas Vitest locales mockeadas, typecheck/build y gates locales indicados por fase; no hubo backend, navegador ni CI.

La auditoría posterior de concurrencia/cancelación CAT-DISC-2f está en [roadmap/catalog-discs-concurrency-audit.md](catalog-discs-concurrency-audit.md). Es documental y de solo lectura; precisa los límites de cancelación frontend/backend, los riesgos de sesión y un roadmap propuesto sin ejecutar.

La auditoría documental CAT-DISC-3a de consumidores, contratos y arquitectura backend está en [roadmap/catalog/cat-disc-3a-auditoria-consumidores-contratos.md](catalog/cat-disc-3a-auditoria-consumidores-contratos.md). CAT-DISC-3e corrige el aislamiento de sesión en el coordinador frontend; no integra todavía los endpoints backend nuevos ni inicia CAT-DISC-3f.

## Resumen ejecutivo

La auditoría CAT-DISC-1 identificó la página general en la ruta protegida `/disc-list` (`DiscList`), implementada entonces por la vista legacy `src/views/discsList/DiscList.vue`, en Options API. CAT-DISC-2b la trasladó a `src/modules/catalog/discs/presentation/views/DiscListView.vue` sin extraer su coordinación. `/rankings` es TopDiscs, una ruta y funcionalidad diferentes, ya cerrada en [su roadmap](catalog-top-discs.md).

La vista agrupa seis modos (`Todos`, votos, portadas, comentarios, favoritos y pendientes), filtros comunes y scroll infinito. CAT-DISC-2c extrajo la selección de servicios y adaptación de respuestas a `application/loadDiscList.ts`; CAT-DISC-2d centralizó criterios, resultados, paginación y concurrencia en `application/useDiscListCoordinator.ts`. Los filtros de período conservan su estado visual en `DiscFilters`, mientras sus criterios seleccionados pertenecen al coordinador; las opciones de país/género siguen procediendo del catálogo global. `DiscCardComponent` permanece transversal con UI y operaciones de Community, dependencias de Identity y dependencia directa con Calendar.

Hallazgos principales comprobados:

- CAT-DISC-2a reprodujo que un filtro nuevo se descartaba mientras cargaba el anterior; CAT-DISC-2d corrigió A→B mediante identidad/generación, con regresiones activas para resultados en ambos órdenes y errores tardíos.
- El coordinador conserva estado de error ligado a la consulta actual y registra errores activos en consola. No existe estado visible de error ni vacío explícito para el grid principal.
- El contador usa `totalItems` del servidor, mientras el grid descarta en cliente elementos sin `image`. Si una respuesta incluye discos sin imagen, el contador y el número de tarjetas visibles divergen.
- Las seis categorías consultan endpoints distintos. Las opciones de país/género proceden de un catálogo global de Pinia, no de opciones calculadas para los filtros activos.
- En CAT-DISC-1 no había tests directos de `DiscList.vue`. CAT-DISC-2a–2d añadieron caracterización de vista/filtros/paginación, contratos de servicios, permisos y coordinación; los límites restantes se registran en la sección de pruebas.

CAT-DISC-1 no modificó código funcional, estilos, componentes ni tests. CAT-DISC-2a añadió/modificó únicamente pruebas y documentación. El checkout ya tenía cambios locales en `router/index.ts`, `routes.json`, `DiscFilters.vue`, `SearchableSelect.vue`, tests, documentación y archivos de TopDiscs; también tenía `src/views/homePage/HomePage.vue` eliminado. Se conservaron y se trataron como estado preexistente. Las observaciones describen el checkout actual, no una comparación limpia entre HEAD y una rama base.

## Ruta y límites

| Elemento                                         | Evidencia                                                                                                                                                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Página Discos                                    | Vue Router `path: /disc-list`, nombre `DiscList`, carga diferida de `@/modules/catalog/discs/presentation/views/DiscListView.vue`; `requiresAuth: true`.                                                                                        |
| Entrada del menú                                 | `routes.json` enlaza `/disc-list` como «Discos» y declara `requiredRole: user`. El acceso efectivo se comprueba también en Router.                                                                                                              |
| TopDiscs                                         | Ruta `path: /rankings`, nombre `Rankings`, vista `modules/catalog/top-discs/presentation/views/TopDiscsView.vue`; no es parte de esta página.                                                                                                   |
| Vista relacionada fuera del alcance de la página | `/disc-list-error` carga `DiscListError.vue` y exige rol `riffvalley`. Reutiliza `DiscFilters`, `DiscCardComponent` y el catálogo. No es una variante de ruta de `/disc-list` ni debe confundirse con el estado de error de `DiscListView.vue`. |

El guard del Router exige sesión para `/disc-list`, sin exigir un rol específico en la ruta. El backend vuelve a exigir autenticación para `GET /api/discs` y los endpoints privados de Community; el control de interfaz no reemplaza esa autorización.

## Mapa de arquitectura actual

```text
SidebarMenu
  -> /disc-list (requiresAuth)
  -> DiscListView.vue [composición de presentación]
       -> DiscFilters.vue
       |    -> SearchableSelect.vue
       |    -> SimpleSelect.vue
       |    -> estado local de año/mes/semana -> update:selectedWeek
       -> useCatalogStore (Pinia) -> getCatalog -> GET /api/catalog
       -> application/useDiscListCoordinator.ts [criterios, sesión, resultados y solicitudes]
       -> application/loadDiscList.ts -> servicios legacy según modo:
            Catalog: GET /api/discs
            Community: GET /api/rates, /comments, /favorites, /pendings
       -> DiscCardComponent.vue [tarjeta transversal]
            -> rates/favorites/pendings services
            -> VotesModal, ComentsModal, DiscDetail, ArtistDetail
            -> DiscCalendar.vue
            -> Identity Auth/Shared (rol de moderación)
            -> QueryClient solo para invalidar resumen de Dashboard al votar
```

### Responsabilidades y estado

| Área                       | Responsable actual                                   | Observación                                                                                                                                                                                                                                                                                                |
| -------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presentación de pantalla   | `DiscListView.vue`                                   | Compone cabecera, modos, filtros, comentarios, grid, observer y botón scroll-to-top. Enlaza criterios/estado con el coordinador; no posee resultados ni decide cómo atender una consulta.                                                                                                                |
| Filtros de catálogo        | `DiscFilters.vue`                                    | Controla entrada de búsqueda, selecciones género/país y selectores de año/mes/período. Mantiene refs propias para género/país que sincroniza desde props; la vista mantiene copias. El prop `selectedWeek` está declarado y se pasa desde la vista, pero la selección temporal interna no se deriva de él. |
| Estado de opciones         | `useCatalogStore`                                    | Pinia global con `genres`, `countries` y `loaded`. `App.vue` solicita el catálogo al autenticarse; el store ordena y conserva las opciones. Es estado compartido de catálogo, no una caché de resultados.                                                                                                  |
| Estado remoto de la página | `useDiscListCoordinator`                             | Estado local a la vista: modo, filtros, orden, offset, resultados, totales, carga/error y generaciones. No usa TanStack Query ni modifica criterios en URL. Las APIs actuales no aceptan `AbortSignal`; las respuestas obsoletas se descartan.                                                      |
| Transporte                 | servicios en `src/services/*` + adaptador de Catalog | El cliente Axios común añade sesión/renovación. `loadDiscList` reutiliza lecturas legacy de Catalog y Community; los wrappers personales usados aquí declaran la página `{data,totalItems,totalPages,currentPage,limit}`.                                                                                  |
| UI de tarjeta y acciones   | `DiscCardComponent.vue`                              | Combina presentación, modalización, operaciones remotas, adaptaciones optimistas locales, Spotify y lectura de preferencias locales.                                                                                                                                                                       |

`DiscListView.vue` se limita a la composición y los efectos propios de presentación. `application/useDiscListCoordinator.ts` concentra criterios de consulta, estado de páginas y protección frente a respuestas tardías; `application/loadDiscList.ts` conserva la selección de wrappers y adaptación de payloads. El selector de año/mes/semana conserva su estado visual interno en `DiscFilters` y emite `dateRange`, que pasa a formar parte de la identidad de consulta. Los estilos y contratos de componentes compartidos no se modificaron en CAT-DISC-2d.

CAT-DISC-2d ejecutó el detector local de ciclos y el análisis de fronteras de Identity: no encontró imports locales sin resolver ni violaciones productivas Identity; sí encontró el ciclo type-only Articles/Contents/Riff Valley Playlists ya existente. La comparación con base fue informativa porque no se pudo resolver `HEAD` local. Sigue existiendo acoplamiento productivo explícito en la tarjeta: importa directamente una vista de Calendar, servicios legacy de Community, contratos públicos de Identity y la invalidación del resumen de Dashboard.

## Inventario de archivos y consumidores

Clasificación solicitada; el owner actual se distingue de la posible ubicación futura.

| Pieza                                                       | Clase                                            | Consumidores comprobados / uso                                                                                                                                        | Estado y límite recomendado                                                                                                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/catalog/discs/presentation/views/DiscListView.vue` | A — exclusiva de Discos                          | Ruta `/disc-list`; antes `views/discsList/DiscList.vue`                                                                                                               | Vista modularizada en CAT-DISC-2b. La presentación aún coordina estado y consultas legacy; extracción de HTTP y coordinación quedan para 2c/2d.                                     |
| `views/discsList/DiscListError.vue`                         | A — pantalla específica relacionada              | Ruta `/disc-list-error`                                                                                                                                               | Pantalla separada con rol alto; consume card, filtros y store. No mover como parte del primer traslado sin acordar su relación con Discos.                                          |
| `components/DiscFilters.vue`                                | C — transversal entre funcionalidades            | `DiscList`, `DiscListError`, `DiscCalendar`, `DiscCalendarBaby`, `DiscByDate`, `TopDiscsHeader`                                                                       | Componente de filtros de dominio reutilizado por Catalog y calendarios/listados. Su API incluye combinaciones de props para ocultar controles y organizar filas. No es UI genérica. |
| `components/SearchableSelect.vue`                           | D — control genérico con integración transversal | Filtros; calendario; importación/sugerencias; artistas; releases; playlists; peticiones, entre otros                                                                  | Selector reutilizable; no depende de dominio musical por su contrato visual, aunque sus opciones normalmente sí. Confirmar todos los consumidores antes de cambios.                 |
| `components/SimpleSelect.vue`                               | D — control genérico                             | Selector de orden y filtros de período; importado por componentes de la familia DiscFilters                                                                           | Control básico reutilizado. No mover solo por proximidad al módulo.                                                                                                                 |
| `components/DiscCardComponent.vue`                          | C — transversal entre módulos                    | `DiscList`, `DiscListError`, `TopDiscsGrid`, `TopDiscsFeatured`, widgets Dashboard Random Disc, Adventure, Top Rated y Cemetery; modal de ficha en `ArtistManagement` | 1.2k líneas aprox. Contrato y mapa detallado abajo. Mantenerlo durante la primera separación de la vista.                                                                           |
| `stores/catalog/catalog.ts` + `services/catalog/catalog.ts` | B — Catalog compartido, hoy legacy               | Discos, ambas pantallas de lista, calendarios, importación/sugerencias, Petitions y `GenrePlaylistManager`                                                            | El store mantiene opciones globales y evita duplicar la carga. Un futuro cambio requiere preservar consumidores y el ciclo de carga en App.                                         |
| `services/discs/discs.ts`                                   | B — Catalog compartido, hoy legacy               | General, TopDiscs y widgets Dashboard entre otros                                                                                                                     | Funciones distintas conviven en un servicio grande. `getDiscs` es el transporte del listado general; no extraer sin trazar exportaciones/consumidores.                              |
| `services/rates`, `comments`, `favorites`, `pendings`       | C — Community transversal, legacy                | Página general y tarjeta/modal, además de otras vistas                                                                                                                | Servicios consumidos directamente, sin entrada pública modular de Community observada. El módulo futuro debe respetar ownership y no copiar sus llamadas dentro de Catalog.         |
| `helpers/dateConstants.ts`                                  | D/B — helper compartido                          | `DiscFilters` y otros filtros/controles según importaciones                                                                                                           | Contiene constantes y rango de años usado por el filtro; mantener ownership por semántica, no mover automáticamente.                                                                |

La lista de consumidores procede de imports productivos encontrados en `src`; no se asumió que un componente es privado por estar visualmente dentro de Discos. No se localizaron otros consumidores de la vista aparte del Router, ni antes ni después del traslado.

## Auditoría de `DiscCardComponent.vue`

### Consumidores y contrato público

Consumidores directos comprobados: `DiscList`, `DiscListError`, TopDiscs (Featured y Grid), Dashboard (Random Disc, Adventure, Top Rated y Cemetery) y `ArtistManagement`. TopDiscs y varios widgets Dashboard reciben `rating-saved`; otros consumidores usan la tarjeta sin escuchar ese evento.

| Props                 | Uso                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Requeridas            | `id`, `image`, `name`, `releaseDate`, `artistName`, `isNew`                                 |
| Contenido/metadata    | `genreName`, `genreColor`, `link`, `ep`, `debut`, `artistCountry`                           |
| Estado de votos       | `averageRate`, `averageCover`, `rate`, `cover`, `userDiscRate`, `rateCount`, `commentCount` |
| Community por usuario | `favoriteId`, `pendingId`                                                                   |
| Evento                | `rating-saved`: `{ discId, action: created                                                  | updated, musicalRateChanged, hasMusicalRate, coverChanged }`; se emite solo tras guardar correctamente. |

### Responsabilidades funcionales y visuales

- Presenta portada, fecha, país, género, marca EP/debut, medias de nota/portada y título/artista con acceso a detalles.
- Abre la imagen en otra pestaña y calcula el enlace/plataforma de escucha, el reproductor embebido y la búsqueda de track popular de Spotify.
- Gestiona inputs locales de nota y portada; consulta votos del disco, crea/actualiza voto, actualiza medias y emite el evento público.
- Añade/quita favorito y pendiente mediante servicios, actualizando IDs locales y feedback toast.
- Abre `VotesModal`, `ComentsModal`, `DiscDetail`, `ArtistDetail` y un Calendar embebido. Contiene un flujo de compartir como imagen mediante canvas y preferencias locales para spoilers y apertura Spotify.
- Usa Pinia Auth y `hasMinimumRole(..., "riffvalley")` para presentar el acceso a editar en Calendar. Los demás controles se muestran en una ruta que requiere sesión; la autorización efectiva de sus mutaciones corresponde al backend.
- Las acciones ocupan varias filas visibles por tarjeta: votos/portadas, reproductor/enlace, favorito, pendiente, compartir, entradas de valoración, votos, comentarios y enviar. No todas aplican a todos los datos, pero la tarjeta las compone en el mismo bloque.

### Dependencias y pruebas

Importa APIs de Rates, Favorites y Pendings; SweetAlert; Spotify helper; `useQueryClient`; API pública `auth` y `shared` de Identity; helper de invalidación de Dashboard; componentes de detalle/comentarios/votos y directamente `DiscCalendar.vue`. Por eso no es un componente presentacional puro y no puede trasladarse a Catalog sin definir propiedad de operaciones Community y la dependencia Dashboard.

Test directo: `DiscCardComponent.events.test.ts` cubre evento tras creación/actualización de voto y no emisión cuando falla. No hay una suite unitaria que caracterice todas las acciones, modales, reproducción, permisos o accesibilidad. Hay pruebas de integración/consumidor en Random Disc, TopDiscs y Dashboard que fijan parte de la propagación de props y de `rating-saved`.

**Compartido de verdad:** visualización de disco y acciones de valoración/comunidad aparecen en varios consumidores. **No demostrado como genérico:** la combinación exacta de Calendar de moderación, modal de comentarios, canvas de compartir y reproductor Spotify no la usan todos los contextos de la misma forma. Es una hipótesis razonable separar composición o acciones, pero exige contratos y dueño explícitos. La primera separación debe mantener props/evento y ubicación de la tarjeta intactos para proteger TopDiscs y Dashboard.

## Funcionamiento real de filtros

### Inventario y combinación

| Filtro/control         | Estado/fuente                                                                            | Parámetro/API                                                                  | Default, combinación y persistencia                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Búsqueda disco/artista | `searchQuery` en vista; espejo local en `DiscFilters`                                    | `query` en los seis listados                                                   | Vacía; se consulta al cambiar el valor. Backend busca nombre de disco o artista. Sin debounce observado. No URL/localStorage.                                                    |
| País                   | catálogo global `useCatalogStore.countries`; ref de vista y ref interna de `DiscFilters` | `country` en los listados                                                      | Sin selección. Se combina con los demás filtros. Las opciones no se recalculan según resultados. No persistente en URL.                                                          |
| Género                 | catálogo global `useCatalogStore.genres`; refs duplicadas vista/componente               | `genre`                                                                        | Sin selección. Se combina con búsqueda, país, período y modo.                                                                                                                    |
| Año                    | estado interno `weeksYear` en `DiscFilters`, opciones de `getAvailableYears()`           | se convierte en `dateRange`                                                    | Año actual por defecto; `localStorage.rv_default_year_filter === "all"` cambia el default a todos. Evento global `rv-year-filter-changed` también cambia entre año actual/todos. |
| Mes                    | `weeksMonth` en `DiscFilters`                                                            | `dateRange`                                                                    | Año completo (`0`) por defecto. Al seleccionar año concreto se emite rango anual; seleccionar mes emite el mes completo.                                                         |
| Semana/período         | `selectedPeriodKey` local; semanas viernes-jueves derivadas en UTC                       | `dateRange`                                                                    | Selector solo aparece con año y mes concretos; opciones incluyen mes completo y semanas generadas. Los rangos se aplican en servidor.                                            |
| Todos los discos       | `viewMode = all`                                                                         | `GET /discs`                                                                   | Default de página. Incluye selector de orden. El backend excluye fechas futuras.                                                                                                 |
| Mis votos              | `viewMode = rates`                                                                       | `GET /rates`, `type=rate`                                                      | Modo personal. Filtros compartidos aplicados en servidor.                                                                                                                        |
| Mis portadas           | `viewMode = covers`                                                                      | `GET /rates`, `type=cover`                                                     | Mismo endpoint, otra columna/tipo.                                                                                                                                               |
| Mis comentarios        | `viewMode = comments`                                                                    | `GET /comments`, `type=comment`                                                | Presenta comentarios en una lista propia, no `DiscCard`. No muestra control de orden aunque la vista pasa `orderBy` al servicio.                                                 |
| Favoritos              | `viewMode = favorites`                                                                   | `GET /favorites`                                                               | Filtros de texto/fecha/género/país y ordenación.                                                                                                                                 |
| Pendientes             | `viewMode = pendientes`                                                                  | `GET /pendings`                                                                | Filtros de texto/fecha/género/país; no hay selector de orden y el wrapper no envía `orderBy`.                                                                                    |
| Orden                  | `orderBy` en vista                                                                       | `orderBy` para todos salvo pendientes; en todos se traduce un prefijo especial | Orden reciente primero por defecto; cambia por modo a reciente primero. No se persiste.                                                                                          |
| Paginación/carga       | `limit=20`, `offset`, `hasMore`, `IntersectionObserver` en vista                         | `limit`, `offset`                                                              | Incremental por sentinel; también llama `checkIfNeedsMore` al terminar una petición para llenar viewport.                                                                        |

En «Todos» las opciones incluyen fecha reciente/antigua; nota media ascendente/descendente; sin voto musical y sin voto de portada. Los valores `UNVOTED:rate` y `UNVOTED:cover` se traducen en frontend a `voted=false`, `votedType=rate|cover` y un orden por fecha. Para «Mis votos» se ofrecen fecha y voto propio ascendente/descendente; «Mis portadas», fecha y portada propia; «Favoritos», fecha y las dos escalas. Comentarios y pendientes no tienen selector visible.

Los seis modos son mutuamente excluyentes por radio. Los filtros comunes se conservan al cambiar de modo. Un cambio de modo restablece orden a recientes. No hay sincronización con query params de URL. La única persistencia identificada es la preferencia local del año/todos.

### Reset, carga, errores y consistencia (baseline previo a CAT-DISC-2d)

- Los watchers de `viewMode`, búsqueda, fecha, género, país y orden llaman `resetAndFetch`. Este vacía resultados y contadores y vuelve a offset cero; la fecha vuelve a actualizarse por controles de `DiscFilters`, no por una acción única «limpiar filtros».
- `DiscFilters` declara `resetAndFetch` en `emits`, y `DiscList` escucha el evento, pero no hay `emit("resetAndFetch")` en `DiscFilters.vue`.
- El bloqueo `if (loading) return` evita peticiones paralelas, pero también descarta el fetch de reset durante una petición activa. No se usan `AbortSignal`, token de solicitud ni comprobación de criterios al resolver. Está demostrado que puede quedar la respuesta previa bajo filtros nuevos y que no se dispara el refresco solicitado en ese momento; respuestas fuera de orden por concurrencia no son posibles mientras el bloqueo se mantenga.
- Búsqueda inmediata sin debounce: cada edición intenta activar reset/fetch. Durante carga, esas solicitudes se descartan; fuera de carga, cada cambio puede originar petición.
- El backend devuelve conteo total y página; la vista incrementa offset por 20. En `all` los discos sin imagen se filtran del grid después de recibir respuesta, aunque el contador y paginación conservan los totales server-side. Diferencia visible solo si el payload contiene esas imágenes vacías/nulas.
- `catch` solo hace `console.error`; no conserva un mensaje de error para UI. La pantalla muestra spinner, pero el grid principal carece de empty state explícito. La lista de comentarios sí presenta empty state al terminar la carga.
- `totalItems` se comparte para controlar paginación. Los contadores individuales por modo se limpian al reset y solo se rellenan al consultar ese modo; no son una instantánea de los seis conteos.

### Dónde se aplican

País, género, texto, fechas, voted y orden se envían a backend: los resultados no se filtran en cliente salvo ocultar entradas sin `image`. Backend aplica filtros tanto al query de datos como al de conteo. El selector de país/género, en cambio, usa opciones del catálogo completo en frontend. No se observó coordinación dinámica entre disponibilidad de opciones y resultados.

## Endpoints y contratos observados

El cliente agrega prefijo `/api` en runtime. Los endpoints listados corresponden a llamadas directas del árbol de página/tarjeta y consultas de opciones.

| Método y ruta                                                                                                 | Owner backend                                                     | Parámetros/validación y respuesta observada                                                                                                                                                                                                                                                                                                                                                                 | Auth y consumidor                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/catalog`                                                                                            | Catalog overview                                                  | Devuelve géneros y países completos; el frontend los ordena y guarda en Pinia.                                                                                                                                                                                                                                                                                                                              | Carga de App después de autenticar; opciones para Discos y otros consumidores.                                                                       |
| `GET /api/discs`                                                                                              | Catalog / `DiscsController -> DiscsService -> DiscCatalogService` | `limit`, `offset`, `query`, `dateRange`, `genre`, `country`/`countryId`, `voted`, `votedType`, `orderBy`. DTO tipa rango como array de al menos dos fechas; el servicio lo usa cuando hay dos. Default de servicio: límite 10/offset 0; esta vista envía 20/0. Respuesta `{totalItems,totalPages,currentPage,limit,data}`. Datos, filtros, conteo y orden se calculan en servidor; fecha futura se excluye. | `@Auth()`, usuario actual se usa para incluir rate/favorite/pending propios. Solo modo Todos.                                                        |
| `GET /api/rates`                                                                                              | Community Rates                                                   | CommunityListQueryDto: paginación, `query`, `type`, `dateRange`, `genre`, `country`, `orderBy`. La respuesta personal es paginada; la vista adapta `rate`/`cover` string a número.                                                                                                                                                                                                                          | `@Auth()`, filtra por usuario actual. Modos Mis votos/portadas; servicios declaran `Promise<DiscRate[]>` aunque se consumen como objeto paginado.    |
| `GET /api/comments`                                                                                           | Community Comments                                                | Mismos parámetros comunitarios; `getCommentsByUser` agrega `type=comment`. Respuesta paginada con comentario y disco para la lista personal.                                                                                                                                                                                                                                                                | `@Auth()`, comentarios del usuario actual. Tipo frontend `any`.                                                                                      |
| `GET /api/favorites`                                                                                          | Community Favorites                                               | Mismos parámetros, incluyendo `type` opcional; respuesta paginada con favorito/disco. La llamada de esta vista pasa `type` sin valor.                                                                                                                                                                                                                                                                       | `@Auth()`, favoritos del usuario actual. Tipo frontend `any[]` aunque vista consume paginación.                                                      |
| `GET /api/pendings`                                                                                           | Community Pendings                                                | Paginación, `query`, `dateRange`, `genre`, `country`; respuesta paginada.                                                                                                                                                                                                                                                                                                                                   | `@Auth()`, pendientes del usuario actual. Tipo frontend `any[]` aunque vista consume paginación.                                                     |
| `GET /api/rates/disc/:discId`                                                                                 | Community Rates                                                   | Devuelve votos del disco; la tarjeta calcula medias/contador y los muestra en VotesModal.                                                                                                                                                                                                                                                                                                                   | La ruta específica no tiene `@Auth()` en el controller del checkout backend revisado. Usada al abrir votos y refrescar medias.                       |
| `POST /api/rates`, `PATCH /api/rates/:id`                                                                     | Community Rates                                                   | Crear/actualizar `{discId,rate,cover}`; DTOs de Community; respuesta de creación incluye ID.                                                                                                                                                                                                                                                                                                                | `@Auth()`, el servicio valida ownership. Usado por la tarjeta.                                                                                       |
| `POST /api/favorites`, `DELETE /api/favorites/:id`                                                            | Community Favorites                                               | Crear `{discId}` / eliminar por ID.                                                                                                                                                                                                                                                                                                                                                                         | `@Auth()`, asociado al usuario actual. Usado por corazón.                                                                                            |
| `POST /api/pendings`, `DELETE /api/pendings/:id`                                                              | Community Pendings                                                | Crear `{discId}` / eliminar por ID.                                                                                                                                                                                                                                                                                                                                                                         | `@Auth()`, asociado al usuario actual. Usado por bookmark.                                                                                           |
| `GET /api/comments/disc/:discId`, `POST /api/comments`, `PATCH /api/comments/:id`, `DELETE /api/comments/:id` | Community Comments                                                | Lectura por disco; crear, actualizar, borrar comentario. `ComentsModal` contiene estas interacciones.                                                                                                                                                                                                                                                                                                       | Lectura por disco no está decorada con `@Auth()` en controller inspeccionado; escrituras y listado personal sí requieren `@Auth()` y usuario actual. |

Validación exacta de todos los DTOs de mutación y las reglas de negocio completas no se reconstruyeron aquí; la tabla se limita a los DTO/controladores consultados. Error HTTP 401/403 lo trata el interceptor Axios común: renueva sesión en el caso renovable y termina sesión/redirige si ya no es válida; ante 403 ofrece notificación salvo que ya haya una. `DiscList` no presenta errores propios por endpoint.

### Duplicación y capacidades a conservar

Los filtros de período/texto/género/país se repiten como parámetros entre Catalog y Community. La semántica se implementa en servicios backend distintos; no hay evidencia suficiente para afirmar que sus búsquedas u ordenamientos sean idénticos en todos los detalles. Frontend repite la misma lista de argumentos en ramas de `fetchData` y normaliza payloads con código parecido. La separación debe conservar los seis modos, combinabilidad, filtros del usuario, orden permitido por modo, contadores, scroll incremental, detalle/votos/comentarios, favoritos, pendientes y permisos de moderación.

## Estado y datos: Community e Identity

| Dato/acción                           | Fuente actual                                                                             | Actualización/aislamiento                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Resultados y conteos del listado      | `useDiscListCoordinator` y respuestas de `loadDiscList`                                   | Estado local sin caché Query; se reemplaza al cambiar criterios y solo acepta resultados de la generación vigente.          |
| Países y géneros                      | Pinia `catalog`                                                                           | Catálogo global, cargado una vez tras autenticación y compartido con varias vistas; no es información privada del usuario. |
| Rate/favorite/pending dentro de disco | Respuesta server-side de `/discs` o del listado Community, más estado local de `DiscCard` | Toggle favorito/pendiente cambia ID local; rating actualiza estado y medias locales. No se invalida una query del listado. |
| Votos en modal                        | Solicitud directa `/rates/disc/:id` al abrir y al refrescar media                         | Local a tarjeta/modal.                                                                                                     |
| Comentarios personales                | `/comments` en `DiscList`; comentarios del disco en `ComentsModal`                        | Dos consultas con propósitos diferentes. No se aprecia un cache/invalidation común.                                        |
| Dashboard summary                     | TanStack Query                                                                            | La tarjeta llama `mutateAndInvalidateDashboardSummary` tras votar; no convierte la lista general en Query.                 |

Identity está modularizado. `DiscListView` conserva la protección pública del Router y el coordinador consulta `useAuthStore` mediante la entrada pública `identity/auth` para incluir usuario, autenticación y generación de sesión en la identidad de los seis modos. Al cambiar usuario o perder sesión invalida generación y resultados privados; si ya no hay sesión no emite consultas. El transporte Axios central conserva token, renovación y redirección. Esta protección está probada con promesas controladas; no sustituye la autorización del backend.

La ruta permite a cualquier usuario autenticado. La edición del catálogo se oculta en la tarjeta para rol mínimo `riffvalley`; las acciones personales de rate/favorite/pending/comment se ofrecen desde una ruta autenticada y backend autoriza cada endpoint. Un 401/403 no se convierte en una vista de error específica del listado. La lectura de comentarios/votos por disco consultada en este backend parece pública; validar política desplegada queda fuera de esta auditoría.

## UX estática

**Método y límites:** lectura de template, clases y semántica HTML; no se abrió navegador, no se inició servidor local, no se capturaron pantallas y no se midió contraste. Por tanto, no hay observación visual verificada de escritorio/tablet/móvil ni comparación perceptual entre temas.

### Jerarquía y filtros

- La cabecera centra el título y descripción; el contenido coloca inmediatamente controles de búsqueda/país/género y los selectores de año/mes/período dentro de `DiscFilters`, después seis pills de modo y luego ordenación y resultados. Los controles tienen igual protagonismo y no explican explícitamente grupos «Buscar», «Explorar» o «Mi biblioteca».
- La estructura conceptual futura «Buscar → Explorar catálogo → Mi biblioteca → Resultados y ordenación» es compatible a nivel de capacidades, pero implicaría cambiar composición del filtro compartido: `DiscFilters` también lo usa TopDiscs y calendario con prop flags y layouts distintos. No reorganizarlo globalmente sin separar el caso de Discos o asegurar variantes y consumidores.
- Las seis categorías contienen opciones exclusivamente personales, pero en pantalla se presentan como seis filtros del mismo grupo. El único orden visible aparece condicionado por modo. Los contadores corresponden al modo consultado y se borran durante reset.

### Tarjetas y estados

- La tarjeta muestra metadatos de catálogo, dos medias, enlaces y controles Community. Votos, portada, votos existentes, comentario, compartir y guardar/favorito compiten en una tarjeta compacta con portada de 96 px; evidencia de densidad proviene de la cantidad y disposición de controles en el markup, no de una medición en viewport.
- País y género son secundarios respecto al nombre; las medias y acciones ocupan varias filas. «Mi biblioteca» no elimina la necesidad de acciones de tarjeta, por lo que moverlas al modo de biblioteca podría generar redundancia o conflicto.
- La página anuncia carga con spinner y texto; comentarios tienen estado vacío; grid no tiene copy de vacío ni mensaje de error. No se encontró feedback de carga con `aria-live` en la vista.
- Estados de favoritos/pendientes muestran icono y tooltip visual; varios elementos operables son `i`, `font-awesome-icon`, `div` o texto con `@click` sin botón/semántica keyboard. También hay botones con `focus:outline-none` y sin reemplazo `focus-visible` visible en markup. Títulos y nombres de artista clicables no son botones/enlaces. Son brechas estáticas de teclado/nombre accesible.
- Input de búsqueda depende de placeholder, sin `<label>` asociado. Los modos usan radio oculto dentro de label; no hay `fieldset`/`legend` explícito. La imagen principal tiene alt con título; imágenes de comentarios usan el nombre del disco.

### Responsive, temas y accesibilidad

- La cuadrícula usa `auto-fit/minmax(280px,1fr)`; filtros de catálogo pasan a 1 columna y luego 3; los modos usan 2 columnas por debajo de 640px y flex-wrap en pantallas mayores; lista de comentarios cambia de columna a fila en `sm`. Esto acredita intención responsive en clases, no que el resultado se haya validado visualmente.
- La tarjeta y la lista de comentarios declaran pares claro/oscuro. `DiscFilters` define variables con fondo blanco/texto oscuro y `!important` para `.pill-control`, sin variante oscura en la declaración; puede producir contraste/superficie diferente en modo oscuro. Contraste no medido. Colores dinámicos de género dependen de los datos.
- Los controles de modo tienen área de etiqueta relativamente grande; iconos de la tarjeta tienen áreas operables pequeñas (algunas sin caja de botón). No se midieron píxeles/targets en navegador.
- No se documenta si los estados hover/focus, truncamiento, dropdowns, scroll, zoom 200%, `prefers-reduced-motion` o teclado funcionan de extremo a extremo. Los selects compartidos tienen test de teclado propio, pero eso no cubre el filtro integrado.

## Cobertura de pruebas

| Área                                  | Pruebas encontradas                                                                                                                  | Qué protegen / límite                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vista `/disc-list`                    | `DiscListView.characterization.test.ts` (16 tests, sin todo) y `useDiscListCoordinator.test.ts` (6 tests)                             | Seis modos, mapeos, A→B en ambos órdenes, fallo obsoleto, cambios de sesión, A→B→C, páginas duplicadas, reinicio y final. No cubre backend real ni todas las combinaciones modo × filtro. |
| `DiscFilters`                         | `DiscFilters.sync.test.ts`                                                                                                           | Sincronización país/género y rangos año/mes/semana/todos; opciones completas, accesibilidad y combinaciones exhaustivas pendientes.                                                       |
| `SearchableSelect`                    | `SearchableSelect.keyboard.test.ts` (archivo local existente)                                                                        | Interacción por teclado del selector; no la integración con página.                                                                                                                       |
| `DiscCardComponent`                   | `DiscCardComponent.events.test.ts`                                                                                                   | Payload `rating-saved` en creación/edición/solo portada y fallo de guardado. No cubre favorite/pending, modales, permisos o accesibilidad.                                                |
| Servicio de Catalog                   | `services/discs/discs.test.ts`, `services/catalog/catalog.test.ts`                                                                   | Forma del wrapper GET discs/opciones y nulabilidad del catálogo; no hay contrato integrado de listado por modo.                                                                           |
| Community rates                       | `services/rates/rates.test.ts`                                                                                                       | Incluye parámetros de `getRatesByUser` además de las funciones ya cubiertas.                                                                                                              |
| Community comments/favorites/pendings | `comments.test.ts`, `favorites.test.ts`, `pendings.test.ts`                                                                          | Parámetros de wrappers y `type` observado cubiertos; no prueban autorización de backend ni todas las mutaciones de tarjeta.                                                               |
| TopDiscs                              | Tests en `modules/catalog/top-discs/**`                                                                                              | Vista, filtros/queries y presentación; protege consumidor compartido de tarjeta. En este checkout los archivos de TopDiscs incluyen cambios locales no confirmados.                       |
| Dashboard y otros consumidores        | Tests de widgets Random Disc, Adventure, Top Rated y Cemetery; `ArtistManagement` no tiene un test de contrato de tarjeta localizado | Propagación y evento parcialmente caracterizados; deben ejecutarse en futura regresión si cambia la tarjeta compartida.                                                                   |
| Router/Identity                       | `discListPermissions.test.ts`, `useDiscListCoordinator.test.ts` y suites existentes de Auth                                           | Metadata `/disc-list`, acceso autenticado, cambio de usuario y logout con consultas pendientes; no certifica renovación real ni backend.                                             |

CAT-DISC-2a ejecutó las suites descritas abajo. No se prueban exhaustivamente todas las combinaciones modo × filtro ni todas las acciones de tarjeta; se mantienen como regresión futura de consumidores.

## CAT-DISC-2a — Tests de caracterización

**Estado a cierre de CAT-DISC-2a:** completada; CAT-DISC-2b aún no había comenzado. En CAT-DISC-2a no se modificaron archivos productivos, componentes, estilos, contratos ni backend. El test de concurrencia reproduce y fija el defecto; no lo corrige.

### Modos, filtros y resultados caracterizados

La vista identifica los modos `all`, `rates`, `covers`, `comments`, `favorites` y `pendientes`. La suite monta la vista real y observa los argumentos enviados a los wrappers HTTP, las transformaciones de respuestas y la representación; los wrappers se mockean, no se contacta el servidor.

| Modo                         | Wrapper y endpoint                                                  | Caracterización añadida                                                                               |
| ---------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Todos (`all`)                | `getDiscs` — `GET /discs`                                           | Consulta inicial, criterios combinados, mapeo de discos/imágenes/total y props personales de tarjeta. |
| Mis votos (`rates`)          | `getRatesByUser` — `GET /rates`, tipo `rate`                        | Args, adaptación de filas y paginación de Community.                                                  |
| Mis portadas (`covers`)      | `getRatesByUser` — `GET /rates`, tipo `cover`                       | Args y adaptación de resultados a las tarjetas.                                                       |
| Mis comentarios (`comments`) | `getCommentsByUser` — `GET /comments`, wrapper añade `type=comment` | Parámetros, transformación/render de comentarios, página siguiente y mensaje vacío específico.        |
| Favoritos (`favorites`)      | `getFavoritesByUser` — `GET /favorites`                             | Parámetros, resultado y cambio de modo sin retener listado previo.                                    |
| Pendientes (`pendientes`)    | `getPendingsByUser` — `GET /pendings`                               | Parámetros, resultado y cambio de modo sin retener listado previo.                                    |

La prueba cubre búsqueda, fecha/rango (incluidos los valores emitidos por `DiscFilters`), país, género, combinación admitida, ordenación reciente y traducción especial de `UNVOTED`, cambio de modo con criterios activos y reset de página al cambiar criterios/modo. Las pruebas del filtro fijan valores predeterminados y rangos UTC de año, mes, semana y todos los años. No se inventan dependencias entre filtros.

La paginación observada es incremental: tamaño 20, `offset` avanza en bloques y `hasMore` se deriva de `totalItems`; no existe control de retroceso en la vista. Se caracterizan la consulta inicial, siguiente bloque, reset al cambiar filtro/modo, respuesta corta con más resultados según total, resultados personales, vacío y terminación cuando el total ya está alcanzado. No se cambió el mecanismo.

### Concurrencia, carga, vacío y error

La prueba determinista usa una promesa diferida: comienza A, cambia el criterio a B con A pendiente, verifica que no se emite una consulta B por la salida temprana `if (loading) return`, resuelve A y comprueba que queda representada con el control de filtro apuntando a B. Es una reproducción activa y pasa al fijar ese comportamiento. Hay un `it.todo` que deja explícita la expectativa futura de solicitar B y no representar A bajo B. El defecto sigue abierto para una fase posterior (CAT-DISC-2d o una tarea anterior si la separación lo exige).

Se fijó que el indicador de carga se activa y se limpia tras respuestas correctas, vacías y errores HTTP/red; las excepciones solo se registran en consola. No hay UI de error genérica ni estado vacío explícito para el grid general; comentarios sí tiene un mensaje vacío. El total visible proviene de respuesta y la vista descarta elementos sin imagen: el caso de discrepancia contador/tarjetas sigue siendo riesgo documentado, no se declara solucionado.

### Community, Identity y archivos

El test de ruta verifica `requiresAuth`/metadata, redirección anónima, acceso con sesión y salida al perder sesión. Se añadieron/extendieron pruebas de parámetros para wrappers de rates, comments, favorites y pendings. Las suites existentes del interceptor verifican 401/403; la suite de caché privada protege el aislamiento/limpieza de Query, aunque `DiscList` almacena resultados localmente y no usa Query. No se duplicó la cobertura interna exhaustiva de Identity/Community.

Pruebas creadas o ampliadas:

- `src/modules/catalog/discs/presentation/views/DiscListView.characterization.test.ts` — test trasladado junto a la vista; seis modos, filtros enviados, mapeos, paginación, estados y concurrencia.
- `src/components/DiscFilters.sync.test.ts` — ampliación del test local existente para fechas/rangos.
- `src/router/discListPermissions.test.ts` — guard específico de la ruta.
- `src/services/rates/rates.test.ts` — ampliación de contrato del wrapper personal.
- `src/services/comments/comments.test.ts`, `src/services/favorites/favorites.test.ts`, `src/services/pendings/pendings.test.ts` — contratos de wrappers sin cobertura previa.

Ejecución focalizada final: 15 archivos de test, **121 passed, 1 todo**. Incluyó suites de vista, filtros, tarjeta, servicios Catalog/Community, Router y pruebas relevantes de Identity/API/caché privada. Typecheck, ESLint y Prettier focalizados se registran en la entrega CAT-DISC-2a. El test todo no está ejecutándose ni falla; representa comportamiento deseado futuro.

Limitaciones CAT-DISC-2a: no se ejecutó build ni suite completa; no se usó navegador ni backend real; los datos se suministran mediante fixtures y wrappers mockeados. La comparación de gates arquitectónicos que requiere SHA base/head no se pudo acreditar en aquel checkout.

## CAT-DISC-2b — Migración modular de DiscList

**Estado:** completada. La vista y el test de caracterización se trasladaron sin extraer lógica ni cambiar comportamiento.

- Vista: `src/views/discsList/DiscList.vue` → `src/modules/catalog/discs/presentation/views/DiscListView.vue`.
- Test: `src/views/discsList/DiscList.characterization.test.ts` → `src/modules/catalog/discs/presentation/views/DiscListView.characterization.test.ts`; conserva expectativas, fixtures, reproducción de concurrencia y `it.todo`.
- Router: el lazy import de `/disc-list` apunta a la vista modular; path, nombre `DiscList`, `requiresAuth: true`, guards y redirecciones se conservan.
- Los únicos imports funcionales actualizados son el lazy import del Router y el import relativo de vista dentro del test. Imports de tarjeta, filtros, selects, servicios, store de catálogo, Community e Identity mantienen sus owners y ubicaciones.
- `DiscCardComponent.vue`, `DiscFilters.vue`, `SearchableSelect.vue`, servicios de Community, componentes de Calendar y stores no se movieron ni modificaron en esta fase.
- No quedan imports activos hacia el archivo legacy de `DiscList.vue`; `DiscListError.vue` permanece en `src/views/discsList/` y fuera del alcance.
- No se extrajeron servicios ni transformaciones, ni se alteraron filtros, paginación, estilos o contratos HTTP. La extracción HTTP corresponde a CAT-DISC-2c; la coordinación de criterios y la carrera conocida siguen para CAT-DISC-2d.

Verificaciones CAT-DISC-2b: Vitest focalizado, 6 archivos, **27 passed y 1 todo**; typecheck y build completados. ESLint pasó para Router y tests; lint del SFC conserva 10 diagnósticos que también aparecen al lintar el archivo original de `HEAD` (labels, dos componentes registrados no usados y dos `any`), por lo que son deuda preexistente y no se corrigieron en esta migración. Prettier pasó para el test trasladado, el test de Router y los roadmaps. Prettier informa formato pendiente en el SFC trasladado y `router/index.ts`; el SFC es idéntico byte a byte al origen y las diferencias de Router están en líneas no modificadas, por lo que se conservó el formato existente. También se mantuvo el formato preexistente de la tabla de `architecture.md`. `git diff --check` pasó. El chequeo de ciclos encontró 0 imports locales sin resolver y el mismo ciclo type-only existente `articles ↔ contents ↔ riff-valley-playlists`; no pudo comparar con HEAD local. El escaneo Markdown conserva un enlace preexistente a `roadmap/roles.md` que apunta fuera del repositorio. Build emitió avisos existentes de CSS `.flex-[2]`, tamaño de chunks y datos Browserslist antiguos.

El test de concurrencia A/B sigue pasando como reproducción del comportamiento actual y mantiene su `it.todo`; no se corrigió. No se ejecutaron backend, suite completa ni pruebas visuales de navegador.

## CAT-DISC-2c — Extracción de consulta y adaptación

**Estado:** completada. `DiscListView.vue` solicita páginas mediante un contrato interno y ya no importa ni escoge entre servicios HTTP. `application/loadDiscList.ts` adapta el servicio y los parámetros por modo, transforma rates/favorites/pendings y normaliza las notas del listado general. Los tipos de consulta y resultado viven en `types/discList.ts`; el tipo de página compartido vive en `services/api/pagination.ts`.

- Se reutilizan `getDiscs`, `getRatesByUser`, `getCommentsByUser`, `getFavoritesByUser` y `getPendingsByUser`; no se añadieron clientes ni endpoints.
- Se ajustaron solo las firmas TypeScript de las lecturas paginadas para reflejar el payload que la vista ya consumía. Endpoints, parámetros, cliente común, contexto autenticado y mutaciones permanecen iguales.
- El resultado usa una unión discriminada: discos normalizados para cinco modos, o comentarios y metadatos para `comments`. Se conservan `totalItems`, `totalPages`, `currentPage` y `limit`.
- La vista conserva `limit=20`, `offset`, append, `IntersectionObserver`, sentinel, reset, contadores, manejo de errores y guard `loading`. No se añadió caché, cancelación, watchers ni coordinación.
- Se añadieron siete casos de adaptación para enrutamiento/parámetros, modos, normalización de valores personales, campos de tarjeta, paginación, vacío y propagación de errores. La caracterización mantiene el `it.todo` de concurrencia.

Verificación local CAT-DISC-2c: 13 archivos Vitest focalizados, **102 passed y 1 todo**; typecheck y build pasan. ESLint del conjunto modificado señala diagnósticos previos de labels, componentes registrados y `any` en la vista/servicios; el identificador de tipo no usado detectado durante la extracción se eliminó. Prettier pasa para los cuatro archivos nuevos; el check conjunto informa formato preexistente en la vista, wrappers legacy y `docs/frontend/architecture.md`. La vista y Favorites usan CRLF; para `git diff --check` el repo debe reconocer CRLF como fin de línea (`core.whitespace=cr-at-eol`). `cycles` no encuentra referencias locales sin resolver y conserva el ciclo type-only Articles/Contents/Riff Valley Playlists; los comparadores de ciclos e Identity son informativos porque no se resolvió HEAD local. Build conserva avisos de CSS `.flex-[2]`, chunk grande y Browserslist desactualizado. No se ejecutaron backend ni CI.

**Estado histórico al cierre de CAT-DISC-2c:** al cambiar A→B durante una consulta, el guard `loading` rechazaba el reset y una respuesta antigua podía mostrarse bajo el criterio B. CAT-DISC-2d sustituyó esa caracterización por regresiones activas y corrigió el flujo; véase el cierre de CAT-DISC-2d a continuación.

## CAT-DISC-2d — Coordinación de estado y concurrencia

**Estado:** completada localmente. No se inició CAT-DISC-3 ni el rediseño visual.

### Diseño y responsabilidades

- `application/useDiscListCoordinator.ts` posee modo, búsqueda, rango de fechas, país, género, orden, tamaño/offset de página, resultados, total, carga inicial/adicional y error. Deriva carga total, `hasMore` y vacío.
- `application/loadDiscList.ts` sigue eligiendo los wrappers existentes y normalizando los seis formatos; no cambian endpoints, argumentos HTTP ni contratos públicos de Community.
- `DiscListView.vue` enlaza los criterios y resultados con los componentes actuales, y conserva el observer, scroll-to-top y formato de comentarios. No se introdujeron estilos ni componentes visuales nuevos.
- Las opciones de países y géneros siguen consumiéndose desde `useCatalogStore`; no se implementaron opciones dinámicas.

### Identidad y concurrencia

La identidad serializada de consulta incluye modo, búsqueda, rango de fechas, país, género y orden. Para modos personales también incluye autenticación, `userId` y `authSessionGeneration` de la entrada pública de Identity. Todo cambio detectado reinicia offset y resultados, limpia los estados anteriores y lanza offset 0. Cada consulta captura su generación e identidad; respuestas, errores y `finally` de generaciones anteriores no pueden mutar datos ni loading actuales. El coordinador no pasa `AbortSignal`; aunque `getDiscs` lo admite, las peticiones obsoletas siguen en vuelo y se ignoran al resolverse.

La carga adicional usa el mismo token vigente, tamaño fijo de 20 y un conjunto de offsets en vuelo. Se impide pedir una segunda copia de la misma página, se bloquea la carga incremental mientras hay otra activa y se descarta una página si cambia la identidad antes de responder. Offset avanza en bloques de 20 según el contrato existente; `totalItems` determina `hasMore` y la última página, incluso si una respuesta contiene menos de 20 elementos.

### Regresiones y resultado de gates

- La regresión A→B confirma que B se solicita mientras A sigue pendiente, y que únicamente B queda visible si B responde antes o después de A. Un fallo tardío de A tampoco aparece como error de B. Se eliminó el `it.todo` tras cubrirlo con pruebas activas.
- Las pruebas de coordinador cubren secuencia rápida A→B→C, cambio entre modos y usuarios con solicitud pendiente, logout, deduplicación de página adicional, cambio de filtro con página posterior pendiente, offset/total, vacío y final de paginación.
- Verificación focalizada: coordinador, caracterización, adaptador, DiscFilters y permisos de ruta; **34 tests passed**. El conjunto Community/Identity seleccionado pasó **79 tests**. Typecheck y build pasaron.
- `pnpm test`: **101 archivos y 737 tests passed**, incluidos tests de TopDiscs, Dashboard, Community e Identity. No acredita CI ni backend real.
- ESLint pasó para composable y tests; sobre `DiscListView.vue` informa seis reglas `label-has-for` en los labels de modo, que no se modificaron en CAT-DISC-2d. No se atribuyen contra una base porque la comparación base/head está incompleta. Prettier pasó para los archivos nuevos y los tests actualizados; reporta formato en el SFC, `roadmap/catalog-discs-audit.md` y `docs/frontend/architecture.md`, preservado para no reescribir template/estilos ni tablas documentales fuera de alcance.
- `git -c core.whitespace=cr-at-eol diff --check` pasó, reconociendo los finales CRLF que conservan la vista y servicios legacy. `cycles` reporta el ciclo type-only Articles/Contents/Riff Valley Playlists ya documentado y 0 imports sin resolver; `identity:boundaries` encuentra 0 violaciones productivas. Ambas comparaciones delta son informativas porque no se resuelve `HEAD` local. El escaneo de enlaces Markdown reporta un enlace externo al repositorio ya existente (`roadmap/roles.md:9`).
- Build emite avisos existentes de selector CSS `.flex-[2]`, chunk mayor a 500 kB y datos Browserslist antiguos. No se ejecutaron backend ni CI.

### Límites y dependencias de fase 3

La UI mantiene el spinner y el estado vacío actual de comentarios; la grilla no añade mensaje vacío o de error, y el coordinador conserva el error para una futura presentación/retry. Los contadores siguen representando `totalItems` del servidor mientras la grilla omite discos sin imagen. Fase 3 puede decidir copy/estados vacíos, retry y semántica de contador, así como persistencia/limpieza explícita de filtros; no requiere rehacer la política de aislamiento ni opciones dinámicas de país/género (CAT-DISC-3). La paginación continúa siendo hacia delante.

## CAT-DISC-3e — Aislamiento de sesión

**Estado:** completada localmente. Se mantiene el contrato HTTP legacy; no se integra `GET /api/discs/list` ni `/options`, no se cambia la vista ni se inicia CAT-DISC-3f.

La identidad serializada de consulta contiene siempre modo, búsqueda, fechas, país, género, orden y el contexto de Identity (`isAuthenticated`, `userId`, `authSessionGeneration`). Se eliminó la excepción que dejaba `all` fuera de ese contexto. La guarda de autenticación se aplica a todos los modos, de modo que no se lanzan lecturas privadas si no hay usuario autenticado.

Al cambiar o finalizar sesión, el watcher existente incrementa la generación de consulta, vacía páginas en vuelo y reinicia resultados, comentarios, totales, offset, error y estados loading. Un login posterior crea una identidad nueva y carga desde offset 0. Éxitos, errores y `finally` de la sesión anterior no pueden alterar el estado vigente; las páginas de sesiones distintas no se mezclan. El logout/redirección siguen siendo responsabilidad del flujo existente de Identity. No se añadió cancelación de transporte.

La prueba determinista cubre cambio de usuario en `all`, `rates`, `covers`, `comments`, `favorites` y `pendientes`; logout durante paginación; login tras logout; éxito/error tardío; página antigua; ausencia de consultas sin sesión; reinicio de resultados y totales. Verificaciones CAT-DISC-3e: Vitest focalizado, **11 archivos y 94 tests passed** (coordinador, caracterización, adaptador, Router, Auth y servicios Community); `pnpm run build` completó typecheck y build; ESLint focalizado pasó. Prettier pasó en ambos archivos TypeScript y `roadmap.md`; los dos informes de auditoría muestran formato pendiente en su estado documental local y se conservaron sin reescritura general. `cycles` pasó con el ciclo type-only Articles/Contents/Riff Valley Playlists ya existente y 0 ciclos nuevos; `identity:boundaries` pasó con 0 infracciones. `markdown:links:delta` es informativo porque exige base/head completos. `git diff --check` se ejecutó reconociendo CRLF. Una invocación inicial del script de tests lanzó la suite completa por el separador `--` y mostró un fallo ajeno al alcance en Dashboard (`8,2`); la ejecución focalizada correcta pasó completa.

**Límite:** la petición obsoleta continúa en transporte hasta resolverse; el aislamiento lógico de generación evita que escriba estado local. No se valida autenticación/backend real ni se modifica Identity globalmente.

## Riesgos de refactorización

Probabilidad: estimación cualitativa basada en alcance y acoplamiento observados, no en frecuencia de incidentes.

| Riesgo                                            | Probabilidad / impacto  | Evidencia                                                                                                                                           | Mitigación propuesta                                                                                                                     |
| ------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Regresión en TopDiscs                             | Media / Alto            | TopDiscs comparte `DiscCardComponent`; contrato de `rating-saved` se escucha para refrescar query y la vista pasa varios campos de ranking.         | No cambiar la tarjeta en CAT-DISC-2; tests focalizados de TopDiscs al tocar su contrato y build/typecheck en cambios TS/Vue funcionales. |
| Regresión en Dashboard                            | Media / Alto            | Cuatro widgets usan la misma tarjeta; algunos dependen del evento tras votar y de mutación del resumen.                                             | Mantener API de card; ejecutar pruebas de consumidores Dashboard en cambios compartidos.                                                 |
| Cambios accidentales en otros usuarios de filtros | Media / Alto            | `DiscFilters` se usa en Discos, TopDiscs, Calendar, CalendarBaby, DiscByDate y DiscListError.                                                       | Crear composición/variante exclusiva de Discos si se cambia jerarquía; no alterar defaults compartidos sin matriz de consumidores.       |
| Cambio de comportamiento de filtros / modos       | Alta / Alto             | Seis endpoints y dos tipos de respuesta, watch múltiple y transformaciones manuales.                                                                | Caracterizar cada modo y combinaciones antes de mover; conservar params, defaults, conteos y selección activa.                           |
| Respuesta antigua gana a selección nueva          | Alta / Alto             | El reset se descarta mientras `loading`; no hay señal de cancelación ni validación de criterios.                                                    | Resolver ciclo de solicitudes de forma explícita en una fase funcional; cubrir cambio durante carga con test determinista.               |
| Conteo diverge de tarjetas                        | Media / Medio           | El grid excluye discos sin `image`, pero `totalItems` viene del backend sin exclusión visible.                                                      | Caracterizar payloads nulos; acordar si conteo representa resultados elegibles o visibles antes de cambiar presentación.                 |
| Invalidación insuficiente al mutar Community      | Media / Medio           | Datos de la tarjeta se actualizan localmente; el listado no usa Query; al cambiar modo vuelve a consultar.                                          | Mantener y documentar política de refresh por modo, probar operaciones personales y vistas cacheadas si se introduce Query.              |
| Dependencia circular o cruce de owner             | Media / Alto            | Card importa directamente Calendar, servicios Community e invalidación de Dashboard; top-level legacy no está cubierto por gate de módulos.         | Primer traslado solo de vista; dibujar dependencias y usar contratos públicos cuando existan, sin imports profundos entre módulos.       |
| Cambio de permisos                                | Baja / Alto             | Ruta exige sesión; tarjeta usa Identity para esconder edición Calendar; servidor autoriza endpoints.                                                | Conservar `requiresAuth`, condición `riffvalley` y no inferir autorización de UI; probar 401/403 y rol por separado.                     |
| Cambio involuntario de contratos HTTP             | Media / Alto            | API legacy débilmente tipada; servicio personal declara respuesta array pero pantalla consume objeto paginado.                                      | En fase independiente, fijar DTOs a respuestas observadas y mantener nombres/params/endpoints durante la separación.                     |
| Cambios visuales colaterales                      | Alta / Medio            | Filtros y tarjeta se comparten; cambios CSS globales pueden afectar modos oscuro/otros consumidores.                                                | Sin estilos en fase 2; después aislar CSS y verificar claro/oscuro y viewports con evidencia visual.                                     |
| Pérdida de cobertura                              | Media / Medio           | CAT-DISC-2a ya cubre los flujos esenciales, pero no toda combinación modo × filtro ni todas las acciones de tarjeta.                                | Conservar la suite de caracterización y ampliar solo escenarios afectados; conservar suites de consumidores compartidos.                 |
| Cambio de usuario conserva estado local           | Mitigado en CAT-DISC-3e | El coordinador incorpora usuario/generación de sesión a los seis modos y descarta peticiones previas; cubierto con promesas controladas. | Mantener tests al cambiar el ciclo de Auth o migrar las APIs; la respuesta tardía se ignora, no se cancela en transporte.                     |

**Hallazgo histórico CAT-DISC-2f:** `all` consultaba `GET /api/discs`, protegido por Auth y con metadata del usuario, pero omitía sesión en su identidad. CAT-DISC-3e cerró esta brecha local: `all` comparte identidad de sesión y guardas con los otros cinco modos, limpia estado al logout y descarta respuestas tardías. No se observó exposición backend; el cierre está verificado con promesas diferidas.

## Arquitectura objetivo propuesta

Una estructura liviana siguiendo `modules/catalog/top-discs`, sin copiar todos sus patrones ni mover dependencias por conveniencia:

```text
src/modules/catalog/discs/
  presentation/
    views/DiscListView.vue            # composición de ruta /disc-list
    components/                       # UI exclusiva que se extraiga con motivo
  composables/
    useDiscList...                     # filtros, paginación o coordinación cohesionada
  types/                               # contratos de vista/listado de esta capacidad
```

### Candidatos a mover o extraer

1. [Completada en CAT-DISC-2b] Mover `src/views/discsList/DiscList.vue` a `src/modules/catalog/discs/presentation/views/DiscListView.vue`; solo actualizar import del Router, manteniendo path, nombre y meta. No cambiar comportamiento/estilos en ese movimiento.
2. Mantener en el owner de Disc List la coordinación de modo, criterios, respuesta y paginación; extraer solo unidades de responsabilidad demostrada, por ejemplo la lista visual de comentarios y el composable coordinador. Definir los tipos de respuesta paginada junto a sus owners antes de quitar `any`.
3. Consumir inicialmente `getDiscs`, la store del catálogo y servicios legacy de Community a través de su superficie existente. La creación de API modular de Community queda condicionada a existir una entrada pública y a asignar owner; no duplicar HTTP en Catalog.

### Permanecen en su ubicación actual durante separación inicial

- `DiscFilters.vue`, `SearchableSelect.vue` y `SimpleSelect.vue`: varios consumidores confirmados. Se preservan sus props/emits; una nueva organización exclusiva de Discos puede componerse en el módulo sin alterar la API compartida.
- `DiscCardComponent.vue`: transversal y de alto riesgo. Preservar ubicación, props, evento y comportamiento para TopDiscs, Dashboard, Artist Management y listados. Posible partición futura de acciones Community/modales/reproductor solo después de acordar ownership y probar cada consumidor.
- `useCatalogStore` y `getCatalog`: compartidos; el módulo consume datos ya cargados por App.
- Servicios `discs`, `rates`, `comments`, `favorites`, `pendings`: permanecen como contratos de transporte legacy hasta su migración por owner.
- `DiscListError.vue`: se mantiene aparte hasta decidir si comparte presentación o requiere manejo de error distinto.

### Dependencias y contratos

- La presentación de `disc-list` puede depender internamente de Catalog y de entradas públicas de otras capacidades cuando existan; los servicios API no deben depender de componentes/vistas.
- Evitar que módulos Dashboard/Community dependan de internals de `disc-list`. Evitar ciclos mediante composición en Router/App o contratos dirigidos.
- Mantener `/disc-list`, `requiresAuth`, query params backend, seis modos, props/emits públicos de la tarjeta y condiciones Identity.
- No declarar `shared/ui` como owner automático de filtros o tarjeta. Su semántica de disco y acciones requiere conservar propiedad explícita.

## Roadmap incremental propuesto

Los identificadores y criterios son propuesta, no autorización para iniciar tareas. El orden separa migración, comportamiento y diseño. Tamaño estima trabajo frontend acotado, no dependencias externas.

### Fase 2 — Separación modular, sin cambios funcionales ni visuales

| ID           | Objetivo y alcance                                                                                                                                   | Dependencias | Criterios de aceptación                                                                                                           | Pruebas necesarias                                                                          | Tamaño |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| CAT-DISC-2.1 | [Completada en CAT-DISC-2a] Caracterizar los seis modos, parámetros, mapeos, filtros, paginación, estados y carrera actual.                          | CAT-DISC-1   | Suite focalizada activa pasa; defecto fijado como comportamiento actual y expectativa deseada pendiente; sin cambios de producto. | `DiscListView.characterization.test.ts`, filtro, servicios, ruta y regresión relacionada.   | M      |
| CAT-DISC-2.2 | [Completada en CAT-DISC-2b] Trasladar vista y test a `modules/catalog/discs/presentation/views`, actualizando el lazy import del Router.             | 2.1          | URL `/disc-list`, metadata y contenido observable conservados; sin cambios funcionales, estilos o contratos.                      | Tests focalizados de ruta/vista, typecheck y build.                                         | S      |
| CAT-DISC-2.3 | [Completada en CAT-DISC-2c] Extraer transporte HTTP y adaptación de respuestas al owner de Catalog/Community que corresponda, sin cambiar contratos. | 2.2          | Vista consume contrato interno; seis modos, parámetros y paginación observables se conservan; sin duplicación ni ciclos nuevos.   | Adaptador, servicios, caracterización, gates, typecheck/build.                              | M      |
| CAT-DISC-2.4 | [Completada en CAT-DISC-2d] Coordinar filtros y solicitudes, resolviendo la carrera de concurrencia con política explícita.                          | 2.3          | La consulta visible corresponde a filtros/sesión actuales; reset, carga incremental y seis modos conservados.                       | Promesas diferidas para concurrencia, filtros, sesión y paginación; gates arquitectónicos.   | M      |

### Fase 3 — Mejora funcional y coordinación

| ID           | Objetivo y alcance                                                                                                        | Dependencias                                   | Criterios de aceptación                                                                                                | Pruebas necesarias                                               | Tamaño |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| CAT-DISC-3.1 | Consolidar estado de filtros y definir reset explícito sin cambiar criterios admitidos.                                   | Fase 2; decisión de UX sobre grupos de filtros | Una fuente de verdad para selección; reset coherente; filtros visibles/activos reflejan parámetros enviados.           | Unit tests de transiciones combinadas y reset por modo.          | M      |
| CAT-DISC-3.2 | Coordinar solicitudes de búsqueda/paginación y carga incremental, evitando datos de criterios obsoletos.                  | 3.1                                            | Cambios rápidos y cambios durante fetch no mezclan páginas; cancelación/identificación definida; conteos consistentes. | Tests con promesas diferidas/cancelación y paginación.           | M      |
| CAT-DISC-3.3 | Mejorar estados vacíos, error y retry; acordar semántica de contador con imágenes ausentes.                               | 3.2; decisión de contrato/UX para contador     | Todos los modos indican vacío/error/carga; contador corresponde al criterio acordado; retry no duplica páginas.        | Tests de estado para seis modos y conteo.                        | S      |
| CAT-DISC-3.4 | Revisar opciones de orden y filtros por modo, conservando todos los comportamientos actuales salvo decisiones explícitas. | 3.1                                            | Cada modo muestra controles válidos; query refleja solo valores soportados; sin resets sorpresa.                       | Tabla de casos por modo y tests contractuales backend mockeados. | S      |

CAT-DISC-2d ya provee una fuente de verdad para criterios enviados, resultados y concurrencia. La fase 3 sigue pendiente; antes de ejecutarla, sus tareas 3.1–3.2 deben enfocarse en la interacción de reset y decisiones de UX/reintento, sin duplicar el coordinador ni mover el estado interno de año/mes/semana de `DiscFilters` sin revisar consumidores compartidos.

### Fase 4 — Mejora visual/UX

La dirección conceptual aprobada por el usuario es **Buscar → Explorar catálogo → Mi biblioteca → Resultados y ordenación**. Esto no aprueba cambios en `DiscFilters` compartido ni en la tarjeta; la composición y los contratos concretos siguen pendientes.

| ID           | Objetivo y alcance                                                                                       | Dependencias                                                                       | Criterios de aceptación                                                                                                                                             | Pruebas necesarias                                                                                   | Tamaño |
| ------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| CAT-DISC-4.1 | Prototipar/validar agrupación de filtros exclusiva de Discos sin alterar consumidores de `DiscFilters`.  | Fase 3; definir composición e interacción concreta dentro de la dirección aprobada | Grupos y filtros activos legibles en escritorio/móvil; combinabilidad y limpieza claras.                                                                            | Revisión con navegación teclado y pruebas de componente; verificación visual en viewports acordados. | S      |
| CAT-DISC-4.2 | Reducir densidad percibida de tarjetas organizando acciones primarias/secundarias, sin quitar funciones. | 4.1; decisión de alcance de tarjeta compartida                                     | Votos, portada, favoritos, pendientes, comentarios, reproducción, compartir y moderación siguen accesibles; contrato de Card conservado o migrado con consumidores. | Tests de acciones y regresión Card en DiscList, TopDiscs, Dashboard y ArtistManagement.              | M      |
| CAT-DISC-4.3 | Validar responsive, tema claro/oscuro y accesibilidad de controles, foco, tamaños y estados.             | 4.1–4.2                                                                            | Evidencia de navegador en tamaños representativos y ambas temas; teclado/nombres/empty/error revisados.                                                             | Auditoría manual visual y a11y; pruebas automatizadas aplicables.                                    | M      |

### Fase 5 — Regresión y cierre

| ID           | Objetivo y alcance                                       | Dependencias        | Criterios de aceptación                                                                                                        | Pruebas necesarias                                                                                     | Tamaño |
| ------------ | -------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------ |
| CAT-DISC-5.1 | Regresión integral de Discos y consumidores compartidos. | Fases 2–4 aprobadas | Seis modos, filtros, orden y paginación; 401/403; mutaciones; TopDiscs y Dashboard preservados.                                | Suites focalizadas, typecheck/build según cambios, e2e acordado; registrar qué se ejecutó local vs CI. | M      |
| CAT-DISC-5.2 | Cierre documental, contratos y deuda restante.           | 5.1                 | Roadmap marca resultados reales; límites backend/producción y pendientes se registran; no declarar validaciones no realizadas. | Markdown links y `git diff --check`.                                                                   | XS     |

## Decisiones pendientes

1. Definir cómo materializar la dirección de filtros ya aprobada para Discos: composición exclusiva o variantes, manteniendo `DiscFilters` estable para TopDiscs/calendarios.
2. Definir qué representa el contador si hay discos devueltos sin imagen y si la política de filtrar portada vacía debe mantenerse.
3. Aprobar el límite entre Catalog y Community para futuras APIs públicas; hoy Community sigue en servicios legacy.
4. Decidir en una fase de UX qué acciones de tarjeta son primarias/secundarias y si una partición de la tarjeta transversal está dentro del alcance. No se propone quitar funciones.
5. Decidir persistencia futura de criterios/URL; la implementación actual solo persiste el default «todos los años» vía localStorage.
6. Validar la política desplegada de endpoints de lectura por disco y probar cambios de usuario en navegador; la auditoría solo inspeccionó controller/backend del checkout hermano.

## Referencias canónicas y evidencia

- [Índice frontend](../docs/frontend/index.md), [arquitectura](../docs/frontend/architecture.md), [convenciones](../docs/frontend/conventions.md), [Identity](../docs/frontend/modules/identity.md) y [sistema de diseño](../docs/design-system.md).
- [TopDiscs cerrado](catalog-top-discs.md), [Catalog Overview](catalog-overview.md) y [índice de roadmaps](../roadmap.md).
- Frontend inspeccionado en CAT-DISC-1: `src/router/index.ts`, `src/layouts/default/components/routes.json`, `src/views/discsList/DiscList.vue` (luego trasladada a `src/modules/catalog/discs/presentation/views/DiscListView.vue`), `src/components/DiscFilters.vue`, `src/components/DiscCardComponent.vue`, `src/stores/catalog/catalog.ts`, `src/services/{discs,rates,comments,favorites,pendings,catalog}`.
- Backend consultado en checkout hermano: `src/catalog/discs/discs.controller.ts`, `src/catalog/discs/dto/discs-list-query.dto.ts`, `src/catalog/discs/catalog/disc-catalog.service.ts`, `src/community/{rates,comments,favorites,pendings}` y `src/catalog/discs/__tests__/D0-baseline.md`.
- No hubo navegación local integrada, captura visual, ejecución de suites, llamada a backend o verificación de CI/producción.
