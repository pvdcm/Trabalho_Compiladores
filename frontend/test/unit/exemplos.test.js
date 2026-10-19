import { test } from 'node:test';
import assert from 'node:assert/strict';
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

test('buscarExemplo encontra pelo id e devolve null para id desconhecido', () => {
  assert.equal(buscarExemplo('variaveis').id, 'variaveis');
  assert.equal(buscarExemplo('nao-existe'), null);
  assert.equal(buscarExemplo(''), null);
});
