import { describe, it, expect, beforeEach } from 'vitest'
import { zh } from './zh'
import { en } from './en'
import { t, setLocale, locale, detectLocale } from './index'

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

describe('i18n dictionaries', () => {
  it('zh and en expose exactly the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })

  it('english values contain no Chinese characters', () => {
    // 语言名在各自语言里显示：en 字典里的「中文」是切换按钮标签，唯一豁免
    const allow = new Set(['lang.zh'])
    for (const [k, v] of Object.entries(en)) {
      if (allow.has(k)) continue
      expect(CJK.test(v), k + ' => ' + v).toBe(false)
    }
  })

  it('every english value is non-empty', () => {
    for (const [k, v] of Object.entries(en)) expect(v.trim().length, k).toBeGreaterThan(0)
  })
})

describe('t()', () => {
  beforeEach(() => setLocale('zh'))

  it('returns the current locale string', () => {
    expect(t('home.start')).toContain('开始旅程')
    setLocale('en')
    expect(t('home.start')).toContain('Begin')
  })

  it('interpolates named params', () => {
    expect(t('home.historyCount', { n: 3 })).toContain('3')
    expect(t('app.file.bound', { name: 'a.json' })).toContain('a.json')
  })

  it('leaves unknown placeholders untouched', () => {
    expect(t('home.ongoingMeta')).toContain('{moves}')
  })
})

describe('locale detection', () => {
  it('defaults to english without preferences', () => {
    localStorage.clear()
    expect(detectLocale()).toBe('en')
    expect(locale.value === 'zh' || locale.value === 'en').toBe(true)
  })

  it('keeps an existing player in chinese', () => {
    localStorage.clear()
    localStorage.setItem('tyov:save:v1', '{"id":"x"}')
    expect(detectLocale()).toBe('zh')
    localStorage.clear()
  })

  it('honours the stored preference over the legacy save', () => {
    localStorage.clear()
    localStorage.setItem('tyov:save:v1', '{"id":"x"}')
    localStorage.setItem('tyov:lang:v1', 'en')
    expect(detectLocale()).toBe('en')
    localStorage.clear()
  })
})
