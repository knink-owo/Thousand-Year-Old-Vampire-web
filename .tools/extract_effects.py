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
    ("gainSkill", re.compile(r'(?:创建|创造)(?:一项|一个)(?:新的)?(?:反映这一[点情况]的|关于[爱与安全和自由]的|展现你野性(?:吸血鬼)?本性|表达这一点的|让美好记忆变质的|简单而实用|简单实用|实用|当代且意想不到|与爱或信任相关)技能'), lambda m: {}),
    ("checkSkill3", re.compile(r'勾选三项技能'), lambda m: {}),
    ("checkSkill2", re.compile(r'勾选两项技能'), lambda m: {}),
    ("checkSkill", re.compile(r'(?<!取消)勾选(?:一项|一个)技能'), lambda m: {}),
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
    ("dieByAge", re.compile(r'(?<!永远不)(?:因年老|已经因年老)而死'), lambda m: {}),
    ("changeAllegiance", re.compile(r'将敌人变成朋友|将朋友变成敌人'), lambda m: {}),
]

# ---------- 人工校对覆盖表 ----------
# 自动正则提取有遗漏/误判的条目，以 "N.M"（提示.条目）为键，替换该条目的全部效果。
# 依据：《规则书全文.txt》逐条核对（2026 年人工校对）。
# 条目内容可能含重复效果（如"创建两个凡人角色"），保留重复以如实表达数量。
OVERRIDES: dict[str, list[dict]] = {
    "1.3": [{"type": "createImmortal"}, {"type": "checkSkill"}, {"type": "gainSkillNamed", "skill": "人类是牛羊"}, {"type": "killAllMortals"}, {"type": "gainResource"}],
    "3.1": [{"type": "gainResource"}, {"type": "createMortal"}],
    "3.3": [{"type": "characterToResource"}, {"type": "checkSkill"}],
    "4.2": [{"type": "checkSkill"}, {"type": "gainResourceNamed", "resource": "秘密阴谋集团"}],
    "5.1": [{"type": "checkSkill"}, {"type": "killCharacter"}, {"type": "createMortal"}],
    "6.1": [{"type": "createMortal"}],
    "6.3": [{"type": "checkSkill"}, {"type": "gainSkill"}],
    "7.1": [{"type": "gainSkill"}],
    "7.2": [{"type": "gainMark"}, {"type": "createMortal"}],
    "8.2": [{"type": "memoryToSkill"}, {"type": "gainResource"}],
    "8.3": [{"type": "gainSkillNamed", "skill": "该离开了"}, {"type": "checkSkill"}, {"type": "loseAllFixedResources"}, {"type": "createImmortalHostile"}],
    "9.1": [{"type": "gainSkill"}],
    "10.2": [{"type": "createMortal"}, {"type": "gainResource"}],
    "10.3": [{"type": "createImmortal"}, {"type": "createImmortal"}, {"type": "createCharacter"}, {"type": "gainResource"}],
    "11.2": [{"type": "loseMemory"}, {"type": "gainSkillNamed", "skill": "“我控制那野兽”"}, {"type": "rewriteSkill"}],
    "12.1": [{"type": "checkSkill"}, {"type": "gainSkill"}, {"type": "createMortal"}],
    "12.3": [{"type": "createMortal"}],
    "14.2": [{"type": "gainSkill"}],
    "14.3": [{"type": "gainResource"}],
    "15.2": [{"type": "checkSkill"}, {"type": "loseResource"}, {"type": "loseMemory"}, {"type": "gainResource"}, {"type": "gainSkill"}],
    "15.3": [{"type": "loseResource"}, {"type": "gainResource"}, {"type": "gainSkill"}, {"type": "gainMark"}],
    "16.1": [{"type": "checkSkill"}, {"type": "createMortal"}],
    "16.2": [{"type": "loseAllFixedResources"}, {"type": "gainMark"}, {"type": "gainSkill"}],
    "17.3": [{"type": "checkSkill"}, {"type": "killCharacter"}, {"type": "gainMark"}],
    "18.1": [{"type": "loseResource"}, {"type": "gainResource"}],
    "18.2": [{"type": "createMortal"}],
    "18.3": [{"type": "checkSkill"}, {"type": "checkSkill2"}, {"type": "checkSkill3"}, {"type": "loseAllFixedResources"}],
    "19.2": [{"type": "killCharacter"}],
    "20.2": [{"type": "gainFixedResource"}, {"type": "gainResource"}],
    "20.3": [{"type": "checkSkill"}, {"type": "loseSkill"}, {"type": "gainFixedResource"}],
    "22.2": [{"type": "note", "text": "若拥有日记：日记丢失，其中包含的记忆全部划掉（若无日记则失去一项资源）"}, {"type": "loseResource"}, {"type": "createCharacter"}],
    "23.1": [{"type": "gainSkill"}],
    "23.2": [{"type": "createMortal"}, {"type": "loseResource"}, {"type": "loseMemory"}],
    "25.1": [{"type": "loseResource"}, {"type": "gainSkill"}],
    "25.2": [{"type": "gainSkill"}, {"type": "loseMemory"}],
    "26.3": [{"type": "loseResource3"}, {"type": "checkSkill3"}],
    "27.3": [{"type": "gainTwoResources"}, {"type": "checkSkill"}, {"type": "gainSkill"}, {"type": "uncheckSkill"}],
    "28.2": [{"type": "checkSkill"}, {"type": "loseResource"}, {"type": "createCharacter"}],
    "28.3": [{"type": "loseMemory"}, {"type": "gainSkill"}, {"type": "gainResource"}, {"type": "createMortal"}],
    "29.2": [{"type": "editMemory"}, {"type": "gainSkill"}],
    "29.3": [{"type": "loseTwoMemories"}, {"type": "destroyResource"}, {"type": "gainSkill"}, {"type": "gainResource"}],
    "30.2": [{"type": "createCharacter"}, {"type": "loseResource"}],
    "31.2": [{"type": "createMortal"}, {"type": "gainSkill"}],
    "32.1": [{"type": "createCharacter"}, {"type": "gainSkill"}],
    "32.2": [{"type": "createMortal"}, {"type": "createMortal"}, {"type": "loseResource"}],
    "33.1": [{"type": "gainResource"}, {"type": "changeAllegiance"}],
    "33.3": [{"type": "checkSkill"}, {"type": "checkSkill2"}, {"type": "gainSkill"}, {"type": "gainResource"}],
    "34.1": [{"type": "loseMemory"}, {"type": "destroyResource"}],
    "34.2": [{"type": "killCharacter"}, {"type": "gainMark"}],
    "35.2": [{"type": "killCharacter"}],
    "35.3": [{"type": "checkSkill"}, {"type": "loseResource"}],
    "36.2": [{"type": "gainSkillNamed", "skill": "我知道什么是真的"}, {"type": "checkSkill"}, {"type": "killCharacter"}],
    "37.1": [{"type": "loseResource"}],
    "37.2": [{"type": "loseSkill"}],
    "37.3": [{"type": "destroyResource"}, {"type": "gainResource"}],
    "38.1": [{"type": "gainSkill"}, {"type": "loseMemory"}],
    "40.1": [{"type": "checkSkill"}, {"type": "gainResource"}, {"type": "createMortal"}],
    "42.2": [{"type": "createMortal"}, {"type": "createMortal"}, {"type": "createMortal"}, {"type": "gainSkill"}],
    "45.3": [{"type": "createMortal"}, {"type": "createMortal"}],
    "46.3": [{"type": "checkSkill2"}, {"type": "loseResource2"}, {"type": "loseResource"}],
    "49.3": [{"type": "gainResource"}],
    "50.1": [{"type": "gainSkill"}],
    "50.3": [{"type": "createMortal"}],
    "51.2": [{"type": "createCharacter"}, {"type": "gainResource"}],
    "51.3": [{"type": "note", "text": "该凡人角色永不因年老而死（仍算作凡人角色）"}],
    "52.1": [{"type": "gainMemorySlot"}],
    "52.3": [{"type": "gainSkill"}],
    "54.1": [{"type": "memoryToSkill"}],
    "54.2": [{"type": "editMemory"}],
    "54.3": [{"type": "destroyResource"}],
    "55.1": [{"type": "gainSkill"}],
    "55.2": [{"type": "loseResource"}, {"type": "restoreMemory"}],
    "55.3": [{"type": "destroyResource"}, {"type": "gainSkill"}],
    "57.2": [{"type": "createMortal"}, {"type": "gainResource"}],
    "58.1": [{"type": "retrieveResource"}],
    "58.2": [{"type": "restoreMemory"}, {"type": "gainResource"}],
    "59.1": [{"type": "gainSkill"}, {"type": "gainResource"}, {"type": "createMortal"}],
    "59.3": [{"type": "createImmortal"}],
    "60.2": [{"type": "gainSkillNamed", "skill": "这不关我的事"}, {"type": "createMortal"}, {"type": "killCharacter"}],
    "60.3": [{"type": "gainSkillNamed", "skill": "总有替罪羊"}, {"type": "createCharacter"}, {"type": "createCharacter"}],
    "61.2": [{"type": "gainMark"}],
    "61.3": [{"type": "crippleMark"}, {"type": "createMortal"}],
    "64.2": [{"type": "checkSkill"}, {"type": "gainSkill"}, {"type": "createCharacter"}],
    "66.3": [{"type": "gainMark"}],
    "67.1": [{"type": "createCharacter"}, {"type": "gainSkill"}],
    "67.2": [{"type": "editMemory"}, {"type": "checkSkill"}, {"type": "gainSkill"}],
    "67.3": [{"type": "gainSkill"}],
    "68.1": [{"type": "checkSkill"}, {"type": "loseResource"}, {"type": "gainResource"}, {"type": "restoreMemory"}],
    "69.1": [{"type": "checkSkill"}, {"type": "loseResource"}, {"type": "gainResource"}],
    "69.2": [{"type": "gainSkill"}],
    "70.2": [{"type": "editMemory"}, {"type": "loseSkill"}],
    "70.3": [{"type": "loseMemory"}, {"type": "loseResource2"}, {"type": "gainResource"}],
}

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
        key = f"{n}.{i+1}"
        effects = OVERRIDES[key] if key in OVERRIDES else extract_effects(txt)
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
        "notes": "效果由规则引擎自动提取，并经人工逐条校对（部分条目有人工覆盖）；72-80 为游戏结束提示",
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