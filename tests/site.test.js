import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PAGE_FILES = readdirSync(join(ROOT, 'pages'))
  .filter((f) => f.endsWith('.html'))
  .sort()
  .map((f) => `pages/${f}`);

const HTML_FILES = ['index.html', '404.html', ...PAGE_FILES];

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * 移除注释与 script/style 的正文，避免脚本中的 `<`、`>`（比较运算符、模板字符串）
 * 以及 data-URI 内容干扰标签与链接解析。
 */
function stripNonMarkup(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '<script></script>')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '<style></style>');
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function tagBalance(html) {
  const src = stripNonMarkup(html);
  const stack = [];
  const errors = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const closing = m[1];
    const name = m[2].toLowerCase();
    const attrs = m[3] ?? '';
    if (VOID_TAGS.has(name)) continue;
    if (!closing && attrs.trimEnd().endsWith('/')) continue;
    if (!closing) {
      stack.push(name);
      continue;
    }
    if (stack.length === 0) {
      errors.push(`多余的闭合标签 </${name}>`);
      continue;
    }
    if (stack[stack.length - 1] === name) {
      stack.pop();
      continue;
    }
    const idx = stack.lastIndexOf(name);
    if (idx === -1) {
      errors.push(`孤立的闭合标签 </${name}>`);
      continue;
    }
    errors.push(`</${name}> 之前未闭合: ${stack.slice(idx + 1).join(', ')}`);
    stack.length = idx;
  }
  if (stack.length > 0) errors.push(`未闭合标签: ${stack.join(', ')}`);
  return errors;
}

function internalLinks(html) {
  const links = [];
  const re = /href\s*=\s*"([^"]*)"/gi;
  let m;
  const src = stripNonMarkup(html);
  while ((m = re.exec(src)) !== null) {
    const href = m[1].trim();
    if (!href) continue;
    if (/^(https?:|mailto:|tel:|javascript:|data:|#|\/\/)/i.test(href)) continue;
    links.push(href);
  }
  return links;
}

test('所有 HTML 文件的标签结构必须闭合', () => {
  for (const file of HTML_FILES) {
    const errors = tagBalance(read(file));
    assert.deepEqual(errors, [], `${file} 标签结构有问题: ${errors.join(' | ')}`);
  }
});

test('所有站内链接必须指向真实存在的文件', () => {
  const missing = [];
  for (const file of HTML_FILES) {
    const baseDir = dirname(join(ROOT, file));
    for (const href of internalLinks(read(file))) {
      const clean = href.split('#')[0].split('?')[0];
      if (!clean) continue;
      const target = resolve(baseDir, clean);
      if (!existsSync(target)) missing.push(`${file} -> ${href}`);
    }
  }
  assert.deepEqual(missing, [], `失效的站内链接:\n${missing.join('\n')}`);
});

test('所有页面的 lang 属性必须为 zh-CN', () => {
  for (const file of HTML_FILES) {
    const m = read(file).match(/<html\b[^>]*\blang\s*=\s*"([^"]*)"/i);
    assert.ok(m, `${file} 缺少 lang 属性`);
    assert.equal(m[1], 'zh-CN', `${file} 的 lang 为 "${m[1]}"，应为 zh-CN`);
  }
});

test('page01 的《Deepseek》卡片必须指向 DeepSeek 官方域名', () => {
  const html = read('pages/page01.html');
  const card = html.match(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?《Deepseek》\s*<\/a>/);
  assert.ok(card, 'page01 未找到《Deepseek》卡片');
  assert.match(card[0], /href="https:\/\/chat\.deepseek\.com\/?"/, '《Deepseek》卡片未指向 chat.deepseek.com');
  assert.doesNotMatch(card[0], /href="https:\/\/ai\.com\/?"/, '《Deepseek》卡片仍指向 ai.com');
});

test('page04 必须提供返回首页的入口', () => {
  const html = read('pages/page04.html');
  assert.match(
    stripNonMarkup(html),
    /<a\b[^>]*href="\.\.\/index\.html"[^>]*>/,
    'page04 缺少指回 ../index.html 的链接，用户进入后无法返回',
  );
});

test('首页微信二维码图片必须声明固有尺寸以避免加载抖动', () => {
  const html = read('index.html');
  const img = html.match(/<img\b[^>]*weixin\.png[^>]*>/);
  assert.ok(img, 'index.html 未找到微信二维码图片');
  assert.match(img[0], /\bwidth="\d+"/, '微信二维码图片缺少 width 属性');
  assert.match(img[0], /\bheight="\d+"/, '微信二维码图片缺少 height 属性');
});

