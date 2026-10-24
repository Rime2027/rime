/* ==========================================================================
   主题色阶算法（首页与子页面共用）
   --------------------------------------------------------------------------
   由色相推导整套品牌色阶，明度按 WCAG 对比度反解，
   保证拖到任意色相（含最难达标的黄、青）时主色在浅色/深色下都可读。
   浏览器挂到 window.ThemeColor；Node 测试挂到 globalThis.ThemeColor。
   ========================================================================== */
(function (global) {
    'use strict';

    function hslToHex(h, s, l) {
        const sat = s / 100;
        const lig = l / 100;
        const k = (n) => (n + h / 30) % 12;
        const a = sat * Math.min(lig, 1 - lig);
        const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        const hex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
        return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`.toUpperCase();
    }

    function relativeLuminance(hex) {
        const n = hex.replace('#', '');
        const ch = [0, 2, 4]
            .map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
            .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
        return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    }

    function contrastRatio(a, b) {
        const la = relativeLuminance(a);
        const lb = relativeLuminance(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

    /**
     * 二分求满足目标对比度的明度。
     * findMax=true：对白底，找「仍够深」的最亮明度；false：对暗底，找「仍够亮」的最暗明度。
     */
    function solveLightness(hue, sat, bg, target, findMax) {
        let lo = 2;
        let hi = 88;
        for (let i = 0; i < 22; i += 1) {
            const mid = (lo + hi) / 2;
            const ok = contrastRatio(hslToHex(hue, sat, mid), bg) >= target;
            if (findMax) {
                if (ok) lo = mid; else hi = mid;
            } else if (ok) {
                hi = mid;
            } else {
                lo = mid;
            }
        }
        return findMax ? lo : hi;
    }

    // 返回 {50,100,200,500,600,700} 的十六进制色阶
    function hueBrandScale(hue) {
        const h = ((Number(hue) % 360) + 360) % 360;
        const l600 = solveLightness(h, 68, '#FFFFFF', 4.8, true);   // 浅色卡片上的主色
        const l500 = solveLightness(h, 72, '#1A1F26', 4.8, false);  // 暗色卡片上的主色
        return {
            50: hslToHex(h, 90, 97),
            100: hslToHex(h, 85, 93),
            200: hslToHex(h, 78, 84),
            500: hslToHex(h, 72, l500),
            600: hslToHex(h, 68, l600),
            700: hslToHex(h, 65, Math.max(8, l600 - 7)),
        };
    }

    global.ThemeColor = {
        hslToHex,
        relativeLuminance,
        contrastRatio,
        solveLightness,
        hueBrandScale,
        BRAND_STEPS: ['50', '100', '200', '500', '600', '700'],
    };
})(typeof window !== 'undefined' ? window : globalThis);
