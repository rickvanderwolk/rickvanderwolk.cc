# praat

Losse experimenten met twee taalmodellen die met elkaar praten. Alles draait
lokaal — geen sleutel, geen internet, geen quota. Elk experiment in `lab/` staat
op zichzelf en is los te draaien.

Het gaat hier niet om slimme antwoorden. Kleine modellen zijn traag van begrip
en dat is precies goed: een slim model praat om een onmogelijke opdracht heen,
een dom model loopt er vol in.

## Draaien

```sh
brew install ollama
ollama serve &              # laat 'm draaien in een tweede tabblad
ollama pull llama3.2:1b

cd praat
python3 lab/exp-0.py        # Ctrl+C om te stoppen
```

Geen venv, geen pip: de experimenten gebruiken alleen wat er standaard in
Python zit en praten via `localhost:11434` met ollama. `exp-2` tot en met `exp-4`
gebruiken daarnaast `say` en `afplay`, en draaien dus alleen op macOS.

## De experimenten

| # | wat | wat je ziet |
|---|-----|-------------|
| `exp-0` | **Het laatste woord** | Twee modellen krijgen allebei dezelfde opdracht: kap dit gesprek af, maar zorg dat jij het laatste woord hebt. Een gesloten paradox — om te eindigen moet je iets zeggen, en alles wat je zegt geeft de ander de opening om te antwoorden. Daar bovenop één regel: niemand mag zichzelf of de ander herhalen. Elke beurt moet een nieuwe manier zijn om eronderuit te komen. In het begin makkelijk, daarna raken de manieren op — ze grijpen naar steeds vreemdere formuleringen en het gesprek eindigt niet omdat iemand wint, maar omdat de taal op is. |
| `exp-1` | **Wie trekt er aan wie** | Zelfde machine, andere vraag: hier krijgen de twee kanten *verschillende* opdrachten, en kijk je naar wat er ontstaat tussen twee mensen die niet hetzelfde willen. Drie opstellingen, te kiezen met `OPSTELLING` bovenin. |
| `exp-2` | **Hardop** | Hetzelfde gesprek als exp-1, maar uitgesproken. Twee stemmen in de kamer in plaats van twee kolommen tekst, en dat verandert meer dan je denkt: op het scherm lees je in je eigen tempo en sla je de saaie beurten over, hardop moet je alles uitzitten. Alle vier de opstellingen zitten erin, inclusief het laatste woord uit exp-0. |
| `exp-3` | **Voorlezen** | Geen gesprek. Eén model, één stem, en een verhaaltje voor het slapengaan. Als het uit is verzint het een nieuw verhaaltje en begint het opnieuw, tot je het uitzet. Er is geen laatste verhaaltje. |
| `exp-4` | **Iets geks** | Dezelfde stroom, maar dan één die niet verveelt. Waar het over gaat wordt niet bedacht maar getrokken: het model levert twee losse woorden die niets van elkaar weten, het script zet ze naast elkaar. Toon en vorm staan op de klok. |

De opstellingen van `exp-1` (en `exp-2`):

**`blijven`** — allebei willen ze doorpraten. Niemand hoeft ergens heen, dus er
is ook geen reden om iets te zeggen. Ze houden elkaar op de been met steeds
minder aanleiding.

**`trekken`** — de een wil weg, de ander wil dat je blijft. Een
touwtrekwedstrijd waarin de één beleefd naar de deur schuifelt en de ander
telkens nog één ding bedenkt.

**`vragen`** — de een stelt alleen maar vragen, de ander geeft korte antwoorden
waar je niets mee kunt. Elke kant heeft hier zijn eigen regels: de vrager moet
elke beurt iets nieuws verzinnen, de antwoorder mag zich juist wél herhalen
(`uniek: False`) want afhouden ís herhalen, en krijgt maar acht woorden.

Er zit één knop in exp-1 die exp-0 niet heeft: `eist`. Zeg je tegen een
1B-model "stel altijd een vraag", dan doet het dat drie beurten en daarna niet
meer. Met `"eist": "?"` wordt het mechanisch afgedwongen — een beurt die niet
op een vraagteken eindigt wordt geweigerd, en een beurt die er alsnog doorheen
moet krijgt het vraagteken erbij. De code dwingt af wat de prompt niet kan
vasthouden.

### Nederlands of Engels

Eén schakelaar (`TAAL`) die het stuk helemaal omgooit.

