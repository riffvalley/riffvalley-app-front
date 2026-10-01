# 3.5 — Consolidación de Catalog

Alcance exclusivo de 3.5: reorganización del código ya migrado y retirada de
compatibilidad sin consumidores. No se migra ningún recorrido nuevo ni se inicia
Community. Se conservaron los cambios de SpotifyArtistButton e Integrations que
ya existían en el árbol de trabajo al comenzar.

## Auditoría previa

Se leyeron AGENTS.md, roadmap.md y architecture-baseline.md y se revisaron todos
los archivos de Catalog, sus imports/exports y consumidores de src/tests.

- API inicial: identidades de detalle de disco/artista, proyecciones de calendario
  y gestión de artistas, contratos del modal de descubrimiento Last.fm, las dos
  vistas de calendario y exportCalendarHtml. Gestión, importación y la tarjeta
  estándar también importaban internals de Catalog.
- Ningún import de Catalog hacia otros módulos de producto o Integrations.
  App compone las operaciones de Catalog y los proveedores. El análisis del
  grafo completo de src no encontró ciclos que incluyeran Catalog.
- Los seis adaptadores importaban el singleton a través de services/api/api.ts.
  Dos componentes de calendario reutilizan DiscFilters, SimpleSelect y las
  constantes de fechas legacy; estos siguen teniendo consumidores.
- Dos stores distintos: catalog (shell, calendarios y consumidores legacy) y
  catalog-pilot (gestión de artistas e importación). El segundo tiene un guard
  loading; el primero no. Ambos cachean durante la vida de Pinia y ordenan las
  opciones. No se fusionan porque cambiaría identidad, concurrencia y cache.
- El store migrado tiene 27 líneas; composables de listado (67), paginación (25),
  scroll (26) y descubrimiento (95) tienen responsabilidades delimitadas. No hay
  un god-store/composable que justifique una nueva extracción. Las vistas de
  calendario conservan políticas distintas de filtros, expansión y foco; comparten
  paginador, scroll y fecha. No se crea una vista genérica.
- catalogPort mezclaba datos de referencia y listado de discos. Los helpers de
  edición mezclaban actualización de formulario y confirmación/borrado; la regla
  de alternancia de país estaba junto a la proyección de gestión. Se separan.
- Sin consumidores: searchArtists, searchArtistsByName, deleteArtist,
  deleteOrphanArtists y getArtistsManagement del servicio legacy de artistas;
  ArtistResult, DeleteOrphansResponse y sus reexports de proyecciones de gestión.
  La búsqueda by-name migrada sí tiene consumidores y se conserva.
- No hay mappers que retirar. CalendarPageDto era un alias idéntico a CalendarPage;
  se elimina. Las proyecciones de API se conservan sin duplicar DTOs.

## Estructura final

```text
modules/catalog/
├── discs/
│   ├── listing/           # operación, puerto y adaptador del listado
│   ├── detail/domain/     # identidad mínima del detalle compuesto en app
│   └── calendars/         # dominio, paginador, escritura/exportación, UI
├── artists/
│   ├── listing/           # carga, filtros, debounce y paginación
│   ├── editing/           # PATCH, actualización local y alternancia de país
│   ├── deletion/          # DELETE, confirmación y retirada local
│   ├── creation/          # crear y asociar al disco existente
│   ├── detail/domain/     # identidad mínima del detalle compuesto en app
│   ├── discovery/         # modal, cache/navegación y coincidencia de artistas
│   ├── images/application/# rellenado masivo con un puerto de búsqueda
│   ├── domain/            # proyección de gestión compartida entre recorridos
│   ├── application/       # contratos de artistas usados por varios recorridos
│   └── infrastructure/    # adaptador de los endpoints de gestión
├── reference-data/        # géneros + países: un endpoint y una cache
└── index.ts               # API explícita para consumidores
```

Las capas se crean solo donde hay implementación. No se divide géneros/países
artificialmente ni se replica el adaptador común de artistas por operación.
La presentación se agrupa por tipo dentro de cada feature: calendarios y su
helper en `views`, modal Last.fm en `components`, coordinación UI en
`composables` y cache en `stores`. El desglose y la guía de navegación están en
[docs/catalog-structure.md](catalog-structure.md). Las plantillas, estilos,
props, eventos y operaciones conservan su implementación.

