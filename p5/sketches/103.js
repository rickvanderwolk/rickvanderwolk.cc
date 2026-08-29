// Variant: een flits met een interval dat binnen elke cyclus afneemt (tempo loopt
// op) en bij de wrap terugspringt naar traag. Elke flits zet een volvlaks
// helderheid die direct weer wegvalt, en een roterende balk waarvan de
// hoeksnelheid met het tempo meegroeit. Een toon stijgt in toonhoogte met de
// voortgang; elke flits geeft een korte klik.

const period = 600;
let prevLf = 0;
let nextPulseAt = 0;
let pulse = 0;
let ang = 0;

let audio = null;
let started = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
}

function drawWarning() {
  background(12);
  const base = min(width, height);
  noStroke();
  fill(230);
  textAlign(CENTER, CENTER);
  textSize(base * 0.034);
  text('Warning: flashing lights that may cause seizures', width / 2, height / 2 - base * 0.03);
  textSize(base * 0.026);
  fill(190);
  text('Click or press any key to begin', width / 2, height / 2 + base * 0.04);
}

function draw() {
  if (!started) { drawWarning(); return; }

  const base = min(width, height);
  const lf = frameCount % period;
  if (lf < prevLf) nextPulseAt = 0;
  prevLf = lf;

  const prog = lf / period;
  const interval = lerp(26, 3, pow(prog, 1.5));

  if (lf >= nextPulseAt) {
    pulse = 1;
    nextPulseAt = lf + interval;
    if (audio) audio.click(160 + 1300 * prog);
  }
  pulse *= 0.55;

  background(lerp(12, 235, pulse), lerp(12, 235, pulse), lerp(14, 240, pulse));

  ang += lerp(0.04, 0.7, prog);
  push();
  translate(width * 0.5, height * 0.5);
  rotate(ang);
  noStroke();
  fill(pulse > 0.4 ? 20 : 230);
  rect(-base * 0.5, -base * 0.012, base, base * 0.024);
  pop();

  if (audio) {
    audio.tone.frequency.setTargetAtTime(110 + 760 * prog, audio.ctx.currentTime, 0.05);
    audio.tg.gain.setTargetAtTime(0.03 + 0.04 * prog, audio.ctx.currentTime, 0.1);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
  const tone = ctx.createOscillator(); tone.type = 'sawtooth'; tone.frequency.value = 110;
  const tg = ctx.createGain(); tg.gain.value = 0; tone.connect(tg); tg.connect(master); tone.start();
  audio = { ctx, master, tone, tg };
  audio.click = function (freq) {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
    const eg = ctx.createGain(); eg.gain.value = 0; o.connect(eg); eg.connect(master);
    const now = ctx.currentTime;
    eg.gain.setValueAtTime(0, now);
    eg.gain.linearRampToValueAtTime(0.06, now + 0.002);
    eg.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    o.start(now); o.stop(now + 0.05);
  };
}

function mousePressed() { started = true; startAudio(); }
function keyPressed() { started = true; startAudio(); }
function touchStarted() { started = true; startAudio(); }
