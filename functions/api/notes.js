const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 24;
const MAX_OFFSET = 10_000;

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...extraHeaders
    }
  });
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, minimum), maximum);
}

function parseMedia(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function publicNote(row, order) {
  return {
    id: row.id,
    source: row.source,
    sourceId: row.source_id,
    type: row.type,
    publishedAt: row.published_at,
    editedAt: row.edited_at,
    date: row.published_at,
    category: row.category,
    title: row.title,
    description: row.description,
    body: row.body,
    media: parseMedia(row.media_json),
    permalink: row.permalink,
    visible: true,
    order
  };
}

export async function onRequestGet({ request, env }) {
  if (!env.NOTES_DB) {
    return json(
      { error: "NOTES_DB no está configurado." },
      503,
      { "cache-control": "no-store" }
    );
  }

  const url = new URL(request.url);
  const limit = boundedInteger(url.searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = boundedInteger(url.searchParams.get("offset"), 0, 0, MAX_OFFSET);

  try {
    const statement = env.NOTES_DB.prepare(`
      SELECT
        id,
        source,
        source_id,
        type,
        published_at,
        edited_at,
        category,
        title,
        description,
        body,
        media_json,
        permalink
      FROM notes
      WHERE visible = 1
      ORDER BY published_at DESC, id DESC
      LIMIT ?1 OFFSET ?2
    `).bind(limit + 1, offset);

    const result = await statement.all();
    const rows = Array.isArray(result.results) ? result.results : [];
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((row, index) => publicNote(row, offset + index));

    return json(
      {
        items,
        pagination: {
          limit,
          offset,
          nextOffset: hasMore ? offset + limit : null,
          hasMore
        }
      },
      200,
      {
        "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
      }
    );
  } catch (error) {
    console.error("No se pudo consultar NOTES_DB.", error);
    return json(
      { error: "No se pudieron cargar las notas." },
      500,
      { "cache-control": "no-store" }
    );
  }
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { allow: "GET, OPTIONS" }
  });
}

export function onRequestPost() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { allow: "GET, OPTIONS" }
  });
}
