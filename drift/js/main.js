// Create hour markers
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

// Independent virtual time system for each hand
let secondsAngle = Math.random() * 360;
let minutesAngle = Math.random() * 360;
let hoursAngle = Math.random() * 360;

// Speed system for each hand
const hands = {
    seconds: {
        current: 1,
        target: 1,
        progress: 1
    },
    minutes: {
        current: 1,
        target: 1,
        progress: 1
    },
    hours: {
        current: 1,
        target: 1,
        progress: 1
    }
};

// Get random speed between 0.01x and 100x
function getRandomSpeed() {
    // Use exponential distribution for more interesting variation
    const random = Math.random();
    if (random < 0.25) {
        // 25% chance: extremely slow (0.01x - 0.5x)
        return 0.01 + Math.random() * 0.49;
    } else if (random < 0.5) {
        // 25% chance: slow (0.5x - 2x)
        return 0.5 + Math.random() * 1.5;
    } else if (random < 0.75) {
        // 25% chance: fast (2x - 20x)
        return 2 + Math.random() * 18;
    } else {
        // 25% chance: extremely fast (20x - 100x)
        return 20 + Math.random() * 80;
    }
}

// Ease in-out function for smooth transitions
function easeInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Start speed transition for a specific hand
function initiateSpeedChange(handName) {
    hands[handName].target = getRandomSpeed();
    hands[handName].progress = 0;

    // Schedule next speed change (between 3-12 seconds, varies per hand)
    const nextChange = 3000 + Math.random() * 9000;
    setTimeout(() => initiateSpeedChange(handName), nextChange);
}

// Update virtual angles
function updateVirtualTime(deltaTime) {
    // Update each hand independently
    Object.keys(hands).forEach(handName => {
        const hand = hands[handName];

        // Smooth speed transition
        if (hand.progress < 1) {
            hand.progress += deltaTime / 2000; // 2 second transition
            hand.progress = Math.min(hand.progress, 1);

            const t = easeInOutCubic(hand.progress);
            hand.current = hand.current + (hand.target - hand.current) * t;
        }
    });

    // Update angles based on individual speeds
    // All hands move at second hand speed: 360 degrees per 60 seconds = 6 degrees/second at normal speed
    secondsAngle += (deltaTime / 1000) * 6 * hands.seconds.current;
    minutesAngle += (deltaTime / 1000) * 6 * hands.minutes.current;
    hoursAngle += (deltaTime / 1000) * 6 * hands.hours.current;

    // Keep angles in 0-360 range (optional, for cleaner numbers)
    secondsAngle = secondsAngle % 360;
    minutesAngle = minutesAngle % 360;
    hoursAngle = hoursAngle % 360;
}

// Update clock hands based on virtual angles
function updateClock() {
    const hourHand = document.getElementById('hour-hand');
    const minuteHand = document.getElementById('minute-hand');
    const secondHand = document.getElementById('second-hand');

    hourHand.setAttribute('transform', `rotate(${hoursAngle} 150 150)`);
    minuteHand.setAttribute('transform', `rotate(${minutesAngle} 150 150)`);
    secondHand.setAttribute('transform', `rotate(${secondsAngle} 150 150)`);
}

// Animation loop
let lastTimestamp = performance.now();

function animate(timestamp) {
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    updateVirtualTime(deltaTime);
    updateClock();

    requestAnimationFrame(animate);
}

// Initialize
createHourMarkers();
initiateSpeedChange('seconds');
initiateSpeedChange('minutes');
initiateSpeedChange('hours');
requestAnimationFrame(animate);
