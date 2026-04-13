// ============================
// INKWELL PRO — APP PRINCIPAL
// ============================
import { TRANSLATIONS, LANGUAGE_LIST, LANGUAGE_STYLES } from './data.js';
import { GenreSelector } from './genreSelector.js';
import { downloadBookAsPDF } from './pdfExport.js';
import { sendChatMessage, analyzeImageForPassage, generateCoverImage, generateSpeech } from './geminiService.js';
import { decodeBase64, decodeAudioData } from './audio.js';

// ---- État global ----
const state = {
  uiLang: 'fr',
  theme: 'dark',
  view: 'library',      // library | architect | workshop
  activeTab: 'plan',    // assistant | editor | plan
  books: [],
  activeBook: null,
  activeChapterIndex: 0,
  editorContent: '',
  lastSavedContent: '',
  isDirty: false,
  genreFilter: 'Tous',
  isSpeaking: false,
  saveSuccess: false,
  showLangMenu: false,
  activeMenuId: null,
  confirmDeleteId: null,
  isEditingTitle: false,
  pendingTitle: '',
  pendingTab: null,
  pendingChapterIndex: null,
  showAutoSavePrompt: false,
  isCoverMenuOpen: false,
  coverTarget: null,
  coverPrompt: '',
  coverTitle: '',
  coverAuthor: '',
  isGeneratingCover: false,
  uploadedCoverImage: null,
  useUploadAsReference: true,
  chatMessages: [],
  isChatLoading: false,
  chatInput: '',
  chatImage: null,
  audioContext: null,
  audioSource: null,
  genreSelectorMain: null,
  genreSelectorSecondary: null,
  autoSaveTimer: null,
};

function t(key) {
  return TRANSLATIONS[state.uiLang]?.[key] || TRANSLATIONS['en']?.[key] || key;
}

// ---- Persistence ----
function loadStorage() {
  try {
    const books = localStorage.getItem('inkwell_books');
    if (books) state.books = JSON.parse(books);
    const lang = localStorage.getItem('inkwell_ui_lang');
    if (lang) state.uiLang = lang;
    const theme = localStorage.getItem('inkwell_theme');
    if (theme) state.theme = theme;
  } catch(e) {}
}

function saveStorage(booksOverride) {
  const books = booksOverride || state.books;
  localStorage.setItem('inkwell_books', JSON.stringify(books));
}

function persistLang() { localStorage.setItem('inkwell_ui_lang', state.uiLang); }
function persistTheme() { localStorage.setItem('inkwell_theme', state.theme); }

// ---- Save active book ----
function saveCurrentBook() {
  if (!state.activeBook) return;
  const chapters = [...state.activeBook.chapters];
  if (chapters[state.activeChapterIndex]) {
    chapters[state.activeChapterIndex] = { ...chapters[state.activeChapterIndex], content: state.editorContent };
  }
  state.activeBook = { ...state.activeBook, chapters };
  state.books = state.books.map(b => b.id === state.activeBook.id ? state.activeBook : b);
  saveStorage();
  state.lastSavedContent = state.editorContent;
  state.isDirty = false;
  if (state.autoSaveTimer) clearInterval(state.autoSaveTimer);
}

// ---- Theme ----
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  persistTheme();
}

// ---- Generate unique ID ----
function uid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2); }

// ============================
// RENDER FUNCTIONS
// ============================

function render() {
  renderHeader();
  renderView();
  renderFooter();
}

// ---- HEADER ----
function renderHeader() {
  const root = document.getElementById('root');
  let header = document.getElementById('app-header');
  if (!header) {
    header = document.createElement('header');
    header.id = 'app-header';
    root.prepend(header);
  }

  const isWorkshop = state.view === 'workshop';
  const currentLangLabel = LANGUAGE_LIST.find(l => l.code === state.uiLang)?.label || 'FR';

  header.innerHTML = `
    <div class="logo-btn" id="btn-go-library">
      <div class="logo-icon"><i class="fa-solid fa-pen-nib"></i></div>
      <span class="logo-text" style="display:none" id="logo-text-span">Inkwell</span>
    </div>

    ${isWorkshop ? `
    <div class="tab-bar">
      <button class="tab-btn ${state.activeTab==='assistant'?'active':''}" id="tab-assistant">
        <i class="fa-solid fa-feather"></i><span class="tab-label">Assistant</span>
      </button>
      <button class="tab-btn ${state.activeTab==='editor'?'active':''}" id="tab-editor">
        <i class="fa-solid fa-pen-fancy"></i><span class="tab-label">${t('editor')}</span>
      </button>
      <button class="tab-btn ${state.activeTab==='plan'?'active':''}" id="tab-plan">
        <i class="fa-solid fa-list-ol"></i><span class="tab-label">${t('plan')}</span>
      </button>
    </div>
    ` : ''}

    <div class="header-actions">
      <button class="icon-btn" id="btn-theme" title="${t('themeToggle')}">
        <i class="fa-solid ${state.theme === 'dark' ? 'fa-moon' : 'fa-sun'}"></i>
      </button>

      ${isWorkshop ? `
      <button class="save-btn ${state.isDirty ? 'dirty' : 'clean'}" id="btn-save-workshop">
        <i class="fa-solid fa-floppy-disk"></i>
        <span class="save-label">${state.isDirty ? t('modified') : t('saved')}</span>
      </button>
      <button class="icon-btn" id="btn-pdf" title="${t('download')}"><i class="fa-solid fa-file-pdf"></i></button>
      <div class="divider-v"></div>
      <button class="icon-btn" id="btn-back-library" title="${t('library')}"><i class="fa-solid fa-home"></i></button>
      ` : `
      <div class="relative">
        <button class="lang-btn" id="btn-lang">
          <i class="fa-solid fa-globe" style="font-size:11px;"></i>
          <span>${currentLangLabel}</span>
        </button>
        ${state.showLangMenu ? `
        <div class="lang-menu">
          ${LANGUAGE_LIST.map(l => `<button class="lang-item ${state.uiLang === l.code ? 'active' : ''}" data-code="${l.code}">${l.label}</button>`).join('')}
        </div>
        ` : ''}
      </div>
      `}
    </div>
  `;

  // Show logo text on larger screens
  const logoText = document.getElementById('logo-text-span');
  if (logoText && window.innerWidth >= 640) logoText.style.display = 'block';

  // Events
  document.getElementById('btn-go-library')?.addEventListener('click', () => goToLibrary());
  document.getElementById('btn-theme')?.addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); renderHeader(); });

  if (isWorkshop) {
    document.getElementById('tab-assistant')?.addEventListener('click', () => handleTabSwitch('assistant'));
    document.getElementById('tab-editor')?.addEventListener('click', () => handleTabSwitch('editor'));
    document.getElementById('tab-plan')?.addEventListener('click', () => handleTabSwitch('plan'));
    document.getElementById('btn-save-workshop')?.addEventListener('click', () => { saveCurrentBook(); renderHeader(); showSaveSuccess(); });
    document.getElementById('btn-pdf')?.addEventListener('click', () => state.activeBook && downloadBookAsPDF(state.activeBook, t));
    document.getElementById('btn-back-library')?.addEventListener('click', () => goToLibrary());
  } else {
    document.getElementById('btn-lang')?.addEventListener('click', (e) => { e.stopPropagation(); state.showLangMenu = !state.showLangMenu; renderHeader(); });
    document.querySelectorAll('.lang-item').forEach(btn => {
      btn.addEventListener('click', () => { state.uiLang = btn.dataset.code; state.showLangMenu = false; persistLang(); render(); });
    });
  }
}

