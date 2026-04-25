"""Extract Google Sheets iframe URLs from each price page, then fetch each."""
import re
import sys
from pathlib import Path
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "istyle"
sys.stdout.reconfigure(encoding="utf-8")

PAGES = {
    "iphone維修": "https://www.i-style.store/pages/iphone維修價格表",
    "ipad維修": "https://www.i-style.store/pages/ipad維修價格表",
    "macbook維修": "https://www.i-style.store/pages/macbook維修-價格",
    "android維修": "https://www.i-style.store/pages/安卓維修-價格",
    "switch維修": "https://www.i-style.store/pages/switch維修-價格",
    "dyson維修": "https://www.i-style.store/pages/dyson維修價格表",
    "所有維修項目": "https://www.i-style.store/pages/所有維修項目-1",
}

s = requests.Session()
s.headers.update({"User-Agent": "Mozilla/5.0", "Accept-Language": "zh-TW,zh;q=0.9"})

iframe_map = {}

for label, url in PAGES.items():
    print(f"\n=== {label} ===")
    r = s.get(url, timeout=20)
    soup = BeautifulSoup(r.text, "html.parser")
    iframes = soup.find_all("iframe")
    for ifr in iframes:
        src = ifr.get("src", "")
        if "docs.google.com" in src or "spreadsheet" in src.lower():
            iframe_map[label] = src
            print(f"  GSheet: {src}")
            break
    else:
        if iframes:
            print(f"  (other iframes: {[i.get('src','')[:80] for i in iframes]})")
        else:
            print("  (no iframe found)")

print("\n\n=== Summary ===")
for k, v in iframe_map.items():
    # Extract gid
    gid_m = re.search(r"gid=(\d+)", v)
    print(f"  {k:15} gid={gid_m.group(1) if gid_m else '?'} url={v[:100]}")

# Save
import json
(DATA / "price_iframe_urls.json").write_text(
    json.dumps(iframe_map, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(f"\n[SAVED] {DATA / 'price_iframe_urls.json'}")

# Now fetch ONE iframe to test
if iframe_map:
    label, url = next(iter(iframe_map.items()))
    print(f"\n=== TEST FETCH: {label} ===")
    r = s.get(url, timeout=30)
    print(f"  status={r.status_code} len={len(r.text)}")
    safe = re.sub(r"[^\w-]", "_", label)
    (DATA / f"sheet_{safe}.html").write_text(r.text, encoding="utf-8")
    soup2 = BeautifulSoup(r.text, "html.parser")
    tables = soup2.find_all("table")
    print(f"  tables: {len(tables)}")
    if tables:
        rows = tables[0].find_all("tr")
        print(f"  first table rows: {len(rows)}")
        for r2 in rows[:8]:
            cells = [c.get_text(strip=True) for c in r2.find_all(["td","th"])]
            cells = [c for c in cells if c]
            if cells:
                print(f"    {cells[:8]}")
