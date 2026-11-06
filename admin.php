<?php
/* =====================================================================
   GOLF CLUB TEPLICE – ADMINISTRACE WEBU (admin.php)
   ---------------------------------------------------------------------
   Upravuje obsah webu v souboru data/obsah.json: aktuality, ceník, slider,
   trenéři, turnaje, fotogalerie a partneři. Nahrané fotky a PDF ukládá do
   složky uploads/. Před každou změnou se uloží záloha do data/zalohy/.

   První spuštění: otevřete /admin.php a nastavte jméno a heslo. Heslo se uloží
   jen jako hash do data/admin-heslo.php (soubor nenahrávejte do gitu).
   Zapomenuté heslo: smažte na hostingu data/admin-heslo.php a nastavte nové.

   Požadavky: PHP 7.4+ s rozšířením GD, právo zápisu do složek data/ a uploads/.
   ===================================================================== */
date_default_timezone_set('Europe/Prague');
mb_internal_encoding('UTF-8');
@ini_set('memory_limit', '256M');
@ini_set('display_errors', '0');

const DATA_DIR     = __DIR__ . '/data';
const DATA_FILE    = DATA_DIR . '/obsah.json';
const PASS_FILE    = DATA_DIR . '/admin-heslo.php';
const LOGIN_FILE   = DATA_DIR . '/prihlaseni.json';
const BACKUP_DIR   = DATA_DIR . '/zalohy';
const UPLOAD_DIR   = __DIR__ . '/uploads';
const UPLOAD_URL   = 'uploads';
const KEEP_BACKUPS = 40;          // kolik posledních záloh se drží
const SESSION_IDLE = 7200;        // odhlášení po 2 h nečinnosti
const MAX_FAILS    = 5;           // špatných pokusů o přihlášení…
const LOCK_MINUTES = 15;          // …a pak pauza (minuty)
const IMG_MAX_SIDE = 2000;        // delší strana uložené fotky (px)
const THUMB_WIDTH  = 800;         // šířka náhledu (px)
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_PDF_BYTES   = 25 * 1024 * 1024;
const MAX_PIXELS      = 60000000; // ochrana paměti při zpracování fotek
const NEWS_FALLBACK_IMG = '99690585.jpg';

const SECTIONS = [
  'prehled'   => ['Přehled', 'home'],
  'aktuality' => ['Aktuality', 'news'],
  'cenik'     => ['Ceník', 'tag'],
  'slider'    => ['Slider', 'slides'],
  'treneri'   => ['Trenéři', 'user'],
  'turnaje'   => ['Turnaje', 'trophy'],
  'galerie'   => ['Fotogalerie', 'photo'],
  'partneri'  => ['Partneři', 'star'],
  'zalohy'    => ['Zálohy', 'history'],
  'heslo'     => ['Heslo', 'key'],
];
const GALLERY_CATS = [
  'hriste-2024'  => 'Hřiště 2024',
  'okoli'        => 'Hřiště a okolí',
  'turnaje'      => 'Turnaje',
  'teambuilding' => 'Teambuildingy',
  'zima'         => 'Zima na Cínovci',
];
const WHAT_LABELS = [
  'aktuality' => 'Aktuality', 'cenik' => 'Ceník', 'slider' => 'Slider', 'treneri' => 'Trenéři',
  'turnaje' => 'Turnaje', 'galerie' => 'Fotogalerie', 'partneri' => 'Partneři', 'obnova' => 'Obnovení zálohy',
];
const UPLOADS_HTACCESS = <<<'HT'
# Nahrané soubory z administrace – nikdy se nespouštějí jako skripty
Options -Indexes -ExecCGI
RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phps .phar .cgi .pl .py
RemoveType .php .phtml .php3 .php4 .php5 .php7 .php8 .phps .phar
<FilesMatch "\.(?i:php\d?|phtml|phps|phar|cgi|pl|py|sh|htaccess)$">
  <IfModule mod_authz_core.c>
    Require all denied
  </IfModule>
  <IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
  </IfModule>
</FilesMatch>
<IfModule mod_php.c>
  php_flag engine off
</IfModule>
<IfModule mod_php7.c>
  php_flag engine off
</IfModule>
HT;

final class UserError extends RuntimeException {}

/* =====================================================================
   POMOCNÉ FUNKCE
   ===================================================================== */
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function flash(string $type, string $msg): void { $_SESSION['flash'][] = [$type, $msg]; }
function redirect(string $query): void
{
  header('Location: admin.php' . ($query !== '' ? '?' . $query : ''), true, 303);
  exit;
}
function is_https(): bool
{
  return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}
function new_id(string $prefix): string { return $prefix . bin2hex(random_bytes(5)); }
function fmt_date(string $iso): string
{
  if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $iso, $m)) return $iso;
  return (int)$m[3] . '. ' . (int)$m[2] . '. ' . $m[1];
}
// český plurál: plural(3, 'fotka', 'fotky', 'fotek') → „3 fotky“
function plural(int $n, string $one, string $few, string $many): string
{
  return $n . ' ' . ($n === 1 ? $one : (($n >= 2 && $n <= 4) ? $few : $many));
}
function fmt_price($n): string { return number_format((float)$n, 0, ',', ' ') . ' Kč'; }
function fmt_bytes(int $b): string
{
  if ($b >= 1073741824) return number_format($b / 1073741824, 1, ',', ' ') . ' GB';
  if ($b >= 1048576) return number_format($b / 1048576, $b >= 10485760 ? 0 : 1, ',', ' ') . ' MB';
  if ($b >= 1024) return number_format($b / 1024, 0, ',', ' ') . ' kB';
  return $b . ' B';
}
function ini_bytes(string $v): int
{
  $v = trim($v);
  if ($v === '') return 0;
  $n = (int)$v;
  switch (strtolower(substr($v, -1))) {
    case 'g': $n *= 1024; // propadá dál
    case 'm': $n *= 1024;
    case 'k': $n *= 1024;
  }
  return $n;
}
function upload_limit(): int
{
  $vals = array_filter([ini_bytes((string)ini_get('upload_max_filesize')), ini_bytes((string)ini_get('post_max_size'))]);
  return $vals ? min($vals) : 0;
}
// stejná funkce jako slug() v index.html – názvy fotek ze starého webu
function slug_name(string $f): string
{
  $f = preg_replace('/[^A-Za-z0-9._-]+/', '-', $f);
  $f = preg_replace('/-+\./', '.', $f);
  return preg_replace('/-+/', '-', $f);
}
function is_upload_path(string $f): bool { return strpos($f, '/') !== false; }
function img_src(string $f): string { return is_upload_path($f) ? $f : 'assets/img/' . slug_name($f); }
function thumb_src(string $f): string
{
  if ($f === '') $f = NEWS_FALLBACK_IMG;
  return is_upload_path($f) ? preg_replace('~([^/]+)$~', 'thumbs/$1', $f) : 'assets/img/thumbs/' . slug_name($f);
}
function logo_src(string $f): string { return is_upload_path($f) ? $f : 'assets/partneri/' . $f; }

/* ---------- vstupy z formulářů ---------- */
function clean_text($v, int $max, bool $multiline = false): string
{
  $v = is_string($v) ? $v : '';
  if (!mb_check_encoding($v, 'UTF-8')) $v = mb_convert_encoding($v, 'UTF-8', 'UTF-8');
  $v = str_replace(["\r\n", "\r"], "\n", $v);
  $v = (string)preg_replace($multiline ? '/[^\P{C}\n\t]/u' : '/\p{C}/u', '', $v);
  $v = $multiline ? trim((string)preg_replace("/\n{3,}/", "\n\n", $v)) : trim((string)preg_replace('/\s+/u', ' ', $v));
  return mb_substr($v, 0, $max);
}
function post_line(string $key, int $max = 200): string { return clean_text($_POST[$key] ?? '', $max); }
function post_text(string $key, int $max = 20000): string { return clean_text($_POST[$key] ?? '', $max, true); }
function post_int(string $key, int $max = 10000000): int
{
  $v = preg_replace('/[^\d]/', '', (string)($_POST[$key] ?? ''));
  return min($max, (int)$v);
}
function post_date(string $key, bool $required = true): string
{
  $v = trim((string)($_POST[$key] ?? ''));
  if ($v === '' && !$required) return '';
  if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
    throw new UserError('Zadejte platné datum.');
  }
  return $v;
}
function post_id(string $key): string
{
  $v = (string)($_POST[$key] ?? '');
  return preg_match('/^[A-Za-z0-9_-]{1,40}$/', $v) ? $v : '';
}
function post_map(string $key, int $max = 300): array
{
  $out = [];
  $v = $_POST[$key] ?? [];
  if (!is_array($v)) return $out;
  foreach ($v as $id => $val) {
    if (preg_match('/^[A-Za-z0-9_-]{1,40}$/', (string)$id)) $out[(string)$id] = clean_text($val, $max);
  }
  return $out;
}
function valid_url(string $u): bool
{
  return (bool)preg_match('~^https?://~i', $u) && filter_var($u, FILTER_VALIDATE_URL) !== false;
}
function valid_link(string $u): bool
{
  return valid_url($u)
    || (bool)preg_match('/^tel:\+?[\d ]{6,20}$/', $u)
    || (bool)preg_match('/^mailto:[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i', $u)
    || (bool)preg_match('/^#[a-z0-9-]{1,40}$/', $u);
}
// stará data formuláře po chybě (aby se nemuselo psát znovu)
function ov(string $key, $default = '')
{
  $o = $GLOBALS['OLD'] ?? null;
  if (is_array($o) && array_key_exists($key, $o) && !is_array($o[$key])) return (string)$o[$key];
  return $default;
}
function oc(string $key, bool $default): bool
{
  $o = $GLOBALS['OLD'] ?? null;
  return is_array($o) ? !empty($o[$key]) : $default;
}

/* =====================================================================
   OBSAH (data/obsah.json) + ZÁLOHY
   ===================================================================== */
function ensure_dir(string $dir): void
{
  if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
    throw new UserError('Nelze vytvořit složku ' . str_replace(__DIR__ . '/', '', $dir) . ' – zkontrolujte práva zápisu na hostingu.');
  }
}
function empty_content(): array
{
  return [
    'version' => 1, 'updated' => '', 'slider' => [], 'news' => [],
    'prices' => [
      'season' => date('Y'), 'deadline' => date('Y') . '-03-31',
      'membership' => ['adult' => [0, 0], 'junior' => [0, 0], 'senior' => [0, 0]],
      'entryFee' => 0, 'buggy' => 0, 'greenFee' => ['d9' => 0, 's9' => 0, 'd18' => 0, 's18' => 0],
      'pdfCs' => '', 'pdfDe' => '',
    ],
    'coaches' => [], 'tournaments' => ['published' => false, 'list' => []], 'gallery' => [], 'partners' => [],
  ];
}
// stabilní id i pro položky bez id (stejné při každém načtení)
function ensure_ids(array &$list, string $prefix): void
{
  foreach ($list as $k => &$item) {
    if (!is_array($item)) { unset($list[$k]); continue; }
    if (empty($item['id']) || !preg_match('/^[A-Za-z0-9_-]{1,40}$/', (string)$item['id'])) {
      $item['id'] = $prefix . substr(md5($k . json_encode($item)), 0, 8);
    }
  }
  unset($item);
  $list = array_values($list);
}
function load_content(): array
{
  $d = empty_content();
  if (is_file(DATA_FILE)) {
    $raw = file_get_contents(DATA_FILE);
    $j = $raw !== false ? json_decode($raw, true) : null;
    if (!is_array($j)) {
      throw new UserError('Soubor s obsahem webu (data/obsah.json) je poškozený. Obnovte prosím poslední zálohu v sekci Zálohy.');
    }
    $d = array_replace($d, $j);
  }
  foreach (['slider', 'news', 'coaches', 'gallery', 'partners'] as $k) if (!is_array($d[$k])) $d[$k] = [];
  if (!is_array($d['tournaments'])) $d['tournaments'] = ['published' => false, 'list' => []];
  if (!isset($d['tournaments']['list']) || !is_array($d['tournaments']['list'])) $d['tournaments']['list'] = [];
  $d['prices'] = array_replace(empty_content()['prices'], is_array($d['prices']) ? $d['prices'] : []);
  ensure_ids($d['slider'], 's');
  ensure_ids($d['news'], 'a');
  ensure_ids($d['coaches'], 't');
  ensure_ids($d['gallery'], 'g');
  ensure_ids($d['partners'], 'p');
  ensure_ids($d['tournaments']['list'], 'u');
  return $d;
}
function backup_list(): array
{
  $files = is_dir(BACKUP_DIR) ? (glob(BACKUP_DIR . '/obsah-*.json') ?: []) : [];
  rsort($files);
  $out = [];
  foreach ($files as $p) {
    $name = basename($p);
    $time = '';
    $what = '';
    if (preg_match('/^obsah-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})-([a-z]*)/', $name, $m)) {
      $time = (int)$m[3] . '. ' . (int)$m[2] . '. ' . $m[1] . ' ' . $m[4] . ':' . $m[5] . ':' . $m[6];
      $what = WHAT_LABELS[$m[7]] ?? '';
    }
    $out[] = ['name' => $name, 'time' => $time, 'what' => $what, 'size' => (int)@filesize($p)];
  }
  return $out;
}
function save_content(array $d, string $what): void
{
  ensure_dir(DATA_DIR);
  if (is_file(DATA_FILE)) {
    ensure_dir(BACKUP_DIR);
    $name = 'obsah-' . date('Y-m-d-His') . '-' . preg_replace('/[^a-z]/', '', $what) . '-' . bin2hex(random_bytes(2)) . '.json';
    @copy(DATA_FILE, BACKUP_DIR . '/' . $name);
    $all = glob(BACKUP_DIR . '/obsah-*.json') ?: [];
    rsort($all);
    foreach (array_slice($all, KEEP_BACKUPS) as $old) @unlink($old);
  }
  $d['updated'] = date('c');
  $json = json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json === false) throw new UserError('Obsah se nepodařilo uložit (chyba převodu do JSON).');
  $tmp = DATA_FILE . '.tmp-' . bin2hex(random_bytes(4));
  if (@file_put_contents($tmp, $json . "\n") === false) {
    throw new UserError('Nelze zapisovat do složky data/ – zkontrolujte práva zápisu na hostingu.');
  }
  if (!@rename($tmp, DATA_FILE)) {
    @unlink($tmp);
    if (@file_put_contents(DATA_FILE, $json . "\n", LOCK_EX) === false) throw new UserError('Obsah se nepodařilo uložit.');
  }
}
// načte obsah, provede změnu a uloží (se zámkem proti souběžným úpravám)
function mutate(string $what, callable $fn): void
{
  ensure_dir(DATA_DIR);
  $lock = @fopen(DATA_DIR . '/.zamek', 'c');
  if ($lock) @flock($lock, LOCK_EX);
  try {
    $d = load_content();
    $fn($d);
    save_content($d, $what);
  } finally {
    if ($lock) { @flock($lock, LOCK_UN); fclose($lock); }
  }
}
function find_index(array $list, string $id): ?int
{
  foreach ($list as $i => $item) if (($item['id'] ?? '') === $id) return $i;
  return null;
}
// operace v seznamu z tlačítek: up/down/top/delete/toggle
function parse_op(): array
{
  $op = (string)($_POST['op'] ?? 'save');
  return preg_match('/^(up|down|top|delete|toggle):([A-Za-z0-9_-]{1,40})$/', $op, $m) ? [$m[1], $m[2]] : ['save', ''];
}
function apply_op(array &$list, string $op, string $id): void
{
  if ($op === 'save') return;
  $i = find_index($list, $id);
  if ($i === null) throw new UserError('Položka nebyla nalezena (možná byla mezitím smazána).');
  $n = count($list);
  if ($op === 'up' && $i > 0) { [$list[$i - 1], $list[$i]] = [$list[$i], $list[$i - 1]]; }
  elseif ($op === 'down' && $i < $n - 1) { [$list[$i + 1], $list[$i]] = [$list[$i], $list[$i + 1]]; }
  elseif ($op === 'top' && $i > 0) { $item = $list[$i]; array_splice($list, $i, 1); array_unshift($list, $item); }
  elseif ($op === 'delete') { array_splice($list, $i, 1); }
  elseif ($op === 'toggle') { $list[$i]['active'] = empty($list[$i]['active']); }
}
function op_message(string $op, string $saved): string
{
  $msgs = ['up' => 'Pořadí bylo změněno.', 'down' => 'Pořadí bylo změněno.', 'top' => 'Položka byla přesunuta na začátek.', 'delete' => 'Položka byla smazána.', 'toggle' => 'Stav byl změněn.'];
  return $msgs[$op] ?? $saved;
}

