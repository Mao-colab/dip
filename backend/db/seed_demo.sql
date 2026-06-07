-- ═══════════════════════════════════════════════════════════════════════════
-- MT Broker — Полный демонстрационный датасет для презентации
-- 37 заказов · 11 пользователей · документы · претензии · сообщения · аудит
-- ═══════════════════════════════════════════════════════════════════════════

USE mt_broker;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE webhooks;
TRUNCATE TABLE incidents;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE notifications;
TRUNCATE TABLE rate_quotes;
TRUNCATE TABLE carrier_documents;
TRUNCATE TABLE claims;
TRUNCATE TABLE GPS_Logs;
TRUNCATE TABLE Messages;
TRUNCATE TABLE contacts;
TRUNCATE TABLE reviews;
TRUNCATE TABLE load_vehicles;
TRUNCATE TABLE loads;
TRUNCATE TABLE user_vehicles;
UPDATE Users SET load_id = NULL;
TRUNCATE TABLE Users;

SET FOREIGN_KEY_CHECKS = 1;

-- ════════════════════════════════════════════════════════════
-- ПОЛЬЗОВАТЕЛИ  (пароль для всех: demo1234)
-- ════════════════════════════════════════════════════════════
SET @pwd = '$2a$10$dnuoXQ8GMOeHIcEhytDMc.Fj4LAAdb4LEOFjnMvOpxgMvsLdxSGC2';

INSERT INTO Users
  (name, email, phone, password_hash, role, verified, balance, avatar_color, location, availability, specialization)
VALUES
-- id=1  Администратор
('Администратор',       'admin@mt.by',       '+375171000001', @pwd, 'admin',      1,     0.00, '#059669', 'Минск',   'available', 'Управление системой'),
-- id=2  Диспетчер 1
('Анна Ковалева',       'dispatcher@mt.by',  '+375291234567', @pwd, 'dispatcher', 1,     0.00, '#2563eb', 'Минск',   'available', 'Международные грузовые перевозки'),
-- id=3  Диспетчер 2
('Дмитрий Лукашев',    'dispatcher2@mt.by', '+375291234568', @pwd, 'dispatcher', 1,     0.00, '#1d4ed8', 'Гродно',  'available', 'Сборные и тентованные грузы'),
-- id=4  Брокер 1
('Сергей Михайлов',    'broker@mt.by',       '+375331234567', @pwd, 'broker',     1,  4820.00, '#7c3aed', 'Минск',   'available', 'Автомобильные грузы EU'),
-- id=5  Брокер 2
('Ольга Петрова',      'broker2@mt.by',      '+375331234568', @pwd, 'broker',     1,  2350.00, '#9333ea', 'Брест',   'available', 'Рефрижераторные и сборные грузы'),
-- id=6  Перевозчик 1
('ООО «АвтоЛогист»',  'carrier@mt.by',      '+375441234567', @pwd, 'carrier',    1,  9600.00, '#0891b2', 'Минск',   'available', 'Тентованные, рефрижераторы'),
-- id=7  Перевозчик 2
('ИП Захаров В.Т.',    'carrier2@mt.by',     '+375441234568', @pwd, 'carrier',    1,  5200.00, '#0284c7', 'Витебск', 'available', 'Бортовые, тентованные'),
-- id=8  Водитель 1
('Иван Петров',        'driver@mt.by',       '+375291112233', @pwd, 'driver',     1,  3400.00, '#ea580c', 'Минск',   'available', 'Водитель кат. CE, стаж 8 лет'),
-- id=9  Водитель 2
('Алексей Сидоров',   'driver2@mt.by',      '+375291112234', @pwd, 'driver',     1,  2800.00, '#dc2626', 'Гомель',  'available', 'Водитель кат. CE, ADR'),
-- id=10 Водитель 3
('Николай Зайцев',    'driver3@mt.by',      '+375291112235', @pwd, 'driver',     1,  1950.00, '#b45309', 'Брест',   'available', 'Водитель кат. CE'),
-- id=11 Водитель 4
('Роман Козлов',      'driver4@mt.by',      '+375291112236', @pwd, 'driver',     1,  2100.00, '#15803d', 'Гродно',  'available', 'Водитель кат. CE, стаж 5 лет');

-- Координаты и статусы водителей
UPDATE Users SET last_lat=52.2297, last_lng=21.0122, last_ping_at=NOW(), status='active',       load_id=NULL WHERE id=8;
UPDATE Users SET last_lat=56.9460, last_lng=24.1059, last_ping_at=NOW(), status='active',       load_id=NULL WHERE id=9;
UPDATE Users SET last_lat=52.0000, last_lng=22.8000, last_ping_at=NOW(), status='active',       load_id=NULL WHERE id=10;
UPDATE Users SET last_lat=54.6872, last_lng=25.2797, last_ping_at=NOW(), status='active',       load_id=NULL WHERE id=11;

-- ════════════════════════════════════════════════════════════
-- ЗАКАЗЫ (37 шт.)
-- ════════════════════════════════════════════════════════════

-- ── ОПЛАЧЕН (8 исторических завершённых заказов) ─────────────────────────────

INSERT INTO loads (status,origin_city,origin_addr,origin_date,origin_contact,origin_phone,origin_lat,origin_lng,
  destination_city,destination_addr,destination_date,destination_contact,destination_phone,dest_lat,dest_lng,
  shipper_name,shipper_phone,cod_amount,driver_pay,driver_pay_status,vehicle_type,weight_kg,volume_m3,
  dispatcher_id,driver_id,planned_pickup_at,planned_delivery_at,
  pod_confirmed_at,pod_confirmed_by,pod_notes,created_at)
VALUES
-- 1
('Оплачен','Минск','ул. Притыцкого, 12','2026-04-03','Сергей Борисов','+375291000001',53.9045,27.5615,
 'Варшава','ul. Marszałkowska, 45','2026-04-06','Jan Kowalski','+48601234567',52.2297,21.0122,
 'ООО «ТехГруз»','+375171000002',3200.00,2500.00,'Оплачено','Тентованный 82м³',18000,74,
 2,8,DATE_SUB(NOW(),INTERVAL 62 DAY),DATE_SUB(NOW(),INTERVAL 59 DAY),
 DATE_SUB(NOW(),INTERVAL 59 DAY),8,'Груз доставлен в целости, подпись получена',DATE_SUB(NOW(),INTERVAL 63 DAY)),
-- 2
('Оплачен','Брест','ул. Советская, 30','2026-04-08','Елена Иванова','+375162000001',52.0975,23.7341,
 'Вильнюс','Gedimino pr. 5','2026-04-10','Tomas Kazlauskas','+37060000001',54.6872,25.2797,
 'ООО «БелЭкспорт»','+375171000003',1850.00,1400.00,'Оплачено','Рефрижератор',12000,60,
 3,9,DATE_SUB(NOW(),INTERVAL 57 DAY),DATE_SUB(NOW(),INTERVAL 55 DAY),
 DATE_SUB(NOW(),INTERVAL 55 DAY),9,'Температурный режим выдержан',DATE_SUB(NOW(),INTERVAL 58 DAY)),
-- 3
('Оплачен','Гомель','пр. Ленина, 50','2026-04-14','Пётр Кузнецов','+375232000001',52.4345,30.9754,
 'Рига','Brīvības iela, 10','2026-04-18','Jānis Bērziņš','+37120000001',56.9460,24.1059,
 'ЗАО «МинскТранс»','+375171000004',2100.00,1600.00,'Оплачено','Бортовой',15000,68,
 2,10,DATE_SUB(NOW(),INTERVAL 51 DAY),DATE_SUB(NOW(),INTERVAL 47 DAY),
 DATE_SUB(NOW(),INTERVAL 47 DAY),2,'Доставка без замечаний',DATE_SUB(NOW(),INTERVAL 52 DAY)),
-- 4
('Оплачен','Витебск','ул. Замковая, 1','2026-04-20','Ирина Морозова','+375212000001',55.1904,30.2049,
 'Берлин','Unter den Linden, 5','2026-04-25','Klaus Müller','+4930000001',52.5200,13.4050,
 'ИП Соколов А.В.','+375291000005',4500.00,3500.00,'Оплачено','Тентованный 82м³',22000,82,
 3,11,DATE_SUB(NOW(),INTERVAL 45 DAY),DATE_SUB(NOW(),INTERVAL 40 DAY),
 DATE_SUB(NOW(),INTERVAL 40 DAY),11,'CMR подписана, груз сдан на складе',DATE_SUB(NOW(),INTERVAL 46 DAY)),
-- 5
('Оплачен','Минск','пр. Независимости, 77','2026-04-26','Андрей Смирнов','+375291000006',53.9045,27.5615,
 'Гданьск','ul. Długa, 12','2026-04-30','Marek Nowak','+48501234567',54.3520,18.6466,
 'ООО «СтройМатериал»','+375171000006',2750.00,2100.00,'Оплачено','Тентованный 82м³',20000,80,
 2,8,DATE_SUB(NOW(),INTERVAL 39 DAY),DATE_SUB(NOW(),INTERVAL 35 DAY),
 DATE_SUB(NOW(),INTERVAL 35 DAY),8,'Доставлено точно в срок',DATE_SUB(NOW(),INTERVAL 40 DAY)),
