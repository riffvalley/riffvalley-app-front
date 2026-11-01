# Radar y Mejores del Mes — RM-1–RM-5

Iniciativa acotada a los listados `/discos/radar` y `/discos/mejores` y, en fases posteriores, sus vistas individuales. Lists es una dependencia del dominio Editorial; este trabajo no rediseña Lists en general. Las vistas de detalle no se modifican en RM-1.

## Dependencias y ownership observados

- **Frontend:** ambas rutas están declaradas en `src/router/index.ts`; requieren sesión y rol `riffvalley`. Desde RM-2, listados y, tras RM-3, detalle Radar pertenecen a `src/modules/editorial/radar-best-lists/`. RM-4 traslada también el detalle mensual a ese módulo, con componentes y lógica propios de Mejores.
- **Backend:** `ListsController` declara las rutas de lectura de calendario; `ListsService` delega las consultas a `ListCalendarService`, que consulta `Repository<List>`. Lists filtra por tipo y fechas, sin consultar Contents para obtener los listados.
- Cada `List` tiene asignaciones eager. Cada asignación carga eager sus relaciones con User y Disc. Contents sincroniza sus fechas con Lists en operaciones de escritura, pero no forma parte de estas respuestas de calendario.
- Los handlers backend de lectura de calendario no declaran `@Auth()` ni requisito de rol; el guard de frontend no protege el endpoint. Se registra como comportamiento existente, sin cambios de permisos en RM-1.
- No hay paginación ni ordenación interactiva en estas pantallas. La ordenación actual viene del backend por `listDate` ascendente para actuales y descendente para pasadas. No se altera ningún permiso.

## RM-1 — Auditoría y reparación del error 400

**Estado:** completada. La auditoría del contrato y las guardas de parámetros se conservan; el 400 informado no se reprodujo con la inicialización de entonces y el valor exacto de la petición desplegada no quedó disponible.

### `/discos/radar`

- Carga en `onMounted`: `GET /api/lists/weekly/current` y `GET /api/lists/weekly/past/:year/:month`.
- La segunda llamada usa `selectedYear = new Date().getFullYear()` y `selectedMonth = new Date().getMonth() + 1`. Los selects enlazan opciones numéricas; cambiar cualquiera vuelve a cargar el histórico. Se conserva la selección solo mientras la vista sigue montada; no hay persistencia en URL ni almacenamiento.
- El backend devuelve listas `WEEK` actuales ordenadas por `listDate ASC` y pasadas ordenadas `DESC`, con un filtro por cutoff de cierre. La vista divide la respuesta actual entre “Actuales” y “Futuras” usando la fecha de lista y un horizonte local de dos semanas. No hay paginación ni filtro de estado adicional.
- Las tarjetas navegan a `/discos/radar/:id`. El detalle no se modificó.

### `/discos/mejores`

- Carga en `onMounted`: `GET /api/lists/month/current` y `GET /api/lists/month/past/:year`.
- Inicializa el año actual numérico; solo hay filtro de año para el histórico. El mes no es un parámetro de esta vista ni de su endpoint. Cambiar el año vuelve a cargar el histórico; no hay persistencia fuera del montaje.
- El backend devuelve listas `MONTH` actuales/pasadas ordenadas por `listDate ASC`/`DESC`. El histórico del año se recorta según la regla del backend: hasta el día 12 del mes en curso, la lista del mes anterior aún cuenta como actual. No se agregan filtros frontend ni paginación.
- La presentación difiere intencionadamente de Radar: histórico compacto y actuales en tarjetas destacadas; ambos usan un acordeón excluyente. Las tarjetas navegan a `/discos/mejores/:id`. El detalle no se modificó.

### Causa HTTP y contrato

Los seis mensajes proporcionados corresponden a `ListYearMonthParamsDto`, aplicado a `GET /api/lists/weekly/past/:year/:month`. Ese endpoint pertenece al listado histórico de Radar. El DTO acepta solo segmentos decimales enteros: `year` entre 100 y 275759 y `month` entre 1 y 12; valores ausentes o no numéricos se convierten en `NaN` y producen simultáneamente las validaciones de entero y rango. No es la respuesta de los endpoints actuales ni del histórico mensual, cuyo DTO solo valida `year`.

Con la fecha actual del checkout (2026-11-01), la inicialización inspeccionada construye `year=2026` y `month=11`, que cumplen el DTO. El histórico mensual construye `year=2026`, también válido. La respuesta 400 no permite reconstruir los segmentos originales porque el transformador reduce entradas no válidas a `NaN`; el código de ambas pantallas no fija si el request desplegado envió `undefined`, `null`, cadena vacía, texto como `"undefined"`, o una fecha transformada externamente. Por ello no se atribuye falsamente el fallo a una pantalla de producción concreta ni se afirma que ambas rutas compartan el mismo error. El endpoint y la vista que el error identifica son Radar; el código actual no reproduce ese error en ninguna de las dos.

