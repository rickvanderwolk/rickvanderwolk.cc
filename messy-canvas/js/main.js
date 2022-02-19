let brushColor, brushSize, brushX, brushY, brushVelocityX, brushVelocityY, brushVelocityMax;
let angle, jitterValue;

function setup () {
    createCanvas(window.innerWidth, window.innerHeight);

    brushSize = getBrushSize();
    brushColor = getRandomishColor();
    brushVelocityMax = 15;

    angle = 0.0;
    jitterValue = 0.0;

    start();
}

function start() {
    brushX = Math.floor(Math.random() * (width - 0));
    brushY = Math.floor(Math.random() * (height - 0));
    brushVelocityX = brushVelocityMax / 2.5;
    brushVelocityY = getRandomBrushVelocity();
}

function windowResized () {
    setup();
}

function draw () {
    moveBrush();
}

function getBrushSize() {
    let brushSize;
    if (window.innerHeight > window.innerWidth) {
        brushSize = (width / 14);
    } else {
        brushSize = (height / 20);
    }
    return brushSize;
}

function getRandomishColor() {
    return 'hsla(' + Math.floor((Math.random() * 360)) + ', 100%, 50%, 1.0)';
}

function getBrushX () {
    return brushX + brushVelocityX;
}

function getBrushY () {
    return brushY + brushVelocityY;
}

function getRandomBrushVelocity () {
    const randomNumber = Math.random();
    if (randomNumber < 0.5) {
        return -brushVelocityMax / 2.5;
    } else {
        return brushVelocityMax / 2.5;
    }
}

function moveBrush () {
    brushX = getBrushX();
    brushY = getBrushY();
    // bottom wall coll
    if (brushY + (brushSize / 2) >= height) {
        brushVelocityY = brushVelocityY * -1;
        brushY = height - (brushSize / 2);
        brushColor = getRandomishColor();
    }
    // top wall coll
    else if (brushY - (brushSize / 2) <= 0) {
        brushVelocityY = brushVelocityY * -1;
        brushY = (brushSize / 2);
        brushColor = getRandomishColor();
    }
    // left wall coll
    else if (brushX + (brushSize / 2) < 0) {
        brushVelocityX = brushVelocityX * -1;
        brushX = (brushSize / 2);
        brushColor = getRandomishColor();
    }
    // right wall coll
    else if (brushX + (brushSize / 2) > width) {
        brushVelocityX = brushVelocityX * -1;
        brushX = width - (brushSize / 2);
        brushColor = getRandomishColor();
    }
    renderBrush();
}

function jitter() {
    if (second() % 2 === 0) {
        jitterValue = random(-0.1, 0.1);
    }

    angle = angle + jitterValue;
    let c = cos(angle);
    rotate(c);
}

function renderBrush() {
    fill(color(brushColor));
    noStroke();

    let min, max;
    let size = brushSize;

    const randomNumber = Math.random();
    if (randomNumber < 0.5) {
        min = (size / 1.75);
        max = size;
    } else {
        min = size;
        max = (size * 1.75);
    }
    size = Math.floor(Math.random() * (max - min) + min);

    jitter();

    ellipse(brushX, brushY, size, size);
}
