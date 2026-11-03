import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import GameView from './GameView.vue'
import { useGameStore, createEmptyGame } from '../stores/game'
import type { PromptPack } from '../types/game'

/**
 * 挂载级回归：GameView 进入游戏时必须完成一次"条目终局判定"的锁定。
 * 这条链路跨越 setup 期的 watch、computed 与 store 副作用，单测 store 覆盖不到。
 */

const PACK: PromptPack = {
  meta: { name: 'test', source: 'test', language: 'zh', version: '1', promptCount: 3 },
  prompts: [
    { number: 1, entries: [{ text: '勾选一项技能。', effects: [{ type: 'checkSkill' }] }] },
    { number: 2, entries: [{ text: '平静的岁月。', effects: [] }] },
    { number: 3, entries: [{ text: '结束。', effects: [{ type: 'gameOver' }] }] },
  ],
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GameView 挂载', () => {
  it('进入游戏即锁定当前条目的终局结论（渲染不抛错）', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useGameStore()
    store.importPackJson(JSON.stringify(PACK))
    store.startGame({
      ...createEmptyGame('测试吸血鬼', false),
      started: true,
      skills: [{ id: 'k1', name: '观察', checked: false, lost: false }],
    })

    const wrapper = mount(GameView, { global: { plugins: [pinia] } })
    await nextTick()

    expect(store.state!.entryVerdict).toMatchObject({ key: '1:1', gameOver: false })
    expect(wrapper.text()).toContain('测试吸血鬼')

    wrapper.unmount()
  })

  it('读档后挂载：无技能无资源时第一时间锁定为终局', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useGameStore()
    store.importPackJson(JSON.stringify(PACK))
    store.startGame({ ...createEmptyGame('另一个吸血鬼', false), started: true })

    const wrapper = mount(GameView, { global: { plugins: [pinia] } })
    await nextTick()

    expect(store.state!.entryVerdict?.gameOver).toBe(true)

    wrapper.unmount()
  })

  it('条目用尽时，骰子卡以实际落点为准（骰子指向不作数）', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useGameStore()
    store.importPackJson(JSON.stringify(PACK))
    store.startGame({
      ...createEmptyGame('推门者', false),
      started: true,
      skills: [{ id: 'k1', name: '观察', checked: false, lost: false }],
    })

    const wrapper = mount(GameView, { global: { plugins: [pinia] } })
    await nextTick()
    window.scrollTo = vi.fn()

    // 两颗骰子同为 1 → 差为 0，骰子指向提示 1；但提示 1 的唯一条目已回答完 → 实际前往提示 2
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await wrapper.find('textarea').setValue('我推开了那扇门；门后只有风。')
    const completeBtn = wrapper.findAll('button').find(b => b.text().includes('完成这一回合'))
    expect(completeBtn).toBeTruthy()
    await completeBtn!.trigger('click')
    await nextTick()

    expect(store.state!.currentPromptNumber).toBe(2)
    const text = wrapper.text()
    expect(text).toContain('提示 1 的条目已全部回应')
    expect(text).toContain('前往提示 2')

    wrapper.unmount()
  })
})
