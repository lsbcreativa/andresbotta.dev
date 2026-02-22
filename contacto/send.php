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
$body = "Nueva consulta desde andresbotta.dev\n";
$body .= "========================================\n\n";
$body .= "Nombre: $nombre\n";
$body .= "Email: $email\n";
$body .= "Teléfono: $telefono\n";
$body .= "Tipo de proyecto: $proyecto\n\n";
$body .= "Mensaje:\n$mensaje\n";
$body .= "\n========================================\n";
$body .= "IP: $ip\n";
$body .= "Fecha: " . date('Y-m-d H:i:s') . "\n";

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

    $mail->Subject = "Nueva consulta web: $proyecto - $nombre";
    $mail->Body    = $body;

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
