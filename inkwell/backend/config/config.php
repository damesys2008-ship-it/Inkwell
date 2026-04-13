<?php
// ============================
// INKWELL PRO — CONFIGURATION
// ============================

// ---- Gemini API ----
define('GEMINI_API_KEY', 'VOTRE_CLE_GEMINI_ICI');
define('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta');

// ---- Base de données ----
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'inkwell_db');
define('DB_USER', 'inkwell_user');
define('DB_PASS', 'VOTRE_MOT_DE_PASSE_BDD_ICI');
define('DB_CHARSET', 'utf8mb4');

// ---- Sécurité ----
define('JWT_SECRET', 'VOTRE_SECRET_JWT_ICI_CHANGEZ_MOI');
define('BCRYPT_COST', 12);

// ---- Environnement ----
define('APP_ENV', 'development'); // 'production' en prod
define('APP_URL', 'http://localhost');
define('CORS_ORIGIN', '*'); // En prod : votre domaine

// ---- Limites ----
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5 Mo
define('MAX_PROMPT_LENGTH', 10000);
define('RATE_LIMIT_PER_MINUTE', 20);

// ---- Activer les erreurs en dev ----
if (APP_ENV === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}
