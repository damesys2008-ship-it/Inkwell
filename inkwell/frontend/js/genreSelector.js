// ============================
// INKWELL PRO — GENRE SELECTOR
// ============================
import { GENRE_CATEGORIES } from './data.js';

export class GenreSelector {
  constructor(containerId, { selectedGenre = '', onSelect, labels = {} }) {
    this.container = document.getElementById(containerId);
    this.selectedGenre = selectedGenre;
    this.onSelect = onSelect;
    this.labels = labels;
    this.isOpen = false;
    this.search = '';
    this.render();
  }

  get filteredCategories() {
    if (!this.search) return GENRE_CATEGORIES;
    return GENRE_CATEGORIES.map(cat => ({
      ...cat,
      genres: cat.genres.filter(g => g.toLowerCase().includes(this.search.toLowerCase()))
    })).filter(cat => cat.genres.length > 0);
  }

  setSelected(genre) {
    this.selectedGenre = genre;
    this.render();
  }

  render() {
    const label = this.labels.narrativeGenre || 'Genre';
    const placeholder = this.labels.selectGenre || 'Sélectionnez...';
    const searchPlaceholder = this.labels.searchGenre || 'Rechercher...';

    this.container.innerHTML = `
      <div class="genre-selector" id="${this.container.id}-inner">
        <label class="form-label">${label}</label>
        <div class="genre-trigger ${this.isOpen ? 'open' : ''}" id="${this.container.id}-trigger">
          <span class="${this.selectedGenre ? '' : 'placeholder'}">${this.selectedGenre || placeholder}</span>
          <i class="fa-solid fa-chevron-down text-xs ${this.isOpen ? 'rotate-180' : ''}" style="color:#f59e0b;transition:transform 0.2s;font-size:11px;"></i>
        </div>
        ${this.isOpen ? `
        <div class="genre-dropdown" id="${this.container.id}-dropdown">
          <div class="genre-search-wrap">
            <i class="fa-solid fa-magnifying-glass genre-search-icon"></i>
            <input type="text" class="genre-search" placeholder="${searchPlaceholder}" id="${this.container.id}-search" value="${this.search}" autocomplete="off" />
          </div>
          <div class="genre-list" id="${this.container.id}-list">
            ${this.filteredCategories.map(cat => `
              <div class="genre-cat-label">${cat.name}</div>
              <div class="genre-items">
                ${cat.genres.map(genre => `
                  <button class="genre-item ${this.selectedGenre === genre ? 'selected' : ''}" data-genre="${genre}">${genre}</button>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;

    // Bind events
    const trigger = document.getElementById(`${this.container.id}-trigger`);
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isOpen = !this.isOpen;
      this.render();
      if (this.isOpen) {
        setTimeout(() => document.getElementById(`${this.container.id}-search`)?.focus(), 50);
      }
    });

    if (this.isOpen) {
      const searchEl = document.getElementById(`${this.container.id}-search`);
      searchEl?.addEventListener('input', (e) => {
        this.search = e.target.value;
        document.getElementById(`${this.container.id}-list`).innerHTML =
          this.filteredCategories.map(cat => `
            <div class="genre-cat-label">${cat.name}</div>
            <div class="genre-items">
              ${cat.genres.map(genre => `
                <button class="genre-item ${this.selectedGenre === genre ? 'selected' : ''}" data-genre="${genre}">${genre}</button>
              `).join('')}
            </div>
          `).join('');
        this.bindGenreItems();
      });
      this.bindGenreItems();
    }

    // Close on outside click
    document.addEventListener('click', this._outsideClick = (e) => {
      if (!this.container.contains(e.target)) {
        this.isOpen = false;
        this.render();
        document.removeEventListener('click', this._outsideClick);
      }
    });
  }

  bindGenreItems() {
    document.querySelectorAll(`#${this.container.id}-list .genre-item`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const genre = btn.dataset.genre;
        this.selectedGenre = genre;
        this.isOpen = false;
        this.search = '';
        this.render();
        this.onSelect(genre);
      });
    });
  }
}
