"""
exp-5 — Formant-koor (bijna-menselijke stem)

Een klank die klinkt als een stem of koor dat 'aaa' zingt, en traag doormorpht
naar 'eee', 'iii', 'ooo', 'uuu' en terug — maar zonder woorden, zonder mens.
De uncanny valley van de stem: een aanwezigheid die net geen mens is.

Hoe: een boventoonrijke grondtoon (zaagtand-achtig) waarvan we per boventoon de
sterkte vormen rond de formant-frequenties van klinkers. Drie licht ontstemde
stemmen met eigen vibrato geven de koor-zweving. De formanten schuiven traag
tussen klinkers -> de 'mond' verandert vanzelf.

Draaien:  ../.venv/bin/python exp-5.py
Stoppen:  Ctrl+C
"""

import numpy as np
import sounddevice as sd

SR = 44100
GAIN = 0.22
F0 = 104.0                 # grondtoon (Hz) — laag koor
K = 32                     # aantal boventonen
MORPH = 1 / 22.0           # klinker-morph snelheid (Hz) -> ~22s per klinker

# klinkers als formant-frequenties [F1, F2, F3] (Hz)
VOWELS = [
    ("a", [730, 1090, 2440]),
    ("e", [530, 1840, 2480]),
    ("i", [270, 2290, 3010]),
    ("o", [570,  840, 2410]),
    ("u", [300,  870, 2240]),
]
BW = np.array([90.0, 110.0, 170.0])     # formant-bandbreedtes
FW = np.array([1.0, 0.7, 0.35])         # formant-gewichten (F1 sterkst)

# drie stemmen: kleine ontstemming + eigen vibrato -> koor
DETUNE = np.array([1.000, 1.004, 0.997])
VIB_RATE = np.array([4.7, 5.3, 5.0])
VIB_DEPTH = 0.004
VOICE_PAN = np.array([0.30, 0.5, 0.70])

phases = np.zeros((3, K))
vib_phase = np.zeros(3)
morph_phase = 0.0
drift_phase = 0.0
cur = {"vowel": "a"}


def formant_gain(freqs, F):
    # som van drie resonanties (lorentz-pieken) + een vloertje voor 'lucht'
    g = np.full_like(freqs, 0.03)
    for j in range(3):
        g = g + FW[j] / (1.0 + ((freqs - F[j]) / (BW[j] / 2)) ** 2)
    return g


def callback(outdata, frames, time, status):
    global phases, vib_phase, morph_phase, drift_phase
    if status:
        print(status)

    t = np.arange(frames) / SR
    left = np.zeros(frames)
    right = np.zeros(frames)

    # welke twee klinkers, en hoe ver ertussen (traag rondlopend)
    pos = (morph_phase * len(VOWELS)) % len(VOWELS)
    a = int(np.floor(pos))
    b = (a + 1) % len(VOWELS)
    frac = pos - a
    F = (1 - frac) * np.array(VOWELS[a][1]) + frac * np.array(VOWELS[b][1])
    cur["vowel"] = VOWELS[a][0] if frac < 0.5 else VOWELS[b][0]

    # trage grondtoon-drift, ± paar procent
    f0 = F0 * (1.0 + 0.02 * np.sin(2 * np.pi * drift_phase))

    ks = np.arange(1, K + 1)
    for v in range(3):
        vib = 1.0 + VIB_DEPTH * np.sin(2 * np.pi * vib_phase[v])
        f0v = f0 * DETUNE[v] * vib
        harm_freqs = ks * f0v
        src = 1.0 / ks                              # zaagtand-achtige bron
        amps = src * formant_gain(harm_freqs, F)
        amps = amps / np.sum(amps)                  # normaliseren per stem
        sig = np.zeros(frames)
        for hi in range(K):
            f = harm_freqs[hi]
            if f > SR / 2:                          # geen aliasing
                continue
            ph = phases[v, hi] + 2 * np.pi * f * t
            sig += amps[hi] * np.sin(ph)
            phases[v, hi] = (phases[v, hi] + 2 * np.pi * f * frames / SR) % (2 * np.pi)
        pan = VOICE_PAN[v]
        left += sig * np.cos(pan * np.pi / 2)
        right += sig * np.sin(pan * np.pi / 2)
        vib_phase[v] = (vib_phase[v] + VIB_RATE[v] * frames / SR) % 1.0

    stereo = np.tanh(GAIN * np.column_stack([left, right]))
    outdata[:] = stereo.astype(np.float32)

    morph_phase = (morph_phase + MORPH * frames / SR) % 1.0
    drift_phase = (drift_phase + (1 / 40.0) * frames / SR) % 1.0


if __name__ == "__main__":
    print(f"exp-5  |  formant-koor  |  morpht door aeiou  |  Ctrl+C\n")
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(400)
                print(f"\r  mond staat op:  '{cur['vowel']}{cur['vowel']}{cur['vowel']}'      ",
                      end="", flush=True)
        except KeyboardInterrupt:
            print("\nstil.")
