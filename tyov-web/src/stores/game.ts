/**
 * 游戏状态 store：回合流程 + 特征管理 + 存档
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { GameState, PromptPack, DiaryEntry, Memory, Experience, Effect, Resource, GameRecord } from '../types/game';
import { officialPack, findPrompt } from '../engine/packLoader';
import {
  rollMove, advancePrompt, checkAlternative, entryCausesGameOver, visitsOf,
  entryIndexFor, placeExperienceDecision,
  DEFAULT_MEMORY_SLOTS, MAX_EXPERIENCES_PER_MEMORY, MAX_MEMORIES_PER_DIARY, usedMemorySlots,
} from '../engine/core';

const SAVE_KEY = 'tyov:save:v1';
const PACK_KEY = 'tyov:pack:v1';
const HISTORY_KEY = 'tyov:history:v1';
const MAX_HISTORY = 20;

let idCounter = 0;
function uid(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 创建空游戏 */
export function createEmptyGame(name: string, usesFastMode: boolean): GameState {
  const now = Date.now();
  return {
    id: uid(),
    name,
    createdAt: now,
    updatedAt: now,
    memories: [],
    memorySlots: DEFAULT_MEMORY_SLOTS,
    skills: [],
    resources: [],
    characters: [],
    marks: [],
    currentPromptNumber: 1,
    promptVisits: {},
    usesFastMode,
    diaries: [],
    log: [],
    started: false,
    finished: false,
    moves: 0,
  };
}

function logText(kind: GameState['log'][number]['kind'], text: string, atPrompt: number): GameState['log'][number] {
  return { id: uid(), kind, text, atPrompt, createdAt: Date.now() };
}

