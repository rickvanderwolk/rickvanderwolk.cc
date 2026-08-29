// Variant: een centraal punt stoot op willekeurige intervallen een uitdijende
// ring uit en geeft daarbij een korte toon. Soms verschijnt op datzelfde moment
// een ver punt aan de rand dat ter plaatse blijft en vervaagt zonder te
// reageren. Het centrale punt is warm, de verre punten koel. De toon krijgt een
// galmstaart via een delay met terugkoppeling.

let rings = [];
let echoes = [];
let nextCall = 60;

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
}

function draw() {
  const base = min(width, height);
  background(8, 10, 14);

  const cx = width * 0.5;
  const cy = height * 0.5;

  if (frameCount >= nextCall) {
    rings.push({ r: base * 0.02, a: 150 });
    nextCall = frameCount + floor(random(120, 240));
    if (audio) audio.call();
    if (random(1) < 0.55) {
      const ang = random(TWO_PI);
      const d = base * random(0.32, 0.46);
      echoes.push({ x: cx + cos(ang) * d, y: cy + sin(ang) * d, a: 120 });
    }
  }

  noFill();
  for (const r of rings) {
    r.r += base * 0.005;
    r.a *= 0.97;
    stroke(210, 180, 140, r.a);
    strokeWeight(1.5);
    circle(cx, cy, r.r * 2);
  }
  rings = rings.filter(r => r.a > 3);
  noStroke();

  for (const e of echoes) {
    e.a *= 0.96;
    fill(110, 140, 175, e.a);
    circle(e.x, e.y, base * 0.012);
  }
  echoes = echoes.filter(e => e.a > 4);

  // centraal punt
  fill(220, 190, 150, 230);
  circle(cx, cy, base * 0.02);
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const delay = ctx.createDelay(); delay.delayTime.value = 0.4;
  const fb = ctx.createGain(); fb.gain.value = 0.45;
  delay.connect(fb); fb.connect(delay); delay.connect(master);
  audio = { ctx, master, delay };
  audio.call = function () {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 392;
    const eg = ctx.createGain(); eg.gain.value = 0;
    o.connect(eg); eg.connect(master); eg.connect(delay);
    const now = ctx.currentTime;
    eg.gain.setValueAtTime(0, now);
    eg.gain.linearRampToValueAtTime(0.08, now + 0.02);
    eg.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    o.start(now); o.stop(now + 0.55);
  };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
