# 学习指南模板

学习指南是 dg-learn 生成模式的核心产物之一。本文定义其段落结构、详细程度和呈现规则。

## 整体结构

学习指南按以下顺序组织段落（**3 段全部固定生成**）：

| 顺序 | 段落 | 作用 |
|------|------|------|
| 1 | 资料清单 | 让用户核对所有纳入的资料，避免漏 |
| 2 | 主题概述 | 一句话说明资料讲什么、目标读者 |
| 3 | **学习路径** | **核心段**：按资料知识体系分阶段递进，每阶段 = 学习目标 + 学习内容（带出处）+ 学习提示 |

聚焦对资料本身的学习——不写先修知识、常见误区、延伸阅读等资料外信息。

## 详细程度（默认中等）

每个知识点配 **1-2 句解释**，不展开成教程。

| 详细程度 | 示例（useState） |
|---------|-----------------|
| 精炼（不采用） | `useState` |
| **中等（默认）** | `useState：管理函数组件状态，返回 [state, setState]` |
| 教学（不采用） | `useState：管理函数组件状态。调用方式 const [count, setCount] = useState(0)。在函数组件里调用，返回数组，第一个是当前 state，第二个是 setter 函数。setter 触发重新渲染...` |

## 段落 1：资料清单

**规则：**
- 表格形式
- 按用户输入顺序排（不重排，方便用户对照自己给的资料）
- 文件夹汇总为一行（不在表格里展开每个文件，但表格下方 footnote 列出包含的文件名）
- 摘要一句话，让用户秒判断"是不是预期那份"

**模板：**

```markdown
## 资料清单

| # | 类型   | 来源                       | 摘要（一句话）           |
|---|--------|----------------------------|--------------------------|
| 1 | md     | notes/react-hooks.md       | React Hooks 基础用法     |
| 2 | pdf    | papers/attention.pdf       | Attention 机制原理       |
| 3 | url    | https://arxiv.org/xxx      | Transformer 论文         |
| 4 | folder | tutorials/ (含 5 个 md)    | 进阶教程合集             |

**文件夹包含的文件：**
- `tutorials/` → `intro.md`、`advanced.md`、`patterns.md`、`faq.md`、`examples.md`
```

**字段说明：**
- `#`：序号，对应学习路径段里的出处引用
- `类型`：`md` / `pdf` / `url` / `folder`
- `来源`：相对路径或完整 URL
- `摘要`：一句话描述这份资料讲什么

## 段落 2：主题概述

**规则：** 2-3 句话说清楚"资料讲什么、目标读者、读完能掌握什么"。

**模板：**

```markdown
## 主题概述

本资料围绕 React Hooks 展开，目标读者是有 React class 组件经验的开发者。读完能掌握常用 Hooks（useState/useEffect/useContext 等）的用法、底层逻辑和常见陷阱。
```

## 段落 3：学习路径（核心）

**核心目的：** 让用户拿到资料后知道「该怎么学」——按资料本身的知识体系分阶段递进，而不是平铺知识点。

### 阶段划分原则

- **按资料本身的知识体系分阶段**，不套通用模板（如「基础/进阶/实战」）
- 综合 N 份 subagent 摘要里的「资料知识结构」信息，识别跨资料的依赖关系
- 把所有知识点归入若干阶段，每阶段内知识点有内在递进逻辑
- 阶段数随资料复杂度变化（简单资料 2 个阶段，复杂资料 4-5 个）

### 每阶段的三段式结构

```markdown
### 阶段 N：{阶段名}

**学习目标**：{学完应能 XXX，可验证的输出}

**学习内容**：
- **{知识点名}**：{1-2 句解释} —— 出自 {出处}
- **{知识点名}**：{1-2 句解释} —— 出自 {出处}

**学习提示**：
- {原"重点"信息：这里要多花时间，因为 XXX}
- {原"难点"信息：这里容易卡，建议 XXX}
```

**字段说明：**

| 字段 | 必需 | 内容 |
|------|------|------|
| 阶段名 | 是 | 用动作或目标命名（如「建立基本认知」「掌握核心机制」「实战应用」），不用"阶段 1"这种空标签 |
| 学习目标 | 是 | 学完应能做到什么，**可验证**（如"应能说出 X 是什么"、"应能用 Y 写一个 Z"） |
| 学习内容 | 是 | 本阶段涉及的知识点，每点配 1-2 句解释 + **章节出处** |
| 学习提示 | 按需 | 重点 / 难点 / 易错点 / 学习建议（融进路径里，不再独立成段） |

