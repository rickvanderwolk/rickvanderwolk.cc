#!/usr/bin/env bash
#
# snow - het sneeuwt in je terminal
# =================================
# Fullscreen sneeuw in kleur. Drie dieptes: ver weg klein, dof en traag, dichtbij
# groot, wit en snel. De wind draait langzaam en geeft af en toe een vlaag. Wat
# valt blijft liggen: elke vlok stapelt op in zijn kolom, en te steile hopen
# zakken vanzelf naar de buren toe. Daardoor groeit er een echte sneeuwlaag in
# plaats van een rechte streep.
#
#   bash snow.sh              gewoon
#   bash snow.sh --dicht      dichte sneeuwbui
#   bash snow.sh --fps 24     rustiger voor een trage terminal
#
# Niets in beeld behalve sneeuw. [spatie] windvlaag · [q] of ctrl-c uit
# Truecolor als de terminal het kan, anders 256 kleuren.

set -u

if ! command -v python3 >/dev/null 2>&1; then
  echo "snow: python3 is nodig." >&2
  exit 1
fi

tmp="$(mktemp "${TMPDIR:-/tmp}/snow.XXXXXX")" || exit 1   # -t is niet overal hetzelfde
trap 'rm -f "$tmp"' EXIT

cat > "$tmp" <<'PY_EOF'
import os, sys, time, math, random, select, shutil, signal, atexit

ESC = "\033"
BLOK = " ▁▂▃▄▅▆▇█"   # 0/8 .. 8/8 vol

dicht = 1.0
fps = 30
args = sys.argv[1:]
i = 0
while i < len(args):
    a = args[i]
    if a in ("--dicht", "-d"):                       dicht = 2.2
    elif a in ("--ijl", "-i"):                       dicht = 0.5
    elif a in ("--fps", "-f") and i + 1 < len(args): i += 1; fps = max(5, min(60, int(args[i])))
    elif a in ("-h", "--help"):
        print("gebruik: snow [--dicht|--ijl] [--fps N]"); sys.exit(0)
    i += 1

# ---------------------------------------------------------------- kleuren
TRUE = os.environ.get("COLORTERM", "") in ("truecolor", "24bit")
_cache = {}

