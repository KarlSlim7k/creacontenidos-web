#!/usr/bin/env python3
"""scripts/fase1-nav-migration.py
Migra header y footer hardcoded de las paginas en apps/web/pages/* a placeholders
[data-include] que nav.js inyecta.

Idempotente: si ya esta migrado, no hace nada.
"""
import re
import sys
from pathlib import Path

PAGES_DIR = Path(__file__).resolve().parent.parent / "apps" / "web" / "pages"

HEADER_RE = re.compile(
    r'<header class="header-editorial".*?</header>',
    re.DOTALL,
)
FOOTER_RE = re.compile(
    r'<footer class="footer">.*?</footer>',
    re.DOTALL,
)
# Tambien removemos la barra-utilidad (header la incluye via nav.js)
BARRA_RE = re.compile(
    r'<div class="barra-utilidad">.*?</div>\s*',
    re.DOTALL,
)

def migrate(path: Path) -> bool:
    html = path.read_text()
    if 'data-include="header"' in html:
        return False  # ya migrado

    new = html

    # Reemplazar barra-utilidad (si existe aparte) + header en una sola pasada.
    # Algunos archivos tienen barra-utilidad justo antes del header.
    combined = re.compile(
        r'(?:<!--[^>]*?-->\s*)?'
        r'(?:<div class="barra-utilidad">.*?</div>\s*)?'
        r'(?:<!--[^>]*?-->\s*)?'
        r'<header class="header-editorial".*?</header>',
        re.DOTALL,
    )
    new, n_header = combined.subn('<div data-include="header"></div>', new, count=1)
    if n_header == 0:
        print(f'  WARN: header no encontrado en {path.name}', file=sys.stderr)
        return False

    # Footer
    new, n_footer = re.subn(
        r'(?:<!--[^>]*?-->\s*)?'
        r'<footer class="footer">.*?</footer>',
        '<div data-include="footer"></div>',
        new,
        count=1,
        flags=re.DOTALL,
    )
    if n_footer == 0:
        print(f'  WARN: footer no encontrado en {path.name}', file=sys.stderr)
        return False

    # Insertar nav.js antes del primer <script src="/assets/js/main.js">
    if '/assets/js/nav.js' not in new:
        new = re.sub(
            r'(<script src="/assets/js/main\.js")',
            r'<script src="/assets/js/nav.js"></script>\n  \1',
            new,
            count=1,
        )

    path.write_text(new)
    return True

def main():
    files = sorted(PAGES_DIR.glob("*.html"))
    ok = 0
    skipped = 0
    for f in files:
        print(f'→ {f.name}')
        if migrate(f):
            print('  OK')
            ok += 1
        else:
            print('  skip')
            skipped += 1
    print()
    print(f'✓ {ok} migrados, {skipped} saltados.')

if __name__ == "__main__":
    main()