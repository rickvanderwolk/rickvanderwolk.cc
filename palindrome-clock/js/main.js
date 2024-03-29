const clockElement = document.getElementById('clock');

const palindromeTimes = ['00:00:00','00:11:00','00:22:00','00:33:00','00:44:00','00:55:00','01:00:10','01:11:10','01:22:10','01:33:10','01:44:10','01:55:10','02:00:20','02:11:20','02:22:20','02:33:20','02:44:20','02:55:20','03:00:30','03:11:30','03:22:30','03:33:30','03:44:30','03:55:30','04:00:40','04:11:40','04:22:40','04:33:40','04:44:40','04:55:40','05:00:50','05:11:50','05:22:50','05:33:50','05:44:50','05:55:50','10:00:01','10:11:01','10:22:01','10:33:01','10:44:01','10:55:01','11:00:11','11:11:11','11:22:11','11:33:11','11:44:11','11:55:11','12:00:21','12:11:21','12:22:21','12:33:21','12:44:21','12:55:21','13:00:31','13:11:31','13:22:31','13:33:31','13:44:31','13:55:31','14:00:41','14:11:41','14:22:41','14:33:41','14:44:41','14:55:41','15:00:51','15:11:51','15:22:51','15:33:51','15:44:51','15:55:51','20:00:02','20:11:02','20:22:02','20:33:02','20:44:02','20:55:02','21:00:12','21:11:12','21:22:12','21:33:12','21:44:12','21:55:12','22:00:22','22:11:22','22:22:22','22:33:22','22:44:22','22:55:22','23:00:32','23:11:32','23:22:32','23:33:32','23:44:32','23:55:32',];

let lastPalindromeTime = null;
let previousLastPalindromeTime = null;

update();
setInterval(update, 100);

function update () {
    lastPalindromeTime = getLastPalindromeTime(getTime());
    if (lastPalindromeTime !== previousLastPalindromeTime) {
        previousLastPalindromeTime = lastPalindromeTime;
        clockElement.innerHTML = '<h1>' + lastPalindromeTime + '</h1>';
    }
}

function getTime () {
    const now = new Date();
    return now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
}

function getLastPalindromeTime (time) {
    const timeParts = time.split(':');
    const hour = timeParts[0];
    const minute = timeParts[1];
    const second = timeParts[2];
    let lastPalindromeTime = null;
    for (let i = 0; i < palindromeTimes.length; i++) {
        const palindromeTime = palindromeTimes[i];
        const palindromeTimeParts = palindromeTime.split(':');
        const palindromeHour = palindromeTimeParts[0];
        const palindromeMinute = palindromeTimeParts[1];
        const palindromeSecond = palindromeTimeParts[2];
        if (
            parseInt(palindromeHour) <= parseInt(hour)
            &&
            parseInt(palindromeMinute) <= parseInt(minute)
            &&
            parseInt(palindromeSecond) <= parseInt(second)
        ) {
            lastPalindromeTime = palindromeTime;
        } else if (
            parseInt(palindromeHour) <= parseInt(hour)
            &&
            parseInt(palindromeMinute) <= parseInt(minute)
            &&
            parseInt(palindromeSecond) < parseInt(second)
        ) {
            lastPalindromeTime = palindromeTime;
        } else if (
            parseInt(palindromeHour) <= parseInt(hour)
            &&
            parseInt(palindromeMinute) < parseInt(minute)
            &&
            parseInt(palindromeSecond) < parseInt(second)
        ) {
            lastPalindromeTime = palindromeTime;
        } else if (
            parseInt(palindromeHour) <= parseInt(hour)
            &&
            parseInt(palindromeMinute) < parseInt(minute)
        ) {
            lastPalindromeTime = palindromeTime;
        } else if (parseInt(palindromeHour) < parseInt(hour)) {
            lastPalindromeTime = palindromeTime;
        }
    }
    return lastPalindromeTime;
}
