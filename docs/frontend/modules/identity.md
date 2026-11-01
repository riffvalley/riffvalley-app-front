# Identity

Esta página describe el ownership, las entradas públicas y los límites actuales del módulo implementado en `src/modules/identity/`. Para reglas generales de capas, dependencias y estado, consulta [Arquitectura del frontend](../architecture.md). La reorganización histórica y sus evidencias se conservan en [roadmap/identity-structure.md](../../../roadmap/identity-structure.md); las auditorías de comportamiento y sesiones, en [roadmap/identity-logic.md](../../../roadmap/identity-logic.md).

## Ownership actual

La raíz contiene cinco capacidades. Esta organización es la estructura vigente de Identity; no obliga a que los módulos futuros del frontend repitan estas carpetas.

| Capacidad | Responsabilidad y límites |
|---|---|
| **Auth** | Login, restauración, renovación, cierre de sesión y recuperación pública de contraseña; estado Pinia de sesión; protocolo HTTP de sesión y coordinación entre pestañas. El token de recuperación y los campos del formulario viven solo en la vista y no forman parte del estado Auth. Posee la identidad activa, pero no las preferencias de cuenta ni los datos administrativos remotos. |
| **Account** | Cambio de contraseña y preferencias de la propia cuenta, incluido el store persistido de configuración de dashboard. Auth puede aplicar las preferencias que recibe en el perfil, sin adquirir su ownership. |
| **Users** | API, contratos y administración de usuarios. Posee la consulta administrativa de usuarios y sus mutaciones; `getRvUsers`/`getSuperusers` y sus tipos también sirven a pantallas legacy consumidoras. No posee el feed ni las estadísticas de actividad. |
| **Activity** | Feed global de actividad, captura diaria de uso, estadísticas, detalle e inactividad; posee sus API, tipos y queries. Auth solicita la captura diaria y Users solicita la invalidación del dashboard mediante operaciones públicas de Activity. |
| **Shared** | Únicamente roles/permisos transversales de Identity: valores y tipo de rol, más la comparación de rol mínimo. No depende de otras capacidades ni es un destino genérico para código reutilizable. |

## Contratos públicos implementados

Los exports siguientes son exactamente los publicados por las entradas `index.ts` actuales. Los consumidores de producción de otros owners deben usar esas entradas, salvo las excepciones de composición descritas más abajo.

### Auth — [src/modules/identity/auth/index.ts](../../../src/modules/identity/auth/index.ts)

- `useAuthStore` y el tipo `AuthStore`, derivado del store, proporcionan el estado y las acciones de sesión a `main.ts`, `App.vue`, Router, `app/privateQueryCache.ts` y consumidores de UI legacy.
- `subscribeToRemoteAuthLogin`, `subscribeToRemoteAuthLogout` y `subscribeToRemoteAuthPermissionsChanged` permiten que `main.ts` reaccione a eventos de otras pestañas.
- `broadcastAuthPermissionsChanged` permite que `app/privateQueryCache.ts` notifique cambios de acceso efectivo.

El transporte `SessionAuthTransport`, el coordinador de locks/canal, `SessionAuthError`, tipos de protocolo y funciones de API son internos. Login, refresh, logout y restauración se exponen a la aplicación mediante acciones del store, no exportando las piezas de transporte.

### Account — [src/modules/identity/account/index.ts](../../../src/modules/identity/account/index.ts)

- `useDashboardPreferences` da acceso a las preferencias persistidas; lo consumen el Sidebar, `src/composables/useDashboardConfig.ts` y Auth al aplicar el perfil de sesión.
- `DashboardModuleConfig` es el tipo necesario para esa configuración y su integración legacy.

El store Pinia concreto y sus funciones de persistencia son privados para otros owners. Password Change pertenece a Account y puede usar internals de su misma capacidad.

### Users — [src/modules/identity/users/index.ts](../../../src/modules/identity/users/index.ts)

