// Адрес API
const API = 'http://localhost:3001/api';

// Подсветка активной ссылки в навигации
function setActiveNav() {
  const path = window.location.pathname;
  let current = 'index.html';
  if (path.includes('tariffs'))  current = 'tariffs.html';
  else if (path.includes('about'))    current = 'about.html';
  else if (path.includes('contacts')) current = 'contacts.html';
  else if (path.includes('reviews'))  current = 'reviews.html';

  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    link.classList.toggle('active', href === current || (current === 'index.html' && href === './'));
  });
}

// Карта Leaflet
let _map = null;

function initMap() {
  const el = document.getElementById('map');
  if (!el || _map) {
    if (_map) _map.invalidateSize();
    return;
  }

  _map = L.map('map', { zoomControl: true, scrollWheelZoom: false, attributionControl: true })
           .setView([59.9284, 30.3488], 16);

  _map.attributionControl.setPrefix('');

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(_map);

  const icon = L.divIcon({
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:#9333ea;border:3px solid #c084fc;
      box-shadow:0 0 0 6px rgba(147,51,234,.25),0 0 14px rgba(147,51,234,.6);
    "></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12]
  });

  L.marker([59.9284, 30.3488], { icon })
    .addTo(_map)
    .bindPopup('<b>Music Prod</b><br>ул. Рубинштейна, 15<br><small>5 мин от м. Достоевская</small>')
    .openPopup();
}

// Мобильное меню
function toggleMob() {
  document.getElementById('burger').classList.toggle('open');
  document.getElementById('mobMenu').classList.toggle('open');
}
function closeMob() {
  document.getElementById('burger').classList.remove('open');
  document.getElementById('mobMenu').classList.remove('open');
}

// Модальное окно бронирования
let _calInited = false;
function openModal(tariff) {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  if (tariff) {
    const sel = document.getElementById('fTariff');
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === tariff) { sel.selectedIndex = i; break; }
    }
  }
  if (!_calInited) { initCalendar(); _calInited = true; }
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}
function initCalendar() {
  const input = document.getElementById('fDate');
  if (!input) return;
  const today = new Date().toISOString().split('T')[0];
  input.min = today;
}

document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Отправка формы бронирования
document.getElementById('bookingForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn  = this.querySelector('.form-submit');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Отправка...';

  const data = {
    name:     document.getElementById('fName').value,
    phone:    document.getElementById('fPhone').value,
    email:    document.getElementById('fEmail').value,
    tariff:   document.getElementById('fTariff').value,
    engineer: document.getElementById('fEngineer').value,
    date:     document.getElementById('fDate').value,
    comment:  document.getElementById('fComment').value,
  };

  // Сохраняем в localStorage (запасной вариант для админки)
  const stored = JSON.parse(localStorage.getItem('mp_bookings') || '[]');
  stored.push({ ...data, status: 'new', created_at: new Date().toISOString() });
  localStorage.setItem('mp_bookings', JSON.stringify(stored));

  try {
    const res = await fetch(`${API}/bookings`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
  } catch {
    // API недоступен — тост всё равно показываем
  }

  btn.disabled = false;
  btn.innerHTML = orig;
  closeModal();
  this.reset();
  showToast();
});

// Уведомление (тост)
function showToast() {
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// Загрузка отзывов из API
const RU_MONTHS = ['января','февраля','марта','апреля','мая','июня',
                   'июля','августа','сентября','октября','ноября','декабря'];

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${RU_MONTHS[parseInt(m) - 1]} ${y}`;
}

async function loadReviews() {
  const grid = document.getElementById('reviews-list');
  if (!grid || grid.dataset.loaded) return;
  try {
    const res = await fetch(`${API}/reviews`);
    if (!res.ok) throw new Error();
    const list = await res.json();
    grid.innerHTML = list.map(r => `
      <div class="rv-card">
        <div class="rv-top">
          <div class="rv-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
          <div class="rv-date">${fmtDate(r.review_date)}</div>
        </div>
        <p class="rv-text">${r.review_text}</p>
        <div class="rv-author">
          <div class="rv-avatar"><i class="fa-solid fa-user"></i></div>
          <div>
            <div class="rv-name">${r.author_name}</div>
            <div class="rv-city">${r.city ?? ''}</div>
          </div>
        </div>
      </div>`).join('');
    grid.dataset.loaded = '1';
  } catch {
    // API недоступен — остаётся статический HTML
  }
}

// Инициализация страницы
document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  setActiveNav();
  if (document.querySelector('.stat-num[data-count]')) animateCounters();
  if (document.getElementById('map'))          initMap();
  if (document.getElementById('reviews-list')) loadReviews();
});

// Тема (тёмная / светлая)
function initTheme() {
  const saved = localStorage.getItem('mp_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('mp_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.querySelector('i').className =
    theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// Анимация счётчиков в hero-секции
function animateCounters() {
  document.querySelectorAll('.stat-num[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const val = el.querySelector('.count-val');
    if (!val) return;

    let current = 0;
    const inc = Math.ceil(target / 50);
    const timer = setInterval(() => {
      current += inc;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      val.textContent = current;
    }, 30);
  });
}
