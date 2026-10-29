# CAT-ART-4a — Auditoría de «Rellenar imágenes»

**Estado: completada documentalmente el 2026-10-29.** Auditoría estática del frontend y del checkout backend hermano disponible. No se ejecutó el botón, no se consultaron Spotify ni Last.fm, no se modificaron datos ni se accedió a producción. No se modificaron código ni tests.

## Resumen

- El botón en `ArtistManagement.vue` confirma una operación que descarga todas las páginas de gestión, reúne los artistas cuyo `image` es falsy y los procesa secuencialmente. Por artista hace una búsqueda Spotify por nombre y, si obtiene imagen, un `PATCH /artists/:id` con `{ image }`.
- El backend de escritura fuerza `needsReview: false` en todo PATCH de artista. Está confirmado que rellenar una sola imagen puede cerrar una revisión pendiente. También recalcula `searchNameNormalized` y guarda la entidad, actualizando `updatedAt`.
- El proxy Spotify elige `artists.items[0]`; no coteja el nombre, país ni identidad con el artista local. La asociación automática de un homónimo es un riesgo demostrado por el algoritmo, aunque no se observó una fila errónea concreta.
- Los errores individuales se silencian. No hay reintento, cancelación, límite del conjunto ni protección contra dos ejecuciones simultáneas en frontend.
- Recomendación: añadir `POST /artists/images/fill` como operación acotada por lote, con cursor opaco, que seleccione elegibles, busque y valide en backend y escriba solo `image` mediante actualización condicional cuando siga vacía. En el primer corte solo automatizar coincidencias de identidad suficientemente corroboradas; el resto debe clasificarse como ambiguo y no mutarse.
- El backend puede reutilizar `SpotifyPublicApiService.findArtistCandidates` y el servicio/credenciales Spotify existentes. El frontend solo iterará continuaciones devueltas, reflejará el avance agregado y presentará los resultados estructurados.
- Alcance de interfaz acordado: quitar la vista/pestaña Gestión; conservar el directorio de artistas y colocar el botón arriba, visible solo para `superadmin`. El endpoint también debe exigir `superadmin`. El relleno conserva el alcance global actual: todos los artistas sin imagen, no solo los pendientes de revisión.

## 1. Funcionamiento actual

### Flujo

```text
Botón en ArtistManagement.vue
  └─ confirmación SweetAlert
     └─ GET /artists/management (páginas de 200, sin filtros)
        └─ seleccionar en memoria los registros con image falsy
           └─ secuencial, por cada artista elegible:
              ├─ GET /spotify/artists/search?artistName=<nombre>
              │  └─ SpotifyArtistsController.findArtist
              │     └─ SpotifyPublicApiService.findArtist
              │        └─ Spotify Web API Search, type=artist, limit=1
              └─ si imageUrl existe: PATCH /artists/:id { image }
                 └─ ArtistWriteService.update → preload + save
```

No se usa el filtro activo de la lista, ni el estado `needsReview`, ni una selección manual. La elegibilidad es simplemente `!artist.image`; no se exige que tenga discos, país o género. La página de gestión normal carga 30 registros, pero este flujo vuelve a consultar `/artists/management` con límite 200 y offsets sucesivos hasta el `totalItems` informado por la primera página. La selección se hace después de cargar cada página en el cliente.

Si una búsqueda devuelve perfil sin `imageUrl`, no hay PATCH. Si tiene imagen, el flujo persiste la URL y actualiza la imagen local de la fila visible, si está en esa página. La espera fija entre elementos es 150 ms. El botón muestra `fillProgress / fillTotal`, queda desactivado durante la ejecución y pide confirmación antes de empezar; el progreso vuelve a cero al terminar.

### Componentes y contratos reales

