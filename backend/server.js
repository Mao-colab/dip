const express = require('express');
const http    = require('http');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const { initTrackingSocket } = require('./sockets/trackingSocket');
const { initChatSocket }     = require('./sockets/chatSocket');

const trackingRoutes      = require('./routes/trackingRoutes');
const chatRoutes          = require('./routes/chatRoutes');
const ordersRoutes        = require('./routes/ordersRoutes');
const contactsRoutes      = require('./routes/contactsRoutes');
const authRoutes          = require('./routes/authRoutes');
const usersRoutes         = require('./routes/usersRoutes');
const autoassignRoutes    = require('./routes/autoassignRoutes');
const claimsRoutes        = require('./routes/claimsRoutes');
const rateRoutes          = require('./routes/rateRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const auditRoutes         = require('./routes/auditRoutes');
const pdfRoutes           = require('./routes/pdfRoutes');
const exportRoutes        = require('./routes/exportRoutes');
const verificationRoutes  = require('./routes/verificationRoutes');
const reviewsRoutes       = require('./routes/reviewsRoutes');
const incidentsRoutes     = require('./routes/incidentsRoutes');
const webhooksRoutes      = require('./routes/webhooksRoutes');
const roleRoutes          = require('./routes/roleRoutes');

const rateLimit = require('./middleware/rateLimit');

const app    = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

const corsOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL || true)
  : (process.env.FRONTEND_URL || 'http://localhost:3000');
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// NFR-05: Глобальный rate limiting — 200 запросов/минуту на IP
app.use(rateLimit({ windowMs: 60_000, max: 200, message: 'Слишком много запросов. Подождите минуту.' }));

// Более жёсткий лимит для auth эндпоинтов (защита от brute force)
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60_000, max: 30 }));

app.use('/api/v1/auth',         authRoutes);
app.use('/api/v1/users',        usersRoutes);
app.use('/api/v1/tracking',     trackingRoutes);
app.use('/api/v1/chat',         chatRoutes);
app.use('/api/v1/loads',        ordersRoutes);
app.use('/api/v1/contacts',     contactsRoutes);
app.use('/api/v1/autoassign',   autoassignRoutes);
app.use('/api/v1/claims',       claimsRoutes);
app.use('/api/v1/rates',        rateRoutes);
app.use('/api/v1/notifications',notificationsRoutes);
app.use('/api/v1/audit',        auditRoutes);
app.use('/api/v1/pdf',          pdfRoutes);
app.use('/api/v1/export',       exportRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/roles',        roleRoutes);
app.use('/api/v1/reviews',      reviewsRoutes);
app.use('/api/v1/incidents',    incidentsRoutes);
app.use('/api/v1/webhooks',     webhooksRoutes);

app.get('/health', (_req, res) => res.json({ ok: true, app: 'MT Broker', version: '2.0' }));

// Раздача собранного React-приложения в продакшене
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(buildPath));
  app.get('*', (_req, res) => res.sendFile(path.join(buildPath, 'index.html')));
}

// NFR-16: Глобальный обработчик ошибок с логированием
app.use((err, req, res, _next) => {
  console.error('[Unhandled Error]', {
    method: req.method,
    url:    req.originalUrl,
    error:  err.message,
    stack:  err.stack?.split('\n')[1],
  });
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const io = initTrackingSocket(server);
initChatSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`MT Broker v2.0 запущен: http://localhost:${PORT}`));
