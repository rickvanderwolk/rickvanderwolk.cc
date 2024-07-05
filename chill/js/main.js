const clockElement = document.getElementById('clock');

let previousText = null;

update();
setInterval(update, 1000);

function update () {
    const text = getText();
    if (text !== previousText) {
        previousText = text;
        clockElement.innerText = text;
    }
}

function getText () {
    const now = new Date();
    const closestSevenAndAHalf = Math.floor(now.getMinutes() / 7.5) * 7.5;
    const currentHour = getHourText(now.getHours());
    const nextHour = getHourText(now.getHours() + 1);
    let time = '';

    switch (closestSevenAndAHalf) {
        case 0:
            time = `ongeveer ${currentHour} uur`;
            break;
        case 7.5:
        case 15:
            time = `ongeveer kwart over ${currentHour}`;
            break;
        case 22.5:
        case 30:
            time = `ongeveer half ${nextHour}`;
            break;
        case 37.5:
        case 45:
            time = `ongeveer kwart voor ${nextHour}`;
            break;
        case 52.5:
            time = `ongeveer ${nextHour} uur`;
            break;
    }

    return `Het is ${time}`;
}

function getHourText(hour) {
    switch (parseInt(hour)) {
        case 0:
        case 12:
        case 24:
            return 'twaalf';
        case 1:
        case 13:
            return 'één'
        case 2:
        case 14:
            return 'twee';
        case 3:
        case 15:
            return 'drie';
        case 4:
        case 16:
            return 'vier';
        case 5:
        case 17:
            return 'vijf';
        case 6:
        case 18:
            return 'zes';
        case 7:
        case 19:
            return 'zeven';
        case 8:
        case 20:
            return 'acht'
        case 9:
        case 21:
            return 'negen';
        case 10:
        case 22:
            return 'tien';
        case 11:
        case 23:
            return 'elf';
    }
}
