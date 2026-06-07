/**
 * MT — App.js
 * Вход / выход / защита роутов по роли
 */
import React, { useState, Component } from 'react';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch() {}
  render() {
    if (this.state.error) {
      return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:12, color:'#6b7280', padding:40 }}>
          <div style={{ fontSize:32 }}>🗺️</div>
          <div style={{ fontSize:15, fontWeight:600, color:'#374151' }}>Карта временно недоступна</div>
          <button onClick={() => this.setState({ error: null })}
            style={{ padding:'8px 20px', borderRadius:8, background:'#2563eb', color:'#fff', border:'none', cursor:'pointer', fontWeight:600 }}>
            Обновить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login              from './components/Login';
import NotificationsPanel from './components/Notifications';
import Dashboard     from './components/Dashboard';
import Sidebar       from './components/Sidebar';
import TrackingMap   from './components/TrackingMap';
import OrdersPanel   from './components/OrdersPanel';
import Messenger     from './components/Messenger';
import Contacts      from './components/Contacts';
import Admin         from './components/Admin';
import Analytics     from './components/Analytics';
import Accounting    from './components/Accounting';
import Documents     from './components/Documents';
import Legislation   from './components/Legislation';
import Claims        from './components/Claims';
import RateCalc      from './components/RateCalc';
import ClientPortal  from './components/ClientPortal';
import './components/Messenger.css';

// ── Права доступа по умолчанию ───────────────────────────────────────────────
const DEFAULT_ROLE_PAGES = {
  dispatcher: ['/dashboard', '/tracking', '/orders', '/messages', '/contacts', '/accounting', '/analytics', '/admin', '/documents', '/legislation', '/claims', '/rates'],
  broker:     ['/dashboard', '/tracking', '/orders', '/messages', '/contacts', '/accounting', '/documents', '/legislation', '/claims', '/rates'],
  carrier:    ['/dashboard', '/tracking', '/orders', '/messages', '/contacts', '/documents', '/legislation', '/claims'],
  driver:     ['/dashboard', '/tracking', '/orders', '/messages', '/documents'],
  client:     ['/dashboard', '/portal'],
  admin:      ['/dashboard', '/tracking', '/orders', '/messages', '/contacts', '/accounting', '/analytics', '/admin', '/documents', '/legislation', '/claims', '/rates', '/portal'],
};

const PERM_TO_PAGE = {
  tracking:    '/tracking',
  orders:      '/orders',
  messages:    '/messages',
  contacts:    '/contacts',
  accounting:  '/accounting',
  analytics:   '/analytics',
  documents:   '/documents',
  legislation: '/legislation',
  admin:       '/admin',
  claims:      '/claims',
  rates:       '/rates',
  portal:      '/portal',
};

function getRoleAccess() {
  try {
    const saved = JSON.parse(localStorage.getItem('mt_roles_config') || 'null');
    if (saved) {
      const access = {};
      Object.entries(saved).forEach(([role, perms]) => {
        access[role] = ['/dashboard'];
        Object.entries(perms).forEach(([perm, allowed]) => {
          if (allowed && PERM_TO_PAGE[perm]) access[role].push(PERM_TO_PAGE[perm]);
        });
        // Администратор всегда имеет доступ к настройкам
        if (role === 'admin' && !access[role].includes('/admin')) {
          access[role].push('/admin');
        }
      });
      return access;
    }
  } catch {}
  return DEFAULT_ROLE_PAGES;
}

const PAGE_TITLES = {
  '/':            'Дашборд',
  '/dashboard':   'Дашборд',
  '/tracking':    'Трекинг',
  '/orders':      'Заказы',
  '/messages':    'Сообщения',
  '/contacts':    'Контакты',
  '/accounting':  'Бухгалтерия',
  '/analytics':   'Аналитика',
  '/admin':       'Настройки',
  '/documents':   'Документы',
  '/legislation': 'Законодательство',
  '/claims':      'Претензии',
  '/rates':       'Ставки',
  '/portal':      'Портал клиента',
};

