<?php
session_start();

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/config.php';
require __DIR__ . '/phpmailer/src/Exception.php';
require __DIR__ . '/phpmailer/src/PHPMailer.php';
require __DIR__ . '/phpmailer/src/SMTP.php';

// ========== AJAX SUPPORT ==========
$is_ajax = !empty($_SERVER['HTTP_X_REQUESTED_WITH'])
    && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';

function respond($status) {
    global $is_ajax;
    if ($is_ajax) {
        header('Content-Type: application/json');
        echo json_encode(['status' => $status]);
    } else {
        header('Location: ./?status=' . $status);
    }
    exit;
}

// ========== ANTI-SPAM LAYER 1: Honeypot ==========
if (!empty($_POST['website'])) {
    respond('ok');
}

// ========== ANTI-SPAM LAYER 2: Timestamp check ==========
if (isset($_POST['_ts'])) {
    $elapsed = time() - intval($_POST['_ts']);
    if ($elapsed < 3) {
        respond('ok');
    }
}

// ========== ANTI-SPAM LAYER 3: CSRF token ==========
$csrf = $_POST['_csrf'] ?? '';
if (empty($csrf)
    || !isset($_SESSION['csrf_token'])
    || !hash_equals($_SESSION['csrf_token'], $csrf)
    || (time() - ($_SESSION['csrf_time'] ?? 0)) > 3600) {
    respond('error');
}
unset($_SESSION['csrf_token']);

// ========== ANTI-SPAM LAYER 4: JS challenge ==========
$challenge = $_POST['_js_challenge'] ?? '';
$parts = explode(':', $challenge);
if (count($parts) !== 3 || intval($parts[0]) + intval($parts[1]) !== intval($parts[2])) {
    respond('error');
}

// ========== ANTI-SPAM LAYER 5: Rate limiting ==========
$now = time();

// Session-based: max 1 per minute
if (isset($_SESSION['last_submit']) && ($now - $_SESSION['last_submit']) < 60) {
    respond('ratelimit');
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
    respond('ratelimit');
}

// ========== VALIDATE REQUIRED FIELDS ==========
$nombre = trim($_POST['nombre'] ?? '');
$email = trim($_POST['email'] ?? '');
$telefono = trim($_POST['telefono'] ?? '');
$proyecto = trim($_POST['proyecto'] ?? '');
$mensaje = trim($_POST['mensaje'] ?? '');

if (empty($nombre) || empty($email) || empty($telefono) || empty($mensaje)) {
    respond('error');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond('error');
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
    respond('invalid-email');
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
    respond('invalid-phone');
}

// ========== SANITIZE ==========
$nombre = htmlspecialchars($nombre, ENT_QUOTES, 'UTF-8');
$email = filter_var($email, FILTER_SANITIZE_EMAIL);
$telefono = htmlspecialchars($telefono, ENT_QUOTES, 'UTF-8');
$proyecto = htmlspecialchars($proyecto, ENT_QUOTES, 'UTF-8');
$mensaje = htmlspecialchars($mensaje, ENT_QUOTES, 'UTF-8');

// ========== BUILD EMAIL BODIES ==========
$fecha = date('d/m/Y H:i');
$logoUrl = 'https://andresbotta.dev/imagenes/logo-andres-botta.png';
$previewMsg = mb_strlen($mensaje) > 60 ? mb_substr($mensaje, 0, 60) . '...' : $mensaje;

// ── Admin email (notification to Andrés) ──

$adminHtml = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;">
<!-- Preheader (hidden preview text) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">$nombre &middot; $proyecto: &ldquo;$previewMsg&rdquo;</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

<!-- Logo -->
<tr><td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #e5e7eb;">
<img src="$logoUrl" alt="Andrés Botta" width="160" height="46" style="display:inline-block;width:160px;height:auto;border:0;">
</td></tr>

<!-- Fields -->
<tr><td style="padding:28px 32px 0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:12px 0;border-bottom:1px solid #f3f4f6;width:110px;vertical-align:top;">
<span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Nombre</span>
</td>
<td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
<span style="color:#1a1a1a;font-size:15px;font-weight:500;">$nombre</span>
</td>
</tr>
<tr>
<td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
<span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Email</span>
</td>
<td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
<a href="mailto:$email" style="color:#3b82f6;font-size:15px;text-decoration:none;">$email</a>
</td>
</tr>
<tr>
<td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
<span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Tel&eacute;fono</span>
</td>
<td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
<a href="tel:$telefono" style="color:#3b82f6;font-size:15px;text-decoration:none;">$telefono</a>
</td>
</tr>
<tr>
<td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
<span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Proyecto</span>
</td>
<td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
<span style="display:inline-block;background-color:#eff6ff;color:#2563eb;font-size:13px;font-weight:600;padding:4px 14px;border-radius:100px;">$proyecto</span>
</td>
</tr>
</table>
</td></tr>

<!-- Message -->
<tr><td style="padding:24px 32px;">
<p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">Mensaje</p>
<div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
<p style="color:#1a1a1a;font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap;">$mensaje</p>
</div>
</td></tr>

<!-- Action buttons -->
<tr><td style="padding:8px 32px 28px;text-align:center;">
<table cellpadding="0" cellspacing="0" align="center"><tr>
<td style="padding-right:12px;">
<a href="mailto:$email" style="display:inline-block;background-color:#3b82f6;color:#ffffff;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;">Responder</a>
</td>
<td>
<a href="https://wa.me/51968672704" style="display:inline-block;background-color:#25d366;color:#ffffff;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;">WhatsApp</a>
</td>
</tr></table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="margin:0;color:#9ca3af;font-size:12px;">IP: $ip &middot; $fecha</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
HTML;

