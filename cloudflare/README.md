# Cloudflare Pages: repositorio privado, web pública

Esta preparación permite mantener `Web-Eidon-Aetho` como repositorio privado en GitHub y publicar la página de forma pública mediante Cloudflare Pages.

Cloudflare accede únicamente al repositorio autorizado mediante su aplicación de GitHub. Cada `push` a `main` crea un despliegue de producción; las ramas y pull requests pueden generar vistas previas separadas.

## Arquitectura elegida

```text
Repositorio privado en GitHub
          ↓
Cloudflare Pages
          ├─ archivos estáticos de la web
          └─ /api/youtube → YouTube Data API

Página pública
          ├─ vínculo destacado al perfil oficial de X
          └─ galería paginada de videos públicos de YouTube
```

No se usa Telegram, D1, R2 ni una copia propia de los videos.

Los videos permanecen alojados en YouTube. La web muestra miniaturas, títulos y fechas; al seleccionar uno, abre el video oficial en YouTube.

## Archivos preparados

- `_routes.json`: ejecuta Pages Functions únicamente en `/api/youtube`.
- `functions/api/youtube.js`: consulta la lista de videos subidos del canal.
- `youtube-feed.v1.js`: renderiza y pagina la galería.
- `youtube-feed.v1.css`: presenta X y YouTube en un diseño responsive.
- `.dev.vars.example`: variables para desarrollo local sin credenciales reales.
- `cloudflare/wrangler.toml.example`: configuración local de referencia.

## 1. Conectar el repositorio privado

1. En Cloudflare abre **Workers & Pages**.
2. Selecciona **Create application → Pages → Connect to Git**.
3. Autoriza la aplicación **Cloudflare Workers and Pages** en GitHub.
4. Limita el acceso a **Only select repositories** y selecciona este repositorio.
5. Elige `main` como rama de producción.
6. Usa `/` como directorio raíz y no configures comando de build.

La web seguirá siendo pública aunque el repositorio sea privado.

## 2. Crear una clave para YouTube Data API

En Google Cloud:

1. Crea o selecciona un proyecto.
2. Activa **YouTube Data API v3**.
3. Crea una clave API.
4. Restringe la clave a **YouTube Data API v3**.
5. Guarda la clave únicamente como secreto en Cloudflare.

La clave nunca debe aparecer en GitHub, HTML o JavaScript del navegador.

## 3. Variables de Cloudflare Pages

En **Settings → Variables and Secrets** configura:

| Nombre | Tipo | Uso |
|---|---|---|
| `YOUTUBE_API_KEY` | Secret | clave de YouTube Data API |
| `YOUTUBE_CHANNEL_ID` | Variable | identificador del canal que empieza por `UC` |
| `YOUTUBE_CHANNEL_URL` | Variable | `https://www.youtube.com/@eidon-aetho` |
| `YOUTUBE_UPLOADS_PLAYLIST_ID` | Variable opcional | lista de subidas del canal |

`YOUTUBE_UPLOADS_PLAYLIST_ID` es opcional. Si no se configura, la Function obtiene la lista de subidas mediante `channels.list`.

## 4. Comprobar la API

Después del despliegue abre:

```text
https://TU-PROYECTO.pages.dev/api/youtube?limit=12
```

La respuesta debe contener:

```json
{
  "items": [],
  "pagination": {
    "nextPageToken": null,
    "totalResults": 0
  }
}
```

Cuando existan más videos, `nextPageToken` permite cargar la siguiente página. El botón **Cargar más videos** recorre todas las páginas disponibles.

## 5. Comportamiento antes de activar Cloudflare

En GitHub Pages, `/api/youtube` no existe. La sección mantiene:

- el vínculo visible a X;
- el vínculo al canal de YouTube;
- un mensaje indicando que la galería automática se activará en Cloudflare Pages.

Por tanto, fusionar esta preparación no rompe la publicación actual.

## Seguridad

- No publiques `YOUTUBE_API_KEY`.
- No copies secretos dentro de `_routes.json`, `wrangler.toml` o JavaScript público.
- Mantén la clave restringida a YouTube Data API v3.
- Autoriza a Cloudflare únicamente para este repositorio.
- Las solicitudes del navegador van al mismo dominio; la clave solo se usa dentro de Pages Functions.

## Cambio de dominio

Cuando se active un dominio propio, actualiza canonical, Open Graph, Twitter Card, sitemap, robots y el enlace de `404.html` siguiendo el README principal.
