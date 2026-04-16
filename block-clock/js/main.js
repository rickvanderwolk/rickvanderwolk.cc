const canvas = document.getElementById('clock');
const ctx = canvas.getContext('2d');

const COLS = 32;
const ROWS = 12;
let CELL = 30;
let offsetX = 0;
let offsetY = 0;

const COLORS = {
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000'
};

const COLOR_LIST = Object.values(COLORS);

function randomColor() {
    return COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)];
}

const TETROMINOES = {
    I: [
        [[1,1,1,1]],
        [[1],[1],[1],[1]]
    ],
    O: [
        [[1,1],[1,1]]
    ],
    T: [
        [[1,1,1],[0,1,0]],
        [[1,0],[1,1],[1,0]],
        [[0,1,0],[1,1,1]],
        [[0,1],[1,1],[0,1]]
    ],
    S: [
        [[0,1,1],[1,1,0]],
        [[1,0],[1,1],[0,1]]
    ],
    Z: [
        [[1,1,0],[0,1,1]],
        [[0,1],[1,1],[1,0]]
    ],
    L: [
        [[1,0],[1,0],[1,1]],
        [[1,1,1],[1,0,0]],
        [[1,1],[0,1],[0,1]],
        [[0,0,1],[1,1,1]]
    ],
    J: [
        [[0,1],[0,1],[1,1]],
        [[1,0,0],[1,1,1]],
        [[1,1],[1,0],[1,0]],
        [[1,1,1],[0,0,1]]
    ]
};

const DIGIT_PATTERNS = {
    '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
    '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
    '3': [[1,1,1],[0,0,1],[1,1,1],[0,0,1],[1,1,1]],
    '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
    '5': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
    '6': [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
    '7': [[1,1,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
    '8': [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
    '9': [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]]
};

function scaleBitmap(bitmap, factor) {
    const scaled = [];
    for (const row of bitmap) {
        const newRow = [];
        for (const cell of row) {
            for (let k = 0; k < factor; k++) newRow.push(cell);
        }
        for (let k = 0; k < factor; k++) scaled.push([...newRow]);
    }
    return scaled;
}

function digitBitmap(d) {
    return scaleBitmap(DIGIT_PATTERNS[d], 2);
}

function colonBitmap() {
    return [
        [0,0],[0,0],
        [1,1],[1,1],
        [0,0],[0,0],
        [1,1],[1,1],
        [0,0],[0,0]
    ];
}

function jitterColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const factor = 0.78 + Math.random() * 0.34;
    const nr = Math.max(0, Math.min(255, Math.round(r * factor)));
    const ng = Math.max(0, Math.min(255, Math.round(g * factor)));
    const nb = Math.max(0, Math.min(255, Math.round(b * factor)));
    return `rgb(${nr}, ${ng}, ${nb})`;
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function tileBitmap(bitmap) {
    const rows = bitmap.length;
    const cols = bitmap[0].length;
    const grid = bitmap.map(row => [...row]);
    const placements = [];
    const shapeNames = Object.keys(TETROMINOES);
    const usage = { I: 0, O: 0, T: 0, S: 0, Z: 0, L: 0, J: 0 };
    const BASE_WEIGHT = { I: 5.0, O: 3.5, T: 1.0, S: 1.0, Z: 1.0, L: 1.0, J: 1.0 };
    let iterations = 0;
    const LIMIT = 40000;

    function findNext() {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c]) return [r, c];
            }
        }
        return null;
    }

    function canPlace(shape, r, c) {
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (!shape[i][j]) continue;
                const rr = r + i;
                const cc = c + j;
                if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) return false;
                if (!grid[rr][cc]) return false;
            }
        }
        return true;
    }

    function place(shape, r, c, val) {
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (shape[i][j]) grid[r + i][c + j] = val;
            }
        }
    }

    function orderShapes() {
        return shapeNames
            .map(n => ({ n, w: (BASE_WEIGHT[n] + usage[n] * 1.4) * (0.6 + Math.random() * 0.8) }))
            .sort((a, b) => a.w - b.w)
            .map(e => e.n);
    }

    function solve() {
        if (++iterations > LIMIT) return false;
        const pos = findNext();
        if (!pos) return true;
        const [r, c] = pos;
        const order = orderShapes();
        for (const name of order) {
            const rotations = TETROMINOES[name];
            const rotOrder = shuffle(rotations.map((_, i) => i));
            for (const rotIdx of rotOrder) {
                const shape = rotations[rotIdx];
                let firstC = -1;
                for (let j = 0; j < shape[0].length; j++) {
                    if (shape[0][j]) { firstC = j; break; }
                }
                if (firstC < 0) continue;
                const anchorR = r;
                const anchorC = c - firstC;
                if (canPlace(shape, anchorR, anchorC)) {
                    place(shape, anchorR, anchorC, 0);
                    usage[name]++;
                    placements.push({ name, rot: rotIdx, row: anchorR, col: anchorC });
                    if (solve()) return true;
                    placements.pop();
                    usage[name]--;
                    place(shape, anchorR, anchorC, 1);
                }
            }
        }
        return false;
    }

    return solve() ? placements : null;
}

