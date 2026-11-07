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

test('首页 QQ 群二维码图片必须声明固有尺寸以避免加载抖动', () => {
  const html = read('index.html');
  const img = html.match(/<img\b[^>]*qq\.jpg[^>]*>/);
  assert.ok(img, 'index.html 未找到 QQ 群二维码图片');
  assert.match(img[0], /\bwidth="\d+"/, '二维码图片缺少 width 属性');
  assert.match(img[0], /\bheight="\d+"/, '二维码图片缺少 height 属性');
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
  assert.equal(cards.length, 12, `作品卡片应为 12 个语义化 <a>，实际 ${cards.length} 个`);

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

test('导航栏社交链接指向正确的账号地址', () => {
  const html = read('index.html');
  // GitHub 用户名实测：github.com/xyos2 为 404，正确账号是 Rime2027
  assert.match(html, /https:\/\/github\.com\/Rime2027/, 'GitHub 链接不是 Rime2027');
  assert.doesNotMatch(html, /https:\/\/github\.com\/xyos2(?!"|\/)/, 'GitHub 链接仍指向已失效的 xyos2');
  assert.match(
    html,
    /https:\/\/my\.feishu\.cn\/wiki\/space\/7695374812016806852/,
    '教程文档链接未指向飞书知识库',
  );
  assert.match(html, /掘金社区/, '导航栏缺少「掘金社区」文案');
});

test('QQ 群二维码灯箱结构完整', () => {
  const html = read('index.html');
  assert.match(html, /id="qqLightbox"/, '缺少 QQ 灯箱容器');
  assert.match(html, /id="qqBtn"/, '缺少桌面端 QQ 触发按钮');
  assert.match(html, /id="qqBtnMobile"/, '缺少移动端 QQ 触发按钮');
  assert.match(html, /扫描二维码加入qq群/, '灯箱下方缺少「扫描二维码加入qq群」文案');
  assert.match(html, /fa-qq/, 'QQ 图标未使用 fa-qq');
  assert.doesNotMatch(html, /fa-weixin|weixin\.png/, '仍残留微信相关资源');
});

test('页脚年份由脚本接管而非写死', () => {
  const html = read('index.html');
  const footer = html.match(/©\s*<span id="copyrightYear">[^<]*<\/span>/);
  assert.ok(footer, '页脚年份未使用 copyrightYear 占位元素');
  const js = read('script.js');
  assert.match(js, /getFullYear\(\)/, 'script.js 未用 getFullYear 计算年份');
  assert.match(js, /copyrightYear/, 'script.js 未更新 copyrightYear 元素');
});

test('首页工具卡片全部在新窗口打开，且不再指向已删除页面', () => {
  const html = read('index.html');
  const cards = [...html.matchAll(/<a\b[^>]*class="tool-card"[^>]*>/g)].map((m) => m[0]);
  assert.ok(cards.length > 0, '未找到工具卡片');

  const noBlank = cards.filter((t) => !/target="_blank"/.test(t));
  assert.deepEqual(noBlank, [], '存在未在新窗口打开的工具卡片');

  const dangling = cards.filter((t) => /page02\.html|cli\.im/.test(t));
  assert.deepEqual(dangling, [], '工具卡片仍指向已合并/已删除的页面');
});

test('自定义光标在触屏与减少动效偏好下应降级', () => {
  const js = read('script.js');
  assert.match(js, /initCustomCursor/, 'script.js 缺少自定义光标初始化');
  assert.match(js, /\(hover: hover\) and \(pointer: fine\)/, '光标未做指针能力检测');
  assert.match(js, /prefers-reduced-motion/, '光标未尊重「减少动态效果」偏好');
  const css = read('style.css');
  assert.match(css, /\.cursor-dot/, '缺少光标中心点样式');
  assert.match(css, /\.cursor-ring/, '缺少光标圆环样式');
  assert.match(css, /body\.custom-cursor/, '缺少隐藏系统光标的样式');
});

test('设计令牌集中在 tokens.css 并被首页引用', () => {
  const html = read('index.html');
  assert.match(html, /assets\/css\/tokens\.css/, 'index.html 未引用 tokens.css');

  const tokens = read('assets/css/tokens.css');
  for (const v of ['--color-bg', '--color-card', '--color-primary', '--color-border', '--color-bg-subtle']) {
    assert.ok(tokens.includes(`${v}:`), `tokens.css 缺少 ${v}`);
  }

  const css = read('style.css');
  assert.doesNotMatch(css, /^:root\s*\{/m, 'style.css 仍自定义 :root，令牌应由 tokens.css 统一提供');
  assert.doesNotMatch(css, /^body\.dark\s*\{/m, 'style.css 仍自定义暗色变量，应由 tokens.css 统一提供');
});

test('个性化面板提供三种外观模式与多个主题色', () => {
  const html = read('index.html');

  const modes = [...html.matchAll(/data-mode="(\w+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(modes, ['dark', 'light', 'system'], '外观模式应为 浅色/深色/跟随系统');

  const accents = [...html.matchAll(/class="theme-accent"[^>]*data-accent="(\w+)"/g)].map((m) => m[1]);
  assert.ok(accents.length >= 4, `主题色应至少 4 种，实际 ${accents.length}`);

  const tokens = read('assets/css/tokens.css');
  for (const a of accents) {
    assert.ok(tokens.includes(`data-accent="${a}"`), `tokens.css 缺少主题色 ${a} 的定义`);
  }
});

test('主题选择持久化并响应系统外观变化', () => {
  const js = read('script.js');
  assert.match(js, /initThemeSettings/, 'script.js 缺少 initThemeSettings');
  assert.match(js, /localStorage\.setItem\(THEME_MODE_KEY/, '外观模式未持久化');
  assert.match(js, /localStorage\.setItem\(THEME_ACCENT_KEY/, '主题色未持久化');
  assert.match(js, /prefers-color-scheme: dark/, '未监听系统外观偏好');
  assert.match(js, /data-accent|dataset\.accent/, '未把主题色写到 body 上');
});

test('常用链接页在首页与 sitemap 中可达，且复用同一套令牌', () => {
  const html = read('index.html');
  assert.match(html, /href="pages\/page07\.html"/, '首页缺少「常用链接」入口');

  const sitemap = read('sitemap.xml');
  assert.match(sitemap, /pages\/page07\.html/, 'sitemap 缺少 page07');

  const page = read('pages/page07.html');
  assert.match(page, /assets\/css\/tokens\.css/, 'page07 未复用 tokens.css，主题自定义不会生效');
  assert.match(page, /subpage-theme\.js/, 'page07 未继承首页的主题偏好');
});

// ---- 色彩对比度（WCAG AA）机械校验：改色后仍保证文字可读 ----
function parseTokenBlock(css, selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(esc + '\\s*\\{([^}]*)\\}'));
  if (!m) return {};
  const vars = {};
  for (const part of m[1].split(';')) {
    const mm = part.match(/(--[\w-]+)\s*:\s*(.+)/);
    if (mm) vars[mm[1].trim()] = mm[2].trim();
  }
  return vars;
}

function resolveToken(vars, value, depth = 0) {
  if (depth > 8) return null;
  const m = String(value || '').match(/^var\((--[\w-]+)\)$/);
  if (!m) return String(value || '');
  return resolveToken(vars, vars[m[1]], depth + 1);
}

function hexToRgb(color) {
  const hex = String(color).replace('#', '').trim();
  if (/^[0-9a-f]{6}$/i.test(hex)) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  if (/^[0-9a-f]{3}$/i.test(hex)) return [0, 1, 2].map((i) => parseInt(hex[i] + hex[i], 16));
  return null;
}

function relativeLuminance([r, g, b]) {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

test('所有主题组合下关键文字对比度满足 WCAG AA', () => {
  const tokens = read('assets/css/tokens.css');
  const accents = [...tokens.matchAll(/body\[data-accent="(\w+)"\]/g)].map((m) => m[1]);

  const pairs = [
    ['正文', '--color-text', '--color-bg', 4.5],
    ['标题', '--color-text-dark', '--color-bg', 4.5],
    ['次要', '--color-text-light', '--color-card', 4.5],
    ['主色', '--color-primary', '--color-card', 4.5],
    ['辅助', '--color-text-muted', '--color-bg', 3.0],
  ];

  const failures = [];

  for (const dark of [false, true]) {
    for (const accent of accents) {
      const vars = { ...parseTokenBlock(tokens, ':root') };
      // --color-primary 系列声明在 body 上（见上一条测试），需一并合并
      Object.assign(vars, parseTokenBlock(tokens, 'body'));
      Object.assign(vars, parseTokenBlock(tokens, `body[data-accent="${accent}"]`));
      if (dark) {
        Object.assign(vars, parseTokenBlock(tokens, 'body.dark'));
        Object.assign(vars, parseTokenBlock(tokens, `body.dark[data-accent="${accent}"]`));
      }

      for (const [name, fgVar, bgVar, min] of pairs) {
        const fg = hexToRgb(resolveToken(vars, vars[fgVar]));
        const bg = hexToRgb(resolveToken(vars, vars[bgVar]));
        if (!fg || !bg) {
          failures.push(`${dark ? '深色' : '浅色'}/${accent} ${name}: 无法解析颜色`);
          continue;
        }
        const ratio = contrastRatio(fg, bg);
        if (ratio < min) {
          failures.push(
            `${dark ? '深色' : '浅色'}/${accent} ${name}: ${ratio.toFixed(2)} < ${min}`,
          );
        }
      }
    }
  }

  assert.deepEqual(failures, [], `以下配色对比度不足:\n${failures.join('\n')}`);
});

// ---- 色相滑块：任意色相下的对比度不变量 ----
async function loadScriptContext() {
  const vm = (await import('node:vm')).default;
  const src = read('script.js');

  const makeEl = () => ({
    dataset: {},
    style: { setProperty() {} },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {},
    getAttribute() { return null; },
    addEventListener() {},
    append() {},
    appendChild() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    textContent: '',
  });

  const ctx = {
    document: {
      body: makeEl(),
      documentElement: makeEl(),
      head: makeEl(),
      getElementById() { return null; },
      querySelectorAll() { return []; },
      querySelector() { return null; },
      createElement() { return makeEl(); },
      createTextNode() { return {}; },
      addEventListener() {},
    },
    window: {
      matchMedia: () => ({ matches: false, addEventListener() {} }),
      addEventListener() {},
      setTimeout: (fn) => fn(),
      innerWidth: 1280,
      innerHeight: 800,
      pageYOffset: 0,
      requestAnimationFrame: (fn) => fn(),
    },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    history: {},
    console: { log() {} },
    setTimeout: (fn) => fn(),
    requestAnimationFrame: (fn) => fn(),
    Node: { TEXT_NODE: 3 },
    Element: function () {},
    Math,
    Date,
  };

  vm.createContext(ctx);
  // 色阶算法在 theme-color.js，首页与子页面共用，先加载它
  vm.runInContext(read('assets/js/theme-color.js'), ctx);
  vm.runInContext(src, ctx);
  return ctx;
}

test('色相滑块：任意色相下主色对比度都达标', async () => {
  const ctx = await loadScriptContext();
  const ThemeColor = ctx.window.ThemeColor;
  assert.ok(ThemeColor && typeof ThemeColor.hueBrandScale === 'function',
    'theme-color.js 应提供 hueBrandScale(hue) 生成色阶');

  const DARK_BG = '#1A1F26'; // 暗色卡片底
  const WHITE = '#FFFFFF';

  const lightFails = [];
  const darkFails = [];

  for (let h = 0; h < 360; h += 5) {
    const scale = ThemeColor.hueBrandScale(h);
    assert.ok(scale['600'] && scale['500'], `hue=${h} 色阶缺少 600/500`);

    const lightRatio = contrastRatio(hexToRgb(scale['600']), hexToRgb(WHITE));
    if (lightRatio < 4.5) lightFails.push(`hue=${h} 600=${scale['600']} ${lightRatio.toFixed(2)}`);

    const darkRatio = contrastRatio(hexToRgb(scale['500']), hexToRgb(DARK_BG));
    if (darkRatio < 4.5) darkFails.push(`hue=${h} 500=${scale['500']} ${darkRatio.toFixed(2)}`);
  }

  assert.deepEqual(
    lightFails.slice(0, 5),
    [],
    `浅色模式下以下色相主色对比度不足 4.5:\n${lightFails.slice(0, 5).join('\n')}`,
  );
  assert.deepEqual(
    darkFails.slice(0, 5),
    [],
    `暗色模式下以下色相主色对比度不足 4.5:\n${darkFails.slice(0, 5).join('\n')}`,
  );
});

test('个性化面板包含色相滑块并持久化', () => {
  const html = read('index.html');
  assert.match(html, /id="hueSlider"/, '面板缺少色相滑块');
  assert.match(html, /type="range"/, '色相控件应为 range 输入');

  const js = read('script.js');
  assert.match(js, /hueSlider/, 'script.js 未绑定色相滑块');
  assert.match(js, /THEME_HUE_KEY|theme-hue/, '色相未持久化');
  assert.match(js, /setProperty\(\s*[`'"]--brand-/, '未把生成的色阶写回 CSS 变量');
});

test('首页 Hero 独占首屏且带渐变', () => {
  const css = read('style.css');
  const hero = css.match(/\.hero\s*\{([^}]*)\}/);
  assert.ok(hero, '未找到 .hero 规则');
  const block = hero[1];
  assert.match(block, /min-height:\s*(100vh|100svh)/, 'Hero 应独占首屏高度');
  assert.match(block, /background[^;]*gradient/, 'Hero 背景应为渐变');
});

test('page07 顶部栏与首页导航尺寸一致', () => {
  const page = read('pages/page07.html');
  const css = read('style.css');
  const nav = css.match(/\.nav-container\s*\{([^}]*)\}/);
  assert.ok(nav, '未找到 .nav-container');
  assert.match(nav[1], /padding:\s*var\(--space-sm\)/, '首页导航内边距应使用统一变量');
  assert.match(page, /height:\s*64px/, 'page07 顶部栏高度应为 64px 与首页对齐');
});

test('主题色语义变量必须在 body 上声明，否则浅色模式换色不生效', () => {
  const tokens = read('assets/css/tokens.css');

  const rootMatch = tokens.match(/:root\s*\{([^}]*)\}/);
  assert.ok(rootMatch, 'tokens.css 缺少 :root 块');
  const rootBlock = rootMatch[1];

  const bodyMatch = tokens.match(/(?:^|\n)body\s*\{([^}]*)\}/);
  assert.ok(bodyMatch, 'tokens.css 缺少 body 块');
  const bodyBlock = bodyMatch[1];

  // CSS 自定义属性继承的是「计算值」：写在 :root 上的 var(--brand-600) 会在 :root 解析完，
  // 之后 body 上改 --brand-600 不会让继承来的 --color-primary 重算。
  assert.doesNotMatch(
    rootBlock,
    /--color-primary\s*:/,
    ':root 不应声明 --color-primary —— 继承的是计算值，换主题色时不会重算',
  );
  assert.doesNotMatch(
    rootBlock,
    /--color-primary-hover\s*:|--color-primary-soft\s*:/,
    ':root 不应声明 --color-primary-hover / --color-primary-soft，原因同上',
  );

  assert.match(
    bodyBlock,
    /--color-primary\s*:\s*var\(--brand-600\)/,
    'body 应声明 --color-primary: var(--brand-600)，才能随 data-accent 变化',
  );
  assert.match(
    bodyBlock,
    /--color-primary-hover\s*:\s*var\(--brand-700\)/,
    'body 应声明 --color-primary-hover',
  );
  assert.match(
    bodyBlock,
    /--color-primary-soft\s*:\s*var\(--brand-50\)/,
    'body 应声明 --color-primary-soft',
  );
});

test('Hero 标题跟随主题色并带渐变', () => {
  const css = read('style.css');
  const title = css.match(/\.hero-title\s*\{([^}]*)\}/);
  assert.ok(title, '未找到 .hero-title');
  assert.match(title[1], /gradient/, 'Hero 标题应使用渐变');
  assert.match(title[1], /background-clip:\s*text/, '渐变需裁剪到文字');
  assert.match(title[1], /var\(--color-primary/, '渐变色应引用主题变量，才能随主题变化');
  assert.match(title[1], /var\(--brand-|var\(--color-primary/, '渐变色应使用品牌色阶');
});

test('导航栏为半透明渐变', () => {
  const css = read('style.css');
  const nav = css.match(/\.navbar\s*\{([^}]*)\}/);
  assert.ok(nav, '未找到 .navbar');
  assert.match(nav[1], /gradient/, '导航栏背景应为渐变');
  assert.match(nav[1], /color-mix|rgba\(/, '渐变应带透明度');
  assert.match(nav[1], /backdrop-filter/, '半透明导航应配 backdrop-filter');
});

test('所有子页面接入主题令牌并继承首页主题', () => {
  for (const file of PAGE_FILES) {
    const html = read(file);
    assert.match(html, /\.\.\/assets\/css\/tokens\.css/, `${file} 未引入 tokens.css，主题色与深色模式不会生效`);
    assert.match(html, /\.\.\/assets\/js\/subpage-theme\.js/, `${file} 未引入 subpage-theme.js，无法继承首页主题`);
    assert.match(html, /\.\.\/assets\/js\/theme-color\.js/, `${file} 未引入 theme-color.js，色相自定义不会生效`);
  }
});

test('子页面不得自行定义引用主题色的 :root 变量', () => {
  // :root 会提前解析 var(--brand-*)，导致换主题色不生效（首页曾踩过同一个坑）
  for (const file of PAGE_FILES) {
    const html = read(file);
    const rootMatch = html.match(/:root\s*\{([^}]*)\}/);
    if (!rootMatch) continue;
    assert.doesNotMatch(
      rootMatch[1],
      /var\(--color-|var\(--brand-/,
      `${file} 的 :root 中引用了主题变量，应移到 body 上`,
    );
  }
});
