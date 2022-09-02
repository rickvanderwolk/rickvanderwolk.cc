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

function initialise () {
    createCanvas((window.innerWidth - canvasMargin), (window.innerHeight - canvasMargin));

    centerX = width / 2;
    centerY = height / 2;

    radius = min(width, height);
}

function draw() {
    background(0);
    fill(0);

    let s = map(getSecondsInMilliseconds(), 0, (60 * 1000), 0, TWO_PI) - HALF_PI;
    let m = map(getMinutesInMilliseconds(), 0, (60 * 1000) * 60, 0, TWO_PI) - HALF_PI;
    let h = map(getHoursInMilliseconds(), 0, ((60 * 1000) * 60) * 24, 0, TWO_PI * 2) - HALF_PI;

    stroke(255);
    strokeWeight(1);

    // second
    secondsRadius = radius * 0.75 / 2;
    strokeWeight(1);
    let secondX2 = centerX + cos(s) * secondsRadius;
    let secondY2 = centerY + sin(s) * secondsRadius;
    line(centerX, centerY, centerX + cos(s) * secondsRadius, centerY + sin(s) * secondsRadius);

    // minute
    minutesRadius = radius * 0.75 / 2;
    strokeWeight(2);
    let minuteX2 = centerX + cos(m) * minutesRadius;
    let minuteY2 = centerY + sin(m) * minutesRadius;
    line(secondX2, secondY2, minuteX2, minuteY2);

    // hour
    hoursRadius = radius * 0.75 / 2;
    strokeWeight(4);
    let hourX2 = centerX + cos(h) * hoursRadius;
    let hourY2 = centerY + sin(h) * hoursRadius;
    line(minuteX2, minuteY2, hourX2, hourY2);
}

function getSecondsInMilliseconds () {
    const date = new Date();
    const seconds = Math.floor(Date.now() / 1000) * 1000;
    return (second() * 1000) + date.valueOf() - seconds;
}

function getMinutesInMilliseconds () {
    return (minute() * (60 * 1000)) + getSecondsInMilliseconds();
}

function getHoursInMilliseconds () {
    return (hour() * (60 * 1000) * 60) + getMinutesInMilliseconds();
}
