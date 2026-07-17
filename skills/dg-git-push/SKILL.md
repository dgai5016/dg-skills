---
name: dg-git-push
description: Analyzes git changes in the current repository, generates a bilingual (English + Chinese) Conventional Commits message, shows a structured report (target branch + commit message + changed files + analysis), waits for user confirmation, then runs `git add -A` + `git commit` + `git push` in one shot. Use when the user says "/dg-git-push", "提交并推送", "push 一下", "commit and push", "提交代码", or wants to commit and push after finishing a chunk of work. Supports `--auto` (no confirmation), `--style=conventional` (default, future-extensible), and user-provided custom messages. Does NOT add `--no-verify`, does NOT protect main/master (but explicitly shows the target branch in the report), does NOT create PRs/MRs, does NOT amend history.
version: 2.8.1
metadata:
  openclaw:
    homepage: https://github.com/dgai5016/dg-skills#dg-git-push
    requires:
      anyBins:
        - git
---

# Git Push (analyze → commit message → confirm → add + commit + push)

把"分析改动 → 生成 commit message → 等用户确认 → add + commit + push"打包成一条命令。默认走 Conventional Commits + 中英混合 message。

**职责边界（重要）：**

- ✅ **做**：分析改动、生成或复用 commit message、展示报告、按用户确认后执行 add + commit + push、自动处理无 upstream / 无 remote / non-fast-forward 等边界
- ❌ **不做**：自动加 `--no-verify` 绕过 pre-commit hook、保护 main/master（但会在报告顶部显式标出目标分支）、创建 PR/MR、amend 历史、修改 CI 配置

## User Input Tools

When this skill prompts the user, follow this tool-selection rule (priority order):

1. **Prefer built-in user-input tools** exposed by the current agent runtime — e.g., `AskUserQuestion`, `request_user_input`, `clarify`, `ask_user`, or any equivalent.
2. **Fallback**: if no such tool exists, emit a plain-text prompt and wait for the user's reply.
3. The confirmation step at the end of the report (y/yes/继续) is a single yes/no-style prompt — use whichever mechanism the runtime provides for binary confirmation; do NOT batch it with other questions.

Concrete `AskUserQuestion` references below are examples — substitute the local equivalent in other runtimes.

## Script Directory

Scripts in `scripts/` subdirectory. `{baseDir}` = this SKILL.md's directory path.

| Script | Purpose |
|--------|---------|
| `scripts/collect-status.sh` | One-shot git state collector: prints BRANCH / STATUS / DIFFSTAT / COMMIT-CONTEXT sections |

Usage:
```bash
bash {baseDir}/scripts/collect-status.sh [repo-path]
```

- `repo-path` defaults to `.`
- Exit codes: `0` ok, `1` not a git repo, `2` usage error

## Parameter Parsing

skill 接收一个 args 字符串（来自 `/dg-git-push <args>`）。解析规则：

1. 按空格把 args 切成 tokens
2. 每个 token 按下列规则分类：
   - `--auto` → 开启自动模式（**纯 flag，不带值**；不要识别 `--auto=true` 这种形式）
   - `--style=<value>` → 设置 commit 风格（必须用 `=` 连接值；当前唯一支持值是 `conventional`，是默认值）
   - 其他以 `--` 开头的 token → **未知 flag，报错退出**（避免拼写错误被静默吞掉）
   - 不以 `--` 开头的 token → 视为用户自带的 commit message 文本
3. 多个 message token 用空格连接成完整 message

**解析示例**：

| 输入 | 解析结果 |
|------|---------|
| `/dg-git-push` | 模式=交互，风格=conventional，message=自动生成 |
| `/dg-git-push --auto` | 模式=自动，风格=conventional，message=自动生成 |
| `/dg-git-push 修复登录超时` | 模式=交互，风格=conventional，message="修复登录超时"（用户自带） |
| `/dg-git-push --auto 修复登录超时` | 模式=自动，message="修复登录超时"（用户自带） |
| `/dg-git-push --style=conventional` | 等价于默认（显式指定风格） |
| `/dg-git-push --foo` | 报错：未知 flag `--foo`，退出 |

**未知 flag 报错信息**：
```
未知参数：--foo
当前支持的参数：
  --auto              自动模式（不等确认）
  --style=<name>      commit 风格，默认 conventional
```

## Modes

| 调用形式 | message 来源 | 是否等确认 | git 操作 |
|---------|-------------|-----------|---------|
| `/dg-git-push` | Claude 生成 | 是 | add + commit + push |
| `/dg-git-push --auto` | Claude 生成 | 否 | add + commit + push |
| `/dg-git-push <message>` | 用户传入 | 是 | add + commit + push |
| `/dg-git-push --auto <message>` | 用户传入 | 否 | add + commit + push |