-- 6
('Оплачен','Гродно','ул. Ожешко, 22','2026-05-02','Виктор Лещенко','+375152000001',53.6884,23.8258,
 'Краков','ul. Floriańska, 30','2026-05-06','Anna Wiśniewska','+48601234568',50.0647,19.9450,
 'ООО «АгроПром»','+375171000007',1920.00,1450.00,'Оплачено','Рефрижератор',10000,55,
 3,9,DATE_SUB(NOW(),INTERVAL 33 DAY),DATE_SUB(NOW(),INTERVAL 29 DAY),
 DATE_SUB(NOW(),INTERVAL 29 DAY),9,'Продукты доставлены, тем.режим ок',DATE_SUB(NOW(),INTERVAL 34 DAY)),
-- 7
('Оплачен','Могилёв','ул. Первомайская, 40','2026-05-07','Лариса Фёдорова','+375222000001',53.9168,30.3449,
 'Таллин','Viru väljak, 5','2026-05-12','Kalev Kask','+3726000001',59.4370,24.7536,
 'ОАО «МогилёвТехно»','+375171000008',3100.00,2350.00,'Оплачено','Тентованный 82м³',19000,76,
 2,10,DATE_SUB(NOW(),INTERVAL 28 DAY),DATE_SUB(NOW(),INTERVAL 23 DAY),
 DATE_SUB(NOW(),INTERVAL 23 DAY),3,'Получатель подписал ТТН без замечаний',DATE_SUB(NOW(),INTERVAL 29 DAY)),
-- 8
('Оплачен','Брест','Московская ул., 290','2026-05-10','Максим Волков','+375162000002',52.0975,23.7341,
 'Берлин','Alexanderplatz, 1','2026-05-15','Hans Schmidt','+4917600001',52.5200,13.4050,
 'ООО «ЕвроТрейд»','+375172000001',5200.00,4000.00,'Оплачено','Тентованный 82м³',24000,82,
 3,11,DATE_SUB(NOW(),INTERVAL 25 DAY),DATE_SUB(NOW(),INTERVAL 20 DAY),
 DATE_SUB(NOW(),INTERVAL 20 DAY),11,'Все документы в порядке',DATE_SUB(NOW(),INTERVAL 26 DAY));

-- ── АРХИВ (3 заказа) ──────────────────────────────────────────────────────────
INSERT INTO loads (status,origin_city,origin_addr,origin_date,origin_contact,origin_phone,
  destination_city,destination_addr,destination_date,destination_contact,destination_phone,
  shipper_name,shipper_phone,cod_amount,driver_pay,vehicle_type,weight_kg,volume_m3,
  dispatcher_id,driver_id,created_at)
VALUES
-- 9
('Архив','Минск','ул. Кальварийская, 17','2026-04-18','Павел Орлов','+375291000010',
 'Прага','Václavské náměstí, 1','2026-04-24','Pavel Novák','+420601000001',
 'ООО «ПромЭкспорт»','+375173000001',6100.00,0,'Тентованный 82м³',23000,82,
 2,8,DATE_SUB(NOW(),INTERVAL 47 DAY)),
-- 10
('Архив','Витебск','пр. Победы, 5','2026-04-22','Татьяна Громова','+375212000002',
 'Варшава','Nowy Świat, 22','2026-04-26','Wojciech Kowalski','+48602000001',
 'ЗАО «ВитебскСтрой»','+375212000003',2400.00,0,'Бортовой',16000,65,
 3,NULL,DATE_SUB(NOW(),INTERVAL 43 DAY)),
-- 11
('Архив','Гродно','ул. Советская, 5','2026-05-01','Николай Карпов','+375152000002',
 'Минск','пр. Партизанский, 82','2026-05-03','Игорь Иванов','+375291000020',
 'ООО «Гродно-Агро»','+375152000003',850.00,600.00,'Бортовой',8000,40,
 2,9,DATE_SUB(NOW(),INTERVAL 34 DAY));

-- ── ДОСТАВЛЕН (6 заказов, ожидают оплаты) ────────────────────────────────────
INSERT INTO loads (status,origin_city,origin_addr,origin_date,origin_contact,origin_phone,origin_lat,origin_lng,
  destination_city,destination_addr,destination_date,destination_contact,destination_phone,dest_lat,dest_lng,
  shipper_name,shipper_phone,cod_amount,driver_pay,driver_pay_status,vehicle_type,weight_kg,volume_m3,
  dispatcher_id,driver_id,planned_pickup_at,planned_delivery_at,
  pod_confirmed_at,pod_confirmed_by,pod_notes,created_at)
VALUES
-- 12
('Доставлен','Минск','ул. Академическая, 22','2026-05-16','Владимир Лис','+375291000030',53.9045,27.5615,
 'Таллин','Viru väljak, 10','2026-05-20','Toomas Kallas','+3726100001',59.4370,24.7536,
 'ООО «БелТех»','+375171000010',2900.00,2200.00,'В ожидании','Тентованный 82м³',18500,78,
 2,8,DATE_SUB(NOW(),INTERVAL 19 DAY),DATE_SUB(NOW(),INTERVAL 15 DAY),
 DATE_SUB(NOW(),INTERVAL 15 DAY),8,'Получатель принял, подпись поставлена',DATE_SUB(NOW(),INTERVAL 20 DAY)),
-- 13
('Доставлен','Брест','ул. Пушкина, 18','2026-05-18','Светлана Новик','+375162000010',52.0975,23.7341,
 'Варшава','ul. Krakowskie Przedmieście','2026-05-21','Piotr Kacz','+48603000001',52.2297,21.0122,
 'ООО «БрестИмпорт»','+375162000011',1750.00,1300.00,'Не оплачено','Рефрижератор',11000,58,
 3,9,DATE_SUB(NOW(),INTERVAL 17 DAY),DATE_SUB(NOW(),INTERVAL 14 DAY),
 DATE_SUB(NOW(),INTERVAL 14 DAY),9,'Температура -4°C, продукция в норме',DATE_SUB(NOW(),INTERVAL 18 DAY)),
-- 14
('Доставлен','Гомель','ул. Рогачёвская, 9','2026-05-19','Константин Руссу','+375232000010',52.4345,30.9754,
 'Рига','Elizabetes iela, 75','2026-05-23','Edgars Ozols','+37122000001',56.9460,24.1059,
 'ОАО «ГомельХим»','+375232000011',3400.00,2600.00,'Не оплачено','Тентованный 82м³',21000,80,
 2,10,DATE_SUB(NOW(),INTERVAL 16 DAY),DATE_SUB(NOW(),INTERVAL 12 DAY),
 DATE_SUB(NOW(),INTERVAL 12 DAY),10,'Груз целый, ТТН подписана',DATE_SUB(NOW(),INTERVAL 17 DAY)),
-- 15
('Доставлен','Минск','ул. Кирова, 8','2026-05-21','Юрий Климов','+375291000040',53.9045,27.5615,
 'Вильнюс','Gedimino pr. 20','2026-05-23','Marius Petraitis','+37061000001',54.6872,25.2797,
 'ООО «МинскМебель»','+375171000015',1100.00,820.00,'Не оплачено','Бортовой',9000,50,
 3,11,DATE_SUB(NOW(),INTERVAL 14 DAY),DATE_SUB(NOW(),INTERVAL 12 DAY),
 DATE_SUB(NOW(),INTERVAL 12 DAY),2,'Доставлено без нареканий',DATE_SUB(NOW(),INTERVAL 15 DAY)),
-- 16
('Доставлен','Витебск','ул. Чкалова, 30','2026-05-23','Олег Васильев','+375212000010',55.1904,30.2049,
 'Берлин','Karl-Marx-Allee, 30','2026-05-28','Werner Braun','+4930100001',52.5200,13.4050,
 'ООО «ВитебскКерамик»','+375212000011',4800.00,3700.00,'В ожидании','Тентованный 82м³',23000,82,
 2,8,DATE_SUB(NOW(),INTERVAL 12 DAY),DATE_SUB(NOW(),INTERVAL 7 DAY),
 DATE_SUB(NOW(),INTERVAL 7 DAY),8,'CMR подписана, претензий нет',DATE_SUB(NOW(),INTERVAL 13 DAY)),
-- 17
('Доставлен','Минск','ул. Платонова, 22','2026-05-26','Галина Федина','+375291000050',53.9045,27.5615,
 'Краков','ul. Wawel, 5','2026-05-30','Krzysztof Dąb','+48604000001',50.0647,19.9450,
 'ООО «ПолиПак»','+375171000020',2200.00,1700.00,'Не оплачено','Рефрижератор',13000,62,
 3,9,DATE_SUB(NOW(),INTERVAL 9 DAY),DATE_SUB(NOW(),INTERVAL 5 DAY),
 DATE_SUB(NOW(),INTERVAL 5 DAY),9,'Продукция свежая, клиент доволен',DATE_SUB(NOW(),INTERVAL 10 DAY));

-- ── ЗАБРАН (4 заказа — в пути прямо сейчас) ──────────────────────────────────
INSERT INTO loads (status,origin_city,origin_addr,origin_date,origin_contact,origin_phone,origin_lat,origin_lng,
  destination_city,destination_addr,destination_date,destination_contact,destination_phone,dest_lat,dest_lng,
  shipper_name,shipper_phone,cod_amount,driver_pay,driver_pay_status,vehicle_type,weight_kg,volume_m3,
  dispatcher_id,driver_id,planned_pickup_at,planned_delivery_at,delay_minutes,created_at)
