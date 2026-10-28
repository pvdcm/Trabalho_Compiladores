// Testes unitários do analisador léxico (seção 6.1 do enunciado da etapa 3).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { analisarLexico, PALAVRAS_RESERVADAS, SIMBOLOS, LIMITE_ERROS } = require('../src/analisadorLexico');

// Atalhos: só [tipo, lexema] de cada token, ou o único token de um código.
const pares = (codigo) => analisarLexico(codigo).tokens.map((t) => [t.tipo, t.lexema]);
function unico(codigo) {
  const { tokens, erros } = analisarLexico(codigo);
  assert.equal(erros.length, 0, `erros inesperados em ${JSON.stringify(codigo)}: ${erros.map((e) => e.mensagem)}`);
  assert.equal(tokens.length, 1, `esperado 1 token em ${JSON.stringify(codigo)}`);
  return tokens[0];
}

describe('palavras reservadas', () => {
  test('cada palavra reservada de MiniJS é reconhecida como PALAVRA_RESERVADA', () => {
    for (const palavra of ['let', 'const', 'if', 'else', 'while', 'function', 'return']) {
      assert.deepEqual([unico(palavra).tipo, unico(palavra).lexema], ['PALAVRA_RESERVADA', palavra]);
    }
    assert.equal(PALAVRAS_RESERVADAS.size, 7);
  });

  test('palavras reservadas diferenciam maiúsculas e minúsculas', () => {
    assert.equal(unico('Let').tipo, 'IDENTIFICADOR');
    assert.equal(unico('WHILE').tipo, 'IDENTIFICADOR');
  });

  test('identificador que só começa com palavra reservada continua sendo identificador', () => {
    assert.deepEqual(pares('letra iffy returnValor'), [
      ['IDENTIFICADOR', 'letra'], ['IDENTIFICADOR', 'iffy'], ['IDENTIFICADOR', 'returnValor'],
    ]);
  });

  test('true e false são literais booleanos', () => {
    assert.equal(unico('true').tipo, 'LITERAL_BOOLEANO');
    assert.equal(unico('false').tipo, 'LITERAL_BOOLEANO');
  });

  test('palavras de JavaScript fora do subconjunto (var, for) são identificadores', () => {
    assert.equal(unico('var').tipo, 'IDENTIFICADOR');
    assert.equal(unico('for').tipo, 'IDENTIFICADOR');
  });
});

describe('identificadores', () => {
  test('formações válidas: letras, dígitos depois do início, _ e acentos', () => {
    for (const nome of ['x', 'total', '_tmp', 'valor2', 'a_b_c', '__', 'ação', 'MAIUSCULO', 'x1y2']) {
      const t = unico(nome);
      assert.deepEqual([t.tipo, t.lexema], ['IDENTIFICADOR', nome], nome);
    }
  });

  test('identificador não começa com dígito: 2x é número malformado', () => {
    const { tokens, erros } = analisarLexico('2x');
    assert.equal(tokens.length, 0);
    assert.equal(erros[0].codigo, 'NUMERO_MALFORMADO');
    assert.equal(erros[0].lexema, '2x');
  });

  test('$ e - não fazem parte de identificadores em MiniJS', () => {
    const r = analisarLexico('a$b');
    assert.deepEqual(r.tokens.map((t) => t.lexema), ['a', 'b']);
    assert.equal(r.erros[0].lexema, '$');
    assert.deepEqual(pares('nome-completo'), [
      ['IDENTIFICADOR', 'nome'], ['OPERADOR_ARITMETICO', '-'], ['IDENTIFICADOR', 'completo'],
    ]);
  });
});