// ---- VIEWS ----
function renderView() {
  let main = document.getElementById('app-main');
  if (!main) {
    main = document.createElement('main');
    main.id = 'app-main';
    document.getElementById('root').appendChild(main);
  }

  if (state.view === 'library') renderLibrary(main);
  else if (state.view === 'architect') renderArchitect(main);
  else if (state.view === 'workshop') renderWorkshop(main);
}

// ---- LIBRARY ----
function renderLibrary(main) {
  const filtered = state.genreFilter === 'Tous' || state.genreFilter === t('all')
    ? state.books
    : state.books.filter(b => b.genre === state.genreFilter || b.genre2 === state.genreFilter);

  const genres = [...new Set(state.books.flatMap(b => [b.genre, b.genre2].filter(Boolean)))].sort();

  main.innerHTML = `
    <div id="view-library" class="view active">
      <div style="max-width:1200px;margin:0 auto;width:100%;">
        <section class="hero-section animate-fade-in">
          <h2 class="hero-title font-serif">${t('welcome')}</h2>
          <p class="hero-sub">${t('welcomeSub')}</p>
          <button class="btn-primary" id="btn-new-book">${t('startManuscript')}</button>
        </section>

        <div class="section-header">
          <h3 class="section-title font-serif">${t('myManuscripts')}</h3>
          <div class="filter-bar">
            <button class="filter-btn ${state.genreFilter === 'Tous' ? 'active' : ''}" data-filter="Tous">${t('all')}</button>
            ${genres.map(g => `<button class="filter-btn ${state.genreFilter === g ? 'active' : ''}" data-filter="${g}">${g}</button>`).join('')}
          </div>
        </div>

        <div class="books-grid">
          ${filtered.length === 0 ? `<div class="empty-state">${t('noManuscripts')}</div>` :
            filtered.map(book => `
              <div class="book-card" data-book-id="${book.id}">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                  <span class="book-card-genre">${book.genre}</span>
                  <div class="relative">
                    <button class="book-card-menu-btn" data-menu-id="${book.id}"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                    ${state.activeMenuId === book.id ? `
                    <div class="dropdown-menu">
                      <button class="menu-download" data-book-id="${book.id}"><i class="fa-solid fa-file-pdf" style="color:#f59e0b;"></i> ${t('download')}</button>
                      <button class="menu-delete danger" data-book-id="${book.id}"><i class="fa-solid fa-trash-can"></i> ${t('delete')}</button>
                    </div>
                    ` : ''}
                  </div>
                </div>
                <h3 class="book-card-title">${book.title}</h3>
                <p class="book-card-summary">"${book.summary}"</p>
                <div class="book-card-meta"><i class="fa-solid fa-list-ol"></i> ${book.chapters.length} ${t('chapter')}s</div>
              </div>
            `).join('')}
        </div>
      </div>
    </div>
  `;

  // Events
  document.getElementById('btn-new-book')?.addEventListener('click', createNewBook);
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => { state.genreFilter = btn.dataset.filter; renderLibrary(main); });
  });
  document.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.book-card-menu-btn') || e.target.closest('.dropdown-menu')) return;
      const book = state.books.find(b => b.id === card.dataset.bookId);
      if (book) openBook(book);
    });
  });
  document.querySelectorAll('.book-card-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.menuId;
      state.activeMenuId = state.activeMenuId === id ? null : id;
      renderLibrary(main);
    });
  });
  document.querySelectorAll('.menu-download').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); const book = state.books.find(b => b.id === btn.dataset.bookId); if (book) downloadBookAsPDF(book, t); state.activeMenuId = null; });
  });
  document.querySelectorAll('.menu-delete').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); state.confirmDeleteId = btn.dataset.bookId; state.activeMenuId = null; renderDeleteModal(); });
  });
}

