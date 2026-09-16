#!/usr/bin/env bash
#
# fire - een open haard in je terminal
# ====================================
# Fullscreen vuur in kleur. De warmte stijgt op volgens het oude Doom-vuur-
# algoritme: elke cel neemt de warmte over van de cel eronder, min een
# willekeurig beetje, en een willekeurige stap naar links of rechts. Geen
# filmpje, geen vaste frames: elk beeld wordt opnieuw uitgerekend, dus het
# herhaalt zich nooit.
#
#   bash fire.sh              letters
#   bash fire.sh blok         halve blokjes: dubbele verticale resolutie
#   bash fire.sh --fps 24     rustiger voor een trage terminal
#
# Niets in beeld behalve vuur. Toetsen werken wel:
#   [m] letters <-> blokjes · [spatie] porren · [+/-] hoger/lager · [q] of ctrl-c uit
#
# Truecolor als de terminal het kan (COLORTERM=truecolor), anders 256 kleuren.

set -u

if ! command -v python3 >/dev/null 2>&1; then
  echo "fire: python3 is nodig (het vuur rekent per beeld ~10.000 cellen door)." >&2
  exit 1
fi

tmp="$(mktemp -t fire)" || exit 1
trap 'rm -f "$tmp"' EXIT

cat > "$tmp" <<'PY_EOF'
import os, sys, time, math, random, select, shutil, signal, atexit

ESC = "\033"
CHARS = " .:-=+*#%@"          # van lauw naar wit

# ---------------------------------------------------------------- argumenten
mode = "letters"
fps  = 30
args = sys.argv[1:]
i = 0
while i < len(args):
    a = args[i]
    if a in ("blok", "blokken", "--blok", "-b"):      mode = "blok"
    elif a in ("letters", "ascii", "--ascii", "-a"):  mode = "letters"
    elif a in ("--fps", "-f") and i + 1 < len(args):  i += 1; fps = max(5, min(60, int(args[i])))
    elif a in ("-h", "--help"):
        print("gebruik: fire [letters|blok] [--fps N]"); sys.exit(0)
    i += 1

# ---------------------------------------------------------------- kleuren
STOPS = [
    (0.00, (  0,   0,   0)),
    (0.12, ( 34,   5,   2)),
    (0.26, (108,  15,   4)),
    (0.42, (178,  46,   8)),
    (0.58, (226, 106,  16)),
    (0.74, (246, 162,  46)),
    (0.88, (252, 210, 108)),
    (1.00, (255, 246, 210)),
]
NKLEUR = 48

def meng(p):
    s = 0
    while s < len(STOPS) - 2 and p > STOPS[s + 1][0]:
        s += 1
    (p0, c0), (p1, c1) = STOPS[s], STOPS[s + 1]
    f = (p - p0) / (p1 - p0)
    return tuple(int(c0[k] + (c1[k] - c0[k]) * f) for k in range(3))

TRUE = os.environ.get("COLORTERM", "") in ("truecolor", "24bit")

