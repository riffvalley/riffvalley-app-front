# F.1 — Inventario, decisiones y matriz de regresión

**Estado:** F.1.1, F.1.2 y F.1.3 completadas el 2026-10-13. Solo inspección y documentación; no se modificó código funcional ni tests.

**Subtarea y dependencias:** F.1.1 XS — Cerrar matriz de roles y consumidores; no tiene dependencias. F.1.2 XS depende de F.1.1. F.1.3 S — Establecer baseline funcional y de regresión depende de F.1.1 y F.1.2; queda completada con la matriz de este documento. F.2.1 XS queda completada; la siguiente subtarea es F.2.2 S.

**Instrucciones consultadas:** `README.md` y `CLAUDE.md` del frontend. No existe `AGENTS.md` en el checkout. La arquitectura documentada es Vue 3 + TypeScript, Pinia, Vue Router, servicios por recurso y Axios centralizado. `yarn build` es la verificación de producción documentada.

**Contrato backend consultado:** `../spammusic-back/roadmap/roles-frontend-contract.md`, junto con la auditoría `roles-endpoints-audit.md` y las declaraciones actuales del controller. Se toma como contrato: `user < collaborator < riffvalley < superadmin`, rol singular, `@Auth()` para cualquier autenticado, mínimo editorial `riffvalley`, mínimo administrativo `superadmin`, autorización efectiva desde el rol persistido, `/auth/usersRv` con mínimo `riffvalley`, sin `/auth/me` ni refresh. El documento indica que la migración de PostgreSQL y el despliegue no quedan acreditados.

## Hallazgos confirmados

Las observaciones de línea base de F.1 que describen guards, stores y componentes anteriores a F.2–F.4 son históricas. Las secciones de resultados y la ejecución final de F.5 más abajo registran el estado posterior a la migración; las menciones legacy conservadas aquí documentan decisiones y no son usos activos.

### Auth, usuario y sesión

- `src/services/auth/auth.ts`: tras F.2.1, `LoginResponse` declara `role: UserRole`, `id`, `username` y `token`; no incluye password ni `roles[]`. `Superuser` y las proyecciones de usuarios asignables usan `role: UserRole`; su tipo `image: string | null` refleja que la columna backend admite `NULL`.
- `src/stores/auth/auth.ts`: Pinia mantiene `token`, `username`, `userId`, `image`, `roles[]` y preferencias de dashboard. Login persiste esos valores en `localStorage`, incluidos `roles`; logout los elimina. `loadRoles()` tolera arrays JSON y un formato legacy separado por comas. `hasRole()` hace coincidencia exacta y el getter `userRoles` devuelve el array.
- `src/main.ts` monta Pinia y Vue; no llama `initializeAuth()`. Ese método existe en la store, pero no se encontró ningún callsite. En cada request, `src/services/api/api.ts` lee `authStore.token` y adjunta `Authorization: Bearer`.
- La identidad local procede de `POST /auth/login`; `loggedUser` devuelve `{ id, username }` desde el store. No se encontró petición de perfil al iniciar. `src/stores/user/users.ts` tiene `fetchUser()` que solo devuelve el valor en memoria y `setUser()`; no se encontraron callsites de ambos métodos. No hay endpoint `/auth/me` en el contrato.
- **Caducidad observada:** el contrato backend especifica JWT de 8 horas. El frontend no decodifica `exp`, no programa temporizador y no renueva token. El interceptor elimina la sesión y navega a Login al recibir `401`; un `403` se rechaza sin tratamiento central ni logout. Sin una petición que reciba el `401`, el estado persistido puede seguir apareciendo autenticado. El backend valida el rol persistido en cada petición protegida, así que la copia visual del rol puede quedar obsoleta tras un cambio administrativo.
- `src/services/users/users.ts` tipa tras F.2.1 las respuestas de `/auth/users` (`AdminUser[]`) y `/auth/usersRv` (`Superuser[]`), además de los DTOs de registro, actualización propia y actualización administrativa. `src/stores/user/users.ts` conserva arrays y payloads `any` y concentra CRUD; no es la fuente de la sesión Auth y su migración queda fuera de F.2.1.

### Conversiones necesarias de `roles[]` a `role`

