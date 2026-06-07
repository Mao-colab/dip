/**
 * MT — WebSocket: Мессенджер (Chat)
 * FR-07: Встроенный мессенджер брокер ↔ перевозчик
 *
 * Архитектура: каждый пользователь подписан на личную комнату "user:{id}".
 * broadcastChatMessage() вызывается из chatController и использует
 * модульный io — аналогично trackingSocket.js.
 */

let io; // ✅ ИСПРАВЛЕНО: модульный io — broadcastChatMessage не требует io-аргумента

/**
 * Инициализация чат-сокета.
 * Принимает уже созданный экземпляр io из server.js.
 * @param {import('socket.io').Server} _io
 */
function initChatSocket(_io) {
  io = _io; // ✅ сохраняем для использования в broadcastChatMessage

  io.on('connection', (socket) => {
    if (!socket.user) return; // guard — нет JWT, пропускаем

    const userId = String(socket.user.id);
    socket.join(`user:${userId}`);

    console.log(`[Chat WS] Подключился пользователь #${userId}`);

    // Уведомление о наборе текста
    socket.on('chat:typing', ({ receiverId }) => {
      if (!receiverId) return;
      io.to(`user:${String(receiverId)}`).emit('chat:typing', {
        senderId:   userId,
        senderName: socket.user.name,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Chat WS] Отключился пользователь #${userId}`);
    });
  });
}

/**
 * Отправляет сообщение получателю через WebSocket.
 * Вызывается из chatController.sendMessage() после сохранения в БД.
 * @param {string|number} receiverId
 * @param {object} message
 */
function broadcastChatMessage(receiverId, message) { // ✅ ИСПРАВЛЕНО: убран лишний параметр io
  if (!io) {
    console.warn('[Chat WS] Socket.io не инициализирован');
    return;
  }
  io.to(`user:${String(receiverId)}`).emit('chat:message', message);
}

module.exports = { initChatSocket, broadcastChatMessage };