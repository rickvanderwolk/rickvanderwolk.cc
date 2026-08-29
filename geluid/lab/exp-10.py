"""
exp-10 — Je laptop laten zingen

De machine waar je op werkt is de partituur. Alles wat je hoort komt uit echte
systeemwaarden (psutil), niets is verzonnen of vooraf opgenomen.

    accu          -> grondtoon    (vol = een octaaf hoger, leeg = laag)
    processor     -> klankkleur   (stil werk is een zuivere toon, druk werk
                                   wordt helder en gaat trillen)
    geheugen      -> zweving      (voller geheugen = snellere zweving, spanning)
    netwerk       -> ruisvlaag    (elke download is een windstoot)
    schijf        -> tikjes       (lezen en schrijven wordt hoorbaar)

Zet 'm aan tijdens je werk en je hoort je eigen dag: een build laat het
oplichten, een lange middag zonder stroom laat de hele klank een octaaf zakken.
Steek je de stekker erin, dan kruipt hij weer omhoog.

Draaien:  ../.venv/bin/python exp-10.py
Stoppen:  Ctrl+C
"""

import threading
import time

import numpy as np
import psutil
import sounddevice as sd

SR = 44100
GAIN = 0.5
GLIDE = 3.0                 # seconden om naar een nieuwe meting te glijden

F_LEEG = 55.0               # Hz — grondtoon bij lege accu
F_VOL = 110.0               # Hz — grondtoon bij volle accu
NET_VOL = 1_000_000.0       # bytes/s waarbij de ruisvlaag op vol staat
DISK_VOL = 20_000_000.0     # bytes/s waarbij het tikken op vol staat
TIK_MAX = 14.0              # hoogstens zoveel tikjes per seconde

# --- gemeten waarden (door de sampler-draad bijgewerkt) ---
m = {"cpu": 0.0, "batt": 1.0, "stroom": True, "mem": 0.5, "net": 0.0, "disk": 0.0}
events = []

rng = np.random.default_rng(10)
phase = np.zeros(3)         # grondtoon, ontstemde tweeling, octaaf
trem_phase = 0.0
ticks = []
now_samples = 0

# geglede waarden (wat je nú hoort)
cur = {"f": 82.0, "bright": 0.0, "beat": 0.002, "net": 0.0, "disk": 0.0}

NOISE_TAIL = 512
tail = np.zeros(NOISE_TAIL)


def band_noise(frames, n):
    """Ruis, glad gestreken met een hann-venster van n samples (klein n = helderder)."""
    global tail
    n = int(np.clip(n, 2, NOISE_TAIL))
    white = rng.standard_normal(frames)
    ker = np.hanning(n + 2)[1:-1]
    ker /= np.sqrt(np.sum(ker ** 2))
    x = np.concatenate([tail[-(n - 1):], white]) if n > 1 else white
    y = np.convolve(x, ker, mode="valid")
    tail = np.concatenate([tail, white])[-NOISE_TAIL:]
    return y


def sampler():
    """Leest elke seconde de machine uit. Staat los van de audio."""
    net0 = psutil.net_io_counters()
    try:
        disk0 = psutil.disk_io_counters()
    except Exception:
        disk0 = None
    vorige_batt = None
    vorige_stroom = None
    while True:
        cpu = psutil.cpu_percent(interval=1.0) / 100.0     # blokkeert precies 1s
        net1 = psutil.net_io_counters()
        net = (net1.bytes_sent - net0.bytes_sent) + (net1.bytes_recv - net0.bytes_recv)
        net0 = net1

        disk = 0.0
        if disk0 is not None:
            try:
                disk1 = psutil.disk_io_counters()
                disk = (disk1.read_bytes - disk0.read_bytes) + \
                       (disk1.write_bytes - disk0.write_bytes)
                disk0 = disk1
            except Exception:
                disk = 0.0

        accu = psutil.sensors_battery()
        batt = 1.0 if accu is None else accu.percent / 100.0
        stroom = True if accu is None else bool(accu.power_plugged)

        m.update({"cpu": cpu, "batt": batt, "stroom": stroom,
                  "mem": psutil.virtual_memory().percent / 100.0,
                  "net": float(net), "disk": float(disk)})

        pct = int(round(batt * 100))
        if vorige_batt is not None and pct != vorige_batt:
            richting = "op" if pct > vorige_batt else "af"
            events.append(f"accu {pct}% ({richting}) — grondtoon {toon(batt):.1f} Hz")
        if vorige_stroom is not None and stroom != vorige_stroom:
            events.append("stekker erin" if stroom else "stekker eruit")
        vorige_batt, vorige_stroom = pct, stroom


def toon(batt):
    return F_LEEG * (F_VOL / F_LEEG) ** batt


