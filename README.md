# Web Eidon Aetho

Centro personal de Eidon Aetho con publicación cerrada por defecto.

La web no descubre, agrega ni publica proyectos, repositorios, canales o enlaces automáticamente. El contenido solo aparece cuando el propietario lo escribe manualmente en los archivos JSON.

## Publicación con GitHub Pages

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

No se necesita GitHub Actions.

## Archivos controlados por el propietario

- `data/projects.json`: proyectos y enlaces opcionales.
- `data/socials.json`: canales, perfiles u otros enlaces.
- `data/notes.json`: notas públicas sin enlace obligatorio.

Los tres archivos empiezan como listas vacías:

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

## Reglas de seguridad

- No publiques la URL de un repositorio delicado.
- Mantén `url` como cadena vacía cuando no quieras crear un enlace.
- Usa `visible: false` para ocultar un elemento sin borrarlo.
- Revisa el contenido antes de fusionarlo con `main`.
