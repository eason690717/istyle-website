"""Full wsphone.com.tw parts cost scraper. Saves to CSV + JSON."""
import csv
import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "wsphone"
DATA.mkdir(parents=True, exist_ok=True)
sys.stdout.reconfigure(encoding="utf-8")

import os
USER = os.environ.get("WSPHONE_USER", "")
PWD = os.environ.get("WSPHONE_PWD", "")
if not USER or not PWD:
    raise SystemExit("Set WSPHONE_USER and WSPHONE_PWD env vars before running")
DELAY = 0.4  # seconds between requests, polite

# Category prefix → high-level type (for later joining with repair items)
CATEGORY_TYPE_MAP = {
    "A": "螢幕/觸控",
    "B": "鏡頭",
    "C": "排線/料件",
    "CA": "AirPods",
    "CW": "Watch",
    "D": "電池",
    "D1": "Dyson/吸塵器",
    "E": "外殼/中框",
    "F": "主機板",
    "G": "配件/工具",
    "IC": "IC晶片",
    "IM": "iMOS保貼",
    "J": "JoGeek副廠",
    "M": "MacBook",
    "S": "Switch",
    "WMD": "膜盾保貼",
}

def category_type(url):
    m = re.search(r"/category/([A-Z]+\d*)", url)
    if not m:
        return ""
    code = m.group(1)
    # Try longest prefix first
    for prefix in sorted(CATEGORY_TYPE_MAP, key=len, reverse=True):
        if code.startswith(prefix):
            return CATEGORY_TYPE_MAP[prefix]
    return ""


def login():
    s = requests.Session()
    s.headers.update({"User-Agent": "Mozilla/5.0"})
    r = s.get("https://wsphone.com.tw/", timeout=15)
    token = re.search(r'name="_token" value="([^"]+)"', r.text).group(1)
    r = s.post(
        "https://wsphone.com.tw/cust/login",
        data={"_token": token, "cust_no": USER, "password": PWD, "redirectTo": "/"},
        timeout=15,
    )
    assert r.status_code == 200 and "logout" in r.text.lower()
    print(f"[LOGIN] OK")
    return s


def parse_products(html, cat_url, cat_name):
    soup = BeautifulSoup(html, "html.parser")
    items = soup.find_all(class_="li_proudctlist")
    out = []
    for it in items:
        name_el = it.select_one(".prdname a") or it.select_one(".prdname")
        price_el = it.select_one(".price b") or it.select_one(".price")
        link_el = it.select_one("a[href*='/product/']")
        name = name_el.get_text(strip=True) if name_el else ""
        price_raw = price_el.get_text(strip=True) if price_el else ""
        price_match = re.search(r"(\d+)", price_raw)
        price = int(price_match.group(1)) if price_match else None
        prod_url = link_el["href"].strip() if link_el and link_el.get("href") else ""
        out.append({
            "category_url": cat_url,
            "category_name": cat_name,
            "category_type": category_type(cat_url),
            "product_url": prod_url,
            "product_name": name,
            "price_raw": price_raw,
            "price": price,
        })
    # Pagination
    next_link = soup.find("a", rel="next")
    next_url = next_link["href"] if next_link else None
    return out, next_url


def fetch_category(s, cat_url, cat_name):
    all_items = []
    url = cat_url
    page = 1
    while url:
        r = s.get(url, timeout=20)
        r.raise_for_status()
        items, next_url = parse_products(r.text, cat_url, cat_name)
        all_items.extend(items)
        print(f"    page {page}: {len(items)} items")
        if not next_url or next_url == url:
            break
        url = next_url
        page += 1
        time.sleep(DELAY)
    return all_items


def main():
    s = login()
    # Reload categories from saved file (or refetch)
    cats_file = DATA / "02_categories.json"
    if not cats_file.exists():
        r = s.get("https://wsphone.com.tw/", timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        seen = set()
        cats = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/category/" in href and href not in seen:
                seen.add(href)
                cats.append({"url": href, "name": a.get_text(strip=True)})
        cats_file.write_text(json.dumps(cats, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        cats = json.loads(cats_file.read_text(encoding="utf-8"))

    # Filter out top-level categories (A, B, C without sub-suffix) — they aggregate
    # Keep them all for safety; we'll dedupe by product_url later
    print(f"[CATEGORIES] {len(cats)} total, scraping all")

    all_products = []
    for i, cat in enumerate(cats, 1):
        print(f"\n[{i}/{len(cats)}] {cat['url']} ({cat['name']})")
        try:
            items = fetch_category(s, cat["url"], cat["name"])
            all_products.extend(items)
            print(f"    -> total {len(items)} items in category")
        except Exception as e:
            print(f"    ERROR: {e}")
        time.sleep(DELAY)

    # Dedupe by product_url
    seen_urls = set()
    unique = []
    for p in all_products:
        key = p["product_url"] or (p["category_url"] + "|" + p["product_name"])
        if key not in seen_urls:
            seen_urls.add(key)
            unique.append(p)

    print(f"\n[DONE] {len(all_products)} raw, {len(unique)} unique products")

    # Save CSV
    csv_path = DATA / "parts_cost.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "category_type", "category_name", "product_name", "price",
            "category_url", "product_url", "price_raw",
        ])
        w.writeheader()
        for row in unique:
            w.writerow({k: row.get(k, "") for k in w.fieldnames})
    print(f"[SAVED] {csv_path}")

    # Save JSON
    json_path = DATA / "parts_cost.json"
    json_path.write_text(json.dumps(unique, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[SAVED] {json_path}")


if __name__ == "__main__":
    main()
