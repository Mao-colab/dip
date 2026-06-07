/**
 * Documents.jsx — Документооборот MT
 * Единый модуль для грузовых и пассажирских документов РБ
 */
import { useState, useMemo } from 'react';
import { useStore, KEYS } from '../hooks/useStore';
import { useMode, M } from '../hooks/useMode';
import { useCurrency } from '../hooks/useCurrency';
import { IconDocument, IconTrash, IconEdit, IconCheck, IconSave, IconDownload } from '../icons';
import { pdfApi } from '../services/api';

const C = { border:'#e5e7eb', bg:'#f8fafc' };

// ─── Типы документов по видам перевозок ─────────────────────────────────────
const DOC_TYPES = [
  { code:'TTN',      label:'ТТН',              desc:'Товарно-транспортная накладная',      color:'#2563eb' },
  { code:'CMR',      label:'CMR-накладная',     desc:'Международная перевозка (КДПГ)',     color:'#7c3aed' },
  { code:'CONTRACT', label:'Договор перевозки', desc:'Договор с грузоотправителем',        color:'#059669' },
  { code:'ACT',      label:'Акт вып. работ',    desc:'Подтверждение выполненной перевозки',color:'#0891b2' },
  { code:'INVOICE',  label:'Счёт-фактура',      desc:'ЭСЧФ для безналичного расчёта',     color:'#d97706' },
  { code:'POA',      label:'Доверенность',      desc:'На управление ТС / получение груза', color:'#6b7280' },
];

const STATUS_OPTS = ['Действующий','На подписании','Просрочен','Отменён','Шаблон'];
const STATUS_COLORS = { 'Действующий':'#16a34a','На подписании':'#d97706','Просрочен':'#dc2626','Отменён':'#6b7280','Шаблон':'#2563eb' };

const BLANK = { title:'', type:'', counterparty:'', number:'', dateIssue:'', dateExpiry:'', status:'Действующий', amount:'', mode:'freight', note:'' };

