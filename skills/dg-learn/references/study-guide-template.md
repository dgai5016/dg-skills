# 学习指南模板

学习指南是 dg-learn 生成模式的核心产物之一。本文定义其段落结构、详细程度和呈现规则。

## 整体结构

学习指南按以下顺序组织段落（**前 6 段固定生成，后 3 段按需生成**）：

| 顺序 | 段落 | 是否固定 | 作用 |
|------|------|---------|------|
| 1 | 资料清单 | 固定 | 让用户核对所有纳入的资料，避免漏 |
| 2 | 主题概述 | 固定 | 一句话说明资料讲什么、目标读者 |
| 3 | 核心知识点 | 固定 | 必须掌握的概念清单（题库的"考点来源"） |
| 4 | 重点 | 固定 | 重要且需要重点关注 |
| 5 | 难点 | 固定 | 难掌握的部分 |
| 6 | 学习路径 | 固定 | 推荐学习顺序 + 每份资料角色标签 |
| 7 | 先修知识 | 按需 | 学这个之前需要先懂什么（资料里能提取到才写） |
| 8 | 常见误区 | 按需 | 容易理解错的地方（资料里能提取到才写） |
| 9 | 延伸阅读 | 按需 | 资料外的参考资料（资料里能提取到才写） |

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
- `#`：序号，对应学习路径段里的引用
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

## 段落 3：核心知识点

**规则：**
- 列出所有必须掌握的概念（这是题库的"考点来源"）
- 每个知识点配 1-2 句解释（中等详细度）
- 用编号列表，便于后续题目用 `knowledge_point` 字段引用

**模板：**

```markdown
## 核心知识点

1. **useState**：管理函数组件状态，返回 [state, setState]
2. **useEffect**：处理副作用，第二个参数是依赖数组
3. **useContext**：跨组件共享状态，避免 prop drilling
4. **useMemo / useCallback**：性能优化，缓存值和函数
5. **useRef**：保存可变值且不触发重渲染
6. **自定义 Hooks**：复用状态逻辑，约定 useXxx 命名
7. **Hooks 规则**：必须在顶层调用，不能在条件/循环里
```

**与题库的关联：** 题库里每道题的 `knowledge_point` 字段必须对齐到这里的某个知识点（用知识点名称引用）。

## 段落 4：重点

**规则：**
- 重要且需要重点关注的知识点
- 简要说明为什么是重点

**模板：**

```markdown
## 重点

- **依赖数组的判断逻辑**：useEffect 的依赖数组决定 effect 何时重新执行，理解错了会导致无限渲染或不更新
- **Hooks 规则**：ESLint plugin 可以帮助检测违规，必须遵守
- **自定义 Hooks 抽象**：把组件逻辑提取成可复用的 Hooks，是 Hooks 真正强大的地方
```

## 段落 5：难点

**规则：**
- 难掌握的部分（提示学习者多花时间）
- 说明常见困惑点

**模板：**

```markdown
## 难点

- **闭包陷阱**：useEffect 里读到的是创建时的 state 快照，不是最新值——需要用 ref 或函数式更新解决
- **依赖数组的「不要撒谎」原则**：每个用到的外部变量都要进依赖数组，撒谎会导致 bug 难排查
- **useMemo / useCallback 的滥用**：缓存本身有成本，不假思索地加反而拖慢性能
```

## 段落 6：学习路径

**规则：**
- 推荐学习顺序（按资料 # 编号引用）
- 每份资料一个角色标签（基础 / 重点 / 难点 / 应用 / 进阶）
- 简要说明每步的目的

**角色标签：**
- **基础**：建立整体认知的入门资料
- **重点**：覆盖核心知识点的资料
- **难点**：内容难懂，需要多花时间
- **应用**：实战场景、案例
- **进阶**：扩展阅读、深度内容

**模板：**

```markdown
## 学习路径

1. 先读 #1（基础）—— 建立 Hooks 整体认知
2. 再读 #2（难点）—— 理解底层运行逻辑（依赖数组、闭包陷阱），多花时间
3. 接着读 #3（应用）—— 看实际场景如何用 Hooks
4. 最后读 #4（进阶）—— 高级模式、性能优化、自定义 Hooks
```

