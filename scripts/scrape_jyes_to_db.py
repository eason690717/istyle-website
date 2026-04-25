"""
獨立爬蟲：jyes 全品牌二手回收價 → 直接寫入 web/dev.db 的 RecyclePrice 表
解法：jyes 擋 server IP，但 cloudscraper 可繞過
本地每日跑一次（task scheduler 或手動），把 jyes 資料補進 DB
"""
import sys, sqlite3, re, time
from pathlib import Path
from datetime import datetime

import cloudscraper
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "web" / "dev.db"

# 主要品牌頁（cid → brand, category）
PAGES = [
    (1, "Apple", "phone"),
    (2, "Apple", "tablet"),
    (3, "Samsung", "phone"),
    (4, "Samsung", "tablet"),
    (5, "OPPO", "phone"),
    (6, "vivo", "phone"),
    (7, "Sony", "phone"),
    (8, "ASUS", "phone"),
    (9, "realme", "phone"),
    (10, "Xiaomi", "phone"),
    (11, "Redmi", "phone"),
    (12, "POCO", "phone"),
    (13, "Google", "phone"),
    (14, "HTC", "phone"),
    (18, "motorola", "phone"),
    (19, "黑鯊", "phone"),
    (20, "SHARP", "phone"),
    (21, "Lenovo", "phone"),
    (78, "Nothing", "phone"),
    (86, "HONOR", "phone"),
]

PRICE_RANGES = {
    "phone":      (200, 80000),
    "tablet":     (300, 80000),
    "laptop_pro": (1000, 150000),
    "laptop_air": (800, 80000),
    "console":    (200, 30000),
    "dyson":      (100, 20000),
}


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[（）()]", "", s)
    s = re.sub(r"[\s_/\\.,'\"`]+", "-", s)
    s = re.sub(r"[^a-z0-9\u4e00-\u9fff-]", "", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")


def normalize_storage(raw: str):
    m = re.search(r"(\d+(?:\.\d+)?)\s*(TB|T|GB|G)\b", raw, re.I)
    if not m:
        return None
    num, unit = m.group(1), m.group(2).upper()
    if unit in ("T",): unit = "TB"
    if unit in ("G",): unit = "GB"
    return f"{num}{unit}"


def strict_price(s: str):
    s = s.strip()
    if not re.match(r"^(?:NT)?\$?\s?[\d,]+", s):
        return None
    cleaned = re.sub(r"[NT$,，元\s]", "", s)
    m = re.match(r"^(\d+)", cleaned)
    if not m:
        return None
    n = int(m.group(1))
    return n if n > 0 else None


def main():
    if not DB.exists():
        sys.exit(f"DB not found: {DB}")

    scraper = cloudscraper.create_scraper(
        browser={'browser':'chrome','platform':'windows','desktop':True}
    )

    rows_to_upsert = []
    for cid, brand, category in PAGES:
        url = f"https://www.jyes.com.tw/recycle.php?act=list&cid={cid}"
        try:
            r = scraper.get(url, timeout=25)
            if r.status_code != 200:
                print(f"[fail cid={cid}] {brand}: status {r.status_code}")
                continue
        except Exception as e:
            print(f"[error cid={cid}] {e}")
            continue

        soup = BeautifulSoup(r.text, "html.parser")
        table = soup.find("table")
        if not table:
            print(f"[no table cid={cid}] {brand}")
            continue

        count = 0
        for tr in table.find_all("tr"):
            cells = [c.get_text(" ", strip=True) for c in tr.find_all("td")]
            if len(cells) < 3:
                continue
            model_text = cells[0]
            if "商品名稱" in model_text or "回收價" == model_text:
                continue
            # 找 $ 開頭的 cell
            price_cell = next((c for c in cells if c.strip().startswith("$")), None)
            if not price_cell:
                continue
            price = strict_price(price_cell)
            if not price:
                continue
            lo, hi = PRICE_RANGES.get(category, (100, 1000000))
            if not (lo <= price <= hi):
                print(f"  [skip 異常價] {brand} {model_text} = {price}")
                continue

            cleaned_name = re.sub(r"舊機高額回收價|高價回收|高額回收|回收價", "", model_text).strip()
            if not cleaned_name:
                continue
            storage = normalize_storage(cleaned_name)
            base_name = re.sub(r"\s*\d+\s*(?:TB|T|GB|G)\b.*$", "", cleaned_name, flags=re.I).strip() or cleaned_name
            model_key = slugify(f"{brand}-{base_name}" + (f"-{storage}" if storage else ""))

            rows_to_upsert.append({
                "modelKey": model_key,
                "brand": brand,
                "category": category,
                "modelName": base_name,
                "storage": storage,
                "price": price,
            })
            count += 1
        print(f"[ok cid={cid}] {brand} {category}: {count}")
        time.sleep(0.5)

    print(f"\n[total] {len(rows_to_upsert)} jyes rows")

    # 寫入 DB（source3）
    now = datetime.now().isoformat()
    conn = sqlite3.connect(str(DB))
    c = conn.cursor()
    upserts = 0
    for row in rows_to_upsert:
        # upsert: 若已有則更新 source3Price + minPrice，否則 insert
        existing = c.execute(
            "SELECT id, source1Price, source2Price FROM RecyclePrice WHERE modelKey = ?",
            (row["modelKey"],),
        ).fetchone()
        if existing:
            id_, s1, s2 = existing
            prices = [p for p in [s1, s2, row["price"]] if p is not None and p > 0]
            min_price = min(prices) if prices else row["price"]
            c.execute(
                """UPDATE RecyclePrice
                   SET source3Price = ?, source3At = ?, minPrice = ?,
                       lastUpdatedAt = ?
                   WHERE id = ?""",
                (row["price"], now, min_price, now, id_),
            )
        else:
            c.execute(
                """INSERT INTO RecyclePrice
                   (modelKey, brand, category, modelName, storage,
                    source3Price, source3At, minPrice, isAvailable,
                    sortOrder, lastUpdatedAt, createdAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)""",
                (row["modelKey"], row["brand"], row["category"],
                 row["modelName"], row["storage"],
                 row["price"], now, row["price"], now, now),
            )
        upserts += 1
    conn.commit()

    total_in_db = c.execute("SELECT COUNT(*) FROM RecyclePrice").fetchone()[0]
    by_brand = c.execute(
        "SELECT brand, COUNT(*) FROM RecyclePrice GROUP BY brand ORDER BY 2 DESC"
    ).fetchall()
    conn.close()

    print(f"\n[upserted] {upserts}")
    print(f"[DB total] {total_in_db}")
    print("[by brand]")
    for b, n in by_brand:
        print(f"  {b:15} {n}")


if __name__ == "__main__":
    main()
