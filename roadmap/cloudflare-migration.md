# Migración del frontend principal de Netlify a Cloudflare

## Estado de esta auditoría

**CF-1 — Auditoría y planificación completada el 2026-10-30.**

**CF-2 — Verificación de paneles completada el 2026-10-30.** Se consultaron en modo lectura el sitio Netlify y la zona/proyectos Pages de Cloudflare. No se modificó DNS, variables, proyectos ni código de aplicación. Los valores secretos no se consultaron ni se anotaron.

**CF-3 — Despliegue temporal completado el 2026-10-30.** El proyecto Pages `riffvalley-app` publica `main` en `https://riffvalley-app.pages.dev`. El dominio de producción sigue en Netlify y no se modificó DNS.

**CF-4 — Detenida por incidencia (2026-10-30).** Se intentó asociar el dominio tras aprobación; el nuevo destino Pages dio HTTP 522. Se restauró el CNAME anterior y una comprobación posterior volvió a servir la App desde el hostname. El DNS sigue apuntando a Netlify y Pages continúa “Verifying”, por lo que la migración no está completada.

### Configuración real de Netlify verificada en CF-2

| Ajuste | Valor observado |
|---|---|
| Proyecto | `spammusic`, URL pública `app.riffvalley.es`; repositorio Git conectado `riffvalley/riffvalley-app-front`. |
| Rama de producción | `main`; publicación automática activa. El deploy publicado durante la consulta era `main@4050dae`. |
| Base / build / salida | Base `/`; `npm run build`; `dist`. |
| Runtime / imagen | Node `22.x` seleccionado explícitamente; Ubuntu Noble 24.04. La configuración difiere de `.nvmrc` (24.22.1) y del estándar pnpm 11.28.8 del repo. |
| Directorio Functions | `netlify/functions` aparece como campo de configuración, pero no existe esa carpeta ni código de funciones en el repositorio. |
| Branch deploys / previews | Branch deploys limitados a la rama de producción. Deploy Previews habilitados para cualquier pull request contra `main`; había previews completadas visibles. Las previews de fork no reconocido requieren aprobación para variables sensibles. |
| Hooks y publicación | Auto publishing está activado para `main`. Build hooks: ninguno definido. No se encontraron plugins activos; la página mostraba el catálogo con acciones para habilitarlos. |
| Otros ajustes de serving | Pretty URLs habilitado. El deploy publicado procesó una regla de redirect sin errores, correspondiente al fallback SPA del repo. |
| Dominio y TLS | `app.riffvalley.es` es el dominio primario; `spammusic.netlify.app` sigue disponible. HTTPS habilitado con certificado Let's Encrypt. No se mostraron otros alias personalizados. |

Netlify ejecuta hoy `npm run build`, que en el `package.json` actual entra en un script que invoca `pnpm run typecheck` y `pnpm exec vite build`. La publicación reciente completó con la selección Node 22.x. Esto demuestra que el estado actual pudo desplegarse, pero el ajuste explícito Node 22.x no coincide con el runtime requerido/declarado por el repo y debe corregirse al preparar Pages. No se inspeccionaron valores ocultos de secretos ni los logs completos del build.

### Configuración real de Cloudflare verificada en CF-2

| Recurso | Estado observado |
|---|---|
| Zona `riffvalley.es` | Está activa en la cuenta Cloudflare y usa DNS completo. El usuario confirma que el apex aloja WordPress; su registro raíz es `A` y DNS only. No se tocó. |
| `app.riffvalley.es` | `CNAME` a `spammusic.netlify.app`, proxy Cloudflare activo, TTL Auto. Es el registro que habría que sustituir solo durante CF-4, después de asociar el hostname a Pages. |
| `backend.riffvalley.es` | `CNAME` proxied a la infraestructura Heroku. Se deja fuera de la migración. |
| Pages existentes | Solo aparece el proyecto `wiki`, conectado a `riffvalley/wiki`, producción desde `main`, con dominio `wiki.riffvalley.es` y su host `pages.dev`. No comparte el hostname `app`; Wiki queda fuera de esta tarea. |
| Proyecto App / nombre | No hay proyecto Pages para esta App ni un Pages project llamado `spammusic` en la lista observada. No se creó uno. |
| Integración y alta | El flujo de alta ofrece **Continue with GitHub** y un flujo Pages heredado; el proyecto Wiki conectado confirma que GitHub ya se usa en Pages. No se avanzó al selector del repo/branch porque eso puede iniciar permisos o creación. La opción concreta de seleccionar `main` para el nuevo proyecto no llegó a verificarse. |

