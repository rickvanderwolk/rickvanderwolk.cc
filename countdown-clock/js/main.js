const clockElement = document.getElementById('clock');

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

function getText() {
    const now = new Date();

    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    const diffMilliseconds = midnight - now;

    const hours = Math.floor(diffMilliseconds / 1000 / 60 / 60);
    const minutes = Math.floor((diffMilliseconds / 1000 / 60) % 60);
    const seconds = Math.floor((diffMilliseconds / 1000) % 60);

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}
