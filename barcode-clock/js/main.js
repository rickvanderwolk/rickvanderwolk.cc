let previousTime = null;

update();
setInterval(function () {
    update();
}, 100);

function update () {
    const time = getCurrentTime();
    if (time !== previousTime) {
        previousTime = time;
        JsBarcode(
            '#clock',
            time,
            {
                format: 'CODE128',
                width: 6,
                height: 110,
                displayValue: false,
                background: 'none',
                lineColor: 'white'
            }
        );
    }
}

function getCurrentTime () {
    const now = new Date();
    let hour = now.getHours();
    if (hour < 10) {
        hour = '0' + hour;
    }
    let minute = now.getMinutes();
    if (minute < 10) {
        minute = '0' + minute;
    }
    return String(hour) + ':' + String(minute);
}
