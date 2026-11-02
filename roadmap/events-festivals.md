# Conciertos y festivales — roadmap frontend

## Estado

**Fase A — Prototipo frontend en curso.** CON-F01–CON-F07 están implementadas y verificadas localmente; la validación del usuario sigue pendiente. El prototipo no define el contrato de persistencia de conciertos.

| Fase                   | Estado      | Alcance                                                                           |
| ---------------------- | ----------- | --------------------------------------------------------------------------------- |
| A — Prototipo frontend | EN CURSO    | CON-F01–CON-F07 implementadas; validación progresiva de la experiencia pendiente. |
| B — Backend            | SIN INICIAR | Auditoría, diseño del dominio, persistencia y reglas tras validar el prototipo.   |
| C — Integración        | SIN INICIAR | Conexión con APIs y resultados de importación una vez definidos los contratos.    |

## Fase A — Prototipo frontend

- **CON-F01 — Completada en código, pendiente de validación del usuario:** módulo de Conciertos y festivales, pantalla `/concerts-festivals`, guard de rol existente y tabla editable con una columna string. El estado es local a la vista y no se persiste.
- **CON-F02 — Completada en código y verificada:** la tabla tiene campos independientes `event` y `lineup`. `Event` es texto opcional y admite quedar vacío. `Lineup` es texto plano que conserva íntegramente uno o varios nombres, incluidos separadores como `+`; no busca ni separa artistas. El estado de ambos campos sigue siendo local y no se persiste.
- **CON-F03 — Completada en código y verificada:** `Lineup` separa nombres mediante `+`, recorta espacios exteriores, ignora segmentos vacíos y conserva el orden. El frontend consulta `POST /api/artists/resolve-batch` con lotes de hasta 100 nombres, al acabar la edición o tras 450 ms sin cambios. Los artistas resueltos se muestran como pills con nombre canónico e ID; los no encontrados permanecen como texto editable con `artistId: null`. La estructura local de `lineup` conserva `{ name, artistId }` por artista y una clave local de presentación. No hay guardado definitivo.
- **CON-F04 — Venue inteligente con localidad y provincia:** la tabla añade `venue`, `city` y `province`, con texto libre y estado efímero por fila. La edición o pegado de Venue dispara una consulta tras 450 ms sin cambios o al confirmar la celda. Se conservan IDs solo ante una coincidencia exacta normalizada del nombre y, si se escribieron, de City y Province. Una coincidencia única se representa con una pill; su `venueId` y `localityId` se guardan y `city`/`province` se completan desde Locality. Provincia `null` queda vacía. Nombres desconocidos se conservan sin error ni creación; nombres homónimos quedan sin ID hasta que el contexto escrito deje una única coincidencia. Errores de red conservan texto y permiten reintentar.
- **CON-F05 — Start Date y End Date:** la tabla incorpora las columnas entre Lineup y Venue. Las fechas se editan como texto en formato español `DD/MM/YYYY` y se muestran con dos dígitos de día/mes; el estado local conserva fechas válidas como `YYYY-MM-DD`, sin objetos `Date` ni conversión horaria. Se validan fechas reales, años bisiestos y que End Date no sea anterior a Start Date; las fechas inválidas conservan el borrador para corregirlo. End Date es opcional y puede coincidir con Start Date. El pegado TSV desde Start Date distribuye hasta dos columnas entre ambas fechas y varias filas, conservando huecos; desde End Date solo actualiza esa columna. El pegado de una fecha individual también se normaliza. No se añade persistencia ni se sobrescriben las columnas restantes.
- **CON-F06 — Price y Other Info:** la tabla usa el orden Event, Lineup, Start Date, End Date, Price, Venue, City, Province y Other Info. Price, Province y Other Info son campos opcionales; Price y Other Info admiten texto libre sin interpretación o transformación. El pegado tabulado desde Price distribuye las dos columnas entre Price y Other Info; desde Other Info solo actualiza esa columna. Ambos admiten rangos de filas, conservan celdas vacías y no sobrescriben los demás campos. Lineup es común a conciertos y festivales y representa sus artistas; **Festival Lineup queda descartada**. Los nuevos valores permanecen en estado local y no se ha diseñado ni implementado persistencia.
- **CON-F07 — Type:** cada fila mantiene `type: EventType` en estado local, con los únicos valores `concert` y `festival`; las filas nuevas usan `concert` por defecto. La columna Type precede a Event y el orden de las nueve columnas restantes es Event, Lineup, Start Date, End Date, Venue, Price, Other Info, City y Province. El select permite Concierto/Festival y el pegado reconoce esos nombres o los valores del enum sin distinguir mayúsculas. Los valores inválidos conservan el tipo anterior y muestran un aviso; el resto del rango válido se aplica. Ambos tipos utilizan actualmente el mismo editor y las mismas reglas. No se implementan diferencias de comportamiento, entidades, migraciones, endpoints ni persistencia; cualquier diferencia futura requiere una decisión posterior.
- **Comportamiento de tabla y edición masiva — pendiente de diseño:** acordar navegación, operaciones de filas y otras interacciones antes de implementarlas. No se incluye pegado masivo ni importación de archivos en CON-F01.
- **Validación de la experiencia completa — pendiente:** validar el prototipo con el usuario antes de abrir la fase backend.

## Fase B — Backend

Pendiente de auditoría cuando el prototipo frontend esté validado:

- Auditar las entidades y capacidades actuales relacionadas.
- Diseñar el dominio de conciertos y festivales.
- Determinar entidades y migraciones necesarias.
- Resolver artistas, recintos y localizaciones.
- Diseñar validaciones, duplicados y persistencia por lotes.

No hay decisiones definitivas ni contratos API definidos en esta fase.

## Fase C — Integración

Pendiente del diseño y la implementación backend:

- Conectar el editor con las APIs reales.
- Sustituir los datos locales/simulados.
- Gestionar errores y resultados de importación.
- Ejecutar las pruebas de integración y cerrar la iniciativa.

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
- TanStack Query no se usa para esta interacción efímera por celda: no hay datos remotos persistentes que cachear en el cliente Query, y el editor necesita cancelación y versiones locales por fila/artista. El módulo mantiene una caché de resolución temporal para evitar consultas repetidas.
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
