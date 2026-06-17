/**
 * MT Broker — Авто-инициализация базы данных при старте сервера.
 *
 * Идея: чтобы развёртывание было максимально простым (например, на Railway),
 * приложение само создаёт схему и наполняет её демо-данными, если база пустая.
 *
 *   • Схема (init.sql) выполняется всегда — она идемпотентна (CREATE TABLE IF NOT EXISTS).
 *   • Демо-данные (seed_demo.sql + seed_demo_accounts.sql) — только если таблица
 *     users пуста, чтобы не затирать реальные данные при перезапусках.
 *
 * Управление через переменные окружения:
 *   • DB_AUTO_INIT=false  — полностью отключить авто-инициализацию.
 *   • DB_AUTO_SEED=false  — создавать схему, но НЕ наполнять демо-данными.
 */

const fs   = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const pool = require('./connection');

const SQL_DIR = __dirname;

function readSql(file) {
  return fs.readFileSync(path.join(SQL_DIR, file), 'utf8');
}

async function bootstrapDatabase() {
  if (String(process.env.DB_AUTO_INIT).toLowerCase() === 'false') {
    console.log('Авто-инициализация БД отключена (DB_AUTO_INIT=false)');
    return;
  }

  const cfg = pool.config_resolved || {};
  let conn;
  try {
    // Отдельное соединение с multipleStatements — pool их не разрешает из соображений безопасности
    conn = await mysql.createConnection({
      host:     cfg.host,
      port:     cfg.port,
      user:     cfg.user,
      password: cfg.password,
      database: cfg.database,
      multipleStatements: true,
      charset:  'utf8mb4',
    });
  } catch (err) {
    console.warn('⚠  Авто-инициализация пропущена — нет соединения с БД:', err.message);
    return;
  }

  try {
    // 1. Схема (идемпотентно)
    await conn.query(readSql('init.sql'));
    console.log('Схема БД проверена/создана');

    // 1a. Миграции для уже существующих БД (CREATE TABLE IF NOT EXISTS их не трогает)
    await runMigrations(conn);

    // 2. Демо-данные — только если база пустая
    if (String(process.env.DB_AUTO_SEED).toLowerCase() === 'false') {
      console.log('Наполнение демо-данными отключено (DB_AUTO_SEED=false)');
      return;
    }

    const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM users');
    if (cnt > 0) {
      console.log(`В БД уже есть пользователи (${cnt}) — демо-данные не загружаются`);
      return;
    }

    console.log('База пустая — загружаю демо-данные...');
    await conn.query(readSql('seed_demo.sql'));
    await conn.query(readSql('seed_demo_accounts.sql'));

    const [[{ users }]]   = await conn.query('SELECT COUNT(*) AS users FROM users');
    const [[{ loads }]]   = await conn.query('SELECT COUNT(*) AS loads FROM loads');
    console.log(`Демо-данные загружены: пользователей ${users}, заказов ${loads}`);
    console.log('   Вход: admin@mt.by / demo1234 (а также dispatcher@/broker@/driver@/driver3@)');
  } catch (err) {
    console.error('Ошибка авто-инициализации БД:', err.message);
    // Не роняем сервер — он сможет работать, если база будет готова вручную
  } finally {
    await conn.end().catch(() => {});
  }
}

/**
 * Идемпотентные миграции для уже созданных БД.
 * Выполняются на каждом старте, но реальные ALTER/UPDATE происходят
 * только если изменение ещё не применено (проверка по INFORMATION_SCHEMA).
 */
async function runMigrations(conn) {
  // Переименование статуса заказа «Клейм» → «Спор».
  // На существующей таблице ENUM не обновляется через init.sql, поэтому
  // правим его явно: сначала расширяем ENUM (оба значения), переносим данные,
  // затем убираем устаревшее «Клейм».
  const [[col]] = await conn.query(
    `SELECT COLUMN_TYPE AS type FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loads' AND COLUMN_NAME = 'status'`
  );

  if (col && col.type && col.type.includes('Клейм')) {
    console.log('Миграция: статус «Клейм» → «Спор»...');
    // Шаг 1: ENUM с обоими значениями — безопасно, без потери данных
    await conn.query(
      `ALTER TABLE loads MODIFY status
         ENUM('Новый','Назначен','Забран','Доставлен','В ожидании','Оплачен','Запрошен','Клейм','Спор','Архив','Удалён','delayed')
         NOT NULL DEFAULT 'Новый'`
    );
    // Шаг 2: перенос существующих заказов
    await conn.query(`UPDATE loads SET status = 'Спор' WHERE status = 'Клейм'`);
    // Шаг 3: убираем устаревшее значение из ENUM
    await conn.query(
      `ALTER TABLE loads MODIFY status
         ENUM('Новый','Назначен','Забран','Доставлен','В ожидании','Оплачен','Запрошен','Спор','Архив','Удалён','delayed')
         NOT NULL DEFAULT 'Новый'`
    );
    console.log('Миграция статуса завершена');
  }
}

module.exports = { bootstrapDatabase };
