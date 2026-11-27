# Auditoría de gestión — Feedback, Versiones y Noticias

**Fecha:** 2026-11-27
**Estado:** auditoría estática completada; MGT-1 completada; MGT-2–MGT-10 pendientes.
**Alcance:** frontend de `/admin/feedback`, `/versions` y `/versions/kanban`, `/news`. Se consultó el backend en modo lectura únicamente para verificar contratos. No se modificó código funcional, no se ejecutaron tests/typecheck/build y no se hicieron comprobaciones visuales ni capturas.

## Resumen ejecutivo

| Apartado | Estado observado | Hallazgo principal | Severidad máxima |
|---|---|---|---|
| Feedback | Ya está en `src/modules/feedback/`, con API, aplicación, Query, permisos y pruebas focalizadas. El listado administrativo falla con el contrato actual del servidor. | `GET /suggestions` devuelve `{ data, counts }`; el frontend declara y trata la respuesta como un array. | **Crítica** — bloquea `/admin/feedback` al calcular filtros/contadores. |
| Versiones | Gestión y Kanban funcionan desde vistas legacy, con CRUD HTTP y formularios/acciones en las vistas. | La carga inicial de `/versions` no presenta loading/error, y una promesa rechazada no se captura. No hay pruebas focalizadas localizadas para Versiones. | **Alta** — fallo de carga sin estado recuperable; otras debilidades son medias. |
| Noticias | La gestión tiene CRUD, paginación, modal y adaptación de tema parcial; el servicio coincide en lo esencial con el contrato backend consultado. | Ante fallo de carga se lanza un aviso, pero al terminar loading se muestra “No hay noticias creadas”, indistinguible de una respuesta vacía. | **Media** — estado de error engañoso; cobertura crítica incompleta. |

La iniciativa previa de Feedback (FB-1/FB-2) declaraba su cierre, pero dejaba expresamente sin comprobar el contrato backend. El error actual cae exactamente en ese límite: el API frontend conserva la forma de retorno asumida en el cierre y los tests usan el mismo supuesto. Versiones y Noticias no tienen aún ownership modular propio en la arquitectura descrita por el documento canónico.

## Método, fuentes y límites

Se consultaron `docs/frontend/index.md`, `docs/frontend/architecture.md`, `docs/frontend/conventions.md`, `docs/design-system.md`, `roadmap.md` y `roadmap/feedback.md`. La arquitectura promueve ownership por capacidad, separación de transporte/aplicación/presentación, Query para estado remoto cacheable y migración gradual; no requiere imponer una estructura DDD idéntica. El sistema de diseño exige temas claro/oscuro, estados accesibles, controles etiquetados y foco visible. La revisión visual queda fuera de esta auditoría por restricción expresa.

Se inspeccionaron las rutas, vistas, servicios/tipos y pruebas presentes de los tres apartados. Se leyeron los controladores y servicios backend de Suggestions, Versions y News solo para verificar rutas, permisos y respuestas; no se ejecutó el backend. Las referencias backend son evidencia del checkout consultado, no garantía de que el entorno desplegado use exactamente ese commit.

**Clasificación:** “demostrado” significa que el flujo/contrato se deduce directamente del código revisado; “riesgo” indica una condición que merece verificación/prueba, pero no se afirma que ya falle en producción. No se atribuyen defectos a cambios recientes.

## 1. Feedback

### Estado actual

