# Salas y recintos — roadmap

## Estado

**Frontend:** VEN-F01, VEN-F02, VEN-F02b y VEN-F02c implementadas y verificadas localmente; quedan pendientes de validación del usuario. VEN-F03a implementada y verificada localmente; queda pendiente de validación del usuario. VEN-F03b, VEN-F04 y VEN-I01 no iniciadas.

**Backend:** el alcance recibido indica que las entidades y operaciones base de regiones, localidades y recintos ya están disponibles, incluidas la resolución de localidades, la importación por lotes y las consultas geográficas. Este roadmap frontend no modifica ni valida el backend.

## Frontend

- **VEN-F01 — Estructura del módulo:** **implementada y verificada localmente; pendiente de validación del usuario.** Crea `src/modules/venues/`, la ruta protegida `/venues`, la entrada de Sidebar «Salas y recintos» y una pantalla con las pestañas locales «Catálogo» e «Importar salas». El catálogo presenta un estado vacío; Importar salas explica el propósito y prepara el espacio del futuro editor. No hay consultas ni mutaciones HTTP, fichas completas, mapa o integración con Conciertos y festivales.
- **VEN-F02 — Importador masivo por localidad:** **implementada y verificada localmente; pendiente de validación del usuario.** `VenuesImportPanel.vue` ofrece país, región, localidad y provincia opcional; la tabla editable permite añadir/quitar filas, cambiar los ocho tipos de Venue y pegar una columna vertical desde Excel o Google Sheets. Un pegado inserta filas en el punto elegido; si la fila destino está vacía, la reutiliza para el primer nombre. Omite líneas vacías, conserva orden y no modifica filas ajenas al rango insertado. Los países se cargan desde `GET /api/countries` con paginación (el controller backend revisado no expone `/countries/all`); las regiones, desde `GET /api/administrative-regions?countryId=…` y se recorren páginas de hasta 100. España se selecciona por `isoCode === ES`, sin ID fijo. Al confirmar, el frontend envía `{name, administrativeRegionId, province?}` a `POST /api/localities/resolve`. Una respuesta HTTP 201 con `locality: null` y `geocoding.status: "ambiguous"` detiene el proceso. `not_found` y `unavailable` permiten continuar cuando la respuesta trae `locality.id`. Con el ID confirmado se envían filas válidas a `POST /api/venues/import-batch` en lotes secuenciales de hasta 100, manteniendo el vínculo con el ID local de cada fila. Se muestran estados, mensajes de error e IDs de los recintos creados/reutilizados; filas vacías se ignoran, filas con error permanecen editables y los reintentos resuelven de nuevo la localidad y aprovechan la idempotencia del backend. No hay consulta a Nominatim desde navegador ni se borran filas automáticamente.
- **VEN-F02b — Deduplicación del importador:** **implementada y verificada localmente; pendiente de validación del usuario.** El pegado compara nombres con la misma normalización de `normalizeGeography` (diacríticos, mayúsculas y espacios), conserva la primera aparición y su orden, compara contra todas las filas existentes y avisa cuántos nombres omitió. No usa similitud aproximada ni altera filas ajenas al pegado. Al confirmar, después de resolver la localidad por el flujo F02, `POST /api/venues/resolve-batch` recibe `{venues: [{name, localityId}]}` en lotes de hasta 100. Las coincidencias conservan su ID y quedan marcadas `existing`; las filas siguen editables y las pendientes se identifican en la tabla. Cambiar localidad o un nombre invalida los resultados previos. Nombres repetidos manualmente en la tabla se representan como `duplicate_in_batch` y no se vuelven a enviar en el lote; fallos de resolución conservan el texto y permiten reintentar. El backend y la restricción PostgreSQL siguen siendo la autoridad definitiva, y el importador conserva sus reintentos y resultados parciales.
- **VEN-F02c — Localidad específica opcional por recinto:** **implementada y verificada localmente; pendiente de validación del usuario.** La localidad principal de la cabecera se aplica por defecto; cada fila puede sobrescribirla con un campo de texto opcional. País y región siguen siendo comunes a toda la importación. La provincia superior se envía solo al resolver la localidad principal; las alternativas se resuelven sin asumir provincia. Al confirmar, las localidades se agrupan por nombre normalizado de forma conservadora y se resuelve cada nombre distinto mediante `POST /api/localities/resolve`, sin resolver durante la edición ni consultar Nominatim desde el navegador. Alias que devuelven el mismo `localityId` se fusionan antes de resolver/importar salas. La identidad definitiva de sala es nombre normalizado y `localityId`: nombres iguales en distintas localidades se conservan; duplicados en la misma localidad se identifican y no se reenvían. Las comprobaciones y las importaciones siguen usando lotes de hasta 100; sus resultados se asocian a las filas originales. Los errores de una localidad no detienen los grupos válidos, y los reintentos conservan datos/resultados y omiten filas creadas o existentes sin cambios. El pegado de una columna de nombres mantiene su comportamiento, creando filas con localidad vacía.
- **VEN-F03a — Listado y gestión del catálogo:** **implementada y verificada localmente; pendiente de validación del usuario.** La pestaña Catálogo muestra una tabla compacta paginada por `GET /api/venues`, con búsqueda de nombre y filtros remotos por país, región, localidad, tipo y estado. Incluye estados de carga, vacío, error y resultados sin coincidencias. Permite editar nombre, tipo y estado con `PATCH /api/venues/:id`; permite eliminar mediante `DELETE /api/venues/:id` tras confirmación con el nombre del recinto. Las operaciones requieren el rol mínimo existente `riffvalley`, invalidan TanStack Query al completarse y la importación exitosa invalida el catálogo sin recargar la página. El contador, filtros y paginación permanecen en el servidor; no se carga el catálogo completo para presentar sus páginas. El backend no dispone de un endpoint de listado de localidades: cuando se seleccionan país y región, las opciones de localidad se obtienen recorriendo las páginas filtradas de venues y reteniendo únicamente sus IDs/nombres distintos; esa consulta no alimenta la tabla ni su paginación.
- **VEN-F03b — Ficha completa de recinto:** diseñar e implementar la ficha completa, incluida la información detallada que no cubre la edición básica de F03a, con descripción, aforo, imagen, dirección, web y accesibilidad. No iniciada; no se ha avanzado en esta tarea.
- **VEN-F04 — Mapa interactivo:** representar salas y recintos con consultas geográficas y una interacción cartográfica que se diseñará para esta fase. No iniciada.
- **VEN-I01 — Integración con el importador de conciertos:** estudiar e implementar la integración con el módulo `events-festivals` después de definir los contratos y el flujo, sin acoplar VEN-F01 ni VEN-F02 al importador existente. No iniciada.

