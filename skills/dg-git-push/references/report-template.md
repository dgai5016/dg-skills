# 报告模板（字面模板，禁止偏离）

skill 在执行 `git add/commit/push` **之前**必须输出一份报告给用户。本文件是**字面模板**，不是参考文档——所有段落标题、空行、bullet 节奏、句数限制必须**逐字复制**，禁止变体、禁止"意思一样"的改写。

## 核心原则：骨架固定、字段值变化

**所有场景共用同一份骨架**。不同场景的差异**只通过字段值体现**（如 Upstream 字段的值变化），**不改变段落结构、标题、bullet 数量**。

这是输出一致性的根本保证——用户看到的报告永远是"同一个形状"，只是字段值不同。

## 完整骨架（所有场景共用）

```
## 目标分支

  - 当前分支: ${CURRENT_BRANCH}${BRANCH_NOTE}
  - Upstream: ${UPSTREAM_STATUS}
  - Remote: ${REMOTE_STATUS}${WARNINGS_BULLET}

## Commit Message 预览

${COMMIT_MESSAGE}

## 改动文件

${SENSITIVE_WARNING_IF_ANY}
### 新增
- ${PATH} · ${ONE_LINE_SUMMARY}

### 修改
- ${PATH} · ${ONE_LINE_SUMMARY}

### 删除
- ${PATH} · ${ONE_LINE_SUMMARY}

## 改动分析

${ANALYSIS_SENTENCE_1} ${ANALYSIS_SENTENCE_2}

## 确认

回复 y / yes / 继续 确认提交并推送，输入其他任何内容或明确拒绝则退出流程。
```

**字面约束（硬性，不允许偏离）**：

- 5 个段落标题字面固定：`## 目标分支` / `## Commit Message 预览` / `## 改动文件` / `## 改动分析` / `## 确认`——禁止写成 `## 推送目标` / `## Commit Message` / `## 改动清单` / `## 分析` 等任何变体
- 段落标题前后各空 1 行
- bullet 节奏统一为 `  - `（2 空格 + 短横 + 空格），禁止用 `*` 或 `- `（顶格短横）
- 改动文件段**必须用列表**，**禁用表格**，按状态分 3 组（新增/修改/删除），**空分组整段省略**
- 改动分析段**必须 2 句**——不能 1 句、不能 3 句
- 确认提示措辞**逐字复制**上面那行，禁止改写

## 占位符字段值规则

### 目标分支段（4 个 bullet，所有场景都用相同结构）

| 场景 | CURRENT_BRANCH | BRANCH_NOTE | UPSTREAM_STATUS | REMOTE_STATUS | WARNINGS_BULLET（可选，没警告时整行不出现） |
|------|----------------|-------------|-----------------|---------------|---------------------------------------------|
| 普通推送 | `feature-login` | （空） | `origin/feature-login` | `origin → git@github.com:owner/repo.git` | （整行不出现） |
| 首次推送（新分支无 upstream） | `feature-login` | （空） | `未设置 → 首次推送时会自动 git push -u origin HEAD` | `origin → git@...` | （整行不出现） |
| 首次推送到 main/master | `main` | `（新仓库的默认分支）` | `未设置 → 首次推送时会自动 git push -u origin HEAD` | `origin → git@...` | `\n  - ⚠️ 这是首次提交并推送到 main 分支，请确认无误。` |
| 推送到 main（非首次） | `main` | （空） | `origin/main` | `origin → git@...` | `\n  - ⚠️ 将直接推送到 main 分支，请确认无误。` |
| 无 remote（交互模式） | `main` | （空） | `未设置 → 首次推送时会自动 git push -u origin HEAD`（或对应 upstream 实际状态） | `（未配置）` | `\n  - ⚠️ 未配置 remote：输入 remote URL 让我执行 git remote add origin <url> 后继续 push，或回复 跳过 只做本地 commit` |
| 无 remote + `--auto` 模式 | `main` | （空） | 同上 | `（未配置，--auto 模式下跳过 push，仅做本地 commit）` | （整行不出现） |

**字段拼写约束**：
- 字段名严格用：`当前分支` / `Upstream` / `Remote`——禁止写成 `分支` / `上游` / `远程` 等同义词
- 字段名后跟 `: `（冒号 + 1 空格），值紧随其后
- BRANCH_NOTE 直接括号跟在分支名后，无空格分隔（如 `main（新仓库的默认分支）`），普通场景为空
- WARNINGS_BULLET 是可选的**第 4 个 bullet**，没警告时**整行不出现**（不要写空 bullet）；有警告时跟在 Remote 后换行