test('page04 脚本动态生成的 _blank 链接必须带 rel 防护', () => {
  const js = read('assets/js/script01.js');
  assert.match(js, /\.target\s*=\s*["']_blank["']/, 'script01.js 不再设置 _blank，请复核本测试');
  assert.match(js, /\.rel\s*=\s*["'][^"']*noopener/, 'script01.js 为 _blank 链接设置 target 时缺少 rel="noopener"');
});

test('所有 target="_blank" 的链接必须带 rel="noopener"', () => {
  const offenders = [];
  for (const file of HTML_FILES) {
    const html = read(file);
    for (const m of html.matchAll(/<a\b[^>]*>/g)) {
      const tag = m[0];
      if (!/target\s*=\s*"_blank"/.test(tag)) continue;
      if (/rel\s*=\s*"[^"]*noopener/.test(tag)) continue;
      const line = html.slice(0, m.index).split('\n').length;
      offenders.push(`${file}:${line}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `以下 target="_blank" 链接缺少 rel="noopener"（反向 tabnabbing 风险）:\n${offenders.join('\n')}`,
  );
});

test('内联 data-URI 中的 SVG 必须做百分号编码', () => {
  const offenders = [];
  for (const file of HTML_FILES) {
    const html = read(file);
    const re = /(?:href|src|url\()\s*[='"]?\s*data:image\/svg\+xml,([^"')]*)/g;
    for (const m of html.matchAll(re)) {
      if (m[1].includes('<')) {
        const line = html.slice(0, m.index).split('\n').length;
        offenders.push(`${file}:${line}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `data-URI 内联 SVG 含未编码的 "<"，会被 HTML 解析器当成真实标签:\n${offenders.join('\n')}`,
  );
});

test('每个可索引页面必须有独立的 title、description 与 canonical', () => {
  const seen = new Map();
  const problems = [];
  for (const file of HTML_FILES) {
    const html = read(file);
    const noindex = /<meta\s+name="robots"[^>]*noindex/i.test(html);
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
    if (!title) {
      problems.push(`${file} 缺少 <title>`);
      continue;
    }
    if (noindex) continue;

    const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1];
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1];
    if (!desc) problems.push(`${file} 缺少 meta description`);
    if (!canonical) problems.push(`${file} 缺少 canonical`);

    if (seen.has(title)) {
      problems.push(`${file} 的 title 与 ${seen.get(title)} 重复: "${title}"`);
    } else {
      seen.set(title, file);
    }
  }
  assert.deepEqual(problems, [], `SEO 元信息问题:\n${problems.join('\n')}`);
});

test('sitemap.xml 列出的每个 URL 都必须有对应文件', () => {
  const xml = read('sitemap.xml');
  assert.match(
    xml,
    /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/,
    'sitemap.xml 的 namespace 不正确',
  );

  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  assert.ok(locs.length > 0, 'sitemap.xml 未包含任何 <loc>');

  const missing = [];
  for (const loc of locs) {
    const path = new URL(loc).pathname;
    const rel = path === '/' ? 'index.html' : path.replace(/^\//, '');
    if (!existsSync(join(ROOT, rel))) missing.push(`${loc} -> ${rel}`);
  }
  assert.deepEqual(missing, [], `sitemap 中的 URL 指向不存在的文件:\n${missing.join('\n')}`);
});

test('robots.txt 必须声明 sitemap 且不屏蔽首页', () => {
  const txt = read('robots.txt');
  assert.match(txt, /^User-agent:\s*\*/m, 'robots.txt 缺少 User-agent 声明');
  assert.match(txt, /^Sitemap:\s*https?:\/\/\S+/m, 'robots.txt 未声明 Sitemap');
  assert.doesNotMatch(txt, /^Disallow:\s*\/\s*$/m, 'robots.txt 屏蔽了整站');
});

test('首页作品卡片必须是可抓取的语义化链接', () => {
  const html = read('index.html');
  const grid = html.match(/<div class="works-grid">([\s\S]*?)\n            <\/div>/);
  assert.ok(grid, 'index.html 未找到 works-grid 容器');

  const cards = [...grid[1].matchAll(/<a\b[^>]*class="work-card"[^>]*>/g)];
  assert.equal(cards.length, 15, `作品卡片应为 15 个语义化 <a>，实际 ${cards.length} 个`);

  const bad = cards.filter((m) => !/href="https?:\/\//.test(m[0]));
  assert.deepEqual(bad.map((m) => m[0]), [], '存在没有合法 http(s) href 的作品卡片');

  assert.doesNotMatch(
    html,
    /data-link=/,
    'index.html 仍残留 data-link 依赖（搜索引擎无法抓取，禁用 JS 时不可点击）',
  );
});

test('滚动监听必须经过 rAF 节流', () => {
  const js = read('script.js');
  const listeners = [...js.matchAll(/addEventListener\(\s*['"]scroll['"]\s*,\s*([^,)]+)/g)];
  assert.ok(listeners.length > 0, '未找到任何 scroll 监听，请复核本测试');
  const unthrottled = listeners
    .map((m) => m[1].trim())
    .filter((handler) => !/rafThrottle\(/.test(handler));
  assert.deepEqual(unthrottled, [], `以下 scroll 监听未节流: ${unthrottled.join(', ')}`);
});
