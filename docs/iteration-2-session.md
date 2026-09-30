# Iteración 2 — Composición, HTTP e identity/session

Implementación limitada a la Iteración 2. No se inicia catálogo (Iteración 3),
no se cambian contratos del backend y no se modifica el diseño del producto.

## Caracterización previa

Antes de sustituir la implementación se ejecutaron 15 pruebas sobre el código
original: login y error de credenciales, restauración JSON/CSV de roles, avatar,
logout y claves persistidas, token HTTP y 401, rutas públicas, mantenimiento,
roles exactos y restricción de babyUser en /import. Las pruebas se conservaron
contra las fachadas; solo cambiaron los puntos de inyección de sus mocks.

## Ciclo y composición

Antes: api → auth store → servicio de login → api; api → router → auth store.
Ahora: main → app/bootstrap; app compone Pinia, router, cliente HTTP y adaptadores.
El store de identidad consume contratos de aplicación. Infraestructura implementa
esos contratos y el adaptador de login usa el transporte compartido. El cliente
HTTP importa Axios y tipos propios, sin Pinia ni Vue Router.

app/bootstrap/session.ts conecta callbacks una vez antes de instalar el router.
El token se lee en cada petición: no se guarda en defaults.headers. El transporte
registra los interceptores al crearse y configurar callbacks nunca los duplica.
Los servicios legacy siguen utilizando el mismo singleton por una fachada.

app/dependencies/identity.ts compone login y persistencia de identidad con la
inicialización/limpieza de preferencias de workspace. La identidad no conoce
workspace. workspace se compone en su propio archivo. No se crean clases de
casos de uso ni modelos duplicados por ceremonia; estos flujos necesitan puertos
y coordinación reactiva, sin imponer entidades ni un dominio independiente.

## 401 y concurrencia

Cada petición captura token, versión de sesión y callbacks. La versión solo vive
en memoria y cambia en login/logout; no hay claves nuevas de almacenamiento.
Un 401 vigente comparte la promesa de limpieza/navegación con la misma tanda.
Logout invalida la versión de la sesión, de modo que respuestas tardías no vuelven
a limpiarla. Se vuelve a comprobar la sesión dentro de la microtarea de limpieza
por si login termina entre ambas comprobaciones. Una sesión nueva puede expirar
aunque la navegación de la anterior siga pendiente.

Todos los consumidores reciben el error HTTP original. Fallos de navegación se
capturan sin reemplazarlo. 403 y errores de red no provocan logout. Los 401 sin
token siguen redirigiendo a Login como en legacy, incluido el login fallido. No
se añade refresh, retry ni expiración proactiva del token.

## Persistencia y workspace

- token, username, userId: strings con los mismos nombres.
- image: string persistido; login/setImage escriben cadena vacía si no hay avatar.
  Restauración conserva la cadena vacía anterior.
- roles: JSON al escribir; lectura JSON o CSV antiguo con trim. JSON malformado
  o no array conserva el fallback anterior; elementos que no sean string se
  descartan para que no rompan los consumidores de permisos.
- dashboardButtonsEnabled: strings true/false; dashboardConfig y
  mobileDashboardConfig: arrays JSON o null JSON, con las mismas claves.
- Logout elimina las cinco claves de identidad y las tres de preferencias.
  theme, bgMode, rv_dashboard_config y otras preferencias siguen independientes.

workspace posee orden/visibilidad desktop, orden/visibilidad móvil y el selector
de botones del dashboard/menú. Este último también afecta al shell, por lo que
workspace sigue siendo una frontera provisional. El avatar pertenece a identidad.
La migración rv_dashboard_config sigue siendo exclusivamente desktop y mantiene
el merge con módulos actuales, escritura en backend y eliminación de la clave
antigua. Reset sigue enviando [] al backend. El composable y el recorrido de
actualización de usuario siguen legacy; no se migra todo workspace.

Las lecturas particulares de roles de DiscCardComponent y del avatar de perfil
se canalizan por funciones del adaptador que entregan el valor bruto. Así no se
cambia el criterio legacy de moderación al consolidar los guards del router.

## Compatibilidad

La definición completa de rutas se comparó con HEAD y es idéntica, incluidos
paths, nombres, metadata, imports diferidos, redirects, props y layouts anidados.
Se mantienen query params y el orden de guards: mantenimiento, autenticación,
rol, babyUser. La restricción /import sigue siendo exacta, incluido el caso mixto
babyUser + user y la diferencia legacy con /import/.

