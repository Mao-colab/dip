import { useState, useEffect, useCallback } from 'react';

/**
 * Возвращает префикс текущего пользователя.
 * Каждый аккаунт имеет свою изолированную базу данных.
 */
export function getUserPrefix() {
  try {
    const user = JSON.parse(localStorage.getItem('mt_user') || 'null');
    if (user?.login) return `mt_u_${user.login}_`;
  } catch {}
  return 'mt_shared_';
}

/** Полный ключ в localStorage = префикс + базовый ключ */
function fullKey(baseKey) {
  return getUserPrefix() + baseKey;
}

export function useStore(baseKey, initial = []) {
  // Вычисляем ключ один раз при монтировании (пользователь не меняется пока компонент жив)
  const [key] = useState(() => fullKey(baseKey));

  const [data, setData] = useState(() => {
    try {
      const r = localStorage.getItem(key);
      return r ? JSON.parse(r) : initial;
    } catch { return initial; }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
  }, [key, data]);

  useEffect(() => {
    const fn = e => {
      if (e.key === key) {
        try { setData(JSON.parse(e.newValue) ?? initial); } catch {}
      }
    };
    window.addEventListener('storage', fn);
    return () => window.removeEventListener('storage', fn);
  }, [key]); // eslint-disable-line

  const set   = useCallback(v => setData(v), []);
  const add   = useCallback(item => setData(p => [...p, item]), []);
  const upd   = useCallback((id, patch) => setData(p => p.map(x => x.id === id ? { ...x, ...patch } : x)), []);
  const del   = useCallback(id => setData(p => p.filter(x => x.id !== id)), []);
  const reset = useCallback(() => setData(initial), []);
  return { data, set, add, upd, del, reset };
}

// Базовые ключи (без префикса пользователя)
export const KEYS = {
  orders:       'orders',
  contacts:     'contacts',
  deals:        'deals',
  docs:         'docs',
  staff:        'staff',
  trucks:       'trucks',
  trailers:     'trailers',
  documents:    'documents',
  roles_config: 'roles_config',
  compliance:   'compliance',
};
