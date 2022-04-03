const HOME_PAGE_API_URL_GET_ENDPOINT = '<base_url>/api/index.php';

const LIGHT_LEVEL_MAX = 32767;

const bodyElement = document.body;
const contentElement = document.getElementById('content');

const iconStatusElement = document.getElementById('icon-status');
const bulbIconElement = document.getElementById('bulb-icon');
const sunIconElement = document.getElementById('sun-icon');

update();
setInterval(update, 5000);

function update() {
    let states = httpGet(HOME_PAGE_API_URL_GET_ENDPOINT);
    if (states.sensorState && states.bulbState) {
        bodyElement.style.backgroundColor = getBackgroundColor(states.sensorState, states.bulbState);

        let statusText = '';
        if (states.bulbState.on === true) {
            sunIconElement.style.display = 'none';
            bulbIconElement.style.display = 'inline-block';
            statusText = 'ON (' + Math.round((states.bulbState.bri / 255) * 100) + '%)';
        } else {
            sunIconElement.style.display = 'inline-block';
            bulbIconElement.style.display = 'none';
        }
        iconStatusElement.innerText = statusText;
    } else {
        alert('Something went wrong, please try again later');
    }
}

function getBackgroundColor(sensorState, bulbState) {
    if (bulbState.on === true) {
        // yellow - artificial light
        const backgroundColorDensityValue1 = Math.round((bulbState.bri / 255) * 255);
        const backgroundColorDensityValue2 = Math.round((bulbState.bri / 255) * 213);
        return 'rgb(' + backgroundColorDensityValue1 + ',' + backgroundColorDensityValue2 + ',' +  0 + ')';
    } else {
        // white - daylight
        const backgroundColorDensityValue = Math.round((sensorState.lightlevel / LIGHT_LEVEL_MAX) * 255);
        return 'rgb(' + backgroundColorDensityValue + ',' + backgroundColorDensityValue + ',' + backgroundColorDensityValue + ')';
    }
}

function httpGet(theUrl) {
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.open( 'GET', theUrl, false );
    xmlHttp.send( null );
    let response = xmlHttp.responseText;
    if (response) {
        return JSON.parse(response);
    }
    return null;
}
