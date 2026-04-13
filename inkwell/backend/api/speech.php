<?php
// ============================
// INKWELL PRO — API: TEXT-TO-SPEECH
// POST /api/speech.php
// Body: { text, voice? }
// ============================
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../utils/helpers.php';

setCorsHeaders();
requireMethod('POST');

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
checkRateLimit($ip);

$body  = getJsonBody();
$text  = sanitizeText($body['text'] ?? '', 1500);
$voice = sanitizeText($body['voice'] ?? 'Kore', 50);

if (empty($text)) jsonError('Le texte est requis');

$allowedVoices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
if (!in_array($voice, $allowedVoices)) $voice = 'Kore';

try {
    $audioBase64 = callGeminiTTS($text, $voice);
    jsonResponse(['audioBase64' => $audioBase64]);
} catch (RuntimeException $e) {
    jsonError($e->getMessage(), 502);
}
