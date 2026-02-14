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

    const blobs = [
        // Large slow drifters
        { cx: 0.30, cy: 0.35, ax: 0.20, ay: 0.25, vx: 0.03,  vy: 0.02,  px: 0.0, py: 1.5, sz: 0.24, ho: 0,   bs: 0.04 },
        { cx: 0.70, cy: 0.60, ax: 0.18, ay: 0.28, vx: 0.02,  vy: 0.03,  px: 3.0, py: 4.2, sz: 0.22, ho: 120, bs: 0.03 },
        { cx: 0.50, cy: 0.50, ax: 0.22, ay: 0.22, vx: 0.025, vy: 0.02,  px: 5.0, py: 2.0, sz: 0.20, ho: 240, bs: 0.05 },

        // Medium movers
        { cx: 0.25, cy: 0.65, ax: 0.18, ay: 0.22, vx: 0.06,  vy: 0.05,  px: 1.2, py: 0.3, sz: 0.14, ho: 30,  bs: 0.07 },
        { cx: 0.75, cy: 0.30, ax: 0.16, ay: 0.22, vx: 0.05,  vy: 0.07,  px: 4.1, py: 3.2, sz: 0.13, ho: 85,  bs: 0.06 },
        { cx: 0.45, cy: 0.75, ax: 0.20, ay: 0.18, vx: 0.07,  vy: 0.04,  px: 2.5, py: 5.5, sz: 0.15, ho: 155, bs: 0.08 },
        { cx: 0.60, cy: 0.25, ax: 0.18, ay: 0.18, vx: 0.04,  vy: 0.08,  px: 0.8, py: 1.0, sz: 0.12, ho: 200, bs: 0.06 },
        { cx: 0.20, cy: 0.40, ax: 0.14, ay: 0.25, vx: 0.06,  vy: 0.06,  px: 3.5, py: 0.5, sz: 0.11, ho: 270, bs: 0.09 },
        { cx: 0.80, cy: 0.70, ax: 0.14, ay: 0.20, vx: 0.05,  vy: 0.07,  px: 5.8, py: 2.8, sz: 0.13, ho: 320, bs: 0.07 },

        // Small fast ones
        { cx: 0.40, cy: 0.30, ax: 0.22, ay: 0.22, vx: 0.12,  vy: 0.09,  px: 2.0, py: 4.0, sz: 0.06, ho: 55,  bs: 0.12 },
        { cx: 0.65, cy: 0.55, ax: 0.20, ay: 0.25, vx: 0.09,  vy: 0.13,  px: 4.5, py: 1.5, sz: 0.05, ho: 175, bs: 0.11 },
        { cx: 0.50, cy: 0.70, ax: 0.25, ay: 0.15, vx: 0.14,  vy: 0.08,  px: 1.0, py: 3.5, sz: 0.07, ho: 295, bs: 0.14 },
        { cx: 0.25, cy: 0.55, ax: 0.18, ay: 0.22, vx: 0.10,  vy: 0.12,  px: 3.2, py: 5.0, sz: 0.05, ho: 100, bs: 0.10 },
        { cx: 0.75, cy: 0.40, ax: 0.18, ay: 0.22, vx: 0.11,  vy: 0.10,  px: 0.5, py: 2.5, sz: 0.06, ho: 230, bs: 0.13 },

        // Tiny satellites
        { cx: 0.45, cy: 0.50, ax: 0.25, ay: 0.28, vx: 0.16,  vy: 0.14,  px: 2.8, py: 0.8, sz: 0.035, ho: 45,  bs: 0.16 },
        { cx: 0.55, cy: 0.45, ax: 0.22, ay: 0.25, vx: 0.14,  vy: 0.17,  px: 5.2, py: 3.8, sz: 0.04,  ho: 190, bs: 0.15 },
        { cx: 0.35, cy: 0.40, ax: 0.20, ay: 0.22, vx: 0.18,  vy: 0.12,  px: 1.5, py: 5.5, sz: 0.03,  ho: 310, bs: 0.18 },
    ];

    function getBaseHue(hours) {
        const k = [
            { t: 0, h: 220 }, { t: 4, h: 240 }, { t: 6, h: 280 },
            { t: 8, h: 350 }, { t: 10, h: 30 }, { t: 12, h: 50 },
            { t: 14, h: 40 }, { t: 16, h: 20 }, { t: 18, h: 340 },
            { t: 20, h: 280 }, { t: 22, h: 240 }, { t: 24, h: 220 },
        ];
        for (let i = 0; i < k.length - 1; i++) {
            if (hours >= k[i].t && hours < k[i + 1].t) {
                const t = (hours - k[i].t) / (k[i + 1].t - k[i].t);
                return lerpHue(k[i].h, k[i + 1].h, t);
            }
        }
        return k[0].h;
    }

    function lerpHue(a, b, t) {
        let d = b - a;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        return ((a + d * t) % 360 + 360) % 360;
    }

    function contain(val, size, pad) {
        if (val < pad) return pad + (val - pad) * 0.15;
        if (val > size - pad) return size - pad + (val - (size - pad)) * 0.15;
        return val;
    }

    let cachedNight = 0;
    let cachedBaseHue = 0;
    let lastStyleUpdate = 0;

    function updateTimeVars() {
        const now = new Date();
        const hours = now.getHours() + now.getMinutes() / 60;
        cachedBaseHue = getBaseHue(hours);
        cachedNight = Math.cos((hours / 24) * Math.PI * 2) * 0.5 + 0.5;

        const h = Math.round(cachedBaseHue);
        document.body.style.background = `radial-gradient(ellipse at 50% 50%, hsl(${h}, 25%, 8%) 0%, hsl(${h}, 15%, 3%) 60%, hsl(${h}, 10%, 1%) 100%)`;
    }

    function draw(timestamp) {
        const t = timestamp / 1000;

        if (timestamp - lastStyleUpdate > 5000) {
            updateTimeVars();
            lastStyleUpdate = timestamp;
        }

        const seconds = new Date().getSeconds() + new Date().getMilliseconds() / 1000;
        const breath = Math.sin((seconds / 60) * Math.PI * 2) * 0.5 + 0.5;

        const flowAngle = t * 0.012;
        const flowX = Math.cos(flowAngle) * 0.03;
        const flowY = Math.sin(flowAngle) * 0.03;

        ctx.clearRect(0, 0, cw, ch);

        const minDim = Math.min(cw, ch);
        const sat = 70 + cachedNight * 15;
        const lit = 58 - cachedNight * 10;

        for (const blob of blobs) {
            // 3 harmonics + global flow
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

            // Local turbulence
            rawX += Math.sin(rawY * 4 + t * 0.08) * 0.012;
            rawY += Math.cos(rawX * 4 + t * 0.07) * 0.012;

            const blobBreath = Math.sin(t * blob.bs + blob.px * 2) * 0.5 + 0.5;
            const r = minDim * blob.sz * (0.8 + blobBreath * 0.2 + breath * 0.06);

            const pad = r / Math.max(cw, ch) + 0.02;
            const x = contain(rawX, 1, pad) * cw;
            const y = contain(rawY, 1, pad) * ch;

            // Velocity for stretch
            const dx = Math.cos(t * blob.vx + blob.px) * blob.vx * blob.ax
                     + Math.cos(t * blob.vx * 0.6 + blob.py * 1.5) * blob.vx * 0.6 * blob.ax * 0.3;
            const dy = Math.cos(t * blob.vy + blob.py) * blob.vy * blob.ay
                     - Math.sin(t * blob.vy * 0.7 + blob.px * 1.5) * blob.vy * 0.7 * blob.ay * 0.25;

            const speed = Math.sqrt(dx * dx + dy * dy) * minDim;
            const angle = Math.atan2(dy, dx);
            const stretch = 1 + Math.min(speed / 50, 1) * 0.45;

            const hue = (cachedBaseHue + blob.ho) % 360;
            ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.scale(stretch, 1 / Math.sqrt(stretch));
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        requestAnimationFrame(draw);
    }

    updateTimeVars();
    requestAnimationFrame(draw);
})();
