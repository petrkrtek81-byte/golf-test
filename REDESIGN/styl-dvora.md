# Vzhled podle webu Krušnohorského dvora (18. 11. 2026)

Na přání („udělej to jak je ten web na Krušnohor“) má golf stejný vzhled jako dokončený redesign webu dvora. Ten je na https://petrkrtek81-byte.github.io/dvur-test/, repozitář `krusnohorsky-dvur-redesign`, větev `main`.

**Záloha před změnou:**
- tag `zaloha-2026-11-18-pred-stylem-dvora`;
- větev `zaloha-pred-stylem-dvora` (stav po fázi 4).

Starší zálohy:
- tag `pred-redesignem-2026-11-17`;
- složka `golf-teplice-redesign-zaloha-2026-11-17`.

## Co se převzalo

- **CSS:** sekce 1–27 jsou převzaté z webu dvora. Obsahují tokeny, typografii, tlačítka, hlavičku, menu, úvodní fotky, aktuality, ceník, fotogalerii, zimu, kontakty, patičku a dialogy.
- **Barvy a tvary:**
  - teplá lomená bílá, tmavě smrková;
  - jediný akcent je bronz (místo dřívější zlaté);
  - zaoblení všude 4 px, i u tlačítek;
  - žádné stíny kromě dialogů, žádné sklo ani záře.
- **Písmo:** Manrope 500 na nadpisy. Kurzíva Instrument Serif je nejvýš v jednom nadpisu na stránce.
- **Hlavička:**
  - bez horní lišty a vlajek, jazyk je text „CZ / DE“;
  - „Rezervovat“ a „Menu“ jsou stejně velké;
  - po scrollu je hlavička světlá s linkou.
- **Odebrané efekty:**
  - golfový míček (ukazatel scrollu);
  - otáčející se kruhový odznak „od roku 1998“ (teď prostý údaj u fotek);
  - podnadpis skládaný po slovech;
  - načítající se čísla, ani v ceníku;
  - pulzující tečka;
  - obří nápis v patičce;
  - kreslená časová osa;
  - zasněžený hřeben a závěj;
  - nekonečný pás partnerů (loga jsou v řadě);
  - parallax malých fotek.
- **Zůstalo:**
  - videa (úvod a podstránky) s tlačítkem pauzy a poznámkou o AI;
  - slider;
  - fotopanely;
  - padající sníh;
  - linka průběhu scrollu;
  - parallax pásu na stránce Hřiště.
- **Karty → řádky s linkami:**
  - Pro koho;
  - aktuality;
  - členství (tři sloupce s linkou);
  - doplňky;
  - green fee;
  - tréninky (řádek: název a cena · ceny a obsah · tlačítko);
  - trenér;
  - turnaje;
  - historie;
  - kontakty;
  - ceník běžek;
  - plánek a tabulka jamek;
  - detail jamky.
- **Formuláře:** popisek je nad polem a chyba červeně pod polem (česky i německy), stejně jako na dvoře.
- **Němčina:** stránka se ukáže až přeložená (`lang-pending`), stejně jako na dvoře.
- **Texty:**
  - vymyšlené citáty v sekci Pro koho jsou nahrazené nadpisy („Členství v klubu“, „Hra na green fee“, „Kurz a lekce s trenérem“);
  - nápověda „Posuňte do strany“ zmizela, protože ceny se už do strany neposouvají.

  Fakta (ceny, kontakty, otevírací doba) jsou beze změny.

## Kontrola

- `node REDESIGN/kontrola-obsahu.js`: všechny odkazy zůstaly. Chybějící texty jsou jen ty záměrné, uvedené výše.
- **Ověřeno v prohlížeči:**
  - video a pauza;
  - menu;
  - přepínač ceníku a kopírování účtu;
  - detail jamky (šipky, tečky);
  - přepínač devítek;
  - formuláře (chyby česky i německy, novinky);
  - němčina přes `?lang=de`;
  - konzole bez chyb.
- **Screenshoty** všech stránek (desktop 1440 px, mobil 390 px) jsou ve `screenshots-styl-dvora/`.