VALUES
-- 18 (Николай едет в Варшаву)
('Забран','Минск','пр. Победителей, 84','2026-05-30','Андрей Смирнов','+375291000060',53.9045,27.5615,
 'Варшава','ul. Złota, 59','2026-06-04','Zbigniew Wróbel','+48605000001',52.2297,21.0122,
 'ООО «СтройГрупп»','+375172000010',3100.00,2400.00,'Не оплачено','Тентованный 82м³',20000,82,
 2,10,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_ADD(NOW(),INTERVAL 1 DAY),0,DATE_SUB(NOW(),INTERVAL 6 DAY)),
-- 19 (Иван едет в Берлин)
('Забран','Брест','ул. Московская, 290','2026-05-31','Максим Волков','+375162000020',52.0975,23.7341,
 'Берлин','Potsdamer Platz, 1','2026-06-06','Günter Fischer','+4930200001',52.5200,13.4050,
 'ООО «ЕвроПласт»','+375173000010',5500.00,4200.00,'Не оплачено','Тентованный 82м³',24000,82,
 3,8,DATE_SUB(NOW(),INTERVAL 4 DAY),DATE_ADD(NOW(),INTERVAL 2 DAY),0,DATE_SUB(NOW(),INTERVAL 5 DAY)),
-- 20 (Роман едет в Вильнюс)
('Забран','Гомель','ул. Советская, 48','2026-06-01','Пётр Климов','+375232000020',52.4345,30.9754,
 'Вильнюс','Pilies g. 10','2026-06-04','Jonas Žemaitis','+37062000001',54.6872,25.2797,
 'ООО «ГомельТекс»','+375232000021',1650.00,1250.00,'Не оплачено','Бортовой',11000,55,
 2,11,DATE_SUB(NOW(),INTERVAL 3 DAY),DATE_ADD(NOW(),INTERVAL 1 DAY),45,DATE_SUB(NOW(),INTERVAL 4 DAY)),
-- 21 (Алексей едет в Ригу)
('Забран','Витебск','ул. Кирова, 3','2026-06-01','Наталья Орлова','+375212000020',55.1904,30.2049,
 'Рига','Daugavas iela, 30','2026-06-05','Indulis Kalniņš','+37123000001',56.9460,24.1059,
 'ООО «ВитебскМеталл»','+375212000021',2850.00,2150.00,'Не оплачено','Тентованный 82м³',19000,76,
 3,9,DATE_SUB(NOW(),INTERVAL 3 DAY),DATE_ADD(NOW(),INTERVAL 2 DAY),0,DATE_SUB(NOW(),INTERVAL 4 DAY));

-- Обновляем load_id у водителей
UPDATE Users SET load_id=18, status='active' WHERE id=10;
UPDATE Users SET load_id=19, status='active' WHERE id=8;
UPDATE Users SET load_id=20, status='active' WHERE id=11;
UPDATE Users SET load_id=21, status='active' WHERE id=9;

-- ── НАЗНАЧЕН (4 заказа) ───────────────────────────────────────────────────────
INSERT INTO loads (status,origin_city,origin_addr,origin_date,origin_contact,origin_phone,
  destination_city,destination_addr,destination_date,destination_contact,destination_phone,
  shipper_name,shipper_phone,cod_amount,driver_pay,driver_pay_status,vehicle_type,weight_kg,volume_m3,
  dispatcher_id,driver_id,planned_pickup_at,planned_delivery_at,created_at)
VALUES
-- 22
('Назначен','Минск','ул. Немига, 5','2026-06-06','Вадим Черников','+375291000070',
 'Берлин','Friedrichstraße, 100','2026-06-10','Stefan Weber','+4930300001',
 'ООО «МинскПром»','+375171000030',4200.00,3200.00,'Не оплачено','Тентованный 82м³',22000,82,
 2,10,DATE_ADD(NOW(),INTERVAL 2 DAY),DATE_ADD(NOW(),INTERVAL 6 DAY),DATE_SUB(NOW(),INTERVAL 2 DAY)),
-- 23
('Назначен','Брест','ул. Ленина, 15','2026-06-07','Марина Шевченко','+375162000030',
 'Варшава','ul. Nowy Świat, 5','2026-06-09','Aleksander Maj','+48606000001',
 'ООО «БрестТекс»','+375162000031',1600.00,1200.00,'Не оплачено','Рефрижератор',10000,54,
 3,11,DATE_ADD(NOW(),INTERVAL 3 DAY),DATE_ADD(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 2 DAY)),
-- 24
('Назначен','Гродно','пр. Янки Купалы, 4','2026-06-08','Сергей Карась','+375152000010',
 'Краков','ul. Grodzka, 2','2026-06-12','Bartosz Zając','+48607000001',
 'ООО «ГродноПродукт»','+375152000011',2100.00,1600.00,'Не оплачено','Рефрижератор',12000,60,
 2,8,DATE_ADD(NOW(),INTERVAL 4 DAY),DATE_ADD(NOW(),INTERVAL 8 DAY),DATE_SUB(NOW(),INTERVAL 1 DAY)),
-- 25
('Назначен','Витебск','пр. Фрунзе, 20','2026-06-08','Елена Кузьмич','+375212000030',
 'Рига','Tērbatas iela, 55','2026-06-11','Raimonds Vītoliņš','+37124000001',
 'ООО «ВитебскЛён»','+375212000031',2600.00,1950.00,'Не оплачено','Тентованный 82м³',17000,72,
 3,9,DATE_ADD(NOW(),INTERVAL 4 DAY),DATE_ADD(NOW(),INTERVAL 7 DAY),DATE_SUB(NOW(),INTERVAL 1 DAY));

-- ── НОВЫЙ (5 заказов, водитель не назначен) ──────────────────────────────────
INSERT INTO loads (status,origin_city,origin_addr,origin_date,origin_contact,origin_phone,
  destination_city,destination_addr,destination_date,destination_contact,destination_phone,
  shipper_name,shipper_phone,cod_amount,driver_pay,vehicle_type,weight_kg,volume_m3,
  dispatcher_id,created_at)
VALUES
-- 26
('Новый','Минск','ул. Кульман, 1','2026-06-10','Дмитрий Попов','+375291000080',
 'Гданьск','ul. Długi Targ, 1','2026-06-15','Tomasz Wróblewski','+48608000001',
 'ООО «БелХим»','+375171000040',3500.00,2700.00,'Тентованный 82м³',21000,82,
 2,NOW()),
-- 27
('Новый','Брест','ул. Октябрьской Революции, 5','2026-06-10','Ольга Кравцова','+375162000040',
 'Берлин','Kurfürstendamm, 25','2026-06-16','Frank Hoffmann','+4930400001',
 'ООО «ПолесьеТрейд»','+375162000041',5800.00,4400.00,'Тентованный 82м³',24000,82,
 3,NOW()),
-- 28
('Новый','Могилёв','ул. Гагарина, 9','2026-06-11','Игорь Сорокин','+375222000010',
 'Минск','ул. Якуба Коласа, 4','2026-06-12','Артём Новиков','+375291000090',
 'ОАО «МогилёвЛифт»','+375222000011',920.00,700.00,'Бортовой',7000,38,
 2,NOW()),
-- 29
('Новый','Гомель','пр. Октября, 48','2026-06-11','Юлия Мельник','+375232000030',
 'Варшава','ul. Marszałkowska, 100','2026-06-16','Grzegorz Konieczny','+48609000001',
 'ООО «ГомельСтекло»','+375232000031',4100.00,3100.00,'Тентованный 82м³',20000,80,
 3,NOW()),
-- 30
('Новый','Минск','пр. Машерова, 9','2026-06-12','Денис Куликов','+375291000100',
 'Таллин','Narva mnt, 7','2026-06-18','Andres Tamm','+3726200001',
 'ООО «МинскЭлектро»','+375171000050',3800.00,2900.00,'Тентованный 82м³',19000,76,
 2,NOW());

-- ── В ОЖИДАНИИ (2 заказа — задержка на таможне или ожидание погрузки) ────────
INSERT INTO loads (status,origin_city,origin_addr,origin_date,origin_contact,origin_phone,
  destination_city,destination_addr,destination_date,destination_contact,destination_phone,
  shipper_name,shipper_phone,cod_amount,driver_pay,driver_pay_status,vehicle_type,weight_kg,volume_m3,
  dispatcher_id,driver_id,delay_minutes,created_at)
VALUES
-- 31 (задержка на таможне)
('В ожидании','Минск','ул. Сурганова, 10','2026-05-29','Антон Зубов','+375291000110',
 'Варшава','ul. Piłsudskiego, 8','2026-06-02','Mariusz Krejza','+48610000001',
 'ООО «БелЭкспорт-2»','+375171000060',3300.00,2500.00,'Не оплачено','Тентованный 82м³',20500,82,
 2,10,300,DATE_SUB(NOW(),INTERVAL 6 DAY)),
-- 32 (ожидание документов отправителя)
('В ожидании','Брест','ул. Интернациональная, 20','2026-06-01','Кирилл Власов','+375162000050',
 'Вильнюс','Vilniaus g. 25','2026-06-05','Vytautas Liutvas','+37063000001',
 'ООО «БрестФуд»','+375162000051',1400.00,1050.00,'Не оплачено','Рефрижератор',9000,50,
 3,11,120,DATE_SUB(NOW(),INTERVAL 3 DAY));

-- ── КЛЕЙМ (2 заказа — активные претензии) ────────────────────────────────────
INSERT INTO loads (status,origin_city,origin_addr,origin_date,origin_contact,origin_phone,
  destination_city,destination_addr,destination_date,destination_contact,destination_phone,
  shipper_name,shipper_phone,cod_amount,driver_pay,driver_pay_status,vehicle_type,weight_kg,volume_m3,
  dispatcher_id,driver_id,created_at)
