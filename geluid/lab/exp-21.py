"""
exp-21 — De verteller

Een verteller die zegt wat je doet, in de tweede persoon: "Je gaat naar Safari.
Na 40 seconden terug naar Terminal. De zesde keer in vijf minuten."

Wat hij vertelt is echt gemeten, alleen de zinnen zijn van mij. Ook welke zin
hij kiest hangt aan de data (hoe vaak, hoe lang, hoe lang geleden), niet aan toeval.

    actieve app   -> lsappinfo front          (wisselen, terugkomen, hoe vaak)
    apps          -> lsappinfo visibleProcessList  (openen, sluiten, hoe lang open)
    stilzitten    -> ioreg HIDIdleTime        (tijd sinds je laatste toets of muisbeweging)
    terminal      -> processen met zsh/bash als ouder  ("Je draait git.")
    slaap         -> een gat in de meetlus
    drone         -> processor = toonhoogte, geheugen = volume, heel zacht eronder

Geen extra rechten nodig. Eén stem (Xander, anders de standaardstem), nooit
door elkaar; loopt hij achter, dan vervalt het oudste.

Draaien:  ../.venv/bin/python exp-21.py
Stoppen:  Ctrl+C
"""

import re
import subprocess
import threading
import time

import numpy as np
import psutil
import sounddevice as sd

SR = 44100
GLIDE = 2.0
F_LAAG, F_HOOG = 80.0, 320.0
VOL_MIN, VOL_MAX = 0.01, 0.08   # zacht: de verteller is het stuk

KIJK = 0.5                  # zo vaak kijken (s)
BLIJF = 1.5                 # zo lang moet een app vooraan staan voor het telt (s)
VENSTER = 300               # 'vaak' = zo vaak binnen dit venster (s)
STIL = [60, 300, 900, 3600] # bij deze stilte-drempels (s) zegt hij iets
SLAAP = 10                  # zo'n gat in de lus betekent: de machine sliep
WACHTRIJ = 3                # zoveel zinnen mogen wachten
SHELLS = {"zsh", "bash", "fish", "-zsh", "-bash"}

doel = {"freq": F_LAAG, "vol": VOL_MIN}
nu = {"freq": F_LAAG, "vol": VOL_MIN}
fase = 0.0


def callback(outdata, frames, time_info, status):
    global fase
    a = 1 - np.exp(-frames / (GLIDE * SR))
    f0, v0 = nu["freq"], nu["vol"]
    nu["freq"] += (doel["freq"] - f0) * a
    nu["vol"] += (doel["vol"] - v0) * a
    f = np.linspace(f0, nu["freq"], frames, endpoint=False)
    ph = fase + np.cumsum(2 * np.pi * f / SR)
    fase = float(ph[-1] % (2 * np.pi))
    v = np.linspace(v0, nu["vol"], frames, endpoint=False)
    uit = (v * (np.sin(ph) + 0.3 * np.sin(1.5 * ph))).astype(np.float32)
    outdata[:] = np.column_stack([uit, uit])


# --- metingen ---

def app_naam(ruw):
    return ruw.replace("_", " ").replace("\xad", "").strip()


def voorste_app():
    try:
        asn = subprocess.run(["lsappinfo", "front"], capture_output=True, text=True).stdout.strip()
        uit = subprocess.run(["lsappinfo", "info", "-only", "name", asn], capture_output=True, text=True).stdout
    except FileNotFoundError:
        return None
    m = re.search(r'"LSDisplayName"="(.*)"', uit)
    return app_naam(m.group(1)) if m else None


def open_apps():
    uit = subprocess.run(["lsappinfo", "visibleProcessList"], capture_output=True, text=True).stdout
    return {app_naam(n) for n in re.findall(r'-"([^"]+)"', uit)}


def stil_seconden():
    uit = subprocess.run(["ioreg", "-c", "IOHIDSystem", "-d", "4"], capture_output=True, text=True).stdout
    m = re.search(r'"HIDIdleTime" = (\d+)', uit)
    return int(m.group(1)) / 1e9 if m else 0.0


# --- taal ---

RANG = ["", "eerste", "tweede", "derde", "vierde", "vijfde", "zesde", "zevende",
        "achtste", "negende", "tiende", "elfde", "twaalfde"]


def rang(n):
    return RANG[n] if n < len(RANG) else f"{n}e"


def duur(s):
    s = int(s)
    if s < 60:
        return "een seconde" if s == 1 else f"{s} seconden"
    m = s // 60
    if m < 60:
        return "een minuut" if m == 1 else f"{m} minuten"
    u, m = divmod(m, 60)
    return f"{u} uur" + (f" en {m} minuten" if m else "")


