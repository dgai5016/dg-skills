# 题库模板

题库是 dg-learn 生成模式的核心产物，也是测试模式的输入。本文定义题型字段、答案暴露方式、文件结构和 frontmatter schema。

## 4 种题型字段定义

### 公共字段（所有题型都有）

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 题号，如 `Q01`、`Q02`... |
| `type` | enum | 是 | `choice` / `judge` / `short` / `apply` |
| `difficulty` | enum | 是 | `easy` / `medium` / `hard` |
| `knowledge_point` | string | 是 | 关联学习指南的核心知识点名称 |
| `question` | string | 是 | 题干 |
| `source` | string | 是 | 关联资料 # 编号（如 `#1`） |
| `explanation` | string | 是 | 解析（说明为什么是这个答案） |

### 选择题（choice）

```yaml
options:                    # 选项列表
  - "A. 数组"
  - "B. 对象"
  - "C. 函数"
  - "D. 字符串"
answer: "A"                 # 单选时是单个字符串
# 可选：
multi: true                 # 标记多选题，此时 answer 是数组
answer: ["A", "C"]
```

**渲染示例（markdown）**：

```markdown
### Q01（选择 · 简单）—— useState 基础

useEffect 的第二个参数是什么类型？

A. 数组
B. 对象
C. 函数
D. 字符串

<details>
<summary>答案与解析</summary>

**答案：A**

**解析：** 依赖数组的用途是控制 effect 何时重新执行。空数组表示只在 mount 时执行一次，不传表示每次渲染都执行。

</details>
```

**多选题渲染示例**：

```markdown
### Q03（多选 · 中等）—— Hooks 规则

以下哪些是 React Hooks 的使用规则？（多选）

A. 必须在顶层调用
B. 可以在 if 语句里调用
C. 必须在函数组件或自定义 Hook 里调用
D. 可以在普通函数里调用

<details>
<summary>答案与解析</summary>

**答案：A、C**

**解析：** Hooks 必须在顶层调用（不能在条件、循环里），且只能在函数组件或自定义 Hooks 里调用。

</details>
```

### 判断题（judge）

```yaml
answer: "错误"    # 或 "正确"
```

**渲染示例**：

```markdown
### Q02（判断 · 简单）—— Hooks 规则

在 if 语句里调用 Hooks 是允许的。

<details>
<summary>答案与解析</summary>

**答案：错误**

**解析：** Hooks 必须在组件顶层调用，不能放在条件、循环或嵌套函数里。这是因为 React 依靠调用顺序来对应 Hooks 与内部 state。

</details>
```

### 简答题（short）

```yaml
reference_answer: "完整参考答案（纯文本）"
scoring_points:               # 评分要点，每个 1 分
  - "组件卸载时执行一次"
  - "下次 effect 重新执行前也会执行"
  - "用于清理副作用（订阅、定时器等）"
```

**渲染示例**：

```markdown
### Q05（简答 · 中等）—— Effect 清理

解释 useEffect 清理函数的执行时机。

<details>
<summary>参考答案与解析</summary>

**参考答案：**
useEffect 的清理函数在两种时机执行：组件卸载时执行一次；以及每次 effect 重新执行前（如果依赖数组非空且依赖发生变化）。常见用途是清理副作用，如移除事件监听、清除定时器、取消订阅。

**评分要点（AI 评分时逐项检查）：**
- ✓ 组件卸载时执行一次
- ✓ 下次 effect 重新执行前也会执行
- ✓ 用于清理副作用（订阅、定时器等）

**解析：** 清理函数是 effect return 的函数。React 保证在每次重新执行 effect 前调用上一次的清理函数，避免内存泄漏和过期数据。

</details>
```

### 应用题（apply）

```yaml
reference_solution: |        # 代码参考实现（多行）
  ```jsx
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  ```
scoring_points:               # 评分要点
  - "使用 useEffect 而非 class 生命周期"
  - "在 effect 内注册监听"
  - "返回清理函数移除监听"
  - "依赖数组为空（只注册一次）"
```

**渲染示例**：