- **Rutas y acceso:** `/feedback` requiere autenticación y mínimo global `user`; `/admin/feedback` requiere autenticación y `superadmin`; los redirects legacy preservan query/hash. Sidebar apunta a `/admin/feedback` y oculta el acceso según rol. Referencias: `src/router/index.ts:79`, `src/layouts/default/components/routes.json:212`.
- **Arquitectura:** el módulo tiene `api/`, `types/`, `application/` y `presentation/views/`. TanStack Query posee listas, cancelación y mutaciones; claves incluyen usuario/generación, y la aplicación invalida Feedback y el resumen Sidebar donde corresponde. Sigue consumiendo `getCurrentVersionItems` desde el servicio legacy de Versions: acoplamiento conocido y razonable mientras Versions no tenga contrato de módulo público. Referencias: `src/modules/feedback/application/useFeedback.ts:19`, `src/modules/feedback/types/feedback.ts:1`.
- **Operaciones existentes:** alta de aportaciones; consulta propia; listado administrativo por tipo/estado; cambios de prioridad; reabrir, rechazar con motivo, completar ligado a item de versión o como mejora interna, eliminar y marcar leído localmente. No se observan edición de título/descripción ni borrado de aportaciones propias. API frontend en `src/modules/feedback/api/feedback.ts:12`.
- **Estados:** las vistas distinguen carga inicial, error/reintento y vacío. Mutaciones informan errores. Administración mantiene los filtros en la URL no; son estado local reactivo y cada combinación se convierte en query key/parámetros.
- **Filtros y orden:** tipo y estado se envían al backend; los contadores visibles se calculan sobre la lista recibida para el filtro activo. No hay paginación frontend ni se observa paginación backend para Suggestions.
- **Pruebas presentes:** API, aplicación, rutas, Sidebar y ambas vistas tienen tests. El test de contrato API comprueba paths/payloads, pero no el shape real de listados; la vista administrativa fija `data` como `FeedbackEntry[]` en el mock.

### Causa raíz del error conocido — demostrada

1. `GET /suggestions` se tipa en frontend como `Promise<FeedbackEntry[]>` y devuelve `response.data` sin adaptar la forma: `src/modules/feedback/api/feedback.ts:17`.
2. La query administrativa retorna ese valor directamente: `src/modules/feedback/application/useFeedback.ts:99`.
3. La vista asigna `query.data.value` a `suggestions` sin transformación; `countByStatus` llama `.filter()`, y el template también itera `suggestions`: `src/modules/feedback/presentation/views/FeedbackManagementView.vue:311`, `src/modules/feedback/presentation/views/FeedbackManagementView.vue:346`.
4. El backend actual implementa `findAll()` como `{ data, counts }`, no como array: `riffvalley-app-back/src/product/suggestions/suggestions.controller.ts:35`, `riffvalley-app-back/src/product/suggestions/suggestions.service.ts:53`. El endpoint `/suggestions/my` también responde `{ data, counts }`, consistente con `MyFeedbackResponse`.
5. Los tests perpetúan el contrato incorrecto: el mock HTTP usa `{ data: [] }` y el mock de vista usa `ref<FeedbackEntry[]>([sampleEntry])`: `src/modules/feedback/api/feedback.test.ts:19`, `src/modules/feedback/presentation/views/FeedbackManagementView.test.ts:23`.

Por tanto, el valor que se convierte en `suggestions` es un objeto con propiedades `data` y `counts`; no tiene método `.filter()`. Una guarda de tipo o fallback ocultaría que el consumidor y el contrato no están alineados. La corrección planificada debe adaptar el DTO real en el borde API y tipar la aplicación/vista en consecuencia, además de cambiar los tests al shape comprobado. **No hay evidencia que requiera modificar el backend** para este fallo: propuesta de contrato frontend compatible con la respuesta vigente.

### Inventario de problemas y riesgos

| ID | Gravedad | Estado | Hallazgo y evidencia |
|---|---|---|---|
| FB-A1 | Crítica | Defecto demostrado | Shape incorrecto de `GET /suggestions` causa `filter is not a function` y descompone `/admin/feedback`; referencias anteriores. |
| FB-A2 | Alta | Defecto de cobertura demostrado | Los tests de API y vista no modelan `{ data, counts }`; pasan la expectativa equivocada y no detectan A1. |
| FB-A3 | Baja | Riesgo residual | La entidad backend declara relación `user` con `eager: true` (aunque `findAll` solo nombra `versionItem` en `relations`), lo que explica que TypeORM la cargue. El shape esperado resulta coherente con el mapeo inspeccionado; queda pendiente una prueba de contrato de integración, no se clasifica como defecto. |
| FB-A4 | Baja | Deuda conocida | La consulta de items de versión pertenece al owner legacy `services/versions`; no hay entrypoint de módulo Versions. No crear dependencia profunda nueva; resolver al modularizar Versions, exponiendo solo lo necesario. |

No se ha demostrado un defecto de permisos frontend: las rutas y endpoints administrativos revisados requieren `superadmin`. La protección backend sigue siendo autoridad y no debe sustituirse por guards frontend.

## 2. Versiones

### Estado actual

