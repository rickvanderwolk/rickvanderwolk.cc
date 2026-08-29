"""
exp-15 — Eén tik, één etmaal

Eén seconde geluid, uitgesmeerd over vierentwintig uur. 86400 keer trager: één
sample duurt bijna twee seconden, één milliseconde ruim anderhalve minuut.

De bron is één seconde uit een tikkende klok — precies één tik. Een klok tikt
86400 keer per dag; deze doet er een hele dag over. Hij loopt daarmee even snel
als hij niet loopt.

Niet vertraagd afgespeeld: dan zou de toonhoogte zestien octaven zakken en bleef
er niets over dan onhoorbaar dreunen. In plaats daarvan wordt de seconde
spectraal opengetrokken (paulstretch): telkens een venstertje uit de bron,
daarvan de klankkleur bewaard maar de fases weggegooid, en dat met veel overlap
weer aan elkaar geplakt. De toonhoogte blijft staan waar hij stond, alleen de
tijd rekt uit. Wat een tik was — een klap van een tiende seconde — wordt een
veld dat uren duurt: eerst het hout van de kast, dan het metaal van het
mechaniek, en dan weer weg.

Wees eerlijk over wat dit is. Deze seconde is voor negentig procent digitale
stilte, en die verhouding blijft na het uitrekken staan: tweederde van de dag
gebeurt er niets. Je hoort een dag waarin ergens rond het middaguur iets opkomt
dat je pas merkt als je het al een tijdje hoort, en dat tegen de avond weer
verdwijnt. Bij het starten rekent hij uit tussen welke kloktijden dat is en zet
het erbij.

Wil je geluid over de hele dag, geef dan een bron mee die zelf doorloopt — regen,
of `mic`, want een kamer is nooit helemaal stil.

Het hangt aan de klok: om 00:00 begint het fragment, om 24:00 is het op. Wie op
hetzelfde moment luistert zit op dezelfde milliseconde, en je hoort bij
binnenkomst waar de dag staat. De leeskop loopt rond, dus middernacht is een
naad zonder sprong: morgen is precies dezelfde dag.

Draaien:  ../.venv/bin/python exp-15.py

Omdat je op een willekeurig moment meestal in de stilte belandt, kun je de dag
ook versneld afluisteren. Dat is niet het werk, dat is de blauwdruk ervan:

          ../.venv/bin/python exp-15.py 500          <- 500x sneller: dag in 3 min,
                                                        begint vanzelf net voor de tik
          ../.venv/bin/python exp-15.py 500 00:00    <- ...maar dan vanaf middernacht
          ../.venv/bin/python exp-15.py 14:20        <- op echte snelheid, maar meteen
                                                        op het hoogtepunt beginnen.
                                                        14.20, 14u20 en 14u mag ook;
                                                        een kaal getal is de snelheid
          ../.venv/bin/python exp-15.py mic          <- neem zelf een seconde op en
                                                        rek die uit (mic 500 kan ook)
          ../.venv/bin/python exp-15.py iets.mp3     <- ander fragment (mp3 via ffmpeg)
Stoppen:  Ctrl+C
"""

import os
import re
import shutil
import subprocess
import sys
import time
import wave

import numpy as np
import sounddevice as sd

SR = 44100
BLOK = 1024

BRON = "exp-15-tik.wav"   # naast dit bestand. Losse mp3/wav meegeven kan ook, of "mic".
FRAGMENT = 1.0            # seconden bron. Dit is het hele materiaal.
START = 0.0               # vanaf welke seconde in het bestand het fragment begint
DUUR = 24 * 3600          # waarover het wordt uitgesmeerd. Probeer ook 3600 (een uur).
SNELHEID = 1.0            # 1 = echt. Hoger = doorspoelen om te horen wat er gebeurt.
VANAF = None              # "14:20" om ergens in de dag te beginnen; anders de echte klok
VENSTER = 8192            # analysevenster in samples (~0,19 s bron). Groter = waziger
                          # en trager, kleiner = korreliger en dichter bij het origineel.
GAIN = 0.9

