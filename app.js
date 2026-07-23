const DATA_FILES = Object.freeze({
  projects: "data/projects.json",
  socials: "data/socials.json",
  notes: "data/notes.json"
});

const projectCarousel = {
  items: [],
  index: 0
};

function isSafeUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isSafeAssetPath(value) {
  if (typeof value !== "string") return false;
  return /^(?:\.\/)?assets\/[a-zA-Z0-9/_\-.]+$/.test(value.trim());
}

function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function itemOrder(item) {
  const order = Number(item.order);
  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
}

async function loadList(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);

  const data = await response.json();
  if (!Array.isArray(data)) throw new TypeError(`${path} debe contener una lista JSON`);
  return data;
}

function visibleItems(items) {
  return items
    .filter((item) => item && typeof item === "object" && item.visible === true)
    .sort((a, b) => itemOrder(a) - itemOrder(b));
}

function setCounters(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = String(value);
  });
}

function emptyState(title) {
  const article = document.createElement("article");
  const strong = document.createElement("strong");

  article.className = "empty-state";
  strong.textContent = title;
  article.append(strong);
  return article;
}

function projectInitials(name) {
  const words = cleanText(name, "Proyecto")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return words.map((word) => word[0]).join("").toUpperCase() || "EA";
}

function projectPreview(project) {
  const media = document.createElement("div");
  const source = cleanText(project.image);

  media.className = "featured-project-media";

  if (isSafeUrl(source) || isSafeAssetPath(source)) {
    const image = document.createElement("img");
    image.src = source;
    image.alt = cleanText(
      project.imageAlt,
      `Vista previa de ${cleanText(project.name, "proyecto")}`
    );
    image.loading = "lazy";
    image.decoding = "async";
    media.append(image);
    return media;
  }

  const placeholder = document.createElement("div");
  const mark = document.createElement("strong");

  placeholder.className = "project-preview-placeholder";
  mark.textContent = projectInitials(project.name);
  placeholder.append(mark);
  media.append(placeholder);
  return media;
}

function projectTag(value) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = value;
  return tag;
}

function featuredProjectCard(project, index, total) {
  const article = document.createElement("article");
  const copy = document.createElement("div");
  const meta = document.createElement("div");
  const category = projectTag(cleanText(project.category, "Proyecto"));
  const position = projectTag(`${index + 1} / ${total}`);
  const title = document.createElement("h3");
  const description = document.createElement("p");
  const tags = document.createElement("div");

  article.className = "featured-project-card";
  copy.className = "featured-project-copy";
  meta.className = "featured-project-meta";
  tags.className = "tag-list";

  title.textContent = cleanText(project.name, "Proyecto sin nombre");
  description.textContent = cleanText(project.description, "Sin descripción pública.");

  meta.append(category, position);

  if (Array.isArray(project.tags)) {
    project.tags.forEach((value) => {
      const label = cleanText(String(value));
      if (label) tags.append(projectTag(label));
    });
  }

  copy.append(meta, title, description);
  if (tags.childElementCount > 0) copy.append(tags);

  if (isSafeUrl(project.url)) {
    const link = document.createElement("a");
    link.className = "item-link";
    link.href = project.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = cleanText(project.linkLabel, "Ver detalles →");
    copy.append(link);
  }

  article.append(projectPreview(project), copy);
  return article;
}

function updateProjectCarousel(nextIndex) {
  const stage = document.querySelector("[data-project-stage]");
  const dots = document.querySelector("[data-project-dots]");
  const previous = document.querySelector("[data-project-prev]");
  const next = document.querySelector("[data-project-next]");
  const total = projectCarousel.items.length;

  if (!stage || !dots || !previous || !next || total === 0) return;

  projectCarousel.index = ((nextIndex % total) + total) % total;
  stage.replaceChildren(
    featuredProjectCard(
      projectCarousel.items[projectCarousel.index],
      projectCarousel.index,
      total
    )
  );

  dots.querySelectorAll(".project-dot").forEach((dot, index) => {
    if (index === projectCarousel.index) {
      dot.setAttribute("aria-current", "true");
    } else {
      dot.removeAttribute("aria-current");
    }
  });

  previous.disabled = total <= 1;
  next.disabled = total <= 1;
}

