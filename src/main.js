import './styles.css';

const STORAGE_KEY = 'elyan-note-state';
const app = document.querySelector('#app');

const now = () => Date.now();
const uid = () => crypto.randomUUID();
const formatDate = (value) => new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(value));

const starterNote = {
  id: uid(),
  title: 'Hoş geldin',
  content: 'Bu alana notlarını yazabilirsin.\n\n- Yeni not oluştur\n- Arama yap\n- Tema değiştir\n- Yazdıkların otomatik kaydedilir',
  createdAt: now(),
  updatedAt: now(),
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { theme: 'dark', notes: [starterNote] };
    const parsed = JSON.parse(raw);
    const notes = Array.isArray(parsed.notes) && parsed.notes.length ? parsed.notes : [starterNote];
    return {
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      notes: notes.map((note) => ({
        id: note.id || uid(),
        title: note.title || 'Başlıksız not',
        content: note.content || '',
        createdAt: note.createdAt || now(),
        updatedAt: note.updatedAt || now(),
      })),
    };
  } catch {
    return { theme: 'dark', notes: [starterNote] };
  }
};

const state = loadState();
let selectedId = state.notes[0].id;
let searchQuery = '';

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: state.theme, notes: state.notes }));
};

const selectedNote = () => state.notes.find((note) => note.id === selectedId) || state.notes[0];

const applyTheme = () => {
  document.documentElement.dataset.theme = state.theme;
  const themeButton = document.querySelector('#themeToggle');
  if (themeButton) themeButton.textContent = state.theme === 'dark' ? '☀' : '☾';
};

const createNote = () => {
  const created = {
    id: uid(),
    title: 'Yeni not',
    content: '',
    createdAt: now(),
    updatedAt: now(),
  };
  state.notes = [created, ...state.notes];
  selectedId = created.id;
  saveState();
  render();
  queueMicrotask(() => document.querySelector('#titleInput')?.focus());
};

const deleteCurrent = () => {
  if (state.notes.length === 1) {
    const keep = selectedNote();
    keep.title = 'Başlıksız not';
    keep.content = '';
    keep.updatedAt = now();
    saveState();
    render();
    return;
  }

  const note = selectedNote();
  if (!confirm(`"${note.title}" silinsin mi?`)) return;
  state.notes = state.notes.filter((item) => item.id !== note.id);
  selectedId = state.notes[0].id;
  saveState();
  render();
};

const updateCurrent = (field, value) => {
  const note = selectedNote();
  if (!note) return;
  note[field] = value;
  note.updatedAt = now();
  if (field === 'title') note.title = value.trim() || 'Başlıksız not';
  saveState();
  renderList();
  renderMeta();
};

const sortedNotes = () => [...state.notes].sort((a, b) => b.updatedAt - a.updatedAt);

const filteredNotes = () => sortedNotes().filter((note) => {
  const haystack = `${note.title} ${note.content}`.toLowerCase();
  return haystack.includes(searchQuery.toLowerCase());
});

const renderList = () => {
  const list = document.querySelector('#noteList');
  const items = filteredNotes();

  list.innerHTML = items.map((note) => `
    <button class="note-item ${note.id === selectedId ? 'active' : ''}" data-id="${note.id}">
      <span class="note-title">${escapeHtml(note.title)}</span>
      <span class="note-preview">${escapeHtml((note.content || 'Boş not').slice(0, 90))}</span>
      <span class="note-date">${formatDate(note.updatedAt)}</span>
    </button>
  `).join('') || `
    <div class="empty-state">
      <strong>Not bulunamadı</strong>
      <p>Arama terimini değiştir ya da yeni bir not oluştur.</p>
    </div>
  `;

  list.querySelectorAll('.note-item').forEach((button) => {
    button.addEventListener('click', () => {
      selectedId = button.dataset.id;
      render();
    });
  });
};

const renderMeta = () => {
  const note = selectedNote();
  const meta = document.querySelector('#noteMeta');
  if (!meta || !note) return;
  meta.textContent = `Son güncelleme: ${formatDate(note.updatedAt)}`;
};

const renderEditor = () => {
  const note = selectedNote();
  document.querySelector('#titleInput').value = note.title;
  document.querySelector('#contentInput').value = note.content;
  document.querySelector('#charCount').textContent = `${note.content.length} karakter`;
  renderMeta();
};

const render = () => {
  applyTheme();
  renderList();
  renderEditor();
};

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

app.innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand-row">
        <div>
          <p class="eyebrow">Elyan Note</p>
          <h1>Not defterin</h1>
        </div>
        <button id="themeToggle" class="icon-button" aria-label="Temayı değiştir"></button>
      </div>

      <button id="newNote" class="primary-button">+ Yeni not</button>
      <label class="search-box">
        <span>Arama</span>
        <input id="searchInput" type="search" placeholder="Notlarda ara..." />
      </label>

      <div id="noteList" class="note-list"></div>
    </aside>

    <main class="editor">
      <div class="editor-top">
        <div>
          <p class="eyebrow">Düzenleyici</p>
          <p id="noteMeta" class="meta"></p>
        </div>
        <div class="editor-actions">
          <span id="charCount" class="pill"></span>
          <button id="deleteNote" class="danger-button">Sil</button>
        </div>
      </div>

      <label class="field">
        <span>Başlık</span>
        <input id="titleInput" type="text" placeholder="Not başlığı" />
      </label>

      <label class="field field-grow">
        <span>İçerik</span>
        <textarea id="contentInput" placeholder="Yazmaya başla..."></textarea>
      </label>

      <footer class="editor-footer">
        <span>Otomatik kaydedilir</span>
        <span>Ctrl/Cmd + N yeni not oluşturur</span>
      </footer>
    </main>
  </div>
`;

const wireEvents = () => {
  document.querySelector('#newNote').addEventListener('click', createNote);
  document.querySelector('#deleteNote').addEventListener('click', deleteCurrent);
  document.querySelector('#themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveState();
    applyTheme();
  });
  document.querySelector('#searchInput').addEventListener('input', (event) => {
    searchQuery = event.target.value;
    renderList();
  });
  document.querySelector('#titleInput').addEventListener('input', (event) => {
    updateCurrent('title', event.target.value);
  });
  document.querySelector('#contentInput').addEventListener('input', (event) => {
    updateCurrent('content', event.target.value);
    document.querySelector('#charCount').textContent = `${event.target.value.length} karakter`;
  });
  window.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      createNote();
    }
  });
};

wireEvents();
render();
