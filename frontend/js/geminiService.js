// ============================
// INKWELL PRO — GEMINI SERVICE
// Appels via backend PHP (proxy sécurisé)
// ============================

const API_BASE = './api'; // backend PHP

// ---- Génération de contenu de chapitre ----
export async function generateChapterContent(book, chapterIndex, specificPrompt) {
  const previousChapters = book.chapters
    .slice(0, chapterIndex)
    .map((c, i) => `Chapitre ${i + 1} (${c.title}):\n${c.content}`)
    .join('\n---\n');

  const genres = book.genre2 ? `${book.genre} et ${book.genre2}` : book.genre;
  const prompt = `Tu es un Rédacteur Littéraire Virtuel de haut niveau.
Livre actuel: "${book.title}"
Genre(s): ${genres}
Résumé global: ${book.summary}

CONTEXTE DES CHAPITRES PRÉCÉDENTS:
${previousChapters}

TACHE: Rédige le contenu intégral du Chapitre ${chapterIndex + 1}.
DIRECTIVES DE L'UTILISATEUR: ${specificPrompt || "Continue l'histoire naturellement."}

RÈGLES CRITIQUES:
1. Respecte scrupuleusement le style ${book.languageStyle}.
2. Évite tout hors-sujet par rapport au résumé global.
3. Le texte doit être immersif et riche en détails sensoriels.
4. Langue: Français.`;

  const res = await fetch(`${API_BASE}/generate.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model: 'gemini-2.5-pro-preview-06-05' })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur génération');
  return data.text;
}

// ---- Chat éditeur (historique multi-tours) ----
export async function sendChatMessage(book, editorContent, messages, userMessage, imageBase64 = null) {
  const genres = book.genre2 ? `${book.genre} et ${book.genre2}` : book.genre;
  const fullBookContext = book.chapters
    .map((ch, idx) => `CHAPITRE ${idx + 1}: ${ch.title}\n${ch.content}`)
    .join('\n\n---\n\n');

  const systemPrompt = `Tu es l'assistant de rédaction omniscient pour l'œuvre intitulée "${book.title}" (${genres}).
TON RÔLE:
1. Tu as accès à l'INTÉGRALITÉ des chapitres déjà écrits pour garantir une cohérence parfaite.
2. Tu gères les liaisons entre chapitres, le foreshadowing et la continuité des personnages.
3. Tu vérifies si le contenu respecte le résumé: "${book.summary}".
4. Tu peux rédiger des suites, transitions ou scènes entières.

CONTENU DE L'ŒUVRE:
${fullBookContext || "[Aucun chapitre rédigé]"}

TEXTE EN COURS D'ÉDITION:
"${editorContent || "[Éditeur vide]"}"`;

  const res = await fetch(`${API_BASE}/chat.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      messages,
      userMessage,
      imageBase64,
      model: 'gemini-2.5-pro-preview-06-05'
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur chat');
  return data.text;
}

// ---- Analyse image pour passage littéraire ----
export async function analyzeImageForPassage(base64Image, userContext, book) {
  const genres = book.genre2 ? `${book.genre} et ${book.genre2}` : book.genre;
  const prompt = `Intègre cette image dans le livre "${book.title}".
Contexte utilisateur: ${userContext}
Genre(s): ${genres}
Rédige un passage littéraire descriptif qui s'insère dans l'histoire en tenant compte du style global.`;

  const res = await fetch(`${API_BASE}/generate.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageBase64: base64Image, model: 'gemini-2.5-pro-preview-06-05' })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur vision');
  return data.text;
}

// ---- Génération couverture ----
export async function generateCoverImage(book, prompt, base64ReferenceImage, target = 'front') {
  const genres = book.genre2 ? `${book.genre} et ${book.genre2}` : book.genre;
  const bookContext = `TITRE: "${book.title}" | AUTEUR: "${book.author || ''}" | GENRES: ${genres} | RÉSUMÉ: ${book.summary.substring(0, 500)}`;

  let fullPrompt;
  if (target === 'front') {
    fullPrompt = `Artistic book cover illustration. CONTEXTE: ${bookContext}. INSTRUCTIONS VISUELLES: ${prompt}. CRITICAL: Professional, cinematic, atmospheric book cover. ONLY allowed text: Title "${book.title}" and Author "${book.author || ''}". No other text. Use elegant calligraphic fonts.`;
  } else {
    fullPrompt = `Back cover illustration. CONTEXTE: ${bookContext}. INSTRUCTIONS VISUELLES: ${prompt}. CRITICAL: Atmospheric back cover. STRICTLY NO TEXT. Only visual art.`;
  }

  const res = await fetch(`${API_BASE}/cover.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: fullPrompt, referenceImage: base64ReferenceImage || null })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur génération couverture');
  return data.imageBase64;
}

// ---- Text to Speech ----
export async function generateSpeech(text) {
  const res = await fetch(`${API_BASE}/speech.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.substring(0, 1500) })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur TTS');
  return data.audioBase64;
}

// ---- Génération noms de personnages ----
export async function generateCharacterNames(book, genre, keywords) {
  const prompt = `Génère une liste de 10 noms de personnages originaux et évocateurs pour un livre de genre "${genre}".
Mots-clés/Contexte: ${keywords}.
Titre du livre: ${book.title}.
Résumé: ${book.summary}
Réponds UNIQUEMENT avec un tableau JSON de strings. Exemple: ["Nom1","Nom2"]`;

  const res = await fetch(`${API_BASE}/generate.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model: 'gemini-2.5-flash', jsonMode: true })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur génération noms');
  try { return JSON.parse(data.text); } catch { return []; }
}
