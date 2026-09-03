# -*- coding: utf-8 -*-
"""Clean prompt text and extract structured effects from natural language.

Reads  src-data/prompts_raw.json
Writes src-data/prompts.json  (clean text + effects)  and  src-data/effects_audit.txt
"""
import json
import re

RAW = r'D:\Projects\Thousand Year Old Vampire\src-data\prompts_raw.json'
OUT = r'D:\Projects\Thousand Year Old Vampire\src-data\prompts.json'
AUDIT = r'D:\Projects\Thousand Year Old Vampire\src-data\effects_audit.txt'

with open(RAW, encoding='utf-8') as f:
    data = json.load(f)

# ---------- typo fixes (translation artifacts) ----------
FIXES = [
    ("不知青", "不知情"),
    ("你你被揭露", "你被揭露"),
    ("需要需要", "需要"),
    ("  ", " "),
]

def clean(text: str) -> str:
    t = text.replace("\n", "").replace("\r", "")
    t = re.sub(r'\s+', ' ', t).strip()
    for a, b in FIXES:
        t = t.replace(a, b)
    return t

# ---------- effect extraction ----------
# NOTE 文本同时含"创建一个"/"创造一个"，正则统一用 (?:创建|创造)。

EFFECT_RULES = [
    # --- game endings ---
    ("gameOver", re.compile(r'游戏结束'), None),

    # --- memory slots ---
    ("gainMemorySlot", re.compile(r'(?:创建|创造)一个(?:额外)?记忆槽|(?:获得|增加)一个(?:额外的)?记忆槽'), lambda m: {}),
    ("loseMemorySlot", re.compile(r'永久失去一个记忆槽'), lambda m: {}),
    ("loseMemorySlot", re.compile(r'失去一个记忆槽'), lambda m: {}),

    # --- memories ---
    ("loseTwoMemories", re.compile(r'失去你(?:最古老和最新|最早和最新)的记忆'), lambda m: {}),
    ("loseMemory", re.compile(r'彻底抹去一段记忆'), lambda m: {}),
    ("loseMemory", re.compile(r'失去一个记忆(?!槽)'), lambda m: {}),
    ("loseMemory", re.compile(r'失去一段(?:暴力|被爱|现有的)?记忆'), lambda m: {}),
    ("loseMemory", re.compile(r'划掉一个记忆'), lambda m: {}),
    ("loseMemory", re.compile(r'抹去你最早的记忆'), lambda m: {}),
    ("restoreMemory", re.compile(r'恢复与凡人祖先有关的被遗忘的记忆'), lambda m: {}),
    ("memoryToSkill", re.compile(r'将一段记忆转化为技能'), lambda m: {}),
    ("memoryToDiary", re.compile(r'将(?:一段)?记忆移到(?:你的)?日记'), lambda m: {}),
    ("stabilizeMemory", re.compile(r'在记忆旁边画一个星号'), lambda m: {}),
    ("swapProperNouns", re.compile(r'在两个记忆之间交换专有名词'), lambda m: {}),
    ("removeMemorySentence", re.compile(r'删除任意两段记忆的第一句话'), lambda m: {}),
    ("editMemory", re.compile(r'修改(?:一个|一段|一项|两段)?记忆'), lambda m: {}),
    ("editMemory", re.compile(r'将一段被爱的记忆改为'), lambda m: {}),
    ("loseMemoryRandom", re.compile(r'随机失去一段经历'), lambda m: {}),

    # --- skills ---
    ("gainSkillNamed", re.compile(r'获得技能[:：]?\s*([^。；，]+)'), lambda m: {'skill': m.group(1).strip()}),
    ("gainSkill", re.compile(r'(?:创建|创造)(?:一项|一个)?(?:新的)?(?:合适的|当代|基于记忆的|基于记忆|关于|反映|描述|专注于|与|相|体现你)?技能'), lambda m: {}),
    ("gainSkill", re.compile(r'(?:获得|发展出)一项?(?:新的)?(?:合适的|当代|基于记忆的|基于记忆|关于|反映|描述|专注于|与|相|体现你)?技能'), lambda m: {}),
    ("gainSkill", re.compile(r'(?:根据|基于)(?:记忆|已勾选的技能)(?:创建|创造)一项?技能'), lambda m: {}),
    ("gainSkill", re.compile(r'(?:创建|创造)一项?(?:简单|实用|新|适当|合适|反映|基于|与)'), lambda m: {}),  # fallback: 创建X技能 前缀
    ("checkSkill3", re.compile(r'勾选三项技能'), lambda m: {}),
    ("checkSkill2", re.compile(r'勾选两项技能'), lambda m: {}),
    ("checkSkill", re.compile(r'(?<!取消)勾选一项?技能'), lambda m: {}),
    ("checkCountSkill", re.compile(r'通过勾选(\d?)项技能'), lambda m: {'n': int(m.group(1))}),
    ("uncheckSkill", re.compile(r'取消勾选一项?技能'), lambda m: {}),
    ("loseSkill", re.compile(r'失去一项?(?:已勾选|未勾选)?(?:或未勾选)?的?技能'), lambda m: {}),
    ("loseSkill", re.compile(r'失去一项?(?:已勾选|未勾选)?技能'), lambda m: {}),
    ("changeSkill", re.compile(r'更改一项已勾选或未勾选的技能'), lambda m: {}),
    ("rewriteSkill", re.compile(r'将任何未勾选的技能重写'), lambda m: {}),

    # --- resources ---
    ("loseAllFixedResources", re.compile(r'失去(?:所有|任何)固定资源'), lambda m: {}),
    ("loseFixedResource", re.compile(r'失去一项固定资源'), lambda m: {}),
    ("loseResource3", re.compile(r'失去三项资源'), lambda m: {}),
    ("loseResource2", re.compile(r'失去两项资源'), lambda m: {}),
    ("loseResource", re.compile(r'失去一项?(?:具体的)?资源'), lambda m: {}),
    ("loseResource", re.compile(r'失去(?:一项)?资源'), lambda m: {}),
    ("gainResourceNamed", re.compile(r'(?:创建|创造)?(?:一项)?资源[:：]\s*([^。；，]+)'), lambda m: {'resource': m.group(1).strip()}),
    ("gainResource", re.compile(r'(?:创建|创造)(?:一项|一个)?(?:新的|奢华|神秘学|有问题的|固定|拾荒得来的|当代|仆从家族|代表)?资源'), lambda m: {}),
    ("gainResource", re.compile(r'获得一项?(?:固定)?资源'), lambda m: {}),
    ("gainTwoResources", re.compile(r'(?:获得两项资源|创建两种新资源)'), lambda m: {}),
    ("gainFixedResource", re.compile(r'(?:创建|创造)一个可以庇护你的固定资源'), lambda m: {}),
    ("degradeResource", re.compile(r'将一个资源降级为废墟'), lambda m: {}),
    ("convertFixedResources", re.compile(r'将任何固定资源转换为'), lambda m: {}),
    ("swapResource", re.compile(r'用你(?:最古老)?的资源换取两项当代的资源'), lambda m: {}),
    ("destroyResource", re.compile(r'扔掉你(?:最古老或最珍贵)?的资源'), lambda m: {}),
    ("retrieveResource", re.compile(r'找回一项失去的资源'), lambda m: {}),
    ("resourceToMemory", re.compile(r'检查你拥有的一项资源会引发一段被遗忘的记忆'), lambda m: {}),

    # --- marks (印记) ---
    ("gainMark", re.compile(r'(?:创建|创造|得到|获得)(?:一项|一枚|一个)(?:新的)?印记'), lambda m: {}),
    ("loseMark", re.compile(r'(?:移除|去除|划掉|失去)(?:一项|一枚|一个)?印记'), lambda m: {}),
    ("crippleMark", re.compile(r'一项印记变为失能'), lambda m: {}),

    # --- characters ---
    ("createMortal", re.compile(r'(?:创建|创造)(?:一个)?(?:新|友好|凡人|无辜|心爱|被你背叛的)?凡人(?:儿童)?角色'), lambda m: {}),
    ("createImmortalHostile", re.compile(r'(?:创建|创造)(?:一个)?(?:新的)?敌对(?:的)?不朽者角色'), lambda m: {}),
    ("createImmortal", re.compile(r'(?:创建|创造)(?:一个)?(?:新的)?不朽(?:者)?角色'), lambda m: {}),
    ("createCharacter", re.compile(r'(?:创建|创造)(?:一个|两个|三个|最多两个|新的|负面|令人厌恶的)?角色'), lambda m: {}),
    ("killCharacter", re.compile(r'(?:杀死|杀害)(?:一个|一名)?(?:凡人)?角色'), lambda m: {}),
    ("deleteCharacter", re.compile(r'删除一个凡人角色'), lambda m: {}),
    ("killAllMortals", re.compile(r'划掉所有凡人角色'), lambda m: {}),
    ("mortalToHostileImmortal", re.compile(r'将(?:一个|一位|一名)?(?:深爱的|信任的)?凡人角色转(?:化|换)为(?:敌对的不朽者|可怕、非人且不朽的存在|像你一样的怪物)'), lambda m: {}),
    ("mortalToImmortal", re.compile(r'从现有的凡人角色中(?:创建|创造)一个不朽者角色'), lambda m: {}),
    ("reviveCharacter", re.compile(r'带回(?:一个|一位)?(?:最近被划掉的)?(?:凡人)?角色'), lambda m: {}),
    ("characterToResource", re.compile(r'把角色改为资源'), lambda m: {}),
    ("returnGhost", re.compile(r'将一个早已死去的角色作为幽灵带回来'), lambda m: {}),
    ("dieByAge", re.compile(r'(?:因年老|已经因年老)而死'), lambda m: {}),
    ("changeAllegiance", re.compile(r'将敌人变成朋友|将朋友变成敌人'), lambda m: {}),
]