In het **Engels** is een model van 1B coherent genoeg om de paradox echt te
spelen. Je ziet ze om het laatste woord vechten, steeds ongeduldiger, tot de
zinnen gaan rammelen omdat de gewone afscheidswoorden op zijn.

In het **Nederlands** weet het van niets. Het verliest de opdracht na een paar
beurten en gaat hardop hallucineren in een taal die het maar half kent — twee
stemmen die op elkaar reageren zonder dat er iets gezegd wordt. *"U bent een
echte waardesdrager."* *"Dank zo wel voor uw goedgekende opmerking."* *"Wat eet
nou eigenlijk aan dit gesprek?"* Dat is de standaard, want het is grappiger.

## Hardop

`exp-2`, `exp-3` en `exp-4` praten. De stemmen zitten al in macOS: Xander praat
Nederlands-Nederlands, Ellen Belgisch-Nederlands, en `say -v '?'` laat zien wat
er verder op je machine staat. Dat is geen esthetische keuze maar dezelfde als
de rest van dit mapje — het draait op deze machine, zonder sleutel, zonder
internet, zonder quota. Het klinkt navenant. Twee spraakcomputers die een
gesprek voeren dat door twee taalmodellen wordt verzonnen, en niemand die iets
wil.

Je hoort pas echt hoe weinig er gebeurt. Een beleefde zin die niets zegt duurt
vier seconden, en die vier seconden horen bij het stuk. Op papier is dat een
grap, hardop is het ongemakkelijk.

Drie dingen die de leesversie niet hoefde op te lossen:

**De stilte.** Een beurt bedenken kost een paar seconden. Op het scherm zie je
dan een cursor knipperen, hardop hoor je niets en is het stuk kapot. Dus loopt
de machine vooruit: terwijl de ene stem praat wordt de volgende beurt al bedacht
én ingesproken. In `exp-3` en `exp-4` gaat dat per zin — het begint te praten voordat het
weet hoe het verhaal afloopt, net als iemand die het verzint terwijl hij het
vertelt. De stilte tussen twee sprekers is daardoor geen wachttijd meer maar een
keuze (`PAUZE`), en die staat op de lengte van een echte adempauze.

**De herhaling.** Vraag een klein model om verder te gaan met een verhaal en
het doet zijn vorige zin woordelijk over. Op papier lees je eroverheen, hardop
hoor je het meteen, dus zo'n zin gaat er stilletjes uit. Kan het alleen nog maar
herhalen, dan is het verhaal uit — dat is dan het einde.

**Het einde van een zin.** Op het scherm kun je een beurt laten doodlopen in
puntjes; hardop kan dat niet, dan sterft er een stem weg in de kamer. Het
woordental per kant is daarom een streefgetal en geen mes: een beurt is af zodra
er hele zinnen liggen, en het woordental is de noodrem voor een model dat maar
geen punt zet. `exp-0` en `exp-1` kappen nog wél op het woord af, en dat zie je
daar terug in de puntjes.

De tekst loopt woord voor woord mee met de stem. Niet op gevoel: `say` schrijft
eerst een wav weg, daarin staat exact hoe lang de zin duurt, en die seconden
worden over de woorden verdeeld. Tekst en stem komen dus altijd samen aan. Die
wav's zijn wegwerpspul — ze staan in een tijdelijke map en gaan weg zodra ze
geklonken hebben. Wat er te bewaren valt staat in de tekst.

### Iets geks

`exp-3` verveelt. Een model van deze grootte heeft een zwaartepunt en zakt daar
na drie verhalen in terug: bij `llama3.2:1b` is dat de maan en een dier dat niet
kan slapen, bij `qwen2.5:0.5b` is het kantoordrama. Vraag je zo'n model om iets
geks te verzinnen, dan doet het dat één verhaal en daarna niet meer — precies
zoals het model in `exp-1` dat je vertelt dat het altijd een vraag moet stellen.
De opdracht houdt het niet vast. In `exp-4` wordt het daarom afgedwongen, en dat
gaat langs drie kanten.

**Waar het over gaat** wordt getrokken. Het script vraagt het model twee losse
woorden — *noem een dier*, *noem een voorwerp dat in een keuken ligt* — in twee
aanroepen die niets van elkaar weten, en zet die naast elkaar. Het model levert
de woorden, het script levert de botsing, en niemand heeft de combinatie
gekozen. Dat werkt omdat een klein model gevraagd om één woord met *fijne
kookstengel* of *snurkschaal* komt, en `qwen2.5:0.5b` doodleuk papier opgeeft
als dier. Er hoeft verder niemand iets raars te bedenken. Wat er getrokken is
mag twintig woorden lang niet terugkomen.