| Archivo/uso | Modelo actual confirmado | Conversión de contrato que deberá tratarse |
| --- | --- | --- |
| `src/services/auth/auth.ts` — `LoginResponse` | Tras F.2.1: `role: UserRole`, sin password ni `roles[]` | **F.2.1 completada:** respuesta alineada al login backend; el store aún consume `response.roles` y se migra en F.2.2. |
| `src/services/auth/auth.ts` — `Superuser` | Tras F.2.1: `role: UserRole`; imagen nullable | **F.2.1 completada:** proyección singular de `/auth/usersRv` y `/auth/users/superusers`; views consumidoras pendientes de F.4.3. |
| `src/services/users/users.ts` | Tras F.2.1: respuestas `AdminUser[]`/`Superuser[]`; tipos de registro y PATCH | **F.2.1 completada:** requests/responses Auth tipados según el contrato; store y formulario de administración quedan para F.2.2/F.4. |
| `src/stores/auth/auth.ts` | state, getter, persistencia y acciones usan `roles[]`/clave `roles` | State/getter/login/logout y sesión persistida deben modelar un único `role`; F.1.2 decide invalidar sesiones antiguas/legacy y exigir login nuevo. Implementación F.2.2. |
| `src/views/users/ManageUsers.vue` | `User.roles`, checks múltiples, filtro multirol, alta `newUser.roles`, update `{ roles }` | Tipo, visualización/filtro y DTO administrativo singular `{ role }`; decisión de alta sigue pendiente. |
| `src/views/versions/components/KanbanBoard.vue` | Prop de `superusers` sigue exigiendo `roles: string[]` | Incompatibilidad de consumidor confirmada por typecheck explícito; alinear el tipo local en F.4.3, sin modificar esta vista en F.2.1. |
| `src/services/rates/rates.ts` | Tipo `User.roles: string[]` conservado | No hay lectura frontend de `.roles`. La relación de rates no proyecta el campo de rol según contrato/modelo inspeccionado; es un tipo de dominio no Auth. Se conserva sin cambios en F.2.1 por alcance y queda señalado para revisión contextual de limpieza en F.5.2, sin asumir que el array sea un campo runtime. |

Los tipos de usuario asignable `Superuser` se comparten entre las vistas de contenido y los dos Kanban de playlists aunque una lista represente usuarios editoriales y la otra superadmins; conviene verificar/nombrear el tipo al adaptar contratos. La respuesta de `/auth/usersRv` incluye `role`, y `/auth/users/superusers` devuelve `role: "superadmin"` según el contrato.

### Resultado de F.2.1 y diagnósticos de tipos

- Se creó `src/interfaces/auth.ts` con la única unión `UserRole = "user" | "collaborator" | "riffvalley" | "superadmin"`. Login, listados de usuarios, registro y requests de actualización usan ese tipo; PATCH de perfil propio no admite `role`, PATCH administrativo admite `role` singular. No hay tipo frontend de JWT/sesión y no se modificó el store.
- `yarn vue-tsc --noEmit` termina con código 0; `yarn build` termina correctamente con los avisos de Browserslist, minificador CSS y chunk grande registrados como baseline. `tsconfig.json` raíz declara `files: []` y referencias a `tsconfig.app.json`/`tsconfig.node.json`; el comando raíz sin `--build` no analiza directamente los archivos incluidos en el proyecto app. Por eso se hizo una comprobación adicional con `yarn vue-tsc --noEmit --project tsconfig.app.json --pretty false`.
- La comprobación explícita del proyecto app termina con errores. Diagnósticos atribuibles a este cambio y pendientes de consumidores: `src/stores/auth/auth.ts:60` lee `LoginResponse.roles` (F.2.2); `src/views/versions/VersionKanban.vue:34` pasa el tipo singular a `KanbanBoard.vue:214`, que aún exige `roles[]` (F.4.3); y cinco consumidores de Articles/Videos Kanban rechazan `Superuser.image: string | null` donde esperan `string | undefined` (F.4.3). No se modificaron esos stores/vistas por las restricciones de F.2.1.
- La comprobación explícita también presenta otros errores distribuidos por el frontend que no forman parte de los contratos modificados. No se compararon con un baseline del proyecto app anterior a F.2.1 y no se atribuyen ni corrigen en esta tarea.

### Nombres legacy y checks múltiples

| Valor/patrón encontrado | Ubicación/semántica actual | Estado frente al contrato |
| --- | --- | --- |
| `user` | Guard `/calendar`; menú `/import` incluye `user` como una opción exacta. | Canónico, mínimo base. |
| `riffValley` | Guards editoriales, `routes.json`, checks de componente y lookup de localStorage. | Nombre legacy/casing; el valor canónico es `riffvalley`. |
| `superUser` | Guards administrativos, selector de áreas y checks locales. | Nombre legacy/casing; el valor canónico es `superadmin`. |
| `babyUser` | Guards `/calendar-baby` y `/suggest`; `/import` tiene restricción especial para ese array; menú ofrece enlaces bebé. También aparece como rol seleccionable en administración. | Legacy sin alias. Decisión F.1.2: esas dos rutas quedan en nivel base `user` y la excepción de `/import` se retira al adaptar F.3; no se conserva un permiso por módulo. |
| `admin` | Se comprueba en el `canManage` del Kanban de festivales junto a `riffValley` y `superUser`. No aparece como rol canónico. | Legacy sin alias ni conversión a `superadmin`; la decisión de acceso se expresa con `riffvalley` o `superadmin` según el mínimo editorial en F.3. |
| Arrays y OR explícito | `routes.json` admite `requiredRole` como string o array; `SidebarMenu.vue` muestra si cualquier valor coincide. `ManageUsers.vue` permite varios roles y filtra por alguno. Artistas usa OR con dos `hasRole` más fallback directo a `roles[]`. Festival Kanban usa `.some()` de tres valores. | El menú multiopción expresa coincidencia exacta, no jerarquía. Los OR locales también son checks de varios roles, no un `role` único. No se hizo mapping de valores. |

