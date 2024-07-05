const clockElement = document.getElementById('clock');

let previousText = null;

update();
setInterval(update, 1000);

function update() {
    const text = getText();
    if (text !== previousText) {
        previousText = text;
        clockElement.innerText = text;
    }
}

function getText() {
    const now = new Date();
    const closestSevenAndAHalf = Math.floor(now.getMinutes() / 7.5) * 7.5;
    const currentHour = getHourText(now.getHours());
    const nextHour = getHourText(now.getHours() + 1);
    const isDutch = getIsDutch();
    let time = '';

    switch (closestSevenAndAHalf) {
        case 0:
            time = isDutch ? `ongeveer ${currentHour} uur` : `about ${currentHour} o'clock`;
            break;
        case 7.5:
        case 15:
            time = isDutch ? `ongeveer kwart over ${currentHour}` : `about a quarter past ${currentHour}`;
            break;
        case 22.5:
        case 30:
            time = isDutch ? `ongeveer half ${nextHour}` : `about half past ${currentHour}`;
            break;
        case 37.5:
        case 45:
            time = isDutch ? `ongeveer kwart voor ${nextHour}` : `about a quarter to ${nextHour}`;
            break;
        case 52.5:
            time = isDutch ? `ongeveer ${nextHour} uur` : `about ${nextHour} o'clock`;
            break;
    }

    return isDutch ? `Het is ${time}` : `It is ${time}`;
}

function getHourText(hour) {
    const isDutch = getIsDutch();

    switch (parseInt(hour)) {
        case 0:
        case 12:
        case 24:
            return isDutch ? 'twaalf' : 'twelve';
        case 1:
        case 13:
            return isDutch ? 'één' : 'one';
        case 2:
        case 14:
            return isDutch ? 'twee' : 'two';
        case 3:
        case 15:
            return isDutch ? 'drie' : 'three';
        case 4:
        case 16:
            return isDutch ? 'vier' : 'four';
        case 5:
        case 17:
            return isDutch ? 'vijf' : 'five';
        case 6:
        case 18:
            return isDutch ? 'zes' : 'six';
        case 7:
        case 19:
            return isDutch ? 'zeven' : 'seven';
        case 8:
        case 20:
            return isDutch ? 'acht' : 'eight';
        case 9:
        case 21:
            return isDutch ? 'negen' : 'nine';
        case 10:
        case 22:
            return isDutch ? 'tien' : 'ten';
        case 11:
        case 23:
            return isDutch ? 'elf' : 'eleven';
    }
}

function getIsDutch() {
    const lang = navigator.language || navigator.userLanguage;
    return lang.startsWith('nl');
}
