import { IconMessages, IconPerson, IconContacts, IconTrash, IconPin } from '../icons';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, KEYS } from '../hooks/useStore';
import { usersExtApi } from '../services/api';

function Stars({ rating, size=13 }) {
  return <span style={{ fontSize:size, letterSpacing:1 }}>{[1,2,3,4,5].map(s=><span key={s} style={{ color:s<=Math.round(rating)?'#f59e0b':'#e5e7eb' }}>★</span>)}</span>;
}
function Avatar({ initials, color, size=44 }) {
  return (
    <div style={{ position:'relative', display:'inline-flex', flexShrink:0 }}>
      <div style={{ width:size, height:size, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:size*0.33, border:'2.5px solid #fff', boxShadow:'0 2px 8px rgba(0,0,0,0.13)' }}>{initials}</div>
    </div>
  );
}
function Field({ label, value, onChange, placeholder, type='text', options }) {
  const s = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, boxSizing:'border-box', outline:'none' };
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:0.4 }}>{label}</label>
      {options ? <select value={value} onChange={e=>onChange(e.target.value)} style={s}>{options.map(o=><option key={o}>{o}</option>)}</select>
               : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s} />}
    </div>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, maxWidth:500, width:'100%', maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:16 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const ROLES = ['Перевозчик','Диспетчер','Водитель','Другое'];
const BLANK = { name:'', role:'Перевозчик', phone:'', email:'', city:'', rating:5, notes:'' };
const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#be185d','#0891b2'];
function getColor(name) { let h=0; for(let c of name) h+=c.charCodeAt(0); return COLORS[h%COLORS.length]; }

