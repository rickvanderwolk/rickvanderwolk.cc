const url = '/sun-position-clock/api';
function fetchJsonData() {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const preElement = document.getElementById('json');
            preElement.textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}

fetchJsonData();
setInterval(fetchJsonData, 60 * 1000);
