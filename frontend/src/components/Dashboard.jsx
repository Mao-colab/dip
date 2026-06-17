/**
 * Dashboard.jsx — Главная страница MT
 * Данные: backend API /api/v1/loads → fallback localStorage
 */
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadsApi } from '../services/api';
import {
  IconOrders, IconPayment, IconTruck, IconContacts,
  IconCheck, IconClock, IconAnalytics,
} from '../icons';
import { useCurrency } from '../hooks/useCurrency';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const STATUS_COLORS = {
  'Новый':      '#7c3aed',
  'Назначен':   '#2563eb',
  'Забран':     '#d97706',
  'Доставлен':  '#16a34a',
  'В ожидании': '#f59e0b',
  'Оплачен':    '#059669',
  'Спор':      '#dc2626',
  'Архив':      '#9ca3af',
};
const PIE_COLORS = ['#2563eb','#d97706','#16a34a','#7c3aed','#dc2626','#0891b2','#9ca3af'];

function KpiCard({ icon, label, value, sub, color='#2563eb', onClick }) {
  return (
    <div onClick={onClick}
      style={{
        background:'#fff', border:'1px solid #e5e7eb', borderRadius:14,
        padding:'18px 20px', cursor:onClick?'pointer':'default',
        transition:'box-shadow .15s, transform .15s',
        display:'flex', flexDirection:'column', gap:8,
      }}
      onMouseEnter={e=>{ if(onClick){ e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'; e.currentTarget.style.transform='translateY(-1px)'; }}}
      onMouseLeave={e=>{ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ width:36, height:36, borderRadius:9, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize:28, fontWeight:800, color, lineHeight:1, fontFamily:"'DM Mono',monospace" }}>
        {value}
      </div>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:14, marginTop:28 }}>{children}</div>
  );
}

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    loadsApi.list({ limit: 500 })
      .then(data => {
        const loads = (data.loads || []).map(l => ({
          id:          String(l.id),
          status:      l.status,
          cod_amount:  Number(l.cod_amount || 0),
          driver_pay:  Number(l.driver_pay || 0),
          driver:      l.driver_name || '',
          origin_city: l.origin_city || '',
          dest_city:   l.destination_city || '',
          destination_date: l.destination_date ? l.destination_date.slice(0,10) : '',
          createdAt:   l.created_at ? new Date(l.created_at).toLocaleDateString('ru-RU') : '',
        }));
        setOrders(loads);
        setOffline(false);
      })
      .catch(() => {
        // fallback: localStorage
        setOffline(true);
        try {
          const u = JSON.parse(localStorage.getItem('mt_user') || '{}');
          const prefix = u.login ? `mt_u_${u.login}_` : 'mt_shared_';
          const raw = JSON.parse(localStorage.getItem(prefix + 'orders') || '[]');
          setOrders(raw.map(o => ({
            id: String(o.id), status: o.status,
            cod_amount: Number(o.cod||0), driver_pay: Number(o.driverPay||0),
            driver: o.driver||'', origin_city: o.originCity||'',
            dest_city: o.destCity||'', destination_date: o.destDate||'',
            createdAt: o.createdAt||'',
          })));
        } catch {}
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total       = orders.length;
    const today       = new Date().toLocaleDateString('ru-RU');
    const todayOrders = orders.filter(o => o.createdAt === today).length;
    const inProgress  = orders.filter(o => ['Назначен','Забран'].includes(o.status)).length;
    const delivered   = orders.filter(o => ['Доставлен','Оплачен'].includes(o.status)).length;
    const overdue     = orders.filter(o => {
      if (!o.destination_date || ['Доставлен','Оплачен'].includes(o.status)) return false;
      return o.destination_date < today;
    }).length;
    const noDriver   = orders.filter(o => !o.driver && o.status === 'Новый').length;
    const totalRev   = orders.reduce((s,o) => s + o.cod_amount, 0);
    const paidRev    = orders.filter(o => o.status === 'Оплачен').reduce((s,o) => s + o.cod_amount, 0);

    const byStatus = Object.entries(
      orders.reduce((acc, o) => { acc[o.status]=(acc[o.status]||0)+1; return acc; }, {})
    ).map(([name, value]) => ({ name, value }));

    const now = new Date();
    const byDay = Array.from({ length:7 }, (_,i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6-i));
      const label = d.toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
      const key   = d.toLocaleDateString('ru-RU');
      return { label, count: orders.filter(o => o.createdAt === key).length };
    });

    return { total, todayOrders, inProgress, delivered, overdue, noDriver, totalRev, paidRev, byStatus, byDay };
  }, [orders]);

  if (loading) {
    return (
      <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#9ca3af', fontFamily:"'DM Sans',sans-serif" }}>
        Загрузка данных...
      </div>
    );
  }

  return (
    <div style={{ overflowY:'auto', height:'100%', background:'#f8fafc', fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 28px 48px' }}>

        {offline && (
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'8px 16px', marginBottom:16, fontSize:12, color:'#92400e' }}>
            ⚠ Нет соединения с сервером — отображаются локальные данные
          </div>
        )}

        {/* Приветствие */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#111827' }}>
            Добро пожаловать, {user?.name?.split(' ')[0] || 'Пользователь'}
          </h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'#9ca3af' }}>
            {new Date().toLocaleDateString('ru-RU',{ weekday:'long', day:'numeric', month:'long' })}
            {' · '}<strong style={{ color:'#6b7280' }}>{user?.role}</strong>
          </p>
        </div>

        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
          <KpiCard icon={<IconOrders size={18} color="#2563eb"/>} label="Всего заказов"   value={stats.total}         sub={`+${stats.todayOrders} сегодня`} color="#2563eb" onClick={()=>navigate('/orders')}/>
          <KpiCard icon={<IconTruck  size={18} color="#d97706"/>} label="В пути"          value={stats.inProgress}    sub="Назначен + Забран"                color="#d97706" onClick={()=>navigate('/orders')}/>
          <KpiCard icon={<IconCheck  size={18} color="#16a34a"/>} label="Доставлено"      value={stats.delivered}     sub="Доставлен + Оплачен"              color="#16a34a" onClick={()=>navigate('/orders')}/>
          <KpiCard icon={<IconClock  size={18} color="#dc2626"/>} label="Просрочено"      value={stats.overdue}       sub="Дата прошла"                      color="#dc2626" onClick={()=>navigate('/orders')}/>
          <KpiCard icon={<IconPayment size={18} color="#7c3aed"/>} label="Оборот"         value={formatAmount(stats.totalRev)} color="#7c3aed" onClick={()=>navigate('/accounting')}/>
          <KpiCard icon={<IconCheck  size={18} color="#059669"/>} label="Оплачено"        value={formatAmount(stats.paidRev)}  color="#059669" onClick={()=>navigate('/accounting')}/>
          <KpiCard icon={<IconAnalytics size={18} color="#0891b2"/>} label="Аналитика"   value={stats.total > 0 ? `${Math.round(stats.delivered/Math.max(stats.total,1)*100)}%` : '—'} sub="Процент доставки" color="#0891b2" onClick={()=>navigate('/analytics')}/>
          <KpiCard icon={<IconOrders size={18} color="#f59e0b"/>} label="Без водителя"   value={stats.noDriver}      sub="Новые, не назначены"              color="#f59e0b" onClick={()=>navigate('/orders')}/>
        </div>

        {orders.length === 0 ? (
          <div style={{ marginTop:40, background:'#fff', border:'1px solid #e5e7eb', borderRadius:16, padding:'52px 24px', textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
              <IconOrders size={48} color="#d1d5db"/>
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:'#374151', marginBottom:8 }}>Пока нет данных</div>
            <div style={{ fontSize:13, color:'#9ca3af', marginBottom:20 }}>
              Добавьте первый заказ — и дашборд оживёт с графиками
            </div>
            <button onClick={()=>navigate('/orders')}
              style={{ background:'#2563eb', color:'#fff', border:'none', borderRadius:10, padding:'10px 24px', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              Перейти к заказам
            </button>
          </div>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:8 }}>

              {/* Бар-чарт */}
              <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, padding:'20px 20px 12px' }}>
                <SectionTitle>Заказы за 7 дней</SectionTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.byDay} margin={{ top:4, right:4, left:-24, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                    <XAxis dataKey="label" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={{ borderRadius:8, border:'1px solid #e5e7eb', fontSize:13 }} formatter={v=>[v,'Заказов']}/>
                    <Bar dataKey="count" fill="#2563eb" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Пирог по статусам */}
              <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, padding:'20px' }}>
                <SectionTitle>По статусам</SectionTitle>
                <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={stats.byStatus} cx={65} cy={65} innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                        {stats.byStatus.map((entry,i)=>(
                          <Cell key={i} fill={STATUS_COLORS[entry.name]||PIE_COLORS[i%PIE_COLORS.length]}/>
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                    {stats.byStatus.map((s,i)=>(
                      <div key={s.name} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:STATUS_COLORS[s.name]||PIE_COLORS[i%PIE_COLORS.length] }}/>
                        <span style={{ flex:1, color:'#374151' }}>{s.name}</span>
                        <span style={{ fontWeight:700, color:'#111827' }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Последние заказы */}
            <SectionTitle>Последние заказы</SectionTitle>
            <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                    {['ID','Статус','Откуда → Куда','Водитель','Сумма','Дата'].map(h=>(
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontWeight:600, color:'#6b7280', fontSize:11, textTransform:'uppercase', letterSpacing:.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...orders].reverse().slice(0,8).map((o,i)=>(
                    <tr key={o.id} style={{ borderBottom:'1px solid #f3f4f6', background:i%2===0?'#fff':'#fafafa', cursor:'pointer' }}
                      onClick={()=>navigate('/orders')}>
                      <td style={{ padding:'10px 16px', fontWeight:700, color:'#2563eb' }}>#{o.id}</td>
                      <td style={{ padding:'10px 16px' }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:(STATUS_COLORS[o.status]||'#9ca3af')+'18', color:STATUS_COLORS[o.status]||'#9ca3af' }}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ padding:'10px 16px', color:'#374151' }}>{o.origin_city||'—'} → {o.dest_city||'—'}</td>
                      <td style={{ padding:'10px 16px', color:o.driver?'#111827':'#dc2626' }}>{o.driver||'Не назначен'}</td>
                      <td style={{ padding:'10px 16px', fontWeight:700, color:'#7c3aed' }}>{o.cod_amount ? formatAmount(o.cod_amount) : '—'}</td>
                      <td style={{ padding:'10px 16px', color:'#9ca3af' }}>{o.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding:'12px 16px', textAlign:'center', borderTop:'1px solid #f3f4f6' }}>
                <button onClick={()=>navigate('/orders')}
                  style={{ background:'none', border:'none', color:'#2563eb', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                  Показать все заказы →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