Se añadieron validaciones runtime en el transporte frontend para las funciones de histórico. Años y meses fuera del contrato (incluidos `undefined`, `null`, decimales y cadenas vacías) ahora fallan antes de emitir una petición HTTP. Los endpoints y DTOs no cambian, y las llamadas actuales conservan sus valores y semántica. Se tiparon también las proyecciones del listado que estas vistas consumen.

### Estado tras RM-2

- Ambas listas usan TanStack Query con estados separados de carga, reintento, error y respuesta vacía, y revalidan al volver a montarse. Los errores no se convierten en arrays vacíos.
- El servicio legacy `list.ts` sigue concentrando operaciones de varios tipos y mantiene `any` en otros métodos no usados por estos listados; los cuatro endpoints de calendario están tipados y aceptan cancelación. Las tarjetas y el acordeón de estos listados ya no viven en `src/views/discos/components/`.
- Radar mantiene clasificación temporal, filtro mes/año y tarjeta propios. Mejores mantiene su filtro de año y presentación diferenciada. `CollapsibleSection` sigue siendo compartido.
- Los filtros no se sincronizan con la URL. No se debe prometer persistencia entre rutas hasta definirla; cambiar de lista a detalle y volver actualmente pierde selección.

## RM-2 — Refactorización de los listados

**Estado:** completada localmente el 2026-11-01.

### Arquitectura y ownership

- `/discos/radar` y `/discos/mejores` ahora cargan las vistas desde `src/modules/editorial/radar-best-lists/presentation/views/`; las rutas y metadatos existentes de sesión y rol `riffvalley` se mantienen.
- `application/useRadarBestListsQueries.ts` posee las consultas remotas, sus validaciones, aislamiento de sesión y claves; `application/radarListClassification.ts` centraliza la transformación temporal propia de Radar. Los filtros siguen aislados por vista en composables de presentación y no se comparten entre semánticas distintas. La capa no añade Pinia ni un transporte paralelo.
- El servicio común `src/services/list/list.ts` sigue siendo el owner HTTP de Lists y acepta `AbortSignal` en las cuatro operaciones de calendario que consumen los listados. Los endpoints y formas de petición no cambian; se conservan las guardas runtime de RM-1.
- `RadarListCard` se trasladó al módulo por ser presentación exclusiva de Radar; `CollapsibleSection` también pertenece al módulo porque es compartido entre las dos vistas. Los estilos y tarjetas específicas de Mejores no se generalizan.
- No se modificaron las vistas individuales, operaciones editoriales, Content Calendar, Contents ni el backend.

### Contratos, filtros y caché

- Radar actual: `GET /api/lists/weekly/current`; histórico: `GET /api/lists/weekly/past/:year/:month`, con año entero entre 100 y 275759 y mes entero entre 1 y 12.
- Mejores actual: `GET /api/lists/month/current`; histórico: `GET /api/lists/month/past/:year`, solo con año entero entre 100 y 275759. Mejores conserva exclusivamente el filtro anual.
- Los filtros siguen inicializándose al año actual y, donde aplica, al mes actual; el histórico conserva cinco años seleccionables. Los filtros no se escriben en la URL y se pierden al desmontar la vista, igual que antes.
- Prefijo: `['editorial', 'radar-best-lists']`. Claves concretas: `['editorial', 'radar-best-lists', 'radar', 'current', userId, generation]`; `['editorial', 'radar-best-lists', 'radar', 'past', year, month, userId, generation]`; `['editorial', 'radar-best-lists', 'best', 'current', userId, generation]`; `['editorial', 'radar-best-lists', 'best', 'past', year, userId, generation]`.
- Las consultas envían la señal de cancelación, comprueban la sesión antes y después del transporte, reintentan una vez y usan `staleTime: 0`. La identidad de filtro y sesión evita datos de otro período/sesión; no se configura `placeholderData`. Las respuestas cacheadas del mismo período se conservan durante una revalidación y al regresar desde otra ruta se revalidan al montar.

### Estados y presentación

- Cada sección distingue carga inicial, reintento automático, error final con acción «Reintentar», resultados y respuesta vacía exitosa. Un array vacío se presenta solo tras una respuesta exitosa vacía; las excepciones no se convierten en `[]`.
- Un cambio de filtro activa la consulta de su clave correspondiente; no se muestra la respuesta de otro período mientras la nueva clave no tiene datos. Esto se comprueba para los filtros mensuales de Radar y anuales de Mejores. La caché de la clave activa puede permanecer visible durante una revalidación.
- Radar conserva la clasificación de actuales/futuras, sus controles de año y mes, tarjetas y navegación a `/discos/radar/:id`. Mejores conserva el acordeón excluyente, el filtro anual, los estilos compactos/destacados y la navegación a `/discos/mejores/:id`.

### Código legacy retirado y límites

