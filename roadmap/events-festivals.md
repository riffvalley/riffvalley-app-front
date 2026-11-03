# Conciertos y festivales — roadmap frontend

## Estado

**Fase A — Prototipo frontend:** CON-F01–CON-F07 implementadas; la validación visual final del usuario sigue pendiente. **Backend de importación:** contratos CON-B04a–CON-B04g disponibles en la documentación/código del checkout local; no certifica despliegue remoto. **Integración frontend:** CON-F08a, F08b.1–F08b.7, F08c.1–F08c.3 y F08d.1–F08d.3 completadas; F08d.4, F08e y F09 siguen pendientes.

| Fase                   | Estado                | Alcance                                                                                    |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| A — Prototipo frontend | IMPLEMENTADA          | CON-F01–CON-F07; queda validación visual del usuario.                                      |
| B — Backend            | CONTRATOS DISPONIBLES | CON-B04a–CON-B04g documentadas en el checkout backend; no certifica despliegue remoto.     |
| C — Integración        | EN CURSO              | CON-F08a, F08b.1–F08b.7, F08c.1–F08c.3 y F08d.1–F08d.3 completadas; F08d.4–F09 pendientes. |

La auditoría canónica del importador, su matriz de resultados, las carencias de resolución anticipada y el diseño de estados/idempotencia están en [docs/frontend/modules/events-festivals-importer.md](../docs/frontend/modules/events-festivals-importer.md). El roadmap detallado es:

- **CON-F08a — Auditoría y arquitectura (completada en documentación):** auditar tabla/filas, resolución actual y contratos backend reales; documentar gaps y roadmap. No modifica comportamiento.
- **CON-F08b — Resolución anticipada e incremental (completada):** F08b.1 contratos batch/ambigüedad, F08b.2 adaptadores HTTP/Query, F08b.3 contexto global Country/AdministrativeRegion, F08b.4 Artist compartido, F08b.5 Locality/Venue, F08b.6 Tour/confirmación y F08b.7 invalidación transversal. QueryCache es autoridad remota (15 s); coordinadores por tabla solo conservan trabajo pendiente y agrupan identidades únicas en lotes de hasta 100. Locality existente seleccionada por UUID habilita Venue; nueva o ambigua no. Country invalida Locality/Venue conservando texto, Artist UUIDs y confirmaciones Tour. Tour exige confirmación explícita para existentes. Respuestas antiguas se aplican solo si siguen vigentes fila, revisión, identidad y dependencias. No se crean entidades ni se persiste durante la edición.
- **CON-F08c — Importación masiva (completada):** F08c.1 snapshot/payload por país, F08c.2 mutación/adaptador de `POST /api/events/import-batch` y F08c.3 reconciliación parcial, protección de reintentos inciertos y bloqueo de borradores divergentes completadas. La resolución interactiva sigue en CON-F08d.
- **CON-F08d — Conflictos y ambigüedades (en curso):** F08d.1 conflictos entre filas, F08d.2 detalle de eventos existentes/candidatos y F08d.3 selección de Artist/Locality/Venue/Tour completadas; F08d.4 corrección/descarte explícitos sigue pendiente.
- **CON-F08e — Ampliación confirmada (pendiente):** F08e.1 mostrar artistas faltantes; F08e.2 confirmación aditiva vía `POST /api/events/:eventId/import-lineup`; F08e.3 retry/revisión de conflicto obsoleto.
- **CON-F09 — Cierre del importador (pendiente):** F09.1 idempotencia/retry; F09.2 estados de carga/error; F09.3 regresión/accesibilidad; F09.4 rendimiento frontend y cierre. Validación visual responsive posterior a cargo del usuario.

**CON-B04g está implementada en el checkout backend local y verificada para F08b.1.** El estado de despliegue remoto no se comprobó. Los inspectores son consultas batch read-only; Locality requiere contexto de país y Venue necesita `localityId`. La definición y garantías están en el documento canónico.

## Verificación de CON-F08c.1

