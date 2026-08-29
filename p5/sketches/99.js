// Variant: een raster van cellen dat met een vast tik-interval in willekeurige
// volgorde leegloopt en daarna weer volloopt; de richting wisselt aan de uiteinden.
// Elke tik verandert één cel (gevuld = warm, leeg = vrijwel zwart) en geeft een
// korte klik. De grondtoon zakt in toonhoogte naarmate de gevulde fractie daalt.
// Een draaiende lijn vanuit het midden veegt onverbiddelijk rond.

let cells = [];
let order = [];
let cursor = 0;
let dir = 1;
let tickFrame = 0;
const tickInterval = 12;

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);

  const base = min(width, height);
  const cs = base * 0.05;
  const cols = floor(width / cs);
  const rows = floor(height / cs);
  const ox = (width - cols * cs) / 2;
  const oy = (height - rows * cs) / 2;

  cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x: ox + c * cs, y: oy + r * cs, s: cs, filled: 1, ph: random(TWO_PI) });
    }
  }
  order = shuffle([...Array(cells.length).keys()]);
}

function draw() {
  const base = min(width, height);

  background(6, 5, 8);

  // tik: verander de volgende cel in de geschudde volgorde
  if (frameCount - tickFrame >= tickInterval) {
    tickFrame = frameCount;
    if (cursor >= 0 && cursor < order.length) {
      cells[order[cursor]].filled = dir > 0 ? 0 : 1;
    }
    cursor += dir;
    if (cursor >= order.length) { cursor = order.length - 1; dir = -1; order = shuffle(order); }
    else if (cursor < 0) { cursor = 0; dir = 1; order = shuffle(order); }
    if (audio) audio.tick();
  }

  let filledCount = 0;
  noStroke();
  for (const cell of cells) {
    if (cell.filled) {
      filledCount++;
      const tw = 0.85 + 0.15 * sin(frameCount * 0.04 + cell.ph);
      fill(150 * tw, 96 * tw, 60 * tw);
    } else {
      fill(12, 11, 14);
    }
    rect(cell.x + 1, cell.y + 1, cell.s - 2, cell.s - 2);
  }
  const frac = filledCount / cells.length;

  // draaiende veeglijn
  const ang = frameCount * 0.02;
  stroke(120, 110, 120, 70);
  strokeWeight(1.5);
  line(width * 0.5, height * 0.5,
       width * 0.5 + cos(ang) * base * 0.6,
       height * 0.5 + sin(ang) * base * 0.6);
  noStroke();

  if (audio) {
    audio.dr.frequency.setTargetAtTime(40 + 40 * frac, audio.ctx.currentTime, 0.5);
    audio.dg.gain.setTargetAtTime(0.03, audio.ctx.currentTime, 0.5);
  }
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
  // grondtoon waarvan de toonhoogte met de gevulde fractie meebeweegt
  const dg = ctx.createGain(); dg.gain.value = 0;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
  dg.connect(master); lp.connect(dg);
  const dr = ctx.createOscillator(); dr.type = 'sine'; dr.frequency.value = 70; dr.connect(lp); dr.start();

  audio = { ctx, master, dr, dg };
  audio.tick = function () {
    // korte hoog-gefilterde klik
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1700;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
    const eg = ctx.createGain(); eg.gain.value = 0;
    o.connect(hp); hp.connect(eg); eg.connect(master);
    const now = ctx.currentTime;
    eg.gain.setValueAtTime(0, now);
    eg.gain.linearRampToValueAtTime(0.06, now + 0.002);
    eg.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    o.start(now); o.stop(now + 0.05);
  };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
