# Roadmap: sesiones renovables (BC-ID-7)

**Estado:** BC-ID-7.1 a BC-ID-7.6 completadas el 2026-10-22. La migración de App está publicada y validada en producción; el siguiente bloque es BC-ID-8 — Migración de Wiki.

> **Lectura actual (FQ-6.5):** este roadmap conserva el contrato consultado, las decisiones y evidencias del rollout de App. El comportamiento vigente de sesión de App se resume en la [documentación canónica de Identity](../docs/frontend/modules/identity.md). App y Wiki mantienen sesiones independientes; la fase BC-ID-8 mencionada abajo es planificación histórica, no parte de FQ-6.5.

**Objetivo:** registrar el cierre de la migración de sesión de App al protocolo `refresh-v1`, conservando el JWT de acceso solo en memoria y delegando la cookie HttpOnly al navegador.

**Alcance:** frontend principal Vue 3 + TypeScript + Pinia + Vue Router. No incluye cambios en backend ni Wiki, despliegues, cambios de rutas/permisos ni modificaciones de `.impeccable/config.json`.

**Contrato verificado para Identity:** DTO, controller, pruebas HTTP de `src/identity/auth` y contrato de `roadmap/backend-cleanup/identity-session-contracts-and-rollout.md` en el checkout backend. `GET /api/auth/csrf` devuelve `{ csrfToken }` y establece `__Secure-rv_login_csrf_nonce` con `HttpOnly; Secure; SameSite=Lax; Path=/api/auth` y vigencia de 10 minutos. `POST /api/auth/login` conserva `{ username, password }`, recibe `X-Auth-Session-Mode: refresh-v1` y `X-CSRF-Token`, y devuelve perfil plano más `token`, `csrfToken` y `logoutCsrfToken`; `POST /api/auth/refresh` requiere `{}`, modo, `X-Refresh-Operation` UUID v4 y CSRF de sesión y devuelve `{ user, token, csrfToken, logoutCsrfToken, expiresAt }`; `POST /api/auth/logout` requiere `{}` y CSRF de logout, y devuelve `204`. Las cuatro solicitudes deben incluir credenciales del navegador. Refresh se entrega solo mediante cookie host-only `__Secure-rv_app_refresh` o `__Secure-rv_wiki_refresh`, `HttpOnly; Secure; SameSite=Lax; Path=/api/auth`; el navegador gestiona `Set-Cookie`. `X-RV-Session-Edge` es infraestructura privada y no lo envía el frontend. El JWT dura 15 minutos y la cookie vence como máximo a los 30 días absolutos. `AUTH_SESSION_MODE_ENABLED` está activo en producción según el contexto de BC-ID-7.2.

## Inventario BC-ID-7.1

### Flujo actual

1. `LoginPage.vue` toma usuario y contraseña y llama `authStore.login()`.
2. `services/auth/auth.ts` hace `POST /auth/login` por el Axios compartido y tipa la respuesta con `token`, `id`, `username`, `role` y preferencias opcionales.
3. `stores/auth/auth.ts` valida el rol, guarda el JWT y los datos de usuario en Pinia y `localStorage`, y escribe `Authorization` en los defaults de Axios. También carga el token y el perfil desde `localStorage` al inicializar el store.
4. `services/api/api.ts` vuelve a adjuntar Bearer desde Pinia a cada llamada hecha con el cliente común. Ante cualquier `401`, cierra la sesión local y navega a Login. Ante `403`, muestra un aviso global evitando duplicar un aviso de la vista. No hay tratamiento común para `429` o `503`.
5. El guard de `router/index.ts` decide autenticación por la presencia de `authStore.token` y conserva los mínimos de rol existentes. `main.ts` instala Pinia y Router sin esperar una restauración remota. `App.vue` carga el catálogo al montar.
6. `logout()` solo limpia el estado local y las claves de almacenamiento; no llama al backend. No hay llamada frontend a CSRF, refresh ni logout.

### Persistencia y dependencias del estado

