# Web Eidon Aetho

Centro personal de Eidon Aetho con publicación cerrada por defecto.

La web no descubre, agrega ni publica proyectos, repositorios, canales, enlaces o anuncios automáticamente. El contenido solo aparece cuando el propietario lo escribe manualmente en los archivos JSON.

## Publicación con GitHub Pages

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

No se necesita GitHub Actions.

## Archivos controlados por el propietario

- `data/projects.json`: proyectos y enlaces opcionales.
- `data/socials.json`: canales, perfiles u otros enlaces.
- `data/notes.json`: notas públicas sin enlace obligatorio.
- `data/ads.json`: anuncios del carrusel horizontal.

Los cuatro archivos empiezan como listas vacías:

```json
[]
```

## Agregar un proyecto

Edita `data/projects.json` y agrega un objeto como este. La URL queda vacía hasta que el propietario decida escribirla.

```json
{
  "name": "",
  "category": "",
  "description": "",
  "tags": [],
  "url": "",
  "visible": true,
  "order": 10
}
```

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

Edita `data/ads.json`. El anuncio solo se muestra cuando la URL es válida y `visible` es `true`.

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

`accent` acepta únicamente colores hexadecimales completos como `#c8f35a`. Los enlaces externos se abren con atributos de seguridad y relación `sponsored`.

## Reglas de seguridad

- No publiques la URL de un repositorio delicado.
- No agregues una campaña publicitaria hasta revisar su destino y condiciones.
- Mantén `url` como cadena vacía cuando no quieras crear un enlace.
- Usa `visible: false` para ocultar un elemento sin borrarlo.
- Revisa el contenido antes de fusionarlo con `main`.
