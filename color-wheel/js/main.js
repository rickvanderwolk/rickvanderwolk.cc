let secondsRadius;
let minutesRadius;
let hoursRadius;
let clockDiameter;
let colorHour, colorMinute, colorSecond;
function setup() {
    createCanvas(windowWidth, windowHeight);
    adjustClockDimensions();
    stroke(255);
    angleMode(DEGREES);
}
function draw() {
    background(255);

    let centerX = width / 2;
    let centerY = height / 2.5;

    noStroke();
    for (let i = 0; i < 360; i++) {
        let col = color(`hsl(${i}, 100%, 50%)`);
        fill(col);
        arc(centerX, centerY, clockDiameter, clockDiameter, i, i + 1);
    }

    fill(255);
    ellipse(centerX, centerY, clockDiameter - 20, clockDiameter - 20);

    let secondAngle = map(second(), 0, 60, 0, 360);
    let minuteAngle = map(minute(), 0, 60, 0, 360);
    let hourAngle = map(hour() % 12 + norm(minute(), 0, 60), 0, 12, 0, 360);

    stroke(255);
    strokeWeight(2);
    push();
    translate(centerX, centerY);
    rotate(secondAngle);
    line(0, 0, 0, -secondsRadius);
    pop();

    stroke(255);
    strokeWeight(4);
    push();
    translate(centerX, centerY);
    rotate(minuteAngle);
    line(0, 0, 0, -minutesRadius);
    pop();

    stroke(255);
    strokeWeight(6);
    push();
    translate(centerX, centerY);
    rotate(hourAngle);
    line(0, 0, 0, -hoursRadius);
    pop();

    let secondPosition = parseInt((secondAngle + 270) % 360);
    let minutePosition = parseInt((minuteAngle + 270) % 360);
    let hourPosition = parseInt((hourAngle + 270) % 360);

    colorHour = color(`hsl(${hourPosition}, 100%, 50%)`);
    colorMinute = color(`hsl(${minutePosition}, 100%, 50%)`);
    colorSecond = color(`hsl(${secondPosition}, 100%, 50%)`);

    drawColorCircles(centerX, centerY);
}
function drawColorCircles(centerX, centerY) {
    let radius = 30;
    let yPos = centerY + clockDiameter / 2 + radius * 2 + (height * 0.05);
    let gap = 100;
    
    noStroke();

    fill(colorHour);
    ellipse(centerX - gap, yPos, radius * 2, radius * 2);

    fill(colorMinute);
    ellipse(centerX, yPos, radius * 2, radius * 2);

    fill(colorSecond);
    ellipse(centerX + gap, yPos, radius * 2, radius * 2);
}
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    adjustClockDimensions();
}
function adjustClockDimensions() {
    let radius = min(windowWidth, windowHeight) / 3;
    secondsRadius = radius * 0.7;
    minutesRadius = radius * 0.6;
    hoursRadius = radius * 0.5;
    clockDiameter = radius * 1.7;
}
