import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { IconMap, IconOrders, IconMessages, IconContacts, IconAccounting, IconAnalytics, IconSettings, IconLogout, IconDocument, IconClaim, IconRate, IconPortal } from '../icons';

function useBadge(key) {
  const [n, setN] = useState(() => Number(localStorage.getItem(key) || 0));
  useEffect(() => {
    const fn = () => setN(Number(localStorage.getItem(key) || 0));
    window.addEventListener('mt:badge', fn);
    return () => window.removeEventListener('mt:badge', fn);
  }, [key]);
  return n;
}

const ROLE_COLORS = { dispatcher: '#d97706', broker: '#7c3aed', carrier: '#0891b2', admin: '#059669' };
const PRIMARY = '#d97706';
const LIGHT   = '#fffbeb';

const IC = {
  dashboard:   c => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M3 9L10 2l7 7v9H13v-5H7v5H3V9z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  tracking:    c => <IconMap size={17} color={c}/>,
  orders:      c => <IconOrders size={17} color={c}/>,
  messages:    c => <IconMessages size={17} color={c}/>,
  contacts:    c => <IconContacts size={17} color={c}/>,
  accounting:  c => <IconAccounting size={17} color={c}/>,
  documents:   c => <IconDocument size={17} color={c}/>,
  legislation: c => <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M4 2h9l4 4v13H4V2z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/><path d="M13 2v4h4M7 8h6M7 11h6M7 14h4" stroke={c} strokeWidth="1.3" strokeLinecap="round"/></svg>,
  analytics:   c => <IconAnalytics size={17} color={c}/>,
  admin:       c => <IconSettings size={17} color={c}/>,
  claims:      c => <IconClaim size={17} color={c}/>,
  rates:       c => <IconRate size={17} color={c}/>,
  portal:      c => <IconPortal size={17} color={c}/>,
};