- `application/eventImportPreparation.ts` define el DTO documentado de CON-B04d sin `rowKey`, revisión, `localityId` o `venueId`; usa Artist `artistId`, `administrativeRegionId` y `tourId` solo en los casos permitidos. Prepara fechas `YYYY-MM-DD`, strings opcionales no vacíos literalmente y omite opcionales vacíos.
- `row.id` se conserva como `rowKey` local; `operationRowId` y `batchId` son UUID separados. Contenido/contexto diferente renueva identidad de fila; retry idéntico conserva payload/snapshot/batch. El batch se identifica por país y conjunto de operaciones; el orden capturado queda fijo en el snapshot. `isCurrent` correlaciona por `rowKey`, revisión, país y `operationRowId` para cubrir edición y borrado sin usar posición.
- La preparación es parcial y limita cada payload a 100 filas válidas; filas extra y no preparadas retienen sus drafts con motivos. Snapshots y DTO quedan profundamente congelados y copiados. No existe mutación HTTP ni persistencia en F08c.1.
- En el corte inicial de F08c.1, el checkout `riffvalley-app-back` estaba disponible en `feat/prosineck-scraper`, pero carecía del código Events/DTOs/`ImportRowReceiptsService`; la forma se contrastó con auditorías locales. F08c.2 revalidó después el contrato contra el commit CON-B04e indicado en su registro. La política frontend mantiene `batchId` para el mismo país/conjunto idempotente y reemplaza identidad al cambiar payload; no resuelve `IMPORT_IDEMPOTENCY_CONFLICT` después de iniciar una operación.
- `pnpm exec vitest run src/modules/events-festivals src/modules/venues/api/venueImport.test.ts`: 13 archivos, 126 pruebas aprobadas. Typecheck, ESLint focalizado, Prettier focalizado, `pnpm build`, fixtures de ciclos/fronteras y `git diff --check` aprobados. Build conserva avisos de Browserslist antiguo, selector CSS `.flex-[2]` y chunk >500 kB.
- Diagnóstico de ciclos: 0 imports locales irresueltos; queda un ciclo type-only legacy en servicios. Diagnóstico de fronteras: 0 violaciones productivas y 0 imports locales irresueltos. Ambas comparaciones son informativas porque Git no pudo resolver `HEAD`; no se declara aprobado un delta.
- En el corte de esta verificación histórica, `pnpm run markdown:links` reportó seis enlaces preexistentes fuera de este alcance, en roadmaps de Catalog, Dashboard y Roles; no señaló los dos documentos de Eventos. No se inspeccionó navegador ni se tomaron capturas. El estado vigente de fases se resume al inicio de este roadmap.

## Verificación de CON-F08c.2

