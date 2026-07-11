# dg-skills

个人通用 Claude Code skills 集合，以 marketplace 形式对外发布。仓库里每个 skill 都必须满足「clone 走能在任何项目里直接用」的标准。

## 目录结构

```
dg-skills/
├── .claude-plugin/marketplace.json    # 插件市场清单（必须与 skills/ 同步）
├── skills/
│   └── {skill-name}/
│       ├── SKILL.md                   # 主文档（≤500 行）
│       ├── references/                # 渐进式披露的参考文档（仅一级深）
│       └── scripts/                   # 可选：辅助脚本
├── README.md
└── LICENSE
```

## 设计原则（硬约束）

**通用优先**：本仓库只收录通用 skill。任何强依赖特定仓库的目录结构、CI 配置、部署目标的 skill，归目标仓库的 `.claude/skills/`，不进这里。

判断标准：「这个 skill 是否依赖特定目标仓库的目录结构、CI 配置、部署目标？」
- 否 → 通用 skill，放本仓库
- 是 → 专属 skill，放目标仓库 `.claude/skills/`

**复用既有工具**：不重新造轮子。如果某功能已有成熟工具（CLI、npm 包、其他 skill 等），优先调用而非重新实现。

## Skill 编写规范

参考 [官方最佳实践](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) 与 `~/.claude/plugins/marketplaces/baoyu-skills/docs/creating-skills.md`。

**frontmatter 必需字段：**
- `name`：≤64 字符，仅小写字母/数字/连字符
- `description`：≤1024 字符，第三人称，写清「做什么 + 何时使用 + 不做什么（边界）」
- `version`：语义化版本

**body 约束：**
- SKILL.md ≤ 500 行；超出的细节拆到 `references/`
- 引用只能一级深（SKILL.md → references/xxx.md，不能再嵌套）
- 有脚本时必须包含 `## Script Directory` 段落
- 提示用户选择时必须包含 `## User Input Tools` 段落（**必须内联，不能 link**）

**何时该写 `scripts/`：**
- **一次性能收集完所有需要的状态信息**——避免 Claude 多次往返调用同一组命令（如 `collect-status.sh` 一次输出 BRANCH/STATUS/DIFFSTAT/COMMIT-CONTEXT，替代 4-5 次单独的 git 调用，省 token + 保证一致）
- **需要固化采集逻辑**——脚本让状态采集可预期，避免每次 Claude 临场拼命令出现偏差
- **涉及平台兼容的文本处理**——脚本里统一用 bash 内置 + 命令本身，避免 macOS/Linux 的 sed/awk/grep 行为差异

**不该写脚本的情况：**
- 单次命令调用（直接让 Claude 跑即可）
- 需要灵活判断、临场决策的逻辑（让 Claude 处理更合适）

当前仓库的示例：
- `dg-git-push/scripts/collect-status.sh`——一次性收集 git 状态

## 新增 skill 的检查清单

1. 在 `skills/{name}/` 下创建 `SKILL.md`（含合规 frontmatter）
2. 在 `.claude-plugin/marketplace.json` 的 `plugins[0].skills` 数组追加 `"./skills/{name}"`
3. 在 `README.md` 的 Skills 表格登记一行
4. 若有 `scripts/`，SKILL.md 内必须出现 `## Script Directory` 段落

## 编辑现有 skill 的注意事项

- 改完 frontmatter 的 `version` 要同步升级（语义化）
- **版本同步规则（重要）**：所有 skill 的 frontmatter `version` + `package.json` `version`（如有）+ `marketplace.json` 的 `metadata.version` + CLAUDE.md「现有 skills」表格版本列 **必须完全相同**——仓库永远只有一份版本号。
  - 任何 skill 改动都同步 bump 所有版本号，bump 级别按本次变动的最高级别：
    - 任何 skill **patch** 改动 → 所有版本一起 patch bump（如 2.7.0 → 2.7.1）
    - 任何 skill **minor** 改动 → 所有版本一起 minor bump（如 2.7.0 → 2.8.0，patch 归 0）
    - 任何 skill **major** 改动 → 所有版本一起 major bump（如 2.7.0 → 3.0.0，minor/patch 归 0）
    - 多个 skill 同时改动时，按最高级别为准
  - **新增 skill**：新 skill 加入时直接用当前统一版本号（不是从 1.0.0 起，否则破坏一致性）
  - **删除 skill**：其他 skill 没变，版本号不动
  - 除了 skill 文件和 marketplace.json，还要同步更新 CLAUDE.md「现有 skills」表格里的版本列
