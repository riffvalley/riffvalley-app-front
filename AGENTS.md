# Instrucciones para agentes

Riff Valley es una aplicación frontend Vue 3 y TypeScript. Usa este archivo para orientarte; las reglas detalladas viven en las fuentes canónicas:

- [Índice del frontend](docs/frontend/index.md) para navegar la documentación.
- [Arquitectura](docs/frontend/architecture.md) para ownership, dependencias, capas y estado.
- [Convenciones](docs/frontend/conventions.md) para comandos, hooks y controles de calidad.
- [Sistema de diseño](docs/design-system.md) antes de crear o modificar UI; sus requisitos de compatibilidad claro/oscuro y accesibilidad son obligatorios.
- [Identity](docs/frontend/modules/identity.md) para sus contratos y comportamiento implementado; consúltala al trabajar en `src/modules/identity/`.
- [Roadmaps](roadmap.md) y el roadmap específico de la iniciativa —por ejemplo, [calidad frontend](roadmap/frontend-quality.md)— para alcance, tareas y evidencia histórica.

## Organización del código

- Asigna cada capacidad a un owner por funcionalidad. Usa sus contratos públicos en cruces entre capacidades y reserva internals para el mismo owner y sus pruebas.
- Mantén presentación, transporte/API y estado en responsabilidades claras. Usa estado local para interacción efímera, Pinia para estado cliente compartido con ciclo de vida y TanStack Query para datos remotos cacheables cuando aporte valor.
- Comparte código solo cuando haya semántica y ownership transversales. No impongas una estructura uniforme ni una arquitectura DDD completa.
- El código legacy convive con `src/modules/`; migra por capacidad y conserva contratos existentes durante la transición. Consulta Arquitectura antes de proponer cruces o nuevas abstracciones.

## Herramientas

Usa Node.js **24.22.1** y pnpm **11.28.8**. Los comandos principales, verificados en `package.json`, son:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm run typecheck
pnpm test
pnpm build
pnpm preview
```

Ejecuta pruebas proporcionales al cambio de comportamiento; typecheck para cambios TypeScript/Vue o de su configuración; build para cambios funcionales o de configuración que afecten al empaquetado, según el alcance de la tarea. En cambios solo documentales, prioriza el checker Markdown y `git diff --check`. Consulta Convenciones para los quality gates, su alcance y sus límites: un resultado local no acredita una ejecución real de GitHub Actions.

## Límites operativos

- Conserva los cambios existentes que no pertenecen a la tarea y no amplíes su alcance.
- No modifiques backend ni Wiki salvo petición explícita.
- No ejecutes despliegues, migraciones ni operaciones remotas sin autorización explícita.
- No toques ni restaures `.aws` salvo petición expresa.
- No corrijas deuda preexistente o hallazgos de atribución desconocida fuera del alcance.
- No atribuyas un hallazgo al cambio sin una comparación base/head fiable; si la comparación está incompleta, registra esa limitación y consulta Convenciones.
- No modifiques `.impeccable/config.json` para ocultar o suprimir hallazgos.

## Revisión humana

Al revisar un cambio, considera ownership y dirección de dependencias; contratos públicos y permisos —los guards de frontend no sustituyen la autorización del servidor—; elección razonable entre estado local, Pinia y Query; accesibilidad, foco y navegación por teclado; y pruebas acordes al riesgo. Estos criterios requieren juicio contextual y no son reglas automáticas completas. Registra por separado qué se comprobó localmente y qué se validó realmente en GitHub Actions.
