---
name: dg-learntime-estimate
description: Estimates learning time for a learning resource (single file / folder / video / video playlist / book) and outputs a Markdown report with three-level breakdown (零基础 1.8x / 有基础 1.0x / 熟练 0.6x) so user picks the matching number — no need to declare level. Pure-quantitative model: Chinese 350 chars/min, English 200 wpm, code intensive-read 50 lines/h (skim 150), technical book 3 min/page, video duration (directly as base value — no multiplier for video mode since v2.8.1, applies to both single video and playlist). Internal difficulty (math-heavy, cross-domain) judged by Claude and folded into base via 1.3x/0.9x — applies to text/PDF/book modes only (video mode skips this). Time format "X 时 Y 分". Use when user says "/dg-learntime-estimate", "估时", "学完要多久", "这份资料多久能学完", "estimate learning time", or wants time budget. Accepts folder / file path / video URL (auto pip install yt-dlp ~50MB; auto-detects playlist via yt-dlp --print and estimates ALL episodes) / book description ("书名 + 页数 + 类型"). Does NOT do personal calibration, no fatigue decay, does NOT link to dg-douban-book, does NOT save output file, does NOT prompt for manual duration on fetch failure (reports failure directly).
version: 2.8.1
metadata:
  openclaw:
    homepage: https://github.com/dgai5016/dg-skills#dg-learntime-estimate
    requires:
      pythonPackages:
        - yt-dlp
---

# dg-learntime-estimate

把"用户给学习资源 → 估时学完要多久 → 渲染成 Markdown 报告（顶部三水平 + 分段表 + 备注）"打包成一个 skill。支持 4 种输入：单文件 / 文件夹 / 视频（含 URL）/ 书籍（描述）。

**职责边界（重要）：**

- ✅ **做**：解析 4 种输入、按类型应用固定系数算基础值、对非视频模式按 Claude 判断的资料内在难度调整（×1.3 或 ×0.9，**视频模式不应用**）、对三水平（零基础 / 有基础 / 熟练）分别算最终估时、视频 URL 通过 yt-dlp 自动抓时长 + 自动展开合集估所有 P、首次自动 pip install yt-dlp、文件夹简单累加、统一「X 时 Y 分」时间格式
- ❌ **不做**：个人速度校准（不保存历史）、疲劳衰减（文件夹简单累加）、抓书评 / 详情页、联动 dg-douban-book、保存输出到文件、抓付费网课 / 私有视频内容、**采集失败时反问用户手报时长**（直接报告失败退出，仅未装 yt-dlp 时反问安装）

## User Input Tools

When this skill prompts the user, follow this tool-selection rule (priority order):

1. **Prefer built-in user-input tools** exposed by the current agent runtime — e.g., `AskUserQuestion`, `request_user_input`, `clarify`, `ask_user`, or any equivalent.
2. **Fallback**: if no such tool exists, emit a plain-text prompt and wait for the user's reply.
3. yt-dlp installation confirmation (yes/no) and manual-duration fallback prompt are single binary prompts — use whichever mechanism the runtime provides; do NOT batch them with other questions.

Concrete `AskUserQuestion` references below are examples — substitute the local equivalent in other runtimes.

**用户输入点**：
- 输入无法识别时反问 4 选 1（单文件 / 文件夹 / 视频 / 书籍）
- yt-dlp 首次安装确认（同意 / 取消）

## Parameter Parsing

skill 接收一个 args 字符串（来自 `/dg-learntime-estimate <args>`）。解析规则：

1. 按下列优先级判定输入类型（**优先级**：文件夹 > 单文件 > 视频 URL > 视频手报 > 书籍）：

| 用户输入特征 | 判定模式 |
|------------|---------|
| 现存文件夹路径（`test -d`） | 文件夹模式 |
| 现存单文件路径（`test -f`） | 单文件模式 |
| 含视频 URL（`youtube.com` / `youtu.be` / `bilibili.com` / `b23.tv` 等） | 视频 URL 模式 |
| 含「视频 X 分钟」「课程 N 小时」字样（提取出时长） | 视频手报模式 |
| 含「书名 + 页数」字样（如「《XX》N 页」或「XX N 页」）或 PDF 路径 | 书籍模式 |
| 以上都不匹配 | 反问澄清（User Input Tools 4 选 1） |

