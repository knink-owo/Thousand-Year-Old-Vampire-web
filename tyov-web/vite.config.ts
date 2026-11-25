/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * 可选统计：只有同时设置 VITE_UMAMI_SRC 与 VITE_UMAMI_WEBSITE_ID 时才注入 Umami 脚本。
 * 默认（不设置）完全不产生外部请求；单文件构建链不包含此插件。
 */
function injectUmami(env: Record<string, string>): Plugin {
  return {
    name: 'tyov-inject-umami',
    transformIndexHtml(html) {
      const src = env.VITE_UMAMI_SRC
      const id = env.VITE_UMAMI_WEBSITE_ID
      if (!src || !id) return html
      const tag = `  <script defer src="${src}" data-website-id="${id}" data-do-not-track="true"></script>\n`
      return html.replace('</head>', `${tag}  </head>`)
    },
  }
}

export default defineConfig(({ mode }) => {
  // GitHub Pages 子路径部署支持：构建时传 --base=/仓库名/ 或设置 BASE_PATH 环境变量
  const basePath = process.env.BASE_PATH || '/'
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: basePath,
    server: {
      watch: {
        // 忽略编辑器原子写入产生的瞬时临时目录（避免 EBUSY 崩溃）
        ignored: ['**/*.tmpdir/**', '**/*.tmp', '**/.tmp/**'],
      },
    },
    plugins: [
      vue(),
      tailwindcss(),
      injectUmami(env),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: '千年吸血鬼',
          short_name: '千年吸血鬼',
          description: '单人日记式 TRPG —— 记录一个吸血鬼跨越千年的不死生活',
          theme_color: '#1a0d0d',
          background_color: '#100808',
          display: 'standalone',
          lang: 'zh-CN',
          icons: [
            {
              src: 'icons.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          // 子路径部署时 SPA fallback
          navigateFallback: 'index.html',
        },
      }),
    ],
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts'],
    },
  }
})
