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
} else {
  // In non-test environments, initialize the Elasticsearch stream
  const pinoElastic = require('pino-elasticsearch');

  const streamToElastic = pinoElastic({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    index: process.env.ELASTICSEARCH_INDEX || 'nodejs-logs',
    esVersion: 7,
    flushBytes: 1000,
  });

  streamToElastic.on('error', err => {
    console.error('Error writing to Elasticsearch', err);
  });

  logger = pino({ level: process.env.LOG_LEVEL || 'info' }, streamToElastic);
}

module.exports = logger;
