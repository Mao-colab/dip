-- ═══════════════════════════════════════════════════════════════════════════
-- MT — MySQL Schema: Базовые таблицы
-- Users, Messages
--
--  ═══════════════════════════════════════════════════════════════════════════

-- ─── Таблица Users ───────────────────────────────────────────────────────────
-- Хранит учётные данные и роли всех участников системы.
-- Расширяется в tracking_schema.sql (last_lat/lng, status, load_id)
-- и в orders_contacts_schema.sql (verified, specialization, location и др.)

CREATE TABLE IF NOT EXISTS Users (
    id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)    NOT NULL,
    email         VARCHAR(150)    NOT NULL UNIQUE,
    phone         VARCHAR(30)     NULL,
    password_hash VARCHAR(255)    NOT NULL,

    role          ENUM(
        'admin',
        'dispatcher',
        'broker',
        'carrier',
        'driver'
    ) NOT NULL DEFAULT 'driver',

    balance       DECIMAL(12, 2)  NOT NULL DEFAULT 0.00
        COMMENT 'Баланс водителя/диспетчера (USD)',

    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_role  (role),
    INDEX idx_email (email)

) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Пользователи системы: брокеры, диспетчеры, водители';


-- ─── Таблица Messages ────────────────────────────────────────────────────────
-- Хранит историю переписки мессенджера (FR-07).
-- Каждое сообщение привязано к паре sender/receiver и опционально к заказу.

CREATE TABLE IF NOT EXISTS Messages (
    id          BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,

    sender_id   INT UNSIGNED     NOT NULL,
    receiver_id INT UNSIGNED     NOT NULL,
    order_id    INT UNSIGNED     NULL        -- NULL = личное сообщение вне заказа
        COMMENT 'Заказ, в контексте которого написано сообщение',

    text        TEXT             NOT NULL,
    type        ENUM('text', 'image', 'file', 'system')
                                 NOT NULL DEFAULT 'text',
    is_read     TINYINT(1)       NOT NULL DEFAULT 0,

    -- Миллисекундная точность для корректной сортировки
    created_at  DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT fk_msg_sender
        FOREIGN KEY (sender_id)   REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_receiver
        FOREIGN KEY (receiver_id) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_order
        FOREIGN KEY (order_id)    REFERENCES Loads(id) ON DELETE SET NULL,

    -- Быстрый доступ к диалогу двух пользователей
    INDEX idx_dialog     (sender_id,   receiver_id, created_at),
    -- Быстрый доступ к истории по заказу
    INDEX idx_order_chat (order_id,    created_at),
    -- Счётчик непрочитанных
    INDEX idx_unread     (receiver_id, is_read)

) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Сообщения мессенджера (FR-07). Привязаны к паре пользователей и/или заказу.';