# Auditoría de gestión — Feedback, Versiones y Noticias

**Fecha:** 2026-11-27
**Estado:** auditoría estática completada; MGT-1, MGT-2, MGT-2b y MGT-2c completadas; MGT-2a backend en revisión; MGT-2d–MGT-2f pendientes; MGT-3–MGT-10 pendientes.
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

## 6. Roadmap de gestión (tareas verificables)

Las tareas frontend siguen `docs/frontend/conventions.md`: pruebas focalizadas según riesgo, typecheck para cambios TypeScript/Vue, build cuando cambie comportamiento o empaquetado y comprobaciones documentales para cambios solo de documentación. No se presenta la ejecución local como evidencia de GitHub Actions.

### Decisiones de producto aprobadas para Feedback

- **Envío:** retirar el formulario permanentemente visible y ofrecer un único botón «Enviar feedback» que abre un modal. Un formulario reutilizable permite elegir Sugerencia/Bug con radio buttons, Sugerencia inicialmente seleccionada y copy, ayudas, placeholders y acción de envío dinámicos. Cambiar el tipo conserva el borrador. Tipo, apartado, título y descripción son obligatorios; tras éxito se cierra el modal y se refresca el historial.
- **Categoría:** catálogo fijo, compartido por sugerencias y bugs, con identificadores estables: `albums` — Discos; `artists` — Artistas; `votes` — Votaciones; `statistics` — Estadísticas; `rankings` — Rankings; `events` — Conciertos y festivales; `home` — Inicio; `account` — Perfil y cuenta; `other` — General / Otros. No se preselecciona categoría. Los históricos sin valor se muestran «Sin categorizar» y administración puede filtrar/corregir. No crear catálogo editable ni categorías para Editorial, Wiki o herramientas internas.
- **Historial propio:** eliminar el formulario fijo; priorizar historial con tarjetas mucho más compactas, texto alineado a la izquierda y tipo, categoría, estado, fecha, título y descripción. Conservar motivo de rechazo y detalle de resolución/vinculación.
- **Administración:** compactar tarjetas y acciones; agrupar avatar, usuario y fecha; alinear contenido a la izquierda; filtrar por tipo, categoría, estado y prioridad; ordenar por prioridad; conservar todas las operaciones y contadores coherentes con la respuesta/filtros.
- **Reglas y límites:** siguen existiendo solo Pendiente, Resuelto y Rechazado; prioridad la gestiona administración; se conserva motivo de rechazo, resolución vinculada a Versiones, mejora interna, reapertura y eliminación. Feedback sigue siendo comunicación sencilla; quedan fuera conversaciones, adjuntos, notificaciones, estados nuevos y gestión de tickets.

