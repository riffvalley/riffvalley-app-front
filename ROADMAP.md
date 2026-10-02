# Roadmap de refactorización del frontend

## Objetivo y alcance

Refactorizar el frontend de Riff Valley (Vue 3, TypeScript, Vite y Pinia)
para organizarlo por funcionalidades y separar presentación, coordinación
reactiva, reglas de negocio y acceso a datos.

La migración será incremental: cada PR conserva las rutas, los contratos de
la API, los nombres de rutas, los query params, los permisos, las claves de
almacenamiento, la carga diferida y el comportamiento visual del flujo afectado,
salvo cambio explícito de producto. Este plan pertenece exclusivamente al
frontend; no requiere refactorizar el backend ni cambiar sus tablas o endpoints.

Estado inicial: plan pendiente de implementación. Las fases siguientes no
representan trabajo ya terminado.

## Punto de partida observado

- El código se reparte entre `views`, `components`, `services`, `stores`,
  `composables`, `helpers`, `interfaces`, `router` y `layouts`.
- `package.json` ofrece `dev`, `build` y `preview`, pero no scripts de
  `lint`, `typecheck` independiente ni `test`. No se han encontrado suites
  de pruebas ni configuración de lint en este checkout.
- El build invoca Yarn internamente y el repositorio declara Yarn 4 como gestor.
  Yarn 4 se mantiene como gestor oficial durante toda la refactorización. No
  se cambiará de package manager como parte de este roadmap. Una posible
  migración a pnpm queda fuera de alcance y requeriría una PR independiente
  en el futuro.
- `services/api/api.ts` importa el router y el store de autenticación;
  el store importa el cliente HTTP y el servicio de login. Hay un ciclo de
  imports entre transporte, sesión y navegación.
- El store de autenticación también persiste avatar y configuración del
  dashboard, mezclando sesión con preferencias.
- Existen peticiones a proveedores desde componentes y vistas, entre ellos
  `ArtistDetail`, `DiscDetail`, calendarios, importación y gestión de artistas.
- Hay usos de `any` en servicios y stores; los contratos se tiparán por flujo.
- `stores/catalog/catalog.ts` y `services/catalog/catalog.ts` ofrecen un piloto
  pequeño: carga de géneros y países desde `/catalog`.
- El router ya utiliza imports dinámicos. Se conservará esa carga diferida.
- La CI encontrada automatiza releases; aún hay que añadir las comprobaciones
  de calidad de las PRs.

Este inventario es una referencia inicial, no una auditoría completa ni una
afirmación de que el build o las pruebas actuales estén pasando.

## Estructura objetivo

```text
src/
├── app/
│   ├── bootstrap/          # Vue, Pinia, plugins y composición
│   ├── router/             # registro de rutas y guards globales
│   ├── layouts/            # shell, navegación y layouts
│   └── dependencies/       # enlaces concretos cuando sean necesarios
├── modules/
│   ├── identity/
│   ├── catalog/
│   ├── community/
│   ├── releases/
│   ├── editorial/
│   ├── workspace/          # frontera provisional
│   ├── product-ops/
│   └── analytics/
├── integrations/           # clientes de proveedores externos
└── shared/
    ├── ui/                # componentes sin conocimiento de negocio
    ├── composables/       # solo comportamiento transversal sin dominio
    ├── infrastructure/    # transporte HTTP y mecanismos de storage
    └── utils/             # utilidades puras transversales
```

Solo se crean carpetas cuando tengan archivos necesarios. Cada módulo puede
tener `presentation` (vistas, componentes, composables, helpers y stores),
`application` (operaciones y puertos), `domain` (tipos y reglas propias) e
`infrastructure` (adaptadores de API y persistencia). Una funcionalidad sencilla
no necesita clases, entidades ricas ni un caso de uso ceremonial por cada GET.
La complejidad debe responder a una necesidad real, sin abstracciones por
anticipado ni tipos idénticos duplicados sin motivo.

Los composables de negocio pertenecen a la presentación del módulo propietario:
`modules/catalog/<feature>/presentation/composables/`,
`modules/editorial/presentation/composables/` o
`modules/community/presentation/composables/`. Solo composables transversales
y sin dependencia de dominio, como `useDebounce`, `useMediaQuery` o
`useIntersectionObserver`, pueden ir a `shared/composables`; `useDiscFilters`,
`useAssignments` y `useEditorialCalendar` permanecen en sus módulos.

La presentación consume operaciones de aplicación; estas usan reglas y tipos
de dominio. Los adaptadores implementan los contratos de aplicación. Dominio
y aplicación no importan Vue, Pinia, Vue Router, Axios ni APIs del navegador.
La composición en `app` puede conocer todas las capas.

## Reglas de trabajo

1. Migrar un recorrido concreto por PR; no trasladar todas las vistas ni todos
   los servicios de una vez.
2. Usar Composition API y `<script setup lang="ts">` en componentes nuevos o
   migrados. Las vistas ensamblan componentes; los composables coordinan estado
   y efectos; las reglas puras se extraen a funciones TypeScript.
3. Tipar props, eventos, filtros, entradas y resultados. No mutar props ni
   introducir nuevos `any` en código nuevo/migrado. Usar `unknown` y comprobarlo en
   las fronteras cuando la forma del dato no sea conocida.
4. Pinia posee estado compartido de presentación, sesión y cache; puede
   coordinar operaciones de aplicación. No debe acumular reglas de negocio
   ni implementar HTTP. Mantener estado local cuando no haya consumidores
   fuera de la vista y derivar valores con `computed`.
5. No añadir HTTP en ninguna parte de `presentation`: pages, vistas,
   componentes, composables ni stores. No importar Axios, el cliente HTTP
   compartido, servicios HTTP legacy ni SDKs externos; mover una petición de
   un componente a un composable no resuelve el límite. HTTP y proveedores
   quedan detrás de infraestructura/adaptadores; Pinia coordina aplicación.
   Los errores de transporte se traducen en los adaptadores; la UI decide
   sus mensajes. Las excepciones legacy se acotan durante la migración.
6. No importar internals de otro módulo. Exponer una API pública pequeña;
   `app` compone las páginas que necesitan varios módulos.
7. Los DTOs de la API viven junto a sus adaptadores. Crear mappers cuando la
   UI necesite un modelo distinto; no duplicar tipos idénticos por ceremonia.
8. `shared` contiene elementos genuinamente transversales, estables y sin un
   propietario de dominio claro. El uso por dos módulos solo es una señal
   para evaluar la extracción, no una condición suficiente. No convertirlo
   en un nuevo `utils/` global ni en una zona de modelos compartidos entre
   bounded contexts. Un puerto específico puede tener un único consumidor
   cuando permita aislar una dependencia y probar el flujo.
9. Usar aliases coherentes con la configuración. Conservar temporalmente los
   antiguos mediante fachadas; retirarlos cuando no queden consumidores.
10. Preservar URLs, nombres de rutas, query params, claves de localStorage y
    comportamiento de permisos salvo un cambio de producto explícito.
11. La rama acumulativa de la refactorización es `chore/refactor-front`. Crear
    cada rama de iteración desde ella; al completar y verificar la iteración,
    integrar su rama en la acumulativa y publicarla antes de crear la siguiente.

## Mapa de funcionalidades

| Módulo | Responsabilidades y código actual de referencia |
| --- | --- |
| `identity` | Login, sesión, roles, cambio de contraseña, acceso y administración de usuarios |
| `catalog` | Discos, artistas, géneros, países, filtros y calendarios de discos |
| `community` | Valoraciones, comentarios, favoritos, pendientes y puntos visibles al usuario |
| `releases` | Importación, sugerencias, peticiones y lanzamientos nacionales, incluidos formularios públicos |
| `editorial` | Listas, asignaciones, reuniones, artículos, vídeos, Kanban, calendario de contenido y gestión de playlists |
| `workspace` (provisional) | Inicio, dashboard personal y sus preferencias de escritorio/móvil; frontera pendiente de validar |
| `product-ops` | Versiones, noticias, patch notes y soporte |
| `analytics` | Estadísticas, actividad de usuarios y gráficos |
| `integrations` | Acceso externo a Spotify, Last.fm y LanguageTool cuando se consuma desde el navegador |

El mapa puede ajustarse al migrar un flujo. Una pantalla puede ensamblar varios
módulos sin convertir todos sus componentes en `shared`. Gestionar playlists
es una funcionalidad editorial; hablar con Spotify es una integración.
`workspace` puede consolidarse como capacidad de producto o resultar ser
app shell más preferencias de usuario, sin dominio independiente. Su frontera
se validará durante la migración y se ajustará con la evidencia obtenida.

## Iteración 0 — Tooling y red de seguridad

Esta iteración se centra en baseline, calidad, reglas arquitectónicas y
CI sobre Yarn 4, sin cambios de package manager.

Los comandos `yarn lint`, `yarn architecture`, `yarn typecheck`, `yarn test`,
`yarn build` y `yarn verify` son conceptuales y se definirán durante esta
iteración; conservar Yarn 4 permite aislar los problemas de la migración DDD.

1. Registrar el resultado inicial del typecheck y build, y el inventario de
   deuda relevante. No asumir que el checkout empieza verde.
2. Separar `yarn typecheck` (`vue-tsc --noEmit`) y `yarn build` (Vite), sin
   invocaciones internas que dupliquen comprobaciones. Añadir `yarn lint`
   sin autocorrección y un comando separado para corregir.
3. Configurar Vitest y Vue Test Utils para las pruebas necesarias por flujo.
   Preparar Playwright para unos pocos recorridos críticos con API simulada,
   sin depender de credenciales ni escrituras en producción.
4. Añadir una puerta explícita `yarn architecture`: imports entre capas,
   dependencias entre módulos, HTTP fuera de las fronteras permitidas,
   Vue/Pinia/Vue Router en `domain` o `application`, nuevos `any` y ciclos relevantes.
   Aplicarla inicialmente al código nuevo/migrado; las excepciones legacy
   deben ser explícitas, acotadas y no aumentar. No desactivar reglas globalmente.
5. Añadir `yarn verify` para ejecutar lint, architecture, typecheck, test y build.
   Si una regla arquitectónica ya usa lint, reutilizarla sin ejecutarla dos
   veces; cada puerta debe mantener un resultado identificable.
6. Añadir comprobaciones de PR: instalación reproducible con Yarn 4 y
   `yarn verify`. No exigir una cobertura arbitraria de toda la app.

**Salida:** comandos y CI reproducibles, deuda inicial documentada y nuevas
infracciones detectadas. Sin migración funcional significativa; Yarn 4 se
mantiene como gestor oficial.

## Iteración 1 — Piloto de catálogo: genres + countries

**Primer corte:** carga de géneros y países mediante el `/catalog` existente,
inmediatamente después de la iteración 0 y antes de tocar auth, sesión, router,
bootstrap o preferencias.

Validar `presentation → application → domain`, con `infrastructure` implementando
los puertos necesarios. No requiere reestructurar auth ni el cliente HTTP global:
un adaptador de infraestructura puede apoyarse temporalmente en el servicio
legacy, sin exponerlo a presentación.

1. Caracterizar la respuesta, el orden visible y el comportamiento de cache.
2. Colocar tipos y adaptador HTTP en `modules/catalog`, manteniendo una fachada
   para el servicio actual.
3. Extraer la operación de carga; el store conserva únicamente datos, estado
   de carga y coordinación reactiva. Documentar propietario e invalidación
   de la cache sin cambiar silenciosamente el comportamiento.
4. Migrar un consumidor pequeño de esos datos. Dejar discos, artistas y sus
   calendarios para cortes posteriores.
5. Verificar carga correcta, respuesta vacía, error y reintento, y comprobar
   que el consumidor conserva opciones y selección.

**Salida:** primer flujo completo en la estructura nueva, con pruebas útiles
y convivencia con consumidores legacy. Validar dependencias, puertos/adaptadores,
testing, composición mínima del flujo y stores, sin demostrar todos los patrones
DDD. Si una funcionalidad trivial exige una estructura excesiva, simplificar.

El orden posterior al piloto se reevaluará con su experiencia y las dependencias
observadas antes de iniciar una migración extensa. Community e Integrations
pueden intercambiarse si el corte de `DiscDetail` lo justifica.

## Iteración 2 — Composición, HTTP y sesión

Dividir en PRs independientes: primero desacoplamiento, después reorganización
del arranque y finalmente separación de preferencias.

1. Caracterizar login, restauración de sesión, logout, 401 y navegación por rol.
   Incluir mantenimiento, rutas públicas y restricciones de `babyUser` tal
   como las implementa el router actual.
2. Crear un cliente HTTP configurable con callbacks para obtener el token y
   gestionar la expiración. No debe importar stores ni router. Conectarlo
   desde `app` una vez disponibles Pinia y navegación; registrar interceptores
   una sola vez y comprobar varios 401 simultáneos.
3. Aislar lectura/escritura de sesión en un adaptador, conservando claves y
   compatibilidad con datos persistidos antiguos.
4. Llevar bootstrap, plugins, router y shell a `app` mediante fachadas pequeñas.
   Mantener `main.ts` como entrada y preservar lazy loading y layouts.
5. Separar configuración del dashboard de identidad: `workspace` posee esas
   preferencias provisionalmente; login puede inicializarlas mediante
   composición explícita. Validar si corresponden a esa capacidad o al shell y preferencias
   de usuario, sin imponer un dominio independiente.

**Salida:** desaparece el ciclo HTTP/store/router; sesión y preferencias
mantienen su comportamiento. Los guards siguen siendo presentación: no
sustituyen la autorización del backend.

## Iteración 3 — Catalog

Cada subiteración puede ejecutarse y revisarse de forma independiente. Al
terminar una, ejecutar `yarn verify`, correr los E2E relevantes si se afectan
rutas o comportamiento crítico y documentar la deuda restante. No continuar
automáticamente a la siguiente. La Iteración 3 solo se considera completa al
cerrar 3.1–3.5.

### 3.1 — Listado y filtros de discos

**Objetivo:** migrar el recorrido de listado y filtros sin tocar todavía el
detalle complejo.

1. Caracterizar la carga del listado, los filtros y la paginación, incluidos
   sus estados de loading, error y respuesta vacía.
2. Tipar parámetros y resultados y extraer la coordinación de carga. Evitar que
   respuestas antiguas sobrescriban filtros más recientes.
3. Conservar parámetros de URL y query existentes, selección de filtros, orden
   y rangos de fechas actuales.
4. Identificar si el listado ya necesita cache; mantenerla solo si forma parte
   del comportamiento actual y documentar su propietario e invalidación.
5. Migrar el consumidor correspondiente a `modules/catalog` mediante su
   operación y adaptador, conservando temporalmente una fachada si hace falta.

**Salida:** listado y filtros dejan de depender directamente de servicios o
stores legacy y utilizan la estructura modular de Catalog, conservando contratos
API, URLs, query params, selección y comportamiento visual.

### 3.2 — Detalle de disco

**Objetivo:** migrar el detalle sin convertir `catalog` en un megamódulo.

Antes de mover lógica, identificar qué responsabilidades pertenecen a
`catalog`, `community`, `releases` e `integrations`. La pantalla puede componer
varios módulos, pero estos conservan sus límites. No migrar Community, Releases
ni Integrations completas dentro de este corte.

Separar los datos propios del disco y los datos del artista estrictamente
necesarios; las acciones propias de Catalog; las acciones de Community; la
información de Releases; y las integraciones externas, como Spotify, cuando
existan. Mantener estas dependencias detrás de contratos y adaptadores o de
fachadas temporales para que el corte siga siendo pequeño.

Definir props y eventos para la composición de presentación. El detalle no debe
concentrar reglas de otros módulos, HTTP ni modelos externos.

**Salida:** el detalle queda centrado en composición y cada responsabilidad
permanece en su módulo propietario.

### 3.3 — Calendarios de discos

**Objetivo:** migrar los calendarios estándar y las variantes `babyUser`.

1. Caracterizar primero las diferencias reales entre ambas variantes y sus
   permisos y restricciones.
2. Conservar fechas, zonas horarias, filtros y navegación actuales.
3. Extraer únicamente el comportamiento realmente compartido. No crear un
   calendario genérico antes de demostrar una necesidad común.
4. Separar presentación, coordinación y reglas puras, manteniendo las
   diferencias de autorización existentes.

**Salida:** los calendarios migrados usan Catalog sin duplicar lógica
innecesariamente ni borrar diferencias de autorización.

### 3.4 — Artistas

**Objetivo:** migrar progresivamente las operaciones relacionadas con artistas,
un recorrido por corte. Catalog posee las operaciones de artistas; Spotify y
Last.fm permanecen en `integrations`, y `app` compone los recorridos que mezclan
capacidades. Para cada corte, mantener el patrón:

```text
presentation → application → domain
infrastructure implementa puertos
```

La presentación no llama a HTTP ni conoce tokens o DTOs de proveedores. Mantener
fachadas durante la transición mientras sigan teniendo consumidores legacy.
Conservar permisos, contratos, comportamiento y errores visibles del flujo.
Los endpoints actuales de Last.fm se conservan; no se unifican en esta iteración.
`searchArtists` y `deleteOrphanArtists` no generan recorridos nuevos: evaluar su
retirada en 3.5.

Cada corte termina con `yarn verify` y las pruebas relevantes. No continuar
automáticamente al siguiente corte.

### 3.4.1 — Listado y filtros

Migrar la carga paginada de artistas, filtros y búsqueda con debounce. Conservar
el límite de página, los filtros de género, país y revisión, el orden de países
y géneros, y los estados de carga y error. Extraer el listado sin migrar las
acciones de gestión que aún permanezcan en la vista legacy.

**Cierre:** pruebas de carga, filtros, cambio de página, búsqueda, respuesta
vacía y error; se conserva la selección y el comportamiento visible actual.

**Estado: completado** en `9cc3440` (`feat(catalog): migrate artist listing and filters`).
Catalog posee la operación de `/artists/management` y la coordinación reactiva
de filtros y paginación; la vista legacy ensambla el listado con las acciones
que siguen pendientes. Se conservan páginas de 30, búsqueda con debounce de
400 ms, filtros de género/país/`needsReview`, selección y orden alfabético de
las opciones cargadas desde `/catalog`. Los errores mantienen el aviso visible
actual y se ignoran respuestas de solicitudes superadas.

**Validación:** cinco pruebas unitarias cubren parámetros y carga, estado de
loading, filtros, paginación, debounce, respuesta vacía y error. `yarn verify`
pasó: 58 archivos bajo la puerta de arquitectura, 108 pruebas, TypeScript con
cero regresiones respecto al baseline y build. `git diff --check` pasó.
Continúan los avisos previos de Browserslist, `.flex-[2]` y tamaño de chunk.
`getArtistsManagement` permanece en el servicio legacy para el rellenado masivo
de imágenes, pendiente de su corte; no se inicia 3.4.2.

### 3.4.2 — Edición desde gestión

Migrar el formulario de edición y la operación de actualización del artista.
Conservar los campos opcionales y su semántica para valores vacíos, la
actualización local del artista y su retirada del filtro cuando deja de cumplir
`needsReview`.

**Dependencias:** 3.4.1 para integrar la edición con el listado migrado. La
búsqueda de imágenes de Spotify se mantiene como dependencia hasta 3.4.8.

**Cierre:** pruebas de apertura, guardado, error y actualización del listado;
la fachada legacy permanece mientras tenga consumidores.

**Estado: completado.** El formulario ahora es `app/components/ArtistEditForm.vue`;
Catalog ejecuta el PATCH mediante su puerto de aplicación y adaptador de
infraestructura. Se conservan el PATCH con campos opcionales, los valores vacíos
omitidos, la actualización local y la retirada/decremento al editar desde
`needsReview=true`. El selector y la búsqueda de imágenes siguen conectados a
sus piezas legacy para respetar el alcance de 3.4.8.

**Validación:** cinco pruebas unitarias cubren render/acciones del formulario,
delegación y error del guardado, actualización local y retirada de la fila.
`yarn verify` pasó con 61 archivos de arquitectura, 113 pruebas, cero
regresiones TypeScript y build. `git diff --check` pasó. Persisten los avisos
previos de Browserslist, `.flex-[2]` y tamaño de chunk. No se inicia 3.4.3.

### 3.4.3 — Borrado individual

Migrar la confirmación y el borrado individual. Conservar la condición visible
actual: solo se permite borrar artistas sin discos, novedades nacionales ni
playlists, además de los mensajes de éxito y error.

**Dependencias:** 3.4.1 para actualizar el listado y su contador.

**Cierre:** probar confirmación, cancelación, éxito y error, incluidos el
contador y la fila eliminada.

**Estado: completado.** La confirmación y los mensajes siguen en la vista de
gestión; Catalog ejecuta el DELETE `/artists/:id` mediante su puerto y adaptador.
La lista elimina la fila y decrementa el contador solo tras éxito. Cancelar no
llama al puerto; un error conserva la fila y el contador. El backend mantiene
la condición de borrado que ya aplica a artistas sin discos, novedades
nacionales ni playlists.

