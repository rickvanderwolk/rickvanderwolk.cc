// Variant: op een vast interval verschijnt kort een vorm op een willekeurige plek,
// telkens met exact dezelfde grijswaarde, grootte en korte duur, zonder variatie
// in helderheid of kleur. Het regelmatige geluid is een korte, identieke toon per
// gebeurtenis, gelijk in volume en toonhoogte. Geen opbouw of nadruk.

let nextEvent = 30;
let marks = [];
const interval = 45;

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
}

function draw() {
  const base = min(width, height);
  background(20, 20, 22);

  if (frameCount >= nextEvent) {
    marks.push({ x: random(width * 0.1, width * 0.9), y: random(height * 0.1, height * 0.9), life: 18 });
    nextEvent = frameCount + interval;
    if (audio) audio.blip();
  }

  noStroke();
  for (const m of marks) {
    fill(120);
    rect(m.x - base * 0.03, m.y - base * 0.03, base * 0.06, base * 0.06);
    m.life--;
  }
  marks = marks.filter(m => m.life > 0);
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
  audio = { ctx, master };
  audio.blip = function () {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 330;
    const eg = ctx.createGain(); eg.gain.value = 0; o.connect(eg); eg.connect(master);
    const now = ctx.currentTime;
    eg.gain.setValueAtTime(0, now);
    eg.gain.linearRampToValueAtTime(0.05, now + 0.005);
    eg.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    o.start(now); o.stop(now + 0.15);
  };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
