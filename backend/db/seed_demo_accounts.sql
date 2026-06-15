-- ═══════════════════════════════════════════════════════════════════════════
-- MT Broker — Демо-аккаунты для презентации
-- 5 аккаунтов: admin · dispatcher · broker · driver · driver3
-- Богатая переписка, уведомления, история действий
-- ═══════════════════════════════════════════════════════════════════════════

-- USE mt_broker;  -- (раскомментируйте только при локальном запуске)
SET NAMES utf8mb4;

-- ════════════════════════════════════════════════════════════
-- ДОПОЛНИТЕЛЬНЫЕ СООБЩЕНИЯ
-- id: 1=admin 2=Anna(disp) 3=Dmitry(disp) 4=Sergei(broker)
--     5=Olga(broker) 6=carrier1 7=carrier2
--     8=Ivan(driver) 9=Alexei(driver) 10=Nikolai(driver) 11=Roman(driver)
-- ════════════════════════════════════════════════════════════

INSERT INTO messages (sender_id, receiver_id, order_id, text, type, is_read, created_at) VALUES

-- ── 1. БРОКЕР СЕРГЕЙ (4) ↔ ДИСПЕТЧЕР АННА (2) — деловое общение ──────────────
(4, 2, NULL, 'Анна, добрый день! Есть срочная потребность — Минск→Гданьск, 21т тент, отправка 10 июня. Можете выставить заказ и сразу поискать водителя?', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 9 HOUR)),
(2, 4, NULL, 'Здравствуйте, Сергей! Да, создала заказ #26. Сейчас прорабатываю кандидатов. Из свободных — Зайцев и Козлов, оба подходят по типу ТС.', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 9 HOUR), INTERVAL 15 MINUTE)),
(4, 2, NULL, 'Отлично. Предпочту Зайцева — он уже возил на этот адрес, знает получателя. Ставка 2700 на руки.', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 9 HOUR), INTERVAL 30 MINUTE)),
(2, 4, NULL, 'Поняла, свяжусь с Николаем как только он разгрузится в Варшаве. Ориентировочно послезавтра.', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 9 HOUR), INTERVAL 40 MINUTE)),
(4, 2, NULL, 'Договорились. Ещё вопрос — по заказу #16 (Витебск-Берлин) клиент тянет с оплатой уже 8 дней. Можете уточнить статус?', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 10 HOUR)),
(2, 4, NULL, 'Да, вижу. Сегодня уже написала клиенту, обещал перевести до конца рабочего дня. Если не поступит — переводим в претензию.', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 10 HOUR), INTERVAL 20 MINUTE)),
(4, 2, NULL, 'Хорошо, жду. И по заказу #35 (Минск-Берлин) — Петров готов взять, я с ним уже переговорил. Можете оформить назначение?', 'text', 1, DATE_SUB(NOW(), INTERVAL 22 HOUR)),
(2, 4, NULL, 'Конечно, оформлю сегодня. Погрузка 8 июня в 08:00, всё верно?', 'text', 0, DATE_SUB(NOW(), INTERVAL 21 HOUR)),
(4, 2, NULL, 'Да, 8 июня в 08:00 на ул. Маяковского, 115. Контакт на складе — Роберт, +375291000130. Грузчики будут.', 'text', 0, DATE_SUB(NOW(), INTERVAL 20 HOUR)),

