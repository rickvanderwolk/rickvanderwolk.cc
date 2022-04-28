const backgroundColor = 'white';
const canvasMargin = 20;
const maxNumberOfBlocks = 1000;

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

function getBlocks() {
    if (height > width) {
        size = width / 10;
    } else {
        size = width / 25;
    }
    currentXPosition = 0;
    currentYPosition = height - size;

    let blocks = [];
    for (let i = 0; i < maxNumberOfBlocks; i++) {
        const shouldDraw = getShouldDraw();

        let triedShapes = [];
        const maxShapes = 4;
        let drawn = false;

        if (shouldDraw === false) {
            continue;
        }

        while (
            drawn === false
            &&
            triedShapes.length < maxShapes
        ) {
            let shape = getRandomishShape(triedShapes);
            triedShapes.push(shape);

            let xSize = size;
            if (shape === 'bridge') {
                xSize = size * 2;
            } else if (
                shape === 'triangle'
                &&
                Math.random() > 0.75
            ) {
                xSize = size * 2;
            }

            let ySize = size;

            let potentialNewBlock = {
                x: currentXPosition,
                y: currentYPosition,
                xSize: xSize,
                ySize: ySize,
                color: getRandomishColor(shape),
                shape: shape
            };

            if (skipBlock(potentialNewBlock, blocks) === true) {
                shape = getRandomishShape(triedShapes);
                continue;
            }

            blocks.push(potentialNewBlock);

            drawn = true;
            currentXPosition = currentXPosition + xSize;
            if ((currentXPosition + xSize) > width) {
                currentXPosition = 0;
                currentYPosition = currentYPosition - size;
            }
        }

        if (drawn === false) {
            currentXPosition = currentXPosition + size;
            if ((currentXPosition + size) > width) {
                currentXPosition = 0;
                currentYPosition = currentYPosition - size;
            }
        }
    }

    /*
        Reverse order as bridges are drawn using a full circle.
        Rendering in normal order will display bottom half of the circle on top of the shape below.
    */
    return blocks.reverse();
}

function skipBlock(block, blocks) {
    if ((block.y - block.ySize) < 0) {
        return true;
    }
    if ((block.x + block.xSize) > width) {
        return true;
    }

    if (currentYPosition < (height - block.ySize)) {
        if (hasUnderlyingBlock(block, blocks) === false) {
            return true;
        }
    }

    return false;
}

function getShouldDraw() {
    // Increase the probability the higher the structure gets
    let probability = currentYPosition / height;

    // Increase probability of higher towers
    if (Math.random() > 0.5) {
        probability = (probability * 1.5);
    } else {
        probability = (probability * 1.25);
    }
    if (probability < 0.2) {
        probability = 0.2;
    }

    return Math.random() < (probability);
}

function hasUnderlyingBlock(block, blocks) {
    let supportBlockX = block.x;
    let supportBlockY = block.y + block.ySize;

    if (block.xSize === (size * 2)) {
        const foundSupportBlockLeft = getSupportingBlock(blocks, supportBlockX, supportBlockY, ['semi-circle', 'triangle']);
        const foundSupportBlockRight = getSupportingBlock(blocks, (supportBlockX + size), supportBlockY, ['semi-circle', 'triangle']);
        if (foundSupportBlockLeft && foundSupportBlockRight) {
            return true;
        }
        return getSupportingBlock(blocks, supportBlockX, supportBlockY, ['semi-circle', 'triangle'], true);
    } else {
        return getSupportingBlock(blocks, supportBlockX, supportBlockY, ['semi-circle', 'triangle']);
    }
}

function getSupportingBlock(blocks, x, y, ignoreShapes, extraWideBlock) {
    extraWideBlock = extraWideBlock || false;
    for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i];
        if (
            block.x === x
            &&
            block.y === y
            &&
            ignoreShapes.includes(block.shape) === false
            &&
            (
                extraWideBlock === false
                ||
                (
                    extraWideBlock === true
                    &&
                    block.xSize === (size * 2)
                )
            )
        ) {
            return true;
        }
    }
    return false;
}

function drawBridge(x, y, xSize, ySize, color) {
    fill(color);
    drawRectangle(x, y, xSize, ySize, color);
    drawCircle(x + (xSize / 8), y + (ySize / 3), (xSize / 4) * 3, (ySize * 1.5), backgroundColor);
}

function drawCircle(x, y, xSize, ySize, color) {
    fill(color);
    x = x + (xSize / 2);
    y = y + (ySize / 2);
    ellipse(x, y, xSize, ySize);
}

function drawRectangle(x, y, xSize, ySize, color) {
    fill(color);
    rect(x, y, xSize, ySize);
}

function drawSemiCircle(x, y, xSize, ySize, color) {
    y += (size / 2);
    drawCircle(x, y, xSize, ySize, color);
}

function drawSquare(x, y, xSize, ySize, color) {
    fill(color);
    rect(x, y, xSize, ySize);
}

function drawTriangle(x, y, xSize, ySize, color) {
    fill(color);

    const variants = ['left', 'right'];
    const variant = variants[Math.floor(Math.random() * variants.length)];
    let x1, y1, x2, y2, x3, y3;

    switch (variant) {
        case 'left':
            x1 = x;
            y1 = y;
            x2 = x + xSize;
            y2 = y + ySize;
            x3 = x;
            y3 = y + ySize;
            break;
        case 'right':
            x1 = x + xSize;
            y1 = y;
            x2 = x + xSize;
            y2 = y + ySize;
            x3 = x;
            y3 = y + ySize;
            break;
    }
    triangle(x1, y1, x2, y2, x3, y3);
}

function getRandomishColor(shape) {
    const coloredOnlyShapes = [
        'bridge',
        'semi-circle',
        'triangle',
    ];
    let colors = [
        '#429CDC',
        '#59BC7A',
        '#D14F53',
        '#EDCD69'
    ];
    if (coloredOnlyShapes.includes(shape) === false) {
        colors.push('#F0D2BE');
        colors.push('#F0D2BE');
        colors.push('#F0D2BE');
        colors.push('#F0D2BE');
    }
    return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomishShape(triedShapes) {
    /*
        Add some shapes multiple times to increase probability of that shape
        and decrease the probability of the other shapes
     */
    let shapes = [];
    if (triedShapes.includes('bridge') === false) {
        shapes.push('bridge');
        shapes.push('bridge');
        shapes.push('bridge');
    }
    if (triedShapes.includes('semi-circle') === false) {
        shapes.push('semi-circle');
    }
    if (triedShapes.includes('square') === false) {
        shapes.push('square');
        shapes.push('square');
        shapes.push('square');
        shapes.push('square');
        shapes.push('square');
        shapes.push('square');
        shapes.push('square');
        shapes.push('square');
        shapes.push('square');
    }
    if (triedShapes.includes('triangle') === false) {
        shapes.push('triangle');
        shapes.push('triangle');
        shapes.push('triangle');
    }
    return shapes[Math.floor(Math.random() * shapes.length)];
}

function draw() {
    background(backgroundColor);
    stroke(backgroundColor);

    blocks = getBlocks();
    for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i];
        switch (block.shape) {
            case 'bridge':
                drawBridge(block.x, block.y, block.xSize, block.ySize, block.color);
                break;
            case 'semi-circle':
                drawSemiCircle(block.x, block.y, block.xSize, block.ySize, block.color);
                break;
            case 'square':
                drawSquare(block.x, block.y, block.xSize, block.ySize, block.color);
                break;
            case 'triangle':
                drawTriangle(block.x, block.y, block.xSize, block.ySize, block.color);
                break;
        }
    }

    frameRate((1 / 60));
}