// ── Экран «нет доступа» ───────────────────────────────────────────────────────
function NoAccess({ role }) {
  return (
    <div style={{
      flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      background: '#f8fafc', fontFamily: "'DM Sans', sans-serif",
    }}>
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <circle cx="26" cy="26" r="24" stroke="#e5e7eb" strokeWidth="2"/>
        <path d="M18 18l16 16M34 18L18 34" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#374151' }}>Нет доступа</div>

      <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
        Раздел недоступен для роли<br/>
        <strong style={{ color: '#6b7280' }}>«{role}»</strong>
      </div>
    </div>
  );
}

// ── Шапка страницы ────────────────────────────────────────────────────────────
function PageHeader({ path, user }) {
  const title = PAGE_TITLES[path] || 'MT';
  const roleColor = user?.color || '#d97706';
  return (
    <div style={{
      background: '#fff', borderBottom: '1px solid #e5e7eb',
      padding: '12px 24px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexShrink: 0,
    }}>
      <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827', fontFamily: "'DM Sans', sans-serif" }}>
        {title}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <NotificationsPanel />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '4px 12px', borderRadius: 20,
          background: roleColor + '15', border: `1px solid ${roleColor}35`,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: roleColor, display: 'inline-block' }}/>
          <span style={{ fontSize: 12, fontWeight: 600, color: roleColor, fontFamily: "'DM Sans', sans-serif" }}>
            {user?.role || '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Лейаут ────────────────────────────────────────────────────────────────────
function Layout({ children, user, onLogout, path }) {
  const allowed = getRoleAccess()[user?.roleKey] || [];
  const hasAccess = allowed.includes(path);
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar user={user} onLogout={onLogout} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PageHeader path={path} user={user} />
        <div style={{ flex: 1, overflow: 'auto' }}>
          {hasAccess ? children : <NoAccess role={user?.role} />}
        </div>
      </div>
    </div>
  );
}

