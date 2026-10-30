# EST-1 — Inventario funcional y arquitectónico de Estadísticas

> **Seguimiento vigente:** el inventario histórico de EST-1/EST-2/EST-2a que sigue a esta nota se conserva como antecedente. El plan de implementación aprobado es EST-FE-1–EST-FE-6, registrado al final de este documento. Los contratos actuales se verificaron directamente en los DTOs backend de EST-BE-2 y EST-BE-12.

**Estado:** EST-1 completada como análisis documental. EST-2 y las fases posteriores permanecen pendientes. Este documento no aprueba retiradas, reutilizaciones ni cambios funcionales.

## 1. Alcance del inventario

Revisión estática del frontend en el checkout del 29 de octubre de 2026: Router y sidebar, la pantalla `/statistics`, sus componentes/utilidades, servicios y tipos Rates, stores/composables, pruebas disponibles y referencias a Dashboard, Actividad y Catalog/Rates. Se revisaron también las rutas de estadísticas administrativas de Identity para distinguirlas de la sección pública de Estadísticas.

No se inspeccionó ni verificó el repositorio/backend, un despliegue, una base de datos o respuestas reales de API. Las rutas, parámetros y payloads descritos abajo son los contratos que declara/consume el frontend y no demuestran por sí solos la implementación o semántica del servidor. No se ejecutaron suites, E2E ni pruebas visuales; el trabajo se limitó a documentación.

## 2. Mapa de archivos y dependencias

### Sección `/statistics`

| Responsabilidad | Archivos observados |
|---|---|
| Registro de ruta | `src/router/index.ts` → `src/views/statistics/Statistics.vue` |
| Entrada de navegación | `src/layouts/default/components/routes.json` → `/statistics`, label «Estadísticas», grupo disc-app, `requiredRole: user` |
| Vista/estado/consulta | `src/views/statistics/Statistics.vue` |
| Gráficos y presentación | `components/GenreBarChart.vue`, `MonthlyVotesChart.vue`, `ScoreDistributionChart.vue`, `ActivityCalendar.vue`, `ControversialDiscsList.vue`, `DiscHoverTooltip.vue` |
| Galaxia | `components/GenreGalaxyModal.vue`, `GenreGalaxyDesktop.vue`, `GenreGalaxyMobileBubbles.vue` |
| Ayudantes gráficos | `utils/discCoverPositionsPlugin.ts`, `utils/externalTooltip.ts`, `utils/galaxyLayout.ts` |
| Transporte y tipos compartidos | `src/services/rates/rates.ts`; los tipos `RatesStatsResponse`, `TopDisc`, `ControversialDisc`, `YearOverYear` y `RatedDiscItem` están definidos ahí |
| Dependencias compartidas | `src/services/api/api.ts` (Axios y sesión), `src/helpers/dateConstants.ts` (opciones de año/mes), `src/composables/useIsMobileViewport.ts`, `src/components/SimpleSelect.vue` |

No hay una carpeta `src/modules/statistics/`, ni carpetas propias `types/`, `api/`, `application/` o `presentation/`. No se encontraron composables, Pinia stores o TanStack Query específicos de esta sección. La vista guarda datos y filtros en refs locales, llama al servicio directamente y transforma algunos valores con `computed`; la galaxia también llama al servicio directamente al montarse.

El servicio `src/services/rates/rates.ts` es un owner legacy compartido con muchas otras operaciones de Rates/Catalog/Dashboard. Que Estadísticas consuma sus tipos y funciones no implica que la sección posea o use todo ese servicio.

### Referencias legacy/adyacentes encontradas

- `src/components/StatsModal.vue` y `StatsModal.test.ts`: modal genérico antiguo que acepta datos por props. No tiene consumidor productivo encontrado en `src/`; el widget actual de Dashboard usa `DashboardCommunityStatsModal.vue`. Sus pruebas solo verifican datos provistos/no inventar ceros.
- `src/views/discos/MejoresDetalle.vue`, `RadarDetalle.vue`, `RadarNovedades.vue` y `src/views/homePage/components/RatingBarChar.vue`: vistas/componentes relacionados con valoraciones o presentación de distribuciones, pero no son dependencias de `/statistics` (salvo que `RatingBarChar` se importa desde el modal legacy no usado).
- `src/modules/identity/activity/` contiene estadísticas administrativas de actividad/uso bajo `/users/stats`; son otra sección, con acceso superadmin, contrato/API y estado propios.
- `src/modules/dashboard/` y `src/modules/activity/` son capacidades independientes descritas en sus roadmaps [Dashboard](dashboard.md) y [Actividad](activity.md).

## 3. Inventario funcional

La ruta se presenta como «Tus votos en cifras» y la fuente `/rates/stats` recibe el usuario autenticado implícitamente (no hay parámetro `userId`). Por tanto, la vista es **personal**. Algunos resultados se comparan con comunidad (ranking, media de comunidad), pero no convierte el informe en un agregado global.

| Estadística / finalidad | Datos y presentación | Fuente y filtros | Estado/observaciones |
|---|---|---|---|
| Resumen de votos | Total, media y mediana de notas; posición `rank / totalUsers`; comparación interanual con votos y porcentaje. | `GET /rates/stats`; selector de año afecta la petición principal. `yearOverYear` se presenta con la nota de código de que representa el ritmo anual actual y no depende del filtro. | Tiles empiezan con valores locales `0`/`"0"`; no hay empty state separado. La comparación no se representa si DTO es null/falsy o si votos previos son cero. Semántica exacta de los agregados depende del backend. |
| Disco destacado del año | Álbum personal con disco, artista, portada y nota; título visible «Tu disco del año». | `topDiscOverall` del mismo `/rates/stats` y filtro de año. | Se oculta si no hay disco. No se comunica explícitamente que el conjunto esté vacío. |
| Votos por mes | Barras por mes; tooltip incluye total, semanas con votos y disco destacado del mes; en escritorio puede superponer portadas. | `votesByMonth` de `/rates/stats`, año. | La tarjeta permanece visible. Si la serie está vacía, el chart retorna antes de marcar `loaded`, por lo que muestra «Cargando gráfico…» indefinidamente. |
| Calendario de actividad | Mapa de calor por día y número de votos; intensidad relativa al máximo enviado. | `votesByDay` de `/rates/stats`, año. | Toda la tarjeta se oculta si no hay filas. El conteo se denomina voto en UI, pero el frontend no verifica si coincide con eventos históricos `set`, con `change` o con Rates actuales. |
| Votos por género | Recuento por género; tarjeta informa número de géneros; gráfico muestra como máximo los cinco géneros con más votos y portada/disco principal en escritorio. | `votesByGenre` de `/rates/stats`, año. | Botón abre exploración solo con filas. El gráfico de barras también conserva el mensaje de carga si no hay filas. No se presenta un empty state específico. |
| Galaxia musical / discos por género | Escritorio: cada disco votado es una estrella coloreada por género y dimensionada por nota; móvil: burbujas agrupadas por género, seleccionables para explorar discos. Tooltip muestra disco/artista/género. | Bajo demanda, al abrir, `GET /rates/stats/discs` con el mismo año seleccionado. | Modal distingue carga, error y vacío. No usa caché/Query ni cancelación explícita. Layout/agrupación se calcula en `galaxyLayout.ts`. |
| Distribución de notas | Recuento por puntuación, presentado como barras con gradiente. | `votesByScore` de `/rates/stats`, año. | La tarjeta está siempre presente. Sin una serie no se anuncia vacío: el componente muestra «Cargando gráfico…» porque retorna antes de marcar `loaded`. |
| Discos polémicos | Selección/listado de discos donde la nota personal se aleja más de la media comunitaria; enseña nota propia, media comunitaria y diferencia. | `mostControversial` de `/rates/stats`, año. | Tarjeta oculta cuando la lista está vacía. No se informa por separado que no existan casos. |

**Filtros/interacción:** selector de año (predeterminado al año actual, opciones desde `getYearOptions()`); los gráficos tienen tooltips/hover; el modal de galaxia tiene cierre por botón, clic en backdrop y Escape. No se observa filtro por artista, género, rango arbitrario ni selector de usuario en esta sección.

**Roles:** cualquier sesión autenticada según la ruta (`requiresAuth: true`, sin `requiresRole` explícito). El sidebar clasifica la entrada como `requiredRole: user`. La petición Axios adjunta Bearer token de sesión mediante interceptor; autorización final del endpoint es responsabilidad backend y no se verificó.

**Carga/error/vacío de la vista:** `Statistics.vue` muestra «Cargando estadísticas…» y un mensaje genérico si falla `/rates/stats`. No ofrece botón de reintento. Durante carga/error no reemplaza automáticamente todas las tarjetas por estado global; quedan visibles tiles inicialmente a cero y las secciones/charts controlan su presencia por separado. En error de una recarga de año, las refs conservan los datos anteriores junto con el mensaje de error. No hay tratamiento diferenciado de error de contrato, no autorizado o falta de cobertura. La galaxia sí presenta estados de carga/error/vacío propios.

## 4. Contratos HTTP consumidos

La tabla refleja **exclusivamente el contrato frontend**. `api` es una instancia Axios con `VITE_API_BASE_URL`; el interceptor añade `Authorization: Bearer <token>` a solicitudes autenticadas y gestiona renovación/rechazo de sesión. No se inspeccionó el controlador/servicio backend.

| Método/ruta | Consumidor y parámetros | Respuesta que espera el frontend | Auth y límites |
|---|---|---|---|
| `GET /rates/stats` | `getRatesStats(year?)` en `src/services/rates/rates.ts`, llamada por `Statistics.vue` al montar y cuando cambia el año. Query opcional `year` (number). | `RatesStatsResponse`: `totalVotes`, `mean`, `median`, `totalUsers`, `rank`, `votesByGenre[]` (genre/count/topDisc), `votesByMonth[]` (month/count/weeks/topDisc), `votesByScore[]` (score/count), `votesByDay[]` (date/count), `topDiscOverall`, `mostControversial[]`, `yearOverYear`. Tipos en `rates.ts`. | Requiere sesión en la navegación y Axios envía Bearer si existe. La vista no pasa AbortSignal. Tipos no validan en runtime la forma o semántica de la respuesta. El DTO declara `yearOverYear` obligatorio aunque la vista lo trata como nullable; posible diferencia de nulabilidad. |
| `GET /rates/stats/discs` | `getUserRatedDiscs(year?)` desde `GenreGalaxyModal.vue`, solo al abrir el modal. Query opcional `year`. | Array `RatedDiscItem[]`: id/nombre/nota, artista por nombre, género opcional con color. | Misma sesión Axios. Sin AbortSignal ni caché. El frontend infiere ámbito personal por el endpoint sin `userId` y su uso, no verifica el backend. |

**Inconsistencias o preguntas de contrato:** frontend declara el mismo `year` opcional para las dos consultas y asume strings/números/objetos completos, pero no hay pruebas de servicio para ninguna de estas dos funciones. El filtro no prueba cómo interpreta el servidor el año o zona horaria. `yearOverYear` tiene tipo no nullable pero se guarda como `YearOverYear | null`. Falta evidencia de si el calendario cuenta altas de Rate, transiciones históricas `set`, o ambos `set`/`change`; no equiparar fuentes hasta verificar contrato/implementación del servidor.

Fuera del alcance de la ruta principal, Dashboard consume además `GET /rates/dashboard-summary` mediante `getRatesDashboardSummary(signal)`: DTO semanal con `activeRates`, media musical, géneros distintos, mejor disco, género dominante, comparación semanal y valoraciones recientes. Ese contrato incluye `Europe/Madrid` y señal de cancelación. Se anota como solapamiento, no como endpoint que Estadísticas llame.

## 5. Roles y navegación

- Sidebar «Estadísticas» → `/statistics`, visible para `user` (rol base autenticado según configuración actual).
- Router `Statistics` exige autenticación, sin permiso de rol más específico declarado.
- La ruta hermana `/activity` también es para usuario autenticado. Las rutas `/users/stats`, `/users/stats/users` y `/users/stats/inactivity` son estadísticas/actividad administrativas, restringidas a `superadmin`, con su entrada bajo «Usuarios».
- La protección del Router y ocultación del menú son controles de frontend. No prueban la política de autorización del servidor.

## 6. Pruebas existentes

No se encontró `Statistics.test.ts`, tests de componentes de `src/views/statistics/`, ni tests unitarios para `galaxyLayout`, `externalTooltip` o el plugin de portadas. `src/services/rates/rates.test.ts` prueba algunos endpoints Rates, pero no `getRatesStats` ni `getUserRatedDiscs`.

Pruebas relacionadas/adyacentes ya existentes:

- `src/router/activityPermissions.test.ts` registra que Estadísticas sigue como ruta independiente autenticada; `src/router/importPermissions.test.ts` cubre permisos de estadísticas administrativas de Identity.
- `src/layouts/default/components/SidebarMenuPermissions.test.ts` cubre que el menú mantiene una entrada de Estadísticas para roles de usuario.
- `src/components/StatsModal.test.ts` cubre el modal legacy no encontrado en uso productivo, no `/statistics`.
- Rates tiene pruebas de `getRatesDashboardSummary`; Dashboard widget tests cubren parte del comportamiento de sus vistas/consultas. No son cobertura de la pantalla de Estadísticas.
- Identity Activity tiene pruebas de sus contratos, queries y estados; Actividad independiente tiene pruebas de API, historial, filtros, agrupación y presentación. Cubren sus propios datos, no la tarjeta de calendario de `/statistics`.

Comportamientos de Estadísticas sin cobertura propia identificada: cambio de año y parámetros; valores y combinaciones del DTO; ranking/interanual; carga/error/empty/reintento o respuestas parciales; carrera entre años; calendarios y charts; navegación e interacción de galaxia, layout móvil/escritorio y fallo del segundo endpoint; diferencias entre Rates actuales y eventos `set`/`change`.

## 7. Solapamientos y dependencias con otros módulos

### Dashboard

