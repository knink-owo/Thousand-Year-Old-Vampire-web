# -*- coding: utf-8 -*-
"""双语提示包校验：结构对等 + 英文本无中文残留 + 每条英文都能在英文原文中逐字命中。

用法:
  python tools/pipeline/verify_bilingual.py --zh <zh.json> --en <en.json> --source <rulebook-en.txt>
"""
import argparse, json, re, sys

CJK = re.compile(r'[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]')


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def walk_strings(node, path=''):
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk_strings(v, f'{path}[{i}]')
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from walk_strings(v, f'{path}.{k}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--zh', required=True)
    ap.add_argument('--en', required=True)
    ap.add_argument('--source', required=True)
    ap.add_argument('--overrides')
    a = ap.parse_args()

    zh = json.load(open(a.zh, encoding='utf-8'))
    en = json.load(open(a.en, encoding='utf-8'))
    src = norm(open(a.source, encoding='utf-8-sig').read())
    if a.overrides:
        ov = json.load(open(a.overrides, encoding='utf-8'))
        for fix in ov.get('textFixes', {}).values():
            src = src.replace(norm(fix['old']), norm(fix['new']))
    errors, warns = [], []

    zn = [p['number'] for p in zh['prompts']]
    enn = [p['number'] for p in en['prompts']]
    if zn != enn:
        errors.append(f'prompt numbers differ: zh={len(zn)} en={len(enn)}')
    if zn != list(range(1, len(zn) + 1)):
        errors.append('zh prompt numbers not contiguous from 1')
    if en['meta'].get('language') != 'en':
        errors.append('en meta.language != en')

    zmap = {p['number']: p for p in zh['prompts']}
    emap = {p['number']: p for p in en['prompts']}
    entries = 0
    for n in sorted(set(zmap) & set(emap)):
        z, e = zmap[n], emap[n]
        if len(z['entries']) != len(e['entries']):
            errors.append(f'{n}: entry count zh={len(z["entries"])} en={len(e["entries"])}')
            continue
        for i, (ze, ee) in enumerate(zip(z['entries'], e['entries']), 1):
            entries += 1
            zt = [f['type'] for f in ze['effects']]
            et = [f['type'] for f in ee['effects']]
            if zt != et:
                errors.append(f'{n}.{i}: effect types zh={zt} en={et}')
            if not ee['text'].strip():
                errors.append(f'{n}.{i}: empty text')
            if norm(ee['text']) not in src:
                errors.append(f'{n}.{i}: text not found verbatim in source -> {ee["text"][:80]!r}')

    for path, s in walk_strings(en):
        if CJK.search(s):
            errors.append(f'CJK leak at {path}: {s[:60]!r}')
    for e in en['prompts']:
        for i, ee in enumerate(e['entries'], 1):
            if not ee['text'].rstrip().endswith(('.', '!', '?', '”', '…')):
                warns.append(f'{e["number"]}.{i} no terminal punctuation')
            if '  ' in ee['text']:
                warns.append(f'{e["number"]}.{i} double space')

    print(f'prompts={len(en["prompts"])} entries={entries}')
    print(f'errors={len(errors)} warns={len(warns)}')
    for x in errors[:40]:
        print('  E', x)
    for x in warns[:20]:
        print('  W', x)
    if errors:
        sys.exit(1)


if __name__ == '__main__':
    main()
