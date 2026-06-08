/**
 * Login.jsx — Вход и регистрация MT
 * Реальные данные приходят/уходят в backend (/api/v1/auth/*).
 */
import { useState } from 'react';

const ROLES = [
  { key: 'dispatcher', label: 'Диспетчер',     color: '#2563eb' },
  { key: 'broker',     label: 'Брокер',         color: '#7c3aed' },
  { key: 'carrier',    label: 'Перевозчик',     color: '#0891b2' },
  { key: 'driver',     label: 'Водитель',       color: '#ea580c' },
  { key: 'admin',      label: 'Администратор',  color: '#059669' },
];

function initials(name = '') {
  const v = String(name).trim();
  if (!v) return '??';
  return v
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const S = {
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    boxSizing: 'border-box',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    color: '#1e293b',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color .2s',
    fontFamily: "'DM Sans', sans-serif",
  },
  label: {
    display: 'block',
    color: '#64748b',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '.07em',
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  field: { marginBottom: 16 },
  btn: {
    width: '100%',
    padding: '12px',
    borderRadius: 10,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'background .2s',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '9px 14px',
    marginBottom: 16,
    color: '#dc2626',
    fontSize: 13,
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    padding: '32px 32px 28px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
};

function Field({ label, children }) {
  return (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

function Input({ type = 'text', value, onChange, placeholder, autoComplete }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      style={S.input}
      onFocus={e => (e.target.style.borderColor = '#3b82f6')}
      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
    />
  );
}

function LoginForm({ onLogin, onSwitch, apiUrl }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const v = login.trim();
    if (!v || !password) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const payload = { login: v, password };

      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Ошибка логина: HTTP ${res.status}`);
        return;
      }

      // backend возвращает { token, user }
      onLogin(data.user, data.token);
    } catch (err) {
      setError('Ошибка сети. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.card}>
      <h2 style={{ color: '#1e293b', fontSize: 18, fontWeight: 700, margin: '0 0 24px' }}>
        Вход в систему
      </h2>

      <form onSubmit={handleSubmit}>
        <Field label="Логин (имя, email или телефон)">
          <Input
            value={login}
            onChange={e => setLogin(e.target.value)}
            placeholder="Диспетчер / email@example.com / +375..."
            autoComplete="username"
          />
        </Field>

        <Field label="Пароль">
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••"
            autoComplete="current-password"
          />
        </Field>

        {error && <div style={S.error}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ ...S.btn, background: loading ? 'rgba(37,99,235,.5)' : '#2563eb', cursor: loading ? 'default' : 'pointer' }}
          onMouseEnter={e => {
            if (!loading) e.target.style.background = '#1d4ed8';
          }}
          onMouseLeave={e => {
            if (!loading) e.target.style.background = '#2563eb';
          }}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>

      <div style={{ marginTop: 22, textAlign: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>Нет аккаунта? </span>
        <button
          onClick={onSwitch}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563eb',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Зарегистрироваться
        </button>
      </div>
    </div>
  );
}

function RegisterForm({ onLogin, onSwitch, apiUrl }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    role: 'dispatcher',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Введите имя');
    if (!form.email.trim()) return setError('Введите email');
    if (!form.password) return setError('Введите пароль');
    if (form.password.length < 4) return setError('Пароль — минимум 4 символа');
    if (form.password !== form.confirm) return setError('Пароли не совпадают');

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          password: form.password,
          role: form.role,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Ошибка регистрации: HTTP ${res.status}`);
        return;
      }

      onLogin(data.user, data.token);
    } catch (err) {
      setError('Ошибка сети. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.card}>
      <h2 style={{ color: '#1e293b', fontSize: 18, fontWeight: 700, margin: '0 0 22px' }}>
        Регистрация
      </h2>

      <form onSubmit={handleSubmit}>
        <Field label="Имя и фамилия">
          <Input value={form.name} onChange={set('name')} placeholder="Иван Иванов" />
        </Field>

        <Field label="Email">
          <Input value={form.email} onChange={set('email')} placeholder="email@example.com" autoComplete="email" />
        </Field>

        <Field label="Телефон (опционально)">
          <Input value={form.phone} onChange={set('phone')} placeholder="+375 29 123-45-67" autoComplete="tel" />
        </Field>

        <Field label="Роль">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ROLES.map(r => {
              const active = form.role === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, role: r.key }))}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 9,
                    border: '1.5px solid',
                    borderColor: active ? r.color : '#e2e8f0',
                    background: active ? r.color + '22' : '#f8fafc',
                    color: active ? '#fff' : '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all .15s',
                    textAlign: 'center',
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Пароль">
          <Input type="password" value={form.password} onChange={set('password')} placeholder="Минимум 4 символа" autoComplete="new-password" />
        </Field>

        <Field label="Повторите пароль">
          <Input type="password" value={form.confirm} onChange={set('confirm')} placeholder="••••••" autoComplete="new-password" />
        </Field>

        {error && <div style={S.error}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ ...S.btn, background: loading ? 'rgba(37,99,235,.5)' : '#2563eb', cursor: loading ? 'default' : 'pointer', marginTop: 4 }}
          onMouseEnter={e => {
            if (!loading) e.target.style.background = '#1d4ed8';
          }}
          onMouseLeave={e => {
            if (!loading) e.target.style.background = '#2563eb';
          }}
        >
          {loading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
        </button>
      </form>

      <div style={{ marginTop: 22, textAlign: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>Уже есть аккаунт? </span>
        <button
          onClick={onSwitch}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563eb',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Войти
        </button>
      </div>
    </div>
  );
}

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');

  const apiUrl = process.env.REACT_APP_API_URL || '/api/v1';

  function handleLogin(user, token) {
    // нормализуем поля под текущий UI
    const roleKey = user.role;
    const roleColors = {
      admin: '#059669',
      dispatcher: '#2563eb',
      broker: '#7c3aed',
      carrier: '#0891b2',
      driver: '#ea580c',
    };
    const userData = {
      ...user,
      roleKey,
      color: roleColors[user.role] || '#0891b2',
      initials: initials(user.name),
    };
    onLogin(userData, token);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: 20,
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'radial-gradient(circle at 80% 20%, rgba(37,99,235,0.07) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(124,58,237,0.05) 0%, transparent 50%)',
        }}
      />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <path d="M2 14L10 3l8 11H13v4H7v-4H2z" fill="white" opacity=".95" />
            </svg>
          </div>
          <h1 style={{ color: '#1e293b', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>MT</h1>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 5 }}>Платформа грузоперевозок</p>
        </div>

        {mode === 'login' ? (
          <LoginForm onLogin={handleLogin} onSwitch={() => setMode('register')} apiUrl={apiUrl} />
        ) : (
          <RegisterForm onLogin={handleLogin} onSwitch={() => setMode('login')} apiUrl={apiUrl} />
        )}
      </div>
    </div>
  );
}
