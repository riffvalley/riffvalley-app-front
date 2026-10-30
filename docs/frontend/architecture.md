# Arquitectura del frontend

Este documento es la referencia canónica para los límites generales del frontend: ownership, dependencias y estado. Las reglas aprobadas aplican a código nuevo y a las zonas que se migren; el legado se incorpora de forma gradual. El estado descrito corresponde al checkout revisado el 28 de octubre de 2026.

La auditoría y el plan de migración originales se conservan en [roadmap/frontend-architecture.md](../../roadmap/frontend-architecture.md). Los contratos y dependencias propios de Identity están en la [documentación canónica del módulo](modules/identity.md).

## Principios de organización

- **Ownership por capacidad.** Cada vista, componente, composable, API, tipo y estado tiene un módulo responsable. La ubicación de renderizado no determina por sí sola quién posee el dato o contrato.
- **Estructura flexible.** Se agrupa por funcionalidad y se crean subcarpetas cuando separan responsabilidades reales. No se impone una forma idéntica a todos los módulos ni una arquitectura DDD completa.
- **Responsabilidades separadas.** La presentación coordina la interacción; el transporte HTTP adapta la comunicación remota; el estado compartido tiene un owner y ciclo de vida explícitos.
- **Compartir con semántica y owner comunes.** Reutilizar una pieza visual no transfiere la propiedad del dato de negocio. `shared` se reserva a contratos o utilidades transversales con consumidores y significado comunes.
- **Migración gradual.** `src/views/`, `src/services/`, `src/stores/`, `src/composables/`, `src/components/` y otras raíces legacy conviven con `src/modules/`. Se conservan sus contratos mientras se migra por capacidad; no se requiere mover el producto completo antes de aplicar límites en módulos adoptados.

Actualmente `src/modules/` contiene `identity/`, dividido en `auth`, `account`, `users`, `activity` y `shared`; `dashboard/`, con la composición y los once widgets de Dashboard; y las capacidades `catalog/top-discs/`, `catalog/discs/`, `catalog/artists/` y `catalog/calendar/`. Esta estructura concreta refleja ownership, no una plantilla obligatoria. TopDiscs compone su vista en `catalog/top-discs/presentation/views/TopDiscsView.vue` y conserva el acceso público `/rankings`. La lista general compone `/disc-list` en `catalog/discs/presentation/views/DiscListView.vue`; `application/useDiscListCoordinator.ts` posee criterios, resultados, paginación y consultas privadas de resultados/opciones, con identidades que incluyen usuario y generación de sesión. `api/discList.ts` consume los endpoints dedicados y `application/loadDiscList.ts` adapta los seis modos y sus filas a DiscCard, conservando comentarios repetidos. País y géneros se cargan con filtros cruzados desde el servicio de listado, sin usar el catálogo global de Pinia como fuente de esta vista. Artistas organiza transporte y contratos en `api/` y `types/`, coordinación en `application/`, y vistas/componentes en `presentation/`; su `index.ts` publica una API deliberadamente pequeña para Dashboard y Discos. Calendario organiza en `presentation/` sus vistas y tarjetas diferenciadas; su `index.ts` publica únicamente `DiscCalendar` para la integración embebida de DiscCard. Mantiene como excepción transitoria la consulta fechada desde el servicio legacy compartido de Discos, ya que ese módulo no ofrece una interfaz pública equivalente. `DiscCardComponent.vue`, `DiscFilters.vue` y `SearchableSelect.vue` siguen en sus ubicaciones compartidas legacy porque tienen consumidores transversales; DiscList añade un selector de género específico y una variante no disruptiva de `DiscFilters`. Las demás áreas de Catalog, Community y Editorial continúan distribuidas en el código legacy. La reorganización de Dashboard quedó cerrada en [su roadmap](../../roadmap/dashboard.md); no define una plantilla obligatoria para otros dominios.

La capacidad **Estadísticas** está cerrada en `src/modules/statistics/` y `src/views/statistics/`: `types/` refleja los DTOs anuales, `api/` usa Axios autenticado compartido, y `application/` coordina filtros y consultas TanStack Query aisladas por usuario, generación de sesión, año y zona horaria. La vista compone secciones presentacionales sin acceso directo al transporte; la galaxia se consulta solo al abrir su modal. El alcance y la validación frontend están en el [roadmap de Estadísticas](../../roadmap/statistics.md). La validación SQL PostgreSQL sigue pendiente en backend.

## Responsabilidad por tipo de pieza

