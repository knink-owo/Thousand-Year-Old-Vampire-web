# -*- coding: utf-8 -*-
"""Parse the rulebook PDF into structured prompt data (blocks mode preserves paragraphs).

Outputs:
  D:\\Projects\\Thousand Year Old Vampire\\.tools\\debug_blocks.txt  - raw block listing for inspection
  D:\\Projects\\Thousand Year Old Vampire\\src-data\\prompts_raw.json - structured prompts v1
"""
import pymupdf
import json
import re

SRC = r'D:\Projects\Thousand Year Old Vampire\千年版规则书.pdf'
DEBUG = r'D:\Projects\Thousand Year Old Vampire\.tools\debug_blocks.txt'
OUT = r'D:\Projects\Thousand Year Old Vampire\src-data\prompts_raw.json'

doc = pymupdf.open(SRC)

# ---- Step 1: collect text blocks per page ----
page_blocks = []  # (page_no, block index, y0, text)
for pno, page in enumerate(doc):
    blocks = page.get_text("blocks")
    for b in blocks:
        x0, y0, x1, y1, text, bno, btype = b
        text = text.strip()
        if not text:
            continue
        page_blocks.append((pno + 1, bno, y0, text))

# ---- Step 2: locate prompt headers and gather entries ----
PROMPT_RE = re.compile(r'^提示\s*(\d{1,3})\s*$')

prompts = {}   # number -> {title, entries: [text,...]}
order = []
cur = None     # current prompt number

for (pno, bno, y0, text) in page_blocks:
    m = PROMPT_RE.match(text)
    if m:
        n = int(m.group(1))
        if n not in prompts:
            prompts[n] = {'entries': []}
            order.append(n)
        cur = n
        continue
    if cur is None:
        continue  # before prompt list
    # continuation text: each block after a prompt header is one entry,
    # unless it is a page-top continuation of the previous block.
    entries = prompts[cur]['entries']
    if entries:
        last = entries[-1]
        # If the previous entry does not end with sentence punctuation and this
        # block sits at the very top of a page, it is a cross-page continuation.
        if pno > 1 and y0 < 50 and not re.search(r'[。？?!！…]$', last):
            entries[-1] = last + text
            continue
    entries.append(text)

# ---- Step 3: write debug + json ----
with open(DEBUG, 'w', encoding='utf-8') as f:
    for (pno, bno, y0, text) in page_blocks:
        f.write(f"p{pno} b{bno} y{y0:.0f} | {text[:90]}\n")

data = {
    "source": "千年老吸血鬼 规则书(第2版中文翻译, ver 1.04, chez PDF供货)",
    "note": "v1 raw extraction; entries merged without paragraph splits — 需要人工校对分段",
    "prompts": [{"number": n, "entries": prompts[n]['entries']} for n in order],
}
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=1)

print(f"prompts: {len(order)}  (min={min(order)}, max={max(order)})")
for n in order:
    ec = len(prompts[n]['entries'])
    print(f"  {n}: {ec} entries")