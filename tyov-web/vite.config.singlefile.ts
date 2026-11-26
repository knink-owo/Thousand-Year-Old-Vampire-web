import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { defineConfig, type Plugin } from 'vite'
import { copyFileSync, readFileSync } from 'node:fs'
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

/**
 * 在产物头部写入版本与构建日期：用于识别仓库里的单文件成品是否已过期。
 */
function stampVersion(): Plugin {
  return {
    name: 'tyov-stamp-version',
    transformIndexHtml(html) {
      try {
        const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8')) as { version?: string }
        const stamp = new Date().toISOString().slice(0, 10)
        return `<!-- tyov-web v${pkg.version ?? '0.0.0'} · built ${stamp} -->\n${html}`
      } catch {
        return html
      }
    },
  }
}

/**
 * 构建完成后把成品同步到仓库根目录（`千年吸血鬼-单文件版.html`）。
 * 发布产物与构建脚本因此不会走样：以前这一步靠手工复制，容易忘记。
 */
function publishToRepoRoot(): Plugin {
  return {
    name: 'tyov-publish-singlefile',
    closeBundle() {
      try {
        copyFileSync(
          resolve(rootDir, 'dist-singlefile/index.html'),
          resolve(rootDir, '../千年吸血鬼-单文件版.html'),
        )
      } catch {
        // 构建仍算成功：根目录文件无法写入时不影响 dist-singlefile/ 的正确性
      }
    },
  }
}

export default defineConfig({
  base: './',
  // public/ 仅在在线版使用（PWA 图标等）；单文件版把 favicon 内联，无需复制
  publicDir: false,
  plugins: [vue(), tailwindcss(), inlineFavicon(), stampVersion(), viteSingleFile(), publishToRepoRoot()],
  build: {
    outDir: 'dist-singlefile',
    emptyOutDir: true,
  },
})
