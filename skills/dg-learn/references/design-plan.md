# dg-learn Skill 设计方案

> 本文是 dg-learn skill 的设计 plan 副本，记录所有设计决策的来由和讨论结论。后续迭代时（如调整拆分阈值、修改问答节奏、扩展新题型）先看这里，理解决策上下文。

## Context

用户想要一个通用学习 skill：对任意资料生成「学习指南 + 测试题」，支持自测（用户看文件）和 AI 问答（skill 引导问答 + 评分反馈）两种验证方式。目标是告诉学习者"该怎么学、怎么测"。

属于通用 skill（不依赖特定仓库），归本仓库 `skills/dg-learn/`。

## 设计决策

### 第 1 块：输入

#### 1.1 资料形态

| 维度 | 范围 |
|------|------|
| 类型 | Markdown / PDF / URL |
| 数量 | 单/多 文件、单/多 文件夹、单/多 PDF、单/多 URL |
| 混合 | 支持（多种类型混合给） |

读取工具：
- Markdown：Read
- PDF：Read（支持 PDF）
- URL：WebFetch 或 webReader
- 文件夹：`ls` 列出 + 逐个读

文件夹规则：
- 递归子目录
- 只读 `.md` / `.markdown` / `.pdf`，其他跳过并在报告里列出
- 排除隐藏目录（`.git/`、`node_modules/`、`.DS_Store`）

合并策略：所有资料合并成**一份**产物

#### 1.2 模式标识

frontmatter 自动识别：
- 题库文件 frontmatter 带 `dg-learn-quiz: true`
- skill 读文件头 → 有标记走测试，没标记走生成

#### 1.3 微调参数

- **题量**：默认不限制（目标是覆盖资料内所有知识点），可选 `--count=N` 强制指定
- **难度**：3 档（简单 / 中等 / 困难），默认混合（按比例覆盖 3 档，如 30% / 50% / 20%），可选 `--level=easy|medium|hard|mixed`
- **题型**：4 种（选择 / 判断 / 简答 / 应用），默认混合，可选 `--types=choice,judge,short,apply`

### 第 2 块：学习指南产物

#### 2.1 段落结构（6 段固定 + 3 段按需）

**固定 6 段：**
1. **资料清单** —— 表格，按用户输入顺序排
2. **主题概述** —— 资料讲什么、目标读者
3. **核心知识点** —— 必须掌握的概念清单（题库的"考点来源"）
4. **重点** —— 重要且需要重点关注
5. **难点** —— 难掌握的部分
6. **学习路径** —— 推荐学习顺序 + 每份资料的角色标签

**按需 3 段**（资料里明显能提取到就生成，否则不写）：
- 先修知识
- 常见误区
- 延伸阅读

#### 2.2 详细程度

默认**中等**：每个知识点配 1-2 句解释（例：`useState：管理函数组件状态，返回 [state, setState]`）。

#### 2.3 资料清单呈现

表格 + 用户输入顺序 + 文件夹汇总为一行：

```
| # | 类型   | 来源                       | 摘要（一句话）           |
|---|--------|----------------------------|--------------------------|
| 1 | md     | notes/react-hooks.md       | React Hooks 基础用法     |
| 2 | pdf    | papers/attention.pdf       | Attention 机制原理       |
| 3 | url    | https://arxiv.org/xxx      | Transformer 论文         |
| 4 | folder | tutorials/ (含 5 个 md)    | 进阶教程合集             |
```

文件夹汇总为一行，footnote 列出包含的文件名（避免清单爆炸）。

#### 2.4 学习路径

推荐顺序 + 每份资料一个角色标签（基础 / 重点 / 难点 / 应用 / 进阶）：

```
## 学习路径

1. 先读 #1（基础）—— 建立整体认知
2. 再读 #2（难点）—— 理解底层逻辑，多花时间
3. 最后读 #3 #4（应用 + 进阶）—— 落地实践
```

### 第 3 块：题库产物

#### 3.1 题目结构（4 种题型）

**公共字段**：`id` / `type` / `difficulty` / `knowledge_point` / `question` / `source`（关联资料 # 编号）

**选择题（choice）**：`options` / `answer` / 可选 `multi: true`（多选时 `answer` 是数组）/ `explanation`

**判断题（judge）**：`answer`（正确/错误） / `explanation`

**简答题（short）**：`reference_answer`（文本参考答案）/ `scoring_points`（评分要点列表）/ `explanation`