- Se retiraron de las vistas la carga manual con `onMounted`, el vaciado de arrays al capturar errores, la recarga imperativa de filtros y la tipificación local de arrays sin estado de consulta.
- Las implementaciones de ruta dejaron `src/views/discos/`; el servicio `list.ts` permanece compartido porque tiene consumidores ajenos a RM-2. Sus otros métodos y `any` no relacionados no se modificaron.
- Las invalidaciones del módulo pueden usar el prefijo RM-2. Las operaciones existentes de Content Calendar conservan su propio ámbito de caché; esta fase no introduce invalidación cruzada ni modifica esas operaciones. La revalidación al volver está cubierta por `staleTime: 0` al remontar.
- No se identificaron limitaciones funcionales nuevas. La selección sigue sin persistir en URL/almacenamiento por conservar la regla existente.

### Tests y verificaciones

- Tests añadidos: claves por tipo/período/sesión, validación de año y mes, parámetros inválidos y habilitación cuando pasan a ser válidos, clasificación actual/futura de Radar, observers simultáneos sin duplicar petición, separación de caché y rechazo de respuesta de una sesión anterior, invalidación por prefijo, revalidación al volver a montar, no mostrar otro período durante carga, cargas iniciales, filtros, loading/empty/error/reintento y navegación en ambas vistas. La suite focalizada, junto con regresiones RM-1 del servicio, pasó con 5 archivos y 43 tests en la ejecución final.
- Verificaciones locales: Vitest focalizado y typecheck pasan. ESLint pasa para el módulo, tests, ruta y tests del servicio; `list.ts` conserva `any` en métodos ajenos a estos listados, por lo que ESLint de ese servicio completo informa 11 hallazgos de `no-explicit-any`. ESLint del servicio con esa regla excluida pasa. Prettier pasa en el módulo y servicio compartido; el check de `src/router/index.ts` falla también sobre `HEAD` por formato fuera de los cambios. `pnpm build` pasa y muestra avisos sobre Browserslist, el selector CSS `.flex-[2]` y un chunk principal mayor de 500 kB; sin una comparación de build base no se atribuyen esos avisos al cambio. Fixtures de ciclos y fixtures de enlaces Markdown pasan. El diagnóstico normal de ciclos encuentra 0 edges locales irresueltos y un componente de ciclos type-only en servicios legacy; la comparación es informativa al no poder resolver local HEAD. `markdown:links:delta` es informativo porque exige base/head completos y un checkout limpio. `git diff --check` pasa.
- El detector mecánico Impeccable informa tres clases Indigo/gradiente ya presentes en la presentación conservada de Mejores; se mantienen para no rediseñar las tarjetas. No se hizo comprobación visual manual en navegador ni responsive, según el alcance solicitado. Las verificaciones locales no acreditan GitHub Actions.

## Fases

- **RM-1 — Auditoría y reparación del error 400.** Completada; el 400 desplegado no se reprodujo y no se atribuyeron valores de petición sin evidencia.
- **RM-2 — Refactorización y estabilización de ambos listados.** Completada localmente según el registro anterior.
- **RM-2b — Listado Radar visible por semanas y días.** Cerrada localmente; registrada en la fase de estabilización del listado.
- **RM-3 — Refactorización de la vista individual de Radar.** Completada localmente el 2026-11-01; Radar tiene componentes propios de asignaciones y catálogo, y conserva sus queries/mutaciones TanStack Query.
- **RM-4 — Refactorización integral de Mejores del Mes.** Completada localmente; `/discos/mejores/:id` queda en el módulo editorial, con TanStack Query, tarjetas propias con la identidad visual aprobada de Radar, pestaña `Mis votos` inicial, catálogo mensual desplegable y carga incremental estable.
- **RM-5 — Validación integrada y cierre.** Ejecutar al completar las fases anteriores; no iniciada.

RM-5 permanece pendiente. No se avanzó a esa fase.

## RM-2b — Listado Radar visible por semanas y días

**Estado:** cerrada localmente el 2026-11-01; la extracción posterior RM-3 trasladó la implementación Radar a su módulo propio.

### Contrato y fechas

- La revisión del `List` real confirma que no existe un campo numérico `List.week`: `week` es el valor de `List.type`. La fecha editorial disponible es `List.listDate` (timestamp nullable); por eso el lunes y domingo se calculan desde su fecha civil, no desde un número de semana ni desde el nombre de la lista.
- La utilidad pura y tipada `src/views/list/utils/editorialWeek.ts` extrae `YYYY-MM-DD` sin convertir el timestamp a la zona local, calcula el lunes con `(díaUTC + 6) % 7`, y genera siete fechas civiles consecutivas con aritmética UTC. La consulta conserva `GET /discs/date` y sus parámetros: lunes a las 00:00 y domingo a las 23:59:59.999 UTC, para incluir ambos días enteros.
- El día del disco se obtiene de `Disc.releaseDate`, que está presente en cada disco devuelto por `getDiscsDated`; no se usa el índice del disco, `Asignation.createdAt` ni la fecha de la lista para ubicar filas. Fechas inválidas o fuera de la semana no reciben una fecha inventada y no se colocan en ninguno de los siete grupos.
- Las cabeceras de días con discos usan `Lunes DD-MM` hasta `Domingo DD-MM`, en orden cronológico. Cada día visible es desplegable; viernes empieza abierto y los otros días con discos cerrados. Los días sin discos no se muestran ni crean filas ficticias.