### Guards, mínimos de rutas y visibilidad

**Autorización de navegación frontend.** `src/router/index.ts` separa `requiresAuth` de `requiresRole`; el guard compara `to.meta.requiresRole` con `authStore.roles.includes()`. Para `/import` existe otro check que impide entrar a `babyUser`. Los valores guardados en meta actualmente son aliases legacy.

- **Mínimo editorial legacy `riffValley`:** `/petitions`, `/recap`, `/content-calendar`, `/articles`, `/import-discs`; `/list` y `/list/lists`, `/list/edit/:id`, `/list/create`; `/reunions` y `/reunions/list`, `/reunions/:id`; `/discos/radar`, `/discos/radar/:id`, `/discos/mejores`, `/discos/mejores/:id`; `/videos`, `/videos/list/:id`; `/national-releases`; `/disc-list-error`.
- **Mínimo administrativo legacy `superUser`:** `/suggestions/management`, `/users`, `/users/stats`, `/users/activity`, `/news`, `/versions`, `/versions/kanban`.
- **Mínimo `user`:** `/calendar`; con jerarquía inclusiva, el nivel base cubriría los roles superiores.
- **`babyUser`:** `/calendar-baby`, `/suggest`; regla especial adicional para `/import`.
- **Solo login en el guard, pese a capacidad editorial:** `/artists` (ArtistManagement), `/riff-valley-playlists/festivales` y `/riff-valley-playlists/generos`. El contrato backend confirma que las operaciones de Artist Management y los CRUD de playlists locales requieren mínimo `riffvalley`; esos guards deben actualizarse al implementar F.3.

**Visibilidad de componentes.** `routes.json` y `SidebarMenu.vue` ocultan/enrutan menús con `requiredRole`, incluyendo arrays para `/import`; el selector de áreas usa `riffValley` y `superUser`. Checks explícitos adicionales: `DiscCardComponent.vue` lee `localStorage.roles` directamente para `canModerate`; `DiscCalendar.vue` usa `superUser`; `PasswordChange.vue` muestra ajustes de dashboard a `riffValley` o `superUser`; Artist Management calcula `isManager` con `riffValley`/`superUser` y fallback sobre `roles[]`; festival playlist Kanban gates `canManage` con tres valores. En la vista de géneros no se encontró check de rol/`canManage`; sus controles pueden depender de otros estados, por lo que su visibilidad exacta debe caracterizarse en regresión. Son controles de UI y no sustituyen HTTP.

**Resultado de F.3.3 (2026-10-13).** Los hallazgos de visibilidad anteriores quedaron alineados a `role` singular y `hasMinimumRole()`: enlaces comunitarios y perfil requieren mínimo `user`; enlaces editoriales, Artist Management, ambos Kanban de playlists, edición de discos/calendario y ajustes editoriales requieren `riffvalley`; administración y Last.fm image fill requieren `superadmin`. Se quitaron arrays y nombres legacy de `routes.json`, `SidebarMenu.vue`, `DiscCardComponent.vue`, `DiscCalendar.vue`, `DiscComponent.vue`, `PasswordChange.vue`, `ArtistManagement.vue` y el Kanban de festivales. Se confirmó que `DiscComponent.vue`, aunque aparece bajo la ruta base `/calendar`, mostraba edición de artista/disco/fecha/enlace, selectores de catálogo, cambios de estado y eliminación; esas acciones ahora requieren mínimo editorial. La lectura del calendario, la portada, enlaces de escucha, fecha y estado de lanzamiento nacional permanecen visibles para usuarios base; el marcador personal también permanece disponible. `SidebarMenu.vue` antes consultaba `GET /requests` con mínimo `user`; ahora pide ese conteo solo desde `riffvalley`, acorde al mínimo del endpoint backend. El Kanban de géneros no necesitó un gate interno adicional: su ruta ya requiere `riffvalley` y no se identificó un mínimo distinto para sus controles.

**Verificación de F.3.3.** Una comprobación focalizada ejecutó los 16 pares de rol/mínimo, negó `null`, `undefined`, rol desconocido y `babyUser`/`riffValley`/`superUser`/`admin`, comprobó mínimos singulares del menú y evaluó visibilidad para invitado y los cuatro roles canónicos. El typecheck explícito pasó de 167 a 165 diagnósticos, eliminando solo los dos accesos `authStore.roles` de Artist Management; no aparecieron diagnósticos nuevos. Build y `git diff --check` pasan. No se hizo inspección visual en navegador ni prueba de llamadas HTTP/backend; la tabla N-06 mantiene la revisión manual como regresión de F.5.1. La autorización efectiva permanece en el backend.

