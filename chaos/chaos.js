/*
 * chaos.js — gooi een willekeurige pagina eenmalig overhoop.
 *
 * Eén bestand inladen en na een paar seconden gaat de hele boel in één
 * keer overhoop: elementen worden verplaatst, (half) verdraaid, vervormd
 * en krijgen allerlei rare CSS-effecten. Bedoeld om los op een bestaande
 * pagina te plakken, bijv:
 *
 *   <script src="/chaos/chaos.js"></script>
 */
(function () {
    'use strict';

    // ms voordat de chaos losbarst (demo mag dit overschrijven)
    var DELAY = typeof window.EFFECT_DELAY === 'number' ? window.EFFECT_DELAY : 5000;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // Een vloeiende transitie zodat de elementen netjes naar hun nieuwe
    // plek toe glijden in plaats van te springen.
    function injectStyle() {
        var style = document.createElement('style');
        style.textContent = [
            'html { overflow-x: hidden; }',
            '.chaos-el {',
            '  transition: transform 0.6s cubic-bezier(.2,1.6,.4,1), filter 0.6s ease, opacity 0.6s ease !important;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    // Verzamel zichtbare elementen die we mogen verbouwen.
    function targets() {
        var all = document.body.querySelectorAll('*');
        var out = [];
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            var tag = el.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' ||
                tag === 'META' || tag === 'NOSCRIPT' || tag === 'BR') {
                continue;
            }
            if (el.closest('[data-fx-ignore]')) {
                continue; // bijv. de demo-knoppenbalk
            }
            var rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
                continue; // onzichtbaar, sla over
            }
            out.push(el);
        }
        return out;
    }

    var FILTERS = [
        function () { return 'grayscale(1)'; },
        function () { return 'invert(1)'; },
        function () { return 'sepia(1)'; },
        function () { return 'hue-rotate(' + Math.floor(rand(0, 360)) + 'deg)'; },
        function () { return 'blur(' + rand(1, 3).toFixed(1) + 'px)'; },
        function () { return 'contrast(' + rand(1.5, 3).toFixed(2) + ')'; },
        function () { return 'saturate(' + rand(2, 6).toFixed(2) + ')'; }
    ];

    function chaos(el, viewportW, viewportH) {
        var transform = '';

        // Sommige dingen krijgen een vaste positie ergens anders op het scherm.
        if (Math.random() < 0.12) {
            var rect = el.getBoundingClientRect();
            el.style.position = 'fixed';
            el.style.left = rand(0, Math.max(0, viewportW - rect.width)) + 'px';
            el.style.top = rand(0, Math.max(0, viewportH - rect.height)) + 'px';
            el.style.zIndex = String(Math.floor(rand(1, 9999)));
            el.style.margin = '0';
        } else {
            // De rest verschuift wat losjes vanaf z'n plek.
            transform += 'translate(' + rand(-40, 40).toFixed(0) + 'px, ' +
                rand(-40, 40).toFixed(0) + 'px) ';
        }

        // Draaien of half draaien.
        var rot = Math.random() < 0.25 ? rand(-180, 180) : rand(-20, 20);
        transform += 'rotate(' + rot.toFixed(1) + 'deg) ';

        // Schalen en scheeftrekken.
        transform += 'scale(' + rand(0.7, 1.3).toFixed(2) + ') ';
        if (Math.random() < 0.4) {
            transform += 'skew(' + rand(-12, 12).toFixed(1) + 'deg, ' +
                rand(-12, 12).toFixed(1) + 'deg) ';
        }

        el.style.transform = transform.trim();

        // Een of twee rare filters stapelen.
        var f = pick(FILTERS)();
        if (Math.random() < 0.4) {
            f += ' ' + pick(FILTERS)();
        }
        el.style.filter = f;

        if (Math.random() < 0.15) {
            el.style.opacity = rand(0.3, 0.9).toFixed(2);
        }

        el.classList.add('chaos-el');
    }

    // Eenmalig: gooi alle elementen één keer overhoop.
    function gooiOverhoop() {
        injectStyle();
        var w = window.innerWidth;
        var h = window.innerHeight;
        var list = targets();
        for (var i = 0; i < list.length; i++) {
            chaos(list[i], w, h);
        }
    }

    setTimeout(gooiOverhoop, DELAY);
})();
