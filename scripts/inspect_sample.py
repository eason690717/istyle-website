"""Inspect sample category HTML to understand product data structure."""
import re
import sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "data" / "wsphone" / "03_sample_category.html").read_text(encoding="utf-8")
print(f"HTML length: {len(html)}")

# Find script blocks
scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.DOTALL)
print(f"\nFound {len(scripts)} <script> blocks")
for i, s in enumerate(scripts):
    if len(s.strip()) < 30:
        continue
    snippet = s.strip()[:300]
    has_data = any(kw in s for kw in ["product", "price", "$", "var ", "data:", "Vue"])
    print(f"\n[{i}] len={len(s)} has_data={has_data}")
    print(snippet[:400])

# Find context around dollar sign
print("\n=== Price contexts ===")
for m in list(re.finditer(r".{80}\$\s*\d+.{80}", html))[:8]:
    txt = m.group(0).replace("\n", " ").replace("\t", " ")
    txt = re.sub(r"\s+", " ", txt)
    print(txt)
    print("---")
