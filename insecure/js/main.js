const clockElement = document.getElementById('clock');

const numberOfTimesTimesShouldBeCheckedJustToMakeSure = 99;
let numberOfTimesChecked = 0;
let previousTime = null;

function update() {
    const currentTime = getTime();
    if (currentTime === previousTime) {
        numberOfTimesChecked++;
        if (numberOfTimesChecked >= numberOfTimesTimesShouldBeCheckedJustToMakeSure) {
            clockElement.innerText = currentTime;
            numberOfTimesChecked = 0;
        }
    } else {
        clockElement.innerText = '';
        numberOfTimesChecked = 0;
    }
    previousTime = currentTime;

    const delay = Math.floor(Math.random() * 10) + 1;
    setTimeout(update, delay);
}

function getTime() {
    const now = new Date();
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const second = now.getSeconds().toString().padStart(2, '0');
    return `${hour}:${minute}:${second}`;
}

update();
