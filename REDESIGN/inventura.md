# Inventura webu Golf Club Teplice (před redesignem, 17. 11. 2026)

Tento seznam je závazný. Po redesignu musí všechno níže dál existovat a fungovat.
Plné texty všech stránek a jejich odkazy jsou uložené ve `REDESIGN/texty-pred/*.txt`, aby se na konci dalo strojově porovnat, že nic nezmizelo.
Screenshoty před redesignem (celé stránky, desktop 1440 px a mobil 390 px) jsou ve `REDESIGN/screenshots-pred/`.

## 1. Technologie

- **Statický vícestránkový web bez frameworku.** Nejsou tu React, Tailwind ani Bootstrap.
- **Šablony** jsou v `sablony/`:
  - `_hlava.html` – `<head>`;
  - `_lista.html` – hlavička, menu a SVG ikony;
  - `_pata.html` – partneři, patička a dialogy;
  - tělo každé stránky zvlášť.
- **Sestavení:** `node nastroje/sestav-web.js`. Vytvoří 10 stránek `*.html` v kořeni a `sitemap.xml`. K tomu:
  - vloží hlavičku stránky (fotka, H1, perex, drobečková navigace, AI poznámka, video);
  - doplní `?v=` k CSS a JS;
  - vloží videogalerii `{{videoGrid}}`.
- **CSS:** jeden soubor `assets/css/web.css` (107 kB, ručně psané CSS s proměnnými v `:root`).
- **JS:** jeden soubor `assets/js/web.js` (104 kB, vanilla JS).
- **Písma:** Baloo 2 (nadpisy) a Manrope (text). Jsou uložená lokálně v `assets/fonts/`.
- **Ikony:** vlastní SVG sprite v `_lista.html`, 45 obrysových ikon a 2 vlajky.
- **Obsah:** `data/obsah.json`, spravuje ho `admin.php` (PHP 7.4+, GD). Obsahuje:
  - slider (5);
  - aktuality (8);
  - ceny;
  - trenéry (1);
  - turnaje;
  - galerii (31);
  - partnery (4).
- **Formuláře:** `kontakt.php` (kontaktní formulář a newsletter, odesílá e-mailem).
- **Server:** `.htaccess`:
  - přesměrování na www a https;
  - 301 ze starých adres (`/onas/` → `onas.html` …);
  - `?lang=de`;
  - starý PDF ceník;
  - zákaz `sablony/` a `nastroje/`;
  - cache.
- **Ostatní:** `robots.txt` (zakazuje `kontakt.php` a `admin.php`), `sitemap.xml`, `pro-stary-web/novy-web.js` (odkaz ze starého webu na nový).

## 2. Stránky

| Soubor | H1 (hlavička stránky) | Hlavní obsah |
|---|---|---|
| `index.html` | Golf v srdci / Krušných hor. | Úvod (viz níže) |
| `onas.html` | O nás | Text o klubu, otevírací doba, koláž fotek s kruhovým odznakem „od roku 1998“, historie (časová osa 1998–2026, 6 bodů), Krušnohorský dvůr (fotka, 6 vybavení, odkaz na web dvora) |
| `aktuality.html` | Aktuality | Všechny aktuality z `obsah.json` (karty, tlačítko „Zobrazit starší“), odkaz na Facebook |
| `cenik.html` | Ceník | Přepínač termínu platby (do / po 31. 3.), 3 členské ceny (dospělý, junior, senior), vstupní poplatek, buggy, parkování, číslo účtu s kopírováním, IBAN a BIC, QR platba, green fee 9 a 18 jamek se slevou 30 % a poznámkou o klubech, odkaz na PDF ceník (CZ i DE) |
| `hriste.html` | Hřiště | Fakta o hřišti (18 jamek, PAR 72, délky, CR/SR, 865 m), rezervace a telefon, interaktivní plánek s 9 klikacími jamkami, výběr jamky, tabulka vzdáleností s přepínačem 1–9 / 10–18, souhrn ČGF 2025, odkaz do registru ČGF, pás „Odpaliště č. 1 na vás čeká“ s parallaxem |
| `treninky.html` | Tréninky | Golfový kurz 6 990 Kč, seznámení s golfem od 1 490 Kč (3 ceny), lekce od 500 Kč (3 ceny), e-mailové a telefonní CTA, karta trenéra Ing. Kamil Myšík (telefon, e-mail, štítky) |
| `turnaje.html` | Turnaje | Filtr Vše / Nadcházející / Proběhlé, seznam turnajů z `obsah.json`, poznámka „Ukázková data“ |
| `fotogalerie.html` | Fotogalerie | Filtry podle kategorie (6) a tlačítko „360° prohlídka“ (zatím jen upozornění), masonry galerie (31 fotek), lightbox, na mobilu „Zobrazit všechny fotky“ |
| `pujcovna-bezek.html` | Půjčovna běžek | Úvod, telefon a e-mail, 2 fotky, ceník na 1 den (6 položek), poznámka o vícedenní ceně, padající sníh (canvas), zasněžený hřeben a závěj |
| `kontakty.html` | Kontakty | Adresa, telefon, e-mail, otevírací doba, mapa Google po kliknutí (souhlas) a „Navigovat“, kontaktní formulář (jméno, e-mail, zpráva, souhlas, ochrana proti botům, stav „Děkujeme“), newsletter |

