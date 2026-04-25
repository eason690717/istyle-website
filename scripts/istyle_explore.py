"""Explore i-style.store public site structure & try to find transparent repair price pages."""
import re
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "istyle"
DATA.mkdir(parents=True, exist_ok=True)
sys.stdout.reconfigure(encoding="utf-8")

s = requests.Session()
s.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
})

# Try the homepage first
print("[1] Fetching homepage...")
r = s.get("https://www.i-style.store/", timeout=20)
print(f"    status={r.status_code} len={len(r.text)}")
(DATA / "01_home.html").write_text(r.text, encoding="utf-8")

# Find ALL links and identify pages
soup = BeautifulSoup(r.text, "html.parser")
all_links = set()
for a in soup.find_all("a", href=True):
    href = a["href"]
    if href.startswith("/") or "i-style.store" in href:
        # normalise
        if href.startswith("/"):
            href = "https://www.i-style.store" + href
        all_links.add(href.split("#")[0])

print(f"\n[2] Found {len(all_links)} unique internal links")

# Filter to /pages/ (price tables, content pages)
pages = sorted([u for u in all_links if "/pages/" in u])
print(f"\n[3] /pages/ URLs ({len(pages)}):")
for u in pages:
    print(f"    {u}")

# Filter to /categories/
cats = sorted([u for u in all_links if "/categories/" in u])
print(f"\n[4] /categories/ URLs ({len(cats)}):")
for u in cats:
    print(f"    {u}")

# Also list /products/ if any visible
prods = sorted([u for u in all_links if "/products/" in u])
print(f"\n[5] /products/ URLs ({len(prods)}, sample 10):")
for u in prods[:10]:
    print(f"    {u}")

# Try ONE price page to see if data is in HTML or JS
if pages:
    target = next((p for p in pages if "iphone" in p.lower() or "維修" in p), pages[0])
    print(f"\n[6] Fetching sample price page: {target}")
    r2 = s.get(target, timeout=20)
    print(f"    status={r2.status_code} len={len(r2.text)}")
    (DATA / "02_sample_pricepage.html").write_text(r2.text, encoding="utf-8")
    # Look for table or price patterns
    soup2 = BeautifulSoup(r2.text, "html.parser")
    text = soup2.get_text(separator="\n")
    # Find lines with $ or 元
    price_lines = [l.strip() for l in text.split("\n") if re.search(r"\$\s*\d|元|價", l) and len(l) < 100]
    print(f"    price-related lines: {len(price_lines)}")
    for l in price_lines[:20]:
        print(f"      {l}")
    # Check if there's JSON data
    scripts_with_data = []
    for sc in soup2.find_all("script"):
        if sc.string and any(k in sc.string for k in ['"price"', "products", '"title"', "iPhone"]):
            scripts_with_data.append(len(sc.string))
    print(f"    scripts with data-like content: {len(scripts_with_data)}, sizes: {scripts_with_data[:5]}")
