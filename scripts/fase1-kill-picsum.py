#!/usr/bin/env python3
"""scripts/fase1-kill-picsum.py
Reemplaza <img src="https://picsum.photos/..."> por <div class="placeholder-img" data-ratio="...">
en apps/web/pages/*.html y apps/web/index.html.

No toca logos locales (/assets/img/public/logo-*).
"""
import re
from pathlib import Path

PAGES_DIR = Path(__file__).resolve().parent.parent / "apps" / "web" / "pages"
INDEX = PAGES_DIR.parent / "index.html"

PICSUM_RE = re.compile(
    r'<img\s+src="https://picsum\.photos/seed/[^"]+/(\d+)/(\d+)"([^>]*)>',
    re.IGNORECASE,
)
# pravatar para avatares
PRAVATAR_RE = re.compile(
    r'<img\s+src="https://i\.pravatar\.cc/[^"]+"([^>]*)>',
    re.IGNORECASE,
)


def ratio_for(w: str, h: str) -> str:
    w_i, h_i = int(w), int(h)
    r = w_i / h_i
    if r > 1.7:
        return "2x1"
    if r > 1.3:
        return "16x9"
    if r < 0.9:
        return "4x5"
    return "1x1"


def replace_picsum(match: re.Match) -> str:
    w, h, attrs = match.group(1), match.group(2), match.group(3)
    ratio = ratio_for(w, h)
    alt_match = re.search(r'alt="([^"]*)"', attrs)
    aria_label = f' aria-label="{alt_match.group(1)}"' if alt_match else ''
    loading = " loading=\"lazy\"" if "loading=" not in attrs else ""
    return (
        f'<div class="placeholder-img" data-ratio="{ratio}" role="img"'
        f'{aria_label}{loading}></div>'
    )


def replace_pravatar(match: re.Match) -> str:
    attrs = match.group(1)
    alt_match = re.search(r'alt="([^"]*)"', attrs)
    label = alt_match.group(1) if alt_match else "Avatar"
    return (
        f'<div class="placeholder-img placeholder-img--avatar" role="img"'
        f' aria-label="{label}" style="border-radius:50%; aspect-ratio:1;"></div>'
    )


def migrate(path: Path) -> int:
    html = path.read_text()
    new = PICSUM_RE.sub(replace_picsum, html)
    new = PRAVATAR_RE.sub(replace_pravatar, new)
    if new != html:
        path.write_text(new)
        n_picsum = len(PICSUM_RE.findall(html))
        n_prav = len(PRAVATAR_RE.findall(html))
        return n_picsum + n_prav
    return 0


def main():
    total = 0
    for f in sorted(PAGES_DIR.glob("*.html")):
        n = migrate(f)
        if n:
            print(f"  {f.name}: {n} reemplazos")
            total += n
    n = migrate(INDEX)
    if n:
        print(f"  index.html: {n} reemplazos")
        total += n
    print(f"\n✓ {total} imagenes externas reemplazadas.")


if __name__ == "__main__":
    main()