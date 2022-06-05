const canvasMargin = 20;

function setup () {
    initialise();
}

function windowResized () {
    initialise();
}

function mousePressed () {
    initialise();
}

function initialise () {
    createCanvas((window.innerWidth - canvasMargin), (window.innerHeight - canvasMargin));
}

function draw() {
    background(0);
    fill(119);
    textSize(32);
    text('HTML boilerplate p5.js', 20, 50);
}
