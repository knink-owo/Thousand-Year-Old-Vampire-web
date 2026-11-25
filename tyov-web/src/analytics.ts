/**
 * 可选的 Umami 统计（**默认关闭**）。
 *
 * 启用条件：构建时同时提供 `VITE_UMAMI_SRC` 与 `VITE_UMAMI_WEBSITE_ID`。
 * 未配置时本模块全部为 no-op；单文件离线版不注入脚本，且 `file://` 下强制禁用。
 *
 * 只上报视图切换（home / create / game / ...），不上报任何游戏内容、
 * 存档数据或可识别个人的信息。
 */
type UmamiPayload = Record<string, string | number | boolean>

declare global {
  interface Window {
    umami?: { track: (event: string, data?: UmamiPayload) => void }
  }
}

const configured = Boolean(import.meta.env.VITE_UMAMI_WEBSITE_ID)

/** 统计是否真正可用：已配置 + 非 file:// + 脚本已加载 */
export function analyticsEnabled(): boolean {
  if (!configured) return false
  if (typeof window === 'undefined') return false
  return window.location.protocol !== 'file:' && Boolean(window.umami)
}

/** 记录一次视图切换（SPA 内没有真实路由，用自定义事件代替 pageview） */
export function trackView(view: string): void {
  if (!analyticsEnabled()) return
  window.umami?.track('view', { view })
}

/** 记录一个自定义事件（如开始旅程、完成回合），data 不要放任何游戏内容 */
export function trackEvent(name: string, data?: UmamiPayload): void {
  if (!analyticsEnabled()) return
  window.umami?.track(name, data)
}
