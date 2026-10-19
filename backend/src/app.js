// Aplicação HTTP do backend, sem dependências externas (apenas módulos nativos do Node.js).
// As rotas de análise léxica e sintática serão adicionadas nas próximas etapas.
const http = require('node:http');

const routes = {
  'GET /api/hello': () => ({ status: 200, body: { message: 'Hello, World!' } }),
  'GET /api/health': () => ({ status: 200, body: { status: 'ok' } }),
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function createApp() {
  return http.createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    const handler = routes[`${req.method} ${path}`];

    if (!handler) {
      sendJson(res, 404, { error: 'Rota não encontrada' });
      return;
    }

    try {
      const { status, body } = handler(req);
      sendJson(res, status, body);
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: 'Erro interno do servidor' });
    }
  });
}

module.exports = { createApp };
