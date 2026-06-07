import { useState, useCallback } from 'react';
import { ratesApi, exportApi } from '../services/api';
import { useCurrency } from '../hooks/useCurrency';
import { IconRate, IconTrash, IconSave, IconDownload, IconRefresh } from '../icons';

const C = {
  amber: '#d97706', blue: '#2563eb', green: '#059669',
  red: '#dc2626', border: '#e5e7eb', bg: '#f8fafc',
};

const VEHICLE_TYPES = [
  'Тентованный','Реф','Открытый','Контейнер',
  'Автовоз','Изотерм','Мегатонник','Микроавтобус',
];
const URGENCY = [
  { v: 'standard', l: 'Стандарт (×1.0)' },
  { v: 'express',  l: 'Экспресс (×1.35)' },
  { v: 'urgent',   l: 'Срочно (×1.70)' },
];

function Field({ label, value, onChange, type = 'text', options, placeholder }) {
  const s = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box', outline: 'none',
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </label>
      {options
        ? <select value={value} onChange={e => onChange(e.target.value)} style={s}>
            {options.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}
          </select>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s} />
      }
    </div>
  );
}

function Btn({ children, variant = 'default', onClick, disabled, full }) {
  const styles = {
    default: { bg: '#f9fafb', color: '#374151', border: `1px solid ${C.border}` },
    primary: { bg: C.blue,   color: '#fff',    border: 'none' },
    amber:   { bg: '#fffbeb',color: C.amber,   border: '1px solid #fde68a' },
    success: { bg: '#f0fdf4',color: C.green,   border: '1px solid #bbf7d0' },
    danger:  { bg: '#fff1f2',color: C.red,     border: '1px solid #fecaca' },
  }[variant] || { bg: '#f9fafb', color: '#374151', border: `1px solid ${C.border}` };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '8px 16px', borderRadius: 8, border: styles.border,
        background: disabled ? '#f3f4f6' : styles.bg, color: disabled ? '#9ca3af' : styles.color,
        fontSize: 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        width: full ? '100%' : undefined, justifyContent: full ? 'center' : undefined,
        opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}

const BLANK = {
  origin_city: '', dest_city: '', distance_km: '', vehicle_type: 'Тентованный',
  weight_t: '', volume_m3: '', urgency: 'standard',
};

