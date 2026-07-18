const DATA_FILES = {
  projects: "data/projects.json",
  socials: "data/socials.json",
  notes: "data/notes.json"
};

function isSafeUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function loadList(path) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new TypeError(`${path} debe contener una lista JSON`);
    return data;
  } catch (error) {
    console.warn(`No se pudo cargar ${path}. La sección permanecerá vacía.`, error);
    return [];
  }
}

function visibleItems(items) {
  return items
    .filter((item) => item && item.visible === true)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function emptyState(title, description) {
  const article = document.createElement("article");
  const strong = document.createElement("strong");
  const paragraph = document.createElement("p");
  article.className = "empty-state";
  strong.textContent = title;
  paragraph.textContent = description;
  article.append(strong, paragraph);
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
  category.textContent = String(project.category || "Proyecto");
  title.textContent = String(project.name || "Proyecto sin nombre");
  description.textContent = String(project.description || "Sin descripción pública.");

  const projectTags = Array.isArray(project.tags) ? project.tags : [];
  projectTags.forEach((value) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = String(value);
    tags.append(tag);
  });

  topline.append(number, category);
  article.append(topline, title, description);
  if (tags.childElementCount > 0) article.append(tags);

  if (isSafeUrl(project.url)) {
    const link = document.createElement("a");
    link.className = "item-link";
    link.href = project.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Abrir enlace ↗";
    article.append(link);
  }

  return article;
}

function socialCard(item) {
  const element = isSafeUrl(item.url) ? document.createElement("a") : document.createElement("article");
  const icon = document.createElement("span");
  const copy = document.createElement("span");
  const name = document.createElement("strong");
  const description = document.createElement("small");
  const arrow = document.createElement("b");

  element.className = "social-card";
  icon.className = "social-icon";
  icon.textContent = String(item.icon || item.name || "+").slice(0, 3).toUpperCase();
  name.textContent = String(item.name || "Enlace sin nombre");
  description.textContent = String(item.description || "Sin descripción pública.");
  arrow.textContent = isSafeUrl(item.url) ? "↗" : "—";
  copy.append(name, description);
  element.append(icon, copy, arrow);

  if (element instanceof HTMLAnchorElement) {
    element.href = item.url;
    element.target = "_blank";
    element.rel = "noreferrer";
  }

  return element;
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

  date.textContent = String(note.date || "Sin fecha");
  category.textContent = String(note.category || "Nota");
  title.textContent = String(note.title || "Nota sin título");
  description.textContent = String(note.description || "Sin contenido público.");

  copy.append(category, title, description);
  article.append(date, copy);
  return article;
}

function renderProjects(items) {
  const grid = document.querySelector("[data-project-grid]");
  const counter = document.querySelector("[data-project-count]");
  if (!grid) return;
  const projects = visibleItems(items);
  if (counter) counter.textContent = String(projects.length);
  grid.replaceChildren(
    ...(projects.length > 0
      ? projects.map(projectCard)
      : [emptyState("No hay proyectos publicados", "Tú decides cuándo agregar el primero en data/projects.json.")])
  );
}

function renderSocials(items) {
  const grid = document.querySelector("[data-social-grid]");
  const counter = document.querySelector("[data-link-count]");
  if (!grid) return;
  const socials = visibleItems(items);
  if (counter) counter.textContent = String(socials.length);
  grid.replaceChildren(
    ...(socials.length > 0
      ? socials.map(socialCard)
      : [emptyState("No hay enlaces publicados", "Los canales y perfiles aparecerán solo cuando tú los agregues.")])
  );
}

function renderNotes(items) {
  const grid = document.querySelector("[data-note-grid]");
  const counter = document.querySelector("[data-note-count]");
  if (!grid) return;
  const notes = visibleItems(items);
  if (counter) counter.textContent = String(notes.length);
  grid.replaceChildren(
    ...(notes.length > 0
      ? notes.map(noteCard)
      : [emptyState("No hay notas publicadas", "Esta sección permanecerá vacía hasta que tú escribas una nota pública.")])
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
}

initialize();
