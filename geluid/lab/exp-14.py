"""
exp-14 — De Maas

Eén getal draagt dit hele stuk: hoeveel water er per seconde langs je punt
stroomt. Dat getal is geen momentopname maar een optelsom — regen die dagen
geleden in de Ardennen viel, door de bodem zakte, beken vulde en nu pas hier
aankomt. Een rivier is het traagste geheugen van een landschap.

    hoeveelheid water  -> toonhoogte  (veel water zakt, tot een octaaf lager)
    hoeveelheid water  -> volheid     (een gezwollen rivier heeft meer body)
    hoe snel het verandert -> zweving  (een rivier die hard wast of hard zakt
                                       gaat onrustig zweven; vlak water staat stil)
    welke kant het op gaat -> kleur    (wassend water zet de kwint op de voorgrond
                                       en klinkt open en onopgelost; zakkend water
                                       schuift naar het octaaf en komt tot rust)
    hoeveelheid water  -> onderstroom (druk onderin, geen geklater)

Het bereik is niet door mij verzonnen. Bij het starten haalt hij een heel jaar
afvoer op en kalibreert daarop: de laagste stand van het afgelopen jaar is de
hoogste toon, de hoogste stand de laagste. Je hoort dus letterlijk waar deze
rivier vandaag staat ten opzichte van zichzelf.

De metingen zijn dagwaarden, maar een rivier springt niet om middernacht. Er
loopt daarom een gladde kromme door de dagpunten heen die continu op 'nu' wordt
uitgelezen — inclusief de voorspelde dagen, zodat de klank vanzelf al naar
morgen toe leunt. Van uur tot uur hoor je niets veranderen. Kom je over een week
terug na een natte week, dan staat alles lager.

Draaien:  ../.venv/bin/python exp-14.py
Stoppen:  Ctrl+C
Nodig:    internet. LAT/LON bepalen welke rivier; hij pakt het dichtstbijzijnde
          stroomgebied en laat bij het starten zien welk punt dat werd.
"""

import calendar
import json
import threading
import time
import urllib.request

import numpy as np
import sounddevice as sd

SR = 44100
LAT, LON = 51.79, 5.65      # ~Ravenstein, aan de Maas — bepaalt welke rivier
POLL = 3 * 3600.0           # seconden tussen twee opvragingen van de kromme
KALIBRATIE = 24 * 3600.0    # seconden tussen twee jaaroverzichten
GLIDE = 60.0                # seconden om een nieuwe waarde in te laten glijden
GAIN = 0.5

F_LAAG_WATER = 78.0         # Hz — grondtoon bij de laagste stand van het jaar
F_HOOG_WATER = 39.0         # Hz — grondtoon bij de hoogste stand van het jaar
TREND_VOL = 40.0            # m3/s per dag waarbij de spanning op vol staat

BASIS = "https://flood-api.open-meteo.com/v1/flood"
VRAAG = f"?latitude={LAT}&longitude={LON}&daily=river_discharge"

# --- wat de rivier doet (door de rivierdraad bijgewerkt) ---
st = {"q": None, "pos": 0.5, "trend": 0.0, "laag": None, "hoog": None,
      "punt": None, "vooruit": [], "tijd": None}
events = []

# --- geglede waarden (wat je nú hoort) ---
cur = {"f": 60.0, "vol": 0.4, "spanning": 0.0, "stroom": 0.3}

rng = np.random.default_rng(14)
phase = np.zeros(4)
NOISE_TAIL = 1024
tail = np.zeros(NOISE_TAIL)


