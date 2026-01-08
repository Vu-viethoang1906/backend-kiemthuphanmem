// metrics.middleware.js
const client = require("prom-client");

// Bật mặc định các NodeJS metrics (CPU, RAM, Event Loop...)
client.collectDefaultMetrics({
  prefix: "myapp_",
});

// ---- 1) Đếm số request ----
const apiCounter = new client.Counter({
  name: "api_requests_total",
  help: "Total API requests",
  labelNames: ["method", "route", "status"],
});

// ---- 2) Đo độ trễ API ----
const responseTimeHistogram = new client.Histogram({
  name: "api_response_time_seconds",
  help: "API response time",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

// ---- 3) Đếm lỗi API ----
const errorCounter = new client.Counter({
  name: "api_errors_total",
  help: "Total API errors",
  labelNames: ["route"],
});

// ---- 4) MongoDB metrics (optional) ----
const mongoStatus = new client.Gauge({
  name: "mongo_connection_status",
  help: "1 = connected, 0 = disconnected",
});

// Middleware theo dõi request
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;

    responseTimeHistogram.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status: res.statusCode,
      },
      duration
    );

    apiCounter.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode,
    });
  });

  next();
};

// Error Handler
const metricsErrorHandler = (err, req, res, next) => {
  errorCounter.inc({ route: req.path });
  next(err);
};

module.exports = {
  client,
  metricsMiddleware,
  metricsErrorHandler,
  mongoStatus,
};
