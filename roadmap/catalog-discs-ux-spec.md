# CAT-DISC-4a — Especificación UX/UI de filtros de Discos

**Estado:** CAT-DISC-4a aprobada por el usuario. CAT-DISC-4b implementada y verificada localmente en búsqueda y exploración. La auditoría CAT-DISC-4c está completada y documentada en [su informe](catalog-discs-counters-transitions-audit.md); la implementación queda pendiente de decisión. CAT-DISC-4d–4e y filtros guardados siguen pendientes. La distribución actual de los seis modos en una sola fila debe conservarse.
**Ruta cubierta:** `/disc-list` — `src/modules/catalog/discs/presentation/views/DiscListView.vue`.
**Base técnica:** CAT-DISC-3g, `useDiscListCoordinator`, `GET /api/discs/list` y `/api/discs/list/options`.

Esta especificación resuelve la composición y las interacciones de la cabecera de Discos. La dirección conceptual **Buscar → Explorar catálogo → Mi biblioteca → Resultados y ordenación** y la composición sin títulos visibles de sección están aprobadas. CAT-DISC-4b se inspeccionó en la ruta integrada en los tamaños indicados; el harness aislado complementó estados con varios géneros seleccionados.

## 1. Diagnóstico UX

La lectura estática de `DiscListView.vue`, `DiscFilters.vue`, `DiscListGenreSelect.vue`, `SearchableSelect.vue`, `SimpleSelect.vue` y `useDiscListCoordinator.ts` encontró:

- Búsqueda, periodo, país, géneros, seis modos y orden se presentan cerca y con pesos visuales parecidos. No hay títulos de grupo que expliquen sus propósitos.
- La cabecera actual no separa con claridad la exploración de todo el catálogo de las cinco vistas que muestran actividad personal.
- La búsqueda depende del placeholder y no tiene una etiqueta visible asociada.
- La selección de géneros puede mostrar cada nombre en el botón disparador. Con varias selecciones, el resumen crece en altura; el menú ya incluye búsqueda, selección múltiple, teclado y OR.
- Los criterios activos no se resumen en una región común ni se ofrecen acciones separadas para limpiar un criterio, filtros exploratorios o toda la vista.
- La grilla no muestra un estado vacío o un error explícito. La lista de comentarios sí tiene un mensaje vacío propio.
- Hay carga inicial e incremental, pero la vista solo comunica «Cargando discos...»; los resultados y el cambio de carga no se anuncian en una región dedicada.
- `DiscFilters` es compartido por TopDiscs, calendarios, DiscByDate, DiscListError y otras superficies. `SearchableSelect` también tiene consumidores transversales; un cambio general de estilos o comportamiento podría extenderse fuera de Discos.
- El coordinador mantiene los criterios de consulta. Sin embargo, `DiscFilters` conserva estado local de búsqueda/fecha y el `selectedWeek` recibido no controla la selección interna. La composición nueva debe derivar su presentación del criterio canónico y emitir cambios, sin una segunda copia de filtros.

Estos son hallazgos del código y su estructura. La sobrecarga percibida y la facilidad de descubrimiento son hipótesis de diseño razonables ante la cantidad de controles, no problemas cuantificados con pruebas de usuarios. El layout, contraste y foco no se capturaron ni midieron en navegador en CAT-DISC-4a.

## 2. Principios y objetivo visual

La página funciona en modo **Operate**: el usuario localiza discos, explora el catálogo o revisa su actividad y llega a una lista de resultados. La mejora debe favorecer escaneo y controles previsibles; la personalidad musical permanece en los acentos existentes de Riff Valley, sin añadir una identidad paralela.

1. **Divulgación progresiva con acceso visible.** Buscar y seleccionar modo quedan a la vista. En escritorio, filtros de exploración se muestran agrupados; en móvil se pueden plegar detrás de una acción explícita con conteo de filtros activos.
2. **Jerarquía por intención.** Búsqueda tiene el primer nivel; explorar y biblioteca son grupos diferenciados; resultados, orden y acciones de limpieza son una barra de lectura más ligera.
3. **Reconocimiento.** Cada criterio aplicado se puede identificar en el control y en un resumen derivado del estado del coordinador.
4. **Control y reversibilidad.** Cada selección se actualiza de inmediato según el comportamiento existente; hay limpieza individual y agrupada con nombres distintos.
5. **Compatibilidad visual.** Reutilizar paleta, tipografía, superficies, foco y pares claro/oscuro documentados en [sistema de diseño](../docs/design-system.md). Preferir espacio, separación tipográfica y bordes discretos a más color o sombras.
6. **Accesibilidad de interacción.** No depender de hover o color. Etiquetas y selección comunicadas por semántica, foco visible y áreas táctiles suficientes.

La base técnica de estos principios procede de los criterios de usabilidad indicados en la solicitud y de la guía del proyecto. No se afirma que WCAG 2.2 AA esté satisfecha: eso requiere mediciones y pruebas posteriores.

## 3. Arquitectura de información

Orden de lectura y tabulación de la zona superior:

1. **Buscar** — una entrada para discos y artistas.
2. **Explorar catálogo** — fecha, país y géneros; el resumen de filtros aplicados aparece bajo el grupo.
3. **Mi biblioteca** — seis opciones excluyentes, con «Todos» como vista general visualmente separada de las cinco vistas personales, pero al mismo nivel de acceso.
4. **Resultados y ordenación** — total para la consulta actual, estado de carga, orden permitido para el modo y acción contextual de restablecimiento.
5. **Contenido** — grid o comentarios, estado vacío/error/carga y paginación incremental existente.

