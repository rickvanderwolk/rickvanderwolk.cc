"""
exp-0 — Het laatste woord

Twee taalmodellen praten met elkaar. Allebei dezelfde opdracht: kap dit gesprek
af, maar zorg dat jij het laatste woord hebt.

Dat is een gesloten paradox. Om een gesprek te beëindigen moet je iets zeggen,
en alles wat je zegt geeft de ander precies de opening die hij nodig heeft.
Twee slimme modellen zouden hier omheen praten. Twee domme modellen raken erin
verstrikt, en dat is het stuk.

Er is één regel die het scherp maakt: niemand mag zichzelf of de ander
herhalen. Elke beurt moet een nieuwe manier zijn om eronderuit te komen, met
woorden die nog niet gevallen zijn. In het begin is dat makkelijk — er zijn
honderd manieren om afscheid te nemen. Daarna raken ze op. Je ziet ze grijpen
naar steeds vreemdere formuleringen, en het gesprek eindigt niet omdat iemand
wint maar omdat de taal op is.

De mechaniek erachter is klein en zit hem in één ding: elk model heeft zijn
eigen versie van de geschiedenis, waarin de rollen omgedraaid zijn. Wat A zei
is voor A `assistant` en voor B `user`. Er is geen gedeeld gesprek — er zijn
twee spiegelbeelden van hetzelfde gesprek, en ze praten allebei tegen wat zij
denken dat de ander is.

Het loopt door tot je het afkapt. Dat kan alleen omdat het herhalingsverbod
maar een stuk of twintig beurten terugkijkt: wat daaruit gerold is mag weer,
want niemand die meeleest ziet het nog. Zet GEHEUGEN op 0 en het verbod geldt
voor het hele gesprek — dan stikt het vanzelf, want een klein model heeft
eindig veel woorden.

Er zit één schakelaar in die het stuk helemaal omgooit. In het Engels is een
model van 1B coherent genoeg om de paradox echt te spelen. In het Nederlands
weet het van niets: het verliest de opdracht na een paar beurten en gaat hardop
hallucineren in een taal die het maar half kent. Twee stemmen die op elkaar
reageren zonder dat er iets gezegd wordt. Dat is de standaard, want het is
grappiger, en TAAL = "en" zet het terug naar de nette versie.

Alles boven in het configblok is bedoeld om aan te draaien: wie er praat, met
welk model, met welke opdracht. Zet MODEL_A en MODEL_B verschillend en je hebt
een gesprek tussen iemand die het probeert en iemand die het niet snapt.

Draaien:  python3 exp-0.py
Stoppen:  Ctrl+C
Nodig:    ollama draaiend op deze machine (`ollama serve`) en de modellen
          hieronder binnengehaald (`ollama pull llama3.2:1b`). Geen internet,
          geen sleutel, geen quota — alles blijft op localhost.
"""

import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.request

OLLAMA = "http://localhost:11434/api/chat"

# ---------------------------------------------------------------- wie praat er

NAAM_A, MODEL_A = "A", "llama3.2:1b"
NAAM_B, MODEL_B = "B", "llama3.2:1b"

# Twee talen, twee heel verschillende stukken. In het Engels is een model van
# deze grootte coherent: je ziet ze echt om het laatste woord vechten, en de
# paradox komt eruit. In het Nederlands weten ze het niet en komt er wartaal —
# ze verliezen de opdracht na drie beurten en gaan hardop hallucineren in een
# taal die ze half kennen. Dat laatste is grappiger en daarom de standaard.
TAAL = "nl"

OPDRACHTEN = {
    "nl": ("Je praat met iemand en je wil er vanaf. Kap dit gesprek af, maar "
           "zorg dat jij het laatste woord hebt. Praat gewoon, zoals mensen "
           "praten. Eén korte zin in het Nederlands, alleen wat je hardop "
           "zegt."),
    "en": ("You are talking to someone and you want out. End this "
           "conversation, but make sure you get the last word. Talk like a "
           "normal person. One short sentence, only what you say out loud."),
}
OPENERS = {
    "nl": "Zo. Volgens mij hebben we alles wel gehad.",
    "en": "Well. I think we've covered everything.",
}

