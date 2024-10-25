const hoursElement = document.getElementById('hours');
const minutesElement = document.getElementById('minutes');

let previousHours = null;
let previousMinutes = null;
let previousHourRotation = null;
let previousMinuteRotation = null;

update();
setInterval(update, 100);

function update() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const hourRotation = (now.getMinutes() / 60) * 360;
    const minuteRotation = (now.getSeconds() / 60) * 360;

    if (hours !== previousHours) {
        hoursElement.textContent = hours;
        previousHours = hours;
    }

    if (minutes !== previousMinutes) {
        minutesElement.textContent = minutes;
        previousMinutes = minutes;
    }

    if (hourRotation !== previousHourRotation) {
        hoursElement.style.transform = `rotate(${hourRotation}deg)`;
        previousHourRotation = hourRotation;
    }

    if (minuteRotation !== previousMinuteRotation) {
        minutesElement.style.transform = `rotate(${minuteRotation}deg)`;
        previousMinuteRotation = minuteRotation;
    }
}
