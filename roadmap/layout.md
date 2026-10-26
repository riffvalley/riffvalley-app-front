# Layout y Sidebar — auditoría L-0

## Alcance y preflight

Auditoría estática del shell, los layouts, Router y el flujo de los tres datos HTTP que consume el Sidebar. No se modificó código funcional, endpoints ni backend. El análisis corresponde al checkout inspeccionado el 26 de octubre de 2026.

| Comprobación | Resultado |
|---|---|
| Rama solicitada | **No coincide:** checkout en `refactor/layout`, tracking `origin/dev`; se solicitó confirmar `refactor/bases`. No se cambió de rama. |
| Node solicitado | **No coincide:** shell ejecuta Node `v22.23.1`; `nvm` no está disponible en esta shell para activar `24.22.1`. No se instaló ni cambió Node. |
| pnpm solicitado | **Coincide:** `11.28.8`. |
| Fuentes leídas | `AGENTS.md`, `docs/frontend/architecture.md`, `docs/frontend/conventions.md`, `docs/frontend/modules/identity.md` y `roadmap.md`. |

La limitación de rama/runtime significa que la auditoría describe el checkout actual, no certifica el estado de `refactor/bases`. Las rutas de código se citan como evidencia de este checkout.

## Mapa de composición de L-0 (antes de L-1)

```text
main.ts
├─ instala Pinia, Vue Query, Router, plugins y cliente HTTP autenticado
├─ observa cambios de sesión/permisos y limpia Query
└─ App.vue
   ├─ Auth + Router + estado efímero del menú/overlay/scroll
   ├─ inicia Catalog al autenticarse → Pinia legacy
   ├─ SidebarMenu (instancia A)
   └─ DefaultLayout (en rutas ordinarias)
      ├─ hamburger, estado/scroll del menú y tema
      ├─ SidebarMenu (instancia B)
      └─ main + router-view
          ├─ vistas legacy de producto
          ├─ layouts List/Reunions → router-view
          └─ vistas/layouts de Identity
```

`App.vue` elige `LoginLayout` para Login, Maintenance y NationalReleasePublic; en esas rutas oculta su Sidebar. Para las demás usa `DefaultLayout`, que vuelve a insertar `SidebarMenu`. Por tanto, en una ruta ordinaria hay **dos instancias simultáneas** del Sidebar, con dos estados de visibilidad independientes y dos ejecuciones de su `onMounted`.

Esta sección conserva la fotografía previa a L-1. La estructura actual tiene una sola instancia de `SidebarMenu`, cuyo owner es `DefaultLayout.vue`; `App.vue` mantiene la composición de layouts y la coordinación de Auth/Catalog. La auditoría y decisión siguientes corresponden a L-2, realizada tras esa consolidación.

| Área | Responsabilidad observada y dependencias |
|---|---|
| `main.ts`, `src/app/*` | Composition root. Instala `QueryClient`; conecta Auth con Axios y limpia la caché Query al cambiar identidad/sesión/acceso administrativo. |
| `App.vue` | Espera inicialización Auth, elige layout, monta Sidebar/overlay, cierra menú al cambiar ruta y bloquea scroll. También dispara `catalogStore.fetchCatalog()` al autenticarse. Mezcla shell con coordinación de Auth y carga de Catalog. |
| `DefaultLayout.vue` | Contenedor `main`, hamburger, tema, segundo Sidebar, overlay y otro bloqueo/restauración de scroll. Repite estado que ya mantiene App. |
| `SidebarMenu.vue` + `routes.json` | Presentación y datos de navegación, filtro de rol, áreas, preferencias de dashboard, cierre de sesión, badge de soporte/peticiones, carga de versión y tres llamadas HTTP. Componente grande con responsabilidades de shell, Identity y dominios legacy. |
| Router | Declara rutas lazy, `requiresAuth`/`requiresRole`, espera `initializeAuth` en `beforeEach` y vigila la autorización de la ruta activa ante cambios de rol. Los guards son navegación/presentación; la autorización de APIs corresponde al servidor. |
| `ListLayout.vue`, `ReunionLayout.vue` | Wrappers mínimos de `router-view`; no son shell global. `LoginLayout.vue` aporta un `main` simple. |
| Catalog legacy | `App` consume `useCatalogStore`; la store mantiene géneros/países remotos con `loaded`. También hay consumidores que llaman `fetchCatalog`. |
| Identity | Sidebar consume las entradas públicas de Auth, Account/Preferences y Shared para sesión, preferencias y rol. Account es owner de preferencias; Auth de logout/sesión; Shared de jerarquía de permisos. |
| Community / Editorial legacy | Petitions (`requests`) y soporte (`suggestions`) usan servicios HTTP y stores Pinia legacy. Versiones aporta la versión pública mostrada en el pie. |
| UI compartida | El Sidebar y los layouts son específicos de la app. Hay componentes comunes en `src/components/`, `SwalService` y `useTheme`; no se encontró un header global separado. |

## Inventario de las tres peticiones del Sidebar

Las tres se inician en `src/layouts/default/components/SidebarMenu.vue`, dentro del mismo `onMounted`, sin `await`/coordinación común entre instancias, cancelación ni caché de Query. Los errores se silencian.

| Dato | Endpoint y método | Parámetros | Quién lo inicia y cuándo | Dato requerido por la navegación |
|---|---|---|---|---|
| Versión pública | `GET /versions/production/latest` | Ninguno | Cada Sidebar en `onMounted`, para cualquier rol autenticado que llegue a shell ordinario. | Solo `version`; `getLatestPublicVersion()` devuelve la versión completa. Es pública y no depende del rol. |
| Peticiones pendientes | `GET /requests` | Ninguno | Cada Sidebar en `onMounted` si `hasMinimumRole(role, 'riffvalley')`. | Solo el número de respuestas con `status === 'pending'`; no hay parámetro de estado en la función del servicio. |
| Bugs/sugerencias en curso | `GET /suggestions?status=in_progress` | `status: 'in_progress'` | Cada Sidebar en `onMounted` si el rol es `superadmin`. | Solo IDs para calcular elementos no leídos; se descargan objetos completos. |

### Duplicación, caché e invalidación

- La duplicación primaria es estructural: las dos instancias de Sidebar repiten las tres peticiones elegibles. Para `superadmin`, el montaje puede emitir seis requests HTTP de Sidebar (dos por endpoint); para roles inferiores se omiten las llamadas cuyo permiso no cumplen.
- `PetitionsPage.vue` vuelve a llamar `GET /requests` al montarse. Guarda el listado en un `ref`, calcula el contador y lo sincroniza al aprobar/rechazar/reabrir. No hay estado Query reutilizable; el badge que dejó el Sidebar puede quedar desactualizado mientras se navega.
- `SuggestionsManagement.vue` vuelve a llamar `GET /suggestions` con filtros (por defecto, `status=in_progress`) al montarse, al cambiar filtros y tras mutaciones. Sin filtro de tipo y con el estado inicial, coincide con la petición del Sidebar; al cambiar a otro filtro también escribe `pendingIds` con el subconjunto filtrado, pudiendo reducir o vaciar el badge global.
- `support` guarda `pendingIds` remotos junto a `readIds` locales persistidos; `petitions` conserva solo el contador derivado en Pinia. Ninguna store ofrece invalidación/refetch ni se limpia en el ciclo general de caché privada.
- `getLatestPublicVersion` no se comparte con una query; cada Sidebar guarda su `version` en un `ref`. Los cambios publicados en Versiones no invalidan ese valor hasta que el Sidebar se monte de nuevo.
- `src/services/versions/versions.ts` declara también `getLatestProductionVersion()`, que llama al mismo `GET /versions/production/latest`; no tiene consumidor de producción en el checkout, así que no añade una llamada activa adicional.
- `QueryClient` ya existe con `staleTime: 60 s`, `gcTime: 5 min`, y sin refetch automático por foco o reconexión. Query se utiliza en Users/Activity de Identity, no para estos tres recursos. La limpieza global por identidad/logout/cambio de acceso administrativo solo limpia Query; no afecta el estado actual de las stores legacy.

### Sesión, permisos y navegación

- Router espera `initializeAuth`; `App` solo renderiza el shell al quedar authenticated o anonymous (o error en Login). Por eso las peticiones del Sidebar normalmente arrancan tras conocer rol y sesión.
- App cambia a Login al logout desde Sidebar. La instancia del Sidebar se desmonta al pasar a `LoginLayout`; las peticiones en curso no reciben `AbortSignal`. La sesión se limpia en Auth, pero los datos derivados de stores legacy no se vacían explícitamente.
- Al login posterior se crea shell nuevo y vuelve a pedir los datos para los roles que aplican. Si el nuevo rol no ejecuta una rama que antes sí ejecutaba, el valor anterior de la store (`pendingCount`/`pendingIds`) no se borra por esa rama.
- Al navegar entre rutas ordinarias, App y DefaultLayout cierran cada menú, pero las instancias de Sidebar permanecen montadas; las tres consultas no se repiten. Las vistas sí vuelven a cargar sus datos según sus `onMounted`/filtros.
- El cambio de rol actualiza el filtrado reactivo y Router corrige la ruta activa. Las cargas de Sidebar no observan el rol para volver a consultar ni para limpiar la proyección en Pinia. La limpieza de `QueryClient` no cubre ese estado legacy.
- El estado de lectura `readIds` es local persistido; `pendingIds` depende del servidor. El menú calcula badges con ambos, pero la pantalla de soporte modifica el conjunto remoto usando el resultado de su filtro UI.