| ID / repositorio | Objetivo | Alcance | Dependencias | Criterios de aceptación | Pruebas necesarias |
|---|---|---|---|---|---|
| MGT-1 — Frontend (**Completada**) | Corregir el contrato administrativo de Feedback. | `feedback/api`, tipos, aplicación y tests. | Ninguna. | Modela `{ data, counts }`; la vista consume `data` y los contadores backend; relación `user` nullable cubierta. Aceptación funcional manual confirmada por el usuario. | API/aplicación con respuesta vacía y no vacía; vista con contadores y usuario nullable; verificación manual completada. |
| MGT-2 — Frontend (**Completada**) | Consolidar regresión de Feedback y planificar su evolución funcional/visual aprobada. | Revisar cobertura MGT-1; cubrir huecos reales de mutaciones, rutas/permisos, contadores y Sidebar; registrar decisiones y desglosar MGT-2a–MGT-2f. | MGT-1. | Comportamientos caracterizados y roadmap aprobado en un único documento canónico. | Suite Feedback/Sidebar, build y comprobaciones documentales; sin revisión manual visual. |
| MGT-2a — Backend (**En revisión**) | Añadir categorización fija y migrar los datos existentes sin perder aportaciones. | Catálogo de nueve identificadores; contrato de lectura/escritura/filtros y migración nullable; sin catálogo dinámico ni cambios a otros dominios. | MGT-2. | Contrato implementado y cubierto por pruebas de DTO/servicio/controlador. La comprobación real de migración PostgreSQL y hacer category obligatoria siguen pendientes para MGT-2f. | Pruebas backend de contrato; la migración PostgreSQL no se ejecutó ni verificó. |
| MGT-2b — Frontend (**Completada**) | Adaptar Feedback al contrato categorizado de MGT-2a. | Catálogo tipado; DTO/API; filtros de usuario/admin en aplicación y claves Query; actualización administrativa genérica; etiquetas históricas «Sin categorizar». Sin controles visuales definitivos. | MGT-2a y contrato backend disponible. | Se distinguen categoría válida, `null` histórico, `uncategorized` como filtro y ausencia de filtro; se conserva `{ data, counts }`, semántica de contadores, sesión, cancelación e invalidación. Formularios existentes omitían category temporalmente y no asignaban defaults. | Tests focalizados de catálogo, DTO, params, filtros combinados, claves, envelope, actualización, invalidación y vistas; typecheck/build y checker documental aprobados localmente. |
| MGT-2c — Frontend (**Completada**) | Sustituir el formulario visible por el modal dinámico «Enviar feedback». | Un CTA y un único formulario reutilizando componentes existentes; radio Sugerencia/Bug, sugerencia inicial; cuatro campos obligatorios (tipo, apartado, título, descripción); textos/placeholders/ayudas/CTA dinámicos; conservar campos al cambiar tipo; cerrar y refrescar historial tras éxito. | MGT-2b. | El modal abre/cierra con interacción accesible; no hay categoría preseleccionada; validar campos requeridos; cambio de tipo conserva entradas; el envío usa el copy y payload correspondientes; éxito cierra y actualiza historial, error mantiene datos y explica el fallo. Comportamiento y revisión visual aceptados por el usuario, incluidos los acentos visuales diferenciados para sugerencias y bugs. | Tests de selección y conservación de draft, validación, payload por tipo, carga/error/éxito, cierre e invalidación; teclado y foco probados. Revisión visual aceptada por el usuario. |
| MGT-2d — Frontend | Dar protagonismo al historial propio y compactar sus tarjetas. | Eliminar formulario permanente; tarjetas compactas y alineadas a la izquierda; mostrar tipo, categoría, estado, fecha, título, descripción y conservar datos de resolución/rechazo. | MGT-2b y MGT-2c. | El historial queda como contenido principal; cada campo requerido tiene etiqueta legible; no se pierden el motivo de rechazo ni la vinculación/mejora interna; vacío/error/loading siguen diferenciados. | Tests de campos/estados y regresión del historial; revisión de responsive, teclado y claro/oscuro. |
| MGT-2e — Frontend | Compactar y completar la gestión administrativa de Feedback. | Tarjetas y acciones compactas; avatar/usuario/fecha agrupados; filtros por tipo, categoría, estado y prioridad; ordenación por prioridad; conservar operaciones administrativas. | MGT-2b. | Los filtros se combinan correctamente; orden de prioridad es determinista y conserva la prioridad recibida; acciones mantienen resolución/rechazo/reapertura/eliminación; conteos vienen del servidor para tipo/categoría activos y conservan la semántica actual de ignorar el filtro de estado (total = suma de estados); errores no dejan estado optimista inconsistente; Sidebar se actualiza en cambios de pertenencia. | Tests de filtros/orden/conteos, mutaciones y rollback, invalidación Sidebar, permisos y estado vacío/error; typecheck/build y revisión visual de teclado y ambos temas. |
| MGT-2f — Ambos | Verificar integración y cerrar la evolución MGT-2. | Contrato frontend/backend, migración PostgreSQL real, compatibilidad de despliegue y activación definitiva de category obligatoria. | MGT-2b–MGT-2e y proceso aprobado del entorno para aplicar migración. | Históricos legibles; envíos nuevos categorizados; filtros/correcciones válidos; migración comprobada en PostgreSQL y obligatoriedad activada tras comprobar el despliegue frontend. | Integración real frontend/backend, verificación PostgreSQL antes/después de migración y prueba del DTO obligatorio. Mocks frontend no acreditan esas operaciones. |
| MGT-3 — Frontend | Diferenciar carga, error y vacío en gestión de Versions. | Gestión legacy. | Ninguna. | Reintento visible; error no deja promesa sin capturar; un refetch fallido conserva datos anteriores. | Tests de componente para carga, error/reintento, vacío y refetch con datos previos. |
| MGT-4 — Frontend | Caracterizar contratos y CRUD de Versions. | Servicio/types y pruebas de servicio; estrechar casts/DTOs solo con tipos respaldados por backend; alta/edición/borrado y transiciones de items. | MGT-3 recomendado. | Métodos, endpoints, params, payloads y respuestas están caracterizados; tipos coinciden con contrato consultado. | Tests de servicio/API para versiones e items y mutaciones CRUD/transiciones. |
| MGT-5 — Frontend | Caracterizar Kanban y asegurar interacción operable. | Kanban y componentes de backlog/board; alta, edición, mover, eliminar y promoción. | MGT-4. | Carga/error/ausencia de versión claros; rollback visual tras fallo; movimiento accesible mediante teclado o controles explícitos con foco/nombres. | Tests de flujos y rollback; pruebas de interacción/nombres accesibles. |
| MGT-6 — Frontend | Modularizar Versions por ownership. | Owner `src/modules/versions`, Router/importadores; aclarar el contrato público de items usado por Feedback. | MGT-4 y decisión del contrato público con Feedback. | URLs/endpoints conservados; sin legacy eliminado hasta confirmar cero consumidores; sin capas vacías ni ciclos nuevos. | Tests de contrato/límites, import graph y regresión de consumidores. |
| MGT-7 — Frontend | Corregir error y paginación en administración News. | Gestión News/API. | Ninguna. | Error inline y reintento diferenciados de vacío; página se ajusta cuando borrar elimina la última fila. Filtro status solo si forma parte del producto. | Tests de lista paginada, carga/error/refetch y borrado en última página. |
| MGT-8 — Frontend | Caracterizar formulario/editor News. | NewsModal, alta/edición, límites, cancelación y payload; definir contrato HTML/sanitización con evidencia del consumidor antes de modificarlo. | MGT-7 para flujos integrados. | Comportamiento existente caracterizado; contrato de HTML y responsabilidad de sanitización documentados antes de cambios funcionales. | Tests de crear/editar, validación, cancelación, loading/error y payload; teclado/foco. |
| MGT-9 — Frontend | Modularizar News por ownership. | Gestión y API/feed, conservando URLs y contratos; retirar legacy solo tras comprobar consumidores. | MGT-7 y MGT-8. | Presentación/coordinación/API separadas según necesidad; sin cruces nuevos con Articles/Editorial ni capas innecesarias. | Tests focalizados, import graph y regresión de rutas/contratos. |
| MGT-10 — Frontend | Revisar coherencia UI y cerrar el trabajo de Feedback, Versions y News. | Revisión estática y visual, documentación y registro de validación local/CI. | MGT-2f, MGT-5, MGT-6, MGT-8 y MGT-9. | Hallazgos aceptados resueltos o explícitamente pendientes; claro/oscuro, responsive y teclado revisados; límites de CI correctamente declarados. | Gates locales de cada dominio, revisión visual autorizada y evidencia real de CI separada. |

