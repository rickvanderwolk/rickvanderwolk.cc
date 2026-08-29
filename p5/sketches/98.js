// Variant: twee punten draaien tegenover elkaar om een gemeenschappelijk midden,
// verbonden door een lijn. Een factor `presB` houdt de tweede punt en de lijn
// volledig zichtbaar in de eerste fase, laat ze daarna uitfaden naar nul, en
// brengt ze pas laat in de cyclus traag terug. Op de plek van de verdwenen punt
// blijft een koele ring meedraaien; de overgebleven punt verkoelt licht.

let angle = 0;
let prevPresB = 1;
const period = 3000;

let audio = null;

function presBAt(a) {
  if (a < 0.45) return 1;
  if (a < 0.52) return 1 - (a - 0.45) / 0.07;
  if (a < 0.92) return 0;
  return (a - 0.92) / 0.08;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
}

function draw() {
  const base = min(width, height);
  const a = (frameCount % period) / period;
  const presB = presBAt(a);

  if (prevPresB >= 0.5 && presB < 0.5 && audio) audio.part();
  prevPresB = presB;

  // lichte nasleep voor zwakke baan-echo
  background(7, 6, 10, 80);

  angle += 0.012;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const R = base * 0.17;
  const ax = cx + cos(angle) * R, ay = cy + sin(angle) * R;
  const bx = cx + cos(angle + PI) * R, by = cy + sin(angle + PI) * R;

  const warm = color(235, 160, 120);

  // verbindingslijn, alpha volgt presB
  stroke(red(warm), green(warm), blue(warm), 110 * presB);
  strokeWeight(1.5);
  line(ax, ay, bx, by);
  noStroke();

  // overgebleven punt: verkoelt licht als de ander weg is
  const aCol = lerpColor(color(120, 110, 120), warm, 0.55 + 0.45 * presB);
  blendMode(ADD);
  fill(red(aCol), green(aCol), blue(aCol), 70);
  circle(ax, ay, base * 0.1);
  blendMode(BLEND);
  fill(red(aCol), green(aCol), blue(aCol), 220);
  circle(ax, ay, base * 0.03);

  // tweede punt: zichtbaar naar rato van presB
  if (presB > 0.02) {
    blendMode(ADD);
    fill(red(warm), green(warm), blue(warm), 70 * presB);
    circle(bx, by, base * 0.1 * presB);
    blendMode(BLEND);
    fill(red(warm), green(warm), blue(warm), 220 * presB);
    circle(bx, by, base * 0.03 * (0.4 + 0.6 * presB));
  }

  // koele ring op de meedraaiende lege plek
  if (presB < 0.6) {
    stroke(74, 80, 96, 70 * (1 - presB));
    strokeWeight(1);
    noFill();
    circle(bx, by, base * 0.05);
    noStroke();
  }

  if (audio) {
    audio.tb.gain.setTargetAtTime(0.05 * presB, audio.ctx.currentTime, 0.3);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(master);

  // lage grondtoon
  const d = ctx.createOscillator(); d.type = 'sine'; d.frequency.value = 55;
  const dg = ctx.createGain(); dg.gain.value = 0.04; d.connect(dg); dg.connect(lp); d.start();
  // blijvende toon
  const a = ctx.createOscillator(); a.type = 'sine'; a.frequency.value = 220;
  const ta = ctx.createGain(); ta.gain.value = 0.05; a.connect(ta); ta.connect(lp); a.start();
  // toon die meefadet met presB
  const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = 330;
  const tb = ctx.createGain(); tb.gain.value = 0; b.connect(tb); tb.connect(lp); b.start();

  audio = { ctx, master, tb };
  audio.part = function () {
    const now = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    const eg = ctx.createGain(); eg.gain.value = 0; o.connect(eg); eg.connect(master);
    o.frequency.setValueAtTime(330, now);
    o.frequency.exponentialRampToValueAtTime(120, now + 1.2);
    eg.gain.setValueAtTime(0, now);
    eg.gain.linearRampToValueAtTime(0.06, now + 0.05);
    eg.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    o.start(now); o.stop(now + 1.5);
  };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