-- ── 2. ДИСПЕТЧЕР АННА (2) ↔ ВОДИТЕЛЬ НИКОЛАЙ (10) — рейс #18 Варшава ─────────
(2, 10, 18, 'Николай, добрый день! Назначен заказ #18. Погрузка сегодня в 14:00, ул. пр. Победителей, 84. Вес 20т, тент, ТТН и CMR в пакете с заказом.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 6 DAY), INTERVAL 2 HOUR)),
(10, 2, 18, 'Принял, буду вовремя. Какой получатель в Варшаве, куда конкретно везти?', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 6 DAY), INTERVAL 2 HOUR), INTERVAL 10 MINUTE)),
(2, 10, 18, 'Zbigniew Wróbel, ul. Złota, 59. Телефон: +48605000001. Разгрузка с 08:00 до 16:00, крытый склад. Нужен обратный звонок перед въездом.', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 6 DAY), INTERVAL 2 HOUR), INTERVAL 20 MINUTE)),
(10, 2, 18, 'Понял, записал. Сейчас еду на погрузку.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 6 DAY), INTERVAL 1 HOUR)),
(10, 2, 18, 'Загрузился. Вес по факту 19,8т — всё в норме. Документы все получил. Выезжаю.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 23 HOUR)),
(2, 10, 18, 'Хорошо! На погранпереходе Тересполь рекомендую брать в очередь с вечера — утром меньше грузовиков. Польская сторона обычно быстрее работает.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 20 HOUR)),
(10, 2, 18, 'Спасибо за совет. Ночью доехал до Бреста, остановился на ночлег. Граница утром.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 5 HOUR)),
(10, 2, 18, 'Стою в очереди на Тересполе. Примерно 2 часа. Всё в порядке, документы проверили, замечаний нет.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 8 HOUR)),
(2, 10, 18, 'Принято. Как пройдёшь — напиши. И уточни у польского таможенника про SENT — иногда просят заново активировать.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 7 HOUR)),
(10, 2, 18, 'Пропустили без SENT, груз не подакцизный. Уже на польской стороне, еду по E30.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 4 HOUR)),
(10, 2, 18, 'Ночевал на стоянке под Варшавой. Сейчас въезжаю в город. Пробки умеренные.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 7 HOUR)),
(2, 10, 18, 'Отлично! Получатель предупреждён. Напиши как разгрузишься — нужны фото CMR с подписью.', 'text', 0, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 6 HOUR)),

-- ── 3. ДИСПЕТЧЕР ДМИТРИЙ (3) ↔ ВОДИТЕЛЬ ИВАН (8) — рейс #19 Берлин ──────────
(3, 8, 19, 'Иван, хорошего утра! Заказ #19 подтверждён. Погрузка сегодня 14:30 в Бресте, Московская 290. Вес 24т, тент, фура должна быть чистой.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 3 HOUR)),
(8, 3, 19, 'Понял, уже в пути к Бресту. Буду к 14:00. Насчёт чистоты фуры — всё ок, только что с мойки.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 2 HOUR)),
(3, 8, 19, 'Отлично! Не забудь — на этот рейс нужна книжка МДП (TIR). Она у тебя актуальная?', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 1 HOUR)),
(8, 3, 19, 'Да, TIR актуальная, срок до ноября. Взял с собой.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 50 MINUTE)),
(3, 8, 19, 'Добро. В Берлине выгрузка у Potsdamer Platz, 1. Контакт: Günter +4930200001. Звони за час до прибытия.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 22 HOUR)),
(8, 3, 19, 'Принял. Загрузился, CMR подписана. Вес точно 24т. Выехал из Бреста в 15:10.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 20 HOUR)),
(8, 3, 19, 'На польской таможне 2 часа стоял — усиленный досмотр. Всё прошло нормально, едем дальше.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 4 HOUR)),
(3, 8, 19, 'Нормально, не переживай. Главное документы проверили — без проблем.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 3 HOUR)),
(8, 3, 19, 'Ночую на стоянке под Познанью. Завтра с утра в Берлин.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 18 HOUR)),
(3, 8, 19, 'Хорошего отдыха. Немецкий получатель очень пунктуальный — постарайся точно в окно выгрузки.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 17 HOUR)),
(8, 3, 19, 'Въезжаю в Берлин. Позвонил получателю, он ждёт. Пробок почти нет.', 'text', 0, DATE_SUB(NOW(), INTERVAL 3 HOUR)),

-- ── 4. БРОКЕР СЕРГЕЙ (4) ↔ ВОДИТЕЛЬ ИВАН (8) — заказ #24 Краков ─────────────
(4, 8, 24, 'Иван, добрый день! После Берлина есть рейс Гродно→Краков, 12т рефриж, ставка 2900 BYN. Погрузка 8 июня. Интересует?', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 11 HOUR)),
(8, 4, 24, 'Сергей, здравствуйте! Да, после Берлина как раз буду свободен 7-го вечером. Рефриж у меня есть — Actros 1845, рабочий.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 10 HOUR)),
(4, 8, 24, 'Отлично! Груз — продукты питания +2/+4°C. Нужна санитарная книжка на ТС — она у вас действующая?', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 10 HOUR), INTERVAL 15 MINUTE)),
(8, 4, 24, 'Да, всё в порядке, санкнижка до марта 2027. Отправлю скан если нужно.', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 9 HOUR), INTERVAL 45 MINUTE)),
(4, 8, 24, 'Пришлите на почту broker@mt.by, добавлю в дело. Диспетчер Анна оформит заказ официально — она вам напишет с деталями.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 9 HOUR)),
(8, 4, 24, 'Понял, отправил скан. Жду подтверждения от диспетчера.', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 8 HOUR), INTERVAL 30 MINUTE)),
(4, 8, 24, 'Всё получил. Рейс ваш — удачи в Берлине, и до встречи 8-го!', 'text', 0, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 8 HOUR)),

-- ── 5. БРОКЕР СЕРГЕЙ (4) ↔ ПЕРЕВОЗЧИК ООО АВТОЛОГИСТ (6) ─────────────────────
(4, 6, NULL, 'Добрый день! Сергей Михайлов, MT Broker. У нас сейчас постоянный поток Беларусь→Польша/Германия. Готовы обсудить рамочный договор на июль?', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 10 DAY), INTERVAL 10 HOUR)),
(6, 4, NULL, 'Здравствуйте! Да, интересно. У нас сейчас 4 единицы тент 82м³ и 2 рефрижератора. Куда чаще всего возим?', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 10 DAY), INTERVAL 9 HOUR)),
(4, 6, NULL, 'Основные направления: Минск-Варшава, Минск-Берлин, Брест-Варшава. По 3-5 рейсов в неделю. Ставки выше рынка на 8-12% за гарантию регулярности.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 10 DAY), INTERVAL 8 HOUR)),
(6, 4, NULL, 'Звучит хорошо. Пришлите типовой договор, передам юристам. По тентам у нас 3 машины в хорошем состоянии 2021-2022 г.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 9 DAY), INTERVAL 15 HOUR)),
(4, 6, NULL, 'Договор отправил на carrier@mt.by. Основное условие — подача за 24 часа, наш диспетчер всегда на связи.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 9 DAY), INTERVAL 14 HOUR)),
(6, 4, NULL, 'Получили, изучим. Один вопрос — как с оплатой? Нам важно не более 10 дней после ТТН.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 9 DAY), INTERVAL 10 HOUR)),
(4, 6, NULL, 'Стандарт у нас 7 рабочих дней после оригиналов. Возможен аванс 30% при долгосрочном договоре.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 8 DAY), INTERVAL 16 HOUR)),
(6, 4, NULL, 'Отлично, это подходит. Со следующей недели готовы начинать. Пришлите список доступных заказов на ближайшие 2 недели.', 'text', 0, DATE_SUB(DATE_SUB(NOW(), INTERVAL 8 DAY), INTERVAL 9 HOUR)),

-- ── 6. АДМИНИСТРАТОР (1) ↔ ДИСПЕТЧЕР АННА (2) — рабочие вопросы ─────────────
(1, 2, NULL, 'Анна, добрый день! Напоминание: техпаспорт на ТС водителя Зайцева (МК-6) истекает в сентябре. Пожалуйста, уточните у него и проконтролируйте продление.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 8 DAY), INTERVAL 9 HOUR)),
(2, 1, NULL, 'Поняла, уже написала Николаю. Он говорит, что запись на техосмотр на 15 июля. Я поставлю напоминалку.', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 8 DAY), INTERVAL 8 HOUR), INTERVAL 30 MINUTE)),
(1, 2, NULL, 'Хорошо. Ещё: водителю Сидорову нужно обновить медсправку — в феврале следующего года истекает, советую сделать заранее.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 7 DAY), INTERVAL 10 HOUR)),
(2, 1, NULL, 'Учту. Алексей сказал, что пойдёт в медкомиссию в конце июня — заодно и для нового ADR-свидетельства.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 7 DAY), INTERVAL 9 HOUR)),
(1, 2, NULL, 'Отлично. Ещё вопрос по системе: можете проверить у брокера Петровой — у неё в профиле не заполнен dispatch_fee. Нужно для каталога.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 6 DAY), INTERVAL 9 HOUR)),
(2, 1, NULL, 'Спрошу у Ольги сегодня. Кстати, поступил запрос от нового перевозчика ИП Лукьянов — просит добавить в систему. Можете создать аккаунт?', 'text', 0, DATE_SUB(DATE_SUB(NOW(), INTERVAL 6 DAY), INTERVAL 8 HOUR)),
(1, 2, NULL, 'Пусть пришлёт документы на admin@mt.by — скан паспорта, свидетельство ИП и CMR-страховку. После проверки создам.', 'text', 0, DATE_SUB(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 16 HOUR)),

-- ── 7. ВОДИТЕЛЬ НИКОЛАЙ (10) ↔ ДИСПЕТЧЕР ДМИТРИЙ (3) — заказ #22 Берлин ─────
(3, 10, 22, 'Николай, привет! Как разгрузишься в Варшаве — есть отличный рейс: Минск→Берлин, 22т тент, погрузка 6 июня. Ставка 3200 BYN. Берёшь?', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 14 HOUR)),
(10, 3, 22, 'Дмитрий, здорово! Да, беру. Разгружусь 4-го, успею вернуться к 6-му утру.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 13 HOUR)),
(3, 10, 22, 'Отлично! Заказ #22 оформил на тебя. Погрузка 6 июня в 08:00, ул. Немига, 5. Контакт: Вадим, +375291000070.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 12 HOUR)),
(10, 3, 22, 'Принял. Выгрузка в Берлине на какой адрес?', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 11 HOUR), INTERVAL 30 MINUTE)),
(3, 10, 22, 'Friedrichstraße, 100. Контакт Stefan Weber +4930300001. Окно выгрузки 10-12 июня, желательно 10-го с утра.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 11 HOUR)),
(10, 3, 22, 'ОК, постараюсь к 10-му. Кстати, на обратном пути можете подобрать груз из Берлина? Незагруженным гнать невыгодно.', 'text', 0, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 10 HOUR)),
(3, 10, 22, 'Буду искать! Есть варианты по биржам, напишу как найду что-то подходящее.', 'text', 0, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 20 HOUR)),

-- ── 8. БРОКЕР ОЛЬГА (5) ↔ ДИСПЕТЧЕР ДМИТРИЙ (3) — заказ #25 ──────────────────
(5, 3, 25, 'Дмитрий, добрый день! По заказу #25 (Витебск-Рига) — клиент просит доставку не позже 11 июня. Успеем?', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 15 HOUR)),
(3, 5, 25, 'Здравствуйте, Ольга! Сидоров выезжает 8-го, ~3 дня в пути. 11-го будет точно. Волноваться не стоит.', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 14 HOUR), INTERVAL 30 MINUTE)),
(5, 3, 25, 'Отлично, спасибо! Клиент хочет уведомление как только водитель пересечёт латвийскую границу. Можете дать ему трекинг-ссылку?', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 14 HOUR)),
(3, 5, 25, 'Конечно, клиент может отслеживать в нашей системе. Дайте ему ссылку на портал с кодом заказа #25.', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 13 HOUR), INTERVAL 30 MINUTE)),
(5, 3, 25, 'Поняла, передам. Ещё вопрос — по заказам на следующую неделю: нужны 2 рефрижератора Брест→Варшава. Есть свободные водители?', 'text', 0, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 12 HOUR)),
(3, 5, 25, 'Козлов освобождается 5-го, Сидоров — 12-го. Могу запланировать Козлова на первый рейс. По второму поищем варианты через биржу.', 'text', 0, DATE_SUB(NOW(), INTERVAL 23 HOUR)),

-- ── 9. ВОДИТЕЛЬ ИВАН (8) ↔ ВОДИТЕЛЬ НИКОЛАЙ (10) — дорожный чат ──────────────
(8, 10, NULL, 'Коля, привет! Ты же сейчас в Польше? Как дорога, нормально?', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 5 HOUR)),
(10, 8, NULL, 'Привет! Да, под Варшавой уже. Дорога хорошая, только под Тересполем стоял 2 часа. Ты куда?', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 4 HOUR), INTERVAL 30 MINUTE)),
(8, 10, NULL, 'Я в Берлин — рейс #19. Сейчас в Польше, где-то под Познанью. Кстати, на А2 у Свебодзина ремонт — лучше объехать через Зеленую Гуру.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 4 HOUR)),
(10, 8, NULL, 'Спасибо за наводку! Я уже мимо проехал, но запомню. Там вообще на А2 часто так. Удачи в Берлине!', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 3 HOUR), INTERVAL 30 MINUTE)),
(8, 10, NULL, 'Спасибо! Вернёмся — надо встретиться, давно не виделись. Может 10-го в Минске?', 'text', 0, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 3 HOUR)),
(10, 8, NULL, 'Договорились, я как раз 10-го буду свободен. Звони!', 'text', 0, DATE_SUB(DATE_SUB(NOW(), INTERVAL 23 HOUR), INTERVAL 30 MINUTE)),