// ---- ARCHITECT ----
function renderArchitect(main) {
  if (!state.activeBook) return;
  const book = state.activeBook;

  main.innerHTML = `
    <div id="view-architect" class="view active">
      <div style="max-width:800px;margin:0 auto;width:100%;">
        <button class="back-btn" id="btn-back"><i class="fa-solid fa-arrow-left"></i>${t('backToLibrary')}</button>
        <div class="config-card manuscript-page animate-fade-in">
          <div class="config-header">
            <h2 class="config-title font-serif">${t('configTitle')}</h2>
            <p class="config-sub">${t('configSubtitle')}</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:2rem;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">${t('tempTitle')}</label>
                <input type="text" class="form-input" id="inp-title" value="${book.title}" placeholder="..." />
              </div>
              <div class="form-group">
                <label class="form-label">${t('author')}</label>
                <input type="text" class="form-input" id="inp-author" value="${book.author||''}" placeholder="..." />
              </div>
            </div>
            <div class="form-grid">
              <div id="genre-main-wrap"></div>
              <div id="genre-secondary-wrap"></div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">${t('languageStyle')}</label>
                <select class="form-select" id="sel-style">
                  ${LANGUAGE_STYLES.map(s => `<option value="${s}" ${book.languageStyle===s?'selected':''}>${t(s)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">${t('bookLanguage')}</label>
                <select class="form-select" id="sel-lang">
                  ${LANGUAGE_LIST.map(l => `<option value="${l.code}" ${book.language===l.code?'selected':''}>${l.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('summary')}</label>
              <textarea class="form-textarea" id="inp-summary" placeholder="...">${book.summary}</textarea>
            </div>
          </div>
          <button class="btn-launch" id="btn-launch">${t('launchWriting')}</button>
        </div>
      </div>
    </div>
  `;

  // Genre selectors
  state.genreSelectorMain = new GenreSelector('genre-main-wrap', {
    selectedGenre: book.genre,
    onSelect: (g) => { state.activeBook = { ...state.activeBook, genre: g }; updateLaunchBtn(); },
    labels: { narrativeGenre: t('mainGenre'), searchGenre: t('searchGenre'), selectGenre: t('selectGenre') }
  });
  state.genreSelectorSecondary = new GenreSelector('genre-secondary-wrap', {
    selectedGenre: book.genre2 || '',
    onSelect: (g) => { state.activeBook = { ...state.activeBook, genre2: g }; },
    labels: { narrativeGenre: t('secondaryGenre'), searchGenre: t('searchGenre'), selectGenre: t('selectGenre') }
  });

  // Live bindings
  document.getElementById('inp-title')?.addEventListener('input', e => { state.activeBook = { ...state.activeBook, title: e.target.value }; updateLaunchBtn(); });
  document.getElementById('inp-author')?.addEventListener('input', e => { state.activeBook = { ...state.activeBook, author: e.target.value }; });
  document.getElementById('inp-summary')?.addEventListener('input', e => { state.activeBook = { ...state.activeBook, summary: e.target.value }; updateLaunchBtn(); });
  document.getElementById('sel-style')?.addEventListener('change', e => { state.activeBook = { ...state.activeBook, languageStyle: e.target.value }; });
  document.getElementById('sel-lang')?.addEventListener('change', e => { state.activeBook = { ...state.activeBook, language: e.target.value }; });
  document.getElementById('btn-back')?.addEventListener('click', () => setView('library'));
  document.getElementById('btn-launch')?.addEventListener('click', finalizeArchitect);
  updateLaunchBtn();
}

function updateLaunchBtn() {
  const btn = document.getElementById('btn-launch');
  if (!btn) return;
  const b = state.activeBook;
  btn.disabled = !b?.title || !b?.genre || !b?.summary;
}

// ---- WORKSHOP ----
function renderWorkshop(main) {
  main.innerHTML = `
    <div id="view-workshop" class="view active">
      <div class="workshop-inner" style="height:calc(100vh - 72px);overflow:hidden;display:flex;flex-direction:column;">
        <div id="workshop-content" style="flex:1;overflow:hidden;display:flex;flex-direction:column;">
          ${state.activeTab === 'plan' ? renderPlanHTML() : ''}
          ${state.activeTab === 'editor' ? renderEditorHTML() : ''}
          ${state.activeTab === 'assistant' ? renderAssistantHTML() : ''}
        </div>
      </div>
    </div>
  `;

  if (state.activeTab === 'plan') bindPlanEvents();
  if (state.activeTab === 'editor') bindEditorEvents();
  if (state.activeTab === 'assistant') bindAssistantEvents();
}

// ---- PLAN HTML ----
function renderPlanHTML() {
  const book = state.activeBook;
  if (!book) return '';
  return `
    <div class="plan-shell" style="padding:1.5rem;">
      <div class="plan-header">
        <div>
          ${state.isEditingTitle
            ? `<div style="display:flex;align-items:center;gap:10px;" class="animate-fade-in">
                <input type="text" class="plan-title-input" id="inp-plan-title" value="${state.pendingTitle}" />
                <button id="btn-confirm-rename" style="color:#f59e0b;font-size:1.3rem;background:none;border:none;cursor:pointer;"><i class="fa-solid fa-check"></i></button>
               </div>`
            : `<h2 class="plan-title font-serif" id="plan-title-click">${book.title}</h2>`
          }
          <p class="plan-summary">"${book.summary}"</p>
        </div>
        <button class="rename-book-btn" id="btn-rename-book"><i class="fa-solid fa-pen-to-square"></i> ${t('renameBook')}</button>
      </div>

      <div class="plan-grid">
        ${book.coverImage
          ? `<div class="cover-card">
               <img src="${book.coverImage}" alt="Couverture" />
               <div class="cover-card-overlay">
                 <button class="cover-action-btn edit" id="btn-edit-front"><i class="fa-solid fa-wand-magic-sparkles"></i> Rénover</button>
                 <button class="cover-action-btn del" id="btn-del-front"><i class="fa-solid fa-trash"></i> ${t('remove')}</button>
               </div>
               <div class="cover-card-label">${t('genFrontCover')}</div>
             </div>`
          : `<button class="add-card" id="btn-add-front-cover">
               <i class="fa-solid fa-image"></i>
               <span>${t('genFrontCover')}</span>
             </button>`
        }

        ${book.chapters.map((ch, i) => `
          <div class="chapter-card ${state.activeChapterIndex === i ? 'active' : ''}" data-chapter-idx="${i}">
            <div class="chapter-num">${i + 1}</div>
            <h4 class="chapter-card-title font-serif">${ch.title}</h4>
            <p class="chapter-card-preview">${ch.content ? ch.content.substring(0, 200) + '...' : '...'}</p>
          </div>
        `).join('')}

        <button class="add-card" id="btn-new-chapter">
          <i class="fa-solid fa-plus"></i>
          <span>${t('newChapter')}</span>
        </button>

        ${book.backCoverImage
          ? `<div class="cover-card">
               <img src="${book.backCoverImage}" alt="Couverture arrière" />
               <div class="cover-card-overlay">
                 <button class="cover-action-btn edit" id="btn-edit-back"><i class="fa-solid fa-wand-magic-sparkles"></i> Rénover</button>
                 <button class="cover-action-btn del" id="btn-del-back"><i class="fa-solid fa-trash"></i> ${t('remove')}</button>
               </div>
               <div class="cover-card-label">${t('genBackCover')}</div>
             </div>`
          : ''
        }
      </div>

      <!-- FAB -->
      <div class="fab-wrap">
        ${state.isCoverMenuOpen ? `
        <div class="fab-menu" id="fab-menu">
          <button class="fab-item" id="fab-front"><i class="fa-solid fa-image"></i>${t('genFrontCover')}</button>
          <button class="fab-item" id="fab-back"><i class="fa-solid fa-image-portrait"></i>${t('genBackCover')}</button>
        </div>
        ` : ''}
        <button class="fab-main ${state.isCoverMenuOpen ? 'open' : ''}" id="fab-btn">
          <i class="fa-solid ${state.isCoverMenuOpen ? 'fa-plus' : 'fa-wand-magic-sparkles'}"></i>
        </button>
      </div>
    </div>
  `;
}

function bindPlanEvents() {
  document.getElementById('btn-new-chapter')?.addEventListener('click', startNewChapter);
  document.getElementById('btn-rename-book')?.addEventListener('click', startRenameBook);
  document.getElementById('btn-confirm-rename')?.addEventListener('click', confirmRenameBook);
  document.getElementById('plan-title-click')?.addEventListener('click', startRenameBook);

  document.querySelectorAll('.chapter-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.chapterIdx);
      handleChapterSelectFromPlan(idx);
    });
  });

  // Cover events
  document.getElementById('btn-add-front-cover')?.addEventListener('click', () => openCoverModal('front'));
  document.getElementById('btn-edit-front')?.addEventListener('click', () => openCoverModal('front'));
  document.getElementById('btn-del-front')?.addEventListener('click', () => removeCover('front'));
  document.getElementById('btn-edit-back')?.addEventListener('click', () => openCoverModal('back'));
  document.getElementById('btn-del-back')?.addEventListener('click', () => removeCover('back'));

  // FAB
  document.getElementById('fab-btn')?.addEventListener('click', (e) => { e.stopPropagation(); state.isCoverMenuOpen = !state.isCoverMenuOpen; reRenderPlan(); });
  document.getElementById('fab-front')?.addEventListener('click', (e) => { e.stopPropagation(); state.isCoverMenuOpen = false; openCoverModal('front'); });
  document.getElementById('fab-back')?.addEventListener('click', (e) => { e.stopPropagation(); state.isCoverMenuOpen = false; openCoverModal('back'); });

  // Rename plan title inline
  if (state.isEditingTitle) {
    const inp = document.getElementById('inp-plan-title');
    inp?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmRenameBook(); if (e.key === 'Escape') { state.isEditingTitle = false; reRenderPlan(); } });
    inp?.focus();
  }
}

