from __future__ import annotations

from html import escape
from pathlib import Path
from urllib.parse import urlparse
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
APP_PATH = ROOT / "app.js"
STYLE_PATH = ROOT / "styles.css"
README_PATH = ROOT / "README.md"
DATA_DIR = ROOT / "data"

HTML_START = "<!-- PRERENDER:START -->"
HTML_END = "<!-- PRERENDER:END -->"
CSS_START = "/* PRERENDER:FALLBACK:START */"
CSS_END = "/* PRERENDER:FALLBACK:END */"
DOCS_START = "<!-- PRERENDER-DOCS:START -->"
DOCS_END = "<!-- PRERENDER-DOCS:END -->"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8", newline="\n")


def load_items(filename: str) -> list[dict]:
    path = DATA_DIR / filename
    payload = json.loads(read_text(path))
    if not isinstance(payload, list):
        raise ValueError(f"{path} debe contener una lista JSON.")

    items: list[dict] = []
    for index, item in enumerate(payload):
        if not isinstance(item, dict):
            raise ValueError(f"{path}: elemento {index} no es un objeto.")
        if item.get("visible", True) is False:
            continue
        items.append(item)

    def order_key(pair: tuple[int, dict]) -> tuple[float, int]:
        index, item = pair
        order = item.get("order")
        if isinstance(order, (int, float)):
            return (float(order), index)
        return (float("inf"), index)

    return [item for _, item in sorted(enumerate(items), key=order_key)]


def first_text(item: dict, *keys: str) -> str:
    for key in keys:
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def safe_external_url(value: str) -> str:
    if not value:
        return ""
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    return value


def safe_asset_path(value: str) -> str:
    if not value:
        return ""
    if value.startswith(("http://", "https://")):
        return safe_external_url(value)
    if value.startswith(("/", "\\")) or ":" in value or ".." in value:
        return ""
    return value


def text(value: object) -> str:
    return escape(str(value), quote=True)


def render_tags(item: dict) -> str:
    tags = item.get("tags")
    if not isinstance(tags, list):
        return ""
    clean = [text(tag) for tag in tags if isinstance(tag, str) and tag.strip()]
    if not clean:
        return ""
    values = "".join(f"<li>{tag}</li>" for tag in clean)
    return f'<ul class="prerender-fallback__tags">{values}</ul>'


def render_project(item: dict) -> str:
    title = first_text(item, "title", "name", "label", "id") or "Proyecto"
    description = first_text(item, "description", "summary", "excerpt", "body")
    status = first_text(item, "status", "state")
    url = safe_external_url(
        first_text(item, "url", "link", "website", "github", "repository")
    )
    image = safe_asset_path(
        first_text(item, "image", "imageUrl", "cover", "thumbnail")
    )
    link_label = first_text(item, "linkLabel", "cta", "ctaLabel") or "Abrir proyecto"

    image_html = ""
    if image:
        image_html = (
            f'<img class="prerender-fallback__image" src="{text(image)}" '
            'alt="" loading="lazy" decoding="async">'
        )

    status_html = (
        f'<p class="prerender-fallback__meta">{text(status)}</p>' if status else ""
    )
    description_html = f"<p>{text(description)}</p>" if description else ""
    link_html = ""
    if url:
        link_html = (
            f'<p><a href="{text(url)}" target="_blank" '
            f'rel="noopener noreferrer">{text(link_label)}</a></p>'
        )

    return (
        '<article class="prerender-fallback__card">'
        f"{image_html}<h3>{text(title)}</h3>{status_html}{description_html}"
        f"{render_tags(item)}{link_html}</article>"
    )


def render_social(item: dict) -> str:
    label = first_text(item, "label", "name", "title", "platform") or "Enlace"
    url = safe_external_url(first_text(item, "url", "link", "href"))
    if not url:
        return ""
    return (
        f'<li><a href="{text(url)}" target="_blank" '
        f'rel="noopener noreferrer">{text(label)}</a></li>'
    )