**自带 message 原样使用**：用户传入的 message 不强制中英混合、不重新翻译、不套 Conventional Commits 模板。报告里 Commit Message 预览段直接展示用户给的原文。

**`--auto` 的纯粹性**：加了 `--auto` 就是用户已授权全自动——**不要**在 auto 模式里加任何 yes/no 二次确认。报告仍然展示（便于事后回看），但执行不再等待。

**两个 auto 不要混淆**：
- skill 的 `--auto` 标志 = 流程层面不等 y 确认
- Claude Code 的 auto mode = harness 层面的自主执行模式，对 push 到 main/master 等操作有独立安全护栏

两者独立。即使在 skill 交互模式下输 y 确认过，harness 的 auto mode 仍可能拦截 push。详见 Failure Handling 的「push 被 harness 拦截」段。

**PUSH_ONLY 模式（自动触发）**：当工作区干净但本地有未推送 commit 时（BRANCH 段 `ahead > 0`）自动启用，跳过 add/commit，仅执行 push。不是用户用 flag 触发的，是 Step 3a 根据状态检测自动决定的。

## Workflow

### Step 1: Parse Arguments

按 Parameter Parsing 章节解析 args，得到：
- `MODE` = `auto` 或 `interactive`
- `STYLE` = `conventional`（默认；其他值当前不支持，未来扩展）
- `USER_MESSAGE` = 用户自带 message 或 `null`
- 遇未知 flag → 报错退出

### Step 2: Collect Git State

```bash
bash {baseDir}/scripts/collect-status.sh
```

解析输出的四个段落（BRANCH / STATUS / DIFFSTAT / COMMIT-CONTEXT），得到：
- `CURRENT_BRANCH` / `UPSTREAM` / `REMOTE`
- `CHANGES[]`（status 行，包含图标 + 路径）
- `DIFFSTAT`（已跟踪文件的改动统计）
- `LAST_COMMIT_SUBJECT`（学习项目历史 message 风格的参考）

### Step 3: Boundary Detection（按顺序）

#### 3a. 工作区干净

如果 STATUS 段输出 `(clean — no changes)`，按 BRANCH 段的 `ahead` 字段决定走向：

- **`ahead > 0`**（本地有未推送 commit）→ 标记 `PUSH_ONLY=true`，跳到 Step 5（跳过 Step 4 的 commit message 生成）
- **`ahead = 0` 且 upstream 已设** → 真正无事可做，输出后退出：
  ```
  工作区干净，且本地与 upstream 同步（无未推送 commit），已退出，未执行任何 git 操作。
  ```
- **`ahead` 段是 `(n/a)`（无 upstream）但 HEAD 有 commit**（COMMIT-CONTEXT 段 `last_commit_short` 不是 `(no commits yet)`）→ 标记 `PUSH_ONLY=true` + `SET_UPSTREAM=true`，跳到 Step 5
- **`ahead` 段是 `(n/a)` 且 HEAD 无 commit**（fresh repo）→ 输出后退出：
  ```
  工作区干净，且本地无 commit、无 upstream——确实无事可做，已退出。
  ```

#### 3b. 没有 remote

如果 REMOTE 段是 `(none)`：

- `--auto` 模式 → 静默降级，标记 `SKIP_PUSH=true`，继续走 commit 流程
- 交互模式 → 在报告的「目标分支」段提示用户：
  ```
  ⚠️ 当前仓库未配置任何 remote。可以：
    1. 输入 remote URL 让我执行 git remote add origin <url> 后继续 push
    2. 回复 跳过 只做本地 commit，不 push
  ```
  - 用户给 URL → 执行 `git remote add origin <url>`，继续 push
  - 用户回 `跳过` → 标记 `SKIP_PUSH=true`
  - 用户回其他 → 退出

#### 3c. 没有 upstream（分支没设上游）

如果 UPSTREAM 段是 `(none)` 但 REMOTE 存在：

- 不阻塞流程，标记 `SET_UPSTREAM=true`
- 推送时执行 `git push -u origin HEAD`（自动设置上游）

### Step 4: Generate Commit Message

**PUSH_ONLY 短路**：如果 `PUSH_ONLY=true`，**跳过整个 Step 4**（不生成 commit message），直接进 Step 5。

#### 4a. 用户自带 message

如果 `USER_MESSAGE != null` → 直接用 `USER_MESSAGE`，跳过生成。原样使用，不强制中英混合。

