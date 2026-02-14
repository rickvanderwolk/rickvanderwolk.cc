(function () {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    let cw, ch;

    function resize() {
        cw = canvas.width = window.innerWidth;
        ch = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const blobs = [
        {
            cx: 0.35, cy: 0.40,
            ax: 0.18, ay: 0.15,
            vx: 0.020, vy: 0.015,
            px: 0.0, py: 1.5,
            size: 0.40,
            baseHue: 0,
            harmonics: [
                { freq: 2, amp: 0.08, speed: 0.25, phase: 0 },
                { freq: 3, amp: 0.05, speed: -0.18, phase: 1.2 },
                { freq: 5, amp: 0.03, speed: 0.12, phase: 3.0 },
            ],
        },
        {
            cx: 0.65, cy: 0.35,
            ax: 0.15, ay: 0.18,
            vx: 0.017, vy: 0.022,
            px: 2.5, py: 4.0,
            size: 0.37,
            baseHue: 120,
            harmonics: [
                { freq: 2, amp: 0.10, speed: -0.22, phase: 2.0 },
                { freq: 4, amp: 0.04, speed: 0.15, phase: 0.5 },
                { freq: 6, amp: 0.02, speed: -0.10, phase: 4.2 },
            ],
        },
        {
            cx: 0.50, cy: 0.65,
            ax: 0.16, ay: 0.14,
            vx: 0.014, vy: 0.019,
            px: 5.0, py: 2.5,
            size: 0.38,
            baseHue: 240,
            harmonics: [
                { freq: 3, amp: 0.09, speed: 0.20, phase: 1.0 },
                { freq: 5, amp: 0.05, speed: -0.14, phase: 3.5 },
                { freq: 7, amp: 0.02, speed: 0.08, phase: 5.0 },
            ],
        },
    ];

    const N = 150;

    function draw(timestamp) {
        const t = timestamp / 1000;

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, cw, ch);

        ctx.globalCompositeOperation = 'lighter';

        const minDim = Math.min(cw, ch);
        const hueShift = t * 3;

        for (const blob of blobs) {
            const bx = blob.cx
                + Math.sin(t * blob.vx + blob.px) * blob.ax
                + Math.sin(t * blob.vx * 0.6 + blob.py) * blob.ax * 0.3;
            const by = blob.cy
                + Math.sin(t * blob.vy + blob.py) * blob.ay
                + Math.cos(t * blob.vy * 0.7 + blob.px) * blob.ay * 0.25;

            const cx = bx * cw;
            const cy = by * ch;
            const baseR = blob.size * minDim;
            const hue = (blob.baseHue + hueShift) % 360;

            // Soft halo — creates smooth color mixing where blobs overlap
            const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.6);
            halo.addColorStop(0, `hsl(${hue}, 85%, 30%)`);
            halo.addColorStop(0.4, `hsl(${hue}, 80%, 20%)`);
            halo.addColorStop(0.7, `hsl(${hue}, 75%, 8%)`);
            halo.addColorStop(1, 'hsl(0, 0%, 0%)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(cx, cy, baseR * 1.6, 0, Math.PI * 2);
            ctx.fill();

            // Crisp organic shape
            ctx.beginPath();
            for (let i = 0; i <= N; i++) {
                const a = (i / N) * Math.PI * 2;
                let r = baseR;
                for (const h of blob.harmonics) {
                    r += Math.sin(a * h.freq + t * h.speed + h.phase) * baseR * h.amp;
                }
                const px = cx + Math.cos(a) * r;
                const py = cy + Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();

            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.05);
            grad.addColorStop(0, `hsl(${hue}, 90%, 45%)`);
            grad.addColorStop(0.6, `hsl(${hue}, 85%, 35%)`);
            grad.addColorStop(1, `hsl(${hue}, 80%, 22%)`);
            ctx.fillStyle = grad;
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
})();