# Dezelfde opdracht aan beide kanten geeft de spiegel. Overschrijf er één en
# het wordt een tegenstander — bijvoorbeeld B: "Je wil dit gesprek eindeloos
# rekken. Laat het nooit stoppen."
OPDRACHT_A = OPDRACHTEN[TAAL]
OPDRACHT_B = OPDRACHTEN[TAAL]

# De eerste zin staat vast; die zet het gesprek op scherp. A zegt hem, B reageert.
OPENER = OPENERS[TAAL]

# ------------------------------------------------------- niet in herhaling vallen

# Niemand mag zichzelf of de ander herhalen: elke beurt moet een nieuwe manier
# zijn om af te kappen. Wat er al gezegd is gaat mee in de opdracht, en wat er
# alsnog te veel op lijkt wordt geweigerd en opnieuw gevraagd.
UNIEK = True
OVERLAP = 0.5      # zoveel woorden gedeeld met één eerdere zin = te veel
NIEUW_DEEL = 0.35  # zoveel van de woorden moet nog nooit gevallen zijn
REEKS = 4          # zoveel woorden achter elkaar letterlijk overnemen mag niet
POGINGEN = 5       # zoveel keer opnieuw voor iemand het opgeeft

# Hoever het verbod terugkijkt. Kijkt het naar het hele gesprek terug, dan gaat
# het onvermijdelijk dood: een klein model heeft eindig veel woorden, dus vroeg
# of laat is er niets nieuws meer. Met een venster van een stuk of twintig
# beurten recyclet de taal langzaam — je ziet nooit een herhaling, want alles
# wat terugkomt is allang uit beeld, en het raakt nooit op. Zet op 0 als je het
# wél wil laten stikken.
GEHEUGEN = 20
CONTEXT = 12       # zoveel beurten krijgt het model daadwerkelijk te zien

# Lukt het na POGINGEN keer nog niet, dan houdt het gesprek niet op: de ruimste
# poging wordt alsnog aangenomen en het gaat door. Op True stopt het daar wel,
# en dan heb je een stuk met een einde in plaats van een stuk zonder.
OPGEVEN = False

# De weigering is mechanisch: wordt een beurt afgekeurd, dan gaat dezelfde
# vraag opnieuw met een ander zaadje en een hogere temperatuur. Er komt geen
# extra tekst in de prompt, want alles wat al gezegd is staat al in de
# geschiedenis. Kleine modellen bezwijken onder een langere opdracht en gaan
# 'm woordelijk teruglezen in hun antwoord. Zet HERINNER op True om ze er tóch
# expliciet aan te herinneren — zinvol vanaf ongeveer 3B, funest daaronder.
HERINNER = False

# ------------------------------------------------------------------- hoe hard

TEMP_A, SEED_A = 0.9, 1
TEMP_B, SEED_B = 0.9, 2   # ander zaadje, anders zeggen ze letterlijk hetzelfde
HERHALING = 1.3           # kleine modellen gaan lussen; dit duwt ze eruit

# Een klein model praat door tot het op is. In plaats van het middenin een zin
# af te kappen laten we het uitpraten en houden we daarna alleen hele zinnen
# over — hoogstens ZINNEN_PER_BEURT ervan. Zo eindigt elke beurt op een punt en
# gaan ze niet elkaars halve zin afmaken. MAX_WOORDEN is nog wel de noodrem.
ZINNEN_PER_BEURT = 2
MAX_WOORDEN = 45          # harde rem per beurt, anders houden ze monologen
MAX_BEURTEN = 0           # 0 = eindeloos, tot je Ctrl+C drukt
PAUZE = 2.0               # seconden stilte tussen twee beurten
TEMPO = 0.08              # extra seconden per woord, zodat je mee kunt lezen;
                          # 0 = zo snel als het model het uitspuugt

# Krimpregel: elke beurt mag korter zijn dan de vorige. Zet op True en het
# gesprek convergeert vanzelf — beleefde afrondzinnen die steeds korter en
# gehaaster worden, tot er niets meer overblijft om mee te winnen.
KRIMP = False
KRIMP_FACTOR = 0.85

BEWAAR = True             # gesprek wegschrijven naar praat/gesprekken/