function reRenderPlan() {
  const content = document.getElementById('workshop-content');
  if (content) {
    content.innerHTML = renderPlanHTML();
    bindPlanEvents();
  }
}

// ---- EDITOR HTML ----
function renderEditorHTML() {
  const book = state.activeBook;
  if (!book || !book.chapters[state.activeChapterIndex]) return '';
  const chapter = book.chapters[state.activeChapterIndex];

  return `
    <div class="editor-shell" style="padding:1rem;height:100%;">
      <div class="editor-card">
        <div class="editor-topbar">
          <input type="text" class="chapter-title-input" id="inp-chapter-title" value="${chapter.title}" />
          <button class="read-aloud-btn ${state.isSpeaking ? 'speaking' : ''}" id="btn-read-aloud">
            <i class="fa-solid ${state.isSpeaking ? 'fa-stop' : 'fa-play'}"></i>
            ${t('readAloud')}
          </button>
        </div>
        <textarea class="editor-textarea" id="editor-textarea" placeholder="...">${state.editorContent}</textarea>
        <div class="editor-bottombar">
          <button class="nav-btn" id="btn-prev-ch" ${state.activeChapterIndex === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i><span>${t('prev')}</span>
          </button>
          <button class="save-chapter-btn ${state.saveSuccess ? 'success' : 'normal'}" id="btn-save-chapter">
            <i class="fa-solid ${state.saveSuccess ? 'fa-circle-check' : 'fa-check'}"></i>
            ${state.saveSuccess ? t('saveSuccess') : t('saveChapter')}
          </button>
          <button class="nav-btn" id="btn-next-ch" ${state.activeChapterIndex >= book.chapters.length - 1 ? 'disabled' : ''}>
            <span>${t('next')}</span><i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindEditorEvents() {
  const ta = document.getElementById('editor-textarea');
  ta?.addEventListener('input', () => {
    state.editorContent = ta.value;
    state.isDirty = state.editorContent !== state.lastSavedContent;
    updateHeaderDirty();
  });

  document.getElementById('inp-chapter-title')?.addEventListener('input', (e) => {
    const chapters = [...state.activeBook.chapters];
    chapters[state.activeChapterIndex] = { ...chapters[state.activeChapterIndex], title: e.target.value };
    state.activeBook = { ...state.activeBook, chapters };
  });

  document.getElementById('btn-save-chapter')?.addEventListener('click', () => {
    saveCurrentBook();
    state.saveSuccess = true;
    renderWorkshop(document.getElementById('app-main'));
    setTimeout(() => { state.saveSuccess = false; renderHeader(); }, 2500);
  });

  document.getElementById('btn-prev-ch')?.addEventListener('click', () => navigateChapter(state.activeChapterIndex - 1));
  document.getElementById('btn-next-ch')?.addEventListener('click', () => navigateChapter(state.activeChapterIndex + 1));

  document.getElementById('btn-read-aloud')?.addEventListener('click', async () => {
    if (state.isSpeaking) {
      state.audioSource?.stop();
      state.isSpeaking = false;
      renderWorkshop(document.getElementById('app-main'));
      return;
    }
    state.isSpeaking = true;
    renderWorkshop(document.getElementById('app-main'));
    try {
      if (!state.audioContext) state.audioContext = new AudioContext({ sampleRate: 24000 });
      const base64 = await generateSpeech(state.editorContent);
      const buffer = await decodeAudioData(decodeBase64(base64), state.audioContext);
      const source = state.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(state.audioContext.destination);
      source.onended = () => { state.isSpeaking = false; renderWorkshop(document.getElementById('app-main')); };
      state.audioSource = source;
      source.start();
    } catch(e) {
      state.isSpeaking = false;
      renderWorkshop(document.getElementById('app-main'));
    }
  });
}

// ---- ASSISTANT HTML ----
function renderAssistantHTML() {
  const msgs = state.chatMessages;
  return `
    <div class="chat-shell" style="padding:1rem;height:100%;">
      <div class="chat-card">
        <div class="chat-topbar">
          <div class="chat-topbar-left">
            <i class="fa-solid fa-feather-pointed"></i>
            <span>Rédacteur Virtuel</span>
          </div>
          <span class="vision-badge">Vision Mode Active</span>
        </div>

        <div class="chat-messages" id="chat-messages">
          ${msgs.length === 0
            ? `<div class="chat-empty">"Décrivez une scène ou importez une image pour l'intégrer à votre récit..."</div>`
            : msgs.map((msg, idx) => `
              <div class="chat-msg ${msg.role}">
                <div class="chat-bubble ${msg.role}">
                  ${msg.image ? `<div class="chat-bubble-img"><img src="${msg.image}" alt="Vision" /></div>` : ''}
                  <pre style="font-family:inherit;white-space:pre-wrap;">${escapeHtml(msg.text)}</pre>
                  ${msg.role === 'model' && msg.text.length > 100
                    ? `<button class="apply-draft-btn" data-idx="${idx}"><i class="fa-solid fa-file-export"></i> Copier vers l'Éditeur</button>`
                    : ''}
                </div>
              </div>
            `).join('')}
          ${state.isChatLoading
            ? `<div class="chat-msg model">
                 <div class="chat-typing">
                   <div class="typing-dot animate-bounce" style="animation-delay:0s;"></div>
                   <div class="typing-dot animate-bounce" style="animation-delay:0.15s;"></div>
                   <div class="typing-dot animate-bounce" style="animation-delay:0.3s;"></div>
                   <span style="color:#64748b;font-size:13px;">${state.chatImage ? "Analyse de la vision littéraire..." : "Le rédacteur réfléchit..."}</span>
                 </div>
               </div>`
            : ''}
        </div>

        ${state.chatImage ? `
        <div class="chat-image-preview">
          <div class="img-preview-wrap">
            <img src="${state.chatImage}" alt="Preview" />
            <button class="img-remove-btn" id="btn-remove-chat-img"><i class="fa-solid fa-times"></i></button>
          </div>
        </div>
        ` : ''}

        <form class="chat-form" id="chat-form">
          <input type="file" accept="image/*" id="chat-file-input" style="display:none;" />
          <button type="button" class="chat-img-btn ${state.chatImage ? 'has-image' : ''}" id="btn-chat-img">
            <i class="fa-solid fa-image"></i>
          </button>
          <input type="text" class="chat-input" id="chat-input" placeholder="${state.chatImage ? 'Expliquez ce que cette image apporte...' : 'Posez une question ou demandez un passage...'}" value="${escapeHtml(state.chatInput)}" />
          <button type="submit" class="chat-send-btn" ${state.isChatLoading ? 'disabled' : ''}>
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  `;
}

function bindAssistantEvents() {
  const messagesEl = document.getElementById('chat-messages');
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;

  document.getElementById('btn-chat-img')?.addEventListener('click', () => document.getElementById('chat-file-input')?.click());
  document.getElementById('chat-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { state.chatImage = reader.result; renderWorkshop(document.getElementById('app-main')); };
    reader.readAsDataURL(file);
  });
  document.getElementById('btn-remove-chat-img')?.addEventListener('click', () => { state.chatImage = null; renderWorkshop(document.getElementById('app-main')); });

  const chatInputEl = document.getElementById('chat-input');
  chatInputEl?.addEventListener('input', (e) => { state.chatInput = e.target.value; });

  document.querySelectorAll('.apply-draft-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const msg = state.chatMessages[idx];
      if (msg) { state.editorContent = msg.text; state.isDirty = true; handleTabSwitch('editor'); }
    });
  });

  document.getElementById('chat-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = state.chatInput.trim();
    const img = state.chatImage;
    if (!text && !img) return;
    if (state.isChatLoading) return;

    const userMsg = { role: 'user', text: text || '', image: img };
    state.chatMessages = [...state.chatMessages, userMsg];
    state.chatInput = '';
    state.chatImage = null;
    state.isChatLoading = true;

    renderWorkshop(document.getElementById('app-main'));

    try {
      let responseText;
      if (img) {
        const base64 = img.split(',')[1];
        responseText = await analyzeImageForPassage(base64, text || "Décris cette scène pour mon livre.", state.activeBook);
      } else {
        const historyForAPI = state.chatMessages.slice(0, -1).map(m => ({ role: m.role, text: m.text }));
        responseText = await sendChatMessage(state.activeBook, state.editorContent, historyForAPI, text);
      }
      state.chatMessages = [...state.chatMessages, { role: 'model', text: responseText }];
      // Persist chat in book
      state.activeBook = { ...state.activeBook, chatHistory: state.chatMessages };
      saveCurrentBook();
    } catch(err) {
      state.chatMessages = [...state.chatMessages, { role: 'model', text: `Erreur: ${err.message}` }];
    } finally {
      state.isChatLoading = false;
      renderWorkshop(document.getElementById('app-main'));
    }
  });
}

