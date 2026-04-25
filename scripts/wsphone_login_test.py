"""Login to wsphone.com.tw and dump landing page to see categories."""
import re
import os
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "wsphone"
DATA.mkdir(parents=True, exist_ok=True)

import os
USER = os.environ.get("WSPHONE_USER", "")
PWD = os.environ.get("WSPHONE_PWD", "")
if not USER or not PWD:
    raise SystemExit("Set WSPHONE_USER and WSPHONE_PWD env vars before running")

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0"})

# Step 1: GET login page for CSRF token + cookies
print("[1] GET login page...")
r = session.get("https://wsphone.com.tw/", timeout=15)
m = re.search(r'name="_token" value="([^"]+)"', r.text)
token = m.group(1) if m else None
print(f"    token: {token[:20]}..." if token else "    NO TOKEN FOUND")

# Step 2: POST login
print("[2] POST /cust/login...")
r = session.post(
    "https://wsphone.com.tw/cust/login",
    data={"_token": token, "cust_no": USER, "password": PWD, "redirectTo": "/"},
    allow_redirects=True,
    timeout=15,
)
print(f"    status: {r.status_code}, final url: {r.url}")
print(f"    page length: {len(r.text)}")

# Step 3: Save landing page
landing = DATA / "01_landing.html"
landing.write_text(r.text, encoding="utf-8")
print(f"    saved: {landing}")

# Step 4: Quick analysis
soup = BeautifulSoup(r.text, "html.parser")
title = soup.title.string if soup.title else "(no title)"
print(f"    page title: {title}")

# Find category links
print("\n[3] Looking for category links...")
links = soup.find_all("a", href=True)
internal = [a for a in links if a["href"].startswith(("/", "https://wsphone"))]
print(f"    total links: {len(links)}, internal: {len(internal)}")
for a in internal[:40]:
    text = a.get_text(strip=True)[:30]
    href = a["href"]
    if text:
        print(f"    {href} -> {text}")
