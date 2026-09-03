import { describe, it, expect } from 'vitest';
import {
  rollMove,
  entryIndexFor,
  advancePrompt,
  checkAlternative,
  entryCausesGameOver,
  placeExperienceDecision,
  usedMemorySlots,
  DEFAULT_MEMORY_SLOTS,
} from './core';
import type { GameState, Prompt, PromptPack } from '../types/game';

function makePrompt(number: number, entryCount: number): Prompt {
  return {
    number,
    entries: Array.from({ length: entryCount }, (_, i) => ({
      text: `提示${number}条目${i + 1}`,
      effects: [],
    })),
  };
}

function makePack(count = 80): PromptPack {
  return {
    meta: { name: 'test', source: 'test', language: 'zh', version: '1', promptCount: count },
    prompts: Array.from({ length: count }, (_, i) => makePrompt(i + 1, i + 1 <= 71 ? 3 : 1)),
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'g1',
    name: '测试吸血鬼',
    createdAt: 0,
    updatedAt: 0,
    memories: [],
    memorySlots: DEFAULT_MEMORY_SLOTS,
    skills: [],
    resources: [],
    characters: [],
    marks: [],
    currentPromptNumber: 1,
    promptVisits: {},
    usesFastMode: false,
    diaries: [],
    log: [],
    started: false,
    finished: false,
    moves: 0,
    ...overrides,
  };
}

describe('rollMove', () => {
  it('正数向后移动（d10-d6>0 时提示号增大）', () => {
    let calls = 0;
    const seq = [0.8, 0.1]; // d10=9, d6=1 → delta +8
    const rng = () => seq[calls++];
    const r = rollMove(10, 80, rng);
    expect(r.d10).toBe(9);
    expect(r.d6).toBe(1);
    expect(r.delta).toBe(8);
    expect(r.to).toBe(18);
    expect(r.repeats).toBe(false);
  });

  it('负数向前移动（d10-d6<0 时提示号减小）', () => {
    let calls = 0;
    const seq = [0.1, 0.9]; // d10=1+0=1? 1+floor(0.1*10)=2; d6=1+floor(0.9*6)=6 → delta -4
    const rng = () => seq[calls++];
    const r = rollMove(10, 80, rng);
    expect(r.d10).toBe(2);
    expect(r.d6).toBe(6);
    expect(r.delta).toBe(-4);
    expect(r.to).toBe(6);
  });

  it('不能移动到提示 1 之前，回弹到 1', () => {
    let calls = 0;
    const seq = [0.1, 0.9]; // d10=2, d6=6 → delta -4, current=3 → 3-4=-1 → to=1
    const rng = () => seq[calls++];
    const r = rollMove(3, 80, rng);
    expect(r.to).toBe(1);
    expect(r.hitFloor).toBe(true);
  });

  it('delta=0 表示再次遇到相同提示', () => {
    // 构造 delta 0: d10=4 → r in [0.3,0.4); d6=4 → r in [0.5,0.6)
    let c = 0;
    const seq2 = [0.35, 0.55];
    const r2 = rollMove(10, 80, () => seq2[c++]);
    expect(r2.d10).toBe(4);
    expect(r2.d6).toBe(4);
    expect(r2.delta).toBe(0);
    expect(r2.repeats).toBe(true);
    expect(r2.to).toBe(10);
  });
});

describe('entryIndexFor & advancePrompt', () => {
  it('第三次进入 3 条目提示后用条目 3，用完跳到下一提示', () => {
    const p = makePrompt(5, 3);
    const state = makeState({ currentPromptNumber: 5, promptVisits: { 5: 2 } });
    expect(entryIndexFor(p, 2)).toBe(3);
    const { nextNumber, entryIndex, newVisits } = advancePrompt(state, makePack());
    expect(entryIndex).toBe(3);
    expect(newVisits).toBe(3);
    expect(nextNumber).toBe(6);
  });

  it('游戏结束提示(72-80)只有 1 条目，永远用条目 1，用完后跳到 73', () => {
    const pack = makePack();
    const state = makeState({ currentPromptNumber: 72 });
    const { nextNumber, entryIndex } = advancePrompt(state, pack);
    expect(entryIndex).toBe(1);
    expect(nextNumber).toBe(73);
  });

  it('最后一提示用完后退回自身（不越界）', () => {
    const pack = makePack();
    const state = makeState({ currentPromptNumber: 79, promptVisits: { 79: 0 } });
    const { nextNumber } = advancePrompt(state, pack);
    expect(nextNumber).toBe(80);
    const state2 = makeState({ currentPromptNumber: 80, promptVisits: { 80: 0 } });
    const r2 = advancePrompt(state2, pack);
    expect(r2.nextNumber).toBe(80);
  });
});

