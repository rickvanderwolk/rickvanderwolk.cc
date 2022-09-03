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
    background(0);
    stroke(255);
    strokeWeight(4);

    let currentSecond = second();
    let currentMinute = minute();
    let currentHour = ((hour() % 12 || 12) * 60) + minute();

    const max = 60;
    for (let i = 0; i < max; i++) {
        s = map(currentSecond - i, 0, 60, 0, TWO_PI) - HALF_PI;
        m = map(currentMinute - i, 0, 60, 0, TWO_PI) - HALF_PI;
        h = map(Math.round(((currentHour / 720) * (60 - i))), 0, 60, 0, TWO_PI) - HALF_PI;

        // hour
        if (i < 5) {
            stroke('rgba(255,255,255, ' + (max - (i * (max / 5))) / max + ')');
            hoursRadius = radius * 0.5 / 2;
            line(centerX, centerY, centerX + cos(h) * hoursRadius, centerY + sin(h) * hoursRadius);
        }

        // minute
        if (i < 30) {
            stroke('rgba(255,255,255, ' + (max - (i * (max / 30))) / max + ')');
            minutesRadius = radius * 0.6 / 2;
            line(centerX, centerY, centerX + cos(m) * minutesRadius, centerY + sin(m) * minutesRadius);
        }

        // second
        stroke('rgba(255,255,255, ' + (max - i) / max + ')');
        secondsRadius = radius * 0.71 / 2;
        line(centerX, centerY, centerX + cos(s) * secondsRadius, centerY + sin(s) * secondsRadius);
    }
}
