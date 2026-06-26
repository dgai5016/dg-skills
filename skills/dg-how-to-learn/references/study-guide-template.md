# 学习指南模板

学习指南是 dg-how-to-learn 的**唯一产物**。本文定义其段落结构、详细程度和呈现规则。

## 整体结构

学习指南按以下顺序组织段落（**3 段全部固定生成**）：

| 顺序 | 段落 | 作用 |
|------|------|------|
| 1 | 资料清单 | ASCII 树展示文件夹结构 + 文件间依赖关系 |
| 2 | 主题概述 | 一句话说明这份资料讲什么、目标读者 |
| **3** | **学习路径** | **核心**：按文件分阶段的学习顺序，每个文件讲什么 + 怎么学 |

聚焦对资料文件夹本身的学习——不写知识点总结、不写先修知识、不写延伸阅读等资料外信息。

---

## 段落 1：资料清单（树状）

### 设计目的

让用户一眼看到文件夹的目录结构 + 每个文件讲什么 + 文件之间的依赖关系，作为「学习路径」的地图基础。

### 格式

ASCII 树展示目录结构，每个文件**至少两行说明**：

```markdown
## 资料清单

react-hooks-tutorials/    （输入的文件夹，共 7 个 .md 文件）
├── intro.md
│   入门：Hooks 是什么、为什么出现
│   首读，是后续所有内容的前置
├── basic/
│   ├── state.md
│   │   useState 基础用法
│   │   前置：intro.md
│   ├── effect.md
│   │   useEffect 副作用处理
│   │   前置：state.md（用到 state 概念）
│   └── context.md
│       useContext 跨组件共享
│       前置：state.md
├── advanced/
│   ├── closures.md
│   │   闭包陷阱（effect 里读到 stale state）
│   │   前置：effect.md
│   └── patterns.md
│       自定义 Hook 模式与抽象
│       前置：effect.md、context.md
└── examples/
    └── counter.md
        完整示例：计数器组件
        前置：state.md、effect.md
```

### 字段说明

每个文件至少两行：

- **第 1 行**：一句话描述这个文件讲什么
- **第 2 行起**：与其他文件的关联（可选），格式 `前置：xxx.md` / `并行：xxx.md` / `延伸：xxx.md`，可带括号补充说明

### 关联类型

| 类型 | 含义 |
|------|------|
| `前置：X.md` | 学这个文件前要先看 X |
| `并行：X.md` | 与 X 是平级主题，可互换学习顺序 |
| `延伸：X.md` | 学完后可看 X 深入 |

### 树形符号约定

- 文件夹/文件名后换行，下一行起每行缩进对齐
- 同级用 `├──`，最后一级用 `└──`
- 续行用 `│`（非末级）或空格（末级）对齐

### 信息来源

关联信息由**主 skill 直接读取所有文件原文后判断**——看到每个文件的完整内容，能精准识别交叉引用（如 A 文件里写「前面讲过的 X」对应到 B 文件）、概念衔接、目录结构。不依赖任何 subagent 摘要中间层。

---

## 段落 2：主题概述

**规则：** 2-3 句话说清楚「这份资料讲什么、目标读者、读完能掌握什么」。

**模板：**

```markdown
## 主题概述

本资料围绕 React Hooks 展开，目标读者是有 React class 组件经验的开发者。读完能掌握常用 Hooks 的用法、底层逻辑和常见陷阱，能独立用 Hooks 写完整功能的组件。
```

---

## 段落 3：学习路径（文件维度，核心）

### 设计目的

直接回答用户「先学哪几个、后学哪几个、最后学哪几个」的问题——按文件分阶段，每个文件讲什么 + 怎么学 + 在体系中的位置。

**不是知识点维度**——不要知识点罗列、不要知识点带出处。

### 「学习路径」段格式

