/* ============================================================
   Project Ons Thuis – startgegevens (seed)
   Gebaseerd op Ontwerpdocument v1.0
   ============================================================ */

const DATA_VERSION = 1;
const STORAGE_KEY = 'onsThuisPlanner';

const FASEN = {
  '0': 'Fase 0 · Voorbereiding',
  '1': 'Fase 1 · Begane grond',
  '2': 'Fase 2 · Eerste verdieping',
  '3': 'Fase 3 · Stukadoor',
  '4': 'Fase 4 · Afwerking',
  '5': 'Fase 5 · Trap',
  '6': 'Fase 6 · Washok / bijkeuken',
};

const RUIMTES = [
  'Algemeen', 'Trap', 'Hal beneden', 'Kantoor',
  'Kamer Thijs', 'Kamer Noor', 'Inloopkast', 'Master',
  'Overloop', 'Badkamer', 'Washok', 'Hele woning',
];

// Ruimtes per verdieping (voor voortgang op het dashboard)
const BEGANE_GROND = ['Trap', 'Hal beneden', 'Kantoor', 'Washok'];
const EERSTE_VERDIEPING = ['Kamer Thijs', 'Kamer Noor', 'Inloopkast', 'Master', 'Overloop', 'Badkamer'];

const STATUSSEN = ['Niet gestart', 'Bezig', 'Gereed', 'Wacht op andere taak'];
const PRIORITEITEN = ['Hoog', 'Normaal', 'Laag'];

/* Taak: id, fase, ruimte, taak, prioriteit, wie, start, eind,
         deps (afhankelijk van, lijst met taak-id's), status, pct,
         materiaal, opmerking */
function T(id, fase, ruimte, taak, prioriteit, deps, opts = {}) {
  return {
    id, fase, ruimte, taak, prioriteit,
    wie: opts.wie || 'Zelf',
    start: opts.start || '',
    eind: opts.eind || '',
    deps: deps || [],
    status: opts.status || 'Niet gestart',
    pct: opts.pct || 0,
    materiaal: opts.materiaal || '',
    opmerking: opts.opmerking || '',
  };
}

