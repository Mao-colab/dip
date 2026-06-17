/**
 * IncidentModal — FR-28: Регистрация инцидента по заявке (поломка, ДТП, форс-мажор)
 */
import { useState } from 'react';
import { incidentsApi } from '../services/api';

const TYPES = [
  { v: 'breakdown',    l: 'Поломка ТС' },
  { v: 'accident',     l: 'ДТП' },
  { v: 'delay',        l: 'Задержка' },
  { v: 'customs',      l: 'Таможня' },
  { v: 'cargo_damage', l: 'Повреждение груза' },
  { v: 'other',        l: 'Прочее' },
];

export default function IncidentModal({ loadId, onClose, onCreated }) {
  const [type,    setType]    = useState('breakdown');
  const [desc,    setDesc]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  async function submit() {
    if (!desc.trim()) { setError('Укажите описание инцидента'); return; }
    setSaving(true);
    setError('');
    try {
      // Пытаемся получить геопозицию
      let lat = null, lng = null;
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}

      const incident = await incidentsApi.create({ load_id: loadId, type, description: desc.trim(), lat, lng });
      onCreated?.(incident);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const TYPE_ICONS = {
    breakdown: '', accident: '', delay: '',
    customs: '', cargo_damage: '', other: '⚠',
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
         onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:18, padding:28, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
           onClick={e => e.stopPropagation()}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'#111827' }}>
            ⚠ Сообщить об инциденте
          </h3>
          <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:16 }}>×</button>
        </div>

        {loadId && (
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'8px 12px', fontSize:13, color:'#92400e', marginBottom:16 }}>
            Заказ <strong>#{loadId}</strong> — диспетчер будет уведомлён немедленно
          </div>
        )}

        {/* Тип инцидента */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.4 }}>
            Тип инцидента
          </label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {TYPES.map(t => (
              <button key={t.v} onClick={() => setType(t.v)}
                style={{
                  padding:'9px 12px', borderRadius:10, border:`2px solid ${type === t.v ? '#2563eb' : '#e5e7eb'}`,
                  background: type === t.v ? '#eff6ff' : '#f9fafb',
                  color: type === t.v ? '#2563eb' : '#374151',
                  fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'left',
                  display:'flex', alignItems:'center', gap:8,
                }}>
                <span>{TYPE_ICONS[t.v]}</span>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        {/* Описание */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.4 }}>
            Описание <span style={{ color:'#dc2626' }}>*</span>
          </label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Опишите что произошло..."
            rows={4}
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid #e5e7eb',
                     fontSize:13, resize:'vertical', fontFamily:'sans-serif', boxSizing:'border-box', outline:'none' }}
          />
        </div>

        {error && (
          <div style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:8, padding:'8px 12px',
                        color:'#dc2626', fontSize:13, marginBottom:10 }}>{error}</div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={submit} disabled={saving}
            style={{ flex:1, padding:'10px 0', background:'#dc2626', color:'#fff',
                     border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor: saving ? 'default' : 'pointer', opacity: saving ? .7 : 1 }}>
            {saving ? 'Отправка...' : 'Сообщить об инциденте'}
          </button>
          <button onClick={onClose}
            style={{ padding:'10px 18px', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:10,
                     fontSize:14, cursor:'pointer', color:'#374151' }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
