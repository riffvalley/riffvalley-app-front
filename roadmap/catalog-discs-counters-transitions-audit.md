# CAT-DISC-4c — Auditoría de contadores y transiciones

**Estado:** auditoría completada; implementación pendiente de decisión. Solo se modificó documentación para registrar la auditoría. No se modificaron código productivo, estilos ni tests.

**Alcance:** números, unidad contada, filtros, orden, carga, actualización, paginación, errores y accesibilidad de `/disc-list`. Se conserva la distribución actual de los seis modos en una fila.

## 1. Inventario de números

La vista presenta un contador entre paréntesis en cada etiqueta de modo: `totalDisc`, `totalRates`, `totalCovers`, `totalComments`, `totalFavorites` y `totalPendings`. Esos valores los mantiene `useDiscListCoordinator`; cada respuesta aceptada actualiza únicamente el contador del modo de la petición con `result.totalItems`. No se muestran conteos simultáneos precargados para los seis modos.

El contador es el total server-side de filas que cumplen el modo y los criterios vigentes, no el tamaño de la página ni un recuento cliente. El adaptador conserva `totalItems`, `totalPages`, `currentPage` y `limit`; la vista usa `totalItems` como total y el coordinador usa `offset < totalItems` para decidir si pide otra página. El orden no debería cambiar el total semántico, pero sí forma parte de la identidad de consulta y provoca reset/recarga.

Otros números de las tarjetas no son totales del listado: `averageRate` y `averageCover` proceden de la proyección de cada disco y se presentan con dos decimales; `voteCount` y `commentCount` son recuentos por disco, se pasan a DiscCard como `rateCount`/`commentCount` y la tarjeta los oculta cuando valen cero. No se mezclan con `totalItems` ni se suman para el contador de modo.

| Modo | Etiqueta actual | Unidad de `totalItems` | ¿Puede repetirse el disco? | Efecto de filtros |
|---|---|---|---|---|
| `all` | Todos los discos | Discos del catálogo que cumplen los criterios | El servicio de catálogo pagina discos | Sí: búsqueda, fechas, país y géneros; también elegibilidad de discos/portadas sin votar cuando corresponda |
| `rates` | Mis votos | Filas de valoración musical del usuario | La relación de rate es una fila por entrada valorada | Sí: búsqueda, fechas, país y géneros |
| `covers` | Mis portadas | Filas de valoración de portada del usuario | La relación de cover es una fila por entrada con portada valorada | Sí: búsqueda, fechas, país y géneros |
| `comments` | Mis comentarios | Comentarios del usuario | Sí; cada comentario mantiene su `entryId`, aunque pertenezca al mismo disco | Sí: búsqueda, fechas, país y géneros |
| `favorites` | Favoritos | Relaciones favoritas del usuario | La fila representa la relación favorita, no un comentario ni un voto | Sí: búsqueda, fechas, país y géneros |
| `pendientes` | Pendientes | Relaciones pendientes del usuario | La fila representa la entrada pendiente | Sí: búsqueda, fechas, país y géneros |

La evidencia del backend proviene del checkout hermano `../riffvalley-app-back`: `DiscListService` selecciona el reader por modo, devuelve su `totalItems` y mapea cada fila; `DiscListQueryDto` declara `offset` default 0, `limit` default 20/max 100, filtros compartidos y sort validado por modo. `CommentsDiscListReader` mantiene filas por comentario, y su prueba del servicio afirma que dos comentarios del mismo disco siguen siendo dos resultados. Estos contratos describen el checkout inspeccionado; no se hicieron llamadas al backend desplegado.

## 2. Hallazgos de semántica de totales

