// 禁用浏览器自动恢复滚动位置，由页面自行控制
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// 用 requestAnimationFrame 节流高频事件（scroll 等），避免每次事件都触发样式计算
function rafThrottle(fn) {
    let ticking = false;
    return function (...args) {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            fn.apply(this, args);
        });
    };
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化移动端菜单
    initMobileMenu();
    
    // 初始化实时时间显示
    initTimeDisplay();
    
    // 初始化滚动高亮
    initScrollHighlight();
    
    // 初始化向下探索按钮
    initScrollButton();
    
    // 添加视差滚动效果
    initParallax();
    
    // 初始化夜间模式切换
    initThemeToggle();

    // 初始化 QQ 群二维码灯箱
    initQQLightbox();

    // 页脚年份按当前时间自动更新
    initCopyrightYear();

    // 自定义光标
    initCustomCursor();
});

// 夜间模式切换功能
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const mobileThemeToggle = document.getElementById('mobileThemeToggle');
    const body = document.body;
    
    // 检查本地存储中的主题偏好
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // 初始化主题
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        body.classList.add('dark');
        updateThemeIcon(true);
    }
    
    // 更新主题图标
    function updateThemeIcon(isDark) {
        const icons = document.querySelectorAll('.theme-toggle i');
        icons.forEach(icon => {
            if (isDark) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        });
        // 更新移动端按钮文字
        if (mobileThemeToggle) {
            const textNode = Array.from(mobileThemeToggle.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
            if (textNode) {
                textNode.textContent = isDark ? ' 日间模式' : ' 夜间模式';
            }
        }
    }
    
    // 主题切换逻辑
    function toggleTheme() {
        // 仅在切换瞬间启用全局过渡，避免给所有元素常驻 transition 声明
        body.classList.add('theme-switching');
        const isDark = body.classList.toggle('dark');
        updateThemeIcon(isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        window.setTimeout(() => body.classList.remove('theme-switching'), 350);
    }
    
    // 桌面端按钮事件
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // 移动端按钮事件
    if (mobileThemeToggle) {
        mobileThemeToggle.addEventListener('click', toggleTheme);
    }
    
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const isDark = e.matches;
            body.classList.toggle('dark', isDark);
            updateThemeIcon(isDark);
        }
    });
}

// 移动端菜单切换
function initMobileMenu() {
    const navToggle = document.getElementById('navToggle');
    const navMobile = document.getElementById('navMobile');
    
    if (navToggle && navMobile) {
        navToggle.addEventListener('click', function() {
            navMobile.classList.toggle('active');
            // 切换汉堡菜单图标
            const icon = this.querySelector('i');
            if (navMobile.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
        
        // 点击菜单链接后关闭菜单
        const mobileLinks = navMobile.querySelectorAll('.nav-mobile-link');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMobile.classList.remove('active');
                navToggle.querySelector('i').classList.remove('fa-times');
                navToggle.querySelector('i').classList.add('fa-bars');
            });
        });
    }
}

