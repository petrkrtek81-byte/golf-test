/* =======================================================================
   GOLF CLUB TEPLICE – skript webu (společný pro všechny stránky)
   Každá část si nejdřív ověří, že na stránce má své prvky – jinak se přeskočí.
   Část A: DATA (zde se upravuje obsah aktualit, jamek, turnajů, galerie…)
   Část B: LOGIKA (animace, modaly, mapa, galerie…)
   ======================================================================= */
(async () => {
'use strict';

/* -----------------------------------------------------------------------
   A. DATA
   ----------------------------------------------------------------------- */
const RES_URL   = 'https://rezervace.golf-teplice.cz/rezervace';
const IMG       = 'assets/img/';         // fotky v plném rozlišení
const THUMB     = 'assets/img/thumbs/';  // náhledy 800 px (galerie, karty aktualit)
const HOLE_IMG  = 'assets/hriste/';
const PARTNER_IMG = 'assets/partneri/';
const CGF_URL   = 'https://www.cgf.cz/cz/turnaje/turnaje-vyhledavani';
const FORM_ENDPOINT = 'kontakt.php'; // PHP skript na hostingu, který odešle formulář e-mailem // TODO: odkaz na konkrétní turnaj v systému ČGF

/* Obsah, který se mění přes administraci (admin.php), je v souboru data/obsah.json:
   aktuality, slider, ceník, trenéři, turnaje, fotogalerie a partneři.
   Soubory fotek: holý název = assets/img/…, cesta se lomítkem (uploads/img/…) = nahráno administrací. */
let NEWS = [];          // aktuality (seřadí se od nejnovější)
let SLIDES = [];        // fotky v úvodním slideru
let PRICES = null;      // ceník
let COACHES = [];       // trenéři (jen aktivní)
let TOURNAMENTS = [];   // turnaje
let TOURNAMENTS_PUBLISHED = false; // false → místo seznamu „Kalendář turnajů připravujeme“
let GALLERY = [];       // fotogalerie (w/h = rozměry fotky, rezervuje místo v masonry)
let PARTNERS = [];      // partneři (logo = soubor v assets/partneri/ nebo cesta uploads/…)
const NEWS_INITIAL = 5; // kolik karet je vidět před kliknutím na „Zobrazit starší“
const NEWS_FALLBACK_IMG = '99690585.jpg'; // fotka pro aktualitu bez vlastní fotky

/* Jamky – x/y = pozice čísla jamky v mapa.png (v %), hcp = [1.–9., 10.–18.]
   yellow = žlutá odpaliště (muži), red = červená (ženy). */
const HOLES = [
  { n: 1, par: 4, hcp: [9, 10], yellow: 305, red: 261, x: 16.0, y: 38.8,
    desc: 'Na začátek nic na rozehrání – dog-leg doleva s autem a vodou na pravé straně a středně velký green.',
    scratch: 'Se sebedůvěrou v dřeva můžete zkusit ránu 220–250 m přes levý roh fairwaye. Druhá rána nebude tak obtížná, ale chce to přesnost; případný chip by neměl být problém. Green je relativně malý, takže i jeden putt do paru by mohl vyjít.',
    bogey: 'Klidně dvakrát železo 7, wedge do greenu a buď 2 putty, nebo chip a putt.' },
  { n: 2, par: 4, hcp: [13, 14], yellow: 318, red: 281, x: 24.1, y: 51.1,
    desc: 'Vzdálenostně ne příliš obtížná jamka. Rozhodující je drive, kdy je nutné přehrát asi 150 m vody.',
    scratch: 'Po drivu na poměrně širokou fairway se dlouzí hráči mohou dostat druhou ranou na green, krátký pokus ale trestá voda asi 50 m před greenem.',
    bogey: 'Rozhodující je úvodní rána, ale i z drop zóny se dá s velkou pravděpodobností bogey uhrát – v praxi z drop zóny před vodou kvalitní wedge do greenu a pak putt–putt či chip–putt.' },
  { n: 3, par: 5, hcp: [1, 2], yellow: 465, red: 367, x: 51.8, y: 64.8,
    desc: 'Poměrně obtížný pravý dog-leg, hlavně pro praváky, protože se celá jamka svažuje zleva doprava. Green je umístěn ve strmém svahu.',
    scratch: 'Lepší je kratší a přesnější první rána železem 5 až 7. Druhá musí být velmi přesná – chyby trestá dlouhý odskok míče z kopce dolů.',
    bogey: 'Po nepovedeném drivu je obtížné přehrát druhou ranou až na fairway, většinou to končí ztrátou. Menší score přinese hra až na výhled a přesná krátká rána na green.' },
  { n: 4, par: 3, hcp: [5, 6], yellow: 128, red: 128, x: 75.7, y: 76.2,
    desc: 'Krátká PAR 3 o délce 128 m ze žlutých i červených odpališť. Podrobný popis jamky připravujeme.', // TODO: popis jamky 4
    scratch: null, bogey: null },
  { n: 5, par: 4, hcp: [15, 16], yellow: 303, red: 275, x: 80.6, y: 60.1,
    desc: 'Krásná jamka do protisvahu – na pravé straně nepříjemný aut, vlevo nebezpečný rough, ve kterém se míč nedá najít.',
    scratch: 'Pozor u drivu na slice – zaručeně skončí v autu. Totéž platí o druhé ráně; kratší druhou ránu lze nahradit nepříliš těžkou příhrou.',
    bogey: 'Na 150 m čekají na vaše kratší rány dva hluboké bunkery a samozřejmě aut vpravo. Do greenu je lepší hrát zprava – těsně vlevo před ním čeká záludný bunker.' },
  { n: 6, par: 4, hcp: [17, 18], yellow: 285, red: 257, x: 77.6, y: 47.8,
    desc: 'Nepříliš těžká jamka s autem těsně za greenem.',
    scratch: 'Dlouhý drive přinese velkou šanci na birdie. Pozor na aut za greenem – topnuté míče tam zaručeně skončí.',
    bogey: 'Nebezpečná mez vlevo s nepříjemným roughem a hluboký bunker vlevo za greenem.' },
  { n: 7, par: 4, hcp: [3, 4], yellow: 329, red: 286, x: 86.3, y: 38.3,
    desc: 'Na první pohled jednoduchá jamka, na druhý je už vidět řada nástrah – nepříjemný horizont a odkloněný green s řadou bunkerů.',
    scratch: 'Problém nastává pouze při kratším drivu – pak musíte dlouhou ranou do greenu a riskujete vysoký rough blízko greenu či aut těsně za ním.',
    bogey: 'Pro rovné hráče by to neměl být problém. Platí: raději kratší a přesnější.' },
  { n: 8, par: 5, hcp: [7, 8], yellow: 496, red: 428, x: 73.2, y: 18.9,
    desc: 'Nejtěžší jamka devítky, obtížná především svou délkou. Hra některých hráčů tu připomíná spíše boj s větrnými mlýny.',
    scratch: 'Základem úspěchu je dlouhý a dobře umístěný drive, protože i následující rána by měla být dřevem. Pozor na dva hluboké fairway bunkery asi 50 m před greenem. Green je ale dost velký, takže dobrou příhrou se dá hodně zachránit.',
    bogey: 'Pozor především na slice – rány pak končí ve velmi nepříjemném roughu.' },
  { n: 9, par: 3, hcp: [11, 12], yellow: 111, red: 111, x: 39.1, y: 16.9,
    desc: 'Krátká jamka na závěr, čímž byste se ale neměli nechat ukolébat. Problémy způsobuje i hustý rough podél celé jamky.',
    scratch: 'Pokud zasáhnete green, není co řešit. Pozor na bunker za greenem – dělá velké problémy i dobrým hráčům.',
    bogey: 'Pozor na topnuté míče, většinou končí v již zmiňovaném bunkeru za greenem.' }
];
/* Pozn.: délky jamek jsou z původního webu (stav před přeměřením 2025). Jamka 6 má 285 m –
   starý web uváděl u jamky 6 chybně 278 m, se kterými by součet 1–9 nedával uváděných 2 740 m.
   Volitelně lze zadat yellowBack (jiná délka na 2. devítce). Oficiální součty ČGF „Cínovec 2025“
   jsou přímo v HTML (sekce Hřiště, karty .tee-sum). */

/* -----------------------------------------------------------------------
   A2. NĚMECKÁ VERZE (DE)
   DE = slovník pro statické texty a krátké texty ze skriptu: klíč je český text
   (mezery se normalizují), hodnota německý překlad. Když změníte český text
   v HTML, upravte i klíč zde. Jamky mají německé popisy níže v HOLES_DE;
   aktuality, turnaje, galerie a slider mají němčinu přímo v data/obsah.json.
   ----------------------------------------------------------------------- */
const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const DE = {
  // stránka, meta
  'Golf Club Teplice – golf v srdci Krušných hor | Cínovec': 'Golf Club Teplice – Golf im Herzen des Erzgebirges | Cínovec',
  'Golf Club Teplice na Cínovci v Krušných horách: 18 jamek (9 × 2), PAR 72, on-line rezervace tee time, tréninky, turnaje a v zimě půjčovna běžek.':
    'Golf Club Teplice in Cínovec im Erzgebirge: 18 Löcher (9 × 2), Par 72, Online-Reservierung der Tee-Time, Training, Turniere und im Winter Langlaufski-Verleih.',
  'Přeskočit na obsah': 'Zum Inhalt springen',

  // hlavička a menu
  'Rezervace tee time': 'Tee-Time-Reservierung',
  'O nás': 'Über uns',
  'Aktuality': 'Aktuelles',
  'Ceník': 'Preise',
  'Hřiště': 'Golfplatz',
  'Tréninky': 'Training',
  'Turnaje': 'Turniere',
  'Půjčovna běžek': 'Langlaufverleih',
  'Kontakty': 'Kontakt',
  'Rezervovat': 'Reservieren',
  'on-line': 'online',
  'Rezervovat on-line': 'Online reservieren',
  'Hlavní navigace': 'Hauptnavigation',
  'Golf Club Teplice – na začátek': 'Golf Club Teplice – zum Seitenanfang',
  'Jazyk': 'Sprache',
  'Otevřít menu': 'Menü öffnen',
  'Zavřít menu': 'Menü schließen',
  'Menu': 'Menü',
  'Zpět nahoru': 'Nach oben',

  // hero
  'Úvod': 'Einleitung',
  'Sezóna 2026 otevřena': 'Saison 2026 eröffnet',
  'Golf v srdci Krušných hor – Cínovec': 'Golf im Herzen des Erzgebirges – Cínovec',
  'Rezervovat tee time': 'Tee-Time reservieren',
  'Prohlédnout hřiště': 'Golfplatz entdecken',
  '· Krušné hory': '· Erzgebirge',
  'Objevte': 'Entdecken',
  'Posunout na obsah': 'Zum Inhalt scrollen',
  'Fotografie {k}: {c}': 'Foto {k}: {c}',
  'Green s výhledem do kraje': 'Grün mit Weitblick',
  'Západ slunce nad Cínovcem': 'Sonnenuntergang über Cínovec',
  'Hřiště z ptačí perspektivy': 'Der Platz aus der Vogelperspektive',
  'Green obklopený horským lesem': 'Grün inmitten von Bergwald',
  'Putting green s výhledem na České středohoří': 'Putting Green mit Blick auf das Böhmische Mittelgebirge',

  // čísla
  'Hřiště v číslech': 'Der Platz in Zahlen',
  'jamek · 9 × 2': 'Löcher · 9 × 2',
  'PAR': 'Par',
  'par hřiště': 'Platz-Par',
  'délka hřiště · muži': 'Platzlänge · Herren',
  'od': 'seit',
  'golf na Cínovci': 'Golf in Cínovec',

  // o nás
  'Golf v srdci': 'Golf im Herzen des',
  'Krušných hor': 'Erzgebirges',
  'Devět jamek hraných dvakrát, svěží horský vzduch a výhledy na České středohoří. Golf na Cínovci píše svůj příběh už od roku 1998.':
    'Neun Löcher, zweimal gespielt, frische Bergluft und Ausblicke auf das Böhmische Mittelgebirge. Seit 1998 schreibt der Golf in Cínovec seine Geschichte.',
  'Hřiště postupně vyrostlo z prvních zkušebních jamek v plnohodnotné 18jamkové hřiště s parem 72, vodní nádrží a kompletním závlahovým systémem. Přímo u odpaliště jamky č. 1 na vás čeká klubovna, hotel a restaurace Krušnohorský dvůr.':
    'Aus den ersten Probelöchern ist nach und nach ein vollwertiger 18-Loch-Platz mit Par 72, Wasserbecken und kompletter Bewässerungsanlage entstanden. Direkt am Abschlag von Loch 1 erwarten Sie Clubhaus, Hotel und Restaurant Krušnohorský dvůr.',
  'Otevírací doba': 'Öffnungszeiten',
  'Sezóna': 'Saison',
  'duben – listopad': 'April – November',
  'Provoz hřiště': 'Spielbetrieb',
  '9:30 – do setmění': '9:30 – bis zur Dämmerung',
  'Driving range': 'Driving Range',
  'Sezóna právě probíhá': 'Die Saison läuft',
  'Mimo sezónu – těšíme se na jaro': 'Nebensaison – wir freuen uns auf den Frühling',
  'Green s bunkerem obklopený lesem': 'Grün mit Bunker, umgeben von Wald',
  'Green s bunkery v ranním světle': 'Grün mit Bunkern im Morgenlicht',
  'Od roku 1998': 'Seit 1998',
  'od roku': 'seit',
  'GOLF CLUB TEPLICE • CÍNOVEC • KRUŠNÉ HORY •': 'GOLF CLUB TEPLICE • CÍNOVEC • ERZGEBIRGE •',
  'Historie': 'Geschichte',
  'Příběh': 'Die Geschichte',
  'hřiště': 'des Platzes',
  'Prvních šest jamek': 'Die ersten sechs Löcher',
  'Vzniká prvních 6 zkušebních jamek v prostoru dnešních jamek 5, 6 a 7.': 'Die ersten 6 Probelöcher entstehen im Bereich der heutigen Löcher 5, 6 und 7.',
  'Hřiště dostává tvar': 'Der Platz nimmt Gestalt an',
  'Kolem roku 2002 začíná hřiště získávat svou dnešní podobu.': 'Um das Jahr 2002 erhält der Platz seine heutige Form.',
  'Devět jamek, PAR 72': 'Neun Löcher, Par 72',
  'Kompletních 9 jamek s parem 72 (hraných 2×) je oficiálně znormováno.': 'Alle 9 Löcher mit Par 72 (zweimal gespielt) erhalten das offizielle Course Rating.',
  'Voda a závlaha': 'Wasser und Bewässerung',
  'U jamky č. 2 vzniká vodní nádrž o rozloze cca 2 000 m² a hřiště dostává kompletní závlahový systém.': 'An Loch 2 entsteht ein Wasserbecken von ca. 2 000 m² und der Platz erhält eine komplette Bewässerungsanlage.',
  'Velká rekonstrukce': 'Große Renovierung',
  'Nové greeny a odpaliště, facelift jamek 4–7 a velký putting green u klubovny, otevřený na jaře 2011. Velkým přínosem bylo i otevření nové klubovny, hotelu a restaurace Krušnohorský dvůr.':
    'Neue Grüns und Abschläge, Facelift der Löcher 4–7 und ein großes Putting Green am Clubhaus, eröffnet im Frühjahr 2011. Ein großer Gewinn war auch die Eröffnung des neuen Clubhauses, Hotels und Restaurants Krušnohorský dvůr.',
  'Nová kapitola': 'Ein neues Kapitel',
  'Klub pokračuje jako spolek Golf club Teplice z.s., znovu přijatý do ČGF. Noví majitelé areálu plánují investice do hracích ploch, strojového parku a závlah.':
    'Der Club wird als Verein Golf club Teplice z.s. fortgeführt und wurde erneut in den Tschechischen Golfverband (ČGF) aufgenommen. Die neuen Eigentümer der Anlage planen Investitionen in Spielflächen, Maschinenpark und Bewässerung.',
  'Klubovna · hotel · restaurace': 'Clubhaus · Hotel · Restaurant',
  'Hotel a restaurace Krušnohorský dvůr za soumraku': 'Hotel und Restaurant Krušnohorský dvůr in der Dämmerung',
  'Klubovna, hotel a restaurace stojí přímo před odpalištěm jamky č. 1. Po hře si odpočinete na terase s výhledem na České středohoří.':
    'Clubhaus, Hotel und Restaurant liegen direkt vor dem Abschlag von Loch 1. Nach der Runde entspannen Sie auf der Terrasse mit Blick auf das Böhmische Mittelgebirge.',
  'Restaurace s terasou': 'Restaurant mit Terrasse',
  'Výhled na České středohoří': 'Blick auf das Böhmische Mittelgebirge',
  'Golfový shop': 'Golfshop',
  'Ubytování': 'Übernachtung',
  'Dětské hřiště': 'Kinderspielplatz',
  'Web Krušnohorského dvora': 'Website Krušnohorský dvůr',

  // aktuality
  'Co je nového': 'Was gibt es Neues',
  'na hřišti': 'auf dem Platz',
  'Sledujte nás na Facebooku': 'Folgen Sie uns auf Facebook',
  'Číst více': 'Weiterlesen',
  'Zobrazit starší aktuality': 'Ältere Beiträge anzeigen',
  'Zobrazit fotku': 'Foto anzeigen',

  // ceník
  'Ceník 2026': 'Preise 2026',
  'Členství': 'Mitgliedschaft',
  'v klubu': 'im Club',
  'Roční členské poplatky Golf Club Teplice z.s. pro sezónu 2026. Všichni členové mají parkování zdarma.':
    'Jährliche Mitgliedsbeiträge des Golf Club Teplice z.s. für die Saison 2026. Alle Mitglieder parken kostenlos.',
  'Termín platby': 'Zahlungstermin',
  'Placeno do 31. 3.': 'Zahlung bis 31. 3.',
  'Placeno po 31. 3.': 'Zahlung nach 31. 3.',
  'Aktuálně platí ceny při platbě po {d}': 'Aktuell gelten die Preise bei Zahlung nach dem {d}',
  'Při platbě do {d} ušetříte': 'Bei Zahlung bis zum {d} sparen Sie',
  'Při platbě po {d}:': 'Bei Zahlung nach dem {d}:',
  'Při platbě do {d}:': 'Bei Zahlung bis zum {d}:',
  'Zatím zde nejsou žádné aktuality.': 'Derzeit gibt es keine Neuigkeiten.',
  'Obsah se nepodařilo načíst. Zkuste prosím stránku obnovit.': 'Der Inhalt konnte nicht geladen werden. Bitte laden Sie die Seite neu.',
  'Dospělý': 'Erwachsene',
  'Roční členský poplatek': 'Jährlicher Mitgliedsbeitrag',
  'Kč / rok': 'CZK / Jahr',
  'Kč': 'CZK',
  'Junior': 'Jugendliche',
  'do 18 let': 'bis 18 Jahre',
  'Senior': 'Senioren',
  'nad 65 let': 'über 65 Jahre',
  'Vstupní poplatek nového člena': 'Aufnahmegebühr für neue Mitglieder',
  'Buggy golf cart': 'Golf-Buggy',
  '500 Kč / hra': '500 CZK / Runde',
  'Parkování pro členy': 'Parken für Mitglieder',
  'Zdarma': 'Kostenlos',
  'Nové číslo účtu od sezóny 2026': 'Neue Bankverbindung ab der Saison 2026',
  'Kopírovat': 'Kopieren',
  'Číslo účtu {x} zkopírováno': 'IBAN {x} kopiert',
  'Do zprávy pro příjemce uveďte celé jméno (příp. jména), za které je placeno.': 'Bitte geben Sie im Verwendungszweck den vollständigen Namen (bzw. die Namen) an, für den gezahlt wird.',
  'Green fee': 'Greenfee',
  '9 jamek': '9 Löcher',
  'Denní fee': 'Tagesfee',
  'Sleva 30 %': '30 % Rabatt',
  '* Sleva 30 % platí pouze pro seniory, juniory a členy klubů Barbora, Terezín, Janov, Malevil, Bítozeves a Libouchec.':
    '* Der Rabatt von 30 % gilt nur für Senioren, Jugendliche und Mitglieder der Clubs Barbora, Terezín, Janov, Malevil, Bítozeves und Libouchec.',
  'senioři, junioři a členové vybraných klubů*': 'Senioren, Jugendliche und Mitglieder ausgewählter Clubs*',
  'QR platba – naskenujte v bankovní aplikaci a doplňte částku.': 'GiroCode (SEPA) – in der Banking-App scannen und Betrag ergänzen.',
  'QR platba na účet 6918554389/0800': 'GiroCode für die Überweisung auf IBAN CZ18 0800 0000 0069 1855 4389',
  'Vyplňte prosím toto pole.': 'Bitte füllen Sie dieses Feld aus.',
  'Zadejte platnou e-mailovou adresu.': 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
  'Pro odeslání je potřeba souhlas.': 'Zum Absenden ist Ihre Zustimmung erforderlich.',
  'Posuňte do strany': 'Zur Seite wischen',
  '18 jamek': '18 Löcher',
  'Členové hrají v rezervačním systému automaticky za 0 Kč, senioři a junioři mají slevu.': 'Mitglieder spielen im Reservierungssystem automatisch für 0 CZK, Senioren und Jugendliche erhalten Rabatt.',
  'Stáhnout kompletní ceník (PDF)': 'Komplette Preisliste herunterladen (PDF)',

  // hřiště
  'Devět jamek,': 'Neun Löcher,',
  'dvakrát jinak': 'zweimal anders',
  'Hřiště má 9 jamek hraných dvakrát – celkem 18 jamek s parem 72. Klikněte na jamku v plánku a zobrazí se její detail včetně tipů „jak na to“.':
    'Der Platz hat 9 Löcher, die zweimal gespielt werden – insgesamt 18 Löcher mit Par 72. Klicken Sie im Plan auf ein Loch, um Details und Spieltipps zu sehen.',
  'PAR 72': 'Par 72',
  'Muži 5 394 m': 'Herren 5 394 m',
  'Ženy 4 698 m': 'Damen 4 698 m',
  '865 m n. m.': '865 m ü. M.',
  'Rezervace tee time on-line': 'Tee-Time online reservieren',
  'Plánek hřiště': 'Platzplan',
  'Plánek golfového hřiště Cínovec s jamkami 1–9 a klubovnou': 'Plan des Golfplatzes Cínovec mit den Löchern 1–9 und dem Clubhaus',
  'Klikněte na číslo jamky': 'Klicken Sie auf eine Lochnummer',
  'Plánek lze posouvat do stran': 'Plan seitlich verschiebbar',
  'Parametry a vzdálenosti': 'Platzdaten und Längen',
  'Devítka': 'Neun Löcher',
  'Jamky 1–9': 'Löcher 1–9',
  'Jamky 10–18': 'Löcher 10–18',
  'Vzdálenosti jamek {r} v metrech': 'Längen der Löcher {r} in Metern',
  'Žlutá': 'Gelb',
  'Červená': 'Rot',
  'Muži · ČGF 2025': 'Herren · ČGF 2025',
  'Ženy · ČGF 2025': 'Damen · ČGF 2025',
  '9 jamek:': '9 Löcher:',
  'm · 18 jamek:': 'm · 18 Löcher:',
  '· celkem': '· gesamt',
  'Délky jamek v metrech podle původního webu (před přeměřením hřiště v roce 2025). Součty a normování výše jsou oficiální údaje ČGF.':
    'Lochlängen in Metern laut der bisherigen Website (vor der Neuvermessung 2025). Summen und Course Rating oben sind offizielle Angaben des ČGF.',
  'Hřiště v registru ČGF': 'Platz im ČGF-Register',
  'Jamka': 'Loch',
  'Jamka {n}, PAR {p}, {m} metrů': 'Loch {n}, Par {p}, {m} Meter',
  'Detail jamky {n}': 'Details zu Loch {n}',
  'Detail jamky': 'Lochdetail',
  'Muži': 'Herren',
  'Ženy': 'Damen',
  'Tipy': 'Tipps',
  'Předchozí jamka': 'Vorheriges Loch',
  'Další jamka': 'Nächstes Loch',
  'Na 2. devítce (jamka {n}) se ze žlutých hraje {m} m.': 'Auf den zweiten Neun (Loch {n}) wird von Gelb {m} m gespielt.',
  'Plánek jamky {n}': 'Plan von Loch {n}',
  'Tip pro tuto jamku doplníme.': 'Der Tipp für dieses Loch folgt.',

  // parallax pás
  'Rezervace': 'Reservierung',
  'Tee time': 'Tee-Time',
  'Odpaliště č. 1': 'Abschlag Nr. 1',
  'na vás čeká': 'wartet auf Sie',
  'Rezervujte si čas na hřišti on-line přes rezervační systém, nebo telefonicky na +420 777 943 219.': 'Reservieren Sie Ihre Startzeit online über das Reservierungssystem oder telefonisch unter +420 777 943 219.',
  'Zavolat': 'Anrufen',

  // tréninky
  'Naučte se golf': 'Golf lernen',
  's trenérem': 'mit Trainer',
  'Od prvního seznámení s golfem přes kurz se zkouškou pro hru na hřišti až po individuální lekce. Vybavení vám zapůjčíme.':
    'Vom ersten Kennenlernen über den Kurs mit Platzreifeprüfung bis zu Einzelstunden. Die Ausrüstung leihen wir Ihnen.',
  'Cesta na hřiště': 'Weg zur Platzreife',
  'Golfový kurz': 'Golfkurs',
  'Kompletní kurz včetně zkoušky': 'Kompletter Kurs inkl. Prüfung',
  '8× 50 min s trenérem (příp. 4× 1 h 40 min)': '8× 50 Min. mit Trainer (oder 4× 1 Std. 40 Min.)',
  'Zkouška pro osvědčení hry na hřišti': 'Platzreifeprüfung',
  'Vstupní poplatek do klubu': 'Aufnahmegebühr in den Club',
  'Zapůjčení vybavení': 'Leihausrüstung',
  'Mám zájem o kurz': 'Kurs anfragen',
  'Seznámení s golfem': 'Golf-Schnupperkurs',
  '1 h 40 min s trenérem': '1 Std. 40 Min. mit Trainer',
  '1 osoba': '1 Person',
  '2 osoby': '2 Personen',
  '3–4 osoby': '3–4 Personen',
  'Cvičné plochy + vyzkoušení hřiště': 'Übungsanlagen + Probespiel auf dem Platz',
  'Klubový míček': 'Club-Golfball',
  'Objednat seznámení': 'Schnupperkurs buchen',
  'Tréninkové lekce': 'Trainerstunden',
  'Míče v ceně lekce': 'Bälle im Preis inbegriffen',
  '1 osoba · 50 min': '1 Person · 50 Min.',
  '1 osoba · 30 min': '1 Person · 30 Min.',
  '2+ osoby · 50 min': '2+ Personen · 50 Min.',
  '500 Kč / os.': '500 CZK / Pers.',
  'Individuální přístup trenéra': 'Individuelle Betreuung durch den Trainer',
  'Míče v ceně': 'Bälle inklusive',
  'Domluvit lekci': 'Stunde vereinbaren',
  'Váš trenér': 'Ihr Trainer',
  'Vedení kurzů, zelené karty a tréninky pro začátečníky i pokročilé.': 'Kurse, Platzreife und Training für Anfänger und Fortgeschrittene.',
  'Kurzy': 'Kurse',
  'Zelené karty': 'Platzreife',

  // turnaje
  'Turnaje pořádané': 'Turniere',
  'na Golf Teplice': 'im Golf Club Teplice',
  'Filtr turnajů': 'Turnierfilter',
  'Vše': 'Alle',
  'Nadcházející': 'Bevorstehend',
  'Proběhlé': 'Vergangen',
  'Ukázková data.': 'Beispieldaten.',
  'Termíny a názvy turnajů doplníme – přihlášky probíhají přes systém České golfové federace.': 'Termine und Namen der Turniere folgen – die Anmeldung erfolgt über das System des Tschechischen Golfverbands.',
  'Proběhlo': 'Beendet',
  'Přihlášky otevřené': 'Anmeldung offen',
  'Výsledky na ČGF': 'Ergebnisse beim ČGF',
  'Přihlásit se přes ČGF': 'Anmeldung über ČGF',

  // fotogalerie
  'objektivem': 'durch die Linse',
  'Kategorie fotografií': 'Fotokategorien',
  'Hřiště 2024': 'Platz 2024',
  'Hřiště a okolí': 'Platz und Umgebung',
  'Teambuildingy': 'Teambuilding',
  'Zima na Cínovci': 'Winter in Cínovec',
  '360° prohlídka': '360°-Rundgang',
  'Virtuální prohlídku 360° připravujeme.': 'Der virtuelle 360°-Rundgang ist in Vorbereitung.',
  'Zvětšit: {x}': 'Vergrößern: {x}',
  'Fotogalerie': 'Fotogalerie',
  'Předchozí fotka': 'Vorheriges Foto',
  'Další fotka': 'Nächstes Foto',
  'Fairway za jarního dne': 'Fairway an einem Frühlingstag',
  'Green obklopený lesem': 'Grün inmitten von Wald',
  'Turnajová hra na greenu': 'Turnierspiel auf dem Grün',
  'Krušnohorský dvůr v zimě': 'Krušnohorský dvůr im Winter',
  'Bunker u greenu': 'Bunker am Grün',
  'Green a bunkery v ranním světle': 'Grün und Bunker im Morgenlicht',
  'Teambuilding na hřišti': 'Teambuilding auf dem Platz',
  'Odpal': 'Abschlag',
  'Údržba fairwaye': 'Fairwaypflege',
  'Krušnohorský dvůr za soumraku': 'Krušnohorský dvůr in der Dämmerung',
  'Hřiště s klubovnou': 'Platz mit Clubhaus',
  'Výuka odpalu': 'Abschlagtraining',
  'Zasněžená cesta mezi smrky': 'Verschneiter Weg zwischen Fichten',
  'Hráči na fairwayi': 'Spieler auf dem Fairway',
  'Čerstvě posečené fairwaye': 'Frisch gemähte Fairways',
  'Fairwaye a bunkery': 'Fairways und Bunker',
  'Občerstvení pro skupiny': 'Catering für Gruppen',
  'Zasněžený areál': 'Verschneite Anlage',
  'Jamka na greenu': 'Loch auf dem Grün',
  'Hřiště pod mraky': 'Der Platz unter Wolken',
  'Skupina na hřišti': 'Gruppe auf dem Platz',
  'Běžkařské stopy': 'Loipen',
  'Fairwaye mezi smrky': 'Fairways zwischen Fichten',
  'Cvičné plochy': 'Übungsanlagen',
  'Zimní Cínovec': 'Winterliches Cínovec',
  'Panorama Cínovce': 'Panorama von Cínovec',

  // půjčovna běžek
  'Půjčovna': 'Verleih von',
  'běžek': 'Langlaufski',
  'Když hřiště zapadne sněhem, vyrazte na běžky. Zapůjčíme vám kompletní vybavení na klasiku i backcountry.':
    'Wenn der Platz unter Schnee liegt, geht es auf die Langlaufski. Wir verleihen komplette Ausrüstung für Klassisch und Backcountry.',
  'Běžkařské stopy u Cínovce': 'Loipen bei Cínovec',
  'Ceník na 1 den': 'Preise pro Tag',
  'Set klasika skin': 'Set Klassik Skin',
  'kompletní set · mohérový pás': 'komplettes Set · Mohairfell',
  'Běžky klasika skin': 'Langlaufski Klassik Skin',
  'samotné běžky': 'nur Ski',
  'Dětský set klasika skin': 'Kinderset Klassik Skin',
  'pro malé běžkaře': 'für kleine Langläufer',
  'Boty': 'Schuhe',
  'běžkařské boty': 'Langlaufschuhe',
  'Hůlky': 'Stöcke',
  'pár hůlek': 'ein Paar Stöcke',
  'Set backcountry': 'Set Backcountry',
  'do terénu mimo stopu': 'fürs Gelände abseits der Loipe',
  'Na více dní stanovíme individuální cenu podle počtu osob, vybavení a doby zapůjčení.': 'Für mehrere Tage erstellen wir einen individuellen Preis je nach Personenzahl, Ausrüstung und Mietdauer.',

  // kontakty
  'Těšíme se': 'Wir freuen uns',
  'na vás': 'auf Sie',
  'Adresa': 'Adresse',
  'Cínovec 275, 417 32 Dubí, Czech Republic': 'Cínovec 275, 417 32 Dubí, Tschechien',
  'Telefon · rezervace tee time': 'Telefon · Tee-Time-Reservierung',
  'E-mail': 'E-Mail',
  'Sezóna duben – listopad': 'Saison April – November',
  'Hřiště 9:30 – do setmění · driving range uzavřen': 'Platz 9:30 – bis zur Dämmerung · Driving Range geschlossen',
  'uzavřen': 'geschlossen',
  'Mapa – Golf Club Teplice, Cínovec 275': 'Karte – Golf Club Teplice, Cínovec 275',
  'Navigovat': 'Route planen',
  'Napište nám dotaz či vzkaz': 'Schreiben Sie uns',
  'Máte dotaz k hřišti, členství nebo tréninkům? Ozveme se vám co nejdříve.': 'Haben Sie Fragen zum Platz, zur Mitgliedschaft oder zum Training? Wir melden uns so bald wie möglich.',
  'Jméno a příjmení': 'Vor- und Nachname',
  'Vaše zpráva': 'Ihre Nachricht',
  'Souhlasím se': 'Ich stimme der',
  'zpracováním osobních údajů': 'Verarbeitung meiner personenbezogenen Daten',
  'za účelem vyřízení dotazu.': 'zur Bearbeitung der Anfrage zu.',
  'Všechna pole jsou povinná.': 'Alle Felder sind Pflichtfelder.',
  'Odeslat zprávu': 'Nachricht senden',
  'Odesílám…': 'Wird gesendet…',
  'Děkujeme za zprávu!': 'Vielen Dank für Ihre Nachricht!',
  'Zprávu jsme přijali a ozveme se vám na uvedený e-mail.': 'Wir haben Ihre Nachricht erhalten und melden uns per E-Mail bei Ihnen.',
  'Odeslání se nepodařilo. Napište nám prosím na golf@golf-teplice.cz.': 'Das Senden ist fehlgeschlagen. Bitte schreiben Sie uns an golf@golf-teplice.cz.',
  'Napsat další zprávu': 'Weitere Nachricht schreiben',
  'Novinky e-mailem': 'Newsletter',
  'Otevření sezóny, turnaje a novinky z hřiště přímo do vaší schránky.': 'Saisoneröffnung, Turniere und Neuigkeiten vom Platz direkt in Ihr Postfach.',
  'váš@email.cz': 'ihre@email.de',
  'Odebírat': 'Abonnieren',
  'Děkujeme, novinky vám budeme posílat e-mailem.': 'Vielen Dank, wir senden Ihnen Neuigkeiten per E-Mail.',
  'Odesláním souhlasíte se zasíláním novinek. Odhlásit se můžete kdykoli.': 'Mit dem Absenden stimmen Sie dem Erhalt unseres Newsletters zu. Abmelden können Sie sich jederzeit.',

  // partneři, patička, dialogy
  'Partneři klubu': 'Partner des Clubs',
  'Golfové hřiště na Cínovci v Krušných horách. 18 jamek, PAR 72, od roku 1998.': 'Golfplatz in Cínovec im Erzgebirge. 18 Löcher, Par 72, seit 1998.',
  'Klub': 'Club',
  'Více': 'Mehr',
  'Rezervace on-line': 'Online-Reservierung',
  'Nahoru': 'Nach oben',
  'Zavřít': 'Schließen',
  'Zobrazit všechny fotky': 'Alle Fotos anzeigen',
  'Původní web': 'Bisherige Website',
  'Chcete starý web?': 'Lieber die alte Website?',
  'Původní stránky klubu jsou zatím stále dostupné.': 'Die bisherigen Seiten des Clubs sind vorerst weiterhin erreichbar.',
  'Přejít na starý web': 'Zur alten Website',
  'Golf club Teplice z.s. · IČO 26643120': 'Golf club Teplice z.s. · Id.-Nr. (IČO) 26643120',
  'Sezóna {y} otevřena': 'Saison {y} eröffnet',
  'Sezóna {y} začíná v dubnu': 'Die Saison {y} beginnt im April',
  'Ochrana osobních údajů': 'Datenschutz',
  'Spolek zapsaný u Krajského soudu v Ústí nad Labem, oddíl L, vložka 4878': 'Eingetragener Verein beim Kreisgericht Ústí nad Labem, Abteilung L, Einlage 4878',
  'Mapa se načítá ze služby Google Maps. Po jejím zobrazení může Google zpracovávat údaje o vaší návštěvě.': 'Die Karte wird von Google Maps geladen. Nach dem Anzeigen kann Google Daten über Ihren Besuch verarbeiten.',
  'Zobrazit mapu': 'Karte anzeigen',
  'Kalendář turnajů připravujeme': 'Turnierkalender in Vorbereitung',
  'Termíny turnajů zveřejníme zde. Přihlášky probíhají přes systém České golfové federace.': 'Die Turniertermine veröffentlichen wir hier. Die Anmeldung erfolgt über das System des Tschechischen Golfverbands.',
  'Turnaje v kalendáři ČGF': 'Turniere im ČGF-Kalender',

  // samostatné stránky – titulky, popisy, úvodní pásy
  'Golf Club Teplice – úvodní stránka': 'Golf Club Teplice – Startseite',
  'Drobečková navigace': 'Brotkrumennavigation',
  'O nás – historie hřiště a Krušnohorský dvůr | Golf Club Teplice': 'Über uns – Geschichte des Platzes und Krušnohorský dvůr | Golf Club Teplice',
  'Aktuality | Golf Club Teplice': 'Neuigkeiten | Golf Club Teplice',
  'Ceník – členství a green fee | Golf Club Teplice': 'Preise – Mitgliedschaft und Greenfee | Golf Club Teplice',
  'Hřiště – 18 jamek, PAR 72 | Golf Club Teplice': 'Golfplatz – 18 Löcher, Par 72 | Golf Club Teplice',
  'Tréninky a golfový kurz | Golf Club Teplice': 'Training und Golfkurs | Golf Club Teplice',
  'Turnaje | Golf Club Teplice': 'Turniere | Golf Club Teplice',
  'Fotogalerie | Golf Club Teplice': 'Fotogalerie | Golf Club Teplice',
  'Půjčovna běžek na Cínovci | Golf Club Teplice': 'Langlaufski-Verleih in Cínovec | Golf Club Teplice',
  'Kontakty | Golf Club Teplice': 'Kontakt | Golf Club Teplice',
  'Golfové hřiště na Cínovci od roku 1998: otevírací doba, historie hřiště a klubovna, hotel a restaurace Krušnohorský dvůr.': 'Golfplatz in Cínovec seit 1998: Öffnungszeiten, Geschichte des Platzes sowie Clubhaus, Hotel und Restaurant Krušnohorský dvůr.',
  'Novinky z golfového hřiště na Cínovci: otevření sezóny, rezervace, údržba hřiště a dění v klubu.': 'Neuigkeiten vom Golfplatz Cínovec: Saisoneröffnung, Reservierungen, Platzpflege und Clubleben.',
  'Ceník Golf Club Teplice: roční členství, green fee na 9 a 18 jamek, vstupní poplatek, buggy a platba QR kódem.': 'Preise des Golf Club Teplice: Jahresmitgliedschaft, Greenfee für 9 und 18 Löcher, Aufnahmegebühr, Buggy und Zahlung per QR-Code.',
  'Golfové hřiště Cínovec: 9 jamek hraných dvakrát, PAR 72, 865 m n. m. Interaktivní plánek, délky jamek a tipy, jak je zahrát.': 'Golfplatz Cínovec: 9 Löcher, zweimal gespielt, Par 72, 865 m ü. M. Interaktiver Platzplan, Lochlängen und Spieltipps.',
  'Golfový kurz se zkouškou, individuální lekce a seznámení s golfem s trenérem na Cínovci. Vybavení zapůjčíme.': 'Golfkurs mit Prüfung, Einzelunterricht und Schnupperstunden mit dem Trainer in Cínovec. Die Ausrüstung leihen wir Ihnen.',
  'Kalendář turnajů na golfovém hřišti Cínovec. Přihlášky probíhají přes systém České golfové federace.': 'Turnierkalender des Golfplatzes Cínovec. Die Anmeldung erfolgt über das System des Tschechischen Golfverbands.',
  'Fotografie golfového hřiště na Cínovci, okolí Krušných hor, turnajů a zimy na Cínovci.': 'Fotos vom Golfplatz Cínovec, vom Erzgebirge, von Turnieren und vom Winter in Cínovec.',
  'Půjčovna běžek na Cínovci: kompletní vybavení na klasiku i backcountry, ceník a objednávka.': 'Langlaufski-Verleih in Cínovec: komplette Ausrüstung für Klassisch und Backcountry, Preise und Bestellung.',
  'Golf Club Teplice, Cínovec 275, 417 32 Dubí. Telefon, e-mail, mapa a kontaktní formulář.': 'Golf Club Teplice, Cínovec 275, 417 32 Dubí. Telefon, E-Mail, Karte und Kontaktformular.',
  'Golf na Cínovci od roku 1998 – hřiště, historie a Krušnohorský dvůr.': 'Golf in Cínovec seit 1998 – Platz, Geschichte und Krušnohorský dvůr.',
  'Novinky z hřiště a klubu.': 'Neuigkeiten vom Platz und aus dem Club.',
  'Členství, green fee a další poplatky na sezónu.': 'Mitgliedschaft, Greenfee und weitere Gebühren für die Saison.',
  '9 jamek hraných dvakrát, PAR 72, 865 m nad mořem.': '9 Löcher, zweimal gespielt, Par 72, 865 m über dem Meer.',
  'Kurzy, zelená karta a lekce s trenérem.': 'Kurse, Platzreife und Unterricht mit dem Trainer.',
  'Klubové i otevřené turnaje na Cínovci.': 'Club- und offene Turniere in Cínovec.',
  'Hřiště, okolí a zima na Cínovci.': 'Der Platz, die Umgebung und der Winter in Cínovec.',
  'V zimě na běžky přímo z Cínovce.': 'Im Winter auf Langlaufski direkt ab Cínovec.',
  'Cínovec 275, 417 32 Dubí – jak nás najít a kontaktovat.': 'Cínovec 275, 417 32 Dubí – so finden und erreichen Sie uns.',

  // úvodní stránka – rozcestník
  'Golf v srdci Krušných hor': 'Golf im Herzen des Erzgebirges',
  'Co vás': 'Was',
  'zajímá?': 'interessiert Sie?',
  'Devět jamek hraných dvakrát, horský vzduch a výhledy na České středohoří. Vyberte si, kam dál.': 'Neun Löcher, zweimal gespielt, Bergluft und Ausblicke auf das Böhmische Mittelgebirge. Wählen Sie, wohin es weitergeht.',
  '18 jamek · PAR 72': '18 Löcher · Par 72',
  'Interaktivní plánek, délky jamek a tipy, jak je zahrát.': 'Interaktiver Platzplan, Lochlängen und Spieltipps.',
  'Green fee od': 'Greenfee ab',
  'Členství, green fee a platba QR kódem.': 'Mitgliedschaft, Greenfee und Zahlung per QR-Code.',
  'Kurz · lekce · zkouška': 'Kurs · Unterricht · Prüfung',
  'Naučte se golf s trenérem, vybavení zapůjčíme.': 'Lernen Sie Golf mit dem Trainer – die Ausrüstung leihen wir Ihnen.',
  'Kalendář sezóny': 'Saisonkalender',
  'Klubové i otevřené turnaje, přihlášky přes ČGF.': 'Club- und offene Turniere, Anmeldung über den ČGF.',
  'Od roku 1998': 'Seit 1998',
  'Historie hřiště, klubovna, hotel a restaurace.': 'Geschichte des Platzes, Clubhaus, Hotel und Restaurant.',
  'Když hřiště zapadne sněhem, vyrazte na běžky.': 'Wenn der Platz unter Schnee liegt: ab auf die Langlaufski.',
  'Všechny aktuality': 'Alle Neuigkeiten',
  'Celá fotogalerie': 'Zur Fotogalerie',
  'Pozastavit video': 'Video anhalten',
  // úvodní stránka ve stylu vzoru
  'Golf v srdci': 'Golf im Herzen',
  'Krušných hor.': 'des Erzgebirges.',
  'Devět jamek hraných dvakrát, horský vzduch a výhledy na České středohoří.': 'Neun Löcher, zweimal gespielt, Bergluft und Ausblicke auf das Böhmische Mittelgebirge.',
  'Ceník a green fee': 'Preise und Greenfee',
  'Pro hráče, členy i návštěvníky': 'Für Spieler, Mitglieder und Gäste',
  'Hřiště a plánek jamek': 'Golfplatz und Lochplan',
  'Rezervace tee time on-line': 'Online-Reservierung der Tee-Time',
  'Tréninky a golfový kurz': 'Training und Golfkurs',
  'Zima: půjčovna běžek': 'Winter: Langlaufski-Verleih',
  'O nás a Krušnohorský dvůr': 'Über uns und Krušnohorský dvůr',
  'Kontakty a mapa': 'Kontakt und Karte',
  'Golf na Cínovci': 'Golf in Cínovec',
  'Ilustrační foto vytvořené s pomocí AI': 'Illustrationsfoto, mit KI erstellt',
  'Golfistka při odpalu na greenu s výhledem na Milešovku': 'Golferin beim Abschlag mit Blick auf den Milleschauer',
  'Odpal': 'Abschlag',
  's výhledem.': 'mit Aussicht.',
  'Devět jamek.': 'Neun Löcher.',
  'Dvakrát jinak.': 'Zweimal anders.',
  'A po hře': 'Und nach dem Spiel',
  'terasa.': 'die Terrasse.',
  'Green s vlajkou a výhledem na Milešovku': 'Grün mit Fahne und Blick auf den Milleschauer',
  'Hřiště a klubovna z ptačí perspektivy': 'Platz und Clubhaus aus der Vogelperspektive',
  'Jedno hřiště.': 'Ein Platz.',
  'Pro každého.': 'Für alle.',
  'Členové': 'Mitglieder',
  '„Tady jsem doma.“': '„Hier bin ich zu Hause.“',
  'Roční členství s hrou bez green fee a parkováním zdarma. Při platbě do konce března ušetříte.': 'Jahresmitgliedschaft: Spielen ohne Greenfee und kostenlos parken. Bei Zahlung bis Ende März sparen Sie.',
  'Členství a ceník': 'Mitgliedschaft und Preise',
  'Hosté': 'Gäste',
  '„Tohle si zahrajeme.“': '„Das spielen wir.“',
  'Green fee na 9 i 18 jamek, sleva 30 % pro seniory a juniory. Tee time si rezervujete on-line.': 'Greenfee für 9 und 18 Löcher, 30 % Rabatt für Senioren und Jugendliche. Die Tee-Time reservieren Sie online.',
  'Začátečníci': 'Einsteiger',
  '„Chci to zkusit.“': '„Ich will es probieren.“',
  'Golfový kurz se zkouškou a lekce s trenérem. Hole a míče vám zapůjčíme.': 'Golfkurs mit Prüfung und Unterricht beim Trainer. Schläger und Bälle leihen wir Ihnen.',
  'Tréninky a kurz': 'Training und Kurs',
  'nad mořem': 'über dem Meer',
  'Kdy si': 'Wann spielen',
  'zahrajete?': 'Sie?',
  'Rezervujte si čas na hřišti on-line, nebo zavolejte na +420 777 943 219. Parkujte na horním parkovišti u odpaliště jamky č. 1.': 'Reservieren Sie Ihre Startzeit online oder rufen Sie +420 777 943 219 an. Parken Sie auf dem oberen Parkplatz am Abschlag von Loch 1.',
  'Méně slov.': 'Weniger Worte.',
  'Víc Cínovce.': 'Mehr Cínovec.',
  'Hřiště a okolí v pohybu – záběry vytvořené s pomocí AI z našich fotografií.': 'Platz und Umgebung in Bewegung – mit KI aus unseren Fotos erstellte Aufnahmen.',
  'Hřiště z dronu': 'Der Platz aus der Drohne',
  'Cínovec v podvečerním světle': 'Cínovec im Abendlicht',
  'Green s výhledem': 'Grün mit Aussicht',
  'Nízký průlet k vlajce': 'Tiefflug zur Fahne',
  'Běžkařská stopa v čerstvém sněhu': 'Langlaufspur im frischen Schnee',
  'Video': 'Video',
  'Přehrát video': 'Video abspielen'
};

/* Jamky – německé popisy a tipy (klíč = číslo jamky) */
const HOLES_DE = {
  1: { desc: 'Zum Auftakt kein Einspielloch – ein Dogleg nach links mit Aus und Wasser auf der rechten Seite und einem mittelgroßen Grün.',
       scratch: 'Mit Vertrauen ins Holz können Sie einen Schlag von 220–250 m über die linke Ecke des Fairways versuchen. Der zweite Schlag ist nicht so schwer, verlangt aber Präzision; ein eventueller Chip sollte kein Problem sein. Das Grün ist relativ klein, sodass auch ein Putt zum Par gelingen kann.',
       bogey: 'Ruhig zweimal Eisen 7, Wedge aufs Grün und dann entweder 2 Putts oder Chip und Putt.' },
  2: { desc: 'Von der Länge her kein allzu schweres Loch. Entscheidend ist der Drive, bei dem etwa 150 m Wasser überspielt werden müssen.',
       scratch: 'Nach einem Drive auf das recht breite Fairway erreichen Longhitter das Grün mit dem zweiten Schlag; ein zu kurzer Versuch wird jedoch vom Wasser etwa 50 m vor dem Grün bestraft.',
       bogey: 'Entscheidend ist der Abschlag, aber auch aus der Dropzone ist ein Bogey sehr wahrscheinlich – in der Praxis von der Dropzone vor dem Wasser ein guter Wedge aufs Grün und dann Putt–Putt oder Chip–Putt.' },
  3: { desc: 'Ein recht schwieriges Dogleg nach rechts, vor allem für Rechtshänder, da das ganze Loch von links nach rechts abfällt. Das Grün liegt an einem steilen Hang.',
       scratch: 'Besser ist ein kürzerer und präziserer erster Schlag mit Eisen 5 bis 7. Der zweite muss sehr genau sein – Fehler bestraft der lange Abprall des Balls bergab.',
       bogey: 'Nach einem missratenen Drive ist es schwer, mit dem zweiten Schlag bis aufs Fairway zu kommen, meist kostet das Schläge. Ein besseres Ergebnis bringt das Spiel bis zur Sichtlinie und ein präziser kurzer Schlag aufs Grün.' },
  4: { desc: 'Ein kurzes Par 3 mit 128 m von den gelben wie von den roten Abschlägen. Eine ausführliche Beschreibung folgt.' },
  5: { desc: 'Ein schönes Loch bergauf – rechts ein unangenehmes Aus, links gefährliches Rough, in dem man keinen Ball findet.',
       scratch: 'Vorsicht beim Drive vor dem Slice – der landet garantiert im Aus. Dasselbe gilt für den zweiten Schlag; statt eines kürzeren zweiten Schlags genügt ein nicht allzu schwerer Annäherungsschlag.',
       bogey: 'Bei 150 m warten auf Ihre kürzeren Schläge zwei tiefe Bunker und natürlich das Aus rechts. Das Grün spielt man besser von rechts an – direkt links davor lauert ein tückischer Bunker.' },
  6: { desc: 'Ein nicht allzu schweres Loch mit Aus direkt hinter dem Grün.',
       scratch: 'Ein langer Drive bringt eine große Birdie-Chance. Vorsicht vor dem Aus hinter dem Grün – getoppte Bälle landen garantiert dort.',
       bogey: 'Ein gefährlicher Rain links mit unangenehmem Rough und ein tiefer Bunker links hinter dem Grün.' },
  7: { desc: 'Auf den ersten Blick ein einfaches Loch, auf den zweiten zeigen sich viele Tücken – ein unangenehmer Horizont und ein abgewinkeltes Grün mit mehreren Bunkern.',
       scratch: 'Problematisch wird es nur bei einem kürzeren Drive – dann muss man mit einem langen Schlag aufs Grün und riskiert hohes Rough nahe dem Grün oder das Aus direkt dahinter.',
       bogey: 'Für gerade Spieler sollte es kein Problem sein. Es gilt: lieber kürzer und präziser.' },
  8: { desc: 'Das schwerste Loch der Neun, vor allem wegen seiner Länge. Für manche Spieler gleicht es eher einem Kampf gegen Windmühlen.',
       scratch: 'Grundlage des Erfolgs ist ein langer, gut platzierter Drive, denn auch der nächste Schlag sollte ein Holz sein. Vorsicht vor zwei tiefen Fairwaybunkern etwa 50 m vor dem Grün. Das Grün ist aber recht groß, sodass sich mit einem guten Annäherungsschlag viel retten lässt.',
       bogey: 'Vorsicht vor allem vor dem Slice – die Bälle landen dann in sehr unangenehmem Rough.' },
  9: { desc: 'Ein kurzes Loch zum Schluss, von dem Sie sich aber nicht einlullen lassen sollten. Probleme bereitet auch das dichte Rough entlang des ganzen Lochs.',
       scratch: 'Wenn Sie das Grün treffen, gibt es nichts zu überlegen. Vorsicht vor dem Bunker hinter dem Grün – er macht auch guten Spielern große Probleme.',
       bogey: 'Vorsicht vor getoppten Bällen, die meist im bereits erwähnten Bunker hinter dem Grün landen.' }
};

// připojení německých verzí k datům
HOLES.forEach(h => { h.de = HOLES_DE[h.n]; });

/* -----------------------------------------------------------------------
   B. LOGIKA
   ----------------------------------------------------------------------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const fmt = n => Math.round(n).toLocaleString('cs-CZ');
// názvy souborů ze starého webu → bezpečné názvy v assets/ (stejná funkce jako při stahování)
const slug = f => f.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+\./g, '.').replace(/-+/g, '-');
const isPath = f => String(f).includes('/');
const imgUrl = f => isPath(f) ? f : IMG + slug(f);
const thumbUrl = f => isPath(f) ? f.replace(/[^/]+$/, m => 'thumbs/' + m) : THUMB + slug(f);
const MONTHS = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];
const parseDate = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const czDate = iso => {
  const d = parseDate(iso);
  return LANG === 'de'
    ? d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
};
const monthName = d => (LANG === 'de' ? MONTHS_DE : MONTHS)[d.getMonth()];

/* ---------- Jazyk: t() přeloží český text, L() vybere jazykovou verzi z dat ---------- */
let LANG = 'cs';
const refreshers = []; // funkce, které po přepnutí jazyka znovu vykreslí dynamický obsah
const normKey = s => String(s).replace(/[\s\u00a0]+/g, ' ').trim();
function t(cs, vars) {
  let out = cs;
  if (LANG === 'de') {
    const hit = DE[normKey(cs)];
    out = hit !== undefined ? hit : String(cs).replace(/Kč/g, 'CZK');
  }
  if (vars) Object.keys(vars).forEach(k => { out = String(out).split('{' + k + '}').join(vars[k]); });
  return out;
}
const L = (item, key) => (LANG === 'de' && item.de && item.de[key]) ? item.de[key] : item[key];
const icon = (id, cls = '') => `<svg class="i ${cls}"><use href="#${id}"/></svg>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// odkaz jen s povoleným začátkem (obsah z administrace)
const safeHref = h => /^(https?:\/\/|tel:|mailto:|#)/i.test(String(h || '').trim()) ? String(h).trim() : '';
// každá sekce má vlastní stránku: odkaz #cenik vede na cenik.html (když sekce není na této stránce)
const SECTION_PAGES = ['onas', 'aktuality', 'cenik', 'hriste', 'treninky', 'turnaje', 'fotogalerie', 'pujcovna-bezek', 'kontakty'];
const pageHref = h => (/^#[a-z0-9-]+$/.test(h) && !document.getElementById(h.slice(1)) && SECTION_PAGES.includes(h.slice(1))) ? h.slice(1) + '.html' : h;

/* Text aktuality z administrace → HTML.
   Prázdný řádek = nový odstavec, **tučně**, řádky „- popis: hodnota“ = tabulka,
   odkazy (https://…) a telefonní čísla (+420 …) se proklikají samy. */
function richText(src) {
  const inline = str => esc(str)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/https?:\/\/[^\s<]*[^\s<.,;:!?)]/g, u => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>`)
    .replace(/\+\d{2,3}(?:[ \u00a0]?\d{3}){3}\b/g, n => `<a href="tel:${n.replace(/[ \u00a0]/g, '')}">${n}</a>`);
  return String(src || '').replace(/\r/g, '').split(/\n[ \t]*\n/).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return '';
    if (lines.every(l => /^[-•]\s/.test(l))) {
      return '<ul class="modal-fees">' + lines.map(l => {
        const item = l.replace(/^[-•]\s+/, '');
        const k = item.indexOf(': ');
        return k > 0 ? `<li><span>${inline(item.slice(0, k))}</span><b>${inline(item.slice(k + 2))}</b></li>` : `<li><span>${inline(item)}</span></li>`;
      }).join('') + '</ul>';
    }
    return '<p>' + lines.map(inline).join('<br>') + '</p>';
  }).join('');
}

