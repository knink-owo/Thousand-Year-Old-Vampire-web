# 千年吸血鬼 · Thousand Year Old Vampire 网页版

单人日记式 TRPG 的网页数字工具。基于规则书《千年老吸血鬼》中文翻译版制作，包含建卡、D10−D6 提示移动回合引擎、记忆/技能/资源/角色/印记五特征管理、日志写作、存档导入导出。

## 本地运行

```bash
cd tyov-web
npm install
npm run dev        # 开发模式：http://localhost:5173
npm run build      # 生产构建：输出 dist/
npm run preview    # 预览生产版
npm test           # 单元测试
```

## 部署到 GitHub Pages（自动）

本项目已配置 GitHub Actions：**推送 `main` 分支后自动构建并发布**。

### 一次性设置（约 3 分钟）

1. **创建 GitHub 仓库**（如 `tyov-vampire`），并推送本目录代码：
   ```bash
   git init
   git add .
   git commit -m "初版：千年吸血鬼网页工具"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
2. **开启 GitHub Pages**：
   - 仓库 → **Settings** → **Pages**
   - Source 选择 **GitHub Actions**（而不是"Deploy from a branch"）
   - 之后每次 push 到 main，Actions 会自动构建部署
3. **访问地址**：`https://<你的用户名>.github.io/<仓库名>/`
   - 构建时已自动使用 `/仓库名/` 子路径，资源路径不会 404

### 手动构建验证（可选）

```bash
cd tyov-web
npm run build -- --base=/你的仓库名/   # 模拟线上子路径
npm run preview                        # 检查资源路径是否正确
```

## 提示包（重要）

- 应用内置了从规则书提取的官方提示包（`src/data/official-pack.json`，80 条提示、222 个条目）。
- **规则书 PDF 与提取文本不提交到仓库**（见根目录 `.gitignore`）。
- 界面为"壳工具"设计：提示包是独立数据层，可在建卡页导入/导出自定义或社区提示包。

## 技术栈

Vue 3 + TypeScript + Vite + Pinia + Tailwind CSS + vite-plugin-pwa（离线可用）