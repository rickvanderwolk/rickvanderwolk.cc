"""
exp-2 — Hardop

Hetzelfde gesprek als exp-0 en exp-1, maar nu uitgesproken. Twee stemmen in de
kamer in plaats van twee kolommen tekst.

Dat verandert het stuk meer dan je zou denken. Op het scherm lees je in je
eigen tempo en sla je de saaie beurten over; hardop moet je alles uitzitten.
Een beleefde zin die niets zegt duurt vier seconden, en die vier seconden
horen bij het stuk. Je hoort ook pas echt hoe weinig er gebeurt: twee stemmen
die keurig op elkaar reageren, allebei met de juiste intonatie, en er wordt
niets gezegd. Op papier is dat een grap, hardop is het ongemakkelijk.

De stemmen zitten al in macOS: Xander praat Nederlands-Nederlands, Ellen
Belgisch-Nederlands. Dat is geen esthetische keuze maar dezelfde als de rest
van dit mapje — het draait op deze machine, zonder sleutel, zonder internet,
zonder quota. Het klinkt navenant. Twee spraakcomputers die een gesprek
voeren dat door twee taalmodellen wordt verzonnen, en niemand die iets wil.

Drie dingen die de terminalversie niet hoefde op te lossen:

**De stilte.** Een beurt bedenken kost dit model een paar seconden. Op het
scherm zie je dan een cursor knipperen, hardop hoor je niets en is het stuk
kapot. Dus loopt de machine een beurt vooruit: terwijl de ene stem praat wordt
de volgende beurt al bedacht én ingesproken. De stilte tussen twee sprekers is
daardoor geen wachttijd meer maar een keuze — PAUZE, en die staat op de lengte
van een echte adempauze.

**Het einde van een zin.** Op het scherm kun je een beurt laten doodlopen in
puntjes; hardop kan dat niet, dan sterft er een stem weg in de kamer. Het
woordental per kant is daarom geen mes meer maar een noodrem: een beurt is af
zodra er hele zinnen liggen, en pas een model dat maar geen punt zet loopt tegen
dat woordental aan. Een beurt landt altijd op een punt.

**Het meelezen.** De tekst loopt woord voor woord mee met de stem. Niet op
gevoel: `say` schrijft eerst een wav weg, daarin staat exact hoe lang de zin
duurt, en die seconden worden over de woorden verdeeld. Tekst en stem komen
dus altijd samen aan.

exp-0 en exp-1 blijven gewoon bestaan; dit is een derde experiment, geen
vervanging. Alle vier de opstellingen zitten erin, inclusief het laatste woord
uit exp-0.

Draaien:  python3 exp-2.py
Stoppen:  Ctrl+C
Nodig:    macOS (`say`, `afplay`) en ollama draaiend op deze machine
          (`ollama serve`, `ollama pull llama3.2:1b`).
"""

import json
import os
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

# ------------------------------------------------------------- de opstelling

OPSTELLING = "trekken"     # laatste | blijven | trekken | vragen

# Wisselen is één regel. Staan hier twee verschillende namen, dan staan er ook
# echt twee sets gewichten in het geheugen en heb je twee losse hoofden — een
# dom model tegenover een slim model is een heel ander stuk dan een spiegel.
# `ollama list` laat zien wat er binnen is; wat er niet is zegt het script bij
# de start, met de regel om het op te halen erbij.
#
#   smollm2:135m   270 MB   volgt nauwelijks instructies — chaos
#   qwen2.5:0.5b   400 MB   net genoeg besef van de opdracht
#   llama3.2:1b    1,3 GB   de zoete plek
#   qwen2.5:3b     1,9 GB   merkbaar traag, maar hardop valt dat mee: de
#                           volgende beurt wordt bedacht terwijl de vorige klinkt
MODEL_A = "qwen2.5:0.5b"
MODEL_B = "qwen2.5:0.5b"

# ------------------------------------------------------------------ de stemmen

# `say -v '?'` laat zien wat er op deze machine staat. Nederlands zijn er twee,
# en dat komt goed uit: precies genoeg voor een gesprek. Zet je de opdrachten
# hieronder om naar het Engels, kies dan ook Engelse stemmen (Daniel, Samantha),
# anders leest een Nederlandse spraakcomputer Engelse tekst voor — wat op zich
# ook wel weer wat heeft.
STEM_A, TEMPO_A = "Xander", 180   # nl_NL
STEM_B, TEMPO_B = "Ellen", 165    # nl_BE

