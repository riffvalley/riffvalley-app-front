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
- `src/router/**`, `src/main.ts` y `src/App.vue`: composición y ciclo de sesión
  existentes, pendientes de la Iteración 2.

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