/* ---------- OBSAH Z data/obsah.json ---------- */
let contentOk = true;
try {
  const c = await Promise.race([
    window.GCT_OBSAH || Promise.reject(new Error('bez načítání')),
    new Promise((_, reject) => setTimeout(() => reject(new Error('časový limit')), 10000))
  ]);
  NEWS = (c.news || []).filter(n => n && n.date && n.title).sort((a, b) => b.date.localeCompare(a.date));
  SLIDES = (c.slider || []).filter(x => x && x.f);
  PRICES = c.prices || null;
  COACHES = (c.coaches || []).filter(x => x && x.active !== false && x.name);
  TOURNAMENTS_PUBLISHED = !!(c.tournaments && c.tournaments.published);
  TOURNAMENTS = ((c.tournaments && c.tournaments.list) || []).filter(x => x && x.date && x.name).sort((a, b) => a.date.localeCompare(b.date));
  GALLERY = (c.gallery || []).filter(g => g && g.f).map(g => ({ ...g, w: Number(g.w) || 1200, h: Number(g.h) || 900 }));
  PARTNERS = (c.partners || []).filter(p => p && p.logo);
} catch (err) {
  contentOk = false;
  console.warn('Obsah webu (data/obsah.json) se nepodařilo načíst:', err);
}

