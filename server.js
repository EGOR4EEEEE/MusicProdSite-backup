const express = require('express');
const sql     = require('mssql');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Отдаём статические файлы сайта из этой же папки
app.use(express.static(path.join(__dirname)));

// Настройки подключения к SQL Server (Windows Auth)
const config = {
  server:   'localhost',
  port:     1433,
  database: 'MusicProd',
  user:     'sa',
  password: 'StudioPass1',
  options: {
    trustServerCertificate: true,
    encrypt:                false
  }
};

// Вспомогательная функция для SELECT-запросов
async function query(sqlText, params = {}) {
  const pool = await sql.connect(config);
  const req  = pool.request();
  for (const [key, val] of Object.entries(params)) {
    req.input(key, val);
  }
  const result = await req.query(sqlText);
  return result.recordset;
}

// GET /api/ping — проверка подключения
app.get('/api/ping', async (req, res) => {
  try {
    await sql.connect(config);
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// GET /api/tariffs
app.get('/api/tariffs', async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, slug, name, description, price, unit, icon, is_featured FROM Tariffs WHERE is_active = 1 ORDER BY sort_order'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engineers
app.get('/api/engineers', async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, name, slug, specialization, experience_years, description FROM Engineers WHERE is_active = 1 ORDER BY sort_order'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const rows = await query(
      "SELECT id, author_name, city, rating, review_text, CONVERT(varchar(10), review_date, 23) AS review_date FROM Reviews WHERE is_approved = 1 ORDER BY review_date DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const rows = await query(`
      SELECT b.id,
             b.client_name AS name,
             b.phone,
             b.email,
             t.slug        AS tariff,
             e.slug        AS engineer,
             CONVERT(varchar(10), b.session_date, 23) AS date,
             b.comment,
             b.status,
             CONVERT(varchar(23), b.created_at, 126)  AS created_at
      FROM   Bookings b
      LEFT JOIN Tariffs   t ON t.id = b.tariff_id
      LEFT JOIN Engineers e ON e.id = b.engineer_id
      ORDER  BY b.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings
app.post('/api/bookings', async (req, res) => {
  const { name, phone, email, tariff, engineer, date, comment } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Имя и телефон обязательны' });
  }

  try {
    const pool = await sql.connect(config);

    // Ищем id тарифа по slug
    let tariffId = null;
    if (tariff) {
      const t = await pool.request()
        .input('slug', tariff)
        .query('SELECT id FROM Tariffs WHERE slug = @slug');
      if (t.recordset.length > 0) tariffId = t.recordset[0].id;
    }

    // Ищем id инженера по slug
    let engineerId = null;
    if (engineer) {
      const e = await pool.request()
        .input('slug', engineer)
        .query('SELECT id FROM Engineers WHERE slug = @slug');
      if (e.recordset.length > 0) engineerId = e.recordset[0].id;
    }

    await pool.request()
      .input('name',       name)
      .input('phone',      phone)
      .input('email',      email    || null)
      .input('tariffId',   tariffId)
      .input('engineerId', engineerId)
      .input('date',       date     || null)
      .input('comment',    comment  || null)
      .query(`
        INSERT INTO Bookings (client_name, phone, email, tariff_id, engineer_id, session_date, comment)
        VALUES (@name, @phone, @email, @tariffId, @engineerId, @date, @comment)
      `);

    res.json({ success: true, message: 'Заявка принята' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log('Сервер запущен: http://localhost:3001');
});
