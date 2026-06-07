-- ============================================================
-- MT — SQL схема для модулей Заказы и Контакты

-- ============================================================

-- Заказы (Loads)
CREATE TABLE IF NOT EXISTS loads (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  status                ENUM('Новый','Назначен','Забран','Доставлен','В ожидании','Оплачен','Запрошен','Клейм','Архив','Удалён')
                        NOT NULL DEFAULT 'Новый',
  cod_amount            DECIMAL(10,2) NOT NULL DEFAULT 0,
  driver_pay            DECIMAL(10,2) NOT NULL DEFAULT 0,
  driver_pay_status     ENUM('Не оплачено','В ожидании','Оплачено') DEFAULT 'Не оплачено',

  origin_addr           VARCHAR(255),
  origin_city           VARCHAR(255),
  origin_date           DATE,
  origin_contact        VARCHAR(255),
  origin_phone          VARCHAR(50),

  destination_addr      VARCHAR(255),
  destination_city      VARCHAR(255),
  destination_date      DATE,
  destination_contact   VARCHAR(255),
  destination_phone     VARCHAR(50),

  shipper_name          VARCHAR(255),
  shipper_phone         VARCHAR(50),

  driver_id             INT NULL,
  dispatcher_id         INT NULL,

  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (driver_id)     REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (dispatcher_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status     (status),
  INDEX idx_driver     (driver_id),
  INDEX idx_dispatcher (dispatcher_id),
  INDEX idx_created    (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Транспортные средства в заказе
CREATE TABLE IF NOT EXISTS load_vehicles (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  load_id  INT NOT NULL,
  year     SMALLINT,
  make     VARCHAR(100),
  type     VARCHAR(50),
  vin      VARCHAR(50),
  price    DECIMAL(10,2),
  FOREIGN KEY (load_id) REFERENCES loads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Контакты брокера
CREATE TABLE IF NOT EXISTS contacts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  broker_id       INT NOT NULL,
  contact_user_id INT NOT NULL,
  blacklisted     TINYINT(1) DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_broker_contact (broker_id, contact_user_id),
  FOREIGN KEY (broker_id)       REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Отзывы (рейтинги)
CREATE TABLE IF NOT EXISTS reviews (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  author_id      INT NOT NULL,
  target_user_id INT NOT NULL,
  rating         TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text           TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_author_target (author_id, target_user_id),
  FOREIGN KEY (author_id)      REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_target (target_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Расширяем таблицу users полями для каталога
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verified       TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS specialization VARCHAR(100),
  ADD COLUMN IF NOT EXISTS location       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS availability   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dispatch_fee   DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS avatar_color   VARCHAR(20) DEFAULT '#2563eb';
