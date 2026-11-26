import { describe, it, expect } from 'vitest'
import zhRaw from '../data/official-pack.json'
import enRaw from '../data/official-pack.en.json'

/**
 * 双语提示包的结构契约：两包必须逐条对等。
 * 任何一侧改了条目数、效果顺序或漏翻，这里立刻失败。
 */
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

interface RawEffect { type: string; [k: string]: unknown }
interface RawPack {
  meta: { language?: string }
  prompts: { number: number; entries: { text: string; effects: RawEffect[] }[] }[]
}

const zh = zhRaw as unknown as RawPack
const en = enRaw as unknown as RawPack

describe('official packs (zh / en)', () => {
  it('both are 80 prompts starting at 1', () => {
    expect(zh.prompts.map(p => p.number)).toEqual(Array.from({ length: 80 }, (_, i) => i + 1))
    expect(en.prompts.map(p => p.number)).toEqual(zh.prompts.map(p => p.number))
  })

  it('entry counts and effect order match entry by entry', () => {
    for (const zp of zh.prompts) {
      const ep = en.prompts.find(p => p.number === zp.number)!
      expect(ep, 'prompt ' + zp.number).toBeTruthy()
      expect(ep.entries.length, 'prompt ' + zp.number).toBe(zp.entries.length)
      for (let i = 0; i < zp.entries.length; i++) {
        const zt = zp.entries[i].effects.map(e => e.type)
        const et = ep.entries[i].effects.map(e => e.type)
        expect(et, 'prompt ' + zp.number + '.' + (i + 1)).toEqual(zt)
      }
    }
  })

  it('english version keeps no Chinese text', () => {
    for (const p of en.prompts) {
      for (const e of p.entries) {
        expect(CJK.test(e.text), p.number + ' ' + e.text.slice(0, 40)).toBe(false)
        for (const fx of e.effects) {
          for (const v of Object.values(fx)) {
            if (typeof v === 'string') expect(CJK.test(v), p.number + ' effect').toBe(false)
          }
        }
      }
    }
  })

  it('every entry has text', () => {
    for (const p of en.prompts) for (const e of p.entries) expect(e.text.trim().length).toBeGreaterThan(10)
  })
})
