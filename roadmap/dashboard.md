# D-0 — Auditoría integral del Dashboard

**Estado actual del frontend Dashboard: COMPLETADO Y CERRADO (2026-10-28), por decisión del usuario.** Los once widgets están implementados, la reorganización modular D-MOD-1–D-MOD-4d está completada y el usuario confirma sus comprobaciones funcionales manuales satisfactorias. Los tres problemas visuales prioritarios que señaló están resueltos y acepta el diseño actual. No quedan tareas frontend de Dashboard por ejecutar en este roadmap; cualquier mejora futura se tratará como una tarea independiente.

**Estado histórico de D-0:** la auditoría documental se completó inicialmente con las tareas de implementación aún pendientes. Los resultados posteriores y este cierre sustituyen esa fotografía inicial; se conserva para trazabilidad.

**Lectura del historial:** los estados «pendiente», «en curso» o «por validar» dentro de auditorías y resultados fechados describen la fotografía de cada hito. No son el backlog actual; prevalece el cierre formal de la última sección. Las tareas descartadas o canceladas no se cuentan como implementadas.

**Checkout revisado:** 2026-10-26, rama `refactor/dashboard`, limpio al inicio de D-0. Node `v24.22.1`; pnpm `11.28.8`. No se cambió de rama ni se modificaron herramientas o dependencias.

**Alcance:** la ruta `/` y sus once widgets configurables, los componentes y servicios usados por ellos, la configuración desktop/mobile y las preferencias relacionadas. La auditoría es estática: no se ejecutó la app ni se midieron tiempos de red o render.

## 1. Alcance y fuentes

Se consultaron `AGENTS.md`, [Arquitectura frontend](../docs/frontend/architecture.md), [Convenciones](../docs/frontend/conventions.md), el [roadmap principal](../roadmap.md), los roadmaps de Identity y Layout, los contratos de Identity y las rutas/imports/servicios/tests relevantes. La arquitectura del checkout describe `src/modules/identity/` como el único dominio modularizado; los demás dominios siguen distribuidos en legacy. Layout está cerrado y no forma parte de esta iniciativa.

El inventario se amplió por referencias e imports, no solo por nombres de archivo: incluye componentes compartidos DiscCard/StatsModal, servicios Discs/Rates/News, Account preferences y el store legacy de usuario usado para persistir cambios. Los endpoints indicados son los paths frontend observados, no una validación del contrato/backend.

## 2. Mapa de arquitectura actual

```text
Router `/` (requiresAuth)
└── views/dashboard/DashboardPage.vue (Options API, 1175 líneas)
    ├── useDashboardConfig(desktop/mobile)
    │   ├── Identity/Account: Pinia dashboardPreferences + localStorage
    │   ├── legacy stores/user/users.ts → PATCH de preferencias
    │   └── SwalService
    ├── Services: discs, rates
    ├── shared UI: DiscCardComponent, StatsModal
    ├── views/homePage/components/NewsFeed.vue → services/news
    └── views/dashboard/components/AdventureModule.vue → services/discs

Identity/Account
└── DashboardBuilder → useDashboardConfig + ModuleCard
    └── incrustado en PasswordChangeView para editar preferencias
```

La vista HomePage de `/rankings` es otra pantalla de catálogo/rankings y no es el Dashboard. Comparte la carpeta legacy `views/homePage/` con `NewsFeed.vue`, cuyo consumidor productivo observado es Dashboard.

### Inventario de archivos

| Elemento | Ubicación | Responsabilidad | Dependencias | Consumidores | Owner propuesto |
|---|---|---|---|---|---|
| DashboardPage | `src/views/dashboard/DashboardPage.vue` (1175 líneas) | Banner, composición de widgets, presentación, carga remota, interacciones de voto/azar, estado y estilos | Auth, Dashboard config, servicios Discs/Rates, DiscCard, StatsModal, NewsFeed, AdventureModule | Router `/` | Dashboard como composición; extraer consultas/acciones por owner cuando se migren |
| AdventureModule | `src/views/dashboard/components/AdventureModule.vue` (293 líneas) | Flujo guiado para descubrir un disco; preguntas, filtros, resultado | `getDiscOptions`, `getRandomDiscs`, DiscCard | Dashboard | Catalog para selección/datos; UI del widget compuesta por Dashboard |
| NewsFeed | `src/views/homePage/components/NewsFeed.vue` (400 líneas) | Feed app/web/Telegram, filtros remotos, modal de noticia interna | `getNewsFeed`, `getSourceFeed`, Router | Dashboard (confirmado en imports) | Editorial para noticia de app; Community para feeds externos si se adopta ese dominio; Dashboard solo compone |
| useDashboardConfig | `src/composables/useDashboardConfig.ts` (233 líneas) | Registro/defaults, merge de preferencias, orden/activación, cola de guardado, migración LS | Account preferences, `useUserStore`, SwalService | DashboardPage, DashboardBuilder, ModuleCard mediante tipos | La presentación/orden de widgets es Dashboard; preferencias del usuario siguen siendo Account |
| DashboardPreferencesStore | `src/modules/identity/account/preferences/stores/dashboardPreferences.ts` (102 líneas) | Preferencias compartidas desktop/mobile y flag de botones; persistencia localStorage | Pinia, localStorage | Account, Auth al aplicar sesión, Sidebar, Dashboard config | Identity/Account (conservar) |
| useDashboardPreferences | `src/modules/identity/account/preferences/composables/useDashboardPreferences.ts` | Acceso a store Account | Store preferences | Auth, PasswordChange, Sidebar | Identity/Account (conservar) |
| DashboardBuilder | `src/modules/identity/account/preferences/components/DashboardBuilder.vue` (569 líneas) | Editor de preferencias: drag/drop desktop, flechas, móvil, activación y reset | useDashboardConfig, ModuleCard | PasswordChangeView | Identity/Account presenta y edita preferencia del usuario; catálogo de widgets debe consumir contrato Dashboard |
| ModuleCard | `src/modules/identity/account/preferences/components/ModuleCard.vue` (122 líneas) | Tarjeta desktop para reordenar/activar widgets | Tipo `DashboardModule` de composable legacy | DashboardBuilder | Identity/Account UI de editor o pieza local del Builder; su tipo debería venir del contrato de Dashboard |
| Module config tests | `src/composables/useDashboardConfig.test.ts` | Persistencia, defaults, merge/cola y rollback | Pinia, mocks de store usuario | Prueba del config | Tests de contrato Dashboard–Account al migrar |
| Preferences tests | `src/modules/identity/account/preferences/stores/dashboardPreferences.test.ts` | Persistencia y aplicación de preferencias de sesión | Pinia/localStorage | Store Account | Identity/Account |
| Builder tests | `src/modules/identity/account/preferences/components/DashboardBuilder.test.ts` | Controles de teclado/edición configurador | useDashboardConfig mock | Builder | Identity/Account |
| News services | `src/services/news/news.ts` | API de feed y gestión editorial | Axios | NewsFeed y gestión de noticias (otros consumidores fuera del alcance del widget) | Editorial para API/news; composición del feed multifuente se debe clasificar con Community/Editorial |
| Disc services/types | `src/services/discs/discs.ts` | Catálogo, homeDiscs, random/options | Axios | Dashboard, AdventureModule y otras vistas | Catalog |
| Rates services/types | `src/services/rates/rates.ts` | Votos, historial, insights y estadísticas | Axios, Disc types | Dashboard y otras vistas | Catalog (valoraciones) o Community (actividad agregada), decisión por operación al migrar |
| DiscCard | `src/components/DiscCardComponent.vue` | Presentación/acciones comunes sobre discos | contratos legacy y operaciones de disco | Dashboard y diversas vistas | Catalog/shared UI según contrato transversal existente; no mover en D-0 |
| StatsModal | `src/components/StatsModal.vue` | Presenta estadísticas detalladas/distribución | props de datos | Dashboard y consumidores a verificar al implementar | Dashboard si es exclusivo; Shared solo si el uso y semántica transversal lo justifican |
| HomePage rankings | `src/views/homePage/HomePage.vue` (364 líneas) | Listado/ranking filtrable de catálogo bajo `/rankings` | DiscFilters, catalog store, Disc services, DiscCard | Router `/rankings` | Catalog; fuera del Dashboard salvo compartir NewsFeed actualmente por carpeta |
| Router | `src/router/index.ts` | Ruta raíz protegida por autenticación | Auth guard | aplicación | Composition root; migrar el import a entrada pública de Dashboard al implementar |
| Legacy user store | `src/stores/user/users.ts` | Actualiza perfil/preferencias mediante API y sincroniza datos legacy | servicio de usuario | `useDashboardConfig`, PasswordChangeView y otros | Account para preferencias propias; no es owner Dashboard |
| Viewport composable | `src/composables/useIsMobileViewport.ts` | Detecta breakpoint para separar config de edición/render | window/resize | DashboardPage, DashboardBuilder | Shared técnico si mantiene varios consumidores; de lo contrario local al contrato de presentación |
| Date helpers y avisos | `src/helpers/dateConstants.ts`, `src/services/swal/SwalService.ts` | Años disponibles y feedback/error de guardado/voto | funciones/helper y servicio de UI | DashboardPage, useDashboardConfig | Shared técnico para fecha/avisos ya existentes; no Dashboard |
| Catálogo legacy store | `src/stores/catalog/catalog.ts` | Estado de catálogo usado por Rankings/HomePage | consumers de catálogo | HomePage y otras vistas | Catalog; no lo consume DashboardPage directamente |

Los archivos principales no se proponen dividir por tamaño automáticamente. DashboardPage mezcla responsabilidades funcionales y contiene once secciones independientes, varias llamadas y acciones; es evidencia de acoplamiento, mientras el número de líneas solo sirve como dato de referencia. DashboardBuilder separa edición en su owner actual, pero concentra dos experiencias desktop/mobile. Su separación adicional dependerá de si dificulta pruebas o cambios independientes.

## 3. Inventario funcional de widgets

Todos los IDs abajo están en `DEFAULT_MODULES` y tienen una sección condicional `v-if="isEnabled(...)"`; no se observaron widgets configurables desactivados u ocultos del registro. El encabezado de bienvenida no es configurable. Los widgets son composiciones visuales, aunque algunas consultas se lanzan desde el padre.

| Widget | Componente / datos / fuente | Estado, permisos, preferencias y carga | Duplicación/dependencias |
|---|---|---|---|
| `novedades` — Feed Riff Valley | `NewsFeed.vue`; `/news/feed`, filtros `/news/source-feed` | Loading, vacío y error (error conserva feed anterior/vacío; no muestra error explícito). Ruta exige autenticación; sin permiso específico. Control desktop/mobile por Account. Inicial al montar el componente visible. | Si desactivado no monta ni consulta. Filtros producen nuevas consultas; datos permanecen locales al componente. Owner Editorial/Community por origen. |
| `comunidad` — enlaces y Top usuarios | `DashboardCommunityWidget.vue`; ranking de rates/covers y distribución vía `/discs/homeDiscs` | Ranking vacío explícito; errores silenciados. Auth general; no guard de rol específico. Selección año y tab local. Tras la extracción, la petición ocurre al montar el widget activo. | Servicio Catalog existente; enlaces Community estáticos; año/tabs/modal y estado locales al componente. |
| `top3semana` | Inline DashboardPage + DiscCard; `/discs/homeDiscs?dateRange=semana` | Skeleton, vacío; error convertido en vacío; auth general. Preferencia desktop/mobile. | Consultado al montar siempre; llamada paralela con top mensual. |
| `top3mes` | Inline DashboardPage + DiscCard; `/discs/homeDiscs?dateRange=mes` | Skeleton, vacío; error convertido en vacío; auth general. | Siempre consultado; comparte respuesta/endpoint con otras consultas, aunque parámetros difieren. |
| `discoAleatorio` | Inline DashboardPage + DiscCard; `/discs` | Reposo, rolling y resultado; fallo sin mensaje específico. Consulta bajo acción del usuario. Auth general. | Cuenta no votados y pide offset aleatorio. No Query/caché; evita carga inicial de su resultado, pero el widget se monta si enabled. |
| `portadaDia` | Inline DashboardPage + DiscCard; `/discs` y POST/PATCH `/rates` | Loading, portada/voto, submitting; no hay error visible. Vote controlado localmente. Auth general. | Carga inicial siempre, aunque widget esté oculto; usa totalDiscs del fetch de usuario (la llamada no se espera antes en otro flujo, usa fallback). |
| `artistas` | Inline DashboardPage; `/rates/home-insights` | Loading/empty (errores silenciados); auth general. | Insights solo se piden si artistas o mundoMusical está habilitado. Comparte una sola respuesta con mundoMusical. |
| `cementerio` | Inline DashboardPage + DiscCard; `GET /discs` | Loading/rolling, lista vacía; errores silenciosos. Muestra hasta 2 discos cuyo `voteCount` es 0 según agregación musical de Catalog; «Otros olvidados» vuelve a sortear. | La vista hace una petición inicial `limit=1` para obtener `totalItems` y después hasta 5 peticiones secuenciales de 20 discos, con offsets aleatorios; filtra `voteCount` en frontend. Se consulta aunque el widget esté desactivado. La definición no equivale a no tener ningún voto: Rates solo de portada no suman a `voteCount`. Ver auditoría focalizada D-9a. |
| `mundoMusical` | Inline DashboardPage; `/rates/home-insights` | Loading/empty; errores silenciados; auth general. | Carga compartida con artistas; no requiere consulta separada. |
| `ultimosVotos` | Inline DashboardPage; `/rates` con limit 5 | Loading/lista vacía (sin error visible); auth general. | Se consulta siempre al montar. Solo datos de usuario autenticado implícitos en API; estática evidencia no confirma cómo servidor determina identidad. |
| `aventura` | `AdventureModule.vue`; `/discs/options` por pregunta y `/discs/random` al final | fases intro/question/loading/result/empty; captura error como empty. Auth general. Consulta solo después de iniciar aventura y secuencial por preguntas elegidas. | Componente no hace consulta mientras no se active. Se monta cuando enabled; `DiscCard` reutilizado. |

En la plantilla el control por preferencias evita render/montaje de NewsFeed y AdventureModule cuando no están activos, pero no protege las peticiones iniciadas por `DashboardPage`. En `onMounted` se ejecutan `fetchUserStats` y, una vez termina, se disparan sin `await` stats, top week/month, portada, cementerio, racha e últimos votos; home-insights depende de artistas/mapa. Esas llamadas se solapan en paralelo tras el primer await; cementerio puede hacer varias peticiones secuenciales. La lista completa se vuelve a solicitar por eventos del usuario en dado/cementerio.

No hay indicadores de error dedicados en la mayoría de los widgets: varios `catch` son silenciosos y presentan valores iniciales o vacío. No se encontraron reglas de rol por widget; la ruta solo pide sesión. El acceso efectivo a datos depende también del servidor, no inferido aquí.

Las pruebas específicas encontradas en el ámbito son `useDashboardConfig.test.ts`, `dashboardPreferences.test.ts` y `DashboardBuilder.test.ts`. No se localizaron pruebas de componente para `DashboardPage`, `NewsFeed` o `AdventureModule`; esto es una observación de cobertura del checkout, no una recomendación de crear tests indiscriminadamente: los bloques futuros deben añadir pruebas donde cambien límites, datos o interacción.

## 4. Composición, personalización y preferencias

- `DashboardPage` define manualmente secciones, IDs y contenido. `useDashboardConfig` mantiene otro registro de 11 IDs con label, icono, tamaño y default; no hay registro de renderers compartido por contrato. Esto crea una fuente doble de metadatos (comprobable en los dos archivos), con riesgo de divergencia al añadir/renombrar IDs.
- Desktop y mobile guardan listas separadas `dashboardConfig` y `mobileDashboardConfig`. La resolución del viewport selecciona cuál lista controla visibilidad y orden. Desktop editor soporta drag/drop, flechas y tamaños 1x1/2x1; móvil editor lista, activa/desactiva y mueve mediante flechas. El layout real del Dashboard permanece flex-wrap con `order` CSS; el editor `computeRows` aproxima su empaquetado.
- Reset guarda `[]`, que `mergeWithDefaults` interpreta como defaults. `null` significa configuración ausente y también cae a defaults. Config guardada se filtra contra IDs conocidos, conserva enabled/orden de IDs válidos y añade módulos nuevos con defaults. IDs desconocidos se descartan al combinar, aunque la limpieza no se escribe al servidor hasta una edición/reset.
- Hay migración explícita de `rv_dashboard_config` local legacy solo para desktop si Account no tiene configuración; se persiste vía PATCH y elimina la clave legacy tras éxito. No se identifica otra migración de formato. Preferencias actuales también se guardan en localStorage por el store Account; al aplicar preferencias de sesión se actualizan y persisten desde Auth.
- `useDashboardConfig` administra una cola compartida por instancia de store, revisiones y rollback optimista ante fallo; esto evita que PATCHes de editor finalicen fuera de orden. A la vez la preferencia vive en Pinia/localStorage y en el perfil remoto vía `useUserStore.updateUserStore`: son copias de persistencia/estado, con flujo intencional de sincronización, no dos owners que deban eliminarse desde Dashboard.
- La separación correcta ya acordada: Account es dueño de preferencia, persistencia y edición desde cuenta; Dashboard es dueño del registro/render/composición visual. Auth solo aplica valores de sesión a Account. La API actual de preferencias del editor depende de store legacy User y no del entrypoint público de Account para el tipo config (importa el composable legacy, mientras `DashboardModuleConfig` se reexporta desde Account).

## 5. Estado, stores y ciclo de datos

| Tipo | Estado observado | Ciclo de vida / observación |
|---|---|---|
| Local DashboardPage | métricas, rankings, tabs/año/modal, discos, loading, voto de portada, azar, racha, scroll, timers | Se inicializa por montaje; se descarta al desmontar. No está compartido ni persistido. Una parte se deriva con `computed` (columnas, username, años). |
| Local NewsFeed | posts base/filtrados/visibles, filtro, loading, noticia seleccionada | Se inicializa al montar solo si widget visible. Feed base se mantiene en componente; cambiar filtros vuelve a pedir source feed. `filteredPosts` y `visiblePosts` duplican referencias/representación de listas, derivación a revisar si se migra este componente. |
| Local Adventure | fase, preguntas, respuestas, resultado | Interacción efímera; cada paso consulta opciones del catálogo. No persiste. |
| Pinia Account | flag de botones y preferencias desktop/mobile | Shared durante sesión; localStorage al cargar/escribir; reemplazada/aplicada desde payload de sesión. Owner Account. |
| Legacy Pinia User | perfil y actualización de preferencias | `updateUserStore` hace PATCH y sincroniza el dato devuelto al store; Dashboard config lo usa para guardar. No duplicar resultados remotos de widgets aquí. |
| Query | no se usa en las consultas de estos widgets | Query instalado globalmente, pero no hay composables de Query Dashboard ni caché remota local. No todo widget requiere migración: News feed con filtros, stats y top lists son candidatos a evaluar por deduplicación/freshness; dado, cementerio bajo demanda y aventura secuencial pueden seguir como llamadas directas. |
| localStorage adicional | `rv_dashboard_config` legacy; claves Account `dashboardButtonsEnabled`, `dashboardConfig`, `mobileDashboardConfig` | Legacy desktop se migra por `useDashboardConfig`; las otras tres son persistencia local de preferencias Account. El flujo post-login persiste preferencias. |

Consultas del Dashboard son independientes en el montaje salvo que `fetchUserStats` precede el arranque del resto; `fetchCoverOfDay` usa `stats.totalDiscs` con fallback, por lo que no espera la carga de `fetchUserStats` para conocer el total. No hay invalidación de Query porque no hay Query. Votar portada actualiza la respuesta/estado local (`coverVoted`) pero no vuelve a consultar otros datos. Los datos privados locales desaparecen al desmontar; preferencias persisten según Account. La caché global Query sí se limpia ante transiciones de sesión/permisos, según Arquitectura, pero no incluye estas consultas legacy.

## 6. Mapa de dependencias y ownership

| Capacidad | Owner objetivo | Evidencia/límite |
|---|---|---|
| Composición de ruta, selección por breakpoint, registro/orden/render de widgets | Dashboard | ids y secciones en DashboardPage/useDashboardConfig; no debe poseer reglas de catálogo/noticias/rates |
| Preferencias desktop/mobile y flag de botones | Identity/Account | store y contrato público ya existen; la UI de edición está incrustada en PasswordChangeView |
| Discos, opciones/random, datos de cards y top de catálogo | Catalog | servicios de discs compartidos con muchas vistas; Adventure selecciona catálogo pero no define catálogo |
| Valoraciones, insights de usuario y actividad de votos | Owner de Rates por definir con inventario de dominio; probablemente Catalog para rating y Community para perfiles/rankings | `services/rates` combina operaciones de voto, historial y agregados; no mover todo a Dashboard ni crear CrossDomain automáticamente |
| Noticias internas | Editorial | `/news` administra news; el feed también combina fuentes externas |
| Enlaces y feeds de comunidad externos | Community | canales, web/Telegram y fuente feeds; confirmar ownership del agregado `/news/feed` con consumidores reales |
| UI de tarjeta de disco/modal | Catalog UI si específica; Shared solo para pieza técnica realmente transversal | consumidores múltiples no justifican por sí solos moverla a Shared |
| HTTP, filtros de identidad, caché de sesión | capas actuales / Identity | Dashboard consume capacidades públicas; no duplicar auth/permisos |

Dependencias legacy evidentes: Dashboard importa servicios directamente; `useDashboardConfig` importa `@stores/user/users` y `@services/swal/SwalService`; NewsFeed se importa desde una carpeta llamada HomePage; DashboardBuilder (Account) importa composable/type del Dashboard legacy. La dirección Account → composable Dashboard para catálogo y reglas de layout debe sustituirse por un contrato público pequeño o composición de editor sin dependencia a implementación privada. No se encontró import de Dashboard en services; no se observó ciclo directo entre los archivos revisados. El análisis no ejecutó el detector de ciclos; no afirma ausencia global de ciclos.

No es una composición CrossDomain por el mero hecho de que Dashboard muestre discos, actividad y noticias: es una composición visual de capacidades con owners distintos. Solo introducir CrossDomain si aparece coordinación funcional y contrato real entre dominios.

## 7. Hallazgos clasificados

Estimaciones de esfuerzo de la tarea de corrección, no de validación. Prioridad P1 bloquea migraciones seguras; P2 importa, pero puede hacerse por bloques; P3 opcional o de menor riesgo.

### A — Problemas arquitectónicos

| ID | Evidencia / impacto | Owner | Riesgo de mantenerlo | Cambio propuesto | Prioridad / tamaño |
|---|---|---|---|---|---|
| A1 | `DashboardPage.vue` importa servicios de Discs/Rates y ejecuta transformaciones, estadísticas, muestreo y voto además de componer once secciones. Owner de datos y presentación mezclados; dificulta migrar por dominio. | Catalog / Rates owner; Dashboard solo composición | Cambios de API afectan vista grande; tests aislados difíciles | Primero caracterizar llamadas, después migrar una operación/widget a la vez a API/query del owner; padre solo compone | P1 / M-L por etapas |
| A2 | `useDashboardConfig.ts` mezcla catálogo/layout UI con persistencia remota, store Account, store User legacy, localStorage legacy y feedback Swal. | Dashboard para metadatos/render; Account para preferencia/save | Cruce UI–Account–legacy vuelve frágil el editor y cambios de sesión | Publicar contrato estrecho de preferencias desde Account y separar registro visual Dashboard de la mutación Account sin duplicar estado | P1 / M |
| A3 | DashboardBuilder/ModuleCard están bajo Identity/Account, pero importan tipo/funciones de composable Dashboard legacy; componentes de Account dependen de internals de otra capacidad | Account + Dashboard | Riesgo de ciclos/imports privados durante reorganización | Desacoplar el editor del composable; usar DTO público de Account para configuración y metadatos públicos Dashboard donde haga falta | P1 / S-M |
| A4 | La lista de IDs/orden se mantiene tanto en `DEFAULT_MODULES` como en diez/secciones `isEnabled(...)` de DashboardPage; un ID sin renderer puede aparecer editable o viceversa | Dashboard | Configuración que no corresponde a widget operativo | Registro explícito y tipado de widgets/renderers; evitar duplicar catálogo, con migración preservando IDs | P1 / M |
| A5 | `NewsFeed.vue` está en `views/homePage/components/` pero usado por Dashboard, mientras HomePage es Rankings | Editorial/Community | Ubicación confunde ownership y dificulta encontrar feed | Reclasificar feed por su contrato multifuente/owner tras confirmar consumidores; Dashboard conserva composición | P2 / S |
| A6 | Ruta raíz importa vista legacy directamente y no existe entrada pública Dashboard | Dashboard + composition root | Consumidores futuros pueden depender de carpetas internas | Al crear módulo, publicar view/contrato mínimo y cambiar solo wiring de Router en bloque de integración | P2 / XS-S |

### B — Estado y consultas

| ID | Evidencia / impacto | Owner | Riesgo de mantenerlo | Cambio propuesto | Prioridad / tamaño |
|---|---|---|---|---|---|
| B1 | `onMounted` ejecuta stats/top/week/month/cover/cemetery/streak/recent aunque sus widgets se hayan desactivado. Solo insights verifica `artistas || mundoMusical`. Coste de red y consultas de contenido no mostrado demostrado estáticamente. | Dashboard decide montaje; owners de datos consultan | Trabajo y resultados no utilizados; requests privadas innecesarias | Activar carga desde widget visible o usar `enabled` con visibilidad/resolución breakpoint; preservar fetch del banner separado | P1 / M |
| B2 | `/discs/homeDiscs` llamado para métricas usuario, stats por año y dos periodos; además llamada a `getDiscs` para portada y muestreo cementerio. No son necesariamente consultas idénticas, pero comparten endpoint/recursos y hacen respuestas amplias | Catalog / Rates | Red/recomputación repetida; posible payload no usado | Medir payload y parámetros en runtime; consolidar solo si contratos/medición confirman oportunidad | P2 / M (medición primero) |
| B3 | `getTopRatedOrFeaturedAndStats` tipa una respuesta amplia y widgets consumen subconjuntos; el payload de cada llamada incluye discos/rankings/stats conforme al contrato | Catalog | Datos descargados no consumidos según parámetros/ruta, sujeto a respuesta backend | Confirmar payload real; no cambiar contrato en frontend sin evidencia backend | P2 / S de investigación |
| B4 | Errores atrapados y silenciados en DashboardPage/Adventure; loading termina pero usuario ve vacío/valores iniciales sin poder distinguir error | Owners por widget | Fallos parecen ausencia de datos; diagnóstico pobre | Durante migración de cada widget definir estado de error y recuperación apropiados | P2 / S por widget |
| B5 | Dos fuentes persistentes de preferencias: backend perfil y localStorage/Pinia; además clave legacy desktop migrada | Account | Desfase/precedencia difícil de razonar si se altera el orden de sesión | Documentar/characterizar contrato de sesión y PATCH antes de cualquier simplificación; conservar sincronización vigente | P1 / S |
| B6 | `NewsFeed` guarda default, filtered y visible; filtered/visible duplican colecciones ya cargadas y reset conserva datos | Editorial/Community | Estado redundante, pero impacto de memoria/renders no medido | Derivar resultado visible del feed base o estado filtrado tras caracterizar comportamiento/error | P3 / XS-S |
| B7 | No hay abort/cancelación ni caché Query para peticiones del padre observadas; no se ve refetch en remount deduplicado | Owners de datos | Respuestas tras navegación y repetición de visitas podrían desperdiciar trabajo; impacto no medido | Evaluar Query solo en datos cacheables/compartidos y con keys por sesión; acciones puntuales pueden conservar API directa | P2 / M por query candidata |

### C — Componentes y presentación

| ID | Evidencia / impacto | Owner | Riesgo de mantenerlo | Cambio propuesto | Prioridad / tamaño |
|---|---|---|---|---|---|
| C1 | DashboardPage declara todas las secciones inline; NewsFeed/Adventure ya son componentes separados. La parte inline combina variantes y vistas específicas; ownership de datos impide pruebas independientes | Dashboard + owners por widget | Regresión cruzada y revisión difícil; no es solo tamaño | Extraer únicamente widgets que tengan consulta/estado/contrato independiente, manteniendo padre como composición | P1 / M en tandas |
| C2 | Ranking de rates/covers tiene plantillas repetidas y lógica de split en padre; se expresa con tab compartido | Dashboard / Rates | Correcciones visuales duplicadas | Consolidar presentación al migrar ranking, solo si preserva accesibilidad/orden actual | P3 / S |
| C3 | `AdventureModule` maneja flujo/presentación y acceso directo a API de catálogo; la separación funcional y estados ya son explícitos | Catalog UI | Tests del flujo requieren mocks de servicio directo; fallos se mapean a empty | Mantener componente standalone o extraer composable solo si lo requieren pruebas/reuso; no fragmentar ahora | P2 / S |
| C4 | NewsFeed tiene filtro, modal, mapping de payload, Router y presentación en 400 líneas; manejo del body HTML se limita a click delegado | Editorial/Community | Acopla feed multifuente, navegación y modal editorial | Definir frontera del feed y contrato antes de dividir; no fragmentar por líneas ni alterar seguridad/HTML en D-0 | P2 / M |

### D — Limpieza demostrada

No se registra limpieza automática. Los datos `filteredPosts`/`visiblePosts` y tipos `any` son candidatos a revisión en sus respectivos bloques; no se marcaron como código muerto sin evidencia. No se constató import muerto mediante análisis estático dedicado. Mantener fuera de la migración cualquier deuda no atribuible.

### E — Fuera de alcance

- Mejoras de roles/guards o permisos: no se observó un requisito de rol específico en widgets y no cambiar permisos ni backend.
- Revisión de seguridad del HTML remoto de NewsFeed, contenido editorial y contrato de fuentes: relevante para owner, pero no es necesaria para estructurar Dashboard.
- Rediseño responsive/visual o accesibilidad general; el editor tiene controles de teclado/flechas y el layout usa breakpoint; auditoría visual real requeriría ejecución manual.
- Optimizaciones por renders, lazy loading o payload: no se midieron; no convertir hipótesis estáticas en defectos de rendimiento.
- HomePage Rankings y sus filtros/paginación salvo relación de carpeta/import con NewsFeed.

## 8. Arquitectura objetivo propuesta

Estructura mínima orientativa, ajustable durante cada bloque; no presupone capas DDD:

```text
src/modules/dashboard/
├── index.ts                  # entrada pública mínima para Router/Account
├── DashboardPage.vue         # composición de ruta y contexto de viewport
├── widgets/
│   ├── registry.ts           # id, etiqueta, tamaño y renderer/config
│   ├── CommunityWidget.vue   # si mantiene composición local comunitaria
│   ├── TopDiscsWidget.vue    # luego dividir fuente semanal/mensual solo si útil
│   ├── RandomDiscWidget.vue
│   └── ...                   # solo widgets con frontera y ciclo propios
└── types.ts                  # contrato visual de registro si lo necesita Account

src/modules/identity/account/preferences/
├── ... store actual de preferencias
└── ... editor que modifica el contrato Account sin importar internals Dashboard
```

No crear API Dashboard para proxy de otros owners ni store de datos remotos. El registro Dashboard describe los IDs estables, tamaños/renderers/defaults; el store Account conserva solo configuración por usuario y persistencia. Para que Account presente etiquetas/íconos, debe consumir metadatos publicados por Dashboard o usar una proyección estable acordada, sin replicar la lista en ambos lados. El guardado de preferencias se mantiene en Account; el contexto visual se puede pasar como props o contrato compartido pequeño sin duplicar Pinia.

Los widgets pueden ser componentes presentacionales propios que consumen APIs/Queries de sus owners, o composiciones locales muy pequeñas. Migrar a TanStack Query según caché, deduplicación, cancelación, invalidación y reutilización real. Top rankings y feed son mejores candidatos iniciales de investigación; dado, acción de votar, muestreo del cementerio y aventura son interactivos/bajo demanda y no necesitan Query por defecto. No se recomienda crear CrossDomain a partir de una composición de widgets.

**Conservar:** Store Account y su API pública; preferencias remotas/locales y compatibilidad de defaults; DiscCard y servicios de dominios; DashboardBuilder como experiencia de Account hasta resolver su contrato; NewsFeed/Adventure conductual antes de moverlos.

**Mover/adaptar en implementación futura:** DashboardPage y widgets exclusivos a `src/modules/dashboard`; componente NewsFeed a owner Editorial/Community confirmado; widget Adventure puede residir en Dashboard como UI pero catálogo/API bajo Catalog; editor y preferencias permanecen en Account, desacoplados del registro interno Dashboard. Router solo importa el entrypoint público. No eliminar ni mover nada durante D-0.

## 9. Roadmap de migración

Los bloques preservan el comportamiento actual y se pueden revisar por diff. Las pruebas aquí son criterios para las futuras tareas, no ejecuciones de D-0.

| Bloque | Objetivo / subtareas | Dependencias | Aceptación y pruebas | Tamaño |
|---|---|---|---|---|
| D-1 Contratos y registro | Definir IDs/metadatos canónicos de 11 widgets y contrato de configuración visual; Account consume el contrato sin importar `useDashboardConfig` internals. Confirmar consumidor/owner de feed | D-0; decisión de contrato Account-Dashboard | IDs existentes estables; defaults/sizes labels equivalentes; test de contrato para unknown/new IDs y consumidor; sin store duplicada | M |
| D-2 Esqueleto Dashboard y composición | Crear módulo/entrypoint, mover ruta y composición preservando orden/desktop/mobile; conservar temporalmente carga actual hasta caracterizar | D-1 | `/` autenticada y widgets visibles iguales; Router solo usa entrypoint público; smoke manual desktop/mobile y prueba de composición | M |
| D-3 Auditoría funcional y técnica de widgets | Documentar comportamiento, estados, endpoints, ownership, simplificación, parejas y plan por widgets. No cambia código ni aprueba cambios de producto | D-2 | Auditoría individual de los 11 IDs; cargas/estado trazados; matriz de prioridad; roadmap por tareas; solo documentación y `git diff --check` | XS |
| D-4 Preferencias editor | Reubicar/adaptar `useDashboardConfig` a la frontera Account; mantener cola, optimismo, rollback, reset `[]`, migración legacy y mensajes; editor sigue dentro de Account | D-1; D-2 | pruebas de sesión, edición simultánea, rollback, desktop/mobile, reset, legacy LS; no modifica otros prefs | M |
| D-4a Auditoría del widget Disco aleatorio | Seguir comportamiento frontend y endpoint hasta Catalog/PostgreSQL; comparar opciones de todo catálogo/no valorados/selector. Auditoría documental, no fija la opción de producto | D-3; backend local de referencia | comportamiento y query contrastados; contrato, riesgos, pruebas y estimación documentados; D-4 sigue pendiente | XS |
| D-4b Auditoría del selector por dificultad | Contrastar reglas easy/normal/hard con Rates/Catalog, recuentos, módulo Nest y contrato mínimo; solo análisis. Implementación backend/frontend queda separada y pendiente | D-4a; evidencia actual de Rates y Catalog | Reglas y casos límite resueltos o marcados como decisión; plan de dos repos documentado; no cambia API | XS |
| D-5 Datos compartidos de Insights | Extraer Artistas y Mundo musical como widgets; una consulta compartida del owner Rates solo mientras alguno esté habilitado; decidir contrato de error/empty y claves de Query | D-3, D-4 | una llamada para ambos consumidores visibles; ninguna con ambos ocultos; respuesta y mapeos conservados; sin almacenar en Pinia | S |
| D-6 Widgets de presentación sencilla | La parte de enlaces estáticos de Comunidad quedó extraída junto con Top usuarios en el avance D-8. La extracción frontend de Novedades queda completada según el seguimiento al final del documento; servicios y endpoints permanecen en News, y no se mueven por esta tarea | D-3, D-4 | Novedades solo consulta al estar activa; conserva filtros, navegación y modalidad; sin cambios de preferencias | M |
| D-7 Top 3 semanal y mensual | Ejecución desglosada como D-TOP-2 (extracción) y D-TOP-3 (smoke), después de revisar D-TOP-1; mantener los IDs y cada petición independiente | D-TOP-1, D-4 | Cada instancia consulta solo su período cuando está habilitada; cards/interacciones y preferencias conservadas; smoke de activación separado | S |
| D-8 Comunidad con ranking y Últimos votos | **Avance completado:** extraer enlaces y ranking Community a `DashboardCommunityWidget.vue`, conservando año, tabs, columnas, modal y servicio actual. **Pendiente:** migrar Últimos votos como widget Rates independiente | D-3, D-4 | ranking consulta solo al montar activo o al cambiar año; conserva manejo silencioso de error y respuesta actual; Últimos votos mantiene su extracción independiente | M |
| D-9 Widgets de exploración | Migración de Disco aleatorio y Cementerio a componentes propios; Cementerio ya extraído en D-9d y consulta selección de Catalog al montar/actuar | D-3, D-4 | Conserva preferencias/acciones; carga/error/empty y selección comunitaria backend; D-9e mantiene pendiente el smoke autenticado y regresión final | M |
| D-10 Portada del día y Aventura | Migrar portada y su mutación de voto; AdventureModule ya es componente y conservará su flujo local. Aclarar error frente a cero resultados | D-3, D-4; APIs Catalog/Rates disponibles | carga exclusiva al activar Portada; acción de voto y filtros/resultados de Aventura preservados; sin código de widget en padre | M |
| D-11 Regresión y cierre | Revisar imports, registro completo, persistencia, comportamiento de sesión/roles shell, accesibilidad/teclado editor, responsive, red y documentación canónica | D-1–D-10 | suite proporcional + typecheck/build por cambio; smoke manual desktop/mobile; comparar Network con widgets activos/inactivos; confirmar sin ciclos y sin duplicar estado; límites CI reportados por separado | M |

### Distribución y orden

13 bloques: **XS 3, S 2, M 8, L 0** (D-3, D-4a y D-4b son auditorías XS; los demás tamaños corresponden a implementación). D-3 es solo análisis. D-4 conserva el alcance pendiente de preferencias que antes se había etiquetado D-3. El orden posterior prioriza una consulta compartida ya identificada y widgets acotados, luego respuestas de catálogo y flujos con interacción. Los IDs actuales se conservan; cada migración debe desmontar la carga del padre en el mismo cambio y evitar un composable que vuelva a centralizar la lógica legacy. D-4 y los siguientes bloques son planificación futura: no se inician como parte de D-3. Query se recomienda para Insights compartidos y solo cuando el ciclo de vida, la caché y deduplicación aporten valor; las acciones puntuales pueden seguir usando API directa.

## 10. Riesgos y regresión

- IDs `novedades`, `comunidad`, `top3semana`, `top3mes`, `discoAleatorio`, `portadaDia`, `artistas`, `cementerio`, `mundoMusical`, `ultimosVotos`, `aventura` son persistidos en perfiles. Renombrarlos puede ocultar widgets guardados: mantenerlos estables o diseñar migración explícita.
- Account aplica preferencias desde sesión y también conserva localStorage; proteger precedencia/aislamiento por usuario según contrato vigente. Verificar usuario A→B/logout no conserva preferencias visibles incorrectas.
- La cola/rollback de `useDashboardConfig`, los PATCH parciales del store User, reset `[]`, default al `null`/lista vacía y migración `rv_dashboard_config` son contratos que deben cubrirse antes de mover.
- Breakpoint visual de Dashboard y breakpoint de editor deben mantenerse coherentes; probar viewport pequeño, cambio de tamaño en sesión y orden/disposición desktop/mobile.
- Top week/month y portada/cementerio/dado comparten servicios o datos de catálogo, pero sus parámetros y reglas difieren. Consolidar solo después de verificar contrato y payload.
- La red no se midió; cantidad de solicitudes potencialmente evitables es evidencia estática. Cualquier afirmación de mejora debe validarse con Network/profiling real.
- La revisión no ejecutó el checker de ciclos ni suites funcionales. El estado de gates/baseline de CI debe registrarse en cada bloque; los resultados locales no acreditan GitHub Actions.

### Regresión mínima para cierre

1. Sesión autenticada abre `/`; no autenticada conserva comportamiento guardado de Router.
2. Config desktop/mobile heredada, vacía, parcial y con ID desconocido muestra defaults y conserva orden/activación.
3. Activar/desactivar, reordenar por drag/flechas, reset y fallo de PATCH reflejan estado y rollback previos.
4. Cada widget enabled carga sus datos y estados vacío/error; cada widget disabled evita su consulta exclusiva.
5. Filtros/año/tabs, voto portada, random, cementerio y aventura conservan interacción.
6. NewsFeed mantiene fuentes/filtros/modal/navegación; editor conserva teclado y labels accesibles.
7. Probar desktop/móvil, cambio de viewport, logout y cambio de usuario. Confirmar composición shell Layout intacta.

## 11. Resultado de D-0 y verificaciones

Inventario encontrado: **11 widgets configurables + banner estático**, 2 componentes de widget separados (NewsFeed y AdventureModule), una vista Dashboard, un editor Account y una función de configuración legacy. Las funcionalidades cubren feed de noticias, enlaces comunitarios, rankings de usuarios, top discos semana/mes, azar, portada/voto, artistas, cementerio, mapa musical, últimos votos y aventura de catálogo.

Los hallazgos prioritarios son las cargas iniciales no condicionadas por visibilidad, la vista que concentra composición y lógica de múltiples owners, la frontera `useDashboardConfig` que mezcla Dashboard y Account/legacy User, y la duplicación del catálogo de widgets entre defaults y plantilla. Account mantiene correctamente el ownership de preferencias; la refactorización debe desacoplar el editor y preservar ese contrato.

Verificaciones solicitadas al cerrar D-0: `pnpm run markdown:links`, `git diff --check`, coherencia de enlaces/roadmap y estado de archivos. No se ejecutan tests, typecheck ni build porque no hubo cambios funcionales.

## D-1 — Contratos y registro de widgets

**Estado:** completada el 2026-10-26; registro y consumidores adaptados sin cambiar el contrato persistido ni la UI del banner.

### Registro y consumidores

`src/app/dashboardWidgetRegistry.ts` es el registro estático común y no depende de Dashboard ni de Account. Define cada widget una sola vez con su ID estable, etiqueta actual, icono, tamaño `half/full`, `enabledByDefault` y `order`. No se añadieron descripciones porque no existían en el editor. De esta definición se derivan `DashboardWidgetId`, `DashboardModule`, el mapa de IDs para la plantilla, la comprobación de ID conocido y los defaults ordenados.

`useDashboardConfig.ts` obtiene defaults y reconocimiento de IDs del registro; elimina la lista local anterior. `DashboardPage.vue` usa el mapa derivado en los 11 bloques condicionales y al decidir cuándo cargar insights. `DashboardBuilder.vue` y `ModuleCard.vue` importan su tipo visual desde el registro compartido en vez del composable. El Builder sigue usando el composable actual para preferencias y operaciones; su comportamiento de orden, drag & drop, activación y guardado no cambia. El banner permanece fijo y fuera del registro.

Confirmación del feed para el criterio D-1: `NewsFeed.vue` solo tiene como consumidor visual a Dashboard. El servicio de noticias también lo consumen `ManageNews.vue` y `NewsModal.vue`; sus operaciones de contenido propio corresponden a Editorial. El feed que combina app, web y Telegram permanece donde está hasta D-7, que decidirá owner para las fuentes externas. D-1 no mueve componentes ni servicios.

### Compatibilidad de preferencias

La persistencia sigue siendo exactamente `{ id, enabled }[]` por configuración. No cambia el almacenamiento del servidor/localStorage, las claves, la migración `rv_dashboard_config`, la cola de guardado optimista, el rollback, ni el reset con `[]`. Escritorio y móvil siguen usando propiedades separadas. Las preferencias parciales mantienen el orden guardado, filtran IDs desconocidos como antes y añaden los defaults faltantes al final; una configuración ausente o vacía carga todos los defaults habilitados en el orden previo.

### Pruebas y verificaciones

- Registro: 4 pruebas verifican los 11 IDs, unicidad, orden, etiquetas, tamaños, valores habilitados por defecto y que el banner no se registra.
- Dashboard y Account focalizados: 35 tests aprobados; cubren defaults, desconocidos, configuraciones previas, independencia escritorio/móvil, persistencia, editor con los widgets del registro y referencias de ID del Dashboard.
- Suite completa: 59 archivos y 375 tests aprobados. Typecheck y build aprobados; el build mantiene avisos previos de Browserslist, minificación de `.flex-[2]` y tamaño de chunks.
- ESLint pasó en registro, composable, editor, `ModuleCard` y pruebas. `DashboardPage.vue` reporta 27 hallazgos en áreas legacy ajenas a D-1; las referencias de ID cambiadas no añaden hallazgos.
- `pnpm run identity:boundaries`: cero violaciones productivas. `pnpm run cycles`: comparación informativa porque no resolvió el `HEAD` local; muestra el ciclo type-only preexistente de servicios legacy.
- `git diff --check` aprobado. No se cambia el banner ni se inicia D-2.

## D-B0 — Auditoría focalizada del banner

**Estado:** análisis completado; solución e implementación pendientes. Solo lectura de frontend y de la copia backend accesible. No se modificó frontend ni backend.

### Datos y origen por campo

El banner fijo ocupa `src/views/dashboard/DashboardPage.vue:4–33`. Presenta saludo, fecha, tres conteos y racha. `Bienvenid@ a Riff Valley App` es texto estático; las formas, colores, iconos/decoración y labels también son estáticos.

| Campo visible | Fuente inmediata | Origen / cálculo | Estado y uso |
|---|---|---|---|
| Fecha localizada (`todayFormatted`) | `new Date().toLocaleDateString("es-ES", ...)` en computed | Reloj local del navegador y locale es-ES; no store ni HTTP | Siempre visible. No tiene loading/error; depende de zona horaria local. |
| Nombre (`username`) | computed de `authStore.username` | Pinia Auth (`useAuthStore` desde Identity); perfil recibido por sesión | Dependiente del usuario autenticado. Fallback `""`; no loading/error local. La ruta `/` exige autenticación. |
| Discos votados (`userDiscVotes`) | ref iniciada en 0, usada con `loading` | `fetchUserStats()` toma el top global `topUsersByRates` de la respuesta y busca el registro cuyo `user.username` coincide con `authStore.username`; asigna `rateCount` o 0 | No es un count directo del usuario; si no figura entre los 20 primeros, se presenta 0. Comparación por username. |
| Portadas votadas (`userCoverVotes`) | ref iniciada en 0, usada con `loading` | Mismo método busca en `topUsersByCover`, límite global 20; asigna `totalCover` o 0 | Mismo problema top-20; no es count garantizado del usuario. |
| Discos en la app (`stats.totalDiscs`) | `stats` ref inicia `{ totalDiscs: 0, totalVotes: 0 }` | `fetchUserStats()` asigna `allTimeResponse.totalDiscs` | Loading compartido con los dos conteos del usuario; tras error aparece 0 sin mensaje. |
| Racha (`userStreak`) | ref `null`, plantilla muestra `userStreak ?? '-'` | `fetchStreak()` consulta historial de Rates y cuenta días consecutivos locales | Carga independiente del banner principal, sin loading explícito; `-` significa null (incluye antes de respuesta y fallo). |

No hay estado `error` o estado vacío distinguible para los tres contadores principales: `fetchUserStats` silencia el error y, en `finally`, pone `loading=false`; el usuario ve ceros iniciales. Solo el username/fecha son derivados; los datos numéricos provienen del servidor y de la racha calculada en cliente.

### Recorrido HTTP y backend inspeccionado

1. `DashboardPage.vue` importa `getTopRatedOrFeaturedAndStats` desde `src/services/discs/discs.ts`. `fetchUserStats()` lo invoca sin parámetros; el helper hace `GET /discs/homeDiscs`. La URL efectiva se resuelve contra `VITE_API_BASE_URL`; la copia backend inspeccionada aplica prefijo global `/api`, por lo que su ruta es `GET /api/discs/homeDiscs`. No envía rango, género ni país.
2. `src/router/index.ts` registra `/` con `requiresAuth: true`. La petición envía la sesión configurada por el cliente API. El frontend usa el username de Auth solo para buscar en los rankings devueltos; el backend recibe identidad autenticada y `DiscsController` inyecta `@GetUser() user`.
3. En la copia local accesible `spam-music/spammusic-back-cron/src/discs/discs.controller.ts`, `GET /api/discs/homeDiscs` usa `@Auth()` (sesión, sin role requerido en esa ruta) y llama a `DiscsService.findTopRatedOrFeaturedAndStats(dto, user, dto.genreId)`. `main.ts` fija el prefijo global `api`. `TopStatsQueryDto` hereda de `PaginationDto`, incluyendo rangos opcionales.
4. El método del servicio (`src/discs/discs.service.ts`, alrededor de líneas 750–1068) usa `Repository<Disc>` con TypeORM, relaciones Disc/Artist/Country/Genre y SQL parametrizado. Sin parámetros aplica fecha máxima “hoy” para el cálculo principal, pero `totalDiscs` cae a `discRepository.count()` sin filtro. Ejecuta secuencialmente siete statements de base de datos: globalAvg/median; top 20 discos; count de discos; count global de votos; top 20 usuarios por rates; top 20 por covers; distribución de ratings. La respuesta incluye discos completos (máximo 20), métricas generales, dos rankings y distribución, además de `totalDiscs`.
5. Las métricas del banner, por tanto, no vienen todas de un servicio individual del usuario. `totalDiscs` es de Catalog; los conteos personales se infieren de agregados globales en DiscsService. `fetchStreak()` es otra petición independiente: `getUserHistoryService({ userId, limit:100, type:'rate', order:'DESC' })` → `GET /rates/user/:userId/history`, con `userId` desde Auth; calcula en navegador la secuencia de días que tienen evento `created`. En la copia RatesController inspeccionada, esa ruta no lleva `@Auth()` explícito, al contrario que `GET /discs/homeDiscs`; la protección efectiva global no se pudo confirmar. La ruta frontend autenticada no sustituye autorización backend. Es hallazgo de atribución incierta, fuera de D-B0 y pendiente de contrastar con el backend activo.

**Límite de atribución del backend:** la implementación detallada inspeccionable está en la copia local `spammusic-back-cron`; no se pudo inspeccionar la carpeta `spam-music/spammusic-back` (no contiene `src` accesible; solo lista `node_modules` y `postgres`, esta última con permisos restringidos). No se validó que `spammusic-back-cron` corresponda al código desplegado ni a la misma revisión de backend activa. El resultado backend queda como evidencia de la copia local, no como certificación del contrato en producción.

### Eficiencia, dependencia y alternativas

**Problema demostrado:** la respuesta contiene amplios datos que el banner no usa: hasta 20 discos y sus campos, top 20 de dos rankings y distribución de rates, además de cálculos globales de promedio/mediana. El endpoint realiza siete consultas seriales para entregar esos datos; el banner solo consume `totalDiscs` y dos conteos sacados de rankings. Es una asimetría demostrable leyendo el response/servicio; no hay datos de tamaño de payload o duración real.

**Acoplamiento demostrado:** `onMounted` hace `await fetchUserStats()` antes de lanzar `fetchStats`, `fetchTopDiscs`, portada, cementerio, insights, streak y últimos votos. Ninguna de esas tareas necesita el resultado del banner. El primer `/discs/homeDiscs` retrasa el inicio de las cargas de widgets, aunque las métricas del banner y esos widgets no comparten estado funcional. Luego `fetchStats()` ejecuta otra llamada al mismo endpoint para Comunidad y `fetchTopDiscs()` hace dos llamadas al mismo endpoint en paralelo; son tres usos adicionales con parámetros diferentes. No son deduplicables como una misma respuesta, pero cada invocación repite el pipeline de siete consultas backend.

**Otra llamada asociada al banner:** `fetchStreak()` se lanza sin await en el mismo montaje y hace su propia petición paginada de hasta 100 eventos. No forma parte de `fetchUserStats` ni bloquea el resto de widgets. Es una carga distinta del agregado de conteos, aunque visualmente comparte banner.

Alternativas evaluadas:

| Alternativa | Complejidad / consultas y payload | Ownership, permisos y caché | Evaluación |
|---|---|---|---|
| **A — Mantener `/discs/homeDiscs`** | Cero contrato nuevo, pero conserva el pipeline secuencial de siete queries y response grande cada vez que se necesita el banner. Quitar el `await` suelta las otras cargas, pero no reduce trabajo/payload ni arregla el top-20 como fuente de count personal. | Endpoint autenticado existente, personalización interna via `@GetUser`; Query/caché aún inexistente en este flujo. | No recomendado como solución final. Una desacoplación temporal del `await` reduciría bloqueo percibido, no coste de backend. |
| **B — Consulta específica de un dominio existente** | Catalog podría exponer total de discos y Community/Rates exponer dos agregados personales: respuesta ligera, pero exige dos dominios/endpoints y dos llamadas, salvo que un owner invada el dato del otro. Rates `/stats` existente no sirve de reemplazo: inspección local muestra varios agregados de stats, tasas por mes/género/score, ranking y usuarios totales; tampoco ofrece cover count. | Si se coloca todo bajo Catalog se vuelve a mezclar Rate; si se coloca todo bajo Community/Rates, total de discos no le pertenece. Las dos llamadas podrían tener query keys/invalidaciones propias. | No encaja bien como una consulta única de un solo owner. Opción razonable solo si la arquitectura decide mantener las queries separadas por dominio y acepta dos requests. |
| **C — Agregado en CrossDomain** | Un endpoint de resumen, con dos agregaciones pequeñas: total de discos y un scan/agregado de rates del usuario con filtros `rate IS NOT NULL`/`cover IS NOT NULL`; respuesta mínima. Evita rankings, top discos y distribución. No se midió el coste real ni se validaron índices. | Composición genuina de Catalog (total catálogo) y Community/Rates (actividad propia); requiere sesión y obtiene `userId` del servidor, nunca query param del cliente. Caché privada por identidad. | **Recomendado**, porque el banner combina datos de dos owners reales y el endpoint actual los empaqueta dentro de un agregado general orientado a homeDiscs. Implementarlo como operación explícita CrossDomain solo si ese módulo/contrato forma parte del diseño acordado; no crear un “módulo banner” ni trasladar repositorios ajenos a Dashboard. |

El resumen **no requiere** coordinar dependencias secuenciales: dos queries de conteo pueden ejecutarse en paralelo (Disc repository y Rate repository), o usar una query agregada bien acotada en backend si sus límites y pruebas lo justifican. No es posible confirmar cuántas consultas dará un futuro diseño sin implementarlo. Un buen primer paso es el SQL de agregación acotado y parametrizado por el `user.id` autenticado; evitar leer leaders o registros de detalle.

### Solución propuesta y contrato

Recomendación: nueva operación de lectura agregada del límite CrossDomain, consumida por una query privada de Dashboard cuando la futura migración adopte TanStack Query. No añadir store Pinia ni hacer que Account posea el dato. La exposición exacta entre dominios debe respetar la arquitectura de backend confirmada en el momento de D-B1; los DTOs/aplicaciones no deberían importar internals/repositories de otro dominio.

Contrato propuesto, en JSON:

```ts
interface DashboardSummary {
  totalDiscs: number;
  ratedDiscs: number;
  ratedCovers: number;
}
```

- `totalDiscs`: número de discos de catálogo incluidos por la definición vigente de `discRepository.count()` (contabiliza todos los registros, incluidos los de lanzamiento futuro). Mantener esa definición para paridad; cambiarla sería cambio funcional aparte.
- `ratedDiscs`: cantidad de discos distintos con rate no nulo del usuario autenticado.
- `ratedCovers`: cantidad de discos distintos con cover no nulo del usuario autenticado.
- Todos son enteros no negativos; cero es respuesta válida. No se acepta `userId` ni `username` en parámetros. Endpoint conceptual `GET /api/dashboard/summary` (`@Auth`, `@GetUser`) si el módulo backend CrossDomain existe; el path/nombre se confirma con contrato backend, no se implementa aquí.

La definición basada en discos distintos formaliza el copy “discos votados”; el servicio actual impide crear dos Rate del mismo usuario/disco y actualiza existente. Si se prefiere conservar exactamente conteo de filas, documentarlo antes: la entidad/DDL inspeccionados no prueban una restricción unique en base de datos.

**Frescura/caché futura:** server state privado; query key debe incluir identidad autenticada (la gestión global privada ya cancela y limpia Query al cambiar usuario/permisos). Stale time inicial sugerido: 60 segundos, decisión ajustable por UX. Invalidar después de mutaciones exitosas de Rate (crear/actualizar/eliminar rating/cover) y Catalog (crear/eliminar disco que afecte al total). Cambios de disco que no afectan cantidad no necesitan invalidar `totalDiscs`; evitar acoplar toda mutación de Disc al resumen si no cambia estos campos. No se introduce Query durante D-B0.

**Impacto frontend futuro:** reemplazar el origen de `userDiscVotes`, `userCoverVotes` y `stats.totalDiscs` del banner por la respuesta; dejar `username` y fecha como datos de Auth/cliente; dejar `userStreak` ligado a historial mientras no se migre ese dato separadamente. El banner tendría loading/error/retry definidos; no mostrar 0 indistinguible cuando falle. Puede eliminarse la dependencia de `fetchUserStats` en los top-20, el match por username y el gating `await fetchUserStats()` que retrasa widgets. No eliminar `getTopRatedOrFeaturedAndStats` de `fetchStats` ni `fetchTopDiscs`, pues tienen consumidores propios.

Pruebas para futura tarea: servicio/handler autenticado; agregado cuenta rates/covers nulos por usuario correcto; cero y usuario sin actividad; no se puede elegir `userId` ajeno; total de discos conserva paridad; la query frontend muestra loading/error/zero; cambio de usuario no reutiliza caché; invalidaciones tras rate y alta/baja catálogo; al abrir Dashboard el resumen y widgets empiezan sin orden serial artificial. Verificar SQL/cantidad de statements con tests de servicio o integración apropiados, sin exigir una cifra de performance sin benchmark.

### Inserción propuesta en roadmap

Añadir antes de D-4 un bloque pequeño **D-B1 — Resumen del banner** (tamaño M, coordinado con backend):

1. Confirmar dueño CrossDomain y compatibilidad del endpoint/ruta con el backend activo (dependencia de D-1/contrato de módulos; documentar si CrossDomain no se adopta).
2. Implementar y probar el endpoint agregado en backend como trabajo coordinado separado, con identidad desde `@GetUser` y respuesta acotada. El roadmap frontend no autoriza ni incluye cambio backend por D-B0.
3. Consumirlo desde el banner, añadir Query privada y estados de carga/error, mutaciones/invalidation acotadas, y quitar solo `fetchUserStats` y su await de la secuencia del Dashboard. No modificar los otros usos de homeDiscs.

D-B1 debe quedar entre D-3 y D-4, depender de D-1 para ownership/contrato y tener su trabajo backend listo antes de la integración frontend. D-4 continúa a cargo de condicionar las cargas de sus widgets; se añade D-B1 como predecesor solo para que D-4 no duplique el trabajo de desacoplar la carga del banner. No se inician D-1, D-4 ni D-B1 en D-B0.

**Cierre D-B0:** se documentaron las cinco cifras variables/derivadas, ruta HTTP y pipeline de consulta disponible, payload/trabajo ajeno al banner, dependencia serial demostrada, límites de evidencia del backend local y alternativa recomendada. El rendimiento real del SQL/payload queda pendiente de benchmark y confirmación del backend desplegado.

## D-B1 — Implementar DashboardSummary en backend

**Estado:** backend implementado y verificado con limitaciones documentadas en D-B1.4; la integración frontend se registra en D-B2.

### Contrato implementado

`GET /api/app/dashboard-summary`, protegido por `@Auth()` y sin aceptar identidad del cliente. El controlador toma el `User` autenticado con `@GetUser()`.

```ts
interface DashboardSummaryResponse {
  personal: {
    totalRatedDiscs: number;
    currentStreak: number | null;
    year: { ratedDiscs: number | null; exploredGenres: number | null };
    month: {
      ratedDiscs: number | null;
      exploredGenres: number | null;
      activeDays: number | null;
    };
  };
  catalog: { totalDiscs: number };
}
```

Los `null` indican que la persistencia actual no permite reconstruir esa estadística fielmente; no significan cero. El total personal y el total de catálogo siempre se cuentan con consultas directas.

### Semántica y decisiones de datos

- `totalRatedDiscs`: discos distintos con `rate.rate IS NOT NULL` para el usuario autenticado.
- `currentStreak`: días consecutivos con al menos un evento `rate_vote_events.event_type = 'set'`, si la captura cubre el inicio del tramo; cero cuando no hubo actividad hoy ni ayer y la captura alcanza para confirmarlo; `null` cuando el tramo podría continuar antes del inicio de captura.
- `month.activeDays`: días Madrid distintos con evento `set`, solo si `rate_vote_event_capture.started_at` cubre el mes completo; `null` si la captura comenzó dentro del mes.
- Año/mes `ratedDiscs` y `exploredGenres`: `null`. Los eventos conservan usuario, tipo y timestamp, pero no `rateId`/`discId`; además, la migración no hizo backfill. `Rate.createdAt` tampoco resuelve el dato: un `set` puede ocurrir al cambiar un Rate previo de nulo a válido. No es posible contar discos distintos o unirlos con su género para esos períodos.
- El modelo `Disc` tiene una sola relación `ManyToOne` a `Genre`; cuando exista trazabilidad suficiente, cada asociación actual disco–género contará una vez por género. No se interpreta “explorado” como “descubierto por primera vez”.
- La tabla de eventos registra `change` al modificar una valoración ya válida. El resumen excluye `change`; varias acciones `set` el mismo día cuentan como un día activo.
- Los días, el año/mes actuales y los cortes temporales usan `Europe/Madrid` en PostgreSQL (`AT TIME ZONE`), sin offsets fijos. La captura de actividad de Daily usa esta misma política.

### Ownership y consultas

- CrossDomain compone Rates y Catalog en paralelo; no accede a repositorios de dominio.
- Rates expone una agregación SQL acotada por el usuario: `COUNT(DISTINCT rate."discId")`, días distintos de eventos `set`, actividad mensual y longitud de la racha mediante fechas ordenadas. No carga entidades ni rankings.
- Catalog cuenta discos con `DiscCatalogService.countCatalogDiscs()` y `Repository.count()`, sin relaciones eager.
- No se cambia `/discs/homeDiscs`, la persistencia de votos ni se añaden migraciones o índices.
- Las lecturas fallidas se propagan; el servicio no sustituye errores por ceros.

### Pruebas y limitaciones

Las pruebas unitarias verifican ruta/guards/identidad, composición de módulos, respuesta para conteos cero, conteos de catálogo, propagación de errores y forma de la consulta agregada (`set`, fechas distintas, usuario y zona horaria). `pnpm run verify` pasó: 212 suites unitarias aprobadas, 2.098 tests aprobados, 14 suites y 90 tests omitidos por configuración existente; gates estructural, de tipado, ESLint, typecheck y build sin hallazgos nuevos. Se reintentó fuera del sandbox porque el primer intento no podía enlazar servidores HTTP locales (`EPERM`).

No se ejecutó una integración PostgreSQL para recorrer cambios DST ni casos con géneros reales; las pruebas verifican que el SQL use `Europe/Madrid`, pero la semántica de calendario debe validarse contra una base aislada si se añade esa integración. La limitación funcional principal es que año/mes y parte de la actividad histórica permanecen desconocidos mientras los eventos no incluyan la identidad del disco y no exista backfill.

## D-B2 — Integración frontend de DashboardSummary

**Estado:** completada el 2026-10-26; integración frontend y verificaciones locales registradas. El banner permanece sin cambios.

### Contrato contrastado

El DTO real `src/app/cross-domain/dashboard-summary/dto/dashboard-summary-response.ts` del backend y la sección D-B1.4 de su `roadmap/dashboard.md` confirman el mismo contrato. El frontend lo define en `src/app/dashboardSummary.ts` sin campos extra ni adaptación de respuesta:

```ts
interface DashboardSummary {
  personal: {
    totalRatedDiscs: number;
    currentStreak: number | null;
    year: {
      ratedDiscs: number | null;
      exploredGenres: number | null;
    };
    month: {
      ratedDiscs: number | null;
      exploredGenres: number | null;
      activeDays: number | null;
    };
  };
  catalog: { totalDiscs: number };
}
```

`null` conserva el significado de cobertura histórica insuficiente. En particular, los eventos `set` sin disco identificable y los períodos anteriores a la captura impiden afirmar ciertos conteos; D-B1.4 también documenta cuándo un período completo sin actividad devuelve `0`. El cliente no calcula fechas, períodos, géneros ni rachas, y no usa respuestas legacy como fallback. La función neutral `formatDashboardSummaryValue` representa `null` como «Sin datos históricos» y mantiene `0` como «0».

### Cliente, query y sesión

- Cliente HTTP tipado en `src/app/dashboardSummary.ts`, usando el Axios autenticado existente (`/app/dashboard-summary`, base URL e interceptores compartidos), propagando errores y pasando el `AbortSignal` de TanStack Query.
- Query dedicada `useDashboardSummaryQuery`; su activación desde `DashboardPage.vue` se registra en D-B2.1. La respuesta aún no se conecta a los valores visibles del banner.
- La key incluye `userId`, rol y `authSessionGeneration`. La query exige `isAuthenticated`, identidad y rol; usa caché de 60 s, retención de 5 min y no hace polling.
- La limpieza privada de Identity (`observePrivateQueryCache`) cancela peticiones y limpia Query al cerrar sesión o cambiar de usuario/permisos. No se añade infraestructura global de logout ni estado Pinia para server state.

### Invalidación y límites del Dashboard

`DiscCardComponent.vue` es el punto compartido de los flujos de creación/edición de valoraciones musicales. Tras una mutación confirmada invalida DashboardSummary solo cuando cambia el valor musical, incluyendo retirada y nuevo voto; la excepción de solicitud fallida no invalida. El flujo “portada del día” modifica únicamente `cover` y no invalida. No se alteran payloads ni mensajes de Rates.

En D-B2 no se modificaron `DashboardPage.vue`, el banner, `fetchUserStats`, `/discs/homeDiscs` ni los widgets. La activación de la query sin cambios visuales se registra en D-B2.1; la sustitución de datos y los estados visuales de carga/error quedan para D-B3.

### Tests y verificaciones

- Tests focalizados: `src/app/dashboardSummary.test.ts` cubre contrato numérico, valores nullable en `null`, mezcla de cero/número/`null`, propagación de errores, señal de cancelación, query deshabilitada sin sesión, identidad y generación en la key, limpieza y cancelación al logout, nueva sesión, errores sin resumen vacío, deduplicación entre observadores e invalidación tras mutación musical confirmada/fallida o exclusivamente de portada.
- Resultado focalizado: 11 tests aprobados. Suite completa: 56 archivos y 352 tests aprobados. Typecheck y build Vite de producción aprobados; ESLint de ambos archivos nuevos aprobado; `git diff --check` aprobado.
- ESLint global reporta 1.131 hallazgos y el archivo legacy `DiscCardComponent.vue` reporta hallazgos en regiones no modificadas; no se amplió el alcance para corregirlos. Los cambios de D-B2 no añaden diagnósticos en las líneas modificadas. El build conserva avisos existentes de CSS/chunks grandes y Browserslist desactualizado.
- `cycles` e `identity:boundaries` se ejecutaron en modo local informativo: no detectan violaciones productivas de Identity; el detector de ciclos muestra un ciclo type-only en servicios legacy. La comparación incremental no quedó certificada porque el checker no resolvió el HEAD local. No existe un script/gate independiente de tipado seguro en este frontend; `typecheck` sí pasó.
- `pnpm run verify` no está definido en el `package.json` del frontend; se ejecutaron directamente las verificaciones disponibles. `markdown:links` terminó como informe informativo y señaló un enlace que apunta fuera del repositorio (`roadmap/roles.md:9`). No se afirma ejecución de GitHub Actions.

### Matriz de smoke tests para entorno real

| Caso | Preparación/acción | Resultado esperado |
|---|---|---|
| Usuario autenticado | Consultar `GET /api/app/dashboard-summary` desde la app | Una respuesta con la forma del DTO para la identidad de sesión; no se envía identidad del cliente. |
| Usuario sin sesión | Intentar montar/consultar la query sin sesión | Query deshabilitada y ninguna petición. Si se llama directamente al endpoint, el backend rechaza la solicitud. |
| Usuario con actividad | Consultar con Rates actuales y eventos cubiertos | `totalRatedDiscs` y métricas disponibles muestran los agregados backend. |
| Sin actividad verificable | Usuario sin valoraciones actuales y período cubierto sin `set` | Los conteos confirmables son `0`; el frontend no los cambia. |
| Períodos incompletos | Consultar períodos anteriores a captura o con `set` sin `disc_id` | El backend puede devolver `null`; mostrar «Sin datos históricos», sin tratarlo como error. |
| Cero | Período con cobertura completa y ningún evento | Mostrar `0`, distinto de `null`. |
| Logout y cambio de usuario | Cerrar sesión durante/tras carga y autenticar otra identidad | Cancelar y limpiar caché anterior; la nueva sesión no ve datos previos. |
| Error del endpoint | Simular rechazo HTTP/5xx | Estado de error; no presentar estadísticas vacías ni sustituir con fuentes legacy. |
| Voto musical nuevo | Confirmar un voto musical y observar la query | Invalidación posterior a éxito y actualización al consumirse la query; si falla no invalidar. |

No se ejecutan smoke tests de producción ni se modifican datos reales. D-B3 consumirá esta query para reemplazar el origen de cifras del banner, definir estados visibles de carga/error y retirar entonces solo las llamadas legacy que hayan quedado sin uso.

## D-B2.1 — Activar DashboardSummary para smoke tests

**Estado:** activación local implementada el 2026-10-26; smoke tests con backend/frontend reales pendientes.

`DashboardPage.vue` invoca una vez `useDashboardSummaryQuery()` durante `setup` y devuelve el resultado del composable para inspección en Vue Devtools. La query sigue condicionada por sesión válida, identidad y rol; conserva la key por usuario/rol/generación, el caché privado, la cancelación por `AbortSignal` y la invalidación tras cambios musicales. No se añade petición Axios manual ni store.

La respuesta no alimenta la plantilla: no cambian banner, contadores, loading visible ni estilos. `fetchUserStats`, `fetchStreak` y el resto de consultas legacy permanecen activos temporalmente; no se eliminan cálculos ni widgets. El query cache deduplica observadores de la misma key y no hay watchers nuevos.

### Verificación de activación

- `DashboardPage.test.ts`: 4 pruebas verifican una solicitud al montar autenticado y que las consultas legacy siguen funcionando; ninguna solicitud de resumen sin sesión; cancelación al desmontar; y que un error del resumen no desmonta la página.
- `dashboardSummary.test.ts`: 11 pruebas focalizadas adicionales cubren semántica del contrato, null/0, sesión, cambio de identidad, logout, errores, cancelación, invalidación y deduplicación entre observadores.
- Ejecución conjunta: 15 tests aprobados. Typecheck, build Vite de producción, ESLint focalizado de los archivos nuevos y `git diff --check` pasaron. La build emitió avisos de minificación CSS, tamaño de chunks y Browserslist. No se ejecutan smoke tests reales ni se modifican datos.

Para la comprobación manual posterior, abrir DevTools → Network, recargar `/` con sesión iniciada y filtrar `dashboard-summary`; debe aparecer una sola petición a `/api/app/dashboard-summary`. Vue Devtools debe mostrar `dashboardSummaryQuery` en el estado de setup. Al cerrar sesión o cambiar usuario no se deben conservar datos de la sesión anterior. La matriz completa de casos de smoke test sigue arriba y queda pendiente de ejecución.

## D-B3 — Actualizar estadísticas del banner

**Estado:** completada el 2026-10-26; integración y verificaciones locales finalizadas. Sin cambios backend.

### Contrato, componente y distribución

`src/app/dashboardSummary.ts` refleja el DTO ampliado del backend: añade `personal.totalExploredGenres`, `personal.totalActiveDays`, `personal.year.activeDays`, `catalog.discsThisYear` y `catalog.discsThisMonth`. No se cambia la ruta, Axios, la query key, la política de caché ni la invalidación existente.

`src/views/dashboard/components/DashboardWelcomeBanner.vue` es un componente de presentación. `DashboardPage.vue` conserva la query, el estado de sesión y el reintento, y pasa usuario, fecha, datos y estados como props. El componente no consulta servicios.

El saludo, fecha, fondo, paleta, bordes y gradiente del banner se conservan. Las cuatro columnas son:

1. **Este mes:** discos votados, géneros explorados, días activos y discos del catálogo con lanzamiento musical en el mes.
2. **Este año:** las mismas métricas con lanzamientos del año.
3. **Histórico:** contadores personales históricos y catálogo completo.
4. **Racha:** `personal.currentStreak`, llama y mensaje motivador independiente de los días activos.

La composición permite una columna estrecha, dos columnas desde 390 px y cuatro bloques en escritorio amplio; las cifras usan tabular numbers y agrupación española, también para valores de cuatro dígitos. Los nombres distinguen actividad personal de lanzamientos del catálogo. No se presenta la métrica de valoraciones como primeros descubrimientos.

### Lógica legacy retirada y estados

Se retiran `fetchUserStats` y la llamada agregada que solo obtenía cifras antiguas del banner, los contadores de portadas votadas, `fetchStreak`, el estado `userStreak` y la lectura de historial de Rates usada exclusivamente por esa racha. Se conservan `getTopRatedOrFeaturedAndStats` para Rankings/Top discos, `getDiscs` para catálogo, portada del día y cementerio, así como servicios Rates de Top usuarios, insights, últimos votos y votación. Portada del día continúa esperando el resumen para usar `catalog.totalDiscs`; no añade otra consulta.

Con sesión válida, la carga ocupa las cuatro columnas con placeholders `…`; `0` se muestra como valor y `null`/dato ausente como `—`. Los errores presentan un aviso discreto y botón Reintentar; si ya había datos, estos se mantienen visibles. Sin sesión, la query sigue desactivada y el componente no renderiza métricas privadas.

### Pruebas y verificaciones

Tests focalizados en `DashboardWelcomeBanner.test.ts`, `DashboardPage.test.ts` y `dashboardSummary.test.ts` cubren las cuatro columnas, contrato completo, mapas mensual/anual/histórico, catálogo, singular/plural, agrupación española, racha 0/1/varios/null, ceros, nullables, carga, error/reintento, sesión ausente, invalidación con actualización visible y continuidad de consultas de otros widgets. También comprueban que no se lanza el fetch legacy global ni la consulta de historial de racha.

### Verificación D-B3

- Tests focalizados: 26 aprobados en 3 archivos.
- Suite Vitest: 58 archivos y 367 tests aprobados.
- `pnpm run typecheck` y `pnpm build`: aprobados. Build con avisos ya presentes de Browserslist, minificación de `.flex-[2]` y tamaño de chunk; no se amplió el alcance para corregirlos.
- ESLint focalizado de los archivos del cambio: sin hallazgos en el componente, tests y contrato. Al incluir el `DashboardPage.vue` legacy, ESLint reporta 27 errores de accesibilidad/`any` en zonas preexistentes fuera del cambio; no se corrigieron.
- `pnpm run cycles`: informativo porque el checkout no resuelve `HEAD` para comparación; informa un ciclo type-only preexistente entre servicios legacy. `pnpm run identity:boundaries`: cero violaciones productivas, comparación también informativa por la misma limitación.
- Detector Impeccable sobre `DashboardPage.vue` y `DashboardWelcomeBanner.vue`: sin hallazgos deterministas. `git diff --check`: aprobado.
- `pnpm run markdown:links`: informe informativo con un enlace fuera del repositorio ya existente en `roadmap/roles.md:9`.

No se ejecutó inspección visual con navegador autenticado; las pruebas cubren la estructura responsive, estados y cifras, no una captura en tamaños reales. Los límites de cobertura histórica del backend siguen descritos en D-B1.4; no se hicieron smoke tests contra producción ni se inició otra tarea del roadmap.

## D-B1.1 — Auditoría de eventos de votación

**Estado:** completada; auditoría de solo lectura documentada. No se modificaron código funcional, entidades ni base de datos; no se inició D-B1.2 ni el frontend.

### 1. Modelo actual

| Elemento | Persistencia y relaciones | Restricciones observadas |
|---|---|---|
| `Rate` | UUID `id`; `rate` y `cover` son `decimal(4,2)` nullable; `createdAt` y `editedAt` son timestamps de TypeORM (`editedAt` nullable); `ManyToOne` a `User` y `Disc`, ambos eager y con borrado en cascada según la entidad. | La entidad no declara unique por `(userId, discId)`. La migración `1791127430930-AddDiscQueryIndexes` crea un índice normal `(userId, discId)`, no único, además del índice por `discId`. El servicio serializa `create` con advisory transaction lock; eso no sustituye una restricción única para escrituras que eludan ese servicio. Los DTOs permiten cero y nulidad (`Min(0)`, `Max(10)`); el comentario del DTO de creación dice mínimo 1, una inconsistencia documental sin efecto en el validador. |
| `RateVoteEvent` | UUID `id`; `user_id` FK a `users`; `occurred_at timestamptz`; `event_type`. No tiene FK a `Rate` o `Disc`, ni `discId`, objetivo ni valores anteriores/nuevos. | PK; CHECK limita `event_type` a `set` o `change`; FK de usuario `ON DELETE CASCADE`; índices `(user_id, occurred_at)` y `(occurred_at)`. No se impone cardinalidad por operación ni por disco/día. |
| `rate_vote_event_capture` | Fila singleton `id=1`, `started_at timestamptz DEFAULT clock_timestamp()`. | PK y CHECK `id = 1`. Se inserta al ejecutar la migración del ledger. |
| Daily | `user_app_daily_activity` almacena `(user_id, activity_date)` como PK y `date`; no está ligado a un evento Rate. | La actividad general de la app no prueba actividad de voto. El endpoint Daily inserta el día Madrid con `ON CONFLICT DO NOTHING`. |

La entidad no fija explícitamente el tipo de `Rate.createdAt`/`editedAt`; TypeORM PostgreSQL mapea `@CreateDateColumn()`/`@UpdateDateColumn()` a `timestamp` sin zona horaria. No se inspeccionó el catálogo de una base de datos activa, por lo que el tipo físico debe confirmarse en el preflight de una futura migración. Los eventos sí son explícitamente `timestamptz`.

### 2. Matriz real de transiciones

Los eventos se derivan únicamente de `previousRate` y `nextRate`, no de la operación HTTP ni del campo `cover`:

| Estado musical anterior → nuevo | Contexto | Evento actual | Resultado real |
|---|---|---|---|
| Sin `Rate` → `null`/ausente | `POST /rates`, por ejemplo solo portada | Ninguno | Puede crearse un Rate cover-only. |
| Sin `Rate` → `7` | `POST /rates` | `set` | Un evento, aunque la misma operación también incluya `cover`. |
| `null` → `7` | `PATCH /rates/:id` o `POST` sobre un Rate cover-only ya existente | `set` | Se registra como set, aunque ese usuario pudiera haber votado antes al mismo disco. |
| `7` → `9` | `PATCH` o `POST` sobre Rate existente | `change` | Un evento; no distingue qué puntuaciones se cambiaron ni guarda sus valores. |
| `7` → `7` | Cualquier escritura que conserve la puntuación | Ninguno | Un cambio solo de portada tampoco produce evento musical. |
| `7` → `null` | `PATCH /rates/:id` | Ninguno | El voto actual queda retirado; no hay evento `clear` y el histórico no puede fechar la retirada. |
| `null` → `8` tras `7 → null` | `PATCH` posterior | `set` | Es actividad de voto según la transición actual, pero no prueba primer descubrimiento. |
| Portada `null` → valor, valor → otro valor o valor → `null` | Create/PATCH de cover | Ninguno | El ledger no registra transiciones de portada. |
| `Rate` existente → eliminado | `DELETE /rates/:id` | Ninguno | Se elimina el estado actual; los eventos anteriores sobreviven porque el ledger no tiene FK a Rate. |

Un evento individual no representa un cambio de portada y tampoco puede contener dos eventos: el método compara solo el campo musical `rate` y como máximo inserta uno.

### 3. Semántica, timestamps, transacción y errores

- En el código actual, `set` significa exactamente **`previousRate` nulo/ausente y `nextRate` no nulo**. No significa “primer voto histórico”. `change` significa **ambos no nulos y numéricamente distintos**. Una puntuación igual, `nextRate` nulo y cualquier cambio de portada no generan evento.
- `RatesService.create` resuelve el disco, obtiene un advisory lock por usuario/disco, busca Rate existente y luego hace `save` seguido del insert del evento. `update` obtiene lock pesimista, comprueba ownership y también hace `save` seguido del insert. Cada escritura musical detectada inserta como máximo un evento.
- Rate y evento se escriben mediante el mismo `EntityManager.transaction`. Si el insert de evento falla, la excepción escapa del callback y PostgreSQL revierte la operación completa. El servicio transforma un fallo no HTTP en `InternalServerErrorException`; no deja confirmada solo la mitad del cambio. El unit test prueba la propagación del fallo; el spec PostgreSQL aislado demuestra rollback transaccional de un insert fallido, aunque su fixture no invoca el `RatesService` real.
- `occurred_at` se genera con el default `CURRENT_TIMESTAMP`, que en PostgreSQL representa el inicio de la transacción, no el instante de ejecución del `INSERT`. Normalmente la diferencia será pequeña, pero una transacción larga que cruce la medianoche local puede asignar el día anterior. La migración usa correctamente `clock_timestamp()` para `capture.started_at`; no para cada evento.
- `Rate.createdAt` fecha la fila, no el primer voto musical: un Rate puede nacer por portada y recibir un voto después. `editedAt` se actualiza por modificaciones musicales o de portada y conserva solo el último instante; no indica qué campo cambió ni guarda la secuencia. Ninguno equivale al ledger.

### 4. Cobertura histórica y fuentes alternativas

La migración `1792000000000-CreateRateVoteEvents` crea el ledger vacío y la fila singleton de captura; no inserta eventos desde `rate`. El identificador de migración codifica `2026-10-14T17:46:40Z`, pero eso no demuestra cuándo se aplicó en cada entorno. La fecha de corte autoritativa es el valor real de `rate_vote_event_capture.started_at`; no se consultó la base activa en esta auditoría.

Se puede verificar el historial nuevo desde esa captura y solo con la semántica incompleta descrita arriba. Los `Rate` que existen hoy permiten contar valoraciones actuales y exponer `createdAt`/último `editedAt`, pero no recuperan cambios intermedios, valoraciones borradas, retiradas, objetivo musical/portada del último edit, ni un primer voto por disco. No hay backfill fiel de esas transiciones.

`RatesHistoryService` no es una fuente histórica equivalente: sintetiza `created` desde la fila actual y como máximo un `updated` desde el único `editedAt`; el filtro de tipo mira los valores actuales, por lo que puede excluir un voto retirado. Su `dayLabel` usa getters locales de JavaScript y no establece `Europe/Madrid`. Los agregados de RatesStats también operan sobre Rates actuales; `getUserStats(year)` filtra por año de lanzamiento del disco, mientras agrupa los datos mensuales usando `rate.createdAt`. No es el año/mes real de una transición musical.

La actividad administrativa sí diferencia cobertura: `ActivityStatisticsService` lee la fecha de captura y expone `voteDataSince` como el siguiente día local para no declarar completo un día de captura parcial; `ActivityInactivityService` separa estado actual, evidencia de eventos y cuentas creadas después de captura. Esa política de cobertura es reutilizable. `user_app_daily_activity` y los accesos son actividad general, no una fuente alternativa para votos.

### 5. Problemas demostrados

1. `set` no puede distinguir primer voto de re-voto tras `rate → null`; además, `clear` y `DELETE` no dejan evidencia de cambio de estado.
2. El ledger no identifica disco ni si un evento es música o portada, así que no permite contar discos por período, reconstruir descubrimientos ni atribuir géneros.
3. Un índice normal y un advisory lock del servicio no garantizan unicidad si se escribe por otro camino; además, duplicados previos o externos harían que `Rate` actual no fuera un estado único por usuario/disco.
4. Las fechas de `Rate` describen fila/última edición, no cada transición. Cover comparte `editedAt` y un Rate cover-only puede preceder al voto musical.
5. `CURRENT_TIMESTAMP` es estable a nivel de transacción. Para actividad alrededor del corte de día Madrid, `clock_timestamp()` o un instante de escritura explícito es más fiel.
6. La ruta `GET /rates/user/:userId/history` no lleva `@Auth()`; el spec del controlador documenta explícitamente que esa ruta sigue sin guard. Es una decisión/contrato de autorización existente que conviene confirmar; no se cambió ni se considera fuente suficiente para DashboardSummary.
7. La clasificación de un disco puede cambiar: guardar solo `discId` y luego unir a `Disc.genre` atribuiría el género actual a eventos antiguos, no necesariamente el que tenía el disco cuando se votó.

### 6. Evolución mínima recomendada

Mantener `user_id`, `occurred_at` y el identificador de evento existentes. Para eventos nuevos, añadir:

| Campo | Recomendación | Uso y compatibilidad |
|---|---|---|
| `disc_id` | UUID, obligatorio para nuevos eventos, nullable en esquema histórico | Necesario para discos por período, primer voto por usuario/disco y vínculo con Catalog. Las filas antiguas quedan `NULL`; no se atribuye un disco por inferencia. La política FK debe preservar historia cuando se borre un disco: `SET NULL` conserva fecha/actividad pero pierde el conteo de discos; mantener el UUID sin FK conserva agregación pero admite referencias huérfanas. Decidirlo con la política de borrado de Catalog. |
| `target` (`disc` / `cover`) | Obligatorio para nuevos eventos, nullable en históricos | Distingue actividad musical de portada y evita que una portada extienda la racha musical. Valores con CHECK. |
| `previous_value`, `new_value` | Decimal compatible con `Rate` (`numeric(4,2)`), ambos nullable en históricos | Permite comprobar transiciones, clears y cambios; el tipo/evento podría derivarse, pero persistir ambos valores deja evidencia auditable y diferencia `null → valor`, `valor → valor`, `valor → null`. No hacer backfill. |
| `genre_id` snapshot | Recomendado si “géneros explorados” significa el género asociado al votar | `discId` basta para unir el género **actual**, pero no para el género histórico si Catalog reclasifica el disco. Guardar el UUID de género observado al crear el evento permite el conteo histórico; no depender de FK restrictiva si debe sobrevivir a la eliminación de un género. Puede omitirse solo si producto acepta explícitamente clasificación vigente. |

Ampliar `event_type` a `set`, `change` y `clear` para las transiciones no nulas → nulas. Mantener el campo por legibilidad/compatibilidad, aunque se derive de target y valores. `set` significaría cualquier transición de nulo a valor; “descubrimiento” seguirá siendo una consulta sobre el primer `set` musical por pareja usuario/disco en cobertura completa, no una clase de evento inferida solo por la transición.

Las columnas de evento antiguas deben seguir siendo válidas con identidad/target/valores nulos y conservar su tipo/timestamp originales. No se deben marcar como musicales ni unir a Rate por proximidad temporal.

### 7. Definiciones para futuras estadísticas

- **Valoración actual:** contar Rate distintos con `rate IS NOT NULL` para discos musicales y `cover IS NOT NULL` para portadas. Cero es una puntuación válida porque el DTO permite `0`; solo `NULL` significa ausencia. La retirada o eliminación afecta al conteo actual.
- **Actividad musical:** eventos completos `target=disc`, `event_type=set`, `new_value IS NOT NULL`; agrupar por fecha de `occurred_at` en `Europe/Madrid`. `change`, `clear` y `cover` no cuentan como día de racha.
- **Descubrimiento:** primer `set` musical histórico para `(user_id, disc_id)`. Si la cobertura de esa pareja empieza tarde o hay eventos históricos no atribuibles, el descubrimiento previo al corte es desconocido. Re-votos y `change` no crean otro descubrimiento.
- **Discos votados por mes/año:** `COUNT(DISTINCT disc_id)` de `set` musicales en el período local. Esto mide actividad, incluye un re-voto tras retirar la puntuación y no equivale a cantidad actualmente valorada.
- **Géneros explorados por mes/año:** `COUNT(DISTINCT genre_id)` de esos eventos. Si no se guarda snapshot, declarar que se usa el género actual de Catalog y aceptar reclasificación retroactiva; no mezclar ambos modelos.
- **Días activos:** `COUNT(DISTINCT local_day)` de `set` musicales válidos. Racha actual termina en hoy o ayer y recorre días consecutivos; mejor racha recorre todos los días de la cobertura. Si la secuencia toca el límite de captura, el valor puede ser un límite inferior y se devuelve como incompleto/desconocido.
- Los períodos anteriores a la fecha de cobertura no son cero por defecto. Reutilizar `voteDataSince`/estado de cobertura de Activity para distinguir cero cubierto, parcial y desconocido.

### 8. Migración y escritura propuestas

1. Preflight read-only: confirmar tipos físicos y constraints de `rate`, índices, estado real de `rate_vote_event_capture`, duplicados `(userId, discId)`, reglas de borrado de Disc/Genre y orden de despliegue. No ejecutar backfill de timestamps desde `createdAt`/`editedAt`.
2. Migración aditiva: agregar columnas nullable para legado (`disc_id`, `target`, `previous_value`, `new_value`, y `genre_id` si se aprueba snapshot); ampliar CHECK de tipo a `clear`; conservar CHECK de id y FK de usuario; elegir conscientemente la política de relación con Disc/Genre. No hacer `SET NOT NULL` mientras existan eventos viejos incompletos.
3. Evolución de entidad y writer: registrar una transición por campo (o definir explícitamente si una operación conjunta genera dos eventos) después de guardar Rate, dentro de la misma transacción. Capturar valores previos y nuevos reales; solo emitir para cambio efectivo. Para el timestamp usar reloj DB de inserción (`clock_timestamp()`) o un instante UTC único definido por operación; documentar la opción.
4. Leer el `genre_id` de la relación actual dentro del flujo transaccional si se adopta snapshot. Probar concurrencia en usuario/disco, portada simultánea, rollback y operación que cambia música y portada a la vez.
5. Adaptar agregados por encima de Rates/Activity y DashboardSummary con filtros de target, coverage y zona Madrid. Los eventos antiguos permanecen sin atribución; nunca convertir su ausencia de `disc_id` en cero para meses que los incluyan.
6. Añadir índices solo tras revisar `EXPLAIN (ANALYZE, BUFFERS)` en datos representativos. El índice actual por `(user_id, occurred_at)` apoya el filtro por usuario/tiempo; posibles índices con target/disco dependen de las consultas y volumen reales.

### 9. Riesgos y dependencias

- La migración no recupera automáticamente estadísticas previas; DashboardSummary seguirá devolviendo `null` para rangos afectados aunque ya existan eventos completos nuevos.
- `set`/`change` ya se consume en informes de Identity Activity; ampliar `clear` requiere actualizar sus conteos, DTOs y cobertura sin alterar la interpretación de endpoints existentes.
- Snapshot de género depende de acordar qué significa “género explorado”; Catalog tiene una sola relación `Disc.genre` (`ManyToOne`), pero esa relación es mutable.
- FK de disco, cascadas y borrado físico deben coordinarse con Catalog para no eliminar historia accidentalmente.
- Sin unicidad física del Rate, primera creación/concurrencia debe seguir protegida; evaluar deduplicación y constraint única como decisión aparte, no asumir que el índice existente lo hace.
- La ruta pública de historial de Rates requiere confirmar intención de autorización, pero es independiente de introducir el ledger nuevo.
- No se midieron planes SQL ni se leyó el `started_at` de un entorno activo; la fecha operacional de corte y los índices necesarios quedan pendientes de preflight.

### 10. Plan posterior

- **D-B1.2 — Persistencia y writer:** migration aditiva, campos/event types, transiciones transaccionales, decisión FK/snapshot y pruebas de contrato/rollback. No incluye backfill especulativo.
- **D-B1.3 — Agregados con cobertura:** consultas de valoración actual, actividad, descubrimiento, meses/años, géneros y rachas; adaptar la respuesta backend con nullability/coverage histórica; tests unitarios y SQL de casos límite.
- **D-B1.4 — Verificación PostgreSQL y rollout:** suite aislada loopback con migración up/down, transiciones completas, rollback, concurrencia, medianoche/DST Madrid y casos históricos incompletos; comparar planes de índices candidatos y documentar corte observado por entorno.

La separación sigue siendo útil: primero se estabiliza qué evento se persiste, después se construyen métricas sobre ese contrato y finalmente se valida la semántica temporal y el rollout con PostgreSQL aislado. Ninguna subtarea fue iniciada en D-B1.1.

## D-B1.2 — Migración y escritura de eventos de votación

**Estado:** implementación y gates locales completados; no se ejecutaron migraciones ni pruebas contra una base de datos real. D-B1.3 permanece pendiente.

### Contrato persistido

La migración `1792010000000-AddDiscAndValuesToRateVoteEvents` añade a `rate_vote_events`:

- `disc_id uuid NULL`, con FK a `disc(id)` y `ON DELETE SET NULL`.
- `previous_value decimal(4,2) NULL`.
- `new_value decimal(4,2) NULL`.

No se añaden `target`, `genre_id`, `clear`, snapshots ni índices. Se mantienen el UUID de evento, el usuario, `event_type` (`set`/`change`) y `occurred_at`, junto con sus constraints e índices previos. No se actualiza ni elimina ningún evento existente y no se hace backfill. El `down` elimina la FK y las tres columnas nuevas en orden inverso.

La relación con Disc es opcional para que los eventos históricos sigan siendo legibles. Si se elimina físicamente el disco, `ON DELETE SET NULL` conserva el evento y su timestamp, aunque se pierde su atribución a disco para estadísticas futuras.

### Escritura y transiciones

`RatesService` registra `discId`, el valor musical anterior y el posterior al insertar el evento dentro de la transacción existente que guarda Rate. La creación usa el disco solicitado; la actualización usa el disco asociado al Rate bloqueado. Se conserva el advisory lock y el timestamp lo sigue asignando el mecanismo actual de base de datos. Un fallo al insertar el evento se propaga y la transacción revierte también el cambio de Rate.

| Transición musical | Escritura persistida |
|---|---|
| `null → 7` | Un `set`, valores `NULL`, `7` |
| `7 → 9` | Un `change`, valores `7`, `9` |
| `7 → null` | Ningún evento |
| `null → 8` después de un voto anterior | Un `set`, valores `NULL`, `8` |
| Solo cambia la portada | Ningún evento |
| La valoración musical no cambia | Ningún evento |

`set` describe la transición de nulo a valoración en la operación actual; no prueba por sí solo que sea el primer descubrimiento histórico. Los cambios y retiradas de portada siguen fuera del ledger. No se añadió unicidad a `(user_id, disc_id)`: la ausencia de constraint única y la posible existencia de Rates duplicados siguen siendo un riesgo preexistente, no estudiado ni corregido aquí.

### Compatibilidad, pruebas y limitaciones

Los eventos anteriores conservan `disc_id`, `previous_value` y `new_value` en `NULL`. El endpoint DashboardSummary y sus consultas no se modifican; la cobertura incompleta continúa siendo responsabilidad de D-B1.3. La clasificación histórica usará la clasificación vigente del disco, según la decisión de producto; una reclasificación cambia el resultado de agregados históricos por género.

Las pruebas unitarias caracterizan los valores escritos en `set` y `change`, el borrado y los cambios solo de portada/sin cambios musicales, además del rollback al fallar la inserción. Una prueba de esquema comprueba las columnas nullable, ausencia de backfill y reversión. La prueba PostgreSQL existente, ampliada para comprobar legado y `ON DELETE SET NULL`, es optativa y quedó omitida; por tanto no se afirma verificación de PostgreSQL real.

Verificación local de esta subtarea: pruebas focalizadas de Rates/controlador/migración (37 tests pasaron; 9 pruebas de integración optativas fueron omitidas) y `pnpm run verify` (213 suites pasaron, 14 omitidas; 2.101 tests pasaron, 91 omitidos). También pasaron typecheck, build, ESLint de solo lectura, gates estructural y de tipado seguro, y `git diff --check`. No se ejecutaron E2E, migraciones ni D-B1.3.

La propuesta inicial de D-B1.1 que contemplaba `target`, `clear` y un snapshot `genre_id` queda supersedida por esta decisión mínima: el ledger registra exclusivamente transiciones musicales `set`/`change`, identifica disco y valores, y las estadísticas usarán la clasificación actual de Catalog. Las estadísticas nuevas, sus estados de cobertura y su validación temporal siguen pendientes de D-B1.3/D-B1.4.

## D-2 — Estructura base y coordinación de widgets

**Estado:** completada el 2026-10-26; composición trasladada al coordinador visual y verificaciones locales aprobadas. No se migraron las cargas ni el estado interno de widgets.

### Coordinación y composición

`src/views/dashboard/components/DashboardWidgetGrid.vue` recibe `modules` de `useDashboardConfig`, elegidos por `DashboardPage.vue` según el viewport. Recorre las preferencias en su orden actual, renderiza solo entradas habilitadas que tengan slot y usa el ID estable del registro como clave de Vue. El registro D-1 continúa siendo la única fuente de IDs y tamaños: el grid toma de él `half/full` y conserva el layout flex actual, una columna en móvil y dos mitades desde el breakpoint `lg` para los módulos `half`. Los módulos `full` ocupan todo el ancho. El grid no conoce servicios, respuestas, DTOs ni estado de dominio.

`DashboardPage.vue` mantiene el banner fijo fuera del grid, selecciona la preferencia independiente de escritorio/móvil y conserva todas las declaraciones de contenido de los widgets como slots identificados por su ID. También sigue siendo responsable temporal de las cargas y estado legacy, callbacks, acciones y sus interacciones. El contenido del slot conserva el ámbito de DashboardPage, por lo que los callbacks existentes mantienen su comportamiento. Al cambiar de preferencias o viewport, Vue concilia los wrappers por ID; no se recrean ni duplican instancias de widgets que siguen habilitados.

Los once widgets (`novedades`, `comunidad`, `top3semana`, `top3mes`, `discoAleatorio`, `portadaDia`, `artistas`, `cementerio`, `mundoMusical`, `ultimosVotos`, `aventura`) pasan por el grid para orden, tamaño y montaje visual condicional. Esto no significa que sus responsabilidades internas ya se hayan migrado: nueve composiciones siguen inline en DashboardPage; `novedades` conserva `NewsFeed.vue` y `aventura` conserva `AdventureModule.vue`, ambos como componentes existentes. No se crearon wrappers vacíos ni se movieron componentes, peticiones o servicios.

### Contrato para las migraciones

- Cada widget conserva el ID persistido del registro D-1 y su slot declara ese mismo ID.
- En su migración, el componente del widget será dueño de sus datos, estados de carga/error y estado local de interacción; las APIs seguirán en el owner de dominio que corresponda.
- El grid solo coordina orden, tamaño y presencia. No inspecciona respuestas HTTP ni DTOs.
- DashboardPage no pasará grandes objetos de estado particulares de cada widget. Los eventos subirán al padre solo cuando necesiten coordinación externa real.
- Mientras un contenido permanezca acoplado al estado legacy del padre, su slot podrá seguir expresando esa composición sin introducir un componente vacío ni trasladar lógica anticipadamente.

Account sigue siendo propietario de las preferencias. D-2 no cambia `useDashboardConfig`, DashboardBuilder, preferencias separadas de escritorio/móvil, orden, visibilidad, guardado optimista, rollback, migración legacy ni persistencia.

### Montaje condicional y cargas pendientes

El grid no invoca el slot de un widget deshabilitado, de modo que su subtree Vue no se monta. Esto ya condiciona efectos de componentes que pertenezcan al slot, por ejemplo el feed existente. Las cargas que siguen siendo lanzadas por DashboardPage continúan activas, aunque el widget correspondiente esté apagado; no se trasladaron ni se adelantaron/retrasaron en D-2:

| Carga todavía en DashboardPage | Comportamiento actual respecto a preferencias |
|---|---|
| `fetchStats()` para Comunidad/Top usuarios | Se inicia al montar, esté Comunidad habilitada o no. |
| `fetchTopDiscs()` para Top 3 semanal y mensual | Lanza las dos consultas al montar, estén habilitados esos widgets o no. |
| `fetchCemeteryDiscs()` | Se inicia al montar aunque Cementerio esté deshabilitado. |
| `fetchRecentVotes()` | Se inicia al montar aunque Últimos votos esté deshabilitado. |
| `fetchHomeInsights()` para Artistas y Mundo musical | Se ejecuta si al menos uno de los dos está habilitado; la respuesta alimenta ambos y no se separa por widget. Si ambos están deshabilitados no se ejecuta. |
| `fetchCoverOfDay()` para Portada del día | Se ejecuta cuando DashboardSummary entrega datos o error, aunque Portada del día esté deshabilitada. |
| `rollDice()` | Solo se ejecuta por acción del usuario; no es una carga inicial. |

NewsFeed y AdventureModule se montan/desmontan con sus slots, pero no se afirma aquí ausencia total de peticiones de widgets apagados: las cargas propiedad del padre arriba siguen activas. Su comportamiento no se cambió. D-B3 y su banner no se modificaron.

### Pruebas y verificaciones D-2

- `DashboardWidgetGrid.test.ts` cubre solo widgets activos, visibilidad, orden, anchos de registro, configuración que cambia entre preferencias desktop/mobile, reordenamiento con nodos/instancias estables, desmontaje al desactivar y conservación de callbacks del slot.
- `DashboardPage.test.ts`, `DashboardWelcomeBanner.test.ts`, `dashboardWidgetRegistry.test.ts` y `useDashboardConfig.test.ts` conservan cobertura de banner/reintento, callbacks y cargas legacy, el registro único y las preferencias/rollback existentes.
- Tests focalizados: 41 tests aprobados en 5 archivos. Suite completa: 60 archivos y 379 tests aprobados.
- `pnpm run typecheck` y `pnpm build`: aprobados. Build conserva avisos de Browserslist desactualizado, minificación CSS de `.flex-[2]` y tamaño de chunk; no se corrigieron por estar fuera de D-2.
- ESLint de `DashboardWidgetGrid.vue` y su test: aprobado. Al incluir `DashboardPage.vue`, reporta 27 hallazgos legacy de accesibilidad y `any` ya presentes/documentados; no se corrigieron. No hay comparación base/head fiable en este checkout sucio.
- `pnpm run cycles`: comparación informativa porque no resuelve el `HEAD` local; informa un ciclo type-only preexistente de servicios legacy. `pnpm run identity:boundaries`: cero violaciones productivas actuales, comparación informativa por la misma limitación.
- `git diff --check`: aprobado. Los tests cubren viewport/configuración y ausencia de instancias duplicadas, pero no se hizo smoke visual con sesión en navegador ni se midió tráfico de red real.

### Trabajo posterior

D-2 deja lista la frontera de composición; no migra aún lógica de widgets. Las cargas y datos que pertenecen al padre deberán pasar a sus componentes en las tareas funcionales correspondientes. La condición de visibilidad existente para `fetchHomeInsights` tampoco evita que se cargue la respuesta común cuando solo uno de los dos widgets la necesita. `fetchStats`, `fetchTopDiscs`, `fetchCemeteryDiscs`, `fetchRecentVotes` y `fetchCoverOfDay` aún pueden consultar con widgets apagados. D-3 documenta estos hallazgos y reemplaza el alcance antiguo asignado a D-3 Preferencias; esa tarea queda reprogramada como D-4. Las siguientes tareas deben condicionar efectos al montaje propio y retirar la carga del padre dentro de la misma migración.

## D-3 — Auditoría funcional y técnica de widgets

**Estado:** completada el 2026-10-26. Resultado solo documental; no se modificó código funcional, componentes, servicios, endpoints, preferencias ni registro. No se inició D-4.

**Fuentes inspeccionadas:** `DashboardPage.vue`, `DashboardWidgetGrid.vue`, `src/app/dashboardWidgetRegistry.ts`, `NewsFeed.vue`, `AdventureModule.vue`, `dashboardSummary.ts`, `services/discs/discs.ts`, `services/rates/rates.ts`, `services/news/news.ts`, los imports/consumidores localizados y los apartados D-1/D-2 de este roadmap. Se verificó el flujo y los datos usados en el frontend; no se ejecutó la app ni se midieron requests reales. Los endpoints y la semántica de orden/filtros se describen desde el código cliente; no se infiere el coste de consultas internas del backend.

### 1. Hallazgos transversales

- `DashboardWidgetGrid` ya monta solo slots habilitados y preserva la instancia por ID. Nueve widgets siguen como slots inline de `DashboardPage.vue` (aprox. líneas 18–570); Novedades usa `NewsFeed.vue` (400 líneas) y Aventura usa `AdventureModule.vue` (293 líneas). El padre mantiene estado, HTTP, transformación de discos, reloj/intervalos, mutación de voto y CSS específico pese a que el grid ya ofrece la frontera para extraerlos.
- Las siete funciones auditadas están en `DashboardPage.vue` (aprox. líneas 730–980). Al montar se invocan cinco operaciones de carga: `fetchStats`, `fetchTopDiscs` (dos GET), `fetchCemeteryDiscs` (conteo más hasta cinco lotes), `fetchRecentVotes` y `fetchHomeInsights` si al menos uno de sus dos widgets está visible. La portada comienza al resolver o fallar DashboardSummary. Los intervalos de azar de `rollDice` solo se crean al pulsar.
- Los errores de casi todas estas operaciones se silencian. Algunas vistas pasan directamente al estado vacío; Portada puede quedar sin contenido cuando termina loading sin disco; Insight no distingue error de falta de votos. No añadir una nueva abstracción global para uniformar estados: cada widget debe exponer estado propio y elegir presentación adecuada.
- Hay duplicación de la adaptación `transformDisc` (en DashboardPage y AdventureModule) y varios `any`. Para D-3 esto es diagnóstico, no autorización para limpiar deuda. Al migrar, reutilizar el contrato/tipos de Catalog existente si basta; extraer un adaptador compartido únicamente si hay consumidores reales y semántica común.
- La respuesta `/discs/homeDiscs` es un endpoint combinado: Top semanal, Top mensual y Top usuarios usan llamadas separadas con parámetros distintos. Cada consumidor usa partes distintas del payload. No se puede colapsar en una sola respuesta sin confirmar primero que fecha/rangos, filtros y semántica son compatibles.
- `/rates/home-insights` sí devuelve en una sola respuesta `topArtists` y `countries`, que se reparten entre Artistas y Mundo musical. Esa es la reutilización con evidencia más clara. Debe vivir en Rates y su carga/cache debe existir si al menos uno de los widgets consumidores está montado.
- La consulta `/app/dashboard-summary` ya es una query autenticada compartida que usa el banner. Portada consume `catalog.totalDiscs` indirectamente para elegir un offset; Random usa un conteo filtrado de discos sin voto, que no equivale al total del resumen. No sustituir ese conteo por Summary sin preservar el filtro y el universo de selección.

### 2. Diagnóstico individual

Complejidad estima lógica/estados/llamadas, no tamaño del template. Prioridad alta significa bloquear la migración en la secuencia, no que el widget esté roto ni que deba rediseñarse.

| Widget | Complejidad | Problemas | Simplificación | Mejora propuesta | Prioridad |
|---|---|---|---|---|---|
| `novedades` | M | Carga y filtros en componente existente; loading/error no presenta error explícito; al fallar filtro vuelve al feed base | Mantener `NewsFeed` montado desde el slot; eliminar estado duplicado `filteredPosts` si no aporta selección persistida (solo se escribe y no se muestra separadamente) | UX opcional: mensaje/reintento de error y accesibilidad de modal/filtros | Media |
| `comunidad` | M | Slot mezcla enlaces estáticos, Top usuarios, filtros, modal y dos modos de ranking; error de `fetchStats` silencioso y parece “No hay datos”; carga aunque apagado | Extraer top usuarios como parte de su widget; selección/año/tabs quedan locales; retirar montaje redundante de estructuras auxiliares al migrar | UX opcional: separar visualmente enlaces y ranking, accesibilidad `aria-pressed`/tab y descripción de período | Alta |
| `top3semana` | S | Consulta propia desde padre aun deshabilitado; errores mostrados como lista vacía; template de DiscCard duplicado con Top mensual | Componente pequeño, rango semanal y un estado de query/local; no compartir respuesta con mes | Opcional: error/reintento y enlace a ranking completo | Alta |
| `top3mes` | S | Igual que semana; rango de mes actual | Componente pequeño con rango mensual; compartir solo pieza de presentación si evita duplicación real sin ocultar dueño | Opcional: usar navegación a archivo/ranking mensual | Alta |
| `discoAleatorio` | M | Tres estados/intervalos, conteo y resultado; descripción dice colección completa, pero `getDiscs` filtra `voted=false`; error silencioso parece que el botón no hizo nada | Mover `rollDice`, el conteo y timers al widget; eliminar estado/funciones de hover si revisión de UX decide que el efecto no es esencial | Decisión de producto: conservar “sin votar” o hacer que realmente incluya toda la colección; incluir mensaje de fallo | Alta |
| `portadaDia` | M | Selección determinista por día a partir de offset de catálogo; depende de Summary o usa fallback 1000; error/empty queda visualmente en blanco; voto no sincroniza consultas de rates visibles | Mover carga, selección y mutación; mantener elección diaria y estado de voto local; evitar estado derivado duplicado donde `userRate.cover` basta | Producto opcional: confirmar si el concepto requiere una selección estable y si se puede editar un voto ya enviado; mostrar error y estado agotado | Alta |
| `artistas` | S | Insight conjunto; el mapper guarda `count` pero UI no lo muestra; loading/error no distingue respuesta sin datos | Consumir respuesta compartida de Rates; mantener solo campos que se muestran o acordar estadística de apoyo | Opcional: mostrar cantidad de votos, enlace a artista o formato accesible para top 7 | Alta |
| `cementerio` | M | Carga automática aunque apagado; hasta cinco ventanas aleatorias de 20 se filtran en frontend; `voteCount` significa notas musicales comunitarias (voto de portada solo no excluye); puede omitir candidatos fuera de la muestra; error silencioso parece catálogo agotado; sorteo sin candidato conserva tarjetas anteriores | Tras decisión de producto, extraer estado/carga y seleccionar candidatos válidos en Catalog/SQL si se requiere cobertura completa; no reutilizar `voted=false` personal como filtro comunitario | Decidir cero Rate vs cero nota musical vs inactividad temporal, periodo/eventos si aplica, aleatoriedad, fechas, actualización tras voto y contrato. Ver D-9a | Alta |
| `mundoMusical` | S | Comparte llamada con Artistas aunque uno solo esté activo; muestra top de países como barras; tooltip de nombre depende de hover y la bandera oculta el nombre accesible | Compartir query Rates con Artistas; mapper local del widget y lista derivada a partir de `countries` | UX opcional: nombre visible/accesible y alternativa textual para flags/barras | Alta |
| `ultimosVotos` | S | Consulta GET `/rates` como `getRatesByUser(5, 0, ..., 'rate')`; el código cliente no fija `orderBy`, pese al título “últimos”; loading de tres filas para lista de hasta cinco; error indistinguible de cero votos | Consulta privada al owner Rates desde el propio widget; precisar orden con el contrato actual antes de prometer “últimos”; ajustar skeleton a 5 | Opcional: mostrar fecha/portada y enlace al disco si el payload y producto lo justifican | Media |
| `aventura` | M | Ya tiene componente y estado local; 2–5 preguntas, cada una pide opciones y al final pide resultado; cualquier error de red se representa como “sin resultados”; transformación Disc repetida en Dashboard | Conservar componente; estado de preguntas/respuestas ya local; no crear wrapper ni trasladar estado al padre; tipar/adaptar Disc al migrar si contrato Catalog lo permite | Opcional: acción para volver a una pregunta/cambiar respuesta y error recuperable separado del caso sin coincidencias | Baja |

#### Fichas de comportamiento, datos y propuesta por widget

**Responsive actual:** el grid da una columna en viewport móvil; widgets `half` pasan a dos columnas desde `lg`, mientras `full` mantiene ancho completo. Dentro de las tarjetas, Top 3 cambia de una columna a tres en `xl`; Artistas cambia su mosaico en `sm`; Cementerio cambia de una a dos cards en `xl`; Últimos votos usa columnas CSS y trunca nombres; Aventura limita opciones a `max-w-xs`. Comunidad usa filas no-wrap con etiqueta de ancho fijo y `overflow:hidden`, por lo que enlaces pueden comprimirse/recortarse en anchuras pequeñas. Novedades conserva lista horizontal y filtros con wrap. Portada fija un mínimo de imagen de 280 px y un máximo de 460 px, con el zoom anunciado solo por hover. Mundo musical comprime bandera/barra/conteo en cada fila y revela nombre de país solo con hover. Disco aleatorio centra su CTA y card. Estas observaciones son de clases/markup; no se hizo comprobación visual. La migración debe preservar el comportamiento actual y evaluar foco/teclado/labels cuando mueva cada interacción; los rediseños de layout quedan como mejoras recomendadas u opcionales, no como condición para separar datos.

**`novedades` — conservar con extracción mínima (M).** Muestra feed mixto de novedades de la app, `riffvalley.es` y canal de conciertos. El usuario cambia feed completo o filtros de fuente; noticias `app` abren modal y enlaces internos del cuerpo navegan con Router; fuentes externas abren otra pestaña. `NewsFeed.vue` contiene carga, mapping/fechas, filtros, modal, navegación y UI; se carga con `GET /news/feed` al montar y usa `GET /news/source-feed` al elegir un filtro. Usa el payload de posts para id/título/link/imagen/fecha/source/tipo/body. Los filtros consultan de nuevo y el fallo vuelve al feed inicial; el fetch inicial deja lista vacía y solo registra error en consola. No se identificó otro consumidor productivo de `NewsFeed` en el recorrido actual; el servicio de News sí tiene otras operaciones/consumidores editoriales, así que su owner debe determinarse por fuente/función y no mover todo el servicio junto. Grid evita consulta si el widget está deshabilitado. Propuesta necesaria: mantener componente/data local y resolver contrato de owner sin cambiar IDs. Recomendado: una respuesta de error visible con reintento, diferenciada del vacío. Opcional: mejorar foco, cierre Escape/restauración del foco del modal y asociación accesible de los botones de filtro.

**`comunidad` — separar dentro del mismo ID antes de considerar fusionar (M).** Muestra seis links estáticos de comunidad/web/agenda y Top usuarios por discos o portadas, con año (incluye “Todos”), hasta las listas recibidas, botón de estadísticas detalladas y `StatsModal`. El usuario cambia año, tab y modal; el ranking se divide en dos columnas por bloques consecutivos. Está inline en `DashboardPage.vue` aprox. 31–128; estado de año/tab/modal/colecciones/computed de columnas y helpers también en el padre. `fetchStats` hace `GET /discs/homeDiscs` pasando año como `statsDateRange` y `distributionDateRange`; solo utiliza `totalVotes`, `topUsersByRates`, `topUsersByCover` y `ratingDistribution`, aunque entrega todo el DTO combinado. `StatsModal` consume las stats y distribución. La llamada ocurre al montar Dashboard y al cambiar año, incluso apagado. Propuesta necesaria: mover la operación, los datos de ranking y modal a un componente propiedad del widget; los links no necesitan llamada. No cambiar endpoint. Recomendado: modelar error separado de ranking vacío, y usar estado de botones con semántica accesible. Producto opcional: decidir si links de comunidad y top usuarios deben seguir compartiendo una tarjeta/ID; mover enlaces a una sección fija o separar ID afectaría preferencias persistidas.

**`top3semana` y `top3mes` — conservar dos widgets (S cada uno).** Cada uno muestra hasta tres `DiscCard`, medallas y rango textual; empty text cambia semana/mes. No tiene controles más allá de acciones comunes que expone `DiscCard`. Hoy comparten arrays y loading del padre. `fetchTopDiscs` hace dos GET independientes a `/discs/homeDiscs`, uno con `getWeekRange()` y otro con `getMonthRange()`, y de cada respuesta usa `discs`, filtra `averageRate != null`, transforma y corta a tres. Cualquier fallo del Promise.all deja ambas listas en empty. La API devuelve otros campos que esos widgets no utilizan. Propuesta necesaria: cada widget inicia la petición correspondiente solo al montarse, posee loading/error/empty y mantiene el rango vigente. La tarjeta comparte presentación vía `DiscCard`, no datos; no hacer una query de pareja que fuerce la carga del otro período. Recomendado: impedir que error se anuncie como que no hubo discos valorados. Opcional: navegación a rankings históricos.

**`discoAleatorio` — conservar interacción y aclarar universo (M).** Botón con hover animado lanza dos iconos; tras respuesta enseña frase y una DiscCard con opción de volver a tirar. El texto promete “toda la colección”, pero las llamadas a `getDiscs` pasan `voted=false`; el conteo y offsets se restringen a discos no votados. La primera acción hace count (`limit=1, offset=0`) y luego una página de un disco en offset aleatorio; reusa `unvotedDiscCount` solo dentro de instancia. Respuesta solo usa el primer disco (o primer agrupado) y totalItems. Error no se comunica y deja estado inicial con botón habilitado. Timers/estado y `rollDice` están en DashboardPage aprox. 868–919; no carga al montar. Propuesta necesaria: mover petición y sus estados al widget, conservar el filtrado/visual actual hasta decisión de producto. Recomendado: estado de error/reintento y limpiar intervalos en desmontaje. Opcional: decidir “no votados” vs “toda la colección”; usar un endpoint de aleatorios solo si su contrato soporta el mismo filtro y payload, no asumirlo por la existencia de `/discs/random`.

**`portadaDia` — conservar selección temporal hasta aclarar estabilidad (M).** Enseña imagen grande, nombre/artista, abre imagen en ventana aparte y permite puntuar cover (1–10 en pasos de 0.5), guardar y editar el estado visual. `fetchCoverOfDay` usa día UTC entero (`floor(Date.now()/86400000)`) módulo `catalog.totalDiscs` de Summary (fallback 1000), luego `GET /discs?limit=1&offset=...`; la carga espera a que Summary responda o falle, sin comprobar si widget está activo. El frontend usa la DiscCard transformada y `userRate.cover`; para votar envía `POST /rates` o `PATCH /rates/:id` con rate existente y cover. No actualiza cache de Rates y el error de lectura/voto se silencia. Sin datos, tras loading, no se dibuja un empty/error. Propuesta necesaria: trasladar query/acción y estado al widget y mantener payload. Recomendado: estados de error/empty y sincronización/invalidation de rates si existe una query compartida al migrar. Opcional: decidir si la portada debe ser estable por fecha/zona horaria y si “Editar” tras votar implica modificar voto existente (el código sí elige PATCH si hay userRate.id, pero no hay validación aquí de reglas de negocio).

**`artistas` — conservar el top visual (S).** Muestra hasta siete artistas con imagen y media de nota, con tarjetas de top 3 grandes y cuatro compactas; empty invita a votar un disco. Sin acciones. Usa `GET /rates/home-insights`, campo `topArtists` mapeado a id/name/image/averageRate/ratingCount; guarda ratingCount en `count`, no visible. El error se silencia y loading acaba como empty. Comparte endpoint con Mundo musical. Propuesta necesaria: componente visual propio y consumo de datos Rates compartido; no duplicar llamada ni pedir un campo/consulta nueva. Recomendado: mostrar error por separado. Opcional: hacer tarjetas enlaces o mostrar cantidad de valoraciones, sujeto a decisión de producto.

**`cementerio` — replantear la búsqueda aleatoria, conservar concepto hasta evidencia (M).** Muestra dos discos con `voteCount` cero y permite pedir “Otros olvidados”; la búsqueda inicia automáticamente en montaje aunque deshabilitado. `fetchCemeteryDiscs` hace GET `/discs` para obtener total si no lo conoce; después puede ejecutar hasta cinco GET de ventanas de 20 discos, desempaqueta grupos, filtra `voteCount` cero y acumula dos IDs únicos. Solo transforma/usa esos discos. Cuando no encuentra ninguno mantiene el resultado anterior si existía; vacío inicial dice que no quedan discos, aunque una muestra aleatoria insuficiente no prueba que el catálogo entero esté agotado. Sin error/reintento distinguible. Propuesta necesaria: mover algoritmo/estado al widget; ejecutar en su montaje, no en Dashboard. Recomendado técnico: representar “no encontrados en esta búsqueda” y no afirmar agotamiento global; asegurar estado de refresco/error. Opcional: reevaluar si conviene que sea una acción manual antes de la primera búsqueda o mantener carga automática. No cambiar endpoint/backend como parte de esa migración.

**`mundoMusical` — conservar representación (S).** Muestra hasta los países retornados, ordinal, bandera, barra porcentual y conteo; tooltip de nombre solo hover. Usa `countries` de `GET /rates/home-insights`, normaliza ISO a minúscula, reemplaza nombres largos USA/Reino Unido, y usa count/percentage. comparte llamada con Artistas. Error y lista realmente vacía se ven igual. Propuesta necesaria: estado/presentación del widget y query compartida Rates. Recomendado: título accesible/nombre disponible sin hover, por ejemplo texto visible o accesible asociado; separar error de vacío. Opcional: cambiar barras por mapa u otra visualización requiere decisión de producto y no se justifica por esta auditoría.

**`ultimosVotos` — conservar widget independiente (S).** Muestra cinco votos con miniatura, título, artista y nota; sin navegación explícita ni fecha. La llamada `getRatesByUser(5, 0, undefined, undefined, undefined, undefined, 'rate')` termina en `GET /rates` con limit 5, offset 0 y type `rate`; no pasa `orderBy`, así que “últimos” depende del default del backend/servicio y no puede darse por garantizado desde cliente. Presentación/loading/empty en padre (skeleton de tres filas). Usa data, id, disc.image/name/artist.name y rate; no aprovecha fecha/cover/metadata. Error se silencia y se renderiza el empty. Propuesta necesaria: que Rates posea llamada y estado del widget y confirmar orden soportado por endpoint existente antes de mantener promesa “últimos”. Recomendado: skeleton de cinco y error/empty distintos. Opcional: navegación y fecha requieren decisión de UX; no pedir más payload sin necesidad.

**`aventura` — conservar `AdventureModule` (M).** Flujo local con intro, elección de 2–5 categorías aleatorias, preguntas sucesivas con opciones garantizadas por filtros, resultado DiscCard y reinicio. No hay datos remotos hasta que el usuario comienza. Cada paso usa `GET /discs/options` según categoría y filtros previos; al final usa `GET /discs/random` limit 1. Puede hacer varias llamadas secuenciales (una por pregunta más la selección final); consume opciones y primer disco. Los estados `intro/question/loading/result/empty`, respuestas y filtros son locales en `AdventureModule.vue`; cualquier error de opciones/resultados va a `empty`, mezclando error con falta de coincidencias. `transformDisc` duplica la función de Dashboard. Propuesta necesaria: ninguna extracción nueva; conservarlo como componente y asegurar solo el slot del grid lo monta. Recomendado: mensaje/reintento distinto para error y vacío, tipos del resultado si el servicio ya los define. Opcional: edición de respuestas anteriores sería cambio de producto, no requisito de refactor.

### 3. Operaciones de datos y estado a trasladar

| Operación | Consumidor real | Peticiones y uso actual | Propuesta de propiedad futura |
|---|---|---|---|
| `fetchStats` | `comunidad` (Top usuarios/modal) | Una llamada a `/discs/homeDiscs` en montaje y cambio de año, esté oculto o no; consume totalVotes/topUsersByRates/topUsersByCover/ratingDistribution. Parámetros de año se pasan a stats y distribución | Mover a componente de Top usuarios bajo el slot Comunidad. No hacer llamada desde padre ni al montar apagado; preservar parámetro `all`/año y respuesta/StatsModal. Semántica de rates/actividad comunitaria; el transporte actual vive en Catalog (`services/discs`). Mantener esa API durante la migración y decidir un owner Rates si se establece ese módulo, sin mover endpoint como parte de D-3 |
| `fetchTopDiscs` | `top3semana`, `top3mes` | Dos GET paralelos a `/discs/homeDiscs` siempre, con rangos distintos; cada uno consume discs y averageRate y corta a 3 | Petición separada dentro de cada widget Catalog. Solo compartir código de rango/DiscCard si hay contrato común claro; no compartir cache si key y período difieren |
| `fetchCemeteryDiscs` | `cementerio` | GET para total y hasta cinco GET por lotes de 20, busca dos sin votos; se llama al montar incluso desactivado, y al click | Trasladar al componente Catalog; definir estado “no encontrados en muestra”/error. Query compartida solo si el usuario puede beneficiarse de caché entre widgets (hoy no hay otro consumidor equivalente), no recomendada inicialmente |
| `fetchRecentVotes` | `ultimosVotos` | GET `/rates`, limit 5/type rate; se llama aunque widget apagado. No indica orderBy | Trasladar a Rates. Aclarar orden con API existente antes de afirmar recencia; Query puede aportar caché/estados, con key privada por sesión si se decide su reuso. No duplicar dato en Pinia |
| `fetchHomeInsights` | `artistas`, `mundoMusical` | Una llamada `/rates/home-insights` si cualquiera está habilitado; usa ambos campos. Excepción actual: un widget apagado no evita recibir ambos datos si el otro está activo | Trasladar a una query del owner Rates compartida por ambos; key/privacidad de usuario y señal de cancelación según contrato de Query del proyecto. Montar/iniciar por consumidores activos; mantener mapeos junto a widgets |
| `fetchCoverOfDay` | `portadaDia` | GET `/discs` por offset diario; depende de DashboardSummary o error, aunque el widget esté apagado; resultado se vota con POST/PATCH `/rates` | Mover fetch y voto al widget; Summary es query compartida del banner, no centralizar portada en el padre. Se puede consumir el query existente para total si su key y ciclo de sesión aplican; respetar fallback mientras no se decida cambiar selección. Invalidate Rates si queda una query cacheada coherente |
| `rollDice` | `discoAleatorio` | Solo acción de usuario; count de `/discs` filtrado `voted=false` y petición por offset aleatorio; timers y animación local | Mover acción, contador y timers al widget. No Query obligatoria: es una acción puntual; si el listado aleatorio se cachea, definir invalidación cuando cambie el voto. Mantener que ocultar el widget evita toda actividad |

`DashboardPage` mantiene aparte `useDashboardSummaryQuery` para el banner. Esa query no se debe retirar al migrar widgets. La portada puede depender del dato total compartido, pero no apropiarse de resumen/banner; Disco aleatorio necesita total del subconjunto sin voto, no el total del banner. Los GET de feeds y `/discs/options`/`random` ya pertenecen a componentes que se montan condicionalmente; no envolverlos en otra carga del padre.

### 4. Parejas: conservar IDs y separar responsabilidades

| Pareja | Decisión de auditoría | Justificación y coste de fusión |
|---|---|---|
| Top 3 semanal / mensual | Mantener independientes | Mismo endpoint, payload y UI, pero rangos, títulos, empty text y claves de caché cambian. Una fusión en UI podría reducir markup, pero un único widget con tabs alteraría dos IDs/configuraciones guardadas y visibilidad/orden independientes; no reduce necesariamente los dos requests. Solo compartir un presentational fragment si después se demuestra duplicación que dificulta mantenimiento. |
| Artistas / Mundo musical | Mantener dos widgets, compartir consulta | Datos semánticos distintos (top de artistas frente a distribución geográfica) y layouts distintos, pero una respuesta de Insights satisface ambos. Fusionarlos perdería el control de ocultar/reordenar cada presentación y suprimir uno no reduce de forma significativa la respuesta si el otro la necesita. Query Rates compartida tiene beneficio directo sin fusionar preferencias. |
| Comunidad / Últimos votos | Mantener independientes | Comunidad mezcla links estáticos con un ranking global/anual; Últimos votos es actividad personal reciente. Owners y frecuencia de actualización distintos (Catalog/estadística vs Rates/persona). El orden, IDs y preferencias separadas tienen valor; unirlos mezcla datos personales con comunidad global y hace que ambos se activen/desactiven juntos. Revisar internamente Comunidad (links+Top usuarios) es propuesta opcional de producto, no fusionarla con Últimos votos. |
| Disco aleatorio / Portada del día | Mantener independientes | Ambos muestran una DiscCard, pero uno es acción repetible con selección aleatoria de no votados, el otro es elemento diario determinista con voto de portada. Acciones y persistencia temporal diferentes; uno usa conteo filtrado, el otro total de catálogo/Summary. Unificar borraría esas diferencias y los IDs. Reutilizar DiscCard y quizá adapter tipado basta. |

Los IDs `novedades`, `comunidad`, `top3semana`, `top3mes`, `discoAleatorio`, `portadaDia`, `artistas`, `cementerio`, `mundoMusical`, `ultimosVotos` y `aventura` ya se persisten en preferencias y alimentan builder/registro. No renombrar, retirar, fusionar ni cambiar sus tamaños por esta auditoría. Si una decisión de producto futura retira/fusiona un widget, deberá planear compatibilidad/migración de preferencias y defaults en una tarea separada; D-3 no aprueba esa decisión.

### 5. Cambios necesarios, recomendados y opcionales

**Necesario para completar la refactorización prevista:** cada carga/acción sale de `DashboardPage` y vive con el widget que la usa (o query compartida de Insights en Rates); petición no ocurre si todos sus consumidores están ocultos; componente posee sus estados de loading/error/empty e interacción; la carga vieja se retira del padre en el mismo cambio; IDs y Account preferences no cambian; la query del banner permanece independiente; no crear un composable Dashboard central que replique siete funciones.

**Recomendado al tocar cada widget:** diferenciar error de cero resultados donde hoy se silencian; asegurar timers de Disco aleatorio se limpian al desmontar; que Cementerio no afirme agotamiento del catálogo por una muestra limitada; comprobar orden real de Últimos votos antes de describirlos como recientes; usar carga/cache compartida solo para `/rates/home-insights`; evitar consultas para widgets apagados; mantener llamadas puntuales directas si Query no aporta caché o deduplicación.

**Opcional; requiere decisión de producto antes de implementación:** cambiar universo de Disco aleatorio a toda la colección; revisar si Top usuarios forma parte de Comunidad estática o debería tener su propio widget/ID; hacer links/cartas más interactivos; rehacer visualización de Mundo musical; permitir editar pasos de Aventura; cambiar la selección/semántica temporal de Portada del día; retirar Cementerio u otros widgets por bajo uso. La inspección de código no aporta métricas de uso ni evidencia de que alguno de estos widgets deba retirarse.

### 6. Orden de migración y tamaños

La tabla del §9 queda revisada: tras D-4 (preferencias, alcance ya existente y fuera de esta auditoría), iniciar por **D-5 Artistas + Mundo musical (S)** para validar una query verdaderamente compartida y el montaje condicional; seguir con **D-6 (M)** para Novedades y enlaces estáticos/Top users según ownership acordado; después **D-7 Top 3 (S)**, **D-8 Últimos votos y ranking Community (M)**, **D-9 Disco aleatorio y Cementerio (M)** y **D-10 Portada/Aventura (M)**. D-11 queda para regresión y cierre.

Cada bloque es una tarea implementable separada; en una implementación se debe completar un widget a la vez dentro del bloque si así reduce riesgo. El componente debe quedar funcional al cerrar la tarea, con test proporcional y sin dependencia temporal de estado en DashboardPage. No ejecutar migraciones ahora. D-3 no inicia D-4 ni altera preferencias.

**Verificación D-3:** `git diff --check` solicitado al cierre. Se comprobó además que el único archivo modificado por este trabajo es `roadmap/dashboard.md`; existían cambios locales previos en otros archivos y se preservaron sin atribuirlos a esta auditoría.

## D-4a — Auditoría del widget Disco aleatorio

**Estado:** auditoría completada el 2026-10-26. No cambia el código del frontend ni del backend y no elige la semántica de producto. **D-4 sigue pendiente**; D-4a no inicia D-4b ni el widget siguiente.

## D-5 — Portada del día

**Estado:** D-5a (auditoría) completada el 2026-10-27. La integración frontend de Portada también está implementada y verificada; falta el smoke autenticado contra el endpoint backend real. No se cambia la selección backend, Rates, el layout, las preferencias ni el registro. Los detalles posteriores registran alcance y evidencias.

**Nota de planificación:** la tabla de ejecución anterior ya usa D-5 para Insights y D-10 para Portada/Aventura. D-4b.3 también está asignada en esa tabla al selector aleatorio por dificultad y figura pendiente; no es evidencia local del endpoint diario. Esta integración se documenta por nombre, sin reutilizar esos IDs ni renumerar bloques ajenos. Antes de ampliar el plan, corregir la colisión creando un identificador único para esta pista y conservar las entradas existentes.

### D-5a — Auditoría funcional y técnica

#### Funcionamiento observado

`DashboardPage.vue` contiene el estado, petición, elección del disco, formulario de portada y mutación de voto. `DashboardWidgetGrid.vue` solo ordena y muestra slots registrados que estén habilitados en la configuración activa (desktop o móvil). Al deshabilitar un slot lo desmonta, pero la lógica de portada no vive dentro del slot: está en `setup()` de la página y su `watch` comienza sin consultar `isEnabled('portadaDia')`. Por eso ocultar el widget no evita la petición ni pausa su estado. Al reactivarlo se vuelve a mostrar el mismo resultado local; no se hace una carga nueva.

El contenido visible es una imagen grande, nombre del disco y artista. Al pulsar la imagen abre su URL en otra ventana cuando hay imagen; si falta, renderiza `/news/default.jpg` sin acción de zoom. El formulario acepta una nota de portada numérica con `min=1`, `max=10`, paso 0,5; al guardar cambia a una confirmación con el valor y un botón «Editar» que vuelve a abrir el formulario. No se muestra la media de portada, el número de votos de portada ni la nota musical del usuario. No se reutiliza `DiscCardComponent.vue`: la plantilla implementa una presentación propia y un control exclusivo de portada.

#### Selección, estabilidad y fechas

La función actual calcula `dayMs = floor(Date.now()/86 400 000)` (días desde epoch UTC), lee `catalog.totalDiscs` de `useDashboardSummaryQuery()` —o usa 1000 si es cero/falsy/no está disponible—, calcula `offset = dayMs % total` y pide una fila de catálogo. No hay sorteo aleatorio ni parámetro de fecha enviado al backend. En la copia local inspeccionada de `spammusic-back-cron`, `GET /api/discs` filtra discos cuya fecha de publicación sea hoy o anterior y, sin filtros `orderBy`, ordena por `releaseDate DESC` y `artist.name ASC`; la ruta está autenticada y recibe el usuario de sesión para añadir campos personales. Por tanto, con el mismo catálogo/orden/total, los usuarios obtienen el mismo disco para un día UTC. Cambios de catálogo, del orden, del total o desajustes entre `totalDiscs` y los discos elegibles pueden cambiar el elemento correspondiente al mismo día.

No existe registro diario, endpoint de «portada del día», persistencia en servidor ni almacenamiento local de la selección. En una recarga se recalcula el offset y se vuelve a pedir el disco; durante el mismo día y sin cambios de catálogo normalmente se elige el mismo. Si se abre cerca de medianoche, el día de selección es UTC, mientras el encabezado usa la fecha local `es-ES` (Europe/Madrid puede ir una o dos horas por delante). No se observa actualización al cambiar de día con Dashboard abierto: la selección no tiene temporizador y `todayFormatted` tampoco depende de estado reactivo de reloj. La selección puede diferir el día local de la fecha que usa el algoritmo.

La petición se dispara cuando la query del resumen entrega datos o error. Si el resumen falla, la portada todavía pide el disco con offset basado en 1000. Si después se reintenta con éxito, `coverOfDayStarted` ya está marcado y no recalcula el offset. Si el backend cambia el catálogo durante la misma sesión, tampoco hay revalidación automática de la selección.

#### Peticiones y datos

| Momento | Petición | Parámetros/datos usados | Observación |
|---|---|---|---|
| Entrada a Dashboard autenticado | `GET /app/dashboard-summary` mediante TanStack Query (`useDashboardSummaryQuery`) | El widget consume `catalog.totalDiscs`; query compartida con el banner. Clave incluye usuario, rol y generación de sesión; `staleTime` 60 s, `gcTime` 5 min. | Es la dependencia que inicia la carga. Puede reutilizar caché/deduplicarse con otro observador de la misma key; no es una llamada exclusiva de portada. |
| Resumen resuelto o con error | `GET /discs?limit=1&offset=<offset>` por `getDiscs(1, offset)` | Primer elemento de `data`: id, nombre, artista, imagen, `userRate`, y otros campos devueltos. Se toma `userRate.cover`. | Una petición de selección por montaje lógico de Dashboard; no se envía `AbortSignal`. Se acepta que `data` sea array y tenga longitud, sin validar objeto/ID. |
| Guardar nueva valoración | `POST /rates` mediante `postRateService` | `{ discId, rate: userRate.rate ?? null, cover: Number(coverVoteValue) }` | Sesión autenticada. En la copia backend local, create busca Rate existente del mismo usuario/disco y en ese caso actualiza; si no, crea. |
| Guardar edición | `PATCH /rates/:id` mediante `updateRateService` | El mismo payload; el ID es `userRate.id`. | La copia backend local comprueba propiedad del voto antes de modificar. No se consulta `/rates/disc/:discId`. |

Al cargar no se hace una lectura separada de Rates para este widget: `GET /discs` incorpora la nota del usuario autenticado y agregados de rating. En la copia de backend revisada, `averageCover` es media de `cover` y `voteCount` cuenta filas con `rate IS NOT NULL` (voto musical), no número de valoraciones de portada. El widget no consume ni representa dichos agregados. El endpoint no devuelve un contador de votos de portada en el mapeo observado. La firma local `RatePayload` declara `rate` y `cover` como `number`, aunque esta mutación envía `rate: null` al valorar un disco por primera vez; no se cambia Rates ni su contrato en esta auditoría. La copia de backend local acepta `rate` nulo/opcional en el DTO inspeccionado.

El número atribuible a Portada al entrar es una lectura de disco; además, la consulta al resumen compartido puede necesitar una solicitud si no está fresca en caché. La cifra exacta de red no es fija por caché de Query y sesión. El resto de consultas de Dashboard es independiente y queda fuera de esta cuenta. No hay caché específica ni deduplicación de `GET /discs` para la portada, ni cancelación por desmontaje, ni invalidación de datos de disco/Rates tras votar. El éxito actual solo actualiza `coverVoted` local y muestra `SwalService.success`; la respuesta del servidor no se usa para sincronizar nota/agregados. Los fallos de selección y voto se capturan sin mensaje visible; no existe reintento de portada.

#### Estados y casos límite

| Caso | Comportamiento/evidencia | Clasificación |
|---|---|---|
| Sin resultados, `data` vacío o no array | Tras terminar loading, `coverOfDay` queda `null`; la tarjeta no tiene rama empty/error y queda en blanco. | Problema comprobado |
| Objeto sin ID válido | No se valida ID antes de presentar o votar; podría enviarse `discId` inválido/indefinido si la respuesta viola el contrato. | Riesgo potencial de contrato |
| Falta imagen | Se muestra imagen genérica `/news/default.jpg`; no se distingue visualmente que falta portada real. | Comportamiento comprobado; mejora UX |
| Falta `userRate`/`cover` | Se inicia como no votado y se propone una nota; la mutación elige POST cuando no hay `userRate.id`. Rates debe determinar qué cuenta como nuevo/actualización. | Comportamiento esperado en contrato; verificar para payload parcial |
| Usuario ya valoró cover | Se precarga `userRate.cover` y se muestra estado confirmado. «Editar» reabre input y el guardado usa PATCH si existe `userRate.id`; no hay bloqueo de edición. | Comportamiento comprobado |
| Nota musical existente | Se conserva enviando `userRate.rate` junto al nuevo `cover`; un voto solo de portada manda `rate: null`. | Correcto para separar ambos campos según código/DTO local |
| Error HTTP en `GET /discs` | Se silencia, loading termina y no aparece aviso/reintento; la tarjeta queda vacía. | Problema comprobado |
| Error HTTP al votar | Se silencia, no cambia a votado y no hay feedback de fallo; botón vuelve a habilitarse al terminar. | Problema comprobado |
| Widget desactivado con petición en curso | El slot desaparece, pero la petición del padre no se cancela y su respuesta aún puede escribir refs locales. | Problema comprobado |
| Desactivar y reactivar | No vuelve a consultar; mantiene resultado/valoración mientras viva Dashboard. | Comportamiento comprobado |
| Cambio de sesión con Dashboard abierto | La key de Summary cambia y la query de sesión puede cambiar, pero `coverOfDayStarted` bloquea otra selección. La portada/userRate cargada con sesión anterior puede persistir. | Riesgo comprobado por flujo estático; no verificado en ejecución |
| Cambio de día con Dashboard abierto | No cambia portada ni fecha mostrada hasta remount/recarga. | Problema comprobado |
| Respuesta tardía | No hay señal de cancelación ni guardia de sesión/versión antes de asignar resultado. Con una sola selección el riesgo principal es desmontaje/cambio de sesión. | Riesgo potencial |
| Catálogo vacío o total incorrecto | `totalDiscs || 1000` oculta cero y permite un offset posiblemente fuera de rango; no valida `totalItems` frente al resumen. | Riesgo potencial de consistencia |

La revisión del backend corresponde al checkout local `~/workspaces/spam-music/spammusic-back-cron`, no a una ejecución del servicio remoto ni a una prueba del contrato desplegado. No se ejecutaron peticiones HTTP reales ni se midió rendimiento. Los endpoints citados derivan del `api` frontend y del prefijo `/api` en esa copia backend.

#### Propiedad actual y extracción futura

Hoy `DashboardPage.vue` posee IDs/slot composition, estado de portada, dependencia del resumen, fetch/offset, carga, formulario de voto, POST/PATCH y feedback de éxito. `DashboardWidgetGrid.vue` posee solo disposición por orden/tamaño y montaje condicional visual. `dashboardWidgetRegistry.ts` declara ID, etiqueta, tamaño, default y orden; preferencias y edición pertenecen a Account. `useDashboardSummaryQuery` pertenece a la app/resumen compartido; `getDiscs` y sus datos son de Catalog; `postRateService`/`updateRateService` son de Rates; `DiscCardComponent` queda sin uso por esta UI propia.

Propuesta provisional al implementar D-5b: `src/views/dashboard/components/DashboardCoverOfDayWidget.vue` recibe solo el contrato visual necesario (o consume directamente entradas públicas de Catalog/Rates conforme a la estructura vigente). El componente sería dueño de carga visible, selección y estado efímero de formulario, loading/empty/error, edición y cancelación al desmontar. Dashboard conserva composición del slot y preferencias; no debe decidir offset ni conocer Rates. Catalog conserva la lectura y datos de discos; Rates conserva la mutación y tipos del voto. El resumen global continúa bajo su owner y no se replica en un servicio Dashboard genérico. Un composable específico solo se justifica si selección/ciclo de sesión/reloj o mutación ganan complejidad o se reutilizan; con el flujo actual de una carga y un voto, inicialmente basta un componente enfocado.

La extracción no debe cambiar IDs, configuración desktop/mobile ni semántica de selección sin decisión de producto. El widget debe montarse solo cuando el slot esté activo. Si consume Summary compartido, mantener la propiedad/caché de esa query fuera de Rates/Catalog y tratar con claridad el caso resumen fallido. La selección y la mutación deben tener pruebas de contrato y estados antes de cerrar la implementación; Rates conserva sus reglas y endpoints.

#### Mejoras propuestas y prioridad

| Prioridad | Problema y evidencia | Propuesta | Impacto | Tamaño |
|---|---|---|---|---|
| P1 | La selección/fetch se ejecutan desde `DashboardPage` incluso si el slot está apagado; grid solo condiciona render. | Mover ciclo de lectura al componente del widget para que mount/unmount siga preferencias; cancelar lectura si el cliente permite pasar señal. | Menos petición y estado no usado; aislamiento de responsabilidad. | M |
| P1 | Error de catálogo, respuesta vacía y respuesta mal formada terminan en tarjeta en blanco; no hay reintento. | Separar loading, empty y error visible, con acción de reintento; validar contrato mínimo (id/nombre/imagen). | Evita falla silenciosa y mejora recuperación. | S |
| P1 | “Portada del día” parece compartida/estable, pero solo calcula offset en cliente; total fallback y orden de catálogo son entradas implícitas, no hay persistencia. | Decisión de producto: documentar/renombrar a selección diaria determinista actual o crear selección estable del servidor; no implementar hasta elegir. Si se mantiene cliente, definir fallback y comportamiento del catálogo. | Alinea promesa visual y comportamiento entre sesiones. | S si aclaración; M si API/persistencia |
| P1 | UTC controla cambio de selección y `es-ES` local muestra fecha; no se refresca al pasar día abierto. | Definir zona horaria del producto y frontera de cambio; derivar etiqueta/selección de una misma fecha reactiva y refrescar en el límite elegido. | Evita discrepancia de fecha y portada. | S |
| P2 | Cambio de usuario mantiene el disco y `userRate` local porque watcher es de una ejecución y no escucha identidad. | Atar la carga a identidad/clave o remount por sesión; cancelar/ignorar respuestas previas. | Evita rating personal obsoleto entre sesiones. | S |
| P2 | El widget no muestra media ni cantidad de valoraciones de portada aunque la lectura trae `averageCover`; `voteCount` del backend observado es voto musical. | Decidir si la UI debe mostrar media; si necesita conteo de covers, solicitar dato correcto al owner/contrato Rates y no reutilizar `voteCount`. | Información de comunidad más completa sin confundir métricas. | M |
| P2 | Mutación exitosa cambia solo confirmación local; una edición no refleja nueva nota derivada y fallos quedan mudos. | Mostrar error de guardado; usar respuesta de mutación o invalidar/actualizar caché propietaria si existe; permitir reintento claro. | Feedback y consistencia tras votar. | S |
| P3 | `RatePayload` frontend tipa nota musical como obligatoria numérica, pero el widget pasa null; la copia DTO backend permite null/optional. | Aclarar/adaptar el tipo en la futura tarea de Rates según contrato real, sin cambiar reglas ni contrato de Rates en D-5a. | Tipado fiel y prevención de uso incorrecto. | XS |
| P3 | La condición `!coverVoteValue` impide valor cero aunque backend permite `Min(0)`; UI declara mínimo 1 y paso 0,5, pero no valida máximo/paso antes de enviar. | Alinear validación de frontend con producto y DTO; validar valores finitos/rango/paso. No alterar DTO en esta auditoría. | Evita payload no admitido/estados límite confusos. | XS |

#### Decisiones funcionales pendientes

1. ¿La portada debe ser idéntica para todos y permanecer fijada para cada fecha, o se conserva el offset determinista por catálogo que recalcula cada carga?
2. ¿Qué zona horaria define el día (UTC, Europe/Madrid u otra) y qué debe ocurrir si la página cruza esa frontera abierta?
3. ¿La selección debe incluir cualquier disco elegible del catálogo o mantener la ordenación actual por fecha/nombre y su relación con altas/bajas?
4. ¿Debe presentarse media de portada y/o total de votos de portada? Confirmar que el conteo sería de `cover`, nunca `voteCount` si ese campo sigue contando solo Rates musicales.
5. ¿Se puede modificar una portada ya votada indefinidamente, y qué restricciones de rango/precisión debe mostrar la interfaz?
6. ¿Se quiere feedback/reintento explícito para errores de carga y de voto y un estado vacío diferenciado?

#### Subtareas futuras

| ID | Alcance futuro | Dependencia | Tamaño |
|---|---|---|---|
| D-5b | Confirmar el contrato desplegado de selección diaria y reconciliar la referencia D-4b.3, que en este roadmap pertenece al selector de dificultad. | Backend real y conciliación de IDs; sin cambios de backend en la integración actual | M · pendiente de smoke |
| D-5c | Extraer `DashboardCoverOfDayWidget.vue`; mover carga/selección/voto del padre al widget sin cambiar Rates ni preferencias. | Contrato funcional especificado por producto; APIs Catalog/Rates existentes | M · integración frontend completada; contrato HTTP real pendiente |
| D-5d | Añadir estados diferenciados, error/reintento, respuesta tardía/cambio de sesión y agregados visibles. | D-5c; valores del contrato especificado | S–M · cubierto por la integración frontend; sin inicio de trabajo adicional |
| D-5e | Regresión focalizada de slot oculto, sesión, Rates cover-only y preservación musical; cerrar documentación de extracción. | D-5c–D-5d | S · verificaciones automáticas completadas; smoke real pendiente |

**Cierre D-5a:** auditoría documentada; cambios funcionales y siguientes subtareas permanecen pendientes. Verificación requerida para esta edición: `git diff --check` únicamente sobre documentación.

### Integración frontend de Portada del día — implementada

**Estado:** código y verificaciones automatizadas frontend completados el 2026-10-27. La confirmación del contrato desplegado queda pendiente; no se modifica ni se afirma implementada la parte backend.

#### Componente y contrato Catalog

Se extrajo el slot a `src/views/dashboard/components/DashboardCoverOfDayWidget.vue`. `DashboardPage.vue` solo registra y monta el componente en el slot `portadaDia` del `DashboardWidgetGrid`; el ID, orden, tamaño y preferencias no cambian. El grid monta el widget solo cuando está habilitado, por lo que una preferencia disabled no dispara la lectura.

`src/services/discs/discs.ts` añade `DailyCoverFeaturedDisc` y `getDailyCoverFeatured({ signal })`, usando el cliente Axios existente. La ruta relativa del cliente es `GET /discs/daily-cover-featured` (el `baseURL` de la app aporta `/api`). El wrapper tipa la respuesta como disco enriquecido o `null`; consume `id`, `name`, `image`, `artist`, `averageCover`, `coverVoteCount` y `userRate`. No calcula fecha/offset, no llama a `GET /discs`, no usa `voteCount` como contador de portadas y no depende de DashboardSummary. El backend conserva la selección y sus filtros.

La tarjeta mantiene el lenguaje visual anterior y añade media comunitaria formateada a una cifra decimal y número de valoraciones de portada. Después de votar actualiza localmente la media y el contador con la nueva valoración; el número musical `voteCount` no se presenta ni se usa. `null` muestra «No quedan portadas destacadas pendientes de valorar»; carga, error recuperable y respuesta mal formada tienen estados visibles. Se valida UUID v4 antes de exponer acciones, la imagen y los textos requeridos.

#### Valoración, descubrimiento y ciclo de vida

El formulario mantiene 1–10 en pasos de 0,5 y valida el rango antes de enviar. Usa `postRateService` si no llega un registro personal y `updateRateService` cuando llega `userRate.id`; envía `cover` y conserva `userRate.rate` en el payload sin cambiar métodos ni contrato de Rates. El bloqueo local evita doble envío. Si Rates falla, conserva disco/formulario y muestra error reintentable. En éxito muestra confirmación y nota personal sin pedir otra portada automáticamente; «Descubrir otra portada» vuelve a consultar la ruta, y solo aparece después del voto. Si no hay candidata nueva se ve el empty state.

La instancia mantiene disco, nota, estado de carga/envío y errores localmente; no escribe en Pinia ni en `localStorage`. Una señal `AbortController` cancela la lectura al desmontar/desactivar y un contador de versión ignora respuestas tardías. La clave reactiva basada en usuario y generación de sesión aborta peticiones, limpia estado personal y vuelve a cargar ante cambio de sesión. Una mutación Rates ya enviada no se cancela porque el servicio existente no ofrece señal; su respuesta/error se ignora si cambió la sesión o se desmontó el componente.

Se retiraron de `DashboardPage.vue` el offset UTC, la llamada de selección por `/discs`, su dependencia de total de catálogo, estado de voto y callbacks Rates. `getDiscs` permanece porque Cementerio sigue usándolo; `dashboard-summary` y su reintento permanecen para el banner. No se tocaron `DashboardWidgetGrid.vue`, registro ni preferencias.

#### Pruebas y verificación

- Pruebas nuevas del wrapper y componente cubren ruta/señal, JSON enriquecido, valores `averageCover`/`coverVoteCount` frente a `voteCount`, montaje/desmontaje mediante grid, disabled sin petición, empty/error/reintento, UUID inválido, creación/actualización conservando nota musical, rango/precisión, doble envío, confirmación sin carga automática, descubrimiento manual y cambio de sesión/respuesta tardía.
- Focalizadas: **4 archivos, 34 tests pasaron**. Suite completa: **64 archivos, 419 tests pasaron**.
- `pnpm run typecheck` y `pnpm build` pasaron. ESLint pasó para el nuevo widget y sus tests. El lint ampliado a `DashboardPage.vue` y `services/discs/discs.ts` sigue encontrando hallazgos `no-explicit-any` y un label de otro control preexistentes en las zonas legacy; no se corrigieron. Impeccable detect devolvió `[]`.
- `pnpm run cycles` muestra el ciclo type-only existente Articles/Contents/Playlists y comparación informativa porque no pudo resolver `HEAD`; `pnpm run identity:boundaries` informa cero violaciones productivas y también comparación informativa por `HEAD` no resuelto. No se afirma que esos deltas sean gates requeridos aprobados.
- `git diff --check` pasa. No se ejecutó un smoke autenticado: el source checkout backend local disponible no contiene la ruta `daily-cover-featured`, y su worktree Git no se pudo inspeccionar; además, la entrada D-4b.3 de este roadmap pertenece a otra funcionalidad. La forma consumida se implementó conforme al contrato explícito de esta solicitud, pero falta contrastar el JSON real/desplegado y verificar HTTP real, filtros y respuesta `null`.

**Cierre de esta integración frontend:** implementación y verificaciones pertinentes completadas con la limitación de contrato/backend indicada. No se inicia ninguna tarea posterior; la conciliación de IDs y el smoke real quedan pendientes.

**Fuentes:** este frontend (`DashboardPage.vue`, `DashboardWidgetGrid.vue`, `src/app/dashboardWidgetRegistry.ts`, `src/services/discs/discs.ts`, `DiscCardComponent.vue`) y la copia local del backend en `../riffvalley-app-back` (`catalog/discs/discs.controller.ts`, `discs.service.ts`, `dto/random-query.dto.ts`, `dto/discs-list-query.dto.ts`, `catalog/disc-catalog.service.ts`, `catalog/helpers/map-catalog-disc.ts` y specs de Catalog). Se inspeccionó el código fuente y los tests que describen la query; no se ejecutó SQL ni `EXPLAIN`, no se midió el backend y no se modificó el checkout del backend. Los costes a continuación son análisis de ruta/query, no mediciones.

### 1. Comportamiento actual demostrado

El widget está registrado con ID estable `discoAleatorio`, tamaño `half` y activado por defecto. Su slot sigue inline en `DashboardPage.vue` (markup aprox. 204–265; estado y función aprox. 860–920). Muestra el título “Disco aleatorio”; en reposo ofrece “Tira los dados” y el texto “Descubre un disco al azar de toda la colección”. Al pulsar muestra dos caras animadas y una frase aleatoria; al terminar muestra una `DiscCard` y el botón “Vuelve a tirar”. No busca ni carga al montar.

La selección que demuestra el frontend **no es de todo el catálogo**: llama `getDiscs(..., voted=false)`. En `DiscsListQueryDto` esto termina en `rate.rate IS NULL` para el usuario autenticado; selecciona discos que no tienen nota musical del usuario, aunque el usuario ya haya valorado solo la portada. No exige que `voteCount` global sea cero. Por tanto no significa “disco sin votos de nadie”. `DiscCard` puede recibir un `userRate` de solo portada y seguir siendo elegible para este filtro.

Primera interacción: pide un conteo llamando `GET /discs?limit=1&offset=0&voted=false` (el frontend ignora el disco de `data` que devuelve esa petición); luego elige un offset con `Math.random()` y pide `GET /discs?limit=1&offset=<aleatorio>&voted=false`. Guarda el total para próximos intentos mientras viva `DashboardPage`; los siguientes lanzamientos hacen un único GET paginado. Esto es aleatoriedad del índice en cliente, no orden aleatorio hecho por esa ruta SQL. El orden por defecto de `findAll` es fecha de lanzamiento descendente y artista ascendente. Los cambios del catálogo o un voto realizado entre lanzamientos pueden desplazar las posiciones mientras el contador queda obsoleto.

El código no excluye el último ID ni conserva un set de vistos: **puede repetir el mismo disco en dos lanzamientos consecutivos**. También es posible que el offset ya no corresponda a un registro disponible. Si no hay `totalItems`, el frontend usa el total de DashboardSummary y después `100`; esos fallbacks no representan necesariamente el subconjunto pendiente. Si el conteo correcto es cero, se sustituye por el total general aunque el GET posterior siga filtrando `voted=false`.

Mientras carga, `diceRolling` bloquea el botón y un intervalo anima las caras cada 80 ms. Si el endpoint falla o no trae disco, el catch es silencioso; en el primer intento queda el estado inicial sin explicación. Después de un resultado previo, un error o respuesta vacía no pone `diceRolled` a false ni borra `randomDisc`: el disco anterior queda visible y no hay aviso de que el nuevo lanzamiento falló. Durante un relanzamiento se conserva la tarjeta anterior mientras el botón dice “Lanzando…”.

### 2. Qué enseña y qué puede hacer la tarjeta

El widget pasa a `DiscCard` los campos que necesita esa UI: ID, imagen, título, fecha, EP/debut, artista/país, género/color, enlace de escucha, media de nota musical y portada, nota/portada propia, ID de rate, favorite/pending, comentarios y número de votos. En la tarjeta se ven fecha, EP/debut si aplica, bandera, género, portada, título, artista, promedios de disco/portada y formulario para ambas valoraciones; los promedios propios pueden ocultarse según preferencias de spoilers de DiscCard.

No son solo datos de lectura. La tarjeta permite abrir imagen, detalle del disco y detalle de artista; abrir enlace de plataforma/reproductor; votar o editar nota/portada; abrir votos y comentarios; alternar favorito y pendiente; compartir una imagen. Usuarios con rol moderador ven además el acceso de edición de calendario. Esas acciones pertenecen a `DiscCard` y sus servicios (Rates, Favorites, Pendings, comentarios, Spotify, detalles); no son operaciones propias de random. Algunas pueden emitir requests adicionales cuando el usuario las utiliza.

La tarjeta no añade una navegación explícita de vuelta al catálogo; el título/artista abren modales de detalle y el enlace reproduce/abre plataforma. En accesibilidad, el CTA de dados sí es un `<button>` con texto visible, pero la Card heredada incluye títulos/imágenes e iconos accionables implementados como elementos clicables no siempre semánticos de botón. No debe confundirse la auditoría del random con una reescritura de DiscCard; registrar este límite y revisar los controles al implementar si forman parte del alcance acordado.

En móvil el grid coloca el widget a ancho completo; desde `lg`, `half` ocupa aproximadamente media fila. La tarjeta interna está limitada a `max-w-[20rem]` y centrada; controles y formulario se comprimen dentro de ese ancho. En desktop mantiene la misma tarjeta estrecha. El hover que anima caras solo ocurre con ratón; en touch queda la cara fija, pero el lanzamiento funciona. No se hizo inspección visual ni prueba con lector de pantalla.

### 3. Ruta frontend frente a endpoint real de Catalog

| Ruta | Parámetros/filtros | Implementación demostrada | Uso en este widget |
|---|---|---|---|
| Frontend actual `GET /api/discs` | `limit=1`, `offset`, `voted=false`; no `votedType` | `DiscCatalogService.findAll`: aplica `rate.rate IS NULL` al rate del usuario autenticado, orden predeterminado por `releaseDate DESC, artist.name ASC`, pagina | Dos llamadas HTTP al primer lanzamiento (conteo + página), una por los siguientes; la lista de una fila se consulta en orden estable, con offset pseudoaleatorio frontend |
| Operación existente `GET /api/discs/random` | `genre`, `country`/`countryId`, `year`, `ep`, `debut`, `limit` (1–50; default backend 5) | `DiscsController.findRandom` → `DiscsService.findRandom` → `DiscCatalogService.findRandom`; escoge IDs con `ORDER BY RANDOM()`, hidrata resultado y devuelve discos enriquecidos | El widget no la llama. `getRandomDiscs` en `services/discs/discs.ts` ya es su wrapper frontend, usado por Adventure con `limit: 1` |

Ambas rutas tienen `@Auth()` y reciben el usuario autenticado. `GET /discs/random` necesita el usuario para adjuntar su rate/favorite/pending a la respuesta. La ruta actual del Dashboard también exige autenticación; A no requiere identidad desde el punto de vista de selección, pero la tarjeta completa usa datos/acciones personales. B sí requiere el usuario en el servidor para saber si ya puntuó el disco. `@Auth()` no enumera un rol concreto, por lo que aplica autenticación con `UserRoleGuard`, no un permiso exclusivo de moderación.

El endpoint aleatorio existente solo selecciona discos con `releaseDate <= today`; sin filtros eso significa catálogo ya publicado a fecha de consulta, no lanzamientos futuros. Su DTO no tiene filtro `voted`, `unrated`, `scope` ni `excludeId`, y el query no consulta rates para decidir elegibilidad. Sí consulta las relaciones del usuario para hidratar la card.

La selección de `findRandom` es aleatoria en PostgreSQL: primera query selecciona IDs y aplica `.orderBy('RANDOM()').limit(limit)`. No descarga una lista de discos al cliente para que este escoja uno. Si hay IDs, segunda query carga discos/relaciones y métricas; reordena las entidades para respetar el orden aleatorio inicial. Si no hay IDs devuelve `[]` antes de hidratar.

La hidratación incluye entidad Disc, artista/país, género, rate/favorite/pending del usuario, medias de rate y cover, count de rates musicales y count de comentarios. La Card usa la mayor parte para sus controles y presentación; podrían sobrar campos de entidad que no llegan a una prop mostrada, pero no está justificado crear un endpoint/DTO estrecho durante D-4a. El endpoint devuelve `Disc[]`, no paginación ni estado de vacío especial.

**Coste potencial del endpoint existente:** una petición HTTP hace normalmente dos queries SQL secuenciales: selección de IDs aleatorios y carga de relaciones/agregados. `ORDER BY RANDOM()` requiere evaluar la función aleatoria para todos los candidatos que pasan los filtros y seleccionar los primeros `limit`; el límite pequeño reduce hidratación/red pero no elimina el recorrido de candidatos para el orden aleatorio. Puede costar más al crecer el catálogo. No se corrió `EXPLAIN ANALYZE`, no hay aquí benchmark ni evidencia de que el tamaño actual sea problemático. La proyección de IDs evita enviar candidatos extras a frontend. La query de hidratación agrega medias y counts por disco; su coste potencial también merece medición antes de optimizar, sobre todo con limit máximo 50.

**Coste de la ruta actual:** primera acción hace dos requests HTTP a `GET /api/discs`. `findAll` usa TypeORM 0.3.26 con `take/skip` y joins; en el path de paginación TypeORM ejecuta una consulta de IDs distintos con limit/offset y otra para hidratar esas entidades, y después el servicio ejecuta `getCount()`: normalmente tres queries SQL por GET con resultado. Así, se infieren hasta seis queries SQL para el primer lanzamiento y tres por lanzamiento posterior; sin resultado puede omitirse la hidratación. Además, el request de “conteo” devuelve un disco de `data` que el frontend descarta. Las queries HTTP tienen límite 1, pero el offset puede ser alto; el paginador de IDs evita transferir listas enteras, aunque no evita SQL adicional ni el count. Al ser dos GET separados, existe una carrera si cambia el conjunto entre conteo y selección. Este conteo de queries se deriva del código y del paginador de TypeORM, no de una traza real de producción; confirmar con logs/plan si se necesita cifra operativa.

Catalog es el owner correcto para elegir y devolver discos: la operación aleatoria existente ya reside en `DiscCatalogService`; los filtros personales de valoración también se procesan en Catalog al consultar la lista. Rates aporta el dato de valoración, pero el widget no debería inventar ni duplicar su endpoint. Reutilizable hoy: `getRandomDiscs()` para modo todo catálogo. Para modo pendiente, `getDiscs(..., voted=false)` es una operación existente, pero offset aleatorio/coste y semántica de lista hacen que no sea el contrato final recomendado. Reutilizar `getRandomDiscs` con un filtro de elegibilidad sería una extensión backend del mismo owner/endpoint.

### 4. Estado, ownership y ciclo de vida

El estado de interacción está en `DashboardPage.setup`: `diceRolled`, `diceRolling`, `randomDisc`, dos caras, `diceHovering`, `dicePhrase`, `unvotedDiscCount`, y variables locales `diceInterval`/`hoverInterval`; `rollDice`, `startDiceHover` y `stopDiceHover` son métodos del padre. No hay watcher para este widget ni store Pinia. Su única dependencia adicional es el fallback de `dashboardSummaryQuery.data.catalog.totalDiscs`; usa servicio `getDiscs`, `transformDisc` de Dashboard y `DiscCard` compartido.

La llamada `rollDice` no se activa si el widget está apagado, pues no hay click posible ni carga inicial. El estado/timers, sin embargo, pertenecen al padre y no al slot. Al ocultar el widget, Vue desmonta el contenido del slot; al volver a habilitarlo, reaparece con estado previo porque el padre siguió montado. No hay llamada automática al activarlo. Si se deshabilita mientras está en vuelo, la petición no se cancela y puede escribir el estado que reaparecerá al volver. `diceInterval` se limpia en `finally`; `hoverInterval` se detiene con `mouseleave`, pero no hay limpieza de ninguno de los timers en el `onUnmounted` del padre (que ahora solo retira scroll listener). Desmontar la ruta durante hover puede dejar el intervalo del dado vivo. Esto es deuda concreta a resolver al mover el ciclo de vida al widget.

No hace falta centralizar nada en Dashboard: el componente futuro debe contener estado de selección/loading/error/empty, animaciones si se conservan, y la llamada al wrapper de Catalog. El padre solo ofrece el slot/ID y el grid define si monta. Una carga directa bajo demanda mediante cliente/servicio existente es suficiente inicialmente: el resultado cambia en cada click, no hay consumidores paralelos ni beneficio claro de invalidación/refetch automático. TanStack Query sería una opción si el producto decide compartir o recuperar el resultado por query key, pero aquí el cache puede devolver el mismo disco al pulsar “otro”; habría que introducir nonce/selección nueva y clave por usuario/mode, complejidad que no se justifica por esta única acción.

### 5. Alternativas de producto: ninguna queda aprobada

| Alternativa | Utilidad / semántica | Datos y backend | Peticiones/coste | Auth y vacío | Repetición |
|---|---|---|---|---|---|
| **A. Cualquier disco del catálogo** | Descubrir discos ya puntuados y pendientes; coincide mejor con el texto actual. Debe decidirse si “catálogo” excluye futuros, como hace `findRandom` con `releaseDate <= today` | Disponible con `GET /discs/random?limit=1`; no requiere cambio backend. Respuesta ya tiene campos para DiscCard | Una llamada HTTP por click; dos queries SQL de random actual. Evita count/lista y payload extra del primer conteo. `RANDOM()` inspecciona candidatos y puede crecer de coste | Endpoint autenticado hoy porque enriquece respuesta con usuario; el Dashboard ya exige sesión. `[]` significa que no hay discos publicados elegibles | Puede repetir, incluso consecutivamente; añadir exclusión es cambio contractual/SQL y complica el caso de catálogo de un disco |
| **B. Pendiente de valoración musical del usuario** | Fomenta que el usuario puntúe algo nuevo. Explicar que “pendiente” refiere a nota del disco, no a portada; discos con solo cover pueden entrar. No equivale a “sin votos de comunidad” | GET `/discs` ya expone filtro personal `voted=false` (por defecto `votedType` busca `rate.rate IS NULL`), pero no hay filtro en random endpoint. Extender `GET /discs/random` con modo personal es el backend recomendado si se elige B | Usando endpoint actual random sin modificación no sirve. Usando listado se necesitan count + selección aleatoria por offset; el count GET descarga una fila ignorada y cada GET hace consulta de lista y count. Con filtro en endpoint random sería un HTTP/ dos queries, más filtro `NOT EXISTS`/join rate del usuario en la query aleatoria | Necesita user ID autenticado para filtrar, ya disponible en `@Auth()`/`@GetUser()`. Si no hay pendientes, devuelva `[]` y UI empty explícito (“Ya has valorado todos…”) | También repite porque una nueva llamada puede elegir el mismo pendiente. Excluir anterior es posible si se agrega filtro, pero si solo queda uno se debe decidir entre repetir o decir que no hay alternativa |
| **C. Selector: cualquiera o pendiente** | Permite descubrimiento y objetivo personal. Añade control visible y una preferencia de modo temporal; gana flexibilidad pero ocupa el widget compacto y obliga a explicar dos universos | Requiere que `/discs/random` soporte selección por modo y su filtro user-specific; mantener `getRandomDiscs` como servicio Catalog ampliado. Reutiliza selección y DTO, no dos APIs separadas | Un HTTP por cambio/selección; query aleatoria por modo, con coste de orden aleatorio. El modo no debería compartir caché ciegamente con el otro | Autenticación existente cubre ambos. Estado empty distinto por modo (catálogo sin disponibles vs todos puntuados) | Ambos modos pueden repetir salvo contrato anti-repetición. Cambiar el modo debe limpiar o separar el último ID visto |

**Estado histórico de D-4a:** dejó A/B/C abiertas. D-4b sustituye esa comparación por la propuesta de tres dificultades basada en géneros y votos comunitarios; esta evolución sigue siendo auditoría, no aprobación de implementación. Las definiciones de pendiente, fechas futuras y repetición se concretan en D-4b.

### 6. Simplificación futura y contrato recomendado

**Frontend, necesaria para refactorizar:** crear `RandomDiscWidget.vue` (o nombre equivalente dentro de widgets/dashboard); poseer allí estados, interacción y query; reemplazar el contenido inline por el componente en el mismo slot y retirar de `DashboardPage` `rollDice`, faces/phrases/timers/count/result refs y su fallback de Summary. No pasar callbacks de datos desde padre; no cambiar el ID ni el registro. Mantener `DiscCard` y el servicio de Catalog ya publicado.

**Contrato de componente:** sin props de dominio ni emits al padre para esta interacción autónoma. El widget importa wrapper público de Catalog, mantiene la opción A/B/C en estado local si se elige C, y presenta un `Disc` tipado de la respuesta. Evitar `any` nuevo. Si se conserva API de `getRandomDiscs`, usar `limit: 1`; dar a la UI el primer elemento o `null`. Tras elección de B/C, extender `RandomDiscsParams`/DTO del mismo endpoint con un modo acotado y tipado; el backend toma user ID autenticado y aplica elegibilidad antes de `ORDER BY RANDOM()`. Respuesta sigue `Disc[]` y empty `[]`; no crear endpoint paralelo. El contrato opcional de `excludeDiscId` solo se agrega si Producto exige anti-repetición inmediata.

Estados mínimos del widget: `idle` (CTA), `loading` (CTA deshabilitada + indicador anunciado), `result` (DiscCard y CTA “Otro disco”), `empty` (explica modo y acción de reintento si tiene sentido), `error` (mensaje/reintento, nunca oculto). Al empezar un nuevo intento, decidir visualmente si se mantiene resultado anterior con indicador o se limpia; si se conserva, no aparentar que el resultado viejo es el nuevo. Limpiar hover/roll interval en desmontaje; preferir animación CSS sobre intervalo de caras si evita timer de JS sin perder identidad visual. Una sola bandera de carga es suficiente; Query/Pinia no son requisitos.

**Contrato de Catalog:** una operación `getRandomDiscs` ya existe y pertenece al owner correcto. A puede consumirse hoy sin cambiar backend. Para B/C, la mínima extensión del endpoint existente recibe un modo explícito (`all`/`unrated`, nombre por cerrar), siempre usa usuario autenticado para `unrated`, conserva filtros actuales de Adventure y `limit`, y aplica el filtro antes del sort aleatorio. No aceptar userId arbitrario desde query. Volver `[]` sin excepción cuando no hay candidatos. Conservar payload necesario para DiscCard; revisar proyección solo con medida de bytes/SQL y contrato de Catalog, no duplicar un servicio de random en Dashboard.

### 7. Experiencia: necesarias y opcionales

**Necesario al extraer:** mantener botón y estilo/colores Riff Valley; mostrar loading durante request y error/empty explícitos; impedir doble click; limpiar timer/acción al desmontar; etiqueta accesible para el CTA y texto de estado que no dependa solo del spinner; conservar DiscCard/actions y no presentar un disco antiguo como uno recién seleccionado.

**Recomendado sin cambiar producto:** alinear el texto con modo definitivo (“Descubre cualquier disco…” o “Encuentra un disco pendiente de valorar”); anunciar resultado actualizado con región `aria-live` no intrusiva; manejar foco tras el resultado sin saltar inesperadamente; verificar que los controles heredados de DiscCard sean accesibles sin ratón en una tarea propia/proporcional; revisar compactación del formulario y botón en móvil. Diferenciar empty por catálogo vs pendientes agotados.

**Opcional, requiere decisión de producto:** selector de modo C; evitar repetición inmediata; mostrar metadatos adicionales en cabecera (año/género ya aparecen en la Card); historial de últimos discos para no repetir en toda la sesión; personalizar animación o frases. No se recomienda recargar la Card con otra presentación ni rediseñar toda la tarjeta dentro de esta extracción.

### 8. Pruebas necesarias para D-4b (no ejecutadas aquí)

- Widget: no hace llamada al montar ni cuando no se renderiza por preferencia disabled; primer click llama una vez; click concurrente no duplica; click “Otro disco” llama de nuevo; valida modo/parámetros y card visible.
- Estados: loading accesible y botón deshabilitado; error muestra retry; `[]` muestra empty; fallo/vacío en relanzamiento no etiqueta la tarjeta anterior como resultado nuevo; vuelve de error/empty a resultado al reintentar.
- Ciclo de vida: desmontar limpia intervalos y no deja actualización visible; desactivar/desmontar mientras request y volver a activar respeta una política clara (resultado reiniciado por instancia o conservado por cache, no accidentalmente por padre).
- Integración de Catálogo: request usa servicio existente, user session correcta y transform del `Disc` consistente con DiscCard; acciones de DiscCard conservan contratos ya vigentes.
- Backend, solo si se extiende para B/C: DTO acepta solo modo válido, `limit` mantiene 1–50, filtro musical usa `rate.rate` del `@GetUser()` actual y no mezcla otros usuarios; disco futuro queda fuera si ese contrato se conserva; `[]` cuando no hay candidatos; random ordering conserva `RANDOM()` y hydration order; tests controller/service + test de query y Postgres/contrato para cubrir `all`, `unrated`, rating completa, cover-only y empty. Ningún test debe codificar anti-repetición salvo que el producto la decida.
- Rendimiento: si el catálogo real justifica preocupación, medir `EXPLAIN (ANALYZE, BUFFERS)` con tamaño y distribución representativos antes de sustituir `ORDER BY RANDOM()`; no optimizar a ciegas ni crear estrategia de muestreo alternativa en esta refactorización.

### 9. Estimación y estado de decisiones

| Camino | Estimación | Dependencias |
|---|---|---|
| Componente + modo A usando endpoint existente | **S** frontend | Decidir A; pruebas del wrapper ya existente y estado/widget. No requiere cambio backend |
| Componente + modo B | **M** combinado (S frontend + M backend) | Decidir semántica de “valorado”; ampliar query/DTO de Catalog y probar filtro por usuario |
| Componente + modo C | **M** combinado | Decidir selector/mode default, espacio UX, contrato del mismo endpoint y estados vacíos independientes |
| Anti-repetición inmediata adicional | **S–M** según contrato | Decidir comportamiento cuando solo queda un candidato; excluir ID en query y testear fallback |

Pendiente de decisión al cerrar D-4a: modo A/B/C, fecha de disponibilidad (actualmente random excluye futuro), significado de pendiente (nota musical propia frente a cover o votos comunitarios) y política de repetición. D-4a no tomó esas decisiones; D-4b las reevalúa para la propuesta de dificultad. La implementación queda para tareas separadas posteriores y debe retirar del padre su lógica en el mismo cambio; no iniciar otro widget como parte del trabajo futuro de Disco aleatorio.

**Verificación D-4a:** `git diff --check`. El único archivo tocado por esta auditoría es `roadmap/dashboard.md`; los cambios de frontend preexistentes en el checkout se preservaron. El backend solo fue leído.

## D-4b — Auditoría del selector aleatorio por dificultad

**Estado de la auditoría original:** completada el 2026-10-26. Al cerrar esa auditoría, la implementación seguía pendiente y se separó por repositorio. La ejecución posterior de D-4b.1 (backend) y D-4b.2 (frontend) se documenta en los bloques de implementación al final de esta sección; D-4b.3 continúa pendiente.

**Fuentes:** la auditoría D-4a y el widget actual; servicios frontend `getRandomDiscs`; backend local `community/rates/entities/rate.entity.ts`, `rates.service.ts`, `stats/rates-stats.service.ts`, `rates.module.ts`, y Catalog `discs.controller.ts`, `random-query.dto.ts`, `discs.module.ts`, `catalog/disc-catalog.service.ts`, `disc.entity.ts`, `map-catalog-disc.ts`, índices/migraciones y tests relacionados. Solo lectura. No se ejecutaron tests, migraciones, consultas ni `EXPLAIN`; rendimiento e índices se valoran estructuralmente, no se afirman como mediciones.

### 1. Reglas que debe resolver el servidor

| Dificultad | Preferencia del usuario | Votos musicales comunitarios actuales | Selección |
|---|---|---|---|
| Fácil | IDs de sus tres géneros más votados; si tiene 1–2, usa esos; si tiene 0, no restringe por preferencias | `>= 5` usuarios con `rate.rate IS NOT NULL` | Elegir aleatoriamente dentro de candidatos |
| Normal | IDs de sus siete géneros más votados; si tiene menos, solo los disponibles; si tiene 0, sin restricción de preferencias | `2–4` inclusive | Elegir aleatoriamente dentro de candidatos |
| Difícil | Primero géneros donde el usuario no haya puntuado musicalmente ningún disco; si no hay candidatos, cualquier género fuera de su Top 7 | `0–1` inclusive | Aleatorio dentro del grupo prioritario; el fallback continúa siendo Difícil y conserva `0–1` |

Las tres dificultades aplican además una exclusión común: disco publicado (`releaseDate <= today`), género clasificable, y ausencia de una Rate del usuario con `rate IS NOT NULL`. Cover-only no se considera voto musical propio ni comunitario. El promedio/nota media no determina elegibilidad ni orden de selección. Una salida de candidatos se elige por azar, no por valoraciones, promedio o ranking.

#### Perfil de géneros favoritos

La fuente correcta es el estado actual de `community.rates.entities.Rate` unido con `Rate.disc` y el género del disco; no `RateVoteEvent`, que es histórico. La condición musical es exactamente `rate.userId = authenticatedUserId AND rate.rate IS NOT NULL`. `cover` no entra en esta consulta. Se agrupa por `genre.id` y se cuenta `COUNT(DISTINCT disc.id)`, tal como piden las reglas: diez discos votados en un género son un género con cuenta 10, no diez géneros ni diez filas repetidas por rating.

Orden recomendado estable: cuenta de discos distintos descendente; desempate por nombre de género ascendente y finalmente `genre.id` ascendente. El ID evita que nombres iguales o colación compartida dejen el resultado indeterminado. Los géneros sin discos puntuados por el usuario no salen en este ranking. Si hay menos de N filas, se usan todas. Si el resultado está vacío, Easy y Normal omiten el filtro de géneros; Hard considera todo género con discos como no explorado para su primera prioridad.

El perfil no debería filtrar releases futuros salvo decisión separada: las reglas fijan el universo de discos candidatos, mientras el historial musical actual del usuario define preferencias. Mantener ambos conceptos separados evita que un voto sobre un disco correctamente puntuado desaparezca de su perfil solo por cambiar/interpretar la fecha.

#### Voto comunitario por disco y datos de Rates

`Rate` es una fila actual con `discId`, `userId`, `rate DECIMAL(4,2) NULL` y `cover DECIMAL(4,2) NULL`. El filtro para una nota musical emitida es `rate IS NOT NULL`; una fila con `cover` pero `rate = NULL` no suma. El DTO de Rates permite actualmente cero para `rate` pese a un comentario que habla de mínimo 1; con la regla solicitada basada en “no nulo”, una fila `rate = 0` cuenta. No reinterpretar el umbral como `rate > 0` ni usar promedio.

Para el umbral comunitario, la definición que evita inflar votos por filas repetidas es contar personas distintas: `COUNT(DISTINCT rate.userId)` para ese `discId`, filtrando `rate.rate IS NOT NULL`. La Rate table modela un voto musical actual por persona/disco, no un ledger de cada cambio; eventos anteriores están en `rate_vote_events` y no deben sumarse para decidir dificultad. La exclusión personal debe ser `NOT EXISTS` para la pareja usuario/disco con `rate IS NOT NULL`; así, cualquier duplicate no nulo excluye el disco y filas cover-only no lo excluyen.

El servicio `RatesService.create` serializa inserts con `pg_advisory_xact_lock(user.id, discId)` y comprueba si existe una Rate antes de insertar, pero la entidad no declara unique `(userId, discId)` y la migración revisada crea un índice compuesto **no único**. No se encontró la migración que creó la tabla base `rate`, así que esta revisión de fuentes no certifica el DDL de todas las bases desplegadas ni permite afirmar si allí existe una restricción adicional. El estado normal de la aplicación intenta mantener una fila actual, pero no se debe asumirla a partir del modelo frontend/backend. Por eso las agregaciones de este widget deben ser robustas: `COUNT(DISTINCT disc.id)` para preferencias y `COUNT(DISTINCT userId)` para comunidad; no confiar en una Rate por usuario/disco.

### 2. Reutilización real y límites actuales

- `RatesStatsService.getUserStats` ya une Rate→Disc→Genre y filtra `rate.rate IS NOT NULL`, pero su `votesByGenre` agrupa por nombre, cuenta `COUNT(rate.id)`, no cuenta discos distintos, no devuelve `genre.id` ni aplica desempate/orden/limit. Es precedente de consulta, no un resultado reutilizable exacto.
- `RatesStatsService.getDashboardActivitySummary` ya usa `COUNT(DISTINCT rate."discId")` sobre `rate IS NOT NULL`; sirve como patrón para contar discos actuales de un usuario, pero no calcula distribución de género ni votos comunitarios por disco.
- `getHomeInsights` calcula top artists/países del usuario; no obtiene géneros favoritos.
- Catalog `findRandom` ya calcula un `rateCount` posterior para hidratar la card con `COUNT(rate.id) ... rate.rate IS NOT NULL`. Es un agregado para mostrar conteo por disco después de elegir candidatos, cuenta filas (no usuarios distintos) y no puede filtrar la selección previa. No reutilizarlo como umbral sin mover/centralizar la semántica y deduplicar.
- No se encontró una API Rates que devuelva el perfil de género exacto o un agregado de votos comunitarios robusto para una selección. La lógica equivalente no debe copiarse en dos servicios.

### 3. Índices y coste probable

En el código/migración localizada existen `IDX_rate_disc_id_d46 (discId)` y `IDX_rate_user_disc_d46 (userId, discId)`, ambos no únicos. El primero ayuda a agrupar/contar votos por disco y el segundo a consultar las Rates del usuario o comprobar su disco puntuado. No hay índice parcial visible para `rate IS NOT NULL` ni constraint de unicidad usuario/disco. No hay evidencia suficiente para pedir otro índice ahora: los existentes cubren las claves principales y el query aún no se ha medido.

La consulta del perfil puede partir de la porción de Rate de un usuario mediante `(userId, discId)`, filtrar `rate IS NOT NULL`, y unir discos/géneros; su volumen se acerca a las valoraciones musicales de ese usuario. El agregado comunitario toca votos actuales del catálogo y agrupa por disco/usuario; su coste crecerá con Rates y `COUNT(DISTINCT)` tiene coste adicional. La selección aleatoria del endpoint usa `ORDER BY RANDOM()`: debe examinar candidatos elegibles y ordenar/retener un conjunto aleatorio; thresholds selectivos reducen candidatos de hidratación, pero no garantizan un índice que resuelva la aleatoriedad. Un índice nuevo no elimina ese coste.

El plan recomendado es una sola query de candidatos en Rates/Catalog que calcule preferencias, filtro de Rate propio y conteo comunitario antes del `ORDER BY RANDOM()`, seguida de la query de hidratación de Catalog ya existente. En lo posible usar CTEs/agregados agrupados, sin emitir una consulta por disco. `EXPLAIN (ANALYZE, BUFFERS)` en base representativa será una verificación de rendimiento de implementación si el checkout/entorno permite ejecutarlo; no formar una exigencia para D-4b de análisis ni ejecutar contra producción. Considerar un índice parcial o único solo si el plan/datos y una revisión de integridad demuestran necesidad; la unicidad requiere antes detectar/limpiar duplicates y queda fuera de este alcance.

### 4. Selección Difícil y bordes

Definición de grupos usando los géneros favoritos ordenados anteriores:

1. `neverRatedGenres`: géneros para los que no existe ningún disco con `Rate(userId, discId, rate IS NOT NULL)`.
2. `outsideTop7`: géneros cuyo ID no está entre los primeros `min(7, favoriteGenreCount)`.

En Hard, primero se buscan candidatos de `neverRatedGenres` y `communityVotes <= 1`; si son cero, se busca en `outsideTop7` con el mismo umbral. No se cambia a Normal/Fácil. Si el usuario tiene menos de siete géneros votados, `outsideTop7` incluye todos los otros géneros, que para el usuario son también no explorados; si tiene cero, el grupo prioritario y el fallback son el mismo catálogo de géneros. En ese caso basta una evaluación: repetir la misma consulta como fallback no puede encontrar candidatos nuevos. Si tiene más de siete, el fallback añade los géneros con puestos 8+ y conserva los inéditos.

Para evitar dos queries de selección secuenciales en Hard, Catalog puede construir un solo conjunto elegible `outsideTop7`, asignar prioridad 0 a género no votado y 1 a género votado fuera del Top 7, y ordenar primero por prioridad, luego anti-repetición si se decide, y finalmente `RANDOM()`. Esto implementa “si la prioridad 0 contiene candidatos, elegir de ahí; si no, elegir de prioridad 1” con un solo sort; hay que probarlo con datos PostgreSQL para confirmar semántica y plan. Alternativamente dos queries son más simples de leer pero cuestan una segunda selección cuando no hay prioridad 0. No expandir Hard a géneros Top 7 ni relajar `0–1`.

Caso especial: sin votos del usuario, todos los géneros clasificables son “nunca votados”; el fallback `outsideTop7` es el mismo conjunto. Si no hay ningún disco con 0–1 votos comunitarios y fecha válida, Hard devuelve empty explícito. Los discos sin género no pertenecen a un género nunca explorado ni demostrablemente fuera del Top 7; recomendación: excluirlos de los tres modos, informar esto en pruebas, y pedir decisión de producto solo si se quieren tratar como categoría “sin género”.

### 5. Compatibilidad y contrato HTTP mínimo

El endpoint existente `GET /api/discs/random` es adecuado: ya pertenece a `DiscCatalogService`, recibe `@GetUser()` tras `@Auth()`, selecciona IDs aleatorios en PostgreSQL y después devuelve las entidades enriquecidas. `RandomQueryDto` puede extenderse con un parámetro opcional de dificultad. Si no viene, su comportamiento actual (filtros y límite, predeterminado 5) se conserva exactamente para Adventure y otros consumidores. No cambiar respuesta ni comportamiento de solicitudes existentes.

Contrato propuesto para este widget:

```http
GET /api/discs/random?difficulty=easy&limit=1&previousDiscId=<uuid-opcional>
GET /api/discs/random?difficulty=normal&limit=1
GET /api/discs/random?difficulty=hard&limit=1
```

- `difficulty`: enum opcional `easy | normal | hard`, validado. Ausente mantiene el contrato actual. Si está presente, Catalog aplica umbral/preferencias correspondientes antes de seleccionar.
- `limit`: conserva el parámetro y validación existentes; widget siempre usa 1. Los filtros existentes `genre`, `country/countryId`, `year`, `ep`, `debut` siguen funcionando y, si se envían junto con dificultad, se intersectan con los candidatos de esa dificultad. Un filtro manual incompatible puede producir vacío; no debe bajar a otra dificultad.
- `previousDiscId`: opción futura, UUID validado, para preferir otro disco si hay alternativas. No se envía ningún `userId`; Rates/Catalog toman exclusivamente `user.id` del contexto autenticado. `@Auth()` ya protege la ruta y la sesión de la app está presente.
- Respuesta sigue `Disc[]`, de longitud 0 a `limit`; `[]` significa que no existen candidatos para ese nivel y esos filtros. No envolver en un resultado especial ni devolver dificultad distinta.

### 6. Propiedad de Rates/Catalog sin ciclo

Hoy `DiscModule` no importa `RatesModule`, y `RatesModule` no importa `DiscModule`: el segundo importa Rate/Disc por `TypeOrmModule.forFeature`, Authorization y Users. UsersModule no importa Catalog. La entidad Disc referencia Rate y Rates referencia Disc a nivel de entidad, pero eso ya existe y no constituye un ciclo entre los módulos Nest. La dirección propuesta de módulo es **Catalog → Rates**, nunca Rates → DiscsService/CatalogModule; se puede importar `RatesModule` desde `DiscModule` y exportar un proveedor de consulta de dificultad sin dependencia inversa.

Contrato interno recomendado: un servicio acotado de Rates (por ejemplo, `RatesRandomDifficultyCriteriaService`, exportado por `RatesModule`) encapsula construcción de perfil de géneros, exclusión de discos musicales ya puntuados y agregación comunitaria distinct. Ofrece al query de candidatos de Catalog los CTE/subqueries/predicados para `userId + difficulty`, no un endpoint REST ni una lista de todos los IDs del catálogo. Catalog conserva `releaseDate <= today`, filtros de Disc, priorización aleatoria, hidratación y orden de respuesta. La integración puede ser un query-builder modifier o un objeto de CTEs/params tipado; escoger la forma más corta que mantenga pruebas Rates sobre las reglas y pruebas Catalog sobre la selección.

Esto mantiene a Rates como dueño de qué cuenta como voto y a Catalog como dueño de qué disco se elige, en una sola consulta SQL sin que Catalog vuelva a definir la semántica de Rate. No introducir import circular de módulos, una llamada HTTP entre servicios del mismo proceso, una query por candidato ni un sistema genérico de recomendaciones. Si no se logra un contrato SQL pequeño sin filtrar internals de TypeORM, resolver explícitamente la frontera antes de codificar; no duplicar en Catalog la agrupación de Rates.

### 7. Estrategia aleatoria y anti-repetición

Usar la consulta aleatoria ya establecida por Catalog (`ORDER BY RANDOM() LIMIT 1`) sobre IDs que ya cumplen todos los filtros. No ordenar por count, promedio ni score. `RANDOM()` puede repetir en tiradas posteriores porque no guarda estado; la dificultad y el usuario no determinan una semilla estable.

`previousDiscId` no es requisito funcional para D-4b. Si se aprueba, recomendación de una sola query: ordenar candidato anterior detrás de otros válidos y después por random (`isPrevious ASC, RANDOM()`). Así, Easy/Normal evitan repetición si hay otro candidato. En Hard se debe definir precedencia: aplicar primero la prioridad de género y evitar repetición dentro del grupo seleccionado puede repetir el único género inédito aunque haya opciones de fallback rank 8+; evitar repetición global puede escoger rank 8+ antes que el único inédito y relajar prioridad estricta. Propuesta: conservar la prioridad estricta y evitar repetición dentro de la prioridad Hard seleccionada; repetir cuando sea el único de ese grupo. Si producto interpreta “cuando existan alternativas” como cualquier candidato hard, invertir esos criterios deliberadamente y añadir prueba.

El ID anterior no se valida como autoridad de usuario ni permite leer datos de otra cuenta; solo excluye/preferencia un candidato y se combina con filtros server-side. Para un resultado vacío causado solo por excluir el anterior, el SQL ordenado ya devuelve el anterior al final, así que no necesita segundo request/consulta de fallback. Si se implementa como `AND disc.id != previousDiscId`, eso sí necesita reintentar sin exclusión para el único candidato; evitar esa forma.

### 8. Integración frontend y estados

En frontend futuro, reemplazar slot inline por componente propio `RandomDiscWidget.vue`, sin cambiar el ID `discoAleatorio` ni sus preferencias. El componente mantiene dificultad activa, resultado, loading/error/empty y último ID; tres botones “Fácil”, “Normal”, “Difícil”; una llamada a `getRandomDiscs({ difficulty, limit: 1, previousDiscId? })` por tirada. La dificultad al elegir botón puede seleccionar/consultar inmediatamente o esperar a “Tirar”; recomendar cambiar selección y lanzar desde un botón CTA común para evitar dos acciones confusas, pero debe decidirse con UX. No recalcular perfil/umbrales en el navegador ni invocar métodos de DashboardPage.

`getRandomDiscs` ya existe en `services/discs/discs.ts`; añadir allí los campos tipados de query cuando el contrato backend esté implementado, no crear un segundo axios service. El componente directo bajo demanda es suficiente; TanStack Query no aporta reutilización aquí y la key aleatoria tendería a devolver el mismo disco al pulsar de nuevo. No usar Pinia. Si una consulta tarda, loading pertenece al nivel activo; error permite reintentar ese mismo nivel; respuesta `[]` comunica que no hay candidatos para ese nivel, sin cambiarlo. Al cambiar nivel, no enseñar un resultado del nivel previo como resultado nuevo; elegir si se conserva visualmente hasta la nueva respuesta o se limpia al empezar. Desmontaje limpia animaciones/requests según el wrapper cliente.

La `DiscCard` compartida conserva sus acciones y recibe el mismo contrato enriquecido; Ratings solo afecta selección, no presenta una tarjeta alternativa. Estados visibles recomendados: idle con descripción de nivel/umbral, loading accesible, empty con texto según el nivel, error con retry y result con modo/dificultad claros. La preferencia de nivel permanece estado local al widget a menos que producto solicite persistirla; no cambiar esquema de Account.

### 9. Casos límite que deben quedar explícitos

| Caso | Resultado esperado / criterio |
|---|---|
| Usuario sin votos | Easy/Normal sin filtro de género; Hard considera todos los géneros no votados primero. Sus umbrales comunitarios siguen aplicando |
| Uno o dos géneros votados | Easy y Normal usan solo 1–2 IDs disponibles, sin rellenar con favoritos inventados |
| Menos de siete géneros | Normal usa todos; Hard fuera de Top 7 equivale a todo lo que quede fuera del Top real |
| Empate de cuenta de género | Orden total estable: cuenta desc, nombre asc, ID asc |
| Sin candidatos de una dificultad | `[]`/empty explícito, sin cambio de dificultad; Hard solo prueba su segundo grupo conservando umbral hard |
| Disco con cero votos musicales | Cuenta como 0 y solo puede entrar en Hard (si cumple género/fecha/valoración propia) |
| Disco con solo votos de portada | No aumenta umbral comunitario ni cuenta como voto propio; elegible si lo demás cuadra |
| Usuario ya dio nota musical | Excluir si existe cualquier Rate propia no nula; sus votos sí pertenecen al perfil de género |
| Disco futuro o fecha nula | Excluir de candidatos para mantener cutoff actual `releaseDate <= today` |
| Único candidato | Devolverlo incluso si coincide con anterior; anti-repetición no transforma candidato único en empty |
| Repetición inmediata | Evitar con `previousDiscId` cuando el criterio de prioridad elegido permite otro candidato; si no se incluye, puede repetirse |
| Duplicados Rate user/disc | No inflan conteos: géneros cuentan discos distintos, comunidad usuarios distintos; NOT EXISTS excluye si cualquiera tiene rate nonnull |
| Usuario sin sesión | La ruta ya requiere `@Auth()`; rechazar auth antes de calcular dificultad, nunca aceptar userId de query |
| Género null | Recomendación: no elegible por no poder clasificarse en preferencias; decisión explícita si se quiere categoría separada |

### 10. Pruebas, riesgos y tareas futuras

**Backend Rates (specs de consulta y servicio):** contar discos actuales distintos por género solo con `rate IS NOT NULL`; ignorar cover-only; orden determinista; fewer-than-N; duplicates; no releases futuros necesarios para ranking. Verificar comunidad distinct user con thresholds exactos 0,1,2,4,5; valores nulos de rate y cover-only; comparar 4 vs 5 no usar media; query builder no cuenta filas duplicadas.

**Backend Catalog (DTO/controller/query/Postgres integration):** DTO acepta solo `easy|normal|hard`, UUID previo y mantiene límites; ausencia de difficulty preserva pruebas/consumidores actuales, incluyendo Adventure; `@GetUser` fija usuario, sin userId arbitrario; exclusión rated actual; fecha corte; filtros de catálogo se intersectan; candidato elegido pertenece al umbral y género; random order permanece SQL; Hard usa prioridad/fallback correcto sin degradar difficulty; empty `[]`; single-candidate anti-repeat fallback; hydration conserva orden y payload DiscCard. Añadir pruebas que demuestren Rates criteria no se duplica en Catalog.

**Frontend:** tres botones y request con dificultad correcta; una petición por tirada y no al montar widget; loading/error/retry/empty/result; no cambio silencioso de nivel; previousDiscId se actualiza solo con resultado; activar/desactivar desmonta widget sin petición; card/actions vigentes; no restaurar estado del padre ni guardar nivel en preferencias.

Riesgos: `COUNT(DISTINCT userId)` puede ser más caro que row count; sort `RANDOM()` puede ser el cuello con catálogo grande; top preferencias debe reflejar estado actual, no eventos históricos; no hay garantía de unicidad en BD; Hard tiene precedencia de grupo y repetición que producto debe aceptar; no se conoce el volumen real. No agregar índice ni unique constraint sin medición/plan de limpieza.

**Plan y ejecución por fases:**

| Tarea futura | Repositorio | Alcance | Tamaño |
|---|---|---|---|
| D-4b.1 Criteria por dificultad | Backend | Rates provider SQL pequeño; extender DTO y query de `GET /discs/random` opcionalmente; tests Rates/Catalog, compatibilidad de llamadas sin difficulty; no migración inicialmente | M · completada en backend |
| D-4b.2 Widget selector | Frontend | `RandomDiscWidget.vue`, wrapper tipado `getRandomDiscs`, modos/estados, retirar `rollDice`/timers/count de DashboardPage dentro del mismo cambio; pruebas component/service | S · completada en esta tarea |
| D-4b.3 Integración/medición | Ambos (si disponible) | Probar contrato versionado entre repos y revisar EXPLAIN/latencia con dataset representativo, solo si es parte de quality gate | XS–S · pendiente, no iniciada |

Estimación combinada backend+frontend: **M**. Backend se completó primero para fijar el contrato y frontend se integró después. En la auditoría quedaban pendientes nombres/UI de los tres botones, si cambiar dificultad disparaba una tirada automática, la política de géneros nulos y la precedencia Hard frente a evitar repetición. D-4b.2 implementa los nombres “Fácil/Normal/Difícil”, configura el siguiente lanzamiento sin tirada automática y mantiene el selector independiente por modo; no cambia las reglas de dificultad ni decide nuevas recomendaciones de producto.

**Verificación de la auditoría original D-4b:** `git diff --check`. En aquella tarea se modificó solo `roadmap/dashboard.md`; los cambios funcionales locales preexistentes se preservaron y el backend solo se leyó. La implementación posterior queda registrada a continuación.

## D-4b.2 — Extracción frontend de Disco aleatorio

**Estado:** completada el 2026-10-26. D-4b.3 permanece pendiente y no se inicia aquí.

### Componente y ciclo de vida

`src/views/dashboard/components/RandomDiscWidget.vue` es ahora el propietario de la selección de modo, disco mostrado, último disco por modo, estados de carga/error/sin resultados, dos temporizadores de dados y la petición en curso. No acepta props ni emite datos al Dashboard, no persiste el modo en preferencias o Pinia y no usa TanStack Query para esta acción puntual.

El widget ocupa el slot existente `discoAleatorio` dentro de `DashboardWidgetGrid`; no se alteraron el ID, el orden, el tamaño ni las preferencias. El grid ya filtra los módulos desactivados del `v-for`, así que el hijo se desmonta al ocultarlo. `onBeforeUnmount` aborta la petición y limpia los intervalos. También se aborta/ignora una respuesta al cambiar de modo, y la generación de petición evita aplicar resultados tardíos. Cambiar modo solo actualiza el selector; la tirada sigue siendo una acción explícita mediante los dados.

El selector integra retratos pixel art pequeños como decoración junto a las etiquetas accesibles: Libre usa `public/doomguy/5.png`, Fácil `1.png`, Normal `3.png` y Difícil `42.png`. Se conservan los nombres de modo como texto visible y accesible.

### Modos y llamadas

| Modo | Operación por tirada | Comportamiento frontend |
|---|---|---|
| Libre (predeterminado) | `getDiscs(1, offset, ..., voted=false)` | Mantiene la selección de discos sin valoración musical; permite una Rate solo de portada. La primera tirada consulta el total de resultados elegibles y luego pide una página en offset aleatorio; las siguientes reutilizan ese total mientras vive el widget. No llama al endpoint de dificultad. |
| Fácil | `getRandomDiscs({ difficulty: 'easy', limit: 1, previousDiscId? })` | Una petición; selección y umbrales los resuelve Catalog/Rates. |
| Normal | `getRandomDiscs({ difficulty: 'normal', limit: 1, previousDiscId? })` | Una petición; selección y umbrales los resuelve Catalog/Rates. |
| Difícil | `getRandomDiscs({ difficulty: 'hard', limit: 1, previousDiscId? })` | Una petición; selección y prioridad los resuelve Catalog/Rates. |

Se amplió `RandomDiscsParams` con los valores tipados y se pasó `AbortSignal` como configuración Axios separada de `params`; no se añade `userId`. `getDiscs` también admite una señal opcional para cancelar la consulta Libre sin cambiar la forma de sus llamadas previas. `Disc` incorporó campos opcionales enriquecidos que ya devuelve el catálogo y que se necesitan al conservar el contrato existente de `DiscCard`. El cliente Axios ya usa `signal`; no se añadió cliente ni abstracción HTTP.

El widget recuerda el último ID por cada dificultad, solo tras un resultado válido. Al repetir una tirada de ese mismo modo lo envía en `previousDiscId`; los modos no comparten ese valor. Libre conserva su comportamiento previo de offset y no envía ese parámetro. La respuesta `[]` se muestra como estado vacío, sin degradar a otro modo; un rechazo HTTP muestra error y permite reintentar. La animación mantiene el cambio rápido de caras durante la tirada y el efecto de hover, ahora con temporizadores propios del componente.

### Limpieza de DashboardPage

`DashboardPage.vue` ahora monta `RandomDiscWidget` en el slot registrado y ya no contiene `rollDice`, el contador de discos pendientes ni el estado/timers/caras/frase del dado. Se retiró de la página el CSS local exclusivo del dado. Se conservan `transformDisc`, `getDiscs` y `DiscCard`, porque todavía los usan Portada del día, Cementerio y los widgets de rankings; sus peticiones y contenido no se han cambiado. El estado compartido de DashboardSummary continúa sirviendo a Banner/Portada y no se pasa al widget aleatorio.

### Pruebas y verificación

Se añadieron tests del componente para modo Libre predeterminado, filtro `voted=false`, las tres dificultades, una llamada de dificultad por tirada, selección sin petición automática, `previousDiscId`, respuesta válida, empty, error/reintento, doble tirada, animación de hover/foco, cambio de modo con cancelación, desmontaje y módulo desactivado mediante el grid. Los tests del wrapper verifican los parámetros y señal Axios y conservan la forma de petición legacy sin opciones. Un test estructural comprueba que `DashboardPage` ya no posee `rollDice`, sus timers o su estado; los tests existentes de Dashboard y Grid cubren integración/no regresión de los demás slots.

Verificación local de esta implementación: `pnpm test` pasó **62 archivos / 397 tests**; `pnpm run typecheck` pasó; `pnpm run build` pasó. ESLint focalizado en el componente/tests nuevos pasó. El lint ampliado que incluye `DashboardPage.vue` y `services/discs/discs.ts` sigue notificando errores `no-explicit-any` y controles sin etiqueta/handlers de teclado preexistentes en esas zonas legacy; no se corrigieron ni suprimieron dentro de D-4b.2. `pnpm run cycles` informó el ciclo type-only existente entre Articles/Contents/Playlists, sin ciclo runtime nuevo; el gate `cycles:required` no pudo comparar porque faltan `FQ_QUALITY_BASE_SHA` y `FQ_QUALITY_HEAD_SHA`. `identity:boundaries` halló cero violaciones productivas y su modo `:required` no pudo comparar por la misma falta de referencias. El detector Impeccable devolvió `[]`. `git diff --check` se ejecutó al cierre.

**Smoke tests pendientes:** no se realizó una prueba visual manual en escritorio/móvil ni una sesión autenticada contra el backend integrado. La dificultad requiere el contrato backend D-4b.1 desplegado en el entorno usado; el frontend no tiene fallback automático si dicho contrato falla.

## Extracción de Community (comunidad)

**Estado:** extracción del widget `comunidad` completada el 2026-10-27. El bloque D-8 queda parcialmente pendiente por Últimos votos; no se inicia esa extracción.

`src/views/dashboard/components/DashboardCommunityWidget.vue` mantiene los enlaces estáticos de Comunidad y Top usuarios. Es dueño del estado de ranking de discos/portadas, año seleccionado, distribución y apertura de `StatsModal`. Usa el servicio Catalog existente `getTopRatedOrFeaturedAndStats` (`GET /discs/homeDiscs`) con intervalos anuales en `statsDateRange` y `distributionDateRange`, o sin esos filtros cuando se elige “Todos”. El manejo de errores continúa silencioso como antes. El widget se integra en el slot `comunidad` de `DashboardWidgetGrid`; el ID, tamaño half, orden 1 y preferencias no cambian. Deshabilitarlo desmonta el componente y evita que su petición se dispare; al reactivarlo, se vuelve a cargar al montar.

De `DashboardPage.vue` se retiraron la presentación inline de Community, sus estilos, estado, cálculos de columnas, helper del podio, selector de año y `fetchStats`/su disparo en el montaje. La página conserva su uso compartido de `getTopRatedOrFeaturedAndStats` para Top 3 semanal y mensual; no se modificaron esos widgets ni el registro/preferencias.

**Pruebas:** se añadieron pruebas focalizadas del contenido, enlaces, ranking, parámetros HTTP, selección de año, pestañas y modal, y del ciclo desactivado/activado con desmontaje y remontaje. `DashboardPage.test.ts` comprueba la composición del slot y que el padre ya no mantiene la lógica exclusiva. Pasaron 3 suites focalizadas: 14 tests.

**Verificación local:** `pnpm run typecheck`, `pnpm build`, ESLint focalizado del componente y su test, fixtures de ciclos/fronteras y `git diff --check` pasaron. El build mantiene avisos preexistentes de CSS minificado (`.flex-[2]`) y tamaño de chunk. ESLint de `DashboardPage.vue` sigue encontrando 12 usos `any` preexistentes en otras áreas de la página; no se alteraron. `pnpm run cycles` informó un ciclo type-only preexistente entre Articles/Contents/Playlists y comparación informativa por no resolver `HEAD`; `pnpm run identity:boundaries` encontró 0 violaciones productivas y su comparación también fue informativa por la referencia local ausente. El reporte de `pnpm run markdown:links` mantiene un fallo informativo ajeno al cambio: `roadmap/roles.md` enlaza a un archivo fuera del repositorio. Las comprobaciones requeridas con comparación base/head no se pudieron certificar en este checkout.

## Auditoría funcional y técnica posterior a la extracción de Community

**Estado:** auditoría completada el 2026-10-27. Solo lectura de frontend y backend y actualización de este roadmap; no se ejecutaron tests, build, consultas ni pruebas HTTP reales. Las propuestas siguientes no están implementadas.

### 1. Estado comprobado de la extracción

`DashboardCommunityWidget.vue` existe y contiene enlaces, ranking y estado/petición de Top usuarios. `DashboardPage.vue` lo usa en el slot `comunidad`; conserva la composición de los slots y `getTopRatedOrFeaturedAndStats` para Top 3 semanal/mensual, pero no mantiene estado ni efectos de Community. `DashboardWidgetGrid.vue` filtra los módulos con `enabled === false` y renderiza el slot únicamente para los visibles. El registro mantiene `comunidad`, `size: half` y `order: 1`; el widget no accede al store de preferencias ni guarda estado propio en él.

El test del componente cubre enlaces, ranking, parámetro anual, tabs, modal, petición apagada y montaje de nuevo al reactivar. `DashboardPage.test.ts` verifica la composición y que la página no tenga `fetchStats`/estado de ranking; `DashboardWidgetGrid.test.ts` cubre el filtro de módulos. El cierre de extracción registra 14 tests focalizados aprobados en tres suites; no se repitieron en esta auditoría. Esa prueba no detecta el `totalDiscs` ausente del modal: el stub del modal solo muestra `totalVotes`.

Al empezar la auditoría, los archivos del widget y sus tests seguían como untracked y `DashboardPage.vue`/este roadmap tenían modificaciones locales; el frontend conserva además otros cambios locales ajenos. El checkout backend `riffvalley-app-back` estaba limpio. Se preservó todo lo anterior; esta tarea solo añade documentación a `roadmap/dashboard.md`.

### 2. Funcionamiento frontend → HTTP → backend → presentación

| Presentación | Significado implementado | Fuente y actualización |
|---|---|---|
| Enlaces App, Web y Conciertos | Accesos estáticos a Telegram, web y agenda | No consultan servicios. Abren nueva pestaña con `rel="noopener noreferrer"`. |
| Top usuarios · Discos | Hasta 20 cuentas ordenadas por número de filas Rate con `rate IS NOT NULL` | Respuesta `topUsersByRates` de `GET /api/discs/homeDiscs`; año opcional filtrado por fecha de lanzamiento del disco. |
| Top usuarios · Portadas | Hasta 20 cuentas ordenadas por filas Rate con `cover IS NOT NULL` | Respuesta `topUsersByCover` del mismo endpoint y filtro anual por lanzamiento del disco. No cuenta personas únicas como métrica separada: agrupa una fila por usuario y muestra su cantidad de Rate. |
| Estadísticas detalladas | Total de votos musicales contados por el backend y gráfico de distribución de valores `rate` | Usa `totalVotes` y `ratingDistribution` del endpoint. La distribución también se filtra por fecha de lanzamiento del disco. |

Al montar, el componente elige el año actual; `getAvailableYears()` provee las opciones y añade “Todos”. Para un año manda el mismo intervalo a `statsDateRange` y `distributionDateRange`; “Todos” omite ambos. Cambiar el selector repite la petición. El orden de columnas, iconos de podio, pestaña activa y apertura del modal son estado local. La pestaña inicial es Discos. Al apagar y volver a activar el widget, se crea una instancia nueva: vuelve al año actual, pestaña Discos y modal cerrado, y consulta otra vez; no restaura selección de una sesión anterior.

El recorrido comprobado es `DashboardCommunityWidget.vue` → `getTopRatedOrFeaturedAndStats` en `src/services/discs/discs.ts` → Axios `GET /discs/homeDiscs` → `DiscsController.findTopRatedOrFeatured` autenticado → `DiscHomeService` y loaders de `src/catalog/discs/home/loaders/` → objeto `{ discs, totalDiscs, totalVotes, topUsersByRates, topUsersByCover, ratingDistribution }` → ranking y `StatsModal` (que reutiliza `RatingBarChart.vue`). El controlador pertenece a Catalog. La respuesta mezcla discos de catálogo y agregados de `Rate`; la llamada de Community no pide rango de discos ni usa `discs`.

`DiscHomeService` ejecuta seis consultas SQL por llamada: estadísticas globales y mediana para el ranking de discos, lista de discos ponderados, totales, top musical, top de portada y distribución. Community solo usa tres campos del resultado y aun así paga la consulta de discos y las agregaciones de Top que no presenta. Además, los slots Top 3 llaman al mismo endpoint por sus rangos. Es coste estructural comprobado en código; no se midió latencia o carga real.

El filtro llamado “año” no representa el año en que alguien emitió el voto: `buildHomeDateRange` compara `disc.releaseDate`. Por tanto, “Todos”/año agrupa votos actuales dados a discos publicados en todos/ese año. No describe votos emitidos durante ese período. El parámetro `dateRange` que usan otros consumidores de `homeDiscs` también filtra el lanzamiento del disco y no debe interpretarse como actividad semanal/mensual de votos.

El componente conserva una limitación de la extracción/integración visible en el estado actual: `stats` solo tiene `{ totalVotes }` y `fetchStats` no copia `response.totalDiscs`, pero `StatsModal` requiere y presenta `stats.totalDiscs`. El rótulo “Total de discos” aparece sin valor. El endpoint sí devuelve `totalDiscs`; la vista lo descarta. No se corrigió en esta auditoría.

### 3. Datos comunitarios existentes y sus límites

| Dato posible | Fuente/consulta existente | Reutilización y limitación de acceso o significado |
|---|---|---|
| Usuarios registrados totales | `UsersService.countUsers()`; también `GET /api/rates/stats` incluye `totalUsers` | Cuenta filas de `users`, sin filtrar `isActive`. La ruta de Rates requiere sesión normal pero ejecuta además estadísticas personales. `/api/auth/users/admin-stats` tiene el total paginado y serie `usersPerDay` desde `users.createdAt`, pero es solo superadmin. `createdAt` permite calcular altas; no hay endpoint público de altas recientes. |
| Cuentas habilitadas | `users.isActive` | Es un estado de cuenta, no participación. No aparece en `totalUsers` ni en la serie de altas. Definir si contar altas incluye cuentas desactivadas, borradas o bloqueadas antes de presentar una cifra. |
| Usuarios activos | `GET /api/activity/summary?period=7|30|90` (`activeUsers`) | Cuenta usuarios distintos por `user_app_daily_activity`. El registro actual viene de `POST /api/activity/app/daily`, que solo acepta sesión de cliente App. No mide todos los usuarios activos de la web ni significa “ha votado”. Summary y `/api/activity/users` son solo superadmin. El período corto aún puede ser `null` si la cobertura no es completa. |
| Altas recientes | `/api/auth/users/admin-stats` → `usersPerDay` | Agrupa `users.createdAt`; ruta superadmin. No usa el ledger Rates. Para el Dashboard común se necesita decidir autorización y privacidad; exponer usernames no es necesario para un agregado diario. |
| Nuevas valoraciones musicales | `rate_vote_events` (`set`) y `GET /api/activity/summary` → `newVotes` | `set` cuenta una transición desde ausencia de nota a nota numérica, no un disco distinto ni una persona distinta. `votingUsers` sí cuenta usuarios distintos con al menos un `set`. Summary es solo superadmin y expone cobertura, períodos actual/anterior y serie diaria. |
| Modificaciones de nota | `rate_vote_events` (`change`) | El ledger sabe distinguirlas, pero `GET /api/activity/summary` no incluye un agregado separado para cambios; `ActivityUserDetail` sí desglosa `changedVotes`. Cambios no deben sumarse a “nuevas valoraciones”. |
| Actividad/participación semanal y mensual | `/api/activity/summary` | Ofrece `activeUsers`, `newVotes`, `votingUsers`, `participationRate`, `votesPerActiveUser`, `returningUsers`, `retentionRate` y serie, con comparación equivalente anterior y cobertura. `period=30` es ventana móvil de 30 días, no mes natural. La participación actual divide usuarios con `set` por usuarios con actividad App; esa definición debe mostrarse y aprobarse antes de reutilizarla. Ruta solo superadmin. |
| Historial personal de Rates | `GET /api/rates/stats?year=...`, `GET /api/rates` y `/api/rates/user/:userId/history` | `rates/stats` y `rates` consultan información del usuario actual. El filtro `year` de Rates stats también filtra por `disc.releaseDate`; sus grupos `votesByMonth` usan `Rate.createdAt` y filas actuales, no el historial completo de eventos. El historial por `userId` sintetiza `createdAt`/`editedAt` desde la fila Rate actual y no es un feed global inmutable. |
| Top artistas/países del usuario | `GET /api/rates/home-insights` | Ya existe en Rates, pero su contrato es personal (`@GetUser()`), no una estadística de comunidad. No lo reutilizar para afirmar participación global. |
| Discos más votados | `GET /api/discs/homeDiscs` devuelve top discos con `voteCount` | La lista de hasta 20 se ordena por `weightedScore`, no por cantidad de votos; no es el ranking “más votados”. El conteo de discos sí se puede calcular desde `Rate`, pero hace falta decidir si se cuentan filas actuales/rateros distintos o eventos `set` de un intervalo y añadir consulta/contrato adecuado si se quiere otro orden. |
| Votos recientes de toda la comunidad | No se identificó un endpoint preparado para un feed global de eventos. | `GET /api/rates` lista Rates del usuario autenticado; el historial usa filas actuales, no un registro global de acciones. `rate_vote_events` sí contiene actor, fecha y (cuando fue capturado) disco, pero se consume en backend y no tiene endpoint comunitario de lectura. Exponer autores/notas requiere decisión funcional y de permisos. |

El endpoint analítico de Identity está restringido con `@Auth(ValidRoles.superadmin)`. No se debe reutilizarlo para todos los usuarios solo porque el DTO contenga agregados: hay que aprobar audiencia, campos y protección contra consultas que revelen actividad de grupos muy pequeños. Las rutas personales de Rates sí tienen autenticación normal, pero no sustituyen datos globales.

### 4. Semántica y cobertura de Rates

El modelo `Rate` es el estado actual editable de una fila por relación usuario/disco esperada por el servicio. Sus columnas `rate` y `cover` son independientes y pueden ser `null`. Los conteos de `homeDiscs` aplican `IS NOT NULL`: una nota `0` es válida y cuenta; `NULL` no cuenta. El ranking de portadas cuenta `cover` no nula aunque no haya nota musical. El SQL top usa `COUNT(r.id)`, no `COUNT(DISTINCT discId)`; presupone la invariante de una Rate por usuario/disco. El código de escritura serializa altas con advisory lock, pero el esquema observado tiene un índice no único y no se consultó la base para saber si existen filas históricas duplicadas. Esto es riesgo potencial, no duplicación confirmada.

`RatesService.recordVoteEvent` se llama dentro de la transacción al crear o actualizar. Una nota numérica desde `null`/ausente produce `set`, incluidos valores `0`; el paso entre dos notas numéricas distintas produce `change`. Repetir la misma nota, modificar solo portada, crear una fila solo con portada, borrar una Rate o pasar una nota existente a `null` no genera evento de voto nuevo/cambio. En consecuencia, Rate actual responde “qué valoración musical conserva ahora el usuario”; el ledger responde algunos cambios musicales observados. No son intercambiables.

`rate_vote_events` comenzó vacío en `rate_vote_event_capture.started_at` y no hay backfill desde `Rate.createdAt`/`editedAt`. Una migración posterior añadió `disc_id`/valores sin backfill; eventos de ese intervalo pueden quedar sin disco. El borrado del disco puede dejar `disc_id = NULL` (`ON DELETE SET NULL`) y borrar el usuario elimina sus eventos (`ON DELETE CASCADE`). Las estadísticas temporales usan `voteDataSince`/coverage y deben presentar `null` como historia no disponible, no como cero. `newVotes` del summary incluye `set` identificables como acción de actividad, pero no prueba primeros descubrimientos de vida ni recuento completo pre-ledger. Los eventos `change` sí son actividad de modificación, aunque no “voto nuevo”. Las métricas de Rates solo deben contar eventos musicales; no atribuirles actividad de portada.

### 5. Hallazgos

**Confirmados por código:**

- La estadística anual significa año de publicación del disco, no calendario de participación/voto.
- El modal muestra Total de discos vacío por falta de `totalDiscs` en el estado enviado, pese a que el endpoint lo devuelve.
- No hay estado de carga en Community. Un fallo de petición se captura en silencio; en la carga inicial queda “No hay datos” (igual que un ranking vacío), y al cambiar año se conserva la respuesta previa sin indicar error. No hay reintento visible.
- Cada montaje y cambio de año genera la solicitud; no hay refresco por reloj/ventana visible ni caché. Las respuestas no tienen cancelación ni protección contra llegar fuera de orden. Al apagar el slot el componente se desmonta, pero la petición ya iniciada no se aborta. No hay temporizadores ni otros efectos persistentes.
- La interfaz actual no permite ver actividad reciente global, cuentas activas o altas; su endpoint devuelve rankings sobre valores Rate actuales.
- Los botones de tabs no declaran `aria-pressed`/rol/selección. El `select` sí tiene `aria-label`; el modal reutilizado tiene `role=dialog`/`aria-modal`, pero no se verificó foco, Escape ni restauración.

**Riesgos que necesitan observación adicional:**

- El endpoint ejecuta seis consultas aunque Community solo consume tres campos y en `homeDiscs` comparte camino con los Top 3. No hay mediciones de tiempo/carga ni prueba HTTP real.
- En cambios rápidos de año, una respuesta anterior puede ganar la carrera. Debe cubrirse con prueba antes de modificar la actualización.
- Las filas de links usan etiqueta de ancho fijo y `overflow: hidden`; en un slot estrecho podrían recortarse. No se hizo smoke visual móvil/escritorio.
- Los empates en los dos rankings backend solo ordenan por cantidad, sin desempate estable.
- El conteo por filas presupone unicidad Rate usuario/disco; el código revisado no demuestra que haya duplicados reales.

**Mejoras opcionales:** añadir actividad agregada temporal con cobertura explícita; un feed de eventos musicales; ranking ordenado por votantes/discos; altas recientes agregadas; comparación semanal/mensual con etiquetas de períodos precisas. Antes, decidir audiencia, semánticas y privacidad. No añadir métricas de “descubrimiento”, “usuarios activos de comunidad” o “votos del mes” con esas etiquetas si solo se tienen estados Rate actuales o actividad App.

### 6. Alternativas funcionales

| Alternativa | Valor | Reutilización/cambios | Coste o límite |
|---|---|---|---|
| A. Mantener Top usuarios como núcleo | Conserva ranking histórico por disco publicado y requiere solo corregir la cifra vacía del modal y aclarar el filtro anual. | Sin endpoint nuevo; el endpoint actual puede seguir siendo temporalmente la fuente. | Continúa pagando consultas de discos/Top que Community no muestra; no informa participación del período. |
| B. Resumen de actividad musical | Mostrar “nuevas valoraciones” (`set`), usuarios que valoraron, cambios aparte si se desean, y evolución 7/30 días. | Backend ya agrega estos datos en `/activity/summary`, con cobertura, pero hoy solo para superadmin. Hace falta contrato/autorización apto para Dashboard; se puede reutilizar su SQL/semántica o separar un agregado protegido de Rates. | Actividad musical observada desde el inicio de ledger, sin backfill; 30 días móvil; no incluye votos de portada ni toda actividad web en el denominador App. |
| C. Feed de actividad comunitaria | Lista “votó”/“actualizó su nota” con fecha, disco y actor si se aprueba mostrar identidad. | `rate_vote_events` ya guarda eventos musicales recientes con disco opcional; requiere endpoint paginado y DTO que hidrata solo campos necesarios. | No existe feed global. Historial parcial, decisiones de privacidad, datos sin disco y sin cobertura de cover. |
| D. Discos más votados | Ranking por cantidad de personas que han valorado cada disco o por `set` en período. | Rate actual permite snapshot de personas/rates; endpoint existente devuelve solo top ponderado. Otra ordenación/consulta de Rates/Catalog requiere definición y contrato. | “Más votado” puede significar rateros actuales o eventos históricos; no mezclarlos. La segunda opción hereda cobertura del ledger. |
| E. Altas/usuarios | Número de cuentas creadas por semana y cuentas `isActive` como cifra separada. | Backend calcula `usersPerDay` y total en `/auth/users/admin-stats`; crear agregado con autorización normal si se aprueba. | Registro no significa participación; exponer crecimiento del conjunto requiere decisión de audiencia/privacidad. `isActive` tampoco equivale a actividad reciente. |

Prioridad recomendada por valor/certeza: primero corregir y explicar el dato actual; después un resumen musical agregado con cobertura; luego un feed si se quiere identidad y actividad social visible; por último altas o un segundo ranking si producto confirma que son útiles. El summary de Identity es reutilizable técnicamente pero su permiso de superadmin y su definición de actividad App impiden tratarlo como API pública ya disponible. Si Community solo necesita Rates, una operación agregada acotada bajo Rates mantiene ownership; si combina altas de Identity, presencia App y Rates, un único contrato de composición CrossDomain puede justificarse. No crear un servicio central para los widgets.

### 7. Plan propuesto, no iniciado

Los IDs `D-COM-*` son nuevos y no colisionan con los bloques D-1–D-11 ni D-B1/D-4b ya registrados. Son propuestas pendientes, no trabajo autorizado ni completado.

| Tarea propuesta | Alcance / dependencia | Tamaño |
|---|---|---|
| D-COM-1 — Decisiones de contenido | Resolver audiencia/roles; significado de “activo”; set frente a change; musical frente a portada; año de lanzamiento frente a fecha del voto; semana/mes naturales o ventanas móviles; si nombres/valores de votos son públicos; qué definición debe tener “más votados”. No tocar código. | XS |
| D-COM-2 — Cerrar contrato y estados actuales | Según esas decisiones, resolver `totalDiscs` del modal y el texto del período; estados loading/error/reintento; cambio rápido de año y cancelación al desmontar; accesibilidad de tabs. Componente y pruebas focalizadas; no exige backend salvo que se cambie la fecha de filtro. | S |
| D-COM-3 — Contrato backend de resumen comunitario | Si se aprueba la alternativa B/E, especificar DTO agregado con períodos, zona Europe/Madrid, definiciones, permisos y `coverage`; elegir reutilizar/derivar el SQL existente sin exponer `ActivityUsersResponse` ni datos por usuario. Tests Rates/Activity/CrossDomain para 0/null, set/change, ventanas y control de acceso. | M |
| D-COM-4 — Presentación del resumen | Consumir contrato acordado; mostrar nombres de métricas que reflejen su semántica, período/comparación, cobertura desconocida y vacío/error; probar solo montaje visible, reactivación y respuestas tardías. Sin mover el Dashboard de su ubicación actual. | S |
| D-COM-5 — Contrato de feed musical | Si se aprueba C, añadir lectura paginada del ledger con orden y límites; decidir exposición de usernames/valores; documentar cobertura y eventos sin disco. No llamar al historial sintetizado una fuente de eventos global. Tests del servicio/controlador/permisos. | M |
| D-COM-6 — UI de actividad y ranking opcional | Si se aprueban C/D, integrar feed y/o top con estados y límites; mantener separados los conteos de set, cambio, cover y Rate actual. Pruebas de comportamiento, permisos y orden. | M |
| D-COM-7 — Regresión y smoke | Solo tras completar las tareas elegidas: tests frontend/backend, typecheck/build/lint apropiado, gates arquitectónicos y verificación autenticada/red/escritorio/móvil del widget activo/desactivado. | XS |

### 8. Verificación de esta auditoría

Se revisaron los componentes, servicio frontend, registro, pruebas existentes, controladores/servicios SQL y entidades/migraciones locales del backend. No se ejecutó la suite existente, no se llamó al backend, no se consultó una base real y no se atribuyen cambios recientes de API/volumen que no puedan establecerse por código. `git diff --check -- roadmap/dashboard.md` pasó al cierre. En este checkout, el backend estaba limpio y el frontend ya tenía los cambios locales descritos en §1; el único archivo modificado por esta auditoría es `roadmap/dashboard.md`.

### 9. Seguimiento de la integración frontend (IDs del contrato backend)

#### D-COM.1 — Rankings de Community

**Estado frontend: completada en esta subtarea.** `DashboardCommunityWidget.vue` obtiene exclusivamente `GET /community/dashboard/rankings?year=YYYY` mediante el cliente Axios autenticado. El DTO usado es `{ year, topUsersByRates: [{ user: { id, username }, rateCount }], topUsersByCover: [{ user: { id, username }, totalCover }] }`, confirmado en `src/community/rates/stats/community-dashboard-rates.types.ts` del backend. La presentación adapta el envoltorio de las columnas localmente; no ordena ni recalcula los rankings. Se mantienen las dos pestañas, contadores, posiciones, trofeos, selector, enlaces externos e ID/preferencia `comunidad`. Los años 2025–2026 y 2027 se envían al backend sin cambiar su criterio.

El watcher cancela la petición anterior al cambiar de año y al desmontar el widget, descarta las respuestas canceladas y limpia los datos anteriores antes de cargar el año nuevo. Se distinguen carga, error con reintento, lista vacía y resultados. El servicio acepta `AbortSignal`. No se consulta `/community/dashboard/stats` ni `/discs/homeDiscs` desde Community; los otros consumidores de `homeDiscs` quedan fuera de este cambio. `DashboardPage.vue`, el registro y las preferencias no recuperan lógica de ranking.

**Límites encontrados:** el `StatsModal` presente muestra datos globales, no estadísticas individuales; requiere `totalDiscs`, `totalVotes` y distribución, campos ausentes del DTO de rankings. No existe un servicio frontend que entregue esos tres datos para el usuario seleccionado; `/rates/stats` corresponde a la sesión y no es equivalente. La ruta disponible para navegar con `userId` (`UserStatsUsers`) exige rol superadmin, por lo que no se añadió como enlace público a cada username. Se conserva la apertura/cierre de `StatsModal`, que comunica que sus datos se integrarán en la siguiente fase, sin ceros ficticios ni petición de estadísticas. La integración de detalle individual requiere aclarar/implementar una ruta y el contrato de destino.

#### D-COM.2 — Estadísticas del modal de Community

**Estado frontend: completada.** `DashboardCommunityWidget.vue` conserva ambos rankings, sus pestañas y selector de año, elimina el botón obsoleto «Estadísticas detalladas» y ofrece «Estadísticas» para abrir el nuevo `DashboardCommunityStatsModal.vue`. El diálogo presenta cuatro indicadores, distribución de valoraciones musicales, rachas actuales y género anual destacado; el componente `StatsModal.vue` no se modifica.

El cliente tipado en `src/services/community/dashboard.ts` consume Axios `GET /community/dashboard/stats?year=YYYY`, acepta `AbortSignal` y devuelve sin transformación el DTO verificado en el backend: `year`; `summary.ratedDiscs`, `releasedDiscs`, `participatingUsers`, `averageRating`; `ratingDistribution` con etiquetas, límites, inclusividad y conteo; `currentStreaks` (`user.id`, `user.username`, `days`); y `topGenres`, una lista ordenada de hasta cinco `{ id, name, ratedDiscs }`. El modal muestra la lista en el orden backend, con copa/medallas para los tres primeros y conteos de discos distintos valorados. La gráfica CSS conserva etiquetas y orden de backend, muestra los conteos y expone la lista ordenada como alternativa textual accesible; no se incorpora una dependencia de gráficos.

El modal consulta con TanStack Query solo mientras está abierto. La clave es `['community', 'dashboard-stats', year, userId, role, authSessionGeneration]`; `staleTime` es 60 s y `gcTime` 5 min. El botón precarga el año vigente al recibir hover o foco, omitiendo datos aún frescos; la consulta del modal comparte esa clave para reutilizar caché y deduplicar solicitudes. Cambiar el año con el modal cerrado no precarga; con el modal abierto cambia la clave y carga ese año sin conservar datos del anterior. El aislamiento global de caché privada existente se conserva al cerrar/cambiar sesión. Hay carga, error con reintento, sesión no disponible, promedio nulo, distribución/rachas vacías, género ausente y resultado válido sin datos; `averageRating: null` se presenta como «Sin datos».

El diálogo responsive reutiliza el patrón de overlays Teleport existente, ocupa hasta 68 rem en escritorio y adapta indicadores/secciones a móvil. Tiene foco inicial en cerrar, ciclo de foco por tabulación, Escape, cierre explícito y restauración del foco al botón de apertura.

**Pruebas y verificaciones D-COM.2:** las 3 suites focalizadas pasan (21 tests); suite frontend completa: 68 archivos y 443 tests pasan. `pnpm run typecheck`, `pnpm build`, ESLint focalizado y `git diff --check` pasan. `pnpm run cycles` informa el único ciclo type-only ya registrado entre `articles.ts`/`contents.ts`; Identity reporta 0 violaciones. Las comparaciones de ambos gates son informativas porque el trabajo incluye cambios locales previos y no hay `FQ_QUALITY_BASE_SHA`/`FQ_QUALITY_HEAD_SHA`; las variantes `:required` fallan sin esos SHA. Build mantiene los avisos registrados de `.flex-[2]` y chunks >500 kB. `pnpm run markdown:links` conserva un fallo previo fuera de la tarea: `roadmap/roles.md` enlaza `../../spammusic-back/roadmap/roles-frontend-contract.md`, fuera del repositorio. Los resultados locales no acreditan GitHub Actions.

**Limitación/pending smoke:** faltan comprobación de Network con sesión autenticada y smoke visual manual desktop/móvil; quedan para la regresión global D-COM.3. No se validó la disponibilidad del endpoint en una instancia frontend/backend integrada. La salida local no acredita GitHub Actions.

### Seguimiento D-6 — Extracción frontend de Novedades

**Estado de la extracción: completada.** Se reutiliza `src/views/homePage/components/NewsFeed.vue`, el componente que ya poseía feed, filtros, mapping, modal de noticia y navegación. El componente ahora también posee la tarjeta/cabecera que antes componía el slot `novedades` en `DashboardPage.vue`; el padre entrega directamente `<NewsFeed />` sin añadir wrapper. `DashboardWidgetGrid`, registro, ID `novedades`, tamaño, orden y preferencias no cambian.

Se mantienen `GET /news/feed` para la carga inicial y `GET /news/source-feed` para filtros mediante las funciones existentes de `src/services/news/news.ts`. Se añadieron argumentos opcionales `AbortSignal` al cliente existente (sin cambiar los paths, parámetros ni respuestas HTTP); el widget cancela la carga inicial y la carga filtrada al desmontarse, y cancela filtros obsoletos al restablecer/cambiar el filtro. El servicio permanece en `News`; no se mueve ni duplica.

**Verificación:** pruebas focalizadas de NewsFeed/servicio, DashboardPage, DashboardWidgetGrid y registro: 5 suites, 23 tests pasan. Se cubren orden, fuentes/enlaces, apertura del modal y navegación interna, filtros/restablecimiento, montaje condicional/reactivación, cancelación de peticiones pendientes e ID/tamaño/orden del registro. Suite completa: 70 archivos y 450 tests pasan. `pnpm run typecheck`, `pnpm build`, ESLint en las nuevas pruebas y `git diff --check` pasan. El ESLint focalizado sobre los componentes/servicio también reporta hallazgos preexistentes: `@click.self` y delegación de enlaces en `NewsFeed.vue`, helpers sin uso en ese componente, una interfaz vacía en `news.ts` y avisos `any` en `DashboardPage.vue`; no se modificaron por estar fuera de alcance. `pnpm run cycles` registra un ciclo type-only existente entre `articles.ts` y `contents.ts`; los gates de ciclos e Identity muestran comparación informativa al no poder resolver HEAD local, e Identity registra 0 violaciones. El build conserva el aviso de bundle mayor de 500 kB. Son verificaciones locales, no acreditan GitHub Actions; no se realizó smoke visual autenticado desktop/móvil.

**Verificación frontend de D-COM.1:** 30 pruebas focalizadas pasan; suite completa: 67 archivos y 434 tests pasan. `pnpm run typecheck`, `pnpm build`, ESLint focalizado en servicio/widget/pruebas y `git diff --check` pasan. `pnpm run cycles` informa una componente de ciclos type-only en `articles.ts`/`contents.ts`; la comparación es informativa porque no pudo resolver HEAD. El gate `cycles:required` y el delta Markdown requieren referencias base/head y no se pudieron completar con este checkout local modificado; el escaneo no obligatorio de límites Identity registra 0 violaciones y su comparación también es informativa. Al incluir `StatsModal.vue` en ESLint se mantienen dos hallazgos previos en el handler `@click.self` de la capa del diálogo; no se alteraron como parte de rankings. Build avisa de una regla CSS `.flex-[2]` y de chunks mayores de 500 kB; al no existir comparación base/head fiable, no se atribuyen a esta subtarea. Estos resultados son locales y no acreditan GitHub Actions.
## D-9a — Auditoría funcional y técnica de Cementerio

**Estado: auditoría documental completada; definición de producto, backend, extracción y pruebas de implementación siguen pendientes.** No se modificó código funcional ni se ejecutó la app, una suite de tests o una consulta real. Se leyeron el flujo frontend y las pruebas existentes, y el código fuente local de Catalog/Rates y sus tests; no se midió red, SQL ni tiempo de ejecución. La auditoría no aprueba una definición nueva de «disco abandonado».

### 1. Comportamiento y recorrido actual

El slot `#cementerio` se compone dentro de `DashboardWidgetGrid` con ID estable `cementerio`, tamaño `half` y activado por defecto. El grid solo renderiza el slot cuando el módulo está habilitado para el viewport. La carga no pertenece al slot: `DashboardPage.vue` llama `fetchCemeteryDiscs()` incondicionalmente desde `onMounted`, incluso con el widget desactivado.

Al montar la página, la función pide `GET /api/discs?limit=1&offset=0`, ignora el disco de la respuesta y usa `totalItems` (o 1000 si es falsy). Después hace, secuencialmente y hasta cinco veces, `GET /api/discs?limit=20&offset=N`, con `N = floor(random × max(total − 20, 1))`. De cada lote aplana respuestas agrupadas si las hubiera y retiene los primeros dos discos únicos cuyo `voteCount` sea falsy o 0. Cada lote viene en el orden por defecto backend `releaseDate DESC, artist.name ASC`; se eligen ventanas aleatorias de ese orden, no discos con `ORDER BY RANDOM()`.

«Otros olvidados» repite el muestreo; `cemeteryTotal` conserva el total en la página. Si encuentra candidatos, reemplaza la lista; si no, deja los resultados previos. No acumula resultados ni hay botón para recuperar el sorteo anterior. La selección puede cambiar entre visitas y sorteos, pero no garantiza uniformidad ni evita repetir discos.

`DashboardPage.vue` conserva `cemeteryDiscs`, `cemeteryLoading`, `cemeteryRolling`, `cemeteryTotal` y `fetchCemeteryDiscs`. `DiscCardComponent.vue` muestra portada (o imagen de respaldo), título, artista, fecha de publicación, género/color, país del artista, EP/debut, enlace de escucha, medias musicales y de portada, contador de notas musicales y comentarios, y voto/favorito/pendiente del usuario autenticado. No muestra fecha de incorporación ni fecha de valoración.

La tarjeta abre modales de disco/artista, reproductor y enlace externo, lista de votos y comentarios; permite votar/editar nota y portada, añadir/quitar favorito y pendiente, y copiar una imagen para compartir. Al abrir votos usa `GET /rates/disc/:discId`; comentarios usan `GET /comments/disc/:discId`. Las mutaciones las ejecuta DiscCard con `POST /rates` o `PATCH /rates/:id`, `POST/DELETE /favorites` y `POST/DELETE /pendings`. El enlace de plataforma es externo. No hay callback a Dashboard para retirar un disco que acaba de ser valorado.

### 2. Definición real de candidato

El cliente es `getDiscs()` en `src/services/discs/discs.ts`; la ruta backend `GET /api/discs` está protegida por `@Auth()` en Catalog. `DiscCatalogService.findAll()` aplica `disc.releaseDate <= today`, cuenta como `voteCount` las filas de `rate` con `rate.rate IS NOT NULL` y `mapCatalogDisc()` convierte ese agregado a número. Cementerio no envía filtros `voted`, género, fecha, país ni usuario.

| Criterio | Efecto actual |
|---|---|
| Fecha de publicación | Sí: discos futuros y fechas nulas quedan excluidos por `releaseDate <= today`; la fecha también ordena el listado. |
| Fecha de alta al catálogo | No se consulta para elegibilidad ni orden. |
| Última valoración/último evento de Rates | No se consultan `createdAt`, `editedAt` ni `RateVoteEvent`. |
| Número de votos | Cero notas musicales de toda la comunidad, no cero filas de Rates. |
| Solo voto de portada | No incrementa `voteCount`; el disco puede aparecer. |
| `rate = 0` | Si está persistido, cuenta como no nulo y excluye; el submit actual normaliza cero a `null`, pero el criterio SQL no usa `> 0`. |
| Géneros y usuarios | No hay filtros personales ni por género; se muestran datos del género y del usuario autenticado en la tarjeta. |
| Aleatoriedad | Offset aleatorio sobre listado ordenado por fecha desc./artista asc.; no selección aleatoria directa uniforme. |

Así, «solo discos sin votos» no coincide si portada cuenta como voto. Tampoco equivale a discos «abandonados» o inactivos: un lanzamiento antiguo y uno reciente ya publicado son elegibles con tal de que no tengan nota musical comunitaria.

### 3. Cobertura del catálogo: problema confirmado

La función obtiene páginas amplias sin filtro y aplica `voteCount` en el navegador. Examina como máximo cinco ventanas de 20 filas (100 como techo y menos si se solapan), por lo que candidatos fuera de esas ventanas se descartan implícitamente. Puede mostrar vacío aunque existan candidatos.

**Caso reproducible estático:** con 1000 discos publicados en el orden devuelto por Catalog, supóngase que los primeros 999 tienen nota musical y el último no. `max(total - BATCH, 1)` da 980 y `Math.random() < 1`, así que el offset máximo es 979. Un lote de 20 termina en el índice 998; el único candidato del índice 999 nunca se solicita. Los cinco intentos muestran el empty aunque hay un candidato. La causa se demuestra por el rango de offsets y el orden SQL; no se ejecutó el fixture en una base real. Aunque se corrigiera ese borde, cinco ventanas aleatorias no garantizan cobertura de candidatos dispersos.

Alternativas para seleccionar en PostgreSQL:

- Una operación explícita de Catalog (p. ej. `GET /discs/cemetery?limit=2`) filtra por fecha y elegibilidad en SQL, elige los IDs antes de hidratar y devuelve solo los discos seleccionados. `ORDER BY RANDOM() LIMIT 2` es opción inicial que debe medirse con datos representativos y `EXPLAIN ANALYZE` antes de optimizar.
- El filtro existente `voted=false` no sirve sin cambio semántico: filtra ausencia de nota propia del usuario autenticado, no ausencia de notas musicales comunitarias. Añadir un modo explícito solo si se necesita conservar ambos significados.
- Rates debe ser dueño de qué Rate cuenta como nota musical; Catalog debe ser dueño del conjunto de discos y de la selección. El backend ya tiene dirección de dependencia Catalog → Rates (`DiscModule` importa `RatesModule` para selección aleatoria). No añadir Rates → Catalog ni copiar reglas de Rates en Catalog.

### 4. Datos, servicios y ownership

La tarjeta necesita ID; título/imagen/fecha de publicación/EP/debut; artista, país y género; enlace; medias de nota/portada; conteo de notas musicales y comentarios; `userRate` con ID/nota/portada; y los IDs de favorito y pendiente del usuario actual. Detalle, votos individuales y comentarios se cargan al abrir sus modales, no forman parte de la selección inicial. El usuarioId proviene de la sesión; el filtro comunitario no se limita a sus valoraciones.

`findAll()` entrega un `Disc` enriquecido más campos de entidad/relación no usados por la tarjeta (por ejemplo, descripciones y metadata adicional), medias/counts y relaciones personales. La carga incluye Rate del usuario actual, favoritos y pendientes. El payload es más amplio que las props necesarias; no hay respuesta insuficiente conocida para renderizar DiscCard.

Ownership futuro: Identity autentica/provee sesión; Catalog posee candidatos, fechas, metadatos e hidratación; Rates posee semántica/agregados y mutaciones de valoración; Favorites/Pendings/Comments conservan sus servicios; Dashboard compone estado/UI y DiscCard sus acciones reutilizables. No duplicar lógica de Rates ni añadir dependencia circular.

### 5. Estados, interacciones y casos límite

| Caso | Evidencia y efecto |
|---|---|
| Catálogo vacío | Código: `totalItems || 1000` conduce a hasta cinco lotes vacíos; luego se muestra «no quedan». |
| Candidato fuera de páginas consultadas | Defecto confirmado; ejemplo de 1000 discos arriba. |
| Sin portada | Disc permite `image` nula; DiscCard usa imagen de respaldo. No se excluye por portada ausente. |
| Sin nota musical / usuario sin historial | Elegible; `userRate` personal nulo y formulario se presenta como nuevo. |
| Voto solo de portada | Elegible; puede tener media de portada pese a `voteCount = 0`. |
| `rate = 0` | SQL lo cuenta si no es nulo. Submit actual lo cambia a `null`. |
| Rates duplicados | Riesgo no demostrado en datos: `COUNT(rate.id)` no usa `DISTINCT`, por lo que el agregado puede inflarse; para el booleano del Cementerio, cualquier nota excluye. Si hay varias Rates personales, el mapper toma la primera relación. |
| Fecha futura o nula | Excluida por Catalog. |
| Cambio de sesión en la misma página | Riesgo: la lista y sus datos personales no se vuelven a cargar/limpiar. No se probó el ciclo real de sesión montada. |
| Error HTTP | `catch` silencioso y `finally` apaga carga; se confunde con catálogo agotado. El botón permite reintentar manualmente. |
| Votar un candidato | Disc persiste y actualiza su estado/media local, pero el padre conserva esa tarjeta y no refresca selección. |
| Widget desactivado durante petición | El grid oculta el slot, pero el padre inició la petición y no la cancela; `getDiscs` admite `AbortSignal` pero esta llamada no lo pasa. |
| Respuestas tardías | `cemeteryRolling` evita sorteo simultáneo; no hay abort ni guarda de sesión. Una respuesta puede actualizar el estado tras cambiar preferencias/sesión. |

No hay pruebas específicas del algoritmo/criterio de Cementerio. `DashboardPage.test.ts` y `src/services/discs/discs.test.ts` cubren otras conductas/forma genérica de servicios; los tests de Catalog cubren el listado y otros selectores, no la cobertura del Cementerio. No se ejecutaron pruebas.

### 6. Rendimiento estático

El montaje produce una petición HTTP inicial y hasta cinco lotes secuenciales: máximo seis llamadas desde Cementerio. La primera recibe un Disc completo que se descarta. `DiscCatalogService.findAll()` obtiene página hidratada y también ejecuta `getCount()` para `totalItems`; estáticamente son hasta 12 consultas de lectura de alto nivel (página + conteo por llamada), no una medición real de statements ni latencia. Se pueden transferir hasta unos 101 Disc enriquecidos (1 inicial + 5 × 20), aunque solo se presentan dos. Las consultas incorporan agregados de promedio musical, promedio de portada, count de notas y comentarios; la relación personal trae Rate/favoritos/pendientes.

El trabajo repetido de página, agregados, conteo y transferencia es redundante para el widget. No se identificó una petición de otro widget que duplique exactamente esta selección. No se midió volumen/tiempo ni se leyó un plan SQL real; no hay evidencia para índices o caché. `getDiscs()` acepta señal de cancelación, pero Cementerio no la usa.

### 7. Mejoras funcionales candidatas (ninguna aprobada)

| ID | Limitación/evidencia | Comportamiento a considerar | Backend/frontend | Tamaño |
|---|---|---|---|---|
| CEM-1 | Copy «sin votos» es impreciso con votos solo de portada; error también aparece como empty. | Nombrar «sin valoración musical» si se conserva la regla y separar error de vacío. | Solo front. | XS |
| CEM-2 | Muestreo 5 × 20 pierde candidatos fuera de ventanas. | Seleccionar hasta 2 candidatos válidos directamente en PostgreSQL y luego hidratar solo esos discos. | Catalog aporta selección/DTO; Rates aporta criterio sin duplicación; front consume operación. | M |
| CEM-3 | Al valorar una tarjeta, sigue siendo visible aunque ya no cumpla el criterio. | Tras voto musical exitoso, retirar y opcionalmente reemplazar; un voto solo de portada no debería excluirla bajo la regla actual. | Front y coordinación con respuesta de mutación de Rates. | S–M |
| CEM-4 | No hay fecha de actividad en la regla y el muestreo favorece cobertura aleatoria, no antigüedad. | Alternativa: recuperar discos sin nota musical durante un periodo acordado. Definir duración, eventos contados y tratamiento de datos anteriores al ledger. | Rates calcula actividad; Catalog filtra/selecciona; front explica criterio/fecha. | M |
| CEM-5 | Fetch no depende de activación y no cancela al ocultarse. | Tras extracción, pedir solo con slot activo; cancelar al desmontar/cambiar sesión. | Front; usar `AbortSignal` existente si contrato actual se conserva. | S |

No proponer índices sin `EXPLAIN ANALYZE` sobre datos representativos. `ORDER BY RANDOM()` también requiere medición si el catálogo crece.

### 8. Decisiones funcionales pendientes

1. ¿Cementerio significa cero notas musicales comunitarias, cero Rate de cualquier tipo o ausencia de nota musical reciente? No se adopta ninguna definición nueva en esta auditoría.
2. Si se escoge inactividad: ¿qué periodo, y cuentan tanto creación como cambio de nota musical? ¿Cómo tratar Rates anteriores al registro de eventos?
3. ¿Se excluyen fechas futuras/nulas como hoy? ¿Hace falta filtrar por género o historial personal?
4. ¿Se mantiene el máximo de dos, se permite resultado parcial y se admite repetición entre visitas/sorteos?
5. ¿Se actualiza la lista tras voto musical, cambio de sesión y reactivación? ¿Portada sola mantiene el disco?
6. ¿Se acuerda una operación/contrato de Catalog separado del filtro personal `voted=false` de `/discs`?

### 9. Extracción y plan de implementación

El widget debería poseer su resultado/lista, loading/rolling, petición, shuffle, error/vacío, cancelación y guarda de sesión. El padre hoy conserva esos refs y `fetchCemeteryDiscs`; no hay callback de voto de vuelta al padre. Futuro mínimo: `DashboardPage.vue` compone `<DashboardCemeteryWidget />` en el slot; el widget consume el cliente de Catalog y reutiliza `DiscCard`. Rates y las operaciones personales permanecen en sus owners. No mover Dashboard a `src/modules/dashboard`.

Un `DashboardCemeteryWidget.vue` es suficiente inicialmente: una petición y estado de una feature. No crear composable hasta que la selección/cancelación/consistencia se reutilice o crezca lo bastante para justificar una frontera de prueba independiente. Mantener ID/tamaño/preferencias; no añadir props/eventos salvo que una decisión funcional requiera control del padre o notificación de mutación.

Las siguientes subtareas desglosan el D-9 existente, que sigue pendiente. No equivalen a aprobación para implementar:

| ID | Tarea | Criterio/dependencia | Tamaño | Estado |
|---|---|---|---|---|
| D-9a | Auditoría funcional/técnica de Cementerio | Funcionamiento, SQL, cobertura, contratos, riesgos, decisiones y extracción documentados; solo docs y `git diff --check -- roadmap/dashboard.md`. | XS | **Completada** |
| D-9b | Acordar definición, fechas, repetición, cantidad y contrato | La solicitud D-9d fija cero notas musicales comunitarias, cutoff de Catalog, hasta 2, selección `/discs/random` y alcance de repetición de una sola respuesta. No se adopta inactividad temporal. | XS | **Completada para D-9d** |
| D-9c | Selección backend Catalog/Rates, solo si el contrato lo necesita | El endpoint y selección SQL ya existen; el cliente consume `/discs/random`. No se modifica backend en D-9d; `previousDiscId` no se aplica al modo comunitario. | M | No requerido para D-9d; limitación registrada |
| D-9d | Extraer `DashboardCemeteryWidget.vue` | Mantiene ID/DiscCard; estado, petición, error/empty, voto, cancelación y sesión dentro del widget; no se extrae composable ni se cambia backend. | M | **Completada** |
| D-9e | Pruebas focalizadas y smoke | Semántica elegida, cover-only/0/fechas/duplicados, error/empty/retry, mutación, sesión, ocultación y respuestas tardías; smoke autenticado desktop/móvil. | S | Pendiente |

Secuencia: D-9b y D-9d completadas para el contrato aceptado; D-9c no requerido porque el backend ya expone la selección; D-9e sigue pendiente. No se inició D-9e.

### Seguimiento D-9d — Extracción frontend de Cementerio

**Estado: completada.** `DashboardPage.vue` conserva el slot `cementerio` y solo monta `<DashboardCemeteryWidget />`. Se retiraron de la página `getDiscs`, el total/fallback, offsets aleatorios, lotes de 20, filtrado local, cinco reintentos, refs y callback exclusivos de Cementerio. Registro, ID, tamaño, orden y preferencias no cambiaron.

`DashboardCemeteryWidget.vue` carga al montarse con el cliente existente `getRandomDiscs({ unratedByCommunity: true, limit: 2 }, { signal })`. `src/services/discs/discs.ts` tipa el parámetro de selección comunitaria y `Disc.userRate`; los otros modos de Disco aleatorio y `getDiscs` se conservan. La respuesta se trata como `Disc[]`, se valida el ID antes de renderizar acciones, y se normalizan los valores personales a número. No se envía `voted=false` ni se modificó backend.

El botón «Otros olvidados» realiza una petición por pulsación, queda deshabilitado durante la carga y conserva las tarjetas actuales si hay error. Un array vacío legítimo muestra «No quedan discos sin valoraciones musicales en el catálogo»; un error HTTP o respuesta no utilizable aparece como error con reintento. Una respuesta de un disco muestra una tarjeta sin duplicarla. `DiscCardComponent.vue` emite `rating-saved` únicamente tras guardar: informa acción `created/updated`, cambio de nota musical, presencia de nota y cambio de portada. Cementerio retira el disco solo si una nota musical válida cambió, mantiene la otra tarjeta e intenta rellenar mediante una sola llamada; portada sola y fallos al guardar no emiten un evento de retirada. Favoritos, pendientes y comentarios no disparan selección.

La selección devuelve hasta dos discos. Catalog admite `previousDiscId` en su DTO, pero su implementación solo lo aplica cuando hay `difficulty`; el modo `unratedByCommunity` lo ignora. El widget no manda ese parámetro ni guarda historial: si la única respuesta de una tirada contiene alternativas al par anterior, las prefiere; si repite el par completo, acepta la repetición sin pedir otra página. Evitar de forma garantizada ambas repeticiones requeriría una extensión backend futura. No se modificó backend.

El estado y peticiones quedan en el ciclo de vida del widget montado por el grid. Al desactivar el slot, se desmonta, aborta la petición y limpia las tarjetas; la generación de sesión y el usuario autenticado forman parte de la clave de carga, y una respuesta vieja se descarta. Reactivar vuelve a cargar. No se añadió store, Query ni composable.

**Pruebas y verificaciones D-9d:** pruebas focalizadas de Cementerio, servicio Catalog, `DashboardPage` y eventos reales de `DiscCard`: 4 suites, 32 tests pasan. Suite completa: 72 archivos, 466 tests pasan. `pnpm run typecheck` y `pnpm build` pasan. ESLint pasa sobre los componentes y pruebas nuevos; el lint focalizado sobre `DiscCardComponent.vue`, `discs.ts` y `DashboardPage.vue` informa 33 hallazgos legacy en accesibilidad, keys duplicadas y `any`. Esos archivos ya tenían cambios locales al iniciar D-9d y no hay comparación base/head fiable; por tanto, no se atribuyen ni se corrigen aquí. El ciclo de `pnpm run cycles` es type-only entre `articles.ts`/`contents.ts`; la comparación es informativa por falta de HEAD local. `pnpm run identity:boundaries` registra 0 violaciones y comparación informativa. Build informa de `.flex-[2]`, chunks mayores de 500 kB y datos Browserslist antiguos; no se atribuyen sin comparación base/head fiable. Son resultados locales y no acreditan GitHub Actions.

**Pendiente D-9e:** smoke con sesión real en desktop/móvil, comprobar disponibilidad integrada del endpoint, controles visuales, actualización del usuario tras valoración y comportamiento observado de repetición. D-9e permanece pendiente y no se inició en esta tarea.

**Verificación documental D-9d:** `git diff --check` solicitado para los archivos cambiados; backend, registro, preferencias y otros widgets no se modificaron como parte de D-9d. Se conservaron los cambios locales previos del checkout.

## D-10a — Auditoría funcional y técnica de Elige tu propia aventura

**Estado:** auditoría documental completada el 2026-10-27. No se modificó código funcional, servicios, contratos HTTP ni backend. D-10, la migración/extracción frontend de Portada y el cierre general D-11 siguen pendientes según sus propios alcances; esta auditoría no los marca como implementados.

**Fuentes:** `roadmap/dashboard.md` (D-0/D-3, D-4b y seguimiento posterior), `DashboardPage.vue`, `DashboardWidgetGrid.vue`, `dashboardWidgetRegistry.ts`, `AdventureModule.vue`, `services/discs/discs.ts`, `DiscCardComponent.vue` y los servicios de Rates/Favorites/Pendings. Para contrastar la semántica backend se leyó el checkout local `~/workspaces/spam-music/spammusic-back-cron`, en `discs.controller.ts`, `discs.service.ts` y los DTOs random/options. No se ejecutó la app, no se enviaron peticiones ni se midió red, tiempo, volumen real o plan SQL. No se localizaron pruebas de `AdventureModule`.

### 1. Experiencia y recorrido observados

El widget ayuda a descubrir un disco guiando al usuario por preferencias de catálogo. No construye una historia con ramas narrativas persistentes: la ambientación (“oráculo”, “destino”) acompaña una selección aleatoria de filtros y un disco final.

1. Al mostrar el slot, la vista inicial presenta el texto introductorio y «Comenzar la aventura». No se llama a Catalog todavía.
2. Al comenzar, se eligen aleatoriamente entre dos y cinco categorías distintas de una lista de cinco: género, país, año, formato EP/álbum y debut/banda consagrada. Se limpian las respuestas de la ejecución anterior.
3. Se consulta secuencialmente una pregunta por categoría. Las opciones se obtienen con los filtros elegidos antes de esa pregunta. Género, país y año muestran hasta tres valores; EP y debut, hasta dos valores booleanos traducidos a etiquetas. Se elige al azar una frase ambiental de la categoría.
4. Cada elección se guarda en memoria local y define el filtro de esa categoría. El componente pasa a carga y solicita la siguiente pregunta; la persona no puede volver a una decisión anterior ni cambiarla.
5. Si termina la lista de preguntas, se solicita un disco aleatorio con los filtros elegidos y `limit=1`. La respuesta se adapta para normalizar el país de artista y convertir `userRate.rate/cover` numéricos; se muestra la primera DiscCard.
6. En el resultado se ofrece «Vivir otra aventura». Si no llega ningún disco, aparece un mensaje de combinación sin resultados y «Reintentar», que en realidad reinicia desde la introducción y vuelve a sortear categorías.

Las fases locales son `intro`, `question`, `loading`, `result` y `empty`. Las opciones, frases, orden de categorías y disco usan `Math.random()` en cliente; la selección final también es aleatoria en Catalog (`ORDER BY RANDOM()`). No se guarda historial, progreso, respuestas ni resultado en Dashboard, Pinia, localStorage o backend. Recargar, abandonar la página o desactivar el widget pierde el progreso; al volver a montar empieza en introducción. No hay reanudación entre visitas ni anticoincidencia: el mismo disco puede salir en aventuras consecutivas.

La rama de opciones vacías elimina esa categoría y carga la siguiente en el mismo índice. Si todas las categorías seleccionadas se eliminan, el código continúa a la selección final sin filtros; por tanto, se puede completar con menos de dos preguntas o incluso ninguna si el backend devolviera vacío en todas. El contrato backend pretende ofrecer valores con candidatos, así que esto es principalmente un fallback ante respuesta vacía/datos cambiantes y no la experiencia normal garantizada por código cliente.

### 2. Ownership y aislamiento

`DashboardPage.vue` hoy solo compone el chrome del slot de aventura: tarjeta, icono, título y `<AdventureModule />`. El slot está dentro de `DashboardWidgetGrid`; este filtra por `enabled`, registro y slot existente. La preferencia activa de desktop o móvil determina qué módulos llegan al grid. `AdventureModule` se monta solo cuando está activo y se desmonta al desactivarlo. El registry lo define como `half`, activo por defecto y orden 10.

`AdventureModule.vue` posee la UI y el ciclo de vida completo: fase, orden aleatorio, índice, respuestas, pregunta, resultado, llamadas a Catalog, filtros y reinicio. No hay lógica propia de aventura en el estado, `setup`, hooks o peticiones del `DashboardPage` actual. El padre conserva otras cargas generales/de otros widgets; no se atribuyen a aventura. `DashboardWidgetGrid` solo compone y muestra slots y tampoco conoce reglas de Catalog.

Los servicios `getDiscOptions` y `getRandomDiscs`, tipos de catálogo y selección pertenecen a Catalog. Rates es dueño de las valoraciones que se incluyen en la tarjeta; Favorites y Pendings de sus acciones. `DiscCardComponent` es presentación/acciones compartidas: al consultar votos abre `GET /rates/disc/:discId`; al consultar comentarios usa el servicio de comentarios; votar/editar usa `POST /rates` o `PATCH /rates/:id`; favorito y pendiente usan `POST/DELETE /favorites` y `POST/DELETE /pendings`. Estas llamadas son interacciones posteriores y opcionales, no peticiones necesarias para elegir la aventura. La tarjeta también contiene otras acciones compartidas de detalle/reproductor que no intervienen en la selección.

**Conclusión de frontera:** está suficientemente aislado para el estado actual. Se reutiliza directamente `AdventureModule.vue`; no hace falta wrapper, store, Query ni un composable adicional. Mantenerlo en la ubicación vigente dentro de Dashboard es compatible con la futura composición fina de `DashboardPage`. Solo valorar un composable si la máquina de pasos crece, su lógica se reutiliza o una prueba aislada resulta difícil sin extraerla.

### 3. Peticiones y contratos

Los paths son relativos al cliente Axios (`/api` se añade por `baseURL`). Todos los endpoints de selección requieren sesión autenticada en el backend leído; no se aporta `userId` como filtro.

| Petición | Parámetros enviados | Respuesta usada y finalidad | Momento / frecuencia por recorrido |
|---|---|---|---|
| `GET /discs/options` | `field`, `limit`; filtros previos `country`, `genre`, `year`, `ep`, `debut` cuando estén definidos | País `{id,name,isoCode}`, género `{id,name,color}`, años numéricos o booleanos. Sirve valores distintos existentes bajo los filtros ya elegidos. El código usa id de país/género y convierte año a número al formar filtros. | Una llamada secuencial por categoría que el frontend intente cargar; 2–5 normalmente, 0–5 según el orden aleatorio y respuestas vacías.
| `GET /discs/random` | Filtros finales; `countryId` para país; `limit=1` | `Disc[]` enriquecido; se presenta solo el primer elemento y se usa userRate/campos de tarjeta. | Una llamada al finalizar preguntas, incluso si se eliminaron todas por respuesta vacía.
| `GET /rates/disc/:discId` | ID del resultado | Votos individuales para `VotesModal`. | Solo al abrir votos en DiscCard.
| endpoint de comentarios del servicio (`GET /comments/disc/:discId`) | ID del resultado | Comentarios del disco. | Solo al abrir comentarios en DiscCard.
| `POST/PATCH /rates` | `discId`, nota musical y/o portada editadas | Resultado de guardar Rate; el flujo compartido administra voto. | Solo si la persona vota o modifica el resultado.
| `POST/DELETE /favorites`, `POST/DELETE /pendings` | ID del disco / relación personal | Crea o elimina favorito o pendiente. | Solo por acción explícita en DiscCard.

En `OptionsQueryDto`, `field` admite `country|genre|year|ep|debut`, `limit` positivo hasta 10 (default 3), y filtros previos del mismo conjunto. El query backend filtra `releaseDate <= today`, no aplica el filtro del campo que está pidiendo, agrupa valores distintos y toma opciones con `RANDOM()`. País y género sin relación y fechas sin valor no ofrecen opción. Esto implementa las opciones existentes del catálogo, no preferencias de historial personal.

`RandomQueryDto` admite `genre`, `country`/`countryId`, `year`, `ep`, `debut` y `limit` (default 5, máximo 50); el widget manda solo los elegidos y `limit=1`. Catalog también filtra `releaseDate <= today`, selecciona IDs con `ORDER BY RANDOM()`, después hidrata el disco con datos de artista/país/género, Rate personal, favorite/pending, medias y counts, preservando el orden sorteado. La consulta no filtra discos ya valorados, historial personal, Rate comunitaria, repetición, géneros favoritos ni periodo distinto a la fecha actual.

El conteo estático para una aventura completa es **3–6 solicitudes HTTP de selección**: dos a cinco de opciones más una final. Aunque las opciones estén vacías, se hace una llamada por cada categoría inicialmente seleccionada antes de llegar al resultado. En el código backend local leído, una llamada `/discs/options` equivale a una consulta de opciones; `/discs/random` ejecuta selección de IDs y una segunda hidratación. Estimación estática máxima: **hasta 7 operaciones SQL de alto nivel** (cinco opciones y dos de random). No es una medición de statements efectivos ni una prueba del servicio desplegado; subconsultas agregadas de hidratación van dentro de su consulta principal. DiscCard puede sumar peticiones según interacciones/modales. No se solicita historial personal, contadores de catálogo ni datos de Rates al iniciar la aventura.

No hay filtro extenso en frontend: el browser guarda hasta cinco selecciones y adapta los resultados recibidos. La reducción de candidatos se efectúa en backend para cada paso. La aleatoriedad por pregunta puede devolver valores repetidos en aventuras distintas; dentro de una pregunta las opciones agrupadas son valores distintos. El endpoint random no recibe una lista de candidatos ni selecciona desde muestras limitadas de páginas de catálogo: sortea sobre todos los discos que cumplen sus filtros y fecha. El resultado puede haber sido votado por el usuario, en línea con que no se aplica regla de “no votado”.

### 4. Reglas funcionales: implementadas y no implícitas

| Área | Regla respaldada por código |
|---|---|
| Categorías | Muestra una selección aleatoria sin repetición de 2 a 5 entre género, país, año, EP y debut. La cantidad no representa una opción de dificultad elegida por usuario.
| Género/país | Se envían IDs de Catalog; país usa `countryId` en random. No hay filtrado por país/género favorito ni por historial.
| Años/fechas | Año se deriva de `releaseDate`; Catalog excluye discos posteriores a hoy en opciones y resultado. No se solicita calendario futuro; no hay decisión de zona horaria documentada por el widget.
| EP/debut | Boolean `true/false` cuando Catalog devuelve datos. Las etiquetas son «Un EP»/«Un álbum» y «Un debut»/«Una banda ya consagrada». El widget no inventa valores si la API solo encuentra uno.
| Artistas | No hay pregunta de artista ni filtros de artista.
| Valoraciones e historial | No se filtra por tasa personal/comunitaria, votos previos, favoritos o pendientes. El resultado puede estar ya puntuado y DiscCard lo representa desde `userRate`.
| Repetición | No hay `previousDiscId` ni historial de resultados; pueden repetirse opciones y discos en aventuras nuevas.
| Sin candidatos | Opciones vacías eliminan la categoría y siguen; resultado vacío/error llevan al mismo `empty` y reinicio.
| Orden/retroceso | No hay navegación hacia atrás, edición de respuestas ni resumen de filtros antes de sortear.

No se debe inferir de las frases narrativas que las opciones representen “descubrir algo nuevo”, que las valoraciones sean menores, que el resultado no haya sido oído/votado, o que las preguntas siempre sean cinco. El producto actual es una búsqueda aleatoria guiada por metadatos.

### 5. Interacciones, accesibilidad y límites

- Los botones de inicio, opciones y reinicio son controles HTML nativos con texto visible, por lo que admiten activación de teclado. Sin embargo, las clases `outline-none focus:outline-none` eliminan el indicador de foco visible en los tres tipos de botón; hallazgo de accesibilidad confirmado en el markup.
- No hay control para volver a una pregunta, cambiar la respuesta, cancelar o abandonar explícitamente aparte de navegar/ocultar el widget. Reiniciar solo está disponible al resultado o empty.
- El estado loading sustituye la pregunta/opciones; el usuario no puede elegir mientras el nuevo paso se representa. No hay progreso persistente ni resumen de decisiones.
- Hay transiciones CSS de hover/active (color, sombra, elevación y escala) y spinner durante loading. No se usa `<Transition>` en Adventure ni se anima la entrada/cambio de pasos. Hay frases ambientales aleatorias. No se realizó inspección visual.
- Resultado: DiscCard centrada, texto de destino y acción para volver a inicio. Las opciones de país muestran bandera vía `CircleFlags`; las demás opciones son texto truncado en botones de ancho máximo `max-w-xs`. El widget ocupa slot `half`, una columna móvil y media anchura desde `lg`; la tarjeta limita contenido, pero no se probó visualmente en viewport.

### 6. Estados, concurrencia y riesgos

| Caso | Evidencia / clasificación |
|---|---|
| Carga inicial | Intro sin llamada remota. Confirmado.
| Error HTTP en options/random | `catch` cambia a `empty`, que dice que ninguna combinación tiene disco. **Problema confirmado:** error de servicio se presenta como falta de candidatos; no hay retry de la petición fallida.
| Respuesta `[]` de opciones | Se descarta la categoría y continúa; al descartarse todas, selecciona con filtros vacíos. Confirmado como fallback; riesgo de romper la intención de filtros si el backend viola su garantía o catálogo cambia entre consultas.
| Respuesta `[]` random | Empty con texto de combinación incompatible; acción reinicia todo. Confirmado.
| Doble clic en opción/clic rápido | `choose` no tiene lock. `currentQuestion` permanece hasta que se resuelve el cambio de estado y no hay token/cancelación; pueden arrancarse dos `loadQuestion` concurrentes con la misma pregunta/filtros o producirse respuestas en orden distinto. **Riesgo potencial reproducible por estructura**, no se ejecutó interacción para medir ventana de carrera.
| Cambio rápido/inconsistente de respuesta | Una vez la fase loading se renderiza, botones desaparecen; no hay opción visible para una segunda respuesta. La carrera requiere evento repetido antes del rerender. Sin prueba de componente.
| Cambio de sesión | No hay watcher de sesión ni carga propia que vuelva a hidratar `userRate`; una respuesta de usuario anterior podría seguir en pantalla si la sesión cambia mientras el widget permanece montado. Riesgo potencial; ruta Dashboard protegida, pero no se probó cambio de sesión abierto.
| Desactivación/unmount | Grid desmonta `AdventureModule`; `getDiscOptions` no expone `AbortSignal` y `getRandomDiscs` sí lo admite, pero el componente no lo pasa ni limpia/valida solicitudes. Peticiones pueden seguir en red y promesas intentar actualizar refs después de desmontar. Trabajo innecesario confirmado por falta de cancelación; impacto visual al desmontar no demostrado.
| Reinicio/respuesta tardía | Solo se puede reiniciar después de settle (result/empty), por lo que la UI normal no deja reiniciar durante loading. No hay generación de petición para descartar una respuesta antigua si se dispara flujo concurrente.
| Pérdida de conectividad/catálogo vacío | Ambos se ven como la misma falta de resultados. No hay reintento directo ni texto de error técnico.
| Accesibilidad | Elementos son botones nativos, pero foco outline se suprime; no hay `aria-live` explícito para estados loading/result/empty. Hallazgo de foco confirmado; anuncio de estado como riesgo de lector, sin prueba con tecnología asistiva.

No se encontraron indicios de N+1 en este recorrido: las selecciones de opciones son hasta cinco solicitudes secuenciales, y el random hidrata el conjunto de IDs seleccionado en una query con subconsultas agregadas. No se midieron bytes o duración. El payload Disc enriquecido excede algunos props que se dibujan, pero también aporta acciones de DiscCard; no hay medición que justifique reducirlo. No recomendar índices ni cambiar `ORDER BY RANDOM()` sin plan y dataset representativos.

### 7. Mejoras propuestas (sin aprobación de implementación)

| ID | Problema / evidencia | Recomendación | Backend | Frontend | Tamaño |
|---|---|---|---|---|---|
| ADV-1 | Fallos HTTP se anuncian como “ningún disco responde”; `empty` mezcla error y cero resultados. | Diferenciar error recuperable de vacío y reintentar el mismo paso/selección sin borrar las respuestas. | Ninguno. | Estado error y acción retry en componente existente. | S |
| ADV-2 | Rerenders rápidos pueden activar `choose` concurrentemente; no hay guard de operación. `getDiscOptions` no acepta señal y `getRandomDiscs` sí, pero no se usa. | Bloquear entrada desde el inicio de la petición y descartar respuestas obsoletas; cancelar la selección final con el wrapper existente si basta. | Ninguno. | Guardas pequeñas en `AdventureModule`; no crear composable por una sola máquina. | S |
| ADV-3 | Los botones suprimen su outline; las fases async no tienen anuncio explícito. | Restaurar estilo de foco visible y anunciar cambios de estado con una región accesible; validar teclado/lector. | Ninguno. | Solo widget. | XS–S |
| ADV-4 | Resultado usa `any` y transforma campos que ya tienen tipo parcial `Disc`; el adapter se duplica en Dashboard. | Tipar el resultado con `Disc` y normalizar solo campos de incompatibilidad real; no extraer adaptación global sin segundo consumidor vigente. | Ninguno. | Componente/servicio si el contrato realmente requiere normalización. | XS |
| ADV-5 | Sin navegación hacia atrás ni edición; se pierde toda decisión si se quiere cambiar un filtro. | Solo añadir si se aprueba como necesidad de producto. Preservar decisiones posteriores compatibles y recargar opciones que dependen de filtros cambiados. | No necesariamente; habría solicitudes repetidas de opciones. | Máquina de pasos e interacción adicionales. | M |

ADV-5 amplía mecánica y queda fuera de una refactorización de preservación. No se recomienda crear un nuevo modo, guardar preferencias, añadir filtro de historial o cambiar quién puede salir como resultado: ninguna de esas mecánicas está establecida por la interfaz actual.

### 8. Arquitectura futura y secuencia propuesta

Al cerrar la refactorización de Dashboard, el slot sigue en `DashboardPage.vue` como composición `<AdventureModule />`; se conserva el chrome actual y `DashboardWidgetGrid` determina montaje por preferencias. El componente existente mantiene UI, ciclo de vida, preguntas/respuestas y estados efímeros. `Catalog` sigue seleccionando opciones/resultados y sirviendo Disc; Rates/Favorites/Pendings conservan sus operaciones. No crear un wrapper, store global, query compartida ni composable de una única máquina. No mover Dashboard a `src/modules/dashboard` en esta pista.

Desglose de D-10 sin renumerar D-1–D-11. D-10a es esta auditoría; D-10 sigue abierto como bloque superior. Son tareas propuestas y ninguna implementación se inicia con esta documentación:

| ID | Tarea futura | Dependencia / criterio | Tamaño | Estado |
|---|---|---|---|---|
| D-10b | Decisión funcional: no se permite retroceder ni modificar decisiones anteriores; la persona asume las consecuencias de cada elección. | Mecánica cerrada para D-10c; se conserva el flujo irreversible actual. | XS | **Cerrada por decisión funcional** |
| D-10c | Correcciones frontend mínimas de error/reintento, bloqueo/cancelación y foco/estados accesibles. | D-10b; no cambia llamadas ni respuestas HTTP. | S | **Completada** |
| D-10d | Tipar el resultado/adaptación Disc y retirar deuda duplicada solo si un contrato común real lo justifica. | D-10c; no limpieza ajena a aventura. | XS–S | **Completada** (seguimiento abajo) |
| D-10e | Pruebas focalizadas y smoke autenticado desktop/móvil: selección de 2–5 categorías, filtros por orden, error/empty/retry, carrera, unmount/abort, resultado DiscCard, teclado y respuesta tardía. | D-10c/D-10d; reportar por separado pruebas locales y backend integrado. | S | Pendiente |

Las correcciones backend no están justificadas por los hallazgos actuales: los filtros y respuesta existentes cubren el flujo, y el candidato final se sortea sobre todos los discos elegibles que cumplen los filtros (no sobre muestra frontend). Si apareciera una discrepancia reproducible entre el backend desplegado y el checkout local leído, abrir una tarea Catalog aparte antes de tocar contratos.

**Verificación D-10a:** solicitada `git diff --check -- roadmap/dashboard.md`. Se conservaron los cambios preexistentes del checkout; no se añadieron ni modificaron pruebas, aplicación o backend.

### Seguimiento D-10c — Robustez y experiencia

**Estado:** completada el 2026-10-27. Se mantiene cerrada la decisión D-10b: no hay navegación hacia atrás ni edición de respuestas. D-10d (tipado/refactor acotado) y D-10e (regresión ampliada y smoke autenticado) siguen pendientes.

#### Cambios

- `AdventureModule.vue` mantiene el mismo sorteo de 2–5 categorías, categorías, orden, filtros acumulados, frases, aleatoriedad de Catalog, DiscCard, reinicio manual y reinicio al desmontar. No se añadió historial, preferencia ni mecánica de vuelta.
- Error de options o random presenta un estado `alert` separado de la respuesta vacía legítima. «Reintentar» repite la petición fallida: conserva categorías y respuestas y vuelve al mismo índice o al sorteo final con los mismos filtros. Si el usuario prefiere abandonar el intento, «Empezar otra aventura» devuelve a la introducción; no se reinicia automáticamente.
- La respuesta `[]` final mantiene el estado de combinación sin resultados. Una respuesta no vacía sin `id`, nombre o artista utilizables se trata como error y nunca se entrega a DiscCard como tarjeta incompleta.
- `isBusy`/fase de carga impiden iniciar, elegir o reintentar más de una vez por transición; los botones de opciones se deshabilitan durante operaciones. Cada petición usa su propio `AbortController`; Catalog `getDiscOptions` admite ahora un cuarto parámetro opcional `RequestOptions` y propaga `signal` sin cambiar las llamadas existentes. `getRandomDiscs` usa su señal ya disponible.
- Un contador de operación invalida respuestas atrasadas. Las peticiones se abortan e invalidan al desmontar, reiniciar y cambiar estado de sesión/usuario/generación; el cambio de sesión limpia también el resultado personal visible. Una cancelación no se comunica como error.
- Se reemplazó `focus:outline-none` por un indicador `focus-visible` de la paleta existente, se mantuvieron botones HTML nativos y el orden de tabulación, y loading/empty/error comunican sus cambios con `role=status`/`alert`, `aria-live`, `aria-atomic` y `aria-busy`. No se mueve el foco programáticamente.

#### Pruebas y verificaciones locales

- Pruebas focalizadas: AdventureModule (8 tests) y servicio Catalog de discos (9 tests), **17 aprobados**. Cubren selección de dos y cinco categorías y su orden, petición secuencial con filtros, opciones vacías, decisión irreversible/sin botón de vuelta, resultado DiscCard y campos personales, vacío vs error, retry de options y random con filtros conservados, doble clic de opción/retry, abort al desmontar, cambio de sesión y respuesta tardía, respuesta de disco incompleta, estado accesible y foco del botón.
- Suite completa: **73 archivos / 475 tests aprobados**, incluyendo DashboardPage y DashboardWidgetGrid existentes.
- `pnpm run typecheck`: aprobado. `pnpm build`: aprobado; muestra advertencias ya observables en el checkout por Browserslist antiguo, la utilidad CSS `.flex-[2]` y un chunk superior a 500 kB. No se corrigieron por estar fuera de D-10c y sin comparación base/head fiable.
- ESLint focalizado en `AdventureModule.vue` y su prueba: aprobado. Al incluir `services/discs/discs.ts` y su prueba, ESLint informa cinco `no-explicit-any` en líneas preexistentes del servicio (`71`, `72`, `79`, `98`, `211`); el archivo ya tenía cambios locales antes de D-10c y no se limpió esa deuda.
- `pnpm run cycles`: exit 0, una componente de ciclo type-only preexistente, comparación informativa por no resolver HEAD local. `pnpm run identity:boundaries`: exit 0, cero violaciones productivas; comparación informativa por el mismo estado del checkout.
- El detector Impeccable señala el patrón `side-tab` en `border-l-4` de las opciones (línea actual 49), que ya formaba parte del diseño original del widget. Se conserva por la restricción de no rediseñar ni limpiar hallazgos preexistentes; no se suprimió.
- No se usó un navegador real ni lector de pantalla: la prueba comprueba el foco DOM, la semántica nativa de botones y atributos de live region; la navegación real por teclado/tecnología asistiva y el smoke autenticado desktop/móvil quedan en D-10e.

**Archivos funcionales de D-10c:** `src/views/dashboard/components/AdventureModule.vue`, `src/services/discs/discs.ts`; pruebas en `AdventureModule.test.ts` y `services/discs/discs.test.ts`. No se cambió backend, `DashboardPage`, grid, registro, preferencias ni DiscCard.

### Seguimiento D-10d — Tipado del resultado

**Estado:** completada el 2026-10-27 sin modificar el contrato HTTP ni el comportamiento. D-10b permanece cerrada y D-10e sigue pendiente de smoke tests manuales; la aventura no se considera cerrada antes de esa validación.

#### Contratos revisados y cambios

- Catalog `GET /discs/random?limit=1` está tipado como `Promise<Disc[]>`; la selección y el acceso al primer elemento conservan el contrato de array. La respuesta válida se adapta y pasa a `DiscCardComponent` como `Disc`, con el enriquecimiento de Catalog intacto. `[]` sigue siendo un resultado vacío legítimo.
- Se contrastó el DTO/tipo frontend con la implementación local de backend: el catálogo aleatorio devuelve la propiedad `ep` en minúscula, mientras `Disc` también exigía `EP` mayúscula. Se hizo opcional `EP` como alias legado; `ep` sigue tipado y no se inventa un valor. `getRandomDiscs` mantiene parámetros, `AbortSignal` y forma de respuesta.
- El guard de visualización de Adventure acepta `unknown` y valida en runtime que `id`, `name` y `artist.name` sean cadenas no vacías. Dejó de declarar falsamente el valor externo como `Disc` mediante una aserción. Si no es visualizable se conserva el estado de error existente y no se renderiza una tarjeta incompleta.
- `resultDisc` continúa siendo `Disc | null`; las propiedades opcionales/nulas se preservan al adaptar el resultado y se transmiten a DiscCard sin sustitutos ficticios. No se creó otro modelo de disco ni se refactorizó DiscCard.

#### Pruebas y verificaciones locales

- Pruebas focalizadas AdventureModule y Catalog discos: **20 aprobadas** (11 + 9). Incluyen respuesta enriquecida en array, array vacío, identificadores vacíos/no válidos, campos opcionales y nulos, integración de DiscCard, retry/error y conservación de señal de cancelación.
- Suite completa: **73 archivos / 478 tests aprobados**, incluidos los consumidores existentes de Catalog y Dashboard.
- `pnpm run typecheck`: aprobado. ESLint de AdventureModule y sus pruebas más la prueba del servicio: aprobado. ESLint incluyendo `src/services/discs/discs.ts` encuentra cinco `no-explicit-any` preexistentes (líneas 72, 73, 80, 99 y 212 del estado actual), fuera de D-10d; se dejaron intactos.
- `pnpm run cycles`: exit 0 con un ciclo type-only preexistente y comparación informativa (no se resolvió HEAD local). `pnpm run identity:boundaries`: exit 0, cero violaciones productivas; comparación igualmente informativa.
- `pnpm build`: aprobado; conserva avisos del checkout por Browserslist antiguo, sintaxis CSS de `.flex-[2]` y chunk superior a 500 kB. Las pruebas unitarias no sustituyen una verificación contra backend integrado ni una sesión real.

**Archivos con cambios de D-10d:** `src/services/discs/discs.ts` (solo hacer opcional el alias `EP`), `src/views/dashboard/components/AdventureModule.vue` (validación runtime del disco externo), `src/views/dashboard/components/AdventureModule.test.ts` y este roadmap. Los archivos de código ya contenían cambios locales de D-10c u otras tareas; se preservaron. No se modificó backend, Dashboard, grid, preferencias ni DiscCard.

## D-TOP-1 — Auditoría conjunta de Top 3 semanal y mensual

**Estado:** auditoría documental completada el 2026-10-27. No se modificaron componentes, servicios, contratos, backend, preferencias ni registro. D-TOP-2 no se inicia hasta revisar esta auditoría.

**Fuentes:** `DashboardPage.vue`, `DashboardWidgetGrid.vue`, `dashboardWidgetRegistry.ts`, `DiscCardComponent.vue`, `services/discs/discs.ts`, `services/rates/rates.ts`, `DashboardPage.test.ts`, pruebas de Catalog y backend local de referencia en `riffvalley-app-back/src/catalog/discs/{discs.controller.ts,discs.service.ts,home/disc-home.service.ts,home/helpers/home-disc-filters.ts,home/helpers/map-home-ranked-disc.ts,dto/top-stats-query.dto.ts}`. Es revisión estática de los checkouts; no se hizo llamada HTTP ni smoke visual. La evidencia backend corresponde al código local inspeccionado, no acredita qué versión corre en producción.

### Funcionamiento y semántica observados

Los dos Top 3 usan el mismo algoritmo: reciben `discs` del endpoint, mantienen el orden de respuesta, filtran `averageRate != null`, adaptan el disco y toman los tres primeros. No ordenan en frontend. El backend produce hasta 20 filas por `weightedScore` descendente y `d.id` ascendente como desempate estable. El score es un promedio bayesiano: combina promedio actual del disco y promedio global, ponderados por el número actual de valoraciones y la mediana global de votos. No es orden por cantidad de votos.

Los períodos no seleccionan actividad de voto. Semana calcula del viernes al jueves de la semana que contiene la fecha local actual (`getWeekRange`); mes calcula desde el día 1 hasta el último día del mes local actual. Esos límites se envían en `dateRange`, que backend aplica inclusivamente a `d."releaseDate"` y limita además a discos con fecha no posterior a hoy. `Rate` representa la valoración actual editable. Así, ambos widgets muestran discos publicados en el rango, ordenados con sus valoraciones actuales agregadas; un voto emitido hoy sobre un disco antiguo no lo introduce en Top semanal/mensual. Los títulos dicen “Semana actual”/“Mes actual”, pero la leyenda vacía (“No hay discos valorados esta semana/este mes”) puede sugerir actividad temporal de votación que no se consulta.

Hay un borde funcional confirmado: Catalog incluye discos fijados (`pinned`) incluso sin una valoración. La consulta SQL normaliza `AVG(rate)` nulo a `averageRate = 0`; por ello el filtro frontend `averageRate != null` los conserva y pueden ocupar posiciones. La leyenda vacía tampoco describe exactamente la elegibilidad. La respuesta incluye `voteCount`, que permite distinguirlos en frontend, pero todavía hace falta decidir si el producto quiere excluir todo disco con cero valoraciones o conservar destacados fijados.

Cada card transmite a `DiscCard` imagen, nombre, artista/país, fecha de lanzamiento, EP/debut, género/color, enlace, promedios actuales de nota/portada, estado Rate/favorito/pendiente propio, comentarios y recuento de votos. La tarjeta común ofrece las interacciones que corresponden a la sesión: detalle/artista, reproductor/enlace, editar/enviar valoración, favorito, pendiente, comentarios y copia de imagen; moderación/calendario depende del rol. Los Top no tienen controles propios.

### HTTP, respuesta y consumidores

| Aspecto | Top 3 semanal | Top 3 mensual |
|---|---|---|
| Endpoint | `GET /api/discs/homeDiscs` (cliente `GET /discs/homeDiscs`, base `/api`) | Igual |
| Parámetros | `dateRange=[viernes, jueves]`; sin `genreId`, `country`, `statsDateRange` ni `distributionDateRange` | `dateRange=[día 1, último día del mes]`; los demás parámetros omitidos |
| Período real | `disc.releaseDate` en semana viernes–jueves; Rates actuales | `disc.releaseDate` en mes calendario actual; Rates actuales |
| Respuesta/cantidad | `DiscsStatsResponse`; backend entrega `discs` hasta 20 y agrega `totalDiscs`, `totalVotes`, `topUsersByRates`, `topUsersByCover`, `ratingDistribution`; frontend toma máximo 3 | Igual |
| Filtros | Lanzamiento dentro del rango y `<= today`; opcionalmente backend admite género/país, aquí no usados; sólo discos valorados o `pinned` | Igual |
| Orden | `weightedScore DESC, d.id ASC`; frontend preserva orden y corta tras filtrar `averageRate != null` | Igual |
| Estado | Array propio, pero comparten `loadingTopDiscs`; una carga conjunta `Promise.all` y fallo de cualquiera deja vacíos ambos | Igual |
| UI | Tarjeta, skeleton de 3, leyenda vacía; título y fechas de semana | El mismo template/props, encabezado y etiqueta del mes; leyenda vacía propia |
| Interacciones | Sólo las de `DiscCard` | Sólo las de `DiscCard` |

`getTopRatedOrFeaturedAndStats(dateRange, ...)` de Catalog construye la query Axios al endpoint indicado y devuelve el cuerpo completo `DiscsStatsResponse`. Top sólo lee `discs` y, por disco, `averageRate` para filtrar; transmite los demás atributos de Disc a `DiscCard`. Ambos widgets usan este mismo servicio. Otros consumidores localizados: `DashboardCommunityWidget.vue` usa agregados de `/discs/homeDiscs`; `views/homePage/HomePage.vue` usa los discos para rankings. Rates no provee el Top 3 ni se importa desde él.

En el backend local, `DiscsController.findTopRatedOrFeatured` exige `@Auth()` y entrega `TopStatsQueryDto` a `DiscsService`/`DiscHomeService`. `dateRange` filtra `d."releaseDate"`; el ranking ejecuta la consulta principal con joins de Rate/Artist/Country/Genre y estado personal de Rate/favorito/pendiente, aplica `HAVING` de valoraciones o pinned, ordena por `weightedScore` y limita a 20. Por llamada se ejecutan además las consultas para media/mediana global, totales, Top usuarios por Rate, Top por portada y distribución: seis consultas SQL en total en el código revisado. Top 3 no consume los cinco campos agregados ni necesita más de tres discos, pero el endpoint compartido los calcula; no se midió latencia ni payload. El exceso está confirmado estructuralmente, la relevancia/coste para producto no está medida.

### Hallazgos: confirmados y riesgos

**Confirmados por código:**

- `fetchTopDiscs()` corre desde `onMounted` del padre y dispara las dos peticiones aunque uno o ambos slots estén apagados. El grid sí omite el slot y desmonta su subtree; no puede evitar una carga que el padre ya inició.
- Son dos GET por montaje con distinto `dateRange`. No son peticiones iguales deduplicables, pero ambas recalculan el pipeline combinado de `homeDiscs`.
- Un único `loadingTopDiscs` acopla los estados. `Promise.all` asigna ambos arrays solo después de que ambas promesas resuelvan; un rechazo descarta también el resultado exitoso de la otra petición. El `catch` es silencioso y ambas vistas terminan mostrando el mismo tipo de vacío que una respuesta legítimamente vacía. No hay reintento.
- El servicio `getTopRatedOrFeaturedAndStats` no acepta `AbortSignal`; no se cancela al desactivar/desmontar y no hay protección explícita contra respuestas tardías. La secuencia de fecha no se recalcula con paso de día/mes: se toma al montar y no hay refresco por reloj, invalidación ni actualización tras una nueva valoración. Las cards pueden cambiar estado local, pero no vuelven a solicitar ni reordenan ambas listas.
- `DashboardPage.test.ts` verifica que el servicio se invoca al montar y contiene pruebas de resumen/otras extracciones; no comprueba los rangos Top, el montaje independiente, cancelación, error/empty, orden/posiciones ni actualización. La prueba de servicio Catalog presente no fija el contrato específico de estos parámetros. Backend sí tiene pruebas de ranking, SQL, fecha inclusiva y score/desempate, pero no sustituyen pruebas del comportamiento Vue.
- Las dos secciones repiten estructura, skeleton, props de DiscCard y medallas. Semana muestra rango de fechas; mes muestra mes/año. Comparten tamaño `full`, tres columnas desde `xl`, columna única antes de `xl`, ordenan/guardan visibilidad por IDs existentes `top3mes` y `top3semana`.
- Markup de carga/empty no expone status/error explícito. Los botones de interacción pertenecen a DiscCard; este Top no agrega controles de teclado propios. Revisión estática de clases/markup, sin verificación de contraste, lector de pantalla ni viewport real.

**Riesgos o aspectos no confirmados en runtime:**

- Si la sesión cambia mientras la página sigue montada o una petición está pendiente, datos personalizados (`userRate`, favorito, pendiente) podrían corresponder a la sesión anterior; no hay watcher ni cancelación propios en esta carga. El flujo real de navegación al cambiar sesión no se verificó aquí.
- Las dos consultas arrancan juntas pero el backend ejecuta consultas independientes; una valoración concurrente podría producir snapshots ligeramente distintos. No hay garantía de snapshot común y no se observó una inconsistencia real.
- Desactivar y volver a activar widgets conserva la visibilidad/preferencia independiente, pero con la extracción propuesta cada remount volvería a consultar. Eso mantiene el patrón actual de frescura; caché/deduplicación entre slots no se considera requisito demostrado.
- Responsive y accesibilidad se han inferido del código, no de ejecución visual/tecnología asistiva.

### Comparación de responsabilidades y viabilidad

Es viable un único `DashboardTop3Widget.vue` con `period: 'week' | 'month'`. Las dos instancias deben derivar su propio rango/etiquetas, llamar una sola vez al período recibido y poseer refs/loading/error/empty locales. No debe hacer ambas peticiones ni usar un store mutable compartido. El servicio permanece en Catalog; el componente de Dashboard solo consume el contrato existente. La instancia existe únicamente dentro del slot habilitado; con la estructura real del grid:

```vue
<template #top3semana>
  <DashboardTop3Widget period="week" />
</template>
<template #top3mes>
  <DashboardTop3Widget period="month" />
</template>
```

El grid mantiene `top3semana`/`top3mes`, sus tamaños `full`, orden y preferencias desktop/mobile. `DashboardPage.vue` queda como composición. Se comparte markup, medallas, conversión/adaptación de respuesta y control de estado/errores; se parametrizan período, fechas, título y texto de estado vacío. Las solicitudes, resultados, errores y ciclos de vida permanecen independientes por instancia. `DiscCard` y el servicio Catalog se reutilizan tal como existen. No hace falta wrapper, store ni composable compartido para solo dos variantes.

La extracción no requiere backend ni contrato nuevo. El endpoint existente sí devuelve agregados innecesarios para Top 3; como es compartido, no se debe modificar el payload en D-TOP-2. Cualquier optimización de esa ruta requeriría medir y diseñar tarea Catalog/backend separada. La clasificación de Rates actuales frente a actividad por fecha de voto es una decisión funcional: si se decide actividad, el contrato/backend actual no basta y debe definirse tarea backend antes de D-TOP-2. Si se conserva la semántica actual, considerar ajuste de copy y filtro de pinned sin votos como tarea frontend aprobada aparte o decisión previa para D-TOP-2.

### Mejoras justificadas y decisiones pendientes

| Problema / evidencia | Recomendación | Backend | Frontend | Tamaño |
|---|---|---|---|---|
| Copy temporal puede interpretarse como votos de la semana/mes; el filtro real es fecha de lanzamiento y valores actuales. | Confirmar intención. Si se conserva ranking por lanzamientos, explicitarlo en título/leyenda; si se quiere actividad de voto, diseñar evento/ventana y contrato antes de migrar. | No para corregir copy; sí requerido para actividad de voto | Sí para copy o cambio de consumidor cuando exista API | XS / tarea separada |
| `averageRate != null` deja pasar discos pinned sin valoración porque backend devuelve `0`; ranking se etiqueta como valorado. | Confirmar si se excluye `voteCount === 0`; contrato actual trae el conteo. | No si basta filtro frontend; si debe cambiar elegibilidad global, sí | Sí | XS |
| Ambas peticiones se disparan aunque slots apagados; estado/promise común acopla fallos. | D-TOP-2 mueve petición/estado a la instancia parametrizada, con error diferenciable y ciclo independiente. | No | Sí | S |
| Servicio sin señal; respuesta antigua puede completarse después de unmount/cambio de sesión. | Añadir cancelación al servicio y al lifecycle/cambio de identidad, y descartar respuestas obsoletas. | No | Sí | S |
| API de seis consultas y payload amplio para Top 3; evidencia de código, sin medida de coste. | Medir antes de considerar contrato mínimo Catalog compartido con consumidores; no abrir endpoint nuevo por anticipado. | Solo si medición justifica tarea Catalog/backend | No para extracción | XS investigación |

Decisiones que no se fijan en esta auditoría: semántica de producto deseada (publicación en ventana vs actividad de voto en ventana); inclusión de pinned sin `voteCount`; copy que aclara el período; y si se quiere refresco automático al cruzar día/mes o tras votar. Mantener Rates actuales y copy “Top por lanzamientos publicados en...” evita atribuir actividad temporal inexistente.

### Cobertura futura para D-TOP-2/D-TOP-3

- Render semanal y mensual, y rangos/labels distintos comprobados con reloj fijo; semana debe cubrir límite viernes–jueves y mes el último día.
- Parámetros de Catalog exactos por `period`, conservación del orden backend, asignación de medallas/posiciones y hasta tres resultados; menos de tres, lista vacía y política elegida para pinned/no valorados.
- Loading, error de red, reintento (si se añade), error independiente de la otra instancia y respuesta parcial exitosa.
- Dos slots habilitados solicitan una vez cada uno; uno solo habilitado solicita solo su período; ambos inactivos no solicitan. Mantener IDs, tamaño, orden y preferencias.
- Cancelación al desmontar/desactivar y al cambiar identidad; respuesta tardía no sobrescribe la nueva instancia/sesión.
- No regresión de props e interacciones DiscCard; prueba de contrato del servicio/query y, si cambia elegibilidad/semántica, prueba que comprueba que frontend respeta contrato backend.
- `DashboardPage` solo compone; no conserva import/solicitud/estado `fetchTopDiscs` para esos slots. Component/grid tests verifican activación independiente.
- Prueba responsive/teclado/estados anunciables y smoke autenticado real en D-TOP-3; reportar Network y prueba local separada de CI.

### Plan e identificadores

| Tarea | Resultado | Estado | Tamaño |
|---|---|---|---|
| **D-TOP-1 — Auditoría conjunta** | Esta auditoría documental y decisiones pendientes | **Completada** | XS |
| **D-TOP-2 — Extracción de ambos widgets** | Un `DashboardTop3Widget.vue` parametrizado, peticiones/estados independientes; retirar lógica Top del padre, preservar IDs/slots/tamaño/orden/preferencias. Corresponde a ejecución de la fila histórica D-7, no crea otra extracción. | **Completada** | S |
| **D-TOP-3 — Smoke tests** | Smoke autenticado de semana/mes y activación independiente en app real; forma parte del cierre de widgets/regresión D-11, no duplica una migración. | Pendiente | XS |

D-TOP-2 implementa las decisiones de producto aprobadas: el período sigue filtrando fecha de publicación, se excluyen discos sin votos musicales reales y los datos se cargan al montar sin refresco automático tras votar. No se ha iniciado D-TOP-3; queda pendiente el smoke autenticado manual de semana/mes y activación independiente.

### Seguimiento D-TOP-2 — Extracción conjunta

**Estado:** completada el 2026-10-27 en frontend. Se preservaron los cambios locales ajenos. No se modificó backend, el registro, las preferencias, `DiscCardComponent.vue` ni otros widgets.

#### Decisiones funcionales aplicadas

- Se conserva el ranking de discos publicados dentro del período y valorados con los Rates actuales; no se cuenta actividad de voto emitida durante la semana/mes.
- Solo se consideran elegibles discos con `voteCount > 0`. En el contrato de `GET /api/discs/homeDiscs`, Catalog deriva `voteCount` de filas `Rate` con `rate IS NOT NULL`; las valoraciones cero cuentan. Las notas de portada no incrementan ese contador. El filtro se aplica a los hasta 20 resultados recibidos, conserva el orden del backend y toma los tres primeros elegibles, sin consultas de relleno.
- No hay refresco automático después de una valoración. Las tarjetas mantienen sus propiedades e interacciones ya existentes.

#### Componente, fechas y ciclo de petición

`DashboardTop3Widget.vue` recibe `period: 'week' | 'month'` y contiene presentación, estado, llamada y cancelación de una instancia. `DashboardPage.vue` solo conecta el componente al slot `top3semana` con `week` y `top3mes` con `month`; no conserva helpers, arrays, loading, petición, medallas ni markup Top 3. IDs, tamaños `full`, orden y preferencias permanecen sin cambio; `DashboardWidgetGrid` sigue omitiendo los slots desactivados.

La semana mantiene el cálculo local viernes–jueves (`getDay`, offset a viernes) y envía `dateRange` con strings locales `YYYY-MM-DD`. El mes envía del primer día al último día de mes natural. No se tocó la semántica temporal de otros widgets.

Cada instancia solicita solo su rango al montarse y vigila identidad de sesión (`isAuthenticated`, `userId`, `authSessionGeneration`): un cambio aborta la petición previa, limpia los datos personales y pide el ranking de la nueva sesión. `getTopRatedOrFeaturedAndStats` acepta ahora un `AbortSignal` opcional y lo pasa a Axios solo cuando está definido, preservando el contrato de llamada existente para HomePage y Community. Cleanup al desmontar/desactivar aborta y la respuesta solo modifica refs si sigue vigente. No hay caché compartida ni coordinador global.

Las leyendas describen publicación en el período. Se mantienen skeleton responsive, cards, medallas y fecha visible; ahora loading y vacío anuncian el estado, error presenta mensaje distinto y botón «Reintentar». Los fallos de un widget no cambian el estado de la otra instancia.

#### Archivos de D-TOP-2

- Nuevo `src/views/dashboard/components/DashboardTop3Widget.vue` y prueba de componente en `DashboardTop3Widget.test.ts`.
- `DashboardPage.vue` y `DashboardPage.test.ts`: reemplazadas las plantillas Top 3 por instancias parametrizadas; prueba que el padre compone y no solicita esos rankings.
- `src/services/discs/discs.ts` y `discs.test.ts`: `HomeRankedDisc` refleja el `voteCount` garantizado por el endpoint y su `weightedScore` conservado; el servicio acepta señal opcional sin cambiar sus parámetros/respuesta HTTP ni otros consumidores.
- Este roadmap: decisiones y estado D-TOP-2. D-TOP-3 sigue pendiente.

#### Pruebas y verificaciones

- Pruebas focalizadas: **41 aprobadas** en cinco archivos (Top 3, DashboardPage, servicio Catalog, grid y eventos existentes de DiscCard). Cubren ambos rangos con fecha fija, viernes–jueves, mes natural, límite/orden backend y empate sin reordenar, voto cero válido, descarte de solo portada, resultados 1–2/vacío, estados loading/error/retry, señal en unmount y cambio de sesión/respuesta vieja, instancias paralelas, activación por slots, props de DiscCard y ausencia de carga en el padre.
- Suite completa `pnpm test`: **74 archivos / 493 tests aprobados**. Hubo warnings de consola de pruebas preexistentes por `font-awesome-icon` sin stub en la integración de RandomDiscWidget, además de logs esperados de errores simulados en pruebas de Identity/Videos.
- `pnpm run typecheck`: aprobado. `pnpm build`: aprobado; conserva el aviso Browserslist/caniuse-lite antiguo, el warning CSS preexistente de `.flex-[2]` y el chunk principal por encima de 500 kB.
- ESLint de los cuatro archivos nuevos/específicos (`DashboardTop3Widget.vue`, su test, `DashboardPage.test.ts`, `services/discs/discs.test.ts`): aprobado. Al incluir `DashboardPage.vue` y `services/discs/discs.ts`, reporta siete `no-explicit-any` preexistentes: cinco en otras funciones de Catalog (`discs.ts` líneas 78, 79, 86, 105, 218) y dos en Últimos votos de DashboardPage (líneas 290, 339). No se corrigió deuda ajena al Top 3.
- `pnpm run cycles`: exit 0 con un ciclo type-only entre Articles/Contents/Riff Valley Playlists, comparación informativa porque el checker no resuelve el HEAD local. `pnpm run identity:boundaries`: exit 0, cero violaciones productivas; la comparación también es informativa por no resolver HEAD.
- El detector Impeccable escaneó el componente nuevo y DashboardPage sin encontrar problemas deterministas. No se editó `.impeccable/config.json`.
- `git diff --check`: aprobado.

**Smoke pendiente:** no se inició D-TOP-3. Sigue pendiente validar en navegador una sesión autenticada, los dos rangos y que al activar/desactivar cada widget se observa exclusivamente su solicitud en Network, además de responsive visual real.

## D-8a — Auditoría de Últimos votos

**Estado:** auditoría funcional y técnica completada el 2026-10-27. Se revisaron los recorridos y pruebas frontend y el código local del backend; no se modificó código funcional, no se ejecutaron pruebas ni consultas contra datos reales y no se hizo ninguna petición a un entorno desplegado. Las conclusiones backend describen el checkout local inspeccionado y deben contrastarse con el despliegue antes de asumir que está publicado allí.

### Contrato y comportamiento actuales

El slot persistido `ultimosVotos` está registrado como widget `half`, orden 9, con preferencias propias. `DashboardWidgetGrid.vue` filtra `enabled === false` y monta solo los slots visibles; sin embargo, el efecto que carga Últimos votos sigue en `DashboardPage.vue`, cuyo `onMounted()` llama `fetchRecentVotes()` sin consultar la activación. Por tanto, el widget apagado sigue generando su petición. El padre conserva petición, datos, carga, plantilla y CSS del widget.

La llamada actual es `getRatesByUser(5, 0, undefined, undefined, undefined, undefined, 'rate')`, que produce `GET /rates` con `limit=5`, `offset=0` y `type=rate`; no envía `orderBy`. El servicio frontend declara incorrectamente `Promise<DiscRate[]>`, mientras que el backend devuelve un objeto paginado `{ totalItems, totalPages, currentPage, limit, data }`. Dashboard oculta la discrepancia con `any` y lee `response.data`.

`GET /rates` tiene `@Auth()` y obtiene la identidad con `@GetUser()`. `findAllByUser` restringe los resultados a `rate.userId` de esa sesión. No es un feed comunitario: es una lista de hasta cinco filas actuales de Rates del usuario autenticado. `type=rate` filtra en backend `rate.rate IS NOT NULL`, antes de aplicar `take(5)`, así que excluye filas que solo contienen valoración de portada y no incluye notas nulas; una nota numérica `0` sí es una nota presente. Si una fila contiene nota y portada, la respuesta puede incluir ambas, pero el widget solo representa `rate.rate`.

La consulta de lista hace un `getRawAndEntities()` y después un `getCount()`: dos operaciones de base de datos. La primera incluye disco, artista, género, país, joins de favorito/pendiente y subconsultas de media musical, media de portada, contador de notas y contador de comentarios. El widget solo utiliza `id`, `rate`, `disc.image`, `disc.name` y `disc.artist.name`; no consume metadata de paginación, el usuario, portada ni los agregados. Es información/coste que proceden del contrato compartido, no una respuesta diseñada específicamente para este widget. No se propone reducir la respuesta de otros consumidores sin medir su uso.

### Orden real y significado de las fechas

La ausencia de `orderBy` activa el fallback de `findAllByUser`: `disc.releaseDate DESC NULLS LAST`, después `artist.name ASC`. `take(5)` se aplica en la consulta antes de serializar. No hay criterio final por `rate.id`, `createdAt` ni otro campo para resolver igualdad en fecha de publicación y artista, así que el orden de esas filas empatadas no es determinista. Aunque `rate.createdAt` y `rate.editedAt` están en la lista permitida de ordenación del backend, el widget no los solicita.

**Error confirmado:** el título “Tus últimos 5 votos” no describe la selección. Ganan las valoraciones del usuario sobre discos con fecha de publicación más reciente, no las cinco operaciones de valoración más recientes. Una nota antigua de un disco con publicación reciente puede aparecer por delante de una nota recién emitida para un disco antiguo; editar una nota tampoco la acerca al principio por la fecha de la edición. La fecha de publicación del disco y la fecha del voto son datos distintos. El componente no presenta ninguna fecha, autor del voto ni enlace/acción por fila: muestra imagen o icono, título, artista y valor musical. El autor no aparece porque el endpoint personal ya limita por usuario.

El orden y la lista se cargan una vez al montar Dashboard. No se ve una actualización tras votar ni un listener de cambios; las valoraciones nuevas o editadas pueden no reflejarse hasta volver a montar/recargar la página. El error de red se silencia y deja `data` vacío, mostrando el mismo mensaje que un resultado genuinamente vacío. Ese mensaje (“Aún no has votado ningún disco”) también es demasiado amplio si existen valoraciones únicamente de portada, porque `type=rate` las excluye. El skeleton tiene tres filas frente a una lista que puede mostrar cinco.

### Qué conserva Rates al escribir valoraciones

La entidad `Rate` representa el estado actual por fila (`rate` y `cover` nullable, `createdAt`, `editedAt`), no una secuencia histórica de snapshots. `createdAt` data la creación de la fila, que puede haber nacido por una valoración de portada; no prueba cuándo se asignó la nota musical. `editedAt` es la marca de actualización de la fila, no la fecha fiable de cambio de nota: `create` al actualizar una fila existente y `update` escriben `editedAt` incluso cuando la edición solo cambia `cover` o deja la misma nota. La ruta `remove` borra la fila sin dejar una operación de eliminación en Rate.

El checkout backend contiene además `rate_vote_events`, un ledger separado con `occurredAt` (`timestamptz`), `eventType` (`set`/`change`), `userId`, `discId`, `previousValue` y `newValue`. `recordVoteEvent` registra `set` cuando una nota musical pasa de nula a valor, `change` cuando cambia una nota presente y no registra cambios de portada, la misma nota ni un valor nuevo nulo. Las operaciones de valoración musical se guardan en la misma transacción. La migración crea la tabla y marca `started_at`, pero no rellena eventos históricos; la serie de eventos solo es completa desde que empezó su captura. No hay evento para borrar/limpiar una nota. El FK de usuario elimina los eventos al borrar la cuenta y el FK de disco conserva el evento dejando `discId` nulo al borrar un disco.

El endpoint `GET /rates/user/:userId/history` no resuelve la semántica: su servicio reconstruye eventos `created`/`updated` a partir de Rates actuales, `createdAt` y `editedAt`, y copia los valores actuales a ambos eventos. En consecuencia, no conserva el valor original ni distingue ediciones de portada de cambios musicales. Además, la ruta no lleva `@Auth()` en el controlador y el test del controlador registra ausencia de guards de ruta; no se comprobó aquí un entorno ejecutable ni se afirma el acceso efectivo sin revisar cualquier guard global/despliegue. No debe reutilizarse para datos comunitarios hasta revisar explícitamente autenticación y privacidad.

### Integridad: hechos y riesgos

**Problemas confirmados en la ruta actual:** orden incompatible con “últimos”; scope personal en lugar de comunitario; error y vacío indistinguibles; solicitud aunque el slot esté desactivado; ausencia de fecha que permita verificar visualmente la recencia; contrato TypeScript desalineado con la paginación; respuesta enriquecida y conteo que el widget no usa; datos no actualizados tras una operación de voto durante el montaje actual.

**No se confirmó un fallo de integridad en los datos:** el servicio `create` busca la Rate por pareja usuario/disco bajo bloqueo y la actualiza si ya existe, lo que evita duplicados por el flujo normal. La migración de índices vista crea índice ordinario para `(userId, discId)`, no una restricción única; no se consultaron filas reales ni se encontraron pruebas de duplicados. Por ello, duplicados históricos o escrituras fuera del servicio son un riesgo, no un hecho. La consulta actual no deduplica por disco y el `v-for` usa `rate.id`, por lo que filas duplicadas se verían repetidas.

No hay filtros frontend posteriores al `LIMIT`: los filtros de `type`, usuario y filtros opcionales se aplican en SQL antes del límite. La ausencia de disco/artista es un riesgo de datos/relación: la plantilla usa optional chaining para sus nombres y fallback de imagen, pero no crea navegación ni completa relaciones por otra vía. No se inspeccionó producción para medir nulos, filas borradas, empates o cobertura del ledger. Las URLs de imagen vacías o rotas tampoco tienen un fallback tras un error de carga de la imagen; solo se usa icono cuando `disc.image` no viene.

### Experiencia, activación y pruebas existentes

La tarjeta tiene título `h3`, imagen con texto alternativo basado en nombre de disco y truncado visual del nombre/artista. La fila es un `div`, no un control interactivo; no ofrece foco, navegación ni acciones por teclado, coherente con que no hay interacción visible. El valor numérico no tiene una etiqueta accesible que lo identifique como nota. No hay fecha o autor que contextualice el registro. En responsive, el registro da tamaño `half`; el grid usa ancho completo en móvil y dos columnas desde `lg`. Las filas mantienen imagen, columna flexible y nota, con truncado CSS. Es una inspección estática de clases/markup; no hubo smoke visual ni evaluación con lector de pantalla.

`DashboardPage.test.ts` mockea `getRatesByUser` y fija una respuesta paginada, pero no contiene aserciones del slot, llamada, estado o activación de Últimos votos. `DashboardWidgetGrid.test.ts` prueba genéricamente que slots desactivados no se montan y que al desactivar un widget se desmonta; eso no detecta la petición que el padre ya inició. El backend tiene tests de `findAllByUser`, controlador, escritura de eventos musicales y caracterización del histórico aproximado; no hay cobertura focalizada frontend de este widget. No se ejecutaron tests durante esta auditoría.

### A. Últimos cinco votos musicales creados

Interpretación: cinco eventos `set` musicales de la comunidad, ordenados por `occurredAt DESC` —con desempate estable por ID del evento— y sin que una modificación posterior mueva el voto. El registro `rate_vote_events` ya conserva tipo y valor inicial para la captura futura, pero no dispone de historia anterior a `started_at`; no puede reconstruir los cinco más recientes de un período histórico que preceda a la captura. Usar solamente `Rate.createdAt` no es exacto si la fila se creó inicialmente por portada y recibió la nota después. Las valoraciones solo de portada permanecen excluidas. Producto debe precisar si quitar/volver a poner una nota equivale a nuevo voto, qué valor mostrar si cambia después y cómo mostrar votante/disco eliminado.

### B. Últimas cinco actividades de valoración musical

Interpretación: cinco operaciones musicales `set` y `change`, cada una ordenada por su `occurredAt DESC` con desempate estable. El ledger existente captura ambas desde su inicio y conserva los valores anterior/nuevo, pero no es histórico completo pre-migración y no registra eliminación/limpieza de nota ni cambios de portada. El endpoint de historia existente reconstruido desde `editedAt` no es sustituto válido. Para una actividad coherente, las tarjetas deberían usar el snapshot `newValue` del evento; la exposición del nombre/avatar del votante requiere una decisión explícita de privacidad/UX. Las actividades de portada se mantienen fuera del feed o requieren un tipo/contrato separado, no se mezclan por `editedAt`.

**Decisión funcional pendiente:** el copy actual dice “Tus” (ámbito personal), mientras las propuestas A y B describen actividad de comunidad. Antes de implementar hay que decidir universo (persona o comunidad) y semántica (creación o cada cambio), además de copy, autor, valor mostrado, borrados y comportamiento para eventos anteriores al inicio de captura. Esta auditoría no selecciona A o B. Si “actividad más reciente” es la intención del producto, B corresponde a ese término; si solo deben figurar notas nuevas, corresponde A. En ambos casos, no ordenar por `editedAt` ni por publicación del disco.

### Arquitectura y corrección propuestas

La extracción prevista es viable como `src/views/dashboard/components/DashboardLatestVotesWidget.vue`, dueño de una petición Rates, resultados, loading/error/empty y cancelación en ciclo de vida. `DashboardPage.vue` conservaría solo el slot `ultimosVotos` con el componente. El grid ya controla montaje por preferencia; al ubicar la petición dentro del widget, desactivarlo deja de iniciar solicitudes. No hace falta un wrapper adicional, store, composable nuevo ni mover Dashboard a `src/modules/dashboard`. Rates conserva los servicios y el contrato de datos; Catalog y Community no son owners de votos.

El contrato actual no permite mostrar los últimos eventos de toda la comunidad: `/rates` está limitado al usuario de sesión y sus filas no son eventos. Para A/B comunitario hace falta backend. Preferir una ampliación compatible dentro del owner Rates que exponga explícitamente la consulta de actividad desde `rate_vote_events`, con tipo/filtro musical, `limit=5`, orden estable, snapshot de nota, disco y los campos mínimos de votante acordados. Reutilizar/extendender una ruta existente solo si se puede preservar el significado y respuesta legacy de `GET /rates`; no reinterpretar silenciosamente esa colección ni reutilizar el histórico aproximado. Si se elige ámbito personal, el backend podría evitarse solo para un significado menos estricto basado en Rates actuales; garantizar recencia de la operación musical y distinguir set/change requiere el ledger. No se justifica cambiar backend hasta cerrar la decisión de producto.

Conservar `ultimosVotos`, su tamaño, orden y preferencias. El widget debe distinguir carga, empty y error con reintento, cancelar petición al desmontar si el cliente lo permite, ignorar respuesta tardía y limpiar datos al cambiar sesión. Mantener el comportamiento actual de tarjetas/navegación (no hay acciones existentes que deban perderse); añadir autor, fecha o navegación requiere decisión de UX y contrato mínimo.

### Plan secuencial

| Tarea | Alcance | Estado | Tamaño |
|---|---|---|---|
| **D-8a — Auditoría de Últimos votos** | Esta reconstrucción de comportamiento, contrato, fechas, datos, riesgos y tareas | **Completada** | XS |
| **D-8b — Decisiones funcionales** | Definición aprobada en el diseño backend: resumen personal de Rates actuales según última actividad; no es feed comunitario ni historial de eventos | Completada según D-8c backend | XS |
| **D-8c — Contrato Rates backend** | `GET /api/rates/dashboard-summary`, contrato personal autenticado, agregaciones semanales y hasta cinco Rates actuales recientes | Completada en backend | M |
| **D-8d — Frontend «Tu semana musical»** | `DashboardLatestVotesWidget.vue`, contrato Rates tipado, slot independiente y estado/cancelación propios | **Completada** | M |
| **D-8d.1 — Compactación visual «Tu semana musical»** | Ajuste de densidad, contraste, truncado y responsive sin cambios funcionales | **Completada** | XS |
| **D-8e — Smoke tests manuales** | Validar sesión autenticada, métricas/lista contra el backend integrado y activación responsive del widget | Pendiente | XS |

La tarea histórica D-8 sigue siendo el paraguas de Community y Últimos votos. La extracción de Community y D-8a (auditoría) permanecen completadas; D-8b/D-8c se resolvieron en el diseño/implementación backend y D-8d queda completada en esta actualización. D-8e sigue pendiente y no se inicia aquí.

### Cobertura propuesta para D-8c–D-8e

Esta batería quedó escrita al cierre de D-8a, antes del diseño backend simplificado. La implementación aprobada en D-8c reemplazó el feed comunitario/eventos por un resumen personal de Rates actuales; para el estado vigente, los resultados realizados y el smoke pendiente se detallan en D-8d y D-8e.

- Comprobar contrato de lista/actividad, `type=rate`, orden `occurredAt DESC` y desempate determinista; incluir `set` y `change` según opción, excluir portada, eliminar o explicitar notas nulas.
- Cubrir ledger parcial sin afirmar historia anterior a `started_at`, disco eliminado, usuario/autorización y campos mínimos de autor. Verificar que `editedAt` de una edición de portada o nota idéntica no se interpreta como operación musical.
- Componente: opción semanal/persona o comunitaria aprobada; uno, cinco y cero resultados; notas cero reales; estado loading/empty/error distinto; reintento; sin filtrado que pueda alterar orden del servidor.
- Ciclo de vida: petición solo al montar el slot habilitado, cancelación al desmontar, descarte de respuesta tardía, cambio/logout/login de sesión y dos widgets/slots independientes donde aplique.
- Grid: mantener `ultimosVotos`, tamaño, orden y configuración móvil/escritorio; al desactivar no hay petición y al reactivar se monta/carga de nuevo.
- Regresión: conservar imagen fallback, título/artista/nota y cualquier navegación que producto apruebe; sin peticiones desde `DashboardPage.vue`; errores no se presentan como ausencia de votos.
- Accesibilidad/responsive: nombre anunciado de nota y autor/fecha si se acuerdan, fallback de portada rota, truncado legible y verificación visual con tamaños móvil y escritorio. Smoke autenticado contra backend integrado; distinguir evidencia local de CI.

## D-8d — Frontend «Tu semana musical»

**Estado:** completada el 2026-10-27. Se implementó la composición frontend del contrato backend D-8c; no se modificó backend, registro, preferencias ni otros widgets.

### Componente y servicio

Se creó `src/views/dashboard/components/DashboardLatestVotesWidget.vue`. El slot existente `ultimosVotos` monta este componente; `DashboardPage.vue` ya no contiene la consulta paginada antigua a `/rates`, su estado, su transformación, su plantilla ni su CSS. `DashboardWidgetGrid.vue` conserva el montaje condicional: cuando el módulo está desactivado el componente no existe y no inicia su petición. ID, tamaño, orden y preferencias permanecen intactos.

`src/services/rates/rates.ts` expone `getRatesDashboardSummary(signal?)`, usando el cliente `api` compartido para `GET /rates/dashboard-summary` y devolviendo el cuerpo tipado. `RatesDashboardSummaryDto` y sus tipos anidados reflejan el DTO real del backend: `period`, `metrics` (incluido `weekOverWeek`) y `recentRates`; no se tipan entidades TypeORM, no se consume `rate_vote_events` y no se descarga una colección de Rates para agregarla en Vue. La firma antigua de otros consumidores Rates se dejó intacta.

### Datos presentados

La cabecera se titula **Tu semana musical**. El intervalo se obtiene de `period.start` y `period.endExclusive` del DTO; se presenta en español con la zona indicada por el backend (`Europe/Madrid`). Para el extremo visible se muestra el último instante del intervalo semiabierto, sin calcular otra semana en el cliente.

Las tres cifras usan exclusivamente agregaciones backend: `activeRates` como **Rates activos** (incluye Rates solo de portada), `averageMusicalRate` como **Media musical** (un decimal como máximo y `—` cuando es `null`) y `distinctGenres` como **Géneros**. El bloque complementario presenta `bestRatedDisc` si existe, `dominantGenre` y el conteo `activeRates` que el DTO entrega para ese género. Sin disco musical se muestra “Sin notas musicales esta semana”; sin género, “Sin datos”.

La comparación consume `weekOverWeek.difference`: positiva con `+`, negativa con signo menos y cero como “Sin cambios respecto a la semana pasada”. Se muestra `percentageChange` solo cuando es numérico y no nulo. Los valores describen Rates actuales por su última actividad, conforme al contrato backend; no se infieren primeras valoraciones ni una secuencia de cambios.

La lista **Tus últimos 5 votos** usa hasta las primeras cinco entradas de `recentRates` en el orden recibido, sin reordenar. Muestra disco/artista, fecha de última actividad en `Europe/Madrid`, nota musical y nota de portada disponibles. Una Rate solo de portada conserva su puntuación y no recibe una nota musical inventada; el valor musical `0` se representa. Sin imagen se reutiliza `src/assets/disco.png`, y sin ID UUID válido o metadatos requeridos no se ofrece la acción de abrir detalle. Con datos suficientes, el nombre abre el detalle de álbum mediante el componente existente `DiscDetail`, siguiendo el patrón de `DiscCardComponent`.

Cuando `activeRates` es cero pero hay Rates actuales, el widget informa que no hubo actividad esta semana y mantiene la lista reciente. Si no hay actividad ni Rates recientes, presenta el estado discreto de usuario sin Rates. Así, una semana vacía no oculta Rates de semanas anteriores.

### Estados y ciclo de vida

La instancia mantiene respuesta, carga, error, reintento y detalle seleccionado localmente. El skeleton corresponde a métricas, resumen y cinco filas; el error es distinto del empty y permite reintentar. La petición inicia al montar el slot, solo con sesión autenticada y `userId`; el cliente recibe `AbortSignal`. Unmount o cambio de sesión cancela la petición, invalida sus datos y la respuesta tardía no reemplaza el resultado de la sesión nueva. No hay caché nueva ni sincronización automática con votos.

### Pruebas y verificaciones

`DashboardLatestVotesWidget.test.ts` cubre petición/abort signal, período DTO y formato Madrid, métricas y `null`, mejores datos, género dominante y ausente, comparaciones positiva/negativa/sin cambios, lista limitada y orden backend, Rate solo de portada, valor cero, fallback, ID incompleto, usuario vacío, semana sin actividad con Rates anteriores, loading, error/reintento, desmontaje, respuesta obsoleta/cambio de sesión y activación/desactivación del slot en el grid. `services/rates/rates.test.ts` verifica endpoint y propagación de `AbortSignal`. `DashboardPage.test.ts` comprueba que la vista compone el nuevo widget y ya no contiene la petición anterior.

Verificación local: tests focalizados **3 suites / 22 tests aprobados**; suite completa **76 archivos / 504 tests aprobados**; `pnpm run typecheck` y `pnpm build` aprobados; ESLint focalizado de componente y tests aprobados; detector Impeccable `[]`; `git diff --check` aprobado. `identity:boundaries` encontró cero violaciones productivas. `cycles` conserva un ciclo type-only informado entre Articles/Contents/Playlists; su comparación es informativa porque no resolvió el `HEAD` local. El lint incluyendo todo `rates.ts` sigue señalando cinco usos `any` de métodos preexistentes, fuera de las líneas añadidas; no se modificaron.

El build mostró warnings de minificación CSS para `.flex-[2]` y de chunk mayor de 500 kB, y las herramientas notificaron que Browserslist usa datos antiguos. No se corrigieron ni se atribuyen a este cambio. No se realizó prueba visual en navegador ni sesión autenticada contra el backend desplegado.

### Limitaciones y siguiente paso

El widget refleja la última actividad actual de cada Rate según el endpoint, no toda modificación histórica; Rates eliminadas ya no están disponibles. La base de datos no se consultó y sigue pendiente la verificación ambiental de tipo/zona de almacenamiento anotada en D-8c backend. No hubo refresco automático tras votar, según alcance. D-8e queda pendiente de smoke test manual autenticado y comprobación responsive en la aplicación integrada.

### D-8d.1 — Compactación visual

Se compactó exclusivamente `DashboardLatestVotesWidget.vue`: cabecera en una línea cuando cabe, comparación en texto discreto y métricas centradas en una secuencia inline sin tarjetas ni fondos (`20 Rates activos · 8,3 Media musical · 13 Géneros`). En pantallas estrechas la secuencia solo envuelve si no cabe. Los acentos de métricas y títulos usan variantes de alto contraste para el tema claro y tonos claros para dark mode. El estilo global `button` de `src/style.css` aplica fondo negro, borde y padding por defecto; ambos botones de nombre de disco los neutralizan localmente para quedar como texto enlazado sin caja, manteniendo indicación de foco por subrayado. Mejor nota muestra `disco — artista` con la nota al lado (badge opcional); género dominante muestra `género · N votos`. Ambas secciones y las filas recientes centran su texto. Cada fila reciente conserva `disco — artista (fecha)`, portada y columnas fijas sin fondo para las notas musical y de portada, alineadas entre filas. Los nombres y metadatos envuelven para conservarse completos. En móvil se conserva la misma jerarquía sin scroll horizontal; los bloques complementarios se apilan hasta que hay ancho suficiente para dos. Skeleton, error, sesión y vacío también mantienen la densidad compacta sin cambios funcionales.

No se tocaron estado, DTO, servicio, endpoint, orden, interacciones existentes, DashboardPage, registro ni preferencias. Las pruebas cubren que el título de la mejor nota abre el detalle y comprueban los textos «disco — artista (fecha)» y «género · N votos». Verificación local: 10 tests focalizados aprobados, ESLint focalizado, typecheck, build y `git diff --check` aprobados. El build mantiene los avisos preexistentes de Browserslist, `.flex-[2]` en minificación CSS y tamaño de chunk; no se atribuyen a este ajuste. No se realizó smoke test visual en la aplicación autenticada. D-8e continúa pendiente.

## D-WORLD-1 — Auditoría y diseño de «Tu mundo musical»

**Estado:** auditoría documental completada el 2026-10-27. No se modificó código funcional, backend, dependencias ni datos geográficos. Se preservan el identificador `mundoMusical`, su tamaño/orden y las preferencias desktop/mobile.

### Fuentes y límites de evidencia

Se revisaron `DashboardPage.vue`, `DashboardWidgetGrid.vue`, `dashboardWidgetRegistry.ts`, servicios y tipos frontend de Rates, Catalog, Countries y Discs, tests presentes, dependencias y la documentación de arquitectura/convenciones. El checkout disponible es solo el frontend. Por ello, el path y el tipo TypeScript del endpoint son evidencia del contrato esperado por el cliente; la implementación SQL, guards, esquema real, restricciones e integridad de datos en producción requieren cotejo con el backend y la base desplegada. No se asumieron como hechos.

### Funcionamiento actual

El slot `mundoMusical` de `DashboardPage.vue` presenta un Top 10 de países: bandera, país, posición, barra y `count` con `percentage`. No es un mapa geográfico. La vista transforma `response.countries` a `{ isoCode, name, count, pct }`; convierte el código a minúsculas para CircleFlags y aplica `COUNTRY_ABBR` por coincidencia exacta del nombre para abreviar United States y United Kingdom. Esta transformación solo sirve para presentación y no valida códigos ni determina la semántica del conteo.

El cliente usa `getRatesHomeInsights()` de `src/services/rates/rates.ts`, que llama `GET /rates/home-insights` con el Axios compartido (base API `/api`). La respuesta tipada reúne `topArtists` y `countries`; la misma petición alimenta también «Tus artistas favoritos». No se descargan discos completos para dibujar este widget y no se calcula aquí la distribución: el servidor ya entrega una agregación por país. No se encontró test específico del contrato `RatesHomeInsightsResponse` ni de `getRatesHomeInsights`; `DashboardPage.test.ts` sí conoce/mockea el servicio, dentro de su cobertura de composición.

`DashboardWidgetGrid` solo crea el slot y su componente si el módulo está enabled. Sin embargo, en el comportamiento actual la llamada pertenece al `onMounted` de `DashboardPage`: se lanza una vez cuando artistas o mundo musical está habilitado en la configuración del viewport activo. Así, no consulta si ambos están desactivados al montar y tampoco reacciona a una activación posterior; si se desactiva el último durante la sesión no cancela la llamada ya lanzada. Loading y datos viven en refs del padre, sin caché compartida explícita ni `AbortSignal`; errores se silencian y se presentan como vacío cuando el `finally` baja loading. No hay reintento visible. Tampoco se observa watcher de sesión, limpieza de datos ni repetición de la consulta al cambiar de usuario sin desmontar la ruta. Estos límites aplican a este request compartido, no implican que no exista estado de sesión para otros datos del Dashboard.

Se pueden reutilizar `id`/slot/registro/preferencias, el endpoint y su fetch mientras se confirme su semántica, además del patrón del grid para montar bajo demanda. Deben salir de `DashboardPage.vue` el HTML del ranking actual, la transformación/alias de nombres, los refs `musicMapData`/`musicMapLoading` y el acoplamiento de la carga de insights con la visibilidad de dos widgets. La futura vista raíz solo compondrá `<DashboardMusicalWorldWidget />` en el slot; el componente será dueño de su consulta y ciclo de vida.

### Modelo de países y calidad geográfica

El tipo frontend `Country` contiene `{ id: string, name: string, isoCode: string | null }`, expuesto tanto desde Catalog (`GET /catalog`) como Countries (`GET /countries`, `/countries/all`). Los IDs son strings opacos, no claves geográficas. `Artist` lleva un único `country` opcional o `null`, con `{ id, name, isoCode? }`; la interfaz de `Disc` referencia un artista. No hay en los tipos revisados relación de países múltiples por artista ni una columna country propia del disco. Los filtros de Catalog transportan `countryId`.

La semántica prevista es, por tanto, un país por disco siguiendo `Disc → Artist → Country`. Si el modelo backend real admite múltiples países por artista, hay que decidir el tratamiento antes de implementar porque podría atribuir un mismo disco a varios territorios y romper el total aditivo; no se deduce que los admita por el tipo frontend actual. País nulo/countryId nulo debe ir al grupo «sin país conocido»; filas sin código válido y territorios especiales deben conservarse en una métrica de «sin representación geográfica» o identificarse explícitamente, nunca asignarse por similitud de nombre.

El campo se llama `isoCode`, es nullable en Country y string libre en la capa de tipos: no se declara longitud ni validación ISO. El endpoint de insights devuelve `isoCode: string`, nombre, conteo y porcentaje. El uso de CircleFlags pasa el código en minúsculas, pero solo acredita esa convención visual; no confirma que todos los valores sean ISO 3166-1 alpha-2. En otra parte del frontend se reconoce el valor especial `int`, que no es código de país ISO, y hay componentes que recortan los dos primeros caracteres: tampoco son validadores. El catálogo frontend no permite determinar valores históricos/personalizados, duplicados por código, nombres inconsistentes ni cobertura real de ISO. No se consultó la base de producción y no se modificarán registros.

Antes del mapa se necesita un chequeo de calidad read-only del catálogo del backend: valores distintos de `isoCode`, nulos, duplicados, códigos inválidos y códigos especiales; cruzarlo por código (no por nombre) con el recurso cartográfico. Los nombres serán etiquetas del catálogo; el código normalizado ISO alpha-2 válido será la clave de unión. Duplicados con el mismo ISO deben consolidarse; códigos ambiguos o no ISO no se deben «arreglar» ni mapear a ojo en frontend.

### Datos y recomendación de backend

`GET /api/rates/home-insights` es el único endpoint reutilizable observado y ya entrega países agregados, por lo que no hay necesidad demostrada de descargar discos ni de crear inmediatamente otra ruta. No obstante, con el checkout frontend no se puede confirmar que su `count` signifique discos distintos del usuario autenticado, que filtre `rate IS NOT NULL`, que cuente cero, que excluya Rates solo de portada, ni cómo calcula `percentage` y responde para usuario/session. Tampoco se puede confirmar si agrupa por país de artista o si un join puede duplicar discos. La respuesta actual carece de total conocido/desconocido explícito.

En D-WORLD-2 verificar la implementación Rates/backend y decidir si extender compatiblemente `/rates/home-insights` o crear endpoint especializado solo si su payload mixto/topArtists, política de caché o semántica existente impiden contrato claro. El servidor debe derivar usuario de autenticación, no aceptar un userId del cliente, filtrar Rate musical no nulo (0 incluido), enlazar Rate→Disc→Artist→Country, usar `COUNT(DISTINCT disc.id)` y no ponderar por nota. Con artista de país singular, cada disco entra como máximo en una agrupación. Las filas de varios Rates del usuario/disco o joins auxiliares no deben multiplicar el conteo. Recomendar devolver códigos y nombres de catálogo con `discCount`, `totalRatedDiscs`, `knownCountryDiscCount` y `unknownCountryDiscCount`; separar códigos ISO inválidos/no representables permite cuadrar la suma sin ocultar datos. Si el contrato actual ya satisface todas estas reglas y expone totales coherentes, reutilizarlo sin cambio backend; si no, el ajuste pertenece a D-WORLD-2. No se fija aquí una ruta HTTP nueva ni se cambia contrato.

### Tecnología y geometría

No hay librería geográfica identificada en `package.json`/lockfile (`d3-geo`, `topojson`, Leaflet, Mapbox, etc.). Las dependencias existentes no incluyen una solución cartográfica. Para un coroplético SVG estático con paths de features se recomienda `d3-geo` (ISC), importando solo utilidades de proyección y `geoPath`, más SVG Vue nativo para colorear, foco, selección, tooltips y etiquetas. `d3-geo` aporta geometría/proyección, no UI; evita una API/servicio y es bastante más acotado que un mapa navegable. Comparado con generar paths al compilar y no añadir librería, requiere dependencia pero facilita proyección responsive, clipping y geometría esférica correcta. No recomendar Leaflet/Mapbox/Google Maps para este alcance. La geometría también puede venir preconvertida como SVG paths, pero añade tarea de generación y dificulta actualizar/probar procedencia y simplificación.

Como fuente, Natural Earth Admin 0 Countries 1:110m es apropiada para escala mundial de widget: la página oficial informa una descarga de países de 210.08 KB (versión 5.1.1), uso public domain y 258 unidades; geometría generalizada para vista global, no fronteras detalladas. Natural Earth representa fronteras de facto y algunas entidades/disputas según su criterio. Su shapefile no incluye por sí solo un contrato garantizado de join alpha-2 consistente para cada territorio y algunas geometrías carecen de ISO, así que la conversión local debe conservar atributos alpha-2/alpha-3 y auditar excepciones.

`world-atlas` ofrece TopoJSON 110m derivado de Natural Earth y un archivo optimizado, pero su repositorio está archivado desde 2023 y su documentación identifica las geometrías con ISO numérico de tres dígitos, menos directo que `Country.isoCode`; no se recomienda como primera opción. El paquete `datasets/geo-countries` publica GeoJSON con ISO alpha-2/alpha-3 y documenta excepciones `-99` (incluidas entidades sin ISO y correcciones para Francia/Noruega), pero la generación automática usa Natural Earth 10m y el archivo no está orientado al peso mínimo del Dashboard. Recomendación: crear, durante D-WORLD-3b, un GeoJSON local derivado/pinneado de Natural Earth Admin-0 110m, con propiedades mínimas `iso_a2`, `name` y geometría, geometría simplificada para pantalla pequeña y licencia/fuente/versión/proceso documentados. Medir tamaño bruto y comprimido y validar códigos contra el catálogo antes de incorporarlo. Mantenerlo como asset del repo, sin petición externa en runtime; importación dinámica o chunk independiente para no inflar el bundle inicial.

La referencia ISO alpha-2 de catálogo coincide naturalmente con el tipo de propiedad a preparar. Las entidades especiales sin código ISO no deben unirse por nombre; mapear solo claves alpha-2 validadas y contabilizar el resto como no representable. La revisión del dataset debe comprobar Francia/Noruega, territorios, valores sin código, duplicados y códigos de catálogo que falten. No se incorpora geometría en D-WORLD-1.

### Color, cifras e interacción

Usar un único color neutro de tierra/contorno para cero y una rampa secuencial de la identidad Riff Valley (azul hacia violeta/pink), comprobada en claro/oscuro y con borde distinguible. La intensidad debe basarse en `discCount`, no en nota ni porcentaje. Como unos pocos países pueden dominar, usar inicialmente rangos discretos o transformación logarítmica; preferir 4–5 tramos derivados del histograma real (por ejemplo cortes en cuantiles/geometric breaks), con leyenda en cantidades y ejemplo de cero. No fijar umbrales hasta inspeccionar una muestra agregada real, sin datos personales, del backend. En una distribución extremadamente dispersa la escala log conserva países con pocos discos; rangos son más fáciles de explicar. Evitar normalización puramente lineal si vuelve invisibles los países de cola.

No rotular todos los países. En SVG, proponer etiquetas de conteo únicamente para polígonos con área renderizada suficiente y para un subconjunto relevante (Top 5/seleccionado); ubicar en punto interior comprobado, no centroides ciegos de islas o multipolígonos. Resolver colisiones en coordenadas de pantalla y recalcular/filtrar al cambiar tamaño; en móvil reducir a selección y quizá Top 3, con labels permanentes ocultas en países pequeños. La cifra sigue disponible siempre en tooltip o detalle seleccionado y en la lista Top 5. Un componente independiente del mapa solo se justifica si la implementación visual/geometría y controles accesibles resultan suficientemente complejos; no añadir componentes de ranking/leyenda por anticipado.

Hover de escritorio presenta país, número de discos y `% sobre total con país conocido`. Click selecciona; toque selecciona igual y deja el detalle estable hasta cerrar/cambiar selección, sin dependencia de hover. En teclado, cada feature con datos debe ser alcanzable en orden razonable (preferible SVG con `role=button`, etiqueta accesible, `tabindex` roving y flechas entre países; Enter/Espacio selecciona). El detalle accesible se anuncia con live region moderada. Añadir una alternativa DOM: Top 5 y lista/selector accesible de países explorados o tabla expandible, suficiente para teclado/lector de pantalla y para países minúsculos. No confiar en color solo; incluir cifra, texto y estado seleccionado visible.

### Resumen, coherencia y responsive

Debajo o al costado del mapa, presentar Top 5 ordenado por discos descendentes con desempate estable por nombre/código, cada país con conteo y porcentaje sobre `knownCountryDiscCount`. Incluir países distintos explorados (`discCount > 0` agrupados por ISO válido), país dominante (regla de empate estable y aclarada) y discos sin país conocido. Si la respuesta se limita a países con ISO y queda una categoría no representable, mostrarla separada para cuadrar: `totalRatedDiscs = knownCountryDiscCount + unknownCountryDiscCount + unrepresentedCountryDiscCount` según definición de backend. Si artista tiene un solo país, suma de grupos distintos debe igualar total de discos musicales con país asignado. Porcentaje de hover/Top 5 usa siempre conocido como denominador; los sin país no se distribuyen artificialmente. Cero total produce porcentaje `—` y estado vacío, no NaN.

Escritorio: mapa protagonista en columna amplia, resumen Top 5 al lado cuando el ancho del slot half widget lo permita; como el registro actual define `mundoMusical` como half, evitar exigir el ancho full y diseñar una composición de una columna para el contenedor actual, o proponer cambiar tamaño en D-WORLD-3b solo con evaluación del grid y preferencias (no cambiar registry en esta auditoría). Tablet: mapa arriba y Top 5 abajo/2 columnas si cabe. Móvil: SVG escala al ancho del widget sin overflow, leyenda compacta y lista Top 5/detalle seleccionable; sin requerir ampliar el Dashboard ni tocar microestados insulares. Priorizar interacción de lista en áreas muy pequeñas.

### Estados, sesión y rendimiento

El widget futuro debe iniciar su consulta al montarse (el grid ya no monta slots desactivados), pasar `AbortSignal` si el cliente soporta cancelación y descartar respuestas obsoletas. Al cambiar `userId`/logout limpiar selección y datos previos y cargar bajo la identidad autenticada; al desmontar cancelar. Loading, error de red con reintento, usuario sin Ratings musicales (empty útil), datos con discos sin país, y países no mapeables son estados distintos. Un país que tenga votos pero no corresponda a geometría se comunica como no representable; no desaparece silenciosamente. Un usuario sin sesión no inicia petición. La geometría local se carga bajo demanda junto al componente, idealmente con `import()` dinámico en chunk separado; no se descarga por hover/click ni desde servicios remotos. Evitar store o composable global: estado es propio del widget y no se comparte con otros widgets; el endpoint Rates conserva ownership de datos.

### Arquitectura propuesta

Extraer a `src/views/dashboard/components/DashboardMusicalWorldWidget.vue`, usando Composition API + `<script setup lang="ts">` según convención Vue. Mantiene request tipada, estado/cancelación/sesión, transformación de agregados, mapa SVG, tooltip/selección/teclado, leyenda y Top 5. DashboardPage solo conserva `<template #mundoMusical><DashboardMusicalWorldWidget /></template>` e import/registro del componente; no lógica Rates, mapping ni markup. `DashboardWidgetGrid` mantiene el control enabled existente, `dashboardWidgetRegistry.ts` conserva el ID/tamaño/orden, y Account conserva preferencias actuales. No mover Dashboard a `src/modules/dashboard`, crear store ni composable por defecto. Un posible `WorldMapSvg.vue` solo se separaría si se demuestra una responsabilidad visual autónoma o reutilización; la primera versión puede ser un componente dueño del feature para evitar fragmentar.

### Pruebas propuestas para la implementación

1. Backend/fixture de agregación: discos distintos pese a joins/repeticiones; excluir Rate con nota musical null (portada solamente), incluir nota `0`, filtrar usuario autenticado, usar país de artista y no ponderar puntuación.
2. Datos/geografía: country nulo; códigos alpha-2 válidos, nulos, especiales e inválidos; código sin feature, feature sin código; código duplicado y país desconocido; distribución por país; coherencia del total/conocido/sin país/no representable y porcentajes; Top 5, desempates estables y dominante empatado.
3. Presentación: color por rangos con muestras límite; cero neutral; tooltip con nombre/valor/porcentaje; click selecciona; toque abre detalle persistente; navegación y selección por teclado; etiqueta opcional sin superposición en tamaños desktop/tablet/mobile; leyenda legible en claro/oscuro; SVG/Top 5 sin overflow responsive y alternativa textual disponible.
4. Estados/ciclo: loading, empty sin Rates musicales, Rates sin país, error y retry, cambio de sesión y limpieza, cancelación al desmontar, respuesta tardía obsoleta ignorada, widget disabled sin petición, reactivación y sesión ausente sin petición.
5. Integración: mantener ID/preferencias/slot, no regresión de los otros widgets ni doble llamada por artista/mundo una vez se decida si artistas seguirá usando el endpoint compartido.

La cobertura debe separar pruebas backend de SQL/guards (D-WORLD-2) y tests frontend unitarios/de componente (D-WORLD-3a y D-WORLD-3b). El smoke test de escritorio/móvil pertenece a D-WORLD-4.

### Plan

| Tarea | Alcance | Estado | Tamaño | Dependencias |
|---|---|---|---|---|
| **D-WORLD-1 — Auditoría** | Funcionamiento, datos/países, geometría, contrato, interacción, arquitectura y pruebas propuestas | **Completada** | M | — |
| **D-WORLD-2 — Datos y backend** | Verificar `/rates/home-insights`, SQL/guards y datos de países; ajustar contrato de agregados/totales solo si no satisface reglas | Parcialmente completada; implementación lista, falta auditoría del catálogo con PostgreSQL | S–M | D-WORLD-1; acceso al backend y chequeo de catálogo |
| **D-WORLD-2b — Endpoints geográficos separados** | Top 10 SQL para Dashboard, distribución completa para mapa, consulta compartida y restauración de `home-insights` | Implementación terminada; integración PostgreSQL/códigos reales pendientes | M | D-WORLD-2 |
| **D-WORLD-3a — Top 5 de «Tu mundo musical»** | Widget autónomo, consulta `/rates/geography/top`, estados y cancelación, extracción del slot y pruebas | **Completada** | M | D-WORLD-2b |
| **D-WORLD-3b — Mapa mundial a pantalla completa** | Geometría local, carga bajo demanda, mapa accesible y modal a pantalla completa | **Completada** el 2026-10-27; smoke visual/manual pendiente en D-WORLD-4 | L | D-WORLD-3a; auditoría ISO |
| **D-WORLD-4 — Smoke tests** | Validación manual con sesión del Top 10 y mapa/colores/selección en escritorio y móvil | Pendiente | S | D-WORLD-3b; backend integrado |

La implementación se divide en **D-WORLD-3a — Top 10 de «Tu mundo musical»** (widget y datos de `/geography/top`) y **D-WORLD-3b — Mapa mundial a pantalla completa** (geometría y modal bajo demanda).

### Decisiones pendientes para D-WORLD-2/3

- Confirmar en backend que `/rates/home-insights` ya satisface autenticación y definición musical; si no, ajustar dentro de Rates. No hace falta aprobación para auditarlo; el cambio backend pertenece a la siguiente tarea y no está autorizado por D-WORLD-1.
- Definir con distribución real los cortes de escala y validar el tamaño final comprimido de la geometría; la recomendación es rangos no lineales y Natural Earth 110m, respectivamente.
- Confirmar si el tamaño half actual ofrece ancho útil suficiente para un mapa protagonista en desktop; conservarlo inicialmente y solo cambiar tamaño del registry en D-WORLD-3b si el diseño validado lo requiere.
- Fijar tratamiento de cualquier relación multi-país que revele el modelo backend. El modelo frontend actual solo representa un país por artista.

Fuentes geográficas consultadas: [Natural Earth Admin 0 Countries 1:110m](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/), [documentación de world-atlas 110m y sus IDs numéricos](https://github.com/topojson/world-atlas/blob/master/README.md), [conversión Natural Earth a GeoJSON y limitaciones de códigos](https://github.com/datasets/geo-countries), y [d3-geo](https://github.com/d3/d3-geo). La geometría no se descargó ni incorporó.

### Resultado D-WORLD-2 — datos geográficos backend

**Estado:** agregación compartida implementada; auditoría de datos reales y PostgreSQL pendiente. No se modificó frontend, escritura de Rates, entidades, registros de Country, tablas ni migraciones.

La regla común está en `RatesStatsService.queryGeography(userId, limit?)`: una consulta SQL parametrizada por el ID de sesión filtra `rate.rate IS NOT NULL` (incluye cero), une Rate→Disc→Artist→Country y usa `COUNT(DISTINCT disc.id)`. `Disc` puede tener cero o un Artist según la nulabilidad de la relación; Artist tiene Country nullable. Los left joins mantienen los discos sin artista/país como unmapped. Duplicados Rate no inflan conteos; no se consultan eventos, no se ponderan notas y no se leen votos de otros usuarios.

El código se normaliza a mayúsculas y se agrupa por alpha-2 de formato; códigos nulos/inválidos y país ausente quedan en `unmappedDiscs`. No se infiere país por nombre. La agrupación consolida Country rows con el mismo código y usa `MIN(country.name)` para una etiqueta determinista. El orden estable es discos DESC y código ASC. `mappedDiscs` acredita formato de dos letras, no pertenencia a ISO oficial ni presencia en la geometría; el cruce con Natural Earth continúa pendiente.

### D-WORLD-2b — Separación de Top 10 y distribución mundial

Se añadieron dos rutas Rates autenticadas, ambas con `@Auth()` y `@GetUser()` y sin parámetro de usuario:

- `GET /api/rates/geography/top` devuelve `{ countries: [{ isoCode, name, count, percentage }] }`. La consulta agrupa y ordena primero en PostgreSQL y limita a 10 con `LIMIT $2`; el denominador mapped y porcentajes se calculan globalmente en la misma consulta antes de limitar. Respuesta porcentual con dos decimales.
- `GET /api/rates/geography/world` devuelve `{ totalRatedDiscs, mappedDiscs, unmappedDiscs, countryCount, countries }` con la distribución completa y dos decimales. No incluye geometría; pensado para la apertura bajo demanda del futuro modal.

`RatesGeographyCountryDto` se comparte entre los dos DTO de respuesta. Ambos endpoints llaman la misma agregación; solo cambian el límite SQL y la proyección de respuesta.

`GET /api/rates/home-insights` conserva la ruta, `@Auth()`, `@GetUser()`, `topArtists` (siete máximo), `countries` Top 10 y sus campos/formato preexistentes. Reutiliza la agregación limitada a diez y ya no expone los totales que D-WORLD-2 añadió exclusivamente para el mapa. `percentage` continúa como entero para respetar ese consumidor; la nueva ruta Top usa dos decimales. No se modificó frontend y «Tus artistas favoritos» conserva su consulta, orden y payload.

**Límite de cobertura ISO:** `Country.isoCode` es `varchar(50)` nullable y la entidad no impone longitud ni normaliza valores. `Country` guarda un solo nombre y no modela alias ni nombres históricos. `CreateCountryDto` no acepta el campo y los tests de servicio muestran esa restricción; no se encontraron semillas/versiones de catálogo en el checkout. La expresión SQL comprueba formato alpha-2, no pertenencia a la lista oficial ISO ni presencia en la futura geometría. No fue posible consultar valores, nulos, duplicados o nombres alternativos reales: el `.env` apunta a loopback, pero PostgreSQL no está escuchando (`pg_isready` sin respuesta). Por tanto, códigos alpha-2 sintácticamente válidos pero especiales/no incluidos en el GeoJSON aún cuentan como mapped en este contrato; D-WORLD-3b deberá cruzarlos por código con la geometría local y exponer/contabilizar cualquier código sin feature. No se modifican países almacenados.

Tests focalizados actuales: `rates-stats.service.spec.ts` y `rates.controller.spec.ts`, 2 suites / 27 tests; cubren Top 10 limitado en SQL, menos/ningún país, distribución completa, porcentajes, orden, user.id, guard/`@GetUser()`, campos originales de `home-insights` y `topArtists`, y SQL común para ambas rutas. Typecheck y build/runtime dependency gate aprobados; ESLint focalizado aprobado; quality:structure conserva 9 hallazgos baseline y 0 nuevos; quality:types conserva 5 y 0 nuevos; `git diff --check` aprobado. Los tests de servicio inspeccionan SQL/transformaciones con dobles; no ejecutan PostgreSQL. El servidor local no está escuchando, por lo que no hubo prueba PostgreSQL ni auditoría de códigos/duplicados en los datos reales.

D-WORLD-2 queda parcialmente completada hasta inspeccionar catálogo real y correspondencia de códigos. D-WORLD-2b queda implementada; no se añadió dependencia, caché, endpoint genérico ni migración. D-WORLD-3a y D-WORLD-3b quedan completadas en frontend; D-WORLD-4 (smoke tests manuales) sigue pendiente.


### D-WORLD-3a — Top 5 de «Tu mundo musical»

**Estado:** completada. Se creó `src/views/dashboard/components/DashboardMusicalWorldWidget.vue`; `DashboardPage.vue` conserva el slot `mundoMusical` y lo limita a montar el nuevo componente. Se mantienen ID, tamaño, orden, preferencias y grid existentes.

El servicio compartido `src/services/rates/rates.ts` expone `getRatesGeographyTop(signal?)`, usando el cliente Axios existente para `GET /rates/geography/top`. `RatesGeographyTopResponseDto` representa exactamente `{ countries: [{ isoCode, name, count, percentage }] }`. El widget muestra hasta cinco países en orden de backend, con la bandera junto al nombre y el conteo alineado con su barra. Calcula el ancho de cada barra respecto al mayor `count`; no usa ni reordena por `percentage`.

La página dejó de transformar o presentar países. La llamada `getRatesHomeInsights()` y la UI inline de «Tus artistas favoritos» se conservan sin cambios funcionales; la llamada solo se inicia cuando ese widget está activo, evitando trabajo duplicado cuando se muestra únicamente Mundo musical.

El widget mantiene estado local para carga, vacío, error y reintento. El watcher de sesión aborta peticiones al cambiar usuario/generación, invalida respuestas tardías y no consulta sin sesión autenticada. El grid desmonta el widget cuando está desactivado, por lo que no genera peticiones; al reactivarlo se vuelve a solicitar el Top 5. El botón «Explorar mapa mundial» emite el evento tipado `exploreMap` y abre el modal incorporado en D-WORLD-3b; el modal y su geometría se cargan bajo demanda.

Pruebas: servicio endpoint/DTO/AbortSignal; widget inicial, top 5, lista corta/vacía, orden, escalado, máximo, truncado, error/reintento, cancelación, respuesta de sesión anterior, estado sin sesión, activación del grid y ausencia de `/geography/world`/geometría; DashboardPage conserva `home-insights` para Artistas favoritos. `isoCode` es obligatorio en el DTO real, por lo que la respuesta no admite un país sin código.

Verificaciones: suites focalizadas **3 / 29 tests aprobados**; suite completa **77 archivos / 521 tests aprobados**; `pnpm run typecheck` y `pnpm build` aprobados; ESLint focalizado de widget, página y tests aprobado; Impeccable detectó `[]`; `cycles` encontró 0 ciclos nuevos y `identity:boundaries` 0 violaciones; `git diff --check` aprobado. La comparación local de los dos gates arquitectónicos usó `HEAD..HEAD` porque los cambios no estaban confirmados; sus escaneos del checkout actual quedaron limpios. ESLint aplicado a todo `rates.ts` informa cinco `any` preexistentes (líneas 142, 147, 156, 162 y 201), fuera del código añadido; no se modificaron. La build conserva warnings preexistentes: CSS para `.flex-[2]`, datos Browserslist desactualizados y el chunk principal superior a 500 kB.

D-WORLD-3b (mapa mundial a pantalla completa) queda completada; D-WORLD-4 (smoke tests manuales) continúa pendiente.


### D-WORLD-3b — Mapa mundial interactivo a pantalla completa

**Estado:** implementación frontend completada el 2026-10-27. D-WORLD-4 sigue pendiente para el smoke test manual autenticado, visual y responsive.

Se creó `DashboardMusicalWorldModal.vue` y se conectó desde el botón de `DashboardMusicalWorldWidget.vue`. El widget presenta un Top 5 compacto, mantiene su sesión y consulta `/rates/geography/top`; el modal conserva un Top 10 y se importa con `defineAsyncComponent` solo al abrirse. `DashboardPage.vue`, el ID/orden/tamaño de `mundoMusical`, registro y preferencias no cambian. Artistas favoritos conserva su única consulta `getRatesHomeInsights()` a `/rates/home-insights`; abrir o cerrar el mapa no la invoca ni la cancela.

`src/services/rates/rates.ts` incorpora `getRatesGeographyWorld(signal?)` con Axios compartido. `RatesGeographyWorldResponseDto` representa `{ totalRatedDiscs, mappedDiscs, unmappedDiscs, countryCount, countries }` y reutiliza los campos de país del contrato real `{ isoCode, name, count, percentage }`. No descarga Rates individuales ni calcula agregados en el navegador. World se solicita únicamente al montar el modal y se aborta al cerrarlo/desmontar o cambiar la sesión.

`MusicalWorldMap.vue` es el renderizador SVG local, con proyección Natural Earth mediante `d3-geo` 3.1.1 (más `@types/d3-geo` para compilación; no se incorpora D3 completo). El bundle de producción sitúa por separado el modal (12,75 kB; gzip 4,63 kB), renderizador (30,80 kB; gzip 11,98 kB) y geometría (350,18 kB; gzip 131,54 kB). Esos chunks no entran en el chunk inicial de Dashboard; geometría y renderizador solo se solicitan cuando el modal se abre. No hay servicios externos en runtime.

**Fuente y licencia:** asset local `src/views/dashboard/components/assets/world-countries-110m.min.json`, derivado de Admin 0 — Countries, Natural Earth 1:110m, versión 5.1.1 ([descarga oficial](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/)). Natural Earth publica sus datos raster/vector como dominio público; la atribución no es obligatoria y se muestra “Made with Natural Earth” como crédito recomendado ([términos oficiales](https://www.naturalearthdata.com/about/terms-of-use/)). La conversión conserva polígonos/propiedades mínimas y simplifica anillos con Ramer–Douglas–Peucker a tolerancia 0,1°; el JSON resultante pesa 350.178 bytes. El tamaño gzip indicado arriba corresponde al chunk emitido por Vite. La fuente es local, sin descarga de geometría al usar la app.

**Correspondencia de países:** se usa `ISO_A2_EH`, con fallback de fuente `ISO_A2`, y el cliente normaliza solo espacios/case y valida `^[A-Z]{2}$`; la unión final compara códigos, nunca nombres ni proximidad. Francia (`FR`) y Noruega (`NO`) usan los códigos corregidos de la propiedad EH. Kosovo (`XK`) coincide con el identificador de Natural Earth, conservando que no es un código ISO 3166-1 alpha-2 oficial. El asset tiene 177 entidades: 175 con códigos únicos y dos áreas sin código (`N. Cyprus` y `Somaliland`), que se pintan neutras y no se adjudican a otro país. Los códigos válidos del backend sin feature y las entradas ISO inválidas/duplicadas se conservan en la lista textual “Países no representados en el mapa”; no se corrigen países almacenados ni se ocultan las filas. `unmappedDiscs` del backend se presenta aparte, pues son discos sin código representable y no se puede deducir el país de cada uno.

**Mapa e interacción:** los países sin datos son neutros; los conteos positivos se asignan a hasta cinco bandas discretas agrupando valores distintos por rango de orden (empates comparten intensidad). La leyenda presenta los extremos reales de cada banda; cero tiene swatch neutro. La intensidad se calcula con `count`, nunca con `percentage`. Cada país con geometría y conteo positivo muestra su cifra compacta de 10 px, centrada en el centroide o en un punto interior de respaldo derivado de la geometría, salvo la lista fija de códigos pequeños `AD, AG, BB, BH, BN, DM, GD, KN, LC, LI, LU, MC, MT, MV, NR, SG, SM, ST, TO, TV, VC, KM, FM, KI, MH, PW, SC, XK, ME, MK, SI, CY`. La lista se aplica por ISO; no se calcula el área del polígono. Las cifras se dibujan en una capa SVG sobre todos los territorios para que no las tape otro país; el zoom permite separar etiquetas cercanas. Se conserva el Top 10 en el orden del backend. Hover y foco presentan detalle; click/Enter/espacio seleccionan; el ranking selecciona o deselecciona desde el mapa. El panel expone cantidad y porcentaje backend de discos con país conocido. Controles accesibles permiten zoom 1×–5×, desplazamiento por puntero/flechas y reset; el diálogo usa Teleport, Escape, trampa de foco, foco inicial/restaurado y bloqueo del scroll del body. En móvil el mapa y el resumen se apilan y el contenido desplaza dentro del modal, no en horizontal.

**Estados y sesión:** carga de Rates, error HTTP con reintento, vacío sin discos, sesión no disponible, y error de geometría local son estados distintos. Un fallo de geometría conserva el resumen y el ranking textuales. Solicitudes anteriores se invalidan por señal/request-id y por usuario/generación de sesión; al cerrar modal/widget se limpian listeners, scroll lock y petición. No se crea store global ni caché.

**Pruebas/verificaciones:** pruebas focalizadas de servicio/DTO y señal, no petición World antes de abrir, modal/foco/cierre/Escape, error/reintento, sesión/cancelación, Top 10, ISO/duplicados/no-código, recurso/identificadores, intensidades/leyenda, cifras en todos los países con datos excepto códigos pequeños predeterminados (incluye Francia, países nórdicos, Canadá 13, Rusia 1 e India 2; Brunei y Luxemburgo verificados), capa de etiquetas por encima de territorios, zoom con etiquetas cercanas, selección teclado/click y zoom/pan de teclado/reset; prueba de composición conserva `/home-insights` en Artistas favoritos. La suite completa aprobó **80 archivos / 542 pruebas**; el conjunto focalizado de Rates, helpers, widget, modal, SVG y composición Dashboard también pasó. `pnpm run typecheck`, `pnpm run build`, ESLint focalizado de los archivos nuevos/modificados (excluyendo `rates.ts`, que conserva cinco `any` preexistentes en funciones ajenas a este cambio), `pnpm run cycles`, `pnpm run identity:boundaries` y `git diff --check` pasaron. Los gates arquitectónicos compararon contra el mismo HEAD base del checkout; reportaron cero ciclos nuevos, cero violaciones y cero imports sin resolver. El build confirma chunking diferido y conserva los avisos anteriores de Browserslist, `.flex-[2]` al minificar CSS y chunk inicial de 674,63 kB (215,10 kB gzip). No se hizo validación visual en navegador real ni contra un backend desplegado; esos smoke tests corresponden a D-WORLD-4.

D-WORLD-4 — Smoke tests manuales de sesión real, escritorio y móvil — permanece pendiente.

## D-ART-1 — Auditoría de «Tus artistas favoritos»

**Estado:** completada el 2026-10-27. Auditoría funcional, backend, frontend y de experiencia; documentación únicamente. No se modificó código funcional ni el contrato HTTP.

### Funcionamiento y definición real

`GET /api/rates/home-insights` calcula un top personal de artistas usando las Rates actuales del usuario autenticado. El código agrupa filas Rate por artista, incluye solo `rate.rate IS NOT NULL` y ordena primero por `AVG(rate.rate) DESC`, luego por `COUNT(rate.id) DESC` y por `artist.name ASC`; aplica `LIMIT 7`. El promedio es el de las filas Rate del artista, cada fila con el mismo peso. La cantidad solo desempata: no combina promedio y volumen en una fórmula. El mínimo de Rates es uno. No se filtra por fecha de lanzamiento ni se pondera por antigüedad o por la fecha de voto.

Por tanto, el comportamiento es **artistas mejor valorados por su media personal**, no artistas con más discos valorados. Una sola nota alta puede quedar por delante de varias notas algo inferiores. Una Rate exclusivamente de portada no participa; una nota musical nula se excluye y una nota 0 sí participa. Modificar la nota actual puede cambiar media y orden; eliminarla o ponerla a `null` la excluye. No se cuentan discos distintos explícitamente: el backend usa `COUNT(rate.id)` y `AVG(rate.rate)`. El índice `rate(userId, discId)` es no único; si hay filas duplicadas de usuario/disco, se cuentan y ponderan varias veces. La ruta de escritura normalmente reutiliza una Rate existente, pero la base no garantiza unicidad. No hay tratamiento temporal que excluya discos futuros.

Orden de empates observado: media descendente, cantidad de filas Rate descendente y nombre ascendente. No hay un desempate final por ID; nombres idénticos con la misma media y cantidad pueden quedar en orden no determinista. El límite servidor es siete y el cliente presenta esas siete en dos filas (tres grandes y cuatro compactas). Cada artista aporta `id`, `name`, `image` (cadena vacía si falta), `averageRate` numérico y `ratingCount` numérico. El cliente muestra imagen/fallback, nombre en una línea y media con dos decimales; no muestra el conteo recibido. No hay enlace ni acción de navegación al detalle del artista.

### Contrato y ejecución de `home-insights`

La ruta no tiene parámetros. `@Auth()` protege el handler y `@GetUser()` entrega el usuario de sesión a `RatesStatsService`; no se acepta `userId` del cliente. La respuesta tipada es `{ topArtists: [{ id, name, image, averageRate, ratingCount }], countries: [{ isoCode, name, count, percentage }] }`. `topArtists` tiene máximo siete elementos; `countries` máximo diez. El DTO backend es una interfaz TypeScript, no un DTO de validación de entrada.

El servicio ejecuta en paralelo dos agregaciones: el QueryBuilder de Rates→Disc→Artist para artistas y una consulta SQL agregada de geografía para países. La agregación geográfica filtra Rates musicales no nulas, deduplica discos y devuelve hasta diez países. Así, una sola petición HTTP a `home-insights` causa dos consultas de base de datos y transmite hasta diez objetos de país que Artistas no utiliza. La respuesta de artistas, en cambio, es pequeña y agregada; no descarga entidades Rate ni discos completos. El backend aplica los filtros, grupos, medias, orden y límite; el frontend solo mapea campos y divide la lista para la plantilla.

Tras D-WORLD-3a/3b, Mundo musical usa `/api/rates/geography/top` y solicita `/api/rates/geography/world` al abrir su modal. Artistas sigue llamando `getRatesHomeInsights()`; el único consumidor frontend directo encontrado es `DashboardPage.vue`, además de sus pruebas. Se conservan deliberadamente las rutas y respuestas geográficas actuales. El servicio Catalog del frontend no participa en Artistas y no hay navegación Catalog desde las tarjetas.

### Código del widget y ciclo de vida actual

En `DashboardPage.vue` siguen el template completo; `ArtistEntry`, `topArtists` y `topArtistsLoading`; `fetchHomeInsights`; el mapeo de la respuesta; y la decisión inicial de cargar basada en `isEnabled(dashboardWidgetIds.artistas)`. La petición se inicia en `onMounted` si Artistas está habilitado en la configuración correspondiente al viewport. Si no está activo al montar, esa petición no ocurre. El slot solo compone contenido; todavía no hay `DashboardFavoriteArtistsWidget.vue`.

La carga tiene skeleton; respuesta vacía y fallo terminan en la misma rama vacía. El `catch` silencia el error, no hay reintento y el texto resultante invita a votar aunque el problema pudiera ser HTTP. El servicio no acepta `AbortSignal`; el desmontaje no cancela la solicitud y una respuesta pendiente aún puede resolver después. No hay vigilancia de sesión ni invalidación por usuario: una respuesta de la sesión anterior puede actualizar el estado. Tampoco se observa la preferencia tras el montaje: desactivar oculta el slot, pero no aborta una petición ya iniciada; reactivar no vuelve a solicitar. Si se monta desactivado, queda el estado vacío y la reactivación no dispara carga. Esto es distinto de Mundo musical, cuya petición ahora pertenece al widget activo.

Una carga inicial por montaje produce una llamada HTTP; la petición se limita a `/rates/home-insights`, pero el handler hace las dos consultas ya descritas. No se repite por artista ni se descarga un catálogo extenso. No se midió latencia, volumen de producción ni plan PostgreSQL. La preocupación de coste confirmada es trabajo geográfico innecesario para este consumidor, no un cuello de botella medido.

### Experiencia y cambios pequeños recomendados

El widget ocupa tamaño `full`, con un top tres visual grande y posiciones 4–7 compactas. Las imágenes y el degradado mantienen el nombre legible sobre distintos fondos; si falta la imagen hay un fallback. El nombre se limita a una línea y puede truncarse. La posición del top no se etiqueta explícitamente; el mayor tamaño del primer grupo separa 1–3 de 4–7, pero no explica por sí solo el criterio. El promedio sí es visible, pero hoy tampoco explica el volumen de evidencia. `ratingCount` está disponible y no se presenta.

En móvil, los tres primeros usan una columna y tarjetas 3:2; las cuatro restantes usan dos columnas 4:3. Esto produce una lista alta con poca densidad en móvil. En desktop, las tarjetas comparten tamaño dentro de cada fila. Las tarjetas son `div`, no controles interactivos; no tienen foco de teclado ni navegación. El `alt` de la imagen repite el nombre visible, lo que puede redundar con lector de pantalla.

Mejora mínima: conservar el máximo de siete y la composición de dos filas; mostrar una insignia ordinal clara (`#1`–`#7`) y el número de discos distintos valorados como explicación principal del puesto. Mantener la media personal como contexto secundario. Hacer cada tarjeta un enlace accesible al artista solo si se confirma la ruta vigente de detalle; conservar foco visible y un nombre accesible conciso. Truncar visualmente nombres largos sin perder el nombre completo accesible. En móvil, reducir la altura de las tarjetas o usar una variante compacta manteniendo fotos e identidad; validar con nombres e imágenes extremas.

No se recomienda añadir país, porcentaje de presencia ni mejor disco en esta iteración: no están en los datos del endpoint, requieren más agregaciones/contrato y no son necesarios para explicar una posición por volumen. El mejor disco podría aportar valor en una exploración posterior, pero haría más grande la tarjeta y requeriría decidir reglas de empate. No se recomienda un modal.

### Decisión funcional de ranking

| Criterio | Ventaja | Coste/riesgo | Datos |
|---|---|---|---|
| A. Más discos valorados | Fácil de explicar como afinidad/recorrido; varios discos pesan más que una nota aislada | Cambia el orden actual y deja la calidad como dato secundario | `COUNT(DISTINCT disc.id)`; media como desempate/contexto |
| B. Mejor media (actual) | Prioriza explícitamente la calidad percibida | Un solo disco puede liderar; «favoritos» no describe con precisión la media; pocos votos no se distinguen hoy | Media y recuento; ordenar también por ID para estabilidad |
| C. Combinado | Representa volumen y nota en la misma regla | Requiere una fórmula/pesos elegidos por producto y difíciles de explicar; mayor riesgo de sorpresas | Recuento distinto, media y fórmula fijada/documentada |

Recomendación: **A**, por ser el criterio más sencillo y entendible para «Tus artistas favoritos»: cantidad de discos distintos con valoración musical actual DESC, media personal DESC para empates, nombre ASC y artista ID ASC como desempate estable. Mostrar `N discos valorados` y la media. No fijar mínimo, pues eso ocultaría artistas descubiertos recientemente. Esta recomendación cambia el criterio vigente y requiere decisión de producto; no se implementa en la auditoría. Mantener B es la alternativa de menor cambio si se prefiere que la nota, no el volumen, defina el ranking. No recomendar C sin una necesidad que justifique una fórmula.

### Estados, riesgos confirmados y límites

- **Confirmados:** error HTTP convertido silenciosamente en empty; no hay reintento ni señal de cancelación; las respuestas no se invalidan por sesión; la preferencia solo se consulta al montar; la reactivación no refresca; el conteo no es distinto; no existe desempate por ID; las tarjetas no son navegables/teclables.
- **Riesgos funcionales:** un fallo puede mostrarse como «Vota algún disco»; una solicitud anterior puede poblar información de otro usuario tras cambio de sesión; una tasa duplicada puede sesgar el conteo y media; empates exactos pueden variar entre ejecuciones. No hay evidencia de que existan duplicados de usuario/disco en los datos desplegados.
- **No confirmado:** no se consultó producción ni se ejecutó SQL contra PostgreSQL real; no se midió coste. No se propone índice. El orden documentado se deriva del QueryBuilder y sus pruebas, no de una medición de ejecución real.

### Contract finding

**Current behavior:** `home-insights` devuelve artistas y países. Artistas solo consume `topArtists`; Mundo musical ya usa los endpoints geográficos propios.

**Problem:** cada petición de Artistas sigue ejecutando y transportando la agregación Top 10 de países, que ahora no necesita.

**Impact:** backend-only para evitar esa consulta/payload; backend + frontend si se cambia o elimina el contrato geográfico de `home-insights`.

**Options:** preservar por compatibilidad; eliminar internamente el trabajo geográfico y conservar el contrato solo si puede mantenerse su valor real; o migrar Artistas a un endpoint de artistas dedicado tras inventariar consumidores.

**Recommendation:** no cambiar backend para extraer el widget. En una tarea posterior, confirmar consumidores fuera del frontend revisado y decidir si mantener `home-insights` como contrato legado o retirar su agregación geográfica de forma compatible. No crear endpoint por estética: la consulta extra sí existe, pero no hay una medición de coste ni evidencia completa de consumidores externos.

**Blocks the current task:** No; el widget puede extraer su petición al servicio y consumir el contrato actual.

### Arquitectura y plan de ejecución

`DashboardFavoriteArtistsWidget.vue` basta como nueva unidad. Mantener en ella la llamada a Rates, mapeo, estado local y ciclo de vida; extraer únicamente si aparece lógica compartida real, sin store/composable nuevos. Al montar debe comprobar sesión y preferencia activa. Si se desactiva o cambia usuario, cancelar con `AbortSignal` e invalidar generación/request-id; al reactivar, iniciar una carga nueva. Presentar loading, error con reintento, empty genuino y resultado como estados separados. No solicitar cuando está desactivado. Conservar `getRatesHomeInsights()` y su ruta durante la extracción, slot, ID `artistas`, tamaño `full`, orden 6, registro y preferencias. No tocar `mundoMusical`, sus endpoints ni su modal; no mover Dashboard a `src/modules/dashboard`.

| Tarea | Alcance | Estado | Tamaño | Dependencias |
|---|---|---|---|---|
| **D-ART-1 — Auditoría funcional/técnica** | Funcionamiento, ranking vigente, contratos, ciclo de vida, UX, riesgos y pruebas propuestas | **Completada** | XS | — |
| **D-ART-2 — Definición funcional** | Criterio de ranking, contenido del detalle, fechas, filtros y alcance de Last.fm | **Completada** | XS | D-ART-1 |
| **D-ART-3 — Ranking backend** | Conteo de discos distintos y orden aprobado; compatibilidad de `home-insights`; pruebas Rates | Pendiente | S | D-ART-2 |
| **D-ART-4 — Ranking frontend** | Extraer `DashboardFavoriteArtistsWidget.vue`, conservar la presentación vigente, usar el endpoint de ranking y seleccionar artista para abrir el modal inicial | **Completada** | S | D-ART-3 (endpoint disponible según contrato entregado) |
| **D-ART-5a — Datos del detalle personal** | Evaluar contratos y, si no bastan, implementar lectura Rates por artista con agregados y paginación eficientes | **Completada** | M | D-ART-2; D-ART-3 |
| **D-ART-5b — Modal de detalle personal** | Modal accesible y adaptable con resumen personal, discos y metadatos Catalog; cargar al abrir | **Completada** | M | D-ART-4; D-ART-5a |
| **D-ART-6 — Ranking de artistas por período** | Endpoint de Top 7 por período y selector Mes/Año/Siempre en el widget | **Completada** | M | D-ART-4; D-ART-5b |
| **D-ART-6a — Ranking temporal backend** | Parámetro de período y Top 7 bayesiano en el endpoint existente | **Completada** | S | D-ART-3 |
| **D-ART-6b — Selector temporal frontend** | Selector local Mes/Año/Siempre y consulta cancelable del período activo | **Completada** | S | D-ART-4; D-ART-6a |
| **D-ART-7 — Enriquecimiento Last.fm** | Auditoría del contrato e integración complementaria en el modal | **Completada** | M | D-ART-5b |
| **D-ART-7a — Simplificación del modal** | Cabecera compacta, estadísticas inline y discos sin paginación habitual | **Completada** | S | D-ART-5b |
| **D-ART-7b — Auditoría de Last.fm** | Verificar endpoint, payload, campos disponibles y estados de error | **Completada** | S | D-ART-7a |
| **D-ART-7c — Integración Last.fm** | Añadir contenido real del artista con carga/error independientes | **Completada** | M | D-ART-7b |
| **D-ART-7d — Descubrir discos desde artistas similares** | Enriquecer la respuesta de similares con Catalog y permitir abrir sus discos desde el modal | Pendiente | M | D-ART-7c |
| **D-ART-7d.1 — Contrato backend de Catalog** | Incluir identidad del artista coincidente, contador y discos de Catalog en cada similar | **Completada** | S | D-ART-7c |
| **D-ART-7d.2 — Descubrimiento frontend** | Indicador, selector accesible y navegación existente al detalle de disco | En curso | M | D-ART-7d.1 |
| **D-ART-8 — Smoke tests** | Validación manual de escritorio/móvil, sesión, interacción, filtros, teclado y fallos independientes | Pendiente | S | D-ART-3–D-ART-7 |

### Cobertura propuesta (no implementada)

Backend: prioridad/cantidad, orden y desempates estables; límite siete; discos distintos con varias Rates; portada exclusiva; nota cero y nula; ningún voto; uno/varios discos; media y cambio de nota; disco futuro; artista sin datos; ausencia de mínimos/ponderaciones; preservar campos/forma de `home-insights`, autenticación y no aceptar `userId`; verificar que Mundo musical mantiene `/geography/top` y `/geography/world` sin acoplarse a Artistas. Para B, probar media primaria y recuento secundario; para A, cantidad primaria y media secundaria. Las pruebas actuales comprueban forma/límite/mapeo y cadena del QueryBuilder con dobles, no ejecutan SQL real.

Frontend: montaje/loading, vacío, HTTP error y reintento; AbortSignal al desmontar/desactivar/cambiar sesión; respuesta tardía invalidada; no petición sin sesión o cuando el widget está desactivado; reactivación vuelve a cargar; cambio de usuario limpia datos anteriores; siete/m menos de siete y orden/posición; campos incompletos e imagen faltante; navegación y foco/teclado; nombres largos; responsive/densidad; `home-insights` conservado y sin dependencia con Mundo musical; integración de slot, estado/orden/tamaño/preferencias y regresión del Dashboard. No se implementaron pruebas en esta auditoría.


## D-ART-2 — Definición funcional de «Tus artistas favoritos»

**Estado:** completada el 2026-10-27. Decisiones de producto y alcance futuro documentados; no se modificaron contratos ni código funcional.

### Decisiones aprobadas

El ID técnico `artistas`, su tamaño `full`, orden 6, preferencias desktop/móvil y posición en el Dashboard se conservan. «Tus artistas favoritos» significa ahora **los siete artistas con más discos distintos que el usuario autenticado ha valorado musicalmente**. El ranking se ordena por:

1. `COUNT(DISTINCT disc_id)` descendente.
2. Media personal de notas musicales descendente.
3. Nombre de artista ascendente.
4. ID de artista ascendente.

Solo cuentan Rates del usuario autenticado con `rate IS NOT NULL`; una nota 0 es válida y una Rate solo de portada no cuenta. No se limita por fecha de publicación ni se añade umbral mínimo o puntuación ponderada. Añadir, retirar o editar una nota puede cambiar cantidad, media y posición. El contrato actual expone `ratingCount`; en D-ART-3 se preservan ruta y forma del payload y se deja documentado que ese campo pasa a significar discos distintos musicales para el usuario autenticado.

La media secundaria se entiende como media personal de las notas musicales vigentes de esos discos. La entidad no garantiza en base de datos unicidad `(userId, discId)`, aunque la escritura normaliza las actualizaciones a una Rate existente. D-ART-3 debe caracterizar cómo tratar una eventual duplicidad antes de agregar la media: no permitir que un disco duplique el conteo ni su peso estadístico; si hay duplicados reales, documentar una regla determinista para elegir el valor vigente antes de desplegar. Esto no cambia el criterio aprobado ni autoriza una migración.

### Presentación aprobada del Dashboard

Cada una de las siete posiciones mostrará ordinal, imagen disponible o fallback, nombre completo accesible, cantidad de discos distintos valorados y media personal sobre 10. La lista será compacta y responsive, sin un segundo ranking, gráficos ni modal adicional en el widget. Cada artista será un control seleccionable con nombre accesible y foco visible; al activarlo abre **«Tu historia con [artista]»**. Se conservan los datos del artista y la distribución de posiciones existentes, pero el orden y los indicadores deberán reflejar el nuevo criterio. `DashboardPage.vue` quedará como composición del slot una vez extraído el widget.

### Diseño aprobado del detalle personal

Se propone un modal amplio a pantalla completa, cargado bajo demanda al abrir. Reutilizar los patrones de `DashboardMusicalWorldModal.vue` y `DashboardCommunityStatsModal.vue`: Teleport, `role="dialog"`, `aria-modal`, título asociado, Escape/cierre visible, foco inicial/restaurado y contenido desplazable en móvil. Debe cancelar las peticiones propias al cerrar/desmontar y descartar respuestas de otra sesión o de una solicitud anterior. No se crea store global ni composable por defecto.

El encabezado identificará al artista con imagen, nombre y país si Catalog los tiene; el nombre se trunca visualmente sin perderse en el nombre accesible. La zona principal tendrá tres secciones:

**A. Resumen personal.** Discos distintos con nota musical; media; mejor y peor nota; disco mejor valorado; primera y última fecha disponible. El resumen se calcula solo con Rates actuales del usuario autenticado y con el mismo conjunto filtrado que la lista. Mejor/peor disco tendrán desempate estable por nombre e ID. Conjunto vacío: cantidad cero y media, extremos, disco y fechas `null`, sin confundirlo con error HTTP.

Las fechas son aproximaciones del estado de Rate actual, no un historial musical. `Rate.createdAt` es fecha de creación de la fila y puede preceder a la primera nota si la fila se creó por una portada; `Rate.editedAt` solo conserva la última edición y puede corresponder a portada o nota. Para actividad se usará el último timestamp disponible por Rate, equivalente a `GREATEST(createdAt, COALESCE(editedAt, createdAt))`, ya utilizado por `dashboard-summary`. Se etiquetará **actividad de la Rate**, no “último voto musical”. La primera fecha disponible se describirá como fecha más antigua de creación disponible, no como primer voto. No se reconstruye historial ni se consulta `rate_vote_events`. Antes de usar límites de fecha, D-ART-5a verificará el tipo SQL y semántica de zona horaria desplegados, cuestión pendiente en D-8c.

**B. Tus discos valorados.** Lista paginada de discos del artista con una nota musical no nula del usuario actual. Cada elemento presenta portada/fallback, nombre, año si `releaseDate` existe, nota musical, nota de portada cuando exista, última actividad disponible y acceso al detalle del disco. La actividad describe la última edición de la fila de Rate y puede provenir de un cambio de portada. Una fecha de lanzamiento ausente se muestra como “Año desconocido”; no se inventa. Las estadísticas se agregan sobre todas las filas filtradas antes de paginar; la página solo limita los discos renderizados.

**C. Información del artista.** Catalog aporta imagen, nombre, descripción y país nullable. Artist no tiene relación directa con géneros: `Disc` tiene un único `genre` nullable. Si se muestran géneros, se derivan de los discos personales que coinciden con el filtro y se presentan como “Géneros de tus discos valorados”; no se atribuyen al artista como metadato propio. El enlace externo a Last.fm y bio/tags/oyentes/reproducciones/artistas similares dependen del payload real de Last.fm; D-ART-7 solo mostrará campos verificados y disponibles. Last.fm es complementario: sus errores o falta de datos no bloquean el resumen ni los discos.

### Filtros temporales, orden y paginación

Para evitar un filtro doble difícil de entender, habrá un selector de **criterio temporal** con dos modos mutuamente excluyentes: `Actividad de Rate` o `Fecha de publicación`. Cada modo ofrece Todo el período, año, mes y rango personalizado. Cambiar de criterio reemplaza el anterior. El filtro seleccionado define un único conjunto de Rates/discos y se aplica de forma idéntica a resumen, lista y géneros de tus discos valorados. No hay cruce simultáneo entre dos rangos distintos.

- **Actividad de Rate:** usa el timestamp de última actividad disponible, `GREATEST(createdAt, COALESCE(editedAt, createdAt))`; no busca cuándo se cambió específicamente la nota ni consulta eventos históricos.
- **Publicación:** usa la fecha `Disc.releaseDate` de Catalog, no `createdAt` de Rate ni la actividad de voto.
- **Todo el período:** no añade predicado de fecha e incluye Rates aunque falte `releaseDate`; cualquier fecha desconocida se representa como tal.
- **Año/mes/rango personalizado:** se interpretan en `Europe/Madrid`. Las fechas ingresadas como días son inclusivas en la interfaz y se convierten en límites SQL `[inicio del primer día, inicio del día siguiente al último día)` para respetar cambios de horario. Un rango temporal excluye del subconjunto las filas sin fecha en el criterio elegido; el estado vacío de filtro indica que no hubo coincidencias y permite limpiar el filtro.

Ordenar solo afecta a la lista, no al resumen: nota descendente (mejor primero), publicación descendente y actividad descendente por defecto. Dirección ascendente puede alternarse donde corresponda. Empates estables por nombre de disco e ID; fechas nulas siempre al final. La secuencia será **filtrar → calcular resumen y total sobre todo el conjunto → ordenar establemente → paginar**. Cambiar filtro u orden restablece la página al inicio. `totalItems`/página reflejan el conjunto filtrado y la paginación no cambia las estadísticas. Errores HTTP, carga, sin valoraciones y rango válido sin resultados tendrán estados distintos; ofrecer acción para limpiar filtros en este último caso.

### Contratos y datos verificados

- **Rates `GET /api/rates/home-insights`:** autenticado con `@Auth()` y `@GetUser()`, sin parámetros de usuario. `topArtists` devuelve máximo siete `{id,name,image,averageRate,ratingCount}` y `countries` hasta diez países. Se preserva ruta y estructura; D-ART-3 cambia únicamente el significado y la ordenación de `ratingCount/topArtists`. Su handler ejecuta agregación geográfica aunque Artistas ya no la consuma; no se elimina `countries` ni se separa endpoint en D-ART-2.
- **Rates `GET /api/rates`:** autenticado y usuario obtenido de sesión, paginado por `limit/offset`; `type=rate` excluye cover-only. `query` busca por nombre de disco o artista, pero no identifica artista por UUID. Su `dateRange` filtra fecha de publicación, no actividad; entrega Rate, Disc y Artist, además de agregados comunitarios. No sirve por sí solo para filtrar con precisión por artista ID, actividad y rangos de lanzamiento simultáneos, ni para resumen global de la selección sin recorrer páginas. La función frontend `getRatesByUser` no modela correctamente la respuesta paginada y no acepta `AbortSignal`; corregirlo pertenece a la implementación que lo reutilice.
- **Rates `GET /api/rates/dashboard-summary`:** autenticado y usuario de sesión; solo resume semana actual/previa y hasta cinco Rates recientes. No es resumen completo ni filtro por artista.
- **Rates `GET /api/rates/user/:userId/history`:** acepta `userId` de ruta y no declara `@Auth()` actualmente. Además representa creaciones/ediciones aproximadas con `createdAt`/`editedAt`. No reutilizar para datos personales del modal.
- **Catalog `GET /api/artists/:id`:** devuelve artista y relación eager de país; no incluye estadísticas personales ni géneros de artista.
- **Catalog `GET /api/artists/:id/details`:** devuelve artista, país, discografía completa ordenada por publicación, género por disco y medias/conteos comunitarios por disco, más lanzamientos nacionales. No filtra usuario, no devuelve Rates personales y no pagina la discografía; no es respuesta directa para este detalle personal.
- **Catalog `GET /api/discs/:id`:** detalle de disco existente para la navegación individual. El estado de una relación personal en el modal debe provenir de Rates autenticadas, no de agregados comunitarios.
- **Last.fm `GET /api/lastfm/artist?artist=...`:** endpoint actual acepta nombre, exige parámetro no vacío y no tiene `@Auth()`. Backend llama Last.fm `artist.getinfo` con `LASTFM_API_KEY` y devuelve el objeto de proveedor; no tiene DTO de respuesta tipado. La llamada puede fallar por configuración, HTTP o error de Last.fm. `src/services/lastfm/lastfm.ts` tipa solo bio.summary y tags, aunque `ArtistManagement.vue` ya lee en runtime URL, stats (`listeners`, `playcount`), bio y similares. Esos campos no están garantizados por el tipo/contrato actual; D-ART-7 los verificará y tratará como opcionales. No se agrega otra integración externa.

### Decisión de contrato para el detalle y arquitectura

D-ART-2 no crea ni elige endpoint. D-ART-5a comparará el uso paginado de `/rates` (incluido un filtro preciso por `artistId`, señal de cancelación y agregado eficiente) con una consulta Rates enfocada que derive identidad exclusivamente de `@GetUser()`. El detalle requiere Rates musicales actuales por artista, resumen de ese conjunto antes de paginar, imagen/país Catalog y fecha de publicación; repetir lecturas por disco o descargar la discografía completa y cruzarla en navegador no es la opción preferida. Una consulta/contrato personalizado queda justificado si evita N+1, evita traer discografía o Rates ajenas, y resuelve el mismo filtro/total/estadísticas en una pasada o en agregaciones acotadas. Backend definirá propuesta y consumidores antes de fijar ruta o cambiar contrato; D-ART-2 no autoriza implementación. La identificación de Last.fm seguirá siendo por nombre mientras Catalog no tenga un ID Last.fm; homónimos y artistas sin coincidencia son estados normales, no sustituciones automáticas por nombre parecido.

`DashboardFavoriteArtistsWidget.vue` tendrá solo ranking y selección; `DashboardFavoriteArtistModal.vue` gestiona datos del detalle durante su apertura. Se importará/montará bajo demanda, cargará Rates/Catalog como fuente principal y Last.fm en una solicitud independiente. Al cambiar usuario, cerrar o desmontar se aborta/invalida la generación anterior y se limpia la información privada; el fallo de Last.fm conserva disponible el detalle personal. No se crean stores ni composables globales por defecto y no se cambia el registry/preferencias.

### Pruebas previstas (no implementadas)

**Ranking/backend:** cuenta discos distintos incluso con varias filas Rate; nota musical nula y portada exclusiva excluidas; cero incluido; usuario aislado por sesión sin parámetro `userId`; orden por conteo, media, nombre e ID; límite siete; media de discos y política ante duplicados; todos los artistas con solo un disco; cambios/retirada de Rate alteran el ranking; respuesta vacía; conserva `home-insights`, `countries` y las rutas geográficas de Mundo musical.

**Widget/modal/frontend:** puesto, imagen ausente, nombre largo, media/conteo, orden y selección; un solo modal, título correcto, carga solo al abrir, cierre con botón/Escape, foco y retorno, trap de foco y scroll; responsive; teclado; sesión no disponible, cambio de usuario y datos anteriores limpiados; cancelación y respuesta tardía descartada; independencia del slot y estado de Mundo musical.

**Datos personales:** solo usuario autenticado; artista sin Rates; conteo, media, mejor/peor, disco mejor valorado y fechas nullables; nota cero y cover-only; lista paginada y campos incompletos; artista sin país/imagen/género; enlaces de disco; datos de otra persona no se filtran ni mezclan.

**Filtros/lista:** actividad frente a publicación; todo/año/mes/rango; límites Madrid y DST; inclusividad visual y fin exclusivo SQL; fechas nulas, rango sin resultados y limpiar filtro; filtros se aplican igual a resumen/lista/géneros; orden ascendente/descendente y nulos al final; empate determinista; filtrar/agregar antes de paginar; cambio de filtro/orden vuelve a página uno; errores distintos de empty.

**Last.fm/regresión:** bio/tags/campos presentes y ausentes; artista no encontrado, clave ausente, respuesta externa fallida y reintento independiente; ningún fallo Last.fm oculta Rates/Catalog; solicitud cancelada/cambio de sesión; conservar integración de Last.fm existente y no crear llamadas desde el ranking; pruebas de independencia respecto a `mundoMusical`, slot, registro, preferencias y Dashboard.

D-ART-1 propuso cobertura básica de extracción; este inventario la amplía para el ranking aprobado, detalle, temporalidad y Last.fm. No se ejecutaron tests en D-ART-2.

## D-ART-4 — Extracción del ranking frontend

**Estado: completada.** `DashboardFavoriteArtistsWidget.vue` se monta desde el slot `artistas`; `DashboardPage.vue` ya no conserva su petición ni su estado. Se preservaron el ID `artistas`, slot, tamaño, orden y preferencias. `DashboardWidgetGrid` monta solo widgets habilitados, por lo que la extracción no consulta al estar desactivado y al reactivarse crea una instancia nueva.

La estructura, reparto en dos filas, proporciones, imágenes, fallback musical, tipografía, colores, espacios, respuesta responsive y animación de hover existentes se trasladaron sin rediseñarlos. Las tarjetas ahora son botones con nombre accesible y foco visible, y abren `DashboardFavoriteArtistModal.vue`. El modal inicial muestra únicamente el nombre, la imagen cuando está disponible y el botón de cierre; admite Escape, mantiene el foco dentro y lo restaura al elemento de apertura. No hace llamadas al seleccionarlo.

El servicio `getRatesTopArtists(signal?)` consume `GET /rates/artists/top` con el cliente HTTP compartido y DTOs tipados (`id: string` UUID según el contrato real, imagen nullable, conteo y media). El widget limita la presentación a los primeros siete elementos sin reordenarlos ni agregar datos; mantiene visible la media que ya presentaba el diseño. Los estados de carga, error/reintento, sesión no disponible y respuesta vacía se distinguen. La petición se aborta al desmontar; los cambios de usuario/sesión cancelan e invalidan la respuesta anterior, limpian sus datos y vuelven a cargar si existe sesión.

**`home-insights`:** la búsqueda del frontend no encuentra consumidores productivos restantes. `DashboardPage.vue` dejó de llamar a `getRatesHomeInsights`; `mundoMusical` conserva sus endpoints geográficos propios. La función tipada `getRatesHomeInsights` permanece declarada en `src/services/rates/rates.ts` para no retirar el contrato público en esta tarea, pero no tiene call sites frontend. No se inspeccionaron consumidores fuera de este repositorio.

**Pruebas añadidas/ajustadas:** servicio y widget cubren ruta y señal; montaje, límite de siete y orden; clases/layout e imágenes/fallback; clic y teclado; contenido y cierres del modal; foco; ausencia de llamadas al abrir; error/reintento y vacío; cancelación, cambio de sesión; widget desactivado/reactivado; sesión ausente e independencia del slot respecto a Mundo musical.

**Verificación local:** 28 pruebas focalizadas y suite completa (81 archivos, 554 pruebas) pasan; `pnpm run typecheck` y `pnpm build` pasan; ESLint focalizado pasa para componentes, página y pruebas. ESLint sobre `src/services/rates/rates.ts` aún reporta cinco usos de `any` en funciones preexistentes no relacionadas; no se modificaron. `git diff --check` pasa. El detector mecánico de Impeccable devuelve `[]`. `pnpm run cycles` informa un ciclo type-only y comparación informativa por no poder resolver `HEAD`; `pnpm run identity:boundaries` informa cero violaciones productivas actuales y comparación igualmente informativa. Estas comparaciones no acreditan un delta fiable y no son evidencia de GitHub Actions. La build termina correctamente con avisos de CSS/minificación y tamaño de chunks que no se atribuyen a D-ART-4. No se ejecutaron verificaciones backend.

La búsqueda del frontend confirma que `home-insights` ya no tiene call sites productivos: solo permanece la función exportada en `src/services/rates/rates.ts`. No se inspeccionaron consumidores fuera de este repositorio. D-ART-3 conserva su estado propio; la implementación frontend consume el endpoint disponible según el contrato entregado para esta tarea.

D-ART-5a ya había proporcionado el endpoint de detalle antes de esta tarea. El modal no implementa filtros temporales ni Last.fm. El trabajo de ranking por período de D-ART-6 se documenta tras este hito.

## D-ART-5b — Modal «Tu historia con [artista]»

**Estado: completada.** Se amplió `DashboardFavoriteArtistModal.vue`, manteniendo `DashboardFavoriteArtistsWidget.vue` a cargo del ranking y de seleccionar al artista. Las tarjetas del Dashboard y sus estilos no se modificaron.

El servicio compartido `getRatesArtistSummary(artistId, params?, signal?)` consume `GET /rates/artists/:artistId/summary` con DTOs tipados basados en el contrato entregado por backend. El detalle solo se pide al montar/abrir el modal; cada página solicita como máximo 10 discos y conserva el orden recibido. El endpoint conserva el total y las estadísticas generales al paginar. No se carga la discografía completa ni se llama a Last.fm.

La cabecera muestra imagen (o fallback), nombre, país y géneros actuales cuando existen. Las estadísticas presentan discos valorados, media musical, mejor y peor nota y primera/última actividad disponible. Las fechas se etiquetan como actividad registrada, con nota de que no equivalen necesariamente a los primeros/últimos votos históricos. Como los timestamps llegan sin offset, se muestran sus componentes literales, sin conversión de zona horaria.

La lista compacta presenta portada/fallback, título, año/fallback, nota musical (incluido cero), nota de portada nullable, última actividad y acción para abrir el detalle existente del disco. La paginación ofrece anterior/siguiente, página actual/total, bloqueo durante carga y reintento de errores de página conservando las estadísticas. Hay estados separados para carga, error inicial con reintento, artista inexistente, sesión no disponible y artista sin valoraciones.

Las solicitudes usan `AbortSignal` y generación de petición para cancelar o descartar resultados tardíos al cerrar, cambiar artista, página o sesión. No hay store ni caché global. El modal conserva Escape, trampa de foco, foco inicial/restauración, scroll bloqueado y layout adaptable; el foco regresa al botón que abrió la historia al desmontarse.

**Pruebas focalizadas:** servicio, contrato de paginación, identidad y campos opcionales, estadísticas y fechas literales, vacío, lista y orden, valores nulos/cero, acción de disco, páginas/extremos, error y reintento, artista inexistente, cambio de artista/sesión, respuesta tardía, cancelación, Escape/foco y ausencia de llamadas Last.fm. Las pruebas del widget conservan cobertura de selección por clic/teclado y de independencia respecto a Mundo musical.

**Verificación local:** 33 pruebas focalizadas pasan; suite completa: 82 archivos y 572 pruebas pasan. `pnpm run typecheck` y `pnpm run build` pasan. ESLint focalizado pasa para el modal, el widget y sus pruebas; incluir `src/services/rates/rates.ts` reporta cinco usos de `any` en líneas preexistentes y fuera de esta tarea, que se dejaron intactos. `pnpm run cycles` encuentra un ciclo type-only; `pnpm run identity:boundaries` encuentra cero violaciones productivas. Ambas comparaciones son informativas porque no se puede resolver el `HEAD` local, por lo que no se atribuyen los hallazgos a esta tarea. `git diff --check` pasa. El detector de Impeccable señala dos usos de púrpura en la media; se verificaron como falsos positivos respecto al sistema cromático propio de Riff Valley (purple/rv-purple), sin modificar ni suprimir configuración. La build emite avisos de CSS y tamaño de chunks que no se atribuyen a esta tarea sin comparación base fiable. Estas comprobaciones son locales, no evidencia de GitHub Actions. `home-insights` no tiene consumidores productivos frontend restantes; permanece únicamente la función exportada `getRatesHomeInsights` en el servicio de Rates. No se inspeccionaron consumidores fuera de este repositorio.

D-ART-7 y D-ART-8 seguían pendientes al cierre de D-ART-5b; el estado actual se registra en sus hitos posteriores.

## D-ART-6b — Selector Mes / Año / Siempre

**Estado: completada.** `DashboardFavoriteArtistsWidget.vue` añade un control segmentado compacto en la cabecera: Mes (`month`), Año (`year`) y Siempre (`all`). La selección inicial es `all` y permanece como estado local, sin persistencia. Se conserva la estructura y el estilo de las tarjetas; se muestran los primeros siete elementos en el orden recibido, sin ordenar ni calcular puntuaciones en frontend. El contrato backend revisado devuelve hasta siete artistas (`LIMIT 7`).

`getRatesTopArtists(signal?, period?)` mantiene compatible el argumento opcional `AbortSignal` existente y añade el período tipado, enviado como query param al endpoint compartido. Cambiar el selector cancela e invalida la petición anterior, limpia los artistas del período previo y solicita el nuevo ranking. Volver a elegir la opción activa no provoca una petición. Cambio de sesión y montaje/desmontaje conservan la cancelación y recarga existentes; el período permanece seleccionado en un cambio de sesión.

El estado vacío distingue Mes y Año; Siempre conserva el mensaje previo. Los errores permiten reintentar el período seleccionado y no cambian automáticamente a Siempre. El selector es un grupo con nombres visibles, botones nativos utilizables por teclado, `aria-pressed` y foco visible. El modal no recibe el período ni se modifica: al abrir un artista, sigue consultando todas sus valoraciones mediante el endpoint de resumen, sin filtro temporal.

**Pruebas focalizadas:** las pruebas del servicio y widget cubren período inicial y query param, tres opciones/estado activo, selección, retorno a Siempre, límite de siete y orden, media presente, elección repetida, cambios rápidos y respuestas tardías, cancelación, sesión, estados vacíos por período, error/reintento conservando selección, apertura del modal desde cada período sin transmitir filtro, accesibilidad nativa, layout de tarjetas, slot desactivado/reactivado y preferencias existentes.

**Verificación local:** 31 pruebas focalizadas y suite completa (82 archivos, 585 pruebas) pasan; `pnpm run typecheck` y `pnpm run build` pasan. ESLint focalizado del widget, su test y el test del servicio pasa; ESLint incluyendo `src/services/rates/rates.ts` reporta cinco usos `any` en líneas ajenas a este cambio, que no se modificaron. `pnpm run cycles` informa un ciclo type-only y comparación informativa al no resolver `HEAD`; `pnpm run identity:boundaries` encuentra cero violaciones productivas, también con comparación informativa. `git diff --check` pasa. El detector Impeccable sobre el widget devuelve `[]`. La build emite avisos de CSS y tamaño de chunks; no se atribuyen sin comparación base fiable. No se modificó el modal, backend, estilos globales ni persistencia.

D-ART-6a y D-ART-6b completan D-ART-6. En ese punto D-ART-7 (Last.fm) y D-ART-8 (smoke tests) continuaban pendientes; el estado actual de D-ART-7 se actualiza en los apartados siguientes.

## D-ART-7a — Simplificación del modal de artistas favoritos

**Estado: completada.** `DashboardFavoriteArtistModal.vue` conserva el título, imagen/fallback, nombre, país y géneros, e integra debajo tres métricas inline accesibles: discos valorados, media musical personal y mejor nota. Se retiraron las tarjetas estadísticas grandes y las menciones visibles de peor nota, primera/última actividad y su explicación; los campos permanecen en el DTO y en el servicio. No se muestra el score bayesiano.

La cabecera y el contenido se compactaron. En la entrega de D-ART-7a, el hueco Last.fm no se renderizaba para evitar una zona vacía y quedaba un punto de inserción antes de la lista, sin servicios ni contenido ficticio. D-ART-7c incorporó posteriormente la sección real. La lista conserva el estilo compacto y la acción de detalle, y muestra portada/fallback, título, año, nota musical (incluido cero) y nota de portada nullable. Se retiró la actividad por disco para simplificar cada fila.

La petición inicial usa `getRatesArtistSummary(artistId, { page: 1, limit: 100 }, signal)`. No hay controles habituales de página ni indicador de página. Si `total` supera los discos recibidos, «Cargar más discos» pide la siguiente página bajo demanda, conserva el orden y registros existentes, deduplica por ID y presenta carga/error/reintento. Las peticiones adicionales se cancelan e invalidan al cerrar, cambiar artista o cambiar sesión. Si el backend llega al final de sus páginas y aun así no entrega el total declarado, el modal informa el número de discos que no pudo recuperar.

Se conserva la carga inicial, error/reintento, artista inexistente, estado sin valoraciones, campos opcionales, Escape, foco, restauración y navegación al detalle. La auditoría D-ART-7b y la integración D-ART-7c están completadas; D-ART-8 permanece pendiente.

**Pruebas y verificaciones de D-ART-7a:** 50 pruebas focalizadas del modal, widget y servicio pasan; suite completa: 82 archivos y 589 pruebas pasan. `pnpm run typecheck`, `pnpm build`, ESLint focalizado y `git diff --check` pasan. `pnpm run cycles` informa un ciclo type-only y comparación informativa al no resolver `HEAD`; `pnpm run identity:boundaries` detecta cero violaciones productivas y la comparación también es informativa. El detector Impeccable sobre el modal devolvió `[]` en aquella verificación. La build emitió avisos de Browserslist, CSS minificado y tamaño de chunks, sin atribución a D-ART-7a por falta de comparación base fiable.

## D-ART-7b — Auditoría de Last.fm

**Estado: completada.** Se contrastó el contrato definitivo en el DTO real del backend: `GET /rates/artists/:artistId/lastfm` devuelve `artistId`, `status` (`available`, `not_found`, `unavailable`, `not_configured`, `invalid_response`), `biography` nullable con `summary` y `url`, listas de `tags` y `similarArtists` con `name` y `url` nullable, `listeners`, `playCount` y `lastfmUrl`. El backend sanea la biografía, limita los campos externos y devuelve enlaces Last.fm normalizados. No se usan entidades TypeORM como tipos de frontend.

## D-ART-7c — Integración de Last.fm en el modal

**Estado: completada.** El servicio compartido `getRatesArtistLastfm(artistId, signal?)` consume el endpoint autenticado con DTOs tipados del contrato auditado. El navegador no llama a la API pública ni recibe claves externas. El modal inicia la consulta de Last.fm en paralelo con `getRatesArtistSummary`; la sección «Sobre el artista» presenta por separado el resumen saneado como texto, hasta cinco etiquetas y artistas similares en el orden del backend, oyentes/reproducciones con formato español y «Ver en Last.fm» si la URL usa HTTPS y el dominio permitido. Los enlaces externos abren con `noopener noreferrer`; enlaces ausentes o no permitidos se representan como texto. No se modificó la cabecera compacta, las estadísticas Rates, la lista de discos ni el widget y su selector de período.

Los estados del servicio distinguen artista no encontrado, disponibilidad, configuración no disponible y respuesta inválida. Los errores HTTP/red quedan acotados a Last.fm y permiten reintentar solo esa consulta. El skeleton pertenece a esa sección; la carga externa no bloquea Rates, el cierre ni la navegación a discos. Las solicitudes se abortan y se invalidan al desmontar, cambiar artista o cambiar sesión; las respuestas tardías y los UUID discordantes se descartan. No hay caché global ni llamadas antes de abrir el modal.

**Pruebas focalizadas:** servicio, modal y widget cubren el DTO y UUID, ausencia de llamadas antes de abrir, biografía como texto, enlaces seguros, etiquetas/similares, métricas parciales y formato local, todos los estados de disponibilidad, error y reintento independiente, independencia de Rates, cancelación, cambio de artista/sesión, respuesta tardía y conservación del ranking, el selector y la lista de discos.

**Verificación local de D-ART-7c:** 64 pruebas focalizadas pasan; la suite completa pasa (82 archivos, 603 pruebas). Typecheck, build, ESLint del modal, sus pruebas, el test del servicio y la prueba del widget, e `git diff --check` pasan. ESLint incluyendo `src/services/rates/rates.ts` señala cinco usos de `any` preexistentes en otras funciones (líneas 142, 147, 156, 162 y 201); no se alteraron. `pnpm run cycles` mantiene un ciclo type-only en servicios Articles/Contents; la comparación no puede resolver `HEAD`. `pnpm run identity:boundaries` encuentra cero violaciones productivas y su comparación también es informativa por no poder resolver `HEAD`. La build termina con avisos de Browserslist, minificación de una regla CSS `.flex-[2]` y tamaño de chunks; no se atribuyen a D-ART-7c sin comparación base fiable. Impeccable conserva señalado un gradiente púrpura existente en el fallback visual; se mantiene por coherencia con la paleta Riff Valley, sin cambios de color ni supresión. El chequeo opcional de Prettier señala formato en archivos locales completos, incluidos archivos previos/no rastreados; no se reformatearon masivamente para evitar cambios fuera del alcance. El contrato se verificó en el checkout backend local; no se hizo una llamada HTTP autenticada contra un backend desplegado. D-ART-8 — smoke tests — continúa pendiente.

## D-ART-7d — Descubrir discos desde artistas similares

### D-ART-7d.1 — Contrato backend de Catalog

**Estado: completada según el contrato comunicado para esta tarea.** Cada artista similar añade `catalogArtistId`, `catalogDiscCount` y `catalogDiscs`, que incluyen identidad, portada/fecha, enlace, EP/debut/género, medias y conteos, además de la valoración, favorito y pendiente de la sesión. Se conservan `name` y `url`. Este cambio se limita al consumo del contrato en frontend; no se modifica el backend.

### D-ART-7d.2 — Descubrimiento frontend

**Estado: descartada por decisión de cierre del usuario (2026-10-28); no se considera completada.** El DTO de Rates y `DashboardSimilarArtistDiscCard.vue` conservan la implementación parcial descrita en el registro histórico: tarjeta compacta informativa, sin peticiones adicionales, con enlaces externos seguros, selector que se cierra al cambiar de artista/carga e IDs validados. No se ampliará esta navegación dentro del roadmap actual de Dashboard.

**Limitación de navegación conservada:** el router actual no registra una ruta de detalle de disco. `/discos/radar/:id` y `/discos/mejores/:id` son detalles de listas editoriales, no aceptan IDs de discos. La implementación usa por ahora el detalle existente tras cerrar el modal del artista, por lo que no satisface la navegación por ruta ni el requisito original de no abrir otro modal. Esta limitación no se presenta como corregida; cualquier cambio se propondrá como tarea independiente si el usuario lo solicita.

**Pruebas y verificaciones locales:** pasan 70 pruebas focalizadas y la suite completa (82 archivos, 609 pruebas), typecheck y build. ESLint focalizado de modal, widget y pruebas pasa; incluir `src/services/rates/rates.ts` da cinco usos de `any` preexistentes en otras funciones (líneas 142, 147, 156, 162 y 201). `pnpm run cycles` conserva un ciclo type-only en Articles/Contents y una comparación informativa porque este checkout no puede resolver `HEAD`. `pnpm run identity:boundaries` informa cero violaciones productivas con comparación informativa. El detector Impeccable no encontró hallazgos. El escaneo Markdown informa un enlace preexistente fuera del repositorio en `roadmap/roles.md:9` (`../../spammusic-back/roadmap/roles-frontend-contract.md`). La build conserva avisos de Browserslist, minificación de `.flex-[2]` y tamaño de chunks; sin comparación base fiable no se atribuyen a este cambio.

## D-MOD-1 — Auditoría de migración a `src/modules/dashboard`

**Estado de D-MOD-1: completada (auditoría y planificación).** D-MOD-2 seguía pendiente al cerrar esta auditoría; su resultado se registra abajo. Se consultaron `AGENTS.md`, [Arquitectura frontend](../docs/frontend/architecture.md), [Roadmap de arquitectura frontend](frontend-architecture.md), este roadmap y las convenciones frontend. La inspección fue estática sobre el checkout del 2026-10-27; en D-MOD-1 no se movieron archivos ni se alteraron imports, rutas, servicios, estilos, preferencias o comportamiento.

**Estado del checkout:** al iniciar la auditoría el árbol de trabajo ya contenía cambios tracked y untracked en Dashboard, Account, servicios, componentes compartidos, configuración y documentación, incluido este roadmap. El inventario describe los archivos presentes en ese momento y no atribuye dichos cambios a D-MOD-1. D-MOD-2 debe conservarlos y revisar el diff antes y después de mover archivos; no asumir un árbol limpio ni restaurar cambios.

### Ownership y consumidores

La capacidad corresponde a **Dashboard** (equivalente al owner `insights` de la arquitectura global): compone la ruta `/`, el banner, el grid, los widgets, modales y utilidades visuales/geográficas locales. Catalog, Community, Rates, Identity y Product/Editorial siguen siendo owners de sus contratos de datos y acciones; el Dashboard consume sus APIs. `AdventureModule.vue` es interfaz/composición Dashboard, mientras la selección y los discos siguen bajo Catalog. `NewsFeed.vue` queda fuera: está en `views/homePage/components/`, importa servicios de News y su owner de producto/feed multifuente todavía requiere clasificación.

Hay **36 archivos** bajo `src/views/dashboard/`. Mapa mecánico de cada archivo: para cada ruta relativa enumerada, `src/views/dashboard/<ruta>` pasa a `src/modules/dashboard/<ruta>`.

| Grupo | Rutas relativas incluidas (cada `.test.ts` también se mueve junto a su sujeto) |
|---|---|
| Vista y test | `DashboardPage.vue`, `DashboardPage.test.ts` |
| Widget Adventure | `components/AdventureModule.vue`, `components/AdventureModule.test.ts` |
| Widgets y modales | `components/DashboardCemeteryWidget.vue`, `components/DashboardCemeteryWidget.test.ts`, `components/DashboardCommunityStatsModal.vue`, `components/DashboardCommunityWidget.vue`, `components/DashboardCommunityWidget.test.ts`, `components/DashboardCoverOfDayWidget.vue`, `components/DashboardCoverOfDayWidget.test.ts`, `components/DashboardFavoriteArtistModal.vue`, `components/DashboardFavoriteArtistModal.test.ts`, `components/DashboardFavoriteArtistsWidget.vue`, `components/DashboardFavoriteArtistsWidget.test.ts`, `components/DashboardLatestVotesWidget.vue`, `components/DashboardLatestVotesWidget.test.ts`, `components/DashboardMusicalWorldModal.vue`, `components/DashboardMusicalWorldModal.test.ts`, `components/DashboardMusicalWorldWidget.vue`, `components/DashboardMusicalWorldWidget.test.ts`, `components/DashboardSimilarArtistDiscCard.vue`, `components/DashboardTop3Widget.vue`, `components/DashboardTop3Widget.test.ts`, `components/DashboardWelcomeBanner.vue`, `components/DashboardWelcomeBanner.test.ts`, `components/DashboardWidgetGrid.vue`, `components/DashboardWidgetGrid.test.ts`, `components/MusicalWorldMap.vue`, `components/MusicalWorldMap.test.ts`, `components/RandomDiscWidget.vue`, `components/RandomDiscWidget.test.ts`, `components/RandomDiscWidget.votes.integration.test.ts` |
| Geografía y asset | `components/musicalWorldGeo.ts`, `components/musicalWorldGeo.test.ts`, `components/assets/world-countries-110m.min.json` |

### Piezas relacionadas que permanecen en su owner/ubicación

| Pieza y ubicación actual | Owner/consumidores observados | Decisión para D-MOD-2 |
|---|---|---|
| `src/router/index.ts` | Composition root de rutas; declara `/`, `name: Home`, `requiresAuth: true`. | Permanece en Router. Cambia solo el import de componente hacia el entrypoint público nuevo; conservar path, nombre, guard y carga diferida. |
| `src/views/homePage/components/NewsFeed.vue` | Feed de noticias; DashboardPage lo compone y tiene servicios de News. | Permanece en su ruta actual hasta clasificar ownership Editorial/Community/Product y contrato público. Dashboard conserva un borde legacy explícito durante esta migración. |
| `src/components/DiscCardComponent.vue`, `src/components/DiscDetail.vue`, `src/components/StatsModal.vue`, `src/assets/disco.png` | UI/asset compartidos o usados desde otras funcionalidades. DiscCard tiene consumidores productivos fuera de Dashboard y coordina invalidación de resumen; DiscDetail también se consume desde otras vistas/modales. | Permanecen fuera. Los widgets migrados conservan sus imports a los componentes existentes. No duplicar ni trasladar estilos/acciones. |
| `src/services/discs/discs.ts`, `src/services/rates/rates.ts`, `src/services/news/news.ts`, `src/services/community/dashboard.ts`, `src/services/api/api.ts` | Transporte/contratos de Catalog, Rates/Community y News, con consumidores fuera del árbol Dashboard. | Permanecen en sus owners legacy actuales; el traslado visual no cambia endpoints, tipos ni payloads. |
| `src/modules/identity/auth/**`, `src/modules/identity/shared/**` | Sesión, rol y permisos de Identity; consumidos por Dashboard y otros módulos. | Permanecen bajo Identity; imports desde Dashboard usan los contratos públicos existentes. |
| `src/modules/identity/account/preferences/**` | Store y acceso de preferencias de cuenta desktop/mobile; Auth y Account consumen estas preferencias. | Permanecen bajo Account. No duplicar estado ni cambiar persistencia. |
| `src/modules/identity/account/preferences/components/DashboardBuilder.vue`, `ModuleCard.vue` y sus tests | Editor propiedad de Account, incrustado en Password Change; consume `useDashboardConfig` y el contrato de módulos. | Permanecen en Account. Su consumo del registro público y la ubicación final de `useDashboardConfig` corresponden al trabajo de frontera de preferencias, no a esta mudanza mecánica. |
| `src/composables/useDashboardConfig.ts` y `.test.ts`; `src/stores/user/users.ts`; `src/services/swal/SwalService.ts`; `src/composables/useIsMobileViewport.ts` | Configuración/persistencia consumida por Dashboard y editor Account; `useDashboardConfig` combina preferencias Account, store legacy User y avisos. El viewport tiene más de un consumidor. | Permanecen por ahora. No extraer/refactorizar en D-MOD-2; conservar desktop/mobile, cola, rollback, `[]`, migración `rv_dashboard_config` y mensajes. |
| `src/app/dashboardSummary.ts` y `.test.ts` | Query de resumen del banner; DashboardPage la consulta y DiscCard la invalida después de mutaciones. | Permanece en `app` en D-MOD-2 por consumidor compartido y responsabilidad de coordinación actual. No romper invalidación ni mover la API. |
| `src/app/dashboardWidgetRegistry.ts` y `.test.ts` | IDs/defaults/metadatos Dashboard; consumidos por `useDashboardConfig`, editor Account y pruebas de NewsFeed. Owner funcional: Dashboard; ubicación actual: contrato transicional en `app`. | No reubicar en el movimiento de `views/dashboard`: hacerlo ahora y hacer que Account importe el módulo puede cerrar un ciclo porque Dashboard consume preferencias Account. Mantener ruta/shape y dejar la futura frontera Account–Dashboard para una tarea de contrato dedicada; no añadir barrels preventivos. |
| `src/app/communityDashboardStats.ts` y `.test.ts` | Query/key de estadísticas solicitada por `DashboardCommunityWidget`; usa API Community y sesión Identity. Owner del endpoint: Community; coordinación/query de esta pantalla: Dashboard. | Permanece en `app` durante D-MOD-2 para limitar el cambio a la carpeta auditada. Registrar como candidata a ubicación de módulo cuando se resuelva el ownership de la query; sin duplicar caché ni estado. |
| `src/views/homePage/components/NewsFeed.test.ts` | Prueba de integración de NewsFeed, preferencias del widget y composición de `DashboardWidgetGrid`; importa el grid desde la ruta Dashboard actual. | Permanece junto a NewsFeed. Actualizar solo ese import a la ruta nueva del grid y conservar la cobertura de enabled/disabled. Es el único consumidor externo localizado del grid y es de test. |

No se localizaron consumidores productivos externos de los componentes exclusivos del árbol salvo `NewsFeed` (composición de Dashboard). Las coincidencias externas restantes son la prueba de NewsFeed y el Router. Los tests internos se trasladan con sus componentes; imports relativos entre archivos que migran juntos conservan su relación. La búsqueda no inspecciona consumidores fuera de este repositorio.

### Estructura propuesta y contratos

```text
src/modules/dashboard/
├── index.ts                    # export público estrecho para la ruta
├── DashboardPage.vue           # composición de pantalla
└── components/
    ├── <widgets, modales, grid y componentes locales>
    ├── musicalWorldGeo.ts      # transformación geográfica pura, local
    └── assets/
        └── world-countries-110m.min.json
```

No se propone separar `api/`, `stores/` o capas adicionales: los servicios pertenecen a sus owners actuales, el estado visible vive en las vistas/widgets y no hay store Dashboard que justifique una nueva. `index.ts` publica únicamente la página necesaria para Router, manteniendo importación diferida del chunk. Los tests pueden importar los internals del módulo. Durante D-MOD-2, Account conserva el registro en su ubicación transicional y Dashboard no crea un segundo registro ni un barrel global.

### Imports y rutas afectados

- `src/router/index.ts`: sustituir `() => import("@views/dashboard/DashboardPage.vue")` por la carga diferida del entrypoint público `@/modules/dashboard`; mantener exactamente `/`, `Home` y `requiresAuth`.
- `DashboardPage.vue`: cambiar imports propios `@views/dashboard/components/...` a rutas internas del módulo. Su import de `NewsFeed.vue` permanece en `@views/homePage/components/NewsFeed.vue`; conservar sus imports de `useDashboardConfig`, viewport, Auth y `dashboardSummary`.
- Widgets/modales: adaptar solo imports alias que apunten explícitamente a `@views/dashboard/...`; preservar imports relativos, assets, aliases externos y estilos. Las rutas relativas entre componentes que migran como unidad no requieren cambio.
- Tests con rutas de fuente literales: `DashboardPage.test.ts`, `components/DashboardMusicalWorldModal.test.ts`, `components/DashboardMusicalWorldWidget.test.ts` y `components/DashboardFavoriteArtistModal.test.ts` llaman `readFileSync("src/views/dashboard/…")`; actualizar esas rutas al destino conservando la misma aserción/cobertura. No son imports TypeScript, pero fallarían tras el movimiento.
- `src/views/homePage/components/NewsFeed.test.ts`: actualizar la importación de `DashboardWidgetGrid.vue`; es consumidor de prueba, no de producción.
- Búsqueda de cierre: no deben quedar imports fuente a `@views/dashboard/` ni a `src/views/dashboard`; revisar también tests, dinámicos (`import()`), alias y referencias de configuración. No alterar URLs públicas ni rutas de Vue Router.

### Riesgos y bloqueos

1. **Grafo y ciclos:** arquitectura asigna Insights dependencias dirigidas hacia Identity, Catalog, Community, Editorial y Product. No añadir dependencia inversa desde esos módulos al árbol interno Dashboard. Router usa solo el entrypoint público; Account no importa internals. Mantener por ahora `dashboardWidgetRegistry` en `app` evita introducir el ciclo Account → Dashboard → preferencias Account antes de resolver el contrato.
2. **Bordes legacy:** Dashboard sigue componiendo `NewsFeed.vue` desde `views/homePage`. Es una dependencia observada, pero su owner no está resuelto por esta auditoría; conservarla mecánicamente y planear clasificación aparte, sin trasladar News ni sus servicios por conveniencia.
3. **Imports internos alias:** un `@views/dashboard/...` puede seguir compilando después de mover código si pasa inadvertido; el cierre debe buscar referencias exactas y usar `modules/dashboard` dentro del propio owner.
4. **Worktree con cambios existentes:** cambios tracked/untracked pueden incluir trabajo de otras tareas. No usar reset/restore ni sobrescribir el roadmap; contrastar status/diffs y asegurar que cada archivo/test llega íntegro a destino.
5. **Regresión de contrato:** conservar IDs persistidos, orden, configuración de escritorio/móvil, montaje condicional, llamadas y estados. D-MOD-2 no reordena widgets, extrae consultas ni altera preferencias.
6. **Impeccable:** esta auditoría no toca UI ni la configuración del detector. En D-MOD-2 ejecutar el detector mecánico sobre los SFC trasladados/modificados según el flujo del proyecto; registrar resultados y no corregir ni suprimir hallazgos ajenos al movimiento.

### Plan D-MOD-2 y verificaciones

1. Revisar `git status` y los diffs existentes; preservar cada modificación y clasificar solo los paths que entran en D-MOD-2.
2. Crear `src/modules/dashboard/` y trasladar los 36 archivos de la tabla manteniendo nombres y layout relativo. No reescribir componentes, limpiar estilos ni cambiar contratos.
3. Crear `index.ts` estrecho y apuntar Router al entrypoint mediante import diferido; mantener path, nombre y meta idénticos.
4. Cambiar exclusivamente los imports internos antiguos, las rutas `readFileSync` de los cuatro tests que inspeccionan fuente y el import del grid en `NewsFeed.test.ts`; dejar imports a servicios, Identity, Account, `app`, `NewsFeed`, DiscCard y modales compartidos en sus owners.
5. Buscar referencias residuales a `views/dashboard`, confirmar que no quedan archivos propios en la carpeta anterior y revisar el diff completo para detectar cambios funcionales accidentales.
6. Ejecutar pruebas focalizadas de `DashboardPage` y de los widgets/modales trasladados, incluido el test de composición NewsFeed; ejecutar `pnpm run typecheck`, `pnpm run cycles` como diagnóstico local, `pnpm build` y `git diff --check`. La comparación de ciclos solo se atribuye si la base/head es fiable; reportar límites del checkout y GitHub Actions por separado.
7. Ejecutar el detector Impeccable una vez sobre los SFC objetivo ya en destino; documentar hallazgos sin tocar los que no pertenezcan a la migración. Smoke visual autenticado desktop/móvil solo si existe backend/sesión local disponible; registrar si no se pudo hacer.

**Estimación D-MOD-2:** M (36 archivos fuente, test y asset trasladados, un entrypoint, Router, imports de self y una prueba externa; sin rediseño/refactor de comportamiento). La auditoría no ejecutó tests, build, detector sobre UI ni validación remota. Para D-MOD-1 se verificaron búsquedas de consumidores, estructura y `git diff --check`; no hay evidencia de GitHub Actions.

### Resultado D-MOD-2 — Migración estructural

**Estado: completada.** Se trasladaron los 36 archivos inventariados desde `src/views/dashboard/` a `src/modules/dashboard/`, manteniendo nombres y organización relativa. `src/modules/dashboard/index.ts` exporta únicamente el componente por defecto `DashboardPage.vue`. `src/router/index.ts` importa el entrypoint de forma diferida; `/`, `Home` y `requiresAuth: true` permanecen iguales.

Se cambiaron los imports internos del Dashboard a `@/modules/dashboard/components/...`, la importación del grid en `src/views/homePage/components/NewsFeed.test.ts` y las rutas literales `readFileSync` en `DashboardPage.test.ts`, `DashboardMusicalWorldModal.test.ts`, `DashboardMusicalWorldWidget.test.ts` y `DashboardFavoriteArtistModal.test.ts`. No quedan referencias en `src/` a `src/views/dashboard`, `@views/dashboard` o `@/views/dashboard`, y la carpeta anterior ya no existe.

Los servicios/contratos HTTP, preferencias y registro de widgets, componentes compartidos, NewsFeed, estados, filtros, estilos, accesibilidad, contenido y comportamiento no se modificaron como parte de D-MOD-2. Los cambios previos de la worktree se conservaron; varias piezas trasladadas ya contenían cambios locales antes de esta tarea.

**Verificaciones locales:**

- Tests focalizados de Dashboard y NewsFeed: 18 archivos y 214 tests aprobados.
- Suite completa: 82 archivos y 609 tests aprobados.
- `pnpm run typecheck` y `pnpm build`: aprobados.
- ESLint focalizado: reporta un `@typescript-eslint/no-unused-vars` (`_id`, línea 124) en `RandomDiscWidget.votes.integration.test.ts`, un archivo untracked antes del traslado y cuyo contenido no se alteró; se conserva fuera de alcance.
- `pnpm run cycles`: el grafo actual contiene un ciclo type-only entre servicios de Articles/Contents/Playlists; no involucra Dashboard. Comparación con `HEAD` **informativa**, porque el checkout no puede resolver `HEAD`.
- `pnpm run identity:boundaries`: cero violaciones productivas actuales; comparación con `HEAD` **informativa** por la misma limitación. No es una regla global de ownership para Dashboard.
- Detector Impeccable: reporta `side-tab` en `AdventureModule.vue:49` y `gray-on-color` en `MusicalWorldMap.vue:313`. No se tocaron estilos ni `.impeccable/config.json`; el permiso `side-tab` preexistente estaba limitado al path antiguo, y el mapa ya estaba en el worktree antes de moverlo. No se hizo comparación fiable base/head, por lo que los hallazgos no se atribuyen a D-MOD-2.
- `git diff --check`: aprobado. Build y tests también emitieron avisos conocidos de Browserslist/CSS/chunks y del componente global `font-awesome-icon` en un test; no se atribuyen al traslado sin baseline fiable.

No se validó GitHub Actions ni se hizo smoke visual autenticado. Los gates de ciclos/fronteras no proporcionan comparación base/head válida en este checkout. No quedan bloqueos para la migración estructural; los hallazgos listados permanecen documentados y sin supresión.

## D-MOD-3 — Organización del Dashboard por widgets

**Estado: completada.** Se reorganizaron los archivos internos del módulo por funcionalidad, sin extraer lógica ni cambiar templates, estado, servicios, contratos, estilos o comportamiento. Se revisó el `git status` inicial y se conservaron los cambios locales existentes de D-MOD-2.

### Estructura final y mapa de movimientos

```text
src/modules/dashboard/
├── index.ts
├── DashboardPage.vue
├── DashboardPage.test.ts
├── components/
│   ├── DashboardWidgetGrid.vue (+ .test.ts)
│   └── DashboardWelcomeBanner.vue (+ .test.ts)
└── widgets/
    ├── adventure/        AdventureModule.vue + test
    ├── artists/          FavoriteArtistsWidget, FavoriteArtistModal, SimilarArtistDiscCard + tests
    ├── cemetery/         DashboardCemeteryWidget.vue + test
    ├── community/        DashboardCommunityWidget, DashboardCommunityStatsModal + test
    ├── cover-of-day/     DashboardCoverOfDayWidget.vue + test
    ├── latest-votes/     DashboardLatestVotesWidget.vue + test
    ├── musical-world/    WorldWidget, Modal, Map, musicalWorldGeo, tests y assets/world-countries-110m.min.json
    ├── random-disc/      RandomDiscWidget.vue + unit/integration tests
    └── top-rated/        DashboardTop3Widget.vue + test
```

`DashboardPage.vue`, su test e `index.ts` permanecen en la raíz del módulo. Los archivos antes situados directamente en `components/` quedaron así:

| Origen | Destino |
|---|---|
| `components/AdventureModule.vue` y `.test.ts` | `widgets/adventure/` |
| `components/DashboardFavoriteArtistsWidget.vue`, `.test.ts`, `DashboardFavoriteArtistModal.vue`, `.test.ts`, `DashboardSimilarArtistDiscCard.vue` | `widgets/artists/` |
| `components/DashboardCemeteryWidget.vue` y `.test.ts` | `widgets/cemetery/` |
| `components/DashboardCommunityWidget.vue`, `.test.ts`, `DashboardCommunityStatsModal.vue` | `widgets/community/` |
| `components/DashboardCoverOfDayWidget.vue` y `.test.ts` | `widgets/cover-of-day/` |
| `components/DashboardLatestVotesWidget.vue` y `.test.ts` | `widgets/latest-votes/` |
| `components/DashboardMusicalWorldWidget.vue`, `.test.ts`, `DashboardMusicalWorldModal.vue`, `.test.ts`, `MusicalWorldMap.vue`, `.test.ts`, `musicalWorldGeo.ts`, `.test.ts`, `assets/world-countries-110m.min.json` | `widgets/musical-world/` (asset bajo su subcarpeta `assets/`) |
| `components/RandomDiscWidget.vue`, `.test.ts`, `.votes.integration.test.ts` | `widgets/random-disc/` |
| `components/DashboardTop3Widget.vue` y `.test.ts` | `widgets/top-rated/` |
| `components/DashboardWidgetGrid.vue`, `.test.ts`, `DashboardWelcomeBanner.vue`, `.test.ts` | Permanecen en `components/` como piezas compartidas del módulo/pantalla |

Los tests permanecen con su componente/widget y los imports relativos de mapa, modal, helper y geometría siguen locales a `widgets/musical-world/`. La lista del árbol contiene 37 archivos en total: los 36 migrados en D-MOD-2 más la entrada pública.

### Imports y consumidores

- `DashboardPage.vue` ahora consume cada widget desde `widgets/<widget>/`; conserva los imports del grid y el banner desde `components/`.
- Los ocho tests de widget que montan `DashboardWidgetGrid` lo importan desde `../../components/DashboardWidgetGrid.vue`.
- Las rutas `readFileSync` de los tests de artistas y mundo musical apuntan a las nuevas ubicaciones; no cambió el contenido ni la intención de esas aserciones.
- No hubo que cambiar consumidores externos: Router sigue consumiendo `@/modules/dashboard` por `index.ts` y `NewsFeed.test.ts` sigue consumiendo el grid desde `@/modules/dashboard/components/DashboardWidgetGrid.vue`.
- La búsqueda no encuentra rutas antiguas de componentes ni imports planos de widgets. No se movieron servicios, Identity, Account, `useDashboardConfig`, el registro de `src/app`, NewsFeed ni UI compartida de discos.

### Verificaciones y comparación con D-MOD-2

- Tests focalizados de Dashboard y NewsFeed: 18 archivos, 214 tests aprobados; suite completa: 82 archivos, 609 tests aprobados.
- `pnpm run typecheck` y `pnpm build`: aprobados.
- ESLint focalizado conserva el mismo único hallazgo de D-MOD-2: `_id` no usado en `RandomDiscWidget.votes.integration.test.ts:124`. El archivo y hallazgo ya existían antes de D-MOD-2; el cambio de esta tarea solo movió el archivo con el widget. No se corrigió deuda ajena.
- `pnpm run cycles`: el mismo ciclo type-only en Articles/Contents/Playlists, sin edges de Dashboard en el ciclo. La comparación con `HEAD` vuelve a ser informativa porque no puede resolverse.
- `pnpm run identity:boundaries`: cero violaciones productivas actuales; comparación con `HEAD` informativa por la misma limitación.
- Impeccable reporta los mismos dos hallazgos registrados en D-MOD-2: `side-tab` en `widgets/adventure/components/AdventureModule.vue:49` y `gray-on-color` en `widgets/musical-world/components/MusicalWorldMap.vue:313`. La estructura no alteró sus estilos. `.impeccable/config.json` no se modificó y no se añadieron supresiones.
- `git diff --check` aprobado. La búsqueda en `src/` no encuentra `src/views/dashboard`, `@views/dashboard`, `@/views/dashboard` ni imports viejos de componentes planos.
- Build conserva los avisos de Browserslist desactualizado, regla CSS `.flex-[2]` y chunks mayores de 500 kB; no se atribuyen a D-MOD-3 sin baseline fiable. La suite conserva las advertencias del componente global `font-awesome-icon` en el test de interacción de DiscCard.

No se validó GitHub Actions ni se hizo smoke visual autenticado. Los resultados de D-MOD-2 y D-MOD-3 no muestran regresiones funcionales o arquitectónicas atribuibles al reagrupamiento; la comparación automática con base/head sigue incompleta. No hay bloqueos para dar por completada la reorganización.

## D-MOD-4 — Auditoría y extracción selectiva de lógica

**Estado: completada el 2026-10-27.** D-MOD-4a (auditoría y plan), D-MOD-4b.1 (flujo de Aventura), D-MOD-4b.2 (datos del modal de artista), D-MOD-4c (organización interna por carpetas de los widgets) y D-MOD-4d (revisión visual y verificación técnica) completadas. La reorganización modular de Dashboard queda cerrada; no se observaron regresiones atribuibles a estas tareas ni bloqueos funcionales pendientes. Esta conclusión no valida una ejecución de GitHub Actions.

### D-MOD-4a — Auditoría de complejidad del Dashboard

**Estado: completada.** Auditoría estática de los SFC presentes en `src/modules/dashboard/`, incluyendo widgets, modales, componentes auxiliares y la vista. Se revisaron scripts, templates, efectos reactivos, transporte llamado, límites de sesión, transformaciones, pruebas existentes y dependencias. No se ejecutó la aplicación ni se midieron tiempos de red o render. Las líneas son tamaño de archivo, no criterio suficiente para extraer.

La auditoría se hizo sobre el estado actual del checkout, que ya contiene cambios locales de Dashboard, servicios y componentes relacionados. No se atribuyen hallazgos a D-MOD-4a ni se compara comportamiento contra una base limpia. No se modificó código funcional, tests, servicios, configuración ni baselines.

#### Inventario y clasificación

| Componente | Líneas; responsabilidad y complejidad observada | Datos, efectos y dificultad de prueba | Clasificación |
|---|---|---|---|
| [DashboardPage.vue](../src/modules/dashboard/DashboardPage.vue) | 183 (69 de script). Compone configuración desktop/móvil, identidad, resumen y widgets; mantiene además el listener visual de scroll. No concentra reglas del catálogo. | Consume `useDashboardConfig`, Auth público y `useDashboardSummaryQuery`; no hace HTTP directo. `computed`, montaje/desmontaje. Prueba de composición existente. | **Mantener** — vista fina y coherente como composition surface. |
| [DashboardWelcomeBanner.vue](../src/modules/dashboard/components/DashboardWelcomeBanner.vue) | 142. Presenta bienvenida, fecha y resumen mediante props; comunica interacciones al padre. La mayor parte es markup. | Sin transporte ni efectos de consulta. Prueba de componente existente; contrato de props/emits explícito. | **Mantener** — presentación local. |
| [DashboardWidgetGrid.vue](../src/modules/dashboard/components/DashboardWidgetGrid.vue) | 44. Resuelve visibilidad y orden de widgets conforme a preferencias/registro. | Consume `dashboardWidgetRegistry` de `app`; cálculo derivado, sin transporte. Prueba existente para registro y composición. | **Mantener** — único adaptador visual del registro; evitar replicar metadatos. |
| [AdventureModule.vue](../src/modules/dashboard/widgets/adventure/components/AdventureModule.vue) | 545 (342 de script). Orquesta una aventura de varios pasos: orden aleatorio de categorías, selección de opciones condicionada por respuestas, recuperación, resultado y reinicio; a la vez presenta sus fases. | Llama secuencialmente a `getDiscOptions` y `getRandomDiscs` del servicio de Catalog. Administra `AbortController`, identificador de operación, sesión y desmontaje. Tiene prueba amplia de pasos, errores, filtros y sesión. | **Extraer** — el flujo reactivo y la coordinación de Catalog son una responsabilidad cohesiva separable del template. |
| [DashboardFavoriteArtistsWidget.vue](../src/modules/dashboard/widgets/artists/components/DashboardFavoriteArtistsWidget.vue) | 193 (80 de script). Presenta ranking por período y selecciona artista para abrir el modal. | `getRatesTopArtists`; watcher de período/sesión, cancelación y descarte por generación/sesión. Prueba focalizada existente. | **Mantener** — estado y consulta simples para un widget autocontenido. |
| [DashboardFavoriteArtistModal.vue](../src/modules/dashboard/widgets/artists/components/DashboardFavoriteArtistModal.vue) | 625 (387 de script). Combina detalle de artista, lista paginada de discos, datos de Last.fm, reintentos, navegación a disco y ciclo accesible del diálogo. | Dos flujos remotos independientes (`getRatesArtistSummary`, `getRatesArtistLastfm`), paginación con deduplicación, guards de sesión/generación, cancelación, URL segura, foco, scroll y teclado. Test del modal existente, pero cambios de carga obligan a montar/probar el diálogo entero. | **Extraer** — carga/paginación/estado remoto cohesivo, manteniendo el diálogo y su interacción en el SFC. |
| [DashboardSimilarArtistDiscCard.vue](../src/modules/dashboard/widgets/artists/components/DashboardSimilarArtistDiscCard.vue) | 99 (47 de script). Presenta una ficha compacta de disco de un artista relacionado. | Consume datos del owner Rates; transformaciones/presentación locales, sin orquestación reactiva relevante. No tiene test propio localizado. | **Mantener** — componente visual pequeño; no crear una API de componente por anticipado. |
| [DashboardCemeteryWidget.vue](../src/modules/dashboard/widgets/cemetery/components/DashboardCemeteryWidget.vue) | 259 (176 de script). Presenta y renueva hasta dos discos sin valoraciones musicales de la comunidad, y reacciona al guardado de una valoración. | `getRandomDiscs` en Catalog; normaliza, valida y deduplica resultados. Watcher de sesión, cancelación, protección ante respuesta obsoleta y sustitución por evento de `DiscCard`. Test cubre carga, evento, error y sesión. | **Mantener** — flujo ya aislado y con comportamiento de carrera cubierto. |
| [DashboardCommunityWidget.vue](../src/modules/dashboard/widgets/community/components/DashboardCommunityWidget.vue) | 242 (84 de script). Presenta enlaces de comunidad, rankings por año y pestañas, y abre el modal de estadísticas. | `getCommunityDashboardRankings` del owner Community con cancelación al cambiar año/reintentar; prefetch de Query delegada a `app/communityDashboardStats`, con identidad/rol/generación. Prueba cubre ranking, modal/prefetch y cancelación. | **Mantener** — mezcla pequeñas secciones visuales, pero la coordinación remota está delimitada y probada. |
| [DashboardCommunityStatsModal.vue](../src/modules/dashboard/widgets/community/components/DashboardCommunityStatsModal.vue) | 287 (64 de script). Modal de presentación de estadísticas comunitarias. | Lee la consulta de `app/communityDashboardStats`; toma sesión/rol de Identity y usa ciclo de montaje para diálogo. Sin API HTTP propia. Se prueba desde el flujo del widget; sin test standalone localizado. | **Mantener** — el estado remoto y la clave viven fuera; modal conserva presentación. |
| [DashboardCoverOfDayWidget.vue](../src/modules/dashboard/widgets/cover-of-day/components/DashboardCoverOfDayWidget.vue) | 345 (216 de script). Presenta portada destacada, elección de nota y resultado del voto; incluye validación de payload y actualización optimista del promedio. | GET de Catalog y POST/PATCH de Rates; watcher de sesión, cancelación/versionado para lectura y bloqueo/versionado de sesión para mutación. Prueba focalizada cubre lectura, voto, error y sesión. | **Mantener** — carga y mutación forman el caso de uso propio del widget; no trasladar HTTP fuera de Rates/Catalog. |
| [DashboardLatestVotesWidget.vue](../src/modules/dashboard/widgets/latest-votes/components/DashboardLatestVotesWidget.vue) | 310 (161 de script). Muestra los últimos votos y el diálogo de detalle de disco, con fecha/periodo formateado. | `getRatesDashboardSummary`; watcher de montaje/sesión/reintento, señal abortable y estado de selección local. Prueba de estados, fechas y sesión existente. | **Mantener** — la consulta única y sus formatos se entienden mejor en el widget. |
| [DashboardMusicalWorldWidget.vue](../src/modules/dashboard/widgets/musical-world/components/DashboardMusicalWorldWidget.vue) | 200 (97 de script). Presenta el top de países y controla apertura del mapa. | `getRatesGeographyTop`; carga al montaje y ante cambio de sesión, aborta y descarta respuestas viejas. Prueba focalizada existente. | **Mantener** — presentación acotada y ciclo probado. |
| [DashboardMusicalWorldModal.vue](../src/modules/dashboard/widgets/musical-world/components/DashboardMusicalWorldModal.vue) | 227 (137 de script). Coordina un modal de exploración: distribución remota, geometría local bajo demanda, mapa, selección/hover y datos de país. | `getRatesGeographyWorld`; import dinámico de mapa/JSON; tratamiento separado de errores HTTP y de geometría; cambio de sesión, aborto y restauración de foco/scroll. Test del modal existente. | **Mantener** — la combinación de datos y geometría sirve a esta única experiencia; `musicalWorldGeo.ts` ya aísla la transformación pura. |
| [MusicalWorldMap.vue](../src/modules/dashboard/widgets/musical-world/components/MusicalWorldMap.vue) | 318 (228 de script). Renderiza el mapa SVG y gestiona selección/preview de países y tamaño del contenedor. | D3-geo y geometría local; ciclo DOM/resize, sin transporte. Prueba de componente y pruebas puras de [musicalWorldGeo.ts](../src/modules/dashboard/widgets/musical-world/utils/musicalWorldGeo.ts) existentes. | **Mantener** — complejidad de render propia de una pieza visual; la lógica geográfica pura ya está separada. |
| [RandomDiscWidget.vue](../src/modules/dashboard/widgets/random-disc/components/RandomDiscWidget.vue) | 433 (236 de script). Modos libre/dificultad, animación del dado y resultado. La longitud refleja también markup/estilos. | Catalog ofrece llamadas distintas para modo libre y modos de dificultad. Temporizadores de animación, aborto/generación en cambio de modo y desmontaje; normaliza el resultado. Tests unitarios y de integración con voto cubren cancelación y eventos. | **Mantener** — la interacción y sus dos estrategias pertenecen a un solo caso de uso; los temporizadores son estado visual local. |
| [DashboardTop3Widget.vue](../src/modules/dashboard/widgets/top-rated/components/DashboardTop3Widget.vue) | 274 (148 de script). Presenta un ranking semanal o mensual, calcula el período, normaliza votos y permite reintentar. | `getTopRatedOrFeaturedAndStats` de Catalog; watcher de período/sesión/reintento, cancelación y filtrado/límite de tres. Prueba cubre rangos, período, errores y sesión. | **Mantener** — las transformaciones son pequeñas, locales y específicas del período. |

#### Candidatos a extracción

| Componente | Problema y responsabilidad a extraer | Destino y límite | Beneficio esperado | Riesgo principal | Tamaño |
|---|---|---|---|---|---|
| `widgets/adventure/components/AdventureModule.vue` | La plantilla muestra bien las fases, pero el script mezcla transición de fases, selección/orden de categorías, conversión de respuestas a filtros, consultas secuenciales y operaciones cancelables vinculadas a sesión. | Composable privado `widgets/adventure/composables/useAdventureFlow.ts` para estado del flujo, filtros, llamadas a la API del owner Catalog, operación vigente/reintento y resultado. El SFC conserva copy, opciones visuales, `DiscCard` y eventos de interacción. La adaptación de DTO a opciones puede quedarse privada al composable; no mover servicios. | Probar el flujo y las carreras sin depender del markup; hacer que `AdventureModule.vue` se lea como presentación de una máquina de estados ya definida. | Regresión en orden aleatorio, filtros acumulados, paso reintentado, sesión nueva o resultados obsoletos; puede romperse si la API del composable acopla su implementación a la UI. | M |
| `widgets/artists/components/DashboardFavoriteArtistModal.vue` | Un SFC reúne tres peticiones lógicas (resumen inicial y páginas, Last.fm), control de dos generaciones, sesión, deduplicación, retry y estados de UI, además del foco/teclado/scroll del diálogo. | Composable privado `widgets/artists/composables/useFavoriteArtistDetails.ts` para estados y acciones de carga, Last.fm, paginación y retry, preservando los servicios existentes del owner Rates. El modal conserva props/emits, overlay, foco, teclado, scroll, selección/navegación y markup. Dejar formatters/validadores puros junto al módulo salvo que aparezca otro consumidor real. | Aislar y probar errores, paginación, reintentos y protección ante cambio de artista/sesión; reducir el acoplamiento entre estado remoto y ciclo del diálogo. | Mayor regresión potencial: no mezclar páginas ni filtrar por sesión incorrecta; conservar el significado de 404, estados Last.fm no disponibles y restauración de foco al cerrar. | M |

**Simplificar:** no se identifica una simplificación en sitio con beneficio suficiente para planificar aparte. En componentes cohesionados, helpers de fecha, validadores, normalización y estado visual tienen un solo consumidor y permanecer junto a su owner es razonable. No se propone un composable común para watchers/cancelación: los contratos difieren y las pruebas actuales ya verifican los límites sensibles.

#### Cobertura, límites y arquitectura

- Hay pruebas de `DashboardPage`, `DashboardWelcomeBanner`, `DashboardWidgetGrid` y de los widgets Adventure, FavoriteArtists, FavoriteArtistModal, Cemetery, Community, CoverOfDay, LatestVotes, MusicalWorld (widget/modal/map), RandomDisc y Top3; `RandomDiscWidget` tiene además una prueba de integración de voto. `musicalWorldGeo.ts` tiene prueba pura. No se localizaron pruebas propias para `DashboardSimilarArtistDiscCard.vue` ni para `DashboardCommunityStatsModal.vue`; la segunda se ejercita a través del flujo del widget. No se ejecutaron tests como parte de la auditoría.
- Las peticiones observadas usan servicios de sus owners (`@services/discs`, `@services/rates`, `@services/community`) o consultas existentes en `src/app`. No se recomienda mover esos servicios legacy en D-MOD-4b, duplicar respuesta remota en Pinia ni introducir Query en widgets por defecto.
- Para operaciones privadas ya se observaron `AbortSignal`, comprobación de usuario/generación de sesión y guard contra respuestas obsoletas en los widgets/modal que las necesitan. La tabla documenta excepción contextual de Comunidad: ranking público por año cancelable al cambiar selección; la estadística privada se precarga mediante la clave existente en `app`. D-MOD-4b debe conservar este comportamiento y confirmar sesión al aplicar resultados de Aventura y modal de artista.
- No importar internals privados entre módulos: las dos composables propuestas son internas al owner Dashboard y consumen los servicios ya existentes. Mantener la dirección Dashboard → contratos publicados de Identity y servicios de datos; `app` conserva las responsabilidades compartidas de consulta/cache que ya posee.

#### Priorización propuesta para D-MOD-4b

| Orden | Subtarea | Alcance concreto | Dependencias | Criterios de aceptación | Tamaño / riesgo |
|---:|---|---|---|---|---|
| 1 | D-MOD-4b.1 — Flujo de Aventura | Extraer estado, filtros, orden de preguntas, peticiones de opciones/resultado, retry, reinicio, abort y sesión a `useAdventureFlow.ts`; el componente conserva exclusivamente presentación y manejo de interacción. | Ninguna fuera de las pruebas y llamadas Catalog existentes. | Mismos endpoints, filtros, orden/opciones, fases y errores visibles; aborta al reiniciar/desmontar/cambiar sesión; respuestas antiguas no cambian la UI. Pruebas del composable para transiciones/filtrado/cancelación y pruebas del SFC para binding básico. Sin cambio de contrato HTTP, preferencias ni visual. | M · riesgo medio |
| 2 | D-MOD-4b.2 — Datos del modal de artista | Extraer carga de resumen, Last.fm, paginación/deduplicación y retries/session guards a `useFavoriteArtistDetails.ts`; dejar interacciones DOM y presentación en el modal. | Ninguna; se mantienen servicios Rates actuales y contrato `artist`/`close`. | Mismos estados de error/not-found/unavailable, mismo límite/paginación y deduplicación; no hay escritura tardía tras cambiar artista/sesión o desmontar; conserva foco, scroll, Escape/Tab y selección de disco. Tests del composable para cada fuente, carrera, página y retry; tests existentes del modal siguen cubriendo diálogo. | M · riesgo medio-alto |

No combinar las subtareas: tienen owners de estado e interacción distintos dentro de widgets independientes. No dividir cada petición o cada helper en cambios separados: el flujo de Aventura se prueba mejor como unidad y los tres estados de carga del modal comparten paginación, sesión y ciclo de artista.

### Resultado D-MOD-4b.1 — Flujo de Aventura

**Estado: completada el 2026-10-27.** La coordinación se movió de `AdventureModule.vue` a [useAdventureFlow.ts](../src/modules/dashboard/widgets/adventure/composables/useAdventureFlow.ts), en el mismo owner Dashboard. El SFC conserva íntegros template, copy, interacción de botones, navegación nativa por teclado, accesibilidad y composición de `DiscCard`; su script conecta el composable con el template.

El composable concentra orden y selección aleatoria de 2–5 categorías, progresión, opciones, respuestas/filtros, llamadas secuenciales, carga/error/vacío, retry, resultado, reinicio permitido, abort/generación de operación, protección ante respuestas obsoletas y limpieza al desmontar o cambiar sesión. Conserva `getDiscOptions` y `getRandomDiscs` con los mismos argumentos, conversiones, límites y `AbortSignal`; no cambia servicios, stores, Query ni contratos públicos.

**API local:** `useAdventureFlow()` devuelve `phase`, `isBusy`, `categoryOrder`, `stepIndex`, `currentQuestion` y `resultDisc` como estado de solo lectura; expone las acciones `startAdventure()`, `choose(option)`, `retry()` y `restart()`. No exporta internals del módulo. `choose` confirma la respuesta una sola vez, valida categoría y opción de la pregunta activa y no permite editarla; el retry vuelve a consultar el paso fallido con las respuestas anteriores intactas. La acción de reinicio queda disponible en estados error/resultado/vacío como en la UI actual.

**Pruebas y verificaciones locales:**

- Tests focalizados de AdventureModule y useAdventureFlow: 2 archivos, 21 tests aprobados; suite completa: 83 archivos, 619 tests aprobados.
- `pnpm run typecheck` y `pnpm build`: aprobados. Build mantiene avisos conocidos de Browserslist obsoleto, selector CSS `.flex-[2]` y chunk mayor de 500 kB; no se atribuyen a esta extracción.
- ESLint focalizado sobre componente, composable y ambas pruebas: aprobado.
- `pnpm run cycles`: el único ciclo actual sigue siendo type-only entre servicios Articles/Contents/Playlists, sin participación de Dashboard; coincide con D-MOD-3. Comparación **informativa** porque no se pudo resolver `HEAD` local.
- `pnpm run identity:boundaries`: cero violaciones actuales, como en D-MOD-3. Comparación **informativa** porque no se pudo resolver `HEAD`; este gate aplica a Identity y no define ownership global para Dashboard.
- `git diff --check`: aprobado. No se ejecutó Impeccable ni se modificó `.impeccable/config.json`; no se alteraron estilos o templates.

No se validó GitHub Actions ni se comparó contra una base fiable. El checkout ya tenía cambios locales en otros módulos y servicios; se conservaron sin alterarlos. La organización interna se registra como completada en D-MOD-4c; la verificación de regresión final sigue en D-MOD-4d.

### Resultado D-MOD-4b.2 — Datos del modal de artista

**Estado: completada el 2026-10-27.** La coordinación del resumen personal y Last.fm se movió a [useFavoriteArtistDetails.ts](../src/modules/dashboard/widgets/artists/composables/useFavoriteArtistDetails.ts), privado dentro de `widgets/artists` y del owner Dashboard. El composable conserva los servicios Rates y sus parámetros actuales (`/rates/artists/:artistId/summary` con páginas de 100 y `/rates/artists/:artistId/lastfm`); no cambia APIs, respuestas, stores ni contratos.

El composable gestiona estados separados de carga/error/not-found, los reintentos independientes, lista de discos, carga excepcional de páginas adicionales, orden y deduplicación, `AbortController`, generaciones de petición y validación de artista/usuario/sesión. Se activa al abrir el modal, invalida al cerrar o cambiar artista/sesión y limpia al desmontar. Los resultados antiguos no se aplican al contexto nuevo. La respuesta de Last.fm y sus discos de Catalog se conservan sin transformación.

**API local:** `useFavoriteArtistDetails(artistId, enabled)` devuelve como solo lectura `detail`, `lastfmDetail`, estados de carga/error/not-found, `discs`, `hasMoreDiscs` y `unavailableDiscCount`. Expone `loadSummary()`, `retrySummary()`, `retryLastfm()`, `loadMoreDiscs()`, `retryMoreDiscs()` e `invalidate()`. El API no se exporta fuera del directorio.

El modal conserva apertura/cierre, props/emits, template y estilos, foco, Escape/Tab, scroll, expansión de artistas similares, presentación/formatters, selección visual de discos y apertura de `DiscDetail` sin apilar diálogos. El test de integración existente continúa cubriendo estados visibles, los datos Catalog de artistas similares y la navegación al detalle.

**Pruebas y verificaciones locales:**

- Tests focalizados del composable y modal: 2 archivos, 47 tests aprobados. Suite completa: 84 archivos, 630 tests aprobados; respecto al resultado de D-MOD-4b.1 (83/619), se añaden 11 pruebas del composable y no fallan pruebas existentes.
- `pnpm run typecheck`, `pnpm build` y ESLint focalizado sobre modal, composable y pruebas: aprobados.
- `pnpm run cycles`: el único ciclo actual continúa siendo type-only en Articles/Contents/Playlists; no involucra Dashboard. Comparación informativa porque no se pudo resolver `HEAD` local.
- `pnpm run identity:boundaries`: cero violaciones productivas actuales; comparación informativa por la misma limitación y el gate no define ownership global para Dashboard.
- `git diff --check`: aprobado. No se modificaron template, estilos ni `.impeccable/config.json`.

Build mantiene avisos conocidos de Browserslist obsoleto, selector CSS `.flex-[2]` y chunk mayor de 500 kB. Los tests completos muestran los avisos existentes del componente global `font-awesome-icon` y errores de red simulados en pruebas de Identity. No se validó GitHub Actions ni se hizo smoke visual autenticado; la worktree tenía cambios locales previos y la comparación automática base/head no quedó certificada.

#### D-MOD-4c — Organización interna por carpetas de los widgets

**Estado: completada el 2026-10-27.** Se mantuvo la agrupación funcional de D-MOD-3 y cada widget ahora organiza los archivos que existen por responsabilidad. No se crearon carpetas vacías ni barrels.

**Estructura final:**

- `adventure/components/`: `AdventureModule.vue` y su test. `adventure/composables/`: `useAdventureFlow.ts` y su test.
- `artists/components/`: `DashboardFavoriteArtistsWidget.vue`, `DashboardFavoriteArtistModal.vue`, `DashboardSimilarArtistDiscCard.vue` y los dos tests de componentes. `artists/composables/`: `useFavoriteArtistDetails.ts` y su test.
- `cemetery/components/`: `DashboardCemeteryWidget.vue` y su test.
- `community/components/`: `DashboardCommunityWidget.vue`, `DashboardCommunityStatsModal.vue` y el test del widget.
- `cover-of-day/components/` y `latest-votes/components/`: el componente de cada widget y su test.
- `musical-world/components/`: widget, modal, `MusicalWorldMap.vue` y sus tres tests. `musical-world/utils/`: `musicalWorldGeo.ts` y su test. `musical-world/assets/`: `world-countries-110m.min.json`.
- `random-disc/components/`: `RandomDiscWidget.vue` y sus tests unitario e integración.
- `top-rated/components/`: `DashboardTop3Widget.vue` y su test.

**Movimientos e imports:** se trasladaron 14 SFCs de widgets/modal/mapa y 16 tests; además, dos composables con sus tests, una utilidad con su test y el GeoJSON. `DashboardPage.vue` conserva su ubicación y ahora importa los nueve widgets desde `widgets/<widget>/components/`. Se actualizaron imports locales entre componentes, hacia los composables/utilidad/asset y desde los tests al grid común. Las rutas literales `readFileSync` apuntan a los SFC nuevos. La búsqueda en el repositorio no encuentra las rutas antiguas.

No se modificaron templates, lógica, estilos, IDs, orden, preferencias, servicios, contratos HTTP ni composición pública. No hubo consumidores externos que requirieran cambios: Router mantiene el entrypoint `src/modules/dashboard/index.ts`, `NewsFeed` conserva el import del grid compartido y el registro de `src/app` no se movió. Permanecen fuera del owner Dashboard los servicios compartidos y `DiscCard`/sus assets.

**Verificaciones locales:**

- Tests focalizados `pnpm exec vitest run src/modules/dashboard`: 19 archivos y 231 tests aprobados.
- Suite `pnpm test`: 84 archivos y 630 tests aprobados, igual que la referencia D-MOD-4b.2.
- `pnpm run typecheck` y `pnpm build`: aprobados. Build mantiene avisos existentes de Browserslist desactualizado, selector CSS `.flex-[2]` y chunks de más de 500 kB.
- ESLint focalizado: un hallazgo preexistente en `RandomDiscWidget.votes.integration.test.ts:124` (`_id` asignado pero no usado), ya registrado en D-MOD-3. No se cambió lógica para corregirlo.
- Prettier focalizado `pnpm exec prettier --check src/modules/dashboard`: no aprobado; reporta formato en 34 archivos del módulo, entre ellos archivos preexistentes ajenos a los movimientos. No se reformateó el código durante una migración estructural y no hay base/head fiable para atribuir esos hallazgos a este cambio.
- `pnpm run cycles`: un ciclo type-only existente entre Articles/Contents/Playlists, sin participación de Dashboard. `pnpm run identity:boundaries`: cero violaciones productivas actuales. Ambos comparadores son informativos porque no resolvieron el `HEAD` local; la comparación base/head no es concluyente.
- `git diff --check`: aprobado. Impeccable señaló `gray-on-color` en `MusicalWorldMap.vue:313`, estilo preexistente que no se tocó ni se suprimió; `.impeccable/config.json` quedó intacto.
- `pnpm run markdown:links`: un enlace local preexistente apunta fuera del checkout desde `roadmap/roles.md:9`; ningún enlace a las rutas movidas falló.

Los tests mantienen avisos existentes de `font-awesome-icon` sin registrar en una prueba de integración y errores de red simulados en pruebas de Identity. No se validó GitHub Actions ni se realizaron smoke tests autenticados; la comparación con base/head es incompleta. No se observaron regresiones atribuibles a los cambios de rutas. La verificación final y los smoke tests permanecen en D-MOD-4d.

#### D-MOD-4d — Revisión Impeccable y cierre técnico

**Estado: completada el 2026-10-27.** Se revisó el estado final presente en el checkout, conservando todos los cambios locales tracked y untracked. El detector se ejecutó una vez sobre `src/modules/dashboard`; no se modificó `.impeccable/config.json`, no se añadieron ignores y no se hicieron cambios visuales porque los hallazgos no mostraron un problema real que justificase alterar la identidad o el comportamiento.

##### Auditoría Impeccable

| Hallazgo | Clasificación | Revisión |
|---|---|---|
| `side-tab` en `widgets/adventure/components/AdventureModule.vue:49` (`border-l-4`) | Decisión visual intencionada | La franja púrpura/rosa identifica cada opción y encaja con los acentos de marca del widget. No afecta distribución, interacción ni accesibilidad; se conserva. |
| `gray-on-color` en `widgets/musical-world/components/MusicalWorldMap.vue:313` | Decisión intencionada; falso positivo contextual | El texto gris de la leyenda se presenta sobre fondo neutro. El color rosa señalado por el detector pertenece al pequeño swatch contiguo, no al fondo del texto. No se cambia la leyenda ni la escala rosa del mapa. |

No hubo otros hallazgos del detector dentro del módulo. La configuración local ya presente en la worktree contiene una regla `side-tab` asociada a la ruta antigua `src/views/dashboard/components/AdventureModule.vue`; no se tocó. La ruta nueva no queda ignorada y el hallazgo se revisó directamente.

##### Estructura y contratos

- `src/modules/dashboard/` queda organizado en la vista/entrada pública, componentes compartidos y once carpetas funcionales de widgets; cada widget mantiene sus componentes, composables, utilidades, assets y pruebas junto a su owner. El GeoJSON del mapa permanece bajo `widgets/musical-world/assets/` y carga desde el módulo.
- `index.ts` publica únicamente `DashboardPage.vue`. Router conserva `/`, `Home` y `requiresAuth`, y carga el módulo mediante `import("@/modules/dashboard")`.
- El registro mantiene los once IDs estables (`novedades`, `comunidad`, `discoAleatorio`, `portadaDia`, `top3mes`, `top3semana`, `artistas`, `cementerio`, `mundoMusical`, `ultimosVotos`, `aventura`); preferencias desktop/móvil, orden, montaje condicional y registro siguen conectados al contrato existente.
- Las búsquedas de imports en `src/` no encuentran `src/views/dashboard`, `@views/dashboard` ni `@/views/dashboard`. Una mención histórica a la ruta antigua persiste en `roadmap/frontend-quality.md:449`; no es un import ni una ruta activa y queda fuera del alcance de esta tarea.
- El scan actual de fronteras reporta cero violaciones productivas. El grafo muestra un ciclo type-only de Articles/Contents/Playlists sin participación de Dashboard. No se identificaron ciclos ni imports privados nuevos atribuibles a Dashboard.

##### Verificaciones locales

- `pnpm test`: **84 archivos y 630 tests aprobados**, incluidos los tests de aventura y respuestas no editables, abort/reintento/sesión; ranking y selección de período; modal de artistas, Last.fm, paginación y selección de discos similares; mapa/geometría; registro, preferencias y montaje condicional; y protecciones frente a cambios de sesión. Los smoke tests manuales de los once widgets fueron realizados satisfactoriamente por el usuario, según su confirmación; no se repitieron ni se atribuyen al agente.
- `pnpm run typecheck`: aprobado.
- `pnpm build`: aprobado. Conserva avisos de Browserslist desactualizado, minificación de `.flex-[2]` y chunks superiores a 500 kB.
- ESLint focalizado sobre `src/modules/dashboard`: no aprobado por el único `_id` sin uso en `widgets/random-disc/components/RandomDiscWidget.votes.integration.test.ts:124`, hallazgo conocido de D-MOD-3 y de atribución no demostrable en esta comparación. No se modificó.
- Prettier focalizado `pnpm exec prettier --check src/modules/dashboard`: no aprobado; informa 34 archivos, igual al hallazgo ya registrado en D-MOD-4c. No se reformatearon archivos completos ni se cambió la configuración.
- `pnpm run cycles`: un ciclo type-only en Articles/Contents/Playlists; ningún nodo de Dashboard. `pnpm run identity:boundaries`: cero violaciones actuales. Ambas comparaciones delta son **informativas**: los scripts no pudieron resolver el `HEAD` local como base. Aunque `git rev-parse HEAD` resuelve un SHA, el checkout contiene numerosos cambios locales previos tracked y untracked y no hay comparación base/head fiable para atribuir esos hallazgos.
- Búsqueda de imports antiguos: sin resultados en `src/`. `git diff --check`: aprobado.
- `pnpm run markdown:links`: un enlace histórico local en `roadmap/roles.md:9` apunta fuera del repositorio. No se modificó.
- No se validó GitHub Actions. Los resultados anteriores son comprobaciones locales y no acreditan un gate remoto.

No se detectaron regresiones funcionales o estructurales atribuibles a D-MOD-1–D-MOD-4d. Quedan como deuda documentada, sin bloquear el cierre de la reorganización, el hallazgo de ESLint, los 34 informes de formato, el ciclo type-only legacy, los avisos del build y los enlaces históricos fuera del repositorio. No se inicia trabajo adicional sobre esos puntos.

## DS-1 — Auditoría del sistema visual y compatibilidad de temas

**Estado histórico al completar DS-1 el 2026-10-27:** Dashboard permanecía pendiente de cierre visual; D-MOD-4d ya estaba completada y no se reabrió. La decisión de cierre posterior, registrada al final de este documento, sustituye aquel estado. Esta auditoría no creó la guía definitiva ni modificó componentes, estilos, configuración de Impeccable o comportamiento.

**Alcance y método:** lectura de instrucciones y roadmaps indicados, configuración Tailwind, inicialización de tema, CSS global, referencias fuera de Dashboard, los once widgets actuales de `src/modules/dashboard/` y sus modales/componentes de detalle. Inspección estática y búsquedas no destructivas. No se ejecutó navegador ni se inspeccionó visualmente ningún tema; los contrastes descritos como riesgos requieren confirmación visual/medición en DS-3/DS-5.

### Mapa del tema y del sistema visual

| Área | Implementación observada | Clasificación |
|---|---|---|
| Selección | `src/composables/useTheme.ts`: tema claro por defecto; `localStorage.theme === "dark"` activa oscuro. El toggle añade/quita la clase `dark` en `<html>` y persiste `dark`/`light`. `DefaultLayout.vue` llama a `initTheme()` y Sidebar emite el toggle. | Mecanismo global de tema, no tokens. Login también toca clase/localStorage en su flujo. |
| Tailwind | `tailwind.config.js` usa `darkMode: 'class'` y escanea `index.html` y `src/**/*.{vue,js,ts,jsx,tsx}`. | El selector oscuro depende de `.dark`, no de `prefers-color-scheme`. |
| Marca | `rv-pink #e46e8a`, `rv-purple #b0669f`, `rv-blue #0064d6`, `rv-blueDark #00309b`, `rv-navy #00021f`, `rv-white #fff`; `bg-rv-gradient` (rosa→morado→azul), `font-brand` (Skaters) y `shadow-rv`. | Tokens de marca/utilidades, no sistema semántico por intención. Hay valores duplicados como colores literales. |
| Bases oscuras | `rv-darkBg #00021f`, `rv-darkCard #404157`, `rv-darkSurface #2a2b3d`. | Nombres de superficie contextualizados al oscuro, usados directamente en JSX/CSS. |
| Semántica de tema | No se observa una capa central de tokens como fondo/texto/borde primario/secundario, acción, foco o estado con valores para ambos temas. Se resuelve localmente con pares `bg-white dark:bg-*`, `text-gray-* dark:text-*`, `border-gray-* dark:border-*`. | Clases Tailwind utilitarias con variante de tema: son adaptables, pero no tokens semánticos. |
| Estados y otros colores | Estados usan a menudo paletas Tailwind directas (`red/rose`, `green`, `amber`, `blue`, `purple`) con overrides oscuros parciales. | Colores de estado empleados directamente, sin contrato transversal de contraste. |
| CSS global | `src/style.css` define enlaces blancos y botones con `background-color: #1a1a1a`; media query `prefers-color-scheme: light` los lleva a blanco roto, aunque el tema de la aplicación se decide por clase/localStorage. La misma hoja define estilos SweetAlert blancos/oscuros. | Colores fijos/globales que pueden contradecir tema explícito o componentes sin estilos propios; el efecto efectivo depende de cascada/utilidades y requiere inspección de las pantallas afectadas. |
| Colores fijos en SVG/CSS | Existen hex/RGB directos en mapas, charts, ranking, modales y componentes; algunos tienen override `.dark`, otros son color de marca/visualización intencional. | No todos son defectos. Cada valor debe clasificarse por intención y fondo antes de cambiarlo. |

### Referencias fuera de Dashboard

Las rutas siguientes pertenecen a Identity o a UI compartida ajena a `src/modules/dashboard/`. Son patrones existentes para estudiar/reutilizar; no constituyen una librería de componentes uniforme ni todos sus detalles son automáticamente normativos.

| Necesidad | Referencia | Patrón aprovechable |
|---|---|---|
| Botón primario y formulario en modal | `src/modules/identity/auth/login/components/AccessRequestModal.vue` | Superficie, borde, texto, placeholder y feedback de éxito se adaptan a `dark`; botón con hover, disabled y foco. Su gradiente de marca puede mantenerse si corresponde a la acción. |
| Selector, inputs, hover, seleccionado y teclado | `src/modules/identity/activity/components/ActivityPeriodFilters.vue` | Variantes de claro/oscuro para botones y fechas, estado activo, `:hover`, `:focus-visible`, `color-scheme` y `prefers-reduced-motion`. Es una referencia explícita y autocontenida. |
| Tarjetas, texto secundario y detalle interactivo | `src/modules/identity/activity/overview/components/ActivityMetricCard.vue` | Superficie clara/oscura, jerarquía tipográfica, separadores y panel de ayuda con estilos por tema. |
| Modal con estados y lista densa | `src/modules/identity/users/user-management/components/UserNotesDialog.vue` | Revisar su tratamiento local del diálogo, inputs y botones en ambos temas; CSS incluye reglas `.dark`. |
| Badges/estado y superficies de gestión | `src/modules/identity/users/user-management/UserManagementView.vue` y estilos del componente | Estados activos/baneados distinguidos mediante texto/color/indicador; tarjetas y campos mantienen variantes de tema. Usar semántica de estado y no solo el color. |
| Carga, error, reintento y vacío | `src/modules/identity/activity/user-activity/UserActivityView.vue` | Estados explícitos con `role="status"`/`role="alert"`, texto y superficies diferenciadas, más reintento. `ActivityUserDailyCharts.vue` añade skeleton y estado vacío oscuro/claro. |
| Toast y confirmación compartidos | `src/style.css` y `src/services/swal/SwalService.ts` | Patrones ya existentes de toast/confirmación con variante oscura; conviene documentar cuándo usar el servicio compartido frente a feedback inline. |

Decisión para DS-2: priorizar estos patrones con tokens semánticos y normalizar el consumo por tema; conservar identidad, color de marca y acentos específicos cuando su contexto y contraste sean válidos. No convertir automáticamente cada gris/hex o bloque aislado en token.

### Hallazgos priorizados de Dashboard

La severidad se refiere al riesgo de compatibilidad/accesibilidad verificable por código, no a una medición WCAG completa. Los hallazgos son estáticos; los que dependen de percepción final deben confirmarse en DS-3.

| Sev. | Archivo / componente | Problema observable o riesgo verificable | Tema | Referencia existente | Corrección recomendada para DS-4 |
|---|---|---|---|---|---|
| Alta | `src/modules/dashboard/widgets/community/components/DashboardCommunityWidget.vue` — tabs Discos/Portadas | Ambos botones declaran `outline-none focus:outline-none`; no existe estilo `focus-visible` alternativo. El foco de teclado queda sin indicador explícito. | Claro y oscuro | `ActivityPeriodFilters.vue` y `ActivityMetricCard.vue` usan `:focus-visible`. | Restaurar indicador visible coherente con foco de marca y probar teclado en estados normal/seleccionado. |
| Alta | `src/modules/dashboard/widgets/community/components/DashboardCommunityStatsModal.vue` — distribución y estados | La tarjeta/modal cambia a fondos oscuros, pero `.bucket-count` (`#263754`), `.streak-days` (`#a64b48`) y `.state-message` (`#5e6c84`) mantienen colores fijos que pueden perder contraste sobre el fondo oscuro. No hay overrides `.dark` para esas reglas; otros textos sí se sobrescriben. | Oscuro | `ActivityMetricCard.vue` asigna color de texto y superficie dentro del override oscuro. | Llevar texto y estado a tokens semánticos; conservar el tratamiento visual de la distribución y comprobar contraste sobre la superficie real. |
| Media | `src/modules/dashboard/widgets/community/components/DashboardCommunityWidget.vue` — selector de año | El `<select>` fija `bg-rv-navy text-white` en ambos temas. Es un control legible de marca, pero fuerza una pastilla navy en tema claro y no usa la superficie clara de los selectores de referencia. | Claro (inconsistencia); ambos (estilo fijo) | `ActivityPeriodFilters.vue` muestra controles adaptados a cada tema. | Validar con pantalla completa y sustituir por patrón/tokens del selector si la pastilla oscura no forma parte de una decisión de marca intencionada. |
| Media | `src/modules/dashboard/widgets/musical-world/components/DashboardMusicalWorldModal.vue` — estados de mapa | “Preparando geometría local…” y el índice del ranking usan `text-gray-500` sin variante `dark:` sobre superficies oscuras. El código fija un gris de texto que puede ofrecer contraste bajo en tema oscuro. | Oscuro | `UserActivityView.vue` y `ActivityUserDailyCharts.vue` expresan texto secundario para ambos temas. | Aplicar texto secundario semántico y validar el contraste sobre el panel modal. |
| Media | `src/modules/dashboard/widgets/latest-votes/components/DashboardLatestVotesWidget.vue` — botón con nombre de disco | El botón fuerza `focus-visible:!outline-none`; aunque subraya al recibir foco, el indicador queda limitado al subrayado del texto y puede no ser suficientemente perceptible para el control. | Ambos | Selectores Activity usan contorno de foco de 2 px con offset. | Usar indicador `focus-visible` consistente que no dependa solo del subrayado. |
| Baja / validar | `src/modules/dashboard/widgets/musical-world/components/MusicalWorldMap.vue` — etiqueta SVG de país | `.country-value` define primero texto oscuro sobre contorno blanco y, a continuación, lo redefine como texto blanco sobre contorno azul oscuro; la segunda regla gana en ambos temas. Es fijo, legible potencialmente sobre la escala de rosas por contorno, pero no responde al tema. | Ambos; depende del color de cada país | No hay un patrón de mapa externo que determine el tratamiento. | Medir contraste del texto delineado en todos los niveles de relleno y mantener escala/identidad del mapa; no cambiar sin inspección visual. |
| Baja / sistémica | `src/modules/dashboard/widgets/artists/components/DashboardSimilarArtistDiscCard.vue` — acciones externas; `DashboardCommunityWidget.vue` — pills externos | Verde/cian y otros colores de proveedor aparecen como hex/clases fijas (Spotify/Bandcamp/Telegram) con texto blanco. La intención de marca externa es plausible, pero el contraste y la consistencia de hover/focus deben verificarse por superficie. | Ambos | `AccessRequestModal.vue` muestra hover y foco explícitos en CTA de gradiente; no hay una referencia exacta de proveedor. | Documentar excepción para colores de marca externos y exigir comprobación de contraste/foco, sin reemplazar sus colores arbitrariamente. |

No se registran como defectos confirmados: overlays negros translúcidos de modales/imagen, acentos fijos de marca sobre superficies con contraste previsto, colores de podio, o decisiones deliberadas del mapa. El detector Impeccable se conserva solo como fuente auxiliar: sus observaciones de D-MOD-4d no definen tokens ni invalidan este análisis.

### Cobertura por widgets y modales

Se revisaron los once widgets actuales: Feed, Comunidad, Top 3 semanal, Top 3 mensual, Disco aleatorio, Portada del día, Artistas favoritos, Cementerio, Mundo musical, Tu semana musical/últimos votos y Aventura. La lectura estática muestra pares claro/oscuro explícitos en la mayoría de tarjetas, cabeceras, textos y skeletons; errores/vacíos/loading existen de forma desigual, algunos no tienen caja propia o dependen de mensajes simples. Se revisaron también `DashboardCommunityStatsModal.vue`, `DashboardMusicalWorldModal.vue`, `DashboardFavoriteArtistModal.vue` y `DiscDetail.vue` como detalle abierto desde widgets. Community Stats contiene reglas CSS oscuras propias; los otros modales usan en general pares `dark:`. El patrón general es repetido, no centralizado.

**Pendiente de inspección visual:** revisar los once widgets y cuatro diálogos en viewport escritorio/móvil, claro/oscuro, contenido real/extremo, hover/focus/disabled y estados loading/empty/error; validar especialmente foco de tabs, contraste de textos secundarios, fondos de select y colores de la visualización SVG. Esta auditoría no confirma el aspecto renderizado de ningún caso.

### Índice propuesto para `docs/design-system.md` (DS-2)

1. Propósito, alcance y autoridad de la guía.
2. Principios de identidad visual Riff Valley y ejemplos existentes.
3. Temas: selección, persistencia, activación de `.dark` y compatibilidad obligatoria.
4. Tokens semánticos: canvas/superficies, texto, bordes/separadores, acción/brand, foco y estados; asignación de valores claro/oscuro y relación con tokens de marca.
5. Tipografía, jerarquía, escalas, iconografía y uso de Skaters/Inter.
6. Superficies y composición: página, tarjeta, panel, modal, elevación y overlay.
7. Interacción: botones (primario/secundario/terciario/destructivo), links, selectores, inputs, tabs, badges y estados hover/focus/pressed/disabled/loading.
8. Estados de contenido: carga, skeleton, vacío, error, éxito y reintento.
9. Contraste, foco, teclado, motion reducido, semántica/ARIA y pruebas en ambos temas.
10. Patrones reales reutilizables con rutas, límites y anti-patrones confirmados.
11. Reglas para agentes: consultar tokens primero, prohibición de colores fijos sin excepción, revisión claro/oscuro y cómo documentar excepciones.
12. Checklist de revisión y proceso para evolución de tokens.

### Plan DS-1–DS-5 y cierre

| Fase | Alcance | Estado / criterio de cierre |
|---|---|---|
| **DS-1** | Auditar tema, tokens, Tailwind, patrones externos y once widgets/modales; inventario estático y roadmap. | **Completada** en este registro; sin cambios de UI ni guía canónica. |
| **DS-2** | Crear `docs/design-system.md` como guía canónica obligatoria basada en patrones existentes; documentar una nomenclatura semántica propuesta e incorporar referencias. | **Completada** el 2026-10-27. Los tokens semánticos quedan como propuesta documental, no aprobada ni implementada. No se modifica Dashboard. |
| **DS-3** | Auditar los once widgets y componentes asociados frente a DS-2; inspección estática completa y visual si hay navegador/entorno operativo. | **Completada como auditoría estática.** No se hizo inspección visual en navegador; esa limitación se acepta como parte del cierre actual. |
| **DS-4** | Corregir los hallazgos confirmados con tareas pequeñas por widget o patrón, aplicando la guía y preservando marca/comportamiento. | **Cerrada por decisión del usuario:** DS-4a–DS-4d completadas; DS-4e–DS-4j descartadas, no completadas. Los tres problemas visuales prioritarios señalados por el usuario están resueltos y este acepta el diseño actual. |
| **DS-5** | Verificación final en claro y oscuro, desktop/móvil y estados principales, teclado/foco y contraste. | **Cancelada por decisión del usuario.** No se inspeccionaron visualmente ambos temas en navegador; no queda como tarea pendiente del roadmap actual. |

La reorganización modular/técnica D-MOD-1–D-MOD-4d y el cierre visual decidido por el usuario son hitos distintos. Se acepta el diseño actual sin afirmar que todos los riesgos de DS-3 se hayan verificado o corregido.

### Resultado DS-2 — Guía canónica de estilos

**Estado: completada el 2026-10-27.** Se creó [docs/design-system.md](../docs/design-system.md) con la identidad, paleta y tema actuales; patrones reales fuera de Dashboard; requisitos de accesibilidad/compatibilidad; e índice de responsabilidades visuales. `AGENTS.md` ahora exige consultar la guía al crear o modificar UI. El índice frontend enlaza la guía publicada y el roadmap principal indica DS-1/DS-2 completadas.

La guía distingue implementación real, convención obligatoria y propuesta futura. Documenta los tokens de marca y Tailwind existentes y propone nombres para tokens semánticos de fondos, texto, borde, acciones, foco y estados, sin implementarlos ni tratarlos como clases disponibles. No modifica componentes, Tailwind, CSS, tema ni `.impeccable/config.json`.

Las referencias se comprobaron estáticamente por sus rutas y clases. No se ejecutó navegador ni se midió contraste renderizado; esta limitación permanece explícita en la guía. El plan histórico DS-3/DS-4/DS-5 queda supersedido por los estados actuales de la tabla: no se afirma que hallazgos no priorizados estén corregidos ni que ambos temas hayan sido inspeccionados visualmente.

### Resultado DS-3 — Auditoría de Dashboard contra la guía

**Estado histórico: auditoría estática completada el 2026-10-28.** Se revisaron los once widgets, cinco overlays/detalles (noticia, estadísticas de Comunidad, mapa, artista y `DiscDetail`) y los componentes compartidos que presentan discos. No se cambiaron componentes, estilos, configuración de Impeccable ni comportamiento en esa auditoría. Sus seguimientos DS-4/DS-5 se cierran mediante las decisiones registradas aquí; Dashboard ya no figura como pendiente.

**Método y límites:** comparación de templates, clases, estilos locales, accesibilidad declarada y estados con las reglas de [docs/design-system.md](../docs/design-system.md). Se comprobaron rutas y fragmentos con búsquedas estáticas. No hay herramienta de navegador disponible en esta sesión; tampoco hay servidor local respondiendo en `127.0.0.1:5173`. No se inspeccionó visualmente ningún elemento ni se confirmó autenticación, viewport, contraste renderizado o estado remoto. Los ratios indicados son cálculos orientativos a partir de colores hex declarados y superficies sólidas declaradas; requieren confirmación en el contexto renderizado, especialmente donde intervienen transparencias, gradientes o imágenes.

#### Cobertura por widget

| Widget | Archivos/componentes revisados | Resultado estático y estados considerados |
|---|---|---|
| Feed / Novedades | `src/views/homePage/components/NewsFeed.vue` | Superficie adaptada, filtros, noticias, loading/vacío y modal de noticia; se detecta foco eliminado, modalidad accesible incompleta y error indistinguible de vacío. |
| Comunidad | `src/modules/dashboard/widgets/community/components/DashboardCommunityWidget.vue`, `DashboardCommunityStatsModal.vue` | Año, tabs, rankings, carga/vacío/error/reintento y modal; foco ausente en tabs, textos fijos en el modal oscuro y select fijo de marca para validar visualmente. |
| Top 3 semanal | `src/modules/dashboard/widgets/top-rated/components/DashboardTop3Widget.vue` y `src/components/DiscCardComponent.vue` | Instancia semanal, skeleton, error, reintento, vacío, medallas y acciones de disco. Medallas y acciones compartidas tienen hallazgos. |
| Top 3 mensual | `src/modules/dashboard/widgets/top-rated/components/DashboardTop3Widget.vue` y `src/components/DiscCardComponent.vue` | Misma plantilla de Top 3 con período mensual; comparte los hallazgos de medallas y acciones de disco. |
| Disco aleatorio | `src/modules/dashboard/widgets/random-disc/components/RandomDiscWidget.vue`, `src/components/DiscCardComponent.vue` | Selector de modo, acción, reposo/resultado y tarjeta de disco; estados principales tienen pares de tema y foco explícito. Foco oscuro de marca y detalle requieren comprobación visual. |
| Portada del día | `src/modules/dashboard/widgets/cover-of-day/components/DashboardCoverOfDayWidget.vue` | Portada, controles de voto, loading/vacío/error/submit y disabled; estilos de superficies y foco están declarados para ambos temas. No se halló incompatibilidad confirmada. |
| Artistas favoritos | `src/modules/dashboard/widgets/artists/components/DashboardFavoriteArtistsWidget.vue`, `DashboardFavoriteArtistModal.vue`, `DashboardSimilarArtistDiscCard.vue`, `src/components/DiscDetail.vue` | Períodos, tarjetas, carga/error/vacío, diálogo de artista y apertura de detalle. El diálogo de artista gestiona nombre, Escape y foco; el detalle de disco compartido no declara semántica/gestión equivalente. La legibilidad sobre portadas depende del contenido visual. |
| Cementerio | `src/modules/dashboard/widgets/cemetery/components/DashboardCemeteryWidget.vue`, `src/components/DiscCardComponent.vue` | Acción de sorteo, estados y cards adaptan superficies. Texto auxiliar `gray-500` oscuro necesita revisar contraste; las acciones de disco comparten problemas de teclado/foco. |
| Mundo musical | `src/modules/dashboard/widgets/musical-world/components/DashboardMusicalWorldWidget.vue`, `DashboardMusicalWorldModal.vue`, `MusicalWorldMap.vue` | Ranking, estados, modal, mapa SVG, selección/zoom y teclado; modal declara gestión de foco y mapa declara teclado. Dos textos `gray-500` carecen de variante oscura; etiqueta SVG y foco sobre la escala requieren inspección visual. |
| Tu semana musical / últimos votos | `src/modules/dashboard/widgets/latest-votes/components/DashboardLatestVotesWidget.vue`, `src/components/DiscDetail.vue` | Resumen, últimos votos, carga/vacío/error y reintento; los botones de disco usan subrayado como único indicador explícito de foco. El modal compartido tiene hallazgo de accesibilidad. |
| Aventura | `src/modules/dashboard/widgets/adventure/components/AdventureModule.vue`, `src/components/DiscCardComponent.vue` | Inicio, opciones, carga, error/reintento, vacío y resultado; las opciones tienen foco visible, estado deshabilitado y pares de tema. El borde lateral de marca es una decisión intencionada; las acciones del resultado reutilizan DiscCard. |

También se revisaron `src/modules/dashboard/components/DashboardWelcomeBanner.vue` y `DashboardWidgetGrid.vue`: el grid declara distribución responsive; el contraste final de fecha/resumen sobre el banner y los saltos de layout necesitan comprobación en viewport. Estos componentes estructurales no añaden widgets al recuento de once.

#### Matriz de hallazgos

Las referencias a contraste en esta tabla son **estimaciones estáticas**, no mediciones de captura. “Confirmado estático” significa que la regla/clase problemática está en el código; no equivale a afirmar que se vio el resultado en pantalla. Las severidades ordenan el riesgo de accesibilidad y compatibilidad descrito por DS-2.

| ID | Widget / archivo y componente | Tema | Hallazgo y evidencia | Severidad | Regla DS-2 afectada | Referencia existente | Corrección mínima propuesta | Validación visual posterior |
|---|---|---|---|---|---|---|---|---|
| DS3-01 | Comunidad — `widgets/community/components/DashboardCommunityWidget.vue`, tabs Discos/Portadas | Ambos | **Confirmado estático:** ambos botones declaran `outline-none focus:outline-none` sin `focus-visible` sustituto. Tab seleccionable sin indicador de foco explícito. | Alta | Foco visible y teclado | `ActivityPeriodFilters.vue` (Identity), estados `:focus-visible` y `aria-pressed`. | Restaurar indicador visible en ambos tabs, conservando el estado seleccionado. Corrección local. | Sí: navegar con Tab/Shift+Tab y probar tab activo/inactivo en ambos temas. |
| DS3-02 | Novedades — `views/homePage/components/NewsFeed.vue`, filtros, filas y modal | Ambos | **Confirmado estático:** filtros y filas interactivas anulan outline/ring sin reemplazo. El modal tiene `role=dialog`/`aria-modal` pero carece de nombre asociado, Escape, ciclo/restauración de foco; cierre también anula foco. | Alta | Botones/teclado; foco; modal nombrado y gestionado | `ActivityPeriodFilters.vue` para controles; `DashboardFavoriteArtistModal.vue` para Escape, nombre y foco; `UserNotesDialog.vue` fuera de Dashboard para diálogo. | Restaurar foco visible y completar nombre/teclado/ciclo de foco del modal, siguiendo semántica del patrón ya existente. Corrección local. | Sí: teclado completo y dos temas, incluido retorno al disparador. |
| DS3-03 | Detalle de disco — `src/components/DiscDetail.vue`, usado por Artistas favoritos y Últimos votos | Ambos | **Confirmado estático:** diálogo sin `role`, `aria-modal` o nombre; botón de cierre sin nombre accesible; close elimina outline y el componente no declara Escape, focus trap ni restauración de foco. Superficie sí tiene par claro/oscuro. | Alta | Modal accesible, nombres, foco y teclado | `DashboardFavoriteArtistModal.vue` y `DashboardMusicalWorldModal.vue`. | Completar semántica y gestión de foco/cierre y nombre del control, manteniendo la composición y datos actuales. Es un patrón compartido; comprobar todos sus consumidores. | Sí: teclado, apertura/cierre y tema en cada consumidor. |
| DS3-04 | Top 3 semanal/mensual, Aleatorio, Portada del día, Cementerio y Aventura — `src/components/DiscCardComponent.vue` | Ambos | **Confirmado estático:** varios botones eliminan `focus:outline-none` sin sustituto. El título/artista y algunos iconos accionables tienen `@click` en `h2`, `p`, `div` o icono, sin semántica equivalente de teclado/tabulación; `cursor-pointer` no los hace operables por teclado. | Alta | Control operable por teclado, foco visible, nombre y semántica | `ActivityPeriodFilters.vue`; botones y controles existentes en `DashboardFavoriteArtistModal.vue`. | Mantener las acciones actuales y hacerlas controles semánticos con nombres e indicador visible. Corrección del componente compartido; no añadir nuevas acciones. | Sí: recorrer con teclado cada widget consumidor y estados activo/disabled en ambos temas. |
| DS3-05 | Comunidad — `widgets/community/components/DashboardCommunityStatsModal.vue`, distribución y mensajes | Oscuro | **Confirmado estático:** `.bucket-count` (`#263754`) permanece sobre superficie oscura (`#182235`); estimación 1.33:1. `.streak-days` (`#a64b48`) sobre esa superficie ≈2.82:1. `.state-message` (`#5e6c84`) sobre `#111827` ≈3.34:1. Sin override oscuro para esas reglas; el diálogo sí declara foco visible en cierre/reintento. | Alta | Contraste y texto de estado; tokens por tema existentes | `ActivityMetricCard.vue` y `UserActivityView.vue`, que ajustan texto/superficie por tema. | Añadir colores de texto/estado adecuados al tema usando clases/patrón disponible; preservar colores de datos solo si contraste y función siguen siendo distinguibles. Corrección local. | Sí: medir texto sobre la superficie exacta, incluyendo valores y estados. |
| DS3-06 | Comunidad, Feed, Top 3 y Cementerio — `DashboardCommunityWidget.vue`, `views/homePage/components/NewsFeed.vue`, `top-rated/components/DashboardTop3Widget.vue`, `cemetery/components/DashboardCemeteryWidget.vue` | Principalmente oscuro; Feed claro | **Confirmado estático, contraste por confirmar en render:** varios mensajes de vacío/carga/subtítulos usan `text-gray-400` sin pareja oscura, o `text-gray-500` sobre darkCard/darkSurface. Ejemplos: feed `loading`/vacío/fecha; comunidad loading/ordinal/vacío; Top 3 vacío `gray-400 dark:gray-500`; subtítulo Cementerio `gray-400 dark:gray-500`. Las estimaciones de `#9ca3af` sobre blanco ≈2.54:1 y `#6b7280` sobre `#404157` ≈2.06:1 advierten riesgo para texto pequeño. | Media | Contraste, jerarquía secundaria y distinción entre estados | `ActivityMetricCard.vue`, `UserStatisticsView.vue`, `ActivityComparisonChart.vue`. | Cambiar solo texto pequeño que no alcance contraste suficiente por la variante secundaria ya usada por contexto; evitar un reemplazo global indiscriminado de grises. Por grupos de widget. | Sí: comprobar sobre las superficies reales y estado/copy en ambos temas. |
| DS3-07 | Mundo musical — `widgets/musical-world/components/DashboardMusicalWorldModal.vue`, loading y ordinal de ranking | Oscuro | **Confirmado estático:** `text-gray-500` en “Preparando geometría local…” (línea 179) y en el índice del ranking (línea 206) no tiene `dark:`; están dentro de la superficie oscura del modal. `#6b7280` sobre `#2a2b3d` ≈2.87:1. Otros textos de contexto sí declaran par oscuro. | Media | Contraste y clases adaptadas al tema | `DashboardMusicalWorldWidget.vue` y `UserActivityView.vue` usan texto pareado por tema. | Añadir variante secundaria para tema oscuro en esos dos elementos. Corrección local. | Sí: revisar estados de geometría/carga y ranking en claro/oscuro. |
| DS3-08 | Top 3 semanal/mensual — `widgets/top-rated/components/DashboardTop3Widget.vue`, `.medal-chip` | Ambos | **Confirmado estático:** texto blanco pequeño sobre gradientes dorado y plateado. Extremos declarados arrojan aprox. 1.40–2.33:1 (oro) y 1.82–3.54:1 (plata); el bronce varía 3.14–7.10:1. La insignia también depende del color para el lugar, aunque el orden/listado aporta contexto. | Media | Contraste y no depender solo del color | `UserManagementView.vue` para estado acompañado de etiqueta; conservar el lenguaje de podio existente. | Mantener gradientes/identidad de medalla y ajustar el tratamiento del texto o sumar ordinal legible que no dependa del color. Corrección local compartida por ambos períodos. | Sí: probar las tres medallas en ambas instancias y verificar legibilidad del ordinal. |
| DS3-09 | Últimos votos — `widgets/latest-votes/components/DashboardLatestVotesWidget.vue`, botones de nombre de disco | Ambos | **Confirmado estático:** `focus-visible:!outline-none` desactiva el contorno; queda subrayado reforzado como indicador. Puede ser difícil de percibir en texto pequeño y no delimita el control. | Media | Foco visible y controles | `ActivityPeriodFilters.vue` ofrece foco de contorno de 2px; `DashboardFavoriteArtistModal.vue` usa focus-visible en botones de disco. | Reutilizar un contorno visible junto al tratamiento subrayado. Corrección local. | Sí: recorrer botones por teclado en ambos temas, ancho móvil y nombres largos. |
| DS3-10 | Feed — `views/homePage/components/NewsFeed.vue`, carga de datos | Ambos | **Confirmado estático:** el `catch` solo registra el error; al terminar `loading`, la misma rama de lista vacía comunica “No hay novedades disponibles”. Error y ausencia real de resultados no se distinguen ni hay reintento visible. | Media | Estados error/vacío explícitos y reintento | `UserActivityView.vue`, con error explícito y acción de reintento. | Exponer estado de error y reintento con el patrón ya existente, sin alterar contrato del servicio. Corrección local. | Sí: forzar/observar loading, error, reintento y vacío real en ambos temas. |
| DS3-11 | Comunidad — selector de año en `DashboardCommunityWidget.vue` | Ambos (inconsistencia potencial en claro) | **Riesgo/decisión por validar:** `<select>` usa `bg-rv-navy text-white` fijo y anula outline, pero es una pastilla corporativa con texto blanco, no un negro arbitrario. No se declara sustituto de foco. | Media (foco); visual pendiente | Selector, excepción de marca y foco visible | `ActivityPeriodFilters.vue` para selector adaptado y teclado. | Conservar navy si es decisión de marca/contraste válida; añadir foco visible. Cambiar superficie solo si DS-5 demuestra inconsistencia perceptible. Corrección local del foco, decisión de superficie condicional. | Sí: foco, menú desplegado y percepción en claro/oscuro. |
| DS3-12 | Mundo musical — `widgets/musical-world/components/MusicalWorldMap.vue`, etiqueta de país y foco SVG | Ambos | **Riesgo que requiere captura:** valor de país se fija a texto claro con borde oscuro sobre rellenos rosa variables. Los controles tienen una regla `:focus-visible` custom, pero falta evaluar si el borde de marca se distingue sobre todos los rellenos. El detector señaló `gray-on-color`; se revisó el código: gris corresponde a leyenda/fondo neutral y rosa a muestra adyacente, por lo que no se registra como defecto confirmado. | Baja, pendiente | Contraste, foco visible y colores de datos | No hay mapa equivalente fuera de Dashboard; `ActivityPeriodFilters.vue` solo sirve como criterio de foco. | Medir etiqueta y contorno sobre cada nivel de escala; conservar escala/identidad corporativa salvo evidencia de contraste insuficiente. No cambiar antes de inspección. | Sí, obligatoria en ambos temas y con navegación por mapa. |
| DS3-13 | Artistas favoritos — `widgets/artists/components/DashboardFavoriteArtistsWidget.vue`, tarjetas sobre portada; Banner — `components/DashboardWelcomeBanner.vue` | Ambos | **Riesgo que requiere captura:** texto superpuesto depende de fotografías o gradiente de fondo. El código aplica tratamientos de imagen/gradiente, pero el resultado cambia con activos y composiciones reales; la fecha del banner también usa texto secundario sobre fondo compuesto. No se concluye incumplimiento por el código solo. | Baja, pendiente | Contraste, legibilidad y responsive | Tarjetas/superficies pareadas en `ActivityMetricCard.vue`; la guía pide probar contenido real/extremo. | Revisar con portadas claras/oscuras, nombres largos y tamaños estrechos; ajustar overlay solo si la legibilidad observada falla. | Sí, explícita con distintos activos y viewport móvil. |
| DS3-14 | Aleatorio — `widgets/random-disc/components/RandomDiscWidget.vue`, indicador focus en acción de marca | Oscuro | **Riesgo visual:** el foco usa `focus-visible:outline-rv-navy` también en tema oscuro; el contraste con el botón morado y la superficie dark no puede confirmarse sin render. No es un problema probado en código. | Baja, pendiente | Foco visible en ambos temas | Botón de `UserActivityView.vue` con foco de marca explícito. | Confirmar el contorno sobre botón y card; cambiar color solo si no resulta visible. | Sí: tabular hasta acción principal y verificar ambos temas. |

#### Riesgos pendientes y decisiones intencionadas

- **Sin evidencia visual:** no se certifica apariencia de superficies, hover, focus, estados desplegados, responsividad, recorte/scroll de modales, ni contraste sobre imágenes, overlays o fondos con transparencia. Tampoco se comprobó el comportamiento del menú nativo del selector de año.
- **Estados cubiertos parcialmente al auditar DS-3:** `NewsFeed` no separaba error de vacío en su template; en otros widgets se encontraron estados/loading/error/retry de manera desigual. La auditoría propuso revisar esos estados como parte de DS-5; esa tarea se canceló y las observaciones permanecen como historial, no como trabajo activo.
- **Impeccable, auxiliar:** el detector señaló `AdventureModule.vue:49` por `border-l-4`; se conserva como acento que diferencia opciones. Señaló `MusicalWorldMap.vue:313` por `text-gray-100` junto a `bg-pink-950`; la lectura del template y leyenda muestra textos y muestra de color en elementos separados. No se promueven a defectos ni se cambió `.impeccable/config.json`.
- **Decisiones visuales a conservar salvo evidencia:** acentos de marca y gradientes; pastilla navy del selector de año como posible decisión corporativa; overlays negros translúcidos sobre modal/portada; escala rosa del mapa; colores oro/plata/bronce como lenguaje de podio. El hallazgo de medallas se refiere al texto blanco pequeño sobre parte del gradiente, no a prohibir esos colores.
- **Guía:** no se identificó necesidad de editar `docs/design-system.md` en DS-3. La propuesta de tokens semánticos sigue pendiente de aprobación/implementación y no bloquea las correcciones locales propuestas.

#### Registro histórico de subtareas DS-4

Esta fue la descomposición inicial de trabajo. Las descripciones y criterios se conservan para trazabilidad; el estado vigente es el de la tabla DS-1–DS-5 y el cierre definitivo al final de este documento. Las subtareas descartadas no se consideran ejecutadas.

| Tarea | Alcance y hallazgos | Archivos principales | Criterios de aceptación | Comprobaciones | Dependencias / tamaño |
|---|---|---|---|---|---|
| **DS-4a — Hacer accesibles tabs y modal de Comunidad (completada 2026-10-28)** | Resolver DS3-01 y parte de DS3-11: foco de tabs y selector; conservar la pastilla navy salvo que evidencia visual justifique otra superficie. | `widgets/community/components/DashboardCommunityWidget.vue` | Tabs y select reciben foco claramente visible; activo/inactivo sigue distinguible; teclado opera tabs/select sin alterar selección ni datos. | Pruebas del widget y foco/selección comprobados; inspección visual de claro/oscuro y menú nativo de año pendiente para DS-5. | Ninguna. **S** |
| **DS-4b — Corregir contraste de stats Comunidad (completada 2026-10-28)** | Resolver DS3-05. | `widgets/community/components/DashboardCommunityStatsModal.vue` | Textos de distribución y estados son legibles sobre cada superficie de claro/oscuro; foco del modal y significado de categorías se preservan. | Pruebas focalizadas de distribución, estados, etiquetas, diálogo y teclado; contraste calculado sobre las superficies CSS declaradas. Confirmación visual renderizada pendiente para DS-5. | Ninguna; no esperar tokens futuros. **S** |
| **DS-4c — Completar teclado y estados de Feed (completada 2026-10-28)** | Resolver DS3-02 y DS3-10. | `src/views/homePage/components/NewsFeed.vue` | Filtros/filas tienen foco visible; modal nombrado, con cierre teclado, ciclo/restauración de foco; error no se presenta como vacío y puede reintentarse si el contrato lo permite. | 8 tests del Feed cubren filtros, selección, foco, modal, navegación, carga/error/reintento/vacío; claro/oscuro pendiente de inspección visual en DS-5. | Ninguna. **M** |
| **DS-4d — Normalizar accesibilidad compartida de DiscDetail (completada 2026-10-28)** | Resolver DS3-03 para todos los consumidores. | `src/components/DiscDetail.vue`; tests de consumidores bajo `widgets/artists` y `widgets/latest-votes` | Diálogo correctamente nombrado/modal; cierre accesible; foco gestionado y restaurado; superficies y estados conservan claro/oscuro. | Pruebas de apertura/cierre y teclado en cada consumidor; claro/oscuro y estados de detalle. | Revisar todos los imports/consumidores. **M** |
| **DS-4e — Hacer operables por teclado las acciones de DiscCard (descartada por decisión del usuario)** | Resolver DS3-04 para widgets consumidores, sin añadir acciones. | `src/components/DiscCardComponent.vue` y tests del componente/consumidores | No ejecutada como subtarea; el código actual no se presenta como cumplimiento de estos criterios. | Sin pruebas atribuibles a DS-4e. | Descartada; no es trabajo abierto en este roadmap. |
| **DS-4f — Ajustar textos secundarios y vacío/carga por widget (descartada por decisión del usuario)** | Resolver DS3-06 evitando reemplazos globales ciegos. | `NewsFeed.vue`, Comunidad, Top 3 y Cementerio | No ejecutada como subtarea; los riesgos originales no se presentan como corregidos. | Sin validación visual adicional. | Descartada; no es trabajo abierto en este roadmap. |
| **DS-4g — Corregir textos del modal Mundo musical (descartada por decisión del usuario)** | Resolver DS3-07. | `DashboardMusicalWorldModal.vue` | No ejecutada como subtarea; no se afirma que los textos/índices cumplan criterios de contraste renderizado. | Sin validación visual adicional. | Descartada; no es trabajo abierto en este roadmap. |
| **DS-4h — Asegurar contraste en medallas Top 3 (descartada por decisión del usuario)** | Resolver DS3-08 en semanal y mensual. | `DashboardTop3Widget.vue` | No ejecutada como subtarea; no se afirma que el contraste renderizado de medallas esté validado. | Sin validación visual adicional. | Descartada; no es trabajo abierto en este roadmap. |
| **DS-4i — Reforzar foco de últimos votos (descartada por decisión del usuario)** | Resolver DS3-09. | `DashboardLatestVotesWidget.vue` | No ejecutada como subtarea; no se afirma que se haya añadido el contorno propuesto. | Sin pruebas o recorrido atribuibles a DS-4i. | Descartada; no es trabajo abierto en este roadmap. |
| **DS-4j — Comprobar riesgos visuales antes de corregir (descartada por decisión del usuario)** | Revisar DS3-12, DS3-13 y DS3-14 sin aplicar cambios no confirmados. | Mapa SVG, tarjetas de Artistas favoritos, banner y acción Aleatorio | No ejecutada como subtarea; no se afirma que esos riesgos visuales se hayan inspeccionado o resuelto. | No hubo revisión visual de navegador. | Descartada; no es trabajo abierto en este roadmap. |

#### Resultado DS-4a y DS-4c — Comunidad y Novedades

**Completadas en código y pruebas focalizadas el 2026-10-28.** Comunidad conserva botones de selección independientes (`aria-pressed`), con foco visible de marca y selector de año etiquetado/focalizable. Novedades conserva filtros y destinos; añade foco visible y selección anunciada, estados de carga/error/vacío diferenciados con reintento, y completa el diálogo incluido por DS-4c con nombre accesible, Escape, ciclo y retorno del foco. No se cambió la API, no se añadieron dependencias ni se implementaron tokens semánticos futuros.

**Evidencia local:** 28 tests focalizados aprobados (20 de Comunidad y 8 de Feed) y suite completa con 636/636 tests en 84 archivos (referencia previa: 630/84); `pnpm run typecheck`, `pnpm build`, detector Impeccable sobre ambos componentes (`[]`) y `git diff --check` aprobados. La ejecución focalizada de ESLint sigue reportando únicamente dos funciones sin uso (`sourceAccentBar`, `sourceAccentGlow`) ya presentes en `NewsFeed.vue` en `HEAD`; se dejan intactas por estar fuera del alcance. Esta build emitió además avisos de minificación CSS para `.flex-[2]` y de chunk superior a 500 KB; no se atribuyen a estos cambios.

**Limitación histórica:** no se hizo captura ni comprobación visual en navegador de los temas claro/oscuro, el indicador renderizado de foco o el menú nativo de año. Las variantes explícitas se comprobaron estáticamente y mediante clases en tests. El usuario decidió posteriormente aceptar esta limitación; DS-4e–DS-4j se descartan y DS-5 se cancela, sin afirmar esas verificaciones como realizadas.

#### Resultado DS-4b — Contraste de estadísticas de Comunidad

**Completada en código y pruebas el 2026-10-28.** Se conserva la paleta clara preexistente y se añaden overrides oscuros locales para conteos de distribución, valores de racha, etiquetas pequeñas y mensajes de estado/error. El foco visible de cierre/reintento, el nombre del diálogo, los roles de estado y las etiquetas de intervalos permanecen intactos. No se tocaron datos, transporte ni comportamiento.

**Evidencia local:** cuatro pruebas focalizadas del modal aprobadas; suite completa 636/636 en 84 archivos (referencia: 636/84); typecheck, build, ESLint focalizado, detector Impeccable (`[]`) y `git diff --check` aprobados. El cálculo con colores de la hoja declarada da 13,07:1 para conteos, 8,39:1 para valores de racha, 7,95:1 para “días”, 8,86:1 para estados y 9,35:1 para error en las superficies oscuras respectivas. La comprobación Prettier se ejecutó pero señaló formato no canónico en `DashboardCommunityStatsModal.vue`, `DashboardCommunityWidget.test.ts` y `roadmap/dashboard.md`; no se aplicó un reformateo amplio ajeno a DS-4b. La build emitió los avisos de minificación CSS para `.flex-[2]` y de chunk >500 KB; no se atribuyen a estos cambios.

**Limitación conservada:** no se verificó en navegador la aplicación efectiva de `.dark`, el contraste renderizado, tamaños estrechos ni el foco visible sobre el diálogo. Los ratios anteriores usan los colores y fondos definidos en CSS, no una captura renderizada. DS-4d permanece completada; DS-4e–DS-4j se descartan y DS-5 se cancela por decisión del usuario.

#### Resultado DS-4d — Accesibilidad compartida de DiscDetail

**Completada en código y pruebas el 2026-10-28.** Se resuelve DS3-03 en el componente compartido: `DiscDetail` tiene rol de diálogo modal y nombre ligado al disco; el botón de cierre tiene nombre accesible e indicador `focus-visible`; Escape y el clic de fondo cierran el detalle; Tab/Shift+Tab quedan dentro del modal. Al cerrar, se devuelve el foco al disparador y se restaura el valor previo de `body.style.overflow`. Se conserva la pareja de superficies `bg-white`/`dark:bg-rv-darkCard` y no cambian los datos ni el evento `close`.

**Consumidores revisados:** `DashboardFavoriteArtistModal` y `DashboardLatestVotesWidget` (los dos consumidores Dashboard del hallazgo DS3-03); también se localizaron los consumidores existentes en `DiscCardComponent`, calendario, administración de artistas y calendario infantil. La API de props/eventos no cambió. Tests nuevos cubren foco inicial, nombre/modal, ciclo de teclado, Escape y restauración de scroll/foco; los tests de ambos consumidores ejercitan apertura, cierre por teclado y retorno del foco, incluyendo que Escape en el detalle no cierre también el diálogo de artista.

**Archivos modificados:** `src/components/DiscDetail.vue`, `src/components/DiscDetail.test.ts`, `src/modules/dashboard/widgets/artists/components/DashboardFavoriteArtistModal.test.ts`, `src/modules/dashboard/widgets/latest-votes/components/DashboardLatestVotesWidget.test.ts` y este roadmap.

**Evidencia local:** 51 tests focalizados aprobados en 3 archivos y suite completa con 641/641 tests en 85 archivos (referencia previa: 636/84); `pnpm run typecheck`, `pnpm build`, ESLint de los tres tests y Prettier del test nuevo pasan; Impeccable escaneó `DiscDetail.vue` sin hallazgos deterministas (`[]`) y `git diff --check` pasa. ESLint focalizado incluyendo `DiscDetail.vue` reporta 7 problemas preexistentes en esa pieza: el handler del overlay, un `img` sin `alt`, un `audio` sin `<track>` y tres usos de `any`; ya estaban en el código antes de DS-4d y no se amplía esta tarea para resolverlos. Prettier `--check` sobre todos los archivos tocados señala `DiscDetail.vue`, los dos tests de consumidor y `roadmap/dashboard.md`; el test nuevo sí pasa por separado. No se reformatearon archivos completos porque contienen estilo previo y cambios locales ajenos al alcance. Build aprobada con avisos existentes de minificación CSS para `.flex-[2]`, chunk >500 KB y datos Browserslist antiguos. No se cambiaron `.impeccable/config.json`, contratos HTTP, dependencias ni estilos de otros componentes.

**Limitación aceptada al cierre:** no se hizo comprobación visual en navegador de los temas claro/oscuro, contraste renderizado, responsive o foco sobre superficies reales. Las clases adaptativas y el foco se verificaron estáticamente y en tests; el usuario acepta el diseño actual sin inspección visual final. DS-4e–DS-4j quedan descartadas y DS-5 cancelada; ninguna se considera completada.

#### Criterios históricos de cierre para DS-5 (cancelada)

Estos eran los criterios propuestos para DS-5. La tarea se canceló por decisión del usuario y los criterios no se declaran cumplidos:

1. Los once widgets y los cinco overlays/detalles revisados (noticia, estadísticas de Comunidad, mapa, artista y DiscDetail compartido) se hayan inspeccionado en claro y oscuro con un navegador funcional, desktop y viewport estrecho.
2. Se hayan recorrido con teclado los controles de cada widget: foco visible, orden lógico, selección/disabled, diálogo, Escape, ciclo y retorno del foco.
3. Loading, error/reintento, vacío y contenido se comprueben por separado donde existan; ningún error se confunda con ausencia de datos.
4. Texto, controles, badges y etiquetas gráficas se midan contra las superficies realmente renderizadas, incluidas transparencias, gradientes y portadas; registrar casos que no admiten medición automática y la inspección practicada.
5. Las excepciones corporativas intencionadas (navy, rosa/mapa, medallas, proveedores y overlays) se hayan confirmado en contexto y no se hayan sustituido solo por sugerencias de Impeccable.
6. Los hallazgos confirmados DS3-01–DS3-10 queden corregidos o tengan una excepción documentada con evidencia; DS3-11–DS3-14 se resuelvan por comprobación, no por suposición.
7. La evidencia visual, viewports, estados y comprobaciones realizadas queden registradas. Tests/build o Impeccable por sí solos no cierran DS-5.

Las referencias a patrones usadas en DS-3 son implementaciones existentes, no una certificación visual. Ningún contraste se verificó mediante captura en esta fase. El selector navy, textos sobre imagen, foco SVG y outline oscuro de Aleatorio no se inspeccionaron; quedan como limitaciones aceptadas al cierre, no como tareas abiertas del roadmap. Cualquier nueva revisión se tratará como una iniciativa independiente solicitada por el usuario.

## Cierre definitivo de Dashboard — Frontend (2026-10-28)

**Estado: COMPLETADO Y CERRADO por decisión del usuario.** Este es el estado vigente del roadmap y sustituye las propuestas y estados pendientes conservados en las entradas históricas.

- Los once widgets están implementados. El usuario confirma que realizó satisfactoriamente sus comprobaciones funcionales manuales; esta confirmación no se atribuye al agente.
- La reorganización modular D-MOD-1–D-MOD-4d está completada, incluida la revisión técnica final. Se mantienen sus evidencias y limitaciones en la sección D-MOD.
- DS-1, DS-2 y DS-3 permanecen completadas. DS-4a–DS-4d permanecen completadas según sus criterios originales. DS-4e–DS-4j se descartan por decisión del usuario y no se consideran implementadas. DS-5 queda cancelada y no se considera completada.
- Los tres focos visuales prioritarios confirmados por el usuario quedan resueltos: color de las acciones de Tu mundo musical, botones del Top 10 de países y botones de despliegue/discos valorados de «Tu historia con». El usuario acepta el diseño actual; no solicita más intervención visual.
- La inspección visual en navegador de ambos temas, medidas de contraste renderizado y validación visual responsive no se realizaron. No se afirma que ocurrieran; son limitaciones aceptadas al cierre.
- **Verificaciones automatizadas comunicadas:** la suite completa pasó con 641 tests en 85 archivos, y typecheck/build también pasaron en esta sesión; tras los ajustes finales de color, pasaron además los tests focalizados de Mundo musical y Tu historia. ESLint focalizado, Impeccable (`[]`) y `git diff --check` pasaron. Prettier `--check` no pasó para los tres SFC implicados por formato no canónico; no se reformatearon archivos completos. Build conservó avisos de Browserslist, minificación CSS de `.flex-[2]` y chunks >500 kB. `pnpm run markdown:links` encontró un único destino preexistente fuera del repositorio en `roadmap/roles.md:9`; no pertenece al cierre de Dashboard. Los checks son locales; no se validó GitHub Actions.
- `docs/design-system.md` permanece disponible como guía para futuros desarrollos. No queda trabajo frontend de Dashboard por ejecutar dentro del roadmap actual; las comprobaciones backend/entorno citadas en entradas históricas no se atribuyen ni se dan por validadas en este cierre. Cualquier mejora posterior requerirá una nueva tarea independiente.

No se reabren ni se presentan como completadas las subtareas DS descartadas, DS-5 cancelada ni la navegación incompleta de D-ART-7d.2. Las limitaciones históricas que no bloquean esta decisión permanecen documentadas para preservar la trazabilidad.
