<?php
// ============================
// INKWELL PRO — API: CHAT MULTI-TOUR
// POST /api/chat.php
// Body: { systemPrompt, messages[], userMessage, imageBase64?, model? }
// ============================
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../utils/helpers.php';

setCorsHeaders();
requireMethod('POST');

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
checkRateLimit($ip);

$body = getJsonBody();

$systemPrompt = sanitizeText($body['systemPrompt'] ?? '', MAX_PROMPT_LENGTH);
$messages     = is_array($body['messages'] ?? null) ? $body['messages'] : [];
$userMessage  = sanitizeText($body['userMessage'] ?? '', 5000);
$imageB64     = $body['imageBase64'] ?? null;
$model        = sanitizeText($body['model'] ?? 'gemini-2.5-flash', 100);

if (empty($systemPrompt) || empty($userMessage)) {
    jsonError('systemPrompt et userMessage sont requis');
}

// Nettoyer le base64
if ($imageB64 && str_starts_with($imageB64, 'data:')) {
    preg_match('/base64,(.+)/', $imageB64, $m);
    $imageB64 = $m[1] ?? $imageB64;
}

// Valider/nettoyer les messages
$cleanMessages = [];
foreach ($messages as $msg) {
    if (isset($msg['role'], $msg['text'])) {
        $cleanMessages[] = [
            'role' => in_array($msg['role'], ['user', 'model']) ? $msg['role'] : 'user',
            'text' => sanitizeText($msg['text'], 10000)
        ];
    }
}

try {
    $text = callGeminiChat($systemPrompt, $cleanMessages, $userMessage, $imageB64 ?: null, $model);
    jsonResponse(['text' => $text]);
} catch (RuntimeException $e) {
    jsonError($e->getMessage(), 502);
}
