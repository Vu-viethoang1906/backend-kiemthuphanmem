const { Server } = require('socket.io');

let io;
const userSockets = new Map(); // lưu { userId: socket.id }

function initSocket(server) {
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(url => url.trim())
    : ['http://localhost:3000'];

  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
  }

  io = new Server(server, {
    cors: {
      origin: [
        'http://51.79.134.45:3000',
        'http://localhost:3000',
        'https://ken.daily4g.com',
        'http://localhost:3001',
        'https://vannhat.online',
        'https://test.vannhat.online',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', socket => {
    // User registration handler - join user vào room của chính họ
    socket.on('register-user', userId => {
      if (userId) {
        // Lưu mapping userId -> socket.id
        userSockets.set(userId, socket.id);

        // Join user vào room của chính họ để có thể emit events đến user cụ thể
        socket.join(userId);

        // Lưu userId vào socket để dễ dàng truy cập
        socket.userId = userId;
      }
    });

    socket.on('disconnect', () => {
      // Xóa mapping khi user disconnect
      for (const [userId, id] of userSockets.entries()) {
        if (id === socket.id) {
          userSockets.delete(userId);

          break;
        }
      }
    });
  });
}

/**
 * Gửi notification đến user cụ thể hoặc broadcast
 * @param {string} event - Tên event
 * @param {object} data - Dữ liệu gửi kèm
 * @param {string|null} userId - User ID (null = broadcast)
 * @returns {object} Kết quả
 */
function sendNotification(event, data, userId = null) {
  if (!io) {
    return false;
  }

  if (userId) {
    const socketId = userSockets.get(userId);
    if (socketId) {
      // Emit đến socket cụ thể
      io.to(socketId).emit(event, data);
      return { success: true, target: socketId };
    } else {
      // Nếu không tìm thấy socket, thử emit đến room của user
      io.to(userId).emit(event, data);
      return { success: true, target: userId };
    }
  } else {
    io.emit(event, data);
    return { success: true, broadcast: true };
  }
}

/**
 * Emit event đến một user cụ thể (qua room)
 * @param {string} event - Tên event
 * @param {object} data - Dữ liệu
 * @param {string} userId - User ID
 */
function emitToUser(event, data, userId) {
  if (!io || !userId) return false;

  // Emit đến room của user (có thể có nhiều tabs)
  io.to(userId).emit(event, data);
  return true;
}

/**
 * Emit event đến nhiều users
 * @param {string} event - Tên event
 * @param {object} data - Dữ liệu
 * @param {string[]} userIds - Mảng User IDs
 */
function emitToUsers(event, data, userIds) {
  if (!io || !Array.isArray(userIds)) return false;

  userIds.forEach(userId => {
    if (userId) {
      io.to(userId).emit(event, data);
    }
  });

  return true;
}

/**
 * Emit event đến tất cả members của board
 * @param {string} event - Tên event
 * @param {object} data - Dữ liệu
 * @param {string[]} memberIds - Mảng User IDs của board members
 */
function emitToBoardMembers(event, data, memberIds) {
  return emitToUsers(event, data, memberIds);
}

/**
 * Broadcast event đến tất cả clients
 * @param {string} event - Tên event
 * @param {object} data - Dữ liệu
 */
function broadcast(event, data) {
  if (!io) return false;
  io.emit(event, data);
  return true;
}

/**
 * Check if user is online
 * @param {string} userId - User ID
 * @returns {boolean}
 */
function isUserOnline(userId) {
  return userSockets && userSockets.has(userId?.toString());
}

module.exports = {
  initSocket,
  sendNotification,
  emitToUser,
  emitToUsers,
  emitToBoardMembers,
  broadcast,
  isUserOnline,
};
