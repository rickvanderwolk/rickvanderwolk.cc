"""
exp-16 — Alleen de stilte uitgerekt

De eerlijke tegenhanger van exp-15. Daar wordt één seconde over een etmaal
uitgesmeerd, maar dat kan alleen door de golfvorm weg te gooien en er iets voor
in de plaats te verzinnen. Hier wordt niets verzonnen.

Elke sample die je hoort staat letterlijk in de opname, in de oorspronkelijke
volgorde, op de oorspronkelijke snelheid, op de oorspronkelijke toonhoogte, op
het oorspronkelijke volume. Geen filter, geen versterking, geen limiter, geen
fase die is aangeraakt. Je kunt de uitvoer sample voor sample naast het bestand
leggen en het is bit voor bit hetzelfde.

Het enige dat verandert is *wanneer*. De opname wordt opgedeeld in wat er echt
gebeurt (de tikken) en wat er niet gebeurt (de stilte ertussen), en alleen die
stilte wordt uitgerekt tot de hele opname een etmaal beslaat. Zeventien
gebeurtenissen in zestien seconden worden zeventien gebeurtenissen in
vierentwintig uur: ongeveer eens per anderhalf uur een tik.

Dat is de hele ingreep, en het is er ook echt één — je hoort de klok niet meer
tikken, je hoort losse tikken. Maar er wordt niets aan het geluid zelf gedaan.
Stilte die langer duurt is nog steeds stilte; nul blijft nul, hoe lang je hem
ook aanhoudt. Dat is het verschil met exp-15, waar de stilte hetzelfde blijft en
de klank verzonnen wordt.

Een klok die zeventien keer per dag tikt. Zet 'm 's ochtends aan en je vergeet
hem, tot er ergens in de middag een tik door de kamer gaat die scherp en
dichtbij is, want hij is niet uitgerekt. En dan is het weer een uur stil.

Het hangt aan de klok: 00:00 is het begin van de opname. Bij het starten zet hij
erbij hoe laat er vandaag getikt wordt.

Draaien:  ../.venv/bin/python exp-16.py
          ../.venv/bin/python exp-16.py 200        <- 200x sneller wachten. De tik zelf
                                                      blijft op echte snelheid; alleen
                                                      het wachten wordt ingekort.
          ../.venv/bin/python exp-16.py iets.wav   <- andere opname
Stoppen:  Ctrl+C
"""

import os
import re
import sys
import time
import wave

import numpy as np
import sounddevice as sd

SR = 44100
BLOK = 1024

BRON = "exp-16-klok.wav"  # naast dit bestand
DUUR = 24 * 3600          # waarover de opname wordt uitgesmeerd
SNELHEID = 1.0            # 1 = echt. Hoger kort alleen het wachten in, niet het geluid.
DREMPEL = 0.005           # vanaf welk deel van de piek iets 'een gebeurtenis' heet
MARGE = 0.010             # seconden echte opname die er voor en na omheen blijft staan

# Geen volumeknop, met opzet. Alles wat hier zou staan maakt de uitvoer anders
# dan de opname, en dat is precies wat dit experiment níet wil. Draai aan je
# versterker.

HIER = os.path.dirname(os.path.abspath(__file__))


# ---------------------------------------------------------------- de bron

def lees_wav(pad):
    """Gewone pcm-wav, mono. De omrekening naar float is exact (deling door een
    macht van twee), dus er gaat geen enkel bit verloren."""
    with wave.open(pad, "rb") as f:
        kanalen, breedte, sr = f.getnchannels(), f.getsampwidth(), f.getframerate()
        ruw = f.readframes(f.getnframes())
    if breedte != 2:
        raise SystemExit(f"  ! {os.path.basename(pad)} is geen 16-bits pcm-wav.\n"
                         f"    ffmpeg -i ... -acodec pcm_s16le -ar 44100 -ac 1 bron.wav")
    d = np.frombuffer(ruw, dtype="<i2").astype(np.float32) / 32768.0
    if kanalen > 1:
        d = d.reshape(-1, kanalen)[:, 0]            # geen mix: dat zou middelen zijn
    if sr != SR:
        raise SystemExit(f"  ! {os.path.basename(pad)} staat op {sr} Hz, niet op {SR}.\n"
                         f"    hersamplen zou de golfvorm veranderen; zet 'm eerst om.")
    return d


def gebeurtenissen(x):
    """Waar gebeurt er echt iets? Geeft (begin, eind) in samples."""
    piek = float(np.abs(x).max())
    aan = (np.abs(x) > DREMPEL * piek).astype(np.float32)
    breed = np.convolve(aan, np.ones(int(MARGE * SR), np.float32), mode="same") > 0.5
    rand = np.diff(np.concatenate([[False], breed, [False]]).astype(np.int8))
    return list(zip(np.where(rand == 1)[0], np.where(rand == -1)[0]))


