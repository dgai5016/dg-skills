# dg-skills

个人通用 Claude Code skills 集合。每个 skill 都设计为可在任何项目中复用，不绑定特定仓库或工作流。

## 设计原则

- **通用优先**：仅收录可在任何项目里复用的 skill。若 skill 强依赖某个具体仓库的目录结构、CI 配置或部署目标，应该放进那个仓库的 `.claude/skills/`，而不是这里。
- **可发布**：所有 skill 遵循 [Claude Code skill 编写规范](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)，可作为 marketplace 分享给社区。
- **复用既有工具**：不重新造轮子。例如翻译类 skill 直接调用已安装的 `baoyu-translate`，不重复实现翻译引擎。

## Skills

| Skill | 用途 |
|-------|------|
| [dg-translate-tech-docs](skills/dg-translate-tech-docs/) | 把 GitHub 上的英文技术文档仓库翻译成中文，保留原站点框架与配置。产物可直接放回原项目，甚至提 PR 给原作者。 |

## 安装

把本仓库作为 marketplace 添加到 Claude Code：

```bash
# 方式 1：软链接（推荐，源码改动即时生效）
ln -s /Users/yefeng/Desktop/dg-skills ~/.claude/plugins/marketplaces/dg-skills

# 方式 2：复制（快照式，需手动同步）
cp -r /Users/yefeng/Desktop/dg-skills ~/.claude/plugins/marketplaces/dg-skills
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

## License

MIT