### Úvodní stránka – sekce v pořadí

1. **Hero**:
   - slider 5 fotek s popisky a tečkami;
   - video playlist (dron → green) s tlačítkem pauza/přehrát;
   - AI poznámka;
   - nadtitulek „Golf Club Teplice · Cínovec“;
   - H1 a podnadpis;
   - CTA „Rezervovat tee time“ a „Ceník a green fee“;
   - stav sezóny;
   - odkaz „Objevte“.
2. **Rozcestník**: 8 odkazů se šipkami a odkazy „O nás a Krušnohorský dvůr“ a „Kontakty a mapa“.
3. **Příběh**: 3 fotky přes celou obrazovku, které se při scrollu překrývají (AI fotka s poznámkou, letecký snímek, Krušnohorský dvůr).
4. **Pro koho**:
   - tmavá sekce s nadpisem „Jedno hřiště. Pro každého.“;
   - 3 skupiny (Členové, Hosté, Začátečníci) s odkazy;
   - 4 čísla (18 jamek, PAR 72, 865 m, od 1998) s animací počítání.
5. **Aktuality**: 3 nejnovější a tlačítko „Všechny aktuality“.
6. **Videa**: „Méně slov. Víc Cínovce.“, 2 videa a přehrávač v dialogu.
7. **Závěr**: „Kdy si zahrajete?“, CTA rezervace a telefon, otevírací doba s živým stavem sezóny.

## 3. Společné prvky na všech stránkách

- Odkaz „Přeskočit na obsah“.
- **Hlavička:**
  - horní lišta s telefonem, e-mailem, rezervací, Facebookem a mapou;
  - logo;
  - menu 9 položek;
  - přepínač CZ/DE s vlajkami;
  - tlačítko „Rezervovat on-line“;
  - tlačítko „Menu“ (burger).
- **Celoobrazovkové menu:** 9 číslovaných odkazů, rezervace, telefon, e-mail, Facebook, mapa.
- **Ukazatele průběhu scrollu:** míček s jamkou na desktopu (klik vrátí nahoru), linka s míčkem na mobilu.
- **Hlavička podstránky** (generuje ji `sestav-web.js`): fotka, drobečková navigace, H1, perex, AI poznámka, případně video s pauzou.
- **Partneři:** běžící pás log (4) z `obsah.json`.
- **Patička:**
  - logo, popis a právní údaje (IČO, spisová značka);
  - sociální sítě;
  - 2 sloupce odkazů a kontakt;
  - velký nápis „Golf Club Teplice“;
  - © s aktuálním rokem;
  - „Ochrana osobních údajů“ (dialog CZ/DE);
  - přepínač jazyka;
  - „Nahoru“.
- **Mobilní lišta** po odscrollování: tlačítka „Zavolat“ a „Rezervovat tee time“.
- **Dialogy:**
  - detail aktuality (fotka, galerie náhledů, štítek, datum, text, CTA);
  - detail jamky (plánek, HCP, délky, poznámka, popis, tipy Scratch/Bogey, předchozí/další, tečky, rezervace);
  - lightbox galerie;
  - ochrana osobních údajů.
