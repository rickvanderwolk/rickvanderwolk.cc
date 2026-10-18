"""
exp-19 — Wat gebeurt er zoal

Geen meters meer voorlezen, maar vertellen wat er op de machine gebeurt.
Alles is echt (psutil), niets verzonnen:

    processor     -> toonhoogte van de drone  (0% = 80 Hz, 100% = 320 Hz)
    geheugen      -> volume van de drone
    netwerk       -> tikjes                   (één tik per 16 KB)
    nieuw proces  -> altijd een korte toon (hoogte uit de naam). Hardop alleen als
                     het nieuw is, of lang niet gezien: dan de opdracht, ingekort
                     ("git status", "mdworker shared"). Wat tegelijk start wordt
                     één zin: "Google Chrome Helper, 8 keer".
    gebeurtenissen (Nederlandse stem):
                  -> wie nu het drukst is ("nu het drukst: kernel task")
                  -> schijf erin of eruit, stekker erin of eruit
                  -> netwerkverbinding aan of weg
                  -> wakker na slaap ("wakker, na 40 minuten")

Wat al bekend is wordt dus stil (alleen de toon), en het zeldzame springt eruit.
Zijn eigen spraak (say, Siri/TTS-diensten) laat hij weg, anders praat hij over zichzelf.

Let op: argumenten worden ingekort en alles wat op een sleutel of token lijkt
valt weg, maar het blijft hardop voorlezen wat er draait.

Draaien:  ../.venv/bin/python exp-19.py [--stil]
Stoppen:  Ctrl+C
"""

import argparse
import os
import re
import subprocess
import threading
import time
import zlib
from collections import Counter

import numpy as np
import psutil
import sounddevice as sd

SR = 44100
GLIDE = 0.6
F_LAAG, F_HOOG = 80.0, 320.0
VOL_MIN, VOL_MAX = 0.03, 0.25
TIK_BYTES = 16 * 1024
TIK_MAX = 200
PROC_PER_TIK = 6            # hoogstens zoveel procestonen per meting
PENTA = [0, 2, 4, 7, 9]
SAY_MAX = 4                 # zoveel stemmen mogen tegelijk praten

KIJK = 0.1                  # zo vaak kijken naar nieuwe processen (s); korter = minder missen
METEN = 0.5                 # zo vaak cpu/ram/net en drone bijwerken (s)
TOESTAND = 2.0              # zo vaak schijven, stroom, netwerk, drukste proces checken (s)
VERGETEN = 600              # na zoveel seconden niet gezien is een proces weer 'nieuw'
DRUKST_MIN = 25             # % cpu voordat een proces 'het drukst' mag heten
SLAAP = 5                   # zo'n gat in de lus betekent: de machine sliep

EIGEN = re.compile(r"(^say$|speech|tts|siri)", re.I)       # eigen spraak, niet omroepen
GEHEIM = re.compile(r"(key|token|pass|secret|auth|=|[A-Za-z0-9_\-]{24,})", re.I)

# --- gedeeld tussen meetlus en audio-callback ---
doel = {"freq": F_LAAG, "vol": VOL_MIN}
nu = {"freq": F_LAAG, "vol": VOL_MIN}
tikken = 0.0
tonen = []                  # [freq, fase, samples_over]
lock = threading.Lock()
fase = 0.0
TOON_LEN = int(0.35 * SR)


def callback(outdata, frames, time_info, status):
    global fase, tikken
    a = 1 - np.exp(-frames / (GLIDE * SR))
    f0, v0 = nu["freq"], nu["vol"]
    nu["freq"] += (doel["freq"] - f0) * a
    nu["vol"] += (doel["vol"] - v0) * a

    f = np.linspace(f0, nu["freq"], frames, endpoint=False)
    ph = fase + np.cumsum(2 * np.pi * f / SR)
    fase = float(ph[-1] % (2 * np.pi))
    v = np.linspace(v0, nu["vol"], frames, endpoint=False)
    uit = v * (np.sin(ph) + 0.3 * np.sin(1.5 * ph))

    with lock:
        n = int(min(tikken, TIK_MAX * frames / SR))
        tikken -= n
        for i in range(n):
            p = int((i + 0.5) * frames / n)
            k = min(60, frames - p)
            uit[p:p + k] += 0.15 * np.random.uniform(-1, 1, k) * np.exp(-np.arange(k) / 8)

        for t in tonen:
            freq, ph0, over = t
            k = min(frames, over)
            idx = np.arange(k)
            gedaan = TOON_LEN - over
            env = np.exp(-(gedaan + idx) / (0.08 * SR)) * np.minimum(1, (gedaan + idx) / 200)
            uit[:k] += 0.2 * env * np.sin(ph0 + 2 * np.pi * freq * idx / SR)
            t[1] = ph0 + 2 * np.pi * freq * k / SR
            t[2] = over - k
        tonen[:] = [t for t in tonen if t[2] > 0]

    uit = np.tanh(uit).astype(np.float32)
    outdata[:] = np.column_stack([uit, uit])


