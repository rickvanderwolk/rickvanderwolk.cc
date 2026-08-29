// Variant: een raster van grote cellen krijgt een grijswaarde uit een zeer traag
// bewegend ruisveld, met een klein bereik zodat het contrast minimaal blijft. Er
// gebeuren geen verdere gebeurtenissen. Het geluid is een vaste, doffe grondtoon
// met een nauwelijks hoorbare zweving, zonder verloop.

let cell;

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
  cell = max(20, floor(min(width, height) * 0.06));
}

function draw() {
  noStroke();
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const n = noise(x * 0.004, y * 0.004, frameCount * 0.0008);
      const v = 56 + n * 16;
      fill(v, v, v + 2);
      rect(x, y, cell, cell);
    }
  }

  if (audio) {
    audio.g.gain.setTargetAtTime(0.045, audio.ctx.currentTime, 1.0);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; lp.connect(g);
  const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 82; o1.connect(lp); o1.start();
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 82.6; o2.connect(lp); o2.start();
  audio = { ctx, master, g };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
