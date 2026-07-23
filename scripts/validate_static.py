from __future__ import annotations

import base64
import hashlib
import json
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
ROBOTS_PATH = ROOT / "robots.txt"
SITEMAP_PATH = ROOT / "sitemap.xml"
NOT_FOUND_PATH = ROOT / "404.html"
SOCIALS_PATH = ROOT / "data" / "socials.json"
GITHUB_PROFILE_URL = "https://github.com/morimilpabfelon-cell"


class DocumentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: list[dict[str, str]] = []
        self.links: list[dict[str, str]] = []
        self.scripts: list[tuple[dict[str, str], str]] = []
        self.anchors: list[dict[str, str]] = []
        self._script_attrs: dict[str, str] | None = None
        self._script_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        if tag == "meta":
            self.meta.append(values)
        elif tag == "link":
            self.links.append(values)
        elif tag == "a":
            self.anchors.append(values)
        elif tag == "script":
            self._script_attrs = values
            self._script_parts = []

    def handle_data(self, data: str) -> None:
        if self._script_attrs is not None:
            self._script_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._script_attrs is not None:
            self.scripts.append((self._script_attrs, "".join(self._script_parts)))
            self._script_attrs = None
            self._script_parts = []


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def parse_html(path: Path) -> tuple[str, DocumentParser]:
    source = path.read_text(encoding="utf-8")
    parser = DocumentParser()
    parser.feed(source)
    parser.close()
    return source, parser


def meta_value(parser: DocumentParser, key: str, value: str, field: str = "content") -> str:
    matches = [item.get(field, "") for item in parser.meta if item.get(key) == value]
    require(len(matches) == 1, f"Se esperaba un único meta {key}={value}.")
    return matches[0]


def canonical_url(parser: DocumentParser) -> str:
    matches = [item.get("href", "") for item in parser.links if item.get("rel") == "canonical"]
    require(len(matches) == 1, "Se esperaba un único enlace canonical.")
    url = matches[0]
    parsed = urlparse(url)
    require(parsed.scheme == "https" and parsed.netloc, "El canonical debe usar HTTPS.")
    require(url.endswith("/"), "El canonical debe terminar en /.")
    return url


def visible_social_urls() -> list[str]:
    payload = json.loads(SOCIALS_PATH.read_text(encoding="utf-8"))
    require(isinstance(payload, list), "socials.json debe contener una lista.")
    visible = [item for item in payload if isinstance(item, dict) and item.get("visible") is True]
    visible.sort(key=lambda item: float(item.get("order", float("inf"))))
    urls = [item.get("url", "") for item in visible]
    for url in urls:
        parsed = urlparse(url)
        require(parsed.scheme == "https" and parsed.netloc, f"Enlace social inválido: {url}")
    return urls


def validate_index() -> str:
    source, parser = parse_html(INDEX_PATH)
    canonical = canonical_url(parser)

    require(meta_value(parser, "property", "og:url") == canonical, "og:url no coincide con canonical.")
    require(meta_value(parser, "name", "referrer") == "strict-origin-when-cross-origin", "Política referrer inesperada.")

    social_urls = visible_social_urls()
    raw_social_urls = [
        anchor.get("href", "")
        for anchor in parser.anchors
        if "hero-social-link" in anchor.get("class", "").split()
    ]
    require(raw_social_urls == social_urls, "Los enlaces sociales estáticos no coinciden con socials.json.")

    jsonld_scripts = [content for attrs, content in parser.scripts if attrs.get("type") == "application/ld+json"]
    require(len(jsonld_scripts) == 1, "Debe existir un único bloque JSON-LD.")
    jsonld_text = jsonld_scripts[0]
    payload = json.loads(jsonld_text)
    require(payload.get("@context") == "https://schema.org", "Contexto JSON-LD inválido.")
    require(payload.get("@type") == "Person", "El JSON-LD debe describir una Person.")
    require(payload.get("url") == canonical, "La URL de JSON-LD no coincide con canonical.")
    require(payload.get("sameAs") == [*social_urls, GITHUB_PROFILE_URL], "sameAs no coincide con los enlaces oficiales.")

    csp = meta_value(parser, "http-equiv", "Content-Security-Policy")
    digest = base64.b64encode(hashlib.sha256(jsonld_text.encode("utf-8")).digest()).decode("ascii")
    require(f"'sha256-{digest}'" in csp, "El hash CSP del JSON-LD no coincide.")

    require(source.count("<!-- STATIC-SOCIALS:START -->") == 1, "Marcador social inicial inválido.")
    require(source.count("<!-- STATIC-SOCIALS:END -->") == 1, "Marcador social final inválido.")
    require(source.count("<!-- PRERENDER:START -->") == 1, "Marcador prerender inicial inválido.")
    require(source.count("<!-- PRERENDER:END -->") == 1, "Marcador prerender final inválido.")

    for asset in ("assets/eidon-cat.webp", "assets/og-cover.png"):
        path = ROOT / asset
        require(path.is_file() and path.stat().st_size > 0, f"Falta el recurso {asset}.")

    return canonical


def validate_sitemap(canonical: str) -> None:
    root = ET.parse(SITEMAP_PATH).getroot()
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locations = [node.text or "" for node in root.findall("sm:url/sm:loc", namespace)]
    require(locations == [canonical], "sitemap.xml debe contener únicamente la URL canonical.")


def validate_robots(canonical: str) -> None:
    content = ROBOTS_PATH.read_text(encoding="utf-8")
    require("User-agent: *" in content, "robots.txt no define User-agent: *.")
    require("Allow: /" in content, "robots.txt no permite el rastreo.")
    require(f"Sitemap: {canonical}sitemap.xml" in content, "robots.txt no apunta al sitemap canonical.")


def validate_404(canonical: str) -> None:
    _, parser = parse_html(NOT_FOUND_PATH)
    require(meta_value(parser, "name", "robots") == "noindex,follow", "404.html debe usar noindex,follow.")
    expected_path = urlparse(canonical).path
    home_links = [item.get("href", "") for item in parser.anchors]
    require(expected_path in home_links, "404.html no enlaza al inicio correcto.")


def main() -> int:
    canonical = validate_index()
    validate_sitemap(canonical)
    validate_robots(canonical)
    validate_404(canonical)
    print("HTML, JSON-LD, CSP, sitemap, robots y 404 válidos.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError, ET.ParseError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
