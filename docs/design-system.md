# Sistema de diseño de Riff Valley

**Estado:** guía canónica de estilos del frontend, DS-2 completada el 2026-10-27. Describe lo implementado y establece requisitos para interfaces nuevas. Los nombres de tokens semánticos propuestos no existen todavía en CSS/Tailwind y no deben importarse como clases.

**Base documental:** inspección estática de la configuración y los componentes enlazados, contrastada con la auditoría [DS-1](../roadmap/dashboard.md). No se hizo una comprobación visual en navegador; las referencias indican implementación de variantes para ambos temas, no certificación de contraste renderizado.

Esta guía cubre decisiones visuales y de interacción. No cambia ownership, dependencias o ubicación de código descritos en [Arquitectura frontend](frontend/architecture.md). En cruces de capacidades, conserva la propiedad y los contratos de cada módulo; reutilizar una referencia visual no convierte automáticamente su implementación en `shared`.

## 1. Identidad visual y estado de la guía

La interfaz combina los acentos rosa, morado y azul de Riff Valley con superficies claras y una paleta nocturna azul marino/gris violáceo. Las vistas existentes expresan esta identidad con utilidades Tailwind, CSS local y variantes `dark:`; todavía no hay una capa uniforme de tokens semánticos ni una biblioteca visual central.

En esta guía se distinguen tres estados:

- **Implementado:** existe en la configuración/código citado; se puede reutilizar respetando su alcance y limitaciones.
- **Convención obligatoria:** criterio de compatibilidad y accesibilidad exigido a UI nueva o modificada.
- **Propuesta pendiente:** nomenclatura semántica para una posible implementación posterior. No es una variable, clase o API disponible hasta que se apruebe e implemente.

Los ejemplos describen el código actual; algunos estilos legacy son inconsistentes. Una referencia útil no convierte cada detalle del componente en un estándar.

## 2. Colores y temas

### Paleta implementada

La fuente de estas extensiones es [tailwind.config.js](../tailwind.config.js). Los valores de marca identifican la paleta existente; no implican que cada color sea apropiado para texto pequeño sobre cualquier fondo.

| Nombre disponible | Valor | Uso observado |
|---|---|---|
| `rv-pink` | `#e46e8a` | Acento de marca, enlaces, foco y estados seleccionados. |
| `rv-purple` | `#b0669f` | Acento/acción y gradientes de marca. |
| `rv-blue` | `#0064d6` | Acciones y visualización de Mundo musical. |
| `rv-blueDark` | `#00309b` | Color corporativo oscuro, también usado en foco. |
| `rv-navy` | `#00021f` | Identidad oscura, badges y elementos gráficos. |
| `rv-white` | `#ffffff` | Color de marca disponible. |
| `rv-darkBg` | `#00021f` | Fondo oscuro. |
| `rv-darkCard` | `#404157` | Tarjeta oscura. |
| `rv-darkSurface` | `#2a2b3d` | Superficie oscura. |

También existen `bg-rv-gradient` (`#e46e8a` → `#b0669f` → `#0064d6`), `font-brand` (Skaters) y `shadow-rv` (`0 10px 30px rgba(0,0,0,0.35)`). `rounded-primary` vale `0.5rem`. No se ha observado una escala propia de espaciado en `tailwind.config.js`; se usan las utilidades estándar Tailwind existentes en el proyecto.

Los colores neutrales/estado que aparecen en componentes suelen ser utilidades Tailwind directas, por ejemplo `bg-white`, `bg-gray-50`, `text-gray-900`, `text-gray-600`, `border-gray-200`, `text-red-600`, `text-green-600` y `text-amber-900`, con overrides oscuros según contexto. No son tokens semánticos Riff Valley. Los colores literales de proveedores, gráficos, mapas, podios y gradientes tampoco forman por sí solos una paleta semántica común.

Impeccable y otros detectores son fuentes auxiliares de hallazgos, no autoridad de identidad visual. Mantener los colores corporativos y excepciones de marca cuando su uso esté justificado; evaluar contraste y tema en su contexto real.

### Funcionamiento de los temas

