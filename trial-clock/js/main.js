// thanks for the clock, https://p5js.org/examples/calculating-values-clock/
let secondsRadius;
let minutesRadius;
let hoursRadius;
let clockDiameter;
let startTime;
let isRunning = true;
let licenseCode = 'XP9R-47BV-N3Q8-ZY5T';
let codeEntered = false;

const TRIAL_DURATION = 30 * 1000;

function setup() {
    createCanvas(750, 500);
    stroke(255);
    angleMode(DEGREES);
    textFont('Arial');

    let radius = min(200, 200);
    secondsRadius = radius * 0.71;
    minutesRadius = radius * 0.6;
    hoursRadius = radius * 0.5;
    clockDiameter = radius * 1.7;

    startTime = millis();
}

function draw() {
    background(255);

    if (isRunning) {
        let currentTime = millis();
        let elapsedTime = currentTime - startTime;
        let remainingTime = Math.ceil((TRIAL_DURATION - elapsedTime) / 1000);

        if (currentTime - startTime >= TRIAL_DURATION && !codeEntered) {
            isRunning = false;
            showLicensePrompt();
        } else {
            translate(width / 2, height / 2 - 50);

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

            if (!codeEntered) {

                strokeWeight(0);
                fill(255, 0, 0, 100);
                push();
                rotate(-25);
                textSize(clockDiameter / 1.75);
                textAlign(CENTER, CENTER);
                text('TRIAL', 0, 0);
                pop();


                textSize(24);
                fill(0);
                text(`Time left: ${remainingTime} seconds`, 0, (clockDiameter / 2) + (clockDiameter * 0.2));
            }
        }
    }
}

function showLicensePrompt() {
    while (!codeEntered) {
        let userCode = prompt('Trial expired. Please enter license code:');
        if (userCode === licenseCode) {
            codeEntered = true;
            isRunning = true;
            startTime = millis();
        } else {
            alert('Invalid license code. Please try again.');
        }
    }
}
