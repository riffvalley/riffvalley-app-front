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

1. Extraer primero una capacidad de Spotify usada por un detalle o formulario.
   Reutilizar helpers existentes donde tenga sentido y centralizar DTOs,
   errores y autenticación del proveedor en su adaptador.
2. Sustituir llamadas directas a medida que se migren sus consumidores.
   Repetir después con Last.fm y LanguageTool.
3. El módulo consumidor define el contrato que necesita. Ninguna pieza de
   presentación conoce tokens ni payloads específicos del proveedor.
4. Inventariar variables `VITE_*` y uso de credenciales. Si una capacidad
   requiere un secreto confidencial, documentar su dependencia de un endpoint
   backend y dejar ese corte pendiente hasta disponer de él. Mover código
   dentro del frontend no vuelve secreto un valor enviado al navegador.

**Salida:** capacidad piloto probada con respuestas simuladas, comportamiento
conservado y peticiones fuera de toda la presentación migrada.

## Iteración 6 — Editorial

Migrar un recorrido por PR, con orden sugerido:

1. Edición de una asignación y su texto.
2. Consulta/edición de una lista y reuniones.
3. Un cambio de estado en artículos o vídeos y después sus Kanban.
4. Una operación del calendario editorial.
5. Gestión de playlists por operación.

Separar formularios, tableros y modales por responsabilidad. Extraer reglas
de transición y validación a funciones comprobables sin Vue cuando sean propias
del frontend. Conservar las restricciones devueltas por la API y caracterizar
fechas y zonas horarias en calendarios. No crear un motor Kanban o formularios
genérico antes de demostrar necesidades compartidas.

**Salida:** los flujos migrados dejan de depender de servicios y stores legacy
mediante imports directos, conservando permisos, estados y comportamiento.

## Iteración 7 — Releases

Migrar un recorrido por PR, con orden sugerido:

1. Sugerencias y sus formularios públicos relacionados.
2. Peticiones y sus formularios públicos relacionados.
3. Importación por operación.
4. Lanzamientos nacionales y formularios públicos relacionados.

Separar coordinación de formularios, validación y adaptadores, conservando
contratos, permisos y comportamiento ante errores. Una vista que mezcle datos
de Releases y Editorial se compone mediante sus APIs públicas; no justifica
unir ambos bounded contexts.

**Salida:** recorridos tipados y desacoplados de servicios HTTP legacy en
presentación; los formularios públicos mantienen acceso sin sesión.

## Iteración 8 — Workspace, Product Ops y Analytics

1. Consolidar dashboard, home y preferencias con una fuente de verdad para
   configuración de escritorio/móvil y comportamiento de cada módulo. Validar
   la frontera provisional de `workspace`; puede resolverse como app shell
   más preferencias sin necesitar dominio independiente.
2. Migrar versiones, noticias, soporte y patch notes por operación.
3. Extraer carga y transformación de estadísticas; los gráficos reciben datos
   tipados y se ocupan de renderizarlos.
4. Revisar administración de usuarios y pantallas restantes de identidad.

**Salida:** se reducen dependencias transversales y ninguna preferencia queda
almacenada simultáneamente en dos stores propietarios.

## Iteración 9 — Consolidación y retirada de compatibilidad

1. Eliminar fachadas, aliases antiguos y carpetas legacy cuando no tengan
   consumidores; actualizar README y guía de arquitectura del repositorio.
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
