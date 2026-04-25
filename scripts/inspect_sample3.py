"""Inspect one li_proudctlist block."""
import sys
from pathlib import Path
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "data" / "wsphone" / "03_sample_category.html").read_text(encoding="utf-8")
soup = BeautifulSoup(html, "html.parser")

items = soup.find_all("div", class_="li_proudctlist")
print(f"Found {len(items)} items on this page\n")

# Print first 2 with full structure
for i, item in enumerate(items[:2]):
    print(f"=== ITEM {i} (raw HTML) ===")
    print(item.prettify()[:1500])
    print()

# Check pagination
print("=== Pagination ===")
for cls in ["pagination", "page", "pager", "nav"]:
    nodes = soup.find_all(class_=lambda c: c and cls in c.lower())
    for n in nodes[:3]:
        text = n.get_text(strip=True)[:200]
        if text:
            print(f"  [{cls}] {text}")

# Look for "下一頁" / next links
import re
for a in soup.find_all("a", href=True):
    text = a.get_text(strip=True)
    if any(k in text for k in ["下一", "頁", "Next", ">>"]) and len(text) < 20:
        print(f"  link: {a['href']} text={text}")