## Backend

Según el contexto de la iniciativa, están disponibles `AdministrativeRegion` vinculada a `Country`, `Locality` con provincia opcional y coordenadas, `Venue`, API de regiones, resolución/creación de localidades, geolocalización Nominatim, CRUD de recintos, importación por lotes, resolución de recintos existentes y consultas geográficas. Este registro refleja el contexto proporcionado para frontend; la implementación y validación de esos contratos pertenecen al roadmap/backend correspondiente.

## Decisiones registradas en VEN-F01

- La sección tiene una ruta única `/venues`, protegida con `requiresAuth: true` y `requiresRole: "riffvalley"`; la jerarquía existente permite también el acceso a `superadmin`.
- Las pestañas usan estado local, ya que solo cambian el contenido de esta vista y no necesitan enlaces profundos ni estado compartido. No se añaden rutas anidadas.
- `VenuesHomeView.vue` compone la pantalla y controla la selección/teclado de pestañas. `VenuesCatalogPanel.vue` presenta el contenedor y estado vacío del catálogo. `VenuesImportPanel.vue` explica el propósito y reserva el contenedor del futuro editor.
- El Sidebar presenta «Salas y recintos» como subentrada de «Conciertos y festivales», con `fa-location-dot` y el filtro de rol existente. Mantiene la ruta independiente `/venues` y no reutiliza las rutas internas del importador de conciertos.
- La auditoría no encontró una tabla/formulario genérico con contrato reutilizable. `EventImportTable.vue` está ligado a `EventImportRow` y a la resolución de artistas, por lo que no se acopla al módulo Venues; se siguen sus patrones visuales de encabezado y superficie.
- El alcance de VEN-F01 no consume API ni incorpora formularios o acciones simuladas.

## Decisiones registradas en VEN-F02

