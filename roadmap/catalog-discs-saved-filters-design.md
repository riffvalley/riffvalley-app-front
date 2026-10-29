# CAT-DISC-6a — Auditoría y diseño de filtros guardados

**Estado:** CAT-DISC-6a–6d completadas y CAT-DISC-6 cerrada el 2026-10-29. Este documento conserva las recomendaciones originales de diseño; los contratos y la evidencia backend están registrados en `../riffvalley-app-back/roadmap/catalog/catalog-discs-saved-filters.md` y el cierre frontend en [la auditoría de Discos](catalog-discs-audit.md#cat-disc-6d--regresi%C3%B3n-focalizada-y-cierre).
**Alcance:** estado y filtros actuales de `/disc-list`, patrón de preferencias del Dashboard en los checkouts disponibles y propuesta de contrato, persistencia y UX para filtros guardados.
**Fuentes:** frontend de este checkout y código/documentación del checkout hermano `../riffvalley-app-back`. La inspección backend es estática; no se levantó el backend ni PostgreSQL.

## Recomendación

Persistir filtros guardados como recursos propios del usuario en una tabla pequeña, con UUID, propietario, nombre, configuración JSONB y fechas. Reutilizar el patrón JSONB existente de preferencias del Dashboard como antecedente de almacenamiento tipado, pero no añadir la colección al perfil `User`: sus preferencias representan dos configuraciones singleton de layout, mientras que estos filtros requieren CRUD, límites, propiedad, unicidad y actualización independiente.

El payload almacena únicamente los cuatro criterios: lista de `genreIds` UUID, un `countryId` UUID nullable, y `yearFrom`/`yearTo` nullable. El nombre queda fuera del JSON de criterios. Países aparece en el requerimiento en plural, pero el contrato actual de DiscList admite un solo país; no se amplía la selección en esta iniciativa sin aprobación explícita.

```json
{
  "name": "Metal extremo",
  "filters": {
    "genreIds": ["UUID", "UUID"],
    "countryId": "UUID",
    "yearFrom": 2025,
    "yearTo": 2026
  }
}
```

Un criterio vacío se representa de forma canónica como `genreIds: []`, `countryId: null`, `yearFrom: null`, `yearTo: null`. Se puede guardar cualquier combinación parcial, incluso la configuración vacía si el usuario la solicita explícitamente; no se guarda el default visual de año de forma implícita.

## Auditoría frontend

### Estado y contrato actuales

- El owner del estado es `useDiscListCoordinator()` en `src/modules/catalog/discs/application/useDiscListCoordinator.ts`. `DiscListFilters` de `src/modules/catalog/discs/types/discList.ts` contiene `query: string`, `dateRange: [string, string] | null`, `genreIds: string[]`, `countryId: string` y `artistId?: string`.
- `selectedGenres` es multiselección; el adaptador HTTP normaliza/deduplica los UUID y envía `genreIds` CSV. La semántica actual del backend es OR entre géneros. `selectedCountry` es un único UUID, vacío si no hay país.
- El selector temporal de `DiscListExplorationFilters.vue` expone año, mes y periodos semanales. El estado real es `selectedWeek`, un rango ISO UTC inclusivo representado por dos extremos; `discListDateFilters.ts` convierte años completos y meses a ese rango. El default del año se inicializa desde `rv_default_year_filter` (localStorage) y el evento `rv-year-filter-changed` puede cambiarlo. El criterio guardado propuesto solo captura límites anuales y al aplicarse se presenta como rango anual en el control actual.
- Los filtros llegan tanto a la consulta del listado como a la de opciones contextuales (`/discs/list/options`). País y géneros se reconcilian según esas opciones y la última acción explícita; las opciones no son necesariamente un catálogo global. Las seis ramas de modo comparten filtros. No se encontró sincronización de estado de DiscList con la URL.
- Cada cambio de criterio invalida la generación vigente, reinicia `offset` a cero y solicita la primera página; el coordinador también protege resultados frente a respuestas antiguas. El listado usa scroll infinito de 20 elementos. La aplicación guardada debe hacer una única sustitución de criterios, con offset 0, recargar opciones contextuales y resultados desde la primera página.
- Los vacíos actuales son `genreIds: []`, `countryId: ""` y `dateRange: null`. El selector deja elegir combinaciones parciales; “Limpiar exploración” también limpia búsqueda textual, así que no debe reutilizarse para aplicar un filtro guardado.
- El control temporal actual también admite meses y semanas, que no caben fielmente en el esquema anual `yearFrom`/`yearTo`. Guardar mientras haya un mes/periodo seleccionado no debe ampliar el criterio silenciosamente a uno o varios años; se necesita decidir si el guardado se deshabilita con explicación, si el formulario de guardar permite escoger límites anuales, o si el esquema debe aceptar un rango de fechas más general (esto último ampliaría el requisito).
- Componentes reutilizables: `DiscListExplorationFilters.vue` y `DiscListGenreSelect.vue`; utilidades de años/rangos en `discListDateFilters.ts`; propietario de aplicación y paginación en `useDiscListCoordinator.ts`; montaje compacto en `DiscListView.vue`. `DiscFilters.vue` es un componente legacy compartido para otros consumidores y no es el owner de los filtros nuevos de DiscList.

### Aplicación sin efectos laterales

Añadir a la coordinación una operación explícita que reciba el snapshot de criterios guardados y reemplace atómicamente solo los cuatro campos: `genreIds`, `countryId`, inicio y fin del periodo anual. No llamar a `clearExploration` ni simular cambios individuales que disparen varias cargas.

La operación conserva `searchQuery`, `selectedArtist`/`artistId`, `viewMode`, `orderBy` y el tamaño/patrón de paginación; no escribe el filtro guardado. Tras la aplicación, editar controles solo actualiza el estado temporal. “Actualizar” debe ser una acción aparte que persista explícitamente la selección actual en el recurso elegido.

No persistir en URL como parte de 6c: hoy no hay contrato de URL y los filtros son privados por usuario. La URL no es fuente de estado ni debe cambiar con aplicar/editar. Si una iniciativa futura agrega deep links, será una decisión separada y deberá excluir cualquier dato personal que no se quiera exponer.

## Auditoría y propuesta backend

### Patrón existente

En `src/identity/auth/entities/user.entity.ts` del checkout backend, `dashboardConfig` y `mobileDashboardConfig` son columnas `jsonb` nullable de `User`. El contrato de cuenta permite editar preferencias propias mediante `PATCH /api/auth`; login/session profile las entrega y frontend las refleja en el store `dashboardPreferences` más localStorage best-effort. `useDashboardConfig` serializa escrituras de una instancia y revierte el último cambio vigente si falla.

Ese patrón confirma soporte de JSONB y persistencia por usuario, pero no aporta una API de colección ni una garantía de aislamiento por recurso. Para filtros, se recomienda una entidad `saved_disc_filters` (nombre conceptual) con `id uuid`, `user_id uuid` como FK, `name varchar`, `filters jsonb`, `created_at timestamptz` y `updated_at timestamptz`. Índice por `user_id`; unicidad opcional recomendada por usuario y nombre normalizado sin distinguir mayúsculas. Borrado del propietario debe eliminar en cascada sus filtros.

El JSONB mantiene una versión de esquema explícita (`version: 1`) para migrar o leer formatos futuros. La validación de aplicación debe aceptar solo la versión conocida y las claves permitidas; la respuesta pública puede aplanar u omitir `version` si se decide que sea detalle de almacenamiento. No se serializan etiquetas de género/país: son metadatos cambiantes derivados del catálogo.

### Operaciones de API propuestas

Base conceptual: `/api/discs/saved-filters`. Requiere autenticación en todas las operaciones; el actor sale de la sesión/JWT, nunca de `userId` en body o query.

| Operación | Contrato propuesto | Resultado |
|---|---|---|
| Crear | `POST /api/discs/saved-filters` con `{ name, filters }` | `201`, recurso creado con `id`, criterios y fechas. |
| Listar | `GET /api/discs/saved-filters` | `200`, solo recursos del actor, ordenados por nombre normalizado y fecha de creación estable. |
| Renombrar/actualizar | `PATCH /api/discs/saved-filters/:id` con `name` y/o `filters` | `200`, actualización parcial y `updatedAt`; vacío no equivale a campo omitido. |
| Eliminar | `DELETE /api/discs/saved-filters/:id` | `204`; recurso ausente o de otro usuario responde el mismo `404`. |
| Aplicar | Acción local del frontend sobre el objeto listado | No necesita endpoint específico ni modifica el recurso guardado. |

Las respuestas no incluyen `userId`; el ID opaco permite selección y acciones, pero no sustituye la comprobación de propiedad. No incluir operación batch ni endpoint de búsqueda.

### Validación y reglas de dominio

- Nombre: recortar espacios, requerido, 1–50 caracteres tras normalización; rechazar control characters. Propuesta: duplicados por usuario comparando nombre recortado sin distinguir mayúsculas; responder `409` con código de error estable. Unicidad global no aplica.
- Cantidad: máximo propuesto de 20 configuraciones por usuario. Al excederlo, `409` o `422` con error estable; recomiendo `409`. Ambos límites son parámetros de producto pendientes de aprobación antes de 6b.
- JSON: objeto plano, solo `genreIds`, `countryId`, `yearFrom`, `yearTo` y `version` interna; no aceptar búsqueda, `artistId`, modo, orden ni paginación, ni propiedades desconocidas. `genreIds` array de UUID v4 únicos; límite propuesto 50. `countryId` UUID v4 o null. Nulos/vacíos se normalizan a la forma canónica.
- Años: enteros, límites nullables, dentro del rango que exponga DiscList (hoy UI ofrece 2025 hasta el año actual, o el siguiente en diciembre); si se acepta conservar años históricos en datos futuros, el frontend sigue sin inventar opciones. Si ambos existen, `yearFrom <= yearTo`; inversión produce `400` y nunca se corrige silenciosamente. Validar además contra el límite real del contrato backend antes de implementar.
- Parcialidad: cualquier criterio puede faltar o quedar vacío. `yearFrom` y `yearTo` pueden ser independientes en la persistencia. Sin embargo, el endpoint actual recibe `dateRange` como pareja de fechas calendario, no dos límites abiertos; 6b debe acordar con el backend cómo mapear un único extremo al mínimo/máximo del dominio sin alterar reglas de DiscList, o restringir años a pareja completa. Este es un punto de aprobación previo a 6b.
- Géneros/países eliminados: al guardar, validar que existan y rechazar IDs inexistentes (`422`). Si se eliminan después, al listar/aplicar conservar el recurso original y omitir solo referencias obsoletas de la consulta con un aviso accesible; no borrar ni reescribir el filtro automáticamente. La lista de opciones contextuales no debe usarse como prueba de eliminación, porque puede excluir opciones válidas según los otros criterios. Backend debe tolerar IDs que quedaron huérfanos o devolver una señal de obsolescencia estable.
- Propiedad: todas las consultas/mutaciones filtran por `id` y actor autenticado; para IDs ajenos devolver `404`, no `403`, evitando confirmar existencia. Pruebas de integración de 6d deben cubrir aislamiento con dos usuarios.
- Concurrencia: PATCH es explícito y reemplaza solo los campos incluidos; las ediciones temporales del frontend jamás hacen autosave. Una estrategia de versión/ETag puede añadirse si la API compartida demuestra riesgo de edición simultánea, sin convertirla en requisito para el primer alcance.
- Compatibilidad: versionar el JSON interno; rechazar versiones futuras desconocidas en escritura y preservar datos desconocidos solo en migraciones controladas, no en DTO de usuario. Las migraciones son aditivas; no cambiar `User` preferences ni el comportamiento de búsqueda.

## Experiencia propuesta

Integrar una fila compacta en `DiscListExplorationFilters.vue`, dentro del bloque de controles existente:

1. Botón **Guardar filtro**, habilitado para usuario autenticado. Abre un diálogo pequeño con nombre y resumen de los cuatro criterios actuales; no muestra ni captura texto/artista.
2. Select/lista **Filtros guardados** con acción **Aplicar**. Aplicar sustituye los cuatro criterios de una vez y mantiene modo, orden, búsqueda textual y artista. El resultado comienza en página inicial.
3. Acciones por elemento: **Renombrar**, **Actualizar** (captura explícita los cuatro criterios actuales, confirmando sobreescritura) y **Eliminar** con confirmación clara.
4. Estados acotados: cargando, vacío, error/reintento y límite alcanzado. No crear una sección independiente grande ni ocultar los filtros existentes. Mantener navegación por teclado, foco del diálogo, feedback `role=status/alert`, tema claro/oscuro y responsive conforme a `docs/design-system.md`.

Tras aplicar, el selector indica cuál fue aplicado solo mientras sus criterios coincidan, pero no establece enlace de edición. Un cambio temporal de cualquiera de los criterios quita esa indicación y no persiste. Guardar/Actualizar son las únicas escrituras posteriores a una acción explícita.

## Plan de implementación

| Fase | Alcance | Dependencias | Criterios de aceptación |
|---|---|---|---|
| **CAT-DISC-6a — auditoría** | Este documento y enlaces de roadmap. | CAT-DISC-5 cerrada; fuentes actuales disponibles. | Auditoría frontend/backend, contrato, UX, riesgos y decisiones documentados. **Completada.** |
| **CAT-DISC-6b — persistencia y API backend** | Entidad, migración PostgreSQL, DTO/validación, servicio/controlador, límites y ownership. No altera DiscList ni su búsqueda. | Aprobación de decisiones señaladas; coordinación del contrato con frontend. | **Completada en el checkout backend**; CRUD autenticado, JSON estricto, ownership y migración reversible verificados en PostgreSQL efímero. |
| **CAT-DISC-6c — interfaz y aplicación frontend** | Adaptador API, estado de consulta/mutación por usuario y controles compactos; aplicación atómica solo de cuatro criterios. | Contrato 6b acordado; componentes de filtros actuales. | **Completada localmente**; CRUD disponible, aplicación conserva texto/artista/modo/orden, reinicia paginación, actualiza opciones y las ediciones temporales no se persisten. |
| **CAT-DISC-6d — pruebas focalizadas y cierre** | Pruebas API/UI/coordinador, regresión de modos y documentación de límites. | 6b y 6c terminadas. | **Completada:** cobertura focalizada, no sobrescritura sin confirmación, documentación de evidencia/limitaciones y cierre explícito CAT-DISC-6. La migración permanece pendiente en entornos donde no conste aplicada. |

## Decisiones resultantes de CAT-DISC-6b–6d

Las preguntas siguientes se conservan como historial del diseño; el contrato implementado y verificado se resume aquí:

1. Se mantuvo el país como selector único (`countryId`) para coincidir con DiscList.
2. El esquema almacena límites anuales, incluidos extremos abiertos. Al guardar una selección actual mensual o semanal, la implementación captura el año calendario indicado por ese rango; el modal presenta explícitamente el resumen anual antes de confirmar. Al aplicar, ese criterio se convierte a un rango de año completo para la consulta.
3. La API usa nombre requerido de hasta 60 caracteres y limita a 20 recursos por usuario; la respuesta de límite concurrente es `409 SAVED_DISC_FILTER_LIMIT_REACHED`. Se permiten nombres duplicados. Los demás límites y validaciones constan en el roadmap backend de CAT-DISC-6b.
4. Los IDs de géneros/país se guardan como UUID en JSONB. Si una referencia desaparece, la respuesta conserva su ID e informa `missingGenreIds`/`countryMissing`; el frontend avisa y no persiste una reparación automática.
5. Crear, actualizar criterios, renombrar y borrar son operaciones explícitas; cambiar filtros después de aplicar no actualiza el recurso sin pulsar «Actualizar» y confirmar.

La evidencia detallada de backend, regresión frontend y límites de entorno está en el cierre CAT-DISC-6d de [la auditoría de Discos](catalog-discs-audit.md#cat-disc-6d--regresi%C3%B3n-focalizada-y-cierre). La migración es aditiva y reversible, pero queda pendiente de aplicación en cada entorno donde aún no figure en su ledger.