- Dashboard incluye actividad/resumen de Rates recientes y periódicos desde `GET /rates/dashboard-summary` y piezas de resumen propias; en el checkout revisado también mantiene widgets de top valorado, portadas, artistas y exploración musical/social.
- Estadísticas presenta total/media/mediana/ranking por año, disco destacado, tendencias por mes/género/nota y discos polémicos. Se solapa semánticamente con métricas de valoración, top disco, género y recuentos, pero consume `/rates/stats` y un contrato diferente. No se demuestra que sus definiciones, períodos o poblaciones coincidan con las tarjetas de Dashboard.
- Dashboard personaliza composición/preferencias mediante sus módulos; `/statistics` es una página fija independiente. Ambas dependen de transporte/tipos legacy de Rates, pero no se observó dependencia directa de Dashboard desde Estadísticas.
- El inventario no asume que resumen de discos valorados, portadas valoradas, rachas/días activos o totales de Dashboard sean equivalentes a los campos del endpoint estadístico.

### Actividad

- `/activity` muestra eventos personales históricos `set`/`change`, agrupados por fecha, con filtros y total diario de `set` proporcionado junto al historial (`src/modules/activity`). Consume `/activity/history`; el frontend traduce y presenta el ledger.
- Estadísticas consume `votesByDay` del endpoint Rates por año y renderiza una cuadrícula diaria llamada «Calendario de actividad». Hay solapamiento visual/semántico en días activos y totales diarios, pero las fuentes y semánticas no están verificadas como equivalentes. El ledger diferencia acciones `set` y `change`, mientras la interfaz estadística solo expone `count`.
- El dashboard administrativo de Identity usa `/activity/summary`, `/activity/users`, `/activity/users/:userId` y `/activity/inactivity`, bajo superadmin, para actividad agregada/por usuario. No es la fuente de `/statistics` ni una vista personal equivalente.

### Catalog / Rates

- `rates.ts` define el dominio/servicio compartido y DTOs, incluida la visualización por géneros y discos. Estadísticas deriva conteos y distribución del payload y añade visualizaciones; la galaxia usa `RatedDiscItem` del endpoint dedicado.
- La galaxia usa género y su color recibido en cada disco; las gráficas muestran álbumes asociados a series. No se consulta aquí el store global de Catalog ni se observa consumo directo de módulos públicos `catalog/discs`/`catalog/artists`.
- Valoraciones actuales (`Rate`) y eventos de cambios históricos son conceptos distintos. Cualquier consolidación con Actividad o Dashboard debe confirmar si cada métrica mide filas actuales, votos creados, transiciones o historia disponible.

## 8. Problemas detectados y riesgos (sin corregir)

Impactos relativos al inventario, no severidad medida en producción:

| Impacto | Hallazgo verificable | Riesgo/limitación |
|---|---|---|
| Alto | La semántica histórica de `votesByDay` y de otros agregados procede solo de nombres/DTO frontend; no se verificó backend. | Comparar o fusionar con Actividad puede contar de manera diferente `set`, `change`, filas actuales o períodos sin cobertura. |
| Alto | No hay pruebas de la pantalla ni de los dos contratos Rates que la alimentan. | Filtros, payload incompleto, error, concurrencia y regresiones de datos no tienen red de regresión específica identificada. |
| Medio | La página y el modal ejecutan HTTP desde componentes con estado local; no hay cancelación, caché o validación runtime de DTO. | Peticiones repetidas y respuestas fuera de orden ante cambio rápido de año; respuesta antigua podría sobrescribir una nueva. La condición se deduce del `watch` que inicia promesas independientes y ausencia de guardas. |
| Medio | No hay estado de vacío uniforme; al fallar el refresh de año se conservan valores previos y se muestra error; tiles arrancan como ceros. | Puede resultar difícil distinguir valor cero, ausencia de datos y datos de filtro anterior. Los charts mensual/género permanecen en «Cargando gráfico…» con serie vacía. |
| Medio | `Statistics.vue` concentra ocho secciones, llamadas, refs, cálculos de resumen, filtro y estados. Componentes Chart implementan registro/configuración Chart.js, observador de tema y parte de transformación/presentación. | Crece el acoplamiento entre UI, estado remoto y adaptación de datos; dos charts repiten patrones de tooltip/portadas y vigilancia de tema. No se propone extracción aún. |
| Bajo / pendiente de confirmar | `StatsModal.vue` no tiene uso productivo encontrado; `/statistics` usa directamente tipos HTTP del servicio general Rates. | Candidato a código no usado y frontera difusa entre legacy y Estadísticas; búsqueda estática no prueba que ningún consumidor dinámico exista. |
| Bajo | Hay discrepancia de nulabilidad del campo `yearOverYear` entre interfaz de respuesta y tipo local de ref; `chartData` usa `any` en `MonthlyVotesChart`. | Debilita la precisión estática de casos sin comparación y del dataset. No se verificó si el backend omite o devuelve null. |

No se encontró Pinia ni uso de TanStack Query en esta sección: filtros efímeros y datos de servidor están ambos en estado local. No se observó acoplamiento directo a Identity/Layout aparte del Router, sidebar compartido, autenticación Axios y composable de viewport.

## 9. Preguntas que dieron origen a EST-2 (registro histórico de EST-1)

1. **Propósito y audiencia:** confirmar si `/statistics` debe seguir siendo un informe personal, qué comparaciones comunitarias puede presentar y si mantendrá acceso para todo usuario autenticado.
2. **Definición de cada métrica:** decidir qué significan «voto», día activo, total/media/mediana, ranking, top anual, distribución y discos polémicos; especificar período/año/zona horaria, uso de valoración actual frente a historial `set`/`change`, y cómo representar cobertura desconocida.
3. **Solapamientos:** decidir qué métricas deben permanecer en Dashboard, Estadísticas o Actividad y si calendario diario tiene propósito distinto al historial de Actividad. Aún no retirar ni duplicar ninguna.
4. **Contrato backend:** contrastar `/rates/stats` y `/rates/stats/discs` con backend/versiones desplegadas, nulabilidad, agregados, zona horaria, autorización, filtros admitidos y rendimiento. Definir cambios coordinados solo después de esa evidencia.
5. **Experiencia funcional:** decidir comportamiento para sin votos, año futuro, año sin datos, error parcial/total, filtros históricos incompletos y reintento; acordar si year-over-year es siempre relativo al año actual o al seleccionado.
6. **Alcance visual:** decidir si se conservan todas las visualizaciones, galaxia y comparación comunitaria, y qué información debe quedar en móvil/escritorio.
7. **Destino técnico:** después de cerrar semántica, elegir owner y fronteras de Estadísticas respecto de Rates/Catalog, Dashboard y Activity; decidir uso de Query para datos remotos y si hay un API/adaptador propio justificado. No se recomienda aquí una estructura o plan de migración concreto.
8. **Cobertura:** acordar casos de contrato, año, estados, accesibilidad y fuentes de datos antes de implementar.

EST-1 queda completada. Las preguntas anteriores se desarrollan en el análisis EST-2 que sigue; no se consideran decisiones funcionales aprobadas.

---

# EST-2 — Definición funcional y alcance de Estadísticas

**Estado: EST-2 completada como análisis y propuesta documental en el checkout del 2026-10-29.** Esto acredita que se han registrado el análisis y las recomendaciones; no aprueba las decisiones de producto pendientes. EST-3 y las fases posteriores siguen pendientes. No se modificaron código ejecutable, endpoints, backend, navegación, permisos ni visualizaciones.

## 10. Análisis funcional de las ocho funcionalidades

