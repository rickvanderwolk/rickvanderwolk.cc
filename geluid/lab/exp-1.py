"""
exp-1 — Heel langzaam veranderende frequentie

Eén sinus, maar de toonhoogte schuift onmerkbaar traag op en neer.
Van moment tot moment hoor je niks veranderen; kom je na een paar minuten
terug, dan staat de toon ergens anders. Als schuivend daglicht.

De frequentie glijdt op een hele trage LFO tussen ONDER en BOVEN heen en
weer. Eén volle cyclus duurt PERIODE seconden.

Draaien:  ../.venv/bin/python exp-1.py
Stoppen:  Ctrl+C
"""

import numpy as np
import sounddevice as sd

SR = 44100
ONDER = 70.0        # Hz — laagste toonhoogte
BOVEN = 180.0       # Hz — hoogste toonhoogte
PERIODE = 600.0     # seconden per volledige heen-en-weer (600 = 10 min)
GAIN = 0.22

phase = 0.0         # toonfase, loopt door -> geen klikken
lfo_phase = 0.0     # fase van de trage drift
elapsed = 0.0       # voor een rustige console-uitdraai


def current_freq(lfo_ph):
    # sin -> [-1,1] omgezet naar [ONDER, BOVEN]
    return ONDER + (BOVEN - ONDER) * (0.5 + 0.5 * np.sin(lfo_ph))


def callback(outdata, frames, time, status):
    global phase, lfo_phase, elapsed
    if status:
        print(status)

    # per sample de trage LFO uitrekenen, daaruit de momentane frequentie,
    # en die integreren tot fase -> vloeiend glijden zonder klikken
    n = np.arange(frames)
    lfo_ph = lfo_phase + 2 * np.pi * (n / SR) / PERIODE
    freq = current_freq(lfo_ph)

    dphase = 2 * np.pi * freq / SR
    ph = phase + np.cumsum(dphase)
    tone = np.sin(ph)

    signal = (GAIN * tone).astype(np.float32)
    outdata[:] = np.column_stack([signal, signal])

    phase = ph[-1] % (2 * np.pi)
    lfo_phase = (lfo_phase + 2 * np.pi * (frames / SR) / PERIODE) % (2 * np.pi)

    elapsed += frames / SR


if __name__ == "__main__":
    print(f"exp-1  |  {ONDER:.0f}-{BOVEN:.0f} Hz  |  {PERIODE/60:.0f} min per cyclus  |  Ctrl+C")
    last_print = -999
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(1000)
                if elapsed - last_print >= 15:   # elke ~15s even melden waar-ie staat
                    last_print = elapsed
                    f = float(current_freq(lfo_phase))
                    print(f"  t={elapsed:6.0f}s   ~{f:6.1f} Hz")
        except KeyboardInterrupt:
            print("\nstil.")