## API pública y composición

index.ts publica únicamente símbolos consumidos, sin exportaciones wildcard:

- Discos: DiscDetailIdentity, CalendarDisc, CalendarGroup, DiscCalendarView,
  BabyDiscCalendarView y exportCalendarHtml.
- Artistas: ArtistDetailIdentity, ArtistManagementItem, ArtistManagementDisc,
  UpdateArtistInput, alternateCalendarCountryId,
  useArtistManagementList, applyArtistEditLocally, confirmAndDeleteArtist,
  removeArtistLocally, LastFmManagementModal, useLastFmManagement,
  LastFmManagementDependencies.
- Referencias: Catalog, Country, Genre y useCatalogStore (catalog-pilot).

La presentación legacy usa esta API. App conserva acceso a operaciones, puertos
concretos y adaptadores para componer dependencias; no se publican todos esos
internals. El servicio legacy de referencias conserva acceso al adaptador para
mantener su firma getCatalog(), utilizada por el store catalog.

Todos los adaptadores de Catalog consumen directamente
shared/infrastructure/http/client: el mismo singleton con los mismos
interceptores y callbacks de sesión. Catalog ya no importa servicios legacy.
Sus únicas dependencias legacy restantes son los componentes de filtros/select
reutilizados y las constantes de fechas; no contienen transporte del módulo.

## Limpieza y límites de responsabilidad

Se eliminan las cinco operaciones y los tipos/reexports huérfanos del servicio
de artistas enumerados en la auditoría. El servicio permanece con postArtist y
updateArtist porque la tarjeta estándar aún referencia sus fallbacks. Se conserva
ArtistWithCountry, usado en el resultado de postArtist.

Se mantienen las fachadas DiscDetail, ArtistDetail y calendarios y los servicios
legacy de discos, catálogo y transporte porque tienen consumidores reales.
La consolidación no convierte ArtistManagement ni las tarjetas mixtas en un
nuevo recorrido: su UI legacy sigue ensamblando responsabilidades ajenas.

- Community: valoraciones, medias/recuentos, comentarios, favoritos y pendientes.
  userRate del listado y rateCount/averageRate de gestión son datos de lectura;
  Catalog no ejecuta sus operaciones. La normalización numérica existente de
  listDiscs se conserva por compatibilidad, pendiente de revisar en Community.
- Releases: novedades nacionales, aprobación, peticiones, sugerencias/importación
  y relaciones nationalReleaseId. Permanecen como campos de proyecciones mixtas,
  sin trasladar workflows a Catalog.
- Integrations: HTTP, autenticación y selección de resultados Spotify/Last.fm.
  App inyecta perfiles/imágenes; Catalog mantiene solo coordinación del recorrido
  de descubrimiento y el puerto de imagen necesario para actualizar artistas.
  Los campos spotifyPlaylists de gestión describen asociaciones visibles;
  no introducen acceso al proveedor ni gestión editorial de playlists.

No hay dependencias de Catalog hacia Community, Releases, Identity ni otros
módulos. La composición con Integrations sigue en app; la frontera de apertura
al detalle con acciones Community continúa usando el bridge existente.

## Red de seguridad y compatibilidad

El guard reconoce capas anidadas bajo capacidades/funcionalidades y mantiene
las reglas anteriores para las rutas antiguas. Se refuerza además el rechazo de
imports del transporte HTTP compartido fuera de infraestructura (app puede
componerlo). No se añaden excepciones ni ignores arquitectónicos.

Se añaden tres pruebas del guard: límites en rutas anidadas, adaptadores válidos
con fronteras entre módulos, y ciclos/dependencias hacia app. Nueve suites
existentes de Catalog/calendarios/descubrimiento ajustan rutas de import y mocks
del transporte. Se elimina un mock de adaptador sin uso del test del store,
cuyo puerto ya se inyectaba. Los casos funcionales no se reescriben.