Las clasificaciones siguientes son recomendaciones para validar. “Conservar” describe la utilidad de producto propuesta; no significa que el usuario haya aprobado una evolución futura. Las limitaciones de datos se detallan en [semántica](#11-semántica-de-las-métricas) y [verificaciones backend](#17-incertidumbres-y-verificaciones-backend).

| Funcionalidad / clasificación recomendada | Pregunta y valor para la persona | Datos requeridos y significado que puede sostenerse hoy | Filtros, limitaciones y relación con Dashboard/Actividad |
|---|---|---|---|
| **1. Resumen de votos — Mejorar** | ¿Cuánto he valorado y qué notas suelo dar? El total, media y mediana son una síntesis rápida; el ranking añade contexto comunitario. | El DTO entrega `totalVotes`, `mean`, `median`, `rank` y `totalUsers`. No define si total equivale a filas Rate actuales, discos únicos o acciones, ni el universo/regla del ranking. La media y mediana tampoco declaran si solo incluyen notas no nulas ni periodo exacto. | Se solicita `/rates/stats?year=…`; la vista liga el resumen al año seleccionado. Year-over-year se presenta aparte y el código lo describe como ritmo del año actual independiente del filtro. Dashboard puede mostrar resúmenes más breves; el detalle anual/estadístico es distinto. Aclarar labels, unidad, cero/desconocido y comparación antes de cambiarlo. |
| **2. Disco destacado — Conservar** | ¿Qué disco sobresale entre mis valoraciones del período? Da un ejemplo concreto y navegable del informe. | `topDiscOverall` incluye disco, artista, nota y género opcional. “Destacado” parece ser la nota personal máxima según el nombre/título, pero el desempate y la fecha/período que determina su inclusión no se deducen del frontend. | La petición principal lleva año y la tarjeta se oculta sin disco. Dashboard también puede presentar un top personal, con contexto/periodicidad propios; conservar ambas apariciones solo si el ranking y período se explicitan. |
| **3. Votos por mes — Mejorar** | ¿En qué meses hubo más actividad o valoraciones? Ayuda a ver ritmo y cambios a lo largo del año. | `votesByMonth` da mes, `count`, semanas y disco destacado. El cliente lo etiqueta como votos/semana, sin saber si son votos actuales agrupados por fecha de creación, cambios o acciones históricas. El backend auditado previamente documenta agrupación mensual por `Rate.createdAt`, que fecha la fila, no cada transición; verificar que ese hallazgo corresponde a esta ruta/versión. | Año seleccionado; el chart muestra series recibidas y tooltips. Sin filas muestra “Cargando gráfico…” indefinidamente. No duplica la cronología de Actividad: agrega por mes, mientras Actividad conserva cada evento. Requiere unidad y zona temporal inequívocas. |
| **4. Votos por género — Mejorar** | ¿Qué géneros aparecen más en mis valoraciones? Hace visible el perfil musical por categoría. | `votesByGenre` ofrece género, `count` y `topDisc`. El chart recorta a los cinco primeros; el badge cuenta géneros devueltos, no necesariamente los dibujados. La unidad de `count` y la fecha de atribución de género (actual o snapshot) no están demostradas desde el frontend. | Año seleccionado. Añade agregación temática a Dashboard; Actividad puede mostrar snapshots de evento, pero no la misma distribución. Empty state actual ausente; el botón de galaxia depende de que haya filas. Confirmar si género corresponde al disco actual o al clasificado al votar. |
| **5. Calendario diario — Replantear** | ¿Qué días tuvieron actividad de voto y con qué intensidad? Muestra distribución diaria que un agregado mensual no puede mostrar. | `votesByDay` entrega fecha y `count`; el cliente colorea la intensidad respecto del máximo recibido y rellena visualmente con cero las fechas no presentes. No se sabe si cuenta `set`, `change`, Rate actual o una combinación. Una fecha ausente solo es cero si el contrato garantiza cobertura completa del día/año. | Año seleccionado. Se solapa con los totales diarios de `/activity`, que se derivan de `dailySetCounts`, pero esas fuentes no son equivalentes confirmadas. Mantener la cuadrícula si se aprueba como patrón anual; antes hay que decidir si representa días con `set`, acciones o discos distintos y cómo se expresa cobertura parcial. |
| **6. Distribución de puntuaciones — Mejorar** | ¿Cómo reparto mis notas? Describe severidad/generosidad y concentración de valoraciones. | `votesByScore` contiene `score` y `count`; el frontend lo grafica como “Distribución de notas”. La cifra podría ser histograma de notas vigentes, pero el DTO no declara si incluye solo valores musicales no nulos, si agrupa valores decimales o qué período aplica. No representa por sí misma cambios históricos. | Año seleccionado. Más profundidad que cualquier resumen breve de Dashboard y no es cronología de Actividad. Sin filas el chart queda en estado de carga. Acordar fuente (valoración actual recomendada para describir notas vigentes) y denominador/cobertura antes de presentarlo como distribución completa. |
| **7. Discos polémicos — Mejorar** | ¿En qué discos mi nota difiere de la comunidad? Añade perspectiva comparativa y puede invitar a explorar desacuerdos. | Cada fila presenta nota personal, promedio comunitario y `diff`; el copy afirma distancia respecto de la media. El frontend no confirma si `diff = userRate - communityAverage`, cómo se ordena, cuántas valoraciones comunitarias mínimas exige cada media ni si comunidad/año usan la misma población. | Año seleccionado por la petición principal. Es la única visualización explícitamente comparativa con comunidad; no equivale al ranking del Dashboard. Debe mostrar método/unidad y distinguir un conjunto vacío de un fallo o falta de datos. No proponer un umbral/fórmula nueva sin producto y contrato backend. |
| **8. Galaxia de discos — Conservar** | ¿Qué discos he valorado y cómo se agrupan por género? Es una exploración visual que permite inspeccionar discos individualmente. | `/rates/stats/discs` espera discos con nota actual, artista y género/color. Escritorio: un disco por estrella, color por género, radio según nota, y posición determinista agrupada por género (sin codificar otra métrica); hover muestra información. Móvil: burbuja por género, tamaño según cantidad de discos; al seleccionarla lista discos ordenados por nota. | Se abre bajo demanda y envía el año elegido. El año de `/rates/stats/discs` debe coincidir semánticamente con el resumen aunque hoy solo se confirma que se envía el mismo parámetro. El coste queda diferido hasta abrir; la llamada no usa caché ni cancelación explícita y tiene estados propios de carga/error/vacío. Aporta exploración por disco/agrupación, no un reemplazo de la serie mensual o el histograma. |

No se recomienda descartar ninguna de las ocho con la evidencia disponible. Calendario requiere una decisión de significado, no una retirada automática. Las demás son mantenibles si sus etiquetas y poblaciones se alinean con métricas verificables.

## 11. Semántica de las métricas

### Conceptos que no deben tratarse como sinónimos

| Concepto | Definición funcional | Qué puede responder | Límite actual |
|---|---|---|---|
| **Votos actuales / valoraciones vigentes** | Estado actual de la nota musical en Rate; una nota nula significa que no hay valoración musical vigente. La nota `0` sí es válida según el DTO de Rates documentado en la auditoría previa. | Cuántos discos tienen nota vigente y cuál es su nota hoy. Una valoración borrada o puesta a null deja de formar parte del estado actual. | No revela cuándo se fijó o modificó cada nota, ni cambios intermedios, ni recupera elementos eliminados. Estadísticas debe declarar si sus conteos parten de este estado. |
| **Evento `set`** | Según la auditoría D-B1.1 de eventos, transición de nota musical nula/ausente a no nula. | Una asignación observada dentro de la cobertura del ledger. | No significa necesariamente primer voto histórico: también puede ser una reasignación posterior a una retirada. Los eventos legacy no identifican disco/target/valores. |
| **Evento `change`** | Transición entre dos notas musicales no nulas y distintas, según D-B1.1. | Una modificación observada, no un nuevo disco necesariamente. | No guarda los valores previos/nuevos ni el disco en el ledger actual documentado. No equivale a sumar un Rate vigente. |
| **Discos únicos valorados** | Número de discos distintos con nota vigente, o número de discos distintos tocados por eventos en un período. Son métricas diferentes y deben nombrarse por separado. | Cobertura de catálogo personal vigente, o variedad de discos asociados a actividad. | El ledger actual documentado no lleva `discId`; el estado actual no incluye discos cuya valoración se retiró o borró. |
| **Acciones de voto** | Número de transiciones/operaciones musicales que definió el producto para contar. Podría contar `set`, `change` o ambas, pero debe decirlo. | Volumen de actividad, si hay eventos completos y rango cubierto. | No asumir `set + change` como la unidad actual de `totalVotes`; legacy, clears y eliminaciones no quedan representados de forma completa. |
| **Distribución de notas actuales** | Histograma del valor musical vigente por disco valorado, cada Rate contado una vez según su valor actual. | Forma de las puntuaciones existentes en el momento de consulta. | Su inclusión de valores null, valores decimales, período y cobertura debe confirmarse. Un cambio reemplaza la nota anterior; no forma dos entradas históricas. |
| **Distribución histórica** | Histograma de valores fijados a lo largo del tiempo, solo reconstruible si cada evento identifica disco/target/valor previo/nuevo y su cobertura es suficiente. | Evolución de notas o cambios en períodos. | El ledger documentado no guarda disco ni valores; eventos anteriores a `started_at` no se backfillan fielmente. Rate actual, `createdAt` y último `editedAt` no reconstruyen la secuencia. No prometerla con las fuentes presentes. |

### Limitaciones históricas que condicionan producto

La auditoría backend D-B1.1 registrada en [el roadmap de Dashboard](dashboard.md#d-b11--auditoría-de-eventos-de-votación) describe un ledger de captura inicialmente vacío, con `set`/`change`, sin relación al disco ni snapshot de valores/target, y sin eventos `clear` o eliminación. También advierte que RatesHistory sintetiza como máximo creación/última edición, no la secuencia. Estas conclusiones previas son antecedentes útiles, pero **no verifican aquí los controladores vigentes de `/rates/stats` ni sus respuestas desplegadas**.

La misma auditoría registra que los agregados RatesStats trabajan sobre Rates actuales y señala una semántica de año mezclada: filtrado por año de lanzamiento del disco, con agrupación mensual según `Rate.createdAt`. Esto difiere de “actividad ocurrida en el año elegido” y `createdAt` fecha la fila, no el primer voto musical (puede haber Rate por portada). Debe confirmarse en backend si sigue siendo el comportamiento exacto de las dos rutas consumidas por Estadísticas.

Por estas limitaciones, no deben inferirse eventos anteriores al corte, un primer voto, las valoraciones eliminadas/retiradas ni una distribución histórica completa. Un período que no tiene eventos puede significar cero dentro de cobertura completa, actividad anterior al ledger, falta de atribución o desconocimiento. El frontend no puede convertir estos estados en un cero inventado.

## 12. Selector de año

### Comportamiento existente confirmado en frontend

- Al montar, `selectedYear` toma `new Date().getFullYear()` del navegador. `getYearOptions()` genera todos los años desde 2025 hasta el año local actual, o añade el siguiente solo durante diciembre local. No consulta años disponibles ni actividad real.
- Al cambiar, la vista llama `/rates/stats` con ese `year`; la galaxia envía el mismo valor a `/rates/stats/discs` al abrir. El código usa `year || undefined`, así que el filtro se omite si no hay año seleccionado.
- La comparativa `yearOverYear` tiene un copy explícito de año actual frente al anterior y el comentario dice que no depende del selector. No es una serie controlada por el mismo año elegido.
- El calendario construye días con fechas `Date` locales del navegador y etiqueta el año seleccionado. Las solicitudes no envían zona horaria.

### Propuesta recomendada (pendiente de validación)

1. El selector debe significar un **año civil de análisis común a todas las tarjetas dependientes del período**. El filtro enviado a la galaxia debe mostrar el mismo conjunto anual que el resto, sujeto a que backend confirme que ambos endpoints interpretan `year` de igual forma.
2. El año predeterminado debe ser el año civil actual en una zona IANA de producto definida, no depender accidentalmente de la zona del dispositivo. `Europe/Madrid` es candidata coherente con el DashboardSummary y la actividad diaria existente, pero Estadísticas no debe adoptarla sin verificar el contrato y aprobar esa referencia temporal.
3. Los años con y sin actividad deben poder distinguirse. Hasta que exista una fuente backend de años disponibles, presentar el año sin datos como un período válido vacío y no derivar disponibilidad de una respuesta de listas vacías. No mostrar años futuros salvo decisión de producto/contrato; el comportamiento especial de diciembre no demuestra que haya datos futuros.
4. Al cambiar de año, toda la respuesta del año anterior debe dejar de presentarse como si fuera la nueva. La carga debe asociarse al valor seleccionado; si la API falla, conservar datos anteriores solo con identificación clara del año y sin mezclar mensaje de error con ceros iniciales.
5. Año sin actividad: ofrecer estado vacío en cada tarjeta; no ocultar silenciosamente calendarios ni dejar gráficos “cargando”. Un cero debe significar cero confirmado dentro de cobertura completa; “desconocido/parcial” debe tener estado o texto diferenciado.
6. `yearOverYear` es una excepción actual explícita. Recomiendo mantenerlo como comparación del año actual contra el anterior, fuera del filtro, solo si el copy lo etiqueta como tal. Alternativa: hacerlo relativo al año seleccionado y comparar con el año previo; no elegir hasta confirmar payload backend y aprobar la intención.

No se propone nuevo parámetro HTTP. Primero verificar si las rutas existentes aceptan o aplican zona/población de manera consistente. Las métricas por día, mes y año requieren una zona IANA acordada en frontend y backend; los meses/años del selector deben seguir esa misma referencia, especialmente junto a medianoche y cambios DST.

## 13. Relación funcional con Dashboard y Actividad

Se preservan los cierres registrados en [Dashboard](dashboard.md#cierre-definitivo-de-dashboard--frontend-2026-10-28) y [Actividad](activity.md). EST-2 no modifica esas capacidades.

| Sección | Propósito que se mantiene | Solapamiento aceptable | Frontera que debe respetarse |
|---|---|---|---|
| **Dashboard** | Resumen personal rápido y útil, widgets y señales de uso inmediato. | Una métrica puede aparecer también en Estadísticas si Dashboard presenta una cifra breve y Estadísticas su distribución, período, comparación o contexto detallado. | No usar la repetición para asumir mismos denominadores, ventanas o fuentes. Dashboard está cerrado; esta tarea no pide cambiar sus tarjetas ni su contrato. |
| **Actividad** | Cronología personal de eventos individuales `set`/`change`, con fecha/filtros y datos históricos disponibles. | Un calendario resumido puede coexistir si cuenta una magnitud declarada y la fuente/cobertura coincide o la diferencia se explica. | El historial conserva eventos y valores históricos; Estadísticas no debe reconstruirlos desde Rates actual ni presentar una suma diaria como si fuera la cronología. Actividad está cerrada; no modificarla. |
| **Estadísticas** | Análisis detallado de hábitos y valoraciones musicales: agregados por tiempo, género y nota, comparaciones y exploración de discos. | Puede repetir total/top/tendencia que aparezca en Dashboard con mayor profundidad y período explícito. El calendario solo si la unidad queda resuelta. | Cada visualización declara si analiza estado actual, acciones/eventos observados o población comunitaria. No mezclar fuentes como si fueran una sola serie. |

## 14. Visualizaciones especiales

### Calendario diario

El frontend actual da forma a cada celda como `date/count`, la omisión de fecha se representa visualmente como cero y la intensidad compara cada conteo con el máximo de la serie. No permite distinguir día sin actividad de día no cubierto. Tres alternativas razonables para la unidad son (a) eventos `set`, más coherente con la etiqueta de día activo; (b) todas las acciones `set + change`, como volumen de cambios; (c) discos únicos valorados por fecha. Recomiendo **`set` musicales observados por día** si el objetivo es “días de voto”, porque evita llamar voto a un cambio; esta recomendación depende de cobertura y de atribución de eventos que el ledger actual no tiene para todo el historial. Si no puede servirse esa métrica completa, conservar `votesByDay` solo tras documentar su unidad real, o presentar cobertura parcial/desconocida.

Días sin actividad dentro de un período cubierto deben aparecer con intensidad cero. Días antes del corte histórico, días sin atribución y fechas ausentes de una serie dispersa no se pueden declarar cero hasta que el contrato establezca cobertura completa. La zona del día debe ser una zona IANA de producto y coincidir con la de la agregación backend.

### Discos polémicos

La interfaz permite entender una intención general: lista discos cuya nota propia más se separa de un promedio comunitario, y muestra ambos valores junto con `diff`. No explica la fórmula exacta, el signo (personal menos comunidad o valor absoluto), orden, desempate, tamaño mínimo de muestra ni población comunitaria. El nombre “polémico” puede sugerir desacuerdo social más fuerte que una diferencia respecto de la media; no se muestra distribución ni intervalo de incertidumbre. Mantener el nombre solo si el backend confirma una definición estable y el producto acepta el término; alternativa de copy más literal: “Mayor diferencia con la media de la comunidad”. No diseñar ahora una nueva fórmula.

### Galaxia de discos

- **Objetivo actual:** exploración de los discos personales por género, secundaria al gráfico agregado. Abre solo desde la tarjeta de género y carga datos bajo demanda al montar el modal.
- **Unidad:** una estrella/esfera de escritorio y una entrada en la lista móvil por disco entregado por el endpoint. La respuesta usa nota musical actual y género opcional.
- **Variables:** color refleja color de género del payload o gris de fallback; posición determinista organiza grupos/constelaciones por género y dispersa discos para legibilidad; el radio de escritorio escala con la nota; no representa fecha, cantidad de acciones o rating comunitario. En móvil, cada burbuja es un género, su tamaño escala con número de discos de ese género y la selección revela discos ordenados por nota.
- **Año:** la UI manda el año seleccionado, pero los criterios temporales de ambos endpoints pueden diferir; confirmar igualdad del conjunto/población antes de llamarla galaxia del mismo año.
- **Interacciones:** escritorio permite arrastrar, zoom con rueda y botones, reiniciar vista y hover con tooltip; móvil permite seleccionar/deseleccionar género y ver sus discos/notas. El modal cierra por botón, backdrop o Escape.
- **Aporte:** permite explorar elementos y agrupaciones que se pierden en la barra agregada. No es una estadística independiente ni justifica sustituir otras visualizaciones.
- **Carga diferida:** evita la segunda petición en cada visita a la ruta; paga latencia al abrir. El modal ya distingue carga/error/vacío, pero no expone reintento y no cancela ni cachea petición. Su fallo debe dejar utilizable el resto del informe y limitar el error a esta exploración.

No se rediseña ni sustituye la galaxia en EST-2.

## 15. Estados vacíos, errores, parcialidad y carácter personal

### Estados funcionales recomendados

| Situación | Respuesta esperada |
|---|---|
| Nunca ha valorado un disco | Estado personal inicial sin datos. No presentar `0` como respuesta estadística antes de recibir una respuesta válida; indicar cómo empezar si el copy de producto lo permite. No calcular media, mediana, ranking, distribución o polémicas ficticias. |
| Año válido sin actividad | Estado vacío del período seleccionado. Mostrar cero solo para conteos que backend confirme como completos; media/mediana/top/ranking pueden ser no aplicables y deben diferenciarse de cero real. |
| Datos parciales o serie incompleta | Mostrar únicamente métricas válidas y marcar cobertura parcial/desde cuándo, si la API ofrece esa información. Si no permite conocerla, estado “no disponible/semántica pendiente”, no rellenar períodos faltantes como cero. |
| Visualización insuficiente | Empty state específico si falta una serie, hay una sola clase de dato o faltan datos necesarios para comparar. No mantener “cargando” ni ocultar una tarjeta de manera que parezca omisión accidental. |
| Falla `/rates/stats` | Error de informe general, separado de cero/vacío. Recomendación: permitir reintento; nunca presentar refs inicializadas en cero como datos cargados. Si queda visible respuesta anterior, identificar año y estado obsoleto claramente. |
| Falla solo `/rates/stats/discs` | Error local a la galaxia/modal, con posibilidad de reintento recomendada. El resto de estadísticas permanece válido. No sustituir por una galaxia parcial/inventada. |
| Métrica indeterminable | “No disponible”/“No se puede determinar” con alcance claro, distinto de 0. No inferir a partir de Rates actuales cuando se requiere historia, ni a partir de ausencia de filas cuando cobertura no está confirmada. |

Estas son propuestas funcionales; no se implementan en EST-2. El tipo actual de respuesta no declara metadatos de cobertura, y `yearOverYear` presenta una discrepancia de nulabilidad entre DTO y consumo frontend. Resolver contrato/representación antes de estimar el tratamiento de parciales.

### Acceso y carácter personal

El inventario confirma que la ruta es personal en intención y uso frontend: título “Tus votos”, menú visible para `user`, `collaborator`, `riffvalley` y `superadmin` (rol mínimo `user`), ruta con sesión autenticada, cliente Axios que adjunta token y llamadas sin `userId` explícito. Los valores agregados de usuarios (`rank / totalUsers`, media comunitaria) son referencias globales/comunitarias dentro de un informe que por lo demás se presenta como personal; conviene etiquetarlas como comparación y confirmar población.

El frontend no demuestra que backend derive siempre al sujeto de la sesión, impida solicitar datos ajenos o autorice ambos endpoints. La autorización e aislamiento efectivos y si hay otra estadística global mezclada requieren verificación backend. No se proponen cambios de rol, navegación o autenticación.

## 16. Matriz de decisiones

**Cómo leer el estado:** `Aprobado` se usa únicamente para comportamientos actuales confirmados que el alcance de EST-2 debe preservar. No equivale a aprobación del usuario de una recomendación futura. Las recomendaciones figuran como `Pendiente`; las cuestiones de implementación/backend, como `Requiere verificación backend`. Ninguna recomendación de producto de esta sección se declara aprobada.

| ID | Funcionalidad | Comportamiento actual confirmado | Propuesta recomendada | Justificación | Impacto estimado | Estado |
|---|---|---|---|---|---|---|
| EST2-P01 | Alcance de la página | `/statistics` se presenta como “Tus votos en cifras”; la ruta exige autenticación y el menú usa rol mínimo user; comparación comunitaria aparece dentro de la página. | Conservar informe personal y etiquetar comparaciones de población global; validar población efectiva. | Mantiene identidad clara sin negar datos comunitarios ya visibles. | Bajo: copy/contrato si se aprueba. | Pendiente |
| EST2-P02 | Ocho funcionalidades | Hay ocho secciones enumeradas en inventario; galaxia carga separadamente bajo demanda. | Conservar las ocho; no retirar ninguna por ahora. Mejorar nombres/empty states; replantear semántica de calendario. | No hay evidencia suficiente de duplicación total; análisis temporal, notas, género y exploración ofrecen vistas diferentes. | Bajo/medio, depende de decisiones. | Pendiente |
| EST2-M01 | “Número de votos” y resumen | UI etiqueta `totalVotes`; el DTO no explica la unidad. Auditoría previa describe estadísticas basadas en Rates actuales, sujeto a confirmar esta ruta. | No llamar “acciones” o “discos únicos” al total hasta confirmar. Nombrar y calcular según contrato acordado; distinguir Rating actual de eventos. | Evita presentar denominadores incompatibles como equivalentes. | Medio, puede requerir respuesta/tipo backend. | Requiere verificación backend |
| EST2-M02 | Eventos históricos | D-B1.1 describe `set` como null→valor y `change` como valor→valor distinto; el ledger documentado no incluye disco/valores ni `clear`/delete y tiene corte de cobertura. | No reconstruir historia desde Rate actual ni atribuir eventos legacy. Mantener separado el ledger de agregados actuales. | La secuencia y discos históricos no son recuperables de esos campos. | Alto si se solicita analítica histórica; fuera de EST-2. | Requiere verificación backend |
| EST2-M03 | Distribución de notas | La UI renderiza `score/count`; no hay semántica frontend sobre universo/periodo. | Recomendar histograma de valoraciones musicales actuales dentro del período definido; reservar “distribución histórica” a eventos completos y con cobertura. | Una nota actual es estado, no suma de asignaciones/cambios. | Medio. | Pendiente |
| EST2-M04 | Género | UI cuenta series por género y toma color/topDisc del payload; no captura snapshot temporal. | Aclarar si se cuenta/clasifica por género actual de Catalog o snapshot al valorar; no etiquetar como histórico mientras no haya snapshot. | El género mutable puede cambiar atribuciones previas. | Medio/alto si se cambia agregación. | Requiere verificación backend |
| EST2-Y01 | Selector de año | Año actual local por defecto; opciones 2025→actual, salvo siguiente añadido en diciembre; mismo parámetro enviado a dos endpoints. | Año civil común, dentro de zona IANA acordada; evitar futuro, y resolver años sin datos como vacíos explícitos. No añadir parámetros antes de contrastar contrato existente. | Opciones estáticas no prueban disponibilidad; móvil/servidor pueden estar en zonas distintas. | Medio. | Pendiente |
| EST2-Y02 | Año interanual | Copy actual compara año corriente y anterior aunque se seleccione otro año; el comentario dice que no depende del filtro. | Mantener excepción claramente rotulada o, como alternativa, hacerla relativa al seleccionado; escoger tras confirmar DTO y propósito. | Evita que parezca parte del filtro cuando no lo es. | Bajo/medio. | Pendiente |
| EST2-T01 | Días, meses y año civil | Calendario construye días con hora local del navegador; API stats no recibe timezone en el cliente. | Definir una zona IANA de producto compartida con backend; `Europe/Madrid` candidata, no acordada. | Agrupaciones próximas a medianoche/DST pueden divergir entre cliente, servidor y Actividad. | Medio/alto si cambia cómputo. | Pendiente |
| EST2-C01 | Calendario diario | Recibe `date/count`; ausencia de fecha se pinta como día cero; título “actividad”. | Recomendación inicial: `set` musical observado por fecha local si la cobertura lo permite; alternativamente documentar la unidad actual si debe conservarse. Aclarar cobertura y no declarar cero fuera de ella. | “Día con voto” es distinto de editar Rate o contar discos; Activity ya expone total diario de set por contrato propio. | Medio/alto, posiblemente exige backend. | Pendiente |
| EST2-K01 | Discos polémicos | Se muestran `userRate`, `communityAverage`, `diff`, copy indica alejamiento de la media. | Publicar definición, orden, población y mínimo muestral; no inventar fórmula/umbral. Considerar copy literal si “polémico” exagera el dato. | El usuario necesita interpretar el ranking y confiabilidad del promedio. | Medio. | Requiere verificación backend |
| EST2-G01 | Galaxia | Un elemento por disco; color por género; radio escritorio por nota; móvil tamaño por recuento de discos/género; consulta solo al abrir y usa el año elegido. | Conservar propósito e interacciones; confirmar universo/filtro igual al endpoint general. Futuro reintento/cache/cancelación se evalúa técnicamente luego. | Aporta exploración y difiere carga, aunque no reemplaza análisis agregado. | Bajo funcional; trabajo técnico posterior sujeto a arquitectura. | Pendiente |
| EST2-S01 | Vacíos y errores | Tiles inician como cero; varias series vacías quedan en “Cargando”; calendario/lista destacada/polémicas se ocultan al estar vacíos; galaxia tiene carga/error/vacío. | Distinguir carga, error, cero completo, vacío y desconocido; empty/error por tarjeta y reintento donde corresponda. | Evita cifras inventadas y errores indistinguibles de ausencia de actividad. | Medio. | Pendiente |
| EST2-A01 | Privacidad | Request sin `userId`, navegación autenticada; Axios adjunta Bearer; UI incluye estadísticas de comunidad. | Preservar acceso actual sin tocar permisos; verificar aislamiento backend y documentar comparativas globales. | Los guards frontend no prueban autorización del endpoint. | Sin cambio frontend de permisos; auditoría backend. | Requiere verificación backend |
| EST2-R01 | Frontera con Dashboard/Actividad | Dashboard/Actividad aparecen cerrados en sus roadmaps; fuentes/poblaciones actuales no son equivalentes demostradas. | No reabrirlos. Permitir repetición de cifra solo con profundidad/contexto distintos y origen explícito. | Conserva objetivos de cada sección y evita reconciliación accidental de contratos. | Bajo. | Aprobado |

## 17. Incertidumbres y verificaciones backend

Verificar contra el código backend vigente (y, cuando corresponda, la respuesta de una base aislada representativa; no producción) antes de cerrar decisiones dependientes:

1. Usuario/población efectiva y autorización de `/rates/stats` y `/rates/stats/discs`; garantías de aislamiento bajo bearer y equivalencia personal.
2. Significado, período, denominador y nulabilidad de cada campo DTO: `totalVotes`, `mean`, `median`, `rank`, `totalUsers`, `votesByGenre`, `votesByMonth` y `weeks`, `votesByScore`, `votesByDay`, `topDiscOverall`, `mostControversial` y `yearOverYear`.
3. Qué filtra `year` en cada ruta; si ambos endpoints devuelven la misma población. Resolver el hallazgo previo de año de lanzamiento frente a `Rate.createdAt` y si se consideran Rates vigentes/null/deleted.
4. Fórmula y orden del top disco; desempates, reglas de nota, fechas y exclusión de portada-only/null.
5. Fuente de `votesByDay` y unidad exacta; omisión versus cero; días/años con cobertura completa. Reconciliarlo con el ledger y `dailySetCounts` de Activity sin asumir igualdad.
6. Universo del promedio comunitario, datos mínimos por disco, cálculo/signo/orden de `diff`, período y filtro para controversia.
7. Género y color son actuales o snapshots; efecto de una reclasificación de disco en históricos.
8. Zona IANA usada para límites anual/mensual/diario, contrato de fechas y comportamiento DST/medianoche. No hay timezone enviado por los helpers Estadísticas actuales.
9. Corte real `rate_vote_event_capture.started_at` por entorno, filas legacy, transiciones no representadas y semántica de `set`/`change` vigente. No backfill fiel de Rate actual; verificar si hay evolución del ledger desde la auditoría D-B1.1.
10. Qué representa `yearOverYear` (actual vs previo, “a día de hoy”, independencia del query) y si puede ser nulo/ausente; alinear DTO real con el tipo frontend.

La revisión EST-2 se limita a frontend/documentación y a antecedentes registrados en los roadmaps. No inspecciona ni declara verificados el backend actual, despliegues, SQL, datos productivos o autorización efectiva.

## 18. Propuesta de siguientes tareas

Secuencia pequeña, con separación de owners. EST-1, EST-2 y EST-2a están completadas como trabajo documental. La propuesta de revisión EST-2R que figuraba al cerrar EST-2 se concreta ahora en la matriz §21; la revisión y aprobación de producto siguen pendientes. Los siguientes renglones no forman un plan técnico aprobado.

| Orden / tarea propuesta | Responsable y tipo | Alcance acotado | Dependencia / salida |
|---|---|---|---|
| **EST-2R — Revisión y aprobación de decisiones funcionales** | Producto, decisión | Revisar `EST-DEC-01` a `EST-DEC-11`; aceptar, rechazar o ajustar cada recomendación y registrar las decisiones expresas. Sin implementación. | Antes de cerrar decisiones dependientes en EST-3. No requiere tocar Dashboard ni Actividad. |
| **EST-BE-V1 — Verificación de contratos** | Backend, análisis de solo lectura | Contrastar ambas rutas/DTO con los puntos 1–10 de §17; registrar comportamiento exacto y pruebas/fixture segura para períodos, nulls, TZ, cobertura y autorización. | Puede empezar en paralelo con la validación de copy; bloquea cualquier decisión dependiente. No cambiar endpoints en esta tarea. |
| **EST-BE-D1 — Diseño backend condicional** | Backend, diseño | Solo si se aprueban métricas que el contrato actual no puede producir: definir fuente, coverage, zona, historial atribuible y contratos mínimos. Tratar por separado Rates actuales y ledger; no inferir legacy. | EST-2R + EST-BE-V1; decisión de arquitectura/backend y revisión específica antes de implementación. |
| **EST-FE-1 — Contrato frontend Estadísticas** | Frontend, especificación | Traducir decisiones aprobadas y verificación a campos/nulabilidad/unidades/empty/partial states; declarar compatibilidad de las dos rutas sin cambiarlas. | EST-2R + EST-BE-V1; puede descubrir requisito EST-BE-D1. |
| **EST-BE-2 — Implementación backend de contrato** | Backend, implementación | Solo las ampliaciones aprobadas y diseñadas en EST-BE-D1; pruebas unitarias/SQL/cobertura/TZ/aislamiento según el alcance. | Aprobación backend separada; contrato y rollout acordados. No forma parte de EST-2. |
| **EST-FE-2 — Integración funcional frontend** | Frontend, implementación | Consumir el contrato estable; unidades/estados/filtros/año y errores según decisiones; mantener ocho visualizaciones salvo decisión explícita distinta. | EST-FE-1 y, si aplica, EST-BE-2. No fijar aún estructura modular, Query ni migración Rates. |
| **EST-UI-1 — Mejoras visuales** | Frontend, presentación/accesibilidad | Estados vacíos/errores, claridad de unidades y referencias de controversia, tema claro/oscuro, teclado/tooltip y responsive. Sin rediseñar la galaxia antes de decidir. | EST-FE-2; consultar `docs/design-system.md`, definir criterio visual y luego revisión visual si se solicita. |
| **EST-QA-1 — Tests y cierre** | Frontend/backend según owner, verificación | Contratos, años/filtros, poblaciones, sesiones, cobertura, vacío/error/partial, consistencia de ambas rutas, fecha/DST y regresión de las ocho visualizaciones. Cerrar EST solo con evidencia local y backend claramente separadas. | Implementaciones aprobadas completas; aceptación de producto. |

### Cuestiones que deben cerrarse antes de arquitectura (EST-3)

- Qué es una unidad de voto en cada tarjeta: Rate vigente, disco único, evento `set`, `change` o acción agregada.
- Qué preguntas son análisis de estado actual y cuáles requieren historia; qué rango está cubierto y cómo comunicar legado desconocido.
- Qué año filtra (año civil de actividad, lanzamiento, creación del Rate u otra regla), zona IANA y relación del comparativo interanual con el selector.
- Si calendario mide `set`/acciones/discos, y si los datos actuales permiten cobertura completa.
- Definición aceptada y presentación de “discos polémicos”, población comunitaria y muestra mínima.
- Si género refleja Catalog actual o clasificación al valorar; si se acepta reclasificación retroactiva.
- Tratamiento de empty/partial/unknown, de errores de carga principal y secundaria, y de datos previos al corte del ledger.
- Confirmación de ámbito personal, comparación global deliberada y aislamiento real de los endpoints.
- Confirmación de que las ocho funciones se conservan, más excepciones concretas si producto decide otra cosa.

Hasta resolver estas cuestiones no se propone ownership de API/tipos, estructura de módulos, caché/Query, consolidación de servicios Rates ni plan de migración. EST-3 permanece pendiente.

## 19. Criterios de aceptación de EST-2

- [x] Se conservaron el inventario, mapa de archivos, contratos frontend, accesos, pruebas y hallazgos EST-1.
- [x] Se analizaron las ocho funciones con pregunta, valor, datos, significado confirmado/desconocido, filtro, limitación y relación con Dashboard/Actividad.
- [x] Se distinguieron Rates actuales, `set`, `change`, discos únicos, acciones, distribución actual e histórica, y se registraron límites de ledger/cobertura.
- [x] Se documentaron selector de año, estados vacíos/errores/parciales, calendario, controversia, galaxia y acceso personal.
- [x] La matriz registra identificador, comportamiento actual, recomendación, justificación, impacto y estado sin presentar recomendaciones como aprobadas.
- [x] Se identificaron verificaciones backend y una secuencia futura separando contrato, backend, frontend, visuales y QA.
- [x] EST-3 y las fases posteriores siguen pendientes; no se implementó código ni se alteró Dashboard o Actividad.
- [x] Enlaces nuevos comprobados y `git diff --check` validado para los documentos de esta tarea (2026-10-29).

---

# EST-2a — Definición y validación de decisiones funcionales

**Estado: EST-2a completada como especificación documental en el checkout del 2026-10-29.** La matriz queda preparada para revisión. No hay decisiones de producto aprobadas expresamente en esta tarea; las observaciones actuales confirmadas describen frontend y no son aprobación de recomendaciones. EST-3 sigue pendiente y esta tarea no investigó backend, cambió contratos ni inició trabajo de implementación. Se conservan íntegros los hallazgos de EST-1 y EST-2.

## 20. Propuesta funcional

### Unidades y uso por funcionalidad

Estos conceptos son distintos y no deben combinarse bajo la etiqueta genérica «votos» sin explicitar la unidad:

- **Valoraciones vigentes:** discos con una puntuación musical válida del usuario en el momento de consulta. Describen preferencias actuales.
- **Eventos `set`:** asignaciones observadas en que una puntuación pasa de `null` a un valor. Describen actividad histórica de asignación dentro de la cobertura real del ledger; no prueban que sea el primer voto del disco.
- **Eventos `change`:** cambios observados de una puntuación existente a otra distinta. Se muestran separados y no se suman automáticamente como votos nuevos.
- **Discos únicos:** cantidad de discos diferentes, contados una vez, ya sea en el estado vigente o dentro de un conjunto de eventos claramente especificado.

El ledger documentado no permite reconstruir un historial completo de puntuaciones: no se deben inferir notas antiguas, discos asociados ni eventos que nunca se registraron.

| Funcionalidad existente | Unidad recomendada | Alcance temporal recomendado y cautela |
|---|---|---|
| Resumen de votos | Indicador principal: discos con valoración vigente. Indicador de actividad, si producto lo quiere: eventos `set`; `change` puede mostrarse aparte. | El total actual no tiene unidad confirmada. No sumar estados actuales y eventos en una sola cifra. La propuesta mínima prioriza discos vigentes y media vigente; dejar `set`/`change` como indicadores adicionales sujetos a aprobación y cobertura. |
| Disco destacado | Una valoración vigente por disco candidato; seleccionar desde las valoraciones incluidas en el período acordado. | La nota máxima es una hipótesis basada en el nombre/UI, no el algoritmo actual confirmado. El filtro anual debe aplicar el mismo universo que el resumen si backend lo permite. |
| Votos por mes | Eventos `set` agrupados por mes. | Actividad de asignación dentro del año elegido; mantener la unidad del calendario diario. No usar `change` ni atribuir una valoración vigente a un mes sin explicarlo. |
| Votos por género | Eventos `set` atribuidos a los géneros asociados al disco. | Recomendación inicial: cada evento contribuye íntegramente a cada género asociado; un disco con dos géneros cuenta una vez en cada uno. La suma por género puede superar el total general. Confirmar si se usan géneros actuales de Catalog o snapshot histórico. |
| Calendario diario | Eventos `set` agrupados por día local. | Actividad de asignación por día. `change` queda fuera; fechas ausentes solo son cero con cobertura completa confirmada. |
| Distribución de puntuaciones | Valoraciones vigentes, una observación por disco con nota válida. | Histograma del estado actual, no de puntuaciones históricas al cierre de un año anterior. El efecto del año depende de qué cohortes de Rates puede seleccionar el backend. |
| Discos polémicos | Nota vigente personal y media comunitaria para discos elegibles, con discos únicos en el ranking. | No cambiar el cálculo existente hasta conocerlo. El año debe filtrar la misma población de discos de ambos lados si esa es la semántica confirmada. |
| Galaxia de discos | Discos únicos con valoración vigente que devuelve su endpoint. | Exploración visual de los discos relacionados con el informe; conservar carga bajo demanda. El selector anual debe corresponder al mismo universo si el contrato puede garantizarlo. |

### Selector anual y significado del período

Se recomienda un año natural (enero a diciembre) interpretado con una zona horaria IANA explícita y común a los límites diarios, mensuales y anuales. No se propone adoptar `Europe/Madrid` automáticamente: la zona concreta queda pendiente de decisión de producto y de comprobar compatibilidad backend. No ofrecer años futuros. El mismo año seleccionado debe gobernar toda visualización dependiente del período, incluida la galaxia y la comparación interanual.

El filtro anual debe declarar qué está filtrando en cada caso. Para mensual y calendario, la propuesta es actividad `set` ocurrida en el año local seleccionado. Para la galaxia, resumen, disco destacado y polémicos, la propuesta usa valoraciones vigentes de la población/cohorte que backend pueda identificar bajo ese año; esto no significa que las puntuaciones sean las que existían históricamente en ese año. Para distribución se recomienda mostrar puntuaciones vigentes actuales y explicar que un filtro por año puede seleccionar discos según una regla de cohorte, pero no reconstruye su nota al cierre de ese año.

El año seleccionado se compararía con el año natural inmediatamente anterior. La comparación debe etiquetar ambos años y usar la misma unidad y zona. Sigue pendiente definir si es una comparación completa entre años o «a la fecha»; no mostrar cifras comparables si falta cobertura o los períodos no tienen la misma duración/cobertura. Años sin actividad se distinguen de años que no pueden determinarse por cobertura insuficiente. El año sin actividad es cero únicamente cuando la fuente confirma cobertura completa.

Un filtro de actividad y una vista del estado actual responden preguntas diferentes. Si el contrato existente no puede separar cohortes o estados, la limitación debe quedar visible y registrarse como dependencia backend, sin presentar el período como historia exacta. No reconstruir puntuaciones históricas mediante `createdAt`, la nota actual u otras suposiciones.

### Calendario diario y votos por mes

La recomendación común es contar eventos `set`, excluyendo `change`: el calendario responde «¿cuántas veces asigné una puntuación durante este día?» y los meses resumen la misma actividad por mes. El día se determina en la zona IANA acordada. La tarjeta conserva la incertidumbre actual: recibir `date/count` no revela por sí solo qué se cuenta. La propuesta requiere aprobación de producto y que backend confirme unidad, atribución, cobertura y corte del ledger. No completar como cero las fechas sin datos si no existe una garantía de cobertura; las lagunas históricas deben explicitarse y nunca se rellenan con acciones reconstruidas.

### Géneros

Alternativas de atribución: contar solo el género principal; contar cada disco íntegramente en todos sus géneros asociados; o repartir el conteo entre géneros. Se recomienda la segunda alternativa por su lectura directa de pertenencia: un `set` asociado a dos géneros aporta uno a cada uno, por lo que la suma de categorías puede ser mayor que el total de eventos. No hacer reparto proporcional sin aprobación expresa. Falta comprobar qué relaciones y reglas de género aporta backend y si reflejan Catalog actual o una clasificación histórica.

### Resumen y disco destacado

Propuesta mínima de resumen: **discos con valoración vigente** y **media de puntuaciones vigentes**, si hay población suficiente y la media tiene un denominador definido. Nombrar “votos nuevos registrados (`set`)” solo si producto aprueba el indicador y se puede mostrar la cobertura; `change` es un indicador opcional separado. No exigir que todos aparezcan ni replicar por defecto cada indicador de Dashboard.

Conservar el disco destacado. Propuesta para validar: máximo de puntuación vigente entre los candidatos del período, mostrando nota, disco y artista. La implementación actual debe verificarse antes de afirmar que este es su algoritmo. Si hay empate, recomendar desempate estable por identificador de disco para no variar entre cargas; esta es una regla nueva pendiente de aprobación. Si no hay candidatos, mostrar un vacío contextual y no fabricar un destacado. El año afecta a la población de candidatos según la regla de cohorte que backend confirme, no a una nota histórica reconstruida.

### Distribución de puntuaciones y discos polémicos

La distribución representa una observación por valoración vigente y su nota actual. El selector anual no debe hacerla pasar por distribución histórica: de usarse, filtra la cohorte de discos solo según una regla confirmada y la nota sigue siendo la vigente al consultar. Una distribución exacta de puntuaciones que existían en cualquier año anterior es una capacidad adicional; requiere verificar datos históricos suficientes por disco y valor. No derivarla del ledger descrito ni reconstruirla con suposiciones.

Conservar discos polémicos y explicar como mínimo la población comunitaria que forma la media, la fórmula de diferencia, el orden del ranking, si la diferencia tiene signo o es absoluta, el mínimo de valoraciones comunitarias exigido y el efecto del año seleccionado. Como propuesta de lectura —no como descripción del algoritmo existente— publicar `nota personal − media comunitaria` con signo y ordenar por valor absoluto descendente para encontrar las mayores discrepancias; permitiría ver si la persona puntúa por encima o debajo. Alternativa: ordenar diferencia con signo, que prioriza solo uno de los sentidos. Tanto fórmula como orden y mínimo requieren decisión explícita y verificación backend; no sustituir el cálculo actual antes de conocerlo. Si falta el mínimo o la población no se puede determinar, no mostrar el valor como comparable.

### Galaxia

Conservar la visualización y su carga bajo demanda. Su finalidad es explorar visualmente los discos relacionados con las estadísticas personales. Según el comportamiento ya registrado: cada elemento representa un disco devuelto; la posición agrupa/coloca elementos con un layout determinista; en escritorio el tamaño se escala con la nota y el color procede del género; en móvil las burbujas agrupan géneros y el tamaño se escala por cantidad de discos. Estos significados visuales no deben extenderse a fecha, actividad ni nota comunitaria. El filtro anual debe regir la población solo cuando los dos endpoints apliquen una regla compatible. La interacción abre tooltip/lista con información del disco según la vista; la carga continúa al abrir y un fallo de galaxia no debe invalidar las otras estadísticas.

### Estados vacíos y datos parciales

Reglas recomendadas para toda la sección:

- **Cero real:** mostrar 0 solo si la fuente confirma que el conteo está completo para el período y la población.
- **Año sin actividad:** comunicar período válido sin eventos; diferenciarlo de cobertura desconocida.
- **Usuario sin valoraciones:** estado inicial de usuario sin datos, sin medias, distribución o ranking inventados.
- **Datos históricos incompletos:** identificar corte/cobertura conocida; no presentar la serie como completa.
- **Desconocido (`null`):** indicar que el valor no puede determinarse; no convertirlo automáticamente en cero.
- **Error HTTP:** estado de error/reintento separado de vacío, cero o falta de actividad.
- **Visualización sin datos suficientes:** estado específico para comparación o distribución insuficiente, manteniendo las otras visualizaciones útiles.
- **Fallo de galaxia:** limitar el error a la galaxia; resumen y demás gráficos conservan su estado válido.

Si la API no expone metadatos para distinguir cobertura completa, parcial y desconocida, no se debe afirmar que el cero o el año vacío son definitivos.

## 21. Matriz de decisiones para aprobación

**Estados:** “Comportamiento actual confirmado” solo describe observaciones frontend ya registradas. Todas las recomendaciones de esta matriz están **pendientes de aprobación**. “Requiere comprobación backend” señala dependencia de EST-3 y no implica que se haya iniciado.

| ID | Comportamiento actual conocido | Alternativas | Recomendación y justificación | Dependencias técnicas | Estado de aprobación | Pregunta concreta |
|---|---|---|---|---|---|---|
| EST-DEC-01 | El resumen recibe `totalVotes`, cuya unidad no declara el DTO; media/mediana tampoco explican población. UI no separa `set` y `change`. | Valoraciones vigentes; `set`; `change`; discos únicos; combinación con indicadores separados. | Usar discos con valoración vigente y media vigente como resumen mínimo; si se añade actividad, mostrar `set` y `change` por separado. Evita mezclar estado actual y acciones. | Confirmar población, nulls, media y disponibilidad/cobertura del ledger. | Pendiente de aprobación; backend requerido para semántica de campos actuales. | ¿Apruebas que el indicador principal sea “discos con valoración vigente” y que `set`/`change`, si se muestran, sean indicadores separados? |
| EST-DEC-02 | El frontend usa año actual local, opciones estáticas desde 2025 y manda `year` a dos rutas; el significado de filtro no se conoce con certeza. | Año de actividad; año de lanzamiento/cohorte; año de creación de Rate; estado a fecha de cierre histórico. | Año natural común, no futuro. Definir por visualización si es actividad (`set`) o cohorte de discos con nota vigente; no llamarlo snapshot histórico. | Qué significa `year` en cada endpoint y si puede aplicarse igual a todas las tarjetas. | Pendiente; EST-3 debe comprobar viabilidad. | ¿Apruebas el año natural común y la distinción entre actividad del año y valoraciones vigentes de una cohorte? |
| EST-DEC-03 | `yearOverYear` se presenta como año actual frente al anterior aunque otro año esté seleccionado; implementación dice que es independiente del selector. | Mantener comparación fija actual/anterior; comparar selección con año previo; retirar si no hay cobertura comparable. | Comparar el año seleccionado con el inmediatamente anterior, misma métrica, zona y cobertura; rotular años y período comparable. | Semántica y nulabilidad del campo, rango/cobertura y duración comparable. | Pendiente de aprobación; backend requerido. | ¿Debe la comparación seguir al año seleccionado y comparar con el año natural inmediatamente anterior? |
| EST-DEC-04 | El calendario usa fechas locales del navegador; las llamadas no envían zona horaria. | Zona del dispositivo; UTC; zona IANA fija de producto (p. ej. `Europe/Madrid`). | Elegir explícitamente una zona IANA y usarla para límites de día, mes y año. No fijar aún cuál. Evita asignaciones distintas cerca de medianoche/DST. | Soporte/uso de la zona en agregación backend y formato de fechas. | Pendiente de aprobación y comprobación backend. | ¿Qué zona IANA debe definir el año y la fecha local de cada actividad? |
| EST-DEC-05 | Calendario recibe `date/count`, pinta ausencias como cero y no declara su unidad ni cobertura. | `set` por día; `set + change`; discos únicos por día; mantener unidad backend existente si se documenta. | Eventos `set` por día local, sin `change`, para responder cuántas asignaciones hubo. Cero solo con cobertura confirmada; no reconstruir acciones. | Origen/unidad/cobertura diaria, corte del ledger y zona IANA. | Pendiente de aprobación; requiere comprobación backend. | ¿Apruebas que el calendario cuente solo eventos `set` registrados y muestre cobertura desconocida cuando no pueda confirmar ceros? |
| EST-DEC-06 | La UI muestra conteos por género; no confirma si un disco puede contar en varias categorías ni si el género es histórico. | Género principal; conteo completo en cada género; reparto proporcional. | Contar completamente en cada género asociado. Explicar que la suma puede exceder el total general; no prorratear. | Cardinalidad y fuente de relaciones de género; clasificación actual o snapshot. | Pendiente de aprobación; backend requerido. | ¿Apruebas contar cada evento `set` en todos los géneros asociados, aceptando que la suma supere el total general? |
| EST-DEC-07 | Se renderizan `score/count`; el DTO no declara universo ni período. | Histograma de notas vigentes; cambios/eventos históricos; snapshot de notas al cierre anual. | Mostrar distribución de valoraciones vigentes. El selector puede filtrar una cohorte verificable, pero no convertirla en historia. Historial exacto es capacidad adicional. | Fuente de notas, nulls/decimales y campo/año de cohorte; verificar si existe historial por disco y valor. | Pendiente de aprobación; backend requerido. | ¿Apruebas distribución de notas vigentes y dejar la distribución histórica anual fuera de esta propuesta salvo datos demostrables? |
| EST-DEC-08 | Se muestran nota personal, media comunitaria y `diff`; fórmula, orden, muestra mínima y población no están confirmados. | Diferencia con signo o absoluta; ordenar por signo o magnitud; mínimos distintos o ninguno; población comunitaria por año o global. | Definir y exponer método; propuesta para revisión: diferencia con signo (`personal − comunidad`), orden por magnitud absoluta y mínimo comunitario definido. No alterar lo implementado hasta verificarlo. | Fórmula/signo/orden/desempates, tamaño de muestra, población, período y filtro anual. | Pendiente de aprobación; requiere comprobación backend. | ¿Apruebas ordenar por discrepancia absoluta y mostrar su signo, con un mínimo comunitario que se fijará tras ver el cálculo y los datos? |
| EST-DEC-09 | Hay un `topDiscOverall` con nota; UI lo denomina destacado y lo oculta si no llega disco. Algoritmo y desempate desconocidos. | Máxima nota vigente; mayor actividad; ranking compuesto; criterio actual sin cambios hasta verificar. | Conservar; validar máximo de nota vigente en la cohorte elegida y desempate estable por ID. Sin candidato, estado vacío contextual. | Algoritmo, universo anual, reglas de nota y desempate actuales. | Pendiente de aprobación; requiere comprobación backend. | ¿Debe “destacado” ser el disco de mayor nota vigente del período, con desempate estable? |
| EST-DEC-10 | Galaxia carga al abrir; un punto/disco, posición determinista, color por género y radio escritorio por nota; móvil agrega por género y cantidad. | Conservar semántica actual; reinterpretar dimensiones solo con decisión; retirar o cargar siempre (sin recomendación de hacerlo). | Conservar propósito exploratorio, dimensiones y carga bajo demanda ya descritas; el año debe compartir población compatible. Mantener error aislado. | Datos y significado de payload, filtro anual de ambas rutas y campos de interacción. | Pendiente de aprobación; verificación backend de población. | ¿Apruebas conservar la galaxia como exploración bajo demanda con esos significados visuales actuales? |
| EST-DEC-11 | Algunos componentes inician en cero, series vacías parecen cargar y varias tarjetas se ocultan; galaxia ya diferencia carga/error/vacío. | Cero por ausencia; mensajes generales; estados por tarjeta diferenciando cero, desconocido, vacío, parcial y error. | Mensajes contextuales por tipo de estado; nunca `null`→0 ni datos parciales→completos. Fallo de galaxia no afecta al resto. | Nulabilidad y metadatos de cobertura/error disponibles en payloads. | Pendiente de aprobación; cobertura/nulabilidad requiere backend. | ¿Apruebas estos estados separados y que un valor desconocido no se presente como cero? |

## 22. Comprobaciones preparadas para EST-3 (backend)

La siguiente lista define el alcance de verificación, pero no inicia EST-3. Se debe revisar el backend vigente y sus pruebas/datos aislados autorizados, sin modificar contratos durante la verificación:

1. **`totalVotes`:** definición, tabla/fuente, denominador, inclusión de nulls, notas vigentes frente a eventos, discos únicos, filtros y coherencia con media/mediana.
2. **Votos mensuales:** fuente, unidad exacta, fecha que agrupa, significado de `weeks`, filtros, zona y si cuenta filas Rates, `set` o alguna otra unidad.
3. **Votos por género:** unidad, relación disco-géneros, atribución completa/principal/prorrateada actual, género actual frente a snapshot y efecto de reclasificaciones.
4. **Calendario:** origen de `date/count`, si son `set` o `change`, corte/cobertura del ledger, zona de fecha, días omitidos, ceros confirmados y años completos.
5. **Aplicación de `year`:** significado y límites de `year` en `/rates/stats` y `/rates/stats/discs`; comprobar si selección de actividad y cohorte se pueden distinguir y si ambas rutas devuelven universos compatibles.
6. **Zona horaria:** zona IANA aplicada a límites de año/mes/día, representación de fechas y comportamiento en medianoche y cambios DST.
7. **Comparación interanual:** qué representa `yearOverYear`, años comparados, misma métrica/denominador, comparación completa o a fecha equivalente, cobertura, nulos y si respeta el año seleccionado.
8. **Distribución de puntuaciones:** estado vigente o eventos, una entrada por disco o por acción, notas nulas/decimales, cohorte anual y existencia real de valores históricos por disco suficientes para un snapshot exacto.
9. **Disco destacado:** regla/algoritmo actual, población, período, nota válida, desempates y comportamiento cuando no hay candidatos.
10. **Discos polémicos:** población comunitaria, cálculo y signo de `diff`, criterio de orden, mínimo de valoraciones comunitarias, empates, año aplicado y estado cuando no se alcanza el mínimo.
11. **Galaxia:** campos entregados, población personal, significado de nota/género/color y del filtro `year`; concordancia con `/rates/stats` y datos de interacción.
12. **Autenticación y aislamiento:** autorización efectiva de ambas rutas, sujeto derivado del token, aislamiento entre usuarios y si las comparativas comunitarias usan una población global deliberada.
13. **Cobertura del ledger:** fecha real de inicio por entorno, transiciones capturadas, cambios del modelo desde la auditoría registrada, eventos no representados y límites que impiden reconstruir el historial. No intentar reconstruir acciones que nunca se registraron.

La salida de EST-3 deberá clasificar cada punto como confirmado, parcial, desconocido o incompatible con la propuesta, y separar evidencia local de cualquier validación de un despliegue. EST-3 permanece pendiente.

## EST-FE — Implementación frontend

### EST-FE-1 — Contratos HTTP y TanStack Query de Estadísticas

**Estado:** completada localmente.

- Contratos fuente: `RatesUserStatsResponseDto`, `RatesStatsDiscDto`, `RatesStatsControversialDiscDto`, actividad mensual/diaria/por género y buckets de puntuación en `../riffvalley-app-back/src/community/rates/dto/rates-user-stats.dto.ts`; parámetros y validación de `year`/`timeZone` en `rates-stats-query.dto.ts`. El controlador confirma ambas rutas y su autenticación.
- `src/modules/statistics/types/statistics.ts` refleja el resumen y la galaxia vigentes, incluidas nulabilidades y diferencias firmadas; no declara campos legacy `yearOverYear`, `rank`, `totalUsers` o `weeks`.
- `src/modules/statistics/api/statisticsApi.ts` usa Axios autenticado compartido para `/rates/stats` y `/rates/stats/discs`, envía año y zona, transmite `AbortSignal` y propaga errores.
- `src/modules/statistics/application/useStatisticsQueries.ts` aporta queries separadas y keys que incluyen año, zona, usuario y generación de sesión. La galaxia está deshabilitada por omisión y acepta activación explícita; mantiene errores y vacío como estados distintos.
- `statisticsFilters.ts` mantiene una selección compartida. El año inicial usa el año actual de la zona del navegador validada; si no existe una zona IANA válida, usa UTC explícitamente. Rechaza años fuera de 2025–año actual y la API vuelve a validar año mínimo y zona antes de enviar.
- La elegibilidad de discos (publicación y voto en el año elegido) la aplica el backend; el frontend no vuelve a filtrar.
- La vista y los componentes siguen importando partes del servicio Rates legacy para sus visualizaciones. Se conservan temporalmente porque sustituir sus modelos y propiedades implicaría adaptación de presentación fuera del alcance EST-FE-1. La retirada de estos consumidores y del servicio legacy se registrará en las tareas visuales correspondientes; no se crea un adaptador.
- Verificaciones: Vitest focalizado (2 archivos, 10 tests aprobados), `pnpm run typecheck`, ESLint focalizado y `git diff --check` sobre los archivos propios, todo aprobado. `pnpm run markdown:links` recorrió el repositorio: no reportó fallos en los documentos de esta tarea y mostró seis enlaces rotos en otros documentos. El delta Markdown no es concluyente porque el checkout contiene cambios locales previos y el script requiere un árbol limpio con base/head disponibles. No se ejecutaron build ni suites generales.

### EST-FE-2 — Resumen anual, selector y estados

**Estado:** completada localmente.

- `/statistics` consume `useStatisticsSummaryQuery()` y el resumen de `statistics.ts`. La vista ya no importa Axios ni servicios/tipos legacy de Rates, no construye un objeto legacy y no ejecuta la query de galaxia.
- El año usa el estado compartido de `statisticsFilters.ts`: zona IANA validada del navegador con fallback UTC, mínimo 2025 y máximo del año actual en esa zona. Las opciones se derivan de ese límite; 2025 y el año actual son seleccionables, los futuros se rechazan y el selector reacciona al cambiar la selección. No se crea una store adicional.
- El resumen presenta actividad anual (`activityCount`, asignaciones elegibles), discos con puntuación vigente (`scoredDiscs`), media y mediana. Cero permanece visible como cero; media/mediana `null` se muestran como ausencia (`—`), con formato numérico español en presentación.
- La vista distingue skeleton inicial, error recuperable con `refetch`, respuesta válida sin actividad y actividad positiva sin discos puntuados. Al cambiar de año, comprueba año y zona de la respuesta antes de representarla, evitando que el resultado anterior se atribuya al nuevo filtro.
- Las secciones de actividad mensual, calendario y género quedaron para EST-FE-3; distribución de puntuaciones, disco destacado, discos polémicos y galaxia quedaron para EST-FE-4–EST-FE-5.
- Se amplió `SimpleSelect` con etiqueta accesible y navegación de opciones por teclado para el selector anual.
- Tests focalizados: `statisticsFilters.test.ts`, `useStatisticsQueries.test.ts` y `Statistics.test.ts` (14 tests aprobados en esta ejecución). Typecheck y ESLint focalizado aprobados. `pnpm run build` completó; informó una advertencia CSS sobre `.flex-[2]` y otra por un chunk superior a 500 kB. `git diff --check` no reportó whitespace. El escaneo global de enlaces terminó con seis fallos fuera de los archivos modificados: destinos externos al repositorio y destinos ausentes en `roadmap/catalog-discs-audit.md`, `roadmap/catalog/cat-art-2a-auditoria-modal-artistas.md`, `roadmap/catalog/cat-art-4a-auditoria-rellenar-imagenes.md`, `roadmap/dashboard.md` y `roadmap/roles.md`. No señaló enlaces de `roadmap.md` ni `roadmap/statistics.md`. No se modificaron backend, Identity, Dashboard ni Actividad.

### EST-FE-3 — Gráficas de actividad

**Estado:** completada localmente.

- `MonthlyActivityChart.vue`, `ActivityCalendar.vue` y `GenreActivityChart.vue` reciben props tipadas desde los DTOs nuevos. `Statistics.vue` los monta con la respuesta vigente de `useStatisticsSummaryQuery()`; no hay consulta adicional, consumo Axios ni activación de la query de galaxia. Distribución de puntuaciones, disco destacado y polémicos quedaron para EST-FE-4; la galaxia y la revisión final siguen para EST-FE-5–EST-FE-6.
- Campos utilizados: `activityByMonth[].month` (`YYYY-MM`) y `activityCount`; `activityByDay[].date` (`YYYY-MM-DD`) y `activityCount`; `activityByGenre[].genre` y `activityCount`; `activityWithoutGenre`; `activityCount` para contrastar subtotales sin recalcular ni reemplazar el resumen.
- La actividad se presenta como asignaciones de puntuación entregadas por backend. La vista explica `activityBasis`: estimación histórica basada en la fecha de creación de la puntuación o eventos `set`. El frontend no deduplica eventos `set`, no suma cambios `change`, no cuenta discos únicos, no reconstruye cohortes, no consulta catálogo y no recalcula valores desde notas vigentes. Los meses se presentan enero–diciembre y los datos de meses de otro año se ignoran; los huecos se muestran con cero.
- El calendario civil solo muestra días del año seleccionado y deriva 365/366 días con calendario gregoriano. Las fechas recibidas son claves literales; no se parsean con `new Date(YYYY-MM-DD)`, y el formato visible se construye con UTC explícito para no desplazarlas por zona horaria. Los días sin actividad quedan visibles; la lista accesible presenta los días activos y sus cantidades.
- El desglose conserva los nombres recibidos, ordena por cantidad descendente y desempata alfabéticamente; la actividad no clasificada se muestra como «Sin género» y no se asigna a géneros. No se recortan géneros largos del dato, aunque el rótulo visual puede truncarse con el nombre completo disponible en tooltip.
- Cada visualización anuncia su estado sin actividad y conserva cifras textuales además de color. El calendario incorpora leyenda, alternativa en lista, títulos de fecha/cantidad y desplazamiento horizontal enfocable; las barras incluyen etiquetas y valores. Si los subtotales no coinciden con el resumen, se presenta una nota visible sin alterar ningún conteo.
- Tests focalizados en `activityVisualizations.test.ts` y ampliados en `Statistics.test.ts`: 12 aprobados; cubren meses, años, fechas civiles, año bisiesto, ceros, orden de géneros, sin género, sumas, discrepancias explícitas, única query y galaxia no montada. Typecheck, ESLint focalizado, build y `git diff --check` aprobaron. El build conserva advertencias de proyecto: `.flex-[2]` en minificación CSS, Browserslist desactualizado y chunk >500 kB. El escaneo global de enlaces Markdown no encontró fallos en `roadmap.md` ni `roadmap/statistics.md`; mantiene seis fallos locales en otros roadmaps, registrados como hallazgos ajenos a esta tarea.
- `ActivityCalendar.vue` se adaptó directamente a fechas/conteos del DTO. `MonthlyVotesChart.vue` y `GenreBarChart.vue` siguen como componentes legacy sin consumidores en esta vista; distribución, disco destacado, controversiales y galaxia quedaron para EST-FE-4–EST-FE-5.
- Dependencia siguiente: EST-FE-4 reutilizó la integración única del resumen, el selector y los estados de `/statistics`; no inició una segunda query.
- Limitación: la verificación se hizo con fixtures de los DTOs; no se consultó una respuesta real de backend en esta tarea, por lo que la consistencia de datos de producción queda sin verificar.

### EST-FE-4 — Puntuaciones, disco destacado y discos polémicos

**Estado:** completada localmente.

- `ScoreDistributionChart.vue`, `FeaturedDiscCard.vue` y `ControversialDiscsList.vue` reciben props tipadas desde `StatisticsSummary`. `Statistics.vue` los monta con los datos del mismo `useStatisticsSummaryQuery()` que alimenta el resumen anual; no añade peticiones ni activa la query de galaxia.
- Distribución: se usan `scoreDistribution[].score` y `scoreDistribution[].scoredDiscCount`, ordenados numéricamente. Se muestran intervalos `[score, score + 1)` y el 10 exacto, incluidos los buckets en cero enviados por backend. El componente no agrupa ni corrige valores; compara la suma recibida con `scoredDiscs` y anuncia discrepancias. Con cero discos puntuados, o actividad anual sin puntuaciones vigentes, presenta vacío en vez de barras engañosas.
- Disco destacado: utiliza solo `topDiscOverall` (`id`, `name`, `rate`, `artist`). El backend determina elegibilidad, nota vigente y desempate; el cliente no calcula un ranking ni hace fallback de otro año. Un `artist: null` se presenta como «Artista no disponible» y `topDiscOverall: null` tiene estado vacío. No se presenta portada ni se inventa una.
- Navegación: el DTO incluye un ID, pero la ruta disponible `/discos/mejores/:id` exige rol `riffvalley`, mientras `/statistics` es accesible a usuarios autenticados generales. No se añade un enlace que redirigiría a usuarios válidos de Estadísticas a una ruta sin permiso.
- Polémicos: se muestra el array recibido (el backend limita a cinco), en el orden intacto y con `userRate`, `communityAverage` y `diff` firmado; no se repiten mínimos de votantes, filtros, deduplicación ni ordenación. La diferencia se presenta con signo y dos decimales (`+2,10`, `−1,75`), acompañada por texto accesible que explica si la nota está por encima o debajo. No se exponen votantes ni votos individuales. Artista nullable y lista vacía tienen copy explícito.
- La vista deja de depender de Rates legacy para estas tres visualizaciones. `MonthlyVotesChart.vue` y `GenreBarChart.vue` continúan sin montarse y fuera del alcance de esta fase; el endpoint/DTO y los componentes de galaxia siguen pendientes de EST-FE-5.
- Tests focalizados: `Statistics.test.ts`, `ScoreDistributionChart.test.ts` y `StatisticsDiscs.test.ts` (17 tests aprobados). Cubren los once buckets, ceros, orden, conteos sin alterar, discrepancia del total incluso con `scoredDiscs` cero, estados vacíos, valores de disco y diferencias firmadas, artistas nullables, orden de entrada, una sola query y cambio de año sin resultados anteriores. Fixtures locales; no se consultó una respuesta de producción.
- Verificaciones: typecheck, ESLint focalizado, build, `git diff --check` y enlaces Markdown de `roadmap.md`/`roadmap/statistics.md` completados localmente. Build aprobado con avisos ya observados de `.flex-[2]`, Browserslist desactualizado y chunk >500 kB. Una invocación inicial mal formada de `pnpm test -- ...` inició la suite general y mostró fallos ajenos a Estadísticas en Dashboard y Catalog; el gate focalizado correcto se ejecutó después y aprobó los 17 tests indicados.
- No se inició EST-FE-5. Galaxia bajo demanda y su UX permanecen pendientes junto con la revisión/regresión final de EST-FE-6.

### EST-FE-5 — Galaxia musical en modal responsive

**Estado:** completada localmente. EST-FE-6 continúa pendiente.

- **Inspección legacy:** `GenreGalaxyModal.vue` cargaba `getUserRatedDiscs` al montarse, y `GenreGalaxyDesktop.vue` dibujaba estrellas en Canvas. `galaxyLayout.ts` agrupaba por género/color y calculaba posiciones deterministas; el radio reflejaba la nota y las interacciones originales incluían arrastre, rueda/botones de zoom y hover. `GenreGalaxyMobileBubbles.vue` agrupaba por género y permitía abrir una lista ordenada por nota, pero exigía acertar burbujas y la selección era táctil; no tenía selección de estrellas por toque. La galaxia no dependía de portadas. Se retiró el componente móvil legacy; el modal conserva la galaxia Canvas como única vista por decisión posterior del usuario.
- **Diseño y límites:** Estadísticas muestra un acceso compacto; el componente del modal se importa de forma asíncrona y no se monta ni solicita discos hasta abrir. El diálogo reutiliza Teleport y el patrón de foco de otros diálogos del frontend. Escritorio usa una superficie amplia limitada por viewport. Móvil ocupa el viewport dinámico y aplica safe areas. La galaxia es ahora la única vista de exploración en todos los tamaños; se retiraron el selector de modo y el panel de lista/búsqueda a petición del usuario. En horizontal/poca altura se compactan título y controles.
- **Interacción y accesibilidad:** Se conserva el cielo oscuro, colores por género, agrupación determinista, radio por puntuación y movimiento/zoom. La estrella se selecciona por clic o toque con hit-area ampliada; arrastrar mueve el cielo y los botones de zoom/restablecer tienen etiquetas. La ficha persistente muestra título, artista nullable, nota y género nullable. Escape, botón y backdrop cierran; el foco entra en el cierre, permanece contenido con Tab, vuelve al activador y el scroll de fondo se restaura. `prefers-reduced-motion` se respeta; no hay loop de animación. Tras retirar la lista, el Canvas queda como única superficie para explorar discos; esta sesión verificó selección por clic/toque pero no una alternativa de teclado para estrellas, pendiente de revisión en EST-FE-6.
- **Datos y carga:** `useStatisticsGalaxyQuery` reutiliza exclusivamente `/rates/stats/discs`, la zona/año compartidos y su clave aislada por usuario y generación de sesión. Se activa al montar el modal, sin petición en la visita inicial, y su `AbortSignal` llega al API. Al desmontarlo, la activación se deshabilita síncronamente y se cancela la petición; los cambios de año cambian la clave, sin presentar datos anteriores como del nuevo año. No se añadió fetch, ruta, permiso ni servicio Rates legacy. Los estados de carga, error/reintento y vacío se separan; artista/género ausentes tienen texto claro.
- **Rendimiento/limpieza:** El layout determinista se construye de forma derivada al cambiar los discos, no en cada dibujo. Canvas solo redibuja ante resize/interacción, `ResizeObserver` se desconecta al desmontar, y no hay listeners globales ni loop. No se establece límite artificial de discos.
- **Tests/verificaciones:** la ronda focalizada actual pasó 48 tests en nueve archivos; `Statistics.test.ts` comprueba la ausencia del selector/lista, selección de estrella y ficha, y `GenreGalaxyDesktop.test.ts` conserva cobertura de toque Canvas. También se cubren carga diferida, foco/cierre, cancelación, error/reintento, vacío, cambio de año sin datos anteriores y clave aislada por sesión. Typecheck, ESLint focalizado, build y `git diff --check` aprobados. Build completado con advertencias de `.flex-[2]`, Browserslist de 20 meses y chunk de 677,70 kB. El escaneo global de enlaces no reporta fallos en `roadmap.md` ni `roadmap/statistics.md`; informa seis incidencias ajenas a esta tarea en `roadmap/catalog-discs-audit.md`, documentos CAT-ART, `roadmap/dashboard.md` y `roadmap/roles.md`. El checker delta es informativo porque exige base/head completos y checkout limpio, condición que no se cumple por cambios locales preexistentes.
- **Validación visual pendiente:** no se generó captura del modal después de retirar la lista. Escritorio ancho, tablet, móvil estrecho, horizontal y baja altura quedan pendientes de verificación visual; los tests de happy-dom verifican estructura/estados e interacción simulada, no tamaño ni gestos en un navegador.
- **Legacy retirado:** el modal deja de importar `getUserRatedDiscs`/`RatedDiscItem`; `galaxyLayout.ts` usa `StatisticsRatedDisc`; se elimina `GenreGalaxyMobileBubbles.vue`. No se toca el servicio Rates compartido ni los componentes de barras que consumen su tooltip.

### EST-FE-M1 — Resumen superior y desviación típica

**Estado:** completada localmente. EST-FE-M3 también está completada localmente; EST-FE-6 continúa pendiente.

- **Contratos confirmados:** lectura de `RatesUserStatsResponseDto` y tipos asociados en el DTO backend. `StatisticsSummary` incorpora `standardDeviation: number | null`; los discos mensuales, por género y destacado reutilizan `StatisticsDisc`, que conserva `image: string | null`; `StatisticsDailyActivity` incorpora `assignments: StatisticsDailyAssignment[]`, con `discId`, `title`, `artist: string | null`, `rate: number | null` y `date`. `activityCount` permanece disponible para gráficas/coherencia. No se cambió API HTTP ni se añadieron tipos legacy/adaptadores.
- **Resumen principal:** se muestran exactamente «Discos puntuados» (`scoredDiscs`), «Nota media» (`mean`), «Mediana» (`median`) y «Desviación típica» (`standardDeviation`). El total de actividad anual deja de ser tarjeta y sigue alimentando los gráficos y mensajes de coherencia. Conteos cero se conservan y métricas null se presentan como `—`.
- **Desviación típica:** presentación con dos decimales usando el valor del backend, sin cálculo en cliente. Clasifica el valor original: menor que 1 como Baja; desde 1 y menor que 2 como Moderada; 2 o más como Alta. Cero se muestra como `0,00` y Baja; null no recibe clasificación. El botón de información, usable por teclado y toque, revela la explicación aprobada. Los umbrales se describen como criterios orientativos de Riff Valley, no categorías universales.
- **Layout superior:** resumen y disco destacado ocupan una cuadrícula de proporción aproximada 2:1 en escritorio. En móvil los cuatro indicadores aparecen primero en una cuadrícula 2×2 y el destacado debajo; la cuadrícula permite que los contenidos largos envuelvan sin imponer columnas estrechas. Se mantiene el orden semántico del DOM.
- **Disco destacado:** usa el `topDiscOverall` entregado, sin fallback ni navegación. La portada nullable se muestra completa con `object-contain`; cuando falta, aparece una alternativa gráfica local. Nombre, artista nullable (copy «Artista no disponible») y puntuación personal se presentan en la columna. `topDiscOverall: null` ocupa un estado vacío equilibrado.
- **Estados e integración:** skeleton, error/reintento y resultados se asocian al mismo año y consulta. El contenido anterior deja de renderizarse al cambiar año. Actividad mensual, calendario, género, distribución, polémicos y galaxia mantienen su composición/comportamiento; no se agregan peticiones y la galaxia continúa bajo demanda.
- **Tests focalizados:** `StatisticsSummaryCards.test.ts`, `Statistics.test.ts`, `StatisticsDiscs.test.ts` y `useStatisticsQueries.test.ts`: 29 tests aprobados en total. Las primeras expectativas de integración que aún buscaban el total anual en las tarjetas se actualizaron para comprobar el conteo en las gráficas; los dos archivos afectados se repitieron al corregirlas y aprobaron 18/18. Cobertura de contratos tipados, cuatro métricas, cero/null, límites 1 y 2, clasificación antes del redondeo, explicación accesible, portada/artista nullable, vacío, cambio de año y ausencia de llamadas adicionales. La galaxia sigue desmontada hasta abrirla. Fixtures locales; no se consultó una respuesta de producción.
- **Validación visual:** se recuperó la estructura de dos columnas del diseño anterior guardado en Git y se comprobó estáticamente el orden responsive, proporciones y clases de tema. No se generaron capturas ni se validó en navegador o dispositivo real; la presentación final en escritorio, tablet y móvil queda pendiente de revisión visual.
- **Verificaciones:** Vitest focalizado aprobado (con la repetición de los dos archivos afectados descrita arriba), `pnpm run typecheck`, ESLint focalizado, `pnpm run build` y `git diff --check` aprobados localmente. Build con advertencias de proyecto: base Browserslist desactualizada (20 meses), minificación de `.flex-[2]` y chunk de 677,72 kB. No se ejecutaron suites completas, E2E ni `pnpm verify`; no se modificaron dependencias ni backend.

### EST-FE-M2 — Actividad mensual, calendario y géneros

**Estado:** completada localmente. EST-FE-M3 también está completada localmente; EST-FE-6 continúa pendiente.

- **Diseño mensual:** se recupera la intención visual del componente legacy `MonthlyVotesChart` —barras de evolución mensual con portadas destacadas encima— sin reutilizar su contrato Rates. El bloque se titula «Resumen del año» y presenta doce meses en orden enero–diciembre con barras verticales proporcionales, cantidades, portada, título, artista y nota del `topDisc` recibido. En escritorio los doce meses se comparan en una fila; en móvil/tablet se distribuyen en filas de tres, cuatro o seis columnas para mantener reconocibles las portadas y el texto. El título largo del destacado queda en una sola línea para alinear el gráfico y conserva su texto completo en el atributo `title`. Los meses vacíos permanecen visibles con cero, barra vacía y sin destacado; actividad con `topDisc: null` se distingue expresamente y nunca hereda un disco de otro mes. Portada y artista nulos tienen alternativas legibles.
- **Calendario:** se quitó el listado visual desplegable que permanecía bajo el mapa. El detalle contextual muestra únicamente fecha civil y `activityCount` del día, tanto en hover como al fijarlo con clic/toque. No muestra discos, artistas ni puntuaciones individuales. El panel fijo limita ancho y alto al viewport. La cuadrícula conserva la altura original, ocupa el ancho disponible y sus columnas se distribuyen sin desbordar el viewport.
- **Accesibilidad:** cada día tiene fecha y cantidad en su nombre accesible; la cuadrícula ofrece un solo tab stop, navegación con flechas, Home/End, activación nativa Enter/Espacio, Escape y retorno de foco. El panel fijado recibe el foco en su cierre. Se conserva un índice semántico visualmente oculto de días activos como alternativa de lectura, sin volver a mostrar una lista debajo del calendario. El tooltip temporal no intercepta el ratón; el clic convierte el detalle en un panel interactivo.
- **Datos y coherencia:** el calendario conserva fechas `YYYY-MM-DD` como fechas civiles y usa `activityCount` para el resumen diario. No consulta Rates/Catalog ni reconstruye elegibilidad; los `assignments` recibidos no se muestran individualmente. La fecha del detalle no se obtiene parseando una cadena como instante UTC. Los avisos de subtotal mensual, diario y de género/sin género siguen contrastando los valores recibidos con `activityCount`; no se corrigen los datos.
- **Copy de conteos:** la interfaz denomina «votos» a los conteos mensuales, diarios y por género, a petición del usuario. Solo cambia el texto presentado: `activityCount` y los datos recibidos se conservan sin transformación.
- **Siete géneros:** se muestran hasta siete filas de barras horizontales, ordenadas por `activityCount` descendente y alfabéticamente en empates. El título visible no incluye el límite numérico. «Sin género» queda fuera del límite y el resumen se omite cuando su cantidad es cero. La barra se compara contra el género más activo de la selección; el porcentaje visible usa solo `genre.activityCount / activityCount` cuando el denominador anual es positivo. Cada fila usa su `topDisc` recibido; null, portada nula y artista nulo tienen estados propios. No se recalcula un destacado.
- **Galaxia e integración:** el único acceso es el botón «Abrir galaxia de géneros», al final de la misma tarjeta de géneros. `GenreGalaxyModal` sigue siendo asíncrono, opcional y sin montar hasta abrir; no se cambió su Canvas, interacción ni query. Se conserva la query anual única y no se tocaron resumen superior, distribución ni polémicos.
- **Tests:** se añadieron pruebas de los doce meses, cambio de año y nulos; calendario con fecha civil, solo resumen diario en tooltip, ancho/altura, días vacíos sin cuadrado, etiquetas semanales, toque, teclado, año nuevo y ausencia del listado inferior; límite/orden/desempate de géneros, proporción de barras, porcentaje, botón de galaxia, sin género y datos nullable. La integración verifica la query única, el orden del botón dentro de la misma tarjeta y la galaxia sin montar hasta abrir. También se cubre un género cuyo nombre coincide con «Sin género», separado de `activityWithoutGenre`. Fixtures locales, sin llamadas nuevas.
- **Verificaciones:** Vitest focalizado en `activityVisualizations.test.ts`, `MonthlyActivityChart.test.ts`, `ActivityCalendar.test.ts`, `GenreActivityChart.test.ts` y `Statistics.test.ts`: 31 tests aprobados. `pnpm run typecheck`, ESLint focalizado, `pnpm build` y `git diff --check` aprobados localmente. Build conserva advertencias del proyecto sobre Browserslist desactualizado (20 meses), minificación del selector CSS `.flex-[2]` y chunk de 677,72 kB; no se atribuyen a M2. No se ejecutaron suites completas, E2E ni `pnpm verify`.
- **Revisión visual:** Chrome headless mostró las barras mensuales en una previsualización aislada con datos de ejemplo a 1440 × 1100 y 390 × 900. La gráfica de géneros y el botón al pie de la misma tarjeta se revisaron a 1440 × 900 y 390 × 1000. No se validaron tablet, tema oscuro ni la vista autenticada con datos reales.
- **Siguiente alcance:** EST-FE-M3 se cerró después mediante las peticiones visuales registradas a continuación. EST-FE-6 conserva la revisión técnica y cierre.
- **Ajustes posteriores:** a petición del usuario, la cuadrícula diaria ocupa todo el ancho de la tarjeta (sin máximo fijo ni scroll horizontal) y distribuye las 53 columnas en ese ancho. Las celdas cuadradas crecen hasta 16 px en viewports anchos y se reducen al ancho real en móvil; el alto mínimo de filas conserva el tamaño compacto móvil. Los días sin actividad quedan en blanco y las etiquetas de días se desplazan a la izquierda. El tooltip quedó limitado a fecha y cantidad de votos del día. La gráfica mensual muestra barras verticales con el disco destacado encima y sus títulos a una línea; su título visible es «Resumen del año». Los géneros usan barras horizontales junto al nombre en siete filas como máximo; los discos quedan al final de cada fila, la cantidad «Sin género» igual a cero se omite y el único acceso a galaxia queda como botón al final de la misma tarjeta.

### EST-FE-M3 — Distribución de puntuaciones y discos polémicos

**Estado:** completada localmente. EST-FE-6 continúa pendiente.

- **Distribución:** `ScoreDistributionChart` conserva los buckets y conteos recibidos, ordenados de 0 a 10 en barras verticales. El único encabezado es «Discos puntuados [año]». Las barras progresan de rojo a verde oscuro. El tooltip muestra intervalo y cantidad, y está disponible con hover y foco de teclado. En móvil las once barras se distribuyen en filas de tres.
- **Discos polémicos:** cada fila queda centrada con ancho máximo, portada antes del título y sin recortar títulos largos. «Tu nota», «Media» y «Diferencia» ocupan columnas estables; la nota personal y la media comunitaria tienen colores distintos. Las portadas ausentes conservan un marcador y se mantiene el color semántico del signo de la diferencia.
- **Tests:** 16 tests focalizados de `ScoreDistributionChart.test.ts` y `Statistics.test.ts`, y 4 de `StatisticsDiscs.test.ts`, aprobados. Se comprueban barras/tooltip/colores, portada y orden, títulos largos, alineación y señales de nota/mediana/diferencia.
- **Verificaciones:** typecheck, ESLint focalizado, build y `git diff --check` aprobados. Build mantiene avisos de Browserslist, `.flex-[2]` y un chunk de 677,70 kB.
- **Revisión visual:** Chrome headless mostró distribución y discos polémicos en previsualizaciones locales a 1440 px y 390 px. No se comprobó tema oscuro ni la ruta autenticada con datos reales.

### Tareas siguientes

- [x] **EST-FE-1:** contratos HTTP, filtros de año/zona, cliente dedicado, queries aisladas y tests focalizados.
- [x] **EST-FE-2:** resumen anual, selector de año y estados de consulta.
- [x] **EST-FE-3:** gráficas de actividad.
- [x] **EST-FE-4:** puntuaciones, disco destacado y discos polémicos.
- [x] **EST-FE-5:** galaxia bajo demanda en modal responsive, con query diferida y exploración alternativa accesible.
- [x] **EST-FE-M1:** resumen superior de cuatro tarjetas, desviación típica y disco destacado responsive.
- [x] **EST-FE-M2:** rediseño de actividad mensual, calendario contextual accesible y siete géneros representativos.
- [x] **EST-FE-M3:** distribución de puntuaciones y discos polémicos.
- [x] **EST-FE-6:** revisión técnica, regresión focalizada y cierre.

### EST-FE-6 — Revisión técnica y cierre

**Estado: completada. Estadísticas queda cerrada a nivel de implementación frontend.**

- **Integración y arquitectura:** la vista compone resumen, actividad mensual, calendario, géneros, distribución, polémicos y galaxia; las secciones usan una única query anual y la galaxia mantiene su consulta diferida. Axios queda centralizado en el API del módulo, y TanStack Query gestiona caché, cancelación y estados remotos. Los filtros comparten año y zona; las keys aíslan usuario y generación de sesión. Una respuesta cuyo año o zona no coincida con la solicitud ahora produce un error de contrato visible, no una pantalla vacía.
- **Contratos:** se contrastaron en modo solo lectura los DTOs frontend con `rates-user-stats.dto.ts`, `rates-stats-query.dto.ts` y los servicios de agregación anual backend. Campos nullable, tipos de puntuación, nombres de portada/artista y parámetros año/zona coinciden. El cliente valida año y zona antes de enviar, propaga `AbortSignal` y no convierte errores HTTP en datos vacíos.
- **Discrepancia diaria de unidad:** el DTO real llama `discs` al detalle diario y define `activityCount` como discos distintos con actividad en ese día. Los totales anual, mensual y por género cuentan eventos/votos. El frontend había tipado el detalle como `assignments` y rotulado la cantidad diaria como votos; se corrigió el tipo a `discs`, el copy diario a discos con actividad y el aviso de subtotal para distinguir unidades. Los detalles recibidos se conservan sin deduplicación adicional ni render de títulos/puntuaciones individuales; el tooltip sigue mostrando el resumen diario acordado. La suma diaria puede diferir legítimamente del total anual. No se cambió el backend ni se ajustaron cantidades.
- **Coherencia restante:** las sumas mensuales se contrastan con el total anual; los géneros y la actividad sin género se contrastan con ese total; el calendario comunica que suma registros de discos por fecha frente a votos anuales. La distribución compara buckets con `scoredDiscs`, conserva intervalos/cantidades recibidos y avisa de faltantes sin inventar buckets. La controversia conserva orden y valores del backend, cuyo servicio limita la respuesta a cinco.
- **Estados y accesibilidad:** carga, errores, reintento, año sin actividad, actividad sin puntuaciones y respuestas incoherentes permanecen diferenciados. El modal de galaxia conserva foco, Escape, trampa de foco, cancelación, limpieza del Canvas y estados propios. La lista visual de discos sigue retirada; se añadió un `<select>` semántico, oculto salvo al recibir foco, como alternativa keyboard/screen reader para seleccionar estrellas sin restituir el panel visual. El calendario mantiene roving tabindex y fechas civiles.
- **Legacy eliminado:** se retiraron `MonthlyVotesChart.vue`, `GenreBarChart.vue`, `DiscHoverTooltip.vue`, `discCoverPositionsPlugin.ts` y `externalTooltip.ts`. Una búsqueda en `src/` confirmó que no tenían consumidores fuera de esas referencias internas. Se conservan los servicios legacy compartidos por otros módulos.
- **Validación backend pendiente:** los DTOs y servicios se leyeron en modo solo lectura. No se ejecutaron pruebas backend ni SQL PostgreSQL; la integración PostgreSQL real continúa pendiente en backend. Los tests frontend con fixtures no se presentan como validación de PostgreSQL. No se efectuaron capturas ni pruebas visuales/responsive, por solicitud expresa; la revisión visual es del usuario y no condiciona este cierre técnico.
- **Tests y verificaciones:** Vitest focalizado en 12 archivos: 64 tests aprobados. `pnpm run typecheck`, ESLint focalizado para `src/modules/statistics/` y `src/views/statistics/`, `pnpm run build` y `git diff --check` aprobaron. El build informa que Browserslist/caniuse-lite tiene 20 meses, que la minificación no interpreta `.flex-[2]` como selector CSS válido y que un chunk llega a 677,66 kB; son avisos existentes del conjunto de frontend y no bloquearon el build. El chequeo de enlaces Markdown recorrió 39 documentos y 1.457 enlaces: ninguno de los documentos modificados contiene fallos; reportó seis fallos locales en otros roadmaps (`roadmap/catalog-discs-audit.md`, `roadmap/catalog/cat-art-2a-auditoria-modal-artistas.md`, `roadmap/catalog/cat-art-4a-auditoria-rellenar-imagenes.md`, `roadmap/dashboard.md` y `roadmap/roles.md`). No se corrigieron hallazgos ajenos al alcance.
- **Decisión de cierre:** EST-FE-1–EST-FE-6 y EST-FE-M1–M3 quedan completadas. No se abren tareas nuevas de diseño o funcionalidad. La única validación pendiente registrada es PostgreSQL real en backend.

## 23. Cierre de EST-2a

- [x] Especificación funcional propuesta para las ocho funcionalidades y sus unidades.
- [x] Comportamiento actual, recomendación, aprobación pendiente y verificación backend se distinguen expresamente.
- [x] Matriz preparada con IDs estables `EST-DEC-01` a `EST-DEC-11`, alternativas, justificación, dependencia, estado y preguntas concretas.
- [x] Estados vacíos, datos incompletos/desconocidos, zona, año, comparación y limitaciones históricas documentados.
- [x] Lista precisa de verificaciones preparada para EST-3; EST-3 no iniciada.
- [x] No se modificó código ejecutable, backend, contratos HTTP, Dashboard, Actividad ni visualizaciones.
- [x] Las decisiones de producto siguen pendientes de respuesta; completar EST-2a no las aprueba.
- [x] Enlaces Markdown locales validados y `git diff --check` validado para los archivos propios de EST-2a.
