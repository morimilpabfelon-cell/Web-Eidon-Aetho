const TELEGRAM_API = "https://api.telegram.org";
const MAX_TITLE = 96;
const MAX_DESCRIPTION = 280;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function truncate(value, length) {
  const text = cleanText(value);
  return text.length <= length ? text : `${text.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}

function sameText(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function noteText(message) {
  return cleanText(message.text || message.caption);
}

function hashtags(text) {
  return [...text.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu)].map((match) => match[1]);
}

function noteTitle(text, messageId) {
  const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return truncate(firstLine || `Publicación ${messageId}`, MAX_TITLE);
}

function noteDescription(text, title) {
  const remaining = text.startsWith(title) ? text.slice(title.length).trim() : text;
  return truncate(remaining || text, MAX_DESCRIPTION);
}

function messageType(message) {
  if (Array.isArray(message.photo) && message.photo.length > 0) return "image";
  if (message.video || message.animation || message.video_note) return "video";
  if (message.audio || message.voice) return "audio";
  if (message.document) return "document";
  return "text";
}

function selectedMedia(message) {
  if (Array.isArray(message.photo) && message.photo.length > 0) {
    const photo = message.photo.at(-1);
    return {
      type: "image",
      fileId: photo.file_id,
      fileName: `photo-${message.message_id}.jpg`,
      contentType: "image/jpeg",
      alt: truncate(noteText(message) || "Imagen publicada en Telegram", 160)
    };
  }

  const candidates = [
    ["video", message.video],
    ["video", message.animation],
    ["video", message.video_note],
    ["audio", message.audio],
    ["audio", message.voice],
    ["document", message.document]
  ];

  for (const [type, media] of candidates) {
    if (!media || !media.file_id) continue;
    return {
      type,
      fileId: media.file_id,
      fileName: cleanText(media.file_name, `${type}-${message.message_id}`),
      contentType: cleanText(media.mime_type, type === "video" ? "video/mp4" : "application/octet-stream"),
      alt: truncate(noteText(message) || `Archivo ${type} publicado en Telegram`, 160)
    };
  }

  return null;
}

function safeFileName(value) {
  const cleaned = cleanText(value, "file")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return cleaned || "file";
}

function publicPermalink(message, env) {
  const username = cleanText(message.chat?.username);
  if (username) return `https://t.me/${username}/${message.message_id}`;

  const base = cleanText(env.TELEGRAM_CHANNEL_URL).replace(/\/$/, "");
  return base ? `${base}/${message.message_id}` : null;
}

function publishAllowed(text, env) {
  const tag = cleanText(env.TELEGRAM_PUBLISH_TAG);
  return !tag || text.toLocaleLowerCase().includes(tag.toLocaleLowerCase());
}

