/**
 * TrackingMap.jsx — трекинг водителей (real-time)
 * Yandex Maps: маркеры + маршрутные линии
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IconMap, IconTruck } from '../icons';
import { useTracking } from '../hooks/useTracking';
import './TrackingMap.css';

const YMAPS_KEY = '070cc525-a4d1-4aee-9b82-a53bdf387df4';
const MAP_CENTER = [53.9045, 27.5615];
const MAP_ZOOM = 6;

const STATUS_CFG = {
  active: { dot: '#22C55E', line: '#22C55E', label: 'Активен' },
  idle: { dot: '#94A3B8', line: '#94A3B8', label: 'Без заказов' },
  switched_off: { dot: '#EF4444', line: '#EF4444', label: 'Оффлайн' },
  delayed: { dot: '#F59E0B', line: '#F59E0B', label: 'Задержка' },
};

// Для “маршрутной линии” пока используем демонстрационные ROUTES.
// ID соответствует load_id заказа в БД
const ROUTES = {
  // Иван: Брест → Берлин (load #19)
  '19': {
    from: [52.0975, 23.7341],
    waypoints: [[52.1000, 21.8000], [52.4000, 19.0000], [52.5000, 14.5500]],
    to: [52.5200, 13.4050],
    label: 'Брест → Берлин',
  },
  // Николай: Минск → Варшава (load #18, задержка на таможне)
  '18': {
    from: [53.9045, 27.5615],
    waypoints: [[53.1500, 26.0000], [52.6000, 24.5000], [52.0819, 23.6181]],
    to: [52.2297, 21.0122],
    label: 'Минск → Варшава',
  },
  // Роман: Гомель → Вильнюс (load #20)
  '20': {
    from: [52.4345, 30.9754],
    waypoints: [[53.6000, 28.5000], [54.3500, 26.5000]],
    to: [54.6872, 25.2797],
    label: 'Гомель → Вильнюс',
  },
  // Алексей: Витебск → Рига (load #21)
  '21': {
    from: [55.1904, 30.2049],
    waypoints: [[55.5000, 27.0000], [56.0000, 25.5000]],
    to: [56.9460, 24.1059],
    label: 'Витебск → Рига',
  },
};

/** Вычисляет прогресс (0..1) по ближайшей точке к текущей позиции водителя */
function calcProgress(route, lat, lng) {
  if (lat == null || lng == null) return 0.5;
  const pts = [route.from, ...route.waypoints, route.to];
  let minDist = Infinity, minIdx = 0;
  pts.forEach(([rlat, rlng], i) => {
    const d = Math.hypot(lat - rlat, lng - rlng);
    if (d < minDist) { minDist = d; minIdx = i; }
  });
  return minIdx / (pts.length - 1);
}

/** Интерполировать позицию вдоль маршрута (progress 0..1) */
function interpolateRoute(route, progress) {
  const pts = [route.from, ...route.waypoints, route.to];
  const t = Math.max(0, Math.min(1, progress));
  const seg = t * (pts.length - 1);
  const i = Math.min(Math.floor(seg), pts.length - 2);
  const f = seg - i;
  return [
    pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
    pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f,
  ];
}

function timeSince(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return `${s} сек`;
  return `${Math.floor(s / 60)} мин`;
}

