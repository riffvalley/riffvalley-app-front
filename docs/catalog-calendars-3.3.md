# Subiteración 3.3 — Calendarios de discos

## Caracterización previa

Se inspeccionaron las dos vistas, sus tarjetas, DiscFilters, los consumidores
embebidos, el catálogo del shell y los guards antes de cambiar la implementación.
Tres E2E pasaron sobre las vistas originales; siete pruebas de componentes
caracterizaron también sus contratos legacy antes de sustituirlas por fachadas.

| Comportamiento | Estándar | babyUser |
| --- | --- | --- |
| Carga | `/discs/date`, páginas de 200, mes completo | Igual |
| Rango | Inicio UTC, fin local, inclusivo hasta .999 | Igual |
| Agrupación | Clave `releaseDate` exacta, orden API, conserva duplicados | Igual |
| Texto | NFD, sin tildes, espacios normalizados y trim | Solo lowercase, sin trim ni normalización |
| Género | Compara identificadores convertidos a string | Comparación estricta `===` |
| País | Visible; envía `country` y `countryId` al servidor | Oculto; nunca se envía |
| Año | Al cambiar, selecciona enero | Igual |
| Opciones | Sanea nombres de género y espera `catalog.loaded` para tarjetas | Opciones originales, sin espera |
| `genreId` | Se prepara también en la primera página | Primera página intacta; se prepara al añadir páginas |
| Grupos | `v-show`, lista, estado `closing` durante la transición | `v-if`, grid responsive, tarjetas remontadas al abrir |
| Herramientas | HTML, Spotify para fecha pasada, Last.fm para superUser | Sin herramientas de grupo |
| Tarjeta | Controles de edición, destacados, pendientes y lanzamientos nacionales | Lectura y pendientes |
| Modal embebido | `embedded`, `initialDate`, `focusDiscId`, día local y scroll tras 380 ms | Sin modalidad embebida |
| Ruta | `/calendar`, `Calendar`, rol user | `/calendar-baby`, `CalendarBaby`, rol babyUser |

La fecha visible sigue siendo `es-ES` en la zona del navegador. No se homogeneiza
el rango mensual a UTC: hacerlo cambiaría los límites. No se añaden query params,
cache de discos ni claves de almacenamiento. Se conserva el scroll al primer
ancestro desplazable y la carga diferida de las rutas.

Los guards y el requisito superUser de Last.fm pertenecen a autorización de la
UI, sin sustituir al backend. Las diferencias de controles, disposición,
transiciones, espera del catálogo y foco son presentación. Las diferencias de
búsqueda son políticas explícitas; no se esconden tras un flag de un calendario
genérico. Las funciones Spotify/export del baby eran código muerto sin botones;
sus handlers de eliminación/fecha tampoco estaban definidos ni eran emitidos
por su tarjeta. Se eliminan esos enlaces muertos y `menuVisible`, que siempre
estaba indefinido, sin añadir capacidades a babyUser.

## Arquitectura implementada

- **Dominio Catalog:** proyección tipada del disco/grupo, rango mensual, unión de
  grupos, eliminación por recorrido inverso de grupos y filtros separados.
- **Aplicación Catalog:** paginador con invalidación por generación, carga de
  todas las páginas, preparación de datos y puertos; exportación HTML pura y
  actualización de enlace/imagen. No depende de Vue ni del navegador.
- **Infrastructure:** GET `/discs/date`, PATCH del álbum y sus contratos HTTP.
  Los modelos coinciden con la respuesta; no se crea un mapper duplicado.
- **Presentación Catalog:** dos vistas independientes y slots tipados para las
  tarjetas/herramientas. Un composable pequeño proyecta la carga a Vue; otro
  posee únicamente observers y scroll. El foco embebido permanece en la vista
  estándar, porque necesita DOM/transición y no existe en baby.
- **App:** dos páginas componen vistas, catálogo del shell, roles y tarjetas
  legacy. Las dependencias conectan Catalog con las capacidades acotadas de
  búsqueda Spotify y fill-images Last.fm, cuyos HTTP/DTOs están en adaptadores
  de Integrations. Catalog no importa esos proveedores.

No se crea una vista universal ni un store de calendario. El estado es local al
montaje, sin cache nueva. El catálogo de opciones conserva su propietario y
cache legacy del shell. Las tarjetas mutan el mismo disco que posee el
paginador; no se introduce una copia divergente.

Las fachadas anteriores conservan imports, props y el evento `close` sin payload
(el calendario original tampoco lo emitía por sí mismo). Las tarjetas conservan
sus operaciones y controles; solo se actualiza su contrato tipado. Su edición
de artistas y acciones de Community/Releases siguen en legacy, compuestas por
app, para evitar mover esas capacidades a Catalog o iniciar 3.4.

