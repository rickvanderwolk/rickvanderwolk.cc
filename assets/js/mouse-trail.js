if (!('ontouchstart' in window)) {
    document.addEventListener('mousemove', function(e) {
        const trail = document.createElement('div');
        trail.classList.add('trail');
        document.body.appendChild(trail);

        trail.style.left = `${e.pageX - 7.5}px`;
        trail.style.top = `${e.pageY - 7.5}px`;

        setTimeout(() => {
            trail.remove();
        }, 800);
    });
}
