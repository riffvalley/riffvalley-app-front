# Organización funcional de Identity

**Estado:** I1-11b.1–.8 completadas el 2026-10-25; I1-11b queda cerrada tras la revisión estructural final. I1-11a.1–.14 permanecen como historial completado e inalterado. La auditoría de lógica y la regresión funcional se mantienen como fase posterior.

**Alcance:** inventario de los 58 archivos actuales en `src/modules/identity/`, sus imports/consumidores relevantes y el plan de su reorganización física. Este documento concreta el ownership de Identity respecto a [la arquitectura frontend](frontend-architecture.md). No autoriza cambios funcionales.

**Estado documental:** este archivo se conserva como historial de reorganización I1-11, incluidos inventarios, tareas y resultados. La fuente canónica de la estructura y contratos vigentes es [docs/frontend/modules/identity.md](../docs/frontend/modules/identity.md); no se reescribe aquí la cronología.

## 1. Diagnóstico del checkout

El inventario de 58 archivos se confirma contra el árbol actual. I1-11b.1–.7 trasladaron Auth, Account, Users, Shared y todas las áreas de Activity a sus destinos funcionales. I1-11b.8 contrastó árbol, inventario, rutas, referencias y regresiones; la reorganización está cerrada.

La estructura versionada contiene cinco funcionalidades raíz: `auth/`, `account/`, `users/`, `activity/` y `shared/`; las carpetas técnicas están dentro de sus propietarios. Preferences vive en `account/preferences/`; no hay una carpeta `identity/preferences/`.

**Estado actual tras I1-11b.8:** Auth, Account, Users, Shared y todas las APIs, tipos, vistas, componentes y composables de Activity están bajo sus owners definitivos. Los recursos de Inactivity están en `activity/inactivity/`; el test de API común permanece en `activity/api/`. Los composables estadísticos compartidos permanecen en `activity/composables/`. La sección 3 describe el árbol final; el resultado de la auditoría está registrado en la sección 5.

El inventario real incluye Login, Password Change, User Management, Overview, User Activity, Inactivity y User Statistics Layout; tests de vistas, API, queries y permisos; APIs de sesión, solicitud, usuarios y actividad; tipos de Auth, sesión, usuarios y actividad; Pinia de Auth y preferencias; y preferencias de Dashboard. No se encontraron consumidores de `AccessRequestDto` fuera del API de solicitud ni de `ActivityInactivity*` fuera del subfeature Inactivity.

La evidencia de imports muestra los acoplamientos que deben atenderse al mover archivos:

- Router importa Login de forma estática y Password Change, Users y las páginas/layout de estadísticas con imports dinámicos. También importa Auth, roles y permisos. Las rutas, nombres, meta, guards, redirects y permisos deben conservarse.
- `main.ts`, `App.vue`, Axios (`src/services/api/api.ts`), Router, Sidebar y varias vistas externas consumen el store Auth o su API de sesión. `auth.ts` de Pinia conserva su ownership en Auth aunque lo lean otros módulos.
- Auth importa `activity/api/appDailyActivity.ts` al establecer sesión. La notificación diaria usa Axios y también aparece en una prueba de `privateQueryCache`; conservar el flujo y dejar documentada esa dependencia entre features.
- `users/api/users.ts` y `users/types/users.ts` tienen consumidores legacy fuera de Identity: `src/stores/user/`, Articles, Content Calendar, listas, reuniones, vídeos, playlists y Version. `useAdminUsersQuery` es usado por User Management y User Activity. No consolidar ni cambiar esas consultas.
- Las preferencias de cuenta son consumidas desde Password Change, Sidebar, `src/composables/useDashboardConfig.ts` y Auth al aplicar la configuración de perfil. Su store persistido pertenece a Account y permanece separado del estado de sesión; Auth lo consume sin adquirir su ownership.
- Actividad estadística usa `activity/api/activity.ts`, sus contratos y TanStack Query. `useActivityStatisticsQueries` se usa en Overview, User Activity y por la mutación de Users para invalidar la query del dashboard. Este único consumidor externo no cambia el ownership Activity ni justifica `shared/`.
- Actividad legacy de usuarios usa `users/api/users.ts` y `useAdminActivityQueries`; conservarla separada de las queries estadísticas nuevas.
- `UserRole` se consume por Auth, Users, Activity, Router, Sidebar, permisos y otras pantallas. Los contratos de rol y `hasMinimumRole` son transversales; son los únicos archivos actuales que justifican `shared/`.
- Las pruebas de sesión cubren Auth, coordinación multipestaña, Router, Sidebar y Axios. Las pruebas de actividad cubren API, contratos, queries y vistas; se deben actualizar imports, mocks y lecturas de paths que apuntan a archivos.

La revisión de imports no propone corregir el anterior ciclo Auth/Axios ni fusionar consultas legacy y nuevas. No altera los mecanismos de sesión de App o Wiki, la API HTTP, TanStack Query, Pinia, permisos ni preferencias.

## 2. Convención definitiva y ownership

La unidad principal es la funcionalidad. Cada feature es propietaria de las vistas navegables, piezas exclusivas, composables, API propia, stores, tipos y tests. Se añaden subcarpetas técnicas dentro de una feature solo cuando agrupan archivos reales con una responsabilidad común.

`identity/shared/` se reserva a recursos consumidos por más de una funcionalidad de Identity o que representan un contrato transversal probado por el checkout. No basta con que haya más de un import: si todos los consumidores funcionales están en una sola feature, el archivo permanece allí. No se crean fachadas, barrels, wrappers o rutas de compatibilidad.

| Responsabilidad | Propietario objetivo | Evidencia y límite |
|---|---|---|
| Login y solicitud de acceso | `auth/login/` | Login es la página pública de Auth; su modal y su API/DTO de solicitud son exclusivos de ese flujo. |
| Login, refresh, logout y coordinación entre pestañas | `auth/api/`; store en `auth/stores/` | `sessionAuth*` implementa el transporte y coordinación; `auth.ts` mantiene el estado Pinia. App, Router, Axios y otras vistas pueden consumirlo sin cambiar su ownership. |
| Contratos de sesión | `auth/types/` | Solo los usan transporte y store Auth, además de sus tests. |
| Gestión de la propia cuenta: contraseña, avatar, perfil y preferencias | `account/` | Password Change vive en `account/password-change/`; componentes, composable y store persistido de preferencias viven en `account/preferences/`. El store `dashboardPreferences` pertenece a Account aunque Auth lo consume al aplicar la configuración recibida del perfil. |
| Administración de usuarios y contratos/API de Users | `users/` | Incluye User Management y el servicio/tipos/composables que también consumen módulos legacy. |
| Overview, User Activity, Inactivity, layout, estadísticas y actividad diaria | `activity/` | API y tipos de estadísticas, query compartida, subfeatures y captura diaria. Se conserva la query legacy global de actividad en `user-activity/`. |
| Contrato de roles y utilidad de permisos | `shared/types/` y `shared/utils/` | `UserRole` cruza Auth, Users, Activity y consumidores externos; permisos es usado por Router, Sidebar y otras features. |

