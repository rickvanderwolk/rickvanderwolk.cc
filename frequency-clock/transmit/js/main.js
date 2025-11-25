let osc;
let started = false;
let currentPhase = 'silence';

// Frequency bands (non-overlapping, wider steps for reliability)
// Hours (0-23): 300Hz - 760Hz (steps of 20Hz)
// Minutes (0-59): 900Hz - 2080Hz (steps of 20Hz)
// Seconds (0-59): 2200Hz - 3380Hz (steps of 20Hz)

const HOUR_BASE = 300;
const MINUTE_BASE = 900;
const SECOND_BASE = 2200;
const STEP = 20;

// Timing: longer tones with gaps for cleaner detection
const TONE_DURATION = 300;
const GAP_DURATION = 50;
const CYCLE_LENGTH = (TONE_DURATION + GAP_DURATION) * 3 + 200; // ~1250ms per cycle

let cycleStart = 0;

function setup() {
    createCanvas(windowWidth, windowHeight);
    textAlign(CENTER, CENTER);
    textFont('monospace');
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function draw() {
    background(0);

    if (!started) {
        fill(255);
        textSize(32);
        text('Click to start transmitting', width / 2, height / 2);
        return;
    }

    const now = Date.now();
    const date = new Date();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    // Calculate position in cycle
    const cyclePos = now % CYCLE_LENGTH;

    // Determine current phase and frequency
    let freq = 0;
    const slot1End = TONE_DURATION;
    const gap1End = slot1End + GAP_DURATION;
    const slot2End = gap1End + TONE_DURATION;
    const gap2End = slot2End + GAP_DURATION;
    const slot3End = gap2End + TONE_DURATION;

    if (cyclePos < slot1End) {
        currentPhase = 'hour';
        freq = HOUR_BASE + (hours * STEP);
    } else if (cyclePos < gap1End) {
        currentPhase = 'gap';
        freq = 0;
    } else if (cyclePos < slot2End) {
        currentPhase = 'minute';
        freq = MINUTE_BASE + (minutes * STEP);
    } else if (cyclePos < gap2End) {
        currentPhase = 'gap';
        freq = 0;
    } else if (cyclePos < slot3End) {
        currentPhase = 'second';
        freq = SECOND_BASE + (seconds * STEP);
    } else {
        currentPhase = 'silence';
        freq = 0;
    }

    osc.freq(freq);

    // Display
    const timeStr = pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);

    fill(255);
    textSize(64);
    text(timeStr, width / 2, height / 2 - 100);

    // Show current phase
    textSize(24);
    fill(currentPhase === 'gap' || currentPhase === 'silence' ? 50 : 100);
    text('Transmitting: ' + currentPhase.toUpperCase(), width / 2, height / 2);

    // Show frequency
    textSize(20);
    fill(0, 255, 255);
    text(freq > 0 ? freq + ' Hz' : '---', width / 2, height / 2 + 40);

    // Progress bar for cycle
    const progress = cyclePos / CYCLE_LENGTH;
    noFill();
    stroke(50);
    strokeWeight(2);
    rect(width / 2 - 200, height / 2 + 80, 400, 20);

    fill(0, 255, 255);
    noStroke();
    rect(width / 2 - 200, height / 2 + 80, 400 * progress, 20);

    // Phase indicators
    textSize(12);
    fill(100);
    const barY = height / 2 + 115;
    text('H', width / 2 - 200 + (slot1End / CYCLE_LENGTH) * 200, barY);
    text('M', width / 2 - 200 + ((gap1End + slot2End) / 2 / CYCLE_LENGTH) * 400, barY);
    text('S', width / 2 - 200 + ((gap2End + slot3End) / 2 / CYCLE_LENGTH) * 400, barY);

    // Visual indicator
    if (freq > 0) {
        noFill();
        stroke(0, 255, 255, 150);
        strokeWeight(3);
        const radius = map(freq, 300, 3400, 30, 150);
        circle(width / 2, height / 2 + 200, radius);
        circle(width / 2, height / 2 + 200, radius * 0.6);
    }
}

function mousePressed() {
    if (!started) {
        userStartAudio();
        osc = new p5.Oscillator('sine');
        osc.amp(0.5);
        osc.start();
        started = true;
    }
}

function touchStarted() {
    mousePressed();
    return false;
}

function pad(num) {
    return num.toString().padStart(2, '0');
}