// ---- FOOTER ----
function renderFooter() {
  let footer = document.getElementById('app-footer');
  if (!footer) {
    footer = document.createElement('footer');
    footer.id = 'app-footer';
    document.getElementById('root').appendChild(footer);
  }

  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="footer-logo">
          <div class="footer-logo-icon"><i class="fa-solid fa-pen-nib" style="color:white;"></i></div>
          <span class="footer-logo-text">Inkwell Pro</span>
        </div>
        <p class="footer-desc">Créez, rédigez et publiez vos œuvres littéraires avec l'aide de l'intelligence artificielle.</p>
        <p class="footer-desc" style="font-size:11px;color:#475569;">© ${new Date().getFullYear()} Samir MAMA — Tous droits réservés</p>
      </div>

      <div class="footer-col">
        <h4>Application</h4>
        <ul>
          <li><a href="#" id="footer-new-book">Nouveau manuscrit</a></li>
          <li><a href="#" id="footer-library">Bibliothèque</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Légal</h4>
        <ul>
          <li><button onclick="openModal('modal-privacy')">Politique de confidentialité</button></li>
          <li><button onclick="openModal('modal-legal')">Mentions légales</button></li>
          <li><button onclick="openModal('modal-cgu')">CGU</button></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Contact</h4>
        <ul>
          <li><a href="mailto:damesys2008@gmail.com">damesys2008@gmail.com</a></li>
          <li><a href="https://www.linkedin.com/in/samir-mama" target="_blank">LinkedIn</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <span class="footer-copyright">Inkwell Pro — Propulsé par Google Gemini AI</span>
      <div class="footer-social">
        <a href="mailto:damesys2008@gmail.com" title="Email"><i class="fa-solid fa-envelope"></i></a>
        <a href="https://www.linkedin.com/in/samir-mama" target="_blank" title="LinkedIn"><i class="fa-brands fa-linkedin"></i></a>
        <a href="https://github.com/" target="_blank" title="GitHub"><i class="fa-brands fa-github"></i></a>
      </div>
    </div>
  `;

  document.getElementById('footer-new-book')?.addEventListener('click', (e) => { e.preventDefault(); createNewBook(); });
  document.getElementById('footer-library')?.addEventListener('click', (e) => { e.preventDefault(); goToLibrary(); });
}

// ============================
// MODAL FUNCTIONS
// ============================
window.openModal = function(id) {
  document.getElementById(id)?.classList.remove('hidden');
};
window.closeModal = function(id) {
  document.getElementById(id)?.classList.add('hidden');
};
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

function renderDeleteModal() {
  const existing = document.getElementById('modal-delete');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-delete';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box delete-modal-box">
      <div class="delete-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <h3 class="font-serif" style="font-size:1.5rem;text-align:center;margin-bottom:1rem;">${t('delete')} ?</h3>
      <p style="color:#94a3b8;text-align:center;font-style:italic;">"${t('confirmDelete')}"</p>
      <div class="modal-actions">
        <button class="btn-cancel" id="btn-cancel-delete">${t('cancel')}</button>
        <button class="btn-danger" id="btn-confirm-delete">${t('delete')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('btn-cancel-delete')?.addEventListener('click', () => { modal.remove(); state.confirmDeleteId = null; });
  document.getElementById('btn-confirm-delete')?.addEventListener('click', () => {
    deleteBook(state.confirmDeleteId);
    modal.remove();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) { modal.remove(); state.confirmDeleteId = null; } });
}

function openCoverModal(target) {
  state.coverTarget = target;
  state.coverPrompt = '';
  state.coverTitle = state.activeBook?.title || '';
  state.coverAuthor = state.activeBook?.author || '';
  state.uploadedCoverImage = null;
  state.useUploadAsReference = true;

  const existing = document.getElementById('modal-cover');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-cover';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box cover-modal-box">
      <button class="modal-close" id="btn-close-cover-modal"><i class="fa-solid fa-times"></i></button>
      <h3 class="font-serif" style="font-size:1.5rem;margin-bottom:0.5rem;">${target === 'front' ? t('genFrontCover') : t('genBackCover')}</h3>
      <p class="cover-modal-sub">"Concevez une couverture liée à l'âme de votre manuscrit."</p>

      <div style="display:flex;flex-direction:column;gap:1.5rem;">
        ${target === 'front' ? `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">${t('tempTitle')}</label>
            <input type="text" class="form-input" id="cover-inp-title" value="${state.coverTitle}" style="font-size:14px;" />
          </div>
          <div class="form-group">
            <label class="form-label">${t('author')}</label>
            <input type="text" class="form-input" id="cover-inp-author" value="${state.coverAuthor}" style="font-size:14px;" />
          </div>
        </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label">${t('describeCover')}</label>
          <textarea class="form-textarea" id="cover-inp-prompt" placeholder="Ambiance sombre, mystérieuse, avec une silhouette de château..." style="height:100px;">${state.coverPrompt}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">${t('uploadImage')}</label>
          <div style="display:flex;gap:1rem;align-items:stretch;">
            <label class="cover-upload-area" id="cover-upload-label">
              <input type="file" accept="image/*" id="cover-file-input" style="display:none;" />
              <i class="fa-solid fa-cloud-arrow-up" style="font-size:1.5rem;color:#f59e0b;"></i>
              <span id="cover-upload-text" style="font-size:11px;font-weight:700;color:#64748b;">Choisir un fichier</span>
            </label>
            <div class="cover-ref-btns" id="cover-ref-btns" style="display:none;">
              <button type="button" class="cover-ref-btn active" id="btn-use-ref">${t('useAsRef')}</button>
              <button type="button" class="cover-ref-btn inactive" id="btn-use-direct">${t('useDirect')}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" id="btn-cancel-cover">${t('cancel')}</button>
        <button class="btn-primary" id="btn-gen-cover" style="flex:2;padding:14px;border-radius:12px;font-size:14px;">
          <i class="fa-solid fa-wand-magic-sparkles"></i> ${t('confirm')}
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('btn-close-cover-modal')?.addEventListener('click', () => modal.remove());
  document.getElementById('btn-cancel-cover')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal && !state.isGeneratingCover) modal.remove(); });

  document.getElementById('cover-inp-title')?.addEventListener('input', e => { state.coverTitle = e.target.value; });
  document.getElementById('cover-inp-author')?.addEventListener('input', e => { state.coverAuthor = e.target.value; });
  document.getElementById('cover-inp-prompt')?.addEventListener('input', e => { state.coverPrompt = e.target.value; });

  document.getElementById('cover-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      state.uploadedCoverImage = reader.result;
      document.getElementById('cover-upload-text').textContent = "Changer d'image";
      const previewEl = document.getElementById('cover-preview-img');
      if (previewEl) previewEl.src = reader.result;
      else {
        const img = document.createElement('img');
        img.id = 'cover-preview-img';
        img.className = 'preview';
        img.src = reader.result;
        document.getElementById('cover-upload-label').prepend(img);
      }
      document.getElementById('cover-ref-btns').style.display = 'flex';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btn-use-ref')?.addEventListener('click', () => {
    state.useUploadAsReference = true;
    document.getElementById('btn-use-ref').className = 'cover-ref-btn active';
    document.getElementById('btn-use-direct').className = 'cover-ref-btn inactive';
  });
  document.getElementById('btn-use-direct')?.addEventListener('click', () => {
    state.useUploadAsReference = false;
    document.getElementById('btn-use-ref').className = 'cover-ref-btn inactive';
    document.getElementById('btn-use-direct').className = 'cover-ref-btn active';
  });

  document.getElementById('btn-gen-cover')?.addEventListener('click', () => handleGenerateCover(modal));
}

