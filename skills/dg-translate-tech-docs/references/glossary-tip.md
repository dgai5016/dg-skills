# 术语表使用提示

技术文档翻译中，术语一致性是质量的关键。本 skill 直接调用 `baoyu-translate`，术语表机制完全沿用 baoyu-translate 的设计。

## 三层术语表（优先级从高到低）

1. **CLI `--glossary` 参数**：本次翻译临时覆盖（本 skill 一般不用）
2. **EXTEND.md `glossary_files`**：项目级术语表，长期生效
3. **EXTEND.md `glossary`**：内联术语表，写在 EXTEND.md 里
4. **baoyu-translate 内置术语表**：[references/glossary-en-zh.md](../baoyu-translate/references/glossary-en-zh.md)（AI/技术领域常用术语）

## 推荐做法

针对每个要翻译的技术文档项目，建议在 docs 仓库根（或 clone 后的输出目录根）创建 `.baoyu-skills/baoyu-translate/EXTEND.md`，写明该项目专有的术语映射。

### EXTEND.md 示例

```yaml
target_language: zh-CN
default_mode: normal
audience: technical
style: technical
glossary:
  # 项目专有术语
  - source: "Dataview"
    target: "Dataview"
    note: "Obsidian 插件名，保留原文"
  - source: "DQL"
    target: "DQL"
    note: "Dataview Query Language 缩写，保留原文"
  - source: "Inline Query"
    target: "内联查询"
```

### 查找路径

baoyu-translate 按以下优先级查找 EXTEND.md（第一个找到的生效）：

| 优先级 | 路径 | 范围 |
|--------|------|------|
| 1 | `.baoyu-skills/baoyu-translate/EXTEND.md` | 项目目录 |
| 2 | `$XDG_CONFIG_HOME/baoyu-skills/baoyu-translate/EXTEND.md` | XDG 配置（~/.config） |
| 3 | `$HOME/.baoyu-skills/baoyu-translate/EXTEND.md` | 用户主目录（旧） |

## 与本 skill 的协作

本 skill 在调用 baoyu-translate 翻译每个 md 文件时，不会传 `--glossary` 参数，因此 baoyu-translate 会自动按上述优先级加载 EXTEND.md。如果用户希望为当前项目维护术语表，建议：

1. 在 clone 出来的输出目录根创建 `.baoyu-skills/baoyu-translate/EXTEND.md`
2. 写入项目专有术语
3. 重新跑翻译流程

## 完整文档

- baoyu-translate EXTEND.md schema: 见 baoyu-skills 的 `skills/baoyu-translate/references/config/extend-schema.md`
- 内置英→中术语表: 见 baoyu-skills 的 `skills/baoyu-translate/references/glossary-en-zh.md`
