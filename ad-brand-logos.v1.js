(() => {
  const BRANDS = [
    { domain: "binance.com", name: "Binance", logo: "assets/ads/binance.svg" },
    { domain: "tradingview.com", name: "TradingView", logo: "assets/ads/tradingview.svg" },
    { domain: "tiktok.com", name: "TikTok", logo: "assets/ads/tiktok.svg" }
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
    if (!(card instanceof HTMLAnchorElement) || card.dataset.brandLogoReady === "true") return;

    const brand = brandForUrl(card.href);
    const badge = card.querySelector(".ad-badge");
    if (!brand || !badge) return;

    const label = document.createElement("span");
    const logo = document.createElement("img");

    label.className = "ad-badge-label";
    label.textContent = badge.textContent.trim();

    logo.className = "ad-brand-logo";
    logo.src = brand.logo;
    logo.alt = "";
    logo.width = 30;
    logo.height = 30;
    logo.decoding = "async";
    logo.draggable = false;
    logo.setAttribute("aria-hidden", "true");

    badge.classList.add("ad-badge--with-logo");
    badge.replaceChildren(logo, label);
    card.dataset.brandLogoReady = "true";
    card.dataset.brand = brand.name;
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
    records.forEach((record) => {
      record.addedNodes.forEach(decorateTree);
    });
  });

  observer.observe(track, { childList: true, subtree: true });
  window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
})();