- Tailwind está configurado con `darkMode: 'class'`; sus clases `dark:*` responden a `.dark` en el elemento raíz, no directamente a `prefers-color-scheme`.
- [useTheme.ts](../src/composables/useTheme.ts) activa o quita esa clase y guarda `theme=dark|light` en `localStorage`. Si no hay valor `dark`, inicializa claro. `DefaultLayout.vue` llama a `initTheme()` y el toggle está en `SidebarMenu.vue`.
- Hay código de Login que también aplica la clase y persiste la preferencia; no se debe introducir una segunda fuente de estado de tema.
- El patrón actual de superficie es local a cada componente: `bg-white dark:bg-rv-darkCard`, junto con textos/bordes pareados, por ejemplo `text-gray-900 dark:text-white` y `border-gray-200 dark:border-white/10`.

**Convención obligatoria:** toda interfaz nueva debe representar explícitamente el tema claro y oscuro. En superficies que siguen el tema, no fijar `bg-black`, `bg-white` o `bg-rv-navy` como fondo invariable: usar las variantes de tema del patrón existente. Los fondos blancos o navy se permiten cuando el elemento tiene identidad gráfica fija y la excepción se documenta. Los overlays negros translúcidos (`bg-black/50`, por ejemplo) pueden mantenerse cuando oscurecer el contenido detrás del diálogo sea su propósito.

La hoja global [style.css](../src/style.css) conserva estilos genéricos de enlaces y botones (incluido `#1a1a1a`, con ajuste de botón según `prefers-color-scheme: light`). No debe usarse como sistema de tokens; por la diferencia entre preferencia del sistema y tema guardado, los controles nuevos deben declarar su tratamiento visual explícitamente. Las clases de utilidad de Tailwind pueden tener precedencia sobre estos estilos, pero no se debe depender de esa cascada implícita.

### Propuesta de tokens semánticos (no implementada)

No se observa una capa global de custom properties CSS por tema ni clases Tailwind actuales llamadas así. Sí existen variables locales puntuales, por ejemplo `--pill-*` en `DiscFilters.vue` y un fallback `--rv-navy` en `SearchableSelect.vue`; no representan un vocabulario semántico completo compartido. Para evitar duplicar la paleta o los pares de clases, cualquier implementación futura debe asignar estos roles a los colores existentes antes de añadir valores nuevos:

| Nombre propuesto | Responsabilidad | Estado |
|---|---|---|
| `--rv-bg-canvas` | Fondo principal de página. | Pendiente de decisión y mapeo por tema. |
| `--rv-bg-surface` | Tarjeta/panel base. | Pendiente. |
| `--rv-bg-elevated` | Modal o superficie visualmente elevada. | Pendiente. |
| `--rv-text-primary` | Texto principal. | Pendiente. |
| `--rv-text-secondary` | Texto auxiliar/menos prominente. | Pendiente. |
| `--rv-border` | Bordes y separadores. | Pendiente. |
| `--rv-action-primary` | Acción primaria de marca. | Pendiente; reutilizar rosa/morado/azul existentes según el patrón aprobado. |
| `--rv-action-secondary` | Acción secundaria/neutral. | Pendiente. |
| `--rv-interactive-hover` | Superficie de hover. | Pendiente. |
| `--rv-focus-ring` | Indicador de foco visible. | Pendiente; el foco no puede desaparecer mientras se decide. |
| `--rv-state-success`, `--rv-state-warning`, `--rv-state-error` | Colores semánticos de estado. | Pendientes; mantener además texto/icono o etiqueta. |

Estos nombres son una propuesta documental, no tokens utilizables en CSS. Su posible adopción debe decidir si se implementan como custom properties, extensiones Tailwind o se mantienen las variantes locales existentes. No crear aliases en paralelo sin migración y consumidores justificados.

## 3. Tipografía, superficies y layout

### Tipografía

- La base global declara `Inter, system-ui, Avenir, Helvetica, Arial, sans-serif`, line-height `1.5` y weight `400` en [style.css](../src/style.css).
- [fonts.css](../src/assets/fonts.css) registra la familia `Skaters` desde `src/assets/fonts/Skaters.ttf`; Tailwind la expone como `font-brand`. El código contiene ambos recursos; no se prescribe usar Skaters en texto de lectura.
- Los componentes combinan jerarquía Tailwind como `text-sm`, `text-xs`, `text-2xl`, `font-semibold` y `font-bold`. El valor global `h1` legacy es `3.2em/1.1`; las vistas nuevas suelen declarar su propia escala responsive.
- No hay escala tipográfica semántica compartida documentada en configuración. Mantener tamaños legibles, jerarquía explícita y longitudes de texto que funcionen en móvil.