/* =====================================================================
   NAHRÁVÁNÍ SOUBORŮ (fotky přes GD, PDF)
   ===================================================================== */
function ensure_upload_dirs(): void
{
  foreach (['/img/thumbs', '/partneri', '/cenik'] as $sub) ensure_dir(UPLOAD_DIR . $sub);
  if (!is_file(UPLOAD_DIR . '/.htaccess')) @file_put_contents(UPLOAD_DIR . '/.htaccess', UPLOADS_HTACCESS . "\n");
}
function upload_error_text(int $code, string $name): string
{
  switch ($code) {
    case UPLOAD_ERR_INI_SIZE:
    case UPLOAD_ERR_FORM_SIZE: return "Soubor „{$name}“ je příliš velký (limit serveru je " . fmt_bytes(upload_limit()) . ').';
    case UPLOAD_ERR_PARTIAL:   return "Soubor „{$name}“ se nenahrál celý, zkuste to znovu.";
    default:                   return "Soubor „{$name}“ se nepodařilo nahrát (chyba {$code}).";
  }
}
// seznam nahraných souborů z pole <input type=file name="x"> nebo name="x[]"
function uploaded_files(string $field): array
{
  $f = $_FILES[$field] ?? null;
  if (!$f || !isset($f['error'])) return [];
  $list = [];
  if (is_array($f['error'])) {
    foreach ($f['error'] as $k => $err) {
      if (is_array($err)) continue;
      $list[] = ['name' => (string)$f['name'][$k], 'tmp' => (string)$f['tmp_name'][$k], 'error' => (int)$err, 'size' => (int)$f['size'][$k], 'key' => (string)$k];
    }
  } else {
    $list[] = ['name' => (string)$f['name'], 'tmp' => (string)$f['tmp_name'], 'error' => (int)$f['error'], 'size' => (int)$f['size'], 'key' => ''];
  }
  $out = [];
  foreach ($list as $u) {
    if ($u['error'] === UPLOAD_ERR_NO_FILE) continue;
    $u['name'] = clean_text(basename(str_replace('\\', '/', $u['name'])), 120);
    if ($u['error'] !== UPLOAD_ERR_OK) throw new UserError(upload_error_text($u['error'], $u['name']));
    if (!is_uploaded_file($u['tmp'])) throw new UserError('Neplatný nahraný soubor.');
    $out[] = $u;
  }
  return $out;
}
function first_upload(string $field): ?array
{
  $all = uploaded_files($field);
  return $all ? $all[0] : null;
}
function gd_ready(): bool { return function_exists('imagecreatetruecolor') && function_exists('getimagesize'); }
function open_image(array $u): array
{
  if (!gd_ready()) throw new UserError('Na hostingu chybí rozšíření PHP GD – fotky nelze zpracovat. Požádejte hosting o jeho zapnutí.');
  if ($u['size'] > MAX_IMAGE_BYTES) throw new UserError("Fotka „{$u['name']}“ je příliš velká (max. " . fmt_bytes(MAX_IMAGE_BYTES) . ').');
  $info = @getimagesize($u['tmp']);
  if (!$info) throw new UserError("Soubor „{$u['name']}“ není obrázek (JPG, PNG nebo WebP).");
  [$w, $hgt, $type] = [(int)$info[0], (int)$info[1], (int)$info[2]];
  if ($w < 1 || $hgt < 1 || $w * $hgt > MAX_PIXELS) throw new UserError("Fotka „{$u['name']}“ má příliš velké rozlišení.");
  $im = false;
  if ($type === IMAGETYPE_JPEG) $im = @imagecreatefromjpeg($u['tmp']);
  elseif ($type === IMAGETYPE_PNG) $im = @imagecreatefrompng($u['tmp']);
  elseif ($type === IMAGETYPE_WEBP && function_exists('imagecreatefromwebp')) $im = @imagecreatefromwebp($u['tmp']);
  else throw new UserError("Soubor „{$u['name']}“ má nepodporovaný formát – použijte JPG, PNG nebo WebP.");
  if (!$im) throw new UserError("Fotku „{$u['name']}“ se nepodařilo načíst.");
  // natočení podle EXIF (fotky z mobilu)
  if ($type === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
    $exif = @exif_read_data($u['tmp']);
    $o = is_array($exif) ? (int)($exif['Orientation'] ?? 1) : 1;
    $rot = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
    if ($rot) { $r = imagerotate($im, $rot, 0); if ($r) { imagedestroy($im); $im = $r; } }
  }
  return [$im, $type];
}
function resized($src, int $maxW, int $maxH, bool $alpha)
{
  $w = imagesx($src);
  $hgt = imagesy($src);
  $k = min(1, $maxW / $w, $maxH / $hgt);
  $nw = max(1, (int)round($w * $k));
  $nh = max(1, (int)round($hgt * $k));
  $dst = imagecreatetruecolor($nw, $nh);
  if ($alpha) {
    imagealphablending($dst, false);
    imagesavealpha($dst, true);
    imagefilledrectangle($dst, 0, 0, $nw, $nh, imagecolorallocatealpha($dst, 0, 0, 0, 127));
  } else {
    imagefilledrectangle($dst, 0, 0, $nw, $nh, imagecolorallocate($dst, 255, 255, 255));
  }
  imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $hgt);
  return $dst;
}
// fotka → uploads/img/xxx.jpg (+ náhled uploads/img/thumbs/xxx.jpg)
function save_photo(array $u): array
{
  ensure_upload_dirs();
  [$im] = open_image($u);
  $full = resized($im, IMG_MAX_SIDE, IMG_MAX_SIDE, false);
  imagedestroy($im);
  $thumb = resized($full, THUMB_WIDTH, 100000, false);
  $name = date('Y-m-d') . '-' . bin2hex(random_bytes(5)) . '.jpg';
  imageinterlace($full, true);
  imageinterlace($thumb, true);
  $ok = imagejpeg($full, UPLOAD_DIR . '/img/' . $name, 84) && imagejpeg($thumb, UPLOAD_DIR . '/img/thumbs/' . $name, 80);
  $res = ['f' => UPLOAD_URL . '/img/' . $name, 'w' => imagesx($full), 'h' => imagesy($full)];
  imagedestroy($full);
  imagedestroy($thumb);
  if (!$ok) throw new UserError('Fotku se nepodařilo uložit – zkontrolujte práva zápisu do složky uploads/.');
  return $res;
}
// logo partnera → uploads/partneri/xxx.png (průhlednost zůstane)
function save_logo(array $u): string
{
  ensure_upload_dirs();
  [$im] = open_image($u);
  $logo = resized($im, 640, 260, true);
  imagedestroy($im);
  $name = date('Y-m-d') . '-' . bin2hex(random_bytes(5)) . '.png';
  $ok = imagepng($logo, UPLOAD_DIR . '/partneri/' . $name, 9);
  imagedestroy($logo);
  if (!$ok) throw new UserError('Logo se nepodařilo uložit – zkontrolujte práva zápisu do složky uploads/.');
  return UPLOAD_URL . '/partneri/' . $name;
}
function save_pdf(array $u, string $lang): string
{
  ensure_upload_dirs();
  if ($u['size'] > MAX_PDF_BYTES) throw new UserError('PDF je příliš velké (max. ' . fmt_bytes(MAX_PDF_BYTES) . ').');
  $fh = @fopen($u['tmp'], 'rb');
  $head = $fh ? (string)fread($fh, 5) : '';
  if ($fh) fclose($fh);
  if ($head !== '%PDF-') throw new UserError("Soubor „{$u['name']}“ není PDF.");
  $name = ($lang === 'de' ? 'preisliste-de-' : 'cenik-') . date('Y-m-d') . '-' . bin2hex(random_bytes(3)) . '.pdf';
  $dest = UPLOAD_DIR . '/cenik/' . $name;
  if (!@move_uploaded_file($u['tmp'], $dest) && !@copy($u['tmp'], $dest)) {
    throw new UserError('PDF se nepodařilo uložit – zkontrolujte práva zápisu do složky uploads/.');
  }
  return UPLOAD_URL . '/cenik/' . $name;
}

/* =====================================================================
   PŘIHLÁŠENÍ
   ===================================================================== */
