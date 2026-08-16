# fc1042

Live camerabeeld wordt geluid. Een **instrument**: je staat ervoor, je beweegt,
je hoort wat je doet. Het beeld is in het begin zichtbaar zodat je de koppeling
snapt — daarna lost het op, en blijft alleen de klank over.

Alles vanilla: Web Audio + canvas, geen libraries, niks van een CDN. Elk
experiment in `lab/` staat op zichzelf en is los te openen.

## Draaien

Camera-toegang vereist een beveiligde context, dus `file://` werkt niet:

```sh
cd /pad/naar/rickvanderwolk.cc
python3 -m http.server 8000
# open http://localhost:8000/fc1042/lab/exp-0.html
```

`localhost` telt als veilig. Een telefoon op hetzelfde netwerk niet — voor een
test op iOS moet het over **https** (live site of een tunnel).

Tik = starten. Daarna tik (of `d`) = signalen tonen.

## De experimenten

Twee richtingen die dezelfde bouwstenen delen: het **live instrument** (je
beweegt, je hoort het meteen) en de **foto-sequencer** (je maakt foto's en
bouwt daar een liedje mee op).

### Live instrument

| # | wat | wat je hoort / ziet |
|---|-----|---------------------|
| `exp-0` | **Doet de keten het?** | Het beeld op analyse-resolutie (64×48 blokjes) en één drone die met de helderheid opent en sluit. Hand voor de lens = hoorbaar. Vooral bedoeld om op een iPhone te controleren of camera + audio samen opstarten. |
| `exp-1` | **Beweging wordt muziek** | Beweging per zone slaat een noot aan: hoog in beeld = hoge toon, links = links, harder = feller. Mineur-pentatonisch, dus nooit vals. Eronder ademt een zacht bed mee met het licht. |

### Foto-sequencer

| # | wat | wat je hoort / ziet |
|---|-----|---------------------|
| `exp-2` | **Foto-sequencer** | Een heel kleine FL Studio waarin je geen noten intekent maar foto's maakt. Vier sporen; per spoor kies je een geluid, maak je een foto, en die foto ís het patroon. Terwijl je richt hoor je het al, dus je kunt het patroon zoeken met de camera. Raster 3×3 / 4×4 / 5×5, gelezen zoals je leest. |
| `exp-8` | **Een foto is een foto** | Als exp-7, maar zonder dobbelsteen: die veranderde het patroon zonder dat je op je scherm kon zien waaróm, en dan leest het als willekeur. Wil je een ander patroon, dan maak je een andere foto. Daartegenover: negen geluiden in plaats van zes en een ruimer toonbereik. |
| `exp-7` | **Terug naar het begin** | De vorm van exp-2, met precies drie dingen uit het lab erbij die niets aan de bediening toevoegen: een zachte begrenzer tegen het klippen, een dobbelsteen, en pianorol-lezing voor de melodische geluiden. Vier vakjes, kies een geluid, maak een foto, hoor het meteen. |
| `exp-6` | **Twee foto's per spoor** | Als exp-5, maar het geluid en het ritme hangen niet langer aan dezelfde foto. Een klankfoto zegt hóé het klinkt, een ritmefoto wannéér — en je kunt ze los overnieuw maken. Een nieuw spoor maak je nog steeds met één foto die allebei tegelijk zet. |
| `exp-5` | **De fotolooper** | Geen instellingen meer, alles komt uit het beeld — ook wélk instrument je krijgt, hoe fijn het raster is, welke toonsoort en welk tempo. Wat je hoort is een gerenderde audiotrack, dus hij speelt door met je scherm op slot; wijzigingen vallen in op de maatstreep. Negen klanken, allemaal gevoelig voor toonhoogte. Meerdere foto's per spoor = maat na maat. |
| `exp-4` | **Fotostudio, direct** | De directheid van exp-2 terug (live motor, elke wijziging meteen hoorbaar) én het doorspelen van exp-3 (een gerenderde WAV neemt het over zodra je wegklikt). Vier lege kaders om te vullen, er komt er vanzelf één bij als je ze vol hebt. Kleur bepaalt de toonhoogte in plaats van licht, foto's zijn ook als pianorol te lezen, elk spoor heeft zijn eigen raster, en een dobbelsteen leest dezelfde foto anders. |
| `exp-3` | **Fotostudio** | Zelfde idee, maar gebouwd als plaat in plaats van instrument: de lus wordt offline naar een WAV gerenderd en speelt als gewone audiotrack — dus door met het scherm op slot, met bediening op je lockscreen. Onbeperkt sporen (het afspelen kost altijd evenveel), foto's blijven bewaard en groot te bekijken, bediening met iconen. |

