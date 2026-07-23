const REFERRALS = [
  {
    id: "binance",
    url: "https://www.binance.com/register?ref=B3FNDEM4&utm_medium=app_share_link"
  },
  {
    id: "tradingview",
    url: "https://es.tradingview.com/pricing/?share_your_love=Morimil&mobileapp=true"
  },
  {
    id: "tiktok",
    url: "https://www.tiktok.com/coin?rc=3H7F2BA8&rie="
  }
];

const MAX_HTML_CHARACTERS = 1_500_000;

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

function attributes(tag) {
  const values = {};
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match;

  while ((match = pattern.exec(tag)) !== null) {
    values[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return values;
}

function metaContent(html, acceptedKeys) {
  const keys = new Set(acceptedKeys.map((value) => value.toLowerCase()));
  const tags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of tags) {
    const attrs = attributes(tag);
    const key = String(attrs.property || attrs.name || "").toLowerCase();
    const content = String(attrs.content || "").trim();
    if (keys.has(key) && content) return content;
  }
  return "";
}

function documentTitle(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function cleanText(value, maximum = 240) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maximum);
}

function safeHttpsUrl(value, baseUrl) {
  if (typeof value !== "string" || value.trim() === "") return null;

  try {
    const url = new URL(value, baseUrl);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

async function referralPreview(referral) {
  const response = await fetch(referral.url, {
    redirect: "follow",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "accept-language": "es-ES,es;q=0.9,en;q=0.7",
      "user-agent": "Mozilla/5.0 (compatible; EidonAethoReferralPreview/1.0)"
    }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("La respuesta no es HTML.");
  }

  const html = await response.text();
  if (html.length > MAX_HTML_CHARACTERS) throw new Error("Documento demasiado grande.");

  const finalUrl = response.url || referral.url;
  const image = safeHttpsUrl(
    metaContent(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]),
    finalUrl
  );
  const title = cleanText(metaContent(html, ["og:title", "twitter:title"]) || documentTitle(html), 140);
  const description = cleanText(
    metaContent(html, ["og:description", "twitter:description", "description"]),
    240
  );

  return {
    id: referral.id,
    image,
    title: title || null,
    description: description || null,
    source: finalUrl
  };
}

export async function onRequestGet() {
  const results = await Promise.allSettled(REFERRALS.map(referralPreview));
  const items = results.map((result, index) => {
    if (result.status === "fulfilled") return result.value;

    console.warn(`No se pudo obtener la vista previa de ${REFERRALS[index].id}.`, result.reason);
    return {
      id: REFERRALS[index].id,
      image: null,
      title: null,
      description: null,
      source: REFERRALS[index].url
    };
  });

  return json(
    { items },
    200,
    {
      "cache-control": "public, max-age=900, s-maxage=21600, stale-while-revalidate=86400"
    }
  );
}

export function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { allow: "GET" }
  });
}