## Ownership y clasificación

| Responsabilidad | Owner recomendado | Situación actual |
|---|---|---|
| Shell, layout, responsive, overlay, navegación y composición de vistas | Layout/App | Repartida entre App y DefaultLayout; Sidebar se monta en ambos. `routes.json` mezcla definición de rutas con presentación y permisos. |
| Sesión, logout y estado de identidad | Identity/Auth | Sidebar invoca el contrato público de Auth; su flujo de navegación a Login forma parte del shell y puede usar Router. |
| Jerarquía y evaluación del rol | Identity/Shared | Se usa el contrato público `hasMinimumRole`; Router también aplica meta/guards. La visibilidad del menú no sustituye esos guards ni la autorización backend. |
| Preferencias de área/dashboard | Identity/Account | Sidebar usa la entrada pública `useDashboardPreferences`; el ownership está bien definido aunque el layout decida cómo presentarlas. |
| Peticiones de discos | Catalog (flujo de solicitud) | Servicio `src/services/requests/requests.ts`, vista Petitions y store `petitions`; el Sidebar consulta el mismo listado para derivar el badge. Clasificar como Catalog es provisional por no existir módulo formal dedicado. |
| Bugs/sugerencias | Community | Servicio `src/services/suggestions/suggestions.ts`, `SuggestionsManagement` y store `support`; Sidebar consume una proyección del estado. Ownership provisional por legacy, no módulo formal. |
| Versiones y número mostrado | Editorial | Servicio legacy de versiones; Sidebar consume una versión pública, no es owner del catálogo de versiones. |
| Catalogo de géneros/países | Catalog | `catalogStore` conserva respuesta remota; App dispara la carga aunque no es el owner de Catalog. |
| Controles visuales reutilizables/tema | UI compartida o shell | `useTheme` y componentes comunes; no se identificó un header compartido actual. |

Imports relevantes del Sidebar: contratos públicos de Identity para Auth/Account/Shared; imports legacy directos a `services/versions`, `services/requests`, `services/suggestions`, stores `support`/`petitions`, `SwalService`, y un import absoluto de Router (`/src/router`). No se observó un import profundo de internals de Identity. No hay módulos públicos Catalog/Community/Editorial que el layout pueda consumir todavía, por lo que no conviene inventar barrels o submódulos durante la limpieza del shell.

La clasificación Catalog/Community/Editorial es propuesta funcional para esta auditoría; los directorios legacy no son por sí mismos contratos modulares publicados.

## Hallazgos arquitectónicos

1. **Doble Sidebar en rutas ordinarias.** App y DefaultLayout montan el mismo componente; duplican peticiones, navegación, área seleccionada, preferencia/tema asociado y ciclo de estado.
2. **Estado de menú duplicado.** App y DefaultLayout manejan `menuVisible`, cierre por navegación y bloqueo/restauración de scroll con implementaciones diferentes. También renderizan overlays propios.
3. **Sidebar con demasiados owners.** Combina UI, menú/roles, preferencias Account, logout Auth, tres cargas HTTP de Versiones/Catalog/Community y stores de badges.
4. **Pinia funciona como caché parcial de server state.** `pendingCount` y `pendingIds` son proyecciones remotas; no tienen freshness, error, cancelación ni invalidación coordinada. La store de Catalog además conserva el payload remoto con un flag `loaded`.
5. **Badge de soporte acoplado a filtros.** El resultado filtrado de la pantalla administrativa reemplaza IDs que el sidebar interpreta como conjunto global en curso.
6. **Desfase entre Query y legacy.** La invalidación privada central protege queries existentes, pero no las proyecciones de estas stores. Logout/cambio de rol puede dejar valores antiguos para el siguiente usuario.
7. **Datos excesivos para el badge.** Petitions necesita contar pendientes y Sidebar solicita todos los estados; el badge de soporte necesita IDs y solicita objetos. En ambos casos las vistas administrativas también necesitan datos, así que reutilizar sus resultados puede eliminar duplicación; no hay evidencia cuantificada de que el tamaño actual justifique un endpoint backend agregado.
8. **Componente mantiene Options API.** Es consistente con partes legacy, pero sus límites actuales se pueden mejorar sin una conversión general de estilo/API.

## Evaluación inicial de alternativas en L-0

| Alternativa | Encaje y límites | Evaluación |
|---|---|---|
| 1. Reutilizar consultas con TanStack Query | No existen hoy queries para versión, requests o suggestions que Sidebar pueda reutilizar. Query ya aporta deduplicación simultánea, claves, freshness, cancelación e invalidación; las queries privadas deben incluir identidad/contexto de permiso y quedar bajo el limpiador de caché existente. Las mutaciones de Petitions/Suggestions tendrían que invalidar sus propias keys públicas. La carga pública de versión puede tener key propia. | **Recomendada para datos remotos reutilizados**, empezando por resolver el doble montaje. No migrar automáticamente los tres servicios ni convertir todo en Query: definir freshness y refetch según UX, y mantener APIs/keys bajo el owner de cada dato cuando haya contratos disponibles. |
| 2. Consolidar el consumo en frontend | Eliminar una instancia del Sidebar reduce a la mitad la carga de montaje sin agregar infraestructura. Un composable agregado que llame los tres servicios podría centralizar timing, pero haría al shell dueño de tres dominios y seguiría descargando datos completos; además necesitaría una política explícita de invalidación al mutar en otras vistas. | **Aplicar consolidación estructural, no un agregador de dominio en el layout.** Si hace falta una única fuente de presentación, consumir contratos/query composables propiedad de cada funcionalidad; el Sidebar solo representa resumen. |
| 3. Proyección agregada backend | Podría exponer conteos/IDs mínimos y reducir payloads, pero une datos de Versiones, Peticiones y Soporte, crea un contrato adicional y requiere autorización coherente por rol. Las vistas ya cargan sus listados; no hay medición de payload, latencia ni cuello de botella que pruebe beneficio. | **No justificada ahora.** Reconsiderar solo con medición de coste/payload y contrato claro de permisos; mantenerlo fuera del alcance L-1. |

Estrategia provisional de L-0: quitar el Sidebar duplicado y evaluar consultas de cada owner. La inspección del backend en L-2 concreta la recomendación; esta sección conserva el razonamiento inicial como historial.

## Roadmap propuesto

Los tamaños son relativos: XS hasta unas horas, S hasta un día, M hasta varios días con integración/regresión. L-0 a L-4 están completadas; L-5 se cierra como N/A tras auditoría. L-6.1 y L-6.2 están completadas y verificadas. L-7 queda completada con las verificaciones locales registradas al final; no se ejecutó CI ni se validaron servicios reales.

| ID | Tarea | Tamaño | Dependencias | Estado / criterio de cierre |
|---|---|---:|---|---|
| L-0 | Auditoría y clasificación inicial | S | — | **Completada.** Baseline previa a la unificación registrada. |
| L-1 | Unificar shell: una sola instancia de Sidebar y un owner del estado móvil, overlays y scroll lock | S | L-0 | **Completada.** `DefaultLayout.vue` posee el Sidebar y el ciclo visual; pruebas de shell, rutas públicas y scroll pasan. |
| L-2 | Auditar ownership/semántica/coste del resumen y definir contrato/caché | XS | L-1 | **Completada.** Evidencia de los tres módulos, contrato, permisos, errores y política Query documentados abajo. |
| L-3 | Implementar proyección de resumen en backend mediante lecturas de cada owner | M | L-2 | **Completada.** `CrossDomainModule` compone `GET /api/app/sidebar-summary` con lecturas mínimas de Versions, Requests y Suggestions; permisos por rol, fallo atómico y pruebas. |
| L-4 | Consumir resumen con TanStack Query y retirar las tres cargas directas del Sidebar | M | L-3 | **Completada.** Query privada de sesión, invalidaciones acotadas, badges y regresión; vistas conservan sus endpoints. |
| L-5 | Delimitar Sidebar como presentación y delegación mediante contratos públicos | N/A | L-4 | **N/A tras auditoría L-5a.** Las dependencias actuales tienen owner y no justifican refactorización adicional. |
| L-6 | Limpiar estado legacy y duplicaciones | S | L-1, L-5 | **Completada.** L-6.1 y L-6.2 verificadas; se preservan guards/rutas/roles. |
| L-7 | Regresión y cierre | S | L-3–L-6 | **Completada.** Regresión local aprobada; lint mantiene baseline de 1131 errores. Limitaciones de E2E, CI y backend real documentadas al final. |

