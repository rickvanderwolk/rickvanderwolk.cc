// Variant: kort levende sporen verschijnen voortdurend en bewegen met een door
// ruis gestuurde koers, terwijl ze een vervagende lijn achterlaten; ze verdwijnen
// voordat ze een rand bereiken. Steeds zijn er veel tegelijk, elkaar kruisend. De
// kleuren zijn koel-neutraal. Het geluid is een murmelende laag: meerdere zacht
// ontstemde stemmen plus een wandelende ruis-bandpass.

let trails = [];
const cap = 70;

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
}

function newTrail() {
  const base = min(width, height);
  return {
    x: random(width), y: random(height),
    a: random(TWO_PI),
    sp: base * random(0.01, 0.025),
    seed: random(1000),
    pts: [],
    life: floor(random(30, 80)),
    col: 140 + floor(random(60))
  };
}

function draw() {
  const base = min(width, height);
  background(13, 14, 18);

  if (trails.length < cap) {
    for (let i = 0; i < 3; i++) trails.push(newTrail());
  }

  noFill();
  for (const tr of trails) {
    tr.a += (noise(tr.seed + frameCount * 0.02) - 0.5) * 0.6;
    tr.x += cos(tr.a) * tr.sp;
    tr.y += sin(tr.a) * tr.sp;
    tr.pts.push({ x: tr.x, y: tr.y });
    if (tr.pts.length > 24) tr.pts.shift();
    tr.life--;

    stroke(tr.col, tr.col + 10, tr.col + 30, 120);
    strokeWeight(1.2);
    beginShape();
    for (const p of tr.pts) vertex(p.x, p.y);
    endShape();
  }
  trails = trails.filter(tr => tr.life > 0);
  noStroke();

  if (audio) {
    audio.bp.frequency.setTargetAtTime(500 + 400 * noise(frameCount * 0.01), audio.ctx.currentTime, 0.2);
    audio.ng.gain.setTargetAtTime(0.02, audio.ctx.currentTime, 0.4);
    audio.vg.gain.setTargetAtTime(0.03, audio.ctx.currentTime, 0.4);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  // ontstemde stemmen
  const vg = ctx.createGain(); vg.gain.value = 0; vg.connect(master);
  for (const f of [138, 141, 146, 152]) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const og = ctx.createGain(); og.gain.value = 0.25; o.connect(og); og.connect(vg); o.start();
  }
  // wandelende ruis-bandpass
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 3;
  const ng = ctx.createGain(); ng.gain.value = 0;
  src.connect(bp); bp.connect(ng); ng.connect(master); src.start();
  audio = { ctx, master, bp, ng, vg };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