### Superficies, bordes y elevación

**Patrón implementado:** páginas y widgets suelen usar `bg-white`/`dark:bg-rv-darkSurface` o `dark:bg-rv-darkCard`, borde `border-gray-200`/`dark:border-white/10`, y texto oscuro/claro pareado. El relieve combina separación tonal con utilidades de sombra como `shadow-sm`, `shadow-xl`, `shadow-2xl` y la extensión `shadow-rv`; no hay una escala de elevación semántica central.

Ejemplo real de tarjeta: `src/modules/identity/activity/overview/components/ActivityMetricCard.vue` usa `rounded-xl border border-gray-200 bg-white ... dark:border-white/10 dark:bg-rv-darkCard`. No asumir que la misma superficie es adecuada en todo contexto; heredar/mantener la composición del owner.

### Espaciado, radios y responsive

- No se ha configurado una escala de spacing propia; usar las utilidades Tailwind del proyecto (`p-4`, `gap-2`, `mt-4`, etc.) y el ritmo local del componente cercano.
- `rounded-primary` está disponible a `0.5rem`; también se usan las utilidades de radio estándar (`rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full`). No inventar una escala paralela.
- Los componentes reales usan breakpoints Tailwind (`sm:`, `md:`, `lg:`, `xl:`), flex-wrap y grids adaptables. Por ejemplo, `AccessRequestModal.vue` combina `w-[93%] sm:w-full sm:max-w-sm`; `ActivityPeriodFilters.vue` permite envolver controles mediante `flex-wrap`.
- Verificar contenido largo, foco, scroll del modal y controls en viewport estrecho. No ocultar funciones necesarias para hacer caber una composición.

## 4. Componentes e interacciones

Las siguientes rutas están fuera de `src/modules/dashboard/`. Se seleccionaron por variantes explícitas en código y se evaluaron estáticamente. No hubo navegador, captura ni contraste medido; la existencia de clases `dark:` prueba intención/cobertura implementada, no el resultado perceptual final.

| Referencia | Patrón y ejemplo de código real | Cuándo reutilizarlo | Limitaciones conocidas |
|---|---|---|---|
| [AccessRequestModal.vue](../src/modules/identity/auth/login/components/AccessRequestModal.vue) | Modal/formulario: `bg-white dark:bg-rv-darkCard`, input `bg-white dark:bg-rv-darkSurface`, `border-gray-200 dark:border-white/10`, estados `disabled:*`, hover y ring de foco en CTA. | Campos etiquetados, modal de formulario o CTA con gradiente de marca. | Su botón de cierre elimina explícitamente el outline/ring; no copiar ese tratamiento de foco. El gradiente de botón usa hex fijos de marca/acción. |
| [ActivityPeriodFilters.vue](../src/modules/identity/activity/components/ActivityPeriodFilters.vue) | Selector de período y fechas con activo/no activo, hover, `.dark`, `:focus-visible`, `color-scheme` y movimiento reducido. | Filtros, grupos de selección mutuamente exclusiva, fechas y estados activos. | Se implementa con clases locales CSS (`period-button`), no como componente compartido genérico. |
| [ActivityMetricCard.vue](../src/modules/identity/activity/overview/components/ActivityMetricCard.vue) | Tarjeta con borde/superficie pareados, niveles de texto y panel `<details>` con hover/foco y colores específicos de tema. | Tarjetas de cifras y ayuda explicativa asociada. | Es una tarjeta de Identity/activity con su contrato; reutilizar su patrón, no importar internals en otras capacidades sin contrato/owner compartido. |
| [UserNotesDialog.vue](../src/modules/identity/users/user-management/components/UserNotesDialog.vue) | Diálogo con superficie/input en claro y oscuro, separador, estados de botón y cierre por Escape/Tab. | Diálogos con formulario breve y ciclo de foco parecido. | Los estilos de parte del diálogo son CSS local; el botón de cierre no declara un estilo `:focus-visible` propio. |
| [UserModal.vue](../src/components/UserModal.vue) | Badge de rol `bg-rv-navy dark:bg-rv-purple text-white`, con etiqueta textual. | Identificadores breves de rol/estado cuando el acento fijo está justificado y el texto mantiene contraste. | Pieza legacy compartida; no es una API de badge ni debe usarse para todos los estados. |
| [UserStatisticsView.vue](../src/modules/identity/activity/overview/UserStatisticsView.vue) y [ActivityComparisonChart.vue](../src/modules/identity/activity/overview/components/ActivityComparisonChart.vue) | Superficies/textos de ambos temas, espera/error/actualización y empty state explícito en la tarjeta de gráfico, con `role="alert"`/`role="status"`. | Diseñar superficies, estados de carga/error y ausencia de valores. | Piezas de Identity/activity con estilos locales; adaptar datos/copy al owner. La revisión es estática. |

