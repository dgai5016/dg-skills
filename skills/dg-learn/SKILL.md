---
name: dg-learn
description: Generates a study guide and quiz from any learning material (Markdown / PDF / URL / folders / mixed inputs), supports two verification modes - self-quiz by reading the file, or AI-conducted test where the skill asks questions one by one, scores immediately, and generates a wrong-answer set for re-test. Use when the user says "/dg-learn", "学习这份资料", "出题考我", "测试我对...的理解", or wants structured learning + testing from material. Auto-dispatches subagents for multi-material parallel processing, supports difficulty levels (easy/medium/hard/mixed) and question types (choice/judge/short/apply/mixed). Auto-splits quiz into multiple files when total > 20 questions. Guide is organized as a stage-by-stage learning path (each stage = objective + knowledge points with source references + tips), and all artifacts are grouped under `dg-learn/{name}/` (AI suggests a directory name, user picks or customizes). Strict scoring (off-topic answers get 0). Does NOT support pause/resume mid-test, real-time tutoring dialogue, or exam features like time limits.
version: 1.2.0
---

# dg-learn (study guide + quiz generator with AI-conducted test)

把"读资料 → 生成学习指南 + 题库 → 自测或 AI 问答测试 → 错题重做"打包成一个 skill。两种模式由用户给的路径自动判定。

**职责边界（重要）：**

- ✅ **做**：解析多种资料（md/pdf/url/folder/混合）、派 subagent 并行处理多资料、生成结构化学习指南（以学习路径为主线）、生成 4 种题型题库（含拆分）、AI 问答测试（一道一道立刻判 + 错题集生成）、模式自动识别、产物整合到 `dg-learn/{name}/` 目录（AI 推荐目录名 + 用户选/自定义）
- ❌ **不做**：暂停/恢复测试进度、实时辅导对话（用户跑题直接判错）、考试系统功能（时间限制、分数广播）、跨多次会话记忆学习进度

## User Input Tools

When this skill prompts the user, follow this tool-selection rule (priority order):

1. **Prefer built-in user-input tools** exposed by the current agent runtime — e.g., `AskUserQuestion`, `request_user_input`, `clarify`, `ask_user`, or any equivalent.
2. **Fallback**: if no such tool exists, emit a plain-text prompt and wait for the user's reply.
3. **测试模式答题输入**：用户答案**不走 AskUserQuestion**（答案长度不固定、可能是代码块），让用户在对话里直接打字。
4. **模式识别失败时**（用户给的路径既不是题库也不是合理资料）→ 用 AskUserQuestion 询问用户意图。

Concrete `AskUserQuestion` references below are examples — substitute the local equivalent in other runtimes.

## Parameter Parsing

skill 接收一个 args 字符串（来自 `/dg-learn <args>`）。解析规则：

1. 按空格把 args 切成 tokens
2. 每个 token 按下列规则分类：
   - `--count=<N>` → 设置题目数量（正整数）
   - `--level=easy|medium|hard|mixed` → 设置难度（默认 `mixed`）
   - `--types=choice,judge,short,apply`（逗号分隔）→ 设置题型（默认全部混合）
   - 其他以 `--` 开头的 token → **未知 flag，报错退出**
   - 不以 `--` 开头的 token → 视为资料路径/URL
3. 资料路径支持：本地文件、本地文件夹、URL（`http://` 或 `https://` 开头）
4. 多个资料路径用空格分隔，全部纳入处理

**解析示例：**

| 输入 | 解析结果 |
|------|---------|
| `/dg-learn notes.md` | 模式=生成（资料是 notes.md），难度=mixed，题型=全部 |
| `/dg-learn notes.md paper.pdf https://x.com` | 模式=生成，混合 3 份资料 |
| `/dg-learn --count=10 notes.md` | 模式=生成，强制 10 题 |
| `/dg-learn --level=hard notes.md` | 模式=生成，仅困难题 |
| `/dg-learn --types=choice,judge notes.md` | 模式=生成，仅选择和判断 |
| `/dg-learn dg-learn/{name}/quiz.md` | 模式=测试（资料是题库） |
| `/dg-learn dg-learn/{name}/wrong-answers.md` | 模式=测试（错题重做） |

