<?php
/**
 * Golf Club Teplice – odesílání formulářů z webu (kontakt + novinky e-mailem).
 *
 * Volá ho skript v index.html (FORM_ENDPOINT = 'kontakt.php') a odpovídá JSONem
 * { "ok": true } nebo { "ok": false, "error": "..." }.
 *
 * Požadavky na hosting: PHP 7.4+ s funkcí mail(). Odesílací adresa FROM by měla
 * být na doméně webu (kvůli SPF/DKIM), jinak mohou e-maily padat do spamu.
 * Pokud hosting mail() nepodporuje, je potřeba nahradit funkci send_mail() třeba
 * odesláním přes SMTP (PHPMailer) nebo službu typu Formspree.
 */

declare(strict_types=1);

date_default_timezone_set('Europe/Prague');

const MAIL_TO     = 'golf@golf-teplice.cz';   // kam chodí zprávy z webu
const MAIL_FROM   = 'web@golf-teplice.cz';    // odesílatel (adresa na doméně webu)
const MIN_FILL_MS = 3000;                     // rychlejší vyplnění = robot
const MAX_MESSAGE = 5000;                     // maximální délka zprávy (znaků)

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(bool $ok, string $error = '', int $status = 200): void
{
    http_response_code($status);
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
    exit;
}

function field(string $name): string
{
    $value = $_POST[$name] ?? '';
    return is_string($value) ? trim($value) : '';
}

/** Jeden řádek bez zalomení (ochrana hlaviček a čitelnost e-mailu). */
function one_line(string $value): string
{
    return trim(preg_replace('/[\r\n\t]+/', ' ', $value) ?? '');
}

function send_mail(string $subject, string $body, string $replyTo): bool
{
    $headers = implode("\r\n", [
        'From: Golf Club Teplice – web <' . MAIL_FROM . '>',
        'Reply-To: ' . $replyTo,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]);
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    return mail(MAIL_TO, $encodedSubject, $body, $headers);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, 'method', 405);
}

// Ochrana proti spamu: skryté pole „website“ vyplní jen robot – tváříme se, že je vše v pořádku.
if (field('website') !== '') {
    respond(true);
}
// Formulář odeslaný hned po načtení stránky posílá robot.
if ((int) field('elapsed') < MIN_FILL_MS) {
    respond(false, 'too_fast', 400);
}

$type  = field('type') === 'newsletter' ? 'newsletter' : 'contact';
$lang  = field('lang') === 'de' ? 'DE' : 'CZ';
$email = filter_var(field('email'), FILTER_VALIDATE_EMAIL);
if ($email === false) {
    respond(false, 'email', 400);
}

$meta = "\n\n—\nJazyk webu: {$lang}\nOdesláno: " . date('j. n. Y H:i') . "\nIP: " . ($_SERVER['REMOTE_ADDR'] ?? '?');

if ($type === 'newsletter') {
    $subject = 'Web: nový zájemce o novinky e-mailem';
    $body    = "Na webu se přihlásil k odběru novinek:\n\nE-mail: {$email}\n\n"
             . "Souhlas se zasíláním novinek udělen odesláním formuláře." . $meta;
} else {
    $name    = one_line(strip_tags(field('name')));
    $message = strip_tags(field('message'));
    if ($name === '' || $message === '') {
        respond(false, 'fields', 400);
    }
    if (mb_strlen($message) > MAX_MESSAGE || mb_strlen($name) > 200) {
        respond(false, 'too_long', 400);
    }
    if (field('consent') !== '1') {
        respond(false, 'consent', 400);
    }
    $subject = 'Web: dotaz od ' . $name;
    $body    = "Jméno: {$name}\nE-mail: {$email}\n\nZpráva:\n{$message}" . $meta;
}

if (!send_mail($subject, $body, $email)) {
    respond(false, 'mail', 500);
}
respond(true);
