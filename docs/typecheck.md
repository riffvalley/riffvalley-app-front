# TypeScript: comprobación real con baseline decreciente

## Problema y configuración

El antiguo `yarn typecheck` ejecutaba `vue-tsc --noEmit` sobre el tsconfig raíz.
Ese archivo es un solution config: tiene `files: []` y referencias a los
proyectos app/node. Sin `--build`, las referencias no se comprueban y el comando
terminaba en verde sin validar `src/`.

Ahora `yarn typecheck` ejecuta `scripts/typecheck.mjs`, que invoca el vue-tsc local
con `--noEmit -p tsconfig.app.json --pretty false --noErrorTruncation`. Se revisan
los archivos TypeScript/TSX/declaraciones y los scripts/templates Vue incluidos
en `src/`, también app, modules, shared e integrations. Los tsconfig, sus includes
y las opciones estrictas permanecen intactos. No se añade ninguna exclusión,
`ts-ignore`, `skipLibCheck` ni relajación de TypeScript.

## Inventario inicial

[El baseline versionado](typecheck-baseline.json) se capturó sobre el resultado
de 3.3, commit `314bfca`: **119 diagnósticos en 45 archivos**, agrupados en 108
firmas. Son los 119 ya registrados por la comprobación explícita de 3.3; los
149 del estado anterior a calendarios no se incorporan como permiso adicional.

| Código | Cantidad | Deuda existente |
| --- | ---: | --- |
| TS2339 | 35 | Propiedades inexistentes/inferencias `never` |
| TS6133 / TS6196 | 22 | Declaraciones y símbolos sin uso |
| TS7016 | 17 | Declaraciones de tipos ausentes (dependencias o Vue legacy) |
| TS2322 | 16 | Asignaciones incompatibles |
| TS7053 | 8 | Indexación sin firma válida |
| TS7006 | 7 | Parámetros `any` implícitos |
| TS2345 | 7 | Argumentos incompatibles |
| TS2531 | 2 | Accesos a valores posiblemente null |
| TS2741 | 2 | Propiedades obligatorias ausentes |
| TS2304 / TS2307 / TS2698 | 3 | Símbolo/módulo ausente y spread inválido |

Siete diagnósticos están en app (bootstrap, shell y router), ya existentes; no
hay excepciones iniciales en modules, shared ni integrations. Es un inventario
de deuda concreta, no una autorización para añadir errores en esos archivos.
Ningún archivo de negocio se modifica en esta micro-PR.

## Identidad y regresiones

Cada excepción contiene archivo relativo exacto, código TS, mensaje completo,
la línea de origen sin indentación y número de apariciones. Las rutas absolutas
del checkout se sustituyen por `<repo>` para que local y CI coincidan. Línea y
columna se conservan al informar una regresión, pero no identifican la excepción:
añadir líneas en blanco o mover código dentro del archivo no amplía la deuda.
No hay patrones de carpetas ni permisos globales por código TS.

Al comparar mensajes, solo se canonicaliza el orden de miembros en una secuencia
de literales de cadena entre comillas separados por el símbolo |, una
representación que TypeScript puede imprimir en órdenes distintos para la misma
unión. No se reordena otro texto ni se normalizan uniones de otros tipos.
Archivo, código, línea de origen y multiplicidad siguen identificando cada
excepción. Un mensaje con cualquier otra diferencia, código, archivo o fragmento
distinto falla. También falla una aparición adicional de una firma existente.
Resolver un error no compensa introducir otro. Los errores del compilador/
configuración, resultados incompletos y formatos desconocidos fallan; no se
aceptan por quedar fuera del parser.

El baseline actual debe ser un subconjunto multiconjunto del baseline de Git:

- Localmente se compara con `HEAD` por defecto.
- En una PR, CI usa exactamente el SHA base del evento (`TYPECHECK_BASE_REF`).
- En un push a main, CI usa el SHA anterior del evento.
- Checkout descarga el historial completo. Si la referencia no está disponible,
  la puerta falla. Solo la adopción inicial carece de baseline en su commit base.

La comparación con la base de la PR impide ampliar/reemplazar excepciones incluso
si la ampliación ya está en un commit. El baseline debe seguir bajo revisión,
igual que el script y la configuración de CI.

## Reducción de deuda

Tras corregir un diagnóstico en su recorrido correspondiente:

1. Ejecutar `yarn typecheck:baseline:prune`.
2. Revisar el diff del JSON: solo deben desaparecer entradas o reducirse counts.
3. Ejecutar `yarn typecheck` y `yarn verify`.

El comando prune vuelve a compilar y rechaza cualquier diagnóstico nuevo antes
de escribir. No existe comando de regeneración/ampliación. Si se resuelve deuda
y no se poda, `yarn typecheck` falla para evitar excepciones obsoletas que pudieran
permitir reintroducir el error más adelante.

Para ver los diagnósticos completos sin tolerancia al baseline:

```bash
yarn vue-tsc --noEmit -p tsconfig.app.json --pretty false --noErrorTruncation
```

Ese comando seguirá fallando mientras exista deuda. La puerta incremental
informa explícitamente cuántos errores baseline quedan y exige cero regresiones;
el verde no significa que el proyecto tenga cero errores TypeScript.

## Pruebas y validación

`tests/unit/typecheck.spec.ts` verifica normalización, movimiento de líneas,
firmas distintas, duplicados/counts, errores resueltos, entradas inválidas y
fallos de configuración. Un fixture temporal ejecuta el compilador real sobre
un `.ts` y un template `.vue`, usa commits Git para comprobar la comparación
contra la base de una PR, rechaza ampliaciones, poda deuda y detecta un error
nuevo en otra ruta de src. El fixture no modifica las fuentes de la aplicación.

`yarn verify` sigue siendo el agregado de lint, arquitectura, typecheck, tests y
build; el workflow existente lo ejecuta con la referencia de comparación fijada.