- Contrato ejecutable cotejado en `riffvalley-app-back`, rama `feat/con-b04e-confirmed-lineup-expansion`, commit `01bb85ffbb1f918b1ac3b82924e70b755aed6729`; no se cambió el checkout backend. Las ramas B04a/B04d locales señalan `843cfef`, que no incluye el endpoint. DTO, recibos de idempotencia y estructura de conflictos están descritos en el documento canónico del importador.
- Adaptador `api/eventImport.ts` y mutación `application/useEventImportBatchMutation.ts`: POST con Axios central, validación de protocolo, correlación por `rowId`, retry explícito del mismo snapshot, sin retry automático ni borrado/reconciliación de filas. La vista presenta carga y resultados por estado.
- Suite afectada: 15 archivos, 136 pruebas aprobadas. Typecheck, ESLint y Prettier focalizados, build, fixtures de ciclos/fronteras y `git diff --check` aprobados. Los scans estructurales locales encontraron 0 imports locales irresueltos y 0 violaciones productivas; comparación delta informativa porque Git no pudo resolver el `HEAD` local.
- La build mantiene avisos globales preexistentes de Browserslist, selector CSS `.flex-[2]` y chunk >500 kB. No se inspeccionó navegador ni se hicieron importaciones reales. El backend no se desplegó ni verificó contra un entorno remoto.
- La invalidación usa las claves existentes de resolución, artistas y venues. No hay claves de catálogo Event/Tour en este checkout; queda pendiente su publicación por sus owners. CON-F08c.3 conserva la reconciliación definitiva y retirada parcial de filas.
- **CON-F08d.1 completada:** el contrato de conflictos de CON-B04c/B04d se contrastó en backend `feat/prosineck-scraper` commit `01bb85ffbb1f918b1ac3b82924e70b755aed6729`. La presentación mapea `relatedRowIds` (operation row IDs) por el snapshot a `rowKey` y revisión, preserva relaciones simétricas/múltiples recibidas, señala vigencia/histórico y permite enfocar filas relacionadas existentes. Eventos persistidos/candidatos se identifican por separado. No se replica el motor backend ni se resuelven conflictos.
- **CON-F08d.3 completada:** selección explícita de candidatos Artist, Locality, Venue y Tour desde el borrador. Artist asocia UUID por aparición y conserva nombre; Locality conserva sus candidatos y permite usar UUID de región más provincia como contexto del DTO solo si distingue una candidata; Venue conserva la elección local, pero una ambigüedad sigue bloqueada porque `import-batch` no admite `venueId`; Tour mantiene «Utilizar esta gira» como confirmación y comparte confirmaciones solo por identidad compatible. Las consultas remotas siguen en TanStack Query; snapshots incluyen Artist/Tour y contexto geográfico disponible, nunca campos de UUID no admitidos.
- Los selectores no escriben entidades ni eventos persistidos. Ediciones de identidad/contexto invalidan asociaciones dependientes; equivalencias superficiales conservan la elección. Elecciones de Artist permanecen independientes entre apariciones, aunque las consultas sean compartidas. F08d.4 puede reutilizar el contexto/snapshot, pero no puede tratar la elección local de Venue como identidad persistida; cualquier acción que necesite `venueId` depende de una revisión contractual backend. CON-F08d.4, F08e y F09 no se implementan aquí.
- Verificación F08d.3: contrato de inspectores leído en la ref backend `feat/con-b04g-batch-inspectors` (`f9c53f2`) y DTO import-batch en `feat/con-b04e-confirmed-lineup-expansion` (`01bb85f`), sin cambiar el checkout; 20 archivos/166 pruebas, typecheck, ESLint focalizado, Prettier, build, fixtures de ciclos/fronteras y `git diff --check` aprobados. Los deltas de ciclos/fronteras son informativos porque Git no resolvió `HEAD`; no se atribuyen hallazgos al cambio.
- Limitaciones de F08d.1: no hay recuperación del resultado tras desmontar/recargar la vista ni navegación para referencias retiradas; el detalle de eventos está en F08d.2, la selección de entidades en F08d.3 y la corrección/descarte permanece en F08d.4. No se inspeccionó navegador ni se capturó UI.
- Verificación F08d.1: 17 archivos/153 pruebas focalizadas aprobadas; typecheck, ESLint, Prettier, build, fixtures de ciclos/fronteras y `git diff --check` aprobados. Los comparadores de ciclos/fronteras no pudieron resolver `HEAD`, así que no se afirma un delta aprobado. Build mantiene avisos globales de Browserslist, CSS `.flex-[2]` y chunk >500 kB; el checker Markdown informa seis enlaces preexistentes fuera de Eventos.

## CON-F08d.2 — Eventos existentes y candidatos

- Contrato ejecutable revisado en `riffvalley-app-back`, `feat/prosineck-scraper`, commit `01bb85ffbb1f918b1ac3b82924e70b755aed6729`. `import-batch` solo aporta `existingEventIds`, `candidateEventIds`, referencias de filas y listas `matchingArtists`/`addableArtists` con `artistId` nullable y nombre. No aporta datos descriptivos de Event. El motor devuelve relaciones de conflicto reales; las pruebas backend incluyen varias candidatas, duplicados de festival, participación y ausencia de candidato.
- Existe `GET /api/events/:id`; retorna Event, Venue/Locality y lineup, con `tourId` escalar, pero el handler no carga el nombre de Tour. El frontend consulta detalle solo al expandir, con Query key por UUID y caché de 15 s. Los errores/404 de detalle no cambian ni ocultan el conflicto.
- La comparación usa el DTO inmutable del snapshot enviado y solo los campos retornados por el detalle. Igualdad textual es informativa y no identifica eventos. Candidatos no se seleccionan automáticamente; los UUID de `existingEventIds` se marcan como identificados y los demás como posibles. Coincidencias de artista con UUID se distinguen de coincidencias textuales con UUID no confirmado; `addableArtists` no habilita acciones.
- Se conservaron relaciones mixtas a filas/eventos/candidatos, y los resultados históricos siguen consultando el snapshot anterior. No hay acciones de edición ni ampliación; CON-F08e permanece pendiente.
- Verificación: `pnpm exec vitest run src/modules/events-festivals src/modules/venues/api/venueImport.test.ts`, 18 archivos y 161 pruebas aprobadas. Typecheck, ESLint focalizado, Prettier focalizado, build, fixtures de ciclos/fronteras y `git diff --check` aprobados. El scan actual encuentra 0 imports locales irresueltos, 0 violaciones de fronteras y un ciclo type-only legacy en servicios. Los comparadores no pudieron resolver `HEAD`, por lo que el delta queda informativo. Markdown informa seis enlaces preexistentes fuera de estos dos documentos. Build mantiene avisos de Browserslist, CSS `.flex-[2]` y chunk >500 kB.
- Limitaciones: los nombres de gira no están disponibles desde el `findOne` actual; solo puede mostrarse el UUID retornado. Resultados viven en memoria de vista y el endpoint desplegado no se verificó. F08d.3–F08d.4 y F08e siguen pendientes.

