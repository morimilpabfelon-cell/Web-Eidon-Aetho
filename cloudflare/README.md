# Preparación para Cloudflare Pages

Esta carpeta documenta el despliegue futuro de Web Eidon Aetho en Cloudflare Pages con notas sincronizadas desde Telegram.

La web sigue funcionando en GitHub Pages. Mientras `/api/notes` no exista, `cloudflare-notes.js` conserva el contenido estático de `data/notes.json`.

## Arquitectura

```text
Canal de Telegram
        ↓ webhook HTTPS
Pages Function: /api/telegram/webhook
        ↓
D1: metadatos y estado de las notas
R2: imágenes, videos, audios y documentos
        ↓
Pages Function: /api/notes y /media/*
        ↓
Sección Notas publicadas
```

Solo `/api/*` y `/media/*` invocan Functions. El resto de la página continúa sirviéndose como archivos estáticos.

## 1. Crear el proyecto Pages

En Cloudflare:

1. Workers & Pages → Create → Pages → Connect to Git.
2. Selecciona el repositorio `morimilpabfelon-cell/Web-Eidon-Aetho`.
3. Production branch: `main`.
4. Framework preset: `None`.
5. Build command: déjalo vacío.
6. Build output directory: `.`.
7. Root directory: déjala vacía.

No cambies todavía canonical, sitemap o metadatos. Hazlo cuando se decida el dominio definitivo.

## 2. Crear D1

Crea una base llamada `eidon-notes` y aplica:

```text
cloudflare/d1/schema.sql
```

Con Wrangler, después de sustituir el identificador de la base:

```powershell
npx wrangler d1 execute eidon-notes --remote --file cloudflare/d1/schema.sql
```

Añade al proyecto Pages la vinculación:

```text
Variable name: NOTES_DB
Resource: eidon-notes
```

Configúrala tanto para Production como para Preview.

## 3. Crear R2

Crea un bucket Standard llamado:

```text
eidon-notes-media
```

Añade la vinculación:

```text
Variable name: NOTES_MEDIA
Resource: eidon-notes-media
```

El bucket no necesita ser público: los archivos se sirven mediante `/media/*` y conservan el mismo origen que la web.

## 4. Variables no secretas

Configura estas variables en Pages:

```text
TELEGRAM_CHANNEL_ID=-1000000000000
TELEGRAM_ADMIN_USER_ID=000000000
TELEGRAM_CHANNEL_URL=https://t.me/NOMBRE_DEL_CANAL
```

Opcionalmente:

```text
TELEGRAM_PUBLISH_TAG=#nota
```

Cuando `TELEGRAM_PUBLISH_TAG` existe, una publicación solo aparece en la web si contiene esa marca.

## 5. Secretos

Configura como secretos cifrados, nunca como texto en GitHub:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
```

`TELEGRAM_WEBHOOK_SECRET` debe ser una cadena aleatoria formada únicamente por letras, números, `_` o `-`.

Para desarrollo local, copia `.dev.vars.example` como `.dev.vars`. Ese archivo está ignorado por Git.

## 6. Crear y conectar el bot

1. Crea el bot mediante BotFather.
2. Añádelo como administrador del canal.
3. Dale permiso para ver y administrar publicaciones según lo necesario.
4. Obtén el identificador numérico del canal y tu identificador de administrador.
5. Despliega Pages después de configurar vinculaciones y secretos.

Configura el webhook sustituyendo los valores de ejemplo:

```powershell
$body = @{
  url = "https://TU-SITIO.pages.dev/api/telegram/webhook"
  secret_token = "TU_SECRETO_DE_WEBHOOK"
  allowed_updates = @("channel_post", "edited_channel_post", "message")
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://api.telegram.org/botTU_TOKEN/setWebhook" `
  -ContentType "application/json" `
  -Body $body
```

No pegues el token en capturas, issues, commits o mensajes públicos.

## 7. Comportamiento

- Publicar en el canal: crea o actualiza una nota en D1.
- Editar una publicación: actualiza la misma nota; no crea duplicados.
- Imagen, video, audio o documento compatible: se copia a R2.
- La web muestra seis notas y permite cargar más.
- Si la API o Functions fallan, la web conserva `data/notes.json` como respaldo.

La identidad estable de una nota es:

```text
telegram:<channel_id>:<message_id>
```

## 8. Eliminación

El Bot API no envía un evento general cuando se borra manualmente una publicación de canal. Para retirar la copia web, envía en privado al bot desde la cuenta administradora:

```text
/borrar 42
```

`42` es el `message_id` de la publicación. El comando marca la nota como no visible y elimina los objetos asociados en R2.

## 9. Límites de multimedia

La descarga estándar mediante `getFile` del Bot API puede fallar con archivos grandes. Si ocurre:

- la nota textual y el enlace original permanecen publicados;
- el error de copia queda en los logs de Functions;
- el archivo puede subirse a R2 por otro flujo más adelante.

No uses reproducción automática. Los videos se muestran con controles, `playsinline` y `preload="metadata"`.

## 10. Pruebas previas a producción

Antes de activar el webhook:

```powershell
python scripts/prerender.py --check
python scripts/validate_static.py
node --check cloudflare-notes.js
node --check functions/api/notes.js
node --check functions/api/telegram/webhook.js
node --check functions/media/[[path]].js
```

Comprueba:

- `/api/notes?limit=6` devuelve JSON;
- una publicación crea una fila en D1;
- una edición conserva el mismo `id`;
- la multimedia abre desde `/media/...`;
- `/borrar <message_id>` retira la nota;
- la página estática sigue funcionando si se desactivan las Functions.

## 11. Configuración opcional con Wrangler

`cloudflare/wrangler.toml.example` contiene los nombres de bindings esperados. Cópialo como `wrangler.toml`, sustituye únicamente los identificadores y no agregues secretos al archivo.
