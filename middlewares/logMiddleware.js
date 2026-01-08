const pino = require('pino');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

function loggingMiddleware(req, res, next) {
  const start = Date.now();
  req.requestId = uuidv4(); // tạo requestId cho mỗi request
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  // Log request đầu vào
  logger.info({
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    method: req.method,
    clientIp: clientIp,
    path: req.originalUrl,
    headers: req.headers,
    body: req.body,
  });

  // Log response khi kết thúc
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;
    logger.info({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      status: res.statusCode,
      clientIp: clientIp,
      duration,
      response: body,
    });
    originalSend.apply(res, arguments);
  };

  next();
}
function errorLoggingMiddleware(err, req, res, next) {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  logger.error({
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    userId: req.user?.id,
    path: req.originalUrl,
    method: req.method,
    clientIp: clientIp,
    message: err.message,
    stack: err.stack,
  });
  res.status(err.status || 500).json({
    success: false,
    message: err.message,
  });
}

module.exports = { loggingMiddleware, errorLoggingMiddleware };
