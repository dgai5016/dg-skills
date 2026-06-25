# Conventional Commits 规范与推断规则

本 skill 默认按 [Conventional Commits](https://www.conventionalcommits.org/) 生成 commit message。本参考文档定义：
- type 全集与语义
- 如何从改动推断 type
- 如何从路径推断 scope
- 中英混合 message 的格式样例

## Type 全集

| type | 含义 | 典型触发信号 |
|------|------|-------------|
| `feat` | 新功能（用户可感知的新能力） | 新增公开 API、新增 UI 流程、新增 CLI 子命令 |
| `fix` | 修复 bug | 改动聚焦在某个报错/异常的处理、issue 关闭 |
| `docs` | 文档变更 | 只动 `*.md`、`docs/`、README、CHANGELOG |
| `style` | 代码格式（不影响逻辑） | 仅空格、缩进、分号、换行、import 顺序 |
| `refactor` | 重构（既不是 feat 也不是 fix） | 提取函数、改类名、调整结构，行为不变 |
| `perf` | 性能优化 | 缓存、算法替换、查询优化、减少 N+1 |
| `test` | 测试相关 | 新增/修改测试文件、fixture、mock |
| `build` | 构建系统或依赖 | `package.json`、`*.lock`、`Dockerfile`、`webpack.config.*`、`tsconfig.json` |
| `ci` | CI 配置 | `.github/workflows/`、`.gitlab-ci.yml`、`Jenkinsfile` |
| `chore` | 杂项（不发版的内部事务） | `.gitignore`、脚本工具、版本号 bump 但无功能变化 |
| `revert` | 回退之前的 commit | message 以 `This reverts commit ...` 收尾 |

## Type 推断规则（按优先级）

按以下顺序判断，命中即停：

1. **revert**：改动文件里出现 `git revert` 痕迹（`This reverts commit`），或 status 显示被删除的文件正好是上一次新增的内容 → `revert`
2. **ci**：改动**全部**在 `.github/workflows/`、`.gitlab-ci.yml`、`.circleci/`、`Jenkinsfile` 等目录 → `ci`
3. **build**：改动**全部**在构建/依赖文件（`package.json`、`*.lock`、`Dockerfile`、`*.config.js`、`tsconfig.json`、`Cargo.toml`、`go.mod`、`pyproject.toml`）→ `build`
4. **docs**：改动**全部**是 `*.md` / `docs/` / `README*` / `CHANGELOG*` → `docs`
5. **test**：改动**全部**是测试文件（文件名含 `test`/`spec`/`__tests__`，或扩展名 `.test.*`/`.spec.*`）→ `test`
6. **style**：diff 内容**全是**空白/格式调整（无逻辑变化，可用 `git diff -w` 判空）→ `style`
7. **perf**：改动文件名或路径含 `cache`/`index`/`query`/`optimize`，或 diff 出现明显的算法/数据结构优化（需人工判断）→ `perf`
8. **fix**：commit message 候选描述里出现「修复/解决/fix/resolve/handle/broken/crash/null/异常」等词，或关联 issue → `fix`
9. **feat**：新增公开能力（新文件 + 新导出 + 新路由 + 新 CLI 子命令等）→ `feat`
10. **refactor**：行为不变但代码结构变了，且不属于以上任何一类 → `refactor`
11. **chore**：以上都不命中（罕见，通常是版本号 bump、`.gitignore` 等）→ `chore`

**多重信号冲突时**：以「主要改动」为准。比如改了 5 个文件，3 个是 docs、2 个是 src，主要改动是 src → 按 src 推断，docs 只是顺带。

## Scope 推断规则

scope 是 type 后面括号里的部分（`feat(auth): ...`），表示改动影响的模块。

**推断路径**（按改动文件的公共路径前缀）：

| 改动公共前缀 | scope |
|--------------|-------|
| `src/auth/` 或 `auth/` | `auth` |
| `src/components/Login*` | `login`（取最后一级目录名，小写） |
| `src/api/users/` | `users` |
| `src/utils/` | `utils` |
| `docs/` | 省略 scope（docs type 自身已表达） |
| `package.json` / `*.lock` | `build`（或省略，type 已是 build） |
| `.github/workflows/` | 省略 scope（type 已是 ci） |
| 跨多个顶级目录 | **省略 scope**（避免硬编） |
| 单文件但路径不清晰（如根目录的 `README.md`） | 省略 scope |

**核心规则**：
- 多个改动文件 → 取它们的**最长公共路径前缀**，最后一级目录名作为 scope
- 单文件 → 取所在目录名作为 scope；若在根目录则省略
- 推断出来的 scope **小写**、**不含连字符以外的标点**
- **跨多模块时直接省略 scope**——不要挑一个最大的（会误导）

## 中英混合 message 格式

### 标准格式（默认两行）

```
feat(auth): add login validation

新增登录校验逻辑
```

**结构**：
- 第一行：`<type>(<scope>): <english-subject>`（subject 用英文，祈使句，首字母小写，不加句号）
- 第二行：空行
- 第三行：中文翻译（**不含** type/scope/prefix，只翻译 subject 部分）

### 不带 scope 的格式

```
docs: update README installation steps

更新 README 安装步骤
```

### Subject 写作要求

英文 subject：
- 祈使句：「add」「fix」「update」「remove」「refactor」
- 现在时，不用过去式（`add` 不用 `added`）
- 不加句号
- ≤ 50 字符（最好）
- 小写开头（除非是专有名词）

中文翻译：
- 对应英文的直译或意译，保持简洁
- 不带前缀（不重复 type）
- ≤ 30 字符（最好）

### 何时追加 body（默认推荐规则）

**默认只有两行**（标题 + 中文翻译）。

**追加 body 的条件**（满足任一）：
- 改动文件 ≥ 5 个
- 改动跨多个模块（scope 无法推断）
- 改动包含非平凡的重构（用户可能需要知道改了什么）

**body 格式**（**中英对称**——英文段 + 中文段两段对照）：

```
refactor: extract validation logic into shared module

- Unify validation across login, signup, reset into validator.ts
- Remove duplicate regex scattered across components
- Add 4 boundary condition test cases

抽出校验逻辑到共享模块

- 把登录、注册、改密三个场景的校验统一到 validator.ts
- 移除散落在各组件内的重复正则
- 补充 4 个边界条件的测试用例
```

**对称约束（硬性）**：
- 英文 bullet 数量 = 中文 bullet 数量
- 每条英文 bullet 必须有对应的一条中文翻译，顺序一致
- 英文 subject = 中文 subject 翻译（一一对应）
- **不允许**"英文简短、中文详细"或反之的不对称

**body 写什么**：
- 「为什么改」+「主要改了哪些」（不要逐文件翻译）
- 英文 bullet 用祈使句、现在时；中文 bullet 是对应翻译
- 每条 ≤ 30 字
- 3-5 条最合适，不要超过 7 条

### 不符合 Conventional Commits 时

如果项目历史的 commit message **完全不遵循** Conventional Commits（比如全中文、无 prefix），skill 仍按 Conventional Commits 生成（这是默认 `--style=conventional` 的语义）。用户若想跟随项目风格，未来可通过 `--style=gitlog`（尚未实现，见 SKILL.md 的 Extension Support 章节）。

## 完整样例

### 单文件修复

改动：`src/auth/login.ts`（修复空指针）

```
fix(auth): handle null user in login flow

处理登录流程中的空用户对象
```

### 多文件新功能

改动：`src/api/users.ts`、`src/api/users.test.ts`、`src/types/user.ts`

```
feat(api): add user list endpoint with pagination

新增分页的用户列表接口
```

### 跨模块重构（追加 body，中英对称）

改动：`src/auth/*.ts`、`src/api/auth.ts`、`src/utils/validator.ts`、`src/components/Login.tsx`、`src/components/Login.test.tsx`（5 个文件，跨 auth/api/utils/components）

```
refactor: unify validation logic across auth flow

- Extract validation from Login component and api/auth into utils/validator
- Refactor Login to call shared validator, removing 40+ lines of duplication
- Add 4 boundary condition test cases

统一认证流程的校验逻辑

- 把散落在 Login 组件和 api/auth 的校验抽到 utils/validator
- Login 组件改为调用共享 validator，减少 40+ 行重复代码
- 补充 4 个边界条件的测试用例
```

### 文档更新

改动：`README.md`、`docs/getting-started.md`

```
docs: clarify setup steps for macOS users

细化 macOS 用户的安装步骤
```

### 依赖升级

改动：`package.json`、`package-lock.json`

```
build(deps): bump react from 18.2 to 18.3

升级 react 18.2 → 18.3
```

（`build` type 时 scope 用 `deps` 是社区惯例）
