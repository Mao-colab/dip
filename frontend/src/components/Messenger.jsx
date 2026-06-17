/**
 * Messenger.jsx — внутренний чат платформы
 * Данные: backend API /api/v1/chat/contacts + /api/v1/chat/user/:id
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { IconMessages } from '../icons';

const PRIMARY = '#d97706';
const BORDER  = '1px solid #e5e7eb';
const BASE    = process.env.REACT_APP_API_URL || 'http://localhost:4000/api/v1';
// Сокет подключаем так же, как трекинг: пустой URL → текущий origin (в dev проксируется на :4000)
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || '';

function getToken() { return localStorage.getItem('mt_token'); }
function getMe()    { try { return JSON.parse(localStorage.getItem('mt_user') || 'null'); } catch { return null; } }

function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d), now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Сегодня';
  const yes = new Date(now); yes.setDate(yes.getDate() - 1);
  if (date.toDateString() === yes.toDateString()) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
function initials(name = '') { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'; }

const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#be185d','#0891b2'];
function getColor(name = '') { let h = 0; for (const c of name) h += c.charCodeAt(0); return COLORS[h % COLORS.length]; }

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function Messenger() {
  const location   = useLocation();
  const me         = getMe();
  const myId       = me?.id;
  const myName     = me?.name || 'Я';

  const [contacts,    setContacts]    = useState([]);
  const [activeId,    setActiveId]    = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Загрузка списка чатов
  const loadContacts = useCallback(async () => {
    try {
      const data = await apiFetch('/chat/contacts');
      // дедупликация по id пользователя — берём только последнее сообщение
      const seen = new Set();
      const deduped = data.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
      setContacts(deduped);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // Автооткрытие из Контактов
  useEffect(() => {
    const contact = location.state?.contact;
    if (!contact) return;
    setActiveId(contact.id);
    window.history.replaceState({}, '');
  }, [location.state]);

  // Загрузка истории при выборе чата
  useEffect(() => {
    if (!activeId) return;
    apiFetch(`/chat/user/${activeId}`)
      .then(msgs => setMessages(msgs))
      .catch(() => setMessages([]));
    inputRef.current?.focus();
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeContact = contacts.find(c => c.id === activeId);

  // ── Реал-тайм приём входящих сообщений (WebSocket) ──────────────────────
  // Держим актуальный activeId в ref, чтобы не пересоздавать сокет при смене чата.
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const socket = io(SOCKET_URL || undefined, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('chat:message', (m) => {
      const senderId = m.senderId ?? m.sender_id;
      // Сообщение в открытом сейчас диалоге — сразу добавляем в ленту
      if (String(senderId) === String(activeIdRef.current)) {
        setMessages(prev =>
          prev.some(x => x.id === m.id) ? prev : [...prev, {
            id:          m.id,
            text:        m.text,
            sender_id:   senderId,
            sender_name: m.senderName ?? m.sender_name,
            created_at:  m.createdAt ?? m.created_at ?? new Date().toISOString(),
          }]
        );
      }
      // Обновляем список диалогов (превью последнего сообщения, счётчик, порядок)
      loadContacts();
    });

    return () => socket.disconnect();
  }, [loadContacts]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    try {
      const msg = await apiFetch('/chat/send', {
        method: 'POST',
        body: JSON.stringify({ text, receiverId: activeId }),
      });
      setMessages(prev => [...prev, {
        id: msg.id, text: msg.text, sender_id: myId,
        sender_name: myName, created_at: msg.createdAt || new Date().toISOString(),
      }]);
      setInput('');
      // обновить preview в списке
      setContacts(prev => prev.map(c =>
        c.id === activeId ? { ...c, last_message: text, last_time: new Date().toISOString(), sender_id: myId } : c
      ));
    } catch {}
    setSending(false);
    inputRef.current?.focus();
  }, [input, activeId, myId, myName, sending]);

  const handleKey = useCallback(e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  // Группировка по датам
  function grouped(msgs) {
    const out = []; let lastDate = null;
    msgs.forEach(m => {
      const d = fmtDate(m.created_at);
      if (d !== lastDate) { out.push({ type: 'divider', text: d }); lastDate = d; }
      out.push({ type: 'msg', ...m });
    });
    return out;
  }

  const filtered = contacts.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Левая панель ─────────────────────────────────────────────── */}
      <aside style={{ width: 300, flexShrink: 0, background: '#fff', borderRight: BORDER, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: BORDER, display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#111827', flex: 1 }}>Сообщения</h2>
        </div>

        <div style={{ padding: '10px 12px', borderBottom: BORDER }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 9, padding: '7px 12px', border: BORDER }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="#9ca3af" strokeWidth="1.5"/>
              <line x1="10" y1="10" x2="14" y2="14" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, outline: 'none', color: '#374151' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <IconMessages size={40} color="#d1d5db"/>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Нет переписок</div>
            </div>
          ) : filtered.map(c => (
            <div key={c.id} onClick={() => setActiveId(c.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer',
              background: activeId === c.id ? '#fffbeb' : 'transparent', borderBottom: '1px solid #f3f4f6',
              borderLeft: `3px solid ${activeId === c.id ? PRIMARY : 'transparent'}`,
              transition: 'background 0.1s',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: c.avatar_color || getColor(c.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
              }}>
                {initials(c.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                  <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0, marginLeft: 6 }}>{fmtTime(c.last_time)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {c.sender_id === myId ? <span style={{ color: '#9ca3af' }}>Вы: </span> : null}
                    {c.last_message || <span style={{ fontStyle: 'italic' }}>Нет сообщений</span>}
                  </div>
                  {c.unread_count > 0 && (
                    <div style={{ background: PRIMARY, color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {c.unread_count}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '10px 14px', borderTop: BORDER, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11 }}>
            {initials(myName)}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myName}</span>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }}/>
        </div>
      </aside>

      {/* ── Правая панель — переписка ─────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
        {!activeContact ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#9ca3af' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconMessages size={32} color="#d1d5db"/>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', textAlign: 'center' }}>Выберите чат</div>
          </div>
        ) : (
          <>
            {/* Шапка */}
            <div style={{ padding: '12px 20px', background: '#fff', borderBottom: BORDER, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: activeContact.avatar_color || getColor(activeContact.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {initials(activeContact.name)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{activeContact.name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>{activeContact.role}</div>
              </div>
            </div>

            {/* Сообщения */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {grouped(messages).map((item, i) => {
                if (item.type === 'divider') {
                  return (
                    <div key={i} style={{ textAlign: 'center', margin: '12px 0 4px', fontSize: 11, color: '#9ca3af', position: 'relative' }}>
                      <span style={{ background: '#f8fafc', padding: '0 12px', position: 'relative', zIndex: 1 }}>{item.text}</span>
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#e5e7eb', zIndex: 0 }}/>
                    </div>
                  );
                }
                const fromMe = item.sender_id === myId;
                return (
                  <div key={item.id || i} style={{ display: 'flex', justifyContent: fromMe ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
                    <div style={{
                      maxWidth: '72%', padding: '9px 14px', borderRadius: fromMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: fromMe ? PRIMARY : '#fff',
                      color: fromMe ? '#fff' : '#111827',
                      fontSize: 13, lineHeight: 1.5,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    }}>
                      {!fromMe && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 3 }}>{item.sender_name}</div>
                      )}
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.text}</div>
                      <div style={{ fontSize: 10, color: fromMe ? 'rgba(255,255,255,0.7)' : '#9ca3af', textAlign: 'right', marginTop: 3 }}>
                        {fmtTime(item.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef}/>
            </div>

            {/* Ввод */}
            <div style={{ padding: '12px 16px', background: '#fff', borderTop: BORDER, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Написать сообщение..." rows={1}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 14, border: BORDER, fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', background: '#f8fafc', maxHeight: 100, overflowY: 'auto' }}
              />
              <button onClick={sendMessage} disabled={!input.trim() || sending} style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: input.trim() ? PRIMARY : '#e5e7eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
