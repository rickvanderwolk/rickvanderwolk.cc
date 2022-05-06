const clockElement = document.getElementById('clock');

const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const minutes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59];

let time = null;
let previousTime = null;

let currentHour = null;
let previousHour = null;
let currentMinute = null;
let previousMinute = null;

update();
setInterval(function () {
    update();
}, 100);

function render () {
    let html = '<table><tbody>';
    for (let i = 0; i < hours.length; i++) {
        html += '<tr>';
        html += '<td>';
        let hourText = hours[i];
        if (hourText < 10) {
            hourText = '0' + hours[i];
        }
        if (hours[i] === currentHour) {
            html += '<span style="color: #FFF">' + hourText + '</span>';
        } else {
            html += '<span style="color: #333">' + hourText + '</span>';
        }
        html += '</td>';
        for (let j = 0; j < minutes.length; j++) {
            let minuteText = minutes[j];
            if (minuteText < 10) {
                minuteText = '0' + minutes[j];
            }
            html += '<td>';
            if (hours[i] === currentHour && minutes[j] === currentMinute) {
                html += '<span style="color: #FFF">' + minuteText + '</span>';
            } else {
                html += '<span style="color: #333">' + minuteText + '</span>';
            }
            html += '</td>';
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    clockElement.innerHTML = html;
}

function update () {
    currentHour = getCurrentHour();
    currentMinute = getCurrentMinute();
    if (currentHour !== previousHour || currentMinute !== previousMinute) {
        render();
    }
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
