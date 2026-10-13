# Roadmap: migración frontend a rol único

**Estado:** F.1, F.2, F.3, F.4 y F.5 completadas. F.5.1 y F.5.2 se completaron el 2026-10-13.

**Alcance:** adaptación del frontend al contrato documentado en el backend. Este roadmap no cambia código funcional, backend, base de datos, contratos HTTP ni configuración de `.impeccable`.

**Contrato de referencia:** [`roles-frontend-contract.md`](../../spammusic-back/roadmap/roles-frontend-contract.md), en el checkout vecino del backend. El backend documenta los valores `user`, `collaborator`, `riffvalley` y `superadmin`, jerarquía inclusiva, respuestas con `role` singular, y ausencia de `/auth/me` y refresh token. El código desplegado y la migración PostgreSQL no se consideran verificados por ese documento.

## Inventario actual y baseline de referencia

El frontend es Vue 3 + TypeScript, con Pinia, Vue Router y servicios Axios centralizados. La autenticación vive en `src/stores/auth/auth.ts`; el token y datos de usuario se guardan en `localStorage`; `src/services/api/api.ts` adjunta Bearer y solo trata globalmente `401`. Los guards están en `src/router/index.ts`, y el menú se define en `src/layouts/default/components/routes.json` y se filtra desde `SidebarMenu.vue`. Las instrucciones de arquitectura consultadas son `README.md` y `CLAUDE.md`; no se encontró `AGENTS.md` en el checkout.

| Área | Hallazgo frontend | Diferencia o consecuencia |
| --- | --- | --- |
| Roles y login | El store aún restaura/persiste `roles[]`; tras F.2.1, `LoginResponse` declara `role: UserRole`. | Contrato de servicio alineado; la store y la migración de sesión siguen para F.2.2. |
| Nombres de rol | Hay checks para `user`, `babyUser`, `riffValley`, `superUser` y `admin`. | Solo `user` y la capacidad editorial son conceptualmente coincidentes; los nombres canónicos de backend son minúsculos (`riffvalley`, `superadmin`). `babyUser` y `admin` no son roles del contrato. |
| Persistencia/JWT | El Bearer se añade desde Pinia; `initializeAuth()` restaura la cabecera; no se inspeccionan claims del JWT. El interceptor global cierra sesión ante `401`. | No hay `/me` ni refresh para recuperar el rol de una sesión antigua. El rol del claim tampoco es fuente definitiva de autorización y el backend puede responder `403`; no existe manejo global específico de `403`. |
| Guards | `requiresRole` usa `includes()` contra `roles[]`; hay restricciones adicionales para `babyUser`. Artist Management y las dos rutas de Kanban local de playlists requieren solo login. | Deben expresarse mínimos jerárquicos; las rutas editoriales hoy admiten navegar más allá de la visibilidad interna que algunas vistas intentan imponer. |
| Menús/visibilidad | `routes.json` contiene mínimos `user`, `babyUser`, `riffValley`, `superUser` y arrays de roles. El selector de áreas comprueba `riffValley`/`superUser`. Hay checks en `DiscCardComponent.vue`, `DiscCalendar.vue`, `PasswordChange.vue`, `ArtistManagement.vue` y playlists. | Navegación y controles visuales deben reflejar los mínimos del backend, sin presentarse como autorización efectiva. El backend sigue decidiendo cada llamada HTTP. |
| Servicios y DTOs Auth | `LoginResponse`, `Superuser`, registro, listados admin y requests de perfil se tipan con rol singular según contrato; hay `getUsersRv()` y `getSuperusers()`. | Tipos de servicio alineados en F.2.1; consumidores store/vista quedan pendientes. El path histórico `/auth/users/superusers` permanece válido. |
| Gestión de usuarios | `ManageUsers.vue` representa roles como selección múltiple, filtro por varios roles y envía `{ roles: [...] }`; el store reenvía el DTO al endpoint administrativo. | Backend acepta `{ role: string }` en `PATCH /auth/superadmin/:id`; no acepta `roles[]`. El listado administrativo devuelve `role` singular. |
| Alta de usuarios | `ManageUsers.vue` envía roles en el registro. | `POST /auth/register` rechaza `role` y `roles`, crea con `user`; la asignación posterior puede usar el endpoint administrativo existente, con manejo explícito del fallo entre ambas llamadas. |
| `usersRv` / `/auth/usersRv` | El servicio se duplica en `services/users/users.ts` y `services/auth/auth.ts`; lo guardan `userStore.usersRv` y lo piden directamente vistas. | El contrato devuelve usuarios `riffvalley` y `superadmin` con `role` singular. Conservar el endpoint existente y alinear tipos/consumidores. |
| `/auth/users/superusers` | `VersionKanban.vue` usa `getSuperusers()` para asignaciones; `KanbanBoard.vue` tipa `roles[]`. | La respuesta devuelve `role: "superadmin"`; conservar el path y corregir proyección/tipos. |
| Kanban de playlists locales | `RiffValleyPlaylistFestivalsKanban.vue` y `RiffValleyPlaylistGenresKanban.vue` llaman `getUsersRv()` para asignación. La vista de festivales muestra edición según `riffValley`, `admin` o `superUser`; las rutas solo exigen login. | CRUD y herramientas editoriales requieren mínimo `riffvalley` según contrato. No habilitar capacidades editoriales nuevas a `collaborator`. |
| Artist Management | Ruta `ArtistManagement` y vista `src/views/artists/ArtistManagement.vue`; comprobación interna con `riffValley`/`superUser`, ruta solo autenticada. | Alinear ruta y visibilidad con mínimo editorial, que permite `riffvalley` y `superadmin`. |
| Otras listas editoriales | `userStore.usersRv` lo consumen `AsignationList.vue` y `MejoresAsignationList.vue`; `getRvUsers()` también aparece en `DiscByDate.vue`, `SpecialAsignationList.vue`, `ContentCalendar.vue` y `ListReunion.vue`. `getUsersRv()` se usa en Artículos, Vídeos y ambos Kanban de playlists. | Verificar que todos lean `role` singular y que el conjunto filtrado de asignables conserve el significado del endpoint. |
| Otros datos con nombre similar | `src/services/rates/rates.ts` conserva `User.roles: string[]`, sin consumo frontend encontrado y sin rol en la proyección backend inspeccionada. Los atributos HTML `role="dialog|switch"` son semántica accesible y no roles de autorización. | Rates queda como tipo no Auth, intacto en F.2.1; F.5.2 puede revisar la referencia como limpieza contextual, sin asumir que el payload tenga el campo. |
| Tests y mocks | No se encontraron tests, fixtures/mocks, configuración de runner ni script de test en `package.json`. | F.1 debe fijar baseline y confirmar estrategia de regresión antes de migrar. El build/typecheck sí está documentado como `yarn build`. |