async function upsertNote(message, env) {
  const channelId = String(message.chat.id);
  const sourceId = String(message.message_id);
  const id = `telegram:${channelId}:${sourceId}`;
  const text = noteText(message);
  const tags = hashtags(text);
  const publishedAt = new Date(Number(message.date) * 1000).toISOString();
  const editedAt = message.edit_date ? new Date(Number(message.edit_date) * 1000).toISOString() : null;
  const visible = publishAllowed(text, env) ? 1 : 0;

  await env.NOTES_DB.prepare(`
    INSERT INTO notes (
      id, source, source_id, channel_id, type, published_at, edited_at,
      category, title, description, body, media_json, permalink, visible, updated_at
    ) VALUES (
      ?1, 'telegram', ?2, ?3, ?4, ?5, ?6,
      ?7, ?8, ?9, ?10, '[]', ?11, ?12, CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      published_at = excluded.published_at,
      edited_at = excluded.edited_at,
      category = excluded.category,
      title = excluded.title,
      description = excluded.description,
      body = excluded.body,
      permalink = excluded.permalink,
      visible = excluded.visible,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    id,
    sourceId,
    channelId,
    messageType(message),
    publishedAt,
    editedAt,
    tags[0] || "Telegram",
    noteTitle(text, sourceId),
    noteDescription(text, noteTitle(text, sourceId)),
    text,
    publicPermalink(message, env),
    visible
  ).run();

  return { id, channelId, sourceId, media: selectedMedia(message), visible };
}

async function telegramFilePath(fileId, token) {
  const response = await fetch(`${TELEGRAM_API}/bot${token}/getFile`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ file_id: fileId })
  });

  const payload = await response.json();
  if (!response.ok || payload.ok !== true || !payload.result?.file_path) {
    throw new Error("Telegram no devolvió file_path.");
  }
  return payload.result.file_path;
}

async function persistMedia(note, env) {
  if (!note.media || !note.visible || !env.NOTES_MEDIA || !env.TELEGRAM_BOT_TOKEN) return;

  const filePath = await telegramFilePath(note.media.fileId, env.TELEGRAM_BOT_TOKEN);
  const response = await fetch(`${TELEGRAM_API}/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`);
  if (!response.ok || !response.body) throw new Error(`No se pudo descargar multimedia: HTTP ${response.status}`);

  const extension = filePath.includes(".") ? filePath.slice(filePath.lastIndexOf(".")) : "";
  const requestedName = safeFileName(note.media.fileName);
  const fileName = requestedName.includes(".") || !extension ? requestedName : `${requestedName}${extension}`;
  const key = `telegram/${note.channelId}/${note.sourceId}/${fileName}`;
  const contentType = response.headers.get("content-type") || note.media.contentType;

  await env.NOTES_MEDIA.put(key, response.body, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable"
    },
    customMetadata: {
      source: "telegram",
      channelId: note.channelId,
      sourceId: note.sourceId
    }
  });

  const media = [{
    type: note.media.type,
    url: `/media/${key}`,
    contentType,
    alt: note.media.alt,
    fileName
  }];

  await env.NOTES_DB.prepare(`
    UPDATE notes
    SET media_json = ?1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?2
  `).bind(JSON.stringify(media), note.id).run();
}

async function hideNote(sourceId, env) {
  const channelId = String(env.TELEGRAM_CHANNEL_ID);
  const id = `telegram:${channelId}:${sourceId}`;

  await env.NOTES_DB.prepare(`
    UPDATE notes
    SET visible = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?1
  `).bind(id).run();

  if (env.NOTES_MEDIA) {
    const prefix = `telegram/${channelId}/${sourceId}/`;
    let cursor;
    do {
      const listed = await env.NOTES_MEDIA.list({ prefix, cursor });
      if (listed.objects.length > 0) {
        await env.NOTES_MEDIA.delete(listed.objects.map((object) => object.key));
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
  }
}

function adminDeleteCommand(update, env) {
  const message = update.message;
  const adminId = cleanText(env.TELEGRAM_ADMIN_USER_ID);
  if (!message || !adminId || String(message.from?.id) !== adminId) return null;

  const match = cleanText(message.text).match(/^\/(?:borrar|delete)(?:@\w+)?\s+(\d+)$/i);
  return match ? match[1] : null;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.NOTES_DB || !env.TELEGRAM_WEBHOOK_SECRET || !env.TELEGRAM_CHANNEL_ID) {
    return json({ error: "Faltan vinculaciones o secretos obligatorios." }, 503);
  }

  const suppliedSecret = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!sameText(suppliedSecret, env.TELEGRAM_WEBHOOK_SECRET)) {
    return json({ error: "Webhook no autorizado." }, 401);
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const sourceIdToHide = adminDeleteCommand(update, env);
  if (sourceIdToHide) {
    await hideNote(sourceIdToHide, env);
    return json({ ok: true, action: "hidden", sourceId: sourceIdToHide });
  }

  const message = update.channel_post || update.edited_channel_post;
  if (!message) return json({ ok: true, ignored: "unsupported_update" });
  if (String(message.chat?.id) !== String(env.TELEGRAM_CHANNEL_ID)) {
    return json({ ok: true, ignored: "unexpected_channel" });
  }

  try {
    const note = await upsertNote(message, env);
    context.waitUntil(
      persistMedia(note, env).catch((error) => console.error("No se pudo persistir multimedia.", error))
    );
    return json({ ok: true, id: note.id, visible: Boolean(note.visible) });
  } catch (error) {
    console.error("No se pudo sincronizar la publicación de Telegram.", error);
    return json({ error: "No se pudo sincronizar la publicación." }, 500);
  }
}
