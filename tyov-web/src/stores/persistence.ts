/**
 * 持久化层：localStorage 安全封装 + 存档 / 历史摘要 / 完结快照。
 *
 * 隐私模式、禁用站点数据、配额写满时失败不中断游戏，仅置 storageWarning 供 UI 提示。
 */
import { ref, type Ref } from 'vue';
import type { GameState, GameRecord, PromptPack } from '../types/game';
import { officialPack } from '../engine/packLoader';
import { writeBackup } from '../engine/fileBackup';

const SAVE_KEY = 'tyov:save:v1';
const PACK_KEY = 'tyov:pack:v1';
const HISTORY_KEY = 'tyov:history:v1';
const FULL_KEY = 'tyov:history:full:v1';
const MAX_HISTORY = 20;

let storageAvailable = true;
try {
  const probe = '__tyov_probe__';
  localStorage.setItem(probe, '1');
  localStorage.removeItem(probe);
} catch {
  storageAvailable = false;
}

/** 安全读取：不可用或异常时返回 null */
function safeGet(key: string): string | null {
  if (!storageAvailable) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    storageAvailable = false;
    return null;
  }
}

/** 安全写入：不可用或异常时标记 storageAvailable=false，返回是否成功 */
function safeSet(key: string, value: string): boolean {
  if (!storageAvailable) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    storageAvailable = false;
    return false;
  }
}

/** 安全删除 */
function safeRemove(key: string): void {
  if (!storageAvailable) return;
  try {
    localStorage.removeItem(key);
  } catch {
    storageAvailable = false;
  }
}

export function isStorageAvailable(): boolean {
  return storageAvailable;
}

export function loadPack(): PromptPack {
  try {
    const raw = safeGet(PACK_KEY);
    if (raw) {
      const p = JSON.parse(raw) as PromptPack;
      if (p?.prompts?.length) return p;
    }
  } catch { /* ignore */ }
  return officialPack;
}

export function savePack(pack: PromptPack): void {
  safeSet(PACK_KEY, JSON.stringify(pack));
}

export function loadSavedGame(): GameState | null {
  try {
    const raw = safeGet(SAVE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as GameState;
    if (g?.id) return g;
  } catch { /* ignore */ }
  return null;
}

function loadHistory(): GameRecord[] {
  try {
    const raw = safeGet(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as GameRecord[];
    if (Array.isArray(list)) return list;
  } catch { /* ignore */ }
  return [];
}

function loadFullSnapshots(): Record<string, GameState> {
  try {
    const raw = safeGet(FULL_KEY);
    if (raw) {
      const map = JSON.parse(raw) as Record<string, GameState>;
      if (map && typeof map === 'object') return map;
    }
  } catch { /* ignore */ }
  return {};
}

export interface PersistenceDeps {
  state: Ref<GameState | null>;
}

/** 创建持久化动作（存档、历史摘要、完结快照） */
export function createPersistence({ state }: PersistenceDeps) {
  const storageWarning = ref<string>('');
  const records = ref<GameRecord[]>(loadHistory());
  const fullSnapshots = ref<Record<string, GameState>>(loadFullSnapshots());

  function persist() {
    if (!state.value) return;
    try {
      state.value.updatedAt = Date.now();
      const json = JSON.stringify(state.value);
      const ok = safeSet(SAVE_KEY, json);
      // 已绑定备份文件时，额外静默写入（单文件 file:// 场景的可靠持久化）
      void writeBackup(json);
      if (!ok) {
        storageWarning.value = '本地存储不可用（隐私模式或存储已满）——进度无法自动保存，请尽快「导出存档 JSON」备份，你的游戏仍可继续。';
      }
      touchRecord(state.value.finished); // 完结时保存定型快照；进行中只更新摘要
    } catch {
      storageWarning.value = '本地存储异常——进度无法自动保存，请尽快「导出存档 JSON」备份。';
    }
  }

  /** 效果撤回（行级）：EffectActions 在每条效果执行前保存状态快照，撤回时恢复到快照 */
  function restoreSnapshot(snapshot: GameState) {
    if (!snapshot?.id) return;
    state.value = snapshot;
    persist();
  }

  function saveHistory() {
    safeSet(HISTORY_KEY, JSON.stringify(records.value.slice(0, MAX_HISTORY)));
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

  /**
   * 登记/更新一条历史记录（新游戏登记、进度变化或结束更新）。
   * 全量快照仅在游戏完结时保存——进行中的游戏只更新摘要，避免每回合的大对象序列化。
   */
  function touchRecord(saveSnapshot = false) {
    const s = state.value;
    if (!s) return;
    const rec = snapshotRecord(s);
    const idx = records.value.findIndex(r => r.id === s.id);
    if (idx >= 0) records.value[idx] = rec;
    else records.value.unshift(rec);
    saveHistory();
    if (saveSnapshot || rec.finished) {
      fullSnapshots.value[s.id] = JSON.parse(JSON.stringify(s)) as GameState;
      saveFullSnapshots();
    }
  }

  /** 全量快照与历史摘要保持同步：只保留最近 MAX_HISTORY 条；容量超限时从最旧开始丢弃重试 */
  function saveFullSnapshots() {
    const keep = new Set(records.value.slice(0, MAX_HISTORY).map(r => r.id));
    for (const id of Object.keys(fullSnapshots.value)) {
      if (!keep.has(id)) delete fullSnapshots.value[id];
    }
    const ok = safeSet(FULL_KEY, JSON.stringify(fullSnapshots.value));
    if (!ok) {
      const ordered = [...records.value].sort((a, b) => a.createdAt - b.createdAt).map(r => r.id);
      const drop = ordered.find(id => fullSnapshots.value[id]);
      if (drop) {
        delete fullSnapshots.value[drop];
        saveFullSnapshots();
      }
    }
  }

  function removeRecord(id: string) {
    records.value = records.value.filter(r => r.id !== id);
    delete fullSnapshots.value[id];
    saveHistory();
    saveFullSnapshots();
  }

  function clearRecords() {
    records.value = [];
    fullSnapshots.value = {};
    saveHistory();
    saveFullSnapshots();
  }

  function getRecordSnapshot(id: string): GameState | null {
    return fullSnapshots.value[id] ?? null;
  }

  /** 丢弃当前存档（历史记录由调用方决定是否清理） */
  function clearSave() {
    state.value = null;
    safeRemove(SAVE_KEY);
  }

  /** 清除本工具的全部本地数据（存档/历史/快照/提示包）——供「抹去一切记录」使用 */
  function clearLocalData() {
    records.value = [];
    fullSnapshots.value = {};
    state.value = null;
    safeRemove(SAVE_KEY);
    safeRemove(HISTORY_KEY);
    safeRemove(FULL_KEY);
    safeRemove(PACK_KEY);
  }

  return {
    storageWarning, records, fullSnapshots,
    persist, restoreSnapshot, touchRecord, removeRecord, clearRecords, getRecordSnapshot, clearLocalData, clearSave,
  };
}
