# Roadmap autónomo — Sugerencias

## Objetivo

Migrar los recorridos de sugerencias y bugs con sus contratos, adaptadores,
composición, presentación y compatibilidad, de forma que el trabajo pueda
ejecutarse y revisarse sin esperar a las demás capacidades de Iteración 7.

Este plan separa el **orden de ejecución**, no cambia por sí mismo el ownership:
Sugerencias sigue siendo una capacidad de `modules/releases/suggestions` según
el mapa funcional de `ROADMAP.md`. Product Ops conserva versiones y elementos
de versión; `app` compone la interacción. Si se busca convertir Sugerencias en
un bounded context independiente de Releases, hace falta una decisión de
arquitectura y actualizar primero el mapa de módulos.

## Inventario actual

- `src/views/suggestions/SuggestionsPage.vue` en `/suggestions`: vista con sesión
  para crear y consultar sugerencias propias.
- `src/views/suggestions/SuggestionsManagement.vue` en
  `/suggestions/management`: administración con rol `superUser`, filtros,
  estados y acciones.
- `src/services/suggestions/suggestions.ts`: DTOs y llamadas HTTP para
  `/suggestions`, `/suggestions/my`, `/suggestions/:id` y las acciones
  `/progress`, `/reject`, `/done`; también incluye `GET
  /versions/current/items`, que pertenece a Product Ops.
- `src/layouts/default/components/SidebarMenu.vue`: carga sugerencias pendientes
  y actualiza el badge de gestión.
- `src/stores/support/support.ts`: coordina IDs pendientes y leídos; persiste
  `rv_support_read_ids`. La UI de gestión también usa ese estado para marcar
  entradas leídas.
- `src/services/versions/versions.ts`: fuente actual de `VersionItem`, propiedad
  de Product Ops y dependiente de la Iteración 8 para su futura migración.
- Rutas: `/suggestions` requiere sesión y `/suggestions/management` requiere
  `superUser`; ambas mantienen carga diferida.
- Tests: no se encontraron pruebas unitarias ni E2E focalizadas para sugerencias.
  Tampoco se encontraron otros consumidores del servicio fuera de las dos vistas
  y el sidebar.

## Ownership y límites

- **Sugerencias (Releases):** tipo, prioridad, estado, reglas de workflow,
  creación/consulta/modificación y la decisión de cerrar vinculada a un
  `versionItemId`.
- **Product Ops:** entidad `VersionItem` y consulta `/versions/current/items`.
  Sugerencias solo necesita una selección tipada con los campos que presenta;
  no replica ni modifica el catálogo de versiones.
- **Presentación/UI:** formularios, filtros, modales, estados de pantalla y
  coordinación del badge. El estado de lectura puede trasladarse a la
  presentación de Releases si se conserva la clave de almacenamiento.
- **`app`:** conecta puertos de Releases con el adaptador de Sugerencias, la
  fachada temporal de versiones y la proyección requerida por el layout.
- El sidebar no debe importar servicios de Releases. Releases no debe importar
  layouts, stores externos ni Product Ops. No se añaden operaciones a Editorial,
  soporte general, Catalog ni `shared`.

## Reglas de ejecución

- Mantener `domain` y `application` en TypeScript independiente de Vue, Pinia,
  HTTP, router, browser e infraestructura.
- DTOs de transporte junto a su adaptador. Ninguna vista, componente, composable
  o store de presentación llama al cliente HTTP ni a servicios legacy.
- No introducir `any` nuevo. Adaptar/narrowear la respuesta de lista que hoy
  admite array o `{ data }` sin ocultar una forma desconocida.
- Conservar rutas, guards, query params, payloads, comportamiento visual,
  feedback, estados de carga/error/vacío, actualización optimista y rollback.
- Conservar `rv_support_read_ids` y cómo se marcan las sugerencias pendientes
  como leídas. No limpiar claves de almacenamiento durante la migración.
- Product Ops permanece en Iteración 8. Hasta entonces, `app` puede usar
  `services/versions/versions.ts` como fuente temporal detrás de un puerto.
- Si Impeccable detecta hallazgos preexistentes, de atribución desconocida o
  fuera de alcance, no corregirlos ni suprimirlos; no modificar
  `.impeccable/config.json` ni estilos o comportamiento para satisfacer el hook.
  Corregir solo hallazgos demostrablemente introducidos por la subtarea actual y
  reportar los demás.
- Tests unitarios en `tests/unit/releases/suggestions/`; E2E en
  `tests/e2e/releases/suggestions/`. Ejecutar `yarn verify` al cerrar cada
  bloque y E2E para los recorridos/roles afectados.

## Bloques

