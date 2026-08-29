// Variant: een vaste schijf op een raster wordt afgesleten. Een vormwaarde
// `shape` (hoog in het midden, naar nul aan de rand) wordt vergeleken met een
// slijtage `E` die via een continue cosinus op- en afzwelt en die per cel hoger
// is aan de windzijde en waar een statische ruiswaarde hoog is. Cellen met
// shape > E zijn vast (warm; koeler naar de wegslijtende rand), de rest is leeg.
// Bij de overgang vast->leeg waait soms een korrel weg in de windrichting. De
// schurende ruisband klinkt luider naarmate de slijtage sneller verandert.

let cells = [];
let grains = [];
let prevWear = 0;
const period = 2700;
const windDir = -0.4;

let audio = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);

  const base = min(width, height);
  const cs = base * 0.03;
  const cols = floor(width / cs);
  const rows = floor(height / cs);
  const ox = (width - cols * cs) / 2;
  const oy = (height - rows * cs) / 2;
  const maxR = base * 0.42;

  cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * cs + cs * 0.5;
      const y = oy + r * cs + cs * 0.5;
      const dN = dist(x, y, width * 0.5, height * 0.5) / maxR;
      const shape = constrain((0.8 - dN) / 0.3, 0, 1);
      cells.push({
        x: x - cs * 0.5, y: y - cs * 0.5, s: cs,
        cx: x, cy: y,
        shape: shape,
        ang: atan2(y - height * 0.5, x - width * 0.5),
        nv: noise(c * 0.18, r * 0.18),
        solid: shape > 0
      });
    }
  }
}

function draw() {
  const base = min(width, height);
  const t = (frameCount % period) / period;
  const wear = 0.5 - 0.5 * cos(t * TWO_PI);
  const dwear = abs(wear - prevWear);
  prevWear = wear;

  background(8, 7, 9);

  const warm = color(210, 130, 78);
  const cool = color(86, 84, 96);

  noStroke();
  for (const cell of cells) {
    const E = wear * (0.55 + 0.5 * cos(cell.ang - windDir) + 0.5 * cell.nv);
    const solid = cell.shape > E;

    if (solid) {
      const edge = constrain((cell.shape - E) * 2.2, 0, 1);
      const col = lerpColor(cool, warm, edge);
      fill(red(col), green(col), blue(col));
      rect(cell.x + 1, cell.y + 1, cell.s - 2, cell.s - 2);
    } else if (cell.solid && wear > prevWearGate(t) && random() < 0.5) {
      // overgang vast -> leeg: korrel losmaken
      grains.push({
        x: cell.cx, y: cell.cy,
        vx: cos(windDir) * base * 0.012 + random(-0.4, 0.4),
        vy: sin(windDir) * base * 0.012 + random(-0.4, 0.4),
        a: 200
      });
      if (audio && random() < 0.12) audio.tick();
    }
    cell.solid = solid;
  }

  // korrels: wind + zwaartekracht, vervagen
  for (const g of grains) {
    g.vy += base * 0.0006;
    g.x += g.vx;
    g.y += g.vy;
    g.a *= 0.96;
    fill(180, 150, 130, g.a);
    circle(g.x, g.y, base * 0.006);
  }
  grains = grains.filter(g => g.a > 6 && g.y < height + 20);

  if (audio) {
    audio.grindG.gain.setTargetAtTime(0.02 + 6.0 * dwear, audio.ctx.currentTime, 0.2);
    audio.dg.gain.setTargetAtTime(0.02 * wear, audio.ctx.currentTime, 0.5);
  }
}

// hulpwaarde: alleen korrels losmaken als de slijtage toeneemt
function prevWearGate(t) {
  return 0.5 - 0.5 * cos((t - 1 / period) * TWO_PI);
}

function startAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);

  // schurende ruisband
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 850; bp.Q.value = 0.8;
  const grindG = ctx.createGain(); grindG.gain.value = 0;
  src.connect(bp); bp.connect(grindG); grindG.connect(master); src.start();

  // lage grondtoon
  const dg = ctx.createGain(); dg.gain.value = 0;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 120;
  const d = ctx.createOscillator(); d.type = 'sine'; d.frequency.value = 43; d.connect(lp); lp.connect(dg); dg.connect(master); d.start();

  audio = { ctx, master, grindG, dg };
  audio.tick = function () {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = random(1400, 2600);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
    const eg = ctx.createGain(); eg.gain.value = 0;
    o.connect(hp); hp.connect(eg); eg.connect(master);
    const now = ctx.currentTime;
    eg.gain.setValueAtTime(0, now);
    eg.gain.linearRampToValueAtTime(0.03, now + 0.002);
    eg.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
    o.start(now); o.stop(now + 0.04);
  };
}

function mousePressed() { startAudio(); }
function keyPressed() { startAudio(); }
function touchStarted() { startAudio(); }
