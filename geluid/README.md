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

### Vervreemding — bouwstenen voor een installatie / ervaring

Vier verschillende vervreemdingstechnieken, elk oneindig te draaien en nergens terugkerend. Een palet om uit te kiezen als basis voor een werk.

| # | wat | wat je hoort / ziet |
|---|-----|---------------------|
| `exp-4` | **Shepard-toon** | Een klank die *eeuwig* lijkt te stijgen (of dalen, zet `DIRECTION` op -1) maar nooit ergens aankomt. Barberpole voor je oren; desoriënterend, geen oplossing. Print de positie in het octaaf. |
| `exp-5` | **Formant-koor** | Bijna-menselijke stem die zonder woorden tussen klinkers (aaa→eee→iii→ooo→uuu) morpht. Uncanny valley — een aanwezigheid die net geen mens is. Print op welke klinker de 'mond' staat. |
| `exp-6` | **Granulaire wolk** | Geluid versplinterd in duizenden korreltjes die tot een verschuivende wolk samensmelten. Dichtheid, hoogte en korrelgrootte drijven traag. Alsof de werkelijkheid uiteenvalt. Print dichtheid/hoogte/korrel. |
| `exp-7` | **Binaurale zwevingen** | Elk oor een iets andere frequentie → een fantoom-pulsatie die alléén in je hoofd bestaat, niet in de lucht. **Koptelefoon vereist.** Print drager + zwevingssnelheid. |

## Sleutelen

Bovenin elk bestand staan de knoppen (frequentie, tempo, bereik, volume) als
constanten met uitleg. Draai gerust aan `FREQ`, `ONDER`/`BOVEN`, `PERIODE`, enz.
