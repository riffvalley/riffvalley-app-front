# Estructura de Catalog

Catalog se organiza primero por capacidad y recorrido; dentro de cada recorrido,
las capas describen la responsabilidad del código:

- `domain`: conceptos y reglas propias del producto.
- `application`: operaciones y workflows que coordinan esas reglas.
- `infrastructure`: API, persistencia y detalles técnicos que implementan contratos.
- `presentation`: interfaz y coordinación del estado visible.

Dentro de cada `presentation/`, agrupa siempre por tipo. No dejes archivos en
la raíz de esa carpeta:

```text
<feature>/presentation/
├── views/        # pantallas y contenedores principales
├── components/   # piezas visuales
├── composables/  # coordinación reactiva y estado local de UI
├── helpers/      # funciones puras auxiliares de UI
└── stores/       # estado/cache de presentación
```

Crea solo las carpetas que tengan contenido. Conserva la organización por
feature, por ejemplo `discs/calendars/presentation/views/` y
`artists/discovery/presentation/components/`. `presentation/helpers/` reúne
formateadores, labels, mapeos visuales y transformaciones puras específicas de
UI. `discs/calendars/presentation/helpers/` contiene el formateador del
calendario: sigue perteneciendo a esa feature; no se mueve a `shared` sin
reutilización transversal demostrada.

## Dónde busco algo

| Necesito encontrar | Empiezo en |
| --- | --- |
| Calendarios normal y babyUser | `discs/calendars/` |
| Listado de discos | `discs/listing/` |
| Datos para el detalle de disco | `discs/detail/` |
| Gestión/listado de artistas | `artists/listing/` |
| Editar, crear o borrar artistas | `artists/editing/`, `artists/creation/`, `artists/deletion/` |
| Modal y navegación de descubrimiento Last.fm | `artists/discovery/` |
| Rellenado masivo de imágenes de artistas | `artists/images/` |
| Géneros, países y su cache visual | `reference-data/` |
| Símbolos para consumidores de Catalog | `index.ts` |
| Conectar operaciones, adaptadores y otros módulos | `src/app/dependencies/` |

Cada recorrido contiene solo las capas que necesita. La vista ensambla UI;
la lógica de coordinación visible va en `presentation/composables`, el estado
compartido de presentación en `presentation/stores`, y las operaciones técnicas
no se introducen desde la presentación.
