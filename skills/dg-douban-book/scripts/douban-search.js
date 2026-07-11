#!/usr/bin/env node
'use strict';

// dg-douban-book skill 的搜索脚本。
// 输入：--title=<书名> [--author=<作者>]
// 输出：JSON（query / result / status / is_exact_match / message），永远 exit 0，错误用 status 表达。
// 取豆瓣算法返回的 top 1，不再做评分重排（v2.0.0 简化）。
//
// v2.7.2 起：
//   1. 自动绕过 PoW 反爬挑战（点击 #sub 按钮 → 等前端 JS 跑完 SHA-512 → 跳回搜索结果）
//   2. 持久化 cookie 到 /tmp/douban-state.json，下次启动复用以降低再次触发频控的概率

// ===== 依赖自检 =====
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log(JSON.stringify({
    query: null,
    result: null,
    status: 'error',
    is_exact_match: false,
    message: 'playwright not installed. Run: cd <skill_dir>/scripts && npm install'
  }));
  process.exit(0);
}

const fs = require('fs');

// 持久化 cookie 的本地文件路径——首次跑没文件，跑过一次后写入；下次启动 context 时复用，
// 降低再次触发频控的概率。放 /tmp 是因为：① cookie 不需要长期保存（豆瓣会过期）；
// ② 重启清空反而是 feature（避免过期 cookie 干扰）；③ 跨平台都有 /tmp。
const STATE_FILE = '/tmp/douban-state.json';

// ===== 参数解析 =====
function parseArgs(argv) {
  const args = { title: null, author: null };
  const raw = argv.slice(2);
  for (const tok of raw) {
    const m = tok.match(/^--([^=]+)=(.*)$/);
    if (!m) {
      return { error: `参数格式错误：${tok}（必须用 --key=value 形式）` };
    }
    const [, k, v] = m;
    if (k === 'title') {
      args.title = v;
    } else if (k === 'author') {
      args.author = v;
    } else {
      return { error: `未知参数：--${k}` };
    }
  }
  if (!args.title || !args.title.trim()) {
    return { error: '缺少必填参数 --title' };
  }
  return args;
}

function emit(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

// ===== 书名归一化（用于精确匹配判断）=====
// 保守策略：只做安全可逆的归一化，宁可漏判为模糊也不误判为精确。
// - 全角→半角、去空白、统一括号、转小写
// - 不做简繁归一化（豆瓣里繁简通常是不同条目，归一化反而误判台版/陆版为同书）
function normalizeTitle(s) {
  if (!s) return '';
  return s
    .replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)) // 全角→半角
    .replace(/　/g, ' ')          // 全角空格
    .replace(/\s+/g, '')              // 去所有空白
    .replace(/[（［【〈《「『“"]/g, '(')
    .replace(/[）］】〉》」』”"]/g, ')')
    .toLowerCase();
}

// 提取主书名：按半角/全角冒号切，取第一段。
// 用于「用户输入主书名，豆瓣条目带副标题」场景（如「如何共读一本书」匹配「如何共读一本书 : 高效引导社群学习」）。
// 不切破折号/括号——这些常是书名的一部分，不一定是副标题。
function extractMainTitle(s) {
  if (!s) return '';
  return s.split(/[:：]/)[0].trim();
}

// 精确匹配判断（含主书名匹配）。
function isExactMatch(queryTitle, resultTitle) {
  const q = normalizeTitle(queryTitle);
  const r = normalizeTitle(resultTitle);
  if (!q || !r) return false;
  if (q === r) return true;
  // 主书名匹配：豆瓣条目带副标题，用户输入主书名
  if (q === normalizeTitle(extractMainTitle(resultTitle))) return true;
  // 反向：用户带副标题，豆瓣只收录主书名（少见但要兼容）
  if (normalizeTitle(extractMainTitle(queryTitle)) === r) return true;
  return false;
}

// ===== 元数据解析 =====
// meta 行格式多样，如：
//   "刘慈欣 / 重庆出版社 / 2008-1"
//   "[美] 卡尔·纽波特 / 译者 / 江西人民出版社 / 2017-5"
//   "重庆出版社 / 2008"
function parseMeta(meta) {
  const out = { author: null, publisher: null, year: null };
  if (!meta) return out;
  const parts = meta.split('/').map(s => s.trim()).filter(Boolean);
  const yearRe = /(?:19|20)\d{2}(?:-\d{1,2}){0,2}/;
  for (const p of parts) {
    const ym = p.match(yearRe);
    if (ym && !out.year) {
      out.year = ym[0];
    } else if (/出版社|press|出版公司|书局|books?/i.test(p) && !out.publisher) {
      out.publisher = p;
    } else if (!out.author && /[一-龥A-Za-z]/.test(p)) {
      // 第一段非数字、非出版社的当作者
      out.author = p;
    } else if (!out.publisher) {
      out.publisher = p;
    }
  }
  return out;
}

function extractSubjectId(url) {
  const m = url && url.match(/subject\/(\d+)/);
  return m ? m[1] : null;
}

// ===== PoW 反爬绕过 =====
// 豆瓣风控触发后会把搜索结果页替换成 PoW（proof of work）挑战页：
//   <form id="sec"><button id="sub"></button></form>
// 真实浏览器（含 Playwright）执行前端 JS 跑 SHA-512 PoW，跑完自动 submit 跳回搜索结果。
// 这里检测到 #sub 按钮就主动点击，让前端 JS 跑 PoW，然后等待 networkidle 触发（即跳回结果页）。
// 同时持久化当前 context 的 cookie，下次启动复用以降低再次触发频控的概率。
// 返回 true 表示命中并处理过 PoW 页，false 表示是正常页面（无 #sub）。
async function handlePowIfPresent(page, context) {
  const sub = await page.$('#sub').catch(() => null);
  if (!sub) return false;
  try {
    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 30000 }),
      sub.click()
    ]);
  } catch (_) {
    // 即便超时也继续——PoW 可能已完成但 networkidle 未触发
  }
  try {
    const state = await context.storageState();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (_) {
    /* ignore */
  }
  await page.waitForTimeout(1500);
  return true;
}