L-5 se cierra como **N/A tras auditoría**, conforme a la evidencia y justificación de L-5a. La auditoría L-6a y las ejecuciones de L-6.1/L-6.2 están documentadas al final. L-7 cierra el roadmap según la evidencia y limitaciones descritas en su sección.

## Verificaciones de L-0

| Verificación | Resultado |
|---|---|
| `pnpm run markdown:links` | Exit 0. Escaneó 21 archivos Markdown y 1302 enlaces; notificó un único fallo local preexistente fuera del repositorio en `roadmap/roles.md:9` (`../../spammusic-back/roadmap/roles-frontend-contract.md`). Los enlaces añadidos en L-0 no añaden fallos. pnpm avisó que Node 22.23.1 no satisface `>=24 <25`. |
| `git diff --check` | Exit 0. |

La inspección fue estática; no se ejecutaron pruebas, typecheck ni build, y no se afirma validación de GitHub Actions.

## L-2 — Auditoría y diseño del resumen del Sidebar

### Fuente y límites

Se inspeccionó el frontend actual y el backend disponible en `/home/tottibero/workspaces/riffvalley/riffvalley-app-back` (commit `d538c26`, rama `chore/n24-node24-pnpm11`). El backend tenía un cambio no relacionado en `roadmap/roles/production-deployment.md`; se preservó sin tocar. La inspección fue de solo lectura. No hubo conexión a la base de datos, captura de payloads reales ni `EXPLAIN ANALYZE`; el coste descrito abajo es estructural, no una medición de producción.

### Consumo y payload actual

Tras L-1 existe una sola instancia de `SidebarMenu.vue`. En su `onMounted`:

| Recurso | Uso del Sidebar | Respuesta y datos descartados |
|---|---|---|
| Versión | Llama `getLatestPublicVersion()` y presenta solo `data.version` en el pie. | Backend devuelve `{ version: string }` o `null`, usando un QueryBuilder que selecciona solo la columna `version`. No hay sobrelectura relevante aquí. El servicio frontend está tipado más ampliamente como `Version | null`. |
| Peticiones | Si rol ≥ `riffvalley`, obtiene la lista global y cuenta localmente filas con `status === 'pending'`. Sin filtro temporal, por usuario ni por pestaña; guarda el entero en `petitionsStore.pendingCount`. | `RequestsService.findAll()` trae todas las filas sin paginar ni filtrar estado y ordena por `createdAt DESC`. Sidebar descarta IDs, nombres, fechas, descripción, imagen, notas, usuario, género y país; usa solo `status`. `DiscRequest` declara eager las relaciones `user`, `genre` y `country`. |
| Bugs/sugerencias | Si rol es `superadmin`, pide `status=in_progress`, extrae IDs y actualiza `supportStore.pendingIds`. El badge es `pendingIds.filter(id => !readIds.has(id)).length`, mostrado como `99+` a partir de 100. | El backend devuelve `{ data, counts }`. `data` filtra por estado; Sidebar usa solo IDs y descarta campos de contenido, autor, fechas y versión relacionada. `counts` agrupa estados sin respetar el filtro `status` y Sidebar lo ignora. La consulta carga `versionItem` y el usuario eager. |

Hallazgos de contrato que L-2 no corrige:

- `getSuggestions()` frontend está tipado como `Suggestion[]`, aunque backend entrega `{ data, counts }`; Sidebar y la vista lo compensan con comprobaciones/casts.
- `getLatestPublicVersion()` está tipado como `Version | null`, aunque el endpoint devuelve `{ version } | null`.
- La versión se elige por `status=en_produccion` y orden `publishedAt DESC`, `releaseDate DESC`, `createdAt DESC`. El servicio no filtra `isActive`; el resumen debe conservarlo así.
- Requests y Suggestions se guardan parcialmente como server state en stores Pinia legacy. `readIds` sí es local y persistido en `localStorage` como `rv_support_read_ids`.

### Ownership del backend

| Dato | Owner y lectura actual | Permiso |
|---|---|---|
| Versión | Product / Versions, `src/product/versions/VersionsController` → `VersionsService.findLatestProductionVersion()`. QueryBuilder selecciona solo `version`, filtra producción y ordena por las tres fechas indicadas; `getOne()` limita a una fila. | GET actual público, sin `@Auth`. |
| Peticiones | Community / Requests, `RequestsController.findAll()` → `RequestsService.findAll()` → `requestRepo.find({ order: { createdAt: 'DESC' } })`. Un conteo exacto puede usar `COUNT(*) WHERE status='pending'`/`Repository.count({ status })`, sin hidratar relaciones. No se encontró índice explícito en `status`; no proponer migración sin medir. | `GET /requests` requiere `@Auth(ValidRoles.riffvalley)`; `superadmin` satisface el mínimo por jerarquía. |
| Suggestions | Product / Suggestions, `SuggestionsController.findAll()` → `SuggestionsService.findAll()`. Hace `repo.find()` para las filas y una consulta adicional `GROUP BY status` para `counts`. Una lectura de solo `id WHERE status='in_progress'` evita hidratar usuario/versión. | `GET /suggestions` requiere `@Auth(ValidRoles.superadmin)`. |

Requests pertenece a Community, no a Product. No existe un `ProductModule` que agrupe las tres capacidades: AppModule importa sus módulos por separado. Las consultas resumen deben vivir como operaciones de lectura estrechas en cada owner; el agregador no debe inyectar repositorios de dominio ni duplicar enums/reglas.

### Semántica exacta de los contadores

1. **Peticiones:** cuenta global de filas cuyo estado es exactamente `pending`. Cambian el total `createRequest`, `approveRequest`, `rejectRequest` y `reopenRequest`; editar notas o metadatos no lo cambia.
2. **Soporte:** el badge actual no es el total de `in_progress` ni el total con backend `isRead=false`. Es el conjunto global de IDs `in_progress` menos IDs marcados localmente. El frontend no llama a `PATCH /suggestions/:id/read`; las lecturas se guardan en localStorage. Devolver solo un entero rompería la semántica actual.
3. `SuggestionsManagement` reemplaza el conjunto del store con el resultado de sus filtros actuales; elegir otro estado puede vaciar el badge global. Es un acoplamiento preexistente, fuera de L-2; el resumen del Sidebar debe ser independiente de los filtros de esa vista.

### Decisión y contrato propuesto

**Recomiendo la alternativa B por el sobrefetch comprobable, no por reducir requests HTTP.** Sidebar descarga peticiones completas con relaciones eager y sugerencias completas (más el agregado `counts`) para derivar un entero o filtrar IDs. Mantener solo tres endpoints con Query puede compartir caché al entrar a las páginas administrativas, pero no evita la carga inicial completa cuando el usuario solo está consultando otras rutas. El endpoint de Versiones ya devuelve una columna, así que no es motivo sustancial para agregar.

La ruta debe reflejar composición de shell/aplicación y no ownership Product: **`GET /api/app/sidebar-summary`** (ruta Nest `app/sidebar-summary`; `main.ts` añade el prefijo global `/api`). L-3 ubicará la coordinación de Versions, Requests y Suggestions en `CrossDomainModule`; cada dominio publicará sus lecturas mínimas y el agregador no moverá su lógica. No usar `/product/sidebar-summary`, porque incluiría el owner Community.

Contrato implementado y confirmado para L-4:

```json
{
  "version": { "latest": "1.8.4" },
  "petitions": { "pending": 12 },
  "suggestions": { "inProgressIds": ["uuid-1", "uuid-2"] }
}
```

- `version.latest: string | null`: misma selección actual; `null` es ausencia válida de versión de producción.
- `petitions.pending: number`: conteo global, filtro exacto `status=pending`.
- `suggestions.inProgressIds: string[]`: IDs globales exactos con `status=in_progress`; frontend descuenta `readIds` local para mantener el badge actual. Solo UUIDs, sin contenido/autor/relaciones.
- La respuesta depende del rol y omite campos no autorizados: todos los usuarios autenticados reciben versión; rol ≥ `riffvalley` recibe peticiones; `superadmin` recibe también IDs de Suggestions. No devolver cero para fingir falta de permiso.
- Proteger con sesión autenticada y calcular la proyección con el usuario/rol vigente del servidor (`JwtStrategy` vuelve a cargar el usuario activo). Nunca confiar en un rol enviado por el cliente. Mantener los endpoints existentes y sus límites.
- Lecturas paralelas en el agregador. Si alguna lectura falla, fallar el resumen completo; no convertir error a `0`, `[]` o `null`. Así ningún valor indica falsamente que no hay pendientes. `null` de versión sí representa ausencia real. En el cliente, error inicial debe ser desconocido/sin badge; un refetch fallido puede conservar último dato Query confirmado.

