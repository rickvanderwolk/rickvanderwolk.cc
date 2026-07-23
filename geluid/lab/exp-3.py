"""
exp-3 — Buitenaards / in iemands hoofd

Donker, uitzichtloos, bijna stilstaand. Alsof je binnen in een schedel zit:
een lage druk-rommel, een inharmonisch cluster dat metaalachtig en onaards
zweeft (frequenties in irrationele verhoudingen, geen muzikaal akkoord), en
heel af en toe een zacht oorsuizen dat komt opzetten en weer wegzakt.

Van seconde tot seconde verandert er bijna niets. Maar een ultra-trage morph
(~7 min) laat de grondtoon zakken en rekt de inharmonische spreiding op:
over de lange termijn kruipt het wél ergens heen. Geen licht, geen oplossing.

Draaien:  ../.venv/bin/python exp-3.py
Stoppen:  Ctrl+C
Tip:      koptelefoon. Het laag en het 'in je hoofd'-gevoel komen dan pas echt.
"""

import numpy as np
import sounddevice as sd

SR = 44100
GAIN = 0.5          # eindvolume (tanh vangt pieken af)

# --- druk-rommel diep onderin ---
SUB_FREQ = 34.0
sub_phase = 0.0

# --- inharmonisch cluster: irrationele verhoudingen -> onaards, geen akkoord ---
BASE0 = 68.0
RATIOS = np.array([1.0, 1.41421, 2.08008, 2.71828])   # o.a. √2 en e
PARTIAL_AMPS = np.array([0.28, 0.22, 0.18, 0.14])      # hoger = zachter
PARTIAL_PAN = np.array([0.15, 0.45, 0.62, 0.85])       # rond je hoofd verspreid
partial_phase = np.zeros(len(RATIOS))
# elk partiaal een eigen trage zweving (net andere periodes -> nooit synchroon)
WOBBLE_RATE = np.array([1/23.0, 1/31.0, 1/29.0, 1/37.0])
wobble_phase = np.zeros(len(RATIOS))

# --- oorsuizen: heel zacht, komt zelden opzetten ---
TINN_FREQ = 3150.0
tinn_phase = 0.0
TINN_RATE = 1/75.0          # ~75s per swell
tinn_swell_phase = 0.0
tinn_pan_phase = 0.0

# --- druk-bed: trage ruis, laag van nature (knooppunt-interpolatie) ---
noise_prev = 0.0
rng = np.random.default_rng(3)

# --- ultra-trage morph: dít is de lange-termijn verandering ---
MORPH_RATE = 1/420.0        # ~7 min per cyclus
morph_phase = 0.0
SWELL_RATE = 1/25.0         # oppressieve 'ademing' van het geheel
swell_phase = 0.0

# leesbare uitdraai
elapsed = 0.0
cur = {"base": BASE0, "stretch": 1.0, "tinn": 0.0, "swell": 1.0}


