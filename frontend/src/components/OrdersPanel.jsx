/**
 * OrdersPanel.jsx — Управление заказами MT
 * FR-01: Многофазное отслеживание статусов
 * FR-02: Фильтрация грузов
 * FR-03: Быстрые действия
 * FR-12: Автоматическое назначение водителя после создания заказа
 *
 * Данные: backend API (/api/v1/loads) → fallback localStorage
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadsApi, autoassignApi, podApi } from '../services/api';
import { IconOrders, IconTrash, IconEdit, IconDocument } from '../icons';
import { useCurrency } from '../hooks/useCurrency';
import { estimateDistanceKm } from '../services/distance';
import ReviewModal   from './ReviewModal';
import IncidentModal from './IncidentModal';

const STATUS_TABS = [
  'Новый','Назначен','Забран','Доставлен',
  'Запрошен','В ожидании','Оплачен','Спор','Архив','Удалён',
];
const STATUS_COLORS = {
  'Новый':    '#7c3aed', 'Назначен': '#2563eb', 'Забран':    '#d97706',
  'Доставлен':'#16a34a', 'Запрошен': '#0891b2', 'В ожидании':'#f59e0b',
  'Оплачен':  '#059669', 'Спор':    '#dc2626', 'Архив':     '#9ca3af', 'Удалён':'#6b7280',
};
const PAY_TYPES = ['Наличные','Безналичный расчёт','Перевод','Карта'];
const C = { border:'#e5e7eb', bg:'#f8fafc', blue:'#2563eb', green:'#059669', red:'#dc2626' };

// ── UI-атомы ──────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type='text', options, required }) {
  const s = { width:'100%', padding:'8px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none', fontFamily:'sans-serif' };
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:.4 }}>
        {label}{required && <span style={{ color:C.red }}> *</span>}
      </label>
      {options
        ? <select value={value} onChange={e=>onChange(e.target.value)} style={s}>
            {options.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}
          </select>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s} required={required}/>}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:18, padding:28, maxWidth:wide?780:600, width:'100%', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:16 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#9ca3af';
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:color+'22', color, border:`1px solid ${color}44` }}>
      {status}
    </span>
  );
}

function Btn({ children, variant='default', onClick, small, disabled }) {
  const styles = {
    default:  { bg:'#f9fafb', color:'#374151', border:`1px solid ${C.border}` },
    primary:  { bg:C.blue,    color:'#fff',    border:'none' },
    success:  { bg:'#f0fdf4', color:C.green,   border:'1px solid #bbf7d0' },
    danger:   { bg:'#fff1f2', color:C.red,     border:'1px solid #fecaca' },
    amber:    { bg:'#fffbeb', color:'#d97706', border:'1px solid #fde68a' },
  }[variant] || { bg:'#f9fafb', color:'#374151', border:`1px solid ${C.border}` };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding:small?'4px 10px':'8px 16px', borderRadius:8, border:styles.border, background:disabled?'#f3f4f6':styles.bg,
        color:disabled?'#9ca3af':styles.color, fontSize:small?11:13, fontWeight:600, cursor:disabled?'default':'pointer',
        display:'flex', alignItems:'center', gap:5, opacity:disabled?.6:1 }}>
      {children}
    </button>
  );
}

const BLANK = {
  status:'Новый', cod_amount:'', driverPay:'', payType:'Наличные',
  origin_addr:'', origin_city:'', origin_date:'', origin_contact:'', origin_phone:'',
  destination_addr:'', destination_city:'', destination_date:'', destination_contact:'', destination_phone:'',
  shipper_name:'', shipper_phone:'',
  vehicles:[{ make:'', year:'', type:'', vin:'', price:'' }],
  distance_km:'',
  rates:[{ carrier:'', amount:'', note:'' }],
  notes:'',
};

// ── Авто-назначение: модальное окно с предложением водителей ─────────────────
function AutoAssignModal({ loadId, onClose, onAssigned }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [assigning, setAssigning]     = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    autoassignApi.suggest(loadId, 1000)
      .then(data => setSuggestions(data.suggestions || []))
      .catch(() => setError('Водители не найдены в радиусе 1000 км'))
      .finally(() => setLoading(false));
  }, [loadId]);

  async function assignDriver(driverId) {
    setAssigning(true);
    try {
      await autoassignApi.offer(loadId, driverId, 'Предложение от системы');
      onAssigned(driverId);
    } catch (e) {
      setError(e.message);
    } finally {
      setAssigning(false);
    }
  }

  async function autoAssign() {
    setAssigning(true);
    try {
      const result = await autoassignApi.assign(loadId, { radius: 1000 });
      onAssigned(result?.assignment?.driver?.id);
    } catch (e) {
      setError(e.message || 'Нет доступных водителей');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <Modal title="Автоматическое назначение водителя" onClose={onClose} wide>
      <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#1d4ed8' }}>
        Заказ <strong>#{loadId}</strong> создан. Система подобрала подходящих водителей по расстоянию, рейтингу и доступности.
      </div>

      {loading && <div style={{ textAlign:'center', padding:'32px 0', color:'#9ca3af' }}>Поиск водителей...</div>}
      {error   && <div style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:C.red, fontSize:13 }}>{error}</div>}

      {!loading && suggestions.length === 0 && !error && (
        <div style={{ textAlign:'center', padding:'32px 0', color:'#6b7280', fontSize:13 }}>
          Нет доступных водителей. Назначьте вручную позже.
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
          {suggestions.map(d => (
            <div key={d.id} style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:'50%', background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:C.blue, fontSize:14, flexShrink:0 }}>
                {d.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{d.name}</div>
                <div style={{ fontSize:12, color:'#6b7280', display:'flex', gap:12, marginTop:2 }}>
                  {d.distance != null && <span>📍 {d.distance} км</span>}
                  {d.rating > 0 && <span>⭐ {d.rating}</span>}
                  <span style={{ color:d.status==='active'?C.green:'#9ca3af' }}>
                    ● {d.status==='active'?'Активен':'Свободен'}
                  </span>
                  {d.verified && <span style={{ color:C.blue }}>✓ Верифицирован</span>}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:11, color:'#9ca3af', marginBottom:4 }}>Score</div>
                <div style={{ fontSize:20, fontWeight:800, color:C.blue }}>{d.matchScore}</div>
              </div>
              <Btn variant="primary" onClick={() => assignDriver(d.id)} disabled={assigning} small>
                Назначить
              </Btn>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'flex', gap:10, borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
        {suggestions.length > 0 && (
          <Btn variant="amber" onClick={autoAssign} disabled={assigning}>
            ⚡ Авто-назначить лучшего
          </Btn>
        )}
        <Btn onClick={onClose}>Позже</Btn>
      </div>
    </Modal>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function OrdersPanel({ user }) {
  const { formatAmount, currencySymbol, convert } = useCurrency();
  const navigate = useNavigate();

  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [activeTab,  setActiveTab]  = useState('Новый');
  const [search,     setSearch]     = useState('');
  const [sortBy,     setSortBy]     = useState('');
  const [filterDriver, setFilterDriver]         = useState('');
  const [filterDispatcher, setFilterDispatcher] = useState('');
  const [showAdd,    setShowAdd]    = useState(false);
  const [showView,   setShowView]   = useState(null);
  const [editId,     setEditId]     = useState(null);
  const [form,       setForm]       = useState(BLANK);
  const [saving,     setSaving]     = useState(false);
  const [apiError,   setApiError]   = useState('');
  const [autoAssignLoadId, setAutoAssignLoadId] = useState(null);
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  // FR-09, FR-25, FR-28 modals
  const [reviewTarget,  setReviewTarget]  = useState(null); // { loadId, userId, userName }
  const [incidentLoadId, setIncidentLoadId] = useState(null);
  const [podLoadId,     setPodLoadId]     = useState(null);

  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  // Брокер видит блок «Ставки» с автоматическим расчётом расстояния
  const isBroker = (user?.roleKey || user?.role) === 'broker';
  // Расстояние, введённое брокером вручную, не перезаписываем авто-расчётом
  const distanceTouched = useRef(false);

  // ── FR: авто-подстановка расстояния по городам отправления/назначения ───────
  useEffect(() => {
    if (!isBroker || distanceTouched.current) return;
    const est = estimateDistanceKm(form.origin_city, form.destination_city);
    if (est != null) {
      setForm(p => (String(p.distance_km) === String(est) ? p : { ...p, distance_km: est }));
    }
  }, [isBroker, form.origin_city, form.destination_city]);

  // ── Загрузка заказов с бэкенда ─────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadsApi.list();
      const mapped = (data.loads || []).map(normLoad);
      setOrders(mapped);
      setUseLocalFallback(false);
    } catch {
      // fallback: localStorage
      setUseLocalFallback(true);
      try {
        const u = JSON.parse(localStorage.getItem('mt_user') || '{}');
        const prefix = u.login ? `mt_u_${u.login}_` : 'mt_shared_';
        const raw = JSON.parse(localStorage.getItem(prefix + 'orders') || '[]');
        setOrders(raw);
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Нормализация полей бэкенда → UI
  function normLoad(l) {
    return {
      id:           String(l.id),
      status:       l.status || 'Новый',
      cod_amount:   l.cod_amount || 0,
      driverPay:    l.driver_pay || 0,
      origin_addr:  l.origin_addr  || '',
      origin_city:  l.origin_city  || '',
      origin_date:  l.origin_date  ? l.origin_date.slice(0,10) : '',
      origin_contact:   l.origin_contact  || '',
      origin_phone:     l.origin_phone    || '',
      destination_addr:     l.destination_addr     || '',
      destination_city:     l.destination_city     || '',
      destination_date:     l.destination_date     ? l.destination_date.slice(0,10) : '',
      destination_contact:  l.destination_contact  || '',
      destination_phone:    l.destination_phone    || '',
      shipper_name:  l.shipper_name  || '',
      shipper_phone: l.shipper_phone || '',
      driver:        l.driver_name   || '',
      dispatcher:    l.dispatcher_name || '',
      driver_id:     l.driver_id,
      createdAt:     l.created_at ? new Date(l.created_at).toLocaleDateString('ru-RU') : '',
      vehicles:      l.vehicles || [],
      distance_km:   l.distance_km || '',
      rates:         l.rates || [],
    };
  }

  // ── CRUD заказов ───────────────────────────────────────────────────────────
  async function saveOrder() {
    setSaving(true);
    setApiError('');
    try {
      const payload = {
        origin_addr:      form.origin_addr,
        origin_city:      form.origin_city,
        origin_date:      form.origin_date || null,
        origin_contact:   form.origin_contact,
        origin_phone:     form.origin_phone,
        destination_addr: form.destination_addr,
        destination_city: form.destination_city,
        destination_date: form.destination_date || null,
        destination_contact: form.destination_contact,
        destination_phone:   form.destination_phone,
        shipper_name:  form.shipper_name,
        shipper_phone: form.shipper_phone,
        cod_amount:    parseFloat(form.cod_amount) || 0,
        driver_pay:    parseFloat(form.driverPay)  || 0,
        vehicles:      form.vehicles.filter(v => v.make || v.vin),
        distance_km:   parseFloat(form.distance_km) || null,
        rates:         (form.rates || []).filter(r => r.carrier || r.amount),
      };

      if (editId) {
        if (useLocalFallback) {
          setOrders(p => p.map(o => o.id === editId ? { ...o, ...form } : o));
        } else {
          await loadsApi.update(editId, { status: form.status });
          await loadOrders();
        }
        if (showView?.id === editId) setShowView(v => ({ ...v, ...form }));
        setEditId(null);
      } else {
        if (useLocalFallback) {
          const newId = String(Date.now());
          const newOrder = { ...form, id: newId, createdAt: new Date().toLocaleDateString('ru-RU') };
          setOrders(p => [...p, newOrder]);
          persistLocalOrders([...orders, newOrder]);
        } else {
          const res = await loadsApi.create(payload);
          await loadOrders();
          // Запускаем авто-назначение для диспетчеров и администраторов
          const role = user?.role || user?.roleKey;
          if (res?.id && ['dispatcher', 'admin'].includes(role)) {
            setAutoAssignLoadId(res.id);
          }
        }
        setActiveTab('Новый');
      }
      setForm(BLANK);
      setShowAdd(false);
    } catch (e) {
      setApiError(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id, status) {
    if (useLocalFallback) {
      const updated = orders.map(o => o.id === id ? { ...o, status } : o);
      setOrders(updated);
      persistLocalOrders(updated);
      if (showView?.id === id) setShowView(v => ({ ...v, status }));
      return;
    }
    try {
      await loadsApi.update(id, { status });
      setOrders(p => p.map(o => o.id === id ? { ...o, status } : o));
      if (showView?.id === id) setShowView(v => ({ ...v, status }));
    } catch (e) { setApiError(e.message); }
  }

  function persistLocalOrders(list) {
    try {
      const u = JSON.parse(localStorage.getItem('mt_user') || '{}');
      const prefix = u.login ? `mt_u_${u.login}_` : 'mt_shared_';
      localStorage.setItem(prefix + 'orders', JSON.stringify(list));
    } catch {}
  }

  function openEdit(order) {
    setForm({ ...BLANK, ...order, rates: order.rates?.length ? order.rates : BLANK.rates });
    distanceTouched.current = true; // не перезаписываем сохранённое расстояние
    setEditId(order.id);
    setShowAdd(true);
  }

  function deleteOrder(id) {
    setOrders(p => p.filter(o => o.id !== id));
    if (showView?.id === id) setShowView(null);
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const tabCounts = STATUS_TABS.reduce((acc, t) => {
    acc[t] = orders.filter(o => o.status === t).length;
    return acc;
  }, {});

  const drivers     = [...new Set(orders.map(o => o.driver).filter(Boolean))];
  const dispatchers = [...new Set(orders.map(o => o.dispatcher).filter(Boolean))];

  const filtered = useMemo(() => {
    let list = orders.filter(o =>
      o.status === activeTab &&
      (!search || String(o.id).includes(search) ||
        (o.origin_city||'').toLowerCase().includes(search.toLowerCase()) ||
        (o.destination_city||'').toLowerCase().includes(search.toLowerCase()) ||
        (o.shipper_name||'').toLowerCase().includes(search.toLowerCase())) &&
      (!filterDriver     || o.driver === filterDriver) &&
      (!filterDispatcher || o.dispatcher === filterDispatcher)
    );
    if (sortBy === 'new')      list = [...list].sort((a,b) => Number(b.id) - Number(a.id));
    if (sortBy === 'cod_asc')  list = [...list].sort((a,b) => Number(a.cod_amount||0) - Number(b.cod_amount||0));
    if (sortBy === 'cod_desc') list = [...list].sort((a,b) => Number(b.cod_amount||0) - Number(a.cod_amount||0));
    if (sortBy === 'date')     list = [...list].sort((a,b) => (b.origin_date||'').localeCompare(a.origin_date||''));
    return list;
  }, [orders, activeTab, search, filterDriver, filterDispatcher, sortBy]);

  // ── CSV Export ──────────────────────────────────────────────────────────────
  function exportCSV() {
    const sep = ';';
    const headers = ['ID','Статус','Откуда','Адрес отправки','Дата отгрузки','Куда','Адрес доставки','Дата доставки','Водитель','Диспетчер','Грузоотправитель',`Сумма (${currencySymbol})`,`Выплата (${currencySymbol})`,'Создан'];
    const rows = orders.map(o => [
      o.id, o.status,
      o.origin_city||'', o.origin_addr||'', o.origin_date||'',
      o.destination_city||'', o.destination_addr||'', o.destination_date||'',
      o.driver||'', o.dispatcher||'', o.shipper_name||'',
      o.cod_amount ? convert(o.cod_amount).toFixed(2) : '',
      o.driverPay  ? convert(o.driverPay).toFixed(2)  : '',
      o.createdAt||''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(sep)).join('\r\n');
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), { href:URL.createObjectURL(blob), download:`MT_Заказы_${new Date().toLocaleDateString('ru-RU').replace(/\./g,'-')}.csv` });
    a.click();
  }

  // ── PDF Print ───────────────────────────────────────────────────────────────
  function printOrder(o) {
    const curr = currencySymbol;
    const w = window.open('','_blank','width=880,height=720');
    w.document.write(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Заказ #${o.id}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;padding:32px 40px}
.hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:2px solid #2563eb;padding-bottom:14px}
.logo{font-size:24px;font-weight:900;color:#2563eb}.badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe}
h2{font-size:18px;margin-bottom:4px}.sec{margin-bottom:20px}.sec-t{font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;border-bottom:1px solid #f0f0f0;padding-bottom:4px}
table{width:100%;border-collapse:collapse}td{padding:7px 0;border-bottom:1px solid #f5f5f5;vertical-align:top}
td:first-child{color:#888;width:180px;font-size:12px}td:last-child{font-weight:600}
.amt{font-size:20px;font-weight:900;color:#2563eb}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px}
.footer{margin-top:32px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:10px;color:#aaa;display:flex;justify-content:space-between}
@media print{.no-print{display:none!important}}</style></head><body>
<div class="hd"><div><div class="logo">MT</div><div style="font-size:11px;color:#888;margin-top:3px">Платформа логистики</div></div>
<div style="text-align:right"><h2>Заказ #${o.id}</h2><div class="badge">${o.status}</div></div></div>
<div class="sec"><div class="sec-t">Финансы</div><table>
<tr><td>Сумма</td><td><span class="amt">${o.cod_amount?Number(o.cod_amount).toLocaleString('ru-RU')+' '+curr:'—'}</span></td></tr>
<tr><td>Выплата водителю</td><td>${o.driverPay?Number(o.driverPay).toLocaleString('ru-RU')+' '+curr:'—'}</td></tr>
</table></div>
<div class="grid">
<div class="sec"><div class="sec-t">Отправка</div><table>
<tr><td>Город</td><td>${o.origin_city||'—'}</td></tr><tr><td>Адрес</td><td>${o.origin_addr||'—'}</td></tr>
<tr><td>Дата</td><td>${o.origin_date||'—'}</td></tr><tr><td>Контакт</td><td>${o.origin_contact||'—'}</td></tr>
<tr><td>Телефон</td><td>${o.origin_phone||'—'}</td></tr></table></div>
<div class="sec"><div class="sec-t">Доставка</div><table>
<tr><td>Город</td><td>${o.destination_city||'—'}</td></tr><tr><td>Адрес</td><td>${o.destination_addr||'—'}</td></tr>
<tr><td>Дата</td><td>${o.destination_date||'—'}</td></tr><tr><td>Контакт</td><td>${o.destination_contact||'—'}</td></tr>
<tr><td>Телефон</td><td>${o.destination_phone||'—'}</td></tr></table></div></div>
<div class="sec"><div class="sec-t">Исполнители</div><table>
<tr><td>Водитель</td><td>${o.driver||'<span style="color:#dc2626">Не назначен</span>'}</td></tr>
<tr><td>Диспетчер</td><td>${o.dispatcher||'—'}</td></tr>
<tr><td>Грузоотправитель</td><td>${o.shipper_name||'—'}</td></tr></table></div>
<div class="footer"><span>MT — Брокер РБ</span><span>Создан: ${o.createdAt||'—'} · Дата печати: ${new Date().toLocaleDateString('ru-RU')}</span></div>
<br/><button class="no-print" onclick="window.print()" style="padding:10px 24px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-right:10px">Распечатать / PDF</button>
<button class="no-print" onclick="window.close()" style="padding:10px 18px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:14px;cursor:pointer">Закрыть</button>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }

  // ── FR-25: Подтверждение доставки ──────────────────────────────────────────
  async function confirmPod(loadId) {
    try {
      await podApi.confirm(loadId, {});
      setOrders(p => p.map(o => o.id === String(loadId) ? { ...o, status: 'Доставлен' } : o));
      if (showView?.id === String(loadId)) setShowView(v => ({ ...v, status: 'Доставлен' }));
    } catch (e) { setApiError(e.message); }
    setPodLoadId(null);
  }

  // ── Следующий статус по жизненному циклу ──────────────────────────────────
  function nextStatus(s) {
    return { 'Новый':'Назначен', 'Назначен':'Забран', 'Забран':'Доставлен', 'Доставлен':'Оплачен' }[s];
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', fontFamily:"'DM Sans', sans-serif" }}>

        {/* Оффлайн-баннер */}
        {useLocalFallback && (
          <div style={{ background:'#fffbeb', borderBottom:'1px solid #fde68a', padding:'7px 24px', fontSize:12, color:'#92400e' }}>
            ⚠ Работа в автономном режиме — данные сохраняются локально. Запустите backend и <button onClick={loadOrders} style={{ background:'none', border:'none', color:'#d97706', fontWeight:700, cursor:'pointer', padding:0, fontSize:12 }}>обновите</button>.
          </div>
        )}

        {/* Топ-бар */}
        <div style={{ background:'#fff', borderBottom:`1px solid ${C.border}`, padding:'14px 24px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1 }}>
            <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:'#111827' }}>Заказы</h1>
            <p style={{ margin:'2px 0 0', fontSize:12, color:'#9ca3af' }}>
              Всего: {orders.length} · В пути: {orders.filter(o=>['Назначен','Забран'].includes(o.status)).length}
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn onClick={exportCSV}>
              <IconDocument size={14}/> CSV
            </Btn>
            <Btn variant="primary" onClick={()=>{ setForm(BLANK); distanceTouched.current = false; setEditId(null); setShowAdd(true); }}>
              + Добавить заказ
            </Btn>
          </div>
        </div>

        {/* Фильтры */}
        <div style={{ background:'#fff', borderBottom:`1px solid ${C.border}`, padding:'10px 24px', display:'flex', gap:10, flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по ID, городу, грузоотправителю..."
            style={{ flex:'1 1 220px', padding:'8px 14px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, outline:'none' }}/>
          <select value={filterDriver} onChange={e=>setFilterDriver(e.target.value)} style={{ padding:'8px 12px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13 }}>
            <option value="">Все водители</option>
            {drivers.map(d=><option key={d}>{d}</option>)}
          </select>
          <select value={filterDispatcher} onChange={e=>setFilterDispatcher(e.target.value)} style={{ padding:'8px 12px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13 }}>
            <option value="">Все диспетчеры</option>
            {dispatchers.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:'8px 12px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13 }}>
            <option value="">Сортировка</option>
            <option value="new">Сначала новые</option>
            <option value="cod_asc">Сумма ↑</option>
            <option value="cod_desc">Сумма ↓</option>
            <option value="date">По дате</option>
          </select>
          <Btn onClick={loadOrders}>↻</Btn>
        </div>

        {/* Вкладки статусов */}
        <div style={{ background:'#fff', borderBottom:`1px solid ${C.border}`, display:'flex', overflowX:'auto', padding:'0 24px' }}>
          {STATUS_TABS.map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{
              padding:'12px 14px', border:'none', background:'transparent', cursor:'pointer',
              fontSize:13, whiteSpace:'nowrap', fontWeight:activeTab===tab?700:500,
              color:activeTab===tab?C.blue:'#6b7280',
              borderBottom:activeTab===tab?`2.5px solid ${C.blue}`:'2.5px solid transparent',
              display:'flex', alignItems:'center', gap:5,
            }}>
              {tab}
              <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10, background:activeTab===tab?'#eff6ff':'#f3f4f6', color:activeTab===tab?C.blue:'#9ca3af' }}>
                {tabCounts[tab]||0}
              </span>
            </button>
          ))}
        </div>

        {/* Список */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', background:C.bg }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'#9ca3af' }}>Загрузка заказов...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'#9ca3af' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}><IconOrders size={40} color="#d1d5db"/></div>
              <div style={{ fontSize:14, fontWeight:600, color:'#374151', marginBottom:6 }}>Нет заказов</div>
              <div style={{ fontSize:13 }}>
                {search ? 'Попробуйте изменить параметры поиска' : 'Нажмите «+ Добавить заказ»'}
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filtered.map(o => (
                <div key={o.id} onClick={()=>setShowView(v=>v?.id===o.id?null:o)}
                  style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 20px', cursor:'pointer',
                    boxShadow:showView?.id===o.id?'0 0 0 2px #2563eb':'none', transition:'box-shadow .15s' }}>

                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:C.blue }}>#{o.id}</div>
                    <StatusBadge status={o.status}/>
                    <div style={{ flex:1 }}/>
                    {o.createdAt && <span style={{ fontSize:11, color:'#9ca3af' }}>{o.createdAt}</span>}
                    <div style={{ display:'flex', gap:6 }} onClick={e=>e.stopPropagation()}>
                      {nextStatus(o.status) && (
                        <Btn small variant="success" onClick={()=>changeStatus(o.id, nextStatus(o.status))}>
                          → {nextStatus(o.status)}
                        </Btn>
                      )}
                      <Btn small onClick={()=>openEdit(o)}><IconEdit size={13}/></Btn>
                      <Btn small onClick={()=>printOrder(o)}><IconDocument size={13}/></Btn>
                      <Btn small variant="danger" onClick={()=>deleteOrder(o.id)}><IconTrash size={13}/></Btn>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px 20px', fontSize:13 }}>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:3 }}>Откуда → Куда</div>
                      <div style={{ fontWeight:600, color:'#111827' }}>
                        {o.origin_city||'—'} → {o.destination_city||'—'}
                      </div>
                      {o.origin_date && <div style={{ fontSize:11, color:'#6b7280', marginTop:1 }}>{o.origin_date}</div>}
                    </div>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:3 }}>Водитель / Диспетчер</div>
                      <div style={{ color:o.driver?'#111827':'#dc2626', fontWeight:600 }}>{o.driver||'Не назначен'}</div>
                      {o.dispatcher && <div style={{ fontSize:11, color:'#6b7280' }}>{o.dispatcher}</div>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:3 }}>Сумма / Выплата</div>
                      <div style={{ fontSize:17, fontWeight:800, color:C.blue }}>{o.cod_amount ? formatAmount(o.cod_amount) : '—'}</div>
                      {o.driverPay>0 && <div style={{ fontSize:12, color:C.green }}>Водитель: {formatAmount(o.driverPay)}</div>}
                    </div>
                  </div>

                  {/* Детальная панель */}
                  {showView?.id === o.id && (
                    <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}` }} onClick={e=>e.stopPropagation()}>

                      {/* FR-04: Быстрые действия */}
                      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                        {o.shipper_phone && (
                          <a href={`tel:${o.shipper_phone}`}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8,
                                     background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#16a34a', fontSize:12, fontWeight:600, textDecoration:'none' }}>
                            📞 Позвонить грузоотправителю
                          </a>
                        )}
                        {o.driver_id && (
                          <button onClick={() => navigate('/messages')}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8,
                                     background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                            💬 Написать водителю
                          </button>
                        )}
                        {/* FR-25: Подтвердить доставку */}
                        {o.status === 'Забран' && (
                          <button onClick={() => confirmPod(o.id)}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8,
                                     background:'#f0fdf4', border:'1px solid #86efac', color:'#16a34a', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            ✅ Подтвердить доставку
                          </button>
                        )}
                        {/* FR-28: Сообщить об инциденте */}
                        {['Назначен','Забран'].includes(o.status) && (
                          <button onClick={() => setIncidentLoadId(o.id)}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8,
                                     background:'#fff1f2', border:'1px solid #fecaca', color:'#dc2626', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                            ⚠️ Инцидент
                          </button>
                        )}
                        {/* FR-09: Оставить отзыв */}
                        {['Доставлен','Оплачен'].includes(o.status) && o.driver_id && (
                          <button onClick={() => setReviewTarget({ loadId: o.id, userId: o.driver_id, userName: o.driver })}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8,
                                     background:'#fffbeb', border:'1px solid #fde68a', color:'#d97706', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                            ⭐ Оценить водителя
                          </button>
                        )}
                      </div>

                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px 20px', fontSize:12 }}>
                        {[
                          ['Адрес отправки', o.origin_addr],
                          ['Контакт отправки', o.origin_contact],
                          ['Телефон отправки', o.origin_phone],
                          ['Адрес доставки', o.destination_addr],
                          ['Контакт доставки', o.destination_contact],
                          ['Телефон доставки', o.destination_phone],
                          ['Грузоотправитель', o.shipper_name],
                          ['Тел. грузоотправителя', o.shipper_phone],
                          ['Дата доставки', o.destination_date],
                        ].map(([l,v]) => v ? (
                          <div key={l}>
                            <div style={{ color:'#9ca3af', fontSize:10, fontWeight:700, textTransform:'uppercase' }}>{l}</div>
                            <div style={{ fontWeight:600, color:'#374151', marginTop:1 }}>{v}</div>
                          </div>
                        ) : null)}
                      </div>
                      {o.vehicles?.length > 0 && (
                        <div style={{ marginTop:10 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:4 }}>Транспорт</div>
                          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                            {o.vehicles.map((v,i) => (
                              <span key={i} style={{ padding:'3px 10px', borderRadius:8, background:'#f3f4f6', fontSize:12, fontWeight:600 }}>
                                {[v.year, v.make, v.type].filter(Boolean).join(' ')}
                                {v.vin && ` · ${v.vin}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {o.rates?.length > 0 && (
                        <div style={{ marginTop:10 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:4 }}>
                            Ставки{o.distance_km ? ` · ${o.distance_km} км` : ''}
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                            {o.rates.map((r,i) => {
                              const dist = parseFloat(o.distance_km) || 0;
                              const amt  = parseFloat(r.amount) || 0;
                              const perKm = dist > 0 && amt > 0 ? (amt / dist).toFixed(2) : null;
                              return (
                                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, background:'#f9fafb', border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px' }}>
                                  <span style={{ fontWeight:600, color:'#374151' }}>{r.carrier || '—'}</span>
                                  <span style={{ fontWeight:700, color:C.green }}>{r.amount ? `${convert(r.amount).toFixed(0)} ${currencySymbol}` : '—'}</span>
                                  {perKm && <span style={{ color:'#9ca3af' }}>{perKm} {currencySymbol}/км</span>}
                                  {r.note && <span style={{ color:'#6b7280' }}>· {r.note}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {/* Смена статусов */}
                      <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap' }}>
                        {STATUS_TABS.filter(s => s !== o.status && !['Архив','Удалён'].includes(s)).map(s => (
                          <Btn key={s} small onClick={()=>changeStatus(o.id,s)}
                            style={{ borderColor:STATUS_COLORS[s]+'55', color:STATUS_COLORS[s], background:STATUS_COLORS[s]+'11' }}>
                            {s}
                          </Btn>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Форма создания/редактирования ── */}
      {showAdd && (
        <Modal title={editId ? `Редактировать заказ #${editId}` : 'Новый заказ'} onClose={()=>{setShowAdd(false);setEditId(null);setApiError('');}} wide>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>Отправка</div>
              <Field label="Город отправки"  value={form.origin_city}    onChange={f('origin_city')}    placeholder="Минск" required/>
              <Field label="Адрес отправки"  value={form.origin_addr}    onChange={f('origin_addr')}    placeholder="ул. Ленина, 1"/>
              <Field label="Дата отгрузки"   value={form.origin_date}    onChange={f('origin_date')}    type="date"/>
              <Field label="Контакт"         value={form.origin_contact} onChange={f('origin_contact')} placeholder="Иван Иванов"/>
              <Field label="Телефон"         value={form.origin_phone}   onChange={f('origin_phone')}   placeholder="+375 29 ..."/>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>Доставка</div>
              <Field label="Город доставки"  value={form.destination_city}    onChange={f('destination_city')}    placeholder="Москва" required/>
              <Field label="Адрес доставки"  value={form.destination_addr}    onChange={f('destination_addr')}    placeholder="пр. Мира, 5"/>
              <Field label="Дата доставки"   value={form.destination_date}    onChange={f('destination_date')}    type="date"/>
              <Field label="Контакт"         value={form.destination_contact} onChange={f('destination_contact')} placeholder="Мария Сидорова"/>
              <Field label="Телефон"         value={form.destination_phone}   onChange={f('destination_phone')}   placeholder="+7 999 ..."/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px', marginTop:8 }}>
            <Field label="Грузоотправитель"   value={form.shipper_name}  onChange={f('shipper_name')}  placeholder="ООО «Логистика»"/>
            <Field label="Тел. грузоотправителя" value={form.shipper_phone} onChange={f('shipper_phone')} placeholder="+375 17 ..."/>
            <Field label={`Сумма COD (${currencySymbol})`} value={form.cod_amount} onChange={f('cod_amount')} placeholder="1250"/>
            <Field label={`Выплата водителю (${currencySymbol})`} value={form.driverPay} onChange={f('driverPay')} placeholder="1000"/>
          </div>

          {/* Транспортные средства */}
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
              Транспортные средства
            </div>
            {form.vehicles.map((v, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 2fr 1fr auto', gap:8, marginBottom:8, alignItems:'end' }}>
                <Field label="Марка" value={v.make} onChange={val=>setForm(p=>({...p, vehicles:p.vehicles.map((x,j)=>j===i?{...x,make:val}:x)}))} placeholder="Mercedes"/>
                <Field label="Год"   value={v.year} onChange={val=>setForm(p=>({...p, vehicles:p.vehicles.map((x,j)=>j===i?{...x,year:val}:x)}))} placeholder="2022"/>
                <Field label="Тип"   value={v.type} onChange={val=>setForm(p=>({...p, vehicles:p.vehicles.map((x,j)=>j===i?{...x,type:val}:x)}))} placeholder="Седан"/>
                <Field label="VIN"   value={v.vin}  onChange={val=>setForm(p=>({...p, vehicles:p.vehicles.map((x,j)=>j===i?{...x,vin:val}:x)}))}  placeholder="WDD..."/>
                <Field label={`Цена (${currencySymbol})`} value={v.price} onChange={val=>setForm(p=>({...p, vehicles:p.vehicles.map((x,j)=>j===i?{...x,price:val}:x)}))} placeholder="0"/>
                {form.vehicles.length > 1 && (
                  <button onClick={()=>setForm(p=>({...p, vehicles:p.vehicles.filter((_,j)=>j!==i)}))}
                    style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:8, padding:'7px 10px', cursor:'pointer', color:C.red, marginBottom:12 }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={()=>setForm(p=>({...p, vehicles:[...p.vehicles,{make:'',year:'',type:'',vin:'',price:''}]}))}
              style={{ background:'#f9fafb', border:`1px dashed ${C.border}`, borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:13, color:'#6b7280', width:'100%' }}>
              + Добавить ТС
            </button>
          </div>

          {/* Ставки (только для брокера) */}
          {isBroker && (
            <div style={{ marginTop:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:.5 }}>
                  Ставки
                </div>
                <div style={{ fontSize:11, color:'#6b7280' }}>
                  Расстояние подставляется автоматически по городам
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:8, marginBottom:8 }}>
                <Field
                  label="Расстояние (км)"
                  value={form.distance_km}
                  onChange={val=>{ distanceTouched.current = true; setForm(p=>({...p, distance_km:val})); }}
                  type="number"
                  placeholder="Авто по городам отправления и назначения"
                />
              </div>

              {form.rates.map((r, i) => {
                const dist = parseFloat(form.distance_km) || 0;
                const amt  = parseFloat(r.amount) || 0;
                const perKm = dist > 0 && amt > 0 ? (amt / dist).toFixed(2) : null;
                return (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 2fr auto', gap:8, marginBottom:8, alignItems:'end' }}>
                    <Field label="Перевозчик" value={r.carrier}
                      onChange={val=>setForm(p=>({...p, rates:p.rates.map((x,j)=>j===i?{...x,carrier:val}:x)}))}
                      placeholder="ООО «Перевозчик»"/>
                    <Field label={`Ставка (${currencySymbol})`} value={r.amount} type="number"
                      onChange={val=>setForm(p=>({...p, rates:p.rates.map((x,j)=>j===i?{...x,amount:val}:x)}))}
                      placeholder="0"/>
                    <Field label={`Комментарий${perKm?` · ${perKm} ${currencySymbol}/км`:''}`} value={r.note}
                      onChange={val=>setForm(p=>({...p, rates:p.rates.map((x,j)=>j===i?{...x,note:val}:x)}))}
                      placeholder="Условия, срок подачи..."/>
                    {form.rates.length > 1 && (
                      <button onClick={()=>setForm(p=>({...p, rates:p.rates.filter((_,j)=>j!==i)}))}
                        style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:8, padding:'7px 10px', cursor:'pointer', color:C.red, marginBottom:12 }}>✕</button>
                    )}
                  </div>
                );
              })}
              <button onClick={()=>setForm(p=>({...p, rates:[...p.rates,{carrier:'',amount:'',note:''}]}))}
                style={{ background:'#f9fafb', border:`1px dashed ${C.border}`, borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:13, color:'#6b7280', width:'100%' }}>
                + Добавить ставку
              </button>
            </div>
          )}

          {apiError && (
            <div style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:C.red, fontSize:13, marginTop:12 }}>
              {apiError}
            </div>
          )}

          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <Btn variant="primary" onClick={saveOrder} disabled={saving}>
              {saving ? 'Сохранение...' : editId ? 'Обновить заказ' : 'Создать заказ'}
            </Btn>
            <Btn onClick={()=>{setShowAdd(false);setEditId(null);setApiError('');}}>Отмена</Btn>
          </div>
        </Modal>
      )}

      {/* ── Авто-назначение ── */}
      {autoAssignLoadId && (
        <AutoAssignModal
          loadId={autoAssignLoadId}
          onClose={() => setAutoAssignLoadId(null)}
          onAssigned={() => {
            setAutoAssignLoadId(null);
            loadOrders();
          }}
        />
      )}

      {/* ── FR-09: Отзыв о водителе ── */}
      {reviewTarget && (
        <ReviewModal
          targetUserId={reviewTarget.userId}
          targetName={reviewTarget.userName}
          loadId={reviewTarget.loadId}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => setReviewTarget(null)}
        />
      )}

      {/* ── FR-28: Инцидент ── */}
      {incidentLoadId && (
        <IncidentModal
          loadId={incidentLoadId}
          onClose={() => setIncidentLoadId(null)}
          onCreated={() => setIncidentLoadId(null)}
        />
      )}
    </>
  );
}