function scoreTiling(tiling) {
    const counts = {};
    for (const p of tiling) counts[p.name] = (counts[p.name] || 0) + 1;
    const variety = Object.keys(counts).length;
    const iCount = counts.I || 0;
    const oCount = counts.O || 0;
    const maxCount = Math.max(...Object.values(counts));
    return variety * 12 - maxCount * 3 - iCount * 6 - oCount * 3;
}

function findVariedTiling(bitmap, attempts = 15) {
    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < attempts; i++) {
        const tiling = tileBitmap(bitmap);
        if (!tiling) continue;
        const score = scoreTiling(tiling);
        if (score > bestScore) {
            bestScore = score;
            best = tiling;
        }
    }
    return best;
}

function fallbackOnlyO(bitmap) {
    const rows = bitmap.length;
    const cols = bitmap[0].length;
    const placements = [];
    for (let r = 0; r < rows; r += 2) {
        for (let c = 0; c < cols; c += 2) {
            if (bitmap[r] && bitmap[r][c] && bitmap[r][c+1] && bitmap[r+1] && bitmap[r+1][c] && bitmap[r+1][c+1]) {
                placements.push({ name: 'O', rot: 0, row: r, col: c });
            }
        }
    }
    return placements;
}

function buildTimePieces(h, m) {
    const parts = [
        { bitmap: digitBitmap(h[0]), offsetCol: 0 },
        { bitmap: digitBitmap(h[1]), offsetCol: 7 },
        { bitmap: colonBitmap(),     offsetCol: 14 },
        { bitmap: digitBitmap(m[0]), offsetCol: 17 },
        { bitmap: digitBitmap(m[1]), offsetCol: 24 }
    ];
    const pieces = [];
    for (const part of parts) {
        let placements = findVariedTiling(part.bitmap);
        if (!placements) placements = fallbackOnlyO(part.bitmap);
        for (const p of placements) {
            pieces.push({
                name: p.name,
                rot: p.rot,
                row: p.row,
                col: p.col + part.offsetCol
            });
        }
    }
    return pieces;
}

let pieces = [];
let lastKey = '';

function startNewTime(h, m) {
    const timeWidth = 30;
    const timeHeight = 10;
    const startCol = Math.floor((COLS - timeWidth) / 2);
    const startRow = Math.floor((ROWS - timeHeight) / 2);
    const fresh = buildTimePieces(h, m);

    for (const p of pieces) {
        p.active = false;
    }

    const maxRow = fresh.reduce((m, p) => Math.max(m, p.row), 0);
    for (const p of fresh) {
        const shape = TETROMINOES[p.name][p.rot];
        const targetRow = p.row + startRow;
        const targetCol = p.col + startCol;
        const delay = (maxRow - p.row) * 35 + Math.random() * 80;
        pieces.push({
            name: p.name,
            shape,
            color: jitterColor(randomColor()),
            targetRow,
            col: targetCol,
            y: -(shape.length + 2) * CELL,
            vy: 0,
            delay,
            active: true
        });
    }
}

function update() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const key = h + m;
    if (key !== lastKey) {
        lastKey = key;
        startNewTime(h, m);
    }
}

let lastFrame = performance.now();

function animate(now) {
    const dt = Math.min(50, now - lastFrame);
    lastFrame = now;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gravity = 0.004 * CELL;
    const maxV = 1.6 * CELL / 16;
    const maxY = canvas.height + CELL * 4;

    for (const p of pieces) {
        if (p.delay > 0) {
            p.delay -= dt;
            drawPiece(p);
            continue;
        }
        const targetY = p.targetRow * CELL;
        if (p.active) {
            if (p.y < targetY) {
                p.vy = Math.min(maxV, p.vy + gravity * dt);
                p.y += p.vy * dt;
                if (p.y >= targetY) {
                    p.y = targetY;
                    p.vy = 0;
                }
            }
        } else {
            p.vy = Math.min(maxV, p.vy + gravity * dt);
            p.y += p.vy * dt;
        }
        drawPiece(p);
    }

    pieces = pieces.filter(p => p.active || (offsetY + p.y) < maxY);

    requestAnimationFrame(animate);
}

function drawPiece(p) {
    const { shape, col, y, color } = p;
    for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
            if (!shape[i][j]) continue;
            const px = offsetX + (col + j) * CELL;
            const py = offsetY + y + i * CELL;
            drawBlock(px, py, color);
        }
    }
}

function drawBlock(px, py, color) {
    const size = CELL - 2;
    const hl = Math.max(2, size * 0.15);
    ctx.fillStyle = color;
    ctx.fillRect(px, py, size, size);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(px, py, size, hl);
    ctx.fillRect(px, py, hl, size);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(px, py + size - hl, size, hl);
    ctx.fillRect(px + size - hl, py, hl, size);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    CELL = Math.floor(Math.min(canvas.width / (COLS + 2), canvas.height / (ROWS + 2)));
    offsetX = (canvas.width - COLS * CELL) / 2;
    offsetY = (canvas.height - ROWS * CELL) / 2;
    for (const p of pieces) {
        if (p.active && p.delay <= 0) {
            p.y = p.targetRow * CELL;
        }
    }
}

window.addEventListener('resize', resize);
resize();
update();
setInterval(update, 1000);
requestAnimationFrame(animate);
