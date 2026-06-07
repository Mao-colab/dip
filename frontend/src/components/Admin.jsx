import { IconStaff, IconTruck, IconSettings, IconCheck, IconBlock, IconTrash, IconCompany, IconSave, IconKey, BynSign, IconShield, IconDownload, IconFilter, IconClock } from '../icons';
import { useState, useEffect, useCallback } from 'react';
import { useStore, KEYS } from '../hooks/useStore';
import { useCurrency, CURRENCIES } from '../hooks/useCurrency';
import { verificationApi, auditApi } from '../services/api';

const C = { blue:'#2563eb', green:'#16a34a', red:'#dc2626', amber:'#d97706', purple:'#7c3aed', gray:'#6b7280', border:'#e5e7eb', bg:'#f8fafc' };

function Avatar({ initials, color, size=36 }) {
  return <div style={{ width:size, height:size, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:size*0.34, flexShrink:0, border:'2px solid #fff', boxShadow:'0 1px 4px rgba(0,0,0,0.13)' }}>{initials}</div>;
}
function StatusBadge({ status }) {
  const map = { 'Активен':{bg:'#dcfce7',color:'#16a34a'}, 'Заблокирован':{bg:'#fee2e2',color:'#dc2626'}, 'В ремонте':{bg:'#fef9c3',color:'#ca8a04'}, 'Неактивен':{bg:'#f3f4f6',color:'#6b7280'} };
  const s = map[status]||map['Неактивен'];
  return <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:s.bg, color:s.color, whiteSpace:'nowrap' }}>{status}</span>;
}
function Btn({ children, variant='default', onClick, small }) {
  const vs = { default:{bg:'#f9fafb',color:'#374151',border:'1px solid #e5e7eb'}, primary:{bg:C.blue,color:'#fff',border:'none'}, ghost:{bg:'transparent',color:C.blue,border:`1px solid ${C.blue}`}, danger:{bg:'#fff1f2',color:C.red,border:'1px solid #fecaca'} };
  const v = vs[variant]||vs.default;
  return <button onClick={onClick} style={{ padding:small?'4px 10px':'7px 16px', borderRadius:8, border:v.border, background:v.bg, color:v.color, fontSize:small?11:13, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, flexShrink:0 }}>{children}</button>;
}
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, maxWidth:480, width:'100%', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.18)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:16 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, placeholder, type='text', value='', onChange }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:0.4 }}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, outline:'none', boxSizing:'border-box' }} />
    </div>
  );
}