### Botones y controles

**Implementado:** el código usa combinaciones de utilidades, no una API central de variantes. Ejemplo primario real en `src/modules/identity/activity/user-activity/UserActivityView.vue`:

```html
class="rounded-lg bg-rv-pink px-4 py-2 text-sm font-semibold text-rv-navy transition-colors hover:bg-rv-pink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
```

Usar el botón cercano que corresponda al flujo y ajustar la variante de tema si la superficie exige cambio. Para controles secundarios, existe el selector de `ActivityPeriodFilters.vue` con estados no seleccionados, seleccionados, hover y focus. Un `<select>` o input debe conservar etiqueta accesible, tamaño utilizable, estado seleccionado y estilo visible en ambos temas.

**Convención obligatoria:** todo control operable por teclado tiene un indicador de foco visible, incluido `:focus-visible` cuando proceda. `outline-none`, `focus:outline-none` o equivalentes solo se admiten si el mismo control implementa un reemplazo visible y comprobable. Los estados hover, pressed/active y disabled no deben ser el único indicador de selección ni ocultar foco.

### Tarjetas, modales y formularios

- **Tarjetas:** parear fondo, borde y texto para cada tema; usar título y contenido con jerarquía. La utilidad `shadow-sm` aparece en tarjetas; no elevar cada bloque por defecto.
- **Modales:** usar superficie clara/oscura, overlay que permita distinguir el diálogo, ancho/alto limitado y scroll interno cuando se requiera. Proveer nombre accesible, `aria-modal`, Escape/cierre y gestión/restauración de foco según el patrón del diálogo. El overlay negro translúcido tiene una función visual fija y no sustituye la adaptación de la superficie interior.
- **Inputs:** asociar etiqueta y control, incluir placeholder solo como apoyo, estado de error textual y foco perceptible. Usar fondo/texto/borde/placeholder adecuados a cada tema y el patrón del formulario owner.
- **Badges/indicadores:** no existe componente transversal de badge documentado. El badge de `UserModal.vue` y los indicadores textuales con punto en `UserManagementView.vue` son ejemplos contextuales, no una variante genérica oficial.

### Estados de interacción y contenido

| Estado | Convención obligatoria | Patrón implementado de referencia |
|---|---|---|
| Hover | Diferencia perceptible sin borrar etiqueta ni contraste; no debe ser la única señal. | `ActivityPeriodFilters.vue`, `ActivityMetricCard.vue`. |
| Focus | Indicador visible con contraste y separación suficientes; comprobar navegación con Tab/Shift+Tab. | `ActivityPeriodFilters.vue` (`:focus-visible`). |
| Active/selected | Mantener un estado distinguible y, en controles de selección, exponerlo con semántica como `aria-pressed` cuando aplique. | `ActivityPeriodFilters.vue` usa clase `period-button--active` y `aria-pressed`. |
| Disabled | Usar atributo `disabled` real cuando corresponda y mantener el motivo/estado comprensible; no depender solo de opacidad. | CTA del formulario en `AccessRequestModal.vue`; botón principal de `UserNotesDialog.vue`. |
| Loading | Comunicar espera con texto/rol de estado o skeleton que no suplante la información accesible. | `UserStatisticsView.vue`; skeletons en `ActivityUserDailyCharts.vue`. |
| Error | Explicar el problema en texto, marcarlo (`role="alert"` si es urgente) y ofrecer reintento cuando sea posible. | `UserStatisticsView.vue`; feedback inline en `AccessRequestModal.vue`. |
| Empty/success | Diferenciar ausencia de datos de carga/error y expresar éxito en texto/estado accesible. | `ActivityComparisonChart.vue` para datos vacíos; `AccessRequestModal.vue` para éxito. |

