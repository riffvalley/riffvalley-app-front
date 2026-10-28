# Catalog — Top discos (C-TOP)

**Estado:** C-TOP-1–11 completadas. TopDiscs está **COMPLETADO Y CERRADO**. C-TOP-7 se cerró documentalmente tras la confirmación del usuario de que el límite de 11 discos es intencionado y definitivo.

**Mantenimiento arquitectónico posterior:** C-TOP-12 traslada la vista de `/rankings` a `src/modules/catalog/top-discs/presentation/views/TopDiscsView.vue`. No reabre C-TOP-7 ni cambia sus conclusiones funcionales; los registros que mencionan `HomePage.vue` describen el estado histórico de las tareas anteriores.

Este roadmap registra el estado observado en los checkouts frontend y backend disponibles el 28 de octubre de 2026. C-TOP-1 fue una auditoría de solo lectura. C-TOP-2 cierra el diseño técnico/documental; no cambia código, estilos, contratos ni backend. Dashboard queda fuera del alcance funcional.

## Decisiones funcionales aprobadas

- **R1 — Cabecera:** conservar controles y estilo actuales como punto de partida. Fila 1: Semana / Mes / Año / Todos y sus selectores temporales. Fila 2: país y género. No rediseñar el resto de la cabecera.
- **R2/R3 — Clasificación única (decisión definitiva de C-TOP-6):** usar una sola respuesta de `GET /api/discs/topDiscs`, con un único juego de filtros, y presentar sus primeros 11 resultados en dos bloques visuales: puestos 1–3 en tres columnas de escritorio y puestos 4–11 en cuatro columnas de escritorio. Adaptar las columnas en tablet y móvil y conservar las tarjetas actuales.
- **R4 — Opciones dinámicas:** obtener países y géneros exclusivamente de `GET /api/discs/topDiscs/options`, entre todos los discos elegibles para el corte temporal seleccionado (sin limitar a los discos visibles). Países dependen de periodo y género; géneros, de periodo y país. Cada opción se calcula ignorando su propio valor seleccionado. Conservar selecciones aún válidas; limpiar las inválidas de forma coherente; impedir que respuestas obsoletas reemplacen el estado nuevo. La elegibilidad debe coincidir con la clasificación: voto musical vigente válido; `pinned` por sí solo no hace elegible un disco.
- **R5 — Límite definitivo:** ambas rutas, `/api/discs/topDiscs` y `/api/discs/homeDiscs`, comparten la implementación backend, que devuelve hasta 11 discos. La decisión del usuario confirma que reducir el límite anterior de 20 a 11 es intencional y definitiva. El frontend muestra esos resultados en bloques 3 + 8 y no consulta un ranking independiente.

R1, R4 y R5 continúan vigentes. Las referencias de las auditorías y cierres anteriores a C-TOP-11 que describen un límite de 20 reflejan el contrato histórico y quedan supersedidas por la reducción intencionada y definitiva a 11 confirmada por el usuario al cerrar C-TOP-7. Las pruebas de presentación que reciben 20 discos son fixtures para comprobar que el frontend solo enseña los primeros 11; no describen el límite HTTP vigente. La decisión original C-TOP-2 de mostrar ocho resultados y el Top 3 mensual independiente también están supersedidos; no existe query mensual separada ni lógica del mes actual. Se mantiene el endpoint legacy. La formulación histórica de elegibilidad «voto no nulo o `pinned`» quedó supersedida por C-TOP-10: se requiere un voto musical vigente válido, incluido cero; `pinned` sin votos válidos no participa.

## C-TOP-1 — Auditoría y caracterización

**Estado:** completada. **Tamaño:** M. **Dependencias:** ninguna.

### Localización y flujo

- Ruta protegida `GET /rankings`, nombre Vue Router `Rankings`, declarada en `src/router/index.ts`; requiere autenticación pero no un rol específico. El router carga `src/views/homePage/HomePage.vue` de forma diferida. El acceso al menú está declarado en `src/layouts/default/components/routes.json` (este archivo ya tenía cambios locales preexistentes y no se modificó).
- Raíz de pantalla: `HomePage.vue` (`RankingsPage`), composición legacy en Options API / `setup()`. Maneja periodos, fechas, filtros, fetch, transformación de respuesta y estados temporales de scroll, además de renderizar cabecera y lista.
- Hijos directos: `DiscFilters.vue` (país/género, aunque la vista desactiva su selector de semana) y `DiscCardComponent.vue` (tarjeta y acciones). Dentro de `DiscCardComponent` se componen `DiscDetail`, `ArtistDetail`, `ComentsModal`, `VotesModal` y `DiscCalendar`; también hay un control de imagen y reproducción. Selectores compartidos: `SearchableSelect.vue` y, en la variante de DiscFilters no usada aquí, `SimpleSelect.vue`.
- Estado compartido de opciones: `useCatalogStore` en `src/stores/catalog/catalog.ts`, que llama `getCatalog()` de `src/services/catalog/catalog.ts`, ordena en memoria y conserva todos los países y géneros devueltos. `App.vue` pide el catálogo al cambiar Auth a `authenticated`; el store no los filtra por resultados ni periodo.
- Transporte de ranking: `getTopRatedOrFeaturedAndStats()` en `src/services/discs/discs.ts`, Axios común `src/services/api/api.ts`. El frontend transforma tasas personales de string a número y conserva los campos de resultado.
- Contrato frontend `Disc`/`HomeRankedDisc` en `src/services/discs/discs.ts`. Incluye discos, artista/país/género, tasas medias, votos y estado personal (`userRate`, `userFavoriteId`, `pendingId`); `DiscsStatsResponse` también incluye conteos y rankings estadísticos que esta vista no presenta.
- Backend inspeccionado en el checkout hermano `../riffvalley-app-back`: `DiscsController -> DiscsService -> DiscHomeService`, DTO `TopStatsQueryDto`, helpers SQL de filtros/estadísticas y mapper `mapHomeRankedDisc`. Opciones actuales de catálogo siguen `CatalogController -> find()` de Genre/Country. Las opciones genéricas de discos siguen `DiscsController -> DiscsService -> DiscCatalogService.findOptions()`.

```text
click menú Top Discos
  -> Vue Router /rankings [requiere sesión]
  -> HomePage.vue
       -> DiscFilters.vue <- SearchableSelect.vue
       -> getTopRatedOrFeaturedAndStats()
            -> Axios con sesión -> GET /api/discs/homeDiscs
            -> DiscsController -> DiscsService -> DiscHomeService
                 -> filtros + SQL de elegibilidad/ranking + estadísticas
                 -> respuesta DiscHomeResult -> mapHomeRankedDisc
       -> adapta tasas personales -> DiscCardComponent por disco
            -> modales de detalle/artista/comentarios/votos/calendario
            -> endpoints Community para rate/favorite/pending/comments

Auth autenticada -> App.vue -> useCatalogStore.fetchCatalog()
  -> GET /api/catalog -> Genre.find + Country.find ordenados por nombre
  -> géneros/países globales -> props de DiscFilters
```

### Comportamiento frontend observado

| Área                        | Comportamiento actual                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Periodo inicial             | Semana; año actual. Al montar elige la última semana Friday-to-Thursday generada y carga.                                                                                                                                                                                                                                                                                                                                                                 |
| Semana                      | Selector con semanas que empiezan el primer viernes del año y avanzan cada 7 días; etiqueta usa día de inicio/fin y mes del inicio. Para año actual el límite es el viernes de la semana corriente; para años anteriores llega a 31 de diciembre. El rango enviado cubre seis días después del viernes (inclusive).                                                                                                                                       |
| Mes                         | Opciones incluyen «30 días naturales» (hoy menos 29 días hasta hoy) para el año actual y meses de calendario hasta el mes actual; para años pasados, todos los meses. El primer elemento, por defecto al cambiar periodo/año, es «30 días naturales» o enero.                                                                                                                                                                                             |
| Año                         | Opciones de 2025 a año actual, salvo diciembre, que añade el año siguiente. El rango local es 1 ene–31 dic. El backend limita fechas futuras a hoy.                                                                                                                                                                                                                                                                                                       |
| Todos                       | Omite `dateRange`. El botón llama a fetch además del watcher de `selectedPeriod`, por lo que el cambio puede provocar dos peticiones.                                                                                                                                                                                                                                                                                                                     |
| Cambio de periodo/año       | Watch de periodo, género, país y año elige la opción predeterminada del periodo y vuelve a consultar. El selector de rango tiene `@change="fetchDiscs"`; cambios de semana/mes/año consultan con esa selección. No se cancela el fetch ni se descartan respuestas antiguas.                                                                                                                                                                               |
| País y género               | `DiscFilters` emite IDs seleccionados; el watcher en `HomePage` llama al ranking. Se envían como `country` y `genreId`. Las listas vienen del catálogo global y no dependen de fechas ni del otro filtro. El selector de país incluye Todos; el genérico de género no expone una opción «todos» explícita en el markup revisado, aunque el estado vacío equivale a omitir el filtro.                                                                      |
| Combinación/limpieza        | Filtros se combinan con AND en backend. No hay lógica visible de limpieza automática si una selección deja de producir resultados ni estado de selecciones inválidas. Los valores viven en la vista durante su montaje.                                                                                                                                                                                                                                   |
| Orden / cantidad            | Fotografía histórica de C-TOP-1: la vista renderizaba todas las filas recibidas y el backend devolvía hasta 20. Esa descripción quedó supersedida por C-TOP-6/C-TOP-11: el backend devuelve hasta 11 y el frontend organiza esos resultados en dos bloques. No hay paginación ni botón de más; existe un enlace separado a `/disc-list`. |
| Carga/error/vacío/reintento | `discs` inicia como array vacío. No hay loading visible, mensaje de error, estado vacío ni botón de reintento. `fetchDiscs` solo registra el fallo en consola y conserva el último array.                                                                                                                                                                                                                                                                 |
| Detalle                     | Pulsar título abre modal `DiscDetail` dentro de la tarjeta, no cambia ruta. Artista, imagen, enlace musical y comentarios también tienen acciones locales/externas.                                                                                                                                                                                                                                                                                       |
| Community                   | Tarjeta permite rate y portada, mostrar votos, favoritos, pendientes/bookmarks, abrir comentarios y consultar conteo; llamadas a `rates`, `favorites`, `pendings`, `comments`. Errores de mutación se notifican con toast. Algunos campos (estado personal, comentario/votos) vienen en el payload del ranking; detalle/votos/comentarios se cargan desde sus servicios al abrir.                                                                         |
| Identidad/permisos          | Toda la ruta requiere sesión autenticada (cualquier rol autenticado); la API usa bearer session de Axios y también exige auth en `homeDiscs`. Cualquier usuario autenticado puede usar rate/favorite/pending en UI; autorización final es backend. El botón de edición/calendario solo se muestra si `hasMinimumRole(role, "riffvalley")`. Permisos de acciones de Community se aplican en endpoints; los guards de ruta no implementan esa autorización. |