**应用题（apply）**：`reference_solution`（代码参考实现）/ `scoring_points`（评分要点列表）/ `explanation`

#### 3.2 文件结构（含拆分规则）

**学习指南**：始终单文件 `guide-{timestamp}.md`

**题库**：
- 题目总数 **≤ 20**：单文件 `quiz-{timestamp}.md`
- 题目总数 **> 20**：拆分到 `quiz-{timestamp}/` 目录 + `quiz-index.md` 索引

**拆分规则**（两级）：
- 第一级：按题型分目录（`choice/` / `judge/` / `short/` / `apply/`）
- 第二级：按知识点分文件
- **二级阈值**：某题型 ≤ 5 题时不二级拆，整题型合并单文件（如 `choice.md`）
- 知识点来源：学习指南的"核心知识点"段落，每题的 `knowledge_point` 对齐到这个清单

**目录结构示例：**
```
quiz-{timestamp}/
├── quiz-index.md
├── choice/
│   ├── hooks.md
│   ├── state.md
│   └── ...
├── judge/
│   └── judge.md          # 题量少不二级拆
├── short/
│   └── ...
└── apply/
    └── apply.md          # 题量少不二级拆
```

#### 3.3 答案/解析的暴露方式

`<details>` 折叠：每题答案紧跟在该题后，默认折叠，点击展开。

```markdown
### Q01（选择 · 简单）
useEffect 的第二个参数是什么类型？
A. 数组  B. 对象  C. 函数  D. 字符串

<details>
<summary>答案与解析</summary>

**答案：A**

**解析：** 依赖数组的用途是控制 effect 何时重新执行...

</details>
```

每个题库文件内统一此格式（包括拆分后的子文件）。

#### 3.4 frontmatter schema

**主文件 / 索引文件 frontmatter：**
```yaml
---
dg-learn-quiz: true                    # 模式识别标记
dg-learn-type: quiz | index            # 主文件 quiz，拆分时索引文件 index
dg-learn-version: 1.0
title: React Hooks 学习题库
created_at: 2026-06-26
source_materials:                      # 资料清单（与学习指南同步）
  - notes/react-hooks.md
knowledge_points: [Hooks, State, Effect]
stats:
  total: 18
  by_type: {choice: 8, judge: 3, short: 5, apply: 2}
  by_difficulty: {easy: 5, medium: 10, hard: 3}
guide_file: ./guide-2026-06-26.md
sub_quizzes:                           # 仅索引文件用
  - {path: choice/hooks.md, type: choice, knowledge_point: Hooks, count: 6}
---
```

**拆分时的子文件 frontmatter：**
```yaml
---
dg-learn-quiz: true
dg-learn-type: subquiz
parent_index: ../quiz-index.md
type: choice
knowledge_point: Hooks
count: 6
---
```

模式识别核心字段：`dg-learn-quiz: true`。用户给路径 → skill 读文件头 → 有此标记走测试模式。

### 第 4 块：AI 测试体验

#### 4.1 问答节奏

**一道一道立刻判**：出一题 → 用户答 → AI 立刻判分 + 给正确答案 + 解析 → 进下一题。

#### 4.2 评分标准

- **客观题**（选择/判断）：AI 直接判对错
- **主观题**（简答/应用）：按 `scoring_points` 逐项评估
  - 每命中一个要点计 1 分
  - 总得分 = 命中要点数 / 总要点数
  - 部分命中反馈"部分正确（X/Y 要点）"+ 列出哪些要点命中、哪些漏了
- **宽容度默认中等**：语义匹配，表达可以不同（不要求字面一致）

#### 4.3 中途控制

- 「跳过」：用户输入"跳过"，当前题不计分，最后提示有 N 题未答
- 「提前结束」：用户输入"结束"，已答的进总结，未答的标"未答"
- 不支持回看上一题
- 不支持暂停保存（v2 再做）

#### 4.4 用户答案输入方式

对话里直接打字（不走 AskUserQuestion，因为答案长度不固定、可能是代码块）。

