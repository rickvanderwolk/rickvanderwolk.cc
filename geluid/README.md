# geluid

Losse Python-experimenten met geluid, klank en ervaring. Realtime gegenereerd
(niks vooraf opgenomen), click-vrij via een audio-callback met doorlopende fase.
Elk experiment in `lab/` staat op zichzelf en is los te draaien.

## Draaien

```sh
cd geluid
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# een experiment starten (Ctrl+C om te stoppen):
.venv/bin/python lab/exp-0.py
```

De `.venv` staat er al; die eerste twee regels zijn alleen nodig op een nieuwe machine.

Elk experiment print in de terminal wat er gebeurt, zodat je de veranderingen
kunt volgen terwijl je luistert.

## De experimenten

| # | wat | wat je hoort / ziet |
|---|-----|---------------------|
| `exp-0` | **Enkele frequentie** | Eén zuivere sinus (110 Hz) die alleen heel traag in volume ademt. Spanning uit stilstand. Meter toont het ademen. |
| `exp-1` | **Onmerkbaar schuivende toon** | Toonhoogte glijdt supertraag heen en weer (70–180 Hz, 10 min per cyclus). Van moment tot moment hoor je niks veranderen; kom je later terug, dan staat-ie ergens anders. Print elke 15s de frequentie. |
| `exp-2` | **Spannende soundscape** | Donkere drone die traag van klankkleur verschuift, met daarover onvoorspelbare belletjes in een frygische (donkere) ladder. Print welke noot valt + hoe helder de drone is. |
| `exp-3` | **Buitenaards / in je hoofd** | Uitzichtloos, bijna stilstaand: druk-rommel + inharmonisch cluster (irrationele verhoudingen, onaards) + zacht oorsuizen dat komt en gaat. Korte termijn haast stil; over ~7 min zakt de grondtoon en rekt de spreiding op. Koptelefoon aanrader. Print waar de morph staat. |
| `exp-8` | **Evoluerende loop** | Een herkenbaar lusje dat blijft herhalen, maar elke omwenteling verandert er precies één ding: een toon, een tik, het volume, het tempo, de lengte. Vertrouwd en toch drijft het weg. Technisch onmogelijk gemaakt om ooit te herhalen. |

### Vervreemding — bouwstenen voor een installatie / ervaring

Vier verschillende vervreemdingstechnieken, elk oneindig te draaien en nergens terugkerend. Een palet om uit te kiezen als basis voor een werk.

| # | wat | wat je hoort / ziet |
|---|-----|---------------------|
| `exp-4` | **Shepard-toon** | Een klank die *eeuwig* lijkt te stijgen (of dalen, zet `DIRECTION` op -1) maar nooit ergens aankomt. Barberpole voor je oren; desoriënterend, geen oplossing. Print de positie in het octaaf. |
| `exp-5` | **Formant-koor** | Bijna-menselijke stem die zonder woorden tussen klinkers (aaa→eee→iii→ooo→uuu) morpht. Uncanny valley — een aanwezigheid die net geen mens is. Print op welke klinker de 'mond' staat. |
| `exp-6` | **Granulaire wolk** | Geluid versplinterd in duizenden korreltjes die tot een verschuivende wolk samensmelten. Dichtheid, hoogte en korrelgrootte drijven traag. Alsof de werkelijkheid uiteenvalt. Print dichtheid/hoogte/korrel. |
| `exp-7` | **Binaurale zwevingen** | Elk oor een iets andere frequentie → een fantoom-pulsatie die alléén in je hoofd bestaat, niet in de lucht. **Koptelefoon vereist.** Print drager + zwevingssnelheid. |

### Echte bronnen — geluid dat van buiten komt

Niets verzonnen: deze laten iets echts klinken. Zet ze aan en ze klinken elke
dag anders, omdat de wereld elke dag anders is. `exp-9`, `exp-11` en `exp-14` hebben
internet nodig; zet `LAT`/`LON` bovenin op je eigen plek.