La respuesta mínima reduce filas, relaciones y materialización ORM; no necesariamente reduce SQL: son una lectura de versión, un conteo de Requests y una selección de IDs de Suggestions. Para el módulo Suggestions puede reemplazar las dos consultas actuales (`data` y `counts`) en el uso del Sidebar. Si luego se abre la vista detallada, esta conserva su endpoint y consulta su lista; en ese caso el resumen y la vista harán lecturas distintas. No hay datos de frecuencia de visitas, tamaño real o planes SQL para calcular el punto de equilibrio; medir payload/frecuencia y `EXPLAIN ANALYZE` antes de asegurar una mejora global de base de datos o añadir índices.

### Comparación de alternativas

| Criterio | A — Tres endpoints + Query | B — Resumen agregado |
|---|---|---|
| Complejidad | Baja: query por owner y cache compartida con vista cuando coinciden parámetros. | Media: módulo de composición, exports estrechos, permisos por campo y error atómico. |
| DB | Puede reutilizar el listado cargado por Sidebar al entrar a vista; sin esa navegación aún lista entidades completas. | Tres lecturas mínimas en paralelo; Suggestions evita su `GROUP BY counts` no utilizado. No promete menos SQL. |
| Payload | Igual al actual durante el montaje; Query evita duplicar transferencia/lectura posterior al entrar a la vista. | Menor para uso del shell: número + UUIDs + versión. Si después se abre vista, esta hace su lectura detallada. |
| Acoplamiento/permisos | Menor: cada endpoint conserva su owner y permiso. | Mayor pero dirigido: App-shell consume contratos de tres owners; filtra campos por rol actual. |
| Invalidación | Keys por dominio, reutilizables entre badge y listado. | Key resumen independiente; mutaciones invalidan la proyección y vistas mantienen sus APIs. |
| Fallo | Fallos aislados por query. | Falla el resultado conjunto; no inventa ceros y expone estado de error/último valor al cliente. |

La recomendación B resuelve el sobrefetch del Sidebar siempre montado; no se afirma que sea mejor para las navegaciones a listas completas. Si la medición muestra que los usuarios autorizados visitan con frecuencia dichas vistas en la misma sesión y el payload es pequeño, A puede resultar más económica; reconsiderar antes de implementar L-3 si esa evidencia aparece.

### Política de caché e invalidación para L-4

La query resumen será independiente de cualquier query de listado de Petitions/Suggestions:

| Parámetro | Propuesta |
|---|---|
| Key | `['app', 'sidebar-summary', userId, role, authSessionGeneration]`; dato privado, con forma dependiente del usuario/rol. Sin filtros UI. |
| `staleTime` / `gcTime` | `60_000` ms / `300_000` ms, alineados con el QueryClient existente. |
| Refetch | Al montar; si está stale y se vuelve a montar, refetch por default. Sin polling; refetch en foco/reconexión sigue desactivado globalmente. Invalidación tras mutaciones. |
| Error | No inicializar a cero. Error inicial queda desconocido; error de refetch puede conservar último dato confirmado. El servidor no devuelve resumen parcial/sentinela. |

Invalidar después de éxito cuando cambie la proyección:

- Requests: creación, aprobación, rechazo y reapertura. Actualización de notas/metadatos no cambia el conteo.
- Suggestions: crear, pasar a progreso, rechazar, marcar hecha y eliminar. Cambiar prioridad/título/tipo no cambia los IDs en curso. Marcar lectura local solo recalcula el `computed` de Pinia, no requiere refetch.
- Versions: invalidar cuando `updateVersion` cambie status/número/fechas que alteren selección u orden. `createVersion` crea una versión en desarrollo y no altera la versión en producción; el endpoint actual no filtra `isActive`, así que `setVersionActive` no requiere invalidación.
- Logout, identidad distinta o cualquier cambio de rol que altere permisos limpia la caché privada. L-4 amplió `privateQueryCache` para observar acceso a Requests (`role >= riffvalley`) y Suggestions (`superadmin`), incluyendo el downgrade `riffvalley → collaborator`; la query añade usuario, rol y generación de sesión a su key y pasa el `AbortSignal` al cliente HTTP.

### Dependencias y pruebas de L-3/L-4

- **L-3 backend:** añadir lecturas de dominio `countPendingRequests()` y `listInProgressSuggestionIds()` y reutilizar `findLatestProductionVersion()`. Publicarlas desde sus módulos y crear un módulo app-shell dependiente de los tres, nunca al revés. Cubrir filtros exactos, cero filas, versión nula/orden, error atómico, autenticación y campos visibles para `user`, `collaborator`, `riffvalley` y `superadmin`; metadata/controller y módulo deben verificar permisos y dirección de dependencias.
- **L-4 frontend:** completada según la sección L-4 al final de este documento. Las vistas conservan contratos/endpoints detallados; sus mutaciones relevantes invalidan exclusivamente el prefijo de SidebarSummary.
- **Riesgo semántico:** `readIds` no está aislado por usuario. El contrato conserva el comportamiento actual de navegador; cambiar a lectura backend/per-user requiere decisión funcional aparte.
- **Riesgo de crecimiento:** UUIDs de todas las sugerencias en curso pueden crecer; devolver un entero exigiría cambiar antes la semántica de lectura. Medir antes de revisar este contrato.

### Verificaciones de L-2

| Verificación | Resultado |
|---|---|
| Revisión de fuentes | Frontend y backend en solo lectura; backend commit `d538c26`. Se preservó el cambio no relacionado en su roadmap. Sin DB real ni mediciones de payload/plan. |
| `pnpm run markdown:links` | Exit 0. Revisó 21 archivos y 1302 enlaces; permanece un único enlace externo al repo preexistente en `roadmap/roles.md:9`. El checker avisó que el checkout ejecuta Node 22.23.1 pese a `>=24 <25`; no impidió la verificación. |
| `git diff --check` | Exit 0. |

## L-3 — Resumen del Sidebar en backend

**Estado: completada.** La composición vive en `src/app/cross-domain/`; `AppModule` importa `CrossDomainModule`, que registra el controller y servicio de SidebarSummary en `sidebar-summary/` y su contrato tipado en `sidebar-summary/dto/`. El módulo depende de `AuthorizationModule`, `VersionsModule`, `RequestsModule` y `SuggestionsModule`; ningún módulo de dominio depende de CrossDomain. No hay módulos Nest independientes por cada consulta transversal. Versions, Requests y Suggestions exportan su servicio existente para lecturas estrechas.

El controller `GET /app/sidebar-summary`, bajo el prefijo global `/api`, exige autenticación. El JWT strategy carga al usuario vigente desde el servidor; el resumen usa su rol actual y no acepta permisos del cliente. Todos los roles reciben versión, `riffvalley` y `superadmin` reciben el conteo de requests, y solo `superadmin` recibe IDs de suggestions. Las propiedades no autorizadas se omiten.

Contrato real que consumirá L-4:

```json
{
  "version": { "latest": "1.8.4" },
  "petitions": { "pending": 12 },
  "suggestions": { "inProgressIds": ["uuid-1", "uuid-2"] }
}
```

`version.latest` es `string | null`; `null` significa que no existe versión en producción y conserva la consulta existente ordenada por `publishedAt`, `releaseDate` y `createdAt`, sin filtrar `isActive`. `petitions.pending` cuenta exactamente filas `pending` mediante `Repository.count`; un `0` es un conteo real. `suggestions.inProgressIds` contiene los IDs globales con estado `in_progress`, seleccionados sin hidratar entidades ni relaciones. El frontend debe restar sus `readIds` locales; el contrato no usa `isRead` como sustituto.

Las lecturas requeridas se ejecutan en paralelo. Cualquier error se propaga y falla la respuesta completa; no se crean valores fallback. No se cambiaron endpoints ni contratos existentes, roles, guards, estados, stores o frontend. No se añadieron caché, polling, migraciones ni índices.

### Verificaciones de L-3

| Verificación | Resultado |
|---|---|
| Suites focalizadas | 4 suites y 36 tests pasan; cubren los cuatro roles, omisión de campos, cero real, IDs, filtros, consulta mínima, errores y metadata/compatibilidad de endpoints existentes. |
| Gates structural, type-safety, ESLint, typecheck y build | Pasan; no se añadieron diagnósticos a los baselines. `nest build` pasa. |
| Suite Jest completa | 206 suites pasan; 14 suites y 86 tests se omiten según la configuración del repositorio. La ejecución fuera del sandbox completó sin fallos: 2008 tests pasan y 86 se omiten. |
| `git diff --check` | Pasa en el backend. |

## L-4 — Integración de SidebarSummary con TanStack Query