## Verificación de CON-F08b.6

- Se comprobó el contrato de `POST /api/tours/resolve-batch` en el checkout backend: resolución exacta por `normalizeGeography`, máximo 100 nombres, estados `existing/new/ambiguous/invalid`; una gira existente devuelve `{id,name}` y `TOUR_CONFIRMATION_REQUIRED`. No se modificó el backend ni se verificó un despliegue remoto.
- `tour` es tipo de entrada, no tipo persistido de Event. Event/Name representa el nombre obligatorio de gira; confirmaciones de UUID se comparten entre filas con identidad equivalente. Giras nuevas no reciben IDs ficticios; la importación y su creación por CON-B04d quedan para CON-F08c. Cada fila conserva su Lineup.
- Suite focalizada de `src/modules/events-festivals` y `src/modules/venues/api/venueImport.test.ts`: 12 archivos, 107 pruebas aprobadas. Se observó un POST para dos nombres equivalentes, caché fresca reutilizada, recarga tras 15 s y lotes 100/1 con 101 giras. Se probaron estados, confirmación compartida, reintento, cambio de nombre y respuesta obsoleta.
- Typecheck, ESLint focalizado, Prettier focalizado, build y `git diff --check` aprobados. La build mantiene advertencias de Browserslist desactualizado, CSS `.flex-[2]` y chunk mayor de 500 kB.
- Fixtures de ciclos/fronteras aprobados; diagnósticos con 0 edges locales irresueltos y 0 violaciones. La comparación es informativa por no poder resolver Git `HEAD`. `markdown:links` no señala estos documentos y reporta seis enlaces existentes en otros archivos. No se inspeccionó navegador ni captura.
- No se hizo inspección visual ni captura. CON-F08b.7 y CON-F08c–CON-F09 continúan pendientes.

## Verificación de CON-F08b.7

- Se consolidó la matriz: Lineup invalida solo la aparición Artist; City/Province invalidan Locality y Venue dependiente cuando cambia la identidad; Venue invalida solo Venue; Country invalida Locality/Venue y región; Name/Type afectan Tour solo cuando cambia o deja de aplicar esa identidad. Fechas, Price, Other Info, Artist y Tour permanecen al cambiar país/geografía según la matriz.
- Ediciones de texto equivalentes por normalización conservadora y selección de país/región ya vigente no generan lookup nuevo. En regresión, 20 filas con Madrid/Barcelona/Bilbao produjeron 3 identidades Locality en 1 petición; la petición Venue agrupó 13 identidades, con las 8 apariciones repetidas de La Riviera en una entrada. Diez filas de una gira produjeron 1 entrada Tour en 1 petición. Veinte apariciones Artist compartieron una petición y cada fila conservó su Lineup independiente.
- Las pruebas transversales cubren país cambiado mientras la consulta antigua queda pendiente y vuelta al país con QueryCache vigente, Artist y Tour conservados, Tour confirmado entre filas equivalentes y retirada cuando deja de aplicar, cambio de Type y respuesta tardía, nueva fila durante petición compartida, edición/borrado en vuelo, estados ambiguos/invalid/error y reintentos. Las pruebas de vista mantienen cobertura de pegado TSV, tabla y selector global.
- Se eliminó el ciclo directo `eventDate.ts` ↔ `useEventImportRows.ts` extrayendo un contrato estructural pequeño de validación de fecha. El scan actual no encuentra ciclos de producción runtime/mixtos en el importador; queda un ciclo type-only legacy entre servicios. Los comparadores de ciclos/fronteras fueron informativos porque no pudieron resolver el local HEAD como referencia de comparación, por lo que no se declara aprobado un delta.
- La suite afectada pasó: 12 archivos y 114 pruebas en `src/modules/events-festivals` y `src/modules/venues/api/venueImport.test.ts`. Typecheck, ESLint focalizado, Prettier, build, fixtures de ciclos/fronteras y `git diff --check` pasaron. La build conserva avisos de Browserslist antiguo, selector CSS `.flex-[2]` y chunk >500 kB.
- Persisten límites para CON-F08c: la identidad `event-row-N` y `lineup-item-N` solo es estable durante la vida de la instancia, y las revisiones actuales son internas por resolución/campo. La importación debe capturar snapshot inmutable por operación, asignar UUID de operación/fila y registrar revisión del contenido antes de aplicar resultados; esto no está implementado aquí. No se inspeccionó navegador ni se hicieron capturas.