// 实时时间显示
function initTimeDisplay() {
    const timeElement = document.getElementById('currentTime');
    
    function updateTime() {
        const now = new Date();
        
        // 格式化日期和时间
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        // 星期转换
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const weekday = weekdays[now.getDay()];
        
        // 显示格式：2024-03-15 14:30:25 星期五
        const timeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${weekday}`;
        
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }
    
    // 立即更新一次，然后每秒更新
    updateTime();
    setInterval(updateTime, 1000);
}

// 作品卡片已改为语义化 <a href>，跳转、键盘可达性、右键菜单均由浏览器原生提供，
// 不再需要 JS 干预（原实现依赖 window.open，对禁用 JS 的环境和搜索引擎均不可见）。

// 向下探索按钮点击事件
function initScrollButton() {
    const scrollButton = document.getElementById('scrollToWorks');
    
    if (scrollButton) {
        scrollButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 滚动到作品区域
            const worksSection = document.getElementById('works');
            if (worksSection) {
                const offsetTop = worksSection.offsetTop - 80; // 减去导航栏高度
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
        
        // 添加键盘支持
        scrollButton.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const worksSection = document.getElementById('works');
                if (worksSection) {
                    const offsetTop = worksSection.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
        
        // 设置可访问性
        scrollButton.setAttribute('tabindex', '0');
        scrollButton.setAttribute('role', 'button');
        scrollButton.setAttribute('aria-label', '向下滚动到我的作品区域');
    }
}

// 滚动时高亮当前区域
function initScrollHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link, .nav-mobile-link');
    
    function highlightNavLink() {
        let scrollY = window.pageYOffset + 200; // 增加偏移量，使高亮更提前触发
        let currentSection = '';
        
        // 从下往上检测，确保正确匹配当前可见的section
        for (let i = sections.length - 1; i >= 0; i--) {
            const section = sections[i];
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollY >= sectionTop) {
                currentSection = section.getAttribute('id');
                break; // 找到第一个匹配的section就停止
            }
        }
        
        // 如果没有匹配到任何section，默认显示首页高亮
        if (!currentSection && sections.length > 0) {
            currentSection = sections[0].getAttribute('id');
        }
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }
    
    // 监听滚动事件（rAF 节流，避免高频触发样式计算）
    window.addEventListener('scroll', rafThrottle(highlightNavLink), { passive: true });
    
    // 初始执行一次，处理当前可见区域
    highlightNavLink();
    
    // 添加active样式到CSS
    const style = document.createElement('style');
    style.textContent = `
        .nav-link.active,
        .nav-mobile-link.active {
            color: var(--color-primary) !important;
            background-color: var(--color-hover);
        }
    `;
    document.head.appendChild(style);
}

// 视差滚动效果
function initParallax() {
    const hero = document.querySelector('.hero');

    if (!hero || window.innerWidth <= 768) return;

    // 视差用的 CSS 只注入一次，不放在滚动回调里反复查询与创建
    if (!document.querySelector('#parallax-style')) {
        const style = document.createElement('style');
        style.id = 'parallax-style';
        style.textContent = `
            .hero::before {
                transform: translateY(var(--parallax-rate, 0px)) rotate(calc(var(--parallax-rate, 0px) * 0.1deg));
            }
            .hero::after {
                transform: translateY(calc(var(--parallax-rate, 0px) * -0.7)) rotate(calc(var(--parallax-rate, 0px) * -0.05deg));
            }
        `;
        document.head.appendChild(style);
    }

    window.addEventListener('scroll', rafThrottle(function () {
        const rate = window.pageYOffset * -0.5;
        hero.style.setProperty('--parallax-rate', `${rate}px`);
    }), { passive: true });
}

// QQ 群二维码灯箱
function initQQLightbox() {
    const lightbox = document.getElementById('qqLightbox');
    const btns = [document.getElementById('qqBtn'), document.getElementById('qqBtnMobile')];

    btns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                if (lightbox) {
                    lightbox.style.display = 'flex';
                    requestAnimationFrame(() => lightbox.classList.add('active'));
                }
            });
        }
    });

    if (lightbox) {
        // 点击背景关闭
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) {
                lightbox.classList.remove('active');
                setTimeout(() => { lightbox.style.display = 'none'; }, 300);
            }
        });

        // ESC 键关闭
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                lightbox.classList.remove('active');
                setTimeout(() => { lightbox.style.display = 'none'; }, 300);
            }
        });
    }
}

// 页脚年份：按当前时间自动更新，避免每年手改
function initCopyrightYear() {
    const el = document.getElementById('copyrightYear');
    if (el) {
        el.textContent = String(new Date().getFullYear());
    }
}

// 控制台提示信息
console.log('🚀 网站初始化完成！');
// 自定义光标：圆环平滑跟随 + 中心点即时跟随，悬停可交互元素时圆环放大
// 仅在支持精确指针（鼠标/触控笔）的设备启用；触摸设备与「减少动态效果」偏好下不启用
function initCustomCursor() {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canHover || reduceMotion) return;

    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.append(dot, ring);
    // 只有脚本成功初始化后才隐藏系统光标，避免脚本出错时用户没有光标
    document.body.classList.add('custom-cursor');

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;
    let visible = false;

    const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"], .work-card, .tool-card, .card';

    document.addEventListener('mousemove', (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
        if (!visible) {
            visible = true;
            ringX = targetX;
            ringY = targetY;
            dot.style.opacity = '1';
            ring.style.opacity = '1';
        }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
        visible = false;
        dot.style.opacity = '0';
        ring.style.opacity = '0';
    });

    document.addEventListener('mouseover', (e) => {
        if (e.target instanceof Element && e.target.closest(INTERACTIVE)) {
            document.body.classList.add('cursor-hover');
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target instanceof Element && e.target.closest(INTERACTIVE)) {
            document.body.classList.remove('cursor-hover');
        }
    });

    document.addEventListener('mousedown', () => document.body.classList.add('cursor-down'), { passive: true });
    document.addEventListener('mouseup', () => document.body.classList.remove('cursor-down'), { passive: true });

    // 圆环缓动跟随、中心点即时跟随。
    // 两个约束保证快速甩动时中心点不会脱出圆环：
    //   1) 缓动系数随距离增大而趋近 1，甩得越快跟得越紧；
    //   2) 硬钳制：插值后若偏移仍超过圆环内缘，直接把圆环拉到边界上。
    (function render() {
        dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;

        const dx = targetX - ringX;
        const dy = targetY - ringY;
        const dist = Math.hypot(dx, dy);

        const ease = Math.min(0.92, 0.18 + dist / 90);
        ringX += dx * ease;
        ringY += dy * ease;

        // 圆环半径 17px（常态）／29px（悬停放大），减去中心点半径与 2px 内边距
        const maxOffset = document.body.classList.contains('cursor-hover') ? 22 : 13;
        const ox = targetX - ringX;
        const oy = targetY - ringY;
        const od = Math.hypot(ox, oy);
        if (od > maxOffset) {
            ringX = targetX - (ox / od) * maxOffset;
            ringY = targetY - (oy / od) * maxOffset;
        }

        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
        requestAnimationFrame(render);
    })();
}
