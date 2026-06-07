# YTrans — Логистическая платформа

## Быстрый старт

**Двойной клик на `START.bat`** — запустит бэкенд и фронтенд автоматически.

Браузер откроется на `http://localhost:3000`

---

## Первый запуск (один раз)

Откройте два терминала:

**Терминал 1 — Бэкенд:**
```
cd backend
npm install
npm run dev
```

**Терминал 2 — Фронтенд:**
```
cd frontend
npm install
npm start
```

---

## База данных (MySQL)

```sql
CREATE DATABASE MT;
```

Затем выполните файлы из папки `backend/db/`:
- `tracking_schema.sql`
- `orders_contacts_schema.sql`

Настройки подключения — файл `backend/.env`

---

## Структура проекта

```
YT/
├── START.bat          ← запуск одним кликом
├── backend/           ← Express + Socket.io + MySQL
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── sockets/
│   └── db/
└── frontend/          ← React 18
    └── src/
        └── components/
            ├── TrackingMap.jsx   (Leaflet карта)
            ├── OrdersPanel.jsx   (заказы)
            ├── Messenger.jsx     (чат)
            ├── Contacts.jsx      (контакты)
            ├── Accounting.jsx    (бухгалтерия)
            ├── Analytics.jsx     (аналитика)
            └── Admin.jsx         (настройки)
```

---

## Технологии

| Слой | Стек |
|------|------|
| Фронтенд | React 18, React Router v6 |
| Карта | Leaflet + OpenStreetMap (без API ключа) |
| Бэкенд | Node.js, Express, Socket.io |
| База данных | MySQL 8 |
| Реальное время | WebSocket (Socket.io) |