1. **El total responde a los filtros activos.** Al cambiar búsqueda, año/mes/período, país o géneros, se crea una nueva consulta y se borra el total visible hasta recibir respuesta. «(127)» significa 127 filas bajo esos criterios, no necesariamente el total global del modo.
2. **El total no depende de la página.** Se recibe con cada respuesta paginada; offset y limit determinan las filas de la página, mientras `totalItems` expresa el conjunto filtrado. No se suma el total entre páginas.
3. **Cero se distingue de “aún no disponible”.** El estado inicial es `''`; el template oculta ese valor y muestra `0` cuando el servidor responde cero. Error deja el contador vacío y muestra un mensaje separado con reintento. Por inspección no se mezcla un error con cero.
4. **No hay conteos antiguos durante criterios nuevos.** `clearResults()` borra resultados, todos los contadores y el error en cada cambio de identidad. Las respuestas tardías de una generación anterior se ignoran. El coste UX es que el número desaparece mientras carga, en vez de señalar explícitamente que está pendiente.
5. **Formato.** Los conteos se interpolan como enteros sin agrupación local; todos usan el mismo formato, pero un número grande no obtiene separador español (`1.234`). No hay evidencia de formato decimal ni unidades mixtas en la misma cifra.

### Discos sin imagen

El DTO permite `image: null` y el adaptador la convierte en `""`. En los cinco modos que muestran tarjetas, la vista hace `discs.filter((d) => d.image)`: la fila sí forma parte de `totalItems`, pero no produce tarjeta. Por tanto, en `all` el número del contador puede superar el número visible de tarjetas; la misma diferencia es posible para rates, covers, favoritos y pendientes. No se encontró un filtro de imagen en los DTOs ni en el despacho de `DiscListService` revisado. Esto no justifica cambiar semántica del backend ni excluir el disco del total.

En `comments`, las filas se conservan y se cuentan individualmente incluso si varias pertenecen al mismo disco; al faltar imagen se intenta renderizar un `<img>` con URL vacía, lo cual puede producir una imagen rota, pero no elimina el comentario.

## 3. Cambios de modo y transiciones

El coordinador procesa cualquier cambio de modo mediante la misma identidad reactiva: limpia filas, offset, total y contadores, pone el modo nuevo, restablece la ordenación a su default y solicita offset 0. Las opciones dinámicas de país/género se consultan aparte. Las respuestas de resultados/opciones llevan generación e identidad y se descartan si ya no corresponden al modo, filtros o sesión actuales.

Esto aplica a los seis recorridos pedidos: Todos → Mis votos → Mis portadas → Mis comentarios → Favoritos → Pendientes → Todos. `setMode` no guarda páginas anteriores en una caché de UI; volver a un modo produce otra consulta. La prueba de coordinador «A→B→C» verifica que solo se muestran los resultados de C aunque A/B resuelvan tarde. Otra prueba cambia de modo durante paginación de una sesión anterior y comprueba que la página vieja se ignora. La caracterización comprueba que cada modo usa el endpoint con offset 0/limit 20.

**Secuencia visible según código:** las filas y contadores anteriores desaparecen al cambiar modo/criterios; se enciende un spinner y el texto genérico «Cargando discos...» en el sentinel inferior; al llegar la página vigente aparecen los resultados nuevos y el contador; a cero se conserva el `0`. Los comentarios no tienen un skeleton alternativo. No hay retención de tarjetas antiguas ni mezcla de páginas detectada en las pruebas mockeadas. La altura puede contraerse durante una carga inicial porque se quitan inmediatamente las tarjetas; el coordinador no desplaza explícitamente el foco ni la página al inicio. El observer puede solicitar más si el sentinel permanece visible tras una carga.

**No se afirma que se hayan reproducido visualmente los seis cambios.** No había frontend/backend local activo; `.env` apunta al backend de producción, que no se usó. La suite de caracterización y coordinador es evidencia de comportamiento con mocks, no evidencia visual de parpadeo, altura, scroll o velocidad real.

## 4. Cambios de filtros y ordenación

La identidad del resultado incluye modo, búsqueda normalizada, período, país, géneros normalizados, orden, generación de refresh y sesión. Todos los cambios piden nuevamente offset cero. Las opciones de país/géneros se cargan con identidad propia; no incluyen orden ni paginación. La limpieza de exploración actualiza los criterios controlados y también provoca consulta. Los cambios de filtro cruzado pueden reconciliar país/géneros incompatibles después de recibir opciones y producir otra consulta para la selección resultante.