2. 不识别任何 `--flag`——所有参数都按自然语言解析。未知 flag 报错退出。

**解析示例：**

| 输入 | 模式 |
|------|------|
| `/dg-learntime-estimate tutorials/` | 文件夹 |
| `/dg-learntime-estimate README.md` | 单文件（按扩展名分叉） |
| `/dg-learntime-estimate https://bilibili.com/video/...` | 视频 URL（自动探测合集） |
| `/dg-learntime-estimate 这个视频 45 分钟` | 视频手报 |
| `/dg-learntime-estimate DDIA 400 页 技术书` | 书籍 |
| `/dg-learntime-estimate xxx` | 反问澄清 |

## Workflow

### Step 1: 解析输入，判定模式

按 Parameter Parsing 规则判定模式。无法识别 → 用 User Input Tools 反问 4 选 1，反问后回到 Step 1。

### Step 2: 按模式收集量化信号

#### 文件夹模式

1. 递归列出 `FOLDER_PATH` 下所有支持的文件，跳过 `.git / node_modules / .DS_Store`
   - 文本：`.md / .markdown / .txt`
   - PDF：`.pdf`
   - 代码：`.py / .js / .ts / .go / .rs / .java / .c / .cpp / .h / .sh / .yaml / .yml / .json`
2. 每个文件按扩展名分叉：
   - md/markdown/txt：字数（中文按字符数，英文按词数）
   - pdf：尝试提取文本算字数；失败则用页数 fallback
   - 代码：行数；精读 vs 通读由 Claude 看核心模块 / 胶水代码判定
3. 不支持的扩展名跳过 + 在备注里列出

#### 单文件模式

按文件扩展名分叉到对应子流程（同文件夹模式里单个文件的处理）。

#### 视频 URL 模式

1. 检查 yt-dlp 是否已安装（`yt-dlp --version` 或 `python3 -m yt_dlp --version`）
2. 未安装 → 走 Step 2b 询问安装
3. 安装后跑 `yt-dlp --print "%(title)s|%(duration)s" <URL>`（**不带 `--no-playlist`**），自动展开合集
   - 输出格式：每行一个 P，`title|duration（秒）`
4. 按输出行数判定模式：
   - **1 行** → 单视频模式：取该行的 title + duration
   - **≥ 2 行** → 合集模式：解析所有行的 title + duration
   - **0 行 / 报错 / exit ≠ 0** → 完全失败，直接走 Failure Handling（**不反问手报**）
5. 部分 P 的 duration 字段缺失（值为 `NA` 或解析失败）→ 跳过该 P + 在备注里列出失败 P 序号，继续算其余 P

**合集默认行为**：自动估所有 P，不反问。URL 含 `?p=N` 也按合集展开，备注里说明"原 URL 指向第 N P，已估整个合集"。

#### Step 2b: 询问安装 yt-dlp

通过 User Input Tools 问用户：

```
首次使用 dg-learntime-estimate 视频 URL 模式需要安装 yt-dlp（约 50MB，一次性）。

  安装  → 我来跑 pip install yt-dlp
  取消  → 退出本次估时（或改用手报时长：「视频 X 分钟」）
```

- 用户回 `安装` / `ok` / `继续` / `y` → 执行 `pip install yt-dlp`，装完继续 Step 2
- 用户回 `取消` / `n` / 拒绝 → 退出，或建议用户改用手报时长

**不要**在未确认前自动跑 `pip install yt-dlp`。

#### 视频手报模式

从自然语言中提取时长（小时/分钟），**直接作为基础值**（不再区分纯看 / 含练习 / 高难度，v2.8.1 起统一简化）。

#### 书籍模式

提取：书名（标题展示用）、页数（量化信号）、类型（技术书 / 教材 / 通识）。类型缺省时让 Claude 根据书名或上下文判断。

### Step 3: 算基础值

按 [references/coefficient-model.md](references/coefficient-model.md) 的系数表算每个单位（文件 / 视频 / 书）的基础估时（分钟）：