// ── Инициализация демо-данных в localStorage (правильный ключ mt_shared_) ──────
function initDemoData() {
  // Documents page (KEYS.documents = 'documents' → 'mt_shared_documents')
  if (!localStorage.getItem('mt_shared_documents')) {
    localStorage.setItem('mt_shared_documents', JSON.stringify([
      { id:1,  title:'CMR №МТ-2026-001', type:'CMR',      counterparty:'Jan Kowalski (Варшава)',      number:'CMR-2026-001', dateIssue:'2026-04-06', dateExpiry:'',           status:'Действующий',   amount:'3200', mode:'freight', note:'Заказ #1 Минск→Варшава' },
      { id:2,  title:'CMR №МТ-2026-002', type:'CMR',      counterparty:'Tomas Kazlauskas (Вильнюс)', number:'CMR-2026-002', dateIssue:'2026-04-10', dateExpiry:'',           status:'Действующий',   amount:'1850', mode:'freight', note:'Заказ #2 Брест→Вильнюс' },
      { id:3,  title:'CMR №МТ-2026-018', type:'CMR',      counterparty:'Günter Fischer (Берлин)',    number:'CMR-2026-018', dateIssue:'2026-06-01', dateExpiry:'',           status:'На подписании', amount:'5500', mode:'freight', note:'Заказ #19 Брест→Берлин' },
      { id:4,  title:'CMR №МТ-2026-019', type:'CMR',      counterparty:'Zbigniew Wróbel (Варшава)',  number:'CMR-2026-019', dateIssue:'2026-05-30', dateExpiry:'',           status:'На подписании', amount:'3100', mode:'freight', note:'Заказ #18 Минск→Варшава' },
      { id:5,  title:'ТТН №МТ-0047',     type:'TTN',      counterparty:'ООО «ТехГруз»',             number:'ТТН-0047',     dateIssue:'2026-04-03', dateExpiry:'',           status:'Действующий',   amount:'3200', mode:'freight', note:'Погрузка Минск' },
      { id:6,  title:'ТТН №МТ-0048',     type:'TTN',      counterparty:'ООО «БелЭкспорт»',          number:'ТТН-0048',     dateIssue:'2026-04-08', dateExpiry:'',           status:'Действующий',   amount:'1850', mode:'freight', note:'Погрузка Брест' },
      { id:7,  title:'ТТН №МТ-0062',     type:'TTN',      counterparty:'ООО «СтройГрупп»',          number:'ТТН-0062',     dateIssue:'2026-05-30', dateExpiry:'',           status:'Действующий',   amount:'3100', mode:'freight', note:'Заказ #18' },
      { id:8,  title:'ТТН №МТ-0063',     type:'TTN',      counterparty:'ООО «ЕвроПласт»',           number:'ТТН-0063',     dateIssue:'2026-06-01', dateExpiry:'',           status:'На подписании', amount:'5500', mode:'freight', note:'Заказ #19' },
      { id:9,  title:'Договор №МТ-2026/04', type:'CONTRACT', counterparty:'ООО «АвтоЛогист»',      number:'МТ-2026/04',   dateIssue:'2026-04-01', dateExpiry:'2026-12-31', status:'Действующий',   amount:'',     mode:'freight', note:'Рамочный договор' },
      { id:10, title:'Договор №МТ-2026/05', type:'CONTRACT', counterparty:'ИП Захаров В.Т.',        number:'МТ-2026/05',   dateIssue:'2026-05-01', dateExpiry:'2026-12-31', status:'Действующий',   amount:'',     mode:'freight', note:'Международные перевозки' },
      { id:11, title:'Договор №МТ-2026/06', type:'CONTRACT', counterparty:'ООО «БелТех»',           number:'МТ-2026/06',   dateIssue:'2026-05-16', dateExpiry:'2027-05-16', status:'Действующий',   amount:'',     mode:'freight', note:'Доставки EU' },
      { id:12, title:'Акт №АВР-0023',    type:'ACT',      counterparty:'ООО «ТехГруз»',             number:'АВР-0023',     dateIssue:'2026-04-07', dateExpiry:'',           status:'Действующий',   amount:'3200', mode:'freight', note:'Заказ #1' },
      { id:13, title:'Акт №АВР-0024',    type:'ACT',      counterparty:'ООО «БелЭкспорт»',          number:'АВР-0024',     dateIssue:'2026-04-11', dateExpiry:'',           status:'Действующий',   amount:'1850', mode:'freight', note:'Заказ #2' },
      { id:14, title:'Акт №АВР-0031',    type:'ACT',      counterparty:'ООО «БелТех»',              number:'АВР-0031',     dateIssue:'2026-05-21', dateExpiry:'',           status:'Действующий',   amount:'2900', mode:'freight', note:'Заказ #12' },
      { id:15, title:'Акт №АВР-0032',    type:'ACT',      counterparty:'ООО «БрестИмпорт»',         number:'АВР-0032',     dateIssue:'2026-05-22', dateExpiry:'',           status:'Действующий',   amount:'1750', mode:'freight', note:'Заказ #13' },
      { id:16, title:'СФ №2026-037',     type:'INVOICE',  counterparty:'ООО «ТехГруз»',             number:'СФ-2026-037',  dateIssue:'2026-04-07', dateExpiry:'2026-05-07', status:'Действующий',   amount:'3200', mode:'freight', note:'К заказу #1' },
      { id:17, title:'СФ №2026-044',     type:'INVOICE',  counterparty:'ООО «МинскПром»',           number:'СФ-2026-044',  dateIssue:'2026-06-01', dateExpiry:'2026-07-01', status:'На подписании', amount:'4200', mode:'freight', note:'К заказу #22' },
      { id:18, title:'СФ №2026-045',     type:'INVOICE',  counterparty:'ООО «ЕвроПласт»',           number:'СФ-2026-045',  dateIssue:'2026-06-01', dateExpiry:'2026-07-01', status:'На подписании', amount:'5500', mode:'freight', note:'К заказу #19' },
    ]));
  }
  // Accounting docs (KEYS.docs = 'docs' → 'mt_shared_docs')
  if (!localStorage.getItem('mt_shared_docs')) {
    localStorage.setItem('mt_shared_docs', JSON.stringify([
      { id:1, name:'Акт АВР-0023 / ООО ТехГруз',    type:'Акт выполненных работ', date:'2026-04-07', size:'124 КБ' },
      { id:2, name:'Акт АВР-0024 / БелЭкспорт',     type:'Акт выполненных работ', date:'2026-04-11', size:'118 КБ' },
      { id:3, name:'Акт АВР-0031 / БелТех',         type:'Акт выполненных работ', date:'2026-05-21', size:'131 КБ' },
      { id:4, name:'СФ-2026-037 / ООО ТехГруз',     type:'Счёт-фактура',          date:'2026-04-07', size:'98 КБ'  },
      { id:5, name:'СФ-2026-044 / МинскПром',       type:'Счёт-фактура',          date:'2026-06-01', size:'102 КБ' },
      { id:6, name:'Договор МТ-2026/04 / АвтоЛогист', type:'Договор',             date:'2026-04-01', size:'245 КБ' },
      { id:7, name:'Договор МТ-2026/05 / ИП Захаров', type:'Договор',             date:'2026-05-01', size:'198 КБ' },
      { id:8, name:'Доверенность №12 на Петрова',   type:'Доверенность',          date:'2026-04-01', size:'76 КБ'  },
    ]));
  }
}