def lees_argumenten():
    pad, snel = None, SNELHEID
    for a in sys.argv[1:]:
        if re.fullmatch(r"\d+(\.\d+)?", a):
            snel = float(a)
        else:
            pad = a
    return pad or os.path.join(HIER, BRON), snel


PAD, SNELHEID = lees_argumenten()
bron = lees_wav(PAD)
stukken = gebeurtenissen(bron)
if not stukken:
    raise SystemExit("  ! in deze opname gebeurt niets")

# Waar in de dag valt elk stuk? Alleen dit wordt uitgerekt: het moment.
wanneer = [a / len(bron) * DUUR for a, _ in stukken]


# ------------------------------------------------------------- de motor

pos = 0.0            # waar we in de dag staan, in seconden, loopt door over de dagen
dagbegin = 0.0       # begin van de dag waar `volgende` bij hoort
volgende = 0         # welk stuk er hierna komt
stemmen = []         # wat er nu klinkt: [index in bron, eind in bron, uitstel in blok]
geteld = 0           # hoeveel stukken er al geklonken hebben
laatste = None


def callback(outdata, frames, tijdinfo, status):
    global pos, dagbegin, volgende, geteld, laatste
    uit = np.zeros(frames, dtype=np.float32)
    eind = pos + frames / SR * SNELHEID

    while dagbegin + wanneer[volgende] < eind:      # begint er een stuk in dit blok?
        t = dagbegin + wanneer[volgende]
        offset = int(max(0.0, (t - pos)) / SNELHEID * SR)
        a, b = stukken[volgende]
        stemmen.append([int(a), int(b), min(offset, frames)])
        geteld += 1
        laatste = time.time()
        volgende += 1
        if volgende == len(wanneer):                # dag om: de opname begint opnieuw
            volgende, dagbegin = 0, dagbegin + DUUR

    for stem in stemmen:                            # letterlijk kopiëren, niets erbij
        i, tot, wacht = stem
        n = min(frames - wacht, tot - i)
        uit[wacht:wacht + n] += bron[i:i + n]
        stem[0], stem[2] = i + n, 0
    stemmen[:] = [s for s in stemmen if s[0] < s[1]]

    outdata[:, 0] = uit                             # mono naar twee kanalen: alleen
    outdata[:, 1] = uit                             # doorverbinden, niet bewerken
    pos = eind


# ------------------------------------------------------------ de terminal

def klok(seconden):
    s = int(seconden) % 86400
    return f"{s // 3600:02d}:{(s % 3600) // 60:02d}:{s % 60:02d}"


def wacht(seconden):
    s = max(0, int(seconden))
    if s >= 3600:
        return f"{s // 3600}u{(s % 3600) // 60:02d}m"
    return f"{s // 60:02d}m{s % 60:02d}s" if s >= 60 else f"{s:d}s"


if __name__ == "__main__":
    nu = time.localtime()
    pos = nu.tm_hour * 3600 + nu.tm_min * 60 + nu.tm_sec
    volgende = next((i for i, t in enumerate(wanneer) if t > pos), None)
    if volgende is None:
        volgende, dagbegin = 0, DUUR

    duur_stukken = sum(b - a for a, b in stukken) / SR
    print(f"\nexp-16  |  {len(bron) / SR:.1f} seconde opname over {DUUR / 3600:g} uur"
          f"  |  Ctrl+C om te stoppen")
    print(f"         bron: {os.path.basename(PAD)}")
    print(f"         {len(stukken)} echte gebeurtenissen, samen {duur_stukken:.2f} s geluid."
          f" Die klinken onveranderd.")
    print(f"         uitgerekt wordt alleen de stilte: "
          f"{len(bron) / SR / len(stukken):.2f} s ertussen wordt "
          f"{DUUR / len(stukken) / 3600:.2f} uur.")
    print(f"         niets versterkt, niets gefilterd, niets van fase veranderd —"
          f" bit voor bit de opname.")
    print("         vandaag tikt hij om:")
    for r in range(0, len(wanneer), 6):
        print("           " + "   ".join(klok(t) for t in wanneer[r:r + 6]))
    if SNELHEID > 1:
        print(f"         ! {SNELHEID:g}x — alleen het wáchten is ingekort, "
              f"dan eens per {wacht(DUUR / len(wanneer) / SNELHEID)}.")
        print(f"           De tik zelf klinkt nog steeds op echte snelheid.")
    print()

    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=BLOK):
        try:
            while True:
                sd.sleep(200)
                straks = (dagbegin + wanneer[volgende] - pos) / SNELHEID
                staat = "TIK" if stemmen else "   "
                sinds = f"{wacht(time.time() - laatste)} geleden" if laatste else "nog niets"
                print(f"    in de dag {klok(pos)}  {staat}  volgende tik "
                      f"{klok(wanneer[volgende])}, over {wacht(straks):>7}"
                      f"   {geteld} geklonken, laatste {sinds}      ",
                      end="\r", flush=True)
        except KeyboardInterrupt:
            print("\nstil.")
