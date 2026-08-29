// Variant: rechtopstaande filamenten van korte segmenten, die wiegen op een
// ademhalingsfactor. De fase-toename en de amplitude van die ademhaling nemen af
// met de tijd, zodat de beweging vertraagt en bijna stilvalt. Op willekeurige
// intervallen breekt een filament op een willekeurige knoop: het deel boven de
// breuk wordt een vallend, roterend en vervagend fragment, en het filament wordt
// korter. Een adem-ruisband zwelt mee en vertraagt; per breuk klinkt een droge knap.

let filaments = [];
let fragments = [];
let breathPhase = 0;
let nextBreak = 120;

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);

  const base = min(width, height);
  const seg = base * 0.03;
  const n = max(10, floor(width / (base * 0.045)));
  for (let i = 0; i < n; i++) {
    const m = floor(random(8, 16));
    filaments.push({
      bx: (i + 0.5) * (width / n) + random(-base * 0.01, base * 0.01),
      by: height * 0.98,
      seg: seg,
      m: m,
      breakAt: m,
      curve: random(-0.5, 0.5),
      sway: random(TWO_PI),
      col: 150 + floor(random(70))
    });
  }
}

function pointAt(f, i, amp) {
  // rustpositie met lichte kromming + wieging die met de hoogte toeneemt
  const h = i / f.m;
  const rx = f.bx + f.curve * f.seg * i * 0.4;
  const sway = sin(breathPhase + f.sway + i * 0.18) * amp * h * f.seg * 1.6;
  return { x: rx + sway, y: f.by - i * f.seg };
}

function draw() {
  const base = min(width, height);

  background(18, 17, 15);

  // ademhaling: fase-stap en amplitude lopen terug met de tijd
  const slow = 1 / (1 + frameCount * 0.0004);
  breathPhase += 0.02 * slow;
  const breath = sin(breathPhase);
  const amp = 0.4 * slow;

  // breuk inplannen
  if (frameCount >= nextBreak) {
    breakOne();
    nextBreak = frameCount + floor(random(50, 200));
  }

  // filamenten
  for (const f of filaments) {
    if (f.breakAt < 1) continue;
    noFill();
    for (let i = 0; i < f.breakAt; i++) {
      const a = pointAt(f, i, amp);
      const b = pointAt(f, i + 1, amp);
      if (i + 1 > f.breakAt) break;
      const taper = 1 - i / f.m;
      stroke(f.col, f.col - 6, f.col - 30, 150 + 60 * taper);
      strokeWeight(max(0.6, base * 0.003 * taper));
      line(a.x, a.y, b.x, b.y);
    }
  }
  noStroke();

  // vallende fragmenten
  for (const fr of fragments) {
    fr.vy += base * 0.0004;
    fr.px += fr.vx;
    fr.py += fr.vy;
    fr.ang += fr.spin;
    fr.a *= 0.99;
    push();
    translate(fr.px, fr.py);
    rotate(fr.ang);
    noFill();
    stroke(120, 120, 128, fr.a);
    strokeWeight(max(0.6, base * 0.0022));
    beginShape();
    for (const p of fr.pts) vertex(p.x, p.y);
    endShape();
    pop();
  }
  fragments = fragments.filter(fr => fr.a > 6 && fr.py < height + base * 0.3);

  if (audio) {
    const env = (0.4 + 0.6 * (0.5 + 0.5 * breath)) * slow;
    audio.bp.frequency.setTargetAtTime(180 + 700 * (0.5 + 0.5 * breath) * slow, audio.ctx.currentTime, 0.3);
    audio.bg.gain.setTargetAtTime(0.05 * env, audio.ctx.currentTime, 0.3);
  }
}

function breakOne() {
  const cands = filaments.filter(f => f.breakAt > 2);
  if (cands.length === 0) return;
  const f = cands[floor(random(cands.length))];
  const k = floor(random(1, f.breakAt - 1));

  // fragment opbouwen uit de huidige posities boven de breuk
  const amp = 0.4 / (1 + frameCount * 0.0004);
  const pivot = pointAt(f, k, amp);
  const pts = [];
  for (let i = k; i <= f.breakAt; i++) {
    const p = pointAt(f, i, amp);
    pts.push({ x: p.x - pivot.x, y: p.y - pivot.y });
  }
  fragments.push({
    px: pivot.x, py: pivot.y, pts: pts,
    vx: random(-0.3, 0.3), vy: random(0.2, 0.6),
    ang: 0, spin: random(-0.03, 0.03), a: 200
  });
  f.breakAt = k;
  if (audio) audio.crack();
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);

  // adem-ruisband
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 300; bp.Q.value = 0.7;
  const bg = ctx.createGain(); bg.gain.value = 0;
  src.connect(bp); bp.connect(bg); bg.connect(master); src.start();

  audio = { ctx, master, bp, bg };
  audio.crack = function () {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = random(900, 1800);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 800;
    const eg = ctx.createGain(); eg.gain.value = 0;
    o.connect(hp); hp.connect(eg); eg.connect(master);
    const now = ctx.currentTime;
    eg.gain.setValueAtTime(0, now);
    eg.gain.linearRampToValueAtTime(0.05, now + 0.002);
    eg.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    o.start(now); o.stop(now + 0.06);
  };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
