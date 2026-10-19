// Testes do endpoint POST /api/analisar conforme o contrato documentado no README.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarServidor, postJson } = require('./helpers');
const { LIMITE_CORPO_BYTES } = require('../src/app');

let servidor;
before(async () => { servidor = await iniciarServidor(); });
after(() => servidor.fechar());

async function esperarErro(res, status, codigo) {
  assert.equal(res.status, status);
  assert.match(res.headers.get('content-type'), /application\/json/);
  const corpo = await res.json();
  assert.equal(corpo.erro.codigo, codigo);
  assert.equal(typeof corpo.erro.mensagem, 'string');
  assert.ok(corpo.erro.mensagem.length > 0);
  return corpo;
}

describe('requisições válidas', () => {
  test('código válido retorna 200 com recebido, mensagem e resumo', async () => {
    const codigo = 'let x = 10;\nlet y = x + 1;'; // 11 + 1 (\n) + 14 = 26 caracteres
    const res = await postJson(servidor.baseUrl, { codigo });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const corpo = await res.json();
    assert.equal(corpo.recebido, true);
    assert.match(corpo.mensagem, /recebido com sucesso/);
    assert.deepEqual(corpo.resumo, { caracteres: 26, linhas: 2 });
  });

  test('código com caracteres especiais e Unicode é recebido sem alteração na contagem', async () => {
    const codigo = 'const s = "olá, ção! \\n \\t {}[]<>&|%$#@`~^ 😀";';
    const res = await postJson(servidor.baseUrl, { codigo });
    assert.equal(res.status, 200);
    const corpo = await res.json();
    assert.equal(corpo.resumo.caracteres, [...codigo].length);
    assert.equal(corpo.resumo.linhas, 1);
  });

  test('código com erro intencional também é aceito nesta etapa', async () => {
    const res = await postJson(servidor.baseUrl, { codigo: 'let = ;; @@@' });
    assert.equal(res.status, 200);
  });

  test('campos extras no JSON são ignorados', async () => {
    const res = await postJson(servidor.baseUrl, { codigo: 'let a = 1;', outro: 123 });
    assert.equal(res.status, 200);
  });

  test('Content-Type com charset é aceito', async () => {
    const res = await postJson(servidor.baseUrl, { codigo: 'let a = 1;' }, {
      'Content-Type': 'application/json; charset=utf-8',
    });
    assert.equal(res.status, 200);
  });
});

describe('entradas inválidas', () => {
  test('código vazio retorna 400 CODIGO_VAZIO com a mensagem orientando o usuário', async () => {
    const corpo = await esperarErro(await postJson(servidor.baseUrl, { codigo: '' }), 400, 'CODIGO_VAZIO');
    assert.equal(corpo.erro.mensagem, 'Informe um código-fonte antes de solicitar a análise.');
  });

  test('código só com espaços retorna 400 CODIGO_SO_ESPACOS', async () => {
    await esperarErro(await postJson(servidor.baseUrl, { codigo: ' \n\t ' }), 400, 'CODIGO_SO_ESPACOS');
  });

  test('campo codigo ausente retorna 400 CODIGO_AUSENTE', async () => {
    await esperarErro(await postJson(servidor.baseUrl, { texto: 'let a = 1;' }), 400, 'CODIGO_AUSENTE');
  });

  test('campo codigo com tipo errado retorna 400 CODIGO_TIPO_INVALIDO', async () => {
    await esperarErro(await postJson(servidor.baseUrl, { codigo: 123 }), 400, 'CODIGO_TIPO_INVALIDO');
  });

  test('JSON malformado retorna 400 JSON_INVALIDO', async () => {
    await esperarErro(await postJson(servidor.baseUrl, '{"codigo": '), 400, 'JSON_INVALIDO');
  });

  test('corpo vazio retorna 400 CORPO_VAZIO', async () => {
    await esperarErro(await postJson(servidor.baseUrl, ''), 400, 'CORPO_VAZIO');
  });

  test('JSON que não é objeto retorna 400 CORPO_INVALIDO', async () => {
    await esperarErro(await postJson(servidor.baseUrl, '["let a = 1;"]'), 400, 'CORPO_INVALIDO');
  });

  test('Content-Type diferente de JSON retorna 415', async () => {
    const res = await postJson(servidor.baseUrl, 'let a = 1;', { 'Content-Type': 'text/plain' });
    await esperarErro(res, 415, 'CONTENT_TYPE_INVALIDO');
  });

  test('código acima de 10.000 caracteres retorna 400 CODIGO_MUITO_GRANDE', async () => {
    const res = await postJson(servidor.baseUrl, { codigo: 'a'.repeat(10001) });
    await esperarErro(res, 400, 'CODIGO_MUITO_GRANDE');
  });

  test('corpo acima do limite em bytes retorna 413 PAYLOAD_MUITO_GRANDE', async () => {
    const res = await postJson(servidor.baseUrl, { codigo: 'a'.repeat(LIMITE_CORPO_BYTES + 10) });
    await esperarErro(res, 413, 'PAYLOAD_MUITO_GRANDE');
  });

  test('GET em /api/analisar retorna 405 indicando POST', async () => {
    const res = await fetch(`${servidor.baseUrl}/api/analisar`);
    await esperarErro(res, 405, 'METODO_NAO_PERMITIDO');
    assert.equal(res.headers.get('allow'), 'POST');
  });
});

describe('erros inesperados', () => {
  test('falha interna retorna 500 genérico sem expor mensagem, caminho ou rastreamento', async () => {
    const registros = [];
    const local = await iniciarServidor({
      processarCodigo: () => { throw new Error('falha secreta em /app/src/segredo.js'); },
      logger: { error: (...args) => registros.push(args) },
    });
    try {
      const res = await postJson(local.baseUrl, { codigo: 'let a = 1;' });
      const texto = await res.text();
      assert.equal(res.status, 500);
      const corpo = JSON.parse(texto);
      assert.equal(corpo.erro.codigo, 'ERRO_INTERNO');
      assert.doesNotMatch(texto, /segredo|\/app\/|Error|at /);
      assert.equal(registros.length, 1, 'o erro deve ser registrado no log do servidor');
    } finally {
      await local.fechar();
    }
  });

  test('o servidor continua respondendo depois de um erro interno', async () => {
    const res = await postJson(servidor.baseUrl, { codigo: 'let a = 1;' });
    assert.equal(res.status, 200);
  });
});