Así, `auth/` posee login, sesión, refresh, logout y autenticación; `account/` posee los datos, configuración y preferencias de la propia cuenta; `users/` posee administración de usuarios y contratos; `activity/` posee actividad, estadísticas e inactividad; y `shared/` contiene contratos/utilidades transversales entre funcionalidades. La API de Users sigue bajo `users/` aunque Password Change use el store legacy para editar el perfil.

La API y los stores dependen de contratos/transporte y, cuando corresponda, de otras funcionalidades; no importan vistas ni componentes. La relación ya existente Auth → notificación de actividad diaria se documenta y conserva durante los movimientos. No se introduce una capa de servicios ni se usa `shared/` para ocultar dependencias.

## 3. Árbol objetivo completo

El árbol siguiente asigna los 58 archivos actualmente versionables. No presupone carpetas vacías. Las subcarpetas `components/`, `composables/`, `api/`, `stores/` y `types/` se crean solo cuando contienen los archivos listados.

```text
src/modules/identity/
├── auth/
│   ├── api/
│   │   ├── sessionAuth.ts
│   │   ├── sessionAuth.test.ts
│   │   ├── sessionAuthCoordinator.ts
│   │   └── sessionAuthCoordinator.test.ts
│   ├── login/
│   │   ├── LoginView.vue
│   │   ├── LoginView.test.ts
│   │   ├── api/
│   │   │   └── accessRequest.ts
│   │   ├── components/
│   │   │   └── AccessRequestModal.vue
│   │   └── types/
│   │       └── accessRequest.ts
│   ├── stores/
│   │   ├── auth.ts
│   │   └── auth.test.ts
│   └── types/
│       └── session.ts
├── account/
│   ├── password-change/
│   │   ├── PasswordChangeView.vue
│   │   └── PasswordChangeView.test.ts
│   └── preferences/
│       ├── components/
│       │   ├── DashboardBuilder.vue
│       │   └── ModuleCard.vue
│       ├── composables/
│       │   └── useDashboardPreferences.ts
│       └── stores/
│           └── dashboardPreferences.ts
├── users/
│   ├── api/
│   │   ├── users.ts
│   │   └── users.test.ts
│   ├── composables/
│   │   ├── useAdminUserMutations.ts
│   │   ├── useAdminUserMutations.test.ts
│   │   └── useAdminUsersQuery.ts
│   ├── types/
│   │   └── users.ts
│   └── user-management/
│       ├── UserManagementView.vue
│       └── UserManagementView.test.ts
├── activity/
│   ├── api/
│   │   ├── activity.ts
│   │   ├── activity.test.ts
│   │   ├── activityInactivity.test.ts
│   │   ├── appDailyActivity.ts
│   │   └── appDailyActivity.test.ts
│   ├── components/
│   │   └── ActivityPeriodFilters.vue
│   ├── composables/
│   │   ├── useActivityStatisticsQueries.ts
│   │   └── useActivityStatisticsQueries.test.ts
│   ├── layout/
│   │   ├── UserStatisticsLayout.vue
│   │   └── UserStatisticsLayout.test.ts
│   ├── inactivity/
│   │   ├── UserInactivityView.vue
│   │   ├── UserInactivityView.test.ts
│   │   ├── components/
│   │   │   ├── ActivityInactivityDistribution.vue
│   │   │   ├── ActivityInactivityFilters.vue
│   │   │   └── ActivityInactivityUsersTable.vue
│   │   ├── composables/
│   │   │   ├── useActivityInactivityQuery.ts
│   │   │   └── useActivityInactivityQuery.test.ts
│   │   └── types/
│   │       └── activityInactivity.ts
│   ├── overview/
│   │   ├── UserStatisticsView.vue
│   │   ├── UserStatisticsView.test.ts
│   │   └── components/
│   │       ├── ActivityComparisonChart.vue
│   │       └── ActivityMetricCard.vue
│   ├── types/
│   │   └── activity.ts
│   └── user-activity/
│       ├── UserActivityView.vue
│       ├── UserActivityView.test.ts
│       ├── components/
│       │   ├── ActivityUserDailyCharts.vue
│       │   └── ActivityUserDailyCharts.test.ts
│       └── composables/
│           ├── useAdminActivityQueries.ts
│           └── useAdminActivityQueries.test.ts
└── shared/
    ├── types/
    │   └── auth.ts
    └── utils/
        ├── permissions.ts
        └── permissions.test.ts
```

`shared/types/auth.ts` retains the existing `USER_ROLES`, `UserRole` and `LoginPayload` contract together; `UserRole` has actual cross-feature consumers, so this file is not a catch-all. `activity/types/activity.ts` is shared among Activity's own subfeatures. The inactivity DTO is exclusive to Inactivity. `ActivityPeriodFilters.vue` is shared by two Activity subfeatures and belongs at their feature-common level (`activity/components/`), not global `shared/`.

## 4. Mapa completo de movimientos

Cada fila conserva la ruta de origen inventariada y su destino; las subtareas completadas y pendientes se distinguen en la sección 5 y en los resultados. Para reducir repeticiones, las notas de consumidores e impacto se agrupan por subárbol inmediatamente debajo de la tabla; aplican a todos los archivos citados en ese subárbol. Los tests se trasladan con el sujeto probado. Las referencias listadas se revisan en la ejecución correspondiente.