```markdown
## 学习路径

### 阶段 1：建立基本认知（先学）

**这一步的目标**：理解 Hooks 是什么、为什么出现

1. **intro.md**
   - 讲什么：Hooks 的 motivation、解决了 class 组件什么痛点、基本概念。整个学习路径的入口，后续所有文件都默认你已经看过它
   - 怎么学：通读一遍建立认知，重点看 motivation 部分，API 细节先不记

### 阶段 2：掌握核心 API

**这一步的目标**：能用 Hooks 写一个完整功能的组件

1. **basic/state.md**
   - 讲什么：useState 的用法（初始化、更新、函数式更新）。基础 API，所有后续 Hooks 都建立在状态概念上
   - 怎么学：边读边敲计数器 demo，理解 setter 的异步性

2. **basic/effect.md**
   - 讲什么：useEffect 执行时机、依赖数组、清理函数。副作用核心机制，也是后续闭包陷阱章节的前置
   - 怎么学：先掌握依赖数组的概念，再看闭包陷阱部分（建议跑 demo 复现 stale state）

3. **basic/context.md**
   - 讲什么：useContext 跨组件共享，对比 Context API。和 state.md 是平级核心 API
   - 怎么学：和 state.md 对比着看，理解「状态共享」 vs 「状态独立」

### 阶段 3：进阶与实战（最后学）

**这一步的目标**：掌握自定义 Hook 抽象与性能优化

1. **advanced/closures.md**
   - 讲什么：闭包陷阱的原理与 3 种解决方案。属于 effect.md 的深入延伸，没看过 effect 直接看会看不懂
   - 怎么学：必须有 effect.md 基础，建议先跑出 bug 再读原理

2. **advanced/patterns.md**
   - 讲什么：自定义 Hook 的常见模式。属于把前两阶段知识综合应用的章节
   - 怎么学：把阶段 2 写过的组件逻辑试着抽成 Hook

3. **examples/counter.md**
   - 讲什么：完整计数器组件示例（综合 state + effect）。整份资料的收尾，用来检验前两阶段的学习效果
   - 怎么学：自己先实现一遍，再对照源码
```

### 每个文件的展示规则

每个文件包含两个 bullet 字段：

- **讲什么**：1-2 句话。同时做三件事：
  - 概括文件的主题和重点
  - **融入「在体系中的位置」**——点出它是入口 / 基础 / 核心 / 进阶 / 综合 / 收尾等角色
  - 关键名词可以提（如「useState」「依赖数组」），但**不展开解释**——展开是文件本身的职责
- **怎么学**：1-2 句阅读建议。要不要敲代码？要不要对比看？要不要跑 demo？需要什么前置？

**禁止**：

- ❌ 知识点罗列（「useState：管理函数组件状态」「Hooks 规则：必须在顶层调用」）
- ❌ 详细解释概念（那是资料本身的职责）
- ❌ 章节出处（不再需要——本来就在讲文件）

### 阶段划分原则

- **按资料本身的学习递进划分**（不套通用模板如「基础/进阶/实战」）
- 阶段数随资料复杂度变化（简单资料 2 个阶段，复杂资料 4-5 个）
- 每阶段开头有「这一步的目标」——学完这一步能做什么（**可验证**）
- 阶段内文件有时有顺序（如阶段 2 的 state → effect → context），有时是并行（同阶段可互换顺序）
- **必须包含文件夹内的所有文件**——每个文件都要出现在某个阶段里

### 子目录与阶段的关系

文件夹内的子目录（如 `basic/`、`advanced/`）**通常**对应阶段，但**不要机械地「子目录 = 阶段」**——按学习递进划分，可能某个子目录被拆到不同阶段，也可能多个子目录合并成一个阶段。

---

## 完整示例（React Hooks 主题）

