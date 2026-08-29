"""
exp-3 — Voorlezen

Geen gesprek. Eén model, één stem, en een verhaaltje voor het slapengaan. Als
het uit is verzint het een nieuw verhaaltje en begint het opnieuw, en dat blijft
het doen tot je het uitzet.

Wat het interessant maakt is niet het verhaal maar de stroom. Een verhaaltje
voorlezen is een handeling met een einde — je slaat het boek dicht, je doet het
licht uit. Deze doet dat niet. Er is geen laatste verhaaltje, er is er altijd
nog één, en de aankondiging ervan komt er even vriendelijk uit als de vorige.
Ergens tussen het derde en het zevende verhaaltje merk je dat de dingen die het
verzint op elkaar gaan lijken: er is opnieuw een maan, er is opnieuw een dier
dat niet kan slapen. Een model van deze grootte heeft een klein hoofd, en dat
hoor je pas als je het lang genoeg laat praten.

Daar zit één rem op, en dat is dezelfde rem als in exp-0: een nieuwe titel mag
niet te veel op een eerdere titel lijken. Dat gaat mechanisch, niet via de
opdracht — een klein model dat je vertelt waar het níét over mag gaan, gaat daar
gegarandeerd over. Wordt een titel afgekeurd, dan wordt er stilletjes een nieuwe
gevraagd. Je hoort alleen de titel die het haalde.

**Het mag niet stokken.** Een verhaaltje van tien zinnen laten bedenken en dan
pas gaan voorlezen betekent een halve minuut stilte vooraf. Dus loopt het per
zin: zodra het model een zin af heeft wordt die ingesproken en in de rij gezet,
en terwijl de stem hem voorleest is het model alweer met de volgende bezig. Het
begint te praten voordat het weet hoe het afloopt, net als iemand die een
verhaaltje verzint terwijl hij het vertelt.

De stem komt uit macOS en is dus geen mooie stem. Dat is hetzelfde als in exp-2
en om dezelfde reden: het draait op deze machine, zonder sleutel, zonder
internet, zonder quota.

Het gaat over slaapverhaaltjes omdat de opdracht bovenin dat zegt. Zet er iets
anders neer en het wordt een eindeloze stroom weerberichten, of recepten, of
uitleg over dingen die niemand gevraagd heeft.

Draaien:  python3 exp-3.py
Stoppen:  Ctrl+C
Nodig:    macOS (`say`, `afplay`) en ollama draaiend op deze machine
          (`ollama serve`, `ollama pull llama3.2:1b`).
"""

import json
import os
import queue
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
import wave

OLLAMA = "http://localhost:11434/api/chat"

# ---------------------------------------------------------------- wie vertelt

# Wisselen is één regel. `ollama list` laat zien wat er binnen is; wat er niet
# is zegt het script bij de start, met de regel om het op te halen erbij.
#
#   smollm2:135m   270 MB   volgt nauwelijks instructies — chaos
#   qwen2.5:0.5b   400 MB   net genoeg besef van de opdracht
#   llama3.2:1b    1,3 GB   de zoete plek
#   qwen2.5:3b     1,9 GB   traag, maar hier valt dat mee: er wordt per zin
#                           vooruit gewerkt, dus de stem hoeft niet te wachten
MODEL = "qwen2.5:3b"

# `say -v '?'` laat zien wat er op deze machine staat; Nederlands zijn Xander
# (nl_NL) en Ellen (nl_BE). Voor het slapengaan mag het langzamer dan een
# gesprek — 150 woorden per minuut is ongeveer voorleestempo.
STEM, TEMPO = "Xander", 140

# ------------------------------------------------------------- wat het vertelt

# Twee opdrachten: één voor de titel, één voor het verhaal. De titel wordt apart
# gevraagd omdat hij vooruit moet — hij wordt aangekondigd voordat het verhaal
# begint, en hij is ook waar de herhalingsrem op aangrijpt.
#
# Hier staat het hele stuk. Zet er "Geef het weerbericht voor een plaats die
# niet bestaat" neer en het is een ander stuk, met dezelfde machine eronder.
OPDRACHT_TITEL = ("Verzin de titel van een verhaaltje voor het slapengaan. "
                  "Alleen de titel, drie of vier woorden, in het Nederlands. "
                  "Geen aanhalingstekens, geen uitleg, verder niets.")