### Presentación y regresiones preservadas

- Las secciones Futuras y Anteriores de `/discos/radar` conservan sus `CollapsibleSection` y el estado inicial cerrado. Esas secciones muestran listas Radar; después de RM-3 el catálogo de Radar pertenece a `RadarDiscCatalog.vue`.
- En el catálogo semanal Radar, `RadarDiscCatalog.vue` presenta los días con discos como desplegables nativos, con viernes abierto por defecto cuando tiene discos. Las filas conservan su marcado, clases, tamaños y separadores: género, artista y disco, Spotify, EP, bandera/país, selector, Asignar/Actualizar y Destacar. `DiscByDate.vue` mantiene el comportamiento semanal legacy requerido por otros consumidores, incluido EditList.
- Se oculta el encabezado general de semana (`Discs for Week: Semana del ...`); las fechas diarias quedan como cabeceras de la lista. Mejores del Mes conserva su encabezado.
- En el cierre original de RM-2b no se cambió `AsignationList.vue` ni la vista individual; RM-3 trasladó después el catálogo y las asignaciones Radar a componentes propios. Se conservan paneles Radar 1/2, posiciones persistidas, huecos, acciones, filtros y carga incremental (`resetAndFetch` vuelve a `hasMore = true`). Mejores del Mes no cambia.

### Tests y verificaciones

- Tests de fechas: semana normal, cruce de mes y año, fechas en ISO semanas 1/52/53, transiciones horarias de marzo/octubre, siete cabeceras y formato, orden y rango de fechas civiles.
- Tests de agrupación/presentación: uso del `releaseDate` propio, varios discos el mismo día, omisión de días vacíos, exclusión de fechas fuera de la semana, filas inmediatas y controles de asignación/destacado. Tras RM-3, estos casos de Radar se cubren en `RadarDiscCatalog.test.ts` y `RadarAssignments.test.ts`; `DiscByDate.test.ts` y `AsignationList.test.ts` protegen los comportamientos legacy, incluidos Video, Mejores y EditList.
- Vitest focalizado: 32 tests pasan bajo `TZ=UTC`; los 14 tests de fechas y catálogo también pasan bajo `TZ=Europe/Madrid`.
- Typecheck (`pnpm run typecheck`), Prettier focalizado, build y `git diff --check` pasan. ESLint focalizado sin cambios de reglas reporta 15 `no-explicit-any` en `DiscByDate.vue`; el `HEAD` previo reporta los mismos 15 hallazgos. ESLint focalizado con esa regla desactivada pasa, sin errores nuevos del cambio. El build avisa de datos Browserslist antiguos, un selector `.flex-[2]` y un chunk principal mayor de 500 kB; no se atribuyen esos avisos a RM-2b sin comparar una build base. Vitest: 31 tests focalizados pasan en UTC; fechas y catálogo (13 tests) también pasan en Europe/Madrid. No se inspecciona en navegador ni se atribuyen resultados de GitHub Actions.

### Limitaciones

- Como `List.week` numérico no forma parte del contrato, el cálculo depende de `listDate` y no puede validar una numeración ISO recibida del backend. Los discos con `releaseDate` inválida o fuera del intervalo de la consulta no se asignan a días; no se fabrican fechas para esos casos.
- Un día aparece en la lista cuando tiene discos que coinciden con los filtros activos; mientras hay carga, el contenido aún no recibido no se representa como un grupo vacío.

## RM-3 — Separación definitiva de Radar y Mejores del Mes

**Estado:** completada localmente el 2026-11-01. Radar queda aislado de los componentes editoriales legacy de asignaciones y catálogo; RM-4 y RM-5 no se abordan en este trabajo.

### Ownership de Radar

- `/discos/radar/:id` conserva ruta, permisos y comportamiento aceptado. La implementación individual vive en `src/modules/editorial/radar-best-lists/presentation/views/RadarDetailView.vue` y ahora monta `RadarAssignments.vue` y `RadarDiscCatalog.vue`, ambos propios del módulo. No importa `src/views/list/components/AsignationList.vue` ni `DiscByDate.vue`.
- `RadarAssignments.vue` posee la presentación y la interacción de grupos, bandeja, movimientos, drag & drop, selector táctil, navegación móvil y publicación WordPress por posición. `RadarDiscCatalog.vue` posee catálogo semanal, grupos diarios, filtros, carga incremental y controles de asignación/destacado. Los tipos del flujo se definen en `types/radarAssignment.ts`; el helper civil semanal vive en `utils/editorialWeek.ts` y sus reglas RM-2b se mantienen.
- Se preservan los paneles Radar 1 y 2, huecos hasta la posición positiva persistida máxima, `position = 0` como bandeja, paneles manuales locales, ausencia de renumeración y máximo de cuatro asignaciones por panel. También se conserva el estado de carga/error, el comportamiento de recarga, la navegación móvil y la presentación desktop/mobile aprobada.
- La publicación WordPress por panel, asociación con `wpWeeklyPosts`, publicación/actualización, estados, errores y evento `wp-published` siguen en la implementación Radar. El catálogo mantiene sus filas y acciones validadas, fechas civiles, agrupación semanal/diaria, filtros y paginación.

