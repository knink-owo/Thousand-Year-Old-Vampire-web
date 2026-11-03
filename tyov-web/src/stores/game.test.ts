import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore, createEmptyGame } from './game'
import type { GameState, PromptPack } from '../types/game'

/**
 * store 级回归：回合结算与终局判定的时序。
 * 这些用例锁定的是一条规则语义——"在被指示勾选技能/失去资源的那一刻无法做到"才结束游戏，
 * 玩家照做之后状态发生变化，不能被反过来当成"做不到"。
 */

const PACK: PromptPack = {
  meta: { name: 'test', source: 'test', language: 'zh', version: '1', promptCount: 3 },
  prompts: [
    { number: 1, entries: [{ text: '勾选一项技能。', effects: [{ type: 'checkSkill' }] }] },
    { number: 2, entries: [{ text: '一段平静的岁月。', effects: [] }] },
    { number: 3, entries: [{ text: '你的故事游戏结束。', effects: [{ type: 'gameOver' }] }] },
  ],
}

function setup(overrides: Partial<GameState> = {}, pack: PromptPack = PACK) {
  setActivePinia(createPinia())
  const store = useGameStore()
  store.importPackJson(JSON.stringify(pack))
  const g: GameState = { ...createEmptyGame('测试吸血鬼', false), started: true, ...overrides }
  store.startGame(g)
  return { store }
}

beforeEach(() => {
  localStorage.clear()
})

describe('completeTurn · 终局判定时序', () => {
  it('只剩一个可勾技能且无资源：照规则勾选后提交，不应判死', () => {
    const { store } = setup({
      skills: [{ id: 'k1', name: '观察', checked: false, lost: false }],
      resources: [],
    })

    store.syncEntryVerdict()
    expect(store.state!.entryVerdict).toMatchObject({ key: '1:1', gameOver: false })

    // 玩家按效果引导执行（这正是旧实现会误判的动作）
    store.checkSkill('k1')
    store.completeTurn(null)

    expect(store.state!.skills[0].checked).toBe(true)
    expect(store.state!.finished).toBe(false)
  })

  it('唯一一项资源且无技能：照规则失去后提交，不应判死', () => {
    const { store } = setup(
      {
        skills: [],
        resources: [{ id: 'r1', name: '庄园', fixed: true, lost: false, isDiary: false }],
      },
      {
        meta: { name: 't', source: 't', language: 'zh', version: '1', promptCount: 3 },
        prompts: [
          { number: 1, entries: [{ text: '失去一项资源。', effects: [{ type: 'loseResource' }] }] },
          { number: 2, entries: [{ text: '平静。', effects: [] }] },
          { number: 3, entries: [{ text: '结束。', effects: [] }] },
        ],
      },
    )
    store.syncEntryVerdict()
    store.loseResource('r1')
    store.completeTurn(null)

    expect(store.state!.finished).toBe(false)
  })

  it('本来就无技能无资源：进入条目即判定结束', () => {
    const { store } = setup({ skills: [], resources: [] })

    store.syncEntryVerdict()
    expect(store.state!.entryVerdict?.gameOver).toBe(true)

    store.completeTurn(null)
    expect(store.state!.finished).toBe(true)
  })

  it('条目效果宣告 gameOver：进入条目即判定结束', () => {
    const { store } = setup({ currentPromptNumber: 3 })

    store.syncEntryVerdict()
    expect(store.state!.entryVerdict).toMatchObject({ key: '3:1', gameOver: true })

    store.completeTurn(null)
    expect(store.state!.finished).toBe(true)
  })

  it('已锁定的结论不会被同一回合内的后续状态变化改写', () => {
    const { store } = setup({
      skills: [{ id: 'k1', name: '观察', checked: false, lost: false }],
      resources: [],
    })

    store.syncEntryVerdict()
    store.checkSkill('k1')
    store.syncEntryVerdict() // 同一条目重复同步：不重算

    expect(store.state!.entryVerdict).toMatchObject({ key: '1:1', gameOver: false })
  })
})

describe('completeTurn · 提示推进', () => {
  it('条目用尽时前往下一提示，返回的 nextNumber 即实际落点', () => {
    // 给一个可勾技能，避免"无技能无资源"在进入条目时就被判死
    const { store } = setup({ skills: [{ id: 'k1', name: '观察', checked: false, lost: false }] })

    const result = store.completeTurn(null)

    expect(result.nextNumber).toBe(2)
    expect(store.state!.finished).toBe(false)
    expect(store.state!.currentPromptNumber).toBe(2)
    expect(store.state!.promptVisits[1]).toBe(1)
    expect(store.state!.moves).toBe(1)
  })
})