OPDRACHT_VERHAAL = ("Je leest iemand een lang verhaaltje voor het slapengaan "
                    "voor. Vertel rustig door en neem de tijd: beschrijf wat "
                    "je ziet, wie er zijn, wat ze doen. Korte zinnen, geen "
                    "spanning, niemand gaat dood. Alleen het verhaal in het "
                    "Nederlands, geen titel en geen uitleg.")

# Een model van deze grootte houdt na een zin of tien op, hoe lang je het
# verhaal ook vraagt. Dus wordt er gewoon opnieuw gevraagd: wat er al verteld is
# gaat terug als zijn eigen woorden, met een van deze twee zinnen erachter.
BEGIN = "Vertel het verhaaltje '{titel}'. Begin meteen met de eerste zin."
VERDER = "Ga verder met het verhaal."
AFRONDEN = "Ga verder en rond het verhaal nu rustig af."

# En waar het tóch mee begint gaat er mechanisch af. Een klein model opent zijn
# antwoord graag met "Natuurlijk!" of "Hier is het verhaal:", en dat wordt
# anders gewoon voorgelezen. Alleen aan het begin van een stuk, en alleen als de
# zin niets anders is dan dat — "Hier is het bos waar de vos woont." blijft.
OPSMUK = {"natuurlijk", "zeker", "tuurlijk", "oké", "oke", "ok", "okay",
          "goed", "prima", "jazeker", "sure", "certainly", "absolutely"}

# Datzelfde geldt voor de titel. Vraag een klein model om een titel en je krijgt
# "Dus deze is een verhaaltje over" terug. Een titel die het over zichzelf heeft
# is geen titel, dus die wordt geweigerd en er wordt opnieuw gevraagd.
GEEN_TITEL = re.compile(r"\b(verhaal|verhaaltje|titel|story|hier|dus)\b", re.I)

AANKONDIGING = "Verhaaltje {nummer}. {titel}."

ZINNEN = 45        # zoveel zinnen mag een verhaal worden; daarna houdt het op
TERUGBLIK = 12     # zoveel zinnen ziet het model terug als het verder moet
SLOT = 4           # zoveel zinnen voor het eind wordt er gevraagd af te ronden
TITELWOORDEN = 6   # zoveel woorden houdt een titel over

# De rem op de herhaling. Een nieuwe titel die te veel woorden deelt met een
# eerdere titel wordt geweigerd en opnieuw gevraagd, met een ander zaadje. Kijkt
# alleen naar de laatste TITELS titels terug: wat daaruit gerold is mag weer,
# want dat heb je een uur geleden gehoord.
OVERLAP = 0.4
TITELS = 15
POGINGEN = 6

# ------------------------------------------------------------------- hoe hard

TEMP, ZAAD = 1.0, 1     # een verhaal mag warmer dan een gesprek
HERHALING = 1.25

MAX_VERHALEN = 0        # 0 = eindeloos, tot je Ctrl+C drukt
PAUZE_ZIN = 0.35        # adem tussen twee zinnen
PAUZE_VERHAAL = 3.0     # en de stilte voor er een nieuw verhaaltje komt
VOORUIT = 3             # zoveel zinnen mag hij vooruit inspreken
BEWAAR = True           # de verhalen als jsonl in verhalen/

# --------------------------------------------------------------------- opmaak

KLEUR, GRIJS, RESET = "\033[35m", "\033[90m", "\033[0m"
BREEDTE, INSPRING = 66, 2

WAV = "--data-format=LEI16@22050"

STOPWOORDEN = {
    "de", "het", "een", "en", "of", "maar", "want", "dus", "als", "dan", "die",
    "dat", "deze", "dit", "er", "zijn", "was", "ben", "bent", "heb", "hebt",
    "heeft", "had", "wordt", "worden", "werd", "ik", "jij", "je", "u", "hij",
    "zij", "ze", "we", "wij", "mij", "mijn", "jouw", "uw", "zich", "te", "in",
    "op", "aan", "van", "voor", "met", "bij", "om", "naar", "uit", "over",
    "door", "tot", "niet", "geen", "ook", "nog", "al", "wel", "meer", "zo",
    "hier", "daar", "wat", "hoe", "waar", "wie", "kan", "kun", "kunt", "zal",
    "zou", "moet", "wil", "gaan", "gaat", "ga", "laat", "laten",
}


