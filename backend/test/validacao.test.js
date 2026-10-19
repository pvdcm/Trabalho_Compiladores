// Testes unitários das regras de validação.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  LIMITE_CARACTERES,
  interpretarJson,
  validarCodigo,
  validarContentType,
  contarCaracteres,
} = require('../src/validacao');
const { ErroRequisicao } = require('../src/erros');

function falhaCom(fn, codigoEsperado, statusEsperado = 400) {
  assert.throws(fn, (erro) => {
    assert.ok(erro instanceof ErroRequisicao);
    assert.equal(erro.codigo, codigoEsperado);
    assert.equal(erro.status, statusEsperado);
    return true;
  });
}

test('validarCodigo aceita um programa MiniJS válido', () => {
  assert.equal(validarCodigo('let x = 10;'), 'let x = 10;');
});

test('validarCodigo aceita código com erro intencional (não é papel desta etapa julgar a sintaxe)', () => {
  assert.equal(validarCodigo('let x = 10 @ 2'), 'let x = 10 @ 2');
});

test('validarCodigo preserva espaços e quebras de linha originais', () => {
  const codigo = '  let a = 1;\n\tlet b = 2;\r\n';
  assert.equal(validarCodigo(codigo), codigo);
});

test('validarCodigo rejeita campo ausente', () => falhaCom(() => validarCodigo(undefined), 'CODIGO_AUSENTE'));

test('validarCodigo rejeita tipos que não são texto', () => {
  for (const valor of [null, 42, true, [], {}]) {
    falhaCom(() => validarCodigo(valor), 'CODIGO_TIPO_INVALIDO');
  }
});

test('validarCodigo rejeita texto vazio', () => falhaCom(() => validarCodigo(''), 'CODIGO_VAZIO'));

test('validarCodigo rejeita texto só com espaços, tabulações e quebras de linha', () => {
  falhaCom(() => validarCodigo('   \n\t  \r\n '), 'CODIGO_SO_ESPACOS');
});

test('validarCodigo aceita exatamente o limite de caracteres e rejeita um a mais', () => {
  assert.doesNotThrow(() => validarCodigo('a'.repeat(LIMITE_CARACTERES)));
  falhaCom(() => validarCodigo('a'.repeat(LIMITE_CARACTERES + 1)), 'CODIGO_MUITO_GRANDE');
});

test('contarCaracteres conta acentos e emojis como um caractere', () => {
  assert.equal(contarCaracteres('ção'), 3);
  assert.equal(contarCaracteres('😀'), 1);
});

test('interpretarJson aceita objeto e rejeita corpo vazio, JSON inválido e não-objetos', () => {
  assert.deepEqual(interpretarJson('{"codigo":"x"}'), { codigo: 'x' });
  falhaCom(() => interpretarJson(''), 'CORPO_VAZIO');
  falhaCom(() => interpretarJson('{codigo: x}'), 'JSON_INVALIDO');
  for (const corpo of ['[]', '"texto"', '10', 'null']) {
    falhaCom(() => interpretarJson(corpo), 'CORPO_INVALIDO');
  }
});

test('validarContentType aceita application/json com charset e rejeita outros tipos', () => {
  assert.doesNotThrow(() => validarContentType('application/json; charset=utf-8'));
  assert.doesNotThrow(() => validarContentType('Application/JSON'));
  falhaCom(() => validarContentType('text/plain'), 'CONTENT_TYPE_INVALIDO', 415);
  falhaCom(() => validarContentType(undefined), 'CONTENT_TYPE_INVALIDO', 415);
});
