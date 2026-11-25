# 提示包数据管线

内置中文提示包（`tyov-web/src/data/official-pack.json`，80 提示 · 222 条目）由规则书 PDF 自动提取 + 人工审校而来。脚本在 `tools/pipeline/`。

| 步骤 | 脚本 | 输入 → 输出 |
|---|---|---|
| 1 抽取 | `extract_pdf.py` | `千年版规则书.pdf` → `规则书全文.txt`（PyMuPDF） |
| 2 切分 | `parse_prompts.py` | 全文 → `src-data/prompts_raw.json`（按视觉段落切 1–3 条目） |
| 3 提效果 | `extract_effects.py` | raw → `src-data/prompts.json` + `effects_audit.txt` |
| 4 校验 | `verify_pack.py` | 编号连续、条目结构、效果类型合法性 |
| 5 入库 | 人工审校 | 复制为 `official-pack.json` 并提交 |

## 约定

- 中间产物统一放 `src-data/`（已 gitignore，不提交）
- 规则书 PDF、全文、wiki 原文均属版权材料，已在 `.gitignore` 中排除
- 新增效果类型时，同步更新 `types/game.ts` 的联合类型与 `effectActions.ts` 的模式表

> 版权：提示文本版权归 Tim Hutchings 所有，本项目仅作个人学习与非商业游玩用途，详见 [NOTICE.md](../NOTICE.md)。
