# maas

Werk dat door de rivier wordt gemaakt in plaats van de rivier af te beelden.

De data is de dagelijkse afvoer van de Maas bij Lith, van Open-Meteo (GloFAS).
Geen sleutel, geen server, geen quota van jou: de browser van de bezoeker haalt
het zelf op, want Open-Meteo stuurt `access-control-allow-origin: *` mee.

De reeks loopt van **1 januari 1997 tot vandaag**: 10.825 dagen zonder één gat,
van **42 tot 3613 m³/s**. Daarvoor (1984–1996) is GloFAS leeg. Er zit alles in
wat je nodig hebt: het hoogwater van 9 januari 2011 (3613), de Limburgse ramp van
16 juli 2021 (3250) en de droogte van 20 september 2020 (42).

## Het idee

Niet: afvoer → kleur, afvoer → toonhoogte. Wel: de afvoer drijft een proces aan
dat zijn eigen leven heeft, en je ziet alleen wat dat proces ervan gemaakt heeft.

Daar hoort een truc bij die alles oplost. De staat wordt nergens opgeslagen — hij
is een **zuivere functie van de rivier**. Elke bezoeker rekent de hele
geschiedenis opnieuw door, ziet dertig jaar in een halve minuut gebeuren, en komt
uit op precies hetzelfde beeld als iedereen. Wat 2011 heeft achtergelaten zit er
dus in zonder dat er iets bewaard hoeft te worden, en over een jaar zit dit jaar
er vanzelf ook in.

## Draaien

Het zijn losse pagina's, maar `maas.js` wordt met een relatief pad geladen, dus
via een servertje in plaats van rechtstreeks vanaf schijf:

```sh
cd ~/code/rickvanderwolk.cc
python3 -m http.server 8765
# open http://localhost:8765/maas/lab/exp-3.html
```

Toetsen: `d` zet de cijfers aan, `r` begint opnieuw.

## De experimenten

| # | wat | hoe |
|---|-----|-----|
| `exp-0` | **Erosie, met druppels** | Het eerste model. Waterdruppels met een sedimentlading lopen de helling af, nemen materiaal op waar ze capaciteit hebben en zetten het af waar ze verzadigd raken; elke afzetting wordt met een zachte kwast uitgesmeerd. Organisch van vorm — meanderende geulen, zachte oevers — maar een deel van die schoonheid komt uit die kwast, dus uit een keuze van mij. |
| `exp-1` | **Erosie, met diffusie** | Ander model: geen druppels, maar per cel de afwatering en de plaatselijke helling, `E = K · A^m · S`. Het vertakte patroon is hier geen ontwerp maar een gevolg. En er staat een tweede proces naast: hellingdiffusie, die bij laag water de randen langzaam laat terugzakken — bodemkruip, zoals in het echt. Hoogwater snijdt in, laagwater rondt af. |
| `exp-2` | **Erosie, fel** | Zelfde model, maar de diffusie is eruit gehaald. Gulzig afgesteld (`K 0.030`): diepe geulen en scherpe ruggen. |
| `exp-3` | **Erosie, bedaard** | Als `exp-2`, tien keer minder gulzig (`K 0.003`, `bezinking 0.008`). Er blijft meer van de vlakte staan, en wat er wegslijt heeft de rivier ook echt weggeslepen. |

Nog te bouwen: **regimewisseling** (een reactie-diffusiesysteem waarvan de
afvoer de parameters zet, zodat een hoogwater geen gradueel verschil maakt maar
het patroon van soort laat veranderen) en **de kolonie** (iets dat groeit bij
hoog water, terugtrekt bij droogte, en de lege plekken houdt waar het gestorven
is).

De druppels zien er beter uit, stream-power betekent meer. Dat is de ruil, en
hij is nog niet beslecht — vandaar dat ze er allebei staan.

`exp-1` is teruggehaald uit een oudere sessie: de kern is ongewijzigd zoals hij
toen geschreven is, het omhulsel (canvas, renderlus, data) komt van `exp-2`. Als
pagina heeft die combinatie dus nooit eerder bestaan. De diffusie erin is
onderweg naar `exp-2` gesneuveld, en dat is precies wat de latere versies zo
hoekig maakt.

## Hoe exp-1 tot en met exp-3 werken

De insnijding volgt `E = K · A^m · S`, de stream-power-vergelijking die
geomorfologen gebruiken voor rivierinsnijding: `A` is hoeveel land er op een plek
afwatert, `S` de plaatselijke helling, `m` = 0,5. Daardoor lopen kleine geulen
samen tot grotere, precies zoals in een echt stroomgebied — dat vertakte patroon
is geen ontwerp maar een gevolg.

`K` wordt aangedreven door de rivier, kwadratisch: een hoogwater doet in drie
dagen meer werk dan een droge zomer in drie maanden. Bij lage stand wint de
bezinking en slijten de randen weer af.

Er wordt per week gerekend in plaats van per dag, met de opgetelde arbeid van die
zeven dagen. Fysisch klopt dat (erosie telt op) en het scheelt zeven keer rekenen;
een hoogwater van drie dagen telt nog steeds even zwaar.

## Sleutelen

Bovenin `exp-1.html` tot en met `exp-3.html` staat de kern tussen `// ---- KERN ----` en
`// ---- EINDE KERN ----`. Die is zo geschreven dat je 'm los kunt draaien in
node om af te regelen zonder de pagina te openen:

```js
const html = require('fs').readFileSync('maas/lab/exp-3.html','utf8');
eval(html.split('// ---- KERN ----')[1].split('// ---- EINDE KERN ----')[0]);
const e = maakErosie(192, 20110109, { K: 0.006 });
```

De knoppen: `K` (hoe gulzig hoogwater insnijdt), `bezinking` (hoe hard laagwater
dichtslibt), `ruis` en `helling` (hoe de vlakte eruitziet voordat er water
overheen is gegaan), `blok` (dagen per rekenstap).