El contador anterior no permanece visible mientras hay filtros pendientes: se oculta junto con las filas. Así no se presenta un total viejo como actual, aunque el usuario tampoco recibe una etiqueta de «actualizando» asociada al contador. Los filtros permanecen seleccionados durante la carga; el error de opciones se separa del error de resultados. Al cambiar de modo se reinicia orden a default del modo; la vista no ofrece select de orden en `comments` ni `pendientes`, y el adaptador solo traduce ordenaciones admitidas.

El error de resultados se muestra como alerta y ofrece «Reintentar» conservando modo y criterios. El reintento incrementa refresh, limpia la lista y vuelve a consultar desde página inicial. Los errores de opciones se mantienen independientes y tienen retry propio.

## 5. Paginación

- Página inicial: `offset=0`, `limit=20`; siguientes offsets: 20, 40, 60… El total lo devuelve el backend y las filas se acumulan en el cliente.
- `hasMore` compara offset de la próxima página contra total. Al resolver una página, el offset avanza 20 incluso si la última página trae menos filas; por ejemplo, total 41 termina con offset 60 tras pedir offset 40. La condición deja de cumplirse y no se solicita una página posterior.
- Solo se evita duplicar una petición de página mientras está en vuelo. La vista confía en el orden estable del servicio. Las filas de comentarios no deben deduplicarse por disco; `entryId` es la clave de cada comentario.
- Cambiar modo, filtro, orden o recibir una mutación aceptada reinicia filas/offset y vuelve a consultar desde cero. La generación evita que una página incremental anterior se añada al conjunto nuevo.
- No se muestra cuántas filas se han acumulado. Por ello `totalItems` puede conocerse mientras aún no se han cargado/representado todas las páginas.

### ¿Mostrar «Mostrando 40 de 127»?

Recomendación: mostrar un resumen de progreso solo cuando exista carga incremental real, por ejemplo «Mostrando 40 de 127 valoraciones» y adaptar la unidad por modo. Es más útil que presentar únicamente «127 discos» porque describe el alcance cargado; sin embargo, debe evitar llamarlo tarjetas visibles cuando hay imágenes ausentes. Para `comments` la unidad debe ser comentarios y el valor acumulado debe ser `userComments.length`. Para los otros modos, se debe decidir si el primer número describe filas de API o tarjetas realmente renderizadas; se recomienda que el mensaje diga «resultados cargados» y que la discrepancia de imagen se explique separadamente, sin ocultar ni excluir los discos.

Complejidad estimada S si se limita a la vista y datos ya disponibles; no requiere endpoint nuevo. Alternativa XS: conservar solo el total server-side y añadir su unidad contextual. No se recomienda presentar el total como «mostrando» ni derivar avance del offset, porque offset avanza por bloques de 20 y puede superar el último total.

## 6. Estados de carga y error

| Estado | Comportamiento actual | Evaluación |
|---|---|---|
| Primera carga | Contadores vacíos; filas vacías; spinner/texto al final de filtros/lista | No muestra falso cero; puede parecer un hueco mientras llega la respuesta |
| Cambio de modo/filtros | Limpia lista, contador y error; mismo indicador genérico | No deja datos obsoletos, pero el total desaparece y la altura se contrae |
| Cambio de orden | Igual que cambio de criterios; reinicia y vuelve a cargar | Correcto semánticamente; el total probablemente no cambia aunque se oculta |
| Paginación | Conserva filas anteriores, usa el mismo spinner/texto «Cargando discos...» | Sin bloqueo de controles; indicador no distingue “más” de “primera carga” |
| Mutación de tarjeta | `refresh()` reinicia resultados y opciones con los criterios vigentes | Refresca elegibilidad; misma contracción que un cambio de filtro |
| Error HTTP de lista | `role="alert"`, mensaje y reintento; total vacío | No se muestra como cero. Si falló una página incremental, las filas acumuladas quedan hasta pulsar retry, que recarga desde cero |
| Error de opciones | Mensaje/retry independiente; resultados conservados | Buena separación; no indica error del listado |
| Sesión caducada | Cliente Axios intenta renovar si la sesión es renovable; si no, termina flujo/redirige a Login. El coordinador limpia resultados al cambio de sesión/logout | Evidencia de código Identity compartido, no recorrido visual de sesión real |
| Resultado cero | Modo muestra contador `0`; comentarios además presentan texto vacío | Cero no es ambiguo. Los cinco grids de tarjetas no muestran un texto de estado vacío específico |