def cube(r, g, b):
    """dichtstbijzijnde kleur in de 6x6x6 kubus van de 256-kleurenset"""
    q = lambda v: 0 if v < 48 else (1 if v < 115 else min(5, (v - 35) // 40))
    return 16 + 36 * q(r) + 6 * q(g) + q(b)

FG, BG = [], []
for k in range(NKLEUR):
    r, g, b = meng(k / (NKLEUR - 1))
    if TRUE:
        FG.append(f"{ESC}[38;2;{r};{g};{b}m")
        BG.append(f"{ESC}[48;2;{r};{g};{b}m")
    else:
        n = cube(r, g, b)
        FG.append(f"{ESC}[38;5;{n}m")
        BG.append(f"{ESC}[48;5;{n}m")
RESET = f"{ESC}[0m"

# ---------------------------------------------------------------- terminal
fd = sys.stdin.fileno() if sys.stdin.isatty() else None
oud = None
if fd is not None:
    import termios, tty
    oud = termios.tcgetattr(fd)

def op():
    # ?7l = geen regelafbreking; anders schuift het beeld weg zodra de
    # rechteronderhoek beschreven wordt
    sys.stdout.write(f"{ESC}[?1049h{ESC}[?25l{ESC}[?7l{ESC}[2J")
    sys.stdout.flush()
    if fd is not None:
        tty.setcbreak(fd)

def dicht():
    if fd is not None and oud is not None:
        termios.tcsetattr(fd, termios.TCSADRAIN, oud)
    sys.stdout.write(f"{RESET}{ESC}[?7h{ESC}[?25h{ESC}[?1049l")
    sys.stdout.flush()

atexit.register(dicht)
signal.signal(signal.SIGINT,  lambda *a: sys.exit(0))
signal.signal(signal.SIGTERM, lambda *a: sys.exit(0))

herteken = [True]
if hasattr(signal, "SIGWINCH"):
    signal.signal(signal.SIGWINCH, lambda *a: herteken.__setitem__(0, True))

# ---------------------------------------------------------------- het vuur
cols = rows = 0
heat = []
vorig = []
hoogte = 0.68          # deel van het scherm dat de vlam haalt
verval = 0.06
t = 0.0
flare = 0.0
wind = 0.0

def meet():
    global cols, rows, heat, vorig, verval
    g = shutil.get_terminal_size((80, 24))
    cols = max(20, g.columns)
    schermrijen = max(8, g.lines)
    rows = schermrijen * (2 if mode == "blok" else 1)
    heat = [0.0] * (cols * rows)
    vorig = [None] * schermrijen
    verval = 2.0 / max(6.0, rows * hoogte)
    sys.stdout.write(f"{ESC}[2J")

def bed(u):
    # het vuurbed schuift en ademt, anders krijg je een keurige piramide
    c = 0.5 + math.sin(t * 0.21) * 0.035 + math.sin(t * 0.07 + 1.3) * 0.025
    b = 0.32 + math.sin(t * 0.13 + 2.1) * 0.035
    d = abs(u - c) / b
    if d >= 1.0:
        return 0.0
    return math.cos(d * math.pi / 2) ** 0.75

def stap(dt):
    global t, flare, wind
    t += dt
    if random.random() < dt * 0.7:
        flare = 1.0
    flare *= 0.12 ** dt
    wind += (math.sin(t * 0.37) * 0.6 + math.sin(t * 0.13) * 0.4 - wind) * min(1.0, dt * 2)

    rnd = random.random
    br = rows - 1
    # de gloeiende kolen onderin
    for r in (br, br - 1):
        rij = r * cols
        for x in range(cols):
            p = bed(x / (cols - 1))
            if p <= 0.0:
                heat[rij + x] = 0.0
            else:
                v = p * (0.74 + rnd() * 0.30 + flare * 0.18)
                heat[rij + x] = 1.0 if v > 1.0 else v

    # opstijgen
    pL = 0.30 + wind * 0.14
    pR = 0.70 + wind * 0.14
    for y in range(rows - 3, -1, -1):
        o = y * cols
        b = o + cols
        for x in range(cols):
            rr = rnd()
            sx = x - 1 if rr < pL else (x + 1 if rr > pR else x)
            if sx < 0: sx = 0
            elif sx >= cols: sx = cols - 1
            v = heat[b + sx] - rnd() * verval
            heat[o + x] = v if v > 0.0 else 0.0

# ---------------------------------------------------------------- beeld
def rij_letters(y):
    uit = []
    kl = -1
    rij = y * cols
    for x in range(cols):
        h = heat[rij + x]
        if h <= 0.03:
            if kl != -1:
                uit.append(RESET); kl = -1
            uit.append(" ")
            continue
        ci = int(h * len(CHARS))
        if ci >= len(CHARS): ci = len(CHARS) - 1
        if ci == 0:
            if kl != -1:
                uit.append(RESET); kl = -1
            uit.append(" ")
            continue
        k = int(h * NKLEUR)
        if k >= NKLEUR: k = NKLEUR - 1
        if k != kl:
            uit.append(FG[k]); kl = k
        uit.append(CHARS[ci])
    return "".join(uit)

def rij_blok(y):
    uit = []
    f = b = -1
    boven = (y * 2) * cols
    onder = (y * 2 + 1) * cols
    for x in range(cols):
        hb = heat[boven + x]
        ho = heat[onder + x]
        if hb <= 0.02 and ho <= 0.02:
            if f != -1 or b != -1:
                uit.append(RESET); f = b = -1
            uit.append(" ")
            continue
        kb = int(hb * NKLEUR); kb = NKLEUR - 1 if kb >= NKLEUR else kb
        ko = int(ho * NKLEUR); ko = NKLEUR - 1 if ko >= NKLEUR else ko
        if kb != f:
            uit.append(FG[kb]); f = kb
        if ko != b:
            uit.append(BG[ko]); b = ko
        uit.append("▀")          # bovenste halve blok
    return "".join(uit)

def teken():
    uit = []
    for y in range(len(vorig)):
        s = (rij_blok(y) if mode == "blok" else rij_letters(y)).rstrip(" ")
        if s == vorig[y]:
            continue
        vorig[y] = s
        uit.append(f"{ESC}[{y + 1};1H{s}{RESET}{ESC}[K")
    if uit:
        sys.stdout.write("".join(uit))
        sys.stdout.flush()

# ---------------------------------------------------------------- lus
def toets():
    global mode, hoogte
    if fd is None:
        return True
    while select.select([sys.stdin], [], [], 0)[0]:
        c = sys.stdin.read(1)
        if c in ("q", "Q", "\x1b", "\x03"):
            return False
        if c in ("m", "M"):
            mode = "blok" if mode == "letters" else "letters"
            herteken[0] = True
        elif c == " ":
            globals()["flare"] = 1.0
        elif c in ("+", "="):
            hoogte = min(0.95, hoogte + 0.06); herteken[0] = True
        elif c in ("-", "_"):
            hoogte = max(0.25, hoogte - 0.06); herteken[0] = True
    return True

op()
random.seed()
laatste = time.monotonic()
try:
    while True:
        if herteken[0]:
            herteken[0] = False
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
except (KeyboardInterrupt, SystemExit):
    pass
except BrokenPipeError:
    pass
PY_EOF

python3 "$tmp" "$@"
