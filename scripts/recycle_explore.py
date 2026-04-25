"""Explore the 3 recycle-price sources to understand their data structures."""
import re
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "recycle"
DATA.mkdir(parents=True, exist_ok=True)
sys.stdout.reconfigure(encoding="utf-8")

s = requests.Session()
s.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9",
})

SOURCES = {
    "src1_iphone":   "https://www.second3c.com.tw/pages/iphone-trade-in",
    "src1_ipad":     "https://www.second3c.com.tw/pages/ipad-trade-in",
    "src1_mbp":      "https://www.second3c.com.tw/pages/macbook-pro-trade-in",
    "src1_mba":      "https://www.second3c.com.tw/pages/macbook-air-trade-in",
    "src2_phone":    "https://www.us3c.com.tw/promotion-recycle-phones",
    "src2_ipad":     "https://www.us3c.com.tw/promotion-recycle-ipad",
    "src2_mbp":      "https://www.us3c.com.tw/promotion-recycle-macbook-pro",
    "src2_mba":      "https://www.us3c.com.tw/promotion-recycle-macbook-air",
    "src2_mac":      "https://www.us3c.com.tw/sell-second-hand-mac",
    "src2_console":  "https://www.us3c.com.tw/purchase/409/%e4%ba%8c%e6%89%8b%e9%9b%bb%e7%8e%a9%e4%b8%bb%e6%a9%9f-second-hand-gaming-console",
    "src2_dyson":    "https://www.us3c.com.tw/used-dyson-recycle",
    "src3_all":      "https://www.jyes.com.tw/recycle.php",
}

for label, url in SOURCES.items():
    print(f"\n{'='*70}\n{label} | {url}\n{'='*70}")
    try:
        r = s.get(url, timeout=25)
    except Exception as e:
        print(f"  ERROR: {e}")
        continue
    print(f"  status={r.status_code} len={len(r.text)}")
    out = DATA / f"{label}.html"
    out.write_bytes(r.content)

    soup = BeautifulSoup(r.text, "html.parser")
    # Tables
    tables = soup.find_all("table")
    print(f"  tables: {len(tables)}")
    for ti, t in enumerate(tables[:2]):
        rows = t.find_all("tr")
        print(f"    table[{ti}] rows={len(rows)}")
        for r2 in rows[:5]:
            cells = [c.get_text(" ", strip=True) for c in r2.find_all(["td","th"])]
            cells = [c for c in cells if c]
            if cells:
                print(f"      {[c[:40] for c in cells[:8]]}")
    # iframes
    iframes = soup.find_all("iframe")
    if iframes:
        print(f"  iframes: {len(iframes)}")
        for ifr in iframes[:3]:
            print(f"    {ifr.get('src','')[:120]}")
    # Look for price patterns
    text = soup.get_text(separator="\n")
    price_lines = [l.strip() for l in text.split("\n")
                   if re.search(r"\$\s*\d{2,6}|NT\$\s*\d|價|\d{4,6}\s*元", l) and 4 < len(l.strip()) < 100]
    print(f"  price-like lines: {len(price_lines)}, samples:")
    for l in price_lines[:6]:
        print(f"    {l}")
