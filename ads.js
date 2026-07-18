const ADS_FILE = "data/ads.json";

function isSafeAdUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function adText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeAccent(value, fallback = "#c8f35a") {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim()
    : fallback;
}

async function loadAds() {
  try {
    const response = await fetch(ADS_FILE, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new TypeError(`${ADS_FILE} debe contener una lista JSON`);

    return data
      .filter((item) => item && typeof item === "object" && item.visible === true)
      .filter((item) => isSafeAdUrl(item.url))
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  } catch (error) {
    console.warn(`No se pudo cargar ${ADS_FILE}.`, error);
    return [];
  }
}

function placeholderAds() {
  return [
    { label: "AD 01", title: "Espacio publicitario", description: "Disponible para patrocinio.", accent: "#c8f35a", placeholder: true },
    { label: "AD 02", title: "Tu anuncio aquí", description: "Contenido y enlace definidos únicamente por el propietario.", accent: "#f58ab1", placeholder: true },
    { label: "AD 03", title: "Sponsor disponible", description: "Franja preparada para campañas futuras.", accent: "#7357f2", placeholder: true },
    { label: "AD 04", title: "Espacio promocional", description: "Sin marcas ni enlaces precargados.", accent: "#ff6a00", placeholder: true }
  ];
}

function createAdCard(ad, index) {
  const hasUrl = isSafeAdUrl(ad.url) && ad.placeholder !== true;
  const card = document.createElement(hasUrl ? "a" : "article");
  const badge = document.createElement("span");
  const copy = document.createElement("span");
  const title = document.createElement("h3");
  const description = document.createElement("p");
  const arrow = document.createElement("span");

  card.className = `ad-card${ad.placeholder === true ? " ad-placeholder" : ""}`;
  card.style.setProperty("--ad-accent", safeAccent(ad.accent));

  badge.className = "ad-badge";
  badge.textContent = adText(ad.label, `AD ${String(index + 1).padStart(2, "0")}`);

  copy.className = "ad-card-copy";
  title.textContent = adText(ad.title, "Anuncio sin título");
  description.textContent = adText(ad.description, "Contenido promocional.");
  copy.append(title, description);

  arrow.className = "ad-arrow";
  arrow.textContent = hasUrl ? "↗" : "→";
  arrow.setAttribute("aria-hidden", "true");

  if (hasUrl) {
    card.href = ad.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer sponsored";
    card.setAttribute("aria-label", `${title.textContent}, anuncio; abrir en una pestaña nueva`);
  }

  card.append(badge, copy, arrow);
  return card;
}

function createAdGroup(ads) {
  const group = document.createElement("div");
  group.className = "ad-group";
  ads.forEach((ad, index) => group.append(createAdCard(ad, index)));
  return group;
}

function renderAds(ads) {
  const track = document.querySelector("[data-ad-track]");
  if (!track) return;

  const displayedAds = ads.length > 0 ? ads : placeholderAds();
  const primaryGroup = createAdGroup(displayedAds);
  const duplicateGroup = primaryGroup.cloneNode(true);

  duplicateGroup.setAttribute("aria-hidden", "true");
  duplicateGroup.querySelectorAll("a").forEach((link) => {
    link.tabIndex = -1;
  });

  track.style.setProperty("--ad-duration", `${Math.max(26, displayedAds.length * 8)}s`);
  track.replaceChildren(primaryGroup, duplicateGroup);
}

function setupAdInteraction() {
  const viewport = document.querySelector("[data-ad-viewport]");
  if (!viewport) return;

  let resumeTimer;
  const pauseTemporarily = () => {
    viewport.classList.add("is-user-scrolling");
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      viewport.classList.remove("is-user-scrolling");
    }, 2600);
  };

  viewport.addEventListener("pointerdown", pauseTemporarily);
  viewport.addEventListener("touchstart", pauseTemporarily, { passive: true });
  viewport.addEventListener("scroll", pauseTemporarily, { passive: true });
  viewport.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      viewport.scrollLeft += event.deltaY;
      event.preventDefault();
      pauseTemporarily();
    },
    { passive: false }
  );
}

async function initializeAds() {
  renderAds(await loadAds());
  setupAdInteraction();
}

initializeAds();