**Validación:** tres pruebas cubren cancelación, éxito con fila/contador y error;
`yarn verify` pasa con 62 archivos de arquitectura, 116 pruebas, cero
regresiones TypeScript y build. `git diff --check` pasa. Continúan los avisos
previos de Browserslist, `.flex-[2]` y tamaño de chunk. La vista de gestión y sus
otras acciones siguen siendo legacy; no se inicia 3.4.4.

### 3.4.4 — Nombre y país desde calendario

Migrar desde la tarjeta del calendario el cambio de nombre y país del artista,
incluida la alternancia entre los dos países configurados actualmente. Conservar
los permisos, mensajes y eventos que actualizan el calendario.

**Dependencias:** mantener la composición desde `app` con Catalog y el calendario
migrado; no trasladar estas operaciones a las tarjetas legacy ni ampliar
excepciones arquitectónicas.

**Cierre:** pruebas de actualización correcta y error; los datos y eventos del
calendario reflejan la respuesta sin cambiar el comportamiento de autorización.

**Estado: completado.** El calendario estándar compone el PATCH de artista desde
`app` con Catalog. La tarjeta conserva el selector, los mensajes y el evento
`update-artist`; tras éxito, el propietario del calendario reemplaza de forma
inmutable nombre/país en todas las tarjetas del artista. Los errores no cambian
los datos. La alternancia conserva los dos IDs configurados y ahora está
conectada a un control visible. Se mantienen permisos y las acciones restantes
en legacy; la creación/asociación de artista no se migra.

**Validación:** pruebas de persistencia correcta/error, actualización del estado
propietario y alternancia; `yarn verify` pasa con 62 archivos de arquitectura,
122 pruebas/16 suites, 118 diagnósticos baseline sin regresiones y build.
`git diff --check` pasa. Persisten los avisos previos de Browserslist,
`.flex-[2]` y tamaño de chunk. No se inicia 3.4.5.

### 3.4.5 — Crear artista y asociarlo al disco

Migrar la creación desde el calendario y su asociación al disco existente:
crear artista y después actualizar el disco con su ID. Conservar el evento
`artist-created` y los mensajes actuales. No añadir rollback si falla la segunda
operación.

**Dependencias:** 3.4.4 para mantener coherente la composición de operaciones de
artista y calendario. La escritura del disco sigue perteneciendo a Catalog.

**Cierre:** probar creación y asociación, error en cada operación y estado
visible tras un fallo parcial; no se cambian contratos de API.

**Estado: completado.** Catalog crea el artista y después actualiza el disco
mediante operaciones y adaptador propios. La tarjeta conserva el modal, el
evento `artist-created`, los mensajes y el fallback de compatibilidad legacy;
ya no modifica `props.disc`. La vista propietaria sustituye inmutablemente el
artista del disco solo cuando ambas operaciones terminan correctamente. Si la
creación funciona y la asociación falla, se muestra el error actual, no se emite
el evento ni cambia el estado visible; el artista creado permanece en backend,
sin rollback.

**Validación:** pruebas de secuencia, error en creación, error de asociación y
actualización inmutable del disco. `yarn verify` pasa (64 archivos de
arquitectura, 126 pruebas/16 suites, 118 diagnósticos baseline y cero regresiones
TypeScript, build); `git diff --check` pasa. Persisten los avisos previos de
Browserslist, `.flex-[2]` y tamaño de chunk. No se inicia 3.4.6.

### 3.4.6 — Detalle Spotify del artista

Migrar la consulta que parte del nombre de disco y artista, busca álbumes en
Spotify y muestra los datos del artista y sus canciones principales. Conservar
la elección del primer álbum y artista, `market=US`, estados, enlaces y previews.
Mantener `ArtistDetail` como fachada con las mismas props y el evento `close`.

**Dependencias:** la búsqueda y los DTOs de Spotify pertenecen a
`integrations/spotify`; `app` conecta la entrada de Catalog con el contenido de
la integración. Los consumidores legacy del modal conservan la fachada.

**Cierre:** pruebas de respuesta vacía, selección del primer resultado, datos
opcionales y error de Spotify; E2E de apertura, cierre y reapertura desde los
consumidores afectados.

**Estado: completado.** Catalog publica únicamente la identidad del recorrido
(nombre de disco y artista). `integrations/spotify` conserva la autenticación,
los DTOs y la búsqueda por disco/artista; el adaptador toma el primer álbum y
artista y consulta sus top tracks con `market=US`. `app` conecta esa identidad
con la operación e integra sus estados con la presentación Spotify. La fachada
legacy `ArtistDetail` conserva props, evento `close`, mensajes, overlay y
secciones visibles. La petición directa y los datos de Last.fm permanecen en
esa fachada para 3.4.7.

Pruebas: ocho pruebas unitarias cubren selección, respuesta vacía, artista
ausente, campos opcionales, errores, presentación, mensajes, Last.fm y cierre.
Dos E2E verifican apertura, cierre y reapertura desde los calendarios normal y
`babyUser`. `yarn verify` pasa: 70 archivos de arquitectura, 118 diagnósticos
baseline y cero regresiones TypeScript, 134 pruebas en 17 suites y build.
Persisten los avisos conocidos de Browserslist, `.flex-[2]` y chunk superior a
500 kB.

Deuda: Integrations sigue usando temporalmente `obtenerTokenSpotify`, con las
credenciales de cliente expuestas en el navegador; su sustitución depende del
contrato de autenticación de backend (Iteración 5). No se migra Last.fm ni se
inicia 3.4.7.

### 3.4.7 — Biografía Last.fm del detalle

Mover la petición directa a Last.fm de `ArtistDetail` a su integración. Mantener
la carga independiente de Spotify y tolerar el error de Last.fm sin bloquear el
detalle, conservando la biografía y etiquetas visibles.

**Dependencias:** 3.4.6 y su fachada. Conservar el endpoint Last.fm usado por el
detalle, sin unificarlo con el endpoint de gestión.

**Cierre:** probar datos, datos opcionales y error; Spotify sigue mostrándose
aunque falle Last.fm.

### 3.4.8 — Imagen individual desde Spotify

Migrar la búsqueda de imagen desde el formulario de edición y el fallback que
usa el modal Last.fm de gestión. Conservar sus límites actuales de resultados
(cinco en el editor y uno en el fallback), la preferencia por imagen de 640 px y
la selección manual cuando haya varias opciones.

**Dependencias:** el adaptador de Spotify vive en `integrations/spotify`; el
formulario de gestión y el modal consumen sus operaciones mediante Catalog y la
composición de `app`. No exponer tokens ni DTOs del proveedor a presentación.

**Cierre:** probar resultados sin imagen, selección, ausencia de resultados y
error de proveedor; actualizar el artista solo cuando corresponda.

**Estado: completado.** La búsqueda vive en `integrations/spotify`; el adaptador
mantiene token y DTOs y entrega opciones `{ name, image }`. El editor consulta
hasta cinco resultados: aplica la única imagen disponible o permite seleccionar
manualmente entre varias. El fallback del modal Last.fm consulta un resultado y
mantiene su degradado cuando no hay imagen o Spotify falla. Catalog sigue
guardando el artista únicamente al usar Guardar; seleccionar una imagen actualiza
el formulario, sin persistirla antes.

Compatibilidad legacy: se conserva `ArtistManagement.vue` como vista y el flujo
de rellenado masivo (3.4.10) sigue usando su implementación anterior. No se
migra navegación/datos Last.fm del modal ni otros recorridos Spotify; no se
inicia 3.4.9.

**Validación:** pruebas de límites 1/5, preferencia de 640 px, ausencia de
imágenes, errores de token/proveedor y selección manual. `yarn verify` pasa:
77 archivos de arquitectura, 141 pruebas, cero regresiones TypeScript y build.
`git diff --check` pasa. Persisten avisos conocidos de Browserslist, selector
`.flex-[2]` y chunk superior a 500 kB.

### 3.4.9 — Modal Last.fm de gestión

Migrar la consulta y navegación del modal de Last.fm: cache local, artistas
similares, búsqueda coincidente en Catalog, discos asociados y apertura de disco.
Conservar las respuestas parciales y los mensajes visibles cuando falle una
fuente.

**Dependencias:** Catalog para buscar artistas; `integrations/lastfm` para los
datos externos; 3.4.8 para la imagen de fallback. `app` compone el recorrido.
Las valoraciones y la apertura de discos siguen en sus recorridos actuales; no
se trasladan a Catalog.

**Cierre:** probar cache, artista similar, coincidencia y ausencia en base de
datos, errores parciales y apertura de disco sin alterar permisos.

### 3.4.10 — Rellenado masivo de imágenes

Migrar la operación de gestión que recorre los artistas sin imagen y actualiza
sus imágenes desde Spotify. Conservar paginación en lotes de 200, ejecución
secuencial, pausa de 150 ms, progreso, actualización de resultados visibles y
tolerancia a fallos individuales.

**Dependencias:** 3.4.1 para consultar artistas y 3.4.8 para búsqueda de imágenes
y actualización. La autenticación y los DTOs de Spotify quedan en su integración.

**Cierre:** probar lista vacía, varias páginas, progreso, errores individuales y
error general; mantener el comportamiento de confirmación y notificación.

### 3.4.11 — Botón de enlace Spotify

Migrar la búsqueda del enlace de Spotify usada por `SpotifyArtistButton`.
Conservar la elección del primer resultado, la apertura en otra pestaña y los
mensajes de ausencia o error. Mantener una fachada mientras existan
consumidores legacy.

**Dependencias:** la búsqueda pertenece a `integrations/spotify`; el componente
consume la operación sin conocer token, HTTP ni DTOs del proveedor.

**Cierre:** probar enlace encontrado, resultado vacío y error; verificar los
consumidores actuales del botón.

**Salida de 3.4:** las operaciones migradas de artistas siguen
`presentation → application → domain`, con adaptadores en infraestructura y
proveedores en `integrations`. Las fachadas solo se retiran cuando no tengan
consumidores; su limpieza se revisa en 3.5.

### 3.5 — Consolidación de Catalog

**Objetivo:** revisar el módulo después de las migraciones anteriores, sin
añadir nuevas funcionalidades ni hacer una limpieza global del repositorio.

Comprobar la API pública del módulo; imports entre módulos y posibles ciclos;
DTOs y mappers innecesarios; stores y composables demasiado grandes; fachadas
legacy que ya no tengan consumidores; duplicación introducida durante la
migración; y que Catalog no haya absorbido lógica de Community, Releases o
Integrations.

Eliminar únicamente compatibilidad legacy que ya no tenga consumidores.

**Salida:** Catalog queda como un módulo coherente, con una API pública pequeña
y sin dependencias legacy innecesarias.

**Estado: implementado**, sin iniciar la Iteración 4. Estructura por capacidades
y recorridos, API explícita, adaptadores sobre el transporte compartido y retirada
de compatibilidad sin consumidores. Se preservan stores/fachadas con consumidores
y proyecciones de pantallas mixtas. Inventario y decisiones en
[docs/catalog-consolidation-3.5.md](docs/catalog-consolidation-3.5.md).

**Validación:** lint, arquitectura, 164 pruebas unitarias, 7 E2E, build y
`git diff --check` pasan. `yarn verify` se ejecuta pero no queda verde: el
baseline textual rechaza un cambio en el orden impreso de una unión dentro del
TS2345 ya existente de MonthlyVotesChart. HEAD y el resultado tienen los mismos
118 diagnósticos salvo ese orden; no se amplía el baseline ni se toca el gráfico.


## Iteración 4 — Community

Community posee las valoraciones de disco y portada, los comentarios, los
favoritos y la relación personal de discos pendientes. Al inicio de 4.1 no
existían `src/modules/community` ni stores de Community: el estado estaba en las
tarjetas, las vistas de listado, los modales de comentarios y las tarjetas de
calendario. La migración se hizo de forma vertical, sin reescribir el componente
de disco ni las pantallas que lo consumen. La Iteración 4 se cerró en 4.9; el
estado final y la deuda restante están registrados en
[`docs/architecture-baseline.md`](docs/architecture-baseline.md).

### Fronteras, estado y cache

- **Catalog** posee la ficha del disco y la carga, paginación y cache de
  listados y calendarios. Sus respuestas actuales (`/discs`,
  `/discs/date` y gestión de artistas) incluyen proyecciones comunitarias como
  `userRate`, medias/recuentos, `favoriteId`, `pendingId` y
  `commentCount`. Mantener el contrato HTTP durante estos cortes, pero separar
  esos campos en adaptadores o en la composición explícita de `app`; no
  almacenar estado comunitario en Catalog ni importar Community desde Catalog.
- **Community** posee el estado compartido de relación y resumen por disco,
  indexado por usuario y disco cuando aplique. El estado confirmado vive en
  servicios framework-free de application; presentation lo proyecta
  reactivamente y Identity/`app` lo limpia al cambiar o cerrar sesión. Las
  páginas filtradas pertenecen a la consulta de la capacidad que las carga y se
  invalidan tras una mutación. No persistir claves nuevas en localStorage.
- Los comentarios se cargan al abrir la conversación. Su árbol pertenece a
  Community mientras esa conversación está activa; no se persiste entre
  aperturas. Al cambiar comentarios, actualizar o invalidar el recuento
  comunitario del disco.
- Las mutaciones existentes son pesimistas: la UI cambia después de recibir
  éxito, por lo que no requieren rollback. Mantener ese comportamiento y no
  añadir optimismo. Centralizar o coordinar los bloqueos de petición por
  usuario/disco/capacidad: el bloqueo actual de votos y algunos botones es
  local a una instancia; los calendarios no bloquean envíos y los comentarios
  no impiden dobles envíos.
- **Identity** aporta identidad, avatar y roles mediante contratos públicos o
  composición de `app`; Community no importa el store legacy de auth. La
  autorización efectiva continúa en backend.
- **Analytics** posee gráficas, estadísticas, tendencias, rankings e historial
  de actividad como proyecciones. Community ofrece los datos de valoración que
  necesiten mediante su API pública; los informes y sus caches no se duplican
  en Community. Las pantallas de informes que sigan en legacy se migran en la
  Iteración 8.
- **Editorial** mantiene asignaciones y reuniones. `MisVotosMes` consume votos
  de Community, pero asignar el disco sigue siendo Editorial. Los puntos de
  agenda de reuniones y el servicio `services/points/point.ts` pertenecen a
  Editorial, no a Community.
- **Releases** mantiene lanzamientos nacionales, peticiones e importación. Sus
  estados llamados “pendiente” son distintos de los discos que una persona
  quiere escuchar después.
- **Integrations** mantiene acceso y DTOs de Spotify, Last.fm y otros
  proveedores. Las partes de detalle Spotify, artista y calendario que
  conviven en `DiscCardComponent` permanecen en sus propietarios y no se
  trasladan con las acciones comunitarias.

### 4.1 — Votar desde las tarjetas de disco

**Alcance:** crear y editar valoraciones de disco/portada en
`DiscCardComponent`; cargar votos para `VotesModal`; actualizar el voto
propio, las medias y los recuentos. Componer el estado comunitario de las
tarjetas compartidas por listado, inicio, dashboard, aventura y gestión de
artistas. Usar el puente existente de gestión de artistas como límite explícito.

**Fuera de alcance:** el voto de portada del día en Dashboard, los listados
personales de votos, los informes de Analytics y las acciones de comentarios,
favoritos y pendientes del mismo componente.

**Ownership/cache:** Community posee el voto propio y el resumen por disco; el
listado de votos se carga al abrir el modal como estado de la capacidad.
Catalog conserva disco y página. La composición de `app` separa las
proyecciones mixtas recibidas por HTTP y entrega el estado de Community sin
añadir esos campos a los modelos públicos de Catalog.

**Criterio de cierre:** crear y editar conservan validaciones y compatibilidad;
el estado cambia solo tras éxito y el resumen se refresca. Si falla ese
refresco, el voto guardado se conserva y el resumen queda pendiente de recarga.

**Riesgos:** `DiscCardComponent` mezcla varias responsabilidades y tiene muchos
consumidores. Mantener su fachada y migrar únicamente la capacidad de voto.

**Tests:** caracterizar voto nuevo y edición, voto parcial, valores vacíos,
errores, reintento, doble envío desde dos tarjetas del mismo disco y refresco
de medias/recuentos; E2E del voto desde listado.

**Modelo recomendado:** Luna HyperHigh.

### 4.2 — Consultar votos y portadas propias

**Alcance:** migrar los modos “Mis votos” y “Mis portadas” de
`DiscList.vue` y publicar la consulta necesaria para `MisVotosMes.vue`.
Conservar filtros, orden y paginación. La composición con la vista editorial
puede consumir votos de Community.

**Fuera de alcance:** escritura de votos, asignación editorial de discos,
comentarios, favoritos, pendientes y estadísticas agregadas.

**Ownership/cache:** Community posee el resultado de la consulta de votos y su
estado de carga/error. La ficha del disco sigue siendo de Catalog; si la
respuesta de Community trae un disco anidado, separar esa proyección en el
adaptador o en `app`. Mantener la paginación en el consumidor mientras no
haya otro lector compartido; no crear una cache global de listas.

**Criterio de cierre:** parámetros, resultados y DTOs quedan tipados tras el
adaptador de Community; `MisVotosMes` recibe los votos sin apropiarse de las
asignaciones, y `DiscList` conserva la conducta visible.

**Riesgos:** `DiscList` coordina varios modos y descarta respuestas antiguas.
El corte debe conservar la versión de petición, los filtros y el orden actuales.

**Tests:** parámetros de búsqueda, rango de fechas, género, país y orden;
paginación, carga, vacío, error y descarte de respuestas obsoletas; comprobar
que la asignación editorial no cambia.

**Modelo recomendado:** Luna HyperHigh.

### 4.3 — Voto de portada del día en Dashboard

**Alcance:** trasladar la lectura del voto propio y el envío de portada que hoy
hace `DashboardPage.vue`. Catalog continúa seleccionando y cargando el disco
del día.

**Fuera de alcance:** racha de votos, votos recientes, rankings, gráficas y
otras lecturas del dashboard.

**Ownership/cache:** Catalog posee el disco seleccionado. Community posee la
valoración propia por disco, compartida con el estado definido en 4.1; no se
crea un segundo voto local en Dashboard.

**Criterio de cierre:** se crea un voto si aún no existe y se actualiza si ya
existe; el doble envío queda bloqueado y la UI refleja el último resultado
confirmado.

**Riesgos:** el dashboard recibe actualmente el voto propio dentro de la
proyección de disco de Catalog; debe consumir la separación de estado acordada
en 4.1 sin cambiar la selección diaria.

**Tests:** disco con y sin voto previo, valores válidos, alta, actualización,
error, doble envío y coherencia tras recargar.

**Modelo recomendado:** Luna High.

### 4.4 — Conversación de comentarios en un disco

Migrar `ComentsModal.vue` y `CommentItem.vue` en cortes revisables. El flujo
actual carga al abrir, arma en cliente un árbol desde una respuesta plana y
mantiene ese árbol en el modal. El endpoint de creación sirve tanto para raíz
como para respuesta (`parentId` opcional); editar y borrar usan endpoints
propios. No hay cache compartida entre aperturas.

#### 4.4.1 — Carga, árbol y recuento

**Alcance:** lectura de comentarios del disco, tipado del DTO/modelo necesario,
construcción del árbol y su recuento en la conversación activa. Conservar
comentarios huérfanos como raíces como hace el código actual.

**Dependencias:** ninguna dentro de 4.4. La carga ocurre al abrir; descartar o
reiniciar estado al cerrar y reabrir. El contador visible dentro del modal se
deriva recursivamente del árbol. Al migrar el componente, establecer desde el
principio una entrada/puente de composición para usuario actual y avatar desde
`app`; no llevar el import legacy de auth a Community mientras se esperan los
cortes de Identity de 4.4.6.

**Fuera de alcance:** comentario propio paginado de `DiscList.vue` y el
`commentCount` que llega en la proyección de disco de Catalog; este último no se
actualiza hoy al mutar el modal y su coherencia queda para 4.4.7/consolidación.

#### 4.4.2 — Crear comentario raíz

**Alcance:** envío desde el campo del pie, validación de texto no vacío y
agregado al árbol solo después del éxito del backend.

**Dependencias:** 4.4.1 para árbol y recuento. Mantener el endpoint y payload
actuales sin `parentId`.

**Riesgo:** no hay bloqueo de petición en curso; doble clic/Enter puede emitir
duplicados. Añadir coordinación de envío por conversación y conservar el
comportamiento pesimista.

#### 4.4.3 — Responder comentario

**Alcance:** formulario recursivo, envío con `parentId` y agregado bajo el
padre correcto tras éxito.

**Dependencias:** 4.4.1 y la operación de creación introducida en 4.4.2; ambos
tipos usan el mismo endpoint, pero el estado de texto/bloqueo es por formulario
de respuesta. Conservar la posibilidad actual de responder a cualquier
comentario no eliminado.

**Riesgo:** tampoco se bloquea el doble envío. La mutación local del hijo y el
árbol raíz deben reflejar una única respuesta confirmada.

#### 4.4.4 — Editar comentario

**Alcance:** editar contenido y `editedAt` en el árbol tras respuesta exitosa.
Conservar la marca “editado” con su umbral actual mientras el backend entregue
`editedAt` igual a `createdAt` al crear.

