from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from html import escape
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
DATA_DIR = ROOT / "data"

HTML_START = "<!-- PRERENDER:START -->"
HTML_END = "<!-- PRERENDER:END -->"
LOCAL_ASSET_PATTERN = re.compile(r"^(?:\./)?assets/[a-zA-Z0-9/_\-.]+$")
VERSIONED_ASSETS = ("app.js", "ads.js", "ad-marquee.css")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8", newline="\n")


def text(value: object) -> str:
    return escape(str(value), quote=True)


def clean_text(value: object, fallback: str = "") -> str:
    return value.strip() if isinstance(value, str) and value.strip() else fallback


def item_order(item: dict) -> float:
    value = item.get("order")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return float("inf")


def load_visible_items(filename: str) -> list[dict]:
    path = DATA_DIR / filename
    payload = json.loads(read_text(path))
    if not isinstance(payload, list):
        raise ValueError(f"{path} debe contener una lista JSON.")

    items: list[dict] = []
    for index, item in enumerate(payload):
        if not isinstance(item, dict):
            raise ValueError(f"{path}: el elemento {index} debe ser un objeto.")

        visible = item.get("visible")
        if not isinstance(visible, bool):
            raise ValueError(f"{path}: el elemento {index} requiere visible booleano.")

        order = item.get("order")
        if not isinstance(order, (int, float)) or isinstance(order, bool):
            raise ValueError(f"{path}: el elemento {index} requiere order numérico.")

        if visible:
            items.append(item)

    return sorted(items, key=item_order)


def safe_external_url(value: object) -> str:
    candidate = clean_text(value)
    if not candidate:
        return ""

    parsed = urlparse(candidate)
    if parsed.scheme != "https" or not parsed.netloc:
        return ""
    return candidate


def safe_image_source(value: object) -> str:
    candidate = clean_text(value)
    if not candidate:
        return ""
    if candidate.startswith("https://"):
        return safe_external_url(candidate)
    return candidate if LOCAL_ASSET_PATTERN.fullmatch(candidate) else ""


def render_tags(item: dict) -> str:
    values = item.get("tags")
    if not isinstance(values, list):
        return ""

    tags = [clean_text(value) for value in values]
    tags = [value for value in tags if value]
    if not tags:
        return ""

    content = "".join(f"<li>{text(value)}</li>" for value in tags)
    return f'<ul class="prerender-fallback__tags">{content}</ul>'


def render_project(item: dict) -> str:
    name = clean_text(item.get("name"), "Proyecto sin nombre")
    description = clean_text(item.get("description"), "Sin descripción pública.")
    image = safe_image_source(item.get("image"))
    image_alt = clean_text(item.get("imageAlt"), f"Vista previa de {name}")
    url = safe_external_url(item.get("url"))
    link_label = clean_text(item.get("linkLabel"), "Ver detalles →")

    image_html = ""
    if image:
        image_html = (
            f'<img class="prerender-fallback__image" src="{text(image)}" '
            f'alt="{text(image_alt)}" loading="lazy" decoding="async">'
        )

    link_html = ""
    if url:
        link_html = (
            f'<p><a href="{text(url)}" target="_blank" '
            f'rel="noopener noreferrer">{text(link_label)}</a></p>'
        )

    return (
        '<article class="prerender-fallback__card">'
        f"{image_html}<h3>{text(name)}</h3><p>{text(description)}</p>"
        f"{render_tags(item)}{link_html}</article>"
    )


def render_social(item: dict) -> str:
    url = safe_external_url(item.get("url"))
    if not url:
        return ""

    name = clean_text(item.get("name"), "Enlace")
    return (
        f'<li><a href="{text(url)}" target="_blank" '
        f'rel="noopener noreferrer">{text(name)}</a></li>'
    )


def render_note(item: dict) -> str:
    title = clean_text(item.get("title"), "Nota sin título")
    description = clean_text(item.get("description"), "Sin contenido público.")
    date = clean_text(item.get("date"), "Sin fecha")

    return (
        '<article class="prerender-fallback__card">'
        f'<h3>{text(title)}</h3><p class="prerender-fallback__meta">{text(date)}</p>'
        f"<p>{text(description)}</p></article>"
    )


def section(
    title: str,
    content: str,
    modifier: str,
    wrapper_tag: str,
    wrapper_class: str,
) -> str:
    if not content:
        return ""
    return (
        f'<section class="prerender-fallback__section prerender-fallback__section--{modifier}">'
        f"<h2>{text(title)}</h2>"
        f'<{wrapper_tag} class="{wrapper_class}">{content}</{wrapper_tag}></section>'
    )


def build_fallback() -> str:
    projects = load_visible_items("projects.json")
    socials = load_visible_items("socials.json")
    notes = load_visible_items("notes.json")

    blocks = [
        section(
            "Proyectos publicados",
            "".join(render_project(item) for item in projects),
            "projects",
            "div",
            "prerender-fallback__grid",
        ),
        section(
            "Enlaces oficiales",
            "".join(filter(None, (render_social(item) for item in socials))),
            "links",
            "ul",
            "prerender-fallback__links",
        ),
        section(
            "Notas publicadas",
            "".join(render_note(item) for item in notes),
            "notes",
            "div",
            "prerender-fallback__grid",
        ),
    ]
    content = "\n    ".join(block for block in blocks if block)

    if not content:
        content = '<p class="prerender-fallback__card">No hay contenido publicado.</p>'

    return (
        f"{HTML_START}\n"
        '<section class="prerender-fallback" data-prerender-fallback '
        'aria-label="Contenido publicado">\n'
        '  <div class="prerender-fallback__inner">\n'
        f"    {content}\n"
        "  </div>\n"
        "</section>\n"
        f"{HTML_END}"
    )


def replace_fallback(source: str, fallback: str) -> str:
    pattern = re.compile(
        re.escape(HTML_START) + r".*?" + re.escape(HTML_END),
        re.DOTALL,
    )
    if pattern.search(source):
        return pattern.sub(fallback, source, count=1)

    position = source.lower().rfind("</main>")
    if position == -1:
        raise ValueError("index.html no contiene </main>.")
    return source[:position] + fallback + "\n" + source[position:]


def asset_version(filename: str) -> str:
    digest = hashlib.sha256((ROOT / filename).read_bytes()).hexdigest()
    return digest[:12]


def update_asset_version(source: str, filename: str) -> str:
    version = asset_version(filename)
    pattern = re.compile(
        rf'(?P<prefix>(?:src|href)=["\']{re.escape(filename)})(?:\?v=[^"\']*)?'
    )
    updated, count = pattern.subn(rf"\g<prefix>?v={version}", source, count=1)
    if count != 1:
        raise ValueError(f"No se encontró una referencia única a {filename} en index.html.")
    return updated


def expected_index() -> str:
    source = replace_fallback(read_text(INDEX_PATH), build_fallback())
    for filename in VERSIONED_ASSETS:
        source = update_asset_version(source, filename)
    return source


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Genera el fallback HTML desde data/*.json.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="comprueba que index.html esté actualizado sin modificarlo",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    current = read_text(INDEX_PATH)
    expected = expected_index()

    if args.check:
        if current != expected:
            print(
                "ERROR: index.html está desactualizado. Ejecuta python scripts/prerender.py.",
                file=sys.stderr,
            )
            return 1
        print("Pre-renderizado actualizado.")
        return 0

    if current == expected:
        print("Pre-renderizado sin cambios.")
        return 0

    write_text(INDEX_PATH, expected)
    print("Pre-renderizado generado.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