**Autorización HTTP.** Axios transmite Bearer desde la store en cada petición. El interceptor cierra sesión y redirige a Login ante `401`; ante `403` conserva la sesión, deja que el consumidor reciba el rechazo y muestra una denegación si la vista no abrió ya una notificación de error SweetAlert. Los errores inesperados siguen propagándose sin tratamiento global. No se validaron estos escenarios en runtime por falta de backend compatible. Los servicios no aplican mínimos de rol frontend; el backend comprueba cada request. El controller y la auditoría confirman que `GET /api/auth/usersRv` requiere mínimo `riffvalley` (hereda `superadmin`); `GET /api/auth/users/superusers` requiere `superadmin`. El primer endpoint devuelve personas `riffvalley` y `superadmin`, el segundo solo `superadmin`.

### Endpoints y consumidores de listas de usuario

| Servicio/store | Consumidores encontrados | Uso |
| --- | --- | --- |
| `services/auth/auth.ts:getUsersRv()` → `/auth/usersRv` | `ArticlesKanban.vue`, `VideosKanban.vue`, `RiffValleyPlaylistGenresKanban.vue`, `RiffValleyPlaylistFestivalsKanban.vue` | Listas de usuarios para autor/assigned user. En festivales la llamada depende del `canManage` local. |
| `services/users/users.ts:getRvUsers()` → `/auth/usersRv` | `ContentCalendar.vue`, `ListReunion.vue`, `DiscByDate.vue`, `SpecialAsignationList.vue` | Listas de usuario para autorías/asignaciones. |
| `userStore.usersRv` → `loadRvUsers()` | `AsignationList.vue`, `MejoresAsignationList.vue` | Asignación de usuarios en listas; comparten el servicio `getRvUsers()`. |
| `services/auth/auth.ts:getSuperusers()` → `/auth/users/superusers` | `VersionKanban.vue` → prop `KanbanBoard.vue` | Selector de responsables en el Kanban administrativo de versiones. |

Hay dos funciones de servicio para `/auth/usersRv` en módulos distintos (`getUsersRv` y `getRvUsers`). No se infiere aquí que deban consolidarse; F.2 podrá evaluar callers/contratos. `ArtistManagement` es una ruta/vista, no un consumidor de esos listados.

### Vistas y servicios administrativos afectados

- `src/views/users/ManageUsers.vue`: carga `/auth/users`, lista/filtro por `roles[]`, modifica mediante `PATCH /auth/superadmin/:id` enviando `{ roles }`, y registra vía `POST /auth/register` enviando roles. El contrato dice que `/users` da `role` singular, el PATCH acepta `role`, y el registro rechaza `role`/`roles` y crea `user`.
- `src/services/users/users.ts` + `src/stores/user/users.ts`: `/auth/users`, `/auth/usersRv`, `/auth/register`, `/auth/superadmin/:id`, activar/desactivar y borrar. La carga de usuarios y administración están poco tipadas (`any`).
- `src/services/auth/auth.ts`: login, listas `usersRv`/`superusers` y admin stats. La respuesta `AdminStatsUser` no contiene rol, por lo que no se identifica cambio de rol en ese DTO.
- `ArtistManagement.vue`: comprobación local editorial con aliases y ruta solo autenticada.
- Kanban locales: vistas de festivales y géneros, más `FestivalPlaylistManager.vue`; la ruta exige solo login. El contrato clasifica las operaciones mutables locales de playlist como mínimo editorial.

### Composables, stores y datos parecidos

- No se encontró composable que haga checks de rol. `useDashboardConfig.ts` usa `useAuthStore` y `useUserStore` para configuración de dashboard; no lee roles directamente. Debe seguirse como consumidor de perfil/estado si el store se reestructura, pero no se clasificó como autorización.
- `services/rates/rates.ts` conserva `User.roles[]`; no se encontraron usos de `.roles` de esa interfaz en vistas. En backend, la relación Rate incluye `user`, pero `User.role` es `select: false` y `findRatesByDisc` no lo selecciona expresamente. F.2.1 revisó esta evidencia y dejó el campo intacto por tratarse de un tipo de dominio no Auth sin consumidor confirmado.
- Atributos HTML `role="dialog"`/`role="switch"`, `SpecialListType` con categoría `'riffValley'`, nombres de playlist/contenido y vocabulario textual no son por sí solos roles de autorización. No se deben cambiar en una búsqueda/reemplazo.

### Tests, mocks y baseline Yarn

La búsqueda de archivos no encontró pruebas, fixtures/mocks, ni configuración de Vitest/Jest/Playwright. `package.json` tiene scripts `dev`, `build`, `preview`, `prepare`; no tiene scripts `test`, `lint` ni verificación de arquitectura. Node local: `v22.23.1`; Yarn local: `4.10.1`.

| Verificación | Comando/estado | Resultado |
| --- | --- | --- |
| Typecheck | `yarn vue-tsc --noEmit` | **Pasa**, código de salida 0. |
| Build | `yarn build` (ejecuta typecheck y Vite build) | **Pasa**, 1150 módulos transformados. |
| Tests | No hay script/runner/archivos encontrados | **No disponible; no ejecutado.** |
| Lint | No hay script ni configuración de lint encontrada | **No disponible; no ejecutado.** |
| Arquitectura | No hay script/check automatizado de arquitectura; `CLAUDE.md` documenta convenciones | **No disponible; no ejecutado.** |
| Otros | `git diff --check` y `git diff --no-index --check` para los documentos nuevos | Sin hallazgos de whitespace. |

