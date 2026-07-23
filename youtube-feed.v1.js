(() => {
  const API_PATH = "/api/youtube";
  const PAGE_SIZE = 12;
  const grid = document.querySelector("[data-youtube-grid]");
  const loadMore = document.querySelector("[data-youtube-more]");
  const status = document.querySelector("[data-youtube-status]");

  if (!grid || !loadMore || !status) return;

  let nextPageToken = null;
  let loading = false;
  let hydrated = false;

  function cleanText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safeHttps(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Video publicado";
    return new Intl.DateTimeFormat("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function videoCard(item) {
    const videoId = cleanText(item.videoId);
    const url = videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : safeHttps(item.url);
    const thumbnail = safeHttps(item.thumbnail);

    const article = document.createElement("article");
    const link = document.createElement("a");
    const image = document.createElement("img");
    const copy = document.createElement("div");
    const date = document.createElement("time");
    const title = document.createElement("h4");
    const description = document.createElement("p");
    const action = document.createElement("span");

    article.className = "youtube-card";
    link.className = "youtube-card__link";
    link.href = url || "https://www.youtube.com/@eidon-aetho";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${cleanText(item.title, "Video de YouTube")}, abrir en YouTube`);

    image.className = "youtube-card__image";
    image.src = thumbnail || "assets/og-cover.png";
    image.alt = `Miniatura de ${cleanText(item.title, "video de YouTube")}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 480;
    image.height = 270;

    copy.className = "youtube-card__copy";
    date.dateTime = cleanText(item.publishedAt);
    date.textContent = formatDate(item.publishedAt);
    title.textContent = cleanText(item.title, "Video de YouTube");
    description.textContent = cleanText(item.description, "Publicado en el canal oficial de Eidon Aetho.");
    action.className = "youtube-card__action";
    action.textContent = "Ver en YouTube →";

    copy.append(date, title, description, action);
    link.append(image, copy);
    article.append(link);
    return article;
  }

  function setVideoCount(value) {
    document.querySelectorAll("[data-note-count]").forEach((node) => {
      node.textContent = String(value);
    });
  }

  async function loadPage() {
    if (loading) return;
    loading = true;
    loadMore.disabled = true;
    status.textContent = hydrated ? "Cargando más videos…" : "Cargando videos de YouTube…";

    const url = new URL(API_PATH, window.location.href);
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);

    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      const items = Array.isArray(payload.items) ? payload.items : [];

      if (!hydrated) {
        grid.replaceChildren();
        hydrated = true;
      }

      items.forEach((item) => grid.append(videoCard(item)));
      nextPageToken = cleanText(payload.pagination?.nextPageToken) || null;
      setVideoCount(Number(payload.pagination?.totalResults || grid.childElementCount));

      loadMore.hidden = !nextPageToken;
      status.textContent = items.length
        ? `${grid.childElementCount} videos cargados.`
        : "No hay videos públicos disponibles.";
    } catch (error) {
      console.error("No se pudo cargar la galería de YouTube.", error);
      status.textContent = "La galería automática se activará al configurar Cloudflare Pages.";
      loadMore.hidden = true;
    } finally {
      loading = false;
      loadMore.disabled = false;
    }
  }

  loadMore.addEventListener("click", loadPage);
  loadPage();
})();
