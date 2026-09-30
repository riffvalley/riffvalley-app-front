# Roadmap de refactorización del frontend

## Objetivo y alcance

Refactorizar el frontend de Riff Valley (Vue 3, TypeScript, Vite y Pinia)
para organizarlo por funcionalidades y separar presentación, coordinación
reactiva, reglas de negocio y acceso a datos.

La migración será incremental: cada PR conserva las rutas, los contratos de
la API, los nombres de rutas, los query params, los permisos, las claves de
almacenamiento, la carga diferida y el comportamiento visual del flujo afectado,
salvo cambio explícito de producto. Este plan pertenece exclusivamente al
frontend; no requiere refactorizar el backend ni cambiar sus tablas o endpoints.

Estado inicial: plan pendiente de implementación. Las fases siguientes no
representan trabajo ya terminado.

## Punto de partida observado

- El código se reparte entre `views`, `components`, `services`, `stores`,
  `composables`, `helpers`, `interfaces`, `router` y `layouts`.
- `package.json` ofrece `dev`, `build` y `preview`, pero no scripts de
  `lint`, `typecheck` independiente ni `test`. No se han encontrado suites
  de pruebas ni configuración de lint en este checkout.
- El build invoca Yarn internamente y el repositorio declara Yarn 4 como gestor.
  Yarn 4 se mantiene como gestor oficial durante toda la refactorización. No
  se cambiará de package manager como parte de este roadmap. Una posible
  migración a pnpm queda fuera de alcance y requeriría una PR independiente
  en el futuro.
- `services/api/api.ts` importa el router y el store de autenticación;
  el store importa el cliente HTTP y el servicio de login. Hay un ciclo de
  imports entre transporte, sesión y navegación.
- El store de autenticación también persiste avatar y configuración del
  dashboard, mezclando sesión con preferencias.
- Existen peticiones a proveedores desde componentes y vistas, entre ellos
  `ArtistDetail`, `DiscDetail`, calendarios, importación y gestión de artistas.
- Hay usos de `any` en servicios y stores; los contratos se tiparán por flujo.
- `stores/catalog/catalog.ts` y `services/catalog/catalog.ts` ofrecen un piloto
  pequeño: carga de géneros y países desde `/catalog`.
- El router ya utiliza imports dinámicos. Se conservará esa carga diferida.
- La CI encontrada automatiza releases; aún hay que añadir las comprobaciones
  de calidad de las PRs.

Este inventario es una referencia inicial, no una auditoría completa ni una
afirmación de que el build o las pruebas actuales estén pasando.

## Estructura objetivo

```text
src/
├── app/
│   ├── bootstrap/          # Vue, Pinia, plugins y composición
│   ├── router/             # registro de rutas y guards globales
│   ├── layouts/            # shell, navegación y layouts
│   └── dependencies/       # enlaces concretos cuando sean necesarios
├── modules/
│   ├── identity/
│   ├── catalog/
│   ├── community/
│   ├── releases/
│   ├── editorial/
│   ├── workspace/          # frontera provisional
│   ├── product-ops/
│   └── analytics/
├── integrations/           # clientes de proveedores externos
└── shared/
    ├── ui/                # componentes sin conocimiento de negocio
    ├── composables/       # solo comportamiento transversal sin dominio
    ├── infrastructure/    # transporte HTTP y mecanismos de storage
    └── utils/             # utilidades puras transversales
```

Solo se crean carpetas cuando tengan archivos necesarios. Cada módulo puede
tener `presentation` (vistas, componentes, composables y stores),
`application` (operaciones y puertos), `domain` (tipos y reglas propias) e
`infrastructure` (adaptadores de API y persistencia). Una funcionalidad sencilla
no necesita clases, entidades ricas ni un caso de uso ceremonial por cada GET.
La complejidad debe responder a una necesidad real, sin abstracciones por
anticipado ni tipos idénticos duplicados sin motivo.

Los composables de negocio pertenecen a la presentación del módulo propietario:
`modules/catalog/presentation/composables/`,
`modules/editorial/presentation/composables/` o
`modules/community/presentation/composables/`. Solo composables transversales
y sin dependencia de dominio, como `useDebounce`, `useMediaQuery` o
`useIntersectionObserver`, pueden ir a `shared/composables`; `useDiscFilters`,
`useAssignments` y `useEditorialCalendar` permanecen en sus módulos.

