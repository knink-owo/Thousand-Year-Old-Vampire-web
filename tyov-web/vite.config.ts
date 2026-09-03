/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages 子路径部署支持：构建时传 --base=/仓库名/ 或设置 BASE_PATH 环境变量
const basePath = process.env.BASE_PATH || '/'

// https://vite.dev/config/
export default defineConfig({
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
})