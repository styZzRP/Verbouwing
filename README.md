# 🏠 Project Ons Thuis – Verbouwplanner

Een praktische verbouwplanner voor dagelijks gebruik tijdens de volledige verbouwing.
Gebaseerd op het Ontwerpdocument v1.0.

## Gebruik

Open `index.html` in de browser — meer is er niet nodig. Er is geen installatie,
server of internetverbinding vereist.

Alle gegevens worden automatisch opgeslagen in de browser (localStorage) op het
apparaat waarop je werkt.

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

> Tip: maak af en toe een export, zeker vóór grote wijzigingen. localStorage is
> per browser en per apparaat.
