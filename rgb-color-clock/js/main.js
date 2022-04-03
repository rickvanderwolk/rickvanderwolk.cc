const bodyElement = document.body;
const clockElement = document.getElementById('clock-color');

let previousTime = null;

update();
setInterval(update, 100);

function update () {
    let time = getCurrentTime();
    if (time !== previousTime) {
        previousTime = time;
        bodyElement.style.backgroundColor = 'rgb(' + time + ')';
        clockElement.innerHTML = '<h1>' + time + '</h1>';
    }
}

function getCurrentTime () {
    const now = new Date();
    let second = now.getSeconds();
    if (second < 10) {
        second = '0' + second;
    }
    let hour = now.getHours();
    if (hour < 10) {
        hour = '0' + hour;
    }
    let minute = now.getMinutes();
    if (minute < 10) {
        minute = '0' + minute;
    }
    return String(hour) + ', ' + String(minute) + ', ' + String(second);
}
