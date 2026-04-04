function setup() {
    createCanvas(windowWidth, windowHeight);
    angleMode(DEGREES);
    frameRate(60);
}

function draw() {
    renderClock();
}

function drawGradientArc(x, y, radius, currentAngle, trailLength, col, clockwise = true) {
    let steps = 60;

    for (let i = 0; i < steps; i++) {
        let progress = i / steps;
        let opacity = 1 - progress;

        let angleOffset = progress * trailLength;
        let stepAngle = trailLength / steps;

        let startAngle, endAngle;
        if (clockwise) {
            startAngle = currentAngle - angleOffset - stepAngle;
            endAngle = currentAngle - angleOffset;
        } else {
            startAngle = currentAngle + angleOffset;
            endAngle = currentAngle + angleOffset + stepAngle;
        }

        let c = color(col);
        c.setAlpha(opacity * 180);
        fill(c);

        arc(x, y, radius * 2, radius * 2, startAngle, endAngle, PIE);
    }
}

function renderClock() {
    background(0);
    translate(width / 2, height / 2);

    blendMode(ADD);

    let now = new Date();
    let h = now.getHours() % 12;
    let m = now.getMinutes();
    let s = now.getSeconds();
    let ms = now.getMilliseconds();

    let baseRadius = min(width, height) / 3.3;
    let circleRadius = baseRadius;

    let hourColor = '#FFFFFF';
    let minuteColor = '#FFFFFF';
    let secondColor = '#FFFFFF';

    let offsetDist = baseRadius * 0.577;
    let hourX = 0;
    let hourY = -offsetDist;
    let minuteX = -offsetDist * 0.866;
    let minuteY = offsetDist * 0.5;
    let secondX = offsetDist * 0.866;
    let secondY = offsetDist * 0.5;

    noStroke();

    let hourAngle = -90 + ((h % 12) / 12) * 360 + (m / 60) * 30;
    push();
    translate(hourX, hourY);
    drawGradientArc(0, 0, circleRadius, hourAngle, 90, hourColor, true);
    pop();

    let minuteAngle = -90 - ((m / 60) * 360 + (s / 60) * 6);
    push();
    translate(minuteX, minuteY);
    drawGradientArc(0, 0, circleRadius, minuteAngle, 90, minuteColor, false);
    pop();

    let secondAngle = -90 - (((s + ms / 1000) / 60) * 360);
    push();
    translate(secondX, secondY);
    drawGradientArc(0, 0, circleRadius, secondAngle, 90, secondColor, false);
    pop();

    blendMode(BLEND);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