### 知识点出处格式（按资料类型）

| 资料类型 | 出处格式 | 示例 |
|---------|---------|------|
| md | `第 X 章「章节名」` 或 `第 X.Y 节` | `第 2.3 节「依赖数组」` |
| pdf | `第 X 章` 或 `p.Y` | `第 4 章 / p.23` |
| url | `「页面段落名」段` | `「Hooks API Reference」段` |
| 单资料（资料总数 = 1） | 省略 `#N`，直接 `第 X 章` | `第 2 章「状态管理」` |
| 多资料 | 前面加 `#N ` 编号 | `#1 第 2 章` / `#2 第 4 节` |

### 完整阶段示例（React Hooks 主题，多资料）

```markdown
## 学习路径

### 阶段 1：建立基本认知

**学习目标**：学完应能说出 Hook 是什么、解决了什么问题，并用 useState 写一个简单计数器

**学习内容**：
- **useState**：管理函数组件状态，返回 [state, setState] —— 出自 #1 第 2 章「状态管理」
- **Hooks 规则**：必须在顶层调用，不能在条件/循环里 —— 出自 #1 第 2.3 节

**学习提示**：
- 如果你写过 class 组件，对比 this.setState 来理解 useState
- 「依赖数组不要撒谎」这条规则容易忽略，但要先记住
- 官方 ESLint plugin `eslint-plugin-react-hooks` 可以自动检测违规，建议立刻装上

### 阶段 2：掌握核心机制

**学习目标**：学完应能用 Hooks 写一个完整组件，并解释 effect 的执行时机和清理逻辑

**学习内容**：
- **useEffect**：处理副作用，第二个参数是依赖数组 —— 出自 #1 第 3 章 + #2「Effect 内部原理」
- **闭包陷阱**：useEffect 里读到的是创建时的快照，不是最新值 —— 出自 #2 第 4 节
- **useContext**：跨组件共享状态，避免 prop drilling —— 出自 #1 第 4 章

**学习提示**：
- **闭包陷阱是最大坑**——先跑一遍 demo 复现问题（看到 stale state 现象）再读原理，否则光看文字很难理解
- effect 的清理函数执行时机（卸载时 + 重新执行前）建议画一张时间线图辅助记忆

### 阶段 3：实战与进阶

**学习目标**：学完应能抽象自定义 Hook 复用逻辑，并能判断何时该用 useMemo/useCallback 优化性能

**学习内容**：
- **useMemo / useCallback**：性能优化，缓存值和函数 —— 出自 #3「Hooks API Reference」
- **useRef**：保存可变值且不触发重渲染 —— 出自 #3「Hooks API Reference」
- **自定义 Hooks**：复用状态逻辑，约定 useXxx 命名 —— 出自 #1 第 5 章

**学习提示**：
- **useMemo / useCallback 不是越多越好**——缓存本身有成本，不假思索地加反而拖慢性能。先用 React DevTools Profiler 测出瓶颈再优化
- 自定义 Hook 是 Hooks 真正强大的地方，建议把前面阶段写过的重复逻辑都试着抽一遍
```

**与题库的关联：** 题库里每道题的 `knowledge_point` 字段按知识点名引用，必须对齐到学习路径里出现的某个知识点名。

## 完整示例（React Hooks 主题，多资料）