| Ruta actual | Ruta objetivo | Propietario |
|---|---|---|
| `api/sessionAuth.ts` | `auth/api/sessionAuth.ts` | Auth |
| `api/sessionAuth.test.ts` | `auth/api/sessionAuth.test.ts` | Auth |
| `api/sessionAuthCoordinator.ts` | `auth/api/sessionAuthCoordinator.ts` | Auth |
| `api/sessionAuthCoordinator.test.ts` | `auth/api/sessionAuthCoordinator.test.ts` | Auth |
| `stores/auth.ts` | `auth/stores/auth.ts` | Auth |
| `stores/auth.test.ts` | `auth/stores/auth.test.ts` | Auth |
| `views/login/LoginView.vue` | `auth/login/LoginView.vue` | Auth/Login |
| `views/login/LoginView.test.ts` | `auth/login/LoginView.test.ts` | Auth/Login |
| `views/login/components/AccessRequestModal.vue` | `auth/login/components/AccessRequestModal.vue` | Auth/Login |
| `api/accessRequest.ts` | `auth/login/api/accessRequest.ts` | Auth/Login |
| `types/accessRequest.ts` | `auth/login/types/accessRequest.ts` | Auth/Login |
| `types/session.ts` | `auth/types/session.ts` | Auth |
| `views/password-change/PasswordChangeView.vue` | `account/password-change/PasswordChangeView.vue` | Account |
| `views/password-change/PasswordChangeView.test.ts` | `account/password-change/PasswordChangeView.test.ts` | Account |
| `users/api/users.ts` | `users/api/users.ts` | Users (sin movimiento) |
| `users/api/users.test.ts` | `users/api/users.test.ts` | Users (sin movimiento) |
| `users/composables/useAdminUserMutations.ts` | `users/composables/useAdminUserMutations.ts` | Users (sin movimiento) |
| `users/composables/useAdminUserMutations.test.ts` | `users/composables/useAdminUserMutations.test.ts` | Users (sin movimiento) |
| `users/composables/useAdminUsersQuery.ts` | `users/composables/useAdminUsersQuery.ts` | Users (sin movimiento) |
| `users/types/users.ts` | `users/types/users.ts` | Users (sin movimiento) |
| `views/user-management/UserManagementView.vue` | `users/user-management/UserManagementView.vue` | Users |
| `views/user-management/UserManagementView.test.ts` | `users/user-management/UserManagementView.test.ts` | Users |
| `preferences/components/DashboardBuilder.vue` | `account/preferences/components/DashboardBuilder.vue` | Account |
| `preferences/components/ModuleCard.vue` | `account/preferences/components/ModuleCard.vue` | Account |
| `preferences/composables/useDashboardPreferences.ts` | `account/preferences/composables/useDashboardPreferences.ts` | Account |
| `preferences/stores/dashboardPreferences.ts` | `account/preferences/stores/dashboardPreferences.ts` | Account |
| `api/activity.ts` | `activity/api/activity.ts` | Activity |
| `api/activity.test.ts` | `activity/api/activity.test.ts` | Activity |
| `api/activityInactivity.test.ts` | `activity/api/activityInactivity.test.ts` | Activity/Inactivity API |
| `api/appDailyActivity.ts` | `activity/api/appDailyActivity.ts` | Activity |
| `api/appDailyActivity.test.ts` | `activity/api/appDailyActivity.test.ts` | Activity |
| `activity/composables/useActivityStatisticsQueries.ts` | `activity/composables/useActivityStatisticsQueries.ts` | Activity (sin movimiento) |
| `activity/composables/useActivityStatisticsQueries.test.ts` | `activity/composables/useActivityStatisticsQueries.test.ts` | Activity (sin movimiento) |
| `types/activity.ts` | `activity/types/activity.ts` | Activity |
| `types/activityInactivity.ts` | `activity/inactivity/types/activityInactivity.ts` | Activity/Inactivity |
| `views/user-statistics/layout/UserStatisticsLayout.vue` | `activity/layout/UserStatisticsLayout.vue` | Activity/Layout |
| `views/user-statistics/layout/UserStatisticsLayout.test.ts` | `activity/layout/UserStatisticsLayout.test.ts` | Activity/Layout |
| `views/user-statistics/overview/UserStatisticsView.vue` | `activity/overview/UserStatisticsView.vue` | Activity/Overview |
| `views/user-statistics/overview/UserStatisticsView.test.ts` | `activity/overview/UserStatisticsView.test.ts` | Activity/Overview |
| `views/user-statistics/overview/components/ActivityComparisonChart.vue` | `activity/overview/components/ActivityComparisonChart.vue` | Activity/Overview |
| `views/user-statistics/overview/components/ActivityMetricCard.vue` | `activity/overview/components/ActivityMetricCard.vue` | Activity/Overview |
| `views/user-statistics/user-activity/UserActivityView.vue` | `activity/user-activity/UserActivityView.vue` | Activity/User Activity |
| `views/user-statistics/user-activity/UserActivityView.test.ts` | `activity/user-activity/UserActivityView.test.ts` | Activity/User Activity |
| `views/user-statistics/user-activity/components/ActivityUserDailyCharts.vue` | `activity/user-activity/components/ActivityUserDailyCharts.vue` | Activity/User Activity |
| `views/user-statistics/user-activity/components/ActivityUserDailyCharts.test.ts` | `activity/user-activity/components/ActivityUserDailyCharts.test.ts` | Activity/User Activity |
| `views/user-statistics/user-activity/composables/useAdminActivityQueries.ts` | `activity/user-activity/composables/useAdminActivityQueries.ts` | Activity/User Activity |
| `views/user-statistics/user-activity/composables/useAdminActivityQueries.test.ts` | `activity/user-activity/composables/useAdminActivityQueries.test.ts` | Activity/User Activity |
| `views/user-statistics/shared/ActivityPeriodFilters.vue` | `activity/components/ActivityPeriodFilters.vue` | Activity (Overview + User Activity) |
| `views/user-statistics/inactivity/UserInactivityView.vue` | `activity/inactivity/UserInactivityView.vue` | Activity/Inactivity |
| `views/user-statistics/inactivity/UserInactivityView.test.ts` | `activity/inactivity/UserInactivityView.test.ts` | Activity/Inactivity |
| `views/user-statistics/inactivity/components/ActivityInactivityDistribution.vue` | `activity/inactivity/components/ActivityInactivityDistribution.vue` | Activity/Inactivity |
| `views/user-statistics/inactivity/components/ActivityInactivityFilters.vue` | `activity/inactivity/components/ActivityInactivityFilters.vue` | Activity/Inactivity |
| `views/user-statistics/inactivity/components/ActivityInactivityUsersTable.vue` | `activity/inactivity/components/ActivityInactivityUsersTable.vue` | Activity/Inactivity |
| `views/user-statistics/inactivity/composables/useActivityInactivityQuery.ts` | `activity/inactivity/composables/useActivityInactivityQuery.ts` | Activity/Inactivity |
| `views/user-statistics/inactivity/composables/useActivityInactivityQuery.test.ts` | `activity/inactivity/composables/useActivityInactivityQuery.test.ts` | Activity/Inactivity |
| `utils/permissions.ts` | `shared/utils/permissions.ts` | Shared |
| `utils/permissions.test.ts` | `shared/utils/permissions.test.ts` | Shared |
| `types/auth.ts` | `shared/types/auth.ts` | Shared (contrato de roles) |

Las rutas indicadas son relativas a `src/modules/identity/`. En los grupos que permanecen en su ubicación relativa (`users/` y `activity/composables/`) la ruta actual y objetivo son la misma; se listan para acreditar que los 58 archivos tienen exactamente un destino y no se proponen movimientos innecesarios.

### Consumidores, imports, mocks y riesgo por grupo