El toast de error se extrae a shared/ui porque ya es transversal y estable.
SwalService delega en él, conservando exactamente estilos, tema y duración.

## Correcciones acotadas y pruebas

El drenaje de páginas termina ante un fallo, conserva datos parciales y muestra
el mismo toast una vez. Seleccionar el mes permite reintentar. Todas las
respuestas y finalizaciones se comprueban contra su generación, incluyendo
peticiones del observer; una respuesta antigua no cambia datos ni loading de
la selección actual. El observer no compite con el drenaje y ambos observers
se desconectan al desmontar. También se invalida el scroll diferido del foco.

Se añadieron 30 tests unitarios/de componentes en dos suites:

- 7 de caracterización y 5 de regresión de presentación: filtros divergentes,
  carga, permisos de herramientas, año/país, props del modal, foco en una página
  posterior, eliminación/fecha, toast, reintento y limpieza de observers.
- 18 de reglas, aplicación, adaptadores y composición: cuatro casos de zonas
  horarias/DST, orden y duplicados, paginación, carga vacía, carreras en primeras
  y siguientes páginas, desmontaje, fallo parcial, reintento, eliminación,
  exportación HTML, parámetros HTTP, token único, payload PATCH, estados de error
  de Spotify y cálculo local de semana Last.fm.

Los 3 E2E nuevos verifican rangos en Europe/Madrid, paginación, búsqueda,
controles, navegación mensual y acceso por rol. Se ejecutaron además los 2 E2E
existentes de apertura/cierre/reapertura del detalle desde ambos calendarios.

## Validación y deuda

`yarn verify` pasa: lint, arquitectura (53 archivos), typecheck configurado,
89 tests en 13 suites y build. Los 5 E2E relevantes pasan en Chromium.
`git diff --check` pasa; también se comprobaron los archivos nuevos sin stage.
Persisten los avisos previos de Browserslist, `.flex-[2]` y chunk mayor de 500 kB.

Se detectó que `yarn typecheck` usa un tsconfig raíz con `files: []` y referencias
sin modo build; no comprueba las fuentes de la app. Como comprobación adicional
se ejecutó `yarn vue-tsc --noEmit -p tsconfig.app.json` sobre el estado inicial de
HEAD, extraído a /tmp, y sobre el resultado. Falla en ambos por deuda legacy
(149 diagnósticos iniciales, 119 finales); normalizando rutas y posiciones no
hay diagnósticos nuevos ni errores en los archivos nuevos. Corregir el script
y la deuda global requiere otro corte y no se oculta cambiando las puertas.

Quedan las tarjetas mixtas legacy, los controles/filtros compartidos legacy y
la cache de opciones del shell. Spotify sigue obteniendo un token mediante el
helper legacy y sus credenciales del navegador; esta extracción no las oculta.
HTML mantiene su interpolación original sin introducir cambios de producto.
No se migran artistas ni se inicia 3.4.

## Archivos modificados o añadidos

- `docs/architecture-baseline.md`
- `docs/catalog-calendars-3.3.md`
- `src/app/components/BabyDiscCalendarPage.vue`
- `src/app/components/DiscCalendarPage.vue`
- `src/app/dependencies/discCalendar.ts`
- `src/integrations/lastfm/application/calendarImages.ts`
- `src/integrations/lastfm/infrastructure/calendarImagesApi.ts`
- `src/integrations/spotify/application/albumLinks.ts`
- `src/integrations/spotify/infrastructure/albumLinksApi.ts`
- `src/modules/catalog/application/calendarTools.ts`
- `src/modules/catalog/application/discCalendar.ts`
- `src/modules/catalog/domain/discCalendar.ts`
- `src/modules/catalog/index.ts`
- `src/modules/catalog/infrastructure/calendarToolsApi.ts`
- `src/modules/catalog/infrastructure/discCalendarApi.ts`
- `src/modules/catalog/discs/calendars/presentation/views/BabyDiscCalendarView.vue`
- `src/modules/catalog/discs/calendars/presentation/views/DiscCalendarView.vue`
- `src/modules/catalog/discs/calendars/presentation/helpers/calendarDate.ts`
- `src/modules/catalog/discs/calendars/presentation/composables/useCalendarPages.ts`
- `src/modules/catalog/discs/calendars/presentation/composables/useCalendarScroll.ts`
- `src/services/swal/SwalService.ts`
- `src/shared/ui/errorToast.ts`
- `src/views/discsCalendar/DiscCalendar.vue`
- `src/views/discsCalendar/components/DiscComponent.vue`
- `src/views/discsCalendarBaby/DiscCalendarBaby.vue`
- `src/views/discsCalendarBaby/components/DiscComponentBaby.vue`
- `tests/e2e/discCalendars.spec.ts`
- `tests/unit/catalogDiscCalendar.spec.ts`
- `tests/unit/discCalendars.spec.ts`