Avisos observados durante `yarn build`: `caniuse-lite` de Browserslist tiene 20 meses; el minificador informa sintaxis CSS inesperada en `.flex-[2][data-v-c3f6804a]`; el chunk de entrada supera 500 kB minificado (`index` 562.81 kB). Se registran como baseline observado, sin atribución ni corrección en F.1.1.

## Matriz de regresión F.1.3

La matriz define los casos de regresión para F.2–F.5 y registra la ejecución de F.5.1. Cada grupo conserva las XS/S existentes en `roles.md`, sin crear subtareas nuevas.

### Matriz de mínimos por rol

| Sesión/rol | Rutas públicas | Mínimo `user`/autenticado | Mínimo `riffvalley` | Mínimo `superadmin` |
| --- | --- | --- | --- | --- |
| Sin sesión | Sí | No | No | No |
| `user` | Sí | Sí | No | No |
| `collaborator` | Sí | Sí | No | No |
| `riffvalley` | Sí | Sí | Sí | No |
| `superadmin` | Sí | Sí | Sí | Sí |
| Ausente, desconocido o legacy | Sí | No | No | No |

La tabla expresa mínimos de navegación cliente según el contrato inclusivo. La autorización efectiva de cada llamada sigue siendo del backend y puede incluir reglas adicionales de propiedad.