La presentación consume operaciones de aplicación; estas usan reglas y tipos
de dominio. Los adaptadores implementan los contratos de aplicación. Dominio
y aplicación no importan Vue, Pinia, Vue Router, Axios ni APIs del navegador.
La composición en `app` puede conocer todas las capas.

## Reglas de trabajo

1. Migrar un recorrido concreto por PR; no trasladar todas las vistas ni todos
   los servicios de una vez.
2. Usar Composition API y `<script setup lang="ts">` en componentes nuevos o
   migrados. Las vistas ensamblan componentes; los composables coordinan estado
   y efectos; las reglas puras se extraen a funciones TypeScript.
3. Tipar props, eventos, filtros, entradas y resultados. No mutar props ni
   introducir nuevos `any` en código nuevo/migrado. Usar `unknown` y comprobarlo en
   las fronteras cuando la forma del dato no sea conocida.
4. Pinia posee estado compartido de presentación, sesión y cache; puede
   coordinar operaciones de aplicación. No debe acumular reglas de negocio
   ni implementar HTTP. Mantener estado local cuando no haya consumidores
   fuera de la vista y derivar valores con `computed`.
5. No añadir HTTP en ninguna parte de `presentation`: pages, vistas,
   componentes, composables ni stores. No importar Axios, el cliente HTTP
   compartido, servicios HTTP legacy ni SDKs externos; mover una petición de
   un componente a un composable no resuelve el límite. HTTP y proveedores
   quedan detrás de infraestructura/adaptadores; Pinia coordina aplicación.
   Los errores de transporte se traducen en los adaptadores; la UI decide
   sus mensajes. Las excepciones legacy se acotan durante la migración.
6. No importar internals de otro módulo. Exponer una API pública pequeña;
   `app` compone las páginas que necesitan varios módulos.
7. Los DTOs de la API viven junto a sus adaptadores. Crear mappers cuando la
   UI necesite un modelo distinto; no duplicar tipos idénticos por ceremonia.
8. `shared` contiene elementos genuinamente transversales, estables y sin un
   propietario de dominio claro. El uso por dos módulos solo es una señal
   para evaluar la extracción, no una condición suficiente. No convertirlo
   en un nuevo `utils/` global ni en una zona de modelos compartidos entre
   bounded contexts. Un puerto específico puede tener un único consumidor
   cuando permita aislar una dependencia y probar el flujo.
9. Usar aliases coherentes con la configuración. Conservar temporalmente los
   antiguos mediante fachadas; retirarlos cuando no queden consumidores.
10. Preservar URLs, nombres de rutas, query params, claves de localStorage y
    comportamiento de permisos salvo un cambio de producto explícito.

## Mapa de funcionalidades

| Módulo | Responsabilidades y código actual de referencia |
| --- | --- |
| `identity` | Login, sesión, roles, cambio de contraseña, acceso y administración de usuarios |
| `catalog` | Discos, artistas, géneros, países, filtros y calendarios de discos |
| `community` | Valoraciones, comentarios, favoritos, pendientes y puntos visibles al usuario |
| `releases` | Importación, sugerencias, peticiones y lanzamientos nacionales, incluidos formularios públicos |
| `editorial` | Listas, asignaciones, reuniones, artículos, vídeos, Kanban, calendario de contenido y gestión de playlists |
| `workspace` (provisional) | Inicio, dashboard personal y sus preferencias de escritorio/móvil; frontera pendiente de validar |
| `product-ops` | Versiones, noticias, patch notes y soporte |
| `analytics` | Estadísticas, actividad de usuarios y gráficos |
| `integrations` | Acceso externo a Spotify, Last.fm y LanguageTool cuando se consuma desde el navegador |

El mapa puede ajustarse al migrar un flujo. Una pantalla puede ensamblar varios
módulos sin convertir todos sus componentes en `shared`. Gestionar playlists
es una funcionalidad editorial; hablar con Spotify es una integración.
`workspace` puede consolidarse como capacidad de producto o resultar ser
app shell más preferencias de usuario, sin dominio independiente. Su frontera
se validará durante la migración y se ajustará con la evidencia obtenida.

## Iteración 0 — Tooling y red de seguridad

Esta iteración se centra en baseline, calidad, reglas arquitectónicas y
CI sobre Yarn 4, sin cambios de package manager.

