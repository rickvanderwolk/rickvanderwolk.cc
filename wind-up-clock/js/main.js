// thanks for the clock, https://p5js.org/examples/input-clock.html
let cx, cy;
let secondsRadius;
let minutesRadius;
let hoursRadius;
let clockDiameter;

let numberOfTicksLeft = null;
let clockUnixTimestamp = null;
let realUnixTimestamp = null;
let previousRealTimestamp = null;

function setup() {
    const canvas = createCanvas(400, 450);
    stroke(255);

    let radius = min(width, height) / 2;
    secondsRadius = radius * 0.71;
    minutesRadius = radius * 0.6;
    hoursRadius = radius * 0.5;
    clockDiameter = radius * 1.7;

    cx = width / 2;
    cy = height / 2 - (75 / 2);

    canvas.mousePressed(increaseNumberOfTicksLeft);
    cursor(HAND);

    init();
}

window.onfocus = function () {
    init();
}

function init () {
    const storedNumberOfTicksLeft = localStorage.getItem('numberOfTicksLeft');
    if (storedNumberOfTicksLeft) {
        setNumberOfTicksLeft(parseInt(storedNumberOfTicksLeft));
    } else {
        setNumberOfTicksLeft(10);
    }

    const storedClockUnixTimestamp = localStorage.getItem('clockUnixTimestamp');
    const storedRealUnixTimestamp = localStorage.getItem('realUnixTimestamp');
    if (
        storedRealUnixTimestamp
        &&
        storedRealUnixTimestamp
    ) {
        if (parseInt(storedRealUnixTimestamp) < parseInt(getUnixTimestamp())) {
            let difference = parseInt(getUnixTimestamp()) - parseInt(storedRealUnixTimestamp);
            if (parseInt(numberOfTicksLeft) > parseInt(difference)) {
                setClockUnixTimestamp(parseInt(storedClockUnixTimestamp) + parseInt(difference))
                setNumberOfTicksLeft(parseInt(numberOfTicksLeft) - parseInt(difference));
            } else {
                setClockUnixTimestamp(parseInt(storedClockUnixTimestamp) + parseInt(numberOfTicksLeft))
                setNumberOfTicksLeft(0);
            }
        } else {
            setClockUnixTimestamp(parseInt(storedClockUnixTimestamp));
        }
        setRealUnixTimestamp(getUnixTimestamp());
    } else {
        setClockUnixTimestamp(getUnixTimestamp());
        setRealUnixTimestamp(getUnixTimestamp());
    }
}

function draw() {
    if (!isNaN(previousRealTimestamp) && (realUnixTimestamp - previousRealTimestamp) > 1) {
        init();
    } else {
        tick();
    }

    background(255);

    // Draw the clock background
    noStroke();
    fill(0);
    ellipse(cx, cy, clockDiameter + 25, clockDiameter + 25);
    fill(255);
    ellipse(cx, cy, clockDiameter, clockDiameter);

    // Angles for sin() and cos() start at 3 o'clock;
    // subtract HALF_PI to make them start at the top
    let s = map(getSecond(), 0, 60, 0, TWO_PI) - HALF_PI;
    let m = map(getMinute() + norm(second(), 0, 60), 0, 60, 0, TWO_PI) - HALF_PI;
    let h = map(getHour() + norm(minute(), 0, 60), 0, 24, 0, TWO_PI * 2) - HALF_PI;

    // Draw the hands of the clock
    stroke(0);
    strokeWeight(1);
    line(cx, cy, cx + cos(s) * secondsRadius, cy + sin(s) * secondsRadius);
    strokeWeight(2);
    line(cx, cy, cx + cos(m) * minutesRadius, cy + sin(m) * minutesRadius);
    strokeWeight(4);
    line(cx, cy, cx + cos(h) * hoursRadius, cy + sin(h) * hoursRadius);

    strokeWeight(0);
    fill(0);
    textSize(25);
    text(numberOfTicksLeft, cx - (25 * String(numberOfTicksLeft).length) / 4, 425);

    // Draw the minute ticks
    strokeWeight(2);
    beginShape(POINTS);
    for (let a = 0; a < 360; a += 6) {
        let angle = radians(a);
        let x = cx + cos(angle) * secondsRadius;
        let y = cy + sin(angle) * secondsRadius;
        vertex(x, y);
    }
    endShape();
}

function getUnixTimestamp () {
    return Math.floor(Date.now() / 1000);
}

function tick () {
    realUnixTimestamp = getUnixTimestamp();
    if (previousRealTimestamp === realUnixTimestamp) {
        return;
    }

    previousRealTimestamp = realUnixTimestamp;
    setRealUnixTimestamp(realUnixTimestamp);

    if (numberOfTicksLeft > 0) {
        setClockUnixTimestamp(clockUnixTimestamp + 1);
        setNumberOfTicksLeft(numberOfTicksLeft - 1);
    }
}

function setRealUnixTimestamp (value) {
    realUnixTimestamp = value;
    localStorage.setItem("realUnixTimestamp", String(realUnixTimestamp));
}

function setClockUnixTimestamp (value) {
    clockUnixTimestamp = value;
    localStorage.setItem("clockUnixTimestamp", String(clockUnixTimestamp));
}

function setNumberOfTicksLeft (value) {
    numberOfTicksLeft = value;
    localStorage.setItem("numberOfTicksLeft", String(numberOfTicksLeft));
}

function increaseNumberOfTicksLeft () {
    numberOfTicksLeft++;
    localStorage.setItem("numberOfTicksLeft", String(numberOfTicksLeft));
}

function getHour () {
    const now = new Date(clockUnixTimestamp * 1000);
    return now.getHours();
}

function getMinute () {
    const now = new Date(clockUnixTimestamp * 1000);
    return now.getMinutes();
}

function getSecond () {
    const now = new Date(clockUnixTimestamp * 1000);
    return now.getSeconds();
}
