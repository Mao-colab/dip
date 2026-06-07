import { IconPayment, IconDocument, IconFolder, IconCheck, IconTrash, IconSave, IconTruck, IconAnalytics } from '../icons';
import { useState, useEffect } from 'react';
import { useStore, KEYS } from '../hooks/useStore';
import { useCurrency } from '../hooks/useCurrency';
import { loadsApi } from '../services/api';

const C = { blue:'#2563eb', green:'#059669', red:'#dc2626', amber:'#d97706', border:'#e5e7eb', bg:'#f8fafc' };

const PAY_STATUS = ['Не оплачено','В обработке','Оплачено'];
const DOC_TYPES  = ['Акт выполненных работ','Счёт-фактура','Товарная накладная','Договор','Доверенность','Прочее'];

function Btn({ children, variant='default', onClick, small }) {
  const v = { default:{bg:'#f9fafb',color:'#374151',border:'1px solid #e5e7eb'}, primary:{bg:C.blue,color:'#fff',border:'none'}, success:{bg:'#f0fdf4',color:C.green,border:`1px solid #bbf7d0`} }[variant]||{bg:'#f9fafb',color:'#374151',border:'1px solid #e5e7eb'};
  return <button onClick={onClick} style={{ padding:small?'4px 10px':'7px 16px', borderRadius:8, border:v.border, background:v.bg, color:v.color, fontSize:small?11:13, fontWeight:600, cursor:'pointer' }}>{children}</button>;
}
function Field({ label, value, onChange, placeholder, type='text', options }) {
  const s = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, boxSizing:'border-box' };
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:0.4 }}>{label}</label>
      {options
        ? <select value={value} onChange={e=>onChange(e.target.value)} style={s}>{options.map(o=><option key={o}>{o}</option>)}</select>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s} />}
    </div>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, maxWidth:520, width:'100%', maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:16 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const DEAL_BLANK = { loadId:'', date:'', driver:'', dispatcher:'', origin:'', dest:'', cod:'', driverPay:'', status:'Не оплачено' };
const DOC_BLANK  = { name:'', type:'Акт выполненных работ', date:'', size:'' };
const SECS = [{ k:'deals', l:'Сделки' }, { k:'docs', l:'Документы' }];