- `useVenueImport` posee estado efímero del editor y coordina consultas/operaciones; no se añade Pinia. `VenueImportTable.vue` presenta las filas mediante props y eventos explícitos. Las consultas de países y regiones usan TanStack Query.
- El contrato real de Country comprobado en backend es el envelope paginado de `GET /api/countries`; la llamada legacy de frontend a `/countries/all` no existe en el controller revisado y no se usa. Se leen páginas de 500 hasta reunir `totalItems`.
- `AdministrativeRegion` se consulta paginada, filtrada por el ID real del país. Cambiar país vacía la selección de región. No se crean regiones ni provincias.
- La longitud máxima de localidad/provincia es 150; la de Venue es 180. Las filas válidas continúan importándose aunque otra fila supere su límite. Los tipos del selector coinciden con `VENUE_TYPES` de backend y `concert_hall` es el inicial.
- El backend resuelve nombre canónico y alias dentro de la región/provincia. El cliente no intenta inferir equivalencias ni elegir una localidad ambigua. La ausencia de coordenadas no invalida un `localityId` ya devuelto.
- Las peticiones por lotes son secuenciales. Las modificaciones del editor permanecen habilitadas durante la petición; las respuestas solo se aplican si la fila conserva el nombre y tipo enviados. El botón de importación evita concurrencia; una nueva ejecución vuelve a resolver la localidad y reenvía filas válidas para que el backend informe `created`, `existing` o `duplicate_in_batch` de forma idempotente.
- No se reutiliza `EventImportTable.vue`: su contrato está acoplado a filas de eventos y resolución de artistas. Se conserva únicamente el patrón de tabla compacta y superficie, adaptado al owner Venues.

## Verificación de VEN-F02

- `pnpm test`: 221 archivos y 1534 pruebas aprobadas; incluye 22 pruebas de API, selección geográfica, tabla/pegado, resolución e importación. Los endpoints se simulan, sin depender de Nominatim ni base de datos externa.
- `pnpm run typecheck`: aprobado.
- `pnpm build`: aprobado. Conserva los avisos del checkout sobre `.flex-[2]`, Browserslist desactualizado y chunk mayor de 500 kB; no se atribuyen a VEN-F02 sin comparación base/head.
- ESLint pasó en los archivos TypeScript/Vue de VEN-F02 y sus pruebas. Prettier pasó para los archivos modificados; `git diff --check` pasó.
- El detector mecánico Impeccable no devolvió hallazgos (`[]`). No se inspeccionaron navegadores ni capturas, por instrucción; compatibilidad visual de claro/oscuro y responsive queda pendiente de revisión del usuario.
- No se modificó `riffvalley-app-back` ni se ejecutó ninguna operación remota.

## Verificación de VEN-F02b

- Pruebas focalizadas de adaptadores y panel: 25 pruebas aprobadas en la versión final. Cubren pegados con duplicados normalizados, coincidencias con filas existentes, orden, pegados consecutivos, similitud no aproximada, IDs devueltos por la API de catálogo, invalidación al cambiar localidad, fallo de red, conservación de filas, edición durante la petición y contrato/límite de `resolve-batch`. El catálogo se simula mediante HTTP; no se usa una base de datos real en pruebas frontend.
- Suite completa: 221 archivos y 1540 pruebas aprobadas. También pasaron typecheck, build, ESLint de archivos modificados, Prettier, `git diff --check` y el detector Impeccable estático (`[]`). El escaneo Markdown global informativo no señaló `roadmap/venues.md` y registró seis fallos locales en otros documentos preexistentes. La build conserva los avisos del checkout sobre `.flex-[2]`, Browserslist desactualizado y chunks superiores a 500 kB; no se atribuyen a VEN-F02b sin una comparación base/head.
- No se modificó backend ni se hizo comprobación visual en navegador.

## Verificación de VEN-F02c

- Pruebas focalizadas: 2 archivos y 31 pruebas aprobadas. Cubren localidad opcional vacía, alternativas por fila, provincia solo en localidad principal, resolución de grupos, alias con ID común, deduplicación por localidad, resultados parciales/reintento, invalidación al cambiar localidad o región, pegado de una columna y lotes de hasta 100 tanto para resolución de salas como para importación.
- Suite completa: 223 archivos y 1560 pruebas aprobadas. `pnpm build` (incluye typecheck), ESLint de los archivos modificados, Prettier y `git diff --check` aprobados. La build conserva los avisos del checkout sobre `.flex-[2]`, Browserslist desactualizado y chunks superiores a 500 kB; no se atribuyen a VEN-F02c sin comparación base/head fiable.
- El escaneo informativo de Markdown encontró seis enlaces rotos o externos en otros documentos preexistentes; no señaló `roadmap/venues.md`.
- La cobertura verifica adaptadores simulados y coordinación del frontend; no usa base de datos ni el backend real. No se realizaron comprobaciones visuales en navegador ni capturas, según la instrucción.
- No se modificó `riffvalley-app-back` ni se ejecutó ninguna operación remota.

