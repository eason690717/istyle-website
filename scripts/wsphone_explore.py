"""Explore wsphone category & product structure (after login)."""
import re
import sys
import json
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "wsphone"
DATA.mkdir(parents=True, exist_ok=True)

# Force UTF-8 output even on Windows
sys.stdout.reconfigure(encoding="utf-8")

import os
USER = os.environ.get("WSPHONE_USER", "")
PWD = os.environ.get("WSPHONE_PWD", "")
if not USER or not PWD:
    raise SystemExit("Set WSPHONE_USER and WSPHONE_PWD env vars before running")
session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0"})

# Login
r = session.get("https://wsphone.com.tw/", timeout=15)
token = re.search(r'name="_token" value="([^"]+)"', r.text).group(1)
r = session.post(
    "https://wsphone.com.tw/cust/login",
    data={"_token": token, "cust_no": USER, "password": PWD, "redirectTo": "/"},
    timeout=15,
)
print(f"[LOGIN] status={r.status_code} len={len(r.text)}")

# Save and parse landing
soup = BeautifulSoup(r.text, "html.parser")
(DATA / "01_landing.html").write_text(r.text, encoding="utf-8")

# Collect ALL category links
cats = []
for a in soup.find_all("a", href=True):
    href = a["href"]
    if "/category/" in href:
        cats.append({"url": href, "name": a.get_text(strip=True)})
# Dedupe
seen = set()
unique = []
for c in cats:
    if c["url"] not in seen:
        seen.add(c["url"])
        unique.append(c)

print(f"\n[CATEGORIES] total={len(unique)}")
for c in unique:
    print(f"  {c['url']:60} | {c['name']}")

(DATA / "02_categories.json").write_text(
    json.dumps(unique, ensure_ascii=False, indent=2), encoding="utf-8"
)

# Fetch ONE sample category to see product structure
sample = next((c for c in unique if "A01" in c["url"]), unique[0])
print(f"\n[SAMPLE CATEGORY] {sample['url']} ({sample['name']})")
r2 = session.get(sample["url"], timeout=15)
print(f"    status={r2.status_code} len={len(r2.text)}")
(DATA / "03_sample_category.html").write_text(r2.text, encoding="utf-8")

soup2 = BeautifulSoup(r2.text, "html.parser")
# Look for price patterns and product blocks
print(f"    title: {soup2.title.string if soup2.title else '?'}")

# Find candidate product elements
prices = re.findall(r"\$\s*\d{2,5}|NT\$\s*\d{2,5}|價[格錢]\s*[:：]\s*\d+", r2.text)
print(f"    found {len(prices)} price-like strings, samples: {prices[:5]}")

# Save first 3000 chars of body for inspection
body_text = soup2.get_text(separator="\n", strip=True)[:3000]
(DATA / "03_sample_category_text.txt").write_text(body_text, encoding="utf-8")
print(f"    body text saved: {len(body_text)} chars")
