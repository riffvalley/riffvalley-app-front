# CAT-ART — Evolución de Artistas

## CAT-ART-1 — Auditoría

**Estado:** completada documentalmente el 2026-10-29. No se modificaron código ni tests, no se ejecutaron acciones de Artistas, no se consultó Spotify/Last.fm y no se accedió a producción. La inspección backend corresponde al checkout hermano disponible, no a un entorno desplegado.

**Alcance:** vista `/artists`, contratos frontend/backend observables, diseño de navegación alfabética y sugerencias, y traza estática completa del botón «Rellenar imágenes». La evolución del botón queda pendiente de decisión; no se define aquí su comportamiento futuro.

### Estado actual y arquitectura

- En CAT-ART-1 la página estaba en `src/views/artists/ArtistManagement.vue`; CAT-ART-6a la trasladó a [ArtistManagementView.vue](../../src/modules/catalog/artists/presentation/views/ArtistManagementView.vue). La paginación y sus tests ahora están en `src/modules/catalog/artists/application/`; el servicio legacy queda pendiente de CAT-ART-6b.
- Router declara `/artists` con `requiresAuth: true` y `requiresRole: "riffvalley"`; el menú también declara `requiredRole: riffvalley`. La vista calcula `isManager` con `hasMinimumRole(..., "riffvalley")` y oculta edición, eliminación, revisión pendiente y rellenado de imágenes al resto.
- La pantalla llama `GET /artists/management`, `GET /countries`, `GET /genres`, `GET /rates/disc/:id` y, al abrir la ficha, `GET /lastfm/artist` y `GET /spotify/artists/search`. Editar y borrar usan `PATCH /artists/:id` y `DELETE /artists/:id`.
- `getArtistsManagement` pagina con `limit=30`, `offset` y filtros `query`, `genreId` y `needsReview`. El cambio de género/revisión carga página 1. La búsqueda actual espera **400 ms** y vuelve a página 1. Los botones anterior/siguiente respetan límites y carga; `getArtistManagementPaginationState` permite recuperar explícitamente una página que quedó fuera de rango.
- El backend `ArtistManagementService.findAllForManagement` ordena por `artist.updatedAt DESC`, pagina en base de datos y calcula el total con los mismos filtros. Devuelve artista, país, discos con género/contadores, lanzamientos nacionales y asociaciones de playlists. No hay orden alfabético ni cursor; a igualdad de `updatedAt` no hay desempate declarado.
- Carga de la lista muestra spinner y texto; cero resultados tiene mensaje propio. Un error del listado se presenta como toast y conserva las filas anteriores, por lo que una respuesta fallida tras cambiar criterios puede dejar datos viejos visibles mientras el filtro ya cambió. Las cargas iniciales de países/géneros no tienen feedback de error independiente. El fetch no usa generación/AbortSignal, por lo que búsquedas rápidas pueden resolver fuera de orden; el temporizador tampoco se limpia al desmontar la vista.
- La ficha que abre el nombre/«ver más» es un modal Last.fm embebido en la vista: biografía, tags, estadísticas, enlaces y similares, además de discos del registro local. `toggleLastFm(artist)` retiene el `artist.id` para su caché local, pero consulta Last.fm/Spotify por nombre. El modal compartido `src/components/ArtistDetail.vue` es otro flujo de Spotify por nombre de artista y disco; no es la ficha de gestión ni conserva un ID de artista del catálogo.
- Acciones disponibles para `riffvalley`: revisar pendientes, filtrar por género, editar nombre/país/imagen/descripción, buscar imagen en Spotify desde el editor y eliminar un artista tras confirmación. El backend también tiene `DELETE /artists/orphans/all`, pero no se encontró un botón/call-site de esa operación en esta vista.

### API, datos de dominio y tests existentes

En el checkout backend, `ArtistsController` publica:

| Operación | Contrato observado | Permiso observado |
|---|---|---|
| `GET /artists` | Listado paginado básico | Sin `@Auth` en este handler |
| `GET /artists/management` | `query`, `limit`, `offset`, `genreId`, `needsReview`; respuesta `{totalItems,totalPages,currentPage,limit,orphanCount,data}` | Sin `@Auth` en este handler |
| `GET /artists/:id` / `GET /artists/:id/details` | Registro o ficha por ID | Sin `@Auth` en estos handlers |
| `GET /artists/search/by-name?name=` | Búsqueda parcial normalizada; devuelve cada ID coincidente con país, imagen y discos | Sin `@Auth` en este handler |
| `POST /artists`, `PATCH /artists/:id`, `DELETE /artists/:id`, `DELETE /artists/orphans/all` | Escrituras/limpieza | `@Auth(ValidRoles.riffvalley)` |