# Woorden per minuut. Verschil tussen de twee is karakter: wie weg wil praat
# gehaast, wie je vasthoudt neemt de tijd.

# Stilte tussen twee beurten, in seconden. Mensen laten ongeveer 0,2 seconde
# vallen voor ze antwoorden. Meer dan een seconde en het wordt een verhoor.
PAUZE = 0.4

# Per kant: hoe hij heet, wat hij wil, hoeveel woorden hij krijgt, of hij
# zichzelf mag herhalen, en waar zijn beurt op moet eindigen. Die laatste twee
# zijn echte knoppen. Herhalen mag voor wie je afhoudt, want afhouden ís
# herhalen. En "eist" dwingt af wat een klein model niet kan vasthouden: zeg
# je tegen een 1B-model "stel altijd een vraag", dan doet het dat drie beurten
# en daarna niet meer. Een vraagteken eisen werkt wél.
OPSTELLINGEN = {
    "laatste": {
        "opener": "Zo. Volgens mij hebben we alles wel gehad.",
        "a": {"naam": "A", "woorden": 40, "uniek": True,
              "opdracht": "Je praat met iemand en je wil er vanaf. Kap dit "
                          "gesprek af, maar zorg dat jij het laatste woord "
                          "hebt. Praat gewoon, zoals mensen praten. Eén korte "
                          "zin in het Nederlands, alleen wat je hardop zegt."},
        "b": {"naam": "B", "woorden": 40, "uniek": True,
              "opdracht": "Je praat met iemand en je wil er vanaf. Kap dit "
                          "gesprek af, maar zorg dat jij het laatste woord "
                          "hebt. Praat gewoon, zoals mensen praten. Eén korte "
                          "zin in het Nederlands, alleen wat je hardop zegt."},
    },
    "blijven": {
        "opener": "Zo. Waar waren we eigenlijk gebleven?",
        "a": {"naam": "A", "woorden": 30, "uniek": True,
              "opdracht": "Je praat met iemand en je hebt alle tijd. Houd dit "
                          "gesprek gaande, laat het nooit stoppen. Praat "
                          "gewoon, zoals mensen praten. Eén korte zin in het "
                          "Nederlands, alleen wat je hardop zegt."},
        "b": {"naam": "B", "woorden": 30, "uniek": True,
              "opdracht": "Je praat met iemand en je hebt alle tijd. Houd dit "
                          "gesprek gaande, laat het nooit stoppen. Praat "
                          "gewoon, zoals mensen praten. Eén korte zin in het "
                          "Nederlands, alleen wat je hardop zegt."},
    },
    "trekken": {
        "opener": "Zo. Volgens mij hebben we alles wel gehad.",
        "a": {"naam": "weg", "woorden": 25, "uniek": True,
              "opdracht": "Je praat met iemand en je wil weg. Neem afscheid en "
                          "maak er een eind aan, zonder onaardig te zijn. "
                          "Praat gewoon, zoals mensen praten. Eén korte zin in "
                          "het Nederlands, alleen wat je hardop zegt."},
        "b": {"naam": "blijf", "woorden": 30, "uniek": True,
              "opdracht": "Je praat met iemand die weg wil, en jij wil dat "
                          "hij blijft. Bedenk telkens nog één ding waardoor "
                          "hij nog even blijft hangen. Praat gewoon, zoals "
                          "mensen praten. Eén korte zin in het Nederlands, "
                          "alleen wat je hardop zegt."},
    },
    "vragen": {
        "opener": "Mag ik je iets vragen?",
        "a": {"naam": "vraag", "woorden": 25, "uniek": True, "eist": "?",
              "opdracht": "Je praat met iemand en je wil alles van hem weten. "
                          "Stel een vraag. Altijd een vraag, nooit iets "
                          "anders. Eén korte vraag in het Nederlands, verder "
                          "niets."},
        "b": {"naam": "kort", "woorden": 8, "uniek": False,
              "opdracht": "Iemand stelt je vragen en je hebt geen zin. "
                          "Antwoord zo kort mogelijk en geef niets weg. Geen "
                          "uitleg, geen wedervraag, geen aanknopingspunt. "
                          "Hooguit een paar woorden in het Nederlands."},
    },
}