```markdown
---
dg-learn-guide: true
dg-learn-version: 1.2
title: React Hooks 学习指南
created_at: 2026-06-27
source_materials:
  - ../../notes/react-hooks.md
  - ../../papers/hooks-internals.pdf
  - https://react.dev/reference/react/hooks
knowledge_points: [useState, Hooks Rules, useEffect, 闭包陷阱, useContext, useMemo, useCallback, useRef, 自定义 Hooks]
learning_path:
  - stage: 1
    name: 建立基本认知
    objective: 学完应能说出 Hook 是什么，并用 useState 写一个计数器
    knowledge_points: [useState, Hooks Rules]
  - stage: 2
    name: 掌握核心机制
    objective: 学完应能用 Hooks 写完整组件，解释 effect 执行时机
    knowledge_points: [useEffect, 闭包陷阱, useContext]
  - stage: 3
    name: 实战与进阶
    objective: 学完应能抽象自定义 Hook，判断性能优化时机
    knowledge_points: [useMemo, useCallback, useRef, 自定义 Hooks]
stats:
  total_knowledge_points: 9
  materials_count: 3
  stages_count: 3
quiz_file: ./quiz.md
---

# React Hooks 学习指南

## 资料清单

| # | 类型   | 来源                              | 摘要（一句话）              |
|---|--------|-----------------------------------|-----------------------------|
| 1 | md     | ../../notes/react-hooks.md        | React Hooks 基础用法        |
| 2 | pdf    | ../../papers/hooks-internals.pdf  | Hooks 底层实现原理          |
| 3 | url    | https://react.dev/reference/react/hooks | 官方 Hooks API 文档   |

## 主题概述

本资料围绕 React Hooks 展开，目标读者是有 React class 组件经验的开发者。读完能掌握常用 Hooks 的用法、底层逻辑和常见陷阱。

## 学习路径

### 阶段 1：建立基本认知

**学习目标**：学完应能说出 Hook 是什么、解决了什么问题，并用 useState 写一个简单计数器

**学习内容**：
- **useState**：管理函数组件状态，返回 [state, setState] —— 出自 #1 第 2 章「状态管理」
- **Hooks 规则**：必须在顶层调用，不能在条件/循环里 —— 出自 #1 第 2.3 节

**学习提示**：
- 如果你写过 class 组件，对比 this.setState 来理解 useState
- 「依赖数组不要撒谎」这条规则容易忽略，但要先记住

### 阶段 2：掌握核心机制

**学习目标**：学完应能用 Hooks 写一个完整组件，并解释 effect 的执行时机和清理逻辑

**学习内容**：
- **useEffect**：处理副作用，第二个参数是依赖数组 —— 出自 #1 第 3 章 + #2「Effect 内部原理」
- **闭包陷阱**：useEffect 里读到的是创建时的快照 —— 出自 #2 第 4 节
- **useContext**：跨组件共享状态，避免 prop drilling —— 出自 #1 第 4 章

**学习提示**：
- **闭包陷阱是最大坑**——先跑 demo 复现问题再读原理
- effect 清理时机建议画一张时间线图辅助记忆

### 阶段 3：实战与进阶

**学习目标**：学完应能抽象自定义 Hook 复用逻辑，并能判断何时该用 useMemo/useCallback 优化性能

**学习内容**：
- **useMemo / useCallback**：性能优化，缓存值和函数 —— 出自 #3「Hooks API Reference」
- **useRef**：保存可变值且不触发重渲染 —— 出自 #3「Hooks API Reference」
- **自定义 Hooks**：复用状态逻辑，约定 useXxx 命名 —— 出自 #1 第 5 章

**学习提示**：
- **useMemo / useCallback 不是越多越好**——先用 Profiler 测出瓶颈再优化
- 自定义 Hook 是 Hooks 真正强大的地方
```

## frontmatter 字段说明

| 字段 | 必需 | 说明 |
|------|------|------|
| `dg-learn-guide` | 是 | 固定 `true`，标识这是学习指南（与题库的 `dg-learn-quiz` 对应） |
| `dg-learn-version` | 是 | skill 版本，当前 `1.2` |
| `title` | 是 | 学习指南标题（根据资料主题生成） |
| `created_at` | 是 | 生成日期 `YYYY-MM-DD` |
| `source_materials` | 是 | 资料路径/URL 数组（与资料清单表格同步）。**路径相对于 guide.md 所在目录**——产物在 `dg-learn/{name}/` 下，资料在 cwd 根时需写 `../../xxx.md` |
| `knowledge_points` | 是 | 所有知识点名称的平铺数组（供题库按名引用，不依赖阶段结构） |
| `learning_path` | 是 | 结构化字段，记录阶段划分（每个阶段含 `stage` / `name` / `objective` / `knowledge_points`） |
| `stats.total_knowledge_points` | 是 | 核心知识点总数 |
| `stats.materials_count` | 是 | 资料总数 |
| `stats.stages_count` | 是 | 学习路径的阶段总数 |
| `quiz_file` | 是 | 关联的题库文件相对路径（同目录，固定 `./quiz.md` 或 `./quiz/quiz-index.md`） |

### source_materials 路径写法（重要）

产物在 `dg-learn/{name}/guide.md`，资料在 `{cwd}/` 下，相对回溯：

| 资料位置 | source_materials 写法 |
|---------|----------------------|
| `{cwd}/notes.md` | `../../notes.md` |
| `{cwd}/papers/x.pdf` | `../../papers/x.pdf` |
| URL | 原样完整 URL，如 `https://react.dev/...` |