- `getRvUsers` y `RvUser` sirven a asignaciones y selectores de Articles, Content Calendar, listas, reuniones, playlists y vídeos.
- `getSuperusers` y `Superuser` sirven al flujo legacy de Version.
- `updateUserService` permite al store legacy `src/stores/user/users.ts` actualizar el perfil.
- `useAdminUsersQuery` y el tipo de resultado `AdminUser` permiten que Activity seleccione usuarios sin apropiarse de la consulta administrativa.

La API restante de administración, sus payloads salvo el tipo exportado `AdminUser`, `useAdminUserMutations` y las query keys se mantienen internos. User Management, que pertenece a Users, puede importarlos directamente dentro del owner.

### Activity — [src/modules/identity/activity/index.ts](../../../src/modules/identity/activity/index.ts)

- `notifyAppDailyActivity` es consumido por Auth después de login o restauración para registrar actividad diaria de la app; el fallo de esta captura es best effort y no debe fallar la sesión.
- `invalidateActivityDashboard(queryClient)` es consumido por las mutaciones de Users cuando una operación puede cambiar estadísticas. Encapsula la query key de Activity.

La API, los tipos, las query keys y los composables de consulta son privados para otros owners. En particular, `getGlobalActivity`, `GlobalActivityResponse` y `ActivityVote` pertenecen a Activity aunque el endpoint actual sea `/auth/activity`; el propietario lo determina el feed y sus consumidores, no el prefijo histórico de la ruta.

### Shared — [src/modules/identity/shared/index.ts](../../../src/modules/identity/shared/index.ts)

- `USER_ROLES` y `UserRole` definen los valores de rol compartidos por las capacidades de Identity y consumidores de la app.
- `hasMinimumRole` permite comprobar la jerarquía desde Router, Sidebar y pantallas que condicionan presentación o navegación.

La lista vigente es `user`, `collaborator`, `riffvalley`, `superadmin`, en orden de mínimo a máximo. `hasMinimumRole` compara esa jerarquía y rechaza valores desconocidos. Los tipos de login/sesión y los detalles de implementación de permisos permanecen en sus owners.

## Sesión y permisos

- **Inicio y restauración:** el login obtiene primero la prueba CSRF y negocia `refresh-v1`; Router espera `useAuthStore().initializeAuth()` antes de completar una navegación. La restauración intenta `refresh`, valida el usuario/rol y mantiene token de acceso y generación de sesión en memoria. Las credenciales persistidas heredadas se eliminan; el token no se guarda en localStorage.
- **Renovación y expiración:** el transporte sigue el protocolo `refresh-v1`. La restauración inicial y los 401 de peticiones autenticadas pueden renovar la sesión; `renewSession(generation)` comparte las renovaciones concurrentes de la misma tienda/generación y el cliente Axios vuelve a intentar la petición una vez. `expiresAt` se valida como parte de la respuesta de refresh; no se programa una renovación basada solo en un temporizador.
- **Cookies y persistencia:** el navegador gestiona la cookie HttpOnly de refresh, enviada con credenciales; JavaScript no lee ni escribe esa cookie. Las pruebas CSRF de sesión/logout sí se conservan en `localStorage` por origen, con migración best effort de valores antiguos de `sessionStorage`; no son tokens Bearer y el canal entre pestañas solo notifica su actualización.
- **Coordinación requerida:** refresh usa Web Locks para serializar el uso de la cookie/proof rotatoria entre pestañas y conserva deduplicación local por transporte. Sin Web Locks no hay fallback de refresh: la inicialización queda en error de coordinación; tras un 401 el estado local se limpia sin emitir logout remoto ni revocar la sesión del servidor.
- **Logout:** el store limpia primero el estado local y comunica el logout a las pestañas de la app; después intenta revocar la sesión remota. El resultado distingue revocación confirmada, sesión ya ausente y revocación no confirmada.
- **Errores de sesión:** una sesión ausente durante restauración se limpia como anónima. Fallos temporales, de red, protocolo o coordinación dejan un estado de error distinguible; Router bloquea la navegación protegida y mantiene Login accesible. Un `403` no renueva ni cierra sesión; los fallos `429`/`503` no deben interpretarse como logout confirmado. `Retry-After` se lee de forma best effort y puede no estar expuesto por CORS. Si la revocación remota falla, el logout local se mantiene y la UI puede indicar que el servidor no confirmó la revocación.
- **Comunicación entre pestañas:** el `BroadcastChannel` de Riff Valley transmite solo eventos de login/logout, cambio de permisos y actualización de proof CSRF; no comparte tokens ni perfil. Las pruebas de coordinación no sustituyen una verificación de navegador real.
- **Roles:** Shared publica `USER_ROLES`, `UserRole` y `hasMinimumRole` para la jerarquía inclusiva `user < collaborator < riffvalley < superadmin`; roles ausentes o desconocidos fallan cerrados. Router aplica `requiresAuth` y `requiresRole`, y vuelve a comprobar la ruta activa si cambia el rol durante la sesión. Esos guards y controles de interfaz gobiernan navegación/presentación; la autorización efectiva de cada endpoint corresponde al servidor.
- **Caché privada:** `src/app/privateQueryCache.ts` observa identidad, fin de sesión y cambio de acceso administrativo efectivo. Ante esos cambios cancela consultas y limpia la caché de Query; un cambio de permisos se comunica a las otras pestañas para que limpien y vuelvan a comprobar su sesión.
- **App y Wiki:** esta implementación y su canal pertenecen a Riff Valley App. Se mantiene la decisión de sesiones independientes entre App y Wiki; esta documentación no propone compartir store, renovación ni logout entre ambas aplicaciones.