| ID | Caso y resultado esperado | Subtarea propietaria | Verificación prevista y tipo | Ejecución F.5.1 (2026-10-13) |
| --- | --- | --- | --- | --- |
| S-01 | Login consume `role` singular canónico y token; registro no envía `role`/`roles` y devuelve un usuario `user` con token. | F.2.1; F.4.2 | Typecheck/build para DTO; inspección manual de requests/responses con backend disponible para confirmar payload runtime. | Contratos y payload de registro inspeccionados; typecheck/build pasan. Login y respuesta HTTP no probados: manual pendiente. |
| S-02 | Al recargar, token + `role` válido restauran sesión y Bearer; la ruta permitida sigue accesible. | F.2.2 | Manual en navegador: recarga, `localStorage`, ruta y pestaña de red; no hay runner de store. | Lógica de restauración y Bearer inspeccionadas estáticamente; recarga en navegador/red pendiente. |
| S-03 | Sesión con clave `roles` (cualquier array), sin `role`, rol desconocido o legacy (`babyUser`, `admin`, `superUser`, `riffValley`) se limpia y requiere login; no hay acceso autenticado intermedio. | F.2.2 | Manual: sembrar cada variante en `localStorage`, recargar e inspeccionar limpieza/redirección. Las variantes pueden agruparse en una repetición por cada forma de estado inválido. | Rechazo/limpieza legacy inspeccionados; sembrar variantes, recargar y comprobar redirección pendiente. |
| S-04 | Logout elimina estado y claves de sesión y deja de adjuntar Authorization. | F.2.2 | Manual en navegador: logout, inspección de `localStorage` y request posterior. | Acción de logout inspeccionada; estado real y petición posterior pendientes. |
| S-05 | `401` borra la sesión y redirige a Login. | F.2.3 | Implementación inspeccionada; runtime manual pendiente con backend/stub capaz de devolver `401`, verificando storage, cabecera y URL. No hay infraestructura de mocks actualmente. | Interceptor inspeccionado estáticamente; no se provocó `401` ni se afirma resultado HTTP runtime. Manual pendiente. |
| S-06 | `403` muestra denegación, conserva token/usuario, no redirige a Login y mantiene el rechazo para el consumidor. | F.2.3 | Implementación inspeccionada, incluyendo supresión de notificación duplicada cuando SweetAlert ya muestra un error; runtime manual pendiente con backend/stub capaz de devolver `403`, verificando la siguiente petición autenticada. | Interceptor inspeccionado estáticamente; no se provocó `403`. Conservación de sesión y siguiente petición pendientes de runtime. |
| S-07 | JWT vencido (8 h): no hay refresh ni expiración local programada; la siguiente petición recibe `401`, cierra sesión y redirige a Login. | F.2.2 y F.2.3 | Manual con token vencido en backend de prueba; no esperar ocho horas en una prueba interactiva. | Ausencia de refresh/temporizador e invalidación al `401` inspeccionadas; JWT vencido y respuesta backend pendientes. |
| S-08 | Si el rol persistido cambia y Vue conserva el anterior, una operación ya no permitida recibe denegación del backend; UI conserva sesión hasta logout/login manual. | F.2.3; F.5.1 | Manual con cuenta cuyo rol se cambie en backend de prueba y petición protegida; backend/test data requerido. | No se cambió rol ni se llamó backend; rechazo efectivo por el servidor pendiente. |
| N-01 | Rutas públicas continúan accesibles sin sesión y mantienen el flujo de mantenimiento configurado. | F.3.2 | Manual: navegación directa sin token, incluyendo login/mantenimiento. | Metadatos y ramas del guard inspeccionados; navegación pública/mantenimiento en navegador pendiente. |
| N-02 | Rutas con mínimo base permiten cualquier rol autenticado; rutas editoriales admiten `riffvalley` y `superadmin`; rutas administrativas solo `superadmin`. | F.3.1 y F.3.2 | Manual por URL directa con cuentas de cada nivel; build/typecheck no prueban decisiones de runtime. | Mínimos de ruta inspeccionados y helper probado; matriz de URL por sesión pendiente. |
| N-03 | `superadmin` hereda rutas de mínimo `user` y `riffvalley`; `collaborator` alcanza mínimo `user`, pero no editorial. Rol vacío/desconocido falla cerrado. | F.3.1 | Tabla manual de roles × mínimos, incluida navegación directa; criterio de decisión está documentado, runner de tests no disponible. | Comprobación focalizada del helper: 30 combinaciones rol/mínimo pasan; navegación real por URL pendiente. |
| N-04 | Artist Management y ambos Kanban locales de playlists requieren `riffvalley`; user/collaborator no acceden y `superadmin` sí. | F.3.2 | Manual: URL directa por rol; contrastar petición de lectura/escritura con backend, que es autoridad efectiva. | Requisitos de ruta inspeccionados; URL por rol y autorización HTTP pendientes. |
| N-05 | Se eliminan guard/menú/controles dependientes de `babyUser` y la excepción legacy de `/import`; `/calendar-baby` y `/suggest` quedan en base `user`. | F.3.2 y F.3.3 | Búsqueda estática de referencias Auth legacy más navegación manual por URL con los cuatro roles. | Búsqueda/revisión no encontró aliases activos de autorización; clasificación restante documentada abajo. Navegación pendiente. |
| N-06 | Menús, selectores de área y controles visibles coinciden con mínimos de ruta; ningún control visible implica permiso HTTP. | F.3.3 | Manual visual por los cuatro roles; validar las acciones protegidas observando respuesta backend. | Gates revisados estáticamente; inspección visual con cuentas y respuestas del servidor pendientes. |
| A-01 | La administración muestra exactamente un `role`, conserva el rol asignado y solo asigna valores canónicos. | F.4.1 | Manual en UI y backend de prueba para listar/filtrar/editar; typecheck/build solo cubren tipos/compilación. | Tipos, opciones y filtro exacto inspeccionados; interacción UI/backend pendiente. |
| A-02 | Valores legacy se rechazan/no se envían; rutas y cambios administrativos permanecen exclusivos de `superadmin`. | F.4.1 y F.3.2 | Manual con usuarios de prueba; validar respuesta HTTP y que no cambie el estado del usuario. | Guard/validador inspeccionados estáticamente; intentar valor legacy y validar autorización HTTP pendiente. |
| A-03 | Alta respeta registro inicial `user`; si se asigna otro rol, usa el PATCH existente. El fallo del segundo paso se comunica sin fingir éxito y sin sustituir la sesión admin. | F.4.2 | Manual de éxito, error de registro y error parcial con backend/stub disponible. | Payload `{ email, username, password }` y flujo PATCH separado inspeccionados; éxitos/errores HTTP pendientes. |
| A-04 | Consumidores de `/auth/usersRv` siguen funcionando con `riffvalley`/`superadmin`; `/auth/users/superusers` solo carga para `superadmin`, con `role` singular en selectores. | F.4.3 y F.2.3 | Manual en vistas consumidoras y por rol; comprobar requests y respuesta con backend de prueba. | Tipos, paths, roles singulares, asignaciones e imágenes nulas revisados; respuesta real de endpoints y uso visual pendientes. |
| L-01 | No quedan usos funcionales de `roles[]` ni nombres legacy como autorización; conservar usos semánticos de ARIA/dominio identificados en el inventario. | F.5.2 | Automatizable con `rg` y revisión contextual; no reemplazar por coincidencia textual ciega. | Búsqueda global/contextual completada: sin aliases Auth activos; `roles` legacy solo se conserva para limpiar sesión anterior. Casos de dominio documentados abajo. |
| L-02 | DTOs, tipos locales y mocks que existan reflejan `role`; el baseline no encontró suite, fixtures ni mocks de roles. | F.2.1, F.4.3 y F.5.2 | `rg`/revisión estática y typecheck. No hay mocks existentes que actualizar ni runner instalado/configurado. | Búsqueda y typecheck confirman contratos Auth con rol singular; no hay mocks/runner que actualizar. 158 diagnósticos preexistentes, sin cambios. |
| L-03 | Revisar si la referencia `User.roles[]` de `rates.ts` pertenece a limpieza contextual; no inferir que el campo exista en el payload ni convertirlo a `role`. | F.5.2 | La revisión de F.2.1 encontró ausencia de consumidores y de rol en la proyección inspeccionada; no se modificó el tipo no Auth. Solo cambiarlo si una evidencia/consumidor futuro lo requiere. | Confirmado como referencia no Auth sin consumidor; se conserva sin inferir payload. |
| L-04 | Typecheck y build posteriores no introducen regresiones; los casos funcionales de esta matriz pasan antes de cerrar la limpieza. | F.5.1 y F.5.2 | Automatizable con `yarn vue-tsc --noEmit` y `yarn build`; regresión de interacción manual porque no hay runner. | Typecheck: 158 diagnósticos, igual al baseline; build y `git diff --check` pasan. F.5.1 se cierra con la confirmación general del usuario, sin adjudicar resultado individual a cada escenario. |

