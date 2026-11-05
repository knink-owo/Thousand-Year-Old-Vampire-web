# tyov-web

《千年吸血鬼》网页工具的应用源码：Vue 3 + TypeScript + Vite + Pinia + Tailwind CSS。

完整介绍与使用说明见仓库根目录 [README.md](../README.md)，架构、规则引擎与开发约定见 [开发文档.md](../开发文档.md)。

## 常用命令

```bash
npm install
npm run dev               # 开发服务器 http://localhost:5173
npm test                  # Vitest 单元测试（42 项）
npm run build             # 类型检查 + PWA 生产构建 → dist/
npm run build:singlefile  # 单文件离线版 → dist-singlefile/
npm run preview           # 预览生产构建
```

源码入口 `src/main.ts`，视图状态机在 `src/App.vue`，规则引擎在 `src/engine/`，状态与存档在 `src/stores/game.ts`，内置中文提示包在 `src/data/official-pack.json`。
