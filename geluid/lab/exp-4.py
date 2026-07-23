"""
exp-4 — Shepard-toon (eeuwig stijgend)

Een auditieve illusie: de klank lijkt oneindig te blijven stijgen (of dalen),
maar komt nooit ergens aan. Een 'barberpole' voor je oren — desoriënterend,
zonder oplossing, perfect om eindeloos te laten draaien in een installatie.

Hoe: een stapel sinussen precies een octaaf uit elkaar, allemaal samen omhoog
vegend. Aan de bovenkant vervagen ze en aan de onderkant komen ze weer op, via
een vaste klok-kromme over de frequentie. Het oor hoort stijging zonder dat het
ergens hoger wordt.

Draaien:  ../.venv/bin/python exp-4.py
Stoppen:  Ctrl+C
Omkeren:  zet DIRECTION op -1 voor eeuwig dálen (nog onheilspellender).
"""

import numpy as np
import sounddevice as sd

SR = 44100
N = 9                       # aantal octaaf-lagen
FMIN = 25.0                 # onderrand (Hz)
FMAX = FMIN * 2 ** N        # bovenrand — hier is de klok-kromme ~stil (klikvrij recyclen)
FCENTER = FMIN * 2 ** (N / 2)   # piek van de klok-kromme
SIGMA_OCT = 1.4             # breedte van de kromme (in octaven)
LOOP = 30.0                 # seconden per octaaf (lager = sneller stijgen)
DIRECTION = +1              # +1 = eeuwig stijgen, -1 = eeuwig dalen
GAIN = 0.45

freqs = FMIN * 2.0 ** np.arange(N)   # octaaf-gespreide lagen
phases = np.zeros(N)
elapsed = 0.0


def envelope(f):
    # gaussische klok over log-frequentie: sterk in het midden, stil aan de randen
    return np.exp(-0.5 * ((np.log2(f) - np.log2(FCENTER)) / SIGMA_OCT) ** 2)


def callback(outdata, frames, time, status):
    global freqs, phases, elapsed
    if status:
        print(status)

    t = np.arange(frames) / SR
    mix = np.zeros(frames)

    amps = envelope(freqs)
    amps = amps / np.sum(amps)          # constante totale luidheid
    for i in range(N):
        f = freqs[i]
        ph = phases[i] + 2 * np.pi * f * t
        mix += amps[i] * np.sin(ph)
        phases[i] = (phases[i] + 2 * np.pi * f * frames / SR) % (2 * np.pi)

    # alle lagen samen omhoog/omlaag vegen (continu octaaf per LOOP)
    freqs = freqs * 2.0 ** (DIRECTION * frames / SR / LOOP)
    # aan de randen recyclen — daar is de kromme ~stil, dus geen klik
    freqs = np.where(freqs > FMAX, freqs / 2 ** N, freqs)
    freqs = np.where(freqs < FMIN, freqs * 2 ** N, freqs)

    sig = (GAIN * mix).astype(np.float32)
    outdata[:] = np.column_stack([sig, sig])
    elapsed += frames / SR


if __name__ == "__main__":
    richting = "stijgt" if DIRECTION > 0 else "daalt"
    print(f"exp-4  |  Shepard-toon, {richting} eeuwig  |  {LOOP:.0f}s per octaaf  |  Ctrl+C")
    pijl = "^" if DIRECTION > 0 else "v"
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(500)
                pos = (np.log2(np.min(freqs) / FMIN)) % 1.0    # positie in het huidige octaaf
                bar = int(pos * 20)
                print(f"\r  {richting} {pijl} [{'|'*bar}{' '*(20-bar)}]  (herhaalt, maar hoort nooit op)",
                      end="", flush=True)
        except KeyboardInterrupt:
            print("\nstil.")
