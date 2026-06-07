/**
 * MT — Webhooks Controller
 * FR-29: Интеграция с внешними системами через вебхуки (1С, ERP, кастомные системы)
 */

const db     = require('../db/connection');
const crypto = require('crypto');
const https  = require('https');
const http   = require('http');

// GET /api/v1/webhooks
async function listWebhooks(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT id, url, events, active, created_at FROM webhooks WHERE owner_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ webhooks: rows });
  } catch (err) {
    console.error('[Webhooks] list:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// POST /api/v1/webhooks
async function createWebhook(req, res) {
  try {
    const { url, events } = req.body;

    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: 'Укажите корректный URL вебхука' });
    }
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Укажите хотя бы одно событие' });
    }

    const ALLOWED_EVENTS = [
      'load.created', 'load.status_changed', 'load.delivered', 'load.paid',
      'incident.created', 'review.created', 'carrier.blocked',
    ];
    const invalidEvents = events.filter(e => !ALLOWED_EVENTS.includes(e));
    if (invalidEvents.length) {
      return res.status(400).json({ error: `Недопустимые события: ${invalidEvents.join(', ')}` });
    }

    const secret = crypto.randomBytes(32).toString('hex');

    const [result] = await db.execute(
      `INSERT INTO webhooks (owner_id, url, events, secret) VALUES (?, ?, ?, ?)`,
      [req.user.id, url, JSON.stringify(events), secret]
    );

    const [[created]] = await db.execute('SELECT * FROM webhooks WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...created, secret });
  } catch (err) {
    console.error('[Webhooks] create:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// PATCH /api/v1/webhooks/:id
async function updateWebhook(req, res) {
  try {
    const { url, events, active } = req.body;
    const sets = [];
    const vals = [];

    if (url    !== undefined) { sets.push('url = ?');    vals.push(url); }
    if (events !== undefined) { sets.push('events = ?'); vals.push(JSON.stringify(events)); }
    if (active !== undefined) { sets.push('active = ?'); vals.push(active ? 1 : 0); }

    if (!sets.length) return res.status(400).json({ error: 'Нет полей' });

    vals.push(req.params.id, req.user.id);
    await db.execute(`UPDATE webhooks SET ${sets.join(', ')} WHERE id = ? AND owner_id = ?`, vals);

    const [[updated]] = await db.execute('SELECT id, url, events, active, created_at FROM webhooks WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error('[Webhooks] update:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// DELETE /api/v1/webhooks/:id
async function deleteWebhook(req, res) {
  try {
    await db.execute('DELETE FROM webhooks WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[Webhooks] delete:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// POST /api/v1/webhooks/:id/test
async function testWebhook(req, res) {
  try {
    const [[webhook]] = await db.execute(
      'SELECT * FROM webhooks WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id]
    );
    if (!webhook) return res.status(404).json({ error: 'Вебхук не найден' });

    const payload = { event: 'webhook.test', timestamp: new Date().toISOString(), data: { message: 'MT webhook test' } };
    const result  = await deliverWebhook(webhook, 'webhook.test', payload);
    res.json({ success: result.ok, statusCode: result.statusCode, response: result.body });
  } catch (err) {
    console.error('[Webhooks] test:', err.message);
    res.status(500).json({ error: 'Ошибка теста' });
  }
}

// ── Публичная утилита: доставить событие всем активным вебхукам ───────────────
async function dispatchEvent(event, data) {
  try {
    const [webhooks] = await db.execute(
      `SELECT * FROM webhooks WHERE active = 1 AND JSON_CONTAINS(events, ?)`,
      [JSON.stringify(event)]
    );

    const payload = { event, timestamp: new Date().toISOString(), data };

    for (const wh of webhooks) {
      deliverWebhook(wh, event, payload).catch(() => {});
    }
  } catch (err) {
    console.warn('[Webhooks] dispatchEvent error:', err.message);
  }
}

// ── Внутренняя: HTTP-доставка с HMAC-подписью ────────────────────────────────
function deliverWebhook(webhook, event, payload) {
  return new Promise((resolve) => {
    const body      = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
    const url       = new URL(webhook.url);

    const options = {
      method:   'POST',
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      headers:  {
        'Content-Type':       'application/json',
        'Content-Length':     Buffer.byteLength(body),
        'X-MT-Event':         event,
        'X-MT-Signature':     `sha256=${signature}`,
        'X-MT-Delivery-ID':   crypto.randomUUID(),
      },
      timeout: 10000,
    };

    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(options, (res2) => {
      let responseBody = '';
      res2.on('data', chunk => { responseBody += chunk; });
      res2.on('end', () => {
        _logDelivery(webhook.id, event, payload, res2.statusCode, responseBody.substring(0, 500));
        resolve({ ok: res2.statusCode < 400, statusCode: res2.statusCode, body: responseBody.substring(0, 200) });
      });
    });

    req.on('error', (err) => {
      _logDelivery(webhook.id, event, payload, 0, err.message);
      resolve({ ok: false, statusCode: 0, body: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      _logDelivery(webhook.id, event, payload, 0, 'timeout');
      resolve({ ok: false, statusCode: 0, body: 'timeout' });
    });

    req.write(body);
    req.end();
  });
}

async function _logDelivery(webhookId, event, payload, statusCode, response) {
  try {
    await db.execute(
      `INSERT INTO webhook_deliveries (webhook_id, event, payload, status_code, response, delivered)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [webhookId, event, JSON.stringify(payload), statusCode, response, statusCode >= 200 && statusCode < 400 ? 1 : 0]
    );
  } catch {}
}

module.exports = { listWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, dispatchEvent };