- **Rutas y acceso:** `/versions` y `/versions/kanban` requieren auth y `superadmin`; están en navegación de gestión con subsección “Versión Actual”. El backend requiere `superadmin` para mutaciones CRUD de versiones/items; algunas lecturas son públicas. Referencias: `src/router/index.ts:190`, `riffvalley-app-back/src/product/versions/versions.controller.ts:24`.
- **Gestión:** lista versiones; crea versión (versión/fecha requeridas, notas opcionales); elimina versiones en desarrollo; modifica nombre y enlace Telegram en producción; abre items, ordena por tipo, edita tipo/descripción y elimina items. No se observa búsqueda, filtro ni paginación en la administración. Referencia: `src/views/versions/ManageVersions.vue:1`.
- **Kanban:** carga versión en desarrollo y backlog; crea items de backlog/versión, cambia columnas con drag-and-drop, valida nombres de branch, edita asignaciones y propiedades, mueve items entre backlog y versión, elimina items y promueve la versión a producción. Referencia: `src/views/versions/VersionKanban.vue:1`.
- **Datos/API:** `src/services/versions/versions.ts` concentra DTOs, entidades, transformaciones de fecha y endpoints públicos/admin. La firma `listVersions(): Promise<Version[]>` es compatible con `GET /versions` del controlador; el servicio backend `findAll` debe mantenerse como fuente para confirmar orden/relaciones de items en el follow-up.
- **Carga/errores:** `ManageVersions.load()` solo asigna resultado y se llama directamente desde `onMounted`; no establece loading/error ni captura rechazo (`src/views/versions/ManageVersions.vue:404`). La tabla no tiene estado vacío explícito. Kanban sí tiene loading y error para la versión; el fallo cargando usuarios superadmin solo se registra en consola (`src/views/versions/VersionKanban.vue:40`).
- **Pruebas:** no se localizaron tests focalizados de vistas o CRUD de Versions bajo `src/views/versions` o `src/services/versions`; tests de otros dominios prueban indirectamente la operación `getCurrentVersionItems`, no administración/versiones completa.

### Inventario de problemas y riesgos

| ID | Gravedad | Estado | Hallazgo y evidencia |
|---|---|---|---|
| VR-A1 | Alta | Defecto demostrado | Error de `listVersions()` queda como rechazo sin captura/estado; el usuario ve tabla vacía o incompleta, sin diferenciar carga/error y sin reintento. `onMounted(load)` no maneja el rechazo. |
| VR-A2 | Media | Defecto demostrado | Falta estado explícito de carga/vacío en Gestión; tbody vacío representa tanto respuesta vacía como antes/durante el fallo. |
| VR-A3 | Alta | Falta de cobertura demostrada | No hay tests focalizados localizados para CRUD de Versiones/Kanban (carga, actualización, movimientos, promoción/eliminación, errores). Alto riesgo de regresión en flujos con múltiples endpoints y estado local coordinado. |
| VR-A4 | Media | Deuda arquitectónica demostrada | Dos vistas orquestan transporte y estado remoto directamente desde `services/versions`; API y tipos comparten archivo de servicio, sin capa de aplicación ni aislamiento de sesión/cancelación. Convive con legacy según arquitectura vigente; migrar por capacidad, no replicar DDD entero. |
| VR-A5 | Media | Deuda de tipos demostrada | En Kanban aparecen escapes `any`/casts en prioridad, tipos, DTO de edición y reconstrucción de usuarios (`VersionKanban.vue` alrededor de 288-343); en ManageVersions se fuerza `type as any` al guardar (`ManageVersions.vue:567-570`). Reduce la capacidad de detectar payloads inválidos. |
| VR-A6 | Media | Accesibilidad estática demostrada | Drag-and-drop sobre `draggable` y handlers de pointer sin alternativa de teclado observada en `KanbanBoard.vue`/`BacklogPanel.vue`; controles y modales deben revisarse con la convención DS de foco, nombres, Escape y foco/restauración. No se hizo prueba manual y no se afirma resultado visual. |
| VR-A7 | Baja | Riesgo funcional | Hay mutaciones que actualizan arrays locales manualmente y dos vistas pueden editar el mismo recurso. Sin invalidación/refetch central, puede quedar estado desfasado tras rutas cruzadas o respuesta parcial; necesita pruebas de transición antes de atribuir una regresión concreta. |
| VR-A8 | Baja | Riesgo de contrato | Los tipos frontend incluyen campos opcionales/relaciones (`items`, usuarios asignados, `status`) usados por Kanban; comparar respuestas reales de `findAll`, `findDevStatus` y mutations con esos tipos. En esta auditoría se confirmó rutas/control de acceso, no cada campo/serialización. |

