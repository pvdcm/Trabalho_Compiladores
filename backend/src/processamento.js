// Ponto de entrada do processamento do código-fonte já validado.
// Etapa 3: executa o analisador léxico e monta a resposta do POST /api/analisar.
// O analisador sintático será chamado a partir daqui na próxima etapa.
const { contarCaracteres } = require('./validacao');
const { analisarLexico } = require('./analisadorLexico');

function contarLinhas(codigo) {
  return codigo.split(/\r\n|\r|\n/).length;
}

function plural(quantidade, singular, pluralTexto) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`;
}

function montarMensagem(totalTokens, erros) {
  const totalErros = erros.length;
  if (erros.at(-1)?.codigo === 'LIMITE_DE_ERROS') {
    return `Análise léxica interrompida depois de ${totalErros - 1} erros léxicos. Corrija os erros indicados e analise de novo.`;
  }
  if (totalErros > 0) {
    return `Análise léxica concluída com ${plural(totalErros, 'erro léxico', 'erros léxicos')}. `
      + `Os demais trechos foram reconhecidos normalmente (${plural(totalTokens, 'token', 'tokens')}).`;
  }
  if (totalTokens === 0) {
    return 'Análise léxica concluída: o código só tem comentários e espaços, então nenhum token foi gerado.';
  }
  return `Análise léxica concluída: ${plural(totalTokens, 'token reconhecido', 'tokens reconhecidos')} e nenhum erro léxico.`;
}

function processarCodigo(codigo) {
  const { tokens, erros, passos } = analisarLexico(codigo);
  return {
    sucesso: erros.length === 0,
    mensagem: montarMensagem(tokens.length, erros),
    resumo: {
      caracteres: contarCaracteres(codigo),
      linhas: contarLinhas(codigo),
      tokens: tokens.length,
      erros: erros.length,
    },
    tokens,
    erros,
    passos,
  };
}

module.exports = { processarCodigo, contarLinhas };
