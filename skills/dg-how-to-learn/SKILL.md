---
name: dg-how-to-learn
description: Generates a study guide from a folder of learning materials (Markdown / PDF files inside one folder). The guide has 3 sections - a nested-list file inventory (each file annotated with what it covers), a one-paragraph topic overview, and a file-based learning path (which files to learn first, next, last; each file annotated with "what it covers + its role in the system" and "how to study it"). Use when the user says "/dg-how-to-learn", "学习这份资料", "这个文件夹怎么学", "这份资料怎么学", or wants to systematically learn from a folder of materials. Pass --obsidian to escape angle brackets in the output for Obsidian compatibility (use when materials contain template or JSX syntax that disrupts Obsidian's markdown parser).
version: 2.7.2
---

# dg-how-to-learn

把"拿到一个学习资料文件夹 → 告诉我怎么学"打包成一个 skill。读取文件夹内的所有 `.md/.markdown/.pdf`，生成一份学习指南，回答"先学哪几个文件、后学哪几个、最后学哪几个"。

**职责边界（重要）：**

- ✅ **做**：解析文件夹输入（递归子目录）、主 skill 端到端读取所有文件并做全局分析、生成学习指南（资料清单嵌套列表 + 主题概述 + 文件维度学习路径）、产物整合到 `dg-how-to-learn/{name}/`
- ❌ **不做**：初文件夹外的任何资源。

## User Input Tools

When this skill prompts the user, follow this tool-selection rule (priority order):

1. **Prefer built-in user-input tools** exposed by the current agent runtime — e.g., `AskUserQuestion`, `request_user_input`, `clarify`, `ask_user`, or any equivalent.
2. **Fallback**: if no such tool exists, emit a plain-text prompt and wait for the user's reply.

Concrete `AskUserQuestion` references below are examples — substitute the local equivalent in other runtimes.

**唯一的用户输入点**：Step 4.5 选产物目录名（弹 3 个候选 slug + "Other" 自定义）。

## Parameter Parsing

skill 接收一个 args 字符串（来自 `/dg-how-to-learn <args>`）。解析规则：

1. 按空格把 args 切成 tokens
2. 每个 token 按下列规则分类：
   - 以 `--` 开头的 token → 检查是否为已知 flag。`--obsidian` 已知（开启 Obsidian 兼容模式，转义尖括号）；其余未知 flag 报错退出
   - 不以 `--` 开头的 token → 视为路径
3. **路径必须是单个文件夹**——单文件、URL、多个路径混合、不存在的路径都报错退出

**解析示例：**

| 输入 | 解析结果 |
|------|---------|
| `/dg-how-to-learn tutorials/` | 模式=生成（资料是 tutorials/ 文件夹） |
| `/dg-how-to-learn ./papers/` | 模式=生成（相对路径文件夹） |
| `/dg-how-to-learn notes.md` | ❌ 报错：只支持文件夹输入 |
| `/dg-how-to-learn https://...` | ❌ 报错：只支持文件夹输入 |
| `/dg-how-to-learn a.md b.pdf` | ❌ 报错：只支持单个文件夹 |
| `/dg-how-to-learn --count=10 tutorials/` | ❌ 报错：未知 flag `--count` |
| `/dg-how-to-learn --obsidian tutorials/` | 模式=生成 + 开启 Obsidian 兼容（转义 `<`） |

**报错信息模板**：
```
❌ 当前 dg-how-to-learn 只支持文件夹输入。
请把学习资料放进一个文件夹后再调用，例如：/dg-how-to-learn my-folder/
（单文件 / URL / 多路径混合 输入将在未来版本支持）
```

**未知 flag 报错信息**：
```
未知参数：--foo
当前 dg-how-to-learn 只支持 --obsidian flag（其余 flag 不识别）。
```

**`--obsidian` 何时用**：资料含 Templater `<%`、JSX/泛型 `<T>`、HTML 标签等会扰乱 Obsidian markdown 解析的尖括号语法时加此 flag。详见 [references/obsidian-compat.md](references/obsidian-compat.md)。

## Modes

**只有一种模式**——生成模式（generative）。

输入：单个文件夹路径
输出：`dg-how-to-learn/{name}/guide.md`

不需要模式识别——所有合法输入都是生成模式。

## Workflow - 生成模式

### Step 1: Parse Arguments

按 Parameter Parsing 解析，得到：
- `FOLDER_PATH`（文件夹路径，**唯一**）
- `OBSIDIAN_MODE`（布尔，是否开启 `--obsidian` 兼容模式，默认 false）

任何不合规的输入（单文件、URL、多路径、未知 flag、不存在路径）→ 按对应报错模板退出。

### Step 2: 文件夹展开

递归列出 `FOLDER_PATH` 下的所有 `.md/.markdown/.pdf` 文件：

**扩展名过滤：**
- 支持：`.md`、`.markdown`、`.pdf`
- 跳过：其他扩展名（`.docx`、`.png`、`.zip` 等），在最终报告里列出
- 隐藏目录排除：`.git/`、`node_modules/`、`.DS_Store`

**文件夹展开规则：**
- 递归子目录
- 文件夹下所有 `.md/.markdown/.pdf` 文件都作为单独的资料文件处理
- 保留相对路径（用于后续依赖关系判断和资料清单嵌套列表展示）

收集完毕后得到扁平化的 `FILES[]`（每个元素是一个具体的文件路径，相对于 `FOLDER_PATH`）。

如果 `FILES[]` 为空（文件夹内没有任何支持的文件）→ 报错退出：
```
❌ 文件夹 {FOLDER_PATH} 内没有任何 .md/.markdown/.pdf 文件。
请检查文件夹内容或换个文件夹。
```

**不做字数检查**——典型场景（几个到十几个 md/pdf 文件）主 skill context 足以装下。如果未来遇到大文件夹撑爆 context，再加字数阈值。

### Step 3: 读取所有文件

主 skill 用 Read 工具逐个读取 `FILES[]` 里所有文件原文（不派 subagent，因为依赖图、分阶段等核心任务都是全局分析，subagent 隔离反而切断主 skill 的全局视角）。

读取失败的文件单独提示但继续处理其他文件：
```
⚠️ 文件 {path} 读取失败：{错误原因}
已跳过，继续处理其他文件。
最终报告里会列出所有失败的文件。
```

如果**所有文件都读取失败** → 报错退出。

读完后，主 skill 持有所有文件原文，进入 Step 4 做全局分析。

### Step 4: 全局分析

主 skill 基于全部文件原文，**一次性**完成下列分析（不依赖任何中间摘要层）：

1. **每个文件的两段文字**：
   - **讲什么**：1-2 句话，融合「文件主题」+「在体系中的位置」（入口 / 基础 / 核心 / 进阶 / 综合 / 收尾等）
   - **怎么学**：1-2 句阅读建议（敲代码？对比看？跑 demo？需要什么前置？）
2. **文件间依赖图**：基于**交叉引用**（如 A 文件提到「前面讲过的 X」对应到 B 文件）、**概念衔接**（A 文件的概念是 B 文件的前置）、**目录结构**综合判断，构建依赖关系（A → B 表示 B 的前置是 A）
3. **拓扑分阶段**：按依赖关系把所有文件归入若干阶段
   - **按资料本身的学习递进划分**，不套通用模板
   - 阶段数随资料复杂度变化（简单资料 2 个阶段，复杂资料 4-5 个）
   - 同阶段内文件有时有顺序（按依赖关系），有时是并行（无依赖）
   - **每个文件都必须归入某个阶段**（不能漏）
4. **资料清单的文件描述**：为每个文件准备一句「讲什么」（融合主题 + 在体系中的位置），供资料清单段落使用

得到 `FILES_SUMMARY[]`（每个文件含主题/讲什么/怎么学）和 `LEARNING_STAGES[]`（阶段划分）。

### Step 4.5: 确定产物目录名

所有产物整合到 `dg-how-to-learn/{name}-learn/` 目录下。`{name}` 为文件名。

### Step 5: 生成学习指南

加载 [references/study-guide-template.md](references/study-guide-template.md)，按其模板生成 `guide.md`——**正文开头一行资料来源引用块 + 3 段固定结构**：

- **正文开头（资料来源）**：一行引用块 `> 资料来源：{FOLDER_PATH}`（保留可追溯性）。**不生成 YAML frontmatter**——Obsidian 等渲染器对嵌套 YAML 字段支持差
- **段落 1：资料清单（嵌套列表）**：按目录结构生成嵌套缩进列表（每级 4 空格），每个文件「文件名: 讲什么」同行（讲什么取自 Step 4 第 4 点）
- **段落 2：主题概述**：2-3 句话概括这份资料讲什么、目标读者
- **段落 3：学习路径**：按 Step 4 重排的 `LEARNING_STAGES[]` 生成分阶段结构。每阶段含「这一步的目标」+ 编号文件列表。每个文件两个 bullet 字段：
  - **讲什么**：1-2 句话，融合「文件主题」+「在体系中的位置」
  - **怎么学**：1-2 句阅读建议

写到 `dg-how-to-learn/{final-name}/guide.md`（{final-name} 由 Step 4.5 确定）。

**若 `OBSIDIAN_MODE` 为 true**：生成 guide.md 后，按 [references/obsidian-compat.md](references/obsidian-compat.md) 的转义规则处理全文 `<` 字符——含 `<` 的反引号 inline code 改写成 `<code>&lt;...</code>`（保留等宽），普通文本裸 `<` 改成 `&lt;`。这让含 `<%`、`<T>` 等语法的 guide 在 Obsidian 里不被解析扰乱、不被 Templater 执行。

### Step 6: 输出报告

```
✅ 学习指南生成完毕！

📁 产物目录：dg-how-to-learn/{name}/
   （如果发生冲突处理，这里显示实际使用的目录名，如 dg-how-to-learn/{name}-2/）

📚 学习指南：dg-how-to-learn/{name}/guide.md
   - 文件数：{file_count}（md × N, pdf × N）
   - 子目录数：{folder_count}
   - 学习路径：{stages_count} 阶段

💡 接下来：
   - 打开 guide.md，按「学习路径」段的阶段顺序学习
   - 每个文件都有「讲什么」+「怎么学」两个提示，照着读即可
```

## Failure Handling

### 资料读取失败

文件不存在、PDF 解析失败 → 单独提示但继续处理其他文件：
```
⚠️ 文件 {path} 读取失败：{错误原因}
已跳过，继续处理其他文件。
最终报告里会列出所有失败的文件。
```

如果**所有文件都失败** → 报错退出：
```
❌ 所有文件都读取失败，无法生成学习指南。
请检查文件夹内容、文件是否存在。
```

### 不支持的扩展名

`.docx`、`.png`、`.zip` 等 → 跳过 + 在报告里列出：
```
ℹ️ 以下文件类型不支持，已跳过：
   - notes.docx（请转成 .md 或 .pdf）
   - diagram.png（图像暂不支持）
```

### 文件夹为空

文件夹内没有任何 `.md/.markdown/.pdf` 文件 → 报错退出：
```
❌ 文件夹 {FOLDER_PATH} 内没有任何支持的文件（.md/.markdown/.pdf）。
请检查文件夹内容或换个文件夹。
```

### 非文件夹输入

用户给的路径是文件 / URL / 多个路径 → 按 Parameter Parsing 报错模板退出。

### 其他未预期错误

捕获 stderr，报告原始错误给用户，退出。

## Scope Boundary

**不做**这些事（超出本 skill 职责）：

- ❌ 单文件 / URL / 多路径混合输入（仅支持单个文件夹）
- ❌ 生成题库 / 测试 / 错题集（未来版本可能加）
- ❌ 知识点维度的总结（学习路径是文件维度）
- ❌ 学习进度跨会话记忆（每次调用独立）
- ❌ 实时辅导对话 / 答疑
- ❌ 多语言学习材料翻译（输入是什么语言，输出就是什么语言）
- ❌ 支持图像 / 视频 / 音频资料（仅 md / pdf）
- ❌ Anki / 其他记忆卡片工具导出

## References

详细模板和设计文档在 `references/` 目录：

| 文件 | 用途 |
|------|------|
| [references/study-guide-template.md](references/study-guide-template.md) | 学习指南 3 段结构定义 + 嵌套列表资料清单格式 + 文件维度学习路径格式 + 完整示例 |
| [references/obsidian-compat.md](references/obsidian-compat.md) | `--obsidian` 模式的转义规则、触发条件、代价、局限 |

## Extension Support

### 未来支持单文件 / URL 输入

当前只接受文件夹。未来加回单文件 / URL 时：
1. 更新 Parameter Parsing，按 token 类型分类（文件 / 文件夹 / URL）
2. Step 2 增加对应路径类型的展开逻辑
3. study-guide-template 的资料清单支持非文件夹结构（可能改回表格）

### 未来支持题库 / 测试模式

当前不生成题库、不做测试。未来加回时：
1. 重新引入 quiz-template.md
2. SKILL.md 增加 Step 6（生成题库）+ Workflow - 测试模式
3. Parameter Parsing 加回 `--count` / `--types` / `--level` 等 flag
4. 学习指南 frontmatter 加回 `quiz_file` 字段关联题库