**Dependencias:** 4.4.1 para localizar y actualizar cualquier nodo. La
visibilidad actual de editar depende de que el autor coincida con el usuario
activo; es una regla de presentación, no autorización efectiva.

#### 4.4.5 — Borrar comentario

**Alcance:** confirmación, borrado backend y marcador local “Comentario
eliminado”; no quitar físicamente el nodo ni sus respuestas. Después de borrar,
ocultar autor, acciones y formulario de respuesta como ahora.

**Dependencias:** 4.4.1 para actualizar el árbol; mantener el marcador solo tras
éxito. La UI actual solo ofrece borrar al autor y no muestra una acción de
moderación. La autorización definitiva corresponde al backend: no inventar ni
retirar permisos de moderación sin verificar el contrato real.

#### 4.4.6 — Identity, avatar y apertura de usuario

**Alcance:** completar la integración pública con Identity iniciada en 4.4.1 y
la composición de apertura/cierre del modal de usuario desde `app`. Mantener el
fallback entre `avatarUrl`, `image` y avatar de la sesión.

**Dependencias:** las operaciones anteriores ya reciben el usuario actual por
la entrada pública establecida en 4.4.1; no importar `modules/identity`
internals desde Community. `UserModal.vue` muestra historial
de votos (Analytics/proyección de actividad) y depende de servicios legacy, por
lo que permanece en app/legacy, no pasa a Community ni se migra aquí. Roles se
exponen solo si la UI ya los necesita; la autorización permanece en backend.

#### 4.4.7 — Consolidación de la conversación

**Alcance:** revisar API pública, árbol único compartido por todas las
mutaciones, bloqueos de doble envío, errores, permisos visibles y compatibilidad
de los componentes. Resolver expresamente la coherencia de `commentCount` de la
tarjeta, que hoy no recibe cambios al crear/borrar aunque el recuento del modal
sí se deriva del árbol. No crear una cache persistente: la conversación es
estado local al modal.

**Fuera de alcance de 4.4:** modo “Mis comentarios” y su consulta
filtrada/paginada de `DiscList.vue` (4.5), reglas de sesión/permisos de
Identity, modal e historial de usuario, y autorización backend.

**Criterio de cierre:** raíces, respuestas, edición y marcador de borrado
conservan el comportamiento tras confirmación; recuentos coherentes dentro de
la conversación y contrato explícito para actualizar/inutilizar el resumen del
disco; ningún doble envío de la misma instancia; Community no importa el store
legacy de auth ni el modal de historial.

**Riesgos observados:** árbol recursivo duplicado entre `ComentsModal` y el
estado local de cada `CommentItem`; mutaciones actualmente llaman HTTP desde
componentes; las acciones no bloquean envíos; el contador de la tarjeta queda
desfasado tras mutaciones. El servicio contiene dos funciones de actualización
equivalentes, que se consolidan al migrar sin ampliar el contrato.

**Tests:** caracterizar carga/árbol, huérfanos, recuento, autoría, respuesta a
comentario eliminado, edición, marcador y respuestas conservadas al borrar,
fallos sin cambio local, avatar, apertura de usuario, envíos repetidos y
coherencia del contador de tarjeta. Cubrir autorización efectiva solo mediante
el contrato/backend simulado; el guard de UI no demuestra permisos.

**Orden recomendado:** 4.4.1 → 4.4.2 → 4.4.3 → 4.4.4 → 4.4.5 → 4.4.6 → 4.4.7.
Los cortes 4.4.2–4.4.5 son separables tras establecer el árbol; la consolidación
debe integrar el evento/estado compartido antes de cerrar el flujo.

**Modelo recomendado:** Luna HyperHigh.

**Estado: completado.** La conversación tiene un único árbol local en Community;
el barrel público expone el modal, el contrato de operaciones y su factory. `app`
compone API, feedback legacy e Identity; `UserModal` e historial permanecen fuera
de Community. La tarjeta recibe el recuento derivado del árbol al abrir y tras
mutaciones confirmadas. El borrado conserva marcador, respuestas y recuento.
No hay cache entre aperturas ni cambio de API, permisos o rutas. Se retiraron las
operaciones duplicadas/directas de `services/comments`; `getCommentsByUser`
permanece para 4.5.

Pruebas: 23 tests enfocados y 200 en total pasan. `yarn verify` y
`git diff --check` pasan; arquitectura verifica 114 archivos y TypeScript no
añade regresiones al baseline de 102 diagnósticos. El build mantiene los avisos
previos de Browserslist, `.flex-[2]` y tamaño del chunk. No se inicia 4.5.

### 4.5 — Lista de comentarios propios

**Alcance:** migrar el modo “Mis comentarios” de `DiscList.vue` y la consulta
filtrada/paginada de comentarios del usuario.

**Fuera de alcance:** la conversación de un disco y las mutaciones de
comentario, ya tratadas en 4.4; también quedan fuera los demás modos del listado.

**Ownership/cache:** Community posee la operación de consulta y los comentarios
devueltos. La ficha anidada del disco se separa en el límite de composición y
Catalog conserva sus datos. La página y sus filtros permanecen en el consumidor,
sin cache global.

**Criterio de cierre:** búsqueda, rango, género, país, orden, total y
paginación conservan el contrato y comportamiento actuales.

**Riesgos:** la vista reúne todos los modos y su coordinación de carga. Limitar
los cambios a la rama de comentarios y preservar la protección contra respuestas
fuera de orden.

**Tests:** parámetros, paginación, vacío, error y cambio rápido de filtros;
verificar que las otras pestañas no cambian.

**Modelo recomendado:** Luna High.

**Estado: completado.** La rama “Mis comentarios” de `DiscList.vue` consulta
Community mediante composición en `app`. Community posee la operación y los
tipos del comentario; Identity aporta la sesión activa en composición y Catalog
publica el tipo de la ficha anidada del disco. Se conserva `/comments`, sus
parámetros, orden, paginación, filtros y presentación. Se retiró
`getCommentsByUser` de `services/comments/comments.ts` al no quedar consumidores;
no se modificaron los otros modos del listado ni se inició 4.6.

Pruebas: parámetros/endpoint, datos con ficha de disco, página vacía, error de
transporte y respuestas incompatibles. `yarn verify` pasa (119 archivos de
arquitectura, 102 diagnósticos baseline sin regresiones, 203 pruebas y build);
`git diff --check` pasa. Persisten los avisos conocidos de Browserslist, selector
`.flex-[2]` y chunk superior a 500 kB. La conversación y mutaciones de comentarios
mantienen el ownership/documentación de 4.4; los demás modos de `DiscList.vue`
y los servicios legacy de favoritos y pendientes quedan pendientes.

### 4.6 — Favoritos

**Alcance:** añadir/quitar favorito desde la tarjeta y migrar el modo
“Favoritos” de `DiscList.vue`.

**Fuera de alcance:** pendientes, otras pestañas del listado y datos propios de
Catalog.

**Ownership/cache:** Community posee la relación favorita y su ID por usuario y
disco, compartida entre tarjetas. La consulta paginada permanece en el
consumidor y se actualiza o invalida después de quitar un favorito. No usar
`favoriteId` de Catalog como estado editable.

**Criterio de cierre:** alta y baja se reflejan solo tras éxito; la lista activa
no conserva entradas obsoletas y dos consumidores del mismo disco convergen al
mismo estado.

**Riesgos:** el bloqueo actual es local a cada tarjeta y la sincronización de la
prop de favorito no se comparte entre instancias.

**Tests:** alta/baja, error sin cambio, peticiones concurrentes desde tarjetas
duplicadas, actualización de la lista, filtros y paginación.

**Modelo recomendado:** Luna High.

**Estado: completado.** Community posee el ID/estado de favorito y las
mutaciones, compartidos en memoria por usuario y disco. `app` conecta el
adaptador HTTP y aporta el usuario activo desde Identity; Catalog conserva la
ficha. Las tarjetas consumen el mismo estado confirmado y bloquean envíos
duplicados; altas/bajas son pesimistas y los errores conservan el último estado.
El modo “Favoritos” de `DiscList.vue` consulta Community con sus filtros,
orden y paginación; al quitar un disco elimina la fila confirmada y ajusta el
offset. Sus respuestas obsoletas siguen descartándose. Se eliminó
`services/favorites/favorites.ts` al quedar sin consumidores. Pendientes y sus
servicios permanecen para 4.7.

Pruebas: siete pruebas cubren lectura/listado y proyección de disco, alta, baja,
errores y reintentos de ambas mutaciones, bloqueo concurrente, estado compartido
y actualización paginada de la lista. `yarn verify` pasa: arquitectura en 125
archivos, 96 diagnósticos baseline sin regresiones, 210 pruebas y build.
`git diff --check` pasa. El baseline se redujo al podar seis diagnósticos de
favoritos/listado ya resueltos. Persisten los avisos conocidos de Browserslist,
`.flex-[2]` y tamaño de chunk superior a 500 kB. No se inicia 4.7.

### 4.7 — Pendientes desde tarjeta y listado

**Alcance:** añadir/quitar “escuchar después” en `DiscCardComponent` y migrar
el modo “Pendientes” de `DiscList.vue`.

**Fuera de alcance:** acciones de calendario, estados de peticiones/sugerencias
de Releases y notificaciones pendientes de soporte.

**Ownership/cache:** Community posee la relación pendiente y su ID por usuario
y disco. La lista paginada permanece en su consumidor y se invalida o actualiza
tras una mutación. Catalog conserva exclusivamente la ficha y página de discos.

**Criterio de cierre:** tarjeta y listado reflejan el mismo estado confirmado;
quitar un disco actualiza la lista activa sin modificar filtros ni orden.

**Riesgos:** el ID se mantiene localmente en la tarjeta y no se sincroniza como
la prop de favorito. “Pendiente” en Releases y soporte tiene otros propietarios.

**Tests:** alta/baja, error sin cambio, envío repetido desde tarjetas
simultáneas, actualización de la lista y aislamiento de los otros estados
llamados pendientes.

**Modelo recomendado:** Luna High.

**Estado: completado.** Community posee la consulta, las mutaciones y el ID
confirmado de `pending` en memoria, indexado por usuario y disco. `app` obtiene
la sesión desde Identity y compone el adaptador; Catalog conserva la ficha.
Tarjetas y modo “Pendientes” leen el mismo estado Pinia; alta y baja son
pesimistas, bloquean envíos simultáneos y conservan el último estado confirmado
si falla la petición. La baja confirmada elimina la fila activa sin alterar el
orden, conserva filtros y corrige contador y paginación. Las respuestas del
listado se descartan al cambiar filtros o página. Releases mantiene sus
peticiones, importaciones y sugerencias fuera de este flujo.

Se retiró `getPendingsByUser` del servicio legacy al quedar sin consumidores.
`postPendingService` y `deletePendingService` se mantienen únicamente para las
tarjetas de calendario estándar y babyUser de 4.8. No se migran calendarios.

Pruebas: siete casos cubren lectura y proyección, alta, baja, errores y
reintentos, bloqueo concurrente, sincronización entre consumidores, listado,
actualización de fila y respuesta obsoleta. `yarn verify` pasa: arquitectura en
130 archivos, 91 diagnósticos baseline sin regresiones, 217 pruebas y build.
`git diff --check` pasa. Persisten los avisos conocidos de Browserslist,
`.flex-[2]` y tamaño de chunk superior a 500 kB. No se inicia 4.8.

### 4.8 — Pendientes en calendarios estándar y babyUser

**Alcance:** migrar la acción de pendiente de las tarjetas de calendario
estándar y babyUser mediante composición de `app` con Community y Catalog.
Retirar `pendingId` de la proyección de dominio de calendario cuando el
consumidor ya use la API de Community.

**Fuera de alcance:** carga, agrupación, fechas y filtros de Catalog; edición de
discos/artistas; lanzamientos nacionales y otras acciones de Releases.

**Ownership/cache:** Catalog mantiene grupos y páginas del calendario.
Community mantiene el estado pendiente compartido con tarjetas y listado; no
duplicar su ID dentro del cache de Catalog.

**Criterio de cierre:** ambas variantes conservan permisos y comportamiento
visual, comparten el estado confirmado con el resto de consumidores y no llaman
a servicios HTTP desde las tarjetas.

**Riesgos:** ambos componentes hacen hoy peticiones directas y carecen de un
bloqueo común de envíos; el contrato del calendario mezcla estado de Community
con datos de Catalog.

**Tests:** alternancia y error en ambas variantes, permisos por rol, doble
envío, coherencia al volver a la vista y E2E de los dos calendarios.

**Modelo recomendado:** Luna High.

**Estado: completado.** Community conserva el `pendingId` confirmado por usuario
y disco en el store compartido con tarjeta y listado. El adaptador de Catalog
separa el ID que llega en la respuesta de calendario como metadato de transporte;
`app` lo siembra con la sesión activa de Identity antes de entregar la página.
El modelo de calendario de Catalog ya no contiene `pendingId`; Catalog sigue
poseyendo consultas, grupos y páginas. Las dos tarjetas llaman a Community desde
la composición de app y actualizan su estado solo tras el éxito del backend,
con bloqueo común por usuario/disco y sin optimismo. Se retiraron
`postPendingService` y `deletePendingService` al quedar sin consumidores.

Se preservan las diferencias existentes: la tarjeta estándar conserva sus
controles de gestión y estilo horizontal, sus mensajes SweetAlert y feedback de
alta; babyUser conserva la tarjeta compacta, su paleta por género, sus mensajes
`SwalService` y la ruta con permisos restringidos. Exportación, herramientas de
grupo, filtros, búsqueda, país, carga y paginación no cambian.

Pruebas: altas/bajas, fallos y reintentos en ambas variantes; bloqueo de doble
envío y sincronización estándar/babyUser sobre el mismo estado Community; el
adaptador separa `pendingId` del modelo Catalog. E2E de ambas rutas comprueba
alta/baja y la suite mantiene las restricciones por rol. La verificación final
se registra en `docs/architecture-baseline.md`. No se inicia 4.9.

### 4.9 — Consolidación de Community

**Estado: completado.** Revisada la estructura por capacidades, la API pública,
las fachadas y servicios legacy, la propiedad de estado/cache, los ciclos e
imports. Las proyecciones comunitarias quedan en composición de `app`; no forman
parte de los modelos explícitos de Catalog.

**Fuera de alcance:** nuevas funciones de producto, limpieza global de legacy y
migración completa de pantallas de Analytics o Editorial.

**Ownership/cache:** Catalog conserva los discos, artistas, calendarios y sus
consultas/páginas. Community mantiene valoraciones, favoritos y pendientes en
servicios de estado de aplicación framework-free, indexados por usuario/disco,
y los limpia tras login, cambio de cuenta y logout. Los composables Vue en
presentation son proyecciones reactivas, no fuente de verdad. Las conversaciones
de comentarios viven solo durante la apertura. Los listados y sus versiones para
descartar respuestas obsoletas siguen en cada consumidor; montar una tarjeta
inicializa el estado compartido, no la respuesta paginada, y no se añade una
cache global.

**API y composición:** `src/modules/community/index.ts` publica operaciones,
tipos consumidos y el modal de conversación. Servicios de estado, puertos y adaptadores se
componen desde `app` y no se exportan como API del módulo. `Community` no importa
Catalog, Identity, Releases, Editorial ni Analytics. `app` compone Identity y
Community, y adapta allí las proyecciones mixtas que aún devuelven los endpoints
de Catalog.

**Legacy:** se eliminaron el adaptador de valoraciones sin consumidores, los
métodos de escritura y detalle de disco ya sustituidos en `services/rates/rates.ts`,
y el bridge de gestión de artistas que solo servía a un consumidor retirado.
`services/rates/rates.ts` permanece para historial, estadísticas y datos por
usuario usados por Dashboard, Statistics y UserModal. Los puentes de Community
en `app/bridges` permanecen mientras los componentes legacy de disco,
calendarios y Dashboard los consuman.

**Criterio de cierre:** cumplido. Cada capacidad tiene dueño y API pública
pequeña; no se detectan ciclos ni dependencias de Community hacia otros módulos.
Los servicios y bridges retirados no tenían consumidores; los restantes y sus
consumidores están identificados arriba y en el baseline.

**Riesgos:** `/discs`, `/discs/date` y gestión de artistas siguen devolviendo
proyecciones mixtas; estadísticas, historial de usuario y partes del dashboard
tienen consumidores legacy.

**Tests y verificación:** `yarn verify` pasa: lint, arquitectura (133 archivos),
TypeScript (89 diagnósticos baseline, 0 regresiones), 228 pruebas en 36 suites
y build. E2E de rating en listado, calendarios estándar/babyUser con pendientes y
sesión/logout pasan (15/15 en ejecución serial; la ejecución paralela tuvo un
fallo transitorio de permisos de calendario, que pasó al repetirla).
`git diff --check` pasa. Persisten avisos conocidos de Browserslist, la clase
`.flex-[2]` y un chunk por encima de 500 kB.

**Deuda real:** `/discs`, `/discs/date` y gestión de artistas todavía mezclan en
el transporte algunos campos comunitarios. Se proyectan en `app` hasta poder
cambiar esos contratos. Las lecturas de historial, estadísticas y actividad
siguen en servicios legacy hasta Iteración 8; los componentes legacy aún usan
puentes de Community. No se inicia la Iteración 5.

**Modelo recomendado:** Luna Max.

**Salida de Iteración 4:** valoraciones, comentarios, favoritos y pendientes
tienen contratos tipados y estado/cache con propietario explícito; sus
consumidores comparten el estado confirmado sin trasladar reglas comunitarias a
Catalog ni dependencias de otros módulos a Community. Las estadísticas,
tendencias, rankings e historial de actividad siguen bajo Analytics, los puntos
de reunión bajo Editorial, los estados de Releases bajo Releases y las llamadas
a proveedores bajo Integrations.

## Iteración 5 — Integraciones del navegador

**Estado: planificada; no iniciada.** Ninguna subtarea está completada.

**Alcance:** retirar las llamadas directas a Spotify del navegador y asignar a
`integrations/spotify` la frontera funcional y de transporte hacia la API de
Riff Valley (`/api/...`). `app` compone los adaptadores para los consumidores;
las vistas no realizan HTTP de Spotify. El backend actual cubre resolución y
detalle de álbum, perfiles y búsqueda múltiple de artistas, géneros, enlaces,
imágenes candidatas, top tracks, track más popular y tracks de discos
existentes. No se crea un endpoint de token y no se conservan credenciales
Spotify en el frontend.

Esta iteración cubre Spotify exclusivamente. Los flujos OAuth de playlists no
se alteran. Last.fm y LanguageTool quedan planificados como trabajo posterior
a la Iteración 5 en la sección independiente que sigue a esta iteración.

### 5.1 — Adaptar `albumDetailsApi` a la API de Riff Valley (S)

**Objetivo:** conservar el contrato de detalle de álbum usando únicamente
endpoints de la aplicación.

**Cambio exacto:** resolver el álbum por artista y nombre con
`GET /api/discs/spotify/album`; consultar su detalle y tracklist mediante
`GET /api/discs/spotify/album/:spotifyAlbumId`; mapear la respuesta al contrato
de aplicación actual y retirar token/HTTP de Spotify del adaptador.

**Qué no cambia:** el contrato neutral consumido por el modal, su contenido,
estados de carga/error ni el orden y formato visible de los tracks.

**Archivos probables:** `src/integrations/spotify/infrastructure/albumDetailsApi.ts`,
pruebas unitarias del adaptador; sin cambios esperados en
`src/app/components/DiscDetailModal.vue`.

**Dependencia previa:** ninguna.

**Terminado cuando:** resolución y detalle salen de `/api/...`, el mapeo
conserva los campos requeridos y no hay referencia a Spotify ni al token en
este adaptador.

**Verificación:** pruebas del adaptador para éxito, no encontrado y error;
pruebas de aplicación existentes; lint y typecheck.

### 5.2 — Adaptar `albumLinksApi` a la API de Riff Valley (S)

**Objetivo:** resolver enlace y portada de álbum desde backend conservando el
puerto de búsqueda por sesión.

**Cambio exacto:** sustituir la búsqueda directa por
`GET /api/discs/spotify/album?albumName=…&artistName=…`; convertir la sesión en
una fachada sin token y mapear `listenUrl`/`coverUrl` a `link`/`image`.

**Qué no cambia:** `AlbumLinksPort`, el resultado de enriquecimiento y el
comportamiento de omitir discos que ya tienen enlace.

**Archivos probables:** `src/integrations/spotify/infrastructure/albumLinksApi.ts`,
pruebas del adaptador y, solo si lo requiere el mapeo, tipos privados de esa
infraestructura.

**Dependencia previa:** ninguna.

**Terminado cuando:** la sesión no solicita token, cada resolución usa la API
de Riff Valley y el puerto conserva su resultado neutral.

**Verificación:** pruebas de resultado encontrado, no encontrado y error;
lint y typecheck.

### 5.3 — Adaptar `artistDetailsApi` a perfil y top tracks backend (S)

**Objetivo:** mantener la información del modal de artista usando el perfil y
las canciones principales servidas por Riff Valley.

