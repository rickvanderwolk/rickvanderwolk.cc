"""
exp-13 — Kamer aan een knop

Hetzelfde principe als exp-12 — je hoort je kamer van zoëven — maar nu draai je
er live aan. Van een halve seconde (je struikelt over je eigen stem) tot minuten
(iemand anders praat terug).

Er ligt altijd een band van MAX_VERTRAAG minuten mee te draaien waar continu op
geschreven wordt. De vertraging is niets anders dan hoe ver de leeskop
achterloopt. Het verleden ís er dus al: draai je van 5 naar 200 seconden, dan
hoor je echt wat er drie minuten geleden gebeurde.

Twee manieren om te draaien (wissel met m):

  glijden    De leeskop kruipt naar zijn nieuwe plek, precies als een bandkop
             die over de band schuift. Langer maken laat de toonhoogte zakken,
             korter maken laat 'm stijgen. De kop kan maar zo hard, dus een
             grote sprong hoor je minutenlang doorzakken: de kop mag hoogstens
             half zo snel lopen (een octaaf omlaag), dus van 1 naar 60 seconden
             duurt zo'n drie minuten. Wil je er meteen zijn, druk dan m.
             Sneller mag ook: draai aan RATE_MIN/RATE_MAX en SLEW.
  springen   Direct naar de nieuwe plek, met een crossfade van 25 ms zodat het
             niet klikt. Geen toonhoogte-effect. Een schakelaar.

Toetsen:
      pijl links/rechts   iets korter / langer (x1,05)
      pijl omlaag/omhoog  fors korter / langer (x1,5)
      1 t/m 9             spring naar een vaste stand (zie PRESETS)
      m                   glijden <-> springen
      q of Ctrl+C         stoppen

Draaien:  ../.venv/bin/python exp-13.py
Beginnen op een andere stand:  ../.venv/bin/python exp-13.py 20
Stoppen:  q
BELANGRIJK: koptelefoon op. Op speakers luistert de microfoon zichzelf terug.
            macOS vraagt de eerste keer om toegang tot de microfoon.
"""

import sys
import termios
import threading
import time
import tty

import numpy as np
import sounddevice as sd

SR = 44100
BLOK = 1024
MAX_VERTRAAG = 600.0        # seconden band die meedraait (600s mono = ~106 MB)
START = 5.0                 # seconden waarop je begint
GAIN = 1.0

SLEW = 2.5                  # seconden traagheid van de knop
RATE_MIN, RATE_MAX = 0.5, 2.0   # hoe hard de leeskop mag lopen -> ±1 octaaf
FADE = int(0.025 * SR)      # crossfade bij springen (samples)
PRESETS = [0.2, 0.5, 1.0, 3.0, 5.0, 15.0, 60.0, 180.0, 600.0]

if len(sys.argv) > 1:
    START = float(sys.argv[1])

N = int(MAX_VERTRAAG * SR)
MIN_SAMP = BLOK + 64                    # korter kan de ringbuffer niet aan
MAX_SAMP = N - BLOK - 64

buf = np.zeros(N, dtype=np.float32)
write_pos = 0
verwerkt = 0

delay_samp = float(np.clip(START * SR, MIN_SAMP, MAX_SAMP))
target_samp = delay_samp
oud_samp = delay_samp                   # tweede leeskop tijdens een crossfade
fade_left = 0

mode = "glijden"
rate_nu = 1.0
niveau_in = 0.0
niveau_uit = 0.0
stoppen = False


def tap(start_index, rate, frames):
    """Lees frames samples uit de band vanaf een gebroken positie, met interpolatie."""
    pos = start_index + rate * np.arange(frames)
    i0 = np.floor(pos).astype(np.int64) % N
    frac = pos - np.floor(pos)
    i1 = (i0 + 1) % N
    return buf[i0] * (1.0 - frac) + buf[i1] * frac


