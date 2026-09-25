window.LERAWATCH_VERSION='0.6.1';
console.info('LeraWatch v0.6.1 PROFILE FIX');
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
    url.searchParams.set('title', item.title || item.originalTitle || '');

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

      const providerName = escapeHtml(provider.name || 'Сервис');
      if (provider.url) {
        return `
          <a class="provider provider-link" href="${escapeAttr(provider.url)}" target="_blank" rel="noopener noreferrer" aria-label="Открыть ${providerName}">
            ${logo}
            <span class="provider-name">${providerName}</span><span class="provider-arrow" aria-hidden="true">↗</span>
          </a>`;
      }

      return `
        <div class="provider">
          ${logo}
          <span>${providerName}</span>
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

// ===== LeraWatch v0.6 PROFILE =====
const PROFILE_KEY = 'lerawatch-profile-v1';
const SERVICES = [
  {id:'yandex', name:'Кинопоиск / Яндекс Плюс', price:'449 ₽/мес', desc:'Кинопоиск, Музыка, Книги и Плюс для 4 человек.', url:'https://plus.yandex.ru/'},
  {id:'ivi', name:'Иви', price:'399 ₽/мес', desc:'Фильмы и сериалы, без рекламы, 4K/HDR там, где доступно.', url:'https://www.ivi.ru/'},
  {id:'wink', name:'Wink Всё в одном', price:'399 ₽/мес', desc:'Фильмы, сериалы, ТВ, спорт, музыка и игры.', url:'https://wink.ru/services'},
  {id:'start', name:'START', price:'499 ₽/мес', desc:'Российские оригинальные сериалы и фильмы START.', url:'https://start.ru/'},
  {id:'premier', name:'PREMIER', price:'399 ₽/мес', desc:'Фильмы, сериалы, шоу и проекты PREMIER / RUTUBE.', url:'https://premier.one/'},
  {id:'kion', name:'KION', price:'от 399 ₽ / 3 мес*', desc:'KION Originals, фильмы, сериалы и 200+ ТВ-каналов. *Акционная цена для новых пользователей.', url:'https://standalone.kion.ru/'},
  {id:'amediateka', name:'AMEDIATEKA', price:'599 ₽/мес', desc:'Зарубежные сериалы, премьеры и 4 ТВ-канала.', url:'https://www.amediateka.ru/'}
];

function getProfile(){
  try{return JSON.parse(localStorage.getItem(PROFILE_KEY))||{subscriptions:[],progress:{},liked:[]};}
  catch(e){return {subscriptions:[],progress:{},liked:[]};}
}
function saveProfile(p){localStorage.setItem(PROFILE_KEY,JSON.stringify(p));}
function getLibrarySafe(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{};}catch(e){return {};}
}
function countLibrary(){
  const lib=getLibrarySafe();
  const want=Array.isArray(lib.want)?lib.want.length:0;
  const watched=Array.isArray(lib.watched)?lib.watched.length:0;
  return {want,watched};
}
function renderProfile(){
  const p=getProfile(), counts=countLibrary();
  const progressCount=Object.keys(p.progress||{}).length;
  const likedCount=(p.liked||[]).length;
  searchTools.style.display='none';
  result.innerHTML=`
    <section class="profile-page">
      <div class="profile-hero">
        <div class="profile-avatar">L</div>
        <div><div class="profile-kicker">LERAWATCH PROFILE</div><h2>Мой профиль</h2></div>
      </div>
      <div class="profile-stats">
        <div><b>${counts.watched}</b><span>просмотрено</span></div>
        <div><b>${progressCount}</b><span>смотрю</span></div>
        <div><b>${counts.want}</b><span>хочу</span></div>
        <div><b>${likedCount}</b><span>лайков</span></div>
      </div>

      <div class="profile-section-head"><h3>Мои подписки</h3><span>${p.subscriptions.length} подключено</span></div>
      <div class="service-list my-services">
        ${SERVICES.filter(s=>p.subscriptions.includes(s.id)).map(serviceCard).join('') || '<div class="profile-empty">Отметь сервисы ниже — они появятся здесь.</div>'}
      </div>

      <div class="profile-section-head"><h3>Все сервисы</h3><span>цены на сентябрь 2026</span></div>
      <div class="service-list">${SERVICES.map(serviceCard).join('')}</div>

      <div class="profile-section-head"><h3>Продолжить просмотр</h3><span>сезон и серия</span></div>
      <div class="progress-editor">
        <input id="progressTitle" placeholder="Название сериала">
        <div class="progress-row">
          <input id="progressSeason" inputmode="numeric" placeholder="Сезон">
          <input id="progressEpisode" inputmode="numeric" placeholder="Серия">
          <button id="saveProgress">Сохранить</button>
        </div>
      </div>
      <div class="progress-list">
        ${Object.entries(p.progress||{}).map(([title,v])=>`
          <div class="progress-item"><div><b>${escapeHtml(title)}</b><span>Сезон ${v.season} • Серия ${v.episode}</span></div>
          <button data-remove-progress="${escapeHtml(title)}">×</button></div>`).join('') || '<div class="profile-empty">Пока ничего не отмечено.</div>'}
      </div>

      <div class="profile-section-head"><h3>Понравилось</h3><span>♥ личная коллекция</span></div>
      <div class="profile-empty">Лайки уже заложены в профиль. В следующем шаге привяжем ♥ прямо к карточке фильма.</div>
    </section>`;
  bindProfile();
}
function serviceCard(s){
  const p=getProfile(), active=p.subscriptions.includes(s.id);
  return `<div class="service-card ${active?'owned':''}">
    <div class="service-main">
      <div class="service-monogram">${s.name.slice(0,1)}</div>
      <div class="service-copy"><b>${s.name}</b><strong>${s.price}</strong><p>${s.desc}</p></div>
    </div>
    <div class="service-actions">
      <button class="sub-toggle" data-service="${s.id}">${active?'✓ Есть подписка':'+ Моя подписка'}</button>
      <a href="${s.url}" target="_blank" rel="noopener noreferrer">Подробнее ↗</a>
    </div>
  </div>`;
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function bindProfile(){
  result.querySelectorAll('[data-service]').forEach(btn=>btn.onclick=()=>{
    const p=getProfile(), id=btn.dataset.service;
    p.subscriptions=p.subscriptions.includes(id)?p.subscriptions.filter(x=>x!==id):[...p.subscriptions,id];
    saveProfile(p); renderProfile();
  });
  const save=result.querySelector('#saveProgress');
  if(save) save.onclick=()=>{
    const title=result.querySelector('#progressTitle').value.trim();
    const season=parseInt(result.querySelector('#progressSeason').value,10);
    const episode=parseInt(result.querySelector('#progressEpisode').value,10);
    if(!title || !season || !episode){showToast('Укажи название, сезон и серию');return;}
    const p=getProfile(); p.progress[title]={season,episode}; saveProfile(p); renderProfile(); showToast('Прогресс сохранён');
  };
  result.querySelectorAll('[data-remove-progress]').forEach(btn=>btn.onclick=()=>{
    const p=getProfile(); delete p.progress[btn.dataset.removeProgress]; saveProfile(p); renderProfile();
  });
}


function switchView(view, rerender = true) {
  currentView = view, rerender = true;
  navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view, rerender = true));

  if (view, rerender = true === 'search') {
    searchTools.style.display = '';
    renderSearchState();
  } else if (view, rerender = true === 'profile') {
    searchTools.style.display = 'none';
    renderProfile();
  } else {
    searchTools.style.display = 'none';
    renderLibrary(view, rerender = true);
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
