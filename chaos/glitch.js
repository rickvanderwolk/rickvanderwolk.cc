/*
 * glitch.js — laat een pagina digitaal stukgaan.
 *
 * RGB-split, scanlines, schokkerig verspringen en flikkeren. Eén bestand
 * inladen en na een paar seconden begint de glitch. Bedoeld om los op een
 * bestaande pagina te plakken:
 *
 *   <script src="/chaos/glitch.js"></script>
 */
(function () {
    'use strict';

    var DELAY = typeof window.EFFECT_DELAY === 'number' ? window.EFFECT_DELAY : 3000;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function injectStyle() {
        var style = document.createElement('style');
        style.textContent = [
            '@keyframes glitch-jitter {',
            '  0%, 100% { transform: translate(0, 0); }',
            '  20% { transform: translate(-2px, 1px); }',
            '  40% { transform: translate(2px, -1px); }',
            '  60% { transform: translate(-1px, -1px); }',
            '  80% { transform: translate(1px, 1px); }',
            '}',
            '@keyframes glitch-flicker {',
            '  0%, 88%, 100% { opacity: 1; }',
            '  90% { opacity: 0.3; }',
            '  91% { opacity: 1; }',
            '  94% { opacity: 0.6; }',
            '  95% { opacity: 1; }',
            '}',
            '@keyframes glitch-bar {',
            '  0% { top: -15%; } 100% { top: 115%; }',
            '}',
            'html.glitch-actief body { animation: glitch-flicker 5s infinite steps(60); }',
            '.glitch-el { animation: glitch-jitter 0.25s steps(2) infinite; }',
            '.glitch-text {',
            '  text-shadow: 2px 0 rgba(255,0,40,0.75), -2px 0 rgba(0,230,255,0.75) !important;',
            '}',
            '.glitch-overlay {',
            '  position: fixed; inset: 0; pointer-events: none; z-index: 2147483600;',
            '  background: repeating-linear-gradient(0deg,',
            '    rgba(0,0,0,0.18) 0, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px);',
            '  mix-blend-mode: multiply;',
            '}',
            '.glitch-bar {',
            '  position: fixed; left: 0; right: 0; height: 14px; pointer-events: none;',
            '  z-index: 2147483601; background: rgba(255,255,255,0.35);',
            '  mix-blend-mode: overlay; animation: glitch-bar 2.6s linear infinite;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    var TEXTY = { H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, P: 1, A: 1, LI: 1,
        SPAN: 1, BUTTON: 1, STRONG: 1, EM: 1, LABEL: 1, TD: 1, TH: 1 };

    function run() {
        injectStyle();
        document.documentElement.classList.add('glitch-actief');

        var overlay = document.createElement('div');
        overlay.className = 'glitch-overlay';
        overlay.setAttribute('data-fx-ignore', '');
        document.documentElement.appendChild(overlay);

        var bar = document.createElement('div');
        bar.className = 'glitch-bar';
        bar.setAttribute('data-fx-ignore', '');
        document.documentElement.appendChild(bar);

        var all = document.body.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            var tag = el.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
                continue;
            }
            if (el.closest('[data-fx-ignore]')) {
                continue;
            }
            el.classList.add('glitch-el');
            el.style.animationDelay = rand(-1, 0).toFixed(2) + 's';
            el.style.animationDuration = rand(0.15, 0.4).toFixed(2) + 's';
            if (TEXTY[tag]) {
                el.classList.add('glitch-text');
            }
        }
    }

    setTimeout(run, DELAY);
})();
