# 千年吸血鬼 · Thousand Year Old Vampire

> 你永生不死。你将遗忘一切。

一款**单人、无 GM、日记式** TRPG 的网页数字工具：你扮演一尊始于十世纪的吸血鬼，在提示、掷骰与日记之间穿行千年。

- 在线游玩：<https://knink-owo.github.io/Thousand-Year-Old-Vampire-web/>
- 离线版：下载仓库根目录的 `千年吸血鬼-单文件版.html`，双击即可运行

## 这是什么

游戏改编自 **Tim Hutchings** 的 *Thousand Year Old Vampire*（2019）。没有主持人、没有骰子房规则之外的系统负担，只需要一颗 D10、一颗 D6 和你的文字。

- **核心循环**：读提示 → 写经历与日记 → 掷 D10 与 D6 → 差值决定在 80 条提示间前进或后退
- **五种特征**：记忆（5 槽、每段至多 3 条经历）、技能、资源、角色、印记
- **两种玩法**：快速模式速览一段人生；日志模式认真写一本吸血鬼传记
- **数据归属你**：存档只在本机浏览器，可离线游玩，可导出 / 导入 JSON

## 怎么玩

1. 首页点「开始旅程」，按规则书六步建卡，最后点「🩸 成为黑夜的生物」
2. 每回合：读提示 → 写一段经历（日志模式再写日记）→「完成这一回合，掷出命运之骰」
3. 右侧面板管理五种特征；效果提示附带执行引导，可一键处理或逐行撤回
4. 当被要求勾选技能或失去资源而两者皆无时，游戏结束

首页「阅读教程」按规则书原文讲解规则，末尾附完整游玩示例。

## 存档与备份

- 进度自动保存在当前浏览器（`localStorage`），刷新 / 关闭后可继续，**请勿使用无痕模式**
- 首页「未竟之旅」继续当前旅程；「翻阅历史」查看历次旅程摘要，已完结的旅程可只读回顾并导出日记 Markdown
- 建议定期「导出存档 JSON」备份；换设备时导入即可继续
- 可选匿名统计**默认关闭**；站点维护者启用时也只上报视图切换，不接触存档内容

## 离线单文件版

`tyov-web` 有两条互不影响的构建链：PWA 在线版与自包含单文件版。

- 根目录的 `千年吸血鬼-单文件版.html` 是**发布产物**，随版本更新
- `file://` 下 `localStorage` 可能不可靠：页面顶部会提示绑定一个本地备份文件（Chromium 系），存档同时写入该文件
- 已下载的旧副本可以继续玩，存档键（`tyov:save:v1`）兼容新旧版本

## 本地运行

```bash
git clone https://github.com/knink-owo/Thousand-Year-Old-Vampire-web.git
cd Thousand-Year-Old-Vampire-web/tyov-web
npm install
npm run dev
```

要求 Node.js ≥ 20。全部命令、测试与发布流程见 [docs/DEVELOPING.md](docs/DEVELOPING.md)。

## 文档

- [架构说明](docs/ARCHITECTURE.md)：技术栈、分层、引擎规则、存储
- [开发与发布](docs/DEVELOPING.md)：命令、测试、E2E、发版步骤
- [数据管线](docs/pipeline.md)：从规则书 PDF 到提示包
- [更新日志](CHANGELOG.md)
- [史料](docs/history/)：一次完整实测的旅程与问题报告

## 版权与许可

- **源代码**以 MIT 许可证发布，见 [LICENSE](LICENSE)
- **游戏文本**（提示包、规则、示例旅程）版权归 Tim Hutchings 所有，仅限个人学习与游玩；MIT 不覆盖这些内容，详见 [NOTICE.md](NOTICE.md)
- 官方网站：<https://www.thousandyearoldvampire.com/> · itch.io：<https://timhutchings.itch.io/tyov>
