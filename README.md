# Web Eidon Aetho

Página personal estática de Eidon Aetho. El contenido público se mantiene en archivos del repositorio y, cuando la web se despliegue en Cloudflare Pages, podrá complementar la sección de publicaciones con los videos públicos del canal oficial de YouTube.

## Publicación actual

GitHub Pages usa:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

No se necesita un workflow de despliegue. El workflow del repositorio valida los cambios.

## Publicación futura en Cloudflare Pages

El repositorio puede mantenerse privado mientras la web permanece pública. Cloudflare Pages accede al repositorio mediante la aplicación autorizada de GitHub y despliega automáticamente la rama `main`.

La preparación de Cloudflare se documenta en `cloudflare/README.md`.

La integración prevista usa:

- un enlace destacado al perfil oficial de X;
- una Pages Function del mismo dominio para consultar los videos públicos del canal de YouTube;
- una clave de YouTube guardada únicamente como secreto en Cloudflare;
- paginación para recorrer todos los videos públicos sin copiar archivos ni alojar multimedia propia.

## Estructura

```text
assets/                  imágenes y recursos locales
data/
  projects.json          proyectos publicados
  socials.json           enlaces oficiales
  notes.json             respaldo estático de notas
  ads.json               anuncios patrocinados
functions/api/
  youtube.js             consulta pública del canal de YouTube en Cloudflare Pages
cloudflare/
  README.md               guía de despliegue privado → público
scripts/
  prerender.py            genera HTML estático, JSON-LD y hashes de caché
  validate_static.py      valida HTML, CSP, sitemap, robots y página 404
.github/workflows/
  reference-checks.yml    controles obligatorios del repositorio
404.html                  página para rutas inexistentes
sitemap.xml               URL indexable del sitio
robots.txt                reglas de rastreo y referencia al sitemap
app.js                    proyectos y enlaces actuales
youtube-feed.v1.js        galería progresiva de YouTube
youtube-feed.v1.css       diseño de X y YouTube
ads.js                    carrusel de anuncios
index.html                documento publicado
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

## Nota estática de respaldo

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

Después de editar los archivos de `data/`, ejecuta:

```powershell
python scripts/prerender.py
```

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
node --check youtube-feed.v1.js
node --check functions/api/youtube.js
```

El job de GitHub Actions se llama exactamente `reference-checks`.

## Dominio propio

Al cambiar de dominio, actualiza:

- canonical, Open Graph y Twitter Card en `index.html`;
- `SITE_URL` y `PROFILE_IMAGE_URL` en `scripts/prerender.py`;
- la URL de `sitemap.xml` y `robots.txt`;
- el enlace de inicio en `404.html`.

Después ejecuta la generación y las validaciones.

## Seguridad

- No publiques contraseñas, tokens, llaves privadas ni archivos `.env` o `.dev.vars`.
- La clave de YouTube se configura como secreto en Cloudflare.
- No publiques identificadores internos de Cloudflare que no sean necesarios.
- Verifica el destino de cada enlace y anuncio.
- Revisa y valida los cambios antes de fusionarlos con `main`.