### Estado remoto y contratos

- Radar conserva `useRadarDetailQuery`, `useRadarAssignmentsQuery`, `useRadarDiscCatalogQuery`, `useRadarAssignableUsersQuery`, `useRadarGenresQuery` y `useRadarDetailMutations` en `application/`. Las consultas mantienen Query keys, aislamiento por usuario y generación de sesión, `AbortSignal` y comprobaciones de sesión; las mutaciones conservan invalidaciones de asignaciones, catálogo, listados y Content Calendar.
- Las asignaciones, usuarios y catálogo de Radar no usan los stores Pinia legacy. El borrador de campos de lista, filtros y selección, estado de interacción y paneles manuales permanecen locales. El destacado sigue escribiendo la propiedad global `Disc.pinned`; no se duplica como estado de asignación.
- No se implementaron llamadas HTTP nuevas ni se modificó el contrato WordPress. Continúan los servicios y DTOs HTTP compartidos neutrales, incluyendo el transporte `GET /discs/date` y los servicios de asignación/lista necesarios para las mutaciones.

### Consumidores legacy y deuda aceptada

- A fecha de cierre de RM-3, `AsignationList.vue` y `DiscByDate.vue` seguían sirviendo Mejores del Mes, `/videos/list/:id`, `/list/edit/:id` y otros flujos legacy. RM-4 retira la dependencia de Mejores; ambos componentes se conservan para Vídeos y EditList. Los modos `remoteRadar` y ramas de TanStack Query de Radar ya se habían retirado en RM-3.
- El componente legacy de asignaciones mantiene la lógica semanal usada por EditList como deuda independiente; no se reescribe EditList ni se moderniza Mejores. La separación duplica temporalmente presentación y algunos helpers para mantener propiedad de dominio clara. RM-4 y RM-5 siguen pendientes según el estado de las fases.

### Pruebas y verificaciones

- Cobertura focalizada actualizada: vista y queries Radar; paneles mínimos, posiciones persistidas y huecos, bandeja, paneles manuales, movimientos, drag & drop, selectores táctiles, capacidad cuatro, WordPress y metadatos; catálogo y agrupación diaria, filtros, paginación y estados; regresiones legacy para Mejores, Video y EditList. `MejoresDetalle.test.ts`, `VideoListDetalle.test.ts`, `EditList.test.ts`, `AsignationList.test.ts` y `DiscByDate.test.ts` protegen consumidores que siguen en modo legacy.
- Verificaciones finales de esta separación: Vitest focalizado, suites RM-2/RM-2b, typecheck, build, ESLint y Prettier focalizados, fixtures/gates estructurales disponibles y `git diff --check`. No se hizo validación visual en navegador ni se afirma ejecución de GitHub Actions.
- Se conserva la deuda histórica de lint/formato y los avisos del build fuera de Radar; se reportan por separado en la entrega final, sin atribuirlos al cambio si no hay comparación fiable. Los gates comparativos que necesiten base/head completos se identifican como no concluyentes.

### Corrección visual localizada de las tarjetas de asignación

- Sin reabrir la separación arquitectónica RM-3, `RadarAssignments.vue` reorganiza las tarjetas para alinear título y metadatos con la portada, colocar Spotify debajo de esta y agrupar usuario, Editar y Validar en una fila compacta. Se retiraron los botones de copiar imagen y copiar texto, junto con sus handlers exclusivos.
- La X de una asignación activa conserva su operación de mover a la bandeja y ocupa una columna propia de la cabecera para no superponerse al título en móvil. Mover a, el selector y Eliminar permanecen juntos; la eliminación conserva confirmación. Se respetan las áreas táctiles y los estados validado/pendiente.
- La revisión solicitada en Chrome mostró título y metadatos centrados y controles estirados. En escritorio la tarjeta queda limitada a 380 px, la cabecera presenta portada e información a la izquierda y Spotify y la X a la derecha; los títulos largos pueden ocupar dos líneas. El usuario asignado, Editar y Validar forman un grupo compacto. En móvil la cabecera usa tres columnas: portada/Spotify, título/artista con la bandera junto al nombre y X/género. El pill conserva un ancho mínimo y queda separado verticalmente de la X. Los botones editoriales usan una fila para el usuario y otra para Editar/Validar; «Mover a» queda encima del selector y la papelera. Bajo 360 px la cabecera se adapta a dos columnas para conservar espacio de lectura. La navegación entre paneles y las alternativas táctiles existentes permanecen sin cambios; no se rediseñaron los paneles ni el catálogo.
- En el catálogo semanal Radar, las acciones de cada disco se distribuyen en columnas con separación en escritorio. En tabletas se apilan en filas; en móvil el selector y Asignar/Actualizar comparten fila y Destacar queda en una fila propia. Los controles siguen teniendo altura táctil y no cambian sus acciones.
- Los estados del catálogo usan colores más visibles: azul para asignado, amarillo para destacado y un degradado azul-cyan-amarillo para la combinación. Los textos de estado mantienen tonos neutros legibles y los iconos refuerzan el estado en claro y oscuro.
- El botón Spotify de las tarjetas de asignación Radar abre el enlace del álbum cuando el disco ya tiene una URL válida; si falta o apunta a otro servicio, resuelve el álbum con `resolveSpotifyAlbum(nombre, artista)` y abre el resultado. Ya no busca el perfil del artista.
- Se conservan movimientos, drag & drop, capacidad cuatro, destacado, edición de metadatos, publicación WordPress y sus invalidaciones. No cambian queries, mutaciones ni contratos.
- `RadarAssignments.test.ts` cubre portada/metadatos, Spotify, ausencia de controles de copia, acciones editoriales, movimiento y eliminación con confirmación, bandeja y navegación móvil. En la ejecución focalizada pasaron los 27 tests; ESLint, Prettier y typecheck focalizados pasaron. El build pasó; mantiene avisos existentes de Browserslist desactualizado, selector CSS `.flex-[2]` durante minificación y un chunk mayor de 500 kB, sin comparación base para atribuirlos. `git diff --check` pasó. La inspección en Chrome fue local, no equivale a una ejecución de GitHub Actions.

