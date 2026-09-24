const API_BASE = 'https://lerawatch-api.alxeyonway.workers.dev';
const STORAGE_KEY = 'lerawatch-library-v1';

const tests = ['Атака Титанов', 'Игра Престолов', 'Дом дракона', 'Сваты', 'Как я встретил вашу маму'];
const chips = document.querySelector('#chips');
const q = document.querySelector('#q');
const result = document.querySelector('#result');
const go = document.querySelector('#go');
const searchTools = document.querySelector('#searchTools');
const modal = document.querySelector('#detailModal');
const toast = document.querySelector('#toast');
const navButtons = [...document.querySelectorAll('.nav-btn')];

let currentView = 'search';
let lastSearchResults = [];
let lastQuery = '';

tests.forEach((name) => {
  const button = document.createElement('button');
  button.className = 'chip';
  button.textContent = name;
  button.onclick = () => {
    q.value = name;
    search();
  };
  chips.appendChild(button);
});

function getLibrary() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      want: Array.isArray(saved.want) ? saved.want : [],
      watched: Array.isArray(saved.watched) ? saved.watched : []
    };
  } catch {
    return { want: [], watched: [] };
  }
}

function saveLibrary(library) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

function itemKey(item) {
  return `${item.type}:${item.id}`;
}

function listHas(list, item) {
  const key = itemKey(item);
  return list.some((x) => itemKey(x) === key);
}

function removeFrom(list, item) {
  const key = itemKey(item);
  return list.filter((x) => itemKey(x) !== key);
}

function setStatus(item, status) {
  const library = getLibrary();
  library.want = removeFrom(library.want, item);
  library.watched = removeFrom(library.watched, item);

  if (status === 'want') library.want.unshift(item);
  if (status === 'watched') library.watched.unshift(item);

  saveLibrary(library);
  showToast(status === 'want' ? 'Добавлено в «Хочу» ♡' : status === 'watched' ? 'Добавлено в «Просмотрено» ✓' : 'Удалено из списка');
  openDetails(item);

  if (currentView !== 'search') renderLibrary(currentView);
}

function getStatus(item) {
  const library = getLibrary();
  if (listHas(library.want, item)) return 'want';
  if (listHas(library.watched, item)) return 'watched';
  return null;
}

async function search() {
  const name = q.value.trim();
  if (!name) return;

  switchView('search', false);
  setLoading(true);
  result.innerHTML = '<div class="empty">Ищем в LeraWatch… ✦</div>';

  try {
    const url = new URL('/search', API_BASE);
    url.searchParams.set('q', name);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.ok) throw new Error(data.error || 'Ошибка поиска');

    lastSearchResults = data.results || [];
    lastQuery = name;
    renderResults(lastSearchResults, name);
  } catch (error) {
    result.innerHTML = `<div class="empty error">Не удалось выполнить поиск.<br><small>${escapeHtml(error.message || String(error))}</small></div>`;
  } finally {
    setLoading(false);
  }
}

function renderResults(items, query) {
  if (!items.length) {
    result.innerHTML = `<div class="empty">По запросу «${escapeHtml(query)}» ничего не найдено.</div>`;
    return;
  }

  result.innerHTML = `
    <div class="results-head"><b>Результаты</b><span>${items.length}</span></div>
    <div class="results">${items.map(renderCard).join('')}</div>`;
  bindCards(items);
}

function renderLibrary(view) {
  const library = getLibrary();
  const items = view === 'want' ? library.want : library.watched;
  const title = view === 'want' ? 'Хочу посмотреть' : 'Просмотрено';
  const icon = view === 'want' ? '♡' : '✓';

  if (!items.length) {
    result.innerHTML = `<div class="library-title"><span>${icon}</span>${title}</div><div class="empty">Здесь пока пусто.<br><small>Открой карточку фильма или сериала и добавь его сюда.</small></div>`;
    return;
  }

  result.innerHTML = `
    <div class="results-head library-head"><b>${icon} ${title}</b><span>${items.length}</span></div>
    <div class="results">${items.map(renderCard).join('')}</div>`;
  bindCards(items);
}

function renderCard(item) {
  const type = item.type === 'tv' ? 'Сериал' : 'Фильм';
  const rating = item.rating == null ? '—' : Number(item.rating).toFixed(1);
  const poster = item.poster
    ? `<img class="poster" src="${escapeAttr(item.poster)}" alt="" loading="lazy">`
    : `<div class="poster poster-empty">L</div>`;

  return `
    <article class="movie-card" data-key="${escapeAttr(itemKey(item))}">
      ${poster}
      <div class="movie-info">
        <div class="movie-title">${escapeHtml(item.title || 'Без названия')}</div>
        <div class="movie-meta">
          <span>${type}</span>
          ${item.year ? `<span>${escapeHtml(item.year)}</span>` : ''}
          <span>★ ${escapeHtml(rating)}</span>
        </div>
        ${item.originalTitle && item.originalTitle !== item.title ? `<div class="original-title">${escapeHtml(item.originalTitle)}</div>` : ''}
        <p>${escapeHtml(item.overview || 'Описание пока отсутствует.')}</p>
      </div>
    </article>`;
}

function bindCards(items) {
  // Cards are handled by one delegated listener below.
  // This is more reliable in iPhone Safari/PWA after dynamic HTML rendering.
}

function findItemByKey(key) {
  const library = getLibrary();
  return (
    lastSearchResults.find((item) => itemKey(item) === key) ||
    library.want.find((item) => itemKey(item) === key) ||
    library.watched.find((item) => itemKey(item) === key) ||
    null
  );
}