- El JWT se escribe y restaura en `localStorage.token`; username, userId, image y role también se guardan allí. Dashboard config y opciones se persisten por separado. `PasswordChange.vue` lee `localStorage.image` como fallback.
- El estado consumido por componentes incluye `isAuthenticated`, `loggedUser`, `username`, `userId`, `image`/`avatarUrl`, `role`, `dashboardButtonsEnabled`, `dashboardConfig` y `mobileDashboardConfig`. No se encontraron consumidores funcionales del JWT fuera del store y el cliente HTTP.
- El usuario y el rol alimentan guards, visibilidad de menús/controles y funciones de varias vistas (por ejemplo dashboard, calendario, calendario editorial, asignaciones, playlists, artistas y recap). La migración debe conservar las formas de esos getters/estado y no cambiar los mínimos de `router/index.ts`, `routes.json` ni `helpers/roles.ts`.
- Claves actuales de sesión: `token`, `username`, `userId`, `image`, `role`, `roles`, `dashboardButtonsEnabled`, `dashboardConfig` y `mobileDashboardConfig`. La limpieza de JWT/perfil al migrar debe evitar borrar preferencias locales ajenas a la credencial sin decisión explícita.

### Módulos y llamadas directas

| Área | Archivos actuales | Papel y previsión de cambio |
| --- | --- | --- |
| Login y DTOs Identity | `src/views/loginPage/LoginPage.vue`, `src/services/auth/auth.ts`, `src/interfaces/auth.ts` | Formulario y contrato actual de login; centralizar aquí los DTOs de protocolo sin convertir la vista en cliente HTTP. |
| Estado de sesión | `src/stores/auth/auth.ts` | Fuente de estado de usuario y credencial; transición de persistencia a memoria y restauración asíncrona. |
| HTTP | `src/services/api/api.ts` | Inyección Bearer y respuesta global 401/403; coordinación de refresh y política de errores. |
| Arranque/navegación | `src/main.ts`, `src/App.vue`, `src/router/index.ts` | Orden de restauración frente al primer guard y las primeras llamadas autenticadas; conservar paths y metadatos actuales. |
| Perfil y preferencias | `src/views/password/PasswordChange.vue` y consumidores de `useAuthStore()` en vistas, menú y componentes | Mantener acceso al perfil/preferencias; eliminar únicamente dependencias de la persistencia del JWT. |
| Pruebas existentes | `src/router/importPermissions.test.ts`, `src/layouts/default/components/SidebarMenuPermissions.test.ts` | Regresión de guards/visibilidad. No hay pruebas actuales del store Auth, servicio login, interceptor ni ciclo de sesión. |

Las únicas llamadas de sesión frontend localizadas son `POST /auth/login` en `src/services/auth/auth.ts`. `src/services/users/users.ts` llama a `/auth/register` y a rutas administrativas `/auth/...`; son operaciones de usuarios, no login/refresh/logout. No se encontraron llamadas directas de login fuera del servicio Identity ni usos directos de JWT fuera de Auth/API. El cliente aislado de publicaciones nacionales y llamadas de terceros no participa en la sesión común.

### Arquitectura de capas a preservar

- **Presentación:** `LoginPage.vue` expresa formulario/estados de interacción; no conoce cookie, CSRF, headers ni Axios.
- **Aplicación:** acciones del store coordinan login, restauración y logout y mantienen usuario/estado de sesión compatibles con sus consumidores.
- **Dominio/contratos:** roles y tipos de usuario permanecen en `src/interfaces/auth.ts`; se añadirán tipos de protocolo solo cuando coincidan con el contrato verificado.
- **Infraestructura:** servicios Identity y cliente HTTP contienen transporte, `credentials: 'include'`, CSRF, cabeceras y retry. La cookie refresh nunca se lee desde JavaScript.
- **Navegación:** guard conserva rutas públicas, paths y jerarquía. Solo debe esperar un estado de restauración explícito antes de decidir sobre una ruta protegida.

## Política objetivo a fijar en implementación

