"""Scrape all cerphone brand pages, extract every (brand, model, repair_item, price) row."""
import csv
import json
import math
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "cerphone"
DATA.mkdir(parents=True, exist_ok=True)
sys.stdout.reconfigure(encoding="utf-8")

BRANDS = {
    "Apple":   "https://cerphone.com/index.php/quotation_apple/",
    "Samsung": "https://cerphone.com/index.php/quotation_samsung/",
    "Google":  "https://cerphone.com/index.php/quotation_google/",
    "Sony":    "https://cerphone.com/index.php/quotation_sony/",
    "ASUS":    "https://cerphone.com/index.php/quotation_asus/",
    "OPPO":    "https://cerphone.com/index.php/quotation_oppo/",
    "Mi":      "https://cerphone.com/index.php/quotation_mi/",
    "Huawei等": "https://cerphone.com/index.php/quotation_huawei_etc/",
    "Dyson":   "https://cerphone.com/index.php/quotation_dyson/",
    "Switch":  "https://cerphone.com/index.php/quotation_nintendo/",
}

def istyle_price(cerphone_price):
    """Apply pricing rule: ceil(cerphone × 1.15) to nearest 100."""
    if cerphone_price is None or cerphone_price <= 0:
        return None
    return int(math.ceil(cerphone_price * 1.15 / 100.0)) * 100

def parse_int(s):
    """Extract first integer from cell text. '1000', '1000/1200', '2500(256)' → 1000."""
    if not s or s.strip() in ("-", "—", "N/A"):
        return None
    m = re.search(r"\d{2,6}", s)
    return int(m.group(0)) if m else None

def parse_table(table, brand, section_title):
    rows = table.find_all("tr")
    if len(rows) < 2:
        return []
    # Header row
    header_cells = [c.get_text(strip=True) for c in rows[0].find_all(["td","th"])]
    if not header_cells:
        return []
    out = []
    for r in rows[1:]:
        cells = [c.get_text(" ", strip=True) for c in r.find_all(["td","th"])]
        if not cells:
            continue
        model_name = cells[0]
        if not model_name or len(model_name) > 100:
            continue
        for col_idx in range(1, min(len(cells), len(header_cells))):
            item = header_cells[col_idx]
            raw = cells[col_idx]
            price = parse_int(raw)
            if not item or item.strip() in ("", "-"):
                continue
            out.append({
                "brand": brand,
                "section": section_title,
                "model": model_name,
                "repair_item": item,
                "cerphone_price_raw": raw,
                "cerphone_price": price,
                "istyle_price": istyle_price(price),
            })
    return out


def main():
    s = requests.Session()
    s.headers.update({"User-Agent": "Mozilla/5.0", "Accept-Language": "zh-TW,zh;q=0.9"})

    all_rows = []
    for brand, url in BRANDS.items():
        print(f"\n[{brand}] {url}")
        try:
            r = s.get(url, timeout=30)
        except Exception as e:
            print(f"  ERROR: {e}")
            continue
        print(f"  status={r.status_code} len={len(r.text)}")
        safe = re.sub(r"[^\w-]", "_", brand)
        (DATA / f"raw_{safe}.html").write_text(r.text, encoding="utf-8")

        soup = BeautifulSoup(r.text, "html.parser")
        # Walk through document: each h2/h3 begins a section, followed by 1+ tables
        current_section = brand
        rows_for_brand = 0
        for el in soup.find_all(["h2", "h3", "h4", "table"]):
            if el.name in ("h2", "h3", "h4"):
                t = el.get_text(strip=True)
                if t and len(t) < 50:
                    current_section = t
            elif el.name == "table":
                parsed = parse_table(el, brand, current_section)
                all_rows.extend(parsed)
                rows_for_brand += len(parsed)
        print(f"  -> {rows_for_brand} (model × item) rows")
        time.sleep(0.4)

    # Save CSV
    out_csv = DATA / "cerphone_baseline.csv"
    with out_csv.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "brand","section","model","repair_item",
            "cerphone_price_raw","cerphone_price","istyle_price",
        ])
        w.writeheader()
        for row in all_rows:
            w.writerow(row)
    print(f"\n[SAVED] {out_csv} ({len(all_rows)} rows)")

    # Save JSON too
    (DATA / "cerphone_baseline.json").write_text(
        json.dumps(all_rows, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Quick summary
    from collections import Counter
    by_brand = Counter(r["brand"] for r in all_rows)
    print("\n[SUMMARY] rows per brand:")
    for b, c in by_brand.most_common():
        print(f"  {b}: {c}")
    priced = [r for r in all_rows if r["cerphone_price"]]
    print(f"  rows with price: {len(priced)} / {len(all_rows)}")


if __name__ == "__main__":
    main()
