-- ================================================
-- INKWELL PRO — SCRIPT DE CRÉATION DE LA BASE DE DONNÉES
-- MySQL / MariaDB
-- Exécuter avec : mysql -u root -p < inkwell_db.sql
-- ================================================

-- 1. Créer la base de données
CREATE DATABASE IF NOT EXISTS inkwell_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE inkwell_db;

-- 2. Créer l'utilisateur dédié
-- (Remplacez 'VOTRE_MOT_DE_PASSE_BDD_ICI' par un mot de passe sécurisé)
CREATE USER IF NOT EXISTS 'inkwell_user'@'localhost'
  IDENTIFIED BY 'VOTRE_MOT_DE_PASSE_BDD_ICI';

GRANT SELECT, INSERT, UPDATE, DELETE ON inkwell_db.* TO 'inkwell_user'@'localhost';
FLUSH PRIVILEGES;

-- ================================================
-- TABLE: users
-- ================================================
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    email         VARCHAR(255)     NOT NULL,
    username      VARCHAR(100)     NOT NULL,
    password_hash VARCHAR(255)     NOT NULL,
    avatar_url    VARCHAR(500)     NULL,
    is_active     TINYINT(1)       NOT NULL DEFAULT 1,
    last_login    DATETIME         NULL,
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email),
    INDEX idx_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Utilisateurs Inkwell Pro';

-- ================================================
-- TABLE: books (manuscrits)
-- ================================================
CREATE TABLE IF NOT EXISTS books (
    id                VARCHAR(100)     NOT NULL,
    user_id           INT UNSIGNED     NOT NULL,
    title             VARCHAR(500)     NOT NULL DEFAULT '',
    author            VARCHAR(200)     NULL,
    genre             VARCHAR(100)     NULL,
    genre2            VARCHAR(100)     NULL,
    language          VARCHAR(10)      NOT NULL DEFAULT 'fr',
    language_style    VARCHAR(50)      NOT NULL DEFAULT 'Soutenu',
    summary           TEXT             NULL,

    -- Chapitres stockés en JSON (tableau d'objets {id, title, content, userPrompt})
    chapters          LONGTEXT         NOT NULL DEFAULT '[]'
                      CHECK (JSON_VALID(chapters)),

    -- Historique du chat stocké en JSON
    chat_history      LONGTEXT         NOT NULL DEFAULT '[]'
                      CHECK (JSON_VALID(chat_history)),

    -- Images de couverture en base64 (ou URL si stockage externe)
    cover_image       LONGTEXT         NULL,
    back_cover_image  LONGTEXT         NULL,

    is_complete       TINYINT(1)       NOT NULL DEFAULT 0,
    created_at        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_books_user_id (user_id),
    INDEX idx_books_genre (genre),
    INDEX idx_books_created (created_at),

    CONSTRAINT fk_books_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Manuscrits / livres des utilisateurs';

-- ================================================
-- TABLE: sessions (optionnel - pour audit)
-- ================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    ip_address  VARCHAR(45)  NOT NULL,
    user_agent  TEXT         NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_sessions_user (user_id),
    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Sessions utilisateurs (audit)';

-- ================================================
-- TABLE: api_usage (suivi des appels IA)
-- ================================================
CREATE TABLE IF NOT EXISTS api_usage (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id      INT UNSIGNED NULL,
    action_type  VARCHAR(50)  NOT NULL COMMENT 'generate|chat|cover|speech',
    model        VARCHAR(100) NULL,
    tokens_in    INT UNSIGNED NULL,
    tokens_out   INT UNSIGNED NULL,
    duration_ms  INT UNSIGNED NULL,
    success      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_api_user (user_id),
    INDEX idx_api_type (action_type),
    INDEX idx_api_date (created_at),

    CONSTRAINT fk_api_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Suivi des appels à l\'API Gemini';

-- ================================================
-- DONNÉES DE TEST (optionnel — retirer en prod)
-- ================================================
-- Utilisateur de démo: demo@inkwell.pro / demo1234
INSERT IGNORE INTO users (email, username, password_hash) VALUES
  ('demo@inkwell.pro', 'DemoUser', '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
-- Le hash correspond au mot de passe 'password' (bcrypt cost 12)
-- !! CHANGEZ CE MOT DE PASSE EN PRODUCTION !!

-- ================================================
-- VUES UTILES
-- ================================================

-- Vue résumé des livres (sans les gros champs)
CREATE OR REPLACE VIEW v_books_summary AS
SELECT
    b.id,
    b.user_id,
    u.username AS author_name,
    b.title,
    b.author,
    b.genre,
    b.genre2,
    b.language,
    b.is_complete,
    JSON_LENGTH(b.chapters) AS chapter_count,
    b.created_at,
    b.updated_at
FROM books b
JOIN users u ON u.id = b.user_id;

-- Vue statistiques par utilisateur
CREATE OR REPLACE VIEW v_user_stats AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    COUNT(b.id) AS total_books,
    SUM(JSON_LENGTH(b.chapters)) AS total_chapters,
    MAX(b.updated_at) AS last_activity
FROM users u
LEFT JOIN books b ON b.user_id = u.id
GROUP BY u.id, u.username, u.email;

-- ================================================
-- FIN DU SCRIPT
-- ================================================
SELECT 'Base de données Inkwell Pro créée avec succès !' AS message;