### Separación de controles

- **Autorización de navegación:** `router/index.ts` exige sesión y compara `meta.requiresRole`; hoy la comparación es exacta contra `roles[]`. Es una barrera de navegación del cliente.
- **Visibilidad de componentes:** `routes.json`/`SidebarMenu.vue` filtran enlaces y vistas como Artist Management/playlists ocultan algunos controles con checks locales. Esto solo cambia lo que se muestra.
- **Llamadas HTTP:** `services/api/api.ts` adjunta Bearer desde el store, cierra sesión ante `401` y no centraliza `403`. La autorización efectiva se decide en el backend para cada endpoint; para `/auth/usersRv` y `/auth/users/superusers` hay consumidores concretos listados arriba.

### Hallazgo de contrato: mínimo de `/auth/usersRv`

**Comportamiento observado:** el párrafo introductorio de la tabla de administración en `roles-frontend-contract.md` afirma que todas las rutas de la tabla requieren `superadmin`. La fila de `/auth/usersRv` lo deja implícito. Sin embargo, el controlador backend actual declara `@Auth(ValidRoles.riffvalley)` para esa ruta y la auditoría R.14e también la registra con mínimo editorial; sus consumidores incluyen Kanban de artículos, vídeos, playlists y asignaciones de listas.

**Problema:** aplicar literalmente el resumen general ocultaría un endpoint requerido por usuarios editoriales y causaría `403` en esos selectores.

**Impacto:** frontend + documentación del contrato; el comportamiento del controlador y la auditoría coinciden entre sí.

**Recomendación:** para el inventario y las comprobaciones frontend, tratar `/auth/usersRv` con mínimo `riffvalley` (incluye `superadmin`), sin cambiar endpoint ni payload. Aclarar/corregir el resumen general del documento backend en una tarea documental separada.

**Estado de contraste:** confirmado por `AuthController.findAllRv` (`@Auth(ValidRoles.riffvalley)`) y por la auditoría R.14e. No bloquea cerrar F.1.1; queda anotado para confirmar que implementaciones posteriores preserven el mínimo endpoint-específico.

### Decisiones/gates previos a la implementación

1. **Alta administrativa (F.4):** el registro siempre crea `user` y no admite selección de rol. F.4.2 adapta el formulario para registrar únicamente esa cuenta estándar. Si hace falta otro rol, `superadmin` lo cambia después de forma independiente desde la edición existente (`PATCH /auth/superadmin/:id`); no se encadenan registro y elevación automática.
2. **Despliegue compatible (coordinación externa):** backend singular no ofrece respuesta dual. Coordinar el despliegue para que un frontend antiguo no quede leyendo `roles[]` contra login singular ni envíe `{ roles: [...] }`. La secuencia operativa de migración/despliegue queda fuera de este roadmap.

## F.1 Inventario y baseline

**Objetivo:** cerrar el inventario, las decisiones y los criterios observables antes del primer cambio funcional. F.1.1, F.1.2 y F.1.3 quedan completadas; F.2 sigue pendiente.

### F.1.1 XS — Cerrar matriz de roles y consumidores

**Estado: completada el 2026-10-13.** Inventario exhaustivo y clasificación de autorizaciones, visibilidad y llamadas HTTP documentados en [`roles-inventory.md`](roles-inventory.md). No se modificó código funcional.

- **Depende de:** ninguna.
- **Trabajo:** contrastar todas las coincidencias de `role(s)`, stores, JWT/localStorage, guards, menús, Auth DTO/servicios, administración, tests y mocks con esta matriz; separar coincidencias semánticas ajenas (ARIA, rating, dominio editorial).
- **Aceptación:** cada uso de autorización queda clasificado como guard, visibilidad o llamada HTTP; cada consumidor de `usersRv`, `getUsersRv`, `getSuperusers`, Artist Management y Kanban local queda enumerado; no quedan usos sin propietario.
- **Verificación:** búsquedas globales y revisión manual completadas; consumidores y callsites clasificados en el inventario. `/auth/usersRv` contrastado contra controller y auditoría backend. `yarn vue-tsc --noEmit` pasa; `yarn build` pasa con avisos registrados. Esos comandos son baseline de compilación, no resultados de escenarios funcionales; F.1.3 documenta la matriz que queda para F.5.1.

### F.1.2 XS — Resolver roles legacy y política de sesión

**Estado: completada el 2026-10-13.** Las decisiones siguientes se contrastaron con el contrato backend y el flujo actual de persistencia; su implementación queda en F.2–F.4.

