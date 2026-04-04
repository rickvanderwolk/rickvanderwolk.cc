let secondsRadius;
let minutesRadius;
let hoursRadius;
let clockDiameter;

function setup() {
    createCanvas(710, 400);
    stroke(255);
    angleMode(DEGREES);

    let radius = min(width, height) / 2;
    secondsRadius = radius * 0.71;
    minutesRadius = radius * 0.6;
    hoursRadius = radius * 0.5;
    clockDiameter = radius * 1.7;
}

function draw() {
    background(255);

    translate(width / 2, height / 2);

    stroke(0);
    strokeWeight(8);
    fill(255);
    ellipse(0, 0, clockDiameter + 50, clockDiameter + 50);

    noStroke();
    fill(255);
    ellipse(0, 0, clockDiameter, clockDiameter);

    textSize(32);
    textAlign(CENTER, CENTER);
    fill(0);
    for (let i = 1; i <= 12; i++) {
        let angle = map(i, 0, 12, 0, 360) - 90;
        let x = cos(angle) * (hoursRadius + 60);
        let y = sin(angle) * (hoursRadius + 60);
        text(i, x, y);
    }

    let secondAngle = map(second(), 0, 60, 0, 360);
    let minuteAngle = map(minute(), 0, 60, 0, 360);
    let hourAngle = map(hour() % 12 + norm(minute(), 0, 60), 0, 12, 0, 360);

    stroke(255, 0, 0);
    strokeWeight(2);
    push();
    rotate(secondAngle);
    line(0, 0, 0, -secondsRadius);
    pop();

    stroke(0);
    strokeWeight(4);
    push();
    rotate(minuteAngle);
    line(0, 0, 0, -minutesRadius);
    pop();

    stroke(0);
    strokeWeight(6);
    push();
    rotate(hourAngle);
    line(0, 0, 0, -hoursRadius);
    pop();
}