// ceník: datum zvýhodněné platby („31. 3.“ / „31. 3. 2026“) a rok sezóny
const PRICE_DEADLINE = (PRICES && /^\d{4}-\d{2}-\d{2}$/.test(PRICES.deadline || '')) ? PRICES.deadline : '2026-03-31';
const deadlineDate = () => { const d = parseDate(PRICE_DEADLINE); d.setHours(23, 59, 59); return d; };
const deadlineShort = () => { const d = parseDate(PRICE_DEADLINE); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const deadlineLong = () => `${deadlineShort()} ${parseDate(PRICE_DEADLINE).getFullYear()}`;

(function applyPrices() {
  if (!PRICES) return;
  const p = PRICES;
  const kc = n => fmt(Number(n) || 0) + ' Kč';
  const season = String(p.season || parseDate(PRICE_DEADLINE).getFullYear());
  // texty s rokem / datem: česky v obsahu, německy v data-de (přebírá je přepínač jazyka)
  const setText = (el, cs, de) => { if (!el) return; el.textContent = cs; el.dataset.de = de; };
  setText($('#priceEyebrow'), `Ceník ${season}`, `Preise ${season}`);
  setText($('#priceLead'), `Roční členské poplatky Golf Club Teplice z.s. pro sezónu ${season}. Všichni členové mají parkování zdarma.`,
    `Jährliche Mitgliedsbeiträge des Golf Club Teplice z.s. für die Saison ${season}. Alle Mitglieder parken kostenlos.`);
  setText($('[data-period="early"]'), `Placeno do ${deadlineShort()}`, `Zahlung bis ${deadlineShort()}`);
  setText($('[data-period="late"]'), `Placeno po ${deadlineShort()}`, `Zahlung nach ${deadlineShort()}`);
  const m = p.membership || {};
  $$('[data-price]').forEach((el, k) => {
    const v = m[['adult', 'junior', 'senior'][k]];
    if (Array.isArray(v)) { el.dataset.early = Number(v[0]) || 0; el.dataset.late = Number(v[1]) || 0; }
  });
  if (p.entryFee != null) setText($('#priceEntry'), kc(p.entryFee), kc(p.entryFee).replace('Kč', 'CZK'));
  if (p.buggy != null) setText($('#priceBuggy'), kc(p.buggy) + ' / hra', kc(p.buggy).replace('Kč', 'CZK') + ' / Runde');
  const gf = p.greenFee || {};
  $$('[data-gf]').forEach(el => { if (gf[el.dataset.gf] != null) el.textContent = kc(gf[el.dataset.gf]); });
  const pdf = $('#pricePdf');
  if (pdf && p.pdfCs) { pdf.setAttribute('href', p.pdfCs); pdf.dataset.hrefDe = p.pdfDe || p.pdfCs; }
})();

(function renderSlides() {
  const box = $('#heroSlides');
  if (!box || !SLIDES.length) return;
  const sig = list => list.map(x => x.src + '|' + x.cap).join('\n');
  const now = $$('.hero__slide', box).map(el => ({ src: el.querySelector('img').getAttribute('src'), cap: el.dataset.caption || '' }));
  const next = SLIDES.map(x => ({ src: imgUrl(x.f), cap: x.t || '' }));
  if (sig(now) !== sig(next)) {
    box.innerHTML = SLIDES.map((x, k) => `
    <div class="hero__slide${k ? '' : ' is-active'}" data-caption="${esc(x.t || '')}">
      <img src="${esc(imgUrl(x.f))}" alt="" ${k ? 'decoding="async"' : 'fetchpriority="high"'}>
    </div>`).join('');
  }
  $$('.hero__slide', box).forEach((el, k) => { el.dataset.captionDe = SLIDES[k].tDe || ''; });
})();

// trenéři (víc trenérů pod sebou; bez fotky = iniciály)
const coachBox = $('#coaches');
function renderCoaches(instant) {
  if (!contentOk || !coachBox) return;
  coachBox.hidden = !COACHES.length;
  coachBox.innerHTML = COACHES.map(c => {
    const initials = c.name.replace(/\b(Ing|Mgr|Bc|MUDr|JUDr|PhDr|RNDr|Dr|Ph\.D)\.?/g, '').trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
    const tags = String(L(c, 'tags') || '').split(',').map(x => x.trim()).filter(Boolean);
    const tel = String(c.phone || '').replace(/[^\d+]/g, '');
    return `
    <article class="coach reveal${instant ? ' is-visible' : ''}">
      <div class="coach__photo">
        ${c.photo ? `<img src="${esc(thumbUrl(c.photo))}" alt="${esc(c.name)}" loading="lazy">` : `<span class="coach__initials" aria-hidden="true">${esc(initials)}</span>`}
      </div>
      <div class="coach__body">
        <p class="eyebrow">${t('Váš trenér')}</p>
        <h3>${esc(c.name)}</h3>
        ${L(c, 'role') ? `<p class="coach__role">${esc(L(c, 'role'))}</p>` : ''}
        ${tags.length ? `<div class="coach__skills">${tags.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''}
        <div class="coach__actions">
          ${tel ? `<a class="btn btn--dark" href="tel:${esc(tel)}">${icon('i-phone')} ${esc(c.phone)}</a>` : ''}
          ${c.email ? `<a class="btn btn--outline" href="mailto:${esc(c.email)}">${icon('i-mail')} ${esc(c.email)}</a>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');
}
renderCoaches(false);
refreshers.push(() => renderCoaches(true));

/* ---------- Toast (krátká oznámení) ---------- */
const toastBox = $('#toasts');
function toast(msg, iconId = 'i-check') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = icon(iconId) + `<span>${msg}</span>`;
  toastBox.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 500);
  }, 3200);
}

/* ---------- Dialogy (nativní <dialog> + animace zavření) ---------- */
function openDialog(d) {
  if (d.open) return;
  d.showModal();
  root.classList.add('is-locked');
}
function closeDialog(d) {
  if (!d.open || d.classList.contains('is-closing')) return;
  const finish = () => { d.classList.remove('is-closing'); d.close(); };
  if (reduceMotion) return finish();
  d.classList.add('is-closing');
  const onEnd = e => { if (e.target === d) { d.removeEventListener('animationend', onEnd); finish(); } };
  d.addEventListener('animationend', onEnd);
  setTimeout(() => { if (d.open) finish(); }, 450); // pojistka
}
$$('dialog').forEach(d => {
  d.addEventListener('cancel', e => { e.preventDefault(); closeDialog(d); });              // Esc
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) closeDialog(d); });
  d.addEventListener('close', () => { if (!$$('dialog').some(x => x.open)) root.classList.remove('is-locked'); });
});

/* ---------- Hlavička, průběh scrollu, parallax, timeline (jeden rAF smyčka) ---------- */
const header = $('#siteHeader');
const scrollLine = $('.scroll-line');
const golfProgress = $('#golfProgress');
const mobileBook = $('#mobileBook');
const heroContent = $('#heroContent');
const timeline = $('#timeline');
const timelineFill = $('#timelineFill');
const tlItems = $$('.tl-item');
const parallaxEls = reduceMotion ? [] : $$('[data-parallax]');
const footer = $('.footer');
let ticking = false;

function onScrollFrame() {
  ticking = false;
  const y = window.scrollY;
  const vh = window.innerHeight;

  header.classList.toggle('is-scrolled', y > 40);

  // průběh stránky 0–1 → golfový míček / linka
  const max = document.documentElement.scrollHeight - vh;
  const p = max > 0 ? clamp(y / max, 0, 1) : 0;
  scrollLine.style.setProperty('--p', p.toFixed(4));
  golfProgress.style.setProperty('--p', p.toFixed(4));
  golfProgress.classList.toggle('is-visible', y > vh * 0.5);
  golfProgress.classList.toggle('is-holed', p > 0.995);

  // mobilní lišta s rezervací – po hero, skrytá u patičky
  const nearFooter = footer.getBoundingClientRect().top < vh;
  mobileBook.classList.toggle('is-visible', y > vh * 0.8 && !nearFooter);

  // jemný parallax obsahu hero
  if (heroContent && !reduceMotion && y < vh) {
    heroContent.style.transform = `translate3d(0, ${y * 0.28}px, 0)`;
    heroContent.style.opacity = String(clamp(1 - y / (vh * 0.75), 0, 1));
  }

  // parallax vrstvy (data-parallax = rychlost)
  for (const el of parallaxEls) {
    const r = el.parentElement.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) continue;
    const speed = parseFloat(el.dataset.parallax) || 0.15;
    const offset = (r.top + r.height / 2 - vh / 2) * speed;
    el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
  }

  // timeline – linka se „kreslí“ podle scrollu
  if (timeline) {
    const r = timeline.getBoundingClientRect();
    const line = vh * 0.62;
    const tp = clamp((line - r.top) / r.height, 0, 1);
    timelineFill.style.transform = `scaleY(${tp})`;
    tlItems.forEach(item => {
      const dot = item.querySelector('.tl-item__dot').getBoundingClientRect();
      item.classList.toggle('is-active', dot.top < line);
    });
  }
}
const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); } };
window.addEventListener('scroll', requestFrame, { passive: true });
window.addEventListener('resize', requestFrame);
onScrollFrame();

$('.golf-progress__ball').addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

/* ---------- Mobilní menu ---------- */
const burger = $('.burger');
const mobileMenu = $('#mobileMenu');
function setMenu(open) {
  root.classList.toggle('nav-open', open);
  root.classList.toggle('is-locked', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', t(open ? 'Zavřít menu' : 'Otevřít menu'));
  const lbl = $('.burger__label', burger);
  if (lbl) lbl.textContent = t(open ? 'Zavřít' : 'Menu');
}
burger.addEventListener('click', () => setMenu(!root.classList.contains('nav-open')));
mobileMenu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('nav-open')) setMenu(false); });

/* ---------- Menu: aktuální stránka je označená přímo v HTML (nastroje/sestav-web.js) ---------- */

/* ---------- Hero: rozdělení nadpisu na písmena, podnadpisu na slova ---------- */
(function splitHeroText() {
  const h1 = $('[data-split]');
  if (!h1) return;
  let i = 0;
  const splitNode = node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const word = document.createElement('span');
        word.className = 'word';
        [...part].forEach(ch => {
          const c = document.createElement('span');
          c.className = 'char';
          c.style.setProperty('--i', i++);
          c.textContent = ch;
          word.appendChild(c);
        });
        frag.appendChild(word);
      });
      node.replaceWith(frag);
    } else {
      [...node.childNodes].forEach(splitNode);
    }
  };
  h1.setAttribute('aria-label', h1.textContent.trim());
  [...h1.childNodes].forEach(splitNode);
  $$('.char, .word', h1).forEach(el => el.setAttribute('aria-hidden', 'true'));

  const sub = $('[data-split-words]');
  if (sub) splitWords(sub, sub.textContent);
})();
// podnadpis hero rozdělený na slova (český originál si pamatuje v data-cs)
function splitWords(el, text) {
  if (!el.dataset.cs) el.dataset.cs = text.trim();
  el.innerHTML = text.trim().split(/\s+/)
    .map((w, k) => `<span class="w" style="--i:${k}">${esc(w)}</span>`).join(' ');
}

/* ---------- Hero slider (crossfade + Ken Burns v CSS) ---------- */
(function heroSlider() {
  const slides = $$('.hero__slide');
  const capOf = s => (LANG === 'de' ? (s.dataset.captionDe || t(s.dataset.caption || '')) : s.dataset.caption) || '';
  const dotsBox = $('#heroDots');
  const caption = $('#heroCaption');
  if (!slides.length || !dotsBox) return;
  const DURATION = 6500;
  let current = 0, timer = null;
  dotsBox.style.setProperty('--slide-ms', DURATION + 'ms');

  const dots = slides.map((s, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hero__dot';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', t('Fotografie {k}: {c}', { k: k + 1, c: capOf(s) }));
    b.addEventListener('click', () => { go(k); restart(); });
    dotsBox.appendChild(b);
    return b;
  });

  function go(next) {
    if (next === current && slides[current].classList.contains('is-active') && dots[current].classList.contains('is-active')) return;
    const prev = slides[current];
    if (next !== current) {
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      setTimeout(() => prev.classList.remove('is-leaving'), 1900);
    }
    slides[next].classList.add('is-active');
    dots.forEach((d, k) => {
      d.classList.remove('is-active');
      d.classList.toggle('is-done', k < next);
      d.setAttribute('aria-selected', String(k === next));
    });
    void dots[next].offsetWidth; // restart animace výplně
    dots[next].classList.add('is-active');
    caption.style.opacity = 0;
    setTimeout(() => { caption.textContent = capOf(slides[next]); caption.style.opacity = ''; }, 300);
    current = next;
  }
  let videoOn = false; // když hraje video v pozadí, fotky se dál nestřídají
  document.addEventListener('gct:herovideo', () => { videoOn = true; clearInterval(timer); });
  function restart() {
    if (videoOn) return;
    clearInterval(timer);
    if (!reduceMotion) timer = setInterval(() => go((current + 1) % slides.length), DURATION);
  }
  go(0);
  restart();
  // pauza, když je karta prohlížeče skrytá
  document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(timer) : restart());
  refreshers.push(() => {
    caption.textContent = capOf(slides[current]);
    dots.forEach((d, k) => d.setAttribute('aria-label', t('Fotografie {k}: {c}', { k: k + 1, c: capOf(slides[k]) })));
  });
})();

/* ---------- Video v úvodu (jen úvodní stránka) ----------
   Nenačítá se při „omezit pohyb“, při úsporném režimu dat a na pomalém připojení. */
(function heroVideos() {
  const conn = navigator.connection || {};
  const skip = reduceMotion || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  $$('video.hero-video').forEach(v => {
    const box = v.parentElement;
    const btn = $('.video-toggle', box);
    if (skip || !v.dataset.src) { v.remove(); if (btn) btn.remove(); return; }
    let userPaused = false;
    // víc videí za sebou (data-playlist): dva přehrávače se prolínají
    const list = (v.dataset.playlist || '').split(',').map(s => s.trim()).filter(Boolean);
    if (list.length > 1) {
      v.loop = false;
      const v2 = v.cloneNode(false);
      v2.removeAttribute('id');
      v2.removeAttribute('poster');
      v2.preload = 'auto';
      v.after(v2);
      const vids = [v, v2];
      let cur = 0, idx = 0, switching = false;
      vids.forEach(x => x.classList.add('is-playlist'));
      v.classList.add('is-on');
      v2.src = list[1];
      const onTime = e => {
        const a = vids[cur];
        if (e.target !== a || switching || !a.duration) return;
        if (a.duration - a.currentTime < 1.1) {
          switching = true;
          const b = vids[1 - cur];
          b.currentTime = 0;
          if (!userPaused) { const p = b.play(); if (p) p.catch(() => {}); }
          b.classList.add('is-on');
          a.classList.remove('is-on');
          setTimeout(() => {
            a.pause();
            idx = (idx + 1) % list.length;
            a.src = list[(idx + 1) % list.length];
            a.load();
            cur = 1 - cur;
            switching = false;
          }, 1300);
        }
      };
      vids.forEach(x => x.addEventListener('timeupdate', onTime));
    }
    const activeVideo = () => $('video.hero-video.is-on', box) || v;
    const tryPlay = () => { const p = activeVideo().play(); if (p) p.catch(() => {}); };
    const pauseAll = () => $$('video.hero-video', box).forEach(x => x.pause());
    const label = () => {
      if (!btn) return;
      btn.setAttribute('aria-pressed', String(userPaused));
      btn.setAttribute('aria-label', t(userPaused ? 'Přehrát video' : 'Pozastavit video'));
      btn.innerHTML = icon(userPaused ? 'i-play' : 'i-pause');
    };
    v.addEventListener('playing', () => {
      box.classList.add('has-video');
      if (v.id === 'heroVideo') document.dispatchEvent(new Event('gct:herovideo'));
    }, { once: true });
    v.addEventListener('error', () => { v.remove(); if (btn) btn.remove(); }, { once: true });
    if (btn) btn.addEventListener('click', () => { userPaused = !userPaused; userPaused ? pauseAll() : tryPlay(); label(); });
    v.src = v.dataset.src;
    tryPlay();
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); else if (!userPaused) tryPlay(); });
    refreshers.push(label);
  });
})();

/* ---------- Přehrávač videí (karty „Méně slov. Víc Cínovce.“) ---------- */
(function videoModal() {
  const modal = $('#videoModal');
  if (!modal) return;
  const player = $('#videoModalPlayer');
  const title = $('#videoModalTitle');
  document.addEventListener('click', e => {
    const card = e.target.closest('[data-video]');
    if (!card) return;
    player.src = card.dataset.video;
    title.textContent = t(card.dataset.title || '');
    openDialog(modal);
    const p = player.play(); if (p) p.catch(() => {});
  });
  modal.addEventListener('close', () => { player.pause(); player.removeAttribute('src'); player.load(); });
})();

/* ---------- Scroll reveal ---------- */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
const observeReveals = (ctx = document) => $$('.reveal:not(.is-visible)', ctx).forEach(el => revealObserver.observe(el));
observeReveals();

/* ---------- Animace čísel ---------- */
function animateNumber(el, from, to, duration = 1800, plain = false) {
  const write = v => { el.textContent = plain ? String(Math.round(v)) : fmt(v); };
  if (reduceMotion || from === to) return write(to);
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  (function step(now) {
    const t = clamp((now - start) / duration, 0, 1);
    write(from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(step);
  })(start);
}
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    animateNumber(el, Number(el.dataset.from || 0), Number(el.dataset.count), 2000, el.hasAttribute('data-plain'));
    counterObserver.unobserve(el);
  });
}, { threshold: 0.6 });
$$('[data-count]').forEach(el => {
  if (!reduceMotion) el.textContent = el.hasAttribute('data-plain') ? (el.dataset.from || '0') : '0';
  counterObserver.observe(el);
});

/* ---------- Otevírací doba: stav sezóny (duben–listopad) ---------- */
function seasonStatus() {
  const box = $('#seasonStatus');
  const m = new Date().getMonth(); // 0 = leden
  const inSeason = m >= 3 && m <= 10;
  if (box) box.classList.toggle('is-off', !inSeason);
  if (box) box.lastElementChild.textContent = t(inSeason ? 'Sezóna právě probíhá' : 'Mimo sezónu – těšíme se na jaro');
  // odznak v hero: v prosinci se už hlásí sezóna příštího roku
  const year = new Date().getFullYear();
  const badge = $('#seasonBadge');
  if (!badge) return;
  badge.textContent = inSeason ? t('Sezóna {y} otevřena', { y: year }) : t('Sezóna {y} začíná v dubnu', { y: m === 11 ? year + 1 : year });
  badge.previousElementSibling.style.background = inSeason ? '' : 'var(--gold-2)';
}
$('#year').textContent = new Date().getFullYear();
seasonStatus();
refreshers.push(seasonStatus);

/* ---------- AKTUALITY: karty + modal ---------- */
(function news() {
  const grid = $('#newsGrid');
  const moreBtn = $('#newsMore');
  const modal = $('#newsModal');
  if (!grid) return;
  const LIMIT = Number(grid.dataset.limit) || 0; // 0 = všechny
  const img = $('#newsModalImg');
  const thumbs = $('#newsModalThumbs');
  let expanded = false;   // uživatel už rozbalil starší aktuality
  let openIndex = -1;     // index aktuality otevřené v modalu
  let currentImg = '';

  // instant = bez scroll-reveal animace (při přepnutí jazyka)
  function render(instant) {
    if (!NEWS.length) {
      grid.innerHTML = `<p class="news-empty">${t(contentOk ? 'Zatím zde nejsou žádné aktuality.' : 'Obsah se nepodařilo načíst. Zkuste prosím stránku obnovit.')}</p>`;
      if (moreBtn) moreBtn.hidden = true;
      return;
    }
    grid.innerHTML = (LIMIT ? NEWS.slice(0, LIMIT) : NEWS).map((n, k) => {
      const d = parseDate(n.date);
      const hidden = !LIMIT && !expanded && k >= NEWS_INITIAL;
      return `
      <article class="news-card reveal${instant ? ' is-visible' : ''} ${k === 0 && !LIMIT ? 'news-card--featured' : ''}" style="--d:${(k % 3) * 0.08}s" ${hidden ? 'hidden' : ''}>
        <div class="news-card__media">
          <span class="news-card__date"><b>${d.getDate()}</b><span>${monthName(d)} ${d.getFullYear()}</span></span>
          <img src="${esc(thumbUrl(n.img || NEWS_FALLBACK_IMG))}" alt="" loading="lazy" decoding="async">
        </div>
        <div class="news-card__body">
          <span class="tag">${esc(L(n, 'tag'))}</span>
          <h3 class="news-card__title">${esc(L(n, 'title'))}</h3>
          <p class="news-card__excerpt">${esc(L(n, 'excerpt'))}</p>
          <button class="link-arrow news-card__more" type="button" data-news="${k}">${t('Číst více')} ${icon('i-arrow')}</button>
        </div>
      </article>`;
    }).join('');
    if (!instant) observeReveals(grid);
    const hiddenCount = expanded ? 0 : Math.max(0, NEWS.length - NEWS_INITIAL);
    if (moreBtn) {
      moreBtn.hidden = LIMIT > 0 || !hiddenCount;
      moreBtn.firstChild.textContent = `${t('Zobrazit starší aktuality')} (${hiddenCount}) `;
    }
  }
  render(false);

  if (moreBtn) moreBtn.addEventListener('click', () => {
    expanded = true;
    $$('.news-card[hidden]', grid).forEach((c, i) => {
      c.hidden = false;
      c.classList.remove('is-visible');
      c.style.setProperty('--d', (i * 0.1) + 's');
      requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('is-visible')));
    });
    moreBtn.hidden = true;
  });

  function showImage(f) {
    currentImg = f;
    img.src = imgUrl(f);
    img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
    $$('button', thumbs).forEach(b => b.classList.toggle('is-active', b.dataset.f === f));
  }
  function fillNews(k) {
    const n = NEWS[k];
    openIndex = k;
    $('#newsModalTitle').textContent = L(n, 'title');
    $('#newsModalTag').textContent = L(n, 'tag');
    const time = $('#newsModalDate');
    time.textContent = czDate(n.date);
    time.dateTime = n.date;
    $('#newsModalText').innerHTML = richText(L(n, 'body'));
    img.alt = L(n, 'title');
    const gal = n.gallery || [];
    thumbs.innerHTML = gal.length > 1
      ? gal.map(f => `<button type="button" data-f="${esc(f)}" aria-label="${t('Zobrazit fotku')}"><img src="${esc(thumbUrl(f))}" alt="" loading="lazy"></button>`).join('')
      : '';
    thumbs.hidden = gal.length <= 1;
    const cta = n.cta;
    const href = cta ? pageHref(safeHref(cta.href)) : '';
    const ext = /^https?:/i.test(href);
    const ctaIcon = /^tel:/i.test(href) ? 'i-phone' : /^mailto:/i.test(href) ? 'i-mail' : /rezervace/i.test(href) ? 'i-calendar' : ext ? 'i-external' : 'i-arrow';
    $('#newsModalCta').innerHTML = href && cta.label
      ? `<a class="btn btn--dark" href="${esc(href)}" ${ext ? 'target="_blank" rel="noopener"' : ''}>${icon(ctaIcon)} ${esc(L(n, 'ctaLabel') || cta.label)}</a>`
      : '';
  }
  function openNews(k) {
    fillNews(k);
    showImage(NEWS[k].img || NEWS_FALLBACK_IMG);
    openDialog(modal);
    $('.modal__scroll', modal).scrollTop = 0;
  }
  modal.addEventListener('close', () => { openIndex = -1; });
  thumbs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) showImage(b.dataset.f); });
  grid.addEventListener('click', e => { const b = e.target.closest('[data-news]'); if (b) openNews(Number(b.dataset.news)); });
  // interní odkaz z modalu (např. #cenik): zavřít a pak plynule posunout
  $('#newsModalCta').addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    closeDialog(modal);
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (target) setTimeout(() => target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), 380);
  });

  refreshers.push(() => {
    render(true);
    if (modal.open && openIndex >= 0) { fillNews(openIndex); showImage(currentImg); }
  });
})();

/* ---------- CENÍK: přepínač období + kopírování čísla účtu ---------- */
(function pricing() {
  const toggle = $('#priceToggle');
  if (!toggle) return;
  const pill = $('.price-toggle__pill', toggle);
  const buttons = $$('button', toggle);
  const prices = $$('[data-price]');
  const current = new Date() > deadlineDate() ? 'late' : 'early';
  let selected = current;

  const nowText = () => {
    $('#priceNow').textContent = t(current === 'late'
      ? 'Aktuálně platí ceny při platbě po {d}'
      : 'Při platbě do {d} ušetříte', { d: deadlineLong() });
  };
  function movePill(btn) {
    pill.style.width = btn.offsetWidth + 'px';
    pill.style.transform = `translateX(${btn.offsetLeft}px)`;
  }
  function setPeriod(period, animate = true) {
    selected = period;
    buttons.forEach(b => {
      const on = b.dataset.period === period;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
      if (on) movePill(b);
    });
    prices.forEach(el => {
      const from = Number(el.textContent.replace(/\D/g, '')) || 0;
      const to = Number(el.dataset[period]);
      animate ? animateNumber(el, from, to, 600) : (el.textContent = fmt(to));
      const other = period === 'early' ? 'late' : 'early';
      const alt = el.closest('.price-card').querySelector('[data-price-alt]');
      alt.textContent = t(other === 'late' ? 'Při platbě po {d}:' : 'Při platbě do {d}:', { d: deadlineLong() })
        + ' ' + fmt(Number(el.dataset[other])) + ' ' + t('Kč');
    });
  }
  buttons.forEach(b => b.addEventListener('click', () => setPeriod(b.dataset.period)));
  nowText();
  setPeriod(current, false);
  window.addEventListener('resize', () => movePill($('.is-active', toggle)));
  document.fonts && document.fonts.ready.then(() => movePill($('.is-active', toggle)));
  refreshers.push(() => { nowText(); setPeriod(selected, false); });
})();

(function bankAccount() {
  const ACC = '6918554389/0800';
  const IBAN = 'CZ18 0800 0000 0069 1855 4389';
  const BIC = 'GIBACZPX';
  const code = $('#accountNo');
  if (!code) return;
  const btn = $('.extra--account [data-copy]');
  const line = $('.account-iban');
  const qr = $('.account-qr img');
  function update() {
    const de = LANG === 'de';
    code.textContent = de ? IBAN : ACC;
    btn.dataset.copy = de ? IBAN.replace(/\s/g, '') : ACC;
    line.textContent = de ? `BIC ${BIC} · Konto ${ACC} · Empfänger: Golf club Teplice z.s.` : `IBAN ${IBAN} · BIC ${BIC}`;
    qr.src = de ? 'assets/qr-platba-de.svg' : 'assets/qr-platba.svg';
  }
  update();
  refreshers.push(update);
})();

$$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
  const text = btn.dataset.copy;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  toast(t('Číslo účtu {x} zkopírováno', { x: text }), 'i-copy');
}));

/* ---------- HŘIŠTĚ: hotspoty, výběr jamek, tabulka, panel jamky ---------- */
(function course() {
  const map = $('#courseMap');
  if (!map) return;
  const picker = $('#holePicker');
  const table = $('#distTable');
  const drawer = $('#holeDrawer');
  const body = $('#holeBody');
  const dotsBox = $('#holeDots');
  const h = key => $(`[data-h="${key}"]`, drawer);
  let currentHole = 1;
  let currentTip = 'scratch';
  let currentNine = 0;

  // hotspoty na mapě, čipy pod mapou a tečky v panelu
  HOLES.forEach(hole => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hotspot';
    b.dataset.hole = hole.n;
    b.style.cssText = `--x:${hole.x}%;--y:${hole.y}%;--n:${hole.n}`;
    map.appendChild(b);

    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'hole-pick';
    c.dataset.hole = hole.n;
    c.textContent = hole.n;
    picker.appendChild(c);

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.dataset.hole = hole.n;
    dotsBox.appendChild(dot);
  });
  // popisky závislé na jazyce
  function labelHoles() {
    $$('.hotspot', map).forEach(b => {
      const hole = HOLES[b.dataset.hole - 1];
      b.setAttribute('aria-label', t('Jamka {n}, PAR {p}, {m} metrů', { n: hole.n, p: hole.par, m: hole.yellow }));
      b.innerHTML = `${hole.n}<span class="hotspot__tip">${t('Jamka')} ${hole.n}/${hole.n + 9} · ${t('PAR')} ${hole.par} · ${hole.yellow} m</span>`;
    });
    $$('.hole-pick', picker).forEach(c => c.setAttribute('aria-label', t('Detail jamky {n}', { n: c.dataset.hole })));
    $$('button', dotsBox).forEach(d => d.setAttribute('aria-label', `${t('Jamka')} ${d.dataset.hole}`));
  }
  labelHoles();

  // tabulka vzdáleností – přední / zadní devítka; součty se počítají z délek jamek
  function renderTable(nine) {
    currentNine = nine;
    const num = hole => hole.n + nine * 9;
    const yellow = hole => (nine && hole.yellowBack) ? hole.yellowBack : hole.yellow;
    const sum = fn => HOLES.reduce((acc, hl) => acc + Number(fn(hl)), 0);
    const range = nine ? '10–18' : '1–9';
    const row = (label, fn, total) =>
      `<tr><th scope="row">${label}</th>${HOLES.map(hl => `<td>${fn(hl)}</td>`).join('')}<td class="is-total">${total}</td></tr>`;
    table.innerHTML = `
      <caption class="sr-only">${t('Vzdálenosti jamek {r} v metrech', { r: range })}</caption>
      <thead><tr><th scope="col">${t('Jamka')}</th>${HOLES.map(hl => `<th scope="col"><button class="hole-btn" type="button" data-hole="${hl.n}" aria-label="${t('Detail jamky {n}', { n: num(hl) })}">${num(hl)}</button></th>`).join('')}<th scope="col" class="is-total">${range}</th></tr></thead>
      <tbody>
        ${row(t('PAR'), hl => hl.par, sum(hl => hl.par))}
        ${row(`<i class="tee tee--y"></i>${t('Žlutá')}`, yellow, fmt(sum(yellow)))}
        ${row(`<i class="tee tee--r"></i>${t('Červená')}`, hl => hl.red, fmt(sum(hl => hl.red)))}
        ${row('HCP', hl => hl.hcp[nine], '–')}
      </tbody>`;
  }
  renderTable(0);
  $$('.seg button').forEach(b => b.addEventListener('click', () => {
    $$('.seg button').forEach(x => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    table.classList.add('is-swapping');
    setTimeout(() => { renderTable(Number(b.dataset.nine)); table.classList.remove('is-swapping'); }, reduceMotion ? 0 : 250);
  }));
  // zvýraznění sloupce při najetí myší
  table.addEventListener('mouseover', e => {
    const cell = e.target.closest('td, th');
    $$('.is-col-hover', table).forEach(c => c.classList.remove('is-col-hover'));
    if (!cell || cell.cellIndex === 0) return;
    $$('tr', table).forEach(tr => tr.cells[cell.cellIndex] && tr.cells[cell.cellIndex].classList.add('is-col-hover'));
  });
  table.addEventListener('mouseleave', () => $$('.is-col-hover', table).forEach(c => c.classList.remove('is-col-hover')));

  // panel s detailem jamky
  function fillHole(n) {
    const hole = HOLES[n - 1];
    h('num').textContent = hole.n;
    h('num2').textContent = hole.n + 9;
    h('par').textContent = hole.par;
    h('hcp').textContent = `${hole.hcp[0]} / ${hole.hcp[1]}`;
    h('yellow').textContent = `${hole.yellow} m`;
    h('red').textContent = `${hole.red} m`;
    h('note').textContent = hole.yellowBack ? t('Na 2. devítce (jamka {n}) se ze žlutých hraje {m} m.', { n: hole.n + 9, m: hole.yellowBack }) : '';
    h('desc').textContent = L(hole, 'desc');
    const plan = h('plan');
    plan.src = `${HOLE_IMG}${hole.n}.png`;
    plan.alt = t('Plánek jamky {n}', { n: hole.n });
    setTip(currentTip);
    $$('button', dotsBox).forEach(d => d.classList.toggle('is-active', Number(d.dataset.hole) === n));
    $$('.hotspot', map).forEach(s => s.classList.toggle('is-current', drawer.open && Number(s.dataset.hole) === n));
  }
  function setTip(which) {
    currentTip = which;
    const hole = HOLES[currentHole - 1];
    $$('[data-tip]', drawer).forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.tip === which)));
    const tipEl = h('tip');
    tipEl.textContent = L(hole, which) || t('Tip pro tuto jamku doplníme.');
    tipEl.style.animation = 'none'; void tipEl.offsetWidth; tipEl.style.animation = '';
  }
  function showHole(n, animate = true) {
    n = ((n - 1 + 9) % 9) + 1;
    if (!animate || reduceMotion || !drawer.open) { currentHole = n; fillHole(n); return; }
    body.classList.add('is-swapping');
    setTimeout(() => { currentHole = n; fillHole(n); body.scrollTop = 0; body.classList.remove('is-swapping'); }, 220);
  }
  function openHole(n) {
    openDialog(drawer);
    showHole(n, false);
  }
  drawer.addEventListener('close', () => $$('.hotspot', map).forEach(s => s.classList.remove('is-current')));

  document.addEventListener('click', e => {
    const trigger = e.target.closest('#courseMap [data-hole], #holePicker [data-hole], #distTable [data-hole]');
    if (trigger) openHole(Number(trigger.dataset.hole));
  });
  dotsBox.addEventListener('click', e => { const d = e.target.closest('[data-hole]'); if (d) showHole(Number(d.dataset.hole)); });
  $$('[data-hole-step]', drawer).forEach(b => b.addEventListener('click', () => showHole(currentHole + Number(b.dataset.holeStep))));
  $$('[data-tip]', drawer).forEach(tab => tab.addEventListener('click', () => setTip(tab.dataset.tip)));
  drawer.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') showHole(currentHole + 1);
    if (e.key === 'ArrowLeft') showHole(currentHole - 1);
  });

  refreshers.push(() => { labelHoles(); renderTable(currentNine); fillHole(currentHole); });
})();

/* ---------- TURNAJE ---------- */
(function tournaments() {
  const list = $('#tourList');
  if (!list) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let filter = 'all';
  const published = TOURNAMENTS_PUBLISHED && TOURNAMENTS.length > 0;
  $('#tourFilters').hidden = !published;
  $('.tour-note').hidden = !published;

  function render(instant) {
    if (!published) {
      list.innerHTML = `
      <div class="tour-empty">
        ${icon('i-trophy')}
        <h3>${t('Kalendář turnajů připravujeme')}</h3>
        <p>${t('Termíny turnajů zveřejníme zde. Přihlášky probíhají přes systém České golfové federace.')}</p>
        <a class="btn btn--dark btn--sm" href="${CGF_URL}" target="_blank" rel="noopener">${t('Turnaje v kalendáři ČGF')} ${icon('i-external')}</a>
      </div>`;
      return;
    }
    list.innerHTML = TOURNAMENTS.map(tr => {
      const d = parseDate(tr.date);
      const past = d < today;
      const when = past ? 'past' : 'upcoming';
      return `
      <article class="tour reveal${instant ? ' is-visible' : ''} ${past ? 'is-past' : ''}" data-when="${when}" ${filter !== 'all' && filter !== when ? 'hidden' : ''}>
        <div class="tour__date"><b>${d.getDate()}</b><span>${monthName(d)} ${d.getFullYear()}</span></div>
        <div>
          <h3 class="tour__name">${esc(L(tr, 'name'))}</h3>
          <div class="tour__meta">
            <span>${icon('i-trophy')}${esc(L(tr, 'format'))}</span>
            <span>${icon('i-users')}${esc(L(tr, 'cat'))}</span>
            <span>${icon('i-pin')}Golf Teplice, Cínovec</span>
          </div>
        </div>
        <div class="tour__side">
          <span class="tour__status">${t(past ? 'Proběhlo' : 'Přihlášky otevřené')}</span>
          <a class="btn btn--sm ${past ? 'btn--outline' : 'btn--dark'}" href="${CGF_URL}" target="_blank" rel="noopener">
            ${t(past ? 'Výsledky na ČGF' : 'Přihlásit se přes ČGF')} ${icon('i-external')}
          </a>
        </div>
      </article>`;
    }).join('');
    if (!instant) observeReveals(list);
  }
  render(false);

  $('#tourFilters').addEventListener('click', e => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    filter = chip.dataset.filter;
    $$('#tourFilters .chip').forEach(c => c.classList.toggle('is-active', c === chip));
    $$('.tour', list).forEach(item => { item.hidden = filter !== 'all' && item.dataset.when !== filter; });
  });
  refreshers.push(() => render(true));
})();

/* ---------- FOTOGALERIE + LIGHTBOX ---------- */
(function gallery() {
  const wrap = $('#gallery');
  if (!wrap) return;
  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  let visible = [];
  let index = 0;

  const capOf = g => (LANG === 'de' ? (g.tDe || t(g.t || '')) : g.t) || '';
  wrap.innerHTML = GALLERY.map((g, k) => `
    <figure class="g-item ${g.w / g.h > 2.2 ? 'is-pano' : ''}" data-cat="${esc(g.cat || '')}" data-k="${k}" tabindex="0" role="button">
      <img src="${esc(thumbUrl(g.f))}" alt="" width="${g.w}" height="${g.h}" loading="lazy" decoding="async">
      <figcaption><span></span>${icon('i-zoom')}</figcaption>
    </figure>`).join('');

  // popisky fotek podle jazyka (český popisek je klíč do slovníku DE)
  function labelGallery() {
    $$('.g-item', wrap).forEach(fig => {
      const caption = capOf(GALLERY[Number(fig.dataset.k)]);
      fig.setAttribute('aria-label', t('Zvětšit: {x}', { x: caption }));
      fig.querySelector('img').alt = caption;
      fig.querySelector('figcaption span').textContent = caption;
    });
  }
  labelGallery();

  // animované načítání: fotka se plynule objeví po načtení
  $$('.g-item img', wrap).forEach(im => {
    const done = () => im.parentElement.classList.add('is-loaded');
    im.complete && im.naturalWidth ? done() : im.addEventListener('load', done, { once: true });
    im.addEventListener('error', done, { once: true });
  });

  function updateVisible() { visible = $$('.g-item:not([hidden])', wrap); applyLimit(); }

  // na telefonu nejdřív jen PHONE_LIMIT fotek, zbytek po kliknutí na tlačítko (lightbox ukazuje všechny)
  const PHONE_LIMIT = 10;
  const moreBtn = $('#galleryMore');
  let showAll = false;
  function applyLimit() {
    const limited = !showAll && visible.length > PHONE_LIMIT;
    wrap.classList.toggle('is-limited', limited);
    visible.forEach((item, i) => item.classList.toggle('is-over', i >= PHONE_LIMIT));
    moreBtn.hidden = !limited;
    moreBtn.textContent = `${t('Zobrazit všechny fotky')} (${visible.length})`;
  }
  moreBtn.addEventListener('click', () => { showAll = true; applyLimit(); });
  updateVisible();

  $('#galleryFilters').addEventListener('click', e => {
    const chip = e.target.closest('button');
    if (!chip) return;
    if (chip.dataset.toast) return toast(chip.dataset.toast, 'i-info');
    $$('#galleryFilters [data-cat]').forEach(c => c.classList.toggle('is-active', c === chip));
    let n = 0;
    $$('.g-item', wrap).forEach(item => {
      const show = chip.dataset.cat === 'all' || item.dataset.cat === chip.dataset.cat;
      item.hidden = !show;
      item.classList.remove('is-entering');
      if (show && !reduceMotion) {
        item.style.setProperty('--d', Math.min(n++, 12) * 0.05 + 's');
        void item.offsetWidth;
        item.classList.add('is-entering');
      }
    });
    updateVisible();
  });

  function show(i, animate = true) {
    index = (i + visible.length) % visible.length;
    const g = GALLERY[Number(visible[index].dataset.k)];
    const apply = () => {
      lbImg.src = imgUrl(g.f);
      lbImg.alt = capOf(g);
      $('#lbCaption').textContent = capOf(g);
      $('#lbCounter').textContent = `${index + 1} / ${visible.length}`;
      lbImg.classList.remove('is-swapping');
      // přednačtení sousedních fotek
      [index - 1, index + 1].forEach(j => {
        const s = visible[(j + visible.length) % visible.length];
        if (s) new Image().src = imgUrl(GALLERY[Number(s.dataset.k)].f);
      });
    };
    if (!animate || reduceMotion) return apply();
    lbImg.classList.add('is-swapping');
    setTimeout(apply, 200);
  }
  const openAt = item => { updateVisible(); show(visible.indexOf(item), false); openDialog(lb); };
  wrap.addEventListener('click', e => { const it = e.target.closest('.g-item'); if (it) openAt(it); });
  wrap.addEventListener('keydown', e => {
    const it = e.target.closest('.g-item');
    if (it && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openAt(it); }
  });
  $$('[data-lb-step]', lb).forEach(b => b.addEventListener('click', () => show(index + Number(b.dataset.lbStep))));
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });
  // klik mimo fotku zavře lightbox
  $('#lbStage').addEventListener('click', e => { if (e.target.id === 'lbStage') closeDialog(lb); });
  // swipe na mobilu
  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  refreshers.push(() => { labelGallery(); applyLimit(); if (lb.open) show(index, false); });
})();

/* ---------- OCHUTNÁVKA FOTOGALERIE (úvodní stránka) ---------- */
(function galleryTeaser() {
  const box = $('#galleryTeaser');
  if (!box || !GALLERY.length) return;
  // přednost mají fotky na šířku, panoramata vynechat
  const pick = GALLERY.filter(g => g.w / g.h <= 2).slice(0, 8);
  box.innerHTML = pick.map(g => `<a class="teaser-photo" href="fotogalerie.html" aria-label="Fotogalerie"><img src="${esc(thumbUrl(g.f))}" alt="" loading="lazy" width="${g.w}" height="${g.h}"></a>`).join('');
})();

/* ---------- SNĚŽENÍ v sekci Půjčovna běžek (canvas) ---------- */
(function snow() {
  const canvas = $('#snow');
  if (!canvas || reduceMotion) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0, flakes = [], raf = null;
  const make = (anywhere) => ({
    x: Math.random() * w, y: anywhere ? Math.random() * h : -10,
    r: Math.random() * 2.4 + 0.6, s: Math.random() * 0.7 + 0.35,
    d: Math.random() * Math.PI * 2, o: Math.random() * 0.5 + 0.35
  });
  function resize() {
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flakes = Array.from({ length: Math.round(clamp(w / 9, 40, 150)) }, () => make(true));
  }
  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      f.d += 0.012; f.y += f.s; f.x += Math.sin(f.d) * 0.45;
      if (f.y > h + 6) Object.assign(f, make(false));
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${f.o})`;
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  }
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !raf) { if (!w) resize(); tick(); }
    else if (!entry.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
  }).observe(canvas);
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
})();