| Pieza | Responsabilidad | Criterio práctico y excepción |
|---|---|---|
| **View** | Componer una pantalla, conectar navegación, derivar estado de presentación y coordinar interacciones. | Puede orquestar un flujo con varias fuentes. Extraer reglas reutilizadas o política de transporte cuando tengan owner propio; no medir por cantidad de líneas. |
| **Component** | Presentar UI y comunicar intención mediante props/emits. Mantener estado visual temporal y local. | Un componente de funcionalidad puede conocer su contrato. No convertirlo en biblioteca genérica por tener consumidores parecidos sin semántica compartida. |
| **Composable** | Encapsular comportamiento reactivo cohesivo, reutilizado o difícil de probar dentro de una vista: ciclo de vida, watchers, consultas o mutaciones. | Una operación corta de una sola vista puede permanecer en ella. No se exige un composable por vista. |
| **API** | Hablar con el transporte HTTP y adaptar parámetros/respuestas al contrato remoto. Aceptar `AbortSignal` cuando el trabajo pueda cancelarse. | Puede ser una función pequeña junto a su owner. No presenta UI ni administra la caché de Query. Los servicios legacy siguen siendo válidos durante la transición. |
| **Pinia** | Mantener estado de cliente compartido con ciclo de vida definido, como sesión o preferencias persistidas. | Una store legacy puede continuar mientras se migra. No copiar resultados de Query ni globalizar filtros, drafts o modales efímeros. |
| **TanStack Query** | Poseer estado remoto cacheable: carga, error, datos, claves, cancelación e invalidación. | No toda petición requiere Query. Acciones puntuales o datos sin reutilización pueden usar una función API directa cuando la UX y consistencia lo permitan. |
| **Utils** | Ofrecer transformaciones puras y deterministas sin estado reactivo, transporte ni efectos secundarios. | Una función local pequeña permanece junto a su owner. No usar `shared` como cajón de sastre. |
| **Types** | Pertenecer a la funcionalidad que define el payload, respuesta o concepto de dominio; los tipos de UI viven cerca de su UI. | Un tipo transversal se expone mediante contrato público o un área compartida justificada. Evitar DTOs duplicados y tipos genéricos que borren significado. |

Estas responsabilidades son criterios de diseño, no reglas de ubicación mecánicas. Una excepción es válida para composición de aplicación, consumo de un contrato publicado o acoplamiento legacy transitorio con owner y ruta de migración claros.

## Dependencias y contratos

### Dirección permitida

- Una funcionalidad puede usar su propia implementación interna.
- Una funcionalidad puede depender de la **entrada pública** de otra cuando necesita esa capacidad y la dirección no crea un ciclo.
- Las dependencias entre funcionalidades deben permanecer dirigidas y acíclicas. Si un flujo necesita coordinar owners, la composición se realiza en App, bootstrap o Router, o mediante un contrato/evento de bajo nivel.
- Las capas de presentación pueden consumir componentes, composables, APIs o estado de su owner. Las capas de datos no importan vistas ni componentes.
- `shared` puede contener contratos realmente transversales, pero no depende de funcionalidades concretas ni recibe una pieza solo por conveniencia.

### Entradas públicas e imports privados

Un contrato público es la superficie pequeña y deliberada que permite consumir una capacidad sin conocer sus carpetas internas. En los módulos adoptados se publica desde una entrada explícita, como `src/modules/identity/auth/index.ts`; no se exporta toda la implementación ni se crea un barrel raíz indiscriminado.

Por defecto, las rutas a `api/`, `stores/`, `composables/`, `types/`, vistas, componentes y helpers internos son privadas para consumidores externos. Los imports profundos entre archivos del mismo owner son normales. Los tests pueden importar internals para verificar implementación; se evalúan aparte de las dependencias de producción.

El checkout ya contiene `index.ts` para `identity/auth`, `account`, `users`, `activity` y `shared`. La mayoría de los cruces productivos usa estas entradas. Router importa directamente siete vistas/layouts de Identity para declarar rutas; el gate actual registra esos paths como excepciones de composición. Los exports, consumidores y dependencias concretos están descritos en la [guía canónica de Identity](modules/identity.md).

### Composition roots y legacy

`src/main.ts` es el composition root de bootstrap: crea Vue y Pinia, instala Query, conecta las callbacks de sesión del cliente HTTP y registra listeners de sesión antes de iniciar la navegación del Router. Esa conexión explícita permite que el transporte reciba la sesión sin importar la store Auth.

`src/App.vue` compone shell, Router, Auth y el store legacy de catálogo. `src/router/index.ts` conecta rutas, vistas y capacidades públicas de Auth/permisos; los imports directos de vistas de Identity son la excepción de ruta indicada arriba. Estas zonas pueden coordinar piezas para iniciar la aplicación, pero no autorizan a otros módulos a importar internals de sus vecinos.