def callback(outdata, frames, time_info, status):
    global phase, trem_phase, ticks, now_samples
    if status:
        print(status)

    k = 1.0 - np.exp(-frames / (GLIDE * SR))
    cur["f"] += (toon(m["batt"]) - cur["f"]) * k
    cur["bright"] += (m["cpu"] - cur["bright"]) * k
    cur["beat"] += ((0.0008 + 0.006 * m["mem"]) - cur["beat"]) * k
    cur["net"] += (min(1.0, m["net"] / NET_VOL) ** 0.5 - cur["net"]) * k
    cur["disk"] += (min(1.0, m["disk"] / DISK_VOL) ** 0.5 - cur["disk"]) * k

    t = np.arange(frames) / SR
    f0 = cur["f"]
    b = cur["bright"]

    # --- tremolo: rustige machine ademt traag, drukke machine trilt ---
    trem_rate = 0.4 + 8.0 * b
    trem = 1.0 - (0.45 * b) * (0.5 - 0.5 * np.cos(2 * np.pi * (trem_phase + trem_rate * t)))
    trem_phase = (trem_phase + trem_rate * frames / SR) % 1.0

    freqs = np.array([f0, f0 * (1 + cur["beat"]), f0 * 2])
    pans = np.array([0.5, 0.35, 0.65])
    left = np.zeros(frames)
    right = np.zeros(frames)
    for i, f in enumerate(freqs):
        ph = phase[i] + 2 * np.pi * f * t
        sig = np.sin(ph) + 0.35 * b * np.sin(2 * ph) + 0.20 * b * np.sin(3 * ph) \
            + 0.10 * b * np.sin(5 * ph)
        sig *= trem * (0.55 if i < 2 else 0.25 * (0.3 + 0.7 * b))
        left += sig * np.cos(pans[i] * np.pi / 2)
        right += sig * np.sin(pans[i] * np.pi / 2)
        phase[i] = (phase[i] + 2 * np.pi * f * frames / SR) % (2 * np.pi)

    # --- netwerk: een vlaag ruis, helderder naarmate er meer doorheen gaat ---
    if cur["net"] > 0.002:
        n = int(400 - 380 * cur["net"])
        ruis = band_noise(frames, n) * 0.22 * cur["net"]
        left += ruis
        right += band_noise(frames, n) * 0.22 * cur["net"]

    # --- schijf: korte tikjes, dichter op elkaar bij meer verkeer ---
    kans = TIK_MAX * cur["disk"] * frames / SR
    while kans > 0 and rng.random() < min(kans, 1.0):
        ticks.append({"s0": now_samples + int(rng.integers(0, frames)),
                      "f": f0 * float(rng.choice([8, 10, 12, 16])),
                      "a": 0.10 * float(rng.uniform(0.5, 1.0)),
                      "pan": float(rng.uniform(0.2, 0.8))})
        kans -= 1.0

    if ticks:
        idx = now_samples + np.arange(frames)
        alive = []
        for tk in ticks:
            local = np.clip(idx - tk["s0"], 0, None)
            env = tk["a"] * np.exp(-local / (0.05 * SR)) * (idx >= tk["s0"])
            tone = env * np.sin(2 * np.pi * tk["f"] * local / SR)
            left += tone * np.cos(tk["pan"] * np.pi / 2)
            right += tone * np.sin(tk["pan"] * np.pi / 2)
            if now_samples - tk["s0"] < 0.4 * SR:
                alive.append(tk)
        ticks = alive

    outdata[:] = np.tanh(GAIN * np.column_stack([left, right])).astype(np.float32)
    now_samples += frames


def meter(value, width=12):
    filled = int(round(np.clip(value, 0, 1) * width))
    return "[" + "#" * filled + "-" * (width - filled) + "]"


def leesbaar(bps):
    for eenheid in ("B", "kB", "MB"):
        if bps < 1024 or eenheid == "MB":
            return f"{bps:6.1f} {eenheid}/s"
        bps /= 1024


if __name__ == "__main__":
    print("exp-10  |  je laptop als klank  |  Ctrl+C om te stoppen")
    if psutil.sensors_battery() is None:
        print("         (geen accu gevonden — grondtoon blijft op vol staan)")
    print("         accu=toonhoogte, cpu=kleur, geheugen=zweving, "
          "netwerk=ruis, schijf=tikjes\n")
    threading.Thread(target=sampler, daemon=True).start()
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        try:
            while True:
                sd.sleep(1000)
                while events:
                    print("  " + " " * 78 + "\r  · " + events.pop(0))
                print(f"    {cur['f']:5.1f} Hz  accu {meter(m['batt'])}"
                      f"{'~' if m['stroom'] else ' '} cpu {meter(m['cpu'])} "
                      f"mem {meter(m['mem'])} net {leesbaar(m['net'])}",
                      end="\r", flush=True)
        except KeyboardInterrupt:
            print("\nstil.")