1. 量化信号 ÷ 系数 = 基础值（**视频模式**：视频时长直接作为基础值，跳过下方的内在难度调整）
2. **非视频模式**：Claude 判断资料内在难度（基于内容主题、数学密度、领域匹配度），调整基础值：
   - 数学密集 / 跨领域 / 前沿论文 → 基础值 × 1.3
   - 已熟悉主题 / 入门资料 → 基础值 × 0.9
   - 普通 → 不调整

**文件夹模式**：所有文件基础值**简单累加**得到 `base_total`（不引入疲劳衰减）。
**视频合集模式**：所有 P 时长**简单累加**得到 `base_total`（同文件夹聚合逻辑）。
**单文件 / 单视频 / 书籍模式**：基础值即 `base_total`。

### Step 4: 按三水平算最终估时

```
零基础 估时 = base_total × 1.8
有基础 估时 = base_total × 1.0
熟练   估时 = base_total × 0.6
```

### Step 5: 渲染报告

按下方"输出格式"渲染 Markdown。所有时间用「X 时 Y 分」格式。

## 时间表示规则

所有时间统一用「X 时 Y 分」格式，避免小数小时：

- < 60 分：只显示分（如 `12 分`）
- 整小时（分钟部分 = 0）：只显示时（如 `2 时`）
- 其他：`X 时 Y 分`（如 `7 时 24 分`）

**禁止**用 `13.3 时` 这种小数小时（用户需自己转化，不直观）。

## 输出格式

### 文件夹 / 书籍 / 单视频模式

```markdown
# 学习时长估算

> 类型：{输入类型}（{N 个文件 / N 页 / N 分钟}） · 基础合计 {base_total 时间}
> **零基础 {零基础估时} / 有基础 {有基础估时} / 熟练 {熟练估时}**

## 分段估时（基础值）

| 文件 | 量化信号 | 内在难度 | 基础估时 |
|------|---------|---------|---------|
| {file1} | {字数/行数/页数} | {入门/普通/数学密集 ×1.3} | {时间} |
| ... | ... | ... | ... |
| **基础合计** | | | **{base_total 时间}** |

## 备注

- 系数依据：{主要系数引用}（见 coefficient-model.md）
- 不确定性：群体平均模型，**个体差异 ±30%** 属正常；建议记录实际用时反向参考
- 注意点：{耗时最长的部分}；按你的水平认领对应数字
```

**单文件 / 书籍模式简化**：分段表只有 1 行（资源本身），去掉"基础合计"汇总行。
**单视频模式简化**：分段表只有 1 行（资源本身），**删掉「内在难度」列**（视频模式不应用内在难度）。

### 视频合集模式

```markdown
# 学习时长估算

> 类型：合集视频 URL · {N} 个 P · 总时长 {base_total 时间}
> **零基础 {零基础估时} / 有基础 {有基础估时} / 熟练 {熟练估时}**

## 视频信息

- **来源**：{平台，如 bilibili / youtube}
- **合集标题**：{playlist_title 或首 P 标题前缀}
- **P 数**：{N}
- **总时长**：{base_total 时间}

## 分段估时（基础值）

| 序号 | 标题 | 时长 |
|------|------|------|
| P01 | {title} | {分:秒} |
| P02 | {title} | {分:秒} |
| ... | ... | ... |
| **合集合计** | | **{base_total 时间}** |

## 备注

- 系数依据：视频时长直接作为基础值（v2.8.1 起视频模式不再区分纯看/含练习/高难度，不调内在难度），三水平 ×1.8/1.0/0.6（见 coefficient-model.md）
- 不确定性：群体平均模型，**个体差异 ±30%** 属正常；建议记录实际用时反向参考
- 注意点：{总时长最长的几个 P}；按你的水平认领对应数字
```

**部分 P 失败时**：表格里失败 P 用 `(跳过)` 标注，备注里增加一行「⚠️ 已估 {X} 个 P / 跳过 {Y} 个 P：P0X、P0Y（duration 抓取失败）」。

## Failure Handling

### yt-dlp 未安装

按 Step 2b 处理（反问用户是否安装）。**不要**在未确认前自动跑 `pip install yt-dlp`。

### 视频 URL 抓取完全失败（合集或单视频都抓不到）

