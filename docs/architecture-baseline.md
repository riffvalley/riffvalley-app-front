# Baseline de arquitectura

La Iteración 0 registra estas puertas para separar problemas preexistentes de
los introducidos por recorridos migrados. El baseline inicial de `yarn build`
y `yarn typecheck` pasa. El build avisa de datos Browserslist antiguos, una
clase Tailwind con sintaxis CSS inválida (`.flex-[2]`) y un chunk superior a
500 kB; estos avisos no bloquean el build.

## Alcance inicial de las puertas

`yarn lint` y `yarn architecture` aplican reglas estrictas a código nuevo o
migrado en `src/app/**`, `src/modules/**` y `src/shared/**`. Los ciclos solo se
evalúan dentro de ese conjunto; las dependencias externas a él se consideran
fronteras legacy y deben consumirse mediante fachadas públicas.

Excepciones legacy iniciales, limitadas a las carpetas existentes que aún no
se han migrado:

- `src/views/**`, `src/components/**` y `src/layouts/**`: presentación antigua;
  puede contener llamadas HTTP directas y dependencias de proveedores.
- `src/services/**` y `src/helpers/**`: servicios HTTP y acceso directo a
  proveedores que se sustituirán progresivamente por adaptadores.
- `src/stores/**` y `src/composables/**`: estado y coordinación reactiva que
  pueden conservar dependencias legacy mientras no se migre su recorrido.
- `src/router/index.ts`, `src/main.ts` y `src/App.vue`: fachadas y entrada
  conservadas tras la Iteración 2; la composición concreta vive en `src/app`.

Estas rutas no desactivan reglas globales para archivos nuevos. Al migrar una
capacidad, su implementación entra en las rutas verificadas; las excepciones
se eliminan por recorrido y no se amplían para admitir nuevas infracciones.

## Comprobaciones iniciales

- `yarn lint`: aplica ESLint al código de tooling y a las rutas arquitectónicas.
- `yarn architecture`: comprueba imports entre capas y módulos, HTTP en
  presentation, dependencias de framework en domain/application, `any` y ciclos.
  El checkout aún no contiene esos directorios y por eso verifica cero archivos;
  siete pruebas unitarias ejercitan los rechazos y excepciones del guard.
- `yarn typecheck`: ejecuta `vue-tsc --noEmit` sin compilar el bundle.
- `yarn test`: ejecuta pruebas unitarias del guard; Vue Test Utils está
  disponible para pruebas de componentes migrados.
- `yarn test:e2e`: ejecuta un recorrido público de login con las rutas API
  simuladas, sin credenciales ni dependencia del backend. Requiere instalar
  Chromium una vez con `yarn playwright install chromium`.
- `yarn verify`: ejecuta lint, architecture, typecheck, test y build una vez.

La autorización y validación de permisos continúan siendo responsabilidad del
backend. Estas comprobaciones controlan límites del frontend y no demuestran la
seguridad de la API.

## Iteración 2 — Composición, HTTP e identity/session

El transporte concreto vive en `shared/infrastructure/http/client.ts`, sin
imports de Pinia ni Vue Router. `services/api/api.ts` conserva una fachada al
mismo singleton para los servicios existentes. Cada cliente registra una pareja
de interceptores al crearse; configurar callbacks no registra interceptores.

`app/bootstrap/session.ts` conecta el token y la versión de sesión en memoria
con logout y navegación a Login, después de disponer de Pinia y antes de instalar
el router. Las respuestas 401 de una versión anterior se rechazan sin invalidar
la sesión actual. La limpieza y la navegación concurrentes se coordinan mediante
una promesa; todos los errores HTTP originales siguen llegando al consumidor.

`identity` posee sesión, avatar y roles, un puerto de persistencia y el adaptador
HTTP de login. Su store de presentación recibe dependencias; no importa HTTP,
storage del navegador ni router. `workspace` posee provisionalmente las tres
preferencias del dashboard, sin crear un dominio independiente. `app` inicializa
estas preferencias con la respuesta de login y las limpia al cerrar sesión.

Persistencia conservada: token, username, userId e image son strings; roles se
escribe como JSON y también se restaura desde el antiguo formato separado por
comas. Los nombres y formatos de dashboardButtonsEnabled, dashboardConfig y
mobileDashboardConfig siguen siendo los mismos. La migración de
rv_dashboard_config conserva su lógica desktop en el composable legacy. Las
lecturas de roles para moderación y del avatar de perfil pasan por el adaptador
con su valor bruto, conservando las interpretaciones particulares existentes.

El router y sus guards viven en app. La definición de rutas es idéntica a la
anterior: imports diferidos, nombres, paths, redirects, props, query params,
layouts anidados y permisos. Main sigue siendo la entrada. El shell se ensambla
en app/layouts; los layouts existentes se consumen mediante fachadas pequeñas.

El guard arquitectónico reconoce el módulo propietario de sus barrels index.ts.
Así pueden publicar sus propios símbolos sin confundirse con imports entre
módulos; sigue rechazando internals ajenos. Una prueba cubre aceptación y rechazo,
sin nuevas excepciones ni ignore paths.

Deuda conservada: los layouts y recorridos ajenos a sesión mantienen código
legacy; el guard no sustituye autorización del backend. La escritura de
preferencias en backend continúa en el recorrido legacy de usuario/composable.
No se migra catálogo ni se comienza la Iteración 3. Los avisos iniciales de build
(Browserslist, .flex-[2] y chunk grande) siguen presentes.
