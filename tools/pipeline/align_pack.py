# -*- coding: utf-8 -*-
"""对齐英文条目与已校对的中文效果数组，生成 official-pack.en.json。

原则：效果结构（rules）以中文包为准逐条搬运，英文侧只负责
  1) 提供条目正文（原文逐字，不做润色）
  2) 提供 gainSkillNamed / gainResourceNamed 的英文名（从同句抽取）
  3) note 的英文注释来自 align_overrides.en.json（我们自己的注释，可人工审校）
用法:
  python tools/pipeline/align_pack.py --zh <zh.json> --raw <raw-en.json> --out <en.json> [--overrides ...]
"""
import argparse, copy, json, re, sys

SKILL_PATS = [
    r'[Tt]ake the [Ss]kill ([^.;]+)',
    r'[Gg]ain the [Ss]kill ([^.;]+)',
    r'[Tt]ake the skill ([^.;]+)',
]
RES_PATS = [
    r'[Tt]ake the Resource ([^,.;]+)',
    r'[Tt]ake the resource ([^,.;]+)',
    r'[Cc]reate a Resource, ([^.;]+)',
    r'[Cc]reate a stationary Resource, ([^.;]+)',
]


def clean(s):
    s = s.strip().strip('“”"')
    s = re.sub(r'\s+', ' ', s)
    return s


def first_match(pats, text):
    for p in pats:
        m = re.search(p, text)
        if m:
            return clean(m.group(1))
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--zh', required=True)
    ap.add_argument('--raw', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--overrides')
    a = ap.parse_args()

    zh = json.load(open(a.zh, encoding='utf-8'))
    raw = json.load(open(a.raw, encoding='utf-8'))
    ov = json.load(open(a.overrides, encoding='utf-8')) if a.overrides else {}
    notes = ov.get('notes', {})
    names = ov.get('names', {})
    text_fixes = ov.get('textFixes', {})

    zmap = {p['number']: p for p in zh['prompts']}
    prompts, unresolved, used_notes = [], [], []

    for p in raw['prompts']:
        n = p['number']
        z = zmap.get(n)
        if z is None or len(z['entries']) != len(p['entries']):
            raise SystemExit(f'结构不一致: prompt {n} zh={len(z["entries"]) if z else None} en={len(p["entries"])}')
        entries, used = [], 0
        for i, e in enumerate(p['entries']):
            key = f'{n}.{i + 1}'
            text = e['text']
            if key in text_fixes:
                fix = text_fixes[key]
                text = text.replace(fix['old'], fix['new'])
            text = re.sub(r' {2,}', ' ', text).strip()
            effects = []
            for fe in z['entries'][i]['effects']:
                fe = copy.deepcopy(fe)
                if fe['type'] == 'gainSkillNamed':
                    name = names.get(key) or first_match(SKILL_PATS, text)
                    if name:
                        fe['skill'] = clean(name)
                    else:
                        unresolved.append((key, 'skill', fe.get('skill', ''), text[:90]))
                    effects.append(fe)
                elif fe['type'] == 'gainResourceNamed':
                    name = names.get(key) or first_match(RES_PATS, text)
                    if name:
                        fe['resource'] = clean(name)
                    else:
                        unresolved.append((key, 'resource', fe.get('resource', ''), text[:90]))
                    effects.append(fe)
                elif fe['type'] == 'note':
                    if key in notes:
                        fe['text'] = notes[key]
                        used_notes.append(key)
                    else:
                        unresolved.append((key, 'note', fe.get('text', ''), text[:90]))
                    effects.append(fe)
                else:
                    effects.append(fe)
            entries.append({'text': text, 'effects': effects})
        prompts.append({'number': n, 'entries': entries})

    out = {
        'meta': {
            'name': "Thousand Year Old Vampire — official Prompts (English)",
            'source': "TextOnly export of the official English rulebook (Tim Hutchings); effects aligned to the audited Chinese pack",
            'language': 'en',
            'promptCount': len(prompts),
            'sourceSha256': raw['meta'].get('sha256', ''),
        },
        'prompts': prompts,
    }
    with open(a.out, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    print(f'wrote {a.out}: prompts={len(prompts)} entries={sum(len(p["entries"]) for p in prompts)}')
    print(f'notes applied={len(used_notes)}/{len(notes)}')
    print(f'unresolved={len(unresolved)}')
    for k, kind, old, ctx in unresolved:
        print(f'  {k} [{kind}] old={old!r} ctx={ctx!r}')


if __name__ == '__main__':
    main()
