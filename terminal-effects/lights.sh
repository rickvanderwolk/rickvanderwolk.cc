#!/usr/bin/env bash
#
# lights - kerstverlichting in je terminal
# ========================================
# Een paar slingers lampjes, opgehangen aan een stuk of vier haakjes per snoer.
# Tussen de haakjes hangt het snoer door (een echte doorhang, geen rechte lijn) en
# het wiegt langzaam, alsof er ergens een deur open staat. De lampjes ademen elk
# in hun eigen tempo, eentje flikkert weleens, en er zit altijd een kapotte
# tussen. Het licht van een lampje valt op het stukje snoer ernaast.
#
#   bash lights.sh              gewoon
#   bash lights.sh --druk       meer snoeren, meer lampjes
#   bash lights.sh --fps 24     rustiger voor een trage terminal
#
# Niets in beeld behalve lampjes. [q] of ctrl-c uit
# Truecolor als de terminal het kan, anders 256 kleuren.

set -u

if ! command -v python3 >/dev/null 2>&1; then
  echo "lights: python3 is nodig." >&2
  exit 1
fi

tmp="$(mktemp "${TMPDIR:-/tmp}/lights.XXXXXX")" || exit 1   # -t is niet overal hetzelfde
trap 'rm -f "$tmp"' EXIT

cat > "$tmp" <<'PY_EOF'
import os, sys, time, math, random, select, shutil, signal, atexit

ESC = "\033"

druk = 1.0
fps = 30
args = sys.argv[1:]
i = 0
while i < len(args):
    a = args[i]
    if a in ("--druk", "-d"):                        druk = 1.7
    elif a in ("--rustig", "-r"):                    druk = 0.6
    elif a in ("--fps", "-f") and i + 1 < len(args): i += 1; fps = max(5, min(60, int(args[i])))
    elif a in ("-h", "--help"):
        print("gebruik: lights [--druk|--rustig] [--fps N]"); sys.exit(0)
    i += 1

TRUE = os.environ.get("COLORTERM", "") in ("truecolor", "24bit")
_cache = {}

def kl(r, g, b):
    r = max(0, min(255, int(r))) & 0xF8
    g = max(0, min(255, int(g))) & 0xF8
    b = max(0, min(255, int(b))) & 0xF8
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

DONKER = (12, 12, 18)
ACHTER = f"{ESC}[48;2;{DONKER[0]};{DONKER[1]};{DONKER[2]}m" if TRUE else f"{ESC}[48;5;233m"
VOORGROND_UIT = f"{ESC}[39m"

# ouderwetse kerstlampjes
KLEUREN = [(255, 62, 46), (60, 214, 96), (70, 128, 255),
           (255, 186, 66), (255, 246, 214), (226, 84, 214)]
SNOER = (52, 56, 52)

fd = sys.stdin.fileno() if sys.stdin.isatty() else None
oud = None
if fd is not None:
    import termios, tty
    oud = termios.tcgetattr(fd)

def op():
    sys.stdout.write(f"{ESC}[?1049h{ESC}[?25l{ESC}[?7l{ACHTER}{ESC}[2J")
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
snoeren = []
vorig = []
t = 0.0

