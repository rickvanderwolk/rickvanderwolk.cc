const colors = [
    '#263f60',
    '#75b7d1',
    '#ffffff',
    '#3882b1',
];

function setup () {
    initialise();
}

function windowResized () {
    initialise();
}

function initialise () {
    const cnv = createCanvas(window.innerWidth, window.innerHeight);
    cnv.style('display', 'block');
    redraw();
}

// thanks https://coderwall.com/p/ro4mda/js-random-number-range-increment
function getRandomValue(min, max, increment) {
    return Math.floor(Math.random() * (max - min) / increment) * increment + min;
}

function getRandomX() {
    const min = 0;
    const max = width;
    const increments = (width / 3);
    return getRandomValue(min, max, increments)
}

function getRandomY() {
    const min = 0;
    const max = height;
    const increments = (height / 3);
    return getRandomValue(min, max, increments)
}

function getRandomWidth() {
    const min = width / 3;
    const max = width;
    const increments = (width / 3);
    return getRandomValue(min, max, increments)
}

function getRandomHeight() {
    const min = height / 3;
    const max = height;
    const increments = (height / 3);
    return getRandomValue(min, max, increments)
}

function draw() {
    const shuffled = colors.sort(() => Math.random() - 0.5);

    noStroke();

    for (let i = 0; i < shuffled.length; i++) {
        const color = shuffled[i];
        if (i === 0) {
            background(color);
        } else {
            fill(color);
            rect(
                getRandomX(),
                getRandomY(),
                getRandomWidth(),
                getRandomHeight(),
            );
        }
    }

    noLoop();
}