def haal(url):
    req = urllib.request.Request(url, headers={"User-Agent": "geluid-lab/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def gaten_dichten(v):
    """Ontbrekende dagen lineair invullen, zodat de reeks netjes dagelijks blijft."""
    v = np.array([np.nan if x is None else float(x) for x in v])
    goed = ~np.isnan(v)
    if goed.sum() < 4:
        return None
    idx = np.arange(len(v))
    v[~goed] = np.interp(idx[~goed], idx[goed], v[goed])
    return v


def catmull(y, x):
    """Gladde kromme door de dagpunten; x is een gebroken dag-index."""
    i = int(np.floor(x))
    t = x - i
    p = [y[int(np.clip(i + k, 0, len(y) - 1))] for k in (-1, 0, 1, 2)]
    return 0.5 * ((2 * p[1]) + (-p[0] + p[2]) * t
                  + (2 * p[0] - 5 * p[1] + 4 * p[2] - p[3]) * t * t
                  + (-p[0] + 3 * p[1] - 3 * p[2] + p[3]) * t * t * t)


def dag_index(datums, nu):
    """Waar staat 'nu' in de reeks? Dagwaarden gelden voor het midden van de dag."""
    eerste = calendar.timegm(time.strptime(datums[0], "%Y-%m-%d")) + 12 * 3600
    return (nu - eerste) / 86400.0


def rivier_loop():
    kromme = None
    datums = None
    volgende_fetch = 0.0
    volgende_jaar = 0.0
    while True:
        nu = time.time()

        if nu >= volgende_jaar:                     # jaarbereik voor de kalibratie
            try:
                eind = time.strftime("%Y-%m-%d", time.gmtime(nu))
                start = time.strftime("%Y-%m-%d", time.gmtime(nu - 365 * 86400))
                d = haal(f"{BASIS}{VRAAG}&start_date={start}&end_date={eind}")
                v = gaten_dichten(d["daily"]["river_discharge"])
                st["laag"] = float(np.percentile(v, 2))
                st["hoog"] = float(np.percentile(v, 98))
                st["punt"] = (d["latitude"], d["longitude"])
                events.append(("jaar", st["laag"], st["hoog"], len(v)))
                volgende_jaar = nu + KALIBRATIE
            except Exception as e:
                events.append(("fout", f"jaaroverzicht: {str(e)[:50]}", None, None))
                volgende_jaar = nu + 300

        if nu >= volgende_fetch:                    # de kromme rond vandaag
            try:
                d = haal(f"{BASIS}{VRAAG}&past_days=60&forecast_days=7")
                v = gaten_dichten(d["daily"]["river_discharge"])
                if v is not None:
                    kromme, datums = v, d["daily"]["time"]
                    x = dag_index(datums, nu)
                    st["vooruit"] = [(datums[i], float(kromme[i]))
                                     for i in range(len(kromme))
                                     if 0 <= i - int(x) <= 3]
                    events.append(("kromme", len(v), datums[0], datums[-1]))
                volgende_fetch = nu + POLL
            except Exception as e:
                events.append(("fout", f"kromme: {str(e)[:50]}", None, None))
                volgende_fetch = nu + 300

        if kromme is not None and st["laag"] is not None:
            x = float(np.clip(dag_index(datums, nu), 0, len(kromme) - 1))
            q = float(catmull(kromme, x))
            morgen = float(catmull(kromme, min(x + 0.5, len(kromme) - 1)))
            gisteren = float(catmull(kromme, max(x - 0.5, 0)))
            laag, hoog = st["laag"], max(st["hoog"], st["laag"] * 1.1)
            pos = (np.log(max(q, 1e-3)) - np.log(laag)) / (np.log(hoog) - np.log(laag))
            st.update({"q": q, "pos": float(np.clip(pos, 0.0, 1.0)),
                       "trend": morgen - gisteren, "tijd": time.time()})
        time.sleep(1.0)


def band_noise(frames, n):
    """Ruis, glad gestreken met een hann-venster van n samples (klein n = helderder)."""
    global tail
    n = int(np.clip(n, 2, NOISE_TAIL))
    white = rng.standard_normal(frames)
    ker = np.hanning(n + 2)[1:-1]
    ker /= np.sqrt(np.sum(ker ** 2))
    x = np.concatenate([tail[-(n - 1):], white])
    y = np.convolve(x, ker, mode="valid")
    tail = np.concatenate([tail, white])[-NOISE_TAIL:]
    return y


def callback(outdata, frames, time_info, status):
    global phase
    if status:
        print(status)

    k = 1.0 - np.exp(-frames / (GLIDE * SR))
    pos = st["pos"]
    f_doel = F_LAAG_WATER * (F_HOOG_WATER / F_LAAG_WATER) ** pos
    spanning_doel = float(np.clip(st["trend"] / TREND_VOL, -1.0, 1.0))

    cur["f"] += (f_doel - cur["f"]) * k
    cur["vol"] += (pos - cur["vol"]) * k
    cur["spanning"] += (spanning_doel - cur["spanning"]) * k
    cur["stroom"] += (pos ** 0.7 - cur["stroom"]) * k

    t = np.arange(frames) / SR
    left = np.zeros(frames)
    right = np.zeros(frames)
    b = cur["vol"]

    # De zwevingssnelheid zegt hoe hard de rivier beweegt (het teken hoor je niet
    # in een zweving). Welke kant hij op gaat zit in de kleur: bij wassend water
    # komt de kwint naar voren, bij zakkend water het octaaf.
    sp = cur["spanning"]
    zweving = 1.0 + 0.004 * abs(sp)
    kwint = 0.10 + 0.20 * (0.5 + 0.5 * sp)
    octaaf = 0.10 + 0.20 * (0.5 - 0.5 * sp)

    for i, (mult, pan, lvl) in enumerate([(1.0, 0.5, 0.55), (1.0 * zweving, 0.5, 0.45),
                                          (1.5, 0.28, kwint), (2.0, 0.72, octaaf)]):
        f = cur["f"] * mult
        ph = phase[i] + 2 * np.pi * f * t
        sig = (np.sin(ph) + 0.35 * b * np.sin(2 * ph) + 0.16 * b * np.sin(3 * ph)
               + 0.07 * b * np.sin(5 * ph)) * lvl
        left += sig * np.cos(pan * np.pi / 2)
        right += sig * np.sin(pan * np.pi / 2)
        phase[i] = (phase[i] + 2 * np.pi * f * frames / SR) % (2 * np.pi)

    # onderstroom: druk, geen geklater. Meer water = iets meer body.
    n = int(600 - 300 * cur["stroom"])
    onder = 0.30 * cur["stroom"]
    left += band_noise(frames, n) * onder
    right += band_noise(frames, n) * onder

    outdata[:] = np.tanh(GAIN * np.column_stack([left, right])).astype(np.float32)


def balk(value, width=16):
    filled = int(round(np.clip(value, 0, 1) * width))
    return "[" + "#" * filled + "-" * (width - filled) + "]"


if __name__ == "__main__":
    print(f"exp-14  |  de rivier bij {LAT}, {LON}  |  Ctrl+C om te stoppen")
    print("         water = toonhoogte en volheid, stijgen of dalen = spanning")
    print("         bereik wordt gekalibreerd op het afgelopen jaar\n")
    threading.Thread(target=rivier_loop, daemon=True).start()
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(1500)
                while events:
                    print(" " * 78, end="\r")
                    soort, a, b_, c = events.pop(0)
                    if soort == "jaar":
                        print(f"  · jaarbereik over {c} dagen: {a:.0f} tot {b_:.0f} m3/s"
                              + (f"   (rooster {st['punt'][0]:.3f}, {st['punt'][1]:.3f})"
                                 if st["punt"] else ""))
                    elif soort == "kromme":
                        print(f"  · {a} dagwaarden, {b_} t/m {c}")
                        for datum, q in st["vooruit"]:
                            print(f"      {datum}  {q:7.1f} m3/s")
                    else:
                        print(f"  ! {a}")
                if st["q"] is None:
                    print("    wachten op de rivier…", end="\r", flush=True)
                    continue
                richting = ("stijgend" if st["trend"] > 1 else
                            "dalend" if st["trend"] < -1 else "vlak")
                print(f"    {st['q']:7.1f} m3/s  {balk(st['pos'])} {st['pos'] * 100:3.0f}%"
                      f"  {st['trend']:+6.1f}/dag {richting:<8} {cur['f']:5.1f} Hz",
                      end="\r", flush=True)
        except KeyboardInterrupt:
            print("\nstil.")
