let centerX, centerY;
let radius, secondsRadius, minutesRadius, hoursRadius;

function setup () {
    initialise();
}

function windowResized () {
    initialise();
}

function initialise () {
    createCanvas(window.innerWidth, window.innerHeight);

    centerX = width / 2;
    centerY = height / 2;

    radius = min(width, height);
}

function draw() {
    background(255);
    stroke(0);

    let s = map(second(), 0, 60, 0, TWO_PI) - HALF_PI;
    let m = map(minute() + norm(second(), 0, 60), 0, 60, 0, TWO_PI) - HALF_PI;
    let h = map(hour() + norm(minute(), 0, 60), 0, 24, 0, TWO_PI * 2) - HALF_PI;

    // hour
    hoursRadius = radius * 10 / 2;
    strokeWeight(320);
    line(centerX, centerY, centerX + cos(h) * hoursRadius, centerY + sin(h) * hoursRadius);

    // minute
    minutesRadius = radius * 10 / 2;
    strokeWeight(160);
    line(centerX, centerY, centerX + cos(m) * minutesRadius, centerY + sin(m) * minutesRadius);

    // second
    secondsRadius = radius * 10 / 2;
    strokeWeight(80);
    line(centerX, centerY, centerX + cos(s) * secondsRadius, centerY + sin(s) * secondsRadius);
}
