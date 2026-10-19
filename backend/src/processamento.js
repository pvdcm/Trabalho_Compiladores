// Ponto de entrada do processamento do código-fonte.
// Nesta etapa apenas confirma o recebimento e devolve um resumo calculado a partir do texto,
// o que torna a comunicação verificável. Os analisadores léxico e sintático serão chamados
// a partir daqui nas próximas etapas.
const { contarCaracteres } = require('./validacao');

function contarLinhas(codigo) {
  return codigo.split(/\r\n|\r|\n/).length;
}

function processarCodigo(codigo) {
  return {
    recebido: true,
    mensagem: 'Código recebido com sucesso. As análises léxica e sintática serão implementadas nas próximas etapas.',
    resumo: {
      caracteres: contarCaracteres(codigo),
      linhas: contarLinhas(codigo),
    },
  };
}

module.exports = { processarCodigo, contarLinhas };
