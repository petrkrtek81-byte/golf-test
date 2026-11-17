# Design systém – návrh (ke schválení)

## Směr

**Prémiový, klidný, přírodní horský golf.** Web má působit jako práce studia: velké fotky, sebevědomá typografie střední síly, hodně prázdného místa, tenké linky místo karet a jen jeden akcent.

Vzor je raphaelfaschang.at, který sis vybral. Co dělá jeho design dobrým (změřeno v prohlížeči):

- **Nadpisy:** Manrope v řezu **500** (ne tučně), velké (48–54 px) a se silně záporným prostrkáním (−5,5 %), takže působí kompaktně a drahé.
- **Akcent:** druhý řádek nadpisu je **skutečná patková kurzíva** (Georgia italic 400) ve světlé barvě, např. „Aus einem Wow. / *Wird ein Ich will.*“. Je to jediný ozdobný prvek.
- **Text a popisky:** DM Sans 16 px, řádkování 1,65. Popisky velkými písmeny 14 px / 600 s prostrkáním +0,12 em.
- **Barvy:** pozadí #F4F5F0 (lomená bílá do zelena), text #13231C (zeleno-černá), tmavé sekce #13231C a #25392D, jediný akcent světle limetkový.
- **Ovládání:** jediné „pilulkové“ tlačítko je tenké „Menü“. Jazyk je jen text „DE / EN“, žádné vlajky.
- **Plochy:** žádné karty se stínem. Obsah dělí fotky přes celou šířku, tmavé a světlé pásy a prázdné místo.

Logo klubu zůstává jako obrázek, takže písmo nadpisů nemusí kopírovat jeho zaoblený styl.

---

## 1. Typografie

**Písma (2 rodiny, obě uložené přímo na webu, `font-display: swap`):**
1. **Manrope** (už na webu je) – nadpisy v řezu 500, text 400, popisky a tlačítka 600.
2. **Instrument Serif Italic** (Google Fonts, má češtinu) – jen na akcentní slova v nadpisech (`<em>`). Nahrazuje dnešní dopočítanou kurzívu.

Baloo 2 se přestane používat. Řezy 700 a 800 se nepoužívají vůbec.

**Škála (px):** 12 · 14 · 16 · 18 · 22 · 28 · 36 · 48 · 64 · 88

| Token | Použití | Velikost | Řez | Řádkování | Prostrkání |
|---|---|---|---|---|---|
| `--fs-display` | H1 na úvodu | clamp(48 → 88) | 500 | 1.0 | −0.045em |
| `--fs-h1` | H1 podstránek | clamp(44 → 64) | 500 | 1.04 | −0.04em |
| `--fs-h2` | nadpisy sekcí | clamp(32 → 48) | 500 | 1.08 | −0.035em |
| `--fs-h3` | podnadpisy, položky | clamp(22 → 28) | 500 | 1.15 | −0.02em |
| `--fs-lead` | perex | clamp(18 → 22) | 400 | 1.45 | −0.005em |
| `--fs-body` | text | 16 (mobil) / 18 (desktop) | 400 | 1.6 | 0 |
| `--fs-small` | doplňky, poznámky | 14 | 400 | 1.5 | 0 |
| `--fs-label` | popisky velkými písmeny | 12 | 600 | 1.3 | +0.14em |
| čísla (ceny, statistiky) | | podle místa (28–88) | 500 | 1 | −0.03em, `tabular-nums` |

**Pravidla:**
- Akcent kurzívou má nejvýš jeden nadpis na obrazovce (hero, závěr, případně jedna sekce). Ne každý H2.
- Popisek velkými písmeny se dává jen tam, kde nese informaci (kategorie, datum). Ne nad každý nadpis.
- Šířka textu je max. 65 znaků (`--measure: 38rem`).

## 2. Barvy (design tokeny)

| Token | HEX | Použití |
|---|---|---|
| `--c-bg` | #F4F2EB | pozadí stránky (teplá lomená bílá) |
| `--c-sand` | #EAE5D9 | střídavé světlé pásy |
| `--c-ink` | #13241A | text a nadpisy (kontrast 14,5:1) |
| `--c-muted` | #4E5A50 | vedlejší text (6,5:1) |
| `--c-line` | rgba(19,36,26,.14) | linky a oddělovače |
| `--c-forest` | #0F2E1F | primární brandová barva, tmavé sekce, patička |
| `--c-forest-2` | #1B3D2B | jemný rozdíl v tmavých sekcích (hover, linky) |
| `--c-on-dark` | #F4F2EB | text na tmavé (13,1:1) |
| `--c-muted-dark` | #A9B3A6 | vedlejší text na tmavé (6,8:1) |
| `--c-gold` | #C9A961 | **jediný akcent**: hlavní tlačítko (text #13241A, 7,2:1), kurzívní akcent a detaily na tmavé (6,5:1) |
| `--c-link` | #2F6B3A | textové odkazy na světlé (5,7:1) |
| `--c-danger` | #9C3B31 | jen chyby formuláře a „uzavřeno“ (6,1:1) |

- **Zlatá:** na světlém pozadí se nikdy nepoužije jako barva textu (má jen 2:1).
- **Zimní paleta:** noční a ledová modrá končí. Stránka běžek použije tmavou lesní zelenou se sněhem, padající sníh zůstává.
- **Nic mimo tokeny:** žádné jiné barvy v CSS mimo tyto tokeny (výjimka: fotky a překryvy fotek přes `rgba(--c-forest)`).