class Regel:
    """Schrijft woord voor woord en breekt zelf af op de juiste breedte.

    Blijft open over meerdere zinnen heen, zodat een verhaal als één lopende
    alinea op het scherm komt en niet als losse regels."""

    def __init__(self):
        kolommen = shutil.get_terminal_size((80, 24)).columns
        self.breedte = max(24, min(BREEDTE, kolommen - INSPRING - 4))
        self.marge = " " * INSPRING
        self.kolom = 0

    def open(self):
        sys.stdout.write(self.marge)
        self.kolom = 0

    def woord(self, w):
        if self.kolom and self.kolom + 1 + len(w) > self.breedte:
            sys.stdout.write("\n" + self.marge)
            self.kolom = 0
        elif self.kolom:
            sys.stdout.write(" ")
            self.kolom += 1
        sys.stdout.write(w)
        self.kolom += len(w)
        sys.stdout.flush()

    def sluit(self):
        sys.stdout.write(RESET + "\n")
        sys.stdout.flush()


# --------------------------------------------------------------- tekst opmaken

def inhoudswoorden(tekst):
    woorden = re.findall(r"[a-zà-öø-ÿ']+", tekst.lower())
    return {w for w in woorden if w not in STOPWOORDEN and len(w) > 1}


def afronden(tekst):
    """Laat een zin landen op een punt in plaats van weg te zakken."""
    tekst = tekst.strip().rstrip(" ,;:-–—")
    tekst = re.sub(r"\s*(?:\.{2,}|…)\s*$", ".", tekst)
    if tekst and tekst[-1] not in ".!?":
        tekst += "."
    return tekst


def is_opsmuk(zin):
    """Waar een klein model zijn antwoord mee begint, niet zijn verhaal."""
    kaal = zin.strip()
    if kaal.endswith(":"):
        return True
    woorden = re.findall(r"[a-zà-öø-ÿ']+", kaal.lower())
    return bool(woorden) and len(woorden) <= 3 and woorden[0] in OPSMUK


def schone_titel(tekst):
    """Een klein model levert 'Titel: "De maan die niet kon slapen"' af."""
    regels = [r for r in tekst.strip().splitlines() if r.strip()]
    if not regels:
        return ""
    regel = re.sub(r"^\s*titel\s*[:\-–]\s*", "", regels[0], flags=re.I)
    regel = regel.strip(" \"'“”‘’*.")
    return " ".join(regel.split()[:TITELWOORDEN]).strip()


# ------------------------------------------------------------------- het model