async function handleGenerateCover(modal) {
  if (!state.activeBook || !state.coverTarget) return;

  // Direct upload
  if (state.uploadedCoverImage && !state.useUploadAsReference) {
    applyCoverImage(state.coverTarget, state.uploadedCoverImage);
    modal.remove();
    return;
  }

  if (!state.coverPrompt.trim() && !state.uploadedCoverImage) {
    alert("Veuillez décrire l'ambiance ou importer une image.");
    return;
  }

  state.isGeneratingCover = true;
  const btn = document.getElementById('btn-gen-cover');
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('generating')}`; }

  try {
    const refImage = state.uploadedCoverImage && state.useUploadAsReference ? state.uploadedCoverImage : undefined;
    const bookCopy = { ...state.activeBook, title: state.coverTitle || state.activeBook.title, author: state.coverAuthor || state.activeBook.author };
    const base64 = await generateCoverImage(bookCopy, state.coverPrompt, refImage, state.coverTarget);
    const dataUrl = `data:image/png;base64,${base64}`;
    applyCoverImage(state.coverTarget, dataUrl);
    modal.remove();
  } catch(e) {
    alert("Erreur lors de la génération : " + e.message);
    if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${t('confirm')}`; }
  } finally {
    state.isGeneratingCover = false;
  }
}