## Hoe het werkt

```
camera → <video> → mini-canvas 64×48 → signalen → mapping → Web Audio
                        (15×/sec)
```

De analyse draait op **3072 pixels, 15 keer per seconde** — verwaarloosbaar,
ook op een telefoon. De weergave is een losse lus op schermtempo.

Drie principes, alle drie een antwoord op waarom dit soort werk meestal
mislukt:

**1. Beeld stuurt knoppen, geen losse noten.** Pixel → toon klinkt als ruis.
Het beeld stuurt de parameters van een muzikaal systeem; het systeem maakt de
noten. Alles kwantiseert naar een toonladder, dus het kan niet vals klinken.

**2. Alles is zelf-kalibrerend.** Absolute waarden zijn waardeloos: in een
donkere kamer blijft de helderheid rond 0.2 hangen, en dan hoor je niets. Elk
signaal houdt zijn eigen langzaam meelopende bereik bij. Beweging heeft
bovendien een *ruisvloer per zone*, die snel meezakt en bijna niet stijgt — zo
leert elke zone zijn eigen rust (sensorruis, een flikkerende lamp, een gordijn)
zonder omhoog te worden getrokken door echte beweging. Daardoor is stilstaan
écht stil, in elke kamer, met elke camera.

**3. Drie tijdschalen.** Direct (beweging → aanslag), seconden (helderheid →
filter en volume), minuten (kleur → toonsoort, drift). Reageert alles even
snel, dan klinkt alles hetzelfde.

En: **geen nep**. Elke knop hangt aan een echt beeldsignaal. Nergens een
verborgen random-generator die variatie simuleert.

### Signalen uit het beeld

| signaal | hoe | tijdschaal |
|---|---|---|
| beweging per zone | verschil met het vorige frame, per cel in een 8×6 raster | direct |
| bewegingszwaartepunt | waar in beeld het gebeurt | direct |
| drukte | hoeveel zones tegelijk actief zijn | ~1 sec |
| helderheid | gemiddelde luminantie | seconden |
| contrast | spreiding licht/donker | seconden |
| detail | verschil tussen buurpixels (ruwe randdetectie) | seconden |
| kleur | gemiddelde tint + verzadiging | minuten |

### Geluidsmotor

Vaste graph, één keer opgebouwd, nooit nodes maken of slopen tijdens het
draaien — dát is wat een browser laat haperen.

```
bed (3 osc, ontstemd) ┐
stem-pool (8 plucks)  ├→ lowpass → compressor → uit
ruis (later)          ┘         └→ delay
```

Elke stem is een oscillator die eeuwig doorloopt met een dichtgedraaide gain;
aanslaan is alleen de envelope opnieuw zetten. Parameters gaan via
`setTargetAtTime`, dus geen klikjes. De compressor is het vangnet: het kan
nooit knallen, hoe wild je ook beweegt.

## De foto-sequencer (exp-2)

```
kies een geluid → maak een foto → de foto ís het patroon → het loopt
```

Het raster wordt gelezen zoals je leest: linksboven naar rechtsonder, elk
vakje één stap.

| uit de foto | wordt |
|---|---|
| vakje lichter dan het gemiddelde | een aanslag op die stap |
| helderheid van het vakje | toonhoogte |
| kleurigheid van het vakje | hoe hard het aanslaat |
| gemiddelde helderheid van de foto | klankkleur (donkere foto = dof) |
| contrast van de foto | lengte van de klank (hard contrast = kort en strak) |
| kleur van je **eerste** foto | de toonsoort van het hele stuk |

De drempel is het gemiddelde van díe foto — daardoor levert een donkere kamer
net zo goed een patroon op als een zonnige, en valt er nergens iets af te
stellen. Met een vangnet: minstens 2 en hoogstens ~60% van de vakjes klinkt,
zodat een witte muur of een egale mist geen stilte of gehamer oplevert.

Getest met verzonnen beelden: een verloop geeft een diagonaal met stijgende
tonen, een lamp in de hoek een cluster hoge noten, een rommelige kamer een
verstrooid ritme, een egaal vlak precies twee tikken.

