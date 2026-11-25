/** 技能域动作（含"记忆转化为技能"） */
import type { GameCtx } from './context';
import { logText, uid } from './context';

export function createSkillActions(ctx: GameCtx) {
  const { state, persist } = ctx;

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

  return { addSkill, checkSkill, uncheckSkill, loseSkill, rewriteSkill, memoryToSkill };
}