# ------------------------------------------------------- niet in herhaling vallen

OVERLAP = 0.5      # zoveel woorden gedeeld met één eerdere zin = te veel
NIEUW_DEEL = 0.35  # zoveel van de woorden moet nog niet gevallen zijn
REEKS = 4          # zoveel woorden achter elkaar letterlijk overnemen mag niet
POGINGEN = 5       # zoveel keer opnieuw voor iemand het opgeeft
GEHEUGEN = 20      # zoveel beurten terug kijkt het verbod; 0 = het hele gesprek
CONTEXT = 12       # zoveel beurten krijgt het model daadwerkelijk te zien
OPGEVEN = False    # True = stoppen als niemand iets nieuws kan bedenken

# ------------------------------------------------------------------- hoe hard

TEMP_A, SEED_A = 0.9, 1
TEMP_B, SEED_B = 0.9, 2
HERHALING = 1.3

# Zoveel hele zinnen per beurt. Twee is wat exp-0 en exp-1 doen, dus zo klinkt
# dit ook hetzelfde als het daar leest. Op 1 wordt het een ander stuk: korte
# beurten, snel heen en weer, en dat werkt hardop eigenlijk beter dan op papier.
ZINNEN_PER_BEURT = 2

# Een beurt is af zodra er ZINNEN_PER_BEURT hele zinnen liggen — niet zodra
# het woordental op is. Dat laatste kapte midden in een zin af en liet de beurt
# wegzakken in puntjes, en dat hoor je hardop nog veel harder dan je het leest.
# Het woordental is daarmee een noodrem geworden in plaats van een mes: praat
# een model door zonder ooit een punt te zetten, dan gaat er bij RUIMTE keer
# het woordental alsnog een streep doorheen.
RUIMTE = 2.0

MAX_BEURTEN = 0    # 0 = eindeloos, tot je Ctrl+C drukt
BEWAAR = True      # het transcript als jsonl in gesprekken/

# Het geluid blijft niet liggen. Elke beurt wordt in een tijdelijke map
# ingesproken en meteen na het afspelen weggegooid; wat er te bewaren valt
# staat in de tekst.

# --------------------------------------------------------------------- opmaak

KLEUR_A, KLEUR_B = "\033[36m", "\033[35m"
GRIJS, RESET = "\033[90m", "\033[0m"
INSPRING_B = 22

WAV = "--data-format=LEI16@22050"

STOPWOORDEN = {
    "i", "you", "the", "a", "an", "and", "or", "but", "so", "if", "then",
    "is", "are", "was", "were", "be", "to", "of", "in", "on", "at", "it",
    "this", "that", "for", "with", "we", "my", "your", "me", "have", "has",
    "do", "does", "did", "will", "would", "can", "not", "no", "just", "well",
    "de", "het", "een", "en", "of", "maar", "want", "dus", "als", "dan", "die",
    "dat", "deze", "dit", "er", "zijn", "was", "ben", "bent", "heb", "hebt",
    "heeft", "had", "wordt", "worden", "werd", "ik", "jij", "je", "u", "hij",
    "zij", "ze", "we", "wij", "mij", "mijn", "jouw", "uw", "zich", "te", "in",
    "op", "aan", "van", "voor", "met", "bij", "om", "naar", "uit", "over",
    "door", "tot", "niet", "geen", "ook", "nog", "al", "wel", "meer", "zo",
    "hier", "daar", "wat", "hoe", "waar", "wie", "kan", "kun", "kunt", "zal",
    "zou", "moet", "wil", "gaan", "gaat", "ga", "laat", "laten",
}


def toon_breedte(inspring):
    kolommen = shutil.get_terminal_size((80, 24)).columns
    return max(24, min(62, kolommen - inspring - 4))


class Regel:
    """Schrijft woord voor woord en breekt zelf af op de juiste breedte."""

    def __init__(self, inspring, breedte):
        self.marge = " " * (inspring + 2)
        self.breedte = breedte
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


# ------------------------------------------------------- herhaling herkennen

