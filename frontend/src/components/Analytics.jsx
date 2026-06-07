/**
 * Analytics.jsx — аналитика на основе заказов из backend API
 */
import { IconOrders, IconContacts, IconAnalytics, IconPayment, IconTruck, IconDownload } from '../icons';
import { useState, useMemo, useEffect } from 'react';
import { useCurrency } from '../hooks/useCurrency';
import { loadsApi, exportApi } from '../services/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const C = { blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', purple:'#7c3aed', border:'#e5e7eb', bg:'#f8fafc' };
const PIE_COLORS = [C.blue, C.green, C.amber, C.red, C.purple, '#0891b2', '#9ca3af'];

const STATUS_COLORS = {
  'Новый':'#7c3aed','Назначен':'#2563eb','Забран':'#d97706',
  'Доставлен':'#16a34a','Оплачен':'#059669','Претензия':'#dc2626',
  'В ожидании':'#f59e0b','Архив':'#9ca3af',
};

function KpiCard({ icon, label, value, sub, color = C.blue }) {
  return (
    <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</div>
      </div>
      <div style={{ fontSize:24, fontWeight:800, color, lineHeight:1, fontFamily:"'DM Mono',monospace" }}>{value}</div>
      <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginTop:5 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:'48px 24px',
      display:'flex', flexDirection:'column', alignItems:'center', gap:10, color:'#9ca3af', textAlign:'center' }}>
      <IconAnalytics size={36} color="#d1d5db"/>
      <div style={{ fontSize:14, fontWeight:600, color:'#6b7280' }}>{text}</div>
      <div style={{ fontSize:12 }}>Добавьте заказы в разделе «Заказы»</div>
    </div>
  );
}

const SECTIONS = [
  { k:'overview',     l:'Общая сводка' },
  { k:'routes',       l:'Маршруты' },
  { k:'drivers',      l:'По водителям' },
  { k:'dispatchers',  l:'По диспетчерам' },
];

