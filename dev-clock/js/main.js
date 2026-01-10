const clockElement = document.getElementById('clock');
const clickToStart = document.getElementById('click-to-start');

let audioContext = null;
let audioEnabled = false;
let lastChimeMinute = -1;

// Enable audio on first click
document.addEventListener('click', () => {
    if (!audioEnabled) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioEnabled = true;
        clickToStart.classList.add('hidden');
    }
});

// Generate beep sound
function playBeep(frequency = 440, duration = 0.15) {
    if (!audioContext || !audioEnabled) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + duration * 0.5);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Play chime sequence
function playChimeSequence(count) {
    const baseFreq = 880;

    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            playBeep(baseFreq, 0.1);
            setTimeout(() => playBeep(baseFreq * 0.75, 0.15), 100);
        }, i * 500);
    }
}

// Get formatted time string
function getTimeString() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Get 12-hour format for chimes
function get12Hour(hour) {
    if (hour === 0) return 12;
    if (hour > 12) return hour - 12;
    return hour;
}

// Check for chime
function checkChime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    if (lastChimeMinute === minutes) return;

    // Full hour
    if (minutes === 0 && seconds < 2) {
        lastChimeMinute = minutes;
        playChimeSequence(get12Hour(hours));
    }
    // Half hour
    else if (minutes === 30 && seconds < 2) {
        lastChimeMinute = minutes;
        playChimeSequence(1);
    }
}

// Update clock display
function updateClock() {
    clockElement.textContent = getTimeString();
    checkChime();
}

updateClock();
setInterval(updateClock, 100);
