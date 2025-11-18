// Create hour markers - all 12 markers compressed on LEFT semicircle
function createHourMarkers() {
    const markersGroup = document.getElementById('hour-markers');

    // All 12 hours compressed into 180° on the LEFT side
    // Marker 12 at top (0°/360°), Marker 1 at bottom (180°)
    // Going counter-clockwise: 0° -> 180° on left side
    // 11 steps between them: 180° / 11 ≈ 16.36° per step
    for (let hour = 1; hour <= 12; hour++) {
        // Calculate steps from top (marker 12)
        // For LEFT side, we add 180° to flip to the other side
        const stepsFromTop = 12 - hour;
        let markerAngle = 360 - (stepsFromTop * (180 / 11)); // Mirror to left
        if (markerAngle >= 360) markerAngle = 0;

        const angleRad = (markerAngle - 90) * (Math.PI / 180); // -90 to convert from SVG rotation to cartesian

        const x1 = 150 + Math.cos(angleRad) * 130;
        const y1 = 150 + Math.sin(angleRad) * 130;
        const x2 = 150 + Math.cos(angleRad) * 120;
        const y2 = 150 + Math.sin(angleRad) * 120;

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

// Track previous values for fall detection
let previousHour = -1;
let previousMinute = -1;
let previousSecond = -1;

// Animation state - track each hand separately
let hourFalling = false;
let minuteFalling = false;
let secondFalling = false;
let hourFallStartTime = 0;
let minuteFallStartTime = 0;
let secondFallStartTime = 0;

// Easing function for fall effect - starts slow, accelerates (like gravity)
function easeInCubic(t) {
    return t * t * t;
}

// Fall animation duration (ms)
// Should match the time to go from marker 12 to marker 1
// For seconds: 5 seconds (from second 0 to second 5)
// For minutes: 5 minutes = 300 seconds = 300000ms
// For hours: 1 hour = 3600 seconds = 3600000ms
const SECOND_FALL_DURATION = 5000; // 5 seconds
const MINUTE_FALL_DURATION = 300000; // 5 minutes
const HOUR_FALL_DURATION = 3600000; // 1 hour

// Update clock hands based on current time
function updateClock() {
    const now = new Date();
    const hours = now.getHours() % 12 || 12; // 1-12
    const minutes = now.getMinutes(); // 0-59
    const seconds = now.getSeconds(); // 0-59
    const milliseconds = now.getMilliseconds();

    // Detect transitions (when value wraps back to start)
    const hourChanged = previousHour === 12 && hours === 1;
    const minuteChanged = previousMinute === 59 && minutes === 0;
    const secondChanged = previousSecond === 59 && seconds === 0;

    if (hourChanged && !hourFalling) {
        hourFalling = true;
        hourFallStartTime = performance.now();
    }
    if (minuteChanged && !minuteFalling) {
        minuteFalling = true;
        minuteFallStartTime = performance.now();
    }
    if (secondChanged && !secondFalling) {
        secondFalling = true;
        secondFallStartTime = performance.now();
    }

    const hourHand = document.getElementById('hour-hand');
    const minuteHand = document.getElementById('minute-hand');
    const secondHand = document.getElementById('second-hand');

    // Hours: map 1-12 to 180-360 degrees (right semicircle, bottom to top)
    // Include minutes for smooth hour hand movement
    let hoursAngle;
    if (hourFalling) {
        const elapsed = performance.now() - hourFallStartTime;
        const progress = Math.min(elapsed / HOUR_FALL_DURATION, 1);
        const easedProgress = easeInCubic(progress);
        // Animate from 0 (top) through RIGHT side to 180 (bottom)
        // Goes clockwise: 0° -> 90° -> 180°
        hoursAngle = easedProgress * 180; // Goes 0 -> 180 (falling via right)
        if (progress >= 1) hourFalling = false;
    } else {
        // Normal position: all 12 hours compressed in 180° semicircle on LEFT side
        // Hour 12 = 0°, Hour 1 = 180°
        // Calculate position based on steps from top
        const hourProgress = hours + (minutes / 60); // e.g., 10:30 = 10.5
        const stepsFromTop = 12 - hourProgress;
        hoursAngle = 360 - (stepsFromTop * (180 / 11)); // Mirror to left
        if (hoursAngle >= 360) hoursAngle = 0;
    }

    // Minutes: also compressed in same 180° range
    // Minute 0 maps to marker 12 (0°), Minute 60 would map back to marker 12
    let minutesAngle;
    if (minuteFalling) {
        const elapsed = performance.now() - minuteFallStartTime;
        const progress = Math.min(elapsed / MINUTE_FALL_DURATION, 1);
        const easedProgress = easeInCubic(progress);
        minutesAngle = easedProgress * 180; // Falls via right side: 0° -> 180°
        if (progress >= 1) minuteFalling = false;
    } else {
        // Map 60 minutes to 12 markers in 180° on LEFT side
        // Each 5 minutes = one marker step
        const minuteProgress = (minutes + (seconds / 60)) / 5; // Convert to marker units (0-12)
        const stepsFromTop = 12 - minuteProgress;
        minutesAngle = 360 - (stepsFromTop * (180 / 11)); // Mirror to left
        if (minutesAngle >= 360) minutesAngle = 0;
    }

    // Seconds: also compressed in same 180° range
    let secondsAngle;
    if (secondFalling) {
        const elapsed = performance.now() - secondFallStartTime;
        const progress = Math.min(elapsed / SECOND_FALL_DURATION, 1);
        const easedProgress = easeInCubic(progress);
        secondsAngle = easedProgress * 180; // Falls via right side: 0° -> 180°
        if (progress >= 1) secondFalling = false;
    } else {
        // Map 60 seconds to 12 markers in 180° on LEFT side
        // Each 5 seconds = one marker step
        const secondProgress = (seconds + milliseconds / 1000) / 5; // Convert to marker units (0-12)
        const stepsFromTop = 12 - secondProgress;
        secondsAngle = 360 - (stepsFromTop * (180 / 11)); // Mirror to left
        if (secondsAngle >= 360) secondsAngle = 0;
    }

    hourHand.setAttribute('transform', `rotate(${hoursAngle} 150 150)`);
    minuteHand.setAttribute('transform', `rotate(${minutesAngle} 150 150)`);
    secondHand.setAttribute('transform', `rotate(${secondsAngle} 150 150)`);

    // Store previous values
    previousHour = hours;
    previousMinute = minutes;
    previousSecond = seconds;
}

// Initialize fall states based on current time (for page refresh during fall)
function initializeFallStates() {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();

    // Check if second hand should be falling (seconds 0-4)
    if (seconds >= 0 && seconds < 5) {
        secondFalling = true;
        // Calculate how far into the fall we are
        const secondProgress = (seconds + milliseconds / 1000) / 5; // 0-1
        // Set fall start time to match current progress
        secondFallStartTime = performance.now() - (secondProgress * SECOND_FALL_DURATION);
    }

    // Check if minute hand should be falling (minutes 0-4)
    if (minutes >= 0 && minutes < 5) {
        minuteFalling = true;
        // Calculate how far into the fall we are
        const minuteProgress = (minutes + seconds / 60) / 5; // 0-1
        // Set fall start time to match current progress
        minuteFallStartTime = performance.now() - (minuteProgress * MINUTE_FALL_DURATION);
    }

    // Check if hour hand should be falling (hour 12, minutes 0-59)
    if (hours === 12) {
        hourFalling = true;
        // Calculate how far into the fall we are
        const hourProgress = minutes / 60; // 0-1
        // Set fall start time to match current progress
        hourFallStartTime = performance.now() - (hourProgress * HOUR_FALL_DURATION);
    }

    // Set previous values to current to avoid re-triggering falls
    previousHour = hours;
    previousMinute = minutes;
    previousSecond = seconds;
}

// Use requestAnimationFrame for smoother updates
function animate() {
    updateClock();
    requestAnimationFrame(animate);
}

// Initialize
createHourMarkers();
initializeFallStates();
animate();
