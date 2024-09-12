let x = 0.01, y = 0, z = 0;
let a = 10, b = 28, c = 8.0 / 3.0;
let dt = 0.01;

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(0);
}

function draw() {
    let dx = (a * (y - x)) * dt;
    let dy = (x * (b - z) - y) * dt;
    let dz = (x * y - c * z) * dt;

    x += dx;
    y += dy;
    z += dz;

    let px = map(x, -20, 20, 0, width);
    let py = map(y, -30, 30, height, 0);

    stroke(255);
    strokeWeight(2);
    point(px, py);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
