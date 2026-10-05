# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Riff Valley app is a Vue 3 + TypeScript frontend application for managing music discs, artists, ratings, and content publishing. The app uses Vite for build tooling, Pinia for state management, Vue Router for routing, and Tailwind CSS (with custom RV brand colors) for styling. It integrates with Spotify API for artist data enrichment.

## Key Features

The application manages several interconnected features:

- **Discs Management** - Browse, rate, and manage music album releases with filters by date, genre, and country
- **Calendar Views** - Two calendar interfaces: standard user calendar and "baby" calendar for limited users
- **Ratings & Statistics** - User voting system with statistics dashboards and charts
- **Lists (Listas)** - Curated music lists with assignment management (riffValley role)
- **Reunions** - Meeting management with disc discussions (riffValley role)
- **Articles & Content Calendar** - Content publishing workflow with Kanban boards (riffValley role)
- **Spotify Integration** - Artist enrichment and playlist management
- **Week Recap & Videos** - Weekly content summaries and video management
- **User Management** - Admin interface for managing users and permissions (superUser role)
- **Import/Suggest** - Disc import tools (user) and suggestion submission (babyUser)

## Requirements

- **Node.js ≥ 20** (use nvm/nvm-windows)
- **Yarn v4** (via corepack, included with Node.js)

## Development Commands

```bash
# Install dependencies
corepack enable
yarn install --immutable

# Start dev server (runs on http://localhost:5173)
yarn dev

# Type-check and build for production
yarn build

# Preview production build
yarn preview
```

## Architecture

### Directory Structure

- **`src/views/`** - Page-level components organized by feature (articles, discos, list, reunions, statistics, etc.)
  - Many views have nested `components/` subdirectories for view-specific components
- **`src/components/`** - Reusable UI components (modals, filters, cards, etc.)
- **`src/services/`** - API service modules (one directory per resource: articles, auth, discs, users, etc.)
  - Special services: `api/api.ts` (axios instance), `swal/SwalService.ts` (notifications)
- **`src/stores/`** - Pinia state management stores (auth, asignation, user)
- **`src/router/`** - Vue Router configuration with route guards
- **`src/layouts/`** - Layout wrappers (default, auth, list, reunions)
- **`src/interfaces/`** - TypeScript type definitions
- **`src/helpers/`** - Utility functions (Spotify API integration, Swal helpers)
- **`src/assets/`** - Fonts and CSS files
- **`public/`** - Static assets served at root (logos, icons, avatars, backgrounds)

### Path Aliases

The following path aliases are configured (both in vite.config.ts and tsconfig.json):

```typescript
@/           → src/
@stores/     → src/stores/
@views/      → src/views/
@components/ → src/components/
@services/   → src/services/
@interfaces/ → src/interfaces/
@helpers/    → src/helpers/
@assets/     → src/assets/
```

**Always use these aliases** when importing to maintain consistency.

### API Architecture

All API calls go through the centralized axios instance at `src/services/api/api.ts`:

- Base URL configured via `VITE_API_BASE_URL` environment variable
- Automatic JWT token injection from auth store
- 401 response interceptor automatically logs out users and redirects to login
- Each resource has its own service module (e.g., `src/services/discs/discs.ts`)

### Authentication & Authorization

Authentication is handled by the auth store (`src/stores/auth/auth.ts`):

- **Token storage**: JWT token, username, userId, image, and roles array stored in both Pinia state and localStorage
- **Automatic token injection**: The axios instance (`src/services/api/api.ts`) automatically adds Bearer token to all requests
- **401 handling**: Response interceptor logs out user and redirects to login on 401 errors
- **Router guards**: Check `requiresAuth` and `requiresRole` route metadata
- **Role hierarchy**: `user`, `babyUser`, `riffValley`, `superUser`
  - `babyUser` has restricted access (cannot use `/import`, redirected to `/suggest`)
  - `riffValley` has content management access (articles, lists, reunions)
  - `superUser` has full admin access (user management, versions)
- **Maintenance mode**: When `VITE_MAINTENANCE_MODE=true`, all routes redirect to `/maintenance` page (except maintenance page itself)

### Routing

Vue Router configuration in `src/router/index.ts`:

- Uses `createWebHistory` (no hash routing)
- Route-level code splitting with dynamic imports
- Navigation guards for authentication and role-based authorization
- Nested routes for complex features (e.g., `/list`, `/reunions`)
- Special handling for babyUser restrictions

### Layouts

The app uses dynamic layout switching in `App.vue`:

- `DefaultLayout` - Main application layout with sidebar
- `LoginLayout` - Minimal layout for login and maintenance pages
- Sidebar visibility managed centrally, hidden on login/maintenance pages
- Body scroll locking when sidebar is open

### State Management

Pinia stores are used for global state:

- **auth store** - User authentication, token management, roles
- **asignation store** - Assignment-related state
- **user store** - User-specific data

Access stores via `useAuthStore()` pattern from `@stores/`.

### UI Framework

- **Tailwind CSS** with custom RV (Riff Valley) brand colors defined in `tailwind.config.js`:
  - `rv-pink`: #e46e8a
  - `rv-purple`: #b0669f
  - `rv-blue`: #0064d6
  - `rv-blueDark`: #00309b
  - `rv-navy`: #00021f (primary background)
  - `rv-white`: #ffffff
- **Custom utilities**:
  - `bg-rv-gradient`: Linear gradient (pink → purple → blue)
  - `shadow-rv`: Custom shadow for elevated elements
  - `font-brand`: Skaters font (logo/brand text)
