"""
exp-20 — De log hardop

Als exp-19, maar zonder interpretatie: hij leest voor wat de machine zelf meldt,
in de taal van een log. Geen "nu het drukst", geen mooier gemaakte namen. Elk
woord dat je hoort is een echte waarde: procesnaam, argumenten, pid, ouderproces,
levensduur, poortnaam, volumepad, seconden.

    processor     -> toonhoogte van de drone  (0% = 80 Hz, 100% = 320 Hz)
    geheugen      -> volume van de drone
    netwerk       -> tikjes                   (één tik per 16 KB)
    nieuw proces  -> korte toon, en als het nieuw is of lang niet gezien:
                     "spawn mdworker_shared, pid 48213, parent launchd"
                     tegelijk gestart: "spawn Google Chrome Helper, times 8"
    proces weg    -> van wat hij hardop aankondigde ook het einde, met de echte
                     levensduur: "exit mdworker_shared, pid 48213, 3.2 seconds"
    systeem       -> "power AC" / "power battery, 64 percent"
                     "mount /Volumes/USB" / "unmount /Volumes/USB"
                     "en0 up" / "en0 down"
                     "resume, gap 2400 seconds"   (de lus stond stil: slaap)

Zijn eigen spraak (say, speech/TTS-diensten) laat hij weg. Argumenten worden
ingekort en alles wat op een sleutel of token lijkt valt weg.

Draaien:  ../.venv/bin/python exp-20.py [--stil]
Stoppen:  Ctrl+C
"""

import argparse
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

KIJK = 0.1                  # zo vaak kijken naar nieuwe processen (s)
METEN = 0.5                 # zo vaak cpu/ram/net, drone en exits bijwerken (s)
TOESTAND = 2.0              # zo vaak stroom, mounts en interfaces checken (s)
VERGETEN = 600              # na zoveel seconden niet gezien is een proces weer 'nieuw'
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


def bekijk(pid):
    """(naam, args, ouder, starttijd) van een nieuw proces, of None."""
    try:
        p = psutil.Process(pid)
        naam = p.name()
        start = p.create_time()
        try:
            argv = p.cmdline()
        except (psutil.AccessDenied, psutil.ZombieProcess):
            argv = []
        try:
            ouder = p.parent().name() if p.parent() else None
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            ouder = None
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return None
    if EIGEN.search(naam) or (ouder and EIGEN.search(ouder)):
        return None
    # hoogstens twee argumenten, zonder vlaggen, lange paden of iets geheims
    args = [a for a in argv[1:] if not a.startswith("-") and not GEHEIM.search(a) and len(a) <= 30][:2]
    return naam, " ".join(args), ouder, start


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
    batt = psutil.sensors_battery()
    netten = {n for n, s in psutil.net_if_stats().items() if s.isup and re.match(r"^en\d", n)}
    mounts = {p.mountpoint for p in psutil.disk_partitions() if p.mountpoint.startswith("/Volumes/")}
    return {"batt": batt, "net": netten, "mounts": mounts}


def log(regel):
    print(f"\n  {time.strftime('%H:%M:%S')}  {regel}", end="", flush=True)


def main():
    global tikken
    ap = argparse.ArgumentParser(description="De log van je computer, hardop.")
    ap.add_argument("--stil", action="store_true", help="niet praten, alleen klank en log")
    args = ap.parse_args()

    mond = None if args.stil else Mond(alle_stemmen())
    systeem = []                # wachtrij systeemregels (standaardstem)
    proces = []                 # wachtrij procesregels: (naam, regel)
    gezien = {}                 # procesnaam -> laatst gezien
    gevolgd = {}                # pid -> (naam, starttijd) van wat we hardop aankondigden

    psutil.cpu_percent()
    net0 = psutil.net_io_counters()
    pids = set(psutil.pids())
    for p in psutil.process_iter(["name"]):
        gezien[p.info["name"]] = time.time()        # wat al draait is niet nieuw
    staat = toestand()

    print("exp-20 — Ctrl+C stopt" + (f"  ({len(mond.stemmen)} stemmen)" if mond else ""))
    t_meet = t_staat = t_lus = time.time()
    batch = []                  # (pid, naam, args, ouder, start) sinds de laatste meting
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        while True:
            time.sleep(KIJK)
            now = time.time()
            if now - t_lus > SLAAP:
                systeem.append(f"resume, gap {now - t_lus:.0f} seconds")
            t_lus = now

            huidig = set(psutil.pids())
            for pid in huidig - pids:
                info = bekijk(pid)
                if info:
                    batch.append((pid, *info))
            weg = pids - huidig
            pids = huidig

            # exits van wat we aankondigden, met de echte levensduur
            for pid in weg & gevolgd.keys():
                naam, start = gevolgd.pop(pid)
                proces.append((naam, f"exit {naam}, pid {pid}, {now - start:.1f} seconds"))

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
                    for b in batch[:PROC_PER_TIK]:
                        tonen.append([naam_toon(b[1]), 0.0, TOON_LEN])

                aantal = Counter(b[1] for b in batch)
                gemeld = set()
                for pid, naam, arg, ouder, start in batch:
                    if now - gezien.get(naam, 0) <= VERGETEN or naam in gemeld:
                        continue
                    gemeld.add(naam)
                    if aantal[naam] > 1:
                        proces.append((naam, f"spawn {naam}, times {aantal[naam]}"))
                    else:
                        regel = f"spawn {naam} {arg}".rstrip() + f", pid {pid}"
                        proces.append((naam, regel + (f", parent {ouder}" if ouder else "")))
                        gevolgd[pid] = (naam, start)
                for naam in aantal:
                    gezien[naam] = now
                batch = []

                print(f"\r  cpu {cpu:5.1f}%  ram {ram:5.1f}%  net {bps / 1024:8.1f} KB/s   ",
                      end="", flush=True)

            if now - t_staat >= TOESTAND:
                t_staat = now
                nieuw = toestand()
                b0, b1 = staat["batt"], nieuw["batt"]
                if b0 and b1 and b0.power_plugged != b1.power_plugged:
                    systeem.append("power AC" if b1.power_plugged else f"power battery, {b1.percent:.0f} percent")
                for m in sorted(nieuw["mounts"] - staat["mounts"]):
                    systeem.append(f"mount {m}")
                for m in sorted(staat["mounts"] - nieuw["mounts"]):
                    systeem.append(f"unmount {m}")
                for n in sorted(nieuw["net"] - staat["net"]):
                    systeem.append(f"{n} up")
                for n in sorted(staat["net"] - nieuw["net"]):
                    systeem.append(f"{n} down")
                staat = nieuw

            # systeemregels voorrang; wat niet past wacht (systeem) of vervalt (proces)
            while systeem and (not mond or mond.zeg(systeem[0])):
                log(systeem.pop(0))
            for naam, regel in proces:
                log(regel)
                if mond:
                    mond.zeg(regel, mond.stem_voor(naam))
            proces = []


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n  gestopt")