Los comandos `yarn lint`, `yarn architecture`, `yarn typecheck`, `yarn test`,
`yarn build` y `yarn verify` son conceptuales y se definirán durante esta
iteración; conservar Yarn 4 permite aislar los problemas de la migración DDD.

1. Registrar el resultado inicial del typecheck y build, y el inventario de
   deuda relevante. No asumir que el checkout empieza verde.
2. Separar `yarn typecheck` (`vue-tsc --noEmit`) y `yarn build` (Vite), sin
   invocaciones internas que dupliquen comprobaciones. Añadir `yarn lint`
   sin autocorrección y un comando separado para corregir.
3. Configurar Vitest y Vue Test Utils para las pruebas necesarias por flujo.
   Preparar Playwright para unos pocos recorridos críticos con API simulada,
   sin depender de credenciales ni escrituras en producción.
4. Añadir una puerta explícita `yarn architecture`: imports entre capas,
   dependencias entre módulos, HTTP fuera de las fronteras permitidas,
   Vue/Pinia/Vue Router en `domain` o `application`, nuevos `any` y ciclos relevantes.
   Aplicarla inicialmente al código nuevo/migrado; las excepciones legacy
   deben ser explícitas, acotadas y no aumentar. No desactivar reglas globalmente.
5. Añadir `yarn verify` para ejecutar lint, architecture, typecheck, test y build.
   Si una regla arquitectónica ya usa lint, reutilizarla sin ejecutarla dos
   veces; cada puerta debe mantener un resultado identificable.
6. Añadir comprobaciones de PR: instalación reproducible con Yarn 4 y
   `yarn verify`. No exigir una cobertura arbitraria de toda la app.

**Salida:** comandos y CI reproducibles, deuda inicial documentada y nuevas
infracciones detectadas. Sin migración funcional significativa; Yarn 4 se
mantiene como gestor oficial.

## Iteración 1 — Piloto de catálogo: genres + countries

**Primer corte:** carga de géneros y países mediante el `/catalog` existente,
inmediatamente después de la iteración 0 y antes de tocar auth, sesión, router,
bootstrap o preferencias.

Validar `presentation → application → domain`, con `infrastructure` implementando
los puertos necesarios. No requiere reestructurar auth ni el cliente HTTP global:
un adaptador de infraestructura puede apoyarse temporalmente en el servicio
legacy, sin exponerlo a presentación.

1. Caracterizar la respuesta, el orden visible y el comportamiento de cache.
2. Colocar tipos y adaptador HTTP en `modules/catalog`, manteniendo una fachada
   para el servicio actual.
3. Extraer la operación de carga; el store conserva únicamente datos, estado
   de carga y coordinación reactiva. Documentar propietario e invalidación
   de la cache sin cambiar silenciosamente el comportamiento.
4. Migrar un consumidor pequeño de esos datos. Dejar discos, artistas y sus
   calendarios para cortes posteriores.
5. Verificar carga correcta, respuesta vacía, error y reintento, y comprobar
   que el consumidor conserva opciones y selección.

**Salida:** primer flujo completo en la estructura nueva, con pruebas útiles
y convivencia con consumidores legacy. Validar dependencias, puertos/adaptadores,
testing, composición mínima del flujo y stores, sin demostrar todos los patrones
DDD. Si una funcionalidad trivial exige una estructura excesiva, simplificar.

El orden posterior al piloto se reevaluará con su experiencia y las dependencias
observadas antes de iniciar una migración extensa. Community e Integrations
pueden intercambiarse si el corte de `DiscDetail` lo justifica.

## Iteración 2 — Composición, HTTP y sesión

Dividir en PRs independientes: primero desacoplamiento, después reorganización
del arranque y finalmente separación de preferencias.

1. Caracterizar login, restauración de sesión, logout, 401 y navegación por rol.
   Incluir mantenimiento, rutas públicas y restricciones de `babyUser` tal
   como las implementa el router actual.
2. Crear un cliente HTTP configurable con callbacks para obtener el token y
   gestionar la expiración. No debe importar stores ni router. Conectarlo
   desde `app` una vez disponibles Pinia y navegación; registrar interceptores
   una sola vez y comprobar varios 401 simultáneos.