```markdown
### Q07（应用 · 困难）—— Effect 综合

实现一个组件 `WindowWidth`，监听窗口 resize，展示当前窗口宽度。要求组件卸载时移除监听器。

<details>
<summary>参考实现与解析</summary>

**参考实现：**
```jsx
function WindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return <div>当前宽度：{width}px</div>;
}
```

**评分要点（AI 评分时逐项检查）：**
- ✓ 使用 useEffect 而非 class 生命周期
- ✓ 在 effect 内注册监听
- ✓ 返回清理函数移除监听
- ✓ 依赖数组为空（只注册一次）

**解析：** 关键在于 effect return 一个清理函数。如果忘掉，组件卸载后监听器还在，会引用已卸载的组件导致内存泄漏。

</details>
```

## 文件结构

### 题目总数 ≤ 20：单文件

```
quiz-{YYYYMMDD-HHmmss}.md
```

内部结构：
```markdown
---
<frontmatter>
---

# {title}

## 题目

### Q01 ...
### Q02 ...
...

## 答案汇总（可选，方便快速浏览）

| 题号 | 答案 |
|------|------|
| Q01  | A    |
| Q02  | 错误 |
| ...  | ...  |
```

每题后紧跟 `<details>` 折叠的答案与解析（详见上面题型渲染示例）。

### 题目总数 > 20：拆分目录

```
quiz-{YYYYMMDD-HHmmss}/
├── quiz-index.md              # 索引文件
├── choice/
│   ├── hooks.md               # 选择题 - Hooks 知识点（题量 > 5 才拆）
│   ├── state.md               # 选择题 - State 知识点
│   └── ...
├── judge/
│   └── judge.md               # 判断题（合并，因为题量 ≤ 5）
├── short/
│   └── ...
└── apply/
    └── apply.md               # 应用题（合并）
```

**拆分规则（两级）：**

1. **第一级**：按题型分目录（`choice/` / `judge/` / `short/` / `apply/`）
2. **第二级**：按知识点分文件
   - **二级阈值**：某题型 ≤ 5 题时不二级拆，整题型合并单文件（如 `choice.md`）
   - 知识点来源：学习指南"核心知识点"段落

**子文件命名：**
- 按知识点拆时：`{知识点slug}.md`（如 `hooks.md`、`state-management.md`，slug 用小写连字符）
- 不拆时：`{题型}.md`（如 `judge.md`）

### 索引文件（拆分时必需）

`quiz-index.md` 内容：

```markdown
---
dg-learn-quiz: true
dg-learn-type: index
dg-learn-version: 1.0
title: React Hooks 学习题库（索引）
created_at: 2026-06-26
source_materials:
  - notes/react-hooks.md
knowledge_points: [useState, useEffect, useContext]
stats:
  total: 25
  by_type: {choice: 12, judge: 5, short: 6, apply: 2}
  by_difficulty: {easy: 8, medium: 12, hard: 5}
guide_file: ../guide-20260626-143000.md
sub_quizzes:
  - {path: choice/hooks.md, type: choice, knowledge_point: Hooks, count: 6}
  - {path: choice/state.md, type: choice, knowledge_point: State, count: 6}
  - {path: judge/judge.md, type: judge, knowledge_point: null, count: 5}
  - {path: short/short.md, type: short, knowledge_point: null, count: 6}
  - {path: apply/apply.md, type: apply, knowledge_point: null, count: 2}
---

# React Hooks 学习题库（索引）

## 总览

- 总题数：25
- 选择题：12（简单 4 / 中等 6 / 困难 2）
- 判断题：5（简单 2 / 中等 2 / 困难 1）
- 简答题：6（中等 4 / 困难 2）
- 应用题：2（中等 1 / 困难 1）

## 子题库

### 选择题（12 题）
- [choice/hooks.md](choice/hooks.md) —— 6 题，Hooks 相关
- [choice/state.md](choice/state.md) —— 6 题，State 相关

### 判断题（5 题）
- [judge/judge.md](judge/judge.md) —— 5 题（合并，题量少不二级拆）

### 简答题（6 题）
- [short/short.md](short/short.md) —— 6 题（合并）

### 应用题（2 题）
- [apply/apply.md](apply/apply.md) —— 2 题（合并）

## 关联学习指南
- [../guide-20260626-143000.md](../guide-20260626-143000.md)
```

