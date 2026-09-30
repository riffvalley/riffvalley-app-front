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
