import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { defineConfig, type Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 单文件构建：把 JS / CSS / 资源全部内联进同一个 index.html，
// 产出可直接双击（file://）运行的离线版本。
// 与 vite.config.ts（在线 / PWA 版）互不影响，独立输出到 dist-singlefile/。

const rootDir = dirname(fileURLToPath(import.meta.url))

/**
 * 把 public/favicon.svg 内联为 data URI。
 * 单文件在 file:// 下以绝对路径 /favicon.svg 引用会失效，内联后彻底自包含。
 */
function inlineFavicon(): Plugin {
  return {
    name: 'tyov-inline-favicon',
    transformIndexHtml(html) {
      try {
        const svg = readFileSync(resolve(rootDir, 'public/favicon.svg'), 'utf8')
        const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
        // 不依赖具体前缀（Vite 可能把 /favicon.svg 改写为 ./favicon.svg）
        return html.replace(/href="[^"]*favicon\.svg"/, `href="${dataUri}"`)
      } catch {
        return html
      }
    },
  }
}

export default defineConfig({
  base: './',
  // public/ 仅在在线版使用（PWA 图标等）；单文件版把 favicon 内联，无需复制
  publicDir: false,
  plugins: [vue(), tailwindcss(), inlineFavicon(), viteSingleFile()],
  build: {
    outDir: 'dist-singlefile',
    emptyOutDir: true,
  },
})