- **Depende de:** F.1.1.
- **Trabajo:** decidir tratamiento frontend de `babyUser`, `admin`, `superUser`, `riffValley` y `roles[]` persistido, respetando los cuatro valores canónicos y el fail-closed.
- **Decisión de roles:** el contrato singular admite solo `user` (usuario básico), `collaborator` (nivel intermedio sin permisos editoriales adicionales), `riffvalley` (equipo editorial) y `superadmin` (administración completa), en ese orden inclusivo. Vue no mantendrá aliases para `babyUser`, `admin`, `superUser` ni `riffValley`, ni convertirá esos valores en tiempo de ejecución. La conversión histórica de registros en PostgreSQL corresponde al backend y a su despliegue/migración; Vue solo interpreta el `role` canónico recibido.
- **Decisión sobre `babyUser`:** al desaparecer ese rol y no existir permisos por módulo, `/calendar-baby` y `/suggest` se tratarán como rutas de nivel base `user` (jerarquía inclusiva). Se retirará la excepción de `/import` basada en `babyUser`; no se mapeará ese nombre a `collaborator` ni a ningún rol editorial. La visibilidad resultante es navegación/UI; los endpoints siguen aplicando su propia autorización backend.
- **Decisión sobre sesiones antiguas:** el flujo actual hidrata el estado Auth desde `localStorage` al crear la store; guarda `token`, `username`, `userId`, `image`, `roles` y preferencias de dashboard. No hay `/auth/me` para recuperar un rol actual. En F.2.2, antes de permitir navegación autenticada, se validará que haya token y un `role` singular exactamente canónico, y se rechazará cualquier sesión que conserve la clave `roles` o valores legacy/desconocidos. Se limpiará el estado Auth en memoria, las claves locales conocidas de sesión (`token`, `username`, `userId`, `image`, `roles`/`role`, `dashboardButtonsEnabled`, `dashboardConfig`, `mobileDashboardConfig`) y la cabecera Axios; se enviará al login para obtener una sesión nueva. No convertir `admin` en `superadmin`. El valor de `localStorage` solo sirve para presentar la interfaz y nunca autoriza HTTP.
- **Sesión vigente y errores:** al restaurar token + `role` canónico, Vue conserva la sesión y adjunta Bearer; el backend decide cada petición usando el rol persistido. Cerrar sesión elimina estado y claves locales y retira Authorization. Un `401` mantiene el comportamiento actual de logout y redirección a Login. Un `403` conserva la sesión, presenta falta de autorización y permite volver a Home; no debe cerrar sesión. Si el rol persistido cambia mientras el JWT sigue vigente, la copia local queda desactualizada: el backend aplicará el nuevo mínimo y puede responder `403`; para actualizar la navegación se cerrará sesión y se iniciará otra. No habrá polling ni temporizador de sincronización. El JWT dura ocho horas; no hay refresh ni temporizador local, por lo que una sesión inactiva puede verse abierta hasta que la siguiente petición reciba `401`, cierre sesión y redirija al login.
- **Contratos y mínimos confirmados:** login devuelve identidad, `role` singular canónico, datos de dashboard y `token`, sin password ni `roles[]`; registro devuelve el usuario creado con `role: user` y `token`, sin password ni `roles[]`, y no acepta rol en el request. `GET /auth/usersRv` exige mínimo `riffvalley`; `GET /auth/users/superusers` exige `superadmin`. Artist Management y ambos Kanban locales de playlists requieren mínimo editorial `riffvalley` (incluye `superadmin`), aunque sus guards frontend actuales solo exigen login. La visibilidad/menu y los guards frontend son navegación de cliente, no autorización efectiva.
- **Rates revisado en F.2.1:** `src/services/rates/rates.ts` define `User.roles[]`, sin consumidor frontend localizado. El backend carga la relación Rate→User y `User.role` tiene `select: false`; la proyección inspeccionada no declara rol. Se deja intacto porque es un tipo de dominio no Auth y no se debe convertir por semejanza nominal. F.5.2 podrá clasificar esta referencia al limpiar usos Auth, sin inferir un campo runtime.
- **Reparto de implementación:** F.2 alinea DTOs Auth y store singular, valida/limpia sesiones heredadas, y trata `403` como denegación sin logout; F.3 actualiza mínimos de guards, menús y controles visibles, incluidos `/calendar-baby`, `/suggest`, Artist Management y ambos Kanban locales; F.4 adapta administración de usuarios y asignaciones a rol singular, preservando `/auth/usersRv` en mínimo `riffvalley` y `/auth/users/superusers` en mínimo `superadmin`.
- **Aceptación:** decisiones escritas para cada rol legacy y para sesión sin `role`; no hay mapping de `collaborator` a capacidad editorial.
- **Verificación:** contrato revisado contra jerarquía, respuestas/limitaciones Auth y controller/auditoría endpoint-específica; persistencia cotejada con `src/stores/auth/auth.ts` y el interceptor Axios. Se resolvió la decisión sin cambiar código.

### F.1.3 S — Establecer baseline funcional y de regresión

**Estado: completada el 2026-10-13.** La matriz reproducible, la asignación a subtareas y los métodos de verificación están en [`roles-inventory.md`](roles-inventory.md). No se ejecutaron pruebas funcionales ni se modificó código.