-- ── 10. БРОКЕР ОЛЬГА (5) ↔ ВОДИТЕЛЬ АЛЕКСЕЙ (9) — рейс #21 Рига ──────────────
(5, 9, 21, 'Алексей, добрый день! Я Ольга Петрова, брокер MT. Это мой заказ #21. Как обстановка на маршруте?', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 12 HOUR)),
(9, 5, 21, 'Добрый день, Ольга! Всё хорошо, уже пересёк белорусско-латвийскую границу в Силене. Таможня прошла быстро.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 11 HOUR)),
(5, 9, 21, 'Отлично! Клиент в Риге очень ждёт металл — они под заказ работают. Постарайтесь успеть к 10:00 5-го.', 'text', 1, DATE_SUB(DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 10 HOUR), INTERVAL 30 MINUTE)),
(9, 5, 21, 'Понял, буду стараться. Сейчас еду по трассе A6 к Риге. Должен успеть к утру 5-го.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 10 HOUR)),
(5, 9, 21, 'Хорошо. Контакт на складе: Индулис Калниньш, +37123000001. Разгрузка только с боковой рампы — важно.', 'text', 1, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 18 HOUR)),
(9, 5, 21, 'Принял. Подъезжаю к Риге, позвоню получателю через 30 минут. Спасибо за информацию!', 'text', 0, DATE_SUB(NOW(), INTERVAL 4 HOUR));