function applyCoverImage(target, dataUrl) {
  if (target === 'front') state.activeBook = { ...state.activeBook, coverImage: dataUrl };
  else state.activeBook = { ...state.activeBook, backCoverImage: dataUrl };
  state.books = state.books.map(b => b.id === state.activeBook.id ? state.activeBook : b);
  saveStorage();
  reRenderPlan();
}

function removeCover(target) {
  if (target === 'front') { const b = { ...state.activeBook }; delete b.coverImage; state.activeBook = b; }
  else { const b = { ...state.activeBook }; delete b.backCoverImage; state.activeBook = b; }
  state.books = state.books.map(b => b.id === state.activeBook.id ? state.activeBook : b);
  saveStorage();
  reRenderPlan();
}

// ============================
// NAVIGATION & STATE ACTIONS
// ============================

function setView(view) {
  state.view = view;
  render();
  window.scrollTo(0, 0);
}

function goToLibrary() {
  if (state.isDirty) {
    if (window.confirm(t('unsavedChanges') + '\n\nContinuer sans sauvegarder ?')) {
      state.activeBook = null;
      setView('library');
    }
  } else {
    state.activeBook = null;
    setView('library');
  }
}

function openBook(book) {
  state.activeBook = book;
  state.activeChapterIndex = 0;
  state.chatMessages = book.chatHistory || [];
  if (book.chapters.length > 0) {
    state.editorContent = book.chapters[0].content || '';
    state.lastSavedContent = state.editorContent;
  }
  state.isDirty = false;
  state.activeTab = 'plan';
  setView('workshop');
}

function createNewBook() {
  state.activeBook = {
    id: uid(), title: '', author: '', genre: '', genre2: '',
    language: 'fr', languageStyle: 'Soutenu', summary: '',
    chapters: [], chatHistory: [], createdAt: Date.now(), isComplete: false
  };
  setView('architect');
}