| # | wat | wat je hoort / ziet |
|---|-----|---------------------|
| `exp-9` | **Vliegtuigen boven je huis** | Elk toestel binnen 30 zeemijl (echte ADS-B data) is één stem: hoogte = toonhoogte, afstand = volume, richting = stereobeeld, snelheid = klankkleur. Toestellen glijden door het beeld en zakken mee met hun daling. 's Nachts bijna stil, onder een aanvliegroute een koor. Print aankomst en vertrek per toestel. |
| `exp-10` | **Je laptop laten zingen** | De machine waar je op werkt: accu = grondtoon (leeg zakt een octaaf), processor = klankkleur en trilling, geheugen = zweving, netwerk = ruisvlagen, schijf = tikjes. Je hoort je eigen werkdag. Meters in de terminal. |
| `exp-11` | **De wind buiten speelt je kamer** | Het echte weer op jouw coördinaten (Open-Meteo): luchtdruk = grondtoon, windsnelheid = ruisband, windstoten = golfslag, richting = stereobeeld, temperatuur = warmte. Nieuwe metingen glijden er in drie minuten in — van minuut tot minuut hoor je niks, na een paar uur is het weer omgeslagen. |
| `exp-12` | **Kamer met vertraging** | Je hoort je eigen kamer, een minuut geleden. Eerst een minuut stilte, daarna komt alles terug: de stoel die je verschoof, iets wat je zei tegen niemand. Je praat, en een minuut later praat je terug. **Koptelefoon vereist**, anders zingt het rond. Terminal toont hoe laat het is dat je hoort. Andere vertraging meegeven kan los: `lab/exp-12.py 5`. |
| `exp-13` | **Kamer aan een knop** | Als `exp-12`, maar je draait de vertraging live bij met de pijltjestoetsen, van 0,2 seconde tot tien minuten. Er draait continu een band van tien minuten mee, dus het verleden is er al: draai naar 200 seconden en je hoort wat er drie minuten geleden gebeurde. Twee standen (`m`): *glijden* schuift de leeskop als een bandkop over de band, dus langer maken laat de toonhoogte zakken en korter maken stijgen — *springen* gaat er direct heen met een crossfade. **Koptelefoon vereist.** |
| `exp-14` | **De Maas** | Eén getal draagt het hele stuk: de rivierafvoer bij je punt (Open-Meteo Flood/GloFAS). Veel water zakt de grondtoon tot een octaaf omlaag en maakt de klank voller; hoe hard het verandert bepaalt de zweving, en welke kant het op gaat de kleur (wassend water zet de kwint voorop, zakkend water het octaaf). Het bereik is niet verzonnen: bij het starten haalt hij een jaar afvoer op en kalibreert daarop. Dagwaarden lopen via een gladde kromme, inclusief de voorspelde dagen, dus het leunt vanzelf al naar morgen. Verandert alleen als het landschap verandert. |

### Traagheid — een seconde als hele dag, en de prijs daarvan

| # | wat | wat je hoort / ziet |
|---|-----|---------------------|
| `exp-15` | **Eén tik, één etmaal** | Eén seconde uit een tikkende klok, uitgesmeerd over vierentwintig uur: 86400x trager, één sample duurt bijna twee seconden. Niet vertraagd afgespeeld (dan zakt de toonhoogte zestien octaven weg) maar spectraal opengetrokken, dus de toonhoogte blijft staan en alleen de tijd rekt uit. De tik — een klap van een tiende seconde — wordt een veld dat uren duurt: eerst het hout van de kast, dan het metaal, en dan weer weg. Een klok die één keer per dag tikt loopt even snel als een klok die stilstaat. Hangt aan de klok: 00:00 is het begin van het fragment, dus iedereen die tegelijk luistert zit op dezelfde milliseconde. |

Deze bron is voor negentig procent digitale stilte en die verhouding blijft na
het uitrekken staan: het grootste deel van de dag gebeurt er niets, en rond het
middaguur komt de tik langzaam op. Bij het starten rekent hij uit tussen welke
kloktijden er iets te horen is en zet dat erbij. Omdat je op een willekeurig
moment dus meestal in de stilte belandt, kun je de dag ook versneld afluisteren
— dat is niet het werk, dat is de blauwdruk ervan:

