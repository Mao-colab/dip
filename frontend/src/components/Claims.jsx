import { useState, useEffect, useCallback } from 'react';
import { claimsApi, exportApi } from '../services/api';
import { useCurrency } from '../hooks/useCurrency';
import {
  IconClaim, IconTrash, IconEdit, IconCheck,
  IconDocument, IconDownload, IconFilter,
} from '../icons';

const C = {
  red: '#dc2626', amber: '#d97706', blue: '#2563eb',
  green: '#059669', purple: '#7c3aed', border: '#e5e7eb', bg: '#f8fafc',
};

const CLAIM_TYPES = [
  { v: 'cargo_damage',  l: 'Повреждение груза' },
  { v: 'delay',         l: 'Задержка доставки' },
  { v: 'non_payment',   l: 'Неоплата' },
  { v: 'document',      l: 'Документальные споры' },
  { v: 'other',         l: 'Прочее' },
];
const STATUSES = ['Новая','На рассмотрении','Принята','Отклонена','Урегулирована','Закрыта'];
const STATUS_COLORS = {
  'Новая':          '#7c3aed', 'На рассмотрении': '#2563eb',
  'Принята':        '#d97706', 'Отклонена':        '#dc2626',
  'Урегулирована':  '#059669', 'Закрыта':          '#9ca3af',
};

function Field({ label, value, onChange, type = 'text', options, placeholder, required, rows }) {
  const s = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box', outline: 'none',
    fontFamily: 'inherit',
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      {rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...s, resize: 'vertical' }} />
        : options
          ? <select value={value} onChange={e => onChange(e.target.value)} style={s}>
              {options.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}
            </select>
          : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s} required={required} />
      }
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, maxWidth: wide ? 680 : 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconClaim size={18} color={C.red} />{title}
          </h3>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, variant = 'default', onClick, small, disabled }) {
  const styles = {
    default: { bg: '#f9fafb', color: '#374151', border: `1px solid ${C.border}` },
    primary: { bg: C.blue,   color: '#fff',    border: 'none' },
    danger:  { bg: '#fff1f2',color: C.red,     border: '1px solid #fecaca' },
    success: { bg: '#f0fdf4',color: C.green,   border: '1px solid #bbf7d0' },
    amber:   { bg: '#fffbeb',color: C.amber,   border: '1px solid #fde68a' },
  }[variant] || { bg: '#f9fafb', color: '#374151', border: `1px solid ${C.border}` };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: small ? '4px 10px' : '8px 16px', borderRadius: 8, border: styles.border,
        background: disabled ? '#f3f4f6' : styles.bg, color: disabled ? '#9ca3af' : styles.color,
        fontSize: small ? 11 : 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 5, opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#9ca3af';
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: color + '22', color, border: `1px solid ${color}44` }}>
      {status}
    </span>
  );
}

const BLANK = { load_id: '', respondent_id: '', type: 'cargo_damage', amount: '', currency: 'BYN', description: '' };
const RESOLVE_BLANK = { resolution: '', status: 'Урегулирована' };