Mejora recomendada: un indicador discreto y persistente junto al resumen de resultados —`aria-busy` en la región y un único `role="status"`/`aria-live="polite"`— que diga «Actualizando resultados» mientras se reemplaza la consulta y que anuncie una sola vez el total nuevo al resolverse. Para páginas adicionales, anunciar «Se cargaron 20 resultados más» solo si aporta orientación y evitar repetir el total por cada render. Mantener el `role="alert"` para errores. Evitar spinner en modo vacío ya resuelto, bloqueo de controles y mensajes anunciados por cada pulsación de búsqueda; anunciar después de que la consulta vigente se estabilice.

## 7. Accesibilidad

- Los seis textos están asociados a radios mediante `<label>`, y el número se incluye en el nombre visible. Sin embargo, los inputs usan `class="hidden"` (`display:none`): no reciben foco de teclado. La selección por ratón funciona, pero el grupo no ofrece una ruta de teclado equivalente por esos radios. Requiere corrección prioritaria conservando la fila y aspecto actuales.
- Los modos no están agrupados bajo `fieldset`/`legend` o `role="radiogroup"`; no se detectó anuncio de cambio de modo.
- El indicador de carga no usa `role="status"`, `aria-live` ni `aria-busy`. Por tanto, el cambio de resultados/contador no tiene anuncio accesible específico. No conviene convertir toda la lista en región live porque leería tarjetas/comentarios largos y anuncios por página serían excesivos.
- El error de listado sí usa `role="alert"`, con acción Retry como botón etiquetado; el estado vacío de comentarios es texto visible no live. El grid sin filas no tiene mensaje vacío.
- El foco se queda en el control activado al cambiar modo; el código no lo mueve. No se observó navegador real ni el foco durante carga.
- No hay transición propuesta en esta auditoría. Si una futura implementación agrega una transición funcional, debe respetar `prefers-reduced-motion` y no retrasar estado/lectura.

## 8. Hallazgos priorizados

Complejidad: XS (< medio día), S (hasta 1–2 días), M (varios componentes/decisión o mayor integración). Archivos afectados son estimaciones; no se editaron.

### P1 — Una parte del total no tiene representación visible

- **Comportamiento actual y evidencia:** backend incluye filas con `image: null` en `totalItems`; el adaptador las hace `image: ""`; `DiscListView.vue` excluye las filas sin imagen con `discs.filter((d) => d.image)`. Puede ocurrir en los cinco modos de tarjetas. Código backend del checkout hermano y tipos del adaptador lo permiten; test de transformación confirma nullable a string vacío, aunque no hay test de vista con discrepancia de total y tarjetas.
- **Impacto UX:** un contador de 127 puede acompañar menos de 127 tarjetas visibles, sin explicar diferencia.
- **Causa probable:** el endpoint cuenta entidades/relaciones y la presentación conserva la política visual heredada de tarjetas con portada.
- **Mejora recomendada:** no cambiar el total ni el backend; hacer visible la discrepancia con un mensaje no intrusivo/contextual o una representación para falta de imagen decidida aparte. Añadir prueba de vista de nulidad y contador como aceptación de una implementación futura.
- **Alternativas:** mantener el total server-side con explicación (recomendada); mostrar recuento de tarjetas visibles separado del total, claramente rotulado; no excluir del servidor ni mutar la semántica.
- **Riesgo funcional:** bajo si solo se aclara; medio si se cambia renderizado de tarjetas, lo que queda fuera de alcance CAT-DISC-4c.
- **Complejidad:** S para explicación + prueba; M para una solución visual de fallback.
- **Archivos potenciales:** `DiscListView.vue`, componente propio de resultados; test de caracterización. Si se decide imagen fallback, también necesita decisión de producto sobre contenido de tarjeta, sin alterar contrato.