### S.A — Contratos, operaciones y transporte

**Objetivo:** dejar Sugerencias disponible como una capacidad tipada con
adaptador probado, sin migrar aún las vistas.

**Alcance:** dominio y aplicación de Sugerencias, adaptador HTTP y composición
temporal de la consulta de elementos de versión.

**Dependencias:** cliente HTTP compartido y fachada actual de versiones. No
depende de migrar las otras capacidades de Releases ni de Product Ops.

**Riesgos:** preservar métodos, querys, payloads y respuesta array/`data`; no
llevar `VersionItem` a domain/application de Releases.

**Cierre:** operación pública pequeña, tests de adaptador y aplicación, y
composición de `app` sin imports cruzados de internals.

#### S.1 — Caracterizar los recorridos (S)

- **Objetivo:** fijar el comportamiento existente antes de extraerlo.
- **Alcance:** tests de creación/consulta propia; lista administrativa y filtros;
  prioridad optimista; rechazo; volver a pendiente; cierre interno o asociado a
  versión; borrado; lectura y badge.
- **Dependencias:** vistas, servicios, store, router y layout actuales.
- **Criterios de aceptación:** registrar roles, payloads, respuestas, mensajes,
  fallos, loading/error/vacío y clave `rv_support_read_ids`.
- **Verificaciones:** API simulada; verificar rutas diferidas, sesión en
  `/suggestions` y rol `superUser` en gestión.

#### S.2 — Modelar la capacidad de Sugerencias (XS)

- **Objetivo:** definir tipos puros del modelo Releases.
- **Alcance:** sugerencia, usuario, tipo, estado, prioridad, filtros e inputs en
  `modules/releases/suggestions/domain`.
- **Dependencias:** S.1.
- **Criterios de aceptación:** opcionales y nulos reflejan la respuesta actual;
  domain no importa `VersionItem`, Vue, Pinia, HTTP ni browser.
- **Verificaciones:** tests de reglas puras si las hay y guard arquitectónico.

#### S.3 — Declarar operaciones y puertos (S)

- **Objetivo:** ofrecer las operaciones necesarias a ambas presentaciones.
- **Alcance:** crear/listar propias, filtrar/listar administración, cambiar
  prioridad, rechazar, progresar, cerrar, eliminar y consultar elementos de
  versión por puerto externo.
- **Dependencias:** S.2.
- **Criterios de aceptación:** la aplicación no conoce transporte ni el DTO de
  Product Ops; recibe solo IDs y modelos mínimos requeridos.
- **Verificaciones:** pruebas de operaciones, errores y respuesta; comprobar
  límites de capa.

#### S.4 — Adaptar endpoints de Sugerencias (S)

- **Objetivo:** mover DTOs y HTTP al adaptador de Releases.
- **Alcance:** `POST/GET /suggestions`, `GET /suggestions/my`, `PATCH
  /suggestions/:id`, `PATCH .../progress`, `PATCH .../reject`, `PATCH
  .../done` y `DELETE /suggestions/:id`.
- **Dependencias:** S.3 y cliente HTTP.
- **Criterios de aceptación:** conservar rutas, métodos, query params, payloads,
  valores void y forma de resultados; no añadir coerciones silenciosas.
- **Verificaciones:** test por endpoint, query, payload y error; revisar que los
  DTOs estén junto al adaptador.

#### S.5 — Componer versiones y estado visual desde `app` (S)

- **Objetivo:** resolver dependencias sin acoplar módulos.
- **Alcance:** conectar los puertos del adaptador y operaciones; proporcionar
  elementos de versión desde `services/versions/versions.ts` temporalmente;
  coordinar estado leído/pendiente y exponer carga de badge.
- **Dependencias:** S.3–S.4.
- **Criterios de aceptación:** el puerto de versiones puede sustituirse en
  Iteración 8; la clave `rv_support_read_ids` mantiene nombre y formato; Releases
  no importa servicios legacy, store de soporte ni Product Ops.
- **Verificaciones:** test de composición con dobles; guard de imports/ciclos;
  prueba de lectura y restauración persistida.

### S.B — Recorrido de usuario

**Objetivo:** migrar `/suggestions` sin cambiar el acceso autenticado ni la
presentación funcional.

**Alcance:** formulario de creación, consulta de propias sugerencias, estados de
carga/error, lista y feedback.

**Dependencias:** S.A cerrada.

**Riesgos:** conservar guard, payload y comportamiento visible; no convertir la
vista de usuario en una ruta pública anónima.

**Cierre:** la vista solo consume la API de presentación/composición de Releases
y mantiene el comportamiento caracterizado.