function renderProjects(items) {
  const stage = document.querySelector("[data-project-stage]");
  const dots = document.querySelector("[data-project-dots]");
  const previous = document.querySelector("[data-project-prev]");
  const next = document.querySelector("[data-project-next]");
  if (!stage || !dots || !previous || !next) return;

  const projects = visibleItems(items);
  setCounters("[data-project-count]", projects.length);
  projectCarousel.items = projects;
  projectCarousel.index = 0;
  dots.replaceChildren();

  if (projects.length === 0) {
    const empty = document.createElement("article");
    const title = document.createElement("strong");
    const copy = document.createElement("span");

    empty.className = "featured-project-empty";
    title.textContent = "Sin proyectos publicados";
    copy.textContent = "El carrusel se activará cuando publiques el primer proyecto.";
    empty.append(title, copy);
    stage.replaceChildren(empty);
    previous.disabled = true;
    next.disabled = true;
    return;
  }

  projects.forEach((project, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "project-dot";
    dot.setAttribute("aria-label", `Ver ${cleanText(project.name, `proyecto ${index + 1}`)}`);
    dot.addEventListener("click", () => updateProjectCarousel(index));
    dots.append(dot);
  });

  previous.onclick = () => updateProjectCarousel(projectCarousel.index - 1);
  next.onclick = () => updateProjectCarousel(projectCarousel.index + 1);
  updateProjectCarousel(0);
}

function heroSocialLink(item) {
  const link = document.createElement("a");
  const mark = document.createElement("span");
  const name = cleanText(item.name, "Enlace");

  link.className = "hero-social-link";
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `${name}, abrir en una pestaña nueva`);
  link.title = name;

  mark.textContent = cleanText(item.icon, name).slice(0, 3).toUpperCase();
  mark.setAttribute("aria-hidden", "true");
  link.append(mark);
  return link;
}

function noteCard(note) {
  const article = document.createElement("article");
  const date = document.createElement("div");
  const copy = document.createElement("div");
  const category = document.createElement("span");
  const title = document.createElement("h3");
  const description = document.createElement("p");

  article.className = "note-card";
  date.className = "note-date";
  copy.className = "note-copy";
  category.className = "tag";

  date.textContent = cleanText(note.date, "Sin fecha");
  category.textContent = cleanText(note.category, "Nota");
  title.textContent = cleanText(note.title, "Nota sin título");
  description.textContent = cleanText(note.description, "Sin contenido público.");

  copy.append(category, title, description);
  article.append(date, copy);
  return article;
}

function renderSocials(items) {
  const hero = document.querySelector("[data-hero-socials]");
  const socials = visibleItems(items).filter((item) => isSafeUrl(item.url));

  setCounters("[data-link-count]", socials.length);

  if (hero) {
    hero.replaceChildren(...socials.map(heroSocialLink));
    hero.hidden = socials.length === 0;
  }
}

function renderNotes(items) {
  const grid = document.querySelector("[data-note-grid]");
  if (!grid) return;

  const notes = visibleItems(items);
  setCounters("[data-note-count]", notes.length);
  grid.replaceChildren(
    ...(notes.length
      ? notes.map(noteCard)
      : [emptyState("Sin notas publicadas")])
  );
}

function updateYear() {
  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

async function initialize() {
  updateYear();

  try {
    const [projects, socials, notes] = await Promise.all([
      loadList(DATA_FILES.projects),
      loadList(DATA_FILES.socials),
      loadList(DATA_FILES.notes)
    ]);

    renderProjects(projects);
    renderSocials(socials);
    renderNotes(notes);
    document.documentElement.classList.add("content-hydrated");
  } catch (error) {
    console.error("No se pudo inicializar el contenido dinámico.", error);
  }
}

initialize();