function seedData() {
  return {
    version: DATA_VERSION,

    /* ---------------- PLANNING ---------------- */
    tasks: [
      // Fase 0 – Voorbereiding
      T('f0-bouwplaats', '0', 'Algemeen', 'Bouwplaats inrichten', 'Hoog', []),
      T('f0-opruimen',   '0', 'Algemeen', 'Opruimen', 'Normaal', []),
      T('f0-opslag',     '0', 'Algemeen', 'Opslag maken', 'Normaal', ['f0-opruimen']),
      T('f0-materiaal',  '0', 'Algemeen', 'Materialen organiseren', 'Normaal', ['f0-opslag']),

      // Fase 1 – Begane grond: nieuwe trap
      T('f1-trap', '1', 'Trap', 'Nieuwe trap plaatsen', 'Hoog', ['f0-bouwplaats']),

      // Fase 1 – Hal beneden (direct na de trap; stucklaar, nog niet stucen/schilderen)
      T('f1-hal-water',    '1', 'Hal beneden', 'Waterleidingen aanleggen', 'Hoog', ['f1-trap']),
      T('f1-hal-elektra',  '1', 'Hal beneden', 'Nieuwe elektra aanleggen', 'Hoog', ['f1-trap']),
      T('f1-hal-plafond',  '1', 'Hal beneden', 'Plafond maken', 'Normaal', ['f1-hal-water', 'f1-hal-elektra']),
      T('f1-hal-gips',     '1', 'Hal beneden', 'Gipsplaten aanbrengen', 'Normaal', ['f1-hal-plafond'],
        { opmerking: 'Eerst checklist "Voor gips" afwerken!' }),
      T('f1-hal-stucklaar','1', 'Hal beneden', 'Stucklaar maken', 'Normaal', ['f1-hal-gips'],
        { opmerking: 'Nog NIET stucen of schilderen – stukadoor komt één keer (fase 3).' }),

      // Fase 1 – Nieuw kantoor
      T('f1-kantoor-wand',     '1', 'Kantoor', 'Wand plaatsen', 'Hoog', ['f1-hal-stucklaar']),
      T('f1-kantoor-kozijn',   '1', 'Kantoor', 'Kozijn plaatsen', 'Normaal', ['f1-kantoor-wand']),
      T('f1-kantoor-deur',     '1', 'Kantoor', 'Deur plaatsen', 'Normaal', ['f1-kantoor-kozijn']),
      T('f1-kantoor-elektra',  '1', 'Kantoor', 'Elektra aanleggen', 'Hoog', ['f1-kantoor-wand']),
      T('f1-kantoor-gips',     '1', 'Kantoor', 'Gipsplaten aanbrengen', 'Normaal', ['f1-kantoor-elektra', 'f1-kantoor-kozijn'],
        { opmerking: 'Eerst checklist "Voor gips" afwerken!' }),
      T('f1-kantoor-stucklaar','1', 'Kantoor', 'Stucklaar maken', 'Normaal', ['f1-kantoor-gips'],
        { opmerking: 'Mijlpaal: begane grond stucklaar.' }),

      // Fase 2 – Kamer Thijs
      T('f2-thijs-sloop',    '2', 'Kamer Thijs', 'Sloop- en breekwerk', 'Hoog', ['f1-kantoor-stucklaar']),
      T('f2-thijs-elektra',  '2', 'Kamer Thijs', 'Elektra aanpassen', 'Hoog', ['f2-thijs-sloop']),
      T('f2-thijs-gips',     '2', 'Kamer Thijs', 'Gipsplaten aanbrengen', 'Normaal', ['f2-thijs-elektra']),
      T('f2-thijs-stucklaar','2', 'Kamer Thijs', 'Stucklaar maken', 'Normaal', ['f2-thijs-gips']),
      T('f2-thijs-stuc',     '2', 'Kamer Thijs', 'Stucen', 'Normaal', ['f2-thijs-stucklaar'],
        { opmerking: 'Kamer wordt eerder afgewerkt zodat kinderen kunnen verhuizen.' }),
      T('f2-thijs-schilder', '2', 'Kamer Thijs', 'Schilderen', 'Normaal', ['f2-thijs-stuc']),
      T('f2-thijs-vloer',    '2', 'Kamer Thijs', 'Vloer leggen', 'Normaal', ['f2-thijs-schilder'],
        { opmerking: 'Vloer pas na schilderwerk. Mijlpaal: Kamer Thijs gereed.' }),

      // Fase 2 – Kamer Noor
      T('f2-noor-sloop',    '2', 'Kamer Noor', 'Sloop- en breekwerk', 'Hoog', ['f2-thijs-vloer']),
      T('f2-noor-elektra',  '2', 'Kamer Noor', 'Elektra aanpassen', 'Hoog', ['f2-noor-sloop']),
      T('f2-noor-gips',     '2', 'Kamer Noor', 'Gipsplaten aanbrengen', 'Normaal', ['f2-noor-elektra']),
      T('f2-noor-stucklaar','2', 'Kamer Noor', 'Stucklaar maken', 'Normaal', ['f2-noor-gips']),
      T('f2-noor-stuc',     '2', 'Kamer Noor', 'Stucen', 'Normaal', ['f2-noor-stucklaar']),
      T('f2-noor-schilder', '2', 'Kamer Noor', 'Schilderen', 'Normaal', ['f2-noor-stuc']),
      T('f2-noor-vloer',    '2', 'Kamer Noor', 'Vloer leggen', 'Normaal', ['f2-noor-schilder'],
        { opmerking: 'Mijlpaal: Kamer Noor gereed → kinderkamers verhuizen.' }),

      // Fase 2 – Inloopkast (vóór de master, i.v.m. sloopwerk en puinafvoer)
      T('f2-ik-doorbreken','2', 'Inloopkast', 'Muur doorbreken', 'Hoog', ['f2-noor-vloer'],
        { opmerking: 'Inloopkast vóór afwerking master: voorkomt schade door sloop en puin.' }),
      T('f2-ik-puin',      '2', 'Inloopkast', 'Puin afvoeren', 'Hoog', ['f2-ik-doorbreken']),
      T('f2-ik-wanden',    '2', 'Inloopkast', 'Nieuwe wanden plaatsen', 'Normaal', ['f2-ik-puin']),
      T('f2-ik-balken',    '2', 'Inloopkast', 'Balken plaatsen', 'Normaal', ['f2-ik-wanden']),
      T('f2-ik-plafond',   '2', 'Inloopkast', 'Plafondconstructie maken', 'Normaal', ['f2-ik-balken']),
      T('f2-ik-elektra',   '2', 'Inloopkast', 'Elektra aanleggen', 'Hoog', ['f2-ik-plafond']),
      T('f2-ik-gips',      '2', 'Inloopkast', 'Gipsplaten aanbrengen', 'Normaal', ['f2-ik-elektra'],
        { opmerking: 'Eerst checklist "Voor gips" afwerken!' }),
      T('f2-ik-stucklaar', '2', 'Inloopkast', 'Stucklaar maken', 'Normaal', ['f2-ik-gips']),
      T('f2-ik-stuc',      '2', 'Inloopkast', 'Stucen', 'Normaal', ['f2-ik-stucklaar']),
      T('f2-ik-schilder',  '2', 'Inloopkast', 'Schilderen', 'Normaal', ['f2-ik-stuc']),
      T('f2-ik-vloer',     '2', 'Inloopkast', 'Vloer leggen', 'Normaal', ['f2-ik-schilder']),
      T('f2-ik-verlicht',  '2', 'Inloopkast', 'Verlichting monteren', 'Normaal', ['f2-ik-schilder']),
      T('f2-ik-kasten',    '2', 'Inloopkast', 'IKEA-kasten opbouwen', 'Normaal', ['f2-ik-vloer'],
        { materiaal: 'IKEA PAX', opmerking: 'Mijlpaal: inloopkast gereed → kleding verhuizen.' }),

      // Fase 2 – Master (pas nadat de inloopkast gereed is)
      T('f2-ma-koof',     '2', 'Master', 'Koof schoorsteen maken', 'Normaal', ['f2-ik-kasten']),
      T('f2-ma-airco',    '2', 'Master', 'Airco plaatsen', 'Normaal', ['f2-ma-koof'],
        { opmerking: 'Beslissing "positie airco" moet eerst genomen zijn.' }),
      T('f2-ma-afwerking','2', 'Master', 'Afwerking (stuc, schilderen, vloer)', 'Normaal', ['f2-ma-airco'],
        { opmerking: 'Mijlpaal: master gereed → master verhuizen.' }),

      // Fase 2 – Overloop (incl. vlizotrap)
      T('f2-ov-vlizo',    '2', 'Overloop', 'Vlizotrap plaatsen', 'Normaal', ['f2-ma-afwerking']),
      T('f2-ov-paneel',   '2', 'Overloop', 'Slim paneel monteren', 'Normaal', ['f2-ov-vlizo'],
        { opmerking: 'Beslissing "plaats slim paneel" moet eerst genomen zijn.' }),
      T('f2-ov-zonwering','2', 'Overloop', 'Automatische zonwering monteren', 'Laag', ['f2-ov-vlizo']),
      T('f2-ov-elektra',  '2', 'Overloop', 'Elektra aanleggen', 'Hoog', ['f2-ov-vlizo']),
      T('f2-ov-gips',     '2', 'Overloop', 'Gipsplaten aanbrengen', 'Normaal', ['f2-ov-elektra'],
        { opmerking: 'Eerst checklist "Voor gips" afwerken!' }),
      T('f2-ov-afwerking','2', 'Overloop', 'Afwerking', 'Normaal', ['f2-ov-gips']),

      // Fase 2 – Badkamer boven: ruwbouw
      T('f2-bk-wanden',  '2', 'Badkamer', 'Twee nieuwe wanden plaatsen', 'Hoog', ['f2-ov-gips']),
      T('f2-bk-douchewand','2', 'Badkamer', 'Wand inloopdouche plaatsen', 'Hoog', ['f2-bk-wanden']),
      T('f2-bk-balklaag','2', 'Badkamer', 'Balklaag maken', 'Normaal', ['f2-bk-douchewand']),
      T('f2-bk-plafond', '2', 'Badkamer', 'Plafondconstructie maken', 'Normaal', ['f2-bk-balklaag']),

      // Fase 2 – Badkamer boven: installaties
      T('f2-bk-water',    '2', 'Badkamer', 'Waterleidingen aanleggen', 'Hoog', ['f2-bk-plafond']),
      T('f2-bk-afvoer',   '2', 'Badkamer', 'Afvoer aanleggen', 'Hoog', ['f2-bk-plafond']),
      T('f2-bk-reservoir','2', 'Badkamer', 'Inbouwreservoir plaatsen', 'Hoog', ['f2-bk-afvoer']),
      T('f2-bk-kranen',   '2', 'Badkamer', 'Inbouwkranen plaatsen', 'Hoog', ['f2-bk-water'],
        { opmerking: 'Beslissing "merk inbouwkranen" moet eerst genomen zijn.' }),
      T('f2-bk-regendouche','2', 'Badkamer', 'Inbouwregendouche plaatsen', 'Normaal', ['f2-bk-kranen']),
      T('f2-bk-goot',     '2', 'Badkamer', 'Douchegoot plaatsen', 'Normaal', ['f2-bk-afvoer'],
        { opmerking: 'Beslissing "douchegoot" moet eerst genomen zijn.' }),
      T('f2-bk-nis',      '2', 'Badkamer', 'Nis maken', 'Normaal', ['f2-bk-douchewand']),
      T('f2-bk-ventilatie','2', 'Badkamer', 'Ventilatie aanleggen', 'Normaal', ['f2-bk-plafond']),
      T('f2-bk-spiegelverl','2', 'Badkamer', 'Spiegelverlichting voorbereiden', 'Normaal', ['f2-bk-plafond']),
      T('f2-bk-stopcontact','2', 'Badkamer', 'Stopcontacten aanleggen', 'Normaal', ['f2-bk-plafond'],
        { opmerking: 'Mogelijkheid vloerverwarming openhouden (beslissing).' }),

      // Fase 2 – Badkamer boven: naar tegelklaar
      T('f2-bk-cement',   '2', 'Badkamer', 'Cementplaten aanbrengen', 'Hoog',
        ['f2-bk-reservoir', 'f2-bk-regendouche', 'f2-bk-goot', 'f2-bk-nis', 'f2-bk-ventilatie', 'f2-bk-spiegelverl', 'f2-bk-stopcontact']),
      T('f2-bk-waterdicht','2', 'Badkamer', 'Waterdichting aanbrengen', 'Hoog', ['f2-bk-cement']),
      T('f2-bk-kimband',  '2', 'Badkamer', 'Kimband aanbrengen', 'Hoog', ['f2-bk-waterdicht'],
        { opmerking: 'Mijlpaal: badkamer tegelklaar.' }),
      T('f2-bk-tegels',   '2', 'Badkamer', 'Tegelwerk (uitbesteed)', 'Hoog', ['f2-bk-kimband'],
        { wie: 'Tegelzetter', opmerking: 'Beslissing "badkamertegels" moet eerst genomen zijn.' }),

      // Fase 2 – Badkamer boven: na het tegelwerk (sanitair zelf monteren)
      T('f2-bk-glaswand','2', 'Badkamer', 'Douchewand (glas) monteren', 'Normaal', ['f2-bk-tegels']),
      T('f2-bk-toilet',  '2', 'Badkamer', 'Toilet monteren', 'Hoog', ['f2-bk-tegels']),
      T('f2-bk-meubel',  '2', 'Badkamer', 'Badkamermeubel monteren', 'Normaal', ['f2-bk-tegels']),
      T('f2-bk-spiegel', '2', 'Badkamer', 'Spiegel monteren', 'Normaal', ['f2-bk-meubel']),
      T('f2-bk-kranen2', '2', 'Badkamer', 'Kranen afmonteren', 'Normaal', ['f2-bk-meubel']),
      T('f2-bk-kitten',  '2', 'Badkamer', 'Kitwerk', 'Normaal', ['f2-bk-glaswand', 'f2-bk-toilet', 'f2-bk-kranen2']),
      T('f2-bk-verlicht','2', 'Badkamer', 'Verlichting monteren', 'Normaal', ['f2-bk-tegels'],
        { opmerking: 'Mijlpaal: badkamer gereed.' }),

      // Fase 3 – Stukadoor (komt één keer voor de volledige woning)
      T('f3-stukadoor', '3', 'Hele woning', 'Stukadoor: volledige woning stucen', 'Hoog',
        ['f1-hal-stucklaar', 'f1-kantoor-stucklaar', 'f2-ov-afwerking', 'f2-bk-kimband'],
        { wie: 'Stukadoor', opmerking: 'Eén keer voor alles. Eerst checklist "Voor stuc" afwerken. Mijlpaal: stukadoor gereed.' }),

      // Fase 4 – Afwerking (volgorde: schilderen → vloer → plinten → schakelmateriaal → verlichting)
      T('f4-schilderen','4', 'Hele woning', 'Schilderen', 'Hoog', ['f3-stukadoor']),
      T('f4-vloer',     '4', 'Hele woning', 'PVC / vloerbedekking leggen', 'Hoog', ['f4-schilderen'],
        { opmerking: 'Vloeren pas na schilderwerk. Eerst checklist "Voor vloer" afwerken.' }),
      T('f4-plinten',   '4', 'Hele woning', 'Plinten plaatsen', 'Normaal', ['f4-vloer']),
      T('f4-schakel',   '4', 'Hele woning', 'Schakelmateriaal monteren', 'Normaal', ['f4-schilderen']),
      T('f4-verlicht',  '4', 'Hele woning', 'Verlichting monteren', 'Normaal', ['f4-schilderen'],
        { opmerking: 'Beslissing "verlichting" moet eerst genomen zijn.' }),

      // Fase 5 – Trap
      T('f5-bekleding','5', 'Trap', 'Trapbekleding aanbrengen', 'Normaal', ['f4-vloer'],
        { opmerking: 'Beslissing "trapbekleding" moet eerst genomen zijn.' }),
      T('f5-leuning',  '5', 'Trap', 'Trapleuning monteren', 'Normaal', ['f5-bekleding'],
        { opmerking: 'Mijlpaal: trap volledig gereed.' }),

      // Fase 6 – Begane grond badkamer → washok / bijkeuken
      T('f6-sloop',     '6', 'Washok', 'Oude badkamer slopen', 'Hoog', ['f2-bk-kitten'],
        { opmerking: 'Pas slopen als de nieuwe badkamer boven werkt.' }),
      T('f6-plafond',   '6', 'Washok', 'Plafond maken', 'Normaal', ['f6-sloop']),
      T('f6-tegels',    '6', 'Washok', 'Eventueel tegels aanbrengen', 'Laag', ['f6-plafond']),
      T('f6-kasten',    '6', 'Washok', 'Kasten plaatsen', 'Normaal', ['f6-tegels']),
      T('f6-wasmachine','6', 'Washok', 'Wasmachine aansluiten', 'Normaal', ['f6-kasten']),
      T('f6-droger',    '6', 'Washok', 'Droger aansluiten', 'Normaal', ['f6-kasten']),
      T('f6-afwerking', '6', 'Washok', 'Afwerking', 'Normaal', ['f6-wasmachine', 'f6-droger'],
        { opmerking: 'Mijlpaal: washok gereed → Project Ons Thuis afgerond!' }),
    ],

    /* ---------------- MIJLPALEN ---------------- */
    milestones: [
      { id: 'm01', naam: 'Bouwplaats ingericht', datum: '', gereed: false },
      { id: 'm02', naam: 'Nieuwe trap geplaatst', datum: '', gereed: false },
      { id: 'm03', naam: 'Begane grond stucklaar', datum: '', gereed: false },
      { id: 'm04', naam: 'Kamer Thijs gereed', datum: '', gereed: false },
      { id: 'm05', naam: 'Kamer Noor gereed', datum: '', gereed: false },
      { id: 'm06', naam: 'Kinderkamers verhuisd', datum: '', gereed: false },
      { id: 'm07', naam: 'Inloopkast gereed', datum: '', gereed: false },
      { id: 'm08', naam: 'Kleding verhuisd', datum: '', gereed: false },
      { id: 'm09', naam: 'Master gereed', datum: '', gereed: false },
      { id: 'm10', naam: 'Master verhuisd', datum: '', gereed: false },
      { id: 'm11', naam: 'Badkamer tegelklaar', datum: '', gereed: false },
      { id: 'm12', naam: 'Stukadoor gereed', datum: '', gereed: false },
      { id: 'm13', naam: 'Badkamer gereed', datum: '', gereed: false },
      { id: 'm14', naam: 'Trap volledig gereed', datum: '', gereed: false },
      { id: 'm15', naam: 'Washok gereed', datum: '', gereed: false },
      { id: 'm16', naam: 'Project Ons Thuis afgerond', datum: '', gereed: false },
    ],

    /* ---------------- BESLISSINGEN ----------------
       koppeling: 'taak:<id>' of 'fase:<nr>' — zodra die taak of fase aan de
       beurt is, verschijnt op het dashboard "Let op: beslissing maken". */
    decisions: [
      { id: 'b01', onderdeel: 'Badkamer', beslissing: 'Type vloerverwarming badkamer', koppeling: 'taak:f2-bk-cement', deadline: '', status: 'Open', opmerking: 'Mogelijkheid openhouden tijdens ruwbouw.' },
      { id: 'b02', onderdeel: 'Badkamer', beslissing: 'Merk inbouwkranen', koppeling: 'taak:f2-bk-kranen', deadline: '', status: 'Open', opmerking: 'Nodig vóór installatiefase badkamer.' },
      { id: 'b03', onderdeel: 'Badkamer', beslissing: 'Douchegoot', koppeling: 'taak:f2-bk-goot', deadline: '', status: 'Open', opmerking: '' },
      { id: 'b04', onderdeel: 'Badkamer', beslissing: 'Badkamertegels', koppeling: 'taak:f2-bk-tegels', deadline: '', status: 'Open', opmerking: 'Nodig vóór het uitbestede tegelwerk.' },
      { id: 'b05', onderdeel: 'Hele woning', beslissing: 'Verlichting', koppeling: 'taak:f4-verlicht', deadline: '', status: 'Open', opmerking: '' },
      { id: 'b06', onderdeel: 'Trap', beslissing: 'Trapbekleding', koppeling: 'taak:f5-bekleding', deadline: '', status: 'Open', opmerking: '' },
      { id: 'b07', onderdeel: 'Master', beslissing: 'Positie airco', koppeling: 'taak:f2-ma-airco', deadline: '', status: 'Open', opmerking: 'Nodig vóór koof schoorsteen / afwerking master.' },
      { id: 'b08', onderdeel: 'Overloop', beslissing: 'Plaats slim paneel', koppeling: 'taak:f2-ov-paneel', deadline: '', status: 'Open', opmerking: '' },
      { id: 'b09', onderdeel: 'Hele woning', beslissing: 'Kleur binnendeuren', koppeling: 'fase:4', deadline: '', status: 'Open', opmerking: '' },
    ],

    /* ---------------- MATERIALEN ---------------- */
    materials: [
      { id: 'mt01', ruimte: 'Hal beneden', materiaal: 'Gipsplaten', aantal: '', besteld: false, binnen: false, verwerkt: false, opmerking: '' },
      { id: 'mt02', ruimte: 'Kantoor', materiaal: 'Kozijn + deur', aantal: '1', besteld: false, binnen: false, verwerkt: false, opmerking: '' },
      { id: 'mt03', ruimte: 'Inloopkast', materiaal: 'IKEA PAX kasten', aantal: '', besteld: false, binnen: false, verwerkt: false, opmerking: '' },
      { id: 'mt04', ruimte: 'Badkamer', materiaal: 'Cementplaten', aantal: '', besteld: false, binnen: false, verwerkt: false, opmerking: '' },
      { id: 'mt05', ruimte: 'Badkamer', materiaal: 'Waterdichting + kimband', aantal: '', besteld: false, binnen: false, verwerkt: false, opmerking: '' },
      { id: 'mt06', ruimte: 'Badkamer', materiaal: 'Inbouwreservoir', aantal: '1', besteld: false, binnen: false, verwerkt: false, opmerking: '' },
      { id: 'mt07', ruimte: 'Badkamer', materiaal: 'Inbouwkranen + regendouche', aantal: '', besteld: false, binnen: false, verwerkt: false, opmerking: 'Wacht op beslissing merk.' },
      { id: 'mt08', ruimte: 'Badkamer', materiaal: 'Douchegoot', aantal: '1', besteld: false, binnen: false, verwerkt: false, opmerking: 'Wacht op beslissing.' },
      { id: 'mt09', ruimte: 'Badkamer', materiaal: 'Tegels', aantal: '', besteld: false, binnen: false, verwerkt: false, opmerking: 'Wacht op beslissing.' },
      { id: 'mt10', ruimte: 'Overloop', materiaal: 'Vlizotrap', aantal: '1', besteld: false, binnen: false, verwerkt: false, opmerking: '' },
      { id: 'mt11', ruimte: 'Hele woning', materiaal: 'PVC / vloerbedekking', aantal: '', besteld: false, binnen: false, verwerkt: false, opmerking: '' },
      { id: 'mt12', ruimte: 'Trap', materiaal: 'Trapbekleding', aantal: '', besteld: false, binnen: false, verwerkt: false, opmerking: 'Wacht op beslissing.' },
    ],

    /* ---------------- BUDGET ---------------- */
    budget: [
      { id: 'bu01', onderdeel: 'Trap', begroot: 0, werkelijk: 0 },
      { id: 'bu02', onderdeel: 'Hal beneden', begroot: 0, werkelijk: 0 },
      { id: 'bu03', onderdeel: 'Kantoor', begroot: 0, werkelijk: 0 },
      { id: 'bu04', onderdeel: 'Kamer Thijs', begroot: 0, werkelijk: 0 },
      { id: 'bu05', onderdeel: 'Kamer Noor', begroot: 0, werkelijk: 0 },
      { id: 'bu06', onderdeel: 'Inloopkast', begroot: 0, werkelijk: 0 },
      { id: 'bu07', onderdeel: 'Master', begroot: 0, werkelijk: 0 },
      { id: 'bu08', onderdeel: 'Overloop', begroot: 0, werkelijk: 0 },
      { id: 'bu09', onderdeel: 'Badkamer', begroot: 0, werkelijk: 0 },
      { id: 'bu10', onderdeel: 'Stukadoor', begroot: 0, werkelijk: 0 },
      { id: 'bu11', onderdeel: 'Afwerking', begroot: 0, werkelijk: 0 },
      { id: 'bu12', onderdeel: 'Washok', begroot: 0, werkelijk: 0 },
    ],

    /* ---------------- NIET VERGETEN ---------------- */
    checklists: [
      {
        id: 'c1', titel: 'Voor gips',
        items: [
          { id: 'c1a', tekst: 'Leidingen getest', af: false },
          { id: 'c1b', tekst: 'Elektra getest', af: false },
          { id: 'c1c', tekst: "Foto's gemaakt van leidingwerk", af: false },
          { id: 'c1d', tekst: 'Airco gecontroleerd', af: false },
          { id: 'c1e', tekst: 'Loze leidingen geplaatst', af: false },
        ],
      },
      {
        id: 'c2', titel: 'Voor stuc',
        items: [
          { id: 'c2a', tekst: 'Hoekprofielen geplaatst', af: false },
          { id: 'c2b', tekst: 'Alles stucklaar', af: false },
          { id: 'c2c', tekst: 'Controle uitgevoerd', af: false },
        ],
      },
      {
        id: 'c3', titel: 'Voor vloer',
        items: [
          { id: 'c3a', tekst: 'Schilderwerk klaar', af: false },
          { id: 'c3b', tekst: 'Kozijnen geplaatst', af: false },
          { id: 'c3c', tekst: 'Plafond gereed', af: false },
        ],
      },
      {
        id: 'c4', titel: 'Voor oplevering',
        items: [
          { id: 'c4a', tekst: 'Airco getest', af: false },
          { id: 'c4b', tekst: 'Verlichting getest', af: false },
          { id: 'c4c', tekst: 'Rookmelders getest', af: false },
          { id: 'c4d', tekst: 'Schakelmateriaal gecontroleerd', af: false },
        ],
      },
    ],
  };
}