export const useGameStore = defineStore('game', () => {
  const pack = ref<PromptPack>(loadPack());
  const state = ref<GameState | null>(null);

  const currentPrompt = computed(() => {
    if (!state.value) return undefined;
    return findPrompt(pack.value, state.value.currentPromptNumber);
  });
  const currentEntryIndex = computed(() => {
    const s = state.value;
    const p = currentPrompt.value;
    if (!s || !p) return 1;
    return entryIndexFor(p, visitsOf(s, p.number));
  });
  const currentEntryText = computed(() => currentPrompt.value?.entries[currentEntryIndex.value - 1]?.text ?? '');
  const storageUsed = computed(() => usedMemorySlots(state.value!));

  // ---------- 存档 ----------
  function persist() {
    if (state.value) {
      state.value.updatedAt = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state.value));
      touchRecord();
    }
  }
  function loadPack(): PromptPack {
    try {
      const raw = localStorage.getItem(PACK_KEY);
      if (raw) {
        const p = JSON.parse(raw) as PromptPack;
        if (p?.prompts?.length) return p;
      }
    } catch { /* ignore */ }
    return officialPack;
  }
  function savePack() {
    localStorage.setItem(PACK_KEY, JSON.stringify(pack.value));
  }
  function loadSavedGame(): GameState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const g = JSON.parse(raw) as GameState;
      if (g?.id) return g;
    } catch { /* ignore */ }
    return null;
  }

  // ---------- 历史记录 ----------
  const records = ref<GameRecord[]>(loadHistory());

  function loadHistory(): GameRecord[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw) as GameRecord[];
      if (Array.isArray(list)) return list;
    } catch { /* ignore */ }
    return [];
  }
  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(records.value.slice(0, MAX_HISTORY)));
    } catch { /* ignore */ }
  }
  /** 从当前游戏状态生成摘要快照 */
  function snapshotRecord(s: GameState): GameRecord {
    return {
      id: s.id,
      name: s.name,
      createdAt: s.createdAt,
      finished: s.finished,
      finishReason: s.finishReason,
      finishedAt: s.finished ? Date.now() : undefined,
      moves: s.moves,
      currentPrompt: s.currentPromptNumber,
      memoryCount: s.memories.filter(m => !m.forgotten).length,
      skillCount: s.skills.filter(x => !x.lost).length,
      resourceCount: s.resources.filter(r => !r.lost).length,
    };
  }
  /** 登记/更新一条历史记录（新游戏登记、进度变化或结束更新） */
  function touchRecord() {
    const s = state.value;
    if (!s) return;
    const rec = snapshotRecord(s);
    const idx = records.value.findIndex(r => r.id === s.id);
    if (idx >= 0) records.value[idx] = rec;
    else records.value.unshift(rec);
    saveHistory();
  }
  function removeRecord(id: string) {
    records.value = records.value.filter(r => r.id !== id);
    saveHistory();
  }
  function clearRecords() {
    records.value = [];
    saveHistory();
  }

  // ---------- 回合流程 ----------
  function startGame(g: GameState) {
    state.value = g;
    state.value.started = true;
    state.value.log.push(logText('system', `旅程开始。${g.name} 醒来，千年岁月自此展开。`, 1));
    persist();
  }

  /** 点击"回答提示完成"：写入经历/日记 → 推进提示（根据最终掷骰） */
  function completeTurn(diaryContent: string | null): { roll: { d10: number; d6: number; delta: number; to: number }; nextNumber: number; entryIndex: number } {
    const s = state.value;
    const p = currentPrompt.value;
    if (!s || !p) throw new Error('没有进行中的游戏');
    const epIdx = visitsOf(s, p.number) + 1; // 本轮条目 1..n
    const entry = p.entries[epIdx - 1];
    if (!entry) throw new Error('提示条目缺失');

    // 1) 每次回答提示都必须创建经历
    //    （除非提示明确说"不要为此提示创建新的经历"，由 UI 控制 bypassExperience）
    // 2) 日志游戏：附加日记条目
    if (diaryContent && diaryContent.trim() && !s.usesFastMode) {
      const de: DiaryEntry = {
        id: uid(),
        promptNumber: p.number,
        entryIndex: epIdx,
        promptText: entry.text,
        content: diaryContent.trim(),
        createdAt: Date.now(),
      };
      s.diaries.push(de);
      s.log.push(logText('diary', `提示${p.number}（第${epIdx}次）：${de.content.slice(0, 60)}${de.content.length > 60 ? '…' : ''}`, p.number));
    }

    // 3) 掷骰移动
    const roll = rollMove(p.number, pack.value.prompts.length);
    const adv = advancePrompt(s, pack.value);
    s.promptVisits[p.number] = adv.newVisits;
    s.moves += 1;

    if (entryCausesGameOver(p, epIdx) || checkAlternativeIfNeeded(s, entry)) {
      s.finished = true;
      s.finishReason = '你的故事到此为止。提示宣告了终结。';
      s.log.push(logText('system', '游戏结束。', p.number));
    } else {
      // 条目用尽则强制前进到下一提示（即便骰子移回）；否则按骰子移动
      const entriesExhausted = adv.nextNumber !== p.number;
      s.currentPromptNumber = entriesExhausted ? adv.nextNumber : roll.to;
      s.log.push(
        logText('system',
          entriesExhausted
            ? `提示${p.number}的所有条目都已回应，前往提示${adv.nextNumber}。`
            : `回答提示${p.number}后掷骰：D10=${roll.d10}，D6=${roll.d6}，差=${roll.delta}${roll.repeats ? '（再次遇到相同提示）' : roll.hitFloor ? '（抵达提示 1）' : ''} → 前往提示${roll.to}`,
          p.number),
      );
    }
    persist();
    return { roll, nextNumber: adv.nextNumber, entryIndex: epIdx };
  }

  /** 若条目效果含勾选技能/失去资源/失去技能，做替代检查；任一无法完成即游戏结束 */
  function checkAlternativeIfNeeded(s: GameState, entry: { effects: Effect[] }): boolean {
    for (const e of entry.effects) {
      if (e.type === 'checkSkill' || e.type === 'checkSkill2' || e.type === 'checkSkill3') {
        if (checkAlternative(s, 'checkSkill').outcome === 'gameOver') return true;
      }
      if (e.type === 'loseSkill') {
        if (checkAlternative(s, 'loseSkill').outcome === 'gameOver') return true;
      }
      if (e.type === 'loseResource' || e.type === 'loseResource2' || e.type === 'loseResource3' || e.type === 'loseAllFixedResources' || e.type === 'loseFixedResource') {
        if (checkAlternative(s, 'loseResource').outcome === 'gameOver') return true;
      }
    }
    return false;
  }

  // ---------- 特征操作（均由 UI 调用，执行后自动存档） ----------
  /**
   * 添加经历：
   *  - memoryId 提供 → 追加到该记忆（须未入日记/未恒存/未遗忘且未满 3 条）
   *  - memoryId 为空 → 新建一段记忆（须有空槽）
   *  - 两路皆不可行 → 返回 mustForget，不写入任何数据（玩家须先遗忘或移入日记）
   */
  function addExperience(memoryId: string | null, text: string, promptNumber: number, promptEntry: number): { status: 'appended' | 'created' | 'mustForget' } {
    const s = state.value!;
    const exp: Experience = { id: uid(), text, promptNumber, promptEntry, createdAt: Date.now() };
    if (memoryId) {
      const m = s.memories.find(x => x.id === memoryId);
      if (m && !m.inDiary && !m.stabilized && !m.forgotten && m.experiences.length < MAX_EXPERIENCES_PER_MEMORY) {
        m.experiences.push(exp);
        s.log.push(logText('memory', `经历沉淀进记忆「${m.title ?? '未命名'}」。`, promptNumber));
        persist();
        return { status: 'appended' };
      }
    }
    const placement = placeExperienceDecision(s);
    if (placement.canCreateNew) {
      const m: Memory = { id: uid(), experiences: [exp], inDiary: false, stabilized: false };
      s.memories.push(m);
      s.log.push(logText('memory', '一段新的记忆成形。', promptNumber));
      persist();
      return { status: 'created' };
    }
    if (placement.appendable.length > 0) {
      // 兜底：指定的记忆不可用但有可追加记忆时，追加到第一段，避免经历无处安放
      const m = s.memories.find(x => x.id === placement.appendable[0])!;
      m.experiences.push(exp);
      s.log.push(logText('memory', `经历沉淀进记忆「${m.title ?? '未命名'}」。`, promptNumber));
      persist();
      return { status: 'appended' };
    }
    // 记忆已满且无可追加 → 必须遗忘/入日记后方可放置
    return { status: 'mustForget' };
  }

  /** 遗忘一段记忆（划掉）——已恒存（星号）或已入日记的记忆不能直接遗忘 */
  function forgetMemory(memoryId: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || m.stabilized || m.inDiary) return;
    m.forgotten = true;
    s.log.push(logText('memory', `一段记忆被划掉——${m.title ?? '未命名的过往'}永远逝去。`, s.currentPromptNumber));
    persist();
  }

  /** 为一段记忆命名（规则书：记忆通过主题定义；便于记录与识别） */
  function renameMemory(memoryId: string, title: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || m.stabilized) return;
    m.title = title.trim() || undefined;
    s.log.push(logText('memory', m.title ? `记忆被命名为「${m.title}」。` : '一段记忆的名字被抹去。', s.currentPromptNumber));
    persist();
  }

  /** 记忆画星号（恒存）：永不丢失、不再更改，也不再占用记忆槽（提示33第2条目） */
  function stabilizeMemory(memoryId: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || m.inDiary || m.forgotten) return;
    m.stabilized = true;
    s.log.push(logText('memory', `一段记忆被画上星号——「${m.title ?? '未命名'}」从此恒存，不再占用记忆槽。`, s.currentPromptNumber));
    persist();
  }

  /** 恢复一段被遗忘的记忆（提示31第3条目等） */
  function restoreMemory(memoryId: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || !m.forgotten) return;
    m.forgotten = false;
    s.log.push(logText('memory', `一段被遗忘的记忆重新浮现——「${m.title ?? '未命名'}」。`, s.currentPromptNumber));
    persist();
  }

  /** 删除一条经历（提示24第2条目"删去第一句话"等文本级修改的载体） */
  function removeExperience(experienceId: string) {
    const s = state.value!;
    for (const m of s.memories) {
      const idx = m.experiences.findIndex(x => x.id === experienceId);
      if (idx >= 0) {
        const [removed] = m.experiences.splice(idx, 1);
        s.log.push(logText('memory', `一段经历被抹去——${removed.text.slice(0, 24)}…`, s.currentPromptNumber));
        persist();
        return;
      }
    }
  }

  /** 编辑一条经历的文本 */
  function editExperience(experienceId: string, text: string) {
    const s = state.value!;
    for (const m of s.memories) {
      const ex = m.experiences.find(x => x.id === experienceId);
      if (ex) {
        ex.text = text;
        s.log.push(logText('memory', `经历被改写。`, s.currentPromptNumber));
        persist();
        return;
      }
    }
  }

  /** 随机失去一段经历（提示51第1条目）：从记忆列表中间的记忆里随机划去一条经历（保留可读，不再消失） */
  function randomLoseExperience() {
    const s = state.value!;
    const candidates = s.memories.filter(m => !m.forgotten && m.experiences.some(x => !x.lost));
    if (candidates.length === 0) return;
    const mid = candidates[Math.floor(candidates.length / 2)]; // "列表中间的记忆"
    const pool = mid.experiences.filter(x => !x.lost);
    const ex = pool[Math.floor(Math.random() * pool.length)];
    ex.lost = true;
    s.log.push(logText('memory', `一段经历被命运划去——${ex.text.slice(0, 24)}${ex.text.length > 24 ? '…' : ''}`, s.currentPromptNumber));
    persist();
  }

  /** 恢复一段被划去的经历 */
  function restoreExperience(experienceId: string) {
    const s = state.value!;
    for (const m of s.memories) {
      const ex = m.experiences.find(x => x.id === experienceId);
      if (ex && ex.lost) {
        ex.lost = false;
        s.log.push(logText('memory', '一段被划去的经历重新被记起。', s.currentPromptNumber));
        persist();
        return;
      }
    }
  }

  /** 永久失去/获得一个记忆槽（提示22第3条目、41第1条目、52第1条目） */
  function changeMemorySlots(delta: number) {
    const s = state.value!;
    const next = Math.max(1, s.memorySlots + delta);
    if (next === s.memorySlots) return;
    s.memorySlots = next;
    s.log.push(logText('memory', delta > 0 ? `记忆槽增加，现有 ${next} 个记忆槽。` : `身体离人类更远——记忆槽永久减少为 ${next} 个。`, s.currentPromptNumber));
    persist();
  }

  /** 记忆移入日记（创建日记资源或使用现有）——已恒存的记忆保持原位 */
  function moveMemoryToDiary(memoryId: string, diaryName?: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || m.inDiary || m.stabilized || m.forgotten) return;
    const diaryCapacity = MAX_MEMORIES_PER_DIARY;
    const inDiary = s.memories.filter(x => x.inDiary).length;
    if (inDiary >= diaryCapacity) return;
    if (!s.diaryResourceId) {
      const res: Resource = { id: uid(), name: diaryName || '一本结实的皮革装订书', fixed: false, lost: false, isDiary: true };
      s.resources.push(res);
      s.diaryResourceId = res.id;
    }
    m.inDiary = true;
    s.log.push(logText('memory', `记忆「${m.title ?? '未命名'}」被写入日记，不再占用记忆槽。`, s.currentPromptNumber));
    persist();
  }

  function addSkill(name: string, description?: string) {
    const s = state.value!;
    s.skills.push({ id: uid(), name, description, checked: false, lost: false });
    s.log.push(logText('skill', `获得技能：${name}`, s.currentPromptNumber));
    persist();
  }
  function checkSkill(id: string) {
    const s = state.value!;
    const sk = s.skills.find(x => x.id === id);
    if (!sk || sk.checked || sk.lost) return;
    sk.checked = true;
    s.log.push(logText('skill', `勾选技能：${sk.name}（它已被使用过了）`, s.currentPromptNumber));
    persist();
  }
  function uncheckSkill(id: string) {
    const s = state.value!;
    const sk = s.skills.find(x => x.id === id);
    if (sk && sk.checked && !sk.lost) {
      sk.checked = false;
      persist();
    }
  }
  function loseSkill(id: string) {
    const s = state.value!;
    const sk = s.skills.find(x => x.id === id);
    if (!sk || sk.lost) return;
    sk.lost = true;
    s.log.push(logText('skill', `技能消失：${sk.name}`, s.currentPromptNumber));
    persist();
  }
  /** 重写/更改技能（提示11第2条目重写未勾选；62第1条目更改任意技能） */
  function rewriteSkill(id: string, newName: string) {
    const s = state.value!;
    const sk = s.skills.find(x => x.id === id);
    if (!sk || sk.lost || !newName.trim()) return;
    sk.name = newName.trim();
    s.log.push(logText('skill', `技能被重塑为：${sk.name}`, s.currentPromptNumber));
    persist();
  }
  /** 将一段记忆转化为技能：划掉记忆、获得技能（提示8第2条目、54第1条目） */
  function memoryToSkill(memoryId: string, skillName: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || m.stabilized || m.inDiary) return;
    m.forgotten = true;
    addSkill(skillName.trim() || m.title || '来自记忆的技能');
    s.log.push(logText('memory', `记忆「${m.title ?? '未命名'}」被转化为技能，不再占用记忆槽。`, s.currentPromptNumber));
    persist();
  }

  function addResource(name: string, description?: string, fixed = false) {
    const s = state.value!;
    s.resources.push({ id: uid(), name, description, fixed, lost: false, isDiary: false });
    s.log.push(logText('resource', `获得资源：${name}${fixed ? '（固定）' : ''}`, s.currentPromptNumber));
    persist();
  }
  function loseResource(id: string) {
    const s = state.value!;
    const r = s.resources.find(x => x.id === id);
    if (!r || r.lost) return;
    r.lost = true;
    // 日记丢失 → 其中包含的记忆一并划掉（规则书"日记"节），并解除"已入日记"状态
    if (r.isDiary) {
      for (const m of s.memories) {
        if (m.inDiary) {
          m.inDiary = false;
          m.forgotten = true;
        }
      }
      s.diaryResourceId = undefined;
      s.log.push(logText('resource', `日记「${r.name}」丢失或毁灭——写于其中的记忆随之被划掉。`, s.currentPromptNumber));
    } else {
      s.log.push(logText('resource', `失去资源：${r.name}`, s.currentPromptNumber));
    }
    persist();
  }
  /** 降级为废墟（提示2第3条目）：资源仍在，但化为废墟 */
  function degradeResource(id: string) {
    const s = state.value!;
    const r = s.resources.find(x => x.id === id);
    if (!r || r.lost) return;
    r.name = `${r.name}（已成废墟）`;
    r.fixed = true;
    s.log.push(logText('resource', `资源被降级为废墟：${r.name}`, s.currentPromptNumber));
    persist();
  }
  /** 找回一项失去的资源（提示65第2条目、58第1条目等） */
  function retrieveResource(id: string) {
    const s = state.value!;
    const r = s.resources.find(x => x.id === id);
    if (!r || !r.lost) return;
    r.lost = false;
    s.log.push(logText('resource', `失而复得：${r.name}`, s.currentPromptNumber));
    persist();
  }
  /** 固定资源转为便携现金/财宝（提示46第1条目） */
  function convertFixedResource(id: string, newName?: string) {
    const s = state.value!;
    const r = s.resources.find(x => x.id === id);
    if (!r || r.lost || !r.fixed) return;
    r.fixed = false;
    if (newName?.trim()) r.name = newName.trim();
    s.log.push(logText('resource', `固定资源转为便携财宝：${r.name}`, s.currentPromptNumber));
    persist();
  }
  /** 用一件资源换取一项新资源（提示65第1条目等） */
  function swapResource(id: string, newName: string) {
    const s = state.value!;
    const r = s.resources.find(x => x.id === id);
    if (!r || r.lost || !newName.trim()) return;
    r.lost = true;
    addResource(newName.trim());
    s.log.push(logText('resource', `用${r.name}换取了${newName.trim()}。`, s.currentPromptNumber));
    persist();
  }
  /** 资源改名（如日记的描述） */
  function renameResource(id: string, newName: string) {
    const s = state.value!;
    const r = s.resources.find(x => x.id === id);
    if (!r || !newName.trim()) return;
    r.name = newName.trim();
    persist();
  }

  function addCharacter(name: string, description: string, immortal: boolean) {
    const s = state.value!;
    s.characters.push({ id: uid(), name, description, immortal, dead: false });
    s.log.push(logText('character', `${immortal ? '不朽者' : '凡人'}登场：${name}`, s.currentPromptNumber));
    persist();
  }
  function killCharacter(id: string) {
    const s = state.value!;
    const c = s.characters.find(x => x.id === id);
    if (!c || c.dead) return;
    c.dead = true;
    s.log.push(logText('character', `${c.name} 死了。`, s.currentPromptNumber));
    persist();
  }
  /** 带回一个最近划掉的凡人角色（提示48第2条目） */
  function reviveCharacter(id: string) {
    const s = state.value!;
    const c = s.characters.find(x => x.id === id);
    if (!c || !c.dead) return;
    c.dead = false;
    c.isGhost = false;
    s.log.push(logText('character', `${c.name} 不可思议地活了下来。`, s.currentPromptNumber));
    persist();
  }
  /** 亡者以幽灵归来（提示41第3条目） */
  function returnGhost(id: string) {
    const s = state.value!;
    const c = s.characters.find(x => x.id === id);
    if (!c || !c.dead) return;
    c.dead = false;
    c.isGhost = true;
    s.log.push(logText('character', `${c.name} 的幽灵缠绕着你。`, s.currentPromptNumber));
    persist();
  }
  /** 角色转为资源（提示3第3条目） */
  function characterToResource(id: string, resourceName?: string) {
    const s = state.value!;
    const c = s.characters.find(x => x.id === id);
    if (!c || c.dead) return;
    addResource(resourceName?.trim() || `${c.name}（被转化）`);
    killCharacter(id);
  }
  /** 凡人转化为不朽者（提示1第2条目、26第1条目等） */
  function mortalToImmortal(id: string) {
    const s = state.value!;
    const c = s.characters.find(x => x.id === id);
    if (!c || c.dead || c.immortal) return;
    c.immortal = true;
    s.log.push(logText('character', `${c.name} 不再老去——成为了不朽者。`, s.currentPromptNumber));
    persist();
  }

  function addMark(name: string, description?: string) {
    const s = state.value!;
    s.marks.push({ id: uid(), name, description, removed: false });
    s.log.push(logText('mark', `印记显现：${name}`, s.currentPromptNumber));
    persist();
  }
  function removeMark(id: string) {
    const s = state.value!;
    const m = s.marks.find(x => x.id === id);
    if (m && !m.removed) {
      m.removed = true;
      persist();
    }
  }
  /** 印记变为失能（提示61第3条目）：必须寻求凡人的帮助 */
  function crippleMark(id: string) {
    const s = state.value!;
    const m = s.marks.find(x => x.id === id);
    if (!m || m.removed || m.crippled) return;
    m.crippled = true;
    s.log.push(logText('mark', `印记「${m.name}」失能——身体已然衰老，你必须寻求凡人的帮助。`, s.currentPromptNumber));
    persist();
  }

  /** 自愿结束游戏（提示69第3条目"如果合适，你可以现在结束游戏"） */
  function endGame(reason: string) {
    const s = state.value!;
    if (!s || s.finished) return;
    s.finished = true;
    s.finishReason = reason || '你选择在此终结自己的千年。';
    s.log.push(logText('system', '游戏结束。', s.currentPromptNumber));
    persist();
  }

  // ---------- 导入导出 ----------
  function exportGameJson(): string {
    return JSON.stringify(state.value, null, 2);
  }
  function importGameJson(json: string): boolean {
    try {
      const g = JSON.parse(json) as GameState;
      if (!g?.id || !Array.isArray(g.memories)) return false;
      state.value = g;
      persist();
      return true;
    } catch { return false; }
  }
  function exportDiaryMarkdown(): string {
    const s = state.value;
    if (!s) return '';
    const lines: string[] = [];
    lines.push(`# ${s.name} 的日记`);
    lines.push('');
    for (const d of s.diaries) {
      lines.push(`## 提示 ${d.promptNumber}·第${d.entryIndex}次触达`);
      lines.push(`> ${d.promptText}`);
      lines.push('');
      lines.push(d.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
    return lines.join('\n');
  }
  function exportPackJson(): string {
    return JSON.stringify(pack.value, null, 2);
  }
  function importPackJson(json: string): boolean {
    try {
      const p = JSON.parse(json) as PromptPack;
      if (!p?.prompts?.length || !Array.isArray(p.prompts)) return false;
      pack.value = p;
      savePack();
      return true;
    } catch { return false; }
  }

  function newGame(name: string, fast: boolean) {
    state.value = createEmptyGame(name, fast);
    startGame(state.value);
  }

  // ---------- 启动时恢复 ----------
  const saved = loadSavedGame();
  if (saved) state.value = saved;

  return {
    pack, state, currentPrompt, currentEntryIndex, currentEntryText, storageUsed,
    records, removeRecord, clearRecords,
    startGame, completeTurn, newGame,
    addExperience, forgetMemory, renameMemory, stabilizeMemory, restoreMemory,
    removeExperience, editExperience, randomLoseExperience, restoreExperience, changeMemorySlots,
    moveMemoryToDiary,
    addSkill, checkSkill, uncheckSkill, loseSkill, rewriteSkill, memoryToSkill,
    addResource, loseResource, degradeResource, retrieveResource, convertFixedResource, swapResource, renameResource,
    addCharacter, killCharacter, reviveCharacter, returnGhost, characterToResource, mortalToImmortal,
    addMark, removeMark, crippleMark,
    endGame,
    exportGameJson, importGameJson, exportDiaryMarkdown, exportPackJson, importPackJson,
    persist,
  };
});

export type GameStore = ReturnType<typeof useGameStore>;