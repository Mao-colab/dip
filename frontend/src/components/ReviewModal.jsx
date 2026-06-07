/**
 * ReviewModal — FR-09: Рейтинг 1–5 звёзд и текстовый отзыв о перевозчике
 */
import { useState } from 'react';
import { reviewsApi } from '../services/api';

export default function ReviewModal({ targetUserId, targetName, loadId, onClose, onSubmitted }) {
  const [rating,  setRating]  = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text,    setText]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  async function submit() {
    if (!rating) { setError('Выберите оценку'); return; }
    setSaving(true);
    setError('');
    try {
      await reviewsApi.create({ target_user_id: targetUserId, load_id: loadId, rating, text: text.trim() });
      onSubmitted?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const stars = [1, 2, 3, 4, 5];
  const LABELS = { 1: 'Плохо', 2: 'Ниже среднего', 3: 'Нормально', 4: 'Хорошо', 5: 'Отлично' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
         onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:18, padding:28, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
           onClick={e => e.stopPropagation()}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'#111827' }}>Оценить перевозчика</h3>
          <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:16 }}>×</button>
        </div>

        <p style={{ margin:'0 0 16px', fontSize:14, color:'#6b7280' }}>
          Оцените работу <strong style={{ color:'#111827' }}>{targetName}</strong>
          {loadId ? ` по заказу #${loadId}` : ''}
        </p>

        {/* Звёзды */}
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:8 }}>
          {stars.map(s => (
            <button key={s}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill={(hovered || rating) >= s ? '#f59e0b' : 'none'}
                   stroke={(hovered || rating) >= s ? '#f59e0b' : '#d1d5db'} strokeWidth="1.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
          ))}
        </div>

        {(hovered || rating) > 0 && (
          <div style={{ textAlign:'center', fontSize:13, color:'#f59e0b', fontWeight:600, marginBottom:16 }}>
            {LABELS[hovered || rating]}
          </div>
        )}

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Комментарий (необязательно)..."
          rows={3}
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid #e5e7eb',
                   fontSize:13, resize:'vertical', fontFamily:'sans-serif', boxSizing:'border-box', outline:'none' }}
        />

        {error && (
          <div style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:8, padding:'8px 12px',
                        color:'#dc2626', fontSize:13, marginTop:10 }}>{error}</div>
        )}

        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          <button onClick={submit} disabled={saving || !rating}
            style={{ flex:1, padding:'10px 0', background: !rating ? '#e5e7eb' : '#2563eb', color: !rating ? '#9ca3af' : '#fff',
                     border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor: !rating ? 'default' : 'pointer' }}>
            {saving ? 'Отправляем...' : 'Отправить отзыв'}
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
