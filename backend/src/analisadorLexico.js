// Analisador léxico (scanner) de MiniJS. A especificação léxica está em docs/minijs.md.
//
// Percorre o código caractere a caractere, agrupa os caracteres em lexemas e classifica cada
// lexema em uma categoria de token. Cada lexema é reconhecido por um autômato finito
// determinístico: o scanner registra o estado alcançado depois de cada caractere lido
// (campo "estados" dos passos), o que permite à interface mostrar o percurso passo a passo.
//
// Posições: linha e coluna começam em 1 e uma tabulação conta como uma coluna. "inicio" e
// "fim" são índices de caractere (code point) no código, com "fim" exclusivo.
//
// Erros léxicos não interrompem a análise: o scanner registra o erro e continua a leitura,
// para que o usuário veja todos os problemas de uma vez.

const PALAVRAS_RESERVADAS = new Set(['let', 'const', 'if', 'else', 'while', 'function', 'return']);
const LITERAIS_BOOLEANOS = new Set(['true', 'false']);

// Operadores e delimitadores: lexema -> [estado do autômato depois de lê-lo, tipo do token].
// Todo prefixo de um operador composto também está na tabela (ex.: '=', '==', '==='), o que
// permite reconhecer sempre o maior operador possível. Tipo null indica um estado que não
// é de aceitação ('&' e '|' sozinhos não são operadores de MiniJS).
const SIMBOLOS = {
  '+': ['MAIS', 'OPERADOR_ARITMETICO'],
  '-': ['MENOS', 'OPERADOR_ARITMETICO'],
  '*': ['VEZES', 'OPERADOR_ARITMETICO'],
  '/': ['BARRA', 'OPERADOR_ARITMETICO'],
  '%': ['RESTO', 'OPERADOR_ARITMETICO'],
  '=': ['IGUAL', 'OPERADOR_ATRIBUICAO'],
  '==': ['IGUAL_IGUAL', 'OPERADOR_RELACIONAL'],
  '===': ['IGUAL_ESTRITO', 'OPERADOR_RELACIONAL'],
  '!': ['NEGACAO', 'OPERADOR_LOGICO'],
  '!=': ['DIFERENTE', 'OPERADOR_RELACIONAL'],
  '!==': ['DIFERENTE_ESTRITO', 'OPERADOR_RELACIONAL'],
  '<': ['MENOR', 'OPERADOR_RELACIONAL'],
  '<=': ['MENOR_IGUAL', 'OPERADOR_RELACIONAL'],
  '>': ['MAIOR', 'OPERADOR_RELACIONAL'],
  '>=': ['MAIOR_IGUAL', 'OPERADOR_RELACIONAL'],
  '&': ['E_INCOMPLETO', null],
  '&&': ['E_LOGICO', 'OPERADOR_LOGICO'],
  '|': ['OU_INCOMPLETO', null],
  '||': ['OU_LOGICO', 'OPERADOR_LOGICO'],
  '(': ['ABRE_PARENTESE', 'DELIMITADOR'],
  ')': ['FECHA_PARENTESE', 'DELIMITADOR'],
  '{': ['ABRE_CHAVE', 'DELIMITADOR'],
  '}': ['FECHA_CHAVE', 'DELIMITADOR'],
  ',': ['VIRGULA', 'DELIMITADOR'],
  ';': ['PONTO_E_VIRGULA', 'DELIMITADOR'],
};

const DESCRICOES = {
  PALAVRA_RESERVADA: 'palavra reservada',
  IDENTIFICADOR: 'identificador',
  LITERAL_INTEIRO: 'literal inteiro',
  LITERAL_REAL: 'literal real',
  LITERAL_STRING: 'literal string',
  LITERAL_BOOLEANO: 'literal booleano',
  OPERADOR_ARITMETICO: 'operador aritmético',
  OPERADOR_RELACIONAL: 'operador relacional',
  OPERADOR_LOGICO: 'operador lógico',
  OPERADOR_ATRIBUICAO: 'operador de atribuição',
  DELIMITADOR: 'delimitador',
};