/* ---------- FORMULÁŘE – odeslání na FORM_ENDPOINT (kontakt.php) ----------
   Ochrana proti spamu: skryté pole „website“ (vyplní jen robot) a minimální doba
   vyplnění (elapsed) – obojí kontroluje i kontakt.php. */
const pageLoadedAt = Date.now();
async function sendForm(formEl, type) {
  const data = new FormData(formEl);
  data.append('type', type);
  data.append('lang', LANG);
  data.append('elapsed', String(Date.now() - pageLoadedAt));
  const res = await fetch(FORM_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
  const json = await res.json().catch(() => ({ ok: false }));
  if (!res.ok || !json.ok) throw new Error(json.error || 'HTTP ' + res.status);
}
(function forms() {
  const card = $('#contactCard');
  const form = $('#contactForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const btn = $('button[type="submit"]', form);
    btn.classList.add('is-loading');
    btn.innerHTML = `${icon('i-spinner')} ${t('Odesílám…')}`;
    try {
      await sendForm(form, 'contact');
      card.classList.add('is-sent');
      form.reset();
    } catch {
      toast(t('Odeslání se nepodařilo. Napište nám prosím na golf@golf-teplice.cz.'), 'i-info');
    } finally {
      btn.classList.remove('is-loading');
      btn.innerHTML = `${icon('i-send')} ${t('Odeslat zprávu')}`;
    }
  });
  $('#formReset').addEventListener('click', () => card.classList.remove('is-sent'));

  $$('#contactForm input, #contactForm textarea, #newsletterForm input').forEach(el => {
    el.addEventListener('invalid', () => {
      const v = el.validity;
      el.setCustomValidity(v.valueMissing
        ? t(el.type === 'checkbox' ? 'Pro odeslání je potřeba souhlas.' : 'Vyplňte prosím toto pole.')
        : v.typeMismatch ? t('Zadejte platnou e-mailovou adresu.') : '');
    });
    ['input', 'change'].forEach(ev => el.addEventListener(ev, () => el.setCustomValidity('')));
    refreshers.push(() => el.setCustomValidity('')); // po přepnutí jazyka nenechat hlášku v jiném jazyce
  });

  const nl = $('#newsletterForm');
  nl.addEventListener('submit', async e => {
    e.preventDefault();
    if (!nl.checkValidity()) { nl.reportValidity(); return; }
    const btn = $('button[type="submit"]', nl);
    btn.classList.add('is-loading');
    try {
      await sendForm(nl, 'newsletter');
      nl.reset();
      toast(t('Děkujeme, novinky vám budeme posílat e-mailem.'));
    } catch {
      toast(t('Odeslání se nepodařilo. Napište nám prosím na golf@golf-teplice.cz.'), 'i-info');
    } finally {
      btn.classList.remove('is-loading');
    }
  });
})();