| Responsabilidad | Archivo y método | Observación |
|---|---|---|
| Botón, confirmación, elegibilidad, bucle, estado y mensajes | [`ArtistManagementView.vue`](../../src/modules/catalog/artists/presentation/views/ArtistManagementView.vue), `fillAllImages()` | En el snapshot de esta auditoría era una función de la vista legacy. CAT-ART-6a trasladó la vista; el flujo actual conserva la acción de rellenado. |
| Listado paginado | [`artist.ts`](../../src/services/artist/artist.ts), `getArtistsManagement()` | `GET /artists/management`; parámetros `query`, `limit`, `offset`, `genreId`, `needsReview`; respuesta tipada con `totalItems` y `data`. El rellenado solo pasa `limit` y `offset`. |
| Escritura genérica | [`artist.ts`](../../src/services/artist/artist.ts), `updateArtist()` | `PATCH /artists/:id`; el tipo frontend admite `name`, `countryId`, `image` y `description`. El relleno envía solo `image`. |
| Búsqueda Spotify singular y múltiple | [`spotifyLookup.ts`](../../src/services/spotify/spotifyLookup.ts), `findSpotifyArtist()` y `findSpotifyArtistCandidates()` | Rutas `/spotify/artists/search` y `/spotify/artists/search/multiple`. `findSpotifyArtist` convierte 404 a `null`; otros errores se propagan. |
| Editor manual | [`ArtistManagementView.vue`](../../src/modules/catalog/artists/presentation/views/ArtistManagementView.vue), `fetchSpotifyImage()` | El snapshot anterior usaba candidatos múltiples y seleccionaba el primero con imagen. Esta función ya no está en la vista trasladada; la tabla conserva el estado de la auditoría original. |
| Autorización frontend | [`ArtistManagementView.vue`](../../src/modules/catalog/artists/presentation/views/ArtistManagementView.vue), `isSuperadmin` | La vista actual conserva el botón solo para `superadmin`. La ruta `/artists` mantiene el meta guard local `requiresAuth: true`, `requiresRole: "user"` en `src/router/index.ts`. El resto de esta fila describe el snapshot original de esta auditoría. |
| Controlador de artistas backend | Checkout hermano: `src/catalog/artists/artists.controller.ts`, `update()` | `PATCH /artists/:id` aplica `@Auth(ValidRoles.riffvalley)`. Los GET de management no declaran `@Auth` en esos handlers observados. |
| Efectos de escritura backend | Checkout hermano: `src/catalog/artists/write/artist-write.service.ts`, `update()` | `preload` recibe los campos del DTO y añade siempre `needsReview: false`; recalcula `searchNameNormalized` y guarda. La entidad TypeORM actualiza `updatedAt`. |
| Spotify backend | Checkout hermano: `src/integrations/spotify-integration/http/spotify-artists.controller.ts`, `findArtist()`; `src/integrations/spotify-integration/api/spotify-public-api.service.ts`, `findArtist()` | `findArtist()` toma el primer elemento de Spotify. `findArtistCandidates()` consulta hasta cinco y devuelve `spotifyId`, nombre, URL, imagen y géneros. El acceso y la caché de Client Credentials ya pertenecen a la integración backend existente. |
| Endpoint Last.fm distinto | Checkout hermano: `src/catalog/lastfm/lastfm.controller.ts`, `fillWeeklyImages()` | `POST /lastfm/fill-images` opera sobre imágenes de discos por semana; no lo llama este botón ni rellena fotos de artistas. |

**Diferencia de permisos que debe quedar visible:** CAT-ART-1 documentó una versión anterior con `riffvalley` para el botón/ruta. En el código frontend local inspeccionado ahora, `/artists` permite `user` y Gestión/botón requieren `superadmin`; el PATCH backend sigue exigiendo `riffvalley`. El diseño acordado quita Gestión, deja el botón arriba para `superadmin` y exige ese mismo rol en el endpoint nuevo, con guard backend explícito. Esta auditoría no prueba autorización en un entorno desplegado; la visibilidad del botón no es seguridad.

### DTOs, almacenamiento y tests existentes

- `UpdateArtistDto` es el contrato de `PATCH /artists/:id`; el endpoint no tiene contrato especial de imagen. La escritura usa `ArtistWriteService.update()` y `Repository.preload/save`. La entidad `Artist` mantiene `image`, `needsReview`, claves normalizadas y `updatedAt`.
- Spotify normaliza el perfil y la primera imagen en el proxy backend. La búsqueda singular consulta `limit=1`; la búsqueda múltiple reutilizable consulta `limit=5`. El acceso a Spotify y token Client Credentials está encapsulado en la integración backend.
- Tests frontend observados en CAT-ART-4a: `src/services/artist/artist.test.ts` cubría parámetros de management y lectura de detalle; el test de paginación se trasladó a `src/modules/catalog/artists/application/artistManagementPagination.test.ts`. CAT-ART-4c añadió el test de la vista, ahora en `src/modules/catalog/artists/presentation/views/ArtistManagementView.test.ts`.
- Tests backend observados: `src/catalog/artists/write/__tests__/artist-write.service.spec.ts` afirma que update pasa `needsReview: false`; `src/catalog/artists/__tests__/artists.controller.spec.ts` cubre el controller; tests de Spotify cubren búsquedas singular y múltiple (`src/integrations/spotify-integration/api/__tests__/spotify-public-api.service.spec.ts` y `http/__tests__/spotify-artists.controller.spec.ts`). No se halló test de operación de rellenado de imágenes de artista.
- No se ejecutó ninguna prueba en esta auditoría. Las rutas backend refieren al checkout hermano inspeccionado estáticamente, no a producción.

