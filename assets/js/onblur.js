if (ifUserIsUsingGoogleChrome()) {
    // allow Google Chrome to search page (ctrl / cmnd F)
    document.addEventListener('visibilitychange', function(e) {
        if (document.visibilityState === 'hidden') {
            changeLinkColors();
            changeRowColors();
        }
    });
} else {
    window.onblur = function() {
        changeLinkColors();
        changeRowColors();
    };
}

// thanks https://codepedia.info/detect-browser-in-javascript
function getBrowserName() {
    let userAgent = navigator.userAgent;
    let browserName;

    if (userAgent.match(/chrome|chromium|crios/i)){
        browserName = 'chrome';
    } else if (userAgent.match(/firefox|fxios/i)){
        browserName = 'firefox';
    } else if (userAgent.match(/safari/i)){
        browserName = 'safari';
    } else if (userAgent.match(/opr\//i)){
        browserName = 'opera';
    } else if (userAgent.match(/edg/i)){
        browserName = 'edge';
    } else {
        browserName = 'No browser detection';
    }

    return browserName;
}

function ifUserIsUsingGoogleChrome() {
    return getBrowserName() === 'chrome';
}

function getRandomColor() {
    const hue = Math.floor(Math.random() * 361); // 361 to include 360
    return `hsla(${hue}, 100%, 50%, 1)`;
}

function changeLinkColors() {
    const links = document.querySelectorAll('a:not(.row):not(.cloud-item)');
    links.forEach(link => {
        link.style.color = getRandomColor();
    });
}

function changeRowColors() {
    const rows = document.querySelectorAll('.row');
    rows.forEach(row => {
        const color = getRandomColor();
        const header = row.querySelector('h2 > span');
        const imageCol = row.querySelector('.image-col');
        if (header) {
            header.style.color = color;
        }
        if (imageCol) {
            imageCol.style.borderColor = color;
        }
    });
}