**Cambio exacto:** buscar el artista con
`GET /api/spotify/artists/search?artistName=…` y consultar
`GET /api/spotify/artists/:spotifyId/top-tracks`, que actualmente devuelve
resultados con `market=ES`; mapear perfil, géneros, followers, popularity y
top tracks con álbum, imagen y duración al contrato de aplicación. Aceptar
`market=ES` como decisión funcional consciente, en sustitución del `market=US`
que usaba el frontend anterior; no se considera una regresión accidental.

**Qué no cambia:** el contrato que consume `ArtistDetailSpotify.vue`, la
presentación de perfil/canciones ni enlaces de escucha. No añadir DTOs del
proveedor de Spotify.

**Archivos probables:** `src/integrations/spotify/infrastructure/artistDetailsApi.ts`,
pruebas del adaptador y sus tipos privados de transporte.

**Dependencia previa:** ninguna; el endpoint backend actual ya sirve los top
tracks con `market=ES`.

**Terminado cuando:** todos los campos visibles se mapean desde `/api/...`,
incluidos followers, popularity y metadatos de top tracks, y el adaptador no
importa el helper ni llama a Spotify.

**Verificación:** pruebas de perfil completo, campos opcionales, artista no
encontrado y error; typecheck y prueba del componente si cambia el mapeo.

### 5.4 — Adaptar `artistImagesApi` a búsqueda múltiple e imágenes candidatas (S)

**Objetivo:** conservar la selección de imágenes y la búsqueda masiva con los
endpoints de artistas de Riff Valley.

**Cambio exacto:** usar `GET /api/spotify/artists/search/multiple?artistName=…`
para candidatos de artista y `GET /api/spotify/artists/:spotifyId/images` para
las imágenes candidatas de cada artista; mapearlos al contrato neutral actual
de opciones y conservar una sesión reutilizable sin token.

**Qué no cambia:** la elección manual del modal, el relleno masivo de imágenes
ni los puertos de aplicación de imágenes.

**Archivos probables:** `src/integrations/spotify/infrastructure/artistImagesApi.ts`,
`src/app/dependencies/artistImages.ts` solo si requiere composición adicional,
y pruebas del adaptador.

**Dependencia previa:** ninguna.

**Terminado cuando:** búsqueda múltiple e imágenes candidatas provienen de la
API de Riff Valley, los nombres se conservan junto a cada opción y no hay
token ni petición directa a Spotify.

**Verificación:** pruebas con varios artistas, varias imágenes por artista,
resultado vacío y fallo aislado; lint y typecheck.

### 5.5 — Adaptar `artistLinkApi` al perfil backend (XS)

**Objetivo:** obtener el enlace de Spotify del artista a través de la API de
Riff Valley.

**Cambio exacto:** sustituir búsqueda directa por
`GET /api/spotify/artists/search?artistName=…` y mapear `listenUrl` al
resultado actual del puerto.

**Qué no cambia:** la acción ni los mensajes de `SpotifyArtistButton.vue`, que
ya accede a la operación mediante la fachada de Integrations.

**Archivos probables:** `src/integrations/spotify/infrastructure/artistLinkApi.ts`,
pruebas del adaptador.

**Dependencia previa:** ninguna.

**Terminado cuando:** el adaptador devuelve el enlace del primer resultado o
ningún resultado con el comportamiento de error actual, sin token ni HTTP a
Spotify.

**Verificación:** pruebas de encontrado, vacío y error; lint y typecheck.

### 5.6 — Migrar `ImportPage.vue` a la resolución compuesta de álbum (S)

**Objetivo:** retirar la búsqueda directa de álbumes de la vista de
importación.

**Cambio exacto:** ofrecer desde `app` una operación basada en
`albumLinksApi`/resolución de álbum y usarla desde `ImportPage.vue` para obtener
enlace e imagen; conservar el guardado por disco y los estados de resultado.

**Qué no cambia:** contratos de importación, permisos, persistencia ni el
contenido que recibe `updateDisc`.

**Archivos probables:** `src/app/dependencies/` para la composición,
`src/views/importPage/ImportPage.vue` y pruebas de consumidor/composición.

**Dependencia previa:** 5.2.

**Terminado cuando:** la vista no solicita token ni llama a `api.spotify.com`,
y sigue actualizando cada disco importado con el enlace y la imagen
resueltos.

**Verificación:** prueba de consumidor para éxito, álbum ausente y fallo sin
impedir el resto de la importación; typecheck y lint.

### 5.7 — Migrar los géneros de `DiscComponent.vue` (S)

**Objetivo:** obtener géneros del artista desde backend y retirar ambas
peticiones directas de la acción del calendario.

**Cambio exacto:** componer en `app` una consulta de perfil usando
`GET /api/spotify/artists/search?artistName=…`; hacer que el componente use
esa operación y retirar la comprobación adicional de álbumes recientes, que
no aporta datos visibles y no tiene endpoint equivalente.

**Qué no cambia:** acción del usuario, permisos, actualización del género,
avisos de éxito/sin géneros/error y catálogo local.

**Archivos probables:** `src/app/dependencies/`,
`src/views/discsCalendar/components/DiscComponent.vue` y pruebas enfocadas de
la operación/consumidor.

**Dependencia previa:** ninguna; reutilizar `artistDetailsApi` de 5.3 solo si
la composición permite compartir la búsqueda sin acoplar contratos.

**Terminado cuando:** el calendario lee géneros mediante la API de Riff Valley,
ya no consulta Spotify ni la lista de álbumes del artista, y conserva sus
estados visibles.

**Verificación:** prueba de géneros presentes/vacíos, fallo backend y
actualización del disco; lint y typecheck.

### 5.8 — Migrar el track más popular de `DiscCardComponent.vue` (S)

**Objetivo:** retirar de la tarjeta la consulta de tracks y popularidad a
Spotify.

**Cambio exacto:** definir el puerto neutral mínimo si aún no existe,
implementar su adaptador en `integrations/spotify` contra
`GET /api/spotify/albums/:spotifyAlbumId/most-popular-track`, componerlo en
`app` y sustituir el uso de `obtenerTrackMasPopularAlbum`.

**Qué no cambia:** carga diferida al abrir el reproductor, ID del track,
fallback vacío y renderizado del reproductor.

**Archivos probables:** `src/integrations/spotify/application/`,
`src/integrations/spotify/infrastructure/`, `src/app/dependencies/`,
`src/components/DiscCardComponent.vue` y pruebas del adaptador/consumidor.

**Dependencia previa:** ninguna.

**Terminado cuando:** la tarjeta consulta solo la composición de `app`, y el
resultado vacío o el error conservan el fallback actual.

**Verificación:** pruebas de ID devuelto, track inexistente y error; lint y
typecheck.

### 5.9 — Retirar el import Spotify sin uso de `DiscByDate.vue` (XS)

**Objetivo:** eliminar el último vínculo nominal de esa vista con el helper.

**Cambio exacto:** borrar el import sin uso de `obtenerEnlaceArtistaSpotify`;
los botones de artista siguen usando `SpotifyArtistButton` y su operación de
Integrations.

**Qué no cambia:** la vista, los enlaces visibles ni el comportamiento del
botón de Spotify.

**Archivos probables:** `src/views/list/components/DiscByDate.vue`.

**Dependencia previa:** ninguna.

**Terminado cuando:** la vista no importa `SpotifyFunctions.ts` y sus botones
continúan resueltos por el componente compartido.

**Verificación:** búsqueda de imports y typecheck.

### 5.10 — Eliminar DTOs privados del proveedor que queden obsoletos (XS)

**Objetivo:** retirar modelos que representen respuestas directas de Spotify
cuando los adaptadores consuman el contrato de Riff Valley.

**Cambio exacto:** eliminar interfaces privadas de búsqueda, álbum, artista,
imágenes y tracks que hayan dejado de usarse; mantener tipos mínimos de
respuesta de `/api/...` junto a cada adaptador si el tipado los necesita.

**Qué no cambia:** contratos de aplicación/presentación útiles ni DTOs del
backend.

**Archivos probables:** adaptadores bajo
`src/integrations/spotify/infrastructure/` y sus pruebas.

**Dependencia previa:** 5.1–5.5.

**Terminado cuando:** no quedan DTOs del protocolo Spotify en frontend sin
consumidores y se conservan los tipos neutrales utilizados por las vistas.

**Verificación:** búsqueda de referencias, typecheck, lint y arquitectura.

### 5.11 — Retirar `SpotifyFunctions.ts` (XS)

**Objetivo:** eliminar el helper legacy una vez migradas todas sus llamadas.

**Cambio exacto:** borrar `src/helpers/SpotifyFunctions.ts` y cualquier
reexport/import residual, incluida la función legacy de track popular después
de 5.8.

**Qué no cambia:** contratos de Integrations ni las funciones visibles que ya
consumen las composiciones de `app`.

**Archivos probables:** `src/helpers/SpotifyFunctions.ts`, cualquier import
residual y pruebas que aún simulen ese helper.

**Dependencia previa:** 5.1–5.9.

**Terminado cuando:** una búsqueda del repositorio no encuentra imports,
llamadas o referencias de ejecución a `SpotifyFunctions.ts` ni
`obtenerTokenSpotify`.

**Verificación:** búsqueda global de referencias, pruebas enfocadas, lint,
typecheck y arquitectura.

### 5.12 — Eliminar credenciales Spotify del frontend (XS)

**Objetivo:** dejar de exponer configuración de cliente Spotify en el bundle.

**Cambio exacto:** retirar `VITE_CLIENT_ID` y `VITE_CLIENT_SECRET` de los
archivos de entorno/documentación frontend y de sus declaraciones de tipos si
existen; conservar las credenciales exclusivamente en configuración de
servidor/backend.

**Qué no cambia:** configuración `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`
del backend ni OAuth de playlists.

**Archivos probables:** `.env.example`/documentación de entorno frontend y
declaraciones de `ImportMetaEnv` si contienen esos nombres; revisar `.env`
local sin divulgar valores ni incorporarlos al diff.

**Dependencia previa:** 5.11.

**Terminado cuando:** no hay referencias a las variables Spotify en fuentes,
tipos ni plantillas de entorno frontend; el build ya no las necesita.

**Verificación:** búsqueda por nombre de variable sin mostrar valores,
typecheck y build.

### 5.13 — Auditoría final de Spotify (XS)

**Objetivo:** demostrar que la migración Spotify del frontend ha quedado
completamente cerrada después de 5.1–5.12.

**Comprobaciones:** ausencia de `api.spotify.com`, `accounts.spotify.com`,
`SpotifyFunctions.ts`, `obtenerTokenSpotify`, `VITE_CLIENT_ID` y
`VITE_CLIENT_SECRET`; ausencia de imports muertos relacionados con Spotify;
todos los consumidores pasan por `integrations/spotify` y la API de Riff
Valley; no quedan DTOs crudos del proveedor sin necesidad real ni llamadas
directas a Spotify desde vistas/componentes.

**Alcance:** auditoría de cierre sin funcionalidad nueva. Si aparecen residuos
pequeños causados directamente por la migración, documentar su limpieza dentro
de 5.13; no abrir refactors ni cambios funcionales nuevos.

**Dependencia previa:** 5.12 completada.

**Estado:** planificada; no iniciada.

**Verificación:** búsquedas de las referencias indicadas, revisión de imports
muertos y consumidores, `yarn verify` y `git diff --check`.

### Orden recomendado

1. Adaptadores independientes: 5.1–5.5.
2. Consumidores que hoy llaman directamente: 5.6 `ImportPage.vue`, 5.7
   `DiscComponent.vue` y 5.8 `DiscCardComponent.vue`.
3. Limpieza de import residual y DTOs: 5.9–5.10.
4. Retirar helper y credenciales: 5.11–5.12.
5. Cerrar la iteración con la auditoría 5.13: comprobar las referencias,
   consumidores, DTOs e imports de Spotify, y ejecutar `yarn verify` y
   `git diff --check`.

### Riesgos / diferencias a vigilar

- **Mercado de top tracks:** 5.3 acepta `market=ES`, que es el comportamiento
  actual del backend. Cambiar desde `market=US`, usado por el frontend
  anterior, es una decisión funcional consciente de esta migración y no una
  regresión accidental.
- La búsqueda de perfil usa el primer resultado backend; la búsqueda múltiple
  debe preservar la elección entre artistas homónimos en el modal de imágenes.
- Las imágenes de artista se componen desde los candidatos de artista y las
  imágenes de cada perfil; conservar nombres y alternativas en la selección.
- La resolución de álbum y su detalle son dos operaciones: manejar álbum
  ausente, errores de red y campos opcionales sin perder el resultado por
  disco de calendario/importación.
- En `DiscComponent.vue` se retira la consulta de álbumes recientes. Su
  respuesta solo actúa como condición para aplicar géneros; el perfil backend
  ya devuelve los géneros y no debe añadirse un endpoint para esa comprobación.
- No mover OAuth de playlists ni alterar Last.fm o LanguageTool en esta
  migración.

**Salida:** todos los consumidores de Spotify usan `integrations/spotify`
contra `/api/...`, las composiciones de `app` coordinan a las vistas, no queda
token ni secreto Spotify en el navegador y los contratos útiles de aplicación
y presentación se conservan.

## Trabajo posterior a Iteración 5 — Integraciones de Last.fm y LanguageTool

**Estado: planificado; no iniciado.** Este trabajo queda separado de la
migración Spotify y no forma parte de la Iteración 5 ni de la Iteración 6.
Se calendarizará en una futura iteración de Integrations, manteniendo estas
capacidades como destino explícito del roadmap.

- **Last.fm — consolidar biografía de artista en su integración:** conservar
  la carga independiente respecto a Spotify, los campos opcionales, errores y
  fallback; mantener los DTOs y el transporte dentro de
  `integrations/lastfm`. No cambiar la clave ni el contrato del servicio
  externo en esta planificación.
- **LanguageTool — migrar la comprobación editorial fuera del servicio
  legacy:** definir el contrato neutral mínimo, implementar su adaptador y
  composición, migrar el modal conservando offsets, sugerencias, resaltado y
  estados de error, y retirar el servicio legacy cuando no tenga consumidores.
- La futura iteración deberá definir pruebas enfocadas y revisar el manejo del
  texto enviado al proveedor. No incluye cambios de Spotify ni OAuth de
  playlists.

## Iteración 6 — Editorial

**Objetivo:** migrar progresivamente las capacidades editoriales seleccionadas
hacia modules/editorial, manteniendo comportamiento, contratos backend,
permisos y límites arquitectónicos existentes.
Sugerencias, peticiones, importación y lanzamientos nacionales quedan fuera de
Iteración 6 y corresponden a Iteración 7 — Releases.

### Reglas de la iteración

- Migrar por verticales funcionales pequeñas, no por vistas completas.
- Conservar rutas, roles, validaciones, estados de carga/error, confirmaciones,
  payloads y reglas de fecha salvo decisión funcional explícita.
- No eliminar servicios, stores o fachadas legacy mientras existan consumidores.
- No unificar modelos o recursos ambiguos sin evidencia suficiente del backend.
- domain y application no deben depender de Vue, Pinia ni HTTP.
- infrastructure implementa el acceso externo.
- app realiza la composición.
- presentation consume únicamente APIs públicas/composición.
- Añadir caracterización antes de cambiar comportamientos delicados.
- Ejecutar yarn verify al cerrar cada bloque o corte implementado.
- Si Impeccable detecta hallazgos preexistentes, de atribución desconocida o
  fuera del alcance de la tarea actual:
  - no corregirlos;
  - no suprimirlos;
  - no modificar .impeccable/config.json;
  - no cambiar estilos ni comportamiento para satisfacer el hook;
  - corregir únicamente hallazgos demostrablemente introducidos por la tarea
    actual;
  - reportar los demás.

### 6.A — Asignaciones

**Resumen del bloque**

- **Objetivo funcional:** editar el texto asociado a una asignación desde su
  flujo actual.
- **Incluye:** contrato, acceso HTTP, composición y migración del guardado del
  editor de texto.
- **Queda fuera:** migrar LanguageTool, la búsqueda de pistas de Spotify u
  otras operaciones de asignaciones; retirar servicios legacy con consumidores.
- **Dependencias:** cliente HTTP/composición existente y caracterización del
  payload y del comportamiento actual.
- **Riesgos/decisiones pendientes:** el servicio legacy puede tener consumidores
  fuera de Editorial; el contrato backend no está completamente documentado.
- **Orden recomendado:** 6.1, 6.2, 6.3.

#### 6.1 — Contrato para editar texto de asignación (XS)

- **Objetivo y cambio exacto:** definir en Editorial la operación tipada mínima
  para guardar el texto de una asignación, incluyendo identificador, entrada y
  resultado/error necesarios para conservar la respuesta actual.
- **Qué NO cambia:** endpoint, método, payload, validaciones, interfaz del
  editor, LanguageTool y búsqueda de pistas.
- **Archivos/zonas probables:** modules/editorial/domain y
  modules/editorial/application; tipos del servicio legacy de asignaciones
  como evidencia de comportamiento.
- **Dependencia previa:** ninguna; confirmar el uso actual del endpoint y su
  payload antes de fijar el contrato.
- **Criterio de terminado:** el contrato no importa Vue, Pinia ni HTTP y
  representa solo los datos que requiere el guardado.
- **Verificación:** pruebas unitarias del contrato/operación si contiene lógica;
  yarn architecture y yarn typecheck.

#### 6.2 — Adaptador HTTP de edición de asignación (XS)

- **Objetivo y cambio exacto:** implementar en infraestructura de Editorial el
  puerto de guardado y mapear la petición/respuesta al endpoint existente.
- **Qué NO cambia:** URL, método, autenticación, payload ni comportamiento de
  errores del endpoint.
- **Archivos/zonas probables:** modules/editorial/infrastructure y
  composición HTTP ya establecida en app.
- **Dependencia previa:** 6.1 y cliente HTTP compuesto disponible.
- **Criterio de terminado:** presentación y aplicación pueden invocar la
  operación sin importar el servicio legacy ni el cliente HTTP.
- **Verificación:** prueba del adaptador con cliente HTTP simulado, más
  yarn architecture y yarn typecheck.

#### 6.3 — Componer y migrar el guardado del editor de texto (S)

- **Objetivo y cambio exacto:** componer el adaptador en app y migrar el
  guardado de DiscDescriptionModal/AsignationList a la API pública de Editorial.
- **Qué NO cambia:** edición visible, confirmaciones, validaciones, mensajes,
  formato de texto, LanguageTool, Spotify ni carga de asignaciones.
- **Archivos/zonas probables:** composición de app, vistas/componentes del
  editor y consumidores actuales del store de asignaciones.
- **Dependencia previa:** 6.1 y 6.2; identificar consumidores antes de cambiar
  el acceso de la vista.
- **Criterio de terminado:** el guardado migrado conserva sus estados y no hace
  HTTP desde presentación; el servicio legacy permanece si aún tiene
  consumidores.
- **Verificación:** caracterización del guardado y estados de error/carga;
  prueba focalizada del consumidor, yarn verify.

### 6.B — Listas

**Resumen del bloque**

- **Objetivo funcional:** migrar las operaciones editoriales de consulta,
  edición, creación y publicación de listas por recorrido.
- **Incluye:** detalle/actualización, listas especiales, creación
  semanal/mensual y publicación a WordPress.
- **Queda fuera:** retiradas generales del servicio de listas, operaciones de
  playlists y cambios en los consumidores de listas ajenos a Editorial.
- **Dependencias:** APIs públicas de Editorial y composición de HTTP; localizar
  consumidores del servicio legacy antes de cada migración.
- **Riesgos/decisiones pendientes:** el servicio de listas tiene consumidores
  fuera de Editorial; la construcción actual de HTML para WordPress es un
  riesgo conocido y no se corrige en este bloque.
- **Orden recomendado:** 6.4–6.6 para la ficha; después 6.7, 6.8 y 6.9 como
  recorridos independientes.

#### 6.4 — Contrato de listas (XS)

- **Objetivo y cambio exacto:** definir los tipos y operaciones mínimos que
  necesita la ficha de lista para consultar y actualizar sus datos.
- **Qué NO cambia:** DTO/backend, URL, forma de guardar, campos editables ni
  operaciones de publicación.
- **Archivos/zonas probables:** modules/editorial/domain y
  modules/editorial/application; tipos hoy usados por EditList.
- **Dependencia previa:** ninguna; contrastar tipos y payloads del consumidor
  con el servicio actual.
- **Criterio de terminado:** el contrato cubre solo lectura/detalle y
  actualización de ficha, sin acoplarse a infraestructura.
- **Verificación:** yarn architecture y yarn typecheck; pruebas unitarias si
  se añaden reglas o mapeos de aplicación.

#### 6.5 — Adaptador de detalle y actualización de lista (S)

- **Objetivo y cambio exacto:** adaptar las llamadas actuales de lectura y
  actualización de una lista al puerto definido en 6.4.
- **Qué NO cambia:** rutas API, parámetros, payload, permisos ni respuesta
  observable del backend.
- **Archivos/zonas probables:** infraestructura de Editorial y servicio legacy
  de listas como referencia del transporte.
