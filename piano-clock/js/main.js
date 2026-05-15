const AudioCtx = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioCtx();
const master = ctx.createGain();
master.gain.value = 0.55;
master.connect(ctx.destination);

const BLACK = new Set([1, 3, 6, 8, 10]);

function isBlack(midi) {
    return BLACK.has(((midi % 12) + 12) % 12);
}

function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

function playNote(midi, baseGain = 0.22, dur = 1.6) {
    const freq = midiToFreq(midi);
    const t = ctx.currentTime;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(baseGain, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    env.connect(master);

    const harmonics = [[1, 1.0], [2, 0.42], [3, 0.18], [4, 0.09], [5, 0.04]];
    for (const [n, amp] of harmonics) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq * n;
        const g = ctx.createGain();
        g.gain.value = amp;
        osc.connect(g);
        g.connect(env);
        osc.start(t);
        osc.stop(t + dur + 0.1);
    }
}

function makeVoice(baseGain = 0.1) {
    const env = ctx.createGain();
    env.gain.value = 0;
    env.connect(master);

    const harmonics = [[1, 1.0], [2, 0.32], [3, 0.14], [4, 0.06]];
    const oscs = [];
    for (const [n, amp] of harmonics) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 440;
        const g = ctx.createGain();
        g.gain.value = amp;
        osc.connect(g);
        g.connect(env);
        osc.start();
        oscs.push({ osc, n });
    }

    let started = false;

    return {
        setMidi(midi) {
            const freq = midiToFreq(midi);
            const t = ctx.currentTime;
            env.gain.cancelScheduledValues(t);
            if (!started) {
                for (const { osc, n } of oscs) osc.frequency.setValueAtTime(freq * n, t);
                env.gain.setValueAtTime(0, t);
                env.gain.linearRampToValueAtTime(baseGain, t + 0.1);
                started = true;
            } else {
                const dip = 0.08;
                const attack = 0.09;
                env.gain.setValueAtTime(env.gain.value, t);
                env.gain.linearRampToValueAtTime(0.0001, t + dip);
                for (const { osc, n } of oscs) osc.frequency.setValueAtTime(freq * n, t + dip + 0.005);
                env.gain.linearRampToValueAtTime(baseGain, t + dip + attack + 0.01);
            }
        }
    };
}

function buildPiano(container, startMidi, count) {
    const semitones = [];
    for (let i = 0; i < count; i++) semitones.push(startMidi + i);
    const whites = semitones.filter(m => !isBlack(m));
    const blacks = semitones.filter(m => isBlack(m));

    const whiteLayer = document.createElement('div');
    whiteLayer.className = 'white-layer';
    whiteLayer.style.gridTemplateColumns = `repeat(${whites.length}, 1fr)`;

    const keyByMidi = new Map();

    for (const m of whites) {
        const k = document.createElement('div');
        k.className = 'key white';
        k.dataset.midi = m;
        whiteLayer.appendChild(k);
        keyByMidi.set(m, k);
    }

    const blackLayer = document.createElement('div');
    blackLayer.className = 'black-layer';
    const wWidth = 100 / whites.length;
    const bWidth = wWidth * 0.62;

    for (const m of blacks) {
        const idx = whites.findIndex(w => w > m);
        if (idx <= 0) continue;
        const k = document.createElement('div');
        k.className = 'key black';
        k.dataset.midi = m;
        k.style.left = `calc(${idx * wWidth}% - ${bWidth / 2}%)`;
        k.style.width = `${bWidth}%`;
        blackLayer.appendChild(k);
        keyByMidi.set(m, k);
    }

    container.appendChild(whiteLayer);
    container.appendChild(blackLayer);

    for (const [m, k] of keyByMidi) {
        k.addEventListener('click', (e) => {
            e.stopPropagation();
            ensureAudio();
            playNote(m, 0.25, 1.4);
            flash(k, 500);
        });
    }

    return { startMidi, count, keyByMidi };
}

function flash(key, dur = 600) {
    key.classList.add('active');
    setTimeout(() => key.classList.remove('active'), dur);
}

const hoursPiano   = buildPiano(document.getElementById('hours-piano'),   36, 24);
const minutesPiano = buildPiano(document.getElementById('minutes-piano'), 36, 60);
const secondsPiano = buildPiano(document.getElementById('seconds-piano'), 36, 60);

const hourVoice = makeVoice(0.1);
const minuteVoice = makeVoice(0.08);
const secondVoice = makeVoice(0.06);

const currentKey = { h: null, m: null, s: null };

function setCurrent(piano, value, unit) {
    const midi = piano.startMidi + value;
    const k = piano.keyByMidi.get(midi);
    if (currentKey[unit] && currentKey[unit] !== k) {
        currentKey[unit].classList.remove('current');
    }
    if (k) k.classList.add('current');
    currentKey[unit] = k;
    return { midi, k };
}

let lastH = -1, lastM = -1, lastS = -1;
let audioReady = false;

function ensureAudio() {
    if (audioReady) return;
    if (ctx.state === 'suspended') ctx.resume();
    audioReady = true;
}

function tick() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();

    if (h !== lastH) {
        const { midi, k } = setCurrent(hoursPiano, h, 'h');
        if (audioReady) { hourVoice.setMidi(midi); if (lastH !== -1) flash(k, 1200); }
        lastH = h;
    }
    if (m !== lastM) {
        const { midi, k } = setCurrent(minutesPiano, m, 'm');
        if (audioReady) { minuteVoice.setMidi(midi); if (lastM !== -1) flash(k, 800); }
        lastM = m;
    }
    if (s !== lastS) {
        const { midi, k } = setCurrent(secondsPiano, s, 's');
        if (audioReady) { secondVoice.setMidi(midi); if (lastS !== -1) flash(k, 350); }
        lastS = s;
    }
}

tick();

function scheduleTick() {
    const now = Date.now();
    const next = 1000 - (now % 1000);
    setTimeout(() => {
        tick();
        scheduleTick();
    }, next + 5);
}
scheduleTick();

const startBtn = document.getElementById('start');
startBtn.addEventListener('click', () => {
    ensureAudio();
    startBtn.classList.add('hidden');
    const now = new Date();
    hourVoice.setMidi(36 + now.getHours());
    minuteVoice.setMidi(36 + now.getMinutes());
    secondVoice.setMidi(36 + now.getSeconds());
});
