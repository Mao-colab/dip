-- ═══════════════════════════════════════════════════════════════
-- YShipper — Демонстрационные данные (seed.sql)
-- Запускать ПОСЛЕ init.sql
-- ═══════════════════════════════════════════════════════════════

USE mt_broker;

-- ─── Пользователи (пароль для всех: demo1234) ─────────────────────────────────
-- bcrypt hash для "demo1234" (cost=10)
SET @pwd = '$2a$10$dnuoXQ8GMOeHIcEhytDMc.Fj4LAAdb4LEOFjnMvOpxgMvsLdxSGC2';

INSERT INTO Users (name, email, phone, password_hash, role, verified, avatar_color, location, availability, specialization) VALUES
-- Администратор
('Администратор',     'admin@mt.by',      '+375171000001', @pwd, 'admin',      1, '#059669', 'Минск', 'available', 'Управление системой'),
-- Диспетчеры
('Анна Ковалева',     'dispatcher@mt.by', '+375291234567', @pwd, 'dispatcher', 1, '#2563eb', 'Минск', 'available', 'Грузовые перевозки'),
('Дмитрий Лукашев',  'dispatcher2@mt.by','+375291234568', @pwd, 'dispatcher', 0, '#2563eb', 'Гродно', 'available', 'Международные перевозки'),
-- Брокеры
('Сергей Михайлов',  'broker@mt.by',      '+375331234567', @pwd, 'broker',     1, '#7c3aed', 'Минск', 'available', 'Автомобильные грузы'),
('Ольга Петрова',    'broker2@mt.by',     '+375331234568', @pwd, 'broker',     0, '#7c3aed', 'Брест', 'available', 'Сборные грузы'),
-- Перевозчики
('ООО «АвтоЛогист»', 'carrier@mt.by',     '+375441234567', @pwd, 'carrier',    1, '#0891b2', 'Минск', 'available', 'Рефрижераторы, тентованные'),
('ИП Захаров В.Т.',  'carrier2@mt.by',    '+375441234568', @pwd, 'carrier',    1, '#0891b2', 'Витебск', 'available', 'Бортовые, тентованные'),
-- Водители
('Иван Петров',      'driver@mt.by',      '+375291112233', @pwd, 'driver',     1, '#ea580c', 'Минск',   'available', 'Водитель кат. CE'),
('Алексей Сидоров',  'driver2@mt.by',     '+375291112234', @pwd, 'driver',     1, '#ea580c', 'Гомель',  'available', 'Водитель кат. CE'),
('Николай Зайцев',   'driver3@mt.by',     '+375291112235', @pwd, 'driver',     0, '#ea580c', 'Брест',   'on_route',  'Водитель кат. C'),
('Роман Козлов',     'driver4@mt.by',     '+375291112236', @pwd, 'driver',     1, '#ea580c', 'Гродно',  'available', 'Водитель кат. CE');

-- ─── Координаты водителей (для трекинга и авто-назначения) ───────────────────
UPDATE Users SET last_lat=53.9045, last_lng=27.5615, status='idle'    WHERE email='driver@mt.by';
UPDATE Users SET last_lat=52.4345, last_lng=30.9754, status='idle'    WHERE email='driver2@mt.by';
UPDATE Users SET last_lat=52.0975, last_lng=23.7341, status='active'  WHERE email='driver3@mt.by';
UPDATE Users SET last_lat=53.6884, last_lng=23.8258, status='idle'    WHERE email='driver4@mt.by';

-- ─── Заказы ───────────────────────────────────────────────────────────────────
INSERT INTO loads
  (status, origin_city, origin_addr, origin_date, origin_contact, origin_phone,
   destination_city, destination_addr, destination_date, destination_contact, destination_phone,
   shipper_name, shipper_phone, cod_amount, driver_pay, dispatcher_id, driver_id, created_at)