- **Depende de:** F.1.1 y F.1.2.
- **Trabajo:** acordar cobertura automatizada/manual dado que no hay runner ni tests visibles; registrar escenarios de contratos/sesión, menú/rutas, edición de usuarios, asignación editorial y respuestas `401`/`403`.
- **Aceptación:** existe una matriz por rol (`user`, `collaborator`, `riffvalley`, `superadmin`), incluyendo rol desconocido, sesiones antiguas, vistas editoriales y alta administrativa; cada caso apunta a una subtarea F.2–F.5 y declara método y requisito de entorno.
- **Verificación:** matriz revisada contra los contratos y decisiones F.1.1/F.1.2 y las subtareas existentes; baseline de Yarn conservado desde F.1.1. Typecheck/build no se repiten porque no cambió código; no existe runner de tests/lint/arquitectura ni se implementa uno en F.1.3.

## F.2 Adaptación de contratos y stores

**Dependencia:** F.1 completa. Contrato backend disponible; coordinar implementación con el despliegue singular.

### F.2.1 XS — Definir tipos Auth singulares

**Estado: completada el 2026-10-13.** Contratos Auth tipados según DTOs y respuestas backend en `src/interfaces/auth.ts`, `src/services/auth/auth.ts` y `src/services/users/users.ts`. No se modificaron stores, vistas, rutas ni comportamiento.

- **Depende de:** F.1.2.
- **Trabajo:** modelar unión `UserRole` con `user | collaborator | riffvalley | superadmin`; adaptar tipos de login/registro, perfil propio, administración, proyecciones editoriales y usuarios asignables a `role` singular. No reinterpretar campos no Auth solo por su nombre.
- **Resultado:** `LoginResponse` requiere `id`, `username`, `role` y `token`, sin `password` ni `roles[]`; registro tiene request/response tipados, sin rol en el request y con rol canónico en la respuesta; `Superuser` y el listado `AdminUser` usan `role`; los DTOs de perfil propio excluyen el rol y los administrativos aceptan solo `role?: UserRole`. El tipo del área editorial comparte una sola definición de `UserRole`.
- **Límite:** la store y la persistencia se migraron en F.2.2; siguen pendientes los consumidores de vistas/administración con `roles[]`, que corresponden a F.3/F.4. No hay interfaz JWT reutilizable en el frontend. `rates.ts` permanece sin cambios: su campo no tiene consumidores y la inspección backend no lo confirma como parte del payload; se conserva separado del contrato Auth.
- **Aceptación:** las respuestas documentadas de login, registro, `/users`, `/usersRv` y `/users/superusers` tienen tipos singulares acordes al contrato; no hay arrays `roles[]` en DTOs Auth del servicio.
- **Verificación:** `yarn vue-tsc --noEmit` pasó y `yarn build` pasó con avisos de baseline. El proyecto raíz usa `tsconfig.json` con `files: []` y referencias; esos comandos no typechequean `tsconfig.app.json` directamente. La comprobación explícita `yarn vue-tsc --noEmit --project tsconfig.app.json --pretty false` descubre el error transitorio de `authStore` leyendo `response.roles`, propiedad que se resolverá en F.2.2; además, detecta consumers de lista pendientes en F.4.3: `VersionKanban.vue`/`KanbanBoard.vue` aún esperan `roles[]` y Articles/Videos Kanban esperan `image` no-nullable. El proyecto explícito también muestra otros errores de código fuera de esta tarea, sin baseline previo comparable; no se tocaron. Ver detalle en [`roles-inventory.md`](roles-inventory.md).

### F.2.2 S — Migrar estado Auth y sesión persistida

**Estado: completada el 2026-10-13.** `src/stores/auth/auth.ts` mantiene `role: UserRole` singular, persiste `role` con el token y rechaza en la hidratación estados sin token, sin rol canónico o con la clave legacy `roles`. El conjunto de valores de runtime y el tipo `UserRole` comparten la definición de `src/interfaces/auth.ts`. Login valida que la respuesta tenga token y rol canónico antes de establecer sesión; logout y la invalidación eliminan claves de sesión y la cabecera Axios. No se decodifica el JWT ni se añade `/me`, refresh o temporizador.

- **Depende de:** F.2.1 y decisión F.1.2.
- **Trabajo:** cambiar estado/getters de Pinia a un rol singular; persistir/restaurar el valor acordado; limpiar o rechazar estados legacy sin rol confiable; mantener transporte Bearer y logout coherentes. No leer el claim como autorización vigente.
- **Aceptación:** login usa `response.role`; sesión nueva sobrevive a recarga; logout elimina estado; estado desconocido o legacy no habilita áreas; no se asume `/me`, refresh ni cookie.
- **Resultado de comportamiento:** `hasRole` compara igualdad con el único `role`; el bearer sigue adjuntándose desde el interceptor Axios y la sesión válida queda en `localStorage`. La expiración del JWT se detecta en la siguiente petición con 401, que conserva el logout y redireccionamiento existentes. El 403 ya conserva la sesión porque el interceptor no lo intercepta; su presentación explícita queda en F.2.3.
- **Verificación:** `yarn vue-tsc --noEmit --project tsconfig.app.json --pretty false` reporta errores en otros archivos; el único grupo nuevo directamente atribuible al cambio de forma de estado está en `router/index.ts` (dos lecturas `authStore.roles`) y `ArtistManagement.vue` (dos lecturas), consumidores fuera de alcance que migrarán en F.3. No aparecen diagnósticos en la store. `yarn build` pasa con los avisos de baseline (Browserslist, minificación CSS y tamaño de bundle); `git diff --check` pasa. No hay suite de tests ni backend compatible disponible para ejecutar los escenarios manuales de login, recarga, logout, 401 y 403; esos resultados no se simulan.
- **Límite:** no se adaptaron guards, navegación, menús, Artist Management ni Kanban. `DiscCardComponent.vue` aún lee directamente `localStorage.roles`, por lo que su control de moderación no se mostrará con sesiones nuevas hasta la migración de visibilidad prevista en F.3.3. Las lecturas `authStore.roles` pendientes se resolverán en F.3. F.2 no está completa mientras F.2.3 siga pendiente.