## Verificación de CON-F08b.5

- Cobertura automatizada: estados de Locality y Venue, selección explícita, región requerida, error/reintento, consultas compartidas y caché fresca, tres localidades entre 20 filas, Venue repetido, aislamiento por `localityId`, lotes 100/100/5, invalidación de país y respuesta tardía.
- `pnpm exec vitest run src/modules/events-festivals src/modules/venues/api/venueImport.test.ts`: 11 archivos, 101 pruebas aprobadas. Typecheck, ESLint focalizado, Prettier focalizado, build y `git diff --check` aprobados.
- Fixtures de ciclos y fronteras aprobados. Los diagnósticos reportan 0 imports locales irresueltos y 0 violaciones de fronteras. El análisis de ciclos muestra el ciclo mixto preexistente entre `eventDate.ts` y `useEventImportRows.ts` y un ciclo type-only legacy; la comparación es informativa porque Git no pudo resolver `HEAD`. Build conserva avisos de CSS `.flex-[2]`, Browserslist desactualizado y chunk >500 kB. El checker Markdown reporta seis enlaces locales rotos/externos en roadmaps distintos, no en estos dos documentos.
- No se hizo comprobación visual ni captura. La disponibilidad de los endpoints desplegados no se verificó. La resolución general de conflictos y la importación persistente permanecen pendientes.

## Fase A — Prototipo frontend

