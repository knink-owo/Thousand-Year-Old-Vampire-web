/**
 * 《千年吸血鬼》核心引擎（纯函数）
 * 规则来源：规则书中文翻译版 ver 1.04
 *  - 回答提示后掷 D10 与 D6，用 D10 结果减去 D6 结果：
 *      正数 → 向后移动相应数量的提示；负数 → 向前移动；0 → 再次遇到相同提示
 *  - 不能移动到提示 1 之前，只是再次触发提示 1
 *  - 提示有第 2/3 条目，第二、三次到达时触发；全部回应后跳到下一个提示
 *  - 技能/资源替代规则：无法勾选技能 → 失去资源；无法失去资源 → 勾选技能；都没有 → 游戏结束
 *  - 游戏结束：无法勾选技能或失去资源时，或提示指示游戏结束
 */
import type { GameState, Prompt, PromptPack } from '../types/game';

/** 掷骰结果与移动 */
export interface MoveResult {
  d10: number;
  d6: number;
  delta: number;          // d10 - d6
  from: number;
  to: number;             // 移动后的提示编号
  repeats: boolean;       // delta === 0（再次遇到相同提示）
  hitFloor: boolean;      // 尝试移出 1 之前，回弹到 1
}

/** 掷 D10 与 D6，计算新的提示位置 */
export function rollMove(
  current: number,
  promptCount: number,
  rng: () => number = Math.random,
): MoveResult {
  const d10 = 1 + Math.floor(rng() * 10);
  const d6 = 1 + Math.floor(rng() * 6);
  const delta = d10 - d6;
  let to = current + delta;
  let hitFloor = false;
  if (to < 1) {
    hitFloor = true;
    to = 1;
  }
  if (to > promptCount) to = promptCount;
  return { d10, d6, delta, from: current, to, repeats: delta === 0, hitFloor };
}

/**
 * 获取当前应使用的条目序号（1..3）：
 *  - visits 为该提示已进入的次数。
 *  - 第 1 次进入用条目 1，第 2 次用条目 2，第 3 次用条目 3。
 *  - 如果提示只有 1 个条目（如 72-80），永远使用条目 1。
 */
export function entryIndexFor(prompt: Prompt, visits: number): number {
  if (prompt.entries.length <= 1) return 1;
  return Math.min(visits + 1, prompt.entries.length);
}

/**
 * 完成当前提示后的推进：
 *  - 返回本轮应使用的条目序号（基于当前 promptVisits）
 *  - 若该提示条目已全部回应完（visits+1 >= entries.length），跳到下一个提示（+1，但不越过提示总数）
 *  - 返回新提示号与新 visits，由 store 写入状态
 */
export function advancePrompt(
  state: GameState,
  pack: PromptPack,
): { nextNumber: number; entryIndex: number; newVisits: number } {
  const prompt = pack.prompts.find(p => p.number === state.currentPromptNumber);
  if (!prompt) return { nextNumber: 1, entryIndex: 1, newVisits: 1 };
  const visits = state.promptVisits[prompt.number] ?? 0;
  const idx = entryIndexFor(prompt, visits);
  const newVisits = visits + 1;
  let nextNumber = state.currentPromptNumber;
  if (newVisits >= prompt.entries.length) {
    nextNumber = Math.min(prompt.number + 1, pack.prompts.length);
  }
  return { nextNumber, entryIndex: idx, newVisits };
}

/** 是否还有可用的技能（未失去的） */
export function hasAvailableSkill(state: GameState): boolean {
  return state.skills.some(s => !s.lost);
}

/** 是否还有可勾选的技能（未勾选且未失去） */
export function hasCheckableSkill(state: GameState): boolean {
  return state.skills.some(s => !s.checked && !s.lost);
}

/** 是否还有可失去的资源（未失去的） */
export function hasLosableResource(state: GameState): boolean {
  return state.resources.some(r => !r.lost);
}

/**
 * 技能/资源替代检查（规则书"游玩游戏"节）：
 * 提示指示勾选技能但无技能可勾选 → 失去一项资源
 * 提示指示失去资源但无法这样做 → 勾选一项技能
 * 两者都无法做到 → 游戏结束
 */
export function checkAlternative(
  state: GameState,
  intent: 'checkSkill' | 'loseResource',
): { outcome: 'ok' | 'alternative' | 'gameOver'; reason?: string } {
  if (intent === 'checkSkill') {
    if (hasCheckableSkill(state)) return { outcome: 'ok' };
    if (hasLosableResource(state)) return { outcome: 'alternative', reason: '无技能可勾选，改为失去一项资源' };
    return { outcome: 'gameOver', reason: '必须勾选技能或失去资源，但你两者都没有——游戏结束' };
  }
  // loseResource
  if (hasLosableResource(state)) return { outcome: 'ok' };
  if (hasCheckableSkill(state)) return { outcome: 'alternative', reason: '无资源可失去，改为勾选一项技能' };
  return { outcome: 'gameOver', reason: '必须失去资源或勾选技能，但你两者都没有——游戏结束' };
}

/**
 * 检查提示条目是否触发游戏结束（效果列表含 gameOver 或文本含"游戏结束"）
 */
export function entryCausesGameOver(prompt: Prompt, entryIndex: number): boolean {
  const entry = prompt.entries[entryIndex - 1];
  if (!entry) return false;
  return entry.effects.some(e => e.type === 'gameOver') || entry.text.includes('游戏结束');
}

/** 读取提示已触发次数 */
export function visitsOf(state: GameState, promptNumber: number): number {
  return state.promptVisits[promptNumber] ?? 0;
}

/** 新游戏初始化：默认创建函数由 store 调用，这里只导出常量 */
export const DEFAULT_MEMORY_SLOTS = 5;
export const MAX_EXPERIENCES_PER_MEMORY = 3;
export const MAX_MEMORIES_PER_DIARY = 4;

/** 记忆槽是否已满（考虑已移入日记或已稳定化的记忆不占槽） */
export function usedMemorySlots(state: GameState): number {
  return state.memories.filter(m => !m.inDiary && !m.stabilized).length;
}

/**
 * 添加经历时的记忆放置决策：
 *  - 若某段记忆（不在日记中）与主题相关且未满 3 条 → 放入
 *  - 否则若有空槽 → 新建记忆
 *  - 否则玩家必须选择：遗忘一段旧记忆 或 移入日记（若有日记实体）
 * 返回决策结构，由 UI/store 交互完成。
 */
export function placeExperienceDecision(
  state: GameState,
  _experienceText: string,
): {
  decision: 'append' | 'new' | 'mustForget';
  candidates: string[];   // memory ids 可附加
  freeSlots: number;
} {
  const freeSlots = state.memorySlots - usedMemorySlots(state);
  const appendable = state.memories.filter(m => !m.inDiary && !m.stabilized && m.experiences.length < MAX_EXPERIENCES_PER_MEMORY);
  if (appendable.length > 0) {
    return { decision: 'append', candidates: appendable.map(m => m.id), freeSlots };
  }
  if (freeSlots > 0) {
    return { decision: 'new', candidates: [], freeSlots };
  }
  return { decision: 'mustForget', candidates: appendable.map(m => m.id), freeSlots };
}