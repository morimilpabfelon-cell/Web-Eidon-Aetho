const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

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

function safePageToken(value) {
  if (typeof value !== "string" || value === "") return "";
  return /^[A-Za-z0-9_-]{1,256}$/.test(value) ? value : "";
}

async function youtubeRequest(path, params) {
  const url = new URL(`${YOUTUBE_API}/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: { accept: "application/json" }
  });
  const payload = await response.json();

  if (!response.ok || payload.error) {
    const reason = payload.error?.message || `HTTP ${response.status}`;
    throw new Error(`YouTube API: ${reason}`);
  }
  return payload;
}

async function uploadsPlaylistId(env) {
  if (env.YOUTUBE_UPLOADS_PLAYLIST_ID) {
    return String(env.YOUTUBE_UPLOADS_PLAYLIST_ID).trim();
  }

  const payload = await youtubeRequest("channels", {
    part: "contentDetails",
    id: env.YOUTUBE_CHANNEL_ID,
    key: env.YOUTUBE_API_KEY
  });

  const playlistId = payload.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) throw new Error("No se encontró la lista de videos subidos del canal.");
  return playlistId;
}

function publicVideo(item) {
  const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
  const snippet = item.snippet || {};
  if (!videoId || item.status?.privacyStatus !== "public") return null;

  const thumbnails = snippet.thumbnails || {};
  const thumbnail =
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    videoId,
    title: snippet.title || "Video de YouTube",
    description: snippet.description || "",
    publishedAt: snippet.publishedAt || null,
    thumbnail,
    url: `https://www.youtube.com/watch?v=${videoId}`
  };
}

export async function onRequestGet({ request, env }) {
  if (!env.YOUTUBE_API_KEY || !env.YOUTUBE_CHANNEL_ID) {
    return json(
      { error: "La integración de YouTube todavía no está configurada." },
      503,
      { "cache-control": "no-store" }
    );
  }

  const requestUrl = new URL(request.url);
  const limit = boundedInteger(requestUrl.searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const pageToken = safePageToken(requestUrl.searchParams.get("pageToken"));

  try {
    const playlistId = await uploadsPlaylistId(env);
    const payload = await youtubeRequest("playlistItems", {
      part: "snippet,contentDetails,status",
      playlistId,
      maxResults: limit,
      pageToken,
      key: env.YOUTUBE_API_KEY
    });

    const items = (payload.items || []).map(publicVideo).filter(Boolean);

    return json(
      {
        items,
        pagination: {
          nextPageToken: payload.nextPageToken || null,
          totalResults: Number(payload.pageInfo?.totalResults || items.length)
        },
        channel: {
          id: String(env.YOUTUBE_CHANNEL_ID),
          url: String(env.YOUTUBE_CHANNEL_URL || "https://www.youtube.com/@eidon-aetho")
        }
      },
      200,
      {
        "cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=86400"
      }
    );
  } catch (error) {
    console.error("No se pudo consultar YouTube.", error);
    return json(
      { error: "No se pudieron cargar los videos de YouTube." },
      502,
      { "cache-control": "no-store" }
    );
  }
}

export function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { allow: "GET" }
  });
}