| Grupo de movimientos | Consumidores/imports/mocks que deberán revisarse | Riesgo y dependencia |
|---|---|---|
| Auth/Login: `api/sessionAuth*`, `api/sessionAuthCoordinator*`, `stores/auth*`, `views/login/**`, `api/accessRequest.ts`, `types/session.ts`, `types/accessRequest.ts` | `main.ts`, `App.vue`, `router/index.ts` (import estático Login), guard tests, `services/api/api.ts` y su test, Sidebar y su test, `privateQueryCache.test.ts`, Login y su test, modal; mocks por alias `@/modules/identity/...` en tests. | Alto: bootstrap, Axios, Pinia, sesión multipestaña y tests con paths directos. Auth no pasa a `shared/`; conservar IDs de store y comportamiento. Requiere revisión coordinada de imports estáticos/dinámicos. |
| Account/Password Change: vista y test | Router (import dinámico); vista/test consumen Auth, permisos, preferencias de Account y el legacy `src/stores/user`; test mockea esos módulos. | Medio: conservar ruta/meta y distinguir la API/edición de perfil de la API administrativa de Users. Depende de imports de Auth migrados en .1. |
| Users: User Management y test; API, tipos y composables ya agrupados | Router (import dinámico); User Activity usa `useAdminUsersQuery`; `useAdminUserMutations` invalida query de Activity. Consumidores externos: `src/stores/user/`, Articles, Content Calendar, listas, reuniones, vídeos, playlists y Version; tests/mocks de esos usos. | Alto: muchos imports externos y mocks, query keys, legacy users store y contrato de roles. API/tipos continúan bajo Users aunque el consumidor principal no sea Identity. No consolidar las dos rutas/consultas de Users. |
| Account/Preferences: cuatro archivos | Password Change, Auth store, Sidebar, `src/composables/useDashboardConfig.ts` y sus tests. Revisar imports, mocks y lecturas con paths actuales `preferences/...`. | Medio: mantener store ID `dashboardPreferences`, claves/serialización, valores por defecto, reactividad, orden/visibilidad de módulos y persistencia; conservar la dependencia Auth → preferencias al aplicar configuración sin mover el store a Auth. |
| Activity APIs y contratos (.6a): `api/activity*`, `api/appDailyActivity*`, `types/activity.ts` | `useActivityStatisticsQueries` y sus tests, vistas de Overview/User Activity/Inactivity, sus tests y mocks; Auth store y su test consumen actividad diaria; `privateQueryCache.test.ts` la mockea; `useAdminUserMutations` invalida `activityDashboardQueryKey` sin mover su composable. `activityInactivity.test.ts` acompaña a la API común en .6a. | Medio/alto: preservar endpoints, DTOs, señales, query keys e invalidación, captura diaria Auth → Activity y separación de consultas legacy/nuevas. `activity.ts` y su test usan también `types/activityInactivity.ts`, que permanece en su ruta actual hasta .7; el import se actualiza temporalmente y se vuelve a apuntar al destino final en .7. |
| Activity layout y Overview (.6b): layout, Overview, componentes locales y filtro común | Router carga Layout y Overview de forma dinámica; `UserStatisticsLayout` enlaza los nombres de rutas hijas; Overview y User Activity usan `ActivityPeriodFilters.vue`; `UserStatisticsView.test.ts` y `useActivityStatisticsQueries.test.ts` leen el source de Overview con `readFileSync`. | Medio: preservar path/names/meta/guards, jerarquía, pestañas, filtros, gráficos y carga diferida. El filtro se mueve una sola vez a `activity/components/` y su import en User Activity se adapta antes de trasladar esa vista en .6c. |
| Activity/User Activity (.6c): vista, gráficos diarios y consulta legacy | Router carga User Activity dinámicamente; la vista importa `useAdminActivityQueries`, `ActivityUserDailyCharts` y el filtro compartido; tests de vista, gráficos, queries y `useActivityStatisticsQueries.test.ts` importan o leen esos archivos. | Medio: conservar feed legacy, paginación y detalle separado de estadísticas nuevas; query keys y estado de sesión. No mover `useActivityStatisticsQueries` ni `useAdminUsersQuery`, que permanecen en sus owners. |
| Activity/Inactivity (.7): vista, componentes, query y contrato DTO | Router carga Inactivity dinámicamente; vista, componentes, query y sus tests importan `types/activityInactivity.ts` y mockean `api/activity.ts`. El test `api/activityInactivity.test.ts` ya se trasladó con esa API en .6a y no vuelve a moverse en .7. | Medio: conservar filtros, tabla, distribución, DTO, query keys y relación con la API; mantener Inactivity como subfeature propia, sin fusionarla con Overview o User Activity. |
| Shared: `types/auth.ts`, `utils/permissions*` | Auth, Users, Activity, Router, Sidebar, varias vistas/componentes externos y pruebas de permisos/importaciones. Revisar todos los alias, type-only imports y mocks; `UserRole` usa hoy `USER_ROLES`. | Medio/alto por amplitud de referencias; bajo riesgo funcional si solo se actualizan rutas y se conservan los símbolos. Requiere que las features estén ubicadas antes de mover los contratos y cerrar imports. |

No se proponen cambios a paths públicos de Router, nombres de ruta, permisos, contratos HTTP, query keys, Pinia IDs, preferencia persistida ni consumo de la API de Users. No se crean barrels ni wrappers para aliviar el número de imports.

## 5. Plan de ejecución I1-11b

Las subtareas conservan la arquitectura actual en el comportamiento. Se actualizan imports, mocks y rutas de lectura de tests únicamente cuando un movimiento los vuelve obsoletos. El estado actual y el árbol objetivo se documentan por separado en las secciones 1 y 3.