// ── Сотрудники ──────────────────────────────────────────────────────────────
function StaffSection() {
  const { data: staff, add: addStaff, del: delStaff, upd: updStaff } = useStore(KEYS.staff);
  const [search, setSearch]   = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name:'', phone:'', email:'', role:'Диспетчер', password:'' });
  const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#be185d','#0891b2'];
  function getColor(name='') { let h=0; for(let c of name) h+=c.charCodeAt(0); return COLORS[h%COLORS.length]; }

  function handleAddStaff() {
    const initials = form.name.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase()||'??';
    addStaff({ ...form, id:Date.now(), initials, color:getColor(form.name), status:'Активен', loads:0, createdAt:new Date().toLocaleDateString('ru-RU') });
    setForm({ name:'', phone:'', email:'', role:'Диспетчер', password:'' }); setShowAdd(false);
  }
  function toggleBlock(id) { updStaff(id, { status: staff.find(s=>s.id===id)?.status==='Заблокирован'?'Активен':'Заблокирован' }); }

  const filtered = staff.filter(s=>!search||s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'14px 24px', background:'#fff', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:'#111827', flex:1 }}>Управление сотрудниками</h1>
        <Btn variant="primary" onClick={()=>setShowAdd(true)}>+ Добавить</Btn>
      </div>
      <div style={{ padding:'10px 24px', background:'#fff', borderBottom:`1px solid ${C.border}`, display:'flex', gap:10 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по имени..." style={{ flex:1, padding:'8px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, outline:'none' }} />
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {filtered.length===0 ? (
          <div style={{ padding:'60px 20px', textAlign:'center', color:'#9ca3af' }}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><IconStaff size={40} color="#d1d5db"/></div>
            <div style={{ fontSize:14 }}>{staff.length===0?'Нет сотрудников. Нажмите «+ Добавить»':'Сотрудники не найдены'}</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:C.bg }}>
                {['Сотрудник','Роль','Телефон','Email','Статус','Создан',''].map(h=>(
                  <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap', borderBottom:`2px solid ${C.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(s=>(
                  <tr key={s.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:'11px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <Avatar initials={s.initials} color={s.status==='Заблокирован'?'#9ca3af':s.color} size={34} />
                        <span style={{ fontWeight:600, color:'#111827' }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'11px 16px', color:'#6b7280' }}>{s.role}</td>
                    <td style={{ padding:'11px 16px', color:'#6b7280' }}>{s.phone||'—'}</td>
                    <td style={{ padding:'11px 16px', color:'#6b7280' }}>{s.email||'—'}</td>
                    <td style={{ padding:'11px 16px' }}><StatusBadge status={s.status} /></td>
                    <td style={{ padding:'11px 16px', color:'#9ca3af', fontSize:11 }}>{s.createdAt}</td>
                    <td style={{ padding:'11px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <Btn small onClick={()=>toggleBlock(s.id)}>{s.status==='Заблокирован'?<IconCheck size={13}/>:<IconBlock size={13}/>}</Btn>
                        <Btn small variant="danger" onClick={()=>delStaff(s.id)}><IconTrash size={13}/></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showAdd && (
        <Modal title="Добавить сотрудника" onClose={()=>setShowAdd(false)}>
          <Field label="Полное имя" placeholder="Иван Иванович Иванов" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
          <Field label="Телефон" placeholder="+375 29 000-00-00" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
          <Field label="Email" placeholder="ivan@mt.by" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:0.4 }}>Роль</label>
            <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13 }}>
              <option>Главный диспетчер</option><option>Диспетчер</option><option>Водитель</option>
            </select>
          </div>
          <Field label="Временный пароль" placeholder="Пароль" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <Btn variant="primary" onClick={handleAddStaff}>Сохранить</Btn>
            <Btn onClick={()=>setShowAdd(false)}>Отмена</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Техника ──────────────────────────────────────────────────────────────────
function FleetSection({ type }) {
  const isTruck = type==='truck';
  const storeKey = isTruck ? KEYS.trucks : KEYS.trailers;
  const { data: items, add: addItem, del: delItem } = useStore(storeKey);
  const [search, setSearch]   = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const BLANK = { name:'', year:'', vin:'', plate:'', driver:'', mileage:'', status:'Активен' };
  const [form, setForm]       = useState(BLANK);

  function handleAddItem() { addItem({...form,id:Date.now()}); setForm(BLANK); setShowAdd(false); }

  const filtered = items.filter(i=>!search||i.name.toLowerCase().includes(search.toLowerCase())||(i.plate||'').toLowerCase().includes(search.toLowerCase()));
  const stats = [['Всего',items.length,C.blue],['Активны',items.filter(i=>i.status==='Активен').length,C.green],['В ремонте',items.filter(i=>i.status==='В ремонте').length,C.amber],['Неактивны',items.filter(i=>i.status==='Неактивен').length,C.gray]];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'14px 24px', background:'#fff', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12 }}>
        <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:'#111827', flex:1 }}>{isTruck?'Грузовики':'Прицепы'}</h1>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск..." style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, outline:'none', width:160 }} />
        <Btn variant="primary" onClick={()=>setShowAdd(true)}>+ Добавить</Btn>
      </div>
      <div style={{ display:'flex', gap:12, padding:'12px 24px', background:'#fff', borderBottom:`1px solid ${C.border}`, flexWrap:'wrap' }}>
        {stats.map(([l,v,c])=>(
          <div key={l} style={{ padding:'8px 16px', background:C.bg, borderRadius:10, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:'#9ca3af', fontWeight:700, textTransform:'uppercase' }}>{l}</div>
            <div style={{ fontSize:18, fontWeight:800, color:c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {filtered.length===0 ? (
          <div style={{ padding:'60px 20px', textAlign:'center', color:'#9ca3af' }}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><IconTruck size={40} color="#d1d5db"/></div>
            <div style={{ fontSize:14 }}>{items.length===0?'Нет записей. Нажмите «+ Добавить»':'Ничего не найдено'}</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:C.bg }}>
                {(isTruck?['Наименование','Год','Гос. номер','VIN','Водитель','Пробег','Статус','']:['Наименование','Год','Гос. номер','VIN','Статус','']).map(h=>(
                  <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', whiteSpace:'nowrap', borderBottom:`2px solid ${C.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(item=>(
                  <tr key={item.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:'11px 16px', fontWeight:600 }}>{item.name}</td>
                    <td style={{ padding:'11px 16px', color:'#6b7280' }}>{item.year||'—'}</td>
                    <td style={{ padding:'11px 16px', fontWeight:600, color:C.blue }}>{item.plate||'—'}</td>
                    <td style={{ padding:'11px 16px', color:'#9ca3af', fontSize:11 }}>{item.vin||'—'}</td>
                    {isTruck && <><td style={{ padding:'11px 16px' }}>{item.driver||'—'}</td><td style={{ padding:'11px 16px', color:'#9ca3af', fontSize:12 }}>{item.mileage||'—'}</td></>}
                    <td style={{ padding:'11px 16px' }}><StatusBadge status={item.status} /></td>
                    <td style={{ padding:'11px 16px' }}><Btn small variant="danger" onClick={()=>delItem(item.id)}><IconTrash size={13}/></Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showAdd && (
        <Modal title={isTruck?'Добавить грузовик':'Добавить прицеп'} onClose={()=>setShowAdd(false)}>
          <Field label="Наименование" placeholder={isTruck?'МАЗ-5440А9':'Schmitz Cargobull'} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
          <Field label="Год выпуска" placeholder="2021" type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})} />
          <Field label="VIN" placeholder="YOD5440A9P0001234" value={form.vin} onChange={e=>setForm({...form,vin:e.target.value})} />
          <Field label="Гос. номер (РБ)" placeholder="1234 АВ-7" value={form.plate} onChange={e=>setForm({...form,plate:e.target.value})} />
          {isTruck && <><Field label="Водитель" placeholder="Иван Иванов" value={form.driver} onChange={e=>setForm({...form,driver:e.target.value})} /><Field label="Пробег" placeholder="50 000 км" value={form.mileage} onChange={e=>setForm({...form,mileage:e.target.value})} /></>}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4, textTransform:'uppercase' }}>Статус</label>
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13 }}>
              <option>Активен</option><option>В ремонте</option><option>Неактивен</option>
            </select>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Btn variant="primary" onClick={handleAddItem}>Сохранить</Btn>
            <Btn onClick={()=>setShowAdd(false)}>Отмена</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Роли и права (редактируемые) ─────────────────────────────────────────────
const ROLE_LABELS = {
  dispatcher: { label: 'Диспетчер',     color: '#2563eb' },
  broker:     { label: 'Брокер',         color: '#7c3aed' },
  carrier:    { label: 'Перевозчик',     color: '#0891b2' },
  driver:     { label: 'Водитель',       color: '#ea580c' },
  admin:      { label: 'Администратор',  color: '#059669' },
};

const PERMISSIONS = [
  { key: 'tracking',    label: 'Трекинг (карта)' },
  { key: 'orders',      label: 'Заказы' },
  { key: 'messages',    label: 'Сообщения' },
  { key: 'contacts',    label: 'Контакты' },
  { key: 'accounting',  label: 'Бухгалтерия' },
  { key: 'claims',      label: 'Претензии' },
  { key: 'rates',       label: 'Ставки' },
  { key: 'documents',   label: 'Документы' },
  { key: 'legislation', label: 'Законодательство' },
  { key: 'analytics',   label: 'Аналитика' },
  { key: 'portal',      label: 'Портал клиента' },
  { key: 'admin',       label: 'Настройки системы' },
];

const DEFAULT_PERMS = {
  dispatcher: { tracking:true,  orders:true,  messages:true,  contacts:true,  accounting:true,  claims:true,  rates:true,  documents:true,  legislation:true,  analytics:true,  portal:false, admin:false },
  broker:     { tracking:true,  orders:true,  messages:true,  contacts:true,  accounting:true,  claims:true,  rates:true,  documents:true,  legislation:true,  analytics:false, portal:false, admin:false },
  carrier:    { tracking:true,  orders:true,  messages:true,  contacts:true,  accounting:false, claims:true,  rates:false, documents:true,  legislation:true,  analytics:false, portal:false, admin:false },
  driver:     { tracking:true,  orders:true,  messages:true,  contacts:false, accounting:false, claims:false, rates:false, documents:true,  legislation:false, analytics:false, portal:false, admin:false },
  client:     { tracking:false, orders:false, messages:false, contacts:false, accounting:false, claims:false, rates:false, documents:false, legislation:false, analytics:false, portal:true,  admin:false },
  admin:      { tracking:true,  orders:true,  messages:true,  contacts:true,  accounting:true,  claims:true,  rates:true,  documents:true,  legislation:true,  analytics:true,  portal:true,  admin:true  },
};

function RolesSection() {
  const [perms, setPerms] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mt_roles_config') || 'null') || DEFAULT_PERMS;
    } catch { return DEFAULT_PERMS; }
  });
  const [saved, setSaved] = useState(false);

  function toggle(role, perm) {
    if (role === 'admin' && perm === 'admin') return; // Нельзя снять у admin
    setPerms(p => ({
      ...p,
      [role]: { ...p[role], [perm]: !p[role][perm] },
    }));
  }

  function save() {
    localStorage.setItem('mt_roles_config', JSON.stringify(perms));
    window.dispatchEvent(new Event('mt:roleschange'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function reset() {
    setPerms(DEFAULT_PERMS);
    localStorage.removeItem('mt_roles_config');
    setSaved(false);
  }

  const roles = Object.keys(ROLE_LABELS);

  return (
    <div style={{ padding:'20px 24px', overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h1 style={{ margin:0, fontSize:18, fontWeight:800 }}>Роли и права доступа</h1>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={reset} style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'#f9fafb', fontSize:13, cursor:'pointer' }}>Сбросить</button>
          <button onClick={save} style={{ padding:'8px 18px', borderRadius:8, border:'none', background: saved?C.green:C.blue, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            {saved ? '✓ Сохранено' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#92400e', lineHeight:1.5 }}>
        Изменения прав вступают в силу при следующем переходе по разделам. Права администратора на «Настройки» нельзя отключить.
      </div>

      <div style={{ overflowX:'auto', background:'#fff', borderRadius:14, border:`1px solid ${C.border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:C.bg }}>
              <th style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', borderBottom:`2px solid ${C.border}` }}>Раздел / Право</th>
              {roles.map(r => (
                <th key={r} style={{ padding:'12px 20px', textAlign:'center', borderBottom:`2px solid ${C.border}`, minWidth:120 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:ROLE_LABELS[r].color }}>{ROLE_LABELS[r].label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm, i) => (
              <tr key={perm.key} style={{ borderBottom: i<PERMISSIONS.length-1?`1px solid ${C.border}`:'none', background:i%2===0?'#fff':C.bg }}>
                <td style={{ padding:'11px 20px', fontSize:13, color:'#374151', fontWeight:500 }}>{perm.label}</td>
                {roles.map(r => {
                  const checked = perms[r]?.[perm.key] ?? false;
                  const locked  = r === 'admin' && perm.key === 'admin';
                  return (
                    <td key={r} style={{ padding:'11px 20px', textAlign:'center' }}>
                      <div
                        onClick={() => !locked && toggle(r, perm.key)}
                        style={{
                          width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? ROLE_LABELS[r].color : '#d1d5db'}`,
                          background: checked ? ROLE_LABELS[r].color : '#fff',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          cursor: locked ? 'not-allowed' : 'pointer', transition: 'all .15s',
                          opacity: locked ? 0.7 : 1,
                        }}
                      >
                        {checked && (
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <path d="M1.5 5.5L4 8L9.5 2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Компания и валюта ─────────────────────────────────────────────────────────
function CompanySection() {
  const { currency, setCurrency, rates, ratesDate } = useCurrency();
  const [saved, setSaved]   = useState(false);
  const [form, setForm]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('mt_company') || 'null') || { name:'', unp:'', okpo:'', address:'', phone:'', email:'', website:'' }; }
    catch { return { name:'', unp:'', okpo:'', address:'', phone:'', email:'', website:'' }; }
  });
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  function save() {
    localStorage.setItem('mt_company', JSON.stringify(form));
    setSaved(true);
    setTimeout(()=>setSaved(false), 2500);
  }

  return (
    <div style={{ padding:'20px 24px', overflowY:'auto', maxWidth:700 }}>
      <h1 style={{ margin:'0 0 20px', fontSize:18, fontWeight:800 }}>Настройки компании</h1>

      {/* Валюта */}
      <div style={{ background:'#fff', borderRadius:14, border:`1px solid ${C.border}`, padding:24, marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
        <p style={{ margin:'0 0 14px', fontSize:12, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:0.5 }}>Валюта платформы</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10 }}>
          {CURRENCIES.map(cur => (
            <button key={cur.code} onClick={() => setCurrency(cur.code)} style={{
              padding:'12px 8px', borderRadius:10, cursor:'pointer', textAlign:'center',
              border:`2px solid ${currency===cur.code ? C.blue : C.border}`,
              background: currency===cur.code ? '#eff6ff' : '#f9fafb',
            }}>
              <div style={{ fontSize:20, fontWeight:800, color: currency===cur.code?C.blue:'#374151', display:'flex', alignItems:'center', justifyContent:'center', height:28 }}>
                {cur.code === 'BYN'
                  ? <BynSign size={20} color={currency===cur.code?C.blue:'#374151'}/>
                  : cur.symbol}
              </div>
              <div style={{ fontSize:11, fontWeight:700, color: currency===cur.code?C.blue:'#6b7280', marginTop:4 }}>{cur.code}</div>
              <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>{cur.label}</div>
            </button>
          ))}
        </div>
        {ratesDate && (
          <p style={{ margin:'12px 0 0', fontSize:11, color:'#9ca3af' }}>
            Курс Нацбанка РБ от {ratesDate}: 1 USD = {rates.USD?.toFixed(4)} Br · 1 EUR = {rates.EUR?.toFixed(4)} Br · 100 RUB = {rates.RUB ? (rates.RUB * 100).toFixed(4) : '—'} Br
          </p>
        )}
        <p style={{ margin:'6px 0 0', fontSize:12, color:'#9ca3af' }}>
          Выбрана: <strong style={{ color: C.blue }}>{CURRENCIES.find(c=>c.code===currency)?.label || currency}</strong>. Суммы пересчитываются автоматически.
        </p>
      </div>

      {/* Реквизиты */}
      <div style={{ background:'#fff', borderRadius:14, border:`1px solid ${C.border}`, padding:24, marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
        <p style={{ margin:'0 0 16px', fontSize:12, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:0.5 }}>Реквизиты организации (РБ)</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
          {[['name','Название','ООО «МоёТранспортноеАгентство»'],['unp','УНП','190123456'],['okpo','ОКПО','12345678'],['phone','Телефон','+375 17 000-00-00'],['email','Email','office@mt.by'],['website','Сайт','www.mt.by']].map(([k,l,ph])=>(
            <div key={k} style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:0.4 }}>{l}</label>
              <input placeholder={ph} value={form[k]||''} onChange={f(k)} style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, outline:'none', boxSizing:'border-box' }} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:0.4 }}>Юридический адрес</label>
          <input placeholder="220000, г. Минск, ул. Ленина, 1, оф. 1" value={form.address||''} onChange={f('address')} style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, outline:'none', boxSizing:'border-box' }} />
        </div>
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <button onClick={save} style={{ padding:'10px 24px', borderRadius:10, border:'none', background: saved?C.green:C.blue, color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>
          {saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

// ── Верификация перевозчиков ──────────────────────────────────────────────────
const DOC_TYPE_LABELS = {
  license:      'Лицензия на перевозки',
  insurance:    'Страховой полис',
  vehicle_cert: 'Техпаспорт ТС',
  medical:      'Медицинская справка',
  adr:          'ADR-свидетельство',
  other:        'Прочий документ',
};
const DOC_STATUS_COLORS = {
  pending:  '#d97706', verified: '#059669', expired: '#dc2626', rejected: '#6b7280',
};
const DOC_STATUS_LABELS = {
  pending: 'На проверке', verified: 'Верифицирован', expired: 'Истёк срок', rejected: 'Отклонён',
};

function VerificationSection() {
  const [userId, setUserId]   = useState('');
  const [docs, setDocs]       = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ doc_type:'license', doc_number:'', issued_by:'', issued_at:'', expires_at:'', notes:'' });
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  async function loadDocs() {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await verificationApi.list(userId);
      setDocs(data.docs || []);
      setExpiring(data.expiringSoon || []);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await verificationApi.add(userId, form);
      setModal(false);
      loadDocs();
    } catch (e) { alert(e.message); }
  }

  async function handleVerify(docId) {
    try {
      await verificationApi.verify(docId);
      loadDocs();
    } catch (e) { alert(e.message); }
  }

  async function handleDelete(docId) {
    if (!window.confirm('Удалить документ?')) return;
    try {
      await verificationApi.delete(docId);
      loadDocs();
    } catch (e) { alert(e.message); }
  }

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
      <h1 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconShield size={20} color={C.green} /> Верификация перевозчиков
      </h1>

      {expiring.length > 0 && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
          <strong>⚠ Истекают в ближайшие 30 дней:</strong> {expiring.map(d => `${DOC_TYPE_LABELS[d.doc_type]} (до ${d.expires_at})`).join(', ')}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="ID пользователя (водителя/перевозчика)"
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none' }} />
        <button onClick={loadDocs} disabled={!userId || loading}
          style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: C.blue, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: !userId ? 0.5 : 1 }}>
          Загрузить
        </button>
        {userId && docs.length >= 0 && (
          <button onClick={() => setModal(true)}
            style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            + Добавить документ
          </button>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Загрузка...</div>}

      {!loading && docs.length > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                {['Тип', 'Номер', 'Кем выдан', 'Выдан', 'Действует до', 'Статус', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map((d, i) => {
                const color = DOC_STATUS_COLORS[d.status] || '#6b7280';
                const isExpiringSoon = expiring.some(e => e.id === d.id);
                return (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}`, background: isExpiringSoon ? '#fef9c3' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{DOC_TYPE_LABELS[d.doc_type] || d.doc_type}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>{d.doc_number || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>{d.issued_by || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{d.issued_at || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: isExpiringSoon ? '#d97706' : undefined, fontWeight: isExpiringSoon ? 700 : 400 }}>{d.expires_at || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: color + '18', color, border: `1px solid ${color}40` }}>
                        {DOC_STATUS_LABELS[d.status] || d.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {d.status === 'pending' && (
                          <button onClick={() => handleVerify(d.id)} title="Верифицировать"
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', color: C.green, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                            <IconCheck size={12} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(d.id)}
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff1f2', color: C.red, cursor: 'pointer' }}>
                          <IconTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800 }}>Добавить документ</h3>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Тип документа</label>
                <select value={form.doc_type} onChange={e => f('doc_type')(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }}>
                  {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {[['doc_number','Номер документа','АМ 1234567'],['issued_by','Кем выдан','ГАИ ГУВД г. Минска'],['issued_at','Дата выдачи','','date'],['expires_at','Действует до','','date'],['notes','Примечания','']].map(([k,l,ph,tp]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>{l}</label>
                  <input type={tp || 'text'} value={form[k]} onChange={e => f(k)(e.target.value)} placeholder={ph}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: C.blue, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Сохранить</button>
                <button type="button" onClick={() => setModal(false)} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#f9fafb', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Аудит-лог ─────────────────────────────────────────────────────────────────
function AuditSection() {
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [filters, setFilters]   = useState({ action: '', entity_type: '', date_from: '', date_to: '' });
  const ff = k => v => setFilters(p => ({ ...p, [k]: v }));

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditApi.list(filters);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const ACTION_COLORS = {
    create: '#059669', update: '#2563eb', delete: '#dc2626',
    login:  '#7c3aed', resolve: '#d97706',
  };

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
      <h1 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconClock size={20} color="#6b7280" /> Аудит-лог
      </h1>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Всего записей: <strong style={{ color: '#374151' }}>{total}</strong></div>

      {/* Фильтры */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={filters.action} onChange={e => ff('action')(e.target.value)} placeholder="Действие (create, update...)"
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, outline: 'none', width: 180 }} />
        <input value={filters.entity_type} onChange={e => ff('entity_type')(e.target.value)} placeholder="Сущность (load, claim...)"
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, outline: 'none', width: 180 }} />
        <input type="date" value={filters.date_from} onChange={e => ff('date_from')(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, outline: 'none' }} />
        <input type="date" value={filters.date_to} onChange={e => ff('date_to')(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, outline: 'none' }} />
      </div>

      {loading
        ? <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Загрузка...</div>
        : logs.length === 0
          ? <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center', color: '#9ca3af' }}>Нет записей по заданным фильтрам</div>
          : (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                    {['Время', 'Пользователь', 'Действие', 'Сущность', 'ID', 'IP'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => {
                    const actionColor = ACTION_COLORS[log.action] || '#6b7280';
                    return (
                      <tr key={log.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '9px 14px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString('ru-RU')}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{log.user_name || '—'}</div>
                          <div style={{ fontSize: 10, color: '#9ca3af' }}>{log.user_role}</div>
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: actionColor + '18', color: actionColor }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '9px 14px', color: '#6b7280' }}>{log.entity_type}</td>
                        <td style={{ padding: '9px 14px', color: '#9ca3af' }}>{log.entity_id || '—'}</td>
                        <td style={{ padding: '9px 14px', color: '#9ca3af', fontSize: 11 }}>{log.ip_address || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
      }
    </div>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────────
const SECTIONS = [
  { key:'staff',        label:'Сотрудники',   group:'АДМИНИСТРИРОВАНИЕ' },
  { key:'trucks',       label:'Грузовики',     group:'АДМИНИСТРИРОВАНИЕ' },
  { key:'trailers',     label:'Прицепы',       group:'АДМИНИСТРИРОВАНИЕ' },
  { key:'verification', label:'Верификация',   group:'АДМИНИСТРИРОВАНИЕ' },
  { key:'audit',        label:'Аудит-лог',     group:'АДМИНИСТРИРОВАНИЕ' },
  { key:'roles',        label:'Роли и права',  group:'НАСТРОЙКИ' },
  { key:'company',      label:'Компания',      group:'НАСТРОЙКИ' },
];

export default function Admin() {
  const [section, setSection] = useState('staff');
  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden', fontFamily:'sans-serif' }}>
      <aside style={{ width:200, flexShrink:0, background:'#fff', borderRight:`1px solid ${C.border}`, paddingTop:8, overflowY:'auto' }}>
        {['АДМИНИСТРИРОВАНИЕ','НАСТРОЙКИ'].map(group=>(
          <div key={group}>
            <div style={{ padding:'10px 16px 6px', fontSize:10, fontWeight:700, color:'#d1d5db', textTransform:'uppercase', letterSpacing:1 }}>{group}</div>
            {SECTIONS.filter(s=>s.group===group).map(s=>(
              <button key={s.key} onClick={()=>setSection(s.key)} style={{ display:'flex', alignItems:'center', width:'100%', padding:'9px 16px', border:'none', background:section===s.key?'#eff6ff':'transparent', color:section===s.key?C.blue:'#374151', fontSize:13, fontWeight:section===s.key?700:500, cursor:'pointer', textAlign:'left', borderLeft:`3px solid ${section===s.key?C.blue:'transparent'}` }}>
                {s.label}
              </button>
            ))}
          </div>
        ))}
      </aside>
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {section==='staff'        && <StaffSection />}
        {section==='trucks'       && <FleetSection type="truck" />}
        {section==='trailers'     && <FleetSection type="trailer" />}
        {section==='verification' && <VerificationSection />}
        {section==='audit'        && <AuditSection />}
        {section==='roles'        && <RolesSection />}
        {section==='company'      && <CompanySection />}
      </div>
    </div>
  );
}
