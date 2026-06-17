/**
 * MT Driver App — GpsService
 *
 * Сервис для мобильного приложения водителя (React Native или веб).
 * Отправляет GPS-пинги на сервер каждые 30–60 секунд.
 *
 * SRS §5 Reliability: "Real-time location pings must occur every 30–60 seconds"
 * SRS §12 Risk: при потере GPS — логируем и прекращаем отправку до восстановления
 *
 * Использование:
 *   GpsService.start({ token, loadId, onError });
 *   GpsService.stop();
 *   GpsService.updateLoad(newLoadId);
 *
 * ИСПРАВЛЕНИЯ v2:
 *  - Скорость переведена в км/ч (было миль/ч)
 *  - _prevSentPos инициализирован в конструкторе
 *  - Защита от пинга после stop()
 *  - Экспоненциальный backoff при ошибках сети
 *  - setInterval вместо рекурсивного setTimeout (нет накопления задержки)
 */

const API_URL = process.env.REACT_APP_API_URL || '/api/v1';

// Интервал пинга (30 сек — активный заказ, 60 сек — без заказа)
const PING_INTERVAL_ACTIVE = 30_000;
const PING_INTERVAL_IDLE   = 60_000;

// Минимальное смещение в метрах для отправки пинга (экономия трафика)
const MIN_DISTANCE_METERS = 50;

// Максимальная задержка при exponential backoff (2 минуты)
const MAX_BACKOFF_MS = 120_000;

class GpsServiceClass {
  constructor() {
    this._interval    = null;   // ИСПРАВЛЕНО: setInterval вместо рекурсивного setTimeout
    this._watchId     = null;   // navigator.geolocation.watchPosition id
    this._token       = null;
    this._loadId      = null;
    this._lastPos     = null;   // последняя полученная позиция
    this._prevSentPos = null;   // ИСПРАВЛЕНО: явная инициализация
    this._isRunning   = false;
    this._failCount   = 0;
    this._maxFails    = 5;
    this._onError     = null;
    this._backoffMs   = 0;      // НОВОЕ: текущая задержка backoff
  }

  /**
   * Запуск GPS-сервиса.
   * @param {{ token: string, loadId?: string|null, onError?: Function }} opts
   */
  start({ token, loadId = null, onError = null }) {
    if (this._isRunning) {
      console.warn('[GPS] Сервис уже запущен');
      return;
    }

    this._token      = token;
    this._loadId     = loadId;
    this._onError    = onError;
    this._isRunning  = true;
    this._failCount  = 0;
    this._backoffMs  = 0;
    this._prevSentPos = null;

    console.log('[GPS] Запуск сервиса, loadId:', loadId);

    // Геолокация браузера / React Native
    if (!('geolocation' in navigator)) {
      console.error('[GPS] Геолокация не поддерживается');
      this._onError?.('Геолокация не поддерживается на этом устройстве');
      this._isRunning = false;
      return;
    }

    this._watchId = navigator.geolocation.watchPosition(
      (pos) => this._onPosition(pos),
      (err) => this._onGpsError(err),
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 5_000,
      }
    );

