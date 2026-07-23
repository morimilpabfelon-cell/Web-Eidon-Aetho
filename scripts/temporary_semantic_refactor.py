from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8", newline="\n")


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: se esperaba 1 coincidencia y se encontraron {count}")
    return source.replace(old, new, 1)


index = read("index.html")
index = replace_once(
    index,
    '          <h1 class="hero-identity">\n            <span>DIGITAL NOMAD</span>',
    '          <h1 class="hero-identity">\n            <span class="hero-name">EIDON AETHO</span>\n            <span>DIGITAL NOMAD</span>',
    "nombre dentro del h1",
)
index = replace_once(
    index,
    '             role="tabpanel" aria-live="polite"></div>',
    '             role="tabpanel" aria-labelledby="featured-projects-title" aria-live="polite"></div>',
    "etiqueta estática del panel",
)
write("index.html", index)

heading = read("hero-heading.css")
heading = replace_once(
    heading,
    ".hero-identity-mobile {\n  display: none !important;\n}",
    ".hero-identity > .hero-identity-mobile {\n  display: none;\n}",
    "selector móvil base",
)
heading = replace_once(
    heading,
    ".hero-identity-desktop {\n    display: none !important;\n  }",
    ".hero-identity > .hero-identity-desktop {\n    display: none;\n  }",
    "selector desktop móvil",
)
heading = replace_once(
    heading,
    ".hero-identity-mobile {\n    display: block !important;\n  }",
    ".hero-identity > .hero-identity-mobile {\n    display: block;\n  }",
    "selector móvil visible",
)
heading = replace_once(
    heading,
    ".hero-identity > span {\n  display: block;\n  white-space: nowrap;\n}\n",
    ".hero-identity > span {\n  display: block;\n  white-space: nowrap;\n}\n\n.hero-identity > .hero-name {\n  margin-bottom: .55em;\n  color: var(--muted);\n  font-size: .34em;\n  line-height: 1.1;\n  letter-spacing: .14em;\n}\n",
    "estilo del nombre",
)
heading = replace_once(
    heading,
    "  .hero-identity > .hero-identity-desktop {",
    "  .hero-identity > .hero-name {\n    margin-bottom: .65em;\n    font-size: .42em;\n  }\n\n  .hero-identity > .hero-identity-desktop {",
    "ajuste móvil del nombre",
)
write("hero-heading.css", heading)

profile = read("hero-profile.css")
profile = replace_once(
    profile,
    "  padding: 13px;\n  box-shadow: 8px 8px 0 var(--ink);",
    "  padding: 13px;\n  border: var(--border);\n  box-shadow: 8px 8px 0 var(--ink);",
    "borde propio de visual-frame",
)
write("hero-profile.css", profile)

styles = read("styles.css")
styles = replace_once(
    styles,
    ".hero h1 {\n  width: 100%;\n  max-width: 10ch;\n  margin: 20px 0 16px;\n  font-family: var(--display-font);\n  font-size: clamp(3rem, 3.7vw, 4.25rem);\n  font-weight: 700;\n  line-height: .98;\n  letter-spacing: -.045em;\n  text-transform: uppercase;\n}",
    ".hero h1 {\n  width: 100%;\n  margin: 20px 0 16px;\n  font-family: var(--display-font);\n  font-weight: 700;\n  text-transform: uppercase;\n}",
    "propiedades base del h1",
)
styles = replace_once(
    styles,
    ".hero-visual {\n  min-width: 0;\n  min-height: 500px;\n  position: relative;\n  display: grid;\n  place-items: center;\n  padding: 26px;\n  border-left: var(--border);\n}",
    ".hero-visual {\n  min-width: 0;\n  min-height: 500px;\n  position: relative;\n  display: grid;\n  place-items: center;\n  border-left: var(--border);\n}",
    "padding duplicado del hero",
)
styles = replace_once(
    styles,
    ".visual-frame {\n  width: min(100%, 360px);\n  aspect-ratio: 4 / 5;\n  padding: 14px;\n  border: var(--border);\n  box-shadow: var(--shadow);\n}\n\n",
    "",
    "visual-frame duplicado",
)
styles = replace_once(
    styles,
    ".status-card {\n  width: min(280px, calc(100% - 36px));\n  position: absolute;\n  right: 18px;\n  bottom: 18px;\n  display: grid;\n  gap: 7px;\n  padding: 16px;\n  border: var(--border);\n  box-shadow: var(--shadow);\n  font-family: \"Courier New\", monospace;\n  font-size: .86rem;\n  overflow-wrap: anywhere;\n}",
    ".status-card {\n  position: absolute;\n  display: grid;\n  gap: 7px;\n  padding: 16px;\n  border: var(--border);\n  box-shadow: var(--shadow);\n  font-family: \"Courier New\", monospace;\n  font-size: .86rem;\n  overflow-wrap: anywhere;\n}",
    "dimensiones duplicadas de status-card",
)
for block, label in (
    ("  .hero h1 {\n    max-width: 10ch;\n    font-size: clamp(2.9rem, 6.2vw, 4rem);\n  }\n\n", "h1 1120"),
    ("  .hero h1 {\n    max-width: none;\n    font-size: clamp(2.55rem, 9vw, 3.7rem);\n    line-height: 1;\n  }\n\n", "h1 820"),
    ("  .hero h1 {\n    font-size: clamp(2.2rem, 10.5vw, 3rem);\n  }\n\n", "h1 560"),
    ("  .hero h1 {\n    font-size: 2.1rem;\n  }\n\n", "h1 380"),
    ("  .visual-frame {\n    width: min(100%, 320px);\n  }\n\n", "visual-frame móvil"),
):
    styles = replace_once(styles, block, "", label)
