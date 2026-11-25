# -*- coding: utf-8 -*-
"""对官方提示包效果数据进行断言验证（与规则书逐条核对后的期望）。"""
import json
import sys

PACK = r'D:\Projects\Thousand Year Old Vampire\tyov-web\src\data\official-pack.json'

KNOWN_TYPES = {
    "gameOver", "gainMemorySlot", "loseMemorySlot", "loseTwoMemories", "loseMemory",
    "restoreMemory", "memoryToSkill", "memoryToDiary", "stabilizeMemory", "swapProperNouns",
    "removeMemorySentence", "editMemory", "loseMemoryRandom", "gainSkillNamed", "gainSkill",
    "checkSkill", "checkSkill2", "checkSkill3", "checkCountSkill", "uncheckSkill", "loseSkill",
    "changeSkill", "rewriteSkill", "gainResourceNamed", "gainResource", "gainTwoResources",
    "gainFixedResource", "loseAllFixedResources", "loseFixedResource", "loseResource",
    "loseResource2", "loseResource3", "convertFixedResources", "degradeResource", "swapResource",
    "destroyResource", "retrieveResource", "resourceToMemory", "gainMark", "loseMark",
    "crippleMark", "createMortal", "createImmortal", "createImmortalHostile", "createCharacter",
    "killCharacter", "deleteCharacter", "killAllMortals", "mortalToHostileImmortal",
    "mortalToImmortal", "reviveCharacter", "characterToResource", "returnGhost", "dieByAge",
    "changeAllegiance", "note",
}

def types_of(entry):
    return [e["type"] for e in entry["effects"]]

def main():
    with open(PACK, encoding="utf-8") as f:
        pack = json.load(f)
    prompts = {p["number"]: p for p in pack["prompts"]}
    errors = []

    def entry(n, i):
        return prompts[n]["entries"][i - 1]

    def check(name, cond):
        if not cond:
            errors.append(name)

    # ---- 修正点断言 ----
    check("49.3 应为 gainResource 而非 gainSkill",
          types_of(entry(49, 3)) == ["gainResource"])
    check("51.3 应为 note（永不衰老），不得有 dieByAge",
          "dieByAge" not in types_of(entry(51, 3)) and "note" in types_of(entry(51, 3)))
    check("43.2 应有 swapProperNouns", "swapProperNouns" in types_of(entry(43, 2)))
    check("10.2 应含 gainResource（神器成为资源）", "gainResource" in types_of(entry(10, 2)))
    check("18.1 应同时有 loseResource 与 gainResource",
          set(types_of(entry(18, 1))) == {"loseResource", "gainResource"})
    check("25.1 应含 gainSkill", "gainSkill" in types_of(entry(25, 1)))
    check("37.1 应含 loseResource", "loseResource" in types_of(entry(37, 1)))
    check("37.2 应含 loseSkill", "loseSkill" in types_of(entry(37, 2)))
    check("52.1 应含 gainMemorySlot", "gainMemorySlot" in types_of(entry(52, 1)))
    check("12.3 应含 createMortal", "createMortal" in types_of(entry(12, 3)))
    check("14.2 应含 gainSkill", "gainSkill" in types_of(entry(14, 2)))
    check("14.3 应含 gainResource", "gainResource" in types_of(entry(14, 3)))
    check("29.2 应含 editMemory 与 gainSkill", {"editMemory", "gainSkill"} <= set(types_of(entry(29, 2))))
    check("29.3 应含 destroyResource", "destroyResource" in types_of(entry(29, 3)))
    check("42.2 应含 3 个 createMortal", types_of(entry(42, 2)).count("createMortal") == 3)
    check("45.3 应含 2 个 createMortal", types_of(entry(45, 3)).count("createMortal") == 2)
    check("60.3 应含 2 个 createCharacter", types_of(entry(60, 3)).count("createCharacter") == 2)
    check("32.2 应含 2 个 createMortal 与 loseResource", types_of(entry(32, 2)).count("createMortal") == 2 and "loseResource" in types_of(entry(32, 2)))
    check("1.3 应含 gainResource（作恶的资源）", "gainResource" in types_of(entry(1, 3)))
    check("3.3 应含 checkSkill", "checkSkill" in types_of(entry(3, 3)))
    check("8.3 应含 checkSkill", "checkSkill" in types_of(entry(8, 3)))
    check("20.3 应含 checkSkill/loseSkill/gainFixedResource",
          {"checkSkill", "loseSkill", "gainFixedResource"} <= set(types_of(entry(20, 3))))
    check("60.2 应含 killCharacter（无辜者被处死）", "killCharacter" in types_of(entry(60, 2)))
    check("35.2 应含 killCharacter（一个角色被杀）", "killCharacter" in types_of(entry(35, 2)))
    check("61.2 应含 gainMark", "gainMark" in types_of(entry(61, 2)))
    check("61.3 应含 crippleMark 与 createMortal", {"crippleMark", "createMortal"} <= set(types_of(entry(61, 3))))
    check("66.3 应含 gainMark", "gainMark" in types_of(entry(66, 3)))
    check("67.2 应含 editMemory", "editMemory" in types_of(entry(67, 2)))
    check("68.1 应含 gainResource 与 restoreMemory", {"gainResource", "restoreMemory"} <= set(types_of(entry(68, 1))))
    check("70.2 应含 loseSkill", "loseSkill" in types_of(entry(70, 2)))
    check("70.3 应含 gainResource", "gainResource" in types_of(entry(70, 3)))
    check("11.2 应含 loseMemory（失去暴力记忆）", "loseMemory" in types_of(entry(11, 2)))
    check("33.3 应含 gainResource", "gainResource" in types_of(entry(33, 3)))
    check("46.3 应含 checkSkill2 与 loseResource2", {"checkSkill2", "loseResource2"} <= set(types_of(entry(46, 3))))
    check("4.2 不应有多余的裸 gainResource", types_of(entry(4, 2)).count("gainResource") == 0)

    # ---- 全局一致性断言 ----
    unknown = set()
    diebyage_entries = []
    for p in pack["prompts"]:
        for i, e in enumerate(p["entries"], 1):
            for fx in e["effects"]:
                if fx["type"] not in KNOWN_TYPES:
                    unknown.add(fx["type"])
            if "dieByAge" in types_of(e):
                diebyage_entries.append(f"{p['number']}#{i}")
    check("不存在未知效果类型", not unknown)
    check("dieByAge 仅应出现在 21.3", diebyage_entries == ["21#3"])

    no_effect = [f"{p['number']}#{i}" for p in pack["prompts"] for i, e in enumerate(p["entries"], 1) if not e["effects"]]
    expected_no_effect = ["24#1", "32#3", "36#1", "38#3", "39#1", "39#2", "39#3", "42#3", "53#2", "56#3", "71#3"]
    check(f"无效果条目应仅为纯叙事条目 {expected_no_effect}，实际 {no_effect}", sorted(no_effect) == sorted(expected_no_effect))

    count = sum(1 for p in pack["prompts"] for e in p["entries"] for _ in e["effects"])
    print(f"prompts={len(pack['prompts'])} entries={sum(len(p['entries']) for p in pack['prompts'])} effects={count}")
    print(f"no-effect entries ({len(no_effect)}): {', '.join(no_effect)}")
    if unknown:
        print("UNKNOWN TYPES:", sorted(unknown))
    if errors:
        print(f"\nFAILED {len(errors)} assertions:")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print("\nALL ASSERTIONS PASSED")

if __name__ == "__main__":
    main()