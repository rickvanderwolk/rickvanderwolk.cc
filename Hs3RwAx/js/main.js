const canvasMargin = 20;
const numberOfBars = 50;
const minPixelsPerFrame = 1;

let maxPixelsPerFrame = minPixelsPerFrame;
let barSize = null;
let bars = [];

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
        rect(bars[i].x, (0 - barSize), barSize,  barSize + bars[i].y);
    }
}

function getBars (bars) {
    let aBarHasBeenChanged = false;
    for (let i = 0; i < bars.length; i++) {
        if (bars[i].y < bars[i].max) {
            bars[i].y = bars[i].y + Math.floor(Math.random() * (maxPixelsPerFrame - minPixelsPerFrame) + minPixelsPerFrame);
            aBarHasBeenChanged = true;
        }
    }

    if (aBarHasBeenChanged) {
        return bars;
    } else {
        fill(getRandomishColor());
        return getNewBars();
    }
}

function getNewBars () {
    let bars = [];

    let max = null;
    for (let i = 0; i < numberOfBars; i++) {
        if (Math.random() > 0.9) {
            max = Math.floor(Math.random() * (height - 0) + 0);
        } else {
            max = Math.floor(Math.random() * ((height / 6 * 3) - 0) + 0);
        }
        bars.push({
            x: (width / numberOfBars) * i,
            y: 0,
            max: max
        });
    }

    return bars;
}

function getRandomishColor () {
    return 'hsla(' + Math.floor((Math.random() * 360)) + ', 100%, 50%, 1.0)';
}
