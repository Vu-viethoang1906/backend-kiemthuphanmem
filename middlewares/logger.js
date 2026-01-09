const pino = require('pino');
const { Writable } = require('stream');

let logger;

// Avoid initializing pino-elasticsearch during tests to prevent open handles
// which keep Jest from exiting. Use a no-op writable stream in test env.
if (process.env.NODE_ENV === 'test') {
  const noop = new Writable({
    write(_chunk, _encoding, callback) {
      // discard logs during tests
      callback();
    },
  });

  logger = pino({ level: process.env.LOG_LEVEL || 'info' }, noop);
} else if (process.env.ELASTICSEARCH_URL) {
  // In non-test environments, initialize the Elasticsearch stream only if URL is provided
  const pinoElastic = require('pino-elasticsearch');

  const streamToElastic = pinoElastic({
    node: process.env.ELASTICSEARCH_URL,
    index: process.env.ELASTICSEARCH_INDEX || 'nodejs-logs',
    esVersion: 7,
    flushBytes: 1000,
  });

  streamToElastic.on('error', err => {
    // Only log the message to avoid flooding the console with full stack traces during connection issues
  });

  logger = pino({ level: process.env.LOG_LEVEL || 'info' }, streamToElastic);
} else {
  // Default to standard pino (stdout) if no Elasticsearch is configured
  logger = pino({ level: process.env.LOG_LEVEL || 'info' });
}

module.exports = logger;