Los detalles del protocolo, su contrato backend y las decisiones de operación están respaldados por [el código de Auth](../../../src/modules/identity/auth/stores/auth.ts), [el transporte](../../../src/modules/identity/auth/api/sessionAuth.ts), [el coordinador](../../../src/modules/identity/auth/api/sessionAuthCoordinator.ts), [el cliente HTTP](../../../src/services/api/api.ts) y las decisiones históricas de [sesiones renovables](../../../roadmap/renewable-sessions.md). Esta página resume sus contratos vigentes; no sustituye ese registro detallado.

## Estado y consultas

- **Pinia:** Auth mantiene sesión y estado de cliente asociado. Account mantiene las [preferencias persistidas](../../../src/modules/identity/account/preferences/stores/dashboardPreferences.ts) de dashboard (`dashboardButtonsEnabled`, configuración desktop y móvil), separadas del ciclo de sesión aunque Auth las aplique desde el perfil recibido.
- **TanStack Query:** Users posee el [listado administrativo](../../../src/modules/identity/users/composables/useAdminUsersQuery.ts) y sus mutaciones; Activity posee el [dashboard de estadísticas](../../../src/modules/identity/activity/composables/useActivityStatisticsQueries.ts), listado/detalle de actividad, inactividad y el feed global paginado. Las queries administrativas incluyen identidad/generación en sus claves, verifican permisos y sesión vigente y pasan `AbortSignal` al API cuando corresponde.
- **API de Users:** las [funciones HTTP](../../../src/modules/identity/users/api/users.ts) implementan el transporte de Users. Los endpoints administrativos y payloads son internos; la superficie publicada contiene solo servicios/tipos que tienen consumidores comprobados y el composable de listado consumido por Activity.
- **API y dashboard de Activity:** la [API](../../../src/modules/identity/activity/api/activity.ts) adapta el feed legacy `/auth/activity` y las consultas de estadísticas e inactividad. `useActivityStatisticsQueries` y `useActivityInactivityQuery` organizan el server state; la key del dashboard incluye filtros y contexto de sesión.
- **Invalidación Users → Activity:** después de mutaciones exitosas y de confirmar que la misma sesión sigue activa, Users llama a `invalidateActivityDashboard`. La key y la política de consulta siguen siendo de Activity; Users no importa el composable ni la key privada.
- **Preferencias de Account:** `useDashboardPreferences` entrega el store de Account a Sidebar, configuración legacy del dashboard y Auth. La persistencia local se maneja allí, no en Auth ni en Query.

