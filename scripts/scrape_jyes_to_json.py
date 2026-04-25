"""
GitHub Actions 用：jyes 全品牌爬蟲 → 輸出 jyes-data.json
本機開發用：scripts/scrape_jyes_to_db.py（直接寫 SQLite）
"""
import sys, re, time, json
from pathlib import Path
from datetime import datetime

import cloudscraper
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding="utf-8")

OUT = Path(__file__).resolve().parent.parent / "jyes-data.json"

PAGES = [
    (1, "Apple", "phone"), (2, "Apple", "tablet"),
    (3, "Samsung", "phone"), (4, "Samsung", "tablet"),
    (5, "OPPO", "phone"), (6, "vivo", "phone"),
    (7, "Sony", "phone"), (8, "ASUS", "phone"),
    (9, "realme", "phone"), (10, "Xiaomi", "phone"),
    (11, "Redmi", "phone"), (12, "POCO", "phone"),
    (13, "Google", "phone"), (14, "HTC", "phone"),
    (18, "motorola", "phone"), (19, "黑鯊", "phone"),
    (20, "SHARP", "phone"), (21, "Lenovo", "phone"),
    (78, "Nothing", "phone"), (86, "HONOR", "phone"),
]

PRICE_RANGES = {
    "phone": (200, 80000), "tablet": (300, 80000),
    "laptop_pro": (1000, 150000), "laptop_air": (800, 80000),
    "console": (200, 30000), "dyson": (100, 20000),
}

def slugify(s):
    s = s.lower()
    s = re.sub(r"[（）()]", "", s)
    s = re.sub(r"[\s_/\\.,'\"`]+", "-", s)
    s = re.sub(r"[^a-z0-9\u4e00-\u9fff-]", "", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")

def normalize_storage(raw):
    m = re.search(r"(\d+(?:\.\d+)?)\s*(TB|T|GB|G)\b", raw, re.I)
    if not m: return None
    num, unit = m.group(1), m.group(2).upper()
    if unit in ("T",): unit = "TB"
    if unit in ("G",): unit = "GB"
    return f"{num}{unit}"

def strict_price(s):
    s = s.strip()
    if not re.match(r"^(?:NT)?\$?\s?[\d,]+", s): return None
    cleaned = re.sub(r"[NT$,，元\s]", "", s)
    m = re.match(r"^(\d+)", cleaned)
    if not m: return None
    n = int(m.group(1))
    return n if n > 0 else None

scraper = cloudscraper.create_scraper(
    browser={'browser': 'chrome', 'platform': 'windows', 'desktop': True}
)

rows = []
for cid, brand, category in PAGES:
    url = f"https://www.jyes.com.tw/recycle.php?act=list&cid={cid}"
    try:
        r = scraper.get(url, timeout=25)
        if r.status_code != 200:
            print(f"[fail cid={cid}] status {r.status_code}")
            continue
    except Exception as e:
        print(f"[error cid={cid}] {e}")
        continue
    soup = BeautifulSoup(r.text, "html.parser")
    table = soup.find("table")
    if not table: continue
    count = 0
    for tr in table.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all("td")]
        if len(cells) < 3: continue
        model_text = cells[0]
        if "商品名稱" in model_text: continue
        price_cell = next((c for c in cells if c.strip().startswith("$")), None)
        if not price_cell: continue
        list_price = strict_price(price_cell)
        if not list_price: continue
        lo, hi = PRICE_RANGES.get(category, (100, 1000000))
        if not (lo <= list_price <= hi): continue
        cleaned_name = re.sub(r"舊機高額回收價|高價回收|高額回收|回收價", "", model_text).strip()
        if not cleaned_name: continue
        list_storage = normalize_storage(cleaned_name)
        base_name = re.sub(r"\s*\d+\s*(?:TB|T|GB|G)\b.*$", "", cleaned_name, flags=re.I).strip() or cleaned_name

        # 嘗試抓 detail 頁取得各容量
        detail_a = tr.find("a", href=True)
        detail_rows = []
        if detail_a:
            detail_url = detail_a["href"]
            if not detail_url.startswith("http"):
                detail_url = "https://www.jyes.com.tw/" + detail_url.lstrip("/")
            try:
                rd = scraper.get(detail_url, timeout=20)
                if rd.status_code == 200:
                    dsoup = BeautifulSoup(rd.text, "html.parser")
                    dtable = dsoup.find("table")
                    if dtable:
                        for dr in dtable.find_all("tr"):
                            dcells = [c.get_text(" ", strip=True) for c in dr.find_all(["td", "th"])]
                            if len(dcells) < 2: continue
                            if "容量" in dcells[0] or "回收" in dcells[1]: continue
                            d_storage = normalize_storage(dcells[0])
                            d_price = strict_price(dcells[1])
                            if d_storage and d_price and lo <= d_price <= hi:
                                detail_rows.append((d_storage, d_price))
                time.sleep(0.3)
            except Exception:
                pass

        if detail_rows:
            for d_storage, d_price in detail_rows:
                model_key = slugify(f"{brand}-{base_name}-{d_storage}")
                rows.append({
                    "modelKey": model_key, "brand": brand, "category": category,
                    "modelName": base_name, "storage": d_storage, "price": d_price,
                })
                count += 1
        else:
            # fallback：用 list 頁的單一價（高容量）
            model_key = slugify(f"{brand}-{base_name}" + (f"-{list_storage}" if list_storage else ""))
            rows.append({
                "modelKey": model_key, "brand": brand, "category": category,
                "modelName": base_name, "storage": list_storage, "price": list_price,
            })
            count += 1
    print(f"[ok cid={cid}] {brand} {category}: {count}")
    time.sleep(0.5)

OUT.write_text(json.dumps({
    "scrapedAt": datetime.utcnow().isoformat() + "Z",
    "rows": rows,
}, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n[done] wrote {len(rows)} rows to {OUT}")
