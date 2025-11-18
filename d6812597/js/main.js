// Create hour markers around the entire clock
function createHourMarkers() {
    const markersGroup = document.getElementById('hour-markers');

    for (let i = 0; i < 12; i++) {
        const angle = (i * 30) * (Math.PI / 180);
        const x1 = 150 + Math.cos(angle - Math.PI / 2) * 130;
        const y1 = 150 + Math.sin(angle - Math.PI / 2) * 130;
        const x2 = 150 + Math.cos(angle - Math.PI / 2) * 120;
        const y2 = 150 + Math.sin(angle - Math.PI / 2) * 120;

        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        marker.setAttribute('x1', x1);
        marker.setAttribute('y1', y1);
        marker.setAttribute('x2', x2);
        marker.setAttribute('y2', y2);
        marker.setAttribute('stroke', '#333');
        marker.setAttribute('stroke-width', '3');
        marker.setAttribute('stroke-linecap', 'round');

        markersGroup.appendChild(marker);
    }
}

// Create hour numbers
function createHourNumbers() {
    const numbersGroup = document.getElementById('hour-numbers');

    for (let i = 1; i <= 12; i++) {
        const angle = ((i * 30) - 90) * (Math.PI / 180);
        const x = 150 + Math.cos(angle) * 105;
        const y = 150 + Math.sin(angle) * 105;

        const number = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        number.setAttribute('x', x);
        number.setAttribute('y', y);
        number.setAttribute('text-anchor', 'middle');
        number.setAttribute('dominant-baseline', 'middle');
        number.setAttribute('fill', '#333');
        number.setAttribute('font-size', '20');
        number.setAttribute('font-weight', 'bold');
        number.setAttribute('font-family', 'sans-serif');
        number.textContent = i;

        numbersGroup.appendChild(number);
    }
}

// Hand masses (relative weights)
const HOUR_MASS = 3;    // Heaviest
const MINUTE_MASS = 2;  // Medium
const SECOND_MASS = 1;  // Lightest

// Hand lengths (distance from center to tip)
const HOUR_LENGTH = 60;   // 150 - 90
const MINUTE_LENGTH = 80; // 150 - 70
const SECOND_LENGTH = 90; // 150 - 60

// Smooth rotation tracking
let currentClockRotation = 0;
let targetClockRotation = 0;

// Debug mode: set to true to manually control time
const DEBUG_MODE = false;
let debugHours = 12;
let debugMinutes = 0;
let debugSeconds = 0;

// Update clock hands based on current time
function updateClock() {
    let hours, minutes, seconds, milliseconds;

    if (DEBUG_MODE) {
        hours = debugHours;
        minutes = debugMinutes;
        seconds = debugSeconds;
        milliseconds = 0;
    } else {
        const now = new Date();
        hours = now.getHours() % 12;
        minutes = now.getMinutes();
        seconds = now.getSeconds();
        milliseconds = now.getMilliseconds();
    }

    // Calculate angles (0 degrees = 12 o'clock)
    const secondsAngle = ((seconds + milliseconds / 1000) / 60) * 360;
    const minutesAngle = ((minutes + seconds / 60) / 60) * 360;
    const hoursAngle = ((hours + minutes / 60) / 12) * 360;

    const hourHand = document.getElementById('hour-hand');
    const minuteHand = document.getElementById('minute-hand');
    const secondHand = document.getElementById('second-hand');

    hourHand.setAttribute('transform', `rotate(${hoursAngle} 150 150)`);
    minuteHand.setAttribute('transform', `rotate(${minutesAngle} 150 150)`);
    secondHand.setAttribute('transform', `rotate(${secondsAngle} 150 150)`);

    // Calculate center of gravity based on hand positions
    // Convert angles to radians (0° = up, clockwise)
    const hoursRad = (hoursAngle - 90) * Math.PI / 180;
    const minutesRad = (minutesAngle - 90) * Math.PI / 180;
    const secondsRad = (secondsAngle - 90) * Math.PI / 180;

    // Calculate weighted position of each hand's center of mass (50% of length)
    // More realistic: uniform mass distribution means center of mass at midpoint
    const hourX = Math.cos(hoursRad) * HOUR_LENGTH * 0.5 * HOUR_MASS;
    const hourY = Math.sin(hoursRad) * HOUR_LENGTH * 0.5 * HOUR_MASS;

    const minuteX = Math.cos(minutesRad) * MINUTE_LENGTH * 0.5 * MINUTE_MASS;
    const minuteY = Math.sin(minutesRad) * MINUTE_LENGTH * 0.5 * MINUTE_MASS;

    const secondX = Math.cos(secondsRad) * SECOND_LENGTH * 0.5 * SECOND_MASS;
    const secondY = Math.sin(secondsRad) * SECOND_LENGTH * 0.5 * SECOND_MASS;

    // Calculate center of gravity
    const totalMass = HOUR_MASS + MINUTE_MASS + SECOND_MASS;
    const cogX = (hourX + minuteX + secondX) / totalMass;
    const cogY = (hourY + minuteY + secondY) / totalMass;

    // Calculate angle of center of gravity (from center)
    // We want this point to be at the bottom (pointing down = 90°)
    const cogAngle = Math.atan2(cogY, cogX) * 180 / Math.PI;

    // Target rotation: rotate clock so COG points down (90°)
    targetClockRotation = cogAngle - 90;

    // Normalize the rotation difference to take shortest path
    let rotationDiff = targetClockRotation - currentClockRotation;

    // Wrap angle difference to -180 to 180 range (shortest path)
    while (rotationDiff > 180) rotationDiff -= 360;
    while (rotationDiff < -180) rotationDiff += 360;

    // Smooth rotation with easing
    currentClockRotation += rotationDiff * 0.1; // Smooth easing

    // Apply rotation to entire clock
    const clockSVG = document.getElementById('clock');
    clockSVG.setAttribute('transform', `rotate(${currentClockRotation} 150 150)`);
}

// Use requestAnimationFrame for smooth updates
function animate() {
    updateClock();
    requestAnimationFrame(animate);
}

// Update debug display
function updateDebugDisplay() {
    const debugTimeEl = document.getElementById('debug-time');
    if (debugTimeEl) {
        debugTimeEl.textContent = `${debugHours}:${debugMinutes.toString().padStart(2, '0')}`;
    }
}

// Keyboard controls for debug mode
if (DEBUG_MODE) {
    // Show debug panel
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
        debugInfo.style.display = 'block';
    }

    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowUp':
                debugHours = (debugHours + 1) % 12;
                if (debugHours === 0) debugHours = 12;
                updateDebugDisplay();
                break;
            case 'ArrowDown':
                debugHours = debugHours - 1;
                if (debugHours === 0) debugHours = 12;
                if (debugHours < 0) debugHours = 11;
                updateDebugDisplay();
                break;
            case 'ArrowRight':
                debugMinutes = (debugMinutes + 15) % 60;
                updateDebugDisplay();
                break;
            case 'ArrowLeft':
                debugMinutes = (debugMinutes - 15 + 60) % 60;
                updateDebugDisplay();
                break;
            case '1': case '2': case '3': case '4': case '5': case '6':
            case '7': case '8': case '9':
                debugHours = parseInt(e.key);
                debugMinutes = 0;
                updateDebugDisplay();
                break;
            case '0':
                debugHours = 12;
                debugMinutes = 0;
                updateDebugDisplay();
                break;
        }
    });

    console.log('DEBUG MODE ACTIVE - Use arrow keys or number keys to change time');
    updateDebugDisplay();
}

// Initialize
createHourMarkers();
createHourNumbers();
animate();