**未知 flag 报错信息：**
```
未知参数：--foo
当前支持的参数：
  --count=<N>          题目数量（不指定则不限）
  --level=<level>      难度：easy/medium/hard/mixed（默认 mixed）
  --types=<list>       题型（逗号分隔）：choice/judge/short/apply（默认全部）
```

## Modes

skill 的两种模式由**模式识别**自动判定，不需要用户显式声明。

### 模式识别规则

读取用户提供的第一个路径/URL，按以下优先级判定：

1. **路径是文件夹** → 读该文件夹下的 `quiz-index.md`：
   - 存在且 frontmatter 有 `dg-learn-quiz: true` → **测试模式**
   - 不存在或不是题库 → **生成模式**（文件夹作为资料源）
2. **路径是文件** → 读取文件头（前 30 行 frontmatter）：
   - frontmatter 有 `dg-learn-quiz: true` → **测试模式**
   - 无 frontmatter 或无此字段 → **生成模式**
3. **路径是 URL**（`http(s)://` 开头）→ **生成模式**（URL 必然是资料源，不可能是题库）
4. **路径不存在或读取失败** → 报错并提示用户
5. **多个路径同时给**：
   - 全是资料源（无 frontmatter 标记）→ **生成模式**
   - 第一个是题库（有标记）+ 其他是资料源 → **测试模式**（忽略其他资料，提示用户）
   - 多个题库 → 用 AskUserQuestion 让用户选一个测试

### 生成模式（generative）

输入：资料（md/pdf/url/folder，可多个）
输出：`dg-learn/{name}/guide.md` + `dg-learn/{name}/quiz.md`（或 `quiz/` 目录）—— {name} 由用户从 AI 推荐候选中选/自定义

### 测试模式（test）

输入：题库文件（带 `dg-learn-quiz: true` frontmatter，路径如 `dg-learn/{name}/quiz.md`）
输出：测试交互 + `dg-learn/{name}/wrong-answers.md` 错题集（与题库同目录）

## Workflow - 生成模式

### Step 1: Parse Arguments & Mode Detection

按 Parameter Parsing 解析，得到：
- `MATERIALS[]`（资料路径/URL 数组）
- `COUNT`（题量限制，默认 `null` 不限制）
- `LEVEL`（难度，默认 `mixed`）
- `TYPES[]`（题型数组，默认全部）

按「模式识别规则」判定模式。如果第一个资料是题库 → 走测试模式 workflow。

### Step 2: 资料清单收集与字数检查

对每个 `MATERIALS[i]`：

**字数检查（单文件 15 万字阈值）：**
- md/pdf 文件：用 Bash `wc -m <path>` 估算字数
- URL：先 WebFetch/mcp__web_reader__webReader 抓取再估算
- 文件夹：递归列出 `.md/.markdown/.pdf` 文件，每个单独检查字数
- 超过 15 万字 → 报错退出，提示用户拆分：
  ```
  ❌ 资料 {path} 共 {N} 万字，超过 15 万字阈值。
  请拆分该资料后再用 dg-learn。
  ```

**扩展名过滤：**
- 支持：`.md`、`.markdown`、`.pdf`
- 跳过：其他扩展名（`.docx`、`.png`、`.zip` 等），在最终报告里列出
- 隐藏目录排除：`.git/`、`node_modules/`、`.DS_Store`

**文件夹展开规则：**
- 递归子目录
- 该文件夹下所有 `.md/.markdown/.pdf` 文件都作为单独资料处理
- 学习指南"资料清单"段把文件夹汇总为一行，footnote 列出包含的文件

收集完毕后得到扁平化的 `FILES[]`（每个元素是一个具体的资料文件或 URL）。

### Step 3: 派 subagent 并行处理

对 `FILES[]` 派 general-purpose subagent（不用 Explore，因为 Explore 会丢内容）：

