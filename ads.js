const ADS_FILE = "data/ads.json";
const AD_SPEED_PX_PER_SECOND = 42;
const DRAG_THRESHOLD_PX = 7;

function isSafeAdUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;

  try {
    return new URL(value).protocol === "https:";
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

function itemOrder(item) {
  const order = Number(item.order);
  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
}

async function loadAds() {
  try {
    const response = await fetch(ADS_FILE, { cache: "no-store" });
    if (!response.ok) throw new Error(`${ADS_FILE}: HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new TypeError(`${ADS_FILE} debe contener una lista JSON`);

    return data
      .filter((item) => item && typeof item === "object" && item.visible === true)
      .filter((item) => isSafeAdUrl(item.url))
      .sort((a, b) => itemOrder(a) - itemOrder(b));
  } catch (error) {
    console.warn(`No se pudo cargar ${ADS_FILE}.`, error);
    return [];
  }
}

function createAdCard(ad, index) {
  const card = document.createElement("a");
  const badge = document.createElement("span");
  const copy = document.createElement("span");
  const title = document.createElement("h3");
  const description = document.createElement("p");
  const arrow = document.createElement("span");

  card.className = "ad-card";
  card.style.setProperty("--ad-accent", safeAccent(ad.accent));
  card.href = ad.url;
  card.target = "_blank";
  card.rel = "noopener noreferrer sponsored";
  card.draggable = false;

  badge.className = "ad-badge";
  badge.textContent = adText(ad.label, `AD ${String(index + 1).padStart(2, "0")}`);

  copy.className = "ad-card-copy";
  title.textContent = adText(ad.title, "Anuncio sin título");
  description.textContent = adText(ad.description, "Contenido promocional.");
  copy.append(title, description);

  arrow.className = "ad-arrow";
  arrow.textContent = "↗";
  arrow.setAttribute("aria-hidden", "true");

  card.setAttribute("aria-label", `${title.textContent}, anuncio; abrir en una pestaña nueva`);
  card.append(badge, copy, arrow);
  return card;
}

function createAdGroup(ads, duplicate = false) {
  const group = document.createElement("div");
  group.className = "ad-group";

  if (duplicate) group.setAttribute("aria-hidden", "true");

  ads.forEach((ad, index) => {
    const card = createAdCard(ad, index);
    if (duplicate) card.tabIndex = -1;
    group.append(card);
  });

  return group;
}

function renderAds(ads) {
  const viewport = document.querySelector("[data-ad-viewport]");
  const track = document.querySelector("[data-ad-track]");
  if (!viewport || !track) return null;

  const rail = viewport.closest(".ad-rail");

  if (ads.length === 0) {
    track.replaceChildren();
    if (rail) rail.hidden = true;
    return null;
  }

  if (rail) rail.hidden = false;

  const primaryGroup = createAdGroup(ads);
  track.replaceChildren(primaryGroup);

  return { viewport, track, primaryGroup, displayedAds: ads };
}

function setupInfiniteAdRail({ viewport, track, primaryGroup, displayedAds }) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animationFrame = 0;
  let previousTime = 0;
  let pausedUntil = 0;
  let isFocused = false;
  let isDragging = false;
  let hasDragged = false;
  let dragStartX = 0;
  let dragStartScroll = 0;
  let draggingPointerId = null;
  let blockNextClick = false;

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
    hasDragged = false;
    draggingPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartScroll = viewport.scrollLeft;
    pauseTemporarily(5000);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!isDragging || event.pointerId !== draggingPointerId) return;

    const distance = event.clientX - dragStartX;
    if (!hasDragged && Math.abs(distance) < DRAG_THRESHOLD_PX) return;

    if (!hasDragged) {
      hasDragged = true;
      viewport.classList.add("is-dragging");
      viewport.setPointerCapture?.(event.pointerId);
    }

    viewport.scrollLeft = dragStartScroll - distance;
    normalizePosition();
    event.preventDefault();
  });

  const stopDragging = (event) => {
    if (!isDragging || event.pointerId !== draggingPointerId) return;

    blockNextClick = hasDragged;
    isDragging = false;
    hasDragged = false;
    draggingPointerId = null;
    viewport.classList.remove("is-dragging");

    if (viewport.hasPointerCapture?.(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    pauseTemporarily();

    window.setTimeout(() => {
      blockNextClick = false;
    }, 0);
  };

  viewport.addEventListener("pointerup", stopDragging);
  viewport.addEventListener("pointercancel", stopDragging);

  viewport.addEventListener("click", (event) => {
    if (!blockNextClick) return;
    event.preventDefault();
    event.stopPropagation();
    blockNextClick = false;
  });

  viewport.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });

  viewport.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || event.deltaX === 0) return;

      viewport.scrollLeft += event.deltaX;
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

  window.addEventListener(
    "pagehide",
    () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    },
    { once: true }
  );
}

async function initializeAds() {
  const state = renderAds(await loadAds());
  if (state) setupInfiniteAdRail(state);
}

initializeAds();