- El access JWT vive solo en memoria (store/runtime); no se escribe en localStorage, sessionStorage, Pinia persistente ni logs. Refresh token solo cookie administrada por backend/navegador.
- Las solicitudes de login/CSRF/refresh/logout usan `credentials: 'include'` para que el navegador gestione la cookie; el bearer solo se añade a solicitudes de recursos que lo necesiten. No se usa `/api/auth/session`.
- Login obtiene/aplica CSRF según el contrato, manda `X-Auth-Session-Mode: refresh-v1` y guarda en memoria el access JWT y el perfil devuelto.
- Restauración al cargar llama a refresh una vez y reconstruye el estado del store desde la respuesta definida por backend. El backend no ofrece `/me` ni `/session`; el contrato de refresh debe aportar los datos necesarios o definir una fuente válida para ellos antes de programar.
- Un único `Promise` de refresh compartido resuelve los 401 concurrentes. Cada petición original se reintenta como máximo una vez; no se renuevan las propias llamadas de auth ni se crean bucles.
- `401`: una petición de recurso inicia/espera refresh. Si refresh responde 401, se limpia el estado local y se redirige a Login. `403`: no renueva ni cierra sesión; mantiene denegación y aviso actual. `429`: no borra la sesión ni reintenta en bucle; conserva y expone `Retry-After`/fallo temporal. `503`: conserva la cookie y evita presentarlo como logout confirmado; permite nueva recuperación cuando el servicio vuelva. Si refresh devuelve 429/503, no marcar al usuario como anónimo ni redirigir automáticamente a Login.
- Logout intenta revocar con backend usando CSRF/credenciales del contrato y limpia siempre el access JWT local. Si el servidor no confirma revocación, debe quedar visible el fallo y la sesión del servidor no puede considerarse revocada; definir esta respuesta UX antes de implementación.

## Subtareas

### BC-ID-7.1 XS — Inventario y plan de migración

**Estado: completada el 2026-10-22.**

- **Objetivo:** documentar el flujo actual, persistencia, dependencias, contratos conocidos y secuencia incremental antes de modificar código.
- **Alcance:** inspección de Auth, HTTP, guards, bootstrap, llamadas directas, capas y pruebas; actualizar índice y este roadmap. Sin cambios funcionales.
- **Depende de:** ninguna.
- **Criterios de aceptación:** inventario de fuentes de verdad y consumidores; endpoints directos identificados; límites del contrato explícitos; tareas posteriores con dependencias, aceptación y pruebas.
- **Pruebas/verificación:** revisión estática de `src` y roadmaps; `yarn test` pasa con 15 archivos y 59 pruebas; `git diff --check` pasa. No hay cobertura Auth específica; no se ejecutó build porque no se modificó código.

### BC-ID-7.2 S — Cerrar contrato Identity y transporte de autenticación

**Estado: completada el 2026-10-22.** El transporte aislado está en `src/services/auth/sessionAuth.ts`; el login legacy y sus interceptores siguen siendo los usados por la App.

- **Objetivo:** fijar DTOs y un transporte pequeño para CSRF, login, refresh y logout que coincida exactamente con Identity.
- **Alcance:** contrastar nombres/formato CSRF, respuestas de login/refresh, comportamiento de cookie, logout idempotente y errores; aislar llamadas de sesión con credenciales incluidas y marcar que el login usa `refresh-v1`. No integrar renovación general de Axios ni alterar rutas/permisos.
- **Depende de:** BC-ID-7.1; contrato verificable del backend disponible para frontend.
- **Resultado:** `SessionAuthTransport` usa una instancia Axios separada sin interceptores legacy. Cada solicitud de sesión incluye `withCredentials: true`; bootstrap no añade `Content-Type`; POST envía JSON. Login obtiene bootstrap CSRF antes de negociar `refresh-v1`. Inicialmente Refresh mantenía CSRF en memoria y `sessionStorage`; el hotfix BC-ID-7.6 los comparte en `localStorage` por origen y migra los valores antiguos al cargarlos. El transporte los relee bajo Web Lock antes de refresh/logout; BroadcastChannel solo emite una notificación sin los valores. Las pruebas CSRF no son credenciales bearer. Refresh manda UUID v4 y body `{}`; logout usa CSRF de logout y exige 204. Los cuerpos se validan contra DTO y rol reconocidos. Errores se convierten a `SessionAuthError` con categorías/status y lectura best-effort de `Retry-After`; no se registran ni se almacenan password, access JWT o refresh token. El código no accede a `Set-Cookie`. No se modificó el servicio legacy, store, router, guards ni cliente HTTP común.
- **Criterios de aceptación:** tipos sin campos inventados; llamadas a auth no filtran bearer; credenciales incluidas donde exige la cookie; no se lee/escribe token refresh desde JS; paths/métodos exactos; sin dependencia nueva. Cumplidos.
- **Pruebas:** `yarn test src/modules/identity/api/sessionAuth.test.ts`: 8/8; `yarn test`: 16 archivos, 67 pruebas aprobadas; `yarn build`: aprobado; `git diff --check`: aprobado. Mocks Axios cubren bootstrap/login, refresh después de reconstruir el transporte (CSRF por pestaña), logout 204, headers, credenciales, ausencia de Bearer y access/refresh token en almacenamiento, UUID inválido, respuestas malformadas, errores 401/403/429/503 y ausencia de logs.

