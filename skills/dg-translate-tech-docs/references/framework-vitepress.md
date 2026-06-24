# VitePress 适配器

适用于 VitePress 框架的文档翻译指引。

## 检测信号

满足以下任一即判定为 VitePress：

- 输出目录根有 `.vitepress/config.{ts,js,mts,mjs}`
- 输出目录的 `docs/` 子目录下有 `.vitepress/config.{ts,js,mts,mjs}`

## 标准目录结构

```
{输出目录}/
├── .vitepress/
│   ├── config.ts             # 主配置（含 nav、sidebar、themeConfig）
│   ├── theme/                # 主题覆盖（可选）
│   └── cache/                # 构建缓存（不翻译）
├── index.md                  # 首页
├── guide/
│   ├── getting-started.md
│   └── ...
├── api/
└── public/                   # 静态资源
```

> **变体**：少数项目把文档源码放 `docs/` 子目录，配置在 `docs/.vitepress/`。本适配器同样适用。

## 翻译范围

输出目录下所有 `.md` 文件，常见位置：
- 根目录：`*.md`
- 子目录：`guide/*.md`、`api/*.md`、`reference/*.md` 等
- `docs/*.md`（变体情况）

**排除**：
- `.vitepress/cache/` 下的缓存
- `node_modules/`（如果存在）
- `public/` 下的静态资源（不翻译）
- `.vitepress/theme/` 下的 Vue 组件（不翻译——属样式层）

## Nav & Sidebar 翻译

VitePress 的导航配置在 `.vitepress/config.{ts,js}` 的 `themeConfig` 字段。

### 原始示例（config.ts）

```typescript
export default defineConfig({
  title: 'My Project',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'GitHub', link: 'https://github.com/...' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' }
          ]
        }
      ]
    },
    footer: {
      message: 'Released under the MIT License.'
    }
  }
})
```

### 翻译后

```typescript
export default defineConfig({
  title: 'My Project',   // 品牌名保留；描述性短语翻译
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'GitHub', link: 'https://github.com/...' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: '简介',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装', link: '/guide/installation' }
          ]
        }
      ]
    },
    footer: {
      message: '基于 MIT 协议发布。'
    }
  }
})
```

**翻译规则**：
- `text` 字段翻译
- `link` 字段**不动**（路径值）
- `items` 数组结构保留，只翻译里面元素的 `text`
- `title` / `message` 等描述性字段翻译

### 处理方法

直接 Read 整个 `config.ts`，定位 `themeConfig.nav` 和 `themeConfig.sidebar`，对 `text` 字段做翻译，用 Edit 写回。**不要重写整个文件**，保留 TypeScript 语法、注释、import 等。

## 不应翻译的配置

| 字段 | 原因 |
|------|------|
| `base` | 部署子路径（搬运 skill 会处理） |
| `lang` | 语言标识（应改为 `zh-CN`，但属配置层；本 skill 可改） |
| `cleanUrls` | URL 规范化 |
| `head` 中的 SEO meta | 通常保留 |
| `lastUpdated` | 是否显示更新时间 |
| 任何 `link` 字段 | 路径值，不翻译 |
| `srcDir` / `srcExclude` | 源码目录配置 |
| `markdown.*` | markdown 渲染配置 |

## 应翻译的配置

| 字段 | 翻译策略 |
|------|---------|
| `title` | 描述性短语翻译；品牌名保留 |
| `description` | 翻译（影响 SEO 与首页副标题） |
| `themeConfig.nav[].text` | 翻译 |
| `themeConfig.sidebar.*.text` | 翻译 |
| `themeConfig.sidebar.*.items[].text` | 翻译 |
| `themeConfig.footer.message` / `copyright` | 翻译 |
| `themeConfig.outlineTitle` / `docFooter` 等内置文案 | 翻译（VitePress 默认是英文） |
| `themeConfig.search` 配置中的 placeholder | 翻译（如果有自定义） |

## lang 字段

把 `lang` 改成 `zh-CN`：

```typescript
export default defineConfig({
  lang: 'zh-CN',
  // ...
})
```

这会让 `<html lang="zh-CN">`，对浏览器翻译插件和无障碍工具都更友好。

## 启动预览

```bash
# 依赖
cd {输出目录}
npm install            # 或 pnpm install / yarn

# 启动
npm run docs:dev       # 大多数项目用这个
# 或
npx vitepress dev      # 没有 package.json 时

# 访问
# http://127.0.0.1:5173
```

## 构建产物（部署时用）

```bash
npm run docs:build     # 产物在 .vitepress/dist/
```

## 常见陷阱

| 陷阱 | 应对 |
|------|------|
| 项目用 pnpm/yarn 而非 npm | 看 `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` 判断 |
| `config.ts` 用了 `import` 引入其他模块 | 翻译时不要破坏 import；只动 themeConfig 内的 text 字段 |
| sidebar 是函数形式（动态生成） | 跳过自动翻译，作为失败项报告给用户，提示手动翻译 |
| 项目用了 i18n 多语言配置（已存在 zh 目录） | 提示用户：原项目已支持 i18n，建议直接贡献到 `zh/` 目录而不是覆盖英文版 |
| Vue 组件嵌入 markdown（`<MyComponent />`） | 不翻译组件标签；只翻译组件外的文字 |