- 加载 [references/subagent-prompt-template.md](references/subagent-prompt-template.md)，按其模板拼 prompt
- 每个 subagent 处理一份资料，按模板返回结构化摘要
- **并行上限：5 个 subagent**。`len(FILES) > 5` 时分批，等前 5 个返回后再派下一批

收集所有 subagent 返回：
- 如果某个 subagent 返回 `ERROR:` 开头 → 在最终报告里提示用户该资料失败，但继续处理其他资料
- 否则 → 收集摘要，进入 Step 4

### Step 4: 合并摘要

主 skill 综合 N 份 subagent 摘要：

1. **核心知识点去重**：不同资料里讲同一知识点的合并描述（同时合并章节出处——多资料时出处带 `#N` 编号，单资料时省略）
2. **重排成统一学习路径**：综合 N 份 subagent 的「资料知识结构」信息，识别跨资料的依赖关系，把所有知识点归入若干阶段
   - **按资料本身知识体系分阶段**，不套通用模板（如「基础/进阶/实战」）
   - 阶段数随资料复杂度变化（简单资料 2 个阶段，复杂资料 4-5 个）
   - 每阶段生成：**学习目标**（可验证）+ **学习内容**（知识点带出处）+ **学习提示**（融进原「重点」「难点」信息）
3. **重点/难点综合**：跨资料合并，作为「学习提示」素材
4. **关键示例挑选**：选 3-5 个最有代表性的（用于题库解析）
5. **建议出题点汇总**：用于 Step 6 出题

得到合并后的 `KNOWLEDGE_POINTS[]`（平铺知识点名，供题库按名引用）和 `LEARNING_PATH[]`（结构化阶段信息，供 guide 写入 `learning_path` 字段）。

### Step 4.5: 确定产物目录名

所有产物整合到 `dg-learn/{name}/` 目录下。`{name}` 由用户从 AI 推荐的候选中选/自定义。

**生成 3 个候选 slug**（角度互补）：

| 候选 | 角度 | 例子 |
|------|------|------|
| 候选 1 | 从资料本身命名线索提取 | `notes` / `tutorials` / URL slug |
| 候选 2 | 基于内容主题的语义 slug | `react-hooks` |
| 候选 3 | 主题 + 来源/范围限定 | `react-hooks-notes` |

**slug 清洗规则**（自动套用到候选 + 用户自定义输入）：

- 全小写
- 中文/英文/数字保留
- 空格和 `/ \ : * ? " < > |` 替换为 `-`
- 多个连续 `-` 压成一个，头尾 `-` 去掉
- 长度限制 30 字符以内（超过截断）

**用户选择**：用 AskUserQuestion 弹 3 个候选 + "Other" 自定义输入。

**冲突处理**：用户选完后，如果 `dg-learn/{selected}/` 已存在，自动追加序号 `{selected}-2`、`{selected}-3`，直到找到不存在的目录。

**创建目录**：`mkdir -p dg-learn/{final-name}/`，后续所有产物写入此目录。

### Step 5: 生成学习指南

加载 [references/study-guide-template.md](references/study-guide-template.md)，按其模板生成 `guide.md`：

- **3 段固定**：资料清单 / 主题概述 / **学习路径**（核心，按 Step 4 重排出的 `LEARNING_PATH[]` 生成）
- **学习路径每阶段三段式**：学习目标（可验证）+ 学习内容（知识点带章节出处）+ 学习提示（融进原「重点」「难点」信息）
- **详细程度默认中等**：每个知识点配 1-2 句解释
- **资料清单表格**：按用户输入顺序排，文件夹汇总为一行
- **章节出处格式**：单资料省略 `#N`（如「第 2 章」）；多资料带 `#N` 编号（如「#1 第 2 章」）
- frontmatter 字段：`dg-learn-guide`、`dg-learn-version`、`title`、`created_at`、`source_materials`（路径相对 guide.md，资料在父目录时用 `../../xxx`）、`knowledge_points`（平铺数组）、`learning_path`（结构化阶段信息）、`stats`（含 `stages_count`）、`quiz_file`（固定 `./quiz.md` 或 `./quiz/quiz-index.md`）