Main sigue siendo la entrada. App y router legacy quedan como fachadas. El shell
vive en app/layouts y delega en los layouts actuales mediante fachadas sin
introducir elementos DOM. Se conservan plugins, estilos y componentes globales.
Las APIs públicas de auth y login mantienen los imports de consumidores antiguos.
Todos los consumidores encontrados de preferencias se cambiaron a workspace.
initializeAuth se conserva como método compatible: el token ahora se lee por
petición. Las preferencias dejan de formar parte del estado auth.

El guard de arquitectura ahora reconoce el módulo propietario de sus propios
index.ts: antes confundía sus exports con imports internos entre módulos.
La prueba nueva acepta el barrel propio y sigue rechazando internals ajenos.
No se añaden ignores ni se desactivan reglas de capas o ciclos.

## Pruebas y resultados

- yarn verify: exit 0. Lint, arquitectura (25 archivos), typecheck, unitarios
  y build pasan; 47 pruebas unitarias en 8 suites.
- yarn test:e2e: exit 0. 13 E2E Chromium, incluido un proyecto de mantenimiento
  con un servidor separado y VITE_MAINTENANCE_MODE=true. API simulada, sin
  credenciales reales ni escrituras en producción. Los servidores requirieron
  ejecución fuera del sandbox para abrir puertos locales.
- git diff --check: correcto.

Nuevas suites unitarias: sesión legacy, guards legacy, HTTP legacy, concurrencia
HTTP, adaptador de sesión y preferencias de workspace (incluido el composable
legacy). Se amplía la suite del guard de arquitectura. Vitest reutiliza la
configuración Vite para resolver aliases y componentes Vue. Los E2E nuevos
cubren login válido/inválido, restauración y headers, logout, rutas públicas,
permisos por rol, babyUser, 401 concurrentes y mantenimiento activado/desactivado.

## Deuda y límites

Permanecen los avisos de build preexistentes: Browserslist antiguo, selector CSS
.flex-[2] inválido y chunk mayor de 500 kB. Se conserva la duplicación de sidebar
entre App y DefaultLayout para no introducir un cambio visual.

Los layouts, catálogo y flujos ajenos a sesión siguen legacy. La actualización
de preferencias en backend sigue en el store de usuario/composable existente.
La lectura bruta de roles de moderación es una fachada temporal: no unifica sus
reglas con los guards. No hay sincronización entre pestañas, refresh ni validación
proactiva del token, igual que antes. Los E2E validan frontend con API simulada;
la autorización real sigue siendo responsabilidad del backend.

## Archivos modificados o añadidos

- `docs/architecture-baseline.md`
- `docs/iteration-2-session.md`
- `playwright.config.ts`
- `scripts/architecture.mjs`
- `src/App.vue`
- `src/app/bootstrap/index.ts`
- `src/app/bootstrap/session.ts`
- `src/app/dependencies/identity.ts`
- `src/app/dependencies/workspace.ts`
- `src/app/layouts/AppShell.vue`
- `src/app/layouts/DefaultLayout.vue`
- `src/app/layouts/LoginLayout.vue`
- `src/app/router/index.ts`
- `src/app/router/sessionGuard.ts`
- `src/components/DiscCardComponent.vue`
- `src/composables/useDashboardConfig.ts`
- `src/layouts/default/components/SidebarMenu.vue`
- `src/main.ts`
- `src/modules/identity/application/session.ts`
- `src/modules/identity/index.ts`
- `src/modules/identity/infrastructure/loginApi.ts`
- `src/modules/identity/infrastructure/sessionStorage.ts`
- `src/modules/identity/presentation/authStore.ts`
- `src/modules/workspace/application/dashboardPreferences.ts`
- `src/modules/workspace/index.ts`
- `src/modules/workspace/infrastructure/dashboardStorage.ts`
- `src/modules/workspace/presentation/dashboardStore.ts`
- `src/router/index.ts`
- `src/services/api/api.ts`
- `src/services/auth/auth.ts`
- `src/shared/infrastructure/http/client.ts`
- `src/stores/auth/auth.ts`
- `src/views/password/PasswordChange.vue`
- `tests/e2e/maintenance.spec.ts`
- `tests/e2e/session.spec.ts`
- `tests/e2e/sessionFixtures.ts`
- `tests/unit/architecture.spec.ts`
- `tests/unit/httpLegacy.spec.ts`
- `tests/unit/httpSession.spec.ts`
- `tests/unit/routingLegacy.spec.ts`
- `tests/unit/sessionLegacy.spec.ts`
- `tests/unit/sessionPersistence.spec.ts`
- `tests/unit/workspacePreferences.spec.ts`
- `vitest.config.ts`
