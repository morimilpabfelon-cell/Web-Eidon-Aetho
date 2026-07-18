const ADS_FILE = "data/ads.json";
const AD_SPEED_PX_PER_SECOND = 42;

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
    { label: "AD 02", title: "Tu anuncio aquí", description: "Contenido definido únicamente por el propietario.", accent: "#f58ab1", placeholder: true },
    { label: "AD 03", title: "Sponsor disponible", description: "Franja preparada para campañas futuras.", accent: "#7357f2", placeholder: true },
    { label: "AD 04", title: "Espacio promocional", description: "Sin marcas ni enlaces precargados.", accent: "#ff6a00", placeholder: true },
    { label: "AD 05", title: "Campaña disponible", description: "Lugar reservado para publicidad futura.", accent: "#69b8e8", placeholder: true },
    { label: "AD 06", title: "Anuncio disponible", description: "El propietario decide qué se publica.", accent: "#f1a083", placeholder: true }
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

function createAdGroup(ads, duplicate = false) {
  const group = document.createElement("div");
  group.className = "ad-group";

  if (duplicate) {
    group.setAttribute("aria-hidden", "true");
  }

  ads.forEach((ad, index) => {
    const card = createAdCard(ad, index);
    if (duplicate && card.matches("a")) card.tabIndex = -1;
    group.append(card);
  });

  return group;
}

function renderAds(ads) {
  const viewport = document.querySelector("[data-ad-viewport]");
  const track = document.querySelector("[data-ad-track]");
  if (!viewport || !track) return null;

  const displayedAds = ads.length > 0 ? ads : placeholderAds();
  const primaryGroup = createAdGroup(displayedAds);
  track.replaceChildren(primaryGroup);

  return { viewport, track, primaryGroup, displayedAds };
}

function setupInfiniteAdRail({ viewport, track, primaryGroup, displayedAds }) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animationFrame = 0;
  let previousTime = 0;
  let pausedUntil = 0;
  let isFocused = false;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartScroll = 0;

  const loopWidth = () => primaryGroup.getBoundingClientRect().width;

  const normalizePosition = () => {
    const width = loopWidth();
    if (width <= 0) return;

    while (viewport.scrollLeft >= width) {
      viewport.scrollLeft -= width;
    }
  };

  const buildCopies = () => {
    track.querySelectorAll(".ad-group:not(:first-child)").forEach((group) => group.remove());

    const width = loopWidth();
    if (width <= 0) return;

    const copiesNeeded = Math.max(1, Math.ceil(viewport.clientWidth / width) + 1);
    for (let index = 0; index < copiesNeeded; index += 1) {
      track.append(createAdGroup(displayedAds, true));
    }

    normalizePosition();
  };

  const pauseTemporarily = (milliseconds = 1600) => {
    pausedUntil = Math.max(pausedUntil, performance.now() + milliseconds);
  };

  const animate = (timestamp) => {
    if (!previousTime) previousTime = timestamp;
    const elapsed = Math.min(timestamp - previousTime, 64);
    previousTime = timestamp;

    const canMove =
      !reducedMotion.matches &&
      !document.hidden &&
      !isFocused &&
      !isDragging &&
      timestamp >= pausedUntil;

    if (canMove) {
      viewport.scrollLeft += (AD_SPEED_PX_PER_SECOND * elapsed) / 1000;
      normalizePosition();
    }

    animationFrame = window.requestAnimationFrame(animate);
  };

  viewport.addEventListener("focusin", () => {
    isFocused = true;
  });

  viewport.addEventListener("focusout", () => {
    isFocused = false;
    pauseTemporarily(500);
  });

  viewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    isDragging = true;
    dragStartX = event.clientX;
    dragStartScroll = viewport.scrollLeft;
    viewport.classList.add("is-dragging");
    viewport.setPointerCapture?.(event.pointerId);
    pauseTemporarily(5000);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!isDragging) return;

    viewport.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
    normalizePosition();
    event.preventDefault();
  });

  const stopDragging = (event) => {
    if (!isDragging) return;

    isDragging = false;
    viewport.classList.remove("is-dragging");
    if (viewport.hasPointerCapture?.(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    pauseTemporarily();
  };

  viewport.addEventListener("pointerup", stopDragging);
  viewport.addEventListener("pointercancel", stopDragging);

  viewport.addEventListener(
    "wheel",
    (event) => {
      const movement = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

      if (movement === 0) return;

      viewport.scrollLeft += movement;
      normalizePosition();
      pauseTemporarily();
      event.preventDefault();
    },
    { passive: false }
  );

  viewport.addEventListener("scroll", normalizePosition, { passive: true });

  const resizeObserver = new ResizeObserver(() => {
    window.requestAnimationFrame(buildCopies);
  });
  resizeObserver.observe(viewport);
  resizeObserver.observe(primaryGroup);

  buildCopies();
  animationFrame = window.requestAnimationFrame(animate);

  window.addEventListener("pagehide", () => {
    window.cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
  }, { once: true });
}

async function initializeAds() {
  const state = renderAds(await loadAds());
  if (state) setupInfiniteAdRail(state);
}

initializeAds();
