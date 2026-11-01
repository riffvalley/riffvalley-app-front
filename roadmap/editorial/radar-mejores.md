# Radar y Mejores del Mes — RM-1–RM-5

Iniciativa acotada a los listados `/discos/radar` y `/discos/mejores` y, en fases posteriores, sus vistas individuales. Lists es una dependencia del dominio Editorial; este trabajo no rediseña Lists en general. Las vistas de detalle no se modifican en RM-1.

## Dependencias y ownership observados

- **Frontend:** ambas rutas están declaradas en `src/router/index.ts`; requieren sesión y rol `riffvalley`. Desde RM-2, los listados pertenecen a `src/modules/editorial/radar-best-lists/` y consumen el servicio compartido `src/services/list/list.ts`. Las vistas individuales siguen en `src/views/discos/` hasta RM-3/RM-4.
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
- **RM-3 — Refactorización de la vista individual de Radar.** Posterior e independiente; no iniciada.
- **RM-4 — Refactorización de la vista individual de Mejores del Mes.** Posterior e independiente; no iniciada.
- **RM-5 — Validación integrada y cierre.** Ejecutar al completar las fases anteriores; no iniciada.

RM-3, RM-4 y RM-5 permanecen pendientes. El cierre integrado de RM-5 depende de las vistas individuales posteriores y de su validación propia; completar RM-2 no inicia esas fases.