export default function TrackingMap() {
  const { drivers, selectedRoute, isConnected, isLoading, error, wsError, routeError, refresh } = useTracking();

  const mapRef = useRef(null);
  const mapObj = useRef(null);

  const markers = useRef({});
  const routeLines = useRef({});

  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const driversArr = useMemo(() => {
    return Array.from(drivers.values()).map((d) => ({
      ...d,
      // useTracking хранит lastUpdate как Date|null
      progress: d.progress ?? 0,
      lastUpdate: d.lastUpdate ?? null,
      plate: d.plate ?? '',
    }));
  }, [drivers]);

  const filtered = useMemo(() => {
    return driversArr.filter((d) => {
      if (filter === 'with_orders' && !d.loadId) return false;
      if (filter === 'without_orders' && d.loadId) return false;
      if (
        search &&
        !d.name.toLowerCase().includes(search.toLowerCase()) &&
        !String(d.plate || '').toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [driversArr, filter, search]);

  const groups = useMemo(() => {
    return [
      ['Задержка', filtered.filter((d) => d.status === 'delayed')],
      ['Активные', filtered.filter((d) => d.status === 'active')],
      ['Без заказов', filtered.filter((d) => d.status === 'idle')],
      ['Оффлайн', filtered.filter((d) => d.status === 'switched_off')],
    ];
  }, [filtered]);

  // ── Загрузка Яндекс.Карт ────────────────────────────────────────────────
  useEffect(() => {
    if (window.ymaps) { window.ymaps.ready(initMap); return; }
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YMAPS_KEY}&lang=ru_RU`;
    script.async = true;
    script.crossOrigin = 'anonymous';  // предотвращает "Script error" в React dev overlay
    script.onload = () => { try { window.ymaps.ready(initMap); } catch { setReady(false); } };
    script.onerror = () => setReady(false);
    document.head.appendChild(script);
    return () => { try { mapObj.current?.destroy(); } catch {} mapObj.current = null; };
  }, []); // eslint-disable-line

  function initMap() {
    if (!mapRef.current || mapObj.current) return;
    try {
      const map = new window.ymaps.Map(
        mapRef.current,
        { center: MAP_CENTER, zoom: MAP_ZOOM, controls: ['zoomControl', 'geolocationControl'] },
        { suppressMapOpenBlock: true }
      );
      mapObj.current = map;
      setReady(true);
    } catch { setReady(false); }
  }

  function drawRouteLine(map, d) {
    if (!map || !window.ymaps || !d.loadId || !ROUTES[d.loadId]) return;
    const route = ROUTES[d.loadId];
    const cfg = STATUS_CFG[d.status] || STATUS_CFG.active;
    if (routeLines.current[d.loadId]) {
      try { map.geoObjects.remove(routeLines.current[d.loadId]); } catch {}
    }
    const pts = [route.from, ...route.waypoints, route.to];
    const doneProgress = typeof d.progress === 'number'
      ? d.progress
      : calcProgress(route, d.lat, d.lng);
    const splitIdx = Math.round(doneProgress * (pts.length - 1));
    const donePts = pts.slice(0, splitIdx + 1);
    const restPts = pts.slice(splitIdx);
    if (donePts.length >= 2) {
      const lineDone = new window.ymaps.Polyline(donePts,
        { hintContent: `${route.label} (пройдено)` },
        { strokeColor: cfg.line, strokeWidth: 4, strokeOpacity: 0.9 }
      );
      map.geoObjects.add(lineDone);
      routeLines.current[d.loadId] = lineDone;
    }
    if (restPts.length >= 2) {
      map.geoObjects.add(new window.ymaps.Polyline(restPts,
        { hintContent: `${route.label} (осталось)` },
        { strokeColor: '#94A3B8', strokeWidth: 3, strokeOpacity: 0.5, strokeStyle: 'dash' }
      ));
    }
  }

  function placeMarker(map, d) {
    if (!map || !window.ymaps || d.lat == null || d.lng == null) return;
    const cfg = STATUS_CFG[d.status] || STATUS_CFG.active;
    const route = d.loadId ? ROUTES[d.loadId] : null;
    const body = `<div style=”padding:8px 12px;min-width:160px;font-family:sans-serif”>
      <b style=”font-size:13px;color:#111827”>${d.name}</b><br/>
      ${d.loadId ? `<span style=”color:#d97706”>Заказ #${d.loadId}</span><br/>` : ''}
      ${route ? `<span style=”font-size:12px”>${route.label}</span><br/>` : ''}
      <span style=”font-size:12px;color:#6b7280”>${cfg.label}</span>
      ${d.speed > 0 ? `<br/><span style=”font-size:12px”>${Math.round(d.speed)} км/ч</span>` : ''}
    </div>`;
    const id = String(d.id);
    if (markers.current[id]) {
      markers.current[id].geometry.setCoordinates([d.lat, d.lng]);
      markers.current[id].properties.set('balloonContentBody', body);
    } else {
      const pm = new window.ymaps.Placemark(
        [d.lat, d.lng],
        { balloonContentHeader: d.name, balloonContentBody: body, hintContent: d.name },
        { preset: 'islands#circleDotIcon', iconColor: cfg.dot }
      );
      map.geoObjects.add(pm);
      markers.current[id] = pm;
    }
  }

  // ── Обновление маркеров при изменении drivers ──────────────────────────
  useEffect(() => {
    if (!mapObj.current || !window.ymaps || !ready) return;
    const ids = new Set(driversArr.map((d) => String(d.id)));
    Object.keys(markers.current).forEach((id) => {
      if (!ids.has(id)) {
        try { mapObj.current.geoObjects.remove(markers.current[id]); } catch {}
        delete markers.current[id];
      }
    });

    driversArr.forEach((d) => {
      if (d.lat == null || d.lng == null) return;
      drawRouteLine(mapObj.current, d);
      placeMarker(mapObj.current, d);
    });
  }, [driversArr, ready]);

  function focusDriver(d) {
    setSelected(String(d.id));
    if (!mapObj.current || d.lat == null || d.lng == null) return;
    try { mapObj.current.setCenter([d.lat, d.lng], 12, { duration: 500 }); } catch {}
    try { markers.current[String(d.id)]?.balloon?.open(); } catch {}
  }

  return (
    <div className="tracking-layout">
      {/* Левая панель */}
      <aside className="tracking-sidebar">
        <div className="sidebar-header">
          <input className="sidebar-search" placeholder="Поиск по имени или номеру..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="sidebar-filter-tabs">
            <button className={`filter-tab${filter === 'with_orders' ? ' active' : ''}`} onClick={() => setFilter(filter === 'with_orders' ? 'all' : 'with_orders')}>
              С заказами
            </button>
            <button className={`filter-tab${filter === 'without_orders' ? ' active' : ''}`} onClick={() => setFilter(filter === 'without_orders' ? 'all' : 'without_orders')}>
              Без заказов
            </button>
          </div>
        </div>

        <div className="ws-indicator connected">
          <span className={`ws-dot${isConnected ? ' on' : ''}`} />
          Трекинг: {isConnected ? 'on' : 'off'}
        </div>

        <div className="sidebar-list">
          {filtered.length === 0 && (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <IconTruck size={32} color="#9ca3af" />
              </div>
              <div style={{ fontSize: 13 }}>Нет водителей</div>
            </div>
          )}

          {groups.map(([title, list]) => (
            <div key={title} className="driver-group">
              {list.length > 0 && <div className="driver-group-title">{title}</div>}
              {list.map((d) => {
                const cfg = STATUS_CFG[d.status] || STATUS_CFG.active;
                const route = d.loadId ? ROUTES[d.loadId] : null;

                return (
                  <div
                    key={String(d.id)}
                    className={`driver-card${String(d.id) === selected ? ' selected' : ''} ${d.status}`}
                    onClick={() => focusDriver(d)}
                  >
                    <div className="driver-card-avatar">
                      <span className="driver-dot" style={{ background: cfg.dot }} />
                      <div className="driver-avatar-placeholder">{d.name ? d.name.charAt(0) : '?'}</div>
                    </div>

                    <div className="driver-card-info">
                      <div className="driver-name">{d.name}</div>
                      <div className="driver-meta">
                        {d.loadId ? <span className="driver-order">Заказ #{d.loadId}</span> : <span className="driver-no-order">Нет заказов</span>}
                        <span className="driver-time">{timeSince(d.lastUpdate)} назад</span>
                      </div>

                      {route && (
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, lineHeight: 1.3 }}>
                          {route.label}
                        </div>
                      )}

                      <div className="driver-telemetry">
                        {d.speed > 0 && <span>{Math.round(d.speed)} км/ч</span>}
                        {d.plate ? <span style={{ color: '#94A3B8', fontSize: 10 }}>{d.plate}</span> : null}
                      </div>
                    </div>

                    {d.status === 'delayed' && <div className="driver-status-badge delayed">Задержка</div>}
                    {d.status === 'switched_off' && <div className="driver-status-badge switched_off">Оффлайн</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Карта */}
      <div className="tracking-map-container">
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {(!ready || isLoading) && !error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: '#f8fafc', zIndex: 10 }}>
            <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#d97706', borderRadius: '50%', animation: 'ys-spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 14, color: '#64748b' }}>Загрузка карты/данных...</div>
          </div>
        )}

        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: '#f8fafc', zIndex: 10 }}>
            <IconMap size={48} color="#d1d5db" />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>Карта недоступна</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>{wsError || routeError || 'Проверьте подключение'}</div>
          </div>
        )}

        {ready && (
          <div style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 10,
            padding: '12px 16px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            zIndex: 10,
            minWidth: 160
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Легенда
            </div>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#374151', marginBottom: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.dot, flexShrink: 0 }} />
                {v.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes ys-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