La pantalla añade su propio guard de ruta/UI, pero los endpoints de lectura del catálogo no declaran autenticación en el controller inspeccionado. Esto describe solo el código del checkout; no es una prueba de exposición de un entorno remoto.

`Artist` tiene UUID, nombre, imagen, descripción, `countryId`, `needsReview`, `name_normalized` y `search_name_normalized`; país es `ManyToOne` y discos `OneToMany`. Lanzamientos nacionales se recuperan por comparación de `artistName` textual sin distinguir mayúsculas; playlists se relacionan por ID. `ArtistManagementQueryDto` valida tipos enteros positivos de `limit`, no declara un máximo, y acepta booleano serializado para `needsReview`.

Hay dos normalizaciones con propósitos distintos. `normalizeForSearch()` descompone diacríticos, los quita, minúsculiza y compacta espacios. `normalizeMusicName()` aplica NFKD, elimina marcas combinantes y puntuación y contempla equivalencias musicales como `ø→o`, `æ→ae`, `œ→oe`, `ł→l`, `ð→d`, `þ→th` y `ß→ss`. La búsqueda por nombre usa claves normalizadas, coincidencia parcial y una variante de artículos iniciales ingleses para recuperar candidatos. Las helpers documentan expresamente que esto no establece identidad ni deduplicación.

Pruebas localizadas, no ejecutadas en CAT-ART-1:

- Frontend: `src/services/artist/artist.test.ts` comprueba los parámetros del endpoint management; `src/views/artists/artistManagementPagination.test.ts` cubre páginas normales, vacías, recuperación y bloqueo de navegación inválida. No se encontró test de componente para `ArtistManagement.vue`, ni test del flujo frontend de rellenado masivo.
- Backend: tests de controller, DTO, servicio management, búsqueda, normalización, escritura, ficha, catálogo y orphans están bajo `src/catalog/artists/**/__tests__` o `**/*/__tests__`. Spotify dispone de tests de controller y `SpotifyPublicApiService`; Last.fm tiene tests de controller/servicio, pero su `fill-images` corresponde a portadas de discos por semana, no a fotos de artistas.
- El frontend aún exporta `searchArtists(query)` para `/artists/search`, pero el `ArtistsController` inspeccionado no declara ese endpoint y no se encontró ningún consumidor frontend. Sí existe `searchArtistsByName(name)` para `/artists/search/by-name`, usado al abrir artistas similares en el modal.
- El tipo frontend `ArtistWithCountry` declara `country` y `countryId` como obligatorios; el servicio backend de `by-name` devuelve `country: null` cuando falta país. Una sugerencia deberá tratar país como opcional y el contrato TypeScript existente no refleja completamente esa respuesta.

## Propuesta CAT-ART-2 — Navegación A–Z

La fila solicitada será `A`–`Z`, sin `Ñ`, con `A` activa al entrar y exactamente una letra activa. La selección será estado local de la página; cambiar de letra reiniciará `offset` a cero. El backend debe filtrar **antes de paginar** y aplicar el mismo predicado tanto al query de datos como al `countQb`, conservando `genreId` y `needsReview`.

Propuesta técnica mínima: ampliar `ArtistManagementQueryDto` y `ArtistsService.findAllForManagement` con una letra inicial normalizada. El predicado toma la primera letra latina del nombre normalizado persistido (`search_name_normalized`, con fallback de compatibilidad a `name_normalized` cuando sea null) y se ejecuta en SQL antes de `take/skip`. El orden de las filas de una letra debería tener desempate estable por nombre normalizado, nombre visible e ID, en vez del orden actual mutable por `updatedAt`.

`Á` y `Ö` quedarían en A y O. La normalización existente también convierte `Ñ` en N al eliminar el tilde; el selector no crea una categoría Ñ y esos nombres quedarían en N. La búsqueda textual usa el algoritmo musical ya existente; no requiere cambiar las claves de identidad ni la deduplicación.

