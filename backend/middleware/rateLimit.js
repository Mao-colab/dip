/**
 * NFR-05: Rate limiting — ограничение частоты запросов без внешних зависимостей.
 * Использует скользящее окно (sliding window) в памяти процесса.
 */

const windows = new Map(); // ip → { count, resetAt }

function rateLimit({ windowMs = 60_000, max = 100, message = 'Слишком много запросов. Повторите позже.' } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = windows.get(key);

    if (!entry || now > entry.resetAt) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({ error: message, retryAfter });
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - entry.count);
    next();
  };
}

// Очищаем старые записи каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows.entries()) {
    if (now > entry.resetAt) windows.delete(key);
  }
}, 5 * 60_000);

module.exports = rateLimit;
