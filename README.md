# Web Eidon Aetho

Página personal estática de Eidon Aetho. El contenido se publica únicamente desde los archivos JSON del repositorio; la web no descubre ni agrega proyectos, enlaces, notas o anuncios automáticamente.

## Publicación

GitHub Pages debe usar:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

No se necesita un workflow de despliegue. El workflow del repositorio solo valida cambios.

## Estructura

```text
assets/                  imágenes y recursos locales
data/
  projects.json          proyectos publicados
  socials.json           enlaces oficiales
  notes.json             notas públicas
  ads.json               anuncios patrocinados
scripts/
  prerender.py           genera HTML estático, JSON-LD y hashes de caché
  validate_static.py     valida HTML, CSP, sitemap, robots y página 404
.github/workflows/
  reference-checks.yml   controles obligatorios del repositorio
404.html                  página para rutas inexistentes
sitemap.xml               URL indexable del sitio
robots.txt                reglas de rastreo y referencia al sitemap
app.js                    proyectos, enlaces y notas
ads.js                    carrusel de anuncios
index.html                documento publicado por GitHub Pages
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

## Nota

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

`projects.json`, `socials.json` y `notes.json` son la fuente de verdad. Después de editarlos, ejecuta:

```powershell
python scripts/prerender.py
```

El script actualiza:

- enlaces sociales estáticos del hero;
- contador de enlaces;
- fallback HTML de proyectos y notas;
- JSON-LD `Person` y su lista `sameAs`;
- hash CSP que autoriza únicamente ese JSON-LD inline;
- versiones de caché de `app.js`, `ads.js`, `ad-marquee.css` y `hero-profile.css`.

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

- No publiques contraseñas, tokens, llaves privadas ni archivos `.env`.
- No publiques repositorios, documentos o enlaces delicados.
- Verifica el destino de cada enlace y anuncio.
- Usa `visible: false` para retirar contenido sin borrarlo.
- Revisa y valida los cambios antes de fusionarlos con `main`.
