const canvasMargin = 20;

let centerX, centerY;
let secondsRadius;
let minutesRadius;
let hoursRadius;
let radius;

function setup () {
    initialise();
}

function windowResized () {
    initialise();
}

function mousePressed () {
    initialise();
}

function initialise () {
    createCanvas((window.innerWidth - canvasMargin), (window.innerHeight - canvasMargin));

    centerX = width / 2;
    centerY = height / 2;

    radius = min(width, height);
}

function draw() {
    background(0);
    fill(0);

    let s = map(second(), 0, 60, 0, TWO_PI) - HALF_PI;
    let m = map(minute(), 0, 60, 0, TWO_PI) - HALF_PI;
    let h = map(hour(), 0, 24, 0, TWO_PI * 2) - HALF_PI;

    stroke(255);
    strokeWeight(1);

    // hour
    hoursRadius = radius * 0.75 / 2;
    circle(centerX, centerY, (radius * 0.75));
    line(centerX, centerY, centerX + cos(h) * hoursRadius, centerY + sin(h) * hoursRadius);

    // minute
    minutesRadius = radius * 0.5 / 2;
    circle(centerX, centerY, (radius * 0.5));
    line(centerX, centerY, centerX + cos(m) * minutesRadius, centerY + sin(m) * minutesRadius);

    // second
    secondsRadius = radius * 0.25 / 2;
    circle(centerX, centerY, (radius * 0.25));
    line(centerX, centerY, centerX + cos(s) * secondsRadius, centerY + sin(s) * secondsRadius);
}