Foto's worden op 64×64 bewaard, dus het raster is achteraf om te zetten zonder
opnieuw te fotograferen.

### Richten is spelen

Zodra de camera open staat wordt het live beeld tien keer per seconde gelezen
alsof het al een foto is, en meteen door de sequencer gespeeld — samen met de
sporen die er al staan. Je hóórt dus wat je gaat vastleggen terwijl je nog
beweegt: schuif een lamp in beeld en er komt een noot bij. Het raster over de
zoeker licht mee op, zodat je het patroon ook ziet. De sluiter bevriest alleen
nog wat je al hoorde.

Zolang je nog niet hebt afgedrukt schuift ook de toonsoort mee met de kleur die
je in beeld hebt; bij de eerste sluiterdruk ligt hij vast voor het hele stuk.

### Bediening per spoor

| | |
|---|---|
| het vlak aantikken | spoor tijdelijk uit / weer aan |
| de instrumentnaam | ander geluid, foto blijft staan |
| **foto** | opnieuw fotograferen (annuleren zet het oude patroon terug) |
| **×** | spoor weggooien |

Linksboven in de zoeker staat de camerakeuze — voor- of achtercamera, of welke
webcam dan ook. De knop verschijnt alleen als er meer dan één camera is; namen
worden pas zichtbaar nadat je toestemming hebt gegeven. Jezelf zie je
gespiegeld, de achtercamera niet.

## De fotostudio (exp-3)

Zelfde vertaling van foto naar patroon, andere motor eronder.

**Het speelt door met het scherm op slot.** Web Audio wordt door iOS bevroren
zodra de pagina naar de achtergrond gaat; een `<audio>`-element niet. Dus wordt
de hele lus offline gerenderd naar een WAV en afgespeeld als gewone track,
inclusief titel en foto op je lockscreen.

**Het aantal sporen is gratis.** Wat je hoort is één bestand, of je nu twee of
twintig sporen hebt. Alleen het renderen duurt langer; het afspelen kost altijd
evenveel. Renderen gebeurt op elke wijziging, en de dunne lijn bovenin ademt
zolang dat bezig is.

**Meeluisteren tijdens het richten** gebeurt uit een kleine live AudioContext
naast de plaat. Die twee klokken worden aan elkaar gehaakt: de positie in de
audiotrack bepaalt waar de live-lus staat, en elke ronde wordt de fase
rechtgetrokken. Het spoor dat je fotografeert valt zolang uit de plaat, anders
hoor je het dubbel.

Twee dingen om te weten:

- De uitloop van de laatste noten wordt op het begin teruggevouwen, zodat een
  galmstaart over het naadje heen doorloopt. Een `<audio>`-element lust niet
  gegarandeerd naadloos, dus staat de lus vier keer in het bestand — dan valt
  dat ene naadje eens per vier maten in plaats van elke maat.
- De foto's blijven op 640×640 bewaard en zijn groot te bekijken met het raster
  eroverheen, zodat je ziet welk stuk beeld welke tik is.

## Een foto is een foto (exp-8)

De dobbelsteen uit exp-7 verschoof de uitsnede, verlegde de drempel en draaide
het startpunt van de leesvolgorde. Van die drie was er **niet één te zien**: de
foto bleef precies hetzelfde op je scherm en alleen de blokjes veranderden. Dan
lees je het als "gooi maar wat" — en dan is het net zo goed niet waar dat het
uit het beeld komt, ook al is het dat wel.

Het alternatief was de verschuiving zichtbaar maken door in de foto te zoomen en
te schuiven. Maar dan is een foto geen foto meer. Dus is hij eruit. Wil je een
ander patroon, dan maak je een andere foto: ga dichterbij staan, draai je om,
doe het licht aan. De camera is het enige gereedschap, en dat is precies de
belofte.

Daartegenover staat meer om mee te bouwen:

- **Negen geluiden** in plaats van zes: kick, hihat, clap, bas, pluk, bel, glas,
  pad, drone. Ze delen één generieke stem; het verschil zit in een tabel van
  drie regels per geluid, dus een klank erbij kost niets aan complexiteit.
- **Ruimer toonbereik.** In pianorol spannen vier rijen nu bijna anderhalf
  octaaf en vijf rijen bijna twee, in plaats van steeds één. Een foto gaat
  daarmee ergens heen in plaats van rond te draaien.

### Het raster: machten van twee