styles = replace_once(
    styles,
    "  .hero-visual {\n    min-height: auto;\n    display: flex;\n    flex-direction: column;\n    padding: 18px;\n  }",
    "  .hero-visual {\n    min-height: auto;\n    display: flex;\n    flex-direction: column;\n  }",
    "padding móvil duplicado",
)
styles = replace_once(
    styles,
    "  .status-card {\n    position: static;\n    width: 100%;\n    margin-top: 16px;\n  }",
    "  .status-card {\n    position: static;\n    margin-top: 16px;\n  }",
    "ancho móvil duplicado",
)
write("styles.css", styles)

prerender = read("scripts/prerender.py")
prerender, count = re.subn(
    r"VERSIONED_ASSETS = \([^\n]*\)",
    'VERSIONED_ASSETS = (\n    "styles.css",\n    "background-stickers.css",\n    "ad-marquee.css",\n    "hero-profile.css",\n    "hero-heading.css",\n    "featured-projects.css",\n    "app.js",\n    "ads.js",\n)',
    prerender,
    count=1,
)
if count != 1:
    raise RuntimeError("No se actualizó VERSIONED_ASSETS")
prerender, count = re.subn(
    r"def update_link_count\(source: str, count: int\) -> str:\n.*?\n\n\ndef update_social_hidden_state",
    'def update_counter(source: str, attribute: str, count: int) -> str:\n    pattern = re.compile(rf\'(\\<b\\s+{re.escape(attribute)}\\>)[^<]*(\\</b\\>)\')\n    updated, matches = pattern.subn(rf"\\g<1>{count}\\g<2>", source, count=1)\n    if matches != 1:\n        raise ValueError(f"No se encontró {attribute} en index.html.")\n    return updated\n\n\ndef update_social_hidden_state',
    prerender,
    count=1,
    flags=re.DOTALL,
)
if count != 1:
    raise RuntimeError("No se reemplazó update_link_count")
prerender = replace_once(
    prerender,
    "    source = update_link_count(source, len(social_urls))\n    source = update_social_hidden_state(source, len(social_urls))",
    "    source = update_counter(source, \"data-project-count\", len(projects))\n    source = update_counter(source, \"data-link-count\", len(social_urls))\n    source = update_counter(source, \"data-note-count\", len(notes))\n    source = update_social_hidden_state(source, len(social_urls))",
    "sincronización de contadores",
)
write("scripts/prerender.py", prerender)

validator = read("scripts/validate_static.py")
validator = replace_once(validator, "import json\n", "import json\nimport re\n", "import re")
validator = replace_once(
    validator,
    'SOCIALS_PATH = ROOT / "data" / "socials.json"\n',
    'SOCIALS_PATH = ROOT / "data" / "socials.json"\nPROJECTS_PATH = ROOT / "data" / "projects.json"\nNOTES_PATH = ROOT / "data" / "notes.json"\n',
    "rutas de contenido",
)
validator = replace_once(
    validator,
    "def validate_index() -> str:\n",
    "def visible_count(path: Path) -> int:\n    payload = json.loads(path.read_text(encoding=\"utf-8\"))\n    require(isinstance(payload, list), f\"{path.name} debe contener una lista.\")\n    return sum(1 for item in payload if isinstance(item, dict) and item.get(\"visible\") is True)\n\n\ndef counter_value(source: str, attribute: str) -> int:\n    matches = re.findall(rf'<b\\s+{re.escape(attribute)}>(\\d+)</b>', source)\n    require(len(matches) == 1, f\"Se esperaba un único contador {attribute}.\")\n    return int(matches[0])\n\n\ndef validate_index() -> str:\n",
    "helpers de validación",
)
validator = replace_once(
    validator,
    "    canonical = canonical_url(parser)\n\n    require(meta_value(parser, \"property\", \"og:url\") == canonical, \"og:url no coincide con canonical.\")",
    "    canonical = canonical_url(parser)\n\n    h1_blocks = re.findall(r\"<h1\\b[^>]*>(.*?)</h1>\", source, flags=re.IGNORECASE | re.DOTALL)\n    require(len(h1_blocks) == 1, \"Debe existir un único h1.\")\n    h1_text = re.sub(r\"<[^>]+>\", \" \", h1_blocks[0])\n    h1_text = \" \".join(h1_text.split()).casefold()\n    require(\"eidon aetho\" in h1_text, \"El h1 debe identificar a Eidon Aetho.\")\n    require('aria-labelledby=\"featured-projects-title\"' in source, \"El panel necesita etiqueta estática.\")\n\n    require(meta_value(parser, \"property\", \"og:url\") == canonical, \"og:url no coincide con canonical.\")",
    "semántica principal",
)
validator = replace_once(
    validator,
    "    require(raw_social_urls == social_urls, \"Los enlaces sociales estáticos no coinciden con socials.json.\")\n\n    jsonld_scripts",
    "    require(raw_social_urls == social_urls, \"Los enlaces sociales estáticos no coinciden con socials.json.\")\n    require(counter_value(source, \"data-project-count\") == visible_count(PROJECTS_PATH), \"Contador de proyectos desactualizado.\")\n    require(counter_value(source, \"data-link-count\") == len(social_urls), \"Contador de enlaces desactualizado.\")\n    require(counter_value(source, \"data-note-count\") == visible_count(NOTES_PATH), \"Contador de notas desactualizado.\")\n\n    jsonld_scripts",
    "contadores estáticos",
)
validator = replace_once(
    validator,
    '    print("HTML, JSON-LD, CSP, sitemap, robots y 404 válidos.")',
    '    print("Semántica, contadores, HTML, JSON-LD, CSP, sitemap, robots y 404 válidos.")',
    "mensaje de validación",
)
write("scripts/validate_static.py", validator)