SELECT
  'Оплачен', 'Минск', 'ул. Притыцкого, 12', '2026-05-01', 'Сергей Борисов', '+375291000001',
  'Варшава', 'ul. Marszałkowska, 45', '2026-05-04', 'Jan Kowalski', '+48601234567',
  'ООО «ТехГруз»', '+375171000002', 3200.00, 2500.00,
  (SELECT id FROM Users WHERE email='dispatcher@mt.by'),
  (SELECT id FROM Users WHERE email='driver@mt.by'),
  DATE_SUB(NOW(), INTERVAL 18 DAY)
WHERE EXISTS (SELECT 1 FROM Users WHERE email='dispatcher@mt.by');

INSERT INTO loads
  (status, origin_city, origin_addr, origin_date, origin_contact, origin_phone,
   destination_city, destination_addr, destination_date, destination_contact, destination_phone,
   shipper_name, shipper_phone, cod_amount, driver_pay, dispatcher_id, driver_id, created_at)
SELECT
  'Доставлен', 'Брест', 'ул. Советская, 30', '2026-05-05', 'Елена Иванова', '+375162000001',
  'Вильнюс', 'Gedimino pr. 5', '2026-05-07', 'Tomas Kaz', '+37060000001',
  'ООО «БелЭкспорт»', '+375171000003', 1850.00, 1400.00,
  (SELECT id FROM Users WHERE email='dispatcher2@mt.by'),
  (SELECT id FROM Users WHERE email='driver2@mt.by'),
  DATE_SUB(NOW(), INTERVAL 12 DAY)
WHERE EXISTS (SELECT 1 FROM Users WHERE email='dispatcher2@mt.by');

INSERT INTO loads
  (status, origin_city, origin_addr, origin_date, origin_contact, origin_phone,
   destination_city, destination_addr, destination_date, destination_contact, destination_phone,
   shipper_name, shipper_phone, cod_amount, driver_pay, dispatcher_id, driver_id, created_at)
SELECT
  'Забран', 'Гомель', 'пр. Ленина, 50', '2026-05-10', 'Пётр Кузнецов', '+375232000001',
  'Рига', 'Brivibas iela, 10', '2026-05-14', 'Janis Berzins', '+37120000001',
  'ЗАО «МинскТранс»', '+375171000004', 2100.00, 1600.00,
  (SELECT id FROM Users WHERE email='dispatcher@mt.by'),
  (SELECT id FROM Users WHERE email='driver3@mt.by'),
  DATE_SUB(NOW(), INTERVAL 9 DAY)
WHERE EXISTS (SELECT 1 FROM Users WHERE email='dispatcher@mt.by');

INSERT INTO loads
  (status, origin_city, origin_addr, origin_date, origin_contact, origin_phone,
   destination_city, destination_addr, destination_date, destination_contact, destination_phone,
   shipper_name, shipper_phone, cod_amount, driver_pay, dispatcher_id, driver_id, created_at)
SELECT
  'Назначен', 'Витебск', 'ул. Замковая, 1', '2026-05-16', 'Ирина Морозова', '+375212000001',
  'Берлин', 'Unter den Linden 5', '2026-05-20', 'Klaus Müller', '+4930000001',
  'ИП Соколов', '+375291000005', 4500.00, 3500.00,
  (SELECT id FROM Users WHERE email='dispatcher2@mt.by'),
  (SELECT id FROM Users WHERE email='driver4@mt.by'),
  DATE_SUB(NOW(), INTERVAL 3 DAY)
WHERE EXISTS (SELECT 1 FROM Users WHERE email='dispatcher2@mt.by');

INSERT INTO loads
  (status, origin_city, origin_addr, origin_date, origin_contact, origin_phone,
   destination_city, destination_addr, destination_date, destination_contact, destination_phone,
   shipper_name, shipper_phone, cod_amount, driver_pay, dispatcher_id, created_at)
SELECT
  'Новый', 'Минск', 'пр. Победителей, 84', '2026-05-21', 'Андрей Смирнов', '+375291000006',
  'Гданьск', 'ul. Długa, 12', '2026-05-25', 'Marek Nowak', '+48501234567',
  'ООО «СтройМатериал»', '+375171000006', 2750.00, 2100.00,
  (SELECT id FROM Users WHERE email='dispatcher@mt.by'),
  DATE_SUB(NOW(), INTERVAL 1 DAY)
