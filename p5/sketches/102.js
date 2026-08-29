// Variant: veel snel bewegende rechthoeken die van de randen kaatsen, elk met een
// eigen knipperritme zodat ze in en uit beeld flikkeren. Het aantal groeit tot
// een plafond. Aan de randen flitsen waarschuwingsbalken op willekeurige momenten.
// Kleuren komen uit een hard palet. Op een hoge kans per frame klinkt een korte,
// hoge piep met een toonhoogte uit een dissonante reeks.

let items = [];
const cap = 420;
const palette = [
  [255, 40, 40], [255, 230, 40], [255, 255, 255], [255, 120, 0], [60, 220, 255]
];
const pitches = [880, 988, 1320, 1480, 1760, 2093, 2349];

let audio = null;
let started = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
  for (let i = 0; i < 80; i++) items.push(newItem());
}

function drawWarning() {
  background(12);
  const base = min(width, height);
  noStroke();
  fill(230);
  textAlign(CENTER, CENTER);
  textSize(base * 0.034);
  text('Warning: flashing lights that may cause seizures', width / 2, height / 2 - base * 0.03);
  textSize(base * 0.026);
  fill(190);
  text('Click or press any key to begin', width / 2, height / 2 + base * 0.04);
}

function newItem() {
  const base = min(width, height);
  return {
    x: random(width), y: random(height),
    vx: random(-1, 1) * base * 0.02,
    vy: random(-1, 1) * base * 0.02,
    w: base * random(0.01, 0.05),
    h: base * random(0.01, 0.05),
    ci: floor(random(palette.length)),
    rate: floor(random(3, 14)),
    on: random(1) < 0.6 ? 2 : 1,
    ph: floor(random(20))
  };
}

function draw() {
  if (!started) { drawWarning(); return; }

  const base = min(width, height);
  background(10, 10, 12);

  if (items.length < cap && frameCount % 2 === 0) {
    items.push(newItem());
    items.push(newItem());
  }

  noStroke();
  for (const it of items) {
    it.x += it.vx;
    it.y += it.vy;
    if (it.x < 0 || it.x > width) it.vx *= -1;
    if (it.y < 0 || it.y > height) it.vy *= -1;
    if ((frameCount + it.ph) % it.rate < it.on) {
      const c = palette[it.ci];
      fill(c[0], c[1], c[2]);
      rect(it.x, it.y, it.w, it.h);
    }
  }

  // waarschuwingsbalken aan de randen
  if (random(1) < 0.2) {
    fill(255, 40, 40, 200);
    const e = floor(random(4));
    const t = base * 0.02;
    if (e === 0) rect(0, 0, width, t);
    else if (e === 1) rect(0, height - t, width, t);
    else if (e === 2) rect(0, 0, t, height);
    else rect(width - t, 0, t, height);
  }

  if (audio && random(1) < 0.16) {
    audio.beep(pitches[floor(random(pitches.length))]);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
  audio = { ctx, master };
  audio.beep = function (freq) {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
    const eg = ctx.createGain(); eg.gain.value = 0; o.connect(eg); eg.connect(master);
    const now = ctx.currentTime;
    const dur = random(0.04, 0.12);
    eg.gain.setValueAtTime(0, now);
    eg.gain.linearRampToValueAtTime(0.05, now + 0.003);
    eg.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now); o.stop(now + dur + 0.02);
  };
}

function mousePressed() { started = true; startAudio(); }
function keyPressed() { started = true; startAudio(); }
function touchStarted() { started = true; startAudio(); }