## Verificación de VEN-F01

- `pnpm test`: 219 archivos y 1515 pruebas aprobadas. Las pruebas VEN-F01 comprueban renderizado, cambio y teclado de las pestañas, ausencia de HTTP, navegación del Sidebar y protección por permisos.
- `pnpm run typecheck`: aprobado.
- `pnpm build`: aprobado. La salida incluyó un warning CSS del selector `.flex-[2]` y un aviso de chunk superior a 500 kB; no se atribuyen a VEN-F01 sin una comparación base/head.
- ESLint pasó en archivos nuevos y archivos TypeScript modificados. El Sidebar tiene dos hallazgos preexistentes de accesibilidad (alt del logo y asociación del label del tema), fuera del alcance de VEN-F01.
- Prettier pasó para los archivos nuevos de VEN-F01 y la documentación añadida/actualizada; `git diff --check` pasó.
- El análisis Markdown global es informativo y reporta seis enlaces preexistentes rotos o externos a otros documentos; no señaló el roadmap VEN-F01.
- No se realizó comprobación visual en navegador ni captura, según el alcance acordado; ambos temas quedan pendientes de validación visual del usuario.

## Decisiones registradas en VEN-F03a

- El contrato comprobado en `riffvalley-app-back/src/catalog/venues/venues.controller.ts`, `dto/venues-query.dto.ts` y `venues.service.ts` es `GET /api/venues` con `limit` (1–100), `offset`, `query`, `countryId`, `administrativeRegionId`, `localityId`, `type` y `status`; la respuesta incluye `data`, `totalItems`, `totalPages`, `currentPage` y `limit`. La búsqueda y filtros se envían en cada consulta; no se filtra localmente la página recibida.
- Los ocho tipos siguen `VENUE_TYPES`; los estados reales son `active`, `closed` y `temporary`. La actualización básica usa `PATCH /api/venues/:id` con `name`, `type` y `status`; la eliminación usa `DELETE /api/venues/:id`. La relación Venue–Locality está configurada `onDelete: 'RESTRICT'`; el frontend no intenta cascadas y mantiene visible la fila cuando falla la eliminación.
- No existe endpoint `GET /api/localities` en el controlador de backend. Para poblar el selector dependiente de país y región, el frontend recorre las páginas filtradas de `GET /api/venues` y acumula solo localidades únicas. El catálogo principal siempre usa su propia consulta paginada.
- `useVenueCatalog` centraliza Query keys, filtros/paginación y mutaciones. `VenuesCatalogPanel.vue` compone filtros/estados; `VenueCatalogTable.vue` presenta filas con props/eventos; `VenueEditDialog.vue` contiene el formulario básico. Las acciones se muestran para el rol mínimo `riffvalley`, además de estar protegidas por el backend.
- Las importaciones que crean al menos un recinto invalidan las queries del catálogo, sin cambiar el proceso de importación/deduplicación ni recargar la página.

## Verificación de VEN-F03a

- Pruebas focalizadas: 4 archivos y 35 pruebas aprobadas. Cubren contrato HTTP, renderizado, búsqueda/filtros, paginación y ajuste tras borrar la última fila, limpieza de región/localidad, edición y errores, confirmación/cancelación/eliminación con error de integridad, invalidación, permisos, estados vacío/error y refresco tras importar.
- `pnpm test`: 223 archivos y 1554 pruebas aprobadas. `pnpm run typecheck` y `pnpm build`: aprobados. La build conserva avisos existentes de `.flex-[2]`, Browserslist y chunk superior a 500 kB; no se atribuyen a VEN-F03a sin una comparación base/head fiable.
- ESLint y Prettier pasaron en los archivos fuente/pruebas/documentación modificados; `git diff --check` pasó.
- `pnpm run cycles` completó como diagnóstico informativo: 0 edges locales sin resolver y un componente de ciclo type-only ya en servicios legacy; no pudo comparar con `HEAD` localizable. `pnpm run markdown:links:delta` fue informativo porque el checkout no está limpio y no hay SHA base/head completos; no se considera un gate de delta aprobado.
- No se realizaron comprobaciones visuales en navegador ni capturas, según la instrucción del usuario; la validación visual queda pendiente del usuario.
