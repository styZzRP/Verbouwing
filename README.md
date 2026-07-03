# 🏠 Project Ons Thuis – Verbouwplanner

Een praktische verbouwplanner voor dagelijks gebruik tijdens de volledige verbouwing.
Gebaseerd op het Ontwerpdocument v1.0.

## Gebruik

### Op meerdere apparaten (aanbevolen)

Start de meegeleverde mini-server op één apparaat dat aan staat als je werkt
(laptop, NAS, Raspberry Pi…). Vereist alleen [Node.js](https://nodejs.org) —
geen npm-pakketten.

- **Windows**: dubbelklik `start-planner.bat`
- **Mac/Linux**: `./start-planner.sh` (of `node server.js`)

De server toont bij het starten welk adres je op andere apparaten opent,
bijvoorbeeld `http://192.168.1.23:3000` (zelfde wifi-netwerk). Alle gegevens
worden automatisch bewaard in het databasebestand `data/ons-thuis-data.json`
en elke 5 seconden gesynchroniseerd: vink je op de laptop een taak af, dan zie
je dat even later ook op je telefoon.

Rechtsboven in de app zie je de status: **● gesynchroniseerd** of
**● offline – lokaal opgeslagen**. Valt de verbinding weg, dan werkt de app
gewoon door en worden je wijzigingen alsnog verstuurd zodra de server weer
bereikbaar is.

### Via GitHub (overal te gebruiken, geen eigen server nodig)

De app kan ook volledig via GitHub draaien: GitHub Pages host de app en de
planning wordt als bestand in deze repository opgeslagen. Werkt op elk
apparaat met internet, dus ook buitenshuis.

**Eenmalig instellen:**

1. Zet de app op GitHub Pages: repository → *Settings* → *Pages* →
   *Deploy from a branch* → kies je hoofdbranch en `/ (root)`. De app staat
   dan op `https://<gebruikersnaam>.github.io/Verbouwing/`.
2. Maak een token: GitHub → *Settings* → *Developer settings* →
   *Personal access tokens* → *Fine-grained tokens* → *Generate new token*.
   Geef het alleen toegang tot deze repository, met als enige permissie
   **Contents: Read & write**.
3. Open de app, klik rechtsboven op **🔄 Sync** en plak het token. Eigenaar
   en repository worden automatisch ingevuld. Herhaal dit op elk apparaat
   (telefoon, tablet, laptop).

De planning wordt bewaard in `planner-data.json` op de aparte branch
`planner-data` (wordt automatisch aangemaakt). Die branch staat los van je
hoofdbranch, zodat de gegevens niet op de openbare Pages-site belanden en
elke wijziging als commit terug te vinden is — je hebt dus automatisch een
versiegeschiedenis van je hele planning.

> **Let op:** een Pages-site van een privé-repository is bij een gratis
> GitHub-account openbaar bereikbaar (alleen de app zelf, niet je gegevens —
> die staan veilig in de repository en zijn alleen met token te lezen).
> Het token staat opgeslagen in de browser van je eigen apparaten; deel het
> met niemand en geef het nooit meer rechten dan Contents op deze ene
> repository.

De GitHub-sync werkt overigens ook als je `index.html` lokaal opent — de
🔄 Sync-knop is er altijd.

### Op één apparaat, zonder server

Open `index.html` rechtstreeks in de browser. Alles wordt dan lokaal in de
browser opgeslagen (localStorage) op het apparaat waarop je werkt.

## Tabbladen

| Tabblad | Doel |
|---|---|
| **Dashboard** | Totale voortgang, voortgang per verdieping, open taken, taken voor deze week, volgende mijlpaal en "nu oppakken" (taken waar niets meer op wacht). |
| **Planning** | Alle taken per bouwfase met prioriteit, ruimte, wie, data, afhankelijkheden, status, percentage, materiaal en opmerking. Volledig filterbaar. |
| **Mijlpalen** | De 16 grote momenten, af te vinken met datum. |
| **Beslissingen** | Openstaande keuzes met deadline; te late beslissingen krijgen een waarschuwing. |
| **Materialen** | Per ruimte: besteld → binnen → verwerkt. |
| **Budget** | Begroot vs. werkelijk per onderdeel, met automatisch verschil en totalen. |
| **Niet vergeten** | Controlelijsten vóór gips, stuc, vloer en oplevering. |

## Bouwvolgorde-bewaking

Iedere taak kan afhankelijk zijn van andere taken (klik op de kolom
"Afhankelijk van"). De planner laat direct zien:

- ⛔ = deze taak wacht nog op een andere taak;
- ▶ = alle voorgaande taken zijn gereed, deze taak kan opgepakt worden.

Met het filter **"alleen uitvoerbaar"** zie je in één klik wat je nu kunt doen.
De volledige bouwvolgorde uit het ontwerpdocument (fase 0 t/m 6, inclusief
"inloopkast vóór master", "stukadoor komt één keer" en "vloer pas na
schilderwerk") zit als afhankelijkheden in de voorgevulde planning.

## Backup

- **Export**: download alle gegevens als JSON-bestand.
- **Import**: zet een eerder geëxporteerd bestand terug.
- **Reset**: terug naar de standaardplanning uit het ontwerpdocument.

> Tip: maak af en toe een export, zeker vóór grote wijzigingen. Draai je met
> de server, dan is ook een kopietje van `data/ons-thuis-data.json` een
> volledige backup.
