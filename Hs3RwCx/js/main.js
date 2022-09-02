const canvasMargin = 0;
const numberOfBars = 50;
const minPixelsPerFrame = 1;

let maxPixelsPerFrame = minPixelsPerFrame;
let barSize = null;
let bars = [];
let currentColor = null;

let colors = [
    // Some colors multiple times to increase probability
    '#FFFFFF',
    '#FFFFFF',
    '#FFFFFF',
    '#293462',
    '#1CD6CE',
    '#FEDB39',
    '#D61C4E',
];

function setup () {
    initialise();
}

function windowResized () {
    initialise();
}

function initialise () {
    createCanvas((window.innerWidth - canvasMargin), (window.innerHeight - canvasMargin));
    noStroke();

    maxPixelsPerFrame = (height / numberOfBars);
    barSize = width / numberOfBars;
}

function draw() {
    bars = getBars(bars);

    for (let i = 0; i < bars.length; i++) {
        rect(bars[i].x, height / 2, barSize, bars[i].yTop - (height / 2));
        rect(bars[i].x, height / 2, barSize, bars[i].yBottom - (height / 2));
    }
}

function getBars (bars) {
    let add = 0;
    let aBarHasBeenChanged = false;
    for (let i = 0; i < bars.length; i++) {
        add = Math.floor(Math.random() * (maxPixelsPerFrame - minPixelsPerFrame) + minPixelsPerFrame);

        if (bars[i].yBottom > bars[i].maxBottom) {
            bars[i].yBottom -= add;
            aBarHasBeenChanged = true;
        }

        add = Math.floor(Math.random() * (maxPixelsPerFrame - minPixelsPerFrame) + minPixelsPerFrame);
        if (bars[i].yTop < bars[i].maxTop) {
            bars[i].yTop += add;
            aBarHasBeenChanged = true;
        }
    }

    if (aBarHasBeenChanged) {
        return bars;
    } else {
        currentColor = getRandomishColor(currentColor);
        fill(currentColor);
        return getNewBars();
    }
}

function getNewBars () {
    let bars = [];
    const minFactor = 4;
    const maxFactor = 2;

    let maxTop = 0;
    let maxBottom = 0;

    for (let i = 0; i < numberOfBars; i++) {

        if (Math.random() > 0.9) {
            maxTop = getRandomNumberBetween((height / 2) + minPixelsPerFrame, (height / 2) + (height / maxFactor));
            maxBottom = getRandomNumberBetween((height / 2) - minPixelsPerFrame, (height / 2) - (height / maxFactor));
        } else {
            maxTop = getRandomNumberBetween((height / 2) + minPixelsPerFrame, (height / 2) + (height / minFactor));
            maxBottom = getRandomNumberBetween((height / 2) - minPixelsPerFrame, (height / 2) - (height / minFactor));
        }

        bars.push({
            x: (width / numberOfBars) * i,
            yTop: (height / 2),
            yBottom: (height / 2),
            maxTop: maxTop,
            maxBottom: maxBottom,
        });
    }

    return bars;
}

function getRandomishColor (excludeColor) {
    excludeColor = excludeColor || null;
    const filteredColors = colors.filter(value => {
        return value !== excludeColor;
    })
    return filteredColors[Math.floor(Math.random() * filteredColors.length)];
}

function getRandomNumberBetween(min,max){
    return Math.floor(Math.random()*(max-min+1)+min);
}