VALUES
-- 33 (повреждение груза)
('Клейм','Минск','ул. Немига, 40','2026-05-14','Борис Кузьмин','+375291000120',
 'Рига','Aspazijas bulvāris, 5','2026-05-18','Artūrs Kalniņš','+37125000001',
 'ООО «МинскТех»','+375171000070',3600.00,2750.00,'Не оплачено','Бортовой',17000,65,
 2,8,DATE_SUB(NOW(),INTERVAL 21 DAY)),
-- 34 (неоплата)
('Клейм','Гомель','ул. Кирова, 7','2026-05-18','Вера Романова','+375232000040',
 'Берлин','Unter den Linden, 15','2026-05-23','Dieter Klein','+4930500001',
 'ООО «ГомельТорг»','+375232000041',4700.00,3600.00,'Не оплачено','Тентованный 82м³',22000,82,
 3,9,DATE_SUB(NOW(),INTERVAL 17 DAY));

-- ── ЗАПРОШЕН (2 заказа — отправлено предложение водителю) ────────────────────
INSERT INTO loads (status,origin_city,origin_addr,origin_date,origin_contact,origin_phone,
  destination_city,destination_addr,destination_date,destination_contact,destination_phone,
  shipper_name,shipper_phone,cod_amount,driver_pay,vehicle_type,weight_kg,volume_m3,
  dispatcher_id,created_at)
VALUES
-- 35
('Запрошен','Минск','ул. Маяковского, 115','2026-06-10','Роберт Рубец','+375291000130',
 'Берлин','Tempodrom, 1','2026-06-16','Karl Schreiber','+4930600001',
 'ООО «МинскСтанко»','+375171000080',5000.00,3800.00,'Тентованный 82м³',24000,82,
 2,DATE_SUB(NOW(),INTERVAL 1 DAY)),
-- 36
('Запрошен','Гродно','ул. Советская, 29','2026-06-11','Леонид Василевский','+375152000020',
 'Варшава','ul. Chmielna, 10','2026-06-14','Jakub Lis','+48611000001',
 'ООО «ГродноХлеб»','+375152000021',1800.00,1350.00,'Рефрижератор',11000,56,
 3,NOW());

-- ── УДАЛЁН (1 заказ) ─────────────────────────────────────────────────────────
INSERT INTO loads (status,origin_city,origin_addr,origin_date,origin_contact,origin_phone,
  destination_city,destination_addr,destination_date,destination_contact,destination_phone,
  shipper_name,shipper_phone,cod_amount,driver_pay,vehicle_type,
  dispatcher_id,created_at)
VALUES
-- 37
('Удалён','Минск','ул. Тимирязева, 65','2026-06-07','Алина Герасимова','+375291000140',
 'Прага','Wenceslas Square, 1','2026-06-13','Tomáš Kolář','+420602000001',
 'ООО «ТехноИмпорт»','+375171000090',6500.00,0,'Тентованный 82м³',
 2,DATE_SUB(NOW(),INTERVAL 5 DAY));

-- ════════════════════════════════════════════════════════════
-- ТРАНСПОРТНЫЕ СРЕДСТВА ЗАКАЗОВ
-- ════════════════════════════════════════════════════════════
INSERT INTO load_vehicles (load_id, year, make, type, vin, price) VALUES
(1,  2019, 'Volvo FH16',        'Тентованный 82м³', 'YV2RT40A4KB001111', 45000.00),
(2,  2021, 'Mercedes Actros',   'Рефрижератор',     'WDB9634031L002222', 62000.00),
(3,  2018, 'MAN TGX 18.480',    'Бортовой',         'WMAN623061Y003333', 38000.00),
(4,  2022, 'DAF XF 106.480',    'Тентованный 82м³', 'XLRTE47XS0E004444', 55000.00),
(5,  2020, 'Scania R500',       'Тентованный 82м³', 'YS2R4X20001005555', 70000.00),
(6,  2021, 'Mercedes Actros',   'Рефрижератор',     'WDB9634031L006666', 60000.00),
(7,  2019, 'Volvo FH',          'Тентованный 82м³', 'YV2RT40A4KB007777', 47000.00),
(8,  2022, 'DAF XF',            'Тентованный 82м³', 'XLRTE47XS0E008888', 57000.00),
(12, 2020, 'Scania R450',       'Тентованный 82м³', 'YS2R4X20001012222', 66000.00),
(13, 2021, 'Mercedes Actros',   'Рефрижератор',     'WDB9634031L013333', 64000.00),
(14, 2019, 'Volvo FH16',        'Тентованный 82м³', 'YV2RT40A4KB014444', 46000.00),
(15, 2018, 'MAN TGX',           'Бортовой',         'WMAN623061Y015555', 35000.00),
(16, 2022, 'DAF XF 106',        'Тентованный 82м³', 'XLRTE47XS0E016666', 58000.00),
(17, 2021, 'Mercedes Actros',   'Рефрижератор',     'WDB9634031L017777', 63000.00),
(18, 2023, 'Volvo FH500',       'Тентованный 82м³', 'YV2RT40A4KB018888', 75000.00),
(19, 2022, 'Scania S500',       'Тентованный 82м³', 'YS2S4X20001019999', 78000.00),
(20, 2018, 'MAN TGX 18.400',    'Бортовой',         'WMAN623061Y020000', 37000.00),
(21, 2021, 'Volvo FH460',       'Тентованный 82м³', 'YV2RT40A4KB021111', 68000.00),
(22, 2023, 'DAF XG+',           'Тентованный 82м³', 'XLRTE47XS0E022222', 95000.00),
(33, 2019, 'MAN TGX',           'Бортовой',         'WMAN623061Y033333', 39000.00),
(34, 2021, 'Volvo FH',          'Тентованный 82м³', 'YV2RT40A4KB034444', 50000.00);

-- ════════════════════════════════════════════════════════════
-- ЛИЧНЫЕ ТС ВОДИТЕЛЕЙ
-- ════════════════════════════════════════════════════════════
INSERT INTO user_vehicles (driver_id, type, make, model, year, vin, plate, capacity, volume, length, status) VALUES
(8,  'Тентованный 82м³', 'Volvo',         'FH16 500',    2019, 'YV2RT40A4KB777001', '7765 МИ-7', 24.0, 82.0, 13.6, 'active'),
(8,  'Рефрижератор',     'Mercedes-Benz', 'Actros 1845', 2021, 'WDB9634031L777011', '9901 МИ-7', 22.0, 76.0, 13.4, 'active'),
(9,  'Рефрижератор',     'Mercedes-Benz', 'Actros 1845', 2021, 'WDB9634031L777002', '8823 МЕ-2', 22.0, 76.0, 13.4, 'active'),
(9,  'Тентованный 82м³', 'Scania',        'R450',        2022, 'YS2R4X20001777022', '4412 МЕ-2', 24.0, 82.0, 13.6, 'active'),
(10, 'Бортовой',         'MAN',           'TGX 18.480',  2018, 'WMAN623061Y777003', '4521 МК-6', 20.0, 68.0, 13.2, 'active'),
(10, 'Тентованный 82м³', 'Volvo',         'FH500',       2023, 'YV2RT40A4KB777033', '1122 МК-6', 24.0, 82.0, 13.6, 'active'),
(11, 'Тентованный 82м³', 'DAF',           'XF 106.480',  2022, 'XLRTE47XS0E777004', '1234 МГ-1', 24.0, 82.0, 13.6, 'active'),
(11, 'Рефрижератор',     'Volvo',         'FH460',       2020, 'YV2RT40A4KB777044', '5566 МГ-1', 22.0, 76.0, 13.4, 'maintenance');

