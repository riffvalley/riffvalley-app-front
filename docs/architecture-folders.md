# Guía de carpetas de la arquitectura

Esta guía complementa el [roadmap](../roadmap.md) y el
[baseline arquitectónico](architecture-baseline.md). Explica dónde buscar y
colocar código en la estructura modular; no cambia el estado de la migración.
Las rutas legacy siguen conviviendo con los recorridos migrados.

## Capas de un módulo o feature

En `src/modules/`, busca primero la capacidad propietaria y después la feature
o recorrido, cuando exista esa subdivisión. Dentro de ese ámbito, cada capa
responde a una responsabilidad:

| Carpeta | Qué contiene | Ejemplo |
| --- | --- | --- |
| `domain/` | Conceptos, reglas y políticas de negocio puras. | Una política de filtrado de discos o una regla de alternancia de país. |
| `application/` | Operaciones, casos de uso y coordinación de workflows; define los puertos que necesita para acceder al exterior. | Cargar páginas o coordinar la búsqueda y actualización de imágenes de artistas. |
| `infrastructure/` | HTTP, persistencia, DTOs, mappers y adaptadores técnicos que implementan los puertos. | Construir un PATCH, interpretar su respuesta o leer sesión del almacenamiento. |
| `presentation/` | UI y coordinación visual: datos visibles, interacción, carga, errores y estado de pantalla. | Ensamblar un calendario y mostrar el progreso de una operación. |

La dirección es `presentation → application → domain`; infraestructura
implementa los puertos de aplicación o dominio. `domain` y `application` son
TypeScript independiente de Vue, Pinia, router, HTTP, navegador y SDKs externos.
La presentación consume operaciones de aplicación y no realiza HTTP.
`src/app/` compone las dependencias concretas y los recorridos que combinan
varios módulos.

Los DTOs viven junto a su adaptador. Un mapper pertenece a infraestructura
cuando convierte el formato de transporte a un modelo de aplicación o dominio;
solo hace falta si esos formatos difieren.

## Dentro de `presentation/`

Estas carpetas distinguen los tipos de trabajo de UI dentro de la feature:

| Carpeta | Qué contiene |
| --- | --- |
| `views/` | Pantallas o contenedores principales que ensamblan componentes y conectan la interacción con las operaciones. |
| `components/` | Piezas visuales, como tarjetas, formularios, modales o controles. |
| `composables/` | Coordinación reactiva de UI: estado local, valores derivados, efectos, carga y ciclo de vida. |
| `stores/` | Estado compartido y cache de presentación, con propietario e invalidación claros. Pinia coordina UI y operaciones de aplicación; no implementa HTTP ni reglas de negocio. |
| `helpers/` | Funciones puras auxiliares de UI: formateadores, labels, mapeos visuales o transformaciones para mostrar datos. |

Por ejemplo, formatear una fecha para mostrarla pertenece a
`presentation/helpers/`; decidir un rango según una política del producto
pertenece a `domain/`. Que una función sea pura no basta para hacerla de dominio:
su responsabilidad determina la carpeta.

En Catalog, la presentación se agrupa por tipo dentro de cada feature, por
ejemplo `discs/calendars/presentation/views/`. Otros módulos pueden conservar
archivos en la raíz de `presentation/` mientras se migran de forma incremental.

## Dónde busco algo

Las rutas de presentación y capas son relativas al módulo o feature propietario;
`integrations/` está bajo `src/`.

| Quiero… | Busco en… |
| --- | --- |
| Cambiar una pantalla | `presentation/views/` |
| Cambiar un componente | `presentation/components/` |
| Cambiar coordinación reactiva | `presentation/composables/` |
| Cambiar estado/cache UI | `presentation/stores/` |
| Cambiar formato o helper visual | `presentation/helpers/` |
| Cambiar una regla de negocio | `domain/` |
| Cambiar un flujo/caso de uso | `application/` |
| Cambiar endpoint, DTO o acceso externo | `infrastructure/` del módulo o integración propietario |
| Cambiar Spotify/Last.fm/WordPress | `integrations/`, dentro del proveedor correspondiente |

`integrations/` posee el acceso técnico a proveedores externos. Por ejemplo,
la llamada y los DTOs de Spotify pertenecen a su integración; el flujo de
producto que utiliza ese resultado permanece en su módulo. Las rutas indican
responsabilidades, no que todos los proveedores estén ya migrados.

## Crear solo lo necesario

No todas las features necesitan todas las capas ni todas las carpetas de
presentación. Se crean solo cuando tienen contenido y aportan claridad; no
se añaden carpetas vacías, clases ni abstracciones por cumplir un esquema.

`src/shared/` no es un cajón desastre. Contiene únicamente piezas transversales,
estables y sin un propietario de dominio claro. Una utilidad específica de una
feature permanece en esa feature aunque parezca genérica; que la usen dos
módulos tampoco basta para trasladarla a `shared`. Por ejemplo, un formateador
del calendario sigue en los helpers de ese calendario.
