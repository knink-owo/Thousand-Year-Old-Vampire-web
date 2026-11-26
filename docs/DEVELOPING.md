# 开发与发布

## 环境

- Node.js ≥ 20（CI 使用 22）
- 包管理：npm（锁文件为 `package-lock.json`）

## 命令（唯一出处）

```bash
cd tyov-web
npm install          # 安装依赖

npm run dev          # 开发服务器 http://localhost:5173
npm run lint         # ESLint（CI 门禁）
npm run lint:fix     # 自动修复
npm test             # Vitest 单测（76 项）
npm run build        # 类型检查 + PWA 构建 → dist/
npm run build:singlefile  # 单文件离线版 → dist-singlefile/，并同步到仓库根目录
npm run build:all    # 两个版本一起构建
npm run preview      # 预览生产构建
```

提交前至少跑：`npm run lint && npm test && npm run build`。

## 测试

- **单元测试**：`src/engine/*.test.ts`（引擎、效果引导、双语包 parity）、`src/stores/game.test.ts`（回合结算时序）、`src/views/GameView.test.ts`、`src/i18n/*.test.ts`（字典一致性、模板汉文守卫）
- **E2E**：`tools/e2e/`，Playwright + 系统 Edge，默认连 `http://127.0.0.1:5199/`

```bash
# 终端 A
cd tyov-web && npm run dev -- --port 5199

# 终端 B
python tools/e2e/smoke.py      # 建卡 → 游玩 → 掷骰
python tools/e2e/create.py     # 建卡规则
python tools/e2e/home.py       # 首页 / 历史流
python tools/e2e/review.py     # 完结快照回顾
python tools/e2e/regression.py # 存档导入导出
python tools/e2e/quota.py      # 存储配额满
python tools/e2e/privacy.py    # 无网络外发断言
python tools/e2e/resume.py     # 刷新续玩
python tools/e2e/lang.py       # 中英切换、html lang、偏好持久化
python tools/e2e/live.py       # 线上部署冒烟
```

公共常量（Edge 路径、URL）在 `tools/e2e/_common.py`。

## 代码约定

- 领域逻辑放 `engine/` 纯函数或 `stores/` 领域模块；组件只做交互与展示
- 新增效果类型：`types/game.ts` → `packLoader.ts` → `effectActions.ts` → `effectLabels.ts`
- UI 文案使用"千年叙事体"：第二人称、动词按钮、意象化状态语
- **UI 文案一律走 `t('key')`**：先加到 `src/i18n/zh.ts`，`en.ts` 缺键会编译失败；模板里出现中文字面量会被 `template-guard.test.ts` 拦下
- 教程等长文本放 `src/content/`，中英各一份，章节结构保持一一对应
- 不做网络请求；所有数据留在浏览器

## 可选统计（Umami）

默认**不发送任何请求**。需要统计时，在 `tyov-web/.env.production`（或 CI 环境变量）中同时设置两个变量：

```bash
VITE_UMAMI_SRC=https://stats.knink.top/script.js
VITE_UMAMI_WEBSITE_ID=5014aaaa-7e32-426f-be07-62d39b4069b3
```

构建时才会把 `<script data-do-not-track>` 注入 `index.html`；未设置则产物里没有该标签。单文件离线版不包含此插件，且 `file://` 下 `analytics.ts` 强制禁用。

### 给 GitHub Pages 线上站启用

1. 仓库 **Settings → Secrets and variables → Actions → Variables** 新建两条：
   `VITE_UMAMI_SRC`（如 `https://umami.example.com/script.js`）、`VITE_UMAMI_WEBSITE_ID`
2. Umami 后台该网站的 **Domain** 填 `knink-owo.github.io`（留空则不校验来源）
3. 推送 `main` 即重建并部署；工作流带一步校验，配了 ID 却未注入会直接失败

> 要求统计服务是 **HTTPS**：Pages 是 https，混合内容会被浏览器拦截。

- 只上报视图切换事件 `view`（home / create / game / finish / history / review / tutorial）
- 不上报任何游戏内容、存档数据或可识别个人的信息
- 需要自定义事件时用 `trackEvent(name, data)`，`data` 里同样不要放游戏内容

## 发布

1. 更新 `CHANGELOG.md` 与 `tyov-web/package.json` 的版本号
2. 重新生成单文件成品并替换根目录副本：

   ```bash
   cd tyov-web && npm run build:singlefile
   cp dist-singlefile/index.html "../千年吸血鬼-单文件版.html"
   ```

3. 提交后打标签并推送：

   ```bash
   git tag v1.0.0 && git push origin main --tags
   ```

推送 `main` 触发 Pages 部署（`.github/workflows/deploy.yml`）；推送 `v*` 标签触发 Release（`.github/workflows/release.yml`），产物含单文件版与 `dist` 压缩包。

> 单文件成品是**派生产物**：只在发版时更新，避免出现"仓库里是新的、下载的是旧的"。已下载的旧副本不受影响，存档键（`tyov:save:v1`）兼容新旧版本。