MGT-2a backend ya dispone de contrato implementado y está en revisión en su propia rama. MGT-2b y MGT-2c completadas en frontend; MGT-2d–MGT-2f siguen pendientes según las dependencias de la tabla. MGT-6 y MGT-9 no deben bloquear la recuperación de comportamiento: fijar primero contratos y regresiones, modularizar después. MGT-10 requiere validación visual futura; no se realizó en esta auditoría ni en MGT-2.

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

## 10. MGT-2 — Consolidación funcional y planificación

**Estado: completada.** Rama de trabajo: `feat/feedback-improvements`, creada desde `beta` actualizada. MGT-2 consolidó las regresiones existentes y aprobó las decisiones/desglose de la evolución; no implementó categorización ni cambios de interfaz. MGT-2a–MGT-2f quedan registradas en §6. No se hizo merge, despliegue, navegación manual ni captura.

### Auditoría de cobertura

| Comportamiento | Cobertura existente | Resultado |
|---|---|---|
| Crear sugerencias y bugs | `FeedbackView.test.ts` valida ambos tipos, campos requeridos y payload; `FeedbackManagementView.test.ts` conserva la creación administrativa. `feedback.test.ts` valida endpoint/payload. | Suficiente; sin duplicar. |
| Cambiar prioridad | Vista comprueba el ciclo a prioridad siguiente y restauración del valor previo más aviso si falla. API/app caracterizan PATCH e invalidación. | Suficiente; no se halló defecto funcional. |
| Resolver con item de versión o mejora interna | Vista verifica selección y `versionItemId`, y la opción interna sin ID; API conserva ambos payloads. | Suficiente. |
| Rechazo con motivo, reapertura y eliminación | Vista prueba motivo requerido y enviado, reapertura de rechazados, confirmación y llamada de borrado; API cubre rutas y payloads. | Suficiente. |
| Permisos y redirecciones | Tests de Router prueban usuario autenticado, roles, rutas canónicas/legacy y conservación de query/hash. Sidebar prueba enlaces y contador por rol. | Suficiente. Los guards frontend no verifican autorización backend. |
| Contadores tras mutaciones | MGT-1 valida conteos por estado y que el total use la respuesta backend; antes de MGT-2, la suite no ejercitaba un refetch activo para demostrar su actualización después de una mutación. | Hueco real cubierto por una prueba de aplicación nueva: creación invalida Feedback, adopta los nuevos conteos del servidor e invalida el resumen Sidebar. |
| Invalidación de Queries y Sidebar | `useFeedback.test.ts` cubría invalidación general de Feedback y cinco invalidaciones Sidebar por mutaciones que alteran pertenencia; actualización de prioridad solo invalida Feedback. `SidebarMenuPermissions.test.ts` verifica presentación con IDs leídos/no leídos. | Suficiente tras la prueba adicional de refresco de conteos. No se duplican pruebas de Sidebar. |
| Recuperación ante error optimista | `FeedbackManagementView.test.ts` verifica rollback de prioridad en caché y mensaje de error. | Suficiente; no se encontró otra mutación optimista que requiera rollback. |

