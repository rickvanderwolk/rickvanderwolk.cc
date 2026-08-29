// Variant: gekleurde vormen bewegen achter een dempende laag. De vormen worden
// eerst getekend, daarna wordt er elke frame een dekkende grijze rechthoek met
// hoge transparantie overheen gelegd, zodat alles vervlakt en ontkleurt en
// bewegingen sterk gedempt aankomen. Het geluid is gedempt door een lage lowpass.

let blobs = [];

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
  const base = min(width, height);
  for (let i = 0; i < 9; i++) {
    blobs.push({
      sx: random(1000), sy: random(1000),
      r: base * random(0.08, 0.18),
      col: [random(80, 220), random(80, 220), random(80, 220)]
    });
  }
}

function draw() {
  const base = min(width, height);

  // gedempte grondkleur i.p.v. volledige wis
  noStroke();
  fill(60, 60, 64, 60);
  rect(0, 0, width, height);

  for (const b of blobs) {
    const x = noise(b.sx + frameCount * 0.0015) * width;
    const y = noise(b.sy + frameCount * 0.0015) * height;
    fill(b.col[0], b.col[1], b.col[2], 50);
    circle(x, y, b.r * 2);
  }

  // dempende laag eroverheen
  fill(64, 64, 68, 110);
  rect(0, 0, width, height);

  if (audio) {
    audio.g.gain.setTargetAtTime(0.05, audio.ctx.currentTime, 0.6);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 130; lp.connect(g);
  for (const f of [98, 147, 110]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const og = ctx.createGain(); og.gain.value = 0.3; o.connect(og); og.connect(lp); o.start();
  }
  audio = { ctx, master, g };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
