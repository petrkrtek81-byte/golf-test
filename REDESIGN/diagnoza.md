# Diagnóza „AI slop“ (17. 11. 2026)

Podklady:
- screenshoty celých stránek ve `REDESIGN/screenshots-pred/` (`desktop-*.jpg` 1440 px, `mobil-*.jpg` 390 px);
- kód `assets/css/web.css`, `sablony/*.html` a `nastroje/sestav-web.js`.

Co je už teď v pořádku a zůstane:
- **Fotky a vlastní paleta:** skutečné fotky hřiště, vlastní paleta lesní zelená / krémová / zlatá.
- **Ikony:** jedna sada obrysových ikon (vlastní SVG sprite).
- **Bez typických AI prvků:** nikde nejsou emoji ani fialovo-modré gradienty.
- **Vydařené sekce:** rozcestník se šipkami, fotopanely přes celou obrazovku a tmavá sekce „Pro koho“. Ty už odpovídají vzoru.

Problémy jsou seřazené od nejhoršího.

---

## 1. Skoro všechno je v kartách, často karta v kartě

To je největší rozdíl proti vzoru (raphaelfaschang.at), kde obsah stojí volně na ploše a dělí ho jen linky a prázdné místo.

- **Ceník** (`sablony/cenik.html`, CSS ř. 495–540):
  - 3 karty s cenami se září v rohu (`.price-card::before`, radial-gradient ř. 496);
  - 4 dlaždice „extra“ s ikonou v rámečku (`.extra` ř. 508);
  - karta „Green fee“ a v ní další 2 karty (`.greenfee` ř. 525 → `.gf` ř. 530).
- **Tréninky** (`sablony/treninky.html`, CSS ř. 624–660):
  - 3 karty s ikonou v rámečku a stuhou „Cesta na hřiště“ (`.train-card__ribbon` ř. 646);
  - uvnitř karet další orámované tabulky cen;
  - karta trenéra s kruhem iniciál a září (`.coach__photo` ř. 650).
- **Kontakty** (`sablony/kontakty.html`, CSS ř. 759–800): každý kontakt je karta s ikonou v tmavé dlaždici (`.contact-item__icon` ř. 761). Mapa, formulář a newsletter jsou další 3 karty.
- **Hřiště:** plánek i tabulka jsou ve velkých kartách (`.map-card` ř. 551, `.dist-card` ř. 578).
- **Další karty:**
  - aktuality: `.news-card` ř. 460;
  - časová osa: `.tl-item__card` ř. 425;
  - otevírací doba: `.hours` ř. 390;
  - běžky: 6 dlaždic `.ski` ř. 742 s ikonou v rámečku;
  - partneři: každé logo v kartě, ř. 807.
- **V číslech:** 46× `box-shadow`, 114× `border-radius` v 17 různých hodnotách (2, 6, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32 px, 50 %, 999px…).

## 2. Typografie bez systému a příliš tučná

- **Nadpisové písmo:** Baloo 2 (zaoblené, „aplikačně hravé“) v řezu 700–800 působí jako šablona mobilní aplikace, ne jako klub. Vzor používá Manrope v řezu **500** s výrazně záporným prostrkáním (−5,5 %).
- **Falešná kurzíva:** zlatá kurzíva v nadpisech („Krušných hor.“) je dopočítaná prohlížečem (`font-synthesis:style`), protože Baloo 2 kurzívu nemá. Proto vypadá křivě. Vzor má na akcent skutečnou patkovou kurzívu.
- **Velikosti písma:** v CSS je **87 různých velikostí** (`.7rem`, `.72rem`, `.74rem`, `.78rem`, `.8rem`, `.82rem`…), bez škály.
- **Řezy:** `font-weight` 700 a 800 je použit 84×. Skoro všechno je tučné, takže nic nevyčnívá.
- **Stejné nadpisy všude:** každý H2 na webu má tvar „Text *barevný konec*“ („Co je nového *na hřišti*“, „Členství *v klubu*“, „Těšíme se *na vás*“…). Jednou je to podpis, desetkrát šablona.
- **Nadtitulky:** malý nadtitulek velkými písmeny s linkou (`.eyebrow` ř. 90) je skoro nad každým nadpisem.

## 3. Pilulky a štítky všude