El listado de Versiones no se debe convertir automáticamente en una tabla genérica compartida: sus acciones y estado (`en_desarrollo`/`en_produccion`) son específicos del dominio.

## 3. Noticias

### Estado actual

- **Rutas y acceso:** `/news` requiere auth y `superadmin`, aparece en el menú de gestión. El backend exige `superadmin` para alta, edición y borrado; lectura de lista/detalle es pública. Referencias: `src/router/index.ts:190`, `riffvalley-app-back/src/product/news/news.controller.ts:24`.
- **CRUD:** lista 10 por página (`limit`/`offset`), crea/edita título, cuerpo, tipo, imagen, fecha y estado, y elimina con confirmación. El listado no ofrece filtro visible por estado/tipo. `src/views/news/ManageNews.vue:133`.
- **Contrato:** frontend declara `NewsResponse { totalItems, totalPages, currentPage, limit, data }`; backend `findAll` devuelve respuesta paginada en este formato y acepta paginación/status. Las operaciones CRUD y DTOs principales coinciden con controller/DTOs consultados. Hay un filtro `status` disponible en API pero no expuesto en esta gestión.
- **Estados:** loading inicial y vacío están representados; la carga falla con SweetAlert y después se despeja loading, pero no existe error persistente/reintento en vista. Crear/editar/eliminar tienen avisos de éxito/error. Página actual no se corrige explícitamente si una eliminación deja sin filas la última página.
- **Presentación:** tabla y paginador son locales a la vista; `NewsModal` concentra formulario y lógica de edición enriquecida. `NewsModal` usa modal custom/Tailwind y editor de texto enriquecido manipulado mediante DOM/`execCommand`; hay estructura de form, acciones y selección de imágenes/enlaces en un mismo componente. No se identificó un componente común de tabla/modal en `src/components` con semántica adecuada para trasladar.
- **Pruebas:** `src/services/news/news.test.ts` cubre feed, no el CRUD paginado de administración. No hay tests localizados para `ManageNews.vue` ni `NewsModal.vue`.

### Inventario de problemas y riesgos

| ID | Gravedad | Estado | Hallazgo y evidencia |
|---|---|---|---|
| NW-A1 | Media | Defecto demostrado | Carga fallida solo muestra SweetAlert; al terminar, `newsList` permanece vacío y el template presenta “No hay noticias creadas” (`src/views/news/ManageNews.vue:160`). El estado no distingue fallo de vacío ni ofrece reintento inline. |
| NW-A2 | Alta | Falta de cobertura demostrada | Tests existentes de News cubren feed; no list/create/update/delete, paginación, modal, errores ni permisos de gestión. |
| NW-A3 | Media | Deuda arquitectónica demostrada | Vista administra carga, paginación, mutaciones, feedback de usuario y modal; service mezcla DTOs de administración y contratos del feed. Aún está en `src/views`/`src/services`, no en módulo con ownership. Separar solo si clarifica owners: no duplicar News con Articles/Content Calendar. |
| NW-A4 | Media | Riesgo de accesibilidad | Modal revisado está implementado localmente; confirmar nombre/`aria-modal`, Escape, gestión/restauración de foco y labels asociados. Cierre por overlay existe, pero no equivale a soporte de teclado/foco. `src/views/news/components/NewsModal.vue:1`. |
| NW-A5 | Media | Riesgo de mantenimiento | Editor implementa inserción/edición de HTML con DOM imperativo y `document.execCommand` (NewsModal aprox. líneas 150-200); requiere pruebas de persistencia, sanitización y compatibilidad antes de reemplazarlo. No se concluye vulnerabilidad: no se verificó el render consumidor del HTML ni la sanitización del backend. |
| NW-A6 | Baja | Riesgo funcional | Al eliminar el último registro de la última página se vuelve a pedir la misma página; el backend podría devolver página vacía aunque existan registros en páginas anteriores. Confirmar el comportamiento del paginador y cubrirlo; no se probó con API real. |
| NW-A7 | Baja | Deuda de UX demostrada | Los badges usan `text-green-400`/`text-yellow-400` también en tema claro y son variantes visuales hard-coded; la pantalla no presenta filtro de estado aunque el servicio/contrato lo soporta. Revisar contraste ambos temas y necesidad de filtro. |

