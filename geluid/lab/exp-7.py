"""
exp-7 — Binaurale zwevingen (alleen in je hoofd)

Elk oor krijgt een iets andere frequentie. Ze bestaan niet als klank in de
lucht, maar je brein hoort het verschil als een langzame pulsatie -- een
fantoom-ritme dat alléén binnen in je schedel zit. Draag je de koptelefoon af,
dan is de puls weg. Heel lijfelijk en vervreemdend.

De drager schuift traag van hoogte, en de zwevingssnelheid kruipt van een trage
hartslag (~1 Hz) naar een nerveus flikkeren (~10 Hz) en terug.

Draaien:  ../.venv/bin/python exp-7.py
Stoppen:  Ctrl+C
BELANGRIJK: koptelefoon vereist. Op speakers werkt de illusie niet.
"""

import numpy as np
import sounddevice as sd

SR = 44100
GAIN = 0.20

CAR_MIN, CAR_MAX = 120.0, 240.0    # drager (Hz) drijft traag
CAR_RATE = 1 / 90.0
BEAT_MIN, BEAT_MAX = 1.0, 10.0     # zwevingssnelheid (Hz) kruipt op en neer
BEAT_RATE = 1 / 60.0

SUB = 40.0                         # zachte grondlaag onder alles
phL = phR = sub_phase = 0.0
car_phase = beat_phase = 0.0
cur = {"car": 0.0, "beat": 0.0}


def lfo(phase, lo, hi):
    return lo + (hi - lo) * (0.5 + 0.5 * np.sin(2 * np.pi * phase))


def callback(outdata, frames, time, status):
    global phL, phR, sub_phase, car_phase, beat_phase
    if status:
        print(status)

    t = np.arange(frames) / SR
    carrier = lfo(car_phase, CAR_MIN, CAR_MAX)
    beat = lfo(beat_phase, BEAT_MIN, BEAT_MAX)
    cur.update(car=carrier, beat=beat)

    fL = carrier - beat / 2.0
    fR = carrier + beat / 2.0

    left = np.sin(phL + 2 * np.pi * fL * t)
    right = np.sin(phR + 2 * np.pi * fR * t)

    # zachte gedeelde grondlaag (in beide oren gelijk) voor body
    sub = 0.3 * np.sin(sub_phase + 2 * np.pi * SUB * t)
    left = 0.8 * left + sub
    right = 0.8 * right + sub

    stereo = np.tanh(GAIN * np.column_stack([left, right]))
    outdata[:] = stereo.astype(np.float32)

    phL = (phL + 2 * np.pi * fL * frames / SR) % (2 * np.pi)
    phR = (phR + 2 * np.pi * fR * frames / SR) % (2 * np.pi)
    sub_phase = (sub_phase + 2 * np.pi * SUB * frames / SR) % (2 * np.pi)
    car_phase = (car_phase + CAR_RATE * frames / SR) % 1.0
    beat_phase = (beat_phase + BEAT_RATE * frames / SR) % 1.0


if __name__ == "__main__":
    print("exp-7  |  binaurale zwevingen  |  KOPTELEFOON vereist  |  Ctrl+C\n")
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(400)
                puls = "puls " + "o " * int(round(cur["beat"]))
                print(f"\r  drager {cur['car']:5.1f} Hz   zweving {cur['beat']:4.1f} Hz   {puls:28s}",
                      end="", flush=True)
        except KeyboardInterrupt:
            print("\nstil.")