export default function Contacts() {
  const navigate = useNavigate();
  const [section, setSection]   = useState('catalog');
  const { data: contacts, add: addContactStore, upd: updContact, del: delContactStore } = useStore(KEYS.contacts);
  const [catalog, setCatalog]   = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  useEffect(() => {
    if (section !== 'catalog') return;
    setCatLoading(true);
    usersExtApi.list({ limit: 100 })
      .then(data => setCatalog(Array.isArray(data) ? data.filter(u => u.role !== 'admin') : []))
      .catch(() => setCatalog([]))
      .finally(() => setCatLoading(false));
  }, [section]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('все');
  const [showAdd, setShowAdd]   = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(BLANK);
  const [showReview, setShowReview] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [myRating, setMyRating]     = useState(0);
  const [hover, setHover]           = useState(0);
  const ff = k => v => setForm(p=>({...p,[k]:v}));

  const filtered = useMemo(()=>{
    let list = contacts;
    if (filter==='чс')   list = list.filter(c=>c.blacklisted);
    if (filter==='нет')  list = list.filter(c=>!c.blacklisted);
    if (search) list = list.filter(c=>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase()) ||
      (c.city||'').toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [contacts, filter, search]);

  function saveContact() {
    const initials = form.name.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase()||'??';
    if (editId != null) {
      // Редактирование существующего контакта
      updContact(editId, { ...form, initials, color:getColor(form.name) });
      setSelected(v => v && v.id === editId ? { ...v, ...form, initials, color:getColor(form.name) } : v);
    } else {
      addContactStore({ ...form, id:Date.now(), initials, color:getColor(form.name), blacklisted:false, orders:0, balance:0 });
    }
    setForm(BLANK); setShowAdd(false); setEditId(null);
  }
  function openEdit(c) {
    setForm({ name:c.name||'', role:c.role||'Перевозчик', phone:c.phone||'', email:c.email||'', city:c.city||'', rating:c.rating||5, notes:c.notes||'' });
    setEditId(c.id);
    setShowAdd(true);
  }
  function toggleBlacklist(id) {
    const contact = contacts.find(c=>c.id===id);
    updContact(id, { blacklisted:!contact?.blacklisted });
    setSelected(v=>v?{...v,blacklisted:!v?.blacklisted}:v);
  }
  function deleteContact(id) { delContactStore(id); if(selected?.id===id) setSelected(null); }

  const SECS = [
    { key:'catalog',  label:'Каталог',       count:catalog.length },
    { key:'contacts', label:'Мои контакты',  count:contacts.filter(c=>!c.blacklisted).length },
    { key:'blacklist',label:'Чёрный список', count:contacts.filter(c=>c.blacklisted).length },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
        {/* Топ-навигация */}
        <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'0 24px', display:'flex', alignItems:'center', gap:0 }}>
          <div style={{ flex:1, display:'flex', gap:0 }}>
            {SECS.map(s=>(
              <button key={s.key} onClick={()=>{ setSection(s.key); setFilter(s.key==='blacklist'?'чс':'нет'); setSelected(null); }}
                style={{ padding:'16px 18px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:section===s.key?700:500, color:section===s.key?'#2563eb':'#6b7280', borderBottom:section===s.key?'2.5px solid #2563eb':'2.5px solid transparent', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
                {s.label}
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10, background:section===s.key?'#eff6ff':'#f3f4f6', color:section===s.key?'#2563eb':'#9ca3af' }}>{s.count}</span>
              </button>
            ))}
          </div>
          <button onClick={()=>{ setEditId(null); setForm(BLANK); setShowAdd(true); }} style={{ padding:'8px 16px', borderRadius:8, background:'#2563eb', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
            + Добавить
          </button>
        </div>

        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          {/* ── Каталог перевозчиков ─────────────────────────────── */}
          {section === 'catalog' && (
            <div style={{ flex:1, overflowY:'auto', padding:24, background:'#f8fafc' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:'#111827' }}>Каталог перевозчиков и водителей</h2>
                <span style={{ fontSize:12, color:'#9ca3af' }}>{catalog.length} участников</span>
              </div>
              {catLoading ? (
                <div style={{ textAlign:'center', color:'#9ca3af', padding:60 }}>Загрузка...</div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                  {catalog.map(u => (
                    <div key={u.id} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, padding:18, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                        <div style={{ width:44, height:44, borderRadius:'50%', background: u.avatar_color || getColor(u.name), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:16, flexShrink:0 }}>
                          {u.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{u.name}</div>
                          <div style={{ fontSize:11, color:'#9ca3af', textTransform:'capitalize' }}>{u.role} · {u.location || '—'}</div>
                        </div>
                        {u.verified ? <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, background:'#dcfce7', color:'#16a34a' }}>Верифицирован</span> : null}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                        <Stars rating={u.avg_rating || 0} size={13}/>
                        <span style={{ fontSize:12, color:'#374151', fontWeight:600 }}>{u.avg_rating ? Number(u.avg_rating).toFixed(1) : '—'}</span>
                        <span style={{ fontSize:11, color:'#9ca3af' }}>({u.review_count || 0} отз.)</span>
                      </div>
                      {u.specialization && <div style={{ fontSize:12, color:'#6b7280', marginBottom:8 }}>{u.specialization}</div>}
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {u.phone && <a href={`tel:${u.phone}`} style={{ fontSize:11, color:'#2563eb', textDecoration:'none' }}>{u.phone}</a>}
                        <button onClick={() => navigate('/messages', { state:{ contact:{ id:u.id, name:u.name, color:u.avatar_color } } })}
                          style={{ fontSize:11, padding:'4px 10px', borderRadius:7, border:'1px solid #e5e7eb', background:'#f9fafb', color:'#374151', cursor:'pointer', fontWeight:600 }}>
                          Написать
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Левая панель — только для contacts/blacklist */}
          {section !== 'catalog' && <div style={{ width:320, flexShrink:0, borderRight:'1px solid #e5e7eb', background:'#fff', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6' }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по имени, городу, роли..."
                style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, outline:'none', boxSizing:'border-box' }} />
              {section === 'contacts' && (
                <div style={{ display:'flex', gap:6, marginTop:8 }}>
                  {[['нет','Все'],['чс','Чёрный список']].map(([k,l])=>(
                    <button key={k} onClick={()=>setFilter(k)}
                      style={{ flex:1, padding:'5px 4px', borderRadius:8, border:`1.5px solid ${filter===k?'#2563eb':'#e5e7eb'}`, background:filter===k?'#eff6ff':'#f9fafb', color:filter===k?'#2563eb':'#6b7280', fontSize:11, fontWeight:filter===k?700:500, cursor:'pointer' }}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {filtered.length===0 ? (
                <div style={{ padding:'40px 20px', textAlign:'center', color:'#9ca3af' }}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><IconContacts size={36} color="#d1d5db"/></div>
                  <div style={{ fontSize:13 }}>{contacts.length===0?'Добавьте первый контакт':'Контакты не найдены'}</div>
                </div>
              ) : filtered.map(c=>(
                <div key={c.id} onClick={()=>setSelected(selected?.id===c.id?null:c)}
                  style={{ padding:'14px 16px', borderBottom:'1px solid #f3f4f6', cursor:'pointer', background:selected?.id===c.id?'#eff6ff':'#fff', display:'flex', alignItems:'center', gap:12, transition:'background 0.1s' }}>
                  <Avatar initials={c.initials} color={c.blacklisted?'#9ca3af':c.color} size={42} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontWeight:700, fontSize:13, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                      {c.blacklisted && <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:10, background:'#fee2e2', color:'#dc2626' }}>ЧС</span>}
                    </div>
                    <div style={{ fontSize:11, color:'#9ca3af' }}>{c.role} • {c.city||'—'}</div>
                    <Stars rating={c.rating} size={11} />
                  </div>
                </div>
              ))}
            </div>
          </div>}

          {/* Детали — только для contacts/blacklist */}
          {section !== 'catalog' && <div style={{ flex:1, overflowY:'auto', background:'#f8fafc', padding:24 }}>
            {!selected ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#9ca3af', flexDirection:'column', gap:12 }}>
                <div style={{display:"flex",justifyContent:"center"}}><IconPerson size={48} color="#d1d5db"/></div>
                <div style={{ fontSize:14 }}>Выберите контакт для просмотра</div>
              </div>
            ) : (
              <div style={{ maxWidth:500 }}>
                <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:16, padding:24, marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:16 }}>
                    <Avatar initials={selected.initials} color={selected.blacklisted?'#9ca3af':selected.color} size={64} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ fontSize:18, fontWeight:800, color:'#111827' }}>{selected.name}</div>
                        {selected.blacklisted && (
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#fee2e2', color:'#dc2626', border:'1px solid #fecaca' }}>ЧС</span>
                        )}
                      </div>
                      <div style={{ fontSize:13, color:'#6b7280', marginTop:2 }}>{selected.role}</div>
                      <Stars rating={selected.rating} size={15} />
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                    <button
                      onClick={() => navigate('/messages', { state: { contact: selected } })}
                      style={{ flex:1, padding:'9px 0', borderRadius:10, border:'1px solid #bfdbfe', background:'#eff6ff', color:'#2563eb', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                      <IconMessages size={13}/> Написать
                    </button>
                    <button style={{ flex:1, padding:'9px 0', borderRadius:10, border:'1px solid #e5e7eb', background:'#f9fafb', color:'#374151', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M4 2h3l1.5 4-2 1.5a10 10 0 005 5L13 10.5l4 1.5v3c0 1.1-.9 2-2 2A16 16 0 012 4c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                      Звонок
                    </button>
                  </div>
                  {[['Телефон',selected.phone],['Email',selected.email],['Город',selected.city],['Заказов',selected.orders]].filter(([,v])=>v).map(([k,v])=>(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f3f4f6', fontSize:13 }}>
                      <span style={{ color:'#9ca3af' }}>{k}</span>
                      <span style={{ fontWeight:600, color:'#374151' }}>{v}</span>
                    </div>
                  ))}
                  {selected.notes && <div style={{ marginTop:12, padding:12, background:'#f8fafc', borderRadius:8, fontSize:12, color:'#6b7280', lineHeight:1.5 }}>{selected.notes}</div>}
                  <div style={{ display:'flex', gap:10, marginTop:16 }}>
                    <button onClick={()=>openEdit(selected)} style={{ flex:1, padding:'8px 0', borderRadius:10, border:'1.5px solid #e5e7eb', background:'#f9fafb', color:'#374151', fontWeight:700, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M13 3l4 4-9 9H4v-4l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                      Изменить
                    </button>
                    <button onClick={()=>setShowReview(true)} style={{ flex:1, padding:'8px 0', borderRadius:10, border:'1.5px solid #bfdbfe', background:'#eff6ff', color:'#2563eb', fontWeight:700, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M10 2l2.4 5 5.6.8-4 3.9 1 5.6L10 14.5l-5 2.8 1-5.6-4-3.9 5.6-.8L10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                      Отзыв
                    </button>
                    <button onClick={()=>toggleBlacklist(selected.id)}
                      style={{ flex:1, padding:'8px 0', borderRadius:10, border:`1.5px solid ${selected.blacklisted?'#bbf7d0':'#fecaca'}`, background:selected.blacklisted?'#f0fdf4':'#fff1f2', color:selected.blacklisted?'#16a34a':'#dc2626', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      {selected.blacklisted?'Убрать из ЧС':'В чёрный список'}
                    </button>
                    <button onClick={()=>deleteContact(selected.id)} style={{ padding:'8px 12px', borderRadius:10, border:'1px solid #fecaca', background:'#fff1f2', color:'#dc2626', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      <IconTrash size={13}/>
                    </button>
                  </div>
                </div>
                {showReview && (
                  <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:16, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Ваша оценка</div>
                    <div style={{ display:'flex', gap:4, marginBottom:12 }}>
                      {[1,2,3,4,5].map(s=>(
                        <span key={s} onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} onClick={()=>setMyRating(s)}
                          style={{ fontSize:28, cursor:'pointer', color:s<=(hover||myRating)?'#f59e0b':'#e5e7eb', transition:'color 0.1s' }}>★</span>
                      ))}
                    </div>
                    <textarea value={reviewText} onChange={e=>setReviewText(e.target.value)} placeholder="Напишите отзыв о работе..."
                      style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, resize:'vertical', minHeight:80, boxSizing:'border-box', outline:'none' }} />
                    <div style={{ display:'flex', gap:10, marginTop:10 }}>
                      <button onClick={()=>setShowReview(false)} style={{ flex:1, padding:'8px 0', borderRadius:10, border:'none', background:'#2563eb', color:'#fff', fontWeight:700, cursor:'pointer' }}>Отправить</button>
                      <button onClick={()=>setShowReview(false)} style={{ padding:'8px 16px', borderRadius:10, border:'1px solid #e5e7eb', background:'#f9fafb', cursor:'pointer' }}>Отмена</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>}
        </div>}
      </div>

      {showAdd && (
        <Modal title={editId != null ? 'Редактировать контакт' : 'Новый контакт'} onClose={()=>{ setShowAdd(false); setEditId(null); }}>
          <Field label="Полное имя (ФИО)" value={form.name} onChange={ff('name')} placeholder="Иван Анатольевич Петров" />
          <Field label="Роль" value={form.role} onChange={ff('role')} options={ROLES} />
          <Field label="Телефон" value={form.phone} onChange={ff('phone')} placeholder="+375 29 000-00-00" />
          <Field label="Email" value={form.email} onChange={ff('email')} placeholder="ivan@example.by" type="email" />
          <Field label="Город (РБ)" value={form.city} onChange={ff('city')} placeholder="Минск, Беларусь" />
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:6, textTransform:'uppercase' }}>Начальный рейтинг</label>
            <div style={{ display:'flex', gap:4 }}>
              {[1,2,3,4,5].map(s=><span key={s} onClick={()=>ff('rating')(s)} style={{ fontSize:26, cursor:'pointer', color:s<=form.rating?'#f59e0b':'#e5e7eb' }}>★</span>)}
            </div>
          </div>
          <Field label="Заметки (УНП, договор, особенности)" value={form.notes} onChange={ff('notes')} placeholder="УНП 190123456. Доп. информация..." />
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={saveContact} style={{ flex:1, background:'#2563eb', color:'#fff', border:'none', borderRadius:10, padding:'10px 0', fontWeight:700, cursor:'pointer', fontSize:14 }}>Сохранить</button>
            <button onClick={()=>{ setShowAdd(false); setEditId(null); }} style={{ padding:'10px 16px', borderRadius:10, border:'1px solid #e5e7eb', background:'#f9fafb', cursor:'pointer' }}>Отмена</button>
          </div>
        </Modal>
      )}
    </>
  );
}
