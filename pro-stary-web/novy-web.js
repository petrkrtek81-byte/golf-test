/* =======================================================================
   Golf Club Teplice – okno „Vyzkoušejte nový web“ pro STARÝ web
   -----------------------------------------------------------------------
   Vložení do starého webu (jeden řádek těsně před </body> ve společné
   šabloně stránek):

     <script src="https://petrkrtek81-byte.github.io/golf-test/pro-stary-web/novy-web.js" defer></script>

   Co dělá:
   - po chvilce ukáže okno s tlačítkem na nový web (česky / německy podle
     jazyka starého webu),
   - tlačítko vede rovnou na odpovídající sekci nového webu
     (/cenik → #cenik, německá verze → ?lang=de),
   - křížek / „Zůstat na starém webu“ okno zavře a další 3 dny se znovu
     neukáže (pamatuje si to prohlížeč),
   - styly jsou ve Shadow DOM, takže nekolidují se styly starého webu.
   ======================================================================= */
(function () {
  'use strict';

  // Adresa nového webu – po přesunu na vlastní doménu stačí změnit zde.
  var NEW_SITE = 'https://petrkrtek81-byte.github.io/golf-test/';
  var HIDE_DAYS = 3;          // po zavření se okno neukáže tolik dní
  var DELAY_MS = 1200;        // zpoždění zobrazení po načtení stránky
  var STORAGE_KEY = 'gct-novy-web-zavreno';

  // stránky starého webu → sekce nového webu
  var SECTIONS = {
    onas: 'onas', aktuality: 'aktuality', cenik: 'cenik', hriste: 'hriste',
    treninky: 'treninky', turnaje: 'turnaje', fotogalerie: 'fotogalerie',
    'pujcovna-bezek': 'pujcovna-bezek', kontakty: 'kontakty'
  };

  var TEXT = {
    cs: {
      badge: 'Nový web',
      title: 'Máme nové webové stránky!',
      text: 'Vyzkoušejte nový web Golf Clubu Teplice – přehlednější, s on-line rezervací, aktuálním ceníkem i interaktivním plánkem hřiště.',
      go: 'Vyzkoušet nový web',
      stay: 'Zůstat na starém webu',
      close: 'Zavřít a zůstat na starém webu'
    },
    de: {
      badge: 'Neue Website',
      title: 'Wir haben eine neue Website!',
      text: 'Entdecken Sie die neue Website des Golf Club Teplice – übersichtlicher, mit Online-Reservierung, aktueller Preisliste und interaktivem Platzplan.',
      go: 'Neue Website ansehen',
      stay: 'Auf der alten Website bleiben',
      close: 'Schließen und auf der alten Website bleiben'
    }
  };

  function dismissedRecently() {
    try {
      var t = Number(localStorage.getItem(STORAGE_KEY) || 0);
      return t && (Date.now() - t) < HIDE_DAYS * 864e5;
    } catch (e) { return false; }
  }
  function rememberDismiss() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) { /* bez úložiště */ }
  }

  // jazyk starého webu: ?mutace=de nebo německé menu (lang je na starém webu vždy „cs“)
  function isGerman() {
    if (/[?&]mutace=de\b/.test(location.search)) return true;
    var links = document.getElementsByTagName('a');
    for (var i = 0; i < links.length; i++) {
      var t = (links[i].textContent || '').trim();
      if (t === 'Über uns' || t === 'Kontakte') return true;
    }
    return false;
  }

  function targetUrl(de) {
    var slug = location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
    var hash = SECTIONS[slug] ? '#' + SECTIONS[slug] : '';
    return NEW_SITE + (de ? '?lang=de' : '') + hash;
  }

  function show() {
    if (document.getElementById('gct-novy-web')) return;
    var de = isGerman();
    var L = de ? TEXT.de : TEXT.cs;

    var host = document.createElement('div');
    host.id = 'gct-novy-web';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;';
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    root.innerHTML =
      '<style>' +
      ':host{all:initial}' +
      '*{box-sizing:border-box}' +
      '.backdrop{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,18,11,.6);' +
      '-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);font-family:"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;animation:fade .35s ease}' +
      '.card{position:relative;width:min(460px,100%);overflow:hidden;border-radius:22px;background:#fbf8f2;color:#13241a;box-shadow:0 30px 90px -20px rgba(0,0,0,.6);animation:up .5s cubic-bezier(.16,1,.3,1)}' +
      '.photo{position:relative;height:150px;background:#0f2e1f url(' + NEW_SITE + 'assets/img/thumbs/99690585.jpg) center/cover}' +
      '.photo:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,22,14,.15),rgba(6,22,14,.65))}' +
      '.logo{position:absolute;left:20px;bottom:14px;z-index:1;height:54px;width:auto;filter:drop-shadow(0 6px 12px rgba(0,0,0,.35))}' +
      '.badge{position:absolute;right:62px;top:16px;z-index:1;padding:5px 11px;border-radius:99px;background:#c9a961;color:#0f2e1f;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}' +
      '.x{position:absolute;right:12px;top:10px;z-index:2;width:40px;height:40px;border:0;border-radius:50%;background:rgba(255,255,255,.92);color:#0f2e1f;' +
      'font-size:22px;line-height:40px;text-align:center;cursor:pointer;transition:transform .3s}' +
      '.x:hover{transform:rotate(90deg)}' +
      '.body{padding:22px 24px 24px}' +
      'h2{margin:0 0 8px;font-size:23px;line-height:1.2;font-weight:800;color:#0f2e1f}' +
      'p{margin:0 0 20px;font-size:15px;line-height:1.55;color:#4a5a50}' +
      '.go{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px 18px;border-radius:99px;background:#c9a961;color:#0f2e1f;' +
      'font-size:15px;font-weight:800;text-decoration:none;box-shadow:0 12px 26px -12px rgba(201,169,97,.9);transition:background .3s,transform .3s}' +
      '.go:hover{background:#dcc28a;transform:translateY(-2px)}' +
      '.stay{display:block;width:100%;margin-top:10px;padding:10px;border:0;background:none;color:#6a786f;font-size:14px;font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer}' +
      '.go:focus-visible,.stay:focus-visible,.x:focus-visible{outline:2px solid #3a7d44;outline-offset:3px}' +
      '@keyframes fade{from{opacity:0}}@keyframes up{from{opacity:0;transform:translateY(24px) scale(.97)}}' +
      '@media (prefers-reduced-motion:reduce){.backdrop,.card{animation:none}}' +
      '</style>' +
      '<div class="backdrop" part="backdrop">' +
        '<div class="card" role="dialog" aria-modal="true" aria-labelledby="gct-nw-title">' +
          '<div class="photo">' +
            '<img class="logo" src="' + NEW_SITE + 'assets/logo.png" alt="Golf Club Teplice">' +
            '<span class="badge">' + L.badge + '</span>' +
          '</div>' +
          '<button class="x" type="button" aria-label="' + L.close + '">&times;</button>' +
          '<div class="body">' +
            '<h2 id="gct-nw-title">' + L.title + '</h2>' +
            '<p>' + L.text + '</p>' +
            '<a class="go" href="' + targetUrl(de) + '">' + L.go + ' &rarr;</a>' +
            '<button class="stay" type="button">' + L.stay + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    function close() {
      rememberDismiss();
      document.removeEventListener('keydown', onKey);
      host.remove();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    root.querySelector('.x').addEventListener('click', close);
    root.querySelector('.stay').addEventListener('click', close);
    root.querySelector('.backdrop').addEventListener('click', function (e) { if (e.target === e.currentTarget) close(); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(host);
    root.querySelector('.go').focus({ preventScroll: true });
  }

  if (dismissedRecently()) return;
  var start = function () { setTimeout(show, DELAY_MS); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