### Cambios y validación MGT-2

- Nueva prueba: `useFeedback.test.ts` monta una query administrativa activa, devuelve dos respuestas con conteos distintos y confirma que una creación refresca la respuesta y llama una vez a la invalidación Sidebar.
- No se hicieron correcciones funcionales de producción: la revisión de los handlers confirmó que las mutaciones invalidan Feedback, que las que cambian pertenencia también invalidan el resumen Sidebar y que la prioridad conserva rollback local.
- **Tests focalizados:** 10 archivos, 55 tests aprobados (todo `src/modules/feedback`, `SidebarMenuPermissions.test.ts` y `sidebarSummary.test.ts`), con `NODE_OPTIONS=--no-experimental-webstorage` por Node 26.13.0.
- **Typecheck/build:** `pnpm run build` aprobado, incluido `vue-tsc`; se mantienen avisos ya conocidos de Browserslist desactualizado, minificación de `.flex-[2]` y chunk principal superior a 500 kB.
- **ESLint:** `pnpm exec eslint src/modules/feedback/application/useFeedback.test.ts` aprobado.
- **Markdown:** `markdown:links:fixtures` aprobado. El escaneo global mantiene seis enlaces rotos preexistentes en otros documentos; ninguno corresponde a los archivos MGT modificados. `markdown:links:delta` terminó informativo porque exige base/head completos y checkout limpio; no se considera validación del delta.
- **Prettier:** el chequeo de los tres archivos afectados avisa el test y la auditoría; ambos ya fallaban en `HEAD`. `roadmap.md` pasa. No se reformateó documentación/test legacy fuera del cambio solicitado.
- **Diff:** `git diff --check` aprobado. No se hizo comprobación visual/manual en navegador ni se afirma ejecución de CI remoto.
- MGT-2a está implementada en la rama backend `feat/feedback-improvements` y en revisión. Esta tarea solo consultó ese checkout; no modificó backend. No se inició MGT-2b entonces. La revisión posterior de migración PostgreSQL real y la activación de categoría obligatoria quedan pendientes.

