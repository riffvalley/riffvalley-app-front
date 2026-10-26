# D-0 — Auditoría integral del Dashboard

**Estado:** auditoría documental completada; todas las tareas de implementación quedan pendientes. No se modificó código funcional.

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
| `comunidad` — enlaces y Top usuarios | Inline DashboardPage; top rates/covers y distribución vía `/discs/homeDiscs` | Ranking vacío explícito; errores silenciados. Auth general; no guard de rol específico. Selección año y tab local. Carga de stats aunque se desactive el widget. | `fetchStats` consulta intervalo anual/todos; `fetchUserStats` consulta homeDiscs otra vez; llamada no se evita al ocultarlo. Community links son estáticos. |
| `top3semana` | Inline DashboardPage + DiscCard; `/discs/homeDiscs?dateRange=semana` | Skeleton, vacío; error convertido en vacío; auth general. Preferencia desktop/mobile. | Consultado al montar siempre; llamada paralela con top mensual. |
| `top3mes` | Inline DashboardPage + DiscCard; `/discs/homeDiscs?dateRange=mes` | Skeleton, vacío; error convertido en vacío; auth general. | Siempre consultado; comparte respuesta/endpoint con otras consultas, aunque parámetros difieren. |
| `discoAleatorio` | Inline DashboardPage + DiscCard; `/discs` | Reposo, rolling y resultado; fallo sin mensaje específico. Consulta bajo acción del usuario. Auth general. | Cuenta no votados y pide offset aleatorio. No Query/caché; evita carga inicial de su resultado, pero el widget se monta si enabled. |
| `portadaDia` | Inline DashboardPage + DiscCard; `/discs` y POST/PATCH `/rates` | Loading, portada/voto, submitting; no hay error visible. Vote controlado localmente. Auth general. | Carga inicial siempre, aunque widget esté oculto; usa totalDiscs del fetch de usuario (la llamada no se espera antes en otro flujo, usa fallback). |
| `artistas` | Inline DashboardPage; `/rates/home-insights` | Loading/empty (errores silenciados); auth general. | Insights solo se piden si artistas o mundoMusical está habilitado. Comparte una sola respuesta con mundoMusical. |
| `cementerio` | Inline DashboardPage + DiscCard; `/discs` | Loading, rolling, lista vacía; errores silenciados. Consulta inicial de muestreo y botón para volver a sortear. | Se consulta incluso si widget desactivado. Inicialmente obtiene total; luego hasta 5 offsets por lotes de 20, con llamadas secuenciales para encontrar 2 discos sin votos. |
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
| D-3 Preferencias editor | Reubicar/adaptar `useDashboardConfig` a la frontera Account; mantener cola, optimismo, rollback, reset `[]`, migración legacy y mensajes; editor sigue dentro de Account | D-1 (D-2 opcional) | pruebas de sesión, edición simultánea, rollback, desktop/mobile, reset, legacy LS; no modifica otros prefs | M |
| D-4 Carga condicional y banner | Separar datos del encabezado de módulos; activar peticiones por widgets habilitados/viewport y cargas bajo demanda donde proceda | D-2, D-3 | tests: disabled no dispara request, enabled sí; llamadas que comparten endpoint deduplicadas solo si se acuerda; banner permanece correcto | M |
| D-5 Top y comunidad | Migrar top users y stats del grupo comunidad bajo owners Catalog/Rates; preservar año, tabs, ranking, modal y estados | D-4; contrato del API existente | pruebas parámetros, año/all, vacío/error, orden y datos actuales; sin cambio de endpoint | M |
| D-6 Top 3 | Migrar semana y mes como consumidores Catalog; mantener DiscCard y rangos de fecha | D-4 | ambas solicitudes/rangos y orden visual correctos, loading/vacío/error comprobados | S |
| D-7 Feed y Editorial/Community | Resolver owner por fuentes; mover componente/servicio frontend solo tras inventariar consumidores; mantener filtros, fuentes, modal y navegación | D-1, coordinación de owner | tests feed base, filtros y error fallback; consumidor Dashboard y otro consumidor si existe; HTML/links fuera de cambios incidentales | M |
| D-8 Interacciones de catálogo | Migrar portada/voto, random disc, cemetery y Adventure por capacidades; acciones directas pueden seguir sin Query | D-4; Catalog API disponible | pruebas llamadas bajo demanda, payload vote y estado, filtros de adventure y cero resultados; no cambiar backend | M (secuencial por widgets) |
| D-9 Insights, streak y recent votes | Migrar artistas/mapa, racha y últimos votos al owner de datos decidido; reusar query si ya existe y su key es válida | D-4; D-5 puede definir Rates owner | pruebas mapeo/formatos, autenticación implícita, errores y requests solo cuando visibles | M |
| D-10 Regresión y cierre | Revisar imports, registro completo, persistencia, comportamiento de sesión/roles shell, accesibilidad/teclado editor, responsive, red y documentación canónica | D-1–D-9 | suite proporcional + typecheck/build por cambio; smoke manual desktop/mobile; comparar Network con widgets activos/inactivos; confirmar sin ciclos y sin duplicar estado; límites CI reportados por separado | M |

### Distribución y orden

10 bloques: **XS 0, S 1, M 9, L 0**. Los M reflejan contratos, comportamiento persistido o un grupo de widgets que comparten llamada/API; el trabajo amplio se mantiene dividido por bloques funcionales. D-1 y D-2 desbloquean movimientos seguros; D-4 atiende primero la carga de widgets desactivados; D-5–D-9 pueden avanzar por owner tras su dependencia. No se planifica migrar todos los widgets a Query.

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

**Estado:** endpoint backend implementado y verificado con limitaciones documentadas; no se inició la integración frontend ni se modificó el banner. D-B2 queda pendiente.

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