**Cierre de F.5.1:** el usuario confirma que probó el frontend en localhost con el backend migrado y considera satisfactoria la regresión funcional. Esta confirmación cierra la subtarea junto con la evidencia estática; no representa una afirmación de que cada escenario de las filas anteriores se haya probado individualmente.

### Ejecución F.5 y clasificación final de referencias

- **Alcance verificado:** revisión estática de store/interceptor, guard y mínimos de rutas, gates de menú/controles, administración de roles y consumidores de listados/asignaciones. La comprobación focalizada de `hasMinimumRole()` pasó 30/30 combinaciones; no se creó infraestructura de tests.
- **Confirmación manual general:** el usuario confirma que probó el frontend en localhost con el backend migrado y considera satisfactoria la regresión funcional. No se detallaron escenarios concretos ni se atribuyen resultados individuales de login, persistencia, logout, `401`/`403`, rutas por rol, controles, administración o denegaciones HTTP.
- **Cierre de F.5.1:** se acepta la regresión funcional general indicada por el usuario junto con los resultados estáticos; la confirmación no se presenta como prueba individual de cada fila ni como una afirmación adicional sobre respuestas HTTP concretas.
- **Regresiones de roles:** no se encontró regresión nueva atribuible a la migración en la revisión estática o comprobaciones disponibles.
- **TypeScript:** 158 diagnósticos frente a los 158 registrados al cierre de F.4.3: 0 nuevos y 0 resueltos. Los cuatro desajustes conocidos de `SyncedFestivalPlaylist`/`SyncedGenrePlaylist` con el modelo local y los demás hallazgos preexistentes o de atribución desconocida no se modificaron.
- **Referencias legacy restantes y excluidas por semántica:** la clave local `roles` solo detecta/limpia sesiones legacy; `User.roles[]` en `src/services/rates/rates.ts` sigue siendo un tipo de dominio sin consumidor localizado ni evidencia de campo runtime; `riffValley` se mantiene como categoría de lista, username y parte de nombres de entidad/playlist. Las menciones históricas en changelog/roadmap no son código activo. `CLAUDE.md` ya documenta los roles canónicos y no contiene alias legacy Auth activos.
- **Estado:** F.5.1 y F.5.2 completadas. No quedan usos Auth activos de los aliases en el frontend; los casos excluidos permanecen identificados por su semántica.

### Herramientas disponibles, ejecución y límites

- **Automatizable hoy:** `yarn vue-tsc --noEmit`, `yarn build` y búsquedas/revisiones estáticas con `rg`. Estos comandos comprueban tipos, compilación y presencia de referencias; no prueban persistencia, navegación en runtime ni autorización backend.
- **Manual:** restauración/logout, redirecciones, guards por rol, menús y controles, administración, alta parcial, respuestas `401`/`403` y cambios de rol requieren navegador y backend accesible, cuentas de prueba por rol y capacidad de preparar estados/respuestas HTTP. La confirmación general del usuario se registra arriba; no se le atribuyen estos escenarios individuales.
- **No disponible en el frontend actual:** scripts, configuración y archivos de tests/mocks, lint o arquitectura. F.1.3 no instala ni crea runner. Las verificaciones funcionales deben quedar como evidencia manual en F.5.1 salvo que otra tarea posterior incorpore infraestructura de prueba.
- **No ejecutado en F.1.3:** los flujos anteriores son casos futuros; el baseline Yarn de F.1.1 se conserva sin repetirlo porque no cambió código.

## Decisiones cerradas en F.1.2

### Contrato y roles

- Únicos valores aceptados por el frontend: `user`, `collaborator`, `riffvalley`, `superadmin`, con jerarquía inclusiva. `collaborator` no obtiene capacidades editoriales adicionales; `riffvalley` es el mínimo editorial y `superadmin` el mínimo administrativo.
- `babyUser`, `admin`, `superUser` y `riffValley` dejan de ser aliases válidos. Vue no los convierte. La normalización histórica de datos PostgreSQL pertenece a la migración backend; no se confunde con la interpretación del contrato en Vue.
- Las rutas hoy exclusivas de `babyUser` (`/calendar-baby`, `/suggest`) pasan al mínimo base `user`; la excepción de navegación de `/import` ligada a ese nombre se elimina en F.3. Los permisos de HTTP siguen dependiendo del backend.