export default function Claims({ user }) {
  const { formatAmount } = useCurrency();
  const [claims, setClaims]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [modal, setModal]       = useState(null); // 'create' | 'view' | 'resolve' | 'edit'
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState(BLANK);
  const [resolveForm, setResolveForm] = useState(RESOLVE_BLANK);
  const [saving, setSaving]     = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType,   setFilterType]   = useState('');

  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  const rf = k => v => setResolveForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await claimsApi.list({ status: filterStatus, type: filterType });
      setClaims(data.claims || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.description || !form.type) return;
    setSaving(true);
    try {
      await claimsApi.create({
        ...form,
        amount:       parseFloat(form.amount) || 0,
        load_id:      form.load_id      ? parseInt(form.load_id)      : undefined,
        respondent_id:form.respondent_id? parseInt(form.respondent_id): undefined,
      });
      setModal(null);
      setForm(BLANK);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResolve(e) {
    e.preventDefault();
    if (!resolveForm.resolution) return;
    setSaving(true);
    try {
      await claimsApi.resolve(selected.id, resolveForm);
      setModal(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(claim, status) {
    try {
      await claimsApi.update(claim.id, { status });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Удалить претензию?')) return;
    try {
      await claimsApi.delete(id);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  function openView(claim) {
    setSelected(claim);
    setModal('view');
  }

  function openResolve(claim) {
    setSelected(claim);
    setResolveForm(RESOLVE_BLANK);
    setModal('resolve');
  }

  const canManage = ['admin', 'dispatcher'].includes(user?.roleKey);
  const totalAmount = claims.reduce((s, c) => s + Number(c.amount || 0), 0);

  return (
    <div style={{ padding: 24, fontFamily: "'DM Sans', sans-serif", maxWidth: 1100, margin: '0 auto' }}>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Всего',          value: total,                                                    color: '#374151' },
          { label: 'Открытых',       value: claims.filter(c => !['Закрыта','Урегулирована'].includes(c.status)).length, color: C.red },
          { label: 'Урегулировано',  value: claims.filter(c => c.status === 'Урегулирована').length,  color: C.green },
          { label: 'Сумма претензий',value: formatAmount(totalAmount),                                color: C.amber },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, fontFamily: "'DM Mono',monospace" }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Тулбар */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Btn variant="primary" onClick={() => { setForm(BLANK); setModal('create'); }}>
          <IconClaim size={14} color="#fff" /> Новая претензия
        </Btn>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, cursor: 'pointer' }}>
          <option value="">Все статусы</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, cursor: 'pointer' }}>
          <option value="">Все типы</option>
          {CLAIM_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <a href={exportApi.claims()} download style={{ textDecoration: 'none' }}>
          <Btn><IconDownload size={14} /> Excel</Btn>
        </a>
      </div>

      {/* Список */}
      {error && <div style={{ background: '#fef2f2', color: C.red, padding: '10px 14px', borderRadius: 10, marginBottom: 16 }}>{error}</div>}
      {loading
        ? <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Загрузка...</div>
        : claims.length === 0
          ? (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center', color: '#9ca3af' }}>
              <IconClaim size={36} color="#d1d5db" />
              <div style={{ fontSize: 15, fontWeight: 600, color: '#6b7280', marginTop: 12 }}>Претензий нет</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Нажмите «Новая претензия», чтобы создать</div>
            </div>
          )
          : (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                    {['#', 'Тип', 'Заявитель', 'Ответчик', 'Сумма', 'Статус', 'Дата', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: C.blue, cursor: 'pointer' }} onClick={() => openView(c)}>#{c.id}</td>
                      <td style={{ padding: '10px 14px' }}>{CLAIM_TYPES.find(t => t.v === c.type)?.l || c.type}</td>
                      <td style={{ padding: '10px 14px' }}>{c.claimant_name || '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#6b7280' }}>{c.respondent_name || '—'}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{formatAmount(c.amount)} {c.currency}</td>
                      <td style={{ padding: '10px 14px' }}><StatusBadge status={c.status} /></td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString('ru-RU')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {canManage && !['Урегулирована','Закрыта'].includes(c.status) && (
                            <Btn small onClick={() => openResolve(c)}>
                              <IconCheck size={12} />
                            </Btn>
                          )}
                          <Btn small variant="danger" onClick={() => handleDelete(c.id)}>
                            <IconTrash size={12} />
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }

      {/* Модал: создать */}
      {modal === 'create' && (
        <Modal title="Новая претензия" onClose={() => setModal(null)}>
          <form onSubmit={handleCreate}>
            <Field label="Тип претензии" value={form.type} onChange={f('type')} options={CLAIM_TYPES} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Сумма претензии" value={form.amount} onChange={f('amount')} type="number" placeholder="0.00" />
              <Field label="Валюта" value={form.currency} onChange={f('currency')} options={['BYN','USD','EUR','RUB']} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="ID заказа (если есть)" value={form.load_id} onChange={f('load_id')} type="number" placeholder="Номер заказа" />
              <Field label="ID ответчика" value={form.respondent_id} onChange={f('respondent_id')} type="number" placeholder="ID пользователя" />
            </div>
            <Field label="Описание претензии" value={form.description} onChange={f('description')} rows={5} placeholder="Подробно опишите суть претензии..." required />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Btn onClick={() => setModal(null)}>Отмена</Btn>
              <Btn variant="primary" disabled={saving}>{saving ? 'Отправка...' : 'Подать претензию'}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Модал: просмотр */}
      {modal === 'view' && selected && (
        <Modal title={`Претензия #${selected.id}`} onClose={() => setModal(null)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Тип',       CLAIM_TYPES.find(t => t.v === selected.type)?.l || selected.type],
              ['Статус',    <StatusBadge status={selected.status} />],
              ['Заявитель', selected.claimant_name],
              ['Ответчик',  selected.respondent_name || '—'],
              ['Сумма',     `${formatAmount(selected.amount)} ${selected.currency}`],
              ['Заказ',     selected.load_id ? `#${selected.load_id}` : '—'],
              ['Маршрут',   selected.origin_city ? `${selected.origin_city} — ${selected.destination_city}` : '—'],
              ['Создана',   new Date(selected.created_at).toLocaleDateString('ru-RU')],
            ].map(([l, v]) => (
              <div key={l} style={{ background: C.bg, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, background: C.bg, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Описание</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{selected.description}</div>
          </div>
          {selected.resolution && (
            <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Резолюция</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{selected.resolution}</div>
              {selected.resolved_at && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Урегулирована: {new Date(selected.resolved_at).toLocaleDateString('ru-RU')} · {selected.resolver_name}</div>}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            {canManage && !['Урегулирована','Закрыта'].includes(selected.status) && (
              <Btn variant="success" onClick={() => { setModal('resolve'); }}>
                <IconCheck size={14} /> Урегулировать
              </Btn>
            )}
            <Btn onClick={() => setModal(null)}>Закрыть</Btn>
          </div>
        </Modal>
      )}

      {/* Модал: резолюция */}
      {modal === 'resolve' && selected && (
        <Modal title={`Урегулировать #${selected.id}`} onClose={() => setModal(null)}>
          <form onSubmit={handleResolve}>
            <Field label="Итоговый статус" value={resolveForm.status} onChange={rf('status')}
              options={['Урегулирована','Принята','Отклонена','Закрыта']} />
            <Field label="Резолюция / решение" value={resolveForm.resolution} onChange={rf('resolution')}
              rows={5} placeholder="Опишите принятое решение..." required />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Btn onClick={() => setModal('view')}>Назад</Btn>
              <Btn variant="success" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить решение'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