- **Dependencia previa:** 6.4 y cliente HTTP/composición disponibles.
- **Criterio de terminado:** el adaptador cubre las dos operaciones de la ficha
  y mantiene explícitos los errores devueltos por API.
- **Verificación:** pruebas focalizadas del adaptador para lectura, actualización
  y error; yarn architecture y yarn typecheck.

#### 6.6 — Composición y migración de la ficha de lista (S)

- **Objetivo y cambio exacto:** componer las operaciones de 6.5 en app y
  migrar EditList para consumir la API pública.
- **Qué NO cambia:** navegación, campos, validaciones, permisos, guardado,
  notificaciones ni consumidores no editoriales del servicio.
- **Archivos/zonas probables:** composición de app, vista EditList y
  presentación de Editorial.
- **Dependencia previa:** 6.4 y 6.5; caracterizar el guardado y los estados
  actuales de la ficha.
- **Criterio de terminado:** la ficha ya no importa el servicio HTTP legacy y
  conserva el comportamiento observable; servicio legacy sigue disponible para
  otros consumidores.
- **Verificación:** prueba focalizada de carga/edición/error y yarn verify.

#### 6.7 — Migrar consulta y CRUD de listas especiales (S)

- **Objetivo y cambio exacto:** migrar el listado y las operaciones de creación,
  edición y borrado de listas especiales al módulo Editorial, conservando cada
  endpoint y su payload actual.
- **Qué NO cambia:** reglas funcionales de listas especiales, permisos,
  confirmaciones ni consumidores de listas de otros módulos.
- **Archivos/zonas probables:** ListsList, store/servicio legacy de listas y
  APIs públicas de Editorial.
- **Dependencia previa:** contratos/adaptadores para las operaciones afectadas;
  6.4–6.6 solo si se demuestra que comparten el mismo contrato de lista.
- **Criterio de terminado:** consulta y CRUD de este recorrido usan composición
  de Editorial, con carga/error y confirmaciones preservados.
- **Verificación:** pruebas focalizadas de consulta y CRUD, incluida cancelación
  del borrado; yarn verify.

#### 6.8 — Migrar formulario de creación de listas semanales/mensuales (XS)

- **Objetivo y cambio exacto:** sustituir el acceso legacy del formulario
  CreateList por la operación pública de Editorial que crea listas semanales o
  mensuales.
- **Qué NO cambia:** campos, validaciones, reglas de periodo, endpoint,
  navegación ni forma de presentar el resultado.
- **Archivos/zonas probables:** CreateList, contrato/adaptador de creación y
  composición de app.
- **Dependencia previa:** contrato y adaptador de creación definidos; separar
  esta operación de la ficha si sus payloads difieren.
- **Criterio de terminado:** formulario usa la composición, preserva validación
  y errores y no incorpora nuevas reglas de periodo.
- **Verificación:** prueba focalizada de validación y envío/error; yarn verify.

#### 6.9 — Migrar publicación de listas a WordPress (S)

- **Objetivo y cambio exacto:** llevar la operación de publicación de listas al
  adaptador/composición de Editorial y migrar su consumidor.
- **Qué NO cambia:** contrato de WordPress, datos publicados, confirmaciones,
  permisos ni el HTML que actualmente se construye a partir de la respuesta.
- **Archivos/zonas probables:** consumidor de publicación de listas, servicio
  legacy correspondiente, infraestructura y composición de Editorial.
- **Dependencia previa:** confirmar endpoint y payload existentes; crear una
  operación separada si WordPress no comparte el contrato de listas internas.
- **Criterio de terminado:** la vista no realiza HTTP directo y mantiene
  mensajes/estados actuales; el riesgo de HTML queda documentado, no corregido
  por este cambio.
- **Verificación:** prueba del adaptador y prueba focalizada de confirmación,
  éxito y error; yarn verify.

### 6.C — Reuniones

**Resumen del bloque**

- **Objetivo funcional:** desacoplar los recorridos de lista, puntos, edición y
  detalle de reunión.
- **Incluye:** contratos, adaptador y migración separada de tabla/listado, modal
  y detalle.
- **Queda fuera:** unificar reuniones con contenido de calendario o cambiar el
  formato/rendereo de texto.
- **Dependencias:** definir los modelos que realmente necesita cada operación y
  adaptar el endpoint existente sin inferir entidades.
- **Riesgos/decisiones pendientes:** no asumir que /reunions y
  Content(type="reunion") representan la misma entidad o ciclo de vida.
  Documentar el v-html actual en reunión como riesgo existente.
- **Orden recomendado:** 6.10, 6.11; luego 6.12–6.14 como consumidores
  separables.

#### 6.10 — Contrato de reuniones y puntos (S)

- **Objetivo y cambio exacto:** establecer tipos y operaciones de aplicación
  mínimos para las reuniones y sus puntos, separando los datos parciales hoy
  tipados de los campos que cruzan como any.
- **Qué NO cambia:** modelo backend, endpoint, relación con Content, contenido
  HTML ni permisos.
- **Archivos/zonas probables:** dominio/aplicación de Editorial y tipos/modelos
  actualmente usados por lista, modal y detalle.
- **Dependencia previa:** inspeccionar las respuestas y payloads actuales por
  operación; no colapsar recursos con nombre parecido.
- **Criterio de terminado:** los casos de uso del bloque tienen contratos
  explícitos sin dependencias de Vue/Pinia/HTTP y sin introducir tipos
  duplicados ceremoniales.
- **Verificación:** pruebas unitarias de mapeos/reglas añadidas,
  yarn architecture y yarn typecheck.

#### 6.11 — Adaptador de reuniones y puntos (S)

- **Objetivo y cambio exacto:** implementar los puertos de lectura/actualización
  de reunión y gestión de puntos usados por estos consumidores, con DTOs junto
  al adaptador.
- **Qué NO cambia:** rutas existentes, payloads, estructura de respuestas,
  permisos ni ciclo de vida backend.
- **Archivos/zonas probables:** infraestructura Editorial y servicios legacy de
  reuniones/contenidos usados por cada operación.
- **Dependencia previa:** 6.10; verificar si cada endpoint pertenece a
  /reunions o a Content antes de mapearlo.
- **Criterio de terminado:** el adaptador implementa solo operaciones
  confirmadas y conserva respuestas/errores sin suponer equivalencias.
- **Verificación:** pruebas de transporte por endpoint, incluido error; yarn
  architecture y yarn typecheck.

#### 6.12 — Migrar lista de reuniones y tabla de puntos (S)

- **Objetivo y cambio exacto:** migrar la consulta del listado de reuniones y
  carga/operaciones de la tabla de puntos a la API pública de Editorial.
- **Qué NO cambia:** orden, columnas, paginación/filtros existentes, roles ni
  contenido mostrado.
- **Archivos/zonas probables:** lista de reuniones, tabla de puntos y
  presentación/composición de Editorial.
- **Dependencia previa:** 6.10 y 6.11; caracterizar por separado las consultas
  y mutaciones de puntos.
- **Criterio de terminado:** estos consumidores no llaman HTTP ni importan el
  servicio legacy directamente; los demás recorridos no migrados siguen
  funcionando.
- **Verificación:** pruebas focalizadas de carga, error y operación de puntos;
  yarn verify.

#### 6.13 — Migrar el modal de edición de reunión (S)

- **Objetivo y cambio exacto:** cambiar el acceso de datos del modal de edición
  para usar composición/API pública de Editorial.
- **Qué NO cambia:** campos, validaciones, submit, permisos, confirmación,
  contenido del texto ni el uso actual de HTML.
- **Archivos/zonas probables:** modal de reunión, operación de actualización y
  presentación Editorial.
- **Dependencia previa:** 6.10–6.11; mantener explícita cualquier diferencia
  entre el recurso del modal y el de la lista.
- **Criterio de terminado:** modal conserva carga, guardado y error y deja de
  importar la ruta HTTP legacy.
- **Verificación:** prueba focalizada de inicialización, validación, guardado y
  error; yarn verify.

#### 6.14 — Migrar la vista de detalle de reunión (S)

- **Objetivo y cambio exacto:** migrar la carga del detalle y las operaciones
  existentes de esa vista a la API pública de Editorial.
- **Qué NO cambia:** URL/ruta, roles, contenido, tratamiento actual de saltos
  de línea/HTML, ni semántica del endpoint.
- **Archivos/zonas probables:** vista de detalle de reunión y sus consumidores
  del servicio legacy.
- **Dependencia previa:** 6.10–6.11; confirmar el recurso usado por el detalle
  sin inferir que coincide con Content(type="reunion").
- **Criterio de terminado:** consulta compuesta desde app, presentación sin
  HTTP y comportamiento visible preservado.
- **Verificación:** prueba focalizada de carga/vacío/error y yarn verify.

### 6.D — Artículos

**Resumen del bloque**

- **Objetivo funcional:** migrar de forma incremental las operaciones del
  Kanban y formularios de artículos.
- **Incluye:** contrato, adaptador/composición, cambio de estado, consulta y
  filtro, formulario/borrado, asignaciones y altas/ediciones desde calendario.
- **Queda fuera:** cambios de producto al flujo, rediseño del Kanban o lógica de
  vídeo/calendario no necesaria para estos recorridos.
- **Dependencias:** conservar endpoints, restricciones API y consumidor del
  calendario; caracterizar el cambio optimista de estado y su reversión.
- **Riesgos/decisiones pendientes:** artículos tiene consumidores en el
  calendario; las rutas actuales requieren el rol riffValley.
- **Orden recomendado:** 6.15–6.17, cambio de estado 6.18; luego 6.19–6.23
  como operaciones separables.

#### 6.15 — Contrato de artículos (XS)

- **Objetivo y cambio exacto:** definir el contrato mínimo para listar, cambiar
  estado y ejecutar las operaciones de artículo que consumen Kanban y
  formularios.
- **Qué NO cambia:** DTO backend, estados permitidos, permisos, orden o
  presentación.
- **Archivos/zonas probables:** dominio/aplicación de Editorial y tipos del
  servicio de artículos existente.
- **Dependencia previa:** ninguna; inventariar los métodos usados por Kanban y
  calendario antes de fijar el alcance de cada operación.
- **Criterio de terminado:** tipos explícitos cubren operaciones seleccionadas
  sin importar framework ni transporte.
- **Verificación:** yarn architecture y yarn typecheck; pruebas unitarias para
  reglas de estado si se extraen.

#### 6.16 — Adaptador HTTP de artículos (S)

- **Objetivo y cambio exacto:** implementar en infraestructura las operaciones
  tipadas de artículos sobre los endpoints existentes.
- **Qué NO cambia:** URL, payload, autenticación, errores del servidor ni
  validaciones backend.
- **Archivos/zonas probables:** infraestructura Editorial, DTOs junto al
  adaptador y servicio legacy como referencia.
- **Dependencia previa:** 6.15 y composición HTTP disponible.
- **Criterio de terminado:** adaptador probado para las operaciones consumidas;
  no se retira el servicio legacy mientras lo usen calendario u otros módulos.
- **Verificación:** pruebas del adaptador para éxito/error por operación;
  yarn architecture y yarn typecheck.

#### 6.17 — Componer operaciones de artículos en app (XS)

- **Objetivo y cambio exacto:** enlazar puertos/adaptadores de artículos con la
  composición de app y exponer API pública para presentación.
- **Qué NO cambia:** vistas, endpoints, permisos ni comportamiento.
- **Archivos/zonas probables:** composición app y exports públicos de
  modules/editorial.
- **Dependencia previa:** 6.15 y 6.16.
- **Criterio de terminado:** las vistas reciben operaciones compuestas sin
  construir adaptadores ni importar internals de Editorial.
- **Verificación:** prueba de composición si hay selección/configuración;
  yarn architecture y yarn typecheck.

#### 6.18 — Migrar cambio de estado del Kanban de artículos (S)

- **Objetivo y cambio exacto:** migrar la mutación de estado de la tarjeta al
  caso de uso/API pública de Editorial y conservar la actualización optimista y
  rollback ante error.
- **Qué NO cambia:** estados permitidos, bloqueo de published, permisos,
  interacción visual ni semántica del endpoint.
- **Archivos/zonas probables:** Kanban de artículos y su integración con la
  operación compuesta.
- **Dependencia previa:** 6.15–6.17; caracterizar transición, estado optimista y
  reversión antes del cambio.
- **Criterio de terminado:** mutación pasa por Editorial y en fallo se restaura
  el estado previo como hoy.
- **Verificación:** prueba focalizada de éxito, bloqueo y error/rollback;
  yarn verify.

#### 6.19 — Migrar consulta y filtro del Kanban de artículos (S)

- **Objetivo y cambio exacto:** trasladar carga de tarjetas y aplicación de los
  filtros existentes al flujo compuesto de Editorial.
- **Qué NO cambia:** filtros, orden, columnas, roles ni datos mostrados.
- **Archivos/zonas probables:** Kanban de artículos y consulta de artículos en
  Editorial.
- **Dependencia previa:** 6.15–6.17; puede ejecutarse separadamente de 6.18 una
  vez disponible la composición.
- **Criterio de terminado:** carga y filtros no acceden al servicio legacy
  directamente y mantienen estados vacío/error.
- **Verificación:** pruebas focalizadas de filtro y carga/error; yarn verify.

#### 6.20 — Migrar formulario y borrado de artículos (S)

- **Objetivo y cambio exacto:** migrar las operaciones de alta/edición y borrado
  usadas por el formulario al contrato y composición de Editorial.
- **Qué NO cambia:** campos, reglas, confirmación, permisos, payload ni
  comportamiento de éxito/error.
- **Archivos/zonas probables:** formulario/modal de artículos, operación
  Editorial y consumidor del Kanban.
- **Dependencia previa:** 6.15–6.17; confirmar qué operación comparte endpoint
  antes de reutilizarla.
- **Criterio de terminado:** el formulario y borrado usan API pública y
  conservan validaciones y confirmación.
- **Verificación:** pruebas focalizadas de validación, guardado, cancelación y
  error de borrado; yarn verify.

#### 6.21 — Migrar asignaciones de artículos (S)

- **Objetivo y cambio exacto:** migrar la consulta y modificación de usuarios
  asignados a un artículo a la operación compuesta correspondiente.
- **Qué NO cambia:** selección disponible, permisos, nombres de campos ni
  reglas de asignación.
- **Archivos/zonas probables:** formulario/detalle de artículos, servicio de
  usuarios si el flujo lo necesita y composición Editorial.
- **Dependencia previa:** 6.15–6.17 y confirmar propietario de la consulta de
  usuarios; no mover operaciones generales de usuarios sin consumidores
  editoriales identificados.
- **Criterio de terminado:** cambios de asignación usan la API pública
  correspondiente y estados de guardado/error permanecen.
- **Verificación:** pruebas focalizadas de carga y guardado/error; yarn verify.

#### 6.22 — Migrar alta de artículo al calendario (S)

- **Objetivo y cambio exacto:** migrar la creación de artículo iniciada desde
  ContentCalendar al caso de uso público de Editorial.
- **Qué NO cambia:** calendario, fecha seleccionada, reglas UTC/local,
  estructura del contenido ni permisos.
- **Archivos/zonas probables:** alta de artículo desde calendario, ContentCalendar
  y composición compartida de Editorial.
- **Dependencia previa:** 6.15–6.17; coordinar sin extraer del calendario
  operaciones no incluidas.
- **Criterio de terminado:** alta usa API compuesta y mantiene fecha/payload
  actuales; otras llamadas del calendario pueden seguir legacy.
- **Verificación:** prueba focalizada de payload/fecha/error y yarn verify.

#### 6.23 — Migrar edición de artículo desde el calendario (S)

- **Objetivo y cambio exacto:** llevar la edición de artículo iniciada desde
  ContentCalendar a la API pública de Editorial.
- **Qué NO cambia:** apertura, formulario, fecha, comportamiento del calendario,
  permisos o contrato backend.
- **Archivos/zonas probables:** editor de artículo desde calendario,
  ContentCalendar y composición de Editorial.
- **Dependencia previa:** 6.15–6.17; 6.22 solo si se descubre una operación
  común imprescindible.
- **Criterio de terminado:** la edición pasa por composición y conserva datos,
  estados y validaciones del editor actual.
- **Verificación:** prueba focalizada de carga/guardado/error y yarn verify.

### 6.E — Vídeos

**Resumen del bloque**

- **Objetivo funcional:** migrar el Kanban y operaciones de vídeo como
  recorridos diferenciados, sin fusionarlos con artículos.
- **Incluye:** contrato, adaptador/composición, cambio de estado, consulta y
  filtro, formulario/borrado, asignaciones, creación de lista y operaciones de
  calendario.
- **Queda fuera:** cambios de producto, migración del módulo de Spotify u
  operaciones de artículos que no sean dependencia explícita.
- **Dependencias:** caracterizar cambio optimista/rollback y mantener
  compatibilidad con el uso de listas y calendario.
- **Riesgos/decisiones pendientes:** VideoListDetalle consume listas y vídeos;
  no retirar servicios comunes con consumidores ajenos a Editorial. La ruta de
  vídeos requiere actualmente riffValley.
- **Orden recomendado:** 6.24–6.26, 6.27; luego 6.28–6.33 por operación.

#### 6.24 — Contrato de vídeos (XS)

- **Objetivo y cambio exacto:** definir operaciones y tipos mínimos para las
  operaciones de vídeo consumidas por Kanban, formulario y calendario.
- **Qué NO cambia:** estados, payloads, endpoints, permisos ni forma de
  renderizar tarjetas.
- **Archivos/zonas probables:** dominio/aplicación Editorial y tipos usados por
  servicio de vídeos.
- **Dependencia previa:** ninguna; inventariar operaciones actuales y separar
  las que pertenecen a listas.
- **Criterio de terminado:** contratos explícitos, sin Vue/Pinia/HTTP ni
  duplicación de DTOs sin necesidad.
- **Verificación:** yarn architecture y yarn typecheck; pruebas unitarias
  para reglas que se incorporen.

#### 6.25 — Adaptador HTTP de vídeos (S)

- **Objetivo y cambio exacto:** implementar en infraestructura los puertos de
  vídeo sobre los endpoints actuales.
- **Qué NO cambia:** URL, payload, autenticación, permisos o respuestas del
  servidor.
- **Archivos/zonas probables:** infraestructura Editorial, DTOs locales al
  adaptador y servicios legacy de vídeo.
- **Dependencia previa:** 6.24 y cliente HTTP/composición disponible.
- **Criterio de terminado:** transporte tipado cubre operaciones seleccionadas
  y no retira el servicio si siguen consumidores legacy.
- **Verificación:** pruebas focalizadas de éxito/error de adaptador;
  yarn architecture y yarn typecheck.

#### 6.26 — Componer operaciones de vídeos en app (XS)

- **Objetivo y cambio exacto:** enlazar puertos y adaptadores de vídeo en app
  y exponer su API pública a presentación.
- **Qué NO cambia:** rutas, servicios externos ni interfaces.
- **Archivos/zonas probables:** composición de app y exports de Editorial.
- **Dependencia previa:** 6.24 y 6.25.
- **Criterio de terminado:** presentación recibe operaciones compuestas, sin
  construir infraestructura ni acceder a internals.
- **Verificación:** yarn architecture y yarn typecheck; prueba de composición
  si existe selección condicional.

#### 6.27 — Migrar cambio de estado del Kanban de vídeos (S)

- **Objetivo y cambio exacto:** migrar la mutación de estado de tarjeta a la
  operación de Editorial conservando actualización optimista y rollback.
- **Qué NO cambia:** estados permitidos, restricciones del backend, permisos,
  interacción visual ni texto de estado.
- **Archivos/zonas probables:** Kanban de vídeos y API pública compuesta.
- **Dependencia previa:** 6.24–6.26; caracterizar el rollback y respuestas de
  error actuales.
- **Criterio de terminado:** mutación va por Editorial y el estado previo se
  restaura al fallar.
- **Verificación:** prueba focalizada de transición y rollback; yarn verify.

#### 6.28 — Migrar consulta y filtro del Kanban de vídeos (S)

- **Objetivo y cambio exacto:** migrar carga y filtros actuales del Kanban de
  vídeos a la consulta compuesta.
- **Qué NO cambia:** filtros, columnas, orden, permisos ni contenido de las
  tarjetas.
- **Archivos/zonas probables:** Kanban de vídeos y consulta Editorial.
- **Dependencia previa:** 6.24–6.26; es independiente de la mutación 6.27 tras
  componer las operaciones.
- **Criterio de terminado:** consulta y filtros no llaman el servicio HTTP
  legacy desde la vista; carga/vacío/error conservados.
- **Verificación:** pruebas focalizadas de filtro y estados de consulta;
  yarn verify.

#### 6.29 — Migrar formulario y borrado de vídeos (S)

- **Objetivo y cambio exacto:** migrar alta/edición y borrado del formulario de
  vídeo al contrato/adaptador/composición de Editorial.
- **Qué NO cambia:** campos, validaciones, confirmación, permisos y contrato
  backend.
- **Archivos/zonas probables:** formulario/modal de vídeo, Kanban y API pública.
- **Dependencia previa:** 6.24–6.26; comprobar payloads antes de compartir una
  operación con artículos.
