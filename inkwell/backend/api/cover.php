<?php
// ============================
// INKWELL PRO — API: GÉNÉRATION COUVERTURE
// POST /api/cover.php
// Body: { prompt, referenceImage? }
// ============================
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../utils/helpers.php';

setCorsHeaders();
requireMethod('POST');

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
checkRateLimit($ip);

$body = getJsonBody();

$prompt    = sanitizeText($body['prompt'] ?? '', MAX_PROMPT_LENGTH);
$refImage  = $body['referenceImage'] ?? null;

if (empty($prompt)) jsonError('Le prompt est requis');

try {
    $imageBase64 = callGeminiImage($prompt, $refImage ?: null);
    jsonResponse(['imageBase64' => $imageBase64]);
} catch (RuntimeException $e) {
    jsonError($e->getMessage(), 502);
}
