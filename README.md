# Golf Club Teplice – nový web

Jednostránkový web (HTML + CSS + JS v `index.html`), bez databáze a bez sestavování.
Obsah, který se často mění, je v souboru `data/obsah.json` a upravuje se v administraci `admin.php`.

## Struktura

| Soubor / složka | Co obsahuje |
|---|---|
| `index.html` | celý web: styly, pevné texty, skript (CZ i DE) |
| `data/obsah.json` | obsah z administrace: aktuality, slider, ceník, trenéři, turnaje, fotogalerie, partneři (CZ i DE) |
| `admin.php` | administrace obsahu (PHP), viz níže |
| `uploads/` | fotky, loga a PDF nahrané v administraci (vzniká na hostingu, do gitu nepatří) |
| `assets/img/` | fotky v plném rozlišení (lightbox, hero, modaly) |
| `assets/img/thumbs/` | náhledy 800 px (galerie, karty aktualit) |
| `assets/hriste/`, `assets/partneri/` | plánky jamek 1–9, loga partnerů (DanCzek, XXL Auto, Vaněrka, VUM park) |
| `assets/fonts/` | písma Baloo 2 (nadpisy, čísla, popisky – zaoblené jako logo „urban“) a Manrope (text) – bez Google Fonts |
| `assets/cenik/` | PDF ceník – oficiální český a jeho německý překlad (`golf-teplice-preisliste-de.pdf`, otevírá se v němčině) |
| `assets/qr-platba.svg`, `assets/qr-platba-de.svg` | QR Platba pro české banky a GiroCode (IBAN) pro německé – při změně účtu je nutné je vygenerovat znovu |
| `kontakt.php` | odesílání kontaktního formuláře a přihlášek k novinkám e-mailem |
| `.htaccess` | HTTPS, přesměrování starých adres (`/onas`, `/cenik`…), cache |
| `robots.txt`, `sitemap.xml` | pro vyhledávače |

## Administrace (`admin.php`)

Adresa: `https://www.golf-teplice.cz/admin.php` (stejná jako u starého webu). Funguje jen na hostingu s PHP – na GitHub Pages ne.

| Sekce | Co se v ní dělá |
|---|---|
| Aktuality | přidat / upravit / smazat; nadpis, krátký text, článek, štítek, hlavní fotka, další fotky, tlačítko s odkazem |
| Ceník | sezóna a termín zvýhodněné platby, členství (do / po termínu), vstupní poplatek, buggy, green fee, PDF ceník CZ a DE |
| Slider | fotky v úvodu webu, popisky, pořadí |
| Trenéři | víc trenérů, fotka (jinak iniciály), kontakty, zobrazit / skrýt na webu |
| Turnaje | zveřejnit / skrýt kalendář, přidat / upravit / smazat turnaj |
| Fotogalerie | nahrát víc fotek najednou, kategorie, popisky, pořadí |
| Partneři | logo, název, odkaz, pořadí |
| Zálohy | automatická záloha před každou změnou (posledních 40), obnovení jedním klikem, stažení |
| Heslo | změna hesla |

Každý text má českou a německou verzi; prázdná němčina = na německém webu se ukáže čeština.
Text článku: prázdný řádek = odstavec, `**tučně**`, řádky `- Popis: hodnota` = tabulka, odkazy a telefony `+420 …` se proklikají samy.

**První spuštění:** po nahrání na hosting hned otevřít `/admin.php` a nastavit jméno a heslo (aspoň 10 znaků).
Heslo se uloží jen jako hash do `data/admin-heslo.php`. Zapomenuté heslo: ten soubor na hostingu smazat a nastavit nové.

**Požadavky na hosting:** PHP 7.4 nebo novější s rozšířením GD (zmenšování fotek), právo zápisu do `data/` a do kořene webu (vytvoří `uploads/`).
Vyzkoušeno na PHP 7.4 i 8.3.

**Zabezpečení:** heslo jako hash, ochrana formulářů (CSRF), zámek po 5 špatných pokusech na 15 minut, odhlášení po 2 h nečinnosti,
nahrávají se jen fotky JPG/PNG/WebP (vždy se znovu uloží přes GD) a PDF; `data/.htaccess` a `uploads/.htaccess` brání v přístupu k heslu a ve spouštění skriptů.

**Pozor při nahrávání nové verze webu:** složky `data/` a `uploads/` na hostingu nepřepisovat – je v nich obsah z administrace.
Nahrává se jen `index.html`, `admin.php`, `assets/` atd. (Soubor `data/obsah.json` v gitu je jen výchozí obsah.)

## Úpravy pevných částí (v `index.html`)

- `HOLES` (na začátku skriptu, sekce „A. DATA“) – jamky (délky, HCP, popisy, tipy), německy v `HOLES_DE`
- texty sekcí O nás, Hřiště, Tréninky, Půjčovna běžek, Kontakty – přímo v HTML
- slovník `DE` (sekce „A2. NĚMECKÁ VERZE“) – překlady pevných textů; klíčem je český text, při změně české věty upravte i klíč

## Nasazení

1. Zálohovat starý web.
2. Nahrát celý obsah složky na hosting (včetně `.htaccess`, `data/.htaccess`, `uploads/.htaccess`).
3. Hned otevřít `/admin.php` a nastavit heslo administrace.
4. Ověřit, že hosting má PHP s funkcí `mail()`; v `kontakt.php` nastavit `MAIL_TO` a `MAIL_FROM` (adresa na doméně webu) a poslat si zkušební zprávu z formuláře.
5. Otestovat přesměrování: `/onas`, `/cenik`, `index.php?mutace=de`.
6. Ověřit, že `rezervace.golf-teplice.cz` funguje dál.
7. Přidat web do Google Search Console a odeslat `sitemap.xml`.

## Čeká na klub

- Potvrdit ceny, kde se web liší od PDF ceníku (duben 2026): vstupní poplatek 1 000 × 1 500 Kč, golfový kurz 6 990 × „Golfový kurz 54“ 7 500 Kč.
- Skutečný kalendář turnajů, foto trenéra, popis jamky 4, délky jamek po přeměření 2025.
- Souhlas s propagací Krušnohorského dvora; u partnera DanCzek (tabák) ověřit, že logo na webu sportovního klubu nevadí zákonu o regulaci reklamy.
- Fotky do úvodního slideru ve vysokém rozlišení (min. 2400 × 1350 px) a logo ve formátu SVG.
- Kontrola zásad ochrany osobních údajů (dialog v patičce) a německého překladu rodilým mluvčím.

## Okno „Vyzkoušejte nový web“ na starém webu

Soubor `pro-stary-web/novy-web.js` patří do STARÉHO webu (golf-teplice.cz) na přechodné období.
Správce starého webu vloží do společné šablony stránek těsně před `</body>` jeden řádek:

```html
<script src="https://petrkrtek81-byte.github.io/golf-test/pro-stary-web/novy-web.js" defer></script>
```

- Okno nabídne přechod na nový web (do odpovídající sekce, česky nebo německy podle starého webu).
- Křížkem / „Zůstat na starém webu“ se zavře a 3 dny se znovu neukáže.
- Adresa nového webu je v proměnné `NEW_SITE` na začátku souboru – po přesunu na vlastní doménu ji stačí změnit.
- Po definitivní výměně webu se řádek ze starého webu jednoduše odstraní.
