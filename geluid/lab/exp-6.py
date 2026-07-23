"""
exp-6 — Granulaire wolk (versplinterde werkelijkheid)

Geluid opgebroken in duizenden korte korreltjes ('grains') van enkele tientallen
milliseconden, die overlappen tot een verschuivende wolk. Niets is een 'noot';
het is textuur die traag van dichtheid, toonhoogte en korrelgrootte verandert.
Alsof de werkelijkheid uit elkaar valt in stof en zich weer samenpakt.

Elke korrel is een venstertje sinus (Hann), dus per definitie klikvrij. De wolk
zelf morpht via trage LFO's: dichter/ijler, hoger/lager, korter/langer.

Draaien:  ../.venv/bin/python exp-6.py
Stoppen:  Ctrl+C
"""

import numpy as np
import sounddevice as sd

SR = 44100
GAIN = 0.5

DENS_MIN, DENS_MAX = 8.0, 45.0     # korrels per seconde (dichtheid ademt)
DENS_RATE = 1 / 37.0
CEN_MIN, CEN_MAX = 90.0, 520.0     # midden-toonhoogte drijft (Hz)
CEN_RATE = 1 / 53.0
DUR_MIN, DUR_MAX = 0.03, 0.16      # korrelduur drijft (s): pointillistisch<->uitgesmeerd
DUR_RATE = 1 / 41.0
SPREAD = 0.6                       # spreiding rond het midden (octaven)

rng = np.random.default_rng(6)
grains = []
now = 0                            # absolute samplepositie
samples_until_grain = 0
dens_phase = cen_phase = dur_phase = 0.0
cur = {"dens": 0.0, "center": 0.0, "dur": 0.0}


def lfo(phase, lo, hi):
    return lo + (hi - lo) * (0.5 + 0.5 * np.sin(2 * np.pi * phase))


def callback(outdata, frames, time, status):
    global grains, now, samples_until_grain, dens_phase, cen_phase, dur_phase
    if status:
        print(status)

    left = np.zeros(frames)
    right = np.zeros(frames)
    n_idx = np.arange(frames)

    density = lfo(dens_phase, DENS_MIN, DENS_MAX)
    center = lfo(cen_phase, CEN_MIN, CEN_MAX)
    grain_dur = lfo(dur_phase, DUR_MIN, DUR_MAX)
    cur.update(dens=density, center=center, dur=grain_dur * 1000)

    # nieuwe korrels plannen (kunnen meerdere per blok zijn)
    samples_until_grain -= frames
    while samples_until_grain <= 0 and len(grains) < 300:
        freq = center * 2.0 ** rng.uniform(-SPREAD, SPREAD)   # microtonale wolk
        pan = float(rng.uniform(0, 1))
        grains.append({
            "t0": now,
            "dur": int(grain_dur * SR),
            "freq": freq,
            "phase": float(rng.uniform(0, 2 * np.pi)),
            "amp": float(rng.uniform(0.5, 1.0)),
            "gl": np.cos(pan * np.pi / 2),
            "gr": np.sin(pan * np.pi / 2),
        })
        samples_until_grain += max(1, int(SR / density))

    # korrels renderen
    alive = []
    for g in grains:
        local = now + n_idx - g["t0"]              # samplepositie binnen de korrel
        active = (local >= 0) & (local < g["dur"])
        if active.any():
            win = 0.5 - 0.5 * np.cos(2 * np.pi * np.clip(local, 0, g["dur"]) / g["dur"])
            ph = g["phase"] + 2 * np.pi * g["freq"] * local / SR
            s = g["amp"] * win * np.sin(ph) * active
            left += s * g["gl"]
            right += s * g["gr"]
        if g["t0"] + g["dur"] > now:               # nog niet volledig verleden
            alive.append(g)
    grains = alive

    stereo = np.tanh(GAIN * np.column_stack([left, right]))
    outdata[:] = stereo.astype(np.float32)

    now += frames
    dens_phase = (dens_phase + DENS_RATE * frames / SR) % 1.0
    cen_phase = (cen_phase + CEN_RATE * frames / SR) % 1.0
    dur_phase = (dur_phase + DUR_RATE * frames / SR) % 1.0


def meter(v, lo, hi, w=14):
    frac = max(0.0, min(1.0, (v - lo) / (hi - lo)))
    n = int(round(frac * w))
    return "[" + "." * n + " " * (w - n) + "]"


if __name__ == "__main__":
    print("exp-6  |  granulaire wolk  |  dichtheid/hoogte/korrel drijven traag  |  Ctrl+C\n")
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(400)
                print(f"\r  dichtheid {meter(cur['dens'], DENS_MIN, DENS_MAX)} {cur['dens']:4.0f}/s   "
                      f"midden {cur['center']:5.0f} Hz   korrel {cur['dur']:4.0f} ms   "
                      f"({len(grains)} actief)   ", end="", flush=True)
        except KeyboardInterrupt:
            print("\nstil.")
