<?php
// ============================
// INKWELL PRO — API: AUTHENTIFICATION
// POST /api/auth.php?action=register  → inscription
// POST /api/auth.php?action=login     → connexion
// GET  /api/auth.php?action=me        → profil
// POST /api/auth.php?action=logout    → déconnexion
// ============================
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/helpers.php';

setCorsHeaders();

$action = sanitizeText($_GET['action'] ?? '', 20);
$method = $_SERVER['REQUEST_METHOD'];

// ---- Helpers JWT simples ----
function createJWT(array $payload): string {
    $header  = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64_encode(json_encode(array_merge($payload, ['exp' => time() + 86400 * 30])));
    $sig     = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$sig";
}

function verifyJWT(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $payload, $sig] = $parts;
    $expectedSig = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($expectedSig, $sig)) return null;
    $data = json_decode(base64_decode($payload), true);
    if ($data['exp'] < time()) return null;
    return $data;
}

function getAuthUser(): ?array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    if (str_starts_with($header, 'Bearer ')) $token = substr($header, 7);
    else $token = $header;
    if (!$token) return null;
    $payload = verifyJWT($token);
    if (!$payload) return null;
    try {
        $db   = Database::getConnection();
        $stmt = $db->prepare('SELECT id, email, username, created_at FROM users WHERE id = ?');
        $stmt->execute([$payload['sub']]);
        return $stmt->fetch() ?: null;
    } catch (\Throwable $e) { return null; }
}

// ---- REGISTER ----
if ($action === 'register' && $method === 'POST') {
    $body     = getJsonBody();
    $email    = filter_var($body['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $username = sanitizeText($body['username'] ?? '', 50);
    $password = $body['password'] ?? '';

    if (!$email)               jsonError('Email invalide');
    if (strlen($username) < 2) jsonError('Nom d\'utilisateur trop court');
    if (strlen($password) < 8) jsonError('Mot de passe trop court (min 8 caractères)');

    $db = Database::getConnection();

    $check = $db->prepare('SELECT id FROM users WHERE email = ?');
    $check->execute([$email]);
    if ($check->fetch()) jsonError('Cet email est déjà utilisé', 409);

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
    $stmt = $db->prepare('INSERT INTO users (email, username, password_hash, created_at) VALUES (?, ?, ?, NOW())');
    $stmt->execute([$email, $username, $hash]);
    $userId = $db->lastInsertId();

    $token = createJWT(['sub' => $userId, 'email' => $email]);
    jsonResponse(['token' => $token, 'user' => ['id' => $userId, 'email' => $email, 'username' => $username]], 201);
}

// ---- LOGIN ----
if ($action === 'login' && $method === 'POST') {
    $body     = getJsonBody();
    $email    = filter_var($body['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $password = $body['password'] ?? '';

    if (!$email || !$password) jsonError('Email et mot de passe requis');

    $db   = Database::getConnection();
    $stmt = $db->prepare('SELECT id, email, username, password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonError('Email ou mot de passe incorrect', 401);
    }

    // Update last login
    $db->prepare('UPDATE users SET last_login=NOW() WHERE id=?')->execute([$user['id']]);

    $token = createJWT(['sub' => $user['id'], 'email' => $user['email']]);
    jsonResponse(['token' => $token, 'user' => ['id' => $user['id'], 'email' => $user['email'], 'username' => $user['username']]]);
}

// ---- ME ----
if ($action === 'me' && $method === 'GET') {
    $user = getAuthUser();
    if (!$user) jsonError('Non authentifié', 401);
    jsonResponse(['user' => $user]);
}

// ---- LOGOUT ----
if ($action === 'logout' && $method === 'POST') {
    // JWT stateless — le client supprime son token
    jsonResponse(['success' => true]);
}

jsonError('Action non reconnue', 400);
