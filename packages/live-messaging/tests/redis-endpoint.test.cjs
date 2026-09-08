const assert = require('node:assert/strict');
const test = require('node:test');
const { resolveRedisEndpoint } = require('../dist/index.js');

const config = (values) => ({ get: (key) => values[key] });

test('resolves the discrete host and port used by the local stack', () => {
  assert.deepEqual(
    resolveRedisEndpoint(config({ REDIS_HOST: 'redis', REDIS_PORT: '6379' })),
    { host: 'redis', port: 6379 },
  );
  assert.deepEqual(resolveRedisEndpoint(config({})), {
    host: '127.0.0.1',
    port: 6379,
  });
});

test('prefers a hosted connection URL over the discrete host and port', () => {
  assert.deepEqual(
    resolveRedisEndpoint(
      config({
        REDIS_URL: 'rediss://user:secret@hosted.example:6380',
        REDIS_HOST: 'redis',
        REDIS_PORT: '6379',
      }),
    ),
    { host: 'hosted.example', port: 6380 },
  );
  assert.deepEqual(
    resolveRedisEndpoint(config({ REDIS_URL: 'redis://hosted.example' })),
    { host: 'hosted.example', port: 6379 },
  );
});

test('ignores a blank connection URL', () => {
  assert.deepEqual(
    resolveRedisEndpoint(config({ REDIS_URL: '   ', REDIS_HOST: 'redis' })),
    { host: 'redis', port: 6379 },
  );
});
