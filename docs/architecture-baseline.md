# Baseline de arquitectura

La Iteración 0 registra estas puertas para separar problemas preexistentes de
los introducidos por recorridos migrados. El baseline inicial de `yarn build`
y `yarn typecheck` pasa. El build avisa de datos Browserslist antiguos, una
clase Tailwind con sintaxis CSS inválida (`.flex-[2]`) y un chunk superior a
500 kB; estos avisos no bloquean el build.

## Alcance inicial de las puertas

`yarn lint` y `yarn architecture` aplican reglas estrictas a código nuevo o
migrado en `src/app/**`, `src/modules/**` y `src/shared/**`. Los ciclos solo se
evalúan dentro de ese conjunto; las dependencias externas a él se consideran
fronteras legacy y deben consumirse mediante fachadas públicas.

Excepciones legacy iniciales, limitadas a las carpetas existentes que aún no
se han migrado:

- `src/views/**`, `src/components/**` y `src/layouts/**`: presentación antigua;
  puede contener llamadas HTTP directas y dependencias de proveedores.
- `src/services/**` y `src/helpers/**`: servicios HTTP y acceso directo a
  proveedores que se sustituirán progresivamente por adaptadores.
- `src/stores/**` y `src/composables/**`: estado y coordinación reactiva que
  pueden conservar dependencias legacy mientras no se migre su recorrido.
- `src/router/index.ts`, `src/main.ts` y `src/App.vue`: fachadas y entrada
  conservadas tras la Iteración 2; la composición concreta vive en `src/app`.

Estas rutas no desactivan reglas globales para archivos nuevos. Al migrar una
capacidad, su implementación entra en las rutas verificadas; las excepciones
se eliminan por recorrido y no se amplían para admitir nuevas infracciones.

## Comprobaciones iniciales

- `yarn lint`: aplica ESLint al código de tooling y a las rutas arquitectónicas.
- `yarn architecture`: comprueba imports entre capas y módulos, HTTP en
  presentation, dependencias de framework en domain/application, `any` y ciclos.
  El checkout aún no contiene esos directorios y por eso verifica cero archivos;
  siete pruebas unitarias ejercitan los rechazos y excepciones del guard.
- `yarn typecheck`: ejecuta `vue-tsc --noEmit` sin compilar el bundle.
- `yarn test`: ejecuta pruebas unitarias del guard; Vue Test Utils está
  disponible para pruebas de componentes migrados.
- `yarn test:e2e`: ejecuta un recorrido público de login con las rutas API
  simuladas, sin credenciales ni dependencia del backend. Requiere instalar
  Chromium una vez con `yarn playwright install chromium`.
- `yarn verify`: ejecuta lint, architecture, typecheck, test y build una vez.

La autorización y validación de permisos continúan siendo responsabilidad del
backend. Estas comprobaciones controlan límites del frontend y no demuestran la
seguridad de la API.

## Iteración 2 — Composición, HTTP e identity/session

El transporte concreto vive en `shared/infrastructure/http/client.ts`, sin
imports de Pinia ni Vue Router. `services/api/api.ts` conserva una fachada al
mismo singleton para los servicios existentes. Cada cliente registra una pareja
de interceptores al crearse; configurar callbacks no registra interceptores.

`app/bootstrap/session.ts` conecta el token y la versión de sesión en memoria
con logout y navegación a Login, después de disponer de Pinia y antes de instalar
el router. Las respuestas 401 de una versión anterior se rechazan sin invalidar
la sesión actual. La limpieza y la navegación concurrentes se coordinan mediante
una promesa; todos los errores HTTP originales siguen llegando al consumidor.

`identity` posee sesión, avatar y roles, un puerto de persistencia y el adaptador
HTTP de login. Su store de presentación recibe dependencias; no importa HTTP,
storage del navegador ni router. `workspace` posee provisionalmente las tres
preferencias del dashboard, sin crear un dominio independiente. `app` inicializa
estas preferencias con la respuesta de login y las limpia al cerrar sesión.

