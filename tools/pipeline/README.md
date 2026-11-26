# 数据管线

规则书 PDF → 结构化提示包的五步流水线（开发期脚本，不参与生产构建）。

| 步骤 | 脚本 | 输入 → 输出 |
|---|---|---|
| 1 抽取 | `extract_pdf.py` | `千年版规则书.pdf` → `规则书全文.txt` |
| 2 切分 | `parse_prompts.py` | 全文 → `src-data/prompts_raw.json` |
| 3 提取效果 | `extract_effects.py` | raw → `src-data/prompts.json` + `effects_audit.txt` |
| 4 校验 | `verify_pack.py` | 校验编号连续、条目结构、效果类型 |
| 5 入库 | 人工审校 | `tyov-web/src/data/official-pack.json` |

英文包（不翻译中文包，只从英文原书取正文）：

| 步骤 | 脚本 | 输入 → 输出 |
|---|---|---|
| E1 | `parse_prompts_en.py` | `data/rulebook-en.txt` → `src-data/prompts_raw-en.json` |
| E2 | `align_pack.py` | 中文包 + raw → `tyov-web/src/data/official-pack.en.json` |
| E3 | `verify_bilingual.py` | 结构对等 / 无中文残留 / 逐字命中原文 |

`data/` 与 `src-data/` 均在 .gitignore 中；版权材料不得提交。

依赖：`pymupdf`（仅第 1 步）。

> 版权：规则书 PDF、全文与 `src-data/` 均在 `.gitignore` 中排除，不得提交。
