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
tener `presentation` (vistas, componentes, composables y stores),
`application` (operaciones y puertos), `domain` (tipos y reglas propias) e
`infrastructure` (adaptadores de API y persistencia). Una funcionalidad sencilla
no necesita clases, entidades ricas ni un caso de uso ceremonial por cada GET.
La complejidad debe responder a una necesidad real, sin abstracciones por
anticipado ni tipos idénticos duplicados sin motivo.

Los composables de negocio pertenecen a la presentación del módulo propietario:
`modules/catalog/presentation/composables/`,
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

## Iteración 4 — Acciones de comunidad

Migrar primero valoraciones; después comentarios, favoritos y pendientes,
cada uno con sus contratos, operación y coordinación de UI.

- Definir la fuente de verdad de cada dato y qué cache se actualiza tras una
  mutación; evitar copias divergentes entre tarjetas, detalle y calendario.
- Conservar validaciones, permisos y comportamiento ante errores. Probar
  dobles envíos y rollback si ya existen actualizaciones optimistas.
- Extraer UI común solo después de comprobar su uso en varios flujos.

**Salida:** las acciones tienen contratos tipados y actualizan coherentemente
sus consumidores sin introducir lógica de negocio en las tarjetas.

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
