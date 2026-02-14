(function () {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const blurEl = document.getElementById('goo-blur');
    let cw, ch;

    function resize() {
        cw = canvas.width = window.innerWidth;
        ch = canvas.height = window.innerHeight;
        blurEl.setAttribute('stdDeviation', Math.min(cw, ch) * 0.022);
    }
    window.addEventListener('resize', resize);
    resize();

    // hueGroup: 0 = red, 120 = green, 240 = blue
    const blobs = [
        // Large — one per color
        { cx: 0.30, cy: 0.38, ax: 0.20, ay: 0.22, vx: 0.030, vy: 0.025, px: 0.0, py: 1.5, sz: 0.22, hg: 0,   bs: 0.04 },
        { cx: 0.70, cy: 0.55, ax: 0.18, ay: 0.25, vx: 0.025, vy: 0.030, px: 3.0, py: 4.2, sz: 0.20, hg: 120, bs: 0.035 },
        { cx: 0.50, cy: 0.68, ax: 0.22, ay: 0.20, vx: 0.028, vy: 0.022, px: 5.0, py: 2.0, sz: 0.21, hg: 240, bs: 0.045 },

        // Medium — mixed
        { cx: 0.22, cy: 0.62, ax: 0.18, ay: 0.20, vx: 0.060, vy: 0.050, px: 1.2, py: 0.3, sz: 0.14, hg: 0,   bs: 0.07 },
        { cx: 0.78, cy: 0.30, ax: 0.16, ay: 0.22, vx: 0.050, vy: 0.070, px: 4.1, py: 3.2, sz: 0.13, hg: 120, bs: 0.06 },
        { cx: 0.45, cy: 0.25, ax: 0.20, ay: 0.18, vx: 0.070, vy: 0.040, px: 2.5, py: 5.5, sz: 0.15, hg: 240, bs: 0.08 },
        { cx: 0.60, cy: 0.78, ax: 0.18, ay: 0.18, vx: 0.040, vy: 0.080, px: 0.8, py: 1.0, sz: 0.12, hg: 0,   bs: 0.06 },

        // Small fast — mixed
        { cx: 0.40, cy: 0.35, ax: 0.22, ay: 0.22, vx: 0.120, vy: 0.090, px: 2.0, py: 4.0, sz: 0.07, hg: 120, bs: 0.12 },
        { cx: 0.65, cy: 0.50, ax: 0.20, ay: 0.25, vx: 0.090, vy: 0.130, px: 4.5, py: 1.5, sz: 0.06, hg: 240, bs: 0.11 },
        { cx: 0.35, cy: 0.55, ax: 0.25, ay: 0.15, vx: 0.140, vy: 0.080, px: 1.0, py: 3.5, sz: 0.08, hg: 0,   bs: 0.14 },
    ];

    function contain(val, size, pad) {
        if (pad < 0) return val;
        if (val < pad) return pad + (val - pad) * 0.15;
        if (val > size - pad) return size - pad + (val - (size - pad)) * 0.15;
        return val;
    }

    function draw(timestamp) {
        const t = timestamp / 1000;

        ctx.clearRect(0, 0, cw, ch);
        ctx.globalCompositeOperation = 'lighter';

        const minDim = Math.min(cw, ch);
        const hueShift = t * 3;

        const seconds = new Date().getSeconds() + new Date().getMilliseconds() / 1000;
        const breath = Math.sin((seconds / 60) * Math.PI * 2) * 0.5 + 0.5;

        const flowAngle = t * 0.012;
        const flowX = Math.cos(flowAngle) * 0.03;
        const flowY = Math.sin(flowAngle) * 0.03;

        for (const blob of blobs) {
            let rawX = blob.cx
                + Math.sin(t * blob.vx + blob.px) * blob.ax
                + Math.sin(t * blob.vx * 0.6 + blob.py * 1.5) * blob.ax * 0.3
                + Math.sin(t * blob.vx * 0.3 + blob.px * 2.5 + blob.py) * blob.ax * 0.15
                + flowX * (blob.sz / 0.15);

            let rawY = blob.cy
                + Math.sin(t * blob.vy + blob.py) * blob.ay
                + Math.cos(t * blob.vy * 0.7 + blob.px * 1.5) * blob.ay * 0.25
                + Math.cos(t * blob.vy * 0.35 + blob.py * 2.2 + blob.px) * blob.ay * 0.12
                + flowY * (blob.sz / 0.15);

            rawX += Math.sin(rawY * 4 + t * 0.08) * 0.012;
            rawY += Math.cos(rawX * 4 + t * 0.07) * 0.012;

            const blobBreath = Math.sin(t * blob.bs + blob.px * 2) * 0.5 + 0.5;
            const r = minDim * blob.sz * (0.8 + blobBreath * 0.2 + breath * 0.06);

            const pad = r / Math.max(cw, ch) + 0.02;
            const x = contain(rawX, 1, pad) * cw;
            const y = contain(rawY, 1, pad) * ch;

            const dx = Math.cos(t * blob.vx + blob.px) * blob.vx * blob.ax
                     + Math.cos(t * blob.vx * 0.6 + blob.py * 1.5) * blob.vx * 0.6 * blob.ax * 0.3;
            const dy = Math.cos(t * blob.vy + blob.py) * blob.vy * blob.ay
                     - Math.sin(t * blob.vy * 0.7 + blob.px * 1.5) * blob.vy * 0.7 * blob.ay * 0.25;

            const speed = Math.sqrt(dx * dx + dy * dy) * minDim;
            const angle = Math.atan2(dy, dx);
            const stretch = 1 + Math.min(speed / 50, 1) * 0.45;

            const hue = (blob.hg + hueShift) % 360;
            ctx.fillStyle = `hsl(${hue}, 90%, 40%)`;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.scale(stretch, 1 / Math.sqrt(stretch));
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.globalCompositeOperation = 'source-over';
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
})();
