<?php
session_start();

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/config.php';
require __DIR__ . '/phpmailer/src/Exception.php';
require __DIR__ . '/phpmailer/src/PHPMailer.php';
require __DIR__ . '/phpmailer/src/SMTP.php';

// ========== ANTI-SPAM LAYER 1: Honeypot ==========
if (!empty($_POST['website'])) {
    header('Location: ./');
    exit;
}

// ========== ANTI-SPAM LAYER 2: Timestamp check ==========
if (isset($_POST['_ts'])) {
    $elapsed = time() - intval($_POST['_ts']);
    if ($elapsed < 3) {
        header('Location: ./');
        exit;
    }
}

// ========== ANTI-SPAM LAYER 3: CSRF token ==========
$csrf = $_POST['_csrf'] ?? '';
if (empty($csrf)
    || !isset($_SESSION['csrf_token'])
    || !hash_equals($_SESSION['csrf_token'], $csrf)
    || (time() - ($_SESSION['csrf_time'] ?? 0)) > 3600) {
    header('Location: ./?status=error');
    exit;
}
unset($_SESSION['csrf_token']);

// ========== ANTI-SPAM LAYER 4: JS challenge ==========
$challenge = $_POST['_js_challenge'] ?? '';
$parts = explode(':', $challenge);
if (count($parts) !== 3 || intval($parts[0]) + intval($parts[1]) !== intval($parts[2])) {
    header('Location: ./?status=error');
    exit;
}

// ========== ANTI-SPAM LAYER 5: Rate limiting ==========
$now = time();

// Session-based: max 1 per minute
if (isset($_SESSION['last_submit']) && ($now - $_SESSION['last_submit']) < 60) {
    header('Location: ./?status=ratelimit');
    exit;
}

// IP-based: max 5 per hour
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$ip_hash = md5($ip);
$rate_dir = __DIR__ . '/rate_logs/';
$rate_file = $rate_dir . $ip_hash . '.json';

if (!is_dir($rate_dir)) mkdir($rate_dir, 0700, true);

$rate_data = ['count' => 0, 'window_start' => $now];
if (file_exists($rate_file)) {
    $rate_data = json_decode(file_get_contents($rate_file), true) ?: $rate_data;
    if (($now - $rate_data['window_start']) > 3600) {
        $rate_data = ['count' => 0, 'window_start' => $now];
    }
}

if ($rate_data['count'] >= 5) {
    header('Location: ./?status=ratelimit');
    exit;
}

// ========== VALIDATE REQUIRED FIELDS ==========
$nombre = trim($_POST['nombre'] ?? '');
$email = trim($_POST['email'] ?? '');
$telefono = trim($_POST['telefono'] ?? '');
$proyecto = trim($_POST['proyecto'] ?? '');
$mensaje = trim($_POST['mensaje'] ?? '');

if (empty($nombre) || empty($email) || empty($telefono) || empty($mensaje)) {
    header('Location: ./?status=error');
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('Location: ./?status=error');
    exit;
}

// ========== ANTI-SPAM LAYER 6: Disposable email check ==========
function is_disposable_email(string $email): bool {
    $domain = strtolower(substr(strrchr($email, '@'), 1));
    $blocklist_file = __DIR__ . '/disposable_email_blocklist.conf';
    if (!file_exists($blocklist_file)) return false;
    $blocked = array_flip(
        array_map('trim', file($blocklist_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES))
    );
    return isset($blocked[$domain]);
}

if (is_disposable_email($email)) {
    header('Location: ./?status=invalid-email');
    exit;
}

// ========== VALIDATE PERU PHONE ==========
function validate_peru_phone(string $phone): bool {
    $cleaned = preg_replace('/[\s\-\(\)\.]/', '', $phone);
    return (bool) preg_match(
        '/^(\+?51)?(9\d{8}|0?1\d{7}|0[2-9]\d{6,7})$/',
        $cleaned
    );
}

if (!validate_peru_phone($telefono)) {
    header('Location: ./?status=invalid-phone');
    exit;
}