El almacenamiento local de Preferences es best effort: si `localStorage` no está disponible, Pinia mantiene las preferencias en memoria durante la sesión. La sincronización del editor con Users conserva una cola y una revisión por instancia de store; un fallo HTTP revierte la última edición vigente al último valor confirmado por el servidor. Stores de pestañas distintas no comparten esa cola. El detalle de implementación vive en [useDashboardConfig](../../../src/composables/useDashboardConfig.ts) y los resultados de corrección en I1-12.11.8/.10 del roadmap histórico.

Al perder el permiso `superadmin` durante una sesión, User Management limpia sincrónicamente su snapshot editable, selección y diálogos; la query comprueba el permiso después del fetch. Esto complementa la limpieza común de caché descrita arriba y no requiere cambiar la generación de sesión. La regresión y sus pruebas están registradas en I1-12.11.1–.3 y la sección 12 del roadmap.

La configuración compartida de Query y la regla general de no duplicar server state en Pinia están en [Arquitectura del frontend](../architecture.md). Aquí quedan solo la distribución y los cruces específicos que existen en Identity.

## Dependencias, excepciones y límites

La matriz productiva vigente, aplicada por [scripts/check-identity-boundaries.mjs](../../../scripts/check-identity-boundaries.mjs), es:

| Owner origen | Owners destino permitidos |
|---|---|
| Auth | Account, Activity, Shared |
| Account | Auth, Shared |
| Users | Auth, Activity, Shared |
| Activity | Auth, Users, Shared |
| Shared | Ninguno |

Los imports entre archivos del mismo owner son internos y válidos. Para cruces entre owners se usa `index.ts`; un import profundo a `api/`, `stores/`, `composables/`, `types/` o `utils/` de otro owner es privado y no debe introducirse en producción.

Excepciones delimitadas:

- `main.ts`, `App.vue` y `app/privateQueryCache.ts` componen la aplicación y consumen contratos públicos. Su rol de composition root no habilita imports privados.
- `src/router/index.ts` importa directamente las vistas/layouts de Identity necesarios para declarar rutas, incluidas Login, Password Change, Recovery, User Management y Activity. La excepción se limita a esos archivos de presentación enumerados en el gate; Router consume Auth y Shared mediante sus entradas públicas.
- Tests del owner pueden importar internals para probar la implementación. Tests externos también pueden hacerlo cuando prueban deliberadamente un detalle concreto de integración o un sujeto aún legacy; se clasifican como tests y no como excepción de producción.

Auth y Activity forman una **dependencia conceptual bidireccional**: Auth llama a Activity para la captura diaria y las consultas de Activity usan el estado Auth. Eso no equivale a un ciclo de imports runtime. El resultado local registrado en FQ-3.5.4 reportó un ciclo type-only en servicios legacy fuera de Identity y ningún ciclo runtime; la comparación incremental quedó informativa por un edge irresuelto en el grafo base. No se presenta como una comprobación nueva de esta tarea ni como validación remota.

El gate de límites se aplica solo a Identity y solo bloquea nuevos edges de producción cuando la base y el grafo actual son completos. Los imports legacy de otras áreas no tienen ownership clasificado por este gate. Se mantienen como trabajo de migración, no como deudas cerradas.

## Contexto histórico conservado

- [roadmap/roles.md](../../../roadmap/roles.md) conserva la migración del contrato de rol singular; [roadmap/roles-inventory.md](../../../roadmap/roles-inventory.md) conserva la baseline y la matriz de regresión, incluidas verificaciones manuales pendientes de su época.
- [roadmap/renewable-sessions.md](../../../roadmap/renewable-sessions.md) conserva las decisiones y evidencias del rollout `refresh-v1`, así como limitaciones operativas y la planificación independiente de Wiki.
- [roadmap/identity-structure.md](../../../roadmap/identity-structure.md) conserva las decisiones y tareas I1-11 de reorganización, sus inventarios y resultados. La estructura canónica actual se resume aquí.
- [roadmap/identity-logic.md](../../../roadmap/identity-logic.md) conserva auditorías, excepciones y verificaciones I1-12; no es una segunda especificación de ownership.
- [roadmap/frontend-quality.md](../../../roadmap/frontend-quality.md) registra FQ-2 y las implementaciones locales FQ-3.5.1–3.5.4, incluidos consumidores, exports, matriz y límites del gate.