**Estado: completada.** La composición transversal vive en `src/app/sidebarSummary.ts`, sin módulo funcional nuevo. El cliente usa el Axios autenticado existente y `GET /app/sidebar-summary` (prefijo global `/api`), transmite `AbortSignal` y modela como opcionales las proyecciones privadas omitidas. `useSidebarSummaryQuery()` usa el QueryClient ya instalado, solo se habilita con sesión autenticada, y aplica `staleTime: 60 s`, `gcTime: 5 min` y ningún polling. Su key incluye `userId`, rol y `authSessionGeneration` existente.

`SidebarMenu.vue` ya no inicia las llamadas a Versions, Requests o Suggestions ni escribe sus respuestas en `petitionsStore`/`supportStore`. El footer usa `version.latest`; Requests solo muestra el contador si viene `petitions.pending`; Suggestions calcula el total como `inProgressIds` menos IDs que `supportStore.isRead()` marca localmente. La omisión del campo privado no se convierte en cero; los errores permanecen en Query y no fabrican datos. Las vistas Requests y Suggestions mantienen sus consultas legacy.

La query se invalida después de crear/aprobar/reabrir/rechazar Requests; crear, rechazar, completar, devolver a `in_progress` o borrar Suggestions; y crear/renombrar/editar/publicar una versión que puede cambiar la versión de producción más reciente. `mutateAndInvalidateSidebarSummary()` ejecuta la invalidación solo tras una mutación exitosa y usa solo el prefijo `app/sidebar-summary`; los cambios de prioridad, lecturas locales, consultas de vistas y otros datos no la invalidan.

`privateQueryCache` elimina y cancela queries en logout, cambio de identidad y cambios efectivos en las capacidades del resumen. Las capacidades observadas son Requests (`role >= riffvalley`) y Suggestions (`superadmin`); los cambios se notifican entre pestañas. El cambio `riffvalley → collaborator` cancela/elimina los contadores Requests antes de presentar el nuevo rol. La key separa roles y sesiones, y la cancelación viaja al Axios request para evitar que una respuesta vieja recargue datos.

### Verificaciones de L-4

| Verificación | Resultado |
|---|---|
| Tests focalizados | 5 suites, 28 tests pasan: query, cache privada, Sidebar, logout y shell con una petición. |
| Typecheck / build | `pnpm run typecheck` y `pnpm run build` pasan en Node 22.23.1 / pnpm 11.28.8. Build conserva un warning CSS preexistente de `.flex-[2]`. |
| ESLint de archivos tocados | Exit 1: 93 diagnósticos en los SFC legacy. La comparación contra `HEAD` de los siete SFC tuvo 102; no se introdujeron diagnósticos y se eliminaron nueve al retirar las cargas viejas del Sidebar. ESLint pasa en query/cache y tests nuevos o ajustados. |
| `pnpm run markdown:links` | Exit 0; el único enlace local externo fallido sigue siendo el hallazgo preexistente `roadmap/roles.md:9`. |
| `git diff --check` | Pasa. |

No se inició L-5 ni se migraron las consultas de las vistas a TanStack Query.

## L-5a — Inspección previa de responsabilidades del Sidebar

**Estado: inspección documental completada; L-5 cerrada como N/A.** Se revisó el `SidebarMenu.vue` completo, sus datos de navegación, `DefaultLayout.vue`, `src/app/sidebarSummary.ts`, los owners públicos de Identity, la store legacy de Suggestions y las pruebas existentes. La justificación y evidencia de esta sección se conservan como base del cierre. No se modificó código funcional.

### Tamaño y responsabilidades actuales

`src/layouts/default/components/SidebarMenu.vue` tiene **486 líneas**: alrededor de 314 de template y 162 de script. La longitud está dominada por el markup explícito de las cinco categorías, enlaces y estados visuales; por sí sola no evidencia complejidad de negocio ni justifica dividir el componente.

| Área | Implementación actual | Evaluación de ownership |
|---|---|---|
| Menú y presentación | Categorías, enlaces, grupos desplegables, selector de áreas, versión y controles visuales. Consume `routes.json`. | Correctamente en `SidebarMenu`; es representación y navegación. |
| Overlay, scroll y menú móvil | `menuVisible` llega por prop. Sidebar emite `close-menu`; no posee overlay, lock ni estado de visibilidad. | Correctamente en `DefaultLayout` desde L-1. |
| Tema | `isDark` llega por prop; emite `toggle-theme`. | Sidebar presenta el control; `DefaultLayout` coordina tema. |
| Sesión y permisos | `useAuthStore()` proporciona sesión/rol y logout; `hasMinimumRole` y `UserRole` vienen del entrypoint público `identity/shared`. | Auth/Identity conserva sesión, logout y jerarquía. El Sidebar deriva visibilidad de presentación; esto no sustituye los guards ni autorización backend. |
| Preferencias de áreas | Lee `dashboardButtonsEnabled` mediante `useDashboardPreferences()` desde el entrypoint público `identity/account`. | La persistencia pertenece a Account; Sidebar decide cómo presentarla. |
| Resumen remoto | `useSidebarSummaryQuery()` viene de `src/app/sidebarSummary.ts`; deriva versión, peticiones pendientes y los IDs globales de Suggestions. | Query transversal y ciclo de vida viven en `src/app/sidebarSummary.ts`, no en el componente. No hay servicios, DTOs de dominio ni llamadas HTTP directas en Sidebar. |
| Sugerencias leídas | Consulta `supportStore.isRead(id)` para restar IDs locales al conjunto remoto y mostrar el badge. | El estado de lectura permanece en el owner actual de Suggestions; el conteo resultante es proyección visual del Sidebar. No moverlo. |
| Peticiones | Presenta `petitions.pending` solo cuando la proyección autorizada existe. | El dato se mantiene en el resumen de aplicación; Sidebar no consulta la vista ni su API. |
| Logout | Invoca `authStore.logout()`, navega a Login con Router y muestra aviso si la revocación no se confirmó. | Auth ejecuta la operación de sesión; navegación y aviso son coordinación de interfaz. |
| Props, eventos y estado local | Props requeridas `menuVisible`, `isDark`; eventos `close-menu`, `toggle-theme`. `selectedArea` es el único `ref` de interacción local; áreas y rutas visibles son `computed`. | Apropiado para estado efímero y contratos visuales del componente. |

El script tiene **un `ref`, 16 `computed` devueltos o internos y ningún watcher**. No hay efectos manuales de montaje/desmontaje, mutación de stores, escritura en almacenamiento, manipulación DOM ni carga directa. Los efectos observables son suscribirse a la query, ejecutar logout/navegación/notificación y emitir eventos de interfaz.

### Hallazgos reales y límites

- No se encontró responsabilidad de negocio de Requests, Suggestions o Versions dentro del Sidebar. El componente no conoce transporte ni respuestas de sus APIs detalladas.
- No hay watcher redundante ni estado derivado mantenido manualmente que pueda sustituirse por `computed`.
- La dependencia directa de `supportStore` es legacy, pero representa el owner actual de `readIds` que el badge necesita. Moverla durante L-5 rompería el ownership acordado; no se propone migración.
- Las funciones de visibilidad/roles (`filterByRole`, selección de áreas y clasificación del menú) son reglas de representación de la navegación declarada en `routes.json`. No se duplican con autorización efectiva del servidor; Router mantiene sus guards. No hay evidencia de que extraerlas a Identity o a un composable aporte valor.
- Los badges de Requests y Suggestions repiten su representación en el encabezado de categoría y en el enlace. Esto responde a dos ubicaciones visuales; el cálculo es único por dato y no justifica un componente/helper adicional. El tope visual `99+` está inline en ambos puntos: pequeña repetición de presentación, sin defecto o complejidad suficiente para abrir L-5.
- La importación singleton de Router para ir a Login acopla el flujo a la instancia de aplicación, pero es navegación del shell y las pruebas actuales la ejercitan. No se demostró una dificultad de test ni un contrato incorrecto que justifique cambiarla en esta iniciativa.
- El template largo y el estilo/formato del script son preferencias de organización, no problemas demostrados. No se propone dividir el template solo para bajar líneas.

Las pruebas existentes de Sidebar ya cubren permisos de navegación, omisión de campos no autorizados, resta de IDs leídos, versión y las dos salidas relevantes de logout. No se identificó un riesgo de testabilidad que requiera extraer lógica para poder verificarla.

### Alternativas y recomendación