- **CON-F01 — Completada en código, pendiente de validación del usuario:** módulo de Conciertos y festivales, pantalla `/concerts-festivals`, guard de rol existente y tabla editable con una columna string. El estado es local a la vista y no se persiste.
- **CON-F02 — Completada en código y verificada:** la tabla tiene campos independientes `event` y `lineup`. `Event` es texto opcional y admite quedar vacío. `Lineup` es texto plano que conserva íntegramente uno o varios nombres, incluidos separadores como `+`; no busca ni separa artistas. El estado de ambos campos sigue siendo local y no se persiste.
- **CON-F03 — Completada en código y verificada (comportamiento inicial, coordinación supersedida por F08b.4):** `Lineup` separa nombres mediante `+`, recorta espacios exteriores, ignora segmentos vacíos y conserva el orden. La implementación original consultaba `POST /api/artists/resolve-batch` con debounce por fila y representaba el nombre canónico. F08b.4 cambia la coordinación a una sola por tabla, conserva el nombre escrito, comparte batches y usa QueryCache. No hay guardado definitivo.
- **CON-F04 — Venue inteligente con localidad y provincia:** la tabla añade `venue`, `city` y `province`, con texto libre y estado efímero por fila. La edición o pegado de Venue dispara una consulta tras 450 ms sin cambios o al confirmar la celda. Se conservan IDs solo ante una coincidencia exacta normalizada del nombre y, si se escribieron, de City y Province. Una coincidencia única se representa con una pill; su `venueId` y `localityId` se guardan y `city`/`province` se completan desde Locality. Provincia `null` queda vacía. Nombres desconocidos se conservan sin error ni creación; nombres homónimos quedan sin ID hasta que el contexto escrito deje una única coincidencia. Errores de red conservan texto y permiten reintentar.
- **CON-F05 — Start Date y End Date:** la tabla incorpora las columnas entre Lineup y Venue. Las fechas se editan como texto en formato español `DD/MM/YYYY` y se muestran con dos dígitos de día/mes; el estado local conserva fechas válidas como `YYYY-MM-DD`, sin objetos `Date` ni conversión horaria. Se validan fechas reales, años bisiestos y que End Date no sea anterior a Start Date; las fechas inválidas conservan el borrador para corregirlo. End Date es opcional y puede coincidir con Start Date. El pegado TSV desde Start Date distribuye hasta dos columnas entre ambas fechas y varias filas, conservando huecos; desde End Date solo actualiza esa columna. El pegado de una fecha individual también se normaliza. No se añade persistencia ni se sobrescriben las columnas restantes.
- **CON-F06 — Price y Other Info:** la tabla usa el orden Event, Lineup, Start Date, End Date, Price, Venue, City, Province y Other Info. Price, Province y Other Info son campos opcionales; Price y Other Info admiten texto libre sin interpretación o transformación. El pegado tabulado desde Price distribuye las dos columnas entre Price y Other Info; desde Other Info solo actualiza esa columna. Ambos admiten rangos de filas, conservan celdas vacías y no sobrescriben los demás campos. Lineup es común a conciertos y festivales y representa sus artistas; **Festival Lineup queda descartada**. Los nuevos valores permanecen en estado local y no se ha diseñado ni implementado persistencia.
- **CON-F07 — Type:** cada fila mantiene `type: EventType` en estado local, con los únicos valores `concert` y `festival`; las filas nuevas usan `concert` por defecto. La columna Type precede a Event y el orden de las nueve columnas restantes es Event, Lineup, Start Date, End Date, Venue, Price, Other Info, City y Province. El select permite Concierto/Festival y el pegado reconoce esos nombres o los valores del enum sin distinguir mayúsculas. Los valores inválidos conservan el tipo anterior y muestran un aviso; el resto del rango válido se aplica. Ambos tipos utilizan actualmente el mismo editor y las mismas reglas. No se implementan diferencias de comportamiento, entidades, migraciones, endpoints ni persistencia; cualquier diferencia futura requiere una decisión posterior.
- **Comportamiento de tabla y edición masiva — pendiente de diseño:** acordar navegación, operaciones de filas y otras interacciones antes de implementarlas. No se incluye pegado masivo ni importación de archivos en CON-F01.
- **Validación de la experiencia completa — pendiente:** validar el prototipo con el usuario antes de abrir la fase backend.

## Fase B — Backend

El bloque de auditoría/dominio/persistencia descrito originalmente aquí quedó supersedido por CON-B04a–CON-B04g, disponible en el checkout backend local. Los contratos revisados localmente están resumidos en [la auditoría canónica frontend](../docs/frontend/modules/events-festivals-importer.md); la implementación remota no se verificó.

- El backend ya dispone de resolución/materialización de entidades, conflictos, `POST /api/events/import-batch` e importación confirmada de lineup.
- CON-B04g añade inspectores read-only batch para Locality/Tour y candidatos de Artist; F08b.1 los contrastó con DTOs, controllers y servicios del checkout local.

Las descripciones siguientes de las fases A y B conservan decisiones e historial del prototipo y no sustituyen los contratos vigentes del backend.

## Fase C — Integración

La integración de eventos sigue pendiente aunque los endpoints backend ya existen. Su secuencia y criterios de aceptación están definidos en CON-F08b–CON-F09 al inicio de este roadmap:

- Resolución anticipada e incremental.
- Importación parcial idempotente.
- Conflictos y ampliación de lineup confirmada.
- Regresión, accesibilidad y rendimiento.

## Decisiones registradas en CON-F01 y CON-F02

- Se reutiliza `requiresAuth` y el mínimo de rol `riffvalley`, coherente con las rutas internas de importación existentes. La jerarquía de roles actual permite también el acceso a `superadmin`. El guard frontend controla navegación; no sustituye permisos de servidor.
- La pantalla aparece en un grupo independiente del Sidebar, justo debajo de «Nuevos Discos». No se crea un permiso nuevo.
- Cada fila tiene un identificador local estable y los campos `event: string` y `lineup: string`. Ambos empiezan como cadenas vacías y el índice visible se deriva del orden actual.
- No hay datos anteriores persistidos que migrar: CON-F01 solo mantenía sus valores en memoria mientras la vista permanecía montada. Los valores transitorios de una instancia anterior no están disponibles tras recargar o desmontar la vista.