### Contratos backend y ranking actuales

- `GET /api/discs/homeDiscs` (`@Auth()`, cualquier rol autenticado; usuario actual requerido). Query: `dateRange?: [Date, Date]`, `genreId?: UUID`, `country?`, `countryId?`, y rangos estadísticos opcionales. Frontend solo pasa `dateRange`, `genreId` y ambos alias de país. Fotografía histórica de C-TOP-1: aunque `TopStatsQueryDto` extiende paginación, la consulta no usa el `limit`/`offset` DTO y terminaba en `LIMIT 20`; ese límite se redujo después a 11 y ambas rutas comparten la implementación vigente.
- Fecha del filtro es `disc.releaseDate` (fecha de publicación del disco), no fecha de rate ni fecha de actividad. Con rango de dos extremos SQL aplica `BETWEEN` inclusivo a inicio y fin y además `releaseDate <= today`. Sin rango, solo `releaseDate <= today`. En consecuencia «Semana/Mes/Año» clasifica discos publicados en el intervalo, usando sus ratings vigentes agregados; no clasifica votos realizados durante ese periodo.
- País se resuelve por relación `disc.artist -> country`; se compara por ID si el valor parece UUID, si no por nombre. Género se filtra por `disc.genreId`. Los filtros afectan tanto al universo de la clasificación como a las estadísticas globales que parametrizan el score.
- Fotografía histórica de C-TOP-1: la consulta usaba `globalAvgRate` y `medianVotes`, admitía discos `pinned` sin votos y devolvía hasta 20. Ese modelo y límite fueron supersedidos por C-TOP-10/11: fórmula con k=4, elegibilidad por Rate vigente válida y máximo 11.
- `GET /api/catalog` devuelve `genres` y `countries` completas y ordenadas por nombre desde sus repositorios. No tiene filtro de disponibilidad por rango y no proyecta opciones ligadas a discos.
- `GET /api/discs/options?field=country|genre&country=&genre=&year=&ep=&debut=&limit=` es reutilizable para opciones sencillas. Omite el filtro de su propio campo, aplica los demás enviados y `releaseDate <= hoy`, pero carece de `dateRange`; `year` solo admite año calendario. No reproduce el universo ranking (rated o pinned), no aplica las estadísticas ni el score, y limita por defecto a 3 valores aleatorios (`limit <= 10`). Por tanto no es hoy un endpoint completo de opciones disponibles para Top discos. Sí agrupa y proyecta directamente ID/nombre/metadata con joins necesarios, sin traer objetos Disc completos.
- `GET /api/genres/all` y `GET /api/countries` son otros contratos generales de catálogo, pero tampoco están sujetos al ranking ni se usan en esta vista.
- No se encontró un endpoint actual que retorne el conjunto completo de países/géneros con discos elegibles por rango temporal según `/homeDiscs`. La respuesta de `/discs/options` actual permite consultar opciones sin recuperar todos los discos, pero no tiene criterios equivalentes.

### Consultas, relaciones e índices observados

- Ranking: SQL agregado en `catalog/discs/home/disc-home.service.ts`; joins `disc.artist`, `artist.country`, `disc.genre` y `rate`; subconsultas por usuario a `rate`, `favorite`, `pending`; subconsulta de comentarios. Stats globales también unen `disc` y `rate` (más artista/país, aunque no todas las consultas aprovechan cada join). Mapper añade estructuras anidadas y normaliza números.
- Opciones: QueryBuilder sobre `disc`; joins de `artist/country` al pedir país o filtrar country; `genre` al pedir género o filtrar genre; filtros de fecha, relación y metadatos; `GROUP BY` del valor, `ORDER BY RANDOM()` y límite. No se materializan discos.
- Migración `1791127430930-AddDiscQueryIndexes.ts` declara índices en `rate("discId")`, `comment("discId")`, y pares de user-disc para rate/favorite/pending. En entidades/migraciones inspeccionadas no aparece índice explícito de `disc.releaseDate`, `disc.genreId`, `disc.artistId` o `artist.countryId`; esto describe el código versionado observado, no verifica índices reales de ninguna base de datos. No se revisaron planes de ejecución ni una base conectada.
- Elegibilidad resuelta en C-TOP-2: la consulta del ranking incluye discos `pinned` sin votos y el frontend no los elimina (el mapper entrega averageRate 0). Para que las opciones coincidan con la clasificación, el contrato aprobado los considera elegibles junto con discos con voto musical no nulo; no cambia el score.

### Dependencias y legado

- **Catalog:** owns disc/genre/country catalogue and ranking endpoint, but frontend view, transport, DTOs and store are spread across `src/views/homePage`, `src/components`, `src/services`, `src/stores`. No `src/modules/catalog` public boundary exists yet.
- **Community:** rates, favorites, pending items, comments and vote detail are invoked by the shared DiscCard; these mutations are coupled into a card used in multiple screens. Ranking payload embeds community-derived data and user-specific state.
- **Identity:** router guard protects screen; `App` controls catalog fetch based on auth status; API injects current bearer token; card uses the public `@/modules/identity/shared` role helper for moderator edit visibility. Session state is not owned by Top discos.
- Responsabilidades mezcladas en `HomePage`: UI/layout, temporal date generation, filter state, remote orchestration, error logging and response adaptation. `DiscCardComponent.vue` mixes display, rating/favorite/pending/comment/vote actions, media links, and modal orchestration. `DiscFilters.vue` supports a generic calendar filter/event API that this use suppresses; HomePage passes `selectedWeek=null`, `showWeekPicker=false`, `showSearchQuery=false`, and listens to `resetAndFetch` although no current code emits it. These are legacy contracts, not refactored in C-TOP-1.
- API typing uses `any` in unrelated date range helpers and some card services/payloads; Home ranking response includes stats unused by this view; aliases `country` and `countryId` are both sent for compatibility. Record as technical debt for future contract work, not as a finding against an unmade change.

### Pruebas existentes y alcance

- No existe test de `HomePage.vue`, del flujo de filtros Top discos ni del estado loading/error/empty/retry de esa vista.
- `src/services/discs/discs.test.ts` verifica forma de request para `/discs/homeDiscs` con `dateRange` y cancelación opcional; no verifica filtros efectivos de la pantalla ni ranking.
- `src/components/DiscCardComponent.events.test.ts` cubre evento de calificación, pero no el conjunto de acciones/roles de tarjeta. Otras pruebas de widgets Dashboard caracterizan sus propios usos de DiscCard; Dashboard no forma parte de esta tarea.
- En el backend hay pruebas unitarias y PostgreSQL del ranking, filtros, límites, empates, personalización y bordes de fechas en `catalog/discs/home/__tests__`; `catalog/discs/catalog/__tests__/disc-catalog.service.spec.ts` cubre opciones. Son evidencia de implementación backend actual, no prueba de integración de esta vista frontend.

## Cierre de C-TOP-1

- Archivos documentales: este roadmap y el índice `roadmap.md`.
- Verificación: revisión estática del código fuente frontend y del checkout backend hermano; no se hicieron peticiones HTTP ni se ejecutó backend, frontend, migraciones o pruebas de producto. `pnpm run markdown:links` terminó con el baseline informativo del repositorio: 1 fallo preexistente en `roadmap/roles.md:9` por enlace a `../../spammusic-back/...` fuera del repositorio; no reportó enlaces rotos en este roadmap. `git diff --check` no reportó problemas; el archivo nuevo se comprobó aparte con `git diff --no-index --check /dev/null roadmap/catalog-top-discs.md` (sin diagnósticos de whitespace).
- No se modificó ningún archivo funcional. El cambio preexistente en `src/layouts/default/components/routes.json` queda preservado.

## C-TOP-2 — Decisiones de nomenclatura y rutas

### Nomenclatura

La funcionalidad del ranking se denomina **TopDiscs**. `/rankings` continúa siendo su URL pública.

