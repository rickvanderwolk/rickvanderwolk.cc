let canvas;
let centerX, centerY;
let osc, sound;
let started = false;

function setup() {
    initialise();
}

function windowResized() {
    initialise();
}

function initialise() {
    createCanvas(window.innerWidth, window.innerHeight);

    centerX = width / 2;
    centerY = height / 2;

    if (!started) {
        canvas = createCanvas(windowWidth, windowHeight);
        fill(255);
        textSize(32);
        textAlign(CENTER);
        text('Click to start', (width / 2), (height / 2));
        canvas.mousePressed(start);
    }
}

function draw() {
    if (started) {
        background(0);
        noStroke();

        const millis = getMillis();
        if (millis >= 750) {
            osc.freq(getFrequencyFor('second'));
        } else if (millis >= 500) {
            osc.freq(getFrequencyFor('minute'));
        } else if (millis >= 250) {
            osc.freq(getFrequencyFor('hour'));
        } else {
            osc.freq(0);
        }
    }
}

function start () {
    if (!started) {
        osc = new p5.Oscillator();
        osc.freq(0);
        osc.setType('sine');
        osc.amp(0.5);
        osc.start();
        started = true;
    }
}

function getMillis () {
    const date = new Date();
    const seconds = Math.floor(Date.now() / 1000) * 1000;
    return date.valueOf() - seconds;
}

function getFrequencyFor(unit) {
    const minFrequency = 50;
    const maxFrequency = 1000;
    if (unit === 'hour') {
        return Math.round((hour() / 24) * (maxFrequency - minFrequency)) + minFrequency;
    } else if (unit === 'minute') {
        return Math.round((minute() / 60) * (maxFrequency - minFrequency)) + minFrequency;
    } else if (unit === 'second') {
        return Math.round((second() / 60) * (maxFrequency - minFrequency)) + minFrequency;
    }
}
