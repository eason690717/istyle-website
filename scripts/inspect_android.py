"""Look for android prices — could be image, table, or another iframe pattern."""
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
files = [
    ROOT / "data" / "istyle" / "price_安卓維修-價格.html",
    ROOT / "data" / "istyle" / "price_所有維修項目-1.html",
]

for fp in files:
    if not fp.exists():
        print(f"NOT FOUND: {fp}")
        continue
    print(f"\n{'='*60}\n{fp.name}\n{'='*60}")
    html = fp.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")
    # Look for the rte content div
    rte = soup.find("div", class_="rte")
    if not rte:
        print("  (no .rte div)")
        continue
    # Print all children types
    children = list(rte.descendants)
    print(f"  rte descendants: {len(children)}")
    # Find images in rte
    imgs = rte.find_all("img")
    print(f"  images in rte: {len(imgs)}")
    for img in imgs:
        srcs = {k: img.get(k, "") for k in ["src", "data-src", "data-original"] if img.get(k)}
        if srcs:
            print(f"    {srcs}")
    # iframes
    iframes = rte.find_all("iframe")
    print(f"  iframes in rte: {len(iframes)}")
    for ifr in iframes:
        print(f"    src={ifr.get('src','')[:120]}")
    # tables
    tables = rte.find_all("table")
    print(f"  tables in rte: {len(tables)}")
    # raw HTML preview
    print(f"  rte HTML (first 1500 chars):")
    print(rte.prettify()[:1500])