describe('checkAlternative', () => {
  it('无技能可勾选但有资源 → alternative', () => {
    const state = makeState({ skills: [{ id: 's1', name: '剑术', checked: true, lost: false }], resources: [{ id: 'r1', name: '城堡', fixed: true, lost: false, isDiary: false }] });
    const r = checkAlternative(state, 'checkSkill');
    expect(r.outcome).toBe('alternative');
  });

  it('两者都没有 → gameOver', () => {
    const state = makeState({
      skills: [{ id: 's1', name: '剑术', checked: true, lost: true }],
      resources: [{ id: 'r1', name: '城堡', fixed: true, lost: true, isDiary: false }],
    });
    const r = checkAlternative(state, 'checkSkill');
    expect(r.outcome).toBe('gameOver');
  });

  it('无资源可失去但有可勾选技能 → alternative', () => {
    const state = makeState({
      skills: [{ id: 's1', name: '剑术', checked: false, lost: false }],
      resources: [],
    });
    const r = checkAlternative(state, 'loseResource');
    expect(r.outcome).toBe('alternative');
  });

  it('失去技能意图：已勾选的技能也算可失去；全无则看资源，再全无 → gameOver', () => {
    const state = makeState({
      skills: [{ id: 's1', name: '剑术', checked: true, lost: false }],
      resources: [],
    });
    expect(checkAlternative(state, 'loseSkill').outcome).toBe('ok');
    const state2 = makeState({
      skills: [{ id: 's1', name: '剑术', checked: true, lost: true }],
      resources: [{ id: 'r1', name: '城堡', fixed: true, lost: false, isDiary: false }],
    });
    expect(checkAlternative(state2, 'loseSkill').outcome).toBe('alternative');
    const state3 = makeState({
      skills: [{ id: 's1', name: '剑术', checked: true, lost: true }],
      resources: [{ id: 'r1', name: '城堡', fixed: true, lost: true, isDiary: false }],
    });
    expect(checkAlternative(state3, 'loseSkill').outcome).toBe('gameOver');
  });
});

describe('entryCausesGameOver', () => {
  it('含 gameOver 效果 → true', () => {
    const p: Prompt = {
      number: 72,
      entries: [{ text: '你在外面被抓住并被摧毁了。发生了什么？游戏结束。', effects: [{ type: 'gameOver' }] }],
    };
    expect(entryCausesGameOver(p, 1)).toBe(true);
  });

  it('普通提示 → false', () => {
    const p = makePrompt(1, 3);
    expect(entryCausesGameOver(p, 1)).toBe(false);
  });
});

describe('usedMemorySlots', () => {
  it('日记、恒存、已遗忘的记忆都不占用记忆槽', () => {
    const state = makeState({
      memorySlots: 5,
      memories: [
        { id: 'm1', title: '普通', experiences: [{ id: 'e1', text: 'x', promptNumber: 1, promptEntry: 1, createdAt: 0 }], inDiary: false, stabilized: false },
        { id: 'm2', title: '日记', experiences: [], inDiary: true, stabilized: false },
        { id: 'm3', title: '恒存', experiences: [], inDiary: false, stabilized: true },
        { id: 'm4', title: '遗忘', experiences: [], inDiary: false, stabilized: false, forgotten: true },
      ],
    });
    expect(usedMemorySlots(state)).toBe(1);
  });
});

describe('placeExperienceDecision', () => {
  it('有可追加且未满的记忆 → appendable 列出', () => {
    const state = makeState({ memories: [{ id: 'm1', title: '旧日', experiences: [{ id: 'e1', text: 'x', promptNumber: 1, promptEntry: 1, createdAt: 0 }], inDiary: false, stabilized: false }] });
    const d = placeExperienceDecision(state);
    expect(d.appendable).toContain('m1');
    expect(d.canCreateNew).toBe(true);
    expect(d.mustResolve).toBe(false);
  });

  it('满记忆但有空格 → canCreateNew', () => {
    const state = makeState({ memories: [
      { id: 'm1', title: '满', experiences: Array.from({ length: 3 }, (_, i) => ({ id: `e${i}`, text: 'x', promptNumber: 1, promptEntry: 1, createdAt: 0 })), inDiary: false, stabilized: false },
    ] });
    const d = placeExperienceDecision(state);
    expect(d.appendable).toEqual([]);
    expect(d.canCreateNew).toBe(true);
    expect(d.mustResolve).toBe(false);
  });

  it('空间全满且无可追加 → mustResolve', () => {
    const state = makeState({
      memorySlots: 1,
      memories: [
        { id: 'm1', title: '满', experiences: Array.from({ length: 3 }, (_, i) => ({ id: `e${i}`, text: 'x', promptNumber: 1, promptEntry: 1, createdAt: 0 })), inDiary: false, stabilized: false },
      ],
    });
    const d = placeExperienceDecision(state);
    expect(d.mustResolve).toBe(true);
    expect(d.canCreateNew).toBe(false);
  });

  it('已遗忘/恒存/入日记的记忆不可追加', () => {
    const state = makeState({ memories: [
      { id: 'm1', title: '遗忘', experiences: [], inDiary: false, stabilized: false, forgotten: true },
      { id: 'm2', title: '恒存', experiences: [], inDiary: false, stabilized: true },
      { id: 'm3', title: '日记', experiences: [], inDiary: true, stabilized: false },
    ] });
    const d = placeExperienceDecision(state);
    expect(d.appendable).toEqual([]);
    expect(d.canCreateNew).toBe(true);
  });
});