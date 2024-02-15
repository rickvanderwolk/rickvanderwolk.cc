let time = null;
let previousTime = null;

const defaultFormat = 'HH:mm:ss';
const queryParams = new URLSearchParams(window.location.search);
const format = queryParams.get('format') || defaultFormat;

update();
setInterval(function () {
    update();
}, 100);

console.group('URL parameters');
console.group('optional');
console.group('format');
console.log('description: Moment.js format');
console.log('default: ' + defaultFormat);
console.log('example: ?year=h:mm:ss a');
console.groupEnd();
console.groupEnd();
console.groupEnd();

function update () {
    const time = getTime(format);
    if (time !== previousTime) {
        previousTime = time;
        document.title = time;
    }
}

function getTime (format) {
    return moment().format(format);
}