HOP = VENSTER // 2
rng = np.random.default_rng()
HIER = os.path.dirname(os.path.abspath(__file__))


# ------------------------------------------------------- wat wil je horen

def lees_argumenten():
    """Alles is optioneel en de volgorde maakt niet uit: een pad of 'mic',
    een getal (snelheid) en een tijdstip (uu:mm)."""
    pad, snel, vanaf = None, SNELHEID, VANAF
    for a in sys.argv[1:]:
        # Een tijdstip mag als 14:20, 14.20, 14u20 of 14u. Let op de volgorde:
        # dit moet vóór de snelheid, anders leest hij "11.00" als elf keer sneller.
        t = re.fullmatch(r"(\d{1,2})[:.uh](\d{2})(?:[:.](\d{2}))?u?", a)
        if t:
            vanaf = f"{int(t[1]):02d}:{t[2]}" + (f":{t[3]}" if t[3] else "")
        elif re.fullmatch(r"(\d{1,2})[uh]", a):
            vanaf = f"{int(a[:-1]):02d}:00"
        elif re.fullmatch(r"\d+(\.\d+)?", a):
            snel = float(a)
        else:
            pad = a
    return pad or os.path.join(HIER, BRON), snel, vanaf


PAD, SNELHEID, VANAF = lees_argumenten()


# ---------------------------------------------------------------- de bron

