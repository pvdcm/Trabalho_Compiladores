// Erros previstos que devem virar uma resposta HTTP com mensagem compreensível.
// Erros que não são instâncias desta classe são tratados como "erro inesperado" (500)
// e nunca têm sua mensagem ou rastreamento expostos ao usuário.
class ErroRequisicao extends Error {
  constructor(status, codigo, mensagem, cabecalhos = {}) {
    super(mensagem);
    this.name = 'ErroRequisicao';
    this.status = status;
    this.codigo = codigo;
    this.cabecalhos = cabecalhos;
  }
}

const MENSAGEM_ERRO_INTERNO = 'Ocorreu um erro inesperado no servidor. Tente novamente mais tarde.';

module.exports = { ErroRequisicao, MENSAGEM_ERRO_INTERNO };