Eerst stonden er 3×3, 4×4 en 5×5 in, en dat klopte muzikaal niet. Een vakje is
een zestiende, dus de maatlengte is N² zestienden: 9/16 en 25/16 zijn lussen
zonder voelbare tel, en de melodiesporen (2N stappen) sloten er ook niet op aan
— alleen bij 4×4 viel alles samen.

Machten van twee lossen dat in één klap op:

| raster | ritmespoor | melodiespoor |
|---|---|---|
| 2×2 | 4 stappen = één tel | 4 stappen |
| 4×4 | 16 = één maat | 8 = halve maat |
| 8×8 | 64 = vier maten | 16 = één maat |
| 16×16 | 256 = zestien maten | 32 = twee maten |

Alles deelt op alles, dus sporen sluiten altijd aan en de swing blijft kloppen.

En let op wat er bij groot gebeurt: de **dichtheid blijft gelijk** — een vakje
blijft een zestiende — alleen de **cyclus wordt langer**. Een 16×16 foto is dus
geen ratelende muur maar een lus van zestien maten: ruim een minuut muziek uit
één beeld, die langzaam ontvouwt.

Twee dingen die pas bij een groot raster opvielen en meteen zijn rechtgezet:

- De toonhoogte in pianorol was `rij × 3`, dus bij zestien rijen zou de bovenste
  noot zes octaven hoog liggen. Nu worden de rijen over een vast bereik
  uitgesmeerd — altijd ongeveer anderhalf octaaf, of je nu vier of zestien
  rijen hebt.
- De speelkop wiste elk frame álle vakjes van elk spoor. Bij 16×16 zijn dat
  1024 DOM-bewerkingen per stap. Nu wordt alleen uitgezet wat aan stond.

### Het oplichten draagt de toonhoogte

Eerst had elk klinkend vakje precies hetzelfde wit. Dan zie je geen verschil
tussen die vakjes — terwijl ze muzikaal helemaal niet gelijk zijn, want ze
hebben verschillende toonhoogtes. En als je het verschil niet ziet, hoor je het
ook minder: er is niets om het aan op te hangen.

Nu volgt de felheid de toonhoogte: hoger klinkt, witter. Een pianorol tekent
zichzelf daarmee als een verloop van donker onderin naar licht bovenin, en bij
een ritmespoor zie je terug welke stukken foto de hoge noten waren. De laagste
noot flitst op 0,30 en de hoogste op 0,72 — meer dan het dubbele, dus goed
zichtbaar, terwijl de bovenkant niet feller is geworden dan hij was.

Het waas onder het raster (28% zwart) hoort daarbij: daardoor ligt dat wit
altijd op hetzelfde grijs, of je nu een lamp of een donkere hoek fotografeert.
Zonder dat zou de foto zelf bepalen of je het verschil kunt zien.

### Hoeveel er klinkt hangt af van wat er in het beeld zit

Hier zat een structurele fout. De drempel is relatief — gemiddelde plus een
stukje spreiding — en bij zo'n beetje elke verdeling ligt dan **altijd ongeveer
36% van de vakjes erboven**, wát je ook fotografeert. De plekken van de
aanslagen volgden het beeld, maar het aantal was praktisch constant. Een rijke
foto en een lege foto gaven evenveel tikken, en met een hand voor de lens stond
hij vrolijk sensorruis te rangschikken. Dat is precies waar het nep van wordt.

Gemeten over verzonnen scenes (inclusief een model van de automatische
belichting) zit er een factor honderd tussen "niets" en "iets":

| | spreiding | tikken bij 4×4 |
|---|---|---|
| lens afgeplakt | 0,003 | 0 |
| hand voor de lens | 0,005 | 0 |
| egale lucht | 0,013 | 0 |
| gezicht | 0,036 | 5 |
| lamp in een kamer | 0,065 | 8 |
| raam bij daglicht | 0,328 | 8 |

Dat verschil bepaalt nu hoeveel er mag klinken. Een leeg beeld levert stilte op,
en dat is het eerlijke antwoord: er was niets te horen. Bijkomend voordeel: een
rustige foto klinkt nu ook echt rustig, in plaats van altijd even druk.

### Hoorbaar op een telefoon

Een telefoonspeaker begint pas ergens rond de 500 Hz. Een kick zit onder de 100
en een bas rond de 110 — precies de twee die het fundament moeten leggen waren
daar dus vrijwel niet te horen. Op een koptelefoon klopte het wel, en daar
hebben we de hele tijd naar geluisterd.