- **Global components** registered in `main.ts`:
  - `VueDatePicker` - Date picker component
  - `font-awesome-icon` - FontAwesome icons
- **Third-party libraries**: VueSweetalert2, vue3-toaster, FullCalendar, Chart.js, CircleFlags

## Commit Conventions

This project uses **Conventional Commits** enforced by commitlint and husky hooks.

### Format

```
<type>(<scope>): <description>
```

### Allowed Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code formatting (no logic changes)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Test changes
- `build` - Build system or dependency changes
- `ci` - CI/CD configuration
- `chore` - Maintenance tasks
- `revert` - Revert previous commit

### Breaking Changes

Use `!` suffix or `BREAKING CHANGE:` footer:

```bash
feat(api)!: eliminate endpoint /users/old
# or
feat(api): eliminate endpoint /users/old

BREAKING CHANGE: clients must use /users/v2
```

### Semantic Release

This project uses semantic-release with:

- Branches: `main`, `ordenacion`
- Automatic versioning based on commit types
- Changelog generation in Spanish
- GitHub releases
- Version bumps committed automatically with `[skip ci]`

## TypeScript Configuration

- Strict mode enabled
- Module resolution: node16
- Target: ESNext
- Type checking enforced in build (`yarn vue-tsc --noEmit && yarn vite build`)

## Code Patterns

### Service Layer Pattern

Each API resource has a dedicated service file with TypeScript interfaces and functions:

```typescript
// src/services/discs/discs.ts
import api from "@services/api/api.ts";

export interface Disc {
  id: string;
  name: string;
  artist: Artist;
  releaseDate: string;
  // ...
}

export async function getDiscs(
  limit: number,
  offset: number,
  query?: string,
  dateRange?: any,
  genre?: string
): Promise<DiscsResponse> {
  const response = await api.get<DiscsResponse>("/discs", {
    params: { limit, offset, query, dateRange, genre },
  });
  return response.data;
}
```

Services export both interfaces and async functions that return typed responses.

### Component Organization

- Views are feature-specific pages
- Components are reusable UI elements
- Complex features may have nested `components/` subdirectories
- Modal components typically suffixed with `Modal.vue`

### Role-Based Rendering

Check roles in components using the auth store:

```typescript
import { useAuthStore } from '@stores/auth/auth';

const authStore = useAuthStore();
if (authStore.hasRole('riffValley')) {
  // Show admin features
}
```

### User Notifications

Use the centralized SwalService for user notifications:

```typescript
import SwalService from "@services/swal/SwalService";

// Success toast (top-right, 3s auto-close)
SwalService.success("Disco guardado correctamente");

// Error toast
SwalService.error("No se pudo eliminar el disco");

// Confirmation dialog
const result = await SwalService.confirm("¿Eliminar este disco?", "Sí, eliminar", "Cancelar");
if (result.isConfirmed) {
  // User confirmed
}
```

All messages are in Spanish. The service is located at `src/services/swal/SwalService.ts`.

### Spotify Integration

The app integrates with Spotify API via helper functions in `src/helpers/SpotifyFunctions.ts`:

- `obtenerTokenSpotify()` - Gets Spotify access token using client credentials flow
- `obtenerEnlaceArtistaSpotify(artistName)` - Searches for artist and returns Spotify link

These functions require Spotify API credentials (see Environment Variables section).

## Environment Variables

Required environment variables (create a `.env` file - not tracked in git):

```bash
# Backend API
VITE_API_BASE_URL=https://api.example.com

# Spotify API (for artist enrichment)
VITE_CLIENT_ID=your_spotify_client_id
VITE_CLIENT_SECRET=your_spotify_client_secret

# Optional: Enable maintenance mode
VITE_MAINTENANCE_MODE=false
```

Contact the team for actual credentials.

## CI/CD

The project uses GitHub Actions for automated releases:

- **Workflow**: `.github/workflows/release.yml`
- **Trigger**: Pushes to `main` branch
- **Process**: Runs semantic-release to generate changelog, bump version, create GitHub release, and commit version files with `[skip ci]`
- **Branches configured for release**: `main`, `ordenacion`

The workflow uses Node.js 20 and yarn v4 via corepack.

## Important Notes

### Language
- The application UI and all user-facing messages are in **Spanish**
- Code comments and documentation may be in Spanish or English
- All SwalService messages, form labels, and notifications should be in Spanish

### Path Imports
- Always use path aliases (`@services/`, `@components/`, etc.) for imports
- Some legacy imports use absolute paths from root (e.g., `/src/services/...`) - prefer aliases for new code
- Note: `@assets` alias incorrectly points to `src/helpers` (bug in vite.config.ts line 15)

### Authentication Flow
- Auth state persists across page refreshes via localStorage
- On app mount, `authStore.initializeAuth()` should be called to restore axios headers
- Router guards run before every navigation to check auth/roles
- babyUser role has inverted logic: restricted from certain routes that regular users can access

### Data Patterns
- Most list views use pagination with `limit` and `offset` parameters
- Date ranges are commonly used filters across disc/content queries
- Country filtering uses both `country` and `countryId` parameters (sent together)

### Modal Pattern
- Modals typically use Vue 3 Composition API with `ref` for visibility state
- SweetAlert2 modals (via SwalService) are preferred for simple confirmations
- Complex forms use dedicated modal components (e.g., `EditModal.vue`)

### Husky Hooks
- **commit-msg**: Validates commit messages with commitlint
- Commits that don't follow conventional commit format will be rejected
- Use `git commit -m "type(scope): message"` format always
- **pre-commit**: Currently only logs a message (no actual checks)