```markdown
---
dg-how-to-learn-guide: true
dg-how-to-learn-version: 1.3
title: React Hooks 学习指南
created_at: 2026-06-27
source_materials:
  - ../../react-hooks-tutorials/
stats:
  file_count: 7
  folder_count: 4
  stages_count: 3
---

# React Hooks 学习指南

## 资料清单

react-hooks-tutorials/    （共 7 个 .md 文件）
├── intro.md
│   入门：Hooks 是什么、为什么出现
│   首读，是后续所有内容的前置
├── basic/
│   ├── state.md
│   │   useState 基础用法
│   │   前置：intro.md
│   ├── effect.md
│   │   useEffect 副作用处理
│   │   前置：state.md
│   └── context.md
│       useContext 跨组件共享
│       前置：state.md
├── advanced/
│   ├── closures.md
│   │   闭包陷阱（effect 里读到 stale state）
│   │   前置：effect.md
│   └── patterns.md
│       自定义 Hook 模式与抽象
│       前置：effect.md、context.md
└── examples/
    └── counter.md
        完整示例：计数器组件
        前置：state.md、effect.md

## 主题概述

本资料围绕 React Hooks 展开，目标读者是有 React class 组件经验的开发者。读完能掌握常用 Hooks 的用法、底层逻辑和常见陷阱。

## 学习路径

### 阶段 1：建立基本认知（先学）

**这一步的目标**：理解 Hooks 是什么、为什么出现

1. **intro.md**
   - 讲什么：Hooks 的 motivation、解决了 class 组件什么痛点、基本概念。整个学习路径的入口
   - 怎么学：通读一遍建立认知，重点看 motivation 部分，API 细节先不记

### 阶段 2：掌握核心 API

**这一步的目标**：能用 Hooks 写一个完整功能的组件

1. **basic/state.md**
   - 讲什么：useState 的用法。基础 API，所有后续 Hooks 都建立在状态概念上
   - 怎么学：边读边敲计数器 demo

2. **basic/effect.md**
   - 讲什么：useEffect 执行时机与依赖数组。副作用核心机制，闭包陷阱章节的前置
   - 怎么学：先掌握依赖数组，再看闭包陷阱部分

3. **basic/context.md**
   - 讲什么：useContext 跨组件共享。和 state.md 是平级核心 API
   - 怎么学：和 state.md 对比着看

### 阶段 3：进阶与实战（最后学）

**这一步的目标**：掌握自定义 Hook 抽象与综合应用

1. **advanced/closures.md**
   - 讲什么：闭包陷阱的原理与解决方案。effect.md 的深入延伸
   - 怎么学：先跑出 bug 再读原理

2. **advanced/patterns.md**
   - 讲什么：自定义 Hook 的常见模式。前两阶段知识的综合应用
   - 怎么学：把阶段 2 的组件逻辑试着抽成 Hook

3. **examples/counter.md**
   - 讲什么：完整计数器组件示例。整份资料的收尾，检验学习效果
   - 怎么学：自己先实现一遍，再对照源码
```

---

## frontmatter 字段说明

| 字段 | 必需 | 说明 |
|------|------|------|
| `dg-how-to-learn-guide` | 是 | 固定 `true`，标识这是学习指南 |
| `dg-how-to-learn-version` | 是 | skill 版本，当前 `1.3` |
| `title` | 是 | 学习指南标题（根据资料主题生成） |
| `created_at` | 是 | 生成日期 `YYYY-MM-DD` |
| `source_materials` | 是 | 输入的文件夹路径数组（**路径相对 guide.md 所在目录**——产物在 `dg-how-to-learn/{name}/` 下，资料文件夹在父目录的父目录，写 `../../xxx/`） |
| `stats.file_count` | 是 | 文件夹内纳入处理的文件总数 |
| `stats.folder_count` | 是 | 文件夹内的子目录数（含根目录自己） |
| `stats.stages_count` | 是 | 学习路径的阶段总数 |

### source_materials 路径写法

产物在 `dg-how-to-learn/{name}/guide.md`，资料文件夹在 `{cwd}/` 下，相对回溯：

| 资料位置 | source_materials 写法 |
|---------|----------------------|
| `{cwd}/react-hooks-tutorials/` | `../../react-hooks-tutorials/` |
| `{cwd}/sub-dir/my-notes/` | `../../sub-dir/my-notes/` |
