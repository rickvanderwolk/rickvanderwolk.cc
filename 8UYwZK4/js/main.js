const bodyElement = document.body;
const clockElement = document.getElementById('clock');

const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

let previousTime = null;
let currentHour = null;
let currentHourLeft = null;
let nextHour = null;
let nextHourLeft = null;

update();
setInterval(function () {
    update();
}, 100);
window.onresize = forceUpdate;

function forceUpdate () {
    update(true);
}

function update (forceUpdate) {
    forceUpdate = forceUpdate || false;
    const time = getCurrentTime();

    if (forceUpdate || time !== previousTime) {
        previousTime = time;

        const currentMinute = getCurrentMinute();
        currentHour = getCurrentHour();
        currentHourLeft = (60 - parseInt(currentMinute));
        nextHour = getNextHour(currentHour)
        nextHourLeft = currentMinute;

        let html = '<h1>';
        for (let i = 0; i < hours.length; i++) {
            html += '<span style="font-size: ' + getFontSize(hours[i]) + '">' + hours[i] + '</span>';
        }
        html += '</h1>'
        clockElement.innerHTML = html;
    }
}

function getCurrentTime() {
    return getCurrentHour()+':'+getCurrentMinute();
}

function getCurrentHour() {
    const now = new Date();
    let hour = now.getHours();
    if (hour > 12) {
        hour = hour - 12;
    } else if (hour === 0) {
        hour = 12;
    }
    return hour;
}

function getCurrentMinute() {
    const now = new Date();
    return now.getMinutes();
}

function getNextHour(hour) {
    hour = hour + 1;
    if (hour > 12) {
        hour = 1;
    }
    return hour;
}

function getFontSize (hour) {
    let base = 14;
    let margin = 1.25;
    if (window.matchMedia('(orientation: portrait)').matches) {
        base = 1;
        margin = 1.1;
    }
    if (hour === parseInt(currentHour)) {
        return `${parseInt((currentHourLeft * margin) + base)}px`
    } else if (hour === parseInt(nextHour)) {
        return `${parseInt((nextHourLeft * margin) + base)}px`
    }
    return `${parseInt(base)}px`
}
