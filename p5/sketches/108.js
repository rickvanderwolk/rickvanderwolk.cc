// Variant: een raster van punten wordt verschoven door een traag ruisveld en in
// drie kleurkanalen (rood, groen, blauw) met een onderling verschuivende offset
// getekend, zodat de kanalen niet samenvallen. Een factor `det` uit ruis stuurt
// de grootte van zowel de verschuiving als de kanaal-offset. Een lichte nasleep
// laat het beeld smeren. Het geluid is een drone met trage ontstemming door een
// delay met terugkoppeling.

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
}

function draw() {
  const base = min(width, height);
  background(10, 10, 14, 45);

  const det = 0.3 + 0.7 * noise(frameCount * 0.004);
  const off = base * 0.012 * det;
  const step = base * 0.06;

  blendMode(ADD);
  noStroke();
  for (let y = step; y < height; y += step) {
    for (let x = step; x < width; x += step) {
      const dx = (noise(x * 0.01, y * 0.01, frameCount * 0.006) - 0.5) * base * 0.08 * det;
      const dy = (noise(x * 0.01 + 50, y * 0.01, frameCount * 0.006) - 0.5) * base * 0.08 * det;
      const px = x + dx, py = y + dy;
      const r = base * 0.008;
      fill(255, 40, 40, 150); circle(px - off, py, r * 2);
      fill(40, 255, 40, 150); circle(px, py + off * 0.6, r * 2);
      fill(40, 40, 255, 150); circle(px + off, py - off * 0.4, r * 2);
    }
  }
  blendMode(BLEND);

  if (audio) {
    const now = audio.ctx.currentTime;
    audio.osc.frequency.setTargetAtTime(110 + sin(frameCount * 0.02) * 6 * det, now, 0.1);
    audio.lp.frequency.setTargetAtTime(700 - 400 * det, now, 0.2);
    audio.g.gain.setTargetAtTime(0.05, now, 0.5);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.connect(g);
  const delay = ctx.createDelay(); delay.delayTime.value = 0.37;
  const fb = ctx.createGain(); fb.gain.value = 0.4;
  lp.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(g);
  const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 110; osc.connect(lp); osc.start();
  const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 110.7; osc2.connect(lp); osc2.start();
  audio = { ctx, master, g, lp, osc };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
