<?php
// ============================
// INKWELL PRO — HELPERS
// ============================
require_once __DIR__ . '/../config/config.php';

function setCorsHeaders(): void {
    $origin = CORS_ORIGIN;
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $status = 400): void {
    jsonResponse(['error' => $message], $status);
}

function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonError('Corps JSON invalide', 400);
    }
    return $data ?? [];
}

function requireMethod(string $method): void {
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        jsonError("Méthode $method requise", 405);
    }
}

function sanitizeText(string $text, int $maxLen = 50000): string {
    return mb_substr(trim(strip_tags($text)), 0, $maxLen);
}

/**
 * Appel à l'API Gemini (texte)
 */
function callGeminiText(string $prompt, string $model = 'gemini-2.5-flash', ?string $imageBase64 = null, bool $jsonMode = false): string {
    $url = GEMINI_BASE_URL . "/models/{$model}:generateContent?key=" . GEMINI_API_KEY;

    $parts = [];
    if ($imageBase64) {
        $parts[] = [
            'inlineData' => [
                'mimeType' => 'image/jpeg',
                'data'     => $imageBase64
            ]
        ];
    }
    $parts[] = ['text' => $prompt];

    $body = ['contents' => [['parts' => $parts]]];

    if ($jsonMode) {
        $body['generationConfig'] = ['responseMimeType' => 'application/json'];
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($body),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) throw new RuntimeException("cURL Error: $curlError");
    if ($httpCode !== 200) {
        $decoded = json_decode($response, true);
        $msg = $decoded['error']['message'] ?? "HTTP $httpCode";
        throw new RuntimeException("Gemini API Error: $msg");
    }

    $decoded = json_decode($response, true);
    return $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '';
}

/**
 * Appel Gemini multi-tour (chat)
 */
function callGeminiChat(string $systemPrompt, array $messages, string $userMessage, ?string $imageBase64 = null, string $model = 'gemini-2.5-flash'): string {
    $url = GEMINI_BASE_URL . "/models/{$model}:generateContent?key=" . GEMINI_API_KEY;

    $contents = [];
    // system as first user turn
    $contents[] = ['role' => 'user', 'parts' => [['text' => $systemPrompt]]];
    $contents[] = ['role' => 'model', 'parts' => [['text' => 'Compris. Je suis prêt à vous assister.']]];

    foreach ($messages as $msg) {
        $role = $msg['role'] === 'model' ? 'model' : 'user';
        $contents[] = ['role' => $role, 'parts' => [['text' => $msg['text'] ?? '']]];
    }

    // Current user message
    $parts = [];
    if ($imageBase64) {
        $parts[] = ['inlineData' => ['mimeType' => 'image/jpeg', 'data' => $imageBase64]];
    }
    $parts[] = ['text' => $userMessage];
    $contents[] = ['role' => 'user', 'parts' => $parts];

    $body = ['contents' => $contents];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($body),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) throw new RuntimeException("cURL Error: $curlError");
    if ($httpCode !== 200) {
        $decoded = json_decode($response, true);
        $msg = $decoded['error']['message'] ?? "HTTP $httpCode";
        throw new RuntimeException("Gemini Chat Error: $msg");
    }

    $decoded = json_decode($response, true);
    return $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '';
}

/**
 * Appel Gemini image generation
 */
function callGeminiImage(string $prompt, ?string $referenceImageBase64 = null): string {
    $url = GEMINI_BASE_URL . "/models/gemini-2.0-flash-preview-image-generation:generateContent?key=" . GEMINI_API_KEY;

    $parts = [];
    if ($referenceImageBase64) {
        $mimeType = 'image/jpeg';
        if (str_starts_with($referenceImageBase64, 'data:')) {
            preg_match('/data:([^;]+);base64,(.+)/', $referenceImageBase64, $m);
            $mimeType = $m[1] ?? 'image/jpeg';
            $referenceImageBase64 = $m[2] ?? $referenceImageBase64;
        }
        $parts[] = ['inlineData' => ['mimeType' => $mimeType, 'data' => $referenceImageBase64]];
    }
    $parts[] = ['text' => $prompt];

    $body = [
        'contents' => [['parts' => $parts]],
        'generationConfig' => ['responseModalities' => ['TEXT', 'IMAGE']]
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($body),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT        => 180,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) throw new RuntimeException("cURL Error: $curlError");
    if ($httpCode !== 200) {
        $decoded = json_decode($response, true);
        $msg = $decoded['error']['message'] ?? "HTTP $httpCode";
        throw new RuntimeException("Image Gen Error: $msg");
    }

    $decoded = json_decode($response, true);
    $parts = $decoded['candidates'][0]['content']['parts'] ?? [];
    foreach ($parts as $part) {
        if (isset($part['inlineData']['data'])) return $part['inlineData']['data'];
    }
    throw new RuntimeException('Aucune image retournée par l\'API');
}

/**
 * Appel Gemini TTS
 */
function callGeminiTTS(string $text, string $voice = 'Kore'): string {
    $url = GEMINI_BASE_URL . "/models/gemini-2.5-flash-preview-tts:generateContent?key=" . GEMINI_API_KEY;

    $body = [
        'contents' => [['parts' => [['text' => $text]]]],
        'generationConfig' => [
            'responseModalities' => ['AUDIO'],
            'speechConfig' => [
                'voiceConfig' => ['prebuiltVoiceConfig' => ['voiceName' => $voice]]
            ]
        ]
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($body),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT        => 60,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        $decoded = json_decode($response, true);
        throw new RuntimeException($decoded['error']['message'] ?? "TTS HTTP $httpCode");
    }

    $decoded = json_decode($response, true);
    return $decoded['candidates'][0]['content']['parts'][0]['inlineData']['data']
        ?? throw new RuntimeException('Aucun audio retourné');
}

/**
 * Rate limiting simple (fichier-based)
 */
function checkRateLimit(string $ip): void {
    $dir = sys_get_temp_dir() . '/inkwell_rl/';
    if (!is_dir($dir)) mkdir($dir, 0750, true);
    $file = $dir . md5($ip) . '.json';
    $now = time();
    $window = 60;

    $data = file_exists($file) ? json_decode(file_get_contents($file), true) : ['count' => 0, 'start' => $now];
    if ($now - $data['start'] > $window) $data = ['count' => 0, 'start' => $now];
    $data['count']++;

    if ($data['count'] > RATE_LIMIT_PER_MINUTE) {
        jsonError('Trop de requêtes. Veuillez patienter.', 429);
    }
    file_put_contents($file, json_encode($data));
}
