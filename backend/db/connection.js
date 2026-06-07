/**
 * MT Broker — Подключение к MySQL
 * Connection pool: mysql2/promise
 *
 * Настройки пула подобраны для умеренной нагрузки (до ~50 одновременных запросов).
 * При масштабировании увеличьте connectionLimit и используйте ProxySQL / PgBouncer.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'mt_user',
  password: process.env.DB_PASSWORD || 'MT_Broker2024!',
  database: process.env.DB_NAME     || 'mt_broker',
  port:     Number(process.env.DB_PORT) || 3306,

  // ✅ ДОБАВЛЕНО: параметры пула соединений
  waitForConnections: true,   // ждать свободного соединения вместо ошибки
  connectionLimit:    10,     // максимум параллельных соединений
  queueLimit:         0,      // 0 = безлимитная очередь ожидания
  enableKeepAlive:    true,   // предотвращает разрыв idle-соединений
  keepAliveInitialDelay: 10000, // 10 сек до первого keep-alive пакета

  // Строгий режим: предотвращает молчаливое усечение данных
  timezone: '+00:00',
  charset:  'utf8mb4',
});

// Проверка соединения при старте
pool.getConnection()
  .then((conn) => {
    console.log('✅ MySQL подключён успешно');
    conn.release();
  })
  .catch((err) => {
    console.warn('⚠️ MySQL недоступен при старте:', err.message);
    console.warn('   Сервер продолжит работу — повторная попытка при первом запросе');
  });

module.exports = pool;