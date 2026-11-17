#!/usr/bin/env node
/* =====================================================================
   SESTAVENÍ STRÁNEK WEBU
   ---------------------------------------------------------------------
   Stránky (index.html, cenik.html, …) se skládají ze šablon ve složce sablony/:
     _hlava.html  – <head> (titulek, popis, odkazy na CSS/JS)
     _lista.html  – ikony, horní lišta s menu, mobilní menu
     <stranka>.html – obsah konkrétní stránky
     _pata.html   – partneři, patička, dialogy
   Po úpravě šablon spusťte:   node nastroje/sestav-web.js
   Hotové stránky se zapíší do kořene webu (ty se nahrávají na hosting).
   Odkazy #cenik, #hriste… mezi stránkami se samy převedou na cenik.html, hriste.html…
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'sablony');
const SITE = 'https://www.golf-teplice.cz/';

// stránky webu: page = id sekce i název souboru (stejné adresy jako na starém webu: /cenik, /hriste…)
const PAGES = [
  { page: 'uvod', file: 'index.html', og: '99690585.jpg',
    title: 'Golf Club Teplice – golf v srdci Krušných hor | Cínovec',
    description: 'Golf Club Teplice na Cínovci v Krušných horách: 18 jamek (9 × 2), PAR 72, on-line rezervace tee time, tréninky, turnaje a v zimě půjčovna běžek.' },
  { page: 'onas', file: 'onas.html', nav: 'O nás', img: '14_img-034-web.jpg', video: 'onas',
    title: 'O nás – historie hřiště a Krušnohorský dvůr | Golf Club Teplice',
    description: 'Golfové hřiště na Cínovci od roku 1998: otevírací doba, historie hřiště a klubovna, hotel a restaurace Krušnohorský dvůr.',
    lead: 'Golf na Cínovci od roku 1998 – hřiště, historie a Krušnohorský dvůr.' },
  { page: 'aktuality', file: 'aktuality.html', nav: 'Aktuality', img: 'IMG-20250331-WA0007-2.jpg',
    title: 'Aktuality | Golf Club Teplice',
    description: 'Novinky z golfového hřiště na Cínovci: otevření sezóny, rezervace, údržba hřiště a dění v klubu.',
    lead: 'Novinky z hřiště a klubu.' },
  { page: 'cenik', file: 'cenik.html', nav: 'Ceník', img: 'ai-par-na-greenu.jpg', ai: true, video: 'cenik',
    title: 'Ceník – členství a green fee | Golf Club Teplice',
    description: 'Ceník Golf Club Teplice: roční členství, green fee na 9 a 18 jamek, vstupní poplatek, buggy a platba QR kódem.',
    lead: 'Členství, green fee a další poplatky na sezónu.' },
  { page: 'hriste', file: 'hriste.html', nav: 'Hřiště', img: '901224_10151579493184174_1058721581_o.jpg', video: 'hriste',
    title: 'Hřiště – 18 jamek, PAR 72 | Golf Club Teplice',
    description: 'Golfové hřiště Cínovec: 9 jamek hraných dvakrát, PAR 72, 865 m n. m. Interaktivní plánek, délky jamek a tipy, jak je zahrát.',
    lead: '9 jamek hraných dvakrát, PAR 72, 865 m nad mořem.' },
  { page: 'treninky', file: 'treninky.html', nav: 'Tréninky', img: 'ai-patovani.jpg', ai: true, video: 'treninky',
    title: 'Tréninky a golfový kurz | Golf Club Teplice',
    description: 'Golfový kurz se zkouškou, individuální lekce a seznámení s golfem s trenérem na Cínovci. Vybavení zapůjčíme.',
    lead: 'Kurzy, zelená karta a lekce s trenérem.' },
  { page: 'turnaje', file: 'turnaje.html', nav: 'Turnaje', img: '13475130_838632482938527_8570459729176729686_o.jpg',
    title: 'Turnaje | Golf Club Teplice',
    description: 'Kalendář turnajů na golfovém hřišti Cínovec. Přihlášky probíhají přes systém České golfové federace.',
    lead: 'Klubové i otevřené turnaje na Cínovci.' },
  { page: 'fotogalerie', file: 'fotogalerie.html', nav: 'Fotogalerie', img: 'bez-nazvu-1.jpg',
    title: 'Fotogalerie | Golf Club Teplice',
    description: 'Fotografie golfového hřiště na Cínovci, okolí Krušných hor, turnajů a zimy na Cínovci.',
    lead: 'Hřiště, okolí a zima na Cínovci.' },
  { page: 'pujcovna-bezek', file: 'pujcovna-bezek.html', nav: 'Půjčovna běžek', img: 'dvur4.jpg', video: 'bezky',
    title: 'Půjčovna běžek na Cínovci | Golf Club Teplice',
    description: 'Půjčovna běžek na Cínovci: kompletní vybavení na klasiku i backcountry, ceník a objednávka.',
    lead: 'V zimě na běžky přímo z Cínovce.' },
  { page: 'kontakty', file: 'kontakty.html', nav: 'Kontakty', img: 'IMG-20250331-WA0009.jpg',
    title: 'Kontakty | Golf Club Teplice',
    description: 'Golf Club Teplice, Cínovec 275, 417 32 Dubí. Telefon, e-mail, mapa a kontaktní formulář.',
    lead: 'Cínovec 275, 417 32 Dubí – jak nás najít a kontaktovat.' },
];
const SECTION_PAGES = PAGES.filter(p => p.nav).map(p => p.page);

// videa na úvodní stránce (sekce „Méně slov. Víc Cínovce.“) – ukáže se jen to, co je v assets/video
const VIDEOS = [
  { file: 'uvod', title: 'Hřiště z dronu', sub: 'Cínovec v podvečerním světle' },
  { file: 'hriste', title: 'Green s výhledem', sub: 'Nízký průlet k vlajce' },
  // zimní video je jen na stránce Půjčovna běžek (na úvodní stránce golf)
];
const videoGrid = () => {
  const list = VIDEOS.filter(v => fs.existsSync(path.join(ROOT, 'assets/video', v.file + '.mp4')));
  if (!list.length) return '';
  return `<section class="section section--dark videos" id="videa" aria-labelledby="videosTitle">
  <div class="container">
    <div class="videos__head">
      <h2 class="videos__title reveal" id="videosTitle">Méně slov. <em>Víc Cínovce.</em></h2>
      <p class="lead reveal" style="--d:.1s">Hřiště a okolí v pohybu – záběry vytvořené s pomocí AI z našich fotografií.</p>
    </div>
    <div class="videos__grid">
${list.map((v, i) => `      <button class="video-card reveal" type="button" style="--d:${(i * 0.08).toFixed(2)}s" data-video="assets/video/${v.file}.mp4" data-title="${v.title}">
        <span class="video-card__media"><img src="assets/video/${v.file}-poster.jpg" alt="" loading="lazy"><span class="video-card__play"><svg class="i"><use href="#i-play"/></svg></span></span>
        <span class="video-card__title">${v.title}</span>
        <span class="video-card__sub">${v.sub}</span>
      </button>`).join('\n')}
    </div>
  </div>
</section>`;
};

const read = f => fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\r\n/g, '\n');
const hash = f => crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 8);
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const head = read('_hlava.html');
const bar = read('_lista.html');
const foot = read('_pata.html');
const versions = { cssVersion: hash('assets/css/web.css'), jsVersion: hash('assets/js/web.js') };

// video v pásu (assets/video/<název>.mp4 + <název>-poster.jpg) – jen když soubor existuje
const pageVideo = p => (p.video && fs.existsSync(path.join(ROOT, 'assets/video', p.video + '.mp4')))
  ? `
  <video class="page-hero__video hero-video" muted loop playsinline preload="none" aria-hidden="true"
         data-src="assets/video/${p.video}.mp4" poster="assets/video/${p.video}-poster.jpg"></video>
  <button class="video-toggle" type="button" aria-pressed="false" aria-label="Pozastavit video"><svg class="i"><use href="#i-pause"/></svg></button>`
  : '';

// poznámka o AI (fotky a videa vytvořené v Gemini) – drobný text pod popisem stránky
const hasVideo = p => !!(p.video && fs.existsSync(path.join(ROOT, 'assets/video', p.video + '.mp4')));
const aiNote = p => {
  const text = p.ai ? (hasVideo(p) ? 'Ilustrační foto a video vytvořené s pomocí AI' : 'Ilustrační foto vytvořené s pomocí AI')
    : hasVideo(p) ? 'Video vytvořené s pomocí AI z naší fotografie' : '';
  return text ? `\n    <p class="page-hero__note reveal" style="--d:.22s">${text}</p>` : '';
};

// úvodní pás podstránky: fotka (případně video), drobečková navigace, nadpis, krátký popis
const pageHero = p => `<!-- =====================================================================
     ${p.nav.toUpperCase()} – úvodní pás stránky
     ===================================================================== -->
<section class="page-hero" id="top" aria-labelledby="pageTitle">
  <div class="page-hero__bg" aria-hidden="true"><img src="assets/img/${p.img}" alt="" fetchpriority="high"></div>${pageVideo(p)}
  <div class="container page-hero__inner">
    <nav class="crumbs reveal" aria-label="Drobečková navigace"><a href="./">Úvod</a><span aria-hidden="true">/</span><span aria-current="page">${p.nav}</span></nav>
    <h1 class="page-hero__title reveal" id="pageTitle" style="--d:.08s">${p.nav}</h1>
    <p class="page-hero__lead reveal" style="--d:.16s">${p.lead}</p>${aiNote(p)}
  </div>
</section>

`;

let built = 0;
for (const p of PAGES) {
  const url = SITE + (p.file === 'index.html' ? '' : p.file);
  let html = fill(head, {
    page: p.page, title: escAttr(p.title), description: escAttr(p.description), url,
    ogImage: p.og || p.img, cssVersion: versions.cssVersion, headExtra: p.headExtra || '',
  });
  // menu: zvýraznit aktuální stránku
  html += bar.replace(/(<a class="nav__link)" (href="[^"]*" data-page="([^"]+)")/g, (m, a, rest, pg) =>
    pg === p.page ? `${a} is-active" ${rest} aria-current="page"` : m)
    .replace(/(<a )(href="[^"]*" data-page="([^"]+)")/g, (m, a, rest, pg) =>
      pg === p.page ? `${a}class="is-active" aria-current="page" ${rest}` : m);
  html += '\n' + (p.nav ? pageHero(p) : '') + read(p.file).replace('{{videoGrid}}', videoGrid) + '\n' + fill(foot, versions);

  // odkazy na sekce jiných stránek: #cenik → cenik.html
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  html = html.replace(/href="#([a-z0-9-]+)"/g, (m, id) =>
    (!ids.has(id) && SECTION_PAGES.includes(id)) ? `href="${id}.html"` : m);
  const broken = [...html.matchAll(/href="#([a-z0-9-]+)"/g)].map(m => m[1]).filter(id => !ids.has(id));
  if (broken.length) console.warn(`⚠ ${p.file}: odkazy na neexistující kotvy: ${[...new Set(broken)].join(', ')}`);

  html = '<!-- Vygenerováno skriptem nastroje/sestav-web.js ze šablon ve složce sablony/ – upravujte šablony, ne tento soubor. -->\n' + html;
  fs.writeFileSync(path.join(ROOT, p.file), html);
  built++;
}

// mapa webu pro vyhledávače
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${PAGES.map(p => {
  const url = SITE + (p.file === 'index.html' ? '' : p.file);
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="cs" href="${url}"/>
    <xhtml:link rel="alternate" hreflang="de" href="${url}?lang=de"/>
  </url>`;
}).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log(`Hotovo: ${built} stránek + sitemap.xml (css ${versions.cssVersion}, js ${versions.jsVersion})`);
