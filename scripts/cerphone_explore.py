"""Explore cerphone.com to find all brand+model+repair-item URLs."""
import re
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "cerphone"
DATA.mkdir(parents=True, exist_ok=True)
sys.stdout.reconfigure(encoding="utf-8")

s = requests.Session()
s.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9",
})

START = "https://cerphone.com/quotation/"
print(f"[1] GET {START}")
r = s.get(START, timeout=20)
print(f"    status={r.status_code} len={len(r.text)}")
(DATA / "00_index.html").write_text(r.text, encoding="utf-8")

soup = BeautifulSoup(r.text, "html.parser")
# Find all internal links
all_links = set()
for a in soup.find_all("a", href=True):
    href = a["href"]
    if href.startswith("/"):
        href = "https://cerphone.com" + href
    if "cerphone.com" in href:
        all_links.add(href.split("#")[0])

print(f"[2] {len(all_links)} unique internal links")
# Filter to quotation-related
quote_links = sorted([u for u in all_links if "/quotation" in u or "/repair" in u or "/price" in u])
print(f"\n[3] quotation/repair/price URLs ({len(quote_links)}):")
for u in quote_links:
    print(f"    {u}")