-- ════════════════════════════════════════════════════════════
-- GPS ЛОГИ (трекинг активных водителей)
-- ════════════════════════════════════════════════════════════
-- Николай (driver_id=10) везёт заказ 18: Минск → Варшава, сейчас у Варшавы
INSERT INTO GPS_Logs (driver_id, load_id, lat, lng, speed, heading, created_at) VALUES
(10, 18, 53.9045, 27.5615, 0,   270, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(10, 18, 53.5000, 26.8000, 85,  265, DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 4 HOUR)),
(10, 18, 53.1500, 26.0000, 88,  260, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(10, 18, 52.8000, 25.2000, 82,  255, DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 4 HOUR)),
(10, 18, 52.4500, 24.3000, 90,  270, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(10, 18, 52.2500, 23.5000, 75,  270, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(10, 18, 52.2297, 21.5000, 80,  270, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(10, 18, 52.2297, 21.0122, 0,   270, DATE_SUB(NOW(), INTERVAL 2 HOUR));

-- Иван (driver_id=8) везёт заказ 19: Брест → Берлин, сейчас в Германии
INSERT INTO GPS_Logs (driver_id, load_id, lat, lng, speed, heading, created_at) VALUES
(8, 19, 52.0975, 23.7341, 0,   270, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(8, 19, 52.0700, 22.8000, 90,  265, DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 3 HOUR)),
(8, 19, 52.1000, 21.8000, 85,  260, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(8, 19, 52.2500, 20.5000, 88,  270, DATE_SUB(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 5 HOUR)),
(8, 19, 52.4000, 19.0000, 92,  270, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(8, 19, 52.5200, 16.5000, 85,  270, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 6 HOUR)),
(8, 19, 52.5200, 14.5000, 80,  270, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(8, 19, 52.5200, 13.4050, 0,   270, DATE_SUB(NOW(), INTERVAL 3 HOUR));

-- Роман (driver_id=11) везёт заказ 20: Гомель → Вильнюс
INSERT INTO GPS_Logs (driver_id, load_id, lat, lng, speed, heading, created_at) VALUES
(11, 20, 52.4345, 30.9754, 0,   315, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(11, 20, 52.9000, 29.5000, 85,  320, DATE_SUB(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 3 HOUR)),
(11, 20, 53.6000, 28.5000, 80,  315, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(11, 20, 54.0000, 27.5000, 88,  310, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 4 HOUR)),
(11, 20, 54.3500, 26.5000, 90,  305, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(11, 20, 54.6872, 25.2797, 0,   305, DATE_SUB(NOW(), INTERVAL 4 HOUR));

-- Алексей (driver_id=9) везёт заказ 21: Витебск → Рига
INSERT INTO GPS_Logs (driver_id, load_id, lat, lng, speed, heading, created_at) VALUES
(9, 21, 55.1904, 30.2049, 0,   315, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(9, 21, 55.5000, 29.0000, 82,  320, DATE_SUB(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 3 HOUR)),
(9, 21, 56.0000, 27.5000, 87,  325, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(9, 21, 56.4000, 26.2000, 85,  330, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 4 HOUR)),
(9, 21, 56.9460, 24.1059, 0,   330, DATE_SUB(NOW(), INTERVAL 5 HOUR));

-- ════════════════════════════════════════════════════════════
-- ДОКУМЕНТЫ ПЕРЕВОЗЧИКОВ И ВОДИТЕЛЕЙ
-- ════════════════════════════════════════════════════════════
INSERT INTO carrier_documents (user_id, doc_type, doc_number, issued_by, issued_at, expires_at, status, verified_by, verified_at, notes) VALUES
-- Иван Петров (id=8)
(8, 'license',     'ВА 1234567', 'ГАИ г. Минска',           '2018-03-15', '2028-03-15', 'verified', 1, DATE_SUB(NOW(),INTERVAL 30 DAY), 'Категории C, CE. Проверено'),
(8, 'medical',     'МС-00123456','МСЧ №1 г. Минска',         '2026-01-10', '2027-01-10', 'verified', 2, DATE_SUB(NOW(),INTERVAL 25 DAY), 'Годен. Психиатр/нарколог пройден'),
(8, 'vehicle_cert','ТР-А001234', 'ГАИ МВД РБ',               '2019-06-20', '2027-06-20', 'verified', 1, DATE_SUB(NOW(),INTERVAL 20 DAY), 'ТС Volvo FH16, рег. 7765 МИ-7'),
(8, 'insurance',   'КАСКО-881234','БГСО',                    '2025-09-01', '2026-09-01', 'verified', 1, DATE_SUB(NOW(),INTERVAL 15 DAY), 'Страховка CMR, лимит 100 000 EUR'),
-- Алексей Сидоров (id=9)
(9, 'license',     'ВА 7654321', 'ГАИ г. Гомеля',            '2019-07-20', '2029-07-20', 'verified', 1, DATE_SUB(NOW(),INTERVAL 28 DAY), 'Категории C, CE. ADR допуск'),
(9, 'medical',     'МС-00234567','МСЧ №3 г. Гомеля',         '2026-02-05', '2027-02-05', 'verified', 2, DATE_SUB(NOW(),INTERVAL 22 DAY), 'Годен'),
(9, 'adr',         'ADR-BY-00456','Министерство транспорта',  '2025-04-10', '2027-04-10', 'verified', 1, DATE_SUB(NOW(),INTERVAL 18 DAY), 'Классы 2, 3, 6. Действителен'),
(9, 'vehicle_cert','ТР-А002345', 'ГАИ МВД РБ',               '2021-08-15', '2029-08-15', 'verified', 1, DATE_SUB(NOW(),INTERVAL 12 DAY), 'Mercedes Actros 1845, 8823 МЕ-2'),
-- Николай Зайцев (id=10)
(10,'license',     'ВА 9876543', 'ГАИ г. Бреста',            '2020-05-12', '2030-05-12', 'verified', 1, DATE_SUB(NOW(),INTERVAL 26 DAY), 'Категории C, CE'),
(10,'medical',     'МС-00345678','МСЧ №2 г. Бреста',         '2025-11-20', '2026-11-20', 'verified', 2, DATE_SUB(NOW(),INTERVAL 20 DAY), 'Годен'),
(10,'vehicle_cert','ТР-А003456', 'ГАИ МВД РБ',               '2018-09-10', '2026-09-10', 'pending',  NULL, NULL,                          'MAN TGX, 4521 МК-6 — истекает скоро'),
-- Роман Козлов (id=11)
(11,'license',     'ВА 1122334', 'ГАИ г. Гродно',            '2021-02-28', '2031-02-28', 'verified', 1, DATE_SUB(NOW(),INTERVAL 24 DAY), 'Категории C, CE'),
(11,'medical',     'МС-00456789','МСЧ №1 г. Гродно',         '2026-03-01', '2027-03-01', 'verified', 2, DATE_SUB(NOW(),INTERVAL 19 DAY), 'Годен'),
(11,'vehicle_cert','ТР-А004567', 'ГАИ МВД РБ',               '2022-04-05', '2030-04-05', 'verified', 1, DATE_SUB(NOW(),INTERVAL 14 DAY), 'DAF XF 106.480, 1234 МГ-1'),
(11,'insurance',   'КАСКО-994567','БРУСП «Белгосстрах»',     '2025-10-01', '2026-10-01', 'verified', 1, DATE_SUB(NOW(),INTERVAL 10 DAY), 'Страховка CMR'),
-- ООО «АвтоЛогист» (id=6)
(6, 'insurance',   'СМР-6781234','«Альфастрахование»',       '2025-07-01', '2026-07-01', 'verified', 1, DATE_SUB(NOW(),INTERVAL 35 DAY), 'CMR страховка, лимит 200 000 EUR'),
(6, 'vehicle_cert','ТР-Ю001234', 'ГАИ МВД РБ',               '2021-03-10', '2029-03-10', 'verified', 1, DATE_SUB(NOW(),INTERVAL 30 DAY), 'Парк 5 единиц техники'),
-- ИП Захаров (id=7)
(7, 'insurance',   'СМР-7892345','БРУСП «Белгосстрах»',      '2025-09-15', '2026-09-15', 'verified', 1, DATE_SUB(NOW(),INTERVAL 32 DAY), 'CMR страховка'),
(7, 'vehicle_cert','ТР-Ю002345', 'ГАИ МВД РБ',               '2019-11-20', '2026-11-20', 'pending',  NULL, NULL,                          'Техпаспорт истекает через 5 мес.'),
-- Просроченные документы (для демонстрации статуса "Просрочен" в Documents.jsx)
(9, 'medical',     'МС-00111222','МСЧ №3 г. Гомеля',         '2024-01-15', '2025-01-15', 'expired',  NULL, NULL,                          'Срок действия истёк — требуется переосвидетельствование'),
(10,'insurance',   'КАСКО-770099','БРУСП «Белгосстрах»',     '2024-03-01', '2025-03-01', 'expired',  NULL, NULL,                          'Полис не продлён — требуется новая страховка перед рейсом');

-- ════════════════════════════════════════════════════════════
-- ОТЗЫВЫ
-- ════════════════════════════════════════════════════════════
INSERT INTO reviews (author_id, target_user_id, rating, text, created_at) VALUES
-- Брокер 1 (4) оценивает водителей
(4, 8,  5, 'Отличный водитель! Доставил груз точно в срок, все документы в порядке. Работаем постоянно.', DATE_SUB(NOW(),INTERVAL 58 DAY)),
(4, 9,  4, 'Хороший специалист. Небольшая задержка на польской таможне, но груз цел и невредим.', DATE_SUB(NOW(),INTERVAL 50 DAY)),
(4, 11, 5, 'Роман — профессионал. Вовремя, аккуратно, на связи 24/7. Рекомендую!', DATE_SUB(NOW(),INTERVAL 40 DAY)),
-- Брокер 2 (5) оценивает водителей
(5, 10, 4, 'Надёжный водитель. Небольшое опоздание из-за пробок на въезде в Ригу, в остальном всё хорошо.', DATE_SUB(NOW(),INTERVAL 47 DAY)),
(5, 8,  5, 'Превосходно! Иван всегда на связи, груз доставлен раньше срока. Высший класс!', DATE_SUB(NOW(),INTERVAL 35 DAY)),
(5, 9,  5, 'Алексей чёткий — ADR груз доставил без нареканий. Будем продолжать сотрудничество.', DATE_SUB(NOW(),INTERVAL 29 DAY)),
-- Диспетчер (2) оценивает водителей
(2, 10, 4, 'Николай исполнительный, хорошо знает маршруты по Польше. Рекомендую для западного направления.', DATE_SUB(NOW(),INTERVAL 22 DAY)),
(2, 11, 5, 'Роман — лучший водитель в нашем пуле. Никогда не подводил.', DATE_SUB(NOW(),INTERVAL 18 DAY)),
-- Перевозчик (6) оценивает брокера
(6, 4,  5, 'Сергей — компетентный брокер. Всегда чёткие условия, нет разночтений в документах.', DATE_SUB(NOW(),INTERVAL 30 DAY)),
(6, 5,  4, 'Ольга профессионально работает. Единственное — иногда медленно отвечает по вечерам.', DATE_SUB(NOW(),INTERVAL 25 DAY));

-- ════════════════════════════════════════════════════════════
-- КОНТАКТЫ (адресная книга брокеров)
-- ════════════════════════════════════════════════════════════
INSERT INTO contacts (broker_id, contact_user_id, blacklisted, created_at) VALUES
(4, 6,  0, DATE_SUB(NOW(),INTERVAL 90 DAY)),
(4, 7,  0, DATE_SUB(NOW(),INTERVAL 85 DAY)),
(4, 8,  0, DATE_SUB(NOW(),INTERVAL 80 DAY)),
(4, 9,  0, DATE_SUB(NOW(),INTERVAL 78 DAY)),
(4, 10, 0, DATE_SUB(NOW(),INTERVAL 75 DAY)),
(4, 11, 0, DATE_SUB(NOW(),INTERVAL 70 DAY)),
(5, 6,  0, DATE_SUB(NOW(),INTERVAL 88 DAY)),
(5, 7,  0, DATE_SUB(NOW(),INTERVAL 82 DAY)),
(5, 8,  0, DATE_SUB(NOW(),INTERVAL 79 DAY)),
(5, 9,  0, DATE_SUB(NOW(),INTERVAL 76 DAY)),
(5, 10, 0, DATE_SUB(NOW(),INTERVAL 73 DAY)),
(5, 11, 1, DATE_SUB(NOW(),INTERVAL 15 DAY));

-- ════════════════════════════════════════════════════════════
-- СООБЩЕНИЯ (чат по заказам и между пользователями)
-- ════════════════════════════════════════════════════════════
INSERT INTO Messages (sender_id, receiver_id, order_id, text, type, is_read, created_at) VALUES
-- Заказ 18: Николай→Диспетчер Анна
(10, 2, 18, 'Груз принят на складе, выезжаю на маршрут. Документы получены, всё в порядке.', 'text', 1, DATE_SUB(NOW(),INTERVAL 5 DAY)),
(2, 10, 18, 'Отлично! Держи связь на погранпереходе. На Тересполе сейчас очередь около 3 часов.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 10 MINUTE)),
(10, 2, 18, 'Понял, учту. Я буду на границе ориентировочно завтра утром.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 20 HOUR)),
(2, 10, 18, 'Хорошо. Не забудь, получатель ждёт груз 4 июня до 16:00.', 'text', 1, DATE_SUB(NOW(),INTERVAL 4 DAY)),
(10, 2, 18, 'Пересёк границу без проблем. Еду по трассе S17, всё нормально.', 'text', 1, DATE_SUB(NOW(),INTERVAL 3 DAY)),
(10, 2, 18, 'Подъезжаю к Варшаве. Пробка на развязке, задержка ~30 мин.', 'text', 0, DATE_SUB(NOW(),INTERVAL 2 HOUR)),
-- Заказ 19: Иван→Диспетчер Дмитрий
(8, 3, 19, 'Загрузился в Бресте, CMR подписана. Отправляюсь в 14:30.', 'text', 1, DATE_SUB(NOW(),INTERVAL 4 DAY)),
(3, 8, 19, 'Принято. Польская сторона ждёт. Номер экспедитора в Берлине: +4917600001.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 15 MINUTE)),
(8, 3, 19, 'На таможне в Тересполе задержался на 2 часа. Сейчас на территории ЕС.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 12 HOUR)),
(3, 8, 19, 'Хорошо. Следи за погодой — в Германии сегодня предупреждение о сильном ветре.', 'text', 1, DATE_SUB(NOW(),INTERVAL 3 DAY)),
(8, 3, 19, 'Учту. Еду по A2, ничего критичного. Буду в Берлине послезавтра утром.', 'text', 0, DATE_SUB(NOW(),INTERVAL 1 DAY)),
-- Заказ 20: Роман→Диспетчер Анна (задержка)
(11, 2, 20, 'Загружен. Старт в 09:00. Груз — текстиль 11 тонн.', 'text', 1, DATE_SUB(NOW(),INTERVAL 3 DAY)),
(2, 11, 20, 'Принято! Получатель в Вильнюсе ждёт 4 июня до 12:00.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 5 MINUTE)),
(11, 2, 20, 'Задержался на МКАД из-за аварии. Буду на 45 минут позже расчётного.', 'text', 1, DATE_SUB(NOW(),INTERVAL 2 DAY)),
(2, 11, 20, 'Понял, предупредила получателя. Он согласен. Езди аккуратно!', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 10 MINUTE)),
(11, 2, 20, 'Пересёк границу BY-LT. Еду к Вильнюсу, ~4 часа.', 'text', 0, DATE_SUB(NOW(),INTERVAL 6 HOUR)),
-- Заказ 21: Алексей→Диспетчер Дмитрий
(9, 3, 21, 'Погрузка завершена в Витебске. Металлопрокат 19 тонн, всё задокументировано.', 'text', 1, DATE_SUB(NOW(),INTERVAL 3 DAY)),
(3, 9, 21, 'Отлично. Рига, Даугавы 30 — подъезд с торца склада. Контакт: Индулис +37123000001.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 20 MINUTE)),
(9, 3, 21, 'Прошёл таможню в Верхнедвинске. Всё чисто, документы в порядке.', 'text', 1, DATE_SUB(NOW(),INTERVAL 2 DAY)),
(9, 3, 21, 'Въехал в Латвию. Приеду в Ригу ориентировочно завтра в 10:00.', 'text', 0, DATE_SUB(NOW(),INTERVAL 5 HOUR)),
-- Заказ 33 (Клейм): брокер→диспетчер
(4, 2, 33, 'Анна, нужно разобраться с заказом #33. Получатель в Риге говорит, что 3 паллеты повреждены.', 'text', 1, DATE_SUB(NOW(),INTERVAL 18 DAY)),
(2, 4, 33, 'Сергей, понял. Водитель говорит, что груз принял в целости. Нужно фото с места.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 18 DAY), INTERVAL 30 MINUTE)),
(4, 2, 33, 'Фото получены — видно вмятины на паллетах. Подаю претензию официально.', 'text', 1, DATE_SUB(NOW(),INTERVAL 17 DAY)),
(2, 4, 33, 'Хорошо, оформим через систему. Я уже уведомила страховую.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 17 DAY), INTERVAL 1 HOUR)),
-- Брокер 4→Водитель 8 (личное)
(4, 8, NULL, 'Иван, есть заказ на следующую неделю Минск-Берлин, 24т. Ставка 4200. Интересует?', 'text', 1, DATE_SUB(NOW(),INTERVAL 3 DAY)),
(8, 4, NULL, 'Да, готов. Скажите точные даты погрузки.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 2 HOUR)),
(4, 8, NULL, 'Погрузка 8 июня, доставка до 12 июня. Отправлю детали в заказе.', 'text', 0, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 20 HOUR)),
-- Диспетчер→Водитель (о заказах)
(3, 10, NULL, 'Николай, после Варшавы уже есть обратный груз. Напишу детали как разгрузишься.', 'text', 0, DATE_SUB(NOW(),INTERVAL 1 DAY)),
(2, 9,  NULL, 'Алексей, в июне планируется несколько рейсов Беларусь-Германия. Ты в списке приоритетных.', 'text', 0, DATE_SUB(NOW(),INTERVAL 12 HOUR));

-- ════════════════════════════════════════════════════════════
-- ПРЕТЕНЗИИ
-- ════════════════════════════════════════════════════════════
INSERT INTO claims (load_id, claimant_id, respondent_id, type, status, amount, currency, description, resolution, resolved_by, resolved_at, created_at) VALUES
-- Претензия 1: повреждение груза на заказе 33
(33, 4, 8, 'cargo_damage', 'На рассмотрении', 1800.00, 'EUR',
 'При получении груза в Риге обнаружено повреждение 3 паллет с керамической плиткой. Получатель зафиксировал ущерб актом. Требуется возмещение стоимости повреждённого товара.',
 NULL, NULL, NULL, DATE_SUB(NOW(),INTERVAL 18 DAY)),
-- Претензия 2: задержка доставки на заказе 34
(34, 5, 9, 'delay', 'Урегулирована', 500.00, 'EUR',
 'Нарушен срок доставки: по договору 23.05.2026, фактически прибытие 26.05.2026. Получатель понёс убытки от простоя склада.',
 'Задержка произошла по вине немецкой таможни (проверка ADR-груза). Стороны договорились о компенсации 300 EUR.',
 1, DATE_SUB(NOW(),INTERVAL 10 DAY), DATE_SUB(NOW(),INTERVAL 14 DAY)),
-- Претензия 3: неоплата за выполненный рейс
(17, 9, 4, 'non_payment', 'Принята', 1700.00, 'BYN',
 'Перевозка выполнена 30 мая 2026 года, однако оплата водителю не произведена в установленный срок (3 рабочих дня). Прошу перечислить задолженность.',
 'Подтверждено. Оплата задержана по технической причине. Переводим в течение 48 часов.',
 2, DATE_SUB(NOW(),INTERVAL 3 DAY), DATE_SUB(NOW(),INTERVAL 5 DAY)),
-- Претензия 4: проблема с документами
(12, 2, 6, 'document', 'Закрыта', 0.00, 'BYN',
 'Перевозчик ООО «АвтоЛогист» предоставил CMR с ошибкой в адресе получателя. Потребовалось переоформление, что задержало растаможку.',
 'ООО «АвтоЛогист» признал ошибку, исправленные документы предоставлены. Инцидент исчерпан.',
 1, DATE_SUB(NOW(),INTERVAL 12 DAY), DATE_SUB(NOW(),INTERVAL 14 DAY));

-- ════════════════════════════════════════════════════════════
-- ИНЦИДЕНТЫ
-- ════════════════════════════════════════════════════════════
INSERT INTO incidents (load_id, reporter_id, type, description, lat, lng, status, resolved_at, resolved_by, created_at) VALUES
-- Задержка на таможне (заказ 31)
(31, 10, 'customs',   'Польская таможня на Тересполе остановила ТС для углублённого досмотра. Очередь ~5 часов, задержка значительная.', 52.0819, 23.6181, 'in_review', NULL, NULL, DATE_SUB(NOW(),INTERVAL 5 DAY)),
-- Поломка (старый заказ 7, уже решено)
(7,  10, 'breakdown', 'Пробито левое переднее колесо на трассе M1 в Литве. Замена заняла 1.5 часа.', 55.0000, 26.5000, 'resolved', DATE_SUB(NOW(),INTERVAL 24 DAY), 2, DATE_SUB(NOW(),INTERVAL 25 DAY)),
-- Повреждение груза (заказ 33)
(33, 8,  'cargo_damage','При погрузке в Минске был повреждён угловой паллет. Зафиксировано вместе с отправителем. Фото прилагаю.', 53.9045, 27.5615, 'resolved', DATE_SUB(NOW(),INTERVAL 17 DAY), 2, DATE_SUB(NOW(),INTERVAL 21 DAY)),
-- Задержка из-за ДТП (заказ 20)
(20, 11, 'delay',     'Пробка на МКАД из-за ДТП. Задержка ~45 минут. Получатель предупреждён.', 53.8800, 27.5500, 'resolved', DATE_SUB(NOW(),INTERVAL 2 DAY), 2, DATE_SUB(NOW(),INTERVAL 2 DAY));

-- ════════════════════════════════════════════════════════════
-- РАСЧЁТЫ СТАВОК
-- ════════════════════════════════════════════════════════════
INSERT INTO rate_quotes (broker_id, origin_city, dest_city, distance_km, vehicle_type, weight_t, volume_m3, rate, currency, rate_per_km, notes, created_at) VALUES
(4, 'Минск',   'Варшава',  603,  'Тентованный 82м³', 20.0, 80.0, 3200.00, 'BYN', 5.3069, 'Стандартный тент. В цену включена таможня Тересполь.',                      DATE_SUB(NOW(),INTERVAL 65 DAY)),
(4, 'Минск',   'Берлин',   1100, 'Тентованный 82м³', 22.0, 82.0, 4800.00, 'BYN', 4.3636, 'Цена финальная с учётом сборов за проезд по автобанам.',                     DATE_SUB(NOW(),INTERVAL 50 DAY)),
(4, 'Брест',   'Берлин',   950,  'Рефрижератор',     12.0, 58.0, 5200.00, 'BYN', 5.4737, 'ADR. Двойная страховка CMR включена.',                                       DATE_SUB(NOW(),INTERVAL 42 DAY)),
(4, 'Гомель',  'Рига',     750,  'Тентованный 82м³', 21.0, 80.0, 3400.00, 'BYN', 4.5333, 'Актуальна для заказов от 15 тонн.',                                          DATE_SUB(NOW(),INTERVAL 35 DAY)),
(4, 'Минск',   'Таллин',   868,  'Тентованный 82м³', 18.0, 76.0, 3800.00, 'BYN', 4.3779, 'Паром не требуется, трасса BY-LT-LV-EE.',                                   DATE_SUB(NOW(),INTERVAL 28 DAY)),
(4, 'Минск',   'Краков',   950,  'Рефрижератор',     13.0, 62.0, 3300.00, 'BYN', 3.4737, 'Рефриж +2/+6°C. ADR не требуется.',                                          DATE_SUB(NOW(),INTERVAL 14 DAY)),
(5, 'Брест',   'Варшава',  196,  'Рефрижератор',     10.0, 54.0, 1800.00, 'BYN', 9.1837, 'Короткое плечо. Минимальный тариф. Возможна сборная погрузка.',              DATE_SUB(NOW(),INTERVAL 55 DAY)),
(5, 'Гродно',  'Краков',   507,  'Рефрижератор',     11.0, 56.0, 2100.00, 'BYN', 4.1420, 'Продукты питания. ADR не требуется.',                                        DATE_SUB(NOW(),INTERVAL 38 DAY)),
(5, 'Витебск', 'Рига',     350,  'Тентованный 82м³', 17.0, 72.0, 2600.00, 'BYN', 7.4286, 'Металлопрокат. Заказ от 15т.',                                               DATE_SUB(NOW(),INTERVAL 22 DAY)),
(5, 'Минск',   'Гданьск',  704,  'Тентованный 82м³', 20.0, 80.0, 3500.00, 'BYN', 4.9716, 'Стандартный маршрут. Перегрузка не требуется.',                             DATE_SUB(NOW(),INTERVAL 8 DAY)),
(5, 'Могилёв', 'Варшава',  700,  'Бортовой',          8.0, 40.0, 2800.00, 'BYN', 4.0000, 'Бортовой 20т. Открытая площадка, подходит для металлоконструкций.',         DATE_SUB(NOW(),INTERVAL 3 DAY));

-- ════════════════════════════════════════════════════════════
-- УВЕДОМЛЕНИЯ
-- ════════════════════════════════════════════════════════════
INSERT INTO notifications (user_id, type, title, message, is_read, entity_type, entity_id, created_at) VALUES
-- Диспетчер Анна (2)
(2, 'warning', 'Задержка на таможне', 'Водитель Зайцев Н. сообщает о задержке на Тересполе до 5 часов. Заказ #31.',               0, 'load', 31, DATE_SUB(NOW(),INTERVAL 5 DAY)),
(2, 'info',    'Груз доставлен',      'Заказ #16 (Витебск→Берлин) доставлен. Ожидает подтверждения оплаты.',                      1, 'load', 16, DATE_SUB(NOW(),INTERVAL 7 DAY)),
(2, 'error',   'Новая претензия',     'По заказу #33 открыта претензия о повреждении груза. Требуется рассмотрение.',              0, 'claim', 1, DATE_SUB(NOW(),INTERVAL 18 DAY)),
(2, 'info',    'Новый заказ создан',  'Создан заказ #26 (Минск→Гданьск). Назначьте водителя.',                                    0, 'load', 26, DATE_SUB(NOW(),INTERVAL 0 SECOND)),
(2, 'success', 'Оплата получена',     'Заказ #5 (Минск→Гданьск) — оплата 2750 BYN получена на счёт.',                             1, 'load', 5,  DATE_SUB(NOW(),INTERVAL 34 DAY)),
-- Диспетчер Дмитрий (3)
(3, 'warning', 'Задержка водителя',   'Козлов Р. сообщает о задержке 45 мин из-за ДТП на МКАД. Заказ #20.',                      1, 'load', 20, DATE_SUB(NOW(),INTERVAL 2 DAY)),
(3, 'info',    'Документ на проверке','Водитель Зайцев Н.: техпаспорт истекает через 5 месяцев. Необходимо продление.',           0, 'user', 10, DATE_SUB(NOW(),INTERVAL 10 DAY)),
(3, 'info',    'Заказ доставлен',     'Заказ #13 (Брест→Варшава) доставлен. Ожидает оплаты клиентом.',                            1, 'load', 13, DATE_SUB(NOW(),INTERVAL 14 DAY)),
(3, 'info',    'Новый заказ',         'Создан заказ #27 (Брест→Берлин). Требуется назначить водителя.',                           0, 'load', 27, DATE_SUB(NOW(),INTERVAL 0 SECOND)),
-- Брокер Сергей (4)
(4, 'error',   'Претензия открыта',   'Претензия по заказу #33: повреждение груза на 1800 EUR. Требуется ответ.',                 0, 'claim', 1, DATE_SUB(NOW(),INTERVAL 18 DAY)),
(4, 'success', 'Претензия закрыта',   'Претензия по заказу #12: документы исправлены, инцидент урегулирован.',                   1, 'claim', 4, DATE_SUB(NOW(),INTERVAL 12 DAY)),
(4, 'info',    'Расчёт ставки',       'Ваш расчёт Минск→Краков сохранён: 3300 BYN за 950 км.',                                   1, 'rate_quote', 6, DATE_SUB(NOW(),INTERVAL 14 DAY)),
(4, 'success', 'Оплата подтверждена', 'Заказ #1 (Минск→Варшава): оплата 3200 BYN проведена. Водитель получил 2500 BYN.',         1, 'load', 1,  DATE_SUB(NOW(),INTERVAL 59 DAY)),
-- Брокер Ольга (5)
(5, 'info',    'Претензия принята',   'Претензия Сидорова А. по заказу #17 принята. Перевод в течение 48 часов.',                 0, 'claim', 3, DATE_SUB(NOW(),INTERVAL 3 DAY)),
(5, 'success', 'Заказ оплачен',       'Заказ #6 (Гродно→Краков) полностью оплачен. Сумма 1920 BYN.',                             1, 'load', 6,  DATE_SUB(NOW(),INTERVAL 29 DAY)),
-- Водитель Иван (8)
(8, 'info',    'Новый заказ',         'Вам назначен заказ #24 (Гродно→Краков). Погрузка 8 июня.',                                0, 'load', 24, DATE_SUB(NOW(),INTERVAL 1 DAY)),
(8, 'warning', 'Претензия по рейсу',  'По заказу #33 открыта претензия о повреждении груза. Ваш комментарий необходим.',         0, 'claim', 1, DATE_SUB(NOW(),INTERVAL 18 DAY)),
-- Водитель Алексей (9)
(9, 'success', 'Оплата за рейс',      'Оплата за заказ #6 (Гродно→Краков): 1450 BYN зачислено на ваш счёт.',                    1, 'load', 6,  DATE_SUB(NOW(),INTERVAL 29 DAY)),
(9, 'info',    'Новый заказ',         'Вам назначен заказ #25 (Витебск→Рига). Погрузка 8 июня.',                                 0, 'load', 25, DATE_SUB(NOW(),INTERVAL 1 DAY)),
-- Водитель Николай (10)
(10,'warning', 'Задержка зафиксирована','Задержка 300 мин по заказу #31 зафиксирована. Держите связь с диспетчером.',             1, 'load', 31, DATE_SUB(NOW(),INTERVAL 5 DAY)),
(10,'info',    'Новый заказ',          'Вам назначен заказ #22 (Минск→Берлин). Погрузка 6 июня.',                                0, 'load', 22, DATE_SUB(NOW(),INTERVAL 2 DAY)),
-- Водитель Роман (11)
(11,'info',    'Новый заказ',          'Вам назначен заказ #23 (Брест→Варшава). Погрузка 7 июня.',                               0, 'load', 23, DATE_SUB(NOW(),INTERVAL 2 DAY)),
-- Администратор (1)
(1, 'info',    'Документ истекает',    'Техпаспорт ТС Зайцева Н. (МК-6) истекает 10.09.2026. Рекомендуем продление.',            0, 'user', 10, DATE_SUB(NOW(),INTERVAL 8 DAY)),
(1, 'info',    'Техпаспорт ИП Захарова','Техпаспорт ИП Захарова истекает через 5 месяцев. Требует обновления.',                  0, 'user', 7,  DATE_SUB(NOW(),INTERVAL 5 DAY));

-- ════════════════════════════════════════════════════════════
-- АУДИТ ЖУРНАЛ
-- ════════════════════════════════════════════════════════════
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data, ip_address, created_at) VALUES
(2, 'create', 'load', 18, '{"status":"Новый","origin_city":"Минск","destination_city":"Варшава"}',             '192.168.1.10', DATE_SUB(NOW(),INTERVAL 6 DAY)),
(2, 'update', 'load', 18, '{"status":"Назначен","driver_id":10}',                                               '192.168.1.10', DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 22 HOUR)),
(10,'update', 'load', 18, '{"status":"Забран"}',                                                                '10.0.0.8',    DATE_SUB(NOW(),INTERVAL 5 DAY)),
(3, 'create', 'load', 19, '{"status":"Новый","origin_city":"Брест","destination_city":"Берлин"}',              '192.168.1.11', DATE_SUB(NOW(),INTERVAL 5 DAY)),
(3, 'update', 'load', 19, '{"status":"Назначен","driver_id":8}',                                                '192.168.1.11', DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 23 HOUR)),
(8, 'update', 'load', 19, '{"status":"Забран"}',                                                                '10.0.0.5',    DATE_SUB(NOW(),INTERVAL 4 DAY)),
(2, 'update', 'load', 16, '{"status":"Доставлен","pod_confirmed_at":"2026-05-28"}',                             '192.168.1.10', DATE_SUB(NOW(),INTERVAL 7 DAY)),
(1, 'create', 'user', 11, '{"role":"driver","name":"Роман Козлов","email":"driver4@mt.by"}',             '192.168.1.1',  DATE_SUB(NOW(),INTERVAL 90 DAY)),
(1, 'update', 'user', 9,  '{"verified":1}',                                                                      '192.168.1.1',  DATE_SUB(NOW(),INTERVAL 28 DAY)),
(4, 'create', 'claim', 1, '{"type":"cargo_damage","amount":1800,"load_id":33}',                                 '192.168.1.20', DATE_SUB(NOW(),INTERVAL 18 DAY)),
(1, 'update', 'claim', 2, '{"status":"Урегулирована","resolved_by":1}',                                          '192.168.1.1',  DATE_SUB(NOW(),INTERVAL 10 DAY)),
(2, 'create', 'load', 26, '{"status":"Новый","origin_city":"Минск","destination_city":"Гданьск"}',             '192.168.1.10', NOW()),
(3, 'create', 'load', 27, '{"status":"Новый","origin_city":"Брест","destination_city":"Берлин"}',              '192.168.1.11', NOW()),
(1, 'verify', 'carrier_document', 1, '{"doc_type":"license","status":"verified","user_id":8}',                  '192.168.1.1',  DATE_SUB(NOW(),INTERVAL 30 DAY)),
(2, 'update', 'load', 33, '{"status":"Клейм"}',                                                                  '192.168.1.10', DATE_SUB(NOW(),INTERVAL 20 DAY));

-- ════════════════════════════════════════════════════════════
-- ВЕБХУКИ
-- ════════════════════════════════════════════════════════════
INSERT INTO webhooks (owner_id, url, events, secret, active, created_at) VALUES
(4, 'https://erp.mikhailov-logistics.by/webhook/mt', '["load.created","load.status_changed","load.delivered"]', 'whsec_mikh2024abcdef', 1, DATE_SUB(NOW(),INTERVAL 60 DAY)),
(5, 'https://api.petrova-cargo.by/callbacks/mt',     '["load.created","claim.opened"]',                         'whsec_petr2024uvwxyz', 1, DATE_SUB(NOW(),INTERVAL 45 DAY)),
(1, 'https://monitor.mt-broker.by/events',           '["load.created","load.status_changed","user.verified","claim.opened","incident.created"]', 'whsec_admin2024monitor', 1, DATE_SUB(NOW(),INTERVAL 90 DAY));

-- ════════════════════════════════════════════════════════════
-- КООРДИНАТЫ ОТПРАВЛЕНИЯ для заказов без координат
-- (необходимо для модуля автоназначения водителя — формула гаверсинуса)
-- ════════════════════════════════════════════════════════════
UPDATE loads SET origin_lat=53.9045, origin_lng=27.5615 WHERE origin_city='Минск'   AND origin_lat IS NULL;
UPDATE loads SET origin_lat=52.0975, origin_lng=23.7341 WHERE origin_city='Брест'    AND origin_lat IS NULL;
UPDATE loads SET origin_lat=53.6778, origin_lng=23.8298 WHERE origin_city='Гродно'   AND origin_lat IS NULL;
UPDATE loads SET origin_lat=53.9006, origin_lng=30.3314 WHERE origin_city='Могилёв'  AND origin_lat IS NULL;
UPDATE loads SET origin_lat=52.4345, origin_lng=30.9754 WHERE origin_city='Гомель'   AND origin_lat IS NULL;
UPDATE loads SET origin_lat=55.1904, origin_lng=30.2049 WHERE origin_city='Витебск'  AND origin_lat IS NULL;

-- ════════════════════════════════════════════════════════════
-- КЛИЕНТСКИЙ АККАУНТ (для демонстрации клиентского портала)
-- email: client@mt.by / пароль: demo1234
-- ════════════════════════════════════════════════════════════
INSERT INTO Users (name,email,phone,password_hash,role,verified,balance,avatar_color,location,availability,specialization)
VALUES ('ООО «ЕвроТрейд»','client@mt.by','+375171000099',@pwd,'client',1,0.00,'#0d9488','Минск','available','Клиент-грузовладелец');
-- привязываем несколько заказов к этому отправителю (портал фильтрует по shipper_name)
UPDATE loads SET shipper_name='ООО «ЕвроТрейд»' WHERE id IN (26,30,35);

-- ════════════════════════════════════════════════════════════
-- ИТОГОВЫЙ ОТЧЁТ
-- ════════════════════════════════════════════════════════════
SELECT CONCAT('✅ Пользователей: ',      COUNT(*)) AS result FROM Users
UNION ALL SELECT CONCAT('✅ Заказов: ',         COUNT(*)) FROM loads
UNION ALL SELECT CONCAT('✅ ТС заказов: ',      COUNT(*)) FROM load_vehicles
UNION ALL SELECT CONCAT('✅ ТС водителей: ',    COUNT(*)) FROM user_vehicles
UNION ALL SELECT CONCAT('✅ GPS-пингов: ',      COUNT(*)) FROM GPS_Logs
UNION ALL SELECT CONCAT('✅ Сообщений: ',       COUNT(*)) FROM Messages
UNION ALL SELECT CONCAT('✅ Отзывов: ',         COUNT(*)) FROM reviews
UNION ALL SELECT CONCAT('✅ Контактов: ',       COUNT(*)) FROM contacts
UNION ALL SELECT CONCAT('✅ Претензий: ',       COUNT(*)) FROM claims
UNION ALL SELECT CONCAT('✅ Инцидентов: ',      COUNT(*)) FROM incidents
UNION ALL SELECT CONCAT('✅ Документов: ',      COUNT(*)) FROM carrier_documents
UNION ALL SELECT CONCAT('✅ Расчётов ставок: ', COUNT(*)) FROM rate_quotes
UNION ALL SELECT CONCAT('✅ Уведомлений: ',     COUNT(*)) FROM notifications
UNION ALL SELECT CONCAT('✅ Записей аудита: ',  COUNT(*)) FROM audit_logs
UNION ALL SELECT CONCAT('✅ Вебхуков: ',        COUNT(*)) FROM webhooks;
