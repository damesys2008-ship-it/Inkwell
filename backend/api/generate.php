<?php
// ============================
// INKWELL PRO — API: GÉNÉRATION TEXTE
// POST /api/generate.php
// Body: { prompt, model?, imageBase64?, jsonMode? }
// ============================
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../utils/helpers.php';

setCorsHeaders();
requireMethod('POST');

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
checkRateLimit($ip);

$body = getJsonBody();

$prompt = sanitizeText($body['prompt'] ?? '', MAX_PROMPT_LENGTH);
if (empty($prompt)) jsonError('Le prompt est requis');

$model      = sanitizeText($body['model'] ?? 'gemini-2.5-flash', 100);
$imageB64   = $body['imageBase64'] ?? null;
$jsonMode   = (bool)($body['jsonMode'] ?? false);

// Nettoyer le base64 si data URL
if ($imageB64 && str_starts_with($imageB64, 'data:')) {
    preg_match('/base64,(.+)/', $imageB64, $m);
    $imageB64 = $m[1] ?? $imageB64;
}

try {
    $text = callGeminiText($prompt, $model, $imageB64 ?: null, $jsonMode);
    jsonResponse(['text' => $text]);
} catch (RuntimeException $e) {
    jsonError($e->getMessage(), 502);
}
