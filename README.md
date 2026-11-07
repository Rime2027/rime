# 星宇·航图 | XY's Blog

个人站点：学习笔记合集、作品与常用工具导航。

纯静态 HTML / CSS / JavaScript，**无构建步骤**——改文件、推送、上线。托管于 Netlify（自定义域名 [xyos2.xyz](https://xyos2.xyz/)）。

## 目录结构

```
.
├── index.html              # 首页（作品 15 项 + 工具 6 项 + 微信灯箱 + 夜间模式）
├── 404.html                # 自定义 404 页
├── style.css               # 首页样式（含 CSS 变量与夜间模式配色）
├── script.js               # 首页脚本（主题切换、导航高亮、视差、灯箱、实时时间）
├── pages/                  # 子页面
│   ├── page01.html         # 智能导航看板（原 page02 已合并至此）
│   ├── page03.html         # 常用网站快捷入口
│   ├── page04.html         # 动态小球导航（共享 assets/css/style01.css + assets/js/script01.js）
│   ├── page05.html         # 专业软件下载中心（数据驱动：9 分类 / 30 款软件）
│   └── page06.html         # 开发中占位页（noindex）
├── assets/
│   ├── css/style01.css     # page04 专用样式
│   ├── js/script01.js      # page04 小球动画（含站点列表）
│   └── images/             # 图片资源
├── tests/site.test.js      # 站点不变量测试（node:test）
├── robots.txt              # 爬虫规则
├── sitemap.xml             # 站点地图
├── _headers                # Netlify 响应头（缓存策略 + 安全头）
└── _redirects              # Netlify 重定向（已删除页面的 301）
```

## 本地预览

直接双击 `index.html` 即可，无需服务器。

注意：`_redirects`、`_headers` 是 Netlify 专有机制，本地不生效。

## 部署

推送到 `main` 分支，Netlify 自动部署：

```bash
git add .
git commit -m "修改说明"
git push origin main
```

> 仓库地址：[https://github.com/Rime2027/rime](https://github.com/Rime2027/rime)，但 **GitHub Pages 并未启用**，实际托管在 Netlify。

## 验证

改动页面结构或新增页面后，跑一遍站点自检：

```bash
npm test
```

检查项包括：HTML 标签闭合、站内链接是否指向真实文件、`lang` 一致性、`_blank` 链接的 `rel` 防护、SEO 元信息完整性与 title 唯一性、作品卡片的语义化、滚动监听节流、sitemap 与实际文件一致性。

## 维护约定

- **新增作品卡片**：改 `index.html` 的 `works-grid`，用 `<a class="work-card" href="..." target="_blank" rel="noopener noreferrer">`，不要用 `div` + `data-link`（搜索引擎抓不到，禁用 JS 时不可点击）
- **新增页面**：需要同时更新 `sitemap.xml`、`robots.txt`（如需排除），并补 `title`、`meta description`、`canonical`
- **外部链接**：一律带 `target="_blank" rel="noopener noreferrer"`
- **删除页面**：在 `_redirects` 里加 301 指向新地址，避免外部已分享的链接 404
- **sitemap 中的 URL** 必须对应真实存在的文件（测试会检查）

## 联系方式

- GitHub: [https://github.com/Rime2027](https://github.com/Rime2027)
- 仓库: [https://github.com/Rime2027/rime](https://github.com/Rime2027/rime)
- 掘金: [https://juejin.cn/user/2232425500384467/posts](https://juejin.cn/user/2232425500384467/posts)
- 抖音: [https://www.douyin.com/user/MS4wLjABAAAAhY3iv3YOd2fQJqtSD70LpiLDw-oWAueJDPw_lHQogqE](https://www.douyin.com/user/MS4wLjABAAAAhY3iv3YOd2fQJqtSD70LpiLDw-oWAueJDPw_lHQogqE)
- QQ: 1745818515

## 许可证

© 2026 星宇·航图 | XY's Blog 保留所有权利