Los registros raíz y de `backend` son contexto de seguridad operativo, no cambios solicitados. No se leyeron ni exportaron los demás registros DNS; el panel indicaba 37 registros en la zona.

## Arquitectura actual de despliegue

- Es una SPA Vue 3 + TypeScript compilada por Vite. `vite build` genera assets estáticos en `dist/`; `public/` se copia al directorio de salida. No hay SSR, API frontend ni código de servidor en el repositorio.
- `pnpm build` ejecuta primero `pnpm run typecheck` y después `pnpm exec vite build`. Requiere Node `24.22.1` (`.nvmrc`, `engines: >=24 <25`) y pnpm `11.28.8` (`packageManager` en `package.json`). La instalación reproducible es `pnpm install --frozen-lockfile`.
- `netlify.toml` define una sola regla: `/*` se reescribe a `/index.html` con estado 200. Es el fallback que permite que Vue Router, configurado con `createWebHistory()`, resuelva rutas como `/rankings` y `/statistics` al abrirlas directamente o recargarlas. No hay `[build]`, plugins, `_redirects` ni `_headers`.
- No hay workflow de GitHub que publique el frontend: `.github/workflows/quality.yml` corre verificaciones para `main` y `dev`; `release.yml` ejecuta semantic-release en `main`, no despliega el sitio. CF-2 confirmó que el proyecto Netlify sí está conectado a GitHub y publica automáticamente desde `main`. El panel fija `npm run build`, `dist` y Node `22.x`; la configuración local requiere Node `24.22.1` y el paquete declara pnpm `11.28.8`. La documentación histórica mencionaba Yarn, otra diferencia que no describe el panel actual.
- `.netlify` solo figura en `.gitignore` para datos locales. No está versionada una configuración de sitio, hook, plugin o integración de Netlify.
- El build no necesita servicios externos: GitHub Actions usa `setup-node`, Corepack y el caché de pnpm para calidad/release. `index.html` carga Font Awesome CSS desde cdnjs en runtime, pero no es un plugin ni una dependencia del despliegue. Spotify se integra a través del backend; su callback está configurado allí, no en Netlify.

## Dependencias y servicios de Netlify

| Capacidad | Evidencia en el repo | Estado de auditoría |
|---|---|---|
| Netlify Redirects / SPA rewrite | Regla `/* → /index.html`, status 200 en `netlify.toml` | **En uso**; imprescindible conservar el fallback equivalente. |
| Netlify Functions / Edge Functions | No se encontraron carpetas `netlify/functions`, `netlify/edge-functions` ni referencias a sus APIs | No hay uso encontrado. |
| Forms / Identity | Sin formularios configurados con Netlify ni llamadas a Netlify Identity | No hay uso encontrado. El login pertenece a Identity propio y al backend NestJS. |
| Headers | No existe `netlify.toml` con headers ni `_headers` | No hay política específica de headers versionada que migrar. |
| Build plugins / SDK / dependencias | Sin plugins en `netlify.toml`, paquetes Netlify en `package.json` ni SDKs específicos | No hay dependencia encontrada. |
| Previews, branch deploys, webhooks | No están configurados en workflows ni en archivos del repo | CF-2 confirma previews para PR contra `main`; branch deploys solo para producción (`main`); los build hooks están vacíos. No se vio un webhook/build hook adicional configurado. |
| Git deploy | El historial describe publicación desde la rama de producción de Netlify; no hay deploy workflow de GitHub | CF-2 confirma repo `riffvalley/riffvalley-app-front`, producción desde `main` y auto publishing activo. |