## RM-4 — Refactorización integral de Mejores del Mes

**Estado:** completada localmente el 2026-11-01. No se inicia RM-5.

### Arquitectura y ownership

- `/discos/mejores/:id` carga `BestListDetailView.vue` desde `src/modules/editorial/radar-best-lists/presentation/views/`. La vista conserva sesión, rol, navegación y los campos editoriales existentes. `BestAssignments.vue`, `BestDiscCatalog.vue` y `BestVotes.vue` son componentes propios; no importan componentes completos ni lógica de Radar.
- `MejoresAsignationList.vue` sigue siendo compartido por Vídeos; `DiscByDate.vue` sigue siendo compartido por Vídeos y EditList. Ninguno se modificó ni se eliminó. `MisVotosMes.vue` se retiró porque su único consumidor era el detalle migrado.
- El detalle dejó de leer asignaciones y usuarios desde stores Pinia. Las consultas remotas pertenecen a TanStack Query; borradores, filtros, usuario elegido y expansión de grupos son estado efímero local. Identity conserva la autenticación y el acceso a usuarios asignables por sus contratos públicos.
- No se cambió Radar. Los componentes RM-4 copian/adaptan la identidad visual definitiva de sus tarjetas: portada y Spotify debajo, título y metadatos, artista/género/país y controles editoriales. En móvil, la portada/Spotify y metadatos permanecen legibles; Usuario, Editar y Validar se agrupan y Eliminar mantiene un objetivo táctil independiente. Los nombres largos pueden partir línea sin ampliar el viewport.

### Queries, mutaciones y WordPress

- `application/bestDetailQueries.ts` centraliza detalle, asignaciones, usuarios, géneros, catálogo y votos. Las claves identifican lista y periodo mensual cuando aplican, usuario y generación de sesión. Las queries consumen `AbortSignal`, validan la sesión antes y después del transporte, conservan reintento y distinguen error de respuesta vacía.
- El catálogo de Mejores usa `useInfiniteQuery` sobre el endpoint existente `GET /discs/date`, con `limit=300` y offset calculado en saltos de 300 (`0`, `300`, `600`...). Concatenación agrupa por fecha mensual estable y descarta IDs de disco duplicados; una página repetida sin discos nuevos detiene la paginación. Un `IntersectionObserver` activo solo al seleccionar el catálogo observa un sentinel permanente fuera de los collapsibles. Si una página aumenta la altura del catálogo y el sentinel sigue cerca, carga la siguiente para llenar la zona visible; si los grupos cerrados impiden que el layout crezca, espera scroll real hacia abajo y, una vez solicitado, sigue cargando mientras el sentinel permanezca cerca. No añade espacio artificial de scroll. Conserva reintento visible y se desconecta al ocultar la pestaña o desmontar.
- El endpoint no admite búsqueda ni género. Ambos controles se mantienen como filtros locales de los discos ya cargados; la interfaz lo expresa como resultados entre discos cargados y no simula un filtrado global. El cambio de periodo reinicia filtros y consulta; un cambio de filtro local no descarta páginas.
- `useBestDetailMutations.ts` centraliza crear, actualizar, cambiar usuario, validar, eliminar, metadatos, destacado global, campos de lista y generación del borrador WordPress. Tras las escrituras invalida asignaciones, catálogo, detalle o listados editoriales afectados; no recarga la página ni guarda datos remotos en Pinia.
- Se conserva la operación WordPress propia de Mejores (`generateBestDiscsWpPost`), con respuesta enlazada, estados de borrador existente, añadido/retirado, avisos y errores. Radar conserva su publicación específica por posición; no se comparten reglas ni se alteran contratos WordPress o Content Calendar.

