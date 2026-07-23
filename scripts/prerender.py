from __future__ import annotations

import argparse
import base64
import difflib
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
SOCIALS_START = "<!-- STATIC-SOCIALS:START -->"
SOCIALS_END = "<!-- STATIC-SOCIALS:END -->"
JSONLD_START = "<!-- PERSON-JSONLD:START -->"
JSONLD_END = "<!-- PERSON-JSONLD:END -->"

SITE_URL = "https://morimilpabfelon-cell.github.io/Web-Eidon-Aetho/"
PROFILE_IMAGE_URL = SITE_URL + "assets/og-cover.png"
GITHUB_PROFILE_URL = "https://github.com/morimilpabfelon-cell"
LOCAL_ASSET_PATTERN = re.compile(r"^(?:\./)?assets/[a-zA-Z0-9/_\-.]+$")
VERSIONED_ASSETS = ("app.js", "ads.js", "ad-marquee.css", "hero-profile.css")


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


def render_note(item: dict) -> str:
    title = clean_text(item.get("title"), "Nota sin título")
    description = clean_text(item.get("description"), "Sin contenido público.")
    date = clean_text(item.get("date"), "Sin fecha")

    return (
        '<article class="prerender-fallback__card">'
        f'<h3>{text(title)}</h3><p class="prerender-fallback__meta">{text(date)}</p>'
        f"<p>{text(description)}</p></article>"
    )


def render_social_anchor(item: dict) -> str:
    url = safe_external_url(item.get("url"))
    if not url:
        return ""

    name = clean_text(item.get("name"), "Enlace")
    icon = clean_text(item.get("icon"), name)[:3].upper()
    label = f"{name}, abrir en una pestaña nueva"
    return (
        f'<a class="hero-social-link" href="{text(url)}" target="_blank" '
        f'rel="noopener noreferrer" title="{text(name)}" aria-label="{text(label)}">'
        f'<span aria-hidden="true">{text(icon)}</span></a>'
    )


def section(title: str, content: str, modifier: str) -> str:
    if not content:
        return ""
    return (
        f'<section class="prerender-fallback__section prerender-fallback__section--{modifier}">'
        f"<h2>{text(title)}</h2>"
        f'<div class="prerender-fallback__grid">{content}</div></section>'
    )


def build_fallback(projects: list[dict], notes: list[dict]) -> str:
    blocks = [
        section("Proyectos publicados", "".join(render_project(item) for item in projects), "projects"),
        section("Notas publicadas", "".join(render_note(item) for item in notes), "notes"),
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


def build_static_socials(socials: list[dict]) -> tuple[str, list[str]]:
    anchors = [render_social_anchor(item) for item in socials]
    anchors = [anchor for anchor in anchors if anchor]
    urls = [safe_external_url(item.get("url")) for item in socials]
    urls = [url for url in urls if url]

    if anchors:
        content = "\n            ".join(anchors)
        block = f"{SOCIALS_START}\n            {content}\n            {SOCIALS_END}"
    else:
        block = f"{SOCIALS_START}\n            {SOCIALS_END}"
    return block, urls


def build_jsonld(social_urls: list[str]) -> tuple[str, str]:
    same_as = list(dict.fromkeys([*social_urls, GITHUB_PROFILE_URL]))
    payload = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Eidon Aetho",
        "alternateName": "Eidon",
        "url": SITE_URL,
        "image": PROFILE_IMAGE_URL,
        "jobTitle": "Programador independiente",
        "description": "Desarrolla proyectos de software y publica una selección de trabajos, enlaces y notas.",
        "sameAs": same_as,
    }
    json_text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    block = (
        f"{JSONLD_START}\n"
        f'  <script type="application/ld+json">{json_text}</script>\n'
        f"  {JSONLD_END}"
    )
    digest = base64.b64encode(hashlib.sha256(json_text.encode("utf-8")).digest()).decode("ascii")
    return block, f"sha256-{digest}"


def replace_marked_block(source: str, start: str, end: str, replacement: str) -> str:
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.DOTALL)
    if not pattern.search(source):
        raise ValueError(f"index.html no contiene el bloque {start}.")
    return pattern.sub(replacement, source, count=1)


def update_link_count(source: str, count: int) -> str:
    pattern = re.compile(r'(<b\s+data-link-count>)[^<]*(</b>)')
    updated, matches = pattern.subn(rf"\g<1>{count}\g<2>", source, count=1)
    if matches != 1:
        raise ValueError("No se encontró data-link-count en index.html.")
    return updated


def update_social_hidden_state(source: str, count: int) -> str:
    pattern = re.compile(
        r'(<div class="hero-socials" id="enlaces" data-hero-socials aria-label="Redes sociales")(?P<hidden> hidden)?(>)'
    )

    def replacement(match: re.Match[str]) -> str:
        hidden = " hidden" if count == 0 else ""
        return f"{match.group(1)}{hidden}{match.group(3)}"

    updated, matches = pattern.subn(replacement, source, count=1)
    if matches != 1:
        raise ValueError("No se encontró el contenedor hero-socials en index.html.")
    return updated


def update_csp_hash(source: str, script_hash: str) -> str:
    pattern = re.compile(
        r'(<meta http-equiv="Content-Security-Policy" content=")(?P<policy>[^"]+)(">)'
    )

    def replacement(match: re.Match[str]) -> str:
        policy = re.sub(r"\s+'sha256-[A-Za-z0-9+/=]+'", "", match.group("policy"))
        policy = policy.replace("script-src 'self'", f"script-src 'self' '{script_hash}'", 1)
        return f"{match.group(1)}{policy}{match.group(3)}"

    updated, matches = pattern.subn(replacement, source, count=1)
    if matches != 1:
        raise ValueError("No se encontró la Content-Security-Policy en index.html.")
    return updated


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
    projects = load_visible_items("projects.json")
    socials = load_visible_items("socials.json")
    notes = load_visible_items("notes.json")

    social_block, social_urls = build_static_socials(socials)
    jsonld_block, jsonld_hash = build_jsonld(social_urls)

    source = read_text(INDEX_PATH)
    source = replace_marked_block(source, SOCIALS_START, SOCIALS_END, social_block)
    source = replace_marked_block(source, JSONLD_START, JSONLD_END, jsonld_block)
    source = replace_marked_block(source, HTML_START, HTML_END, build_fallback(projects, notes))
    source = update_link_count(source, len(social_urls))
    source = update_social_hidden_state(source, len(social_urls))
    source = update_csp_hash(source, jsonld_hash)

    for filename in VERSIONED_ASSETS:
        source = update_asset_version(source, filename)
    return source


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Genera contenido HTML estático desde data/*.json."
    )
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
            diff = difflib.unified_diff(
                current.splitlines(),
                expected.splitlines(),
                fromfile="index.html",
                tofile="index.html esperado",
                lineterm="",
            )
            print("\n".join(diff), file=sys.stderr)
            return 1
        print("Contenido estático actualizado.")
        return 0

    if current == expected:
        print("Contenido estático sin cambios.")
        return 0

    write_text(INDEX_PATH, expected)
    print("Contenido estático generado.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