- **Upozornění „Chcete starý web?“** se zavíráním (pamatuje si to 7 dní).
- **Toasty** (např. „Zkopírováno“).

## 4. Funkce v JS (`assets/js/web.js`)

- **Překlad CZ/DE:**
  - slovník `t()`, atributy `data-de` a `?lang=de`;
  - zapamatování volby;
  - překlad titulku, meta popisu a kruhového odznaku;
  - české a německé verze textů z `obsah.json`.
- **Slider v hero:** 6,5 s, tečky, popisky. Video ho zastaví.
- **Videa v pozadí:**
  - playlist s prolnutím;
  - pauza a přehrání;
  - nenačítají se při „omezit pohyb“, úspoře dat nebo pomalém (2g) připojení.
- **Přehrávač videí** (dialog).
- **Rozdělení textu nadpisu** na slova pro animaci.
- **Animace:** odkrývání prvků při scrollu (`.reveal`), počítání čísel, parallax, časová osa s plněním.
- **Stav sezóny** podle data (odznak v hero a v otevírací době).
- **Aktuality:** vykreslení, limit 3 na úvodu, „Zobrazit starší“, detail v dialogu s galerií.
- **Ceník:**
  - přepínač termínu s pohyblivou pilulkou;
  - ceny před a po termínu;
  - automatický výběr podle dnešního data.
- **Bankovní účet:** kopírování do schránky, německá verze (IBAN).
- **Hřiště:**
  - body jamek v plánku podle `HOLES[].x/.y`;
  - výběr jamky;
  - tabulka vzdáleností s přepínačem devítek;
  - detail jamky s CZ/DE texty.
- **Turnaje:** vykreslení a filtr.
- **Galerie:** filtry, limit na mobilu, lightbox (šipky, klávesy, swipe), náhled galerie.
- **Sníh** na stránce běžek (canvas, respektuje „omezit pohyb“).
- **Formuláře:** validace, ochrana proti botům, odeslání na `kontakt.php`, stav úspěchu, reset, newsletter.
- **Mapa Google** až po souhlasu.
- **Partneři:** nekonečný pás.
- **Upozornění na starý web.**
- **Mobilní menu:** otevření a zavření, Esc, pamatuje si, kde jste byli, aktivní odkaz.
- **Kotvy `#cenik`** se mění na `cenik.html` (odkazy v patičce).

## 5. SEO a technické

- **Na každé stránce:** vlastní `<title>` a `description`, canonical, Open Graph (titulek, popis, obrázek, URL), `hreflang` cs/de/x-default.
- **Strukturovaná data** JSON-LD `GolfCourse`: adresa, GPS, telefon, e-mail, Facebook, spolek s IČO.
- `theme-color`, favicon, `sitemap.xml`, `robots.txt`.
- **Přístupnost:**
  - jedno H1 na stránku;
  - `aria-label` u ikon;
  - skip-link;
  - `prefers-reduced-motion`;
  - `alt` texty u obsahových fotek;
  - focus stavy.
- **Výkon:**
  - náhledy 800 px v `assets/img/thumbs/`;
  - `loading="lazy"`;
  - preload písem;
  - videa jen na rychlém připojení.
- **Analytika ani cookies nejsou** (je to tak i v zásadách).

## 6. Kontakty a fakta (nesmí se změnit)

- Golf Club Teplice z.s., Cínovec 275, 417 32 Dubí. IČO 26643120, spisová značka L 4878 u KS v Ústí nad Labem.
- Telefony a e-maily:
  - +420 777 943 219, golf@golf-teplice.cz;
  - trenér +420 777 820 971, mysik@golf-teplice.cz;
  - běžky +420 770 666 449.
- Účet 6918554389/0800, IBAN CZ18 0800 0000 0069 1855 4389, BIC GIBACZPX.
- Rezervace https://rezervace.golf-teplice.cz/rezervace, Facebook, Google Maps, registr ČGF.
- Všechny ceny (ceník, tréninky, běžky), délky jamek, CR/SR, otevírací doba a historie podle šablon a `obsah.json`.
