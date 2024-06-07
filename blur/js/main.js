const hoursElement = document.getElementById('hours');
const minutesElement = document.getElementById('minutes');
const secondsElement = document.getElementById('seconds');

let previousTime = null;

update();
setInterval(update, 100);

function update() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    let time = `${hours}:${minutes}:${seconds}`;
    if (previousTime !== time) {
        previousTime = time;

        hoursElement.textContent = hours;
        minutesElement.textContent = minutes;
        secondsElement.textContent = seconds;

        applyBlur(now);
    }
}

function applyBlur(now) {
    const hoursBlur = (now.getHours() / 24) * 20;
    const minutesBlur = (now.getMinutes() / 60) * 30;
    const secondsBlur = (now.getSeconds() / 60) * 30;

    hoursElement.style.filter = `blur(${hoursBlur}px)`;
    minutesElement.style.filter = `blur(${minutesBlur}px)`;
    secondsElement.style.filter = `blur(${secondsBlur}px)`;
}
