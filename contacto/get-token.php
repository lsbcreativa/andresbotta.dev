<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store');

$token = bin2hex(random_bytes(32));
$_SESSION['csrf_token'] = $token;
$_SESSION['csrf_time'] = time();

echo json_encode(['token' => $token]);
