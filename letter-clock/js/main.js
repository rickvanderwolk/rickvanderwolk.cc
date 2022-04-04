const clockElement = document.getElementById('clock');

const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

let text = null;
let previousText = null;

update();
setInterval(update, 100);

function update () {
    let text = getText();
    if (text !== previousText) {
        previousText = text;
        clockElement.innerHTML = '<h1>' + text + '</h1>';
    }
}

function getText () {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    let text = getLettersFromNumber(hour) + ':' + getLettersFromNumber(minute)
    if (getLettersFromNumber(minute) === '') {
      text = getLettersFromNumber(hour);
    }
    return text.toUpperCase();
}

function getLettersFromNumber (number) {
    if (number > 52) {
      return letters[25] + letters[25] + letters[(number - 53)];
    } else if (number > 26) {
      return letters[25] + letters[(number - 27)];
    } else {
      return letters[(number - 1)] || '';
    }
}
