# Editorial — Frontend

Este índice agrupa auditorías y roadmaps de capacidades editoriales frontend. Editorial es un dominio futuro de organización, no una autorización para fusionar capacidades que hoy tienen contratos y owners distintos.

- [Content Calendar en tiempo real (SSE-4)](content-calendar-realtime.md): consumidor frontend del contrato backend; SSE-4 completada, SSE-5 no iniciada.
- [Reunions y Points (R-1-BE–R-5)](reunions.md): backend y frontend completados, SSE aceptado manualmente; estado global CERRADO.
- [Radar y Mejores del Mes (RM-1–RM-5)](radar-mejores.md): RM-1–RM-5 completadas; Radar y Mejores del Mes están cerrados. La página conserva la evidencia histórica, aceptación funcional y límites del cierre.

## Alcance conocido

- [Content Calendar (E-CC)](content-calendar.md): auditoría del calendario editorial `/content-calendar`, sus consumidores reales y plan de trabajo. No corresponde al calendario de lanzamientos de discos.
- **Artículos, vídeos, reuniones, listas, playlists y otras capacidades editoriales:** se incorporarán aquí solo cuando se auditen o planifiquen de forma explícita. La mención en el inventario histórico de [arquitectura frontend](../../docs/frontend/architecture.md) no sustituye una auditoría por capacidad.

## Límites y fuentes existentes

- La arquitectura frontend vigente está en [docs/frontend/architecture.md](../../docs/frontend/architecture.md). El código legacy convive con módulos por capacidad; este índice no impone una estructura uniforme.
- El backend ya mantiene su propia auditoría de Editorial en `riffvalley-app-back/roadmap/backend-cleanup/editorial/`. En particular, `videos-contents.md` registra BC-CNT-0 y el estado completado del backend Contents. Este roadmap frontend no duplica ese historial ni reabre sus tareas.
- El roadmap de [Catalog — Calendario](../catalog/calendar.md) cubre exclusivamente calendarios de lanzamientos; `/content-calendar` permanece fuera de su alcance.

Cada iniciativa nueva debe tener su propia página cuando aporte hallazgos, decisiones o tareas; este índice ofrece un punto de entrada y no replica ese contenido.