### Vista, votos y catálogo mensual

- `Mis votos` es la pestaña inicial y su consulta se activa al estar seleccionada. `?tab=seleccion` solicita de forma explícita Selección de discos; al cambiar de pestaña se activa la consulta correspondiente sin perder el estado local de los componentes. La selección vuelve a `Mis votos` al cambiar de lista o remontar sin ese parámetro. La lógica de votación y el orden existente se conservan.
- `Selección de discos` conserva el rango del mes derivado de `listDate` y agrupa las filas del servicio por su fecha de lanzamiento mensual. Cada grupo tiene fecha, control `aria-expanded`, filas y estado con clave estable de lista, periodo y fecha. Todos los grupos empiezan cerrados. Refetch y nuevas páginas no pierden la expansión del usuario.
- Se preservan asignación/cambio de usuario en catálogo, `done`, edición de metadatos, confirmación de borrado, destacado global y feedback. La tarjeta de asignación no incluye posiciones, bandeja, capacidad ni movimientos de Radar.

### Pruebas y verificaciones

- Nuevos tests cubren selección inicial y pestaña explícita, fechas, estados con error/reintento, WordPress, claves de sesión/periodo, límites mensuales, cancelación y paginación, deduplicación, grupos/expansión, observer, asignación, validación, edición y eliminación. Las suites actuales de Radar, Vídeos, EditList y catálogo legacy se ejecutan como regresión.
- No se realizaron capturas ni revisión manual responsive en navegador; el layout móvil se cubre con estructura y estilos, y el usuario hará la comprobación visual solicitada.
- Vitest focalizado: 124 tests pasan en 16 archivos, incluyendo detalle y queries/mutaciones Mejores, las suites de Radar, los listados, Video/EditList/DiscByDate, rates y guardas de rutas. Typecheck y build pasan. ESLint focalizado de los archivos de la iniciativa pasa con `no-explicit-any` desactivado solo al incluir `list.ts`/`rates.ts`, que mantienen usos `any` ajenos a RM-4; el módulo nuevo y router/tests pasan sin excepciones. Prettier focalizado y `git diff --check` pasan.
- Los fixtures de ciclos, fronteras Identity y enlaces Markdown pasan. Los diagnósticos locales encuentran 0 edges irresueltos y 0 violaciones de frontera Identity. La comparación de ciclos/fronteras no es concluyente porque no pudo resolver local HEAD; `markdown:links:delta` es informativo porque exige base/head completos y checkout limpio. El build conserva avisos de Browserslist desactualizado, el selector CSS `.flex-[2]` y un chunk de 708 kB; no se atribuyen a RM-4 sin comparación de build base. No se afirma ejecución en GitHub Actions.

### Deuda y límites

- Se conserva `any` preexistente en operaciones ajenas al flujo mensual de `list.ts` y `rates.ts`; el cambio solo añade cancelación opcional al transporte de votos. No se modifica backend, endpoints, permisos ni votación.
- RM-5 queda pendiente para una solicitud posterior. No hay trabajo de RM-5 incluido en esta fase.

## Ajustes móviles y visuales de Radar posteriores a RM-3

**Estado:** trabajo histórico completado tras RM-3. El catálogo Radar recibió una extensión visual posterior bajo solicitud del usuario.

### Auditoría móvil y decisiones de UX

- La cabecera combinaba título, estado y tres fechas en una sola fila de controles; a anchuras pequeñas las fechas competían con la identificación de la lista. La cabecera ahora prioriza nombre y estado, y agrupa las fechas en un desplegable móvil con campos de ancho completo. Desktop conserva sus controles de fecha en línea.
- `AsignationList.vue` pintaba simultáneamente todos los paneles Radar y la Bandeja, aun cuando cada tarjeta seguía una composición compacta de escritorio. El drag & drop era el principal movimiento desde los paneles y la Bandeja ofrecía botones numéricos diminutos; una tarjeta de Radar solo tenía una acción pequeña para volver a `position = 0`.
- En móvil, los paneles pasan a una vista individual elegida mediante botones segmentados con ocupación `n/4`. La Bandeja se mantiene seleccionable incluso vacía, el cambio de panel es inmediato y «Nuevo Radar» está siempre visible. Al mover desde una tarjeta, el selector puede elegir Bandeja o cualquier Radar disponible y enfoca el panel de destino. Drag & drop permanece en desktop y no es necesario para completar la gestión móvil.
- Las tarjetas de asignación mantienen artista, disco, usuario, destacado/editorial y acciones actuales. Los controles de movimiento, usuario, edición, check, copiado y eliminación tienen áreas táctiles ampliadas; las acciones no dependen de hover. Los destinos completos se deshabilitan en el selector y la validación existente sigue mostrando el error `4/4` si se intenta mover a un Radar lleno.
- Tras la revisión del usuario, la fila que reúne persona asignada, edición y hecho se reorganizó en móvil como un control de tres columnas alineadas: persona con nombre visible, edición y check con fondos y bordes coherentes y objetivos de 44 px. Por debajo de 360 px, la persona ocupa una primera línea y edición/check quedan juntas debajo, para no truncar el nombre. En escritorio conserva la disposición previa.
- Un ajuste posterior da más anchura al nombre de la persona asignada en las tarjetas de escritorio. En el catálogo Radar, los discos asignados reciben acento naranja, los destacados conservan verde y los que están asignados y destacados usan morado; el estado normal mantiene la tarjeta neutra. La etiqueta de asignación adopta naranja o morado según el caso combinado.
- `RadarDiscCatalog.vue` conserva la presentación móvil aceptada, carga incremental, filtros y mutaciones de Radar. `DiscByDate.vue` se mantiene para consumidores legacy y no tiene un modo `remoteRadar`.
- La página mantiene el orden cabecera → asignaciones → catálogo y reduce espaciado móvil. «Eliminar radar» y las fechas quedan subordinados visualmente sin eliminar operaciones. El título reduce su tamaño en móvil para caber incluso a 320 px. Las acciones secundarias de cada asignación se agrupan bajo «Más acciones» y la bandeja no duplica el acceso a «Nuevo Radar».
- A petición posterior, se revisó la vista real en Chrome con anchos de 320, 375, 390 y 430 px y en escritorio a 1440 px. No apareció desplazamiento horizontal; búsqueda y filtros permanecieron legibles en columna; tarjetas de catálogo y selectores de movimiento quedaron dentro del viewport. La navegación móvil desaparece en escritorio, donde siguen visibles los paneles en dos columnas. La revisión encontró y corrigió el contraste de «Mover a» en modo oscuro y el título truncado a 320 px. No se guardaron capturas como artefactos.

