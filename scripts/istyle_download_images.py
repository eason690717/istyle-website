"""Download all price-related images from i-style price pages."""
import re
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "istyle"
IMG_DIR = DATA / "images"
IMG_DIR.mkdir(parents=True, exist_ok=True)
sys.stdout.reconfigure(encoding="utf-8")

# Pages that may contain price images
SOURCES = [
    "price_安卓維修-價格.html",
    "price_所有維修項目-1.html",
    "price_switch維修-價格.html",
    "price_dyson維修價格表.html",
]

s = requests.Session()
s.headers.update({"User-Agent": "Mozilla/5.0"})

for fname in SOURCES:
    fp = DATA / fname
    if not fp.exists():
        continue
    print(f"\n=== {fname} ===")
    soup = BeautifulSoup(fp.read_text(encoding="utf-8"), "html.parser")
    rte = soup.find("div", class_="rte")
    if not rte:
        continue
    imgs = rte.find_all("img")
    for img in imgs:
        url = img.get("src", "")
        if not url or "cdn.store-assets.com" not in url:
            continue
        name = url.rsplit("/", 1)[-1]
        out = IMG_DIR / f"{fname.replace('price_','').replace('.html','')}_{name}"
        try:
            r = s.get(url, timeout=20)
            out.write_bytes(r.content)
            print(f"  saved: {out.name} ({len(r.content)//1024}KB)")
        except Exception as e:
            print(f"  ERROR {url}: {e}")