### 改动文件段

强制用 bullet 列表，**禁用 markdown 表格**。按状态分组渲染，每组一个小标题，组内每行格式字面固定：

```
### ${GROUP_LABEL}

- ${PATH} · ${ONE_LINE_SUMMARY}
- ${PATH} · ${ONE_LINE_SUMMARY}
```

**分组映射**（替代 git 字母图标，跨终端 100% 兼容）：

| git porcelain 状态码 | 分组 |
|----------------------|------|
| `A ` / `AM` / `??` | `### 新增` |
| ` M` / `M ` / `MM` | `### 修改` |
| ` D` / `D ` | `### 删除` |

**渲染规则**（硬性）：
- **分组顺序固定**：新增 → 修改 → 删除
- **空分组整段省略**：分组没文件时不出现 `###` 标题，**不写「（无）」占位**，组与组之间不留空骨架
- **分组标题统一 `###` 级**（紧跟 `## 改动文件` 之下），禁止用 `**新增**` / `#### 新增` 等变体
- **同一分组内多条 bullet 顺序自由**（按路径字母序或逻辑相关性排列均可，无需在模板里强制）

**为什么合并 `A` 和 `??` 为同一分组**：skill 最后会 `git add -A`，已 staged 的新文件（`A`）和未跟踪的新文件（`??`）最终进同一 commit，对用户没区别。

**分隔符**：路径与一句话概括之间用 ` · `（空格 + 中点 + 空格）。

**一句话概括要求**（20-30 字）：
- 用中文
- 动词开头：「新增」「修改」「移除」「补充」「重构」「提取」「更新」
- 描述这个文件的**主要改动**，不逐行翻译 diff
- 纯格式/类型调整写「格式调整」「类型修正」

**反例**（不要这样写）：
- ❌ "修改了第 23 行的 if 判断"（太细）
- ❌ "更新文件"（太空）
- ❌ "changed the validation logic in handleLogin"（应中文）

**正例**：
- ✅ "新增 validate 函数，处理空用户场景"
- ✅ "补充 3 个边界条件测试用例"
- ✅ "移除已废弃的 legacyLogin 调用"
- ✅ "提取密码强度校验到独立函数"

### 敏感文件警告（可选，插入改动文件段最前面）

STATUS 检测到下列模式时，在改动文件 bullet 列表**上方**插入警告段：

**触发模式**：
- `.env` / `.env.*`（如 `.env.local`、`.env.production`）
- `id_rsa` / `id_rsa.pub`
- `*.pem` / `*.key`
- `credentials*` / `secrets.*`
- 文件名含 `token` / `password` / `apikey`

**警告格式**（字面）：
```
## 改动文件

⚠️ 检测到可能含敏感信息的文件，请确认是否真的要提交：
  - .env.local（环境变量文件，通常不应进版本库）
  - config/secrets.json（文件名提示可能含密钥）

### 新增
- .env.local · 本地环境变量

### 修改
- src/auth/login.ts · 新增 validate 函数
...
```

警告段空 1 行后再接第一个 `###` 分组（按「新增 → 修改 → 删除」顺序，第一个非空分组先出现）。警告本身不进任何分组。不阻止提交，由用户在确认环节决定。

### Commit Message 预览段

直接**逐字贴入**完整 commit message 原文：
- Claude 生成的：`<type>(<scope>): <english-subject>` + 空行 + `<中文翻译>`（详见 SKILL.md Step 4）
- 用户自带的（如 `/dg-git-push 修复登录超时`）：贴原文 `修复登录超时`，**不强制中英混合、不重新翻译、不套 Conventional Commits 模板**

### 改动分析段（必须 2 句）

**结构字面固定**：
- **第 1 句**：主题 + 主要手段（"聚焦 X 模块的 Y 调整：通过 Z 手段..."）
- **第 2 句**：定性（"属于功能增强 / bug 修复 / 重构 / 依赖升级 / 文档更新 / 配置调整"）

**禁止**：
- ❌ 1 句话（缺定性）
- ❌ 3 句或更多（冗长）
- ❌ 重复改动文件清单（已经在上面列过了）

**正例**：
- "聚焦登录模块的校验逻辑：抽出独立的 validator 工具函数，让 login 流程调用它处理空用户场景，并补充对应测试。整体属于功能增强。"
- "升级 React 到 18.3，同步调整被废弃 API 的调用方式，并更新锁文件。属于依赖升级。"
- "修复用户在弱网下的重复提交问题：在提交按钮加节流，并在后端补充幂等校验。属于 bug 修复。"

