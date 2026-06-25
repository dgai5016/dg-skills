# 报告模板（三种模式）

skill 在执行 git add/commit/push **之前**，必须输出一份报告给用户。报告的字面顺序固定——核心信息（往哪推、推什么）在前，支撑信息（文件、分析）在后。

## 字面顺序（必须严格遵守）

```
1. 目标分支
2. Commit Message 预览
3. 改动文件
4. 改动分析
5. 确认提示（仅非 auto 模式）
```

**严禁**先输出文件清单再输出 commit message。用户在确认时，最关心的是「推到哪 + 推什么 message」，文件和分析是支撑信息。

## 占位符说明

| 占位符 | 含义 | 来源 |
|--------|------|------|
| `{target_branch}` | 推送目标，如 `origin/feature-login` 或 `origin/main`（首次推送加注「会自动设置上游」） | collect-status.sh 的 BRANCH 段 |
| `{commit_preview}` | 完整 commit message 预览（含中英两行或自带 message） | 由 skill 生成或用户传入 |
| `{files_section}` | 改动文件清单（每行：中文标签 + 路径 + 一句话概括） | collect-status.sh 的 STATUS 段 + skill 分析 |
| `{analysis}` | 改动整体描述（2-3 句） | skill 分析 |
| `{confirm_prompt}` | 确认提示文字 | 仅非 auto 模式出现 |

## 中文标签（替代 git 字母图标）

报告里改动文件的状态用方括号包裹的**中文标签**表示，不依赖 emoji / ANSI 颜色（跨终端 100% 兼容）：

| 标签 | 含义 | 对应 git porcelain 状态码 |
|------|------|--------------------------|
| `[修改]` | 修改（Modified） | ` M` / `M ` / `MM` |
| `[新增]` | 新增（Added 或 Untracked） | `A ` / `AM` / `??` |
| `[删除]` | 删除（Deleted） | ` D` / `D ` |

**为什么合并 `A` 和 `??` 为 `[新增]`**：skill 最终会执行 `git add -A`，已 staged 的新文件（`A`）和未跟踪的新文件（`??`）最终都会进入同一次 commit，对用户没区别。合并后认知更简单——三种状态对应三种标签。

## 模式 1：默认交互模式

```
## 目标分支

origin/feature-login

## Commit Message 预览

feat(auth): add login validation

新增登录校验逻辑

## 改动文件

[修改] src/auth/login.ts · 新增 validate 函数，处理空用户场景
[新增] src/utils/validator.ts · 表单校验工具函数（用户名/密码格式）
[修改] src/auth/login.test.ts · 补充校验失败的测试用例

## 改动分析

聚焦登录模块的校验逻辑：抽出独立的 validator 工具函数，让 login 流程调用它处理空用户场景，并补充对应测试。整体属于功能增强。

## 确认

回复 `y` / `yes` / `继续` 确认提交并推送，输入其他任何内容或明确拒绝则退出流程。
```

## 模式 2：`--auto` 自动模式

```
## 目标分支

origin/feature-login

## Commit Message 预览

feat(auth): add login validation

新增登录校验逻辑

## 改动文件

[修改] src/auth/login.ts · 新增 validate 函数，处理空用户场景
[新增] src/utils/validator.ts · 表单校验工具函数（用户名/密码格式）
[修改] src/auth/login.test.ts · 补充校验失败的测试用例

## 改动分析

聚焦登录模块的校验逻辑：抽出独立的 validator 工具函数，让 login 流程调用它处理空用户场景，并补充对应测试。整体属于功能增强。

---

[auto 模式] 上述内容已自动执行：git add -A → git commit → git push
```

**注意**：auto 模式下**不**出现"## 确认"段落，**不**询问 yes/no。报告仍然展示（让用户能事后回看），但执行不再等待。报告末尾追加一行说明"已自动执行"。

## 模式 3：用户自带 message

```
## 目标分支

origin/feature-login

## Commit Message 预览

修复登录超时

## 改动文件

[修改] src/auth/login.ts · 新增 timeout 处理
[修改] src/auth/login.test.ts · 补充超时测试

## 改动分析

聚焦登录流程的超时处理，新增 timeout 配置项和对应的失败测试。整体属于 bug 修复。

## 确认

回复 `y` / `yes` / `继续` 确认提交并推送，输入其他任何内容或明确拒绝则退出流程。
```