WHERE EXISTS (SELECT 1 FROM Users WHERE email='dispatcher@mt.by');

INSERT INTO loads
  (status, origin_city, origin_addr, origin_date, origin_contact, origin_phone,
   destination_city, destination_addr, destination_date, destination_contact, destination_phone,
   shipper_name, shipper_phone, cod_amount, driver_pay, dispatcher_id, created_at)
SELECT
  'Новый', 'Гродно', 'ул. Ожешко, 22', '2026-05-22', 'Виктор Лещенко', '+375152000001',
  'Краков', 'ul. Floriańska, 30', '2026-05-26', 'Anna Wiśniewska', '+48601234568',
  'ООО «АгроПром»', '+375171000007', 1920.00, 1450.00,
  (SELECT id FROM Users WHERE email='dispatcher2@mt.by'),
  NOW()
WHERE EXISTS (SELECT 1 FROM Users WHERE email='dispatcher2@mt.by');

INSERT INTO loads
  (status, origin_city, origin_addr, origin_date, origin_contact, origin_phone,
   destination_city, destination_addr, destination_date, destination_contact, destination_phone,
   shipper_name, shipper_phone, cod_amount, driver_pay, dispatcher_id, created_at)
SELECT
  'В ожидании', 'Могилёв', 'ул. Первомайская, 40', '2026-05-18', 'Лариса Федорова', '+375222000001',
  'Таллин', 'Viru väljak, 5', '2026-05-23', 'Kalev Kask', '+3726000001',
  'ОАО «МогилёвТехно»', '+375171000008', 3100.00, 2350.00,
  (SELECT id FROM Users WHERE email='dispatcher@mt.by'),
  DATE_SUB(NOW(), INTERVAL 6 DAY)
WHERE EXISTS (SELECT 1 FROM Users WHERE email='dispatcher@mt.by');

-- ─── Транспортные средства заказов ───────────────────────────────────────────
INSERT INTO load_vehicles (load_id, year, make, type, vin, price) VALUES
(1, 2019, 'Volvo FH',   'Тентованный 82м³',  'YV2RT40A4KB123456', 45000.00),
(2, 2021, 'Mercedes Actros', 'Рефрижератор', 'WDB9634031L987654', 62000.00),
(3, 2018, 'MAN TGX',    'Бортовой',          'WMAN623061Y456789', 38000.00),
(4, 2022, 'DAF XF',     'Тентованный 82м³',  'XLRTE47XS0E234567', 55000.00),
(5, 2020, 'Scania R500','Тентованный 82м³',  'YS2R4X20001234567', 70000.00);

-- ─── Личные транспортные средства водителей ───────────────────────────────────
INSERT INTO user_vehicles (driver_id, type, make, model, year, vin, plate, capacity, volume, status)
SELECT
  u.id, 'Тентованный 82м³', 'Volvo', 'FH16', 2019,
  'YV2RT40A4KB777001', '7765 МИ-7', 24.0, 82.0, 'active'
FROM Users u WHERE u.email = 'driver@mt.by';

INSERT INTO user_vehicles (driver_id, type, make, model, year, vin, plate, capacity, volume, status)
SELECT
  u.id, 'Рефрижератор', 'Mercedes-Benz', 'Actros 1845', 2021,
  'WDB9634031L777002', '8823 МЕ-2', 22.0, 76.0, 'active'
FROM Users u WHERE u.email = 'driver2@mt.by';

INSERT INTO user_vehicles (driver_id, type, make, model, year, vin, plate, capacity, volume, status)
SELECT
  u.id, 'Бортовой', 'MAN', 'TGX 18.480', 2018,
  'WMAN623061Y777003', '4521 МК-6', 20.0, 68.0, 'active'
FROM Users u WHERE u.email = 'driver3@mt.by';