function start_session(): void
{
  $path = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/') . '/';
  session_name('gct_admin');
  session_set_cookie_params(['lifetime' => 0, 'path' => $path, 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Strict']);
  @ini_set('session.use_strict_mode', '1');
  @ini_set('session.use_only_cookies', '1');
  session_start();
  if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
function auth_config(): ?array
{
  if (!is_file(PASS_FILE)) return null;
  $c = include PASS_FILE;
  return (is_array($c) && !empty($c['hash']) && !empty($c['user'])) ? $c : null;
}
function write_auth(string $user, string $pass): void
{
  ensure_dir(DATA_DIR);
  $cfg = ['user' => $user, 'hash' => password_hash($pass, PASSWORD_DEFAULT), 'changed' => date('c')];
  $code = "<?php\n// Přihlášení do administrace (heslo je uložené jen jako hash). Nenahrávat do gitu.\n"
    . "// Zapomenuté heslo: tento soubor smažte a v admin.php nastavte nové.\nreturn " . var_export($cfg, true) . ";\n";
  if (@file_put_contents(PASS_FILE, $code, LOCK_EX) === false) {
    throw new UserError('Heslo nelze uložit – složka data/ musí mít na hostingu právo zápisu.');
  }
  if (function_exists('opcache_invalidate')) @opcache_invalidate(PASS_FILE, true);
}
function pw_version(array $cfg): string { return substr(hash('sha256', (string)$cfg['hash']), 0, 16); }
function set_logged_in(array $cfg): void
{
  session_regenerate_id(true);
  $_SESSION['admin'] = $cfg['user'];
  $_SESSION['seen'] = time();
  $_SESSION['pwv'] = pw_version($cfg);
}
function logout_session(): void
{
  $_SESSION = [];
  session_regenerate_id(true);
  $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
function is_logged_in(?array $cfg): bool
{
  if (!$cfg || empty($_SESSION['admin'])) return false;
  if (($_SESSION['pwv'] ?? '') !== pw_version($cfg)) { logout_session(); return false; }
  if (time() - (int)($_SESSION['seen'] ?? 0) > SESSION_IDLE) {
    logout_session();
    flash('err', 'Po delší nečinnosti jste byli z bezpečnostních důvodů odhlášeni.');
    return false;
  }
  $_SESSION['seen'] = time();
  return true;
}
function check_csrf(): bool
{
  $t = $_POST['csrf'] ?? '';
  return is_string($t) && $t !== '' && hash_equals((string)($_SESSION['csrf'] ?? ''), $t);
}
function same_origin(): bool
{
  $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
  if ($origin === '') return true;
  $host = strtolower((string)parse_url($origin, PHP_URL_HOST));
  $self = strtolower((string)preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
  return $host !== '' && $host === $self;
}
function login_key(): string { return substr(hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? '?')), 0, 24); }
function login_db(): array
{
  $raw = is_file(LOGIN_FILE) ? @file_get_contents(LOGIN_FILE) : '';
  $d = $raw ? json_decode($raw, true) : [];
  return is_array($d) ? $d : [];
}
function login_db_save(array $d): void
{
  foreach ($d as $k => $v) if ((int)($v['t'] ?? 0) < time() - 86400) unset($d[$k]);
  @file_put_contents(LOGIN_FILE, json_encode($d), LOCK_EX);
}
function login_wait(string $k): int
{
  $d = login_db();
  return max(0, (int)($d[$k]['until'] ?? 0) - time());
}
function login_failed(string $k): void
{
  $d = login_db();
  $e = $d[$k] ?? [];
  $n = (time() - (int)($e['t'] ?? 0) > LOCK_MINUTES * 60) ? 0 : (int)($e['n'] ?? 0);
  $e = ['n' => $n + 1, 't' => time(), 'until' => (int)($e['until'] ?? 0)];
  if ($e['n'] >= MAX_FAILS) { $e['until'] = time() + LOCK_MINUTES * 60; $e['n'] = 0; }
  $d[$k] = $e;
  login_db_save($d);
}
function login_ok(string $k): void
{
  $d = login_db();
  unset($d[$k]);
  login_db_save($d);
}
function validate_password(string $p1, string $p2): void
{
  if (mb_strlen($p1) < 10) throw new UserError('Heslo musí mít aspoň 10 znaků.');
  if (strlen($p1) > 200) throw new UserError('Heslo je příliš dlouhé.');
  if ($p1 !== $p2) throw new UserError('Zadaná hesla se neshodují.');
}

/* =====================================================================
   AKCE (POST)
   ===================================================================== */
function handle_setup(): string
{
  if (($_POST['action'] ?? '') !== 'setup' || auth_config()) return '';
  $user = post_line('user', 40);
  if (!preg_match('/^[\p{L}\p{N}._@-]{3,40}$/u', $user)) throw new UserError('Přihlašovací jméno: 3–40 znaků bez mezer.');
  validate_password((string)($_POST['p1'] ?? ''), (string)($_POST['p2'] ?? ''));
  write_auth($user, (string)$_POST['p1']);
  $cfg = auth_config();
  if (!$cfg) throw new UserError('Heslo se nepodařilo uložit.');
  set_logged_in($cfg);
  flash('ok', 'Hotovo – přihlašovací údaje jsou nastavené. Vítejte v administraci.');
  return 's=prehled';
}
function handle_login(array $cfg): string
{
  if (($_POST['action'] ?? '') !== 'login') return '';
  $key = login_key();
  $wait = login_wait($key);
  if ($wait > 0) throw new UserError('Příliš mnoho neúspěšných pokusů. Zkuste to znovu za ' . (int)ceil($wait / 60) . ' min.');
  $user = post_line('user', 60);
  $pass = (string)($_POST['pass'] ?? '');
  $okPass = password_verify($pass, (string)$cfg['hash']);
  $okUser = hash_equals(mb_strtolower((string)$cfg['user']), mb_strtolower($user));
  if (!$okPass || !$okUser) {
    login_failed($key);
    usleep(400000);
    throw new UserError('Nesprávné jméno nebo heslo.');
  }
  login_ok($key);
  if (password_needs_rehash((string)$cfg['hash'], PASSWORD_DEFAULT)) {
    try { write_auth((string)$cfg['user'], $pass); $cfg = auth_config() ?: $cfg; } catch (UserError $e) { /* nevadí */ }
  }
  set_logged_in($cfg);
  return 's=prehled';
}
function handle_action(string $action, array $cfg): string
{
  switch ($action) {
    case 'logout':
      logout_session();
      flash('ok', 'Byli jste odhlášeni.');
      return '';
    case 'news_save':      return news_save();
    case 'news_list':      return news_list();
    case 'prices_save':    return prices_save();
    case 'slides_list':    return slides_list();
    case 'slides_add':     return slides_add();
    case 'coach_save':     return coach_save();
    case 'coaches_list':   return coaches_list();
    case 'tours_publish':  return tours_publish();
    case 'tour_save':      return tour_save();
    case 'tours_list':     return tours_list();
    case 'gallery_list':   return gallery_list();
    case 'gallery_add':    return gallery_add();
    case 'partners_list':  return partners_list();
    case 'partner_add':    return partner_add();
    case 'restore':        return backup_restore();
    case 'password':       return password_change($cfg);
  }
  throw new UserError('Neznámá akce.');
}

/* ---------- Aktuality ---------- */
function auto_excerpt(string $body): string
{
  $plain = trim((string)preg_replace('/\s+/u', ' ', str_replace(['**', "\n- "], ['', ' '], $body)));
  if (mb_strlen($plain) <= 180) return $plain;
  $cut = mb_substr($plain, 0, 180);
  $sp = mb_strrpos($cut, ' ');
  return rtrim(mb_substr($cut, 0, $sp ?: 180), ' ,.;:–-') . '…';
}
function news_save(): string
{
  $id = post_id('id');
  $date = post_date('date');
  $title = post_line('title', 200);
  if ($title === '') throw new UserError('Vyplňte nadpis aktuality.');
  $body = post_text('body');
  $excerpt = post_line('excerpt', 400);
  if ($excerpt === '') $excerpt = auto_excerpt($body);
  $de = [
    'tag' => post_line('tag_de', 40), 'title' => post_line('title_de', 200), 'excerpt' => post_line('excerpt_de', 400),
    'body' => post_text('body_de'), 'ctaLabel' => post_line('cta_label_de', 80),
  ];
  if ($de['excerpt'] === '' && $de['body'] !== '') $de['excerpt'] = auto_excerpt($de['body']);
  $ctaLabel = post_line('cta_label', 80);
  $ctaHref = post_line('cta_href', 500);
  if ($ctaHref !== '' && !valid_link($ctaHref)) {
    throw new UserError('Odkaz tlačítka musí začínat https://, tel:, mailto: nebo # (např. #cenik).');
  }
  if (($ctaHref === '') !== ($ctaLabel === '')) throw new UserError('Pro tlačítko vyplňte text i odkaz (nebo nechte obojí prázdné).');
  $remove = array_map('strval', (array)($_POST['remove_photos'] ?? []));

  // fotky se zpracují před zápisem obsahu
  $main = ($u = first_upload('img')) ? save_photo($u)['f'] : null;
  $extra = array_map(function ($u) { return save_photo($u)['f']; }, uploaded_files('photos'));

  mutate('aktuality', function (array &$d) use ($id, $date, $title, $body, $excerpt, $de, $ctaLabel, $ctaHref, $remove, $main, $extra) {
    if ($id !== '') {
      $i = find_index($d['news'], $id);
      if ($i === null) throw new UserError('Aktualita nebyla nalezena (možná byla mezitím smazána).');
      $n = $d['news'][$i];
    } else {
      $i = null;
      $n = ['id' => new_id('a')];
    }
    $oldImg = (string)($n['img'] ?? '');
    $others = array_values(array_filter((array)($n['gallery'] ?? []), function ($f) use ($oldImg, $remove) {
      return is_string($f) && $f !== $oldImg && !in_array($f, $remove, true);
    }));
    $others = array_merge($others, $extra);
    $img = $main ?? ($oldImg !== '' && !in_array($oldImg, $remove, true) ? $oldImg : '');
    if ($img === '' && $others) $img = array_shift($others);
    $n = array_merge($n, [
      'date' => $date, 'img' => $img, 'gallery' => $others ? array_merge([$img], $others) : [],
      'tag' => post_line('tag', 40), 'title' => $title, 'excerpt' => $excerpt, 'body' => $body,
      'cta' => $ctaHref !== '' ? ['href' => $ctaHref, 'label' => $ctaLabel, 'external' => (bool)preg_match('~^https?://~i', $ctaHref)] : null,
      'de' => $de,
    ]);
    if ($i === null) $d['news'][] = $n; else $d['news'][$i] = $n;
    usort($d['news'], function ($a, $b) { return strcmp((string)($b['date'] ?? ''), (string)($a['date'] ?? '')); });
  });
  flash('ok', $id !== '' ? 'Aktualita byla uložena.' : 'Aktualita byla přidána na web.');
  return 's=aktuality';
}
function news_list(): string
{
  [$op, $id] = parse_op();
  if ($op !== 'delete') return 's=aktuality';
  mutate('aktuality', function (array &$d) use ($op, $id) { apply_op($d['news'], $op, $id); });
  flash('ok', 'Aktualita byla smazána.');
  return 's=aktuality';
}

/* ---------- Ceník ---------- */
function prices_save(): string
{
  $season = post_line('season', 20);
  if (!preg_match('/^\d{4}$/', $season)) throw new UserError('Sezóna musí být rok, např. ' . date('Y') . '.');
  $deadline = post_date('deadline');
  $p = [
    'season' => $season, 'deadline' => $deadline,
    'membership' => [
      'adult'  => [post_int('adult_early'), post_int('adult_late')],
      'junior' => [post_int('junior_early'), post_int('junior_late')],
      'senior' => [post_int('senior_early'), post_int('senior_late')],
    ],
    'entryFee' => post_int('entry'), 'buggy' => post_int('buggy'),
    'greenFee' => ['d9' => post_int('gf_d9'), 's9' => post_int('gf_s9'), 'd18' => post_int('gf_d18'), 's18' => post_int('gf_s18')],
  ];
  $pdfCs = ($u = first_upload('pdf_cs')) ? save_pdf($u, 'cs') : null;
  $pdfDe = ($u = first_upload('pdf_de')) ? save_pdf($u, 'de') : null;
  mutate('cenik', function (array &$d) use ($p, $pdfCs, $pdfDe) {
    $d['prices'] = array_merge($d['prices'], $p);
    if ($pdfCs) $d['prices']['pdfCs'] = $pdfCs;
    if ($pdfDe) $d['prices']['pdfDe'] = $pdfDe;
  });
  flash('ok', 'Ceník byl uložen' . ($pdfCs || $pdfDe ? ' včetně nového PDF.' : '.'));
  return 's=cenik';
}

/* ---------- Slider ---------- */
function slides_list(): string
{
  [$op, $id] = parse_op();
  $cap = post_map('cap', 120);
  $capDe = post_map('capde', 120);
  mutate('slider', function (array &$d) use ($op, $id, $cap, $capDe) {
    foreach ($d['slider'] as &$s) {
      if (isset($cap[$s['id']])) $s['t'] = $cap[$s['id']];
      if (isset($capDe[$s['id']])) $s['tDe'] = $capDe[$s['id']];
    }
    unset($s);
    if ($op === 'delete' && count($d['slider']) <= 1) throw new UserError('Slider musí mít aspoň jednu fotku.');
    apply_op($d['slider'], $op, $id);
  });
  flash('ok', op_message($op, 'Popisky slideru byly uloženy.'));
  return 's=slider';
}
function slides_add(): string
{
  $files = uploaded_files('slides');
  if (!$files) throw new UserError('Vyberte fotku (nebo více fotek) pro slider.');
  $t = post_line('t', 120);
  $tDe = post_line('tDe', 120);
  $new = [];
  foreach ($files as $u) $new[] = ['id' => new_id('s'), 'f' => save_photo($u)['f'], 't' => $t, 'tDe' => $tDe];
  mutate('slider', function (array &$d) use ($new) { $d['slider'] = array_merge($d['slider'], $new); });
  $c = count($new);
  flash('ok', $c === 1 ? 'Fotka byla přidána do slideru (na konec – pořadí změníte šipkami).' : ($c <= 4 ? "{$c} fotky byly přidány do slideru." : "{$c} fotek bylo přidáno do slideru."));
  return 's=slider';
}

/* ---------- Trenéři ---------- */
function coach_save(): string
{
  $id = post_id('id');
  $name = post_line('name', 80);
  if ($name === '') throw new UserError('Vyplňte jméno trenéra.');
  $email = post_line('email', 120);
  if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new UserError('E-mail nemá správný tvar.');
  $phone = post_line('phone', 30);
  if ($phone !== '' && !preg_match('/^\+?[\d ]{6,20}$/', $phone)) throw new UserError('Telefon zadejte jen číslicemi, např. +420 777 820 971.');
  $fields = [
    'name' => $name, 'phone' => $phone, 'email' => $email, 'active' => !empty($_POST['active']),
    'role' => post_line('role', 300), 'tags' => post_line('tags', 200),
    'de' => ['role' => post_line('role_de', 300), 'tags' => post_line('tags_de', 200)],
  ];
  $photo = ($u = first_upload('photo')) ? save_photo($u)['f'] : null;
  $removePhoto = !empty($_POST['remove_photo']);
  mutate('treneri', function (array &$d) use ($id, $fields, $photo, $removePhoto) {
    $i = $id !== '' ? find_index($d['coaches'], $id) : null;
    if ($id !== '' && $i === null) throw new UserError('Trenér nebyl nalezen.');
    $c = $i === null ? ['id' => new_id('t'), 'photo' => ''] : $d['coaches'][$i];
    $c = array_merge($c, $fields);
    if ($removePhoto) $c['photo'] = '';
    if ($photo) $c['photo'] = $photo;
    if ($i === null) $d['coaches'][] = $c; else $d['coaches'][$i] = $c;
  });
  flash('ok', $id !== '' ? 'Trenér byl uložen.' : 'Trenér byl přidán.');
  return 's=treneri';
}
function coaches_list(): string
{
  [$op, $id] = parse_op();
  mutate('treneri', function (array &$d) use ($op, $id) { apply_op($d['coaches'], $op, $id); });
  flash('ok', op_message($op, 'Uloženo.'));
  return 's=treneri';
}

/* ---------- Turnaje ---------- */
function tours_publish(): string
{
  $pub = !empty($_POST['published']);
  mutate('turnaje', function (array &$d) use ($pub) { $d['tournaments']['published'] = $pub; });
  flash('ok', $pub ? 'Kalendář turnajů je na webu zveřejněný.' : 'Kalendář turnajů je skrytý – na webu je text „Kalendář turnajů připravujeme“.');
  return 's=turnaje';
}
function tour_save(): string
{
  $id = post_id('id');
  $t = [
    'date' => post_date('date'), 'name' => post_line('name', 150), 'format' => post_line('format', 120), 'cat' => post_line('cat', 60),
    'de' => ['name' => post_line('name_de', 150), 'format' => post_line('format_de', 120), 'cat' => post_line('cat_de', 60)],
  ];
  if ($t['name'] === '') throw new UserError('Vyplňte název turnaje.');
  mutate('turnaje', function (array &$d) use ($id, $t) {
    $list = &$d['tournaments']['list'];
    $i = $id !== '' ? find_index($list, $id) : null;
    if ($id !== '' && $i === null) throw new UserError('Turnaj nebyl nalezen.');
    if ($i === null) $list[] = array_merge(['id' => new_id('u')], $t); else $list[$i] = array_merge($list[$i], $t);
    usort($list, function ($a, $b) { return strcmp((string)($a['date'] ?? ''), (string)($b['date'] ?? '')); });
  });
  flash('ok', $id !== '' ? 'Turnaj byl uložen.' : 'Turnaj byl přidán.');
  return 's=turnaje';
}
function tours_list(): string
{
  [$op, $id] = parse_op();
  if ($op !== 'delete') return 's=turnaje';
  mutate('turnaje', function (array &$d) use ($op, $id) { apply_op($d['tournaments']['list'], $op, $id); });
  flash('ok', 'Turnaj byl smazán.');
  return 's=turnaje';
}

/* ---------- Fotogalerie ---------- */
function gallery_list(): string
{
  [$op, $id] = parse_op();
  $cap = post_map('cap', 150);
  $capDe = post_map('capde', 150);
  $cat = post_map('cat', 40);
  mutate('galerie', function (array &$d) use ($op, $id, $cap, $capDe, $cat) {
    foreach ($d['gallery'] as &$g) {
      if (isset($cap[$g['id']])) $g['t'] = $cap[$g['id']];
      if (isset($capDe[$g['id']])) $g['tDe'] = $capDe[$g['id']];
      if (isset($cat[$g['id']]) && isset(GALLERY_CATS[$cat[$g['id']]])) $g['cat'] = $cat[$g['id']];
    }
    unset($g);
    apply_op($d['gallery'], $op, $id);
  });
  flash('ok', op_message($op, 'Popisky fotek byly uloženy.'));
  return 's=galerie';
}
function gallery_add(): string
{
  $files = uploaded_files('photos');
  if (!$files) throw new UserError('Vyberte fotky, které chcete přidat.');
  $cat = (string)($_POST['cat'] ?? '');
  if (!isset(GALLERY_CATS[$cat])) throw new UserError('Vyberte kategorii fotek.');
  $t = post_line('t', 150);
  $tDe = post_line('tDe', 150);
  $top = !empty($_POST['top']);
  $new = [];
  foreach ($files as $u) {
    $p = save_photo($u);
    $new[] = ['id' => new_id('g'), 'f' => $p['f'], 'w' => $p['w'], 'h' => $p['h'], 'cat' => $cat, 't' => $t, 'tDe' => $tDe];
  }
  mutate('galerie', function (array &$d) use ($new, $top) { $d['gallery'] = $top ? array_merge($new, $d['gallery']) : array_merge($d['gallery'], $new); });
  $c = count($new);
  flash('ok', $c === 1 ? 'Fotka byla přidána do galerie.' : ($c <= 4 ? "{$c} fotky byly přidány do galerie." : "{$c} fotek bylo přidáno do galerie."));
  return 's=galerie';
}

/* ---------- Partneři ---------- */
function partners_list(): string
{
  [$op, $id] = parse_op();
  $names = post_map('name', 80);
  $urls = post_map('url', 300);
  foreach ($urls as $u) if ($u !== '' && !valid_url($u)) throw new UserError("Odkaz „{$u}“ musí být celá adresa začínající https://");
  $logos = [];
  foreach (uploaded_files('logo') as $u) if ($u['key'] !== '') $logos[$u['key']] = save_logo($u);
  mutate('partneri', function (array &$d) use ($op, $id, $names, $urls, $logos) {
    foreach ($d['partners'] as &$p) {
      if (isset($names[$p['id']]) && $names[$p['id']] !== '') $p['name'] = $names[$p['id']];
      if (isset($urls[$p['id']])) $p['url'] = $urls[$p['id']];
      if (isset($logos[$p['id']])) $p['logo'] = $logos[$p['id']];
    }
    unset($p);
    apply_op($d['partners'], $op, $id);
  });
  flash('ok', op_message($op, 'Partneři byli uloženi.'));
  return 's=partneri';
}
function partner_add(): string
{
  $name = post_line('name', 80);
  if ($name === '') throw new UserError('Vyplňte název partnera.');
  $url = post_line('url', 300);
  if ($url !== '' && !valid_url($url)) throw new UserError('Odkaz musí být celá adresa začínající https://');
  $u = first_upload('logo');
  if (!$u) throw new UserError('Nahrajte logo partnera (PNG s průhledným pozadím je nejlepší).');
  $logo = save_logo($u);
  mutate('partneri', function (array &$d) use ($name, $url, $logo) {
    $d['partners'][] = ['id' => new_id('p'), 'name' => $name, 'url' => $url, 'logo' => $logo];
  });
  flash('ok', 'Partner byl přidán.');
  return 's=partneri';
}

/* ---------- Zálohy, heslo ---------- */
function backup_path(string $name): ?string
{
  if (!preg_match('/^obsah-[0-9a-z-]{10,80}\.json$/', $name)) return null;
  $p = BACKUP_DIR . '/' . $name;
  return is_file($p) ? $p : null;
}
function backup_restore(): string
{
  $p = backup_path((string)($_POST['file'] ?? ''));
  if (!$p) throw new UserError('Záloha nebyla nalezena.');
  $j = json_decode((string)file_get_contents($p), true);
  if (!is_array($j) || !isset($j['news'])) throw new UserError('Záloha je poškozená a nelze ji obnovit.');
  ensure_dir(DATA_DIR);
  $lock = @fopen(DATA_DIR . '/.zamek', 'c');
  if ($lock) @flock($lock, LOCK_EX);
  try {
    save_content($j, 'obnova');
  } finally {
    if ($lock) { @flock($lock, LOCK_UN); fclose($lock); }
  }
  flash('ok', 'Záloha byla obnovena. Předchozí stav je uložený jako nová záloha „Obnovení zálohy“.');
  return 's=zalohy';
}
function password_change(array $cfg): string
{
  if (!password_verify((string)($_POST['current'] ?? ''), (string)$cfg['hash'])) throw new UserError('Současné heslo není správné.');
  validate_password((string)($_POST['p1'] ?? ''), (string)($_POST['p2'] ?? ''));
  write_auth((string)$cfg['user'], (string)$_POST['p1']);
  $new = auth_config();
  if ($new) set_logged_in($new);
  flash('ok', 'Heslo bylo změněno.');
  return 's=heslo';
}

/* =====================================================================
   ŘÍZENÍ POŽADAVKU
   ===================================================================== */
$nonce = base64_encode(random_bytes(16));
header('Content-Type: text/html; charset=utf-8');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store, max-age=0');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'nonce-{$nonce}'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'; object-src 'none'");

start_session();
$cfg = auth_config();
$section = (isset($_GET['s']) && is_string($_GET['s']) && isset(SECTIONS[$_GET['s']])) ? $_GET['s'] : 'prehled';
$back = (string)($_POST['back'] ?? '');
if (!preg_match('/^s=[a-z]+(&(edit|new)=[A-Za-z0-9_-]{0,40})?$/', $back)) $back = 's=' . $section;

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  if (empty($_POST) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    flash('err', 'Odeslaná data jsou příliš velká (limit serveru je ' . fmt_bytes(upload_limit()) . '). Nahrávejte menší nebo méně souborů najednou.');
    redirect($back);
  }
  if (!check_csrf() || !same_origin()) {
    flash('err', 'Platnost formuláře vypršela. Zkuste to prosím znovu.');
    redirect($back);
  }
  $target = $back;
  try {
    if (!$cfg) $target = handle_setup() ?: '';
    elseif (!is_logged_in($cfg)) $target = handle_login($cfg) ?: '';
    else $target = handle_action((string)($_POST['action'] ?? ''), $cfg);
  } catch (UserError $e) {
    flash('err', $e->getMessage());
    $_SESSION['old'] = array_diff_key($_POST, array_flip(['csrf', 'pass', 'current', 'p1', 'p2']));
    $target = $back;
  } catch (Throwable $e) {
    error_log('admin.php: ' . $e);
    flash('err', 'Nastala neočekávaná chyba, změna se neuložila. (' . $e->getMessage() . ')');
    $target = $back;
  }
  redirect($target);
}

$logged = is_logged_in($cfg);
$OLD = $_SESSION['old'] ?? null;
unset($_SESSION['old']);
$flashes = $_SESSION['flash'] ?? [];
unset($_SESSION['flash']);

// stažení zálohy / aktuálního obsahu (jen přihlášený)
if ($logged && isset($_GET['stahnout']) && is_string($_GET['stahnout'])) {
  $n = $_GET['stahnout'];
  $p = $n === 'aktualni' ? DATA_FILE : backup_path($n);
  if (!$p || !is_file($p)) { http_response_code(404); exit('Soubor nebyl nalezen.'); }
  header('Content-Type: application/json; charset=utf-8');
  header('Content-Disposition: attachment; filename="' . ($n === 'aktualni' ? 'obsah-' . date('Y-m-d-His') . '.json' : $n) . '"');
  readfile($p);
  exit;
}

/* =====================================================================
   ŠABLONY
   ===================================================================== */
function icon(string $id, string $cls = ''): string { return '<svg class="i ' . $cls . '" aria-hidden="true"><use href="#i-' . $id . '"/></svg>'; }
function csrf_field(string $action, string $back): string
{
  return '<input type="hidden" name="csrf" value="' . h($_SESSION['csrf']) . '"><input type="hidden" name="action" value="' . h($action) . '"><input type="hidden" name="back" value="' . h($back) . '">';
}
function flag(string $lang): string { return '<span class="flag flag--' . $lang . '" aria-hidden="true"></span>'; }

function page_start(string $title, string $nonce, string $bodyClass = ''): void
{ ?>
<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title><?= h($title) ?> · Administrace Golf Club Teplice</title>
<link rel="icon" href="assets/favicon.ico">
<link rel="stylesheet" href="assets/fonts/fonts.css">
<style>
:root{ --forest:#0f2e1f; --forest-2:#173f2b; --grass:#3a7d44; --grass-2:#4a9656; --cream:#f5f0e6; --cream-2:#ece5d6; --gold:#c9a961; --gold-2:#dcc287;
  --ink:#14231b; --muted:#5f6c63; --line:#e3dccb; --red:#b3412e; --radius:18px;
  --ff-display:'Baloo 2','Manrope',system-ui,sans-serif; --ff-sans:'Manrope',system-ui,-apple-system,'Segoe UI',sans-serif; }
*{ box-sizing:border-box; }
html{ -webkit-text-size-adjust:100%; }
body{ margin:0; font-family:var(--ff-sans); font-size:15px; line-height:1.55; color:var(--ink); background:var(--cream); font-synthesis:none; }
a{ color:var(--grass); }
img{ max-width:100%; }
.i{ width:18px; height:18px; flex:0 0 auto; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
h1, h2, h3{ font-family:var(--ff-display); line-height:1.15; color:var(--forest); }
.layout{ display:grid; grid-template-columns:252px minmax(0, 1fr); min-height:100vh; }
.side{ position:sticky; top:0; height:100vh; display:flex; flex-direction:column; gap:1.1rem; padding:1.3rem .9rem; background:var(--forest); color:var(--cream); overflow-y:auto; }
.brand{ display:flex; align-items:center; gap:.7rem; padding:0 .45rem 1rem; border-bottom:1px solid rgba(255,255,255,.1); color:inherit; text-decoration:none; }
.brand img{ width:48px; height:auto; }
.brand b{ display:block; font-family:var(--ff-display); font-size:1.12rem; line-height:1.1; }
.brand small{ font-size:.74rem; opacity:.6; }
.nav{ display:flex; flex-direction:column; gap:.12rem; }
.nav a, .side__foot a, .side__foot button{ display:flex; align-items:center; gap:.7rem; width:100%; padding:.6rem .8rem; border:0; border-radius:12px; background:none; font:inherit; font-weight:600; font-size:.92rem; color:rgba(245,240,230,.78); text-decoration:none; cursor:pointer; transition:background .2s, color .2s; }
.nav a:hover, .side__foot a:hover, .side__foot button:hover{ background:rgba(255,255,255,.07); color:var(--cream); }
.nav a.is-active{ background:rgba(201,169,97,.17); color:var(--gold-2); }
.nav .count{ margin-left:auto; min-width:1.6rem; padding:.02rem .45rem; border-radius:99px; font-size:.72rem; text-align:center; background:rgba(255,255,255,.1); }
.side__foot{ margin-top:auto; padding-top:.8rem; border-top:1px solid rgba(255,255,255,.1); }
.side__foot form{ margin:0; }
.main{ min-width:0; padding:2rem clamp(1rem, 3vw, 2.6rem) 4rem; }
.top{ display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:1rem; margin-bottom:1.5rem; }
.top h1{ margin:0; font-size:clamp(1.7rem, 3vw, 2.25rem); }
.top p{ margin:.25rem 0 0; color:var(--muted); max-width:62ch; }
.card{ padding:1.4rem; border:1px solid var(--line); border-radius:var(--radius); background:#fff; box-shadow:0 1px 2px rgba(15,46,31,.04); }
.card + .card, .card + form, form + .card, form + form{ margin-top:1.2rem; }
.grid-2 > .card, .grid-3 > .card{ margin-top:0; }
.card > h2{ margin:0 0 1rem; font-size:1.3rem; }
.card > h2 small{ font-family:var(--ff-sans); font-size:.8rem; font-weight:600; color:var(--muted); }
.btn{ display:inline-flex; align-items:center; justify-content:center; gap:.45rem; min-height:40px; padding:.5rem 1.05rem; border:1px solid transparent; border-radius:999px; font:inherit; font-size:.88rem; font-weight:700; line-height:1.2; text-decoration:none; white-space:nowrap; cursor:pointer; transition:background .2s, border-color .2s, color .2s, transform .15s; }
.btn:active{ transform:translateY(1px); }
.btn--primary{ background:var(--forest); color:var(--cream); }
.btn--primary:hover{ background:var(--grass); }
.btn--gold{ background:var(--gold); color:var(--forest); }
.btn--gold:hover{ background:var(--gold-2); }
.btn--ghost{ background:#fff; border-color:var(--line); color:var(--ink); }
.btn--ghost:hover{ border-color:var(--grass); color:var(--grass); }
.btn--danger{ background:#fff; border-color:#efd5ce; color:var(--red); }
.btn--danger:hover{ background:#fbeeea; border-color:var(--red); }
.btn--sm{ min-height:32px; padding:.3rem .75rem; font-size:.8rem; }
.btn--icon{ width:34px; min-height:34px; padding:0; }
.btn[disabled]{ opacity:.35; pointer-events:none; }
.flash{ display:flex; align-items:flex-start; gap:.6rem; margin-bottom:1rem; padding:.85rem 1.1rem; border-radius:14px; font-weight:600; }
.flash--ok{ background:#e7f2e5; border:1px solid #c6e0c3; color:#1f5a2b; }
.flash--err{ background:#fbeeea; border:1px solid #f0cfc6; color:#8a2f20; }
.flash .i{ margin-top:.15rem; }
.grid-2{ display:grid; gap:1.2rem; }
.grid-3{ display:grid; gap:1rem; }
@media (min-width:900px){ .grid-2{ grid-template-columns:1fr 1fr; } .grid-3{ grid-template-columns:repeat(3, 1fr); } }
.field{ display:flex; flex-direction:column; gap:.35rem; margin-bottom:1rem; }
.field:last-child{ margin-bottom:0; }
.field > label, .label{ font-size:.84rem; font-weight:700; color:var(--forest); }
.hint{ font-size:.78rem; color:var(--muted); }
input[type=text], input[type=date], input[type=number], input[type=email], input[type=url], input[type=password], input[type=tel], select, textarea{
  width:100%; padding:.6rem .8rem; border:1px solid #d9d1bf; border-radius:10px; background:#fffdf8; font:inherit; font-size:.95rem; color:var(--ink); transition:border-color .2s, box-shadow .2s; }
input:focus, select:focus, textarea:focus, .btn:focus-visible, a:focus-visible{ outline:none; border-color:var(--grass); box-shadow:0 0 0 3px rgba(58,125,68,.2); }
textarea{ min-height:240px; resize:vertical; line-height:1.55; }
textarea.short{ min-height:90px; }
input[type=file]{ max-width:100%; font:inherit; font-size:.86rem; }
input[type=file]::file-selector-button{ margin-right:.7rem; padding:.45rem .9rem; border:1px solid var(--line); border-radius:99px; background:var(--cream); font:inherit; font-weight:700; cursor:pointer; }
.check{ display:inline-flex; align-items:center; gap:.55rem; font-weight:600; cursor:pointer; }
.check input{ width:18px; height:18px; accent-color:var(--grass); }
.lang-head{ display:flex; align-items:center; gap:.5rem; margin:0 0 .9rem; font-family:var(--ff-sans); font-size:.78rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
.flag{ position:relative; display:inline-block; width:22px; height:15px; overflow:hidden; border-radius:3px; box-shadow:0 0 0 1px rgba(0,0,0,.08); }
.flag--cs{ background:linear-gradient(#fff 50%, #d7141a 50%); }
.flag--cs::before{ content:""; position:absolute; left:0; top:0; border-style:solid; border-width:7.5px 0 7.5px 11px; border-color:transparent transparent transparent #11457e; }
.flag--de{ background:linear-gradient(#000 33.3%, #dd0000 33.3% 66.6%, #ffce00 66.6%); }
.table-wrap{ overflow-x:auto; margin:0 -.4rem; }
.table{ width:100%; border-collapse:collapse; }
.table th{ padding:.5rem .6rem; border-bottom:1px solid var(--line); font-size:.72rem; letter-spacing:.06em; text-align:left; text-transform:uppercase; color:var(--muted); }
.table td{ padding:.65rem .6rem; border-bottom:1px solid var(--line); vertical-align:middle; }
.table tr:last-child td{ border-bottom:0; }
.table .title{ font-weight:700; color:var(--forest); }
.table .sub{ display:block; font-size:.8rem; color:var(--muted); }
.thumb{ display:block; width:76px; height:54px; object-fit:cover; border-radius:9px; background:var(--cream-2); }
.badge{ display:inline-flex; align-items:center; gap:.3rem; padding:.12rem .55rem; border-radius:99px; font-size:.72rem; font-weight:700; white-space:nowrap; background:var(--cream-2); color:var(--muted); }
.badge--ok{ background:#e7f2e5; color:#1f5a2b; }
.badge--off{ background:#f6ecd9; color:#86672a; }
.actions{ display:flex; flex-wrap:wrap; justify-content:flex-end; gap:.4rem; }
.tiles{ display:grid; gap:1rem; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); }
.tile{ display:flex; flex-direction:column; gap:.2rem; padding:1.25rem; border:1px solid var(--line); border-radius:var(--radius); background:#fff; color:var(--ink); text-decoration:none; transition:transform .2s, border-color .2s, box-shadow .2s; }
.tile:hover{ transform:translateY(-2px); border-color:var(--gold); box-shadow:0 14px 30px -20px rgba(15,46,31,.45); }
.tile__icon{ display:grid; place-items:center; width:44px; height:44px; margin-bottom:.55rem; border-radius:13px; background:var(--forest); color:var(--gold-2); }
.tile__icon .i{ width:22px; height:22px; }
.tile b{ font-family:var(--ff-display); font-size:1.25rem; color:var(--forest); }
.tile span{ font-size:.86rem; color:var(--muted); }
.tile em{ margin-top:auto; padding-top:.6rem; font-size:.82rem; font-style:normal; font-weight:700; color:var(--grass); }
.cards{ display:grid; gap:1rem; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); }
.item{ display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--line); border-radius:16px; background:#fff; }
.item__img{ display:block; width:100%; aspect-ratio:16 / 10; object-fit:cover; background:var(--cream-2); }
.item__img--logo{ object-fit:contain; padding:1.2rem; background:#f7f6f1; }
.item__body{ display:flex; flex-direction:column; gap:.5rem; padding:.85rem .9rem; }
.item__body input, .item__body select{ padding:.45rem .6rem; font-size:.86rem; }
.item__bar{ display:flex; align-items:center; gap:.3rem; margin-top:auto; padding:.55rem .8rem; border-top:1px solid var(--line); background:#fcfaf5; }
.item__bar .spacer{ flex:1; }
.item__pos{ font-size:.75rem; font-weight:700; color:var(--muted); }
.mini-lang{ display:flex; align-items:center; gap:.45rem; }
.mini-lang .flag{ flex:0 0 auto; }
.help{ padding:1rem 1.2rem; border:1px dashed #dccfae; border-radius:14px; background:#f9f5ea; font-size:.86rem; color:#4c4a40; }
.help p{ margin:.2rem 0; }
.help code{ padding:.05rem .35rem; border:1px solid var(--line); border-radius:5px; background:#fff; font-size:.82rem; }
.save-bar{ position:sticky; bottom:0; z-index:5; display:flex; flex-wrap:wrap; justify-content:flex-end; gap:.6rem; margin-top:1.2rem; padding:1rem 0 .4rem; background:linear-gradient(to top, var(--cream) 72%, rgba(245,240,230,0)); }
.photos{ display:flex; flex-wrap:wrap; gap:.8rem; }
.photo-pick img{ display:block; width:120px; height:86px; object-fit:cover; border-radius:10px; background:var(--cream-2); }
.photo-pick .check{ margin-top:.3rem; font-size:.78rem; }
.current{ display:flex; flex-wrap:wrap; align-items:center; gap:1rem; margin-bottom:.8rem; }
.current img{ width:160px; height:110px; object-fit:cover; border-radius:12px; }
.current .initials{ display:grid; place-items:center; width:110px; height:110px; border-radius:50%; background:var(--forest); color:var(--cream); font-family:var(--ff-display); font-size:2.2rem; font-weight:700; }
.price-table{ width:100%; border-collapse:collapse; }
.price-table th, .price-table td{ padding:.5rem .4rem; text-align:left; }
.price-table th{ font-size:.75rem; letter-spacing:.05em; text-transform:uppercase; color:var(--muted); }
.price-table td:first-child{ font-weight:700; color:var(--forest); white-space:nowrap; }
.price-table input{ max-width:150px; }
.empty{ padding:2rem; border:1px dashed var(--line); border-radius:14px; text-align:center; color:var(--muted); }
.muted{ color:var(--muted); }
.warn{ margin:0 0 1rem; padding:.85rem 1.1rem; border:1px solid #ecd9a8; border-radius:14px; background:#fbf3df; color:#6d5418; font-weight:600; }
.busy{ position:fixed; inset:0; z-index:100; display:none; place-items:center; background:rgba(15,46,31,.5); -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px); color:#fff; font-weight:700; text-align:center; }
.busy.is-on{ display:grid; }
.spinner{ width:44px; height:44px; margin:0 auto .8rem; border:3px solid rgba(255,255,255,.3); border-top-color:var(--gold); border-radius:50%; animation:spin .9s linear infinite; }
@keyframes spin{ to{ transform:rotate(360deg); } }
.auth{ display:grid; place-items:center; min-height:100vh; padding:1.5rem; background:radial-gradient(120% 90% at 50% 0%, #1f4f36, var(--forest) 70%); }
.auth__card{ width:min(410px, 100%); padding:2.2rem 2rem; border-radius:26px; background:var(--cream); box-shadow:0 30px 80px -30px rgba(0,0,0,.65); }
.auth__card > img{ display:block; width:92px; margin:0 auto .5rem; }
.auth__card h1{ margin:0 0 .2rem; font-size:1.65rem; text-align:center; }
.auth__card .sub{ margin:0 0 1.4rem; font-size:.9rem; text-align:center; color:var(--muted); }
.auth__card .btn{ width:100%; margin-top:.4rem; }
.auth__back{ display:block; margin-top:1.2rem; font-size:.85rem; text-align:center; color:var(--muted); }
@media (max-width:860px){
  .layout{ grid-template-columns:1fr; }
  .side{ z-index:20; flex-direction:row; align-items:center; gap:.4rem; height:auto; padding:.55rem .7rem; overflow-x:auto; overflow-y:hidden; scrollbar-width:none; }
  .side::-webkit-scrollbar{ display:none; }
  .brand{ flex:0 0 auto; padding:0 .3rem 0 0; border:0; }
  .brand img{ width:38px; }
  .brand span{ display:none; }
  .nav, .side__foot{ flex-direction:row; gap:.2rem; }
  .side__foot{ margin:0; padding:0 0 0 .3rem; border:0; border-left:1px solid rgba(255,255,255,.12); }
  .nav a, .side__foot a, .side__foot button{ width:auto; padding:.5rem .7rem; white-space:nowrap; }
  .nav .count, .side__foot .txt{ display:none; }
  .main{ padding:1.3rem 1rem 3rem; }
  .card{ padding:1.1rem; }
  .hide-m{ display:none; }
}
</style>
</head>
<body class="<?= h($bodyClass) ?>">
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-home" viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></symbol>
  <symbol id="i-news" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></symbol>
  <symbol id="i-tag" viewBox="0 0 24 24"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></symbol>
  <symbol id="i-slides" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 15l5-5 4 4 3-3 8 7"/></symbol>
  <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></symbol>
  <symbol id="i-trophy" viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></symbol>
  <symbol id="i-photo" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></symbol>
  <symbol id="i-history" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/></symbol>
  <symbol id="i-key" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L21 2M16 7l3 3M18.5 4.5l2 2"/></symbol>
  <symbol id="i-logout" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></symbol>
  <symbol id="i-external" viewBox="0 0 24 24"><path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-up" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></symbol>
  <symbol id="i-down" viewBox="0 0 24 24"><path d="M12 5v14M19 12l-7 7-7-7"/></symbol>
  <symbol id="i-top" viewBox="0 0 24 24"><path d="M5 4h14M12 20V9M6 14l6-6 6 6"/></symbol>
  <symbol id="i-trash" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></symbol>
  <symbol id="i-edit" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></symbol>
  <symbol id="i-alert" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></symbol>
  <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></symbol>
  <symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 21V9M7 14l5-5 5 5M5 3h14"/></symbol>
  <symbol id="i-file" viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></symbol>
  <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
  <symbol id="i-eye-off" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></symbol>
</svg>
<?php }

function page_end(string $nonce): void
{ ?>
<div class="busy" id="busy" role="status" aria-live="polite"><div><div class="spinner"></div>Ukládám…<br><small style="font-weight:500;opacity:.8">U větších fotek to může chvíli trvat.</small></div></div>
<script nonce="<?= h($nonce) ?>">
(() => {
  const busy = document.getElementById('busy');
  // potvrzení před smazáním apod.
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-confirm]');
    if (b && !window.confirm(b.dataset.confirm)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  // velké fotky se před odesláním zmenší přímo v prohlížeči (rychlejší nahrávání, nevadí limit serveru)
  const MAX_SIDE = 2400, QUALITY = 0.88;
  async function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.5e6) return file;
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { bmp = await createImageBitmap(file); }
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  }
  document.querySelectorAll('form').forEach(form => form.addEventListener('submit', async e => {
    const upload = form.enctype === 'multipart/form-data' && [...form.querySelectorAll('input[type=file]')].some(i => i.files && i.files.length);
    if (form.dataset.ready === '1') { if (upload) busy.classList.add('is-on'); return; }
    const inputs = [...form.querySelectorAll('input[type=file][data-resize]')].filter(i => i.files && i.files.length);
    if (!inputs.length || typeof DataTransfer === 'undefined' || !window.createImageBitmap) { if (upload) busy.classList.add('is-on'); return; }
    e.preventDefault();
    busy.classList.add('is-on');
    const submitter = e.submitter;
    for (const input of inputs) {
      try {
        const dt = new DataTransfer();
        for (const f of input.files) dt.items.add(await shrink(f).catch(() => f));
        input.files = dt.files;
      } catch { /* nahrají se originály */ }
    }
    form.dataset.ready = '1';
    if (form.requestSubmit) form.requestSubmit(submitter && submitter.form === form ? submitter : undefined);
    else form.submit();
  }));
  window.addEventListener('pageshow', () => busy.classList.remove('is-on'));
  // automatické skrytí potvrzení po uložení
  setTimeout(() => document.querySelectorAll('.flash--ok').forEach(f => { f.style.transition = 'opacity .5s'; f.style.opacity = '0'; setTimeout(() => f.remove(), 500); }), 6000);
})();
</script>
</body>
</html>
<?php }

function render_flashes(array $flashes): void
{
  foreach ($flashes as [$type, $msg]) {
    echo '<div class="flash flash--' . ($type === 'ok' ? 'ok' : 'err') . '" role="' . ($type === 'ok' ? 'status' : 'alert') . '">'
      . icon($type === 'ok' ? 'check' : 'alert') . '<span>' . h($msg) . '</span></div>';
  }
}

function render_auth(string $mode, array $flashes, string $nonce): void
{
  page_start($mode === 'setup' ? 'Nastavení' : 'Přihlášení', $nonce, 'auth'); ?>
<main class="auth__card">
  <img src="assets/logo.png" alt="Golf Club Teplice">
  <h1><?= $mode === 'setup' ? 'Nastavení administrace' : 'Administrace webu' ?></h1>
  <p class="sub"><?= $mode === 'setup' ? 'První spuštění – zvolte přihlašovací jméno a heslo.' : 'Golf Club Teplice · přihlaste se prosím' ?></p>
  <?php render_flashes($flashes); ?>
  <?php if ($mode === 'setup' && !is_writable(DATA_DIR)): ?>
    <p class="warn">Složka data/ nemá právo zápisu – nastavte ho na hostingu (např. 755 nebo 775), jinak nepůjde heslo uložit.</p>
  <?php endif; ?>
  <form method="post" action="admin.php" autocomplete="on">
    <?= csrf_field($mode === 'setup' ? 'setup' : 'login', 's=prehled') ?>
    <div class="field">
      <label for="user">Přihlašovací jméno</label>
      <input type="text" id="user" name="user" required autocomplete="username" autocapitalize="none" spellcheck="false" value="<?= h(ov('user')) ?>" <?= $mode === 'setup' ? 'minlength="3" maxlength="40"' : '' ?> autofocus>
    </div>
    <?php if ($mode === 'setup'): ?>
      <div class="field">
        <label for="p1">Heslo</label>
        <input type="password" id="p1" name="p1" required minlength="10" autocomplete="new-password">
        <span class="hint">Aspoň 10 znaků. Nejlépe několik slov nebo kombinace písmen a čísel.</span>
      </div>
      <div class="field">
        <label for="p2">Heslo znovu</label>
        <input type="password" id="p2" name="p2" required minlength="10" autocomplete="new-password">
      </div>
      <button class="btn btn--primary" type="submit"><?= icon('check') ?> Uložit a vstoupit</button>
    <?php else: ?>
      <div class="field">
        <label for="pass">Heslo</label>
        <input type="password" id="pass" name="pass" required autocomplete="current-password">
      </div>
      <button class="btn btn--primary" type="submit"><?= icon('key') ?> Přihlásit se</button>
    <?php endif; ?>
  </form>
  <a class="auth__back" href="./">← Zpět na web</a>
</main>
<?php page_end($nonce);
}

/* ---------- Jednotlivé sekce ---------- */
function view_prehled(array $d): void
{
  $active = count(array_filter($d['coaches'], function ($c) { return !empty($c['active']); }));
  $lastNews = $d['news'][0]['date'] ?? '';
  $p = $d['prices'];
  $backups = backup_list();
  $tiles = [
    ['aktuality', 'news', 'Aktuality', plural(count($d['news']), 'článek', 'články', 'článků') . ($lastNews ? ' · poslední ' . fmt_date($lastNews) : ''), 'Přidat nebo upravit'],
    ['cenik', 'tag', 'Ceník', 'Sezóna ' . $p['season'] . ' · dospělý ' . fmt_price($p['membership']['adult'][1] ?? 0), 'Upravit ceny a PDF'],
    ['slider', 'slides', 'Slider', plural(count($d['slider']), 'fotka', 'fotky', 'fotek') . ' v úvodu webu', 'Fotky a popisky'],
    ['treneri', 'user', 'Trenéři', $active . ' aktivní z ' . count($d['coaches']), 'Kontakty a fotky'],
    ['turnaje', 'trophy', 'Turnaje', plural(count($d['tournaments']['list']), 'turnaj', 'turnaje', 'turnajů') . ' · ' . (!empty($d['tournaments']['published']) ? 'zveřejněno' : 'skryto'), 'Kalendář turnajů'],
    ['galerie', 'photo', 'Fotogalerie', plural(count($d['gallery']), 'fotka', 'fotky', 'fotek'), 'Nahrát fotky'],
    ['partneri', 'star', 'Partneři', plural(count($d['partners']), 'partner', 'partneři', 'partnerů'), 'Loga a odkazy'],
    ['zalohy', 'history', 'Zálohy', plural(count($backups), 'záloha', 'zálohy', 'záloh') . ($backups ? ' · poslední ' . mb_substr($backups[0]['time'], 0, -3) : ''), 'Obnovit starší stav'],
  ];
  $problems = [];
  if (!gd_ready()) $problems[] = 'Na hostingu chybí rozšíření PHP GD – nepůjde nahrávat fotky.';
  if (!is_writable(DATA_DIR)) $problems[] = 'Složka data/ nemá právo zápisu – změny nepůjde uložit.';
  if (is_dir(UPLOAD_DIR) && !is_writable(UPLOAD_DIR)) $problems[] = 'Složka uploads/ nemá právo zápisu – nepůjde nahrávat soubory.';
  if (!is_dir(UPLOAD_DIR) && !is_writable(__DIR__)) $problems[] = 'Nelze vytvořit složku uploads/ – vytvořte ji na hostingu a povolte zápis.';
  ?>
  <div class="top">
    <div>
      <h1>Dobrý den 👋</h1>
      <p>Tady upravíte obsah webu Golf Club Teplice. Změny se na webu projeví hned po uložení<?= $d['updated'] ? ' · poslední změna ' . h(date('j. n. Y H:i', strtotime((string)$d['updated']) ?: time())) : '' ?>.</p>
    </div>
    <div class="actions">
      <a class="btn btn--gold" href="admin.php?s=aktuality&amp;new=1"><?= icon('plus') ?> Nová aktualita</a>
      <a class="btn btn--ghost" href="./" target="_blank" rel="noopener"><?= icon('external') ?> Zobrazit web</a>
    </div>
  </div>
  <?php foreach ($problems as $pr): ?><p class="warn"><?= h($pr) ?></p><?php endforeach; ?>
  <div class="tiles">
    <?php foreach ($tiles as [$s, $ic, $title, $info, $cta]): ?>
      <a class="tile" href="admin.php?s=<?= h($s) ?>">
        <span class="tile__icon"><?= icon($ic) ?></span>
        <b><?= h($title) ?></b>
        <span><?= h($info) ?></span>
        <em><?= h($cta) ?> →</em>
      </a>
    <?php endforeach; ?>
  </div>
  <div class="card" style="margin-top:1.4rem">
    <h2>Dobré vědět</h2>
    <div class="help">
      <p>• Každý text má českou a německou verzi. Když německou nevyplníte, zobrazí se na německé verzi webu česky.</p>
      <p>• Před každou změnou se automaticky uloží záloha – v sekci <a href="admin.php?s=zalohy">Zálohy</a> se dá vrátit předchozí stav.</p>
      <p>• Fotky z mobilu můžete nahrávat rovnou, administrace je sama zmenší a připraví náhledy.</p>
      <p>• Texty sekcí O nás, Hřiště, Tréninky a Kontakty jsou pevnou součástí webu – jejich změnu zajistí správce webu.</p>
    </div>
  </div>
  <?php
}

function view_aktuality(array $d): void
{
  $edit = isset($_GET['edit']) && is_string($_GET['edit']) ? $_GET['edit'] : '';
  $isNew = isset($_GET['new']);
  if ($edit !== '' || $isNew) {
    $i = $edit !== '' ? find_index($d['news'], $edit) : null;
    if ($edit !== '' && $i === null) { echo '<p class="warn">Aktualita nebyla nalezena.</p>'; return; }
    view_news_form($i === null ? null : $d['news'][$i]);
    return;
  }
  ?>
  <div class="top">
    <div><h1>Aktuality</h1><p>Nejnovější aktualita je na webu první a velká. Na webu je vidět prvních 5, další po kliknutí na „Zobrazit starší“.</p></div>
    <div class="actions"><a class="btn btn--gold" href="admin.php?s=aktuality&amp;new=1"><?= icon('plus') ?> Přidat aktualitu</a></div>
  </div>
  <form class="card" method="post" action="admin.php?s=aktuality">
    <?= csrf_field('news_list', 's=aktuality') ?>
    <?php if (!$d['news']): ?>
      <p class="empty">Zatím žádné aktuality.</p>
    <?php else: ?>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Fotka</th><th>Datum</th><th>Nadpis</th><th class="hide-m">Štítek</th><th class="hide-m">Němčina</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($d['news'] as $k => $n): ?>
        <tr>
          <td><img class="thumb" src="<?= h(thumb_src((string)($n['img'] ?? ''))) ?>" alt="" loading="lazy"></td>
          <td><?= h(fmt_date((string)$n['date'])) ?><?php if ($k === 0): ?><span class="sub">hlavní</span><?php endif; ?></td>
          <td><a class="title" href="admin.php?s=aktuality&amp;edit=<?= h($n['id']) ?>"><?= h($n['title'] ?? '') ?></a><span class="sub"><?= h(mb_strimwidth((string)($n['excerpt'] ?? ''), 0, 90, '…')) ?></span></td>
          <td class="hide-m"><span class="badge"><?= h($n['tag'] ?? '') ?></span></td>
          <td class="hide-m"><?= !empty($n['de']['title']) ? '<span class="badge badge--ok">' . icon('check') . ' ano</span>' : '<span class="badge badge--off">chybí</span>' ?></td>
          <td><div class="actions">
            <a class="btn btn--ghost btn--sm" href="admin.php?s=aktuality&amp;edit=<?= h($n['id']) ?>"><?= icon('edit') ?> Upravit</a>
            <button class="btn btn--danger btn--sm btn--icon" type="submit" name="op" value="delete:<?= h($n['id']) ?>" title="Smazat" aria-label="Smazat aktualitu" data-confirm="Opravdu smazat aktualitu „<?= h($n['title'] ?? '') ?>“?"><?= icon('trash') ?></button>
          </div></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table></div>
    <?php endif; ?>
  </form>
  <?php
}

function view_news_form(?array $n): void
{
  $n = $n ?? ['id' => '', 'date' => date('Y-m-d'), 'img' => '', 'gallery' => []];
  $de = is_array($n['de'] ?? null) ? $n['de'] : [];
  $cta = is_array($n['cta'] ?? null) ? $n['cta'] : [];
  $img = (string)($n['img'] ?? '');
  $others = array_values(array_filter((array)($n['gallery'] ?? []), function ($f) use ($img) { return is_string($f) && $f !== $img; }));
  $back = $n['id'] !== '' ? 's=aktuality&edit=' . $n['id'] : 's=aktuality&new=1';
  ?>
  <div class="top">
    <div><h1><?= $n['id'] !== '' ? 'Upravit aktualitu' : 'Nová aktualita' ?></h1><p>Vyplňte češtinu, němčinu doplňte, pokud ji máte. Povinné je jen datum a nadpis.</p></div>
    <div class="actions"><a class="btn btn--ghost" href="admin.php?s=aktuality">← Zpět na seznam</a></div>
  </div>
  <form method="post" action="admin.php?s=aktuality" enctype="multipart/form-data">
    <?= csrf_field('news_save', $back) ?>
    <input type="hidden" name="id" value="<?= h($n['id']) ?>">
    <div class="card">
      <div class="grid-3">
        <div class="field"><label for="date">Datum</label><input type="date" id="date" name="date" required value="<?= h(ov('date', $n['date'] ?? '')) ?>"></div>
        <div class="field"><label for="tag">Štítek <?= flag('cs') ?></label><input type="text" id="tag" name="tag" maxlength="40" placeholder="např. Sezóna, Klub, Hřiště" value="<?= h(ov('tag', $n['tag'] ?? '')) ?>"></div>
        <div class="field"><label for="tag_de">Štítek <?= flag('de') ?></label><input type="text" id="tag_de" name="tag_de" maxlength="40" placeholder="z. B. Saison, Club, Platz" value="<?= h(ov('tag_de', $de['tag'] ?? '')) ?>"></div>
      </div>
    </div>
    <div class="grid-2" style="margin-top:1.2rem">
      <div class="card">
        <p class="lang-head"><?= flag('cs') ?> Česky</p>
        <div class="field"><label for="title">Nadpis</label><input type="text" id="title" name="title" required maxlength="200" value="<?= h(ov('title', $n['title'] ?? '')) ?>"></div>
        <div class="field"><label for="excerpt">Krátký text na kartičku</label><textarea class="short" id="excerpt" name="excerpt" maxlength="400" placeholder="Když necháte prázdné, vezme se začátek článku."><?= h(ov('excerpt', $n['excerpt'] ?? '')) ?></textarea></div>
        <div class="field"><label for="body">Text článku</label><textarea id="body" name="body" maxlength="20000"><?= h(ov('body', $n['body'] ?? '')) ?></textarea></div>
      </div>
      <div class="card">
        <p class="lang-head"><?= flag('de') ?> Deutsch</p>
        <div class="field"><label for="title_de">Titel</label><input type="text" id="title_de" name="title_de" maxlength="200" value="<?= h(ov('title_de', $de['title'] ?? '')) ?>"></div>
        <div class="field"><label for="excerpt_de">Kurztext</label><textarea class="short" id="excerpt_de" name="excerpt_de" maxlength="400"><?= h(ov('excerpt_de', $de['excerpt'] ?? '')) ?></textarea></div>
        <div class="field"><label for="body_de">Text</label><textarea id="body_de" name="body_de" maxlength="20000"><?= h(ov('body_de', $de['body'] ?? '')) ?></textarea></div>
      </div>
    </div>
    <div class="help" style="margin-top:1.2rem">
      <p><b>Jak psát text článku:</b> prázdný řádek = nový odstavec · <code>**slovo**</code> = <b>tučně</b> · odkazy <code>https://…</code> a telefony <code>+420 777 123 456</code> se na webu samy proklikají.</p>
      <p>Řádky začínající pomlčkou udělají přehlednou tabulku, např. <code>- Dospělý: 7 500 Kč</code></p>
    </div>
    <div class="card" style="margin-top:1.2rem">
      <h2>Fotky</h2>
      <div class="grid-2">
        <div class="field">
          <span class="label">Hlavní fotka</span>
          <div class="current"><img src="<?= h(thumb_src($img)) ?>" alt=""><?php if ($img === ''): ?><span class="hint">Bez vlastní fotky se použije výchozí fotka hřiště.</span><?php endif; ?></div>
          <input type="file" name="img" accept="image/jpeg,image/png,image/webp" data-resize>
          <span class="hint">Nahráním nové fotky se ta současná nahradí.</span>
        </div>
        <div class="field">
          <span class="label">Další fotky v článku</span>
          <?php if ($others): ?>
            <div class="photos" style="margin-bottom:.8rem">
              <?php foreach ($others as $f): ?>
                <div class="photo-pick"><img src="<?= h(thumb_src($f)) ?>" alt=""><label class="check"><input type="checkbox" name="remove_photos[]" value="<?= h($f) ?>"> odebrat</label></div>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>
          <input type="file" name="photos[]" accept="image/jpeg,image/png,image/webp" multiple data-resize>
          <span class="hint">Můžete vybrat víc fotek najednou. V článku se zobrazí jako náhledy pod hlavní fotkou.</span>
        </div>
      </div>
    </div>
    <div class="card">
      <h2>Tlačítko v článku <small>(nepovinné)</small></h2>
      <div class="grid-3">
        <div class="field"><label for="cta_label">Text tlačítka <?= flag('cs') ?></label><input type="text" id="cta_label" name="cta_label" maxlength="80" placeholder="např. Rezervovat on-line" value="<?= h(ov('cta_label', $cta['label'] ?? '')) ?>"></div>
        <div class="field"><label for="cta_label_de">Text tlačítka <?= flag('de') ?></label><input type="text" id="cta_label_de" name="cta_label_de" maxlength="80" value="<?= h(ov('cta_label_de', $de['ctaLabel'] ?? '')) ?>"></div>
        <div class="field"><label for="cta_href">Odkaz</label><input type="text" id="cta_href" name="cta_href" maxlength="500" placeholder="https://…, tel:+420…, #cenik" value="<?= h(ov('cta_href', $cta['href'] ?? '')) ?>"><span class="hint">Sekce webu: #cenik, #hriste, #treninky, #turnaje, #kontakty</span></div>
      </div>
    </div>
    <div class="save-bar">
      <a class="btn btn--ghost" href="admin.php?s=aktuality">Zrušit</a>
      <button class="btn btn--primary" type="submit"><?= icon('check') ?> <?= $n['id'] !== '' ? 'Uložit změny' : 'Přidat na web' ?></button>
    </div>
  </form>
  <?php
}

function view_cenik(array $d): void
{
  $p = $d['prices'];
  $m = $p['membership'];
  $gf = $p['greenFee'];
  $num = function (string $name, $val) { return '<input type="number" name="' . h($name) . '" min="0" step="1" inputmode="numeric" value="' . h(ov($name, (string)(int)$val)) . '">'; };
  ?>
  <div class="top">
    <div><h1>Ceník</h1><p>Ceny se na webu zobrazí v sekci Ceník (v němčině automaticky v CZK). Text aktuality „Poplatky na rok…“ se nemění automaticky – upravte ho v Aktualitách.</p></div>
    <div class="actions"><a class="btn btn--ghost" href="./#cenik" target="_blank" rel="noopener"><?= icon('external') ?> Ceník na webu</a></div>
  </div>
  <form method="post" action="admin.php?s=cenik" enctype="multipart/form-data">
    <?= csrf_field('prices_save', 's=cenik') ?>
    <div class="card">
      <h2>Sezóna a termín</h2>
      <div class="grid-2">
        <div class="field"><label for="season">Ceník pro sezónu (rok)</label><input type="text" id="season" name="season" inputmode="numeric" maxlength="4" pattern="\d{4}" required value="<?= h(ov('season', (string)$p['season'])) ?>"></div>
        <div class="field"><label for="deadline">Zvýhodněná platba do</label><input type="date" id="deadline" name="deadline" required value="<?= h(ov('deadline', (string)$p['deadline'])) ?>"><span class="hint">Do tohoto dne platí nižší ceny členství, potom vyšší.</span></div>
      </div>
    </div>
    <div class="card">
      <h2>Roční členství <small>(Kč)</small></h2>
      <div class="table-wrap"><table class="price-table">
        <thead><tr><th></th><th>Placeno do termínu</th><th>Placeno po termínu</th></tr></thead>
        <tbody>
          <tr><td>Dospělý</td><td><?= $num('adult_early', $m['adult'][0] ?? 0) ?></td><td><?= $num('adult_late', $m['adult'][1] ?? 0) ?></td></tr>
          <tr><td>Junior <span class="muted">(do 18 let)</span></td><td><?= $num('junior_early', $m['junior'][0] ?? 0) ?></td><td><?= $num('junior_late', $m['junior'][1] ?? 0) ?></td></tr>
          <tr><td>Senior <span class="muted">(nad 65 let)</span></td><td><?= $num('senior_early', $m['senior'][0] ?? 0) ?></td><td><?= $num('senior_late', $m['senior'][1] ?? 0) ?></td></tr>
        </tbody>
      </table></div>
    </div>
    <div class="grid-2" style="margin-top:1.2rem">
      <div class="card">
        <h2>Green fee <small>(Kč)</small></h2>
        <div class="table-wrap"><table class="price-table">
          <thead><tr><th></th><th>Denní fee</th><th>Sleva 30 %</th></tr></thead>
          <tbody>
            <tr><td>9 jamek</td><td><?= $num('gf_d9', $gf['d9'] ?? 0) ?></td><td><?= $num('gf_s9', $gf['s9'] ?? 0) ?></td></tr>
            <tr><td>18 jamek</td><td><?= $num('gf_d18', $gf['d18'] ?? 0) ?></td><td><?= $num('gf_s18', $gf['s18'] ?? 0) ?></td></tr>
          </tbody>
        </table></div>
      </div>
      <div class="card">
        <h2>Další poplatky <small>(Kč)</small></h2>
        <div class="field"><label>Vstupní poplatek nového člena</label><?= $num('entry', $p['entryFee']) ?></div>
        <div class="field"><label>Buggy golf cart (za hru)</label><?= $num('buggy', $p['buggy']) ?></div>
      </div>
    </div>
    <div class="card" style="margin-top:1.2rem">
      <h2>Ceník v PDF <small>(tlačítko „Stáhnout kompletní ceník“)</small></h2>
      <div class="grid-2">
        <?php foreach (['cs' => ['pdfCs', 'Česky', 'pdf_cs'], 'de' => ['pdfDe', 'Německy (Preisliste)', 'pdf_de']] as $lang => [$key, $label, $field]): ?>
          <div class="field">
            <span class="label"><?= flag($lang) ?> <?= h($label) ?></span>
            <?php if (!empty($p[$key])): ?>
              <a class="btn btn--ghost btn--sm" style="align-self:flex-start" href="<?= h($p[$key]) ?>" target="_blank" rel="noopener"><?= icon('file') ?> <?= h(basename((string)$p[$key])) ?></a>
            <?php else: ?><span class="hint">Zatím nenahráno.</span><?php endif; ?>
            <input type="file" name="<?= h($field) ?>" accept="application/pdf,.pdf">
            <span class="hint">Nahráním nového PDF se na webu nahradí to současné.</span>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
    <div class="save-bar"><button class="btn btn--primary" type="submit"><?= icon('check') ?> Uložit ceník</button></div>
  </form>
  <?php
}

function item_bar(string $id, int $k, int $count, bool $top = false, string $confirm = 'Opravdu smazat?'): string
{
  $html = '<div class="item__bar"><span class="item__pos">' . ($k + 1) . '.</span>';
  if ($top) $html .= '<button class="btn btn--ghost btn--icon btn--sm" type="submit" name="op" value="top:' . h($id) . '" title="Na začátek" aria-label="Přesunout na začátek"' . ($k === 0 ? ' disabled' : '') . '>' . icon('top') . '</button>';
  $html .= '<button class="btn btn--ghost btn--icon btn--sm" type="submit" name="op" value="up:' . h($id) . '" title="Posunout dopředu" aria-label="Posunout dopředu"' . ($k === 0 ? ' disabled' : '') . '>' . icon('up') . '</button>'
    . '<button class="btn btn--ghost btn--icon btn--sm" type="submit" name="op" value="down:' . h($id) . '" title="Posunout dozadu" aria-label="Posunout dozadu"' . ($k === $count - 1 ? ' disabled' : '') . '>' . icon('down') . '</button>'
    . '<span class="spacer"></span>'
    . '<button class="btn btn--danger btn--icon btn--sm" type="submit" name="op" value="delete:' . h($id) . '" title="Smazat" aria-label="Smazat" data-confirm="' . h($confirm) . '">' . icon('trash') . '</button></div>';
  return $html;
}

function view_slider(array $d): void
{
  $n = count($d['slider']);
  ?>
  <div class="top">
    <div><h1>Slider</h1><p>Velké fotky v úvodu webu, které se samy střídají. Nejlépe fungují fotky na šířku (aspoň 1920 px). První fotka se ukáže hned při otevření webu.</p></div>
  </div>
  <form method="post" action="admin.php?s=slider" enctype="multipart/form-data" class="card">
    <?= csrf_field('slides_add', 's=slider') ?>
    <h2>Přidat fotku do slideru</h2>
    <div class="grid-3">
      <div class="field"><label for="slides">Fotka</label><input type="file" id="slides" name="slides[]" accept="image/jpeg,image/png,image/webp" multiple required data-resize></div>
      <div class="field"><label for="t">Popisek <?= flag('cs') ?></label><input type="text" id="t" name="t" maxlength="120" placeholder="např. Green s výhledem do kraje" value="<?= h(ov('t')) ?>"></div>
      <div class="field"><label for="tDe">Popisek <?= flag('de') ?></label><input type="text" id="tDe" name="tDe" maxlength="120" value="<?= h(ov('tDe')) ?>"></div>
    </div>
    <button class="btn btn--gold" type="submit"><?= icon('upload') ?> Nahrát do slideru</button>
  </form>
  <form method="post" action="admin.php?s=slider">
    <?= csrf_field('slides_list', 's=slider') ?>
    <div class="cards" style="margin-top:1.2rem">
      <?php foreach ($d['slider'] as $k => $s): ?>
        <div class="item">
          <img class="item__img" src="<?= h(thumb_src((string)$s['f'])) ?>" alt="" loading="lazy">
          <div class="item__body">
            <label class="mini-lang"><?= flag('cs') ?><input type="text" name="cap[<?= h($s['id']) ?>]" maxlength="120" value="<?= h($s['t'] ?? '') ?>" aria-label="Popisek česky" placeholder="Popisek"></label>
            <label class="mini-lang"><?= flag('de') ?><input type="text" name="capde[<?= h($s['id']) ?>]" maxlength="120" value="<?= h($s['tDe'] ?? '') ?>" aria-label="Popisek německy" placeholder="Bildunterschrift"></label>
          </div>
          <?= item_bar((string)$s['id'], $k, $n, false, 'Opravdu odebrat tuto fotku ze slideru?') ?>
        </div>
      <?php endforeach; ?>
    </div>
    <div class="save-bar"><button class="btn btn--primary" type="submit" name="op" value="save"><?= icon('check') ?> Uložit popisky</button></div>
  </form>
  <?php
}

function initials(string $name): string
{
  $name = trim((string)preg_replace('/\b(Ing|Mgr|Bc|MUDr|JUDr|PhDr|RNDr|Dr|Ph\.D)\.?/u', '', $name));
  $out = '';
  foreach (preg_split('/\s+/u', $name) ?: [] as $w) if ($w !== '') $out .= mb_substr($w, 0, 1);
  return mb_strtoupper(mb_substr($out, 0, 2));
}

function view_treneri(array $d): void
{
  $edit = isset($_GET['edit']) && is_string($_GET['edit']) ? $_GET['edit'] : '';
  if ($edit !== '' || isset($_GET['new'])) {
    $i = $edit !== '' ? find_index($d['coaches'], $edit) : null;
    if ($edit !== '' && $i === null) { echo '<p class="warn">Trenér nebyl nalezen.</p>'; return; }
    view_coach_form($i === null ? null : $d['coaches'][$i]);
    return;
  }
  $n = count($d['coaches']);
  ?>
  <div class="top">
    <div><h1>Trenéři</h1><p>Na webu jsou v sekci Tréninky. Neaktivní trenér se na webu nezobrazí, ale zůstane uložený.</p></div>
    <div class="actions"><a class="btn btn--gold" href="admin.php?s=treneri&amp;new=1"><?= icon('plus') ?> Přidat trenéra</a></div>
  </div>
  <form method="post" action="admin.php?s=treneri" class="card">
    <?= csrf_field('coaches_list', 's=treneri') ?>
    <?php if (!$n): ?><p class="empty">Zatím žádní trenéři.</p><?php else: ?>
    <div class="table-wrap"><table class="table">
      <thead><tr><th></th><th>Jméno</th><th class="hide-m">Kontakt</th><th>Na webu</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($d['coaches'] as $k => $c): ?>
        <tr>
          <td><?php if (!empty($c['photo'])): ?><img class="thumb" style="width:54px;border-radius:50%" src="<?= h(thumb_src((string)$c['photo'])) ?>" alt=""><?php else: ?><span class="thumb" style="width:54px;border-radius:50%;display:grid;place-items:center;background:var(--forest);color:var(--cream);font-weight:800"><?= h(initials((string)$c['name'])) ?></span><?php endif; ?></td>
          <td><a class="title" href="admin.php?s=treneri&amp;edit=<?= h($c['id']) ?>"><?= h($c['name']) ?></a><span class="sub"><?= h($c['role'] ?? '') ?></span></td>
          <td class="hide-m"><?= h($c['phone'] ?? '') ?><span class="sub"><?= h($c['email'] ?? '') ?></span></td>
          <td>
            <button class="btn btn--sm <?= !empty($c['active']) ? 'btn--ghost' : 'btn--danger' ?>" type="submit" name="op" value="toggle:<?= h($c['id']) ?>" title="Přepnout zobrazení na webu">
              <?= !empty($c['active']) ? icon('eye') . ' aktivní' : icon('eye-off') . ' skrytý' ?>
            </button>
          </td>
          <td><div class="actions">
            <button class="btn btn--ghost btn--icon btn--sm" type="submit" name="op" value="up:<?= h($c['id']) ?>" aria-label="Posunout nahoru"<?= $k === 0 ? ' disabled' : '' ?>><?= icon('up') ?></button>
            <button class="btn btn--ghost btn--icon btn--sm" type="submit" name="op" value="down:<?= h($c['id']) ?>" aria-label="Posunout dolů"<?= $k === $n - 1 ? ' disabled' : '' ?>><?= icon('down') ?></button>
            <a class="btn btn--ghost btn--sm" href="admin.php?s=treneri&amp;edit=<?= h($c['id']) ?>"><?= icon('edit') ?> Upravit</a>
            <button class="btn btn--danger btn--icon btn--sm" type="submit" name="op" value="delete:<?= h($c['id']) ?>" aria-label="Smazat" data-confirm="Opravdu smazat trenéra <?= h($c['name']) ?>?"><?= icon('trash') ?></button>
          </div></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table></div>
    <?php endif; ?>
  </form>
  <?php
}

function view_coach_form(?array $c): void
{
  $c = $c ?? ['id' => '', 'active' => true, 'photo' => ''];
  $de = is_array($c['de'] ?? null) ? $c['de'] : [];
  $back = $c['id'] !== '' ? 's=treneri&edit=' . $c['id'] : 's=treneri&new=1';
  ?>
  <div class="top">
    <div><h1><?= $c['id'] !== '' ? 'Upravit trenéra' : 'Nový trenér' ?></h1></div>
    <div class="actions"><a class="btn btn--ghost" href="admin.php?s=treneri">← Zpět na seznam</a></div>
  </div>
  <form method="post" action="admin.php?s=treneri" enctype="multipart/form-data">
    <?= csrf_field('coach_save', $back) ?>
    <input type="hidden" name="id" value="<?= h($c['id']) ?>">
    <div class="card">
      <div class="grid-3">
        <div class="field"><label for="name">Jméno a titul</label><input type="text" id="name" name="name" required maxlength="80" value="<?= h(ov('name', $c['name'] ?? '')) ?>"></div>
        <div class="field"><label for="phone">Telefon</label><input type="tel" id="phone" name="phone" maxlength="30" placeholder="+420 777 820 971" value="<?= h(ov('phone', $c['phone'] ?? '')) ?>"></div>
        <div class="field"><label for="email">E-mail</label><input type="email" id="email" name="email" maxlength="120" value="<?= h(ov('email', $c['email'] ?? '')) ?>"></div>
      </div>
      <label class="check"><input type="checkbox" name="active" value="1" <?= oc('active', !empty($c['active'])) ? 'checked' : '' ?>> Zobrazit na webu (aktivní)</label>
    </div>
    <div class="grid-2" style="margin-top:1.2rem">
      <div class="card">
        <p class="lang-head"><?= flag('cs') ?> Česky</p>
        <div class="field"><label for="role">Popis</label><input type="text" id="role" name="role" maxlength="300" placeholder="např. Vedení kurzů, zelené karty a tréninky…" value="<?= h(ov('role', $c['role'] ?? '')) ?>"></div>
        <div class="field"><label for="tags">Zaměření (štítky)</label><input type="text" id="tags" name="tags" maxlength="200" placeholder="Kurzy, Zelené karty, Tréninky" value="<?= h(ov('tags', $c['tags'] ?? '')) ?>"><span class="hint">Oddělte čárkou.</span></div>
      </div>
      <div class="card">
        <p class="lang-head"><?= flag('de') ?> Deutsch</p>
        <div class="field"><label for="role_de">Beschreibung</label><input type="text" id="role_de" name="role_de" maxlength="300" value="<?= h(ov('role_de', $de['role'] ?? '')) ?>"></div>
        <div class="field"><label for="tags_de">Schwerpunkte</label><input type="text" id="tags_de" name="tags_de" maxlength="200" placeholder="Kurse, Platzreife, Training" value="<?= h(ov('tags_de', $de['tags'] ?? '')) ?>"></div>
      </div>
    </div>
    <div class="card" style="margin-top:1.2rem">
      <h2>Fotka</h2>
      <div class="current">
        <?php if (!empty($c['photo'])): ?>
          <img src="<?= h(thumb_src((string)$c['photo'])) ?>" alt="">
          <label class="check"><input type="checkbox" name="remove_photo" value="1"> odebrat fotku</label>
        <?php else: ?>
          <span class="initials"><?= h(initials((string)($c['name'] ?? '')) ?: '?') ?></span>
          <span class="hint">Bez fotky se na webu zobrazí iniciály.</span>
        <?php endif; ?>
      </div>
      <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" data-resize>
      <p class="hint">Nejlépe portrét na výšku nebo čtverec.</p>
    </div>
    <div class="save-bar">
      <a class="btn btn--ghost" href="admin.php?s=treneri">Zrušit</a>
      <button class="btn btn--primary" type="submit"><?= icon('check') ?> <?= $c['id'] !== '' ? 'Uložit změny' : 'Přidat trenéra' ?></button>
    </div>
  </form>
  <?php
}

function view_turnaje(array $d): void
{
  $list = $d['tournaments']['list'];
  $edit = isset($_GET['edit']) && is_string($_GET['edit']) ? $_GET['edit'] : '';
  $t = null;
  if ($edit !== '') {
    $i = find_index($list, $edit);
    if ($i === null) { echo '<p class="warn">Turnaj nebyl nalezen.</p>'; return; }
    $t = $list[$i];
  }
  $tde = is_array($t['de'] ?? null) ? $t['de'] : [];
  $back = $t ? 's=turnaje&edit=' . $t['id'] : 's=turnaje';
  $today = date('Y-m-d');
  ?>
  <div class="top">
    <div><h1>Turnaje</h1><p>Turnaje se na webu řadí podle data, proběhlé jsou zašedlé. Přihlášky vedou do systému ČGF.</p></div>
  </div>
  <form method="post" action="admin.php?s=turnaje" class="card">
    <?= csrf_field('tours_publish', 's=turnaje') ?>
    <h2>Zveřejnění</h2>
    <label class="check"><input type="checkbox" name="published" value="1" <?= !empty($d['tournaments']['published']) ? 'checked' : '' ?>> Zobrazit kalendář turnajů na webu</label>
    <p class="hint" style="margin:.5rem 0 1rem">Když je vypnuto, web místo seznamu ukazuje „Kalendář turnajů připravujeme“ s odkazem na ČGF.</p>
    <button class="btn btn--primary btn--sm" type="submit"><?= icon('check') ?> Uložit</button>
  </form>
  <form method="post" action="admin.php?s=turnaje" class="card">
    <?= csrf_field('tour_save', $back) ?>
    <input type="hidden" name="id" value="<?= h($t['id'] ?? '') ?>">
    <h2><?= $t ? 'Upravit turnaj' : 'Přidat turnaj' ?></h2>
    <div class="grid-3">
      <div class="field"><label for="date">Datum</label><input type="date" id="date" name="date" required value="<?= h(ov('date', $t['date'] ?? '')) ?>"></div>
    </div>
    <div class="grid-2">
      <div>
        <p class="lang-head"><?= flag('cs') ?> Česky</p>
        <div class="field"><label for="name">Název turnaje</label><input type="text" id="name" name="name" required maxlength="150" value="<?= h(ov('name', $t['name'] ?? '')) ?>"></div>
        <div class="field"><label for="format">Formát</label><input type="text" id="format" name="format" maxlength="120" placeholder="Stableford · jednotlivci" value="<?= h(ov('format', $t['format'] ?? '')) ?>"></div>
        <div class="field"><label for="cat">Kategorie</label><input type="text" id="cat" name="cat" maxlength="60" placeholder="Otevřený, Senioři, Junioři…" value="<?= h(ov('cat', $t['cat'] ?? '')) ?>"></div>
      </div>
      <div>
        <p class="lang-head"><?= flag('de') ?> Deutsch</p>
        <div class="field"><label for="name_de">Turniername</label><input type="text" id="name_de" name="name_de" maxlength="150" value="<?= h(ov('name_de', $tde['name'] ?? '')) ?>"></div>
        <div class="field"><label for="format_de">Format</label><input type="text" id="format_de" name="format_de" maxlength="120" placeholder="Stableford · Einzel" value="<?= h(ov('format_de', $tde['format'] ?? '')) ?>"></div>
        <div class="field"><label for="cat_de">Kategorie</label><input type="text" id="cat_de" name="cat_de" maxlength="60" placeholder="Offen, Senioren, Jugend…" value="<?= h(ov('cat_de', $tde['cat'] ?? '')) ?>"></div>
      </div>
    </div>
    <div class="actions" style="justify-content:flex-start">
      <button class="btn btn--primary" type="submit"><?= icon('check') ?> <?= $t ? 'Uložit změny' : 'Přidat turnaj' ?></button>
      <?php if ($t): ?><a class="btn btn--ghost" href="admin.php?s=turnaje">Zrušit</a><?php endif; ?>
    </div>
  </form>
  <form method="post" action="admin.php?s=turnaje" class="card">
    <?= csrf_field('tours_list', 's=turnaje') ?>
    <h2>Seznam turnajů <small>(<?= count($list) ?>)</small></h2>
    <?php if (!$list): ?><p class="empty">Zatím žádné turnaje.</p><?php else: ?>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Datum</th><th>Turnaj</th><th class="hide-m">Kategorie</th><th class="hide-m">Němčina</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($list as $x): ?>
        <tr<?= ($x['date'] ?? '') < $today ? ' style="opacity:.6"' : '' ?>>
          <td><?= h(fmt_date((string)$x['date'])) ?></td>
          <td><a class="title" href="admin.php?s=turnaje&amp;edit=<?= h($x['id']) ?>"><?= h($x['name'] ?? '') ?></a><span class="sub"><?= h($x['format'] ?? '') ?></span></td>
          <td class="hide-m"><span class="badge"><?= h($x['cat'] ?? '') ?></span></td>
          <td class="hide-m"><?= !empty($x['de']['name']) ? '<span class="badge badge--ok">' . icon('check') . ' ano</span>' : '<span class="badge badge--off">chybí</span>' ?></td>
          <td><div class="actions">
            <a class="btn btn--ghost btn--sm" href="admin.php?s=turnaje&amp;edit=<?= h($x['id']) ?>"><?= icon('edit') ?> Upravit</a>
            <button class="btn btn--danger btn--icon btn--sm" type="submit" name="op" value="delete:<?= h($x['id']) ?>" aria-label="Smazat" data-confirm="Opravdu smazat turnaj „<?= h($x['name'] ?? '') ?>“?"><?= icon('trash') ?></button>
          </div></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table></div>
    <?php endif; ?>
  </form>
  <?php
}

function view_galerie(array $d): void
{
  $n = count($d['gallery']);
  $counts = array_fill_keys(array_keys(GALLERY_CATS), 0);
  foreach ($d['gallery'] as $g) if (isset($counts[$g['cat'] ?? ''])) $counts[$g['cat']]++;
  ?>
  <div class="top">
    <div><h1>Fotogalerie</h1><p>Fotky se na webu řadí v tomto pořadí a dají se filtrovat podle kategorií.
      <?php foreach (GALLERY_CATS as $k => $label): ?><span class="badge" style="margin:.15rem .1rem 0 0"><?= h($label) ?> · <?= (int)$counts[$k] ?></span><?php endforeach; ?></p></div>
  </div>
  <form method="post" action="admin.php?s=galerie" enctype="multipart/form-data" class="card">
    <?= csrf_field('gallery_add', 's=galerie') ?>
    <h2>Nahrát fotky</h2>
    <div class="grid-2">
      <div class="field"><label for="photos">Fotky</label><input type="file" id="photos" name="photos[]" accept="image/jpeg,image/png,image/webp" multiple required data-resize><span class="hint">Můžete vybrat víc fotek najednou (limit serveru na jedno odeslání je <?= h(fmt_bytes(upload_limit())) ?>, velké fotky se předem zmenší).</span></div>
      <div class="field"><label for="cat">Kategorie</label><select id="cat" name="cat" required>
        <?php foreach (GALLERY_CATS as $k => $label): ?><option value="<?= h($k) ?>"<?= ov('cat') === $k ? ' selected' : '' ?>><?= h($label) ?></option><?php endforeach; ?>
      </select></div>
      <div class="field"><label for="t">Popisek <?= flag('cs') ?> <span class="muted">(pro všechny nahrané, lze upravit později)</span></label><input type="text" id="t" name="t" maxlength="150" value="<?= h(ov('t')) ?>"></div>
      <div class="field"><label for="tDe">Popisek <?= flag('de') ?></label><input type="text" id="tDe" name="tDe" maxlength="150" value="<?= h(ov('tDe')) ?>"></div>
    </div>
    <label class="check" style="margin-bottom:1rem"><input type="checkbox" name="top" value="1" <?= oc('top', true) ? 'checked' : '' ?>> Zařadit na začátek galerie</label><br>
    <button class="btn btn--gold" type="submit"><?= icon('upload') ?> Nahrát do galerie</button>
  </form>
  <form method="post" action="admin.php?s=galerie">
    <?= csrf_field('gallery_list', 's=galerie') ?>
    <?php if (!$n): ?><p class="empty" style="margin-top:1.2rem">Galerie je prázdná.</p><?php endif; ?>
    <div class="cards" style="margin-top:1.2rem">
      <?php foreach ($d['gallery'] as $k => $g): ?>
        <div class="item">
          <a href="<?= h(img_src((string)$g['f'])) ?>" target="_blank" rel="noopener"><img class="item__img" src="<?= h(thumb_src((string)$g['f'])) ?>" alt="" loading="lazy"></a>
          <div class="item__body">
            <select name="cat[<?= h($g['id']) ?>]" aria-label="Kategorie">
              <?php foreach (GALLERY_CATS as $ck => $label): ?><option value="<?= h($ck) ?>"<?= ($g['cat'] ?? '') === $ck ? ' selected' : '' ?>><?= h($label) ?></option><?php endforeach; ?>
            </select>
            <label class="mini-lang"><?= flag('cs') ?><input type="text" name="cap[<?= h($g['id']) ?>]" maxlength="150" value="<?= h($g['t'] ?? '') ?>" aria-label="Popisek česky" placeholder="Popisek"></label>
            <label class="mini-lang"><?= flag('de') ?><input type="text" name="capde[<?= h($g['id']) ?>]" maxlength="150" value="<?= h($g['tDe'] ?? '') ?>" aria-label="Popisek německy" placeholder="Bildunterschrift"></label>
          </div>
          <?= item_bar((string)$g['id'], $k, $n, true, 'Opravdu odebrat tuto fotku z galerie?') ?>
        </div>
      <?php endforeach; ?>
    </div>
    <?php if ($n): ?><div class="save-bar"><button class="btn btn--primary" type="submit" name="op" value="save"><?= icon('check') ?> Uložit popisky a kategorie</button></div><?php endif; ?>
  </form>
  <?php
}

function view_partneri(array $d): void
{
  $n = count($d['partners']);
  ?>
  <div class="top">
    <div><h1>Partneři</h1><p>Loga partnerů jedou v pásu nad patičkou webu. Nejlépe vypadá logo v PNG s průhledným pozadím.</p></div>
  </div>
  <form method="post" action="admin.php?s=partneri" enctype="multipart/form-data" class="card">
    <?= csrf_field('partner_add', 's=partneri') ?>
    <h2>Přidat partnera</h2>
    <div class="grid-3">
      <div class="field"><label for="pname">Název</label><input type="text" id="pname" name="name" required maxlength="80" value="<?= h(ov('name')) ?>"></div>
      <div class="field"><label for="purl">Web partnera</label><input type="url" id="purl" name="url" maxlength="300" placeholder="https://…" value="<?= h(ov('url')) ?>"></div>
      <div class="field"><label for="plogo">Logo</label><input type="file" id="plogo" name="logo" accept="image/png,image/jpeg,image/webp" required></div>
    </div>
    <button class="btn btn--gold" type="submit"><?= icon('plus') ?> Přidat partnera</button>
  </form>
  <form method="post" action="admin.php?s=partneri" enctype="multipart/form-data">
    <?= csrf_field('partners_list', 's=partneri') ?>
    <div class="cards" style="margin-top:1.2rem">
      <?php foreach ($d['partners'] as $k => $p): ?>
        <div class="item">
          <img class="item__img item__img--logo" src="<?= h(logo_src((string)$p['logo'])) ?>" alt="" loading="lazy">
          <div class="item__body">
            <input type="text" name="name[<?= h($p['id']) ?>]" maxlength="80" value="<?= h($p['name'] ?? '') ?>" aria-label="Název partnera" placeholder="Název">
            <input type="url" name="url[<?= h($p['id']) ?>]" maxlength="300" value="<?= h($p['url'] ?? '') ?>" aria-label="Web partnera" placeholder="https://…">
            <label class="hint">Vyměnit logo: <input type="file" name="logo[<?= h($p['id']) ?>]" accept="image/png,image/jpeg,image/webp"></label>
          </div>
          <?= item_bar((string)$p['id'], $k, $n, false, 'Opravdu odebrat partnera ' . ($p['name'] ?? '') . '?') ?>
        </div>
      <?php endforeach; ?>
    </div>
    <?php if ($n): ?><div class="save-bar"><button class="btn btn--primary" type="submit" name="op" value="save"><?= icon('check') ?> Uložit partnery</button></div><?php endif; ?>
  </form>
  <?php
}

function view_zalohy(): void
{
  $list = backup_list();
  ?>
  <div class="top">
    <div><h1>Zálohy</h1><p>Před každou změnou se automaticky uloží stav obsahu (drží se posledních <?= KEEP_BACKUPS ?> záloh). Obnovením se web vrátí do stavu před danou změnou – i obnovení jde vrátit zpět.</p></div>
    <div class="actions"><a class="btn btn--ghost" href="admin.php?s=zalohy&amp;stahnout=aktualni"><?= icon('download') ?> Stáhnout aktuální obsah</a></div>
  </div>
  <form method="post" action="admin.php?s=zalohy" class="card">
    <?= csrf_field('restore', 's=zalohy') ?>
    <?php if (!$list): ?><p class="empty">Zatím žádné zálohy – vzniknou s první změnou.</p><?php else: ?>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Uloženo</th><th>Stav před změnou v sekci</th><th class="hide-m">Velikost</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($list as $b): ?>
        <tr>
          <td class="title"><?= h($b['time']) ?></td>
          <td><?= h($b['what'] ?: '—') ?></td>
          <td class="hide-m muted"><?= h(fmt_bytes($b['size'])) ?></td>
          <td><div class="actions">
            <a class="btn btn--ghost btn--sm" href="admin.php?s=zalohy&amp;stahnout=<?= h(rawurlencode($b['name'])) ?>"><?= icon('download') ?> Stáhnout</a>
            <button class="btn btn--danger btn--sm" type="submit" name="file" value="<?= h($b['name']) ?>" data-confirm="Obnovit obsah webu ze zálohy <?= h($b['time']) ?>? Současný stav se předtím také zazálohuje."><?= icon('history') ?> Obnovit</button>
          </div></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table></div>
    <?php endif; ?>
  </form>
  <?php
}

function view_heslo(array $cfg): void
{ ?>
  <div class="top"><div><h1>Změna hesla</h1><p>Přihlašovací jméno: <b><?= h($cfg['user']) ?></b>. Po změně hesla se odhlásí všechna ostatní přihlášení.</p></div></div>
  <form method="post" action="admin.php?s=heslo" class="card" style="max-width:520px">
    <?= csrf_field('password', 's=heslo') ?>
    <input type="text" name="user" value="<?= h($cfg['user']) ?>" autocomplete="username" hidden>
    <div class="field"><label for="current">Současné heslo</label><input type="password" id="current" name="current" required autocomplete="current-password"></div>
    <div class="field"><label for="p1">Nové heslo</label><input type="password" id="p1" name="p1" required minlength="10" autocomplete="new-password"><span class="hint">Aspoň 10 znaků.</span></div>
    <div class="field"><label for="p2">Nové heslo znovu</label><input type="password" id="p2" name="p2" required minlength="10" autocomplete="new-password"></div>
    <button class="btn btn--primary" type="submit"><?= icon('key') ?> Změnit heslo</button>
  </form>
<?php }

/* =====================================================================
   VÝSTUP
   ===================================================================== */
if (!$cfg) { render_auth('setup', $flashes, $nonce); exit; }
if (!$logged) { render_auth('login', $flashes, $nonce); exit; }

$data = null;
$loadError = '';
try { $data = load_content(); } catch (UserError $e) { $loadError = $e->getMessage(); if ($section !== 'heslo') $section = 'zalohy'; }

$counts = $data ? [
  'aktuality' => count($data['news']), 'slider' => count($data['slider']), 'treneri' => count($data['coaches']),
  'turnaje' => count($data['tournaments']['list']), 'galerie' => count($data['gallery']), 'partneri' => count($data['partners']),
] : [];

page_start(SECTIONS[$section][0], $nonce);
?>
<div class="layout">
  <aside class="side">
    <a class="brand" href="admin.php"><img src="assets/logo.png" alt="Golf Club Teplice"><span><b>Golf Club Teplice</b><small>Administrace webu</small></span></a>
    <nav class="nav" aria-label="Sekce administrace">
      <?php foreach (SECTIONS as $key => [$label, $ic]): ?>
        <a href="admin.php?s=<?= h($key) ?>"<?= $key === $section ? ' class="is-active" aria-current="page"' : '' ?>><?= icon($ic) ?><?= h($label) ?><?php if (isset($counts[$key])): ?><span class="count"><?= (int)$counts[$key] ?></span><?php endif; ?></a>
      <?php endforeach; ?>
    </nav>
    <div class="side__foot">
      <a href="./" target="_blank" rel="noopener"><?= icon('external') ?><span class="txt">Zobrazit web</span></a>
      <form method="post" action="admin.php"><?= csrf_field('logout', 's=prehled') ?><button type="submit"><?= icon('logout') ?><span class="txt">Odhlásit (<?= h($cfg['user']) ?>)</span></button></form>
    </div>
  </aside>
  <main class="main">
    <?php render_flashes($flashes); ?>
    <?php if ($loadError): ?><p class="warn"><?= h($loadError) ?></p><?php endif; ?>
    <?php
    switch ($section) {
      case 'aktuality': view_aktuality($data); break;
      case 'cenik':     view_cenik($data); break;
      case 'slider':    view_slider($data); break;
      case 'treneri':   view_treneri($data); break;
      case 'turnaje':   view_turnaje($data); break;
      case 'galerie':   view_galerie($data); break;
      case 'partneri':  view_partneri($data); break;
      case 'zalohy':    view_zalohy(); break;
      case 'heslo':     view_heslo($cfg); break;
      default:          view_prehled($data);
    }
    ?>
  </main>
</div>
<?php page_end($nonce);
