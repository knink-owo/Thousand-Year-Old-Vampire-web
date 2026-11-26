import { describe, it, expect } from 'vitest'

/**
 * 守卫：.vue 模板里不允许出现中文字面量。
 *
 * 脚本区与注释可以写中文（面向维护者），但模板文本是用户可见文案，
 * 必须走 t('key')，否则切到英文时会出现中英混排。
 */
const files = import.meta.glob('../**/*.vue', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function templateOf(src: string): string {
  const start = src.indexOf('<template>')
  const end = src.lastIndexOf('</template>')
  if (start < 0 || end < 0) return ''
  const body = src.slice(start + '<template>'.length, end)
  // 插值表达式里可以有中文（如 t('key', { name: '—' })），
  // 模板注释也允许中文 —— 两者都不是渲染出来的文案
  return body.replace(/\{\{[\s\S]*?\}\}/g, '').replace(/<!--[\s\S]*?-->/g, '')
}

describe('templates contain no hard-coded Chinese', () => {
  const entries = Object.entries(files)

  it('found the .vue files', () => {
    expect(entries.length).toBeGreaterThan(10)
  })

  for (const [path, src] of entries) {
    it(path.replace('../', ''), () => {
      const text = templateOf(src)
      const hit = text.match(new RegExp('\\p{Script=Han}+', 'u'))
      expect(hit?.[0] ?? null, 'hard-coded Chinese in template: ' + (hit?.[0] ?? '')).toBeNull()
    })
  }
})