### BC-ID-7.3 M — Estado de sesión en memoria y restauración inicial

**Estado: completada el 2026-10-22.**

- **Objetivo:** guardar el access JWT renovable solo en memoria y reconstruir la sesión de App mediante refresh al arrancar.
- **Alcance:** store Auth y perfil en memoria; limpieza controlada de claves legacy al confirmar sesión renovable o ausencia definitiva; mantener preferencias no credenciales; exponer estados `initializing`, `authenticated`, `anonymous` y error temporal; coordinar App/guard para esperar refresh y bloquear vistas y llamadas prematuras. El legacy sigue operativo ante un refresh 401 mientras exista su JWT legacy.
- **Depende de:** BC-ID-7.2 y confirmación de que refresh entrega datos suficientes de perfil/rol sin `/me` o `/session`.
- **Criterios de aceptación:** refresh al iniciar restaura el usuario anidado, rol, preferencias y JWT en Pinia; ningún JWT renovable se persiste; preferencias locales se conservan; una única llamada de bootstrap sirve a guards concurrentes; el guard no redirige antes de resolver refresh; 401 definitivo limpia la sesión local y las pruebas CSRF locales; 429/503/red/errores de contrato quedan reintentables; Login legacy sigue accesible; rutas y permisos no cambian. Cumplidos.
- **Resultado:** `authStatus` y `sessionMode` distinguen estado y procedencia; refresh restaura desde `user` y limpia claves de credencial legacy, manteniendo preferencias; CSRF de sesión se elimina al recibir 401 definitivo. La promesa compartida cubre solo la inicialización de Auth al arrancar; no coordina refreshes por expiración o respuestas 401 de recursos (7.4). El guard espera inicialización, cancela navegación protegida ante fallo temporal y conserva la ruta actual; App no monta Sidebar, vistas ni catálogo antes de resolver Auth y ofrece reintento o acceso al login legacy. No se tocó el interceptor global ni se añadió renovación general.
- **Pruebas:** `yarn test`: 18 archivos, 77 pruebas aprobadas; suites focalizadas de store, arranque/guard, permisos y transporte incluidas. `yarn build`: aprobado; `git diff --check`: aprobado. Se cubren refresh válido y anidado, almacenamiento solo en memoria, preferencias, fallback legacy 401, sesión anónima, error temporal con reintento, guard que espera/cancela y refresh inicial compartido. Cumplidos.

### BC-ID-7.4 M — Renovación compartida e interceptor HTTP

**Estado: completada el 2026-10-22.**

