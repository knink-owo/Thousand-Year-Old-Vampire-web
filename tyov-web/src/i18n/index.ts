/**
 * 极简 i18n：两个语言、扁平字典、零依赖。
 *
 * 设计要点：
 *  - t() 在渲染期读取 locale.value，模板因此自动建立依赖，无需 computed 包裹；
 *  - 默认英文；老存档（英文版上线前写下的）继续中文，避免老玩家语言突变；
 *  - ?lang=zh|en 优先于本地存储，便于分享链接。
 */
import { ref } from 'vue'
import { zh } from './zh'
import { en } from './en'
import type { Messages, MsgKey } from './types'

export type { MsgKey }

export type Locale = 'zh' | 'en'

export const LOCALE_KEY = 'tyov:lang:v1'
export const SAVE_KEY = 'tyov:save:v1'

/** 未设置偏好时的默认语言 */
export const DEFAULT_LOCALE: Locale = 'en'

function isLocale(v: unknown): v is Locale {
  return v === 'zh' || v === 'en'
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** 首访语言：URL > 本地存储 > 老存档兜底 > 默认 */
export function detectLocale(): Locale {
  if (typeof window !== 'undefined' && typeof URLSearchParams !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('lang')
    if (isLocale(q)) return q
  }
  const saved = readStorage(LOCALE_KEY)
  if (isLocale(saved)) return saved
  // 英文版之前只有一个语言：有存档说明是老玩家，保持中文
  if (readStorage(SAVE_KEY)) return 'zh'
  return DEFAULT_LOCALE
}

export const locale = ref<Locale>(detectLocale())

const dicts: Record<Locale, Messages> = { zh, en }

/** 取文案；未知键回退为键名本身，便于发现遗漏 */
export function t(key: MsgKey, params?: Record<string, string | number>): string {
  const table = dicts[locale.value] ?? zh
  let s: string = table[key] ?? key
  if (params) {
    for (const k of Object.keys(params)) s = s.split('{' + k + '}').join(String(params[k]))
  }
  return s
}

/** 同步 <html lang> 与 <title>；切语言时由 setLocale 调用 */
export function applyDocument(): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale.value === 'zh' ? 'zh-CN' : 'en'
  document.title = t('app.title')
}

/** 切换语言并持久化 */
export function setLocale(next: Locale): void {
  if (!isLocale(next)) return
  locale.value = next
  try {
    localStorage.setItem(LOCALE_KEY, next)
  } catch {
    /* 隐私模式下忽略 */
  }
  applyDocument()
}