def meet():
    global cols, rows, snoeren, vorig
    g = shutil.get_terminal_size((80, 24))
    cols = max(20, g.columns)
    rows = max(8, g.lines)
    vorig = [None] * rows

    aantal = max(2, min(6, int(rows / 7 * druk)))
    snoeren = []
    for s in range(aantal):
        vakken = max(2, int(cols / 26) + 1)
        haakjes = []
        for k in range(vakken + 1):
            u = k / vakken
            haakjes.append(rows * (0.12 + s * (0.76 / max(1, aantal - 1)) if aantal > 1 else 0.4)
                           + random.uniform(-0.8, 0.8))
        stap_ = max(4, int(7 - druk * 1.5))
        lampjes = []
        for x in range(2 + (s * 3) % stap_, cols - 1, stap_):
            lampjes.append({
                "x": x + random.randint(0, 1),
                "kleur": KLEUREN[(x // stap_ + s) % len(KLEUREN)],
                "fase": random.random() * 6.28,
                "snel": 0.25 + random.random() * 0.55,
                "kapot": random.random() < 0.035,
                "flikker": 0.0,
            })
        snoeren.append({
            "haakjes": haakjes,
            "vakken": vakken,
            "doorhang": rows * (0.07 + random.random() * 0.05),
            "wieg": random.random() * 6.28,
            "lampjes": lampjes,
        })
    sys.stdout.write(f"{ACHTER}{ESC}[2J")

def hoogte(sn, x):
    """y van het snoer op kolom x: per vak een doorhangende boog"""
    u = x / max(1, cols - 1) * sn["vakken"]
    k = min(sn["vakken"] - 1, int(u))
    f = u - k
    y0, y1 = sn["haakjes"][k], sn["haakjes"][k + 1]
    recht = y0 + (y1 - y0) * f
    return recht + sn["doorhang"] * 4 * f * (1 - f) + math.sin(t * 0.5 + sn["wieg"] + x * 0.01) * 0.45

def stap(dt):
    global t
    t += dt
    for sn in snoeren:
        for lp in sn["lampjes"]:
            if lp["kapot"]:
                continue
            if lp["flikker"] > 0:
                lp["flikker"] -= dt
            elif random.random() < dt * 0.012:
                lp["flikker"] = 0.05 + random.random() * 0.25

def helderheid(lp):
    if lp["kapot"]:
        return 0.0
    if lp["flikker"] > 0:
        return 0.12 + random.random() * 0.25
    return 0.45 + 0.55 * (0.5 + 0.5 * math.sin(t * lp["snel"] * 2.4 + lp["fase"]))

def teken():
    tekens = [[" "] * cols for _ in range(rows)]
    kleuren = [[None] * cols for _ in range(rows)]

    for sn in snoeren:
        # licht dat op het snoer valt, per kolom opgeteld
        gloed = [0.0] * cols
        tint = [(0.0, 0.0, 0.0)] * cols
        brandt = []
        for lp in sn["lampjes"]:
            h = helderheid(lp)
            brandt.append(h)
            if h <= 0.02:
                continue
            for dx in range(-3, 4):
                x = lp["x"] + dx
                if 0 <= x < cols:
                    v = h * (1.0 - abs(dx) / 4.0) ** 2
                    if v > gloed[x]:
                        gloed[x] = v
                        tint[x] = lp["kleur"]

        # het snoer
        vorige_y = None
        vorige_iy = None
        for x in range(cols):
            y = hoogte(sn, x)
            iy = int(round(y))
            helling = 0.0 if vorige_y is None else (y - vorige_y)
            ch = "-" if abs(helling) < 0.35 else ("\\" if helling > 0 else "/")
            g = gloed[x]
            r, gr, b = SNOER
            if g > 0:
                tr, tg, tb = tint[x]
                r += (tr - r) * g * 0.55
                gr += (tg - gr) * g * 0.55
                b += (tb - b) * g * 0.55
            kleur = kl(r, gr, b)
            # bij een steil stuk het gat tussen twee kolommen dichttrekken,
            # anders valt het snoer uit elkaar bij de haakjes
            rijen = (iy,)
            if vorige_iy is not None and abs(iy - vorige_iy) > 1:
                d = 1 if iy > vorige_iy else -1
                rijen = range(vorige_iy + d, iy + d, d)
            for yy in rijen:
                if 0 <= yy < rows:
                    tekens[yy][x] = ch
                    kleuren[yy][x] = kleur
            vorige_y = y
            vorige_iy = iy

        # de lampjes zelf
        for lp, h in zip(sn["lampjes"], brandt):
            x = lp["x"]
            if not (0 <= x < cols):
                continue
            y = int(round(hoogte(sn, x)))
            if not (0 <= y < rows):
                continue
            r, g, b = lp["kleur"]
            if h <= 0.02:
                tekens[y][x] = "o"
                kleuren[y][x] = kl(r * 0.16, g * 0.16, b * 0.16)
            else:
                tekens[y][x] = "*" if h > 0.72 else ("o" if h > 0.3 else ".")
                f = 0.35 + h * 0.65
                kleuren[y][x] = kl(r * f, g * f, b * f)
                # het schijnsel eronder
                if h > 0.55 and y + 1 < rows and kleuren[y + 1][x] is None:
                    tekens[y + 1][x] = "·"
                    kleuren[y + 1][x] = kl(r * 0.18 * h, g * 0.18 * h, b * 0.18 * h)

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
    if fd is None:
        return True
    while select.select([sys.stdin], [], [], 0)[0]:
        c = sys.stdin.read(1)
        if c in ("q", "Q", "\x1b", "\x03"):
            return False
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
