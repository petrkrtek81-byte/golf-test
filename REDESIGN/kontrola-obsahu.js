// Kontrola, že po redesignu nezmizel žádný text ani odkaz (porovná s REDESIGN/texty-pred/).
// Spuštění z kořene projektu po sestavení webu:  node REDESIGN/kontrola-obsahu.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PAGES = ['index', 'onas', 'aktuality', 'cenik', 'hriste', 'treninky', 'turnaje', 'fotogalerie', 'pujcovna-bezek', 'kontakty'];
// odkazy, které se smí měnit (verze CSS/JS, soubory písem)
const IGNORE = [/^assets\/css\/web\.css\?v=/, /^assets\/js\/web\.js\?v=/, /^assets\/fonts\//];

let problems = 0;
for (const p of PAGES) {
  let html = fs.readFileSync(path.join(ROOT, p + '.html'), 'utf8');
  const links = new Set([...html.matchAll(/href="([^"#][^"]*)"/g)].map(m => m[1]));
  html = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const texts = new Set(html
    .replace(/<(br|\/p|\/h\d|\/li|\/div|\/a|\/button|\/dt|\/dd|\/span|\/strong|\/small|\/label)[^>]*>/g, '\n')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean));
  const [txt, lnk = ''] = fs.readFileSync(path.join(__dirname, 'texty-pred', p + '.txt'), 'utf8').split('\n--- odkazy ---\n');
  const missingText = txt.split('\n').filter(Boolean).filter(t => !texts.has(t));
  const missingLinks = lnk.split('\n').filter(Boolean).filter(l => !IGNORE.some(r => r.test(l)) && !links.has(l));
  if (missingText.length || missingLinks.length) {
    problems++;
    console.log(`\n${p}.html`);
    missingText.forEach(t => console.log('  chybí text:   ' + t));
    missingLinks.forEach(l => console.log('  chybí odkaz:  ' + l));
  }
}
console.log(problems ? `\nRozdíly na ${problems} stránkách – zkontrolovat!` : 'OK – všechny texty a odkazy ze stavu před redesignem jsou na místě (10 stránek).');
process.exitCode = problems ? 1 : 0;