### F.2.3 XS — Alinear servicios HTTP y errores de autorización

**Estado: completada el 2026-10-13.** `src/services/api/api.ts` conserva Bearer y logout/redirección al login en 401. Ante 403 programa una notificación de denegación tras la propagación al consumidor; si la vista ya abrió una notificación de error de SweetAlert, no muestra otra. La promesa sigue rechazándose con el error original. Los servicios Auth revisados usan los tipos singulares de F.2.1 y conservan sus endpoints y payloads.

- **Depende de:** F.2.1.
- **Trabajo:** unificar las funciones duplicadas de listados solo si F.1 confirma que no altera callers; preservar paths existentes; tipar los campos singulares; definir presentación del `403` de Axios en pantallas que llaman endpoints protegidos.
- **Aceptación:** no se crean endpoints; payloads enviados siguen DTOs existentes; `401` conserva cierre de sesión y `403` se representa como falta de autorización, sin borrar la sesión.
- **Verificación:** revisión estática confirma Bearer por request, logout y redirección ante 401, conservación del error 403 y no intervención ante errores inesperados. `yarn vue-tsc --noEmit --project tsconfig.app.json --pretty false` mantiene los diagnósticos documentados en F.2.2, sin nuevos errores de F.2.3; `yarn build` pasa con avisos de baseline y `git diff --check` pasa. No se dispone de backend compatible ni runner para validar runtime los escenarios 401/403; quedan incluidos en la regresión manual F.5.1 y no se afirman como ejecutados.
- **Límite:** no se unificaron las dos funciones de `/auth/usersRv`; F.1 registró callers distintos en los servicios de Auth y Users. No se alteraron paths, métodos ni payloads.

## F.3 Guards, rutas y navegación

**Dependencia:** F.1 completa y F.2.1/F.2.2 disponibles.

### F.3.1 XS — Implementar comparación por mínimo de rol

**Estado: completada el 2026-10-13.** `src/helpers/roles.ts` exporta `hasMinimumRole`, que compara índices de `USER_ROLES` de `src/interfaces/auth.ts`. La tupla canónica existente es la única definición del orden y también deriva el tipo `UserRole`. La función valida en runtime tanto el rol actual como el mínimo para denegar valores inválidos recibidos desde JavaScript/datos externos. Es una utilidad pura, sin dependencias de Vue, Pinia, router ni HTTP.

- **Depende de:** F.2.1 y F.2.2.
- **Trabajo:** añadir una regla central de mínimo inclusivo para navegación; conservar requisito de login separado y fallar cerrado ante rol inválido. No definir permisos por módulos.
- **Aceptación:** `user` < `collaborator` < `riffvalley` < `superadmin`; mínimos `riffvalley` admiten `riffvalley`/`superadmin`; mínimo `superadmin` solo admite `superadmin`; `collaborator` no alcanza operaciones editoriales.
- **Verificación:** comprobación puntual mediante esbuild y Node ejecutó los 16 pares de la tabla de verdad y rechazó `null`, `undefined`, cadena desconocida, los cuatro roles legacy, tipo numérico/objeto y mínimos inválidos. `yarn vue-tsc --noEmit --project tsconfig.app.json --pretty false` mantiene los 169 diagnósticos del baseline F.2.3, sin regresiones atribuibles a F.3.1; `yarn build` pasa con avisos preexistentes y `git diff --check` pasa.
- **Límite:** no se modificaron el guard, rutas, menús ni consumidores; F.3 sigue pendiente.

### F.3.2 S — Alinear guards de router

- **Depende de:** F.3.1 y decisiones F.1.2.
- **Trabajo:** reemplazar checks de `roles[]` por mínimos singulares en `src/router/index.ts`; ajustar rutas editorial/admin; resolver rutas actualmente asociadas a `babyUser` según decisión F.1.2; reforzar Artist Management y ambos Kanban locales a mínimo editorial.
- **Aceptación:** acceso directo por URL respeta mínimos; login y página de mantenimiento conservan su flujo; no se presenta un guard frontend como autorización HTTP.
- **Resultado:** el guard usa `authStore.role` y `hasMinimumRole()`. Un token ausente o rol ausente/inválido en una ruta protegida devuelve a Login; una sesión válida que no alcanza el mínimo vuelve a Home y se conserva. Se retiró la excepción de `/import`; `/calendar-baby` y `/suggest` quedan en mínimo `user`. Artist Management y los dos Kanban locales de playlists quedan en `riffvalley`; las rutas editoriales inventariadas usan `riffvalley` y las rutas de gestión de usuarios, versiones, noticias y sugerencias administrativas usan `superadmin`. Las rutas públicas y el desvío de mantenimiento mantienen su flujo.
- **Verificación:** una comprobación focalizada ejecutó el guard real mediante Vue Router con historial en memoria y store Auth simulada: invitado, `user`, `collaborator`, `riffvalley`, `superadmin`, rol ausente/inválido, rutas públicas, comunitarias, editoriales y administrativas dieron el resultado esperado. La tabla de `hasMinimumRole()` confirmó los 16 pares y rechazó los cuatro nombres legacy. El typecheck bajó de 169 a 167 diagnósticos: se eliminaron los dos accesos `authStore.roles` del router; los dos accesos de `ArtistManagement.vue` y el resto del baseline siguen pendientes de sus subtareas. `yarn build` y `git diff --check` pasan. No se hizo navegación en navegador ni llamadas al backend; la comprobación de guard no valida autorización HTTP, que corresponde al servidor.
- **Seguimiento F.3.3:** los checks internos y menús se alinearon en F.3.3. El Kanban de géneros sigue sin check propio porque sus operaciones quedan dentro de la ruta editorial y su manager no introduce otro mínimo.
- **Estado:** completada.

