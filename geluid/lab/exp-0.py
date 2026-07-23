"""
exp-0 — Enkele frequentie

Eén zuivere sinus. Verder niets. De spanning zit in de stilstand:
een toon die gewoon blijft hangen. Heel langzaam 'ademt' het volume
(een trage swell), zodat de toon leeft zonder te veranderen van hoogte.

Draaien:  ../.venv/bin/python exp-0.py
Stoppen:  Ctrl+C
"""

import numpy as np
import sounddevice as sd

SR = 44100          # samplerate
FREQ = 110.0        # Hz — de enige frequentie. Speel hier gerust mee.
GAIN = 0.22         # meesterviolume (laag houden, sinussen zijn 'hard')
BREATH = 0.05       # Hz — snelheid van het ademen (0.05 = ~20s per cyclus)

phase = 0.0         # loopt door tussen blokken -> geen klikken
breath_phase = 0.0


def callback(outdata, frames, time, status):
    global phase, breath_phase
    if status:
        print(status)

    t = (np.arange(frames) + 0.0) / SR

    # doorlopende fase voor de toon
    ph = phase + 2 * np.pi * FREQ * t
    tone = np.sin(ph)

    # trage ademhaling van het volume (blijft tussen ~0.5 en 1.0)
    bph = breath_phase + 2 * np.pi * BREATH * t
    breath = 0.75 + 0.25 * np.sin(bph)

    signal = (GAIN * breath * tone).astype(np.float32)
    outdata[:] = np.column_stack([signal, signal])  # stereo, gelijk

    phase = (phase + 2 * np.pi * FREQ * frames / SR) % (2 * np.pi)
    breath_phase = (breath_phase + 2 * np.pi * BREATH * frames / SR) % (2 * np.pi)


def meter(value, lo, hi, width=24):
    # tekstbalkje: laat een waarde tussen lo en hi zien
    frac = (value - lo) / (hi - lo)
    frac = max(0.0, min(1.0, frac))
    filled = int(round(frac * width))
    return "[" + "#" * filled + "-" * (width - filled) + "]"


if __name__ == "__main__":
    print(f"exp-0  |  {FREQ:.1f} Hz constant  |  't volume ademt langzaam  |  Ctrl+C")
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(300)
                breath = 0.75 + 0.25 * np.sin(breath_phase)   # zelfde als in de callback
                print(f"\r  volume {meter(breath, 0.5, 1.0)} {breath*100:4.0f}%   ", end="", flush=True)
        except KeyboardInterrupt:
            print("\nstil.")