export default function RateCalc({ user }) {
  const { formatAmount } = useCurrency();
  const [form, setForm]         = useState(BLANK);
  const [result, setResult]     = useState(null);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [histLoading, setHistLoading] = useState(false);
  const [saved, setSaved]       = useState(false);
  const [tab, setTab]           = useState('calc'); // 'calc' | 'history'
  const [notes, setNotes]       = useState('');

  const f = k => v => { setForm(p => ({ ...p, [k]: v })); setResult(null); setSaved(false); };

  async function handleCalculate(e) {
    e.preventDefault();
    if (!form.origin_city || !form.dest_city) return;
    setLoading(true);
    setSaved(false);
    try {
      const data = await ratesApi.calculate({
        ...form,
        distance_km: parseFloat(form.distance_km) || undefined,
        weight_t:    parseFloat(form.weight_t)    || 0,
        volume_m3:   parseFloat(form.volume_m3)   || 0,
      });
      setResult(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    try {
      await ratesApi.save({
        origin_city:  result.origin_city,
        dest_city:    result.dest_city,
        distance_km:  result.distance_km,
        vehicle_type: result.vehicle_type,
        weight_t:     result.weight_t,
        volume_m3:    form.volume_m3 || null,
        rate:         result.rate,
        currency:     result.currency,
        rate_per_km:  result.breakdown?.rate_per_km,
        notes,
      });
      setSaved(true);
      loadHistory();
    } catch (e) {
      alert(e.message);
    }
  }

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const data = await ratesApi.history({ limit: 50 });
      setHistory(data.quotes || []);
    } catch {}
    finally { setHistLoading(false); }
  }, []);

  async function handleDeleteQuote(id) {
    try {
      await ratesApi.delete(id);
      setHistory(h => h.filter(q => q.id !== id));
    } catch (e) {
      alert(e.message);
    }
  }

  function handleTabHistory() {
    setTab('history');
    loadHistory();
  }

  const bd = result?.breakdown;

  return (
    <div style={{ padding: 24, fontFamily: "'DM Sans', sans-serif", maxWidth: 1100, margin: '0 auto' }}>
      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f3f4f6', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {[['calc', 'Калькулятор'], ['history', 'История ставок']].map(([k, l]) => (
          <button key={k} onClick={k === 'history' ? handleTabHistory : () => setTab(k)}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: tab === k ? 700 : 500,
              background: tab === k ? '#fff' : 'transparent', color: tab === k ? C.amber : '#6b7280',
              cursor: 'pointer', boxShadow: tab === k ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'calc' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Форма */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconRate size={18} color={C.amber} /> Расчёт ставки
            </h3>
            <form onSubmit={handleCalculate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Город отправления" value={form.origin_city} onChange={f('origin_city')} placeholder="Минск" />
                <Field label="Город назначения"  value={form.dest_city}   onChange={f('dest_city')}   placeholder="Брест" />
              </div>
              <Field label="Расстояние (км)" value={form.distance_km} onChange={f('distance_km')} type="number" placeholder="Авто при пустом" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Тип ТС"      value={form.vehicle_type} onChange={f('vehicle_type')} options={VEHICLE_TYPES} />
                <Field label="Срочность"   value={form.urgency}      onChange={f('urgency')}      options={URGENCY} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Вес (тонн)"   value={form.weight_t}  onChange={f('weight_t')}  type="number" placeholder="0" />
                <Field label="Объём (м³)"   value={form.volume_m3} onChange={f('volume_m3')} type="number" placeholder="0" />
              </div>
              <Btn variant="amber" disabled={loading || !form.origin_city || !form.dest_city} full>
                <IconRefresh size={14} /> {loading ? 'Считаем...' : 'Рассчитать'}
              </Btn>
            </form>
          </div>

          {/* Результат */}
          <div>
            {result ? (
              <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {result.origin_city} → {result.dest_city}
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 900, color: C.amber, fontFamily: "'DM Mono',monospace", lineHeight: 1, marginTop: 8 }}>
                    {formatAmount(result.rate)}
                  </div>
                  <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{result.currency}</div>
                </div>

                {/* Разбивка */}
                <div style={{ background: C.bg, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 10 }}>Состав цены</div>
                  {bd && [
                    ['Базовая ставка/км', `${bd.base_per_km} BYN`],
                    ['Коэф. веса', `×${bd.weight_coef.toFixed(2)}`],
                    ['Коэф. срочности', `×${bd.urgency_coef}`],
                    ['Сезонный коэф.', `×${bd.season_coef}`],
                    ['Итог/км', `${bd.rate_per_km} BYN`],
                    ['Расстояние', `${bd.distance_km} км`],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: '#6b7280' }}>{l}</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Рынок */}
                {result.market && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: 'uppercase', marginBottom: 8 }}>Рыночные данные (90 дней)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {[['Мин.', result.market.min_rate], ['Средняя', result.market.avg_rate], ['Макс.', result.market.max_rate]].map(([l, v]) => (
                        <div key={l} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: C.green }}>{formatAmount(v)}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'center' }}>На основе {result.market.samples} запросов</div>
                  </div>
                )}

                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Заметки к ставке (необязательно)"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box', marginBottom: 12 }} />

                <Btn variant={saved ? 'success' : 'primary'} onClick={handleSave} disabled={saved} full>
                  <IconSave size={14} /> {saved ? 'Сохранено!' : 'Сохранить в историю'}
                </Btn>
              </div>
            ) : (
              <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '60px 24px', textAlign: 'center', color: '#9ca3af' }}>
                <IconRate size={40} color="#d1d5db" />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginTop: 12 }}>Заполните форму и нажмите «Рассчитать»</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Тарифы учитывают тип ТС, вес, срочность и сезонность</div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>История ставок</h3>
            <a href={exportApi.loads()} download style={{ textDecoration: 'none' }}>
              <Btn><IconDownload size={14} /> Excel</Btn>
            </a>
          </div>
          {histLoading
            ? <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Загрузка...</div>
            : history.length === 0
              ? <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>История пуста</div>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                      {['Маршрут','Тип ТС','Вес','Расстояние','Ставка','Ставка/км','Брокер','Дата',''].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((q, i) => (
                      <tr key={q.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{q.origin_city} → {q.dest_city}</td>
                        <td style={{ padding: '10px 14px', color: '#6b7280' }}>{q.vehicle_type || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>{q.weight_t ? `${q.weight_t} т` : '—'}</td>
                        <td style={{ padding: '10px 14px' }}>{q.distance_km ? `${q.distance_km} км` : '—'}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: C.amber }}>{formatAmount(q.rate)} {q.currency}</td>
                        <td style={{ padding: '10px 14px', color: '#6b7280' }}>{q.rate_per_km ? `${q.rate_per_km}` : '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>{q.broker_name || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#9ca3af' }}>{new Date(q.created_at).toLocaleDateString('ru-RU')}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <button onClick={() => handleDeleteQuote(q.id)} title="Удалить"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}>
                            <IconTrash size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          }
        </div>
      )}
    </div>
  );
}