| Actual                                                         | Objetivo o tratamiento                                                                                                                                                                                                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/discs/homeDiscs`                                     | Se conserva como alias **LEGACY** permanente.                                                                                                                                                                                                                   |
| —                                                              | `GET /api/discs/topDiscs` es la ruta oficial para nuevos consumidores.                                                                                                                                                                                          |
| `DiscHomeService`                                              | Renombrar a `DiscTopService` y mover el contenido dedicado al ranking de `src/catalog/discs/home/` a `src/catalog/discs/top/` en C-TOP-3a. La carpeta actual contiene la implementación y pruebas específicas del ranking, no una capacidad compartida de Home. |
| `findTopRatedOrFeaturedAndStats()`                             | Método oficial futuro `getTopDiscs()`; se conserva la delegación de ambas rutas a una única implementación.                                                                                                                                                     |
| `HomePage.vue` / `RankingsPage`                                | En C-TOP-4, `TopDiscsView.vue` / `TopDiscsPage`. Mantener `/rankings` y, salvo que aparezca una dependencia demostrada, el nombre de ruta `Rankings`.                                                                                                           |
| `getTopRatedOrFeaturedAndStats()` frontend                     | Crear `getTopDiscs()` para la vista oficial. Mantener el método antiguo como wrapper **LEGACY** requerido por `DashboardTop3Widget` y sus pruebas; no redirigir Dashboard en esta tarea.                                                                        |
| `HomeRankedDisc` / `DiscCardComponent.vue` / `DiscFilters.vue` | Tipos/componentes compartidos o con consumidor Dashboard: no renombrar a ciegas. Si se introduce `TopDisc`, mantener alias de tipo legacy cuando el widget lo necesite.                                                                                         |

No introducir nuevas referencias de producto a HomeDiscs. Las referencias necesarias para el endpoint/cliente compatibilidad deben llevar comentario o JSDoc LEGACY. No cambiar otros servicios o estadísticas de Home ni funciones Community que usen expresiones como “top discs” con otro significado.

### Ranking oficial y alias legacy

**Oficial:** `GET /api/discs/topDiscs`.

**Legacy permanente:** `GET /api/discs/homeDiscs`.

La ruta legacy se mantiene operativa sin fecha de retirada, aunque una auditoría futura no encuentre consumidores. No se cambian su método, URL, autenticación (`@Auth()` para cualquier rol admitido actualmente), DTO/parámetros, respuesta, score, filtros ni efectos observables. No añadir headers de warning ni alterar payloads.

Ambas rutas deben llamar al mismo método interno de `DiscsService`/`DiscTopService`; un controller alias no debe mantener SQL ni reglas de ranking propias. El oficial usa inicialmente el mismo `TopStatsQueryDto` y devuelve el mismo envelope `DiscHomeResult`, incluyendo estadísticas. Así el cambio de nombre no elimina campos ni cambia semánticas. El servicio frontend legacy conserva `/discs/homeDiscs` para Dashboard; la nueva vista usa exclusivamente `/discs/topDiscs`.

No se encontró `@nestjs/swagger`, decoradores Swagger ni configuración OpenAPI en el backend revisado. En C-TOP-3a documentar la ruta antigua con JSDoc `@deprecated` y una marca explícita `LEGACY: use GET /api/discs/topDiscs`; no añadir dependencias. Si se incorpora Swagger/OpenAPI en otra tarea, reflejar entonces `deprecated: true`. El JSDoc no debe activar warnings HTTP ni alterar el runtime.

`GET /api/catalog` y `GET /api/discs/options` conservan su comportamiento público actual.

## C-TOP-2 — Contratos propuestos

### `GET /api/discs/topDiscs`

- Autenticado, igual que `homeDiscs`.
- Acepta los parámetros y DTO actuales (`dateRange`, `genreId`, `country`, `countryId` y rangos auxiliares de estadísticas) para mantener compatibilidad inicial.
- Conserva toda la respuesta y comportamiento del ranking bayesiano actual.
- No incluye opciones dinámicas en su payload.
- Propuesta histórica C-TOP-2: el backend usaba `LIMIT 20`; C-TOP-6 presentó los primeros 11. La decisión posterior de reducir el límite compartido a 11 quedó aprobada en C-TOP-11 y confirmada por el usuario al cerrar C-TOP-7. Ambas rutas mantienen la misma implementación y filtros.

### `GET /api/discs/topDiscs/options`

Endpoint separado y específico del ranking. Devuelve opciones del universo elegible, no solo de los 11 discos visibles. La llamada mantiene caché independiente del ranking.

Contrato implementado:

| Parámetro   | Tipo/validación                                                                                                            | Comportamiento                                                                                                                                                                                                                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dateRange` | Opcional; dos fechas ISO de calendario, en orden `[inicio, fin]`, serializadas como el array usado por el servicio actual. | Aplica ambos extremos inclusivamente y además `releaseDate <= today`. Sin el parámetro significa Todos. Un par imposible/malformado o incompleto -> 400. Un par invertido -> respuesta vacía (equivale a `BETWEEN` sin coincidencias y evita convertirlo en “Todos”). Un fin futuro es válido y queda acotado por hoy; un inicio futuro da respuesta vacía. |
| `countryId` | UUID opcional.                                                                                                             | Selección de país por ID; restringe `genres`, se ignora para `countries`.                                                                                                                                                                                                                                                                                   |
| `genreId`   | UUID v4 opcional.                                                                                                          | Selección de género; restringe `countries`, se ignora para `genres`.                                                                                                                                                                                                                                                                                        |
| `country`   | String opcional por compatibilidad semántica.                                                                              | Si no está vacío prevalece sobre `countryId`; si tiene forma UUID compara ID, si no compara nombre exacto. El cliente nuevo envía solo `countryId`.                                                                                                                                                                                                         |

ID con formato no válido -> 400. UUID válido pero inexistente -> 200 con arrays vacíos o con las coincidencias que correspondan. No usar 404 para una opción inexistente. Falta de autenticación -> 401; el endpoint mantiene `@Auth()` para no ampliar el público respecto al ranking. No aceptar `field` ni `limit`: siempre devuelve ambas listas completas. El endpoint de opciones no recibe `statsDateRange` ni `distributionDateRange`, pues esos rangos solo afectan las estadísticas del envelope actual, no la selección principal de discos.

Respuesta inicial, sin recuentos:

```json
{
  "countries": [{ "id": "uuid", "name": "Noruega", "isoCode": "NO" }],
  "genres": [{ "id": "uuid", "name": "Black Metal", "color": "#445566" }]
}
```

Los arreglos vacíos son respuestas válidas. No generar opciones “sin país” o “sin género”. Orden estable para cada lista: `name ASC, id ASC`. Los campos mínimos satisfacen el select compartido (`id`, `name`); `isoCode` y `color` coinciden con las proyecciones actuales y no obligan a cambiar `SearchableSelect`.

### Recuentos por opción

No incluir `discCount` en el primer contrato. La cifra se definiría como número de discos **distintos y elegibles** que cumplen el periodo y el filtro cruzado de esa opción: el recuento de país respeta género y el de género respeta país, cada uno ignora su filtro propio. No contar filas de Rate. Con el esquema actual, `Disc` tiene un solo `genreId` y un Artist con un solo país; si el modelo evoluciona a múltiples géneros/países por disco, los totales por opción podrían solaparse y sumar más que el total general.

En una consulta agregada, contar con `COUNT(DISTINCT d.id)` protege contra fanout accidental; con una CTE de discos elegibles sin joins a Rate, `COUNT(*)` puede ser equivalente hoy. El coste adicional del agregado suele ser menor que el de leer/filtrar el conjunto, pero no es gratis, y el dato necesita decidir formato, etiqueta en UI y semántica. `SearchableSelect` usa actualmente el campo `name` para el título; C-TOP-4 tendría que añadir una etiqueta de presentación aditiva o un componente específico para mostrar `Noruega (20)` sin cambiar el nombre usado como dato. Añadir recuentos requiere aprobación de producto y medición; no bloquea ni forma parte del contrato inicial.

## Semántica de filtros dinámicos

El universo de cada selector contiene todos los discos elegibles con `releaseDate` dentro del periodo efectivo, sin puntuaciones y sin límite de los 11 resultados visibles:

- `countries`: periodo + `genreId` seleccionado; ignora país.
- `genres`: periodo + país seleccionado; ignora género.
- Si no hay país ni género, ambos arrays reflejan las opciones del periodo completo.
- País y género se combinan mediante AND cuando ambos aplican a una dimensión.
- Una opción aparece cuando existe al menos un disco elegible asociado. Un disco que no está entre los 11 resultados visibles sigue aportando sus opciones.
- Un disco es elegible si `pinned = true` **o** existe una Rate del disco con `rate IS NOT NULL`. El cero cuenta; solo portada y no pinned no cuenta. Un pinned sin Rate es elegible.

El periodo usa `Disc.releaseDate`. Un rango válido es inclusivo. El límite superior efectivo siempre es hoy: un rango de UI que termine en futuro se intersecta con `releaseDate <= today`, no expone fechas futuras. Todos equivale a ausencia de límite inferior y `releaseDate <= today`; `releaseDate IS NULL` queda excluido, como hoy.

## Coordinación frontend propuesta para C-TOP-4

Mantener tres estados separados: filtros seleccionados por el usuario, opciones vigentes y respuesta del ranking. Usar un coordinador explícito (composable o lógica de feature en `TopDiscsView`) y no watchers independientes por campo que disparen cascadas.