$adminAlt = "Nueva consulta en andresbotta.dev\n";
$adminAlt .= "================================\n";
$adminAlt .= "Nombre: $nombre\n";
$adminAlt .= "Email: $email\n";
$adminAlt .= "Teléfono: $telefono\n";
$adminAlt .= "Proyecto: $proyecto\n\n";
$adminAlt .= "Mensaje:\n$mensaje\n\n";
$adminAlt .= "================================\n";
$adminAlt .= "IP: $ip | $fecha\n";

// ── Client email (confirmation to the person who submitted) ──

$clientHtml = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;">
<!-- Preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Recib&iacute; tu consulta sobre &ldquo;$proyecto&rdquo; y te responder&eacute; en menos de 24 horas.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

<!-- Logo -->
<tr><td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #e5e7eb;">
<img src="$logoUrl" alt="Andrés Botta" width="160" height="46" style="display:inline-block;width:160px;height:auto;border:0;">
</td></tr>

<!-- Greeting -->
<tr><td style="padding:32px 32px 0;">
<h1 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;font-weight:700;">&iexcl;Hola $nombre!</h1>
<p style="margin:0;color:#374151;font-size:16px;line-height:1.6;">
Recib&iacute; tu consulta sobre <strong style="color:#2563eb;">&ldquo;$proyecto&rdquo;</strong> y te responder&eacute; en menos de <strong>24 horas</strong>.
</p>
</td></tr>

<!-- What they sent -->
<tr><td style="padding:24px 32px;">
<p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">Lo que me escribiste</p>
<div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap;">$mensaje</p>
</div>
</td></tr>

<!-- Contact alternatives -->
<tr><td style="padding:0 32px 32px;">
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px;">Si necesitas algo urgente, cont&aacute;ctame directamente:</p>
<table cellpadding="0" cellspacing="0">
<tr>
<td style="padding:4px 0;"><span style="color:#6b7280;font-size:14px;">WhatsApp:&nbsp;</span><a href="https://wa.me/51968672704" style="color:#3b82f6;font-size:14px;text-decoration:none;font-weight:500;">+51 968 672 704</a></td>
</tr>
<tr>
<td style="padding:4px 0;"><span style="color:#6b7280;font-size:14px;">Email:&nbsp;</span><a href="mailto:contacto@andresbotta.dev" style="color:#3b82f6;font-size:14px;text-decoration:none;font-weight:500;">contacto@andresbotta.dev</a></td>
</tr>
</table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="margin:0 0 4px;color:#1a1a1a;font-size:14px;font-weight:600;">Andr&eacute;s Botta</p>
<p style="margin:0;color:#6b7280;font-size:13px;">Desarrollo web profesional &middot; <a href="https://andresbotta.dev" style="color:#3b82f6;text-decoration:none;">andresbotta.dev</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
HTML;

$clientAlt = "¡Hola $nombre!\n\n";
$clientAlt .= "Recibí tu consulta sobre \"$proyecto\" y te responderé en menos de 24 horas.\n\n";
$clientAlt .= "Lo que me escribiste:\n$mensaje\n\n";
$clientAlt .= "Si necesitas algo urgente:\n";
$clientAlt .= "WhatsApp: +51 968 672 704\n";
$clientAlt .= "Email: contacto@andresbotta.dev\n\n";
$clientAlt .= "— Andrés Botta\n";
$clientAlt .= "andresbotta.dev\n";

// ========== SEND VIA PHPMAILER SMTP ==========

// Helper to configure SMTP on a PHPMailer instance
function configureSMTP(PHPMailer $m): void {
    $m->isSMTP();
    $m->Host       = SMTP_HOST;
    $m->SMTPAuth   = true;
    $m->Username   = SMTP_USER;
    $m->Password   = SMTP_PASS;
    $m->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $m->Port       = SMTP_PORT;
    $m->CharSet    = 'UTF-8';
}

// 1) Admin notification
$mail = new PHPMailer(true);
try {
    configureSMTP($mail);
    $mail->setFrom(SMTP_USER, 'andresbotta.dev');
    $mail->addAddress(SMTP_USER, 'Andrés Botta');
    $mail->addReplyTo($email, $nombre);

    $mail->isHTML(true);
    $mail->Subject = "$nombre · $proyecto";
    $mail->Body    = $adminHtml;
    $mail->AltBody = $adminAlt;

    $mail->send();

    // Update rate limiting counters on success
    $_SESSION['last_submit'] = $now;
    $rate_data['count']++;
    file_put_contents($rate_file, json_encode($rate_data), LOCK_EX);

    // 2) Client confirmation (failure must not block success response)
    try {
        $mail2 = new PHPMailer(true);
        configureSMTP($mail2);
        $mail2->setFrom(SMTP_USER, 'Andrés Botta');
        $mail2->addAddress($email, $nombre);
        $mail2->addReplyTo(SMTP_USER, 'Andrés Botta');

        $mail2->isHTML(true);
        $mail2->Subject = "Recibí tu mensaje, $nombre ✓";
        $mail2->Body    = $clientHtml;
        $mail2->AltBody = $clientAlt;

        $mail2->send();
    } catch (Exception $e) {
        // Silent fail — admin email already sent successfully
    }

    respond('ok');
} catch (Exception $e) {
    respond('error');
}