/* ---------- MAPA – iframe Google se vloží až po kliknutí ---------- */
const mapSrc = () => 'https://maps.google.com/maps?q=C%C3%ADnovec%20275%2C%20417%2032%20Dub%C3%AD&z=14&output=embed&hl=' + (LANG === 'de' ? 'de' : 'cs');
refreshers.push(() => {
  const frame = $('#mapEmbed iframe');
  if (frame) { frame.src = mapSrc(); frame.title = t('Mapa – Golf Club Teplice, Cínovec 275'); }
});
if ($('#mapLoad')) $('#mapLoad').addEventListener('click', () => {
  const frame = document.createElement('iframe');
  frame.title = t('Mapa – Golf Club Teplice, Cínovec 275');
  frame.referrerPolicy = 'no-referrer-when-downgrade';
  frame.src = mapSrc();
  $('#mapEmbed .map-consent').replaceWith(frame);
});

/* ---------- ZÁSADY OCHRANY OSOBNÍCH ÚDAJŮ ---------- */
const privacyModal = $('#privacyModal');
document.addEventListener('click', e => {
  if (!e.target.closest('[data-open-privacy]')) return;
  e.preventDefault();
  openDialog(privacyModal);
  $('.modal__scroll', privacyModal).scrollTop = 0;
});

