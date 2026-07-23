(() => {
  const API_PATH = "api/notes?limit=6";
  const MAX_WAIT_MS = 2500;

  function cleanText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safeResourceUrl(value) {
    if (typeof value !== "string" || value.trim() === "") return "";

    try {
      const url = new URL(value, document.baseURI);
      const sameOrigin = url.origin === window.location.origin;
      if (sameOrigin && (url.protocol === "https:" || url.protocol === "http:")) return url.href;
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function formatDate(value) {
    const text = cleanText(value, "Sin fecha");
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;

    return new Intl.DateTimeFormat("es-PE", {
      year: "numeric",
      month: "short",
      day: "2-digit"
    }).format(date);
  }

  function tag(value) {
    const node = document.createElement("span");
    node.className = "tag";
    node.textContent = cleanText(value, "Nota");
    return node;
  }

  function mediaNode(item, noteTitle) {
    const url = safeResourceUrl(item?.url);
    if (!url) return null;

    const type = cleanText(item.type).toLowerCase();
    const frame = document.createElement("figure");
    frame.className = "note-media";

    if (type === "image") {
      const image = document.createElement("img");
      image.src = url;
      image.alt = cleanText(item.alt, `Imagen de ${noteTitle}`);
      image.loading = "lazy";
      image.decoding = "async";
      frame.append(image);
      return frame;
    }

    if (type === "video") {
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.preload = "metadata";
      video.playsInline = true;
      const poster = safeResourceUrl(item.poster);
      if (poster) video.poster = poster;
      frame.append(video);
      return frame;
    }

    if (type === "audio") {
      const audio = document.createElement("audio");
      audio.src = url;
      audio.controls = true;
      audio.preload = "metadata";
      frame.append(audio);
      return frame;
    }

    const link = document.createElement("a");
    link.className = "item-link note-file-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = cleanText(item.fileName, "Abrir archivo →");
    frame.append(link);
    return frame;
  }

  function noteCard(note) {
    const article = document.createElement("article");
    const date = document.createElement("div");
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    const description = document.createElement("p");
    const body = document.createElement("p");
    const noteTitle = cleanText(note.title, "Nota sin título");

    article.className = "note-card note-card--cloudflare";
    article.dataset.noteId = cleanText(note.id);
    date.className = "note-date";
    copy.className = "note-copy";
    body.className = "note-body";

    date.textContent = formatDate(note.publishedAt || note.date);
    title.textContent = noteTitle;
    description.textContent = cleanText(note.description, "Sin descripción pública.");
    body.textContent = cleanText(note.body);

    copy.append(tag(note.category), title, description);
    if (body.textContent && body.textContent !== description.textContent) copy.append(body);

    const media = Array.isArray(note.media) ? note.media : [];
    media.forEach((item) => {
      const node = mediaNode(item, noteTitle);
      if (node) copy.append(node);
    });

    const permalink = safeResourceUrl(note.permalink);
    if (permalink) {
      const link = document.createElement("a");
      link.className = "item-link note-source-link";
      link.href = permalink;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Ver publicación original →";
      copy.append(link);
    }

    article.append(date, copy);
    return article;
  }

  function loadMoreButton(nextOffset, onLoad) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button-lime note-load-more";
    button.textContent = "Cargar más notas";
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Cargando…";
      try {
        await onLoad(nextOffset, button);
      } finally {
        if (button.isConnected) {
          button.disabled = false;
          button.textContent = "Cargar más notas";
        }
      }
    });
    return button;
  }

  async function requestPage(offset = 0) {
    const url = new URL(API_PATH, document.baseURI);
    url.searchParams.set("offset", String(offset));
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) throw new Error(`API de notas: HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.items)) throw new TypeError("Respuesta de notas inválida.");
    return payload;
  }

  async function activateCloudflareNotes() {
    const grid = document.querySelector("[data-note-grid]");
    if (!grid || grid.dataset.cloudflareNotes === "active") return;

    let payload;
    try {
      payload = await requestPage(0);
    } catch {
      return;
    }

    grid.dataset.cloudflareNotes = "active";
    grid.replaceChildren(...payload.items.map(noteCard));
    document.querySelectorAll("[data-note-count]").forEach((node) => {
      node.textContent = String(payload.items.length);
    });

    async function appendPage(offset, currentButton) {
      const nextPayload = await requestPage(offset);
      currentButton.remove();
      grid.append(...nextPayload.items.map(noteCard));
      const total = grid.querySelectorAll(".note-card--cloudflare").length;
      document.querySelectorAll("[data-note-count]").forEach((node) => {
        node.textContent = String(total);
      });

      if (nextPayload.pagination?.hasMore && Number.isInteger(nextPayload.pagination.nextOffset)) {
        grid.append(loadMoreButton(nextPayload.pagination.nextOffset, appendPage));
      }
    }

    if (payload.pagination?.hasMore && Number.isInteger(payload.pagination.nextOffset)) {
      grid.append(loadMoreButton(payload.pagination.nextOffset, appendPage));
    }
  }

  function startWhenHydrated() {
    if (document.documentElement.classList.contains("content-hydrated")) {
      activateCloudflareNotes();
      return;
    }

    const observer = new MutationObserver(() => {
      if (!document.documentElement.classList.contains("content-hydrated")) return;
      observer.disconnect();
      activateCloudflareNotes();
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    window.setTimeout(() => {
      observer.disconnect();
      activateCloudflareNotes();
    }, MAX_WAIT_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startWhenHydrated, { once: true });
  } else {
    startWhenHydrated();
  }
})();