    // ИСПРАВЛЕНО: setInterval — равномерные интервалы без накопления задержки
    this._startInterval();
  }

  /**
   * Остановка GPS-сервиса.
   */
  stop() {
    if (!this._isRunning) return;

    // ИСПРАВЛЕНО: сначала снимаем флаг — защита от пинга "в полёте"
    this._isRunning = false;

    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }

    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }

    this._lastPos    = null;
    this._prevSentPos = null;
    this._backoffMs  = 0;
    console.log('[GPS] Сервис остановлен');
  }

  /**
   * Обновить текущий заказ — меняет интервал пинга.
   * @param {string|null} loadId
   */
  updateLoad(loadId) {
    const wasActive = !!this._loadId;
    const isActive  = !!loadId;
    this._loadId = loadId;

    // Перезапускаем интервал если изменился тип (активный ↔ idle)
    if (wasActive !== isActive && this._isRunning) {
      this._startInterval();
    }

    console.log('[GPS] loadId обновлён:', loadId);
  }

  // ── Приватные методы ──────────────────────────────────────────────────────

  /** Запускает/перезапускает setInterval с нужным интервалом */
  _startInterval() {
    if (this._interval) {
      clearInterval(this._interval);
    }

    const interval = this._loadId ? PING_INTERVAL_ACTIVE : PING_INTERVAL_IDLE;

    // Первый пинг сразу
    this._sendPing();

    this._interval = setInterval(() => {
      this._sendPing();
    }, interval);
  }

  /** Callback watchPosition: сохраняем последнюю позицию */
  _onPosition(pos) {
    this._lastPos = {
      lat:      pos.coords.latitude,
      lng:      pos.coords.longitude,
      // ИСПРАВЛЕНО: м/с → км/ч (было mph)
      speed:    pos.coords.speed != null
                  ? Math.round(pos.coords.speed * 3.6)
                  : 0,
      heading:  pos.coords.heading != null ? Math.round(pos.coords.heading) : 0,
      accuracy: pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : 0,
    };
  }

  /** Ошибка GPS (SRS §12: GPS Signal Loss) */
  _onGpsError(err) {
    const messages = {
      1: 'Доступ к геолокации запрещён. Разрешите в настройках браузера.',
      2: 'Позиция недоступна — нет GPS-сигнала.',
      3: 'Таймаут получения позиции.',
    };
    const msg = messages[err.code] || err.message;
    console.error('[GPS] Ошибка геолокации:', msg);
    this._onError?.(msg);
  }

  /** Отправляет пинг на /api/v1/tracking/ping */
  async _sendPing() {
    // ИСПРАВЛЕНО: проверяем флаг перед отправкой (защита от пинга после stop())
    if (!this._isRunning) return;

    if (!this._lastPos) {
      console.log('[GPS] Нет актуальной позиции, пинг пропущен');
      return;
    }

    // Проверяем минимальное смещение когда нет активного заказа
    if (!this._loadId && this._prevSentPos) {
      const dist = this._haversineMeters(this._prevSentPos, this._lastPos);
      if (dist < MIN_DISTANCE_METERS) {
        console.log(`[GPS] Смещение ${Math.round(dist)}м < ${MIN_DISTANCE_METERS}м, пинг пропущен`);
        return;
      }
    }

    // НОВОЕ: если backoff активен — ждём перед отправкой
    if (this._backoffMs > 0) {
      console.log(`[GPS] Backoff ${this._backoffMs}мс перед повторной попыткой...`);
      await new Promise((r) => setTimeout(r, this._backoffMs));
      if (!this._isRunning) return; // проверяем снова после ожидания
    }

    try {
      const res = await fetch(`${API_URL}/tracking/ping`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this._token}`,
        },
        body: JSON.stringify({
          lat:      this._lastPos.lat,
          lng:      this._lastPos.lng,
          speed:    this._lastPos.speed,
          heading:  this._lastPos.heading,
          accuracy: this._lastPos.accuracy,
          loadId:   this._loadId,
        }),
      });

      if (res.ok) {
        // Успех — сбрасываем счётчик ошибок и backoff
        this._failCount   = 0;
        this._backoffMs   = 0;
        this._prevSentPos = { ...this._lastPos };
        console.log(
          `[GPS] ✓ Пинг отправлен (${this._lastPos.lat.toFixed(5)}, ` +
          `${this._lastPos.lng.toFixed(5)}) — ${this._lastPos.speed} км/ч`
        );
      } else {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      this._failCount++;

      // НОВОЕ: экспоненциальный backoff (1с → 2с → 4с → ... → 120с)
      this._backoffMs = Math.min(
        this._backoffMs === 0 ? 1_000 : this._backoffMs * 2,
        MAX_BACKOFF_MS
      );

      console.error(
        `[GPS] ✗ Ошибка пинга (${this._failCount}/${this._maxFails}): ` +
        `${err.message}. Backoff: ${this._backoffMs}мс`
      );

      if (this._failCount >= this._maxFails) {
        this._onError?.(
          `Не удаётся отправить GPS-данные (${this._failCount} попыток). ` +
          `Проверьте интернет-соединение.`
        );
      }
    }
  }

  /** Расстояние в метрах между двумя точками (Haversine) */
  _haversineMeters(p1, p2) {
    const R     = 6371000;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat  = toRad(p2.lat - p1.lat);
    const dLng  = toRad(p2.lng - p1.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

// Singleton — один экземпляр на всё приложение
const GpsService = new GpsServiceClass();
export default GpsService;