const clockElement = document.getElementById('clock');

let time = null;
let previousTime = null;

update();
setInterval(function () {
    update();
}, 100);

function update () {
    const time = getCurrentTime();
    if (time !== previousTime) {
        previousTime = time;
        clockElement.innerHTML = '<h1>' + time + '</h1>';
    }
}

function getCurrentTime() {
    const now = new Date();
    const hour = now.getHours();
    const secondsIntoHour = now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
    const decimal = (secondsIntoHour / 3600).toFixed(2).split('.')[1];
    return hour + ',' + decimal;
}