`border-radius:999px` je použit 20× a k tomu chipy a štítky:
- tlačítka;
- přepínač jazyka s vlajkami (`.lang` ř. 188);
- tlačítko „Menu“;
- štítky aktualit („SLUŽBY“, „REZERVACE“, `.tag` ř. 148) a štítky trenéra;
- filtry galerie a turnajů (`.chip` ř. 141);
- stav „Sezóna právě probíhá“;
- přepínač termínu v ceníku s pohyblivou pilulkou;
- datum na kartě aktuality.

Vlajky u jazyků jsou navíc laciný prvek (vzor má jen text „DE / EN“).

## 4. Záře, sklo a lesk bez důvodu

- **Rozmazané pozadí (sklo):** `backdrop-filter: blur` 27× (tlačítka, hlavička, běžky, mobilní lišta…).
- **Záře:** v rozích (ceník ř. 496, trenér ř. 650, čísla ř. 369).
- **Lesk** přejíždějící po tlačítkách a fotkách (ř. 117, ř. 703).
- **Svítící stín** pod zlatými tlačítky.

## 5. Mřížky tří stejných karet

- ceník: Dospělý, Junior, Senior;
- tréninky: Kurz, Seznámení, Lekce;
- aktuality na úvodu: 3 karty;
- „Pro koho“: 3 sloupce (bez karet, tady to nevadí).

Klasický „features grid“: ikona, nadpis, odstavec, tlačítko. Na mobilu se karty ceníku navíc posouvají do strany a jsou useknuté.

## 6. Ikony v rámečcích a odškrtávací seznamy

Ikona v zaobleném čtverci je typický AI vzor (`.extra__icon`, `.ski__icon`, `.train-card__icon`, `.contact-item__icon`). K tomu seznamy se zelenými fajfkami v trénincích.

## 7. Moc barev a jejich náhodné použití

- **Akcenty:** zlatá, trávová zelená, lesní zelená, červená (zavřeno), zelená tečka, k tomu celá zimní paleta (noční modrá, ledová modrá). V CSS je 32 různých HEX barev.
- **Barvy nadpisů:** akcent v nadpisech je jednou zelený (světlé pozadí), jindy zlatý (tmavé pozadí).
- **Kontrast:** zlatá na krémové (např. nadtitulky) má kontrast jen asi 2:1, což nesplňuje WCAG AA.

## 8. Efekty, které se snaží moc

- golfový míček jako ukazatel scrollu;
- otáčející se kruhový text „od roku 1998“;
- čísla, která se načítají;
- nadpis rozpadlý na slova s animací;
- obří průsvitný nápis „Golf Club Teplice“ v patičce;
- pulzující tečky;
- „Objevte“ se svislou linkou;
- zasněžený hřeben a závěj na běžkách.

Každý zvlášť je milý, dohromady působí jako „ukázka všech triků“. **Nic z toho nemažu bez souhlasu**, návrh je ve `design-system.md`.

## 9. Žádný rytmus mezi sekcemi

- **Stejné sekce:** všechny mají stejné odsazení (`.section` ř. 79: `clamp(4.5rem, 9vw, 8.5rem)`) a stejnou stavbu (nadtitulek → H2 s barevným koncem → perex → mřížka karet).
- **Dva nadpisy pod sebou:** podstránky mají H1 v hlavičce a hned pod ním další velký H2, který jen opakuje ji („Kontakty“ → „Těšíme se na vás“, „Tréninky“ → „Naučte se golf s trenérem“).

## 10. Hlavička a překryvy

- **Hlavička:** logo ve štítku, vlajky v pilulce, zlatá pilulka „Rezervovat“ a pilulka „Menu“, tedy čtyři různé tvary vedle sebe.
- **Okénko „Chcete starý web?“:** na desktopu překrývá spodní část hero, na mobilu tlačítko „Rezervovat tee time“.

## 11. Mobil (390 px)

- karty ceníku a green fee jsou useknuté a posouvají se do strany (nápověda „Posuňte do strany“);
- partneři jsou pod sebou ve velkých kartách, stránka je zbytečně dlouhá;
- mobilní lišta s rezervací a okénko starého webu zakrývají obsah;
- ikony v dlaždicích zabírají šířku textu u kontaktů.

## 12. Fráze, které nic neříkají

Patří sem:
- „Méně slov. Víc Cínovce.“;
- „Jedno hřiště. Pro každého.“;
- vymyšlené citáty („Tady jsem doma.“, „Tohle si zahrajeme.“, „Chci to zkusit.“);
- „Těšíme se na vás“, „Objevte“, „Cínovec objektivem“, „Co je nového na hřišti“.

Úpravy textů navrhnu až ve fázi 6 a jen se souhlasem. Fakta se nemění.
