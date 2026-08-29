// maas.js — gedeelde datalaag voor de experimenten in maas/lab.
//
// Haalt de dagelijkse afvoer van de Maas op bij Open-Meteo (GloFAS). Geen sleutel,
// geen server: de browser van de bezoeker doet de oproep zelf. De reeks begint op
// 1997 — daarvoor is er niets — en loopt tot vandaag. Dat zijn ruim 10.000 dagen
// van 42 tot 3613 m3/s, met het hoogwater van januari 2011, de Limburgse ramp van
// juli 2021 en de droogte van september 2020 er gewoon in.
//
// De experimenten slaan zelf niets op. Ze rekenen de hele geschiedenis bij elke
// bezoeker opnieuw door, zodat de staat een zuivere functie van de rivier is:
// iedereen ziet hetzelfde, en wat 2011 heeft achtergelaten zit er nog steeds in.

const MAAS = (function () {
  const LAT = 51.775, LON = 5.625;      // hoofdgeul van de Maas bij Lith
  const VANAF = '1997-01-01';           // eerdere jaren zijn leeg in GloFAS
  const CACHE = 'maas-afvoer-v1';

  function vandaag() {
    return new Date().toISOString().slice(0, 10);
  }

  function url() {
    return 'https://flood-api.open-meteo.com/v1/flood'
      + `?latitude=${LAT}&longitude=${LON}`
      + '&daily=river_discharge'
      + `&start_date=${VANAF}&end_date=${vandaag()}`;
  }

  function verwerk(json) {
    const d = json.daily;
    const datums = [];
    const ruw = [];
    for (let i = 0; i < d.time.length; i++) {
      const v = d.river_discharge[i];
      if (v === null || v === undefined) continue;   // gaten overslaan
      datums.push(d.time[i]);
      ruw.push(v);
    }
    const q = Float32Array.from(ruw);

    // positie op een log-schaal tussen de laagste en hoogste stand ooit gemeten.
    // Log, omdat een rivier in verhoudingen leeft: van 100 naar 200 is dezelfde
    // stap als van 1000 naar 2000.
    let laag = Infinity, hoog = -Infinity;
    for (const v of q) { if (v < laag) laag = v; if (v > hoog) hoog = v; }
    const ll = Math.log(laag), lh = Math.log(hoog);
    const p = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) p[i] = (Math.log(q[i]) - ll) / (lh - ll);

    return { datums, q, p, laag, hoog, punt: [json.latitude, json.longitude] };
  }

  async function laad() {
    const sleutel = CACHE + '-' + vandaag();
    try {
      const bewaard = localStorage.getItem(sleutel);
      if (bewaard) return verwerk(JSON.parse(bewaard));
    } catch (e) { /* privémodus of vol: geeft niet, dan gewoon ophalen */ }

    const r = await fetch(url());
    if (!r.ok) throw new Error('rivier onbereikbaar (' + r.status + ')');
    const json = await r.json();

    try {
      for (let i = 0; i < localStorage.length; i++) {      // oude dagen opruimen
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE) && k !== sleutel) localStorage.removeItem(k);
      }
      localStorage.setItem(sleutel, JSON.stringify(json));
    } catch (e) { /* niet kunnen bewaren is geen ramp */ }

    return verwerk(json);
  }

  // Een vignet en een verborgen hud, zoals bij doek. 'd' zet de cijfers aan.
  function scherm(hintTekst) {
    const vignet = document.createElement('div');
    vignet.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:'
      + 'radial-gradient(ellipse at center,rgba(0,0,0,0) 42%,rgba(0,0,0,0.45) 100%)';
    document.body.appendChild(vignet);

    const hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;top:16px;left:16px;display:none;color:'
      + 'rgba(255,255,255,0.6);font:12px/1.5 "Courier New",monospace;white-space:pre;'
      + 'pointer-events:none';
    document.body.appendChild(hud);

    const hint = document.createElement('div');
    hint.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);'
      + 'color:rgba(255,255,255,0.35);font:12px/1.4 "Courier New",monospace;'
      + 'letter-spacing:2px;pointer-events:none;transition:opacity 1.2s';
    hint.textContent = hintTekst || 'd = cijfers';
    document.body.appendChild(hint);
    setTimeout(() => { hint.style.opacity = '0'; }, 6000);

    let aan = false;
    addEventListener('keydown', (e) => {
      if (e.key === 'd') { aan = !aan; hud.style.display = aan ? 'block' : 'none'; }
    });
    return { zet: (t) => { hud.textContent = t; } };
  }

  return { laad, scherm, LAT, LON, VANAF };
})();

if (typeof module !== 'undefined') module.exports = { MAAS };