1. Una acción de usuario (cambio de periodo, país, género o reset) actualiza atómicamente el estado de filtros. Calcular una vez el `dateRange` efectivo del periodo y pedir `topDiscs` y `options` en paralelo con query keys independientes.
2. Clave de ranking: `['catalog','top-discs', userId/sessionGeneration, start, end, countryId, genreId]` más cualquier rango auxiliar si la vista lo usa. Incluye usuario/sesión porque la respuesta contiene Rate/Favorite/Pending propios.
3. Clave de opciones: `['catalog','top-disc-options', start, end, countryId, genreId]`. La respuesta no depende del usuario; la clave no necesita identidad si autorización devuelve el mismo conjunto a todos los roles permitidos. Ambas claves deben incluir exactamente los valores normalizados enviados al backend y conservar caches separados.
4. TanStack Vue Query ya integra el proyecto, tiene caché de 60 s y garbage collection de 5 min por defecto, y pasa `AbortSignal` a query functions. Reutilizar `signal`; las keys separan respuestas tardías por estado. No usar datos de otra key como si fueran opciones/ranking actuales (`placeholderData` cruzado). Reintentar según la política común; en error no vaciar filtros ni interpretar el fallo como listas vacías. Mostrar estado de error/reintento sin consultar `/api/catalog` como fallback.
5. Tras una respuesta de opciones, comprobar país seleccionado contra `countries` y género seleccionado contra `genres` por ID. En cambio de periodo, limpiar de una vez los IDs ausentes; si ambos son inválidos/incompatibles, limpiar ambos de forma determinista. Emitir una sola nueva combinación de estado y, como máximo, una recuperación de opciones/ranking; no reactivar watchers por cada `ref` mutado.
6. Si el usuario acaba de cambiar país, ese ID es el ancla: si el género previo no aparece en `genres` para el país nuevo, limpiar el género y actualizar una vez. Cambio de género es simétrico y conserva el género recién elegido. Si cambia simultáneamente ambos o se pulsa reset, tratarlo como una transacción única, no como dos cambios consecutivos.
7. Si ambos filtros están válidos individualmente pero el par no existe, las listas cruzadas no contendrán el par; al cambiar periodo se limpian ambos. En acción explícita de país/género se conserva el filtro que acaba de elegir el usuario y se limpia el anterior si el endpoint descarta la combinación. Un filtro se limpia solo por una respuesta 200 válida; un fallo de red no invalida selecciones.
8. Si el ranking devuelve cero discos pese a opciones y filtros vigentes, mostrar estado vacío y conservar filtros: no deducir opciones desde el Top limitado. Reset limpia país y género simultáneamente, conserva el periodo y ejecuta solo las dos consultas finales.
9. Todos genera `dateRange` omitido, igual para ambas consultas. Asegurar una convención de fecha de calendario (no desplazar fechas por zona horaria) al convertir las opciones actuales de HomePage, que son `YYYY-MM-DD`.

`DiscFilters` debe recibir los arrays dinámicos por props y propagar IDs al estado coordinado; al limpiar filtros por respuesta, su estado interno debe seguir al padre. No crear bucles con los eventos `update:*` ni con `resetAndFetch`. Los estados de carga, error, vacío y éxito de las dos consultas son independientes: el ranking puede cargar mientras las opciones están en caché y viceversa.

**Requisito supersedido por C-TOP-6:** el Top 3 del mes actual se había planteado como una consulta distinta sin país/género, y la clasificación principal mostraba ocho discos. La decisión definitiva reemplaza ambas propuestas por una única clasificación filtrada que se presenta en dos bloques. No crear una consulta mensual independiente ni aplicar lógica específica para el mes actual.

## Diseño SQL

Para `/topDiscs/options`, operar sobre Disc y relaciones de catálogo directamente; no invocar el ranking, calcular score, hidratar entidades ni transferir todas las Rates a Node.

Implementación C-TOP-3b: **una sentencia SQL por petición**. `eligible_discs` selecciona las columnas de relación necesarias de `disc`, aplica el predicado temporal común y el predicado de elegibilidad. Dos CTEs producen `country_options` y `genre_options`; la primera aplica `genreId` y no aplica país, la segunda aplica país y no aplica `genreId`. `UNION ALL` devuelve filas con discriminador de dimensión, luego el loader las separa en arrays. No hay consulta independiente por select, ni se invoca el ranking, calcula score, hidrata entidades o limita las opciones al resultado de 11 discos.

La regla única está en `buildTopDiscEligibilityPredicate`: `d.pinned = true OR EXISTS(rate con rate IS NOT NULL)`. `EXISTS` reconoce el valor cero, excluye solo Rates nulas y evita fanout. El ranking reutiliza el mismo helper como predicado `WHERE`; conserva su `LEFT JOIN rate` para agregados, fórmula, orden, límite y payload. Por equivalencia relacional, un disco pasa el filtro por `HAVING COUNT(rate no nulo) > 0 OR pinned` exactamente cuando satisface este predicado; la suite PostgreSQL incluye regresión para rated/pinned, nulos y score, pero no se ejecutó en esta tarea porque no hay una base de pruebas aislada confirmada.

Relaciones actuales: cada Disc referencia un Artist y un Genre (ManyToOne); Artist tiene un Country opcional. `SELECT DISTINCT` por ID/nombre/metadata produce una opción por entidad; múltiples Rates no duplican opciones porque no se unen al conjunto base. No se cargan relaciones eager con TypeORM ni hay N+1: los joins son SQL explícitos en una sentencia. La CTE materializada por el plan puede abarcar el conjunto completo de elegibles, especialmente en Todos; queda pendiente medir su coste con `EXPLAIN (ANALYZE, BUFFERS)` sobre una base aislada representativa. No se añadieron índices ni migraciones.

El código de migraciones incluye `rate("discId")` (`1791127430930-AddDiscQueryIndexes.ts`), útil para el `EXISTS`; también incluye índices compuestos para rate/favorite/pending por usuario y disco. No se encontró un índice explícito sobre `disc."releaseDate"` en las migraciones revisadas; las auditorías anteriores lo habían dejado como candidato a medir. Verificar esquema y plan en PostgreSQL aislado. Periodos amplios/ Todos pueden leer buena parte de Disc, y la CTE compartida puede materializar más filas de las que conviene; comparar `EXPLAIN (ANALYZE, BUFFERS)` en rangos representativos. No añadir índice, migración ni caché de backend en C-TOP-2.

## Plan de pruebas para C-TOP-3a, C-TOP-3b y C-TOP-4

### Unitarias / HTTP sin base de datos

- `DiscsController`: dos rutas, mismo `@Auth`, usuario y DTO; ambas delegan exactamente una vez a la implementación oficial; legacy documentada `@deprecated` y sin lógica propia.
- `DiscsService`/`DiscTopService`: delegación común; conservar parámetros auxiliares y respuesta `DiscHomeResult`.
- Equivalencia de contratos entre ruta oficial y alias legacy para filtros ausentes/presentes; asegurar que no se agregan warnings ni campos nuevos.
- DTO de opciones: arrays de fechas, fechas imposibles, rango invertido, fin futuro (aceptado y acotado), inicio futuro (vacío), ID inválido/no UUID, combinaciones country/countryId y precedencia.
- SQL builder: `EXISTS(rate IS NOT NULL)`, cero cuenta, pinned como OR, filtros cruzados, no aplicación del filtro propio, rango inclusivo y bind parameters seguros.
- Mapper de dos ramas, listas vacías, campos mínimos y orden determinista por nombre/ID.
- Cliente frontend: ruta nueva y serialización estable; wrapper legacy sigue apuntando a `/discs/homeDiscs` para Dashboard.
- C-TOP-4: coordinador al cambiar periodo/país/género/reset, limpieza de IDs, transacciones sin doble fetch, respuestas fuera de orden, abort/caché, error de red sin limpieza y estado vacío.
- Componente `DiscFilters`: sincronización padre→hijo de valores controlados y regresión en consumidores compartidos.

### PostgreSQL aislado

- Conjunto vacío; varios países/géneros; valores dentro y fuera de extremos inclusivos; fecha futura; Todos.
- Disco con Rate musical cero; Rate con rate nulo/solo cover y no pinned; pinned sin votos; pinned con solo cover.
- Cruces país/género con AND; país ignora su propio ID y género lo ignora para sus opciones; selección opuesta sí restringe.
- Múltiples Rates para un disco sin duplicar opción ni recuento; discos elegibles que no aparecen entre los 11 resultados visibles siguen generando opciones.
- Comprobar consistencia del conjunto elegible y filtros con `homeDiscs`/`topDiscs`, sin cambiar score, desempate por ID, payload ni estados personales.
- Medir la consulta de opciones para periodo corto y Todos con `EXPLAIN (ANALYZE, BUFFERS)` en un fixture/dataset aislado representativo si está disponible; registrar que fixture pequeño no sustituye datos de producción y no consultar producción.

No conectar pruebas a base de datos ni servicios reales por defecto. Las pruebas de SQL que demuestren semántica PostgreSQL son opt-in/aisladas. No ejecutar suites de producto en C-TOP-2 porque los cambios son solo documentación.

## Siguientes tareas

### C-TOP-3a — Backend: TopDiscs y compatibilidad legacy (**completada**)

1. Añadir `GET /api/discs/topDiscs` y conservar `GET /api/discs/homeDiscs` como `LEGACY`, mismo guard, `TopStatsQueryDto` (incluidos `limit`/`offset` aceptados pero ignorados), usuario, payload y comportamiento.
2. Renombrar el servicio backend a `DiscTopService`, mover el submódulo dedicado a `src/catalog/discs/top/` y renombrar el método a `getTopDiscs()`; mantener una fachada/wrapper solo si la revisión de `DiscsService` exportado descubre callers internos reales que requieran el nombre antiguo.
3. Ambas rutas delegan a la misma implementación; no duplicar SQL ni fórmula. No modificar helper/score, respuesta ni límite actual.
4. Añadir JSDoc `@deprecated` y “LEGACY — use `/api/discs/topDiscs`” en método/ruta antigua; no fecha de retirada ni warnings HTTP. No añadir Swagger dependency.
5. Pruebas de controller, fachada y regresión/equivalencia para ambas rutas. Mantener la ruta legacy aunque la búsqueda de consumidores cambie.

#### Cierre de C-TOP-3a

