// Testes de regressão das rotas criadas na etapa 1.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarServidor } = require('./helpers');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.fechar());

test('GET /api/hello responde Hello, World!', async () => {
  const res = await fetch(`${servidor.baseUrl}/api/hello`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { message: 'Hello, World!' });
});

test('GET /api/health responde ok', async () => {
  const res = await fetch(`${servidor.baseUrl}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('rota inexistente responde 404 com erro estruturado', async () => {
  const res = await fetch(`${servidor.baseUrl}/api/nao-existe`);
  assert.equal(res.status, 404);
  const corpo = await res.json();
  assert.equal(corpo.erro.codigo, 'ROTA_NAO_ENCONTRADA');
});

test('método não permitido em rota existente responde 405 com cabeçalho Allow', async () => {
  const res = await fetch(`${servidor.baseUrl}/api/health`, { method: 'DELETE' });
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'GET');
  assert.equal((await res.json()).erro.codigo, 'METODO_NAO_PERMITIDO');
});