// ===== 主流程 =====
async function main() {
  const parsed = parseArgs(process.argv);
  if (parsed.error) {
    emit({ query: null, result: null, status: 'error', is_exact_match: false, message: parsed.error });
    return;
  }
  const { title, author } = parsed;
  const query = { title, author: author || null };

  let browser;
  let context;
  try {
    browser = await chromium.launch({ headless: true });
    const launchOpts = {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'zh-CN',
      viewport: { width: 1280, height: 800 }
    };
    // 复用上次保存的 cookie（如有），降低再次触发频控的概率
    context = fs.existsSync(STATE_FILE)
      ? await browser.newContext({ ...launchOpts, storageState: STATE_FILE })
      : await browser.newContext(launchOpts);
    const page = await context.newPage();

    const url =
      'https://search.douban.com/book/subject_search?search_text=' +
      encodeURIComponent(title) +
      '&cat=1001';
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

    // 触发 PoW 反爬时自动绕过（点击 #sub 按钮 → 等 networkidle 跳回结果页）
    await handlePowIfPresent(page, context);

    // 等待任一已知 selector 出现
    const selectorCandidates = ['.item-root', '.item', '.detail', '#root .item'];
    let usedSelector = null;
    for (const sel of selectorCandidates) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        usedSelector = sel;
        break;
      } catch (_) {
        /* try next */
      }
    }

    const pageTitle = await page.title().catch(() => '');
    const isBlockedPage = /登录|验证|安全检查|blocked|forbidden/i.test(pageTitle);

    if (!usedSelector) {
      emit({
        query,
        result: null,
        status: isBlockedPage ? 'blocked' : 'empty',
        is_exact_match: false,
        message: isBlockedPage
          ? '豆瓣疑似触发反爬（页面跳转到登录/验证）。请稍后重试。'
          : '未找到任何结果项（页面改版或 0 命中）。'
      });
      return;
    }

    // 用命中的 selector 提取所有项；同时尝试多个子 selector
    const items = await page.$$eval(usedSelector, els => {
      return els.map(e => {
        const titleEl = e.querySelector('.title-text, a.title-text, a.title, .title a');
        const linkEl = e.querySelector('a[href*="book.douban.com/subject"], a[href*="/subject/"], a');
        const metaEl = e.querySelector('.meta, .rating_info, .pub, .pl2');
        const ratingEl = e.querySelector('.rating_nums, .rating_num, .rating');
        const countEl = e.querySelector('.pl, .star-num, .rating_people');
        return {
          title: titleEl ? titleEl.textContent.trim() : null,
          url: linkEl ? linkEl.href : null,
          meta: metaEl ? metaEl.textContent.trim() : null,
          ratingText: ratingEl ? ratingEl.textContent.trim() : null,
          ratingCountText: countEl ? countEl.textContent.trim() : null
        };
      });
    });

    if (items.length === 0) {
      emit({
        query,
        result: null,
        status: 'empty',
        is_exact_match: false,
        message: '搜索返回 0 结果'
      });
      return;
    }

    // 规整；不再做评分重排——直接信任豆瓣搜索返回的顺序
    const enriched = items
      .filter(it => it.title && it.url && /subject\/\d+/.test(it.url))
      .map(it => {
        const meta = parseMeta(it.meta);
        const rating = parseFloat(it.ratingText) || null;
        const ratingCount = it.ratingCountText
          ? parseInt(it.ratingCountText.replace(/[^\d]/g, ''), 10) || null
          : null;
        const subjectId = extractSubjectId(it.url);
        return {
          title: it.title,
          author: meta.author,
          publisher: meta.publisher,
          year: meta.year,
          pages: null,
          rating,
          rating_count: ratingCount,
          url: it.url,
          subject_id: subjectId
        };
      });

    if (enriched.length === 0) {
      emit({
        query,
        result: null,
        status: 'empty',
        is_exact_match: false,
        message: '搜索返回 0 条有效条目（解析后无 subject 链接）'
      });
      return;
    }

    // 取豆瓣算法返回的 top 1
    const top1 = enriched[0];
    const exact = isExactMatch(title, top1.title);
    emit({
      query,
      result: { ...top1, is_exact_match: exact },
      status: 'ok',
      is_exact_match: exact,
      message: exact
        ? null
        : `豆瓣未收录《${title}》，以下为豆瓣算法返回的最相关结果`
    });
  } catch (e) {
    emit({
      query,
      result: null,
      status: 'error',
      is_exact_match: false,
      message: e.message ? e.message.split('\n')[0] : String(e)
    });
  } finally {
    // 无论本次搜索成功与否，都把 cookie 持久化到 STATE_FILE——
    // 即便是 blocked 页留下的 cookie，下次复用也能降低再次被风控的概率。
    if (context) {
      try {
        const s = await context.storageState();
        fs.writeFileSync(STATE_FILE, JSON.stringify(s));
      } catch (_) {
        /* ignore */
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (_) {
        /* ignore */
      }
    }
  }
}

main().catch(e => {
  emit({
    query: null,
    result: null,
    status: 'error',
    is_exact_match: false,
    message: 'unhandled: ' + (e.message ? e.message.split('\n')[0] : String(e))
  });
});