def stroom(berichten, zaad, tekens):
    payload = {
        "model": MODEL,
        "messages": berichten,
        "stream": True,
        "options": {
            "temperature": TEMP,
            "seed": zaad,
            "repeat_penalty": HERHALING,
            "num_predict": tekens,
        },
    }
    verzoek = urllib.request.Request(
        OLLAMA, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(verzoek) as antwoord:
        for regel in antwoord:
            regel = regel.strip()
            if not regel:
                continue
            brok = json.loads(regel)
            if brok.get("done"):
                break
            stuk = brok.get("message", {}).get("content", "")
            if stuk:
                yield stuk


def in_een_keer(berichten, zaad, tekens):
    return "".join(stroom(berichten, zaad, tekens))


def zin_voor_zin(berichten, zaad, plafond):
    """Geeft elke zin terug zodra hij af is, niet als het verhaal af is.

    Dat is het hele verschil tussen een stem die meteen begint en een halve
    minuut stilte vooraf. Er wordt niet verder geluisterd zodra het plafond
    bereikt is: de verbinding gaat dicht en de rest van wat het model nog wilde
    zeggen wordt nooit opgehaald."""
    buffer, aantal = "", 0
    for stuk in stroom(berichten, zaad, min(plafond, 12) * 40):
        buffer += stuk.replace("\n", " ")
        while True:
            gevonden = re.match(r"\s*(.+?[.!?…]+)(?=\s|$)", buffer, re.S)
            if not gevonden:
                break
            buffer = buffer[gevonden.end():]
            zin = afronden(gevonden.group(1))
            if not zin:
                continue
            yield zin
            aantal += 1
            if aantal >= plafond:
                return
    # Wat er na de laatste punt nog in de buffer staat is geen zin maar een
    # afgekapt restje — het model werd afgebroken of hield er middenin mee op.
    # Daar een punt achter zetten geeft precies de doodlopende zin die er niet
    # moet zijn. Weggooien dus; de volgende ronde pakt de draad toch weer op.


def lijkt_op(nieuw, oud):
    oud = inhoudswoorden(oud)
    return bool(oud) and len(nieuw & oud) / len(nieuw | oud) >= OVERLAP


HERHAALT = 0.8     # zoveel woorden gedeeld met een eerdere zin = dezelfde zin


def is_herhaling(zin, eerder):
    """Vraag een klein model om verder te gaan en het doet zijn vorige zin
    woordelijk over. Op papier lees je eroverheen, hardop hoor je het meteen,
    dus zo'n zin gaat er stilletjes uit. Kan het alleen nog maar herhalen, dan
    is het verhaal uit — dat is dan het einde."""
    nieuw = set(re.findall(r"[a-zà-öø-ÿ']+", zin.lower()))
    if not nieuw:
        return True
    for oud in eerder:
        oud = set(re.findall(r"[a-zà-öø-ÿ']+", oud.lower()))
        if oud and len(nieuw & oud) / len(nieuw | oud) >= HERHAALT:
            return True
    return False


def het_verhaal(titel, zaad):
    """Vertelt door tot er ZINNEN zinnen liggen.

    Houdt het model op, dan wordt er opnieuw gevraagd met wat er al verteld is
    als zijn eigen woorden erbij. Het verhaal wordt dus niet in één keer bedacht
    maar in stukken, en de naad hoor je niet omdat de stem toch al per zin
    loopt. Vlak voor het einde wordt er gevraagd af te ronden, zodat een verhaal
    ophoudt in plaats van dat het wordt afgekapt.

    Zegt het niets meer, dan is het verhaal uit, hoeveel zinnen er ook nog over
    waren. Alleen als er nog helemaal niets verteld is wordt het opnieuw
    geprobeerd met een ander zaadje — een verhaal dat leeg blijft is geen
    verhaal, en dat gebeurt bij de allerkleinste modellen."""
    verteld, leeg = [], 0
    while len(verteld) < ZINNEN:
        rest = ZINNEN - len(verteld)
        berichten = [{"role": "system", "content": OPDRACHT_VERHAAL},
                     {"role": "user", "content": BEGIN.format(titel=titel)}]
        if verteld:
            berichten.append({"role": "assistant",
                              "content": " ".join(verteld[-TERUGBLIK:])})
            berichten.append({"role": "user",
                              "content": AFRONDEN if rest <= SLOT else VERDER})
        nieuw = 0
        for zin in zin_voor_zin(berichten, zaad + 100 * len(verteld) + 7000 * leeg, rest):
            if not nieuw and is_opsmuk(zin):
                continue
            if is_herhaling(zin, verteld):
                continue
            verteld.append(zin)
            nieuw += 1
            yield zin
        if nieuw:
            leeg = 0
            continue
        leeg += 1
        if verteld or leeg >= POGINGEN:
            return


def verzin_titel(eerdere, zaad):
    """Blijft proberen tot er een titel komt die nog niet geweest is.

    Mechanisch, en met opzet niet in de opdracht: een klein model dat je
    vertelt waar het níét over mag gaan, gaat daar gegarandeerd over."""
    venster, titel = eerdere[-TITELS:], ""
    for poging in range(POGINGEN):
        ruw = in_een_keer([{"role": "system", "content": OPDRACHT_TITEL},
                           {"role": "user", "content": "Verzin er een."}],
                          zaad + 1000 * poging, 40)
        titel = schone_titel(ruw)
        if GEEN_TITEL.search(titel):
            continue
        nieuw = inhoudswoorden(titel)
        if nieuw and not any(lijkt_op(nieuw, oud) for oud in venster):
            return titel
    return titel or "Nog een verhaaltje"


# ------------------------------------------------------------------- de stem

def inspreken(tekst, map_, naam):
    """Zet de zin om in een wav en leest eruit hoe lang hij precies duurt.

    Dat laatste is de reden dat het via een bestand gaat in plaats van `say`
    direct te laten praten: frames gedeeld door samplerate is exact de
    speelduur, en daarmee kan de tekst op het scherm gelijk oplopen met de
    stem. De tekst gaat via stdin, zodat een zin die met een streepje begint
    geen optie wordt."""
    pad = os.path.join(map_, naam + ".wav")
    subprocess.run(["say", "-v", STEM, "-r", str(TEMPO), "-o", pad, WAV, "-f", "-"],
                   input=tekst.encode(), check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with wave.open(pad) as bestand:
        return pad, bestand.getnframes() / bestand.getframerate()


def voorlezen(regel, tekst, pad, duur):
    """Speelt de zin af en typt hem er in hetzelfde tempo bij.

    De seconden worden over de woorden verdeeld naar hun lengte — een lang
    woord duurt nu eenmaal langer om uit te spreken. Het is een verdeling en
    geen meting, maar omdat de totale duur wél klopt lopen tekst en stem hoe
    dan ook samen af."""
    woorden = tekst.split()
    if not woorden:
        return
    lengtes = [len(w) + 1 for w in woorden]
    totaal = sum(lengtes)

    speler = subprocess.Popen(["afplay", pad], stdout=subprocess.DEVNULL,
                              stderr=subprocess.DEVNULL)
    begin, verstreken = time.monotonic(), 0
    try:
        for woord, lengte in zip(woorden, lengtes):
            regel.woord(woord)
            verstreken += lengte
            wachten = begin + duur * verstreken / totaal - time.monotonic()
            if wachten > 0:
                time.sleep(wachten)
        speler.wait()
    except BaseException:
        speler.terminate()
        raise


# --------------------------------------------------------------- de lopende band

def band(rij, titel, zaad, map_, nummer):
    """Draait in de achtergrond: zin ophalen, inspreken, in de rij zetten.

    De rij is met opzet kort. Loopt hij vol, dan blijft deze draad hier hangen
    tot de stem weer een zin heeft weggewerkt — er wordt dus nooit een heel
    verhaal vooruit ingesproken dat je misschien niet eens hoort."""
    try:
        for tel, zin in enumerate(het_verhaal(titel, zaad)):
            pad, duur = inspreken(zin, map_, f"{nummer:04d}-{tel:03d}")
            rij.put((zin, pad, duur))
    except BaseException as fout:
        rij.put(fout)
    else:
        rij.put(None)


def opruimen(map_):
    """Weg met de tijdelijke wav's.

    De band kan nog midden in een `say` zitten als hier al opgeruimd wordt; die
    schrijft zijn bestand dan terug in een map die net leeggehaald is. Even
    wachten en het nog eens proberen is genoeg — daarna is de map weg en loopt
    die `say` stuk op een pad dat niet meer bestaat, wat de bedoeling is."""
    for _ in range(5):
        shutil.rmtree(map_, ignore_errors=True)
        if not os.path.exists(map_):
            return
        time.sleep(0.4)


def bewaar(verhalen):
    map_ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "verhalen")
    os.makedirs(map_, exist_ok=True)
    stempel = time.strftime("%Y%m%d-%H%M%S")
    pad = os.path.join(map_, stempel + ".jsonl")
    nummer = 2
    while os.path.exists(pad):
        pad = os.path.join(map_, f"{stempel}-{nummer}.jsonl")
        nummer += 1
    with open(pad, "w") as bestand:
        for verhaal in verhalen:
            bestand.write(json.dumps(verhaal, ensure_ascii=False) + "\n")
    return os.path.normpath(pad)


# --------------------------------------------------------------------- draaien

def stem_bestaat(naam):
    if sys.platform != "darwin":
        return "exp-3 gebruikt `say` en `afplay` van macOS."
    try:
        lijst = subprocess.run(["say", "-v", "?"], capture_output=True,
                               text=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError):
        return "`say` doet het niet op deze machine."
    if naam not in {r.split()[0] for r in lijst.splitlines() if r.strip()}:
        return (f"Stem {naam} staat niet op deze machine. `say -v '?'` laat "
                f"zien wat er wél is; Nederlands staat onder nl_NL en nl_BE, "
                f"bij te halen via Systeeminstellingen → Toegankelijkheid → "
                f"Gesproken materiaal.")
    return None


def model_bestaat(naam):
    """Zonder dit geeft ollama een kale 404 zodra het model niet binnen is."""
    try:
        with urllib.request.urlopen("http://localhost:11434/api/tags",
                                    timeout=5) as antwoord:
            binnen = {m["name"] for m in json.load(antwoord).get("models", [])}
    except (urllib.error.URLError, TimeoutError, ValueError):
        return "Geen ollama op localhost:11434. Start 'm met `ollama serve`."
    if naam not in binnen and f"{naam}:latest" not in binnen:
        return f"Nog niet binnengehaald: {naam}.\n  ollama pull {naam}"
    return None


def main():
    for klacht in (stem_bestaat(STEM), model_bestaat(MODEL)):
        if klacht:
            print(klacht)
            return

    print(f"{GRIJS}exp-3  |  voorlezen  |  {MODEL} · {STEM}  |  "
          f"{'eindeloos' if MAX_VERHALEN == 0 else str(MAX_VERHALEN) + ' verhalen'}"
          f"  |  Ctrl+C{RESET}\n")

    werkmap = tempfile.mkdtemp(prefix="praat-")
    titels, verhalen = [], []
    nummer = 0
    try:
        while MAX_VERHALEN == 0 or nummer < MAX_VERHALEN:
            nummer += 1
            titel = verzin_titel(titels, ZAAD + 7 * nummer)
            titels.append(titel)

            # Eerst de band aanzwengelen, dan pas aankondigen: terwijl de titel
            # wordt voorgelezen staan de eerste zinnen al klaar.
            rij = queue.Queue(maxsize=VOORUIT)
            threading.Thread(target=band,
                             args=(rij, titel, ZAAD + 7 * nummer, werkmap, nummer),
                             daemon=True).start()

            aankondiging = AANKONDIGING.format(nummer=nummer, titel=titel)
            pad, duur = inspreken(aankondiging, werkmap, f"{nummer:04d}-aan")
            print(f"{KLEUR}{aankondiging}{RESET}")
            speler = subprocess.Popen(["afplay", pad], stdout=subprocess.DEVNULL,
                                      stderr=subprocess.DEVNULL)
            try:
                speler.wait()
            except BaseException:
                speler.terminate()
                raise
            os.remove(pad)
            time.sleep(PAUZE_ZIN)

            regel = Regel()
            regel.open()
            gezegd = []
            while True:
                stuk = rij.get()
                if stuk is None:
                    break
                if isinstance(stuk, BaseException):
                    raise stuk
                zin, pad, duur = stuk
                voorlezen(regel, zin, pad, duur)
                os.remove(pad)          # gelezen is gelezen
                gezegd.append(zin)
                time.sleep(PAUZE_ZIN)
            regel.sluit()

            verhalen.append({"nummer": nummer, "titel": titel,
                             "model": MODEL, "stem": STEM,
                             "tekst": " ".join(gezegd)})
            print()
            time.sleep(PAUZE_VERHAAL)
    except KeyboardInterrupt:
        print()
    except urllib.error.URLError:
        print(f"\n{GRIJS}Geen ollama meer op localhost:11434.{RESET}")

    opruimen(werkmap)
    print(f"{GRIJS}— {len(verhalen)} verhaaltje"
          f"{'' if len(verhalen) == 1 else 's'}.{RESET}")
    if BEWAAR and verhalen:
        print(f"{GRIJS}  {bewaar(verhalen)}{RESET}")


if __name__ == "__main__":
    main()