#### S.6 — Migrar el envío y la lista propia (S)

- **Objetivo:** retirar HTTP legacy de `SuggestionsPage.vue`.
- **Alcance:** coordinación de `GET /suggestions/my`, creación, lista y feedback
  actual mediante operación de Releases.
- **Dependencias:** S.1 y S.5.
- **Criterios de aceptación:** URL, guard, validación, payload y estados de
  interfaz permanecen; presentación no importa `services/suggestions`.
- **Verificaciones:** pruebas de formulario/lista para éxito, vacío y error;
  E2E con API simulada y sesión.

### S.C — Administración, badge y compatibilidad

**Objetivo:** migrar las acciones de gestión y el badge de navegación, y cerrar
la fachada legacy cuando no tenga consumidores.

**Alcance:** gestión superUser, lectura persistida y sidebar.

**Dependencias:** S.A; puede avanzar en paralelo con S.B tras cerrar contratos y
composición, aunque la limpieza final espera todos los consumidores.

**Riesgos:** preservación de roles, Product Ops en `done`, store/clave persistida
y actualización de pendientes desde la vista filtrada.

**Cierre:** ninguna presentación importa los servicios legacy de sugerencias;
badge y estado leído mantienen su comportamiento.

#### S.7 — Migrar gestión y acciones (M)

- **Objetivo:** migrar la administración de sugerencias y bugs.
- **Alcance:** filtros, altas, prioridad, rechazo, cambio a pendiente, cierre
  interno/asociado a versión, eliminación, IDs no leídos y mensajes actuales.
- **Dependencias:** S.1 y S.5.
- **Criterios de aceptación:** `superUser`, optimismo/rollback, estados del
  modal, errores y asociación opcional a `versionItemId` se conservan; selección
  de versión usa un puerto, no el servicio de Product Ops desde la vista.
- **Verificaciones:** pruebas por acción y error; E2E autorizado y sin rol.

#### S.8 — Migrar badge del sidebar (XS)

- **Objetivo:** retirar la carga directa de sugerencias del layout.
- **Alcance:** cargar pendientes mediante `app` y proyectar el valor al sidebar.
- **Dependencias:** S.5 y S.7 para refrescar IDs durante la gestión.
- **Criterios de aceptación:** mismo criterio de pendientes, límite `99+`, rol
  que condiciona carga y ubicación; el sidebar no importa el servicio legacy.
- **Verificaciones:** prueba del puente/sidebar y búsqueda global de imports.

#### S.9 — Retirar la fachada legacy (XS)

- **Objetivo:** borrar compatibilidad redundante cuando sea seguro.
- **Alcance:** `services/suggestions/suggestions.ts` y pruebas legacy sin
  consumidores; ubicar pruebas en `tests/unit/releases/suggestions/`.
- **Dependencias:** S.6–S.8 y búsqueda de consumidores global.
- **Criterios de aceptación:** no quedan imports de operaciones legacy; la
  consulta `/versions/current/items` permanece en su propietario Product Ops;
  se conserva `rv_support_read_ids`.
- **Verificaciones:** `rg` de símbolos/imports, `yarn architecture`, pruebas del
  módulo y `git diff --check`.

## Secuencia recomendada

```text
S.1 → S.2 → S.3 → S.4 → S.5 → S.6 → S.7 → S.8 → S.9
                              └──── gestión y badge dependen de S.5
```

Los cortes S.B y S.C pueden implementarse en PRs separados después de S.A; no
hay que esperar a Peticiones, Importación o Lanzamientos nacionales.

## Deuda y relevo a Iteraciones 8–9

- **Iteración 8:** sustituir el puerto temporal de elementos de versión por la
  API pública de Product Ops cuando ese módulo esté migrado. Mantener mientras
  tanto la fachada `services/versions` como dependencia exclusiva de composición.
- **Iteración 9:** reservar solo la retirada de una fachada o store de
  compatibilidad si la búsqueda final demuestra consumidores fuera de estos
  recorridos. Anotar símbolo y consumidor exactos. No reservar por defecto la
  implementación de Sugerencias, sus pruebas ni el estado de lectura.
- La identificación de versión en el flujo `done` forma parte de Sugerencias;
  el catálogo y modelo de elementos/versiones continúan bajo Product Ops.

## Impeccable

La regla de hallazgos se aplica a todos los bloques: los hallazgos preexistentes,
de atribución desconocida o fuera de alcance se reportan únicamente. No se
corrigen ni suprimen, no se modifica `.impeccable/config.json` y no se cambian
estilos o comportamiento para satisfacer el hook. Solo se corrigen hallazgos
demostrablemente introducidos por la subtarea actual.
