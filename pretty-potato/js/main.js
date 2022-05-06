const words = JSON.parse(wordsJson);

const wordsElement = document.getElementById('words');
const columnElement1 = document.getElementById('column-1');
const columnElement2 = document.getElementById('column-2');

render();

document.body.addEventListener('click', render);

document.body.onkeyup = function(e) {
    if (
        e.key === ' '
        ||
        e.code === 'Space'
        ||
        e.keyCode === 32
    ) {
        render();
    }
}

function getRandomishColor () {
    return 'hsla(' + Math.floor((Math.random() * 360)) + ', 100%, 50%, 1.0)';
}

function getRandomWord () {
    return words[Math.floor(Math.random() * words.length)];
}

function render () {
    const randomColor = getRandomishColor();
    columnElement1.style.backgroundColor = randomColor;
    columnElement2.innerHTML = '<h1 style="text-decoration-color: ' + randomColor + '">' + getRandomWord() + '<span class="br"> </span>' + getRandomWord() + '</h1>';
}