El código legacy aún comparte componentes, servicios y stores entre áreas. Sus dependencias conocidas son deuda en transición, no una arquitectura de módulos completa. Al migrar una capacidad, se define su owner y se migran consumidores observados de forma incremental; no se bloquea de golpe el grafo global sin clasificar owners y baseline.

## Estado y datos

### Estado local y estado compartido

- **Estado local de Vue:** formularios, filtros temporales, selección, drafts, paginación de presentación y visibilidad de modales pertenecen a la vista/componente que los usa.
- **Pinia:** sesión, identidad mínima y preferencias de cuenta persistidas son estado de cliente compartido con ciclo de vida explícito. Auth permanece en Pinia; Query no controla la sesión ni almacena credenciales.
- **TanStack Query:** respuestas remotas reutilizables, loading/error y caché pertenecen a Query cuando su caché, deduplicación, cancelación o refetch aportan valor. No se refleja el mismo resultado en Pinia.

La aplicación instala un único `QueryClient` desde `src/app/queryClient.ts`. En el código actual, Query se usa sobre todo en Users y Activity de Identity; el resto de las pantallas conserva servicios, Pinia o carga local legacy. La migración a Query se decide por caso, no se presume para todo el frontend.

### Claves, cancelación e invalidación

Las claves de Query identifican los parámetros que determinan el resultado y, para datos privados, el contexto de identidad/permisos necesario para evitar reutilización entre sesiones. Las queries pasan la señal de cancelación al API cuando corresponde. Una mutación invalida las claves relacionadas por el contrato de su owner; no debe actualizar caches ajenas mediante imports de implementación privada.

La invalidación debe ser específica a los datos que cambian. Si un owner necesita provocar una invalidación en otro, debe consumir una operación/evento publicado y estable; la elección concreta pertenece al contrato entre esos módulos.

### Datos privados, sesión y permisos

Las respuestas privadas no sobreviven a un cambio de usuario, fin de sesión o cambio de permiso que altere el acceso efectivo. `src/app/privateQueryCache.ts` observa esas transiciones y `src/app/queryClient.ts` cancela trabajo activo y limpia la caché compartida. Las respuestas de operaciones antiguas tampoco deben volver a escribir datos visibles para la sesión nueva.

Router y las vistas aplican los permisos mediante el contrato de Identity y metadatos de ruta. El estado de autenticación permanece separado de server state. Los detalles de refresh, coordinación entre pestañas, cookies, roles concretos y contratos Auth están fuera de este documento y se mantienen en la [documentación canónica de Identity](modules/identity.md).

## Implementación y controles actuales

### Implementado

- Identity tiene ownership por áreas y entradas `index.ts` públicas.
- Pinia posee Auth y preferencias de cuenta; Query posee las consultas administrativas migradas de Users/Activity.
- `main.ts` compone Pinia, Query, Auth, transporte HTTP y Router.
- La limpieza privada de Query se conecta a cambios de identidad, sesión y permisos.
- Catalog contiene las vistas modulares de TopDiscs, DiscList y Artistas. Artistas ya posee API, tipos, aplicación, presentación y entrada pública; Dashboard y Discos consumen sus contratos publicados. El coordinador de DiscList es estado local a la vista; Identity aporta únicamente su contexto autenticado por la entrada pública `identity/auth`.
- Los módulos de negocio fuera de Identity siguen mayoritariamente en estructura legacy.

### Controles automatizados y límites

En el checkout hay scripts locales para ciclos, límites de imports de Identity, enlaces Markdown, lint y formato. El gate de imports se limita a Identity: permite imports internos del mismo owner, aplica una matriz entre owners, exige entrypoint público para cruces y excluye tests del cumplimiento de producción. Router tiene una lista explícita de imports de vistas admitidos. El detector de ciclos recorre el grafo TypeScript/Vue resuelto y compara cambios; un grafo incompleto deja la comparación como informativa. Ninguno de esos controles define ownership para Catalog u otras áreas legacy.

`.github/workflows/quality.yml` declara typecheck, tests, build, fixtures y verificaciones incrementales; los reportes globales de lint, formato y enlaces son informativos. El workflow está presente en este checkout, pero su ejecución remota no se ha validado aquí. La existencia del script o workflow no certifica que una regla se haya ejecutado correctamente en GitHub.

## Pendiente

- La [guía de Identity](modules/identity.md) documenta su aplicación concreta de estas reglas.
- La migración de otros dominios requiere clasificar owners y consumidores antes de aplicarles límites automatizados.
- ADR se creará solo si aparece una decisión duradera con alternativas e impacto que necesite registro propio; no hay ADR publicado actualmente.
