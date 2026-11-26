/** 技能域动作（含"记忆转化为技能"） */
import type { GameCtx } from './context';
import { logText, uid } from './context';
import { t } from '../i18n';

export function createSkillActions(ctx: GameCtx) {
  const { state, persist } = ctx;

  function addSkill(name: string, description?: string) {
    const s = state.value!;
    s.skills.push({ id: uid(), name, description, checked: false, lost: false });
    s.log.push(logText('skill', t('log.skill.gained', { name }), s.currentPromptNumber));
    persist();
  }

  function checkSkill(id: string) {
    const s = state.value!;
    const sk = s.skills.find(x => x.id === id);
    if (!sk || sk.checked || sk.lost) return;
    sk.checked = true;
    s.log.push(logText('skill', t('log.skill.checked', { name: sk.name }), s.currentPromptNumber));
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
    s.log.push(logText('skill', t('log.skill.lost', { name: sk.name }), s.currentPromptNumber));
    persist();
  }

  /** 重写/更改技能（提示11第2条目重写未勾选；62第1条目更改任意技能） */
  function rewriteSkill(id: string, newName: string) {
    const s = state.value!;
    const sk = s.skills.find(x => x.id === id);
    if (!sk || sk.lost || !newName.trim()) return;
    sk.name = newName.trim();
    s.log.push(logText('skill', t('log.skill.rewritten', { name: sk.name }), s.currentPromptNumber));
    persist();
  }

  /** 将一段记忆转化为技能：划掉记忆、获得技能（提示8第2条目、54第1条目） */
  function memoryToSkill(memoryId: string, skillName: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || m.stabilized || m.inDiary) return;
    m.forgotten = true;
    addSkill(skillName.trim() || m.title || t('log.skill.fromMemoryDefault'));
    s.log.push(logText('memory', t('log.skill.fromMemory', { name: m.title ?? t('panel.unnamedMemory') }), s.currentPromptNumber));
    persist();
  }

  return { addSkill, checkSkill, uncheckSkill, loseSkill, rewriteSkill, memoryToSkill };
}
