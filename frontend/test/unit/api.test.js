import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  enviarCodigo,
  verificarServidor,
  MENSAGEM_COMUNICACAO,
  MENSAGEM_INESPERADO,
} from '../../public/js/api.js';

function respostaJson(status, corpo) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}

// Resposta 200 no formato do contrato da etapa 3.
const RESPOSTA_VALIDA = {
  sucesso: true,
  mensagem: 'Análise léxica concluída: 1 token reconhecido e nenhum erro léxico.',
  resumo: { caracteres: 1, linhas: 1, tokens: 1, erros: 0 },
  tokens: [{ tipo: 'IDENTIFICADOR', lexema: 'x', linha: 1, coluna: 1, inicio: 0, fim: 1 }],
  erros: [],
  passos: [],
};

function fetchFalso(resposta) {
  const chamadas = [];
  const fn = async (url, opcoes) => {
    chamadas.push({ url, opcoes });
    if (resposta instanceof Error) throw resposta;
    return typeof resposta === 'function' ? resposta(url, opcoes) : resposta;
  };
  fn.chamadas = chamadas;
  return fn;
}

test('envia POST /api/analisar com JSON { codigo } exatamente como digitado', async () => {
  const codigo = '  let s = "ção\\n😀";\r\n\t';
  const fetch = fetchFalso(respostaJson(200, RESPOSTA_VALIDA));
  await enviarCodigo(codigo, { fetch });
  assert.equal(fetch.chamadas.length, 1);
  const { url, opcoes } = fetch.chamadas[0];
  assert.equal(url, '/api/analisar');
  assert.equal(opcoes.method, 'POST');
  assert.equal(opcoes.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(opcoes.body), { codigo });
});

test('resposta 200 válida vira { ok: true, dados }', async () => {
  const r = await enviarCodigo('x', { fetch: fetchFalso(respostaJson(200, RESPOSTA_VALIDA)) });
  assert.deepEqual(r, { ok: true, dados: RESPOSTA_VALIDA });
});

test('resposta 200 com erros léxicos (sucesso false) também é um resultado válido', async () => {
  const dados = { ...RESPOSTA_VALIDA, sucesso: false, erros: [{ tipo: 'ERRO_LEXICO', codigo: 'CARACTERE_INVALIDO', lexema: '@' }] };
  const r = await enviarCodigo('@', { fetch: fetchFalso(respostaJson(200, dados)) });
  assert.deepEqual(r, { ok: true, dados });
});

test('resposta 200 sem os campos do contrato da análise léxica vira erro inesperado', async () => {
  const incompletas = [
    { recebido: true, mensagem: 'formato da etapa 2' },
    { ...RESPOSTA_VALIDA, sucesso: 'sim' },
    { ...RESPOSTA_VALIDA, tokens: undefined },
    { ...RESPOSTA_VALIDA, erros: null },
    { ...RESPOSTA_VALIDA, passos: 'x' },
  ];
  for (const dados of incompletas) {
    const r = await enviarCodigo('x', { fetch: fetchFalso(respostaJson(200, dados)) });
    assert.equal(r.tipo, 'inesperado', JSON.stringify(dados));
  }
});

test('erro 400 do servidor vira problema de entrada com a mensagem do servidor', async () => {
  const fetch = fetchFalso(respostaJson(400, { erro: { codigo: 'CODIGO_VAZIO', mensagem: 'Informe um código.' } }));
  const r = await enviarCodigo('x', { fetch });
  assert.deepEqual(r, { ok: false, tipo: 'entrada', codigo: 'CODIGO_VAZIO', mensagem: 'Informe um código.' });
});

test('falha de rede vira falha de comunicação', async () => {
  const r = await enviarCodigo('x', { fetch: fetchFalso(new TypeError('Failed to fetch')) });
  assert.deepEqual(r, { ok: false, tipo: 'comunicacao', mensagem: MENSAGEM_COMUNICACAO });
});

test('502, 503 e 504 (proxy sem backend) viram falha de comunicação', async () => {
  for (const status of [502, 503, 504]) {
    const fetch = fetchFalso(new Response('<html>Bad Gateway</html>', { status }));
    const r = await enviarCodigo('x', { fetch });
    assert.equal(r.tipo, 'comunicacao', `status ${status}`);
  }
});

test('tempo esgotado aborta a requisição e vira falha de comunicação', async () => {
  const fetch = (url, { signal }) => new Promise((_, rejeitar) => {
    signal.addEventListener('abort', () => rejeitar(new DOMException('Aborted', 'AbortError')));
  });
  const r = await enviarCodigo('x', { fetch, timeoutMs: 20 });
  assert.equal(r.tipo, 'comunicacao');
});

test('erro 500 vira erro inesperado com mensagem genérica, sem repassar detalhes do servidor', async () => {
  const fetch = fetchFalso(respostaJson(500, { erro: { codigo: 'ERRO_INTERNO', mensagem: 'stack trace em /app/src' } }));
  const r = await enviarCodigo('x', { fetch });
  assert.deepEqual(r, { ok: false, tipo: 'inesperado', mensagem: MENSAGEM_INESPERADO });
});

test('resposta 200 com corpo que não é JSON ou fora do contrato vira erro inesperado', async () => {
  for (const resposta of [
    new Response('não é json', { status: 200 }),
    respostaJson(200, { outra: 'coisa' }),
  ]) {
    const r = await enviarCodigo('x', { fetch: fetchFalso(resposta) });
    assert.equal(r.tipo, 'inesperado');
  }
});

test('erro 4xx sem corpo no formato do contrato vira erro inesperado', async () => {
  const r = await enviarCodigo('x', { fetch: fetchFalso(new Response('Not Found', { status: 404 })) });
  assert.equal(r.tipo, 'inesperado');
});

test('baseUrl é respeitada', async () => {
  const fetch = fetchFalso(respostaJson(200, RESPOSTA_VALIDA));
  await enviarCodigo('x', { fetch, baseUrl: 'http://exemplo:8080' });
  assert.equal(fetch.chamadas[0].url, 'http://exemplo:8080/api/analisar');
});

test('verificarServidor devolve true só com { status: "ok" }', async () => {
  assert.equal(await verificarServidor({ fetch: fetchFalso(respostaJson(200, { status: 'ok' })) }), true);
  assert.equal(await verificarServidor({ fetch: fetchFalso(respostaJson(502, {})) }), false);
  assert.equal(await verificarServidor({ fetch: fetchFalso(new TypeError('offline')) }), false);
});
