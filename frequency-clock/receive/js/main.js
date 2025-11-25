let mic;
let fft;
let started = false;

// Frequency bands (must match transmitter)
const HOUR_BASE = 300;
const HOUR_MAX = 760;
const MINUTE_BASE = 900;
const MINUTE_MAX = 2080;
const SECOND_BASE = 2200;
const SECOND_MAX = 3380;
const STEP = 20;

// Decoded values
let decodedHour = '--';
let decodedMinute = '--';
let decodedSecond = '--';
let currentType = 'waiting';
let detectedFreq = 0;
let confidence = 0;

// Stability: averaging multiple readings
const READING_HISTORY_SIZE = 5;
let hourReadings = [];
let minuteReadings = [];
let secondReadings = [];

// Minimum confidence to accept a reading
const MIN_CONFIDENCE = 3;

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
        text('Click to start listening', width / 2, height / 2);
        textSize(16);
        fill(100);
        text('Make sure microphone access is allowed', width / 2, height / 2 + 40);
        return;
    }

    // Analyze audio with higher precision
    const spectrum = fft.analyze();
    const peakData = findPeakFrequency(spectrum);
    detectedFreq = peakData.freq;
    confidence = peakData.confidence;

    // Decode frequency to time value
    if (detectedFreq > 0 && confidence > 30) {
        decodeFrequency(detectedFreq);
    } else {
        currentType = 'listening';
    }

    // Display decoded time
    const timeStr = decodedHour + ':' + decodedMinute + ':' + decodedSecond;

    fill(255);
    textSize(72);
    text(timeStr, width / 2, height / 2 - 100);

    // Show current detection
    textSize(20);
    fill(100);
    text('Detected: ' + currentType.toUpperCase(), width / 2, height / 2 - 20);

    // Show frequency and confidence
    textSize(18);
    fill(255, 0, 255);
    const freqText = detectedFreq > 0 ? Math.round(detectedFreq) + ' Hz' : '---';
    const confText = 'Signal: ' + Math.round(confidence) + '%';
    text(freqText + '  |  ' + confText, width / 2, height / 2 + 20);

    // Confidence bar
    noFill();
    stroke(50);
    strokeWeight(2);
    rect(width / 2 - 100, height / 2 + 50, 200, 10);

    fill(confidence > 50 ? color(0, 255, 100) : color(255, 100, 0));
    noStroke();
    rect(width / 2 - 100, height / 2 + 50, confidence * 2, 10);

    // Draw spectrum visualization
    drawSpectrum(spectrum);
}

function findPeakFrequency(spectrum) {
    let maxAmp = 0;
    let maxIndex = 0;
    let totalEnergy = 0;

    const nyquist = sampleRate() / 2;
    const binWidth = nyquist / spectrum.length;

    // Look in our frequency range (250Hz - 3500Hz)
    const minBin = Math.floor(250 / binWidth);
    const maxBin = Math.ceil(3500 / binWidth);

    // Find peak and calculate total energy
    for (let i = minBin; i < maxBin && i < spectrum.length; i++) {
        totalEnergy += spectrum[i];
        if (spectrum[i] > maxAmp) {
            maxAmp = spectrum[i];
            maxIndex = i;
        }
    }

    // Calculate confidence based on peak prominence
    const avgEnergy = totalEnergy / (maxBin - minBin);
    const peakProminence = maxAmp / (avgEnergy + 1);
    const normalizedConfidence = Math.min(100, (peakProminence - 1) * 20);

    // Use quadratic interpolation for more accurate frequency
    let freq = 0;
    if (maxAmp > 40 && maxIndex > 0 && maxIndex < spectrum.length - 1) {
        const alpha = spectrum[maxIndex - 1];
        const beta = spectrum[maxIndex];
        const gamma = spectrum[maxIndex + 1];
        const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
        freq = (maxIndex + p) * binWidth;
    }

    return { freq: freq, confidence: normalizedConfidence };
}

