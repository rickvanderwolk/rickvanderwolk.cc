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
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    return `${hours}:${minutes}:${seconds}`;
}
