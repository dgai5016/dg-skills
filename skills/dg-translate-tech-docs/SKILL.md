---
name: dg-translate-tech-docs
description: Translates an English technical documentation repository from GitHub into Chinese while preserving the original site's framework (MkDocs Material or VitePress) and all configuration. Output is a runnable, Chinese-localized copy of the source project, drop-in compatible with the original repo. Use when user provides a GitHub repo URL and asks to "translate tech docs", "翻译技术文档", "翻译英文文档", "把这个仓库的文档翻译成中文", or wants to localize a docs site without rebuilding the framework. Does NOT handle deployment to a specific destination (use a separate skill for that).
version: 1.0.2
metadata:
  openclaw:
    homepage: https://github.com/dgai5016/dg-skills#dg-translate-tech-docs
    requires:
      anyBins:
        - git
---

# Translate Tech Docs (GitHub → Chinese)

把 GitHub 上的英文技术文档仓库翻译成中文版本，**保留原站点的框架与所有配置**。产物是一份「可运行的中文化原项目」。

**职责边界（重要）：**

- ✅ **做**：翻译 markdown 内容、翻译 nav/sidebar 标题、判断 site_name 是否需要翻译
- ❌ **不做**：修改 base URL、修改 edit_uri/repo_url、创建目标仓库专属元信息、修改 CI/CD 配置——这些属于部署/发布阶段，不在本 skill 范围

判断标准：「产物是不是一份可运行的中文化原项目？」—— 文档站点能正常启动（mkdocs serve / npm run docs:dev 不报错），所有 md 文件已翻译为中文，原框架与配置保留完整。

## User Input Tools

When this skill prompts the user, follow this tool-selection rule (priority order):

1. **Prefer built-in user-input tools** exposed by the current agent runtime — e.g., `AskUserQuestion`, `request_user_input`, `clarify`, `ask_user`, or any equivalent.
2. **Fallback**: if no such tool exists, emit a numbered plain-text message and ask the user to reply with the chosen number/answer for each question.
3. **Batching**: if the tool supports multiple questions per call, combine all applicable questions into a single call; if only single-question, ask them one at a time in priority order.

Concrete `AskUserQuestion` references below are examples — substitute the local equivalent in other runtimes.

## Script Directory

Scripts in `scripts/` subdirectory. `{baseDir}` = this SKILL.md's directory path.

| Script | Purpose |
|--------|---------|
| `scripts/detect-framework.sh` | Detect docs framework: prints `mkdocs` / `vitepress` / `unknown` |

Usage:
```bash
bash {baseDir}/scripts/detect-framework.sh <docs-path>
```

## Supported Frameworks

| Framework | Status | Reference |
|-----------|--------|-----------|
| MkDocs Material | ✅ Supported | [references/framework-mkdocs.md](references/framework-mkdocs.md) |
| VitePress | ✅ Supported | [references/framework-vitepress.md](references/framework-vitepress.md) |
| Docusaurus / Astro Starlight / Nextra / GitBook / others | ❌ Rejected | Add a new `references/framework-xxx.md` to support |

**框架不在支持列表时**：报错退出，明确告诉用户「先去 `references/` 加 `framework-xxx.md` 适配器，再重新跑」。**不要**让 Claude 现场处理新框架——保证翻译流程的可预期性。

## Workflow

### Step 1: Collect Parameters

通过用户输入工具一次性问以下问题：

| 问题 | 默认值 | 说明 |
|------|--------|------|
| 输出目录 | `~/Desktop/translated-{repo名}/` | 翻译产物的落地位置 |
| 翻译模式 | `normal` | `quick` / `normal` / `refined`（沿用 baoyu-translate） |
| 是否克隆整个仓库 | `仅 docs 目录` | `仅 docs 目录` / `整个仓库`（少数项目配置文件在 docs 之外） |

同时从用户消息解析出 GitHub 仓库 URL（必须）。如果是 `github.com/owner/repo` 形式，提取 owner/repo。

**调用方可选传入 `--files` 参数**（文件清单，逗号分隔的相对路径，如 `docs/index.md,docs/api/intro.md`）：
- 提供 → **增量模式**：只翻译清单中的文件，其他文件保持不动（用于更新场景）
- 未提供 → **全量模式**：翻译所有 md 文件（首次翻译的默认行为）

### Step 2: Clone Source