#### 4.5 结束后整体评估

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
2. 参考 guide.md 的"难点"段落
3. 错题已标记，可针对性重做
```

#### 4.6 错题集生成

测试结束自动生成 `wrong-answers-{timestamp}.md`：
- frontmatter 带 `dg-learn-quiz: true` + `dg-learn-type: wrong-answers` + `parent_quiz`（原题库关联）
- 内容：原题 + 你的答案 + 正确答案/参考答案 + 错误要点分析 + 解析（`<details>` 折叠）
- 下次 `/dg-learn wrong-answers-xxx.md` 直接进入测试模式重做错题

### 第 5 块：衔接与边界

#### 5.1 文件命名规则（统一时间戳 `YYYYMMDD-HHmmss`）

- 学习指南：`guide-{ts}.md`
- 题库单文件：`quiz-{ts}.md`
- 题库拆分目录：`quiz-{ts}/`（含 `quiz-index.md` + 题型子目录）
- 错题集：`wrong-answers-{ts}.md`

所有产物默认生成在**用户当前工作目录**（不在 skill 目录里）。

#### 5.2 多资料处理（subagent 并行）

每个资料派一个 **general-purpose subagent**（不用 Explore，因为 Explore 读取片段会丢内容）：

**subagent 任务**：读取资料 + 按统一模板提取摘要：
```markdown
## 资料：xxx.md
- 类型：md / pdf / url
- 字数：5200
- 主题：一句话概括

### 核心知识点
1. useState：管理函数组件状态
2. useEffect：处理副作用

### 重点
- Hooks 规则（必须在顶层调用）

### 难点
- 依赖数组的判断逻辑

### 关键示例 / 代码片段
- 示例：...

### 建议出题点
- 适合做选择题的：...
- 适合做应用题的：...
```

主 skill 收集所有 subagent 摘要 → 合并去重同知识点 → 综合重点/难点 → 生成学习指南 + 题库。

**并行上限：最多 5 个 subagent 同时跑**。超过 5 个资料时分批处理。

#### 5.3 资料太长

- **单文件字数阈值：15 万字**
- 读取前用 `wc -m` 估算字数；PDF 按页数 + 平均字数估算
- 超过阈值直接拒绝，提示用户："单文件 X 万字超过 15 万字限制，请拆分后再用"
- 字数限制是**单文件**，不限制资料总数量

#### 5.4 资料质量差

- 题量 < 3 时提示"资料信息量不足以生成有效题库，建议补充资料"
- 仍输出已生成的少量题目供参考

#### 5.5 AI 测试时用户跑题 / 求助（严格判错）

- "我不知道"/"跳过" → 当作未答，0 分，进下一题
- 回答偏离题目 → 直接判错（0 分）+ 给出正确答案 + 解析，进下一题
- 求助"给个提示" → 不给提示（直接判错或要求作答）

#### 5.6 异常处理

- 文件/文件夹不存在 → 提示路径错误
- PDF 解析失败、URL 读取失败 → 提示失败原因 + 建议
- 不支持的扩展名（`.docx`/`.png` 等）→ 跳过 + 在报告里列出
- 模式识别失败（路径既不是题库也不是合理资料）→ 用 AskUserQuestion 询问用户

---

## 实现要点

### 关键设计模式（参考现有 dg-git-push skill）

- **SKILL.md 结构**：frontmatter（`name`/`description`/`version`）+ User Input Tools（内联）+ Workflow + Failure Handling + Scope Boundary
- **references/ 一级引用**：SKILL.md → references/xxx.md，不再嵌套
- **模式判定**：用文件 frontmatter 的 `dg-learn-quiz: true` 字段识别（类似 dg-git-push 用 git 状态判定）
- **产物落盘到用户工作目录**（不在 skill 目录），避免污染 skill 仓库

### 不写 scripts/ 的判断

仓库 CLAUDE.md 规范：「需要灵活判断、临场决策的逻辑（让 Claude 处理更合适）」不该写脚本。dg-learn 的核心逻辑都是 LLM 临场判断（提取知识点、出题、评分），所以**不写 scripts/**。

唯一可能用脚本的场景是字数估算（`wc -m`），但这可以直接 Bash 调用，不必包成脚本。

---

## 后续迭代 hook

后续迭代时可能调整的点（按可能性排序）：

1. **拆分阈值**（20 题 / 5 题）：用得多了可能想调
2. **问答节奏**：增加"辅导式追问"作为可选模式
3. **错题集**：增加"按错题类型聚类"、"加入 Anki 导出"
4. **多资料处理**：subagent 上限 5 个是否合适
5. **字数阈值**：15 万字是否够用
6. **新题型**：填空题、连线题、排序题等
7. **暂停保存**：测试中途保存进度
