const clockElement = document.getElementById('clock');

let chart = initialiseChart(clockElement, 'Hours');

let previousTime = null;

update();
setInterval(function () {
    update();
}, 100);

function update () {
    const now = new Date();
    let time = now.getTime();
    if (time !== previousTime) {
        previousTime = time;
        updateChart(now);
    }
}

function updateChart(now) {
    let second = (now.getSeconds() / 60) * 100;
    let minute = (now.getMinutes() / 60) * 100;
    let hour = ((now.getHours() % 12 || 12) / 12) * 100;
    chart.data.datasets[0].data = [second, minute, hour];
    chart.update();
}

function initialiseChart(chartElement, title) {
    const data = {
        labels: [
            'second',
            'minute',
            'hour'
        ],
        datasets: [{
            data: [0, 0, 0],
            backgroundColor: [
                '#3D0000',
                '#950101',
                '#FF0000',
            ],
            hoverOffset: 0
        }]
    };
    return new Chart(chartElement, {
        type: 'pie',
        data: data,
        options: {
            events: [],
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
