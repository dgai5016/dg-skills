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

输入一个**学习资料文件夹**，生成一份学习指南，告诉你**怎么学这份资料**——先学哪几个文件、后学哪几个、最后学哪几个。学习指南包含 3 段：嵌套列表资料清单（每个文件含「讲什么」）+ 主题概述 + 文件维度的学习路径（每个文件含「讲什么 + 在体系中的位置」和「怎么学」）。派 subagent 并行处理文件夹内每个 `.md/.markdown/.pdf` 文件。产物整合到 `dg-how-to-learn/{name}/` 目录下（AI 推荐 3 个候选目录名，用户选择或自定义）。

> 当前版本只支持文件夹输入，不生成题库或测试（未来版本再加）。

```bash
# 唯一用法：传入一个学习资料文件夹
/dg-how-to-learn tutorials/

# 生成后的目录结构：
# dg-how-to-learn/
# └── react-hooks/           ← AI 推荐 + 用户选定的目录名
#     └── guide.md           ← 学习指南（3 段：嵌套列表资料清单 / 主题概述 / 文件维度学习路径）

# 含尖括号语法的资料（Templater <%、JSX <T> 等），加 --obsidian 防 Obsidian 解析扰乱：
# /dg-how-to-learn --obsidian tutorials/

# 不支持的输入（会报错）：
# /dg-how-to-learn notes.md              ❌ 只支持文件夹
# /dg-how-to-learn https://example.com   ❌ 只支持文件夹
# /dg-how-to-learn --count=10 tutorials/ ❌ 未知 flag（仅支持 --obsidian）
```

### dg-douban-book

从豆瓣图书搜索书籍信息。输入书名（可选作者），**直接返豆瓣算法 top 1 的单条卡片**——含书名 / 作者 / 出版社 / 出版年 / 评分 / 评分人数 / 豆瓣链接。用 Playwright（Node.js）抓取，因为豆瓣搜索结果是 JS 动态渲染，curl/WebFetch 拿不到结构化数据。**主书名匹配判断精确/模糊**——兼容「主书名相同 + 副标题不同」的场景（如「如何共读一本书」匹配「如何共读一本书 : 高效引导社群学习」）；豆瓣 top 1 跟用户输入主书名不等时（模糊匹配，如「共读」→「阅读」），首句明确「未收录」+ 给算法 top 1 + 排查建议。

> **v2.0.0 起只返 Top 1**（v1.x 是 Top 3-5 候选列表）。首次使用时自动装 playwright（约 200MB，一次性）。仅支持图书（不含电影/音乐）。不抓书评、不抓详情页元数据（页数/ISBN）。

```bash
# 基本用法
/dg-douban-book 三体

# 带作者
/dg-douban-book 三体 刘慈欣

# 自然语言也行
找下《人类简史》在豆瓣的评分
豆瓣搜下 Designing Data-Intensive Applications
```

### dg-learntime-estimate

输入学习资源（**单文件 / 文件夹 / 视频（含合集）/ 书籍**），用纯量化模型估时，**同时输出三水平估时**——零基础 ×1.8 / 有基础 ×1.0 / 熟练 ×0.6，用户自己认领对应数字（不需要预先声明水平）。系数按类型分叉：中文 350 字/分、英文 200 wpm、代码精读 50 行/时、技术书 3 分/页、**视频时长直接作基础值**（v2.8.1 起视频模式不再区分纯看/含练习/高难度，不调内在难度）。资料内在难度（数学密集、跨领域、前沿论文 ×1.3）由 Claude 在算基础值时调整（仅文本/PDF/书模式）。文件夹 / 合集简单累加（不引入疲劳衰减）。视频 URL 通过 yt-dlp 自动抓时长 + **自动展开合集估所有 P**（首次 `pip install yt-dlp` ~50MB），**抓不到直接报错退出，不反问手报**。**不保存输出文件、不联动 dg-douban-book、不做个人速度校准**。时间格式统一「X 时 Y 分」。

```bash
# 单文件估时
/dg-learntime-estimate README.md

# 文件夹估时（递归累加每个文件）
/dg-learntime-estimate tutorials/

# 视频估时（URL 自动抓时长，合集自动展开所有 P）
/dg-learntime-estimate https://bilibili.com/video/...

# 视频估时（手报时长）
/dg-learntime-estimate 这个视频 45 分钟

# 书籍估时（书名 + 页数 + 类型）
/dg-learntime-estimate DDIA 400 页 技术书

# 自然语言也行
估时一下这份资料要学多久
学完 tutorials/ 要多久

# 输出示例（顶部摘要 + 分段表 + 备注）：
# > 类型：文件夹（4 个文件） · 基础合计 7 时 24 分
# > **零基础 13 时 19 分 / 有基础 7 时 24 分 / 熟练 4 时 26 分**
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