Persistencia conservada: token, username, userId e image son strings; roles se
escribe como JSON y también se restaura desde el antiguo formato separado por
comas. Los nombres y formatos de dashboardButtonsEnabled, dashboardConfig y
mobileDashboardConfig siguen siendo los mismos. La migración de
rv_dashboard_config conserva su lógica desktop en el composable legacy. Las
lecturas de roles para moderación y del avatar de perfil pasan por el adaptador
con su valor bruto, conservando las interpretaciones particulares existentes.

El router y sus guards viven en app. La definición de rutas es idéntica a la
anterior: imports diferidos, nombres, paths, redirects, props, query params,
layouts anidados y permisos. Main sigue siendo la entrada. El shell se ensambla
en app/layouts; los layouts existentes se consumen mediante fachadas pequeñas.

El guard arquitectónico reconoce el módulo propietario de sus barrels index.ts.
Así pueden publicar sus propios símbolos sin confundirse con imports entre
módulos; sigue rechazando internals ajenos. Una prueba cubre aceptación y rechazo,
sin nuevas excepciones ni ignore paths.

Deuda conservada: los layouts y recorridos ajenos a sesión mantienen código
legacy; el guard no sustituye autorización del backend. La escritura de
preferencias en backend continúa en el recorrido legacy de usuario/composable.
No se migra catálogo ni se comienza la Iteración 3. Los avisos iniciales de build
(Browserslist, .flex-[2] y chunk grande) siguen presentes.

## Subiteración 3.2 — Detalle de disco

Inventario previo al corte: `components/DiscDetail.vue` no carga un disco de la
API de Riff Valley ni permite editarlo. Busca por nombre de disco y artista en
Spotify y muestra el primer álbum, su portada, fecha, artistas y pistas. Lo
consumen el calendario normal, el calendario babyUser y la gestión de artistas.
No confundir este modal con `DiscCardComponent` (valoraciones) ni con el detalle
de asignaciones de Editorial.

Fronteras conservadas:

- **Catalog:** contrato mínimo `DiscDetailIdentity` (nombre del disco y nombre
  del artista). No hay operaciones propias de Catalog en este modal; no se añade
  un GET, una cache ni una dependencia de Spotify al módulo.
- **Community:** valoraciones, comentarios, favoritos y pendientes siguen en
  sus recorridos legacy. Los consumidores tienen acciones ajenas al modal;
  no se trasladan a Catalog ni se migran en este corte.
- **Releases:** peticiones, sugerencias, importación y estado de lanzamiento
  nacional permanecen fuera. El modal no los consulta. La fecha obtenida de
  Spotify es un dato del álbum externo, no el estado del flujo de Releases.
- **Integrations:** solo la capacidad de búsqueda y detalle de álbum en Spotify
  pasa a `integrations/spotify`. Autenticación y DTOs quedan en infraestructura;
  la operación pura produce nombres y duraciones para presentación. El contenido
  visual consume ese modelo y no conoce tokens ni respuestas HTTP.

`app/components/DiscDetailModal.vue` ensambla la entrada pública de Catalog y el
contenido público de la integración. `app/dependencies/discDetail.ts` conecta el
puerto de aplicación con el adaptador. Catalog no importa Integrations, Community
ni Releases. No se introduce un composable que concentre responsabilidades de
varios módulos ni modelos específicos del detalle en shared.

`components/DiscDetail.vue` es una fachada temporal que conserva el import, la
prop `disc` y el evento `close` sin payload. Los tres consumidores no cambian.
Se mantienen clases, breakpoints, overlay, scroll, enlaces y previews, mensajes
de carga/error, selección del primer resultado y una búsqueda por montaje sin
cache. No cambian rutas, guards, permisos, query params, almacenamiento ni
endpoints. Las duraciones siguen sumando únicamente las pistas retornadas; no
se añade paginación de Spotify ni nuevas acciones de producto.

