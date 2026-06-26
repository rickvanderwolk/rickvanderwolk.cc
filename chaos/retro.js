/*
 * retro.js — tover een pagina om tot een GeoCities-pagina uit 1998.
 *
 * Comic Sans, knalkleuren, sterrenbehang, regenboogtekst, blink, lopende
 * marquee en een "under construction"-balk. Eén bestand inladen:
 *
 *   <script src="/chaos/retro.js"></script>
 */
(function () {
    'use strict';

    var DELAY = typeof window.EFFECT_DELAY === 'number' ? window.EFFECT_DELAY : 2500;

    function injectStyle() {
        var style = document.createElement('style');
        style.textContent = [
            '@keyframes retro-rainbow {',
            '  0% { color: #ff0000; } 16% { color: #ff9900; } 33% { color: #ffff00; }',
            '  50% { color: #33ff00; } 66% { color: #00ccff; } 83% { color: #cc00ff; }',
            '  100% { color: #ff0000; }',
            '}',
            '@keyframes retro-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }',
            '@keyframes retro-marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }',
            '@keyframes retro-stars { from { background-position: 0 0; } to { background-position: -300px 300px; } }',
            'html.retro-actief body {',
            '  font-family: "Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive !important;',
            '  color: #ffff00 !important;',
            '  background-color: #000033 !important;',
            '  background-image: radial-gradient(#ffffff 1px, transparent 1px),',
            '    radial-gradient(#ffff66 1px, transparent 1px) !important;',
            '  background-size: 60px 60px, 90px 90px !important;',
            '  background-position: 0 0, 30px 45px !important;',
            '  animation: retro-stars 12s linear infinite !important;',
            '  padding-top: 42px !important;',
            '}',
            'html.retro-actief h1, html.retro-actief h2, html.retro-actief h3 {',
            '  animation: retro-rainbow 1.5s linear infinite !important;',
            '  text-shadow: 2px 2px 0 #000 !important; font-weight: bold !important;',
            '}',
            'html.retro-actief a {',
            '  color: #00ffff !important; text-decoration: underline !important; font-weight: bold !important;',
            '}',
            'html.retro-actief p, html.retro-actief li, html.retro-actief span,',
            'html.retro-actief td, html.retro-actief label { color: #ffffff !important; }',
            'html.retro-actief button, html.retro-actief input, html.retro-actief .card {',
            '  border: 3px outset #c0c0c0 !important; background: #c0c0c0 !important; color: #000 !important;',
            '  border-radius: 0 !important; font-family: inherit !important;',
            '}',
            '.retro-blink { animation: retro-blink 0.9s steps(1) infinite !important; }',
            '.retro-bar {',
            '  position: fixed; top: 0; left: 0; right: 0; height: 32px; overflow: hidden;',
            '  background: #000; border-bottom: 3px ridge #ffff00; z-index: 2147483600;',
            '  font-family: "Comic Sans MS", cursive; white-space: nowrap; line-height: 32px;',
            '}',
            '.retro-bar span {',
            '  display: inline-block; padding-left: 100%; font-weight: bold; font-size: 16px;',
            '  color: #ff00ff; animation: retro-marquee 12s linear infinite;',
            '}',
            '.retro-counter {',
            '  position: fixed; bottom: 8px; right: 8px; z-index: 2147483600;',
            '  background: #000; color: #00ff00; border: 2px solid #00ff00; padding: 4px 8px;',
            '  font-family: "Courier New", monospace; font-size: 13px;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function run() {
        injectStyle();
        document.documentElement.classList.add('retro-actief');

        // Lopende "under construction"-balk bovenin.
        var bar = document.createElement('div');
        bar.className = 'retro-bar';
        bar.setAttribute('data-fx-ignore', '');
        bar.innerHTML = '<span>🚧 WELCOME TO MY HOMEPAGE !!! ★ UNDER CONSTRUCTION ★ ' +
            'BEST VIEWED IN NETSCAPE NAVIGATOR 4.0 @ 800x600 ★ SIGN MY GUESTBOOK 📖 🚧</span>';
        document.documentElement.appendChild(bar);

        // Bezoekersteller.
        var counter = document.createElement('div');
        counter.className = 'retro-counter';
        counter.setAttribute('data-fx-ignore', '');
        counter.textContent = 'You are visitor #000' + Math.floor(1000 + Math.random() * 8999);
        document.documentElement.appendChild(counter);

        // Laat koppen knipperen.
        var heads = document.body.querySelectorAll('h1, h2, h3');
        for (var i = 0; i < heads.length; i++) {
            if (heads[i].closest('[data-fx-ignore]')) {
                continue;
            }
            if (Math.random() < 0.5) {
                heads[i].classList.add('retro-blink');
            }
        }
    }

    setTimeout(run, DELAY);
})();