### Contrato backend consultado

`NewsController` confirma rutas `/news` y guards para POST/PATCH/DELETE. `NewsListQueryDto` extiende paginación y acepta `status`; `CreateNewsDto` exige título/body/type y permite `status` opcional, mientras el tipo frontend lo modela obligatorio en Create DTO. Es una **divergencia de amplitud del tipo** (frontend requiere siempre un campo que el backend permite omitir), no se observó fallo con el formulario actual porque este envía status. No requiere cambio backend. El listado y la entidad no se reportan como comprobados en ejecución.

## 4. Diseño, sistema de componentes y arquitectura transversal

- No se detectó un sistema de componentes administrativos compartido que convenga extraer por semejanza superficial. Feedback ya mantiene UI en el owner; News y Versions aún usan vistas/componentes legacy. Reutilizar utilidades Tailwind y patrones existentes tiene menor coste que crear una biblioteca.
- Hay variación de tratamiento de errores: Feedback usa estados persistentes y Query; Versiones carga localmente con estados incompletos; Noticias lanza SweetAlert para errores de lectura. Planificar una experiencia coherente por capacidad sin convertir todos los estados en un wrapper genérico.
- La compatibilidad claro/oscuro es desigual en vistas legacy; algunos colores de estado/versiones/badges son fijos o de contraste incierto. Por la restricción de no abrir navegador, estos puntos quedan como auditoría estática, no como defectos de contraste renderizado.
- Se ven responsabilidades acumuladas en `ManageVersions.vue` (~640 líneas), `VersionKanban.vue` (~450 líneas), `ManageNews.vue` (~280 líneas) y especialmente `NewsModal.vue` (formulario más editor enriquecido/DOM). Son señales de revisión de cohesión, no una orden de dividir por conteo de líneas. Separar únicamente el formulario, tabla/lista o lógica que tenga contrato independiente y mejore prueba/lectura.
- La arquitectura vigente permite estructura flexible, migración por capacidad y excepciones legacy explícitas. Propuesta: promover Versions y News como owners mediante API/tipos y coordinación de aplicación cuando el comportamiento remoto justifique Query; conservar navegación/URLs y servicios legacy no relacionados.

## 5. Propuesta de organización

### Feedback

Mantener `src/modules/feedback/{api,types,application,presentation}`. MGT-1 implementa el DTO administrativo `{data, counts}`, el consumo tipado y pruebas de respuesta; está completada según §9. No mover Sidebar summary ni store “leído” al módulo.

### Versions

Migrar gradualmente desde `src/services/versions` y `src/views/versions` a `src/modules/versions/` con:

- `api/`: endpoints y adaptación HTTP; `types/`: contratos remotos/DTOs (sin utilidades UI ajenas).
- `application/`: solo coordinación de carga/mutaciones/caché si se decide usar Query; consultas por identidad/sesión y cancelación donde datos privados lo exijan.
- `presentation/views/`: composición fina para gestión y Kanban; `presentation/components/` para backlog/columnas/editor si tienen límites y contratos claros.
- Mantener contratos backend, URLs y rutas de menú; actualizar a imports internos del owner y exponer entrada pública únicamente si Feedback u otro módulo necesita Versions.

Evitar duplicar lista/backlog o crear store Pinia para datos remotos. Filtros/paginación/modales efímeros permanecen locales salvo que haya consumidor compartido real.

### News

Crear `src/modules/news/` en migración independiente: `api/` y `types/` para el endpoint administrativo/feed que efectivamente pertenezca a News; `application/` para listado paginado/mutaciones si Query aporta invalidación y estado; `presentation/` para vista y modal/editor. Mantener Articles y Editorial Content Calendar con su propio ownership; no mover servicios de Articles ni apropiarse de `Contents`. Sustituir/manter el editor enriquecido solo después de caracterizar almacenamiento y renderización/sanitización; no reescribirlo por preferencia técnica.

