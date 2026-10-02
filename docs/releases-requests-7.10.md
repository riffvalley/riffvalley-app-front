# Caracterización legacy de peticiones (7.10)

Esta nota registra el comportamiento comprobable en `src/app/router`, las dos
vistas legacy, `services/requests/requests.ts`, `helpers/rejectReasons.ts`,
`stores/petitions/petitions.ts` y el menú lateral. Las pruebas de
`tests/unit/releases/requests/` simulan transporte y stores. No prueban permisos
ni efectos del backend.

## Acceso y pantallas

- `/suggest` es lazy y tiene `requiresAuth: true`, `requiresRole: babyUser`.
  `/petitions` es lazy y tiene `requiresAuth: true`, `requiresRole: riffValley`.
  El guard redirige anónimos a `Login` y sesiones sin el rol exacto a `Home`.
  `superUser` por sí solo no satisface ninguno de esos roles. No hay herencia de
  roles en el guard. Sidebar define visibilidad del enlace separadamente; la
  decisión de ruta es la evidencia de permiso frontend.
- El guard y las rutas no prueban autorización API. No se dispone de código del
  backend en este checkout, así que los roles efectivos de cada endpoint y el
  control de acceso directo quedan sin confirmar.
- `/suggest` hace `GET /requests/my` al montar. Muestra loading; si falla, oculta
  el error y termina mostrando el mismo estado vacío que para una lista vacía.
  Tras crear, antepone la respuesta a la lista local sin volver a cargar.
- `/petitions` hace `GET /requests` al montar y empieza en `pending`. Al fallar,
  muestra `No se pudieron cargar las peticiones` y después el vacío del filtro.
  Los filtros visibles son Pendientes, Aprobadas, Rechazadas y Todas, con
  contadores calculados de la colección cargada. Vacíos: `No hay peticiones`
  con el estado seleccionado. No hay refresco periódico.

## Alta y seguimiento propios

`POST /requests` envía `discName`, `artistName` y `releaseDate`; nombres se
recortan. `releaseDate` es obligatorio en la UI y se rechaza antes de
`2025-01-01`. `ep` y `debut` solo se incluyen si son true. `genreId` y
`countryId` solo se incluyen con selección; vacíos se omiten, no se envía null.
La interfaz ofrece género/país en `catalogStore.genres/countries` con búsqueda
y opción “Sin género/país”; esta vista consume el store y no invoca
`fetchCatalog` por sí misma. La carga inicial de opciones depende del shell/store
externo y no está demostrada dentro de esta ruta aislada.

En éxito se antepone la respuesta, se limpia el formulario y aparece
`Petición enviada correctamente`. Error: mensaje de `response.data.message` o
`Error al enviar la petición`; mantiene campos. El botón refleja `Enviando...`
y se deshabilita mientras espera. Campos de API `description`, `image` y `link`
son opcionales según el DTO del servicio, pero el formulario actual no los
recoge. El servicio devuelve `response.data` sin transformación.

La respuesta/listado propio usa `id`, `discName`, `artistName`, `releaseDate`
nullable, flags booleanos, estado `pending | approved | rejected`, `adminNotes`
nullable, `createdAt`, y `genre/country` nullable con `{id,name}`. El listado
oculta metadatos nulos y muestra notas admin no vacías. Fechas se presentan en
locale `es-ES` como DD/MM/AAAA. Estados visibles: Pendiente, Aprobada,
Rechazada.

## Moderación

- Edición disponible para pendiente/rechazada (cualquier estado salvo
  approved); aprobar/rechazar solo aparecen en pendiente; reabrir solo en
  rejected. `PATCH /requests/:id` envía únicamente campos modificados. Para
  limpiar género/país envía `genreId: null` / `countryId: null`; fecha vacía se
  envía como `releaseDate: ''`. Se editan nombres, fecha, relaciones, flags y
  `adminNotes`; el texto admin se envía tal cual, incluso vacío. La respuesta
  reemplaza el elemento local. Éxito `Petición actualizada`; error usa mensaje
  API o `Error al guardar`. No se resincroniza el contador tras edición.
- Aprobar llama `POST /requests/:id` en `/approve`, sin body. El servicio retorna
  `void` y descarta cualquier respuesta del servidor. La vista actualiza solo
  el estado local a `approved`, sincroniza badge desde la colección y muestra
  `Petición aprobada y disco creado`; error usa mensaje API o `Error al aprobar`.
  Aunque ese texto afirma que se creó un disco, el cliente no puede confirmar
  disco/artista creados ni recibir sus datos. La respuesta real de approve no
  puede demostrarse con el código cliente.
- Rechazar presenta cinco motivos rápidos definidos en
  `src/helpers/rejectReasons.ts`; elegir uno lo copia al textarea y luego se
  puede editar. Texto vacío/solo espacios no envía y muestra `El motivo es
  obligatorio.`. Envía `DELETE /requests/:id` con `{ adminNotes: texto.trim() }`.
  Respuesta reemplaza elemento; contador sincronizado; éxito `Petición
  rechazada`; error usa mensaje API o `Error al rechazar`.
- Reabrir llama `POST /requests/:id/reopen`, devuelve `response.data`, reemplaza
  el elemento con esa respuesta, sincroniza badge y muestra `Petición
  reabierta`; error usa mensaje API o `Error al reabrir`. Los datos concretos
  post-reopen los determina la respuesta del backend; el cliente la conserva
  entera y no hace una segunda lectura.

`usePetitionsStore` solo mantiene `pendingCount` numérico, inicializado a cero y
reemplazado por `setPendingCount`. La vista administrativa lo sincroniza tras
cargar y después de approve/reject/reopen contando `status === pending`. El
sidebar también hace `GET /requests` al montar, pero solo cuando
`authStore.hasRole('user')` es true, cuenta `pending` y silencia errores. Muestra
el badge junto a Peticiones y en el área móvil si el valor es mayor que cero
(máximo visual `99+`). Este gate de carga es `user`, mientras que el guard de
`/petitions` exige `riffValley`; no se puede asegurar que todo usuario de
`riffValley` tenga el rol `user`, ni determinar qué recibe el backend si no lo
tiene. No hay polling; el contador puede quedar obsoleto hasta que el sidebar
se monte o la vista administrativa cargue/ejecute una acción.

## Cobertura añadida

Las pruebas caracterizan payloads y respuestas del servicio (incluido DELETE y
su body), validaciones, opcionales/null, selección de catálogo, fechas y flags,
mensajes y estados de ambas pantallas, filtros, motivos, notas editables,
transiciones, roles del guard y estado del contador. No se añadieron E2E: estos
contratos/pantallas están cubiertos con transporte simulado en unit tests y no
se está migrando el recorrido.
