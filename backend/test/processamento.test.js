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

test('processarCodigo confirma o recebimento e não afirma ter feito análises', () => {
  const r = processarCodigo('let x = 1;');
  assert.equal(r.recebido, true);
  assert.deepEqual(r.resumo, { caracteres: 10, linhas: 1 });
  assert.match(r.mensagem, /serão implementadas/);
});