/* ---------- PARTNEŘI – nekonečný pás ---------- */
(function partners() {
  const track = $('#partnersMarquee .marquee__track');
  if (!PARTNERS.length) { $('#partnersMarquee').hidden = true; return; }
  const reps = Math.max(1, Math.ceil(8 / PARTNERS.length)); // aspoň ~8 log na skupinu
  const item = (p, hidden, dup) => {
    const src = isPath(p.logo) ? p.logo : PARTNER_IMG + p.logo;
    const img = `<img src="${esc(src)}" alt="${hidden ? '' : esc(p.name || '')}" loading="lazy">`;
    const cls = 'partner' + (dup ? ' is-dup' : '');
    const url = /^https?:\/\//i.test(p.url || '') ? p.url : '';
    return url
      ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener" ${hidden ? 'tabindex="-1" aria-hidden="true"' : ''} aria-label="${esc(p.name || '')}">${img}</a>`
      : `<span class="${cls}">${img}</span>`;
  };
  const group = hidden => `<div class="marquee__group" ${hidden ? 'aria-hidden="true"' : ''}>${
    Array.from({ length: reps }, (_, r) => PARTNERS.map(p => item(p, hidden || r > 0, r > 0)).join('')).join('')
  }</div>`;
  track.innerHTML = group(false) + group(true); // druhá kopie = plynulá smyčka
})();

