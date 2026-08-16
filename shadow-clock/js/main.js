const clockElement = document.querySelector('#clock h1');

const latitude = 51.794210;
const longitude = 5.649180;

// De pagina is de grond, van bovenaf gezien met het noorden boven. De cijfers
// zweven er net boven; die hoogte bepaalt hoe ver hun schaduw valt.
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

    if (sun.altitude <= 0) {
        return 'none';
    }

    // Lengte van een schaduw op vlakke grond, en de richting van de zon af.
    // Azimut telt vanaf het zuiden, met west positief.
    const length = Math.min(height / Math.tan(sun.altitude), maxLength);
    const x = Math.sin(sun.azimuth) * length;
    const y = -Math.cos(sun.azimuth) * length;

    // Hoe verder de schaduw valt, hoe zachter de rand. Hoe lager de zon, hoe
    // schuiner het licht op de grond valt en hoe zwakker de schaduw.
    const blur = 0.02 + length * 0.35;
    const alpha = 0.65 * Math.sin(sun.altitude);

    return `${x.toFixed(4)}em ${y.toFixed(4)}em ${blur.toFixed(4)}em rgba(${rgb}, ${alpha.toFixed(3)})`;
}