| Alternativa | Evaluación |
|---|---|
| **A — Mantener SidebarMenu** | **Recomendada.** Tras L-4, sus dependencias cruzadas son contratos públicos de Identity, el composable transversal de `src/app/sidebarSummary.ts` y la store legacy que posee el estado local de lectura. El resto es navegación, presentación, estado local y coordinación de interfaz. No hay un movimiento de ownership pendiente que justifique refactorizar. |
| **B — Refactorización mínima** | No se recomienda ahora: no hay duplicación funcional ni lógica con owner incorrecto demostradas. La repetición visual del badge no alcanza el umbral para extraer un helper. |
| **C — Composables/componentes** | No se recomienda: cada bloque comparte el estado y contexto de la misma navegación; no apareció una responsabilidad independiente con ciclo de vida o reutilización que amerite extracción. |

### Propuesta para L-5

La evidencia favorece **cerrar L-5 como N/A**, sujeto a la decisión de cierre, sin cambios funcionales, archivos de código afectados, migraciones de ownership ni subtareas. No proponer archivos nuevos. Si se decide implementar algún cambio pese a esta evidencia, primero habría que señalar un problema concreto; la inspección no deja un plan de refactorización pendiente. Las vistas de Requests y Suggestions conservan sus consultas actuales, según el alcance acordado.

La decisión registrada cierra L-5 como **N/A**, sin cambios en `SidebarMenu.vue`. La auditoría posterior L-6a determina el alcance de limpieza legacy; L-6 continúa pendiente de implementación o descarte formal.

### Verificación documental de L-5a

| Verificación | Resultado |
|---|---|
| `pnpm run markdown:links` | Exit 0. Escaneó 21 archivos y 1302 enlaces; informó un único fallo local ajeno y preexistente en `roadmap/roles.md:9` (`../../spammusic-back/roadmap/roles-frontend-contract.md`, fuera del repositorio). Avisó que el Node disponible es 22.23.1 y el proyecto pide `>=24 <25`; el checker completó. |
| `git diff --check` | Exit 0. |
| Alcance de archivos | L-5a solo actualizó `roadmap/layout.md`. Se preservaron los cambios existentes del checkout, incluidos cambios funcionales, `roadmap.md` y el estado previo de este roadmap; no se ejecutaron build, typecheck ni tests. |

## L-6a — Inspección previa de estado legacy y duplicaciones

**Estado: auditoría documental completada; L-6 sigue pendiente.** Se inspeccionó el árbol de trabajo actual el 26 de octubre de 2026, incluidos los cambios locales ya presentes de L-1–L-4. La inspección fue estática; no se modificó código, no se borró estado ni se alteraron contratos. Las búsquedas de referencias se hicieron sobre `src/`, incluyendo referencias productivas y tests cuando correspondía. El checkout tiene otros archivos modificados y `roadmap/layout.md` ya estaba sin seguimiento antes de esta auditoría; se preservaron.

### Stores y estado de cliente

| Store / estado | Estado, acciones y datos | Consumidores y lecturas/escrituras observadas | Evaluación |
|---|---|---|---|
| `src/stores/petitions/petitions.ts` | `pendingCount` numérico y `setPendingCount`; refleja un conteo remoto derivado. Sin getters adicionales ni efectos secundarios. | `PetitionsPage.vue` escribe al cargar la lista y después de aprobar, reabrir o rechazar (`syncPendingCount`). No quedan lecturas del estado ni llamadas desde Sidebar en `src/`. | Espejo remoto sin lectores: obsoleto tras L-4. La vista conserva `requests` local para renderizar, filtrar y editar; eso sí es necesario. Limpieza acotada B. |
| `src/stores/support/support.ts` — remoto | `pendingIds`, `setPendingIds` y `unreadCount`; IDs derivados de la respuesta remota, duplicados ahora por `sidebarSummary`. `markAllAsRead` también depende de `pendingIds`. | `SuggestionsManagement.vue` escribe IDs tras cada `fetchAll`; `unreadCount` no tiene lecturas externas y `markAllAsRead` no tiene llamadas en `src/`. El Sidebar ya calcula el badge con `sidebarSummary.suggestions.inProgressIds`. | Proyección remota obsoleta y escrituras sin consumidor efectivo. Retirar este espejo y sus escrituras sería una limpieza B, junto con la store. |
| `src/stores/support/support.ts` — local | `readIds` se carga/guarda en `localStorage` bajo `rv_support_read_ids`; `isRead` y `markAsRead` operan sobre ese estado local. | Sidebar resta los IDs leídos del resumen remoto; `SuggestionsManagement.vue` consulta `isRead` para marcar filas y llama `markAsRead`. | Necesario. No eliminar ni cambiar persistencia, ciclo de sesión o comportamiento del badge. |
| `src/stores/catalog/catalog.ts` | Géneros, países y `loaded`; `fetchCatalog()` trae y ordena el catálogo remoto. | App lo precarga al autenticarse; Petitions, calendarios, listas, importación, Home y `GenrePlaylistManager` leen o cargan el catálogo. `loaded` evita repetir la carga tras la primera respuesta. | Necesario y fuera del cleanup de Sidebar (D). Las llamadas desde App/vistas no son una duplicación demostrada de estado sin consumidores. |
| Identity/Auth y preferencias | Sesión/rol y generación de sesión pertenecen a Auth; preferencias de dashboard a Account. Sidebar consulta contratos públicos de Identity. | Sidebar deriva visibilidad y clave de query; App coordina carga de catálogo al autenticarse; Router mantiene guards. | Necesario y fuera de alcance. No tocar autenticación, permisos ni logout (D). |
| Shell y resumen | `DefaultLayout.vue` mantiene `menuVisible`, tema, overlay, cierre por ruta y scroll lock. `SidebarMenu.vue` deriva versión, contador Requests e IDs de Suggestions desde `useSidebarSummaryQuery`; conserva solo selección de área local. | DefaultLayout pasa estado visual por props/eventos; Sidebar consume `authStore`, preferencias, `supportStore.isRead` y el resumen Query. | Un owner visual desde L-1; no se encontró estado de menú duplicado con App ni resto de llamadas directas a los tres endpoints en Sidebar. Conservar. |

### Servicios HTTP, llamadas y consumidores

| Endpoint / wrapper | Consumidores actuales | Duplicación o estado alimentado | Clasificación y propuesta |
|---|---|---|---|
| `GET /requests` — `getAllRequests()` | `PetitionsPage.vue`, en su carga de listado. | La respuesta completa alimenta la tabla, filtros y formularios; el resumen L-4 obtiene el conteo mínimo para el badge. La llamada de la vista es necesaria aunque tenga solapamiento de dominio. | Conservar endpoint, servicio y llamada (D respecto a una migración). No retirar el endpoint ni migrar la vista. |
| `GET /requests/my` — `getMyRequests()` | `SuggestPage.vue`, para mostrar las solicitudes del usuario. | Resultado completo de pantalla, independiente del contador global. | Necesario; conservar. |
| `GET /suggestions` — `getSuggestions(params)` | `SuggestionsManagement.vue`, en carga inicial, cambios de filtros y recargas tras mutaciones. | La vista necesita los objetos completos y puede consultar subconjuntos por tipo/estado; el resumen entrega solo IDs globales en curso para el badge. Aunque el filtro inicial de la vista se solape con el estado, no son consultas redundantes con el mismo propósito. | Conservar llamada/servicio y filtros actuales. No migrar la vista ni modificar el badge. |
| `GET /suggestions/my` — `getMySuggestions()` | `SuggestionsPage.vue`, para listado y conteos personales. | Datos de contenido y conteos propios de la pantalla. | Necesario; conservar. |
| `GET /versions/production/latest` — `getLatestPublicVersion()` y `getLatestProductionVersion()` | En producción frontend no se encontraron consumidores de ninguno de los dos wrappers; `rg` encuentra sus declaraciones, no invocaciones. El Sidebar usa el resumen de L-4. | Ambos wrappers ejecutan el mismo GET si se llaman; no hay llamada frontend activa a través de ellos en el árbol inspeccionado. La versión del Sidebar llega por `GET /app/sidebar-summary`. | Los dos wrappers exportados están obsoletos sin consumidores observados: candidato A para eliminación segura, conservando el endpoint backend y el servicio de resumen. Confirmar de nuevo referencias al implementar. |
| `GET /app/sidebar-summary` — `getSidebarSummary()` | `useSidebarSummaryQuery()` desde Sidebar; la query usa clave con usuario/rol/generación. | Sustituye las tres cargas directas que hacía Sidebar antes de L-4. Mutaciones de Requests, Suggestions y Versiones que pueden afectar esos datos llaman al wrapper de invalidación. | Necesario; conservar query key, caché, invalidaciones y limpieza privada. |

Las llamadas HTTP de detalle que siguen en Petitions y Suggestions no deben eliminarse por “duplicar” el resumen: las vistas requieren filas y datos para interacción, mientras el shell requiere una proyección mínima. Tampoco se considera duplicación consultar recursos en pantallas distintas con filtros o objetivos diferentes.

### Duplicaciones verificadas y elementos que se conservan

