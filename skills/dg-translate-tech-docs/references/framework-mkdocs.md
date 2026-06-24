# MkDocs Material 适配器

适用于 MkDocs 与 MkDocs Material 框架的文档翻译指引。

## 检测信号

满足以下任一即判定为 MkDocs：

- 输出目录根有 `mkdocs.yml`
- 输出目录根有 `mkdocs.yaml`
- 输出目录的父目录有 `mkdocs.yml`（少数项目把 docs 单独提出去时）

## 标准目录结构

```
{输出目录}/
├── mkdocs.yml            # 配置文件（含 nav、theme、plugins）
└── docs/                 # 文档源码根
    ├── index.md
    ├── annotation/
    │   ├── add-metadata.md
    │   └── ...
    ├── api/
    └── ...
```

> **变体**：少数项目把 `mkdocs.yml` 放仓库根，文档放 `<repo>/docs/docs/`。这种情况下 Step 1 选「整个仓库」，本适配器同样适用。

## 翻译范围

`docs/**/*.md` —— 所有 markdown 文件。

**排除**：
- `docs/assets/` 下的图片、二进制（不翻译）
- `docs/overrides/` 下的 HTML/CSS/JS 模板覆盖（不翻译，保留原样）
- `mkdocs.yml` 本身（仅翻译 nav 字段，详见下文）

## Nav 翻译

`mkdocs.yml` 的 `nav` 字段是手写的导航树。翻译时**只动标题文字，不动路径值**。

### 原始示例

```yaml
nav:
  - Overview: 'index.md'
  - Metadata:
    - Adding Metadata: 'annotation/add-metadata.md'
    - Data Types: 'annotation/types-of-metadata.md'
  - Query Language Reference:
    - Structure of a Query: 'queries/structure.md'
```

### 翻译后

```yaml
nav:
  - 概览: 'index.md'
  - 元数据:
    - 添加元数据: 'annotation/add-metadata.md'
    - 数据类型: 'annotation/types-of-metadata.md'
  - 查询语言参考:
    - 查询结构: 'queries/structure.md'
```

**注意**：
- 列表项的 key（标题）翻译，value（路径）原样保留
- 嵌套结构（子菜单）保持不变

### 处理方法

直接用 Read 读取 `mkdocs.yml`，对 nav 部分的标题做翻译，用 Edit 写回。不要用 YAML 解析器重写整个文件——会破坏注释和格式。

## 不应翻译的配置

| 字段 | 原因 |
|------|------|
| `site_url` | 部署地址（搬运 skill 会处理） |
| `repo_url` | 源码仓库地址 |
| `edit_uri` | 编辑链接 |
| `theme.palette` | 主题色 |
| `theme.logo` / `theme.favicon` | logo 路径 |
| `theme.name` | 主题标识（如 `material`） |
| `markdown_extensions` | 渲染配置 |
| `plugins.search` | 搜索插件配置 |
| `plugins.redirects` | URL 重定向（保留不动，防止旧链接失效） |
| `docs_dir` | 文档目录路径 |

## 应翻译的配置

| 字段 | 翻译策略 |
|------|---------|
| `site_name` | 描述性短语翻译；品牌名（如 `Dataview`）保留 |
| `nav.*` (标题) | 全部翻译 |
| `theme.feature` 中的描述性 key（少见） | 翻译；技术 key（如 `navigation.tabs`）保留 |
| `copyright` | 翻译 |
| `extra.social` 的 name 字段（如果有描述） | 翻译 |

## 启动预览

```bash
# 依赖（仅首次需要）
pip install mkdocs-material

# 启动
cd {输出目录}
mkdocs serve

# 访问
# http://127.0.0.1:8000
```

## 构建产物（部署时用）

```bash
mkdocs build              # 产物在 site/ 目录
```

## 常见陷阱

| 陷阱 | 应对 |
|------|------|
| `nav` 没列出的 md 文件仍会被构建（自动发现） | 不影响翻译，但 nav 不完整时站点结构会缺项——翻译前检查 nav 是否覆盖所有 md |
| `mkdocs.yml` 有 `!!python` tag 或自定义 YAML tag | 翻译 nav 时小心，只改文字不改结构 |
| `overrides/` 里有需要本地化的 HTML 文字 | 不在本 skill 范围（属样式层）；如必须翻译，作为失败项报告给用户 |
| `redirects` 插件的 redirect_maps | **保留不动**，路径值翻译会破坏重定向 |
