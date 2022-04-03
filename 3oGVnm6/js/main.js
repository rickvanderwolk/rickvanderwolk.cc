let mic, fft;
let started = false;
let canvas;
let centerX, centerY;
let position = [];

const colorMax = 16777216;

function setup() {
    initialise();
}

function windowResized() {
    initialise();
}

function initialise() {
    createCanvas(window.innerWidth, window.innerHeight);

    for (let i = 0; i < 1024; i++) {
        position.push((width / 1024) * i);
    }
    position = shuffle(position);

    centerX = width / 2;
    centerY = height / 2;

    let canvas = createCanvas(windowWidth, windowHeight);
    fill(255);
    textSize(32);
    textAlign(CENTER);
    text('Click to start', (width / 2), (height / 2));
    canvas.mousePressed(start);
}

function draw() {
    if (started) {
        background(0);
        noStroke();

        const spectrum = fft.analyze();
        const numberOfItems = 1024;

        for (let i = 0; i < numberOfItems; i ++) {

            let temp = Math.floor((colorMax / 150) * spectrum[i]);
            let color = getRgbColorFromDecimalNumber(temp);

            fill(color[0], color[1], color[2]);

            if (spectrum[i] > 0) {
                const x = position[i];
                const y = (height / 255) * spectrum[i];
                const rectWidth = spectrum[i];
                const rectHeight = (height / 255) * spectrum[i];
                rect(x, y, rectWidth, rectHeight);
            }
        }
    }
}

function getRandomishColor() {
    return 'hsla(' + Math.floor((Math.random() * 360)) + ', 100%, 50%, 1.0)';
}

function start () {
    mic = new p5.AudioIn();
    mic.start();
    fft = new p5.FFT();
    fft.setInput(mic);
    started = true;
}

function touchStarted() {
    getAudioContext().resume();
}

function getRgbColorFromDecimalNumber (decimalNumber) {
    let r = 0;
    let g = 0;
    let b = decimalNumber;
    if (b > 255) {
        g = Math.floor(decimalNumber / 256);
        b = decimalNumber - (g * 256);
    }
    if (g > 255) {
        r = Math.floor((decimalNumber / 256) / 256);
        g = g - (r * 256);
    }
    return [r, g, b];
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    let currentIndex = array.length;
    let randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex > 0) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
}
