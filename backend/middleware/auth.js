const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }
  const token = authHeader.split(' ')[1];

  // NFR-04: Проверяем blocklist аннулированных токенов
  try {
    const { tokenBlocklist } = require('../controllers/authController');
    if (tokenBlocklist.has(token)) {
      return res.status(401).json({ error: 'Сессия завершена. Войдите снова.' });
    }
  } catch {}

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user && req.user.role)) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }
  next();
};
