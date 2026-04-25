"""Look at Apple page structure to understand the price table format."""
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup

import requests
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "cerphone"
DATA.mkdir(parents=True, exist_ok=True)

s = requests.Session()
s.headers.update({"User-Agent": "Mozilla/5.0", "Accept-Language": "zh-TW,zh;q=0.9"})

URL = "https://cerphone.com/index.php/quotation_apple/"
print(f"GET {URL}")
r = s.get(URL, timeout=30)
print(f"status={r.status_code} len={len(r.text)}")
(DATA / "apple_raw.html").write_text(r.text, encoding="utf-8")

soup = BeautifulSoup(r.text, "html.parser")

# Tables
tables = soup.find_all("table")
print(f"\n[TABLES] {len(tables)}")
for i, t in enumerate(tables[:5]):
    rows = t.find_all("tr")
    print(f"\n  Table[{i}]: {len(rows)} rows")
    for r2 in rows[:8]:
        cells = [c.get_text(strip=True) for c in r2.find_all(["td","th"])]
        cells = [c for c in cells if c]
        if cells:
            print(f"    {cells[:10]}")

# Tabs/sections by model
print("\n[Section headings (h1/h2/h3/h4)]")
for h in soup.find_all(re.compile("^h[1-4]$"))[:30]:
    text = h.get_text(strip=True)
    if text and len(text) < 80:
        print(f"  <{h.name}> {text}")

# Links to model-specific pages?
model_links = []
for a in soup.find_all("a", href=True):
    text = a.get_text(strip=True)
    href = a["href"]
    if any(k in text for k in ["iPhone", "iPad", "Watch", "MacBook"]) and len(text) < 50:
        model_links.append((text, href))
print(f"\n[Model links] {len(model_links)}")
for t, h in model_links[:20]:
    print(f"  {t:40} -> {h}")