写到 `dg-learn/{final-name}/guide.md`（{final-name} 由 Step 4.5 确定）。

### Step 6: 生成题库

加载 [references/quiz-template.md](references/quiz-template.md)，按其模板生成题库。**所有题库产物写到 Step 4.5 确定的 `dg-learn/{name}/` 目录下**，下列文件名都是相对该目录。

**6a. 决定题目数量：**
- `COUNT != null` → 强制按 COUNT 出题，分配到知识点
- `COUNT == null` → 不限制，学习路径里每个知识点至少 1 题，再按 subagent 的"建议出题点"加码（目标是覆盖所有考点）

**6b. 决定题型分布：**
- `TYPES[]` 默认全部 → 按资料类型合理分配（概念多的资料偏选择/判断，实战多的偏应用）
- 用户指定 `--types` → 仅出指定题型

**6c. 决定难度分布：**
- `LEVEL == mixed`（默认）→ 简单 30% + 中等 50% + 困难 20%
- 用户指定 → 仅出该难度

**6d. 生成题目：**
- 每题的 `knowledge_point` 必须对齐学习指南学习路径里的某个知识点名
- 每题的 `source` 关联资料 # 编号
- 主观题（short/apply）必须给 `scoring_points`（让 AI 评分时有明确标准）
- 答案紧跟每题后，用 `<details>` 折叠

**6e. 决定文件结构：**
- 题目总数 ≤ 20 → 单文件 `quiz.md`
- 题目总数 > 20 → 拆分目录 `quiz/`：
  - 第一级：按题型分子目录（`choice/`、`judge/`、`short/`、`apply/`）
  - 第二级：按知识点分文件
  - 二级阈值：某题型 ≤ 5 题时不二级拆（如 `judge.md` 合并）
  - 生成 `quiz-index.md` 作为索引

**6f. 边界情况：**
- 题量 < 3 → 提示用户"资料信息量不足以生成有效题库，建议补充资料"，但仍输出已生成的少量题目

### Step 7: 输出报告

```
✅ 学习指南 + 题库生成完毕！

📁 产物目录：dg-learn/{name}/
   （如果发生冲突处理，这里显示实际使用的目录名，如 dg-learn/{name}-2/）

📚 学习指南：dg-learn/{name}/guide.md
   - 学习路径：3 阶段 / 9 个知识点
   - 资料：3 份（md × 1, pdf × 1, url × 1）

📝 题库：dg-learn/{name}/quiz.md（或 quiz/ 目录）
   - 总题数：18（选择 8 / 判断 3 / 简答 5 / 应用 2）
   - 难度：简单 5 / 中等 10 / 困难 3
   
   （如果是拆分目录）
   📁 子题库：
      - dg-learn/{name}/quiz/quiz-index.md（索引）
      - dg-learn/{name}/quiz/choice/hooks.md（6 题，Hooks）
      - dg-learn/{name}/quiz/choice/state.md（6 题，State）
      ...

💡 接下来：
   - 自测：直接打开题库文件查看
   - AI 问答测试：/dg-learn dg-learn/{name}/quiz.md（或 dg-learn/{name}/quiz/quiz-index.md）
```

## Workflow - 测试模式

### Step 1: Parse Arguments & Mode Detection

按 Parameter Parsing 解析。读取用户给的路径，按「模式识别规则」判定为测试模式。

### Step 2: 读取题库

- 单文件 → 直接 Read
- 文件夹路径 → Read 该文件夹下的 `quiz-index.md`，按 `sub_quizzes` 字段读取所有子文件
- `dg-learn-type: wrong-answers` → 同样读取（错题重做）

读取失败时（文件不存在、frontmatter 缺失等）→ 报错退出。

### Step 3: 准备测试

向用户展示测试概要：

```
📚 题库：React Hooks 学习题库
📝 总题数：18（选择 8 / 判断 3 / 简答 5 / 应用 2）

输入"开始"或直接答第一题开始测试。
中途可输入：
  - 「跳过」：当前题不计分，进下一题
  - 「结束」：提前结束，进总结
```