```sh
.venv/bin/python lab/exp-15.py 500          # 500x sneller: de dag in ~3 minuten,
                                            # begint vanzelf net voor de tik
.venv/bin/python lab/exp-15.py 14:20        # echte snelheid, maar meteen op het hoogtepunt
.venv/bin/python lab/exp-15.py mic          # neem zelf een seconde op en rek die uit
.venv/bin/python lab/exp-15.py iets.mp3     # ander fragment (mp3 gaat via ffmpeg)
```

Volgorde maakt niet uit; `mic 500` mag ook. Een tijdstip mag als `14:20`, `14.20`,
`14u20` of `14u`; een kaal getal is de snelheid. Wil je geluid over de héle dag,
geef dan een bron mee die zelf doorloopt — regen, of `mic`, want een kamer is
nooit helemaal stil.

**Maar het is niet echt.** De klankkleur wel: het spectrum van wat je hoort
correleert 0,96 met dat van het stukje bron waar de leeskop staat, en de
toonhoogte is niet aangeraakt. De golfvorm niet: die correleert 0,003 met het
origineel, oftewel nul. Van elk venstertje worden de fases weggegooid en door
willekeurige vervangen, en bij een tik zit juist daar alle informatie — een klik
ís een fase-uitlijning. Je hoort waar de tik van gemaakt was, niet de tik. Het
zachte op-en-neer dat je hoort (1,5 dB per 25 ms tegen 0,6 dB voor gewone ruis)
komt uit die synthese, niet uit de klok.

Dat is geen slordigheid maar wiskunde: een seconde is 44.100 getallen en een
etmaal 3.810.240.000. Er moet iets verzonnen worden. Echt vertragen kan alleen
door de toonhoogte mee te laten zakken, en 86400x is zestien octaven — dan wordt
3208 Hz 0,037 Hz en is er niets meer te horen.

| # | wat | wat je hoort / ziet |
|---|-----|---------------------|
| `exp-16` | **Alleen de stilte uitgerekt** | De eerlijke tegenhanger. Hier wordt niets verzonnen: elke sample die je hoort staat letterlijk in de opname, in de oorspronkelijke volgorde, op de oorspronkelijke snelheid, toonhoogte en volume. Geen filter, geen versterking, geen fase aangeraakt. Alleen het *moment* verandert: de opname wordt opgedeeld in wat er echt gebeurt en wat er niet gebeurt, en alleen die stilte wordt uitgerekt. Zeventien tikken in zestien seconden worden zeventien tikken in vierentwintig uur, ruim een uur uit elkaar. Je hoort de klok niet meer tikken, je hoort losse tikken — scherp en dichtbij, want er is niets mee gedaan, en daarna is het weer een uur stil. |

```sh
.venv/bin/python lab/exp-16.py             # eens per 1u25 een echte tik
.venv/bin/python lab/exp-16.py 3000        # alleen het wachten ingekort, tik blijft echt
```

Stilte die langer duurt is nog steeds stilte — nul blijft nul, hoe lang je hem
ook aanhoudt. Dat is het verschil met `exp-15`, waar de stilte hetzelfde blijft
en de klank verzonnen wordt. Bij het starten zet `exp-16` erbij hoe laat er
vandaag getikt wordt. Bij `5275x` krijg je de opname exact terug zoals hij is.

### De machine zelf — hoor wat je computer doet

Echt, net als `exp-10`, maar directer: één meting is één knop, en elk nieuw proces
krijgt een eigen stem.

