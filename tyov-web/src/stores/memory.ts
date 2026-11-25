/** 记忆域动作（记忆槽、经历、遗忘与日记） */
import type { GameCtx } from './context';
import { logText, uid } from './context';
import type { Experience, Memory, Resource } from '../types/game';
import {
  placeExperienceDecision, MAX_EXPERIENCES_PER_MEMORY, MAX_MEMORIES_PER_DIARY,
} from '../engine/core';

export function createMemoryActions(ctx: GameCtx) {
  const { state, persist } = ctx;

  /**
   * 添加经历：
   *  - memoryId 提供 → 追加到该记忆（须未入日记/未恒存/未遗忘且未满 3 条）
   *  - memoryId 为空 → 新建一段记忆（须有空槽）
   *  - 两路皆不可行 → 返回 mustForget，不写入任何数据（玩家须先遗忘或移入日记）
   */
  function addExperience(memoryId: string | null, text: string, promptNumber: number, promptEntry: number): { status: 'appended' | 'created' | 'mustForget' } {
    const s = state.value!;
    const exp: Experience = { id: uid(), text, promptNumber, promptEntry, createdAt: Date.now() };
    if (memoryId) {
      const m = s.memories.find(x => x.id === memoryId);
      if (m && !m.inDiary && !m.stabilized && !m.forgotten && m.experiences.length < MAX_EXPERIENCES_PER_MEMORY) {
        m.experiences.push(exp);
        s.log.push(logText('memory', `经历沉淀进记忆「${m.title ?? '未命名'}」。`, promptNumber));
        persist();
        return { status: 'appended' };
      }
    }
    const placement = placeExperienceDecision(s);
    if (placement.canCreateNew) {
      const m: Memory = { id: uid(), experiences: [exp], inDiary: false, stabilized: false };
      s.memories.push(m);
      s.log.push(logText('memory', '一段新的记忆成形。', promptNumber));
      persist();
      return { status: 'created' };
    }
    if (placement.appendable.length > 0) {
      // 兜底：指定的记忆不可用但有可追加记忆时，追加到第一段，避免经历无处安放
      const m = s.memories.find(x => x.id === placement.appendable[0])!;
      m.experiences.push(exp);
      s.log.push(logText('memory', `经历沉淀进记忆「${m.title ?? '未命名'}」。`, promptNumber));
      persist();
      return { status: 'appended' };
    }
    // 记忆已满且无可追加 → 必须遗忘/入日记后方可放置
    return { status: 'mustForget' };
  }

  /** 遗忘一段记忆（划掉）——已恒存（星号）或已入日记的记忆不能直接遗忘 */
  function forgetMemory(memoryId: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || m.stabilized || m.inDiary) return;
    m.forgotten = true;
    s.log.push(logText('memory', `一段记忆被划掉——${m.title ?? '未命名的过往'}永远逝去。`, s.currentPromptNumber));
    persist();
  }

  /** 为一段记忆命名（规则书：记忆通过主题定义；便于记录与识别） */
  function renameMemory(memoryId: string, title: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || m.stabilized) return;
    m.title = title.trim() || undefined;
    s.log.push(logText('memory', m.title ? `记忆被命名为「${m.title}」。` : '一段记忆的名字被抹去。', s.currentPromptNumber));
    persist();
  }

  /** 记忆画星号（恒存）：永不丢失、不再更改，也不再占用记忆槽（提示33第2条目） */
  function stabilizeMemory(memoryId: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || m.inDiary || m.forgotten) return;
    m.stabilized = true;
    s.log.push(logText('memory', `一段记忆被画上星号——「${m.title ?? '未命名'}」从此恒存，不再占用记忆槽。`, s.currentPromptNumber));
    persist();
  }

  /** 恢复一段被遗忘的记忆（提示31第3条目等） */
  function restoreMemory(memoryId: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || !m.forgotten) return;
    m.forgotten = false;
    s.log.push(logText('memory', `一段被遗忘的记忆重新浮现——「${m.title ?? '未命名'}」。`, s.currentPromptNumber));
    persist();
  }

  /** 删除一条经历（提示24第2条目"删去第一句话"等文本级修改的载体） */
  function removeExperience(experienceId: string) {
    const s = state.value!;
    for (const m of s.memories) {
      const idx = m.experiences.findIndex(x => x.id === experienceId);
      if (idx >= 0) {
        const [removed] = m.experiences.splice(idx, 1);
        s.log.push(logText('memory', `一段经历被抹去——${removed.text.slice(0, 24)}…`, s.currentPromptNumber));
        persist();
        return;
      }
    }
  }

  /** 编辑一条经历的文本 */
  function editExperience(experienceId: string, text: string) {
    const s = state.value!;
    for (const m of s.memories) {
      const ex = m.experiences.find(x => x.id === experienceId);
      if (ex) {
        ex.text = text;
        s.log.push(logText('memory', '经历被改写。', s.currentPromptNumber));
        persist();
        return;
      }
    }
  }

  /** 随机失去一段经历（提示51第1条目）：从记忆列表中间的记忆里随机划去一条经历 */
  function randomLoseExperience() {
    const s = state.value!;
    const candidates = s.memories.filter(m => !m.forgotten && m.experiences.some(x => !x.lost));
    if (candidates.length === 0) return;
    const mid = candidates[Math.floor(candidates.length / 2)]; // "列表中间的记忆"
    const pool = mid.experiences.filter(x => !x.lost);
    const ex = pool[Math.floor(Math.random() * pool.length)];
    ex.lost = true;
    s.log.push(logText('memory', `一段经历被命运划去——${ex.text.slice(0, 24)}${ex.text.length > 24 ? '…' : ''}`, s.currentPromptNumber));
    persist();
  }

  /** 恢复一段被划去的经历 */
  function restoreExperience(experienceId: string) {
    const s = state.value!;
    for (const m of s.memories) {
      const ex = m.experiences.find(x => x.id === experienceId);
      if (ex && ex.lost) {
        ex.lost = false;
        s.log.push(logText('memory', '一段被划去的经历重新被记起。', s.currentPromptNumber));
        persist();
        return;
      }
    }
  }

  /** 永久失去/获得一个记忆槽（提示22第3条目、41第1条目、52第1条目） */
  function changeMemorySlots(delta: number) {
    const s = state.value!;
    const next = Math.max(1, s.memorySlots + delta);
    if (next === s.memorySlots) return;
    s.memorySlots = next;
    s.log.push(logText('memory', delta > 0 ? `记忆槽增加，现有 ${next} 个记忆槽。` : `身体离人类更远——记忆槽永久减少为 ${next} 个。`, s.currentPromptNumber));
    persist();
  }

  /** 记忆移入日记（创建日记资源或使用现有）——已恒存的记忆保持原位 */
  function moveMemoryToDiary(memoryId: string, diaryName?: string) {
    const s = state.value!;
    const m = s.memories.find(x => x.id === memoryId);
    if (!m || m.inDiary || m.stabilized || m.forgotten) return;
    const diaryCapacity = MAX_MEMORIES_PER_DIARY;
    const inDiary = s.memories.filter(x => x.inDiary).length;
    if (inDiary >= diaryCapacity) return;
    if (!s.diaryResourceId) {
      const res: Resource = { id: uid(), name: diaryName || '一本结实的皮革装订书', fixed: false, lost: false, isDiary: true };
      s.resources.push(res);
      s.diaryResourceId = res.id;
    }
    m.inDiary = true;
    s.log.push(logText('memory', `记忆「${m.title ?? '未命名'}」被写入日记，不再占用记忆槽。`, s.currentPromptNumber));
    persist();
  }

  return {
    addExperience, forgetMemory, renameMemory, stabilizeMemory, restoreMemory,
    removeExperience, editExperience, randomLoseExperience, restoreExperience,
    changeMemorySlots, moveMemoryToDiary,
  };
}