### F.3.3 S — Alinear menús y controles visuales

- **Depende de:** F.3.1, F.3.2.
- **Trabajo:** adaptar `routes.json`, selector de áreas y checks de componentes a mínimos singulares; inventariar acciones visibles de Artist Management, playlists y calendarios; retirar nombres legacy resueltos en F.1.2.
- **Aceptación:** cada enlace/acción se muestra para los mismos mínimos previstos en la ruta; un usuario oculto por UI sigue protegido por backend; collaborator solo ve capacidades que hereda de user.
- **Resultado (completada el 2026-10-13):** `routes.json` usa mínimos singulares canónicos en enlaces y subenlaces. `SidebarMenu.vue` filtra con `hasMinimumRole`; el selector editorial requiere `riffvalley` y las opciones administrativas requieren `superadmin`. Artist Management y el Kanban de festivales usan el mínimo editorial. `DiscCardComponent.vue`, `DiscCalendar.vue` y `DiscComponent.vue` muestran acciones de moderación/edición de catálogo desde `riffvalley`; la búsqueda de imágenes Last.fm queda en `superadmin`. El calendario conserva contenido de lectura, fechas y enlaces para usuarios base. Ajustes editoriales del perfil requieren `riffvalley`. Las acciones del Kanban de festivales y su manager heredan el mínimo editorial. `collaborator` conserva los enlaces base de `user` sin acciones editoriales adicionales; `superadmin` hereda los controles editoriales.
- **Verificación:** una comprobación focalizada ejecutó `hasMinimumRole()` contra los 16 pares, rechazó rol ausente, desconocido y los cuatro nombres legacy, validó los mínimos del JSON de menú y comprobó la jerarquía de visibilidad para invitado, `user`, `collaborator`, `riffvalley` y `superadmin`. Una búsqueda en `src` no encontró checks funcionales legacy en menús/componentes afectados; permanecen la validación/limpieza de sesión legacy en Auth y los formularios de `ManageUsers.vue`, reservados para F.4. `yarn vue-tsc --noEmit --project tsconfig.app.json --pretty false` pasó de 167 a 165 diagnósticos: desaparecieron los dos accesos `authStore.roles` de Artist Management y no se introdujeron diagnósticos nuevos. `yarn build` pasa. Se mantienen avisos observados de Browserslist/caniuse-lite, sintaxis CSS `.flex-[2]` y tamaño del chunk principal sobre 500 kB. `git diff --check` pasa.
- **Límite de verificación:** no se hizo inspección visual en navegador ni prueba HTTP contra backend; la primera requiere navegador y cuentas por rol y la segunda un backend compatible. El contrato/controlador documentados siguen atribuyendo la autorización efectiva al backend. La validación visual manual queda en N-06/F.5.1; no se afirma que el build pruebe autorización HTTP.
- **Estado:** completada. F.3 queda completa; la siguiente subtarea exacta es F.4.1 S — Migrar tabla, filtros y formulario de edición a `role`.

## F.4 Gestión administrativa de usuarios

**Dependencia:** F.2.1/F.2.3 y F.3.1; decisiones de alta de F.1.

### F.4.1 S — Migrar tabla, filtros y formulario de edición a `role`

- **Depende de:** F.2.1 y F.2.3.
- **Trabajo:** cambiar tipo/modelo, etiqueta, filtro de rol y selector de multi-check a valor único; actualizar store para enviar `{ role }` a `PATCH /auth/superadmin/:id`.
- **Resultado (completada el 2026-10-13):** `ManageUsers.vue` usa `AdminUser` del contrato de `/auth/users`, con `role: UserRole`. La tabla muestra una sola selección etiquetada «Rol»; sus cuatro opciones salen de `USER_ROLES`. Valores desconocidos se presentan como «Rol no reconocido» y el handler rechaza cualquier valor fuera de esa tupla. La actualización llama al store con `{ role: selectedRole }`; tras éxito, la fila y su snapshot local conservan `role` singular. El filtro conserva un único `UserRole | null` y aplica igualdad exacta (`u.role === roleFilter`), sin usar jerarquía de permisos. Búsqueda, ordenación, fecha, notas, contraseña, baneo y borrado se mantienen. La ruta `/users` ya requiere `superadmin` y el menú también filtra esa opción por `superadmin`; no se añadió una comprobación de autorización paralela al componente.
- **Límite de alcance de F.4.1:** el modal de alta y su payload `{ roles: [...] }` quedaron expresamente para F.4.2; esa subtarea posterior ya retiró la selección y el payload legacy del alta.
- **Verificación:** comprobación focalizada de contrato, tabla singular, opciones canónicas, filtro exacto, selector único, validación runtime y payload `{ role }`; se confirmó que las acciones no relacionadas y la ruta administrativa siguen presentes. Typecheck explícito: **165 diagnósticos**, igual al baseline F.3.3; la comparación normalizada no detecta errores añadidos ni resueltos. `yarn build` pasa, con avisos preexistentes de Browserslist/caniuse-lite, sintaxis CSS `.flex-[2]` y chunk principal sobre 500 kB. `git diff --check` pasa. No se pudo probar el formulario en navegador ni contra backend compatible; la validación manual queda para F.5.1.
- **Estado:** completada. F.4 no está completa; tras completar F.4.2, la siguiente subtarea exacta es F.4.3 XS — Alinear listados y asignaciones.

### F.4.2 S — Adaptar alta al registro permitido

