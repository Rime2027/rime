/* ==========================================================================
   英文字符串大小写转换（page10 使用）
   --------------------------------------------------------------------------
   分词规则：驼峰边界、下划线、连字符、空白都视为分隔，
   因此 "helloWorld"、"hello_world"、"hello-world" 能得到一致的转换结果。
   浏览器挂 window.TextCase；Node 测试挂 globalThis.TextCase。
   ========================================================================== */
(function (global) {
    'use strict';

    function words(str) {
        return String(str)
            // 驼峰边界：小写/数字 紧跟 大写 处断开
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/[_\-]+/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
    }

    function cap(w) {
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }

    var TextCase = {
        /** 全部大写 */
        upper: function (s) {
            return String(s).toUpperCase();
        },

        /** 全部小写 */
        lower: function (s) {
            return String(s).toLowerCase();
        },

        /** 每个单词首字母大写，其余小写 */
        capitalize: function (s) {
            return words(s).map(cap).join(' ');
        },

        /** 每句首字母大写，保留原有空格与标点 */
        sentence: function (s) {
            var text = String(s);
            var out = '';
            var startOfSentence = true;
            for (var i = 0; i < text.length; i += 1) {
                var ch = text[i];
                if (startOfSentence && /[a-zA-Z]/.test(ch)) {
                    out += ch.toUpperCase();
                    startOfSentence = false;
                } else {
                    out += ch;
                    if (/[.!?。！？]/.test(ch)) startOfSentence = true;
                }
            }
            return out;
        },

        /** 大小写反转 */
        toggle: function (s) {
            var out = '';
            var text = String(s);
            for (var i = 0; i < text.length; i += 1) {
                var ch = text[i];
                if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) {
                    out += ch.toLowerCase();
                } else if (ch === ch.toLowerCase() && ch !== ch.toUpperCase()) {
                    out += ch.toUpperCase();
                } else {
                    out += ch;
                }
            }
            return out;
        },

        /** 驼峰：helloWorld */
        camel: function (s) {
            return words(s)
                .map(function (w, i) {
                    var lower = w.toLowerCase();
                    return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
                })
                .join('');
        },

        /** 帕斯卡：HelloWorld */
        pascal: function (s) {
            return words(s).map(cap).join('');
        },

        /** 下划线：hello_world */
        snake: function (s) {
            return words(s).map(function (w) { return w.toLowerCase(); }).join('_');
        },

        /** 连字符：hello-world */
        kebab: function (s) {
            return words(s).map(function (w) { return w.toLowerCase(); }).join('-');
        },

        /** 常量：HELLO_WORLD */
        constant: function (s) {
            return words(s).map(function (w) { return w.toUpperCase(); }).join('_');
        },
    };

    global.TextCase = TextCase;
})(typeof window !== 'undefined' ? window : globalThis);
