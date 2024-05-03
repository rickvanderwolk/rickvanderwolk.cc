let cx;
let topCy, bottomCy;
let secondsRadius;
let minutesRadius;
let hoursRadius;
let clockDiameter;

function setup() {
    const canvas = createCanvas(window.innerWidth, window.innerHeight + 5);
    stroke(255);

    let radius = min(width, height);
    secondsRadius = radius * 0.71;
    minutesRadius = radius * 0.6;
    hoursRadius = radius * 0.5;
    clockDiameter = radius * 1.7;

    cx = width / 2;
    topCy = 0;
    bottomCy = height;

    cursor(HAND);
}

window.onfocus = function () {
    location.reload();
}

function windowResized () {
    location.reload();
}

function draw() {
    background(255);
    drawClock(cx, topCy);
    drawClock(cx, bottomCy);
    drawClock(cx, topCy, true);
    drawClock(cx, bottomCy, true);
}

function drawClock(cx, cy, second) {
    second = second || false;

    let s = map(getSecond(), 0, 60, 0, TWO_PI) - HALF_PI;
    let m = map(getMinute() + norm(getSecond(), 0, 60), 0, 60, 0, TWO_PI) - HALF_PI;
    let h = map(getHour() + norm(getMinute(), 0, 60), 0, 24, 0, TWO_PI * 2) - HALF_PI;

    if (second) {
        stroke(255, 0, 0);
        strokeWeight(4);
        line(cx, cy, cx + cos(s) * secondsRadius, cy + sin(s) * secondsRadius);
    } else {
        stroke(0);
        strokeWeight(16);
        line(cx, cy, cx + cos(h) * hoursRadius, cy + sin(h) * hoursRadius);
        strokeWeight(8);
        line(cx, cy, cx + cos(m) * minutesRadius, cy + sin(m) * minutesRadius);
    }
}

function getHour() {
    const now = new Date();
    return now.getHours();
}

function getMinute() {
    const now = new Date();
    return now.getMinutes();
}

function getSecond() {
    const now = new Date();
    return now.getSeconds();
}