Casos fuera de A–Z que requieren decisión de producto:

- Nombres que empiezan por número, emoji o símbolo no pertenecen a una letra. Se propone un filtro adicional `#`/«Otros» contiguo a la fila para no ocultarlos ni asignarlos arbitrariamente a A. Si la fila debe contener exclusivamente las 26 letras, decidir si esos artistas se incluyen en una vista «Todos» secundaria o se asignan a una letra concreta.
- Propuesta inicial: «The Beatles» se clasifica en T, tal como está escrito. La equivalencia de artículos del buscador actual solo recupera candidatos; no define orden alfabético. Si se desea ordenar ignorando `The`, debe acordarse como regla de presentación independiente y mantener el nombre original y la identidad intactos.
- También deben decidirse el comportamiento al no existir resultados y si cambiar letra conserva los filtros actuales de género y pendientes (recomendación: sí).

### Subtareas propuestas

La descomposición inicial de CAT-ART-2 se actualizó después de auditar la ficha existente. La nueva secuencia y los hallazgos están en [CAT-ART-2a — Auditoría del modal](cat-art-2a-auditoria-modal-artistas.md). CAT-ART-2b/2c resolvieron las reglas pendientes de directorio: `#` agrupa números y símbolos, «The» permanece bajo T y una consulta `q` busca globalmente e ignora la letra. El frontend no repite normalización.