## 2. Problemas confirmados y riesgos

| Punto | Evidencia | Clasificación |
|---|---|---|
| La respuesta singular puede devolver un artista que no sea el buscado | `SpotifyPublicApiService.findArtist()` toma `artists.items[0]` y devuelve su perfil sin verificar similitud con el nombre local. | Defecto demostrado en la lógica; una asociación errónea concreta es riesgo, no incidente observado. |
| Homónimos | El flujo masivo no comprueba país, género, ID Spotify previo, alias ni segundo candidato. El perfil de Spotify del endpoint singular no aporta un país utilizable para cruzar con el país del registro. | Riesgo demostrado por ausencia de controles; no prueba que ya se hayan confundido dos artistas. |
| PATCH cambia estado ajeno a imagen | `ArtistWriteService.update()` siempre añade `needsReview: false`, también para `{ image }`; TypeORM guarda la entidad y toca `updatedAt`. | Efecto lateral demostrado. No cambia `name`, `countryId` o `description` cuando el payload contiene solo imagen, salvo el recálculo interno de `searchNameNormalized`. |
| Sobrescritura por carrera | El snapshot de elegibles se obtiene antes del bucle. Si otro usuario o ejecución pone imagen después de esa lectura, el PATCH no vuelve a comprobar que siga vacía y puede reemplazarla. | Posibilidad demostrada por ausencia de precondición/actualización condicional; no se observó una carrera real. |
| Errores opacos | El `catch` interno continúa ante cualquier error Spotify/PATCH; el resumen final solo cuenta éxitos y total examinado. No distingue error temporal, no encontrado, ambiguo o sin imagen. | Comportamiento demostrado. |
| Paginación mutable | Las páginas se consultan por offset sobre una ordenación `updatedAt DESC`; hay una oportunidad de que el conjunto/orden cambie durante la lectura. `updatedAt` además puede cambiar con la escritura. | Riesgo de omisiones/duplicados en catálogo concurrente; no se ha demostrado en ejecución. |
| Sin retry/cancelación/concurrencia | No hay retry, `AbortSignal`, botón cancelar, exclusión mutua ni idempotency key en el flujo. `fillingImages` desactiva el botón de una instancia de vista solamente. | Ausencia demostrada en el código frontend observado; no demuestra que exista o no una exclusión distribuida en otra capa. |
| Ejecución sin límite | Se consulta el total completo y se procesan todos los registros sin imagen; no existe máximo explícito. | Riesgo de tiempo/carga demostrable. |
| Permisos divergentes | UI actual exige `superadmin`; PATCH exige `riffvalley`; el acceso real depende también de guards backend y jerarquía de roles. | Diferencia de contratos observada; la protección efectiva en producción no está verificada. |

### Volumen de solicitudes actual

Con `N` artistas totales y `E` sin imagen, el frontend hace `ceil(N/200)` llamadas a `/artists/management` (una si hay registros; con catálogo vacío, una consulta inicial que devuelve vacío), hasta `E` llamadas de búsqueda al proxy Spotify y hasta `E` llamadas `PATCH` —una por artista con perfil e imagen—. Por tanto, la integración puede generar hasta `E` búsquedas externas a Spotify por ejecución, más renovaciones de token cuando corresponda; las peticiones usan el token cacheado existente, no una autenticación nueva por artista. El flujo ejecuta una búsqueda a la vez, espera 150 ms entre artistas y además incurre en latencia de red/proveedor y de PATCH.

## 3. Alternativas y recomendación

