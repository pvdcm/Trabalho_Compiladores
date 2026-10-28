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

// Contrato da etapa 3 (README): toda resposta 200 tem exatamente estes campos.
const CAMPOS_RESPOSTA = ['erros', 'mensagem', 'passos', 'resumo', 'sucesso', 'tokens'];
const CAMPOS_TOKEN = ['coluna', 'fim', 'inicio', 'lexema', 'linha', 'tipo'];
const CAMPOS_ERRO = ['codigo', 'coluna', 'fim', 'inicio', 'lexema', 'linha', 'mensagem', 'tipo'];

describe('requisições válidas', () => {
  test('código válido retorna 200, sucesso true, tokens e nenhum erro', async () => {
    const codigo = 'let x = 10;\nlet y = x + 1;'; // 11 + 1 (\n) + 14 = 26 caracteres
    const res = await postJson(servidor.baseUrl, { codigo });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const corpo = await res.json();
    assert.deepEqual(Object.keys(corpo).sort(), CAMPOS_RESPOSTA);
    assert.equal(corpo.sucesso, true);
    assert.deepEqual(corpo.erros, []);
    assert.equal(corpo.mensagem, 'Análise léxica concluída: 12 tokens reconhecidos e nenhum erro léxico.');
    assert.deepEqual(corpo.resumo, { caracteres: 26, linhas: 2, tokens: 12, erros: 0 });
    assert.deepEqual(corpo.tokens.slice(0, 5), [
      { tipo: 'PALAVRA_RESERVADA', lexema: 'let', linha: 1, coluna: 1, inicio: 0, fim: 3 },
      { tipo: 'IDENTIFICADOR', lexema: 'x', linha: 1, coluna: 5, inicio: 4, fim: 5 },
      { tipo: 'OPERADOR_ATRIBUICAO', lexema: '=', linha: 1, coluna: 7, inicio: 6, fim: 7 },
      { tipo: 'LITERAL_INTEIRO', lexema: '10', linha: 1, coluna: 9, inicio: 8, fim: 10 },
      { tipo: 'DELIMITADOR', lexema: ';', linha: 1, coluna: 11, inicio: 10, fim: 11 },
    ]);
    assert.deepEqual(corpo.tokens.at(-1), { tipo: 'DELIMITADOR', lexema: ';', linha: 2, coluna: 14, inicio: 25, fim: 26 });
  });

  test('cada token e cada passo seguem o formato documentado', async () => {
    const res = await postJson(servidor.baseUrl, { codigo: 'if (a >= 1.5) { b = "s"; } // fim' });
    const corpo = await res.json();
    for (const token of corpo.tokens) assert.deepEqual(Object.keys(token).sort(), CAMPOS_TOKEN);
    for (const passo of corpo.passos) {
      assert.ok(['TOKEN', 'IGNORADO', 'ERRO'].includes(passo.acao));
      assert.ok(Array.isArray(passo.estados));
      assert.equal(typeof passo.explicacao, 'string');
    }
    assert.equal(corpo.passos.at(-1).acao, 'IGNORADO');
  });

  test('código com caracteres especiais e Unicode dentro de string é tokenizado sem erros', async () => {
    const codigo = 'const s = "olá, ção! \\n \\t {}[]<>&|%$#@`~^ 😀";';
    const res = await postJson(servidor.baseUrl, { codigo });
    assert.equal(res.status, 200);
    const corpo = await res.json();
    assert.equal(corpo.sucesso, true);
    assert.equal(corpo.resumo.caracteres, [...codigo].length);
    assert.equal(corpo.resumo.linhas, 1);
    assert.equal(corpo.tokens[3].tipo, 'LITERAL_STRING');
  });

  test('código só com comentários retorna sucesso sem tokens', async () => {
    const corpo = await (await postJson(servidor.baseUrl, { codigo: '// só comentário\n/* e bloco */' })).json();
    assert.equal(corpo.sucesso, true);
    assert.deepEqual(corpo.tokens, []);
    assert.match(corpo.mensagem, /nenhum token/);
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

describe('erros léxicos', () => {
  test('erro léxico retorna 200 com sucesso false, a lista de erros e os tokens válidos', async () => {
    const res = await postJson(servidor.baseUrl, { codigo: 'let total = 10 @ 2;\nlet dobro = total * 2' });
    assert.equal(res.status, 200, 'a requisição é válida: o erro está no programa analisado');
    const corpo = await res.json();
    assert.deepEqual(Object.keys(corpo).sort(), CAMPOS_RESPOSTA);
    assert.equal(corpo.sucesso, false);
    assert.equal(corpo.erros.length, 1);
    assert.deepEqual(Object.keys(corpo.erros[0]).sort(), CAMPOS_ERRO);
    const { tipo, codigo, lexema, linha, coluna } = corpo.erros[0];
    assert.deepEqual([tipo, codigo, lexema, linha, coluna], ['ERRO_LEXICO', 'CARACTERE_INVALIDO', '@', 1, 16]);
    assert.match(corpo.erros[0].mensagem, /^Erro léxico na linha 1, coluna 16: caractere não reconhecido '@'/);
    assert.equal(corpo.resumo.erros, 1);
    // let total = 10 2 ;  (6, o @ é erro)  +  let dobro = total * 2  (6) = 12
    assert.equal(corpo.tokens.length, 12, 'o scanner continua depois do erro (a falta de ; é sintática)');
    assert.match(corpo.mensagem, /1 erro léxico/);
  });

  test('vários erros léxicos são acumulados em uma única resposta', async () => {
    const corpo = await (await postJson(servidor.baseUrl, { codigo: 'a @ 12abc & "aberta\n/* sem fim' })).json();
    assert.deepEqual(corpo.erros.map((e) => e.codigo), [
      'CARACTERE_INVALIDO', 'NUMERO_MALFORMADO', 'OPERADOR_INCOMPLETO', 'STRING_NAO_FECHADA', 'COMENTARIO_NAO_FECHADO',
    ]);
    assert.match(corpo.mensagem, /5 erros léxicos/);
  });

  test('código só com caracteres inválidos não derruba o servidor e a análise para no limite', async () => {
    const res = await postJson(servidor.baseUrl, { codigo: '@'.repeat(10000) });
    assert.equal(res.status, 200);
    const corpo = await res.json();
    assert.equal(corpo.sucesso, false);
    assert.equal(corpo.erros.length, 101, '100 erros mais o aviso de interrupção');
    assert.equal(corpo.erros.at(-1).codigo, 'LIMITE_DE_ERROS');
    assert.equal(corpo.tokens.length, 0);
    assert.equal(corpo.mensagem, 'Análise léxica interrompida depois de 100 erros léxicos. Corrija os erros indicados e analise de novo.');
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
