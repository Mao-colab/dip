/**
 * BynSign — официальный знак белорусского рубля
 * Использует шрифт nbrb (файлы: /public/fonts/nbrb.woff2 / .woff / .ttf)
 * Глиф U+E901 — прямой доступ, надёжнее лигатуры "BYN"
 */

// Инжектируем @font-face и .nbrb-icon один раз при первом импорте
(function injectNbrbFont() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('nbrb-font-style')) return;
  const style = document.createElement('style');
  style.id = 'nbrb-font-style';
  style.textContent = `
    @font-face {
      font-family: "nbrb";
      src: url("/fonts/nbrb.woff2") format("woff2"),
           url("/fonts/nbrb.woff")  format("woff"),
           url("/fonts/nbrb.ttf")   format("truetype");
      unicode-range: U+E901, U+0042, U+0059, U+004E;
      font-display: block;
    }
    .nbrb-icon {
      font-family: "nbrb" !important;
      speak: none;
      font-style: normal;
      font-weight: normal;
      font-variant: normal;
      text-transform: none;
      line-height: 1;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-font-feature-settings: "liga";
      font-feature-settings: "liga";
      -webkit-font-variant-ligatures: discretionary-ligatures;
      font-variant-ligatures: discretionary-ligatures;
    }
  `;
  document.head.appendChild(style);
})();

export function BynSign({ size = 14, color = 'currentColor', style = {} }) {
  return (
    <i
      className="nbrb-icon"
      aria-label="BYN"
      style={{
        fontSize: size,
        color,
        display: 'inline-block',
        verticalAlign: 'middle',
        lineHeight: 1,
        fontStyle: 'normal',
        userSelect: 'none',
        ...style,
      }}
    >
      {'\uE901'}
    </i>
  );
}

/**
 * icons.js — MT SVG Icon Library
 * Полная библиотека SVG-иконок. Заменяет все эмодзи в проекте.
 */

export function IconMap({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M1 4.5L7 2l6 3 5-2.5V15.5L13 18l-6-3-6 2.5V4.5z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><line x1="7" y1="2" x2="7" y2="15" stroke={color} strokeWidth="1.4"/><line x1="13" y1="5" x2="13" y2="18" stroke={color} strokeWidth="1.4"/></svg>);
}