def callback(indata, outdata, frames, time_info, status):
    global write_pos, verwerkt, delay_samp, oud_samp, fade_left, rate_nu
    global niveau_in, niveau_uit
    if status:
        print(status)

    d0 = delay_samp
    doel = float(np.clip(target_samp, MIN_SAMP, MAX_SAMP))

    if mode == "springen":
        if fade_left <= 0 and abs(doel - d0) > 1.0:
            oud_samp = d0                       # oude kop blijft even doorlopen
            delay_samp = doel
            fade_left = FADE
        rate = 1.0
        start = write_pos - delay_samp          # meteen op de nieuwe plek lezen
    else:
        k = 1.0 - np.exp(-frames / (SLEW * SR))
        d1 = d0 + (doel - d0) * k
        rate = (frames + d0 - d1) / frames      # <1 = zakken, >1 = stijgen
        rate = float(np.clip(rate, RATE_MIN, RATE_MAX))
        d1 = d0 + frames - rate * frames        # delay en leeskop weer gelijkzetten
        d1 = float(np.clip(d1, MIN_SAMP, MAX_SAMP))
        delay_samp = d1
        start = write_pos - d0                  # loopt naadloos door op het vorige blok
    rate_nu = rate

    uit = tap(start, rate, frames)

    if fade_left > 0:                           # springen: kruislings overvloeien
        oud = tap(write_pos - oud_samp, 1.0, frames)
        gedaan = FADE - fade_left
        w = np.clip((gedaan + np.arange(frames)) / FADE, 0.0, 1.0)
        uit = oud * (1.0 - w) + uit * w
        fade_left = max(0, fade_left - frames)

    idx = (write_pos + np.arange(frames)) % N   # pas nu opnemen wat er nu binnenkomt
    buf[idx] = indata[:, 0]
    write_pos = (write_pos + frames) % N
    verwerkt += frames

    uit = np.tanh(GAIN * uit)
    outdata[:] = np.column_stack([uit, uit]).astype(np.float32)

    niveau_in = float(np.sqrt(np.mean(indata[:, 0] ** 2)))
    niveau_uit = float(np.sqrt(np.mean(uit ** 2)))


def toetsen():
    """Leest losse toetsaanslagen; draait apart van de audio."""
    global target_samp, mode, stoppen
    while not stoppen:
        c = sys.stdin.read(1)
        if c == "\x1b":                         # pijltjes komen als escape-reeks
            c += sys.stdin.read(2)
        factor = {"\x1b[C": 1.05, "\x1b[D": 1 / 1.05,
                  "\x1b[A": 1.5, "\x1b[B": 1 / 1.5}.get(c)
        if factor:
            target_samp = float(np.clip(target_samp * factor, MIN_SAMP, MAX_SAMP))
        elif c in "123456789":
            target_samp = float(np.clip(PRESETS[int(c) - 1] * SR, MIN_SAMP, MAX_SAMP))
        elif c == "m":
            mode = "springen" if mode == "glijden" else "glijden"
        elif c in ("q", "\x03"):
            stoppen = True


def meter(rms, width=14):
    db = 20 * np.log10(max(rms, 1e-6))
    filled = int(round(np.clip((db + 60) / 60, 0, 1) * width))
    return "[" + "#" * filled + "-" * (width - filled) + "]"


def tijd(sec):
    return f"{sec:5.2f}s" if sec < 10 else f"{sec:5.1f}s"


if __name__ == "__main__":
    print(f"exp-13  |  je kamer aan een knop  |  band van {MAX_VERTRAAG / 60:.0f} min")
    print("         pijltjes = korter/langer, 1-9 = vaste standen, "
          "m = glijden/springen, q = stop")
    print("         koptelefoon op, anders zingt het rond.\n")

    interactief = sys.stdin.isatty()
    if not interactief:
        print("  ! geen toetsenbord aangesloten, blijft op de startstand staan")

    stream = sd.Stream(samplerate=SR, blocksize=BLOK, dtype="float32",
                       channels=(1, 2), callback=callback)
    oude_stand = termios.tcgetattr(sys.stdin) if interactief else None
    try:
        if interactief:
            tty.setcbreak(sys.stdin.fileno())   # cbreak, niet raw: Ctrl+C blijft werken
            threading.Thread(target=toetsen, daemon=True).start()
        with stream:
            while not stoppen:
                sd.sleep(80)
                d = delay_samp / SR
                doel = target_samp / SR
                opgenomen = min(verwerkt / SR, MAX_VERTRAAG)
                halve = 12 * np.log2(rate_nu) if rate_nu > 0 else 0.0
                if d > opgenomen + 0.2:
                    staat = f"nog stil, band pas {opgenomen:.0f}s vol"
                elif mode == "glijden" and abs(halve) > 0.05:
                    pijl = "^" if halve > 0 else "v"
                    staat = f"{pijl}{abs(halve):4.1f} halve toon"
                else:
                    staat = time.strftime("%H:%M:%S", time.localtime(time.time() - d))
                print(f"  {mode:9s} {tijd(d)} -> {tijd(doel)}  {staat:<22} "
                      f"in {meter(niveau_in)} uit {meter(niveau_uit)}   ",
                      end="\r", flush=True)
    except KeyboardInterrupt:
        pass
    finally:
        if oude_stand:
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, oude_stand)
        print("\nstil.")
