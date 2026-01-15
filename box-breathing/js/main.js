const PHASE_DURATION = 4000;

const phases = [
    { side: 'top', label: 'Inhale' },
    { side: 'right', label: 'Hold' },
    { side: 'bottom', label: 'Exhale' },
    { side: 'left', label: 'Hold' }
];

let currentPhase = 0;
let phaseStartTime = 0;

const sides = {
    top: document.querySelector('.side.top'),
    right: document.querySelector('.side.right'),
    bottom: document.querySelector('.side.bottom'),
    left: document.querySelector('.side.left')
};

const label = document.getElementById('label');

function setProgress(side, progress) {
    const el = sides[side];
    if (side === 'top' || side === 'bottom') {
        el.style.setProperty('--w', `${progress * 100}%`);
    } else {
        el.style.setProperty('--h', `${progress * 100}%`);
    }
}

function resetAll() {
    Object.keys(sides).forEach(side => {
        setProgress(side, 0);
    });
}

function animate(timestamp) {
    if (!phaseStartTime) {
        phaseStartTime = timestamp;
    }

    const elapsed = timestamp - phaseStartTime;
    const progress = Math.min(elapsed / PHASE_DURATION, 1);

    const phase = phases[currentPhase];
    label.textContent = phase.label;

    setProgress(phase.side, progress);

    if (progress >= 1) {
        if (currentPhase === phases.length - 1) {
            resetAll();
        }
        currentPhase = (currentPhase + 1) % phases.length;
        phaseStartTime = timestamp;
    }

    requestAnimationFrame(animate);
}

const style = document.createElement('style');
style.textContent = `
    .side.top::after { width: var(--w, 0%); }
    .side.right::after { height: var(--h, 0%); }
    .side.bottom::after { width: var(--w, 0%); }
    .side.left::after { height: var(--h, 0%); }
`;
document.head.appendChild(style);

requestAnimationFrame(animate);