- **Criterio de terminado:** formulario y borrado usan composición y conservan
  estados de guardado, error y confirmación.
- **Verificación:** pruebas de validación, guardado, cancelación/error de
  borrado; yarn verify.

#### 6.30 — Migrar asignaciones de vídeos (S)

- **Objetivo y cambio exacto:** migrar lectura y edición de usuarios asignados a
  vídeos al acceso público correspondiente.
- **Qué NO cambia:** opciones de usuario, reglas, roles o persistencia.
- **Archivos/zonas probables:** formulario/detalle de vídeo, operación Editorial
  y consumidor del servicio de usuarios.
- **Dependencia previa:** 6.24–6.26; confirmar el propietario de la consulta de
  usuarios sin migrar toda la gestión de usuarios.
- **Criterio de terminado:** asignaciones usan APIs compuestas y mantienen
  estados actuales.
- **Verificación:** pruebas focalizadas de carga y guardado/error; yarn verify.

#### 6.31 — Migrar creación de lista de vídeo (S)

- **Objetivo y cambio exacto:** migrar la operación de crear la lista vinculada
  a vídeo mediante contrato y composición adecuados.
- **Qué NO cambia:** recursos de lista no relacionados, endpoint, payload,
  permisos ni comportamiento de listas.
- **Archivos/zonas probables:** VideoListDetalle, servicio de listas/vídeos y
  API pública de Editorial.
- **Dependencia previa:** 6.24–6.26; confirmar si la creación corresponde al
  contrato de listas 6.4 o tiene payload/ciclo de vida distinto.
- **Criterio de terminado:** creación usa una operación con propietario claro y
  conserva relación de vídeo/lista; servicios compartidos permanecen si tienen
  consumidores.
- **Verificación:** prueba de payload y éxito/error; yarn verify.

#### 6.32 — Migrar asociación de vídeo al calendario (S)

- **Objetivo y cambio exacto:** migrar la operación que asocia un vídeo con una
  entrada/fecha del calendario usando la API pública de Editorial.
- **Qué NO cambia:** reglas de fecha, zonas horarias, calendario ni recursos
  ambiguos.
- **Archivos/zonas probables:** flujo de vídeo desde ContentCalendar y
  composición de Editorial.
- **Dependencia previa:** 6.24–6.26; verificar endpoint y payload de asociación
  de vídeo antes de reutilizar operación de artículo.
- **Criterio de terminado:** asociación compuesta, fecha y payload iguales a los
  actuales; operaciones restantes del calendario pueden seguir legacy.
- **Verificación:** prueba focalizada de payload/fecha/error; yarn verify.

#### 6.33 — Migrar edición de vídeo desde el calendario (S)

- **Objetivo y cambio exacto:** migrar la edición iniciada desde calendario
  para invocar la operación pública de Editorial.
- **Qué NO cambia:** interfaz, fechas, permisos, validación o endpoint.
- **Archivos/zonas probables:** editor de vídeo desde calendario,
  ContentCalendar y API compuesta.
- **Dependencia previa:** 6.24–6.26; 6.32 solo si ambos usan una operación
  confirmada como común.
- **Criterio de terminado:** edición usa composición y preserva el
  comportamiento/estados visibles.
- **Verificación:** prueba de carga, guardado y error; yarn verify.

### 6.F — Calendario editorial

**Resumen del bloque**

- **Objetivo funcional:** migrar una operación acotada de calendario,
  empezando por el movimiento de evento.
- **Incluye:** contrato/regla de reprogramación y migración de eventDrop.
- **Queda fuera:** migrar toda la vista monolítica, consultas de todos los tipos,
  altas/ediciones cubiertas en los bloques de artículos y vídeos, o rediseñar
  fechas.
- **Dependencias:** caracterizar y retener conversión UTC/local y contrato actual
  de actualización.
- **Riesgos/decisiones pendientes:** ContentCalendar combina varios recursos y
  servicios; preservar las reglas de zona horaria.
- **Orden recomendado:** 6.34 antes de 6.35.

#### 6.34 — Contrato y operación de reprogramación editorial (S)

- **Objetivo y cambio exacto:** definir la operación tipada para reprogramar el
  evento del calendario y aislar las transformaciones de fecha que sean lógica
  propia del frontend.
- **Qué NO cambia:** formatos enviados, semántica de fecha, endpoint, recursos
  distintos de reprogramar ni la zona horaria observable.
- **Archivos/zonas probables:** dominio/aplicación Editorial, tipos de
  calendario y servicio de actualización actual.
- **Dependencia previa:** caracterizar valores antes/después en UTC y local;
  confirmar el payload aceptado por backend.
- **Criterio de terminado:** contrato y regla comprobables sin Vue/HTTP
  conservan la semántica actual.
- **Verificación:** pruebas de fechas límite/zona UTC-local y yarn
  architecture, yarn typecheck.

#### 6.35 — Migrar eventDrop del calendario (S)

- **Objetivo y cambio exacto:** hacer que eventDrop solicite reprogramación
  mediante la API compuesta de Editorial y gestione éxito/error según el
  comportamiento actual.
- **Qué NO cambia:** vista completa, eventos de otros tipos, presentación,
  restricciones de fecha ni conversión UTC/local.
- **Archivos/zonas probables:** ContentCalendar, composición de Editorial y
  adaptador de reprogramación.
- **Dependencia previa:** 6.34; caracterizar cancelación/reversión si falla la
  actualización.
- **Criterio de terminado:** solo la operación eventDrop migrada pasa por
  Editorial, conserva fecha e interacción y no arrastra migraciones de otros
  recorridos.
- **Verificación:** pruebas de conversión, movimiento y fallo/reversión;
  yarn verify.

### 6.G — Playlists de festivales

**Resumen del bloque**

- **Objetivo funcional:** migrar por operación la gestión de playlists de
  festivales a Editorial y su composición.
- **Incluye:** contrato y transporte, lectura/estado/usuario, ciclo de vida del
  registro, metadatos/imagen y gestión de artistas/pistas.
- **Queda fuera:** OAuth, cambios en proveedor Spotify, permisos de backend no
  confirmados y playlist de géneros.
- **Dependencias:** APIs backend existentes expuestas por servicios legacy;
  separar catálogo/metadata de artistas y pistas.
- **Riesgos/decisiones pendientes:** mantener reglas actuales de roles visibles
  (riffValley, admin, superUser) y no retirar servicios mientras haya
  consumidores; confirmar permisos efectivos con backend.
- **Orden recomendado:** 6.36–6.37; después 6.38–6.40 y al final el conjunto
  acotado de artistas/pistas en 6.41.

#### 6.36 — Contrato del ciclo de playlist de festivales (XS)

- **Objetivo y cambio exacto:** definir contratos separados para el registro de
  festival y los datos de playlist que consume el tablero.
- **Qué NO cambia:** endpoints, OAuth, modelo backend ni tipos de playlists de
  géneros.
- **Archivos/zonas probables:** dominio/aplicación de Editorial y tipos usados
  por vistas/servicios legacy de festivales.
- **Dependencia previa:** ninguna; contrastar llamadas actuales y no crear un
  recurso unificado sin evidencia.
- **Criterio de terminado:** operaciones/tipos cubren únicamente los datos
  necesarios y son independientes de framework y transporte.
- **Verificación:** yarn architecture y yarn typecheck; pruebas unitarias
  solo para lógica contractual introducida.

#### 6.37 — Adaptador y composición de playlists de festivales (S)

- **Objetivo y cambio exacto:** implementar y componer transporte para las
  operaciones confirmadas del contrato 6.36.
- **Qué NO cambia:** endpoint, OAuth, proveedor Spotify, permiso backend ni
  payloads.
- **Archivos/zonas probables:** infraestructura Editorial, DTOs locales al
  adaptador y composición app.
- **Dependencia previa:** 6.36 y cliente HTTP disponible.
- **Criterio de terminado:** los adaptadores manejan endpoints actuales con
  mapeos tipados, y app expone API pública de Editorial.
- **Verificación:** pruebas de adaptador para éxito/error y checks
  yarn architecture, yarn typecheck.

#### 6.38 — Migrar lectura, estado y usuario del tablero de festivales (S)

- **Objetivo y cambio exacto:** migrar consulta del tablero, estado del registro
  y usuario asociado a las operaciones compuestas de Editorial.
- **Qué NO cambia:** orden/filtros visibles, roles, modelo, selección de usuario
  o ciclo de vida.
- **Archivos/zonas probables:** tablero de festivales, servicio legacy y
  composición de Editorial.
- **Dependencia previa:** 6.36–6.37; confirmar si estado y usuario usan el
  mismo recurso backend que la consulta.
- **Criterio de terminado:** los tres accesos migrados consumen APIs públicas,
  conservando permisos y estados carga/vacío/error.
- **Verificación:** pruebas focalizadas de consulta, cambio de estado y usuario;
  yarn verify.

#### 6.39 — Migrar creación, enlace y borrado de registro de festival (S)

- **Objetivo y cambio exacto:** migrar el ciclo de alta, vinculación con
  playlist y borrado del registro de festival.
- **Qué NO cambia:** ciclo de vida backend, confirmaciones, endpoint, OAuth ni
  orden de operaciones.
- **Archivos/zonas probables:** formularios/acciones de festival, servicio
  legacy y operaciones Editorial.
- **Dependencia previa:** 6.36–6.37; identificar si crear/enlazar/borrar son
  endpoints independientes y mantener esa secuencia.
- **Criterio de terminado:** operaciones pasan por aplicación/adaptador y
  mantienen confirmación, errores y vínculo actual.
- **Verificación:** pruebas por operación, incluida cancelación/error de
  borrado; yarn verify.

#### 6.40 — Migrar metadatos e imagen de playlist de festival (S)

- **Objetivo y cambio exacto:** migrar edición de metadatos e imagen del
  recorrido de festival al acceso compuesto ya definido.
- **Qué NO cambia:** campos visibles, tratamiento de imagen, restricciones del
  proveedor ni OAuth.
- **Archivos/zonas probables:** editor de playlist de festival y operaciones de
  infraestructura/composición Editorial.
- **Dependencia previa:** 6.36–6.37; confirmar el contrato backend de metadatos
  e imagen antes de compartir adaptadores.
- **Criterio de terminado:** metadatos e imagen usan APIs públicas y conservan
  validación, carga/error y payload.
- **Verificación:** pruebas focalizadas de guardado y error; yarn verify.

#### 6.41 — Migrar artistas y pistas de festivales (M)

- **Objetivo y cambio exacto:** migrar las operaciones de cargar/añadir/quitar
  artistas y administrar pistas del festival, separándolas por contratos cuando
  las APIs sean diferentes.
- **Qué NO cambia:** algoritmo de selección, límites backend, OAuth, SDKs de
  proveedor o las operaciones de playlists de géneros.
- **Archivos/zonas probables:** componentes de artistas/pistas de festivales,
  servicios legacy y contratos/adaptadores Editorial.
- **Dependencia previa:** 6.36–6.37; confirmar payloads, orden y límites por
  endpoint; subdividir en cortes de consumidor si la inspección demuestra que
  son independientes.
- **Criterio de terminado:** operaciones de artistas y pistas usan composición
  explícita, conservan secuencia, errores y restricciones observadas.
- **Verificación:** pruebas focalizadas por operación y errores de backend;
  yarn verify.

### 6.H — Playlists de géneros

**Resumen del bloque**

- **Objetivo funcional:** migrar de forma separada tablero, registro,
  metadatos, selección y limpieza/mezcla de playlists de géneros.
- **Incluye:** contrato, adaptador/composición y operaciones visibles de la
  interfaz existente.
- **Queda fuera:** migrar OAuth, playlists de festivales, cambiar permisos
  visibles o normalizar modelos que backend aún no confirma.
- **Dependencias:** contratos actuales de los endpoints legacy y APIs públicas
  de Editorial; verificar qué operaciones son propias de playlists.
- **Riesgos/decisiones pendientes:** la vista de géneros no refleja el mismo
  control canManage visible que festivales; confirmar reglas reales backend
  antes de alterar permisos. Servicios legacy pueden tener más consumidores.
- **Orden recomendado:** 6.42–6.43; luego 6.44–6.46 y cerrar con selección/
  limpieza en 6.47–6.48.

#### 6.42 — Contrato de playlists de géneros (S)

- **Objetivo y cambio exacto:** definir contratos para el tablero de géneros y
  las operaciones actuales de registro, metadatos, artistas, pistas y limpieza
  que se migren.
- **Qué NO cambia:** permisos, endpoint, modelo backend, OAuth ni equivalencia
  con playlist de festival.
- **Archivos/zonas probables:** dominio/aplicación Editorial, tipos usados por
  el tablero y servicios legacy de géneros.
- **Dependencia previa:** revisar las operaciones usadas por cada zona del
  tablero y separar recursos distintos.
- **Criterio de terminado:** contratos tipados por operación con dominio neutral,
  sin suponer modelo común con festivales.
- **Verificación:** unit tests de reglas/mapeos que se incorporen;
  yarn architecture y yarn typecheck.

#### 6.43 — Adaptador y composición de playlists de géneros (S)

- **Objetivo y cambio exacto:** implementar los adaptadores para endpoints
  confirmados y componerlos en app para ofrecer API pública de Editorial.
- **Qué NO cambia:** URLs, payloads, permisos, OAuth o errores backend.
- **Archivos/zonas probables:** infraestructura Editorial, DTOs locales y
  composición app.
- **Dependencia previa:** 6.42 y acceso HTTP compuesto.
- **Criterio de terminado:** las operaciones elegidas tienen transporte tipado
  y exports de composición sin exponer infraestructura a presentación.
- **Verificación:** pruebas de adaptador para éxito/error; yarn architecture
  y yarn typecheck.

#### 6.44 — Migrar lectura, estado y usuario del Kanban de géneros (S)

- **Objetivo y cambio exacto:** migrar carga del tablero y operaciones de estado
  y usuario asociado al flujo compuesto de Editorial.
- **Qué NO cambia:** roles/permisos efectivos, filtros, estado disponible,
  endpoint o usuario elegible.
- **Archivos/zonas probables:** Kanban de géneros, store/servicio legacy y
  API pública de Editorial.
- **Dependencia previa:** 6.42–6.43; confirmar autorización backend antes de
  modificar controles visibles.
- **Criterio de terminado:** carga/estado/usuario consumen composición y
  conservan su comportamiento y estados actuales.
- **Verificación:** pruebas focalizadas de consulta, estado, usuario y error;
  yarn verify.

#### 6.45 — Migrar creación, enlace y borrado de registro de género (S)

- **Objetivo y cambio exacto:** llevar la creación, asociación a playlist y
  borrado del registro de género al módulo y composición de Editorial.
- **Qué NO cambia:** ciclo backend, confirmaciones, permisos ni secuencia de
  llamadas.
- **Archivos/zonas probables:** formulario/acciones del Kanban de géneros,
  servicios legacy y API pública.
- **Dependencia previa:** 6.42–6.43; confirmar operaciones y recursos backend
  antes de reutilizar contrato de festivales.
- **Criterio de terminado:** registro se crea, enlaza y borra vía composición,
  manteniendo errores y confirmaciones.
- **Verificación:** pruebas focalizadas por operación y cancelación/error;
  yarn verify.

#### 6.46 — Migrar metadatos de playlist de género (S)

- **Objetivo y cambio exacto:** migrar lectura/edición de metadatos de la
  playlist de género a las operaciones compuestas.
- **Qué NO cambia:** campos, validaciones, límites backend, permisos o
  presentación.
- **Archivos/zonas probables:** editor de metadatos de género y API Editorial.
- **Dependencia previa:** 6.42–6.43; mantener la distinción respecto a
  metadatos de festivales salvo contrato backend comprobado.
- **Criterio de terminado:** lectura y guardado usan API pública; carga,
  validación y errores siguen equivalentes.
- **Verificación:** pruebas de carga, validación, guardado/error; yarn verify.

#### 6.47 — Migrar artistas y selección de pistas de género (M)

- **Objetivo y cambio exacto:** migrar carga/gestión de artistas y flujo de
  selección de pistas, manteniendo separadas las operaciones que tengan
  contratos diferentes.
- **Qué NO cambia:** reglas de selección, orden, restricciones backend,
  permisos, OAuth o SDKs.
- **Archivos/zonas probables:** componentes de artistas/pistas de género y
  servicios/adaptadores de Editorial.
- **Dependencia previa:** 6.42–6.43; verificar llamadas y dividir por consumidor
  si carga de artistas y selección de pistas resultan independientes.
- **Criterio de terminado:** ambas capacidades pasan por APIs públicas con
  orden, restricciones, carga y errores preservados.
- **Verificación:** pruebas por operación, incluidos estados vacíos y errores;
  yarn verify.

#### 6.48 — Migrar operaciones de limpieza y mezcla de playlist de género (S)

- **Objetivo y cambio exacto:** migrar al módulo las operaciones existentes de
  limpieza/mezcla de playlist y sus confirmaciones.
- **Qué NO cambia:** algoritmo backend, orden de pistas, sentido de las
  confirmaciones, permisos o efectos externos.
- **Archivos/zonas probables:** acciones de limpieza/mezcla, servicio legacy y
  API pública Editorial.
- **Dependencia previa:** 6.42–6.43; confirmar si son operaciones del mismo
  endpoint o dos operaciones distintas.
- **Criterio de terminado:** operación/es usan composición y mantienen payload,
  confirmación, resultados y tratamiento de error actuales.
- **Verificación:** pruebas focalizadas de confirmación, éxito y error;
  yarn verify.

### Riesgos y decisiones pendientes de Iteración 6

- Los contratos backend actuales no están completamente documentados; el código
  legacy sirve como evidencia de comportamiento, no como especificación
  completa.
- No asumir que /reunions y Content(type="reunion") representan la misma
  entidad o ciclo de vida hasta confirmarlo con backend.
- No alterar permisos visibles de playlists de géneros sin confirmar primero
  las reglas reales del backend.
- Mantener y caracterizar las reglas de fechas UTC/local del calendario
  editorial.
- No retirar servicios de listas o asignaciones mientras sigan teniendo
  consumidores fuera de Editorial.
- Documentar el uso actual de v-html en reuniones y la construcción de HTML
  para WordPress como riesgos existentes; esta reorganización no implica una
  corrección funcional de ninguno.

### Criterio de cierre de Iteración 6

La iteración se considera completada cuando:

- las capacidades seleccionadas de Editorial pasan por sus módulos y
  composición correspondientes;
- no se han introducido cambios funcionales no previstos;
- los servicios legacy solo permanecen donde todavía existan consumidores;
- las ambigüedades backend están documentadas en lugar de resolverse por
  inferencia;
- las verificaciones correspondientes pasan;
- Iteración 7 — Releases permanece fuera de este alcance.

**Estado: CERRADA CON DEUDA DOCUMENTADA.** Las subtareas 6.1–6.48 están
completadas. La auditoría final no encontró hallazgos residuales dentro del
alcance. `yarn architecture`, los tests de Editorial (157/157), `yarn build` y
`git diff --check` pasan. `yarn verify` sigue bloqueado únicamente porque el
baseline TypeScript contiene excepciones ya resueltas que requieren
mantenimiento autorizado; el baseline no se modificó durante la Iteración 6.
OAuth y determinadas operaciones Spotify legacy permanecen fuera de alcance.

## Iteración 7 — Releases

**Objetivo:** migrar las capacidades de sugerencias, peticiones de discos,
importación y lanzamientos nacionales a `modules/releases`, por recorridos
pequeños. Cada bloque puede cerrarse independientemente y no inicia el siguiente
automáticamente.

### Reglas de la iteración

- Antes de cada corte, caracterizar el comportamiento sensible y confirmar
  consumidores y contratos con el código legacy; los endpoints actuales son
  evidencia, no una especificación completa del backend.
- Mantener dominio y aplicación en TypeScript puro. Adaptadores HTTP y
  composición se ubican en infraestructura y `app`; presentación no importa
  servicios, cliente HTTP, DTOs ni SDKs.
- Crear carpetas solo cuando el corte las necesite y organizar por capacidad
  (`suggestions`, `requests`, `imports`, `national-releases`), con capas dentro
  de cada capacidad. Publicar una API acotada para consumidores externos.
- No incorporar operaciones de otros propietarios a Releases: Catalog mantiene
  discos, artistas, géneros, países y su creación/actualización; Integrations
  mantiene búsqueda y detalle de Spotify; Product Ops mantiene versiones y
  elementos de versión; Editorial mantiene listas, reuniones y calendario
  editorial. `app` puede componer capacidades mediante contratos explícitos.
- No deducir contratos, validaciones, autorización del backend ni semántica de
  errores por intuición. Conservar la conducta observada y documentar dudas.
- Conservar rutas, nombres, carga diferida, roles, acceso anónimo, payloads,
  query params, estados, textos de error relevantes y comportamiento visual.
- No retirar servicios, stores, fachadas ni DTOs legacy hasta migrar todos sus
  consumidores. No ampliar excepciones arquitectónicas ni de typecheck.
