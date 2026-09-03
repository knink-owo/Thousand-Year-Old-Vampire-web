# -*- coding: utf-8 -*-
"""Extract all text from the rulebook PDF into a UTF-8 text file."""
import pymupdf
import sys

src = r'D:\Projects\Thousand Year Old Vampire\千年版规则书.pdf'
dst = r'D:\Projects\Thousand Year Old Vampire\规则书全文.txt'

doc = pymupdf.open(src)
out = []
for i, page in enumerate(doc):
    out.append(f"\n===== 第 {i+1} 页 / {doc.page_count} 页 =====\n")
    out.append(page.get_text())

with open(dst, 'w', encoding='utf-8') as f:
    f.write(''.join(out))

print(f"OK: {doc.page_count} pages -> {dst}")