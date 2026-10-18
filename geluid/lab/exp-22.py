"""
exp-22 — De verteller kijkt mee

Als exp-21, maar hij mist minder:

  - hij ziet tabbladen: in Chrome, Safari, Arc, Brave en Edge leest hij de titel
    van het actieve tabblad ("Je gaat naar Chrome, Pull requests · GitHub.")
  - hij praat sneller en korter, en vat drukte samen in plaats van zinnen weg te
    gooien: "Vier wissels: Chrome, Terminal, Chrome, Finder." Die aantallen en
    namen zijn echt, alleen de samenvatting is van mij.
  - een app telt al na een halve seconde vooraan (was anderhalf)

De eerste keer vraagt macOS of Terminal je browser mag besturen (Automatisering).
Zeg je nee, dan gaat hij verder zonder tabbladen.

    actieve app   -> lsappinfo front
    tabblad       -> AppleScript: titel van het actieve tabblad
    apps          -> lsappinfo visibleProcessList
    stilzitten    -> ioreg HIDIdleTime
    terminal      -> processen met zsh/bash als ouder
    slaap         -> een gat in de meetlus
    drone         -> processor = toonhoogte, geheugen = volume, heel zacht eronder

Draaien:  ../.venv/bin/python exp-22.py
Stoppen:  Ctrl+C
"""

import re
import subprocess
import time

import numpy as np
import psutil
import sounddevice as sd

SR = 44100
GLIDE = 2.0
F_LAAG, F_HOOG = 80.0, 320.0
VOL_MIN, VOL_MAX = 0.01, 0.08

KIJK = 0.5                  # zo vaak kijken (s)
BLIJF = 0.5                 # zo lang moet een app of tabblad vooraan staan voor het telt (s)
VENSTER = 300               # 'vaak' = zo vaak binnen dit venster (s)
STIL = [60, 300, 900, 3600] # bij deze stilte-drempels (s) zegt hij iets
SLAAP = 10
TEMPO = 230                 # woorden per minuut voor say
TITEL_WOORDEN = 7           # zoveel woorden van een tabtitel voorlezen
SHELLS = {"zsh", "bash", "fish", "-zsh", "-bash"}

# AppleScript per browser: titel van het actieve tabblad
BROWSERS = {
    "Google Chrome": 'tell application "Google Chrome" to get title of active tab of front window',
    "Brave Browser": 'tell application "Brave Browser" to get title of active tab of front window',
    "Microsoft Edge": 'tell application "Microsoft Edge" to get title of active tab of front window',
    "Arc": 'tell application "Arc" to get title of active tab of front window',
    "Safari": 'tell application "Safari" to get name of current tab of front window',
}

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


geweigerd = set()           # browsers waar macOS geen toestemming voor gaf


def tabblad(app):
    if app not in BROWSERS or app in geweigerd:
        return None
    r = subprocess.run(["osascript", "-e", BROWSERS[app]], capture_output=True, text=True, timeout=3)
    if r.returncode != 0:
        if "-1743" in r.stderr:         # niet toegestaan (Automatisering)
            geweigerd.add(app)
            print(f"  ! geen toestemming voor {app}; tabbladen daar overgeslagen")
        return None
    titel = r.stdout.strip()
    return " ".join(titel.split()[:TITEL_WOORDEN]) or None


# --- taal ---

RANG = ["", "eerste", "tweede", "derde", "vierde", "vijfde", "zesde", "zevende",
        "achtste", "negende", "tiende", "elfde", "twaalfde"]
TAL = ["", "een", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien"]


def rang(n):
    return RANG[n] if n < len(RANG) else f"{n}e"


def tal(n):
    return TAL[n] if n < len(TAL) else str(n)


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
    """Eén stem. Wat binnenkomt terwijl hij praat wordt bij de volgende zin samengevat."""

    def __init__(self):
        stemmen = subprocess.run(["say", "-v", "?"], capture_output=True, text=True).stdout
        self.stem = "Xander" if "Xander" in stemmen else None
        self.wissels = []       # (naam, losse zin) van app- of tabwissels
        self.overig = []        # andere zinnen, op volgorde
        self.bezig = None

    def wissel(self, naam, zin):
        self.wissels.append((naam, zin))

    def zeg(self, zin):
        self.overig.append(zin)

    def tik(self):
        if self.bezig is not None and self.bezig.poll() is None:
            return
        if self.wissels:
            if len(self.wissels) == 1:
                zin = self.wissels[0][1]
            else:
                namen = [n for n, _ in self.wissels]
                zin = f"{tal(len(namen)).capitalize()} wissels: {', '.join(namen)}."
            self.wissels = []
        elif self.overig:
            zin = self.overig.pop(0)
        else:
            return
        print(f"  {time.strftime('%H:%M:%S')}  {zin}")
        cmd = ["say", "-r", str(TEMPO)] + (["-v", self.stem] if self.stem else []) + [zin]
        self.bezig = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    v = Verteller()
    psutil.cpu_percent()

    # wat nu vooraan staat: (app, tabblad)
    app = voorste_app()
    try:
        voor = (app, tabblad(app))
    except subprocess.TimeoutExpired:
        voor = (app, None)
    voor_sinds = time.time()
    kandidaat, kandidaat_sinds = voor, time.time()
    laatst_weg = {}             # app -> wanneer je er voor het laatst wegging
    bezoeken = {}               # app -> tijden van naartoe gaan
    tabs_gezien = set()
    apps = open_apps()
    open_sinds = {}
    stil_gemeld = 0
    stil_max = 0.0
    pids = set(psutil.pids())
    shell_gezien = {}
    t_lus = time.time()

    print("exp-22 — Ctrl+C stopt")
    app, tab = voor
    v.zeg(f"Je zit in {app}" + (f", {tab}." if tab else ".") if app else "Je zit achter je computer.")
    if tab:
        tabs_gezien.add(tab)
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

            # wisselen van app of tabblad: pas tellen als het even vooraan blijft
            app = voorste_app()
            try:
                tab = tabblad(app)
            except subprocess.TimeoutExpired:
                tab = kandidaat[1] if kandidaat[0] == app else None
            nu_voor = (app, tab)
            if nu_voor != kandidaat:
                kandidaat, kandidaat_sinds = nu_voor, now
            elif app and nu_voor != voor and now - kandidaat_sinds >= BLIJF:
                if app != voor[0]:
                    gebleven = kandidaat_sinds - voor_sinds
                    if voor[0]:
                        laatst_weg[voor[0]] = kandidaat_sinds
                        if gebleven >= 600:
                            v.zeg(f"Je laat {voor[0]} los, na {duur(gebleven)}.")
                    tijden = [t for t in bezoeken.get(app, []) if now - t <= VENSTER] + [now]
                    bezoeken[app] = tijden
                    weg = laatst_weg.get(app)
                    erbij = f", {tab}" if tab else ""
                    if weg is None:
                        zin = f"Je gaat naar {app}{erbij}."
                    elif len(tijden) >= 4:
                        zin = f"Weer {app}{erbij}. De {rang(len(tijden))} keer in {duur(VENSTER)}."
                    elif now - weg < 60:
                        zin = f"Na {duur(gebleven)} terug naar {app}{erbij}."
                    else:
                        zin = f"{app}{erbij}. Voor het laatst {duur(now - weg)} geleden."
                    v.wissel(app, zin)
                    voor_sinds = kandidaat_sinds
                elif tab:
                    v.wissel(tab, f"Terug bij {tab}." if tab in tabs_gezien else f"{tab}.")
                if tab:
                    tabs_gezien.add(tab)
                voor = nu_voor

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