- **Espejo remoto de peticiones:** `pendingCount` solo tiene escrituras en la vista y ninguna lectura en el repositorio; Sidebar ya muestra el conteo de Query. No queda un efecto secundario asociado a la escritura. Retirar la store y los cuatro puntos de sincronización identificados evitaría mantener estado muerto.
- **Espejo remoto de sugerencias:** `pendingIds` se actualiza desde una vista filtrable, pero el Sidebar ya usa los IDs globales del resumen. `unreadCount` y `markAllAsRead` no tienen consumidores efectivos. Retirar el espejo y `setPendingIds` evitaría mantener proyección obsoleta; conservar `readIds`, `isRead` y `markAsRead`, que siguen teniendo lectores y escrituras reales.
- **Wrappers sin referencias:** `getLatestPublicVersion` y `getLatestProductionVersion` solo aparecen como declaraciones en el código fuente actual, mientras el Sidebar se alimenta del resumen. Se puede retirar únicamente esas funciones, no `versions.ts`, el endpoint backend ni los otros servicios de versiones.
- **No hay llamadas antiguas activas desde Sidebar:** no importa los servicios de Requests, Suggestions o `getLatestPublicVersion`, ni contiene un `onMounted` que lance esas llamadas. La única dependencia legacy de datos que mantiene el componente es `supportStore.isRead`, necesaria para aplicar el estado local leído.
- **No se demostró duplicación en las invalidaciones:** `clearPrivateQueryCache` se invoca desde el observador de transiciones privadas; la invalidación del resumen se activa tras mutaciones pertinentes. No hay doble limpieza observable ni invalidaciones generales repetidas que se propongan retirar. Las invalidaciones amplias relacionadas con el selector de versión no se optimizan sin demostrar que la mutación no puede alterar el resultado seleccionado.
- **Layout y Identity:** `DefaultLayout` es el owner único del menú visual. El estado derivado del resumen no se copia a Pinia en Sidebar. No hay imports, funciones o variables muertas detectados en el script actual de Sidebar por lectura estática; no se propone refactor por tamaño. Persistencia de `readIds` y comportamiento de logout quedan fuera de alcance.

### Clasificación de hallazgos

| Elemento | Consumidores / evidencia | Clasificación | Acción propuesta |
|---|---|---|---|
| `getLatestPublicVersion()` en `src/services/versions/versions.ts` | Solo declaración encontrada; Sidebar dejó de importarla tras L-4. | **A — Eliminación segura** | Retirar únicamente el wrapper sin referencias, tras repetir búsqueda global al implementar. |
| `getLatestProductionVersion()` en `src/services/versions/versions.ts` | Solo declaración encontrada; ninguna invocación de producción/tests en el repositorio. | **A — Eliminación segura** | Retirar únicamente el wrapper sin referencias; no tocar ruta backend. |
| `petitions.pendingCount`, `setPendingCount`, su store y sincronizaciones | Solo Petitions escribe; no hay lecturas productivas tras el cambio del Sidebar. | **B — Limpieza pequeña** | Retirar el espejo Pinia y llamadas `syncPendingCount`; conservar `requests` local y todas las mutaciones/refetch actuales. |
| `support.pendingIds`, `unreadCount`, `setPendingIds`, `markAllAsRead` y escritura en `fetchAll` | La vista escribe la lista; el computed no tiene consumidores externos y `markAllAsRead` no tiene invocaciones. Sidebar lee los IDs desde Query. | **B — Limpieza pequeña** | Retirar solo el estado remoto muerto, métodos y escritura asociada. Mantener lectura/escritura de IDs locales y los indicadores de filas leídas. |
| Listas remotas locales de Petitions/Suggestions y servicios de consulta | Consumidas por sus vistas para contenido, filtros, acciones y actualización de filas. | **C — Migración funcional** | No recomendar dentro de L-6; mantener como están. |
| `catalogStore`, Identity, permisos, logout, persistencia de leídos, reglas de invalidación/cache y endpoints backend | Consumidores activos o ownership fuera de la limpieza del layout. | **D — Fuera de alcance** | Conservar; no alterar contratos, comportamiento ni políticas. |

### Propuesta mínima para L-6

Hay trabajo pequeño justificado; no se recomienda cerrar L-6 como N/A. Dividir en dos subtareas independientes:

1. **L-6.1 — Quitar el espejo de Requests (XS): completada.** La store fue eliminada, junto con su import/instancia, `syncPendingCount` y las llamadas de sincronización en `PetitionsPage.vue`. El listado, las mutaciones, su actualización local y las invalidaciones de resumen permanecen.
2. **L-6.2 — Quitar el espejo remoto de Suggestions y wrappers de versión (XS): pendiente, no iniciada.** En `src/stores/support/support.ts`, retirar `pendingIds`, `unreadCount`, `setPendingIds` y `markAllAsRead`; en `SuggestionsManagement.vue`, quitar el cálculo/escritura de `pendingIds`, sin cambiar `isRead`/`markAsRead`; en `src/services/versions/versions.ts`, retirar solo los dos wrappers sin consumidores. El estado local leído y el resumen Query permanecen intactos.

**Archivos de L-6.1:** `src/stores/petitions/petitions.ts` (eliminado) y `src/views/petitions/PetitionsPage.vue` (sincronizaciones retiradas). **Archivos previstos para L-6.2:** `src/stores/support/support.ts`, `src/views/suggestions/SuggestionsManagement.vue` y `src/services/versions/versions.ts`.

**Riesgos pendientes de L-6.2:** referencias dinámicas o consumidores externos al repositorio no aparecen en una búsqueda estática; repetir búsqueda antes de borrar. Cambiar accidentalmente `readIds`/`isRead`/`markAsRead` alteraría el badge y los indicadores de lectura; excluirlos expresamente. No tocar requests de detalle, mutaciones, invalidaciones, Query keys, roles ni backend. Para L-6.1 la búsqueda en código confirmó que no quedan referencias; las menciones históricas de `pendingCount` se conservan en roadmaps de auditoría.

**Pruebas necesarias al implementar:** comprobar referencias restantes a los símbolos retirados; ejecutar las pruebas enfocadas existentes de Sidebar (roles y Suggestions leídas) y las pruebas de Petitions/Suggestions si existen. Si no hay pruebas de esas vistas, añadir cobertura acotada solo para asegurar que el flujo de listado/mutación y el estado leído se mantienen; no es necesario build/typecheck por una limpieza JS/Vue sin cambios de contrato, salvo que el diff final lo justifique. Registrar por separado resultado local y cualquier CI real.

**Tamaño total estimado:** XS–S para las dos subtareas independientes y sin migración funcional. L-6.1 está completada; L-6 continúa **pendiente** hasta completar o descartar formalmente L-6.2 con nueva evidencia. L-7 no se inicia.

### Verificación documental de L-6a

| Verificación | Resultado |
|---|---|
| `pnpm run markdown:links` | Exit 0; escaneó 21 archivos Markdown y 1302 enlaces. Informó el único fallo preexistente fuera del repositorio en `roadmap/roles.md:9` (`../../spammusic-back/roadmap/roles-frontend-contract.md`). |
| `git diff --check` | Exit 0. |
| Alcance de L-6a | Solo se editaron `roadmap/layout.md` y la referencia de estado en `roadmap.md`. El checkout ya tenía `roadmap.md` modificado, `roadmap/layout.md` sin seguimiento y cambios funcionales previos; no se tocaron archivos de código durante esta auditoría. |

### Ejecución de L-6.1 — Requests

**Estado: completada.** La búsqueda global encontró usos de `pendingCount`/`setPendingCount` solo en la declaración de la store y las escrituras de `PetitionsPage.vue`; no encontró lectores ni otros consumidores de código. Se eliminó `src/stores/petitions/petitions.ts` y se retiraron de `PetitionsPage.vue` el import/instancia, `syncPendingCount` y sus llamadas. Se conservaron `GET /requests`, `GET /requests/my`, el listado local, filtros, formularios, mutaciones, actualización de filas e invalidaciones del resumen. No se ejecutó L-6.2 ni L-7.

| Verificación | Resultado |
|---|---|
| Búsqueda de referencias de código | Sin referencias a `pendingCount`, `setPendingCount`, `usePetitionsStore` ni a la ruta de la store en `src/`. Permanecen menciones históricas en roadmaps, que no son consumidores de runtime. |
| Tests focalizados | No hay test de `PetitionsPage` en el repositorio. Pasaron los tres archivos disponibles de Sidebar/resumen: 3 suites, 13 tests. |
| Typecheck | `pnpm run typecheck`: completado; también pasó dentro de `pnpm build`. |
| Build | `pnpm build`: exit 0. Conserva avisos preexistentes de Browserslist desactualizado, CSS `.flex-[2]` y chunks grandes. |
| Lint focalizado y baseline | `pnpm exec eslint src/views/petitions/PetitionsPage.vue` y el mismo archivo desde `HEAD` reportan 23 errores cada uno, con las mismas reglas y mensajes; no se detectaron errores nuevos. Son hallazgos preexistentes y no se corrigieron. |
| `git diff --check` | Exit 0. |
| Archivos de código de L-6.1 | Solo se modificó `src/views/petitions/PetitionsPage.vue` y se eliminó `src/stores/petitions/petitions.ts`. Los demás cambios del checkout se conservaron. |