- **Depende de:** F.4.1 y decisión F.1.2 sobre alta.
- **Trabajo:** no enviar rol a `POST /auth/register`; crear como `user` y retirar del alta la selección de roles. Cualquier cambio administrativo de rol se realiza después, de forma independiente, desde la edición existente.
- **Aceptación:** el formulario no permite elegir rol y el registro nunca incluye `role`, `roles` ni campos administrativos; la petición usa exclusivamente campos de `CreateUserDto`. La respuesta tipada refleja `role: "user"`. No se encadenan llamadas de alta y actualización de rol.
- **Resultado (completada el 2026-10-13):** se eliminó del modal el selector legacy y su estado `roles[]`; se informa que las cuentas nuevas se crean con rol User. El payload se tipa como `RegisterUserPayload` y contiene solo `email`, `username` y `password`. Se conservaron email requerido/formateado, username requerido y la validación de contraseña existente; el username exige los 4 caracteres mínimos del DTO y la contraseña limita entrada a 50 caracteres, además del mínimo y requisitos que ya comprobaba el formulario. El servicio ya declara la respuesta `RegisterUserResponse` con `role: "user"`. Tras la respuesta, el flujo existente vuelve a cargar usuarios, sincroniza la lista local y cierra el modal con mensaje de éxito. La edición administrativa de rol de F.4.1 queda independiente; no se añadió elevación automática ni se cambió el servicio administrativo.
- **Verificación:** revisión estática focalizada confirmó ausencia de selector/estado `roles[]` en el alta y payload exacto `{ email, username, password }`; el servicio conserva endpoint `/auth/register` (prefijo backend `/api`, ruta HTTP `/api/auth/register`) y respuesta tipada con `role: "user"`. Se confirmó el refresco del listado existente y que la edición posterior continúa enviando `{ role }` por su flujo independiente. `yarn vue-tsc --noEmit --project tsconfig.app.json --pretty false` deja **165 diagnósticos**, igual al baseline conocido, y ninguno señala `ManageUsers.vue`; `yarn build` y `git diff --check` pasan. No se ejecutó alta contra instancia backend compatible ni prueba visual/interactiva; quedan pendientes éxito/error HTTP y la interacción de edición para la regresión manual de F.5.1.
- **Estado:** completada. F.4 sigue pendiente; la siguiente subtarea exacta es F.4.3 XS — Alinear listados y asignaciones.

### F.4.3 XS — Alinear listados y asignaciones

- **Depende de:** F.2.1/F.2.3.
- **Trabajo:** adaptar `usersRv`, llamadas `/auth/usersRv` y `/auth/users/superusers`, `VersionKanban`, Kanban de playlists, asignaciones de listas/reuniones/calendario/contenido.
- **Aceptación:** todos los consumidores leen `role`; `/usersRv` conserva su significado (riffvalley y superadmin) y `/users/superusers` su filtro superadmin; paths no cambian.
- **Verificación:** inspeccionar selectores y responsables/asignados en cada vista nombrada; comprobar que no quedan tipos locales con `roles[]`.
- **Resultado (completada el 2026-10-13):** se comparte `UserListItem` y se tipa `/auth/usersRv` como `RvUser` con `role: "riffvalley" | "superadmin"`, y `/auth/users/superusers` como `Superuser` con `role: "superadmin"` exacto. Se conservaron los dos paths. Artículos, vídeos y ambos Kanban de playlists usan `RvUser`; el Kanban administrativo de versiones recibe `Superuser[]`. Se alinearon con el contrato compartido los consumidores de asignaciones y autores de listas, reuniones y calendario editorial, incluidos los modales que reciben `rvUsers`. No se añadió comparación jerárquica local ni se cambió autorización.
- **Imágenes y comportamiento:** `image: null` queda admitido en los tipos de listado. Al proyectar usuarios a los modelos locales de artículos, vídeos y playlists, `null` se convierte a `undefined`; las plantillas existentes ya muestran inicial/placeholder cuando no hay URL. Calendario y asignaciones conservan sus ramas visuales actuales para imagen ausente. Se conservaron los selectores, filtros, autores, responsables, IDs y payloads (`userId`, `editorId`, `coauthorId`); las operaciones y paths HTTP no cambian.
- **Verificación:** revisión estática focalizada de los siete grupos de consumidores, tipos de los dos contratos, paths, ausencia de `roles[]`/`.roles` en las vistas migradas y payloads de asignación. Typecheck explícito: **158 diagnósticos**, frente a los **165** previos; se resolvieron 7 diagnósticos de esta subtarea (contrato singular de versiones e imágenes nullable) y la comparación normalizada no detecta errores nuevos. Permanecen los 158 diagnósticos del baseline ya existentes, incluidos cuatro desajustes ajenos a roles/asignaciones de playlists sincronizadas (`SyncedFestivalPlaylist`/`SyncedGenrePlaylist` frente al modelo local con `content`) y los demás hallazgos de otras áreas; no se corrigieron por estar fuera de alcance. `yarn build` pasa con avisos de Browserslist obsoleto, selector CSS `.flex-[2]` y chunk principal superior a 500 kB; `git diff --check` pasa. No se añadieron ni ejecutaron tests ni se probó backend/navegador; la verificación interactiva queda en F.5.1.
- **Estado:** completada. F.4 queda completada tras F.4.1, F.4.2 y F.4.3; la siguiente subtarea exacta es F.5.1 S — Ejecutar matriz de regresión. F.5.1 no se inició.

## F.5 Regresión y limpieza

**Dependencia:** F.2–F.4 completadas.

### F.5.1 S — Ejecutar matriz de regresión

