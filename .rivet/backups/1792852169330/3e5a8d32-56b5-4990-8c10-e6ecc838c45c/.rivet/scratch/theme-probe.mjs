// 一次性探针：用最小 DOM stub 真实执行 script.js 的 initThemeSettings，
// 验证「初始化 → 切换外观 → 切换主题色 → 持久化」这条链路
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync('script.js', 'utf8');

// ---- 最小 DOM stub ----
function makeEl(extra = {}) {
  const attrs = {};
  const handlers = {};
  return {
    dataset: {},
    style: { setProperty() {} },
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      toggle(c, force) {
        const on = force === undefined ? !this._s.has(c) : force;
        on ? this._s.add(c) : this._s.delete(c);
        return on;
      },
      contains(c) { return this._s.has(c); },
    },
    setAttribute(k, v) { attrs[k] = v; },
    getAttribute(k) { return attrs[k]; },
    addEventListener(type, fn) { (handlers[type] ||= []).push(fn); },
    append() {},
    appendChild() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    fire(type, ev = {}) { (handlers[type] || []).forEach((fn) => fn(ev)); },
    _attrs: attrs,
    ...extra,
  };
}

const modeBtns = ['light', 'dark', 'system'].map((m) => makeEl({ dataset: { mode: m } }));
const accentBtns = ['blue', 'teal', 'violet', 'amber', 'slate'].map((a) => makeEl({ dataset: { accent: a } }));

const panel = makeEl();
const settingsBtn = makeEl();
const mobileBtn = makeEl();

const body = makeEl();
const store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
};

const documentStub = {
  body,
  documentElement: body,
  getElementById(id) {
    return {
      themePanel: panel,
      themeSettingsBtn: settingsBtn,
      mobileThemeSettingsBtn: mobileBtn,
    }[id] ?? null;
  },
  querySelectorAll(sel) {
    if (sel === '.theme-mode') return modeBtns;
    if (sel === '.theme-accent') return accentBtns;
    return [];
  },
  querySelector() { return null; },
  createElement() { return makeEl(); },
  createTextNode() { return {}; },
  addEventListener() {},
  head: makeEl(),
};

let prefersDark = false;
const mediaQuery = {
  matches: false,
  addEventListener() {},
};

const windowStub = {
  matchMedia: () => Object.assign(mediaQuery, { matches: prefersDark }),
  addEventListener() {},
  setTimeout: (fn) => fn(),
  innerWidth: 1280,
  innerHeight: 800,
  pageYOffset: 0,
  requestAnimationFrame: (fn) => fn(),
};

const ctx = {
  document: documentStub,
  window: windowStub,
  localStorage,
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
vm.runInContext(src, ctx);

// ---- 场景 ----
const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, ok, actual, expected });
}

// 1) 无存储 + 系统为浅色 → 不加深色类，默认主题色 blue
prefersDark = false;
ctx.initThemeSettings();
check('默认(无存储) 深色类', body.classList.contains('dark'), false);
check('默认(无存储) 主题色', body.dataset.accent, 'blue');
check('默认(无存储) 外观按钮选中', modeBtns.map((b) => b._attrs['aria-checked']), ['false', 'false', 'true']);

// 2) 点击「深色」→ 立即加类并持久化
modeBtns[1].fire('click');
check('点深色后 body 有 dark 类', body.classList.contains('dark'), true);
check('点深色后 localStorage', store['theme-mode'], 'dark');

// 3) 点击「青碧」→ 主题色写入 dataset 与存储
accentBtns[1].fire('click');
check('点青碧后 dataset.accent', body.dataset.accent, 'teal');
check('点青碧后 localStorage', store['theme-accent'], 'teal');

// 4) 切到「跟随系统」，系统为深色 → 应判为深色
prefersDark = true;
modeBtns[2].fire('click');
check('跟随系统 + 系统深色 → dark 类', body.classList.contains('dark'), true);

// 5) 切到「跟随系统」，系统为浅色 → 应去掉 dark
prefersDark = false;
modeBtns[2].fire('click');
check('跟随系统 + 系统浅色 → 无 dark 类', body.classList.contains('dark'), false);

// 6) 重新初始化（模拟刷新）：读回持久化的设置
const freshBody = makeEl();
documentStub.body = freshBody;
prefersDark = false;
ctx.initThemeSettings();
check('刷新后主题色恢复', freshBody.dataset.accent, 'teal');
check('刷新后外观恢复(跟随系统+浅色)', freshBody.classList.contains('dark'), false);

// ---- 输出 ----
let pass = 0;
for (const r of results) {
  if (r.ok) pass += 1;
  console.log(`${r.ok ? '  OK  ' : ' FAIL '} ${r.name.padEnd(30)} 实际=${JSON.stringify(r.actual)}`);
}
console.log(`\n${pass}/${results.length} 项通过`);
process.exit(pass === results.length ? 0 : 1);
