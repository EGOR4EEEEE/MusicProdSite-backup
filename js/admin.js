// Конфигурация 
const ADMIN_PASS = 'admin2024';
const API = 'http://localhost:3001/api';

const TARIFF_LABELS = {
  vocal:       'Запись вокала',
  instruments: 'Запись инструментов',
  mixing:      'Сведение / Мастеринг',
  rent:        'Аренда студии',
};

const ENGINEER_LABELS = {
  aleksey: 'Алексей Громов',
  dmitriy: 'Дмитрий Орлов',
  igor:    'Игорь Михайлов',
  olga:    'Ольга Вершинина',
};

let allBookings = [];
let chartTariff = null;
let chartMonth  = null;

//Вход / Выход 
window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('mp_admin_auth') === 'ok') {
    showPanel();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
  }
});

function login() {
  const val = document.getElementById('adminPass').value;
  if (val === ADMIN_PASS) {
    localStorage.setItem('mp_admin_auth', 'ok');
    document.getElementById('loginError').style.display = 'none';
    showPanel();
  } else {
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('adminPass').value = '';
  }
}

function logout() {
  localStorage.removeItem('mp_admin_auth');
  location.reload();
}

function showPanel() {
  document.getElementById('loginScreen').style.display  = 'none';
  document.getElementById('adminPanel').style.display   = 'block';
  checkDbStatus();
  loadData();
}

async function checkDbStatus() {
  const bar  = document.getElementById('dbStatusBar');
  const dot  = document.getElementById('dbStatusDot');
  const text = document.getElementById('dbStatusText');

  const setOk  = (msg) => {
    bar.className = 'db-status-bar db-ok';
    dot.className = 'db-status-dot dot-ok';
    text.textContent = msg;
  };
  const setErr = (msg) => {
    bar.className = 'db-status-bar db-err';
    dot.className = 'db-status-dot dot-err';
    text.textContent = msg;
  };

  try {
    const res = await fetch(`${API}/ping`);

    let data = null;
    try { data = await res.json(); } catch { /* тело не JSON */ }

    if (data && data.ok) {
      setOk(`Подключение к БД успешно — ${data.server} / ${data.db}`);
    } else if (data && data.error) {
      setErr(`БД не подключена — ${data.error}`);
    } else if (!res.ok) {
      setErr(`БД не подключена — HTTP ${res.status}`);
    } else {
      setErr('БД не подключена — неизвестная ошибка');
    }
  } catch {
    setErr('Сервер недоступен — перезапусти dotnet run');
  }
}

//Загрузка данных 
async function loadData() {
  try {
    const res = await fetch(`${API}/bookings`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    // API возвращает DESC — нумеруем 1, 2, 3…
    allBookings = data.map((b, i) => ({ ...b, _id: i + 1 }));
  } catch {
    // Сервер недоступен — читаем из localStorage как запасной вариант
    const local = JSON.parse(localStorage.getItem('mp_bookings') || '[]');
    allBookings  = [...local].reverse().map((b, i) => ({ ...b, _id: local.length - i }));
  }
  renderStats();
  renderCharts();
  renderTable(allBookings);
}

// Статистика
function renderStats() {
  const total = allBookings.length;
  const newCnt = allBookings.filter(b => b.status === 'new').length;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const week = allBookings.filter(b => b.created_at && new Date(b.created_at) >= weekAgo).length;

  // Самый популярный тариф
  const tariffCount = {};
  allBookings.forEach(b => {
    const t = b.tariff || 'не указан';
    tariffCount[t] = (tariffCount[t] || 0) + 1;
  });
  const top = Object.entries(tariffCount).sort((a, b) => b[1] - a[1])[0];
  const topLabel = top ? (TARIFF_LABELS[top[0]] || top[0]) : '—';

  setText('statTotal',    total || '0');
  setText('statNew',      newCnt || '0');
  setText('statWeek',     week || '0');
  setText('statTopTariff', topLabel);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

//Диаграммы 
function renderCharts() {
  renderTariffChart();
  renderMonthChart();
}

function renderTariffChart() {
  const counts = { vocal: 0, instruments: 0, mixing: 0, rent: 0, '': 0 };
  allBookings.forEach(b => {
    const k = b.tariff || '';
    if (counts[k] !== undefined) counts[k]++;
    else counts[''] = (counts[''] || 0) + 1;
  });

  const labels = ['Запись вокала', 'Инструменты', 'Сведение', 'Аренда', 'Не указан'];
  const data   = [counts.vocal, counts.instruments, counts.mixing, counts.rent, counts['']];
  const colors = ['#9333ea','#c084fc','#7c3aed','#6d28d9','#4c1d95'];

  const ctx = document.getElementById('chartTariff').getContext('2d');
  if (chartTariff) chartTariff.destroy();

  if (allBookings.length === 0) {
    drawEmptyChart(ctx, 'Нет данных');
    return;
  }

  chartTariff = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8a8aa5', padding: 14, font: { size: 12 } } },
      },
    },
  });
}