- En todos los bloques, si Impeccable detecta hallazgos preexistentes, de
  atribución desconocida o fuera de alcance, no corregirlos ni suprimirlos, no
  modificar `.impeccable/config.json` ni cambiar estilos o comportamiento para
  satisfacer el hook. Corregir únicamente hallazgos demostrablemente introducidos
  por la subtarea actual y reportar los demás.
- Ejecutar `yarn verify` al cerrar cada bloque implementado y las pruebas E2E
  relevantes para rutas, permisos o formularios públicos. Los tests unitarios
  siguen la organización `tests/unit/releases/<capacidad>/`; E2E se organizan
  bajo `tests/e2e/releases/` por recorrido.
- Baseline de pruebas inspeccionado: solo se encontró la caracterización
  `tests/unit/legacy/importPageAlbumLinks.spec.ts`; no hay suites unitarias ni
  E2E focalizadas para Releases. Añadir cobertura por recorrido antes de
  eliminar la prueba legacy o cambiar comportamiento delicado.

### 7.A — Sugerencias y bugs

**Objetivo:** migrar el envío de sugerencias/bugs, la vista de usuario, su
administración y la coordinación del badge de pendientes.

- **Alcance:** `SuggestionsPage.vue` (`/suggestions`),
  `SuggestionsManagement.vue` (`/suggestions/management`), sus operaciones de
  creación/listado/estado/prioridad/rechazo/cierre/eliminación y el badge del
  menú lateral. Endpoints observados: `/suggestions`, `/suggestions/my`,
  `/suggestions/:id`, `/progress`, `/reject`, `/done`.
- **Ownership:** Releases posee las sugerencias, sus estados y la operación que
  las asocia a un `versionItemId`. Product Ops conserva `VersionItem` y
  `/versions/current/items`; hasta Iteración 8 `app` compone esa consulta desde
  la fachada legacy de versiones mediante un puerto, sin copiar su DTO a
  Releases. El store actual de soporte contiene IDs/leídos de sugerencias; al
  mover esa coordinación preservar `rv_support_read_ids` y su comportamiento,
  sin trasladar el dominio de soporte de Product Ops.
- **Rutas y dependencias:** `/suggestions` requiere sesión; la gestión requiere
  `superUser`. El layout del sidebar consume el número de pendientes; Releases
  no importa `layouts` ni `stores` externos. `app` conecta la consulta de
  pendientes y el estado de lectura con presentación.
- **Riesgos/legacy:** la respuesta de listado tiene compatibilidad de forma
  array/`data`; el filtro activo determina qué IDs llegan al badge; marcar como
  leída persiste IDs. El hook `done` puede guardar un elemento de Product Ops o
  quedar como cierre interno. No mover acceso de versiones a Releases ni alterar
  el acceso autenticado de la vista de usuario.
- **Criterio de cierre:** ambos recorridos consumen Releases sin HTTP legacy en
  presentación; el badge, persistencia, filtros y acciones conservan su
  comportamiento y el enlace de versión se compone por contrato público.

**Estado: COMPLETADA (7.1–7.9).**

#### 7.1 — Caracterizar sugerencias y acciones (S)

- **Objetivo:** fijar el comportamiento actual antes de extraerlo.
- **Alcance concreto:** pruebas de `/suggestions` y `/suggestions/management`;
  creación, filtros tipo/estado, prioridad optimista, rechazo, progresión,
  cierre interno/con elemento de versión, eliminación, IDs leídos y badge.
- **Dependencias:** código y rutas actuales; usar respuestas HTTP simuladas.
- **Criterios de aceptación:** quedan documentados payloads, respuesta array o
  `data`, mensajes, roles, loading/error/vacío y clave `rv_support_read_ids`.
- **Verificaciones específicas:** pruebas focalizadas de presentación y
  composición; comprobar en router `requiresAuth` y `superUser`.

#### 7.2 — Definir contratos de sugerencias (XS)

- **Objetivo:** tipar el modelo propio de Releases sin incorporar contratos de
  Product Ops.
- **Alcance concreto:** tipos puros de sugerencia, estado, prioridad, usuario,
  entradas y filtros en `modules/releases/suggestions/domain`.
- **Dependencias:** 7.1.
- **Criterios de aceptación:** representa opcionales y nulos observados; no
  importa Vue, Pinia, HTTP ni `VersionItem`.
- **Verificaciones específicas:** pruebas de tipos/comportamiento puro si hay
  reglas; inspección de imports de domain.

#### 7.3 — Definir operaciones y puertos de sugerencias (S)

- **Objetivo:** expresar los recorridos públicos y administrativos como
  operaciones pequeñas de Releases.
- **Alcance concreto:** puertos para enviar y consultar propias, filtrar/listar,
  actualizar prioridad, cambiar estado, rechazar, cerrar, eliminar y obtener
  elementos de versión a través de una dependencia externa explícita.
- **Dependencias:** 7.2.
- **Criterios de aceptación:** casos y puertos no conocen transporte ni
  `VersionItem`; la asociación de versión solo recibe el identificador requerido.
- **Verificaciones específicas:** pruebas unitarias de entradas, resultados y
  errores propagados; revisar reglas del guard.

#### 7.4 — Adaptar la API de sugerencias (S)

- **Objetivo:** encapsular los endpoints de sugerencias y sus DTOs.
- **Alcance concreto:** adaptador para `POST/GET /suggestions`, `GET
  /suggestions/my`, `PATCH /suggestions/:id`, `PATCH .../progress`, `PATCH
  .../reject`, `PATCH .../done` y `DELETE /suggestions/:id`.
- **Dependencias:** 7.3 y cliente HTTP compartido.
- **Criterios de aceptación:** métodos, query params, payloads y formas de
  respuesta equivalen al servicio legacy; los DTOs quedan junto al adaptador.
- **Verificaciones específicas:** tests del adaptador para cada método, query,
  payload, retorno void y propagación de fallo.

#### 7.5 — Componer Releases y Product Ops (S)

- **Objetivo:** conectar Releases con sesión, badge y elementos de versión desde
  `app` sin acoplar módulos.
- **Alcance concreto:** composición de los puertos de sugerencias; fuente externa
  de elementos de versión usando `services/versions` temporalmente; coordinación
  del estado de lectura conservando `rv_support_read_ids`; exposición de la
  operación de pendientes para el sidebar.
- **Dependencias:** 7.3–7.4; Product Ops permanece en Iteración 8.
- **Criterios de aceptación:** ni Releases importa Product Ops/legacy ni la
  presentación llama servicios; el puerto de versión puede sustituirse al migrar
  Product Ops en Iteración 8.
- **Verificaciones específicas:** prueba de composición con adaptadores falsos
  y comprobación de imports/ciclos.

#### 7.6 — Migrar el recorrido de usuario (S)

- **Objetivo:** migrar `/suggestions` manteniendo su formulario autenticado y
  consulta de propias sugerencias.
- **Alcance concreto:** composición de vista/presentación, estados de carga,
  envío, errores, listado, conteos y filtros disponibles actualmente.
- **Dependencias:** 7.1 y 7.5.
- **Criterios de aceptación:** URL, nombre, guard, validaciones, payload,
  contenido y estados visibles permanecen; la vista no importa servicio HTTP.
- **Verificaciones específicas:** test de formulario y listado con API simulada;
  E2E focalizado del envío si el runner permite interceptar esta ruta.

#### 7.7 — Migrar administración y lectura (M)

- **Objetivo:** migrar la gestión completa sin deshacer su coordinación de
  sugerencias ni la relación con elementos de versión.
- **Alcance concreto:** filtros, lista, alta, prioridad, rechazo, volver a
  pendiente, cierre interno/asociado a versión, borrado, marcar leído y store de
  IDs pendientes; conservar la coordinación de UI en presentación.
- **Dependencias:** 7.1 y 7.5.
- **Criterios de aceptación:** role guard, mensajes, actualización optimista y
  rollback de prioridad, estado de lectura y contrato `done` permanecen; no se
  crea un store para reglas de negocio.
- **Verificaciones específicas:** pruebas de cada acción y errores; test de
  persistencia legacy; E2E con rol autorizado y denegación sin rol.

#### 7.8 — Migrar badge del sidebar (XS)

- **Objetivo:** retirar acceso directo de layout a servicios de Releases.
- **Alcance concreto:** carga de pendientes de sugerencias en `app` y proyección
  al layout manteniendo el badge y su refresco según el comportamiento actual.
- **Dependencias:** 7.5 y, para IDs actualizados durante la sesión, 7.7.
- **Criterios de aceptación:** sidebar no importa `services/suggestions`; los
  badges mantienen selección, conteo y límite `99+`; se conserva el tratamiento
  de errores silenciosos del montaje salvo evidencia que requiera ajustar.
- **Verificaciones específicas:** test del badge/puente y búsqueda de imports.

#### 7.9 — Cerrar compatibilidad de sugerencias (XS)

- **Objetivo:** retirar solo fachadas sin consumidores tras ambos recorridos.
- **Alcance concreto:** borrar o adelgazar `services/suggestions/suggestions.ts`
  y ubicar sus pruebas bajo `tests/unit/releases/suggestions/`.
- **Dependencias:** 7.6–7.8; Product Ops puede seguir usando su propia fachada
  de versiones.
- **Criterios de aceptación:** búsqueda global sin consumidores de operaciones
  legacy de sugerencias; no se elimina ni duplica `/versions/current/items`.
- **Verificaciones específicas:** `rg` de exports/imports y tests del bloque.

### 7.B — Peticiones de discos

**Objetivo:** migrar la solicitud de discos del usuario autenticado, seguimiento propio,
revisión administrativa y contador compartido de pendientes.

- **Alcance:** `SuggestPage.vue` (`/suggest`), `PetitionsPage.vue`
  (`/petitions`), sus vistas/forms y `SidebarMenu`. Endpoints: `POST
  /requests`, `GET /requests/my`, `GET /requests`, `PATCH /requests/:id`,
  `POST /requests/:id/approve`, `POST /requests/:id/reopen` y
  `DELETE /requests/:id` con notas de rechazo.
- **Ownership y dependencias:** Releases posee solicitud, estado y notas;
  Catalog posee géneros/países y los discos/artistas creados al aprobar. La
  pantalla consume opciones de Catalog mediante su API pública y `app` compone
  ambas capacidades. El store `petitions` solo coordina el badge/estado visual
  de Releases y puede reubicarse dentro de su presentación.
- **Rutas y riesgos:** `/suggest` requiere sesión y `babyUser`; `/petitions`
  requiere sesión y `riffValley`. Preservar el endpoint DELETE de rechazo, las
  notas obligatorias y motivos predefinidos, el `adminNotes` editable, los
  estados/status labels, actualización del contador y datos de catálogo. No
  interpretar aprobación como creación perteneciente a Releases: es un efecto
  de Catalog/backend originado por la operación existente.
- **Criterio de cierre:** alta y seguimiento, moderación y badge pasan por
  Releases/composición, sin HTTP en presentación ni cambio de roles o contrato.

**Estado frontend: COMPLETADA HASTA 7.15 INCLUSIVE; PAUSADA ANTES DE 7.16.**
La pausa prioriza migrar/refactorizar el backend. Los contratos Requests del
frontend describen el comportamiento observado antes de esa migración y son
provisionales; no deben tomarse como contrato definitivo.

#### 7.10 — Caracterizar peticiones y aprobación (S)

- **Objetivo:** registrar recorrido de envío, consulta, revisión y badge.
- **Alcance concreto:** caracterizar campos opcionales, `genreId/countryId`,
  fechas, EP/debut, notas, filtros, edición, aprobación/rechazo/reapertura,
  respuesta tras aprobar y contador.
- **Dependencias:** código actual y router.
- **Criterios de aceptación:** documentar rutas/roles, endpoints, payloads,
  mensajes, estados y qué devuelve cada acción; confirmar rol API con evidencia
  disponible y dejar incertidumbre explícita.
- **Verificaciones específicas:** pruebas de comportamiento con transporte
  simulado; verificar `REJECT_REASONS` y `usePetitionsStore`.

#### 7.11 — Definir contratos de peticiones (XS)

- **Objetivo:** tipar en Releases solicitud, estado y entradas de creación/edición.
- **Alcance concreto:** contratos puros en `modules/releases/requests/domain`.
- **Dependencias:** 7.10.
- **Criterios de aceptación:** los campos nulos/opcionales coinciden con el
  código; no se apropia de tipos de Catalog para género/país más allá de
  identificadores y proyecciones necesarias.
- **Verificaciones específicas:** tests de tipos/reglas puras e imports de
  domain.

#### 7.12 — Definir operaciones de peticiones (S)

- **Objetivo:** exponer las operaciones del solicitante y de moderación.
- **Alcance concreto:** puertos de alta, propias, todas, edición, aprobar,
  rechazar y reabrir; aplicar reglas puras solo si las pruebas evidencian reglas
  de negocio frontend.
- **Dependencias:** 7.11.
- **Criterios de aceptación:** aplicación no contiene UI, Store, HTTP, API de
  navegador ni lógica de Catalog.
- **Verificaciones específicas:** tests de operaciones y errores/resultado.

#### 7.13 — Adaptar endpoints de peticiones (S)

- **Objetivo:** mover el acceso HTTP de `services/requests/requests.ts` a
  infraestructura de Releases.
- **Alcance concreto:** reproducir métodos, rutas, `adminNotes` en cuerpo DELETE,
  payloads opcionales y datos devueltos por `approve`/`reopen`.
- **Dependencias:** 7.12.
- **Criterios de aceptación:** no cambia contrato ni normalización observable;
  los DTOs quedan junto al adaptador.
- **Verificaciones específicas:** tests por endpoint, parámetros y errores.

#### 7.14 — Componer peticiones y catálogo (S)

- **Objetivo:** conectar en `app` Releases con catálogos y resultado Catalog de
  la aprobación.
- **Alcance concreto:** proporcionar opciones de géneros/países y operación
  pública requerida para alta/edición; mantener la aprobación del backend como
  respuesta del puerto de Releases.
- **Dependencias:** 7.13 y API pública actual de Catalog.
- **Criterios de aceptación:** Releases no importa store/adaptador Catalog; no
  duplica entidad Disc ni implementa creación de disco/artista.
- **Verificaciones específicas:** test de composición; guard de imports/ciclos.

#### 7.15 — Migrar alta y seguimiento del usuario (S)

- **Objetivo:** migrar `/suggest` y los estados de solicitudes propias.
- **Alcance concreto:** formulario, carga de géneros/países, envío y listado
  `GET /requests/my` en `SuggestPage.vue`.
- **Dependencias:** 7.10 y 7.14.
- **Criterios de aceptación:** `babyUser`, validaciones, payload opcional,
  estados tras alta y feedback se conservan; vista sin servicio HTTP.
- **Verificaciones específicas:** tests de envío/error/listado y roles; E2E de
  alta con API simulada.

### Checkpoint: frontend pausado antes de 7.16

El trabajo frontend de Releases queda cerrado en 7.A (7.1–7.9) y 7.B hasta
7.15 inclusive. Las subtareas 7.16 y posteriores —incluidas 7.17, 7.C, 7.D e
Iteración 8— quedan **PAUSADAS**.
Primero se migrará/refactorizará el backend. Cuando ese trabajo esté completo,
sus cambios de contratos, endpoints, permisos y comportamiento se integrarán
primero en `main` del frontend. Después se revisarán 7.10–7.15 frente al backend
actualizado, incluidos sus contratos, pruebas y decisiones de compatibilidad.
La migración frontend se retomará entonces desde 7.16.

Hasta completar esa resincronización, los modelos y payloads de Requests
introducidos en 7.11–7.13, así como su composición y migración de alta en
7.14–7.15, son provisionales y no especifican el contrato final del backend.
Conservar [la caracterización de 7.10](docs/releases-requests-7.10.md) como
registro del comportamiento frontend previo y cotejarla con evidencia backend,
sin convertir las observaciones cliente en afirmaciones sobre autorización o
efectos del servidor.

Incertidumbres backend que deben resolverse en la resincronización:

- **Permisos:** el router frontend exige `babyUser` para `/suggest` y
  `riffValley` para `/petitions`. No se inspeccionó implementación backend que
  confirme los roles requeridos por cada endpoint ni su autorización directa.
- **Aprobación y reapertura:** el cliente actual descarta cualquier body de
  approve y actualiza localmente el estado; no hay evidencia cliente de los
  efectos backend (incluidos disco/artista) ni de los datos que approve pueda
  devolver. Reopen conserva `response.data`, pero la forma y los efectos reales
  de esa respuesta no están confirmados con backend.
- **Rechazo:** el cliente usa `DELETE /requests/:id` con `{ adminNotes }` y
  requiere una nota en la UI; no se confirmó en backend la semántica de DELETE,
  la validación de la nota, los efectos ni el permiso del endpoint.
- **Badge:** el sidebar carga `/requests` solo si `user` está presente, mientras
  que `/petitions` requiere `riffValley`. No se confirmó que ambos roles siempre
  coincidan ni si el backend autoriza ese GET para todos los perfiles que ven
  Peticiones. El conteo actual proviene de solicitudes `pending`.

#### 7.16 — Migrar moderación de peticiones (M)

- **Objetivo:** migrar `/petitions` y sus acciones sin alterar su ciclo de vida.
- **Alcance concreto:** filtros, carga, edición de campos, aprobar, notas y
  motivos de rechazo, reapertura, confirmaciones y actualización local.
- **Dependencias:** 7.10 y 7.14.
- **Criterios de aceptación:** `riffValley`, filtros, payload mínimo de edición,
  nota obligatoria, mensajes y actualización del contador se conservan; la vista
  no conoce HTTP ni imports internos de Catalog.
- **Verificaciones específicas:** pruebas de todas las acciones y errores;
  E2E autorizado/no autorizado con backend simulado.

#### 7.17 — Migrar badge y limpiar fachada de peticiones (XS)

- **Objetivo:** cerrar los consumidores restantes de peticiones.
- **Alcance concreto:** conectar SidebarMenu al pending count expuesto por Releases
  y retirar `services/requests/requests.ts`/store legacy cuando no haya imports.
- **Dependencias:** 7.14–7.16.
- **Criterios de aceptación:** rutas, número, actualización tras acciones y
  ubicación visual del badge permanecen; no se modifica el sidebar fuera de su
  integración de datos.
- **Verificaciones específicas:** `rg` de consumidores, prueba del badge y
  `yarn architecture`.

### 7.C — Importación de discos

**Objetivo:** migrar las dos operaciones de importación existentes: procesamiento
manual por fecha y fichero, y carga/descarga Excel. No convertir Catalog ni
Spotify en subcapacidades de Releases.

- **Alcance:** `ImportPage.vue` (`/import`), `ImportDiscs.vue`
  (`/import-discs`), `services/imports/imports.ts`, interacción del flujo manual
  con `services/discs/discs.ts`, Catalog e Integrations.
- **Ownership y dependencias:** Releases posee la orquestación funcional de
  importar. Catalog mantiene géneros/países, `updateDisc` y datos de disco;
  Integrations/Spotify mantiene búsqueda de álbum y autenticación. `app`
  compone la operación de importación con ambos. La importación manual sigue
  backend-driven en `/scraping/process-manual-data`; no recrear scraping en
  cliente.
- **Rutas y riesgos:** `/import` requiere sesión y está bloqueada a `babyUser`
  por el guard actual; revisar `/import-discs` y su menú/rol antes de atribuir un
  permiso. Conservar fecha ISO a etiqueta inglesa (`September 24, 1991`), línea
  del álbum, resultados guardados/existentes, errores parciales, asociación de
  enlace e imagen de Spotify y actualización de cada disco sin abortar el lote.
  Excel conserva descarga blob, nombre generado, carga multipart, validación de
  extensiones en UI y errores por fila.
- **Criterio de cierre:** vistas consumen operación de Releases y APIs públicas
  de Catalog/Integrations; errores parciales y resultados mantienen forma y
  presentación actual.

#### 7.18 — Caracterizar importación manual y Excel (S)

- **Objetivo:** fijar transformaciones y fallos parciales antes de migrar.
- **Alcance concreto:** caracterizar `process-manual-data`, desglose de
  `savedDiscs/existingDiscs`, fecha, matching Spotify, PATCH de discos, fallos
  individuales, plantilla blob, multipart y lista de errores Excel.
- **Dependencias:** 7.C inventario existente; `/import` y `/import-discs`.
- **Criterios de aceptación:** pruebas describen caso vacío, éxito, error HTTP,
  red y parte del lote; permisos confirmados desde router/guard/menu.
- **Verificaciones específicas:** reubicar/caracterizar `importPageAlbumLinks`
  según `tests/unit/releases/imports/`; no hacer llamadas reales a servicios.

#### 7.19 — Definir contratos de importación manual (XS)

- **Objetivo:** expresar los datos observados de la operación manual de Releases.
- **Alcance concreto:** entradas por fecha/línea y resultado de discos guardados,
  existentes y mensaje, sin definir modelos de Catalog.
- **Dependencias:** 7.18.
- **Criterios de aceptación:** los datos de Catalog se representan por IDs y
  proyección mínima ya devuelta; no hay dependencias de framework/HTTP.
- **Verificaciones específicas:** tests de proyección/reglas puras e imports.

#### 7.20 — Definir operación y puerto de importación manual (S)

