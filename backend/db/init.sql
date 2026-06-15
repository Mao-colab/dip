-- ═══════════════════════════════════════════════════════════════════════════
-- MT — Каноническая схема базы данных (MySQL 8, InnoDB, utf8mb4)
--
-- Это ЕДИНСТВЕННЫЙ источник правды по структуре БД.
-- Все имена таблиц — в нижнем регистре (lower_snake_case), что безопасно и на
-- Linux (где имена таблиц чувствительны к регистру), и на Windows/macOS.
--
-- Скрипт НЕ создаёт базу и не делает USE — выполняйте его в уже выбранной БД:
--   • Railway / облако:  просто выполните файл в подключённой базе (напр. `railway`).
--   • Локально:          CREATE DATABASE mt_broker; USE mt_broker; затем этот файл.
--
-- Скрипт идемпотентен (CREATE TABLE IF NOT EXISTS) — повторный запуск безопасен.
-- ═══════════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ─── users ────────────────────────────────────────────────────────────────────
-- Единая таблица всех участников: админ, диспетчер, брокер, перевозчик, водитель, клиент.
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)    NOT NULL,
    email         VARCHAR(150)    NOT NULL UNIQUE,
    phone         VARCHAR(30)     NULL,
    password_hash VARCHAR(255)    NOT NULL,
    role          ENUM('admin','dispatcher','broker','carrier','driver','client') NOT NULL DEFAULT 'driver',
    balance       DECIMAL(12,2)   NOT NULL DEFAULT 0.00,

    -- Профиль для каталога перевозчиков
    verified      TINYINT(1)      NOT NULL DEFAULT 0,
    specialization VARCHAR(100)   NULL,
    location      VARCHAR(255)    NULL,
    availability  VARCHAR(50)     NULL,
    dispatch_fee  DECIMAL(10,2)   NULL,
    avatar_color  VARCHAR(20)     NOT NULL DEFAULT '#2563eb',

    -- Трекинг: последняя известная позиция
    last_lat      DECIMAL(10,7)   NULL,
    last_lng      DECIMAL(10,7)   NULL,
    last_ping_at  DATETIME(3)     NULL,
    status        ENUM('active','idle','switched_off','delayed') NOT NULL DEFAULT 'switched_off',
    load_id       INT UNSIGNED    NULL,   -- текущий назначенный заказ (без FK: избегаем циклической зависимости с loads)

    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_role        (role),
    INDEX idx_users_status (role, status),
    INDEX idx_current_load (load_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── loads (Заказы / грузы) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loads (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status               ENUM('Новый','Назначен','Забран','Доставлен','В ожидании','Оплачен','Запрошен','Клейм','Архив','Удалён','delayed')
                         NOT NULL DEFAULT 'Новый',

    -- Параметры груза/ТС
    vehicle_type         VARCHAR(50)   NULL,
    weight_kg            DECIMAL(10,2) NULL,
    volume_m3            DECIMAL(8,2)  NULL,

    -- Финансы
    cod_amount           DECIMAL(10,2) NOT NULL DEFAULT 0,
    driver_pay           DECIMAL(10,2) NOT NULL DEFAULT 0,
    driver_pay_status    ENUM('Не оплачено','В ожидании','Оплачено') NOT NULL DEFAULT 'Не оплачено',

    -- Точка погрузки
    origin_addr          VARCHAR(255),
    origin_city          VARCHAR(255),
    origin_date          DATE,
    origin_contact       VARCHAR(255),
    origin_phone         VARCHAR(50),
    origin_lat           DECIMAL(10,7) NULL,
    origin_lng           DECIMAL(10,7) NULL,

    -- Точка выгрузки
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
    geofence_radius_m    INT UNSIGNED NOT NULL DEFAULT 500,  -- радиус геозоны для авто-статусов

    -- Proof of Delivery (подтверждение доставки)
    pod_confirmed_at     DATETIME      NULL,
    pod_confirmed_by     INT UNSIGNED  NULL,
    pod_photo_url        VARCHAR(255)  NULL,
    pod_geo_lat          DECIMAL(10,7) NULL,
    pod_geo_lng          DECIMAL(10,7) NULL,
    pod_notes            TEXT          NULL,

    created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_loads_driver     FOREIGN KEY (driver_id)        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_loads_dispatcher FOREIGN KEY (dispatcher_id)    REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_loads_pod_by     FOREIGN KEY (pod_confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status     (status),
    INDEX idx_driver     (driver_id),
    INDEX idx_dispatcher (dispatcher_id),
    INDEX idx_created    (created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── load_vehicles (ТС/единицы в составе заказа) ───────────────────────────────
CREATE TABLE IF NOT EXISTS load_vehicles (
    id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    load_id  INT UNSIGNED NOT NULL,
    year     SMALLINT,
    make     VARCHAR(100),
    type     VARCHAR(50),
    vin      VARCHAR(50),
    price    DECIMAL(10,2),
    CONSTRAINT fk_lv_load FOREIGN KEY (load_id) REFERENCES loads(id) ON DELETE CASCADE,
    INDEX idx_lv_load (load_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── user_vehicles (парк перевозчика/водителя) ─────────────────────────────────
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
    CONSTRAINT fk_uv_driver FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_driver_type (driver_id, type),
    INDEX idx_uv_status (status)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── gps_logs (история координат) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gps_logs (
    id         BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    driver_id  INT UNSIGNED     NOT NULL,
    load_id    INT UNSIGNED     NULL,
    lat        DECIMAL(10,7)    NOT NULL,
    lng        DECIMAL(10,7)    NOT NULL,
    speed      DECIMAL(6,2)     NOT NULL DEFAULT 0,
    heading    SMALLINT         NOT NULL DEFAULT 0,
    accuracy   DECIMAL(6,2)     NULL,
    created_at DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_gps_driver FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_gps_load   FOREIGN KEY (load_id)   REFERENCES loads(id) ON DELETE SET NULL,
    INDEX idx_driver_time (driver_id, created_at),
    INDEX idx_load_time   (load_id,   created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── messages (личные и привязанные к заказу сообщения) ────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id          BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    sender_id   INT UNSIGNED     NOT NULL,
    receiver_id INT UNSIGNED     NOT NULL,
    order_id    INT UNSIGNED     NULL,
    text        TEXT             NOT NULL,
    type        ENUM('text','image','file','system') NOT NULL DEFAULT 'text',
    is_read     TINYINT(1)       NOT NULL DEFAULT 0,
    created_at  DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_msg_sender   FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_order    FOREIGN KEY (order_id)    REFERENCES loads(id) ON DELETE SET NULL,
    INDEX idx_dialog     (sender_id, receiver_id, created_at),
    INDEX idx_order_chat (order_id, created_at),
    INDEX idx_unread     (receiver_id, is_read)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── contacts (записная книжка брокера) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    broker_id       INT UNSIGNED NOT NULL,
    contact_user_id INT UNSIGNED NOT NULL,
    blacklisted     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_broker_contact (broker_id, contact_user_id),
    CONSTRAINT fk_contact_broker FOREIGN KEY (broker_id)       REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_contact_user   FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── reviews (отзывы и рейтинги) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    author_id      INT UNSIGNED NOT NULL,
    target_user_id INT UNSIGNED NOT NULL,
    rating         TINYINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text           TEXT,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_author_target (author_id, target_user_id),
    CONSTRAINT fk_review_author FOREIGN KEY (author_id)      REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_target (target_user_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── claims (претензии) ────────────────────────────────────────────────────────
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
    CONSTRAINT fk_claim_claimant   FOREIGN KEY (claimant_id)   REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_respondent FOREIGN KEY (respondent_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_claim_resolver   FOREIGN KEY (resolved_by)   REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_claim_load       FOREIGN KEY (load_id)       REFERENCES loads(id) ON DELETE SET NULL,
    INDEX idx_claimant  (claimant_id),
    INDEX idx_claim_status (status),
    INDEX idx_claim_load (load_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── rate_quotes (расчёты ставок) ──────────────────────────────────────────────
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
    CONSTRAINT fk_rate_broker FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_rate_broker (broker_id),
    INDEX idx_route       (origin_city, dest_city),
    INDEX idx_rate_created (created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── notifications (уведомления) ───────────────────────────────────────────────
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
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_notif_created (created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── audit_logs (журнал действий) ──────────────────────────────────────────────
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
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_user   (user_id),
    INDEX idx_entity       (entity_type, entity_id),
    INDEX idx_action       (action),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── carrier_documents (документы и верификация перевозчиков) ──────────────────
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
    CONSTRAINT fk_cd_user     FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cd_verifier FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_type  (user_id, doc_type),
    INDEX idx_cd_status  (status),
    INDEX idx_expires    (expires_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── incidents (происшествия на маршруте) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
    id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    load_id         INT UNSIGNED    NULL,
    reporter_id     INT UNSIGNED    NOT NULL,
    resolved_by     INT UNSIGNED    NULL,
    type            ENUM('breakdown','accident','delay','customs','cargo_damage','other') NOT NULL DEFAULT 'other',
    status          VARCHAR(30)     NOT NULL DEFAULT 'open',  -- open / in_review / in_progress / resolved (статус задаётся кодом свободно)
    description     TEXT            NOT NULL,
    lat             DECIMAL(10,7)   NULL,
    lng             DECIMAL(10,7)   NULL,
    photo_url       VARCHAR(255)    NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     DATETIME        NULL,
    CONSTRAINT fk_inc_load     FOREIGN KEY (load_id)     REFERENCES loads(id) ON DELETE SET NULL,
    CONSTRAINT fk_inc_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_inc_resolver FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_inc_load     (load_id),
    INDEX idx_inc_reporter (reporter_id),
    INDEX idx_inc_status   (status)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── webhooks (интеграции: подписки на события) ────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
    id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    owner_id        INT UNSIGNED    NOT NULL,
    url             VARCHAR(500)    NOT NULL,
    events          JSON            NOT NULL,
    secret          VARCHAR(255)    NOT NULL,
    active          TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wh_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_wh_owner  (owner_id),
    INDEX idx_wh_active (active)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── webhook_deliveries (журнал доставки вебхуков) ─────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    webhook_id      INT UNSIGNED    NOT NULL,
    event           VARCHAR(100)    NOT NULL,
    payload         JSON            NOT NULL,
    status_code     INT             NULL,
    response        TEXT            NULL,
    delivered       TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_wd_webhook FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE,
    INDEX idx_wd_webhook (webhook_id),
    INDEX idx_wd_created (created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SELECT 'Схема MT инициализирована успешно' AS status;