- `GET /api/discs/topDiscs` es la ruta oficial. `GET /api/discs/homeDiscs` permanece operativa como `LEGACY`, con `@deprecated` documentado en el controller y sin fecha de retirada, warning HTTP ni cambios en permisos. Ambas rutas usan `@Auth()`, `TopStatsQueryDto`, el usuario actual y la misma delegación; el alias llama al handler oficial.
- Fotografía de C-TOP-3a: `DiscHomeService` fue renombrado a `DiscTopService`; el submódulo exclusivo del ranking se movió de `src/catalog/discs/home/` a `src/catalog/discs/top/`. En esa etapa se conservaban el límite 20 y el resto del contrato; C-TOP-11 redujo después el límite a 11, confirmado como definitivo al cerrar C-TOP-7.
- El widget `DashboardTop3Widget` continúa consumiendo `/discs/homeDiscs`; no se migró Dashboard ni se cambiaron servicios frontend.
- Verificación: 12 suites focalizadas pasan (62 tests); dos suites opt-in PostgreSQL se omitieron por no habilitar la conexión aislada (9 tests). Typecheck directo, build Nest, gates estructural y de tipado seguro y `git diff --check` pasan. ESLint quality gate informa 839 diagnósticos históricos, 0 nuevos, 0 obsoletos y 0 duplicados. `pnpm run verify` no pudo iniciar porque pnpm devolvió `unable to open database file`; no se informa como superado. No se ejecutó PostgreSQL ni se consultó producción.
- Criterios satisfechos: rutas con contrato compartido, alias legacy compatible, lógica única, cobertura de controller/fachada/SQL existente y controles disponibles ejecutados. En el momento del cierre de C-TOP-3a, C-TOP-3b quedó pendiente.

### C-TOP-3b — Backend: filtros dinámicos (**completada**)

1. Añadir `GET /api/discs/topDiscs/options`, autenticado, con DTO de filtros propio y sin modificar `/api/catalog` ni `/api/discs/options`.
2. Obtener países y géneros en una sentencia, aplicando elegibilidad común y semántica cruzada/temporal descritas.
3. Respuesta completa sin recuentos; orden `name, id`; sin puntuaciones ni limit.
4. Pruebas unitarias y PostgreSQL aislado; verificar consistencia, duplicados, límites e índices. Medir planes antes de proponer optimización de índice.

#### Contrato final y cierre de C-TOP-3b

- Ruta autenticada `GET /api/discs/topDiscs/options`, registrada antes de las rutas dinámicas del controller. Parámetros aceptados: `dateRange` (exactamente dos fechas de calendario `YYYY-MM-DD`), `countryId` y `genreId` (UUID v4), y `country` (texto legacy; si no está vacío prevalece sobre `countryId`; un valor con forma UUID compara ID y otro compara nombre exacto). Parámetros desconocidos, fechas malformadas/imposibles, rango incompleto y UUID inválidos producen 400. UUID bien formado inexistente produce arrays vacíos en la dimensión que filtra.
- Sin `dateRange` aplica `releaseDate <= hoy` (Todos). El rango es inclusivo y añade el tope `releaseDate <= hoy`; fin futuro queda recortado. Inicio futuro y rango invertido devuelven arrays vacíos, sin normalizarse a Todos ni generar error.
- Respuesta: `{ "countries": [{ "id", "name", "isoCode" }], "genres": [{ "id", "name", "color" }] }`. Metadata nullable se devuelve como `null`; no hay recuentos, discos ni scores. Ambos arrays pueden quedar vacíos. Orden SQL estable por dimensión, `name ASC, id ASC`.
- Países usan periodo + género y omiten su propio país seleccionado; géneros usan periodo + país y omiten su propio género seleccionado. El filtro country conserva precedencia y comparación por ID/nombre de `/homeDiscs`.
- `DiscTopService.getTopDiscOptions()` delega en el loader de consulta. DTO, tipos de respuesta, predicados SQL y mapper quedan separados en sus carpetas. El loader hace una sola llamada `queryRunner.query()` por request. No cambia `/api/catalog`, `/api/discs/options` ni el payload del ranking; `/api/discs/homeDiscs` sigue como alias legacy.
- Las pruebas unitarias cubren DTO/400, fechas, query params, filtros cruzados y su omisión propia, compatibilidad de país, orden, respuesta vacía, mapping y una única llamada SQL. La regresión histórica comprobaba `LIMIT 20`; la implementación actual y los tests posteriores fijan el tope 11. El spec PostgreSQL opt-in agrega casos para rate cero/nulo, pinned, no elegible, múltiples Rates, cruces, límites inclusivos, fin futuro, Todos, IDs inexistentes y correspondencia con el ranking.
- Verificación ejecutada: 5 suites focalizadas pasan (46 tests); la suite PostgreSQL opt-in se omitió (6 tests). Typecheck y build Nest pasan. Gate estructural: 0 hallazgos nuevos; gate de tipado seguro: 0 nuevos; ESLint: 839 diagnósticos históricos, 0 nuevos, 0 obsoletos y 0 duplicados. Pasan los 8 tests de los quality gates, ejecutados directamente. `pnpm run verify` continúa sin iniciar por `unable to open database file`; no se informa como superado. No se usó la base local `dev` porque su nombre no la identifica como aislada. No se ejecutaron migraciones ni se consultó producción.
- C-TOP-3b queda cerrada con SQL/contrato y pruebas definidas. No se afirma verificación real de SQL ni medición de rendimiento en PostgreSQL; esos riesgos se mantienen explícitos. C-TOP-4 y posteriores siguen pendientes.

### C-TOP-4a — Frontend: contratos, adaptadores y queries (**completada**)

1. Auditar `HomePage.vue`, `DiscFilters`, el servicio legacy, tipos, stores, consultas y dependencias de Identity/Community. No cambiar la presentación ni Dashboard.
2. Crear contratos propios de TopDiscs para filtros, opciones y respuesta; reutilizar tipos existentes cuando coincidan con el contrato.
3. Añadir adaptadores autenticados con el cliente HTTP compartido para `/discs/topDiscs` y `/discs/topDiscs/options`, con `AbortSignal`, filtros opcionales omitidos y `dateRange` como pareja de fechas.
4. Añadir queries de TanStack con claves independientes y normalizadas; el ranking separa además usuario/generación de sesión por su payload personalizado. No duplicar datos en Pinia.
5. Probar construcción/omisión de parámetros, mapeo y respuestas vacías, propagación de error, separación de claves/cachés y conservar el wrapper legacy.

#### Cierre de C-TOP-4a

- La implementación está en `src/modules/catalog/top-discs/`: `types/topDiscs.ts` define los parámetros y la respuesta de opciones; el payload del ranking reutiliza `DiscsStatsResponse`. Los países y géneros disponibles reutilizan los tipos de Catalog (`Country` y `Genre`), cuyos campos y nullability coinciden.
- `api/topDiscs.ts` ofrece `getTopDiscs()` y `getTopDiscsOptions()`, normalizadores de parámetros exportados para pruebas y un mapper de opciones que conserva solo los campos de contrato. Ambos adaptadores usan el cliente Axios actual, propagan `AbortSignal` y errores, omiten filtros ausentes y no filtran opciones en cliente.
- `composables/useTopDiscsQueries.ts` define keys independientes `['catalog','top-discs', ...]` y `['catalog','top-disc-options', ...]`. Cada key incorpora filtros normalizados; la del ranking incluye `userId` y `authSessionGeneration` por los campos personales de su payload. Query usa la configuración global (stale 60 s, gc 5 min, retry común) y su señal de cancelación.
- Auditoría: `HomePage.vue` obtiene el ranking con `getTopRatedOrFeaturedAndStats()` y usa la store legacy de Catalog para sus selects. `DiscFilters` también lo consumen calendario, listado y vistas de lista; no se cambia su estado ni contrato en esta iteración. `DashboardTop3Widget` comparte el servicio legacy y los tipos de respuesta/Disco; no comparte `HomePage` ni `DiscFilters`. Community sigue siendo owner de votos, favoritos, pendientes y comentarios expuestos por `DiscCardComponent`; Identity aporta la sesión a la clave del ranking. No se modifica Dashboard, `DiscCardComponent`, Identity ni Community.
- Verificación: TopDiscs, 13 tests focalizados pasan; servicio legacy y `DashboardTop3Widget`, 23 tests pasan. Typecheck y build pasan. ESLint y Prettier focalizados sobre `src/modules/catalog/top-discs/` pasan. `git diff --check` pasa. `cycles:fixtures` pasa (12 fixtures); `cycles` informa un ciclo productivo type-only y queda informativo porque no puede resolver el `HEAD` local. Los comandos globales `pnpm run lint` y `pnpm run format:check` fallan con diagnósticos globales (1095 de ESLint y 207 archivos de formato); los archivos nuevos sí pasan los controles focalizados y no se atribuye deuda global al cambio sin comparación base fiable. `markdown:links` encuentra un enlace fuera del repositorio ya existente en `roadmap/roles.md:9`; no afecta a este roadmap.
- Alcance de cierre: no se conecta `/rankings`, no se alteran selects/estilos/rutas y el servicio legacy sigue operativo para Dashboard y consumidores existentes. La integración visible y coordinación de filtros quedan para C-TOP-4b y C-TOP-4c.
- Riesgos pendientes: el endpoint de opciones y su integración SQL todavía no se verificaron contra PostgreSQL aislado ni se midieron con `EXPLAIN`; no se hicieron peticiones a servicios reales. `DiscFilters` conserva estado local sin sincronización padre→hijo y queda pendiente cubrirlo al conectar las opciones en C-TOP-4c.

### C-TOP-4b — Frontend: integración de filtros dinámicos de TopDiscs (**completada**)

1. Conectar `/rankings` a la query oficial `/api/discs/topDiscs` y obtener países/géneros únicamente desde `/api/discs/topDiscs/options`.
2. Mantener una fuente de verdad reactiva para periodo, año, rango efectivo, país y género; conservar Semana, Mes, Año, Todos y la cantidad/tarjetas actuales.
3. Validar filtros al cambiar periodo; al cambiar país o género, priorizar la elección explícita y limpiar solo el filtro cruzado incompatible. Aplicar limpiezas juntas y pedir opciones para la combinación final.
4. Sincronizar los valores controlados de `DiscFilters`; usar caché y cancelación de TanStack para impedir que respuestas anteriores sustituyan el estado actual.
5. Presentar estados básicos de carga, error/reintento y opciones vacías sin cambiar la composición visual.

