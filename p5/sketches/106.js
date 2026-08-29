// Variant: een rij cirkels pulseert in fase op een vaste beat. Eén index pulseert
// in tegenfase en krijgt een verticale verschuiving die via een continue cosinus
// op- en afzwelt, zodat die uit de rij wegdrijft en terugkeert. De groep is koel,
// de afwijkende index warmer. Het geluid moduleert mee: de groepstoon en de
// afwijkende toon zwellen in tegenfase, de laatste licht ontstemd.

const period = 2400;

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
}

function draw() {
  const base = min(width, height);
  const t = (frameCount % period) / period;
  background(10, 12, 16);

  const n = max(6, floor(width / (base * 0.1)));
  const cy = height * 0.5;
  const beat = frameCount * 0.06;
  const odd = floor(n / 2);

  noStroke();
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * width / n;
    let ph = beat;
    let yoff = 0;
    let warm = 0;
    if (i === odd) {
      ph += PI;
      yoff = (0.5 - 0.5 * cos(t * TWO_PI)) * base * 0.32;
      warm = 1;
    }
    const pulse = 0.5 + 0.5 * sin(ph);
    const r = base * 0.02 * (0.5 + pulse);
    const c = warm ? color(215, 175, 130) : color(120, 150, 185);
    blendMode(ADD);
    fill(red(c), green(c), blue(c), 50 + 70 * pulse);
    circle(x, cy + yoff, r * 4);
    blendMode(BLEND);
    fill(red(c), green(c), blue(c), 150 + 90 * pulse);
    circle(x, cy + yoff, r * 2);
  }

  if (audio) {
    const now = audio.ctx.currentTime;
    audio.gg.gain.setTargetAtTime(0.02 + 0.03 * (0.5 + 0.5 * sin(beat)), now, 0.05);
    audio.og.gain.setTargetAtTime(0.02 + 0.03 * (0.5 + 0.5 * sin(beat + PI)), now, 0.05);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const gg = ctx.createGain(); gg.gain.value = 0; gg.connect(master);
  for (const f of [220, 277.18, 329.63]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const og = ctx.createGain(); og.gain.value = 0.33; o.connect(og); og.connect(gg); o.start();
  }
  const og = ctx.createGain(); og.gain.value = 0; og.connect(master);
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 247; o.connect(og); o.start();
  audio = { ctx, master, gg, og };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
