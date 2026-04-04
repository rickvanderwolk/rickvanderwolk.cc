let secondsRadius;
let minutesRadius;
let hoursRadius;
let clockDiameter;
let centerX, centerY;
let randomAngleOffset;

function setup() {
    createCanvas(windowWidth, windowHeight);
    angleMode(DEGREES);

    let radius = min(width, height) / 2;
    secondsRadius = radius * 0.71;
    minutesRadius = radius * 0.6;
    hoursRadius = radius * 0.5;
    clockDiameter = radius * 1.7;

    centerX = 0;
    centerY = 0;

    // Genereer een willekeurige hoekoffset
    randomAngleOffset = random(0, 360);
}

function draw() {
    background(255);

    translate(width / 2, height / 2);

    let secondAngle = map(second(), 0, 60, 0, 360);
    let minuteAngle = map(minute(), 0, 60, 0, 360);
    let hourAngle = map(hour() % 12 + norm(minute(), 0, 60), 0, 12, 0, 360);

    stroke(255, 0, 0, 150);
    strokeWeight(8);
    for (let i = 0; i < 10; i++) {
        push();
        rotate(secondAngle);
        line(centerX, centerY, centerX, -secondsRadius * scaleFactor(secondAngle + randomAngleOffset));
        secondsRadius *= 0.95;
        pop();
    }

    stroke(0, 150);
    strokeWeight(12);
    for (let i = 0; i < 8; i++) {
        push();
        rotate(minuteAngle);
        line(centerX, centerY, centerX, -minutesRadius * scaleFactor(minuteAngle + randomAngleOffset));
        minutesRadius *= 0.95;
        pop();
    }

    stroke(0, 150);
    strokeWeight(16);
    for (let i = 0; i < 6; i++) {
        push();
        rotate(hourAngle);
        line(centerX, centerY, centerX, -hoursRadius * scaleFactor(hourAngle + randomAngleOffset));
        hoursRadius *= 0.95;
        pop();
    }

    let radius = min(width, height) / 2;
    secondsRadius = radius * 0.71;
    minutesRadius = radius * 0.6;
    hoursRadius = radius * 0.5;
}

function scaleFactor(angle) {
    let x = cos(angle);
    let y = sin(angle);
    return map(x * y, -1, 1, 0.05, 3.0);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