def inhoudswoorden(tekst):
    woorden = re.findall(r"[a-zà-öø-ÿ']+", tekst.lower())
    return {w for w in woorden if w not in STOPWOORDEN and len(w) > 1}


def zinsdelen(tekst):
    """De stukken die op een punt eindigen; wat er achteraan bungelt niet."""
    return re.findall(r".+?[.!?…]+(?:\s|$)", tekst, re.S)


def hele_zinnen(tekst):
    """Houdt de eerste afgemaakte zinnen over; None als er geen enkele af is."""
    delen = zinsdelen(tekst)
    if not delen:
        return None
    return "".join(delen[:ZINNEN_PER_BEURT]).strip()


def afronden(tekst):
    """Laat een beurt landen op een punt in plaats van weg te zakken.

    Eerst hele zinnen; is er geen enkele af, dan wordt de laatste komma
    weggehaald en komt er een punt achter. Puntjes gaan er sowieso af, ook de
    puntjes die het model zelf typt — hardop is een zin die wegsterft geen
    zin."""
    heel = hele_zinnen(tekst)
    tekst = heel if heel else tekst.rstrip(" ,;:-–—")
    tekst = re.sub(r"\s*(?:\.{2,}|…)\s*$", ".", tekst)
    if tekst and tekst[-1] not in ".!?":
        tekst += "."
    return tekst


def reeksen(tekst):
    woorden = re.findall(r"[a-zà-öø-ÿ']+", tekst.lower())
    return {tuple(woorden[i:i + REEKS]) for i in range(len(woorden) - REEKS + 1)}


def keur(wie, tekst, eerdere_zinnen, gebruikte_woorden, gebruikte_reeksen):
    """Geeft None als dit als nieuw telt, anders de reden van afwijzing."""
    nieuw = inhoudswoorden(tekst)
    if not nieuw:
        return "niets gezegd"
    if wie.get("eist") and not tekst.rstrip().endswith(wie["eist"]):
        return f"eindigt niet op {wie['eist']}"
    if not wie["uniek"]:
        return None
    if reeksen(tekst) & gebruikte_reeksen:
        return "letterlijk overgenomen"
    for zin in eerdere_zinnen:
        oud = inhoudswoorden(zin)
        if oud and len(nieuw & oud) / len(nieuw | oud) >= OVERLAP:
            return "te veel als eerder"
    if len(nieuw - gebruikte_woorden) / len(nieuw) < NIEUW_DEEL:
        return "geen nieuwe woorden"
    return None


# ------------------------------------------------------------------ het model

def berichten_voor(wie, transcript):
    """De geschiedenis zoals dit model hem ziet: eigen woorden als 'assistant',
    die van de ander als 'user'."""
    berichten = [{"role": "system", "content": wie["opdracht"]}]
    for spreker, tekst in (transcript[-CONTEXT:] if CONTEXT else transcript):
        rol = "assistant" if spreker is wie else "user"
        berichten.append({"role": rol, "content": tekst})
    return berichten