class Verteller:
    def __init__(self):
        stemmen = subprocess.run(["say", "-v", "?"], capture_output=True, text=True).stdout
        self.stem = "Xander" if "Xander" in stemmen else None
        self.rij = []
        self.bezig = None

    def zeg(self, zin):
        print(f"  {time.strftime('%H:%M:%S')}  {zin}")
        self.rij.append(zin)
        del self.rij[:-WACHTRIJ]

    def tik(self):
        if self.rij and (self.bezig is None or self.bezig.poll() is not None):
            cmd = ["say"] + (["-v", self.stem] if self.stem else []) + [self.rij.pop(0)]
            self.bezig = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    v = Verteller()
    psutil.cpu_percent()

    voor = voorste_app()        # wat nu vooraan staat (bevestigd)
    voor_sinds = time.time()
    kandidaat, kandidaat_sinds = voor, time.time()
    laatst_weg = {}             # app -> wanneer je er voor het laatst wegging
    bezoeken = {}               # app -> tijden van naartoe gaan
    apps = open_apps()
    open_sinds = {}             # app -> wanneer geopend (alleen wat we zagen openen)
    stil_gemeld = 0             # hoogste stilte-drempel die al gezegd is
    stil_max = 0.0              # langste stilte van deze keer
    pids = set(psutil.pids())
    shell_gezien = {}           # opdracht -> laatst verteld
    t_lus = time.time()

    print("exp-21 — Ctrl+C stopt")
    v.zeg(f"Je zit in {voor}." if voor else "Je zit achter je computer.")
    with sd.OutputStream(samplerate=SR, channels=2, callback=callback, blocksize=1024):
        while True:
            time.sleep(KIJK)
            now = time.time()
            if now - t_lus > SLAAP:
                v.zeg(f"De machine sliep {duur(now - t_lus)}.")
            t_lus = now

            cpu = psutil.cpu_percent()
            doel["freq"] = F_LAAG * (F_HOOG / F_LAAG) ** (cpu / 100)
            doel["vol"] = VOL_MIN + (VOL_MAX - VOL_MIN) * psutil.virtual_memory().percent / 100

            # wisselen van app: pas tellen als hij even vooraan blijft
            app = voorste_app()
            if app != kandidaat:
                kandidaat, kandidaat_sinds = app, now
            elif app and app != voor and now - kandidaat_sinds >= BLIJF:
                gebleven = kandidaat_sinds - voor_sinds
                if voor:
                    laatst_weg[voor] = kandidaat_sinds
                    if gebleven >= 600:
                        v.zeg(f"Je laat {voor} los, na {duur(gebleven)}.")
                tijden = [t for t in bezoeken.get(app, []) if now - t <= VENSTER] + [now]
                bezoeken[app] = tijden
                weg = laatst_weg.get(app)
                if weg is None:
                    v.zeg(f"Je gaat naar {app}.")
                elif len(tijden) >= 4:
                    v.zeg(f"Weer {app}. De {rang(len(tijden))} keer in {duur(VENSTER)}.")
                elif now - weg < 60:
                    v.zeg(f"Na {duur(gebleven)} terug naar {app}.")
                else:
                    v.zeg(f"{app}. Voor het laatst {duur(now - weg)} geleden.")
                voor, voor_sinds = app, kandidaat_sinds

            # apps openen en sluiten
            nieuw = open_apps()
            for a in sorted(nieuw - apps):
                open_sinds[a] = now
                v.zeg(f"Je opent {a}.")
            for a in sorted(apps - nieuw):
                sinds = open_sinds.pop(a, None)
                v.zeg(f"{a} gaat dicht" + (f", na {duur(now - sinds)}." if sinds else "."))
            apps = nieuw

            # stilzitten en terugkomen
            stil = stil_seconden()
            stil_max = max(stil_max, stil)
            drempel = max([d for d in STIL if stil >= d], default=0)
            if drempel > stil_gemeld:
                v.zeg("Je raakt niets meer aan." if drempel == STIL[0] else f"Al {duur(drempel)} niets aangeraakt.")
                stil_gemeld = drempel
            elif stil < 2 and stil_gemeld:
                v.zeg(f"Je bent terug. Na {duur(stil_max)}.")
                stil_gemeld = 0
            if stil < 2:
                stil_max = 0.0

            # opdrachten in je terminal (wat langer duurt dan een halve seconde)
            huidig = set(psutil.pids())
            for pid in huidig - pids:
                try:
                    p = psutil.Process(pid)
                    ouder = p.parent()
                    if ouder and ouder.name() in SHELLS and p.name() not in SHELLS:
                        naam = p.name()
                        if now - shell_gezien.get(naam, 0) > VENSTER:
                            v.zeg(f"Je draait {naam}.")
                        shell_gezien[naam] = now
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            pids = huidig

            v.tik()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n  gestopt")
