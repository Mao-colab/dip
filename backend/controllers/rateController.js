const db = require('../db/connection');

// Базовые тарифы по типу ТС (BYN/км)
const BASE_RATES = {
  'Тентованный':  1.85,
  'Реф':          2.40,
  'Открытый':     1.60,
  'Контейнер':    2.00,
  'Автовоз':      2.20,
  'Изотерм':      2.10,
  'Мегатонник':   2.00,
  'Микроавтобус': 1.20,
  'default':      1.80,
};

const WEIGHT_SURCHARGE = { 5: 0, 10: 0.05, 15: 0.10, 20: 0.15, 24: 0.20 };
const URGENCY_COEFF    = { standard: 1.0, express: 1.35, urgent: 1.70 };
const SEASON_COEFF     = () => {
  const m = new Date().getMonth() + 1;
  if (m >= 12 || m <= 2) return 1.10; // зима
  if (m >= 6  && m <= 8) return 1.05; // лето
  return 1.0;
};

// POST /api/v1/rates/calculate
async function calculateRate(req, res) {
  try {
    const {
      origin_city, dest_city,
      distance_km,
      vehicle_type = 'default',
      weight_t = 0,
      volume_m3 = 0,
      urgency = 'standard',
      load_type,
    } = req.body;

    if (!origin_city || !dest_city) {
      return res.status(400).json({ error: 'Укажите город отправления и назначения' });
    }

    const dist = parseFloat(distance_km) || 300;

    const basePerKm  = BASE_RATES[vehicle_type] || BASE_RATES.default;
    const weightCoef = _weightSurcharge(parseFloat(weight_t));
    const urgCoef    = URGENCY_COEFF[urgency] || 1.0;
    const seasonCoef = SEASON_COEFF();

    const ratePerKm  = +(basePerKm * (1 + weightCoef) * urgCoef * seasonCoef).toFixed(4);
    const totalRate  = +(dist * ratePerKm).toFixed(2);

    const minRate    = +(basePerKm * 50).toFixed(2);
    const finalRate  = Math.max(totalRate, minRate);

    const breakdown = {
      base_per_km:    basePerKm,
      weight_coef:    1 + weightCoef,
      urgency_coef:   urgCoef,
      season_coef:    seasonCoef,
      rate_per_km:    ratePerKm,
      distance_km:    dist,
      subtotal:       totalRate,
      min_rate:       minRate,
      final_rate:     finalRate,
    };

    // Загрузить историю похожих маршрутов
    const [history] = await db.execute(
      `SELECT AVG(rate) AS avg_rate, MIN(rate) AS min_rate, MAX(rate) AS max_rate, COUNT(*) AS count
       FROM rate_quotes
       WHERE origin_city = ? AND dest_city = ? AND created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)`,
      [origin_city, dest_city]
    );

    res.json({
      origin_city, dest_city,
      vehicle_type, weight_t, distance_km: dist, urgency,
      rate:      finalRate,
      currency:  'BYN',
      breakdown,
      market: history[0]?.count > 0 ? {
        avg_rate: +(history[0].avg_rate).toFixed(2),
        min_rate: +(history[0].min_rate).toFixed(2),
        max_rate: +(history[0].max_rate).toFixed(2),
        samples:  history[0].count,
      } : null,
    });
  } catch (err) {
    console.error('[Rate] calculateRate:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// POST /api/v1/rates/save
async function saveQuote(req, res) {
  try {
    const {
      origin_city, dest_city, distance_km, vehicle_type,
      weight_t, volume_m3, rate, currency = 'BYN', rate_per_km, notes,
    } = req.body;

    const [result] = await db.execute(
      `INSERT INTO rate_quotes
         (broker_id, origin_city, dest_city, distance_km, vehicle_type, weight_t, volume_m3, rate, currency, rate_per_km, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [req.user.id, origin_city, dest_city, distance_km || null, vehicle_type || null,
       weight_t || null, volume_m3 || null, rate, currency, rate_per_km || null, notes || null]
    );

    const [[quote]] = await db.execute('SELECT * FROM rate_quotes WHERE id = ?', [result.insertId]);
    res.status(201).json(quote);
  } catch (err) {
    console.error('[Rate] saveQuote:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// GET /api/v1/rates/history
async function getHistory(req, res) {
  try {
    const { origin_city, dest_city, limit = 30, offset = 0 } = req.query;
    const brokerId = req.user.id;
    const role     = req.user.role;

    let where = 'WHERE 1=1';
    const params = [];

    if (!['admin', 'dispatcher'].includes(role)) {
      where += ' AND q.broker_id = ?'; params.push(brokerId);
    }
    if (origin_city) { where += ' AND q.origin_city LIKE ?'; params.push(`%${origin_city}%`); }
    if (dest_city)   { where += ' AND q.dest_city LIKE ?';   params.push(`%${dest_city}%`); }

    const [rows] = await db.execute(
      `SELECT q.*, u.name AS broker_name
       FROM rate_quotes q
       LEFT JOIN users u ON u.id = q.broker_id
       ${where}
       ORDER BY q.created_at DESC
       LIMIT ${parseInt(limit)|0} OFFSET ${parseInt(offset)|0}`,
      params
    );

    res.json({ quotes: rows, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('[Rate] getHistory:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// DELETE /api/v1/rates/:id
async function deleteQuote(req, res) {
  try {
    await db.execute('DELETE FROM rate_quotes WHERE id = ? AND broker_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[Rate] deleteQuote:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

function _weightSurcharge(weight) {
  const thresholds = [24, 20, 15, 10, 5];
  for (const t of thresholds) {
    if (weight >= t) return WEIGHT_SURCHARGE[t] || 0;
  }
  return 0;
}

module.exports = { calculateRate, saveQuote, getHistory, deleteQuote };