Twee onzichtbare ingrepen:

**De kick krijgt een tikje.** Twee milliseconden ruis bovenop de dreun. Dat is
wat je op een klein speakertje hoort als "kick"; op een koptelefoon valt het weg
onder het vel.

**Bas, pad en drone krijgen twee boventonen**, langs het filter heen. Je oor
leidt een grondtoon af uit de *afstand* tussen naast elkaar liggende
boventonen: hoor je 770 en 880 Hz, dan hoor je er 110 Hz bij die er niet is.
Vaste veelvouden werken daar niet voor — bij de laagste basnoot ligt zelfs de
vierde boventoon nog onder de 500 Hz. Dus wordt per noot de eerste boventoon
boven de 700 Hz gezocht, plus zijn buurman:

| noot | grondtoon | boventonen | afstand |
|---|---|---|---|
| laagste | 110 Hz | 770 + 880 | 110 Hz |
| | 147 Hz | 734 + 881 | 147 Hz |
| | 196 Hz | 784 + 980 | 196 Hz |
| hoogste | 262 Hz | 785 + 1047 | 262 Hz |

Op een koptelefoon voegt dat alleen wat body toe.

### Wat er per vakje overblijft

Twee knopjes: **ander geluid** (foto blijft) en **nieuwe foto** (geluid blijft).
Het vakje zelf aantikken dempt het spoor.

Weggooien verschijnt pas als een spoor gedempt is. Dat is geen truc om knoppen
te besparen: dempen ís de bevestiging. Je hebt al gezegd dat je dit niet wilt
horen, dus er valt niets meer na te vragen — en dat dialoogje uit exp-7 kan
weg. In normaal gebruik staat de prullenbak nergens in de weg.

De volgorde volgt de frequentie. Nieuwe foto doe je de hele tijd, ander geluid
af en toe, dempen af en toe, weggooien bijna nooit. Vervangen weghalen (en dan
maar verwijderen-en-opnieuw-maken) zou de meest voorkomende handeling van één
tik naar vier tikken brengen; dat is de verkeerde ruil.

## Terug naar het begin (exp-7)

Na exp-3 t/m exp-6 was de conclusie dat het niet sterker werd maar zwakker. Het
patroon: bijna elk probleem dat werd opgelost, was een probleem dat de vorige
uitbreiding zélf had veroorzaakt. De negen stippen in de zoeker bestonden omdat
de foto het instrument koos; de twee camera's omdat één foto tegelijk instrument
én ritme bepaalde; het invallen op de maatstreep omdat er gerenderd werd; het
renderen omdat het op slot moest doorspelen. Geen van die problemen bestond in
exp-2.

Wat exp-2 goed maakte was niet wat het kon, maar dat het **leesbaar** was: je
kon een foto aankijken en horen wat eruit zou komen. Elke uitbreiding ruilde
leesbaarheid in voor zeggingskracht.

Dus: exp-7 is de vorm van exp-2, met drie dingen uit het lab die zich bewezen
hebben en niets aan de bediening toevoegen.

1. **Zachte begrenzer** — onzichtbaar; lost op dat het klipte zodra er twee
   geluiden tegelijk vielen.
2. **Dobbelsteen** — één knop: lees dezelfde foto anders (verschoven uitsnede,
   andere drempel, gedraaid startpunt). Het enige dat het spelen echt leuker
   maakte.
3. **Pianorol** — bas, bel en pad lezen de foto als kolommen = tijd en rijen =
   toonhoogte, dus vakjes boven elkaar worden een akkoord. Geen knop nodig; het
   volgt uit het instrument.

Bewust niet terug: de foto die zelf het instrument kiest, raster per spoor, twee
foto's per spoor, negen klanken, doorspelen met het scherm op slot, invallen op
de maatstreep. Dat laatste doet pijn, maar op iOS kost het de directheid — en de
directheid ís het werk. Als het ooit een plaat moet worden die doorspeelt, is
dat een ander stuk; `exp-3` en `exp-5` laten zien hoe dat eruitziet.

### Weg en weer terug

Met het scherm uit staat het stil — dat is de prijs van de live motor, en die
keuze is bewust. Maar terugkomen moet wél werken, en dat deed het eerst niet.
Twee oorzaken: iOS bevriest de AudioContext bij het naar de achtergrond gaan en
wil hem lang niet altijd vanzelf weer aanzetten, en de planner probeerde na een
lange pauze de verloren tijd stap voor stap in te halen — duizenden noten in het
verleden, die dan allemaal tegelijk zouden vallen.

