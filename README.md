# Golf Club Teplice – nový web

Jednostránkový web (HTML + CSS + JS v `index.html`), bez databáze a bez sestavování.

## Struktura

| Soubor / složka | Co obsahuje |
|---|---|
| `index.html` | celý web: styly, obsah, skript (CZ i DE) |
| `assets/img/` | fotky v plném rozlišení (lightbox, hero, modaly) |
| `assets/img/thumbs/` | náhledy 800 px (galerie, karty aktualit) |
| `assets/hriste/`, `assets/partneri/` | plánky jamek 1–9, loga partnerů (DanCzek, XXL Auto, Vaněrka, VUM park) |
| `assets/fonts/` | písma Baloo 2 (nadpisy, čísla, popisky – zaoblené jako logo „urban“) a Manrope (text) – bez Google Fonts |
| `assets/cenik/` | PDF ceník – oficiální český a jeho německý překlad (`golf-teplice-preisliste-de.pdf`, otevírá se v němčině) |
| `assets/qr-platba.svg`, `assets/qr-platba-de.svg` | QR Platba pro české banky a GiroCode (IBAN) pro německé – při změně účtu je nutné je vygenerovat znovu |
| `kontakt.php` | odesílání kontaktního formuláře a přihlášek k novinkám e-mailem |
| `.htaccess` | HTTPS, přesměrování starých adres (`/onas`, `/cenik`…), cache |
| `robots.txt`, `sitemap.xml` | pro vyhledávače |

## Úpravy obsahu

Obsah, který se mění, je na začátku skriptu v `index.html` (sekce „A. DATA“):

- `NEWS` – aktuality (nejnovější první), fotky podle názvu souboru v `assets/img/`
- `HOLES` – jamky (délky, HCP, popisy, tipy)
- `TOURNAMENTS` + `TOURNAMENTS_PUBLISHED` – kalendář turnajů; dokud je `false`, web ukazuje „Kalendář turnajů připravujeme“
- `GALLERY`, `PARTNERS` – fotogalerie a partneři

Německé texty jsou v sekci „A2. NĚMECKÁ VERZE“ (`DE`, `NEWS_DE`, `HOLES_DE`, `TOURNAMENTS_DE`). Klíčem slovníku `DE` je český text – při změně české věty upravte i klíč.

Nová fotka: vložte ji do `assets/img/` a zmenšenou (šířka 800 px) do `assets/img/thumbs/` se stejným názvem (bez mezer a diakritiky).

## Nasazení

1. Zálohovat starý web.
2. Nahrát celý obsah složky na hosting (včetně `.htaccess`).
3. Ověřit, že hosting má PHP s funkcí `mail()`; v `kontakt.php` nastavit `MAIL_TO` a `MAIL_FROM` (adresa na doméně webu) a poslat si zkušební zprávu z formuláře.
4. Otestovat přesměrování: `/onas`, `/cenik`, `index.php?mutace=de`.
5. Ověřit, že `rezervace.golf-teplice.cz` funguje dál.
6. Přidat web do Google Search Console a odeslat `sitemap.xml`.

## Čeká na klub

- Potvrdit ceny, kde se web liší od PDF ceníku (duben 2026): vstupní poplatek 1 000 × 1 500 Kč, golfový kurz 6 990 × „Golfový kurz 54“ 7 500 Kč.
- Skutečný kalendář turnajů, foto trenéra, popis jamky 4, délky jamek po přeměření 2025.
- Souhlas s propagací Krušnohorského dvora; u partnera DanCzek (tabák) ověřit, že logo na webu sportovního klubu nevadí zákonu o regulaci reklamy.
- Fotky do úvodního slideru ve vysokém rozlišení (min. 2400 × 1350 px) a logo ve formátu SVG.
- Kontrola zásad ochrany osobních údajů (dialog v patičce) a německého překladu rodilým mluvčím.
- Rozhodnout, zda stačí upravovat aktuality v souboru, nebo je potřeba redakční systém.

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
