// Variant: een punt beweegt langs een Lissajous-achtige baan. Een buffer bewaart
// eerdere posities; er worden meerdere kopieën getekend met oplopende
// vertraging, zodat het punt achter zichzelf aan loopt en de kopieën niet
// samenvallen. De vertraging ademt traag, waardoor de naloop soms ver uiteen
// ligt. Het geluid is een toon met trage vibrato door een delay met terugkoppeling.

let trail = [];
const period = 1800;

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
}

function draw() {
  const base = min(width, height);
  background(11, 11, 15);

  const cx = width * 0.5, cy = height * 0.5;
  const a = frameCount * 0.018;
  const x = cx + sin(a * 1.0) * base * 0.34;
  const y = cy + sin(a * 1.41 + 1.0) * base * 0.3;
  trail.push({ x, y });
  if (trail.length > 200) trail.shift();

  const t = (frameCount % period) / period;
  const spread = 0.5 - 0.5 * cos(t * TWO_PI);
  const copies = 5;

  noStroke();
  for (let k = copies; k >= 1; k--) {
    const lag = floor(k * (10 + 30 * spread));
    const idx = trail.length - 1 - lag;
    if (idx < 0) continue;
    const p = trail[idx];
    const hue = lerpColor(color(120, 150, 190), color(200, 120, 150), k / copies);
    fill(red(hue), green(hue), blue(hue), 70 + 120 * (1 - k / copies));
    circle(p.x, p.y, base * 0.03);
  }

  if (audio) {
    const now = audio.ctx.currentTime;
    audio.osc.frequency.setTargetAtTime(160 + sin(frameCount * 0.03) * 14 * (0.3 + spread), now, 0.08);
    audio.g.gain.setTargetAtTime(0.05, now, 0.4);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
  const delay = ctx.createDelay(); delay.delayTime.value = 0.3;
  const fb = ctx.createGain(); fb.gain.value = 0.45;
  delay.connect(fb); fb.connect(delay); delay.connect(g);
  const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 160;
  osc.connect(g); osc.connect(delay); osc.start();
  audio = { ctx, master, g, osc };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
