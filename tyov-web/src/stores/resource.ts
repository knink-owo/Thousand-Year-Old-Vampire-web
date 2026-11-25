/** 资源域动作（含日记实体、固定资源、神器标记） */
import type { GameCtx } from './context';
import { logText, uid } from './context';

export function createResourceActions(ctx: GameCtx) {
  const { state, persist } = ctx;

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

  /** 标记/取消标记神器（提示10第2条目：失去资源时须首先失去，结局时可改写） */
  function toggleArtifact(id: string) {
    const s = state.value!;
    const r = s.resources.find(x => x.id === id);
    if (!r || r.isDiary) return;
    r.artifact = !r.artifact;
    s.log.push(logText('resource', r.artifact ? `「${r.name}」被确认为神器——它关系着你的结局。` : `「${r.name}」不再被视为神器。`, s.currentPromptNumber));
    persist();
  }

  return {
    addResource, loseResource, degradeResource, retrieveResource,
    convertFixedResource, swapResource, renameResource, toggleArtifact,
  };
}
