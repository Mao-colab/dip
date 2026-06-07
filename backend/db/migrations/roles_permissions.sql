-- ═══════════════════════════════════════════════════════════════════════════
-- Миграция: перенос ролей/прав из localStorage фронтенда в БД
-- ═══════════════════════════════════════════════════════════════════════════
USE mt_broker;

CREATE TABLE IF NOT EXISTS role_permissions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  role        VARCHAR(32) NOT NULL,
  permission  VARCHAR(64) NOT NULL,
  enabled     TINYINT(1)  NOT NULL DEFAULT 0,
  updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_role_perm (role, permission)
);

-- Значения по умолчанию (совпадают с прежним DEFAULT_PERMS из Admin.jsx)
INSERT INTO role_permissions (role, permission, enabled) VALUES
('dispatcher','tracking',1),('dispatcher','orders',1),('dispatcher','messages',1),('dispatcher','contacts',1),
('dispatcher','accounting',1),('dispatcher','claims',1),('dispatcher','rates',1),('dispatcher','documents',1),
('dispatcher','legislation',1),('dispatcher','analytics',1),('dispatcher','portal',0),('dispatcher','admin',0),

('broker','tracking',1),('broker','orders',1),('broker','messages',1),('broker','contacts',1),
('broker','accounting',1),('broker','claims',1),('broker','rates',1),('broker','documents',1),
('broker','legislation',1),('broker','analytics',0),('broker','portal',0),('broker','admin',0),

('carrier','tracking',1),('carrier','orders',1),('carrier','messages',1),('carrier','contacts',0),
('carrier','accounting',0),('carrier','claims',1),('carrier','rates',0),('carrier','documents',1),
('carrier','legislation',1),('carrier','analytics',0),('carrier','portal',0),('carrier','admin',0),

('driver','tracking',1),('driver','orders',1),('driver','messages',1),('driver','contacts',0),
('driver','accounting',0),('driver','claims',0),('driver','rates',0),('driver','documents',1),
('driver','legislation',0),('driver','analytics',0),('driver','portal',0),('driver','admin',0),

('client','tracking',0),('client','orders',0),('client','messages',0),('client','contacts',0),
('client','accounting',0),('client','claims',0),('client','rates',0),('client','documents',0),
('client','legislation',0),('client','analytics',0),('client','portal',1),('client','admin',0),

('admin','tracking',1),('admin','orders',1),('admin','messages',1),('admin','contacts',1),
('admin','accounting',1),('admin','claims',1),('admin','rates',1),('admin','documents',1),
('admin','legislation',1),('admin','analytics',1),('admin','portal',1),('admin','admin',1)
ON DUPLICATE KEY UPDATE enabled = VALUES(enabled);