- 不要为了"清理"而删除 `references/` 下被 SKILL.md 引用的文件——先全局搜引用

## 本地开发安装

软链接到本地 marketplace 目录（假设仓库 clone 到 `~/dg-skills`，源码改动即时生效）：

```bash
ln -s ~/dg-skills ~/.claude/plugins/marketplaces/dg-skills
```

`~/.claude/settings.json` 启用：
```json
{ "plugins": { "marketplaces": { "dg-skills": true } } }
```

## 现有 skills

| Skill | 版本 | 职责 |
|-------|------|------|
| `dg-git-push` | 2.7.2 | 分析 git 改动 → 生成中英 Conventional Commits message → 报告（目标分支 + message + 文件 + 分析）→ 确认后 add + commit + push 一条龙 |
| `dg-how-to-learn` | 2.7.2 | 输入一个学习资料文件夹 → 生成学习指南（3 段：嵌套列表资料清单 + 主题概述 + 文件维度学习路径）。学习路径直接回答「先学哪几个文件、后学哪几个、最后学哪几个」，每个文件含「讲什么（含体系位置）+ 怎么学」。派 subagent 并行处理文件夹内每个文件。产物整合到 `dg-how-to-learn/{name}/`（AI 推荐目录名 + 用户选/自定义）。当前**只支持文件夹输入**、**不生成题库/测试**（未来版本再加）。可选 `--obsidian` 转义 `<` 防 Obsidian 解析扰乱 |
| `dg-douban-book` | 2.7.2 | 输入书名（可选作者）→ Playwright 抓豆瓣搜索 → **直接返豆瓣算法 top 1 单条结果**（书名 / 作者 / 出版社 / 出版年 / 评分 + 评分人数 / 豆瓣链接）。**主书名匹配判断精确/模糊**（按冒号切主书名，兼容「主书名相同 + 副标题不同」如「如何共读一本书」↔「如何共读一本书 : 高效引导社群学习」）；模糊时首句明确「豆瓣未收录」+ 给算法 top 1。**v2.0.1 起输出极简**（删装饰/排查建议、URL 改裸文字）。豆瓣搜索是 JS 动态渲染，所以用 Node.js + Playwright；首次跑自动 `npm install` 装 playwright（约 200MB）。**v2.0.0 起只返 Top 1**（v1.x 是 Top 3-5 候选列表）、**不抓书评/详情页**、**仅图书**（不含电影/音乐）。**v2.7.2 起 PoW 自动绕过 + cookie 持久化**（`/tmp/douban-state.json`），触发反爬时自动点击 `#sub` 按钮通过挑战页 |

## 通用 vs 专属的判断示例

| Skill | 位置 | 理由 |
|-------|------|------|
| `dg-git-push` | 本仓库（通用） | 任何 git 仓库都能用，不依赖特定目录结构 |
| `dg-translate-tech-docs` | 目标仓库 `.claude/skills/`（专属） | 产物格式 `.source-version.json` 专为下游 `dg-import-docs` 设计——曾放在本仓库，已于 2026-06 迁至 `dg-docs-cn` |
| `dg-import-docs` | 目标仓库 `.claude/skills/`（专属） | 绑定特定仓库的目录结构与 `.project.json` schema |
| `dg-translate-and-import` | 目标仓库 `.claude/skills/`（专属） | 编排上述两个 skill，绑定特定工作流 |

## 常见任务速查

**调试 skill**：
- **通用原则**：任何带 `scripts/` 的 skill，先用 `bash scripts/<script>.sh <args>` 独立验证脚本工作正常，再让 Claude 调用整个 skill
- **dg-git-push**：用 `collect-status.sh <path>` 在目标仓库验证状态采集——BRANCH（含 ahead/behind）/ STATUS / DIFFSTAT / COMMIT-CONTEXT 四段是否完整、untracked 是否被列出、无 remote / 无 upstream 等边界是否正确标记 `(none)` / `(n/a)`
- **dg-douban-book**：先在 skill/scripts 目录跑 `npm install`（首次），再用 `node scripts/douban-search.js --title=三体` 独立验证 JSON 输出。重点看：① selector 是否还有效（豆瓣改版会让 `.item-root` 失效）；② status 字段是否正确（ok/empty/blocked/error）；③ meta 行解析（作者/出版社/年份）是否合理。豆瓣 selector 易变，调脚本时优先调 `page.$$eval` 的子 selector 候选列表
