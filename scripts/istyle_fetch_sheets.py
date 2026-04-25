"""Fetch each pricing Google Sheet as CSV (cleanest format)."""
import json
import re
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "istyle"
sys.stdout.reconfigure(encoding="utf-8")

iframe_map = json.loads((DATA / "price_iframe_urls.json").read_text(encoding="utf-8"))

s = requests.Session()
s.headers.update({"User-Agent": "Mozilla/5.0"})

# Convert pubhtml URL → CSV export URL
# Pattern: /pub?...&output=csv
def to_csv_url(pubhtml_url):
    # Replace 'pubhtml' with 'pub' and append output=csv
    # Original: /spreadsheets/d/e/<KEY>/pubhtml?gid=N&single=true...
    url = pubhtml_url.replace("/pubhtml?", "/pub?")
    if "output=" not in url:
        url += "&output=csv"
    return url

for label, url in iframe_map.items():
    csv_url = to_csv_url(url)
    print(f"\n=== {label} ===")
    print(f"  CSV URL: {csv_url[:130]}")
    try:
        r = s.get(csv_url, timeout=30, allow_redirects=True)
    except Exception as e:
        print(f"  ERROR: {e}")
        continue
    print(f"  status={r.status_code} bytes={len(r.content)} content-type={r.headers.get('content-type','')}")
    safe = re.sub(r"[^\w-]", "_", label)
    out = DATA / f"price_{safe}.csv"
    # Force UTF-8 (Google returns UTF-8)
    out.write_bytes(r.content)
    print(f"  saved: {out}")
    # Quick peek
    text = r.content.decode("utf-8", errors="replace")
    lines = text.split("\n")
    print(f"  total lines: {len(lines)}")
    for ln in lines[:8]:
        print(f"    {ln[:160]}")
