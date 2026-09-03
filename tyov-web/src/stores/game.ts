/**
 * 游戏状态 store：回合流程 + 特征管理 + 存档
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { GameState, PromptPack, DiaryEntry, Memory, Experience, Effect, Resource } from '../types/game';
import { officialPack, findPrompt } from '../engine/packLoader';
import {
  rollMove, advancePrompt, checkAlternative, entryCausesGameOver, visitsOf,
  entryIndexFor, placeExperienceDecision,
  DEFAULT_MEMORY_SLOTS, MAX_EXPERIENCES_PER_MEMORY, MAX_MEMORIES_PER_DIARY, usedMemorySlots,
} from '../engine/core';

const SAVE_KEY = 'tyov:save:v1';
const PACK_KEY = 'tyov:pack:v1';

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

  /** 若条目效果含勾选技能/失去资源，做替代检查；任一无法完成即游戏结束 */
  function checkAlternativeIfNeeded(s: GameState, entry: { effects: Effect[] }): boolean {
    for (const e of entry.effects) {
      if (e.type === 'checkSkill' || e.type === 'checkSkill2' || e.type === 'checkSkill3' || e.type === 'uncheckSkill' || e.type === 'loseSkill') {
        if (checkAlternative(s, 'checkSkill').outcome === 'gameOver') return true;
      }
      if (e.type === 'loseResource' || e.type === 'loseResource2' || e.type === 'loseResource3' || e.type === 'loseAllFixedResources' || e.type === 'loseFixedResource') {
        if (checkAlternative(s, 'loseResource').outcome === 'gameOver') return true;
      }
    }
    return false;
  }

  // ---------- 特征操作（均由 UI 调用，执行后自动存档） ----------
  function addExperience(memoryId: string | null, text: string, promptNumber: number, promptEntry: number) {
    const s = state.value!;
    const exp: Experience = { id: uid(), text, promptNumber, promptEntry, createdAt: Date.now() };
    const decision = placeExperienceDecision(s, text);
    if (memoryId) {
      const m = s.memories.find(x => x.id === memoryId);
      if (m && !m.inDiary && m.experiences.length < MAX_EXPERIENCES_PER_MEMORY) {
        m.experiences.push(exp);
        s.log.push(logText('memory', `经历沉淀进记忆「${m.title ?? '未命名'}」。`, promptNumber));
        persist();
        return;
      }
    }
    if (decision.decision === 'new' || !memoryId) {
      const m: Memory = { id: uid(), experiences: [exp], inDiary: false, stabilized: false };
      s.memories.push(m);
      s.log.push(logText('memory', '一段新的记忆成形。', promptNumber));
      persist();
    }
    // mustForget 分支由 UI 流程处理（选择遗忘或入日记）
    persist();
  }

  /** 遗忘一段记忆（划掉） */
  function forgetMemory(memoryId: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m) return;
    m.inDiary = false; // 划掉
    m.stabilized = false;
    m.forgotten = true;
    s.log.push(logText('memory', `一段记忆被划掉——${m.title ?? '未命名的过往'}永远逝去。`, s.currentPromptNumber));
    persist();
  }

  /** 记忆移入日记（创建日记资源或使用现有） */
  function moveMemoryToDiary(memoryId: string, diaryName?: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || m.inDiary) return;
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
    s.log.push(logText('resource', `失去资源：${r.name}`, s.currentPromptNumber));
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
    startGame, completeTurn, newGame,
    addExperience, forgetMemory, moveMemoryToDiary,
    addSkill, checkSkill, uncheckSkill, loseSkill,
    addResource, loseResource,
    addCharacter, killCharacter,
    addMark, removeMark,
    exportGameJson, importGameJson, exportDiaryMarkdown, exportPackJson, importPackJson,
    persist,
  };
});

export type GameStore = ReturnType<typeof useGameStore>;