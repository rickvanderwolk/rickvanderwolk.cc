const backgroundColor = 'black';
const canvasMargin = 20;
const maxNumberOfBlocks = 200;

let blocks = [];
let currentXPosition = 0;
let currentYPosition = 0;

let fillColor;
let size;

function setup () {
    initialise();
}

function windowResized () {
    initialise();
}

function initialise () {
    const cnv = createCanvas((window.innerWidth - canvasMargin), (window.innerHeight - canvasMargin));
    cnv.style('display', 'block');
    redraw();
}

function setBlocks () {
    size = width / 10;
    currentXPosition = 0;
    currentYPosition = height - size;
    blocks = getBlocks();
}

function getBlocks() {
    let blocks = [];
    for (let i = 0; i < maxNumberOfBlocks; i++) {
        let potentialNewBlock = {
            x: currentXPosition,
            y: currentYPosition,
            size: size,
            color: getRandomishColor(),
            shape: getRandomishShape()
        };

        if (skipBlock(potentialNewBlock, blocks) === false) {
            blocks.push(potentialNewBlock);
        }

        currentXPosition = currentXPosition + size;
        if ((currentXPosition + size) > width) {
            currentXPosition = 0;
            currentYPosition = currentYPosition - size;
        }
    }
    return blocks;
}

function skipBlock(block, blocks) {
    if ((block.y - size) < 0) {
        return true;
    }

    if (currentYPosition < (height - size)) {
        if (hasUnderlyingBlock(block, blocks) === false) {
            return true;
        }
    }

    // increase probability the higher the structure gets
    let probability = currentYPosition / height;

    // increase probability of higher towers
    if (Math.random() > 0.33) {
        probability = (probability * 1.5);
    } else {
        probability = (probability * 1.25);
    }
    if (probability < 0.2) {
        probability = 0.2;
    }
    
    return Math.random() > (probability);
}

function hasUnderlyingBlock(block, blocks) {
    let supportingBlockX = block.x;
    let supportingBlockY = (block.y + size);
    for (let i = 0; i < blocks.length; i++) {
        if (
            blocks[i].x === supportingBlockX
            &&
            blocks[i].y === supportingBlockY
            &&
            blocks[i].shape !== 'triangle'
        ) {
            return true;
        }
    }
    return false;
}

function drawRectangle(x, y, size, color) {
    fill(color);
    rect(x, y, size, size);
}

function drawCircle(x, y, size, color) {
    fill(color);
    x = x + (size / 2);
    y = y + (size / 2);
    ellipse(x, y, size, size);
}

function drawTriangle(x, y, size, color) {
    fill(color);
    const x1 = x + (size / 2);
    const y1 = y;
    const x2 = x + size;
    const y2 = y + size;
    const x3 = x;
    const y3 = y + size;
    triangle(x1, y1, x2, y2, x3, y3);
}

function getRandomishColor() {
    return 'hsla(' + Math.floor((Math.random() * 360)) + ', 100%, 50%, 1.0)';
}

function getRandomishShape() {
    // Add some shapes multiple times to increase chance to return that shape and decrease the chance of return the other shapes
    const shapes = [
        'rectangle',
        'rectangle',
        'rectangle',
        'circle',
        'circle',
        'triangle',
    ];
    return shapes[Math.floor(Math.random() * shapes.length)];
}

function draw() {
    setBlocks();

    background(backgroundColor);
    noStroke();

    for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i];
        if (block.shape === 'rectangle') {
            drawRectangle(block.x, block.y, block.size, block.color);
        } else if (block.shape === 'circle') {
            drawCircle(block.x, block.y, block.size, block.color);
        } else if (block.shape === 'triangle') {
            drawTriangle(block.x, block.y, block.size, block.color);
        }
    }

    frameRate((1 / 60));
}