def render_note(item: dict) -> str:
    title = first_text(item, "title", "name", "label") or "Nota"
    body = first_text(item, "body", "content", "description", "summary", "excerpt")
    date = first_text(item, "date", "publishedAt", "createdAt")
    url = safe_external_url(first_text(item, "url", "link", "href"))

    date_html = f'<p class="prerender-fallback__meta">{text(date)}</p>' if date else ""
    body_html = f"<p>{text(body)}</p>" if body else ""
    title_html = text(title)
    if url:
        title_html = (
            f'<a href="{text(url)}" target="_blank" '
            f'rel="noopener noreferrer">{title_html}</a>'
        )

    return (
        '<article class="prerender-fallback__card">'
        f"<h3>{title_html}</h3>{date_html}{body_html}</article>"
    )


def section(title: str, content: str, modifier: str) -> str:
    if not content:
        return ""
    return (
        f'<section class="prerender-fallback__section '
        f'prerender-fallback__section--{modifier}">'
        f"<h2>{text(title)}</h2>{content}</section>"
    )


def build_fallback() -> str:
    projects = load_items("projects.json")
    socials = load_items("socials.json")
    notes = load_items("notes.json")

    project_cards = "".join(render_project(item) for item in projects)
    social_links = "".join(filter(None, (render_social(item) for item in socials)))
    note_cards = "".join(render_note(item) for item in notes)

    blocks: list[str] = []
    if project_cards:
        blocks.append(
            section(
                "Proyectos publicados",
                f'<div class="prerender-fallback__grid">{project_cards}</div>',
                "projects",
            )
        )
    if social_links:
        blocks.append(
            section(
                "Enlaces oficiales",
                f'<ul class="prerender-fallback__links">{social_links}</ul>',
                "links",
            )
        )
    if note_cards:
        blocks.append(
            section(
                "Notas publicadas",
                f'<div class="prerender-fallback__grid">{note_cards}</div>',
                "notes",
            )
        )

    if not blocks:
        raise ValueError("No hay contenido visible para pre-renderizar.")

    indented = "\n".join(f"    {block}" for block in blocks)
    return (
        f"{HTML_START}\n"
        '<section class="prerender-fallback" data-prerender-fallback '
        'aria-label="Contenido publicado">\n'
        '  <div class="prerender-fallback__inner">\n'
        f"{indented}\n"
        "  </div>\n"
        "</section>\n"
        f"{HTML_END}"
    )


def replace_or_insert(
    source: str,
    start_marker: str,
    end_marker: str,
    replacement: str,
    insertion_marker: str,
) -> str:
    pattern = re.compile(
        re.escape(start_marker) + r".*?" + re.escape(end_marker),
        re.DOTALL,
    )
    if pattern.search(source):
        return pattern.sub(replacement, source, count=1)

    position = source.lower().rfind(insertion_marker.lower())
    if position == -1:
        raise ValueError(f"No se encontro {insertion_marker}.")
    return source[:position] + replacement + "\n" + source[position:]


def function_bounds(source: str, name: str) -> tuple[int, int]:
    match = re.search(
        rf"(?:async\s+)?function\s+{re.escape(name)}\s*\([^)]*\)\s*\{{",
        source,
    )
    if not match:
        raise ValueError(f"No se encontro la funcion {name}().")

    open_brace = source.find("{", match.start())
    depth = 0
    quote = ""
    escaped = False
    line_comment = False
    block_comment = False
    index = open_brace

    while index < len(source):
        char = source[index]
        next_char = source[index + 1] if index + 1 < len(source) else ""

        if line_comment:
            if char == "\n":
                line_comment = False
        elif block_comment:
            if char == "*" and next_char == "/":
                block_comment = False
                index += 1
        elif quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = ""
        else:
            if char == "/" and next_char == "/":
                line_comment = True
                index += 1
            elif char == "/" and next_char == "*":
                block_comment = True
                index += 1
            elif char in {"'", '"', "`"}:
                quote = char
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return match.start(), index
        index += 1

    raise ValueError(f"No se pudo cerrar la funcion {name}().")


def update_index() -> None:
    source = read_text(INDEX_PATH)
    source = replace_or_insert(
        source,
        HTML_START,
        HTML_END,
        build_fallback(),
        "</main>",
    )

    source = re.sub(
        r'(?P<prefix><script\s+src=["\']app\.js)(?:\?v=[^"\']*)?',
        r"\g<prefix>?v=20260723-1",
        source,
        count=1,
    )
    source = re.sub(
        r'(?P<prefix>href=["\']styles\.css)(?:\?v=[^"\']*)?',
        r"\g<prefix>?v=20260723-1",
        source,
        count=1,
    )
    write_text(INDEX_PATH, source)


