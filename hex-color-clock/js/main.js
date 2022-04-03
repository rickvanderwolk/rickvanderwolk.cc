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
        clockElement.innerHTML = '<h1>' + getHexFromRgb(time) + '</h1>';
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

function getHexFromRgb (rgbString) {
    const rgbArray = rgbString.split(', ');
    const red = parseInt(rgbArray[0]);
    const green = parseInt(rgbArray[1]);
    const blue = parseInt(rgbArray[2]);
    const rgb = (red << 16) | (green << 8) | (blue << 0);
    return '' + (0x1000000 + rgb).toString(16).slice(1);
}