function renderMonthChart() {
  const now    = new Date();
  const months = [];
  const counts = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(new Intl.DateTimeFormat('ru', { month: 'short', year: '2-digit' }).format(d));
    const cnt = allBookings.filter(b => b.created_at && b.created_at.startsWith(key)).length;
    counts.push(cnt);
  }

  const ctx = document.getElementById('chartMonth').getContext('2d');
  if (chartMonth) chartMonth.destroy();

  if (allBookings.length === 0) {
    drawEmptyChart(ctx, 'Нет данных');
    return;
  }

  chartMonth = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Заявки',
        data: counts,
        backgroundColor: 'rgba(147,51,234,.65)',
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8a8aa5' }, grid: { color: 'rgba(255,255,255,.05)' } },
        y: { ticks: { color: '#8a8aa5', stepSize: 1 }, grid: { color: 'rgba(255,255,255,.05)' } },
      },
    },
  });
}

function drawEmptyChart(ctx, text) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#6a6a85';
  ctx.textAlign = 'center';
  ctx.font = '14px system-ui';
  ctx.fillText(text, ctx.canvas.width / 2, ctx.canvas.height / 2);
}

// Таблица 
function renderTable(data) {
  const tbody = document.getElementById('bookingsTbody');
  const empty = document.getElementById('tableEmpty');

  if (!data.length) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = data.map(b => {
    const dt = b.created_at
      ? new Date(b.created_at).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
      : '—';
    const tariff   = TARIFF_LABELS[b.tariff]    || b.tariff    || '—';
    const engineer = ENGINEER_LABELS[b.engineer] || b.engineer  || '—';
    const date     = b.date     ? fmtDate(b.date) : '—';
    const comment  = b.comment  ? escHtml(b.comment) : '—';
    const statusCls = b.status === 'new' ? 'status-new' : 'status-other';

    return `<tr>
      <td>${b._id}</td>
      <td>${dt}</td>
      <td><b>${escHtml(b.name || '—')}</b></td>
      <td>${escHtml(b.phone || '—')}</td>
      <td>${tariff}</td>
      <td>${engineer}</td>
      <td>${date}</td>
      <td class="td-comment" title="${escHtml(b.comment || '')}">${comment}</td>
      <td><span class="status-badge ${statusCls}">${b.status || 'new'}</span></td>
    </tr>`;
  }).join('');
}

function filterBookings() {
  const status = document.getElementById('filterStatus').value;
  const search = document.getElementById('filterSearch').value.toLowerCase();

  const filtered = allBookings.filter(b => {
    const matchStatus = !status || b.status === status;
    const matchSearch = !search
      || (b.name  || '').toLowerCase().includes(search)
      || (b.phone || '').toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });

  renderTable(filtered);
}

function clearAll() {
  if (!confirm('Удалить все заявки из истории браузера? Это действие нельзя отменить.')) return;
  localStorage.removeItem('mp_bookings');
  loadData();
}

// Утилиты
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const RU_MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${RU_MONTHS[parseInt(m)-1]} ${y}`;
}