| ID / tamaño | Objetivo y archivos afectados | Dependencias | Riesgos | Criterios de aceptación | Verificaciones de ejecución |
|---|---|---|---|---|---|
| **I1-11b.1 — Auth y Login (M) — Completada** | Mover Login, modal, solicitud/DTO, sesión/coordinador y store Auth a `auth/`; adaptar imports internos y externos. La importación relativa de `session.ts` hacia Auth pasa temporalmente a la ruta aún existente de `types/auth.ts`, hasta I1-11b.5. | I1-11a.1–.14 completadas. | Bootstrap, Router estático/dinámico, Axios, tests de sesión, mocks y Auth → actividad diaria. | Auth/Login son propietarios de esos archivos; store y sesión mantienen API/IDs/semántica; rutas y permisos intactos; nada importa vistas desde API/store; sin compatibilidad antigua. | Búsqueda de rutas antiguas; revisar `main.ts`, App, Router, Axios, Sidebar y cache privado; tests existentes de Auth, sesión, Router, Sidebar y Axios; typecheck y `git diff --check`. |
| **I1-11b.2 — Account (XS) — Completada** | Mover Password Change y su test a `account/password-change/`; actualizar imports de Router y de dependencias si aplica. | .1 para la nueva ubicación Auth; Preferences puede permanecer temporalmente en su ubicación actual. | Perfil/avatar, permisos y composición de Preferences; router dinámico. | Password Change queda bajo Account; comportamiento de contraseña/avatar y Dashboard intacto; ruta/meta/guards preservados. | Búsqueda de paths viejos; revisar Router y mocks; test Password Change, typecheck y `git diff --check`. |
| **I1-11b.3 — Users (S) — Completada** | Reubicar User Management y test dentro de `users/`; conservar API, tipos y queries donde están. | .1 por el contrato/store Auth. | Consumers legacy de Users, rutas por path, query keys e invalidación de Activity. | Todo Users tiene propietario `users/`; API/tipos externos siguen disponibles en la ruta nueva; no se fusionan consultas ni APIs. | Búsqueda global de paths; revisar mocks y lecturas de source en tests; tests User Management y consumers relacionados, typecheck y `git diff --check`. |
| **I1-11b.4 — Integrar Preferences en Account (S) — Completada** | Trasladar `preferences/components/DashboardBuilder.vue`, `ModuleCard.vue`, `preferences/composables/useDashboardPreferences.ts` y `preferences/stores/dashboardPreferences.ts` a `account/preferences/`; actualizar únicamente imports, mocks y referencias afectados. | .1–.3. | Password Change, Auth store, Sidebar, `src/composables/useDashboardConfig.ts`, tests y persistencia. | `account/` es dueño de preferencias de la propia cuenta; el store `dashboardPreferences` conserva ID, persistencia/serialización, valores por defecto, reactividad, orden y visibilidad de módulos y aplicación durante sesión. Componentes y contratos mantienen comportamiento. La API de Users sigue en `users/`. | Tests focalizados de Account, Auth y Sidebar; typecheck, build, suite completa, búsqueda de rutas antiguas y `git diff --check`. |
| **I1-11b.5 — Shared y contratos transversales (S) — Completada** | Mover `types/auth.ts` a `shared/types/auth.ts` y `utils/permissions.ts` más su test a `shared/utils/`; actualizar imports type-only y runtime de features y consumidores externos. | .1–.4 para que los owners funcionales estén asentados. | Amplia superficie Router/Sidebar/otras vistas; tipos de UserRole y reglas de permisos. | Solo roles/contratos y permiso transversal quedan en `shared/`; cada import resuelve; mismo orden y reglas de roles, sin duplicados ni reexports. | Búsqueda de rutas antiguas en todo `src`; tests de permisos, imports de Router y Sidebar; typecheck y `git diff --check`. |
| **I1-11b.6a — Activity: APIs y contratos (S) — Completada** | Mover `api/activity.ts` → `activity/api/activity.ts`; `api/activity.test.ts` → `activity/api/activity.test.ts`; `api/activityInactivity.test.ts` → `activity/api/activityInactivity.test.ts`; `api/appDailyActivity.ts` y su test → `activity/api/`; `types/activity.ts` → `activity/types/activity.ts`. Seis archivos; no mover vistas ni `types/activityInactivity.ts`. | .1–.5. | Auth store/test y `privateQueryCache.test.ts` consumen/mockean actividad diaria; `useActivityStatisticsQueries` y vistas/tests consumen API y contratos; `activityInactivity.test.ts` comprueba el endpoint común de Inactivity; Users mutation invalida la query estadística compartida. | Mismos endpoints, DTOs, query keys, cancelación/señales, semántica best-effort de actividad diaria, invalidaciones y consultas. Los imports de `types/activityInactivity.ts` siguen temporalmente a la ruta actual hasta .7; ningún archivo de vista se mueve. | Tests API de actividad/actividad diaria/Inactivity; tests Auth, `privateQueryCache`, query estadística y mutaciones Users; búsqueda de imports antiguos; `yarn vue-tsc --noEmit`, build y `git diff --check`. |
| **I1-11b.6b — Activity: layout y Overview (S) — Completada** | Mover `views/user-statistics/layout/UserStatisticsLayout.vue` y su test → `activity/layout/`; `overview/UserStatisticsView.vue` y su test → `activity/overview/`; `overview/components/ActivityComparisonChart.vue` y `ActivityMetricCard.vue` → `activity/overview/components/`; `views/user-statistics/shared/ActivityPeriodFilters.vue` → `activity/components/`. Siete archivos. | .6a; .1–.5 completadas. | Router carga Layout y Overview; Layout enlaza rutas hijas; Overview y User Activity comparten ActivityPeriodFilters. `UserStatisticsView.test.ts` y `useActivityStatisticsQueries.test.ts` leen el source de Overview. | Paths/names/meta/guards y carga diferida intactos; misma jerarquía de pestañas, filtros y gráficos; componente de filtro se mueve exactamente una vez. Sin cambios de lógica. | Tests de Layout, Overview y User Activity (por el filtro compartido); actualizar mocks/imports y lecturas `readFileSync`; tests Router pertinentes; typecheck, build y `git diff --check`. |
| **I1-11b.6c — Activity: User Activity (S) — Completada** | Mover `views/user-statistics/user-activity/UserActivityView.vue` y su test → `activity/user-activity/`; `components/ActivityUserDailyCharts.vue` y su test → `activity/user-activity/components/`; `composables/useAdminActivityQueries.ts` y su test → `activity/user-activity/composables/`. Seis archivos. | .6a y .6b; .1–.5 completadas. | Router importa la vista dinámicamente; vista usa el filtro ya movido en .6b, el composable legacy y los gráficos; sus tests y `useActivityStatisticsQueries.test.ts` importan/leen archivos. | Feed y paginación legacy quedan independientes de las estadísticas nuevas; se mantienen query keys, estado de sesión y carga de gráficos. No mover `activity/composables/useActivityStatisticsQueries*` ni `users/composables/useAdminUsersQuery.ts`. | Tests User Activity, ActivityUserDailyCharts y `useAdminActivityQueries`; actualizar Router, imports/mocks y lecturas `readFileSync`; tests Router pertinentes; typecheck, build y `git diff --check`. |
| **I1-11b.7 — Activity: Inactivity (S) — Completada** | Mover `views/user-statistics/inactivity/UserInactivityView.vue` y su test → `activity/inactivity/`; los tres componentes `ActivityInactivityDistribution.vue`, `ActivityInactivityFilters.vue` y `ActivityInactivityUsersTable.vue` → `activity/inactivity/components/`; `composables/useActivityInactivityQuery.ts` y su test → `activity/inactivity/composables/`; `types/activityInactivity.ts` → `activity/inactivity/types/`. Ocho archivos. `api/activityInactivity.test.ts` ya se trasladó en .6a con `api/activity.ts` y no vuelve a moverse. | .6a, .6b y .6c completadas. | Router importa Inactivity dinámicamente; vista, componentes, query y tests mockean API común y consumen DTO; la API y su test ya están en `activity/api/`. | Se conservan filtros, tabla, distribución, contrato DTO, query keys y comportamiento. Inactivity permanece separada de Overview/User Activity. | Tests UserInactivityView y `useActivityInactivityQuery`; test API movido y actualizado en .6a; tests Router pertinentes; búsqueda global de paths viejos; typecheck, build y `git diff --check`. |
| **I1-11b.8 — Revisión estructural final (XS) — Completada** | Auditar árbol, imports, owners, rutas, consumidores, tests y enlaces documentales tras todos los movimientos. | .1–.6c y .7. | Paths residuales en tests/lecturas de archivos y destinos inconsistentes. | Raíz contiene exactamente `auth/`, `account/`, `users/`, `activity/` y `shared/`; preferencias están bajo `account/preferences/`. Cada archivo tiene un owner y un destino; `shared/` justificado; no hay paths viejos, duplicados o imports de UI desde API/stores. | Inventario `rg --files`; búsqueda global de paths; validar Router/consumidores; tests de regresión Identity y relacionados, typecheck/build y `git diff --check`. |

