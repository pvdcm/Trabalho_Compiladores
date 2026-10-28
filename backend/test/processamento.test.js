const { test } = require('node:test');
const assert = require('node:assert/strict');
const { processarCodigo, contarLinhas } = require('../src/processamento');

test('contarLinhas reconhece quebras \\n, \\r\\n e \\r', () => {
  assert.equal(contarLinhas('a'), 1);
  assert.equal(contarLinhas('a\nb'), 2);
  assert.equal(contarLinhas('a\r\nb\r\nc'), 3);
  assert.equal(contarLinhas('a\rb'), 2);
  assert.equal(contarLinhas('a\n'), 2);
});

test('processarCodigo executa o scanner e resume tokens e erros', () => {
  const r = processarCodigo('let x = 1;');
  assert.equal(r.sucesso, true);
  assert.deepEqual(r.resumo, { caracteres: 10, linhas: 1, tokens: 5, erros: 0 });
  assert.equal(r.tokens.length, 5);
  assert.equal(r.passos.length, 5);
});

test('a mensagem usa singular e plural corretamente', () => {
  assert.equal(processarCodigo('x').mensagem, 'Análise léxica concluída: 1 token reconhecido e nenhum erro léxico.');
  assert.equal(
    processarCodigo('x @').mensagem,
    'Análise léxica concluída com 1 erro léxico. Os demais trechos foram reconhecidos normalmente (1 token).',
  );
  assert.match(processarCodigo('@ # x y').mensagem, /2 erros léxicos.*\(2 tokens\)/);
});

test('a mensagem não afirma que a análise sintática foi feita', () => {
  for (const codigo of ['let x = 1;', 'let = @', '// só comentário']) {
    assert.doesNotMatch(processarCodigo(codigo).mensagem, /sintátic/i, codigo);
  }
});