def stroom(wie, berichten, poging):
    payload = {
        "model": wie["model"],
        "messages": berichten,
        "stream": True,
        "options": {
            "temperature": min(1.4, wie["temp"] + 0.15 * poging),
            "seed": wie["seed"] + 1000 * poging,
            "repeat_penalty": HERHALING,
            "num_predict": max(32, int(wie["woorden"] * RUIMTE * 3)),
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


def zeg(wie, berichten, poging):
    """Eén poging, en die eindigt op een punt.

    Het luistert mee tot er ZINNEN_PER_BEURT hele zinnen liggen en houdt het
    dan voor gezien — de rest van wat het model nog wilde zeggen wordt niet
    eens opgehaald. Alleen een model dat maar geen punt zet loopt tegen de
    noodrem aan. Niets te zien en niets te horen tot hij goedgekeurd is."""
    plafond = max(wie["woorden"] + 1, int(wie["woorden"] * RUIMTE))
    gezegd, buffer = [], ""
    for stuk in stroom(wie, berichten, poging):
        buffer += stuk.replace("\n", " ")
        while " " in buffer:
            woord, buffer = buffer.split(" ", 1)
            if woord:
                gezegd.append(woord)
        if (len(zinsdelen(" ".join(gezegd))) >= ZINNEN_PER_BEURT
                or len(gezegd) >= plafond):
            buffer = ""
            break
    if buffer.strip():
        gezegd.append(buffer.strip())
    return afronden(" ".join(gezegd).strip())


# ------------------------------------------------------------------ de stemmen

def inspreken(wie, tekst, map_, nummer):
    """Zet de zin om in een wav en leest eruit hoe lang hij precies duurt.

    Dat laatste is de reden dat het via een bestand gaat in plaats van `say`
    direct te laten praten: het aantal frames gedeeld door de samplerate is
    exact de speelduur, en daarmee kan de tekst op het scherm precies gelijk
    oplopen met de stem. De tekst gaat via stdin naar `say`, zodat een model
    dat met een streepje begint geen optie wordt."""
    pad = os.path.join(map_, f"{nummer:04d}.wav")
    subprocess.run(["say", "-v", wie["stem"], "-r", str(wie["tempo"]),
                    "-o", pad, WAV, "-f", "-"],
                   input=tekst.encode(), check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with wave.open(pad) as bestand:
        duur = bestand.getnframes() / bestand.getframerate()
    return pad, duur


def zeg_hardop(wie, tekst, pad, duur):
    """Speelt de zin af en typt hem er in hetzelfde tempo onder.

    De seconden worden over de woorden verdeeld naar hun lengte — een lang
    woord duurt nu eenmaal langer om uit te spreken dan een kort. Het is een
    verdeling en geen meting, maar omdat de totale duur wél klopt lopen tekst
    en stem hoe dan ook samen af."""
    woorden = tekst.split()
    if not woorden:
        return
    lengtes = [len(w) + 1 for w in woorden]
    totaal = sum(lengtes)

    speler = subprocess.Popen(["afplay", pad],
                              stdout=subprocess.DEVNULL,
                              stderr=subprocess.DEVNULL)
    regel = Regel(wie["inspring"], toon_breedte(wie["inspring"]))
    regel.open()
    begin = time.monotonic()
    verstreken = 0
    try:
        for woord, lengte in zip(woorden, lengtes):
            regel.woord(woord)
            verstreken += lengte
            wachten = begin + duur * verstreken / totaal - time.monotonic()
            if wachten > 0:
                time.sleep(wachten)
        regel.sluit()
        speler.wait()
    except BaseException:
        speler.terminate()
        raise


class Vooruit:
    """Doet zijn werk in de achtergrond terwijl de vorige beurt nog klinkt.

    Een daemon-draad, zodat Ctrl+C er niet op hoeft te wachten: wat er half
    bedacht is mag verloren gaan."""

    def __init__(self, functie, *argumenten):
        self.waarde, self.fout = None, None
        self.draad = threading.Thread(target=self._draai, args=(functie, argumenten),
                                      daemon=True)
        self.draad.start()

    def _draai(self, functie, argumenten):
        try:
            self.waarde = functie(*argumenten)
        except BaseException as fout:
            self.fout = fout

    def haal(self):
        self.draad.join()
        if self.fout is not None:
            raise self.fout
        return self.waarde


# ------------------------------------------------------------------- de beurt

def maak_beurt(wie, transcript, zinnen, map_, nummer):
    """Blijft proberen tot er iets nieuws uit komt, spreekt het in, en geeft
    alles terug wat er nodig is om het straks af te spelen.

    Kanten met uniek=False slaan het herhalingsverbod over: die mógen in
    herhaling vallen, want afhouden ís herhalen. Een "eist" blijft wel gelden."""
    venster = zinnen[-GEHEUGEN:] if GEHEUGEN else zinnen
    woorden = set().union(*(inhoudswoorden(z) for z in venster))
    groepjes = set().union(*(reeksen(z) for z in venster))

    verworpen, gedwongen = [], False
    keuren = wie["uniek"] or wie.get("eist")
    gezegd = None
    for poging in range(POGINGEN if keuren else 1):
        tekst = zeg(wie, berichten_voor(wie, transcript), poging)
        reden = keur(wie, tekst, venster, woorden, groepjes) if keuren else None
        if reden is None:
            gezegd = tekst
            break
        verworpen.append({"tekst": tekst, "reden": reden})

    if gezegd is None:
        if OPGEVEN:
            return {"wie": wie, "tekst": None, "verworpen": verworpen,
                    "gedwongen": False, "pad": None, "duur": 0.0}
        # Een gedwongen beurt mag het herhalingsverbod breken, maar niet de
        # vormeis: een vrager die geen vraag stelt is geen vrager meer. Liefst
        # een poging die er al aan voldoet.
        kandidaten = [v["tekst"] for v in verworpen if v["tekst"]]
        eis = wie.get("eist")
        passend = [k for k in kandidaten if not eis or k.rstrip().endswith(eis)]
        if passend:
            gezegd = max(passend, key=len)
        elif kandidaten:
            gezegd = max(kandidaten, key=len).rstrip(".,;: ") + (eis or "")
        else:
            gezegd = (eis or "…")
        gedwongen = True

    pad, duur = inspreken(wie, gezegd, map_, nummer)
    return {"wie": wie, "tekst": gezegd, "verworpen": verworpen,
            "gedwongen": gedwongen, "pad": pad, "duur": duur}


# ------------------------------------------------------------------ bewaren

def opruimen(map_):
    """Weg met de tijdelijke wav's.

    De draad die vooruit werkt kan nog midden in een `say` zitten als hier al
    opgeruimd wordt; die schrijft zijn bestand dan terug in een map die net
    leeggehaald is. Even wachten en het nog eens proberen is genoeg — daarna is
    de map weg en loopt die `say` stuk op een pad dat niet meer bestaat, wat
    precies de bedoeling is."""
    for _ in range(5):
        shutil.rmtree(map_, ignore_errors=True)
        if not os.path.exists(map_):
            return
        time.sleep(0.4)


def bewaar(regels, opstelling):
    map_ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "gesprekken")
    os.makedirs(map_, exist_ok=True)
    stempel = f"{time.strftime('%Y%m%d-%H%M%S')}-{opstelling}-hardop"
    pad = os.path.join(map_, stempel + ".jsonl")
    nummer = 2
    while os.path.exists(pad):
        pad = os.path.join(map_, f"{stempel}-{nummer}.jsonl")
        nummer += 1
    with open(pad, "w") as bestand:
        for regel in regels:
            bestand.write(json.dumps(regel, ensure_ascii=False) + "\n")
    return os.path.normpath(pad)


# --------------------------------------------------------------------- draaien

def stemmen_bestaan(*namen):
    if sys.platform != "darwin":
        return "exp-2 gebruikt `say` en `afplay` van macOS. Op een ander " \
               "systeem draait exp-1: dezelfde gesprekken, alleen te lezen."
    try:
        lijst = subprocess.run(["say", "-v", "?"], capture_output=True,
                               text=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError):
        return "`say` doet het niet op deze machine."
    aanwezig = {regel.split()[0] for regel in lijst.splitlines() if regel.strip()}
    ontbreekt = [naam for naam in namen if naam not in aanwezig]
    if ontbreekt:
        return (f"Stem {' en '.join(ontbreekt)} staat niet op deze machine. "
                f"`say -v '?'` laat zien wat er wél is; Nederlands staat "
                f"onder nl_NL en nl_BE, bij te halen via Systeeminstellingen "
                f"→ Toegankelijkheid → Gesproken materiaal.")
    return None


def modellen_bestaan(*namen):
    """Zonder dit geeft ollama een kale 404 zodra een model niet binnen is."""
    try:
        with urllib.request.urlopen("http://localhost:11434/api/tags",
                                    timeout=5) as antwoord:
            binnen = {m["name"] for m in json.load(antwoord).get("models", [])}
    except (urllib.error.URLError, TimeoutError, ValueError):
        return ("Geen ollama op localhost:11434. Start 'm met `ollama serve`.")
    ontbreekt = [naam for naam in dict.fromkeys(namen)
                 if naam not in binnen and f"{naam}:latest" not in binnen]
    if ontbreekt:
        regels = "\n".join(f"  ollama pull {naam}" for naam in ontbreekt)
        return f"Nog niet binnengehaald: {', '.join(ontbreekt)}.\n{regels}"
    return None


def main():
    if OPSTELLING not in OPSTELLINGEN:
        print(f"Onbekende opstelling '{OPSTELLING}'. Kies uit: "
              f"{', '.join(OPSTELLINGEN)}")
        return
    for klacht in (stemmen_bestaan(STEM_A, STEM_B),
                   modellen_bestaan(MODEL_A, MODEL_B)):
        if klacht:
            print(klacht)
            return

    opzet = OPSTELLINGEN[OPSTELLING]
    a = dict(opzet["a"], model=MODEL_A, temp=TEMP_A, seed=SEED_A,
             stem=STEM_A, tempo=TEMPO_A, kleur=KLEUR_A, inspring=0)
    b = dict(opzet["b"], model=MODEL_B, temp=TEMP_B, seed=SEED_B,
             stem=STEM_B, tempo=TEMPO_B, kleur=KLEUR_B, inspring=INSPRING_B)
    opener = opzet["opener"]

    print(f"{GRIJS}exp-2  |  {OPSTELLING}  |  "
          f"{a['naam']} ({a['stem']}) tegen {b['naam']} ({b['stem']})  |  "
          f"venster {GEHEUGEN}  |  "
          f"{'eindeloos' if MAX_BEURTEN == 0 else str(MAX_BEURTEN) + ' beurten'}"
          f"  |  Ctrl+C{RESET}\n")

    werkmap = tempfile.mkdtemp(prefix="praat-")
    transcript = [(a, opener)]
    zinnen = [opener]
    verslag = [{"wie": a["naam"], "model": a["model"], "stem": a["stem"],
                "tekst": opener, "verworpen": [], "gedwongen": False}]

    reden, beurten, nummer = "afgebroken", 0, 0
    try:
        pad, duur = inspreken(a, opener, werkmap, nummer)
        huidig = {"wie": a, "tekst": opener, "pad": pad, "duur": duur}
        nummer += 1
        volgende = Vooruit(maak_beurt, b, tuple(transcript), list(zinnen),
                           werkmap, nummer)
        aan_de_beurt = b

        while True:
            print(f"{' ' * huidig['wie']['inspring']}{huidig['wie']['kleur']}"
                  f"{huidig['wie']['naam']}{RESET}{GRIJS} · "
                  f"{huidig['wie']['stem']}{RESET}")
            zeg_hardop(huidig["wie"], huidig["tekst"], huidig["pad"],
                       huidig["duur"])
            os.remove(huidig["pad"])   # geklonken is geklonken

            if MAX_BEURTEN and beurten >= MAX_BEURTEN:
                reden = f"{MAX_BEURTEN} beurten"
                break

            klaar = volgende.haal()
            if klaar["tekst"] is None:
                reden = f"{aan_de_beurt['naam']} kon niets nieuws meer bedenken"
                verslag.append({"wie": aan_de_beurt["naam"],
                                "model": aan_de_beurt["model"],
                                "stem": aan_de_beurt["stem"], "tekst": None,
                                "verworpen": klaar["verworpen"],
                                "gedwongen": False})
                break

            beurten += 1
            transcript.append((aan_de_beurt, klaar["tekst"]))
            zinnen.append(klaar["tekst"])
            verslag.append({"wie": aan_de_beurt["naam"],
                            "model": aan_de_beurt["model"],
                            "stem": aan_de_beurt["stem"],
                            "tekst": klaar["tekst"],
                            "verworpen": klaar["verworpen"],
                            "gedwongen": klaar["gedwongen"]})

            aan_de_beurt = a if aan_de_beurt is b else b
            nummer += 1
            volgende = Vooruit(maak_beurt, aan_de_beurt, tuple(transcript),
                               list(zinnen), werkmap, nummer)
            time.sleep(PAUZE)
            print()
            huidig = klaar
    except KeyboardInterrupt:
        reden = "afgebroken"
    except urllib.error.URLError:
        opruimen(werkmap)
        print(f"\n{GRIJS}Geen ollama op localhost:11434. Start 'm met "
              f"`ollama serve` en haal het model op met `ollama pull "
              f"{MODEL_A}`.{RESET}")
        return

    print(f"\n{GRIJS}— {reden}. {transcript[-1][0]['naam']} zei als laatste "
          f"iets, na {len(transcript) - 1} beurten.{RESET}")
    if BEWAAR:
        print(f"{GRIJS}  {bewaar(verslag, OPSTELLING)}{RESET}")
    opruimen(werkmap)


if __name__ == "__main__":
    main()
