import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from '../services/api';
import { IconBell, IconCheck, IconTrash } from '../icons';

const TYPE_COLORS = {
  claim_new:      '#dc2626',
  claim_resolved: '#059669',
  doc_verified:   '#2563eb',
  order_assigned: '#d97706',
  order_status:   '#7c3aed',
  info:           '#6b7280',
};

const TYPE_ICONS = {
  claim_new:      '⚠',
  claim_resolved: '✓',
  doc_verified:   '✓',
  order_assigned: '',
  order_status:   '',
  info:           '',
};

export default function NotificationsPanel() {
  const [open, setOpen]       = useState(false);
  const [items, setItems]     = useState([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const timerRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.list();
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    timerRef.current = setInterval(fetchNotifications, 30000);
    return () => clearInterval(timerRef.current);
  }, [fetchNotifications]);

  // Закрытие по клику вне панели
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function handleMarkRead(id) {
    try {
      await notificationsApi.markRead(id);
      setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  }

  async function handleMarkAll() {
    setLoading(true);
    try {
      await notificationsApi.markAll();
      setItems(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnread(0);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleDelete(id) {
    try {
      await notificationsApi.delete(id);
      const item = items.find(n => n.id === id);
      setItems(prev => prev.filter(n => n.id !== id));
      if (item && !item.is_read) setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min  = Math.floor(diff / 60000);
    const hr   = Math.floor(min / 60);
    const day  = Math.floor(hr / 24);
    if (min < 1)   return 'только что';
    if (min < 60)  return `${min} мин. назад`;
    if (hr < 24)   return `${hr} ч. назад`;
    return `${day} дн. назад`;
  }

  return (
    <div ref={panelRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Кнопка-колокольчик */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', background: open ? '#f0f9ff' : 'transparent',
          border: `1px solid ${open ? '#bfdbfe' : 'transparent'}`,
          borderRadius: 9, padding: '6px 8px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', color: open ? '#2563eb' : '#6b7280',
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#374151'; }}}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}}
      >
        <IconBell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#dc2626', color: '#fff',
            fontSize: 9, fontWeight: 800, borderRadius: 10,
            padding: '1px 4px', minWidth: 14, textAlign: 'center',
            lineHeight: 1.4,
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Выпадающая панель */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          width: 360, background: '#fff',
          border: '1px solid #e5e7eb', borderRadius: 14,
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          zIndex: 2000, overflow: 'hidden',
        }}>
          {/* Заголовок панели */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>Уведомления</span>
              {unread > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626', borderRadius: 10, padding: '2px 7px' }}>
                  {unread} новых
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={handleMarkAll} disabled={loading}
                style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconCheck size={12} /> Прочитать все
              </button>
            )}
          </div>

          {/* Список */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {items.length === 0
              ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                  <IconBell size={28} color="#d1d5db" />
                  <div style={{ fontSize: 13, marginTop: 8 }}>Нет уведомлений</div>
                </div>
              )
              : items.map(n => {
                const color = TYPE_COLORS[n.type] || '#6b7280';
                const icon  = TYPE_ICONS[n.type]  || '';
                return (
                  <div key={n.id}
                    style={{
                      padding: '12px 16px', borderBottom: '1px solid #f9f9f9',
                      background: n.is_read ? '#fff' : '#eff6ff',
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = n.is_read ? '#fff' : '#eff6ff'}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: color + '18', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: n.is_read ? 500 : 700, color: '#111827', lineHeight: 1.3 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      {!n.is_read && (
                        <button onClick={() => handleMarkRead(n.id)} title="Отметить прочитанным"
                          style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center' }}>
                          <IconCheck size={12} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(n.id)} title="Удалить"
                        style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                        <IconTrash size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}
    </div>
  );
}