En el momento de documentar L-6.1, L-6 permanecía **pendiente** por L-6.2. La ejecución posterior de L-6.2 y el cierre verificado de L-6 constan a continuación.

### Ejecución de L-6.2 — Suggestions y wrappers de Versions

**Estado: completada.** Se repitió la búsqueda global antes de eliminar los símbolos. `pendingIds`, `unreadCount`, `setPendingIds` y `markAllAsRead` no tenían consumidores: el único escritor era `SuggestionsManagement.vue`, mientras que Sidebar deriva el badge desde `sidebarSummary`. Los wrappers `getLatestPublicVersion()` y `getLatestProductionVersion()` solo aparecían en sus declaraciones de `versions.ts`; se conserva el endpoint backend `GET /versions/production/latest` y los demás servicios frontend de Versiones.

Se retiraron los cuatro miembros remotos de la store y la escritura asociada al `fetchAll` filtrado. `readIds`, `isRead`, `markAsRead`, la persistencia `rv_support_read_ids`, los indicadores de filas, el resumen del Sidebar y el resto de filtros/listados/mutaciones permanecen sin cambios. No se añadieron tests porque la modificación elimina código sin consumidor y conserva intacta la lógica de lectura existente; no hay tests propios de Suggestions o Versions disponibles.

| Verificación | Resultado |
|---|---|
| Búsqueda global de símbolos retirados en `src/` | Exit 0, sin referencias a los cuatro miembros de Suggestions ni a los dos wrappers de Versions. El endpoint backend se conserva y no fue modificado. |
| Tests focalizados disponibles | `pnpm exec vitest run src/layouts/default/components/SidebarMenuAuth.test.ts src/layouts/default/components/SidebarMenuPermissions.test.ts`: 2 archivos, 8 tests aprobados. No hay suites específicas de Suggestions o Versions. Una invocación previa ejecutó el suite completo: 55 archivos y 341 tests aprobados. |
| Typecheck | `pnpm run typecheck`: exit 0 con Node 24.22.1 y pnpm 11.28.8. |
| Build | `pnpm run build`: exit 0. Muestra avisos preexistentes de Browserslist desactualizado, CSS `.flex-[2]` y tamaño de chunks. |
| ESLint focalizado y comparación con `HEAD` | Los archivos actuales y sus versiones de `HEAD` producen los mismos hallazgos: 18 errores en `SuggestionsManagement.vue`; cero en `support.ts` y `versions.ts`. No se corrigieron hallazgos preexistentes. |
| `git diff --check` | Exit 0. |
| Archivos de L-6.2 | `src/stores/support/support.ts`, `src/views/suggestions/SuggestionsManagement.vue`, `src/services/versions/versions.ts` y este roadmap. No se modificó `SidebarMenu.vue`, backend, `sidebarSummary.ts` ni configuración. |

L-6 queda **completada** porque L-6.1 y L-6.2 están verificadas.

## L-7 — Regresión y cierre del Layout

**Estado: completada con límites documentados.** Se ejecutó la regresión frontend sobre el checkout con Node 24.22.1 y pnpm 11.28.8. Los tests usan mocks y no contactan el backend ni la base de datos reales. No hay script ni configuración E2E en `package.json`, `.github` o `scripts`; por eso la cobertura de interacción es la disponible en Vitest y la revisión estática.

El usuario confirma que realizó un smoke test manual y que funcionó correctamente; no se detallaron casos ni entorno.

### Shell, navegación y preferencias

| Escenario | Evidencia |
|---|---|
| Una instancia de Sidebar y una petición inicial de resumen | `App.shell.test.ts`: una instancia y una llamada a `/app/sidebar-summary` para una ruta ordinaria autenticada. La query permanece deshabilitada anónimamente (`sidebarSummary.test.ts`). |
| Ruta pública sin Sidebar | `App.shell.test.ts`: NationalReleasePublic no monta Sidebar ni hamburger. |
| Abrir/cerrar menú, overlay y scroll | `App.shell.test.ts`: el botón abre el menú; overlay único; `body` queda bloqueado y se restaura al cerrar; también se restaura al desmontar el shell. La prueba confirma la llamada de restauración de scroll. |
| Logout | `SidebarMenuAuth.test.ts` y tests de Auth: limpieza local, navegación a Login y aviso si el servidor no confirma revocación. |
| Guards y roles | `router/importPermissions.test.ts` y `router/authInitialization.test.ts`: acceso anónimo, rutas por rol, revocación de permisos en ruta administrativa e inicialización. |
| Tema, área y navegación entre rutas ordinarias | Revisión estática de `DefaultLayout.vue` y `SidebarMenu.vue`: tema y área siguen delegados a las preferencias/store existentes; el watcher de ruta cierra el menú. No hay un test específico de estas tres interacciones en el checkout. |

### SidebarSummary, sesión y caché

- El resumen se solicita una vez en carga inicial elegible; la prueba de shell verifica una llamada y `sidebarSummary.test.ts` comprueba endpoint, `AbortSignal` y query desactivada sin sesión. La respuesta pública muestra versión. Los datos de Requests solo se proyectan desde `riffvalley`; Suggestions solo desde `superadmin`. El badge de Suggestions calcula `inProgressIds` menos `readIds` y los campos ausentes no se presentan como cero (`SidebarMenuPermissions.test.ts`).
- `sidebarSummary.test.ts` conserva estado de error de Query y confirma que no se crea ningún dato con contadores cero al fallar la petición. Las invalidaciones solo afectan al prefijo del resumen y se ejecutan después de mutaciones exitosas.
- `privateQueryCache.test.ts` cubre logout, expiración, logout remoto, cambio de usuario, cambio de permisos, downgrade `riffvalley → collaborator`, limpieza/cancelación y rechazo de respuestas tardías. `auth.test.ts` y `sessionAuth.test.ts` cubren renovación/login/logout.
- La búsqueda en `src/layouts/default/` y `SidebarMenu.vue` no encuentra llamadas directas antiguas a `/requests`, `/suggestions` ni `/versions/production/latest`; el Sidebar solo usa el resumen. Las vistas Petitions, Suggestions y Versions conservan sus llamadas de detalle y sus mutaciones con invalidación del resumen cuando corresponde.

### Limpieza legacy

La búsqueda productiva en `src/` no encuentra store/import de `petitions`, `pendingCount`, `setPendingCount`, `pendingIds`, `unreadCount`, `setPendingIds`, `markAllAsRead`, `getLatestPublicVersion()` ni `getLatestProductionVersion()`. Permanecen las consultas de pantalla necesarias: `getAllRequests()`/`getMyRequests()`, `getSuggestions()` y los listados/paginación de Versiones.

### Gates locales

| Gate | Resultado |
|---|---|
| Tests focalizados de shell, resumen, sesión, logout y permisos | 10 archivos, 81 tests aprobados. |
| Suite completa `pnpm test` | 55 archivos, 341 tests aprobados. Algunos tests imprimen errores offline esperados al probar estados de error. |
| `pnpm run typecheck` | Exit 0. |
| `pnpm build` | Exit 0. Emite avisos de caniuse-lite desactualizado, selector CSS `.flex-[2]` y chunks mayores de 500 kB; no se modificaron configuración ni dependencias. |
| `pnpm lint` | Exit 1: 1131 errores, 0 warnings. Comparación de `HEAD` mediante `git archive` y la misma versión de ESLint: también 1131 errores, 0 warnings. Los tres archivos funcionales modificados mantienen exactamente los hallazgos baseline en `SuggestionsManagement.vue` (18); `support.ts` y `versions.ts` tienen 0 en ambas versiones. No se atribuyen ni corrigen hallazgos preexistentes. |
| `pnpm run markdown:links` | Exit 0, 21 archivos y 1302 enlaces. Informa un fallo preexistente en `roadmap/roles.md:9`, que apunta fuera del repositorio. |
| `git diff --check` | Exit 0 tras la actualización documental. |

No se verificó GitHub Actions ni se hicieron requests contra backend/base de datos reales. Los tests del frontend usan mocks; la revisión de la selección de endpoints e invalidaciones confirma el wiring en cliente, no disponibilidad ni autorización efectiva del servicio real. No se detectaron regresiones que requieran corrección; no se alteraron contratos, comportamiento funcional, dependencias ni configuración.

**Cierre:** L-0–L-4 y L-6 completadas, L-5 N/A tras auditoría y L-7 completada. El roadmap de Layout queda **completado** con las limitaciones locales registradas arriba.