## 段落 7-9：按需段落

**先修知识、常见误区、延伸阅读**——资料里明显能提取到就生成，提取不到就不写。

### 先修知识

```markdown
## 先修知识

- React class 组件（this.state、生命周期）
- JavaScript 闭包基础
- ES6 解构赋值
```

### 常见误区

```markdown
## 常见误区

- **「Hooks 能完全替代 class」**：实际上 error boundary 目前仍需 class 组件
- **「useEffect 第二个参数留空就 OK」**：留空 = 每次渲染都执行，可能引发性能问题或无限循环
```

### 延伸阅读

```markdown
## 延伸阅读

- [React 官方 Hooks FAQ](https://react.dev/reference/react/hooks)
- 《React 设计原理》第 5 章
```

## 完整示例（React Hooks 主题）

```markdown
---
dg-learn-guide: true
dg-learn-version: 1.0
title: React Hooks 学习指南
created_at: 2026-06-26
source_materials:
  - notes/react-hooks.md
  - papers/hooks-internals.pdf
  - https://react.dev/reference/react/hooks
knowledge_points: [useState, useEffect, useContext, useMemo, useCallback, useRef, Custom Hooks, Hooks Rules]
stats:
  total_knowledge_points: 8
  materials_count: 3
quiz_file: ./quiz-20260626-143000.md
---

# React Hooks 学习指南

## 资料清单

| # | 类型   | 来源                              | 摘要（一句话）              |
|---|--------|-----------------------------------|-----------------------------|
| 1 | md     | notes/react-hooks.md              | React Hooks 基础用法        |
| 2 | pdf    | papers/hooks-internals.pdf        | Hooks 底层实现原理          |
| 3 | url    | https://react.dev/reference/react/hooks | 官方 Hooks API 文档   |

## 主题概述

本资料围绕 React Hooks 展开，目标读者是有 React class 组件经验的开发者。读完能掌握常用 Hooks 的用法、底层逻辑和常见陷阱。

## 核心知识点

1. **useState**：管理函数组件状态，返回 [state, setState]
2. **useEffect**：处理副作用，第二个参数是依赖数组
3. **useContext**：跨组件共享状态，避免 prop drilling
4. **useMemo / useCallback**：性能优化，缓存值和函数
5. **useRef**：保存可变值且不触发重渲染
6. **自定义 Hooks**：复用状态逻辑，约定 useXxx 命名
7. **Hooks 规则**：必须在顶层调用，不能在条件/循环里

## 重点

- **依赖数组的判断逻辑**：决定 effect 何时重新执行
- **Hooks 规则**：必须遵守，可用 ESLint plugin 检测
- **自定义 Hooks 抽象**：逻辑复用的核心

## 难点

- **闭包陷阱**：useEffect 里读到的是创建时的快照
- **依赖数组的「不要撒谎」原则**
- **useMemo / useCallback 的滥用陷阱**

## 学习路径

1. 先读 #1（基础）—— 建立 Hooks 整体认知
2. 再读 #2（难点）—— 理解底层逻辑，多花时间
3. 最后读 #3（应用）—— 落地实践，查漏补缺

## 常见误区

- 「Hooks 能完全替代 class」—— error boundary 仍需 class
- 「useEffect 第二个参数留空就 OK」—— 可能引发性能问题
```

## frontmatter 字段说明

| 字段 | 必需 | 说明 |
|------|------|------|
| `dg-learn-guide` | 是 | 固定 `true`，标识这是学习指南（与题库的 `dg-learn-quiz` 对应） |
| `dg-learn-version` | 是 | skill 版本，当前 `1.0` |
| `title` | 是 | 学习指南标题（根据资料主题生成） |
| `created_at` | 是 | 生成日期 `YYYY-MM-DD` |
| `source_materials` | 是 | 资料路径/URL 数组（与资料清单表格同步） |
| `knowledge_points` | 是 | 核心知识点名称数组（与题库共享） |
| `stats.total_knowledge_points` | 是 | 核心知识点总数 |
| `stats.materials_count` | 是 | 资料总数 |
| `quiz_file` | 是 | 关联的题库文件相对路径 |