// Orientações extras para caracteres que costumam aparecer por engano.
const DICAS = {
  '[': 'Colchetes (arrays) não fazem parte de MiniJS.',
  ']': 'Colchetes (arrays) não fazem parte de MiniJS.',
  '.': 'MiniJS não tem acesso a propriedades (obj.prop). Em números reais, escreva dígitos antes e depois do ponto (ex.: 0.5).',
  '`': 'Template strings não fazem parte de MiniJS: use aspas simples ou duplas.',
  '?': 'O operador ternário (? :) não faz parte de MiniJS: use if/else.',
  ':': 'Objetos e o operador ternário não fazem parte de MiniJS.',
};

const ESPACO = /\s/u;
const INICIA_IDENTIFICADOR = /[\p{L}_]/u;
const CONTINUA_IDENTIFICADOR = /[\p{L}\p{M}0-9_]/u;
const DIGITO = /[0-9]/;
// Caracteres que, colados a um número, o tornam malformado (ex.: 12abc, 3., 1.2.3).
const CONTINUA_NUMERO_MALFORMADO = /[\p{L}\p{M}0-9_.]/u;
const INVISIVEL = /[\p{C}\p{Z}]/u;

const TAMANHO_MAXIMO_LEXEMA_EXIBIDO = 30;

// Como nos compiladores reais (ex.: -fmax-errors do GCC), a análise para depois de muitos
// erros: a lista continua útil e a resposta não cresce sem limite.
const LIMITE_ERROS = 100;

function descreverCaractere(ch) {
  if (ch === ' ') return 'um espaço';
  if (ch === '\t') return 'uma tabulação';
  if (ch === '\n' || ch === '\r') return 'uma quebra de linha';
  return `'${ch}'`;
}

