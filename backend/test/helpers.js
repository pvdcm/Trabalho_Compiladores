const { createApp } = require('../src/app');

// Sobe o servidor em uma porta livre e devolve a URL base e uma função para encerrá-lo.
async function iniciarServidor(opcoes) {
  const server = createApp({ logger: { error() {} }, ...opcoes });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { baseUrl, fechar: () => new Promise((resolve) => server.close(resolve)) };
}

function postJson(baseUrl, corpo, cabecalhos = {}) {
  return fetch(`${baseUrl}/api/analisar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cabecalhos },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });
}

module.exports = { iniciarServidor, postJson };
