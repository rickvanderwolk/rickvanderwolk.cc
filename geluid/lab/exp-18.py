"""
exp-18 — Je computer praat terug, door elkaar heen

Als exp-17, maar luider en drukker:

    processor     -> toonhoogte van de drone  (0% = 80 Hz, 100% = 320 Hz)
    geheugen      -> volume van de drone      (voller = harder)
    netwerk       -> tikjes                   (één tik per 16 KB in of uit)
    nieuw proces  -> korte toon én de naam hardop, in een eigen stem
                     (stem en toonhoogte uit een hash van de naam: 'git' klinkt
                      en praat altijd hetzelfde)
    veranderingen -> hardop, al bij kleine sprongen

Praten staat standaard aan; stemmen mogen over elkaar heen (max SAY_MAX tegelijk).
Elke stem die macOS heeft doet mee, dus ook Engelse stemmen die Nederlands
proberen. Dat is de chaos.

Draaien:  ../.venv/bin/python exp-18.py [--stil]
Stoppen:  Ctrl+C
"""

import argparse
import subprocess
import threading
import time
import zlib

import numpy as np
import psutil
import sounddevice as sd

SR = 44100
GLIDE = 0.6                 # sneller glijden dan v1: onrustiger
F_LAAG, F_HOOG = 80.0, 320.0
VOL_MIN, VOL_MAX = 0.03, 0.25
TIK_BYTES = 16 * 1024       # zoveel bytes netwerkverkeer is één tik
TIK_MAX = 200               # hoogstens zoveel tikjes per seconde
PROC_PER_TIK = 10           # hoogstens zoveel procestonen per meting (0,5 s)
PENTA = [0, 2, 4, 7, 9]     # procestonen in een pentatonische ladder, 2 octaven
SAY_MAX = 4                 # zoveel stemmen mogen tegelijk praten
MELD_PAUZE = 3.0            # minimaal tussen twee meldingen over cpu/ram/net

# --- gedeeld tussen meetlus en audio-callback ---
doel = {"freq": F_LAAG, "vol": VOL_MIN}
nu = {"freq": F_LAAG, "vol": VOL_MIN}
tikken = 0.0                # openstaande tikjes (fractie telt door)
tonen = []                  # [freq, fase, samples_over] per procestoon
lock = threading.Lock()
fase = 0.0
TOON_LEN = int(0.35 * SR)


def callback(outdata, frames, time_info, status):
    global fase, tikken
    a = 1 - np.exp(-frames / (GLIDE * SR))
    f0, v0 = nu["freq"], nu["vol"]
    nu["freq"] += (doel["freq"] - f0) * a
    nu["vol"] += (doel["vol"] - v0) * a

    # drone: grondtoon + zachte kwint, fase loopt door tussen blokken (click-vrij)
    f = np.linspace(f0, nu["freq"], frames, endpoint=False)
    ph = fase + np.cumsum(2 * np.pi * f / SR)
    fase = float(ph[-1] % (2 * np.pi))
    v = np.linspace(v0, nu["vol"], frames, endpoint=False)
    uit = v * (np.sin(ph) + 0.3 * np.sin(1.5 * ph))

    with lock:
        # tikjes: gelijk verdeeld over het blok
        n = int(min(tikken, TIK_MAX * frames / SR))
        tikken -= n
        for i in range(n):
            p = int((i + 0.5) * frames / n)
            k = min(60, frames - p)
            uit[p:p + k] += 0.15 * np.random.uniform(-1, 1, k) * np.exp(-np.arange(k) / 8)

        # procestonen: korte sinus met exponentieel uitsterven
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


def alle_stemmen():
    try:
        uit = subprocess.run(["say", "-v", "?"], capture_output=True, text=True).stdout
    except FileNotFoundError:
        return []
    # regels als "Xander              nl_NL    # Hallo..."; naam kan spaties bevatten
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
        cmd = ["say", "-r", "220"] + (["-v", stem] if stem else []) + [tekst]
        self.bezig.append(subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
        return True

    def stem_voor(self, naam):
        if not self.stemmen:
            return None
        return self.stemmen[zlib.crc32(naam.encode()) % len(self.stemmen)]


def main():
    global tikken
    ap = argparse.ArgumentParser(description="Je computer praat terug.")
    ap.add_argument("--stil", action="store_true", help="niet praten, alleen klank")
    args = ap.parse_args()

    mond = None if args.stil else Mond(alle_stemmen())
    laatst_gemeld = 0.0
    geschiedenis = []           # (tijd, cpu, ram) voor 'verandering'

    psutil.cpu_percent()
    net0 = psutil.net_io_counters()
    t0 = time.time()
    pids = set(psutil.pids())

    stemmen = f"  ({len(mond.stemmen)} stemmen)" if mond else ""
    print("exp-18 — Ctrl+C stopt" + stemmen)
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        while True:
            time.sleep(0.5)
            now = time.time()
            cpu = psutil.cpu_percent()
            ram = psutil.virtual_memory().percent
            net = psutil.net_io_counters()
            bps = (net.bytes_sent + net.bytes_recv - net0.bytes_sent - net0.bytes_recv) / (now - t0)
            net0, t0 = net, now

            doel["freq"] = F_LAAG * (F_HOOG / F_LAAG) ** (cpu / 100)
            doel["vol"] = VOL_MIN + (VOL_MAX - VOL_MIN) * ram / 100

            nieuw = []
            huidig = set(psutil.pids())
            for pid in huidig - pids:
                try:
                    nieuw.append(psutil.Process(pid).name())
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            pids = huidig

            with lock:
                tikken = min(tikken + bps * 0.5 / TIK_BYTES, TIK_MAX)
                for naam in nieuw[:PROC_PER_TIK]:
                    tonen.append([naam_toon(naam), 0.0, TOON_LEN])

            print(f"\r  cpu {cpu:5.1f}%  ram {ram:5.1f}%  net {bps / 1024:8.1f} KB/s  "
                  f"{doel['freq']:5.1f} Hz  {', '.join(nieuw[:3])[:40]:40}", end="", flush=True)

            if not mond:
                continue

            # elke nieuwe procesnaam hardop, in zijn eigen stem, zolang er monden vrij zijn
            for naam in dict.fromkeys(nieuw):
                if not mond.zeg(naam, mond.stem_voor(naam)):
                    break

            # veranderingen: vergeleken met ~5 s geleden, lage drempels
            geschiedenis.append((now, cpu, ram))
            geschiedenis = [g for g in geschiedenis if now - g[0] <= 5]
            if now - laatst_gemeld >= MELD_PAUZE:
                _, cpu_oud, ram_oud = geschiedenis[0]
                melding = None
                if abs(cpu - cpu_oud) >= 15:
                    melding = f"processor {'omhoog' if cpu > cpu_oud else 'omlaag'}, {cpu:.0f} procent"
                elif abs(ram - ram_oud) >= 1:
                    melding = f"geheugen {ram:.0f} procent"
                elif bps >= 1024 * 1024:
                    melding = f"netwerk, {bps / 1024 / 1024:.1f} megabyte per seconde"
                elif len(nieuw) >= 3:
                    melding = f"{len(nieuw)} nieuwe processen"
                if melding and mond.zeg(melding, mond.nl):
                    laatst_gemeld = now


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n  gestopt")
