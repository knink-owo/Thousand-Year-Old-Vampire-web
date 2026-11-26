/** 印记域动作 */
import type { GameCtx } from './context';
import { logText, uid } from './context';
import { t } from '../i18n';

export function createMarkActions(ctx: GameCtx) {
  const { state, persist } = ctx;

  function addMark(name: string, description?: string) {
    const s = state.value!;
    s.marks.push({ id: uid(), name, description, removed: false });
    s.log.push(logText('mark', t('log.mark.appeared', { name }), s.currentPromptNumber));
    persist();
  }

  function removeMark(id: string) {
    const s = state.value!;
    const m = s.marks.find(x => x.id === id);
    if (m && !m.removed) {
      m.removed = true;
      persist();
    }
  }

  /** 印记变为失能（提示61第3条目）：必须寻求凡人的帮助 */
  function crippleMark(id: string) {
    const s = state.value!;
    const m = s.marks.find(x => x.id === id);
    if (!m || m.removed || m.crippled) return;
    m.crippled = true;
    s.log.push(logText('mark', t('log.mark.crippled', { name: m.name }), s.currentPromptNumber));
    persist();
  }

  return { addMark, removeMark, crippleMark };
}