def update_app() -> None:
    source = read_text(APP_PATH)
    marker = 'document.documentElement.classList.add("content-hydrated");'
    if marker in source:
        return

    _, closing_brace = function_bounds(source, "initialize")
    line_start = source.rfind("\n", 0, closing_brace) + 1
    base_indent = re.match(r"[ \t]*", source[line_start:closing_brace]).group(0)
    insertion = f'\n{base_indent}  {marker}\n{base_indent}'
    source = source[:closing_brace] + insertion + source[closing_brace:]
    write_text(APP_PATH, source)


def update_styles() -> None:
    source = read_text(STYLE_PATH)
    css = """/* PRERENDER:FALLBACK:START */
.content-hydrated [data-prerender-fallback] {
  display: none;
}

.prerender-fallback {
  width: min(1180px, calc(100% - 2rem));
  margin: 2rem auto;
}

.prerender-fallback__inner,
.prerender-fallback__grid {
  display: grid;
  gap: 1rem;
}

.prerender-fallback__section {
  display: grid;
  gap: 0.75rem;
}

.prerender-fallback__section > h2 {
  margin: 0;
  text-transform: uppercase;
}

.prerender-fallback__card {
  border: 4px solid #050505;
  padding: 1rem;
  background: #f7f7ef;
  color: #050505;
  box-shadow: 6px 6px 0 #050505;
}

.prerender-fallback__card > :first-child {
  margin-top: 0;
}

.prerender-fallback__card > :last-child {
  margin-bottom: 0;
}

.prerender-fallback__image {
  display: block;
  width: 100%;
  height: auto;
  margin-bottom: 0.75rem;
  border: 3px solid #050505;
}

.prerender-fallback__meta {
  font-weight: 800;
  text-transform: uppercase;
}

.prerender-fallback__links,
.prerender-fallback__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.prerender-fallback a {
  font-weight: 900;
  color: inherit;
  text-decoration-thickness: 0.18em;
}

@media (min-width: 760px) {
  .prerender-fallback__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
/* PRERENDER:FALLBACK:END */"""

    pattern = re.compile(
        re.escape(CSS_START) + r".*?" + re.escape(CSS_END),
        re.DOTALL,
    )
    if pattern.search(source):
        source = pattern.sub(css, source, count=1)
    else:
        source = source.rstrip() + "\n\n" + css + "\n"
    write_text(STYLE_PATH, source)


def update_readme() -> None:
    source = read_text(README_PATH)
    docs = """<!-- PRERENDER-DOCS:START -->
## Pre-renderizado

`data/projects.json`, `data/socials.json` y `data/notes.json` siguen siendo la fuente de verdad.

Despues de editar esos archivos, regenera el fallback HTML:

```powershell
python scripts/prerender.py
```

El script actualiza el bloque `PRERENDER` dentro de `index.html`. El contenido queda disponible sin JavaScript y para crawlers que solo leen HTML. Cuando `app.js` termina de renderizar la interfaz interactiva, oculta el fallback mediante la clase `content-hydrated`.

No requiere un workflow personalizado de GitHub Pages.
<!-- PRERENDER-DOCS:END -->"""

    pattern = re.compile(
        re.escape(DOCS_START) + r".*?" + re.escape(DOCS_END),
        re.DOTALL,
    )
    if pattern.search(source):
        source = pattern.sub(docs, source, count=1)
    else:
        source = source.rstrip() + "\n\n" + docs + "\n"
    write_text(README_PATH, source)


def verify() -> None:
    index = read_text(INDEX_PATH)
    app = read_text(APP_PATH)
    styles = read_text(STYLE_PATH)

    checks = {
        "marcador HTML inicial": HTML_START in index,
        "marcador HTML final": HTML_END in index,
        "fallback semantico": "data-prerender-fallback" in index,
        "proyectos pre-renderizados": "Proyectos publicados" in index,
        "enlaces pre-renderizados": "Enlaces oficiales" in index,
        "hidratacion JS": 'classList.add("content-hydrated")' in app,
        "ocultacion tras hidratar": (
            ".content-hydrated [data-prerender-fallback]" in styles
        ),
    }
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        raise ValueError("Fallo la verificacion: " + ", ".join(failed))


def main() -> int:
    update_index()
    update_app()
    update_styles()
    update_readme()
    verify()
    print("Pre-renderizado generado y verificado.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