function finalizeArchitect() {
  if (!state.activeBook?.title || !state.activeBook?.genre || !state.activeBook?.summary) return;
  const existing = state.books.findIndex(b => b.id === state.activeBook.id);
  if (existing >= 0) state.books[existing] = state.activeBook;
  else state.books = [state.activeBook, ...state.books];
  saveStorage();
  state.activeTab = 'plan';
  setView('workshop');
}

function handleTabSwitch(newTab) {
  if (state.activeTab === 'editor' && state.isDirty && newTab !== 'editor') {
    renderUnsavedModal(newTab);
    return;
  }
  state.activeTab = newTab;
  renderWorkshop(document.getElementById('app-main'));
  renderHeader();
}

function renderUnsavedModal(targetTab) {
  const existing = document.getElementById('modal-unsaved');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-unsaved';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="mini-modal-box">
      <h3 class="font-serif" style="font-size:1.2rem;margin-bottom:1.5rem;">${t('unsavedChanges')}</h3>
      <div class="mini-modal-actions">
        <button class="btn-primary-full" id="btn-save-go">${t('saveAndContinue')}</button>
        <button class="btn-ghost-full" id="btn-nosave-go">${t('continueNoSave')}</button>
        <button class="btn-text" id="btn-cancel-switch">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('btn-save-go')?.addEventListener('click', () => { saveCurrentBook(); modal.remove(); state.activeTab = targetTab; renderWorkshop(document.getElementById('app-main')); renderHeader(); });
  document.getElementById('btn-nosave-go')?.addEventListener('click', () => { modal.remove(); state.activeTab = targetTab; renderWorkshop(document.getElementById('app-main')); renderHeader(); });
  document.getElementById('btn-cancel-switch')?.addEventListener('click', () => modal.remove());
}

function handleChapterSelectFromPlan(idx) {
  if (state.isDirty && idx !== state.activeChapterIndex) {
    renderUnsavedModal('editor'); // simplified: just switch to editor
    return;
  }
  state.activeChapterIndex = idx;
  if (state.activeBook.chapters[idx]) {
    state.editorContent = state.activeBook.chapters[idx].content || '';
    state.lastSavedContent = state.editorContent;
  }
  state.isDirty = false;
  state.activeTab = 'editor';
  renderWorkshop(document.getElementById('app-main'));
  renderHeader();
}

function startNewChapter() {
  if (!state.activeBook) return;
  const n = state.activeBook.chapters.length + 1;
  const newChapter = { id: uid(), title: `${t('chapter')} ${n}`, userPrompt: '', content: '' };
  state.activeBook = { ...state.activeBook, chapters: [...state.activeBook.chapters, newChapter] };
  state.activeChapterIndex = state.activeBook.chapters.length - 1;
  state.editorContent = '';
  state.lastSavedContent = '';
  state.isDirty = false;
  state.activeTab = 'editor';
  renderWorkshop(document.getElementById('app-main'));
  renderHeader();
}

function navigateChapter(newIndex) {
  if (!state.activeBook || newIndex < 0 || newIndex >= state.activeBook.chapters.length) return;
  // auto-save current
  const chapters = [...state.activeBook.chapters];
  if (chapters[state.activeChapterIndex]) chapters[state.activeChapterIndex] = { ...chapters[state.activeChapterIndex], content: state.editorContent };
  state.activeBook = { ...state.activeBook, chapters };
  state.books = state.books.map(b => b.id === state.activeBook.id ? state.activeBook : b);
  saveStorage();
  state.activeChapterIndex = newIndex;
  state.editorContent = state.activeBook.chapters[newIndex].content || '';
  state.lastSavedContent = state.editorContent;
  state.isDirty = false;
  renderWorkshop(document.getElementById('app-main'));
  renderHeader();
}

function deleteBook(id) {
  state.books = state.books.filter(b => b.id !== id);
  saveStorage();
  if (state.activeBook?.id === id) { state.activeBook = null; setView('library'); }
  else renderLibrary(document.getElementById('app-main'));
  state.confirmDeleteId = null;
}

function startRenameBook() {
  state.pendingTitle = state.activeBook?.title || '';
  state.isEditingTitle = true;
  reRenderPlan();
  setTimeout(() => document.getElementById('inp-plan-title')?.focus(), 50);
}

function confirmRenameBook() {
  const val = document.getElementById('inp-plan-title')?.value?.trim() || state.pendingTitle.trim();
  if (val) {
    state.activeBook = { ...state.activeBook, title: val };
    state.books = state.books.map(b => b.id === state.activeBook.id ? state.activeBook : b);
    saveStorage();
  }
  state.isEditingTitle = false;
  reRenderPlan();
}

function updateHeaderDirty() {
  const btn = document.querySelector('.save-btn');
  if (!btn) return;
  if (state.isDirty) { btn.className = 'save-btn dirty'; btn.querySelector('.save-label').textContent = t('modified'); }
  else { btn.className = 'save-btn clean'; btn.querySelector('.save-label').textContent = t('saved'); }
}

function showSaveSuccess() {
  state.saveSuccess = true;
  const btn = document.getElementById('btn-save-chapter');
  if (btn) { btn.className = 'save-chapter-btn success'; btn.innerHTML = `<i class="fa-solid fa-circle-check"></i>${t('saveSuccess')}`; }
  setTimeout(() => {
    state.saveSuccess = false;
    const b = document.getElementById('btn-save-chapter');
    if (b) { b.className = 'save-chapter-btn normal'; b.innerHTML = `<i class="fa-solid fa-check"></i>${t('saveChapter')}`; }
  }, 2500);
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Close menus on outside click
document.addEventListener('click', () => {
  if (state.activeMenuId) { state.activeMenuId = null; const main = document.getElementById('app-main'); if (state.view === 'library') renderLibrary(main); }
  if (state.showLangMenu) { state.showLangMenu = false; renderHeader(); }
  if (state.isCoverMenuOpen) { state.isCoverMenuOpen = false; reRenderPlan(); }
});

// ============================
// INIT
// ============================
loadStorage();
applyTheme();
render();
