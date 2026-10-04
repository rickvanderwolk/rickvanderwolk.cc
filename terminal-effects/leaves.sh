#!/usr/bin/env bash
#
# leaves - herfst in je terminal
# ==============================
# Vallende bladeren in herfstkleuren. Ze dwarrelen (elk blad heeft zijn eigen
# slingerfase), ze tuimelen om hun as, en ze vallen trager dan sneeuw. De wind
# draait langzaam en geeft af en toe een vlaag; wat al gevallen is blijft aan de
# onderkant liggen als bladerlaag, en bij een stevige vlaag waait daar weer een
# deel van op.
#
#   bash leaves.sh              gewoon
#   bash leaves.sh --dicht      dichte bladval
#   bash leaves.sh --fps 24     rustiger voor een trage terminal
#
# Niets in beeld behalve bladeren. [spatie] windvlaag · [q] of ctrl-c uit
# Truecolor als de terminal het kan, anders 256 kleuren.

set -u

if ! command -v python3 >/dev/null 2>&1; then
  echo "leaves: python3 is nodig." >&2
  exit 1
fi

tmp="$(mktemp "${TMPDIR:-/tmp}/leaves.XXXXXX")" || exit 1   # -t is niet overal hetzelfde
trap 'rm -f "$tmp"' EXIT

cat > "$tmp" <<'PY_EOF'
import os, sys, time, math, random, select, shutil, signal, atexit

ESC = "\033"
TUIMEL = "|/-\\"                       # om zijn as: vier standen
LIGGEND = "~-_.,"                      # hoe een gevallen blad eruitziet

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
        print("gebruik: leaves [--dicht|--ijl] [--fps N]"); sys.exit(0)
    i += 1

TRUE = os.environ.get("COLORTERM", "") in ("truecolor", "24bit")
_cache = {}

def kl(r, g, b):
    r &= 0xF8; g &= 0xF8; b &= 0xF8
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

SCHEMER = (18, 13, 11)
LUCHT = f"{ESC}[48;2;{SCHEMER[0]};{SCHEMER[1]};{SCHEMER[2]}m" if TRUE else f"{ESC}[48;5;234m"
VOORGROND_UIT = f"{ESC}[39m"

HERFST = [(186, 56, 20), (206, 102, 22), (220, 150, 46),
          (150, 100, 30), (124, 60, 26), (104, 96, 38), (168, 78, 36)]

def blad_kleur(diep):
    r, g, b = HERFST[random.randrange(len(HERFST))]
    f = 0.42 + diep * 0.58                       # ver weg = doffer
    v = 0.86 + random.random() * 0.28
    return kl(int(r * f * v), int(g * f * v), int(b * f * v))

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

cols = rows = 0
bladeren = []
hoop = []          # per kolom een stapeltje (teken, kleur) van wat er ligt
vorig = []
wind = 0.0
vlaag = 0.0
t = 0.0
HOOG = 4           # zo hoog mag de bladerlaag worden

def meet():
    global cols, rows, bladeren, hoop, vorig
    g = shutil.get_terminal_size((80, 24))
    cols = max(20, g.columns)
    rows = max(8, g.lines)
    vorig = [None] * rows
    hoop = [[] for _ in range(cols)]
    bladeren = [nieuw_blad(random.random() * rows) for _ in range(int(cols * rows * 0.012 * dicht))]
    sys.stdout.write(f"{LUCHT}{ESC}[2J")

def nieuw_blad(y=None, x=None, vy=None, vx=0.0):
    diep = random.random()
    return {
        "x": random.random() * cols if x is None else x,
        "y": -1.0 if y is None else y,
        "vy": (1.8 + diep * 3.4) * (0.8 + random.random() * 0.4) if vy is None else vy,
        "vx": vx,
        "f": random.random() * 6.28,
        "a": 0.5 + random.random() * 1.6,
        "rot": random.random() * 4,
        "rv": (random.random() * 2 - 1) * 4.0,
        "d": diep,
        "k": blad_kleur(diep),
    }

def stap(dt):
    global wind, vlaag, t
    t += dt
    if random.random() < dt * 0.10:
        vlaag = (random.random() * 2 - 1) * (3.0 + random.random() * 5.0)
    vlaag *= 0.6 ** dt
    doel = math.sin(t * 0.09) * 1.3 + math.sin(t * 0.031 + 2.2) * 0.9 + vlaag
    wind += (doel - wind) * min(1.0, dt * 1.1)

    # een stevige vlaag tilt gevallen bladeren weer op
    if abs(wind) > 2.6 and random.random() < dt * abs(wind) * 1.4:
        x = random.randrange(cols)
        if hoop[x]:
            hoop[x].pop()
            bladeren.append(nieuw_blad(y=rows - 1 - len(hoop[x]), x=x + 0.5,
                                       vy=-(1.5 + random.random() * 2.5),
                                       vx=wind * 0.8))

    for idx, b in enumerate(bladeren):
        gev = 0.35 + b["d"] * 0.65
        b["vy"] += 5.5 * dt                      # zwaartekracht wint weer van de vlaag
        if b["vy"] > 1.8 + b["d"] * 3.4:
            b["vy"] = 1.8 + b["d"] * 3.4
        b["vx"] *= 0.35 ** dt
        b["rot"] += b["rv"] * dt
        b["y"] += b["vy"] * dt
        b["x"] += (wind * gev + math.sin(t * 2.1 + b["f"]) * b["a"] * gev + b["vx"]) * dt * 3.0
        if b["x"] < -2: b["x"] += cols + 4
        elif b["x"] > cols + 2: b["x"] -= cols + 4

        kx = int(b["x"]) % cols
        if b["y"] >= rows - len(hoop[kx]) - 0.5 and b["vy"] > 0:
            if len(hoop[kx]) < HOOG:
                hoop[kx].append((LIGGEND[random.randrange(len(LIGGEND))], b["k"]))
            bladeren[idx] = nieuw_blad()
        elif b["y"] > rows + 2:
            bladeren[idx] = nieuw_blad()

def teken():
    tekens = [[" "] * cols for _ in range(rows)]
    kleuren = [[None] * cols for _ in range(rows)]

    for x in range(cols):
        for k, (ch, kleur) in enumerate(hoop[x]):
            y = rows - 1 - k
            if 0 <= y < rows:
                tekens[y][x] = ch
                kleuren[y][x] = kleur

    for b in bladeren:
        y = int(b["y"])
        x = int(b["x"]) % cols
        if 0 <= y < rows and kleuren[y][x] is None:
            tekens[y][x] = TUIMEL[int(b["rot"]) % 4]
            kleuren[y][x] = b["k"]

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
            vlaag = (random.random() * 2 - 1) * 8.0
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
