const tests=['Атака Титанов','Игра Престолов','Дом дракона','Сваты','Как я встретил вашу маму'];
const services=['Кинопоиск','Иви','Okko','Wink','KION','START','PREMIER'];
const chips=document.querySelector('#chips'),q=document.querySelector('#q'),result=document.querySelector('#result');
tests.forEach(x=>{let b=document.createElement('button');b.className='chip';b.textContent=x;b.onclick=()=>{q.value=x;search()};chips.appendChild(b)});
function search(){const name=q.value.trim();if(!name)return;result.innerHTML=`<div class="hero"><h2>${escapeHtml(name)}</h2><div class="meta">LeraWatch ищет варианты просмотра</div><div class="services">${services.map(s=>`<div class="service"><div><b>${s}</b><small>адаптер готовится</small></div><button class="open" disabled>Проверить</button></div>`).join('')}</div></div>`}
function escapeHtml(s){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
document.querySelector('#go').onclick=search;q.addEventListener('keydown',e=>{if(e.key==='Enter')search()});result.innerHTML='<div class="empty">Введите название или выберите один из наших тестов ✦</div>';
