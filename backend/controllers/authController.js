const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../db/connection');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// NFR-04: In-memory blocklist для аннулированных токенов
const tokenBlocklist = new Set();

// Очистка устаревших токенов раз в час
setInterval(() => {
  for (const token of tokenBlocklist) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      tokenBlocklist.delete(token); // токен уже истёк — удаляем из списка
    }
  }
}, 60 * 60_000);

function isValidRole(role) {
  return ['admin', 'dispatcher', 'broker', 'carrier', 'driver', 'client'].includes(role);
}

function makeJwtPayload(user) {
  return { id: user.id, role: user.role, name: user.name };
}

exports.tokenBlocklist = tokenBlocklist;

// POST /api/v1/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2)
      return res.status(400).json({ error: 'Некорректное имя' });
    if (!email || typeof email !== 'string' || email.trim().length < 3)
      return res.status(400).json({ error: 'Некорректный email' });
    if (!password || typeof password !== 'string' || password.length < 4)
      return res.status(400).json({ error: 'Пароль должен быть минимум 4 символа' });

    const safeRole = role && typeof role === 'string' ? role : 'driver';
    if (!isValidRole(safeRole))
      return res.status(400).json({ error: 'Некорректная роль' });

    const passwordHash = bcrypt.hashSync(password, 10);

    const [result] = await db.execute(
      `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), phone || null, passwordHash, safeRole]
    );

    const [[user]] = await db.execute(
      `SELECT id, name, email, phone, role FROM users WHERE id = ?`,
      [result.insertId]
    );

    const token = jwt.sign(makeJwtPayload(user), process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.status(201).json({ token, user: makeJwtPayload(user) });
  } catch (err) {
    if (String(err?.message || '').includes('Duplicate entry'))
      return res.status(409).json({ error: 'Email уже используется' });
    console.error('[Auth Register Error]', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// POST /api/v1/auth/login
exports.login = async (req, res) => {
  try {
    const { login, email, phone, password } = req.body;

    if (!password || typeof password !== 'string')
      return res.status(400).json({ error: 'Пароль обязателен' });

    const identifier = login || email || phone;
    if (!identifier)
      return res.status(400).json({ error: 'Укажите логин, email или телефон' });

    const [rows] = await db.execute(
      `SELECT id, name, email, phone, password_hash, role
       FROM users
       WHERE name = ? OR email = ? OR phone = ?
       LIMIT 1`,
      [identifier, identifier.toLowerCase(), identifier]
    );

    const user = rows?.[0];
    if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Неверный логин или пароль' });

    const token = jwt.sign(makeJwtPayload(user), process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.status(200).json({ token, user: makeJwtPayload(user) });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// POST /api/v1/auth/logout — NFR-04: инвалидация текущего токена
exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      tokenBlocklist.add(token);
    }
    return res.json({ success: true, message: 'Выход выполнен' });
  } catch (err) {
    console.error('[Auth Logout Error]', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// POST /api/v1/auth/change-password — NFR-04: смена пароля аннулирует все сессии
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword || newPassword.length < 4)
      return res.status(400).json({ error: 'Новый пароль должен быть минимум 4 символа' });

    const [[user]] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    if (currentPassword) {
      const ok = bcrypt.compareSync(currentPassword, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Неверный текущий пароль' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    // Добавляем текущий токен в blocklist (все старые токены становятся невалидными)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      tokenBlocklist.add(authHeader.split(' ')[1]);
    }

    return res.json({ success: true, message: 'Пароль изменён. Войдите снова.' });
  } catch (err) {
    console.error('[Auth ChangePassword Error]', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// GET /api/v1/auth/me
exports.me = async (req, res) => {
  return res.json({ user: req.user || null });
};
