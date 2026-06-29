#!/usr/bin/env python3
"""scripts/fase4-remove-pagination.py
Remueve el bloque de paginacion mockeada de las paginas de seccion.
YAGNI: la paginacion real se hara cuando el API tenga suficientes articulos.
"""
import re
from pathlib import Path

PAGES_DIR = Path(__file__).resolve().parent.parent / "apps" / "web" / "pages"

PAGINATION_RE = re.compile(
    r'\s*(?:<!--[^>]*?-->\s*)?'
    r'<nav class="paginacion"[^>]*>.*?</nav>',
    re.DOTALL | re.IGNORECASE,
)

def main():
    total = 0
    for f in sorted(PAGES_DIR.glob("*.html")):
        html = f.read_text()
        new, n = PAGINATION_RE.subn('', html)
        if n > 0:
            f.write_text(new)
            print(f"  {f.name}: {n} bloques removidos")
            total += n
    print(f"\n✓ {total} bloques de paginacion removidos.")

if __name__ == "__main__":
    main()