Pruebas: caracterización de la fachada antes de extraer el código (carga, primer
resultado, canciones, enlaces, previews, duración y cierre); contrato de la
operación pura, errores HTTP de búsqueda/detalle, opcionales ausentes y reapertura.
Vue Test Utils usa happy-dom como dependencia de desarrollo para estas pruebas
de componentes. Playwright cubre apertura, contenido, cierre y reapertura desde
los dos calendarios con API y Spotify simulados.

Deuda pendiente: el adaptador reutiliza únicamente `obtenerTokenSpotify` del
helper legacy. Este conserva `VITE_CLIENT_ID`/`VITE_CLIENT_SECRET` y autenticación
en el navegador; trasladar el consumo a infraestructura no oculta esos valores.
La sustitución por autenticación de backend queda pendiente de disponer de ese
contrato, según Iteración 5. Las demás capacidades del helper, ArtistDetail,
tarjetas, acciones de Community/Releases y calendarios siguen en legacy para
sus cortes correspondientes. No se inicia 3.3 ni la migración completa de esos
módulos.

Validación de 3.2: `yarn verify` pasa (lint, arquitectura en 35 archivos,
typecheck, 59 tests en 11 suites y build). Los dos E2E de detalle pasan en
Chromium. `git diff --check` pasa. Persisten los avisos de build ya registrados:
Browserslist desactualizado, selector `.flex-[2]` y chunk superior a 500 kB.

## Subiteración 3.3 — Calendarios de discos

Los calendarios estándar y babyUser se ensamblan desde app con dos vistas de
Catalog independientes. Comparten paginador, reglas de fechas/agrupación y scroll,
sin crear una vista genérica ni mezclar sus filtros o capacidades. Catalog posee
GET `/discs/date`, exportación HTML y el puerto de actualización de álbum;
los adaptadores acotados de Spotify/Last.fm son Integrations y se componen en app.
Las vistas no importan HTTP, DTOs ni proveedores. Fachadas, rutas diferidas,
permisos, fechas UTC/local, modo embebido y UI se conservan.

Las tarjetas mixtas de calendario conservan sus implementaciones legacy de
edición de artistas y acciones de Community/Releases; app las introduce mediante
slots tipados. Solo cambia el contrato de datos que reciben. El catálogo de
opciones mantiene la cache legacy del shell. No se amplían excepciones ni se
migran artistas; no se inicia 3.4. El inventario, decisiones, archivos, diferencias
y pruebas se detallan en [catalog-calendars-3.3.md](catalog-calendars-3.3.md).

Validación: `yarn verify` pasa (53 archivos de arquitectura, 89 tests/13 suites y
build), 5 E2E de calendario/detalle pasan y `git diff --check` pasa. Se acotan
carreras, reintentos infinitos tras errores y limpieza de observers, conservando
el mensaje visible y datos parciales. Los avisos de build previos persisten.

Deuda de tooling detectada: `yarn typecheck` invoca `vue-tsc --noEmit` sobre un
root con `files: []` y referencias sin modo build. Una comprobación explícita
con `-p tsconfig.app.json` falla también en HEAD inicial (149 diagnósticos, frente
a 119 al terminar 3.3). La comparación normalizada no añade diagnósticos; los
archivos nuevos no presentan errores. Se documenta esta limitación sin debilitar
ni modificar las puertas durante el corte de calendarios.

## Micro-PR — Puerta real de TypeScript tras 3.3

Se corrige la limitación anterior: `yarn typecheck` ahora invoca vue-tsc sobre
`tsconfig.app.json`, comprueba realmente src (incluidos scripts/templates Vue)
y compara los resultados contra `docs/typecheck-baseline.json`. Se conservan
todas las opciones estrictas y rutas incluidas; no se cambia código de negocio.

