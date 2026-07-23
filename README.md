# Web Eidon Aetho

Página personal estática de Eidon Aetho. El contenido principal se conserva en archivos JSON del repositorio. La preparación opcional para Cloudflare Pages permite sincronizar notas desde Telegram sin romper el funcionamiento estático actual.

## Publicación actual

GitHub Pages debe usar:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

No se necesita un workflow de despliegue. El workflow del repositorio solo valida cambios.

## Publicación futura en Cloudflare Pages

La preparación técnica está documentada en [`cloudflare/README.md`](cloudflare/README.md).

La arquitectura prevista utiliza:

- Pages para los archivos estáticos;
- Pages Functions únicamente en `/api/*` y `/media/*`;
- D1 para metadatos y estado de las notas;
- R2 para imágenes, videos, audios y documentos;
- Telegram como fuente de publicación;
- `data/notes.json` como respaldo estático si la API no está disponible.

Los tokens y secretos nunca se guardan en el repositorio.

## Estructura

```text
assets/                         imágenes y recursos locales
cloudflare/
  README.md                     guía de despliegue y conexión con Telegram
  d1/schema.sql                 esquema de la base de notas
  wrangler.toml.example         ejemplo de bindings sin secretos
data/
  projects.json                 proyectos publicados
  socials.json                  enlaces oficiales
  notes.json                    respaldo estático de notas
  ads.json                      anuncios patrocinados
functions/
  api/notes.js                  API pública paginada
  api/telegram/webhook.js       webhook privado de Telegram
  media/[[path]].js             entrega multimedia desde R2
scripts/
  prerender.py                  genera HTML estático, JSON-LD y hashes de caché
  validate_static.py            valida HTML, CSP, sitemap, robots y página 404
.github/workflows/
  reference-checks.yml          controles obligatorios del repositorio
_routes.json                    limita las invocaciones de Pages Functions
404.html                        página para rutas inexistentes
sitemap.xml                     URL indexable del sitio
robots.txt                      reglas de rastreo y referencia al sitemap
app.js                          proyectos, enlaces y notas estáticas
cloudflare-notes.js             mejora progresiva para notas de la API
cloudflare-notes.css            presentación multimedia
ads.js                          carrusel de anuncios
index.html                      documento publicado
```

## Contrato de contenido

Todos los archivos de `data/` contienen una lista JSON. Cada elemento debe incluir:

- `visible`: booleano. Solo `true` publica el elemento.
- `order`: número usado para ordenar.

Cuando no exista contenido, conserva una lista vacía:

```json
[]
```

Los enlaces externos deben usar HTTPS. Las imágenes pueden usar HTTPS o una ruta local bajo `assets/`.

## Proyecto

Ejemplo para `data/projects.json`:

```json
{
  "name": "",
  "category": "",
  "description": "",
  "tags": [],
  "image": "assets/projects/imagen.webp",
  "imageAlt": "",
  "url": "",
  "linkLabel": "Ver detalles →",
  "visible": true,
  "order": 10
}
```

## Enlace oficial

Ejemplo para `data/socials.json`:

```json
{
  "name": "",
  "description": "",
  "icon": "",
  "url": "https://example.com",
  "visible": true,
  "order": 10
}
```

Los enlaces visibles se generan dentro del hero y también alimentan `sameAs` en el JSON-LD. Si la carga dinámica falla, el HTML conserva esos enlaces estáticos.

## Nota estática

Ejemplo para `data/notes.json`:

```json
{
  "date": "",
  "category": "",
  "title": "",
  "description": "",
  "visible": true,
  "order": 10
}
```

En Cloudflare Pages, la API devuelve además `id`, `source`, `publishedAt`, `editedAt`, `body`, `media` y `permalink`. La web solo usa esa API cuando está disponible; en GitHub Pages conserva el JSON estático.

## Anuncio

Ejemplo para `data/ads.json`:

```json
{
  "label": "AD 01",
  "title": "",
  "description": "",
  "accent": "#c8f35a",
  "url": "https://example.com",
  "visible": true,
  "order": 10
}
```

`accent` acepta colores hexadecimales completos. Los anuncios externos se abren con `noopener`, `noreferrer` y `sponsored`.

## Generación estática

`projects.json`, `socials.json` y `notes.json` son la fuente de respaldo estático. Después de editarlos, ejecuta:

```powershell
python scripts/prerender.py
```

El script actualiza:

- enlaces sociales estáticos del hero;
- contadores estáticos;
- fallback HTML de proyectos y notas;
- JSON-LD `Person` y su lista `sameAs`;
- hash CSP que autoriza únicamente ese JSON-LD inline;
- versiones de caché de los recursos registrados.

Para comprobar que el repositorio está actualizado sin modificar archivos:

```powershell
python scripts/prerender.py --check
```

## Verificación local

```powershell
python -m py_compile scripts/prerender.py
python -m py_compile scripts/validate_static.py
python scripts/prerender.py --check
python scripts/validate_static.py
node --check app.js
node --check ads.js
node --check cloudflare-notes.js
node --check functions/api/notes.js
node --check functions/api/telegram/webhook.js
node --check functions/media/[[path]].js
```

El job de GitHub Actions se llama exactamente `reference-checks`.

## Dominio propio

Al cambiar de dominio, actualiza:

- canonical, Open Graph y Twitter Card en `index.html`;
- `SITE_URL` y `PROFILE_IMAGE_URL` en `scripts/prerender.py`;
- la URL de `sitemap.xml` y `robots.txt`;
- el enlace de inicio en `404.html`;
- `TELEGRAM_CHANNEL_URL` y la URL del webhook si corresponde.

Después ejecuta la generación y las validaciones.

## Seguridad

- No publiques contraseñas, tokens, llaves privadas, `.env`, `.dev.vars` ni `wrangler.toml` con identificadores delicados.
- No publiques repositorios, documentos o enlaces delicados.
- Verifica el destino de cada enlace y anuncio.
- Usa `visible: false` para retirar contenido estático sin borrarlo.
- El webhook exige el secreto enviado por Telegram y filtra el canal autorizado.
- Revisa y valida los cambios antes de fusionarlos con `main`.
