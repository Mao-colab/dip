const db = require('../db/connection');

/**
 * auditLog — middleware-фабрика для записи аудит-лога.
 * Использование: router.post('/', auditLog('create', 'load'), handler)
 */
function auditLog(action, entityType) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async function (body) {
      // Записываем лог после успешного ответа (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = body?.id || req.params?.id || null;
        const userId   = req.user?.id || null;
        const ip       = req.ip || req.socket?.remoteAddress || null;
        const ua       = req.headers?.['user-agent']?.substring(0, 500) || null;

        try {
          await db.execute(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, action, entityType, entityId,
             JSON.stringify(body), ip, ua]
          );
        } catch {}
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = auditLog;