La jerarquía no implica cambiar la elegibilidad de los seis modos ni las combinaciones del backend. Una selección de modo o filtro actualiza la consulta mediante `useDiscListCoordinator`; no se añade un botón «Aplicar» ni una copia temporal de criterios.

## 4. Alternativas evaluadas

| Criterio          | A — Bloques siempre visibles                                                                  | B — Exploración progresiva                                                                | Combinación recomendada                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Organización      | Buscar, explorar, biblioteca y resultados siempre expuestos en secciones.                     | Buscar y modos visibles; periodo, país y géneros dentro de un panel desplegable.          | A en escritorio/tablet; B solo para el bloque de exploración en móvil, con acceso y resumen persistente.     |
| Ventaja           | Descubrimiento inmediato y criterios visibles; funciona bien para comparar y ajustar filtros. | Reduce altura inicial y deja la búsqueda y los resultados más cerca en móvil.             | Mantiene descubribilidad donde hay espacio y reduce scroll inicial en 390 px.                                |
| Inconveniente     | Ocupa más altura, sobre todo en móvil.                                                        | Un control oculto puede pasar inadvertido y requiere conservar un resumen visible.        | Dos presentaciones responsive que deben compartir la misma fuente de estado y semántica.                     |
| Densidad estimada | Media en escritorio, alta en móvil.                                                           | Baja cerrada, media al abrir.                                                             | Media en escritorio/tablet; baja inicial en móvil.                                                           |
| Facilidad de uso  | Alta para exploración frecuente y reconocimiento.                                             | Alta para búsquedas ocasionales; menor descubribilidad sin indicación de filtros activos. | Equilibra acceso rápido y densidad siempre que el botón móvil indique el número de filtros activos.          |
| Accesibilidad     | Flujo lineal sencillo; más tabulaciones.                                                      | Disclosure requiere estado expandido anunciado y foco/orden correctos.                    | Patrón nativo de disclosure con controles reales; nunca basado en hover ni solo icono.                       |
| Complejidad       | Baja-media.                                                                                   | Media.                                                                                    | Media. Requiere responsive real, no duplicar componentes montados ni estado.                                 |
| Riesgo compartido | Bajo si la composición se mantiene dentro de `modules/catalog/discs`.                         | Bajo-medio; aumenta si se altera `DiscFilters` o `SearchableSelect` global.               | Bajo al reutilizar controles de presentación con alcance local y mantener intactos los defaults compartidos. |

**Recomendación:** combinación A/B. En 1024 px o más, mostrar Buscar y los filtros de exploración en una superficie local compacta, seguida de biblioteca y resultados. A 768 px se mantienen los filtros visibles y refluye la cuadrícula de controles. En móvil se muestran búsqueda, biblioteca, resumen de filtros aplicados y resultados; un botón «Filtros» abre/cierra el bloque de exploración. El estado cerrado no oculta la existencia de criterios activos ni ofrece una falsa impresión de listado sin filtros.

## 5. Wireframes de referencia

Son esquemas de contenido, no capturas ni una representación de la interfaz implementada. Los valores «128», «Noruega», «2025» y «4 géneros» son ejemplos para explicar la composición, no datos observados.