#### Cierre de C-TOP-4b

- `HomePage.vue` conserva el nombre y la ruta `/rankings`, los selectores temporales, la cuadrícula, el límite presentado actualmente y el uso de `DiscCardComponent.vue`. El ranking se obtiene por `useTopDiscsQuery()` desde `/api/discs/topDiscs`; el wrapper `/discs/homeDiscs` y Dashboard no se modifican. Los campos personales siguen separados por usuario/generación en la key de ranking y Axios conserva la autenticación.
- `useTopDiscsFilterCoordinator()` es owner del estado único: periodo, año, `dateRange`, `countryId` y `genreId`. El rango seleccionado de la vista se deriva de ese estado. La vista ya no usa `useCatalogStore` para estas opciones.
- Opciones salen solo de `getTopDiscsOptions()` y `useTopDiscsOptionsQuery()`. El coordinador usa keys normalizadas independientes y `queryClient.fetchQuery()` para secuenciar validación y caché. Pasa `AbortSignal`, cancela la key de opciones anterior y usa un contador de revisión para descartar respuestas tardías. El ranking permanece deshabilitado mientras valida opciones y se activa con la combinación final; si falla opciones, conserva la selección y permite reintentar.
- Política: al cambiar periodo se validan ambos IDs contra sus listas cruzadas y se limpian en la misma transacción los IDs ausentes; después se consulta la lista final. Al cambiar país, se conserva el ID elegido y solo se limpia el género si no aparece entre los disponibles para ese país. Al cambiar género, se conserva el género y solo se limpia el país si no aparece entre los países disponibles. Cambios repetidos al mismo valor no generan petición; Todos omite `dateRange` y no dispara una llamada duplicada.
- `DiscFilters.vue` ahora sigue cambios de props para país y género sin modificar el contrato de eventos ni los estilos. Sus otros consumidores conservan su flujo; la suite de Rankings prueba la sincronización padre/hijo.
- Pruebas simuladas: 59 tests pasan en 9 suites focalizadas, incluyendo periodos, filtros válidos/inválidos, anclas explícitas, opciones vacías, error/reintento, respuestas fuera de orden, abort, ausencia de duplicados, endpoint oficial y tarjetas. También pasan las regresiones existentes de `/homeDiscs`, `DashboardTop3Widget` e interacciones de `DiscCardComponent`.
- Verificación: typecheck y build pasan; build emite un warning CSS preexistente sobre `.flex-[2]`, advertencias de Browserslist y tamaño de bundle. Pasan ESLint/Prettier focalizados en archivos nuevos y `git diff --check`. ESLint al incluir `HomePage.vue` y `DiscFilters.vue` informa 14 diagnósticos en código legacy de esos SFC (labels, `v-model` sobre props, claves retornadas duplicadas y variable sin uso); no se corrigieron hallazgos ajenos al alcance. Prettier focalizado a esos SFC informa formato no conforme existente; no se reformatearon para evitar un diff de archivo completo. `cycles:fixtures` (12) e `identity:boundaries:fixtures` pasan. Los escaneos actuales encuentran 0 imports locales sin resolver y 0 violaciones de producción de Identity, pero la comparación de ambos gates es informativa porque no se pudo resolver `HEAD`; cycles conserva una cadena type-only existente. `markdown:links` mantiene 1 fallo informativo fuera del repo en `roadmap/roles.md:9`.
- Fotografía del alcance de C-TOP-4a: sin backend, Dashboard, servicios legacy, estilos ni rutas. En aquel momento no incluía la propuesta de Top 3 mensual ni reducir la cantidad. La propuesta mensual quedó supersedida por C-TOP-6; C-TOP-4c y C-TOP-5–C-TOP-7 estaban entonces pendientes.
- Riesgos: las pruebas de integración SQL real siguen pendientes con PostgreSQL aislado; no se consultó producción. Los estados funcionales tienen mensajes básicos y conservan el diseño, pero una revisión responsive/visual queda para su fase correspondiente.

### C-TOP-4c — Frontend: extracción de cabecera y regresión focalizada (**completada**)

1. Extraer filtros dinámicos, periodos, selectores de rango/año y estados de opciones a `src/modules/catalog/top-discs/presentation/components/TopDiscsHeader.vue`, sin cambiar `/rankings`, la posición de la cabecera ni su apariencia.
2. Dejar `HomePage.vue` como composición de cabecera, query/acciones del ranking y tarjetas. No crear aún componentes mensuales ni de clasificación.
3. Mantener `useTopDiscsFilterCoordinator()` como dueño del estado y la selección de `DiscFilters` controlada por props/eventos. La cabecera recibe valores y opciones tipadas; no importa API, adaptadores ni queries.
4. Revisar filtros temporales y dinámicos, estados async, ranking, caché de sesión, tarjetas/Community, Identity y el consumidor legacy de Dashboard.

#### Arquitectura y contratos tras C-TOP-4c

- `HomePage.vue` conserva estado/queries: periodo, año, rango, país, género, opciones del coordinador, `useTopDiscsQuery()`, adaptación de payload, retries del ranking y la lista actual. Renderiza `TopDiscsHeader` antes del scroll-to-top/listado como hasta ahora.
- `TopDiscsHeader.vue` es presentacional. Sus props tipadas contienen periodo/rango/año, países y géneros disponibles, selección actual y estados de opciones. Emite `period-change`, `year-change`, `range-change`, `country-change`, `genre-change` y `retry-options`. No conoce transporte ni reglas de selección.
- `DiscFilters.vue` mantiene su API, sincronización padre→hijo y consumidores de calendarios/listados. `DiscCardComponent.vue` no se refactoriza y conserva su API de Community.
- Fotografía previa a C-TOP-6: la composición estaba preparada para las futuras secciones, sin componentes placeholder, query del Top 3 ni cambios de cantidad. La referencia a una query del Top 3 corresponde al requisito luego supersedido.

#### Pruebas, escenarios y defectos

- Nueva suite de `TopDiscsHeader`: periodos y selectores renderizados, eventos de rango/año/filtro/reintento, props actualizadas por el padre, carga/error/vacío y disponibilidad de datos. La extracción conserva etiquetas, orden, clases y posición visual; se añadieron nombres accesibles a los selects temporales sin alterar apariencia.
- Suite existente de coordinador (13 tests) y selección (4): carga inicial, cambios/orden de país y género, combinación válida e incompatible, limpieza conjunta y prioridad de la selección explícita, filtros válidos/inválidos al cambiar periodo, Todos sin duplicar requests, errores/reintentos, opciones vacías, cancelación y respuestas tardías.
- Tests de vista/adaptadores: `/discs/topDiscs/options` y `/discs/topDiscs`, parámetros/rango, ausencia de endpoint legacy en Rankings, lista y tarjetas actuales, Todos sin `dateRange`/llamadas duplicadas. La query usa la key normalizada actual; los resultados de otra combinación no se presentan como resultado vigente.
- La revisión de `DiscCardComponent` encontró que el cambio de una valoración musical puede modificar puntuación/elegibilidad del ranking, pero Rankings no invalidaba sus queries. La vista ahora invalida el prefijo `['catalog','top-discs']` al recibir `rating-saved` con `musicalRateChanged=true`; guardar solo portada no invalida. Queda probado en integración de vista.
- La prueba de pérdida de sesión descubrió que la guardia activa del router solo redirigía rutas con `requiresRole`, por lo que una sesión expirada podía dejar abierta `/rankings`. `watchActiveRouteAuthorization()` ahora redirige a Login cuando cualquier ruta protegida queda anónima; su regresión específica pasa. No se detectaron otros defectos reproducibles que justificaran cambiar Community.
- Regresiones ejecutadas para eventos de rating en tarjeta, votos de Dashboard, navegación protegida de Rankings (anónimo, usuario autenticado y pérdida de sesión), identidad de caché por usuario/generación, cancelación y servicio `homeDiscs`/Dashboard legacy. No se cambió Dashboard ni se retiró el endpoint legacy. Los límites backend de rate/favorito/pendiente continúan siendo autoridad; los guards del frontend no sustituyen autorización del servidor.
- Favoritos, pendientes y apertura de comentarios/detalle se revisaron estáticamente en `DiscCardComponent`; esta iteración no añade una suite específica para cada una de esas acciones porque el componente y sus contratos no cambian. Sus mutaciones locales no alteran el score global; no se modificaron sus invalidaciones.

#### Verificación de C-TOP-4c

- Tests focalizados: 13 suites, 102 tests pasan (API, selección/coordinador, cabecera, vista, `DiscFilters`, tarjeta, rutas, caché privada de Identity, estado de Auth, votos del widget aleatorio y `DashboardTop3Widget`). Los mocks cubren HTTP; no se accedió a producción.
- Typecheck (`pnpm run typecheck`) y build (`pnpm build`) pasan. Build conserva warnings observados de Browserslist, selector CSS histórico `.flex-[2]` y tamaño de chunk.
- ESLint focalizado de los archivos Vue/TS modificados pasa tras añadir etiquetas programáticas. Prettier pasa para el nuevo componente y sus pruebas; el check de `HomePage.vue` y del test legacy de rutas señala formato histórico en esos SFC/tests, sin reformateo masivo. `git diff --check` pasa.
- Gates `cycles`/`identity:boundaries`: 0 referencias locales sin resolver y 0 violaciones productivas actuales; su comparación es informativa porque no se pudo resolver `HEAD`. Sus 12 fixtures y fixtures de fronteras pasan. No se atribuyen los hallazgos históricos a esta extracción.
- Verificación visual manual en navegador, visual responsive en ambos temas y contraste medido no realizados. La implementación conserva estáticamente clases, orden y posición de la cabecera.
- La integración SQL de `topDiscs/options` y `topDiscs` con PostgreSQL aislado continúa sin verificarse; no se consultó ni producción ni otra base. No se hizo medición `EXPLAIN`.

