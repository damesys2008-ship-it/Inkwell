// ============================
// INKWELL PRO — DATA CONSTANTS
// ============================

export const LANGUAGE_STYLES = ["Soutenu", "Contemporain", "Populaire", "Poétique", "Scientifique"];

export const GENRE_CATEGORIES = [
  { name: "Fondamentaux", genres: ["Roman","Nouvelle","Poésie","Théâtre","Essai","Conte","Fable","Biographie","Autobiographie","Mémoires","Journal intime"] },
  { name: "Fiction Spécialisée", genres: ["Fiction générale","Fiction littéraire","Fiction contemporaine","Fiction psychologique","Fiction réaliste"] },
  { name: "Imaginaire", genres: ["Science-fiction","Fantasy","Fantasy épique","Dark fantasy","Fantastique","Uchronie","Dystopie","Anticipation","Space opera","Steampunk","Cyberpunk"] },
  { name: "Suspense", genres: ["Policier","Dark Romance","Thriller","Thriller psychologique","Thriller politique","Espionnage","Enquête","Suspense"] },
  { name: "Emotionnel", genres: ["Romance","Romance contemporaine","Romance historique","Romance dramatique","Erotic Romance","Chick lit","Feel-good","Drame","Tragédie"] },
  { name: "Historique & Réel", genres: ["Roman historique","Fresque historique","Fiction biographique","Saga familiale","Récit de guerre","Témoignage","Chronique sociale"] },
  { name: "Jeunesse", genres: ["Littérature jeunesse","Album jeunesse","Conte pour enfants","Roman jeunesse","Young Adult (YA)","Fantasy jeunesse","Aventure jeunesse"] },
  { name: "Aventure", genres: ["Aventure","Action","Survival","Exploration","Western","Pirates","Road trip"] },
  { name: "Intellectuel", genres: ["Philosophique","Psychologique","Métaphysique","Existentialiste","Allégorique","Symbolique"] },
  { name: "Non-Fiction", genres: ["Développement personnel","Psychologie","Business","Entrepreneuriat","Finance","Marketing","Leadership","Spiritualité","Religion","Sciences","Histoire","Sociologie"] },
  { name: "Formats Modernes", genres: ["Docu-fiction","Autofiction","Roman graphique","Light novel","Web novel","Fanfiction","Livre interactif","Livre épistolaire"] },
  { name: "Expérimental", genres: ["Fiction spéculative","Fiction absurde","Surréalisme","Minimalisme narratif","Écriture automatique","Métaroman","Fiction fragmentée"] }
];

export const LANGUAGE_LIST = [
  { code: 'fr', label: 'Français' }, { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' }, { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },    { code: 'ar', label: 'العربية' }
];

export const TRANSLATIONS = {
  fr: {
    welcome: "Bienvenue dans Inkwell", welcomeSub: "L'espace où vos idées prennent vie. Gérez vos manuscrits, affinez votre style avec notre assistant omniscient et explorez de nouveaux horizons littéraires.",
    startManuscript: "Démarrer un manuscrit", myManuscripts: "Vos Manuscrits", newBook: "Nouveau Livre",
    library: "Bibliothèque", assistant: "Assistant", editor: "Éditeur", plan: "Plan",
    saved: "Sauvé", modified: "Modifié", all: "Tous",
    backToLibrary: "Retour à la bibliothèque", configTitle: "Configuration du Livre",
    configSubtitle: '"Tracez les contours de votre futur chef-d\'œuvre."',
    tempTitle: "Titre provisoire", author: "Auteur",
    mainGenre: "Genre Narratif 1 (Obligatoire)", secondaryGenre: "Genre narratif 2 (Facultatif)",
    languageStyle: "Style de langage", bookLanguage: "Langue de rédaction",
    summary: "Résumé complet de l'intrigue et informations complémentaires",
    launchWriting: "Lancer la Rédaction",
    narrativeGenre: "Genre Narratif", searchGenre: "Rechercher un genre...", selectGenre: "Sélectionnez un genre...",
    rename: "Renommer", readAloud: "Narration", saveChapter: "Sauvegarder",
    chapter: "Chapitre", newChapter: "Nouveau chapitre", autoSave: "Sauvegarde automatique",
    later: "Plus tard", confirm: "Confirmer", unsavedChanges: "Changements non sauvés",
    saveAndContinue: "Enregistrer et continuer", continueNoSave: "Continuer sans enregistrer",
    cancel: "Annuler", renameBook: "Renommer", saveSuccess: "Enregistré !",
    delete: "Supprimer", download: "Télécharger PDF",
    confirmDelete: "Voulez-vous vraiment supprimer ce manuscrit ? Cette action est irréversible.",
    toc: "Sommaire", page: "Page", next: "Suivant", prev: "Précédent",
    genFrontCover: "Couverture Avant", genBackCover: "Couverture Arrière",
    describeCover: "Décrivez l'ambiance visuelle souhaitée...", generating: "Génération par l'IA...",
    remove: "Supprimer", uploadImage: "Importer une image", useAsRef: "Référence IA", useDirect: "Utiliser directement",
    themeToggle: "Changer le thème", noManuscripts: "Aucun manuscrit trouvé.",
    Soutenu: "Soutenu", Contemporain: "Contemporain", Populaire: "Populaire", Poétique: "Poétique", Scientifique: "Scientifique"
  },
  en: {
    welcome: "Welcome to Inkwell", welcomeSub: "The space where your ideas come to life. Manage your manuscripts, refine your style with our omniscient assistant, and explore new literary horizons.",
    startManuscript: "Start a Manuscript", myManuscripts: "Your Manuscripts", newBook: "New Book",
    library: "Library", assistant: "Assistant", editor: "Editor", plan: "Plan",
    saved: "Saved", modified: "Modified", all: "All",
    backToLibrary: "Back to library", configTitle: "Book Configuration",
    configSubtitle: '"Outline your future masterpiece."',
    tempTitle: "Provisional title", author: "Author",
    mainGenre: "Narrative Genre 1 (Required)", secondaryGenre: "Narrative Genre 2 (Optional)",
    languageStyle: "Language style", bookLanguage: "Writing language",
    summary: "Full plot summary and additional information",
    launchWriting: "Launch Writing",
    narrativeGenre: "Narrative Genre", searchGenre: "Search genre...", selectGenre: "Select a genre...",
    rename: "Rename", readAloud: "Read Aloud", saveChapter: "Save",
    chapter: "Chapter", newChapter: "New Chapter", autoSave: "Auto-save",
    later: "Later", confirm: "Confirm", unsavedChanges: "Unsaved Changes",
    saveAndContinue: "Save and Continue", continueNoSave: "Continue without saving",
    cancel: "Cancel", renameBook: "Rename", saveSuccess: "Saved!",
    delete: "Delete", download: "Download PDF",
    confirmDelete: "Are you sure you want to delete this manuscript? This action cannot be undone.",
    toc: "Table of Contents", page: "Page", next: "Next", prev: "Previous",
    genFrontCover: "Front Cover", genBackCover: "Back Cover",
    describeCover: "Describe the desired visual mood...", generating: "AI Generating...",
    remove: "Remove", uploadImage: "Upload Image", useAsRef: "AI Reference", useDirect: "Use Directly",
    themeToggle: "Change Theme", noManuscripts: "No manuscripts found.",
    Soutenu: "Sophisticated", Contemporain: "Contemporary", Populaire: "Casual", Poétique: "Poetic", Scientifique: "Scientific"
  }
};
