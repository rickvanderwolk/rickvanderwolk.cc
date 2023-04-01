let time = null;
let previousTime = null;

update();
setInterval(function () {
    update();
}, 100);

function update () {
    const time = getTime();
    if (time !== previousTime) {
        previousTime = time;
        document.title = time;
    }
}

function getTime () {
    const now = new Date();

    let hour = now.getHours();
    if (hour < 10) {
        hour = '0' + hour;
    }
    let minute = now.getMinutes();
    if (minute < 10) {
        minute = '0' + minute;
    }
    let second = now.getSeconds();
    if (second < 10) {
        second = '0' + second;
    }

    return String(hour) + ':' + String(minute) + ':' + String(second);
}