Nu haakt hij bij een grote achterstand gewoon opnieuw aan, en wordt de context
hervat bij terugkeren én, als Safari dat weigert, bij je eerstvolgende
aanraking. Daar merk je verder niets van.

De hele vertaling is zes regels:

| uit de foto | wordt |
|---|---|
| vakje lichter dan gemiddeld | een aanslag op die stap |
| helderheid van het vakje | toonhoogte (bij melodische geluiden: de rij) |
| kleurigheid van het vakje | hoe hard het aanslaat |
| gemiddelde helderheid van de foto | klankkleur |
| contrast van de foto | lengte van de klank |
| kleur van je **eerste** foto | de toonsoort van het hele stuk |

## Twee foto's per spoor (exp-6)

In exp-5 hing álles aan één foto: hoe het klinkt én wanneer het klinkt. Dat
voelde als te weinig controle, en terecht — twee losse muzikale beslissingen
zaten vastgeklonken aan één handeling. Vond je een mooi ritme maar wilde je een
kick, dan kon je niets: de camera verplaatsen veranderde allebei tegelijk.

De oplossing is geen instelling maar een tweede foto:

| | |
|---|---|
| **klankfoto** | wélk instrument het wordt (en daarmee het raster en de leeswijze) |
| **ritmefoto** | wannéér het klinkt — en meer ervan achter elkaar zijn de maten |

Een nieuw spoor maak je nog steeds met één foto; die wordt allebei tegelijk. Op
de kaart staan daarna twee camera's: eentje met een golfje (alleen het geluid
opnieuw, je ritme blijft) en eentje met een raster (alleen dit ritme opnieuw,
je geluid blijft). Terwijl je een klankfoto zoekt hoor je je eigen ritme al op
het instrument waar je op dat moment naar wijst.

Linksonder op de kaart zie je de klankfoto met zijn golfje ernaast — dít geluid
kwam uit díe foto.

Verder is het vangnet ruimer gezet: een rustige foto mag nu ook bijna niets
doen (minstens één aanslag in plaats van twee, hoogstens de helft van de vakjes
in plaats van 60%). Vier drukke sporen tegelijk was te veel van het goede.

## De fotolooper (exp-5)

Eén regel: **er valt niets in te stellen.** Wil je een ander geluid, een andere
toon, een ander ritme — dan maak je een andere foto. Dat is de hele bediening.

Wat het beeld bepaalt:

| | |
|---|---|
| welk geluid | contrast × textuur (zie de landkaart hieronder) |
| hoe fijn het raster | fijner beeld → meer stappen per maat |
| hoe het gelezen wordt | lange klanken als pianorol, korte op leesvolgorde |
| welke noten | kleur, op rangorde binnen de foto |
| hoe hard | kleurigheid van het vakje |
| klankkleur en lengte | helderheid en contrast van de foto |
| toonsoort en tempo | je állereerste foto |
| maat na maat | elke volgende foto in een spoor is de volgende maat |

### De landkaart

| | glad | midden | fijn |
|---|---|---|---|
| **egaal** | drone | koor | glas |
| **midden** | bas | pluk | hihat |
| **hard** | kick | bel | clap |

Omlaag = harder licht/donker in beeld, naar rechts = fijnere textuur. Terwijl
je richt zie je negen stippen met daarin waar je staat, dus je kunt er ook
naartoe mikken.

**Waarom niet "donker → laag"?** Dat was de eerste opzet en die werkte niet. De
automatische belichting van een camera trekt élk beeld terug naar ongeveer
middengrijs: richt je op een donkere hoek of op een lamp, dan komt de
gemiddelde helderheid allebei rond 0,45 uit. Met helderheid als as bleken maar
drie van de negen klanken ooit bereikbaar — vandaar dat er nooit een kick uit
kwam. Contrast en textuur overleven die belichting wel, en zijn bovendien
precies waar je op kunt mikken. De textuur wordt gemeten relatief aan het
contrast, anders meet je twee keer hetzelfde.

Alle negen reageren op toonhoogte — bij bas en bel is dat de noot, bij een kick
de stemming van het vel, bij ruis de kleur van de ruis. Eén regel, geen
uitzonderingen.