## 11. MGT-2b — Integración de categorías en frontend

**Estado: completada.** Rama: `feat/feedback-improvements`. Contrato consultado en modo lectura en `riffvalley-app-back`, rama `feat/feedback-improvements`: `roadmap/feedback/MGT-2a-categorizacion.md`, entidad/DTOs/controller/service de Suggestions y pruebas de categorías/contrato. No se modificó el backend, no se hizo merge ni despliegue, y no se abrió navegador ni se capturaron pantallas.

### Implementación

- `src/modules/feedback/types/categories.ts` centraliza los nueve identificadores y etiquetas. `FeedbackCategoryId` representa únicamente categorías válidas; `FeedbackCategoryFilter` añade `uncategorized` para lecturas; `null` en la entidad tipada representa históricos; la omisión del parámetro representa todas las categorías. `other` es válido y distinto de `uncategorized`.
- Los DTOs permiten enviar una categoría válida opcional durante la transición (sin default y sin `null` en creación); actualización administrativa admite categoría válida o `null`. Se conservan los formularios actuales, que todavía omiten la categoría.
- GET admin y personal admiten type/status/category y conservan la respuesta `{ data, counts }`. Las filas null se muestran como «Sin categorizar» en los dos listados existentes; no se añadieron selectores ni controles administrativos.
- Las claves Query incluyen usuario, generación de sesión, tipo, estado y categoría; se mantiene el `AbortSignal`. El cambio de categoría utiliza la mutación update existente e invalida la raíz Feedback, refrescando listados personales y administrativos sin calcular contadores desde filas. El backend sigue siendo dueño de `counts`: filtra por tipo/categoría, ignora status y suma los contadores para el total.
- No se inició MGT-2c, MGT-2d ni MGT-2e. MGT-2f mantiene pendiente la comprobación real de migración PostgreSQL y activar la obligatoriedad definitiva en el DTO backend, además de su integración/despliegue acordados.

### Pruebas y verificación local

