"""
exp-8 — Evoluerende loop (nooit twee keer hetzelfde)

Een herkenbaar lusje dat blijft herhalen, maar bij elke omwenteling precies
EEN ding verandert: een toon omhoog/omlaag, een tik erbij of eraf, een ander
volume, iets sneller/langzamer, of een maat langer. Vertrouwd, en toch drijft
het langzaam weg — na een tijd sta je ergens heel anders zonder dat je een
sprong kon aanwijzen.

Nooit exact hetzelfde, technisch onmogelijk gemaakt: naast de mutatie per loop
loopt een onhoorbaar kleine ontstemming (±0,3%) mee, gekoppeld aan de loop-teller
via een irrationele factor. Die reeks keert nooit terug, dus geen twee
omwentelingen zijn ooit identiek — je hoort het verschil niet, maar het is er.

De terminal toont elke loop het ritme-raster en wat er veranderde.

Draaien:  ../.venv/bin/python exp-8.py
Stoppen:  Ctrl+C
"""

import numpy as np
import sounddevice as sd

SR = 44100
GAIN = 0.5
ROOT = 220.0
# toegestane toonhoogtes: mineur-pentatonisch over ~2 octaven (halve tonen)
ALLOWED = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24]
TAU = 0.38                 # uitsterftijd per tik (s) -> mallet/pluk-achtig

rng = np.random.default_rng(8)


def seed_pattern():
    p = [{"on": False, "pitch": 0, "vel": 0.8} for _ in range(8)]
    for step, pi in {0: 0, 2: 2, 3: 1, 5: 3, 6: 2}.items():   # klein herkenbaar motiefje
        p[step] = {"on": True, "pitch": pi, "vel": 0.8}
    return p


pattern = seed_pattern()
step_dur = 0.22            # seconden per stap
step_index = 0
samples_to_next = 0        # 0 = eerste stap meteen
now = 0
voices = []
loop_count = 0
events = []                # (loop, raster, tekst, stappen, puls) voor de console


def detune():
    # onhoorbaar klein, maar nooit herhalend (irrationele factor op de loop-teller)
    return 1.0 + 0.003 * np.sin(loop_count * 0.7123456789)


def count_on():
    return sum(1 for s in pattern if s["on"])


def mutate():
    # kies precies EEN verandering (structurele minder vaak dan melodische)
    kind = rng.choice(
        ["pitch", "toggle", "volume", "tempo", "length"],
        p=[0.30, 0.30, 0.20, 0.10, 0.10],
    )
    global step_dur

    ons = [i for i, s in enumerate(pattern) if s["on"]]
    if not ons and kind in ("pitch", "volume"):
        kind = "toggle"     # niets om te toonen/volumen -> maak eerst een tik

    if kind == "pitch":
        i = int(rng.choice(ons))
        up = rng.random() < 0.5
        old = pattern[i]["pitch"]
        pattern[i]["pitch"] = int(np.clip(old + (1 if up else -1), 0, len(ALLOWED) - 1))
        if pattern[i]["pitch"] == old:
            up = not up
            pattern[i]["pitch"] = int(np.clip(old + (1 if up else -1), 0, len(ALLOWED) - 1))
        return f"stap {i}: toon {'omhoog' if up else 'omlaag'}"

    if kind == "toggle":
        offs = [i for i, s in enumerate(pattern) if not s["on"]]
        # liever een tik erbij; alleen weghalen als er genoeg overblijft
        if offs and (rng.random() < 0.6 or count_on() <= 2):
            i = int(rng.choice(offs))
            pattern[i] = {"on": True, "pitch": int(rng.integers(0, len(ALLOWED))),
                          "vel": float(rng.uniform(0.5, 0.9))}
            return f"extra tik op stap {i}"
        if count_on() > 2:
            i = int(rng.choice([i for i, s in enumerate(pattern) if s["on"]]))
            pattern[i]["on"] = False
            return f"tik weg op stap {i}"
        return "niets veranderd"

    if kind == "volume":
        i = int(rng.choice([i for i, s in enumerate(pattern) if s["on"]]))
        old = pattern[i]["vel"]
        pattern[i]["vel"] = float(np.clip(old + rng.uniform(-0.35, 0.35), 0.2, 1.0))
        richting = "luider" if pattern[i]["vel"] > old else "zachter"
        return f"stap {i}: {richting}"

    if kind == "tempo":
        old = step_dur
        step_dur = float(np.clip(step_dur * rng.uniform(0.92, 1.08), 0.09, 0.40))
        return "iets sneller" if step_dur < old else "iets langzamer"

    if kind == "length":
        if len(pattern) < 20 and (rng.random() < 0.6 or len(pattern) <= 6):
            pattern.append({"on": False, "pitch": 0, "vel": 0.8})
            return f"loop verlengd naar {len(pattern)} stappen"
        if len(pattern) > 6:
            pattern.pop()
            return f"loop ingekort naar {len(pattern)} stappen"
        return "niets veranderd"


def callback(outdata, frames, time, status):
    global step_index, samples_to_next, now, voices, loop_count
    if status:
        print(status)

    left = np.zeros(frames)
    right = np.zeros(frames)

    # --- sequencer: stap-grenzen binnen dit blok afhandelen ---
    consumed = 0
    while consumed < frames:
        gap = frames - consumed
        if samples_to_next <= gap:
            consumed += samples_to_next
            st = pattern[step_index]
            if st["on"]:
                semis = ALLOWED[st["pitch"]]
                freq = ROOT * 2 ** (semis / 12) * detune()
                pan = 0.2 + 0.6 * (st["pitch"] / (len(ALLOWED) - 1))
                voices.append({
                    "s0": now + consumed, "freq": freq, "amp": st["vel"],
                    "gl": np.cos(pan * np.pi / 2), "gr": np.sin(pan * np.pi / 2),
                })
            step_index += 1
            if step_index >= len(pattern):
                step_index = 0
                loop_count += 1
                tekst = mutate()
                raster = "".join("X" if s["on"] else "." for s in pattern)
                events.append((loop_count, raster, tekst, len(pattern), 1.0 / step_dur))
            samples_to_next = max(1, int(step_dur * SR))
        else:
            samples_to_next -= gap
            consumed = frames

    # --- stemmen renderen (decaying sinus + 2e boventoon = mallet) ---
    n = np.arange(frames)
    alive = []
    for v in voices:
        local = now + n - v["s0"]
        active = local >= 0
        lc = np.clip(local, 0, None)
        env = v["amp"] * np.exp(-lc / (TAU * SR)) * active
        ph = 2 * np.pi * v["freq"] * lc / SR
        tone = env * (np.sin(ph) + 0.25 * np.sin(2 * ph))
        left += tone * v["gl"]
        right += tone * v["gr"]
        if (now - v["s0"]) < TAU * SR * 8:      # nog niet volledig uitgestorven
            alive.append(v)
    voices = alive

    stereo = np.tanh(GAIN * np.column_stack([left, right]))
    outdata[:] = stereo.astype(np.float32)
    now += frames


if __name__ == "__main__":
    print("exp-8  |  evoluerende loop  |  elke omwenteling 1 verandering  |  Ctrl+C")
    print("        X = tik, . = stilte.  nooit twee keer hetzelfde.\n")
    seen = 0
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(120)
                while events:
                    loop, raster, tekst, n_steps, puls = events.pop(0)
                    print(f"  loop {loop:3d}  |{raster:<20}|  {puls:4.1f}/s   <- {tekst}")
        except KeyboardInterrupt:
            print("\nstil.")