describe('literais', () => {
  test('inteiros', () => {
    for (const n of ['0', '7', '42', '10000', '007']) assert.deepEqual([unico(n).tipo, unico(n).lexema], ['LITERAL_INTEIRO', n]);
  });

  test('reais com dígitos antes e depois do ponto', () => {
    for (const n of ['3.14', '0.5', '10.0', '123.456']) assert.deepEqual([unico(n).tipo, unico(n).lexema], ['LITERAL_REAL', n]);
  });

  test('strings com aspas duplas e simples, vazias, com espaços e acentos', () => {
    for (const s of ['"texto"', "'texto'", '""', "''", '"olá, mundo!"', '"com // e /* dentro"']) {
      assert.deepEqual([unico(s).tipo, unico(s).lexema], ['LITERAL_STRING', s]);
    }
  });

  test('string aceita a outra aspa e escapes com barra invertida', () => {
    for (const s of [`"it's"`, `'diz "oi"'`, '"a\\"b"', "'a\\'b'", '"linha\\nnova"', '"barra\\\\"']) {
      assert.deepEqual([unico(s).tipo, unico(s).lexema], ['LITERAL_STRING', s]);
    }
  });

  test('número seguido de operador ou delimitador termina antes dele', () => {
    assert.deepEqual(pares('1+2.5;'), [
      ['LITERAL_INTEIRO', '1'], ['OPERADOR_ARITMETICO', '+'], ['LITERAL_REAL', '2.5'], ['DELIMITADOR', ';'],
    ]);
  });
});

describe('operadores', () => {
  const esperados = {
    OPERADOR_ARITMETICO: ['+', '-', '*', '/', '%'],
    OPERADOR_RELACIONAL: ['==', '!=', '===', '!==', '<', '<=', '>', '>='],
    OPERADOR_LOGICO: ['&&', '||', '!'],
    OPERADOR_ATRIBUICAO: ['='],
  };

  for (const [tipo, lista] of Object.entries(esperados)) {
    test(`cada ${tipo} é reconhecido`, () => {
      for (const op of lista) assert.deepEqual([unico(op).tipo, unico(op).lexema], [tipo, op], op);
    });
  }

  test('a tabela de símbolos não tem operador além dos documentados', () => {
    const documentados = [...Object.values(esperados).flat(), '(', ')', '{', '}', ',', ';', '&', '|'];
    assert.deepEqual(Object.keys(SIMBOLOS).sort(), documentados.sort());
  });

  test('operadores compostos usam o maior lexema possível', () => {
    assert.deepEqual(pares('a===b'), [['IDENTIFICADOR', 'a'], ['OPERADOR_RELACIONAL', '==='], ['IDENTIFICADOR', 'b']]);
    assert.deepEqual(pares('a!==b'), [['IDENTIFICADOR', 'a'], ['OPERADOR_RELACIONAL', '!=='], ['IDENTIFICADOR', 'b']]);
    assert.deepEqual(pares('x<=1'), [['IDENTIFICADOR', 'x'], ['OPERADOR_RELACIONAL', '<='], ['LITERAL_INTEIRO', '1']]);
  });

  test('sequências maiores que um operador são divididas em operadores válidos', () => {
    assert.deepEqual(pares('===='), [['OPERADOR_RELACIONAL', '==='], ['OPERADOR_ATRIBUICAO', '=']]);
    assert.deepEqual(pares('!!x'), [['OPERADOR_LOGICO', '!'], ['OPERADOR_LOGICO', '!'], ['IDENTIFICADOR', 'x']]);
    assert.deepEqual(pares('<>'), [['OPERADOR_RELACIONAL', '<'], ['OPERADOR_RELACIONAL', '>']]);
  });

  test('operadores separados por espaço são tokens diferentes', () => {
    assert.deepEqual(pares('= ='), [['OPERADOR_ATRIBUICAO', '='], ['OPERADOR_ATRIBUICAO', '=']]);
    assert.deepEqual(pares('> ='), [['OPERADOR_RELACIONAL', '>'], ['OPERADOR_ATRIBUICAO', '=']]);
  });
});

describe('delimitadores', () => {
  test('cada delimitador é reconhecido', () => {
    for (const d of ['(', ')', '{', '}', ',', ';']) assert.deepEqual([unico(d).tipo, unico(d).lexema], ['DELIMITADOR', d]);
  });

  test('delimitadores colados geram um token cada', () => {
    assert.deepEqual(pares('(){};,').map(([, l]) => l), ['(', ')', '{', '}', ';', ',']);
  });
});