| Alternativa | Ventaja | Coste/riesgo | Evaluación |
|---|---|---|---|
| Endpoint que procesa todo el catálogo en una petición | UI mínima; una única llamada. | Duración no acotada por cantidad, posibilidad de timeout, difícil reintento/cancelación y respuesta enorme. | No recomendado. |
| Endpoint por artista | Fácil de limitar y reintentar. | La selección/bucle vive en frontend; N llamadas de orquestación y mayor acoplamiento a decisiones de identidad. | Útil para acción manual futura, no para reemplazar el llenado masivo actual. |
| Endpoint síncrono por lotes limitados con continuación | Cada petición acota trabajo y tiempo; permite reanudar y devolver detalle por elemento sin cola persistente. | El frontend hace llamadas sucesivas de continuación, pero no elige artistas ni integra con Spotify. | **Recomendado para CAT-ART-4b/4c.** |
| Job asíncrono persistido con `jobId`, consulta de estado y cancelación | Mejor para catálogos grandes y ejecuciones largas; progreso durable y cancelación real. | Requiere persistencia/cola, ciclo de vida, limpieza y nuevos endpoints/estados; escala de solución mayor. | Reservar si el lote limitado síncrono excede de forma observada límites HTTP/UX. |

La alternativa recomendada conserva el resultado funcional de recorrer todo el conjunto, pero lo divide en lotes pequeños en llamadas acotadas. El backend selecciona cada lote de forma determinista; el cliente solo envía la continuación devuelta, permite detener la cadena entre lotes y agrega el progreso/resultados. Los fallos persistentes no deben reintentarse en un bucle automático: se informan y quedan para una ejecución posterior explícita.

## 4. Contrato recomendado

### Inicio y continuación

`POST /artists/images/fill` — autenticado con `@Auth(ValidRoles.superadmin)`. El backend debe declarar y aplicar ese permiso en el controller independientemente del router. El frontend muestra el botón superior únicamente a `superadmin`.

```json
{
  "limit": 20,
  "cursor": null
}
```

`limit` opcional con default bajo y máximo fijo (propuesta inicial: 20). `cursor` nulo inicia; en una respuesta parcial es un token opaco que retoma después del último ID/proyección estable. No aceptar lista arbitraria de IDs ni URL de imagen suministrada por el cliente: los artistas elegibles y el proveedor son responsabilidad backend.

```json
{
  "processed": 20,
  "updated": 8,
  "unchanged": 2,
  "ambiguous": 3,
  "notFound": 4,
  "failed": 3,
  "nextCursor": "opaque-or-null",
  "results": [
    { "artistId": "uuid", "artistName": "Nombre", "status": "updated" },
    { "artistId": "uuid", "artistName": "Nombre", "status": "ambiguous", "candidateCount": 2 },
    { "artistId": "uuid", "artistName": "Nombre", "status": "failed", "code": "SPOTIFY_UNAVAILABLE", "retryable": true }
  ]
}
```

Estados por artista: `updated`, `unchanged` (la imagen apareció antes de escribir), `ambiguous` (no hay identidad suficientemente clara), `not_found` (sin candidato válido o sin imagen) y `failed` (fallo técnico recuperable o no). No devolver tokens, credenciales ni trazas internas. `nextCursor: null` indica fin de la instantánea/trabajo. El contrato debe fijar semántica del total: `processed` cuenta elegibles evaluados en la página, y el frontend agrega páginas; no requiere un total global exacto susceptible a carreras.

La política de identidad es una condición de diseño, no debe debilitarse en implementación por comodidad: nombre exacto normalizado y unicidad entre los candidatos de Spotify es solo una heurística, no prueba identidad cuando existen homónimos. En v1, autoescribir únicamente con evidencia fuerte independiente disponible (por ejemplo, un ID Spotify ya vinculado al registro y coincidente); en ausencia de esa evidencia, devolver `ambiguous`/no actualizar. No existe actualmente una relación `spotifyId` en el contrato/entidad de artista descrito. Si se decide no añadir tal vínculo, el comportamiento seguro es abstenerse de mutar ante identidad no corroborable y definir un paso de selección humana separado, fuera de este endpoint automático.

### Persistencia segura e idempotencia

- El `UPDATE` debe tener condición `image IS NULL` o equivalente de valor vacío acordado, además de `id`; si no afecta fila, responder `unchanged`. Esto cierra la carrera que permite sobrescribir una imagen recién añadida.
- Escribir únicamente `image`. No llamar a `ArtistWriteService.update()` tal como está hoy, pues también cierra `needsReview`. Extraer/reutilizar un método de escritura dedicado que no cambie review, normalizaciones ni campos ajenos; dejar que `updatedAt` represente el cambio de imagen solo si esa semántica se acepta explícitamente.
- `needsReview`, nombre, país, descripción y relaciones deben conservarse. No reemplazar imágenes no vacías, salvo que un futuro contrato explícito de sobrescritura se diseñe aparte.
- Repetir una página/cursor no debe dañar datos. Un cursor inválido o expirado debe producir error de cliente estructurado y reinicio explícito, nunca un barrido inesperado desde el principio.