### Tests y verificaciones

- La cobertura de Radar vive en `RadarDetailView.test.ts`, `RadarAssignments.test.ts` y `RadarDiscCatalog.test.ts`: navegación móvil y ocupación, bandeja, «Nuevo Radar», movimientos táctiles, persistencia de posiciones, bloqueo 4/4, drag & drop desktop, metadatos, acciones, filtros y carga incremental. `AsignationList.test.ts` y `DiscByDate.test.ts` cubren únicamente sus consumidores legacy.
- Vitest focalizado: 34 tests pasan en 3 archivos, incluidos los estados visuales del catálogo y la agrupación accesible de usuario/editar/hecho. `pnpm run typecheck` pasa y `pnpm build` pasa. Prettier y `git diff --check` pasan. ESLint de los seis archivos focalizados mantiene cuatro hallazgos preexistentes de `no-static-element-interactions` en zonas/cards de drag & drop; los otros controles accesibles nuevos pasan. Build muestra avisos ya presentes del repo: datos Browserslist desactualizados, selector `.flex-[2]` durante minificación CSS y chunk principal mayor de 500 kB; no se atribuyen a RM-4 sin comparación fiable con build base. Chrome confirmó el nombre ampliado en escritorio y la composición de los controles a 320 px; los estilos de los tres estados se cubren con tests estructurales. No se validó en GitHub Actions.

### Límites

- No se detectó ninguna limitación backend que requiera cambios: las operaciones existentes actualizan `Asignation.position`, y el frontend conserva el límite cuatro y el error de destino lleno. Ningún archivo de `riffvalley-app-back` fue modificado.
- `MejoresAsignationList.vue` y `DiscByDate.vue` siguen atendiendo Vídeos y EditList. Mejores ya no depende de esos componentes; la deuda semanal de `AsignationList.vue` para EditList permanece fuera de RM-4.

### Extensión posterior solicitada: catálogo semanal Radar

- `RadarDiscCatalog.vue` ahora presenta los grupos diarios cerrados inicialmente, con icono de calendario, contador de discos y chevron; conserva agrupación por semana editorial y las filas/acciones Radar.
- La barra de filtros de ambos catálogos muestra búsqueda y el selector buscable compartido de géneros de `/discos`, con selección múltiple OR. El backend no define `/genres/all`: `getAllGenres` recorre `GET /genres` usando páginas de 300 y `limit`/`offset`, evitando que `all` se interprete como un UUID en `GET /genres/:id`.
- El catálogo conserva carga incremental con sentinel, sin espacio artificial de scroll, y solicita páginas de 300 discos (offsets 0, 300, 600...). El scroll descendente cerca del sentinel sigue solicitando páginas aunque los collapsibles no aumenten la altura, con guards por página en vuelo y reintento de errores.
- El mismo tamaño de 300 y la ausencia de espacio artificial se aplican a `BestDiscCatalog.vue`. El detalle de Radar también normaliza `wpWeeklyPosts: null` como lista vacía antes de buscar publicaciones; el backend puede devolver ese valor en radares nuevos y antes provocaba una excepción durante el render.
- `RadarDiscCatalog.test.ts` y `radarDetailQueries.test.ts` cubren los contadores/iconos, grupos cerrados, selector buscable completo, filtros, paginación y desmontaje del observer. Las verificaciones focalizadas se registran en el resumen de esta extensión; no se realizó revisión visual manual.
