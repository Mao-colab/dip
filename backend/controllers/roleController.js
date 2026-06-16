/**
 * Управление ролями и правами доступа (хранится в БД, таблица role_permissions).
 * Заменяет прежнее хранение конфигурации в localStorage фронтенда.
 */
const db = require('../db/connection');

exports.getRolePermissions = async (req, res) => {
  const [rows] = await db.execute(
    'SELECT role, permission, enabled FROM role_permissions ORDER BY role, permission'
  );
  const result = {};
  for (const r of rows) {
    if (!result[r.role]) result[r.role] = {};
    result[r.role][r.permission] = !!r.enabled;
  }
  res.json(result);
};

exports.updateRolePermission = async (req, res) => {
  const { role, permission, enabled } = req.body;
  if (!role || !permission) {
    return res.status(400).json({ error: 'role и permission обязательны' });
  }
  if (role === 'admin' && permission === 'admin' && !enabled) {
    return res.status(400).json({ error: 'Нельзя снять право admin у роли admin' });
  }
  await db.execute(
    `INSERT INTO role_permissions (role, permission, enabled) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
    [role, permission, enabled ? 1 : 0]
  );
  res.json({ ok: true });
};

exports.resetRolePermissions = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(
    path.join(__dirname, '../db/migrations/roles_permissions.sql'),
    'utf8'
  );
  const insertStatement = sql.split(/;\s*\n/).find((s) => /^\s*INSERT INTO role_permissions/i.test(s));
  if (insertStatement) await db.query(insertStatement);
  exports.getRolePermissions(req, res);
};
