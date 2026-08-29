// Variant: punten driften traag via ruisvelden. Tussen de punten met index >= 1
// worden verbindingslijnen getekend naar nabije buren, met alpha naar rato van
// nabijheid en een factor `pres` die via een continue cosinus op- en afzwelt. Punt
// 0 drift apart in het midden, krijgt nooit een verbinding en houdt een vaste,
// warmere kleur; als `pres` laag is vervaagt de groep en blijft punt 0 over.

let pts = [];
const period = 3000;

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
  for (let i = 0; i < 48; i++) {
    pts.push({ sx: random(1000), sy: random(1000) });
  }
}

function draw() {
  const base = min(width, height);
  const t = (frameCount % period) / period;
  const pres = 0.5 - 0.5 * cos(t * TWO_PI);

  background(10, 12, 18);

  // posities
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (i === 0) {
      p.x = width * 0.5 + (noise(p.sx + frameCount * 0.002) - 0.5) * base * 0.2;
      p.y = height * 0.5 + (noise(p.sy + frameCount * 0.002) - 0.5) * base * 0.2;
    } else {
      p.x = noise(p.sx + frameCount * 0.0016) * width;
      p.y = noise(p.sy + frameCount * 0.0016) * height;
    }
  }

  // verbindingen tussen de groep (zonder punt 0)
  strokeWeight(1);
  for (let i = 1; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = dist(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
      if (d < base * 0.18) {
        stroke(120, 140, 170, 70 * pres * (1 - d / (base * 0.18)));
        line(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
      }
    }
  }
  noStroke();

  // groep
  for (let i = 1; i < pts.length; i++) {
    fill(150, 168, 195, 60 + 140 * pres);
    circle(pts[i].x, pts[i].y, base * 0.012);
  }
  // punt 0
  fill(210, 185, 150, 220);
  circle(pts[0].x, pts[0].y, base * 0.016);

  if (audio) {
    audio.cg.gain.setTargetAtTime(0.05 * pres, audio.ctx.currentTime, 0.4);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  // samenklank van de groep
  const cg = ctx.createGain(); cg.gain.value = 0; cg.connect(master);
  for (const f of [196, 261.63, 329.63]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const og = ctx.createGain(); og.gain.value = 0.33; o.connect(og); og.connect(cg); o.start();
  }
  // losse toon die buiten de samenklank valt
  const lo = ctx.createOscillator(); lo.type = 'sine'; lo.frequency.value = 233;
  const lg = ctx.createGain(); lg.gain.value = 0.04; lo.connect(lg); lg.connect(master); lo.start();

  audio = { ctx, master, cg };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