## 3. Mezery a rytmus

- **Základ 8 px:** `--s-1` 4 · `--s-2` 8 · `--s-3` 12 · `--s-4` 16 · `--s-5` 24 · `--s-6` 32 · `--s-7` 48 · `--s-8` 64 · `--s-9` 96 · `--s-10` 128 · `--s-11` 160.
- **Sekce:** hlavní 128–160 px na desktopu, doplňkové 96 px, na mobilu 64–80 px. Střídá se velká a menší mezera, aby měl web rytmus.
- **Okraje:** postranní okraj 24 px na mobilu a 48 px na desktopu.

## 4. Mřížka a šířky

- **Šířky:** obsah max. 1240 px, galerie a fotky „wide“ max. 1440 px, fotopanely přes celou šířku.
- **Mřížka:** 12 sloupců s mezerou 24 px (desktop), 4 sloupce (mobil).
- **Asymetrie místo 3 stejných sloupců:** nadpis vlevo (5 sloupců) a obsah vpravo (7 sloupců), velká fotka s textem, střídání stran a číslované seznamy.

## 5. Komponenty

**Tlačítka** (výška 48 px, na mobilu min. 48 px):
- **primární:** zlatá výplň a tmavý text. Jedno na obrazovce (rezervace).
- **sekundární:** obrys 1 px (ink na světlé, papír na tmavé).
- **textový odkaz se šipkou:** podtržení s odsazením, šipka se při najetí posune o 4 px.
- **stavy:**
  - hover: ztmavení o jeden stupeň, 200 ms;
  - focus-visible: obrys 2 px `--c-gold` s odsazením 3 px;
  - active: posun o 1 px;
  - disabled: průhlednost 0,4 a bez kurzoru.

**Navigace:**
- logo vlevo; vpravo text „CZ / DE“, malé primární tlačítko „Rezervovat“ a obrysové „Menu“;
- po odscrollování plné pozadí `--c-bg` s linkou dole, bez rozmazávání;
- celoobrazovkové menu s velkými odkazy Manrope 500 (48–64 px) a malým číslem.

**Seznamy místo karet:**
- **ceny** jako řádky tabulky s linkami: název vlevo, cena vpravo, poznámka pod tím;
- **tréninky** jako tři sloupce oddělené svislou linkou, kurz zvýrazněný jen pozicí a velikostí;
- **kontakty** jako seznam „popisek → údaj“ bez dlaždic;
- **aktuality:** první velká (fotka + text), další v seznamu.

**Patička:** tmavá lesní zelená, sloupce oddělené linkami. Všechny údaje i odkazy zůstávají.

**Formuláře:**
- popisek vždy nad polem, ne uvnitř;
- pole 48 px, rámeček 1 px a zaoblení `--radius`;
- při chybě červený rámeček a text chyby pod polem;
- focus jako u tlačítek.

**Obrázky:**
- poměry stran 3:2 (na šířku), 4:5 (na výšku), 16:9 (pás);
- `object-fit: cover`, líné načítání, alt texty.

**Ikony:** zůstává jedna vlastní obrysová sada, tah 1,5, velikost 18–20 px, jen vedle textu. Žádné ikony v rámečcích, žádné vlajky.

## 6. Zaoblení a stíny

- `--radius: 4px` pro všechny plochy (fotky, pole, dialogy).
- `--radius-pill` jen pro tlačítka a „Menu“.
- Stíny nejsou, kromě dialogů (`--shadow-dialog: 0 24px 64px -24px rgba(15,46,31,.35)`).
- Žádné záře, sklo, lesky ani svítící stíny.

## 7. Pohyb

- Přechody 150–250 ms, `cubic-bezier(.2,.7,.2,1)`.
- Prvky se při scrollu jen jednou jemně objeví (průhlednost a posun 12 px, 500 ms).
- Žádné poskakování ani pulzování.
- `prefers-reduced-motion` vypne všechno kromě nutných změn stavu.

## 8. Zakázané po celou dobu

- emoji;
- fialovo-modré gradienty, záře, glassmorphism;
- karty se stínem jako výchozí obal obsahu;
- 3 stejné karty vedle sebe;
- vymyšlená čísla a lorem ipsum;
- barvy mimo tokeny;
- řezy 700 a 800.

---

## Ke schválení

1. **Písmo:**
   - **A) Manrope 500 + Instrument Serif Italic** (doporučuju, přesně v duchu vzoru);
   - **B) Manrope 500 + Fraunces Italic** (měkčí, „klubovější“ patková kurzíva).
2. **Efekty, které bych zjemnil nebo odebral.** Nic z toho bez tvého souhlasu nezmizí. Ke každému napiš, jestli zůstává:
   - golfový míček jako ukazatel scrollu (funkci „zpět nahoru“ by převzal odkaz „Nahoru“ v patičce);
   - otáčející se kruhový text „od roku 1998“ na stránce O nás;
   - obří průsvitný nápis v patičce;
   - čísla, která se načítají (zůstala by čísla bez animace);
   - nadpis rozpadající se na slova (zůstalo by jen jemné objevení);
   - zasněžený hřeben a závěj na stránce běžek (padající sníh zůstane).
3. **Vlajky u přepínače jazyka** nahradím textem „CZ / DE“.