function decodeFrequency(freq) {
    const tolerance = STEP * 0.6; // 60% of step size as tolerance

    // Check which band the frequency falls into
    if (freq >= HOUR_BASE - tolerance && freq <= HOUR_MAX + tolerance) {
        const hour = Math.round((freq - HOUR_BASE) / STEP);
        if (hour >= 0 && hour <= 23) {
            addReading(hourReadings, hour);
            const stableHour = getStableValue(hourReadings);
            if (stableHour !== null) {
                decodedHour = pad(stableHour);
            }
            currentType = 'hour';
        }
    } else if (freq >= MINUTE_BASE - tolerance && freq <= MINUTE_MAX + tolerance) {
        const minute = Math.round((freq - MINUTE_BASE) / STEP);
        if (minute >= 0 && minute <= 59) {
            addReading(minuteReadings, minute);
            const stableMinute = getStableValue(minuteReadings);
            if (stableMinute !== null) {
                decodedMinute = pad(stableMinute);
            }
            currentType = 'minute';
        }
    } else if (freq >= SECOND_BASE - tolerance && freq <= SECOND_MAX + tolerance) {
        const second = Math.round((freq - SECOND_BASE) / STEP);
        if (second >= 0 && second <= 59) {
            addReading(secondReadings, second);
            const stableSecond = getStableValue(secondReadings);
            if (stableSecond !== null) {
                decodedSecond = pad(stableSecond);
            }
            currentType = 'second';
        }
    }
}

function addReading(readings, value) {
    readings.push(value);
    if (readings.length > READING_HISTORY_SIZE) {
        readings.shift();
    }
}

function getStableValue(readings) {
    if (readings.length < MIN_CONFIDENCE) return null;

    // Count occurrences of each value
    const counts = {};
    for (const val of readings) {
        counts[val] = (counts[val] || 0) + 1;
    }

    // Find most common value
    let maxCount = 0;
    let mostCommon = null;
    for (const [val, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            mostCommon = parseInt(val);
        }
    }

    // Only return if we have enough agreement
    if (maxCount >= MIN_CONFIDENCE) {
        return mostCommon;
    }
    return null;
}

function drawSpectrum(spectrum) {
    const startY = height - 120;
    const specHeight = 100;

    const nyquist = sampleRate() / 2;
    const binWidth = nyquist / spectrum.length;

    // Hour band
    fill(100, 50, 50, 100);
    noStroke();
    const hourStartX = map(HOUR_BASE, 0, 4000, 0, width);
    const hourEndX = map(HOUR_MAX, 0, 4000, 0, width);
    rect(hourStartX, startY - specHeight, hourEndX - hourStartX, specHeight);

    // Minute band
    fill(50, 100, 50, 100);
    const minStartX = map(MINUTE_BASE, 0, 4000, 0, width);
    const minEndX = map(MINUTE_MAX, 0, 4000, 0, width);
    rect(minStartX, startY - specHeight, minEndX - minStartX, specHeight);

    // Second band
    fill(50, 50, 100, 100);
    const secStartX = map(SECOND_BASE, 0, 4000, 0, width);
    const secEndX = map(SECOND_MAX, 0, 4000, 0, width);
    rect(secStartX, startY - specHeight, secEndX - secStartX, specHeight);

    // Draw spectrum line
    stroke(255, 0, 255);
    strokeWeight(1);
    noFill();
    beginShape();
    const maxFreqBin = Math.ceil(4000 / binWidth);
    for (let i = 0; i < maxFreqBin && i < spectrum.length; i++) {
        const x = map(i * binWidth, 0, 4000, 0, width);
        const y = map(spectrum[i], 0, 255, startY, startY - specHeight);
        vertex(x, y);
    }
    endShape();

    // Mark detected frequency
    if (detectedFreq > 0) {
        const markerX = map(detectedFreq, 0, 4000, 0, width);
        stroke(255, 255, 0);
        strokeWeight(2);
        line(markerX, startY, markerX, startY - specHeight);
    }

    // Labels
    fill(150);
    noStroke();
    textSize(12);
    textAlign(CENTER);
    text('HOUR', (hourStartX + hourEndX) / 2, startY + 15);
    text('300-760Hz', (hourStartX + hourEndX) / 2, startY + 28);
    text('MINUTE', (minStartX + minEndX) / 2, startY + 15);
    text('900-2080Hz', (minStartX + minEndX) / 2, startY + 28);
    text('SECOND', (secStartX + secEndX) / 2, startY + 15);
    text('2200-3380Hz', (secStartX + secEndX) / 2, startY + 28);

    // Reset text align for main display
    textAlign(CENTER, CENTER);
}

function mousePressed() {
    if (!started) {
        userStartAudio();
        mic = new p5.AudioIn();
        mic.start();
        // Higher FFT resolution for better frequency detection
        fft = new p5.FFT(0.8, 2048);
        fft.setInput(mic);
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
