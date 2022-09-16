const clockElement = document.getElementById('clock');

let previousText = null;

update();
setInterval(function () {
    update();
}, 33);

function update () {
    const text = getBinaryFromText(getText());
    if (text !== previousText) {
        previousText = text;
        const elements = clockElement.getElementsByTagName('p');
        if (elements.length > 100) {
          clockElement.removeChild(elements[0]);
        }
        clockElement.innerHTML += '<p>' + text + '</p>';
        window.scrollTo(0,document.body.scrollHeight);
    }
}


function getText () {
    const now = new Date();
    let hour = now.getHours();
    if (parseInt(hour) < 10) {
        hour = '0' + hour;
    }
    let minute = now.getMinutes();
    if (parseInt(minute) < 10) {
        minute = '0' + minute;
    }
    let second = now.getSeconds();
    if (parseInt(second) < 10) {
        second = '0' + second;
    }
    return hour + ':' + minute + ':' + second + '.' + getMillis();
}

function getMillis () {
    const date = new Date();
    const seconds = Math.floor(Date.now() / 1000) * 1000;
    let millis = date.valueOf() - seconds;
    if (millis < 10) {
        return '00' + millis;
    }
    if (millis < 100) {
        return '0' + millis;
    }
    return millis;
}

// thanks https://stackoverflow.com/questions/14430633/how-to-convert-text-to-binary-code-in-javascript
function getBinaryFromText(text) {
    return text.split('').map(function (char) {
        return char.charCodeAt(0).toString(2);
    }).join(' ');
}