```bash
# 完整 clone（不浅克隆）—— 为了记录准确的 commit 并支持未来 diff
git clone https://github.com/{owner}/{repo}.git /tmp/dg-translate-{repo}

# 根据参数决定拷贝范围
# 仅 docs：cp -r /tmp/dg-translate-{repo}/docs {输出目录}/
# 整个仓库：cp -r /tmp/dg-translate-{repo}/* {输出目录}/
```

**为什么完整 clone（不用 `--depth 1`）？**
- 翻译时需要记录当前 HEAD 的 commit hash，作为「翻译基于的原文版本」
- 未来原仓库更新后，可以通过 `git ls-remote` + `git diff {old}..{new}` 找出变更文件，做增量翻译
- 完整 clone 让 commit hash 有意义；浅克隆也能拿到 HEAD hash，但本地无法 diff 历史

**注意**：少数项目的文档配置文件（如 `mkdocs.yml`）在仓库根，不在 `docs/` 下。Step 1 选择"整个仓库"即可处理。

**临时 clone 保留**：不要立即删除 `/tmp/dg-translate-{repo}/`，Step 4.5 会从中读取 commit 信息。整个 skill 结束后再清理。

### Step 3: Detect Framework

```bash
FRAMEWORK=$(bash {baseDir}/scripts/detect-framework.sh "{输出目录}")
```

- `mkdocs` → 加载 [references/framework-mkdocs.md](references/framework-mkdocs.md)，按其指引翻译
- `vitepress` → 加载 [references/framework-vitepress.md](references/framework-vitepress.md)，按其指引翻译
- `unknown` → **报错退出**，提示用户：

  ```
  ⚠️ 不支持的框架：在 {输出目录} 中未检测到 MkDocs 或 VitePress 配置。

  本 skill 当前仅支持 MkDocs Material 和 VitePress。
  要支持新框架，请在 skills/dg-translate-tech-docs/references/ 下新增
  framework-{框架名}.md 适配器文档，描述：
    - 检测信号（什么文件存在表示是这个框架）
    - 文档目录位置
    - nav/sidebar 配置文件路径与字段名
    - 不应翻译的配置项
  添加完成后重新触发本 skill。
  ```

### Step 4: Translate Markdown Content

**确定要翻译的文件清单：**

- **全量模式**（未传 `--files`）：用 `find {输出目录} -name "*.md"` 收集所有 md 文件（按框架适配器指引的范围）
- **增量模式**（传了 `--files`）：只处理清单中的文件，其他文件保持不动

对清单中的每个 md 文件，逐个调用 **baoyu-translate**：

```
对每个 md 文件 {file}：
  1. 触发 baoyu-translate，参数：
     - 文件：{file}
     - 目标语言：--to zh-CN
     - 模式：--mode {用户选择的模式}
     - 受众：--audience technical
     - 风格：--style technical
  2. baoyu-translate 会输出到 {file所在的目录}/{file名}-zh-CN/translation.md
  3. 把 translation.md 的内容覆盖回原 {file} 路径
  4. 删除中间产物目录 {file名}-zh-CN/
```

**失败处理**：单个文件翻译失败时跳过，记录到失败清单。所有文件处理完后，把失败清单报告给用户，建议对失败文件单独重试。

**术语一致性**：在输出目录的根创建 `.baoyu-skills/baoyu-translate/EXTEND.md`，维护项目级术语表。**增量模式下，如果已存在 EXTEND.md 必须保留复用**（避免术语漂移）。详见 [references/glossary-tip.md](references/glossary-tip.md)。

**增量模式额外输出**：所有翻译完成后，把本次翻译的文件清单（相对路径）写入 `{输出目录}/.changed-files.json`：

```json
{
  "files": [
    "docs/index.md",
    "docs/api/intro.md",
    "docs/queries/structure.md"
  ],
  "generated_at": "2026-06-24T18:30:00Z"
}
```

这个清单的作用：让下游流程（部署、同步到其他仓库、二次分发等）能据此只处理变更文件，**避免覆盖未翻译的英文原文**（增量模式下未变更文件仍是英文）。

**全量模式下**：可选输出 `.changed-files.json`（包含全部 md 文件清单）；下游流程检测不到时按全量处理。

### Step 4.5: Record Source Version

在翻译产物的根目录（`{输出目录}/.source-version.json`）写入原文版本信息：

```json
{
  "repo": "https://github.com/{owner}/{repo}",
  "branch": "{branch}",
  "commit": "{full_sha}",
  "commit_short": "{short_sha}",
  "commit_date": "{YYYY-MM-DD}",
  "commit_message": "{commit_subject}",
  "captured_at": "{ISO 8601 timestamp}"
}
```

