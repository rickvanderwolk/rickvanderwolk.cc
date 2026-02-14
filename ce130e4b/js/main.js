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

    function lerp(a, b, t) { return a + (b - a) * t; }

    function lerpHue(a, b, t) {
        let d = b - a;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        return ((a + d * t) % 360 + 360) % 360;
    }

    // Shape harmonics — define the organic form
    const harmonics = [
        { freq: 2, amp: 0.12, target: 0.12, speed: 0.35 },
        { freq: 3, amp: 0.18, target: 0.18, speed: -0.22 },
        { freq: 5, amp: 0.07, target: 0.07, speed: 0.15 },
        { freq: 8, amp: 0.03, target: 0.03, speed: -0.10 },
    ];

    let hue = 200, targetHue = 200;
    let radius = 0.18, targetRadius = 0.18;
    let flash = 0;

    // Particle system
    let particle = null;
    let nextSpawn = 4000 + Math.random() * 6000;

    function spawnParticle(timestamp) {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0)      { x = 0.1 + Math.random() * 0.8; y = -0.05; }
        else if (side === 1) { x = 1.05; y = 0.1 + Math.random() * 0.8; }
        else if (side === 2) { x = 0.1 + Math.random() * 0.8; y = 1.05; }
        else                 { x = -0.05; y = 0.1 + Math.random() * 0.8; }

        const roll = Math.random();
        let effect, pHue;
        if (roll < 0.4) {
            effect = 'hue';
            pHue = (hue + 60 + Math.random() * 200) % 360;
        } else if (roll < 0.75) {
            effect = 'shape';
            pHue = (hue + 180) % 360;
        } else {
            effect = 'size';
            pHue = 50;
        }

        particle = { x, y, effect, hue: pHue, trail: [] };
        nextSpawn = timestamp + 8000 + Math.random() * 15000;
    }

    function applyEffect(p) {
        if (p.effect === 'hue') {
            targetHue = p.hue;
        } else if (p.effect === 'shape') {
            const idx = Math.floor(Math.random() * harmonics.length);
            harmonics[idx].target = 0.02 + Math.random() * 0.25;
            if (Math.random() < 0.4) {
                harmonics[idx].freq = 2 + Math.floor(Math.random() * 9);
            }
        } else {
            targetRadius = 0.12 + Math.random() * 0.14;
        }
        flash = 1;
    }

    let lastTime = 0;

    function draw(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;
        const t = timestamp / 1000;

        // Spawn particle
        if (!particle && timestamp > nextSpawn) {
            spawnParticle(timestamp);
        }

        // Smooth transitions
        hue = lerpHue(hue, targetHue, dt * 1.0);
        radius = lerp(radius, targetRadius, dt * 1.2);
        if (flash > 0.001) flash *= Math.pow(0.015, dt);
        else flash = 0;

        for (const h of harmonics) {
            h.amp = lerp(h.amp, h.target, dt * 1.2);
        }

        // Form position — slow wandering
        const fx = 0.5 + Math.sin(t * 0.033) * 0.15 + Math.sin(t * 0.019 + 2.5) * 0.08;
        const fy = 0.5 + Math.sin(t * 0.026 + 1.0) * 0.12 + Math.cos(t * 0.017 + 4.0) * 0.08;

        const minDim = Math.min(cw, ch);
        const cx = fx * cw;
        const cy = fy * ch;
        const baseR = radius * minDim;

        // Background with subtle glow centered on form
        const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cw, ch) * 0.8);
        bgGrad.addColorStop(0, `hsl(${Math.round(hue)}, 18%, 7%)`);
        bgGrad.addColorStop(0.4, `hsl(${Math.round(hue)}, 10%, 3%)`);
        bgGrad.addColorStop(1, '#020204');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, cw, ch);

        // Outer glow
        const glowR = baseR * (2.5 + flash * 1.0);
        const glow = ctx.createRadialGradient(cx, cy, baseR * 0.5, cx, cy, glowR);
        glow.addColorStop(0, `hsla(${Math.round(hue)}, 55%, 50%, ${0.08 + flash * 0.15})`);
        glow.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Draw form
        const n = 200;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
            const a = (i / n) * Math.PI * 2;
            let r = baseR;
            for (const h of harmonics) {
                r += Math.sin(a * h.freq + t * h.speed) * baseR * h.amp;
            }
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const litB = flash * 20;
        const grad = ctx.createRadialGradient(
            cx - baseR * 0.1, cy - baseR * 0.1, baseR * 0.05,
            cx, cy, baseR * 1.1
        );
        grad.addColorStop(0, `hsl(${Math.round(hue)}, 70%, ${68 + litB}%)`);
        grad.addColorStop(0.5, `hsl(${Math.round(hue)}, 65%, ${52 + litB}%)`);
        grad.addColorStop(1, `hsl(${Math.round((hue + 30) % 360)}, 55%, 38%)`);
        ctx.fillStyle = grad;
        ctx.fill();

        // Particle
        if (particle) {
            const dx = fx - particle.x;
            const dy = fy - particle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.04) {
                applyEffect(particle);
                particle = null;
            } else {
                const speed = 0.07 + 0.15 * Math.max(0, 1 - dist * 2.5);
                particle.x += (dx / dist) * speed * dt;
                particle.y += (dy / dist) * speed * dt;

                particle.trail.push({ x: particle.x, y: particle.y });
                if (particle.trail.length > 20) particle.trail.shift();

                // Trail
                for (let i = 0; i < particle.trail.length; i++) {
                    const tp = particle.trail[i];
                    const frac = i / particle.trail.length;
                    ctx.beginPath();
                    ctx.arc(tp.x * cw, tp.y * ch, minDim * 0.005 * frac, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${particle.hue}, 80%, 70%, ${frac * 0.5})`;
                    ctx.fill();
                }

                // Particle dot + glow
                const ppx = particle.x * cw;
                const ppy = particle.y * ch;
                const pr = minDim * 0.008;

                const pg = ctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, pr * 5);
                pg.addColorStop(0, `hsla(${particle.hue}, 80%, 75%, 0.3)`);
                pg.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
                ctx.fillStyle = pg;
                ctx.beginPath();
                ctx.arc(ppx, ppy, pr * 5, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(ppx, ppy, pr, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${particle.hue}, 85%, 80%)`;
                ctx.fill();
            }
        }

        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
})();
