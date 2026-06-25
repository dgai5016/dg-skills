# dg-skills

个人通用 Claude Code skills 集合。每个 skill 都设计为可在任何项目中复用，不绑定特定仓库或工作流。

## 设计原则

- **通用优先**：仅收录可在任何项目里复用的 skill。若 skill 强依赖某个具体仓库的目录结构、CI 配置或部署目标，应该放进那个仓库的 `.claude/skills/`，而不是这里。
- **可发布**：所有 skill 遵循 [Claude Code skill 编写规范](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)，可作为 marketplace 分享给社区。
- **复用既有工具**：不重新造轮子。例如翻译类 skill 直接调用已安装的 `baoyu-translate`，不重复实现翻译引擎。

## Skills

### dg-translate-tech-docs

把 GitHub 上的英文技术文档仓库翻译成中文，保留原站点框架与配置（MkDocs Material / VitePress）。产物可直接放回原项目，甚至提 PR 给原作者做 i18n。

```bash
# 翻译整个文档站
/dg-translate-tech-docs https://github.com/owner/repo

# 翻译指定文件（增量模式）
/dg-translate-tech-docs https://github.com/owner/repo --files docs/index.md,docs/api/intro.md
```

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
