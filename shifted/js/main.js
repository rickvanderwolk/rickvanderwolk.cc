const clockElement = document.getElementById('clock');
const hourHandElement = document.getElementById('hour-hand');
const minuteHandElement = document.getElementById('minute-hand');
const secondHandElement = document.getElementById('second-hand');

let hour = null;
let previousHour = null;
let minute = null;
let previousMinute = null;
let second = null;
let previousSecond = null;

update();
setInterval(function () {
    update();
}, 100);

function update () {
  hour = getCurrentHour();
  if (hour !== previousHour) {
    previousHour = hour;
    const angle = (hour / 12) * 360;
    hourHandElement.style.transform = 'rotateZ('+ angle +'deg)';
  }

  minute = getCurrentMinute();
  if (minute !== previousMinute) {
    previousMinute = minute;
    const angle = (minute / 60) * 360;
    minuteHandElement.style.transform = 'rotateZ('+ angle +'deg)';
  }

  second = getCurrentSecond();
  if (second !== previousSecond) {
    previousSecond = second;
    const angle = (second / 60) * 360;
    secondHandElement.style.transform = 'rotateZ('+ angle +'deg)';
  }
}

function getCurrentTime () {
  const now = new Date();
  return now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
}

function getCurrentHour () {
  const now = new Date();
  return now.getHours();
}

function getCurrentMinute () {
  const now = new Date();
  return now.getMinutes();
}

function getCurrentSecond () {
  const now = new Date();
  return now.getSeconds();
}