El baseline inicial contiene los 119 diagnósticos de 3.3 en 45 archivos, no los
149 anteriores. Cada excepción identifica archivo, código, mensaje completo,
línea de origen y multiplicidad. Todo diagnóstico nuevo o adicional falla.
Las entradas solo pueden reducirse respecto a HEAD local o al SHA base de la PR
fijado por CI; el checkout dispone del historial completo. Las excepciones
resueltas deben eliminarse con `yarn typecheck:baseline:prune`, que también rechaza
regresiones antes de escribir. No existe regeneración que amplíe el baseline.

El verde incremental significa cero regresiones, no cero deuda TypeScript.
El inventario, mantenimiento y pruebas están en [typecheck.md](typecheck.md).

## Subiteración 3.4.4 — Nombre y país desde calendario

Catalog ejecuta las actualizaciones de nombre y país mediante el puerto de
`updateArtist`; `app` proporciona la operación al calendario estándar. La vista
de Catalog conserva la propiedad de los grupos y reemplaza inmutablemente el
nombre/país en todas las tarjetas asociadas al artista solo después del PATCH.
La tarjeta conserva los mensajes y el evento `update-artist`; los flujos
migrados no mutan los datos recibidos por props. La alternancia usa los dos IDs
ya existentes.

Compatibilidad legacy: la tarjeta estándar sigue conteniendo las demás acciones
legacy. El alta y asociación de artista, las acciones de discos y los calendarios
babyUser no se migran en este corte. La creación mantiene su mutación legacy de
props, pendiente de 3.4.5; la fachada conserva su fallback para consumidores
fuera de la composición migrada.

Validación: `yarn verify` pasa (62 archivos de arquitectura, 122 pruebas/16
suites, 118 diagnósticos baseline y cero regresiones TypeScript, build) y
`git diff --check` pasa. El baseline se redujo de 119 a 118 entradas mediante
`yarn typecheck:baseline:prune`, que eliminó una excepción ya resuelta por el
cambio. Persisten los avisos de Browserslist, `.flex-[2]` y chunk superior a
500 kB. No se inicia 3.4.5.

## Subiteración 3.5 — Consolidación de Catalog

Catalog se organiza por capacidades y recorridos: discs (listing/detail/calendars),
artists (listing/editing/deletion/creation/detail/discovery/images) y reference-data.
App conserva la composición; los consumidores de presentación usan la API
explícita de Catalog. Sus adaptadores usan directamente el transporte compartido;
se retiran cinco operaciones legacy de artistas sin consumidores, sus tipos
huérfanos/reexports y el alias CalendarPageDto. Los dos stores de opciones y
las fachadas con consumidores permanecen por compatibilidad.

El guard reconoce capas anidadas y rechaza HTTP compartido fuera de infraestructura
o composición. No se amplían excepciones arquitectónicas ni de TypeScript.
Lint, arquitectura (91 archivos), 164 pruebas unitarias, 7 E2E de Chromium,
build y diff --check pasan. verify se detiene en la comparación textual del
error TS2345 preexistente de MonthlyVotesChart: HEAD y el resultado conservan
118 diagnósticos; solo cambia el orden impreso de literales de updateMode.
No se modifica el gráfico ni se debilita el baseline para ocultar esta limitación.
Inventario, API, legacy pendiente, pruebas y deuda en
[catalog-consolidation-3.5.md](catalog-consolidation-3.5.md). No se inicia Community.

La presentación de Catalog se organiza por capacidad y tipo de UI; no hay
archivos directamente bajo `presentation/`. La guía de capas y la navegación
«Dónde busco algo» están en [catalog-structure.md](catalog-structure.md).

## Subiteración 4.5 — Lista de comentarios propios

Community posee la operación paginada y los tipos propios del comentario.
`app/dependencies/community.ts` compone la operación con la sesión activa de
Identity y valida/proyecta la ficha anidada al tipo `CommentDisc` de Catalog;
Catalog conserva así la propiedad de esos datos. La vista conserva endpoint,
filtros, orden, paginación, estados y presentación, sin importar servicios
legacy de comentarios ni auth. Al quedar sin consumidores, se retiró
`getCommentsByUser` y el archivo `services/comments/comments.ts`. No se migran
favoritos, pendientes ni otros modos del listado.

