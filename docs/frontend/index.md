# Documentación del frontend

Este índice separa las referencias técnicas vigentes de la planificación y el historial de iniciativas. Las rutas marcadas como **pendientes** son destinos acordados, pero todavía no contienen documentación publicada.

El índice y el README son las entradas generales del frontend; arquitectura, convenciones e Identity tienen fuentes canónicas. Los roadmaps enlazados conservan análisis, decisiones de iniciativa e historial.

## Fuentes disponibles

- [README del repositorio](../../README.md): entrada al proyecto, requisitos e instalación.
- [AGENTS.md](../../AGENTS.md): instrucciones breves y neutrales para agentes; Claude Code puede requerir una indicación explícita para leerlo.
- [Roadmaps](../../roadmap.md): índice de iniciativas y documentación histórica.
- [Calidad frontend](../../roadmap/frontend-quality.md): registro de auditoría y diseño de FQ; conserva los criterios acordados y el progreso de la migración documental.
- [Arquitectura frontend](architecture.md): límites y reglas vigentes; la planificación original se conserva en su roadmap histórico.
- [Convenciones frontend](conventions.md): requisitos, comandos, controles, hooks y límites de validación vigentes.
- [Sistema de diseño](../design-system.md): guía canónica de estilos para desarrollos actuales y futuros; el [roadmap de Dashboard](../../roadmap/dashboard.md) registra la auditoría y las correcciones aceptadas. Dashboard está cerrado; DS-4e–DS-4j se descartaron y DS-5 se canceló por decisión del usuario.
- [Módulo Identity](modules/identity.md): ownership, exports públicos, sesión, permisos y dependencias vigentes.
- [Roadmap histórico de arquitectura](../../roadmap/frontend-architecture.md): análisis, decisiones y planificación de iteraciones, conservados para trazabilidad.
- [Estructura histórica de Identity](../../roadmap/identity-structure.md): inventario y reorganización conservados; la estructura y los contratos vigentes están en la página canónica del módulo.
- [Lógica histórica de Identity](../../roadmap/identity-logic.md): auditoría y decisiones de iniciativa, conservadas para trazabilidad.
- [Migración histórica de roles](../../roadmap/roles.md) y [su inventario](../../roadmap/roles-inventory.md): decisiones y matriz de regresión conservadas; la jerarquía y los guards vigentes están en la guía de Identity.
- [Migración histórica de sesiones renovables](../../roadmap/renewable-sessions.md): decisiones de rollout y resultados conservados; el comportamiento actual de App está en la guía de Identity.

Los roadmaps conservan su propósito histórico y de planificación. Una afirmación técnica dentro de ellos no se considera vigente automáticamente; consulta la fuente canónica enlazada para cada responsabilidad.

## Fuentes canónicas previstas

- **Arquitectura y límites vigentes:** [docs/frontend/architecture.md](architecture.md) — publicada.
- **Comandos y convenciones:** [docs/frontend/conventions.md](conventions.md) — publicada.
- **Sistema visual y compatibilidad de temas:** [docs/design-system.md](../design-system.md) — publicada tras DS-2; la nomenclatura de tokens semánticos sigue siendo propuesta y no está implementada.
- **Ownership y contratos de Identity:** [docs/frontend/modules/identity.md](modules/identity.md) — publicada.
- **Decisiones arquitectónicas duraderas:** `docs/frontend/adr/` — se habilitará solo cuando exista un ADR real; todavía no hay ADR publicado.
- **Planificación e historial:** `roadmap/` — disponible; cada iniciativa mantiene su registro en su roadmap.
- **Entrada al repositorio:** `README.md` — disponible.
- **Instrucciones breves para agentes:** [AGENTS.md](../../AGENTS.md) — publicado en FQ-4; punto de entrada a las fuentes canónicas.