export function IconOrders({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M10 2L3 6v8l7 4 7-4V6L10 2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 2v12M3 6l7 4 7-4" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/></svg>);
}

export function IconMessages({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M3 3h14a1 1 0 011 1v9a1 1 0 01-1 1h-6l-4 3v-3H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><line x1="6" y1="8" x2="14" y2="8" stroke={color} strokeWidth="1.4" strokeLinecap="round"/><line x1="6" y1="11" x2="11" y2="11" stroke={color} strokeWidth="1.4" strokeLinecap="round"/></svg>);
}

export function IconContacts({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="7.5" cy="7" r="3" stroke={color} strokeWidth="1.5"/><path d="M2 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><circle cx="14" cy="6.5" r="2.5" stroke={color} strokeWidth="1.4"/><path d="M16.5 15.5c0-2-1.5-3.5-3-4" stroke={color} strokeWidth="1.4" strokeLinecap="round"/></svg>);
}

export function IconAccounting({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="11" rx="2" stroke={color} strokeWidth="1.5"/><line x1="2" y1="9" x2="18" y2="9" stroke={color} strokeWidth="1.5"/><rect x="5" y="12" width="3" height="1.5" rx=".75" fill={color}/><rect x="10" y="12" width="2.5" height="1.5" rx=".75" fill={color}/><line x1="7" y1="3" x2="7" y2="6" stroke={color} strokeWidth="1.4" strokeLinecap="round"/><line x1="13" y1="3" x2="13" y2="6" stroke={color} strokeWidth="1.4" strokeLinecap="round"/></svg>);
}

export function IconAnalytics({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><rect x="2" y="12" width="3" height="6" rx="1" fill={color} opacity=".65"/><rect x="7" y="8" width="3" height="10" rx="1" fill={color} opacity=".8"/><rect x="12" y="4" width="3" height="14" rx="1" fill={color}/><line x1="1.5" y1="18.5" x2="18.5" y2="18.5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/></svg>);
}

export function IconSettings({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="2.5" stroke={color} strokeWidth="1.5"/><path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 13l1.3 1.3M4.7 15.3l1.3-1.3M14 7l1.3-1.3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>);
}

export function IconEdit({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M14 3l3 3-9 9H5v-3L14 3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><line x1="3" y1="18" x2="17" y2="18" stroke={color} strokeWidth="1.4" strokeLinecap="round"/></svg>);
}

export function IconTruck({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><rect x="1" y="7" width="12" height="8" rx="1" stroke={color} strokeWidth="1.5"/><path d="M13 10h3.5l2.5 3v2H13V10z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><circle cx="4.5" cy="15.5" r="1.5" stroke={color} strokeWidth="1.3"/><circle cx="15.5" cy="15.5" r="1.5" stroke={color} strokeWidth="1.3"/></svg>);
}

export function IconPayment({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><rect x="1" y="4" width="18" height="13" rx="2" stroke={color} strokeWidth="1.5"/><line x1="1" y1="8" x2="19" y2="8" stroke={color} strokeWidth="1.5"/><rect x="4" y="11" width="4" height="2" rx="1" fill={color}/></svg>);
}

export function IconStaff({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="6.5" r="3.5" stroke={color} strokeWidth="1.5"/><path d="M2.5 18c0-4 3.5-6.5 7.5-6.5s7.5 2.5 7.5 6.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>);
}

export function IconDocument({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M5 3h7l4 4v11a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 3v4h4" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/><line x1="7" y1="11" x2="13" y2="11" stroke={color} strokeWidth="1.3" strokeLinecap="round"/><line x1="7" y1="14" x2="11" y2="14" stroke={color} strokeWidth="1.3" strokeLinecap="round"/></svg>);
}

export function IconFolder({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M2 6a2 2 0 012-2h3l2 2h7a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></svg>);
}

export function IconPin({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M10 2a5 5 0 015 5c0 3.5-5 11-5 11S5 10.5 5 7a5 5 0 015-5z" stroke={color} strokeWidth="1.5"/><circle cx="10" cy="7" r="2" stroke={color} strokeWidth="1.3"/></svg>);
}

export function IconClock({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke={color} strokeWidth="1.5"/><path d="M10 6v4l3 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}

export function IconCheck({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke={color} strokeWidth="1.5"/><path d="M6.5 10l2.5 2.5 4.5-5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}

export function IconBlock({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke={color} strokeWidth="1.5"/><line x1="4" y1="4" x2="16" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>);
}

export function IconTrash({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M3 6h14M8 6V4h4v2M5 6l1 11h8l1-11" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}

export function IconKey({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="7" cy="9" r="4" stroke={color} strokeWidth="1.5"/><path d="M10.5 11.5l6.5 6.5M14 14.5l2-2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>);
}

export function IconBell({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M10 2a6 6 0 016 6v4l1.5 2H2.5L4 12V8a6 6 0 016-6z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 16a2 2 0 004 0" stroke={color} strokeWidth="1.4"/></svg>);
}

export function IconCompany({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><rect x="2" y="8" width="16" height="10" rx="1" stroke={color} strokeWidth="1.5"/><path d="M6 8V5a4 4 0 018 0v3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><rect x="8" y="12" width="4" height="6" rx="1" fill={color} opacity=".35"/><line x1="2" y1="12" x2="18" y2="12" stroke={color} strokeWidth="1.2"/></svg>);
}

export function IconSave({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M4 2h10l4 4v12a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><rect x="6" y="2" width="8" height="5" rx="0.5" stroke={color} strokeWidth="1.3"/><rect x="5" y="11" width="10" height="7" rx="1" stroke={color} strokeWidth="1.3"/></svg>);
}

export function IconStar({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M10 2l2.4 5 5.6.8-4 3.9 1 5.6L10 14.5l-5 2.8 1-5.6-4-3.9 5.6-.8L10 2z" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/></svg>);
}

export function IconPerson({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="4" stroke={color} strokeWidth="1.5"/><path d="M3 18c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>);
}

export function IconLogout({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M8 3H4a1 1 0 00-1 1v12a1 1 0 001 1h4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><path d="M13 14l4-4-4-4M17 10H8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}

export function IconSquare({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke={color} strokeWidth="1.5"/></svg>);
}

export function IconClaim({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M10 2l8 14H2L10 2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><line x1="10" y1="8" x2="10" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="14.5" r="0.8" fill={color}/></svg>);
}

export function IconRate({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M3 17l4-4 3 3 7-9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="15" cy="5" r="2.5" stroke={color} strokeWidth="1.4"/></svg>);
}

export function IconPortal({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="13" rx="2" stroke={color} strokeWidth="1.5"/><line x1="2" y1="7" x2="18" y2="7" stroke={color} strokeWidth="1.4"/><circle cx="5" cy="5" r="1" fill={color}/><circle cx="8" cy="5" r="1" fill={color}/><path d="M6 11h8M6 14h5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/></svg>);
}

export function IconDownload({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M10 3v10M6 9l4 4 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 15h14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>);
}

export function IconShield({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5l7-3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 10l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}

export function IconRefresh({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M3.5 10A6.5 6.5 0 1110 3.5c1.8 0 3.4.7 4.6 1.9L17 8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><path d="M17 4v4h-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}

export function IconFilter({ size = 16, color = 'currentColor' }) {
  return (<svg width={size} height={size} viewBox="0 0 20 20" fill="none"><path d="M3 5h14M6 10h8M9 15h2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>);
}