def lees_wav(pad):
    """Gewone pcm-wav, gemixt naar mono. Geeft (samples, samplerate)."""
    with wave.open(pad, "rb") as f:
        kanalen, breedte, sr = f.getnchannels(), f.getsampwidth(), f.getframerate()
        ruw = f.readframes(f.getnframes())
    if breedte == 1:
        d = (np.frombuffer(ruw, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    elif breedte == 2:
        d = np.frombuffer(ruw, dtype="<i2").astype(np.float32) / 32768.0
    elif breedte == 3:
        b = np.frombuffer(ruw, dtype=np.uint8).reshape(-1, 3).astype(np.uint32)
        v = (b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)).astype(np.int64)
        d = np.where(v & 0x800000, v - 0x1000000, v).astype(np.float32) / 8388608.0
    else:
        d = np.frombuffer(ruw, dtype="<i4").astype(np.float32) / 2147483648.0
    if kanalen > 1:
        d = d.reshape(-1, kanalen).mean(axis=1)
    return d.astype(np.float32), sr


def lees_bestand(pad):
    """Wav leest hij zelf; al het andere laat hij even door ffmpeg omzetten."""
    if not os.path.exists(pad):
        raise SystemExit(f"  ! {pad} bestaat niet")
    if pad.lower().endswith(".wav"):
        try:
            return lees_wav(pad)
        except wave.Error:
            pass                                   # geen gewone pcm-wav: alsnog omzetten
    if not shutil.which("ffmpeg"):
        raise SystemExit(f"  ! {os.path.basename(pad)} is geen gewone pcm-wav en ik vind\n"
                         f"    geen ffmpeg om het om te zetten. Zet 'm zelf even om:\n"
                         f"    afconvert -f WAVE -d LEI16@44100 -c 1 {pad} bron.wav")
    ruw = subprocess.run(["ffmpeg", "-v", "error", "-i", pad,
                          "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True).stdout
    if not ruw:
        raise SystemExit(f"  ! ffmpeg kreeg geen geluid uit {os.path.basename(pad)}")
    return np.frombuffer(ruw, dtype="<f4").copy(), SR


def neem_op(seconden):
    """Geen bestand maar 'mic': dan is deze kamer de bron. Eén seconde van nu,
    de hele dag lang. Een kamer is nooit helemaal stil, dus dit loopt door."""
    print(f"  · ik neem {seconden:g} seconde op van de microfoon")
    for n in (3, 2, 1):
        print(f"      over {n}…", end="\r", flush=True)
        time.sleep(1)
    print("      nu!        ", end="\r", flush=True)
    d = sd.rec(int(seconden * SR), samplerate=SR, channels=1, dtype="float32")
    sd.wait()
    print("      opgenomen.  ")
    return d[:, 0].copy()


def bron_klaarzetten():
    if PAD == "mic":
        return neem_op(FRAGMENT), "de microfoon"
    d, sr = lees_bestand(PAD)
    d = d[int(START * sr): int(START * sr) + int(FRAGMENT * sr)]
    if len(d) < 64:
        raise SystemExit(f"  ! op {START:g}s zit niets meer in dat bestand")
    if sr != SR:                                   # naar onze samplerate trekken
        n = int(round(len(d) * SR / sr))
        d = np.interp(np.linspace(0, len(d) - 1, n), np.arange(len(d)), d)
    return d.astype(np.float32), os.path.basename(PAD)


bron, bron_naam = bron_klaarzetten()

piek = float(np.max(np.abs(bron)))
if piek < 1e-6:
    raise SystemExit("  ! dat fragment is stil; er valt niets uit te rekken")
bron = (bron / piek * 0.9).astype(np.float32)

if len(bron) <= VENSTER * 2:                       # kort fragment: kleiner venster
    VENSTER = max(256, 2 ** int(np.log2(len(bron) / 2)))
    HOP = VENSTER // 2
    print(f"  · fragment is kort, venster teruggezet naar {VENSTER} samples")

# Analyse- en synthesevenster. Twee keer toegepast is dit een hann, en een hann
# telt bij halve overlap exact op tot 1 — geen golving in het volume.
w = np.sqrt(0.5 - 0.5 * np.cos(2 * np.pi * np.arange(VENSTER) / VENSTER)).astype(np.float32)

L = len(bron)
rond = np.concatenate([bron, bron[:1]])            # de leeskop loopt rond: geen naad
rond_x = np.arange(L + 1, dtype=np.float32)


# ------------------------------------------------------------- de motor

acc = np.zeros((VENSTER, 2), dtype=np.float32)     # overlap-add, index 0 = eerstvolgend
staart = np.zeros((0, 2), dtype=np.float32)        # afgemaakt, klaar voor de kaart
geproduceerd = 0
start_frac = 0.0
niveau = 0.0


def waar():
    """Hoe ver in het fragment (0..1) staat de leeskop nu."""
    return (start_frac + geproduceerd / (SR * DUUR) * SNELHEID) % 1.0


def korrel(frac, stap=1):
    """Het stukje bron waar de leeskop op staat, met de vensterrand eraan."""
    idx = np.mod(frac * L + np.arange(0, VENSTER, stap, dtype=np.float32), L)
    return np.interp(idx, rond_x, rond).astype(np.float32) * w[::stap]


def volgend_blok():
    """Eén venster: klankkleur behouden, fases weg, en aanplakken."""
    global acc
    mag = np.abs(np.fft.rfft(korrel(waar())))
    mag[0] = 0.0                                   # geen gelijkspanning in een etmaal
    frame = np.empty((VENSTER, 2), dtype=np.float32)
    for kanaal in range(2):
        fase = rng.uniform(0.0, 2.0 * np.pi, len(mag))
        fase[0] = fase[-1] = 0.0
        y = np.fft.irfft(mag * np.exp(1j * fase), n=VENSTER)
        frame[:, kanaal] = y * w                   # per oor eigen fases: breed, niet te plaatsen
    acc += frame
    uit = acc[:HOP].copy()                         # deze samples hebben hun twee vensters gehad
    acc = np.roll(acc, -HOP, axis=0)
    acc[-HOP:] = 0.0
    return uit


def callback(outdata, frames, tijdinfo, status):
    global staart, geproduceerd, niveau
    while len(staart) < frames:
        staart = np.concatenate([staart, volgend_blok()])
    blok, staart = staart[:frames], staart[frames:]
    geproduceerd += frames
    niveau = float(np.sqrt(np.mean(blok ** 2)))
    outdata[:] = np.tanh(GAIN * 2.0 * blok).astype(np.float32)


# ------------------------------------------------------------ de terminal

def balk(value, width=16):
    filled = int(round(float(np.clip(value, 0, 1)) * width))
    return "[" + "#" * filled + "-" * (width - filled) + "]"


def klok(seconden):
    seconden = max(0, int(seconden))
    return f"{seconden // 3600:02d}:{(seconden % 3600) // 60:02d}"


def duur(seconden):
    """Een tijdsduur: mm:ss als het kort is, uu:mm als het lang is."""
    s = max(0, int(seconden))
    return f"{s // 3600:02d}:{(s % 3600) // 60:02d} uur" if s >= 3600 \
        else f"{s // 60:02d}:{s % 60:02d} min"


def wanneer_iets_te_horen(punten=1440, drempel=0.06):
    """Loopt de dag alvast een keer langs en kijkt wanneer er klank is."""
    lvl = np.array([np.sqrt(np.mean(korrel(i / punten, stap=8) ** 2))
                    for i in range(punten)])
    if lvl.max() < 1e-9:
        return [], 1.0
    aan = lvl > drempel * lvl.max()
    randen = np.diff(np.concatenate([[False], aan, [False]]).astype(np.int8))
    perioden = [(a / punten, b / punten) for a, b in
                zip(np.where(randen == 1)[0], np.where(randen == -1)[0])]
    return perioden, float(np.mean(~aan))


if __name__ == "__main__":
    perioden, stil = wanneer_iets_te_horen()

    if VANAF:                                      # met de hand een tijdstip gekozen
        u = [int(x) for x in VANAF.split(":")]
        start_frac = ((u[0] * 3600 + u[1] * 60 + (u[2] if len(u) > 2 else 0)) % DUUR) / DUUR
        aanleiding = f"vanaf {VANAF}"
    elif SNELHEID > 1 and perioden:                # doorspoelen: begin net voor de klank
        start_frac = max(0.0, perioden[0][0] - 600 / DUUR)
        aanleiding = f"begint om {klok(start_frac * DUUR)}, net voor er iets te horen is"
    elif SNELHEID > 1:
        start_frac, aanleiding = 0.0, "begint bij het begin van het fragment"
    else:
        nu = time.localtime()
        start_frac = ((nu.tm_hour * 3600 + nu.tm_min * 60 + nu.tm_sec) % DUUR) / DUUR
        aanleiding = "aan de klok: 00:00 is het begin van het fragment"

    factor = DUUR / (L / SR)
    print(f"\nexp-15  |  {L / SR:g} seconde uitgesmeerd over {DUUR / 3600:g} uur"
          f"  |  Ctrl+C om te stoppen")
    print(f"         bron: {bron_naam}")
    print(f"         {factor:,.0f}x trager — één sample duurt {factor / SR:.2f}s, "
          f"één milliseconde {factor / 60000:.1f} min")
    if perioden:
        reeks = ", ".join(f"{klok(a * DUUR)}–{klok(b * DUUR)}" for a, b in perioden[:4])
        print(f"         te horen tussen {reeks}   ({stil * 100:.0f}% van de dag is stil)")
    print(f"         {aanleiding}, nu op {start_frac * 100:.1f}%")
    if SNELHEID > 1:
        print(f"         ! DOORSPOELEN, {SNELHEID:g}x — de hele dag in "
              f"{duur(DUUR / SNELHEID)}. Dit is de blauwdruk, niet het werk:")
        print(f"           op echte snelheid duurt elke seconde die je nu hoort "
              f"{SNELHEID / 60:.1f} minuten.")
    else:
        print("         van minuut tot minuut hoor je niets veranderen. Dat is de bedoeling.")
    print()

    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=BLOK):
        try:
            while True:
                sd.sleep(500)
                frac = waar()
                print(f"    in de dag {klok(frac * DUUR)}  fragment op "
                      f"{frac * L / SR * 1000:8.3f} ms  {balk(frac)} {frac * 100:5.1f}%"
                      f"   nog {duur((1.0 - frac) * DUUR / SNELHEID)}"
                      f"   {balk(niveau * 6, 8)}  ",
                      end="\r", flush=True)
        except KeyboardInterrupt:
            print("\nstil.")