**Resultado I1-11b.1 (2026-10-25):** trasladados los 12 archivos enumerados a `auth/`; actualizados imports, mocks y dynamic imports en bootstrap, App, Router, Axios tests, `privateQueryCache`, Sidebar, User Management, Password Change, Activity, consumidores externos y tests. El contrato `types/auth.ts` permanece donde estaba; `auth/types/session.ts` importa `UserRole` por su alias actual. Auth conserva la llamada a `api/appDailyActivity.ts` en su ruta actual. Tests focalizados: 10 archivos/74 tests aprobados; typecheck aprobado; build aprobado; suite completa: 38 archivos/217 tests aprobados; `git diff --check` aprobado. No se cambiaron rutas públicas ni lógica. Se observaron avisos ya existentes de Browserslist, minificación de `.flex-[2]` y tamaño de chunks; no se intervinieron.

**Resultado I1-11b.2 (2026-10-25):** trasladados `views/password-change/PasswordChangeView.vue` y su test a `account/password-change/`; actualizados el import dinámico de `/password` en Router y ningún otro import/mocks requirió cambios (el import relativo a Preferences conserva su ruta válida, y los mocks ya apuntaban a Auth tras .1). El contenido de la vista y del test conserva sus hashes previos al movimiento; no hubo cambios funcionales ni de rutas/meta/guards. Test Password Change: 3/3; Router/Auth focalizados: 48/48; `yarn vue-tsc --noEmit`, `yarn build`, suite completa (38 archivos/217 tests) y `git diff --check` aprobados. Vitest descubrió el test en su nueva ubicación y la búsqueda en `src/` no encontró referencias a `views/password-change/`. Permanecen los avisos de Browserslist/CSS/chunks y el `ENOTFOUND` de backend en una prueba de bootstrap que pasó; no se intervinieron. No se avanzó a .3 ni a posteriores.

**Resultado I1-11b.3 (2026-10-25):** trasladados `views/user-management/UserManagementView.vue` y su test a `users/user-management/`; actualizado el import dinámico de Router y la ruta literal usada por `readFileSync` en el test de Activity. El import del test de vista sigue siendo relativo local; los imports/mocks de Users/Auth usan alias estables y no necesitaron cambios. Ambos archivos conservan sus hashes previos al movimiento. No se modificaron API, tipos, queries, consumidores legacy, rutas públicas ni lógica; no se introdujeron ciclos nuevos. Las pruebas focalizadas (User Management, API, mutaciones, Router y Activity) pasaron: 6 archivos/54 tests; `yarn vue-tsc --noEmit`, `yarn build`, suite completa (38 archivos/217 tests) y `git diff --check` aprobados. Vitest descubrió el test trasladado y no quedan referencias activas a `views/user-management/` en `src/`. Persisten avisos preexistentes de Browserslist/CSS/chunks, mensajes intencionados de `offline` en tests y `ENOTFOUND` de backend en una prueba de bootstrap que pasó; no se intervinieron. No se avanzó a .4 ni posteriores.

**Resultado I1-11b.4 (2026-10-25):** trasladados `preferences/components/DashboardBuilder.vue`, `ModuleCard.vue`, `preferences/composables/useDashboardPreferences.ts` y `preferences/stores/dashboardPreferences.ts` a `account/preferences/`; actualizados imports y el mock de Preferences en Password Change, Auth y su test, Sidebar y su test, y `src/composables/useDashboardConfig.ts`. Los cuatro archivos trasladados conservan sus hashes previos al movimiento. No quedan referencias activas a `identity/preferences/` y se retiró el directorio vacío. El store mantiene ID `dashboardPreferences`, claves y serialización; no cambiaron su lógica, valores por defecto, acciones, getters ni comportamiento de sesión. No se creó un estado duplicado ni dependencias circulares nuevas. Tests focalizados: 7 archivos/47 tests aprobados; no existen tests unitarios dedicados a los archivos Preferences. `yarn vue-tsc --noEmit`, `yarn build`, suite completa (38 archivos/217 tests) y `git diff --check` aprobados. Vitest descubrió Account/Auth/Sidebar en sus ubicaciones actuales. Persisten avisos preexistentes de Browserslist, minificación CSS y tamaño de chunks, además de mensajes de error intencionados en pruebas que pasan; no se intervinieron. No se avanzó a .5 ni posteriores.

**Resultado I1-11b.5 (2026-10-25):** trasladados `types/auth.ts`, `utils/permissions.ts` y `utils/permissions.test.ts` a `shared/types/` y `shared/utils/`. Actualizados imports runtime y type-only en Auth/sesión, Users, Account, Activity, Router/guards, Sidebar y consumidores externos (calendarios, DiscCard, Artist Management y playlists), incluyendo los imports relativos de `users/types/users.ts` y `types/activityInactivity.ts`. Se conserva exactamente `USER_ROLES`, `UserRole`, `LoginPayload` y la implementación de `hasMinimumRole`; el único cambio dentro de la implementación es su ruta de import. Los hashes del contrato de roles y del test de permisos no cambiaron. No quedan referencias activas a las rutas anteriores en `src/`; Vitest descubrió `shared/utils/permissions.test.ts`. No se duplicaron tipos ni reglas ni se identificaron ciclos nuevos. Tests focalizados: 12 archivos/80 tests aprobados; `yarn vue-tsc --noEmit`, `yarn build`, suite completa (38 archivos/217 tests) y `git diff --check` aprobados. Persisten avisos preexistentes de Browserslist, minificación CSS y tamaño de chunks, mensajes intencionados de `offline` y `ENOTFOUND` en pruebas que pasan; no se intervinieron. No se avanzó a .6 ni posteriores.