Wat overblijft aan knoppen: **dobbelsteen** (lees deze foto anders),
**camera** (vervang 'm), **plus** (maat erbij), **dempen**, **weggooien**. Geen
daarvan stelt een klank in; ze gaan alleen over welke foto's er zijn.

### Waarom een looper

exp-4 wilde tegelijk een direct instrument en een plaat die doorspeelt. Dat
botst op iOS: een gedempt `<audio>`-element naast een lopende Web Audio-context
wordt niet als "speelt" gezien, en mag dan bij het vergrendelen niet meer aan.
Dus is hier de keuze gemaakt — dit is een looper. Wat je hoort is altijd de
gerenderde track, en daarom speelt hij door.

De rendertijd wordt muzikaal opgelost in plaats van weggepoetst: **wijzigingen
vallen in op de maatstreep.** De nieuwe versie wordt in een tweede, stille
speler geladen en wacht daar tot de lopende lus rond is. Zo verspringt er nooit
iets midden in een noot, en voelt het wachten als een keuze in plaats van als
hapering. Terwijl je richt hoor je het nieuwe spoor wel meteen, live over de lus
heen.

## Direct én doorspelen (exp-4)

Zolang je in beeld bent hoor je een **live motor**: elke wijziging is meteen
hoorbaar, dempen is een knop en geen wachttijd. Ondertussen wordt er stilletjes
een WAV gerenderd die precies hetzelfde speelt; die loopt gedempt mee en gaat
aan op het moment dat je wegklikt of je scherm vergrendelt. Terug in beeld
neemt de live motor het weer over, op de juiste plek in de maat.

Drie dingen maken het muzikaler zonder de handeling te veranderen:

**Kleur bepaalt de toonhoogte, licht alleen het ritme.** Daarvoor deed
helderheid dubbel werk — een licht vakje klonk én was hoog, dus de melodie was
een bijproduct van het ritme. Nu zijn het twee assen.

De toonhoogte gaat op **rangorde**, niet op absolute kleur. Dat bleek nodig:
een kamer met één lamp heeft overal dezelfde tint en alleen andere helderheid,
en met absolute meting werd dan élke noot dezelfde. Nu worden de klinkende
vakjes op tint gerangschikt en over de ladder uitgesmeerd. Is er werkelijk geen
kleurverschil tussen de klinkende vakjes (mist, nacht, witte muur), dan valt hij
terug op helderheid — anders zou hij sensorruis staan te rangschikken.

**Twee manieren om een foto te lezen.** *Ritme*: leesvolgorde, elk vakje een
stap. *Melodie*: kolommen zijn tijd, rijen zijn toonhoogte — een pianorol, dus
vakjes boven elkaar worden een akkoord.

**Elk spoor zijn eigen raster.** 3×3 (9 stappen) tegen 4×4 (16 stappen) loopt
pas na 144 stappen weer gelijk. Uit stilstaande foto's komt zo eindeloos
schuivende variatie.

En een **dobbelsteen**: dezelfde foto opnieuw lezen met een verschoven uitsnede,
een andere drempel en een gedraaid startpunt. Ander patroon, zelfde beeld, één
tik. Het draaien van het startpunt bleek nodig omdat een foto met één felle vlek
anders bij elke worp bijna hetzelfde opleverde.

## Nog te doen

| # | vraag |
|---|-------|
| `exp-3` | live: textuur/detail → ruislaag, stilte en dynamiek |
| `exp-4` | live: secties die traag wisselen (houdt het een half uur boeiend) |
| `exp-5` | live: het oplossen van het beeld: scherp → blokjes → alleen beweging → zwart |
| `index.html` | alles samen |

## Sleutelen

Bovenin elk bestand staan de knoppen als constanten met uitleg. In `exp-1` zijn
`DREMPEL` (hoeveel beweging een noot vraagt), `RUST_ALLE` (dichtheid) en
`LADDER` (de toonladder) het interessantst om aan te draaien.

## iOS / mobiel

- `<video playsinline muted autoplay>` — zonder `playsinline` gaat Safari fullscreen
- https verplicht (localhost uitgezonderd)
- camera én AudioContext pas ná een echte tap; één tap regelt allebei
- de **zijschakelaar** van een iPhone dempt Web Audio — vandaar de hint op het startscherm
- terug uit de achtergrond: stream én context expliciet hervatten, en het
  bewegingsgeheugen wissen (het 'vorige' frame is dan waardeloos)