describe('comentários e espaços em branco', () => {
  test('comentário de linha é ignorado até o fim da linha', () => {
    assert.deepEqual(pares('x // comentário com let e @\ny'), [['IDENTIFICADOR', 'x'], ['IDENTIFICADOR', 'y']]);
  });

  test('comentário de bloco é ignorado, inclusive em várias linhas', () => {
    assert.deepEqual(pares('a /* um\n dois @ */ b'), [['IDENTIFICADOR', 'a'], ['IDENTIFICADOR', 'b']]);
    assert.deepEqual(pares('a/**/b'), [['IDENTIFICADOR', 'a'], ['IDENTIFICADOR', 'b']]);
    assert.deepEqual(pares('/* com ** asteriscos **/x'), [['IDENTIFICADOR', 'x']]);
  });

  test('comentários aparecem nos passos como IGNORADO, sem gerar token', () => {
    const { tokens, passos } = analisarLexico('// a\n/* b */');
    assert.equal(tokens.length, 0);
    assert.deepEqual(passos.map((p) => [p.acao, p.tipo]), [['IGNORADO', 'COMENTARIO_LINHA'], ['IGNORADO', 'COMENTARIO_BLOCO']]);
  });

  test('barra sozinha continua sendo o operador de divisão', () => {
    assert.deepEqual(pares('a / b'), [['IDENTIFICADOR', 'a'], ['OPERADOR_ARITMETICO', '/'], ['IDENTIFICADOR', 'b']]);
  });

  test('espaços, tabulações e quebras de linha não geram tokens nem passos', () => {
    const { tokens, erros, passos } = analisarLexico(' \t\n\r\n  x  \t ');
    assert.deepEqual(tokens.map((t) => t.lexema), ['x']);
    assert.equal(erros.length, 0);
    assert.equal(passos.length, 1);
  });
});

describe('posição (linha e coluna)', () => {
  test('linha e coluna de tokens em posições diferentes', () => {
    const { tokens } = analisarLexico('let x = 10;\n  if (x > 1) {\n\ty = x;\n}');
    const posicoes = Object.fromEntries(tokens.map((t) => [`${t.lexema}@${t.linha}`, t.coluna]));
    assert.equal(posicoes['let@1'], 1);
    assert.equal(posicoes['x@1'], 5);
    assert.equal(posicoes['10@1'], 9);
    assert.equal(posicoes[';@1'], 11);
    assert.equal(posicoes['if@2'], 3);
    assert.equal(posicoes['>@2'], 9);
    assert.equal(posicoes['y@3'], 2, 'a tabulação conta como uma coluna');
    assert.equal(posicoes['}@4'], 1);
  });

  test('quebras \\r\\n e \\r contam como uma linha cada', () => {
    const { tokens } = analisarLexico('a\r\nb\rc\n\nd');
    assert.deepEqual(tokens.map((t) => [t.lexema, t.linha, t.coluna]), [['a', 1, 1], ['b', 2, 1], ['c', 3, 1], ['d', 5, 1]]);
  });

  test('comentário de várias linhas avança a contagem de linhas', () => {
    const { tokens } = analisarLexico('/* 1\n2\n3 */ x');
    assert.deepEqual([tokens[0].linha, tokens[0].coluna], [3, 6]);
  });

  test('inicio e fim delimitam o lexema no código, contando caracteres Unicode como um', () => {
    const codigo = 'let s = "😀ção"; s';
    const { tokens } = analisarLexico(codigo);
    const caracteres = Array.from(codigo);
    for (const t of tokens) assert.equal(caracteres.slice(t.inicio, t.fim).join(''), t.lexema);
    // l1 e2 t3 _4 s5 _6 =7 _8 "9 😀10 ç11 ã12 o13 "14 ;15 _16 s17
    assert.equal(tokens.at(-1).coluna, 17, 'o emoji conta como uma coluna');
  });
});