3. Aislar lectura/escritura de sesión en un adaptador, conservando claves y
   compatibilidad con datos persistidos antiguos.
4. Llevar bootstrap, plugins, router y shell a `app` mediante fachadas pequeñas.
   Mantener `main.ts` como entrada y preservar lazy loading y layouts.
5. Separar configuración del dashboard de identidad: `workspace` posee esas
   preferencias provisionalmente; login puede inicializarlas mediante
   composición explícita. Validar si corresponden a esa capacidad o al shell y preferencias
   de usuario, sin imponer un dominio independiente.

**Salida:** desaparece el ciclo HTTP/store/router; sesión y preferencias
mantienen su comportamiento. Los guards siguen siendo presentación: no
sustituyen la autorización del backend.

## Iteración 3 — Catálogo: listado, filtros, detalle, calendarios y artistas

Un corte por PR, en este orden:

1. Listado y filtros: tipar parámetros y resultados, extraer coordinación de
   carga/paginación y evitar que respuestas antiguas sobrescriban filtros
   recientes. Preservar orden, rangos de fechas y parámetros de URL existentes.
2. Detalle: separar datos del disco, presentación y acciones. Definir props y
   eventos; no convertir el detalle en otro componente que lo haga todo.
3. Calendarios estándar y baby: identificar comportamiento común, conservar
   restricciones y extraer solo piezas realmente compartidas.
4. Gestión de artistas: aplicar el mismo patrón por operación.

**Salida:** vistas centradas en composición, modelos tipados y carga reactiva
controlada. Cada PR comprueba escritorio y móvil en las pantallas afectadas.

## Iteración 4 — Acciones de comunidad

Migrar primero valoraciones; después comentarios, favoritos y pendientes,
cada uno con sus contratos, operación y coordinación de UI.

- Definir la fuente de verdad de cada dato y qué cache se actualiza tras una
  mutación; evitar copias divergentes entre tarjetas, detalle y calendario.
- Conservar validaciones, permisos y comportamiento ante errores. Probar
  dobles envíos y rollback si ya existen actualizaciones optimistas.
- Extraer UI común solo después de comprobar su uso en varios flujos.

**Salida:** las acciones tienen contratos tipados y actualizan coherentemente
sus consumidores sin introducir lógica de negocio en las tarjetas.

## Iteración 5 — Integraciones del navegador

1. Extraer primero una capacidad de Spotify usada por un detalle o formulario.
   Reutilizar helpers existentes donde tenga sentido y centralizar DTOs,
   errores y autenticación del proveedor en su adaptador.
2. Sustituir llamadas directas a medida que se migren sus consumidores.
   Repetir después con Last.fm y LanguageTool.
3. El módulo consumidor define el contrato que necesita. Ninguna pieza de
   presentación conoce tokens ni payloads específicos del proveedor.
4. Inventariar variables `VITE_*` y uso de credenciales. Si una capacidad
   requiere un secreto confidencial, documentar su dependencia de un endpoint
   backend y dejar ese corte pendiente hasta disponer de él. Mover código
   dentro del frontend no vuelve secreto un valor enviado al navegador.

**Salida:** capacidad piloto probada con respuestas simuladas, comportamiento
conservado y peticiones fuera de toda la presentación migrada.

## Iteración 6 — Editorial

Migrar un recorrido por PR, con orden sugerido:

1. Edición de una asignación y su texto.
2. Consulta/edición de una lista y reuniones.
3. Un cambio de estado en artículos o vídeos y después sus Kanban.
4. Una operación del calendario editorial.
5. Gestión de playlists por operación.

Separar formularios, tableros y modales por responsabilidad. Extraer reglas
de transición y validación a funciones comprobables sin Vue cuando sean propias
del frontend. Conservar las restricciones devueltas por la API y caracterizar
fechas y zonas horarias en calendarios. No crear un motor Kanban o formularios
genérico antes de demostrar necesidades compartidas.

**Salida:** los flujos migrados dejan de depender de servicios y stores legacy
mediante imports directos, conservando permisos, estados y comportamiento.

## Iteración 7 — Releases

Migrar un recorrido por PR, con orden sugerido:

1. Sugerencias y sus formularios públicos relacionados.
2. Peticiones y sus formularios públicos relacionados.
3. Importación por operación.
4. Lanzamientos nacionales y formularios públicos relacionados.

