/**
 * MT Broker — Сброс базы к чистому демонстрационному состоянию.
 *
 * Запускает схему (init.sql) + полный демо-датасет (seed_demo.sql) +
 * демо-аккаунты (seed_demo_accounts.sql). Скрипты идемпотентны: данные
 * сначала очищаются (TRUNCATE), затем загружаются заново, а все даты
 * считаются относительно текущего момента — поэтому после запуска
 * демонстрация всегда выглядит «свежей».
 *
 * Использование:
 *   • Локально:   cd backend && npm run seed:demo
 *   • На Railway: railway run npm run seed:demo   (из каталога backend)
 *
 * Пароль всех демо-аккаунтов: demo1234
 */

const fs    = require('fs');
const path  = require('path');
const mysql = require('mysql2/promise');
const pool  = require('./connection');

const SQL_DIR = __dirname;
const readSql = file => fs.readFileSync(path.join(SQL_DIR, file), 'utf8');

async function run() {
  const cfg = pool.config_resolved || {};
  const conn = await mysql.createConnection({
    host:     cfg.host,
    port:     cfg.port,
    user:     cfg.user,
    password: cfg.password,
    database: cfg.database,
    multipleStatements: true,
    charset:  'utf8mb4',
  });

  try {
    console.log(`Подключение: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`);

    console.log('1/3 Схема (init.sql)...');
    await conn.query(readSql('init.sql'));

    console.log('2/3 Демо-данные (seed_demo.sql)...');
    await conn.query(readSql('seed_demo.sql'));

    console.log('3/3 Демо-аккаунты (seed_demo_accounts.sql)...');
    await conn.query(readSql('seed_demo_accounts.sql'));

    const [[{ users }]] = await conn.query('SELECT COUNT(*) AS users FROM users');
    const [[{ loads }]] = await conn.query('SELECT COUNT(*) AS loads FROM loads');
    const [[{ quotes }]] = await conn.query('SELECT COUNT(*) AS quotes FROM rate_quotes');
    console.log(`Готово: пользователей ${users}, заказов ${loads}, расчётов ставок ${quotes}`);
    console.log('Вход: admin@mt.by / dispatcher@mt.by / broker@mt.by / driver@mt.by — пароль demo1234');
  } finally {
    await conn.end().catch(() => {});
  }
}

run()
  .then(() => process.exit(0))
  .catch(err => { console.error('Ошибка сброса демо-БД:', err.message); process.exit(1); });
