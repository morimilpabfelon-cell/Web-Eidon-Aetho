(() => {
  const BRANDS = [
    {
      key: "binance",
      domain: "binance.com",
      name: "Binance",
      logo: "assets/ads/binance.svg"
    },
    {
      key: "tradingview",
      domain: "tradingview.com",
      name: "TradingView",
      logo: "assets/ads/tradingview.svg"
    },
    {
      key: "tiktok",
      domain: "tiktok.com",
      name: "TikTok",
      logo: "assets/ads/tiktok.svg"
    }
  ];

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

  function decorateCard(card) {
    if (!(card instanceof HTMLAnchorElement) || card.dataset.brandCardReady === "true") return;

    const brand = brandForUrl(card.href);
    if (!brand) return;

    const currentTitle = card.querySelector("h3")?.textContent?.trim() || brand.name;
    const currentDescription = card.querySelector("p")?.textContent?.trim() || "Enlace de referido";

    const emblem = document.createElement("span");
    const logo = document.createElement("img");
    const copy = document.createElement("span");
    const label = document.createElement("span");
    const title = document.createElement("strong");
    const description = document.createElement("span");
    const arrow = document.createElement("span");

    emblem.className = "ad-brand-emblem";
    logo.className = "ad-brand-mark";
    logo.src = brand.logo;
    logo.alt = "";
    logo.width = 40;
    logo.height = 40;
    logo.decoding = "async";
    logo.draggable = false;
    logo.setAttribute("aria-hidden", "true");
    emblem.append(logo);

    copy.className = "ad-brand-copy";
    label.className = "ad-referral-label";
    label.textContent = "ENLACE DE REFERIDO";
    title.className = "ad-brand-title";
    title.textContent = currentTitle;
    description.className = "ad-brand-description";
    description.textContent = currentDescription;
    copy.append(label, title, description);

    arrow.className = "ad-brand-arrow";
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");

    card.classList.add("ad-card--brand", `ad-card--${brand.key}`);
    card.dataset.brand = brand.key;
    card.dataset.brandCardReady = "true";
    card.setAttribute("aria-label", `${brand.name}, enlace de referido; abrir en una pestaña nueva`);
    card.replaceChildren(emblem, copy, arrow);
  }

  function decorateTree(node) {
    if (!(node instanceof Element)) return;
    if (node.matches(".ad-card")) decorateCard(node);
    node.querySelectorAll(".ad-card").forEach(decorateCard);
  }

  const track = document.querySelector("[data-ad-track]");
  if (!track) return;

  decorateTree(track);

  const observer = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach(decorateTree));
  });

  observer.observe(track, { childList: true, subtree: true });
  window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
})();