(() => {
  const PREVIEW_ENDPOINT = "api/referral-previews";
  const BRANDS = [
    {
      key: "binance",
      domain: "binance.com",
      name: "Binance",
      logo: "assets/ads/binance.svg",
      eyebrow: "CRYPTO EXCHANGE",
      cta: "ABRIR BINANCE",
      notice: "Enlace de referido · Solo para personas elegibles · Los criptoactivos pueden perder valor."
    },
    {
      key: "tradingview",
      domain: "tradingview.com",
      name: "TradingView",
      logo: "assets/ads/tradingview.svg",
      eyebrow: "CHARTS & MARKETS",
      cta: "VER TRADINGVIEW",
      notice: "Enlace de referido · Revisa precios, condiciones y elegibilidad en la plataforma."
    },
    {
      key: "tiktok",
      domain: "tiktok.com",
      name: "TikTok",
      logo: "assets/ads/tiktok.svg",
      eyebrow: "TIKTOK COINS",
      cta: "ABRIR TIKTOK",
      notice: "Enlace de referido · Revisa disponibilidad, edad mínima y condiciones en TikTok."
    }
  ];

  const previews = new Map();

  function matchesDomain(hostname, domain) {
    return hostname === domain || hostname.endsWith(`.${domain}`);
  }

  function brandForUrl(value) {
    try {
      const hostname = new URL(value, document.baseURI).hostname.toLowerCase();
      return BRANDS.find((brand) => matchesDomain(hostname, brand.domain)) || null;
    } catch {
      return null;
    }
  }

  function safePreviewUrl(value) {
    if (typeof value !== "string" || value.trim() === "") return "";

    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function previewForBrand(brand) {
    const item = previews.get(brand.key);
    return item ? safePreviewUrl(item.image) : "";
  }

  function applyPreview(card, brand) {
    const preview = card.querySelector(".ad-brand-preview");
    const fallback = card.querySelector(".ad-brand-fallback");
    if (!(preview instanceof HTMLImageElement) || !(fallback instanceof HTMLElement)) return;

    const source = previewForBrand(brand);
    if (!source || preview.dataset.source === source) return;

    preview.dataset.source = source;
    preview.addEventListener(
      "load",
      () => {
        preview.hidden = false;
        fallback.hidden = true;
        card.classList.add("has-official-preview");
      },
      { once: true }
    );
    preview.addEventListener(
      "error",
      () => {
        preview.hidden = true;
        fallback.hidden = false;
        card.classList.remove("has-official-preview");
      },
      { once: true }
    );
    preview.src = source;
  }

  function decorateCard(card) {
    if (!(card instanceof HTMLAnchorElement) || card.dataset.brandCardReady === "true") return;

    const brand = brandForUrl(card.href);
    if (!brand) return;

    const currentTitle = card.querySelector("h3")?.textContent?.trim() || brand.name;
    const currentDescription = card.querySelector("p")?.textContent?.trim() || "Enlace de referido";

    const media = document.createElement("span");
    const preview = document.createElement("img");
    const fallback = document.createElement("span");
    const mark = document.createElement("img");
    const wordmark = document.createElement("strong");
    const body = document.createElement("span");
    const topLine = document.createElement("span");
    const pill = document.createElement("span");
    const domain = document.createElement("span");
    const eyebrow = document.createElement("span");
    const title = document.createElement("strong");
    const description = document.createElement("span");
    const notice = document.createElement("small");
    const cta = document.createElement("span");

    media.className = "ad-brand-media";

    preview.className = "ad-brand-preview";
    preview.alt = "";
    preview.hidden = true;
    preview.loading = "lazy";
    preview.decoding = "async";
    preview.referrerPolicy = "no-referrer";
    preview.draggable = false;
    preview.setAttribute("aria-hidden", "true");

    fallback.className = "ad-brand-fallback";
    mark.className = "ad-brand-mark";
    mark.src = brand.logo;
    mark.alt = "";
    mark.width = 64;
    mark.height = 64;
    mark.decoding = "async";
    mark.draggable = false;
    mark.setAttribute("aria-hidden", "true");
    wordmark.className = "ad-brand-wordmark";
    wordmark.textContent = brand.name;
    fallback.append(mark, wordmark);
    media.append(preview, fallback);

    body.className = "ad-brand-body";
    topLine.className = "ad-brand-topline";
    pill.className = "ad-referral-pill";
    pill.textContent = "ENLACE DE REFERIDO";
    domain.className = "ad-brand-domain";
    domain.textContent = brand.domain;
    topLine.append(pill, domain);

    eyebrow.className = "ad-brand-eyebrow";
    eyebrow.textContent = brand.eyebrow;
    title.className = "ad-brand-title";
    title.textContent = currentTitle;
    description.className = "ad-brand-description";
    description.textContent = currentDescription;
    notice.className = "ad-brand-notice";
    notice.textContent = brand.notice;
    cta.className = "ad-brand-cta";
    cta.textContent = `${brand.cta} ↗`;

    body.append(topLine, eyebrow, title, description, notice, cta);

    card.classList.add("ad-card--rich", `ad-card--${brand.key}`);
    card.dataset.brand = brand.key;
    card.dataset.brandCardReady = "true";
    card.setAttribute("aria-label", `${brand.name}, enlace de referido; abrir en una pestaña nueva`);
    card.replaceChildren(media, body);

    applyPreview(card, brand);
  }

  function decorateTree(node) {
    if (!(node instanceof Element)) return;
    if (node.matches(".ad-card")) decorateCard(node);
    node.querySelectorAll(".ad-card").forEach(decorateCard);
  }

  function applyPreviewsToCards() {
    document.querySelectorAll(".ad-card[data-brand]").forEach((card) => {
      const brand = BRANDS.find((item) => item.key === card.dataset.brand);
      if (brand) applyPreview(card, brand);
    });
  }

  async function loadOfficialPreviews() {
    try {
      const endpoint = new URL(PREVIEW_ENDPOINT, document.baseURI);
      const response = await fetch(endpoint, { headers: { accept: "application/json" } });
      if (!response.ok) return;

      const payload = await response.json();
      if (!Array.isArray(payload.items)) return;

      payload.items.forEach((item) => {
        if (item && typeof item.id === "string") previews.set(item.id, item);
      });
      applyPreviewsToCards();
    } catch {
      // GitHub Pages no expone Pages Functions; se conserva el respaldo visual local.
    }
  }

  const track = document.querySelector("[data-ad-track]");
  if (!track) return;

  decorateTree(track);

  const observer = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach(decorateTree));
  });

  observer.observe(track, { childList: true, subtree: true });
  loadOfficialPreviews();

  window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
})();