function exibirCaractere(ch) {
  const codigo = `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
  return INVISIVEL.test(ch) ? `'${ch}' (${codigo}, caractere invisível)` : `'${ch}'`;
}

// Lexemas muito longos (comentário sem fim, por exemplo) são resumidos para exibição.
function resumirLexema(lexema) {
  const primeiraLinha = lexema.split(/\r\n|\r|\n/)[0];
  const caracteres = Array.from(primeiraLinha);
  if (caracteres.length <= TAMANHO_MAXIMO_LEXEMA_EXIBIDO && primeiraLinha === lexema) return lexema;
  return `${caracteres.slice(0, TAMANHO_MAXIMO_LEXEMA_EXIBIDO).join('')}…`;
}

function analisarLexico(codigo) {
  const c = Array.from(codigo);
  const n = c.length;
  const tokens = [];
  const erros = [];
  const passos = [];

  let i = 0;
  let linha = 1;
  let coluna = 1;

  // Posição e estados do lexema em leitura.
  let inicio = 0;
  let linhaInicio = 1;
  let colunaInicio = 1;
  let estados = [];

  function avancar(estado) {
    const ch = c[i];
    i += 1;
    if (estado) estados.push(estado);
    // "\r\n" conta como uma única quebra: o "\r" avança a coluna e o "\n" muda a linha.
    if (ch === '\n' || (ch === '\r' && c[i] !== '\n')) {
      linha += 1;
      coluna = 1;
    } else {
      coluna += 1;
    }
  }

  function lexemaAtual() {
    return c.slice(inicio, i).join('');
  }

  function motivoParada() {
    return i >= n ? 'o código terminou' : `o próximo caractere, ${descreverCaractere(c[i])}, não pode continuar o lexema`;
  }

  function posicao() {
    return { linha: linhaInicio, coluna: colunaInicio, inicio, fim: i };
  }

  function registrarToken(tipo, explicacao) {
    const lexema = lexemaAtual();
    tokens.push({ tipo, lexema, ...posicao() });
    passos.push({ acao: 'TOKEN', tipo, lexema, ...posicao(), estados, explicacao });
  }

  function registrarIgnorado(tipo, explicacao) {
    passos.push({ acao: 'IGNORADO', tipo, lexema: lexemaAtual(), ...posicao(), estados, explicacao });
  }

  function registrarErro(codigoErro, descricao, continuacao) {
    const lexema = resumirLexema(lexemaAtual());
    const mensagem = `Erro léxico na linha ${linhaInicio}, coluna ${colunaInicio}: ${descricao}`;
    erros.push({ tipo: 'ERRO_LEXICO', codigo: codigoErro, lexema, ...posicao(), mensagem });
    passos.push({
      acao: 'ERRO',
      tipo: codigoErro,
      lexema,
      ...posicao(),
      estados,
      explicacao: `${mensagem} O scanner registra o erro e continua a leitura ${continuacao}.`,
    });
  }

  function lerIdentificador() {
    while (i < n && CONTINUA_IDENTIFICADOR.test(c[i])) avancar('IDENTIFICADOR');
    const lexema = lexemaAtual();
    const formacao = `"${lexema}" começa com letra ou _ e continua com letras, dígitos ou _; a leitura parou porque ${motivoParada()}.`;
    if (PALAVRAS_RESERVADAS.has(lexema)) {
      registrarToken('PALAVRA_RESERVADA', `${formacao} Como "${lexema}" está na tabela de palavras reservadas, o token é uma PALAVRA_RESERVADA, e não um identificador.`);
    } else if (LITERAIS_BOOLEANOS.has(lexema)) {
      registrarToken('LITERAL_BOOLEANO', `${formacao} "${lexema}" é um dos valores lógicos (true ou false), então o token é um LITERAL_BOOLEANO.`);
    } else {
      registrarToken('IDENTIFICADOR', `${formacao} Como não é palavra reservada, o token é um IDENTIFICADOR (nome de variável ou função).`);
    }
  }

  function lerNumero() {
    while (i < n && DIGITO.test(c[i])) avancar('INTEIRO');
    let tipo = 'LITERAL_INTEIRO';
    if (c[i] === '.' && DIGITO.test(c[i + 1] ?? '')) {
      avancar('PONTO');
      while (i < n && DIGITO.test(c[i])) avancar('REAL');
      tipo = 'LITERAL_REAL';
    }

    if (i < n && CONTINUA_NUMERO_MALFORMADO.test(c[i])) {
      while (i < n && CONTINUA_NUMERO_MALFORMADO.test(c[i])) avancar('NUMERO_MALFORMADO');
      registrarErro(
        'NUMERO_MALFORMADO',
        `número malformado '${lexemaAtual()}'. Um número tem só dígitos, com no máximo um ponto seguido de dígitos (ex.: 42 ou 3.14), e não pode vir colado a letras.`,
        'depois do trecho inválido',
      );
      return;
    }

    if (tipo === 'LITERAL_INTEIRO') {
      registrarToken(tipo, `Sequência de dígitos sem ponto: o token é um LITERAL_INTEIRO. A leitura parou porque ${motivoParada()}.`);
    } else {
      registrarToken(tipo, `Dígitos, um ponto e mais dígitos: o token é um LITERAL_REAL. A leitura parou porque ${motivoParada()}.`);
    }
  }

  function lerString() {
    const aspa = c[i];
    avancar('STRING');
    while (i < n) {
      const ch = c[i];
      if (ch === aspa) {
        avancar('FIM_STRING');
        registrarToken('LITERAL_STRING', `Começa e termina com ${aspa}: o token é um LITERAL_STRING. As aspas fazem parte do lexema.`);
        return;
      }
      if (ch === '\n' || ch === '\r') break;
      if (ch === '\\' && i + 1 < n && c[i + 1] !== '\n' && c[i + 1] !== '\r') {
        avancar('ESCAPE');
        avancar('STRING');
        continue;
      }
      avancar('STRING');
    }
    registrarErro(
      'STRING_NAO_FECHADA',
      `string não fechada: ${resumirLexema(lexemaAtual())}. Feche a string com ${aspa} na mesma linha.`,
      i >= n ? 'até o fim do código' : 'na próxima linha',
    );
  }

  function lerComentarioDeLinha() {
    avancar('BARRA');
    avancar('COMENTARIO_LINHA');
    while (i < n && c[i] !== '\n' && c[i] !== '\r') avancar('COMENTARIO_LINHA');
    registrarIgnorado('COMENTARIO_LINHA', 'Comentário de linha: começa com // e vai até o fim da linha. O scanner descarta o comentário e não gera token.');
  }

  function lerComentarioDeBloco() {
    avancar('BARRA');
    avancar('COMENTARIO_BLOCO');
    while (i < n) {
      if (c[i] === '*' && c[i + 1] === '/') {
        avancar('ASTERISCO');
        avancar('FIM_COMENTARIO');
        registrarIgnorado('COMENTARIO_BLOCO', 'Comentário de bloco: tudo entre /* e */ é descartado, mesmo ocupando várias linhas. Não gera token.');
        return;
      }
      avancar('COMENTARIO_BLOCO');
    }
    registrarErro(
      'COMENTARIO_NAO_FECHADO',
      'comentário de bloco não fechado. Todo /* precisa de um */ correspondente.',
      'até o fim do código',
    );
  }

  function lerSimbolo() {
    let lexema = c[i];
    avancar(SIMBOLOS[lexema][0]);
    while (i < n && SIMBOLOS[lexema + c[i]]) {
      lexema += c[i];
      avancar(SIMBOLOS[lexema][0]);
    }

    const tipo = SIMBOLOS[lexema][1];
    if (!tipo) {
      const completo = lexema + lexema;
      registrarErro(
        'OPERADOR_INCOMPLETO',
        `símbolo '${lexema}' incompleto. Em MiniJS o operador lógico é '${completo}' (${completo === '&&' ? 'E' : 'OU'}).`,
        'no próximo caractere',
      );
      return;
    }

    const descricao = DESCRICOES[tipo];
    if (lexema.length > 1) {
      const verbo = lexema.length === 2 ? 'veio' : 'vieram';
      registrarToken(tipo, `Depois de '${lexema[0]}' ${verbo} '${lexema.slice(1)}', formando '${lexema}'. O scanner sempre forma o maior lexema possível, então reconhece '${lexema}' como um único token: ${descricao}.`);
      return;
    }
    const maior = Object.keys(SIMBOLOS).find((s) => s.length > 1 && s.startsWith(lexema) && SIMBOLOS[s][1]);
    if (maior) {
      registrarToken(tipo, `'${lexema}' poderia começar um operador maior, como '${maior}', mas ${motivoParada()}. O token é um ${descricao}.`);
    } else {
      registrarToken(tipo, `'${lexema}' é reconhecido com um único caractere: ${descricao}.`);
    }
  }

  function lerCaractereInvalido() {
    const ch = c[i];
    avancar('ERRO');
    const dica = DICAS[ch] ?? 'Verifique se ele faz parte do subconjunto suportado.';
    registrarErro('CARACTERE_INVALIDO', `caractere não reconhecido ${exibirCaractere(ch)}. ${dica}`, 'no próximo caractere');
  }

  while (i < n) {
    const ch = c[i];

    // Espaços em branco só separam lexemas: são consumidos sem gerar passo nem token.
    if (ESPACO.test(ch)) {
      avancar();
      continue;
    }

    inicio = i;
    linhaInicio = linha;
    colunaInicio = coluna;
    estados = [];

    if (INICIA_IDENTIFICADOR.test(ch)) lerIdentificador();
    else if (DIGITO.test(ch)) lerNumero();
    else if (ch === '"' || ch === "'") lerString();
    else if (ch === '/' && c[i + 1] === '/') lerComentarioDeLinha();
    else if (ch === '/' && c[i + 1] === '*') lerComentarioDeBloco();
    else if (SIMBOLOS[ch]) lerSimbolo();
    else lerCaractereInvalido();

    if (erros.length >= LIMITE_ERROS && i < n) {
      inicio = i;
      linhaInicio = linha;
      colunaInicio = coluna;
      estados = [];
      const mensagem = `A análise léxica foi interrompida na linha ${linha}, coluna ${coluna}, depois de ${LIMITE_ERROS} erros. `
        + 'Corrija os erros indicados e analise de novo.';
      erros.push({ tipo: 'ERRO_LEXICO', codigo: 'LIMITE_DE_ERROS', lexema: '', ...posicao(), mensagem });
      passos.push({ acao: 'ERRO', tipo: 'LIMITE_DE_ERROS', lexema: '', ...posicao(), estados, explicacao: mensagem });
      break;
    }
  }

  return { tokens, erros, passos };
}

module.exports = { analisarLexico, PALAVRAS_RESERVADAS, LITERAIS_BOOLEANOS, SIMBOLOS, DESCRICOES, LIMITE_ERROS };
