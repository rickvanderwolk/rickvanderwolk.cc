let centerX, centerY;
let radius, secondsRadius, minutesRadius, hoursRadius;

function setup () {
    initialise();
}

function windowResized () {
    initialise();
}

function initialise () {
    createCanvas((window.innerWidth), (window.innerHeight));

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

    hoursRadius = radius * 0.65 / 2;
    let hourY2 = centerY + sin(h) * hoursRadius;
    minutesRadius = radius * 0.80 / 2;
    let minuteY2 = centerY + sin(m) * minutesRadius;
    secondsRadius = radius * 1 / 2;
    let secondY2 = centerY + sin(s) * secondsRadius;

    const marginMax =  Math.max.apply(Math, [centerY, parseInt(hourY2), parseInt(minuteY2), parseInt(secondY2)]);
    const margin = height - marginMax;

    // hour
    strokeWeight(8);
    line(centerX, centerY + margin, centerX + cos(h) * hoursRadius, hourY2 + margin);

    // minute
    strokeWeight(4);
    line(centerX, centerY + margin, centerX + cos(m) * minutesRadius, minuteY2 + margin);

    // second
    strokeWeight(2);
    line(centerX, centerY + margin, centerX + cos(s) * secondsRadius, secondY2 + margin);
}