## 5. Spotify, permisos, errores y concurrencia

### Reutilización de Spotify e identidad

La ruta backend existente `GET /spotify/artists/search/multiple` ya llama a `SpotifyPublicApiService.findArtistCandidates()`, limita a cinco perfiles y reutiliza autenticación/token y traducción de errores de la integración. La lógica nueva debe inyectar/reutilizar `SpotifyPublicApiService` o una fachada interna de Integrations, no llamar directamente a Spotify ni duplicar client credentials, fetch, token cache o mapeo DTO. En el flujo nuevo no es necesario que el frontend use el endpoint de Spotify.

La búsqueda singular actual no discrimina identidad; la búsqueda múltiple mejora la revisión de resultados, pero tampoco añade país al perfil. Conservar varios candidatos dentro del servicio permite comparar datos y clasificar ambigüedad. La coincidencia por nombre normalizado sirve para descartar resultados claramente distintos, pero no desambigua dos artistas con igual nombre. Géneros de Spotify frente al género de discos locales pueden servir como evidencia auxiliar, nunca como prueba única.

### Errores

- Fallo global de autorización, DTO/cursor o repositorio: HTTP adecuado (`401/403`, `400`, `5xx`) con código estable y mensaje seguro.
- Spotify caído/429: clasificar elementos afectados como `failed`, marcar `retryable` cuando aplique y respetar `Retry-After` si la integración lo soporta; limitar reintentos a pocos intentos con backoff y nunca repetir de forma ilimitada.
- 0 resultados, candidato sin imagen o identidad no corroborada: `not_found`/`ambiguous`, no convertirlo en error global.
- Persistencia condicional sin fila actualizada: `unchanged`, sin sobrescribir.
- Respuesta incluye contadores y detalle acotado del lote. Registrar en servidor errores técnicos con contexto mínimo (artistId y código, sin secretos); no ocultarlos como éxito.

### Límites, continuación y concurrencia

- Máximo bajo por petición, timeout de proveedor y concurrencia Spotify baja (recomendación inicial: secuencial dentro del lote), con máximo de solicitudes por ejecución derivado del número de páginas y el tamaño fijado.
- Continuación por cursor estable, no offsets sobre un conjunto que se va reduciendo. La selección filtra `image IS NULL` y ordena por clave estable (por ejemplo `id`) dentro de una instantánea lógica/cursor. Aclarar si nuevas filas elegibles creadas durante la operación quedan para otra ejecución.
- Exclusión mutua backend durante cada petición/lote; el flag frontend solo protege una vista/pestaña. Peticiones simultáneas pueden serializarse o responder `409 FILL_ALREADY_RUNNING`. Dos cadenas de lotes pueden intercalarse entre peticiones; la escritura condicional hace que esa concurrencia sea no destructiva y cada cursor permite avanzar sin repetir la misma fila. Una exclusión de toda la cadena requeriría estado de job/lease y queda fuera de la propuesta pequeña.
- No incluir cancelación remota en el primer corte: el cliente puede dejar de pedir páginas entre lotes. Si se exige interrumpir un lote ya iniciado o sobrevivir a desconexiones, eso apunta al job asíncrono. El endpoint debe documentar que una petición en curso termina su lote.

## 6. Responsabilidades

**Backend (CAT-ART-4b):** autorizar; seleccionar elegibles y paginar; llamar a la integración Spotify existente; validar candidato y abstenerse ante ambigüedad; persistir con precondición de imagen vacía y sin tocar review; limitar carga/concurrencia; resumir errores/resultados y emitir continuación.

**Frontend (CAT-ART-4c):** quitar la vista/pestaña Gestión y conservar el directorio. Mostrar el botón «Rellenar imágenes» arriba solo para `superadmin`. El botón procesa todos los artistas sin imagen, independientemente de `needsReview` y de la página/directorio visible. Mostrar confirmación; llamar el endpoint por lotes hasta fin o hasta que se detenga la continuación; bloquear el botón en esa instancia; presentar progreso agregado, actualizaciones/no resultados/ambigüedades/fallos y opción de continuar una ejecución después. No descargar el catálogo para filtrar, llamar Spotify, resolver candidatos ni hacer PATCH por artista.