function Field({ label, value, onChange, placeholder, type='text', options }) {
  const s = { width:'100%', padding:'7px 11px', borderRadius:7, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none' };
  return (
    <div style={{ marginBottom:11 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:3, textTransform:'uppercase', letterSpacing:.4 }}>{label}</label>
      {options ? <select value={value} onChange={e=>onChange(e.target.value)} style={s}>{options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}</select>
               : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s}/>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, padding:26, maxWidth:560, width:'100%', maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:16 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Documents() {
  const { data: docs, add, upd, del } = useStore(KEYS.documents);
  const { mode } = useMode();
  const mc = M[mode];
  const { formatAmount, currencySymbol } = useCurrency();

  const [tab, setTab]         = useState('all');
  const [search, setSearch]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId]   = useState(null);
  const [form, setForm]       = useState({ ...BLANK, mode });
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const types = DOC_TYPES;
  const allTypeOptions = DOC_TYPES.map(t => ({ v: t.code, l: t.label }));

  const filtered = useMemo(() => {
    let list = docs;
    if (tab === 'freight') list = list.filter(d => d.required !== false);
    if (filterStatus) list = list.filter(d => d.status === filterStatus);
    if (search) list = list.filter(d =>
      d.title?.toLowerCase().includes(search.toLowerCase()) ||
      d.counterparty?.toLowerCase().includes(search.toLowerCase()) ||
      d.number?.includes(search)
    );
    return [...list].sort((a,b) => (b.dateIssue||'').localeCompare(a.dateIssue||''));
  }, [docs, tab, filterStatus, search]);

  const stats = useMemo(() => ({
    total:   docs.length,
    expired: docs.filter(d => d.status === 'Просрочен').length,
    signing: docs.filter(d => d.status === 'На подписании').length,
  }), [docs]);

  function save() {
    if (editId) { upd(editId, { ...form }); setEditId(null); }
    else add({ ...form, id: Date.now(), createdAt: new Date().toLocaleDateString('ru-RU') });
    setForm({ ...BLANK, mode }); setShowAdd(false);
  }
  function openEdit(d) { setForm({ ...BLANK, ...d }); setEditId(d.id); setShowAdd(true); }

  // Lookup doc type meta
  function docMeta(code) {
    return DOC_TYPES.find(t => t.code === code) || { color:'#6b7280', label: code };
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', fontFamily:'sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.border}`, padding:'14px 24px 0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:'#111827' }}>Документооборот</h1>
            <p style={{ margin:'2px 0 0', fontSize:12, color:'#9ca3af' }}>Всего: {stats.total} документов</p>
          </div>
          <button onClick={() => { setForm({...BLANK, mode}); setEditId(null); setShowAdd(true); }}
            style={{ background:mc.primary, color:'#fff', border:'none', borderRadius:10, padding:'9px 18px', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            + Документ
          </button>
        </div>

        {/* Статус-баннеры */}
        {(stats.expired > 0 || stats.signing > 0) && (
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            {stats.expired > 0 && (
              <div style={{ padding:'5px 12px', borderRadius:8, background:'#fee2e2', color:'#dc2626', fontSize:12, fontWeight:700 }}>
                Просрочено: {stats.expired}
              </div>
            )}
            {stats.signing > 0 && (
              <div style={{ padding:'5px 12px', borderRadius:8, background:'#fffbeb', color:'#b45309', fontSize:12, fontWeight:700 }}>
                На подписании: {stats.signing}
              </div>
            )}
          </div>
        )}

        {/* Вкладки */}
        <div style={{ display:'flex', gap:0 }}>
          {[{k:'all',label:'Все документы'}].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              padding:'8px 14px', border:'none', background:'transparent', cursor:'pointer', fontSize:13,
              fontWeight: tab===t.k ? 700 : 500, color: tab===t.k ? mc.primary : '#6b7280',
              borderBottom: tab===t.k ? `2.5px solid ${mc.primary}` : '2.5px solid transparent',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', background:C.bg }}>
        {/* Типы документов (справка) */}
        {tab !== 'all' && (
          <div style={{ padding:'16px 24px 0' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>
              Обязательные документы ({tab === 'freight' ? 'грузовые' : 'пассажирские'}):
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:4 }}>
              {DOC_TYPES.filter(t=>t.required).map(t => (
                <div key={t.code} style={{ padding:'4px 10px', borderRadius:8, background:t.color+'15', border:`1px solid ${t.color}30`, fontSize:11, fontWeight:700, color:t.color }}>
                  {t.label} — {t.desc}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Генерация PDF по номеру заказа */}
        <div style={{ padding:'12px 24px 0', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:12, fontWeight:700, color:'#6b7280' }}>PDF по заказу:</span>
          <input id="_pdf_load_id" type="number" placeholder="Номер заказа" style={{ width:130, padding:'6px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, outline:'none' }} />
          {[['ТТН', 'ttn'],['CMR', 'cmr'],['Счёт', 'invoice']].map(([l, t]) => (
            <button key={t} onClick={() => {
              const id = document.getElementById('_pdf_load_id')?.value;
              if (!id) return alert('Введите номер заказа');
              window.open(pdfApi[t](id) + '?token=' + localStorage.getItem('mt_token'), '_blank');
            }} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              <IconDownload size={12} /> {l}
            </button>
          ))}
        </div>

        {/* Поиск и фильтры */}
        <div style={{ padding:'12px 24px', display:'flex', gap:8, flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по названию, контрагенту, номеру..."
            style={{ flex:'1 1 200px', padding:'7px 13px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, outline:'none' }}/>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{ padding:'7px 11px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, background:'#fff' }}>
            <option value=''>Все статусы</option>
            {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
          </select>
          {(search || filterStatus) && (
            <button onClick={()=>{setSearch('');setFilterStatus('');}} style={{ padding:'7px 12px', borderRadius:9, border:`1px solid ${C.border}`, background:'#fff', fontSize:12, color:'#6b7280', cursor:'pointer' }}>Сбросить</button>
          )}
        </div>

        {/* Список документов */}
        <div style={{ padding:'0 24px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'#9ca3af' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}><IconDocument size={40} color="#d1d5db"/></div>
              <div style={{ fontSize:14, fontWeight:600, color:'#374151', marginBottom:6 }}>Нет документов</div>
              <div style={{ fontSize:13 }}>Добавьте первый документ для начала работы</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filtered.map(d => {
                const meta = docMeta(d.type);
                return (
                  <div key={d.id} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:9, background:meta.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <IconDocument size={18} color={meta.color}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                        <span style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{d.title || meta.label}</span>
                        <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:12, background:meta.color+'18', color:meta.color }}>{meta.label}</span>

                      </div>
                      <div style={{ fontSize:12, color:'#6b7280' }}>
                        {d.counterparty && <span>{d.counterparty} · </span>}
                        {d.number && <span>№{d.number} · </span>}
                        {d.dateExpiry && <span>до {d.dateExpiry}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:12, background:(STATUS_COLORS[d.status]||'#6b7280')+'18', color:STATUS_COLORS[d.status]||'#6b7280' }}>
                        {d.status}
                      </span>
                      {d.amount && <span style={{ fontSize:12, fontWeight:600, color:'#7c3aed' }}>{formatAmount(d.amount)}</span>}
                    </div>
                    <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                      <button onClick={()=>openEdit(d)} style={{ padding:'4px 8px', borderRadius:6, border:`1px solid ${C.border}`, background:'#f9fafb', cursor:'pointer', fontSize:12, color:'#374151' }}><IconEdit size={13}/></button>
                      <button onClick={()=>del(d.id)} style={{ padding:'4px 8px', borderRadius:6, border:'1px solid #fecaca', background:'#fff1f2', cursor:'pointer', color:'#dc2626' }}><IconTrash size={13}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <Modal title={editId ? 'Редактировать документ' : 'Новый документ'} onClose={()=>{setShowAdd(false);setEditId(null);}}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>

            <Field label="Тип документа" value={form.type} onChange={f('type')}
              options={[{v:'',l:'— Выберите тип —'}, ...DOC_TYPES.map(t=>({v:t.code,l:t.label}))]}/>
            <Field label="Название" value={form.title} onChange={f('title')} placeholder="Договор перевозки №123"/>
            <Field label="Контрагент / организация" value={form.counterparty} onChange={f('counterparty')} placeholder="ООО «Транспорт»"/>
            <Field label="Номер документа" value={form.number} onChange={f('number')} placeholder="123/2025"/>
            <Field label="Дата выдачи" value={form.dateIssue} onChange={f('dateIssue')} type="date"/>
            <Field label="Срок действия" value={form.dateExpiry} onChange={f('dateExpiry')} type="date"/>
            <Field label="Статус" value={form.status} onChange={f('status')} options={STATUS_OPTS}/>
            <Field label={`Сумма (${currencySymbol})`} value={form.amount} onChange={f('amount')} placeholder="0"/>
          </div>
          <Field label="Примечание" value={form.note} onChange={f('note')} placeholder="Доп. условия, особые отметки..."/>
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <button onClick={save} style={{ flex:1, background:mc.primary, color:'#fff', border:'none', borderRadius:10, padding:'10px 0', fontWeight:700, fontSize:14, cursor:'pointer' }}>Сохранить</button>
            <button onClick={()=>setShowAdd(false)} style={{ padding:'10px 20px', borderRadius:10, border:`1px solid ${C.border}`, background:'#f9fafb', fontSize:14, cursor:'pointer' }}>Отмена</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