- **Objetivo:** renovar en expiración y reintentar solicitudes concurrentes de forma segura.
- **Alcance:** coordinador de refresh único y retry acotado en `services/api/api.ts`; exclusión de endpoints de sesión y peticiones ya reintentadas; política diferenciada para 401/403/429/503; barrera de generación para descartar refresh tardío tras logout o sustitución de sesión. Las sesiones legacy conservan su tratamiento 401 hasta el corte de BC-ID-7.5.
- **Depende de:** BC-ID-7.2 y BC-ID-7.3.
- **Criterios de aceptación:** N respuestas 401 concurrentes originan una llamada refresh; cada petición elegible se reintenta una sola vez con token nuevo; 401 definitivo de refresh limpia y redirige una vez; 403 no refresca; 429/503/red preservan sesión y se propagan sin reintento automático en bucle; `Retry-After` permanece disponible en el error de transporte cuando CORS lo expone; un refresh tardío no restaura una sesión cerrada o reemplazada. Cumplidos.
- **Resultado:** el interceptor borra cualquier Authorization entrante y lo obtiene solo del store en memoria. Los endpoints `/auth/csrf`, `/auth/login`, `/auth/refresh` y `/auth/logout` quedan excluidos de Bearer/reintento; el interceptor legacy de 401 se reemplazó por refresh compartido para sesiones renovables. Las peticiones simultáneas esperan una sola promesa por generación; respuestas 401 tardías reusan el token ya renovado. Un segundo 401 cierra esa sesión; 401 legacy conserva el comportamiento anterior hasta 7.5. 403 mantiene aviso; fallos de refresh 429/503/red se propagan y no cierran sesión. La generación de sesión descarta respuestas tardías si hubo logout o nuevo login.
- **Pruebas:** `yarn test`: 19 archivos, 88 pruebas aprobadas; `yarn build`: aprobado; `git diff --check`: aprobado. Pruebas del cliente cubren concurrencia, respuesta 401 tardía, éxito y reintento acotado, refresh 401, 403, fallos 429/503/red, exclusión del login y carrera con logout/nuevo login.

### BC-ID-7.5 S — Logout revocable y UX de errores de acceso

**Estado: completada el 2026-10-22.** La App usa exclusivamente `refresh-v1`; el backend mantiene el login legacy para Wiki.

- **Objetivo:** sustituir el login y logout legacy por sesiones renovables y retirar el almacenamiento persistente de credenciales de App.
- **Alcance:** login `refresh-v1` desde `LoginPage.vue`; estado de usuario y JWT en memoria; preferencias de dashboard locales; logout con revocación remota, invalidación inmediata de generación y navegación a Login; errores de acceso visibles; limpieza de consumidores y ramas legacy de App. Se mantienen las rutas, roles y permisos. Backend y Wiki no cambian.
- **Depende de:** BC-ID-7.2, BC-ID-7.3 y BC-ID-7.4; decisión de corte directo aceptada para App.
- **Criterios de aceptación:** Login usa bootstrap CSRF y negociación `refresh-v1`, reconstruye el perfil plano y mantiene access JWT solo en memoria; refresh de arranque y renovación automática siguen operativos; logout invalida generación antes de la petición remota, limpia estado y navega a Login; respuesta logout 401 se considera sesión ya ausente; 403/429/503/red informa que Identity no confirmó revocación; no se confirman revocaciones fallidas; se purgan JWT/perfil legacy y se conservan preferencias; no hay rutas, roles o permisos alterados ni credenciales en logs/almacenamiento.
- **Resultado:** el store y `LoginPage.vue` usan solo `sessionAuthTransport`; se eliminó el login legacy de `services/auth/auth.ts` y el modo de sesión `legacy`. JWT, perfil y rol no se escriben en storage; al inicializar se purgan claves antiguas y solo permanecen preferencias no credenciales. `PasswordChange.vue` lee el avatar desde el store. Logout limpia estado e incrementa la generación sincrónicamente, luego espera la revocación Identity; la UI reemplaza ruta por Login y advierte si la revocación no se confirmó. El interceptor ya no tiene tratamiento de sesión legacy; si el segundo 401 exige abandonar una sesión, informa también un fallo de revocación. No se cambió backend ni Wiki.
- **Pruebas:** pruebas focalizadas: 4 archivos, 35 pruebas aprobadas; `yarn test`: 20 archivos, 96 pruebas aprobadas; `yarn build`: aprobado; `git diff --check`: aprobado. Cubren contrato y CSRF de transporte, logout tras refresh concurrente, sesión en memoria, purga de credenciales antiguas, restauración, errores de logout 401/403/429/503/red, fencing de refresh tardío, reintento HTTP y navegación/mensaje del logout. El build conserva avisos de Browserslist, CSS `.flex-[2]` y tamaño de chunks.

### BC-ID-7.6 M — Regresión de ciclo de vida y preparación de rollout