- **Objetivo:** coordinar procesamiento y complementos posteriores sin acoplar
  el caso de uso a proveedores.
- **Alcance concreto:** puerto para procesamiento manual y dependencias mínimas
  para actualizar discos y resolver enlaces de álbum cuando la pantalla lo
  solicite.
- **Dependencias:** 7.19.
- **Criterios de aceptación:** HTTP/Scraping, DTOs de Catalog y Spotify no entran
  en domain/application; la carga del lote y la búsqueda posterior siguen siendo
  acciones distinguibles.
- **Verificaciones específicas:** tests de coordinación de éxito, ausencia de
  resultados y fallo parcial.

#### 7.21 — Adaptar procesamiento manual (S)

- **Objetivo:** encapsular `POST /scraping/process-manual-data`.
- **Alcance concreto:** enviar fecha y lista de entradas; traducir/proyectar la
  respuesta conforme a la conducta actual del servicio, usando `unknown` y
  narrowing donde la forma sea incierta.
- **Dependencias:** 7.20.
- **Criterios de aceptación:** conserva endpoint, payload y mensaje de error de
  backend/red; no introduce `any` nuevo.
- **Verificaciones específicas:** test de ruta/payload/respuesta y errores de
  servidor, red y respuesta desconocida.

#### 7.22 — Componer Catalog y Spotify para importación (S)

- **Objetivo:** proporcionar a Releases las operaciones externas necesarias.
- **Alcance concreto:** `app` conecta actualización de disco de Catalog y
  `createImportAlbumResolver` de Integrations/Spotify; la vista consume contrato
  Releases.
- **Dependencias:** 7.20–7.21; resolver Spotify ya compuesto en
  `app/dependencies/importAlbumLinks.ts`.
- **Criterios de aceptación:** Releases no importa helper de Spotify ni servicio
  de discos; la autenticación, el resultado `failed` y la respuesta de proveedor
  siguen propiedad de Integrations.
- **Verificaciones específicas:** test de composition que simula Spotify y
  actualización Catalog; revisar imports entre módulos.

#### 7.23 — Migrar procesamiento manual y resultados (S)

- **Objetivo:** migrar la primera mitad de `ImportPage.vue` al módulo.
- **Alcance concreto:** selección de fecha/álbumes, consulta, estado de carga,
  respuesta, mensajes y desglose de discos importados/no importados.
- **Dependencias:** 7.18 y 7.22.
- **Criterios de aceptación:** mismos nombres de ruta/guard, formato de fecha,
  payload y resultados; presentación no llama HTTP ni servicio legacy.
- **Verificaciones específicas:** pruebas de vista/operación con resultados
  vacíos, parciales y fallidos.

#### 7.24 — Migrar matching Spotify y actualización Catalog (S)

- **Objetivo:** conservar la acción posterior que completa enlaces/imágenes.
- **Alcance concreto:** extraer resolución del álbum a operación de Integrations
  y actualizar cada disco mediante el puerto de Catalog.
- **Dependencias:** 7.22–7.23.
- **Criterios de aceptación:** un error/not-found por álbum no detiene otros;
  `listenUrl`, `coverUrl`, `verified` y notificación agregada se mantienen; UI
  no importa cliente compartido.
- **Verificaciones específicas:** adaptar `importPageAlbumLinks.spec.ts` y
  cubrir fallos mixtos, orden de llamadas y resumen.

#### 7.25 — Adaptar carga y descarga Excel (S)

- **Objetivo:** mover transporte de plantilla y carga en lote detrás de
  infraestructura de Releases.
- **Alcance concreto:** `GET /excel/template/download` como blob y
  `POST /excel/template/upload` multipart, incluyendo retorno `created/errors`.
- **Dependencias:** caracterización 7.18 y cliente compartido.
- **Criterios de aceptación:** headers, respuesta, errores y tipo de fichero no
  cambian; FormData y cliente viven fuera de presentation.
- **Verificaciones específicas:** tests de `responseType`, multipart, datos por
  fila, error backend y error de red.

#### 7.26 — Migrar pantalla Excel y cerrar compatibilidad de imports (S)

- **Objetivo:** completar `/import-discs` y retirar el servicio de importación
  sin consumidores.
- **Alcance concreto:** descarga/nombre de archivo, selección/extensión, carga,
  estados/mensajes, errores por fila; eliminar `services/imports/imports.ts`
  cuando los dos consumidores ya usen Releases.
- **Dependencias:** 7.25 y 7.23–7.24 para el cierre del servicio común.
- **Criterios de aceptación:** se mantienen ruta y permisos comprobados,
  validación, fecha del nombre, mensaje, tabla de errores y reset de input; no hay
  imports legacy desde presentation.
- **Verificaciones específicas:** pruebas de vista y búsqueda global de los
  exports legacy; E2E de descarga/subida simuladas si se soportan en Playwright.

### 7.D — Lanzamientos nacionales

**Objetivo:** migrar el formulario anónimo, la gestión autenticada y la
integración desde calendarios de Catalog de lanzamientos nacionales.

- **Alcance:** `NationalReleaseForm.vue` (`/national-releases/form`),
  `NationalReleasesAdmin.vue` (`/national-releases`), `LinkDiscModal.vue`,
  `CreateDiscForm.vue`, `SuggestedDiscCard.vue` y la acción de calendario en
  `DiscComponent.vue`.
- **Ownership y dependencias:** Releases posee los lanzamientos y sus estados de
  aprobación/enlace. Catalog posee discos, artistas y género; la creación de
  disco/artista y opciones de género se consume desde su API pública. Editorial
  no posee lanzamientos nacionales: su calendario y contenidos permanecen en
  `modules/editorial`; `app` compone si alguna pantalla los necesitara juntos.
- **Rutas y riesgos:** el formulario `/national-releases/form` no requiere
  sesión; `/national-releases` requiere sesión y `riffValley`. Endpoints
  observados: `POST /national-releases` (cliente público y payload objeto o
  array), `POST /bulk`, `GET /all` con filtros, `GET /:id` público,
  `PATCH /:id`, `DELETE /:id`, `PATCH /:id/link-disc` y
  `POST /from-disc`. Mantener fechas/días, publicación opcional, tipos,
  aprobación, sugerencia enlazada, filtros mensuales, entrada bulk y el flujo de
  creación/linkado Catalog. Investigar los accesos `publicApi` y GET `/:id` antes
  de retirarlos; no asumir que el backend acepta sesión ni que el endpoint no se
  usa fuera del árbol rastreado.
- **Criterio de cierre:** tres entradas (anónima, administración y calendario)
  consumen APIs públicas/composición, con permiso y comportamiento intactos;
  Releases no importa servicios ni DTOs de Catalog.

#### 7.27 — Caracterizar lanzamientos nacionales (S)

- **Objetivo:** cubrir ciclos público, administrativo y desde calendario.
- **Alcance concreto:** formulario simple/bulk, filtros y meses pendientes,
  edición/aprobación/borrado, enlace de disco sugerido/existente/nuevo y
  creación desde calendario.
- **Dependencias:** rutas, servicios y vistas actuales.
- **Criterios de aceptación:** contratos, formas de respuesta y payloads anotados;
  se identifican consumidores de `getNationalRelease` y las diferencias de
  transporte autenticado/público.
- **Verificaciones específicas:** pruebas con transporte y permisos simulados;
  búsqueda de endpoints y uso global de cada operación.

#### 7.28 — Definir contratos y operaciones de Releases nacionales (S)

- **Objetivo:** crear contratos propios del ciclo nacional y sus puertos.
- **Alcance concreto:** tipo DiscType, release, entradas bulk, filtros y
  operaciones CRUD/enlace/creación desde un disco en
  `modules/releases/national-releases`.
- **Dependencias:** 7.27.
- **Criterios de aceptación:** types de Catalog se reducen a IDs/proyecciones;
  domain/application no importan framework, transporte ni Catalog; comportamiento
  de aprobación separado del contenido de disco.
- **Verificaciones específicas:** tests de tipos/reglas si aplican y guard de
  imports.

#### 7.29 — Adaptar API protegida y consultas (S)

- **Objetivo:** migrar endpoints autenticados de administración.
- **Alcance concreto:** `GET /national-releases/all`, `POST /bulk`,
  `POST /from-disc`, `PATCH`, `DELETE` y `PATCH /:id/link-disc` en adaptador
  de infraestructura.
- **Dependencias:** 7.28 y cliente HTTP compartido.
- **Criterios de aceptación:** querys de mes/año/aprobación y respuestas
  `data/pendingMonths`, métodos, DTOs y payloads equivalentes.
- **Verificaciones específicas:** tests endpoint/query/payload y fallos.

#### 7.30 — Adaptar la entrada pública anónima (S)

- **Objetivo:** mantener la creación de lanzamientos disponible sin sesión.
- **Alcance concreto:** adaptador del `POST /national-releases` público para
  objeto y array; aislar la configuración del cliente público en infraestructura
  sin importar Axios en presentation.
- **Dependencias:** 7.27–7.28; decisión de transporte documentada.
- **Criterios de aceptación:** `/national-releases/form` sigue siendo anónimo;
  no se añade guard ni se filtra la petición a través de un cliente que exija
  token; no se cambia URL base, encabezado o payload.
- **Verificaciones específicas:** test que confirma petición sin sesión, objeto
  y array, errores y ausencia de dependencia HTTP desde presentación.

#### 7.31 — Componer Releases nacionales con Catalog (S)

- **Objetivo:** conectar adaptadores con las operaciones públicas de Catalog.
- **Alcance concreto:** opciones de género y operaciones para buscar/proyectar o
  crear/enlazar discos y artistas, según capacidades Catalog ya disponibles;
  mantener el endpoint `link-disc` en Releases.
- **Dependencias:** 7.29–7.30 y API pública Catalog.
- **Criterios de aceptación:** no se duplica creación de disco/artista en
  Releases; diferencias entre link por ID y creación de disco se declaran en
  `app`.
- **Verificaciones específicas:** pruebas de composición para link sugerido,
  ID existente y datos de nuevo disco; guard de imports.

#### 7.32 — Migrar formulario público (S)

- **Objetivo:** migrar el formulario que recibe propuestas sin sesión.
- **Alcance concreto:** `NationalReleaseForm.vue`, campos, validación y envío
  simple/bulk si el formulario soporta ambos modos.
- **Dependencias:** 7.27 y 7.30.
- **Criterios de aceptación:** nombre/path, lazy loading, acceso anónimo,
  payload, mensajes y manejo de éxito/error se conservan; sin servicio legacy.
- **Verificaciones específicas:** tests de envío, datos inválidos, array/objeto;
  E2E de formulario anónimo con API simulada.

#### 7.33 — Migrar lectura y filtros de administración (S)

- **Objetivo:** migrar carga/listado mensual y consulta de pendientes.
- **Alcance concreto:** `NationalReleasesAdmin.vue`, filtros, agrupación por día,
  meses pendientes, estados loading/error/vacío y paginado si existe.
- **Dependencias:** 7.27, 7.29 y 7.31.
- **Criterios de aceptación:** `riffValley`, filtros y fechas local/servidor
  mantienen su semántica y las tarjetas conservan su presentación.
- **Verificaciones específicas:** tests de filtros, agrupación, respuesta vacía,
  error y consulta de pendientes; E2E con rol.

#### 7.34 — Migrar mantenimiento de lanzamientos (S)

- **Objetivo:** mover cambios administrativos del lanzamiento y bulk.
- **Alcance concreto:** alta masiva, edición, aprobación y eliminación; tipar el
  parseo bulk actualmente coercionado, sin incorporar nuevo `any`.
- **Dependencias:** 7.29 y 7.33.
- **Criterios de aceptación:** selección de campos, reglas de entrada, feedback,
  actualización local y confirmación de borrado coinciden con el recorrido actual.
- **Verificaciones específicas:** tests de parseo/validación, payload mínimo,
  rollback/error y autorización.

#### 7.35 — Migrar vínculo y alta del disco asociado (M)

- **Objetivo:** aislar el flujo de vincular un lanzamiento con un disco de Catalog.
- **Alcance concreto:** `LinkDiscModal.vue`, `SuggestedDiscCard.vue` y
  `CreateDiscForm.vue`; link de sugerencia, selección existente y creación de
  disco/artista con atributos de lanzamiento.
- **Dependencias:** 7.31 y 7.33.
- **Criterios de aceptación:** `PATCH /:id/link-disc`, IDs, artista, género,
  fecha, EP/debut, enlace e imagen conservan su significado; Catalog ejecuta la
  creación y Releases actualiza el vínculo; no se importan DTOs/services de
  Catalog desde módulos hermanos.
- **Verificaciones específicas:** tests de cada rama, errores de Catalog y
  respuesta `NationalRelease` actualizada.

#### 7.36 — Componer la acción desde calendario Catalog (S)

- **Objetivo:** retirar del componente de calendario el import directo del
  servicio nacional.
- **Alcance concreto:** `DiscComponent.vue` usa contrato/callback proporcionado
  por `app` para `POST /national-releases/from-disc`; Catalog conserva la
  presentación del calendario y Releases la operación.
- **Dependencias:** 7.28–7.29; localizar composición de la vista estándar y
  calendario baby antes de editar consumidores.
- **Criterios de aceptación:** la acción, mensajes, permisos y disco de entrada
  permanecen; Catalog no importa internals ni servicio de Releases.
- **Verificaciones específicas:** test de composición y consumidor, búsqueda de
  import de `nationalReleases` fuera de Releases/app.

#### 7.37 — Cerrar compatibilidad de lanzamientos nacionales (XS)

- **Objetivo:** retirar el servicio legacy y cualquier DTO huérfano solo cuando
  todos los consumidores hayan migrado.
- **Alcance concreto:** eliminar/reducir `services/national-releases` y ordenar
  tests bajo `tests/unit/releases/national-releases/`.
- **Dependencias:** 7.32–7.36 y resultado de búsqueda del uso global de GET
  `/:id`.
- **Criterios de aceptación:** formularios, administración, modal y calendarios
  no importan el servicio legacy; GET público se migra o queda anotado con
  consumidor y propietario identificados.
- **Verificaciones específicas:** `rg` de endpoints/servicios, arquitectura,
  tests del bloque y E2E público/protegido.

### Cierre de Iteración 7

**Deuda reservada para Iteración 9:** no se planifica conservar deuda de
Releases por defecto. Si la búsqueda global descubre consumidores que impidan
retirar alguno de `services/suggestions/suggestions.ts`,
`services/requests/requests.ts`, `services/imports/imports.ts` o
`services/national-releases/nationalReleases.ts`, el bloque correspondiente
debe anotar el símbolo y consumidor exactos, mantener una fachada mínima y
reservar únicamente esa eliminación para Iteración 9. Lo mismo aplica a
`stores/petitions/petitions.ts` si quedan consumidores tras trasladar su estado.
La clave `rv_support_read_ids` se conserva donde resida la coordinación de
lectura; no se reserva borrar datos persistidos. No trasladar a esta deuda
`services/versions`, servicios de Catalog ni el store general de soporte: sus
consumidores pertenecen a Product Ops, Catalog o soporte y se resuelven en sus
iteraciones. Si el `GET /national-releases/:id` no tiene consumidores, se elimina
en 7.37; si se descubre uno, se registra con propietario y consumidor para la
Iteración 9.

La iteración se considera cerrada cuando:

- sugerencias/bugs, peticiones, importación y lanzamientos nacionales consumen
  APIs de Releases y `app` compone las dependencias externas;
- presentation no accede a HTTP legacy en los recorridos migrados, y ninguna
  capacidad absorbe ownership de Catalog, Integrations, Product Ops o Editorial;
- se preservan rutas, permisos, comportamiento de acceso anónimo, contratos y
  errores caracterizados, con deuda y ambigüedad backend documentadas;
- los servicios legacy solo permanecen si su consumidor restante está
  identificado, protegido por compatibilidad y reservado explícitamente a
  Iteración 9;
- `yarn verify`, pruebas específicas y `git diff --check` pasan. Los hallazgos
  Impeccable preexistentes/desconocidos/fuera de alcance se reportan; solo se
  corrigen los demostrablemente introducidos por el cambio.

## Iteración 8 — Workspace, Product Ops y Analytics

1. Consolidar dashboard, home y preferencias con una fuente de verdad para
   configuración de escritorio/móvil y comportamiento de cada módulo. Validar
   la frontera provisional de `workspace`; puede resolverse como app shell
   más preferencias sin necesitar dominio independiente.
2. Migrar versiones, noticias, soporte y patch notes por operación.
3. Migrar Analytics desde el estado actual de estadísticas, preservando su
   comportamiento y contratos:
   - `GET /rates/stats` incluye actividad diaria, disco destacado, discos
     polémicos, comparación interanual y el disco destacado por género y mes.
   - `GET /rates/stats/discs?year=...` carga de forma diferida los discos
     votados que utiliza la galaxia de géneros.
   - `Statistics.vue` muestra el calendario de actividad, discos destacados y
     polémicos, y la galaxia interactiva de géneros en escritorio y móvil.
   - La traducción de nombres de mes del inglés al español forma parte del
     comportamiento actual; decidir su ownership al migrarla.
   - Analytics sigue consumiendo `services/rates/rates.ts` y presentación
     legacy hasta esta iteración.
   - Añadir cobertura focalizada para las nuevas visualizaciones y flujos;
     todavía no hay tests específicos suficientes.
   - Mantener la carga diferida de la galaxia, las agregaciones actuales y el
     comportamiento móvil/escritorio. Extraer carga y transformación de
     estadísticas con datos tipados para los gráficos.
4. Revisar administración de usuarios y pantallas restantes de identidad.

**Salida:** se reducen dependencias transversales y ninguna preferencia queda
almacenada simultáneamente en dos stores propietarios.

## Iteración 9 — Consolidación y retirada de compatibilidad

**Input explícito de Iteración 6:** tratar OAuth y las operaciones Spotify
legacy que quedaron fuera de alcance, junto con el mantenimiento autorizado del
baseline TypeScript con excepciones resueltas.

1. Eliminar fachadas, aliases antiguos y carpetas legacy cuando no tengan
   consumidores; retirar también los helpers o servicios legacy de Analytics
   que queden tras la Iteración 8 y actualizar README y guía de arquitectura
   del repositorio.
2. Consolidar UI, estilos y utilidades compartidas demostradas, manteniendo
   apariencia, tema, navegación por teclado y comportamiento responsive.
3. Eliminar progresivamente las excepciones legacy de `yarn architecture` hasta
   aplicar las reglas globalmente. Comprobar ciclos y que los exports públicos
   sean pequeños; mantener `yarn verify` como puerta conjunta sin duplicar trabajo.
4. Medir bundle y recorridos afectados frente a la referencia inicial;
   optimizar solo problemas observados. Conservar imports dinámicos.

**Salida:** funcionalidades agrupadas por responsabilidad, sin imports legacy
ni HTTP en presentación, y puertas de calidad verdes.

## Checklist por PR

- [ ] Un recorrido definido, con consumidores y límites identificados.
- [ ] Comportamiento previo caracterizado antes de cambiar lógica relevante.
- [ ] URLs, nombres de rutas, query params, API, permisos, claves de storage
      y carga diferida compatibles; sin rediseño accidental.
- [ ] Props, eventos, DTOs y resultados tipados; sin nuevos `any`.
- [ ] Sin ciclos ni imports de internals entre módulos; sin HTTP, clientes
      legacy ni SDKs externos en la presentación migrada.
- [ ] Estado y cache con propietario e invalidación explícitos.
- [ ] Errores, carga, vacío y efectos asíncronos comprobados donde corresponda.
- [ ] `yarn verify` pasa tras la fase 0: `yarn lint`, `yarn architecture`,
      `yarn typecheck`, `yarn test` y `yarn build`, con excepciones legacy
      explícitas y acotadas.
- [ ] Pruebas del comportamiento alterado; E2E críticos cuando toque rutas o sesión.
- [ ] Verificación visual de escritorio/móvil si se modifican componentes.
- [ ] Sin carpetas vacías ni abstracciones compartidas especulativas.
- [ ] Estado del roadmap actualizado con PR y evidencia de aceptación.

## Cuándo reducir el corte

- Hace falta migrar varios recorridos independientes para compilar.
- Un módulo nuevo importa componentes o stores internos de otro.
- Un composable pasa a concentrar toda la lógica que antes tenía la vista.
- La reorganización exige cambiar endpoints, URLs o datos persistidos.
- El comportamiento del flujo solo se puede probar contra producción.
- Una abstracción compartida necesita excepciones para cada consumidor.

En estos casos, mantener una fachada temporal y replantear el corte. Los
cambios de producto y las dependencias de backend se registran por separado.

## Primeras PRs propuestas

1. Tooling, baseline y reglas arquitectónicas sobre Yarn 4 (iteración 0).
2. Piloto de catálogo con genres + countries y un consumidor.
3. Caracterización y desacoplamiento del cliente HTTP, sesión y router.
4. Reorganización mínima del bootstrap y separación de preferencias.
5. Primer corte grande de catálogo: listado y filtros.

Reevaluar el resto del orden con la experiencia del piloto antes de iniciar
una migración extensa.
