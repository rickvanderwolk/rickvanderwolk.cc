"""
exp-9 — Vliegtuigen boven je huis

Elk vliegtuig binnen RADIUS_NM van jouw punt is één stem. Niets verzonnen: de
klank komt volledig uit echte ADS-B data (adsb.lol), elke POLL seconden vers
opgehaald.

    hoogte     -> toonhoogte    (net opgestegen laag, kruishoogte hoog)
    afstand    -> volume        (dichtbij luider)
    richting   -> stereobeeld   (west links, oost rechts)
    snelheid   -> klankkleur    (sneller = helderder)

Tussen twee opvragingen glijdt elke stem in GLIDE seconden naar zijn nieuwe
waarde. Je hoort toestellen dus door het stereobeeld schuiven en met hun
daling meezakken in toonhoogte, in plaats van springen.

's Nachts is het bijna stil. Ligt je punt onder een aanvliegroute, dan wordt
het een koor dat de hele dag van vorm verandert. Geen twee dagen hetzelfde,
want het is gewoon het echte verkeer.

Draaien:  ../.venv/bin/python exp-9.py
Stoppen:  Ctrl+C
Nodig:    internet. Zet LAT/LON op je eigen adres.
"""

import json
import threading
import time
import urllib.request

import numpy as np
import sounddevice as sd

SR = 44100
LAT, LON = 51.794210, 5.649180   # zelfde punt als sunlight-clock en shadow-clock
RADIUS_NM = 30              # straal in zeemijl waarbinnen je toestellen hoort
POLL = 20.0                 # seconden tussen twee opvragingen
MAX_VOICES = 12             # hoogstens zoveel toestellen tegelijk (dichtstbij wint)
GLIDE = 6.0                 # seconden om naar een nieuwe waarde te glijden
UITFADE = 4.0               # seconden om een vertrokken toestel weg te laten zakken
GAIN = 0.5
VOICE_GAIN = 0.30           # volume van één toestel vlak boven je hoofd

ALT_MAX = 40000.0           # ft — hierboven wordt het niet hoger
ROOT = 110.0                # Hz — laagste toon (toestel op de grond)
SCALE = [0, 3, 5, 7, 10]    # mineur-pentatonisch, over 4 octaven herhaald
STEPS = [s + 12 * o for o in range(4) for s in SCALE] + [48]

URL = f"https://api.adsb.lol/v2/point/{LAT}/{LON}/{RADIUS_NM}"

latest = {}                 # hex -> doelwaarden; wordt in één keer vervangen
namen = {}                  # hex -> roepnaam, zodat vertrek ook een naam heeft
version = 0                 # telt op bij elke nieuwe meting
events = []                 # regels voor de console
voices = {}                 # hex -> klinkende stem


def alt_to_freq(alt_ft):
    x = np.clip(alt_ft, 0.0, ALT_MAX) / ALT_MAX
    idx = int(round((x ** 0.6) * (len(STEPS) - 1)))
    return ROOT * 2 ** (STEPS[idx] / 12)


def fetch():
    req = urllib.request.Request(URL, headers={"User-Agent": "geluid-lab/1.0"})
    with urllib.request.urlopen(req, timeout=12) as r:
        return json.load(r)


def poll_loop():
    """Draait apart van de audio: haalt data op en zet nieuwe doelwaarden klaar."""
    global latest, version
    seen = set()
    while True:
        try:
            data = fetch()
        except Exception as e:                      # netwerk weg? laatste beeld blijft staan
            events.append(("fout", str(e)[:60]))
            time.sleep(POLL)
            continue

        planes = []
        for a in data.get("ac") or []:
            alt = a.get("alt_baro")
            if alt == "ground" or alt is None:      # taxiënd verkeer telt niet
                continue
            dst = a.get("dst")
            if dst is None or dst > RADIUS_NM:
                continue
            planes.append({
                "hex": a.get("hex"),
                "flight": (a.get("flight") or a.get("r") or "?").strip(),
                "type": a.get("t") or "?",
                "alt": float(alt),
                "dst": float(dst),
                "dir": float(a.get("dir") or 0.0),
                "gs": float(a.get("gs") or 0.0),
                "rate": float(a.get("baro_rate") or 0.0),
            })

        planes.sort(key=lambda p: p["dst"])
        planes = planes[:MAX_VOICES]

        new = {}
        for p in planes:
            pan = 0.5 + 0.5 * np.sin(np.radians(p["dir"]))          # oost rechts
            near = np.clip(1.0 - p["dst"] / RADIUS_NM, 0.0, 1.0)
            new[p["hex"]] = {
                "freq": alt_to_freq(p["alt"]),
                "pan": float(pan),
                "amp": float(near ** 1.5) * VOICE_GAIN,
                "bright": float(np.clip((p["gs"] - 100) / 450.0, 0.0, 1.0)),
                "meta": p,
            }

        now = set(new)
        for h in now - seen:
            namen[h] = new[h]["meta"]["flight"]
            events.append(("in", new[h]["meta"], new[h]["freq"]))
        for h in seen - now:
            events.append(("uit", namen.pop(h, h), None))
        seen = now

        latest = new                                # atomaire wissel, geen lock nodig
        version += 1
        events.append(("meting", planes, None))
        time.sleep(POLL)