**Estado: completada el 2026-10-22.** La incidencia multipestaña se reprodujo en pruebas: una pestaña nueva compartía la cookie HttpOnly, pero no la prueba CSRF guardada en `sessionStorage`; `refresh()` fallaba antes de llegar a Identity y mostraba el error genérico. Además, la notificación asíncrona podía llegar después de adquirir el Web Lock. El hotfix comparte las pruebas CSRF en `localStorage` por origen, las relee dentro del Web Lock antes de refresh/logout y limita el canal a notificar cambios; ningún mensaje transmite CSRF, JWT ni cookies. Las operaciones de Identity tienen timeout de 15 s y la espera del Web Lock queda acotada a 30 s. La validación manual del usuario en producción confirmó la restauración y coordinación entre pestañas, el logout propagado y la pantalla de error mejorada.

- **Objetivo:** validar el recorrido completo y habilitar un despliegue frontend incremental controlado.
- **Alcance:** regresión de login, expiración, concurrencia en pestaña y entre pestañas, reload, permisos, logout, sesión de App y compatibilidad con el despliegue de Identity; documentar orden de release y rollback de Netlify para el corte directo ya decidido, sin feature flags ni coexistencia de mecanismos en App. No incluye despliegue ni cambio backend/Wiki.
- **Depende de:** BC-ID-7.2 a BC-ID-7.5.
- **Criterios de aceptación:** checklist cubre cookies cross-origin (`app.riffvalley.es` a `backend.riffvalley.es`), CSRF, credenciales, 15 minutos, duración absoluta, recuperación y expiración/revocación; se mantienen paths/permisos; se documenta orden de releases y rollback de Netlify; una pestaña nueva recupera CSRF compartido, refresh concurrente usa la prueba rotada tras el lock, logout se propaga y los mensajes no llevan pruebas ni credenciales. Producción validada por el usuario.
- **Verificación local y producción:** la regresión reprodujo el fallo al abrir una pestaña sin `sessionStorage` propio y pasó al leer la prueba CSRF compartida. Pruebas adicionales cubren rotación entre dos transportes concurrentes con `BroadcastChannel` diferido, retry tras 503, timeout/liberación del lock, logout/mensajes sin pruebas y restauración repetida desde el store. Suite focalizada: 4 archivos, 34 pruebas aprobadas. `yarn test`: 18 archivos y 98 pruebas aprobadas. `yarn build`: aprobado, con avisos previos de Browserslist, CSS `.flex-[2]` y tamaño de chunks. `git diff --check`: aprobado. Las verificaciones HTTP del backend confirman CORS con credenciales para `https://app.riffvalley.es`, cookies HttpOnly/Secure/SameSite=Lax, headers requeridos y resultado 200/401 ante refresh concurrente sin coordinación. En producción el usuario verificó login renovable, restauración al recargar, refresh tras 15 minutos, acceso a rutas protegidas, coordinación y logout entre pestañas, y la pantalla de error de restauración.

#### Procedimiento Netlify