Validación: `yarn verify` pasa (119 archivos de arquitectura, 102 diagnósticos
baseline sin regresiones, 203 pruebas y build); `git diff --check` pasa. Se
conservan los avisos conocidos de Browserslist, `.flex-[2]` y chunk superior a
500 kB. No se inicia 4.6.

## Subiteración 4.8 — Pendientes en los calendarios

Community conserva el ID y estado confirmado por usuario/disco en el mismo
store que utilizan `DiscCardComponent` y `DiscList`. Las tarjetas estándar y
babyUser reciben desde `app` la sesión de Identity y operaciones pequeñas para
leer, inicializar y alternar ese estado. Las mutaciones son pesimistas, comparten
el bloqueo por usuario/disco y no cambian el estado confirmado en caso de error;
los mensajes y la animación de alta existentes se mantienen en cada tarjeta.

Catalog sigue siendo propietario de la consulta, los grupos y las páginas. El
adaptador conserva `pendingId` únicamente como dato del transporte, lo extrae
del modelo `CalendarDisc` y entrega los IDs a `app` para inicializar Community.
Así no se añade Community al dominio/cache de Catalog ni se cambia el endpoint,
la paginación, los filtros, la búsqueda, el país o la exportación. `app` compone
Catalog, Community e Identity; Releases queda fuera.

La tarjeta estándar conserva el diseño horizontal, los controles administrativos,
las herramientas de grupo condicionadas por rol/fecha y sus mensajes SweetAlert.
`babyUser` conserva la tarjeta compacta con color por género, las restricciones
de ruta y sus mensajes `SwalService`; tampoco recibe los controles exclusivos del
calendario estándar. Solo el botón de pendiente usa el estado compartido. Se
retiraron `postPendingService`, `deletePendingService` y
`src/services/pendings/pendings.ts` al quedar sin consumidores.

Pruebas: cuatro pruebas de componente ejercitan ambas variantes en conjunto para
alta, baja, errores, reintentos, no optimismo, doble envío y sincronización entre
calendarios. La prueba del adaptador verifica que `pendingId` no forma parte de
la proyección Catalog. Tres E2E de Chromium pasan: alta/baja en ambas rutas y
restricciones por rol. `yarn verify` pasa: lint, arquitectura en 131 archivos,
89 diagnósticos de TypeScript baseline sin regresiones, 222 pruebas en 34 suites
y build. La poda validada eliminó dos excepciones TypeScript ya resueltas.
`git diff --check` pasa. Persisten los avisos previos de Browserslist, `.flex-[2]`
y chunk superior a 500 kB. No se inicia 4.9.

## Iteración 4.9 — Consolidación de Community

La estructura final agrupa cada capacidad bajo `src/modules/community`: ratings,
comments, favorites y pendings tienen sus contratos y operaciones propios; las
capas de infraestructura adaptan HTTP y presentation contiene la conversación
Vue y proyecciones reactivas para las vistas. `shared` dentro de Community
contiene la clave canónica usuario/disco, la primitiva framework-free de estado
por usuario/disco y el parser común del sobre HTTP de favoritos/pendientes.
Domain y application siguen independientes de Vue, Pinia, HTTP y otros módulos.

La API de `src/modules/community/index.ts` expone las operaciones consumidas, sus
tipos de query/resultado/estado y el modal de conversación. `app` compone los
puertos, adaptadores y servicios de estado por sus rutas internas; no forman
parte del barrel público. La composición vive en `app/dependencies` y `app/bridges`.
Community no importa Catalog, Identity, Releases, Editorial ni Analytics, y la
puerta de arquitectura no detecta ciclos.

**Ownership definitivo**

- Catalog posee fichas, artistas, listados, calendarios, páginas y su manejo de
  respuestas obsoletas. Conserva `pendingId` fuera de `CalendarDisc`; `app`
  extrae esos IDs y combina datos mixtos de otros endpoints con modelos de
  Community para sus consumidores legacy.