def naam_toon(naam):
    h = zlib.crc32(naam.encode())
    stap = PENTA[h % 5] + 12 * ((h // 5) % 2)
    return 440.0 * 2 ** (stap / 12)


def uitspreekbaar(woord):
    # com.apple.SiriTTSService -> "Siri TTS Service", mdworker_shared -> "mdworker shared"
    woord = re.sub(r"^com\.apple\.", "", woord)
    woord = re.sub(r"([a-z])([A-Z])", r"\1 \2", woord)
    return re.sub(r"[._\-]+", " ", woord).strip()


def opdracht(proc):
    """Korte, uitspreekbare versie van wat er gestart is, of None als we niks mogen zien."""
    try:
        naam = proc.name()
        try:
            argv = proc.cmdline()
        except (psutil.AccessDenied, psutil.ZombieProcess):
            argv = []
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return None, None
    if EIGEN.search(naam):
        return None, None
    # procesnaam plus hoogstens twee korte argumenten, zonder vlaggen en paden
    woorden = [uitspreekbaar(naam)]
    for arg in argv[1:]:
        if len(woorden) >= 3:
            break
        if arg.startswith("-") or GEHEIM.search(arg):
            continue
        arg = os.path.basename(arg.rstrip("/"))
        if arg and len(arg) <= 20:
            woorden.append(uitspreekbaar(arg))
    return naam, " ".join(woorden)


def alle_stemmen():
    try:
        uit = subprocess.run(["say", "-v", "?"], capture_output=True, text=True).stdout
    except FileNotFoundError:
        return []
    return [r.split("#")[0].rsplit(None, 1)[0].strip() for r in uit.splitlines() if "#" in r]


class Mond:
    """Laat meerdere `say`-processen tegelijk praten, tot SAY_MAX."""

    def __init__(self, stemmen):
        self.stemmen = stemmen
        self.nl = next((s for s in stemmen if s in ("Xander", "Ellen", "Claire")), None)
        self.bezig = []

    def vrij(self):
        self.bezig = [p for p in self.bezig if p.poll() is None]
        return len(self.bezig) < SAY_MAX

    def zeg(self, tekst, stem=None):
        if not self.vrij():
            return False
        cmd = ["say", "-r", "210"] + (["-v", stem] if stem else []) + [tekst]
        self.bezig.append(subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
        return True

    def stem_voor(self, naam):
        if not self.stemmen:
            return None
        return self.stemmen[zlib.crc32(naam.encode()) % len(self.stemmen)]


def toestand():
    """Dingen die niet vaak veranderen, maar als ze veranderen is het nieuws."""
    batt = psutil.sensors_battery()
    netten = {n for n, s in psutil.net_if_stats().items() if s.isup and re.match(r"^en\d", n)}
    schijven = {p.mountpoint for p in psutil.disk_partitions() if p.mountpoint.startswith("/Volumes/")}
    return {"stekker": batt.power_plugged if batt else None, "net": netten, "schijven": schijven}


def drukste(procs):
    beste = None
    for p in psutil.process_iter(["name"]):
        try:
            cpu = procs.setdefault(p.pid, p).cpu_percent()     # zelfde object, anders altijd 0
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
        naam = p.info["name"] or ""
        if not EIGEN.search(naam) and (beste is None or cpu > beste[1]):
            beste = (naam, cpu)
    return beste


def main():
    global tikken
    ap = argparse.ArgumentParser(description="Wat gebeurt er zoal op je computer.")
    ap.add_argument("--stil", action="store_true", help="niet praten, alleen klank")
    args = ap.parse_args()

    mond = None if args.stil else Mond(alle_stemmen())
    meldingen = []              # wachtrij voor gebeurtenissen in de Nederlandse stem
    gezien = {}                 # procesnaam -> laatst gezien
    procs = {}                  # pid -> Process, voor cpu_percent per proces
    vorige_drukst = None

    psutil.cpu_percent()
    net0 = psutil.net_io_counters()
    pids = set(psutil.pids())
    for p in psutil.process_iter(["name"]):
        gezien[p.info["name"]] = time.time()        # wat al draait is niet nieuw
    staat = toestand()

    print("exp-19 — Ctrl+C stopt" + (f"  ({len(mond.stemmen)} stemmen)" if mond else ""))
    t_meet = t_staat = t_lus = time.time()
    batch = []                  # nieuwe processen sinds de laatste meting
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        while True:
            time.sleep(KIJK)
            now = time.time()
            if now - t_lus > SLAAP:
                meldingen.append(f"wakker, na {(now - t_lus) / 60:.0f} minuten")
            t_lus = now

            # nieuwe processen: vaak kijken, want de meeste zijn zo weer weg
            huidig = set(psutil.pids())
            for pid in huidig - pids:
                try:
                    naam, zin = opdracht(psutil.Process(pid))
                except psutil.NoSuchProcess:
                    continue
                if naam:
                    batch.append((naam, zin))
            pids = huidig

            if now - t_meet >= METEN:
                cpu = psutil.cpu_percent()
                ram = psutil.virtual_memory().percent
                net = psutil.net_io_counters()
                bps = (net.bytes_sent + net.bytes_recv - net0.bytes_sent - net0.bytes_recv) / (now - t_meet)
                net0, t_meet = net, now
                doel["freq"] = F_LAAG * (F_HOOG / F_LAAG) ** (cpu / 100)
                doel["vol"] = VOL_MIN + (VOL_MAX - VOL_MIN) * ram / 100

                with lock:
                    tikken = min(tikken + bps * METEN / TIK_BYTES, TIK_MAX)
                    for naam, _ in batch[:PROC_PER_TIK]:
                        tonen.append([naam_toon(naam), 0.0, TOON_LEN])

                # groeperen: wat tegelijk startte is één zin; alleen nieuw of lang niet gezien
                aantal = Counter(n for n, _ in batch)
                zinnen = {}
                for naam, zin in batch:
                    if now - gezien.get(naam, 0) > VERGETEN and naam not in zinnen:
                        zinnen[naam] = zin if aantal[naam] == 1 else f"{uitspreekbaar(naam)}, {aantal[naam]} keer"
                for naam in aantal:
                    gezien[naam] = now
                batch = []

                print(f"\r  cpu {cpu:5.1f}%  ram {ram:5.1f}%  net {bps / 1024:8.1f} KB/s  "
                      f"{'; '.join(zinnen.values())[:50]:50}", end="", flush=True)

                if mond:
                    for naam, zin in zinnen.items():
                        if not mond.zeg(zin, mond.stem_voor(naam)):
                            break

            if now - t_staat >= TOESTAND:
                t_staat = now
                nieuw = toestand()
                if nieuw["stekker"] is not None and nieuw["stekker"] != staat["stekker"]:
                    meldingen.append("stekker erin" if nieuw["stekker"] else "stekker eruit, op de accu")
                for s in nieuw["schijven"] - staat["schijven"]:
                    meldingen.append(f"schijf erin: {uitspreekbaar(os.path.basename(s))}")
                for s in staat["schijven"] - nieuw["schijven"]:
                    meldingen.append(f"schijf eruit: {uitspreekbaar(os.path.basename(s))}")
                if staat["net"] and not nieuw["net"]:
                    meldingen.append("netwerk weg")
                elif nieuw["net"] and not staat["net"]:
                    meldingen.append("netwerk terug")
                staat = nieuw

                d = drukste(procs)
                procs = {pid: p for pid, p in procs.items() if pid in pids}
                if d and d[1] >= DRUKST_MIN and d[0] != vorige_drukst:
                    meldingen.append(f"nu het drukst: {uitspreekbaar(d[0])}")
                    vorige_drukst = d[0]

            if meldingen:
                print(f"\n  > {meldingen[0]}")
                if not mond or mond.zeg(meldingen[0], mond.nl):
                    meldingen.pop(0)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n  gestopt")
