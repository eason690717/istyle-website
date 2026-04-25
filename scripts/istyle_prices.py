"""Fetch all i-style.store transparent pricing pages and analyze content."""
import re
import sys
from pathlib import Path
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "istyle"
DATA.mkdir(parents=True, exist_ok=True)
sys.stdout.reconfigure(encoding="utf-8")

PRICE_PAGES = [
    "https://www.i-style.store/pages/iphone維修價格表",
    "https://www.i-style.store/pages/ipad維修價格表",
    "https://www.i-style.store/pages/macbook維修-價格",
    "https://www.i-style.store/pages/安卓維修-價格",
    "https://www.i-style.store/pages/switch維修-價格",
    "https://www.i-style.store/pages/dyson維修價格表",
    "https://www.i-style.store/pages/iphone回收價錢表",
    "https://www.i-style.store/pages/ipad回收價錢參考表",
    "https://www.i-style.store/pages/所有維修項目-1",
]

s = requests.Session()
s.headers.update({"User-Agent": "Mozilla/5.0", "Accept-Language": "zh-TW,zh;q=0.9"})

for url in PRICE_PAGES:
    name = unquote(url.rsplit("/", 1)[-1])
    print(f"\n{'='*70}\n{name}\n{'='*70}")
    try:
        r = s.get(url, timeout=20)
    except Exception as e:
        print(f"  FETCH ERROR: {e}")
        continue
    print(f"  status={r.status_code} len={len(r.text)}")

    # Save HTML
    safe = re.sub(r"[^\w\u4e00-\u9fff-]", "_", name)[:50]
    (DATA / f"price_{safe}.html").write_text(r.text, encoding="utf-8")

    soup = BeautifulSoup(r.text, "html.parser")

    # Tables?
    tables = soup.find_all("table")
    print(f"  tables: {len(tables)}")
    for ti, t in enumerate(tables):
        rows = t.find_all("tr")
        print(f"    table[{ti}] rows={len(rows)}")
        for r2 in rows[:5]:
            cells = [c.get_text(strip=True) for c in r2.find_all(["td","th"])]
            cells = [c for c in cells if c]
            if cells:
                print(f"      {cells[:8]}")

    # Images (might be price as images!)
    main = soup.find("main") or soup.find("div", class_=re.compile("content|page|main", re.I)) or soup
    imgs = main.find_all("img") if main else soup.find_all("img")
    img_in_content = [i.get("src","") for i in imgs if i.get("src","")]
    # Filter out icons/logos/banners
    likely_price = [s for s in img_in_content if any(k in s.lower() for k in ["price","維修","_p","table"])][:5]
    print(f"  images in content: {len(img_in_content)}, likely-price: {likely_price}")

    # Look for digit-heavy text outside header/nav
    body = soup.find("main") or soup
    if body:
        text = body.get_text(separator="\n")
        digit_lines = [l.strip() for l in text.split("\n") if re.search(r"\d{3,5}", l) and len(l.strip()) < 200]
        # exclude obvious nav
        digit_lines = [l for l in digit_lines if not any(k in l for k in ["最新消息","關於","品牌"])]
        print(f"  digit-lines (likely prices): {len(digit_lines)}")
        for l in digit_lines[:15]:
            print(f"    {l}")