INSERT INTO user_vehicles (driver_id, type, make, model, year, vin, plate, capacity, volume, status)
SELECT
  u.id, 'Тентованный 82м³', 'DAF', 'XF 106.480', 2022,
  'XLRTE47XS0E777004', '1234 МГ-1', 24.0, 82.0, 'active'
FROM Users u WHERE u.email = 'driver4@mt.by';

-- ─── Отзывы ───────────────────────────────────────────────────────────────────
INSERT INTO reviews (author_id, target_user_id, rating, text)
SELECT
  b.id, d.id, 5, 'Отличная работа, доставил груз точно в срок. Рекомендую!'
FROM Users b, Users d
WHERE b.email='broker@mt.by' AND d.email='driver@mt.by';

INSERT INTO reviews (author_id, target_user_id, rating, text)
SELECT
  b.id, d.id, 4, 'Надёжный водитель, небольшая задержка на таможне, но груз цел.'
FROM Users b, Users d
WHERE b.email='broker@mt.by' AND d.email='driver2@mt.by';

INSERT INTO reviews (author_id, target_user_id, rating, text)
SELECT
  b.id, d.id, 5, 'Профессионал! Работаем постоянно.'
FROM Users b, Users d
WHERE b.email='broker2@mt.by' AND d.email='driver4@mt.by';

-- ─── Контакты (адресная книга брокеров) ──────────────────────────────────────
INSERT INTO contacts (broker_id, contact_user_id, blacklisted)
SELECT b.id, d.id, 0
FROM Users b, Users d
WHERE b.email='broker@mt.by' AND d.email='carrier@mt.by';

INSERT INTO contacts (broker_id, contact_user_id, blacklisted)
SELECT b.id, d.id, 0
FROM Users b, Users d
WHERE b.email='broker@mt.by' AND d.email='carrier2@mt.by';

-- ─── Сообщения ────────────────────────────────────────────────────────────────
INSERT INTO Messages (sender_id, receiver_id, order_id, text, type)
SELECT
  d.id, dp.id, 1,
  'Груз принят, выезжаю на маршрут. Ожидаемое время прибытия 3 дня.', 'text'
FROM Users d, Users dp
WHERE d.email='driver@mt.by' AND dp.email='dispatcher@mt.by';

INSERT INTO Messages (sender_id, receiver_id, order_id, text, type)
SELECT
  dp.id, d.id, 1,
  'Отлично! Держи связь на таможне.', 'text'
FROM Users d, Users dp
WHERE d.email='driver@mt.by' AND dp.email='dispatcher@mt.by';

INSERT INTO Messages (sender_id, receiver_id, order_id, text, type)
SELECT
  d.id, b.id, 4,
  'Здравствуйте! Готов взять ваш груз. Когда нужна подача?', 'text'
FROM Users d, Users b
WHERE d.email='driver4@mt.by' AND b.email='broker@mt.by';

-- ─── GPS логи (имитация трекинга) ────────────────────────────────────────────
INSERT INTO GPS_Logs (driver_id, load_id, lat, lng, speed, heading)
SELECT u.id, 3, 52.4345, 30.9754, 87.5, 315
FROM Users u WHERE u.email = 'driver3@mt.by';

INSERT INTO GPS_Logs (driver_id, load_id, lat, lng, speed, heading)
SELECT u.id, 3, 52.7000, 28.5000, 90.0, 310
FROM Users u WHERE u.email = 'driver3@mt.by';

-- Итоговый отчёт
SELECT CONCAT('✅ Пользователей: ', COUNT(*)) AS result FROM Users
UNION ALL
SELECT CONCAT('✅ Заказов: ', COUNT(*)) FROM loads
UNION ALL
SELECT CONCAT('✅ ТС водителей: ', COUNT(*)) FROM user_vehicles
UNION ALL
SELECT CONCAT('✅ Отзывов: ', COUNT(*)) FROM reviews
UNION ALL
SELECT CONCAT('✅ Сообщений: ', COUNT(*)) FROM Messages;