### Escritorio amplio — 1440 px o más

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Discos                                                                     │
│ Buscar discos y artistas                                                   │
│ [ 🔍 Buscar álbum o artista…                                      ][ × ]   │
├─ EXPLORAR CATÁLOGO ────────────────────────────────────────────────────────┤
│ Año [Todos los años ▾]  Mes [Todos ▾]  Periodo [Todos ▾]                   │
│ País [Todos los países ▾]  Géneros [Todos los géneros ▾]                    │
│ Activos: 2025 ×   Noruega ×   4 géneros ×        Limpiar exploración        │
├─ MI BIBLIOTECA ────────────────────────────────────────────────────────────┤
│ [Todos] │ [Mis votos] [Mis portadas] [Mis comentarios] [Favoritos] [Pend.] │
├────────────────────────────────────────────────────────────────────────────┤
│ 128 resultados                                             Ordenar [Más…] │
│                                                                            │
│                         Lista de resultados                               │
└────────────────────────────────────────────────────────────────────────────┘
```

### Escritorio compacto — 1024 px

```text
┌──────────────────────────────────────────────────────┐
│ Discos                                               │
│ Buscar discos y artistas                            │
│ [ Buscar álbum o artista…                     ][×]  │
├─ EXPLORAR CATÁLOGO ─────────────────────────────────┤
│ Año [Todos ▾]   Mes [Todos ▾]   Periodo [Todos ▾]    │
│ País [Todos los países ▾]    Géneros [4 géneros ▾]  │
│ Activos: Noruega × · 4 géneros ×  Limpiar exploración│
├─ MI BIBLIOTECA ─────────────────────────────────────┤
│ [Todos] [Mis votos] [Mis portadas]                   │
│ [Mis comentarios] [Favoritos] [Pendientes]           │
├──────────────────────────────────────────────────────┤
│ 128 resultados                          Ordenar [▾] │
└──────────────────────────────────────────────────────┘
```

### Tablet — 768 px

```text
┌──────────────────────────────────────────────────────┐
│ Discos                                               │
│ Buscar discos y artistas                            │
│ [ Buscar álbum o artista…                     ][×]  │
├─ EXPLORAR CATÁLOGO ─────────────────────────────────┤
│ Año [Todos ▾]          Mes [Todos ▾]                 │
│ Periodo [Todos ▾]      País [Todos ▾]               │
│ Géneros [4 géneros seleccionados ▾]                  │
│ Activos: Noruega × · 4 géneros ×                    │
├─ MI BIBLIOTECA ─────────────────────────────────────┤
│ [Todos] [Mis votos] [Mis portadas]                   │
│ [Mis comentarios] [Favoritos] [Pendientes]           │
├──────────────────────────────────────────────────────┤
│ 128 resultados                          Ordenar [▾] │
└──────────────────────────────────────────────────────┘
```

### Móvil — 390 px

```text
┌───────────────────────────────────┐
│ Discos                            │
│ Buscar discos y artistas          │
│ [ Buscar álbum o artista…     [×]]│
│ [▾ Filtros · 3 activos]           │
│ Noruega ×   4 géneros ×           │
│ (Si se abre:)                      │
│ Año [Todos ▾]                     │
│ Mes [Todos ▾]                     │
│ Periodo [Todos ▾]                 │
│ País [Noruega ▾]                  │
│ Géneros [4 géneros ▾]             │
├─ MI BIBLIOTECA ───────────────────┤
│ [Todos]       [Mis votos]         │
│ [Mis portadas] [Mis comentarios]  │
│ [Favoritos]   [Pendientes]        │
├───────────────────────────────────┤
│ 128 resultados                   │
│ Ordenar por [Más recientes ▾]     │
└───────────────────────────────────┘
```

El botón de filtros aparece entre búsqueda y biblioteca para que sea localizable sin competir con la búsqueda. Se recomienda mantener el resumen de chips visibles con el panel cerrado. Evitar un panel lateral modal para esta cantidad de controles: añade gestión de foco y una acción de aplicación que contradice la actualización inmediata actual.

## 6. Comportamiento de los bloques

### 6.1 Buscar

- Etiqueta visible «Buscar discos y artistas» asociada programáticamente al input. Placeholder: «Buscar discos o artistas…».
- Campo de ancho completo de la columna de contenido; el límite lo da el contenedor, no una anchura fija pequeña. Es el control de mayor anchura y protagonismo.
- Icono de búsqueda decorativo al inicio. Botón de limpiar solo cuando hay texto, con nombre accesible «Limpiar búsqueda», área táctil mínima 44 × 44 CSS px y foco visible.
- Al escribir se conserva el comportamiento de actualización actual (consulta con debounce inexistente en CAT-DISC-3g); esta especificación no cambia la semántica, ni añade debounce/backend.
- El campo vacío no muestra estado activo; con texto, el valor visible basta y el resumen de filtros puede mostrar una pastilla derivada con opción de retirar búsqueda.
- En móvil permanece a ancho completo antes del disclosure de filtros. Nunca se sustituye por un icono que oculte el campo.

### 6.2 Explorar catálogo

Sección con título «Explorar catálogo», sin tarjeta pesada adicional. Orden de controles: **Año → Mes → Periodo → País → Géneros**. La relación temporal es jerárquica: mes solo cuando el año lo permite; periodo semanal solo cuando se ha elegido mes/año. «Todos los años» desactiva los selectores dependientes. No añadir flechas anterior/siguiente: el control actual selecciona año, mes y semana desde opciones y no se ha verificado una necesidad o contrato para navegación secuencial.

- **Año:** opciones existentes, incluidas «Todos los años». La selección y el rango vigente se reflejan en UI desde los criterios del coordinador. El default anual existente (incluida preferencia local) se conserva.
- **Mes:** visible según el año seleccionado; «Año completo» corresponde a no restringir a un mes.
- **Periodo:** conserva las semanas viernes–jueves, rango mensual y reglas existentes; su nombre visible debe distinguir «Semana»/«Periodo» del campo Mes.
- **País:** selección única y opciones dinámicas. «Todos los países» limpia el país sin alterar el resto de criterios salvo las reconciliaciones de opciones ya definidas por el coordinador.
- Al modificar un filtro se conserva la actualización inmediata y el comportamiento de filtros cruzados actual. No se debe copiar ni reimplementar esa reconciliación dentro del componente visual.

#### Selector múltiple de géneros

- Cerrado y sin selecciones: mostrar «Géneros» o «Todos los géneros»; botón con etiqueta estable «Filtrar por géneros» y estado accesible resumido.
- Una selección: mostrar el nombre del género en línea si cabe; varias selecciones: mostrar un resumen compacto «4 géneros» (umbral recomendado: 2 o más) y, opcionalmente, un máximo de dos chips pequeños si el ancho es suficiente. No renderizar una fila ilimitada de chips dentro del disparador.
- Las selecciones completas se representan en el resumen de filtros activos: si son numerosas, un chip agrupado «4 géneros» abre el mismo selector; no se duplican controles.
- Abierto: campo «Buscar géneros», lista desplazable con altura limitada, opciones con estado seleccionado y checkbox visual/no solo color, contador «4 seleccionados» y aclaración breve «Cualquier género coincide» (OR). La aclaración debe ser ayuda textual asociada o descripción del grupo, no una frase que se anuncie repetidamente por cada tecla.
- Las opciones siguen viniendo de `/api/discs/list/options` y pueden cambiar con filtros cruzados. Actualizar opciones no limpia una selección válida sin la reconciliación ya aprobada en coordinador.
- Selección/deselección inmediata; sin botón «Aplicar». Ofrecer «Limpiar géneros» dentro del selector solo cuando haya selección.
- Lista larga: conservar scroll interno y búsqueda por nombre; mantener visible el campo de búsqueda al desplazar opciones. No establecer virtualización ni límite de opciones nuevo sin perfilado.
- Sin coincidencias de búsqueda: «No hay géneros que coincidan con “…”» y opción clara de borrar el término. Si el endpoint no ofrece opciones: distinguir carga/error, permitir reintentar en el mensaje de error existente y no presentarlo como cero resultados.
- Accesibilidad: trigger con nombre estable, número de seleccionados y `aria-expanded`; listbox con `aria-multiselectable=true`, opciones con `aria-selected`, flechas para recorrer, espacio/intro para alternar, Escape para cerrar y retorno de foco al trigger. El input de búsqueda es alcanzable al abrir; foco visible y regiones de estado sin anuncios redundantes. La implementación actual ya aporta buena parte de este patrón, debe verificarse integrado y corregirse dentro de Discos si fuese necesario.

### 6.3 Filtros activos y acciones de limpieza

La fila «Activos» se deriva exclusivamente de `searchQuery`, `selectedWeek`, `selectedCountry` y `selectedGenres` del coordinador; modo y orden no se duplican ahí. Los nombres se resuelven desde opciones actuales con fallback legible si una opción seleccionada ya no está disponible. Cada chip tiene botón de cierre con nombre «Quitar [criterio]» y área táctil adecuada. «4 géneros» retira todos los géneros de una sola acción o abre el selector (decisión de implementación recomendada: permitir retirar el grupo con botón de cierre y editar miembros abriendo el selector).

| Acción visible      | Alcance                                                                                                                                | Conserva                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Limpiar búsqueda    | Solo query de texto. Equivale al botón × del input.                                                                                    | Fecha, país, géneros, modo y orden. |
| Quitar este filtro  | Solo el criterio del chip: fecha, país o género(s).                                                                                    | Los demás criterios.                |
| Limpiar exploración | Búsqueda, año/periodo, país y géneros; vacía el conjunto exploratorio completo. Mantiene modo de biblioteca y orden.                   | Modo y orden actuales.              |
| Restablecer vista   | Vuelve al modo «Todos», quita búsqueda, país y géneros, restaura la fecha predeterminada existente y el orden predeterminado del modo. | Nada de la consulta anterior.       |

«Limpiar exploración» solo se muestra si existe al menos un criterio exploratorio. «Restablecer vista» es acción secundaria de resultados, disponible cuando la vista difiere de su estado inicial, con nombre y confirmación visual claros; no debe parecer un botón principal. El reset completo se recomienda como comportamiento producto, pero depende de definir el default de fecha mediante la política existente `rv_default_year_filter`. CAT-DISC-4b no debe crear una nueva política de persistencia. Las acciones se implementan llamando setters/acciones del coordinador, no mutando controles locales ni montando una segunda fuente de verdad.

### 6.4 Mi biblioteca

Sección rotulada «Mi biblioteca» con selección exclusiva de seis modos. Recomendación: controles tipo radio visibles dentro de `fieldset`/`legend` o equivalente nativo, presentados visualmente como segmentos; no usar tabs ARIA salvo que también se implementen las reglas de foco y paneles de tabs.

| Valor actual | Etiqueta visible |
| ------------ | ---------------- |
| `all`        | Todos            |
| `rates`      | Mis votos        |
| `covers`     | Mis portadas     |
| `comments`   | Mis comentarios  |
| `favorites`  | Favoritos        |
| `pendientes` | Pendientes       |

«Todos» es la vista general del catálogo y se separa con un divisor/espacio del grupo personal, sin perder tamaño táctil ni acceso. Mantener los cinco modos personales expuestos; no esconderlos en menú. Se permite incluir contadores únicamente si el total del modo ya está resuelto; no usar colores arbitrarios distintos por cada modo. Estado seleccionado se distingue mediante fondo/borde y señal semántica nativa, no solo color. En escritorio los seis caben en una línea si el contenedor lo permite; a 1024/768 refluye; en 390 usar dos columnas y tres filas para que las seis etiquetas estén visibles sin scroll horizontal.

El cambio de modo sigue usando `setMode` y reinicia/consulta según comportamiento actual, sin alterar elegibilidad. La presentación debe indicar con texto accesible cuál es el modo seleccionado. Si algún modo requiere autenticación ya resuelta por la ruta, no se cambia aquí su contrato ni se oculta.

### 6.5 Resultados y ordenación

Barra liviana inmediatamente antes del contenido:

- Total con texto pluralizado («1 resultado», «128 resultados»), derivado del total actual del coordinador. Mientras llega la carga inicial, anunciar «Cargando resultados»; durante paginación, diferenciar «Cargando más discos».
- Selector «Ordenar por» con nombre accesible; conservar solo los valores que el cliente ya presenta y el adaptador transforma a enums/eligibility válidos del backend.
- Orden visible por modo: `all` permite recientes, antiguos, nota media asc/desc y pendientes de votar (nota/portada); `rates` recientes, antiguos, mi voto asc/desc; `covers` recientes, antiguos, mi portada asc/desc; `favorites` recientes, antiguos, voto y portada; `comments` y `pendientes` no muestran control de orden en la vista actual. No ofrecer nuevos modos de orden ni exponer un control deshabilitado para estos últimos.
- El selector se alinea a la derecha en escritorio y ocupa ancho disponible en móvil. Tiene peso tipográfico secundario frente a búsqueda y modo.
- La fila de chips activos permanece asociada a «Explorar», arriba de biblioteca; los resultados no repiten la lista, pero su total responde a esos filtros.
- El scroll infinito existente conserva su comportamiento. La carga de página siguiente se comunica sin reemplazar el contenido ya cargado.

### 6.6 Vacío, error y carga

- **Vacío por criterios:** mensaje amable «No encontramos discos con estos criterios». Mostrar búsqueda/filtros relevantes y acciones de retirar un chip o «Limpiar exploración». No usar iconografía de fallo ni color de error.
- **Modo personal vacío:** copy propio, por ejemplo «Todavía no tienes discos en Favoritos» o «Aún no has escrito comentarios», sin sugerir que el servicio falló. Conservar el criterio de búsqueda y permitir limpiarlo.
- **Sin más páginas:** no mostrar el estado vacío una vez que ya hay resultados cargados. El total indica el conjunto completo y el loader incremental desaparece al terminar.
- **Carga inicial:** estado de carga visible y textual, asociado a una región `aria-live="polite"`/`role="status"`; no anunciar cada cambio de página como nueva carga inicial.
- **Error de resultados:** diferenciarlo del vacío; texto «No se pudieron cargar los resultados» y botón «Reintentar». No borrar criterios ni cambiar modo.
- **Error de opciones:** mensaje junto a Explorar («No se pudieron cargar los filtros») con reintento; no confundir con el listado vacío ni con error de resultados.
- Acordar antes de implementación qué significa el total si la API devuelve discos sin imagen y el grid actual los omite. No ajustar el contador visual para ocultar esa posible divergencia.

## 7. Responsive

| Viewport de referencia | Composición propuesta                                                                                                                                                                                                                           | Riesgos y tratamiento                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1440 px o superior     | Contenedor centrado con ancho de lectura actual. Búsqueda completa. Exploración en una superficie plana, con controles temporales en una fila y país/géneros en otra. Chips activos debajo. Biblioteca en una hilera. Total/orden en una barra. | No convertir cada grupo en tarjeta elevada. Mantener espacio y jerarquía, sin dejar controles demasiado separados del grupo.                                 |
| 1024 px                | Búsqueda completa; controles de fecha en una fila compacta, país y géneros en otra. Biblioteca puede envolver a dos filas. Resultados y orden alineados.                                                                                        | Etiquetas y valores largos pueden estrechar selects. Permitir wrapping y min-width cero; nunca elipsis que esconda el estado seleccionado.                   |
| 768 px                 | A/B según ancho disponible: filtros visibles en disposición 2 columnas, géneros a ancho completo. Modos en 2 filas con las seis opciones a la vista. Barra de resultados con total y orden en columnas o wrap.                                  | No fijar tres columnas si obliga a truncar «Mis comentarios». No depender de hover para descubrir acciones.                                                  |
| 390 px                 | Input a ancho completo; botón disclosure «Filtros» con conteo; chips activos visibles incluso cerrado; panel expandido en una columna salvo pares de selects que tengan espacio real. Biblioteca dos columnas/3 filas. Total y orden apilados.  | El panel abierto no debe empujar el contenido de manera confusa ni tapar el foco. No usar drawer modal. Evitar scroll horizontal y menús fuera del viewport. |

Umbral inicial recomendado para cambiar entre filtros abiertos y disclosure: breakpoint móvil del proyecto, a validar visualmente durante CAT-DISC-4d; no fijar un breakpoint nuevo global. El disclosure expone `aria-expanded` y `aria-controls`, mantiene selección al cerrar y no roba foco al cerrarse. Respetar `prefers-reduced-motion`; cualquier expansión puede ser inmediata o con transición breve no esencial.

## 8. Identidad visual

- Mantener acentos `rv-pink`, `rv-purple`, `rv-blue` y superficies existentes del sistema, con pares claros/oscuros. El acento debe identificar foco/selección prioritaria, no colorear los seis modos de seis maneras distintas.
- Usar superficie de fondo y borde del patrón local existente; separar grupos con título, espacio y divisor suave. Evitar paneles anidados, sombras grandes y repetición de contenedores.
- Título «Discos» conserva el icono musical de la página. La calidez viene del espaciado, la escala tipográfica y el ritmo; no se añaden ilustraciones, degradados ni colores nuevos.
- Transiciones discretas solo para disclosure/feedback, y siempre respetando movimiento reducido. No animar cada pill al hover.
- Verificar claro y oscuro: el tema depende de `.dark`, no exclusivamente del tema del sistema.

## 9. Accesibilidad — requisitos de implementación

1. Labels visibles asociados con inputs de búsqueda, selects y búsqueda interna de géneros; placeholder es apoyo, no etiqueta.
2. Nombre accesible específico para cada botón de limpiar, disclosure, reintento, selección individual y restablecimiento. Los iconos decorativos se ocultan a tecnología asistiva.
3. Orden DOM igual al orden de lectura: búsqueda → explorar → biblioteca → resultados → contenido. No crear orden visual por CSS que difiera de tabulación.
4. Teclado completo: Tab/Shift+Tab por controles, flechas y espacio en selección múltiple, Escape y retorno de foco al cerrar popup; radios de modo operables con patrón nativo; disclosure con Enter/Espacio.
5. Foco visible en claro y oscuro; selección con forma/texto/borde además de color. Los resultados de búsqueda de géneros vacíos y los errores se exponen como estados sin interrupciones innecesarias.
6. Contadores de selección y resultados tienen anuncios polidos y no se actualizan palabra por palabra al teclear si causan ruido. Error vigente/reintento puede ser `role="alert"` si interrumpe la tarea; carga y actualización usan `role="status"`.
7. Contraste de texto normal y controles según WCAG 2.2 AA (4.5:1 texto normal, 3:1 texto grande y componentes/gráficos relevantes). Medir sobre colores finales en ambos temas; este documento no certifica valores.
8. Objetivos táctiles recomendados de al menos 44 × 44 CSS px; comprobar foco no tapado, zoom 200 %, contenido reflow a 320 CSS px y ausencia de dependencia hover conforme a WCAG 2.2 AA.
9. `aria-pressed` solo para botones toggle; radios nativos para modos; listbox multiselección para géneros. No marcar todos los patrones a la vez ni usar `role=tab` sin paneles asociados.
10. Si cambia el resultado por filtro, anunciar el nuevo total de forma no intrusiva. No mover foco al listado al filtrar.

Se deben medir y probar estos requisitos; su inclusión no equivale a una declaración de conformidad.

## 10. Estados de interfaz y criterios activos

| Situación                        | Presentación requerida                                                                           | Acción de recuperación                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Sin filtros                      | No mostrar fila vacía de chips ni botón de limpieza de exploración.                              | Buscar o explorar.                                        |
| Filtros activos con resultados   | Chips legibles y total correspondiente a consulta vigente.                                       | Quitar criterio, limpiar exploración o restablecer vista. |
| Opciones de país/género cargando | Indicador textual junto al control; evitar falso «sin opciones».                                 | Esperar; la búsqueda/listado sigue independiente.         |
| Opciones fallidas                | Error de opciones diferenciado, conservar criterios y acceso a reintento.                        | Reintentar opciones.                                      |
| Carga inicial de resultados      | Mensaje/spinner anunciado y zona de contenido reservada.                                         | No alterar criterios automáticamente.                     |
| Carga incremental                | Conservar resultados y anunciar «Cargando más…».                                                 | Continúa el scroll/paginación actual.                     |
| Listado sin coincidencias        | Estado vacío contextual, no error.                                                               | Quitar criterios y/o limpiar exploración.                 |
| Fallo de listado                 | Mensaje de error separado de vacío.                                                              | Reintentar manteniendo criterios.                         |
| Selección de muchos géneros      | Resumen compacto y conteo.                                                                       | Editar en el selector o retirar el conjunto.              |
| Consulta antigua aún pendiente   | Solo estado de la identidad vigente puede actualizar la vista, según generación del coordinador. | No se añade lógica de concurrencia en la presentación.    |

## 11. Componentes e integración

| Pieza                            | Uso actual y consumidores                                                                                     | Decisión para el rediseño                                                                                                                                                                                | Alcance potencial                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `DiscListView.vue`               | Composition root de `/disc-list`; posee modos, resultados y composición.                                      | Coordina los cuatro bloques; presentación y etiquetas locales; mantiene observers y tarjeta sin cambios.                                                                                                 | Cambios de composición local.                                              |
| `useDiscListCoordinator`         | Fuente de verdad de filtros, opciones, resultados, carga/error, totales, modo y orden; aislamiento de sesión. | Continuará siendo la fuente canónica. Añadir/resetear acciones solo si faltan y se aprueba alcance, con tests de combinación y filtros cruzados.                                                         | Aplicación y pruebas de Discos; no API backend.                            |
| `DiscFilters.vue`                | Compartido por TopDiscs, calendarios, DiscByDate y DiscListError, con flags/layouts diferentes.               | No reordenarlo ni cambiar defaults. CAT-DISC puede dejar de usarlo para la nueva composición si la API actual no expresa esta jerarquía; preservar sus consumidores.                                     | Cualquier cambio actual afecta varios owners/vistas; riesgo alto.          |
| `DiscListGenreSelect.vue`        | Específico de Discos; busca y selecciona múltiples géneros.                                                   | Mantenerlo como control propio; compactar resumen cerrado y robustecer estados/nombres/teclado dentro del owner.                                                                                         | Bajo, limitado a Discos.                                                   |
| `SearchableSelect.vue`           | Select genérico transversal (países, calendarios, importación, artistas, playlists y otros).                  | Reutilizar únicamente si su contrato visual/semántico cubre el uso; preferir wrapper/presentación local o selector local para país si se requiere ajuste. No cambiar estilo global para resolver Discos. | Muy alto; pruebas y revisión de cada consumidor antes de cualquier cambio. |
| `SimpleSelect.vue`               | Select compartido para periodos y orden.                                                                      | Se puede conservar como control si satisface nombre, teclado, foco y estados. Resolver brechas en wrapper local si son específicas.                                                                      | Compartido; revisar consumidores y tests antes de cambiarlo.               |
| Cabecera de `TopDiscsHeader.vue` | Usa `DiscFilters` con composición propia.                                                                     | Sin cambios ni herencia automática de la agrupación de Discos.                                                                                                                                           | Fuera de alcance.                                                          |
| `DiscCardComponent.vue`          | Tarjeta compartida por Discos y otras vistas/owners.                                                          | Ningún cambio en CAT-DISC-4a–4e; la tarjeta y su densidad visual son iniciativa separada.                                                                                                                | Riesgo de regresión alto; explícitamente excluida.                         |

La opción preferida es componer la nueva presentación desde `modules/catalog/discs/presentation/components/` y mantener compartidos los controles si bastan sus contratos. No mover estado de filtros a un componente visual. Confirmar las referencias cruzadas antes de editar una pieza legacy compartida.

## 12. Preparación para filtros guardados (futuro CAT-DISC-6)

**No implementar ni representar un control inoperante durante CAT-DISC-4b–4e.** La reserva es de arquitectura visual, no un placeholder visible.

- Ubicación prevista: dentro de «Explorar catálogo», en una fila secundaria futura inmediatamente después de los filtros activos o en el encabezado de la sección, alineada con «Limpiar exploración». Almacena «Mis filtros guardados» y «Guardar filtro actual» cerca de los criterios a los que afecta.
- Selector futuro: lista de nombres («Metal extremo», «Hardcore», «Shoegaze y post-metal», «Lanzamientos noruegos») que aplica criterios al coordinador existente; el filtro activo se reconoce en la fila de criterios. Evitar un quinto bloque principal independiente.
- Acción «Guardar filtro actual» solo aparece si hay criterios guardables; en móvil se ubica dentro del panel de exploración, junto a acciones secundarias.
- Edición/eliminación son acciones del elemento guardado y requerirán confirmación/recuperación; su interacción y persistencia se especifican en CAT-DISC-6.
- En escritorio la fila puede ocupar el espacio de utilidades de exploración; en móvil se ubica bajo controles, sin competir con búsqueda ni ocultar criterios activos.
- No reservar un hueco vacío que reduzca anchura útil ni añadir una etiqueta deshabilitada. Esta nota evita una reestructuración futura y no crea expectativas de funcionalidad disponible.

## 13. Roadmap incremental de implementación

Los tamaños estiman cambios frontend acotados. CAT-DISC-4a está aprobada y CAT-DISC-4b se registra como completada localmente. CAT-DISC-4c tiene auditoría completada e implementación pendiente de decisión; 4d–4e permanecen pendientes. Los quality gates siguen las [convenciones](../docs/frontend/conventions.md).

### CAT-DISC-4b — Búsqueda y exploración

| Campo                   | Definición                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alcance                 | Construir composición local de Buscar y Explorar; entrada etiquetada, periodo controlado por criterios vigentes, país dinámico, selector de género compacto y resumen/limpieza de filtros. Mantener cambio inmediato, filtros cruzados y OR. No agregar filtros ni endpoints.                                                                                                                                                       |
| Dependencias            | CAT-DISC-4a aprobada; revisar el estado actual de `useDiscListCoordinator` y el contrato de cada select compartido antes de elegir reutilización.                                                                                                                                                                                                                                                                                   |
| Archivos potenciales    | `src/modules/catalog/discs/presentation/views/DiscListView.vue`; componentes nuevos/propios en `src/modules/catalog/discs/presentation/components/`; `DiscListGenreSelect.vue`; `useDiscListCoordinator.ts` y sus tests solo si se requieren acciones de limpieza/control. Evitar `src/components/DiscFilters.vue`, `SearchableSelect.vue` global y `SimpleSelect.vue` global salvo necesidad documentada y matriz de consumidores. |
| Criterios de aceptación | No hay duplicidad de estado; campos reflejan al coordinador; limpiar búsqueda/filtro/conjunto tiene el alcance definido; país sigue siendo único y dinámico; OR de géneros se conserva; búsqueda interna/teclado/estado sin coincidencias accesibles; Tema claro/oscuro con foco visible; sin cambios en otros consumidores compartidos.                                                                                            |
| Tests necesarios        | Tests de unidad/componente de filtros, control de fecha, país, géneros y chips; integración de la vista para selección múltiple OR, filtros cruzados, búsqueda y limpieza; pruebas de teclado del selector. Ejecutar los tests de `DiscFilters`/`SearchableSelect`/TopDiscs si se toca cualquier componente compartido; typecheck por Vue/TS.                                                                                       |
| Tamaño                  | M                                                                                                                                                                                                                                                                                                                                                                                                                                   |

**Estado CAT-DISC-4b:** completada localmente. La vista usa una búsqueda etiquetada y un componente propio `DiscListExplorationFilters.vue`; `discListDateFilters.ts` deriva selección y rangos temporales como lógica pura de aplicación. País dinámico de selección única, géneros OR compactos, chips retirables y limpieza de exploración que conserva modo y orden. Desde 1280 px, el campo de búsqueda iguala el ancho conjunto de año, mes, periodo y país, calculado con los mismos tracks y gutters de la grilla; por debajo de ese breakpoint ocupa toda la fila porque los selectores se reubican. El selector de géneros mantiene una sola línea y 44 px de altura, País alinea su control a esos 44 px y la grilla amplia da más espacio a géneros. Los rangos activos usan formato numérico `dd-mm-aaaa`. El disclosure aplica al bloque exploratorio bajo 768 px; búsqueda y criterios activos permanecen visibles. La vista integrada se inspeccionó en tema claro a 1440, 1024, 768 y 390 px, y en tema oscuro a 1440, 1024 y 390 px; el harness aislado se usó para ampliar la verificación de estados con varios chips seleccionados.

### CAT-DISC-4c — Biblioteca y resultados

| Campo                   | Definición                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alcance                 | Auditar modo, total, orden permitido y estados de resultados. La distribución vigente de los seis modos en una sola fila queda fijada y no se modifica. Registrar divergencia posible entre total API y tarjetas con imagen; no cambiar contrato.                                                                                   |
| Dependencias            | 4b; tabla de órdenes permitidos en el adaptador y comportamiento por modo revisados. La auditoría está completa; aprobar propuestas antes de implementación.                                                                                                                                                                      |
| Archivos potenciales    | `DiscListView.vue`; componentes de presentación DiscList bajo `modules/catalog/discs/presentation/components/`; tests de vista/coordinador si cambia visibilidad/total/acciones; no `DiscCardComponent.vue`.                                                                                                                    |
| Criterios de aceptación | Conservar la fila actual, modos exclusivos y orden elegible; unidad contextual; vacío distinto de error; reintento conserva criterios; carga inicial e incremental distinguibles; sin cambio de filtros, contrato, elegibilidad ni paginación salvo decisión explícita posterior.                                                    |
| Tests necesarios        | Teclado/semántica de modos; vista para seis valores, orden y total; estados inicial, carga incremental, vacío, error/retry y comentarios; pruebas coordinador si cambia reset. Typecheck por Vue/TS.                                                                                                                                |
| Tamaño                  | Auditoría XS completada; implementación pendiente, estimada S–M según propuestas aprobadas.                                                                                                                                                                                                                                      |

**Estado CAT-DISC-4c:** auditoría completada; implementación pendiente de decisión. Ver [CAT-DISC-4c — Auditoría de contadores y transiciones](catalog-discs-counters-transitions-audit.md). No se alterará la distribución de los seis modos en una fila.

### CAT-DISC-4d — Responsive, estados y accesibilidad

| Campo                   | Definición                                                                                                                                                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alcance                 | Completar layout a 1440+, 1024, 768 y 390 px; disclosure móvil con resumen persistente; overflow/foco/zoom; claro/oscuro; movimiento reducido, targets táctiles y anuncios. Corregir problemas de presentación dentro del owner DiscList.                                                              |
| Dependencias            | 4b y 4c implementadas; acceso a navegador local para verificación, sin asumir backend disponible para estados representativos.                                                                                                                                                                         |
| Archivos potenciales    | `DiscListView.vue`, CSS scoped y componentes específicos de DiscList; pruebas de presentación y a11y si existen en el stack. Evitar CSS global y cambios compartidos salvo caso demostrado y revisado con consumidores.                                                                                |
| Criterios de aceptación | Sin scroll horizontal a 320–390 px; seis modos accesibles a la vista; filtros cerrados no ocultan active count/chips; orden correcto de tabulación; foco no tapado; contraste medido por estado/tema; controles teclado/táctil; `prefers-reduced-motion`; no conformidad WCAG declarada sin evidencia. |
| Tests necesarios        | Pruebas manuales de navegador/teclado en tamaños indicados y ambos temas; automatización visual/a11y disponible; `git diff --check`; tests de componentes/vista de las interacciones responsive. No reemplaza pruebas E2E de backend.                                                                  |
| Tamaño                  | M                                                                                                                                                                                                                                                                                                      |

### CAT-DISC-4e — Regresión visual y funcional

| Campo                   | Definición                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alcance                 | Revisión conjunta del flujo rediseñado y de regresión de Discos/consumidores compartidos que hayan resultado tocados. Capturar evidencia real del navegador; documentar huecos de entorno. No iniciar CAT-DISC-6 ni rediseñar tarjetas.                                                                                               |
| Dependencias            | CAT-DISC-4b–4d completas; aplicación local accesible, sesión local para validar `/disc-list` cuando sea posible.                                                                                                                                                                                                                      |
| Archivos potenciales    | Tests ya tocados de DiscList y controles propios; roadmap de auditoría; sin código nuevo salvo defectos encontrados dentro del alcance, que deben registrarse y corregirse con tests.                                                                                                                                                 |
| Criterios de aceptación | Seis modos, criterios, OR, filtros cruzados, limpieza, orden permitido, carga/vacío/error y paginación siguen correctos; responsive 1440/1024/768/390 y ambos temas inspeccionados; regresión compartida documentada; capturas son de la app real; local y CI se reportan por separado.                                               |
| Tests necesarios        | Tests focalizados de filtros/vista/coordinador/selector, suite de componentes compartidos si afectados, typecheck/build para cambios funcionales según convención; recorrido real de teclado y visual. Validar backend/autenticación solo con entorno disponible; registrar limitaciones y no atribuir validación de CI sin workflow. |
| Tamaño                  | S                                                                                                                                                                                                                                                                                                                                     |

CAT-DISC-4e no empieza automáticamente reparaciones de deuda externa o de `DiscCardComponent`; registrar esos hallazgos para una tarea con owner y alcance aprobados.

## 14. Decisiones de fases posteriores

1. CAT-DISC-4c auditada: decidir las mejoras documentadas antes de implementarlas; conservar la distribución vigente de una sola fila para los seis modos.
2. Acordar la presentación de la diferencia entre el total API y filas sin imagen que no generan tarjetas, sin cambiar semántica backend.
3. Definir el comportamiento de «Restablecer vista» solo si se incluye en una tarea futura. «Limpiar exploración» implementado en 4b conserva modo y orden; el default temporal existente depende de `rv_default_year_filter`.
4. Mantener filtros guardados en CAT-DISC-6; no se inició su implementación.

No quedan decisiones de contrato backend en CAT-DISC-4a: endpoint, opciones, filtros OR, modos, órdenes, paginación y elegibilidad se conservan.

## 15. Evidencia y límites

Fuentes inspeccionadas: [auditoría general de Discos](catalog-discs-audit.md), [auditoría de concurrencia](catalog-discs-concurrency-audit.md), [arquitectura frontend](../docs/frontend/architecture.md), [sistema de diseño](../docs/design-system.md), [convenciones frontend](../docs/frontend/conventions.md), `DiscListView.vue`, `DiscFilters.vue`, `DiscListGenreSelect.vue`, `SearchableSelect.vue`, `SimpleSelect.vue`, `TopDiscsHeader.vue`, `useDiscListCoordinator.ts`, `types/discList.ts` y `api/discList.ts`.

Se inspeccionó estáticamente código y consumidores. No se inició aplicación, no se verificó navegación con backend/sesión, no se tomaron capturas, no se midió contraste ni se condujeron pruebas con usuarios. CAT-DISC-4a es una especificación conceptual, no certificación de accesibilidad ni validación del diseño.
