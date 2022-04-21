const bodyElement = document.body;
const clockElement = document.getElementById('clock');
const hourChartElement = document.getElementById('hour-chart');
const minuteChartElement = document.getElementById('minute-chart');
const secondChartElement = document.getElementById('second-chart');

let hourChart = initialiseChart(hourChartElement, 'Hours');
let minuteChart = initialiseChart(minuteChartElement, 'Minutes');
let secondChart = initialiseChart(secondChartElement, 'Seconds');

let currentHour = null;
let previousHour = null;
let currentMinute = null;
let previousMinute = null;
let currentSecond = null;
let previousSecond = null;

update();
setInterval(function () {
    update();
}, 100);

function update () {
    const now = new Date();
    let currentHour = now.getHours();
    if (currentHour > 12) {
        currentHour = currentHour - 12;
    } else if (currentHour === 0) {
        currentHour = 12;
    }
    if (currentHour !== previousHour) {
        previousHour = currentHour;
        updateChart(hourChart, currentHour, 12);
    }
    if (now.getMinutes() !== previousMinute) {
        previousMinute = now.getMinutes();
        updateChart(minuteChart, now.getMinutes(), 60);
    }
    if (now.getSeconds() !== previousSecond) {
        previousSecond = now.getSeconds();
        updateChart(secondChart, now.getSeconds(), 60);
    }
}

function updateChart(chart, time, total) {
    const timeWhitespace = (total - time);
    chart.data.datasets[0].data = [time, timeWhitespace];
    chart.update();
}

function initialiseChart(chartElement, title) {
    const data = {
        labels: [
            'time',
            'time left'
        ],
        datasets: [{
            data: [15, 30],
            backgroundColor: [
                'rgb(255, 255, 0)',
                'rgb(35, 35, 35)'
            ],
            hoverOffset: 4
        }]
    };
    return new Chart(chartElement, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            elements: {
                arc: {
                    borderWidth: 0
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}
