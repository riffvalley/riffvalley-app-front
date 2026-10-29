# CAT-ART-4c — Adaptación frontend de relleno por lotes

**Estado: completada localmente el 2026-10-29.** Consume el contrato implementado en el checkout backend hermano y documentado en `riffvalley-app-back/roadmap/catalog/cat-art-4b-rellenar-imagenes-por-lotes.md`. No se modificó backend ni se accedió a producción.

## Implementación

- `src/services/artist/artist.ts` declara los tipos del preview, resultados individuales y lote; implementa `GET /artists/images/fill/preview` y `POST /artists/images/fill` con soporte de `AbortSignal`.
- `src/modules/catalog/artists/application/useArtistImageFill.ts` coordina el preview y los POST en secuencia. Respeta el tamaño del preview y el máximo contractual de 10, conserva cursor y resultados agregados, calcula avance por artistas procesados y valida totales, formas y cursores. Un error HTTP no reintenta el lote. Un cursor repetido, una respuesta incoherente o una continuación inválida detienen el recorrido.
- `src/modules/catalog/artists/presentation/views/ArtistManagementView.vue` mantiene el botón solo para `superadmin`, solicita preview antes de una confirmación única, no envía POST cuando no hay elegibles e invalida el directorio al recibir resultados de lotes. CAT-ART-6a trasladó aquí la vista.
- `src/modules/catalog/artists/presentation/components/ArtistImageFillProgress.vue` muestra barra, porcentaje, artistas examinados, lote y contadores de imágenes añadidas, sin coincidencia, ambigüedad, error y actualización concurrente. Al finalizar el recorrido completo, el porcentaje se fija en 100 % y se presenta el resumen.
- Detener o desmontar aborta la espera Axios cuando es posible e impide continuar. El backend puede terminar un lote que ya recibió; la interfaz informa esa limitación y no presenta una ejecución interrumpida como 100 %.

El flujo ya no descarga el catálogo para identificar artistas sin imagen ni usa búsqueda Spotify o PATCH individuales. La escritura y la búsqueda quedan en la operación backend existente. El preview vuelve a determinar los pendientes en una ejecución futura.

## Evidencia local

- Tests focalizados: `src/services/artist/artist.test.ts`, `src/modules/catalog/artists/application/useArtistImageFill.test.ts` y `src/modules/catalog/artists/presentation/views/ArtistManagementView.test.ts` — 3 archivos, 12 tests aprobados originalmente. CAT-ART-6a movió el último archivo de test junto a la vista.
- `pnpm run typecheck` — aprobado.
- `pnpm build` — aprobado; emitió avisos preexistentes de sintaxis CSS (`.flex-[2]`), tamaño de chunk y base Browserslist antigua.
- ESLint focalizado sobre los siete archivos del cambio — aprobado.
- `git diff --check` focalizado en archivos propios y comprobación equivalente de archivos nuevos — sin errores de whitespace.
- Enlaces Markdown de los cuatro documentos de esta iniciativa — 0 fallos locales. El escaneo informativo general encontró dos referencias preexistentes a rutas fuera del repositorio (`roadmap/catalog-discs-audit.md` y `roadmap/roles.md`), ninguna en los documentos modificados aquí.

## Límites

- La evidencia comprueba el contrato y flujo mediante el código backend hermano y pruebas frontend aisladas. No acredita que las rutas estén desplegadas o accesibles en un entorno, ni que se haya completado una ejecución real.
- Si la conexión se interrumpe después de que el servidor haya recibido un POST, el lote puede finalizar en backend sin que frontend reciba su resumen. El preview de una ejecución posterior recupera los artistas que aún no tengan imagen.
- CAT-ART-5 sigue pendiente; no se inicia como parte de 4c.