### P1 — Radios de modo fuera del orden de teclado

- **Comportamiento actual y evidencia:** cada radio está dentro de un label, pero recibe `class="hidden"`, por tanto se elimina del foco secuencial. Las seis opciones no anuncian cambios de modo.
- **Impacto UX:** una persona que navega con teclado puede no seleccionar ningún modo alternativo.
- **Causa probable:** se ocultó el input visual para construir la apariencia del chip sin reemplazo accesible de radio.
- **Mejora recomendada:** conservar distribución/estilo y exponer un grupo de radios alcanzable con teclado y foco visible; definir grupo semántico y nombre/estado seleccionado, probar flechas/Tab y lector de pantalla.
- **Alternativas:** input visually-hidden con foco estilizado (recomendada); botones con `aria-pressed` y manejo completo de teclado, si la semántica deja de ser radio.
- **Riesgo funcional:** bajo, pero alto de regresión de foco si no se prueba teclado.
- **Complejidad:** S.
- **Archivos potenciales:** `DiscListView.vue`, test de vista/teclado; evitar tocar componentes compartidos.

### P2 — El contador desaparece mientras cambia la consulta sin indicar que está pendiente

- **Comportamiento actual y evidencia:** el cambio de cualquier criterio/orden limpia todos los contadores y la lista; el texto «Cargando discos...» aparece al pie. Pruebas del coordinador cubren reset y cero.
- **Impacto UX:** el usuario no puede saber si el modo/filtro produjo cero, está cargando o perdió momentáneamente el número hasta que ve el spinner distante.
- **Causa probable:** estado de contador único para respuesta confirmada y reset destructivo antes de cargar.
- **Mejora recomendada:** mantener el número anterior oculto o marcado inequívocamente como anterior; mostrar estado pendiente al lado del resumen/contadores y luego el total confirmado. No rotular un número viejo como actual. En primer load, mostrar placeholder/estado, no `0`.
- **Alternativas:** ocultar cifra y mostrar «Actualizando resultados» (más simple y recomendada); conservar cifra atenuada con texto «actualizando» (más continuidad, más riesgo de mala interpretación).
- **Riesgo funcional:** bajo; puede cambiar la percepción de carga pero no consulta ni contrato.
- **Complejidad:** XS/S.
- **Archivos potenciales:** `DiscListView.vue`, `useDiscListCoordinator.ts` solo si hace falta estado explícito, tests de vista/coordinador.

### P2 — Cero sin estado vacío en cinco modos

- **Comportamiento actual y evidencia:** cero se muestra en la etiqueta; `isEmpty` se deriva pero la vista no lo consume para tarjetas. Solo comentarios muestra texto vacío; filtros/resultados no presentan una explicación contextual en el resto de modos.
- **Impacto UX:** la región de resultados queda vacía y depende de que se note el cero en el chip superior; no orienta para quitar criterios ni confirma lista sin coincidencias.
- **Causa probable:** migración de paginación/total dejó el empty state explícito solo para comentarios.
- **Mejora recomendada:** mensaje breve de estado vacío para resultados de tarjetas, distinto de error, que indique que no hay coincidencias y ofrezca limpiar exploración solo si hay filtros activos. No cambiar modos ni ubicación.
- **Alternativas:** cero en total solamente (código actual, menos claro); mensaje contextual (recomendado).
- **Riesgo funcional:** bajo; atención a no mostrar vacío antes de que termine la carga.
- **Complejidad:** XS/S.
- **Archivos potenciales:** `DiscListView.vue`, test de vista.

### P2 — Resumen no indica filas acumuladas y la carga incremental reutiliza texto de primera carga

