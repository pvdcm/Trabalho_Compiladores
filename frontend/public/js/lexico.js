// Funções puras para exibir o resultado da análise léxica: nomes e cores das categorias,
// contagem de tokens, divisão do código em trechos destacáveis e percurso no autômato.
// Não acessam o DOM, o que permite testá-las com node:test.

// Categorias de token devolvidas pelo backend, na ordem em que aparecem na interface.
// "grupo" define a cor do destaque (classes .g-* no CSS).
export const CATEGORIAS = [
  { tipo: 'PALAVRA_RESERVADA', rotulo: 'Palavra reservada', grupo: 'reservada' },
  { tipo: 'IDENTIFICADOR', rotulo: 'Identificador', grupo: 'identificador' },
  { tipo: 'LITERAL_INTEIRO', rotulo: 'Literal inteiro', grupo: 'literal' },
  { tipo: 'LITERAL_REAL', rotulo: 'Literal real', grupo: 'literal' },
  { tipo: 'LITERAL_STRING', rotulo: 'Literal string', grupo: 'string' },
  { tipo: 'LITERAL_BOOLEANO', rotulo: 'Literal booleano', grupo: 'literal' },
  { tipo: 'OPERADOR_ARITMETICO', rotulo: 'Operador aritmético', grupo: 'operador' },
  { tipo: 'OPERADOR_RELACIONAL', rotulo: 'Operador relacional', grupo: 'operador' },
  { tipo: 'OPERADOR_LOGICO', rotulo: 'Operador lógico', grupo: 'operador' },
  { tipo: 'OPERADOR_ATRIBUICAO', rotulo: 'Operador de atribuição', grupo: 'operador' },
  { tipo: 'DELIMITADOR', rotulo: 'Delimitador', grupo: 'delimitador' },
];

const POR_TIPO = new Map(CATEGORIAS.map((c) => [c.tipo, c]));

export function rotuloDoTipo(tipo) {
  return POR_TIPO.get(tipo)?.rotulo ?? tipo;
}

export function grupoDoPasso(passo) {
  if (passo.acao === 'ERRO') return 'erro';
  if (passo.acao === 'IGNORADO') return 'comentario';
  return POR_TIPO.get(passo.tipo)?.grupo ?? 'identificador';
}

// Quantidade de tokens de cada categoria, só das categorias presentes.
export function contarPorCategoria(tokens) {
  const contagem = new Map();
  for (const token of tokens) contagem.set(token.tipo, (contagem.get(token.tipo) ?? 0) + 1);
  return CATEGORIAS
    .filter((c) => contagem.has(c.tipo))
    .map((c) => ({ ...c, quantidade: contagem.get(c.tipo) }));
}

// Divide o código em trechos: cada passo (token, comentário ou erro) vira um trecho com o
// índice do passo; o que fica entre eles (espaços) vira trecho com passo null.
// As posições do backend contam caracteres Unicode (code points), como Array.from.
export function segmentarCodigo(codigo, passos) {
  const caracteres = Array.from(codigo);
  const trechos = [];
  let posicao = 0;
  passos.forEach((passo, indice) => {
    if (passo.inicio > posicao) {
      trechos.push({ texto: caracteres.slice(posicao, passo.inicio).join(''), passo: null });
    }
    if (passo.fim > passo.inicio) {
      trechos.push({ texto: caracteres.slice(passo.inicio, passo.fim).join(''), passo: indice });
    }
    posicao = Math.max(posicao, passo.fim);
  });
  if (posicao < caracteres.length) {
    trechos.push({ texto: caracteres.slice(posicao).join(''), passo: null });
  }
  return trechos;
}

// Percurso no autômato: junta caracteres consecutivos que levaram ao mesmo estado.
// Ex.: "3.14" com [INTEIRO, PONTO, REAL, REAL] -> 3 (INTEIRO), . (PONTO), 14 (REAL).
export function compactarCaminho(codigo, passo) {
  const caracteres = Array.from(codigo).slice(passo.inicio, passo.fim);
  const caminho = [];
  passo.estados.forEach((estado, i) => {
    const ultimo = caminho.at(-1);
    if (ultimo && ultimo.estado === estado) ultimo.texto += caracteres[i] ?? '';
    else caminho.push({ texto: caracteres[i] ?? '', estado });
  });
  return caminho;
}

// Texto curto e visível para um trecho do código (quebras e espaços ficam explícitos).
export function exibirTrecho(texto, limite = 12) {
  const visivel = texto.replace(/\r\n|\r|\n/g, '↵').replace(/\t/g, '⇥').replace(/ /g, '·');
  const caracteres = Array.from(visivel);
  return caracteres.length > limite ? `${caracteres.slice(0, limite).join('')}…` : visivel;
}

// Linhas do código lado a lado com os tokens de cada uma ("código × tokens").
export function compararPorLinha(codigo, tokens) {
  const linhas = codigo.split(/\r\n|\r|\n/).map((texto, i) => ({ numero: i + 1, texto, tokens: [] }));
  for (const token of tokens) linhas[token.linha - 1]?.tokens.push(token);
  return linhas;
}
