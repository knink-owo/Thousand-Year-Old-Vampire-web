# 架构

面向开发者的技术说明：技术栈、分层、规则引擎、状态管理与存储。运行与发布流程见 [DEVELOPING.md](DEVELOPING.md)。

## 技术栈

| 项 | 选择 |
|---|---|
| 框架 | Vue 3（`<script setup>`）+ TypeScript |
| 构建 | Vite 8（PWA 版 / 单文件版两条链） |
| 状态 | Pinia（setup store，按领域拆分为多个工厂） |
| 样式 | Tailwind CSS 4 + `src/style.css` 里的哥特古书主题变量 |
| 测试 | Vitest + jsdom（42 项）、Playwright E2E（`tools/e2e`） |
| 存储 | 浏览器 `localStorage`，四键；无后端、无网络外发 |

## 目录

```
tyov-web/src/
├── main.ts              应用入口
├── App.vue              视图状态机 home/create/game/finish/tutorial/history/review
├── types/game.ts        全部领域类型
├── data/official-pack.json  内置提示包（80 提示 · 222 条目）
├── engine/              纯函数：规则、效果分类、提示包、备份文件
├── stores/
│   ├── game.ts          装配层：state / computed / 各域动作
│   ├── context.ts       GameCtx 契约 + uid / logText / createEmptyGame
│   ├── persistence.ts   localStorage 安全层 + 存档 / 历史 / 快照
│   ├── turn.ts          回合推进与终局锁定
│   ├── memory.ts        记忆域
│   ├── skill.ts         技能域（含记忆转技能）
│   ├── resource.ts      资源域
│   ├── character.ts     角色域
│   ├── mark.ts          印记域
│   └── io.ts            导入导出 / 备份文件 / 新游戏
├── composables/usePanelDialogs.ts  特征面板共用的弹层状态
├── views/               页面级组件
└── components/
    ├── TraitPanel.vue   五特征面板壳（tab 栏 + 弹层宿主）
    └── trait-panel/     六个 tab 子组件
```

## 领域模型

五种特征（`types/game.ts`）：

| 类型 | 要点 |
|---|---|
| `Memory` | 5 槽；每段至多 3 条 `Experience`；`inDiary` / `stabilized` / `forgotten` / `title` |
| `Skill` | `checked`（已使用）/ `lost` |
| `Resource` | `fixed` / `lost` / `isDiary` / `artifact`（提示10） |
| `Character` | `immortal` / `dead` / `isGhost` |
| `Mark` | `removed` / `crippled`（提示61） |

`GameState` 为单一根对象，额外字段：

- `effectProgress`：效果执行进度，键 `提示号:条目号:效果下标`，刷新不丢
- `entryVerdict`：进入条目时锁定的终局结论（`提示号:条目号`）
- `agingAcknowledgedAt`：岁月流逝提醒的跨会话锚点
- `dreamWorld`：提示 48 第 3 条目已踏入梦境之地

## 回合引擎（engine/core.ts，纯函数）

- **移动** `rollMove`：D10 − D6；正数向后、负数向前、0 停留；不越过提示 1 / 末条
- **条目** `entryIndexFor` / `advancePrompt`：第 N 次触达用第 N 条；单条目提示恒用 1；三条目用尽强制前进
- **替代规则** `checkAlternative`：勾选技能 ↔ 失去资源互相替代，两者皆无 → 游戏结束
- **终局锁定** `entryVerdict`：判定基准是"读到提示的那一刻"。`turn.ts` 在进入条目时算一次、写入 `GameState.entryVerdict`；提交回合只读取，绝不用玩家照做后的状态复判
- **记忆放置** `placeExperienceDecision`：可并入 / 可新建 / 全满 `mustResolve`
- **效果引导** `effectActions.ts`：56 种 `Effect` → auto / select / input / manual / read 五种处理模式

## 状态管理

`stores/game.ts` 只做装配：

```ts
const ctx: GameCtx = { state, pack, currentPrompt, currentEntryIndex, persist, touchRecord, ... }
const skill = createSkillActions(ctx)
const resource = createResourceActions(ctx)
ctx.addResource = resource.addResource      // 跨域钩子按依赖顺序注入
const turn = createTurnActions(ctx)         // 内部回注 ctx.lockVerdict / ctx.startGame
```

约定：领域模块只 import `GameCtx` 与 `engine/`，**彼此不互相 import**；跨域调用一律走 `ctx` 钩子。新增动作时先判断它属于哪个域，避免再把逻辑堆回 `game.ts`。

## 存储

| 键 | 内容 |
|---|---|
| `tyov:save:v1` | 当前存档（完整 `GameState`） |
| `tyov:history:v1` | 历史摘要（上限 20） |
| `tyov:history:full:v1` | 完结快照（仅完结时写入，配额不足从最旧丢弃） |
| `tyov:pack:v1` | 自定义提示包 |

所有读写经 `safeGet/safeSet/safeRemove`；失败不中断游戏，只置 `storageWarning`。数据只在本地，**默认没有任何网络外发**；仅当部署方配置 Umami 时，才会向该实例发送匿名视图统计（`view` 事件，不含存档内容），见 [DEVELOPING.md](DEVELOPING.md)。

## 构建

- `vite.config.ts`：PWA（`autoUpdate` + Workbox），`base` 支持 `--base` / `BASE_PATH`
- `vite.config.singlefile.ts`：`vite-plugin-singlefile` 内联 JS/CSS，favicon 转 data URI，产物可 `file://` 直接打开

## 已知边界

- 无 AI 写作辅助、无账号、无云同步
- `file://` 下 `localStorage` 可能不可用，需绑定备份文件（Chromium 系）
- 无痕模式下存档会丢失，属设计约束