## 7. Tests necesarios

### Backend (CAT-ART-4b)

- Controller: auth requerida y permiso `superadmin`; DTO limita `limit`, cursor inválido y respuesta tipada.
- Selección: solo imágenes vacías, estable por clave/cursor, se respeta tamaño máximo, no se salta ni repite fila al continuar.
- Identidad: coincidencia fuerte elegible, nombre distinto rechazado, dos homónimos ambiguos, falta de evidencia de identidad sin escritura y candidatos sin imagen.
- Escritura: solo cambia imagen; `needsReview`, campos y relaciones intactos; imagen previamente añadida produce `unchanged`; ausencia del artista se reporta sin corromper página.
- Errores Spotify/DB: error por artista no aborta el lote, clasificación retryable, límites/backoff y error global apropiado; no se filtran credenciales.
- Concurrencia: peticiones simultáneas respetan serialización/rechazo del lote; dos cadenas intercaladas no sobrescriben imágenes; cursor repetido es idempotente.
- Integración/fachada: se invoca el servicio Spotify existente y no se duplican llamadas de token.

### Frontend (CAT-ART-4c)

- Adaptador envía limit/cursor y tipa respuesta; no llama `getArtistsManagement`, `findSpotifyArtist` ni `updateArtist` desde el rellenado.
- Componente inicia tras confirmar, representa lotes/progreso y contadores de ambigüedad/fallo, bloquea acción duplicada y termina correctamente ante error de lote.
- Al dejar de continuar, no dispara la página siguiente; error de una página conserva el resumen ya recibido e indica que se puede reanudar.

### Cierre (CAT-ART-5)

- Revisión focalizada de permisos, alcance de escritura e identidad; confirmar tests backend/frontend requeridos y evidencia disponible. No certificar llamadas reales a Spotify ni despliegue si no se ejecutan explícitamente.

## 8. Decisiones pendientes

1. ¿Existe o se acepta una relación persistente Spotify ID ↔ artista? Sin ella, nombre exacto/país no bastan para garantizar la identidad; la recomendación segura es no automatizar los casos no corroborados.
2. ¿«Sin imagen» significa estrictamente `NULL` o también cadena vacía/espacios? Definir y normalizar la elegibilidad en backend.
3. Confirmar tamaño máximo inicial de lote (propuesta 20) y si el cursor expira o solo vive durante la cadena de llamadas.
4. Definir ámbito de exclusión mutua y si el 409 comunica operación en curso global o por usuario.
5. Decidir si basta detener la continuación entre lotes o se requiere cancelación dentro del lote/job asíncrono.
6. Decidir si actualizar `updatedAt` al cambiar solo la imagen es la semántica deseada y si el orden visible por `updatedAt` puede cambiar.

## 9. Plan de subtareas

| Tarea | Estado | Alcance y dependencia |
|---|---|---|
| **CAT-ART-4a — Auditoría** | **Completada documentalmente** | Traza estática frontend/backend, riesgos y contrato recomendado; este informe. No inicia implementación. |
| **CAT-ART-4b — Endpoint backend** | Pendiente, no iniciada | Resolver decisiones de identidad, límite y concurrencia; implementar operación por lotes autorizada para `superadmin`, persistencia exclusiva de imagen y tests unitarios/integración focalizados. Depende de la auditoría; backend es checkout independiente. |
| **CAT-ART-4c — Adaptación frontend** | Pendiente, no iniciada | Tras contrato estable de 4b, quitar la vista Gestión y conservar el directorio con el botón superior para `superadmin`; procesar todos los artistas sin imagen. Consumir la operación por lotes, continuación y resultado; tests focalizados. Depende de 4b. |
| **CAT-ART-5 — Revisión focalizada y cierre** | Pendiente, no iniciada | Revisar el diff y evidencias de 4b/4c, permisos, identidad, efectos persistidos, errores y concurrencia; actualizar estado/documentación. Depende de ambas. |

**Validación documental de CAT-ART-4a:** pendiente de ejecutar al terminar la edición: verificador de enlaces Markdown y `git diff --check`. No se ejecutarán pruebas/build/typecheck ni el flujo de rellenado.
