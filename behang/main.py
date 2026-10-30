#!/usr/local/bin/python3
"""Wallpaper colour fields: soft colour masses that drift over days.

A pure function of time, in three layers:
  hours  real sun height in NL     -> light (night stays coloured, never black)
  days   slow, overlapping cycles  -> where the masses are, how big
  weeks  day of the year           -> the palette
Consecutive minutes differ far below what the eye can see (see `check`).

  main.py                    render now and set as wallpaper (used by launchd)
  main.py at 2026-12-21T16:30   render a given moment to at.png
  main.py sheet day|week|year   contact sheet to sheet.png
  main.py check              max colour change between consecutive minutes over a year
"""
import colorsys, datetime, glob, math, os, random, struct, subprocess, sys, time, zlib

DIR = os.path.dirname(os.path.abspath(__file__))
W, H = 320, 180                 # macOS scales this up smoothly; the fields are soft anyway
ASPECT = W / H
LAT, LON = 52.1, 5.1            # middle of NL
MAX_DELTA_E = 0.5               # allowed change per minute (visible starts around 1-2)
TWILIGHT = (-12, 18)            # sun height over which night turns into day

# palette centre per month (hue 0..1), interpolated along the shortest way round
MONTH_HUE = [0.58, 0.55, 0.42, 0.32, 0.27, 0.16, 0.11, 0.08, 0.06, 0.03, 0.97, 0.66]

_rng = random.Random(42)
BLOBS = [
    {
        "x": [(_rng.uniform(4, 9), _rng.uniform(0, 6.3)), (_rng.uniform(2.5, 5), _rng.uniform(0, 6.3))],
        "y": [(_rng.uniform(4, 9), _rng.uniform(0, 6.3)), (_rng.uniform(2.5, 5), _rng.uniform(0, 6.3))],
        "r": (_rng.uniform(0.32, 0.55), _rng.uniform(5, 13), _rng.uniform(0, 6.3)),
        "hue": (_rng.uniform(-0.10, 0.10), _rng.uniform(10, 20), _rng.uniform(0, 6.3)),
        "sat": _rng.uniform(0.35, 0.55),
    }
    for _ in range(6)
]
_dither_rng = random.Random(1)
DITHER = [_dither_rng.random() - 0.5 for _ in range(W * H)]   # fixed, so it never flickers


def sun(ts):
    """Sun elevation and azimuth in degrees for the middle of NL."""
    dt = datetime.datetime.fromtimestamp(ts, datetime.timezone.utc)
    doy = dt.timetuple().tm_yday + (dt.hour + dt.minute / 60) / 24
    decl = math.radians(23.44) * math.sin(2 * math.pi * (doy - 81) / 365)
    hour_angle = math.radians(15 * (dt.hour + dt.minute / 60 + dt.second / 3600 + LON / 15 - 12))
    lat = math.radians(LAT)
    elev = math.asin(math.sin(lat) * math.sin(decl) + math.cos(lat) * math.cos(decl) * math.cos(hour_angle))
    az = math.atan2(math.sin(hour_angle), math.cos(hour_angle) * math.sin(lat) - math.tan(decl) * math.cos(lat))
    return math.degrees(elev), (math.degrees(az) + 180) % 360


def wave(days, period, phase):
    return math.sin(2 * math.pi * days / period + phase)


def hue_centre(ts):
    dt = datetime.datetime.fromtimestamp(ts)
    pos = (dt.timetuple().tm_yday - 1 + dt.hour / 24) / 365 * 12 - 0.5   # month centres mid-month
    i = math.floor(pos)
    a, b = MONTH_HUE[i % 12], MONTH_HUE[(i + 1) % 12]
    d = (b - a + 0.5) % 1 - 0.5                                           # shortest way round
    return (a + d * (pos - i)) % 1


def params(ts):
    days = ts / 86400
    elev, _ = sun(ts)
    light = min(1.0, max(0.0, (elev - TWILIGHT[0]) / (TWILIGHT[1] - TWILIGHT[0])))
    centre = hue_centre(ts)

    blobs = []
    for b in BLOBS:
        x = 0.5 + 0.32 * wave(days, *b["x"][0]) + 0.15 * wave(days, *b["x"][1])
        y = 0.5 + 0.30 * wave(days, *b["y"][0]) + 0.14 * wave(days, *b["y"][1])
        r = b["r"][0] * (0.8 + 0.2 * wave(days, b["r"][1], b["r"][2]))
        hue = (centre + b["hue"][0] + 0.04 * wave(days, b["hue"][1], b["hue"][2])) % 1
        rgb = colorsys.hls_to_rgb(hue, 0.20 + 0.22 * light, b["sat"])
        blobs.append((x * ASPECT, y, r, tuple(c * 255 for c in rgb)))
    bg = tuple(c * 255 for c in colorsys.hls_to_rgb((centre + 0.04) % 1, 0.10 + 0.16 * light, 0.3))
    return blobs, bg


