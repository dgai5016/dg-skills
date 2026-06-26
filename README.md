# dg-skills

个人通用 Claude Code skills 集合。每个 skill 都设计为可在任何项目中复用，不绑定特定仓库或工作流。

## 设计原则

- **通用优先**：仅收录可在任何项目里复用的 skill。若 skill 强依赖某个具体仓库的目录结构、CI 配置或部署目标，应该放进那个仓库的 `.claude/skills/`，而不是这里。
- **可发布**：所有 skill 遵循 [Claude Code skill 编写规范](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)，可作为 marketplace 分享给社区。

## Skills

### dg-git-push

分析当前仓库的 git 改动，生成中英 Conventional Commits message，展示报告（目标分支 + message + 文件 + 分析），确认后执行 add + commit + push 一条龙。

```bash
# 默认交互模式：分析 → 报告 → 等确认 → 提交
/dg-git-push

# 自动模式：不等确认，直接提交
/dg-git-push --auto

# 自带 commit message（不生成、不翻译，原样使用）
/dg-git-push 修复登录超时问题

# 自动模式 + 自带 message
/dg-git-push --auto 发布 v1.2.0
```

### dg-how-to-learn

输入一个**学习资料文件夹**，生成一份学习指南，告诉你**怎么学这份资料**——先学哪几个文件、后学哪几个、最后学哪几个。学习指南包含 3 段：树状资料清单（含文件间依赖关系）+ 主题概述 + 文件维度的学习路径（每个文件含「讲什么 + 在体系中的位置」和「怎么学」）。派 subagent 并行处理文件夹内每个 `.md/.markdown/.pdf` 文件。产物整合到 `dg-how-to-learn/{name}/` 目录下（AI 推荐 3 个候选目录名，用户选择或自定义）。

> 当前版本只支持文件夹输入，不生成题库或测试（未来版本再加）。

```bash
# 唯一用法：传入一个学习资料文件夹
/dg-how-to-learn tutorials/

# 生成后的目录结构：
# dg-how-to-learn/
# └── react-hooks/           ← AI 推荐 + 用户选定的目录名
#     └── guide.md           ← 学习指南（3 段：树状资料清单 / 主题概述 / 文件维度学习路径）

# 不支持的输入（会报错）：
# /dg-how-to-learn notes.md              ❌ 只支持文件夹
# /dg-how-to-learn https://example.com   ❌ 只支持文件夹
# /dg-how-to-learn --count=10 tutorials/ ❌ 当前不支持任何 flag
```

## 安装

把本仓库作为 marketplace 添加到 Claude Code：

```bash
# 先 clone 仓库（位置可自定义，下面以 ~/dg-skills 为例）
git clone https://github.com/dgai5016/dg-skills.git ~/dg-skills

# 方式 1：软链接（推荐，源码改动即时生效）
ln -s ~/dg-skills ~/.claude/plugins/marketplaces/dg-skills

# 方式 2：复制（快照式，需手动同步）
cp -r ~/dg-skills ~/.claude/plugins/marketplaces/dg-skills
```

然后在 `~/.claude/settings.json` 启用插件：

```json
{
  "plugins": {
    "marketplaces": {
      "dg-skills": true
    }
  }
}
```

## 更新

**软链接安装**（推荐）——源码改动即时生效，只需拉取最新代码：

```bash
cd ~/dg-skills && git pull
```

**复制安装**——需要重新同步整个目录：

```bash
cp -r ~/dg-skills ~/.claude/plugins/marketplaces/dg-skills
```

## License

MIT
