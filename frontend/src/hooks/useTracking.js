/**
 * MT — хук useTracking
 *
 * Управляет WebSocket-подпиской на GPS-обновления и REST-запросами
 * для Tracking модуля диспетчера.
 *
 * Использование:
 *   const { drivers, selectedRoute, selectDriver, error } = useTracking();
 *
 * ИСПРАВЛЕНИЯ v2:
 *  - resetStalenessTimer обёрнут в useCallback (баг с замыканием)
 *  - Разделены ошибки: wsError и routeError
 *  - fetchInitialDrivers заменяет Map целиком (удалённые водители исчезают)
 *  - Добавлен loading state
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || '';
const API_URL    = process.env.REACT_APP_API_URL    || '/api/v1';

// Сколько мс без пинга — считаем сигнал потерянным
const STALE_SIGNAL_MS = 90_000;

/**
 * @returns {{
 *   drivers: Map<string, DriverState>,
 *   selectedRoute: RouteData | null,
 *   isConnected: boolean,
 *   isLoading: boolean,
 *   wsError: string | null,
 *   routeError: string | null,
 *   selectDriver: (driverId: string) => void,
 *   subscribeToOrder: (orderId: string) => void,
 *   refresh: () => void,
 * }}
 */
export function useTracking() {
  const [drivers, setDrivers]           = useState(new Map());
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isConnected, setIsConnected]   = useState(false);
  const [isLoading, setIsLoading]       = useState(true);   // ✅ НОВОЕ: индикатор загрузки

  // ✅ ИСПРАВЛЕНО: разделены две независимые ошибки
  const [wsError, setWsError]           = useState(null);   // ошибка WebSocket
  const [routeError, setRouteError]     = useState(null);   // ошибка загрузки маршрута

  const socketRef        = useRef(null);
  const stalenessTimers  = useRef(new Map()); // driverId → timerId

  // ── 1. Загрузка начального списка водителей (REST) ───────────────────────
  const fetchInitialDrivers = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('mt_token');
      const res = await fetch(`${API_URL}/users?role=driver`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Ошибка загрузки водителей: HTTP ${res.status}`);

      const data = await res.json();

      // ✅ ИСПРАВЛЕНО: создаём новый Map с нуля (удалённые водители исчезают)
      const next = new Map();
      data.forEach((d) => {
        next.set(String(d.id), {
          id:         String(d.id),
          name:       d.name,
          status:     d.status,
          lat:        d.last_lat,
          lng:        d.last_lng,
          speed:      0,
          heading:    0,
          loadId:     d.load_id,
          lastUpdate: d.last_ping_at ? new Date(d.last_ping_at) : null,
          signalLost: false,
        });
      });
      setDrivers(next);
      setWsError(null);
    } catch (err) {
      setWsError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── 2. Таймер определения потери сигнала ────────────────────────────────
  // ✅ ИСПРАВЛЕНО: обёрнут в useCallback — нет баг с замыканием на старую версию
  const resetStalenessTimer = useCallback((driverId) => {
    if (stalenessTimers.current.has(driverId)) {
      clearTimeout(stalenessTimers.current.get(driverId));
    }

    const timer = setTimeout(() => {
      setDrivers((prev) => {
        if (!prev.has(driverId)) return prev;
        const next = new Map(prev);
        next.set(driverId, { ...next.get(driverId), signalLost: true });
        return next;
      });
    }, STALE_SIGNAL_MS);

    stalenessTimers.current.set(driverId, timer);
  }, []); // нет зависимостей — функция стабильна

  // ── 3. Обновление позиции водителя при GPS-пинге ────────────────────────
  const handleLocationUpdate = useCallback((payload) => {
    const { driverId, loadId, lat, lng, speed, heading, progress, status, timestamp } = payload;
    const id = String(driverId);

    setDrivers((prev) => {
      const next     = new Map(prev);
      const existing = next.get(id) || {};
      next.set(id, {
        ...existing,
        id,
        lat,
        lng,
        speed,
        heading,
        progress,   // прогресс по маршруту (0..1) — для закраски пройденного участка
        loadId,
        lastUpdate: new Date(timestamp),
        signalLost: false,
        // статус (цвет) из пинга; по умолчанию active
        status:     status || existing.status || 'active',
      });
      return next;
    });

    // ✅ ИСПРАВЛЕНО: вызов стабильной useCallback-версии
    resetStalenessTimer(id);
  }, [resetStalenessTimer]);

  // ── 4. Обновление статуса водителя (active / switched_off / delayed) ────
  const handleStatusUpdate = useCallback(({ driverId, status }) => {
    const id = String(driverId);
    setDrivers((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.set(id, { ...next.get(id), status });
      return next;
    });
  }, []);

  // ── 5. Загрузка маршрута выбранного водителя ────────────────────────────
  const selectDriver = useCallback(async (driverId) => {
    const driver = drivers.get(String(driverId));
    if (!driver?.loadId) {
      setSelectedRoute(null);
      return;
    }

    // ✅ ИСПРАВЛЕНО: сбрасываем routeError отдельно от wsError
    setRouteError(null);
    try {
      const token = localStorage.getItem('mt_token');
      const res = await fetch(`${API_URL}/tracking/routes/${driver.loadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Ошибка загрузки маршрута: HTTP ${res.status}`);

      const route = await res.json();
      setSelectedRoute(route);
    } catch (err) {
      setRouteError(err.message);
    }
  }, [drivers]);

  // ── 6. Подписка на конкретный заказ (WebSocket комната) ─────────────────
  const subscribeToOrder = useCallback((orderId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:order', orderId);
    }
  }, []);

  // ── 7. Инициализация WebSocket ───────────────────────────────────────────
  useEffect(() => {
    fetchInitialDrivers();

    const token  = localStorage.getItem('mt_token');
    const socket = io(SOCKET_URL || undefined, {
      auth:                { token },
      transports:          ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay:   2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setWsError(null);
      console.log('[WS] Подключён к серверу трекинга');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.warn('[WS] Отключён:', reason);
    });

    socket.on('connect_error', (err) => {
      setWsError(`WebSocket: ${err.message}`);
      setIsConnected(false);
    });

    socket.on('driver:location:update', handleLocationUpdate);
    socket.on('driver:status:update',   handleStatusUpdate);

    return () => {
      socket.disconnect();
      stalenessTimers.current.forEach((t) => clearTimeout(t));
      stalenessTimers.current.clear();
    };
  }, [fetchInitialDrivers, handleLocationUpdate, handleStatusUpdate]);

  return {
    drivers,
    selectedRoute,
    isConnected,
    isLoading,
    wsError,
    routeError,
    // для обратной совместимости с TrackingMap — объединяем ошибки в одно поле
    error: wsError || routeError,
    selectDriver,
    subscribeToOrder,
    refresh: fetchInitialDrivers,
  };
}