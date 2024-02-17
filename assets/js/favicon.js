function updateFavicon() {
    fetch('get-favicon-emoji.php')
        .then(response => response.json())
        .then(data => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;

            const ctx = canvas.getContext('2d');
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(data.emoji, 32, 32);

            const link = document.createElement('link');
            const oldLink = document.getElementById('dynamic-favicon');
            link.id = 'dynamic-favicon';
            link.rel = 'shortcut icon';
            link.href = canvas.toDataURL("image/png");
            if (oldLink) {
                document.head.removeChild(oldLink);
            }
            document.head.appendChild(link);
        })
        .catch(error => console.error('Fout bij het ophalen van de favicon emoji:', error));
}

window.onload = function() {
    updateFavicon();
    setInterval(updateFavicon, ((5 * 60) * 1000));
};