- **Comportamiento actual y evidencia:** las páginas se acumulan en arrays; el indicador genérico se comparte entre `loadingInitial` y `loadingMore`; no existe texto «cargados de total». El coordinador ignora `currentPage`, `totalPages` y `limit` para la UI, y avanza por PAGE_SIZE 20.
- **Impacto UX:** no se ve cuánto se ha recorrido ni qué significa esperar al final del listado; usuarios de comentarios podrían confundir comentarios y discos.
- **Causa probable:** infinite scroll sin resumen de progreso.
- **Mejora recomendada:** probar un resumen «Mostrando N de T [unidad]» calculado por filas acumuladas y `totalItems`, con modo contextual. Texto de carga incremental distinto («Cargando más…»). Confirmar la definición cuando existan imágenes ausentes y dejar progreso fuera de estado error.
- **Alternativas:** mantener solo total (más compacto, menos orientación); cargar de N a T (recomendado si no satura el listado).
- **Riesgo funcional:** medio si se cuenta lo renderizado en vez de filas; bajo si se define como filas cargadas de API.
- **Complejidad:** S.
- **Archivos potenciales:** `DiscListView.vue`, tests de vista/coordinador; no requiere contrato/backend.

### P2 — Cambios de criterios pueden colapsar altura y perder contexto de scroll

- **Comportamiento actual y evidencia:** el coordinador elimina todas las filas inmediatamente y no hace scroll-to-top ni conserva una altura reservada durante la primera página. El sentinel incremental puede iniciar nuevas páginas si sigue visible tras la carga. No se pudo reproducir en navegador.
- **Impacto UX:** posible salto visual si la persona cambia modo desde abajo del listado; el área queda vacía hasta respuesta y el observer puede solicitar páginas sucesivas para llenar viewport.
- **Causa probable:** reset inmediato combinado con scroll infinito y ausencia de región de carga reservada.
- **Mejora recomendada:** en futura verificación real, comprobar scroll/carga al cambiar criterios desde abajo. Si se confirma, volver de forma discreta al encabezado de resultados o anclarlo sin mover foco y separar indicator de primera carga de carga incremental. No añadir animación decorativa.
- **Alternativas:** conservar filas anteriores con marca «actualizando» (riesgo de parecer criterios actuales); limpiar y anunciar/reubicar foco/scroll (recomendada solo si el salto se reproduce).
- **Riesgo funcional:** medio, puede reactivar `IntersectionObserver` y alterar la cantidad de páginas solicitadas.
- **Complejidad:** S.
- **Archivos potenciales:** `DiscListView.vue`, tests de vista/coordinador si se decide interacción.

### P3 — Formato de enteros no agrupa millares

- **Comportamiento actual y evidencia:** interpolación numérica directa, sin `Intl.NumberFormat`; mismo formato para todos los modos.
- **Impacto UX:** números grandes son algo más difíciles de leer en español.
- **Causa probable:** se muestra el entero del API directamente.
- **Mejora recomendada:** aplicar formato español (`Intl.NumberFormat("es-ES")`) únicamente a valores confirmados; probar cero y casos con millares.
- **Alternativas:** formato actual, válido y uniforme para cifras pequeñas; locale español para crecimiento.
- **Riesgo funcional:** muy bajo, solo presentación.
- **Complejidad:** XS.
- **Archivos potenciales:** `DiscListView.vue`, test de formato.

## 9. Riesgos y dependencias

- Cualquier etiqueta/resumen debe preservar la unidad del modo y el hecho de que el total ya refleja búsqueda, fechas, país, géneros y eligibility.
- No deduplicar comentarios ni relaciones sin semántica explícita; usar `entryId` para filas de comentarios.
- No cambiar DTO, filtros, elegibilidad, tamaño 20, sort backend ni conteo del servidor dentro de esta propuesta.
- La explicación de filas sin imagen necesita decidir cómo informar sin redefinir qué es un disco y sin invadir el rediseño de `DiscCardComponent`.
- El resumen de paginación debe basarse en filas realmente acumuladas y aclarar relación con tarjetas renderizadas.
- La solución de modos accesibles debe conservar la fila actual, contraste y foco claro/oscuro; validar con teclado/lector y movimiento reducido solo si se introduce movimiento.
- `401`/sesión renovable dependen del cliente Axios y de Identity compartido; no se modificaron ni verificaron sus pantallas en navegador.

## 10. Plan de implementación pequeño (pendiente de aprobación)

