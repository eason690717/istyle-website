#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把照片內嵌進行程頁的圖位（data URI），取代原本的 SVG 示意圖。

用法：
    python3 scripts/embed_photo.py <圖位ID> <照片檔路徑> ["圖說（可省略，省略則沿用原圖說）"]

範例：
    python3 scripts/embed_photo.py fuk-yatai ~/photos/nakasu.jpg
    python3 scripts/embed_photo.py dad-shrimp ~/photos/shrimp.jpg "<b>Quán Bé Mặn</b>　我們點的椒鹽皮皮蝦。<em>Day 1 · 19:00</em>"

列出所有圖位：
    python3 scripts/embed_photo.py --list
"""
import sys, os, re, base64, mimetypes

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = {
    'fuk': ('trips/fukuoka-2026/index.html', '福岡'),
    'ngk': ('trips/nagaoka-2027/index.html', '長岡'),
    'dad': ('trips/danang-2027/index.html',  '峴港'),
}
MAX_BYTES = 1_800_000   # 單張建議上限；整頁 16MB 是硬限制


def find_pages():
    out = []
    for prefix, (rel, name) in PAGES.items():
        path = os.path.join(ROOT, rel)
        if os.path.exists(path):
            out.append((prefix, path, name))
    return out


def list_slots():
    for prefix, path, name in find_pages():
        s = open(path, encoding='utf-8').read()
        print(f"\n{name}  ({os.path.relpath(path, ROOT)})")
        for m in re.finditer(
            r'<figure class="figure" data-slot="([^"]+)">(.*?)</figure>', s, re.S
        ):
            slot, body = m.group(1), m.group(2)
            kind = '照片' if '<img' in body else 'SVG 示意圖'
            cap = re.search(r'<figcaption class="figcap">(.*?)</figcaption>', body, re.S)
            txt = re.sub(r'<[^>]+>', '', cap.group(1)).strip()[:52] if cap else ''
            print(f"   {slot:<14} [{kind:<9}] {txt}")


def embed(slot, img_path, caption=None):
    prefix = slot.split('-')[0]
    if prefix not in PAGES:
        sys.exit(f"未知的圖位前綴：{prefix}（應為 fuk / ngk / dad）")
    path = os.path.join(ROOT, PAGES[prefix][0])
    if not os.path.exists(path):
        sys.exit(f"找不到頁面：{path}")
    if not os.path.exists(img_path):
        sys.exit(f"找不到照片：{img_path}")

    mime = mimetypes.guess_type(img_path)[0]
    if not mime or not mime.startswith('image/'):
        sys.exit(f"這不是圖片檔：{img_path}（{mime}）")

    raw = open(img_path, 'rb').read()
    if len(raw) > MAX_BYTES:
        print(f"⚠  {len(raw)/1e6:.1f}MB 偏大，建議先壓到 1.5MB 以下"
              f"（整頁上限 16MB，內嵌後體積約 ×1.37）")

    b64 = base64.b64encode(raw).decode('ascii')
    data_uri = f"data:{mime};base64,{b64}"

    s = open(path, encoding='utf-8').read()
    pat = re.compile(
        r'(<figure class="figure" data-slot="' + re.escape(slot) + r'">)(.*?)(</figure>)', re.S
    )
    m = pat.search(s)
    if not m:
        sys.exit(f"頁面裡找不到圖位 {slot}，用 --list 看看有哪些")

    old = m.group(2)
    cap_m = re.search(r'<figcaption class="figcap">(.*?)</figcaption>', old, re.S)
    cap_html = caption if caption else (cap_m.group(1) if cap_m else '')
    alt = re.sub(r'<[^>]+>', '', cap_html).strip().replace('"', "'")[:110]

    new = (f'<img src="{data_uri}" alt="{alt}" loading="lazy">'
           f'<figcaption class="figcap">{cap_html}</figcaption>')
    s = s[:m.start(2)] + new + s[m.end(2):]
    open(path, 'w', encoding='utf-8').write(s)

    size = os.path.getsize(path)
    print(f"✓ {slot} ← {os.path.basename(img_path)} "
          f"（{len(raw)/1024:.0f}KB → 頁面現在 {size/1e6:.2f}MB）")
    if size > 15_000_000:
        print("⚠  頁面接近 16MB 上限，請壓縮既有照片")


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] in ('--list', '-l'):
        list_slots()
    elif len(sys.argv) >= 3:
        embed(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    else:
        print(__doc__)