def kl(r, g, b):
    r &= 0xF8; g &= 0xF8; b &= 0xF8          # afronden: minder kleurwissels
    k = (r << 16) | (g << 8) | b
    e = _cache.get(k)
    if e is None:
        if TRUE:
            e = f"{ESC}[38;2;{r};{g};{b}m"
        else:
            q = lambda v: 0 if v < 48 else (1 if v < 115 else min(5, (v - 35) // 40))
            e = f"{ESC}[38;5;{16 + 36 * q(r) + 6 * q(g) + q(b)}m"
        _cache[k] = e
    return e

NACHT = (10, 12, 24)
LUCHT = f"{ESC}[48;2;{NACHT[0]};{NACHT[1]};{NACHT[2]}m" if TRUE else f"{ESC}[48;5;233m"
VOORGROND_UIT = f"{ESC}[39m"                 # alleen de letterkleur terug

# drie dieptes: (kans, teken, kleur, valsnelheid, zijwaartse gevoeligheid)
DIEPTE = [
    (0.42, ".", kl(104, 116, 150), 3.6,  0.55),
    (0.36, "·", kl(170, 182, 214), 6.0,  0.80),
    (0.22, "*", kl(238, 244, 255), 9.5, 1.00),
]

# ---------------------------------------------------------------- terminal
fd = sys.stdin.fileno() if sys.stdin.isatty() else None
oud = None
if fd is not None:
    import termios, tty
    oud = termios.tcgetattr(fd)

def op():
    sys.stdout.write(f"{ESC}[?1049h{ESC}[?25l{ESC}[?7l{LUCHT}{ESC}[2J")
    sys.stdout.flush()
    if fd is not None:
        tty.setcbreak(fd)

def dichtdoen():
    if fd is not None and oud is not None:
        termios.tcsetattr(fd, termios.TCSADRAIN, oud)
    sys.stdout.write(f"{ESC}[0m{ESC}[?7h{ESC}[?25h{ESC}[?1049l")
    sys.stdout.flush()

atexit.register(dichtdoen)
signal.signal(signal.SIGINT,  lambda *a: sys.exit(0))
signal.signal(signal.SIGTERM, lambda *a: sys.exit(0))
opnieuw = [True]
if hasattr(signal, "SIGWINCH"):
    signal.signal(signal.SIGWINCH, lambda *a: opnieuw.__setitem__(0, True))

# ---------------------------------------------------------------- de bui
cols = rows = 0
vlokken = []
laag = []          # hoogte van de sneeuwlaag per kolom, in regels
vorig = []
wind = 0.0
vlaag = 0.0
t = 0.0

def meet():
    global cols, rows, vlokken, laag, vorig
    g = shutil.get_terminal_size((80, 24))
    cols = max(20, g.columns)
    rows = max(8, g.lines)
    vorig = [None] * rows
    laag = [0.0] * cols
    vlokken = []
    for _ in range(int(cols * rows * 0.035 * dicht)):
        vlokken.append(nieuwe_vlok(random.random() * rows))
    sys.stdout.write(f"{LUCHT}{ESC}[2J")

def nieuwe_vlok(y=None):
    r = random.random()
    d = 0
    op_ = 0.0
    for k, (kans, *_r) in enumerate(DIEPTE):
        op_ += kans
        if r <= op_:
            d = k
            break
    return {
        "x": random.random() * cols,
        "y": -1.0 if y is None else y,
        "d": d,
        "v": DIEPTE[d][3] * (0.85 + random.random() * 0.3),
        "f": random.random() * 6.28,          # eigen slingerfase
        "a": 0.25 + random.random() * 0.55,   # hoe hard hij slingert
    }

def stap(dt):
    global wind, vlaag, t
    t += dt
    # de wind draait langzaam, met af en toe een vlaag
    if random.random() < dt * 0.12:
        vlaag = (random.random() * 2 - 1) * (2.5 + random.random() * 4)
    vlaag *= 0.55 ** dt
    doel = math.sin(t * 0.11) * 1.6 + math.sin(t * 0.037 + 1.7) * 1.1 + vlaag
    wind += (doel - wind) * min(1.0, dt * 1.2)

    for idx, v in enumerate(vlokken):
        gev = DIEPTE[v["d"]][4]
        v["y"] += v["v"] * dt
        v["x"] += (wind * gev + math.sin(t * 1.6 + v["f"]) * v["a"] * gev) * dt * 3.0
        if v["x"] < -2: v["x"] += cols + 4
        elif v["x"] > cols + 2: v["x"] -= cols + 4

        kx = int(v["x"]) % cols
        if v["y"] >= rows - laag[kx] - 0.5:
            # hij landt: de laag in die kolom wordt een tikje hoger
            if v["d"] > 0 and laag[kx] < rows * 0.55:
                laag[kx] += 0.16 + v["d"] * 0.06
            vlokken[idx] = nieuwe_vlok()

    # sneeuw zakt: te steile hopen glijden naar de buurman
    for _ in range(max(2, cols // 12)):
        x = random.randrange(cols)
        for nx in ((x - 1) % cols, (x + 1) % cols):
            d = laag[x] - laag[nx]
            if d > 0.55:
                laag[x] -= d * 0.22
                laag[nx] += d * 0.22
    # en klinkt heel langzaam in
    if laag:
        for x in range(cols):
            laag[x] *= 0.99965

def teken():
    tekens = [[" "] * cols for _ in range(rows)]
    kleuren = [[None] * cols for _ in range(rows)]

    # de sneeuwlaag, met blokjes voor het laatste stukje regel
    for x in range(cols):
        h = laag[x]
        if h <= 0.02:
            continue
        vol = int(h)
        rest = h - vol
        for k in range(vol):
            y = rows - 1 - k
            if 0 <= y < rows:
                tekens[y][x] = BLOK[8]
                kleuren[y][x] = kl(226, 232, 248) if k < 2 else kl(198, 206, 228)
        y = rows - 1 - vol
        if 0 <= y < rows and rest > 0.08:
            tekens[y][x] = BLOK[min(8, int(rest * 8) + 1)]
            kleuren[y][x] = kl(240, 246, 255)

    # de vlokken
    for v in vlokken:
        y = int(v["y"])
        x = int(v["x"]) % cols
        if 0 <= y < rows and tekens[y][x] == " ":
            _, teken_, kleur, *_r = DIEPTE[v["d"]]
            tekens[y][x] = teken_
            kleuren[y][x] = kleur

    uit = []
    for y in range(rows):
        rij_t = tekens[y]
        rij_k = kleuren[y]
        deel = []
        cur = None
        for x in range(cols):
            c = rij_k[x]
            if c is None:
                if cur is not None:
                    deel.append(VOORGROND_UIT); cur = None
                deel.append(" ")
            else:
                if c != cur:
                    deel.append(c); cur = c
                deel.append(rij_t[x])
        s = "".join(deel).rstrip(" ")
        if s == vorig[y]:
            continue
        vorig[y] = s
        uit.append(f"{ESC}[{y + 1};1H{s}{VOORGROND_UIT}{ESC}[K")
    if uit:
        sys.stdout.write("".join(uit))
        sys.stdout.flush()

def toets():
    global vlaag
    if fd is None:
        return True
    while select.select([sys.stdin], [], [], 0)[0]:
        c = sys.stdin.read(1)
        if c in ("q", "Q", "\x1b", "\x03"):
            return False
        if c == " ":
            vlaag = (random.random() * 2 - 1) * 7.0
    return True

op()
random.seed()
laatste = time.monotonic()
try:
    while True:
        if opnieuw[0]:
            opnieuw[0] = False
            meet()
        if not toets():
            break
        nu = time.monotonic()
        dt = min(0.1, nu - laatste)
        laatste = nu
        stap(dt)
        teken()
        rust = (1.0 / fps) - (time.monotonic() - nu)
        if rust > 0:
            time.sleep(rust)
except (KeyboardInterrupt, SystemExit, BrokenPipeError):
    pass
PY_EOF

python3 "$tmp" "$@"
