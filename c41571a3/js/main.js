let initialRender = true;

function setup() {
    createCanvas(windowWidth, windowHeight);
    angleMode(DEGREES);
    frameRate(1);
    renderClock();
}

function draw() {
    if (!initialRender) {
        renderClock();
    }
    initialRender = false;
}

function renderClock() {
    background(0);
    translate(width / 2, height / 2);

    let h = hour() % 12;
    let m = minute();
    let s = second();

    let baseAngle = 360 / 12;
    let radius = min(width, height) / 3;

    let colors = [
        '#FF6347', '#FFA07A', '#FFD700', '#ADFF2F',
        '#32CD32', '#00FA9A', '#00CED1', '#1E90FF',
        '#4169E1', '#8A2BE2', '#DA70D6', '#FF69B4'
    ];

    for (let i = 0; i < 12; i++) {
        if (i <= h) {
            let startAngle = -90 + i * baseAngle;
            let endAngle = startAngle + baseAngle;
            let r = radius;

            if (i === h || h === 12) {
                endAngle = startAngle + baseAngle * (m / 60);
            }

            fill(colors[i % colors.length]);
            noStroke();

            if ((h === 12 && i === 0) || (h !== 12 && i <= h)) {
                arc(0, 0, r * 2, r * 2, startAngle, endAngle, PIE);
            }
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
