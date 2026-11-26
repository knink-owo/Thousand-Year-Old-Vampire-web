/** 回合流程：开始、推进、终局锁定、自愿终结、梦境之地、岁月流逝 */
import type { GameCtx } from './context';
import { logText, uid } from './context';
import type { DiaryEntry, GameState, Resource } from '../types/game';
import { rollMove, advancePrompt, entryVerdict, entryKey } from '../engine/core';
import { t } from '../i18n';

export function createTurnActions(ctx: GameCtx) {
  const { state, pack, currentPrompt, currentEntryIndex, persist } = ctx;

  function startGame(g: GameState) {
    state.value = g;
    state.value.started = true;
    state.value.log.push(logText('system', t('log.start', { name: g.name }), 1));
    persist();
  }

  /**
   * 锁定当前条目的终局结论（`提示号:条目号` 键控）。
   * 规则基准是"读到提示的那一刻"：玩家随后照做（勾掉最后一个技能、失去最后一项资源）
   * 不应反过来把自己判死，因此结论一旦锁定便不再随状态变化重算。
   */
  function lockEntryVerdict(): { gameOver: boolean; reason?: string } {
    const s = state.value;
    const p = currentPrompt.value;
    if (!s || !p) return { gameOver: false };
    const idx = currentEntryIndex.value;
    const key = entryKey(p.number, idx);
    if (s.entryVerdict?.key === key) {
      return { gameOver: s.entryVerdict.gameOver, reason: s.entryVerdict.reason };
    }
    const v = entryVerdict(s, p, idx);
    s.entryVerdict = { key, gameOver: v.gameOver, reason: v.reason };
    persist();
    return v;
  }

  /** 进入新提示/新条目时调用（由 GameView 监听提示与条目变化触发） */
  function syncEntryVerdict(): void {
    const s = state.value;
    if (!s || s.finished) return;
    lockEntryVerdict();
  }

  /** 点击"回答提示完成"：写入日记 → 推进提示（根据最终掷骰） */
  function completeTurn(diaryContent: string | null): { roll: { d10: number; d6: number; delta: number; from: number; to: number }; nextNumber: number; entryIndex: number } {
    const s = state.value;
    const p = currentPrompt.value;
    if (!s || !p) throw new Error(t('err.noGame'));
    // 终局结论取自"进入条目时"锁定的结果，绝不在效果执行后用新状态复判
    const verdict = ctx.lockVerdict();
    const epIdx = currentEntryIndex.value; // 本轮条目 1..n（已按条目数收敛）
    const entry = p.entries[epIdx - 1];
    if (!entry) throw new Error(t('err.missingEntry'));

    // 1) 每次回答提示都必须创建经历（除非提示明确说"不要为此提示创建新的经历"，由 UI 控制）
    // 2) 日志游戏：附加日记条目
    if (diaryContent && diaryContent.trim() && !s.usesFastMode) {
      const de: DiaryEntry = {
        id: uid(),
        promptNumber: p.number,
        entryIndex: epIdx,
        promptText: entry.text,
        content: diaryContent.trim(),
        createdAt: Date.now(),
      };
      s.diaries.push(de);
      s.log.push(logText('diary', t('log.diary', {
        prompt: p.number,
        n: epIdx,
        text: de.content.slice(0, 60) + (de.content.length > 60 ? '…' : ''),
      }), p.number));
    }

    // 3) 掷骰移动
    const roll = rollMove(p.number, pack.value.prompts.length);
    const adv = advancePrompt(s, pack.value);
    s.promptVisits[p.number] = adv.newVisits;
    s.moves += 1;

    if (verdict.gameOver) {
      s.finished = true;
      s.finishReason = t('log.finishReason', {
        text: entry.text.length > 50 ? entry.text.slice(0, 50) + '…' : entry.text,
      });
      s.finishedAt = Date.now();
      s.log.push(logText('system', t('log.gameOver'), p.number));
    } else {
      // 条目用尽则强制前进到下一提示（即便骰子移回）；否则按骰子移动
      const entriesExhausted = adv.nextNumber !== p.number;
      s.currentPromptNumber = entriesExhausted ? adv.nextNumber : roll.to;
      if (entriesExhausted) {
        s.log.push(logText('system', t('log.allEntriesAnswered', { prompt: p.number, to: adv.nextNumber }), p.number));
      } else {
        const tail = roll.repeats ? t('log.rollRepeat') : roll.hitFloor ? t('log.rollFloor') : '';
        s.log.push(logText('system',
          t('log.roll', { prompt: p.number, d10: roll.d10, d6: roll.d6, delta: roll.delta })
          + tail + t('log.rollTo', { to: roll.to }),
          p.number));
      }
    }
    persist();
    return { roll, nextNumber: adv.nextNumber, entryIndex: epIdx };
  }

  /** 自愿结束游戏（提示69第3条目"如果合适，你可以现在结束游戏"） */
  function endGame(reason: string) {
    const s = state.value;
    if (!s || s.finished) return;
    s.finished = true;
    s.finishReason = reason || t('log.endDefault');
    s.finishedAt = Date.now();
    s.log.push(logText('system', t('log.gameOver'), s.currentPromptNumber));
    persist();
  }

  /** 踏入梦境之地（提示48第3条目）：留下所有角色、印记与资源（除一把银剑），返回提示10，成为无印记的吸血鬼 */
  function enterDreamWorld() {
    const s = state.value;
    if (!s || s.dreamWorld) return;
    s.dreamWorld = true;
    // 亲手挑一把银剑带走，其余全数留下
    const silver: Resource = { id: uid(), name: t('game.dream.silverSword'), fixed: false, lost: false, isDiary: false };
    s.characters = [];
    s.marks = [];
    s.resources = [silver];
    s.diaryResourceId = undefined;
    for (const m of s.memories) m.inDiary = false; // 日记被留下，记忆回归（仍占槽）
    s.currentPromptNumber = 10;
    s.log.push(logText('system', t('log.dreamWorld'), 48));
    persist();
  }

  /** 记录"岁月流逝"已响应（执行老化或暂缓）：此后再过 4 次回答才会再次提醒（跨会话生效） */
  function acknowledgeAging() {
    const s = state.value;
    if (!s) return;
    s.agingAcknowledgedAt = s.moves;
    persist();
  }

  // 把跨域钩子回注到 ctx：completeTurn 用锁定结论，io.newGame 用 startGame
  ctx.lockVerdict = lockEntryVerdict;
  ctx.startGame = startGame;

  return { startGame, syncEntryVerdict, completeTurn, endGame, enterDreamWorld, acknowledgeAging };
}