**Resultado I1-11b.6a (2026-10-25):** trasladados `api/activity.ts`, sus tests `activity.test.ts` y `activityInactivity.test.ts`, `api/appDailyActivity.ts` y su test, y `types/activity.ts` a `activity/api/` y `activity/types/`. Actualizados imports y mocks en Auth, cache privada, queries estadísticas, vistas y tests de Overview, User Activity e Inactivity; el test de Inactivity y la API conservan el DTO en su ruta actual `types/activityInactivity.ts`, que queda para .7. Los endpoints, parámetros, DTOs, query keys, cancelación, invalidaciones, captura diaria y manejo best-effort se conservaron; los cambios de contenido se limitaron a imports necesarios. El grafo de dependencias conserva las mismas relaciones y no se introdujeron ciclos; permanece el acoplamiento histórico Auth/Axios fuera de alcance. Vitest descubrió los tres tests trasladados. Tests focalizados: 13 archivos/91 tests aprobados; `yarn vue-tsc --noEmit`, `yarn build`, suite completa (38 archivos/217 tests) y `git diff --check` aprobados. Persisten avisos de Browserslist, minificación CSS y tamaño de chunks, mensajes intencionados de `offline` y `ENOTFOUND` de backend en pruebas que pasan; no se intervinieron. No se avanzó a .6b ni posteriores.

**Resultado I1-11b.6b (2026-10-25):** trasladados `UserStatisticsLayout.vue` y su test, `UserStatisticsView.vue` y su test, `ActivityComparisonChart.vue`, `ActivityMetricCard.vue` y `ActivityPeriodFilters.vue` a `activity/layout/`, `activity/overview/` y `activity/components/`. Actualizados los imports dinámicos de Router, los imports relativos del filtro en Overview y User Activity, y las rutas `readFileSync` en el test de Overview y el test de queries estadísticas. Se conservaron rutas/nombres, jerarquía y navegación; los siete archivos mantienen su contenido, salvo el import del filtro en Overview y la ruta literal de lectura en su test. No se introdujeron ciclos ni cambios funcionales. Vitest descubrió los dos tests trasladados. Tests focalizados: 6 archivos/54 tests aprobados; `yarn vue-tsc --noEmit`, `yarn build`, suite completa (38 archivos/217 tests) y `git diff --check` aprobados. Persisten avisos de Browserslist, minificación CSS y tamaño de chunks, mensajes intencionados de `offline` y `ENOTFOUND` de backend en pruebas que pasan; no se intervinieron. No se avanzó a .6c ni posteriores.

**Resultado I1-11b.6c (2026-10-25):** trasladados `UserActivityView.vue` y su test, `ActivityUserDailyCharts.vue` y su test, `useAdminActivityQueries.ts` y su test a `activity/user-activity/`. Actualizados el import dinámico de Router y la lectura literal de `UserActivityView.vue` en el test de `useActivityStatisticsQueries`. Los seis archivos trasladados conservaron sus hashes. Se mantuvieron sin cambios los imports funcionales existentes al filtro compartido, la query estadística nueva, la API de actividad, la query legacy de Users y Auth; no hay import directo a `shared/types/auth`. Rutas, permisos, jerarquía y comportamiento permanecen intactos; no se introdujeron ciclos ni cambios funcionales. Vitest descubrió los tres tests trasladados. Tests focalizados: 6 archivos/46 tests aprobados; `yarn vue-tsc --noEmit`, `yarn build`, suite completa (38 archivos/217 tests) y `git diff --check` aprobados. Persisten avisos de Browserslist, minificación CSS y tamaño de chunks, mensajes intencionados de `offline` y `ENOTFOUND` de backend en pruebas que pasan; no se intervinieron. No se avanzó a .7 ni posteriores.

**Resultado I1-11b.7 (2026-10-25):** trasladados `UserInactivityView.vue` y su test, los tres componentes `ActivityInactivityDistribution.vue`, `ActivityInactivityFilters.vue` y `ActivityInactivityUsersTable.vue`, `useActivityInactivityQuery.ts` y su test, y `types/activityInactivity.ts` a `activity/inactivity/`. Actualizados el import dinámico de Router, los imports type-only/runtime del DTO en Inactivity y su test de API, y el import relativo de `UserRole` dentro del DTO. El test `activity/api/activityInactivity.test.ts` permaneció en `activity/api/`. Los ocho archivos conservaron su contenido al revertir únicamente los ajustes de imports. Se mantienen sin cambios endpoint, parámetros, DTO, query keys, filtros, distribución, tabla, ordenación, paginación, permisos y estados; Inactivity sigue separada de Overview y User Activity. No se introdujeron ciclos runtime; la API importa el DTO con imports type-only. No hubo cambios funcionales. Vitest descubrió ambos tests trasladados; los tests focalizados de Inactivity/API/queries/Router pasaron: 8 archivos/59 tests. `yarn vue-tsc --noEmit`, `yarn build`, suite completa (38 archivos/217 tests) y `git diff --check` aprobados. Persisten avisos de Browserslist, minificación CSS y tamaño de chunks, mensajes intencionados de `offline` y `ENOTFOUND` de backend en pruebas que pasan; no se intervinieron. No se inició .8 ni la auditoría de lógica.

**Resultado I1-11b.8 (2026-10-25):** auditoría estructural aprobada. El árbol contiene exactamente cinco owners raíz (`auth/`, `account/`, `users/`, `activity/`, `shared/`), sin archivos en carpetas técnicas residuales de la raíz ni vistas bajo `identity/views/`; no hay directorios vacíos locales. Los 58 archivos del inventario están presentes en sus 58 destinos únicos, sin faltantes, duplicados ni archivos sin propietario. Los 20 tests `.test.ts` de Identity permanecen junto a sus sujetos y Vitest descubre los tests trasladados. Router conserva paths, nombres, jerarquía, redirects, meta y guards, y carga las siete vistas/layout desde sus owners. La búsqueda global de código no encontró imports/mocks activos hacia las rutas técnicas antiguas; el único literal de una ruta antigua es una aserción de test que comprueba que un archivo legacy no existe. No se encontraron imports de vistas/componentes desde APIs o stores, duplicación de roles/permisos, ni nuevos ciclos runtime. Se conserva el borde Auth → Activity para la notificación diaria, la dependencia Auth → preferencias de Account, los consumidores legacy de Users, y el import type-only del DTO de Inactivity desde la API compartida. Los IDs y persistencia de stores, roles, contratos HTTP/DTO, query keys/invalidation y separación entre consultas legacy/estadísticas se mantienen cubiertos por pruebas existentes; esta auditoría no modificó código.

