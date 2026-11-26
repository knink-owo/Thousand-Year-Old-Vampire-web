/** 资源域动作（含日记实体、固定资源、神器标记） */
import type { GameCtx } from './context';
import { logText, uid } from './context';
import { t } from '../i18n';

export function createResourceActions(ctx: GameCtx) {
  const { state, persist } = ctx;

  function addResource(name: string, description?: string, fixed = false) {
    const s = state.value!;
    s.resources.push({ id: uid(), name, description, fixed, lost: false, isDiary: false });
    s.log.push(logText('resource', fixed ? t('log.res.gainedFixed', { name }) : t('log.res.gained', { name }), s.currentPromptNumber));
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
      s.log.push(logText('resource', t('log.res.diaryLost', { name: r.name }), s.currentPromptNumber));
    } else {
      s.log.push(logText('resource', t('log.res.lost', { name: r.name }), s.currentPromptNumber));
    }
    persist();
  }

  /** 降级为废墟（提示2第3条目）：资源仍在，但化为废墟 */
  function degradeResource(id: string) {
    const s = state.value!;
    const r = s.resources.find(x => x.id === id);
    if (!r || r.lost) return;
    r.name = r.name + t('log.res.ruinSuffix');
    r.fixed = true;
    s.log.push(logText('resource', t('log.res.degraded', { name: r.name }), s.currentPromptNumber));
    persist();
  }

  /** 找回一项失去的资源（提示65第2条目、58第1条目等） */
  function retrieveResource(id: string) {
    const s = state.value!;
    const r = s.resources.find(x => x.id === id);
    if (!r || !r.lost) return;
    r.lost = false;
    s.log.push(logText('resource', t('log.res.retrieved', { name: r.name }), s.currentPromptNumber));
    persist();
  }

  /** 固定资源转为便携现金/财宝（提示46第1条目） */
  function convertFixedResource(id: string, newName?: string) {
    const s = state.value!;
    const r = s.resources.find(x => x.id === id);
    if (!r || r.lost || !r.fixed) return;
    r.fixed = false;
    if (newName?.trim()) r.name = newName.trim();
    s.log.push(logText('resource', t('log.res.portable', { name: r.name }), s.currentPromptNumber));
    persist();
  }

  /** 用一件资源换取一项新资源（提示65第1条目等） */
  function swapResource(id: string, newName: string) {
    const s = state.value!;
    const r = s.resources.find(x => x.id === id);
    if (!r || r.lost || !newName.trim()) return;
    r.lost = true;
    addResource(newName.trim());
    s.log.push(logText('resource', t('log.res.swapped', { name: r.name, newName: newName.trim() }), s.currentPromptNumber));
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

  /** 标记/取消标记神器（提示10第2条目：失去资源时须首先失去，结局时可改写） */
  function toggleArtifact(id: string) {
    const s = state.value!;
    const r = s.resources.find(x => x.id === id);
    if (!r || r.isDiary) return;
    r.artifact = !r.artifact;
    s.log.push(logText('resource', r.artifact ? t('log.res.artifactOn', { name: r.name }) : t('log.res.artifactOff', { name: r.name }), s.currentPromptNumber));
    persist();
  }

  return {
    addResource, loseResource, degradeResource, retrieveResource,
    convertFixedResource, swapResource, renameResource, toggleArtifact,
  };
}
