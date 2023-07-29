const clockElement = document.getElementById('clock');
const totalNumberOfAttemptsElement = document.getElementById('total-number-of-attempts');
const totalNumberOfSuccessfulAttemptsElement = document.getElementById('total-number-of-successful-attempts');
const numberOfAttemptsSinceLastSuccessfulAttemptElement = document.getElementById('number-of-attempts-since-last-successful-attempt');
const lowestNumberOfAttemptsBeforeASuccessfulAttemptElement = document.getElementById('lowest-number-of-attempts-before-a-successful-attempt');
const highestNumberOfAttemptsBeforeASuccessfulAttemptElement = document.getElementById('highest-number-of-attempts-before-a-successful-attempt');

const hourDigits = getHourDigits();
const minuteDigits = getMinuteDigits();
const secondDigits = getSecondDigits();

let time = null;
let previousTime = null;
let attempts = 0;
let minAttempts = null;

let totalNumberOfAttempts = 0;
let totalNumberOfSuccessfulAttempts = 0;
let numberOfAttemptsSinceLastSuccessfulAttempt = 0;
let lowestNumberOfAttemptsBeforeASuccessfulAttempt = null;
let highestNumberOfAttemptsBeforeASuccessfulAttempt = null;

update();
setInterval(update, 100);

function update () {
    let time = getTime();
    if (time !== previousTime) {
        previousTime = time;
        const randomTime = getRandomTime();
        if (time === randomTime) {
            if (lowestNumberOfAttemptsBeforeASuccessfulAttempt === null || numberOfAttemptsSinceLastSuccessfulAttempt < lowestNumberOfAttemptsBeforeASuccessfulAttempt) {
                lowestNumberOfAttemptsBeforeASuccessfulAttempt = numberOfAttemptsSinceLastSuccessfulAttempt;
            }
            if (highestNumberOfAttemptsBeforeASuccessfulAttempt === null || numberOfAttemptsSinceLastSuccessfulAttempt > highestNumberOfAttemptsBeforeASuccessfulAttempt) {
                highestNumberOfAttemptsBeforeASuccessfulAttempt = numberOfAttemptsSinceLastSuccessfulAttempt;
            }
            clockElement.innerHTML = '<h1 style="color: green;">' + randomTime + '</h1>';
            totalNumberOfSuccessfulAttempts++;
            numberOfAttemptsSinceLastSuccessfulAttempt = 0;
        } else {
            clockElement.innerHTML = '<h1 style="color: red;">' + randomTime + '</h1>';
        }
        numberOfAttemptsSinceLastSuccessfulAttempt++;
        totalNumberOfAttempts++;
        totalNumberOfAttemptsElement.innerHTML = '<h2>total number of attempts: ' + totalNumberOfAttempts + '</h2>';
        totalNumberOfSuccessfulAttemptsElement.innerHTML = '<h2>total number of successful attempts: ' + totalNumberOfSuccessfulAttempts + '</h2>';
        numberOfAttemptsSinceLastSuccessfulAttemptElement.innerHTML = '<h2>number of attempts since last successful attempt: ' + numberOfAttemptsSinceLastSuccessfulAttempt + '</h2>';
        lowestNumberOfAttemptsBeforeASuccessfulAttemptElement.innerHTML = '<h2>lowest number of attempts before a successful attempt: ' + lowestNumberOfAttemptsBeforeASuccessfulAttempt + '</h2>';
        highestNumberOfAttemptsBeforeASuccessfulAttemptElement.innerHTML = '<h2>highest number of attempts before a successful attempt: ' + highestNumberOfAttemptsBeforeASuccessfulAttempt + '</h2>';
    }
}

function getTime () {
    const now = new Date();
    const hour = now.getHours();
    const hourText = hour < 10 ? `0${hour}` : `${hour}`;
    const minute = now.getMinutes();
    const minuteText = minute < 10 ? `0${minute}` : `${minute}`;
    const second = now.getSeconds();
    const secondText = second < 10 ? `0${second}` : `${second}`;
    return hourText + ':' + minuteText + ':' + secondText;
}

function getRandomTime () {
    return getRandomValueFromArray(hourDigits) + ':' + getRandomValueFromArray(minuteDigits) + ':' + getRandomValueFromArray(secondDigits);
}

function getRandomValueFromArray (array) {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

function getArrayWithValuesUntil (until) {
    let digits = [];
    for (let i = 0; i <= until; i++) {
        const digit = i < 10 ? `0${i}` : `${i}`;
        digits.push(digit);
    }
    return digits;
}

function getHourDigits () {
    return getArrayWithValuesUntil(23);
}

function getMinuteDigits () {
    return getArrayWithValuesUntil(59);
}

function getSecondDigits () {
    return getArrayWithValuesUntil(59);
}
