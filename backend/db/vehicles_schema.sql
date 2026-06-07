-- ═══════════════════════════════════════════════════════════════════════════
-- MT — MySQL Schema: Транспортные средства водителей
-- Для автоматического подбора машин (Auto-Assignment)
-- ═══════════════════════════════════════════════════════════════════════════

-- Таблица транспортных средств водителей
CREATE TABLE IF NOT EXISTS user_vehicles (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    driver_id     INT UNSIGNED     NOT NULL,
    
    -- Основные данные
    type          VARCHAR(50)      NOT NULL
        COMMENT 'Тип ТС: тент, рефрижератор, контейнеровоз, цистерна и т.д.',
    
    make          VARCHAR(100)     NOT NULL
        COMMENT 'Марка (например, Volvo, Mercedes, MAN)',
    
    model         VARCHAR(100)     NULL
        COMMENT 'Модель',
    
    year          SMALLINT         NOT NULL
        COMMENT 'Год выпуска',
    
    vin           VARCHAR(50)      NULL UNIQUE
        COMMENT 'VIN номер',
    
    plate         VARCHAR(20)      NULL
        COMMENT 'Гос. номер',
    
    -- Характеристики
    capacity      DECIMAL(8,2)     NULL
        COMMENT 'Грузоподъемность (тонн)',
    
    volume        DECIMAL(8,2)     NULL
        COMMENT 'Объем кузова (м³)',
    
    length        DECIMAL(6,2)     NULL
        COMMENT 'Длина (м)',
    
    -- Статус
    status        ENUM('active', 'maintenance', 'inactive')
                 NOT NULL DEFAULT 'active',
    
    -- Временные метки
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Связи
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_driver_type (driver_id, type),
    INDEX idx_status (status),
    INDEX idx_vin (vin)
    
) ENGINE=InnoDB 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci
  COMMENT='Транспортные средства водителей для автоматического подбора';

-- ─── Примеры данных для тестирования ────────────────────────────────────────
-- INSERT INTO user_vehicles (driver_id, type, make, model, year, vin, plate, capacity, volume, status) VALUES
-- (1, 'тент', 'Volvo', 'FH16', 2020, 'YV2R6A219L1234567', '1234 AB-7', 20.0, 82.0, 'active'),
-- (2, 'рефрижератор', 'Mercedes', 'Actros', 2019, 'WDB9604241L123456', '5678 CD-7', 15.0, 68.0, 'active'),
-- (3, 'контейнеровоз', 'MAN', 'TGX', 2021, 'WMAA6SZZ5KM123456', '9012 EF-7', 25.0, NULL, 'active');