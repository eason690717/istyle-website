"""Deeper inspection of sample category HTML."""
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "data" / "wsphone" / "03_sample_category.html").read_text(encoding="utf-8")
soup = BeautifulSoup(html, "html.parser")

# Look for any table, list, or repeated divs
print("=== TABLES ===")
tables = soup.find_all("table")
print(f"found {len(tables)} tables")
for i, t in enumerate(tables[:3]):
    print(f"\n[Table {i}] rows={len(t.find_all('tr'))}")
    rows = t.find_all("tr")
    for r in rows[:5]:
        cells = [c.get_text(strip=True) for c in r.find_all(["td", "th"])]
        print(f"  {cells}")

# Look for divs with class containing 'product' or 'item'
print("\n=== Product-like divs ===")
for cls in ["product", "item", "goods", "pl", "list", "row"]:
    divs = soup.find_all("div", class_=re.compile(cls, re.I))
    if divs:
        print(f"  class~={cls}: {len(divs)} matches")

# Look for repeated patterns
print("\n=== All div classes (top 15) ===")
from collections import Counter
classes = Counter()
for d in soup.find_all(["div", "li", "tr"]):
    if d.get("class"):
        classes[" ".join(d["class"])] += 1
for cls, count in classes.most_common(15):
    print(f"  {count:3} x {cls[:60]}")

# Print any text containing digits + chinese (likely product names with prices)
print("\n=== Lines with prices ===")
text = soup.get_text(separator="\n")
for line in text.split("\n"):
    line = line.strip()
    if line and re.search(r"\d{2,5}", line) and len(line) < 200:
        print(f"  {line[:150]}")