describe('erros léxicos', () => {
  test('caractere não reconhecido gera erro com caractere, linha e coluna', () => {
    const { erros } = analisarLexico('let x = 1;\nlet total = 10 @ 2;');
    assert.equal(erros.length, 1);
    assert.deepEqual(
      { tipo: erros[0].tipo, codigo: erros[0].codigo, lexema: erros[0].lexema, linha: erros[0].linha, coluna: erros[0].coluna },
      { tipo: 'ERRO_LEXICO', codigo: 'CARACTERE_INVALIDO', lexema: '@', linha: 2, coluna: 16 },
    );
    assert.equal(
      erros[0].mensagem,
      "Erro léxico na linha 2, coluna 16: caractere não reconhecido '@'. Verifique se ele faz parte do subconjunto suportado.",
    );
  });

  test('o scanner continua depois do erro e acumula todos os erros', () => {
    const { tokens, erros } = analisarLexico('a @ b # c $');
    assert.deepEqual(tokens.map((t) => t.lexema), ['a', 'b', 'c']);
    assert.deepEqual(erros.map((e) => [e.lexema, e.coluna]), [['@', 3], ['#', 7], ['$', 11]]);
  });

  test('caracteres fora do escopo recebem uma dica específica', () => {
    const casos = { '[': /arrays/, '.': /propriedades/, '`': /Template strings/, '?': /ternário/ };
    for (const [ch, dica] of Object.entries(casos)) {
      const { erros } = analisarLexico(`x ${ch} y`);
      assert.match(erros[0].mensagem, dica, ch);
    }
  });

  test('caractere invisível é identificado pelo código Unicode', () => {
    const { erros } = analisarLexico('a​b');
    assert.match(erros[0].mensagem, /U\+200B, caractere invisível/);
  });

  test('número malformado: letras coladas, ponto sem dígitos e dois pontos', () => {
    for (const lexema of ['12abc', '3.', '1.2.3', '5_000']) {
      const { tokens, erros } = analisarLexico(`x = ${lexema};`);
      assert.equal(erros.length, 1, lexema);
      assert.deepEqual([erros[0].codigo, erros[0].lexema], ['NUMERO_MALFORMADO', lexema]);
      assert.deepEqual(tokens.map((t) => t.lexema), ['x', '=', ';'], 'a leitura continua depois do número');
    }
  });

  test('string não fechada até o fim da linha', () => {
    const { tokens, erros } = analisarLexico('let s = "abc;\nlet t = 1;');
    assert.deepEqual([erros[0].codigo, erros[0].lexema, erros[0].linha, erros[0].coluna], ['STRING_NAO_FECHADA', '"abc;', 1, 9]);
    assert.match(erros[0].mensagem, /Feche a string com " na mesma linha/);
    assert.deepEqual(tokens.slice(-5).map((t) => t.lexema), ['let', 't', '=', '1', ';'], 'a próxima linha é analisada');
  });

  test('string não fechada no fim do código e barra invertida no fim', () => {
    assert.equal(analisarLexico("x = 'abc").erros[0].codigo, 'STRING_NAO_FECHADA');
    assert.equal(analisarLexico('x = "abc\\').erros[0].codigo, 'STRING_NAO_FECHADA');
  });

  test('comentário de bloco não fechado informa onde começou e resume o trecho', () => {
    const { tokens, erros } = analisarLexico(`x;\n  /* começo ${'longo '.repeat(20)}\nfim`);
    assert.deepEqual(tokens.map((t) => t.lexema), ['x', ';']);
    assert.deepEqual([erros[0].codigo, erros[0].linha, erros[0].coluna], ['COMENTARIO_NAO_FECHADO', 2, 3]);
    assert.ok(erros[0].lexema.endsWith('…'));
    assert.ok(Array.from(erros[0].lexema).length <= 31);
  });

  test('& e | sozinhos são operadores incompletos, com a forma correta na mensagem', () => {
    const { erros } = analisarLexico('a & b | c');
    assert.deepEqual(erros.map((e) => [e.codigo, e.lexema]), [['OPERADOR_INCOMPLETO', '&'], ['OPERADOR_INCOMPLETO', '|']]);
    assert.match(erros[0].mensagem, /'&&'/);
    assert.match(erros[1].mensagem, /'\|\|'/);
  });

  test('erro de sintaxe com tokens válidos não é erro léxico', () => {
    const { tokens, erros } = analisarLexico('let = ;; ) if else (');
    assert.equal(erros.length, 0);
    assert.equal(tokens.length, 8); // let = ; ; ) if else (
  });

  test('depois de 100 erros a análise para e informa onde parou', () => {
    const { tokens, erros } = analisarLexico(`${'@'.repeat(100)}\nlet x = 1;`);
    assert.equal(erros.length, LIMITE_ERROS + 1);
    const ultimo = erros.at(-1);
    assert.deepEqual([ultimo.codigo, ultimo.linha, ultimo.coluna], ['LIMITE_DE_ERROS', 1, 101]);
    assert.match(ultimo.mensagem, /interrompida na linha 1, coluna 101, depois de 100 erros/);
    assert.equal(tokens.length, 0, 'o restante do código não é analisado');
  });

  test('exatamente 100 erros no fim do código não geram o aviso de interrupção', () => {
    const { erros } = analisarLexico('@'.repeat(100));
    assert.equal(erros.length, 100);
    assert.notEqual(erros.at(-1).codigo, 'LIMITE_DE_ERROS');
  });

  test('mensagens de erro não expõem detalhes internos', () => {
    const { erros } = analisarLexico('@ 1x "a /* b');
    for (const e of erros) assert.doesNotMatch(e.mensagem, /Error|at |\.js|undefined|null/);
  });
});

describe('passos para a visualização', () => {
  test('cada token, comentário e erro gera um passo, na ordem do código', () => {
    const { passos } = analisarLexico('x = 1; // fim\n@');
    assert.deepEqual(passos.map((p) => [p.acao, p.lexema]), [
      ['TOKEN', 'x'], ['TOKEN', '='], ['TOKEN', '1'], ['TOKEN', ';'], ['IGNORADO', '// fim'], ['ERRO', '@'],
    ]);
  });

  test('há um estado do autômato para cada caractere do lexema', () => {
    const { passos } = analisarLexico('3.14 === "a\\"b"');
    assert.deepEqual(passos[0].estados, ['INTEIRO', 'PONTO', 'REAL', 'REAL']);
    assert.deepEqual(passos[1].estados, ['IGUAL', 'IGUAL_IGUAL', 'IGUAL_ESTRITO']);
    assert.deepEqual(passos[2].estados, ['STRING', 'STRING', 'ESCAPE', 'STRING', 'STRING', 'FIM_STRING']);
    for (const p of passos) assert.equal(p.estados.length, p.fim - p.inicio);
  });

  test('a explicação diz por que a leitura parou e qual a categoria', () => {
    const { passos } = analisarLexico('while (x >= 1)');
    assert.match(passos[0].explicacao, /próximo caractere, um espaço/);
    assert.match(passos[0].explicacao, /PALAVRA_RESERVADA/);
    assert.match(passos[3].explicacao, /maior lexema possível/);
  });

  test('o passo de erro explica que a análise continua', () => {
    const { passos } = analisarLexico('@');
    assert.match(passos[0].explicacao, /continua a leitura/);
  });
});

describe('casos de borda', () => {
  test('código vazio e só com espaços não geram tokens, erros nem passos', () => {
    for (const codigo of ['', '   ', '\n\n\t']) {
      assert.deepEqual(analisarLexico(codigo), { tokens: [], erros: [], passos: [] });
    }
  });

  test('código só com comentários não gera tokens nem erros', () => {
    const { tokens, erros } = analisarLexico('// a\n/* b\n c */\n// d');
    assert.equal(tokens.length, 0);
    assert.equal(erros.length, 0);
  });

  test('token no fim do arquivo sem quebra de linha é reconhecido inteiro', () => {
    for (const [codigo, ultimo] of [['x = abc', 'abc'], ['x = 42', '42'], ['x = 4.5', '4.5'], ['a >=', '>='], ['x = "s"', '"s"']]) {
      const { tokens } = analisarLexico(codigo);
      assert.equal(tokens.at(-1).lexema, ultimo, codigo);
    }
    assert.match(analisarLexico('x').passos[0].explicacao, /o código terminou/);
  });

  test('comentário de linha no fim do arquivo sem quebra de linha', () => {
    const { tokens, passos } = analisarLexico('x // fim');
    assert.equal(tokens.length, 1);
    assert.equal(passos[1].lexema, '// fim');
  });

  test('código grande (10.000 caracteres) é analisado sem erro', () => {
    const codigo = 'x = 1;\n'.repeat(1428);
    const { tokens, erros } = analisarLexico(codigo);
    assert.equal(erros.length, 0);
    assert.equal(tokens.length, 1428 * 4);
  });
});
