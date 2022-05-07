function setup () {
    createCanvas(window.innerWidth, window.innerHeight);
}

function windowResized () {
    resizeCanvas(window.innerWidth, window.innerHeight);
}

function draw () {
    const now = new Date();
    let barHeight = height / 10;
    if (height > width) {
        barHeight = height / 20;
    }
    const barWidth = width - (width / 5);
    const barOffsetTop = (height - barHeight) / 2;
    const barOffsetLeft = (width - barWidth) / 2;

    background(0);
    noStroke();

    fill(85);
    rect(barOffsetLeft, barOffsetTop, barWidth, barHeight);

    fill(170);
    const hourProgress = getHourProgress(now);
    const hourProgressInPixels = parseInt(hourProgress * barWidth);
    rect(barOffsetLeft, barOffsetTop, hourProgressInPixels, barHeight);

    fill(255);
    const minuteProgress = getMinuteProgress(now);
    const minuteProgressInPixels = parseInt(minuteProgress * hourProgressInPixels);
    rect(barOffsetLeft, barOffsetTop, minuteProgressInPixels, barHeight);
}

function getElapsedMillisecondsToday (date) {
    let totalSecondsElapsed = 0;

    totalSecondsElapsed += (date.getHours() * 3600);
    totalSecondsElapsed += (date.getMinutes() * 60);
    totalSecondsElapsed += date.getSeconds();

    return (totalSecondsElapsed * 1000) + date.getMilliseconds();
}

function getElapsedMillisecondsCurrentMinute (date) {
    return (date.getSeconds() * 1000) + date.getMilliseconds();
}

function getHourProgress (date) {
    const totalMillisecondsInADay = (86400 * 1000);
    return (getElapsedMillisecondsToday(date) / totalMillisecondsInADay);
}

function getMinuteProgress (date) {
    const totalMillisecondsInAMinute = (60 * 1000);
    return getElapsedMillisecondsCurrentMinute(date) / totalMillisecondsInAMinute;
}
