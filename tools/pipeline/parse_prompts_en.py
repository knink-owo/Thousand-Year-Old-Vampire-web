# -*- coding: utf-8 -*-
"""解析英文原书纯文本导出（TextOnly）→ 结构化提示数据。

用法:
  python tools/pipeline/parse_prompts_en.py --txt <rulebook-en.txt> --out src-data/prompts_raw-en.json [--zh tyov-web/src/data/official-pack.json]

结构约定（TextOnly 导出）:
  正文 "Prompts" 段 → 每条目标题行为  1a / 1b / 2c ...  （72-80 只有 a）
  标题后到下一个标题之间的非空行合并为一个条目；跳过形如 "4b." 的游离重复行。
"""
import argparse, hashlib, json, re, sys

HEADER = re.compile(r'^(\d{1,2})([abc])$')
STRAY = re.compile(r'^\d{1,2}[abc]\.')
RULE = re.compile(r'^_+$')


def load_lines(path):
    with open(path, encoding='utf-8-sig') as f:
        return [ln.rstrip('\n') for ln in f]


def find(lines, text, start=0):
    for i in range(start, len(lines)):
        if lines[i].strip() == text:
            return i
    raise SystemExit(f'未找到段落标记: {text}')


def parse(lines):
    head = find(lines, 'Prompts')
    tail = find(lines, 'Appendix One', head)
    body = lines[head + 1:tail]

    blocks, cur = [], None
    for ln in body:
        s = ln.strip()
        m = HEADER.match(s)
        if m:
            cur = {'number': int(m.group(1)), 'label': m.group(2), 'lines': []}
            blocks.append(cur)
            continue
        if cur is None or not s or RULE.match(s):
            continue
        if STRAY.match(s):
            continue
        cur['lines'].append(s)

    prompts, order = {}, []
    for b in blocks:
        n = b['number']
        if n not in prompts:
            prompts[n] = []
            order.append(n)
        prompts[n].append({'label': b['label'], 'text': ' '.join(b['lines'])})
    return [{'number': n, 'entries': prompts[n]} for n in order]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--txt', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--zh')
    a = ap.parse_args()

    lines = load_lines(a.txt)
    raw = parse(lines)
    data = {
        'meta': {
            'name': 'Thousand Year Old Vampire — official Prompts (English)',
            'source': 'TextOnly export of the official English rulebook (Tim Hutchings, 2019/2020)',
            'language': 'en',
            'sha256': hashlib.sha256(open(a.txt, 'rb').read()).hexdigest(),
        },
        'prompts': raw,
    }
    with open(a.out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    nums = [p['number'] for p in raw]
    entries = sum(len(p['entries']) for p in raw)
    print(f'prompts={len(raw)} entries={entries} numbers={nums[0]}..{nums[-1]} contiguous={nums == list(range(1, len(nums) + 1))}')
    bad = []
    for p in raw:
        labels = [e['label'] for e in p['entries']]
        expect = ['a'] if p['number'] >= 72 else ['a', 'b', 'c']
        if labels != expect:
            bad.append((p['number'], labels))
        for e in p['entries']:
            t = e['text']
            if len(t) < 25 or not t.rstrip().endswith(('.', '!', '?', '”', '…')):
                print(f'  ? {p["number"]}{e["label"]} len={len(t)} end={t[-40:]!r}')
    print('label mismatches:', bad if bad else 'none')

    if a.zh:
        zh = json.load(open(a.zh, encoding='utf-8'))
        zmap = {p['number']: len(p['entries']) for p in zh['prompts']}
        emap = {p['number']: len(p['entries']) for p in raw}
        diff = {n: (zmap.get(n), emap.get(n)) for n in sorted(set(zmap) | set(emap)) if zmap.get(n) != emap.get(n)}
        print('zh prompts:', len(zmap), 'entries:', sum(zmap.values()))
        print('entry-count diff (zh,en):', diff if diff else 'none')


if __name__ == '__main__':
    main()