等待用户响应。

### Step 4: 一道一道立刻判

循环处理每道题：

**4a. 出题**：
```
[AI] Q01（选择 · 简单）—— useState 基础
useEffect 的第二个参数是什么类型？
A. 数组  B. 对象  C. 函数  D. 字符串
```

**4b. 等用户作答**：用户在对话里直接打字。

**4c. 判分**：

- **客观题**（选择/判断）：直接判对错
- **主观题**（简答/应用）：按 `scoring_points` 逐项评估
  - 每命中一个要点计 1 分
  - 总得分 = 命中要点数 / 总要点数
  - 宽容度中等：语义匹配，不要求字面一致

**4d. 反馈**：

- **完全正确**（客观题对 / 主观题全要点命中）：
  ```
  [AI] ✅ 正确！
       解析：...
  ```

- **部分正确**（主观题部分要点命中）：
  ```
  [AI] 🟡 部分正确（X/Y 要点）
       ✓ 命中：...
       ✗ 漏掉：...
       补充：...
  ```

- **错误**（客观题错 / 主观题全错 / 用户说"我不知道"）：
  ```
  [AI] ❌ 错误
       正确答案：...
       解析：...
  ```

- **跑题**（用户回答偏离题目）→ **严格判错**：
  ```
  [AI] ❌ 判错（回答偏离题目）
       正确答案：...
       解析：...
  ```
  不给重答机会。

- **求助**（用户说"给个提示"）→ **不提供提示**，按未答处理：
  ```
  [AI] ⏭️ 未答（求助不计分）
       正确答案：...
       解析：...
  ```

- **跳过**（用户输入"跳过"）：
  ```
  [AI] ⏭️ 已跳过
       正确答案：...
       解析：...
  ```

**4e. 进入下一题**：直接出下一题（不需用户输入"继续"）。

### Step 5: 中途控制

用户在任意题作答时可以输入：

- **"跳过"** → 当前题计为跳过（0 分），进下一题
- **"结束"** → 立即结束测试，已答的进总结，未答的标"未答"

不支持回看上一题、不支持暂停保存。

### Step 6: 结束评估

测试结束（所有题答完或用户输入"结束"）→ 输出整体评估：

```
测试完成！

总得分：14/18（78%）

按题型：
- 选择题：8/8 ✓
- 判断题：2/3
- 简答题：3/5（按要点计 5/9）
- 应用题：1/2（按要点计 4/8）

知识点掌握：
- Hooks 基础 ✓ 完全掌握
- Hooks 规则 △ 部分掌握（建议复习 Q02）
- Effect 清理 ✗ 薄弱（建议复习 Q05、Q07）

复习建议：
1. 重点复习 Effect 清理薄弱知识点
2. 参考 guide.md 学习路径里对应阶段的「学习提示」
3. 错题已生成到 dg-learn/{name}/wrong-answers.md，可针对性重做
```

**判分规则：**
- 客观题：1 题 1 分，全对计 1，错计 0
- 主观题：按命中要点比例计分（如 3 个要点命中 2 个，计 2/3 = 0.67 分）
- 总得分 = 所有题得分求和
- 总分百分比 = 总得分 / 题数

**知识点掌握判定：**
- ✓ 完全掌握：该知识点所有题全对
- △ 部分掌握：该知识点有题对有题错
- ✗ 薄弱：该知识点所有题都错

### Step 7: 生成错题集

按 [references/quiz-template.md](references/quiz-template.md) 的"错题集文件"段，生成 `wrong-answers.md`：

- **输出路径**：与题库同目录（题库在 `dg-learn/{name}/quiz.md`，错题集就在 `dg-learn/{name}/wrong-answers.md`）
- frontmatter 带 `dg-learn-quiz: true` + `dg-learn-type: wrong-answers` + `parent_quiz`
- 内容：所有错题 + 跳过的题（按题型结构组织）
- 每题包含：原题 + 你的答案 + 正确答案/参考答案 + 命中要点分析 + 解析（`<details>` 折叠）
- 提示用户完整路径：`/dg-learn dg-learn/{name}/wrong-answers.md` 可重做错题