Separar coordinación de formularios, validación y adaptadores, conservando
contratos, permisos y comportamiento ante errores. Una vista que mezcle datos
de Releases y Editorial se compone mediante sus APIs públicas; no justifica
unir ambos bounded contexts.

**Salida:** recorridos tipados y desacoplados de servicios HTTP legacy en
presentación; los formularios públicos mantienen acceso sin sesión.

## Iteración 8 — Workspace, Product Ops y Analytics

1. Consolidar dashboard, home y preferencias con una fuente de verdad para
   configuración de escritorio/móvil y comportamiento de cada módulo. Validar
   la frontera provisional de `workspace`; puede resolverse como app shell
   más preferencias sin necesitar dominio independiente.
2. Migrar versiones, noticias, soporte y patch notes por operación.
3. Extraer carga y transformación de estadísticas; los gráficos reciben datos
   tipados y se ocupan de renderizarlos.
4. Revisar administración de usuarios y pantallas restantes de identidad.

**Salida:** se reducen dependencias transversales y ninguna preferencia queda
almacenada simultáneamente en dos stores propietarios.

## Iteración 9 — Consolidación y retirada de compatibilidad

1. Eliminar fachadas, aliases antiguos y carpetas legacy cuando no tengan
   consumidores; actualizar README y guía de arquitectura del repositorio.
2. Consolidar UI, estilos y utilidades compartidas demostradas, manteniendo
   apariencia, tema, navegación por teclado y comportamiento responsive.
3. Eliminar progresivamente las excepciones legacy de `yarn architecture` hasta
   aplicar las reglas globalmente. Comprobar ciclos y que los exports públicos
   sean pequeños; mantener `yarn verify` como puerta conjunta sin duplicar trabajo.
4. Medir bundle y recorridos afectados frente a la referencia inicial;
   optimizar solo problemas observados. Conservar imports dinámicos.

**Salida:** funcionalidades agrupadas por responsabilidad, sin imports legacy
ni HTTP en presentación, y puertas de calidad verdes.

## Checklist por PR

- [ ] Un recorrido definido, con consumidores y límites identificados.
- [ ] Comportamiento previo caracterizado antes de cambiar lógica relevante.
- [ ] URLs, nombres de rutas, query params, API, permisos, claves de storage
      y carga diferida compatibles; sin rediseño accidental.
- [ ] Props, eventos, DTOs y resultados tipados; sin nuevos `any`.
- [ ] Sin ciclos ni imports de internals entre módulos; sin HTTP, clientes
      legacy ni SDKs externos en la presentación migrada.
- [ ] Estado y cache con propietario e invalidación explícitos.
- [ ] Errores, carga, vacío y efectos asíncronos comprobados donde corresponda.
- [ ] `yarn verify` pasa tras la fase 0: `yarn lint`, `yarn architecture`,
      `yarn typecheck`, `yarn test` y `yarn build`, con excepciones legacy
      explícitas y acotadas.
- [ ] Pruebas del comportamiento alterado; E2E críticos cuando toque rutas o sesión.
- [ ] Verificación visual de escritorio/móvil si se modifican componentes.
- [ ] Sin carpetas vacías ni abstracciones compartidas especulativas.
- [ ] Estado del roadmap actualizado con PR y evidencia de aceptación.

## Cuándo reducir el corte

- Hace falta migrar varios recorridos independientes para compilar.
- Un módulo nuevo importa componentes o stores internos de otro.
- Un composable pasa a concentrar toda la lógica que antes tenía la vista.
- La reorganización exige cambiar endpoints, URLs o datos persistidos.
- El comportamiento del flujo solo se puede probar contra producción.
- Una abstracción compartida necesita excepciones para cada consumidor.

En estos casos, mantener una fachada temporal y replantear el corte. Los
cambios de producto y las dependencias de backend se registran por separado.

## Primeras PRs propuestas

1. Tooling, baseline y reglas arquitectónicas sobre Yarn 4 (iteración 0).
2. Piloto de catálogo con genres + countries y un consumidor.
3. Caracterización y desacoplamiento del cliente HTTP, sesión y router.
4. Reorganización mínima del bootstrap y separación de preferencias.
5. Primer corte grande de catálogo: listado y filtros.

Reevaluar el resto del orden con la experiencia del piloto antes de iniciar
una migración extensa.