// ── Корень приложения ─────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mt_user') || 'null'); }
    catch { return null; }
  });

  function handleLogin(userData, jwtToken) {
    localStorage.setItem('mt_user', JSON.stringify(userData));
    localStorage.setItem('mt_token', jwtToken);
    // Сбрасываем старые неправильные ключи при каждом входе, затем инициализируем
    localStorage.removeItem('mt_shared_documents');
    localStorage.removeItem('mt_shared_docs');
    initDemoData();
    setUser(userData);
  }

  function handleLogout() {
    localStorage.removeItem('mt_user');
    localStorage.removeItem('mt_token');
    setUser(null);
  }

  if (!user) return <Login onLogin={handleLogin} />;
  // key=user.login гарантирует полный remount при смене аккаунта

  const w = (path, el) => (
    <Layout user={user} onLogout={handleLogout} path={path}>{el}</Layout>
  );

  return (
    <BrowserRouter key={user.login || 'anon'}>
      <Routes>
        <Route path="/"            element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/dashboard"   element={w('/dashboard',   <Dashboard user={user} />)} />
        <Route path="/tracking"    element={w('/tracking',    <ErrorBoundary><TrackingMap /></ErrorBoundary>)} />
        <Route path="/orders"      element={w('/orders',      <OrdersPanel user={user} />)} />
        <Route path="/messages"    element={w('/messages',    <Messenger />)} />
        <Route path="/contacts"    element={w('/contacts',    <Contacts />)} />
        <Route path="/accounting"  element={w('/accounting',  <Accounting />)} />
        <Route path="/analytics"   element={w('/analytics',   <Analytics />)} />
        <Route path="/admin"       element={w('/admin',       <Admin />)} />
        <Route path="/documents"   element={w('/documents',   <Documents />)} />
        <Route path="/legislation" element={w('/legislation', <Legislation />)} />
        <Route path="/claims"      element={w('/claims',      <Claims user={user} />)} />
        <Route path="/rates"       element={w('/rates',       <RateCalc user={user} />)} />
        <Route path="/portal"      element={w('/portal',      <ClientPortal user={user} />)} />
        <Route path="*"            element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
