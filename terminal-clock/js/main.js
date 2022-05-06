const clockElement = document.getElementById('clock');

let text = null;
let previousText = null;
let previousMinute = null;

const formats = [
  '',
  'MMMM Do YYYY, h:mm:ss a',
  'YYYY-MM-DD H:mm:ss',
  'YYYY.MM.DD.H.mm.ss.SSS',
  'YYYY_ww_e_h_mm_SSS',
  'x',
  'X',
];

update();
setInterval(function () {
    update();
}, 150);

function update () {
    const text = getText();
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

function getText() {
  const format = formats[Math.floor(Math.random()*formats.length)];
  const now = new moment();
  return now.format(format);
}
