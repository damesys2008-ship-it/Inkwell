<?php
// ============================
// INKWELL PRO — API: LIVRES (CRUD)
// GET    /api/books.php          → liste des livres de l'utilisateur
// POST   /api/books.php          → créer un livre
// PUT    /api/books.php?id=xxx   → mettre à jour
// DELETE /api/books.php?id=xxx   → supprimer
// ============================
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/helpers.php';
require_once __DIR__ . '/auth.php'; // pour getAuthUser()

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$user   = getAuthUser(); // null si non connecté

if (!$user) jsonError('Non authentifié', 401);

$db  = Database::getConnection();
$uid = (int)$user['id'];

// ---- GET — liste ----
if ($method === 'GET') {
    $stmt = $db->prepare('SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$uid]);
    $books = $stmt->fetchAll();

    // Décoder le JSON des chapitres/chatHistory
    foreach ($books as &$book) {
        $book['chapters']    = json_decode($book['chapters'] ?? '[]', true);
        $book['chatHistory'] = json_decode($book['chat_history'] ?? '[]', true);
        unset($book['chat_history'], $book['user_id']);
    }

    jsonResponse(['books' => $books]);
}

// ---- POST — créer ----
if ($method === 'POST') {
    $body = getJsonBody();
    $id   = sanitizeText($body['id'] ?? uniqid('book_', true), 100);

    $stmt = $db->prepare('
        INSERT INTO books (id, user_id, title, author, genre, genre2, language, language_style, summary, chapters, chat_history, cover_image, back_cover_image, is_complete, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title=VALUES(title), author=VALUES(author), genre=VALUES(genre), genre2=VALUES(genre2),
          language=VALUES(language), language_style=VALUES(language_style), summary=VALUES(summary),
          chapters=VALUES(chapters), chat_history=VALUES(chat_history),
          cover_image=VALUES(cover_image), back_cover_image=VALUES(back_cover_image),
          is_complete=VALUES(is_complete), updated_at=NOW()
    ');

    $stmt->execute([
        $id, $uid,
        sanitizeText($body['title'] ?? '', 500),
        sanitizeText($body['author'] ?? '', 200),
        sanitizeText($body['genre'] ?? '', 100),
        sanitizeText($body['genre2'] ?? '', 100),
        sanitizeText($body['language'] ?? 'fr', 10),
        sanitizeText($body['languageStyle'] ?? 'Soutenu', 50),
        sanitizeText($body['summary'] ?? '', 5000),
        json_encode($body['chapters'] ?? [], JSON_UNESCAPED_UNICODE),
        json_encode($body['chatHistory'] ?? [], JSON_UNESCAPED_UNICODE),
        $body['coverImage'] ?? null,
        $body['backCoverImage'] ?? null,
        (int)($body['isComplete'] ?? 0),
        date('Y-m-d H:i:s', ($body['createdAt'] ?? time()) / 1000)
    ]);

    jsonResponse(['success' => true, 'id' => $id], 201);
}

// ---- PUT — mettre à jour ----
if ($method === 'PUT') {
    $id   = sanitizeText($_GET['id'] ?? '', 100);
    if (!$id) jsonError('ID requis');
    $body = getJsonBody();

    // Vérifier ownership
    $check = $db->prepare('SELECT id FROM books WHERE id = ? AND user_id = ?');
    $check->execute([$id, $uid]);
    if (!$check->fetch()) jsonError('Livre introuvable', 404);

    $stmt = $db->prepare('
        UPDATE books SET
          title=?, author=?, genre=?, genre2=?, language=?, language_style=?,
          summary=?, chapters=?, chat_history=?, cover_image=?, back_cover_image=?,
          is_complete=?, updated_at=NOW()
        WHERE id=? AND user_id=?
    ');

    $stmt->execute([
        sanitizeText($body['title'] ?? '', 500),
        sanitizeText($body['author'] ?? '', 200),
        sanitizeText($body['genre'] ?? '', 100),
        sanitizeText($body['genre2'] ?? '', 100),
        sanitizeText($body['language'] ?? 'fr', 10),
        sanitizeText($body['languageStyle'] ?? 'Soutenu', 50),
        sanitizeText($body['summary'] ?? '', 5000),
        json_encode($body['chapters'] ?? [], JSON_UNESCAPED_UNICODE),
        json_encode($body['chatHistory'] ?? [], JSON_UNESCAPED_UNICODE),
        $body['coverImage'] ?? null,
        $body['backCoverImage'] ?? null,
        (int)($body['isComplete'] ?? 0),
        $id, $uid
    ]);

    jsonResponse(['success' => true]);
}

// ---- DELETE ----
if ($method === 'DELETE') {
    $id = sanitizeText($_GET['id'] ?? '', 100);
    if (!$id) jsonError('ID requis');

    $stmt = $db->prepare('DELETE FROM books WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $uid]);

    jsonResponse(['success' => true]);
}

jsonError('Méthode non supportée', 405);
