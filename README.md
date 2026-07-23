# Web Eidon Aetho

Página personal de Eidon Aetho con publicación cerrada por defecto.

La web no descubre, agrega ni publica proyectos, repositorios, canales, enlaces o anuncios automáticamente. El contenido solo aparece cuando el propietario lo escribe manualmente en los archivos JSON.

## Publicación con GitHub Pages

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

No se necesita GitHub Actions.

## Archivos controlados por el propietario

- `data/projects.json`: proyectos y enlaces opcionales.
- `data/socials.json`: canales, perfiles u otros enlaces.
- `data/notes.json`: notas públicas.
- `data/ads.json`: anuncios del carrusel horizontal.

Los archivos que todavía no tienen contenido deben conservar una lista JSON vacía:

```json
[]
```

## Agregar un proyecto

Edita `data/projects.json`:

```json
{
  "name": "",
  "category": "",
  "description": "",
  "tags": [],
  "image": "assets/imagen-del-proyecto.webp",
  "imageAlt": "",
  "url": "",
  "linkLabel": "Ver detalles →",
  "featured": true,
  "visible": true,
  "order": 10
}
```

Usa preferentemente imágenes guardadas dentro de `assets/`. Los enlaces externos y las imágenes remotas deben usar HTTPS.

## Agregar un enlace

Edita `data/socials.json`:

```json
{
  "name": "",
  "description": "",
  "icon": "",
  "url": "",
  "visible": true,
  "order": 10
}
```

## Agregar una nota

Edita `data/notes.json`:

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

## Agregar un anuncio

Edita `data/ads.json`. El anuncio solo se muestra cuando la URL HTTPS es válida y `visible` es `true`.

```json
{
  "label": "AD 01",
  "title": "",
  "description": "",
  "accent": "#c8f35a",
  "url": "",
  "visible": true,
  "order": 10
}
```

`accent` acepta únicamente colores hexadecimales completos como `#c8f35a`. Los anuncios externos se abren con atributos de seguridad y relación `sponsored`.

## Reglas de seguridad

- No publiques repositorios, documentos o enlaces delicados.
- No guardes contraseñas, tokens, llaves privadas ni archivos `.env` en el repositorio.
- Revisa el destino de cada anuncio antes de publicarlo.
- Mantén `url` como cadena vacía cuando no quieras crear un enlace.
- Usa `visible: false` para ocultar un elemento sin borrarlo.
- Revisa el contenido antes de fusionarlo con `main`.

<!-- PRERENDER-DOCS:START -->
## Pre-renderizado

`data/projects.json`, `data/socials.json` y `data/notes.json` siguen siendo la fuente de verdad.

Despues de editar esos archivos, regenera el fallback HTML:

```powershell
python scripts/prerender.py
```

El script actualiza el bloque `PRERENDER` dentro de `index.html`. El contenido queda disponible sin JavaScript y para crawlers que solo leen HTML. Cuando `app.js` termina de renderizar la interfaz interactiva, oculta el fallback mediante la clase `content-hydrated`.

No requiere un workflow personalizado de GitHub Pages.
<!-- PRERENDER-DOCS:END -->