C-TOP-4c queda cerrada en su alcance de extracción y regresión. C-TOP-5, C-TOP-6 y C-TOP-7 seguían pendientes en ese cierre histórico. La mención al Top 3 mensual describe el requisito de entonces, supersedido después por C-TOP-6.

### C-TOP-4 — Integración frontend (épica)

1. C-TOP-4a prepara contratos, adaptadores y queries para la vista.
2. C-TOP-4b integra ranking, opciones y filtros dependientes en `/rankings`.
3. C-TOP-4c verifica la regresión final de la integración.
4. Conservar el servicio legacy y no modificar Dashboard. El renombrado de `HomePage.vue` queda fuera de C-TOP-4b.

### C-TOP-5 — Cabecera (**completada**)

1. Reorganizar `TopDiscsHeader.vue` en dos grupos semánticos y conservar la identidad visual y comportamiento existentes.
2. Mantener controles temporales (Semana/Mes/Año/Todos y selectores condicionales) en la primera fila; colocar país/género debajo en una distribución equilibrada.
3. Hacer que los controles se adapten a escritorio, tablet y móvil sin overflow ni solapamientos.
4. Mejorar la operación por teclado y los nombres/relaciones accesibles sin alterar la selección ni la coordinación.

#### Estructura final y componentes

- `TopDiscsHeader.vue` ordena primero el grupo `Filtros temporales` y después `Filtros de catálogo`. Ambos usan `role="group"` y nombre accesible; su orden DOM coincide con el orden visual.
- La primera fila permite wrap: los cuatro periodos conservan colores, tipografía, bordes, radios y hover; el rango se muestra para Semana/Mes/Año y el selector de año solo para Semana/Mes. El grupo de selects también puede envolver en pantallas estrechas.
- `DiscFilters` se conserva sin cambios. La cabecera usa su contrato `externalRow1` para disponer país y género en una grid de una columna en móvil y dos columnas iguales desde `md`. El ancho conjunto de la fila de catálogo sigue el ancho natural del grupo temporal; cada select ocupa la mitad de ese espacio en escritorio y ambos llenan el ancho disponible al apilarse en móvil.
- `SearchableSelect.vue` conserva opciones, filtros y contratos de actualización. Su trigger ahora es un botón nativo, operable con Enter/Espacio y con apertura por Flecha abajo. El menú expone `listbox`/`option`, controles asociados y etiquetas accesibles; no se cambió su lógica de selección.
- Estados de carga/error/vacío continúan después de los controles de catálogo. `/rankings`, queries, coordinador, filtros dinámicos, tarjetas y número de discos no cambiaron.

#### Accesibilidad y pruebas

- Los selects temporales conservan `aria-label`; los botones de periodo tienen foco visible. Los triggers compartidos son botones nativos con `aria-expanded`, y al abrirse llevan el foco al campo de búsqueda etiquetado; el campo comunica la opción activa y las opciones admiten selección por teclado.
- Suite de `TopDiscsHeader` (9 tests): orden de los dos grupos, contenedor compartido y ancho de la fila de filtros, controles de periodo, condicionales temporales, eventos sin transformar, props/opciones actualizadas y estados de carga/error/vacío/reintento.
- Nueva suite del `SearchableSelect` (2 tests): trigger de teclado, asociación con listbox, foco en búsqueda, selección con flechas/Enter y cierre con Escape. Se conserva la suite padre-hijo de `DiscFilters`.
- Tests focalizados finales: 8 suites, 45 tests pasan, incluidos adaptadores, coordinador y vista TopDiscs.

#### Inspección visual y limitaciones

- Chromium headless con harness local del componente real y opciones simuladas: 1440 px (escritorio ancho), 1024 px (escritorio estándar), 768 px (tablet) y 390 px (móvil). Se capturó también móvil en tema oscuro. Las dos columnas quedan equilibradas; en móvil los selects se apilan y los controles temporales envuelven sin desbordes ni solapamientos.
- Comprobación visual adicional de la anchura solicitada con Chromium headless: a 1440 px el conjunto país/género ocupa el mismo ancho que el grupo temporal; a 390 px ambos selects llenan la anchura disponible al apilarse. El harness usa datos simulados y no representa una sesión autenticada de `/rankings`.
- El navegador no pudo renderizar la ruta real `/rankings`: Identity permaneció en «Comprobando tu sesión…» y mostró indisponibilidad del servicio de autenticación local. El preview aislado verifica el componente con la composición del título, pero no sustituye la inspección de la ruta integrada. No se usó producción ni dispositivo físico.
- El detector de layout de Impeccable no reportó hallazgos. El build conserva warnings existentes de Browserslist, `.flex-[2]` y tamaño de chunks. Gates de ciclos/fronteras sin hallazgos actuales, pero comparativa informativa al no poder resolver `HEAD`; fixtures pasan.
- La integración SQL de TopDiscs con PostgreSQL aislado sigue pendiente y no se verificó en esta tarea.

C-TOP-5 queda completada. En el cierre de C-TOP-5, C-TOP-6 y C-TOP-7 seguían pendientes; esta fotografía es histórica. El alcance aprobado entonces para C-TOP-6 ha sido supersedido por la decisión de clasificación única descrita arriba.

### C-TOP-6 — Presentación

**Estado: completada.** Una única instancia de `useTopDiscsQuery` sigue alimentando toda la presentación. En el cierre C-TOP-6 el límite backend era 20; esa referencia quedó supersedida por la reducción posterior y definitiva a 11 de C-TOP-11, confirmada por el usuario en C-TOP-7. No se modificaron endpoint, cálculo bayesiano, desempates, autenticación, filtros dinámicos ni invalidación tras votos musicales.

#### Decisión corregida

La propuesta anterior —un Top 3 del mes actual independiente de filtros y ocho resultados principales— queda **supersedida**. La decisión definitiva es **una única clasificación filtrada, presentada en dos bloques visuales**. No hay query mensual independiente, filtros distintos entre bloques ni lógica del mes actual.

#### Presentación implementada

- `TopDiscsRanking.vue` recibe los discos de una sola consulta y organiza `discs.slice(0, 3)` y `discs.slice(3, 11)` desde los primeros 11 elementos en su orden original. Los elementos posteriores al puesto 11 no se muestran; no se rellenan ni se repiten posiciones.
- `TopDiscsFeatured.vue` presenta los puestos 1–3, con tres columnas en escritorio, dos en tablet y una en móvil.
- `TopDiscsGrid.vue` presenta los puestos 4–11, con cuatro columnas en escritorio, dos en tablet y una en móvil.
- Los bloques reutilizan `DiscCardComponent.vue` y retransmiten `rating-saved`. El Top 3 muestra chips ordinales oro/plata/bronce como DashboardTop3Widget; no hay títulos de sección ni rótulos individuales para los puestos 1–11. La vista conserva queries, filtros, estados, reintento e invalidación.
- Loading y error ocultan el ranking previo mientras se actualizan los filtros. El estado vacío se presenta sin renderizar bloques vacíos. Cabecera y ruta `/rankings` se conservan.

#### Pruebas y verificaciones

- Tests de presentación cubren entradas simuladas de 0, 1, 2, 3, 4, 8, 11 y 20 discos; 20 es un fixture de prueba del límite frontend, no el máximo HTTP vigente. Se comprueban límite visible de 11, asignación de posiciones, orden, ausencia de duplicados, omisión de bloques vacíos y propagación de `rating-saved`.
- Tests de vista cubren una sola petición de ranking, actualización al cambiar filtros, cabecera, estados de carga/error/vacío, reintento e invalidación tras el cambio de valoración. Regresión de permisos de `/rankings` cubierta.
- En el cierre de C-TOP-6, C-TOP-7 aún estaba pendiente. Su cierre posterior confirma el tope definitivo de 11. No se modifican servicios legacy ni Dashboard.
- La verificación SQL de TopDiscs con PostgreSQL aislado se completó posteriormente en C-TOP-11; C-TOP-6 no ejecutó integración SQL ni accedió a producción.

#### Limitaciones de inspección visual

Chromium local inspeccionó el componente real `TopDiscsRanking` en un harness temporal con tarjetas reales y datos simulados: 1440, 1024, 768 y 390 px en tema claro y oscuro. Tras el ajuste solicitado de presentación, se volvió a revisar el formato final a 1440 y 390 px en ambos temas: el Top 3 muestra los chips con trofeo y ordinal oro/plata/bronce del widget “Mejores del mes”; no aparecen encabezados ni etiquetas “Puesto N”, y el resto conserva la distribución de cuatro columnas en escritorio. No se observó desplazamiento horizontal accidental.

La navegación completa de `/rankings` no se declara verificada: la ruta está protegida por Identity y el harness inspeccionó el componente aislado. No se usó producción ni servicios externos. No se verificó el recorrido desde login ni el comportamiento real de autenticación.

### C-TOP-7 — Regresión final y cierre

**Estado: COMPLETADA. TopDiscs: COMPLETADO Y CERRADO.** La regresión se ejecutó el 2026-10-28. La discrepancia observada entre 20 y 11 quedó resuelta por confirmación expresa del usuario: el cambio del límite de 20 a 11 es intencionado y definitivo, no un defecto. Las referencias previas a 20 se conservan solo como historial supersedido.

#### Arquitectura y comportamiento verificados