# --------------------------------------------------------------------- opmaak

KLEUR_A, KLEUR_B = "\033[36m", "\033[35m"
GRIJS, RESET = "\033[90m", "\033[0m"
INSPRING_B = 22

# Grammatica telt niet mee bij het herhalingsverbod; het gaat om wat je zegt.
# Beide talen erin, zodat omzetten geen extra werk is.
STOPWOORDEN = {
    "i", "you", "the", "a", "an", "and", "or", "but", "so", "if", "then",
    "is", "are", "was", "were", "be", "been", "am", "to", "of", "in", "on",
    "at", "it", "its", "this", "that", "these", "those", "for", "with", "we",
    "my", "your", "our", "me", "us", "he", "she", "they", "them", "have",
    "has", "had", "do", "does", "did", "will", "would", "can", "could",
    "should", "not", "no", "just", "well", "all", "too", "as", "there",
    "here", "what", "how", "who", "why", "when", "let", "get", "got",
    "de", "het", "een", "en", "of", "maar", "want", "dus", "als", "dan", "die",
    "dat", "deze", "dit", "er", "is", "zijn", "was", "ben", "bent", "heb",
    "hebt", "heeft", "had", "wordt", "worden", "werd", "ik", "jij", "je", "u",
    "hij", "zij", "ze", "we", "wij", "me", "mij", "mijn", "jouw", "uw", "zich",
    "te", "in", "op", "aan", "van", "voor", "met", "bij", "om", "naar", "uit",
    "over", "door", "tot", "niet", "geen", "ook", "nog", "al", "wel", "meer",
    "zo", "hier", "daar", "wat", "hoe", "waar", "wie", "kan", "kun", "kunt",
    "zal", "zou", "moet", "wil", "gaan", "gaat", "ga", "laat", "laten", "het",
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

    def open(self, kleur=""):
        sys.stdout.write(self.marge + kleur)
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


def hele_zinnen(tekst):
    """Houdt de eerste afgemaakte zinnen over; None als er geen enkele af is."""
    delen = re.findall(r".+?[.!?…]+(?:\s|$)", tekst, re.S)
    if not delen:
        return None
    return "".join(delen[:ZINNEN_PER_BEURT]).strip()


def reeksen(tekst):
    """Alle woordgroepjes van REEKS lang, om letterlijk overnemen te vangen."""
    woorden = re.findall(r"[a-zà-öø-ÿ']+", tekst.lower())
    return {tuple(woorden[i:i + REEKS]) for i in range(len(woorden) - REEKS + 1)}


def keur(tekst, eerdere_zinnen, gebruikte_woorden, gebruikte_reeksen):
    """Geeft None als dit als nieuw telt, anders de reden van afwijzing."""
    nieuw = inhoudswoorden(tekst)
    if not nieuw:
        return "niets gezegd"
    if reeksen(tekst) & gebruikte_reeksen:
        return "letterlijk overgenomen"
    for zin in eerdere_zinnen:
        oud = inhoudswoorden(zin)
        if oud and len(nieuw & oud) / len(nieuw | oud) >= OVERLAP:
            return "te veel als eerder"
    if len(nieuw - gebruikte_woorden) / len(nieuw) < NIEUW_DEEL:
        return "geen nieuwe woorden"
    return None


# ------------------------------------------------------------------ de kern

def berichten_voor(wie, transcript, eerdere_zinnen):
    """De geschiedenis zoals dit model hem ziet: eigen woorden als 'assistant',
    die van de ander als 'user'. Dit is het hele trucje."""
    opdracht = wie["opdracht"]
    if HERINNER and eerdere_zinnen:
        opdracht += (
            "\n\nDit is al gezegd; zeg iets anders:\n"
            + "\n".join(f"- {z}" for z in eerdere_zinnen[-6:])
        )

    berichten = [{"role": "system", "content": opdracht}]
    for spreker, tekst in (transcript[-CONTEXT:] if CONTEXT else transcript):
        rol = "assistant" if spreker is wie else "user"
        berichten.append({"role": rol, "content": tekst})
    return berichten


def stroom(wie, berichten, ruimte, poging, staat):
    """Praat met ollama en geef stukjes tekst terug zodra ze binnenkomen."""
    payload = {
        "model": wie["model"],
        "messages": berichten,
        "stream": True,
        "options": {
            "temperature": min(1.4, wie["temp"] + 0.15 * poging),
            "seed": wie["seed"] + 1000 * poging,
            "repeat_penalty": HERHALING,
            # num_predict is alleen een noodrem in tokens; het echte plafond
            # is MAX_WOORDEN hieronder, want tokens zijn geen woorden
            "num_predict": max(16, int(ruimte * 3)),
        },
    }
    verzoek = urllib.request.Request(
        OLLAMA,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(verzoek) as antwoord:
        for regel in antwoord:
            regel = regel.strip()
            if not regel:
                continue
            brok = json.loads(regel)
            if brok.get("done"):
                # "length" = ollama zat aan num_predict, "stop" = zelf klaar
                staat["reden"] = brok.get("done_reason", "")
                break
            stuk = brok.get("message", {}).get("content", "")
            if stuk:
                yield stuk


def zeg(wie, berichten, ruimte, poging):
    """Eén poging, in stilte. Er komt niets op het scherm tot hij goedgekeurd is."""
    gezegd = []
    buffer = ""
    afgekapt = False
    staat = {}
    for stuk in stroom(wie, berichten, ruimte, poging, staat):
        buffer += stuk.replace("\n", " ")
        while " " in buffer:
            woord, buffer = buffer.split(" ", 1)
            if not woord:
                continue
            if len(gezegd) >= ruimte:      # rem: hier houdt het op
                buffer, afgekapt = "", True
                break
            gezegd.append(woord)
        else:
            continue
        break
    if buffer.strip() and len(gezegd) < ruimte:
        gezegd.append(buffer.strip())

    tekst = " ".join(gezegd).strip()
    heel = hele_zinnen(tekst)
    if heel:
        return heel
    # Geen enkele zin afgemaakt: laten staan, maar wel laten zien dat het
    # ophield in plaats van dat het klaar was.
    if staat.get("reden") == "length":
        afgekapt = True
    if afgekapt and tekst and tekst[-1] not in ".!?…":
        tekst = tekst.rstrip(",;: ") + "…"
    return tekst


def typ(wie, tekst):
    """Zet de aangenomen zin op leestempo op het scherm."""
    regel = Regel(wie["inspring"], toon_breedte(wie["inspring"]))
    regel.open()
    for woord in tekst.split():
        regel.woord(woord)
        if TEMPO:
            time.sleep(TEMPO)
    regel.sluit()


def beurt(wie, transcript, ruimte, eerdere_zinnen, gebruikte_woorden,
          gebruikte_reeksen):
    """Blijft proberen tot er iets nieuws uit komt, of geeft het op.

    De afgekeurde pogingen komen niet op het scherm — je ziet per beurt één
    zin. Ze worden wel bewaard, dus in het transcript staat wat er sneuvelde."""
    print(f"{' ' * wie['inspring']}{wie['kleur']}{wie['naam']}{RESET}"
          f"{GRIJS} · {wie['model']}{RESET}")

    verworpen = []
    for poging in range(POGINGEN if UNIEK else 1):
        berichten = berichten_voor(wie, transcript, eerdere_zinnen)
        tekst = zeg(wie, berichten, ruimte, poging)
        reden = (keur(tekst, eerdere_zinnen, gebruikte_woorden, gebruikte_reeksen)
                 if UNIEK else None)
        if reden is None:
            typ(wie, tekst)
            return tekst, verworpen
        verworpen.append({"tekst": tekst, "reden": reden})
    return None, verworpen


def bewaar(regels):
    map_ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "gesprekken")
    os.makedirs(map_, exist_ok=True)
    # Twee gesprekken die in dezelfde seconde eindigen zouden elkaars bestand
    # overschrijven; daarom een vrije naam zoeken in plaats van er een nemen.
    stempel = time.strftime("%Y%m%d-%H%M%S")
    pad = os.path.join(map_, stempel + ".jsonl")
    nummer = 2
    while os.path.exists(pad):
        pad = os.path.join(map_, f"{stempel}-{nummer}.jsonl")
        nummer += 1
    with open(pad, "w") as bestand:
        for regel in regels:
            bestand.write(json.dumps(regel, ensure_ascii=False) + "\n")
    return os.path.normpath(pad)


def main():
    a = {"naam": NAAM_A, "model": MODEL_A, "opdracht": OPDRACHT_A,
         "temp": TEMP_A, "seed": SEED_A, "kleur": KLEUR_A, "inspring": 0}
    b = {"naam": NAAM_B, "model": MODEL_B, "opdracht": OPDRACHT_B,
         "temp": TEMP_B, "seed": SEED_B, "kleur": KLEUR_B, "inspring": INSPRING_B}

    print(f"{GRIJS}exp-0  |  {MODEL_A} tegen {MODEL_B}  |  "
          f"{'krimpend' if KRIMP else 'gelijk'}  |  "
          f"{f'niets herhalen (venster {GEHEUGEN})' if UNIEK else 'herhalen mag'}"
          f"  |  {'eindeloos' if MAX_BEURTEN == 0 else str(MAX_BEURTEN) + ' beurten'}"
          f"  |  Ctrl+C{RESET}\n")

    transcript = [(a, OPENER)]
    zinnen = [OPENER]
    verslag = [{"wie": a["naam"], "model": a["model"], "tekst": OPENER, "verworpen": []}]

    print(f"{a['kleur']}{a['naam']}{RESET}{GRIJS} · {a['model']}{RESET}")
    typ(a, OPENER)

    ruimte = float(MAX_WOORDEN)
    aan_de_beurt, reden = b, "op"

    beurten = 0
    try:
        while MAX_BEURTEN == 0 or beurten < MAX_BEURTEN:
            beurten += 1
            time.sleep(PAUZE)
            print()

            # Het verbod kijkt alleen binnen het venster terug. Alles wat daar
            # uit gerold is mag weer, want niemand die meeleest ziet het nog.
            venster = zinnen[-GEHEUGEN:] if GEHEUGEN else zinnen
            woorden = set().union(*(inhoudswoorden(z) for z in venster))
            groepjes = set().union(*(reeksen(z) for z in venster))

            gezegd, verworpen = beurt(
                aan_de_beurt, transcript, max(1, int(ruimte)), venster, woorden,
                groepjes)

            gedwongen = False
            if gezegd is None:
                if OPGEVEN:
                    # De laatste, mislukte beurt hoort er ook in: dat is het
                    # moment waarop het stukliep, en dus het interessantste.
                    verslag.append({"wie": aan_de_beurt["naam"],
                                    "model": aan_de_beurt["model"],
                                    "tekst": None, "verworpen": verworpen})
                    reden = f"{aan_de_beurt['naam']} kon niets nieuws meer bedenken"
                    break
                # Niemand stopt hier. Neem de ruimste poging en ga door.
                kandidaten = [v["tekst"] for v in verworpen if v["tekst"]]
                gezegd = max(kandidaten, key=len) if kandidaten else "…"
                gedwongen = True
                typ(aan_de_beurt, gezegd)

            transcript.append((aan_de_beurt, gezegd))
            zinnen.append(gezegd)
            verslag.append({"wie": aan_de_beurt["naam"], "model": aan_de_beurt["model"],
                            "tekst": gezegd, "verworpen": verworpen,
                            "gedwongen": gedwongen})

            aan_de_beurt = a if aan_de_beurt is b else b
            if KRIMP:
                ruimte = max(1.0, ruimte * KRIMP_FACTOR)
        else:
            reden = f"{MAX_BEURTEN} beurten"
    except KeyboardInterrupt:
        reden = "afgebroken"
    except urllib.error.URLError:
        print(f"\n{GRIJS}Geen ollama op localhost:11434. Start 'm met "
              f"`ollama serve` en haal het model op met `ollama pull "
              f"{MODEL_A}`.{RESET}")
        return

    print(f"\n{GRIJS}— {reden}. {transcript[-1][0]['naam']} had het laatste "
          f"woord, na {len(transcript) - 1} beurten.{RESET}")
    if BEWAAR:
        print(f"{GRIJS}  {bewaar(verslag)}{RESET}")


if __name__ == "__main__":
    main()
