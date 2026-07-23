"""
exp-2 — Spannende soundscape

Een donkere, evoluerende drone: drie licht ontstemde oscillatoren die tegen
elkaar aan zweven, terwijl hun klankkleur traag helderder en doffer wordt.
Daaroverheen vallen op onvoorspelbare momenten losse beltonen, gekozen uit
een frygische ladder (die verlaagde tweede geeft de spanning).

Niets herhaalt exact; het blijft langzaam de kant op kruipen die het zelf kiest.

Draaien:  ../.venv/bin/python exp-2.py
Stoppen:  Ctrl+C
"""

import numpy as np
import sounddevice as sd

SR = 44100
GAIN = 0.28

# --- drone: root A1, kwint, octaaf, elk een tikje ontstemd voor 'zweving' ---
DRONE_FREQS = np.array([55.0, 82.41, 110.0])
DETUNE = np.array([1.000, 1.003, 0.997])     # kleine ontstemming
DRONE_PAN = np.array([0.5, 0.2, 0.8])        # wat stereobreedte
drone_phase = np.zeros(3)
bright_phase = 0.0        # trage LFO voor klankkleur
BRIGHT_RATE = 1 / 40.0    # Hz -> ~40s per helder/dof-cyclus

# --- belletjes: frygische ladder boven grondtoon A ---
BELL_ROOT = 220.0
PHRYGIAN = [0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19]   # halve tonen
NOTE_NAMES = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"]
rng = np.random.default_rng(7)
bells = []                # actieve beltonen
samples_until_bell = SR   # eerste bel na ~1s

events = []               # log-regels voor de console (in main-loop geleegd)
current_bright = 0.0      # laatst berekende klankkleur (0=dof, 1=helder)


def note_name(st):
    return f"{NOTE_NAMES[st % 12]}{3 + st // 12}"


def spawn_bell():
    st = int(rng.choice(PHRYGIAN))
    freq = BELL_ROOT * 2 ** (st / 12)
    pan = float(rng.uniform(0.0, 1.0))
    return {
        "freq": freq,
        "name": note_name(st),
        "pan": pan,
        "phase": 0.0,
        "amp": float(rng.uniform(0.12, 0.26)),
        "tau": float(rng.uniform(1.5, 4.5)),   # uitsterftijd (s)
        "age": 0,                               # in samples
        "gl": np.cos(pan * np.pi / 2),          # gelijk-vermogen pan
        "gr": np.sin(pan * np.pi / 2),
    }


def callback(outdata, frames, time, status):
    global drone_phase, bright_phase, samples_until_bell, bells, current_bright
    if status:
        print(status)

    t = np.arange(frames) / SR
    left = np.zeros(frames)
    right = np.zeros(frames)

    # trage klankkleur: hoeveel boventonen we bijmengen (0..1)
    bright = 0.5 + 0.5 * np.sin(2 * np.pi * bright_phase)
    current_bright = float(bright)

    for i in range(3):
        freq = DRONE_FREQS[i] * DETUNE[i]
        ph = drone_phase[i] + 2 * np.pi * freq * t
        sig = np.sin(ph) + 0.30 * bright * np.sin(2 * ph) + 0.12 * bright * np.sin(3 * ph)
        pan = DRONE_PAN[i]
        left += sig * np.cos(pan * np.pi / 2) * 0.5
        right += sig * np.sin(pan * np.pi / 2) * 0.5
        drone_phase[i] = (drone_phase[i] + 2 * np.pi * freq * frames / SR) % (2 * np.pi)

    bright_phase = (bright_phase + BRIGHT_RATE * frames / SR) % 1.0

    # nieuwe belletjes plannen
    samples_until_bell -= frames
    if samples_until_bell <= 0:
        b = spawn_bell()
        bells.append(b)
        events.append((b["name"], b["freq"], b["pan"]))   # console laat 't in de main-loop zien
        samples_until_bell = int(rng.uniform(1.2, 4.5) * SR)

    # actieve belletjes renderen (sinus met exponentiële uitsterf)
    alive = []
    for b in bells:
        age_t = (b["age"] + np.arange(frames)) / SR
        env = b["amp"] * np.exp(-age_t / b["tau"])
        ph = b["phase"] + 2 * np.pi * b["freq"] * t
        tone = env * np.sin(ph)
        left += tone * b["gl"]
        right += tone * b["gr"]
        b["phase"] = (b["phase"] + 2 * np.pi * b["freq"] * frames / SR) % (2 * np.pi)
        b["age"] += frames
        if b["age"] / SR < b["tau"] * 6:   # laten uitsterven, dan opruimen
            alive.append(b)
    bells = alive

    # zachte begrenzing zodat stapelende stemmen niet klippen
    stereo = np.tanh(GAIN * np.column_stack([left, right]))
    outdata[:] = stereo.astype(np.float32)


def bright_meter(value, width=16):
    filled = int(round(value * width))
    return "dof [" + "#" * filled + "-" * (width - filled) + "] helder"


def pan_arrow(pan):
    # waar in het stereobeeld valt de bel
    return "L" + "." * int(pan * 10) + "o" + "." * int((1 - pan) * 10) + "R"


if __name__ == "__main__":
    print("exp-2  |  drone + frygische belletjes  |  Ctrl+C om te stoppen\n")
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(400)
                while events:                       # gevallen belletjes tonen
                    name, freq, pan = events.pop(0)
                    print(f"  ~ bel {name:<4} {freq:6.1f} Hz   {pan_arrow(pan)}")
                print(f"    drone {bright_meter(current_bright)}", end="\r", flush=True)
        except KeyboardInterrupt:
            print("\nstil.")