直接报告失败 + 退出，**不反问用户手报时长**：

```
❌ 视频抓取失败：{原始错误或 URL}
可能原因：URL 失效 / 私有或付费视频 / 网络问题 / yt-dlp 版本过旧
请检查 URL 或换一个公开视频。
```

### 视频合集部分 P 失败（个别 P 的 duration 字段缺失）

跳过失败 P + 继续估算其余 P + 备注里列出失败 P 序号。报告里给「⚠️ 已估 X 个 P / 跳过 Y 个 P」。**所有 P 都失败**时升级为「完全失败」处理。

### 文件夹为空

```
❌ 文件夹 {FOLDER_PATH} 内没有任何支持的文件
（支持 .md/.markdown/.pdf/.py/.js 等文本和代码文件）。
请检查文件夹内容或换个文件夹。
```

### 文件读取失败

个别文件读取失败 → 跳过 + 在备注里列出，继续处理其他文件。所有文件都失败 → 报错退出。

### 书籍输入缺页数

反问用户补页数（无页数无法估时）。

### 其他未预期错误

捕获错误，报告原始错误给用户，退出。

## Scope Boundary

**不做**这些事（超出本 skill 职责）：

- ❌ 个人速度校准（不保存历史实际耗时用于反推个人系数）
- ❌ 疲劳衰减（文件夹 / 合集简单累加，不引入累进倍率）
- ❌ 联动 dg-douban-book（书籍模式只取用户给的页数 + 类型，不抓豆瓣）
- ❌ 保存输出到文件（直接在对话输出 Markdown）
- ❌ 抓付费网课 / 私有视频内容（yt-dlp 抓不到时直接报告失败，**不反问手报**）
- ❌ 抓视频章节 / 字幕 / 笔记（只取时长）
- ❌ 估算非学习类资源（电影、娱乐视频）的学习时长
- ❌ 视频模式应用视频倍率 / 内在难度调整（v2.8.1 起简化为纯时长）
- ❌ 反问用户手报时长（仅未装 yt-dlp 时反问安装）

## References

详细系数表在 `references/` 目录：

| 文件 | 用途 |
|------|------|
| [references/coefficient-model.md](references/coefficient-model.md) | 完整系数表（基础系数、视频时长、水平倍率、文件夹聚合、合集聚合、内在难度）+ 每个系数的依据和适用场景 |

## Extension Support

### 未来支持个人校准

当前是纯量化模型。未来加回时：
1. 持久化历史文件（如 `~/.claude/skills-data/dg-learntime-estimate/history.json`）
2. 用户事后手报"实际耗时"用于校准
3. 算个人速度系数（实际 / 估算 = 系数，滑动平均）

### 未来支持疲劳衰减

当前文件夹简单累加。未来加回时：
1. raw_total > 120 分按段累进 1.2 / 1.3 / 1.4...
2. 加 `--fatigue` flag 控制开关

### 未来支持输出文件

当前不落盘。未来加 `--save` 写到 `dg-learntime-estimate/{name}.md`。

### 调试 skill

**通用原则**：本 skill 无 scripts/，主要靠手动跑 slash command + 检查系数应用是否正确。

**典型故障排查**：

| 现象 | 排查方向 |
|------|---------|
| 视频时长抓不到 | 检查 yt-dlp 是否装好；URL 是否需登录（私有 / 付费） |
| 合集探测失败（只抓到 1 P 但实际多 P） | 检查 URL 是否带 `?p=N`（不影响合集展开）；试 `yt-dlp --flat-playlist <URL> \| jq '.entries \| length'` 看 yt-dlp 视角下的 P 数 |
| 视频估时不准 | v2.8.1 起视频时长直接作基础值，无倍率。个体差异靠三水平 ×1.8/1.0/0.6 表达 |
| 书籍估时偏离实际 | 检查"类型"是否对（技术书 3 分/页 vs 教材 5 分/页 vs 通识 1 分/页差异大） |
| 文件夹估时偏高/偏低 | 检查每个文件的"内在难度"判断是否合理（×1.3 调整） |
| 时间格式不对 | 检查是否符合「< 60 分只显示分，整小时只显示时，否则 X 时 Y 分」 |
