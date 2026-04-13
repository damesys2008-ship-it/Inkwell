# ✒️ Inkwell Pro

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![PHP](https://img.shields.io/badge/PHP-8.1+-purple)
![Licence](https://img.shields.io/badge/licence-MIT-green)

> Créez, rédigez et publiez vos œuvres littéraires avec l'aide de l'intelligence artificielle Google Gemini.

---

## 📁 Structure du projet

```
inkwell/
├── frontend/                  ← Site web (HTML/CSS/JS vanilla)
│   ├── index.html             ← Page principale + modales légales
│   ├── .htaccess              ← Config Apache (SPA routing)
│   ├── css/
│   │   └── style.css          ← Tous les styles
│   ├── js/
│   │   ├── app.js             ← Application principale
│   │   ├── data.js            ← Genres, langues, traductions
│   │   ├── geminiService.js   ← Appels API (via proxy PHP)
│   │   ├── genreSelector.js   ← Composant sélecteur de genre
│   │   ├── pdfExport.js       ← Export PDF (jsPDF)
│   │   └── audio.js           ← Décodage audio TTS
│   └── pages/                 ← (pages futures : login, etc.)
│
├── backend/                   ← API REST PHP
│   ├── .htaccess              ← Sécurité Apache
│   ├── config/
│   │   ├── config.php         ← ⚠️ Clés API, BDD — À CONFIGURER
│   │   └── database.php       ← Connexion PDO MySQL
│   ├── utils/
│   │   └── helpers.php        ← CORS, JSON, appels Gemini, rate limit
│   └── api/
│       ├── generate.php       ← POST /api/generate   (texte IA)
│       ├── chat.php           ← POST /api/chat        (chat multi-tour)
│       ├── cover.php          ← POST /api/cover       (génération image)
│       ├── speech.php         ← POST /api/speech      (TTS)
│       ├── books.php          ← CRUD /api/books       (manuscrits BDD)
│       └── auth.php           ← /api/auth             (register/login)
│
└── database/
    └── inkwell_db.sql         ← Script de création MySQL complet
```

---

## 🚀 Installation

### Prérequis

| Outil | Version minimale |
|-------|-----------------|
| PHP | 8.1+ |
| MySQL / MariaDB | 8.0+ / 10.6+ |
| Serveur web | Apache 2.4+ (ou Nginx) |
| Extension PHP | `curl`, `pdo_mysql`, `json`, `mbstring` |

### 1. Cloner / décompresser le projet

```bash
unzip inkwell_pro.zip -d /var/www/html/inkwell
```

### 2. Créer la base de données

```bash
mysql -u root -p < database/inkwell_db.sql
```

> ⚠️ Modifiez le mot de passe dans le script SQL avant l'exécution !

### 3. Configurer le backend

Éditez `backend/config/config.php` :

```php
define('GEMINI_API_KEY', 'AIza...');   // Votre clé Google Gemini
define('DB_HOST', 'localhost');
define('DB_NAME', 'inkwell_db');
define('DB_USER', 'inkwell_user');
define('DB_PASS', 'votre_mot_de_passe');
define('JWT_SECRET', 'une_chaine_aleatoire_longue_et_securisee');
define('CORS_ORIGIN', 'https://votredomaine.com'); // En production
```

### 4. Configurer le frontend

Dans `frontend/js/geminiService.js`, vérifiez le chemin vers l'API :

```js
const API_BASE = './api'; // ou 'https://votredomaine.com/api'
```

### 5. Configuration Apache

**Virtual Host exemple :**

```apache
<VirtualHost *:80>
    ServerName inkwell.votredomaine.com
    DocumentRoot /var/www/html/inkwell/frontend

    Alias /api /var/www/html/inkwell/backend/api

    <Directory /var/www/html/inkwell/frontend>
        AllowOverride All
        Require all granted
    </Directory>

    <Directory /var/www/html/inkwell/backend/api>
        AllowOverride All
        Require all granted
    </Directory>

    # Protéger le dossier config
    <Directory /var/www/html/inkwell/backend/config>
        Require all denied
    </Directory>
</VirtualHost>
```

Puis activez le mod_rewrite :

```bash
a2enmod rewrite headers deflate
systemctl restart apache2
```

---

## 🔑 Obtenir une clé API Gemini

1. Rendez-vous sur [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Créez un projet Google Cloud si nécessaire
3. Générez une clé API
4. Collez-la dans `backend/config/config.php`

---

## 🗄️ Schéma de la base de données

```
users
├── id (PK)
├── email (UNIQUE)
├── username
├── password_hash (bcrypt)
├── last_login
└── created_at

books
├── id (PK, varchar)
├── user_id (FK → users)
├── title, author, genre, genre2
├── language, language_style
├── summary (TEXT)
├── chapters (LONGTEXT JSON)
├── chat_history (LONGTEXT JSON)
├── cover_image (LONGTEXT base64)
├── back_cover_image (LONGTEXT base64)
├── is_complete
└── created_at, updated_at

api_usage (audit)
├── user_id, action_type, model
├── tokens_in, tokens_out, duration_ms
└── created_at
```

---

## 🔐 Sécurité

- ✅ Clé API Gemini **jamais exposée** côté client
- ✅ Mots de passe hashés avec **bcrypt** (cost 12)
- ✅ Authentification par **JWT** (expire après 30 jours)
- ✅ **Rate limiting** : 20 requêtes/minute par IP
- ✅ Validation et sanitisation de toutes les entrées
- ✅ Protection des répertoires sensibles via `.htaccess`
- ✅ Headers de sécurité HTTP (XSS, CSRF, Clickjacking)

---

## 📡 Endpoints API

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/api/generate.php` | Génération texte IA | Non |
| POST | `/api/chat.php` | Chat multi-tour | Non |
| POST | `/api/cover.php` | Génération couverture | Non |
| POST | `/api/speech.php` | Text-to-Speech | Non |
| GET/POST/PUT/DELETE | `/api/books.php` | CRUD manuscrits | Oui |
| POST | `/api/auth.php?action=register` | Inscription | Non |
| POST | `/api/auth.php?action=login` | Connexion | Non |
| GET | `/api/auth.php?action=me` | Profil | Oui |

---

## 🗺️ Roadmap

- [x] Création de livres assistée par IA
- [x] Éditeur de chapitres avec auto-save
- [x] Génération de couvertures IA
- [x] Narration TTS
- [x] Export PDF avec sommaire
- [x] Backend PHP + Base de données
- [x] Authentification JWT
- [ ] Interface de connexion/inscription
- [ ] Synchronisation cloud des manuscrits
- [ ] Export EPUB
- [ ] Abonnements (Stripe)
- [ ] Mode collaboratif

---

## 📞 Contact

**Concepteur :** Samir MAMA  
**Email :** damesys2008@gmail.com  
**LinkedIn :** [Samir MAMA](https://www.linkedin.com/in/samir-mama)

---

## 📄 Licence

Ce projet est distribué sous la **licence MIT**.
