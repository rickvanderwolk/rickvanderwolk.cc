const clockElement = document.querySelector('#clock h1');

const latitude = 51.794210;
const longitude = 5.649180;

// De pagina is een verticaal vlak op het zuiden, de cijfers zweven er net
// boven. Hun hoogte boven dat vlak bepaalt hoe ver de schaduw valt.
const height = 0.03;
const maxLength = 0.25;

let previousTime = null;

update();
setInterval(update, 1000);

function update () {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const time = `${hours}:${minutes}`;
    if (previousTime !== time) {
        previousTime = time;
        clockElement.textContent = time;
    }

    clockElement.style.textShadow = getShadow(now);
}

function getShadow (now) {
    const sun = SunCalc.getPosition(now, latitude, longitude);
    const rgb = getComputedStyle(document.body).getPropertyValue('--shadow-rgb').trim();

    // Cosinus van de invalshoek op het vlak. Nul of minder betekent dat de zon
    // onder de horizon staat of achter het vlak langs schijnt: geen schaduw.
    const light = Math.cos(sun.azimuth) * Math.cos(sun.altitude);
    if (sun.altitude <= 0 || light <= 0) {
        return 'none';
    }

    let x = height * Math.tan(sun.azimuth);
    let y = height * Math.tan(sun.altitude) / Math.cos(sun.azimuth);

    const length = Math.hypot(x, y);
    if (length > maxLength) {
        x *= maxLength / length;
        y *= maxLength / length;
    }

    // Hoe verder de schaduw valt, hoe zachter de rand. Hoe schuiner het licht,
    // hoe zwakker het vlak verlicht wordt en hoe vager de schaduw.
    const blur = 0.02 + Math.min(length, maxLength) * 0.35;
    const alpha = 0.65 * light;

    return `${x.toFixed(4)}em ${y.toFixed(4)}em ${blur.toFixed(4)}em rgba(${rgb}, ${alpha.toFixed(3)})`;
}