Compatibilidad conservada: URLs, nombres de ruta, query params, carga diferida
del router, endpoints/payloads, permisos, claves de storage, IDs de stores,
políticas de cache, props/eventos, estilos y comportamiento visual. Los siete
E2E existentes prueban calendarios estándar/babyUser, filtros/paginación,
restricciones de rol y apertura/cierre/reapertura de los detalles.

Un detector visual señaló el botón de borrar de ImportPage al ajustar su import.
Se registró una excepción gray-on-color limitada a ese archivo: el gris pertenece
al estado sin fondo coloreado y el hover ya cambia a rojo junto al fondo rojo.
No se cambian estilos ni se desactivan reglas visuales globalmente.

## Validación

- Lint y arquitectura: pasan, 91 archivos arquitectónicos verificados.
- Tests unitarios: 164/164 en 26 suites; la primera ejecución encontró EPERM
  del sandbox al lanzar el compilador; la repetición fuera del sandbox pasa.
- Playwright: 7/7 en Chromium, calendarios y detalles de disco/artista.
- Build: pasa; persisten avisos conocidos de Browserslist, .flex-[2] y chunk >500 kB.
- yarn verify: ejecutado, se detiene en TypeScript por MonthlyVotesChart.vue TS2345.
  Se compiló también HEAD en una copia temporal usando las mismas dependencias.
  Ambos producen 118 diagnósticos. El único mensaje diferente corresponde al
  mismo error preexistente: cambia el orden impreso de la unión updateMode
  (`"reset" | "none" | "default" | "resize" | "hide" | "show" | "active"`
  frente a `"reset" | "none" | "default" | "active" | "resize" | "show" | "hide"`).
  Al ordenar únicamente los literales impresos para la comparación de auditoría,
  todos los diagnósticos coinciden (archivo, código, mensaje y línea fuente).
  Esta comparación NO se incorpora a la puerta ni al baseline. El verde agregado
  sigue pendiente: no se corrige el gráfico ajeno a Catalog ni se amplían
  excepciones o relajan controles para obtenerlo.
- git diff --check: pasa.
- Plantillas y estilos de las tres vistas de Catalog: idénticos a HEAD.

## Archivos afectados

Además de los movimientos y separaciones dentro de modules/catalog:

- app/dependencies/catalog.ts, discCalendar.ts y lastFmManagement.ts: nuevas rutas
  de composición; app/components/DiscCalendarPage.vue: ruta de tipo.
- services/artist/artist.ts: operaciones huérfanas retiradas;
  services/catalog/catalog.ts: fachada conservada con nuevas rutas.
- views/artists/ArtistManagement.vue, views/importPage/ImportPage.vue y
  views/discsCalendar/components/DiscComponent.vue: consumo de la API pública.
- scripts/architecture.mjs y tests/unit/architecture.spec.ts: guard anidado y
  tres casos nuevos. Las nueve suites funcionales afectadas son
  catalogArtistEditing, catalogArtistList, catalogArtistMatch,
  catalogBulkArtistImages, catalogDiscCalendar, catalogDiscList, catalogStore,
  discCalendars y lastFmManagement.
- roadmap.md y architecture-baseline.md: referencia de cierre de 3.5.
  .impeccable/config.json: falso positivo visual acotado ya descrito.

## Deuda antes de Community

Conservar los dos stores hasta un corte explícito que caracterice su unificación.
Las tarjetas, DiscList y ArtistManagement siguen mostrando datos/acciones mixtos;
Community deberá definir propietario, invalidación y fuente de verdad de su
estado sin convertir sus proyecciones en reglas de Catalog. Los fallbacks legacy
solo se retirarán al desaparecer sus consumidores. La autenticación de Spotify
continúa dependiendo del contrato backend previsto en Iteración 5. La deuda
TypeScript del baseline y los avisos del build no se amplían ni se ocultan aquí.
La comparación textual del baseline necesita un corte de tooling explícito que
resuelva la sensibilidad al orden impreso de las uniones; verify sigue rojo por
esa razón, con los mismos errores de tipos que HEAD.