- **Depende de:** F.1.3 y F.2–F.4.
- **Trabajo:** cubrir login, restauración/logout, guards, navegación, controles visuales, administración, asignaciones, claims legacy y `401`/`403` para los cuatro roles canónicos.
- **Aceptación:** todos los casos pasan; collaborator conserva solo capacidades de user; rutas editoriales y administración coinciden con mínimos; los controles servidor rechazan las llamadas fuera de mínimo.
- **Verificación:** ejecutar suite disponible y `yarn build`; si se acordó baseline manual, adjuntar resultados por escenario. No afirmar cobertura automatizada donde no exista runner.
- **Resultado (completada el 2026-10-13):** revisión estática de autenticación, guards, menús, controles, administración y consumidores; comprobación directa de `hasMinimumRole()` en 30 combinaciones de rol/mínimo (**30/30 pasan**). `yarn vue-tsc --noEmit --project tsconfig.app.json --pretty false` mantiene **158 diagnósticos**, idénticos al baseline F.4.3 (0 nuevos, 0 resueltos); `yarn build` pasa con avisos registrados y `git diff --check` pasa. El usuario confirmó manualmente que probó el frontend en localhost con el backend migrado y considera satisfactoria la regresión funcional de F.5.1. No se encontró una regresión atribuible a la migración en la regresión estática.
- **Límite de confirmación manual:** la confirmación del usuario es global y no identifica escenarios concretos. No se le atribuyen pruebas individuales de login/respuestas HTTP, persistencia tras recarga, sesiones legacy, logout, `401`/`403`, redirecciones por rol, controles por cuenta, edición administrativa ni denegaciones del backend.
- **Diagnósticos y referencias:** los 158 diagnósticos actuales ya existían en la línea base; cuatro son incompatibilidades conocidas de tipos de playlists sincronizadas con el modelo local y el resto corresponde a hallazgos preexistentes de otras áreas. No se corrigieron. La búsqueda no halló aliases legacy activos en autorización; quedan usos `riffValley` de categorías/entidades/identidad de usuario, `roles` en limpieza y rechazo de sesión legacy y `User.roles[]` en Rates, sin evidencia de que sean roles Auth activos. Ver clasificación en [`roles-inventory.md`](roles-inventory.md).
- **Estado:** completada. La matriz se cierra con la evidencia estática disponible y la confirmación expresa del usuario de que la regresión funcional local es satisfactoria; no se deducen resultados para escenarios individuales que no detalló. La siguiente subtarea exacta es F.5.2 XS — Limpiar aliases y referencias obsoletas.

### F.5.2 XS — Limpiar aliases y referencias obsoletas

- **Depende de:** F.5.1.
- **Trabajo:** retirar accesores/valores antiguos (`roles[]`, `babyUser`, `superUser`, `riffValley`, `admin`) únicamente en usos de autorización confirmados; no tocar ARIA ni campos de dominio no relacionados.
- **Aceptación:** búsqueda global no encuentra usos Auth activos de nombres legacy; los casos excluidos quedan identificados por su semántica.
- **Verificación:** búsqueda final, typecheck/build y `git diff --check`.
- **Resultado (completada el 2026-10-13):** búsqueda contextual en el repositorio confirma que no quedan aliases ni arrays de roles Auth activos en guards, menús, controles, stores ni consumidores. Se actualizó `CLAUDE.md` para documentar el rol singular canónico, su jerarquía inclusiva y el uso de `hasMinimumRole()`. No se modificó lógica funcional porque no se encontraron usos de autorización que necesitaran migración.
- **Referencias conservadas por semántica:** la clave `localStorage.roles` se consulta/elimina para invalidar sesiones legacy; `src/services/rates/rates.ts` conserva un `roles: string[]` no Auth, sin consumidor frontend localizado ni evidencia de que sea parte del payload; `riffValley` sigue como categoría de listas, identidad de username y parte de nombres de entidad/playlist. Las menciones históricas en changelog/roadmap no son código activo. El término de la vista calendario reducida no representa un rol.
- **Verificación (2026-10-13):** búsquedas globales y contextuales no encontraron usos activos de `babyUser`, `superUser`, `admin`, `riffValley` como alias de autorización, ni conversiones/lecturas `roles[]` en Auth. `yarn vue-tsc --noEmit --project tsconfig.app.json --pretty false` mantiene **158 diagnósticos** (idénticos al baseline de F.4.3: 0 nuevos, 0 resueltos); `yarn build` y `git diff --check` pasan. Los hallazgos TypeScript previos permanecen sin corregir.
- **Estado:** completada. F.5 queda completa; no hay siguiente subtarea de migración de roles del frontend en este roadmap.

## Orden recomendado y dependencias

1. F.1.1 → F.1.2 → F.1.3: cerrar inventario, decisiones de compatibilidad y baseline.
2. F.2.1 → F.2.2 y F.2.3: fijar contratos singulares y sesión antes de migrar dependientes.
3. F.3.1 → F.3.2 → F.3.3: centralizar mínimos y luego alinear navegación/visibilidad.
4. F.4.1 → F.4.2 → F.4.3; F.4.3 puede avanzar al quedar listos los tipos/servicios.
5. F.5.1 → F.5.2: regresión antes de retirar referencias antiguas.

**Criterio de parada:** F.1.1, F.1.2 y F.1.3 completan F.1; F.2.1 XS, F.2.2 S y F.2.3 XS completan F.2; F.3.1 XS, F.3.2 S y F.3.3 S completan F.3; F.4.1 S, F.4.2 S y F.4.3 XS completan F.4; F.5.1 S y F.5.2 XS completan F.5. La migración PostgreSQL, el despliegue backend y cualquier ajuste de contrato quedan fuera de alcance.