La mención `Funciona en Vite y Netlify` en un comentario de `SwalService` no es integración; el camino de assets citado es una ruta estática normal. El historial de sesiones mantiene instrucciones operativas de Netlify y rollback: son documentación de un despliegue anterior, no una dependencia de runtime.

## Build y variables de entorno

La compilación es client-side y las variables Vite se sustituyen durante el build. Cualquier valor con prefijo `VITE_` puede quedar visible en el bundle del navegador; aquí deben ser solo configuración pública, nunca secretos.

| Variable | Finalidad y uso | Obligatoria | Navegador | Cloudflare |
|---|---|---:|---|---|
| `VITE_API_BASE_URL` | Base URL del API NestJS. La usan Axios compartido, transporte de Identity y el servicio de lanzamientos nacionales. README la requiere. `.env.example` usa `/api` para desarrollo con proxy local. | Sí, para que las peticiones API apunten al host correcto. | Sí; valor público incorporado al bundle. | Configurada en Production de Pages con la URL verificada `https://backend.riffvalley.es/api`. Se retiró de Preview para evitar que previews llamen a producción. |
| `VITE_MAINTENANCE_MODE` | El guard del router activa la pantalla de mantenimiento solo cuando vale `true`; README la documenta. Está configurada en Netlify en todos los contexts; no se revela su valor. | No; ausente o `false` mantiene modo normal. | Sí; bandera pública incluida en bundle. | No se configuró en Pages. Se considera legacy para esta migración según la decisión del usuario; la única variable de aplicación necesaria es `VITE_API_BASE_URL`. |
| `VITE_CLIENT_ID` | Configurada en Netlify en todos los deploy contexts. Sin referencias en código/configuración del checkout actual. | No según el código actual. | Prefijo VITE; podría incluirse en bundle si se referencia. | No copiada a Pages; legacy según la decisión del usuario. |
| `VITE_CLIENT_SECRET` | Configurada en Netlify en todos los contexts. Netlify la marca como “Likely sensitive — not marked as secret”. No hay referencias en el código/configuración del checkout actual. No se leyó el valor. | No según el código actual. | Riesgo: `VITE_` es prefijo de cliente y no es apto para secretos; si el código lo consume, el valor puede acabar público. | No copiada a Pages; legacy según la decisión del usuario. No se trasladó ni se leyó su valor. |
| `API_PROXY_TARGET` | Destino HTTPS permitido del proxy de Vite, solo cuando `command === "serve"`; reenvía `/api` en desarrollo y fuerza el Origin de producción para probar refresh local. No participa en `vite build`. | No para compilación/despliegue. | No; configuración del servidor local. | No configurar para Pages/producción. Conservar solo donde se necesite desarrollo local. |
| `FQ_QUALITY_BASE_SHA`, `FQ_QUALITY_HEAD_SHA` | Referencias temporales usadas por scripts de calidad Markdown/arquitectura en GitHub Actions. | No para build del sitio. | No. | No trasladar; son variables del workflow de GitHub, no de runtime/build de la SPA. |
| `GITHUB_TOKEN` | Token provisto por GitHub Actions a semantic-release en `release.yml`. | No para build del sitio. | No. | No trasladar a Cloudflare. |
| `SPOTIFY_FRONTEND_REDIRECT_URL` | Callback OAuth configurado en backend, documentado en README; Spotify se usa a través del backend. | Requerida por el flujo de playlists en backend, no por el build frontend. | No como variable del bundle. | No trasladar al proyecto frontend; revisar el callback solo si cambia el origen público de la App. |

Se revisaron `.env.example` y el archivo `.env` local solo para inventariar nombres; no se copiaron valores al informe. `.env` está ignorado/no versionado. No se encontraron otras lecturas de `import.meta.env` en el código de aplicación. CF-2 verificó el valor público de `VITE_API_BASE_URL`; en CF-3 se configuró solo para Production de Pages. Las demás variables de Netlify se consideran legacy por decisión del usuario y no se copiaron.