### 确认段（字面固定）

确认提示**逐字复制**：
```
## 确认

回复 y / yes / 继续 确认提交并推送，输入其他任何内容或明确拒绝则退出流程。
```

## 末尾处理（按模式）

### 默认交互模式

完整骨架（5 段）输出后，停在确认段等待用户回复。用户回 `y` / `yes` / `继续` / `ok` / `确认` → 继续；其他任何内容 → 直接退出，不进入修改循环。

### `--auto` 模式

**不出现 `## 确认` 段**。报告只输出前 4 段，然后在改动分析段后追加：

```
## 改动分析

${ANALYSIS_SENTENCE_1} ${ANALYSIS_SENTENCE_2}

---

[auto 模式] 上述内容已自动执行：git add -A → git commit → git push
```

**严禁**在 auto 模式里加任何 yes/no 二次询问。报告仍然展示（便于事后回看），但执行不再等待。

### 用户自带 message 模式

骨架完全相同，只是 `## Commit Message 预览` 段贴用户给的原文。其他段落不受影响。

## 工作区无改动（独立流程，不进入完整报告）

STATUS 输出 `(clean — no changes)` 时，**不进入完整报告**，直接输出一段说明后退出：

```
工作区无改动（git status 干净），已退出，未执行任何 git 操作。
```

这是 SKILL.md Step 3a 的分支，与本模板的 5 段骨架无关。

## 完整示例

### 示例 1：普通推送（feature 分支、有 upstream、Claude 生成 message）

```
## 目标分支

  - 当前分支: feature-login
  - Upstream: origin/feature-login
  - Remote: origin → git@github.com:owner/repo.git

## Commit Message 预览

feat(auth): add login validation

新增登录校验逻辑

## 改动文件

### 新增
- src/utils/validator.ts · 表单校验工具函数（用户名/密码格式）

### 修改
- src/auth/login.ts · 新增 validate 函数，处理空用户场景
- src/auth/login.test.ts · 补充校验失败的测试用例

## 改动分析

聚焦登录模块的校验逻辑：抽出独立的 validator 工具函数，让 login 流程调用它处理空用户场景，并补充对应测试。整体属于功能增强。

## 确认

回复 y / yes / 继续 确认提交并推送，输入其他任何内容或明确拒绝则退出流程。
```

### 示例 2：首次推送到 main（无 upstream）

```
## 目标分支

  - 当前分支: main（新仓库的默认分支）
  - Upstream: 未设置 → 首次推送时会自动 git push -u origin HEAD
  - Remote: origin → git@github.com:owner/repo.git
  - ⚠️ 这是首次提交并推送到 main 分支，请确认无误。

## Commit Message 预览

feat: initial commit

初始化项目骨架与基础配置

## 改动文件

### 新增
- README.md · 项目说明与安装指引
- package.json · 依赖清单与 npm 脚本
- src/index.ts · 程序入口

## 改动分析

初始化项目骨架，包含基础的 npm 配置、入口文件与说明文档。属于项目初始化。

## 确认

回复 y / yes / 继续 确认提交并推送，输入其他任何内容或明确拒绝则退出流程。
```

### 示例 3：`--auto` 模式（不出现确认段）

```
## 目标分支

  - 当前分支: feature-login
  - Upstream: origin/feature-login
  - Remote: origin → git@github.com:owner/repo.git

## Commit Message 预览

fix(auth): handle empty password

修复空密码场景的崩溃问题

## 改动文件

### 修改
- src/auth/login.ts · 空密码时直接返回错误，不再进入校验流程

## 改动分析

修复空密码请求导致的崩溃：在 login 入口加空值拦截，跳过 validator 调用。属于 bug 修复。

---

[auto 模式] 上述内容已自动执行：git add -A → git commit → git push
```

### 示例 4：用户自带 message

```
## 目标分支

  - 当前分支: feature-login
  - Upstream: origin/feature-login
  - Remote: origin → git@github.com:owner/repo.git

## Commit Message 预览

修复登录超时

## 改动文件

### 修改
- src/auth/login.ts · 新增 timeout 处理
- src/auth/login.test.ts · 补充超时测试

## 改动分析

聚焦登录流程的超时处理：新增 timeout 配置项并在请求超时时返回友好错误，同步补充对应测试。属于 bug 修复。

## 确认

回复 y / yes / 继续 确认提交并推送，输入其他任何内容或明确拒绝则退出流程。
```