// ========== SANITIZE ==========
$nombre = htmlspecialchars($nombre, ENT_QUOTES, 'UTF-8');
$email = filter_var($email, FILTER_SANITIZE_EMAIL);
$telefono = htmlspecialchars($telefono, ENT_QUOTES, 'UTF-8');
$proyecto = htmlspecialchars($proyecto, ENT_QUOTES, 'UTF-8');
$mensaje = htmlspecialchars($mensaje, ENT_QUOTES, 'UTF-8');

// ========== BUILD EMAIL BODY ==========
$fecha = date('d/m/Y H:i');

$htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#06080f;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#06080f;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0c0e18;border:1px solid #27272a;border-radius:8px;overflow:hidden;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#3b82f6,#60a5fa);padding:28px 32px;">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Nueva consulta web</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">andresbotta.dev &middot; $fecha</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:28px 32px;">

<!-- Fields -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:10px 0;border-bottom:1px solid #1a1a2e;width:130px;vertical-align:top;">
<span style="color:#a1a1aa;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Nombre</span>
</td>
<td style="padding:10px 0;border-bottom:1px solid #1a1a2e;">
<span style="color:#fafafa;font-size:15px;">$nombre</span>
</td>
</tr>
<tr>
<td style="padding:10px 0;border-bottom:1px solid #1a1a2e;vertical-align:top;">
<span style="color:#a1a1aa;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Email</span>
</td>
<td style="padding:10px 0;border-bottom:1px solid #1a1a2e;">
<a href="mailto:$email" style="color:#60a5fa;font-size:15px;text-decoration:none;">$email</a>
</td>
</tr>
<tr>
<td style="padding:10px 0;border-bottom:1px solid #1a1a2e;vertical-align:top;">
<span style="color:#a1a1aa;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Teléfono</span>
</td>
<td style="padding:10px 0;border-bottom:1px solid #1a1a2e;">
<a href="tel:$telefono" style="color:#60a5fa;font-size:15px;text-decoration:none;">$telefono</a>
</td>
</tr>
<tr>
<td style="padding:10px 0;border-bottom:1px solid #1a1a2e;vertical-align:top;">
<span style="color:#a1a1aa;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Proyecto</span>
</td>
<td style="padding:10px 0;border-bottom:1px solid #1a1a2e;">
<span style="display:inline-block;background-color:rgba(59,130,246,0.15);color:#60a5fa;font-size:13px;font-weight:600;padding:4px 12px;border-radius:12px;">$proyecto</span>
</td>
</tr>
</table>

<!-- Message -->
<div style="margin-top:24px;">
<p style="color:#a1a1aa;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">Mensaje</p>
<div style="background-color:#111827;border:1px solid #1f2937;border-radius:6px;padding:16px 20px;">
<p style="color:#e4e4e7;font-size:15px;line-height:1.6;margin:0;white-space:pre-wrap;">$mensaje</p>
</div>
</div>

</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 32px;border-top:1px solid #27272a;">
<p style="margin:0;color:#52525b;font-size:12px;">IP: $ip &middot; $fecha</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
HTML;

$altBody = "Nueva consulta desde andresbotta.dev\n";
$altBody .= "Nombre: $nombre\n";
$altBody .= "Email: $email\n";
$altBody .= "Teléfono: $telefono\n";
$altBody .= "Proyecto: $proyecto\n\n";
$altBody .= "Mensaje:\n$mensaje\n";
$altBody .= "\nIP: $ip | Fecha: $fecha\n";

// ========== SEND VIA PHPMAILER SMTP ==========
$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host       = SMTP_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = SMTP_USER;
    $mail->Password   = SMTP_PASS;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = SMTP_PORT;
    $mail->CharSet    = 'UTF-8';

    $mail->setFrom(SMTP_USER, 'Formulario andresbotta.dev');
    $mail->addAddress(SMTP_USER, 'Andrés Botta');
    $mail->addReplyTo($email, $nombre);

    $mail->isHTML(true);
    $mail->Subject = "Nueva consulta web: $proyecto - $nombre";
    $mail->Body    = $htmlBody;
    $mail->AltBody = $altBody;

    $mail->send();

    // Update rate limiting counters on success
    $_SESSION['last_submit'] = $now;
    $rate_data['count']++;
    file_put_contents($rate_file, json_encode($rate_data), LOCK_EX);

    header('Location: ./?status=ok');
} catch (Exception $e) {
    header('Location: ./?status=error');
}
exit;
