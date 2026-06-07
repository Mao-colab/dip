const db   = require('../db/connection');
const XLSX = require('xlsx');

function sendXlsx(res, workbook, filename) {
  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
}

// GET /api/v1/export/loads
async function exportLoads(req, res) {
  try {
    const { status, date_from, date_to } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    if (status)    { where += ' AND l.status = ?';           params.push(status); }
    if (date_from) { where += ' AND l.created_at >= ?';      params.push(date_from); }
    if (date_to)   { where += ' AND l.created_at <= ?';      params.push(date_to + ' 23:59:59'); }

    const [rows] = await db.execute(
      `SELECT l.id, l.status, l.origin_city, l.destination_city,
              l.origin_date, l.destination_date,
              l.shipper_name, l.shipper_phone,
              l.cod_amount, l.driver_pay, l.driver_pay_status,
              u1.name AS driver_name,
              u2.name AS dispatcher_name,
              l.created_at
       FROM loads l
       LEFT JOIN Users u1 ON u1.id = l.driver_id
       LEFT JOIN Users u2 ON u2.id = l.dispatcher_id
       ${where}
       ORDER BY l.created_at DESC`,
      params
    );

    const data = rows.map(r => ({
      'ID':              r.id,
      'Статус':          r.status,
      'Откуда':          r.origin_city,
      'Куда':            r.destination_city,
      'Дата погрузки':   r.origin_date,
      'Дата доставки':   r.destination_date,
      'Грузоотправитель':r.shipper_name,
      'Телефон':         r.shipper_phone,
      'Сумма COD':       r.cod_amount,
      'Оплата водителю': r.driver_pay,
      'Статус оплаты':   r.driver_pay_status,
      'Водитель':        r.driver_name,
      'Диспетчер':       r.dispatcher_name,
      'Создан':          r.created_at,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Заказы');
    sendXlsx(res, wb, `MT_Loads_${_dateStr()}.xlsx`);
  } catch (err) {
    console.error('[Export] exportLoads:', err.message);
    res.status(500).json({ error: 'Ошибка экспорта' });
  }
}

// GET /api/v1/export/analytics
async function exportAnalytics(req, res) {
  try {
    const [byStatus] = await db.execute(
      `SELECT status, COUNT(*) AS count, SUM(cod_amount) AS total_cod, SUM(driver_pay) AS total_pay
       FROM loads GROUP BY status`
    );
    const [byDriver] = await db.execute(
      `SELECT u.name, COUNT(l.id) AS loads_count,
              SUM(l.cod_amount) AS total_cod, SUM(l.driver_pay) AS total_pay,
              ROUND(AVG(r.rating),2) AS avg_rating
       FROM loads l
       JOIN Users u ON u.id = l.driver_id
       LEFT JOIN reviews r ON r.target_user_id = l.driver_id
       GROUP BY l.driver_id ORDER BY loads_count DESC`
    );
    const [byMonth] = await db.execute(
      `SELECT DATE_FORMAT(created_at,'%Y-%m') AS month,
              COUNT(*) AS count, SUM(cod_amount) AS revenue
       FROM loads
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month ORDER BY month`
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byStatus), 'По статусам');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byDriver), 'По водителям');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byMonth),  'По месяцам');
    sendXlsx(res, wb, `MT_Analytics_${_dateStr()}.xlsx`);
  } catch (err) {
    console.error('[Export] exportAnalytics:', err.message);
    res.status(500).json({ error: 'Ошибка экспорта' });
  }
}

// GET /api/v1/export/claims
async function exportClaims(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT c.id, c.type, c.status, c.amount, c.currency,
              c.description, c.resolution,
              u1.name AS claimant, u2.name AS respondent,
              l.origin_city, l.destination_city,
              c.created_at, c.resolved_at
       FROM claims c
       LEFT JOIN Users u1 ON u1.id = c.claimant_id
       LEFT JOIN Users u2 ON u2.id = c.respondent_id
       LEFT JOIN loads l  ON l.id  = c.load_id
       ORDER BY c.created_at DESC`
    );

    const data = rows.map(r => ({
      'ID':         r.id,
      'Тип':        r.type,
      'Статус':     r.status,
      'Сумма':      r.amount,
      'Валюта':     r.currency,
      'Заявитель':  r.claimant,
      'Ответчик':   r.respondent,
      'Маршрут':    r.origin_city && r.destination_city ? `${r.origin_city} — ${r.destination_city}` : '—',
      'Описание':   r.description,
      'Резолюция':  r.resolution,
      'Создана':    r.created_at,
      'Закрыта':    r.resolved_at,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Претензии');
    sendXlsx(res, wb, `MT_Claims_${_dateStr()}.xlsx`);
  } catch (err) {
    console.error('[Export] exportClaims:', err.message);
    res.status(500).json({ error: 'Ошибка экспорта' });
  }
}

function _dateStr() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = { exportLoads, exportAnalytics, exportClaims };
