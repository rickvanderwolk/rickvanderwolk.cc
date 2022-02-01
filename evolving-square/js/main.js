const numberOfSquaresPerRow = 9;
const numberOfSquares = (numberOfSquaresPerRow * numberOfSquaresPerRow);
const squareWrapperElement = document.getElementById('square-wrapper');

let squares = setup(numberOfSquares);

update();
setInterval(function () {
    update();
}, 1);

function update () {
    squares = updateOne(squares);
    squareWrapperElement.innerHTML = getHtml(squares);
}

function setup (numberOfSquares) {
    let squares = [];
    for (let i = 0; i < numberOfSquares; i++) {
        squares.push([0, 255, 0]);
    }
    return squares;
}

function updateOne (squares) {
    let randomIndex = Math.floor(Math.random()*squares.length);
    let randomColorIndex = Math.floor(Math.random()*squares[randomIndex].length);
    let randomUpOrDownIndex = Math.floor(Math.random()*['down', 'up'].length);
    if (randomUpOrDownIndex === 0) {
        if (squares[randomIndex][randomColorIndex] > 0) {
            squares[randomIndex][randomColorIndex]--;
        }
    } else if (randomUpOrDownIndex === 1) {
        if (squares[randomIndex][randomColorIndex] < 255) {
            squares[randomIndex][randomColorIndex]++;
        }
    }
    return squares;
}

function getHtml (squares) {
    let squaresSinceLastEnter = 0;
    let html = '';
    for (let i = 0; i < squares.length; i++) {
        html += `<div class="square" id="square-${i}" style="background-color: rgb(${squares[i][0]}, ${squares[i][1]}, ${squares[i][2]})">&nbsp;</div>`;
        squaresSinceLastEnter++;
        if (squaresSinceLastEnter === numberOfSquaresPerRow) {
            html += '<br>';
            squaresSinceLastEnter = 0;
        }
    }
    return html;
}
