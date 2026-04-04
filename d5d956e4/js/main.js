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

    let now = new Date();
    let h = now.getHours() % 12;
    let m = now.getMinutes();
    let s = now.getSeconds();
    let ms = now.getMilliseconds();

    let baseRadius = min(width, height) / 3.3;

    // Kleinste cirkel voor uren, middelste voor minuten, grootste voor seconden
    let hourRadius = baseRadius * 0.5;
    let minuteRadius = baseRadius * 0.75;
    let secondRadius = baseRadius;

    let hourColor = '#FF0000';
    let minuteColor = '#00FF00';
    let secondColor = '#0000FF';

    // Alle cirkels in het midden
    let hourX = 0;
    let hourY = 0;
    let minuteX = 0;
    let minuteY = 0;
    let secondX = 0;
    let secondY = 0;

    noStroke();

    // Seconden met SCREEN blend mode
    blendMode(SCREEN);
    let secondAngle = -90 - (((s + ms / 1000) / 60) * 360);
    push();
    translate(secondX, secondY);
    drawGradientArc(0, 0, secondRadius, secondAngle, 360, secondColor, false);
    pop();

    // Minuten met ADD blend mode
    blendMode(ADD);
    let minuteAngle = -90 - ((m / 60) * 360 + (s / 60) * 6);
    push();
    translate(minuteX, minuteY);
    drawGradientArc(0, 0, minuteRadius, minuteAngle, 360, minuteColor, false);
    pop();

    // Uren met DIFFERENCE blend mode
    blendMode(DIFFERENCE);
    let hourAngle = -90 + ((h % 12) / 12) * 360 + (m / 60) * 30;
    push();
    translate(hourX, hourY);
    drawGradientArc(0, 0, hourRadius, hourAngle, 360, hourColor, true);
    pop();

    blendMode(BLEND);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
