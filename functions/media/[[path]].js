function cleanKey(value) {
  const parts = Array.isArray(value) ? value : [value];
  const key = parts.filter((part) => typeof part === "string" && part !== "").join("/");

  if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    return "";
  }
  return key;
}

export async function onRequestGet({ request, env, params }) {
  if (!env.NOTES_MEDIA) {
    return new Response("NOTES_MEDIA no está configurado.", { status: 503 });
  }

  const key = cleanKey(params.path);
  if (!key) return new Response("Ruta multimedia inválida.", { status: 400 });

  const object = await env.NOTES_MEDIA.get(key, {
    onlyIf: request.headers,
    range: request.headers
  });

  if (object === null) return new Response("Archivo no encontrado.", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", headers.get("cache-control") || "public, max-age=86400, immutable");
  headers.set("x-content-type-options", "nosniff");

  if (!("body" in object)) {
    return new Response(null, { status: 412, headers });
  }

  if (object.range && request.headers.has("range")) {
    const offset = object.range.offset ?? 0;
    const length = object.range.length ?? object.size;
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set("content-length", String(length));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set("content-length", String(object.size));
  return new Response(object.body, { status: 200, headers });
}