## 6. Roadmap propuesto (tareas verificables)

Orden recomendado, con cambios por módulo y criterios pequeños. Cada tarea funcional debe incluir tests focalizados, typecheck cuando cambie TS/Vue y gates adicionales según `docs/frontend/conventions.md`; esos comandos no se ejecutaron en esta auditoría.

| ID | Alcance | Entrega verificable / aceptación | Dependencias |
|---|---|---|---|
| MGT-1 — Corregir contrato Feedback (**Completada**) | `feedback/api`, tipos, aplicación y tests | Modelar `{ data, counts }` del endpoint admin real; vista usa lista correctamente; pruebas API y vista cubren shape con lista vacía/no vacía y cuentan estados. `/admin/feedback` no llama `.filter()` al objeto respuesta. Cubrir la relación nullable de `user` en fixtures de contrato. Aceptación funcional manual confirmada por el usuario. | Ninguna; completada. |
| MGT-2 — Caracterizar permisos y flujos Feedback | pruebas de rutas, API y vista ya existentes | Asegurar regresión para todas las mutaciones, filtros, error/reintento, items de versión y redirecciones; no cambiar alcance funcional sin necesidad. Documentar si response counts se aprovechan o se ignoran con criterio. | MGT-1. |
| MGT-3 — Estado de carga/error de Versions | gestión legacy | Carga inicial/reintento y vacío diferenciados; error no deja promesa sin capturar; respuesta fallida conserva datos previos si hay refetch. Tests de componente para carga/error/vacío. | Ninguna. |
| MGT-4 — Contratos y CRUD Versions | servicio/types y pruebas de servicio | Tests de endpoint, método, params/payload y respuestas para versiones e items; estrechar casts `any`/DTOs con tipos respaldados por DTO backend. Incluir creación/edición/borrado y transiciones de item. | MGT-3 recomendado. |
| MGT-5 — Kanban: caracterización e interacción | Kanban y componentes de backlog/board | Tests de carga/error/ausencia de versión, alta/edición/mover/eliminar/promoción y rollback visual cuando falle API. Añadir operación equivalente por teclado para drag/drop o controles explícitos de mover; comprobar foco/nombres. | MGT-4. |
| MGT-6 — Modularizar Versions | owner `src/modules/versions`; Router/importadores | Mover por grupos pequeños, mantener URLs y endpoints, aclarar tipo/API de items consumidos por Feedback. Eliminar legacy solo al confirmar cero consumidores y tests de límites. No crear capas vacías. | MGT-4 y decisión del contrato público para Feedback. |
| MGT-7 — Error/paginación News | gestión News/API | Error inline con reintento claramente separado de vacío; tests para lista paginada, fallo inicial/refetch y eliminación en última página. Probar filtro `status` si se expone; no añadirlo si producto no lo requiere. | Ninguna. |
| MGT-8 — Caracterizar formulario/editor News | NewsModal y pruebas focalizadas | Tests de crear/editar, límites/validaciones, cancelación, loading/error y emisión de payload. Definir contrato del HTML y estrategia de sanitización con evidencia del consumidor antes de cambiar editor. Confirmar modal teclado/foco y ambos temas. | MGT-7 para flujos integrados. |
| MGT-9 — Modularizar News | owner `src/modules/news`; Router/importadores | Migrar gestión y API/feed de forma acotada, mantener URLs y contratos, separar presentación/coordinación/API y retirar legacy solo sin consumidores. Verificar import graph sin cruces con Articles/Editorial. | MGT-7 y MGT-8. |
| MGT-10 — Revisión de coherencia UI y cierre | tres capacidades | Revisión estática y visual posterior autorizada para claro/oscuro, responsive, teclado, carga/error/vacío; cerrar hallazgos aceptados, actualizar documentación canónica/roadmap y registrar por separado gates locales y CI real. | MGT-2, MGT-5, MGT-6, MGT-8, MGT-9. |

Las subtareas MGT-6 y MGT-9 no deben bloquear la recuperación inmediata: primero fijar comportamiento y contratos con pruebas; modularizar después por ownership. MGT-10 requiere validación manual en un turno futuro porque esta auditoría la excluyó expresamente.

## 7. Intervención backend

