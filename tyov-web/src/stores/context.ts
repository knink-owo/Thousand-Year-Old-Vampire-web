/**
 * 游戏 store 的共享上下文：通用工具函数 + 各领域动作工厂共用的依赖契约。
 *
 * 拆分约定：领域模块只依赖 GameCtx，彼此不互相 import，避免循环依赖。
 */
import type { ComputedRef, Ref } from 'vue';
import type { GameState, PromptPack, Prompt, GameLogEntry } from '../types/game';
import { DEFAULT_MEMORY_SLOTS } from '../engine/core';

/** 领域动作工厂共用的上下文（由 game.ts 装配后注入） */
export interface GameCtx {
  state: Ref<GameState | null>;
  pack: Ref<PromptPack>;
  currentPrompt: ComputedRef<Prompt | undefined>;
  currentEntryIndex: ComputedRef<number>;
  persist: () => void;
  touchRecord: (saveSnapshot?: boolean) => void;
  /** 进入条目时锁定的终局结论（turn.ts 提供） */
  lockVerdict: () => { gameOver: boolean; reason?: string };
  /** 特色域之间互相调用的钩子（装配时按依赖顺序注入） */
  addResource: (name: string, description?: string, fixed?: boolean) => void;
  startGame: (g: GameState) => void;
}

export type LogKind = GameLogEntry['kind'];

let idCounter = 0;
export function uid(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function logText(kind: LogKind, text: string, atPrompt: number): GameLogEntry {
  return { id: uid(), kind, text, atPrompt, createdAt: Date.now() };
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
    effectProgress: {},
  };
}