| # | wat | wat je hoort / ziet |
|---|-----|---------------------|
| `exp-17` | **Hoor wat je computer doet** | Drone waarvan de processor de toonhoogte zet (80–320 Hz) en het geheugen het volume. Elke 64 KB netwerkverkeer is één tikje. Start er ergens een proces, dan klinkt één korte toon; de hoogte komt uit een hash van de procesnaam, dus `git` klinkt altijd hetzelfde. Met `--say` meldt `say` grote sprongen hardop, hoogstens eens per 10 seconden. |
| `exp-18` | **Je computer praat terug** | Als `exp-17`, maar drukker: praten staat standaard aan, elke nieuwe procesnaam wordt hardop gezegd in een eigen stem (ook gekozen uit de hash, uit alle stemmen die macOS heeft), tot vier stemmen door elkaar. Lagere drempels voor meldingen, meer tikjes (één per 16 KB), sneller glijden. Een build of het openen van een browser wordt een koor. `--stil` zet het praten uit. |
| `exp-19` | **Wat gebeurt er zoal** | Niet meer meters voorlezen maar vertellen wat er gebeurt. Elk nieuw proces geeft een toon, maar hardop alleen als het nieuw is of tien minuten niet gezien, als ingekorte opdracht ("mdworker shared", "trivial rewrite"); wat tegelijk start wordt één zin ("Google Chrome Helper, 8 keer"). Daartussen in een Nederlandse stem: wie nu het drukst is, schijf erin/eruit, stekker, netwerk weg/terug, en "wakker, na 40 minuten". Bekend wordt stil, zeldzaam springt eruit. Kijkt elke 0,1 s, maar wat sneller klaar is (een `ls`, een `git status`) mist hij nog. |
| `exp-20` | **De log hardop** | Als `exp-19`, zonder interpretatie: hij leest voor wat de machine meldt, in logtaal. "spawn git symbolic-ref HEAD, pid 67971, parent bash" en even later "exit git, pid 67971, 0.1 seconds" — echte levensduur. Daartussen "power battery, 64 percent", "mount /Volumes/USB", "en0 down", "resume, gap 2400 seconds". Elk woord is een gemeten waarde; niks samengevat of mooier gemaakt. Zo hoor je wat er écht onder je handen draait, zoals Docker die elke paar seconden `ps` doet. |
| `exp-21` | **De verteller** | Een stem die vertelt wat *jij* doet, in de tweede persoon: "Je gaat naar Safari." "Na 40 seconden terug naar Terminal." "Weer Chrome. De zesde keer in 5 minuten." "Je opent Notities." "Al 15 minuten niets aangeraakt." "Je bent terug. Na 17 minuten." Alles gemeten (actieve app via `lsappinfo`, stilte via `ioreg` HIDIdleTime, opdrachten in je terminal, slaap); alleen de zinnen zijn verzonnen, en welke zin hij kiest hangt aan hoe vaak en hoe lang, niet aan toeval. Eén stem, nooit door elkaar; zacht een drone eronder. |
| `exp-22` | **De verteller kijkt mee** | Als `exp-21`, maar hij mist minder. Hij leest de titel van het actieve tabblad in Chrome, Safari, Arc, Brave en Edge ("Je gaat naar Chrome, Pull requests · GitHub."), praat sneller en vat drukte samen in plaats van zinnen weg te gooien: "Vier wissels: Terminal, Chrome, Finder, Chrome." Een wissel telt al na een halve seconde. De eerste keer vraagt macOS of Terminal je browser mag besturen; zonder die toestemming gaat hij door zonder tabbladen. |

## Sleutelen

Bovenin elk bestand staan de knoppen (frequentie, tempo, bereik, volume) als
constanten met uitleg. Draai gerust aan `FREQ`, `ONDER`/`BOVEN`, `PERIODE`, enz.

Bij de echte-bronnen-reeks zijn dat vooral `LAT`/`LON` (je eigen plek), `RADIUS_NM`
en `POLL` in `exp-9`, `GLIDE` in `exp-11` (hoe traag een nieuwe meting binnenkomt)
en `VERTRAAG` in `exp-12` — die laatste kun je ook los meegeven
(`.venv/bin/python lab/exp-12.py 5`), probeer eens 5 seconden en eens tien minuten.
In `exp-13` bepalen `RATE_MIN`/`RATE_MAX` hoe hard de leeskop mag lopen (en dus hoe
diep het doorzakt) en `SLEW` hoe zwaar de knop aanvoelt. In `exp-14` zetten `LAT`/`LON`
je bij een andere rivier — hij zoekt zelf het dichtstbijzijnde stroomgebied en laat bij
het starten zien welk roosterpunt dat werd. In `exp-15` bepalen `FRAGMENT` hoeveel bron
je uitrekt (langer = meer dat over de dag voorbijkomt), `DUUR` waarover dat gaat (zet 'm
op 3600 en het is een uur) en `VENSTER` hoe wazig het wordt: groter smeert verder uit,
kleiner blijft dichter bij het origineel.