### 子文件（拆分时）

每个子文件的 frontmatter：

```yaml
---
dg-learn-quiz: true
dg-learn-type: subquiz
dg-learn-version: 1.0
parent_index: ../quiz-index.md
type: choice                       # 该子文件的题型
knowledge_point: Hooks             # 该子文件的知识点（合并时为 null）
count: 6
---
```

## 错题集文件

测试结束自动生成 `wrong-answers-{YYYYMMDD-HHmmss}.md`，本身也是题库格式，下次 `/dg-learn wrong-answers-xxx.md` 直接进入测试模式重做错题。

**frontmatter：**

```yaml
---
dg-learn-quiz: true
dg-learn-type: wrong-answers
dg-learn-version: 1.0
title: React Hooks 错题集
created_at: 2026-06-26
parent_quiz: ./quiz-20260626-143000.md
stats:
  total: 4
  by_type: {choice: 0, judge: 1, short: 2, apply: 1}
  by_difficulty: {easy: 0, medium: 2, hard: 2}
test_taken_at: 2026-06-26 15:30
total_quiz_count: 18
---
```

**内容结构：**

```markdown
# React Hooks 错题集

> 来源题库：[quiz-20260626-143000.md](quiz-20260626-143000.md)
> 测试时间：2026-06-26 15:30
> 错题数：4 / 总题数 18（正确率 78%）

## 题目

### Q02（判断 · 简单）—— Hooks 规则

在 if 语句里调用 Hooks 是允许的。

**你的答案：** 正确
**正确答案：** 错误

<details>
<summary>解析</summary>

**解析：** Hooks 必须在顶层调用，不能放在条件、循环或嵌套函数里。React 依靠调用顺序对应 Hooks 与内部 state。

</details>

### Q05（简答 · 中等）—— Effect 清理

解释 useEffect 清理函数的执行时机。

**你的答案：** 卸载时执行一次
**命中要点：** 1/3
- ✓ 组件卸载时执行一次
- ✗ 下次 effect 重新执行前也会执行
- ✗ 用于清理副作用

<details>
<summary>参考答案与解析</summary>

**参考答案：** ...

**评分要点：** ...

**解析：** ...

</details>

### Q07（应用 · 困难）—— Effect 综合

实现一个组件 WindowWidth，监听窗口 resize...

**你的答案：** （用户提交的代码）

**命中要点：** 2/4
- ✓ 使用 useEffect 而非 class 生命周期
- ✓ 在 effect 内注册监听
- ✗ 返回清理函数移除监听
- ✗ 依赖数组为空

<details>
<summary>参考实现与解析</summary>

**参考实现：**
...

**评分要点：** ...

**解析：** ...

</details>
```

## frontmatter schema 汇总

| 字段 | 主文件 | 索引文件 | 子文件 | 错题集 |
|------|--------|---------|--------|--------|
| `dg-learn-quiz` | `true` | `true` | `true` | `true` |
| `dg-learn-type` | `quiz` | `index` | `subquiz` | `wrong-answers` |
| `dg-learn-version` | ✓ | ✓ | ✓ | ✓ |
| `title` | ✓ | ✓ | - | ✓ |
| `created_at` | ✓ | ✓ | - | ✓ |
| `source_materials` | ✓ | ✓ | - | - |
| `knowledge_points` | ✓ | ✓ | - | - |
| `stats` | ✓ | ✓ | - | ✓ |
| `guide_file` | ✓ | ✓ | - | - |
| `sub_quizzes` | - | ✓（必需） | - | - |
| `parent_index` | - | - | ✓ | - |
| `type`（题型） | - | - | ✓ | - |
| `knowledge_point` | - | - | ✓ | - |
| `count` | - | - | ✓ | - |
| `parent_quiz` | - | - | - | ✓ |
| `test_taken_at` | - | - | - | ✓ |
| `total_quiz_count` | - | - | - | ✓ |

**模式识别核心：** 所有题库类文件都带 `dg-learn-quiz: true`，dg-learn skill 读到这个字段就进入测试模式（区别于生成模式）。
