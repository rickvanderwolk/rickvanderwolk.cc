/*
 * kapot.js — doe alsof de computer/browser helemaal stukgaat.
 *
 * Nep-foutmeldingen ploppen op (Windows 9x-stijl), het beeld flikkert en
 * uiteindelijk verschijnt een nep "blue screen of death". Puur visueel,
 * niets gaat echt stuk. Eén bestand inladen:
 *
 *   <script src="/chaos/kapot.js"></script>
 */
(function () {
    'use strict';

    var DELAY = typeof window.EFFECT_DELAY === 'number' ? window.EFFECT_DELAY : 4000;

    var MESSAGES = [
        'Er is een fout opgetreden in module KERNEL32.DLL',
        'Fatal exception 0E has occurred at 0028:C001CAFE',
        'Onvoldoende geheugen om deze bewerking te voltooien',
        'Het programma reageert niet meer',
        'Windows kan dit bestand niet vinden',
        'Een onverwachte fout heeft zich voorgedaan (0xDEADBEEF)',
        'Toegang geweigerd. Probeer het opnieuw.',
        'De schijf is vol of beveiligd tegen schrijven',
        '404 — werkelijkheid niet gevonden',
        'Stuurprogramma vga.drv is gestopt met reageren'
    ];

    var TITLES = ['Fout', 'Systeemfout', 'Error', 'Waarschuwing', 'explorer.exe', 'Kritieke fout'];

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function injectStyle() {
        var style = document.createElement('style');
        style.textContent = [
            '@keyframes kapot-flicker {',
            '  0%, 100% { opacity: 1; } 92% { opacity: 1; } 93% { opacity: 0.2; }',
            '  94% { opacity: 1; } 96% { opacity: 0.5; } 97% { opacity: 1; }',
            '}',
            '@keyframes kapot-blink { 50% { opacity: 0; } }',
            'html.kapot-actief body { animation: kapot-flicker 4s infinite steps(50); }',
            '.kapot-dialog {',
            '  position: fixed; width: 340px; background: #c0c0c0; z-index: 2147483000;',
            '  border-top: 2px solid #fff; border-left: 2px solid #fff;',
            '  border-right: 2px solid #404040; border-bottom: 2px solid #404040;',
            '  box-shadow: 2px 2px 0 rgba(0,0,0,0.4);',
            '  font-family: "Tahoma", "MS Sans Serif", sans-serif; font-size: 12px; color: #000;',
            '}',
            '.kapot-title {',
            '  background: linear-gradient(90deg, #000080, #1084d0); color: #fff;',
            '  padding: 3px 6px; font-weight: bold; display: flex; justify-content: space-between;',
            '  align-items: center; cursor: default;',
            '}',
            '.kapot-title button {',
            '  width: 18px; height: 16px; font-size: 11px; line-height: 1; padding: 0;',
            '  background: #c0c0c0; border-top: 1px solid #fff; border-left: 1px solid #fff;',
            '  border-right: 1px solid #404040; border-bottom: 1px solid #404040; cursor: pointer;',
            '}',
            '.kapot-body { padding: 16px; display: flex; gap: 14px; align-items: center; }',
            '.kapot-icon { font-size: 30px; line-height: 1; }',
            '.kapot-btns { text-align: center; padding: 0 0 14px; }',
            '.kapot-btns button {',
            '  font-family: inherit; font-size: 12px; min-width: 76px; padding: 4px 10px; margin: 0 4px;',
            '  background: #c0c0c0; border-top: 2px solid #fff; border-left: 2px solid #fff;',
            '  border-right: 2px solid #404040; border-bottom: 2px solid #404040; cursor: pointer;',
            '}',
            '.kapot-bsod {',
            '  position: fixed; inset: 0; background: #0000aa; color: #fff; z-index: 2147483200;',
            '  font-family: "Lucida Console", "Courier New", monospace; font-size: 16px;',
            '  padding: 8vh 12vw; line-height: 1.6;',
            '}',
            '.kapot-bsod h2 { background: #aaaaaa; color: #0000aa; display: inline-block; padding: 0 8px; font-size: 16px; margin: 0 0 24px; }',
            '.kapot-bsod .cur { animation: kapot-blink 1s steps(1) infinite; }'
        ].join('\n');
        document.head.appendChild(style);
    }

    var zTop = 2147483000;

    function spawnDialog() {
        var dlg = document.createElement('div');
        dlg.className = 'kapot-dialog';
        dlg.setAttribute('data-fx-ignore', '');
        dlg.style.left = rand(5, 70).toFixed(0) + 'vw';
        dlg.style.top = rand(8, 70).toFixed(0) + 'vh';
        dlg.style.zIndex = String(++zTop);
        dlg.innerHTML =
            '<div class="kapot-title"><span>' + pick(TITLES) + '</span><button>×</button></div>' +
            '<div class="kapot-body"><span class="kapot-icon">❌</span><span>' + pick(MESSAGES) + '</span></div>' +
            '<div class="kapot-btns"><button>OK</button><button>Opnieuw</button></div>';

        // Naar voren halen bij klik; sluiten via × of OK, maar er ploppen
        // er steeds weer nieuwe op — het blijft kapot.
        dlg.addEventListener('mousedown', function () { dlg.style.zIndex = String(++zTop); });
        var buttons = dlg.querySelectorAll('button');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', function () {
                dlg.remove();
                setTimeout(spawnDialog, rand(150, 500));
            });
        }
        document.documentElement.appendChild(dlg);
    }

    function showBsod() {
        var bsod = document.createElement('div');
        bsod.className = 'kapot-bsod';
        bsod.setAttribute('data-fx-ignore', '');
        bsod.innerHTML =
            '<h2>:(</h2>' +
            '<p>Er is een probleem gedetecteerd en de computer is gestopt om schade ' +
            'te voorkomen.</p>' +
            '<p>UNEXPECTED_REALITY_FAULT</p>' +
            '<p>*** STOP: 0x000000DE (0xBADC0FFEE, 0xCAFEBABE, 0x00000000, 0x8BADF00D)</p>' +
            '<p style="margin-top:24px">De fysieke geheugendump wordt weggeschreven...&nbsp;' +
            '<span class="cur">_</span></p>' +
            '<p style="margin-top:24px;font-size:13px;opacity:0.85">' +
            '(grapje — herlaad de pagina om alles te herstellen)</p>';
        document.documentElement.appendChild(bsod);
    }

    function run() {
        injectStyle();
        document.documentElement.classList.add('kapot-actief');

        var count = 0;
        var max = 9;
        var timer = setInterval(function () {
            spawnDialog();
            if (++count >= max) {
                clearInterval(timer);
                setTimeout(showBsod, 1400);
            }
        }, 500);
    }

    setTimeout(run, DELAY);
})();