Los colores corporativos y de proveedores pueden usarse cuando su identidad sea relevante. No se reemplazan por recomendaciones genéricas de detector. Revisar contraste en el fondo real, incluir señales no cromáticas (texto, icono, forma o etiqueta) y documentar excepciones gráficas fijas.

## 5. Contraste y accesibilidad

**Convención obligatoria para cada cambio de UI:**

1. Texto y controles mantienen contraste suficiente sobre la superficie activa; no usar `text-gray-400` o colores de marca automáticamente sin evaluar tamaño, peso y fondo.
2. El color no comunica por sí solo éxito, error, selección o categoría. Añadir etiqueta, icono, forma o texto visible accesible.
3. La interfaz se puede recorrer y operar con teclado; foco siempre perceptible, orden coherente, diálogos con cierre y ciclo de foco adecuados.
4. Inputs tienen etiqueta programática; botones tienen nombre; iconos decorativos no duplican anuncios; mensajes asíncronos usan roles/semántica apropiados.
5. Animaciones respetan `prefers-reduced-motion` cuando sean relevantes. No transmitir carga únicamente con animación.
6. Comprobar ambos temas y tamaños representativos, incluidos hover, focus, selected, disabled, loading, vacío y error.

Un resultado de tests, typecheck, build o Impeccable no constituye por sí solo una verificación visual o de contraste. Registra qué se observó realmente y qué quedó sin inspección.

## 6. Reglas obligatorias para agentes

Antes de cualquier cambio visual:

1. Consultar esta guía e identificar el patrón equivalente y su owner actual.
2. Reutilizar componente/estilo existente cuando su semántica y ownership coincidan; no mover una pieza a `shared` solo por reutilización visual.
3. Usar tokens de marca y utilidades implementadas con las variantes `dark:` necesarias. No inventar clases de los tokens semánticos propuestos mientras no se hayan implementado.
4. Evitar colores arbitrarios o hardcodeados. Si un recurso necesita color fijo (marca, portada, proveedor, mapa, overlay funcional), justificarlo y comprobar texto/controles relacionados.
5. No fijar fondos negros, blancos o navy en superficies adaptables al tema. Asegurar fondos, textos, bordes, hover, foco, disabled y estados para claro y oscuro.
6. Revisar accesibilidad básica: contraste, foco visible, teclado, etiquetas, nombres, mensajes y no dependencia exclusiva del color.
7. Comprobar la interfaz en ambos temas; describir como estática una evaluación sin navegador y no afirmar verificación visual por haber pasado pruebas/build/Impeccable.
8. Documentar cualquier excepción en el cambio o su roadmap, con motivo y superficies donde aplica.

## 7. Tokens futuros y estado del seguimiento de Dashboard

La tabla de tokens semánticos de esta guía queda **propuesta, no aprobada ni implementada**. Una decisión posterior debe mapear cada rol a la paleta actual, evitar duplicar Tailwind/utilidades existentes y especificar valores para ambos temas antes de cambiar configuración. Esta guía no modifica `tailwind.config.js`, CSS, componentes ni sistema de tema.

El historial y estado de cierre de Dashboard se registran en [roadmap/dashboard.md](../roadmap/dashboard.md):

- **DS-1 — Auditoría del sistema visual:** completada.
- **DS-2 — Guía canónica:** completada; esta guía sigue disponible para trabajos futuros.
- **DS-3 — Auditoría estática de Dashboard:** completada; no se hizo verificación visual en navegador.
- **DS-4 — Correcciones por widget:** cerrada por decisión del usuario; DS-4a–DS-4d completadas y DS-4e–DS-4j descartadas, no completadas.
- **DS-5 — Verificación final:** cancelada por decisión del usuario; no se declara realizada.

Dashboard se cerró por decisión del usuario en su estado actual: los problemas visuales prioritarios señalados están resueltos y el diseño se acepta. DS-4e–DS-4j se descartaron y DS-5 se canceló; esto no significa que todos los hallazgos históricos de DS-1 estén corregidos ni que se inspeccionaran visualmente ambos temas en navegador. Esta guía sigue disponible y será el punto de referencia para futuras tareas independientes de interfaz.
