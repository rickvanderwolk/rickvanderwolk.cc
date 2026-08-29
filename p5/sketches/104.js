// Variant: een raster van korte segmenten waarvan positie en hoek elke frame met
// grote willekeurige uitslagen verspringen, met wisselende hoog-contrast kleuren.
// Op willekeurige momenten wordt een enkel frame een verschil-blend (inversie)
// getekend. Onder een cluster van dicht bijeen liggende dissonante frequenties
// klinken op korte willekeurige intervallen harde stoten.

let cell;
let nextStab = 30;

let audio = null;
let started = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
  cell = max(16, floor(min(width, height) * 0.045));
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

function draw() {
  if (!started) { drawWarning(); return; }

  const base = min(width, height);

  background(frameCount % 6 < 3 ? 10 : 16);

  const j = base * 0.02;
  strokeWeight(max(1.5, base * 0.004));
  for (let y = cell; y < height; y += cell) {
    for (let x = cell; x < width; x += cell) {
      const ox = random(-j, j);
      const oy = random(-j, j);
      const a = random(TWO_PI);
      const len = cell * 0.45;
      const r = random(1) < 0.5 ? 255 : 40;
      const g = random(1) < 0.5 ? 255 : 40;
      const b = random(1) < 0.5 ? 255 : 40;
      stroke(r, g, b, 220);
      line(x + ox - cos(a) * len, y + oy - sin(a) * len,
           x + ox + cos(a) * len, y + oy + sin(a) * len);
    }
  }
  noStroke();

  if (frameCount >= nextStab) {
    nextStab = frameCount + floor(random(8, 40));
    blendMode(DIFFERENCE);
    fill(255);
    rect(0, 0, width, height);
    blendMode(BLEND);
    if (audio) audio.stab(random([233, 247, 466, 740, 988]));
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(master);
  // dissonant cluster
  for (const f of [220, 233, 246, 261]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const og = ctx.createGain(); og.gain.value = 0.05; o.connect(og); og.connect(lp); o.start();
  }
  audio = { ctx, master };
  audio.stab = function (freq) {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
    const eg = ctx.createGain(); eg.gain.value = 0; o.connect(eg); eg.connect(master);
    const now = ctx.currentTime;
    eg.gain.setValueAtTime(0, now);
    eg.gain.linearRampToValueAtTime(0.08, now + 0.002);
    eg.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    o.start(now); o.stop(now + 0.08);
  };
}

function mousePressed() { started = true; startAudio(); }
function keyPressed() { started = true; startAudio(); }
function touchStarted() { started = true; startAudio(); }