**字段获取**（在临时 clone 目录 `/tmp/dg-translate-{repo}/` 中运行）：

```bash
# commit / commit_short / commit_date / commit_message
git -C /tmp/dg-translate-{repo} log -1 --pretty=format:'%H%n%h%n%ad%n%s' --date=short

# branch（默认分支）
git -C /tmp/dg-translate-{repo} remote show origin | grep 'HEAD branch' | sed 's/.*: //'

# captured_at
date -u +"%Y-%m-%dT%H:%M:%SZ"
```

**为什么单独文件？**
- `.source-version.json` 是本 skill 的产物，记录翻译基于的原文版本
- 下游流程可读取它，把版本信息合并到目标仓库自己的元信息 schema 中（如需要）
- 本 skill 不需要知道目标仓库的元信息 schema，保持通用——任何人 clone 走都能用

**增量模式下**：如果用户传入新的 `--output-dir`（覆盖现有翻译），重写 `.source-version.json`。如果输出目录已存在 `.source-version.json` 且未指定覆盖，警告用户「检测到现有版本 {old_short}，确认要用新版本 {new_short} 替换吗？」

### Step 5: Translate Navigation Config

按框架适配器指引，翻译 nav/sidebar 标题：

- **MkDocs**：编辑 `mkdocs.yml` 的 `nav` 字段，翻译每个标题文字（保留路径值不动）
- **VitePress**：编辑 `.vitepress/config.{ts,js}` 的 `themeConfig.nav` 和 `themeConfig.sidebar` 的 `text` 字段

**判断 site_name 是否翻译**：
- 描述性短语（如 "React Documentation"）→ 翻译
- 品牌/产品名（如 "Dataview"、"VitePress"）→ 保留原文
- 不确定时询问用户

### Step 6: Verify

```bash
# 检查所有 md 都翻译了（用 head 抽查前几行，确认是中文）
find {输出目录} -name "*.md" | head -5 | xargs -I{} sh -c 'echo "=== {} ===" && head -3 {}'
```

### Step 7: Report & Launch Preview

报告内容：
```
✅ 翻译完成

仓库: {owner}/{repo}
框架: {framework}
输出目录: {输出目录}
翻译文件数: {N}
失败文件: {失败清单或"无"}

基于原文版本:
  commit: {commit_short} ({commit_date})
  branch: {branch}
  完整 hash: {commit}
  版本信息已写入: {输出目录}/.source-version.json

启动预览（{framework}）:
{按框架给出的启动命令}

访问: {本地 URL}
```

**启动预览命令**（按框架）：

| 框架 | 依赖安装 | 启动 | URL |
|------|---------|------|-----|
| MkDocs | `pip install mkdocs-material` | `cd {输出目录} && mkdocs serve` | http://127.0.0.1:8000 |
| VitePress | `cd {输出目录} && npm install` | `npm run docs:dev` 或 `npx vitepress dev` | http://127.0.0.1:5173 |

**主动询问**：「要不要现在就启动预览？」

- 用户**同意** →
  1. 检查依赖是否已装，未装则装
  2. 后台启动服务（`mkdocs serve &` 或 `npm run docs:dev &`）
  3. 等服务起来（最多 30 秒，可用 `curl -s -o /dev/null -w "%{http_code}" {URL}` 探测）
  4. 用 WebFetch 抓首页，确认返回 200 且包含中文内容
  5. 告诉用户浏览器打开 `{URL}` 查看
- 用户**拒绝** → 仅打印启动命令，用户自己执行

## Scope Boundary (Reminder)

下面这些**不要做**——它们属于部署/发布阶段，不在本 skill 范围：

- ❌ 修改 `base` URL（VitePress 的 `base` / Docusaurus 的 `baseUrl`）
- ❌ 修改 `edit_uri`、`repo_url`、`site_url` 等部署相关配置
- ❌ 创建目标仓库专属的元信息文件（如 `.project.json`、特定导航站的 schema 等）
- ❌ 修改 CI/CD 配置（如 `.github/workflows/deploy.yml`）

判断标准：「产物是不是一份可运行的中文化原项目？」—— 文档站点能正常启动，所有 md 文件已翻译为中文，原框架与配置保留完整。

## Extension Support

术语表与翻译偏好通过 baoyu-translate 的 EXTEND.md 配置。详见 [references/glossary-tip.md](references/glossary-tip.md)。
