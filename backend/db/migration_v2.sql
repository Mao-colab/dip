-- ═══════════════════════════════════════════════════════════════════════════
-- MT — Миграция v2: покрытие всех функциональных требований
-- mysql -u root -p mt_broker < migration_v2.sql
-- ═══════════════════════════════════════════════════════════════════════════

USE mt_broker;

-- ─── Users: token_version для инвалидации сессий (NFR-04) ────────────────────
ALTER TABLE Users
  ADD COLUMN IF NOT EXISTS token_version SMALLINT UNSIGNED NOT NULL DEFAULT 0;

-- ─── Loads: параметры груза для фильтрации (FR-03) ───────────────────────────
ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50)    NULL AFTER shipper_phone,
  ADD COLUMN IF NOT EXISTS weight_kg    DECIMAL(8,2)   NULL AFTER vehicle_type,
  ADD COLUMN IF NOT EXISTS volume_m3    DECIMAL(8,2)   NULL AFTER weight_kg,
  ADD COLUMN IF NOT EXISTS rate_min     DECIMAL(10,2)  NULL AFTER volume_m3,
  ADD COLUMN IF NOT EXISTS rate_max     DECIMAL(10,2)  NULL AFTER rate_min;

-- ─── Loads: Proof of Delivery (FR-25) ────────────────────────────────────────
ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS pod_confirmed_at DATETIME      NULL,
  ADD COLUMN IF NOT EXISTS pod_confirmed_by INT UNSIGNED  NULL,
  ADD COLUMN IF NOT EXISTS pod_photo_url    VARCHAR(500)  NULL,
  ADD COLUMN IF NOT EXISTS pod_geo_lat      DECIMAL(10,7) NULL,
  ADD COLUMN IF NOT EXISTS pod_geo_lng      DECIMAL(10,7) NULL,
  ADD COLUMN IF NOT EXISTS pod_notes        TEXT          NULL;

-- ─── Geofences: радиусы точек погрузки/выгрузки (FR-21) ─────────────────────
ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS geofence_radius_m SMALLINT NOT NULL DEFAULT 500;

-- ─── Incidents: инциденты в пути (FR-28) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
    id           BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    load_id      INT              NULL,
    reporter_id  INT UNSIGNED     NOT NULL,
    type         ENUM('breakdown','accident','delay','customs','cargo_damage','other') NOT NULL DEFAULT 'other',
    description  TEXT             NOT NULL,
    lat          DECIMAL(10,7)    NULL,
    lng          DECIMAL(10,7)    NULL,
    photo_url    VARCHAR(500)     NULL,
    status       ENUM('open','in_review','resolved') NOT NULL DEFAULT 'open',
    resolved_at  DATETIME         NULL,
    resolved_by  INT UNSIGNED     NULL,
    created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (load_id)     REFERENCES loads(id)  ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES Users(id)  ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES Users(id)  ON DELETE SET NULL,
    INDEX idx_load     (load_id),
    INDEX idx_reporter (reporter_id),
    INDEX idx_status   (status),
    INDEX idx_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Webhooks: интеграция с внешними системами (FR-29) ───────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
    id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    owner_id   INT UNSIGNED  NOT NULL,
    url        VARCHAR(500)  NOT NULL,
    events     JSON          NOT NULL,
    secret     VARCHAR(100)  NOT NULL,
    active     TINYINT(1)    NOT NULL DEFAULT 1,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_owner  (owner_id),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Webhook Delivery Log (для отладки) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    webhook_id  INT UNSIGNED    NOT NULL,
    event       VARCHAR(100)    NOT NULL,
    payload     JSON            NOT NULL,
    response    TEXT            NULL,
    status_code SMALLINT        NULL,
    delivered   TINYINT(1)      NOT NULL DEFAULT 0,
    created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE,
    INDEX idx_webhook (webhook_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'Миграция v2 выполнена успешно' AS status;