## Decisiones registradas en CON-F03

- La llamada HTTP vive en `api/artistResolution.ts` y usa el cliente Axios compartido. La resolución se coordina en el módulo, fuera de los componentes visuales.
- La consulta se activa al confirmar la edición o tras un debounce de 450 ms para admitir escritura y pegado sin pedir por cada pulsación. Se agrupan nombres hasta el máximo de 100 por petición y se reutilizan resultados durante la vida de la vista.
- Cada fila mantiene su carga y errores de forma independiente. Los cambios cancelan trabajo anterior, las versiones y los valores actuales descartan respuestas obsoletas, y al desmontar o borrar la fila se abortan las peticiones asociadas.
- Un error conserva el borrador o nombre editable y ofrece reintento. Un resultado `artist: null` no se presenta como error y no crea artistas.
- Decisión original de CON-F03, supersedida por CON-F08b.4: Artist utilizaba una caché Map local porque la coordinación era por celda. Ahora TanStack Query es la autoridad de respuestas remotas; el coordinador conserva solo asociaciones y promesas pendientes, y la edición mantiene versiones locales para proteger el estado.
- El endpoint limita cada nombre a 100 caracteres. Si una entrada supera ese límite, el backend puede rechazar la petición; el frontend conserva el texto y muestra el estado de error con reintento tras editarlo.
- Los IDs recibidos se conservan como referencias del cliente, no se consideran prueba de autorización o validez. La persistencia futura tendrá que verificarlos en servidor.

## Contratos y decisiones registradas en CON-F04

- Se comprobó el contrato implementado en `riffvalley-app-back/src/catalog/venues`: `POST /api/venues/resolve-batch` recibe `{ venues: [{ name, localityId }] }`. La respuesta contiene el nombre, el `localityId` y `venue: { id, name } | null`. El backend normaliza el nombre y exige igualdad exacta dentro de cada localidad; no admite resolver solo por nombre. CON-F04 no usa este endpoint para la búsqueda inicial.
- La consulta inicial usa el endpoint existente `GET /api/venues?query=<nombre>&limit=100&offset=<n>`, paginado y limitado por nombre. El backend filtra por nombre normalizado como substring; el frontend recorre las páginas devueltas y conserva solo igualdad exacta tras aplicar la misma normalización conservadora del backend (quitar diacríticos, recortar/compactar espacios y minúsculas). No se consulta el catálogo sin filtro. Un contrato futuro podría ofrecer una resolución global exacta más eficiente; no se modifica backend en CON-F04.
- El listado `GET /api/venues` ya incluye `locality.id`, `locality.name`, `locality.province` y `locality.administrativeRegion` con su país. `GET /api/venues/:id` también carga Locality y AdministrativeRegion, pero no se necesita una segunda petición de detalle. Province proviene de `Locality.province`; la región administrativa permanece disponible en el dato consultado y no se crea una columna para ella.
- Resultados correctos de búsqueda se comparten entre filas por nombre normalizado para evitar consultas duplicadas. El estado por fila usa debounce, versiones y comprobación de valores actuales: respuestas obsoletas se ignoran; los fallos no se cachean y se pueden reintentar. La operación no bloquea la tabla.
- Cambiar el texto de Venue limpia sus IDs previos y mantiene City/Province editables. Cambiar City o Province limpia las referencias y reintenta contra el contexto escrito. Solo se vuelve a asociar el Venue si el nombre y todo contexto geográfico no vacío coinciden exactamente; una incompatibilidad deja la fila como texto. Vaciar Venue borra la asociación y conserva los textos de ubicación.
- La tabla mantiene en estado local `venue: { name, venueId, localityId }`, `city` y `province`; no guarda entidades completas ni crea recintos. Un Venue textual sin ID puede ser desconocido o ambiguo, distinguiéndose con el estado efímero `venueStates` mientras la vista vive. El guardado definitivo y la creación de recintos quedan fuera de CON-F04.

## Verificación de CON-F04