| Tema | Evidencia | Intervención propuesta |
|---|---|---|
| Feedback listado admin | `SuggestionsService.findAll` devuelve `{ data, counts }`, aunque la interfaz frontend espera array. | **No se requiere cambio backend confirmado.** Alinear DTO/adaptador frontend y tests con respuesta vigente. Solo abrir tarea backend si negocio decide que el endpoint debe devolver array; eso sería un cambio de contrato y requeriría coordinar consumidores. |
| Feedback relación `user` | La entidad declara `user` como relación `eager: true`; `findAll` solo pide explícitamente `versionItem`. | No se identifica tarea backend: la relación eager explica el campo esperado. Añadir una prueba de contrato frontend/backend al implementar MGT-1. |
| Versiones permisos/campos | Controlador confirma superadmin en writes; read routes incluyen endpoints sin decorador `@Auth`. | No hay tarea backend demostrada. Revisar y registrar la política de datos públicos si cambia el alcance de acceso; los guards de Vue no son autorización. |
| Noticias contrato | DTO backend permite omitir `status` en create mientras frontend lo requiere; actual modal envía status. | No requiere cambio backend. Alinear amplitud de tipo frontend en la tarea de caracterización. No se detectó otra incompatibilidad confirmada. |
| Editor de noticias | Frontend construye HTML de forma imperativa; no se inspeccionó aquí el pipeline de almacenamiento/render final. | **Posible tarea backend**, solo si la verificación del consumidor confirma que el HTML sin sanitización se almacena/entrega tal cual. Determinar responsabilidades frontend/backend con evidencia; no se declara vulnerabilidad en esta auditoría. |

## 8. Calidad y evidencias pendientes

- No se añadieron ni ejecutaron pruebas, typecheck, lint, build, browser o capturas por las restricciones de esta fase.
- Inventario de cobertura basado en archivos presentes: Feedback tiene cobertura focalizada pero con mock de contrato erróneo; Versions carece de pruebas locales focalizadas localizadas; News cubre feed pero no CRUD administrativo.
- No se verificó GitHub Actions ni el estado real de producción. Tampoco se contrastaron todos los campos serializados contra respuestas reales en ejecución.
- Clasificación de contrastes y accesibilidad UI: estática. El roadmap de implementación debe registrar por separado cualquier revisión manual/visual futura y no llamar “verificado visualmente” a un análisis de código.

## 9. MGT-1 — Corrección del contrato administrativo de Feedback

**Estado: completada y aceptada funcionalmente por el usuario (2026-11-27).** La validación manual de `/admin/feedback` fue realizada por el usuario. No se modificó el backend ni se avanzó MGT-2.

### Decisión de contrato y contadores

- `GET /suggestions` conserva y tipa el sobre completo `FeedbackListResponse { data, counts }` en API y aplicación. La vista obtiene las filas de `data`; no usa guardas ni fallback que oculte una forma incompatible.
- El backend filtra `data` con tipo y estado. `counts` se calcula por tipo (si se indicó), ignorando intencionadamente el filtro de estado; así los tabs siguen mostrando los conteos de todos los estados para el tipo seleccionado. “Todas” suma `in_progress + done + rejected`. La vista ya no deriva esos badges de la página/lista filtrada.
- `user` es nullable (`userId` nullable y relación `eager` con `onDelete: SET NULL`); el contrato frontend conserva `id`, `username` e `image`, usados por la presentación. `versionItem` también es nullable y `findAll` carga explícitamente esa relación; se reutiliza el tipo `VersionItem` con sus campos de entidad. La vista presenta la descripción del item vinculado.
- Las actualizaciones optimistas de prioridad transforman `data` y conservan `counts` dentro del caché.
- `FeedbackEntry.user` ahora admite `null`, en línea con la relación nullable `SET NULL` del backend. El fixture también cubre `versionItem` y campos que la vista presenta.

### Regresión cubierta y límite de integración

