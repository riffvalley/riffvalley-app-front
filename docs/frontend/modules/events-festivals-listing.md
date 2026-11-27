# Listado de conciertos y festivales

La ruta `/concerts-festivals` compone `EventsFestivalsView.vue`, con pestañas accesibles e independientes de Conciertos y Festivales. `/concerts-festivals/import` conserva el importador existente. Ambas rutas requieren autenticación y rol mínimo `riffvalley`.

## Contrato usado

El frontend consume `GET /api/events`, existente en `riffvalley-app-back/src/catalog/events/events.controller.ts`. `EventsQueryDto` admite `limit` (1–100, predeterminado 20), `offset` (desde 0), `type`, `dateFrom`, `dateTo`, `venueId`, `administrativeRegionId` y `tourId`. La consulta ordena por fecha de inicio, Event ID y posición de lineup. Devuelve `{ totalItems, totalPages, currentPage, limit, data }`; cada Event incluye Venue → Locality → Administrative Region → Country y las apariciones de lineup.

`GET /api/events/:id`, adaptado por `getExistingEventDetail`, se utiliza para el detalle de conflictos del importador. La edición usa la misma ruta mediante `api/eventManagement.ts` y exige la respuesta completa con IDs de Event, Venue, Locality, Administrative Region, Country y lineup. La consulta se carga solo al abrir la edición.

La auditoría del backend local confirmó `PATCH /api/events/:id` (`UpdateEventDto`, `PartialType(CreateEventDto)`) y `DELETE /api/events/:id`. `PATCH` admite `type`, `name` (máximo 240), `startDate`, `endDate`, `venueId`, `localityId`, `tourId`, `price`, `otherInfo` y `lineup` (hasta 100 apariciones; cada nombre hasta 100 caracteres). El servicio comprueba que fecha fin no preceda inicio, que Venue y Locality coincidan, que tours sean válidos para el tipo y que los Artist IDs existan. Si se incluye `lineup`, lo reemplaza por completo y guarda posiciones del 1 al N en el orden recibido.

La interfaz permite editar título/nombre, fechas, ubicación a través de Country, Administrative Region y Locality existentes, Venue existente, lineup y su orden, precio e información adicional. El tipo del evento y el tour asociado al Event se conservan sin edición desde este formulario; la relación Tour por aparición de lineup también se conserva. Los artistas nuevos no se crean: se exige resolver cada nombre contra artistas existentes y elegir candidato cuando hay ambigüedad. Los cambios de ubicación resuelven relaciones existentes, sin crear ni modificar Venue/Locality/Region/Country compartidos.

Ambas escrituras están protegidas en backend con `@Auth(ValidRoles.riffvalley)`. La interfaz oculta acciones a roles inferiores, pero el backend conserva la autorización efectiva. `DELETE` ejecuta en transacción la eliminación explícita de `event_artists` del evento y después de la fila `events`. La FK EventArtist → Event también declara `ON DELETE CASCADE`; las FK hacia Venue/Tour son `RESTRICT`, Artist es `SET NULL`, y Venue → Locality → Region → Country son restrictivas. Por tanto, la operación elimina solo Event y sus apariciones dependientes; no borra entidades compartidas.

La edición comparte el mismo modal y contrato para ambas pestañas. La confirmación de borrado es un diálogo aparte, conserva errores para retry y solo ejecuta DELETE tras el botón destructivo. Los éxitos usan `SwalService`. Ambas mutaciones invalidan las queries del listado; al eliminar el último elemento de una página, se vuelve a la anterior con los filtros intactos. No se usa borrado optimista. El importador conserva sus contratos de creación, resolución, ampliación y sesiones descritos en [su documento canónico](events-festivals-importer.md).

`api/eventListing.ts` valida la forma de respuesta usada por la pantalla y adapta únicamente campos de lectura. Las respuestas de lineup llegan ordenadas por el backend y se muestran en ese orden. `application/useEventListing.ts` usa TanStack Query con claves por tipo, rango, página, usuario y generación de sesión; pasa `AbortSignal` al transporte y habilita solo la pestaña activa. El tamaño de página es 20. Los filtros `dateFrom`/`dateTo` restringen la **fecha de inicio del evento** (no la superposición del periodo de un festival); la UI los etiqueta así. Los filtros y el offset viven en paneles separados, por lo que cambiar de pestaña conserva ambos estados.

## Componentes

- `EventsFestivalsView.vue`: pestañas Conciertos/Festivales, navegación por flechas, Home/End y enlace al importador.
- `ConcertsListingPanel.vue` y `FestivalsListingPanel.vue`: queries, filtros, paginación y estados propios de cada pestaña.
- `ConcertListingTable.vue` y `FestivalListingTable.vue`: representación específica de lineup/fecha/sala o nombre/periodo/recinto y acciones de edición/borrado por rol.
- `EventListingFilters.vue`, `EventListingPagination.vue` y `EventListingState.vue`: controles y estados que comparten los dos listados.
- `EventEditModal.vue`: detalle, formulario compartido, resolución de relaciones existentes, validación, protección de cambios sin guardar y mutación PATCH.
- `EventDeleteDialog.vue`: contexto destructivo, confirmación explícita, estado pendiente/error y mutación DELETE.
- `api/eventManagement.ts` y `application/useEventManagement.ts`: contratos HTTP centralizados e invalidación TanStack Query.

Los estados incluyen carga, vacío, error recuperable y rango de fechas inválido. Las queries no se duplican al alternar; TanStack Query conserva resultados frescos durante 30 segundos. Las mutaciones de edición y borrado invalidan específicamente `['events-festivals', 'listing']`; la edición también invalida el detalle. Los imports que crean Events invalidan el prefijo `['events-festivals']` y por ello cubren el listado.

## Dependencias de backend pendientes

El backend no define una búsqueda textual para Events. `EventsQueryDto` no admite `query`, nombre del festival, texto de artista, sala o localidad como búsqueda, y el listado paginado no permite buscar correctamente solo en los elementos de la página actual. Por eso la UI expone los filtros soportados de fecha (`dateFrom`/`dateTo`) y no envía parámetros de búsqueda inventados. Si se requiere búsqueda global, el repositorio `riffvalley-app-back` necesita acordar y documentar ese contrato, su semántica entre campos y cómo se combina con tipo, fechas y paginación.

La API también admite filtros por `venueId`, `administrativeRegionId` y `tourId`; esta entrega no añade selectores para esos campos. No son una dependencia faltante del backend. No se identificaron dependencias backend pendientes para la edición o el borrado descritos arriba. La disponibilidad remota/desplegada de esos contratos no se verificó desde este frontend.
