let hourBalls = [];
let minuteBalls = [];
let secondBalls = [];

let previousHour = 0;
let previousMinute = 0;
let previousSecond = 0;

function setup() {
    createCanvas(window.innerWidth, window.innerHeight);
}

function getNow() {
    return new Date();
}

function draw() {
    background(0);
    noStroke();

    const now = getNow();

    const currentHour = now.getHours();
    hourBalls = updateBalls(hourBalls, currentHour, 23, previousHour);
    previousHour = currentHour;
    drawBalls(hourBalls, '#ff0000');

    let currentMinute = now.getMinutes();
    minuteBalls = updateBalls(minuteBalls, currentMinute, 59, previousMinute);
    previousMinute = currentMinute;
    drawBalls(minuteBalls, '#00ff00');

    const currentSecond = now.getSeconds();
    secondBalls = updateBalls(secondBalls, currentSecond, 59, previousSecond);
    previousSecond = currentSecond;
    drawBalls(secondBalls, '#0000ff');
}

function drawBalls(balls, color) {
    fill(color);
    for (let i = balls.length - 1; i >= 0; i--) {
        let ball = balls[i];
        if (ball.remove && ball.y >= height) {
            balls.splice(i, 1);
        } else {
            ellipse((ball.x + parseInt(ball.size / 2)), ball.y, ball.size, ball.size);
        }
    }
}

function getRandomIncrement(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function updateBalls(balls, currentValue, max, prevValue) {
    const size = window.innerWidth / max;

    while (balls.length < currentValue) {
        balls.push({
            x: balls.length * size,
            y: 0,
            movingDown: true,
            size: size,
            remove: false
        });
    }

    if (currentValue < prevValue) {
        for (let i = currentValue; i < balls.length; i++) {
            balls[i].remove = true;
        }
    }

    let increment;
    for (let ball of balls) {
        increment = getRandomIncrement(5, 25);

        if (ball.remove) {
            ball.y += increment;
        } else if (ball.movingDown) {
            ball.y += increment;
            if (ball.y >= height - ball.size) {
                ball.movingDown = false;
            }
        } else {
            ball.y -= increment;
            if (ball.y <= ball.size) {
                ball.movingDown = true;
            }
        }
    }

    return balls;
}
