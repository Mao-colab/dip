import { useState, useEffect, useCallback } from 'react';
import { loadsApi } from '../services/api';
import { useCurrency } from '../hooks/useCurrency';
import { IconOrders, IconTruck, IconCheck, IconClock, IconPortal } from '../icons';

const C = {
  amber: '#d97706', blue: '#2563eb', green: '#059669',
  red: '#dc2626', border: '#e5e7eb', bg: '#f8fafc',
};

const STATUS_COLORS = {
  'Новый': '#7c3aed', 'Назначен': '#2563eb', 'Забран': '#d97706',
  'Доставлен': '#16a34a', 'В ожидании': '#f59e0b', 'Оплачен': '#059669',
  'Спор': '#dc2626', 'Архив': '#9ca3af',
};

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#9ca3af';
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: color + '22', color, border: `1px solid ${color}44` }}>
      {status}
    </span>
  );
}

function KpiCard({ icon, label, value, color = C.blue }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{label}</div>
    </div>
  );
}

export default function ClientPortal({ user }) {
  const { formatAmount } = useCurrency();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadsApi.list({ limit: 200 });
      setOrders((data.loads || []).filter(l =>
        l.shipper_name?.toLowerCase().includes((user?.name || '').toLowerCase()) ||
        l.status !== 'Удалён'
      ));
    } catch {}
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(o =>
    !search ||
    String(o.id).includes(search) ||
    (o.origin_city || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.destination_city || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.status || '').toLowerCase().includes(search.toLowerCase())
  );

  const active   = orders.filter(o => !['Архив','Удалён','Оплачен'].includes(o.status));
  const delivered = orders.filter(o => o.status === 'Доставлен' || o.status === 'Оплачен');
  const totalRevenue = orders.reduce((s, o) => s + Number(o.cod_amount || 0), 0);

  return (
    <div style={{ padding: 24, fontFamily: "'DM Sans', sans-serif", maxWidth: 1100, margin: '0 auto' }}>
      {/* Приветствие */}
      <div style={{ background: `linear-gradient(135deg, ${C.amber}15, ${C.amber}05)`, border: `1px solid ${C.amber}30`, borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: C.amber + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconPortal size={24} color={C.amber} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>Добро пожаловать, {user?.name || 'Клиент'}!</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>Здесь вы можете отслеживать свои заказы и просматривать статус доставки</div>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard icon={<IconOrders size={18} color={C.blue} />}   label="Всего заказов"  value={orders.length}    color={C.blue} />
        <KpiCard icon={<IconTruck  size={18} color={C.amber} />}  label="Активных"       value={active.length}    color={C.amber} />
        <KpiCard icon={<IconCheck  size={18} color={C.green} />}  label="Доставлено"     value={delivered.length} color={C.green} />
        <KpiCard icon={<IconClock  size={18} color={C.red} />}    label="Сумма отгрузок" value={formatAmount(totalRevenue)} color="#374151" />
      </div>

      {/* Поиск */}
      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по номеру, городу, статусу..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
      </div>

      {/* Список */}
      {loading
        ? <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Загрузка...</div>
        : filtered.length === 0
          ? <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center', color: '#9ca3af' }}>
              <IconOrders size={36} color="#d1d5db" />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginTop: 12 }}>Заказов не найдено</div>
            </div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(order => (
                <div key={order.id}
                  style={{ background: '#fff', border: `1px solid ${selected?.id === order.id ? C.blue : C.border}`, borderRadius: 14, padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s', boxShadow: selected?.id === order.id ? '0 2px 12px rgba(37,99,235,0.12)' : 'none' }}
                  onClick={() => setSelected(selected?.id === order.id ? null : order)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: C.blue + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: C.blue }}>#{order.id}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                          {order.origin_city || '—'} → {order.destination_city || '—'}
                        </div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                          {order.origin_date ? new Date(order.origin_date).toLocaleDateString('ru-RU') : '—'}
                          {order.destination_date ? ` — ${new Date(order.destination_date).toLocaleDateString('ru-RU')}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {order.cod_amount > 0 && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{formatAmount(order.cod_amount)} BYN</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Стоимость груза</div>
                        </div>
                      )}
                      <StatusBadge status={order.status} />
                    </div>
                  </div>

                  {/* Детали (раскрываемые) */}
                  {selected?.id === order.id && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {[
                          ['Отправитель',    order.shipper_name],
                          ['Телефон',        order.shipper_phone],
                          ['Водитель',       order.driver_name || 'Не назначен'],
                          ['Адрес погрузки', order.origin_addr],
                          ['Адрес доставки', order.destination_addr],
                          ['Оплата вод.',    order.driver_pay ? `${order.driver_pay} BYN` : '—'],
                        ].map(([l, v]) => v && (
                          <div key={l} style={{ background: C.bg, borderRadius: 8, padding: '8px 12px' }}>
                            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{l}</div>
                            <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginTop: 2 }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Прогресс-бар статуса */}
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 }}>Прогресс доставки</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                          {['Новый','Назначен','Забран','Доставлен','Оплачен'].map((s, idx, arr) => {
                            const statusOrder = ['Новый','Назначен','Забран','Доставлен','Оплачен'];
                            const current = statusOrder.indexOf(order.status);
                            const step    = statusOrder.indexOf(s);
                            const done    = step <= current;
                            const active  = step === current;
                            return (
                              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: idx < arr.length - 1 ? 1 : 'none' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: done ? C.green : '#e5e7eb', border: active ? `2px solid ${C.green}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: active ? `0 0 0 4px ${C.green}20` : 'none' }}>
                                    {done && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                                  </div>
                                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: done ? C.green : '#9ca3af', whiteSpace: 'nowrap' }}>{s}</span>
                                </div>
                                {idx < arr.length - 1 && (
                                  <div style={{ height: 2, flex: 1, background: done && step < current ? C.green : '#e5e7eb', margin: '0 2px', marginBottom: 16 }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
      }
    </div>
  );
}
