const canvasMargin = 20;

let centerX, centerY;

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
}

function draw() {
    background(0);
    fill(255);
    stroke(255);

    strokeWeight(4);
    drawLine(centerY - 11, (hour() % 12 || 12) + norm(minute(), 0, 60), 12);

    strokeWeight(2);
    drawLine(centerY, minute() + norm(second(), 0, 60), 60);

    strokeWeight(1);
    drawLine(centerY + 11, second(), 60);
}

function drawLine(y, current, total) {
    const margin = ((width / 2) / 10);
    const max = (width / 2) - margin;
    let percentage = (current / total);
    let size;

    if (percentage < 0.25) {
        percentage = current / (total / 4);
        size = percentage * max;
        line(centerX, y, (centerX + size), y);
    } else if (percentage < 0.5) {
        current = current - (total * 0.25);
        percentage = current / (total / 4);
        size = max - (percentage * max);
        line(centerX, y, (centerX + size), y);
    } else if (percentage < 0.75) {
        current = current - (total * 0.50);
        percentage = current / (total / 4);
        size = percentage * max;
        line((centerX - size), y, centerX, y);
    } else {
        current = current - (total * 0.75);
        percentage = current / (total / 4);
        size = max - (percentage * max);
        line((centerX - size), y, centerX, y);
    }
}