def extract_effects(text: str):
    effects = []
    for name, rx, tf in EFFECT_RULES:
        for m in rx.finditer(text):
            if tf is not None:
                try:
                    arg = tf(m)
                except Exception:
                    arg = {}
            else:
                arg = {}
            effects.append({'type': name, **arg})
    # dedupe identical (same type+args)
    seen = set()
    deduped = []
    for e in effects:
        key = (e['type'], frozenset((k, str(v)) for k, v in e.items() if k != 'type'))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(e)
    return deduped

# ---------- build output ----------
prompts_out = []
audit_lines = []
for p in data['prompts']:
    n = p['number']
    entries = []
    for i, raw in enumerate(p['entries']):
        txt = clean(raw)
        effects = extract_effects(txt)
        entries.append({'text': txt, 'effects': effects})
    prompts_out.append({'number': n, 'entries': entries})
    for i, e in enumerate(entries):
        audit_lines.append(f"#{n}.{i+1}: {e['text']}")
        for fx in e['effects']:
            audit_lines.append(f"    -> {fx['type']} {json.dumps({k:v for k,v in fx.items() if k!='type'}, ensure_ascii=False)}")
        audit_lines.append("")

out_data = {
    "meta": {
        "name": "千年吸血鬼官方提示包（中文）",
        "source": "《千年老吸血鬼》规则书中文翻译版 ver 1.04（用户提供 PDF 提取）",
        "language": "zh",
        "promptCount": len(prompts_out),
        "notes": "效果为规则引擎自动提取，部分条目需人工确认；72-80 为游戏结束提示",
    },
    "prompts": prompts_out,
}

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(out_data, f, ensure_ascii=False, indent=1)

with open(AUDIT, 'w', encoding='utf-8') as f:
    f.write("\n".join(audit_lines))

n_eff = sum(1 for p in prompts_out for e in p['entries'] for _ in e['effects'])
n_ent = sum(1 for p in prompts_out for _ in p['entries'])
print(f"prompts={len(prompts_out)} entries={n_ent} effects={n_eff}")
print(f"written: {OUT}")
print(f"audit:   {AUDIT}")