- API: fixture `{ data, counts }` con entrada múltiple/campos de relación y respuesta vacía con conteos cero; confirma retorno del sobre y filtros enviados.
- API/aplicación: `feedbackApiApplication.test.ts` usa la implementación real de ambos módulos y un mock HTTP que devuelve el envoltorio. Es una prueba de frontera frontend con fixture respaldado por el código de `SuggestionsService.findAll`; **no** es una integración contra un servidor backend en ejecución.
- Vista: entradas múltiples, `user: null`, texto del item de versión, conteos globales por estado aunque `data` esté filtrado, estado vacío, carga, error/reintento y mutación optimista sobre `data`.
- `/feedback`, resumen Sidebar y mutaciones existentes conservaron sus contratos; tests focalizados de `/feedback`, Sidebar, query y mutaciones forman parte de las verificaciones registradas abajo.

### Verificaciones locales

Resultados de la última edición:

- **Entorno:** Node `24.22.1`, pnpm `11.28.8`. `pnpm install --frozen-lockfile` completó sin modificar el lockfile.
- **Tests focalizados:** 5 archivos, 24 tests aprobados (`feedback.test`, `useFeedback.test`, `feedbackApiApplication.test`, `FeedbackManagementView.test`, `FeedbackView.test`). La prueba del límite API/aplicación usa fixture y HTTP mock, no un servidor backend.
- **Typecheck:** `pnpm run typecheck`, aprobado.
- **ESLint focalizado:** todos los archivos fuente/test modificados, aprobado.
- **Prettier:** el chequeo de todos los archivos afectados avisa que seis archivos tracked no siguen el formato configurado. Se comprobó la misma condición sobre cada versión de esos seis archivos en `HEAD`; no se reformatearon cientos de líneas de legacy dentro de esta corrección. El test de frontera nuevo y `types/feedback.ts` pasan `prettier --check`.
- **Arquitectura:** `pnpm run cycles` terminó con código 0, 0 imports locales sin resolver y el ciclo type-only preexistente Articles/Contents/Playlists/Videos. La comparación fue informativa porque el checker no resolvió el `HEAD` local. No hay un gate de fronteras para Feedback: el checker de Identity no aplica a este owner.
- **Build:** `pnpm run build`, aprobado. Conserva avisos del repo: Browserslist con datos de 21 meses, regla CSS `.flex-[2]` reportada por minificador y chunk principal por encima de 500 kB.
- **Diff:** `git diff --check`, aprobado.

### Cierre y validación de la configuración flexible

- **Aceptación funcional:** el usuario confirmó que verificó manualmente `/admin/feedback` y acepta la corrección. No se hizo una nueva comprobación visual ni se generaron capturas en esta sesión.
- **Entorno flexible:** Node `26.13.0` y pnpm `12.19.0`.
- **Instalación reproducible:** `pnpm install --frozen-lockfile` pasó con esas versiones; el lockfile permaneció idéntico.
- **Build/typecheck:** `pnpm run build` pasó con Node 26/pnpm 12, incluyendo `vue-tsc`.
- **Tests completos:** sin configuración adicional, Node 26 causa fallos en tests que esperan el Web Storage de `happy-dom` (27 archivos/229 tests fallidos). Con `NODE_OPTIONS=--no-experimental-webstorage pnpm test`, pasan los 222 archivos y 1543 tests. La particularidad queda documentada en `docs/frontend/conventions.md`.
- **ESLint de Feedback:** pasó. El informe global de ESLint reporta 615 errores en código legacy y sigue siendo informativo en CI. El formato global informa 291 archivos; el gate bloqueante de Identity informa cinco archivos preexistentes sin formato, ajenos a este cambio.
- **Arquitectura:** fixtures de ciclos y fronteras de Identity pasaron; los diagnósticos locales informan 0 imports locales sin resolver, 0 violaciones de fronteras de Identity y un ciclo type-only preexistente. Las comparaciones contra base/head fueron informativas en el checkout local.
- **Documentación:** fixtures de enlaces Markdown pasaron. El escaneo informativo encontró seis enlaces rotos preexistentes en otros roadmaps/paths; ninguno apunta al documento MGT.
- **Despliegue:** `docker build --check .` pasó sin avisos. No se construyó ni publicó una imagen.
- **Contrato/lockfile:** no se llamó a un servidor backend real. `pnpm-lock.yaml` no cambió; CI mantiene Node 24.22.1 y pnpm 11.28.8 como sus versiones de referencia.

La validación remota de GitHub Actions queda pendiente de publicar la rama y asociarla a una pull request; no se afirma que CI haya ejecutado.