## Failure Handling

### 资料字数超限

单文件超过 15 万字 → 报错退出：
```
❌ 资料 {path} 共 {N} 万字，超过 15 万字阈值。
请拆分该资料后再用 dg-learn（如按章节拆成多个 md 文件）。
```

### 资料读取失败

文件不存在、PDF 解析失败、URL 读取失败 → 单独提示但继续处理其他资料：
```
⚠️ 资料 {path} 读取失败：{错误原因}
已跳过，继续处理其他资料。
最终报告里会列出所有失败的资料。
```

如果**所有资料都失败** → 报错退出：
```
❌ 所有资料都读取失败，无法生成学习指南和题库。
请检查路径是否正确、文件是否存在、URL 是否可访问。
```

### subagent 处理失败

某个 subagent 返回错误或超时 → 继续处理其他 subagent：
```
⚠️ 资料 {path} 处理失败：{subagent 错误}
已跳过，继续处理其他资料。
```

### 不支持的扩展名

`.docx`、`.png`、`.zip` 等 → 跳过 + 在报告里列出：
```
ℹ️ 以下文件类型不支持，已跳过：
   - notes.docx（请转成 .md 或 .pdf）
   - diagram.png（图像暂不支持）
```

### 题库 frontmatter 缺失

测试模式读取文件但没有 `dg-learn-quiz: true` → 询问用户：
```
⚠️ 文件 {path} 不像 dg-learn 生成的题库（没有 dg-learn-quiz 标记）。
你是要：
  1. 把它作为资料，生成新的学习指南 + 题库（生成模式）
  2. 仍然把它当题库测试（需要手动确认）
```
用 AskUserQuestion 让用户选。

### 模式识别失败

用户给的路径既不像题库也不像合理资料 → 用 AskUserQuestion 询问：
```
⚠️ 无法识别 {path} 的用途。请选择：
  1. 作为资料生成（生成模式）
  2. 作为题库测试（测试模式）
  3. 退出
```

### 其他未预期错误

捕获 stderr，报告原始错误给用户，退出。

## Scope Boundary

**不做**这些事（超出本 skill 职责）：

- ❌ 考试系统功能（时间限制、分数广播、考生管理）
- ❌ 暂停/恢复测试进度（v2 可能加）
- ❌ 实时辅导对话（用户跑题直接判错，不引导思考）
- ❌ 学习进度跨会话记忆（每次调用独立）
- ❌ Anki / 其他记忆卡片工具导出（v2 可能加）
- ❌ 题库批量管理（题库合并、按知识点跨题库搜索等）
- ❌ 多语言学习材料翻译（输入是什么语言，输出就是什么语言）
- ❌ 支持图像/视频/音频资料（仅 md/pdf/url）

## References

详细模板和设计文档在 `references/` 目录：

| 文件 | 用途 |
|------|------|
| [references/study-guide-template.md](references/study-guide-template.md) | 学习指南段落结构 + 详细程度 + 完整示例 |
| [references/quiz-template.md](references/quiz-template.md) | 4 种题型字段定义 + 答案折叠格式 + 文件结构 + frontmatter schema + 错题集格式 |
| [references/subagent-prompt-template.md](references/subagent-prompt-template.md) | subagent 任务说明 + 统一输出模板 |

## Extension Support

### 调整拆分阈值

`quiz-template.md` 里的拆分规则（20 题 / 5 题）可以根据实际使用反馈调整。修改后 bump skill version（patch 级）。

### 新增题型

未来想支持新题型（填空、连线、排序等）：
1. 在 `quiz-template.md` 增加题型字段定义和渲染示例
2. 更新 SKILL.md 的 `--types` 参数说明
3. 更新 Parameter Parsing 段的题型列表

### 新增问答节奏

未来想支持"辅导式追问"或"整套批改"作为可选模式：
1. 在 SKILL.md 的 Modes 段增加 `--tempo=strict|tutor|batch`（当前默认 strict）
2. 在 Workflow - 测试模式增加分支处理