def callback(outdata, frames, time, status):
    global sub_phase, partial_phase, wobble_phase, tinn_phase, tinn_swell_phase
    global tinn_pan_phase, noise_prev, morph_phase, swell_phase, elapsed
    if status:
        print(status)

    t = np.arange(frames) / SR
    left = np.zeros(frames)
    right = np.zeros(frames)

    # --- morph-waarden (traag; binnen dit blokje als constant behandeld) ---
    m = np.sin(2 * np.pi * morph_phase)             # -1..1
    base = BASE0 * (1.0 - 0.14 * (0.5 + 0.5 * m))   # zakt tot ~14% omlaag
    stretch = 0.85 + 0.40 * (0.5 + 0.5 * np.sin(2 * np.pi * morph_phase + 1.7))
    swell = 0.8 + 0.2 * np.sin(2 * np.pi * swell_phase)

    # --- sub ---
    ph = sub_phase + 2 * np.pi * SUB_FREQ * t
    sub = 0.5 * np.sin(ph)
    left += sub * 0.5
    right += sub * 0.5
    sub_phase = (sub_phase + 2 * np.pi * SUB_FREQ * frames / SR) % (2 * np.pi)

    # --- inharmonisch cluster ---
    for i in range(len(RATIOS)):
        wob = 0.3 * np.sin(2 * np.pi * wobble_phase[i])   # ±0.3 Hz zweving
        # inharmonische spreiding via 'stretch': 1 + (ratio-1)*stretch
        freq = base * (1.0 + (RATIOS[i] - 1.0) * stretch) + wob
        ph = partial_phase[i] + 2 * np.pi * freq * t
        sig = PARTIAL_AMPS[i] * np.sin(ph)
        pan = PARTIAL_PAN[i]
        left += sig * np.cos(pan * np.pi / 2)
        right += sig * np.sin(pan * np.pi / 2)
        partial_phase[i] = (partial_phase[i] + 2 * np.pi * freq * frames / SR) % (2 * np.pi)
        wobble_phase[i] = (wobble_phase[i] + WOBBLE_RATE[i] * frames / SR) % 1.0

    # --- oorsuizen (zacht, komt/gaat) ---
    tinn_env = max(0.0, np.sin(2 * np.pi * tinn_swell_phase)) ** 3   # meestal 0
    tinn_amp = 0.06 * tinn_env
    ph = tinn_phase + 2 * np.pi * TINN_FREQ * t
    tinn = tinn_amp * np.sin(ph)
    tpan = 0.5 + 0.4 * np.sin(2 * np.pi * tinn_pan_phase)            # drijft van oor naar oor
    left += tinn * np.cos(tpan * np.pi / 2)
    right += tinn * np.sin(tpan * np.pi / 2)
    tinn_phase = (tinn_phase + 2 * np.pi * TINN_FREQ * frames / SR) % (2 * np.pi)
    tinn_swell_phase = (tinn_swell_phase + TINN_RATE * frames / SR) % 1.0
    tinn_pan_phase = (tinn_pan_phase + (1 / 43.0) * frames / SR) % 1.0

    # --- druk-bed: trage ruis via knooppunt-interpolatie (laag van nature) ---
    K = 8
    targets = 0.10 * rng.standard_normal(K)
    nodes = np.concatenate(([noise_prev], targets))
    x = np.linspace(0, K, frames, endpoint=False)
    bed = np.interp(x, np.arange(K + 1), nodes)
    noise_prev = targets[-1]
    left += bed
    right += bed

    # --- geheel: oppressieve swell + zachte begrenzing ---
    stereo = np.tanh(GAIN * swell * np.column_stack([left, right]))
    outdata[:] = stereo.astype(np.float32)

    morph_phase = (morph_phase + MORPH_RATE * frames / SR) % 1.0
    swell_phase = (swell_phase + SWELL_RATE * frames / SR) % 1.0
    elapsed += frames / SR
    cur.update(base=float(base), stretch=float(stretch), tinn=float(tinn_env), swell=float(swell))


def meter(value, lo, hi, width=16):
    frac = max(0.0, min(1.0, (value - lo) / (hi - lo)))
    return "[" + "#" * int(round(frac * width)) + "-" * (width - int(round(frac * width))) + "]"


if __name__ == "__main__":
    print("exp-3  |  buitenaards / in je hoofd  |  ~7 min per morph  |  Ctrl+C")
    print("        korte termijn: bijna stil. lange termijn: het zakt en verschuift.\n")
    last = -999
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(500)
                if elapsed - last >= 10:      # elke ~10s tonen waar de morph staat
                    last = elapsed
                    tinn_txt = "oorsuizen" if cur["tinn"] > 0.02 else "         "
                    print(f"  t={elapsed:6.0f}s  grondtoon {cur['base']:5.1f} Hz  "
                          f"spreiding {meter(cur['stretch'], 0.85, 1.25)}  {tinn_txt}")
        except KeyboardInterrupt:
            print("\nstil.")
