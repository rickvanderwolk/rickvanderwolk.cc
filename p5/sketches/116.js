// Variant: meerdere verticale lijnen vegen met verschillende, wisselende snelheden
// heen en weer over het beeld; op elke kruising met een vast, onzichtbaar
// rooster van doelen licht kort niets blijvends op. De lijnen keren onregelmatig
// van richting en vinden nooit een rustpunt. Het geluid zijn vegende
// frequentiesweeps die met de lijnen meebewegen.

let scanners = [];

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
  const base = min(width, height);
  for (let i = 0; i < 5; i++) {
    scanners.push({
      x: random(width),
      v: random([-1, 1]) * base * random(0.01, 0.03),
      seed: random(1000),
      flipAt: floor(random(40, 160))
    });
  }
}

function draw() {
  const base = min(width, height);
  background(10, 11, 14);

  for (const s of scanners) {
    s.x += s.v;
    if (s.x < 0 || s.x > width) s.v *= -1;
    // onregelmatige richtingomslag
    if (frameCount % s.flipAt === 0 && random(1) < 0.5) s.v *= -1;

    stroke(150, 165, 195, 120);
    strokeWeight(1.5);
    line(s.x, 0, s.x, height);
    // kort oplichtende markering op de lijn
    noStroke();
    fill(210, 220, 245, 90);
    const my = noise(s.seed + frameCount * 0.02) * height;
    circle(s.x, my, base * 0.012);
  }
  noStroke();

  if (audio) {
    // koppel de eerste scanner aan een vegende toon
    const f = map(scanners[0].x, 0, width, 200, 1400);
    audio.osc.frequency.setTargetAtTime(f, audio.ctx.currentTime, 0.05);
    audio.bp.frequency.setTargetAtTime(f, audio.ctx.currentTime, 0.05);
    audio.g.gain.setTargetAtTime(0.035, audio.ctx.currentTime, 0.3);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.75; master.connect(ctx.destination);
  const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 5; bp.connect(g);
  const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 400; osc.connect(bp); osc.start();
  audio = { ctx, master, g, bp, osc };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
