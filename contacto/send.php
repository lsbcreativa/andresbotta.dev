<?php
// Anti-spam: honeypot check
if (!empty($_POST['_gotcha'])) {
    header('Location: ./');
    exit;
}

// Anti-spam: time-based check (form must take at least 3 seconds to fill)
if (isset($_POST['_ts'])) {
    $elapsed = time() - intval($_POST['_ts']);
    if ($elapsed < 3) {
        header('Location: ./');
        exit;
    }
}

// Validate required fields
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

// Sanitize inputs
$nombre = htmlspecialchars($nombre, ENT_QUOTES, 'UTF-8');
$email = filter_var($email, FILTER_SANITIZE_EMAIL);
$telefono = htmlspecialchars($telefono, ENT_QUOTES, 'UTF-8');
$proyecto = htmlspecialchars($proyecto, ENT_QUOTES, 'UTF-8');
$mensaje = htmlspecialchars($mensaje, ENT_QUOTES, 'UTF-8');

// Build email
$to = 'contacto@andresbotta.dev';
$subject = "Nueva consulta web: $proyecto - $nombre";
$body = "Nueva consulta desde andresbotta.dev\n";
$body .= "========================================\n\n";
$body .= "Nombre: $nombre\n";
$body .= "Email: $email\n";
$body .= "Teléfono: $telefono\n";
$body .= "Tipo de proyecto: $proyecto\n\n";
$body .= "Mensaje:\n$mensaje\n";
$body .= "\n========================================\n";
$body .= "IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'N/A') . "\n";
$body .= "Fecha: " . date('Y-m-d H:i:s') . "\n";

$headers = "From: noreply@andresbotta.dev\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: andresbotta.dev-contact-form\r\n";

$sent = mail($to, $subject, $body, $headers);

if ($sent) {
    header('Location: ./?status=ok');
} else {
    header('Location: ./?status=error');
}
exit;
