"""Find correct tag for li_proudctlist."""
import sys
from pathlib import Path
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "data" / "wsphone" / "03_sample_category.html").read_text(encoding="utf-8")
soup = BeautifulSoup(html, "html.parser")

items = soup.find_all(class_="li_proudctlist")
print(f"li_proudctlist (any tag): {len(items)}")
if items:
    print(f"  tag: <{items[0].name}>")
    print(items[0].prettify()[:1200])

# Pagination details
print("\n=== Pagination block ===")
pag = soup.find(class_=lambda c: c and "pagination" in str(c))
if pag:
    print(pag.prettify())
