---
name: file-links-html
description: "[file: links.html] — verified by 3 checks"
triggers:
  - tokens
  - style
  - index
  - script
---

# file-links-html

> 自动从会话 20261024 蒸馏的草稿。审核后用 `/skill approve file-links-html` 入库，或 `/skill reject file-links-html` 丢弃。

## Steps
1. 阅读 / 搜索：echo "=== 导航区结构（前 70 行）==="; sed -n '16,70p' index、echo "=== style.css 变量块行号 ==="; grep -n '^:root\|^、C:/Users/xy/Desktop/个人网页/index.html
2. 修改：C:/Users/xy/Desktop/个人网页/assets/css/tokens.css
3. 阅读 / 搜索：C:/Users/xy/Desktop/个人网页/style.css
4. 修改：C:/Users/xy/Desktop/个人网页/style.css、C:/Users/xy/Desktop/个人网页/index.html
5. 阅读 / 搜索：grep -n 'initThemeToggle\|function initThemeToggle、grep -n '夜间模式切换功能\|移动端菜单切换\|initThemeToggle()' scr、C:/Users/xy/Desktop/个人网页/script.js
6. 修改：C:/Users/xy/Desktop/个人网页/script.js、C:/Users/xy/Desktop/个人网页/pages/page07.html、C:/Users/xy/Desktop/个人网页/index.html
7. 阅读 / 搜索：node --check script.js && echo "script.js OK"; pyt
8. 验证：run_tests
9. 修改：C:/Users/xy/Desktop/个人网页/tests/site.test.js
10. 验证：run_tests
11. 阅读 / 搜索：git add assets/css/tokens.css style.css script.js、git commit -m "feat: 令牌化色彩系统与主题自定义，新增常用链接页

1. 浅色主、python -m http.server 8788 >/dev/null 2>&1 &
SRV=$
12. 操作：todo
13. 修改：C:/Users/xy/Desktop/个人网页/.rivet/scratch/contrast-probe.mjs
14. 阅读 / 搜索：node .rivet/scratch/contrast-probe.mjs
15. 修改：C:/Users/xy/Desktop/个人网页/assets/css/tokens.css
16. 阅读 / 搜索：node .rivet/scratch/contrast-probe.mjs
17. 修改：C:/Users/xy/Desktop/个人网页/.rivet/scratch/theme-probe.mjs
18. 阅读 / 搜索：node .rivet/scratch/theme-probe.mjs; echo "EXIT=$?
19. 修改：C:/Users/xy/Desktop/个人网页/.rivet/scratch/theme-probe.mjs
20. 阅读 / 搜索：node .rivet/scratch/theme-probe.mjs; echo "EXIT=$?
21. 修改：C:/Users/xy/Desktop/个人网页/tests/site.test.js
22. 验证：run_tests
23. 阅读 / 搜索：rm -f .rivet/scratch/contrast-probe.mjs .rivet/scr
24. 操作：todo

## Verified by
- npm run test -- tests/site.test.js (passed 19)
- npm run test -- tests/site.test.js (passed 23)
- npm run test -- tests/site.test.js (passed 24)

<!-- skill-draft-key: 2b5fcaa83ef2 -->
<!-- source-session: 20261024 -->
