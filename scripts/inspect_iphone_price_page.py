"""Deep dive into iphone price page to find where prices are stored."""
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "data" / "istyle" / "price_iphone維修價格表.html").read_text(encoding="utf-8")

soup = BeautifulSoup(html, "html.parser")

# Find main content area
main_candidates = soup.find_all(class_=re.compile(r"page|content|main|article|body", re.I))
print(f"Main-like containers: {len(main_candidates)}")

# Look for iframe
iframes = soup.find_all("iframe")
print(f"iframes: {len(iframes)}")
for ifr in iframes:
    print(f"  src={ifr.get('src','')}")

# Look for all images (including srcset, data-src for lazy load)
imgs = soup.find_all("img")
print(f"\ntotal <img>: {len(imgs)}")
for img in imgs:
    srcs = [img.get(a) for a in ["src", "data-src", "data-original", "srcset"] if img.get(a)]
    alt = img.get("alt", "")
    if any("維修" in str(s) or "iphone" in str(s).lower() or "price" in str(s).lower() for s in srcs+[alt]):
        print(f"  PRICE-RELATED: alt={alt[:50]} src={srcs}")
    elif srcs:
        print(f"  src={srcs[0][:80]} alt={alt[:30]}")

# Look for inline styles with background-image
import re
bgs = re.findall(r"background-image\s*:\s*url\(['\"]?([^'\")]+)", html)
print(f"\nbackground-image URLs: {len(bgs)}")
for u in bgs[:10]:
    print(f"  {u[:100]}")

# Find the actual page content
content_div = soup.find("div", class_=re.compile("page-content|page__content|post-content|article-body|rte", re.I))
if content_div:
    print(f"\n=== Content div found: class={content_div.get('class')} ===")
    print(content_div.prettify()[:2000])
else:
    # Try by ID
    content = soup.find(id=re.compile("content|page", re.I))
    if content:
        print(f"\n=== content by id={content.get('id')} ===")
        print(content.prettify()[:2000])