- `HomePage.vue` mantiene composición, coordinación y una única `useTopDiscsQuery`; `TopDiscsHeader`, `TopDiscsRanking`, `TopDiscsFeatured` y `TopDiscsGrid` reciben datos/props tipados y no hacen HTTP. Los bloques usan los mismos resultados y filtros; el ranking conserva el orden del backend y presenta `slice(0, 3)` y `slice(3, 11)`, sin duplicados ni relleno. No hay score bayesiano frontend.
- El coordinador conserva periodo, rango, país y género como estado único; opciones/ranking usan claves de caché separadas, abortan consultas previas, ignoran respuestas fuera de orden y resuelven opciones incompatibles antes de habilitar el ranking. Las opciones llegan por `/api/discs/topDiscs/options`, sin usar `/api/catalog` como sustituto ni aplicar el límite visual de 11.
- Se verificaron las invalidaciones de votos musicales y la ausencia de invalidación por cambios solo de portada; se mantienen las props y acciones compartidas de votos, favoritos, pendientes, comentarios, detalles y enlaces. `DiscCardComponent.vue` se conserva sin cambios en este cierre.
- Las claves de query incluyen identidad/generación de sesión y el ciclo Identity limpia caché privada. Las pruebas existentes cubren protección de `/rankings`, cambio de sesión y consumidor Dashboard. `homeDiscs` se conserva como legacy y ambas rutas comparten implementación, filtros y tope de 11; no se modificó Dashboard.
- Contrato estadístico verificado contra C-TOP-10/11: `S = (R × v + C × 4) / (v + 4)`, `k = 4`, media observada separada de `weightedScore`, deduplicación determinista, votos válidos cero incluidos y `pinned` sin voto válido excluido. No se modificó modelo ni SQL.

#### Pruebas, gates y accesibilidad

- Frontend: 19 suites focalizadas, 156 tests aprobados, incluidos coordinador, queries/adaptador, cabecera, ranking (0, 1, 2, 3, 4, 8, 11 y 20 resultados), filtros/teclado, estados, tarjeta, rutas/Identity/caché privada, DashboardTop3 y voto del widget aleatorio. Se excluye el test adicional de accesibilidad de `DiscCardComponent` que se retiró al revertir los cambios de la tarjeta.
- Backend en modo unitario sin PostgreSQL: 7 suites y 43 tests aprobados (controller oficial/legacy, servicio, helpers y opciones). C-TOP-11 ya documenta 19 tests PostgreSQL aprobados en instancia aislada; no se repitió ni se conectó a ninguna base en esta regresión.
- `pnpm run typecheck`, `pnpm run build`, `git diff --check`, gates `cycles` e `identity:boundaries` aprobados. Ciclos/fronteras: un ciclo type-only histórico articles/contents, cero violaciones productivas de Identity; comparación contra `HEAD` informativa porque el checker no resuelve el `HEAD` local.
- ESLint focalizado mantiene diagnósticos históricos en `DiscCardComponent.vue` (incluida su semántica de controles existente), así como imports `nextTick`, tipos `any` y props duplicadas en ese archivo, y diagnósticos en `DiscFilters`. Prettier señala formato histórico en SFC/tests legacy, sin ejecutar una reescritura general.
- `SearchableSelect` conserva su operación por teclado y sus tests. No se modificó la semántica ni el foco de los controles compartidos de `DiscCardComponent.vue`; no se completó una auditoría automatizada de accesibilidad de la tarjeta ni una medición automatizada de contraste.

#### Limitaciones documentadas

- La navegación local real a `/rankings` llegó a la página de error de Identity («No hemos podido recuperar tu sesión»), por lo que no se declara verificada la navegación autenticada ni el flujo integrado de login/logout/cambio de usuario.
- Harness local aislado con los componentes reales de cabecera/ranking/tarjeta y 20 discos simulados: 1440, 1024, 768 y 390 CSS px en tema claro y oscuro. Se observaron 3+4 columnas en escritorio, 2+2 a 768, una columna a 390 y 11 tarjetas sin overflow de documento. El viewport del navegador devolvió 391 CSS px al solicitar 390. La captura de screenshot del navegador agotó su tiempo; se comprobaron DOM, estilos calculados, columnas y ancho. El harness no equivale a validar la ruta integrada ni interacciones reales de servicio.
- No se completó una medición automatizada de contraste. Persisten diagnósticos históricos de formato, lint y tooling. Build conserva avisos de Browserslist desactualizado, sintaxis minificada de `.flex-[2]` y chunks >500 kB; tests emiten warnings de FontAwesome en el harness de RandomDisc. `pnpm run verify` no se considera aprobado: su ejecución previa se interrumpió antes de terminar.
- No se accedió intencionalmente a producción; no se ejecutaron migraciones ni se consultaron bases. No se inició otra vista de Catalog.

#### Cierre

No se eliminaron servicios o endpoints legacy ni se refactorizó Community/Identity. Los controles compartidos de tarjeta permanecen sin cambios; su accesibilidad por teclado no se declara verificada en este cierre. La ruta integrada con sesión real, la medición automatizada de contraste y la auditoría de accesibilidad de la tarjeta quedan como limitaciones conocidas, no como bloqueos funcionales confirmados. No se inicia otra vista de Catalog.

## Decisiones y riesgos registrados

- `homeDiscs` tiene un consumidor Dashboard activo además de Rankings; esta evidencia refuerza la compatibilidad, pero la permanencia legacy es obligatoria incluso sin consumidores confirmados.
- C-TOP-3a y C-TOP-3b mantienen la ruta legacy, `/api/catalog` y `/api/discs/options`; no hay decisión de retirada ni fecha.
- El controller no usa Swagger/OpenAPI en el código/dependencias revisados; JSDoc es el mecanismo aplicable por ahora.
- La vista actual puede enviar rangos cuyo fin supera hoy; el backend los recorta. Rechazarlos en el nuevo endpoint rompería semanas/meses/años actuales. El nuevo endpoint de opciones debe compartir esta intersección temporal.
- `DiscFilters` sincroniza ahora sus valores controlados de país y género desde props; su contrato/eventos se conservan para sus otros consumidores.
- C-TOP-4a, C-TOP-4b, C-TOP-4c y C-TOP-5 están implementadas; `/rankings` usa los endpoints oficiales y opciones dinámicas, con cabecera reorganizada y regresiones focalizadas cubiertas.
- C-TOP-11 completó la integración SQL de opciones y ranking en PostgreSQL aislado con fixtures sintéticos; sigue pendiente medir con un dataset representativo. No se consultó producción.
- Los recuentos por opción quedan pendientes de aprobación; semántica y costes están descritos, pero no forman parte del JSON inicial.
- No se midió SQL nuevo ni se consultó producción. Los índices de releaseDate requieren inspección/medición en PostgreSQL aislado; no hay migración aprobada.

## Cierre histórico de C-TOP-2

- Estado en ese cierre: diseño técnico/documental completado; no se implementaron rutas, cambios frontend/backend, migraciones ni recuentos. En ese momento C-TOP-3a, C-TOP-3b y C-TOP-4–C-TOP-7 seguían pendientes.
- Documentación: este roadmap conserva la auditoría original de C-TOP-1, registra el contrato aprobado y actualiza su entrada en `roadmap.md` para que el estado del índice coincida.
- Verificación realizada: los enlaces de Markdown del documento y el enlace del índice al roadmap existen; `git diff --check` no reporta errores. El archivo nuevo se revisó también por whitespace porque no está seguido por Git. No se ejecutaron tests de producto ni se consultó producción.
- Los cambios locales existentes en `src/layouts/default/components/routes.json` y el resto de `roadmap.md` se conservaron; el índice solo cambia la línea de estado de C-TOP.

## C-TOP-12 — Migrar HomePage.vue al módulo TopDiscs

**Estado: completada.** Tarea de mantenimiento arquitectónico posterior al cierre funcional de TopDiscs; C-TOP-7 permanece cerrada y sin cambios.

- La vista se movió, sin cambios de composición o comportamiento, de `src/views/homePage/HomePage.vue` a `src/modules/catalog/top-discs/presentation/views/TopDiscsView.vue`. El test de montaje y coordinación de filtros se movió junto a la vista y se actualizó para montar `TopDiscsView`.
- La ruta pública `/rankings`, su nombre `Rankings`, `meta.requiresAuth` y lazy loading permanecen intactos. El import diferido apunta ahora a `TopDiscsView.vue`; la prueba de permisos comprueba también que ese loader resuelve el componente esperado.
- La vista pertenece exclusivamente a TopDiscs. `NewsFeed.vue` conserva su ubicación legacy y su consumidor independiente. `DiscCardComponent.vue`, `DiscFilters.vue` y `SearchableSelect.vue` permanecen fuera del módulo por su uso compartido; no se reorganizaron.
- La vista mantiene el coordinador y la query existentes, los bloques de 3 + 8 discos, estados, eventos, acciones Community y los controles de acceso Identity. No se cambian contratos HTTP, filtros, servicios ni configuración de Identity.
- Documentación canónica: `docs/frontend/architecture.md` describe TopDiscs, la ubicación de su vista, `/rankings` y los componentes compartidos. Las menciones a `HomePage.vue` en el historial anterior de este roadmap siguen siendo registros históricos.
- Cambios locales preexistentes en `DiscFilters.vue`, `SearchableSelect.vue`, router, tests, rutas de navegación y roadmap fueron preservados; solo se ajustaron las referencias requeridas por el movimiento.

**Verificaciones locales:** 9 archivos de pruebas focalizadas de TopDiscs, router y autenticación pasan (71 tests); también pasan las 2 suites de los controles compartidos (3 tests). `pnpm run typecheck`, `pnpm run build`, ESLint focalizado y `git diff --check` pasan. El build conserva avisos de Browserslist, la clase CSS `.flex-[2]` y tamaño de bundle. Prettier focalizado se ejecutó y marca formato en la vista legacy trasladada y en router/test con cambios preexistentes; no se reformatearon para evitar un diff no funcional fuera del alcance. Los modos informativos de los gates arquitectónicos reportan 0 edges locales sin resolver y 0 infracciones de Identity; el scan de ciclos conserva el componente type-only histórico en `articles`/`contents`/`riff-valley-playlists`. Los modos `:required` no pueden comparar porque no reciben referencias base/head, por lo que la comparación de deltas queda sin validar. No se infiere una ejecución de CI.