export default function Accounting() {
  const [sec, setSec] = useState('deals');
  const { formatAmount, currencySymbol } = useCurrency();
  const [apiDeals, setApiDeals] = useState([]);
  const { data: localDeals, add: addDeal, upd: updDeal, del: delDeal } = useStore(KEYS.deals);

  useEffect(() => {
    loadsApi.list({ limit: 200 })
      .then(data => {
        const mapped = (data.loads || [])
          .filter(l => l.status !== 'Удалён')
          .map(l => ({
            id:          l.id,
            displayId:   `МТ-${String(l.id).padStart(5,'0')}`,
            date:        l.created_at ? new Date(l.created_at).toLocaleDateString('ru-RU') : '',
            driver:      l.driver_name || '—',
            dispatcher:  l.dispatcher_name || '—',
            origin:      l.origin_city || '',
            dest:        l.destination_city || '',
            cod:         l.cod_amount,
            driverPay:   l.driver_pay,
            status:      l.driver_pay_status === 'Оплачено'   ? 'Оплачено'
                       : l.driver_pay_status === 'В ожидании' ? 'В обработке'
                       : 'Не оплачено',
          }));
        setApiDeals(mapped);
      })
      .catch(() => {});
  }, []);

  // Объединяем: данные из API + добавленные вручную
  const deals = apiDeals.length > 0 ? [...apiDeals, ...localDeals] : localDeals;
  const { data: contacts } = useStore(KEYS.contacts);
  const driverNames = contacts.filter(c=>['Водитель','Перевозчик'].includes(c.role)).map(c=>c.name);
  const dispNames   = contacts.filter(c=>c.role==='Диспетчер').map(c=>c.name);
  const { data: docs, add: addDoc, del: delDoc } = useStore(KEYS.docs);
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState(DEAL_BLANK);
  const [sel,    setSel]    = useState(null);
  const [search,     setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const totals = {
    cod:  deals.reduce((s,d)=>s+Number(d.cod||0),0),
    pay:  deals.reduce((s,d)=>s+Number(d.driverPay||0),0),
    paid: deals.filter(d=>d.status==='Оплачено').length,
  };

  function saveDeal() {
    const id = Date.now();
    addDeal({...form,id,displayId:String(20000+deals.length)});
    setForm(DEAL_BLANK); setModal(false);
  }
  function markPaid(id) { updDeal(id, { status:'Оплачено' }); }
  function removeDeal(id) { delDeal(id); if(sel?.id===id) setSel(null); }

  const filtered = deals.filter(d => {
    if (search && !d.driver?.toLowerCase().includes(search.toLowerCase()) && !(d.displayId||'').includes(search)) return false;
    if (filterStatus && d.status !== filterStatus) return false;
    if (filterDateFrom && d.date && d.date < filterDateFrom) return false;
    if (filterDateTo   && d.date && d.date > filterDateTo)   return false;
    return true;
  });

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden', fontFamily:'sans-serif' }}>
      <aside style={{ width:200, flexShrink:0, background:'#fff', borderRight:`1px solid ${C.border}`, paddingTop:16 }}>
        <div style={{ padding:'0 16px 10px', fontSize:10, fontWeight:700, color:'#d1d5db', textTransform:'uppercase', letterSpacing:1 }}>БУХГАЛТЕРИЯ</div>
        {SECS.map(s=>(
          <button key={s.k} onClick={()=>setSec(s.k)} style={{ display:'flex', alignItems:'center', width:'100%',
            padding:'10px 16px', border:'none', background:sec===s.k?'#eff6ff':'transparent',
            color:sec===s.k?C.blue:'#374151', fontSize:13, fontWeight:sec===s.k?700:500,
            cursor:'pointer', textAlign:'left', borderLeft:`3px solid ${sec===s.k?C.blue:'transparent'}` }}>
            {s.l}
          </button>
        ))}
      </aside>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {sec === 'deals' ? (
          <>
            {/* Заголовок */}
            <div style={{ padding:'14px 24px', background:'#fff', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12 }}>
              <h1 style={{ margin:0, fontSize:18, fontWeight:700, color:'#111827', flex:1 }}>Сделки</h1>
              <Btn variant="primary" onClick={()=>{ setForm(DEAL_BLANK); setModal(true); }}>+ Добавить</Btn>
            </div>
            {/* KPI */}
            <div style={{ display:'flex', gap:12, padding:'14px 24px', background:'#fff', borderBottom:`1px solid ${C.border}`, flexWrap:'wrap' }}>
              {[['Сумма', formatAmount(totals.cod), C.blue],
                ['Выплачено', formatAmount(totals.pay), C.green],
                ['Оплачено',`${totals.paid} сделок`,C.green],
                ['Не оплачено',`${deals.length-totals.paid} сделок`,C.amber]
              ].map(([l,v,c])=>(
                <div key={l} style={{ padding:'10px 16px', background:C.bg, borderRadius:10, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:11, color:'#9ca3af', fontWeight:700, textTransform:'uppercase' }}>{l}</div>
                  <div style={{ fontSize:18, fontWeight:800, color:c, marginTop:2 }}>{v}</div>
                </div>
              ))}
            </div>
            {/* Поиск */}
            <div style={{ padding:'10px 24px', background:'#fff', borderBottom:`1px solid ${C.border}` }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по водителю, заказу..."
                style={{ width:'100%', padding:'7px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13 }} />
            </div>
            {/* Таблица */}
            <div style={{ flex:1, overflowY:'auto', display:'flex' }}>
              <div style={{ flex:1, overflowX:'auto' }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'60px 20px', color:'#9ca3af' }}>
                    <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><IconPayment size={40} color="#d1d5db"/></div>
                    <div style={{ fontSize:14 }}>Нет сделок. Нажмите «+ Добавить»</div>
                  </div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead><tr style={{ background:'#f8fafc', borderBottom:`2px solid ${C.border}` }}>
                      {['ID','Дата','Водитель','Маршрут','Сумма','Выплата','Статус',''].map(h=>(
                        <th key={h} style={{ padding:'9px 14px', fontSize:10, fontWeight:700, color:'#9ca3af', textAlign:'left', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {filtered.map(d=>(
                        <tr key={d.id} onClick={()=>setSel(sel?.id===d.id?null:d)}
                          style={{ borderBottom:`1px solid ${C.border}`, cursor:'pointer', background:sel?.id===d.id?'#eff6ff':'#fff' }}>
                          <td style={{ padding:'11px 14px', fontWeight:700, color:C.blue }}>#{d.displayId}</td>
                          <td style={{ padding:'11px 14px', color:'#6b7280' }}>{d.date}</td>
                          <td style={{ padding:'11px 14px', fontWeight:600 }}>{d.driver||'—'}</td>
                          <td style={{ padding:'11px 14px', color:'#6b7280', fontSize:12 }}>{d.origin&&d.dest?`${d.origin} → ${d.dest}`:'—'}</td>
                          <td style={{ padding:'11px 14px', fontWeight:700, color:C.blue }}>{d.cod ? formatAmount(d.cod) : '—'}</td>
                          <td style={{ padding:'11px 14px', color:C.green, fontWeight:600 }}>{d.driverPay ? formatAmount(d.driverPay) : '—'}</td>
                          <td style={{ padding:'11px 14px' }}>
                            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                              background:d.status==='Оплачено'?'#dcfce7':d.status==='В обработке'?'#fef9c3':'#fee2e2',
                              color:d.status==='Оплачено'?C.green:d.status==='В обработке'?'#ca8a04':C.red }}>
                              {d.status}
                            </span>
                          </td>
                          <td style={{ padding:'11px 14px' }}>
                            <div style={{ display:'flex', gap:6 }}>
                              {d.status!=='Оплачено' && <Btn small variant="success" onClick={e=>{e.stopPropagation();markPaid(d.id);}}><IconCheck size={13}/> Оплачено</Btn>}
                              <Btn small variant="danger" onClick={e=>{e.stopPropagation();removeDeal(d.id);}}><IconTrash size={13}/></Btn>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {/* Боковая панель детали */}
              {sel && (
                <div style={{ width:260, flexShrink:0, borderLeft:`1px solid ${C.border}`, background:'#fff', overflowY:'auto', padding:18 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <span style={{ fontWeight:800, fontSize:15 }}>#{sel.displayId}</span>
                    <button onClick={()=>setSel(null)} style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:26, height:26, cursor:'pointer' }}>×</button>
                  </div>
                  {[['Дата',sel.date],['Водитель',sel.driver],['Диспетчер',sel.dispatcher],
                    ['Откуда',sel.origin],['Куда',sel.dest],
                    ['Сумма',sel.cod?formatAmount(sel.cod):''],
                    ['Выплата',sel.driverPay?formatAmount(sel.driverPay):''],
                  ].filter(([,v])=>v).map(([l,v])=>(
                    <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f3f4f6', fontSize:12 }}>
                      <span style={{ color:'#9ca3af' }}>{l}</span>
                      <span style={{ fontWeight:600, color:'#374151', textAlign:'right', maxWidth:140 }}>{v}</span>
                    </div>
                  ))}
                  {sel.status !== 'Оплачено' && (
                    <div style={{ marginTop:14 }}>
                      <Btn variant="success" onClick={()=>{ markPaid(sel.id); setSel(d=>({...d,status:'Оплачено'})); }}><svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M6.5 10l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg> Отметить оплаченным</Btn>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{ padding:'14px 24px', background:'#fff', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12 }}>
              <h1 style={{ margin:0, fontSize:18, fontWeight:700, flex:1 }}>Документы</h1>
              <Btn variant="primary" onClick={()=>{ setForm(DOC_BLANK); setModal('doc'); }}>+ Добавить</Btn>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexWrap:'wrap', gap:14, alignContent:'flex-start', background:C.bg }}>
              {docs.length === 0 ? (
                <div style={{ width:'100%', textAlign:'center', padding:'60px 20px', color:'#9ca3af' }}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><IconDocument size={40} color="#d1d5db"/></div>
                  <div style={{ fontSize:14 }}>Нет документов. Нажмите «+ Добавить»</div>
                </div>
              ) : docs.map(d=>(
                <div key={d.id} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', width:200 }}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:8}}><IconDocument size={28} color="#9ca3af"/></div>
                  <div style={{ fontWeight:700, fontSize:13, color:'#111827', marginBottom:4 }}>{d.name}</div>
                  <div style={{ fontSize:11, color:'#9ca3af' }}>{d.type}</div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{d.date}</div>
                  <button onClick={()=>delDoc(d.id)}
                    style={{ marginTop:10, background:'none', border:'none', color:'#ef4444', fontSize:11, cursor:'pointer' }}>Удалить</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modal === true && (
        <Modal title="Новая сделка" onClose={()=>setModal(false)}>
          <Field label="Номер заказа" value={form.loadId} onChange={f('loadId')} placeholder="10001" />
          <Field label="Дата" value={form.date} onChange={f('date')} type="date" />
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:0.4 }}>Водитель</label>
            {driverNames.length > 0 ? (
              <select value={form.driver} onChange={e=>f('driver')(e.target.value)} style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, boxSizing:'border-box' }}>
                <option value=''>— Не выбран —</option>
                {driverNames.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            ) : (
              <input value={form.driver} onChange={e=>f('driver')(e.target.value)} placeholder='Иван Иванов' style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, boxSizing:'border-box' }}/>
            )}
          </div>
          <Field label="Диспетчер" value={form.dispatcher} onChange={f('dispatcher')} placeholder="Анна Сидорова" />
          <Field label="Откуда" value={form.origin} onChange={f('origin')} placeholder="Минск" />
          <Field label="Куда" value={form.dest} onChange={f('dest')} placeholder="Москва" />
          <Field label={`Сумма (${currencySymbol})`} value={form.cod} onChange={f('cod')} placeholder="1 250" />
          <Field label={`Выплата водителю (${currencySymbol})`} value={form.driverPay} onChange={f('driverPay')} placeholder="1 000" />
          <Field label="Статус оплаты" value={form.status} onChange={f('status')} options={PAY_STATUS} />
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <Btn variant="primary" onClick={saveDeal}>Сохранить</Btn>
            <Btn onClick={()=>setModal(false)}>Отмена</Btn>
          </div>
        </Modal>
      )}
      {modal === 'doc' && (
        <Modal title="Новый документ" onClose={()=>setModal(false)}>
          <Field label="Название" value={form.name} onChange={f('name')} placeholder="Акт №123" />
          <Field label="Тип" value={form.type} onChange={f('type')} options={DOC_TYPES} />
          <Field label="Дата" value={form.date} onChange={f('date')} type="date" />
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <Btn variant="primary" onClick={()=>{ addDoc({...form,id:Date.now()}); setModal(false); }}>Сохранить</Btn>
            <Btn onClick={()=>setModal(false)}>Отмена</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