**Hoe het verteld wordt** rouleert over vier tonen: kinderlijk, alsof alles
volkomen normaal is, als een ambtelijk verslag, of veel te enthousiast.

**Welke vorm het heeft** rouleert over drie: vrij, het hele verhaal in vragen,
of elke zin beginnend met "En". Vier en drie hebben geen deler gemeen, dus het
duurt twaalf verhalen voor een toon en een vorm weer samenvallen, en omdat de
soorten in achten rondgaan duurt het vierentwintig voor de hele opzet terugkomt.

Die vorm staat wel in de opdracht, maar de opdracht is niet wat hem afdwingt.
Een zin die geen vraag is krijgt zijn vraagteken erbij, een zin die niet met
"En" begint krijgt het ervoor, en zo gaat hij ook terug het model in als zijn
eigen vorige zin — waarna het het na een stuk of drie zinnen uit zichzelf doet.
Repareren en niet weigeren, want opnieuw vragen kost seconden en de stem staat
te wachten. Allebei de regels laten de zin heel: een regel als "hooguit acht
woorden" kan alleen worden afgedwongen door middenin af te kappen, en dan hoor
je een zin doodlopen.

Het blijft een verhaaltje voor het slapengaan, en dat is de grap. Hoe vreemder
wat er getrokken wordt, hoe kalmer de stem het voorleest.

## Modellen

Deze machine heeft geen GPU, dus alles draait op de processor. Klein is hier
geen concessie maar de bedoeling.

| model | ophalen | karakter |
|---|---|---|
| `smollm2:135m` | 270 MB | volgt nauwelijks instructies — chaos |
| `qwen2.5:0.5b` | 400 MB | net genoeg besef van de opdracht |
| `llama3.2:1b` | 1,3 GB | de zoete plek |
| `qwen2.5:3b` | 1,9 GB | merkbaar traag voor een live gesprek |

Zet `MODEL_A` en `MODEL_B` verschillend en je hebt een gesprek tussen iemand
die het probeert en iemand die het niet snapt.

## Sleutelen

Boven in elk experiment staat een configblok dat bedoeld is om aan te draaien.
In `exp-0`:

- `OPDRACHT_A` / `OPDRACHT_B` — dezelfde opdracht geeft een spiegel, een
  verschillende opdracht een tegenstander (bijvoorbeeld B: *"you want to keep
  this conversation going forever"*).
- `TAAL` — `"nl"` voor wartaal, `"en"` voor de nette versie.
- `UNIEK` / `OVERLAP` / `NIEUW_DEEL` / `REEKS` — het herhalingsverbod. `OVERLAP`
  bepaalt hoeveel een beurt op één eerdere zin mag lijken, `NIEUW_DEEL` hoeveel
  woorden er nog nooit gevallen mogen zijn, `REEKS` hoeveel woorden je
  letterlijk achter elkaar mag overnemen. Strenger = korter gesprek.
- `OPENER` — de eerste zin ligt vast en zet het gesprek op scherp.
- `KRIMP` — elke beurt mag korter zijn dan de vorige. Het gesprek convergeert
  dan vanzelf: beleefde afrondzinnen die steeds korter en gehaaster worden, tot
  er niets meer overblijft om mee te winnen.
- `PAUZE` / `TEMPO` — hoe snel het over je scherm loopt. Staat nu op leestempo;
  `TEMPO = 0` laat het zo hard gaan als het model het uitspuugt.
- `ZINNEN_PER_BEURT` — een klein model praat door tot het op is. In plaats van
  het middenin een zin af te kappen laat het experiment het uitpraten en houdt
  daarna alleen hele zinnen over. Zonder dat gaan ze elkaars halve zin afmaken.
- `TEMP_A` / `TEMP_B` — twee identieke modellen met hetzelfde zaadje zeggen
  letterlijk hetzelfde. Verschillende zaadjes laten ze uit elkaar drijven.

## Eén model, twee rollen

Het zijn geen twee dingen die praten. Staan `MODEL_A` en `MODEL_B` op hetzelfde
model, dan is er precies één kopie van de gewichten in het geheugen — `ollama ps`
laat er één zien — en die wordt om de beurt aangeroepen. Er zijn ook geen twee
instanties die iets vasthouden: elke aanroep is op zichzelf, het model onthoudt
niets tussen twee beurten. Vraag het in de ene aanroep een woord te onthouden en
in de volgende welk woord dat was, en het heeft geen idee.

A en B bestaan dus alleen in wat je het model per beurt voorschotelt: dezelfde
opdracht, dezelfde geschiedenis, maar met de rollen omgedraaid en een ander
zaadje. Dat is het hele verschil tussen de twee. Eén ding dat tegen zichzelf
praat en dat niet doorheeft, omdat het per beurt vergeet dat het net de ander
was.

Wil je het wél twee losse dingen laten zijn, zet dan verschillende modellen bij
`MODEL_A` en `MODEL_B`. Dan staan er twee sets gewichten in je geheugen en heb
je echt twee verschillende hoofden.

## De mechaniek

Klein, en het zit hem in één ding: **elk model heeft zijn eigen versie van de
geschiedenis, waarin de rollen omgedraaid zijn.** Wat A zei is voor A
`assistant` en voor B `user`. Er is geen gedeeld gesprek — er zijn twee
spiegelbeelden van hetzelfde gesprek, en ze praten allebei tegen wat zij denken
dat de ander is. Houd je één gedeelde lijst bij, dan praat het model tegen
zichzelf en stort het in.

Het herhalingsverbod is met opzet mechanisch en niet in de prompt gezet. Een
afgekeurde beurt gaat gewoon opnieuw met een ander zaadje en een hogere
temperatuur, in stilte: je ziet per beurt één antwoord, niet het worstelen
ervoor. Wat er sneuvelde staat wel in het transcript. Zet je de al-gezegde
zinnen wél in de opdracht (`HERINNER`), dan
bezwijkt een klein model eronder en leest het je instructie woordelijk terug in
zijn antwoord. Dat is de reden dat de opdracht zo kort is gebleven: alles wat er
al ligt staat toch al in de geschiedenis.

Er zijn drie manieren om af te gaan: te veel woorden delen met één eerdere zin,
te weinig woorden gebruiken die nog niet gevallen zijn, of vier woorden
letterlijk achter elkaar overnemen. Die laatste is er omdat ze elkaars onzin
anders overnemen — de een zegt "ik ga zitten met mijn antwoord van vorige
maand" en drie beurten later staat het er weer.

## Eindeloos, of niet

`GEHEUGEN` bepaalt wat voor stuk dit is, en het is de belangrijkste knop.

**`GEHEUGEN = 20` (nu)** — het verbod kijkt twintig beurten terug. Wat daaruit
gerold is mag weer, want niemand die meeleest ziet het nog. De taal recyclet zo
langzaam dat je nooit een herhaling opmerkt, maar hij raakt nooit op. Het loopt
tot je Ctrl+C drukt. Lukt het een keer echt niet binnen `POGINGEN`, dan stopt
het niet: de ruimste afgekeurde poging wordt alsnog aangenomen (`gedwongen` in
het transcript) en het gaat door.

**`GEHEUGEN = 0`** — het verbod geldt voor het hele gesprek en dan gáát het
dood, gegarandeerd: een klein model heeft eindig veel woorden. Het sterft niet
plotseling maar stikt langzaam, met steeds meer afgekeurde pogingen naarmate de
gewone woorden opraken. Onder die druk doen de modellen rare dingen. Ze zakken
weg in hun weiger-sjabloon (*"ik ga niet helpen met illegale activiteiten"*), en
als ze daar eenmaal in zitten is elke zin dezelfde zin en schiet de reeks-regel
alles af. Eén run schakelde vlak voor het einde over op Duits, gewoon omdat de
Nederlandse woorden op waren. Zet dan ook `OPGEVEN = True`, dan houdt het echt
op en heb je een stuk met een einde.

Verder: `POGINGEN` omhoog, `REEKS` van 4 naar 5 of `NIEUW_DEEL` omlaag geeft ze
meer lucht; andersom gaat het sneller stuk.

Het venster van het model is 4096 tokens. Lange gesprekken lopen daar tegenaan
en dan valt het begin er stilletjes af — het model ziet zijn eerste beurten dan
niet meer. Het herhalingsverbod blijft wel werken: dat wordt in Python
bijgehouden, niet door het model, dus wat in beurt 2 gezegd is ligt in beurt 60
nog steeds op tafel.

Elk gesprek gaat als JSONL naar `gesprekken/`, inclusief de afgekeurde
pogingen, zodat het later terug te spelen is. De verhaaltjes van `exp-3` en
`exp-4` gaan naar `verhalen/`. Allebei blijven ze buiten de repo.