#### 4b. Claude 生成（默认）

加载 [references/conventional-commits.md](references/conventional-commits.md)，按其规则：

1. **推断 type**：按文档的「Type 推断规则」优先级表，根据 CHANGES 和 DIFFSTAT 判断（feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert）
2. **推断 scope**：按文档的「Scope 推断规则」从改动文件的公共路径前缀推断；跨多模块或推断不出则省略 scope
3. **写英文 subject**：祈使句、现在时、小写开头、不加句号、≤ 50 字符
4. **写中文翻译**：对应英文的简洁翻译、不带 prefix、≤ 30 字符
5. **判断是否需要 body**：改动文件 ≥ 5 或跨多模块或非平凡重构时，追加 **中英对称** 的 bullet body（英文段 + 中文段，bullet 数量必须相等，每条 ≤ 30 字——详见下方「带 body 时」格式）

**message 格式**（默认两行，无 body）：
```
<type>(<scope>): <english-subject>

<中文翻译>
```

**带 body 时**（中英对称，英文段 + 中文段两段对照）：
```
<type>(<scope>): <english-subject>

- <english bullet 1>
- <english bullet 2>
- <english bullet 3>

<中文翻译>

- <中文 bullet 1>
- <中文 bullet 2>
- <中文 bullet 3>
```

**对称约束（硬性）**：
- 英文 bullet 数量 = 中文 bullet 数量
- 每条英文 bullet 必须有对应的一条中文翻译，顺序一致
- 英文 subject = 中文 subject 翻译（一一对应）
- **不允许**"英文简短、中文详细"或反之的不对称

### Step 5: Render Report

**严格按 [references/report-template.md](references/report-template.md) 输出报告，禁止偏离**：

- 加载该文件作为**字面模板**（不是参考文档）——所有段落标题、空行、bullet 节奏、句数限制必须**逐字复制**
- 不同场景的差异通过**字段值**体现（如 Upstream 字段值变化），**不改变段落结构**
- 工作区无改动时不进入完整报告，按 Step 3a 处理

**PUSH_ONLY 模式渲染**：如果 `PUSH_ONLY=true`，按 report-template.md 的「Push-only 模式」段输出 **4 段**报告（目标分支 / 待推送 commit / 改动分析 / 确认），**不渲染 Commit Message 预览段和改动文件段**。然后跳到 Step 6。

### Step 6: Confirm（仅交互模式）

- `MODE=interactive` → 在报告末尾等待用户回复
  - 用户回 `y` / `yes` / `继续` / `ok` / `确认` → 继续 Step 7
  - 用户回其他任何内容，或明确拒绝（"否"、"取消"、"n"、"no"）→ **直接退出**，不进入修改循环
- `MODE=auto` → **跳过此步骤**，直接进 Step 7（不要在 auto 模式里加任何二次询问）

### Step 7: Execute

**PUSH_ONLY 模式**：如果 `PUSH_ONLY=true`，**跳过 `git add` 和 `git commit`**，直接执行 push（按下方的 push 条件分支）。如果 `PUSH_ONLY=false`，按顺序执行完整流程：

按顺序执行，每一步失败按 Failure Handling 处理：

```bash
# 1. 暂存所有改动（含 untracked）
git add -A

# 2. 提交（用 heredoc 包裹防注入——用户 message 可能含 " 或 $()）
git commit -m "$(cat <<'COMMIT_EOF'
<完整 commit message>
COMMIT_EOF
)"

# 3. 推送（条件分支）
if [[ "$SKIP_PUSH" == "true" ]]; then
  echo "已跳过 push（无 remote 且用户选择跳过 / auto 模式静默降级）"
elif [[ "$SET_UPSTREAM" == "true" ]]; then
  git push -u origin HEAD
else
  git push
fi
```

**heredoc 引号要点**：必须用 `<<'COMMIT_EOF'`（带单引号），防止 message 里的 `$`、反引号被 shell 展开。这是防注入的关键。

## Failure Handling

### pre-commit hook 失败

`git commit` 触发了 pre-commit hook（如 husky、pre-commit framework）且 hook 返回非 0：

1. 捕获 hook 的 stderr/stdout 输出
2. 报告失败原因给用户：
   ```
   ❌ pre-commit hook 失败，已退出。
   
   hook 输出：
   <hook 的完整输出>
   
   请修复后重新调用 /dg-git-push。
   ```
3. **绝对不要**自动加 `--no-verify`——那是用户应当手动决定的危险操作，skill 不越权

### push 被拒（non-fast-forward）

