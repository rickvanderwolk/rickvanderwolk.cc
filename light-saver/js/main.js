let shapeSize, randomBooleanValueThreshold, centerX, centerY, canvas, canvasExport;

function draw() {
    canvas = createCanvas(window.innerWidth, window.innerHeight);
    canvasExport = createGraphics(window.innerWidth, window.innerHeight);

    canvasExport.clear();
    canvasExport.push();

    drawImage();

    canvasExport.pop();
    image(canvasExport, 0, 0);

    noLoop();
}

function drawImage() {
    randomBooleanValueThreshold = Math.random();
    if (height > width) {
        shapeSize = window.innerHeight / 100;
    } else {
        shapeSize = window.innerWidth / 100;
    }

    centerX = width / 2;
    centerY = height / 2;

    canvasExport.background(0);
    canvasExport.noStroke();

    let currentLayer = 1;
    while ((currentLayer * shapeSize) < (height - shapeSize)) {
        drawLayer(canvasExport, height - (currentLayer * shapeSize));
        currentLayer++;
    }
}

function drawLayer(canvas, y) {
    let x = 0;
    while (x <= width) {
        canvas.fill(getFillColor());

        if (getRandomBooleanValue()) {
            drawTriangle(canvas, x, y);
        }

        x += shapeSize;
    }
}

function drawTriangle(canvas, x, y) {
    const xTop = x;
    const yTop = y - (shapeSize / 2);
    const yBottom = centerY + (shapeSize / 2);
    const xBottomLeft = centerX - (shapeSize / 2);
    const xBottomRight = centerX + (shapeSize / 2);
    canvas.triangle(xTop, yTop, xBottomLeft, yBottom, xBottomRight, yBottom);
}

function getFillColor() {
    return 'hsla(' + Math.floor((Math.random() * 360)) + ', 100%, 100%, ' + 0.1 + ')';
}

function getRandomBooleanValue() {
    return Math.random() < randomBooleanValueThreshold;
}

function download() {
    save(canvasExport, 'wallpaper', 'png');
}
