// Variant: een kloppende bron die uitdooft. Binnen elke cyclus worden in de
// eerste helft pulsen uitgestoten met een interval dat geleidelijk groeit en een
// sterkte die afneemt; elke puls zet een warme ring uit en laat een centrale
// gloed oplichten die tussen pulsen uitdooft. In de tweede helft stoppen de
// pulsen en blijft alleen een flauwe koele ring op de plek van de bron, met
// eenmalig een zwakke ring zonder geluid.

let rings = [];
let glow = 0;
let prevLf = 0;
let nextBeatAt = 0;
let phantomDone = false;
const period = 3000;

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
}

function draw() {
  const base = min(width, height);
  const lf = frameCount % period;
  if (lf < prevLf) { nextBeatAt = 0; rings = []; phantomDone = false; }
  prevLf = lf;

  const activeEnd = period * 0.5;
  const present = lf < activeEnd;

  // puls inplannen met groeiend interval en afnemende sterkte
  if (lf >= nextBeatAt && present) {
    const prog = lf / activeEnd;
    const strength = pow(1 - prog, 0.8);
    glow = max(glow, 0.6 + 0.4 * strength);
    rings.push({ r: base * 0.05, a: 30 + 120 * strength, warm: 1 });
    if (audio) audio.beat(strength);
    nextBeatAt = lf + lerp(46, 165, pow(prog, 1.4));
  }

  // eenmalige zwakke ring zonder geluid in de stille helft
  if (!present && !phantomDone && lf > period * 0.72) {
    rings.push({ r: base * 0.05, a: 26, warm: 0.2 });
    phantomDone = true;
  }

  background(7, 6, 9);

  const cx = width * 0.5;
  const cy = height * 0.5;

  noFill();
  for (const r of rings) {
    r.r += base * 0.004;
    r.a *= 0.965;
    const c = lerpColor(color(80, 84, 96), color(232, 150, 110), r.warm);
    stroke(red(c), green(c), blue(c), r.a);
    strokeWeight(2);
    circle(cx, cy, r.r * 2);
  }
  rings = rings.filter(r => r.a > 3);
  noStroke();

  // centrale gloed klopt op de puls en dooft ertussen
  glow *= 0.93;
  const gc = lerpColor(color(60, 60, 72), color(255, 180, 130), glow);
  blendMode(ADD);
  fill(red(gc), green(gc), blue(gc), 80 * glow);
  circle(cx, cy, base * 0.3 * glow);
  blendMode(BLEND);
  fill(red(gc), green(gc), blue(gc), 50 + 170 * glow);
  circle(cx, cy, base * 0.04 * (0.5 + glow));

  // vaste flauwe koele ring op de plek van de bron na het stoppen
  if (!present) {
    stroke(70, 76, 92, 40);
    strokeWeight(1);
    noFill();
    circle(cx, cy, base * 0.1);
    noStroke();
  }

  if (audio) {
    audio.dg.gain.setTargetAtTime(present ? 0.022 : 0.032, audio.ctx.currentTime, 1.0);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
  // lage grondtoon
  const dg = ctx.createGain(); dg.gain.value = 0;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 130;
  dg.connect(master); lp.connect(dg);
  const d = ctx.createOscillator(); d.type = 'sine'; d.frequency.value = 41; d.connect(lp); d.start();

  audio = { ctx, master, dg };
  audio.beat = function (strength) {
    const now = ctx.currentTime;
    const mk = (freq, t0, dur, peak) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      const eg = ctx.createGain(); eg.gain.value = 0; o.connect(eg); eg.connect(master);
      o.frequency.setValueAtTime(freq * 1.6, now + t0);
      o.frequency.exponentialRampToValueAtTime(freq, now + t0 + 0.06);
      eg.gain.setValueAtTime(0, now + t0);
      eg.gain.linearRampToValueAtTime(peak * strength, now + t0 + 0.01);
      eg.gain.exponentialRampToValueAtTime(0.0001, now + t0 + dur);
      o.start(now + t0); o.stop(now + t0 + dur + 0.05);
    };
    mk(62, 0, 0.28, 0.5);
    mk(48, 0.16, 0.34, 0.42);
  };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