- Community posee las valoraciones (incluidos resúmenes), favoritos, pendientes
  de escucha y el árbol de comentarios mientras una conversación está abierta.
- Identity posee sesión/roles; `app` entrega su identidad a Community y limpia
  su estado de aplicación después de login/cambio de cuenta y logout. Los
  servicios de estado incrementan una generación para descartar respuestas tardías.
- Releases conserva requests, imports y sugerencias. Editorial conserva
  asignaciones y reuniones. Analytics conserva estadísticas, tendencias,
  rankings e historial. Integrations conserva APIs y DTOs de proveedores.

**Estado y sincronización**

Ratings, favorites y pendings usan un servicio de estado de aplicación en memoria
por capacidad, con claves JSON estables de `[userId, discId]`. No depende de
Pinia/Vue. Las listas paginadas no inicializan ese estado: cada tarjeta siembra
la relación confirmada y los consumidores del mismo disco comparten el resultado.
Los calendarios siembran pendientes desde `app`, con comprobación de
cuenta/generación tras la consulta. Los composables de presentación derivan
snapshots y señales reactivas para la vista, sin ser fuente de verdad. No hay
persistencia ni una cache global adicional. El estado de comentarios se crea al
abrir la conversación y se descarta al cerrarla.

Las mutaciones mantienen comportamiento pesimista. Ratings y relaciones bloquean
el doble envío por usuario/disco, aplican cambios tras el éxito y conservan el
estado confirmado ante fallo; ratings vuelven a cargar el resumen tras guardar,
sin invalidar el voto si esa recarga falla. Comentarios bloquean envío raíz,
respuesta por comentario y edición/borrado por ID. Los fallos dejan habilitado el
reintento. Las páginas y queries permanecen en su consumidor y conservan el
control de respuestas obsoletas.

**Legacy y excepciones**

Se retiraron `legacyRatingApi.ts`, `getDiscRates`, `postRateService`,
`updateRateService` y el bridge `views/artists/artistManagementCommunityBridge.ts`,
todos sin consumidores después de esta integración. La escritura de comentarios
feedback salió de infraestructura de Community y ahora pertenece a presentación.
`services/rates/rates.ts` permanece con `getRatesByUser`, `getUserHistoryService`
y `getRatesStats`, usados por Dashboard, UserModal y Statistics mientras Analytics
y esas pantallas no se migren. `app/bridges/communityRatings.ts`,
`communityFavorites.ts` y `communityPendings.ts` se conservan por sus
consumidores legacy: `DiscCardComponent`, calendarios y Dashboard. También queda
la composición de `app/dependencies/community.ts` para adaptar respuestas
anidadas y mixtas de las vistas actuales.

No se añadieron excepciones de arquitectura. Las excepciones de Impeccable que
intersectan la iteración están acotadas a los archivos y clases concretas que las
necesitan; no hay comodines globales.

**Validación y deuda**

`yarn verify` pasa: lint, arquitectura en 139 archivos, 89 diagnósticos
TypeScript baseline sin regresiones, 229 pruebas en 37 suites y build. E2E de
rating, calendarios estándar/babyUser y sesión/logout pasan 15/15 en serial. La
ejecución paralela tuvo un fallo transitorio de permisos de calendario; pasó al
repetirlo aislado y en serial. `git diff --check` pasa. El build mantiene avisos
conocidos de Browserslist desactualizado, `.flex-[2]` en CSS y el chunk de entrada
por encima de 500 kB.

Deuda pendiente: algunos endpoints de Catalog todavía transportan proyecciones
mixtas; `app` las estrecha mientras el contrato de API no se pueda separar.
Dashboard, UserModal y Statistics siguen dependiendo de consultas legacy de
valoraciones hasta la Iteración 8. Los bridges se retiran cuando sus consumidores
legacy se migren. Las proyecciones Vue quedan dentro de presentation; el estado
confirmado y los locks se mantienen en application. La Iteración 4 queda cerrada;
no se inicia la Iteración 5.
