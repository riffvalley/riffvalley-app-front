# 🎵 Riff Valley App — frontend

Entrada para instalar y arrancar el frontend. La documentación vigente está en el [índice del frontend](docs/frontend/index.md); la planificación y el historial se mantienen en [`roadmap.md`](roadmap.md).

## Requisitos

- Node.js **24.22.1**, fijado en `.nvmrc`.
- pnpm **11.28.8**, seleccionado por Corepack desde `package.json`.

## Instalación y desarrollo

Desde la raíz del repositorio:

```sh
nvm use 24.22.1
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Vite suele servir la app en `http://localhost:5173/`.

La app necesita `VITE_API_BASE_URL` para comunicarse con el backend. `VITE_MAINTENANCE_MODE=true` activa la vista de mantenimiento; déjalo sin definir o en `false` para el uso normal. Los valores dependen del entorno; solicita la URL correspondiente al equipo.

## Comandos principales

- `pnpm run typecheck` — comprueba tipos de TypeScript y Vue.
- `pnpm test` — ejecuta Vitest.
- `pnpm build` — comprueba tipos y genera `dist/`.
- `pnpm preview` — sirve localmente la build generada.

Consulta [Convenciones del frontend](docs/frontend/conventions.md) para lint, formato, controles de arquitectura, enlaces y hooks. Las reglas vigentes están en [Arquitectura](docs/frontend/architecture.md) y los contratos de Identity en su [guía de módulo](docs/frontend/modules/identity.md). Las instrucciones operativas para agentes están en [AGENTS.md](AGENTS.md). Claude Code puede no leerlo automáticamente; si se utiliza, indícale expresamente que lo lea antes de trabajar.

### API de producción desde el entorno local

El checkout incluye `.env.example` para ejecutar la interfaz local contra el
backend desplegado. Copia ese archivo al entorno de desarrollo local, que está
ignorado por Git:

```bash
cp .env.example .env.development.local
pnpm dev
```

La configuración usa `VITE_API_BASE_URL=/api` y `API_PROXY_TARGET` con el
origen HTTPS de la API aprobada. Vite reenvía solo `/api`, `/api/...` y `/api?...`
durante `pnpm dev`; mantiene el prefijo y las cabeceras de autenticación, CSRF
y operación de refresh. Sobrescribe `Origin` con el HTTPS exacto de Riff Valley App para
`refresh-v1`. Pasa `Set-Cookie` sin reescribirlo; el navegador guarda la cookie
host-only bajo `localhost`, aislada de la cookie del API publicada. El
navegador sigue comunicándose solo con `localhost`. El proxy no se incluye en
`pnpm build`. Si cambia el host de la API, actualiza `API_PROXY_TARGET` en
`.env.development.local`; los destinos nuevos deben añadirse a la allowlist de
`vite.config.ts` tras verificarlos.

Requisitos y límites:

- Node.js 24 y pnpm 11, como en el resto del proyecto. No hace falta
  instalar ni arrancar NestJS, PostgreSQL o integraciones externas localmente.
- La primera ejecución requiere `pnpm install --frozen-lockfile` si aún no están
  instaladas las dependencias.
- El backend debe tener desplegado el contrato `refresh-v1` y su feature gate
  configurado para App. La configuración local no altera CORS ni habilita ese
  gate. Las cookies llevan `Secure`, `HttpOnly`, `SameSite=Lax` y prefijo
  `__Secure-`. [MDN documenta](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#secure)
  que el tratamiento de cookies `Secure` en HTTP
  localhost no es compatible con Safari; para Safari hace falta servir Vite
  por HTTPS con un certificado local de confianza. Este ejemplo no genera ni
  instala ese certificado.
- Inicia sesión con la cuenta habitual. Los roles y permisos los determina el
  backend. Las sesiones de la App y Wiki permanecen separadas por su origen y
  cookie.
- Este modo usa los endpoints normales y permite escrituras si la cuenta tiene
  permiso. Altas, cambios y borrados afectan a producción y sus datos reales.
  No uses operaciones de escritura como comprobación de conectividad.
- Para comprobar el destino, revisa `VITE_API_BASE_URL` y `API_PROXY_TARGET`
  en `.env.development.local`; en DevTools las solicitudes deben ir a
  `http://localhost:5173/api/...`. No pongas contraseñas ni tokens en archivos
  versionados. El archivo local está ignorado por Git.
- La configuración por defecto selecciona la API Heroku actualmente usada por
  App. No se siguen redirecciones de API al host público desde el navegador: si
  un endpoint responde con una redirección absoluta, se debe comprobar el
  destino y el contrato antes de usarlo desde el flujo local.

Comprobación read-only de Heroku, 24 de octubre de 2026: release actual `v348`
(deploy `27af5aa6`), `AUTH_SESSION_MODE_ENABLED=true` y los Origins de App y
Wiki configurados con sus hosts HTTPS canónicos. La release indica el gate
activo, pero su commit no está en el repositorio local consultado; hay que
confirmar el código desplegado antes de atribuirle los contratos actuales de
cookies y CSRF. No se han cambiado variables ni desplegado código.

Sin `API_PROXY_TARGET`, Vite no crea el proxy. Solo se aceptan destinos HTTPS
de la allowlist. Para usar otro API, añade primero su origen verificado a esa
allowlist y luego configura la variable, manteniendo `VITE_API_BASE_URL=/api`.

## Spotify para playlists de festivales

El callback se configura en el backend, no como variable `VITE_`:

```text
SPOTIFY_FRONTEND_REDIRECT_URL=https://app.riffvalley.es/riff-valley-playlists/festivales
```

La app usa OAuth a través del backend; no incluyas secretos de Spotify en el bundle frontend.

## Convenciones de commits

Este proyecto usa [Conventional Commits](https://www.conventionalcommits.org).
Todos los commits deben seguir este formato:

```
<tipo>(<scope>): <descripción>
```

### Tipos permitidos

- **feat** → nueva funcionalidad
- **fix** → corrección de bug
- **docs** → cambios en documentación
- **style** → cambios de formato (espacios, comas, etc., sin afectar la lógica)
- **refactor** → cambios en el código que no corrigen errores ni añaden funcionalidades
- **perf** → mejoras de rendimiento
- **test** → añadir o modificar tests
- **build** → cambios en el sistema de build o dependencias
- **ci** → cambios en la configuración de CI
- **chore** → mantenimiento general, sin afectar código de producción
- **revert** → revertir un commit previo

### Ejemplos

```bash
feat(auth): añade login con Google
fix(ui): corrige padding en el header
docs(readme): añade guía de instalación
refactor(api): simplifica validación de usuarios
```

-

### Breaking Changes

Si un cambio rompe compatibilidad, márcalo de una de estas formas:

```bash
feat(api)!: elimina el endpoint /users/old
```

o con un footer:

```
feat(api): elimina el endpoint /users/old

BREAKING CHANGE: los clientes deben usar /users/v2
```

Esto hará que la versión suba a **major** automáticamente (ej: de `1.2.3` → `2.0.0`).
