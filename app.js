const DATA_FILES = Object.freeze({
  projects: "data/projects.json",
  socials: "data/socials.json",
  notes: "data/notes.json"
});

function isSafeUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function loadList(path) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new TypeError(`${path} debe contener una lista JSON`);
    return data;
  } catch (error) {
    console.warn(`No se pudo cargar ${path}.`, error);
    return [];
  }
}

function visibleItems(items) {
  return items
    .filter((item) => item && typeof item === "object" && item.visible === true)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
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

function projectCard(project, index) {
  const article = document.createElement("article");
  const topline = document.createElement("div");
  const number = document.createElement("span");
  const category = document.createElement("span");
  const title = document.createElement("h3");
  const description = document.createElement("p");
  const tags = document.createElement("div");

  article.className = `project-card${project.featured === true ? " featured" : ""}`;
  topline.className = "item-topline";
  number.className = "item-number";
  category.className = "tag";
  tags.className = "tag-list";

  number.textContent = String(index + 1).padStart(2, "0");
  category.textContent = cleanText(project.category, "Proyecto");
  title.textContent = cleanText(project.name, "Proyecto sin nombre");
  description.textContent = cleanText(project.description, "Sin descripción pública.");

  if (Array.isArray(project.tags)) {
    project.tags.forEach((value) => {
      const text = cleanText(String(value));
      if (!text) return;
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = text;
      tags.append(tag);
    });
  }

  topline.append(number, category);
  article.append(topline, title, description);
  if (tags.childElementCount > 0) article.append(tags);

  if (isSafeUrl(project.url)) {
    const link = document.createElement("a");
    link.className = "item-link";
    link.href = project.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = cleanText(project.linkLabel, "Abrir enlace ↗");
    article.append(link);
  }

  return article;
}

function socialCard(item) {
  const link = document.createElement("a");
  const icon = document.createElement("span");
  const copy = document.createElement("span");
  const name = document.createElement("strong");
  const description = document.createElement("small");
  const arrow = document.createElement("b");

  link.className = "social-card";
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `${cleanText(item.name, "Enlace")}, abrir en una pestaña nueva`);

  icon.className = "social-icon";
  icon.textContent = cleanText(item.icon, cleanText(item.name, "+")).slice(0, 3).toUpperCase();
  name.textContent = cleanText(item.name, "Enlace sin nombre");
  description.textContent = cleanText(item.description, "Enlace publicado.");
  arrow.textContent = "↗";
  arrow.setAttribute("aria-hidden", "true");

  copy.append(name, description);
  link.append(icon, copy, arrow);
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

function renderProjects(items) {
  const grid = document.querySelector("[data-project-grid]");
  if (!grid) return;

  const projects = visibleItems(items);
  setCounters("[data-project-count]", projects.length);
  grid.replaceChildren(
    ...(projects.length
      ? projects.map(projectCard)
      : [emptyState("Sin proyectos publicados")])
  );
}

function renderSocials(items) {
  const grid = document.querySelector("[data-social-grid]");
  if (!grid) return;

  const socials = visibleItems(items).filter((item) => isSafeUrl(item.url));
  setCounters("[data-link-count]", socials.length);
  grid.replaceChildren(
    ...(socials.length
      ? socials.map(socialCard)
      : [emptyState("Sin enlaces publicados")])
  );
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

async function initialize() {
  const [projects, socials, notes] = await Promise.all([
    loadList(DATA_FILES.projects),
    loadList(DATA_FILES.socials),
    loadList(DATA_FILES.notes)
  ]);

  renderProjects(projects);
  renderSocials(socials);
  renderNotes(notes);

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

initialize();
