# Output Template（极简版）

Claude 渲染报告时，严格按本文档复制结构。v2.0.1 起采用极简风格——只保留用户真正需要的元信息，删掉所有装饰（无标题、无关键词行、无抓取时间、无 markdown 超链接）。

`status=ok` 时，**先看 `is_exact_match`** 决定走哪个子分支：
- `is_exact_match=true` → 「精确匹配」分支
- `is_exact_match=false` → 「模糊匹配」分支（加「⚠️ 未收录」首句）

## 1. 精确匹配（status=ok，is_exact_match=true）

```markdown
《<result.title>》

  - 作者：<result.author>
  - 出版社：<result.publisher>
  - 出版年：<result.year>
  - 评分：⭐ <rating>（<rating_count> 人评价）
  - 豆瓣链接：<result.url>
```

## 2. 模糊匹配（status=ok，is_exact_match=false）

```markdown
⚠️ 豆瓣未收录《<query.title>》，给的是豆瓣算法 top 1。

《<result.title>》

  - 作者：<result.author>
  - 出版社：<result.publisher>
  - 出版年：<result.year>
  - 评分：⭐ <rating>（<rating_count> 人评价）
  - 豆瓣链接：<result.url>
```

## 3. status=empty（0 结果）

```markdown
未在豆瓣图书找到匹配结果。
```

## 4. status=blocked（疑似反爬）

```markdown
⚠️ 豆瓣疑似触发反爬，请稍后重试。
```

## 5. status=error · 其他

```markdown
⚠️ 搜索失败：<message>
```

## 6. status=error · playwright 未装（保持完整版，不简化）

这个场景需要用户确认安装（200MB 下载），必须给完整提示，否则用户卡住。

```markdown
⚠️ 首次使用需要安装 playwright（约 200MB，一次性）。

回复 `安装` 我来执行：

\`\`\`bash
cd <skill_dir>/scripts && npm install
\`\`\`

装完会自动重试搜索。装一次后续调用直接走，无需重复。
```

## 字段说明

- 评分 `null`（少于 10 人评价时豆瓣不显示）→ 写 `-`
- 作者 / 出版社 / 出版年 `null` → 写 `-`
- `<result.xxx>` 取脚本 JSON 里 `result` 对象的字段
- `<query.title>` 取 `query.title`

## 渲染硬约束

- **不再用** markdown 标题（`#` / `##`）、quote（`>`）、加粗（`**`）、超链接（`[文字](url)`）
- **必须**带豆瓣 URL（用户的核心诉求就是链接）——用**裸 URL 文字**，不用 markdown 超链接
- 书名加书名号《》，**不加粗**
- ⭐ emoji 只用在评分前
- ⚠️ emoji 只用于警示场景（模糊匹配未收录首句、blocked、error）
- 其他位置不要用 emoji
- **不渲染时间戳**（脚本本身不返回时间，对用户没价值）
- 报告结尾**不要**追加"希望对你有帮助"等客套话
