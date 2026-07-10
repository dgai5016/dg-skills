---
name: dg-douban-book
description: Searches Douban Books (book.douban.com) for a given title (optionally with author) and returns Douban's algorithmic Top 1 result directly (title / author / publisher / year / rating / rating-count / Douban URL) — no candidate list. Trusts Douban's search ranking (no script-side score reranking). Distinguishes exact matches from fuzzy ones via main-title extraction (handles "query = main title, result = main title : subtitle" cases — e.g. query "如何共读一本书" matches result "如何共读一本书 : 高效引导社群学习" because the main titles are equal). When Douban's top 1 is a fuzzy match (different main title, e.g. 共读 vs 阅读), explicitly reports "豆瓣未收录" and presents the top 1 as "豆瓣算法返回的最相关结果" with troubleshooting hints. Use when the user says "/dg-douban-book", "/douban-book", "豆瓣搜书", "豆瓣找书", "找下这本书在豆瓣的评分", "这本书豆瓣几分", or wants book metadata from Douban. Uses Playwright (Node.js) because Douban's search results are client-side rendered (curl/WebFetch cannot get them). Auto-installs playwright on first run. Does NOT return a Top 3-5 candidate list (only Top 1), does NOT fetch reviews/short-comments, does NOT cover movies/music, does NOT cache results.
version: 2.7.1
metadata:
  openclaw:
    homepage: https://github.com/dgai5016/dg-skills#dg-douban-book
    requires:
      nodeModules:
        - playwright
---

# Douban Book (search → Top 1 metadata)

把"用户给书名（可选作者）→ 跑 Playwright 抓豆瓣搜索结果 → 渲染成豆瓣算法 top 1 的单条卡片"打包成一条命令。直接信任豆瓣的搜索排序，**不做脚本侧评分重排**（v1.x 的 `scoreOf` 已删除——豆瓣搜索算法本来就按相关度排好了，重排反而会把冷门精确匹配挤出去）。