1. **CAT-ART-2a — Auditoría del modal:** completada documentalmente; sin implementación.
2. **CAT-ART-2b — Backend del directorio A–Z:** completada en backend; contrato paginado ligero, búsqueda y colores documentados en el roadmap backend.
3. **CAT-ART-2c — Directorio A–Z frontend:** completada en frontend; pills, búsqueda global y paginación progresiva sobre el endpoint de directorio. El detalle del artista queda preparado por ID y pendiente de 2d.
4. **CAT-ART-2d — Ficha compartida e integración:** completada en frontend el 2026-10-29; detalle común por ID para Favoritos y Directorio, con discografía Catalog completa, Last.fm y navegación por IDs fiables. Detalle en [seguimiento CAT-ART-2d](cat-art-2a-auditoria-modal-artistas.md#seguimiento-posterior--cat-art-2d).
5. **CAT-ART-2e — Filtro por género:** completada en frontend y backend el 2026-10-29. `/artists/directory` acepta `genreId` UUID y aplica `EXISTS` por relaciones Artist–Disc–Genre antes de contar y paginar. El filtro combina con letra y búsqueda, conserva el color del disco más reciente y no duplica artistas. El frontend carga el catálogo existente de géneros, incluye el filtro en las claves de consulta y mantiene el modal/criterios al abrirlo. Ver [implementación y evidencia](cat-art-2e-filtro-genero.md).

## CAT-ART-3 — Autocompletado descartado

La iniciativa se descarta y no debe implementarse. El siguiente bloque activo de este roadmap no forma parte de CAT-ART-2e.

### Registro de la propuesta descartada

`/artists/management?query=` ya filtra el listado con búsqueda musical y paginación. `GET /artists/search/by-name?name=` ya busca artistas del catálogo con normalización parcial, devuelve IDs separados incluso cuando el nombre coincide y proporciona nombre, país e imagen; satisface gran parte de las sugerencias, pero actualmente también hidrata los discos de cada coincidencia y no tiene límite/offset. No conviene usar la respuesta management para el popup porque trae relaciones y campos administrativos.

Propuesta: extender mínimamente la búsqueda `by-name` para limitar y proyectar sugerencias compactas `{id,name,image,country}` (o añadir un endpoint dedicado solo si no puede conservarse un contrato claro). No usar `searchArtists()` hasta resolver que apunta a una ruta que no existe en el controller observado. Sugerencias deben provenir solo de `Artist` de base de datos, sin sugerencias de discos ni resultados de Spotify.

Un único valor de texto y un debounce cercano a 250 ms coordinan dos consultas con la misma entrada: management para actualizar la lista y búsqueda compacta para el popup. **Cuando hay texto, el filtro alfabético no se envía**: la búsqueda encuentra coincidencias entre todos los artistas; la letra seleccionada puede conservarse visualmente y volver a regir al vaciar el texto. Así no se intersectan una letra A y una búsqueda que debería mostrar artistas de otras letras. El listado también vuelve a página 1 al cambiar texto/letra. La selección debe conservar el ID homónimo y abrir la ficha existente para ese registro; el endpoint `GET /artists/:id/details` puede completar la ficha si la sugerencia compacta no lleva las relaciones requeridas.

Reutilizar CAT-DISC-5 como **referencia de interacción**, no importar su componente directamente: `DiscListAutocomplete.vue` combina artistas y discos, creación de discos y estado del coordinador DiscList. Para Artistas solo se necesitan filas de artistas. Sí son reutilizables los patrones ya probados allí: debounce, protección contra respuestas antiguas, flechas/Enter/Escape, cierre externo, foco, roles ARIA y estados de carga/vacío/error. País/imagen se muestran junto al nombre y los homónimos tienen claves/botones por ID.

### Subtareas propuestas

1. **CAT-ART-3a — Contrato backend:** elegir/limitar `by-name`; proyección ligera con ID, nombre, imagen y país; búsqueda sobre todos los artistas y normalización existente; tests de límite, homónimos, resultados parciales y consistencia de nombre musical.
2. **CAT-ART-3b — Adaptador frontend:** corregir/retirar la función sin consumidor que apunta a `/artists/search`; añadir parámetros tipados y cancelación cuando el API lo admita; tests del contrato.
3. **CAT-ART-3c — UI y coordinación:** componente pequeño de sugerencias o pieza local a la vista, debounce 250 ms, lista viva y sugerencias solo artistas; búsqueda textual sigue filtrando listado; mientras hay texto se omite letra; selección por ID abre ficha existente.
4. **CAT-ART-3d — Accesibilidad/regresión:** teclado, ARIA, foco, respuesta obsoleta, errores/reintento, coincidencias homónimas y cruce con filtro alfabético.

## CAT-ART-4 — Evolución de «Rellenar imágenes»

**CAT-ART-4a — Auditoría** está completada documentalmente; consultar [auditoría del flujo y diseño de endpoint](cat-art-4a-auditoria-rellenar-imagenes.md). CAT-ART-4b (backend) está completada en el checkout backend hermano; su contrato implementado usa preview, lotes de hasta 10, cursor opaco y resultados individuales. CAT-ART-4c (frontend) está completada localmente; consultar [adaptación frontend y evidencia](cat-art-4c-adaptacion-frontend.md). El botón superior queda solo para `superadmin` y procesa globalmente todos los artistas sin imagen mediante continuación automática. **CAT-ART-5 y CAT-ART-6 están completadas**: el cierre funcional y la modularización acordada quedaron verificados documentalmente; consultar [el informe de revisión final](cat-art-5-revision-cierre.md).

### Flujo que ejecutaría hoy el botón

1. En la cabecera de `ArtistManagement.vue`, botón solo visible con `isManager`; click llama `fillAllImages()`. Pide confirmación; el texto dice Spotify y advierte que puede tardar varios minutos. Mientras corre desactiva el botón y muestra `fillProgress / fillTotal`.
2. Recorre `GET /artists/management` sin búsqueda ni filtros, con `limit=200` y offsets 0, 200… hasta alcanzar el `totalItems` de la primera respuesta. Mantiene en memoria los artistas cuya `image` es falsy. Esto incluye cualquier artista del catálogo, no solo el filtro actual ni una selección manual, y no filtra por `needsReview`, discos o país.
3. Procesa esa lista secuencialmente. Para cada nombre llama `findSpotifyArtist(name)` → frontend `GET /spotify/artists/search?artistName=...` → controller `SpotifyArtistsController.findArtist` → `SpotifyPublicApiService.findArtist` → Spotify Web API `/search?q=artist:<nombre>&type=artist&limit=1`.
4. El backend toma `artists.items[0]` sin validar identidad/country contra el registro, transforma el primer `images[].url` disponible en `imageUrl` y devuelve perfil. Si hay imagen, el frontend ejecuta `PATCH /artists/:id` con `{image}`. Los endpoints de Spotify son proxy backend y usan Client Credentials; el token se mantiene en caché hasta 60 segundos antes de expirar, las credenciales no se envían desde este componente.
5. `ArtistWriteService.update` precarga el artista, aplica el campo y hace `save`, actualizando `updatedAt`. **Además asigna `needsReview: false` a cualquier PATCH**, incluso uno que solo trae imagen. Por eso el rellenado puede marcar como revisado un artista pendiente aunque no se hayan revisado nombre, país u otros datos.
6. Si el artista aparece en la página visible, la vista cambia su `image` localmente. No vuelve a cargar la lista ni actualiza otras páginas; los cambios de `updatedAt` pueden alterar el orden de la consulta futura.
7. Al terminar muestra «N imágenes añadidas» para el número de PATCH exitosos y «Se procesaron M artistas sin foto». Si no hay candidatos presenta un aviso informativo. Fallos de carga de páginas provocan un toast global de error. Errores individuales de Spotify/PATCH, 404, 502, límite del proveedor y falta de imagen se capturan y se ignoran; no se informa cuáles fallaron ni se reintentan. La iteración sigue, incrementa progreso y espera 150 ms entre artistas. No existe cancelación ni límite de tamaño por ejecución en frontend.

**No es el endpoint Last.fm `POST /lastfm/fill-images`.** Ese endpoint requiere `superadmin` y recibe `month`, `year` y `week`; `LastfmService.fillWeeklyImages` obtiene discos de esa semana sin portada, busca su imagen de álbum en Last.fm y actualiza la portada del disco. No rellena imágenes de artistas. El adaptador frontend `fillImages(month,year,week)` apunta a esa operación, pero no lo llama `ArtistManagement.vue`.

El editor manual también tiene otra búsqueda: `fetchSpotifyImage()` consulta hasta cinco candidatos en Spotify, pero asigna automáticamente la primera imagen encontrada. Aunque hay markup para `spotifyImageOptions`, este método no copia los candidatos a esa lista; no ofrece elección en el flujo observado.

### Riesgos constatados; sin decisión funcional

- **Impacto no obvio en revisión:** cada imagen rellenada usa un `PATCH` que pone `needsReview=false` en backend. Es un efecto lateral real del contrato compartido, no una inferencia del botón.
- **Emparejamiento automático por nombre:** Spotify resuelve un solo primer candidato. Homónimos, transliteraciones y nombres comunes pueden asignar una fotografía de otro artista; el flujo masivo no contrasta ID Spotify conocido, país ni candidato seleccionado.
- **Errores invisibles:** errores por artista se tragan y el resultado se presenta como éxito parcial sin lista de fallos ni distinción de “sin resultado” frente a error temporal.
- **Carga/tiempo:** primero trae el catálogo completo en páginas de hasta 200 con relaciones de management; luego procesa secuencialmente con una búsqueda por artista y, si procede, un PATCH, sin retry ni cancelación. No declara límite de ejecución ni checkpoint reanudable.
- **Carrera de catálogo:** la selección en memoria se calcula antes de mutar, pero cambios concurrentes de otra sesión entre listado y PATCH no revalidan que la imagen siga vacía; PATCH podría reemplazar una imagen añadida en ese intervalo.
- **Permisos:** la UI restringe el botón a `riffvalley`; el PATCH backend también exige `riffvalley`. El handler del botón no llama `LastfmController.fillWeeklyImages`, que requiere `superadmin`.

No se recomienda cambiar la selección de candidatos, permisos, retries, sobrescritura o `needsReview` en CAT-ART-1. CAT-ART-4 permanece pendiente hasta acordar su alcance funcional y las consecuencias aceptables.

## Plan y dependencias

| Fase | Estado | Dependencia / resultado esperado |
|---|---|---|
| **CAT-ART-1 — Auditoría** | **Completada** | Código frontend/backend, contratos, tests, diseño A–Z/autocomplete y flujo de imágenes documentados. |
| **CAT-ART-2a — Auditoría del modal** | **Completada** | Reutilización, Last.fm, similares, discografía, contrato de ficha, pills y dependencias documentados; [informe](cat-art-2a-auditoria-modal-artistas.md). |
| **CAT-ART-2b — Backend del directorio A–Z** | **Completada en backend** | Endpoint de lectura paginado `/api/artists/directory`; se documenta en el checkout backend. |
| **CAT-ART-2c — Directorio A–Z frontend** | **Completada en frontend** | `/artists` muestra el directorio, busca globalmente, pagina de 100 en 100 y conserva la gestión administrativa. La selección abre la ficha compartida de 2d mediante el ID. |
| **CAT-ART-2d — Ficha compartida e integración** | **Completada** | Ficha compartida entre Favoritos y Directorio; adaptación y limitaciones en [seguimiento CAT-ART-2d](cat-art-2a-auditoria-modal-artistas.md#seguimiento-posterior--cat-art-2d). |
| **CAT-ART-2e — Filtro por género** | **Completada** | Filtro por relaciones reales Artist–Disc–Genre, combinado con letra/búsqueda y aplicado antes de conteo/paginación en backend. |
| **CAT-ART-3 — Autocompletado** | **Descartada** | No implementar autocompletado de artistas. |
| **CAT-ART-4a — Auditoría de «Rellenar imágenes»** | **Completada documentalmente** | Traza actual, riesgos, permisos, endpoint recomendado y plan en [su informe](cat-art-4a-auditoria-rellenar-imagenes.md). No se inició implementación. |
| **CAT-ART-4b — Endpoint backend** | Completada en el checkout backend hermano | Contrato documentado en `riffvalley-app-back/roadmap/catalog/cat-art-4b-rellenar-imagenes-por-lotes.md`; permisos `superadmin`, preview, cursor y lotes de hasta 10 con resultados estructurados. |
| **CAT-ART-4c — Adaptación frontend** | Completada localmente | Preview y confirmación única, lotes secuenciales automáticos, progreso y resumen, detención entre lotes, cancelación de espera cuando es posible e invalidación del directorio. Ver [evidencia y límites](cat-art-4c-adaptacion-frontend.md). |
| **CAT-ART-5 — Revisión y cierre** | **Completada el 2026-10-29** | Cierre funcional con estado arquitectónico explícito; la vista y el API legacy pendientes se registran en CAT-ART-6. Ver [informe](cat-art-5-revision-cierre.md). |
| **CAT-ART-6 — Modularización de Artistas** | **Completada el 2026-10-29** | 6a–6d completadas. Estructura, dependencias, entrypoint público, excepciones y riesgos registrados en el [cierre final](cat-art-5-revision-cierre.md#cat-art-6--modularizaci%C3%B3n-de-artistas). Artistas queda completado y cerrado funcional y arquitectónicamente para el alcance acordado. |

### Decisiones pendientes

1. ¿Añadir `#`/Otros para nombres no alfabéticos o mantener la navegación exclusivamente A–Z?
2. ¿«The» se clasifica en T (propuesta) o se ignora solo para agrupar?
3. Confirmar precedencia propuesta: texto activo busca en todas las letras y deja temporalmente sin efecto la letra elegida.
4. ¿La lista mantiene género y «Pendientes de revisar» al cambiar letra y durante una búsqueda textual?
5. ¿El backend permite una proyección de sugerencias compacta y limitada extendiendo `by-name`?
6. CAT-ART-4a está completada. Para el alcance acordado de 4b/4c y las decisiones técnicas pendientes, consultar [la auditoría de «Rellenar imágenes»](cat-art-4a-auditoria-rellenar-imagenes.md): botón global superior solo para `superadmin`, sin vista Gestión, y endpoint backend protegido con el mismo rol.

## Índice de fuentes consultadas

- Frontend: `src/views/artists/ArtistManagement.vue`, `src/views/artists/artistManagementPagination.ts`, `src/services/artist/artist.ts`, `src/services/lastfm/lastfm.ts`, `src/services/spotify/spotifyLookup.ts`, `src/router/index.ts`, `src/layouts/default/components/routes.json`, `src/components/ArtistDetail.vue`, `src/modules/catalog/discs/presentation/components/DiscListAutocomplete.vue`.
- Backend hermano: `src/catalog/artists/artists.controller.ts`, `artists.service.ts`, `management/artist-management.service.ts`, `search/artist-search.service.ts`, `details/artist-details.service.ts`, `write/artist-write.service.ts`, `dto/artist-management-query.dto.ts`, `entities/artist.entity.ts`, `helpers/normalize-for-search.ts`, `src/catalog/shared/music-name/normalize-music-name.ts`, `music-name-search.ts`, `src/integrations/spotify-integration/http/spotify-artists.controller.ts`, `api/spotify-public-api.service.ts`, `api/spotify-client-credentials.service.ts`, `src/catalog/lastfm/lastfm.controller.ts` y `lastfm.service.ts`.
