import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validarCodigo,
  contarCaracteres,
  contarLinhas,
  LIMITE_CARACTERES,
  MENSAGENS_VALIDACAO,
} from '../../public/js/validacao.js';

test('código válido é aceito', () => {
  assert.deepEqual(validarCodigo('let x = 10;'), { valido: true });
});

test('código com erro intencional é aceito (a sintaxe não é julgada nesta etapa)', () => {
  assert.deepEqual(validarCodigo('let = @@'), { valido: true });
});

test('texto vazio é rejeitado com a mensagem de orientação', () => {
  assert.deepEqual(validarCodigo(''), {
    valido: false,
    codigo: 'CODIGO_VAZIO',
    mensagem: 'Informe um código-fonte antes de solicitar a análise.',
  });
});

test('texto só com espaços, tabulações e quebras de linha é rejeitado', () => {
  const r = validarCodigo('  \n\t \r\n');
  assert.equal(r.valido, false);
  assert.equal(r.codigo, 'CODIGO_SO_ESPACOS');
  assert.equal(r.mensagem, MENSAGENS_VALIDACAO.CODIGO_SO_ESPACOS);
});

test('valores que não são texto são tratados como vazios', () => {
  for (const valor of [undefined, null, 10]) {
    assert.equal(validarCodigo(valor).codigo, 'CODIGO_VAZIO');
  }
});

test('limite de caracteres: aceita o limite e rejeita um a mais', () => {
  assert.equal(validarCodigo('a'.repeat(LIMITE_CARACTERES)).valido, true);
  assert.equal(validarCodigo('a'.repeat(LIMITE_CARACTERES + 1)).codigo, 'CODIGO_MUITO_GRANDE');
});

test('caracteres especiais e Unicode são aceitos e contados corretamente', () => {
  const texto = 'const s = "ção 😀 <>&\\"";';
  assert.equal(validarCodigo(texto).valido, true);
  assert.equal(contarCaracteres('😀ç'), 2);
});

test('contarLinhas: vazio tem 0 linhas e reconhece \\n e \\r\\n', () => {
  assert.equal(contarLinhas(''), 0);
  assert.equal(contarLinhas('a'), 1);
  assert.equal(contarLinhas('a\nb\r\nc'), 3);
});

test('mensagens do frontend coincidem com as do backend', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { ErroRequisicao } = require('../../../backend/src/erros.js');
  const { validarCodigo: validarBackend } = require('../../../backend/src/validacao.js');
  for (const [entrada, codigo] of [['', 'CODIGO_VAZIO'], ['  ', 'CODIGO_SO_ESPACOS'], ['a'.repeat(10001), 'CODIGO_MUITO_GRANDE']]) {
    try {
      validarBackend(entrada);
      assert.fail('o backend deveria rejeitar');
    } catch (erro) {
      assert.ok(erro instanceof ErroRequisicao);
      assert.equal(erro.codigo, codigo);
      assert.equal(erro.message, MENSAGENS_VALIDACAO[codigo]);
    }
  }
});
