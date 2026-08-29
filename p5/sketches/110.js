// Variant: het beeld is verticaal gespiegeld, maar de rechterhelft loopt op een
// vertraagde kopie van de bewegingsparameter en met een licht andere kleur, zodat
// de twee helften bijna maar niet helemaal overeenkomen. Een ruisveld vormt
// laag-contrast vegen die in elke helft net afwijken. Het geluid zijn twee bijna
// gelijke tonen waarvan er één traag wegloopt in toonhoogte.

let cell;

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
  cell = max(10, floor(min(width, height) * 0.03));
}

function draw() {
  const base = min(width, height);
  background(10, 11, 14);

  const half = width / 2;
  noStroke();
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < half; x += cell) {
      // linkerhelft op tijd t, rechterhelft op vertraagde tijd
      const nL = noise(x * 0.012, y * 0.012, frameCount * 0.006);
      const nR = noise(x * 0.012, y * 0.012, (frameCount - 40) * 0.006);
      const vL = max(0, nL - 0.5) * 2;
      const vR = max(0, nR - 0.5) * 2;
      fill(70 * vL, 90 * vL, 120 * vL);
      rect(x, y, cell, cell);
      fill(110 * vR, 80 * vR, 90 * vR);
      rect(width - x - cell, y, cell, cell);
    }
  }

  if (audio) {
    audio.g.gain.setTargetAtTime(0.05, audio.ctx.currentTime, 0.5);
    audio.o2.frequency.setTargetAtTime(165 + 10 * sin(frameCount * 0.005), audio.ctx.currentTime, 0.4);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(g);
  const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 164; o1.connect(lp); o1.start();
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 165; o2.connect(lp); o2.start();
  audio = { ctx, master, g, o2 };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