/* ---------- Ostatní tlačítka s oznámením ---------- */
$$('[data-toast]:not(#galleryFilters [data-toast])').forEach(b => b.addEventListener('click', () => toast(b.dataset.toast, 'i-info')));

/* ---------- MALÉ UPOZORNĚNÍ „Chcete starý web?“ (jen po dobu přechodu) ----------
   OLD_SITE = null upozornění vypne. Na doméně golf-teplice.cz se samo neukáže,
   takže po definitivní výměně webu nezůstane viset odkaz na neexistující starý web. */
(function oldSiteNotice() {
  const OLD_SITE = 'https://www.golf-teplice.cz/';
  const KEY = 'gct-stary-web-zavreno';
  const HIDE_DAYS = 7;
  const box = $('#oldSite');
  if (!OLD_SITE || !box || /(^|\.)golf-teplice\.cz$/.test(location.hostname)) return;
  try {
    const closedAt = Number(localStorage.getItem(KEY) || 0);
    if (closedAt && Date.now() - closedAt < HIDE_DAYS * 864e5) return;
  } catch { /* bez úložiště */ }

  // odkaz vede na stránku starého webu podle sekce, kterou má návštěvník právě na obrazovce
  const OLD_PAGES = ['onas', 'aktuality', 'cenik', 'hriste', 'treninky', 'turnaje', 'fotogalerie', 'pujcovna-bezek', 'kontakty'];
  const link = $('#oldSiteLink');
  link.addEventListener('click', () => {
    if (LANG === 'de') { link.href = OLD_SITE + 'index.php?mutace=de'; return; }
    const id = root.dataset.page || '';
    link.href = OLD_SITE + (OLD_PAGES.includes(id) ? id : 'index.php?mutace=cs');
  });
  $('.old-site__close', box).addEventListener('click', () => {
    box.classList.remove('is-visible');
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* bez úložiště */ }
    setTimeout(() => { box.hidden = true; }, 600);
  });
  setTimeout(() => {
    box.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('is-visible')));
  }, 4000);
})();

