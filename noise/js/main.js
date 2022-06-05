// thanks https://genekogan.com/code/p5js-perlin-noise/

let size, randomFloatMin, randomFloatMax;

function setup() {
    initialise();
}

function windowResized () {
    initialise();
}

function initialise () {
    createCanvas(window.innerWidth, window.innerHeight);
    noStroke();
    frameRate(8);

    size = getRandomIntBetween(5, 10);
    randomFloatMin = getRandomFloatBetween(0.0005, 0.002);
    randomFloatMax = getRandomFloatBetween(0.009, 0.011);
}

function draw() {
    for (let x = 0; x <= width; x += size) {
        for (let y = 0; y <= height; y += size) {
            const random1 = getRandomFloatBetween(randomFloatMin, randomFloatMax);
            const random2 = getRandomFloatBetween(randomFloatMin, randomFloatMax);
            const color = 255 * noise(random1 * x, random2 * y);

            fill(color);
            rect(x, y, size, size);
        }
    }
}

function getRandomFloatBetween(min, max) {
    const str = (Math.random() * (max - min) + min).toFixed(2);
    return parseFloat(str);
}

function getRandomIntBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}
