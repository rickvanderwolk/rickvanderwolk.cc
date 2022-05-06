const clockElement = document.getElementById('clock');

let time = null;
let previousTime = null;

update();
setInterval(function () {
    update();
}, 100);

function update () {
    time = getCurrentTime();
    if (time !== previousTime) {
        previousTime = time;
        clockElement.innerHTML = '<h1>' + getText() + '</h1>';
    }
}

function getCurrentTime () {
    const now = new Date();
    return now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
}

function getText () {
    const now = new Date();
    let hour = getFizzBuzzValueFromNumber(now.getHours());
    if (parseInt(hour) < 10) {
        hour = '0' + hour;
    }
    let minute = getFizzBuzzValueFromNumber(now.getMinutes());
    if (parseInt(minute) < 10) {
        minute = '0' + minute;
    }
    let second = getFizzBuzzValueFromNumber(now.getSeconds());
    if (parseInt(second) < 10) {
        second = '0' + second;
    }
    return hour + ':' + minute + ':' + second;
}

function getFizzBuzzValueFromNumber (number) {
    if (number % 15 === 0) {
      return 'fizzbuzz';
    }
    if (number % 3 === 0) {
      return 'fizz';
    }
    if (number % 5 === 0) {
      return 'buzz';
    }
    return number;
}