def sync_voices():
    """Zet doelwaarden op de stemmen; verdwenen toestellen faden naar stil."""
    snapshot = latest
    for h, tgt in snapshot.items():
        v = voices.get(h)
        if v is None:
            v = {"phase": 0.0, "freq": tgt["freq"], "pan": tgt["pan"],
                 "amp": 0.0, "bright": tgt["bright"]}
            voices[h] = v
        v["t_freq"] = tgt["freq"]
        v["t_pan"] = tgt["pan"]
        v["t_amp"] = tgt["amp"]
        v["t_bright"] = tgt["bright"]
    for h, v in voices.items():
        if h not in snapshot:
            v["t_amp"] = 0.0                        # netjes uitfaden, niet afkappen
            v["weg"] = True


seen_version = -1


def callback(outdata, frames, time_info, status):
    global seen_version
    if status:
        print(status)

    if version != seen_version:                     # alleen bij nieuwe data bijwerken
        seen_version = version
        sync_voices()

    t = np.arange(frames) / SR
    k = 1.0 - np.exp(-frames / (GLIDE * SR))        # hoe ver we dit blok opschuiven
    k_weg = 1.0 - np.exp(-frames / (UITFADE * SR))
    left = np.zeros(frames)
    right = np.zeros(frames)

    for h, v in list(voices.items()):
        amp0, pan0 = v["amp"], v["pan"]
        ka = k_weg if v.get("weg") else k
        v["freq"] += (v.get("t_freq", v["freq"]) - v["freq"]) * k
        v["pan"] += (v.get("t_pan", v["pan"]) - v["pan"]) * k
        v["amp"] += (v.get("t_amp", 0.0) - v["amp"]) * ka
        v["bright"] += (v.get("t_bright", v["bright"]) - v["bright"]) * k

        amp = np.linspace(amp0, v["amp"], frames)   # binnen het blok gladjes
        pan = np.linspace(pan0, v["pan"], frames)
        ph = v["phase"] + 2 * np.pi * v["freq"] * t
        b = v["bright"]
        sig = amp * (np.sin(ph) + 0.30 * b * np.sin(2 * ph) + 0.12 * b * np.sin(3 * ph))
        left += sig * np.cos(pan * np.pi / 2)
        right += sig * np.sin(pan * np.pi / 2)
        v["phase"] = (v["phase"] + 2 * np.pi * v["freq"] * frames / SR) % (2 * np.pi)

        if v["amp"] < 3e-4 and v.get("t_amp", 0.0) == 0.0:
            del voices[h]                           # pas opruimen als het stil is

    outdata[:] = np.tanh(GAIN * np.column_stack([left, right])).astype(np.float32)


def pan_arrow(pan):
    i = int(round(np.clip(pan, 0, 1) * 10))
    return "W" + "." * i + "o" + "." * (10 - i) + "O"


if __name__ == "__main__":
    print(f"exp-9  |  vliegtuigen binnen {RADIUS_NM} nm van {LAT}, {LON}  |  Ctrl+C")
    print("        hoogte=toonhoogte, afstand=volume, richting=stereo, snelheid=kleur\n")
    threading.Thread(target=poll_loop, daemon=True).start()
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(300)
                while events:
                    kind, a, b = events.pop(0)
                    if kind == "in":
                        pijl = "^" if a["rate"] > 200 else ("v" if a["rate"] < -200 else " ")
                        print(f"  + {a['flight']:<8} {a['type']:<5} "
                              f"{a['alt']:6.0f}ft{pijl} {a['dst']:5.1f}nm  "
                              f"{pan_arrow(0.5 + 0.5 * np.sin(np.radians(a['dir'])))}  "
                              f"{b:6.1f} Hz")
                    elif kind == "uit":
                        print(f"  - {a:<8} uit bereik")
                    elif kind == "fout":
                        print(f"  ! {a}")
                    else:
                        n = len(a)
                        dichtst = f", dichtstbij {a[0]['dst']:.1f}nm" if a else ""
                        print(f"    {time.strftime('%H:%M:%S')}  {n} in de lucht{dichtst}")
        except KeyboardInterrupt:
            print("\nstil.")
