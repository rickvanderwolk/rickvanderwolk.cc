/*
 * vhs.js — geef een pagina de look van een oude, versleten videoband.
 *
 * Scanlines, sepia/verzadiging, een rollende trackingstoring, lichte
 * beeldtrilling en een PLAY/REC-OSD in de hoek. Eén bestand inladen:
 *
 *   <script src="/chaos/vhs.js"></script>
 */
(function () {
    'use strict';

    var DELAY = typeof window.EFFECT_DELAY === 'number' ? window.EFFECT_DELAY : 3000;

    function injectStyle() {
        var style = document.createElement('style');
        style.textContent = [
            '@keyframes vhs-wobble {',
            '  0%, 100% { transform: translate(0, 0) skewX(0deg); }',
            '  25% { transform: translate(-1px, 0) skewX(-0.25deg); }',
            '  50% { transform: translate(1px, 0) skewX(0deg); }',
            '  75% { transform: translate(0, 0) skewX(0.25deg); }',
            '}',
            '@keyframes vhs-roll { 0% { top: -30%; } 100% { top: 130%; } }',
            '@keyframes vhs-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }',
            'html.vhs-actief body {',
            '  filter: saturate(1.5) sepia(0.35) contrast(1.1) brightness(1.05) !important;',
            '  animation: vhs-wobble 0.25s infinite !important;',
            '}',
            '.vhs-overlay {',
            '  position: fixed; inset: 0; pointer-events: none; z-index: 2147483600;',
            '  background:',
            '    repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0, rgba(0,0,0,0.16) 1px, transparent 1px, transparent 3px),',
            '    radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%);',
            '}',
            '.vhs-roll {',
            '  position: fixed; left: 0; right: 0; height: 90px; pointer-events: none;',
            '  z-index: 2147483601; animation: vhs-roll 7s linear infinite;',
            '  background: linear-gradient(rgba(255,255,255,0) 0, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0) 100%);',
            '  backdrop-filter: blur(1px) brightness(1.2);',
            '}',
            '.vhs-osd {',
            '  position: fixed; pointer-events: none; z-index: 2147483602;',
            '  font-family: "Courier New", monospace; font-weight: bold; font-size: 22px;',
            '  color: #fff; text-shadow: 2px 2px 0 rgba(0,0,0,0.6); letter-spacing: 1px;',
            '}',
            '.vhs-play { top: 18px; left: 18px; }',
            '.vhs-rec { top: 18px; right: 18px; color: #ff3b30; }',
            '.vhs-rec b { animation: vhs-blink 1s steps(1) infinite; }',
            '.vhs-date { bottom: 18px; right: 18px; font-size: 18px; }'
        ].join('\n');
        document.head.appendChild(style);
    }

    function osd(cls, html) {
        var el = document.createElement('div');
        el.className = 'vhs-osd ' + cls;
        el.setAttribute('data-fx-ignore', '');
        el.innerHTML = html;
        document.documentElement.appendChild(el);
    }

    function run() {
        injectStyle();
        document.documentElement.classList.add('vhs-actief');

        var overlay = document.createElement('div');
        overlay.className = 'vhs-overlay';
        overlay.setAttribute('data-fx-ignore', '');
        document.documentElement.appendChild(overlay);

        var roll = document.createElement('div');
        roll.className = 'vhs-roll';
        roll.setAttribute('data-fx-ignore', '');
        document.documentElement.appendChild(roll);

        osd('vhs-play', '▶ PLAY');
        osd('vhs-rec', '<b>●</b> REC');
        osd('vhs-date', 'JAN 01 1999');
    }

    setTimeout(run, DELAY);
})();
