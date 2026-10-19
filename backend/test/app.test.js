const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('GET /api/hello responde Hello, World!', async () => {
  const res = await fetch(`${baseUrl}/api/hello`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { message: 'Hello, World!' });
});

test('GET /api/health responde ok', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('rota inexistente responde 404', async () => {
  const res = await fetch(`${baseUrl}/api/nao-existe`);
  assert.equal(res.status, 404);
});