> **v2.0.0 重大变更**：定位从「Top 3-5 候选列表」改为「Top 1」。如需恢复候选列表，见 [Extension Support](#extension-support)。

**职责边界（重要）：**

- ✅ **做**：解析书名/作者、跑 Playwright 抓豆瓣搜索结果页、**直接取豆瓣算法 top 1**（不再评分重排）、**主书名匹配判断精确/模糊**（按冒号切主书名，兼容「主书名相同 + 副标题不同」场景，如「如何共读一本书」匹配「如何共读一本书 : 高效引导社群学习」）、渲染单条结果卡片（含链接/评分/作者/出版社/出版年）、首次跑自动装 playwright、处理反爬/空结果/网络错误
- ❌ **不做**：返回 Top 3-5 候选列表（v2.0.0 起只返 top 1）、脚本侧评分重排、抓书评/短评、抓电影/音乐（仅图书）、抓详情页（页数/ISBN/封面/简介）、缓存搜索结果、并发批量搜索

## User Input Tools

When this skill prompts the user, follow this tool-selection rule (priority order):

1. **Prefer built-in user-input tools** exposed by the current agent runtime — e.g., `AskUserQuestion`, `request_user_input`, `clarify`, `ask_user`, or any equivalent.
2. **Fallback**: if no such tool exists, emit a plain-text prompt and wait for the user's reply.
3. The confirmation step for "install playwright" (`安装` / `ok` / `继续`) is a single yes/no-style prompt — use whichever mechanism the runtime provides for binary confirmation; do NOT batch it with other questions.

Concrete `AskUserQuestion` references below are examples — substitute the local equivalent in other runtimes.

## Script Directory

Scripts in `scripts/` subdirectory. `{baseDir}` = this SKILL.md's directory path.

| Script | Purpose |
|--------|---------|
| `scripts/douban-search.js` | Playwright-based Douban book search: launch chromium → load search page → parse top 1 → emit JSON |

Usage:
```bash
node {baseDir}/scripts/douban-search.js --title=<书名> [--author=<作者>]
```

- 必填：`--title`（书名）
- 可选：`--author`（作者，v2.0.0 后不再用于排序加权——评分重排已删除；保留参数为未来扩展）
- Exit code 永远是 0；错误用 JSON 的 `status` 字段表达

### 依赖管理

脚本依赖 `playwright` npm 包（声明在 `{baseDir}/scripts/package.json`）。首次跑前需要：

```bash
cd {baseDir}/scripts && npm install
```

装一次约 200MB，本地 `node_modules` 永久保留，后续调用直接走。

**检测逻辑**：脚本启动时 `require('playwright')`，失败则输出 `status=error` + `message="playwright not installed. Run: cd <skill_dir>/scripts && npm install"`，Claude 收到后引导用户确认安装（见 Workflow Step 2）。

## Parameter Parsing

skill 接收一个 args 字符串（来自 `/dg-douban-book <args>`）。解析规则：

1. 用户可能用自然语言传参（如「三体 刘慈欣」「找下《三体》的评分」）。Claude 负责从自然语言中提取出书名（必填）和作者（可选），然后**拼成 `--title=... --author=...` 形式**调用脚本
2. **不要**直接把用户的自然语言整段塞给脚本——脚本只认 `--key=value` 形式
3. 书名含空格 / 特殊字符时，正常用 `--title="..."` 包裹（脚本会正确处理 `=` 后的所有内容）

**示例**：

| 用户输入 | 脚本调用 |
|---------|---------|
| `/dg-douban-book 三体` | `node ...js --title=三体` |
| `/dg-douban-book 三体 刘慈欣` | `node ...js --title=三体 --author=刘慈欣` |
| `找下《人类简史》在豆瓣的评分` | `node ...js --title=人类简史` |
| `豆瓣搜下 "Designing Data-Intensive Applications"` | `node ...js --title=Designing Data-Intensive Applications` |

## Workflow

### Step 1: 解析用户输入，提取 title / author

从自然语言中识别书名（必填）和作者（可选）。书名识别启发式：

- 引号内（《》"" ''）的内容优先当书名
- 没有 引号时，整个 args 当书名（最后一段中文姓名可能被当作者，但宁可不做也不误判）
- 用户明确说「作者 X」「X 著」时把 X 当作者

如果提取不出书名（如 args 为空），用 User Input Tools 反问用户。

### Step 2: 检查 playwright 依赖

跑 `test -d {baseDir}/scripts/node_modules/playwright`：

- **存在** → 直接跳到 Step 3
- **不存在** → 走 Step 2b

#### Step 2b: 询问安装

通过 User Input Tools 问用户：

```
首次使用 dg-douban-book 需要安装 playwright（约 200MB，一次性）。

  安装  → 我来跑 cd {baseDir}/scripts && npm install
  取消  → 退出本次搜索
```

- 用户回 `安装` / `ok` / `继续` / `y` → 执行 `cd {baseDir}/scripts && npm install`，装完继续 Step 3
- 用户回 `取消` / `n` / 拒绝 → 退出，不改任何状态

**不要**在未确认前自动跑 `npm install`（200MB 下载是用户应当知情同意的操作）。

### Step 3: 跑脚本

```bash
node {baseDir}/scripts/douban-search.js --title=<title> [--author=<author>]
```

解析输出的 JSON，拿到 `{ query, result, status, is_exact_match, message }`。`result` 是**单对象**（不是数组），含 `title / author / publisher / year / rating / rating_count / url / subject_id / is_exact_match`。

### Step 4: 渲染报告

**按 [references/output-template.md](references/output-template.md) 的极简模板输出**（v2.0.1 起，模板只保留书名 + 元信息 bullet + 裸 URL，删掉所有装饰）：

- `status=ok` 时**先看 `is_exact_match`**：
  - `true` → 「精确匹配」分支（仅书名带《》 + 5 个 bullet）
  - `false` → 「模糊匹配」分支（首句「⚠️ 豆瓣未收录《XXX》，给的是豆瓣算法 top 1」+ 主体）。**禁止**把模糊结果当成精确匹配渲染
- `empty` / `blocked` / `error` → 每场景一句提示
- `error` 且 message 含「not installed」→ playwright 未装场景，保持完整提示（带 `npm install` 命令）

### Step 5: 边界处理（已含在 Step 4）

不需要额外步骤——output-template.md 已经覆盖所有 `status` 的渲染分支。

## Failure Handling

### playwright 未安装（status=error，message 含 "not installed"）

按 Step 2b 处理（询问安装）。**不要**自动跑 `npm install`。

### 反爬触发（status=blocked）

通常表现为搜索结果为 0 且页面 title 含「登录/验证」。按 output-template.md 的 blocked 分支渲染。**不要**重试（重试只会再被频控）。建议用户等几分钟或浏览器登录后重试。

### 搜索 0 结果（status=empty）

按 output-template.md 的 empty 分支渲染，给三条排查建议（错别字 / 副标题 / 去掉作者重搜）。

### 网络失败 / 其他错误（status=error）

按 output-template.md 的 error 分支渲染，附 `<message>` 字段。**不要**自动重试。

### 脚本超时（>30s）

Playwright `goto` 超时阈值 30s。如果脚本卡住超过这个时间，会以 `status=error` 返回。处理同上。

## Scope Boundary

**不做**这些事（超出本 skill 职责）：

- ❌ 返回 Top 3-5 候选列表（v2.0.0 起只返豆瓣算法 top 1；如需候选列表，未来通过 flag 恢复，见 Extension Support）
- ❌ 脚本侧评分重排（直接信豆瓣搜索算法的排序——v1.x 的 `scoreOf` 已删除）
- ❌ 抓书评 / 短评 / 长评（v1 只用搜索结果页的元数据）
- ❌ 抓详情页（页数、ISBN、封面、简介、目录——v1 不做，避免成倍请求触发反爬）
- ❌ 抓电影 / 电视剧 / 音乐（仅图书，cat=1001）
- ❌ 缓存搜索结果（每次调用都是新请求；用户重复搜同一本书是可接受的）
- ❌ 批量多本书（一次一本书；批量需求留给未来扩展）
- ❌ 修改豆瓣任何状态（只读搜索）

## Extension Support

### 未来候选扩展

| 方向 | 说明 |
|------|------|
| 恢复 Top N 候选列表 | 加 `--top=N` flag（N=3-5），返回豆瓣 top N 卡片列表。v1.x 的默认行为，v2.0.0 移除。如用户对 top 1 不满意可启用 |
| 抓详情页补 ISBN / 页数 / 封面 / 简介 | 用户拿到 top 1 后，按需点详情页拿完整元数据（一次只点一本，规避反爬） |
| 电影 / 电视剧 / 音乐支持 | 新增 `--type=movie\|music` 参数，切到对应 cat |
| 批量多本书 | 输入文件列表，串行（不并发）搜多本 |
| 反爬增强 | 实测被频控时，加随机 UA + 1-2s 延迟 |
| selector 自动 fallback 库 | 豆瓣改版时，从多个候选 selector 中挑能用的（v1 已有 4 个候选，可扩展） |

### 调试 skill

**通用原则**：先用 `node scripts/douban-search.js --title=三体` 在命令行独立验证脚本工作正常（JSON 输出是否符合 schema、selector 是否还有效），再让 Claude 调用整个 skill。

**典型故障排查**：

| 现象 | 排查方向 |
|------|---------|
| `status=error` + "playwright not installed" | 跑 `cd {baseDir}/scripts && npm install` |
| `status=blocked` 频繁 | 浏览器登录 douban.com 后重试；或考虑加随机 UA + 延迟 |
| `status=empty` 但书名正确 | 检查 selector 是否还有效：手动开 `https://search.douban.com/book/subject_search?search_text=<书名>&cat=1001` 看页面结构 |
| 豆瓣 top 1 不是用户期望的书 | v2.0.0 起信任豆瓣算法排序；如不满意，未来通过 `--top=N` 恢复候选列表（待实现） |
| 评分 / 作者字段经常 `null` | meta 行解析启发式不准——`parseMeta` 函数需调整 |
| `is_exact_match` 判断不准（漏判/误判） | 检查 `extractMainTitle` 是否正确按冒号切；考虑扩展分隔符（破折号、括号）但要小心书名本身的破折号 |
