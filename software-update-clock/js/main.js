const hourIndicatorElement = document.getElementById('hour-indicator');
const minuteAndSecondIndicatorElement = document.getElementById('minute-and-second-indicator');

let previousHour = null;
let previousMinute = null;
let previousSecond = null;

update();
setInterval(function () {
    update();
}, 100);

function update () {
    let now = new Date();
    let currentHour = now.getHours();
    let currentMinute = now.getMinutes();
    let currentSecond = now.getSeconds();

    if (currentHour !== previousHour) {
        previousHour = currentHour;
        if (currentHour === 0) {
            hourIndicatorElement.innerText = 'Updates voorbereiden';
        } else {
            hourIndicatorElement.innerText = 'Update ' + currentHour + ' van 23 installeren';
        }
    }

    if (
        currentMinute !== previousMinute
        ||
        currentSecond !== previousSecond
    ) {
        previousMinute = currentMinute;
        previousSecond = currentSecond;

        let minuteText = '';
        let secondText = '';
        let text = '';

        if (currentMinute === 1) {
            minuteText = '1 minuut';
        } else if (currentMinute > 0) {
            minuteText = currentMinute + ' minuten';
        }

        if (currentSecond === 1) {
            secondText = '1 seconde';
        } else if (currentSecond > 0) {
            secondText = currentSecond + ' seconden';
        }

        if (minuteText !== '' && secondText !== '') {
            text = 'Ongeveer ' + minuteText + '  en ' + secondText + ' resterend';
        } else if (minuteText !== '') {
            text = 'Ongeveer ' + minuteText + ' resterend';
        } else if (secondText !== '') {
            text = 'Ongeveer ' + secondText + ' resterend';
        }

        minuteAndSecondIndicatorElement.innerText = text;
    }
}