def colour_at(p, fx, fy):
    blobs, bg = p
    x = fx * ASPECT
    total, acc = 0.08, [c * 0.08 for c in bg]
    for bx, by, r, rgb in blobs:
        w = math.exp(-1.2 * ((x - bx) ** 2 + (fy - by) ** 2) / (r * r))
        total += w
        for k in range(3):
            acc[k] += rgb[k] * w
    return tuple(a / total for a in acc)


def render_rows(ts, w=W, h=H, dither=True):
    p = params(ts)
    rows = []
    for y in range(h):
        line = bytearray(w * 3)
        for x in range(w):
            c = colour_at(p, x / (w - 1), y / (h - 1))
            d = DITHER[(y * W + x) % len(DITHER)] if dither else 0
            for k in range(3):
                v = c[k] + d
                line[x * 3 + k] = 0 if v < 0 else 255 if v > 255 else int(v + 0.5)
        rows.append(bytes(line))
    return rows


def png(rows, w, h):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    raw = b"".join(b"\x00" + r for r in rows)
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 6))
            + chunk(b"IEND", b""))


def set_wallpaper(path):
    js = f"""
    ObjC.import('AppKit');
    var url = $.NSURL.fileURLWithPath('{path}');
    var screens = $.NSScreen.screens;
    for (var i = 0; i < screens.count; i++)
        $.NSWorkspace.sharedWorkspace.setDesktopImageURLForScreenOptionsError(url, screens.objectAtIndex(i), $({{}}), null);
    """
    subprocess.run(["osascript", "-l", "JavaScript", "-e", js], check=True, capture_output=True)


def update():
    # macOS caches wallpapers by path, so every frame gets a new name
    now = time.time()
    path = os.path.join(DIR, f"frame-{int(now)}.png")
    with open(path, "wb") as f:
        f.write(png(render_rows(now), W, H))
    set_wallpaper(path)
    for old in glob.glob(os.path.join(DIR, "frame-*.png")):
        if old != path:
            os.remove(old)


# --- tools ---------------------------------------------------------------

def sheet(kind):
    tw, th, gap = 160, 90, 4
    now = datetime.datetime.now().replace(minute=0, second=0, microsecond=0)
    if kind == "day":       # one day, every 30 min
        times = [[now.replace(hour=0) + datetime.timedelta(minutes=30 * (r * 8 + c)) for c in range(8)] for r in range(6)]
    elif kind == "week":    # 14 days at 12:00 and 22:00
        times = [[now.replace(hour=hr) + datetime.timedelta(days=d) for d in range(7 * half, 7 * half + 7)]
                 for half in (0, 1) for hr in (12, 22)]
    else:                   # every 2 weeks at 13:00
        start = now.replace(month=1, day=1, hour=13)
        times = [[start + datetime.timedelta(days=14 * (r * 7 + c)) for c in range(7)] for r in range(4)]
    cols, nrows = len(times[0]), len(times)
    w, h = cols * (tw + gap) + gap, nrows * (th + gap) + gap
    canvas = [bytearray(b"\x40\x40\x40" * w) for _ in range(h)]
    for r, row in enumerate(times):
        for c, when in enumerate(row):
            thumb = render_rows(when.timestamp(), tw, th, dither=False)
            for y in range(th):
                x0 = (gap + c * (tw + gap)) * 3
                canvas[gap + r * (th + gap) + y][x0:x0 + tw * 3] = thumb[y]
    path = os.path.join(DIR, "sheet.png")
    with open(path, "wb") as f:
        f.write(png([bytes(r) for r in canvas], w, h))
    print(path)


def lab(c):
    def lin(v):
        v = max(0.0, min(255.0, v)) / 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(v) for v in c)
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def check():
    """Worst colour change between consecutive minutes over a whole year, at 15 sample points."""
    points = [(fx, fy) for fx in (0, 0.25, 0.5, 0.75, 1) for fy in (0.1, 0.5, 0.9)]
    start = datetime.datetime(datetime.datetime.now().year, 1, 1).timestamp()
    prev, worst, worst_at = None, 0.0, None
    for minute in range(366 * 24 * 60):
        ts = start + minute * 60
        p = params(ts)
        cur = [lab(colour_at(p, fx, fy)) for fx, fy in points]
        if prev:
            d = max(math.dist(a, b) for a, b in zip(prev, cur))
            if d > worst:
                worst, worst_at = d, ts
        prev = cur
    when = datetime.datetime.fromtimestamp(worst_at)
    verdict = "OK" if worst <= MAX_DELTA_E else "TOO FAST"
    print(f"max change per minute: {worst:.3f} ΔE at {when:%Y-%m-%d %H:%M} (sun {sun(worst_at)[0]:.1f}°)  {verdict}")


def main(args):
    cmd = args[0] if args else "update"
    if cmd == "update":
        update()
    elif cmd == "at":
        ts = datetime.datetime.fromisoformat(args[1]).timestamp()
        path = os.path.join(DIR, "at.png")
        with open(path, "wb") as f:
            f.write(png(render_rows(ts), W, H))
        print(path)
    elif cmd == "sheet":
        sheet(args[1] if len(args) > 1 else "week")
    elif cmd == "check":
        check()


if __name__ == "__main__":
    main(sys.argv[1:])
