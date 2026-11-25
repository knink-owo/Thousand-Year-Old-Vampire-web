/**
 * 游戏状态 store（装配层）：状态、派生值，以及各领域动作。
 *
 * 拆分结构：
 *  - context.ts      通用工具（uid / logText / createEmptyGame）与 GameCtx 契约
 *  - persistence.ts  localStorage 安全层 + 存档 / 历史摘要 / 完结快照
 *  - turn.ts         回合推进、终局锁定、梦境之地、岁月流逝
 *  - memory.ts       记忆域
 *  - skill.ts        技能域（含记忆转技能）
 *  - resource.ts     资源域
 *  - character.ts    角色域
 *  - mark.ts         印记域
 *  - io.ts           导入导出、本地备份文件、放弃旅程、新游戏
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { GameState, PromptPack } from '../types/game';
import { findPrompt } from '../engine/packLoader';
import { entryIndexFor, visitsOf } from '../engine/core';
import type { GameCtx } from './context';
import { createPersistence, loadPack, loadSavedGame, isStorageAvailable } from './persistence';
import { createTurnActions } from './turn';
import { createMemoryActions } from './memory';
import { createSkillActions } from './skill';
import { createResourceActions } from './resource';
import { createCharacterActions } from './character';
import { createMarkActions } from './mark';
import { createIoActions } from './io';

// 保留原有对外导出（测试与视图从这里引用）
export { createEmptyGame } from './context';
export { isStorageAvailable } from './persistence';

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

  const persistence = createPersistence({ state });

  // 领域动作：按依赖顺序创建，跨域钩子在工厂内回注（见 turn.ts / character.ts）
  const ctx = {
    state, pack, currentPrompt, currentEntryIndex,
    persist: persistence.persist,
    touchRecord: persistence.touchRecord,
    lockVerdict: () => ({ gameOver: false }),
    addResource: () => {},
    startGame: () => {},
  } as GameCtx;

  const skill = createSkillActions(ctx);
  const resource = createResourceActions(ctx);
  ctx.addResource = resource.addResource;
  const character = createCharacterActions(ctx);
  const memory = createMemoryActions(ctx);
  const mark = createMarkActions(ctx);
  const turn = createTurnActions(ctx);
  const io = createIoActions(ctx, persistence);

  // ---------- 启动时恢复 ----------
  const saved = loadSavedGame();
  if (saved) state.value = saved;
  if (!isStorageAvailable() && !persistence.storageWarning.value) {
    persistence.storageWarning.value = '本地存储不可用（隐私模式或浏览器禁用了站点数据）——进度无法自动保存，你仍可游玩，但刷新后进度将丢失。可随时「导出存档 JSON」备份。';
  }

  return {
    pack, state, currentPrompt, currentEntryIndex, currentEntryText,
    storageWarning: persistence.storageWarning,
    records: persistence.records,
    removeRecord: persistence.removeRecord,
    clearRecords: persistence.clearRecords,
    getRecordSnapshot: persistence.getRecordSnapshot,
    ...io,
    ...turn,
    ...memory,
    ...skill,
    ...resource,
    ...character,
    ...mark,
    persist: persistence.persist,
    restoreSnapshot: persistence.restoreSnapshot,
  };
});

export type GameStore = ReturnType<typeof useGameStore>;