result.addEventListener('click', (event) => {
  const card = event.target.closest('.movie-card');
  if (!card || !result.contains(card)) return;

  const item = findItemByKey(card.dataset.key);
  if (item) openDetails(item);
});

function openDetails(item) {
  const type = item.type === 'tv' ? 'Сериал' : 'Фильм';
  const rating = item.rating == null ? '—' : Number(item.rating).toFixed(1);
  const status = getStatus(item);
  const poster = item.poster
    ? `<img class="detail-poster" src="${escapeAttr(item.poster)}" alt="">`
    : `<div class="detail-poster poster-empty">L</div>`;

  modal.innerHTML = `
    <div class="detail-sheet">
      <button class="detail-close" aria-label="Закрыть">×</button>
      <div class="detail-scroll">
        ${poster}
        <h2>${escapeHtml(item.title || 'Без названия')}</h2>
        ${item.originalTitle && item.originalTitle !== item.title ? `<div class="detail-original">${escapeHtml(item.originalTitle)}</div>` : ''}
        <div class="detail-meta">
          <span>${type}</span>
          ${item.year ? `<span>${escapeHtml(item.year)}</span>` : ''}
          <span>★ ${escapeHtml(rating)}</span>
        </div>

        <section class="watch-box">
          <div class="watch-title">Где посмотреть</div>
          <div id="watchContent" class="watch-content">Ищем площадки… ✦</div>
        </section>

        <p class="detail-overview">${escapeHtml(item.overview || 'Описание пока отсутствует.')}</p>
        <div class="detail-actions">
          <button class="want-btn ${status === 'want' ? 'selected' : ''}">♡ ${status === 'want' ? 'В списке «Хочу»' : 'Хочу посмотреть'}</button>
          <button class="watched-btn ${status === 'watched' ? 'selected' : ''}">✓ ${status === 'watched' ? 'Просмотрено' : 'Я посмотрел(а)'}</button>
        </div>
        ${status ? '<button class="remove-btn">Убрать из списка</button>' : ''}
      </div>
    </div>`;

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  modal.querySelector('.detail-close').onclick = closeDetails;
  modal.querySelector('.want-btn').onclick = () => setStatus(item, 'want');
  modal.querySelector('.watched-btn').onclick = () => setStatus(item, 'watched');
  const remove = modal.querySelector('.remove-btn');
  if (remove) remove.onclick = () => setStatus(item, null);

  loadWatchProviders(item);
}

async function loadWatchProviders(item) {
  const content = modal.querySelector('#watchContent');
  if (!content) return;

  try {
    const url = new URL('/watch', API_BASE);
    url.searchParams.set('id', String(item.id));
    url.searchParams.set('type', item.type);
    url.searchParams.set('region', 'RU');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Ошибка площадок');
    }

    // Ignore a late response if this card was already closed/replaced.
    if (!content.isConnected) return;
    renderWatchProviders(content, data);
  } catch (error) {
    if (!content.isConnected) return;
    content.innerHTML = '<div class="watch-empty">Не удалось загрузить площадки.</div>';
  }
}

function renderWatchProviders(content, data) {
  const groups = [
    ['flatrate', 'По подписке'],
    ['free', 'Бесплатно'],
    ['ads', 'С рекламой'],
    ['rent', 'Аренда'],
    ['buy', 'Купить']
  ];

  const providers = data.providers || {};
  const visible = groups.filter(([key]) =>
    Array.isArray(providers[key]) && providers[key].length > 0
  );

  if (!data.available || visible.length === 0) {
    content.innerHTML =
      '<div class="watch-empty">Для региона RU площадки пока не найдены.</div>' +
      '<div class="watch-credit">Данные о доступности: JustWatch</div>';
    return;
  }

  content.innerHTML = visible.map(([key, label]) => {
    const cards = providers[key].map((provider) => {
      const logo = provider.logo
        ? `<img src="${escapeAttr(provider.logo)}" alt="">`
        : '<div class="provider-logo-empty">▶</div>';

      return `
        <div class="provider">
          ${logo}
          <span>${escapeHtml(provider.name || 'Сервис')}</span>
        </div>`;
    }).join('');

    return `
      <div class="provider-group">
        <div class="provider-label">${label}</div>
        <div class="provider-list">${cards}</div>
      </div>`;
  }).join('') +
  (data.link
    ? `<a class="watch-link" href="${escapeAttr(data.link)}" target="_blank" rel="noopener noreferrer">Все варианты просмотра ↗</a>`
    : '') +
  '<div class="watch-credit">Данные о доступности: JustWatch</div>';
}

function closeDetails() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeDetails();
});

function switchView(view, rerender = true) {
  currentView = view;
  navButtons.forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  searchTools.hidden = view !== 'search';

  if (!rerender) return;
  if (view === 'search') {
    if (lastSearchResults.length) renderResults(lastSearchResults, lastQuery);
    else result.innerHTML = '<div class="empty">Введите название или выберите один из наших тестов ✦</div>';
  } else {
    renderLibrary(view);
  }
}

navButtons.forEach((button) => {
  button.onclick = () => switchView(button.dataset.view);
});

function setLoading(loading) {
  go.disabled = loading;
  go.textContent = loading ? 'Ищем…' : 'Найти';
}

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
}
function escapeAttr(value = '') { return escapeHtml(value); }

go.onclick = search;
q.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
result.innerHTML = '<div class="empty">Введите название или выберите один из наших тестов ✦</div>';