- Pruebas focalizadas: 3 archivos y 25 pruebas aprobadas. Cubren columnas y edición, resolución canónica/IDs y localidad, provincia vacía, recintos desconocidos y ausencia de asignación aproximada, homónimos y desambiguación por City y Province, invalidación por cambios, conservación de datos al borrar, errores/reintento, búsquedas deduplicadas, respuestas obsoletas, filas independientes, API paginada y Lineup existente.
- Suite completa: 223 archivos y 1570 pruebas aprobadas. `pnpm run typecheck` y `pnpm build` aprobados. ESLint, Prettier, `git diff --check` y el detector estático Impeccable (`[]`) también pasaron. La build informa avisos existentes de selector CSS `.flex-[2]`, datos Browserslist desactualizados y chunk superior a 500 kB; no se atribuyen a CON-F04 sin comparación base/head fiable.
- No se inspeccionó el navegador ni se tomaron capturas, según la instrucción; la revisión visual de temas queda pendiente del usuario.
- El checker Markdown global fue informativo: detectó seis enlaces locales rotos o externos a este repositorio en otros roadmaps preexistentes; no señaló `roadmap/events-festivals.md`.
- Solo se consultó el checkout backend para comprobar contratos; no se modificó.

## Verificación de CON-F05

- Pruebas focalizadas: 3 archivos y 35 pruebas aprobadas. Cubren orden y renderizado de columnas, edición y normalización manual, pegado individual y de dos columnas/múltiples filas, huecos, pegado desde End Date, ampliación de filas, conservación de datos fuera del rango y de otras columnas, borradores inválidos, fechas imposibles, año bisiesto, End Date vacío, orden entre fechas e igualdad.
- `pnpm run typecheck`, `pnpm build`, ESLint focalizado, Prettier y `git diff --check` aprobados. El detector Impeccable no reportó hallazgos (`[]`).
- La build conserva avisos preexistentes de sintaxis CSS `.flex-[2]`, datos Browserslist desactualizados y un chunk superior a 500 kB; no se atribuyen a CON-F05 sin comparación base/head fiable.
- `pnpm run markdown:links:delta` quedó informativo porque requiere base/head completos y un checkout limpio.
- No se inspeccionó el navegador ni se tomaron capturas, según la instrucción. La validación visual de ambos temas corresponde al usuario.
- No se modificaron backend ni persistencia.

## Verificación de CON-F06

- Las pruebas focalizadas de vista y estado local aprobaron: 2 archivos y 29 pruebas. Comprueban orden y renderizado de Price y Other Info, edición independiente, campos inicialmente vacíos y conservación literal del texto libre.
- El pegado verifica una y dos columnas, varias filas, celdas vacías, expansión de filas y que no se sobrescriban City, Province ni otros campos fuera del rango. También se cubre la conservación de valores al añadir o eliminar filas.
- Las pruebas existentes del importador mantienen cobertura para Lineup, Venue y fechas; no se cambió su resolución ni interpretación.
- `pnpm build` (incluye `vue-tsc --noEmit`), ESLint focalizado, Prettier focalizado y `git diff --check` aprobaron. El build conserva avisos de CSS `.flex-[2]`, datos Browserslist desactualizados y chunk superior a 500 kB; no se atribuyen a CON-F06 sin comparación base/head fiable.
- La invocación `pnpm test -- <archivos>` inició la suite completa por cómo el script reenvía argumentos en este repositorio; se interrumpió y no se considera una ejecución completa. Los dos archivos focalizados se ejecutaron con `pnpm exec vitest run <archivos>` y aprobaron.
- No se inspeccionó el navegador ni se tomaron capturas, según la instrucción. No se modificó backend ni se implementó el guardado definitivo.

## Verificación de CON-F07

- Pruebas focalizadas de estado local y vista: 2 archivos y 32 pruebas aprobadas. Cubren el select y sus etiquetas, valor inicial, cambio e independencia entre filas, conservación al editar otros campos, pegado válido y valores inválidos con aviso sin sobreescritura, filas nuevas/eliminadas y las columnas existentes, incluido Lineup, Venue, fechas, Price y Other Info.
- `pnpm run typecheck`, ESLint focalizado, Prettier focalizado y `git diff --check` aprobados.
- No se inspeccionó el navegador ni se tomaron capturas, según la instrucción. No se modificaron backend ni persistencia.