- Se añadieron pruebas de catálogo/etiquetas, diferencia entre `other`, `null` y `uncategorized`, payload categorizado y compatibilidad con payload sin categoría, params combinados, contratos `{ data, counts }`, corrección administrativa e invalidación/refresco de ambas consultas. Los fixtures API ahora incluyen tanto categoría válida como histórica null. Las vistas comprueban la etiqueta histórica.
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test src/modules/feedback`: 9 archivos y 39 tests aprobados. Suite completa `NODE_OPTIONS=--no-experimental-webstorage pnpm test`: 224 archivos y 1552 tests aprobados. Sin esa opción se reproduce la limitación conocida de `localStorage` entre Node 26 y `happy-dom` documentada en Convenciones.
- `pnpm run build`: aprobado, incluyendo `vue-tsc`; persisten avisos existentes de Browserslist, sintaxis minificada de `.flex-[2]` y chunk principal superior a 500 kB.
- `pnpm exec eslint src/modules/feedback`: aprobado. Detector mecánico Impeccable: sin hallazgos (`[]`); no se hizo comprobación visual manual por la restricción del alcance.
- Fixtures Markdown y `git diff --check`: aprobados. El reporte global de enlaces conserva seis fallos en documentos ajenos a este roadmap. Prettier informa diferencias de formato también al comprobar las versiones de esos archivos en `HEAD`; las nuevas fuentes de catálogo pasan Prettier. No se reformatearon vistas/API completas para evitar cambios de formato legacy ajenos al alcance.
- Los tests usan HTTP mockeado; no acreditan integración con servidor backend ni PostgreSQL. No se afirma ejecución de GitHub Actions.

## 12. MGT-2c — Modal dinámico de envío de Feedback

**Estado: completada.** Rama: `feat/feedback-improvements`. Alcance limitado al formulario de `/feedback`; no se modificó backend, formulario administrativo ni gestión de categorías. El usuario aceptó la revisión visual del modal, incluidos los ajustes de diferenciación entre sugerencias (azul) y bugs (rojo coral).

### Implementación

- `FeedbackView.vue` ya no presenta un formulario fijo. Un único botón «Enviar feedback» abre `FeedbackFormModal.vue`, que concentra los campos y el formulario para Sugerencia y Bug.
- El modal inicia limpio con Sugerencia elegida y apartado vacío. Reabrirlo reinicia el borrador. Cambiar el tipo solo actualiza el título placeholder, la descripción/ayuda y el texto del botón; conserva apartado, título y descripción.
- El selector usa `feedbackCategories`, exige una opción del catálogo y no ofrece «Sin categorizar». Título y descripción son obligatorios; el título conserva el límite de 200 caracteres del DTO backend. No se añadió un máximo de descripción que el contrato no especifica.
- Revisión visual aceptada por el usuario: los radios se presentan como dos tarjetas horizontales seleccionables, con acentos azul para sugerencia y rojo coral para bug. Se conserva el input radio nativo, el grupo y el foco de teclado. Cabecera, botón principal y bloque compacto de ayuda de descripción siguen el acento del tipo, con transiciones breves y variantes claro/oscuro.
- El payload incluye `title`, `description`, `type` y `category`. No expone prioridad ni estado. El guard local y `isPending` previenen doble envío y desactivan controles mientras la mutación está en curso.
- Cerrar por Cancelar, botón de cierre, Escape o backdrop restaura el foco al CTA. El diálogo atrapa Tab/Shift+Tab. Error permanece en el modal y conserva el formulario; el usuario puede reintentar. Éxito cierra el diálogo, muestra el aviso existente y la mutación existente invalida/actualiza el historial.
- El historial y su presentación siguen funcionando sin rediseño. No se cambió el modal administrativo de creación.

### Cobertura y comprobaciones

- `FeedbackFormModal.test.ts`: estado inicial, opciones, placeholders y ayudas, conservación del borrador, validación, payload de ambos tipos, bloqueo de envíos repetidos y ciclo teclado/Escape.
- Las pruebas de MGT-2c se actualizaron para comprobar el estado visual de las dos tarjetas, el cambio de acento y que pulsar el contenido de cada tarjeta selecciona su radio asociado.
- Tras los últimos ajustes visuales: `NODE_OPTIONS=--no-experimental-webstorage pnpm test src/modules/feedback`: 10 archivos y 46 tests aprobados; `pnpm run build`, `pnpm exec eslint src/modules/feedback`, `pnpm exec prettier --check` para el componente y sus pruebas, el detector mecánico Impeccable (sin hallazgos) y `git diff --check` aprobados. El build mantiene avisos existentes de Browserslist, minificación de `.flex-[2]` y tamaño del chunk principal. No se hizo comprobación manual en navegador ni captura.
- `FeedbackView.test.ts`: CTA/modal, restauración de foco al cancelar, formulario limpio al reabrir, payload con categoría, cierre tras éxito, error con datos conservados y reintento, además de regresión del historial.
- Pruebas focalizadas: 2 archivos y 11 tests aprobados. Suite frontend: 225 archivos y 1559 tests aprobados con `NODE_OPTIONS=--no-experimental-webstorage`.
- `pnpm run typecheck`, `pnpm run build` y `pnpm exec eslint src/modules/feedback`: aprobados. Se mantienen avisos preexistentes de Browserslist, minificación de `.flex-[2]` y tamaño del chunk principal.
- Prettier para el nuevo modal y sus tests: aprobado. `git diff --check`, fixtures Markdown y detector mecánico Impeccable: aprobados. El detector no sustituye la revisión visual.
- No se abrió el navegador ni se hicieron capturas por restricción expresa. El usuario confirmó la aceptación visual del modal antes de continuar con MGT-2d. No se afirma ejecución de CI.
