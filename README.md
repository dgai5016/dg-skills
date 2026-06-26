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

### dg-learn

对任意学习资料（Markdown / PDF / URL / 文件夹 / 混合输入）生成结构化学习指南 + 测试题，支持自测和 AI 问答测试两种验证方式。

```bash
# 生成模式：单份资料 → 学习指南 + 题库
/dg-learn notes.md

# 多份资料混合（md + pdf + url）
/dg-learn notes.md paper.pdf https://example.com/article

# 控制题量 / 难度 / 题型
/dg-learn --count=10 notes.md
/dg-learn --level=hard notes.md
/dg-learn --types=choice,judge notes.md

# 测试模式：把题库给 AI，AI 一道一道问 + 立刻判分 + 生成错题集
/dg-learn quiz-20260626-143000.md

# 错题重做
/dg-learn wrong-answers-20260626-160000.md
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
