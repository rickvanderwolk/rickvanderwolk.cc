"""
exp-1 — Wie trekt er aan wie

Zelfde machine als exp-0, andere vraag. Daar kregen beide kanten dezelfde
onmogelijke opdracht en keek je naar de patstelling. Hier krijgen ze
verschillende opdrachten, en kijk je naar wat er tussen twee mensen ontstaat
die niet hetzelfde willen.

Drie opstellingen, te kiezen met OPSTELLING bovenin:

    blijven   Allebei willen ze doorpraten. Niemand hoeft ergens heen, dus er
              is ook geen reden om iets te zeggen. Ze houden elkaar op de been
              met steeds minder aanleiding.

    trekken   De een wil weg, de ander wil dat je blijft. Een touwtrekwedstrijd
              waarin de één beleefd naar de deur schuifelt en de ander telkens
              nog één ding bedenkt.

    vragen    De een stelt alleen maar vragen, de ander geeft korte antwoorden
              waar je niets mee kunt. De vrager moet elke beurt iets nieuws
              verzinnen; de antwoorder mag zich juist wél herhalen, want dat
              is precies wat afhouden is.

Elke kant heeft zijn eigen opdracht, zijn eigen ruimte om te praten en zijn
eigen regels. De rest werkt als in exp-0: eigen geschiedenis met omgedraaide
rollen, hele zinnen, en een herhalingsverbod dat een venster terugkijkt zodat
het eindeloos door kan.

Draaien:  python3 exp-1.py
Stoppen:  Ctrl+C
Nodig:    ollama draaiend (`ollama serve`) en het model binnengehaald
          (`ollama pull llama3.2:1b`). Alles blijft op localhost.
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

# ------------------------------------------------------------- de opstelling

OPSTELLING = "trekken"     # blijven | trekken | vragen

# Wisselen is één regel. Staan hier twee verschillende namen, dan staan er ook
# echt twee sets gewichten in het geheugen en heb je twee losse hoofden — een
# dom model tegenover een slim model is een heel ander stuk dan een spiegel.
# `ollama list` laat zien wat er binnen is; wat er niet is zegt het script bij
# de start, met de regel om het op te halen erbij.
MODEL_A = "llama3.2:1b"
MODEL_B = "llama3.2:1b"

# Per kant: hoe hij heet, wat hij wil, hoeveel woorden hij krijgt, of hij
# zichzelf mag herhalen, en waar zijn beurt op moet eindigen. Die laatste twee
# zijn echte knoppen. Herhalen mag voor wie je afhoudt, want afhouden ís
# herhalen. En "eist" dwingt af wat een klein model niet kan vasthouden: zeg
# je tegen een 1B-model "stel altijd een vraag", dan doet het dat drie beurten
# en daarna niet meer. Een vraagteken eisen werkt wél.
OPSTELLINGEN = {
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
ZINNEN_PER_BEURT = 2

MAX_BEURTEN = 0    # 0 = eindeloos, tot je Ctrl+C drukt
PAUZE = 2.0
TEMPO = 0.08
BEWAAR = True

# --------------------------------------------------------------------- opmaak

KLEUR_A, KLEUR_B = "\033[36m", "\033[35m"
GRIJS, RESET = "\033[90m", "\033[0m"
INSPRING_B = 22

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


def hele_zinnen(tekst):
    """Houdt de eerste afgemaakte zinnen over; None als er geen enkele af is."""
    delen = re.findall(r".+?[.!?…]+(?:\s|$)", tekst, re.S)
    if not delen:
        return None
    return "".join(delen[:ZINNEN_PER_BEURT]).strip()


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


# ------------------------------------------------------------------ de kern

def berichten_voor(wie, transcript):
    """De geschiedenis zoals dit model hem ziet: eigen woorden als 'assistant',
    die van de ander als 'user'."""
    berichten = [{"role": "system", "content": wie["opdracht"]}]
    for spreker, tekst in (transcript[-CONTEXT:] if CONTEXT else transcript):
        rol = "assistant" if spreker is wie else "user"
        berichten.append({"role": rol, "content": tekst})
    return berichten


def stroom(wie, berichten, poging, staat):
    payload = {
        "model": wie["model"],
        "messages": berichten,
        "stream": True,
        "options": {
            "temperature": min(1.4, wie["temp"] + 0.15 * poging),
            "seed": wie["seed"] + 1000 * poging,
            "repeat_penalty": HERHALING,
            "num_predict": max(16, wie["woorden"] * 3),
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
                staat["reden"] = brok.get("done_reason", "")
                break
            stuk = brok.get("message", {}).get("content", "")
            if stuk:
                yield stuk


def zeg(wie, berichten, poging):
    """Eén poging, in stilte. Niets op het scherm tot hij goedgekeurd is."""
    gezegd, buffer, afgekapt, staat = [], "", False, {}
    for stuk in stroom(wie, berichten, poging, staat):
        buffer += stuk.replace("\n", " ")
        while " " in buffer:
            woord, buffer = buffer.split(" ", 1)
            if not woord:
                continue
            if len(gezegd) >= wie["woorden"]:
                buffer, afgekapt = "", True
                break
            gezegd.append(woord)
        else:
            continue
        break
    if buffer.strip() and len(gezegd) < wie["woorden"]:
        gezegd.append(buffer.strip())

    tekst = " ".join(gezegd).strip()
    heel = hele_zinnen(tekst)
    if heel:
        return heel
    if staat.get("reden") == "length":
        afgekapt = True
    if afgekapt and tekst and tekst[-1] not in ".!?…":
        tekst = tekst.rstrip(",;: ") + "…"
    return tekst


def typ(wie, tekst):
    regel = Regel(wie["inspring"], toon_breedte(wie["inspring"]))
    regel.open()
    for woord in tekst.split():
        regel.woord(woord)
        if TEMPO:
            time.sleep(TEMPO)
    regel.sluit()


def beurt(wie, transcript, eerdere_zinnen, woorden, groepjes):
    """Blijft proberen tot er iets nieuws uit komt, of geeft het op.

    Kanten met uniek=False slaan het herhalingsverbod over: die mógen in
    herhaling vallen, want afhouden ís herhalen. Een "eist" blijft wel gelden."""
    print(f"{' ' * wie['inspring']}{wie['kleur']}{wie['naam']}{RESET}"
          f"{GRIJS} · {wie['model']}{RESET}")

    verworpen = []
    keuren = wie["uniek"] or wie.get("eist")
    for poging in range(POGINGEN if keuren else 1):
        tekst = zeg(wie, berichten_voor(wie, transcript), poging)
        reden = keur(wie, tekst, eerdere_zinnen, woorden, groepjes) if keuren else None
        if reden is None:
            typ(wie, tekst)
            return tekst, verworpen
        verworpen.append({"tekst": tekst, "reden": reden})
    return None, verworpen


def bewaar(regels, opstelling):
    map_ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "gesprekken")
    os.makedirs(map_, exist_ok=True)
    stempel = f"{time.strftime('%Y%m%d-%H%M%S')}-{opstelling}"
    pad = os.path.join(map_, stempel + ".jsonl")
    nummer = 2
    while os.path.exists(pad):
        pad = os.path.join(map_, f"{stempel}-{nummer}.jsonl")
        nummer += 1
    with open(pad, "w") as bestand:
        for regel in regels:
            bestand.write(json.dumps(regel, ensure_ascii=False) + "\n")
    return os.path.normpath(pad)


def modellen_bestaan(*namen):
    """Zonder dit geeft ollama een kale 404 zodra een model niet binnen is."""
    try:
        with urllib.request.urlopen("http://localhost:11434/api/tags",
                                    timeout=5) as antwoord:
            binnen = {m["name"] for m in json.load(antwoord).get("models", [])}
    except (urllib.error.URLError, TimeoutError, ValueError):
        return "Geen ollama op localhost:11434. Start 'm met `ollama serve`."
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
    klacht = modellen_bestaan(MODEL_A, MODEL_B)
    if klacht:
        print(klacht)
        return
    opzet = OPSTELLINGEN[OPSTELLING]

    a = dict(opzet["a"], model=MODEL_A, temp=TEMP_A, seed=SEED_A,
             kleur=KLEUR_A, inspring=0)
    b = dict(opzet["b"], model=MODEL_B, temp=TEMP_B, seed=SEED_B,
             kleur=KLEUR_B, inspring=INSPRING_B)
    opener = opzet["opener"]

    print(f"{GRIJS}exp-1  |  {OPSTELLING}  |  {a['naam']} tegen {b['naam']}  |  "
          f"venster {GEHEUGEN}  |  "
          f"{'eindeloos' if MAX_BEURTEN == 0 else str(MAX_BEURTEN) + ' beurten'}"
          f"  |  Ctrl+C{RESET}\n")

    transcript = [(a, opener)]
    zinnen = [opener]
    verslag = [{"wie": a["naam"], "model": a["model"], "tekst": opener,
                "verworpen": [], "gedwongen": False}]

    print(f"{a['kleur']}{a['naam']}{RESET}{GRIJS} · {a['model']}{RESET}")
    typ(a, opener)

    aan_de_beurt, reden, beurten = b, "afgebroken", 0
    try:
        while MAX_BEURTEN == 0 or beurten < MAX_BEURTEN:
            beurten += 1
            time.sleep(PAUZE)
            print()

            venster = zinnen[-GEHEUGEN:] if GEHEUGEN else zinnen
            woorden = set().union(*(inhoudswoorden(z) for z in venster))
            groepjes = set().union(*(reeksen(z) for z in venster))

            gezegd, verworpen = beurt(aan_de_beurt, transcript, venster,
                                      woorden, groepjes)

            gedwongen = False
            if gezegd is None:
                if OPGEVEN:
                    verslag.append({"wie": aan_de_beurt["naam"],
                                    "model": aan_de_beurt["model"],
                                    "tekst": None, "verworpen": verworpen,
                                    "gedwongen": False})
                    reden = f"{aan_de_beurt['naam']} kon niets nieuws meer bedenken"
                    break
                # Een gedwongen beurt mag het herhalingsverbod breken, maar
                # niet de vormeis: een vrager die geen vraag stelt is geen
                # vrager meer. Liefst een poging die er al aan voldoet.
                kandidaten = [v["tekst"] for v in verworpen if v["tekst"]]
                eis = aan_de_beurt.get("eist")
                passend = [k for k in kandidaten if not eis or k.rstrip().endswith(eis)]
                if passend:
                    gezegd = max(passend, key=len)
                elif kandidaten:
                    gezegd = max(kandidaten, key=len).rstrip(".,;: ") + (eis or "")
                else:
                    gezegd = (eis or "…")
                gedwongen = True
                typ(aan_de_beurt, gezegd)

            transcript.append((aan_de_beurt, gezegd))
            zinnen.append(gezegd)
            verslag.append({"wie": aan_de_beurt["naam"], "model": aan_de_beurt["model"],
                            "tekst": gezegd, "verworpen": verworpen,
                            "gedwongen": gedwongen})
            aan_de_beurt = a if aan_de_beurt is b else b
        else:
            reden = f"{MAX_BEURTEN} beurten"
    except KeyboardInterrupt:
        reden = "afgebroken"
    except urllib.error.URLError:
        print(f"\n{GRIJS}Geen ollama op localhost:11434. Start 'm met "
              f"`ollama serve` en haal het model op met `ollama pull "
              f"{MODEL_A}`.{RESET}")
        return

    print(f"\n{GRIJS}— {reden}. {transcript[-1][0]['naam']} zei als laatste "
          f"iets, na {len(transcript) - 1} beurten.{RESET}")
    if BEWAAR:
        print(f"{GRIJS}  {bewaar(verslag, OPSTELLING)}{RESET}")


if __name__ == "__main__":
    main()
