"""
exp-11 — De wind buiten speelt je kamer

Het echte weer op jouw coördinaten, elke POLL seconden opgehaald bij
Open-Meteo. Geen simulatie: staat het buiten stil, dan is het hier stil.

    luchtdruk      -> grondtoon    (lagedrukgebied zakt en wordt donker)
    windsnelheid   -> ruisband     (harder waaien = luider en helderder)
    windstoten     -> golfslag     (het verschil tussen stoot en gemiddelde
                                    bepaalt hoe onrustig de vlagen komen)
    windrichting   -> stereobeeld  (wind uit het oosten komt van rechts)
    temperatuur    -> warmte       (koud is dun en zuiver, warm heeft body)

Nieuwe metingen glijden er in GLIDE seconden in. Van minuut tot minuut hoor je
niets veranderen; kom je een paar uur later terug, dan is het weer omgeslagen
en klinkt de kamer anders. Een storm hoor je aankomen voordat je hem ziet.

Draaien:  ../.venv/bin/python exp-11.py
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
LAT, LON = 52.09, 5.12      # ~Utrecht — zet hier je eigen plek neer
POLL = 600.0                # seconden tussen twee metingen (bron ververst per kwartier)
GLIDE = 180.0               # seconden om een nieuwe meting in te laten glijden
GAIN = 0.5

DRUK_LAAG, DRUK_HOOG = 980.0, 1040.0     # hPa
F_STORM, F_RUSTIG = 41.0, 62.0           # Hz — grondtoon bij die twee uitersten
WIND_VOL = 45.0                          # km/h waarbij de ruis op vol staat
TEMP_KOUD, TEMP_WARM = -5.0, 30.0        # °C

URL = (f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}"
       "&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,"
       "temperature_2m,pressure_msl")

RICHTINGEN = ["N", "NNO", "NO", "ONO", "O", "OZO", "ZO", "ZZO",
              "Z", "ZZW", "ZW", "WZW", "W", "WNW", "NW", "NNW"]

# --- gemeten (door de weerdraad bijgewerkt) ---
w = {"wind": 0.0, "stoot": 0.0, "richting": 270.0, "temp": 10.0, "druk": 1013.0,
     "tijd": None}
events = []

# --- geglede waarden (wat je nú hoort) ---
cur = {"f": 55.0, "ruis": 0.0, "kleur": 200.0, "pan": 0.5, "warm": 0.5, "vlaag": 0.0}

rng = np.random.default_rng(11)
phase = np.zeros(3)
gust = 0.0                  # trage toevalswandeling: de vlagen zelf
NOISE_TAIL = 512
tail = np.zeros(NOISE_TAIL)


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


def weer_loop():
    while True:
        try:
            req = urllib.request.Request(URL, headers={"User-Agent": "geluid-lab/1.0"})
            with urllib.request.urlopen(req, timeout=12) as r:
                c = json.load(r)["current"]
            w.update({"wind": float(c["wind_speed_10m"]),
                      "stoot": float(c["wind_gusts_10m"]),
                      "richting": float(c["wind_direction_10m"]),
                      "temp": float(c["temperature_2m"]),
                      "druk": float(c["pressure_msl"]),
                      "tijd": c["time"]})
            events.append(None)
        except Exception as e:
            events.append(str(e)[:60])
        time.sleep(POLL)


def kompas(graden):
    return RICHTINGEN[int((graden % 360) / 22.5 + 0.5) % 16]


def callback(outdata, frames, time_info, status):
    global phase, gust
    if status:
        print(status)

    k = 1.0 - np.exp(-frames / (GLIDE * SR))
    druk = np.clip(w["druk"], DRUK_LAAG, DRUK_HOOG)
    f_doel = F_STORM + (F_RUSTIG - F_STORM) * (druk - DRUK_LAAG) / (DRUK_HOOG - DRUK_LAAG)
    wind = np.clip(w["wind"] / WIND_VOL, 0.0, 1.2)
    warm_doel = np.clip((w["temp"] - TEMP_KOUD) / (TEMP_WARM - TEMP_KOUD), 0.0, 1.0)
    vlaag_doel = np.clip((w["stoot"] - w["wind"]) / max(w["wind"], 4.0), 0.0, 1.5)

    cur["f"] += (f_doel - cur["f"]) * k
    cur["ruis"] += (wind ** 0.7 - cur["ruis"]) * k
    cur["kleur"] += ((380.0 - 360.0 * min(wind, 1.0)) - cur["kleur"]) * k
    cur["pan"] += ((0.5 + 0.35 * np.sin(np.radians(w["richting"]))) - cur["pan"]) * k
    cur["warm"] += (warm_doel - cur["warm"]) * k
    cur["vlaag"] += (vlaag_doel - cur["vlaag"]) * k

    t = np.arange(frames) / SR
    left = np.zeros(frames)
    right = np.zeros(frames)

    # --- drone op de luchtdruk, warmte bepaalt hoeveel boventonen meekomen ---
    b = cur["warm"]
    for i, (mult, pan, lvl) in enumerate([(1.0, 0.5, 0.55), (1.5, 0.3, 0.25),
                                          (2.0, 0.7, 0.20)]):
        f = cur["f"] * mult
        ph = phase[i] + 2 * np.pi * f * t
        sig = (np.sin(ph) + 0.30 * b * np.sin(2 * ph) + 0.12 * b * np.sin(3 * ph)) * lvl
        left += sig * np.cos(pan * np.pi / 2)
        right += sig * np.sin(pan * np.pi / 2)
        phase[i] = (phase[i] + 2 * np.pi * f * frames / SR) % (2 * np.pi)

    # --- vlagen: trage toevalswandeling, onrustiger bij grotere windstoten ---
    tau = 6.0                                   # seconden geheugen van een vlaag
    a = np.exp(-frames / (tau * SR))
    gust_vorig = gust
    gust = a * gust + np.sqrt(1 - a * a) * rng.standard_normal()
    g0 = 1.0 + cur["vlaag"] * 0.6 * gust_vorig
    g1 = 1.0 + cur["vlaag"] * 0.6 * gust
    swell = np.clip(np.linspace(g0, g1, frames), 0.05, 2.5)

    # --- de wind zelf: ruisband, breder en luider naarmate het harder waait ---
    if cur["ruis"] > 0.001:
        n = int(cur["kleur"])
        amp = 0.38 * cur["ruis"] * swell
        pan = cur["pan"]
        left += band_noise(frames, n) * amp * np.cos(pan * np.pi / 2)
        right += band_noise(frames, n) * amp * np.sin(pan * np.pi / 2)

    outdata[:] = np.tanh(GAIN * np.column_stack([left, right])).astype(np.float32)


def meter(value, width=14):
    filled = int(round(np.clip(value, 0, 1) * width))
    return "[" + "#" * filled + "-" * (width - filled) + "]"


if __name__ == "__main__":
    print(f"exp-11  |  het echte weer op {LAT}, {LON}  |  Ctrl+C om te stoppen")
    print("         druk=grondtoon, wind=ruis, stoten=vlagen, richting=stereo, "
          "temp=warmte")
    print(f"         nieuwe meting elke {POLL / 60:.0f} min, glijdt er in "
          f"{GLIDE / 60:.0f} min in\n")
    threading.Thread(target=weer_loop, daemon=True).start()
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(2000)
                while events:
                    print(" " * 78, end="\r")      # meterregel wissen
                    fout = events.pop(0)
                    if fout:
                        print(f"  ! {fout}")
                    else:
                        print(f"  · {w['tijd']}  wind {w['wind']:4.1f} km/h uit "
                              f"{kompas(w['richting'])} ({w['richting']:.0f}°), "
                              f"stoten {w['stoot']:4.1f}, {w['temp']:4.1f}°C, "
                              f"{w['druk']:6.1f} hPa")
                print(f"    {cur['f']:4.1f} Hz  wind {meter(cur['ruis'])} "
                      f"vlagen {meter(cur['vlaag'] / 1.5)} warmte {meter(cur['warm'])}",
                      end="\r", flush=True)
        except KeyboardInterrupt:
            print("\nstil.")