### Sesiones y errores

- La store Auth se hidrata desde `localStorage` con `token`, `username`, `userId`, `image`, `roles` y preferencias de dashboard. Login guarda esa misma forma; logout borra las claves conocidas y la cabecera Axios. No hay recuperación de perfil `/auth/me`.
- F.2.2 aceptará para restauración solo token + `role` singular exactamente canónico y ausencia de la clave legacy `roles`. Si la clave `roles` existe, el rol falta o es inválido/legacy, se limpiará el estado Auth en memoria y las claves locales conocidas (token, identidad, imagen, `roles`/`role` y preferencias de dashboard), se quitará Authorization y se exigirá login nuevo. No se transformará `admin` en `superadmin`.
- Con sesión vigente, Vue mantiene la copia local del rol para guards/visibilidad y envía Bearer; esa copia no autoriza llamadas HTTP. El backend valida el rol persistido en cada ruta protegida.
- Logout borra la sesión local. `401` cierra sesión y redirige a Login. `403` conserva la sesión y muestra denegación de acceso, con salida hacia Home; no equivale a cierre de sesión.
- Si cambia el rol persistido durante la vida del JWT, el backend aplica el cambio en la siguiente llamada protegida y puede responder `403`; la copia de rol de Vue no se actualiza automáticamente. Para reconstruir la navegación se cerrará sesión y se hará login de nuevo. No habrá polling ni temporizador.
- El JWT vence a las ocho horas. No se decodifica para programar expiración ni se renueva; una sesión inactiva puede parecer vigente hasta la próxima petición, cuyo `401` cierra sesión y lleva a Login.

### Contratos y mínimos de consumidores

- Login responde identidad, `role` singular canónico, datos de dashboard y `token`, sin password ni `roles[]`. Registro rechaza `role`/`roles` en el request y devuelve el usuario creado con `role: user` y `token`, sin password ni `roles[]`. Los valores canónicos son `user`, `collaborator`, `riffvalley` y `superadmin`.
- `GET /auth/usersRv` tiene mínimo `riffvalley` (incluye `superadmin`); `GET /auth/users/superusers` tiene mínimo `superadmin`.
- Artist Management y `/riff-valley-playlists/festivales`, `/riff-valley-playlists/generos` requieren mínimo editorial `riffvalley`. Las rutas frontend actuales solo exigen login; F.3 debe elevar los guards y alinear visibilidad, mientras el servidor sigue siendo la autoridad HTTP.
- `src/services/rates/rates.ts` declara `User.roles[]`, pero no hay consumidor de ese campo. El backend relaciona el usuario y mantiene `User.role` como `select: false`, sin seleccionarlo para rates; no hay evidencia de ese campo en el payload. F.2.1 lo revisó y lo dejó intacto al estar fuera de los DTOs Auth.

### Trabajo asignado a fases posteriores

- **F.2:** tipar Auth con `role` singular; cambiar Pinia y persistencia de sesión; validar/limpiar estado legacy antes de habilitar navegación; mantener Bearer; conservar logout ante `401` y tratar `403` como denegación sin borrar sesión; alinear servicios y DTOs.
- **F.3:** centralizar comparación por mínimo inclusivo; retirar checks/aliases legacy; actualizar guards, menús y controles visibles; dar mínimo `user` a las dos rutas antes asociadas a `babyUser`; exigir mínimo `riffvalley` en Artist Management y ambos Kanban de playlists; preservar mínimos backend de listados.
- **F.4:** convertir administración de usuarios de selección `roles[]` a `role` singular; respetar registro inicial `user` y PATCH existente para asignación administrativa; alinear listados y asignaciones incluyendo `usersRv` y superusers.

1. **Contrato de rates:** tipo `User.roles[]` permanece como campo no Auth sin consumidores localizados; contrato/modelo inspeccionado no muestra rol en la proyección. No se probó una respuesta en entorno; F.2.1 lo dejó sin modificar y F.5.2 revisará si pertenece a limpieza funcional o si debe conservarse como tipo de dominio.
2. **Store genérica `userStore.user`:** store confirmada; `fetchUser`/`setUser` sin callsites encontrados. Su retirada o reutilización no se infiere desde el inventario; revisar solo si otra subtarea funcional lo requiere.
3. **Cambio de rol durante JWT vigente:** el backend consulta el rol persistido en cada llamada; Vue conserva una copia local hasta logout/login. La decisión UX de F.1.2 es conservar la sesión al recibir `403` y pedir nuevo login cuando se necesite refrescar la navegación.

## Cierre de F.1

La búsqueda e inspección asignaron propietario a cada uso Auth localizado y separaron los casos de dominio/ARIA. F.1.1 cerró el inventario, F.1.2 las decisiones y F.1.3 preparó la matriz y conservó el baseline; las tres subtareas completan F.1. El tipo Rates no Auth queda sin cambios según la evidencia revisada en F.2.1. No se hicieron cambios funcionales, ni se ejecutaron tests/lint/arquitectura inexistentes en esta subtarea.
