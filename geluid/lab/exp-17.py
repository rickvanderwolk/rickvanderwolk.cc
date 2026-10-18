"""
exp-17 — Hoor wat je computer doet

Alles komt uit echte metingen (psutil), niets is verzonnen:

    processor     -> toonhoogte van de drone  (0% = 80 Hz, 100% = 320 Hz)
    geheugen      -> volume van de drone      (voller = harder)
    netwerk       -> tikjes                   (één tik per 64 KB in of uit)
    nieuw proces  -> één korte toon           (hoogte uit een hash van de naam,
                                               dus 'git' klinkt altijd hetzelfde)

Met --say meldt hij grote veranderingen hardop (macOS `say`), max 1 per 10 s.

Draaien:  ../.venv/bin/python exp-17.py [--say]
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
GLIDE = 1.5                 # seconden om naar een nieuwe meting te glijden
F_LAAG, F_HOOG = 80.0, 320.0
VOL_MIN, VOL_MAX = 0.03, 0.25
TIK_BYTES = 64 * 1024       # zoveel bytes netwerkverkeer is één tik
TIK_MAX = 60                # hoogstens zoveel tikjes per seconde
PROC_MAX = 4                # hoogstens zoveel procestonen per seconde
PENTA = [0, 2, 4, 7, 9]     # procestonen in een pentatonische ladder, 2 octaven
SAY_PAUZE = 10.0

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


def kies_stem():
    # Nederlandse stem als die er is, anders de standaardstem
    try:
        stemmen = subprocess.run(["say", "-v", "?"], capture_output=True, text=True).stdout
    except FileNotFoundError:
        return None
    for regel in stemmen.splitlines():
        if "nl_NL" in regel:
            return regel.split("  ")[0].strip()
    return None


def zeg(tekst, stem):
    cmd = ["say"] + (["-v", stem] if stem else []) + [tekst]
    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    global tikken
    ap = argparse.ArgumentParser(description="Hoor wat je computer doet.")
    ap.add_argument("--say", action="store_true", help="meld grote veranderingen hardop")
    args = ap.parse_args()

    stem = kies_stem() if args.say else None
    laatst_gezegd = 0.0
    geschiedenis = []           # (tijd, cpu, ram) voor 'grote verandering'

    psutil.cpu_percent()
    net0 = psutil.net_io_counters()
    t0 = time.time()
    pids = set(psutil.pids())

    print("exp-17 — Ctrl+C stopt" + (f"  (say: {stem or 'standaardstem'})" if args.say else ""))
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
                for naam in nieuw[:PROC_MAX // 2]:
                    tonen.append([naam_toon(naam), 0.0, TOON_LEN])

            extra = f" +{len(nieuw) - PROC_MAX // 2}" if len(nieuw) > PROC_MAX // 2 else ""
            print(f"\r  cpu {cpu:5.1f}%  ram {ram:5.1f}%  net {bps / 1024:8.1f} KB/s  "
                  f"{doel['freq']:5.1f} Hz  {', '.join(nieuw[:3])[:40]:40}{extra:5}", end="", flush=True)

            # grote verandering: vergeleken met ~10 s geleden
            geschiedenis.append((now, cpu, ram))
            geschiedenis = [g for g in geschiedenis if now - g[0] <= 10]
            if args.say and now - laatst_gezegd >= SAY_PAUZE:
                _, cpu_oud, ram_oud = geschiedenis[0]
                melding = None
                if abs(cpu - cpu_oud) >= 40:
                    melding = f"processor {'omhoog' if cpu > cpu_oud else 'omlaag'}, {cpu:.0f} procent"
                elif abs(ram - ram_oud) >= 5:
                    melding = f"geheugen {ram:.0f} procent"
                elif bps >= 10 * 1024 * 1024:
                    melding = f"netwerk, {bps / 1024 / 1024:.0f} megabyte per seconde"
                elif len(nieuw) >= 10:
                    melding = f"{len(nieuw)} nieuwe processen"
                if melding:
                    zeg(melding, stem)
                    laatst_gezegd = now


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n  gestopt")