Rutas y pruebas registradas para la fase siguiente:

| SFC actual | Ruta/nombre vigente | Test asociado |
|---|---|---|
| `auth/login/LoginView.vue` | `/login` — `Login` | `auth/login/LoginView.test.ts` |
| `account/password-change/PasswordChangeView.vue` | `/password` — `Password` | `account/password-change/PasswordChangeView.test.ts` |
| `users/user-management/UserManagementView.vue` | `/users` — `Users` | `users/user-management/UserManagementView.test.ts` |
| `activity/overview/UserStatisticsView.vue` | `/users/stats` — `UserStats` (en `UserStatisticsLayout`) | `activity/overview/UserStatisticsView.test.ts` |
| `activity/user-activity/UserActivityView.vue` | `/users/stats/users` — `UserStatsUsers`; `/users/activity` redirige aquí | `activity/user-activity/UserActivityView.test.ts` |
| `activity/inactivity/UserInactivityView.vue` | `/users/stats/inactivity` — `UserStatsInactivity`; `/users/inactivity` redirige aquí | `activity/inactivity/UserInactivityView.test.ts` |
| `activity/layout/UserStatisticsLayout.vue` | Layout padre de `/users/stats` y sus rutas hijas | `activity/layout/UserStatisticsLayout.test.ts` |

La continuación de Identity es [I1-12 — Auditoría de lógica de vistas](identity-logic.md), que audita estos siete SFC y decide, con evidencia de responsabilidades y consumidores, si conviene extraer piezas. Esta referencia no aprueba extracciones ni altera el historial completado de I1-11a/I1-11b.

Verificaciones de cierre: tests focalizados `yarn test src/modules/identity src/router src/app/privateQueryCache.test.ts src/layouts/default/components/SidebarMenuAuth.test.ts src/layouts/default/components/SidebarMenuPermissions.test.ts src/stores/user/users.test.ts` — 26 archivos/161 tests aprobados; `yarn vue-tsc --noEmit` aprobado; `yarn build` aprobado; `yarn test` — 38 archivos/217 tests aprobados; `git diff --check` aprobado. Avisos observados sin cambios: Browserslist/caniuse-lite obsoleto, advertencia de minificación CSS `.flex-[2]`, chunk principal mayor de 500 kB, mensajes `offline` intencionados en tests y `ENOTFOUND backend.riffvalley.es` registrado por un test de inicialización de Router que pasa. La arquitectura `frontend-architecture.md` se actualizó solo en afirmaciones vigentes incompatibles; los baselines y resultados históricos se conservaron. No hay diferencias de inventario ni se detectaron archivos de Identity ajenos que requieran intervención.

**I1-11b.7** ejecutó el traslado independiente de Inactivity. El test de API `api/activityInactivity.test.ts` se movió con la API compartida en .6a; .7 trasladó la vista, componentes, query y DTO, y actualizó sus referencias.

La subtarea .4 integró Preferences bajo Account y .5 ubicó los contratos y permisos transversales en Shared. Activity queda dividida por API/contratos, Overview/layout, User Activity e Inactivity; los dos composables estadísticos ya ubicados bajo `activity/composables/` permanecen allí.

### Dependencias y cierre de I1-11b

Orden de ejecución realizado: `.1 → .2 → .3 → .4 → .5 → .6a → .6b → .6c → .7 → .8`. La dependencia `.6a → .7` garantizó que la prueba de API común de Inactivity se trasladara una sola vez. .6b precedió a .6c porque movió el filtro compartido que consume User Activity; .7 siguió a la API común y las vistas anteriores para cerrar el árbol antes de la auditoría final. Los 58 archivos tienen un destino único.

I1-11b queda cerrada: estructura y referencias en código/tests corresponden al árbol, no quedan imports activos antiguos ni destinos duplicados, se conservan rutas/permisos/contratos y pasan las verificaciones de regresión. Este roadmap no autorizó cambios de comportamiento.

## 6. Fase posterior: lógica y regresión

La siguiente fase, separada de I1-11b y aún no iniciada, auditará la lógica de los siete SFC actuales y decidirá qué responsabilidades merece la pena extraer. No se ejecuta ni se diseña ninguna extracción en esta revisión:

1. **Auditoría de lógica:** revisar los siete SFC de vista/layout actuales de forma individual: las seis vistas de página Login, Password Change, User Management, Overview, User Activity e Inactivity, además de User Statistics Layout. Identificar responsabilidades mezcladas con evidencia de consumidores y dependencias.
2. **Extracciones pequeñas:** proponer y realizar solo extracciones que reduzcan complejidad o expresen una reutilización real; composables/componentes no son obligatorios por vista. Preservar TanStack Query para datos de servidor, Pinia para sesión y el store de preferencias persistidas propiedad de Account. Mantener separadas la consulta legacy y la nueva, y no alterar Auth/actividad diaria como efecto colateral.
3. **Regresión final:** comprobar rutas, guards, roles/permisos, sesión/login/refresh/logout, coordinación entre pestañas, preferencias, consultas/keys, actividad, administración de usuarios y consumidores legacy. Cerrar Identity solo después de esta regresión.

**Estado de las antiguas I1-11a.15 y .16:** pospuestas; no son tareas activas paralelas a I1-11b. La continuación de auditoría por vista y su regresión funcional quedan planificadas en [I1-12](identity-logic.md). Los detalles históricos de esas fichas quedan como referencia de zonas a revisar, no como aprobación de extracciones. No renumerar ni reabrir I1-11a.1–.14.

## 7. Verificación documental de esta auditoría

- El árbol actual contiene 58 archivos; el inventario y el árbol real coinciden exactamente, con 58 destinos únicos y sin faltantes.
- La raíz de destino contiene exactamente cinco carpetas: `auth/`, `account/`, `users/`, `activity/` y `shared/`; los recursos de `shared/` tienen consumidores transversales identificados.
- Se registran las dependencias especiales de Router, Auth/bootstrap, Axios, Pinia, TanStack Query, Sidebar, Users legacy y tests de sesión/actividad.
- `roadmap.md` ya enlaza este documento y no requiere cambios.
- `frontend-architecture.md` se ajustó en las referencias vigentes incompatibles con el árbol final y ownership Account de preferencias; baselines y resultados históricos se conservan.
- Los 27 movimientos pendientes tras .5 se completaron: 6 en .6a, 7 en .6b, 6 en .6c y 8 en .7. Los 8 archivos sin movimiento propuesto ya estaban en su destino, incluidos los dos composables estadísticos. La estructura queda cerrada tras .8.
- La fase siguiente auditará responsabilidades de Login, Password Change, User Management, Overview, User Activity, Inactivity y User Statistics Layout, verificando sus rutas y tests antes de decidir extracciones. No se hicieron extracciones durante I1-11b.
