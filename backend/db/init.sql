-- ═══════════════════════════════════════════════════════════════════════════
-- MT — Полная инициализация базы данных
-- Запускать ОДИН РАЗ при первом развёртывании
-- mysql -u root -p < init.sql
-- ═══════════════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS mt_broker
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Создаём пользователя БД (если нет — выполнить от root)
-- CREATE USER IF NOT EXISTS 'mt_user'@'localhost' IDENTIFIED BY 'MT_Broker2024!';
-- GRANT ALL PRIVILEGES ON mt_broker.* TO 'mt_user'@'localhost';
-- FLUSH PRIVILEGES;

USE mt_broker;

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Users (
    id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)    NOT NULL,
    email         VARCHAR(150)    NOT NULL UNIQUE,
    phone         VARCHAR(30)     NULL,
    password_hash VARCHAR(255)    NOT NULL,
    role          ENUM('admin','dispatcher','broker','carrier','driver','client') NOT NULL DEFAULT 'driver',
    balance       DECIMAL(12,2)   NOT NULL DEFAULT 0.00,

    -- Профиль для каталога перевозчиков
    verified      TINYINT(1)      DEFAULT 0,
    specialization VARCHAR(100)   NULL,
    location      VARCHAR(255)    NULL,
    availability  VARCHAR(50)     NULL,
    dispatch_fee  DECIMAL(10,2)   NULL,
    avatar_color  VARCHAR(20)     DEFAULT '#2563eb',

    -- Трекинг: последняя позиция
    last_lat      DECIMAL(10,7)   NULL,
    last_lng      DECIMAL(10,7)   NULL,
    last_ping_at  DATETIME(3)     NULL,
    status        ENUM('active','idle','switched_off','delayed') NOT NULL DEFAULT 'switched_off',
    load_id       INT UNSIGNED    NULL,

    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_role  (role),
    INDEX idx_email (email),
    INDEX idx_users_status (role, status)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── Loads (Заказы) ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loads (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status               ENUM('Новый','Назначен','Забран','Доставлен','В ожидании','Оплачен','Запрошен','Клейм','Архив','Удалён')
                         NOT NULL DEFAULT 'Новый',
    cod_amount           DECIMAL(10,2) NOT NULL DEFAULT 0,
    driver_pay           DECIMAL(10,2) NOT NULL DEFAULT 0,
    driver_pay_status    ENUM('Не оплачено','В ожидании','Оплачено') DEFAULT 'Не оплачено',

    origin_addr          VARCHAR(255),
    origin_city          VARCHAR(255),
    origin_date          DATE,
    origin_contact       VARCHAR(255),
    origin_phone         VARCHAR(50),
    origin_lat           DECIMAL(10,7) NULL,
    origin_lng           DECIMAL(10,7) NULL,

    destination_addr     VARCHAR(255),
    destination_city     VARCHAR(255),
    destination_date     DATE,
    destination_contact  VARCHAR(255),
    destination_phone    VARCHAR(50),
    dest_lat             DECIMAL(10,7) NULL,
    dest_lng             DECIMAL(10,7) NULL,

    shipper_name         VARCHAR(255),
    shipper_phone        VARCHAR(50),

    driver_id            INT UNSIGNED NULL,
    dispatcher_id        INT UNSIGNED NULL,

    planned_pickup_at    DATETIME     NULL,
    planned_delivery_at  DATETIME     NULL,
    delay_minutes        SMALLINT     NULL DEFAULT 0,

    created_at           DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (driver_id)     REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (dispatcher_id) REFERENCES Users(id) ON DELETE SET NULL,
    INDEX idx_status     (status),
    INDEX idx_driver     (driver_id),
    INDEX idx_dispatcher (dispatcher_id),
    INDEX idx_created    (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── load_id FK для Users ─────────────────────────────────────────────────────
ALTER TABLE Users
    ADD CONSTRAINT fk_users_current_load
        FOREIGN KEY (load_id) REFERENCES loads(id) ON DELETE SET NULL;

-- ─── Load Vehicles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS load_vehicles (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    load_id  INT UNSIGNED NOT NULL,
    year     SMALLINT,
    make     VARCHAR(100),
    type     VARCHAR(50),
    vin      VARCHAR(50),
    price    DECIMAL(10,2),
    FOREIGN KEY (load_id) REFERENCES loads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── User Vehicles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_vehicles (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    driver_id  INT UNSIGNED     NOT NULL,
    type       VARCHAR(50)      NOT NULL,
    make       VARCHAR(100)     NOT NULL,
    model      VARCHAR(100)     NULL,
    year       SMALLINT         NOT NULL,
    vin        VARCHAR(50)      NULL UNIQUE,
    plate      VARCHAR(20)      NULL,
    capacity   DECIMAL(8,2)     NULL,
    volume     DECIMAL(8,2)     NULL,
    length     DECIMAL(6,2)     NULL,
    status     ENUM('active','maintenance','inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_driver_type (driver_id, type),
    INDEX idx_status (status)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── GPS Logs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS GPS_Logs (
    id         BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    driver_id  INT UNSIGNED     NOT NULL,
    load_id    INT UNSIGNED     NULL,
    lat        DECIMAL(10,7)    NOT NULL,
    lng        DECIMAL(10,7)    NOT NULL,
    speed      DECIMAL(6,2)     NOT NULL DEFAULT 0,
    heading    SMALLINT         NOT NULL DEFAULT 0,
    accuracy   DECIMAL(6,2)     NULL,
    created_at DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_gps_driver FOREIGN KEY (driver_id) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_gps_load   FOREIGN KEY (load_id)   REFERENCES loads(id) ON DELETE SET NULL,
    INDEX idx_driver_time (driver_id, created_at),
    INDEX idx_load_time   (load_id,   created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Messages (
    id          BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    sender_id   INT UNSIGNED     NOT NULL,
    receiver_id INT UNSIGNED     NOT NULL,
    order_id    INT UNSIGNED     NULL,
    text        TEXT             NOT NULL,
    type        ENUM('text','image','file','system') NOT NULL DEFAULT 'text',
    is_read     TINYINT(1)       NOT NULL DEFAULT 0,
    created_at  DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_msg_sender   FOREIGN KEY (sender_id)   REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_order    FOREIGN KEY (order_id)    REFERENCES loads(id) ON DELETE SET NULL,
    INDEX idx_dialog     (sender_id, receiver_id, created_at),
    INDEX idx_order_chat (order_id, created_at),
    INDEX idx_unread     (receiver_id, is_read)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── Contacts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    broker_id       INT UNSIGNED NOT NULL,
    contact_user_id INT UNSIGNED NOT NULL,
    blacklisted     TINYINT(1) DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_broker_contact (broker_id, contact_user_id),
    FOREIGN KEY (broker_id)       REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_user_id) REFERENCES Users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Reviews ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    author_id      INT UNSIGNED NOT NULL,
    target_user_id INT UNSIGNED NOT NULL,
    rating         TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text           TEXT,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_author_target (author_id, target_user_id),
    FOREIGN KEY (author_id)      REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_target (target_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Claims (Претензии) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS claims (
    id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    load_id         INT UNSIGNED    NULL,
    claimant_id     INT UNSIGNED    NOT NULL,
    respondent_id   INT UNSIGNED    NULL,
    type            ENUM('cargo_damage','delay','non_payment','document','other') NOT NULL DEFAULT 'other',
    status          ENUM('Новая','На рассмотрении','Принята','Отклонена','Урегулирована','Закрыта') NOT NULL DEFAULT 'Новая',
    amount          DECIMAL(12,2)   NOT NULL DEFAULT 0,
    currency        VARCHAR(10)     NOT NULL DEFAULT 'BYN',
    description     TEXT            NOT NULL,
    resolution      TEXT            NULL,
    resolved_by     INT UNSIGNED    NULL,
    resolved_at     DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (claimant_id)   REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (respondent_id) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by)   REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (load_id)       REFERENCES loads(id) ON DELETE SET NULL,
    INDEX idx_claimant  (claimant_id),
    INDEX idx_status    (status),
    INDEX idx_load      (load_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Rate Quotes (Ставки) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_quotes (
    id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    broker_id       INT UNSIGNED    NOT NULL,
    origin_city     VARCHAR(255)    NOT NULL,
    dest_city       VARCHAR(255)    NOT NULL,
    distance_km     DECIMAL(8,1)    NULL,
    vehicle_type    VARCHAR(50)     NULL,
    weight_t        DECIMAL(8,2)    NULL,
    volume_m3       DECIMAL(8,2)    NULL,
    rate            DECIMAL(12,2)   NOT NULL,
    currency        VARCHAR(10)     NOT NULL DEFAULT 'BYN',
    rate_per_km     DECIMAL(8,4)    NULL,
    notes           TEXT            NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (broker_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_broker    (broker_id),
    INDEX idx_route     (origin_city, dest_city),
    INDEX idx_created   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Notifications (Уведомления) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED    NOT NULL,
    type            VARCHAR(50)     NOT NULL DEFAULT 'info',
    title           VARCHAR(255)    NOT NULL,
    message         TEXT            NOT NULL,
    is_read         TINYINT(1)      NOT NULL DEFAULT 0,
    entity_type     VARCHAR(50)     NULL,
    entity_id       INT UNSIGNED    NULL,
    created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_created     (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED    NULL,
    action          VARCHAR(100)    NOT NULL,
    entity_type     VARCHAR(50)     NOT NULL,
    entity_id       INT UNSIGNED    NULL,
    old_data        JSON            NULL,
    new_data        JSON            NULL,
    ip_address      VARCHAR(45)     NULL,
    user_agent      VARCHAR(500)    NULL,
    created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL,
    INDEX idx_user      (user_id),
    INDEX idx_entity    (entity_type, entity_id),
    INDEX idx_action    (action),
    INDEX idx_created   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Carrier Documents (Верификация перевозчиков) ────────────────────────────
CREATE TABLE IF NOT EXISTS carrier_documents (
    id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED    NOT NULL,
    doc_type        ENUM('license','insurance','vehicle_cert','medical','adr','other') NOT NULL,
    doc_number      VARCHAR(100)    NULL,
    issued_by       VARCHAR(255)    NULL,
    issued_at       DATE            NULL,
    expires_at      DATE            NULL,
    status          ENUM('pending','verified','expired','rejected') NOT NULL DEFAULT 'pending',
    verified_by     INT UNSIGNED    NULL,
    verified_at     DATETIME        NULL,
    notes           TEXT            NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)     REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES Users(id) ON DELETE SET NULL,
    INDEX idx_user_type  (user_id, doc_type),
    INDEX idx_status     (status),
    INDEX idx_expires    (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'База данных MT инициализирована успешно' AS status;
