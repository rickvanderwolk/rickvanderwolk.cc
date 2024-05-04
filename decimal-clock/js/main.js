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
    const minute = now.getMinutes();
    const decimalMinute = (minute / 60).toFixed(2).split('.')[1];
    return hour + ',' + decimalMinute;
}
