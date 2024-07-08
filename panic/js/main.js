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
    frameRate(15);

    centerX = width / 2;
    centerY = height / 2;
    radius = min(width, height);
}

function draw() {
    background(0);
    stroke(255);

    let s = map(second(), 0, 60, 0, TWO_PI) - HALF_PI;
    let m = map(minute() + norm(second(), 0, 60), 0, 60, 0, TWO_PI) - HALF_PI;
    let h = map(hour() + norm(minute(), 0, 60), 0, 24, 0, TWO_PI * 2) - HALF_PI;

    if (getRandomBool()) {
        hoursRadius = radius * 0.5 / 2;
        strokeWeight(8);
        line(centerX, centerY, centerX + cos(h) * hoursRadius, centerY + sin(h) * hoursRadius);
    }

    if (getRandomBool()) {
        minutesRadius = radius * 0.6 / 2;
        strokeWeight(4);
        line(centerX, centerY, centerX + cos(m) * minutesRadius, centerY + sin(m) * minutesRadius);
    }

    if (getRandomBool()) {
        secondsRadius = radius * 0.71 / 2;
        strokeWeight(2);
        line(centerX, centerY, centerX + cos(s) * secondsRadius, centerY + sin(s) * secondsRadius);
    }
}

function getRandomBool() {
    if (Math.random() > 0.9) {
        return true;
    } else {
        return false;
    }
}
