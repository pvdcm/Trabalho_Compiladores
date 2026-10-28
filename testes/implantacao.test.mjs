// Testes de implantação: verificam a aplicação já em execução (Docker Compose),
// passando pelo Nginx exatamente como o navegador do usuário faz.
// Uso: BASE_URL=http://localhost:8080 node --test testes/implantacao.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

async function postAnalisar(corpo) {
  return fetch(`${BASE_URL}/api/analisar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
}

test('a página principal é servida com a identificação do sistema e da linguagem', async () => {
  const res = await fetch(`${BASE_URL}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const html = await res.text();
  assert.match(html, /VisuLex/);
  assert.match(html, /MiniJS/);
});

test('os módulos JavaScript e o CSS são servidos com o tipo correto', async () => {
  for (const [caminho, tipo] of [['/js/main.js', /javascript/], ['/js/interface.js', /javascript/], ['/styles.css', /text\/css/]]) {
    const res = await fetch(`${BASE_URL}${caminho}`);
    assert.equal(res.status, 200, caminho);
    assert.match(res.headers.get('content-type'), tipo, caminho);
  }
});

test('o backend está saudável e acessível pelo proxy em /api', async () => {
  const res = await fetch(`${BASE_URL}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('POST /api/analisar devolve os tokens pelo proxy (comunicação frontend → backend)', async () => {
  const res = await postAnalisar({ codigo: 'let x = 10;' });
  assert.equal(res.status, 200);
  const corpo = await res.json();
  assert.equal(corpo.sucesso, true);
  assert.deepEqual(corpo.resumo, { caracteres: 11, linhas: 1, tokens: 5, erros: 0 });
  assert.deepEqual(corpo.tokens.map((t) => [t.tipo, t.lexema]), [
    ['PALAVRA_RESERVADA', 'let'], ['IDENTIFICADOR', 'x'], ['OPERADOR_ATRIBUICAO', '='], ['LITERAL_INTEIRO', '10'], ['DELIMITADOR', ';'],
  ]);
});

test('erros léxicos chegam pelo proxy com mensagem e localização', async () => {
  const res = await postAnalisar({ codigo: 'let total = 10 @ 2;' });
  assert.equal(res.status, 200);
  const corpo = await res.json();
  assert.equal(corpo.sucesso, false);
  assert.equal(corpo.erros[0].mensagem.startsWith('Erro léxico na linha 1, coluna 16'), true);
});

test('o módulo do frontend que exibe os tokens é servido', async () => {
  const res = await fetch(`${BASE_URL}/js/lexico.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /javascript/);
});

test('o backend valida a entrada mesmo sem passar pela interface', async () => {
  const vazio = await postAnalisar({ codigo: '' });
  assert.equal(vazio.status, 400);
  assert.equal((await vazio.json()).erro.codigo, 'CODIGO_VAZIO');

  const ausente = await postAnalisar({});
  assert.equal(ausente.status, 400);
  assert.equal((await ausente.json()).erro.codigo, 'CODIGO_AUSENTE');
});

test('rota da etapa 1 continua funcionando (regressão)', async () => {
  const res = await fetch(`${BASE_URL}/api/hello`);
  assert.deepEqual(await res.json(), { message: 'Hello, World!' });
});

test('respostas não revelam a versão do servidor web', async () => {
  const res = await fetch(`${BASE_URL}/pagina-que-nao-existe`);
  const servidor = res.headers.get('server') ?? '';
  assert.doesNotMatch(servidor, /\d/, `cabeçalho Server expõe versão: ${servidor}`);
});
