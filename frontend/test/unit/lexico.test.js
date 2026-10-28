import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  CATEGORIAS,
  rotuloDoTipo,
  grupoDoPasso,
  contarPorCategoria,
  segmentarCodigo,
  compactarCaminho,
  exibirTrecho,
  compararPorLinha,
} from '../../public/js/lexico.js';

// O scanner real do backend, para conferir que frontend e backend usam as mesmas categorias.
const require = createRequire(import.meta.url);
const { analisarLexico, DESCRICOES } = require('../../../backend/src/analisadorLexico.js');

test('toda categoria do scanner tem rótulo e cor na interface, e vice-versa', () => {
  assert.deepEqual(CATEGORIAS.map((c) => c.tipo).sort(), Object.keys(DESCRICOES).sort());
  for (const c of CATEGORIAS) {
    assert.ok(c.rotulo.trim(), c.tipo);
    assert.match(c.grupo, /^(reservada|identificador|literal|string|operador|delimitador)$/, c.tipo);
  }
});

test('rotuloDoTipo traduz o tipo e mantém tipos desconhecidos', () => {
  assert.equal(rotuloDoTipo('LITERAL_REAL'), 'Literal real');
  assert.equal(rotuloDoTipo('OUTRO'), 'OUTRO');
});

test('grupoDoPasso usa a cor da categoria, de comentário ou de erro', () => {
  assert.equal(grupoDoPasso({ acao: 'TOKEN', tipo: 'PALAVRA_RESERVADA' }), 'reservada');
  assert.equal(grupoDoPasso({ acao: 'TOKEN', tipo: 'LITERAL_STRING' }), 'string');
  assert.equal(grupoDoPasso({ acao: 'IGNORADO', tipo: 'COMENTARIO_LINHA' }), 'comentario');
  assert.equal(grupoDoPasso({ acao: 'ERRO', tipo: 'CARACTERE_INVALIDO' }), 'erro');
});

test('contarPorCategoria conta só as categorias presentes, na ordem da legenda', () => {
  const { tokens } = analisarLexico('let x = 1; let y = x;');
  assert.deepEqual(
    contarPorCategoria(tokens).map((c) => [c.tipo, c.quantidade]),
    [['PALAVRA_RESERVADA', 2], ['IDENTIFICADOR', 3], ['LITERAL_INTEIRO', 1], ['OPERADOR_ATRIBUICAO', 2], ['DELIMITADOR', 2]],
  );
  assert.deepEqual(contarPorCategoria([]), []);
});

test('segmentarCodigo reconstrói o código exatamente e liga cada trecho ao seu passo', () => {
  const codigos = [
    'let x = 10;\n// fim',
    '  @ "a\n/* sem fim',
    'const s = "😀ção";\r\n\tx',
    'x',
  ];
  for (const codigo of codigos) {
    const { passos } = analisarLexico(codigo);
    const trechos = segmentarCodigo(codigo, passos);
    assert.equal(trechos.map((t) => t.texto).join(''), codigo, JSON.stringify(codigo));
    const ligados = trechos.filter((t) => t.passo !== null);
    assert.equal(ligados.length, passos.length);
    for (const t of ligados) assert.equal(t.texto, Array.from(codigo).slice(passos[t.passo].inicio, passos[t.passo].fim).join(''));
    for (const t of trechos.filter((x) => x.passo === null)) assert.match(t.texto, /^\s+$/u);
  }
});

test('segmentarCodigo ignora passos sem texto (aviso de limite de erros)', () => {
  const codigo = `${'@'.repeat(100)} x`;
  const { passos } = analisarLexico(codigo);
  const trechos = segmentarCodigo(codigo, passos);
  assert.equal(trechos.map((t) => t.texto).join(''), codigo);
  assert.ok(trechos.every((t) => t.texto.length > 0));
});

test('compactarCaminho junta caracteres que levaram ao mesmo estado', () => {
  const codigo = 'x = 3.14 === while';
  const { passos } = analisarLexico(codigo);
  assert.deepEqual(compactarCaminho(codigo, passos[2]), [
    { texto: '3', estado: 'INTEIRO' }, { texto: '.', estado: 'PONTO' }, { texto: '14', estado: 'REAL' },
  ]);
  assert.deepEqual(compactarCaminho(codigo, passos[3]).map((p) => p.estado), ['IGUAL', 'IGUAL_IGUAL', 'IGUAL_ESTRITO']);
  assert.deepEqual(compactarCaminho(codigo, passos[4]), [{ texto: 'while', estado: 'IDENTIFICADOR' }]);
});

test('exibirTrecho torna espaços visíveis e encurta textos longos', () => {
  assert.equal(exibirTrecho('a b\tc\nd'), 'a·b⇥c↵d');
  assert.equal(exibirTrecho('x'.repeat(20)), `${'x'.repeat(12)}…`);
  assert.equal(exibirTrecho('😀'.repeat(13), 12), `${'😀'.repeat(12)}…`);
});

test('compararPorLinha põe cada token na sua linha, inclusive linhas sem tokens', () => {
  const codigo = 'let a = 1;\n// só comentário\n\nb = a;';
  const { tokens } = analisarLexico(codigo);
  const linhas = compararPorLinha(codigo, tokens);
  assert.deepEqual(linhas.map((l) => [l.numero, l.texto, l.tokens.length]), [
    [1, 'let a = 1;', 5], [2, '// só comentário', 0], [3, '', 0], [4, 'b = a;', 4],
  ]);
});