1. Antes de publicar, confirmar en el sitio Netlify de App que el directorio base es la raíz del repositorio, el comando de build es `yarn build`, el directorio de publicación es `dist` y `VITE_API_BASE_URL` tiene el valor `https://backend.riffvalley.es/api`. No hay `[build]` en `netlify.toml`; el archivo actual solo conserva la regla SPA que redirige rutas a `/index.html`. Netlify documenta estos campos en [Build configuration](https://docs.netlify.com/build/configure-builds/overview/).
2. Después de integrar el cambio en la rama de producción ya configurada en Netlify, esperar el deploy de producción y confirmar que termina en estado Published para el dominio `app.riffvalley.es`. En BC-ID-7 se publicó y validó con las pruebas reales enumeradas arriba. No cambiar variables de backend ni habilitar flags.
3. En un perfil de navegador de prueba, comprobar login y Network: `GET /api/auth/csrf`, `POST /api/auth/login` con `X-Auth-Session-Mode: refresh-v1`, `X-CSRF-Token` y credentials; comprobar cookie `__Secure-rv_app_refresh` como HttpOnly, Secure, SameSite=Lax y Path `/api/auth`. No debe haber JWT, perfil ni refresh token en almacenamiento; `localStorage` puede contener solo las dos pruebas CSRF de sesión compartidas entre pestañas, y las claves antiguas de `sessionStorage` se migran/eliminan.
4. Recargar y comprobar `POST /api/auth/refresh`, que el perfil vuelve desde `user` y que la navegación protegida espera la restauración. Dejar expirar el JWT de acceso (15 minutos) y comprobar una única renovación por pestaña y reintento acotado; repetir simultáneamente en dos pestañas y confirmar que no aparece el 401 de reutilización del backend ni se invalida la cookie.
5. Comprobar un permiso insuficiente (403, sin refresh), un `401` definitivo, y fallos `429`/`503` sin logout silencioso. Cerrar sesión en una pestaña: debe llamar a logout, recibir 204 y llevar las otras pestañas a Login; comprobar que una renovación posterior no restaura la sesión. Si logout falla por red/429/503, confirmar que la App informa que la revocación no está confirmada.
6. Para rollback, en Netlify abrir **Deploys**, elegir el último deploy exitoso anterior a esta migración y usar **Publish deploy** en su detalle. Verificar después el dominio y un login legacy solo si ese build previo aún corresponde a una versión compatible. Si el sitio tiene auto-publishing, evitar que otro deploy automático reemplace el rollback antes de decidir el siguiente paso. Netlify describe la operación en [Manage deploys](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/).

## Riesgos y dependencias

1. **Perfil al restaurar:** no existe endpoint `/auth/session` ni `/auth/me`; el contrato confirmado de refresh entrega `user` anidado con identidad, rol y preferencias. No derivar estado sensible únicamente decodificando claims.
2. **CSRF:** el transporte usa bootstrap antes de login y conserva las pruebas anti-forgery rotadas por sesión; `SameSite=Lax` por sí solo no sustituye ese contrato.
3. **CORS/cookies cross-origin:** Netlify app y backend son orígenes distintos; el transporte requiere `credentials: 'include'` y CORS del backend compatible con el origen exacto. La política backend se valida, no se modifica en este roadmap.
4. **Bootstrap:** la renovación asíncrona se coordina con el guard y el montaje de `App.vue`; el store comparte la inicialización y evita llamadas protegidas antes de resolverla.
5. **401 globales:** endpoints protegidos pueden responder 401 por causas distintas a expiración; renovar una vez y nunca ante 403 evita convertir denegaciones de rol en refresh loops.
6. **Transición legacy:** App purga JWT/perfil persistidos y conserva preferencias locales; backend mantiene el protocolo legacy para Wiki. Rollback de frontend es por build de Netlify y requiere reautenticación, nunca almacenar access/refresh.
7. **Logout offline:** el cierre local no garantiza revocación si backend no responde; distinguir el resultado en UX y permitir que la cookie sea revocada por el backend al recuperar conectividad.
8. **`Retry-After` en navegador:** el backend envía el header en 429, pero el CORS actual no lo declara en `Access-Control-Expose-Headers` (la prueba HTTP integrada confirma que no expone headers). Axios en navegador puede por tanto no poder leerlo; el cliente tolera que falte y preserva la sesión.
9. **CSRF y pestañas:** las pruebas CSRF de sesión se comparten en `localStorage`; BroadcastChannel solo notifica cambios y logout/login, y Web Locks serializa mutaciones. El fallback sin Web Locks ejecuta localmente y no garantiza coordinación entre pestañas; la coordinación quedó validada en producción en los navegadores usados por el usuario.

## Cierre BC-ID-7 y siguiente fase

App utiliza exclusivamente `refresh-v1` para login, restauración, renovación y logout; no conserva consumidores funcionales del login legacy. El access JWT permanece únicamente en memoria y la renovación se apoya en la cookie HttpOnly administrada por el navegador. El servicio `src/services/auth/auth.ts` conserva operaciones de usuarios y tipos usados por otras áreas, pero no realiza login.

El procedimiento de rollback de Netlify se mantiene en esta página. BC-ID-7 queda cerrada tras la validación real de producción confirmada por el usuario. La siguiente fase es **BC-ID-8 — Migración de Wiki**; esta tarea no inicia ese trabajo.
