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

## Spotify para playlists de festivales

El callback se configura en el backend, no como variable `VITE_`:

```text
SPOTIFY_FRONTEND_REDIRECT_URL=https://app.riffvalley.es/riff-valley-playlists/festivales
```

La app usa OAuth a través del backend; no incluyas secretos de Spotify en el bundle frontend.
