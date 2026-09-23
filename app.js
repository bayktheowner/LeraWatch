const API_BASE = 'https://lerawatch-api.alxeyonway.workers.dev';

const tests = ['Атака Титанов', 'Игра Престолов', 'Дом дракона', 'Сваты', 'Как я встретил вашу маму'];
const chips = document.querySelector('#chips');
const q = document.querySelector('#q');
const result = document.querySelector('#result');
const go = document.querySelector('#go');

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

async function search() {
  const name = q.value.trim();
  if (!name) return;

  setLoading(true);
  result.innerHTML = '<div class="empty">Ищем в LeraWatch… ✦</div>';

  try {
    const url = new URL('/search', API_BASE);
    url.searchParams.set('q', name);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Ошибка поиска');
    }

    renderResults(data.results || [], name);
  } catch (error) {
    result.innerHTML = `
      <div class="empty error">
        Не удалось выполнить поиск.<br>
        <small>${escapeHtml(error.message || String(error))}</small>
      </div>`;
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
    <div class="results-head">
      <b>Результаты</b>
      <span>${items.length}</span>
    </div>
    <div class="results">
      ${items.map(renderCard).join('')}
    </div>`;
}

function renderCard(item) {
  const type = item.type === 'tv' ? 'Сериал' : 'Фильм';
  const rating = item.rating == null ? '—' : Number(item.rating).toFixed(1);
  const poster = item.poster
    ? `<img class="poster" src="${escapeAttr(item.poster)}" alt="" loading="lazy">`
    : `<div class="poster poster-empty">L</div>`;

  return `
    <article class="movie-card">
      ${poster}
      <div class="movie-info">
        <div class="movie-title">${escapeHtml(item.title || 'Без названия')}</div>
        <div class="movie-meta">
          <span>${type}</span>
          ${item.year ? `<span>${escapeHtml(item.year)}</span>` : ''}
          <span>★ ${escapeHtml(rating)}</span>
        </div>
        ${item.originalTitle && item.originalTitle !== item.title
          ? `<div class="original-title">${escapeHtml(item.originalTitle)}</div>`
          : ''}
        <p>${escapeHtml(item.overview || 'Описание пока отсутствует.')}</p>
      </div>
    </article>`;
}

function setLoading(loading) {
  go.disabled = loading;
  go.textContent = loading ? 'Ищем…' : 'Найти';
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]));
}

function escapeAttr(value = '') {
  return escapeHtml(value);
}

go.onclick = search;
q.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') search();
});

result.innerHTML = '<div class="empty">Введите название или выберите один из наших тестов ✦</div>';