export default function Analytics() {
  const [rawLoads, setRawLoads] = useState([]);
  const [section, setSection]  = useState('overview');
  const { formatAmount, currencySymbol } = useCurrency();

  useEffect(() => {
    loadsApi.list({ limit: 500 })
      .then(data => {
        const mapped = (data.loads || []).map(l => ({
          id:         String(l.id),
          status:     l.status,
          cod:        Number(l.cod_amount || 0),
          driverPay:  Number(l.driver_pay || 0),
          driver:     l.driver_name || '',
          dispatcher: l.dispatcher_name || '',
          originCity: l.origin_city || '',
          destCity:   l.destination_city || '',
          createdAt:  l.created_at ? new Date(l.created_at).toLocaleDateString('ru-RU') : '',
        }));
        setRawLoads(mapped);
      })
      .catch(() => {});
  }, []);

  const orders = rawLoads;
  const deals  = rawLoads;

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const delivered   = orders.filter(o => ['Доставлен','Оплачен'].includes(o.status)).length;
    const inProgress  = orders.filter(o => ['Назначен','Забран'].includes(o.status)).length;
    const totalCod    = deals.reduce((s, d) => s + Number(d.cod || 0), 0);
    const paidCod     = deals.filter(d => d.status === 'Оплачено').reduce((s, d) => s + Number(d.cod || 0), 0);

    // По статусам
    const byStatus = Object.entries(
      orders.reduce((acc, o) => { acc[o.status] = (acc[o.status]||0)+1; return acc; }, {})
    ).map(([name, value]) => ({ name, value }));

    // По месяцам (из даты создания)
    const byMonth = {};
    orders.forEach(o => {
      if (!o.createdAt) return;
      const [d, m, y] = o.createdAt.split('.');
      const key = `${m}.${y}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    const byMonthArr = Object.entries(byMonth).slice(-6).map(([month, count]) => ({ month, count }));

    // По маршрутам (топ откуда → куда)
    const routes = {};
    orders.forEach(o => {
      if (!o.originCity || !o.destCity) return;
      const key = `${o.originCity} → ${o.destCity}`;
      routes[key] = (routes[key] || 0) + 1;
    });
    const topRoutes = Object.entries(routes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([route, count]) => ({ route, count }));

    // По водителям
    const driverMap = {};
    orders.forEach(o => {
      if (!o.driver) return;
      if (!driverMap[o.driver]) driverMap[o.driver] = { name: o.driver, orders: 0, cod: 0 };
      driverMap[o.driver].orders++;
      driverMap[o.driver].cod += Number(o.cod || 0);
    });
    const byDriver = Object.values(driverMap).sort((a, b) => b.orders - a.orders).slice(0, 8);

    // По диспетчерам
    const dispMap = {};
    orders.forEach(o => {
      if (!o.dispatcher) return;
      if (!dispMap[o.dispatcher]) dispMap[o.dispatcher] = { name: o.dispatcher, orders: 0, cod: 0 };
      dispMap[o.dispatcher].orders++;
      dispMap[o.dispatcher].cod += Number(o.cod || 0);
    });
    const byDispatcher = Object.values(dispMap).sort((a, b) => b.orders - a.orders).slice(0, 8);

    const pct = totalOrders ? Math.round(delivered / totalOrders * 100) : 0;

    return { totalOrders, delivered, inProgress, totalCod, paidCod, byStatus, byMonthArr, topRoutes, byDriver, byDispatcher, pct };
  }, [orders, deals]);

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden', fontFamily:"'DM Sans', sans-serif" }}>
      {/* Боковое меню */}
      <aside style={{ width:210, flexShrink:0, background:'#fff', borderRight:`1px solid ${C.border}`, paddingTop:16 }}>
        <div style={{ padding:'0 16px 10px', fontSize:10, fontWeight:700, color:'#d1d5db', textTransform:'uppercase', letterSpacing:1 }}>АНАЛИТИКА</div>
        {SECTIONS.map(s => (
          <button key={s.k} onClick={() => setSection(s.k)} style={{ display:'flex', alignItems:'center', width:'100%',
            padding:'10px 16px', border:'none', background:section===s.k?'#eff6ff':'transparent',
            color:section===s.k?C.blue:'#374151', fontSize:13, fontWeight:section===s.k?700:500,
            cursor:'pointer', textAlign:'left', borderLeft:`3px solid ${section===s.k?C.blue:'transparent'}` }}>
            {s.l}
          </button>
        ))}
        <div style={{ margin:'16px 12px 0', padding:12, background:C.bg, borderRadius:10, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, color:'#9ca3af', lineHeight:1.6 }}>
            Данные обновляются автоматически из раздела Заказы.
          </div>
        </div>
        {/* Экспорт */}
        <div style={{ margin:'10px 12px 0' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#d1d5db', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>ЭКСПОРТ</div>
          {[['Заказы (Excel)', exportApi.loads()], ['Аналитика', exportApi.analytics()], ['Претензии', exportApi.claims()]].map(([l, url]) => (
            <a key={l} href={url} download style={{ textDecoration:'none', display:'block', marginBottom:4 }}>
              <button style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'#374151', fontWeight:500 }}>
                <IconDownload size={12} color="#6b7280" /> {l}
              </button>
            </a>
          ))}
        </div>
      </aside>

      {/* Контент */}
      <main style={{ flex:1, overflowY:'auto', padding:'24px 28px', background:C.bg }}>

        {/* ── Общая сводка ── */}
        {section === 'overview' && (
          <>
            <h1 style={{ margin:'0 0 20px', fontSize:18, fontWeight:700, color:'#111827' }}>Общая сводка</h1>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))', gap:12, marginBottom:20 }}>
              <KpiCard icon={<IconOrders size={15} color={C.blue}/>} label="Заказов всего" value={stats.totalOrders} color={C.blue}/>
              <KpiCard icon={<IconOrders size={15} color={C.green}/>} label="Доставлено" value={stats.delivered} sub={`${stats.pct}% от всех`} color={C.green}/>
              <KpiCard icon={<IconTruck size={15} color={C.amber}/>} label="В пути" value={stats.inProgress} color={C.amber}/>
              <KpiCard icon={<IconPayment size={15} color={C.purple}/>} label={`Оборот ${currencySymbol}`} value={formatAmount(stats.totalCod)} color={C.purple}/>
              <KpiCard icon={<IconPayment size={15} color={C.green}/>} label={`Оплачено ${currencySymbol}`} value={formatAmount(stats.paidCod)} color={C.green}/>
            </div>

            {orders.length === 0 ? <Empty text="Нет данных для отображения"/> : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                {/* Заказы по месяцам */}
                <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 20px 12px' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:14 }}>Заказов по месяцам</div>
                  {stats.byMonthArr.length === 0
                    ? <div style={{ color:'#9ca3af', fontSize:13, textAlign:'center', padding:'30px 0' }}>Нет данных</div>
                    : <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={stats.byMonthArr} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                          <defs>
                            <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={C.blue} stopOpacity={0.15}/>
                              <stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                          <XAxis dataKey="month" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                          <YAxis tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                          <Tooltip contentStyle={{ borderRadius:8, border:`1px solid ${C.border}`, fontSize:13 }} formatter={v=>[v,'Заказов']}/>
                          <Area type="monotone" dataKey="count" stroke={C.blue} strokeWidth={2} fill="url(#blue-grad)"/>
                        </AreaChart>
                      </ResponsiveContainer>
                  }
                </div>

                {/* По статусам */}
                <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:'20px' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:14 }}>По статусам</div>
                  {stats.byStatus.length === 0
                    ? <div style={{ color:'#9ca3af', fontSize:13, textAlign:'center', padding:'30px 0' }}>Нет данных</div>
                    : <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                        <ResponsiveContainer width={130} height={130}>
                          <PieChart><Pie data={stats.byStatus} cx={60} cy={60} innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}>
                            {stats.byStatus.map((e,i)=><Cell key={i} fill={STATUS_COLORS[e.name]||PIE_COLORS[i%PIE_COLORS.length]}/>)}
                          </Pie></PieChart>
                        </ResponsiveContainer>
                        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
                          {stats.byStatus.map((s,i)=>(
                            <div key={s.name} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12 }}>
                              <span style={{ width:7, height:7, borderRadius:'50%', background:STATUS_COLORS[s.name]||PIE_COLORS[i%PIE_COLORS.length], flexShrink:0 }}/>
                              <span style={{ flex:1, color:'#374151' }}>{s.name}</span>
                              <span style={{ fontWeight:700, color:'#111827' }}>{s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                  }
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Маршруты ── */}
        {section === 'routes' && (
          <>
            <h1 style={{ margin:'0 0 20px', fontSize:18, fontWeight:700, color:'#111827' }}>Топ маршруты</h1>
            {stats.topRoutes.length === 0 ? <Empty text="Нет данных о маршрутах"/> : (
              <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 20px 12px' }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={stats.topRoutes} layout="vertical" margin={{ top:4, right:20, left:0, bottom:4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                    <XAxis type="number" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <YAxis type="category" dataKey="route" width={200} tick={{ fontSize:11, fill:'#374151' }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ borderRadius:8, fontSize:13 }} formatter={v=>[v,'Заказов']}/>
                    <Bar dataKey="count" fill={C.blue} radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* ── По водителям ── */}
        {section === 'drivers' && (
          <>
            <h1 style={{ margin:'0 0 20px', fontSize:18, fontWeight:700, color:'#111827' }}>По водителям</h1>
            {stats.byDriver.length === 0 ? <Empty text="Нет данных по водителям"/> : (
              <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${C.border}` }}>
                      {['#','Водитель','Заказов',`Сумма (${currencySymbol})`].map(h=>(
                        <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontWeight:600, color:'#6b7280', fontSize:11, textTransform:'uppercase', letterSpacing:.4 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byDriver.map((d,i)=>(
                      <tr key={d.name} style={{ borderBottom:`1px solid #f3f4f6`, background:i%2===0?'#fff':'#fafafa' }}>
                        <td style={{ padding:'10px 16px', color:'#9ca3af', fontWeight:700 }}>{i+1}</td>
                        <td style={{ padding:'10px 16px', fontWeight:600, color:'#111827' }}>{d.name}</td>
                        <td style={{ padding:'10px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ height:6, borderRadius:3, background:C.blue, width:Math.max(4, d.orders/Math.max(...stats.byDriver.map(x=>x.orders))*120) }}/>
                            <span style={{ fontWeight:700, color:C.blue }}>{d.orders}</span>
                          </div>
                        </td>
                        <td style={{ padding:'10px 16px', fontWeight:600, color:C.green }}>{formatAmount(d.cod)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── По диспетчерам ── */}
        {section === 'dispatchers' && (
          <>
            <h1 style={{ margin:'0 0 20px', fontSize:18, fontWeight:700, color:'#111827' }}>По диспетчерам</h1>
            {stats.byDispatcher.length === 0 ? <Empty text="Нет данных по диспетчерам"/> : (
              <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${C.border}` }}>
                      {['#','Диспетчер','Заказов',`Сумма (${currencySymbol})`].map(h=>(
                        <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontWeight:600, color:'#6b7280', fontSize:11, textTransform:'uppercase', letterSpacing:.4 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byDispatcher.map((d,i)=>(
                      <tr key={d.name} style={{ borderBottom:`1px solid #f3f4f6`, background:i%2===0?'#fff':'#fafafa' }}>
                        <td style={{ padding:'10px 16px', color:'#9ca3af', fontWeight:700 }}>{i+1}</td>
                        <td style={{ padding:'10px 16px', fontWeight:600, color:'#111827' }}>{d.name}</td>
                        <td style={{ padding:'10px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ height:6, borderRadius:3, background:C.purple, width:Math.max(4, d.orders/Math.max(...stats.byDispatcher.map(x=>x.orders))*120) }}/>
                            <span style={{ fontWeight:700, color:C.purple }}>{d.orders}</span>
                          </div>
                        </td>
                        <td style={{ padding:'10px 16px', fontWeight:600, color:C.green }}>{formatAmount(d.cod)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