-- ════════════════════════════════════════════════════════════
-- ДОПОЛНИТЕЛЬНЫЕ УВЕДОМЛЕНИЯ ДЛЯ 5 АККАУНТОВ
-- ════════════════════════════════════════════════════════════
INSERT INTO notifications (user_id, type, title, message, is_read, entity_type, entity_id, created_at) VALUES

-- Для ADMIN (1)
(1, 'info',    'Новый перевозчик',       'ООО «АвтоЛогист» запросил рамочный договор. Проверьте документы в разделе верификации.', 0, 'user', 6, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(1, 'warning', 'Техпаспорт истекает',    'ТС водителя Зайцева Н. (МК-6, MAN TGX): техпаспорт истекает 10.09.2026. Осталось 3 месяца.', 0, 'carrier_document', 11, DATE_SUB(NOW(), INTERVAL 6 DAY)),
(1, 'warning', 'Документ ИП Захарова',   'Техпаспорт ИП Захарова: истекает 20.11.2026. Перевозчик уведомлён.', 0, 'carrier_document', 19, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(1, 'error',   'Претензия не закрыта',   'Претензия #1 по заказу #33 (повреждение груза) 18 дней без ответа водителя Петрова.', 0, 'claim', 1, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 'success', 'Верификация завершена',  'Водитель Сидоров А.: ADR-свидетельство проверено и подтверждено. Допуск к перевозкам кл.2,3,6.', 1, 'carrier_document', 7, DATE_SUB(NOW(), INTERVAL 18 DAY)),
(1, 'info',    'Активных рейсов: 4',     'Сейчас в пути: Петров (Берлин), Зайцев (Варшава), Козлов (Вильнюс), Сидоров (Рига).', 1, 'load', NULL, DATE_SUB(NOW(), INTERVAL 3 HOUR)),

-- Для DISPATCHER Anna (2)
(2, 'info',    'Сообщение от брокера',   'Сергей Михайлов: уточните статус оплаты по заказу #16. Клиент задерживает 8 дней.', 0, 'load', 16, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 10 HOUR)),
(2, 'warning', 'Водитель задержался',    'Зайцев Н.: сообщил о пробке у Варшавы. Задержка ~30 мин. Получатель уведомлён автоматически.', 0, 'load', 18, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 'success', 'Документы проверены',    'Петров И.: все документы на рейс #24 (Гродно→Краков) в порядке. Санкнижка действительна.', 1, 'load', 24, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'info',    'Новый заказ от брокера', 'Михайлов С. создал заказ #35 (Минск→Берлин, 24т). Назначьте водителя Петрова И.', 0, 'load', 35, DATE_SUB(NOW(), INTERVAL 22 HOUR)),
(2, 'info',    'Запрос на обратный груз','Зайцев Н. просит подобрать попутный груз из Варшавы домой. Просмотрите биржу.', 0, 'load', NULL, DATE_SUB(NOW(), INTERVAL 20 HOUR)),

-- Для BROKER Sergei (4)
(4, 'info',    'Водитель подтвердил',    'Иван Петров принял заказ #24 (Гродно→Краков). Санкнижка отправлена, всё готово.', 1, 'load', 24, DATE_SUB(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 8 HOUR)),
(4, 'warning', 'Задержка по заказу #18', 'Зайцев Н. сообщает о пробке у Варшавы ~30 мин. Срок доставки 4 июня до 16:00 под угрозой.', 0, 'load', 18, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 HOUR), INTERVAL 30 MINUTE)),
(4, 'info',    'Договор рассматривается','ООО «АвтоЛогист» изучает рамочный договор. Ожидайте ответ в течение 2-3 дней.', 1, 'load', NULL, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(4, 'error',   'Долг по заказу #16',     'Клиент по заказу #16 (Витебск→Берлин) не оплатил уже 8 дней. Диспетчер направил напоминание.', 0, 'load', 16, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 'success', 'Претензия #3 принята',   'Претензия Сидорова А. по неоплате рейса #17 принята. Оплата будет переведена в течение 48 ч.', 1, 'claim', 3, DATE_SUB(NOW(), INTERVAL 3 DAY)),

-- Для DRIVER Ivan (8)
(8, 'success', 'Оплата за рейс #5',      'Зачислено 2100 BYN за рейс Минск→Гданьск (#5). Баланс обновлён.', 1, 'load', 5, DATE_SUB(NOW(), INTERVAL 35 DAY)),
(8, 'info',    'Заказ #24 подтверждён',  'Брокер Михайлов С. подтвердил ваш рейс #24 (Гродно→Краков). Санкнижка принята.', 1, 'load', 24, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(8, 'info',    'Погода в Германии',       'Предупреждение: по данным DWD, на трассе A2 (Германия) сегодня порывы ветра до 70 км/ч.', 1, 'load', 19, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 6 HOUR)),
(8, 'warning', 'Ожидание на разгрузке',  'Получатель Günter Fischer просит звонок за 1 час до Берлина — у них окно разгрузки строго.', 0, 'load', 19, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(8, 'success', 'Оплата за рейс #16',     'Зачислено 3700 BYN за рейс Витебск→Берлин (#16). Баланс: 3400 BYN.', 1, 'load', 16, DATE_SUB(NOW(), INTERVAL 7 DAY)),

-- Для DRIVER Nikolai (10)
(10,'info',    'Обратный груз найден',   'Диспетчер Лукашев Д. ищет попутный груз Варшава→Минск на 5-6 июня. Детали скоро.', 0, 'load', NULL, DATE_SUB(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 20 HOUR)),
(10,'success', 'Заказ #22 подтверждён',  'Берлинский рейс #22 оформлен. Погрузка 6 июня, 08:00, ул. Немига 5. Ставка 3200 BYN.', 1, 'load', 22, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(10,'info',    'Скоро разгрузка',        'Получатель в Варшаве ждёт ваш звонок. Zbigniew Wróbel +48605000001. Разгрузка до 16:00.', 0, 'load', 18, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(10,'warning', 'Задержка зафиксирована', 'Ваша задержка 30 мин у Варшавы зафиксирована в системе. Получатель предупреждён.', 0, 'load', 18, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(10,'success', 'Оплата за рейс #7',      'Зачислено 2350 BYN за рейс Могилёв→Таллин (#7). Итого на счету: 1950 BYN.', 1, 'load', 7, DATE_SUB(NOW(), INTERVAL 23 DAY));

-- ════════════════════════════════════════════════════════════
-- АУДИТ-ЗАПИСИ ДЛЯ 5 АККАУНТОВ
-- ════════════════════════════════════════════════════════════
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data, ip_address, created_at) VALUES
(1, 'login',   'session', NULL, '{"role":"admin","ip":"192.168.1.1"}',                                           '192.168.1.1',  DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 'login',   'session', NULL, '{"role":"dispatcher","ip":"192.168.1.10"}',                                     '192.168.1.10', DATE_SUB(NOW(), INTERVAL 8 HOUR)),
(2, 'update',  'load',    26,   '{"action":"assigned_driver","driver_id":10,"note":"Назначен после разгрузки в Варшаве"}', '192.168.1.10', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 'login',   'session', NULL, '{"role":"broker","ip":"192.168.1.20"}',                                         '192.168.1.20', DATE_SUB(NOW(), INTERVAL 9 HOUR)),
(4, 'create',  'rate_quote', 11,'{"origin":"Могилёв","dest":"Варшава","rate":2800,"currency":"BYN"}',           '192.168.1.20', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(8, 'login',   'session', NULL, '{"role":"driver","ip":"10.0.0.5"}',                                             '10.0.0.5',     DATE_SUB(NOW(), INTERVAL 10 HOUR)),
(8, 'update',  'load',    19,   '{"status":"Забран","gps_lat":52.0975,"gps_lng":23.7341}',                       '10.0.0.5',     DATE_SUB(NOW(), INTERVAL 4 DAY)),
(10,'login',   'session', NULL, '{"role":"driver","ip":"10.0.0.8"}',                                             '10.0.0.8',     DATE_SUB(NOW(), INTERVAL 8 HOUR)),
(10,'update',  'load',    18,   '{"status":"Забран","gps_lat":53.9045,"gps_lng":27.5615}',                       '10.0.0.8',     DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 'update',  'load',    20,   '{"delay_minutes":45,"reason":"ДТП на МКАД"}',                                   '192.168.1.10', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 'verify',  'carrier_document', 5, '{"doc_type":"license","user_id":9,"status":"verified"}',                  '192.168.1.1',  DATE_SUB(NOW(), INTERVAL 28 DAY)),
(1, 'verify',  'carrier_document', 7, '{"doc_type":"adr","user_id":9,"status":"verified"}',                      '192.168.1.1',  DATE_SUB(NOW(), INTERVAL 18 DAY));

-- ════════════════════════════════════════════════════════════
-- ИТОГ ПО 5 АККАУНТАМ
-- ════════════════════════════════════════════════════════════
SELECT '─────────── АККАУНТЫ ДЛЯ ДЕМОНСТРАЦИИ ───────────' AS info
UNION ALL SELECT CONCAT('1. admin@mt.by       | пароль: demo1234 | Администратор')
UNION ALL SELECT CONCAT('2. dispatcher@mt.by  | пароль: demo1234 | Диспетчер Анна Ковалева')
UNION ALL SELECT CONCAT('3. broker@mt.by      | пароль: demo1234 | Брокер Сергей Михайлов')
UNION ALL SELECT CONCAT('4. driver@mt.by      | пароль: demo1234 | Водитель Иван Петров (Берлин)')
UNION ALL SELECT CONCAT('5. driver3@mt.by     | пароль: demo1234 | Водитель Николай Зайцев (Варшава)')
UNION ALL SELECT '──────────────────────────────────────────────────';

SELECT
  u.name,
  u.email,
  u.role,
  (SELECT COUNT(*) FROM messages WHERE sender_id=u.id OR receiver_id=u.id) AS сообщений,
  (SELECT COUNT(*) FROM notifications WHERE user_id=u.id) AS уведомлений,
  (SELECT COUNT(*) FROM notifications WHERE user_id=u.id AND is_read=0) AS непрочитано
FROM users u
WHERE u.email IN ('admin@mt.by','dispatcher@mt.by','broker@mt.by','driver@mt.by','driver3@mt.by')
ORDER BY FIELD(u.role,'admin','dispatcher','broker','driver');
