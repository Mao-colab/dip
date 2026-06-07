-- ═══════════════════════════════════════════════════════════════════════════
-- MT — MySQL Schema: GPS & Tracking модуль
-- SRS §7.1 ERD: таблица GPS_Logs — высокочастотное хранилище координат
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Таблица GPS_Logs ────────────────────────────────────────────────────────
-- Высокочастотная таблица: один INSERT каждые 30–60 секунд на активного водителя.
-- Индексы по driver_id и load_id.
-- При нагрузке >1M строк/день рекомендуется партиционирование по дате.

CREATE TABLE IF NOT EXISTS GPS_Logs (
    id         BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,

    driver_id  INT UNSIGNED     NOT NULL,
    load_id    INT UNSIGNED     NULL,           -- NULL если водитель без заказа

    lat        DECIMAL(10, 7)   NOT NULL,       -- широта  (точность ~1 см)
    lng        DECIMAL(10, 7)   NOT NULL,       -- долгота

    -- ✅ ИСПРАВЛЕНО: комментарий км/ч (было миль/ч) — согласовано с GpsService.js
    speed      DECIMAL(6, 2)    NOT NULL DEFAULT 0,   -- км/ч
    heading    SMALLINT         NOT NULL DEFAULT 0,   -- курс 0–359°
    accuracy   DECIMAL(6, 2)    NULL,                 -- точность GPS в метрах

    -- Миллисекундная точность для Dead Reckoning (SRS §12)
    created_at DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    -- Связи с основными таблицами (SRS §6)
    CONSTRAINT fk_gps_driver FOREIGN KEY (driver_id)
        REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_gps_load FOREIGN KEY (load_id)
        REFERENCES Loads(id) ON DELETE SET NULL,

    --
    INDEX idx_driver_time (driver_id, created_at),
    INDEX idx_load_time   (load_id,   created_at)

) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Хранилище GPS-пингов. Пинги каждые 30–60 сек (SRS §5 Надёжность)';


-- ─── Расширение таблицы Users: живая позиция водителя ───────────────────────
-- Для быстрого отображения маркера на карте без JOIN с GPS_Logs

ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS last_lat     DECIMAL(10, 7) NULL
        COMMENT 'Последняя широта водителя',
    ADD COLUMN IF NOT EXISTS last_lng     DECIMAL(10, 7) NULL
        COMMENT 'Последняя долгота водителя',
    ADD COLUMN IF NOT EXISTS last_ping_at DATETIME(3)    NULL
        COMMENT 'Время последнего GPS-пинга',
    ADD COLUMN IF NOT EXISTS status       ENUM(
        'active',       -- онлайн, выполняет заказ
        'idle',         -- онлайн, заказов нет
        'switched_off', -- оффлайн
        'delayed'       -- опаздывает (SRS FR-05)
    ) NOT NULL DEFAULT 'switched_off'
        COMMENT 'Статус водителя',
    ADD COLUMN IF NOT EXISTS load_id      INT UNSIGNED   NULL
        COMMENT 'Текущий активный заказ';

-- Внешний ключ для load_id добавляем отдельно (синтаксис ADD COLUMN не поддерживает REFERENCES)
ALTER TABLE Users
    ADD CONSTRAINT fk_users_load
        FOREIGN KEY IF NOT EXISTS (load_id)
        REFERENCES Loads(id) ON DELETE SET NULL;

-- 
-- Используем DROP + CREATE через процедуру
DROP PROCEDURE IF EXISTS create_index_if_not_exists;
DELIMITER $$
CREATE PROCEDURE create_index_if_not_exists()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name   = 'Users'
          AND index_name   = 'idx_users_status'
    ) THEN
        CREATE INDEX idx_users_status ON Users(role, status);
    END IF;
END$$
DELIMITER ;
CALL create_index_if_not_exists();
DROP PROCEDURE IF EXISTS create_index_if_not_exists;


-- ─── Расширение таблицы Loads: поля для трекинга ────────────────────────────

ALTER TABLE Loads
    ADD COLUMN IF NOT EXISTS origin_lat          DECIMAL(10, 7) NULL
        COMMENT 'Широта точки погрузки',
    ADD COLUMN IF NOT EXISTS origin_lng          DECIMAL(10, 7) NULL
        COMMENT 'Долгота точки погрузки',
    ADD COLUMN IF NOT EXISTS dest_lat            DECIMAL(10, 7) NULL
        COMMENT 'Широта точки доставки',
    ADD COLUMN IF NOT EXISTS dest_lng            DECIMAL(10, 7) NULL
        COMMENT 'Долгота точки доставки',
    ADD COLUMN IF NOT EXISTS planned_pickup_at   DATETIME       NULL
        COMMENT 'Плановое время погрузки',
    ADD COLUMN IF NOT EXISTS planned_delivery_at DATETIME       NULL
        COMMENT 'Плановое время доставки',
    ADD COLUMN IF NOT EXISTS delay_minutes       SMALLINT       NULL DEFAULT 0
        COMMENT 'Минут опоздания';

-- 
-- Используем обычный MODIFY COLUMN
ALTER TABLE Loads
    MODIFY COLUMN status ENUM(
        'new',
        'assigned',
        'picked_up',
        'delayed',    -- добавлен для SRS FR-05
        'delivered',
        'paid',
        'archived'
    ) NOT NULL DEFAULT 'new'
    COMMENT 'Статус заказа';


-- ─── Автоочистка устаревших GPS-логов (EVENT планировщик) ───────────────────
-- Хранение: 90 дней. Требует: event_scheduler = ON в MySQL.
-- Включить: SET GLOBAL event_scheduler = ON;
-- Проверить: SHOW VARIABLES LIKE 'event_scheduler';

DROP EVENT IF EXISTS cleanup_old_gps_logs;

DELIMITER $$
CREATE EVENT cleanup_old_gps_logs
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
COMMENT 'Удаляет GPS-логи старше 90 дней'
DO
BEGIN
    DELETE FROM GPS_Logs
    WHERE created_at < NOW() - INTERVAL 90 DAY;
    
    -- Логируем количество удалённых строк
    -- (опционально: INSERT INTO system_logs ...)
END$$
DELIMITER ;