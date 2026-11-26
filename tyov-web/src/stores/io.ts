/** 导入导出、本地备份文件、放弃旅程与新游戏 */
import { ref } from 'vue';
import type { GameCtx } from './context';
import { createEmptyGame } from './context';
import type { GameState, PromptPack } from '../types/game';
import {
  bindBackupFile, getBackupName, isFileProtocol, onBackupChange, supportsFileBackup, writeBackup,
} from '../engine/fileBackup';
import { savePack, createPersistence } from './persistence';
import { t } from '../i18n';

type Persistence = ReturnType<typeof createPersistence>;

export function createIoActions(ctx: GameCtx, persistence: Persistence) {
  const { state, pack, persist } = ctx;
  const { removeRecord, clearSave, clearLocalData } = persistence;

  // ---------- 单文件（file://）模式 ----------
  // file:// 下 localStorage 可能不稳定，提供"绑定本地备份文件"的替代持久化方案
  const isFileMode = ref(isFileProtocol());
  const backupSupported = supportsFileBackup();
  const backupFileName = ref(getBackupName());
  onBackupChange((name) => { backupFileName.value = name });

  /** 绑定一个本地备份文件，并把当前存档立即写入其中 */
  async function bindBackup(): Promise<boolean> {
    const ok = await bindBackupFile();
    if (ok && state.value) await writeBackup(JSON.stringify(state.value));
    return ok;
  }

  /** 放弃当前旅程：删除当前存档与对应历史摘要/快照（不可恢复）——首页"放弃旅程"使用 */
  function abandonCurrent() {
    const s = state.value;
    if (!s) return;
    removeRecord(s.id);   // 同步清理历史摘要与全量快照
    clearSave();
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

  function exportDiaryMarkdown(target?: GameState): string {
    const s = target ?? state.value;
    if (!s) return '';
    const lines: string[] = [];
    lines.push(t('io.mdTitle', { name: s.name }));
    lines.push('');
    for (const d of s.diaries) {
      lines.push(t('io.mdPrompt', { prompt: d.promptNumber, n: d.entryIndex }));
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
      savePack(p);
      return true;
    } catch { return false; }
  }

  function newGame(name: string, fast: boolean) {
    state.value = createEmptyGame(name, fast);
    ctx.startGame(state.value);
  }

  return {
    isFileMode, backupSupported, backupFileName, bindBackup,
    abandonCurrent, clearLocalData,
    exportGameJson, importGameJson, exportDiaryMarkdown, exportPackJson, importPackJson,
    newGame,
  };
}
