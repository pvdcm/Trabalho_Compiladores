import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { EXEMPLOS, buscarExemplo } from '../../public/js/exemplos.js';
import { validarCodigo } from '../../public/js/validacao.js';

test('há pelo menos três exemplos', () => {
  assert.ok(EXEMPLOS.length >= 3);
});

test('cada exemplo tem id único, título, descrição, construções e código', () => {
  const ids = new Set();
  for (const exemplo of EXEMPLOS) {
    assert.ok(!ids.has(exemplo.id), `id repetido: ${exemplo.id}`);
    ids.add(exemplo.id);
    assert.ok(exemplo.titulo.trim(), `${exemplo.id} sem título`);
    assert.ok(exemplo.descricao.trim(), `${exemplo.id} sem descrição`);
    assert.ok(exemplo.construcoes.length > 0, `${exemplo.id} sem construções`);
    assert.equal(typeof exemplo.contemErros, 'boolean');
  }
});

test('todo exemplo passa na validação de entrada e pode ser enviado', () => {
  for (const exemplo of EXEMPLOS) {
    assert.deepEqual(validarCodigo(exemplo.codigo), { valido: true }, exemplo.id);
  }
});

test('os exemplos cobrem as construções planejadas para MiniJS', () => {
  const todos = EXEMPLOS.map((e) => e.codigo).join('\n');
  for (const trecho of ['let ', 'const ', 'if (', 'else', 'while (', 'function ', 'return ', '&&', '%']) {
    assert.ok(todos.includes(trecho), `nenhum exemplo usa "${trecho}"`);
  }
});

test('existe exemplo com erro intencional, sinalizado como tal', () => {
  const comErros = EXEMPLOS.filter((e) => e.contemErros);
  assert.ok(comErros.length >= 1);
  assert.ok(comErros[0].codigo.includes('@'));
});

test('exemplos válidos não usam construções fora do escopo (=>, var, for, `)', () => {
  for (const exemplo of EXEMPLOS.filter((e) => !e.contemErros)) {
    for (const proibido of ['=>', 'var ', 'for (', '`']) {
      assert.ok(!exemplo.codigo.includes(proibido), `${exemplo.id} usa "${proibido}"`);
    }
  }
});

// Os exemplos passam pelo scanner real do backend: os válidos não podem ter erro léxico e os
// marcados com contemErros devem demonstrar os erros que anunciam.
const require = createRequire(import.meta.url);
const { analisarLexico, DESCRICOES } = require('../../../backend/src/analisadorLexico.js');

test('exemplos sem erros intencionais não têm nenhum erro léxico', () => {
  for (const exemplo of EXEMPLOS.filter((e) => !e.contemErros)) {
    const { tokens, erros } = analisarLexico(exemplo.codigo);
    assert.deepEqual(erros.map((e) => e.mensagem), [], exemplo.id);
    assert.ok(tokens.length > 0, exemplo.id);
  }
});

test('"Todas as categorias de tokens" usa cada categoria do scanner', () => {
  const { tokens } = analisarLexico(buscarExemplo('categorias').codigo);
  const tipos = new Set(tokens.map((t) => t.tipo));
  for (const tipo of Object.keys(DESCRICOES)) assert.ok(tipos.has(tipo), `falta ${tipo}`);
  const lexemas = new Set(tokens.map((t) => t.lexema));
  for (const composto of ['>=', '===', '&&', '||', '!=']) assert.ok(lexemas.has(composto), `falta ${composto}`);
});

test('o programa com erros intencionais tem exatamente um erro léxico, o @', () => {
  const { erros } = analisarLexico(buscarExemplo('com-erros').codigo);
  assert.deepEqual(erros.map((e) => [e.codigo, e.lexema, e.linha]), [['CARACTERE_INVALIDO', '@', 4]]);
});

test('"Erros léxicos variados" demonstra cada tipo de erro léxico', () => {
  const { erros } = analisarLexico(buscarExemplo('erros-lexicos').codigo);
  assert.deepEqual(erros.map((e) => [e.codigo, e.linha]), [
    ['NUMERO_MALFORMADO', 2],
    ['STRING_NAO_FECHADA', 3],
    ['OPERADOR_INCOMPLETO', 4],
    ['CARACTERE_INVALIDO', 5],
    ['CARACTERE_INVALIDO', 5],
    ['COMENTARIO_NAO_FECHADO', 6],
  ]);
});

test('buscarExemplo encontra pelo id e devolve null para id desconhecido', () => {
  assert.equal(buscarExemplo('variaveis').id, 'variaveis');
  assert.equal(buscarExemplo('nao-existe'), null);
  assert.equal(buscarExemplo(''), null);
});