1. **4c.1 — Accesibilidad de modos (S):** radio-group navegable, foco visible y anuncio de selección; tests de teclado/semántica. Conservar una fila, dimensiones, colores y estilo de botones.
2. **4c.2 — Estados de resultados (S):** estado pendiente junto al resultado; carga inicial/incremental diferenciadas; mensaje vacío para modos de tarjeta; error separado y reintento conservado. Añadir tests de cero/error/retry y anunciar solo cambios asentados.
3. **4c.3 — Semántica visible de cifras (S):** unidad por modo y formato local; documentar que criterios activos modifican `totalItems`; resumen total/progreso optativo con cálculo de filas por modo.
4. **4c.4 — Discos sin imagen (S/M):** elegir mensaje o fallback de presentación sin excluir entidades/cambiar backend; test de diferencia entre total y tarjetas. Mantener DiscCard compartida fuera de alcance sin una propuesta nueva.
5. **4c.5 — Reproducción navegador (S):** preparar backend/prueba local autenticada y recorrer seis modos, A→B→C, back, filtros, mutación, cero y carga desde abajo; ambos temas. Registrar scroll/altura/estados. No se considera suplido por tests mock.
6. **4c.6 — Cierre documental/validación (XS):** tests focales, typecheck por Vue/TS; build solo si lo requiere el alcance; markdown links y diff check. Registrar local frente a CI.

No se inicia CAT-DISC-4d, CAT-DISC-4e, CAT-DISC-6 ni implementación de estos pasos con esta auditoría.

## 11. Recomendación final

Resolver primero la accesibilidad de los radios y la discrepancia total/filas visibles. Después acordar labels/unidades y una forma cercana de distinguir actualización, vacío y carga incremental. El mensaje «Mostrando N de T» aporta valor para listas largas si se define `N` como filas acumuladas, no tarjetas visibles. Mantener los conteos server-side por filtro y modo, no deduplicar comentarios y no modificar contratos. No se recomienda retener un número viejo sin señal inequívoca, mostrar cero antes de respuesta, cambiar la fila de modos, cambiar colores/tamaños, tocar búsqueda/filtros/tarjetas o agregar movimiento ornamental.

## 12. Evidencia y límites de la auditoría

- Inspeccionados: `DiscListView.vue`, `useDiscListCoordinator.ts`, `loadDiscList.ts`, `api/discList.ts`, tipos, tests de vista/coordinador/adaptador; DTOs, servicio, tipos, mappers y readers del checkout hermano de backend.
- Pruebas locales mockeadas observadas: suite de vista (13), coordinador (20), adaptación (9), API (10) aparecen aprobadas. Una invocación prevista como focal terminó ejecutando la suite completa porque el script `pnpm test --` reenvió `--` a Vitest: **105 archivos pasaron, 1 falló; 777 tests pasaron, 1 falló**. El fallo fue `DashboardLatestVotesWidget.test.ts`, espera `8,2` y recibió `8,15`, ajeno a DiscList y registrado históricamente. No se atribuye como regresión CAT-DISC-4c. La ejecución informó que pnpm no pudo verificar/reinstalar dependencias por ausencia de TTY; Vitest corrió con node_modules local.
- `node scripts/check-markdown-links.mjs report` encontró 1 enlace fuera del repositorio preexistente (`roadmap/roles.md:9` hacia `../../spammusic-back/roadmap/roles-frontend-contract.md`); no reportó enlaces rotos nuevos. `git diff --check` sin configuración reporta tres líneas de `src/components/DiscFilters.vue` con CRLF en cambios locales previos; `git -c core.whitespace=cr-at-eol diff --check` y la comprobación del informe Markdown nuevo pasan.
- No se ejecutó build ni suite backend/CI; no eran necesarios para una auditoría documental/de código.
- No había frontend/backend local activo; `.env` contiene URL de producción. No se accedió a producción ni se realizaron mutaciones/datos reales.
- No se usó navegador integrado/harness visual; por tanto no se declaran verificados visualmente los transitorios, altura, scroll, claro/oscuro, foco ni comportamiento real de expiración de sesión.
- El estado inicial y transiciones descritos son conclusiones de inspección de código y pruebas mockeadas, no afirmaciones de recorrido real.