/* ---------- JAZYKOVÁ VERZE CZ / DE ----------
   1) Statické texty a atributy se při startu uloží (česky) a při přepnutí se
      přeloží přes slovník DE. Prvek s atributem data-de má vlastní překlad.
   2) Části vykreslované skriptem (aktuality, turnaje, tabulka, galerie, ceny…)
      se znovu vykreslí přes funkce v poli refreshers.
   Volba jazyka se pamatuje v prohlížeči; odkaz s ?lang=de otevře rovnou němčinu. */
const I18N_SKIP = [
  'script', 'style', 'svg', 'code', '[data-i18n-skip]',
  '.burger__label', '.hero__slides', '#coaches', '[data-split-words]', '[data-count]', '[data-price]', '[data-price-alt]', '[data-h]',
  '#priceNow', '#seasonStatus', '#seasonBadge', '.account-iban', '#galleryMore', '#heroCaption', '#heroDots', '#newsGrid', '#newsMore',
  '#newsModal .modal__body', '#newsModalThumbs', '#tourList', '#gallery', '#distTable',
  '#courseMap .hotspot', '#holePicker .hole-pick', '#holeDots', '#lbCounter', '#lbCaption',
  '#partnersMarquee', '#toasts'
].join(', ');
const I18N_ATTRS = ['aria-label', 'placeholder', 'alt', 'title', 'data-caption', 'data-toast'];
const i18nTexts = [];
const i18nAttrs = [];
const metaDesc = $('meta[name="description"]');
const META_CS = { title: document.title, desc: metaDesc.content };
const ringText = $('#ringText');
const RING_CS = ringText ? ringText.textContent : '';
const heroSub = $('[data-split-words]');

(function captureI18n() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!/[A-Za-zÀ-ž]/.test(node.textContent) || node.parentElement.closest(I18N_SKIP)) continue;
    i18nTexts.push({ node, cs: node.textContent, de: node.parentElement.dataset.de });
  }
  $$(I18N_ATTRS.map(a => `[${a}]`).join(', ')).forEach(el => {
    if (el.closest(I18N_SKIP)) return;
    I18N_ATTRS.forEach(a => { if (el.hasAttribute(a)) i18nAttrs.push({ el, a, cs: el.getAttribute(a) }); });
  });
})();

// přeloží text uzlu a zachová mezery kolem něj
function translateNode(cs, own) {
  const m = cs.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return m[1] + (own !== undefined ? own : t(m[2])) + m[3];
}

function setLang(lang, remember = true) {
  LANG = lang === 'de' ? 'de' : 'cs';
  root.lang = LANG;
  i18nTexts.forEach(({ node, cs, de }) => { node.textContent = LANG === 'de' ? translateNode(cs, de) : cs; });
  i18nAttrs.forEach(({ el, a, cs }) => el.setAttribute(a, LANG === 'de' ? t(cs) : cs));
  document.title = t(META_CS.title);
  metaDesc.content = t(META_CS.desc);
  if (ringText) ringText.textContent = t(RING_CS);
  // odkazy s německou variantou (PDF ceník, předmět e-mailu…)
  $$('[data-href-de]').forEach(a => {
    if (!a.dataset.hrefCs) a.dataset.hrefCs = a.getAttribute('href');
    a.setAttribute('href', LANG === 'de' ? a.dataset.hrefDe : a.dataset.hrefCs);
  });
  if (heroSub) splitWords(heroSub, t(heroSub.dataset.cs));
  $$('.lang [data-lang]').forEach(b => {
    const on = b.dataset.lang === LANG;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  refreshers.forEach(fn => fn());
  if (remember) {
    try { localStorage.setItem('gct-lang', LANG); } catch { /* bez úložiště */ }
    // adresa ?lang=de, aby šlo sdílet odkaz rovnou na němčinu
    try {
      const url = new URL(location.href);
      if (LANG === 'de') url.searchParams.set('lang', 'de'); else url.searchParams.delete('lang');
      history.replaceState(null, '', url);
    } catch { /* např. file:// */ }
  }
}

document.addEventListener('click', e => {
  const b = e.target.closest('.lang [data-lang]');
  if (b && b.dataset.lang !== LANG) setLang(b.dataset.lang);
});

// výchozí jazyk: ?lang=de v adrese, jinak poslední volba v prohlížeči
let startLang = 'cs';
try { startLang = new URLSearchParams(location.search).get('lang') || localStorage.getItem('gct-lang') || 'cs'; } catch { /* bez úložiště */ }
if (startLang === 'de') setLang('de', false);

})();
