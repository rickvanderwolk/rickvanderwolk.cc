// Variant: een cluster punten wordt naar een gemeenschappelijk midden getrokken,
// maar krijgt elke frame een willekeurige uitslag, zodat het nooit tot rust komt
// en blijft trillen rond het centrum. De uitslag is groter dan de aantrekking, dus
// er ontstaat een blijvende onrustige beweging. Het geluid is een ruw zwevend
// cluster waarvan het volume onregelmatig schommelt.

let dots = [];

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
  const base = min(width, height);
  for (let i = 0; i < 140; i++) {
    dots.push({ x: random(width), y: random(height), vx: 0, vy: 0 });
  }
}

function draw() {
  const base = min(width, height);
  background(12, 12, 16);

  const cx = width * 0.5, cy = height * 0.5;
  const jit = base * 0.02;

  noStroke();
  for (const d of dots) {
    // zwakke aantrekking naar het midden
    d.vx += (cx - d.x) * 0.002;
    d.vy += (cy - d.y) * 0.002;
    // sterkere willekeurige uitslag
    d.vx += random(-jit, jit);
    d.vy += random(-jit, jit);
    d.vx *= 0.8; d.vy *= 0.8;
    d.x += d.vx; d.y += d.vy;

    fill(160, 170, 195, 150);
    circle(d.x, d.y, base * 0.006);
  }

  if (audio) {
    const lvl = 0.025 + 0.04 * noise(frameCount * 0.03);
    audio.g.gain.setTargetAtTime(lvl, audio.ctx.currentTime, 0.1);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800; lp.connect(g);
  for (const f of [180, 191, 197, 206]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const og = ctx.createGain(); og.gain.value = 0.25; o.connect(og); og.connect(lp); o.start();
  }
  audio = { ctx, master, g };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
