/**
 * MT Broker — Подключение к MySQL
 * Connection pool: mysql2/promise
 *
 * Поддерживаются несколько способов конфигурации (по приоритету):
 *   1. DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME       (собственные переменные)
 *   2. MYSQLHOST / MYSQLPORT / MYSQLUSER / MYSQLPASSWORD / MYSQLDATABASE  (нативные переменные Railway)
 *   3. MYSQL_URL / DATABASE_URL / MYSQL_PUBLIC_URL                (строка подключения mysql://user:pass@host:port/db)
 *
 * Благодаря этому на Railway достаточно сослаться на переменные сервиса MySQL —
 * приложение само разберётся, что использовать.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// ── Разбор строки подключения (mysql://user:pass@host:port/db), если задана ──────
function parseUrl() {
  const raw = process.env.MYSQL_URL || process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL;
  if (!raw) return {};
  try {
    const u = new URL(raw);
    return {
      host:     decodeURIComponent(u.hostname),
      port:     u.port ? Number(u.port) : undefined,
      user:     decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname ? u.pathname.replace(/^\//, '') : undefined,
    };
  } catch {
    console.warn('⚠️ Не удалось разобрать строку подключения к БД (MYSQL_URL/DATABASE_URL)');
    return {};
  }
}

const fromUrl = parseUrl();

const config = {
  host:     process.env.DB_HOST     || process.env.MYSQLHOST     || fromUrl.host     || 'localhost',
  port:     Number(process.env.DB_PORT || process.env.MYSQLPORT || fromUrl.port || 3306),
  user:     process.env.DB_USER     || process.env.MYSQLUSER     || fromUrl.user     || 'mt_user',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || fromUrl.password || 'MT_Broker2024!',
  database: process.env.DB_NAME     || process.env.MYSQLDATABASE || fromUrl.database || 'mt_broker',
};

const pool = mysql.createPool({
  ...config,

  // Параметры пула соединений
  waitForConnections: true,   // ждать свободного соединения вместо ошибки
  connectionLimit:    10,     // максимум параллельных соединений
  queueLimit:         0,      // 0 = безлимитная очередь ожидания
  enableKeepAlive:    true,   // предотвращает разрыв idle-соединений
  keepAliveInitialDelay: 10000, // 10 сек до первого keep-alive пакета

  // Строгий режим: предотвращает молчаливое усечение данных
  timezone: '+00:00',
  charset:  'utf8mb4',
});

// Экспортируем конфиг — нужен для авто-инициализации (bootstrap)
pool.config_resolved = config;

// Проверка соединения при старте
pool.getConnection()
  .then((conn) => {
    console.log(`✅ MySQL подключён успешно (${config.user}@${config.host}:${config.port}/${config.database})`);
    conn.release();
  })
  .catch((err) => {
    console.warn('⚠️ MySQL недоступен при старте:', err.message);
    console.warn('   Сервер продолжит работу — повторная попытка при первом запросе');
  });

module.exports = pool;
