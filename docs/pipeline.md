# 提示包数据管线

项目内置两份结构完全对等的提示包：

| 包 | 语言 | 来源 |
|---|---|---|
| `tyov-web/src/data/official-pack.json` | 中文 | 规则书中文翻译版 PDF 自动提取 + 人工审校 |
| `tyov-web/src/data/official-pack.en.json` | 英文 | **官方英文原书**逐字抽取，效果数组对齐中文包 |

两份包的条目数、效果类型序列由 `src/engine/pack.parity.test.ts` 锁死。脚本在 `tools/pipeline/`。

| 步骤 | 脚本 | 输入 → 输出 |
|---|---|---|
| 1 抽取 | `extract_pdf.py` | `千年版规则书.pdf` → `规则书全文.txt`（PyMuPDF） |
| 2 切分 | `parse_prompts.py` | 全文 → `src-data/prompts_raw.json`（按视觉段落切 1–3 条目） |
| 3 提效果 | `extract_effects.py` | raw → `src-data/prompts.json` + `effects_audit.txt` |
| 4 校验 | `verify_pack.py` | 编号连续、条目结构、效果类型合法性 |
| 5 入库 | 人工审校 | 复制为 `official-pack.json` 并提交 |

## 英文管线

英文包**不翻译中文包**，只从英文原书取正文：

| 步骤 | 脚本 | 说明 |
|---|---|---|
| 1 抽取 | `extract_pdf.py` / 纯文本导出 | 输出 `tools/pipeline/data/rulebook-en.txt` |
| 2 切分 | `parse_prompts_en.py` | 按 `1a/1b/…` 标题切分 → `src-data/prompts_raw-en.json` |
| 3 对齐 | `align_pack.py` | 正文取英文、效果数组取中文包；英文书名从原句抽取 |
| 4 校验 | `verify_bilingual.py` | 结构对等 + 无中文残留 + **每条英文都能在原文中逐字命中** |

`tools/pipeline/align_overrides.en.json` 记录两类人工干预：`notes`（我们自己的规则注解，非原书文字）与 `textFixes`（纯文本导出的残留修补，逐条写明原因）。

## 约定

- 中间产物统一放 `src-data/`（已 gitignore，不提交）
- 规则书 PDF、全文、wiki 原文均属版权材料，已在 `.gitignore` 中排除
- 新增效果类型时，同步更新 `types/game.ts` 的联合类型与 `effectActions.ts` 的模式表

> 版权：提示文本版权归 Tim Hutchings 所有，本项目仅作个人学习与非商业游玩用途，详见 [NOTICE.md](../NOTICE.md)。