**注意**：用户自带的 message 原样使用——不强制中英混合、不重新生成、不翻译。预览段直接展示用户给的原文。

## 边界场景的呈现

### 首次推送（无 upstream）

目标分支段标注"会自动设置上游"：

```
## 目标分支

origin/feature-login（首次推送，会自动 `git push -u origin HEAD` 设置上游）
```

### 没有 remote（非 auto 模式）

目标分支段提示，并在末尾追加交互询问：

```
## 目标分支

⚠️ 当前仓库未配置任何 remote。可以：

  1. 输入 remote URL（例如 `git@github.com:owner/repo.git`）让我执行 `git remote add origin <url>` 后继续 push
  2. 回复 `跳过` 只做本地 commit，不 push

## Commit Message 预览
...
```

### 没有 remote + `--auto` 模式

静默降级，不询问，目标分支段说明跳过 push：

```
## 目标分支

（未配置 remote，--auto 模式下跳过 push，仅做本地 commit）
```

### 推送到 main / master

正常显示，**不**警告或阻止（用户在 plan 里明确不保护 main），但目标分支段会让分支名显眼：

```
## 目标分支

origin/main
```

### 工作区无改动

直接输出一段说明，不进入完整报告：

```
工作区无改动（git status 干净），已退出，未执行任何 git 操作。
```

## 敏感文件警告

STATUS 中如果检测到下列模式，在「改动文件」段**最前面**插入显眼警告（不阻止提交，让用户自行判断）：

**触发模式**：
- `.env` / `.env.*`（如 `.env.local`、`.env.production`）
- `id_rsa` / `id_rsa.pub`
- `*.pem` / `*.key`
- `credentials*` / `secrets.*`
- 文件名包含 `token` / `password` / `apikey`

**警告格式**（插入在改动文件列表第一行之前）：

```
## 改动文件

⚠️ 检测到可能含敏感信息的文件，请确认是否真的要提交：
  - .env.local（环境变量文件，通常不应进版本库）
  - config/secrets.json（文件名提示可能含密钥）

[修改] src/auth/login.ts · 新增 validate 函数
[新增] .env.local · 本地环境变量
[新增] config/secrets.json · 配置文件
...
```

用户在确认环节可以选择：
- 仍然提交（回复 `y`）
- 退出（自行处理敏感文件后重新调用 skill）

## 改动文件"一句话概括"的写作要求

每个文件后面那句话（如"· 新增 validate 函数"）：

- **20-30 字**以内
- 用中文
- 描述**这个文件的主要改动**，不是逐行翻译 diff
- 动词开头：「新增」「修改」「移除」「补充」「重构」「提取」
- 如果是纯格式/类型调整，写「格式调整」「类型修正」

**反例**（不要这样写）：
- ❌ "修改了第 23 行的 if 判断"（太细）
- ❌ "更新文件"（太空）
- ❌ "changed the validation logic in handleLogin function"（英文，应该中文）

**正例**：
- ✅ "新增 validate 函数，处理空用户场景"
- ✅ "补充 3 个边界条件测试用例"
- ✅ "移除已废弃的 legacyLogin 调用"
- ✅ "提取密码强度校验到独立函数"

## 改动分析的写作要求

「改动分析」段（2-3 句整体描述）：

- **聚焦"为什么改"和"整体性质"**，不重复文件清单
- 第一句：主题（"聚焦 X 模块的 Y 调整"）
- 第二句：主要手段（"通过抽出 Z 工具/重写 X 流程"）
- 第三句（可选）：定性（"属于功能增强 / bug 修复 / 重构"）

**样例**：
- "聚焦登录模块的校验逻辑：抽出独立的 validator 工具函数，让 login 流程调用它处理空用户场景，并补充对应测试。整体属于功能增强。"
- "升级 React 到 18.3，同步调整被废弃 API 的调用方式，并更新锁文件。属于依赖升级。"
- "修复用户在弱网下的重复提交问题：在提交按钮加节流，并在后端补充幂等校验。属于 bug 修复。"