## Dominios, autenticación y redirecciones

- La infraestructura confirmada por el usuario es: `riffvalley.es` aloja WordPress; `app.riffvalley.es` aloja App; `backend.riffvalley.es` aloja API; Wiki es independiente. La zona `riffvalley.es` ya está gestionada en Cloudflare. La migración CF-4 debe cambiar solo el destino del registro `app`, no el apex, el backend ni Wiki.
- Las notas de despliegue y validación de sesiones sitúan la App en `https://app.riffvalley.es` y el API en `https://backend.riffvalley.es`. Al conservar el hostname de la App no se busca un cambio de origen para CORS/cookies; aun así se debe validar login, CSRF, refresh y logout al servir Pages bajo el mismo `app.riffvalley.es`.
- `vite.config.ts` fija `SESSION_ORIGIN = https://app.riffvalley.es` únicamente para el proxy de desarrollo, coherente con el hostname que se conservará. Esta auditoría no modifica Identity ni el proxy.
- Las sesiones de App y Wiki son independientes y deben seguir siéndolo; no se propone SSO.
- No hay redirects de dominio configurados en el repo. Las redirecciones de rutas antiguas dentro de Vue Router son del lado cliente. La regla Netlify actual es un rewrite SPA, no un redirect de hostname.
- El callback de Spotify se configura en el backend y apunta históricamente a `app.riffvalley.es`; validar su destino solo si la decisión de hostname cambia.

## Cloudflare recomendado

**Cloudflare Pages con Git integration** encaja mejor en el estado actual: la salida es exclusivamente estática, no hay SSR, Functions ni endpoints que justifiquen un Worker. Pages permite conectar el repo, definir rama de producción, comando/directorio, variables por ambiente y preview deploys. Las guías oficiales describen build desde Git y fallback SPA de forma nativa ([Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/), [comportamiento SPA de Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)).

Configuración aplicada en CF-3:

| Campo | Valor verificado |
|---|---|
| Proyecto / repo / raíz | `riffvalley-app`; `riffvalley/riffvalley-app-front`; raíz del repo. Framework preset: None. |
| Rama de producción | `main`, despliegue automático habilitado. |
| Build / salida | `pnpm build` / `dist`. |
| Node / pnpm | Node `24.22.1` / pnpm `11.28.8`, fijados mediante `NODE_VERSION` y `PNPM_VERSION`; ambos confirmados en el log. |
| Variables | Production: `VITE_API_BASE_URL` con la URL verificada del backend. `NODE_VERSION` y `PNPM_VERSION` fijan herramientas del build. No se copiaron las demás variables Netlify, consideradas legacy. Preview conserva los pins, pero no `VITE_API_BASE_URL`. |
| Fallback SPA | La URL temporal sirvió la aplicación al navegar directamente a `/rankings`, sin 404 de hosting. No se añadió `404.html`, `_redirects` ni configuración adicional. |
| Headers / redirects | No hay reglas propias que migrar. Pages admite `_headers` y `_redirects` en los assets publicados; añadirlos solo ante una política concreta aprobada ([headers](https://developers.cloudflare.com/pages/configuration/headers/), [redirects](https://developers.cloudflare.com/pages/configuration/redirects/)). |
| Dominios | `https://riffvalley-app.pages.dev` y URL de despliegue `https://fa62f8a3.riffvalley-app.pages.dev`. No se asoció `app.riffvalley.es`; el registro actual permanece intacto. |

No se ha creado `wrangler.toml/jsonc` ni se necesita Wrangler para el camino Git de Pages propuesto. Workers Static Assets también puede alojar una SPA, pero exige configurar el despliegue de assets en Wrangler y aporta capacidades de Worker no usadas por este repo; no es la opción mínima actual.

El despliegue de `main` completó correctamente: Cloudflare clonó el commit `4050daea2a54b476b66d973871162bd2aa7f08c9` (`4050dae`), instaló Node 24.22.1 y pnpm 11.28.8, ejecutó `pnpm build` (typecheck y Vite) y publicó los assets. El panel mostró Production/`main`, SHA `4050dae`, publicación automática activa y las dos URLs `pages.dev`. El log indicó que no encontró configuración Wrangler, que no se necesita para este flujo Pages estático.

La página principal y la ruta directa `/rankings` cargaron el shell SPA, que referencia JS y CSS generados por el build. La interfaz del navegador no expuso códigos HTTP exactos para recursos. En la URL temporal, la interfaz informó que no podía conectar con autenticación. El endpoint configurado es el backend esperado, pero no se verificó si la causa es CORS/origen `pages.dev` u otra condición: no se consultaron logs del backend ni se modificó su configuración. La autenticación debe validarse desde el dominio definitivo en CF-4.

## Riesgos y bloqueos

| Prioridad | Hallazgo | Evaluación / mitigación |
|---|---|---|
| **P1 — Autenticación temporal** | El shell SPA carga en `pages.dev`, pero la interfaz informa que no puede conectar con autenticación. | Causa no confirmada; el origen temporal podría no estar permitido por CORS. No es bloqueo del build ni evidencia de fallo del backend. Validar login y sesión al asociar el hostname definitivo y comprobar API/CORS sin cambiar backend en CF-3. |
| **P2 — Variables legacy en Netlify** | Netlify conserva variables adicionales, incluida una llamada `VITE_CLIENT_SECRET`, que el checkout actual no referencia. | No se copiaron a Pages por decisión del usuario. `VITE_API_BASE_URL` es la única variable de aplicación requerida; los pins de Node/pnpm son configuración del build. No se modificó ni eliminó la configuración Netlify. |
| **P2 — Variables de Deploy Preview** | Netlify aplica `VITE_API_BASE_URL` de producción a Deploy Previews. | En Pages se retiró `VITE_API_BASE_URL` de Preview. El panel indica que las previews son públicas por defecto; no apuntarlas a producción hasta definir el aislamiento. |
| **P1 — Dominio Pages / HTTP 522** | El DNS actual se revirtió a CNAME proxied `spammusic.netlify.app`, pero `app.riffvalley.es` aún responde 522. Pages conserva el dominio asociado con estado “Verifying / Complete DNS setup”. | Incidencia sin causa confirmada. No volver a mover tráfico hasta diagnosticar el estado de Pages/DNS. El apex WordPress y `backend.riffvalley.es` permanecen intactos. |
| **P1 — Sesión bajo el dominio de producción** | La App usa cookies HttpOnly y solicitudes con credenciales; Pages aún no sirve bajo `app.riffvalley.es`. | En CF-4 validar login, bootstrap CSRF, refresh y logout desde el hostname final y confirmar CORS/cookies antes de dar el corte por aceptado. |
| **P2 — Instalación/build distintos** | Netlify tiene Node 22.x y `npm run build`; Pages ejecutó Node 24.22.1, pnpm 11.28.8, `pnpm build` y `dist`. | El build temporal pasó con las versiones declaradas por el repo. La diferencia respecto a Netlify queda aislada en Pages; comparar el comportamiento funcional antes del corte. |
| **P2 — Deep links** | Netlify depende de una rewrite explícita; Pages tiene fallback SPA automático sujeto a su comportamiento de deploy/404. | Probar carga directa y refresh de varias rutas tanto en `pages.dev` como tras dominio. |
| **P2 — Caché/rollback** | Los assets estáticos se cachean y el host cambia; no hay reglas de caché propias versionadas. | Comprobar que el HTML apunta a assets del mismo deploy, validar login y conservar Netlify listo para republish/rollback. No purgar caché salvo evidencia de stale content. |
| **P3 — Automatizaciones** | CF-2 confirma auto publishing desde `main`, previews de PR y ningún build hook definido. | Al crear Pages, elegir explícitamente eventos/branches de producción y preview para evitar despliegues duplicados o no deseados. |

No se confirma una incompatibilidad funcional con Cloudflare ni uso de APIs propietarias de Netlify fuera del fallback SPA. Los puntos clasificados son riesgos de transición, configuración no visible o decisiones por confirmar, no defectos actuales confirmados.

## Plan de migración

### CF-2 — Preparación

**Verificación completada.** El panel confirma los valores de Netlify y la zona DNS; la configuración observada en ese momento y diferencias están registradas arriba. CF-3 confirmó la integración GitHub y la selección de `main`. Las precauciones identificadas entonces fueron:

1. Conectar este repositorio y confirmar `main` como producción (hecho en CF-3).
2. Configurar Node `24.22.1`, pnpm `11.28.8`, `pnpm build`, `dist` y la única variable de aplicación `VITE_API_BASE_URL` en Production (hecho en CF-3).
3. No trasladar las demás variables Netlify, consideradas legacy por decisión del usuario. No se copiaron a Pages.
4. No publicar una URL de API de producción a previews: Pages Preview no tiene `VITE_API_BASE_URL`; el panel indica que previews son públicas por defecto.
5. No asociar `app.riffvalley.es` ni tocar DNS durante CF-3. Mantener Netlify con auto publishing como origen de producción hasta CF-4.

**Preparación para CF-3: completada.** El proyecto se creó con el repo correcto y `main`; no existía un Pages project equivalente para App.

### CF-3 — Despliegue temporal

**Estado: completada el 2026-10-30.** Proyecto `riffvalley-app`; URL temporal `https://riffvalley-app.pages.dev`; repo `riffvalley/riffvalley-app-front`; rama `main`; commit `4050dae`; build `pnpm build`; salida `dist`; Node `24.22.1`; pnpm `11.28.8`. `VITE_API_BASE_URL` se configuró solo en Production; las demás variables de Netlify se consideran legacy y no se copiaron. El build y la publicación finalizaron correctamente.

La página principal y `/rankings` cargaron el shell SPA; el documento referencia JS y CSS del build. La interfaz informó que no podía conectar con autenticación en `pages.dev`; que el origen/CORS sea la causa es una hipótesis, y el flujo de sesión queda pendiente. No se cambió DNS ni se asoció `app.riffvalley.es`. Las previews son públicas por defecto y no llevan la URL de producción del API.

Para aceptar funcionalmente producción en CF-4 habrá que probar login, CSRF, refresh y logout bajo el hostname final, validar CORS y verificar rutas directas y recarga. Netlify permanece disponible y publicando `main`.

### CF-4 — Cambio de dominio

#### Comprobación previa de CF-4 (2026-10-30; antes del cambio)

- Pages sigue siendo el proyecto `riffvalley-app`, conectado a `riffvalley/riffvalley-app-front`, con `main` como rama de producción y auto deploy activo. El panel publica `4050dae`, el mismo commit que Netlify tiene como producción actual (`main@4050dae`). La URL Pages de producción es `https://riffvalley-app.pages.dev`.
- Los nombres de variables Production siguen siendo `NODE_VERSION`, `PNPM_VERSION` y `VITE_API_BASE_URL`; en Preview permanecen solo los dos pins de herramientas. No se leyeron ni se registraron valores de secretos.
- Netlify conserva `app.riffvalley.es` como dominio primario y `spammusic.netlify.app` como hostname alternativo. HTTPS está habilitado con certificado Let's Encrypt para `app.riffvalley.es`; el panel indicaba renovación automática antes del 2027-01-18.
- La zona Cloudflare `riffvalley.es` continúa con DNS completo. El registro actual relevante es `app.riffvalley.es CNAME spammusic.netlify.app`, proxy activo, TTL Auto. Se observaron 37 registros en la zona. El apex `riffvalley.es` (WordPress) es un registro A DNS only; `backend.riffvalley.es` conserva su CNAME proxied a Heroku. Ninguno forma parte del cambio.
- Cloudflare Edge Certificates muestra un certificado Universal **Active** que cubre `*.riffvalley.es` y `riffvalley.es`, con vencimiento 2027-01-12, además de un certificado de respaldo emitido. Al estar activa la zona completa y proxied el hostname, el certificado de borde vigente ya cubre `app.riffvalley.es`; Cloudflare gestiona emisión/renovación. La asociación de Pages todavía debe alcanzar estado activo y comprobar HTTPS después del cambio.
- Pages Custom domains todavía no incluye `app.riffvalley.es`.
- La navegación a `https://app.riffvalley.es/` respondió con la aplicación y su título esperado. Esto confirma acceso HTTPS al frontend actual, no prueba por sí solo el flujo de inicio de sesión.

**Cambio aprobado y ejecutado parcialmente:** asociar `app.riffvalley.es` en el proyecto `riffvalley-app`. Como la zona DNS ya está en la misma cuenta Cloudflare, se usó el flujo oficial de Pages, que actualizó automáticamente el CNAME proxied a `riffvalley-app.pages.dev`; no se añadió manualmente un CNAME. El cambio dirige las solicitudes públicas de App al deploy de Pages sin cambiar la URL visible. La activación dio HTTP 522, por lo que el registro se revirtió.

**Reversión prevista:** conservar el proyecto y dominio de Netlify. Si Pages falla, restaurar únicamente el registro `app` a CNAME `spammusic.netlify.app`, proxy activo y TTL Auto, con los mismos ajustes observados; verificar HTTPS y la App en Netlify. No borrar la asociación ni recursos de Netlify salvo necesidad técnica y autorización expresa. La documentación oficial exige asociar primero el hostname en Pages; para una zona gestionada en Cloudflare, Pages añade el CNAME al confirmar el registro. Un CNAME manual previo puede provocar error 522 ([Cloudflare Pages: Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)). El certificado Universal activo y su gestión automática están descritos en [Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/).

Antes de recibir aprobación no se había asociado el dominio ni cambiado DNS. Tras la aprobación se ejecutó el intento descrito a continuación; la configuración de Netlify no se alteró.

#### Intento y reversión de CF-4 (2026-10-30)

- En Pages se siguió **Set up a custom domain** para `app.riffvalley.es` y se confirmó la actualización gestionada por Cloudflare del CNAME `app` a `riffvalley-app.pages.dev`, con TTL Auto y proxy activo. El panel indicó que el dominio estaba “Initializing”.
- La comprobación de `https://app.riffvalley.es/` devolvió la página de Cloudflare **HTTP 522**. Se detuvo la migración y, conforme a la reversión aprobada, se restauró únicamente el CNAME a `spammusic.netlify.app`, conservando proxy activo y TTL Auto. La vista DNS confirmó que `backend.riffvalley.es` seguía igual.
- Después de la reversión, `https://app.riffvalley.es/` seguía devolviendo HTTP 522. La URL `https://spammusic.netlify.app/` respondió con el shell de la App, lo que confirma que Netlify conserva el deploy, pero no que el hostname personalizado esté recuperado.
- Seguimiento de solo lectura el 2026-10-30 a las 12:24 UTC: `https://app.riffvalley.es/` volvió a mostrar la App y la navegación directa a `/rankings` cargó el shell SPA. El CNAME seguía apuntando a Netlify, así que esto confirma recuperación aparente del hostname, no que Pages esté sirviendo el dominio. El mismo JS/CSS se genera desde el commit compartido por ambos proveedores y no permite distinguir el origen.
- Pages mantiene `app.riffvalley.es` asociado y muestra estado “Verifying / Complete DNS setup” con el CNAME ya restaurado a Netlify. No se quitó la asociación, no se eliminó el dominio de Netlify y no se hicieron más cambios. La asociación pendiente podría estar relacionada con el error, pero no se ha determinado la causa.
- HTTPS conecta a Cloudflare y entrega su página 522; la aplicación de Pages no quedó servida ni se completó la verificación de API/assets/rutas bajo el dominio. El certificado Universal `*.riffvalley.es` sigue apareciendo **Active** en el panel de la zona. No se cambió configuración de certificados.

**Estado:** CF-4 no está completada. El último seguimiento sirvió la App y `/rankings` con el CNAME restaurado a Netlify, pero Pages sigue “Verifying / Complete DNS setup”; por tanto, el dominio de producción no está migrado. No reintentar el cambio hasta resolver el estado de Pages. No se ha tocado WordPress, backend, Wiki, otros registros ni configuración de Netlify.

**La secuencia siguiente queda pendiente de un nuevo intento, después de diagnosticar la incidencia y autorizar su continuación:**

1. Volver a inspeccionar los DNS actuales y confirmar que `app.riffvalley.es` sigue siendo CNAME proxied a `spammusic.netlify.app`. Revisar el conjunto de registros para evitar impacto en otros subdominios; no cambiar WordPress, API ni Wiki.
2. Revisar el estado “Verifying / Complete DNS setup” del dominio ya asociado en Pages y determinar la causa del 522 antes de volver a apuntar tráfico.
3. Solo después de resolver el bloqueo, preparar una nueva activación por el flujo Pages y comprobar que el hostname/certificado están activos.
4. Validar resolución, HTTPS, página, rutas, API, CORS y sesión desde `app.riffvalley.es`. Mantener Netlify disponible durante la observación.
5. Si vuelve a fallar, restaurar el CNAME previo `spammusic.netlify.app` con el mismo estado de proxy. No borrar el proyecto ni la configuración de Netlify.

## Criterios de aceptación

### CF-3 (temporal)

- Pages publica desde `main` con Node 24.22.1, pnpm 11.28.8, `pnpm build` y `dist`; quedan anotados el commit `4050dae` y el build satisfactorio.
- La URL temporal sirve el shell SPA en `/` y `/rankings`; la autenticación/API en `pages.dev` no queda aceptada por el error de conexión observado.
- No se asociaron dominios ni se modificaron DNS o Netlify.

### Migración completa (tras CF-4)

- `main` publica de forma reproducible en Pages con Node 24.22.1, pnpm 11.28.8, `pnpm build` y artefactos `dist`.
- La URL temporal sirve assets y rutas directas/recargadas de Vue Router; no hay errores de carga de chunks.
- La API apunta al destino aprobado y no hay secretos en el bundle o variables `VITE_*`.
- Login, CSRF, sesión al recargar, renovación, logout y permisos funcionan desde el hostname de destino con CORS/cookies aprobados.
- El dominio y HTTPS sirven la app esperada; los otros registros DNS y servicios permanecen operativos.
- Hay evidencia del commit publicado, valores de configuración (sin secretos), resultado de smoke checks y rollback disponible.
- Netlify se conserva hasta confirmar la estabilidad en producción; su retirada es una acción posterior autorizada, no parte de CF-1.

## Reversión

Durante CF-3, rollback consiste en dejar intacto el dominio público en Netlify y corregir Pages sin afectar producción. En el intento CF-4 se restauró el CNAME previo `spammusic.netlify.app`, con proxy y TTL Auto, pero el hostname aún respondió 522; la reversión DNS por sí sola no restableció el acceso. Netlify y Pages siguen disponibles, y no se eliminó la asociación del dominio de Pages. Diagnosticar y comprobar el estado de la asociación, DNS, HTTPS, rutas, login y API antes de reintentar; tener en cuenta propagación y caché. No retirar Netlify hasta validar Pages estable.

## Trabajo posterior fuera de CF-1/CF-3

- **Beta:** solo después de estabilizar producción, decidir rama `beta`, hostname `beta.riffvalley.es`, variables de preview y si se usará Branch Preview o entorno separado. No se crea la rama en esta fase.
- **Wiki:** se migrará más adelante como proyecto independiente, con su propio inventario de build, variables, dominio y autenticación. Sus sesiones seguirán independientes; esta auditoría no inicia su migración ni propone SSO.
