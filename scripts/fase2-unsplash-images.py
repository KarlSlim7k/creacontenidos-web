#!/usr/bin/env python3
"""scripts/fase2-unsplash-images.py
Reemplaza <div class="placeholder-img" data-ratio="X" ...> por <img src="https://images.unsplash.com/...">
usando un mapeo contextual basado en aria-label.

Idempotente: si ya hay <img>, no hace nada.

Imagenes tomadas de Unsplash (gratis, sin atribucion obligatoria).
Para reemplazo final con foto propia, basta cambiar el src en cada archivo.
"""
import re
from pathlib import Path

PAGES_DIR = Path(__file__).resolve().parent.parent / "apps" / "web" / "pages"
INDEX = PAGES_DIR.parent / "index.html"

# Mapeo: keywords (lowercase) -> URL de Unsplash
# Solo imagenes verificadas como publicas en Unsplash.
# Tamanos via query param ?w=800&q=80&auto=format&fit=crop
KEYWORD_MAP = {
    # Local / Perote / niebla / carreteras
    "niebla": "https://images.unsplash.com/photo-1487621167305-5d248087c724?w=1200&q=80&auto=format&fit=crop",
    "cofre": "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&q=80&auto=format&fit=crop",
    "carretera": "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80&auto=format&fit=crop",
    "perote": "https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?w=1200&q=80&auto=format&fit=crop",
    "paviment": "https://images.unsplash.com/photo-1517089152318-42ec560349c0?w=800&q=80&auto=format&fit=crop",
    "mercado": "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80&auto=format&fit=crop",
    "gas": "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800&q=80&auto=format&fit=crop",
    "agua": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80&auto=format&fit=crop",
    "proteccion": "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&q=80&auto=format&fit=crop",

    # Cultura
    "cafe": "https://images.unsplash.com/photo-1442550528053-c431ecb55509?w=1200&q=80&auto=format&fit=crop",
    "danza": "https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80&auto=format&fit=crop",
    "museo": "https://images.unsplash.com/photo-1565060169187-5284a3da6cba?w=800&q=80&auto=format&fit=crop",
    "mural": "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=800&q=80&auto=format&fit=crop",
    "libro": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80&auto=format&fit=crop",
    "cine": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80&auto=format&fit=crop",
    "artesan": "https://images.unsplash.com/photo-1606293459207-fff61cea21b9?w=800&q=80&auto=format&fit=crop",
    "feria": "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=1200&q=80&auto=format&fit=crop",
    "cultura": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&auto=format&fit=crop",

    # Economia / agricultura
    "papa": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&q=80&auto=format&fit=crop",
    "agricultura": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80&auto=format&fit=crop",
    "productor": "https://images.unsplash.com/photo-1500076656116-558758c991c1?w=800&q=80&auto=format&fit=crop",
    "econom": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80&auto=format&fit=crop",

    # Deportes
    "futbol": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80&auto=format&fit=crop",
    "basquet": "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80&auto=format&fit=crop",
    "beisbol": "https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&q=80&auto=format&fit=crop",
    "deporte": "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=1200&q=80&auto=format&fit=crop",
    "juvenil": "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80&auto=format&fit=crop",
    "coyote": "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80&auto=format&fit=crop",
    "femenil": "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80&auto=format&fit=crop",
    "cancha": "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80&auto=format&fit=crop",
    "historia": "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=800&q=80&auto=format&fit=crop",

    # Opinion / general
    "opinion": "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80&auto=format&fit=crop",
    "autor": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&auto=format&fit=crop",
    "comentario": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&auto=format&fit=crop",
    "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&auto=format&fit=crop",

    # Patrocinadores
    "ferreter": "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800&q=80&auto=format&fit=crop",
    "patrocin": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80&auto=format&fit=crop",

    # Hero generico
    "principal": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1400&q=80&auto=format&fit=crop",
    "imagen principal": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1400&q=80&auto=format&fit=crop",

    # Default (cuando no hay keyword match)
    "default_landscape": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80&auto=format&fit=crop",
    "default_card": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80&auto=format&fit=crop",
    "default_avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&auto=format&fit=crop",
}

PLACEHOLDER_RE = re.compile(
    r'<div\s+class="placeholder-img[^"]*"\s+'
    r'(?:data-ratio="(?P<ratio>[^"]+)"\s+)?'
    r'role="img"(?:\s+aria-label="(?P<label>[^"]*)")?'
    r'(?P<attrs>[^>]*)></div>',
    re.IGNORECASE,
)


def pick_url(label: str, ratio: str) -> str:
    """Elige URL por keywords del aria-label."""
    label_lower = (label or "").lower()
    for kw in sorted(KEYWORD_MAP.keys(), key=len, reverse=True):
        if kw in label_lower and not kw.startswith("default"):
            return KEYWORD_MAP[kw]
    if ratio == "4x5":
        return KEYWORD_MAP["default_card"]
    if "avatar" in label_lower:
        return KEYWORD_MAP["default_avatar"]
    return KEYWORD_MAP["default_landscape"]


def replace(match: re.Match) -> str:
    ratio = match.group("ratio") or "16x9"
    label = match.group("label") or ""
    attrs = match.group("attrs") or ""

    loading = "lazy" if "loading=" in attrs else None
    url = pick_url(label, ratio)

    style_match = re.search(r'style="([^"]*)"', attrs)
    style = f' style="{style_match.group(1)}"' if style_match else ""

    loading_attr = f' loading="{loading}"' if loading else ""
    return f'<img src="{url}" alt="{label}"{loading_attr}{style}>'


def migrate(path: Path) -> int:
    html = path.read_text()
    # Si ya hay <img> directos con https, skip (idempotencia suave)
    if 'images.unsplash.com' in html:
        # Igual procesamos por si quedaron placeholders sueltos
        pass
    new, n = PLACEHOLDER_RE.subn(replace, html)
    if n > 0 and new != html:
        path.write_text(new)
    return n


def main():
    total = 0
    targets = sorted(PAGES_DIR.glob("*.html")) + [INDEX]
    for f in targets:
        n = migrate(f)
        if n:
            print(f"  {f.name}: {n} reemplazos")
            total += n
    print(f"\n✓ {total} placeholders reemplazados con imagenes Unsplash.")


if __name__ == "__main__":
    main()