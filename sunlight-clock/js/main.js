const clockElement = document.getElementById('clock');
const chartElement = document.getElementById('chart');

const chart = initialiseChart(chartElement);

let now = null;
let previousNow = null;
let minute = null;
let sunrise = null;
let sunset = null;

update();
setInterval(function () {
    update();
}, 100);

function update () {
    const now = Math.round(new Date().getTime() / 1000);
    if (now !== previousNow) {
        previousNow = now;

        sunTimes = SunCalc.getTimes(new Date(), 51.794210, 5.649180);
        sunrise = Math.round(sunTimes.sunrise.getTime() / 1000);
        sunset = Math.round(sunTimes.sunset.getTime() / 1000);
        
        if (now > sunrise && now < sunset) {
            console.log('sun is up')
            const totalTimeInSeconds = sunset - sunrise;
            const timeElapsedInSeconds = now - sunrise;
            const percentage = (timeElapsedInSeconds / totalTimeInSeconds) * 100
            updateChart(chart, percentage, 100);
        } else {
            updateChart(chart, 0, 100);
        }
    }
}

function updateChart(chart, time, total) {
    var timeWhitespace = (total - time);
    var data = [time, timeWhitespace];
    chart.data.datasets[0].data = data;
    chart.update();
}

function initialiseChart(chartElement) {
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
            events: [],
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
