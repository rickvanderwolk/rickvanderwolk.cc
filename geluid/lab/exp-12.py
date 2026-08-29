"""
exp-12 — Kamer met vertraging

Je hoort je eigen kamer, VERTRAAG seconden geleden. De microfoon schrijft in een
ringbuffer, de speaker leest er precies één buffer achter. Niets aan de klank
wordt bewerkt: het is je kamer, alleen dan.

Zet 'm aan en het is een minuut lang stil — die minuut moet eerst gebeuren.
Daarna komt alles terug: de stoel die je verschoof, iets wat je zei tegen
niemand, een auto die allang weg is. Je praat, en een minuut later praat je
terug. Wie binnenloopt hoort een kamer die niet klopt met wat hij ziet.

De terminal laat zien hoe laat het is dat je hoort.

Draaien:  ../.venv/bin/python exp-12.py
Korter:   ../.venv/bin/python exp-12.py 5      <- 5 seconden vertraging
Stoppen:  Ctrl+C
BELANGRIJK: koptelefoon op. Op speakers luistert de microfoon zichzelf terug
            en heb je binnen een minuut een rondzingende kamer.
            macOS vraagt de eerste keer om toegang tot de microfoon.
"""

import sys
import time

import numpy as np
import sounddevice as sd

SR = 44100
VERTRAAG = 60.0             # seconden vertraging. Probeer ook 5, of 600.
GAIN = 1.0                  # volume van wat er terugkomt
BLOK = 1024

# Los meegeven kan ook, dan hoef je hierboven niks te veranderen:
#   exp-12.py 5     vijf seconden
#   exp-12.py 0.4   bijna een galm
if len(sys.argv) > 1:
    VERTRAAG = float(sys.argv[1])

MINIMUM = BLOK / SR                     # korter dan één blok kan de ringbuffer niet
if VERTRAAG < MINIMUM:
    print(f"  ! {VERTRAAG}s is korter dan één audioblok; opgehoogd naar {MINIMUM:.3f}s")
    VERTRAAG = MINIMUM

buf = np.zeros(int(VERTRAAG * SR), dtype=np.float32)
pos = 0                     # schrijfkop; de leeskop staat er precies één ronde achter
verwerkt = 0                # samples sinds de start
niveau_in = 0.0
niveau_uit = 0.0


def callback(indata, outdata, frames, time_info, status):
    global pos, verwerkt, niveau_in, niveau_uit
    if status:
        print(status)

    n = len(buf)
    idx = (pos + np.arange(frames)) % n

    uit = buf[idx].copy()                   # eerst lezen: dit is precies VERTRAAG geleden
    buf[idx] = indata[:, 0]                 # dan overschrijven met nu
    pos = (pos + frames) % n
    verwerkt += frames

    uit = np.tanh(GAIN * uit)
    outdata[:] = np.column_stack([uit, uit]).astype(np.float32)

    niveau_in = float(np.sqrt(np.mean(indata[:, 0] ** 2)))
    niveau_uit = float(np.sqrt(np.mean(uit ** 2)))


def meter(rms, width=20):
    # ruwweg -60..0 dB over de balk
    db = 20 * np.log10(max(rms, 1e-6))
    filled = int(round(np.clip((db + 60) / 60, 0, 1) * width))
    return "[" + "#" * filled + "-" * (width - filled) + "]"


if __name__ == "__main__":
    kop = f"{VERTRAAG:.0f}" if VERTRAAG >= 1 else f"{VERTRAAG:.2f}"
    print(f"exp-12  |  je kamer, {kop} seconden geleden  |  Ctrl+C")
    print("         koptelefoon op, anders zingt het rond.\n")
    start = time.time()
    try:
        stream = sd.Stream(samplerate=SR, blocksize=BLOK, dtype="float32",
                           channels=(1, 2), callback=callback)
    except Exception as e:
        print(f"  ! kon microfoon+speaker niet samen openen: {e}")
        print("    kies desnoods handmatig een apparaat, bijv.:")
        print("    python -c \"import sounddevice as sd; print(sd.query_devices())\"")
        print("    en zet dan bovenin  sd.default.device = (invoer, uitvoer)")
        raise SystemExit(1)

    with stream:
        try:
            while True:
                sd.sleep(250)
                t = verwerkt / SR
                if t < VERTRAAG:
                    print(f"    vullen… nog {VERTRAAG - t:5.1f}s stilte   "
                          f"nu binnen {meter(niveau_in)}", end="\r", flush=True)
                else:
                    hoort = time.strftime("%H:%M:%S",
                                          time.localtime(time.time() - VERTRAAG))
                    print(f"    je hoort {hoort}   binnen {meter(niveau_in)}  "
                          f"terug {meter(niveau_uit)}", end="\r", flush=True)
        except KeyboardInterrupt:
            print("\nstil.")