export default function Sidebar({ user, onLogout }) {
  const ordersBadge = useBadge('badge_orders');
  const msgBadge    = useBadge('badge_messages');
  const avatarColor = user?.color || ROLE_COLORS[user?.roleKey] || '#6b7280';
  const initials    = user?.initials || (user?.name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '??';

  const ls = (active) => ({
    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 9,
    textDecoration: 'none', fontSize: 13, fontWeight: active ? 700 : 500,
    color:      active ? PRIMARY : '#6b7280',
    background: active ? LIGHT   : 'transparent',
    transition: 'all 0.12s', position: 'relative', cursor: 'pointer',
  });

  const rl = (item, c) => (<>
    {c !== '#6b7280' && <span style={{ position:'absolute', left:0, top:'20%', bottom:'20%', width:3, borderRadius:'0 3px 3px 0', background: PRIMARY }}/>}
    {IC[item.k]?.(c)}
    <span style={{ flex: 1 }}>{item.label}</span>
    {item.badge > 0 && (
      <span style={{ fontSize:10, fontWeight:700, background: c!=='#6b7280'?PRIMARY:'#e5e7eb', color: c!=='#6b7280'?'#fff':'#6b7280', borderRadius:10, padding:'1px 7px' }}>
        {item.badge}
      </span>
    )}
  </>);

  // Трекинг доступен только диспетчерам и администраторам
  const canSeeTracking = ['dispatcher', 'admin'].includes(user?.roleKey);

  const MAIN = [
    { to: '/dashboard',  k: 'dashboard',  label: 'Дашборд' },
    ...(canSeeTracking ? [{ to: '/tracking', k: 'tracking', label: 'Трекинг' }] : []),
    { to: '/orders',     k: 'orders',     label: 'Заказы', badge: ordersBadge },
    { to: '/messages',   k: 'messages',   label: 'Сообщения', badge: msgBadge },
    { to: '/contacts',   k: 'contacts',   label: 'Контакты' },
  ];
  const MGMT = [
    { to: '/accounting',  k: 'accounting',  label: 'Бухгалтерия' },
    { to: '/claims',      k: 'claims',      label: 'Претензии' },
    { to: '/rates',       k: 'rates',       label: 'Ставки' },
    { to: '/documents',   k: 'documents',   label: 'Документы' },
    { to: '/legislation', k: 'legislation', label: 'Законодательство' },
    { to: '/analytics',   k: 'analytics',   label: 'Аналитика' },
    { to: '/portal',      k: 'portal',      label: 'Портал клиента' },
    { to: '/admin',       k: 'admin',       label: 'Администрирование' },
  ];

  return (
    <aside style={{ width:220, flexShrink:0, background:'#fff', borderRight:'1px solid #e5e7eb', display:'flex', flexDirection:'column', height:'100vh' }}>
      {/* Логотип */}
      <div style={{ padding:'15px 16px 13px', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:9, background: PRIMARY, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M2 14L10 3l8 11H13v4H7v-4H2z" fill="white" opacity=".95"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:'#111827', lineHeight:1.2 }}>MT</div>
          <div style={{ fontSize:10, color: PRIMARY, fontWeight:600 }}>Брокер РБ</div>
        </div>
      </div>

      {/* Навигация */}
      <nav style={{ flex:1, padding:'8px 10px', overflowY:'auto' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#d1d5db', textTransform:'uppercase', letterSpacing:.8, padding:'4px 8px 6px' }}>
          ГРУЗОПЕРЕВОЗКИ
        </div>
        {MAIN.map(i => (
          <NavLink key={i.to} to={i.to} style={({isActive}) => ls(isActive)}>
            {({isActive}) => rl(i, isActive ? PRIMARY : '#6b7280')}
          </NavLink>
        ))}
        <div style={{ fontSize:10, fontWeight:700, color:'#d1d5db', textTransform:'uppercase', letterSpacing:.8, padding:'14px 8px 6px' }}>
          УПРАВЛЕНИЕ
        </div>
        {MGMT.map(i => (
          <NavLink key={i.to} to={i.to} style={({isActive}) => ls(isActive)}>
            {({isActive}) => rl(i, isActive ? PRIMARY : '#6b7280')}
          </NavLink>
        ))}
      </nav>

      {/* NFR-15: Языковой переключатель */}
      <LangToggle />

      {/* Пользователь */}
      <div style={{ padding:'10px 12px', borderTop:'1px solid #f0f0f0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background: avatarColor, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13 }}>
            {initials}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#111827', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {user?.name||'Пользователь'}
            </div>
            <div style={{ fontSize:10, color:'#9ca3af' }}>{user?.role||'—'}</div>
          </div>
          <button onClick={onLogout} title="Выйти"
            style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:7, display:'flex', alignItems:'center', color:'#9ca3af' }}
            onMouseEnter={e => { e.currentTarget.style.background='#fee2e2'; e.currentTarget.style.color='#dc2626'; }}
            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#9ca3af'; }}>
            <IconLogout size={16}/>
          </button>
        </div>
      </div>
    </aside>
  );
}

// NFR-15: Языковой переключатель RU / EN
function LangToggle() {
  const [lang, setLang] = useState(() => localStorage.getItem('mt_lang') || 'RU');

  function toggle(l) {
    setLang(l);
    localStorage.setItem('mt_lang', l);
    document.documentElement.lang = l.toLowerCase();
  }

  return (
    <div style={{ padding:'8px 12px', borderTop:'1px solid #f0f0f0', display:'flex', gap:4 }}>
      {['RU', 'EN'].map(l => (
        <button key={l} onClick={() => toggle(l)}
          style={{
            flex:1, padding:'5px 0', borderRadius:7, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
            background: lang === l ? '#eff6ff' : '#f9fafb',
            color:      lang === l ? '#2563eb' : '#9ca3af',
          }}>
          {l}
        </button>
      ))}
    </div>
  );
}
