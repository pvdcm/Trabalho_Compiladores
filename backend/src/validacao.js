// Validações da requisição de análise. O backend não confia nas validações do frontend:
// tudo o que chega é verificado aqui de novo.
const { ErroRequisicao } = require('./erros');

const LIMITE_CARACTERES = 10000;

function interpretarJson(corpoTexto) {
  if (corpoTexto.trim() === '') {
    throw new ErroRequisicao(400, 'CORPO_VAZIO', 'A requisição não contém dados. Envie um JSON com o campo "codigo".');
  }
  let dados;
  try {
    dados = JSON.parse(corpoTexto);
  } catch {
    throw new ErroRequisicao(400, 'JSON_INVALIDO', 'O corpo da requisição não é um JSON válido.');
  }
  if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ErroRequisicao(400, 'CORPO_INVALIDO', 'O corpo da requisição deve ser um objeto JSON com o campo "codigo".');
  }
  return dados;
}

function contarCaracteres(texto) {
  // Conta caracteres Unicode (code points), para que acentos e emojis valham 1.
  return [...texto].length;
}

function validarCodigo(codigo) {
  if (codigo === undefined) {
    throw new ErroRequisicao(400, 'CODIGO_AUSENTE', 'O campo "codigo" é obrigatório.');
  }
  if (typeof codigo !== 'string') {
    throw new ErroRequisicao(400, 'CODIGO_TIPO_INVALIDO', 'O campo "codigo" deve ser um texto.');
  }
  if (codigo.length === 0) {
    throw new ErroRequisicao(400, 'CODIGO_VAZIO', 'Informe um código-fonte antes de solicitar a análise.');
  }
  if (codigo.trim().length === 0) {
    throw new ErroRequisicao(
      400,
      'CODIGO_SO_ESPACOS',
      'O código contém apenas espaços em branco. Escreva ou selecione um programa MiniJS.',
    );
  }
  if (contarCaracteres(codigo) > LIMITE_CARACTERES) {
    throw new ErroRequisicao(
      400,
      'CODIGO_MUITO_GRANDE',
      `O código excede o limite de ${LIMITE_CARACTERES.toLocaleString('pt-BR')} caracteres.`,
    );
  }
  return codigo;
}

function validarContentType(contentType) {
  const tipo = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (tipo !== 'application/json') {
    throw new ErroRequisicao(
      415,
      'CONTENT_TYPE_INVALIDO',
      'Envie os dados no formato JSON (Content-Type: application/json).',
    );
  }
}

module.exports = {
  LIMITE_CARACTERES,
  interpretarJson,
  validarCodigo,
  validarContentType,
  contarCaracteres,
};