`git push` 失败，错误信息包含 `non-fast-forward` 或 `rejected` 或 `(fetch first)`：

1. 自动执行 `git pull --rebase`
2. 用 `git diff --check` 检测冲突标记：
   - **无冲突**（exit 0）→ 自动重试 `git push`（按 Step 7 的 push 分支逻辑）
   - **有冲突**（exit 非 0）→ 报告冲突文件清单，等待用户：
     ```
     ⚠️ pull --rebase 后检测到冲突，需要你手动解决：
     
     <冲突文件清单，用 git status --porcelain 提取>
     
     解决后回复"继续"，我会检测冲突已清除并继续 push。
     回复"取消"则退出（rebase 状态保留，你可自行处理）。
     ```
   - 用户回 `继续` / `continue` / `ok` → 重新跑 `git diff --check`：
     - 通过 → `git rebase --continue`（如有）→ `git push`
     - 仍检测到冲突标记 → 提示"仍有冲突未解决，请再次检查"，继续等待
   - 用户回 `取消` → 退出，保留 rebase 状态由用户手动处理

### push 网络失败

`git push` 失败，错误信息包含 `Could not resolve host` / `Connection timed out` / `Network is unreachable` / `Permission denied (publickey)` 等：

1. 报告失败状态（明确告诉用户 commit 已成功）：
   ```
   ⚠️ commit 已成功，但 push 失败。
   
   错误：<push 的 stderr 摘要>
   
   请稍后手动执行：git push
   ```
2. **不要**自动重试（避免无限循环或网络抖动下的连环失败）

### push 被 harness 拦截（auto mode 高风险操作）

`git push` 失败，错误信息或上下文显示是 **Claude Code 的 auto mode 拦截**（典型文案："push 被 auto mode 拦了"、"harness 默认不允许自动执行"、"high-risk operation" 等），通常是推送到 main/master 等被视为高风险的分支：

1. **不要重试 push**——harness 已拒绝，重试只会再被拦
2. 报告给用户（字面文案）：
   ```
   ⚠️ commit 已成功（hash: <HASH>），但 push 被 Claude Code 的 auto mode 拦截。
   
   原因：harness 把「推送到 <BRANCH> 分支」判为高风险操作，独立于 skill 的 y 确认，不允许自动执行。
   
   请手动完成 push（任选一种）：
     方法 1：在 REPL 输入 `! git push`（! 前缀让命令直接在你的 shell 跑，绕过 harness 工具调用护栏）
     方法 2：退出 Claude Code 的 auto mode 后重新调用 /dg-git-push
     方法 3：直接在终端跑 `git push`
   ```
3. 退出流程（commit 已完成，由用户手动 push）

**与「push 网络失败」的区别**：网络失败是 git 层面的错误（DNS、SSH 等），重试有意义；harness 拦截是策略层面，重试无意义。

### 其他未预期错误

任何未列出的非 0 退出：

1. 捕获 stderr
2. 报告原始错误给用户
3. 退出，由用户判断后续

## Scope Boundary

**不做**这些事（超出本 skill 职责）：

- ❌ 创建 PR / MR（用 `gh pr create` 等单独工具）
- ❌ amend 历史（不改写已存在的 commit）
- ❌ 修改 CI 配置文件
- ❌ 自动跑 lint / test / typecheck 修复（那是另一个 skill 的职责；本 skill 只在 pre-commit hook 失败时报告，不主动修复）
- ❌ 修改 `.gitignore` 或 `.gitattributes`
- ❌ 跨仓库批量提交（一次只处理当前仓库）

## Extension Support

### 新增 commit 风格

未来如果想支持其他风格（如 `gitlog`——扫描项目 git log 模仿历史风格），步骤：

1. 在 `references/` 下新增 `style-<name>.md`，描述：
   - 该风格的 message 结构
   - 推断规则（如何从 git log 推断语言、prefix、格式）
   - 样例
2. 更新本 SKILL.md 的 Parameter Parsing 段落，把新风格加入支持的值列表
3. 更新 description frontmatter（如果新风格改变了 skill 的核心行为）

**当前支持的风格**：

| 风格 | 说明 | 状态 |
|------|------|------|
| `conventional` | Conventional Commits + 中英混合（默认） | ✅ 已支持 |
| `gitlog` | 模仿项目历史 commit message 风格 | 🔜 计划中 |

### 新增失败场景处理

未来遇到新的失败场景（如 GPG 签名失败、大文件推送被拒等），在 Failure Handling 章节追加处理策略。原则不变：**不越权自动救火**，能报告清楚就报告，让用户决定。
